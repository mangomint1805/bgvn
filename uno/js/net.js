// Lớp mạng UNO: host giữ state, client chỉ gửi action. Kết nối dùng chung ở shared/net/room.js
import { createGame, applyAction, viewFor, current, MODES } from './engine.js?v=14';
import { botAction, botCatch } from './bot.js?v=14';
import { S } from './ufx.js';
import { RoomHost, RoomClient, token, session } from '../../shared/net/room.js';
const NS = 'bgvn-uno', PREFIX = 'bgvn-uno-', GAME = 'uno';
const SNAP = 'bgvn-hostsnap-' + GAME;
export function loadSnapshot() { try { const d = JSON.parse(localStorage.getItem(SNAP)); return d && Date.now() - d.ts < 3 * 3600e3 ? d : null; } catch (e) { return null; } }
export { session };
const BOT_NAMES = ['Mochi', 'Bơ', 'Kem', 'Su Su', 'Tôm', 'Bắp', 'Mít', 'Na', 'Xoài'];
export const MAX = 10;
export const PULL_CD = 1000; // giãn cách giữa 2 lần tự bốc phạt

export class Host {
  constructor(name, handlers, offline = false, restore = null) {
    this.h = handlers; this.offline = offline;
    this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: true }];
    this.state = null; this.conns = new Map(); this.botTimer = null; this.catchTimer = null;
    this.mode = 'house'; this.rules = { ...MODES.house.rules };
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || p.id === 'host' }));
      this.state = restore.state; this.code = restore.code; this.mode = restore.mode || this.mode; this.rules = restore.rules || this.rules;
    }
    if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.scheduleBots(); this.broadcast(); } }, 0); return; }
    this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
    this.code = this.room.code;
    setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 4000; this.scheduleBots(); this.broadcast(); } }, 0);
  }
  saveSnap() {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => { try { localStorage.setItem(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, mode: this.mode, rules: this.rules, players: this.players.map(({ conn, ...p }) => p), state: this.state })); } catch (e) {} }, 300);
  }
  attach(conn) {
    conn.on('data', msg => this.onMsg(conn, msg));
    conn.on('close', () => this.onLeave(conn));
    conn.on('error', () => this.onLeave(conn));
  }
  onMsg(conn, msg) {
    if (msg.t === 'join') {
      let p = this.players.find(x => x.token === msg.token && !x.isBot && x.id !== 'host');
      if (p) { if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {} p.conn = conn; p.connected = true; p.name = msg.name || p.name; }
      else {
        if (this.state) { conn.send({ t: 'error', msg: 'Ván đang diễn ra, không thể vào.' }); return; }
        if (this.players.length >= MAX) { conn.send({ t: 'error', msg: `Phòng đã đủ ${MAX} người.` }); return; }
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), isBot: false, token: msg.token, conn, connected: true };
        this.players.push(p);
      }
      this.conns.set(conn.peer, p);
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      if (this.state) conn.send({ t: 'state', view: viewFor(this.state, p.id) });
      this.pushLobby();
    } else if (msg.t === 'action') {
      const p = this.conns.get(conn.peer); if (p) this.act(p.id, msg.a);
    }
  }
  onLeave(conn) {
    const p = this.conns.get(conn.peer); if (!p) return;
    this.conns.delete(conn.peer);
    if (p.conn === conn) { p.conn = null; p.connected = false; }
    if (!this.state) this.players = this.players.filter(x => x !== p);
    this.pushLobby(); this.scheduleBots();
  }
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected })), mode: this.mode, rules: this.rules }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state); this.saveSnap();
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  setMode(mode) { if (this.state || !MODES[mode]) return; this.mode = mode; this.rules = { ...MODES[mode].rules }; this.pushLobby(); }
  setRule(k, v) { if (this.state || !(k in this.rules)) return; this.rules[k] = !!v; this.pushLobby(); }
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
  start() {
    if (this.players.length < 2) { this.h.onError('Cần ít nhất 2 người chơi (thêm bot nhé).'); return; }
    this.state = createGame(this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })), this.mode, this.rules);
    this.graceUntil = Date.now() + 3200 * S();
    this.pushLobby(); this.broadcast(); this.scheduleBots();
  }
  restart() { clearTimeout(this.botTimer); clearTimeout(this.catchTimer); this.state = null; this.pushLobby(); for (const p of this.players) if (p.conn) p.conn.send({ t: 'state', view: null }); this.h.onState(null); }
  act(pid, a) {
    if (!this.state) return;
    if (a && a.type === 'pull') { // mỗi lần bốc cách nhau 1 giây – cho nó thấm 😈
      this.lastPull = this.lastPull || {}; const now = Date.now();
      if (now - (this.lastPull[pid] || 0) < PULL_CD - 60) return;
      this.lastPull[pid] = now;
    }
    const r = applyAction(this.state, pid, a);
    if (!r.ok) { const p = this.players.find(x => x.id === pid); if (p && p.conn) p.conn.send({ t: 'error', msg: r.reason }); else if (pid === 'host') this.h.onError(r.reason); }
    this.broadcast(); this.scheduleBots();
  }
  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    for (const p of this.players) {
      const view = viewFor(this.state, p.id);
      if (p.id === 'host') this.h.onState(JSON.parse(JSON.stringify(view)));
      else if (p.conn) try { p.conn.send({ t: 'state', view }); } catch (e) {}
    }
  }
  scheduleBots() {
    clearTimeout(this.botTimer);
    const s = this.state; if (!s || s.phase !== 'playing') return;
    // bot có thể bắt lỗi quên hô UNO
    if (s.unoWatch && !this.catchTimer) {
      const bots = this.players.filter(p => p.isBot && p.id !== s.unoWatch && !s.players.find(q => q.id === p.id).out);
      if (bots.length && Math.random() < 0.6) {
        const b = bots[Math.floor(Math.random() * bots.length)];
        this.catchTimer = setTimeout(() => { this.catchTimer = null; const a = this.state && botCatch(this.state, b.id); if (a) this.act(b.id, a); }, (900 + Math.random() * 1400) * S());
      }
    }
    const pid = s.owe ? s.owe.player : s.pending ? s.pending.player : current(s).id;
    const p = this.players.find(x => x.id === pid); if (!p) return;
    const auto = p.isBot || (!p.connected && pid !== 'host');
    if (!auto) return;
    if (s.owe) { this.botTimer = setTimeout(() => this.act(pid, { type: 'pull' }), Math.max(PULL_CD + 80, (this.graceUntil || 0) - Date.now())); return; }
    const human = this.players.some(x => !x.isBot);
    const base = s.unoWatch && human ? 2600 : 1000; // chừa thời gian cho người thật bắt lỗi
    this.botTimer = setTimeout(() => {
      clearTimeout(this.catchTimer); this.catchTimer = null;
      const a = botAction(this.state, pid);
      if (a) this.act(pid, a);
    }, p.isBot ? Math.max(Math.round((base + Math.random() * 500) * S()), (this.graceUntil || 0) - Date.now()) : 20000);
  }
  destroy() { this.dead = true; clearTimeout(this.botTimer); clearTimeout(this.catchTimer); clearTimeout(this.snapT); this.room && this.room.destroy(); }
  leave() { this.destroy(); try { localStorage.removeItem(SNAP); } catch (e) {} session.clear(GAME); }
}

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
        if (msg.t === 'lobby') this.h.onLobby(msg.info, msg.code, msg.started);
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
