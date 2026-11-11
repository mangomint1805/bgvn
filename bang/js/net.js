// Lớp mạng BANG!: host giữ state + chạy engine, client chỉ gửi action. Kết nối dùng chung ở shared/net/room.js
import { createGame, applyAction, viewFor, topPrompt, current, alivePlayers, responseCards, getPlayer } from './engine.js?v=2';
export const TURN_TIME = 60, PROMPT_TIME = 20; // giây: hết giờ thì máy tự đánh thay (chống treo máy)
import { botAction } from './bot.js?v=2';
import { S } from './fx.js?v=2';
import { RoomHost, RoomClient, token, session } from '../../shared/net/room.js?v=8';
import { specBanner } from '../../shared/ui/spectate.js?v=1';
import { watch } from '../../shared/ui/stats.js?v=5';
import { isReact, hostLimiter, pickReact } from '../../shared/ui/react.js?v=2';
// Câu chọc riêng của BANG! (bảng thả emoji – shared/ui/react.js), mỗi câu ≤ 24 ký tự
export const BANG_PHRASES = ['Né đi cưng!', 'Bang bang 🔫', 'Uống Beer đi', 'Trật rồi nha!', 'Sếp ơi cứu!', 'Tui là Phó mà 😭', 'Gà quá!'];
const BOT_POOLS = { attack: ['Bang bang 🔫', 'Né đi cưng!', 'Trật rồi nha!'], hurt: ['Sếp ơi cứu!', 'Uống Beer đi'], win: ['Gà quá!', 'Bang bang 🔫'], reply: ['Né đi cưng!', 'Tui là Phó mà 😭'] };
const NS = 'bgvn-bang', PREFIX = 'bangvn-', GAME = 'bang';
const SNAP = 'bgvn-hostsnap-' + GAME;
export function loadSnapshot() { try { const d = JSON.parse(localStorage.getItem(SNAP)); return d && Date.now() - d.ts < 3 * 3600e3 ? d : null; } catch (e) { return null; } }
export { session };
const BOT_NAMES = ['Django', 'Clint', 'Tuco', 'Calamity', 'Doc', 'Billy', 'Wyatt', 'Jesse'];

