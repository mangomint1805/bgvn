// Lớp mạng dùng chung cho game nhỏ (Cờ tướng, Thật hay Thách…): chủ phòng giữ state, khách chỉ gửi action.
// Game chỉ cần khai báo luật; phần phòng, vào lại, người xem, bot, lưu phòng, đếm thành tích đều nằm ở đây.
//   const { Host, Client, loadSnapshot, session } = makeNet({
//     game: 'cotuong', min: 2, max: 2,                       // tên thư mục game, số người
//     defaults: {…}, optOk: (k, v, opts) => true/false,      // luật bàn + kiểm tra giá trị hợp lệ
//     create: (players, opts) => state, apply: (s, pid, a) => ({ ok, reason }), view: (s, pid) => view,
//     actors: s => [id…],                                     // ai đang phải hành động (để hẹn bot / người rớt mạng)
//     bot: (s, pid) => action | null, botDelay: (s, pid) => ms,
//     botNames: [...], allowLocal: true,                      // allowLocal: cho thêm "người chơi cùng máy" (chuyền tay)
//   });
// Người chơi cùng máy (local) và bot do máy chủ phòng điều khiển: hành động của họ gửi qua net.actAs(id, a).
import { RoomHost, RoomClient, token, session } from './room.js?v=9';
import { specBanner } from '../ui/spectate.js?v=1';
import { watch } from '../ui/stats.js?v=8';
export { session };
const HB_MS = 2500, STALL_MS = 8000, AWAY_MS = 8000;

