// Luật Scribble it! – state machine thuần, JSON-serializable, không đụng giao diện.
//   createGame(players, opts, now) · applyAction(state, pid, action, now) -> {ok, reason}
//   viewFor(state, pid, now) · tick(state, now) -> true nếu state đổi
// Hai chế độ: 'guess' (đoán hình kiểu skribbl) và 'gartic' (Tam sao thất bản – chuyền câu ↔ hình).
import { isMatch, isNear, leaks, maskWord, letterIdx, wordLens } from './match.js?v=2';
import { buildPool, parseCustom, randomPrompt, DEFAULT_CATS, CATS } from './words.js?v=2';
import { cleanOps, pushOp, opsBytes, simplifyOps } from './ops.js?v=2';

let R = Math.random;
export function setRandom(f) { R = f || Math.random; }
export const rand = () => R();
const ri = n => Math.floor(R() * n);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const rid = () => Math.floor(R() * 36 ** 6).toString(36);

export const CHOOSE_MS = 15000, TURN_END_MS = 6000, GRACE_MS = 2000, OFF_SKIP_MS = 8000, OFF_GARTIC_MS = 10000, CHAT_MAX = 60;
export const REACTS = ['😂', '🔥', '💀', '😍', '👏'];
export const DEFAULT_OPTS = { mode: 'guess', rounds: 3, drawTime: 80, textTime: 40, cats: DEFAULT_CATS.slice(), custom: [], onlyCustom: false };
const clamp = (v, lo, hi, d) => { v = Math.round(+v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
export function cleanOpts(o = {}) {
  const custom = parseCustom(o.custom || []);
  const cats = Array.isArray(o.cats) ? o.cats.filter(k => CATS[k]) : DEFAULT_CATS.slice();
  return {
    mode: o.mode === 'gartic' ? 'gartic' : 'guess',
    rounds: clamp(o.rounds, 1, 10, 3),
    drawTime: Math.round(clamp(o.drawTime, 30, 180, 80) / 5) * 5,
    textTime: clamp(o.textTime, 20, 90, 40),
    cats: cats.length || custom.length ? cats : DEFAULT_CATS.slice(),
    custom,
    onlyCustom: !!o.onlyCustom && custom.length >= 3,
  };
}

const pl = (s, id) => s.players.find(p => p.id === id);
function say(s, m) { s.chat.push({ id: ++s.mid, ...m }); if (s.chat.length > CHAT_MAX) s.chat.splice(0, s.chat.length - CHAT_MAX); }
const sys = (s, text, extra = {}) => say(s, { kind: 'sys', text, ...extra });

export function createGame(players, opts = {}, now = Date.now()) {
  const o = cleanOpts(opts);
  const s = {
    v: 1, gid: rid(), mode: o.mode, opts: o, host: opts.host || players[0].id,
    players: players.map(p => ({ id: p.id, name: String(p.name || '?').slice(0, 16), score: 0, on: true, offAt: 0 })),
    phase: '', deadline: 0, chat: [], mid: 0,
  };
  if (s.mode === 'gartic') initGartic(s, now); else initGuess(s, now);
  return s;
}

// ======================= ĐOÁN HÌNH =======================
function initGuess(s, now) {
  Object.assign(s, { order: shuffle(s.players.map(p => p.id)), round: 1, turn: -1, turnKey: 0, cv: 0, canvas: [], used: [], guessed: {}, gains: {}, word: null, choices: null, revealed: [], hintAt: [], drawer: null, drawStart: 0, endReason: '' });
  sys(s, `Bắt đầu! ${s.opts.rounds} vòng, mỗi lượt vẽ ${s.opts.drawTime} giây. Chúc may mắn 🍀`);
  nextTurn(s, now);
}
function pickChoices(s) {
  const pool = buildPool(s.opts);
  let free = pool.filter(w => !s.used.includes(w.toLowerCase()));
  if (free.length < 3) { s.used = []; free = pool.slice(); }
  shuffle(free); return free.slice(0, 3);
}
function nextTurn(s, now) {
  for (let guard = 0; guard <= s.order.length; guard++) {
    s.turn++;
    if (s.turn >= s.order.length) { s.turn = 0; s.round++; if (s.round <= s.opts.rounds) sys(s, `— Vòng ${s.round}/${s.opts.rounds} —`); }
    if (s.round > s.opts.rounds) return endGame(s, now);
    const p = pl(s, s.order[s.turn]);
    if (p && p.on) return startTurn(s, p.id, now);
    if (p) sys(s, `${p.name} vắng mặt – bỏ lượt 💤`);
  }
  endGame(s, now);
}
function startTurn(s, pid, now) {
  Object.assign(s, { phase: 'choose', drawer: pid, choices: pickChoices(s), word: null, revealed: [], hintAt: [], guessed: {}, gains: {}, canvas: [], endReason: '', deadline: now + CHOOSE_MS, drawStart: 0 });
  s.cv++; s.turnKey++;
}
function choose(s, idx, now) {
  const w = s.choices[idx] || s.choices[0];
  s.word = w; s.used.push(w.toLowerCase()); s.phase = 'draw';
  const total = s.opts.drawTime * 1000; s.drawStart = now; s.deadline = now + total;
  const n = letterIdx(w).length, k = n <= 2 ? 0 : Math.min(Math.max(1, Math.floor(n * 0.35)), n - 2);
  s.hintAt = Array.from({ length: k }, (_, i) => now + Math.round(total * (k === 1 ? 0.6 : 0.42 + 0.43 * i / (k - 1))));
  sys(s, `${pl(s, s.drawer).name} đang vẽ ✏️`);
}
function revealOne(s) {
  const hidden = letterIdx(s.word).filter(i => !s.revealed.includes(i));
  if (hidden.length > 1) s.revealed.push(hidden[ri(hidden.length)]);
}
const guessers = s => s.players.filter(p => p.id !== s.drawer && (p.on || s.guessed[p.id] != null));
function allGuessed(s) { const g = guessers(s); return g.length > 0 && g.every(p => s.guessed[p.id] != null); }
function endTurn(s, now, reason) {
  const d = pl(s, s.drawer), n = Object.keys(s.guessed).length;
  if (s.word && n && d) { const pts = Math.round(300 * n / Math.max(1, guessers(s).length) / 5) * 5; d.score += pts; s.gains[d.id] = pts; }
  s.phase = 'turnEnd'; s.endReason = reason; s.deadline = now + TURN_END_MS; s.choices = null;
  if (s.word) sys(s, `Đáp án là: ${s.word}`, { ans: 1 });
  else sys(s, `${d ? d.name : 'Hoạ sĩ'} ${reason === 'left' ? 'rớt mạng' : 'không chọn từ'} – bỏ lượt`);
}
function endGame(s, now) { s.phase = 'end'; s.deadline = 0; s.drawer = null; s.choices = null; sys(s, 'Hết ván! 🏁'); void now; }

export function addDraw(s, pid, ops) {
  if (!s || s.mode !== 'guess' || s.phase !== 'draw' || pid !== s.drawer) return null;
  const clean = cleanOps(ops, 400); if (!clean.length) return null;
  if (s.canvas.length + clean.length > 9000) return null;
  for (const op of clean) pushOp(s.canvas, op);
  s.cv++; return clean;
}

function guess(s, pid, raw, now) {
  const text = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim().slice(0, 100);
  const p = pl(s, pid); if (!p) return { ok: false, reason: 'Không có trong ván' };
  if (!text) return { ok: false, reason: 'Tin nhắn trống' };
  const base = { from: pid, name: p.name, text, tk: s.turnKey };
  if (s.phase !== 'draw' || !s.word) { say(s, { kind: 'chat', ...base }); return { ok: true }; }
  if (pid === s.drawer) {
    if (leaks(text, s.word)) { sys(s, 'Hoạ sĩ không được lộ đáp án nha 🤐', { to: pid, warn: 1 }); return { ok: true, blocked: true }; }
    say(s, { kind: 'chat', ...base }); return { ok: true };
  }
  if (s.guessed[pid] != null) { say(s, { kind: 'chat', vis: 'in', ...base }); return { ok: true }; }
  if (isMatch(text, s.word)) {
    const left = Math.max(0, s.deadline - now), total = s.opts.drawTime * 1000;
    const pts = Math.round((100 + 400 * left / total) / 5) * 5;
    s.guessed[pid] = pts; s.gains[pid] = pts; p.score += pts;
    say(s, { kind: 'ok', from: pid, name: p.name, text: `${p.name} đã đoán ra! +${pts}`, tk: s.turnKey });
    if (allGuessed(s)) endTurn(s, now, 'all');
    return { ok: true, correct: true, pts };
  }
  if (isNear(text, s.word)) {
    say(s, { kind: 'chat', vis: 'in', ...base });
    sys(s, `“${text}” – Gần đúng rồi! 🔥`, { to: pid, close: 1 });
    return { ok: true, close: true };
  }
  say(s, { kind: 'chat', ...base }); return { ok: true };
}

function tickGuess(s, now) {
  const d = s.drawer && pl(s, s.drawer);
  const drawerGone = d && !d.on && now - d.offAt >= OFF_SKIP_MS;
  if (s.phase === 'choose') {
    if (drawerGone) { endTurn(s, now, 'left'); return true; }
    if (now >= s.deadline) { choose(s, ri(s.choices.length), now); return true; }
  } else if (s.phase === 'draw') {
    let ch = false;
    while (s.revealed.length < s.hintAt.length && now >= s.hintAt[s.revealed.length]) { const before = s.revealed.length; revealOne(s); if (s.revealed.length === before) { s.hintAt.length = before; break; } ch = true; }
    if (now >= s.deadline) { endTurn(s, now, 'time'); return true; }
    if (drawerGone) { endTurn(s, now, 'left'); return true; }
    if (Object.keys(s.guessed).length && allGuessed(s)) { endTurn(s, now, 'all'); return true; }
    return ch;
  } else if (s.phase === 'turnEnd' && now >= s.deadline) { nextTurn(s, now); return true; }
  return false;
}

// ======================= TAM SAO THẤT BẢN =======================
export const stepKind = k => k === 0 ? 'write' : k % 2 ? 'draw' : 'guess';
function initGartic(s, now) {
  s.order = shuffle(s.players.map(p => p.id));
  const n = s.order.length;
  s.steps = n >= 4 ? n : 4; s.step = 0;
  s.book = s.order.map(() => Array(s.steps).fill(null));
  s.reveal = null; s.reacts = {};
  s.phase = 'play'; s.deadline = now + stepMs(s, 0);
}
const stepMs = (s, k) => (stepKind(k) === 'draw' ? s.opts.drawTime : s.opts.textTime) * 1000;
// Chuỗi c ở bước k do order[(c + k) % n] làm -> người i làm chuỗi (i - k) mod n
export function chainFor(s, pid, k = s.step) { const i = s.order.indexOf(pid), n = s.order.length; return i < 0 ? -1 : ((i - k) % n + n) % n; }
function gDone(s, now) {
  return s.order.every(id => {
    const p = pl(s, id); return s.book[chainFor(s, id)][s.step] != null || (!p.on && now - p.offAt >= OFF_GARTIC_MS);
  });
}
function cleanText(t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, 120); }
function submit(s, pid, a, now) {
  if (s.phase !== 'play') return { ok: false, reason: 'Chưa tới lúc nộp' };
  if (a.step !== s.step) return { ok: false, reason: 'Bước này đã qua rồi' };
  const c = chainFor(s, pid); if (c < 0) return { ok: false, reason: 'Bạn không có trong ván' };
  if (stepKind(s.step) === 'draw') {
    let ops = cleanOps(a.ops);
    if (opsBytes(ops) > 150000) ops = simplifyOps(ops, 140000);
    if (opsBytes(ops) > 160000) return { ok: false, reason: 'Bức vẽ nặng quá, bớt nét chút nha' };
    s.book[c][s.step] = { by: pid, d: ops };
  } else {
    const t = cleanText(a.text); if (!t) return { ok: false, reason: 'Viết gì đó đi nè ✍️' };
    s.book[c][s.step] = { by: pid, t };
  }
  if (gDone(s, now)) advance(s, now);
  return { ok: true };
}
function fillMissing(s) {
  const k = s.step, kind = stepKind(k);
  s.order.forEach(id => {
    const c = chainFor(s, id, k); if (s.book[c][k]) return;
    s.book[c][k] = kind === 'draw' ? { by: id, d: [], miss: 1 } : kind === 'write' ? { by: id, t: randomPrompt(rand), miss: 1 } : { by: id, t: '🤷 (không kịp đoán)', miss: 1 };
  });
}
function advance(s, now) {
  fillMissing(s);
  s.step++;
  if (s.step >= s.steps) { s.phase = 'reveal'; s.reveal = { c: 0, u: 0 }; s.deadline = 0; return; }
  s.deadline = now + stepMs(s, s.step);
}
function tickGartic(s, now) {
  if (s.phase !== 'play') return false;
  if (gDone(s, now) || now >= s.deadline + GRACE_MS) { advance(s, now); return true; }
  return false;
}
const revealed = (s, c, k) => s.phase === 'end' || (s.phase === 'reveal' && (c < s.reveal.c || (c === s.reveal.c && k <= s.reveal.u)));
function nextReveal(s) {
  const r = s.reveal;
  if (r.u < s.steps - 1) r.u++;
  else if (r.c < s.order.length - 1) { r.c++; r.u = 0; }
  else s.phase = 'end';
}
function react(s, pid, a) {
  const m = /^(\d+):(\d+)$/.exec(String(a.key || '')); if (!m || !REACTS.includes(a.e)) return { ok: false, reason: 'Cảm xúc lạ quá' };
  const c = +m[1], k = +m[2];
  if (c >= s.order.length || k >= s.steps || !revealed(s, c, k)) return { ok: false, reason: 'Chưa lật tới đó' };
  const box = s.reacts[a.key] = s.reacts[a.key] || {};
  const arr = box[a.e] = box[a.e] || [];
  const i = arr.indexOf(pid); if (i >= 0) arr.splice(i, 1); else arr.push(pid);
  return { ok: true, added: i < 0 };
}
// Toàn bộ album (gửi riêng cho máy khách khi bắt đầu chiếu lại)
export function bookItems(s) {
  if (s.mode !== 'gartic') return [];
  const out = [];
  s.book.forEach((chain, c) => chain.forEach((it, k) => { if (it) out.push({ key: c + ':' + k, by: it.by, ...(it.d ? { d: it.d } : { t: it.t }), ...(it.miss ? { miss: 1 } : {}) }); }));
  return out;
}

// ======================= CHUNG =======================
export function applyAction(s, pid, a, now = Date.now()) {
  if (!s || !a || typeof a !== 'object') return { ok: false, reason: 'Hành động lạ' };
  if (!pl(s, pid)) return { ok: false, reason: 'Bạn không có trong ván' };
  if (s.mode === 'guess') {
    if (a.type === 'choose') {
      if (s.phase !== 'choose' || pid !== s.drawer) return { ok: false, reason: 'Không phải lượt bạn chọn từ' };
      const i = +a.idx; if (!(i >= 0 && i < s.choices.length)) return { ok: false, reason: 'Từ không hợp lệ' };
      choose(s, i, now); return { ok: true };
    }
    if (a.type === 'guess') return guess(s, pid, a.text, now);
    if (a.type === 'skip') { // hoạ sĩ bỏ lượt
      if (pid !== s.drawer || (s.phase !== 'choose' && s.phase !== 'draw')) return { ok: false, reason: 'Không bỏ lượt được' };
      endTurn(s, now, 'skip'); return { ok: true };
    }
  } else {
    if (a.type === 'submit') return submit(s, pid, a, now);
    if (a.type === 'react') return react(s, pid, a);
    if (a.type === 'next') {
      if (pid !== s.host) return { ok: false, reason: 'Chỉ chủ phòng bấm tiếp được' };
      if (s.phase !== 'reveal') return { ok: false, reason: 'Chưa tới lúc chiếu' };
      nextReveal(s); return { ok: true };
    }
    if (a.type === 'skipReveal') {
      if (pid !== s.host || s.phase !== 'reveal') return { ok: false, reason: 'Không được' };
      s.phase = 'end'; return { ok: true };
    }
  }
  return { ok: false, reason: 'Hành động không hợp lệ' };
}
export function tick(s, now = Date.now()) {
  if (!s || s.phase === 'end') return false;
  return s.mode === 'guess' ? tickGuess(s, now) : tickGartic(s, now);
}
export function setOnline(s, pid, on, now = Date.now()) {
  const p = s && pl(s, pid); if (!p || p.on === on) return false;
  p.on = on; if (!on) p.offAt = now; return true;
}
// Người vào giữa ván (chỉ chế độ Đoán hình): ngồi cuối hàng vẽ
export function addPlayer(s, p) {
  if (!s || s.mode !== 'guess') return false;
  const old = pl(s, p.id); if (old) { old.on = true; return true; }
  s.players.push({ id: p.id, name: String(p.name || '?').slice(0, 16), score: 0, on: true, offAt: 0 });
  s.order.push(p.id); sys(s, `${p.name} vừa vào phòng 👋`);
  return true;
}
// Chủ phòng tải lại trang: dời mọi mốc thời gian theo khoảng đã mất
export function shiftTime(s, ms) {
  if (!s || !(ms > 0)) return;
  if (s.deadline) s.deadline += ms;
  if (s.drawStart) s.drawStart += ms;
  if (s.hintAt) s.hintAt = s.hintAt.map(t => t + ms);
  s.players.forEach(p => { if (p.offAt) p.offAt += ms; });
}

function visible(s, m, pid) {
  if (m.to) return m.to === pid;
  if (m.vis !== 'in' || m.tk !== s.turnKey || s.phase !== 'draw') return true;
  return pid === s.drawer || s.guessed[pid] != null || m.from === pid;
}
export function viewFor(s, pid, now = Date.now()) {
  const left = Math.max(0, s.deadline - now);
  const v = { gid: s.gid, mode: s.mode, phase: s.phase, host: s.host, me: pid, opts: { rounds: s.opts.rounds, drawTime: s.opts.drawTime, textTime: s.opts.textTime }, left };
  if (s.mode === 'guess') {
    const knows = pid === s.drawer || s.guessed[pid] != null || s.phase === 'turnEnd' || s.phase === 'end';
    Object.assign(v, {
      round: s.round, rounds: s.opts.rounds, turnKey: s.turnKey, cv: s.cv, drawer: s.drawer,
      total: s.phase === 'choose' ? CHOOSE_MS : s.phase === 'draw' ? s.opts.drawTime * 1000 : s.phase === 'turnEnd' ? TURN_END_MS : 0,
      players: s.players.map(p => ({ id: p.id, name: p.name, score: p.score, on: p.on, guessed: s.guessed[p.id] != null, gain: s.gains[p.id] || 0 })),
      choices: s.phase === 'choose' && pid === s.drawer ? s.choices.slice() : null,
      word: s.word && knows ? s.word : null,
      mask: s.word && s.phase === 'draw' ? maskWord(s.word, s.revealed) : null,
      lens: s.word ? wordLens(s.word) : null,
      endReason: s.endReason,
      chat: s.chat.filter(m => visible(s, m, pid)).slice(-45).map(m => ({ id: m.id, kind: m.kind, from: m.from, name: m.name, text: m.text, in: m.vis === 'in' ? 1 : 0, close: m.close ? 1 : 0, warn: m.warn ? 1 : 0, ans: m.ans ? 1 : 0 })),
    });
  } else {
    const n = s.order.length;
    Object.assign(v, {
      step: s.step, steps: s.steps, kind: s.phase === 'play' ? stepKind(s.step) : null,
      total: s.phase === 'play' ? stepMs(s, s.step) : 0,
      chains: s.order.slice(),
      players: s.players.map(p => ({ id: p.id, name: p.name, on: p.on, done: s.phase !== 'play' || (s.order.includes(p.id) && s.book[chainFor(s, p.id)][s.step] != null) })),
      reveal: s.reveal ? { ...s.reveal } : null,
    });
    if (s.phase === 'play' && s.order.includes(pid)) {
      const c = chainFor(s, pid), prev = s.step > 0 ? s.book[c][s.step - 1] : null;
      v.task = { c, kind: stepKind(s.step), done: s.book[c][s.step] != null, prompt: prev ? (prev.d ? { d: prev.d } : { t: prev.t }) : null };
    }
    if (s.phase === 'reveal' || s.phase === 'end') {
      v.reacts = {};
      for (const [key, box] of Object.entries(s.reacts)) {
        const [c, k] = key.split(':').map(Number); if (!revealed(s, c, k)) continue;
        const cnt = {}, mine = [];
        for (const [e, ids] of Object.entries(box)) { if (ids.length) cnt[e] = ids.length; if (ids.includes(pid)) mine.push(e); }
        v.reacts[key] = { n: cnt, mine };
      }
    }
    void n;
  }
  return v;
}
// Bảng xếp hạng (điểm cao trước)
export function ranking(players) { return players.slice().sort((a, b) => b.score - a.score); }
