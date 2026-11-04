// Lớp mạng Cờ cá ngựa: host giữ state (luật + xúc xắc do host quyết định), client chỉ gửi action.
// Kết nối dùng chung shared/net/room.js (Firebase → PeerJS → MQTT), tự vào lại khi tải trang.
import { createGame, applyAction, viewFor, actorOf, P } from './engine.js?v=3';
import { botAction } from './bot.js?v=3';
import { S } from './fx.js?v=2';
import { RoomHost, RoomClient, token, session } from '../../shared/net/room.js?v=2';
import { isReact, hostLimiter, pickReact } from '../../shared/ui/react.js?v=2';
const NS = 'bgvn-cangua', PREFIX = 'bgvn-cangua-', GAME = 'cangua', SNAP = 'bgvn-hostsnap-' + GAME;
export { session };
export const MAX = 4;
// Câu chọc (shared/ui/react.js, mỗi câu ≤ 24 ký tự)
export const CANGUA_PHRASES = ['Về chuồng đi cưng 🐴💨', 'Đá nè! 🦶', 'Xin cái đôi 🙏', 'Né ra coi!', 'Đừng đá tui 😭', 'Ngựa tui về đích!', 'Gà quá!', 'GG'];
const BOT_POOLS = { attack: ['Về chuồng đi cưng 🐴💨', 'Đá nè! 🦶'], hurt: ['Đừng đá tui 😭', 'Cứu tui'], win: ['Ngựa tui về đích!'], reply: ['Gà quá!', 'Né ra coi!', 'Xin cái đôi 🙏'] };
const BOT_NAMES = ['Tiến', 'Tuni', 'Thành', 'Khiêm', 'Thái', 'Minto'];
export function loadSnapshot() { try { const d = JSON.parse(localStorage.getItem(SNAP)); return d && Date.now() - d.ts < 3 * 3600e3 ? d : null; } catch (e) { return null; } }
// thời gian hoạt ảnh ước lượng (để bot / đồng hồ chờ người xem kịp)
export function animTime(evs) {
  let ms = 0;
  for (const e of evs) {
    if (e.t === 'roll') ms += 1500;
    else if (e.t === 'move') ms += Math.min(e.path.length, 14) * 210 + 300 + (e.auto ? 750 : 0); // + xem trước điểm đến khi máy tự đi
    else if (e.t === 'out') ms += 800 + (e.auto ? 750 : 0);
    else if (e.t === 'kick') ms += 1300;
    else if (e.t === 'finish') ms += 1500;
    else if (e.t === 'nomove' || e.t === 'triple') ms += 700;
    else if (e.t === 'win') ms += 600;
    else ms += 150;
  }
  return ms * S();
}
const OPT_OK = { dice: [1, 2], moveMode: ['total', 'split'], exit2: ['d16', 'any6'], exit1: ['6', '16'], noJump: [true, false], homeRule: ['thru', 'vn', 'count'], dblHalf: [true, false], dblUp: [true, false], winRule: ['top4', 'home'], triple: [true, false], playOn: [true, false], turnTime: [0, 15, 30, 45], botLevel: ['easy', 'normal', 'hard'] };

