// Lớp mạng Mèo Nổ: chủ phòng giữ state, người vào chỉ gửi action. Kết nối dùng chung shared/net/room.js
import { createGame, applyAction, viewFor, resolveWindow, waitingOn, getPlayer, DEFAULT_OPTS } from './engine.js?v=7';
import { botAction, botNope } from './bot.js?v=7';
import { RoomHost, RoomClient, token, session } from '../../shared/net/room.js?v=2';
import { isReact, hostLimiter, pickReact } from '../../shared/ui/react.js?v=2';
import { rulesFor } from '../../shared/rules.js?v=1';
// ⚙️ Luật mặc định khi tạo phòng mới: lấy từ luat-mac-dinh.js (gốc repo); giá trị sai/thiếu → giữ luật gốc trong code
const B2 = [true, false];
const CFG = rulesFor('meono', DEFAULT_OPTS, { turnTime: [30, 45, 60, 90], expansion: B2, chaos: B2 });
// Câu chọc kiểu mèo cho bảng thả emoji (shared/ui/react.js), mỗi câu ≤ 24 ký tự
export const MEO_PHRASES = ['Bốc đi bé!', 'ĐÉO nhé!', 'Meo meo 😼', 'Bom đâu rồi?', 'Hú hồn 😮‍💨', 'Đổ vỏ nè!', 'Cứu tui'];
const BOT_POOLS = { attack: ['Bốc đi bé!', 'Đổ vỏ nè!', 'Meo meo 😼'], hurt: ['Cứu tui', 'Hú hồn 😮‍💨'], win: ['Meo meo 😼'], reply: ['Meo meo 😼', 'Bom đâu rồi?'], nope: ['ĐÉO nhé!'] };
const NS = 'bgvn-meono', PREFIX = 'bgvn-meono-', GAME = 'meono';
const SNAP = 'bgvn-hostsnap-' + GAME;
export function loadSnapshot() { try { const d = JSON.parse(localStorage.getItem(SNAP)); return d && Date.now() - d.ts < 3 * 3600e3 ? d : null; } catch (e) { return null; } }
export { session };
const BOT_NAMES = ['Mai', 'An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Mochi', 'Bơ'];
export const MAX = 8;
export const WINDOW_MS = 3000;     // cửa sổ ĐÉO! khi có người thật
const WINDOW_BOT_MS = 1100;        // chỉ có bot quan tâm
const PENDING_MS = 25000;          // chọn chỗ nhét bom / chọn lá cho / xếp lại
const AWAY_MS = 7000;              // người rớt mạng: bot đánh thay sau 7 giây
// Chống "kẹt im lặng": chủ phòng gửi nhịp tim, người vào thấy im quá lâu thì tự nối lại; lệch số thứ tự thì xin gửi lại state.
const HB_MS = 2500, STALL_MS = 8000;
const FB_V = '10.12.2'; // phải trùng phiên bản trong shared/net/fbrelay.js để dùng chung 1 kết nối Firebase
const fbMods = () => Promise.all([import(`https://www.gstatic.com/firebasejs/${FB_V}/firebase-app.js`), import(`https://www.gstatic.com/firebasejs/${FB_V}/firebase-database.js`)]);
let speedK = () => 1;
export function setSpeedFn(f) { speedK = f; }

