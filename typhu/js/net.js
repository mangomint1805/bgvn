// Lớp mạng cho Cờ tỷ phú: host giữ state, client chỉ gửi action.
import { createGame, applyAction, viewFor, cur } from './engine.js';
import { botAction } from './bot.js';
import { S } from './fx.js';
export const TURN_TIME = 25; // giây cho mỗi quyết định, hết giờ máy tự đánh thay
import { peerOptions, keepAlive } from './ice.js';
import { RelayHost, relayConnect } from './relay.js';
import { FbHost, fbConnect, fbEnabled } from './fbrelay.js';
const NS = 'bgvn-typhu';

const PREFIX = 'bgvn-typhu-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode() { let s = ''; for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; return s; }
function token() {
  let t = null; try { t = localStorage.getItem('bgvn-token'); } catch (e) {}
  if (!t) { t = Math.random().toString(36).slice(2) + Date.now().toString(36); try { localStorage.setItem('bgvn-token', t); } catch (e) {} }
  return t;
}
const BOT_NAMES = ['Bé Na', 'Chú Tư', 'Cô Ba', 'Anh Sáu', 'Út Mập', 'Bà Năm'];
export const MAX = 4;

export class Host {
  constructor(name, handlers, offline = false) {
    this.h = handlers;
    this.code = offline ? 'OFFLINE' : makeCode();
    this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: true }];
    this.state = null; this.conns = new Map(); this.botTimer = null; this.catchTimer = null;
    this.opts = { startMoney: 2000, maxRounds: 0, monopolyWin: true };
    if (offline) { this.peer = { destroy() {} }; setTimeout(() => this.pushLobby(), 0); return; }
    this.open();
    this.stopKeep = keepAlive(() => this.peer);
    setTimeout(() => this.pushLobby(), 0);
  }
  startRelay() {
    if (this.relay && this.relayCode === this.code) return;
    if (this.relay) this.relay.destroy();
    if (this.fb) this.fb.destroy();
    this.relayCode = this.code;
    this.fb = new FbHost(NS, this.code, conn => this.attach(conn));
    this.relay = new RelayHost(NS, this.code, conn => this.attach(conn));
  }
  async open() {
    this.startRelay();
    const opt = await peerOptions();
    if (this.dead) return;
    this.peer = new Peer(PREFIX + this.code, opt);
    this.peer.on('open', () => { this.opened = true; this.pushLobby(); });
    this.peer.on('disconnected', () => { if (!this.dead) setTimeout(() => { try { if (this.peer.disconnected && !this.peer.destroyed) this.peer.reconnect(); } catch (e) {} }, 1000); });
    this.peer.on('error', e => {
      if (e.type === 'unavailable-id') {
        try { this.peer.destroy(); } catch (x) {}
        if (this.opened && (this.keepTries = (this.keepTries || 0) + 1) <= 5) setTimeout(() => this.open(), 3000); else { this.code = makeCode(); this.open(); }
      }
      else if (['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected'].includes(e.type)) { /* tự nối lại */ }
      else if (e.type !== 'peer-unavailable') this.h.onError('Lỗi mạng: ' + e.type);
    });
    this.wire();
  }
  wire() { this.peer.on('connection', conn => this.attach(conn)); }
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
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected })), opts: this.opts }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state);
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  setOpt(k, v) { if (this.state || !(k in this.opts)) return; this.opts[k] = v; this.pushLobby(); }
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
    this.state = createGame(this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })), this.opts);
    this.graceUntil = Date.now() + 2500 * S();
    this.pushLobby(); this.scheduleBots(); this.broadcast();
  }
  restart() { clearTimeout(this.botTimer); clearTimeout(this.catchTimer); this.state = null; this.pushLobby(); for (const p of this.players) if (p.conn) p.conn.send({ t: 'state', view: null }); this.h.onState(null); }
  act(pid, a) {
    if (!this.state) return;
    const r = applyAction(this.state, pid, a);
    if (!r.ok) { const p = this.players.find(x => x.id === pid); if (p && p.conn) p.conn.send({ t: 'error', msg: r.reason }); else if (pid === 'host') this.h.onError(r.reason); }
    this.scheduleBots(); this.broadcast();
  }
  broadcast() {
    if (!this.state) return;
    for (const p of this.players) {
      const view = viewFor(this.state, p.id);
      if (this.deadline) view.timer = { pid: this.deadline.pid, ms: Math.max(0, this.deadline.end - Date.now()) };
      if (p.id === 'host') this.h.onState(JSON.parse(JSON.stringify(view)));
      else if (p.conn) try { p.conn.send({ t: 'state', view }); } catch (e) {}
    }
  }
  scheduleBots() {
    clearTimeout(this.botTimer); this.deadline = null;
    const s = this.state; if (!s || s.phase !== 'playing') return;
    const pid = s.pending ? s.pending.player : cur(s).id;
    const p = this.players.find(x => x.id === pid); if (!p) return;
    let ms;
    if (p.isBot) ms = Math.max(Math.round((s.pending ? 900 : 1100) * S() + Math.random() * 300), (this.graceUntil || 0) - Date.now());
    else { ms = (!p.connected && pid !== 'host') ? 15000 : TURN_TIME * 1000; this.deadline = { pid, end: Date.now() + ms }; }
    // chờ hoạt ảnh quân cờ chạy xong rồi bot mới đi tiếp
    if (p.isBot && s.lastMove && s.lastMove.seq !== this.seenMove) { this.seenMove = s.lastMove.seq; ms += Math.min(3200, (Math.abs(s.lastMove.steps) || 3) * 190) * S(); }
    this.botTimer = setTimeout(() => {
      const a = this.state && botAction(this.state, pid);
      if (a) this.act(pid, a);
    }, ms);
  }
  destroy() { this.dead = true; clearTimeout(this.botTimer); clearTimeout(this.catchTimer); this.relay && this.relay.destroy(); this.fb && this.fb.destroy(); this.stopKeep && this.stopKeep(); try { this.peer.destroy(); } catch (e) {} }
}

