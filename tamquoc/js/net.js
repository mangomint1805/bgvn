// Lớp mạng Tam Quốc Sát: host giữ state + chạy engine, client chỉ gửi action. Kết nối dùng chung ở shared/net/room.js
import { createGame, applyAction, viewFor, top, getPlayer, NULL_TIME } from './engine.js?v=3';
import { botAction } from './bot.js?v=3';
import { S } from './fx.js?v=3';
import { RoomHost, RoomClient, token, session } from '../../shared/net/room.js';
export const TURN_TIME = 60, PROMPT_TIME = 20, PICK_TIME = 30; // giây: hết giờ thì máy tự đánh thay (chống treo máy)
const NS = 'bgvn-tamquoc', PREFIX = 'bgvn-tamquoc-', GAME = 'tamquoc';
const SNAP = 'bgvn-hostsnap-' + GAME;
export const MAX = 8, MIN = 2;
export function loadSnapshot() { try { const d = JSON.parse(localStorage.getItem(SNAP)); return d && Date.now() - d.ts < 3 * 3600e3 ? d : null; } catch (e) { return null; } }
export { session };
const BOT_NAMES = ['Tiến', 'Tuni', 'Thành', 'Khiêm', 'Thái', 'Minto', 'Mochi', 'Bắp', 'Su Su'];

// thời gian chờ người thật theo loại câu hỏi
function askTime(ask) {
  if (ask.type === 'play') return TURN_TIME * 1000;
  if (ask.type === 'nullify') return NULL_TIME * 1000;
  if (ask.type === 'general' || ask.type === 'guanxing') return PICK_TIME * 1000;
  return PROMPT_TIME * 1000;
}
function askKey(s, t) { return [s.turnCount, s.stack.length, t.k, t.stage || '', t.ask.type, t.count ?? '', t.i ?? '', t.got ?? '', t.cur ?? ''].join('|'); }

