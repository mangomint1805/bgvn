// Lớp mạng Xì dách: chủ phòng giữ state, người vào chỉ gửi action. Kết nối dùng chung shared/net/room.js
import { createGame, applyAction, viewFor, waitingOn, nextRound, seatPlayers, getP, cleanOpts, DEFAULT_OPTS, OPT_CHOICES, MAX_PLAYERS, canBeg } from './engine.js?v=2';
import { botAction } from './bot.js?v=1';
import { RoomHost, RoomClient, token, session } from '../../shared/net/room.js?v=5';
import { specBanner } from '../../shared/ui/spectate.js?v=1';
import { watch } from '../../shared/ui/stats.js?v=3';
import { isReact, hostLimiter, pickReact } from '../../shared/ui/react.js?v=2';
import { rulesFor } from '../../shared/rules.js?v=1';
// ⚙️ Luật mặc định khi tạo phòng mới: lấy từ luat-mac-dinh.js (gốc repo); giá trị sai/thiếu → giữ luật gốc trong code
const CFG = rulesFor('xidach', (({ caiId, ...o }) => o)(DEFAULT_OPTS), { ...OPT_CHOICES });
// Câu chọc riêng của Xì dách (≤ 24 ký tự)
export const XD_PHRASES = ['Xét tui đi cái ơi!', 'Non quá cái ơi 🍼', 'Quắc chưa? 😏', 'Dằn non hả 🤨', 'Hên thôi 😎', 'Tất tay luôn!', 'Toang rồi 😭', 'Cứu tui'];
const BOT_POOLS = { attack: ['Quắc chưa? 😏', 'Non quá cái ơi 🍼'], hurt: ['Toang rồi 😭', 'Cứu tui'], win: ['Hên thôi 😎'], reply: ['Quắc chưa? 😏', 'Hên thôi 😎', 'Dằn non hả 🤨'] };
const NS = 'bgvn-xidach', PREFIX = 'bgvn-xidach-', GAME = 'xidach';
const SNAP = 'bgvn-hostsnap-' + GAME;
export function loadSnapshot() { try { const d = JSON.parse(localStorage.getItem(SNAP)); return d && Date.now() - d.ts < 3 * 3600e3 ? d : null; } catch (e) { return null; } }
export { session };
const BOT_NAMES = ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Mochi', 'Pudding'];
export const MAX = MAX_PLAYERS;
export const BET_TIME = 25;   // giây đặt cược
const AWAY_MS = 6000;         // người rớt mạng: máy làm thay sau 6 giây
const NEXT_MS = 15000;        // hết ván: tự sang ván mới (khi có khách online)
const HB_MS = 2500, STALL_MS = 8000;
const FB_V = '10.12.2';
const fbMods = () => Promise.all([import(`https://www.gstatic.com/firebasejs/${FB_V}/firebase-app.js`), import(`https://www.gstatic.com/firebasejs/${FB_V}/firebase-database.js`)]);
let speedK = () => 1;
export function setSpeedFn(f) { speedK = f; }