export class Host {
  constructor(me, handlers, offline = false, restore = null) {
    this.h = handlers; this.offline = offline;
    this.players = [{ id: 'host', name: me.name, isBot: false, token: token(), conn: null, connected: true }];
    this.state = null; this.conns = new Map(); this.timer = null; this.afk = null;
    this.lim = hostLimiter(); this.botReactAt = 0;
    this.opts = { dice: 2, moveMode: 'total', exit2: 'd16', exit1: '6', noJump: true, homeRule: 'thru', dblHalf: true, dblUp: true, winRule: 'top4', triple: false, playOn: false, turnTime: offline ? 0 : 30, botLevel: 'normal' };
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || p.id === 'host' }));
      this.state = restore.state; this.code = restore.code; this.opts = { ...this.opts, ...(restore.opts || {}) };
      // phòng lưu từ trước bản luật nhà mới: ván đang chơi giữ luật cũ (state.opts), ván sau dùng mặc định mới
      if (restore.opts && !('dblHalf' in restore.opts)) Object.assign(this.opts, { homeRule: 'thru', dblHalf: true });
    }
    if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.schedule(1500); this.broadcast(); } }, 0); return; }
    this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
    this.code = this.room.code;
    setTimeout(() => { this.pushLobby(); if (this.state) { this.schedule(4000); this.broadcast(); } }, 0);
  }
  controlled() { return ['host']; }
  saveSnap() {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => { try { localStorage.setItem(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, opts: this.opts, players: this.players.map(({ conn, ...p }) => p), state: this.state })); } catch (e) {} }, 300);
  }
  attach(conn) { conn.on('data', msg => this.onMsg(conn, msg)); conn.on('close', () => this.onLeave(conn)); conn.on('error', () => this.onLeave(conn)); }
  onMsg(conn, msg) {
    if (!msg) return;
    if (msg.t === 'join') {
      let p = this.players.find(x => x.token === msg.token && !x.isBot && x.id !== 'host');
      if (p) { if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {} p.conn = conn; p.connected = true; if (!this.state) p.name = String(msg.name || p.name).slice(0, 16); }
      else {
        if (this.state) { conn.send({ t: 'error', msg: 'Ván đang diễn ra, không thể vào.' }); return; }
        if (this.players.length >= MAX) { conn.send({ t: 'error', msg: `Phòng đã đủ ${MAX} người.` }); return; }
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), isBot: false, token: msg.token, conn, connected: true };
        this.players.push(p);
      }
      this.conns.set(conn.peer, p);
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      this.pushLobby(); if (this.state) { this.schedule(1000); this.broadcast(); }
    } else if (msg.t === 'action') { const p = this.conns.get(conn.peer); if (p) this.act(p.id, msg.a); }
    else if (msg.t === 'react') { const p = this.conns.get(conn.peer); if (p) this.react(p.id, msg.e); }
    else if (msg.t === 'profile' && !this.state) { const p = this.conns.get(conn.peer); if (p) { p.name = String(msg.name || p.name).slice(0, 16); this.pushLobby(); } }
  }
  onLeave(conn) {
    const p = this.conns.get(conn.peer); if (!p) return;
    this.conns.delete(conn.peer);
    if (p.conn === conn) { p.conn = null; p.connected = false; }
    if (!this.state) this.players = this.players.filter(x => x !== p);
    this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); }
  }
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected })), opts: this.opts }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state); this.saveSnap();
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  setProfile(me) { const p = this.players[0]; if (this.state) return; p.name = me.name; this.pushLobby(); }
  setOpt(k, v) { if (this.state || !(k in OPT_OK) || !OPT_OK[k].includes(v)) return; this.opts[k] = v; this.pushLobby(); }
  addBot() {
    if (this.state || this.players.length >= MAX) return;
    const used = this.players.map(p => p.name.replace(' 🤖', ''));
    const nm = BOT_NAMES.find(n => !used.includes(n)) || 'Máy ' + this.players.length;
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
    const order = this.players.map(p => ({ p, r: Math.random() })).sort((a, b) => a.r - b.r).map(x => x.p);
    this.state = createGame(order.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })), this.opts);
    this.pushLobby(); this.schedule(1800); this.broadcast();
  }
  restart() { clearTimeout(this.timer); clearTimeout(this.afk); this.state = null; this.pushLobby(); for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'state', view: null }); } catch (e) {} this.h.onState(null); }
  act(pid, a, auto = false) {
    if (!this.state) return;
    if (!auto && !this.players.find(p => p.id === pid)) return;
    const before = this.state.evn;
    const r = applyAction(this.state, pid, a && a.force ? { ...a, force: undefined } : a); // client không được ép xúc xắc
    if (!r.ok) { if (auto) return; const p = this.players.find(x => x.id === pid); if (p && p.conn) p.conn.send({ t: 'error', msg: r.reason }); else this.h.onError(r.reason); return; }
    const evs = this.state.ev.filter(e => e.n > before), wait = animTime(evs);
    this.schedule(wait); this.broadcast();
    try { this.botReacts(evs, wait); } catch (e) {}
  }
  react(from, e) {
    if (this.dead || !isReact(e, CANGUA_PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
    const msg = { t: 'react', e, from };
    for (const p of this.players) if (p.conn) try { p.conn.send(msg); } catch (x) {}
    this.h.onReact && this.h.onReact(msg);
    const sender = this.players.find(p => p.id === from);
    if (sender && !sender.isBot && Math.random() < 0.3) this.botSay(null, pickReact('reply', BOT_POOLS), 900 + Math.random() * 900);
    return true;
  }
  botSay(pid, e, delay = 1000) {
    const now = Date.now(); if (now < this.botReactAt || !this.state) return;
    const bots = this.players.filter(p => p.isBot && (!pid || p.id === pid));
    if (!bots.length) return;
    this.botReactAt = now + 6000;
    const b = bots[Math.floor(Math.random() * bots.length)];
    setTimeout(() => { if (!this.dead && this.state) this.react(b.id, e); }, delay);
  }
  botReacts(evs, wait) {
    const isBot = id => !!(this.players.find(p => p.id === id) || {}).isBot, d = () => wait + 300 + Math.random() * 600;
    for (const e of evs) {
      if (e.t === 'win') { if (isBot(e.pid) && Math.random() < 0.7) this.botSay(e.pid, pickReact('win', BOT_POOLS), d()); return; }
      if (e.t === 'kick') {
        if (isBot(e.pid) && Math.random() < 0.45) return this.botSay(e.pid, pickReact('attack', BOT_POOLS), d());
        if (isBot(e.vic) && Math.random() < 0.45) return this.botSay(e.vic, pickReact('hurt', BOT_POOLS), d());
      }
      if (e.t === 'nomove' && !isBot(e.pid) && Math.random() < 0.12) return this.botSay(null, Math.random() < 0.5 ? '😂' : 'Gà quá!', d());
    }
  }
  deadline() { return this.afkAt ? Math.max(0, this.afkAt - Date.now()) : 0; }
  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    const v = viewFor(this.state); v.controlled = this.controlled();
    v.away = this.players.filter(p => !p.isBot && p.id !== 'host' && !p.connected).map(p => p.id);
    this.h.onState(v, this.deadline());
    for (const p of this.players) if (p.conn) { const pv = viewFor(this.state); pv.controlled = [p.id]; pv.away = v.away; try { p.conn.send({ t: 'state', view: pv, tmo: this.deadline() }); } catch (e) {} }
  }
  schedule(wait = 0) {
    clearTimeout(this.timer); clearTimeout(this.afk); this.afkAt = 0;
    const s = this.state; if (!s || s.phase !== 'playing') return;
    const pid = actorOf(s), p = this.players.find(x => x.id === pid); if (!p) return;
    const away = !p.isBot && p.id !== 'host' && !p.connected;
    const go = () => { if (!this.state || actorOf(this.state) !== pid) return; const a = botAction(this.state, pid, p.isBot ? this.opts.botLevel : 'normal'); if (a) this.act(pid, a, true); };
    if (p.isBot) { this.timer = setTimeout(go, wait + (450 + Math.random() * 400) * S()); return; }
    if (away) { this.timer = setTimeout(go, wait + 3000); return; }
    const tt = +this.opts.turnTime || 0;
    if (tt > 0 && !this.offline) { const ms = wait + tt * 1000; this.afkAt = Date.now() + ms; this.afk = setTimeout(() => { this.h.onAfk && this.h.onAfk(pid); go(); }, ms); }
  }
  destroy() { this.dead = true; clearTimeout(this.timer); clearTimeout(this.afk); clearTimeout(this.snapT); this.room && this.room.destroy(); }
  leave() { this.destroy(); try { localStorage.removeItem(SNAP); } catch (e) {} session.clear(GAME); }
}

