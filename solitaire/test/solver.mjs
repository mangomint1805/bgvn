// Test bộ giải Klondike: ván dễ đã biết phải giải được, lời giải chơi lại phải thắng; ván chắc chắn thua phải báo 'lose'.
import { VARIANTS, newGame } from '../js/variants.js?v=1';
import { apply, RANKS, SUITS } from '../js/core.js?v=1';
import { solve } from '../js/solver.js?v=1';

const V = VARIANTS.klondike; let fail = 0;
const C = t => RANKS.indexOf(t.slice(0, -1)) + 13 * SUITS.indexOf(t.slice(-1));
const L = str => (str ? str.split(' ').map(C) : []);
function S(piles, o = {}, x = {}) { const s = newGame('klondike', o, 1); const p = {}; for (const k in s.p) p[k] = { c: [], d: 0 }; for (const k in piles) { const v = piles[k]; p[k] = typeof v === 'string' ? { c: L(v), d: 0 } : { c: L(v[0]), d: v[1] }; } return { ...s, p, x: { ...s.x, ...x } }; }
function check(name, s, expect, budget = { maxMs: 10000, maxNodes: 300000 }) {
  const r = solve(V, s, budget); let replay = '';
  if (r.res === 'win') { let c = s; for (const m of r.moves) { c = apply(V, c, m); if (!c) { replay = ' (lời giải KHÔNG hợp lệ!)'; break; } } if (c && !V.won(c)) replay = ' (chơi lại KHÔNG thắng!)'; }
  const good = expect.split('|').includes(r.res) && !replay; if (!good) fail++;
  console.log(`${good ? '✓' : '✗'} ${name}: ${r.res}${r.res === 'win' ? ` ${r.moves.length} nước` : ''} – ${r.nodes} thế, ${r.ms}ms${replay}`);
  return r;
}
const near = {}; [0, 1, 2, 3].forEach(i => { near['f' + i] = RANKS.slice(0, 8).map(r => r + SUITS[i]).join(' '); });
check('Sắp thắng (vài lá úp + nọc)', S({ ...near, t0: ['K♠ Q♥ 9♣', 2], t1: ['K♥ J♠ 10♦', 1], t2: 'Q♠ J♥', s: ['10♠ 9♥ 9♦ J♣ 10♣ Q♦ K♣ K♦ 9♠ J♦ Q♣ 10♥', 12] }), 'win');
check('Sắp thắng – rút 3', S({ ...near, t0: ['K♠ Q♥ 9♣', 2], t1: ['K♥ J♠ 10♦', 1], t2: 'Q♠ J♥', s: ['10♠ 9♥ 9♦ J♣ 10♣ Q♦ K♣ K♦ 9♠ J♦ Q♣ 10♥', 12] }, { draw: 3 }), 'win');
// Thế bế tắc thật: 7 cột đều có bài, lá ngửa toàn đen (không xếp lên nhau được), các lá 6 nằm úp dưới đáy.
function stuck(waste, o, x) {
  const f = {}; [0, 1, 2, 3].forEach(i => { f['f' + i] = RANKS.slice(0, 5).map(r => r + SUITS[i]).join(' '); });
  const tops = ['K♠', 'K♣', 'Q♠', 'Q♣', 'J♠', 'J♣', '8♠'], used = new Set([...Object.values(f).join(' ').split(' '), ...tops, ...waste]);
  const rest = []; for (const su of SUITS) for (const r of RANKS) if (!used.has(r + su)) rest.push(r + su);
  const piles = { ...f, w: waste.join(' ') };
  tops.forEach((t, i) => { const under = rest.filter((_, j) => j % 7 === i); piles['t' + i] = [[...under, t].join(' '), under.length]; });
  return S(piles, o, x);
}
check('Bế tắc: không còn nước nào', stuck([], { draw: 1, score: 1 }), 'lose');
check('Vegas rút 1: hết lượt lật nọc, 6♥ kẹt dưới bãi → thua', stuck(['6♥', '9♥'], { draw: 1, score: 2 }, { pass: 1 }), 'lose');
let solved = 0; const N = 12;
for (let n = 1; n <= N; n++) { const r = check(`Ván #${n} (rút 1)`, newGame('klondike', { draw: 1 }, n), 'win|unknown|lose', { maxMs: 4000, maxNodes: 100000 }); if (r.res === 'win') solved++; }
console.log(`Giải được ${solved}/${N} ván ngẫu nhiên trong 4s/ván`);
console.log(fail ? `${fail} lỗi` : 'Tất cả đạt'); process.exit(fail ? 1 : 0);