// ======================= HOST =======================
export class Host {
  constructor(name, handlers, offline = false, restore = null) {
    this.h = watch(GAME, handlers, () => 'host'); // {onLobby(players, code), onState(view), onError(msg)}
    this.offline = offline;
    this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: true }];
    this.state = null;
    this.conns = new Map(); // peerId -> conn
    this.botTimer = null;
    this.lim = hostLimiter(); this.botReactAt = 0;
    if (restore) { // tải lại trang: dựng lại phòng cũ, mọi người tự vào lại
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || p.id === 'host' }));
      this.state = restore.state; this.code = restore.code;
    }
    if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.scheduleBots(); this.broadcast(); } }, 0); return; }
    this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
    this.code = this.room.code;
    setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 4000; this.scheduleBots(); this.broadcast(); } }, 0);
  }
  saveSnap() {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => { try { localStorage.setItem(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, players: this.players.map(({ conn, ...p }) => p), state: this.state })); } catch (e) {} }, 300);
  }
  attach(conn) {
    conn.on('data', msg => this.onMsg(conn, msg));
    conn.on('close', () => this.onLeave(conn));
    conn.on('error', () => this.onLeave(conn));
  }
  onMsg(conn, msg) {
    if (msg.t === 'join') {
      let p = this.players.find(x => x.token === msg.token && !x.isBot && x.id !== 'host');
      if (p) { // rejoin
        if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {}
        p.conn = conn; p.connected = true; p.name = msg.name || p.name;
      } else {
        if (this.players.length >= 7) { conn.send({ t: 'error', msg: 'Phòng đã đủ 7 người.' }); return; }
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: msg.name.slice(0, 16), isBot: false, token: msg.token, conn, connected: true };
        this.players.push(p);
      }
      this.conns.set(conn.peer, p);
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      this.pushLobby(); this.broadcast();
    } else if (msg.t === 'action') {
      const p = this.conns.get(conn.peer); if (!p) return;
      this.inGame(p.id) && this.act(p.id, msg.a);
    } else if (msg.t === 'react') {
      const p = this.conns.get(conn.peer); if (p) this.react(p.id, msg.e);
    } else if (msg.t === 'ping') conn.send({ t: 'pong' });
  }
  onLeave(conn) {
    const p = this.conns.get(conn.peer); if (!p) return;
    this.conns.delete(conn.peer);
    if (p.conn === conn) { p.conn = null; p.connected = false; }
    if (!this.inGame(p.id)) this.players = this.players.filter(x => x !== p);
    this.pushLobby();
  }
  inGame(id) { const s = this.state; return !s || !s.players || s.players.some(q => q.id === id); } // vào giữa ván: chỉ xem, ván sau mới chơi
  lobbyInfo() { return this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected })); }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code); this.saveSnap();
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
    this.pushLobby(); this.scheduleBots(); this.broadcast();
  }
  restart() { this.state = null; this.pushLobby(); for (const p of this.players) if (p.conn) p.conn.send({ t: 'state', view: null }); this.h.onState(null); }
  act(pid, a) {
    if (!this.state) return;
    const before = this.state.actSeq || 0;
    const r = applyAction(this.state, pid, a);
    if (r.ok) this.botReacts(before);
    if (!r.ok) { const p = this.players.find(x => x.id === pid); if (p && p.conn) p.conn.send({ t: 'error', msg: r.reason }); else if (pid === 'host') this.h.onError(r.reason); }
    this.scheduleBots(); this.broadcast();
  }
  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    for (const p of this.players) {
      const view = viewFor(this.state, p.id); if (!this.inGame(p.id)) view.spec = true;
      if (this.deadline) view.timer = { pid: this.deadline.pid, ms: Math.max(0, this.deadline.end - Date.now()) };
      if (p.id === 'host') this.h.onState(JSON.parse(JSON.stringify(view))); // bản sao: tránh dùng chung mảng với state
      else if (p.conn) try { p.conn.send({ t: 'state', view }); } catch (e) {}
    }
  }
  // Bot và người mất kết nối: tự đánh
  scheduleBots() {
    clearTimeout(this.botTimer); this.deadline = null;
    if (!this.state || this.state.phase !== 'playing') return;
    const s = this.state; const pr = topPrompt(s);
    const pid = pr ? pr.player : current(s).id;
    const p = this.players.find(x => x.id === pid);
    if (!p) return;
    const run = (a, ms) => { this.botTimer = setTimeout(() => { const x = a(); if (x) this.act(pid, x); else this.scheduleBots(); }, ms); };
    if (p.isBot) { run(() => botAction(this.state, pid), Math.max(Math.round(1150 * S()), (this.graceUntil || 0) - Date.now())); return; }
    // không có lá né/đáp trả thì tự chịu đòn luôn, khỏi chờ
    if (pr && pr.type === 'respond' && !responseCards(getPlayer(s, pid), pr.kind).length) { run(() => ({ type: 'take_hit' }), Math.round(1200 * S())); return; }
    // đồng hồ đếm giờ: hết giờ thì tự đánh thay (lượt chính thì kết thúc lượt)
    const ms = (!p.connected && pid !== 'host') ? 20000 : (pr ? PROMPT_TIME : TURN_TIME) * 1000;
    this.deadline = { pid, end: Date.now() + ms };
    run(() => {
      const st = this.state; if (!st) return null;
      const tp = topPrompt(st);
      if (tp && tp.player === pid) return botAction(st, pid);
      if (!tp && current(st).id === pid) { if (st.step === 'play') return { type: 'end_turn' }; return botAction(st, pid); }
      return null;
    }, ms);
  }
  // ---- thả emoji / chọc nhau: chủ phòng lọc rồi phát lại cho cả bàn ----
  react(from, e) {
    if (this.dead || !isReact(e, BANG_PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
    const msg = { t: 'react', e, from };
    for (const p of this.players) if (p.conn) try { p.conn.send(msg); } catch (x) {}
    this.h.onReact && this.h.onReact(msg);
    const sender = this.players.find(p => p.id === from);
    if (sender && !sender.isBot && Math.random() < 0.3) this.botSay(null, 'reply', 900 + Math.random() * 900);
    return true;
  }
  botSay(pid, mood, delay = 1000) {
    const now = Date.now(); if (now < this.botReactAt) return;
    const alive = id => { const q = this.state && this.state.players.find(x => x.id === id); return q && (q.alive || mood === 'win'); };
    const bots = this.players.filter(p => p.isBot && (!pid || p.id === pid) && alive(p.id));
    if (!bots.length) return;
    this.botReactAt = now + 6000;
    const b = bots[Math.floor(Math.random() * bots.length)];
    setTimeout(() => { if (!this.dead && this.state) this.react(b.id, pickReact(mood, BOT_POOLS)); }, delay);
  }
  // bot thỉnh thoảng chọc khi bắn trúng / bị trúng / thắng (đọc nhật ký có cấu trúc s.acts)
  botReacts(before) {
    const s = this.state; if (!s) return;
    const isBot = id => (this.players.find(p => p.id === id) || {}).isBot;
    if (s.phase === 'ended') { const w = s.players.find(p => p.alive && isBot(p.id) && (s.winner === 'law' ? ['sheriff', 'deputy'].includes(p.role) : p.role === s.winner)); if (w && Math.random() < 0.6) this.botSay(w.id, 'win', 1800); return; }
    for (const e of (s.acts || []).filter(x => x.id > before && x.to && x.by)) {
      if (e.res === 'hit' && isBot(e.to) && Math.random() < 0.3) this.botSay(e.to, 'hurt', 1300 + Math.random() * 700);
      else if (e.res === 'hit' && isBot(e.by) && Math.random() < 0.2) this.botSay(e.by, 'attack', 900 + Math.random() * 600);
      else if (e.res === 'missed' && isBot(e.to) && Math.random() < 0.3) this.botSay(e.to, 'reply', 900);
    }
  }
  destroy() { this.dead = true; clearTimeout(this.botTimer); clearTimeout(this.snapT); this.room && this.room.destroy(); }
  // rời phòng hẳn (không tự khôi phục khi tải lại)
  leave() { this.destroy(); try { localStorage.removeItem(SNAP); } catch (e) {} session.clear(GAME); }
}

// ======================= CLIENT =======================
export class Client {
  constructor(code, name, handlers) {
    this.h = watch(GAME, handlers, () => this.id); this.code = code.toUpperCase().trim(); this.name = name; this.id = null;
    this.room = new RoomClient({
      ns: NS, prefix: PREFIX, code: this.code, joinMsg: () => ({ name: this.name }),
      onStatus: (t, k) => { this.h.onNet && this.h.onNet(t, k, () => this.room.retryNow()); this.h.onStatus && k !== 'ok' && this.h.onStatus(t); },
      onFail: m => { this.h.onError(m); session.clear(GAME); },
      onWelcome: id => { this.id = id; session.save(GAME, { role: 'client', code: this.code, name: this.name }); this.h.onJoined(id); },
      onLost: () => this.h.onDisconnect(),
      onMsg: msg => {
        if (msg.t === 'lobby') this.h.onLobby(msg.players, msg.code, msg.started);
        else if (msg.t === 'state') { specBanner(!!(msg.view && msg.view.spec)); this.h.onState(msg.view); }
        else if (msg.t === 'error') this.h.onError(msg.msg);
        else if (msg.t === 'react') this.h.onReact && this.h.onReact(msg);
        else if (msg.t === 'kicked') { this.h.onError('Bạn đã bị mời ra khỏi phòng.'); this.leave(); }
      },
    });
  }
  act(a) { this.room.send({ t: 'action', a }); }
  react(e) { this.room.send({ t: 'react', e }); }
  destroy() { this.room.destroy(); }
  leave() { this.destroy(); session.clear(GAME); }
}