// ======================= HOST =======================
export class Host {
  constructor(name, handlers, offline = false, restore = null) {
    this.h = handlers; this.offline = offline;
    this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: true }];
    this.opts = { exp: true, expGen: true };
    this.state = null; this.conns = new Map(); this.botTimer = null; this.dlTimer = null; this.deadline = null;
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || p.id === 'host' }));
      this.state = restore.state; this.code = restore.code; if (restore.opts) this.opts = restore.opts;
    }
    if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 1500; this.broadcast(); this.scheduleBots(); } }, 0); return; }
    this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
    this.code = this.room.code;
    setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 4000; this.broadcast(); this.scheduleBots(); } }, 0);
  }
  saveSnap() {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => { try { localStorage.setItem(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, players: this.players.map(({ conn, ...p }) => p), state: this.state, opts: this.opts })); } catch (e) {} }, 300);
  }
  attach(conn) {
    conn.on('data', msg => this.onMsg(conn, msg));
    conn.on('close', () => this.onLeave(conn));
    conn.on('error', () => this.onLeave(conn));
  }
  onMsg(conn, msg) {
    if (!msg) return;
    if (msg.t === 'join') {
      let p = this.players.find(x => x.token === msg.token && !x.isBot && x.id !== 'host');
      if (p) { if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {} p.conn = conn; p.connected = true; p.name = String(msg.name || p.name).slice(0, 16); }
      else {
        if (this.state) { conn.send({ t: 'error', msg: 'Ván đang diễn ra, không thể vào.' }); return; }
        if (this.players.length >= MAX) { conn.send({ t: 'error', msg: `Phòng đã đủ ${MAX} người.` }); return; }
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), isBot: false, token: msg.token, conn, connected: true };
        this.players.push(p);
      }
      this.conns.set(conn.peer, p);
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      if (this.state) conn.send({ t: 'state', view: this.viewOf(p.id) });
      this.pushLobby(); this.scheduleBots();
    } else if (msg.t === 'action') {
      const p = this.conns.get(conn.peer); if (p) this.act(p.id, msg.a);
    } else if (msg.t === 'ping') conn.send({ t: 'pong' });
  }
  onLeave(conn) {
    const p = this.conns.get(conn.peer); if (!p) return;
    this.conns.delete(conn.peer);
    if (p.conn === conn) { p.conn = null; p.connected = false; }
    if (!this.state) this.players = this.players.filter(x => x !== p);
    this.pushLobby(); this.scheduleBots();
  }
  lobbyInfo() { return this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected, afk: (p.afk || 0) >= 2 })); }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state, this.opts); this.saveSnap();
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', players: info, code: this.code, started: !!this.state, opts: this.opts }); } catch (e) {}
  }
  addBot() {
    if (this.state || this.players.length >= MAX) return;
    const used = this.players.map(p => p.name.replace(' 🤖', ''));
    const nm = BOT_NAMES.find(n => !used.includes(n)) || 'Bot' + this.players.length;
    this.players.push({ id: 'bot' + Math.random().toString(36).slice(2, 7), name: nm + ' 🤖', isBot: true, token: null, conn: null, connected: true });
    this.pushLobby();
  }
  removePlayer(id) {
    if (this.state) return;
    const p = this.players.find(x => x.id === id); if (!p || p.id === 'host') return;
    if (p.conn) try { p.conn.send({ t: 'kicked' }); p.conn.close(); } catch (e) {}
    this.players = this.players.filter(x => x !== p); this.pushLobby();
  }
  setOpts(o) { if (this.state) return; this.opts = { ...this.opts, ...o }; this.pushLobby(); }
  start() {
    if (this.players.length < MIN || this.players.length > MAX) { this.h.onError(`Cần ${MIN}–${MAX} người chơi.`); return; }
    this.state = createGame(this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })), this.opts);
    this.graceUntil = Date.now() + 2500 * S();
    this.pushLobby(); this.broadcast(); this.scheduleBots();
  }
  restart() { this.clearTimers(); this.state = null; this.pushLobby(); for (const p of this.players) if (p.conn) p.conn.send({ t: 'state', view: null }); this.h.onState(null); }
  act(pid, a, auto = false) {
    if (!this.state) return;
    if (!auto) { const pl = this.players.find(x => x.id === pid); if (pl && pl.afk) { pl.afk = 0; this.pushLobby(); } }
    const r = applyAction(this.state, pid, a);
    if (!r.ok) { const p = this.players.find(x => x.id === pid); if (p && p.conn) p.conn.send({ t: 'error', msg: r.reason }); else if (pid === 'host') this.h.onError(r.reason); }
    this.scheduleBots(); this.broadcast();
  }
  viewOf(pid) {
    const view = viewFor(this.state, pid);
    if (this.deadline) {
      const pids = this.deadline.nullify ? this.deadline.pids.filter(x => x === pid) : this.deadline.pids;
      view.timer = { pids, ms: Math.max(0, this.deadline.end - Date.now()), total: this.deadline.total, nullify: !!this.deadline.nullify };
    }
    view.conn = Object.fromEntries(this.players.map(p => [p.id, p.isBot ? 'bot' : !p.connected ? 'off' : (p.afk || 0) >= 2 ? 'afk' : 'on']));
    return view;
  }
  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    for (const p of this.players) {
      if (p.id === 'host') this.h.onState(JSON.parse(JSON.stringify(this.viewOf('host'))));
      else if (p.conn) try { p.conn.send({ t: 'state', view: this.viewOf(p.id) }); } catch (e) {}
    }
  }
  clearTimers() { clearTimeout(this.botTimer); clearTimeout(this.dlTimer); this.deadline = null; }
  // Bot và người mất kết nối: tự đánh. Người thật: đồng hồ, hết giờ máy đánh thay.
  scheduleBots() {
    clearTimeout(this.botTimer);
    const s = this.state;
    if (!s || s.phase !== 'playing') { this.clearTimers(); return; }
    const t = top(s); if (!t || !t.ask) { this.clearTimers(); return; }
    const ask = t.ask;
    const who = ask.players.map(id => this.players.find(x => x.id === id)).filter(Boolean);
    const autos = who.filter(p => p.isBot || (!p.connected && p.id !== 'host') || p.afk >= 2);
    const humans = who.filter(p => !autos.includes(p));
    if (autos.length) {
      const p = autos[0]; const pid = p.id;
      const base = ask.type === 'nullify' ? 500 + Math.random() * 500 : ask.type === 'general' ? 380 : ask.type === 'play' ? 950 : 750;
      const wait = p.isBot ? Math.max(Math.round(base * S()), (this.graceUntil || 0) - Date.now()) : p.afk >= 2 && p.connected ? 2500 : 5000;
      this.botTimer = setTimeout(() => {
        if (!this.state) return;
        const tt = top(this.state); if (!tt || !tt.ask || !tt.ask.players.includes(pid)) { this.scheduleBots(); return; }
        const a = botAction(this.state, pid);
        if (a) this.act(pid, a, true); else this.scheduleBots();
      }, wait);
    }
    // đồng hồ cho người thật (giữ nguyên hạn chót nếu vẫn là cùng một câu hỏi)
    if (humans.length) {
      const key = askKey(s, t);
      if (!this.deadline || this.deadline.key !== key) {
        clearTimeout(this.dlTimer);
        const ms = askTime(ask);
        this.deadline = { key, end: Date.now() + ms, total: ms, pids: humans.map(p => p.id), nullify: ask.type === 'nullify' };
        this.dlTimer = setTimeout(() => this.timeout(key), ms + 50);
      } else this.deadline.pids = humans.map(p => p.id);
    } else { clearTimeout(this.dlTimer); this.deadline = null; }
  }
  timeout(key) {
    const s = this.state; if (!s || s.phase !== 'playing') return;
    const t = top(s); if (!t || !t.ask || askKey(s, t) !== key) return;
    this.deadline = null;
    // hết giờ: ai chưa trả lời thì máy quyết thay (pha ra bài thì kết thúc lượt)
    for (const pid of [...t.ask.players]) {
      const p = this.players.find(x => x.id === pid); if (!p || p.isBot) continue;
      const tt = top(this.state); if (!tt || tt !== t || !tt.ask || !tt.ask.players.includes(pid)) break;
      if (tt.ask.type === 'play' || tt.ask.type === 'general') p.afk = (p.afk || 0) + 1;
      const a = tt.ask.type === 'play' && (p.afk || 0) < 2 ? { type: 'end' } : tt.ask.type === 'nullify' ? { type: 'pass' } : botAction(this.state, pid);
      if (a) applyAction(this.state, pid, a);
    }
    this.scheduleBots(); this.broadcast();
  }
  destroy() { this.dead = true; this.clearTimers(); clearTimeout(this.snapT); this.room && this.room.destroy(); }
  leave() { this.destroy(); try { localStorage.removeItem(SNAP); } catch (e) {} session.clear(GAME); }
}