export class Client {
  constructor(code, me, handlers) {
    this.h = handlers; this.code = code.toUpperCase().trim(); this.me = me; this.id = null;
    this.room = new RoomClient({
      ns: NS, prefix: PREFIX, code: this.code, joinMsg: () => ({ name: this.me.name }),
      onStatus: (t, k) => { this.h.onNet && this.h.onNet(t, k, () => this.room.retryNow()); },
      onFail: m => { this.h.onError(m); session.clear(GAME); this.h.onFail && this.h.onFail(); },
      onWelcome: id => { this.id = id; session.save(GAME, { role: 'client', code: this.code, name: this.me.name }); this.h.onJoined(id); },
      onLost: () => this.h.onDisconnect(),
      onMsg: msg => {
        if (msg.t === 'lobby') this.h.onLobby(msg.info, msg.code, msg.started);
        else if (msg.t === 'state') this.h.onState(msg.view, msg.tmo);
        else if (msg.t === 'error') this.h.onError(msg.msg);
        else if (msg.t === 'react') this.h.onReact && this.h.onReact(msg);
        else if (msg.t === 'kicked') { this.h.onError('Bạn đã bị mời ra khỏi phòng.'); this.leave(); this.h.onFail && this.h.onFail(); }
      },
    });
  }
  setProfile(me) { this.me = me; this.room.send({ t: 'profile', name: me.name }); }
  act(a) { this.room.send({ t: 'action', a }); }
  react(e) { this.room.send({ t: 'react', e }); }
  destroy() { this.room.destroy(); }
  leave() { this.destroy(); session.clear(GAME); }
}
export { P };
