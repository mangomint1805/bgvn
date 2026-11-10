// Sảnh chung BGVN: danh sách phòng công khai + chat theo kênh (all / từng game) + báo cáo + cấm chat.
// 1 Durable Object duy nhất ("main"), WebSocket kiểu ngủ đông (hibernation) để đỡ tốn thời gian chạy.
import { DurableObject } from 'cloudflare:workers';
import { clean, cleanName } from './filter.js';
import { Meter, LIMITS, GB } from './meter.js';

const GAMES = ['bang', 'uno', 'typhu', 'tamquoc', 'meono', 'masoi', 'scribble', 'tienlen', 'poker', 'xidach', 'catte', 'bacao', 'cangua', 'camel'];
const CHANNELS = new Set(['all', ...GAMES]);
const ROOM_TTL = 75e3, HIST = 60, MSG_MAX = 300, SLOW = 1500, MAX_SOCKS = 2000;
const now = () => Date.now();

export class Lobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.sql = ctx.storage.sql;
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.sql.exec(`CREATE TABLE IF NOT EXISTS rooms (key TEXT PRIMARY KEY, game TEXT, code TEXT, host TEXT, n INTEGER, k TEXT, upd INTEGER, created INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS chat (id INTEGER PRIMARY KEY AUTOINCREMENT, ch TEXT, ts INTEGER, who TEXT, ipk TEXT, name TEXT, v INTEGER, text TEXT, hidden INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS bans (who TEXT PRIMARY KEY, until INTEGER, reason TEXT, by TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, msg INTEGER, target TEXT, tname TEXT, text TEXT, reason TEXT, reporter TEXT, rname TEXT, done INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS usage10 (b INTEGER PRIMARY KEY, ms INTEGER, req INTEGER)`); // ước tính hạn mức theo khối 10 phút
    this.sql.exec(`CREATE TABLE IF NOT EXISTS live (id TEXT PRIMARY KEY, upd INTEGER, n INTEGER)`); // phòng đang có người
    this.sql.exec(`CREATE TABLE IF NOT EXISTS stat (k TEXT PRIMARY KEY, v INTEGER)`);
    this.last = new Map(); // ai → lúc gửi tin gần nhất (chống spam)
    this.m = new Meter((ms, req) => this.addUsage(ms, req));
  }
  // ---------- hạn mức (ước tính) ----------
  addUsage(ms, req, room, n) {
    const b = Math.floor(now() / 600e3);
    this.sql.exec('INSERT INTO usage10 (b, ms, req) VALUES (?,?,?) ON CONFLICT(b) DO UPDATE SET ms = ms + excluded.ms, req = req + excluded.req', b, Math.round(ms), Math.round(req));
    if (room) this.sql.exec('INSERT OR REPLACE INTO live (id, upd, n) VALUES (?,?,?)', room, now(), +n || 0);
    if (b % 36 === 0) { this.sql.exec('DELETE FROM usage10 WHERE b < ?', b - 6 * 24 * 40); this.sql.exec('DELETE FROM live WHERE upd < ?', now() - 3600e3); }
  }
  async usage(ms, req, room, n) { await this.m.tick('req'); this.addUsage(ms, req, room, n); }
  status(plan, full = false) {
    const P = LIMITS[plan === 'paid' ? 'paid' : 'free'], t = now(), d = new Date(t);
    const start = P.per === 'day' ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    const resetAt = P.per === 'day' ? start + 864e5 : Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    const sum = (a, b) => this.sql.exec('SELECT COALESCE(SUM(ms),0) AS ms, COALESCE(SUM(req),0) AS req FROM usage10 WHERE b >= ? AND b < ?', Math.floor(a / 600e3), Math.ceil(b / 600e3)).one();
    // tính cả phần đang đo dở của chính Sảnh
    const u = sum(start, t + 600e3), gbs = u.ms / 1000 * GB, req = u.req;
    const pct = Math.round(Math.max(gbs / P.gbs, req / P.req) * 1000) / 10;
    const level = pct >= 100 ? 'full' : pct >= 85 ? 'warn' : 'ok';
    const out = { plan: plan === 'paid' ? 'paid' : 'free', pct, level, resetAt };
    if (!full) return out;
    const r = sum(t - 30 * 60e3, t + 600e3), rate = r.ms / 1000 * GB * 2; // GB-s mỗi giờ (theo 30 phút gần nhất)
    const left = P.gbs - gbs, eta = rate > 0 && left > 0 && t + left / rate * 3600e3 < resetAt ? t + left / rate * 3600e3 : null;
    const live = this.sql.exec('SELECT COUNT(*) AS rooms, COALESCE(SUM(n),0) AS players FROM live WHERE upd > ?', t - 150e3).one();
    const days = [];
    for (let i = 6; i >= 0; i--) { const a = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - i), x = sum(a, a + 864e5); days.push({ day: a, gbs: Math.round(x.ms / 1000 * GB), req: x.req }); }
    const peak = this.sql.exec('SELECT v FROM stat WHERE k = ?', 'peak:' + new Date(start).toISOString().slice(0, 10)).toArray()[0]?.v || 0;
    return { ...out, per: P.per, gbs: Math.round(gbs), req, limGbs: P.gbs, limReq: P.req, rate: Math.round(rate), eta, roomHoursLeft: Math.max(0, Math.round(left / GB / 3600 * 10) / 10),
      roomsLive: live.rooms, playersLive: live.players, online: this.online(), peak, days };
  }
  // ---------- phòng công khai ----------
  rooms() {
    this.sql.exec('DELETE FROM rooms WHERE upd < ?', now() - ROOM_TTL);
    return this.sql.exec('SELECT game, code, host, n, created FROM rooms ORDER BY created DESC LIMIT 200').toArray();
  }
  async putRoom(d) {
    const game = String(d.game || ''), code = String(d.code || ''), k = String(d.k || '').slice(0, 40);
    if (!GAMES.includes(game) || !/^[A-Z0-9]{5}$/.test(code) || k.length < 10) return { ok: false };
    const key = game + '/' + code;
    const old = this.sql.exec('SELECT k FROM rooms WHERE key = ?', key).toArray()[0];
    if (old && old.k !== k) return { ok: false, msg: 'taken' };
    if (!d.open) { if (old) { this.sql.exec('DELETE FROM rooms WHERE key = ?', key); this.pushRooms(); } return { ok: true }; }
    const host = cleanName(d.host) || 'Ai đó', n = Math.max(1, Math.min(30, +d.n || 1));
    const changed = !old || true;
    if (old) this.sql.exec('UPDATE rooms SET host = ?, n = ?, upd = ? WHERE key = ?', host, n, now(), key);
    else this.sql.exec('INSERT INTO rooms (key, game, code, host, n, k, upd, created) VALUES (?,?,?,?,?,?,?,?)', key, game, code, host, n, k, now(), now());
    if (changed) this.pushRooms(!old);
    return { ok: true };
  }
  pushRooms(force = true) {
    const list = this.rooms(), sig = JSON.stringify(list.map(r => [r.game, r.code, r.host, r.n]));
    if (!force && sig === this.sig) return; this.sig = sig;
    const m = JSON.stringify({ t: 'rooms', list });
    for (const ws of this.ctx.getWebSockets()) try { ws.send(m); } catch (e) {}
  }
  // ---------- kết nối ----------
  // ---------- số người đang online (mọi trang BGVN mở 1 WebSocket "presence") ----------
  online() { return this.ctx.getWebSockets('p').length; } // chỉ đếm kết nối presence (trang nào cũng có đúng 1)
  bumpOnline() { // gom thay đổi, tối đa 1 lần / 4 giây để đỡ tốn
    if (this.pending) return; this.pending = true;
    const due = Math.max(0, (this.lastPush || 0) + 4000 - now());
    this.ctx.storage.setAlarm(now() + due + 50);
  }
  async alarm() {
    this.pending = false; this.lastPush = now(); await this.m.tick('req');
    const n0 = this.online(), pk = 'peak:' + new Date().toISOString().slice(0, 10);
    this.sql.exec('INSERT INTO stat (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = MAX(v, excluded.v)', pk, n0);
    const m = JSON.stringify({ t: 'online', n: n0 });
    for (const ws of this.ctx.getWebSockets()) try { ws.send(m); } catch (e) {}
  }
  async fetch(req) {
    await this.m.tick('req');
    if (this.ctx.getWebSockets().length >= MAX_SOCKS) return new Response('Sảnh đông quá', { status: 503 });
    if (new URL(req.url).pathname.endsWith('/presence')) {
      const pair = new WebSocketPair(), [cli, srv] = Object.values(pair);
      this.ctx.acceptWebSocket(srv, ['p']); srv.serializeAttachment({ p: 1 });
      srv.send(JSON.stringify({ t: 'online', n: this.online() })); this.bumpOnline();
      return new Response(null, { status: 101, webSocket: cli });
    }
    const ip = req.headers.get('CF-Connecting-IP') || '';
    const ipk = (await sha(ip + '|bgvn')).slice(0, 16);
    const pair = new WebSocketPair(), [cli, srv] = Object.values(pair);
    this.ctx.acceptWebSocket(srv); srv.serializeAttachment({ ipk, who: null, name: 'Khách', v: 0, chs: ['all'] }); this.bumpOnline();
    return new Response(null, { status: 101, webSocket: cli });
  }
  hist(ch) { return this.sql.exec('SELECT id, ch, ts, who, name, v, text FROM chat WHERE ch = ? AND hidden = 0 ORDER BY id DESC LIMIT ?', ch, HIST).toArray().reverse().map(pubMsg); }
  banned(who, ipk) {
    const r = this.sql.exec('SELECT who, until, reason FROM bans WHERE (who = ? OR who = ?) AND until > ?', who || '-', 'ip:' + ipk, now()).toArray();
    return r[0] || null;
  }
  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 2000) return;
    await this.m.tick('msg');
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const a = ws.deserializeAttachment() || {};
    const send = o => { try { ws.send(JSON.stringify(o)); } catch (e) {} };
    if (m.t === 'hello') {
      let who = null, name = cleanName(m.name) || 'Khách', v = 0, admin = 0;
      if (m.token) { const u = await this.env.USERS.get(this.env.USERS.idFromName('main')).whoami(String(m.token)); if (u && !u.banned) { who = 'u:' + u.id; name = u.name; v = 1; admin = u.admin ? 1 : 0; } }
      if (!who) { const g = String(m.guest || '').replace(/[^a-z0-9]/g, '').slice(0, 24); who = g.length >= 8 ? 'g:' + g : 'g:' + a.ipk; }
      if (name.includes('*')) name = 'Khách';
      const chs = (Array.isArray(m.chs) ? m.chs : ['all']).filter(c => CHANNELS.has(c)).slice(0, 3);
      if (!chs.length) chs.push('all');
      ws.serializeAttachment({ ...a, who, name, v, chs, admin });
      send({ t: 'me', name, v, admin: !!admin, who: who.startsWith('u:') ? who : who.slice(0, 9) });
      send({ t: 'online', n: this.online() });
      send({ t: 'rooms', list: this.rooms() });
      for (const ch of chs) send({ t: 'hist', ch, msgs: this.hist(ch) });
      const b = this.banned(who, a.ipk); if (b) send({ t: 'banned', until: b.until, reason: b.reason });
      return;
    }
    if (a.p) return; // kết nối đếm online: không nhận lệnh
    if (!a.who) return;
    if (m.t === 'chat') {
      const ch = String(m.ch || 'all'); if (!a.chs.includes(ch)) return;
      const b = this.banned(a.who, a.ipk); if (b) { send({ t: 'err', msg: `Bạn đang bị cấm chat đến ${new Date(b.until).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` }); return; }
      const t0 = this.last.get(a.who) || 0; if (now() - t0 < SLOW) { send({ t: 'err', msg: 'Từ từ thôi nè 😅' }); return; }
      let text = String(m.text || '').slice(0, MSG_MAX); const c = clean(text); text = c.text;
      if (!text.trim()) return;
      this.last.set(a.who, now());
      this.sql.exec('INSERT INTO chat (ch, ts, who, ipk, name, v, text) VALUES (?,?,?,?,?,?,?)', ch, now(), a.who, a.ipk, a.name, a.v, text);
      const id = this.sql.exec('SELECT last_insert_rowid() AS id').one().id;
      if (id % 200 === 0) this.sql.exec('DELETE FROM chat WHERE id IN (SELECT id FROM chat c WHERE (SELECT COUNT(*) FROM chat c2 WHERE c2.ch = c.ch AND c2.id > c.id) > 500)');
      const msg = JSON.stringify({ t: 'msg', m: pubMsg({ id, ch, ts: now(), who: a.who, name: a.name, v: a.v, text }) });
      for (const w of this.ctx.getWebSockets()) { const x = w.deserializeAttachment() || {}; if (x.chs && x.chs.includes(ch)) try { w.send(msg); } catch (e) {} }
      return;
    }
    if (m.t === 'report') {
      const row = this.sql.exec('SELECT * FROM chat WHERE id = ?', +m.id || 0).toArray()[0]; if (!row) return;
      if (row.who === a.who) return;
      const dup = this.sql.exec('SELECT id FROM reports WHERE msg = ? AND reporter = ?', row.id, a.who).toArray()[0]; if (dup) { send({ t: 'ok', msg: 'Bạn đã báo cáo tin này rồi' }); return; }
      const recent = this.sql.exec('SELECT COUNT(*) AS n FROM reports WHERE reporter = ? AND ts > ?', a.who, now() - 3600e3).one().n; if (recent >= 15) return;
      this.sql.exec('INSERT INTO reports (ts, msg, target, tname, text, reason, reporter, rname) VALUES (?,?,?,?,?,?,?,?)', now(), row.id, row.who, row.name, row.text, String(m.reason || '').slice(0, 200), a.who, a.name);
      // 3 người khác nhau báo cáo cùng 1 tin → tự ẩn tin
      const n = this.sql.exec('SELECT COUNT(DISTINCT reporter) AS n FROM reports WHERE msg = ?', row.id).one().n;
      if (n >= 3) this.hide(row.id);
      send({ t: 'ok', msg: 'Đã gửi báo cáo – cảm ơn bạn 💖' });
      return;
    }
    if (m.t === 'mod' && a.admin) { // công cụ quản trị ngay trong chat
      const row = this.sql.exec('SELECT * FROM chat WHERE id = ?', +m.id || 0).toArray()[0]; if (!row) return;
      if (m.op === 'hide') this.hide(row.id);
      else if (m.op === 'ban') { await this.admin('ban', { who: row.who, hours: Math.max(1, Math.min(87600, +m.hours || 24)), reason: String(m.reason || '').slice(0, 200) }); this.hide(row.id); }
      send({ t: 'ok', msg: m.op === 'ban' ? '⛔ Đã cấm chat ' + row.name : '🙈 Đã ẩn tin' });
      return;
    }
    if (m.t === 'join') { // đổi kênh (vd. vào sảnh của game khác)
      const chs = (Array.isArray(m.chs) ? m.chs : []).filter(c => CHANNELS.has(c)).slice(0, 3); if (!chs.length) return;
      ws.serializeAttachment({ ...a, chs }); for (const ch of chs) send({ t: 'hist', ch, msgs: this.hist(ch) });
    }
  }
  async webSocketClose(ws, code) { try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch (e) {} this.bumpOnline(); }
  async webSocketError() { this.bumpOnline(); }
  hide(id) {
    this.sql.exec('UPDATE chat SET hidden = 1 WHERE id = ?', id);
    const m = JSON.stringify({ t: 'del', id });
    for (const w of this.ctx.getWebSockets()) try { w.send(m); } catch (e) {}
  }
  // ---------- quản trị ----------
  async admin(op, d = {}) {
    if (op === 'reports') return { reports: this.sql.exec('SELECT * FROM reports WHERE done = 0 ORDER BY id DESC LIMIT 200').toArray(), bans: this.sql.exec('SELECT * FROM bans WHERE until > ? ORDER BY ts DESC', now()).toArray() };
    if (op === 'hide') { this.hide(+d.msg); this.sql.exec('UPDATE reports SET done = 1 WHERE msg = ?', +d.msg); return { ok: true }; }
    if (op === 'dismiss') { this.sql.exec('UPDATE reports SET done = 1 WHERE id = ?', +d.id); return { ok: true }; }
    if (op === 'ban') {
      const hours = Math.max(1, Math.min(24 * 3650, +d.hours || 24)), who = String(d.who || '');
      if (!/^(u|g|ip):/.test(who)) return { ok: false };
      this.sql.exec('INSERT OR REPLACE INTO bans (who, until, reason, by, ts) VALUES (?,?,?,?,?)', who, now() + hours * 3600e3, String(d.reason || '').slice(0, 200), 'admin', now());
      // cấm luôn IP của người đó (khách đổi mã khách vẫn bị chặn)
      const ipk = this.sql.exec('SELECT ipk FROM chat WHERE who = ? ORDER BY id DESC LIMIT 1', who).toArray()[0]?.ipk;
      // IP nhà mạng VN hay dùng chung cho nhiều người (4G, NAT) → chỉ chặn IP tối đa 6 giờ để khỏi vạ lây
      if (ipk && d.ip !== false) this.sql.exec('INSERT OR REPLACE INTO bans (who, until, reason, by, ts) VALUES (?,?,?,?,?)', 'ip:' + ipk, now() + Math.min(hours, 6) * 3600e3, String(d.reason || '').slice(0, 200), 'admin', now());
      this.sql.exec('UPDATE chat SET hidden = 1 WHERE who = ? AND ts > ?', who, now() - 3600e3);
      this.sql.exec('UPDATE reports SET done = 1 WHERE target = ?', who);
      for (const w of this.ctx.getWebSockets()) try { w.send(JSON.stringify({ t: 'reload' })); } catch (e) {}
      return { ok: true };
    }
    if (op === 'unban') { this.sql.exec('DELETE FROM bans WHERE who = ?', String(d.who || '')); return { ok: true }; }
    if (op === 'stats') return { online: this.ctx.getWebSockets().length, rooms: this.rooms().length };
    return { ok: false };
  }
}
const pubMsg = r => ({ id: r.id, ch: r.ch, ts: r.ts, who: r.who.startsWith('u:') ? r.who : r.who.slice(0, 9), name: r.name, v: r.v, text: r.text });
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