// ======================= CLIENT =======================
export class Client {
  constructor(code, name, handlers) {
    this.h = handlers; this.code = code.toUpperCase().trim(); this.name = name; this.id = null;
    this.room = new RoomClient({
      ns: NS, prefix: PREFIX, code: this.code, joinMsg: () => ({ name: this.name }),
      onStatus: (t, k) => { this.h.onNet && this.h.onNet(t, k, () => this.room.retryNow()); },
      onFail: m => { this.h.onError(m); session.clear(GAME); },
      onWelcome: id => { this.id = id; session.save(GAME, { role: 'client', code: this.code, name: this.name }); this.h.onJoined(id); },
      onLost: () => this.h.onDisconnect(),
      onMsg: msg => {
        if (msg.t === 'lobby') this.h.onLobby(msg.players, msg.code, msg.started, msg.opts);
        else if (msg.t === 'state') this.h.onState(msg.view);
        else if (msg.t === 'error') this.h.onError(msg.msg);
        else if (msg.t === 'kicked') { this.h.onError('Bạn đã bị mời ra khỏi phòng.'); this.leave(); }
      },
    });
  }
  act(a) { this.room.send({ t: 'action', a }); }
  destroy() { this.room.destroy(); }
  leave() { this.destroy(); session.clear(GAME); }
}
