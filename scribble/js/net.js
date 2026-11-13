// Lớp mạng Scribble it!: chủ phòng giữ state + đồng hồ, máy khách gửi hành động & nét vẽ.
// Nét vẽ đi riêng (tin 'draw' theo lô ~100ms, chủ phòng chuyển tiếp), người vào muộn nhận lại cả lịch sử ('canvas').
import { createGame, applyAction, viewFor, tick, addDraw, addPlayer, setOnline, bookItems, shiftTime, cleanOpts, DEFAULT_OPTS, maxPlayers, MAX_CROWD, MAX_NORMAL, checkTease } from './engine.js?v=7';
import { RoomHost, RoomClient, token, session } from '../../shared/net/room.js?v=13';
import { watch } from '../../shared/ui/stats.js?v=9';
import { isReact, hostLimiter } from '../../shared/ui/react.js?v=2';
import { CATS } from './words.js?v=5';
import { GMODES, REVEAL_AUTO } from './engine.js?v=7';
import { rulesFor } from '../../shared/rules.js?v=1';
// ⚙️ Luật mặc định khi tạo phòng mới: lấy từ luat-mac-dinh.js (gốc repo); sai/thiếu → giữ luật gốc. cats: bật/tắt từng chủ đề
// solo: mặc định của "Hoạt hình một mình" (máy đã từng chọn thì nhớ lựa chọn riêng – localStorage 'scribble-solo')
const D = DEFAULT_OPTS, rng = (min, max, step = 1) => ({ min, max, step });
const CFG = rulesFor('scribble', {
  mode: D.mode, gmode: D.gmode, rounds: D.rounds, drawTime: D.drawTime, textTime: D.textTime, cSteps: D.cSteps, cTime: D.cTime,
  revealAuto: D.revealAuto, frames: D.frames, fps: D.fps, gSize: D.gSize,
  cats: Object.fromEntries(Object.keys(CATS).map(k => [k, D.cats.includes(k)])),
  solo: { frames: 5, fps: 4, drawTime: 80 },
}, {
  mode: ['guess', 'gartic'], gmode: Object.keys(GMODES), rounds: rng(1, 10), drawTime: rng(30, 180, 10), textTime: rng(20, 90, 5), cSteps: rng(2, 20), cTime: rng(10, 180, 5),
  revealAuto: REVEAL_AUTO, frames: v => v === 0 || (Number.isInteger(v) && v >= 4 && v <= 16), fps: rng(1, 12), gSize: rng(4, 8),
  cats: Object.fromEntries(Object.keys(CATS).map(k => [k, [true, false]])),
  solo: { frames: rng(3, 12), fps: rng(1, 12), drawTime: rng(30, 180, 10) },
});
const cfgOpts = () => { const { cats, solo, ...o } = CFG; return cleanOpts({ ...DEFAULT_OPTS, ...o, cats: Object.keys(cats).filter(k => cats[k]) }); };
export const SOLO_DEFAULT = { ...CFG.solo };
// Câu chọc cố định (bảng thả emoji – shared/ui/react.js). Không cho gõ tự do qua kênh này nên không thể lộ đáp án Đoán hình.
export const PHRASES = ['Vẽ gì zậy trời', 'Picasso đây rồi', 'Đoán bừa đi!', 'Ủa alo?', 'Nét căng đét!', 'Hiểu chết liền'];
const NS = 'bgvn-scribble', PREFIX = 'bgvn-scribble-', GAME = 'scribble';
const SNAP = 'bgvn-hostsnap-' + GAME;
export const MAX = MAX_CROWD; // chế độ Đông vui tới 30 người, các chế độ khác tối đa 12
export { maxPlayers };
export { session };
export function loadSnapshot() { try { const d = JSON.parse(localStorage.getItem(SNAP)); return d && Date.now() - d.ts < 3 * 3600e3 ? d : null; } catch (e) { return null; } }
// chia mảng thành các gói ≤ max byte JSON (tin nhắn qua Firebase tối đa 200KB)
export function chunk(items, max = 110000) {
  const out = []; let cur = [], size = 0;
  for (const it of items) { const l = JSON.stringify(it).length + 1; if (cur.length && size + l > max) { out.push(cur); cur = []; size = 0; } cur.push(it); size += l; }
  if (cur.length || !out.length) out.push(cur);
  return out;
}
const clone = o => JSON.parse(JSON.stringify(o));

