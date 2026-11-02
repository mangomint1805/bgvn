// Lớp mạng PeerJS cho UNO: host giữ state, client chỉ gửi action.
import { createGame, applyAction, viewFor, current, MODES } from './engine.js';
import { botAction, botCatch } from './bot.js';
import { S } from './ufx.js';

const PREFIX = 'bgvn-uno-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode() { let s = ''; for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; return s; }
function token() {
  let t = null; try { t = localStorage.getItem('bgvn-token'); } catch (e) {}
  if (!t) { t = Math.random().toString(36).slice(2) + Date.now().toString(36); try { localStorage.setItem('bgvn-token', t); } catch (e) {} }
  return t;
}
const BOT_NAMES = ['Mochi', 'Bơ', 'Kem', 'Su Su', 'Tôm', 'Bắp', 'Mít', 'Na', 'Xoài'];
export const MAX = 10;

export class Host {
  constructor(name, handlers, offline = false) {
    this.h = handlers;
    this.code = offline ? 'OFFLINE' : makeCode();
    this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: true }];
    this.state = null; this.conns = new Map(); this.botTimer = null; this.catchTimer = null;
    this.mode = 'house'; this.rules = { ...MODES.house.rules };
    if (offline) { this.peer = { destroy() {} }; setTimeout(() => this.pushLobby(), 0); return; }
    this.peer = new Peer(PREFIX + this.code, { debug: 1 });
    this.peer.on('open', () => this.pushLobby());
    this.peer.on('error', e => {
      if (e.type === 'unavailable-id') { this.code = makeCode(); this.peer.destroy(); this.peer = new Peer(PREFIX + this.code); this.peer.on('open', () => this.pushLobby()); this.wire(); }
      else this.h.onError('Lỗi mạng: ' + e.type);
    });
    this.wire();
  }
  wire() {
    this.peer.on('connection', conn => {
      conn.on('data', msg => this.onMsg(conn, msg));
      conn.on('close', () => this.onLeave(conn));
      conn.on('error', () => this.onLeave(conn));
    });
  }
  onMsg(conn, msg) {
    if (msg.t === 'join') {
      let p = this.players.find(x => x.token === msg.token && !x.isBot);
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
    this.h.onLobby(info, this.code, !!this.state);
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
    const r = applyAction(this.state, pid, a);
    if (!r.ok) { const p = this.players.find(x => x.id === pid); if (p && p.conn) p.conn.send({ t: 'error', msg: r.reason }); else if (pid === 'host') this.h.onError(r.reason); }
    this.broadcast(); this.scheduleBots();
  }
  broadcast() {
    if (!this.state) return;
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
    const pid = s.pending ? s.pending.player : current(s).id;
    const p = this.players.find(x => x.id === pid); if (!p) return;
    const auto = p.isBot || (!p.connected && pid !== 'host');
    if (!auto) return;
    const human = this.players.some(x => !x.isBot);
    const base = s.unoWatch && human ? 2600 : 1000; // chừa thời gian cho người thật bắt lỗi
    this.botTimer = setTimeout(() => {
      clearTimeout(this.catchTimer); this.catchTimer = null;
      const a = botAction(this.state, pid);
      if (a) this.act(pid, a);
    }, p.isBot ? Math.max(Math.round((base + Math.random() * 500) * S()), (this.graceUntil || 0) - Date.now()) : 20000);
  }
  destroy() { clearTimeout(this.botTimer); clearTimeout(this.catchTimer); try { this.peer.destroy(); } catch (e) {} }
}

export class Client {
  constructor(code, name, handlers) {
    this.h = handlers; this.code = code.toUpperCase().trim(); this.name = name; this.id = null;
    this.peer = new Peer(undefined, { debug: 1 });
    this.peer.on('open', () => this.connect());
    this.peer.on('error', e => {
      if (e.type === 'peer-unavailable') this.h.onError('Không tìm thấy phòng ' + this.code + '.');
      else this.h.onError('Lỗi mạng: ' + e.type);
    });
  }
  connect() {
    this.conn = this.peer.connect(PREFIX + this.code, { reliable: true });
    this.conn.on('open', () => this.conn.send({ t: 'join', name: this.name, token: token() }));
    this.conn.on('data', msg => {
      if (msg.t === 'welcome') { this.id = msg.id; this.h.onJoined(msg.id); }
      else if (msg.t === 'lobby') this.h.onLobby(msg.info, msg.code, msg.started);
      else if (msg.t === 'state') this.h.onState(msg.view);
      else if (msg.t === 'error') this.h.onError(msg.msg);
      else if (msg.t === 'kicked') { this.h.onError('Bạn đã bị mời ra khỏi phòng.'); this.destroy(); }
    });
    this.conn.on('close', () => this.h.onDisconnect());
    this.conn.on('error', () => this.h.onDisconnect());
  }
  act(a) { if (this.conn && this.conn.open) this.conn.send({ t: 'action', a }); }
  destroy() { try { this.peer.destroy(); } catch (e) {} }
}
