// Lớp mạng Tiến Lên: chủ phòng giữ state, người vào chỉ gửi action. Kết nối dùng chung shared/net/room.js
import { createGame, applyAction, viewFor, current, mustAutoPass, VE_HEO, DEFAULT_OPTS, BETS, TURN_TIMES, START_CHIPS } from './engine.js?v=5';
import { botAction, LEVELS } from './bot.js?v=5';
import { RoomHost, RoomClient, token, session } from '../../shared/net/room.js?v=9';
import { specBanner } from '../../shared/ui/spectate.js?v=1';
import { watch } from '../../shared/ui/stats.js?v=8';
import { isReact, hostLimiter, pickReact } from '../../shared/ui/react.js?v=2';
import { rulesFor } from '../../shared/rules.js?v=1';
// ⚙️ Luật mặc định khi tạo phòng mới: lấy từ luat-mac-dinh.js (gốc repo); giá trị sai/thiếu → giữ luật gốc trong code
const B2 = [true, false];
const CFG = rulesFor('tienlen', { ...DEFAULT_OPTS, botLevel: 'normal' }, { bet: BETS, toiTrang: B2, thoiHang: B2, chatChong: B2, spadeEvery: B2, turnTime: TURN_TIMES, veHeo: Object.keys(VE_HEO), botLevel: ['easy', 'normal', 'hard'] });
const NS = 'bgvn-tienlen', PREFIX = 'bgvn-tienlen-', GAME = 'tienlen';
const SNAP = 'bgvn-hostsnap-' + GAME;
export function loadSnapshot() { try { const d = JSON.parse(localStorage.getItem(SNAP)); return d && Date.now() - d.ts < 3 * 3600e3 ? d : null; } catch (e) { return null; } }
export { session };
const BOT_NAMES = ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa'];
export const MAX = 4;
export const AWAY_MS = 6000;
export const AUTO_PASS_MS = 800; // nhịp chờ trước khi tự bỏ lượt (người thật hết bài đè)   // người rớt mạng: máy đánh thay sau 6 giây
export const BEG_LIMIT = b => Math.max(100, 5 * b); // dưới mức này mới được "xin mẹ"
// câu chọc riêng Tiến Lên (≤ 24 ký tự)
export const TL_PHRASES = ['Chặt heo nè! 🔪', 'Heo đâu ra đây?', 'Bỏ lượt đi bé', 'Cóng chưa? 🥶', 'Hàng nóng 🔥', 'Run chưa?', 'Cứu tui'];
const BOT_POOLS = { attack: ['Chặt heo nè! 🔪', 'Hàng nóng 🔥'], hurt: ['Cứu tui', 'Heo đâu ra đây?'], win: ['Run chưa?'], reply: ['Bỏ lượt đi bé', 'Cóng chưa? 🥶'] };

