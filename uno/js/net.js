// Lớp mạng UNO: host giữ state, client chỉ gửi action. Kết nối dùng chung ở shared/net/room.js
import { createGame, applyAction, viewFor, current, MODES, newMatch, recordRound, MATCH_TARGETS } from './engine.js?v=19';
import { botAction, botCatch } from './bot.js?v=19';
import { S } from './ufx.js?v=20';
import { RoomHost, RoomClient, token, session } from '../../shared/net/room.js?v=6';
import { isReact, hostLimiter, pickReact } from '../../shared/ui/react.js?v=2';
import { rulesFor } from '../../shared/rules.js?v=1';
import { specBanner } from '../../shared/ui/spectate.js?v=1';
import { watch } from '../../shared/ui/stats.js?v=3';
const NS = 'bgvn-uno', PREFIX = 'bgvn-uno-', GAME = 'uno';
const SNAP = 'bgvn-hostsnap-' + GAME;
export function loadSnapshot() { try { const d = JSON.parse(localStorage.getItem(SNAP)); return d && Date.now() - d.ts < 3 * 3600e3 ? d : null; } catch (e) { return null; } }
export { session };
// ⚙️ Luật mặc định khi tạo phòng mới: lấy từ luat-mac-dinh.js (gốc repo), sai/thiếu thì dùng luật gốc ở đây
const B2 = [true, false], RULE_OK = Object.fromEntries(Object.keys(MODES.classic.rules).map(k => [k, B2]));
const CFG = rulesFor('uno', { mode: 'house', match: false, matchTarget: 500, modes: Object.fromEntries(Object.entries(MODES).map(([m, x]) => [m, { ...x.rules }])) },
  { mode: Object.keys(MODES), match: B2, matchTarget: MATCH_TARGETS, modes: Object.fromEntries(Object.keys(MODES).map(m => [m, RULE_OK])) });
const modeRules = m => ({ ...CFG.modes[m] });
const BOT_NAMES = ['Mochi', 'Pudding', 'Kem', 'Su Su', 'Tôm', 'Bắp', 'Mít', 'Na', 'Xoài'];
export const MAX = 10;
export const PULL_CD = 1000; // giãn cách giữa 2 lần tự bốc phạt
export const TURN_TIME = 40, OWE_TIME = 20; // giây: người thật treo máy quá lâu thì máy đánh thay
// Câu chọc riêng của UNO (bảng thả emoji – shared/ui/react.js)
export const UNO_PHRASES = ['Khoá mõm nè!', 'Ăn +4 đi cưng', 'Cứu tui', 'UNO nè!', 'Chơi kỳ vậy 😤', 'Gà quá!'];
const BOT_POOLS = { attack: ['Ăn +4 đi cưng', 'Khoá mõm nè!'], hurt: ['Cứu tui', 'Chơi kỳ vậy 😤'], win: ['Gà quá!'], reply: ['Gà quá!'], uno: ['UNO nè!'] };

