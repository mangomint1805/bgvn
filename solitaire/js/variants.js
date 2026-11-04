// Klondike (kiểu Solitaire cổ điển của Windows): deal / pick / drop / stock / won / layout + cách tính điểm
import {
  rk, makeDeck, shuffle, pile, top, own, flipTops, idsOf, mulberry32, hashStr, fork,
  altDown, isSeq, foundAccepts, safeAlt,
} from './core.js?v=1';

const G = 1.12; // bước cột (đơn vị = bề ngang lá)
const R = 1.24; // hàng cột bài nằm dưới hàng đích (đơn vị = chiều cao lá)
const range = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const W = n => n * G - (G - 1);
const lastOnly = (s, id, i) => i === s.p[id].c.length - 1;

// Tính điểm: 0 = không tính, 1 = Tiêu chuẩn, 2 = Vegas (điểm ảo, không cá cược)
export const SCORE_NONE = 0, SCORE_STD = 1, SCORE_VEGAS = 2;
// Vegas giới hạn số vòng lật nọc: rút 1 → chỉ 1 vòng, rút 3 → 3 vòng
const maxPass = o => (o.score === SCORE_VEGAS ? (o.draw === 3 ? 3 : 1) : Infinity);

const klondike = {
  id: 'klondike', name: 'Klondike', vn: 'Xếp bài cổ điển', icon: '🃏', decks: 1,
  opts: {
    draw: { label: 'Rút', vals: [1, 3], names: ['Rút 1', 'Rút 3'], def: 1 },
    score: { label: 'Tính điểm', vals: [1, 2, 0], names: ['Tiêu chuẩn', 'Vegas', 'Không tính điểm'], def: 1 },
  },
  deal(rnd) {
    const p = {}, k = {};
    for (const [id, kind] of [['s', 'stock'], ['w', 'waste'], ...range(4, i => ['f' + i, 'found']), ...range(7, i => ['t' + i, 'tab'])]) { p[id] = pile(); k[id] = kind; }
    const d = shuffle(makeDeck(), rnd);
    for (let i = 0; i < 7; i++) { p['t' + i].c = d.splice(0, i + 1); p['t' + i].d = i; }
    p.s.c = d; p.s.d = d.length;
    return { p, k, x: { pass: 1 } };
  },
  pick(s, id, i) { const k = s.k[id]; if (k === 'tab') return isSeq(s.p[id], i, altDown); return (k === 'waste' || k === 'found') && lastOnly(s, id, i); },
  drop(s, f, i, t) {
    const k = s.k[t], card = s.p[f].c[i], T = s.p[t];
    if (k === 'found') return s.k[f] !== 'found' && s.p[f].c.length - i === 1 && foundAccepts(T, card);
    if (k === 'tab') return T.c.length ? T.d < T.c.length && altDown(top(T), card) : rk(card) === 12;
    return false;
  },
  canStock: s => s.p.s.c.length > 0 || (s.p.w.c.length > 0 && (s.x.pass || 1) < maxPass(s.o)),
  stock(n) {
    const S = own(n, 's'), Wp = own(n, 'w');
    if (S.c.length) { const k = Math.min(n.o.draw || 1, S.c.length); for (let j = 0; j < k; j++) Wp.c.push(S.c.pop()); }
    else { S.c = Wp.c.reverse(); Wp.c = []; n.x.pass = (n.x.pass || 1) + 1; }
    S.d = S.c.length; Wp.d = 0;
  },
  won: s => idsOf(s, 'found').every(id => s.p[id].c.length === 13),
  safe: safeAlt(1), link: altDown,
  xkey: s => (s.o.score === SCORE_VEGAS ? s.x.pass : ''),
  layout(s) {
    return { W: W(7), H: R + 3.3, piles: [
      { id: 's', x: 0, y: 0, fan: 'n', lab: '↻' }, { id: 'w', x: G, y: 0, fan: 'w', show: s.o.draw || 1 },
      ...range(4, i => ({ id: 'f' + i, x: (3 + i) * G, y: 0, fan: 'n', lab: 'A' })),
      ...range(7, i => ({ id: 't' + i, x: i * G, y: R, fan: 'd', lab: 'K' }))] };
  },
  // điểm cộng/trừ của 1 nước (kiểu Windows). Trừ điểm theo thời gian & thưởng khi thắng tính ở giao diện.
  scoreMove(s, n, m) {
    const sc = s.o.score;
    if (sc === SCORE_VEGAS) { if (m.k) return 0; return s.k[m.t] === 'found' ? 5 : s.k[m.f] === 'found' ? -5 : 0; }
    if (sc !== SCORE_STD) return 0;
    if (m.k) { if (s.p.s.c.length) return 0; return s.o.draw === 3 ? (n.x.pass > 3 ? -20 : 0) : -100; }
    const kf = s.k[m.f], kt = s.k[m.t]; let d = 0;
    if (kt === 'found') d += 10; else if (kf === 'waste' && kt === 'tab') d += 5; else if (kf === 'found') d -= 15;
    const down = x => idsOf(x, 'tab').reduce((a, id) => a + x.p[id].d, 0);
    if (down(n) < down(s)) d += 5;
    return d;
  },
};
export const scoreStart = o => (o.score === SCORE_VEGAS ? -52 : 0);
export const passesLeft = s => { const mp = maxPass(s.o); return mp === Infinity ? null : Math.max(0, mp - (s.x.pass || 1)); };
// thưởng thời gian khi thắng (Tiêu chuẩn): 700000 / số giây, chỉ khi chơi ≥ 30 giây
export const timeBonus = (o, ms) => (o.score === SCORE_STD && ms >= 30000 ? Math.floor(700000 / Math.floor(ms / 1000)) : 0);
// trừ 2 điểm mỗi 10 giây (Tiêu chuẩn), điểm không xuống dưới 0
export const liveScore = (o, base, ms) => (o.score === SCORE_STD ? Math.max(0, base - 2 * Math.floor(ms / 10000)) : base);

export const VARIANTS = { klondike };
export const ORDER = Object.keys(VARIANTS);
export function defaultOpts(V) { const o = {}; for (const [k, d] of Object.entries(V.opts || {})) o[k] = d.def; return o; }
export function optsKey(V, o) { return V.id + Object.keys(V.opts || {}).map(k => '-' + (o[k] ?? V.opts[k].def)).join(''); }
export function optsName(V, o) { return Object.entries(V.opts || {}).map(([k, d]) => d.names[d.vals.indexOf(o[k] ?? d.def)]).join(' · '); }

// ván mới: seed = số ván (cùng số → cùng cách chia, bất kể tuỳ chọn rút/điểm)
export function newGame(id = 'klondike', o = {}, seed = 1) {
  const V = VARIANTS[id]; const opts = { ...defaultOpts(V), ...o };
  const rnd = mulberry32((Math.imul(seed, 2654435761) ^ hashStr(V.id)) >>> 0);
  const s0 = V.deal(rnd, opts, seed); s0.v = id; s0.o = opts; s0.seed = seed;
  const s = fork(s0); (V.after || flipTops)(s); return s;
}