export class Client {
  // Thử lần lượt: Firebase (nếu đã cấu hình) → P2P (PeerJS) → MQTT công cộng
  constructor(code, name, handlers) {
    this.h = handlers; this.code = code.toUpperCase().trim(); this.name = name; this.id = null; this.tries = 0;
    this.modes = /[?&]relay=1/.test(location.search) ? ['mqtt'] : /[?&]p2p=1/.test(location.search) ? ['p2p'] : (fbEnabled() ? ['fb', 'p2p', 'mqtt'] : ['p2p', 'mqtt']);
    this.mi = 0;
    if (this.modes.includes('p2p')) this.initPeer();
    this.connect();
  }
  status(m) { this.h.onStatus ? this.h.onStatus(m) : this.h.onError(m); }
  initPeer() {
    this.peerOpen = new Promise(async res => {
      const opt = await peerOptions(); if (this.dead) return;
      setTimeout(() => res(false), 6000);
      try { this.peer = new Peer(undefined, opt); } catch (e) { res(false); return; }
      this.stopKeep = keepAlive(() => this.peer);
      this.peer.on('open', () => res(true));
      this.peer.on('error', e => { if (e.type === 'peer-unavailable' && this.mode() === 'p2p' && !this.id) this.next(); else res(false); });
    });
  }
  mode() { return this.modes[this.mi]; }
  next(final) {
    if (this.dead || this.id) return;
    clearTimeout(this.joinTimer);
    if (this.mi < this.modes.length - 1) { this.mi++; this.connect(); return; }
    if (++this.tries <= 2) { this.status(`Đang thử kết nối lại (${this.tries}/2)…`); this.mi = 0; setTimeout(() => this.connect(), 2000); return; }
    this.h.onError(final || ('Không tìm thấy phòng ' + this.code + '. Kiểm tra lại mã – chủ phòng phải đang mở tab game.'));
    this.status('❌ Không vào được phòng. Bấm Thoát rồi thử lại nhé.');
  }
  async connect() {
    if (this.dead || this.id) return;
    const mode = this.mode();
    try { this.conn && this.conn.close(); } catch (e) {}
    this.conn = null;
    let conn;
    if (mode === 'p2p') {
      this.status('Đang kết nối…');
      const ok = await this.peerOpen; if (this.dead || this.id) return;
      if (!ok || !this.peer || this.peer.disconnected) { this.next(); return; }
      conn = this.peer.connect(PREFIX + this.code, { reliable: true });
    } else if (mode === 'fb') { this.status('Đang kết nối…'); conn = fbConnect(NS, this.code); }
    else { this.status('Đang nối qua đường dự phòng…'); conn = relayConnect(NS, this.code); }
    this.conn = conn;
    clearTimeout(this.joinTimer);
    this.joinTimer = setTimeout(() => { if (!this.id && conn === this.conn) this.next(); }, mode === 'p2p' ? 7000 : 12000);
    conn.on('open', () => { if (conn === this.conn) conn.send({ t: 'join', name: this.name, token: token() }); });
    conn.on('data', msg => {
      if (conn !== this.conn) return;
      if (msg.t === 'welcome') { clearTimeout(this.joinTimer); this.id = msg.id; this.h.onJoined(msg.id); }
      else if (msg.t === 'lobby') this.h.onLobby(msg.info, msg.code, msg.started);
      else if (msg.t === 'state') this.h.onState(msg.view);
      else if (msg.t === 'error') this.h.onError(msg.msg);
      else if (msg.t === 'kicked') { this.h.onError('Bạn đã bị mời ra khỏi phòng.'); this.destroy(); }
    });
    const lost = () => {
      if (conn !== this.conn || this.dead) return;
      if (!this.id) { if (conn.notFound || mode !== 'p2p') this.next(); return; } // chưa vào được: thử đường khác
      this.h.onDisconnect(); this.id = null; this.tries = 0;
      setTimeout(() => { if (!this.dead) this.connect(); }, 1500);
    };
    conn.on('close', lost); conn.on('error', lost);
  }
  act(a) { if (this.conn && this.conn.open) this.conn.send({ t: 'action', a }); }
  destroy() { this.dead = true; clearTimeout(this.joinTimer); this.stopKeep && this.stopKeep(); try { this.conn && this.conn.close(); } catch (e) {} try { this.peer && this.peer.destroy(); } catch (e) {} }
}
