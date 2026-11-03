// Lớp mạng Ma Sói: chủ phòng giữ state + đồng hồ quản trò, người vào chỉ gửi action. Kết nối dùng chung shared/net/room.js
import { createGame, applyAction, viewFor, actors, timeout, phaseMs, DEFAULT_OPTS, presetRoles, roleList, ROLES, MAX_PLAYERS, MIN_PLAYERS, P, isWolfRole } from './engine.js?v=3';
import { botAction, botDayPlan, botWolfLine, botGhostLine, botLastWords } from './bot.js?v=3';
import { RoomHost, RoomClient, token, session } from '../../shared/net/room.js';
const NS = 'bgvn-masoi', PREFIX = 'bgvn-masoi-', GAME = 'masoi';
const SNAP = 'bgvn-hostsnap-' + GAME;
export function loadSnapshot() { try { const d = JSON.parse(localStorage.getItem(SNAP)); return d && Date.now() - d.ts < 3 * 3600e3 ? d : null; } catch (e) { return null; } }
export { session };
const BOT_NAMES = ['Minto', 'Tiến', 'Tuni', 'Thành', 'Khiêm', 'Thái', 'Mochi', 'Bơ', 'Mít', 'Tôm', 'Bí', 'Cốm', 'Xoài', 'Ổi', 'Chè', 'Na'];
export const MAX = MAX_PLAYERS, MIN = MIN_PLAYERS;
const AWAY_MS = 8000;      // người rớt mạng: máy làm giùm sau 8 giây
const rnd = (a, b) => a + Math.random() * (b - a);

