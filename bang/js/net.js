// Lớp mạng PeerJS: host giữ state + chạy engine, client chỉ gửi action.
import { createGame, applyAction, viewFor, topPrompt, current, alivePlayers } from './engine.js';
import { botAction } from './bot.js';
import { S } from './fx.js';

const PREFIX = 'bangvn-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode() { let s = ''; for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; return s; }
function token() {
  let t = localStorage.getItem('bangvn-token');
  if (!t) { t = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('bangvn-token', t); }
  return t;
}
const BOT_NAMES = ['Django', 'Clint', 'Tuco', 'Calamity', 'Doc', 'Billy', 'Wyatt', 'Jesse'];

// ======================= HOST =======================
export class Host {
  constructor(name, handlers, offline = false) {
    this.h = handlers; // {onLobby(players, code), onState(view), onError(msg)}
    this.code = offline ? 'OFFLINE' : makeCode();
    this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: true }];
    this.state = null;
    this.conns = new Map(); // peerId -> conn
    this.botTimer = null;
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
      if (p) { // rejoin
        if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {}
        p.conn = conn; p.connected = true; p.name = msg.name || p.name;
      } else {
        if (this.state) { conn.send({ t: 'error', msg: 'Ván đang diễn ra, không thể vào.' }); return; }
        if (this.players.length >= 7) { conn.send({ t: 'error', msg: 'Phòng đã đủ 7 người.' }); return; }
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: msg.name.slice(0, 16), isBot: false, token: msg.token, conn, connected: true };
        this.players.push(p);
      }
      this.conns.set(conn.peer, p);
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      if (this.state) conn.send({ t: 'state', view: viewFor(this.state, p.id) });
      this.pushLobby();
    } else if (msg.t === 'action') {
      const p = this.conns.get(conn.peer); if (!p) return;
      this.act(p.id, msg.a);
    } else if (msg.t === 'ping') conn.send({ t: 'pong' });
  }
  onLeave(conn) {
    const p = this.conns.get(conn.peer); if (!p) return;
    this.conns.delete(conn.peer);
    if (p.conn === conn) { p.conn = null; p.connected = false; }
    if (!this.state) { this.players = this.players.filter(x => x !== p); }
    this.pushLobby();
  }
  lobbyInfo() { return this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected })); }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code);
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', players: info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  addBot() {
    if (this.state || this.players.length >= 7) return;
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
    if (this.players.length < 4 || this.players.length > 7) { this.h.onError('Cần 4–7 người chơi.'); return; }
    this.state = createGame(this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })));
    this.graceUntil = Date.now() + 9000 * S(); // cho mọi người đọc vai trò trước khi bot đánh
    this.pushLobby(); this.broadcast(); this.scheduleBots();
  }
  restart() { this.state = null; this.pushLobby(); for (const p of this.players) if (p.conn) p.conn.send({ t: 'state', view: null }); this.h.onState(null); }
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
      if (p.id === 'host') this.h.onState(JSON.parse(JSON.stringify(view))); // bản sao: tránh dùng chung mảng với state
      else if (p.conn) try { p.conn.send({ t: 'state', view }); } catch (e) {}
    }
  }
  // Bot và người mất kết nối: tự đánh
  scheduleBots() {
    clearTimeout(this.botTimer);
    if (!this.state || this.state.phase !== 'playing') return;
    const s = this.state; const pr = topPrompt(s);
    const pid = pr ? pr.player : current(s).id;
    const p = this.players.find(x => x.id === pid);
    if (!p) return;
    const auto = p.isBot || (!p.connected && pid !== 'host');
    if (!auto) return;
    // người thật mất kết nối: chờ 20s cho họ vào lại, rồi bot đánh thay
    this.botTimer = setTimeout(() => {
      const a = botAction(this.state, pid);
      if (a) this.act(pid, a); else this.scheduleBots();
    }, p.isBot ? Math.max(Math.round(1150 * S()), (this.graceUntil || 0) - Date.now()) : 20000);
  }
  destroy() { clearTimeout(this.botTimer); try { this.peer.destroy(); } catch (e) {} }
}

// ======================= CLIENT =======================
export class Client {
  constructor(code, name, handlers) {
    this.h = handlers; this.code = code.toUpperCase().trim(); this.name = name; this.id = null;
    this.peer = new Peer(undefined, { debug: 1 });
    this.peer.on('open', () => this.connect());
    this.peer.on('error', e => {
      if (e.type === 'peer-unavailable') this.h.onError('Không tìm thấy phòng ' + this.code + '. Kiểm tra lại mã hoặc chủ phòng đã đóng.');
      else this.h.onError('Lỗi mạng: ' + e.type);
    });
  }
  connect() {
    this.conn = this.peer.connect(PREFIX + this.code, { reliable: true });
    this.conn.on('open', () => { this.conn.send({ t: 'join', name: this.name, token: token() }); });
    this.conn.on('data', msg => {
      if (msg.t === 'welcome') { this.id = msg.id; this.h.onJoined(msg.id); }
      else if (msg.t === 'lobby') this.h.onLobby(msg.players, msg.code, msg.started);
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
