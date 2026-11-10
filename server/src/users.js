// Tài khoản BGVN: tên đăng nhập + mật khẩu (PBKDF2-SHA256) hoặc Google (ID token).
// Không bắt buộc – ai không đăng nhập vẫn chơi như khách.
import { DurableObject } from 'cloudflare:workers';
import { cleanName, clean } from './filter.js';

const te = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const sha256 = async s => b64u(await crypto.subtle.digest('SHA-256', te.encode(s)));
const rand = n => b64u(crypto.getRandomValues(new Uint8Array(n)));
const ITER = 100000; // tối đa Cloudflare cho phép với PBKDF2
async function hashPw(pw, salt) {
  const key = await crypto.subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return b64u(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: te.encode(salt), iterations: ITER }, key, 256));
}
const eqTime = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const USER = /^[a-z0-9_.]{3,20}$/;
const SESSION_DAYS = 60;

export class Users extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.sql = ctx.storage.sql; this.fails = new Map();
    this.sql.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, name TEXT, pw TEXT, salt TEXT, google TEXT UNIQUE, email TEXT, created INTEGER, banned INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sessions (tok TEXT PRIMARY KEY, uid INTEGER, exp INTEGER)`);
  }
  pub(u) { return u && { id: u.id, username: u.username || null, name: u.name, google: !!u.google, banned: !!u.banned }; }
  one(q, ...a) { const r = this.sql.exec(q, ...a).toArray(); return r[0] || null; }
  async session(uid) {
    const tok = rand(32), now = Date.now();
    this.sql.exec('DELETE FROM sessions WHERE exp < ?', now);
    this.sql.exec('INSERT INTO sessions (tok, uid, exp) VALUES (?,?,?)', await sha256(tok), uid, now + SESSION_DAYS * 864e5);
    return tok;
  }
  limited(ip) { // chống dò mật khẩu: 10 lần sai / 15 phút / IP
    const now = Date.now(), a = (this.fails.get(ip) || []).filter(t => now - t < 900e3); this.fails.set(ip, a); return a.length >= 10;
  }
  fail(ip) { const a = this.fails.get(ip) || []; a.push(Date.now()); this.fails.set(ip, a); }

  async register({ username, password, name }, ip) {
    if (this.limited(ip)) return { ok: false, msg: 'Thử lại sau ít phút nha' };
    username = String(username || '').trim().toLowerCase();
    if (!USER.test(username)) return { ok: false, msg: 'Tên đăng nhập 3–20 ký tự: chữ thường không dấu, số, dấu chấm, gạch dưới' };
    if (typeof password !== 'string' || password.length < 6 || password.length > 100) return { ok: false, msg: 'Mật khẩu từ 6 ký tự trở lên' };
    if (clean(username).hit) return { ok: false, msg: 'Tên đăng nhập có từ không phù hợp' };
    const nm = cleanName(name) || username;
    if (nm.includes('*')) return { ok: false, msg: 'Tên hiển thị có từ không phù hợp' };
    if (this.one('SELECT id FROM users WHERE username = ?', username)) return { ok: false, msg: 'Tên đăng nhập đã có người dùng' };
    this.fail(ip); // tính cả đăng ký để chống tạo hàng loạt
    const salt = rand(16), pw = await hashPw(password, salt);
    this.sql.exec('INSERT INTO users (username, name, pw, salt, created) VALUES (?,?,?,?,?)', username, nm, pw, salt, Date.now());
    const u = this.one('SELECT * FROM users WHERE username = ?', username);
    return { ok: true, token: await this.session(u.id), user: this.pub(u) };
  }
  async login({ username, password }, ip) {
    if (this.limited(ip)) return { ok: false, msg: 'Sai nhiều lần quá – đợi 15 phút rồi thử lại nha' };
    const u = this.one('SELECT * FROM users WHERE username = ?', String(username || '').trim().toLowerCase());
    if (!u || !u.pw || !eqTime(await hashPw(String(password || ''), u.salt), u.pw)) { this.fail(ip); return { ok: false, msg: 'Sai tên đăng nhập hoặc mật khẩu' }; }
    if (u.banned) return { ok: false, msg: 'Tài khoản đang bị khoá' };
    return { ok: true, token: await this.session(u.id), user: this.pub(u) };
  }
  async google({ credential }, ip, clientId) {
    if (!clientId) return { ok: false, msg: 'Chưa bật đăng nhập Google' };
    if (this.limited(ip)) return { ok: false, msg: 'Thử lại sau ít phút nha' };
    const p = await verifyGoogle(credential, clientId).catch(() => null);
    if (!p) { this.fail(ip); return { ok: false, msg: 'Không xác minh được tài khoản Google' }; }
    let u = this.one('SELECT * FROM users WHERE google = ?', p.sub);
    if (!u) {
      const nm = cleanName(p.given_name || p.name || 'Người chơi') || 'Người chơi';
      this.sql.exec('INSERT INTO users (name, google, email, created) VALUES (?,?,?,?)', nm.includes('*') ? 'Người chơi' : nm, p.sub, '', Date.now()); // không lưu email
      u = this.one('SELECT * FROM users WHERE google = ?', p.sub);
    }
    if (u.banned) return { ok: false, msg: 'Tài khoản đang bị khoá' };
    return { ok: true, token: await this.session(u.id), user: this.pub(u) };
  }
  async whoami(token) {
    if (!token || typeof token !== 'string' || token.length > 100) return null;
    const s = this.one('SELECT * FROM sessions WHERE tok = ?', await sha256(token));
    if (!s || s.exp < Date.now()) return null;
    return this.pub(this.one('SELECT * FROM users WHERE id = ?', s.uid));
  }
  async logout(token) { if (token) this.sql.exec('DELETE FROM sessions WHERE tok = ?', await sha256(String(token))); return { ok: true }; }
  async rename(token, name) {
    const u = await this.whoami(token); if (!u) return { ok: false, msg: 'Hết phiên đăng nhập' };
    const nm = cleanName(name); if (!nm || nm.length < 2) return { ok: false, msg: 'Tên 2–20 ký tự' };
    if (nm.includes('*')) return { ok: false, msg: 'Tên có từ không phù hợp' };
    this.sql.exec('UPDATE users SET name = ? WHERE id = ?', nm, u.id);
    return { ok: true, user: this.pub(this.one('SELECT * FROM users WHERE id = ?', u.id)) };
  }
  async changePassword(token, oldPw, newPw) {
    const me = await this.whoami(token); if (!me) return { ok: false, msg: 'Hết phiên đăng nhập' };
    const u = this.one('SELECT * FROM users WHERE id = ?', me.id);
    if (typeof newPw !== 'string' || newPw.length < 6) return { ok: false, msg: 'Mật khẩu mới từ 6 ký tự' };
    if (u.pw && !eqTime(await hashPw(String(oldPw || ''), u.salt), u.pw)) return { ok: false, msg: 'Mật khẩu cũ chưa đúng' };
    if (!u.username) return { ok: false, msg: 'Tài khoản Google không cần mật khẩu' };
    const salt = rand(16); this.sql.exec('UPDATE users SET pw = ?, salt = ? WHERE id = ?', await hashPw(newPw, salt), salt, u.id);
    return { ok: true };
  }
  // ---- quản trị ----
  async adminFind(q) { q = String(q || '').trim().toLowerCase(); return this.sql.exec('SELECT id, username, name, google IS NOT NULL AS g, created, banned FROM users WHERE username LIKE ? OR lower(name) LIKE ? OR id = ? ORDER BY id DESC LIMIT 50', `%${q}%`, `%${q}%`, +q || -1).toArray(); }
  async adminSet(id, patch) {
    if ('banned' in patch) { this.sql.exec('UPDATE users SET banned = ? WHERE id = ?', patch.banned ? 1 : 0, +id); if (patch.banned) this.sql.exec('DELETE FROM sessions WHERE uid = ?', +id); }
    if (patch.password) { const salt = rand(16); this.sql.exec('UPDATE users SET pw = ?, salt = ? WHERE id = ? AND username IS NOT NULL', await hashPw(String(patch.password), salt), salt, +id); }
    return { ok: true };
  }
  async stats() { return { users: this.one('SELECT COUNT(*) AS n FROM users').n, sessions: this.one('SELECT COUNT(*) AS n FROM sessions WHERE exp > ?', Date.now()).n }; }
}

// ---- xác minh Google ID token (RS256, khoá công khai của Google, cache 1 giờ) ----
let JWKS = null, JWKS_AT = 0;
async function verifyGoogle(jwt, clientId) {
  const [h, p, sig] = String(jwt || '').split('.'); if (!sig) return null;
  const head = JSON.parse(new TextDecoder().decode(unb64u(h))), body = JSON.parse(new TextDecoder().decode(unb64u(p)));
  if (head.alg !== 'RS256') return null;
  if (!JWKS || Date.now() - JWKS_AT > 3600e3) { JWKS = (await (await fetch('https://www.googleapis.com/oauth2/v3/certs')).json()).keys; JWKS_AT = Date.now(); }
  const jwk = JWKS.find(k => k.kid === head.kid); if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unb64u(sig), te.encode(h + '.' + p));
  if (!ok) return null;
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(body.iss)) return null;
  if (body.aud !== clientId || body.exp * 1000 < Date.now()) return null;
  return body;
}