export class Host {
  constructor(name, handlers, offline = false, restore = null) {
    this.h = handlers; this.offline = offline;
    this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: true }];
    this.state = null; this.conns = new Map(); this.timers = {}; this.botT = {}; this.curPk = null; this.deadline = 0; this.total = 1; this.lastChat = {};
    this.opts = JSON.parse(JSON.stringify(DEFAULT_OPTS));
    this.tut = { seen: [], off: false }; this.paused = null; this.replayAt = null;
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || p.id === 'host' }));
      this.state = restore.state; this.code = restore.code; this.opts = restore.opts || this.opts;
      if (restore.tut) this.tut = restore.tut;
      if (restore.paused) this.paused = restore.paused; // tải lại lúc đang dừng (ván tập): vẫn dừng
    }
    if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); } }, 0); return; }
    this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
    this.code = this.room.code;
    setTimeout(() => { this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); } }, 0);
  }
  saveSnap() {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => { try { localStorage.setItem(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, opts: this.opts, tut: this.tut, paused: this.paused, players: this.players.map(({ conn, ...p }) => p), state: this.state })); } catch (e) {} }, 300);
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
        if (this.state) { conn.send({ t: 'error', msg: 'Ván đang diễn ra, chờ ván sau nhé.' }); return; }
        if (this.players.length >= MAX) { conn.send({ t: 'error', msg: `Phòng đã đủ ${MAX} người.` }); return; }
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), isBot: false, token: msg.token, conn, connected: true };
        this.players.push(p);
      }
      this.conns.set(conn.peer, p);
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      this.pushLobby();
      if (this.state) { this.schedule(); this.broadcast(); }
    } else if (msg.t === 'action') {
      const p = this.conns.get(conn.peer); if (p) this.act(p.id, msg.a);
    }
  }
  onLeave(conn) {
    const p = this.conns.get(conn.peer); if (!p) return;
    this.conns.delete(conn.peer);
    if (p.conn === conn) { p.conn = null; p.connected = false; }
    if (!this.state) this.players = this.players.filter(x => x !== p);
    this.pushLobby(); if (this.state) { this.schedule(); this.broadcast(); }
  }
  effRoles() { return this.opts.auto ? presetRoles(this.players.length) : this.opts.roles; }
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected })), opts: { ...this.opts, roles: this.effRoles() } }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state); this.saveSnap();
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  setOpt(k, v) {
    if (this.state || !(k in DEFAULT_OPTS) || k === 'roles') return;
    const d = DEFAULT_OPTS[k];
    if (k === 'auto' && !v) this.opts.roles = presetRoles(this.players.length);
    this.opts[k] = typeof d === 'boolean' ? !!v : typeof d === 'number' ? Math.max(10, Math.min(600, +v || d)) : String(v);
    this.pushLobby();
  }
  // bộ vai đã lưu của hội: đặt lại vai + luật
  applyPreset(roles, opts = {}) {
    if (this.state || !roles) return;
    const clean = {};
    for (const [r, n] of Object.entries(roles)) if (ROLES[r] && r !== 'villager') { const v = Math.max(0, Math.min(r === 'wolf' ? 6 : 1, n | 0)); if (v) clean[r] = v; }
    this.opts.auto = false; this.opts.roles = clean;
    for (const [k, v] of Object.entries(opts || {})) if (k in DEFAULT_OPTS && !['roles', 'auto', 'tutorial'].includes(k)) {
      const d = DEFAULT_OPTS[k]; this.opts[k] = typeof d === 'boolean' ? !!v : typeof d === 'number' ? Math.max(10, Math.min(600, +v || d)) : String(v);
    }
    this.pushLobby();
  }
  setRole(r, n) {
    if (this.state || !ROLES[r] || r === 'villager') return;
    if (this.opts.auto) { this.opts.roles = presetRoles(this.players.length); this.opts.auto = false; }
    const max = r === 'wolf' ? 6 : 1;
    this.opts.roles = { ...this.opts.roles, [r]: Math.max(0, Math.min(max, n | 0)) };
    if (!this.opts.roles[r]) delete this.opts.roles[r];
    this.pushLobby();
  }
  addBot(n = 1) {
    if (this.state) return;
    for (let i = 0; i < n && this.players.length < MAX; i++) {
      const used = this.players.map(p => p.name.replace(' 🤖', '').trim().toLowerCase());
      const nm = BOT_NAMES.find(x => !used.includes(x.toLowerCase())) || 'Bot' + this.players.length;
      this.players.push({ id: 'bot' + Math.random().toString(36).slice(2, 7), name: nm + ' 🤖', isBot: true, token: null, conn: null, connected: true });
    }
    this.pushLobby();
  }
  removePlayer(id) {
    if (this.state) return;
    const p = this.players.find(x => x.id === id); if (!p || p.id === 'host') return;
    if (p.conn) try { p.conn.send({ t: 'kicked' }); p.conn.close(); } catch (e) {}
    this.players = this.players.filter(x => x !== p); this.pushLobby();
  }
  start(extra = {}) {
    const rl = roleList(this.players.length, this.effRoles());
    if (!rl.ok) { this.h.onError(rl.reason); return; }
    this.clearTimers(); this.paused = null; this.replayAt = null;
    // vai được chia ngẫu nhiên trong createGame
    this.state = createGame(this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })), { ...this.opts, roles: this.effRoles(), ...extra });
    this.curPk = null;
    this.pushLobby(); this.schedule(); this.broadcast();
  }
  // 🎓 Ván tập: offline, 6 người (bạn + 5 bot), vai cơ bản, bạn luôn có vai có phép để học
  startTutorial() {
    if (!this.offline) return;
    this.players = this.players.filter(p => p.id === 'host');
    this.addBot(5);
    this.opts = { ...JSON.parse(JSON.stringify(DEFAULT_OPTS)), auto: false, roles: { wolf: 1, seer: 1, guard: 1, witch: 1 }, reveal: true, dayTime: 180, voteTime: 60, nightTime: 45, tutorial: true };
    this.tut = { seen: [], off: false };
    const mine = ['seer', 'guard', 'witch', 'wolf'][Math.floor(Math.random() * 4)];
    this.start({ forceRole: { host: mine } });
  }
  tutSeen(key) { if (!this.tut.seen.includes(key)) this.tut.seen.push(key); this.saveSnap(); }
  tutOff() { this.tut.off = true; this.saveSnap(); }
  // dừng đồng hồ (chỉ ván offline – lúc bong bóng hướng dẫn đang mở)
  pause(on) {
    const s = this.state; if (!this.offline || !s || s.phase === 'ended') { this.paused = null; return; }
    if (on && !this.paused) {
      this.paused = { pk: s.pk, left: Math.max(1500, this.deadline - Date.now()) };
      this.clearTimers(); this.broadcast();
    } else if (!on && this.paused) {
      const pz = this.paused; this.paused = null;
      if (s.pk === pz.pk && this.curPk === s.pk) {
        const pk = s.pk; this.deadline = Date.now() + pz.left;
        this.later('phase', pz.left, () => { if (this.state.pk === pk) { timeout(this.state); this.schedule(); this.broadcast(); } });
        this.phaseExtras(s, this.humansAlive(s)); // bot nói chuyện / chỉ điểm lại (hẹn giờ cũ đã bị huỷ lúc dừng)
      } else this.curPk = null;
      this.schedule(); this.broadcast();
    }
  }
  // chủ phòng bấm ⏩ Bỏ phiếu sớm
  earlyVote() { const s = this.state; if (!s || s.phase !== 'day') return; timeout(s); this.schedule(); this.broadcast(); }
  // xem lại cuối ván: chủ phòng chiếu trang nào thì cả hội theo trang đó
  setReplay(i) { if (!this.state || this.state.phase !== 'ended') return; this.replayAt = i == null ? null : { i: i | 0, n: ((this.replayAt && this.replayAt.n) || 0) + 1 }; this.broadcast(); }
  restart() { this.clearTimers(); this.state = null; this.curPk = null; this.paused = null; this.replayAt = null; this.opts.tutorial = false; this.pushLobby(); for (const p of this.players) if (p.conn) p.conn.send({ t: 'state', view: null }); this.h.onState(null); }
  tell(pid, m) { const p = this.players.find(x => x.id === pid); if (p && p.conn) p.conn.send({ t: 'error', msg: m }); else if (pid === 'host') this.h.onError(m); }
  act(pid, a) {
    const s = this.state; if (!s) return;
    if (a && a.type === 'early') { if (pid === 'host') this.earlyVote(); else this.tell(pid, 'Chỉ chủ phòng mới cho bỏ phiếu sớm.'); return; }
    if (a && a.type === 'chat') { // chống spam
      const now = Date.now(); if (now - (this.lastChat[pid] || 0) < 600) { this.tell(pid, 'Từ từ thôi, gõ chậm lại chút 😅'); return; }
      this.lastChat[pid] = now;
    }
    const r = applyAction(s, pid, a);
    if (!r.ok) { this.tell(pid, r.reason); return; }
    this.schedule(); this.broadcast();
  }
  clearTimers() { for (const k of Object.keys(this.timers)) clearTimeout(this.timers[k]); this.timers = {}; for (const k of Object.keys(this.botT)) clearTimeout(this.botT[k]); this.botT = {}; }
  isBot(pid) { const p = this.players.find(x => x.id === pid); return !p || p.isBot; }
  isAway(pid) { const p = this.players.find(x => x.id === pid); return p && !p.isBot && !p.connected && pid !== 'host'; }
  humansAlive(s) { return s.players.some(q => q.alive && !this.isBot(q.id) && !this.isAway(q.id)); }
  later(key, ms, f) { clearTimeout(this.timers[key]); this.timers[key] = setTimeout(() => { delete this.timers[key]; if (!this.dead && this.state) f(); }, ms); }
  // quản trò: đồng hồ pha + hẹn giờ cho bot
  schedule() {
    const s = this.state; if (!s) return;
    if (s.phase === 'ended') { this.clearTimers(); this.curPk = s.pk; this.paused = null; return; }
    if (this.paused) { if (s.pk !== this.paused.pk) { this.paused.pk = s.pk; this.paused.left = phaseMs(s); this.curPk = s.pk; this.clearTimers(); } return; } // đang dừng: không chạy giờ, bot cũng chờ
    const now = Date.now();
    if (s.pk !== this.curPk) { // pha mới
      this.clearTimers(); this.curPk = s.pk;
      let d = phaseMs(s);
      const humans = this.humansAlive(s);
      if (s.phase === 'day' && !humans) d = Math.min(d, 30000); // chỉ còn bot: bàn nhanh
      this.total = d; this.deadline = now + d;
      const pk = s.pk;
      this.later('phase', d, () => { if (this.state.pk === pk) { timeout(this.state); this.schedule(); this.broadcast(); } });
      this.phaseExtras(s, humans);
    }
    // bot / người rớt mạng đang được chờ
    for (const pid of actors(s)) {
      if (this.botT[pid]) continue;
      const bot = this.isBot(pid), away = this.isAway(pid);
      if (!bot && !away) continue;
      let d = away ? AWAY_MS : this.botDelay(s, pid);
      const pk = s.pk;
      this.botT[pid] = setTimeout(() => {
        delete this.botT[pid];
        const st = this.state; if (!st || st.pk !== pk || !actors(st).includes(pid)) return;
        if (!this.isBot(pid) && !this.isAway(pid)) return; // đã vào lại
        const a = botAction(st, pid);
        if (a) { const r = applyAction(st, pid, a); if (r.ok) { this.schedule(); this.broadcast(); } }
      }, d);
    }
  }
  botDelay(s, pid) {
    const humans = this.humansAlive(s);
    switch (s.phase) {
      case 'night': return s.step === 'wolves' || s.step === 'wolves2' ? rnd(2500, 6000) : rnd(1800, 4500);
      case 'day': return humans ? rnd(7000, 14000) : rnd(3500, 7000); // bot bấm "Sẵn sàng" sau vài giây
      case 'vote': return rnd(2500, 9000);
      case 'last': return rnd(5000, 8000);
      case 'hunter': return rnd(3000, 6000);
    }
    return 3000;
  }
  // nói nhảm, chỉ điểm, khai… cho có không khí
  phaseExtras(s, humans) {
    const pk = s.pk;
    const say = (key, ms, pid, ch, text) => this.later(key, ms, () => { const st = this.state; if (st.pk !== pk) return; const r = applyAction(st, pid, { type: 'chat', ch, text }); if (r.ok) this.broadcast(); });
    const bots = s.players.filter(p => p.isBot);
    if (s.phase === 'day') {
      bots.filter(p => p.alive).forEach((b, i) => {
        const plan = botDayPlan(s, b.id);
        plan.forEach((a, j) => this.later(`plan${i}_${j}`, rnd(1500, humans ? 11000 : 5500), () => {
          const st = this.state; if (st.pk !== pk) return;
          const r = applyAction(st, b.id, a); if (r.ok) { this.schedule(); this.broadcast(); }
        }));
      });
    }
    if (s.phase === 'night' && (s.step === 'wolves' || s.step === 'wolves2')) {
      const wb = bots.filter(p => p.alive && isWolfRole(p.role));
      if (wb.length && Math.random() < 0.8) { const b = wb[Math.floor(Math.random() * wb.length)]; this.later('wolfchat', rnd(1200, 2400), () => { const st = this.state; if (st.pk !== pk) return; const r = applyAction(st, b.id, { type: 'chat', ch: 'wolf', text: botWolfLine(st, P(st, b.id)) }); if (r.ok) this.broadcast(); }); }
    }
    if (s.phase === 'last' && this.isBot(s.condemned)) say('lastw', rnd(1200, 3000), s.condemned, 'all', botLastWords(s, P(s, s.condemned)));
    if (s.phase === 'dawn' || s.phase === 'last') {
      const ghosts = bots.filter(p => !p.alive && p.diedDay === s.day);
      ghosts.forEach((g, i) => { if (Math.random() < 0.45) say('ghost' + i, rnd(2500, 6000), g.id, 'ghost', botGhostLine()); });
    }
  }
  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    const now = Date.now();
    const clock = this.state.phase !== 'ended' ? (this.paused ? { ms: this.paused.left, total: this.total, pk: this.state.pk, paused: true } : { ms: Math.max(0, this.deadline - now), total: this.total, pk: this.state.pk }) : null;
    const away = this.players.filter(q => !q.isBot && !q.connected && q.id !== 'host').map(q => q.id);
    for (const p of this.players) {
      const view = viewFor(this.state, p.id); view.clock = clock; view.away = away; if (this.replayAt) view.replayAt = this.replayAt;
      if (p.id === 'host') this.h.onState(JSON.parse(JSON.stringify(view)));
      else if (p.conn) try { p.conn.send({ t: 'state', view }); } catch (e) {}
    }
  }
  destroy() { this.dead = true; this.clearTimers(); clearTimeout(this.snapT); this.room && this.room.destroy(); }
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