export class Host {
  constructor(name, handlers, offline = false, restore = null) {
    this.h = watch(GAME, handlers, () => 'host'); this.offline = offline;
    this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: true }];
    this.state = null; this.conns = new Map(); this.timers = {}; this.clock = null; this.graceUntil = 0;
    this.hs = Math.random().toString(36).slice(2, 8);
    this.opts = { ...DEFAULT_OPTS, ...CFG, caiId: CFG.caiMode === 'fixed' ? 'host' : null }; this.chips = {}; // chip giữ lại khi về sảnh rồi chơi tiếp
    if (!restore && CFG.caiMode === 'bot') { this.addBot(true); this.opts.caiId = this.players[this.players.length - 1].id; } // luật mặc định "bot làm cái": có sẵn 1 bot ngồi cái
    this.lim = hostLimiter(); this.botReactAt = 0;
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || p.id === 'host' }));
      this.state = restore.state; this.code = restore.code; this.opts = cleanOpts(restore.opts || this.opts); this.chips = restore.chips || {};
    }
    if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 1200; this.schedule(); this.broadcast(); } }, 0); return; }
    this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
    this.code = this.room.code;
    this.hb = setInterval(() => this.heartbeat(), HB_MS);
    setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 4000; this.schedule(); this.broadcast(); } }, 0);
  }
  saveSnap() {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => { try { localStorage.setItem(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, opts: this.opts, chips: this.chips, players: this.players.map(({ conn, ...p }) => p), state: this.state })); } catch (e) {} }, 300);
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
      if (p) { if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {} p.conn = conn; p.connected = true; }
      else {
        if (this.players.length >= MAX) { conn.send({ t: 'error', msg: `Phòng đã đủ ${MAX} người.` }); return; }
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), isBot: false, token: msg.token, conn, connected: true };
        this.players.push(p);
      }
      this.conns.set(conn, p);
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      this.pushLobby();
      if (this.state) { this.schedule(); this.broadcast(); }
    } else if (msg.t === 'action') {
      const p = this.conns.get(conn); if (p && p.conn === conn) this.inGame(p.id) && this.act(p.id, msg.a);
    } else if (msg.t === 'react') {
      const p = this.conns.get(conn); if (p && p.conn === conn) this.react(p.id, msg.e);
    } else if (msg.t === 'sync') {
      const p = this.conns.get(conn); if (!p || p.conn !== conn) return;
      if (this.state) this.sendState(p); else conn.send({ t: 'lobby', info: this.lobbyInfo(), code: this.code, started: false });
    }
  }
  onLeave(conn) {
    const p = this.conns.get(conn); if (!p) return;
    this.conns.delete(conn);
    if (p.conn !== conn) return;
    p.conn = null; p.connected = false;
    if (!this.inGame(p.id)) this.players = this.players.filter(x => x !== p);
    this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); }
  }
  inGame(id) { const s = this.state; return !s || !s.players || s.players.some(q => q.id === id); } // vào giữa ván: chỉ xem, ván sau mới chơi
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected, chips: this.chips[p.id] })), opts: this.opts }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state); this.saveSnap();
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  setOpt(k, v) {
    if (this.state) return;
    if (k === 'caiId') { // chọn người làm cái cố định
      const p = this.players.find(x => x.id === v); if (!p) return;
      this.opts.caiId = v; if (!(p.isBot && this.opts.caiMode === 'bot')) this.opts.caiMode = 'fixed';
      this.pushLobby(); return;
    }
    if (!(k in OPT_CHOICES) || !OPT_CHOICES[k].includes(v)) return;
    this.opts[k] = v;
    if (k === 'startChips') this.chips = {}; // đổi vốn: ai cũng về vạch xuất phát
    if (k === 'caiMode' && v === 'bot') { // bot làm cái: chưa có bot thì thêm một bot
      let b = this.players.find(p => p.isBot && p.id === this.opts.caiId) || this.players.find(p => p.isBot);
      if (!b && this.players.length < MAX) { this.addBot(true); b = this.players[this.players.length - 1]; }
      if (b) this.opts.caiId = b.id;
    }
    if (k === 'caiMode' && v === 'fixed' && !this.players.some(p => p.id === this.opts.caiId)) this.opts.caiId = 'host';
    this.pushLobby();
  }
  addBot(silent = false) {
    if (this.state || this.players.length >= MAX) return;
    const used = this.players.map(p => p.name.replace(' 🤖', '').trim().toLowerCase());
    const nm = BOT_NAMES.find(n => !used.includes(n.toLowerCase())) || 'Bot' + this.players.length;
    this.players.push({ id: 'bot' + Math.random().toString(36).slice(2, 7), name: nm + ' 🤖', isBot: true, token: null, conn: null, connected: true });
    if (!silent) this.pushLobby();
  }
  removePlayer(id) {
    if (this.state) return;
    const p = this.players.find(x => x.id === id); if (!p || p.id === 'host') return;
    if (p.conn) try { p.conn.send({ t: 'kicked' }); p.conn.close(); } catch (e) {}
    this.players = this.players.filter(x => x !== p);
    if (this.opts.caiId === id) { this.opts.caiId = null; if (this.opts.caiMode === 'bot') this.setOpt('caiMode', 'bot'); }
    this.pushLobby();
  }
  resetChips() { if (this.state) return; this.chips = {}; this.pushLobby(); }
  start() {
    if (this.players.length < 2) { this.h.onError('Cần ít nhất 2 người (thêm bot nhé).'); return; }
    if (this.opts.caiMode === 'bot' && !this.players.some(p => p.isBot)) { this.h.onError('Chế độ bot làm cái cần ít nhất 1 bot.'); return; }
    this.clearTimers();
    this.state = createGame(this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, chips: this.chips[p.id] })), this.opts);
    this.graceUntil = Date.now() + 900;
    this.pushLobby(); this.schedule(); this.broadcast();
  }
  // về sảnh: giữ lại chip để chơi tiếp
  restart() {
    this.clearTimers();
    if (this.state) for (const p of this.state.players) this.chips[p.id] = p.chips;
    this.state = null; this.clock = null; this.pushLobby();
    for (const p of this.players) if (p.conn) this.sendRaw(p, null);
    this.h.onState(null);
  }
  next() { const s = this.state; if (!s || s.phase !== 'end') return; const b = s.evN; seatPlayers(s, this.players.filter(p => p.connected && !this.inGame(p.id)).map(p => ({ id: p.id, name: p.name, isBot: p.isBot, chips: this.chips[p.id] }))); nextRound(s); this.afterChange(b); this.pushLobby(); }
  act(pid, a) {
    const s = this.state; if (!s) return;
    if (a && a.type === 'next') { if (pid === 'host') this.next(); return; }
    const before = s.evN;
    const r = applyAction(s, pid, a);
    if (!r.ok) { this.tell(pid, r.reason); return; }
    this.afterChange(before);
  }
  tell(pid, m) { const p = this.players.find(x => x.id === pid); if (p && p.conn) try { p.conn.send({ t: 'error', msg: m }); } catch (e) {} else if (pid === 'host') this.h.onError(m); }
  afterChange(before) {
    const s = this.state;
    const evs = s.ev.filter(e => e.n > before);
    let wait = 0;
    for (const e of evs) wait = Math.max(wait, e.k === 'deal' ? 1700 : e.k === 'special' ? 2200 : e.k === 'reveal' ? 900 : e.k === 'caibust' ? 1600 : e.k === 'hit' ? 650 : e.k === 'round' ? 700 : 0);
    if (wait) this.graceUntil = Math.max(this.graceUntil, Date.now() + wait * speedK());
    this.schedule(); this.broadcast();
    this.botReacts(evs);
  }
  // ---- thả emoji / chọc nhau ----
  react(from, e) {
    if (this.dead || !isReact(e, XD_PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
    const msg = { t: 'react', e, from };
    for (const p of this.players) if (p.conn) try { p.conn.send(msg); } catch (x) {}
    this.h.onReact && this.h.onReact(msg);
    const sender = this.players.find(p => p.id === from);
    if (sender && !sender.isBot && Math.random() < 0.3) this.botSay(null, 'reply', 900 + Math.random() * 900);
    return true;
  }
  botSay(pid, mood, delay = 1000) {
    const now = Date.now(); if (now < this.botReactAt) return;
    const bots = this.players.filter(p => p.isBot && (!pid || p.id === pid));
    if (!bots.length) return;
    this.botReactAt = now + 6000;
    const b = bots[Math.floor(Math.random() * bots.length)];
    setTimeout(() => { if (!this.dead && this.state) this.react(b.id, pickReact(mood, BOT_POOLS)); }, delay * speedK());
  }
  botReacts(evs) {
    const isBot = id => (this.players.find(p => p.id === id) || {}).isBot;
    for (const e of evs) {
      if (e.k === 'special' && isBot(e.pid) && Math.random() < 0.5) { this.botSay(e.pid, 'win', 1500); return; }
      if (e.k === 'caibust' && Math.random() < 0.5) { this.botSay(isBot(e.pid) && Math.random() < 0.5 ? e.pid : null, isBot(e.pid) ? 'hurt' : 'attack', 1700); return; }
      if (e.k === 'reveal' && isBot(e.pid) && Math.abs(e.delta) >= 2 * this.state.opts.minBet && Math.random() < 0.3) { this.botSay(e.pid, e.delta > 0 ? 'win' : 'hurt', 1100); return; }
    }
  }
  clearTimers() { for (const k of Object.keys(this.timers)) clearTimeout(this.timers[k]); this.timers = {}; }
  isAuto(pid) { const p = this.players.find(x => x.id === pid); return !p || p.isBot; }
  isAway(pid) { const p = this.players.find(x => x.id === pid); return p && !p.isBot && !p.connected && pid !== 'host'; }
  // hẹn giờ: bot, người rớt mạng, đồng hồ AFK, tự sang ván
  schedule() {
    this.clearTimers(); this.clock = null;
    const s = this.state; if (!s) return;
    const now = Date.now(), grace = Math.max(0, this.graceUntil - now);
    if (s.phase === 'end') {
      const guests = this.players.some(p => !p.isBot && p.id !== 'host' && p.connected);
      if (guests) {
        this.clock = { kind: 'next', end: now + grace + NEXT_MS, total: NEXT_MS };
        this.timers.next = setTimeout(() => this.next(), grace + NEXT_MS);
      }
      return;
    }
    const w = waitingOn(s); if (!w.length) return;
    const seq = s.seq;
    if (s.phase === 'bet') {
      let k = 0, humans = [];
      for (const pid of w) {
        if (this.isAuto(pid) || this.isAway(pid)) {
          const d = this.isAway(pid) ? AWAY_MS : (500 + (k++) * 350 + Math.random() * 700) * speedK();
          this.timers['b' + pid] = setTimeout(() => this.auto(pid, false), grace + d);
        } else humans.push(pid);
      }
      // nhà cái hết chip: tự xin mẹ để ván không bị kẹt
      const C = getP(s, s.caiId); if (C && canBeg(s, C) && (this.isAuto(C.id) || this.isAway(C.id))) this.timers.cb = setTimeout(() => this.act(C.id, { type: 'beg' }), grace + 300);
      if (humans.length) {
        const total = BET_TIME * 1000;
        if (this.betKey !== s || this.betSeq !== s.round) { this.betEnd = now + grace + total; this.betKey = s; this.betSeq = s.round; }
        this.clock = { kind: 'bet', end: this.betEnd, total, pids: humans };
        this.timers.afk = setTimeout(() => { for (const pid of humans) this.auto(pid, true); }, Math.max(0, this.betEnd - now));
      }
      return;
    }
    const pid = w[0];
    if (this.isAuto(pid) || this.isAway(pid)) {
      const d = this.isAway(pid) ? AWAY_MS : (s.phase === 'dealer' ? 1100 + Math.random() * 600 : 800 + Math.random() * 700) * speedK();
      this.timers.bot = setTimeout(() => { if (this.state && this.state.seq === seq) this.auto(pid, false); }, grace + d);
      if (this.isAway(pid)) this.clock = { kind: 'turn', pid, end: now + grace + d, total: d };
      return;
    }
    const total = (s.phase === 'dealer' ? s.opts.turnTime + 15 : s.opts.turnTime) * 1000;
    this.clock = { kind: 'turn', pid, end: now + grace + total, total };
    this.timers.afk = setTimeout(() => { const st = this.state; if (st && st.seq === seq) { this.tell(pid, '⏰ Hết giờ – máy làm giùm bạn nha!'); this.auto(pid, true); } }, grace + total);
  }
  // máy làm thay (bot hoặc người treo máy). Người treo máy: đặt cược mức thấp nhất
  auto(pid, afk) {
    const s = this.state; if (!s) return;
    const p = getP(s, pid); if (!p) return;
    if (s.phase === 'bet' && afk && !p.betDone) {
      if (canBeg(s, p)) applyAction(s, pid, { type: 'beg' });
      this.act(pid, { type: 'bet', amount: s.opts.minBet }); return;
    }
    const a = botAction(s, pid);
    if (a) { this.act(pid, a); if (a.type === 'beg' && this.state && this.state.phase === 'bet') this.auto(pid, afk); }
    else this.schedule();
  }
  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    const clock = this.clockOut();
    for (const p of this.players) {
      if (p.id === 'host') this.h.onState(this.viewOf(p, clock));
      else if (p.conn) this.sendRaw(p, this.viewOf(p, clock));
    }
  }
  clockOut() { return this.clock ? { kind: this.clock.kind, pid: this.clock.pid, pids: this.clock.pids, ms: Math.max(0, this.clock.end - Date.now()), total: this.clock.total } : null; }
  viewOf(p, clock = this.clockOut()) {
    const view = viewFor(this.state, p.id); if (!this.inGame(p.id)) view.spec = true; view.clock = clock;
    view.away = this.players.filter(q => !q.isBot && !q.connected && q.id !== 'host').map(q => q.id);
    return p.id === 'host' ? JSON.parse(JSON.stringify(view)) : view;
  }
  sendRaw(p, view) { p.bc = (p.bc || 0) + 1; try { p.conn.send({ t: 'state', view, hs: this.hs, bc: p.bc }); } catch (e) {} }
  sendState(p) { if (p.conn && this.state) this.sendRaw(p, this.viewOf(p)); }
  heartbeat() {
    if (this.dead) return;
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'ping', hs: this.hs, bc: p.bc || 0, started: !!this.state }); } catch (e) {}
    this.fbPresence();
  }
  fbPresence() {
    const fb = this.room && this.room.fb; if (this.presOn || !fb || !fb.F || !fb.room) return;
    this.presOn = true; const F = fb.F;
    const fix = () => { if (!this.dead) { F.update(fb.room, { alive: Date.now() }).catch(() => {}); F.onDisconnect(fb.room).remove(); } };
    this.presOffs = [
      F.onValue(F.ref(F.db, '.info/connected'), s => { if (s.val()) fix(); }),
      F.onValue(F.child(fb.room, 'alive'), s => { if (!s.exists()) fix(); }),
    ];
  }
  destroy() { this.dead = true; clearInterval(this.hb); (this.presOffs || []).forEach(f => { try { f(); } catch (e) {} }); this.clearTimers(); clearTimeout(this.snapT); this.room && this.room.destroy(); }
  leave() { this.destroy(); try { localStorage.removeItem(SNAP); } catch (e) {} session.clear(GAME); }
}

