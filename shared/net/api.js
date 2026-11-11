// Gọi máy chủ BGVN (Cloudflare): tài khoản, sảnh chung. Đăng nhập là TUỲ CHỌN – khách vẫn chơi bình thường.
import { cfHttp, cfProbe } from './cfrelay.js?v=3';

export const API = () => cfHttp();
export const WS = () => cfHttp().replace(/^http/, 'ws');
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };

export function guestId() {
  let g = ls.get('bgvn-guest');
  if (!g || !/^[a-z0-9]{12,24}$/.test(g)) { g = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 16); ls.set('bgvn-guest', g); }
  return g;
}
export const myName = () => ls.get('bgvn-name') || '';

async function call(path, data, token) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(API() + path, { method: data === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: data === undefined ? undefined : JSON.stringify(data), signal: ctl.signal });
    return await r.json();
  } catch (e) { try { cfProbe(); } catch (e2) {} return { ok: false, msg: 'Không kết nối được máy chủ – thử lại sau nha' }; } finally { clearTimeout(t); } /* máy chủ chính không tới được: dò địa chỉ dự phòng cho lần gọi sau */
}

// ---------- tài khoản ----------
const KEY = 'bgvn-auth';
const subs = new Set();
function load() { try { return JSON.parse(ls.get(KEY)) || null; } catch (e) { return null; } }
function save(d) { if (d) ls.set(KEY, JSON.stringify(d)); else ls.del(KEY); if (d && d.user && d.user.name) ls.set('bgvn-name', d.user.name); subs.forEach(f => { try { f(d && d.user); } catch (e) {} }); try { dispatchEvent(new CustomEvent('bgvn-auth')); } catch (e) {} }
const done = r => { if (r.ok && r.token) save({ token: r.token, user: r.user }); return r; };
let cfg = null;
export const auth = {
  user: () => load()?.user || null,
  token: () => load()?.token || null,
  onChange(f) { subs.add(f); return () => subs.delete(f); },
  config: async () => cfg || (cfg = await call('/auth/config')),
  register: (username, password, name) => call('/auth/register', { username, password, name }).then(done),
  login: (username, password) => call('/auth/login', { username, password }).then(done),
  google: credential => call('/auth/google', { credential }).then(done),
  async refresh() { const t = auth.token(); if (!t) return null; const r = await call('/auth/me', {}, t); if (r.ok) { save({ token: t, user: r.user }); return r.user; } if (r.msg && !/kết nối/.test(r.msg)) save(null); return null; },
  async logout() { const t = auth.token(); save(null); if (t) call('/auth/logout', {}, t); },
  async rename(name) { const r = await call('/auth/rename', { name }, auth.token()); if (r.ok) save({ token: auth.token(), user: r.user }); return r; },
  password: (oldPw, newPw) => call('/auth/password', { old: oldPw, new: newPw }, auth.token()),
};
// tab khác đăng nhập/đăng xuất → cập nhật
try { addEventListener('storage', e => { if (e.key === KEY) subs.forEach(f => f(auth.user())); }); } catch (e) {}

// ---------- phòng công khai ----------
export function announceRoom(d) { // d: { game, code, k, host, n, open }
  const body = JSON.stringify(d);
  if (!d.open && navigator.sendBeacon) { try { if (navigator.sendBeacon(API() + '/lobby/room', new Blob([body], { type: 'text/plain' }))) return; } catch (e) {} }
  fetch(API() + '/lobby/room', { method: 'POST', headers: { 'content-type': 'text/plain' }, body, keepalive: true }).catch(() => {});
}