export class Host {
  constructor(name, handlers, restore = null, offline = false) {
    this.h = watch(GAME, handlers, () => 'host'); this.isHost = true; this.offline = !!(offline || (restore && restore.offline));
    this.players = [{ id: 'host', name, token: token(), conn: null, connected: true }];
    this.opts = cfgOpts(); this.state = null; this.conns = new Map(); this.lastGuess = {}; this.lim = hostLimiter();
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.id === 'host' }));
      this.opts = cleanOpts(restore.opts || {}); this.state = restore.state || null; this.code = restore.code; this.bookSent = null;
      if (this.state) {
        const now = Date.now();
        shiftTime(this.state, now - restore.ts); // thời gian chủ phòng vắng không tính
        for (const p of this.state.players) if (p.id !== 'host') setOnline(this.state, p.id, false, now);
      } else this.players = this.players.filter(p => p.id === 'host');
    }
    if (this.offline) { this.room = null; this.code = 'SOLO'; session.save(GAME, { role: 'host', code: 'SOLO' }); } // Một mình: không cần mạng
    else {
      this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
      this.code = this.room.code;
    }
    setTimeout(() => { this.pushLobby(); if (this.state) this.broadcast(true); }, 0);
    this.tk = setInterval(() => this.tick(), 250);
  }
  saveSnap(delay = 600) {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => {
      const data = { ts: Date.now(), code: this.code, offline: this.offline, opts: this.opts, players: this.players.map(({ conn, lastKey, ...p }) => p), state: this.state };
      try { localStorage.setItem(SNAP, JSON.stringify(data)); }
      catch (e) { try { localStorage.setItem(SNAP, JSON.stringify({ ...data, state: null })); } catch (x) {} }
    }, delay);
  }
  attach(conn) {
    conn.on('data', msg => { try { this.onMsg(conn, msg); } catch (e) { console.error(e); } });
    conn.on('close', () => this.onLeave(conn));
    conn.on('error', () => this.onLeave(conn));
  }
  send(p, msg) { if (p && p.conn) try { p.conn.send(msg); } catch (e) {} }
  onMsg(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'join') {
      let p = this.players.find(x => x.token === msg.token && x.id !== 'host');
      const s = this.state;
      if (p) { if (p.conn && p.conn !== conn) try { p.conn.close(); } catch (e) {} p.conn = conn; p.connected = true; p.name = String(msg.name || p.name).slice(0, 16); }
      else {
        if (s && s.mode === 'gartic' && s.phase !== 'end') { conn.send({ t: 'error', msg: 'Ván Tam sao thất bản đang chạy – đợi ván sau nhé!' }); return; }
        const mx = maxPlayers(this.opts);
        if (this.players.length >= mx) { conn.send({ t: 'error', msg: `Phòng đã đủ ${mx} người${mx < MAX_CROWD ? ' (chủ phòng chọn Tam sao thất bản › Đông vui để chơi tới 30 người)' : ''}.` }); return; }
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), token: msg.token, conn, connected: true };
        this.players.push(p);
      }
      this.conns.set(conn.peer, p); p.lastKey = null;
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      if (s) { if (s.mode === 'guess') addPlayer(s, p); setOnline(s, p.id, true); }
      this.pushLobby();
      // gửi album trước để màn chiếu lại có ngay nội dung; lịch sử nét gửi sau state (cần turnKey)
      if (s && s.mode === 'gartic' && (s.phase === 'reveal' || s.phase === 'end')) this.sendBook(p);
      this.broadcast();
      if (s && s.mode === 'guess') this.sendCanvas(p);
      return;
    }
    const p = this.conns.get(conn.peer); if (!p) return;
    if (msg.t === 'action') this.actFrom(p.id, msg.a);
    else if (msg.t === 'draw') this.drawFrom(p.id, msg.ops);
    else if (msg.t === 'sync') this.sendCanvas(p);
    else if (msg.t === 'needbook') this.sendBook(p);
    else if (msg.t === 'react') this.react(p.id, msg.e);
    else if (msg.t === 'tease') this.tease(p.id, msg.text);
  }
  onLeave(conn) {
    const p = this.conns.get(conn.peer); if (!p) return;
    this.conns.delete(conn.peer);
    // đường cũ đóng muộn sau khi người đó đã vào lại bằng đường mới -> bỏ qua
    if (p.conn && p.conn !== conn) return;
    p.conn = null; p.connected = false;
    if (!this.state) this.players = this.players.filter(x => x !== p);
    else setOnline(this.state, p.id, false);
    this.pushLobby(); this.broadcast();
  }
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })), opts: this.opts }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(clone(info), this.code, !!this.state); this.saveSnap();
    for (const p of this.players) this.send(p, { t: 'lobby', info, code: this.code, started: !!this.state });
  }
  setOpts(patch) { if (this.state) return; this.opts = cleanOpts({ ...this.opts, ...patch }); this.pushLobby(); }
  removePlayer(id) {
    if (this.state) return;
    const p = this.players.find(x => x.id === id); if (!p || p.id === 'host') return;
    this.send(p, { t: 'kicked' }); try { p.conn && p.conn.close(); } catch (e) {}
    this.players = this.players.filter(x => x !== p); this.pushLobby();
  }
  start() {
    const ps = this.players.filter(p => p.connected), o = this.opts;
    const solo = o.mode === 'gartic' && o.gmode === 'solo';
    if (ps.length < (solo ? 1 : 2)) { this.h.onError('Cần ít nhất 2 người online – gửi mã phòng cho hội bạn nhé! (hoặc chọn Tam sao thất bản › Một mình)'); return; }
    if (ps.length > maxPlayers(o)) { this.h.onError(`Chế độ này tối đa ${MAX_NORMAL} người – chọn Tam sao thất bản › Đông vui để chơi tới ${MAX_CROWD} người.`); return; }
    this.players = ps;
    this.state = createGame(ps.map(p => ({ id: p.id, name: p.name })), { ...this.opts, host: 'host' }, Date.now());
    this.bookSent = null; this.players.forEach(p => p.lastKey = null);
    this.pushLobby(); this.broadcast(true);
  }
  restart() {
    this.state = null; this.players = this.players.filter(p => p.connected);
    for (const p of this.players) { p.lastKey = null; this.send(p, { t: 'state', view: null }); }
    this.h.onState(null); this.pushLobby();
  }
  // thả emoji / câu chọc: chủ phòng gán from theo kết nối, lọc câu lạ + chống spam rồi phát cho cả phòng
  react(from, e) {
    if (this.dead || !isReact(e, PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
    const msg = { t: 'react', e, from };
    for (const p of this.players) if (p.id !== 'host') this.send(p, msg);
    this.h.onReact && this.h.onReact(msg); return true;
  }
  // câu chọc gõ tự do: chủ phòng làm sạch + lọc lộ đáp án (engine.checkTease) + chống spam chung với emoji
  tease(from, raw) {
    if (this.dead || typeof raw !== 'string' || raw.length > 400 || !this.players.some(p => p.id === from)) return false;
    const r = checkTease(this.state, from, raw), p = this.players.find(x => x.id === from);
    if (r.guess) { this.actFrom(from, { type: 'guess', text: r.text }); return false; } // gõ trúng/gần trúng đáp án: tính là lượt đoán
    if (!r.ok) { if (!r.silent) { if (from === 'host') this.h.onError(r.reason); else this.send(p, { t: 'error', msg: r.reason }); } return false; }
    if (!this.lim(from)) return false;
    const msg = { t: 'tease', text: r.text, from };
    for (const q of this.players) if (q.id !== 'host') this.send(q, msg);
    this.h.onTease && this.h.onTease(msg); return true;
  }
  act(a) { this.actFrom('host', a); }
  actFrom(pid, a) {
    if (!this.state || !a) return;
    if (a.type === 'guess') { // chống spam: tối đa 6 tin / 2 giây (tin qua Firebase có thể tới dồn cục)
      const now = Date.now(), arr = (this.lastGuess[pid] || []).filter(t => now - t < 2000);
      if (arr.length >= 6) return; arr.push(now); this.lastGuess[pid] = arr;
    }
    const r = applyAction(this.state, pid, a, Date.now());
    if (!r.ok) { if (pid === 'host') this.h.onError(r.reason); else this.send(this.players.find(x => x.id === pid), { t: 'error', msg: r.reason }); return; }
    if (a.type === 'autoReveal' && pid === 'host') this.opts = cleanOpts({ ...this.opts, revealAuto: a.sec }); // ván sau giữ lựa chọn này
    this.changed();
  }
  changed() {
    const s = this.state;
    if (s && s.mode === 'gartic' && (s.phase === 'reveal' || s.phase === 'end') && this.bookSent !== s.gid) {
      this.bookSent = s.gid; for (const p of this.players) this.sendBook(p);
    }
    this.broadcast();
  }
  tick() { if (this.state && tick(this.state, Date.now())) this.changed(); }
  draw(ops) { this.drawFrom('host', ops); }
  drawFrom(pid, ops) {
    if (!this.state) return;
    const clean = addDraw(this.state, pid, ops); if (!clean) return;
    const msg = { t: 'draw', ops: clean, cv: this.state.cv };
    for (const p of this.players) if (p.id !== pid) { if (p.id === 'host') this.h.onDraw(clean, this.state.cv); else this.send(p, msg); }
    this.saveSnap(1500);
  }
  sendCanvas(p) {
    const s = this.state; if (!p || !s || s.mode !== 'guess') return;
    const parts = chunk(s.canvas);
    parts.forEach((ops, i) => { const m = { t: 'canvas', ops, cv: s.cv, tk: s.turnKey, first: i === 0, last: i === parts.length - 1 }; if (p.id === 'host') this.h.onCanvas(clone(m)); else this.send(p, m); });
  }
  sync() { this.sendCanvas(this.players[0]); }
  sendBook(p) {
    const s = this.state; if (!p || !s || s.mode !== 'gartic') return;
    const items = bookItems(s);
    for (const part of chunk(items)) { const m = { t: 'book', gid: s.gid, items: part }; if (p.id === 'host') this.h.onBook(clone(m)); else this.send(p, m); }
  }
  needBook() { this.sendBook(this.players[0]); }
  broadcast(force = false) {
    const s = this.state; if (!s) return;
    this.saveSnap();
    const now = Date.now();
    for (const p of this.players) {
      if (p.id !== 'host' && !p.conn) continue;
      const view = viewFor(s, p.id, now);
      const { left, ...rest } = view; const key = JSON.stringify(rest);
      if (!force && key === p.lastKey) continue;
      p.lastKey = key;
      if (p.id === 'host') this.h.onState(clone(view)); else this.send(p, { t: 'state', view });
    }
  }
  destroy() { this.dead = true; clearInterval(this.tk); clearTimeout(this.snapT); this.room && this.room.destroy(); }
  leave() { this.destroy(); try { localStorage.removeItem(SNAP); } catch (e) {} session.clear(GAME); }
}

export class Client {
  constructor(code, name, handlers) {
    this.h = watch(GAME, handlers, () => this.id); this.isHost = false; this.code = code.toUpperCase().trim(); this.name = name; this.id = null;
    this.room = new RoomClient({
      ns: NS, prefix: PREFIX, code: this.code, joinMsg: () => ({ name: this.name }),
      onStatus: (t, k) => { this.h.onNet && this.h.onNet(t, k, () => this.room.retryNow()); },
      onFail: m => { this.h.onError(m); session.clear(GAME); this.h.onFail && this.h.onFail(); },
      onWelcome: id => { this.id = id; session.save(GAME, { role: 'client', code: this.code, name: this.name }); this.h.onJoined(id); },
      onLost: () => this.h.onDisconnect && this.h.onDisconnect(),
      onMsg: msg => {
        if (msg.t === 'lobby') this.h.onLobby(msg.info, msg.code, msg.started);
        else if (msg.t === 'state') this.h.onState(msg.view);
        else if (msg.t === 'draw') this.h.onDraw(msg.ops, msg.cv);
        else if (msg.t === 'canvas') this.h.onCanvas(msg);
        else if (msg.t === 'book') this.h.onBook(msg);
        else if (msg.t === 'react') this.h.onReact && this.h.onReact(msg);
        else if (msg.t === 'tease') this.h.onTease && this.h.onTease(msg);
        else if (msg.t === 'error') this.h.onError(msg.msg);
        else if (msg.t === 'kicked') { this.h.onError('Bạn đã bị mời ra khỏi phòng.'); this.leave(); this.h.onFail && this.h.onFail(); }
      },
    });
  }
  act(a) { this.room.send({ t: 'action', a }); }
  draw(ops) { this.room.send({ t: 'draw', ops }); }
  sync() { this.room.send({ t: 'sync' }); }
  needBook() { this.room.send({ t: 'needbook' }); }
  react(e) { this.room.send({ t: 'react', e }); }
  tease(text) { this.room.send({ t: 'tease', text }); }
  destroy() { this.room.destroy(); }
  leave() { this.destroy(); session.clear(GAME); }
}