export class Client {
  constructor(code, name, handlers) {
    this.h = watch(GAME, handlers, () => this.id); this.code = code.toUpperCase().trim(); this.name = name; this.id = null;
    this.hs = null; this.bc = 0; this.joined = false; this.lastRx = Date.now();
    this.makeRoom();
    this.wd = setInterval(() => this.watch(), 2000);
  }
  makeRoom() {
    const tag = this.tag = {};
    this.room = new RoomClient({
      ns: NS, prefix: PREFIX, code: this.code, joinMsg: () => ({ name: this.name }),
      onStatus: (t, k) => { if (tag !== this.tag) return; this.h.onNet && this.h.onNet(t, k, () => this.room.retryNow()); },
      onFail: m => { if (tag !== this.tag) return; this.h.onError(m); session.clear(GAME); },
      onWelcome: id => { if (tag !== this.tag) return; this.id = id; this.joined = true; this.lastRx = Date.now(); session.save(GAME, { role: 'client', code: this.code, name: this.name }); this.h.onJoined(id); this.watchFb(); },
      onLost: () => { if (tag !== this.tag) return; this.joined = false; this.h.onDisconnect(); },
      onMsg: msg => { if (tag === this.tag) this.onMsg(msg); },
    });
  }
  onMsg(msg) {
    this.lastRx = Date.now();
    if (msg.t === 'state') {
      specBanner(!!(msg.view && msg.view.spec));
      if (msg.hs && msg.hs === this.hs && msg.bc <= this.bc) return;
      if (msg.hs) { this.hs = msg.hs; this.bc = msg.bc; }
      this.h.onState(msg.view);
    } else if (msg.t === 'ping') {
      if (msg.started && (msg.hs !== this.hs || msg.bc > this.bc)) this.room.send({ t: 'sync' });
    } else if (msg.t === 'lobby') this.h.onLobby(msg.info, msg.code, msg.started);
    else if (msg.t === 'react') this.h.onReact && this.h.onReact(msg);
    else if (msg.t === 'error') this.h.onError(msg.msg);
    else if (msg.t === 'kicked') { this.h.onError('Bạn đã bị mời ra khỏi phòng.'); this.leave(); }
  }
  watch() { if (!this.dead && this.joined && Date.now() - this.lastRx > STALL_MS) this.reconnect(); }
  reconnect() {
    if (this.dead) return;
    this.joined = false; this.lastRx = Date.now();
    const old = this.room; this.makeRoom(); try { old.destroy(); } catch (e) {}
    this.h.onNet && this.h.onNet('Đang nối lại phòng…', 'wait');
  }
  async watchFb() {
    if (this.fbOff !== undefined) return; this.fbOff = null;
    try {
      const [app, d] = await fbMods(); if (this.dead || !app.getApps().length) return;
      let was = null;
      this.fbOff = d.onValue(d.ref(d.getDatabase(app.getApp()), '.info/connected'), s => {
        const c = !!s.val();
        if (was === false && c && this.room.mode && this.room.mode() === 'fb' && this.room.id) this.reconnect();
        was = c;
      });
    } catch (e) {}
  }
  act(a) { this.room.send({ t: 'action', a }); }
  react(e) { this.room.send({ t: 'react', e }); }
  destroy() { this.dead = true; clearInterval(this.wd); try { this.fbOff && this.fbOff(); } catch (e) {} this.room.destroy(); }
  leave() { this.destroy(); session.clear(GAME); }
}