export class Host {
  constructor(name, handlers, offline = false, restore = null) {
    this.h = watch(GAME, handlers, () => 'host'); this.offline = offline;
    this.players = [{ id: 'host', name, isBot: false, token: token(), conn: null, connected: true }];
    this.state = null; this.conns = new Map(); this.botTimer = null; this.catchTimer = null;
    this.mode = CFG.mode; this.rules = modeRules(CFG.mode);
    this.match = newMatch(CFG.match, CFG.matchTarget); // "Tính điểm tới 500": điểm từng người qua nhiều ván
    this.lim = hostLimiter(); this.botReactAt = 0;
    if (restore) {
      this.players = restore.players.map(p => ({ ...p, conn: null, connected: p.isBot || p.id === 'host' }));
      this.state = restore.state; this.code = restore.code; this.mode = restore.mode || this.mode; this.rules = restore.rules || this.rules;
      if (restore.match) this.match = restore.match;
    }
    if (offline) { this.code = 'OFFLINE'; setTimeout(() => { this.pushLobby(); if (this.state) { this.scheduleBots(); this.broadcast(); } }, 0); return; }
    this.room = new RoomHost({ ns: NS, prefix: PREFIX, code: this.code, keepCode: !!restore, onConn: c => this.attach(c), onReady: code => { this.code = code; session.save(GAME, { role: 'host', code }); this.pushLobby(); }, onError: m => this.h.onError(m) });
    this.code = this.room.code;
    setTimeout(() => { this.pushLobby(); if (this.state) { this.graceUntil = Date.now() + 4000; this.scheduleBots(); this.broadcast(); } }, 0);
  }
  saveSnap() {
    clearTimeout(this.snapT);
    this.snapT = setTimeout(() => { try { localStorage.setItem(SNAP, JSON.stringify({ ts: Date.now(), code: this.code, offline: this.offline, mode: this.mode, rules: this.rules, match: this.match, players: this.players.map(({ conn, ...p }) => p), state: this.state })); } catch (e) {} }, 300);
  }
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
        if (this.players.length >= MAX) { conn.send({ t: 'error', msg: `Phòng đã đủ ${MAX} người.` }); return; }
        p = { id: 'p' + Math.random().toString(36).slice(2, 8), name: String(msg.name || 'Khách').slice(0, 16), isBot: false, token: msg.token, conn, connected: true };
        this.players.push(p);
      }
      this.conns.set(conn.peer, p);
      conn.send({ t: 'welcome', id: p.id, code: this.code });
      this.pushLobby(); this.broadcast();
    } else if (msg.t === 'action') {
      const p = this.conns.get(conn.peer); if (p && this.inGame(p.id)) this.act(p.id, msg.a);
    } else if (msg.t === 'react') {
      const p = this.conns.get(conn.peer); if (p) this.react(p.id, msg.e);
    }
  }
  onLeave(conn) {
    const p = this.conns.get(conn.peer); if (!p) return;
    this.conns.delete(conn.peer);
    if (p.conn === conn) { p.conn = null; p.connected = false; }
    if (!this.inGame(p.id)) this.players = this.players.filter(x => x !== p);
    this.pushLobby(); this.scheduleBots();
  }
  inGame(id) { return !this.state || this.state.players.some(q => q.id === id); } // người vào giữa ván: chỉ xem, ván sau mới chơi
  lobbyInfo() { return { players: this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected, wait: !this.inGame(p.id) })), mode: this.mode, rules: this.rules, match: this.match }; }
  pushLobby() {
    const info = this.lobbyInfo();
    this.h.onLobby(info, this.code, !!this.state); this.saveSnap();
    for (const p of this.players) if (p.conn) try { p.conn.send({ t: 'lobby', info, code: this.code, started: !!this.state }); } catch (e) {}
  }
  setMode(mode) { if (this.state || !MODES[mode]) return; this.mode = mode; this.rules = modeRules(mode); this.pushLobby(); }
  setRule(k, v) { if (this.state || !(k in MODES.classic.rules)) return; this.rules[k] = !!v; this.pushLobby(); }
  // Tính điểm nhiều ván: đổi tuỳ chọn thì xoá bảng điểm cũ
  setMatch(on, target = this.match.target) { if (this.state) return; if (!MATCH_TARGETS.includes(+target)) target = CFG.matchTarget; this.match = newMatch(on, target); this.pushLobby(); }
  resetMatch() { if (this.state) return; this.match = newMatch(this.match.on, this.match.target); this.pushLobby(); }
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
    if (this.match.champion) this.match = newMatch(this.match.on, this.match.target); // đã có vô địch: giải mới
    this.state = createGame(this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })), this.mode, this.rules);
    if (this.match.on) this.state.log[this.state.log.length - 1] = `Ván ${this.match.round + 1} (tính điểm tới ${this.match.target}). ` + this.state.log[this.state.log.length - 1];
    this.graceUntil = Date.now() + 3200 * S();
    this.pushLobby(); this.scheduleBots(); this.broadcast();
  }
  restart() { clearTimeout(this.botTimer); clearTimeout(this.catchTimer); this.state = null; this.pushLobby(); for (const p of this.players) if (p.conn) p.conn.send({ t: 'state', view: null }); this.h.onState(null); }
  act(pid, a) {
    if (!this.state) return;
    if (a && a.type === 'pull') { // mỗi lần bốc cách nhau 1 giây – cho nó thấm 😈
      this.lastPull = this.lastPull || {}; const now = Date.now();
      if (now - (this.lastPull[pid] || 0) < PULL_CD - 60) return;
      this.lastPull[pid] = now;
    }
    const fxBefore = this.state.fxN || 0;
    const r = applyAction(this.state, pid, a);
    if (this.state.phase === 'ended' && recordRound(this.match, this.state)) this.pushLobby();
    if (r.ok) this.botReacts(fxBefore);
    if (!r.ok) { const p = this.players.find(x => x.id === pid); if (p && p.conn) p.conn.send({ t: 'error', msg: r.reason }); else if (pid === 'host') this.h.onError(r.reason); }
    this.scheduleBots(); this.broadcast();
  }
  broadcast() {
    if (!this.state) return;
    this.saveSnap();
    for (const p of this.players) {
      const view = viewFor(this.state, p.id);
      if (this.deadline) view.timer = { pid: this.deadline.pid, ms: Math.max(0, this.deadline.end - Date.now()) };
      if (this.match.on) view.match = this.match;
      if (!this.inGame(p.id)) view.spec = true;
      if (p.id === 'host') this.h.onState(JSON.parse(JSON.stringify(view)));
      else if (p.conn) try { p.conn.send({ t: 'state', view }); } catch (e) {}
    }
  }
  scheduleBots() {
    clearTimeout(this.botTimer); this.deadline = null;
    const s = this.state; if (!s || s.phase !== 'playing') return;
    // bot có thể bắt lỗi quên hô UNO – mỗi lần ai đó quên chỉ "tung xúc xắc" MỘT lần: ~50% có bot để ý, và chậm 2–4 giây để người chơi kịp bấm UNO
    const ck = s.unoWatch ? s.unoWatch + '|' + s.turnCount : null;
    if (ck && this.catchKey !== ck && !this.catchTimer) {
      this.catchKey = ck;
      const bots = this.players.filter(p => p.isBot && p.id !== s.unoWatch && !s.players.find(q => q.id === p.id).out);
      if (bots.length && Math.random() < 0.5) {
        const b = bots[Math.floor(Math.random() * bots.length)];
        this.catchTimer = setTimeout(() => { this.catchTimer = null; const a = this.state && botCatch(this.state, b.id); if (a) this.act(b.id, a); }, (2000 + Math.random() * 2000) * S());
      }
    }
    const pid = s.owe ? s.owe.player : s.pending ? s.pending.player : current(s).id;
    const p = this.players.find(x => x.id === pid); if (!p) return;
    if (this.autoOwe && !(s.owe && s.owe.player === this.autoOwe)) this.autoOwe = null;
    const auto = p.isBot || (!p.connected && pid !== 'host') || this.autoOwe === pid;
    if (!auto) { // đồng hồ chống treo máy: hết giờ thì máy đánh thay (bốc phạt thì máy bốc hết phần còn lại)
      const ms = (s.owe ? OWE_TIME : TURN_TIME) * 1000;
      this.deadline = { pid, end: Date.now() + ms };
      this.botTimer = setTimeout(() => {
        const st = this.state; if (!st || st.phase !== 'playing') return;
        if (st.owe && st.owe.player === pid) { this.autoOwe = pid; this.act(pid, { type: 'pull' }); return; }
        const a = botAction(st, pid); if (a) this.act(pid, a); else this.scheduleBots();
      }, ms);
      return;
    }
    if (s.owe) { this.botTimer = setTimeout(() => this.act(pid, { type: 'pull' }), Math.max(PULL_CD + 80, (this.graceUntil || 0) - Date.now())); return; }
    const human = this.players.some(x => !x.isBot);
    const base = s.unoWatch && human ? 2600 : 1000; // chừa thời gian cho người thật bắt lỗi
    this.botTimer = setTimeout(() => {
      clearTimeout(this.catchTimer); this.catchTimer = null;
      const a = botAction(this.state, pid);
      if (a) this.act(pid, a);
    }, p.isBot ? Math.max(Math.round((base + Math.random() * 500) * S()), (this.graceUntil || 0) - Date.now()) : 20000);
  }
  // ---- thả emoji / chọc nhau: chủ phòng lọc rồi phát lại cho cả bàn ----
  react(from, e) {
    if (this.dead || !isReact(e, UNO_PHRASES) || !this.players.some(p => p.id === from) || !this.lim(from)) return false;
    const msg = { t: 'react', e, from };
    for (const p of this.players) if (p.conn) try { p.conn.send(msg); } catch (x) {}
    this.h.onReact && this.h.onReact(msg);
    // người thật chọc thì thỉnh thoảng có bot chọc lại
    const sender = this.players.find(p => p.id === from);
    if (sender && !sender.isBot && Math.random() < 0.3) this.botSay(null, 'reply', 900 + Math.random() * 900);
    return true;
  }
  // bot thả reaction (pid null: chọn ngẫu nhiên 1 bot); có giãn cách để không ồn
  botSay(pid, mood, delay = 1000) {
    const now = Date.now(); if (now < this.botReactAt) return;
    const bots = this.players.filter(p => p.isBot && (!pid || p.id === pid));
    if (!bots.length) return;
    this.botReactAt = now + 5000;
    const b = bots[Math.floor(Math.random() * bots.length)];
    setTimeout(() => { if (!this.dead && this.state) this.react(b.id, pickReact(mood, BOT_POOLS)); }, delay);
  }
  botReacts(fxBefore) {
    const s = this.state; if (!s) return;
    const isBot = id => (this.players.find(p => p.id === id) || {}).isBot;
    if (s.phase === 'ended') { if (isBot(s.winner) && Math.random() < 0.6) this.botSay(s.winner, 'win', 1600); return; }
    for (const e of (s.fx || []).filter(x => x.id > fxBefore)) {
      if (e.k === 'skip' && Math.random() < 0.6) continue; // lá thường thì ít chọc hơn
      if (isBot(e.to) && Math.random() < 0.35) this.botSay(e.to, 'hurt', 1300 + Math.random() * 700);
      else if (isBot(e.from) && Math.random() < 0.25) this.botSay(e.from, 'attack', 900 + Math.random() * 600);
    }
  }
  destroy() { this.dead = true; clearTimeout(this.botTimer); clearTimeout(this.catchTimer); clearTimeout(this.snapT); this.room && this.room.destroy(); }
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
        else if (msg.t === 'react') this.h.onReact && this.h.onReact(msg);
        else if (msg.t === 'kicked') { this.h.onError('Bạn đã bị mời ra khỏi phòng.'); this.leave(); }
      },
    });
  }
  act(a) { this.room.send({ t: 'action', a }); }
  react(e) { this.room.send({ t: 'react', e }); }
  destroy() { specBanner(false); this.room.destroy(); }
  leave() { this.destroy(); session.clear(GAME); }
}
