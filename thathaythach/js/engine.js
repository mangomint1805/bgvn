// 🎯 Thật hay Thách – luật chơi (thuần logic, chạy ở máy chủ phòng).
// Mỗi lượt: người tới lượt chọn Thật / Thách / Ngẫu nhiên → rút một câu → "Xong" hoặc "Bỏ qua" → tới người kế.
import { TOPICS, CARDS, LEVELS } from './cards.js?v=1';
export { TOPICS, LEVELS };
export const DEFAULT_OPTS = { topics: ['banbe', 'haihuoc', 'hocduong'], level: 2, order: 'turn', rounds: 5, skips: 2, custom: [] };
export const CHOICES = { level: [1, 2, 3], order: ['turn', 'random'], rounds: [3, 5, 8, 0], skips: [0, 1, 2, 3, -1] }; // rounds 0 = chơi tới khi chủ phòng kết thúc · skips -1 = không giới hạn
export const MAX_CUSTOM = 40, MAX_TEXT = 140;
const TOPIC_IDS = TOPICS.map(t => t.id);
export function optOk(k, v) {
  if (k === 'topics') return Array.isArray(v) && v.length >= 1 && v.every(x => TOPIC_IDS.includes(x)) && new Set(v).size === v.length;
  if (k === 'custom') return Array.isArray(v) && v.length <= MAX_CUSTOM && v.every(c => c && (c.k === 't' || c.k === 'd') && typeof c.text === 'string' && c.text.trim().length >= 3 && c.text.length <= MAX_TEXT);
  return k in CHOICES && CHOICES[k].includes(v);
}
// các câu dùng được theo luật bàn
export function pool(opts, kind) {
  const out = [];
  for (const tp of opts.topics || []) (CARDS[tp]?.[kind] || []).forEach(([lv, text], i) => { if (lv <= opts.level) out.push({ id: `${tp}.${kind}${i}`, k: kind, tp, lv, text }); });
  (opts.custom || []).forEach((c, i) => { if (c.k === kind) out.push({ id: `tuviet.${kind}${i}`, k: kind, tp: 'tuviet', lv: 1, text: c.text.trim() }); });
  return out;
}
export const countCards = opts => ({ t: pool(opts, 't').length, d: pool(opts, 'd').length });
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function createGame(players, opts) {
  const o = { ...DEFAULT_OPTS, ...opts };
  const n = countCards(o); if (!n.t || !n.d) throw new Error('Bộ câu hỏi đang trống – chọn thêm chủ đề nhé.');
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'choose', opts: o,
    players: players.map(p => ({ id: p.id, name: p.name, local: !!p.local, t: 0, d: 0, skip: 0, left: o.skips })),
    queue: [], cur: null, round: 0, turnNo: 0, card: null, swapped: false, used: [], last: null, log: [],
  };
  advance(s); return s;
}
const pOf = (s, id) => s.players.find(p => p.id === id);
function advance(s) {
  if (!s.queue.length) { // hết một vòng
    if (s.opts.rounds && s.round >= s.opts.rounds) { s.phase = 'ended'; s.cur = null; s.card = null; return; }
    s.round++; const ids = s.players.map(p => p.id);
    if (s.opts.order === 'random') { shuffle(ids); if (ids.length > 1 && ids[0] === s.cur) ids.push(ids.shift()); /* không để một người bị gọi 2 lần liền */ }
    s.queue = ids;
  }
  s.cur = s.queue.shift(); s.turnNo++; s.phase = 'choose'; s.card = null; s.swapped = false;
}
function draw(s, kind) {
  const all = pool(s.opts, kind); let rest = all.filter(c => !s.used.includes(c.id) && (!s.card || c.id !== s.card.id));
  if (!rest.length) { s.used = s.used.filter(id => !all.some(c => c.id === id)); rest = all.filter(c => !s.card || c.id !== s.card.id); if (!rest.length) rest = all; } // hết câu mới: xào lại bộ
  const c = rest[Math.floor(Math.random() * rest.length)]; s.used.push(c.id);
  const others = s.players.filter(p => p.id !== s.cur), who = others.length ? others[Math.floor(Math.random() * others.length)].name.replace(' 🤖', '') : 'người bên cạnh';
  s.card = { id: c.id, k: c.k, tp: c.tp, lv: c.lv, text: c.text.replace(/\{ai\}/g, who) };
}
function finish(s, res) {
  const p = pOf(s, s.cur);
  s.last = { id: p.id, name: p.name, k: s.card ? s.card.k : null, text: s.card ? s.card.text : '', res, n: s.turnNo };
  if (s.card) { s.log.push(s.last); if (s.log.length > 60) s.log.shift(); }
  advance(s);
}
export function applyAction(s, pid, a) {
  if (!a || s.phase === 'ended') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (a.type === 'end') { if (pid !== 'host') return { ok: false, reason: 'Chỉ chủ phòng kết thúc được.' }; s.phase = 'ended'; s.cur = null; s.card = null; s.seq++; return { ok: true }; }
  if (a.type === 'pass') { if (pid !== s.cur && pid !== 'host') return { ok: false, reason: 'Chưa tới lượt bạn.' }; finish(s, 'pass'); s.seq++; return { ok: true }; } // người rớt mạng / chủ phòng cho qua lượt: không tính gì
  if (pid !== s.cur) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const p = pOf(s, pid);
  if (a.type === 'pick') {
    if (s.phase !== 'choose') return { ok: false, reason: 'Bạn đã rút câu rồi.' };
    const k = a.kind === 'r' ? (Math.random() < .5 ? 't' : 'd') : a.kind; if (k !== 't' && k !== 'd') return { ok: false };
    draw(s, k); s.phase = 'card';
  } else if (a.type === 'swap') {
    if (s.phase !== 'card') return { ok: false }; if (s.swapped) return { ok: false, reason: 'Mỗi lượt chỉ được đổi câu 1 lần thôi.' };
    draw(s, s.card.k); s.swapped = true;
  } else if (a.type === 'done') {
    if (s.phase !== 'card') return { ok: false }; p[s.card.k]++; finish(s, 'done');
  } else if (a.type === 'skip') {
    if (s.phase !== 'card') return { ok: false };
    if (p.left === 0) return { ok: false, reason: 'Hết lượt bỏ qua rồi – phải làm thôi 😆' };
    if (p.left > 0) p.left--; p.skip++; finish(s, 'skip');
  } else return { ok: false };
  s.seq++; return { ok: true };
}
export const actors = s => s.phase === 'ended' || !s.cur ? [] : [s.cur];
export const awayAction = () => ({ type: 'pass' }); // người rớt mạng tới lượt: tự cho qua
export function viewFor(s) { const { used, queue, ...v } = s; return { ...v, next: queue[0] || null, awards: s.phase === 'ended' ? awards(s) : null }; }
// danh hiệu cuối buổi (chỉ để vui, không có thắng thua)
export function awards(s) {
  const top = (f, min = 1) => { const m = Math.max(...s.players.map(f)); return m >= min ? s.players.filter(p => f(p) === m).map(p => p.id) : []; };
  return { brave: top(p => p.d), honest: top(p => p.t), dodge: top(p => p.skip), allin: s.players.filter(p => p.skip === 0 && p.t + p.d > 0).map(p => p.id) };
}