export function makeNet(cfg) {
  const GAME = cfg.game, NS = 'bgvn-' + GAME, PREFIX = NS + '-', SNAP = 'bgvn-hostsnap-' + GAME;
  const MAX = cfg.max || 8, MIN = cfg.min || 2;
  const BOT_NAMES = cfg.botNames || ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Mochi', 'Pudding'];
  const loadSnapshot = () => { try { const d = JSON.parse(localStorage.getItem(SNAP)); return d && Date.now() - d.ts < 3 * 3600e3 ? d : null; } catch (e) { return null; } };

  class Host {
    constructor(name, handlers, offline = false, restore = null) {
      this.h = watch(GAME, handlers, () => 'host'); this.offline = offline;
      this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: true }];
      this.state = null; this.conns = new Map(); this.timers = {}; this.opts = { ...(cfg.defaults || {}) };
      this.hs = Math.random().toString(36).slice(2, 8);
      if (restore) { this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || p.local || p.id === 'host' })); this.state = restore.state; this.code = restore.code; this.opts = { ...this.opts, ...(restore.opts || {}) }; }
      if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); } }, 0); return; }
      this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
      this.code = this.room.code;
      this.hb = setInterval(() => this.heartbeat(), HB_MS);
      setTimeout(() => { this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); } }, 0);
    }
    saveSnap() { clearTimeout(this.snapT); this.snapT = setTimeout(() => { try { localStorage.setItem(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, opts: this.opts, players: this.players.map(({ conn, ...p }) => p), state: this.state })); } catch (e) {} }, 300); }
    attach(conn) { conn.on('data', m => this.onMsg(conn, m)); conn.on('close', () => this.onLeave(conn)); conn.on('error', () => this.onLeave(conn)); }
    onMsg(conn, msg) {
      if (!msg) return;
      if (msg.t === 'join') {
        let p = this.players.find(x => x.token === msg.token && !x.isBot && !x.local && x.id !== 'host');
        if (p) { if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {} p.conn = conn; p.connected = true; }
        else {
          if (this.players.length >= (cfg.maxSeats || MAX + 6)) { conn.send({ t: 'error', msg: 'Phòng đã đầy.' }); return; } // quá số người chơi thì thành người xem
          p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), isBot: false, token: msg.token, conn, connected: true };
          this.players.push(p);
        }
        this.conns.set(conn, p); conn.send({ t: 'welcome', id: p.id, code: this.code });
        this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); }
      } else if (msg.t === 'action') { const p = this.conns.get(conn); if (p && p.conn === conn && this.inGame(p.id)) this.act(p.id, msg.a); }
      else if (msg.t === 'sync') { const p = this.conns.get(conn); if (!p || p.conn !== conn) return; if (this.state) this.sendState(p); else conn.send({ t: 'lobby', info: this.lobbyInfo(), code: this.code, started: false }); }
    }
    onLeave(conn) {
      const p = this.conns.get(conn); if (!p) return; this.conns.delete(conn); if (p.conn !== conn) return;
      p.conn = null; p.connected = false;
      if (!this.inGame(p.id)) this.players = this.players.filter(x => x !== p);
      this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); }
    }
    inGame(id) { const s = this.state; return !s || !s.players || s.players.some(q => q.id === id); } // vào giữa ván: chỉ xem
    lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, connected: p.connected, level: p.level })), opts: this.opts, min: MIN, max: MAX }; }
    pushLobby() { const info = this.lobbyInfo(); this.h.onLobby(info, this.code, !!this.state); this.saveSnap(); for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {} }
    setOpt(k, v) { if (this.state || (cfg.optOk && !cfg.optOk(k, v, this.opts))) return; this.opts = { ...this.opts, [k]: v }; this.pushLobby(); }
    usedNames() { return this.players.map(p => p.name.replace(' 🤖', '').trim().toLowerCase()); }
    addBot(extra = {}) { if (this.state || !cfg.bot || this.players.length >= MAX) return; const ini = this.players.map(p => (p.name || '?')[0].toLowerCase()); /* tên bot khác chữ cái đầu với người đang ngồi */ const free = BOT_NAMES.filter(n => !this.usedNames().includes(n.toLowerCase())); const nm = free.find(n => !ini.includes(n[0].toLowerCase())) || free[0] || 'Bot' + this.players.length; this.players.push({ id: 'bot' + Math.random().toString(36).slice(2, 7), name: nm + ' 🤖', isBot: true, token: null, conn: null, connected: true, ...extra }); this.pushLobby(); }
    addLocal(name) { // người chơi cùng máy (chuyền tay)
      if (this.state || !cfg.allowLocal || this.players.length >= MAX) return false;
      const nm = String(name || '').trim().slice(0, 16); if (!nm) return false;
      if (this.usedNames().includes(nm.toLowerCase())) { this.h.onError('Tên này có rồi, đặt tên khác nha.'); return false; }
      this.players.push({ id: 'l' + Math.random().toString(36).slice(2, 7), name: nm, isBot: false, local: true, token: null, conn: null, connected: true }); this.pushLobby(); return true;
    }
    removePlayer(id) { if (this.state) return; const p = this.players.find(x => x.id === id); if (!p || p.id === 'host') return; if (p.conn) try { p.conn.send({ t: 'kicked' }); p.conn.close(); } catch (e) {} this.players = this.players.filter(x => x !== p); this.pushLobby(); }
    seated() { return this.players.filter(p => p.connected || p.isBot || p.local).slice(0, MAX); }
    start(extra) {
      const ps = this.seated(); if (ps.length < MIN) { this.h.onError(cfg.minMsg || `Cần ít nhất ${MIN} người.`); return; }
      this.clearTimers();
      try { this.state = cfg.create(ps.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level })), { ...this.opts, ...(extra || {}) }); } catch (e) { this.h.onError(e.message || 'Không bắt đầu được ván.'); return; }
      this.pushLobby(); this.schedule(); this.broadcast();
    }
    restart() { this.clearTimers(); this.state = null; this.pushLobby(); for (const p of this.players) if (p.conn) this.sendRaw(p, null); this.h.onState(null); }
    controls(id) { const p = this.players.find(x => x.id === id); return !!p && (p.id === 'host' || !!p.local); } // máy chủ phòng được điều khiển ai
    act(pid, a) { const s = this.state; if (!s || !a) return; const r = cfg.apply(s, pid, a, { host: this }); if (!r || !r.ok) { this.tell(pid, (r && r.reason) || 'Không làm được.'); return; } this.schedule(); this.broadcast(); }
    actAs(id, a) { if (this.controls(id)) this.act(id, a); }
    tell(pid, m) { const p = this.players.find(x => x.id === pid); if (p && p.conn) try { p.conn.send({ t: 'error', msg: m }); } catch (e) {} else this.h.onError(m); }
    clearTimers() { for (const k of Object.keys(this.timers)) clearTimeout(this.timers[k]); this.timers = {}; }
    schedule() { // bot và người rớt mạng: máy đi thay
      this.clearTimers(); const s = this.state; if (!s || !cfg.actors) return;
      for (const pid of cfg.actors(s) || []) {
        const p = this.players.find(x => x.id === pid), away = p && !p.isBot && !p.local && !p.connected && pid !== 'host';
        if (!p || !(p.isBot || (away && cfg.bot && cfg.autoAway !== false))) continue;
        const d = away ? AWAY_MS : (cfg.botDelay ? cfg.botDelay(s, pid) : 700 + Math.random() * 600);
        const seq = s.seq; /* bot có thể trả Promise (vd. động cơ cờ chạy trong worker) */
        this.timers[pid] = setTimeout(() => { if (this.dead || this.state !== s) return; let a = null; try { a = cfg.bot(s, pid, p); } catch (e) {} Promise.resolve(a).then(a => { if (a && !this.dead && this.state === s && s.seq === seq) this.act(pid, a); }).catch(() => {}); }, d);
      }
    }
    viewOf(p) { const v = cfg.view(this.state, p.id); if (!this.inGame(p.id)) v.spec = true; v.away = this.players.filter(q => !q.isBot && !q.local && !q.connected && q.id !== 'host').map(q => q.id); return p.id === 'host' ? JSON.parse(JSON.stringify(v)) : v; }
    broadcast() { if (!this.state) return; this.saveSnap(); for (const p of this.players) { if (p.id === 'host') this.h.onState(this.viewOf(p)); else if (p.conn) this.sendRaw(p, this.viewOf(p)); } }
    sendRaw(p, view) { p.bc = (p.bc || 0) + 1; try { p.conn.send({ t: 'state', view, hs: this.hs, bc: p.bc }); } catch (e) {} }
    sendState(p) { if (p.conn && this.state) this.sendRaw(p, this.viewOf(p)); }
    heartbeat() { if (this.dead) return; for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'ping', hs: this.hs, bc: p.bc || 0, started: !!this.state }); } catch (e) {} }
    destroy() { this.dead = true; clearInterval(this.hb); this.clearTimers(); clearTimeout(this.snapT); this.room && this.room.destroy(); }
    leave() { this.destroy(); try { localStorage.removeItem(SNAP); } catch (e) {} session.clear(GAME); }
  }

  class Client {
    constructor(code, name, handlers) {
      this.h = watch(GAME, handlers, () => this.id); this.code = code.toUpperCase().trim(); this.name = name; this.id = null;
      this.hs = null; this.bc = 0; this.joined = false; this.lastRx = Date.now();
      this.makeRoom(); this.wd = setInterval(() => { if (!this.dead && this.joined && Date.now() - this.lastRx > STALL_MS) this.reconnect(); }, 2000);
    }
    makeRoom() {
      const tag = this.tag = {};
      this.room = new RoomClient({
        ns: NS, prefix: PREFIX, code: this.code, joinMsg: () => ({ name: this.name }),
        onStatus: (t, k) => { if (tag === this.tag && this.h.onNet) this.h.onNet(t, k, () => this.room.retryNow()); },
        onFail: m => { if (tag !== this.tag) return; this.h.onError(m); session.clear(GAME); },
        onWelcome: id => { if (tag !== this.tag) return; this.id = id; this.joined = true; this.lastRx = Date.now(); session.save(GAME, { role: 'client', code: this.code, name: this.name }); this.h.onJoined(id); },
        onLost: () => { if (tag !== this.tag) return; this.joined = false; this.h.onDisconnect && this.h.onDisconnect(); },
        onMsg: msg => { if (tag === this.tag) this.onMsg(msg); },
      });
    }
    onMsg(msg) {
      this.lastRx = Date.now();
      if (msg.t === 'state') { specBanner(!!(msg.view && msg.view.spec)); if (msg.hs && msg.hs === this.hs && msg.bc <= this.bc) return; if (msg.hs) { this.hs = msg.hs; this.bc = msg.bc; } this.h.onState(msg.view); }
      else if (msg.t === 'ping') { if (msg.started && (msg.hs !== this.hs || msg.bc > this.bc)) this.room.send({ t: 'sync' }); }
      else if (msg.t === 'lobby') this.h.onLobby(msg.info, msg.code, msg.started);
      else if (msg.t === 'error') this.h.onError(msg.msg);
      else if (msg.t === 'kicked') { this.h.onError('Bạn đã bị mời ra khỏi phòng.'); this.leave(); this.h.onKicked && this.h.onKicked(); }
    }
    reconnect() { if (this.dead) return; this.joined = false; this.lastRx = Date.now(); const old = this.room; this.makeRoom(); try { old.destroy(); } catch (e) {} this.h.onNet && this.h.onNet('Đang nối lại phòng…', 'wait'); }
    act(a) { this.room.send({ t: 'action', a }); }
    actAs(id, a) { if (id === this.id) this.act(a); }
    controls(id) { return id === this.id; }
    destroy() { this.dead = true; clearInterval(this.wd); specBanner(false); this.room.destroy(); }
    leave() { this.destroy(); session.clear(GAME); }
  }
  return { Host, Client, loadSnapshot, session, MIN, MAX, GAME };
}