export class Host {
  constructor(name, handlers, offline = false, restore = null) {
    this.h = watch(GAME, handlers, () => 'host'); this.offline = offline;
    this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: true }];
    this.state = null; this.conns = new Map(); this.botTimer = null;
    { const { botLevel, ...o } = CFG; this.opts = o; }
    this.chips = { host: START_CHIPS }; this.minted = 0; this.lastWinner = null; this.gameNo = 0; this.before = null;
    this.lim = hostLimiter(); this.botReactAt = 0;
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || p.id === 'host' }));
      this.state = restore.state; this.code = restore.code; this.opts = { ...this.opts, ...(restore.opts || {}) };
      this.chips = restore.chips || this.chips; this.minted = restore.minted || 0; this.lastWinner = restore.lastWinner || null; this.gameNo = restore.gameNo || 0; this.before = restore.before || null; this.settled = !!restore.settled;
    }
    if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 1200; this.schedule(); this.broadcast(); } }, 0); return; }
    this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
    this.code = this.room.code;
    setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 4000; this.schedule(); this.broadcast(); } }, 0);
  }
  saveSnap() { clearTimeout(this.snapT); this.snapT = setTimeout(() => this.saveNow(), 300); }
  saveNow() {
    clearTimeout(this.snapT); if (this.dead) return;
    { try { localStorage.setItem(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, opts: this.opts, chips: this.chips, minted: this.minted, lastWinner: this.lastWinner, gameNo: this.gameNo, before: this.before, settled: this.settled, players: this.players.map(({ conn, ...p }) => p), state: this.state })); } catch (e) {} }
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
      if (p) { if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {} p.conn = conn; p.connected = true; p.name = msg.name ? String(msg.name).slice(0, 16) : p.name; }
      else {
        if (this.players.length >= MAX) { conn.send({ t: 'error', msg: `Phòng đã đủ ${MAX} người.` }); return; }
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), isBot: false, token: msg.token, conn, connected: true };
        this.players.push(p);
        if (this.chips[p.id] == null) this.chips[p.id] = START_CHIPS;
      }
      this.conns.set(conn, p);
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      if (this.state) { this.sendState(p); this.schedule(); }
      this.pushLobby();
    } else if (msg.t === 'action') {
      const p = this.conns.get(conn); if (p && p.conn === conn) this.inGame(p.id) && this.act(p.id, msg.a);
    } else if (msg.t === 'react') {
      const p = this.conns.get(conn); if (p && p.conn === conn) this.react(p.id, msg.e);
    } else if (msg.t === 'beg') {
      const p = this.conns.get(conn); if (p && p.conn === conn) this.beg(p.id);
    }
  }
  onLeave(conn) {
    const p = this.conns.get(conn); if (!p) return;
    this.conns.delete(conn);
    if (p.conn !== conn) return; // kết nối cũ đóng sau khi người đó đã vào lại
    p.conn = null; p.connected = false;
    if (!this.inGame(p.id)) this.players = this.players.filter(x => x !== p);
    this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); }
  }
  inGame(id) { const s = this.state; return !s || !s.players || s.players.some(q => q.id === id); } // vào giữa ván: chỉ xem, ván sau mới chơi
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, level: p.level, connected: p.connected, chips: this.chips[p.id] ?? START_CHIPS })), opts: this.opts, gameNo: this.gameNo }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state); this.saveSnap();
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  setOpt(k, v) {
    if (this.state || !(k in DEFAULT_OPTS)) return;
    if (k === 'bet') { if (!BETS.includes(+v)) return; v = +v; }
    else if (k === 'turnTime') { if (!TURN_TIMES.includes(+v)) return; v = +v; }
    else if (k === 'veHeo') { if (!(v in VE_HEO)) return; }
    else v = !!v;
    this.opts[k] = v; this.pushLobby();
  }
  addBot() {
    if (this.state || this.players.length >= MAX) return;
    const used = this.players.map(p => p.name.replace(' 🤖', '').trim().toLowerCase());
    const nm = BOT_NAMES.find(n => !used.includes(n.toLowerCase())) || 'Bot' + this.players.length;
    const id = 'bot' + Math.random().toString(36).slice(2, 7);
    this.players.push({ id, name: nm + ' 🤖', isBot: true, level: CFG.botLevel, token: null, conn: null, connected: true });
    if (this.chips[id] == null) this.chips[id] = START_CHIPS;
    this.pushLobby();
  }
  setBotLevel(id, lvl) { const p = this.players.find(x => x.id === id && x.isBot); if (!p || !LEVELS[lvl]) return; p.level = lvl; this.pushLobby(); }
  removePlayer(id) {
    if (this.state) return;
    const p = this.players.find(x => x.id === id); if (!p || p.id === 'host') return;
    if (p.conn) try { p.conn.send({ t: 'kicked' }); p.conn.close(); } catch (e) {}
    this.players = this.players.filter(x => x !== p); this.pushLobby();
  }
  // hết chip thì xin mẹ – chip ảo, chơi vui
  beg(pid) {
    const p = this.players.find(x => x.id === pid); if (!p) return;
    const lim = BEG_LIMIT(this.opts.bet);
    if ((this.chips[pid] ?? 0) >= lim) { this.note(pid, `Còn ${this.chips[pid]} chip mà xin gì nữa 😤 (dưới ${lim} mới xin được)`, true); return; }
    this.chips[pid] += START_CHIPS; this.minted += START_CHIPS;
    if (this.before && this.before[pid] != null) this.before[pid] += START_CHIPS;
    this.noteAll(`🥺 ${p.name.replace(' 🤖', '')} xin mẹ thêm ${START_CHIPS} chip. Mẹ cho rồi đó, chơi từ từ thôi!`);
    this.pushLobby(); this.broadcast();
  }
  note(pid, msg, err = false) { const p = this.players.find(x => x.id === pid); if (!p) return; if (pid === 'host') (err ? this.h.onError : this.h.onNote)(msg); else if (p.conn) try { p.conn.send({ t: err ? 'error' : 'note', msg }); } catch (e) {} }
  noteAll(msg) { this.h.onNote(msg); for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'note', msg }); } catch (e) {} }
  start() {
    if (this.players.length < 2) { this.h.onError('Cần ít nhất 2 người (thêm bot nhé).'); return; }
    // bot hết chip thì tự xin mẹ
    for (const p of this.players) {
      if (this.chips[p.id] == null) this.chips[p.id] = START_CHIPS;
      if (p.isBot && this.chips[p.id] < BEG_LIMIT(this.opts.bet)) { this.chips[p.id] += START_CHIPS; this.minted += START_CHIPS; }
    }
    const starter = this.players.some(p => p.id === this.lastWinner) ? this.lastWinner : null;
    this.state = createGame(this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })), { ...this.opts, starter, firstGame: this.gameNo === 0 || !starter });
    this.state.gameNo = this.gameNo + 1;
    this.before = Object.fromEntries(this.players.map(p => [p.id, this.chips[p.id]]));
    this.settled = false;
    this.graceUntil = Date.now() + 2200;
    this.afterChange(0);
  }
  restart() { clearTimeout(this.botTimer); this.state = null; this.deadline = null; this.pushLobby(); for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'state', view: null }); } catch (e) {} this.h.onState(null); }
  act(pid, a) {
    const s = this.state; if (!s) return;
    const before = s.fxN;
    const r = applyAction(s, pid, a);
    if (!r.ok) { this.note(pid, r.reason, true); this.broadcastTo(pid); return; }
    this.afterChange(before);
  }
  afterChange(before) {
    const s = this.state;
    const evs = s.fx.filter(e => e.id > before);
    let wait = 0;
    for (const e of evs) wait = Math.max(wait, e.k === 'chop' ? 2300 : e.k === 'toitrang' ? 2500 : e.k === 'round' ? 700 : e.k === 'finish' ? 1100 : 0);
    if (wait) this.graceUntil = Math.max(this.graceUntil || 0, Date.now() + wait);
    if (s.phase === 'ended' && !this.settled) {
      for (const p of this.players) this.chips[p.id] = (this.before[p.id] ?? START_CHIPS) + (s.delta[p.id] || 0);
      this.settled = true; this.lastWinner = s.winner; this.gameNo++;
      this.pushLobby();
    }
    this.botReacts(evs);
    this.schedule(); this.broadcast();
  }
  viewOf(pid) {
    const v = viewFor(this.state, pid); if (!this.inGame(pid)) v.spec = true;
    if (this.deadline) v.timer = { pid: this.deadline.pid, ms: Math.max(0, this.deadline.end - Date.now()), total: this.deadline.total };
    v.before = this.before; v.chips = this.chips; v.settled = !!this.settled;
    v.levels = Object.fromEntries(this.players.filter(p => p.isBot).map(p => [p.id, p.level || 'normal']));
    v.away = this.players.filter(p => !p.isBot && !p.connected).map(p => p.id);
    return v;
  }
  sendState(p) { if (p.conn) try { p.conn.send({ t: 'state', view: this.viewOf(p.id) }); } catch (e) {} }
  broadcastTo(pid) { const p = this.players.find(x => x.id === pid); if (!p || !this.state) return; if (pid === 'host') this.h.onState(this.viewOf('host')); else this.sendState(p); }
  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    for (const p of this.players) { if (p.id === 'host') this.h.onState(this.viewOf('host')); else this.sendState(p); }
  }
  schedule() {
    clearTimeout(this.botTimer); this.deadline = null;
    const s = this.state; if (!s || s.phase !== 'playing') return;
    const cur = current(s), p = this.players.find(x => x.id === cur.id); if (!p) return;
    const wait = Math.max(0, (this.graceUntil || 0) - Date.now());
    const run = lvl => { const st = this.state; if (!st || st.phase !== 'playing' || current(st).id !== p.id) return; const a = botAction(st, p.id, lvl); if (a) this.act(p.id, a); };
    if (p.isBot) { this.botTimer = setTimeout(() => run(p.level || 'normal'), wait + 750 + Math.random() * 650); return; }
    // người thật tới lượt chặn mà không có bài đè/chặt được → tự bỏ lượt sau một nhịp ngắn
    if (mustAutoPass(s, p.id)) {
      this.botTimer = setTimeout(() => {
        const st = this.state; if (!st || current(st).id !== p.id || !mustAutoPass(st, p.id)) return;
        this.note(p.id, 'Không có bài đè được – tự bỏ lượt 😶');
        this.act(p.id, { type: 'pass' });
      }, wait + AUTO_PASS_MS);
      return;
    }
    if (!p.connected && p.id !== 'host') { this.botTimer = setTimeout(() => run('normal'), wait + AWAY_MS); return; }
    // đồng hồ chống treo máy: hết giờ thì máy đánh thay
    const ms = (this.opts.turnTime || 30) * 1000;
    this.deadline = { pid: p.id, end: Date.now() + wait + ms, total: ms };
    this.botTimer = setTimeout(() => run('normal'), wait + ms);
  }
  // ---- thả emoji / chọc nhau: chủ phòng lọc rồi phát lại ----
  react(from, e) {
    if (this.dead || !isReact(e, TL_PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
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
    setTimeout(() => { if (!this.dead && this.state) this.react(b.id, pickReact(mood, BOT_POOLS)); }, delay);
  }
  botReacts(evs) {
    const isBot = id => (this.players.find(p => p.id === id) || {}).isBot;
    for (const e of evs) {
      if (e.k === 'chop') { if (isBot(e.to) && Math.random() < 0.6) this.botSay(e.to, 'hurt', 1800); else if (isBot(e.from) && Math.random() < 0.5) this.botSay(e.from, 'attack', 1500); }
      else if (e.k === 'end' && isBot(e.from) && Math.random() < 0.5) this.botSay(e.from, 'win', 1700);
      else if (e.k === 'cong' && isBot(e.to) && Math.random() < 0.5) this.botSay(e.to, 'attack', 1400);
    }
  }
  destroy() { this.dead = true; clearTimeout(this.botTimer); clearTimeout(this.snapT); this.room && this.room.destroy(); }
  leave() { this.destroy(); try { localStorage.removeItem(SNAP); } catch (e) {} session.clear(GAME); }
}

export class Client {
  constructor(code, name, handlers) {
    this.h = watch(GAME, handlers, () => this.id); this.code = code.toUpperCase().trim(); this.name = name; this.id = null;
    this.room = new RoomClient({
      ns: NS, prefix: PREFIX, code: this.code, joinMsg: () => ({ name: this.name }),
      onStatus: (t, k) => { this.h.onNet && this.h.onNet(t, k, () => this.room.retryNow()); },
      onFail: m => { this.h.onError(m); session.clear(GAME); },
      onWelcome: id => { this.id = id; session.save(GAME, { role: 'client', code: this.code, name: this.name }); this.h.onJoined(id); },
      onLost: () => this.h.onDisconnect(),
      onMsg: msg => {
        if (msg.t === 'lobby') this.h.onLobby(msg.info, msg.code, msg.started);
        else if (msg.t === 'state') { specBanner(!!(msg.view && msg.view.spec)); this.h.onState(msg.view); }
        else if (msg.t === 'error') this.h.onError(msg.msg);
        else if (msg.t === 'note') this.h.onNote(msg.msg);
        else if (msg.t === 'react') this.h.onReact && this.h.onReact(msg);
        else if (msg.t === 'kicked') { this.h.onError('Bạn đã bị mời ra khỏi phòng.'); this.leave(); this.h.onKicked && this.h.onKicked(); }
      },
    });
  }
  act(a) { this.room.send({ t: 'action', a }); }
  react(e) { this.room.send({ t: 'react', e }); }
  beg() { this.room.send({ t: 'beg' }); }
  destroy() { this.room.destroy(); }
  leave() { this.destroy(); session.clear(GAME); }
}