export class Host {
  constructor(name, handlers, offline = false, restore = null) {
    this.h = handlers; this.offline = offline;
    this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: true }];
    this.state = null; this.conns = new Map(); this.timers = {}; this.clock = null; this.graceUntil = 0;
    this.hs = Math.random().toString(36).slice(2, 8); // mã phiên chủ phòng (đổi khi tải lại trang)
    this.opts = { ...CFG };
    this.lim = hostLimiter(); this.botReactAt = 0;
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || p.id === 'host' }));
      this.state = restore.state; this.code = restore.code; this.opts = restore.opts || this.opts;
    }
    if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 1500; this.schedule(); this.broadcast(); } }, 0); return; }
    this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
    this.code = this.room.code;
    this.hb = setInterval(() => this.heartbeat(), HB_MS);
    setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 4000; this.schedule(); this.broadcast(); } }, 0);
  }
  saveSnap() {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => { try { localStorage.setItem(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, opts: this.opts, players: this.players.map(({ conn, ...p }) => p), state: this.state })); } catch (e) {} }, 300);
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
      if (p) { if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {} p.conn = conn; p.connected = true; p.name = p.name || msg.name; }
      else {
        if (this.state) { conn.send({ t: 'error', msg: 'Ván đang diễn ra, chờ ván sau nhé.' }); return; }
        if (this.players.length >= MAX) { conn.send({ t: 'error', msg: `Phòng đã đủ ${MAX} người.` }); return; }
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), isBot: false, token: msg.token, conn, connected: true };
        this.players.push(p);
      }
      this.conns.set(conn, p);
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      this.pushLobby();
      if (this.state) { this.schedule(); this.broadcast(); }
    } else if (msg.t === 'action') {
      const p = this.conns.get(conn); if (p) this.act(p.id, msg.a);
    } else if (msg.t === 'react') {
      const p = this.conns.get(conn); if (p && p.conn === conn) this.react(p.id, msg.e); // "from" do chủ phòng gán theo kết nối
    } else if (msg.t === 'sync') {
      // người vào thấy mình lỡ mất state → gửi lại riêng cho họ
      const p = this.conns.get(conn); if (!p || p.conn !== conn) return;
      if (this.state) this.sendState(p); else conn.send({ t: 'lobby', info: this.lobbyInfo(), code: this.code, started: false });
    }
  }
  onLeave(conn) {
    const p = this.conns.get(conn); if (!p) return;
    this.conns.delete(conn);
    if (p.conn !== conn) return; // kết nối cũ đóng sau khi người đó đã vào lại bằng kết nối mới
    p.conn = null; p.connected = false;
    if (!this.state) this.players = this.players.filter(x => x !== p);
    this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); }
  }
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected })), opts: this.opts }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state); this.saveSnap();
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  setOpt(k, v) { if (this.state || !(k in this.opts)) return; this.opts[k] = typeof DEFAULT_OPTS[k] === 'boolean' ? !!v : +v; this.pushLobby(); }
  addBot() {
    if (this.state || this.players.length >= MAX) return;
    const used = this.players.map(p => p.name.replace(' 🤖', '').trim().toLowerCase());
    const nm = BOT_NAMES.find(n => !used.includes(n.toLowerCase())) || 'Bot' + this.players.length;
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
    this.clearTimers();
    this.state = createGame(this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })), this.opts);
    this.graceUntil = Date.now() + 2600 * speedK();
    this.pushLobby(); this.schedule(); this.broadcast();
  }
  restart() { this.clearTimers(); this.state = null; this.clock = null; this.pushLobby(); for (const p of this.players) if (p.conn) this.sendRaw(p, null); this.h.onState(null); }
  act(pid, a) {
    const s = this.state; if (!s) return;
    const before = s.evN;
    const r = applyAction(s, pid, a);
    if (!r.ok) { const p = this.players.find(x => x.id === pid); if (p && p.conn) p.conn.send({ t: 'error', msg: r.reason }); else if (pid === 'host') this.h.onError(r.reason); return; }
    this.afterChange(before);
  }
  afterChange(before) {
    const s = this.state;
    // chừa thời gian cho hoạt ảnh
    const evs = s.ev.filter(e => e.n > before);
    let wait = 0;
    for (const e of evs) wait = Math.max(wait, e.k === 'boom' ? 3400 : e.k === 'bomb' ? 1800 : e.k === 'defuse' ? 1200 : e.k === 'win' ? 1000 : 0);
    if (wait) this.graceUntil = Math.max(this.graceUntil, Date.now() + wait * speedK());
    this.schedule(); this.broadcast();
    this.botReacts(evs);
  }
  // ---- thả emoji / chọc nhau: chủ phòng lọc (hợp lệ + chống spam) rồi phát lại cho cả bàn ----
  react(from, e) {
    if (this.dead || !isReact(e, MEO_PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
    const msg = { t: 'react', e, from };
    for (const p of this.players) if (p.conn) try { p.conn.send(msg); } catch (x) {}
    this.h.onReact && this.h.onReact(msg);
    const sender = this.players.find(p => p.id === from);
    if (sender && !sender.isBot && Math.random() < 0.3) this.botSay(null, 'reply', 900 + Math.random() * 900);
    return true;
  }
  // bot chọc (pid null = bot ngẫu nhiên); tối đa 1 câu / 6 giây cho cả bàn
  botSay(pid, mood, delay = 1000) {
    const now = Date.now(); if (now < this.botReactAt) return;
    const bots = this.players.filter(p => p.isBot && (!pid || p.id === pid) && !(this.state && (getPlayer(this.state, p.id) || {}).out && mood !== 'hurt'));
    if (!bots.length) return;
    this.botReactAt = now + 6000;
    const b = bots[Math.floor(Math.random() * bots.length)];
    setTimeout(() => { if (!this.dead && this.state) this.react(b.id, pickReact(mood, BOT_POOLS)); }, delay * speedK());
  }
  botReacts(evs) {
    const isBot = id => (this.players.find(p => p.id === id) || {}).isBot;
    for (const e of evs) {
      if (e.k === 'win') { if (isBot(e.by) && Math.random() < 0.6) this.botSay(e.by, 'win', 1800); return; }
      if (e.k === 'boom') { if (isBot(e.by) && Math.random() < 0.5) this.botSay(e.by, 'hurt', 2600); else if (Math.random() < 0.35) this.botSay(null, 'attack', 3000); }
      else if (e.k === 'bomb' && isBot(e.by) && Math.random() < 0.35) this.botSay(e.by, 'hurt', 1600);
      else if (e.k === 'nope' && isBot(e.by) && Math.random() < 0.3) this.botSay(e.by, 'nope', 500);
      else if (e.k === 'play' && e.kind === 'attack' && isBot(e.by) && Math.random() < 0.25) this.botSay(e.by, 'attack', 700);
    }
  }
  clearTimers() { for (const k of Object.keys(this.timers)) clearTimeout(this.timers[k]); this.timers = {}; }
  isAuto(pid) { const p = this.players.find(x => x.id === pid); return !p || p.isBot; }
  isAway(pid) { const p = this.players.find(x => x.id === pid); return p && !p.isBot && !p.connected && pid !== 'host'; }
  humansWatching(s) { return s.players.filter(q => !q.out && !this.isAuto(q.id) && !this.isAway(q.id)); }
  // trung tâm hẹn giờ: cửa sổ ĐÉO!, bot, đồng hồ AFK
  schedule() {
    this.clearTimers(); this.clock = null;
    const s = this.state; if (!s || s.phase !== 'playing') return;
    const now = Date.now(), grace = Math.max(0, this.graceUntil - now);
    if (s.window) {
      const w = s.window, hs = this.humansWatching(s);
      const lone = hs.length === 1 && hs[0].id === w.last && !getPlayer(s, hs[0].id).hand.some(c => c.t === 'nope');
      const len = hs.length && !lone ? WINDOW_MS : WINDOW_BOT_MS;
      this.clock = { kind: 'window', id: w.id, end: now + grace + len, total: len };
      const wid = w.id;
      this.timers.win = setTimeout(() => { if (this.state && this.state.window && this.state.window.id === wid) { const b = this.state.evN; resolveWindow(this.state); this.afterChange(b); } }, grace + len);
      // bot cân nhắc ĐÉO!
      const bots = s.players.filter(q => !q.out && (this.isAuto(q.id) || this.isAway(q.id)) && botNope(s, q.id));
      if (bots.length) {
        const b = bots[Math.floor(Math.random() * bots.length)];
        this.timers.nope = setTimeout(() => { if (this.state && this.state.window && this.state.window.id === wid && botNope(this.state, b.id)) this.act(b.id, { type: 'nope' }); }, grace + Math.min(len - 250, 450 + Math.random() * (len * 0.6)));
      }
      return;
    }
    const pid = waitingOn(s); if (!pid) return;
    const auto = this.isAuto(pid), away = this.isAway(pid);
    if (auto || away) {
      const d = auto ? (s.pending ? 900 : 950 + Math.random() * 650) * speedK() : AWAY_MS;
      this.timers.bot = setTimeout(() => { const a = this.state && botAction(this.state, pid); if (a) this.act(pid, a); }, grace + d);
      if (away) this.clock = { kind: s.pending ? 'pending' : 'turn', end: now + grace + d, total: d };
      return;
    }
    // người thật: đồng hồ AFK
    const total = s.pending ? PENDING_MS : (s.opts.turnTime || 45) * 1000;
    this.clock = { kind: s.pending ? 'pending' : 'turn', end: now + grace + total, total };
    const seq = s.seq;
    this.timers.afk = setTimeout(() => {
      const st = this.state; if (!st || st.seq !== seq) return;
      const a = st.pending ? botAction(st, pid) : { type: 'draw' };
      if (a) { this.act(pid, a); const p = this.players.find(x => x.id === pid); const m = st.pending ? '⏰ Hết giờ – máy chọn giùm bạn.' : '⏰ Hết giờ – tự bốc giùm bạn!'; if (p && p.conn) p.conn.send({ t: 'error', msg: m }); else if (pid === 'host') this.h.onError(m); }
    }, grace + total);
  }
  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    const now = Date.now();
    const clock = this.clock ? { kind: this.clock.kind, ms: Math.max(0, this.clock.end - now), total: this.clock.total, id: this.clock.id } : null;
    for (const p of this.players) {
      if (p.id === 'host') this.h.onState(this.viewOf(p, clock));
      else if (p.conn) this.sendRaw(p, this.viewOf(p, clock));
    }
  }
  viewOf(p, clock) {
    const now = Date.now();
    if (clock === undefined) clock = this.clock ? { kind: this.clock.kind, ms: Math.max(0, this.clock.end - now), total: this.clock.total, id: this.clock.id } : null;
    const view = viewFor(this.state, p.id); view.clock = clock;
    view.away = this.players.filter(q => !q.isBot && !q.connected && q.id !== 'host').map(q => q.id);
    return p.id === 'host' ? JSON.parse(JSON.stringify(view)) : view;
  }
  // mỗi tin state đánh số tăng dần theo từng người (bc) + mã phiên (hs): người vào bỏ tin cũ/đến trễ
  sendRaw(p, view) { p.bc = (p.bc || 0) + 1; try { p.conn.send({ t: 'state', view, hs: this.hs, bc: p.bc }); } catch (e) {} }
  sendState(p) { if (p.conn && this.state) this.sendRaw(p, this.viewOf(p)); }
  heartbeat() {
    if (this.dead) return;
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'ping', hs: this.hs, bc: p.bc || 0, started: !!this.state }); } catch (e) {}
    this.fbPresence();
  }
  // Firebase: máy chủ có thể xoá phòng khi chủ phòng chập chờn mạng (onDisconnect) hoặc khi tab cũ đóng muộn → dựng lại "alive"
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
    this.h = handlers; this.code = code.toUpperCase().trim(); this.name = name; this.id = null;
    this.hs = null; this.bc = 0; this.joined = false; this.lastRx = Date.now();
    this.diag = { rx: 0, lastRx: 0, status: [], reconnects: 0, why: [], dropped: 0, syncs: 0 };
    this.makeRoom();
    this.wd = setInterval(() => this.watch(), 2000);
  }
  makeRoom() {
    const tag = this.tag = {}; // callback của phòng cũ (đã bỏ) không được đụng vào trạng thái
    this.room = new RoomClient({
      ns: NS, prefix: PREFIX, code: this.code, joinMsg: () => ({ name: this.name }),
      onStatus: (t, k) => { if (tag !== this.tag) return; this.diag.status.push([Date.now(), t]); if (this.diag.status.length > 30) this.diag.status.shift(); this.h.onNet && this.h.onNet(t, k, () => this.room.retryNow()); },
      onFail: m => { if (tag !== this.tag) return; this.h.onError(m); session.clear(GAME); },
      onWelcome: id => { if (tag !== this.tag) return; this.id = id; this.joined = true; this.lastRx = Date.now(); session.save(GAME, { role: 'client', code: this.code, name: this.name }); this.h.onJoined(id); this.watchFb(); },
      onLost: () => { if (tag !== this.tag) return; this.joined = false; this.h.onDisconnect(); },
      onMsg: msg => { if (tag === this.tag) this.onMsg(msg); },
    });
  }
  onMsg(msg) {
    this.lastRx = Date.now(); this.diag.rx++; this.diag.lastRx = this.lastRx; this.diag.lastT = msg.t;
    if (msg.t === 'state') {
      if (msg.hs && msg.hs === this.hs && msg.bc <= this.bc) { this.diag.dropped++; return; } // tin cũ đến trễ
      if (msg.hs) { this.hs = msg.hs; this.bc = msg.bc; }
      this.h.onState(msg.view);
    } else if (msg.t === 'ping') {
      // chủ phòng đã gửi state mới hơn cái mình có (tin bị rơi) → xin gửi lại
      if (msg.started && (msg.hs !== this.hs || msg.bc > this.bc)) { this.diag.syncs++; this.room.send({ t: 'sync' }); }
    } else if (msg.t === 'lobby') this.h.onLobby(msg.info, msg.code, msg.started);
    else if (msg.t === 'react') this.h.onReact && this.h.onReact(msg);
    else if (msg.t === 'error') this.h.onError(msg.msg);
    else if (msg.t === 'kicked') { this.h.onError('Bạn đã bị mời ra khỏi phòng.'); this.leave(); }
  }
  // đã vào phòng mà quá lâu không nghe gì (kể cả nhịp tim) → kết nối đã chết mà không ai báo: nối lại từ đầu
  watch() { if (!this.dead && this.joined && Date.now() - this.lastRx > STALL_MS) this.reconnect('im lặng ' + Math.round((Date.now() - this.lastRx) / 1000) + 's'); }
  reconnect(why) {
    if (this.dead) return;
    this.diag.reconnects++; this.diag.why.push(why); this.joined = false; this.lastRx = Date.now();
    const old = this.room; this.makeRoom(); try { old.destroy(); } catch (e) {}
    this.h.onNet && this.h.onNet('Đang nối lại phòng…', 'wait');
  }
  // Firebase rớt mạng thoáng qua: máy chủ đã báo chủ phòng là mình thoát (onDisconnect) dù trình duyệt tự nối lại êm → chủ động vào lại ngay
  async watchFb() {
    if (this.fbOff !== undefined) return; this.fbOff = null;
    try {
      const [app, d] = await fbMods(); if (this.dead || !app.getApps().length) return;
      let was = null;
      this.fbOff = d.onValue(d.ref(d.getDatabase(app.getApp()), '.info/connected'), s => {
        const c = !!s.val();
        if (was === false && c && this.room.mode && this.room.mode() === 'fb' && this.room.id) this.reconnect('firebase chập chờn');
        was = c;
      });
    } catch (e) {}
  }
  act(a) { this.room.send({ t: 'action', a }); }
  react(e) { this.room.send({ t: 'react', e }); }
  destroy() { this.dead = true; clearInterval(this.wd); try { this.fbOff && this.fbOff(); } catch (e) {} this.room.destroy(); }
  leave() { this.destroy(); session.clear(GAME); }
}
