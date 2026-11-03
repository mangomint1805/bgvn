// Luật Scribble it! – state machine thuần, JSON-serializable, không đụng giao diện.
//   createGame(players, opts, now) · applyAction(state, pid, action, now) -> {ok, reason}
//   viewFor(state, pid, now) · tick(state, now) -> true nếu state đổi
// Hai chế độ: 'guess' (đoán hình kiểu skribbl) và 'gartic' (Tam sao thất bản – chuyền câu ↔ hình).
import { isMatch, isNear, leaks, maskWord, letterIdx, wordLens } from './match.js?v=5';
import { buildPool, parseCustom, randomPrompt, DEFAULT_CATS, CATS } from './words.js?v=5';
import { cleanOps, pushOp, opsBytes, simplifyOps } from './ops.js?v=5';

let R = Math.random;
export function setRandom(f) { R = f || Math.random; }
export const rand = () => R();
const ri = n => Math.floor(R() * n);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const rid = () => Math.floor(R() * 36 ** 6).toString(36);

export const CHOOSE_MS = 15000, TURN_END_MS = 6000, GRACE_MS = 2000, OFF_SKIP_MS = 8000, OFF_GARTIC_MS = 10000, CHAT_MAX = 60;
export const REACTS = ['😂', '🔥', '💀', '😍', '👏'];
export const DEFAULT_OPTS = { mode: 'guess', gmode: 'normal', rounds: 3, drawTime: 80, textTime: 40, cats: DEFAULT_CATS.slice(), custom: [], onlyCustom: false, cSteps: 6, cTime: 60, cKinds: ['text', 'draw', 'text', 'draw', 'text', 'draw'], revealAuto: 5, frames: 0, fps: 4, gSize: 6 };
// Chiếu lại tự động: số giây mỗi bước (0 = tắt, chủ phòng bấm tay)
export const REVEAL_AUTO = [0, 3, 5, 8];
// Số khung: Hoạt hình / Phông nền 4–16 (0 = theo số người), Một mình 3–12 (0 = 5 khung)
export const FRAMES_ANIM = [4, 16], FRAMES_SOLO = [3, 12], SOLO_FRAMES = 5;
export const GSIZE = [4, 8];
// Các chế độ Tam sao thất bản (kiểu Gartic Phone). max: số người tối đa của chế độ.
export const GMODES = {
  normal: { icon: '📞', name: 'Bình thường', desc: 'Viết câu → vẽ lại → đoán lại… chuyền vòng tròn, cuối ván chiếu lại cười xỉu.' },
  speed: { icon: '⚡', name: 'Tốc chiến', desc: 'Y như Bình thường nhưng đồng hồ mỗi bước ngắn hơn hẳn – vẽ nhanh như chớp!' },
  knockoff: { icon: '👀', name: 'Nhìn trộm', desc: 'Sau câu đầu chỉ có vẽ: mỗi người được nhìn hình trước vài giây rồi bị che, vẽ lại theo trí nhớ, càng về sau càng ít giờ.' },
  sandwich: { icon: '🥪', name: 'Bánh mì kẹp', desc: 'Chỉ viết ở đầu và cuối, khúc giữa toàn chép lại hình người trước (xem thoáng qua) – xem câu cuối lệch câu gốc bao xa.' },
  secret: { icon: '🙈', name: 'Vẽ mù', desc: 'Đề bị che dần sau vài giây và khung vẽ giấu luôn nét của bạn khi đang vẽ – vẽ mù, đồng hồ nhanh.' },
  complement: { icon: '🖍️', name: 'Vẽ tiếp', desc: 'Bước đầu ai cũng vẽ vài nét bậy thật nhanh, người sau vẽ tiếp lên đó (nét cũ giữ làm nền, không xoá được), cuối ván mở cả tác phẩm.' },
  icebreaker: { icon: '🧊', name: 'Phá băng', desc: 'Mỗi người viết 1 câu hỏi, rồi cả bọn lần lượt vẽ câu trả lời cho các câu hỏi đó – giấu tới cuối mới chiếu ra để bàn tán.' },
  animation: { icon: '🎞️', name: 'Hoạt hình', desc: 'Mỗi bước vẽ 1 khung hình, thấy mờ khung trước để vẽ tiếp; cuối ván chiếu thành ảnh động, tải về GIF.' },
  background: { icon: '🏞️', name: 'Phông nền', desc: 'Như Hoạt hình nhưng khung đầu là phông nền cố định, mọi khung sau vẽ đè lên phông đó.' },
  solo: { icon: '🧑‍🎨', name: 'Một mình', desc: 'Tự vẽ một đoạn hoạt hình (mặc định 5 khung, chọn được 3–12, thấy mờ khung trước) – chơi một mình cũng được, không cần mạng.' },
  score: { icon: '🏆', name: 'Chấm điểm', desc: 'Như Bình thường, lúc chiếu lại cả bọn bấm 👍/👎 xem từng bước có khớp bước trước không; chuỗi giữ được ý gốc ăn thêm điểm.' },
  crowd: { icon: '🎉', name: 'Đông vui', desc: 'Cho phòng đông tới 30 người: chia thành nhóm nhỏ (mặc định ~6 người/nhóm), chuỗi chỉ chuyền trong nhóm, đồng hồ nhanh hơn, cuối ván chiếu lần lượt từng nhóm.', max: 30 },
  custom: { icon: '🛠️', name: 'Tuỳ chỉnh', desc: 'Chủ phòng tự chọn số bước, thời gian mỗi bước và kiểu từng bước (viết / vẽ / khung hoạt hình).' },
};
export const GMODE_KEYS = Object.keys(GMODES);
export const MAX_NORMAL = 12, MAX_CROWD = 30;
export const maxPlayers = o => o && o.mode === 'gartic' && o.gmode === 'crowd' ? MAX_CROWD : MAX_NORMAL;
const CKINDS = ['text', 'draw', 'frame'];
const clamp = (v, lo, hi, d) => { v = Math.round(+v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
export function cleanOpts(o = {}) {
  const custom = parseCustom(o.custom || []);
  const cats = Array.isArray(o.cats) ? o.cats.filter(k => CATS[k]) : DEFAULT_CATS.slice();
  const cSteps = clamp(o.cSteps, 2, 20, 6);
  const ck = Array.isArray(o.cKinds) ? o.cKinds : [];
  const cKinds = Array.from({ length: cSteps }, (_, i) => CKINDS.includes(ck[i]) ? ck[i] : i % 2 ? 'draw' : 'text');
  return {
    mode: o.mode === 'gartic' ? 'gartic' : 'guess',
    gmode: GMODES[o.gmode] ? o.gmode : 'normal',
    cSteps, cKinds, cTime: Math.round(clamp(o.cTime, 10, 180, 60) / 5) * 5,
    rounds: clamp(o.rounds, 1, 10, 3),
    drawTime: Math.round(clamp(o.drawTime, 30, 180, 80) / 5) * 5,
    textTime: clamp(o.textTime, 20, 90, 40),
    cats: cats.length || custom.length ? cats : DEFAULT_CATS.slice(),
    custom,
    onlyCustom: !!o.onlyCustom && custom.length >= 3,
    revealAuto: o.revealAuto != null && REVEAL_AUTO.includes(+o.revealAuto) ? +o.revealAuto : 5,
    frames: +o.frames > 0 ? clamp(o.frames, FRAMES_SOLO[0], FRAMES_ANIM[1], 0) : 0,
    fps: clamp(o.fps, 1, 12, 4),
    gSize: clamp(o.gSize, GSIZE[0], GSIZE[1], 6),
  };
}
// Đông vui: chia n người thành các nhóm ~size người (cỡ nhóm lệch nhau tối đa 1). Kiểu chơi khác: 1 nhóm.
export function groupSizes(n, o = {}) {
  if (!(o.gmode === 'crowd') || n <= 0) return [Math.max(0, n)];
  const size = clamp(o.gSize, GSIZE[0], GSIZE[1], 6), g = Math.max(1, Math.min(Math.round(n / size), Math.floor(n / GSIZE[0]))); // nhóm nào cũng ≥ 4 người
  return Array.from({ length: g }, (_, i) => Math.floor(n / g) + (i < n % g ? 1 : 0));
}
// số khung thực tế của Hoạt hình / Phông nền / Một mình
export function frameCount(o, n) {
  if (o.gmode === 'solo') return o.frames ? clamp(o.frames, FRAMES_SOLO[0], FRAMES_SOLO[1], SOLO_FRAMES) : SOLO_FRAMES;
  return o.frames ? clamp(o.frames, FRAMES_ANIM[0], FRAMES_ANIM[1], 6) : Math.max(n, 6);
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
// Mỗi ván có một "kế hoạch" s.plan: mỗi bước 1 mô tả
//   t: 'text' | 'draw' (người chơi nộp chữ hay hình) · role: kiểu bước (để giao diện hiện lời nhắc)
//   src: 'prev' (đề là kết quả bước trước) | 'first' (đề là câu hỏi ở bước 0) | null (tự do)
//   peek: ms được nhìn đề rồi bị che · mask: ms rồi che chữ đề (1 = che một phần, 2 = che hết qua maskKind)
//   onion: thấy mờ khung trước · layer: nền khoá (bước trước, hoặc bg: phông ở bước 0) · blind: không thấy nét của mình · ms
export const stepKind = k => k === 0 ? 'write' : k % 2 ? 'draw' : 'guess'; // (Bình thường – giữ cho tương thích)
const sec = x => Math.round(x / 1000) * 1000;
export function buildPlan(o, n) {
  const D = o.drawTime * 1000, T = o.textTime * 1000, g = o.gmode;
  const N = Math.max(n, 4);
  const W = (ms = T) => ({ t: 'text', role: 'write', src: null, ms });
  const DR = (ms = D, x = {}) => ({ t: 'draw', role: 'draw', src: 'prev', ms, ...x });
  const GU = (ms = T) => ({ t: 'text', role: 'guess', src: 'prev', ms });
  const alt = (len, d, t, x = {}) => Array.from({ length: len }, (_, k) => k === 0 ? W(t) : k % 2 ? DR(d, x.draw ? x.draw(k) : {}) : GU(t));
  if (g === 'speed') return alt(N, Math.max(15000, sec(D * 0.4)), Math.max(10000, sec(T * 0.4)));
  if (g === 'knockoff') return Array.from({ length: N }, (_, k) => k === 0 ? W() : k === 1 ? DR() : { t: 'draw', role: 'copy', src: 'prev', peek: 5000, ms: Math.max(15000, sec(D * Math.pow(0.82, k - 1))) });
  if (g === 'sandwich') return Array.from({ length: N }, (_, k) => k === 0 ? W() : k === 1 ? DR() : k === N - 1 ? GU() : { t: 'draw', role: 'copy', src: 'prev', peek: 5000, ms: D });
  if (g === 'secret') return alt(N, Math.max(20000, sec(D * 0.6)), Math.max(12000, sec(T * 0.7)), { draw: k => ({ blind: true, mask: 5000, maskAll: k % 4 === 3 }) });
  if (g === 'complement') return Array.from({ length: N }, (_, k) => k === 0 ? { t: 'draw', role: 'doodle', src: null, ms: 10000 } : { t: 'draw', role: 'extend', src: 'prev', layer: true, ms: D });
  if (g === 'icebreaker') return Array.from({ length: N }, (_, k) => k === 0 ? { t: 'text', role: 'question', src: null, ms: T } : { t: 'draw', role: 'answer', src: 'first', ms: D });
  if (g === 'animation' || g === 'background') {
    const F = frameCount(o, n), fm = Math.max(20000, sec(D * 0.5));
    return Array.from({ length: F }, (_, k) => k === 0 ? (g === 'background' ? { t: 'draw', role: 'bg', src: null, ms: D } : { t: 'draw', role: 'frame', src: null, ms: Math.max(fm, sec(D * 0.75)) })
      : { t: 'draw', role: 'frame', src: 'prev', onion: !(g === 'background' && k === 1), layer: g === 'background', bg: g === 'background', ms: fm });
  }
  if (g === 'solo') return Array.from({ length: frameCount(o, n) }, (_, k) => ({ t: 'draw', role: 'frame', src: k ? 'prev' : null, onion: k > 0, ms: Math.max(30000, sec(D * 0.75)) }));
  if (g === 'crowd') return alt(Math.max(4, Math.min(o.gSize || 6, ...groupSizes(n, o))), Math.max(20000, sec(D * 0.7)), Math.max(12000, sec(T * 0.7)));
  if (g === 'custom') {
    const ms = o.cTime * 1000, out = [];
    o.cKinds.forEach((kk, k) => {
      const pv = out[k - 1];
      if (kk === 'text') out.push(!pv ? W(ms) : pv.t === 'draw' ? GU(ms) : { t: 'text', role: 'retell', src: 'prev', ms });
      else if (kk === 'draw') out.push(!pv ? { t: 'draw', role: 'free', src: null, ms } : pv.t === 'text' ? DR(ms) : { t: 'draw', role: 'copy', src: 'prev', ms });
      else out.push({ t: 'draw', role: 'frame', src: pv ? 'prev' : null, onion: !!pv && pv.role === 'frame', ms });
    });
    return out;
  }
  return alt(N, D, T); // normal, score
}
function initGartic(s, now) {
  s.order = shuffle(s.players.map(p => p.id));
  const n = s.order.length;
  s.gmode = s.opts.gmode; s.rot = s.gmode !== 'solo';
  s.plan = buildPlan(s.opts, n); s.steps = s.plan.length; s.step = 0;
  let a = 0; s.groups = groupSizes(n, s.opts).map(g => { const r = [a, g]; a += g; return r; }); // [vị trí đầu trong order, số người]
  s.book = s.order.map(() => Array(s.steps).fill(null));
  s.sugg = s.order.map(() => randomPrompt(rand));
  s.reveal = null; s.reacts = {}; s.votes = {};
  s.phase = 'play'; s.deadline = now + stepMs(s, 0);
}
const stepMs = (s, k) => s.plan ? s.plan[k].ms : (stepKind(k) === 'draw' ? s.opts.drawTime : s.opts.textTime) * 1000;
const descOf = (s, k) => s.plan ? s.plan[k] : stepKind(k) === 'draw' ? { t: 'draw', role: 'draw', src: 'prev' } : { t: 'text', role: stepKind(k), src: k ? 'prev' : null };
// Chuỗi c ở bước k do order[(c + k) % n] làm -> người i làm chuỗi (i - k) mod n (chế độ Một mình: ai cũng làm chuỗi của mình)
// Đông vui: chuỗi chỉ xoay trong nhóm (nhóm = đoạn liên tiếp của order) -> chuỗi c ở bước k do người a + ((c - a + k) mod g) làm
export const groupsOf = s => s.groups || [[0, s.order.length]];
export const groupOf = (s, i) => { const gs = groupsOf(s); for (let j = 0; j < gs.length; j++) if (i >= gs[j][0] && i < gs[j][0] + gs[j][1]) return j; return 0; };
export function chainFor(s, pid, k = s.step) {
  const i = s.order.indexOf(pid); if (i < 0) return -1; if (s.rot === false) return i;
  const [a, g] = groupsOf(s)[groupOf(s, i)]; return a + ((i - a - k) % g + g) % g;
}
// Hình "hiện ra" của ô (c,k): bước có nền khoá = nền + nét mới
export function itemOps(s, c, k) {
  const it = s.book[c][k]; if (!it || !it.d) return null;
  const d = descOf(s, k); if (!d.layer) return it.d;
  const base = d.bg ? (s.book[c][0] && s.book[c][0].d) || [] : itemOps(s, c, k - 1) || [];
  return base.concat(it.d);
}
function baseFor(s, c, k) { const d = descOf(s, k); if (!d.layer || k === 0) return null; return d.bg ? (s.book[c][0] && s.book[c][0].d) || [] : itemOps(s, c, k - 1) || []; }
function gDone(s, now) {
  return s.order.every(id => {
    const p = pl(s, id); return s.book[chainFor(s, id)][s.step] != null || (!p.on && now - p.offAt >= OFF_GARTIC_MS);
  });
}
function cleanText(t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, 120); }
// nét của riêng bước có nền khoá: bỏ phần trước lần "xoá hết" cuối (xoá hết chỉ xoá nét của mình)
function ownOps(ops) { const list = []; for (const op of ops) pushOp(list, op); let i = -1; list.forEach((o, j) => { if (o.k === 'c') i = j; }); return list.slice(i + 1).filter(o => o.k !== 'c'); }
function submit(s, pid, a, now) {
  if (s.phase !== 'play') return { ok: false, reason: 'Chưa tới lúc nộp' };
  if (a.step !== s.step) return { ok: false, reason: 'Bước này đã qua rồi' };
  const c = chainFor(s, pid); if (c < 0) return { ok: false, reason: 'Bạn không có trong ván' };
  const d = descOf(s, s.step);
  if (d.t === 'draw') {
    let ops = cleanOps(a.ops);
    let lim = 150000;
    if (d.layer) { ops = ownOps(ops); lim = Math.max(20000, 160000 - opsBytes(baseFor(s, c, s.step) || [])); }
    if (opsBytes(ops) > lim) ops = simplifyOps(ops, lim - 8000);
    if (opsBytes(ops) > lim + 10000) return { ok: false, reason: 'Bức vẽ nặng quá, bớt nét chút nha' };
    s.book[c][s.step] = { by: pid, d: ops };
  } else {
    const t = cleanText(a.text); if (!t) return { ok: false, reason: 'Viết gì đó đi nè ✍️' };
    s.book[c][s.step] = { by: pid, t };
  }
  if (gDone(s, now)) advance(s, now);
  return { ok: true };
}
const QUESTIONS = ['Món ăn nào hợp với ngày mưa nhất?', 'Nếu được nghỉ 1 tháng bạn sẽ làm gì?', 'Siêu năng lực bạn muốn có?', 'Con vật giống bạn nhất?', 'Đi đâu chơi cuối tuần này?', 'Nghề nghiệp trong mơ hồi bé?', 'Thứ không thể thiếu khi đi du lịch?', 'Món quà sinh nhật tệ nhất có thể?'];
function fillMissing(s) {
  const k = s.step, d = descOf(s, k);
  s.order.forEach(id => {
    const c = chainFor(s, id, k); if (s.book[c][k]) return;
    s.book[c][k] = d.t === 'draw' ? { by: id, d: [], miss: 1 } : d.role === 'write' ? { by: id, t: randomPrompt(rand), miss: 1 } : d.role === 'question' ? { by: id, t: QUESTIONS[ri(QUESTIONS.length)], miss: 1 } : { by: id, t: '🤷 (không kịp đoán)', miss: 1 };
  });
}
function advance(s, now) {
  fillMissing(s);
  s.step++;
  if (s.step >= s.steps) { s.phase = 'reveal'; s.reveal = { c: 0, u: 0, auto: s.opts.revealAuto || 0, paused: false, ms: 0 }; schedule(s, now); return; }
  s.deadline = now + stepMs(s, s.step);
}
function tickGartic(s, now) {
  if (s.phase === 'reveal') { // chiếu lại tự động
    const r = s.reveal; if (!r.auto || r.paused || !s.deadline || now < s.deadline) return false;
    nextReveal(s, now); return true;
  }
  if (s.phase !== 'play') return false;
  if (gDone(s, now) || now >= s.deadline + GRACE_MS) { advance(s, now); return true; }
  return false;
}
const revealed = (s, c, k) => s.phase === 'end' || (s.phase === 'reveal' && (c < s.reveal.c || (c === s.reveal.c && k <= s.reveal.u)));
// thời gian dừng ở ô đang chiếu: ô cuối chuỗi dừng gấp đôi (xem lại cả chuỗi, phim, thả cảm xúc)
const revealMs = s => s.reveal.auto * 1000 * (s.reveal.u >= s.steps - 1 ? 2 : 1);
function schedule(s, now) {
  const r = s.reveal; if (!r) return;
  if (s.phase !== 'reveal' || !r.auto || r.paused) { s.deadline = 0; r.ms = 0; return; }
  r.ms = revealMs(s); s.deadline = now + r.ms;
}
function nextReveal(s, now) {
  const r = s.reveal;
  if (r.u < s.steps - 1) r.u++;
  else if (r.c < s.order.length - 1) { r.c++; r.u = 0; }
  else s.phase = 'end';
  schedule(s, now);
}
// Đông vui: bỏ qua phần còn lại của nhóm đang chiếu
function skipGroup(s, now) {
  const r = s.reveal, gs = groupsOf(s), j = groupOf(s, r.c);
  if (j >= gs.length - 1) s.phase = 'end'; else { r.c = gs[j + 1][0]; r.u = 0; }
  schedule(s, now);
}
function parseKey(s, key) { const m = /^(\d+):(\d+)$/.exec(String(key || '')); if (!m) return null; const c = +m[1], k = +m[2]; return c < s.order.length && k < s.steps ? [c, k] : null; }
function react(s, pid, a) {
  const ck = parseKey(s, a.key); if (!ck || !REACTS.includes(a.e)) return { ok: false, reason: 'Cảm xúc lạ quá' };
  if (!revealed(s, ck[0], ck[1])) return { ok: false, reason: 'Chưa lật tới đó' };
  const box = s.reacts[a.key] = s.reacts[a.key] || {};
  const arr = box[a.e] = box[a.e] || [];
  const i = arr.indexOf(pid); if (i >= 0) arr.splice(i, 1); else arr.push(pid);
  return { ok: true, added: i < 0 };
}
// Chấm điểm: 👍 (khớp bước trước) / 👎 (lệch) cho từng bước từ bước 2 trở đi
function vote(s, pid, a) {
  if (s.gmode !== 'score') return { ok: false, reason: 'Chế độ này không chấm điểm' };
  const ck = parseKey(s, a.key); if (!ck || ck[1] < 1) return { ok: false, reason: 'Không chấm ô này được' };
  if (!revealed(s, ck[0], ck[1])) return { ok: false, reason: 'Chưa lật tới đó' };
  const it = s.book[ck[0]][ck[1]]; if (!it || it.by === pid) return { ok: false, reason: 'Không tự chấm mình được 😜' };
  const v = a.v === 1 ? 1 : a.v === -1 ? -1 : 0;
  const box = s.votes[a.key] = s.votes[a.key] || {};
  if (!v || box[pid] === v) delete box[pid]; else box[pid] = v;
  return { ok: true };
}
export const VOTE_PTS = 100, CHAIN_BONUS = 200;
// Bảng điểm chế độ Chấm điểm: +100 mỗi 👍 vào bước của mình; chuỗi giữ được ý gốc (câu cuối khớp câu đầu, hoặc mọi bước đều được 👍 nhiều hơn 👎) thì mọi người góp mặt +200
export function garticScores(s) {
  const pts = Object.fromEntries(s.players.map(p => [p.id, 0])), kept = [];
  s.book.forEach((chain, c) => {
    let allUp = true, anyVote = false;
    for (let k = 1; k < s.steps; k++) {
      const box = s.votes[c + ':' + k] || {}, vs = Object.values(box); const up = vs.filter(x => x > 0).length, dn = vs.length - up;
      if (vs.length) anyVote = true; if (up <= dn) allUp = false;
      const it = chain[k]; if (it && pts[it.by] != null) pts[it.by] += up * VOTE_PTS;
    }
    const first = chain[0], last = chain[s.steps - 1];
    const same = first && last && first.t && last.t && !last.miss && (isMatch(last.t, first.t) || isNear(last.t, first.t));
    const ok = same || (anyVote && allUp);
    kept.push(!!ok);
    if (ok) for (const id of new Set(chain.filter(Boolean).map(it => it.by))) if (pts[id] != null) pts[id] += CHAIN_BONUS;
  });
  return { pts, kept };
}
// Toàn bộ album (gửi riêng cho máy khách khi bắt đầu chiếu lại)
export function bookItems(s) {
  if (s.mode !== 'gartic') return [];
  const out = [];
  s.book.forEach((chain, c) => chain.forEach((it, k) => { if (it) out.push({ key: c + ':' + k, by: it.by, ...(it.d ? { d: itemOps(s, c, k) } : { t: it.t }), ...(it.miss ? { miss: 1 } : {}) }); }));
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
    if (a.type === 'vote') return vote(s, pid, a);
    if (a.type === 'next' || a.type === 'skipGroup' || a.type === 'autoReveal' || a.type === 'pause') {
      if (pid !== s.host) return { ok: false, reason: 'Chỉ chủ phòng điều khiển phần chiếu' };
      if (s.phase !== 'reveal') return { ok: false, reason: 'Chưa tới lúc chiếu' };
      const r = s.reveal;
      if (a.type === 'next') nextReveal(s, now);
      else if (a.type === 'skipGroup') skipGroup(s, now);
      else if (a.type === 'autoReveal') {
        if (!REVEAL_AUTO.includes(+a.sec)) return { ok: false, reason: 'Số giây không hợp lệ' };
        r.auto = +a.sec; if (r.auto) r.paused = false; schedule(s, now);
      } else {
        if (!r.auto) return { ok: false, reason: 'Đang chiếu tay, không cần tạm dừng' };
        r.paused = !!a.on; schedule(s, now);
      }
      return { ok: true };
    }
    if (a.type === 'skipReveal') {
      if (pid !== s.host || s.phase !== 'reveal') return { ok: false, reason: 'Không được' };
      s.phase = 'end'; s.deadline = 0; return { ok: true };
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
  const v = { gid: s.gid, mode: s.mode, phase: s.phase, host: s.host, me: pid, opts: { rounds: s.opts.rounds, drawTime: s.opts.drawTime, textTime: s.opts.textTime, fps: s.opts.fps || 4 }, left };
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
      gmode: s.gmode || 'normal', plan: Array.from({ length: s.steps }, (_, k) => descOf(s, k).role), rot: s.rot !== false,
      step: s.step, steps: s.steps, kind: s.phase === 'play' ? descOf(s, s.step).role : null,
      total: s.phase === 'play' ? stepMs(s, s.step) : s.phase === 'reveal' && s.deadline ? s.reveal.ms : 0,
      chains: s.order.slice(), groups: groupsOf(s).map(g => g.slice()),
      players: s.players.map(p => ({ id: p.id, name: p.name, on: p.on, done: s.phase !== 'play' || (s.order.includes(p.id) && s.book[chainFor(s, p.id)][s.step] != null) })),
      reveal: s.reveal ? { ...s.reveal } : null,
    });
    if (s.phase === 'play' && s.order.includes(pid)) {
      const k = s.step, c = chainFor(s, pid), d = descOf(s, k);
      const src = d.src === 'first' ? s.book[c][0] : d.src === 'prev' && k > 0 ? s.book[c][k - 1] : null;
      const desc = { t: d.t, role: d.role }; for (const f of ['peek', 'mask', 'maskAll', 'onion', 'layer', 'blind']) if (d[f]) desc[f] = d[f];
      v.task = { c, kind: d.t === 'text' && d.role !== 'write' && d.role !== 'question' && d.role !== 'retell' ? 'guess' : d.t === 'text' ? 'write' : 'draw', role: d.role, desc, done: s.book[c][k] != null,
        prompt: src ? (src.d ? { d: d.src === 'first' ? src.d : itemOps(s, c, k - 1) } : { t: src.t }) : null };
      if (d.layer) v.task.base = baseFor(s, c, k);
      if (d.onion && k > 0 && s.book[c][k - 1] && s.book[c][k - 1].d) v.task.onion = s.book[c][k - 1].d;
      if (d.layer || d.onion) delete v.task.prompt; // khung trước đã hiện qua nền / lớp mờ
      if (!d.src && d.t === 'draw') v.task.sugg = s.sugg[c];
      if (s.rot === false) v.task.frame = k + 1;
    }
    if (s.gmode === 'score' && (s.phase === 'reveal' || s.phase === 'end')) {
      v.votes = {};
      for (const [key, box] of Object.entries(s.votes)) { const [c, k] = key.split(':').map(Number); if (!revealed(s, c, k)) continue; const vs = Object.values(box); v.votes[key] = { up: vs.filter(x => x > 0).length, down: vs.filter(x => x < 0).length, mine: box[pid] || 0 }; }
      const sc = garticScores(s); v.scores = sc.pts; v.kept = sc.kept.map((x, c) => s.phase === 'end' || c < s.reveal.c ? x : null);
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
// ======================= CÂU CHỌC GÕ TỰ DO (bảng thả emoji) =======================
// Làm sạch: bỏ thẻ HTML / ký tự điều khiển, gộp khoảng trắng, tối đa TEASE_MAX ký tự.
export const TEASE_MAX = 40;
export function cleanTease(raw) {
  return [...String(raw == null ? '' : raw).replace(/<[^>]*>?/g, ' ').replace(/[<>]/g, '').replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim()].slice(0, TEASE_MAX).join('').trim();
}
// câu có lộ (chứa / đúng / gần đúng) 1 trong các đáp án không – dùng đúng bộ so khớp của Đoán hình
export const leaksAny = (text, answers) => answers.some(a => a && (leaks(text, a) || isMatch(text, a) || isNear(text, a)));
// Chủ phòng kiểm câu chọc tự do của pid. Trả về:
//   { ok: true, text }                        -> phát cho cả phòng (bong bóng cạnh thẻ người gửi)
//   { ok: false, reason }                     -> không phát, báo nhẹ cho người gửi
//   { ok: false, silent: true }               -> không phát, KHÔNG báo gì (báo là lộ luôn đáp án cho người chưa đoán)
//   { ok: false, guess: true, text }          -> người chưa đoán gõ trúng / gần trúng: chuyển thành lượt đoán
export function checkTease(s, pid, raw) {
  const text = cleanTease(raw);
  if (!text) return { ok: false, reason: 'Câu trống' };
  if (!s || !pl(s, pid)) return { ok: true, text };
  if (s.mode === 'guess') {
    if (s.phase === 'choose' && pid === s.drawer && leaksAny(text, s.choices || [])) return { ok: false, reason: 'Câu này lộ đáp án rồi 🤫' };
    if (s.phase !== 'draw' || !s.word) return { ok: true, text };
    if (!leaksAny(text, [s.word])) return { ok: true, text };
    if (pid === s.drawer || s.guessed[pid] != null) return { ok: false, reason: 'Câu này lộ đáp án rồi 🤫' };
    if (isMatch(text, s.word) || isNear(text, s.word)) return { ok: false, guess: true, text };
    return { ok: false, silent: true };
  }
  // Tam sao thất bản: đang chơi thì không được tiết lộ câu đề / câu của chuỗi mình đang làm (người sau còn phải đoán)
  if (s.mode === 'gartic' && s.phase === 'play') {
    const c = chainFor(s, pid); if (c < 0) return { ok: true, text };
    const texts = s.book[c].filter(it => it && it.t && !it.miss).map(it => it.t);
    if (leaksAny(text, texts)) return { ok: false, reason: 'Câu này lộ đề rồi 🤫 – để dành lúc chiếu lại nha' };
  }
  return { ok: true, text };
}

// Bảng xếp hạng (điểm cao trước)
export function ranking(players) { return players.slice().sort((a, b) => b.score - a.score); }
