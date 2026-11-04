// Unit test luật Xếp bài cổ điển (Klondike) + tính điểm: node solitaire/test/unit.mjs
import { VARIANTS, newGame, scoreStart, liveScore, timeBonus } from '../js/variants.js?v=1';
import { apply, canMove, legalMoves, autoMoves, greedyFinish, RANKS, SUITS, cardCount } from '../js/core.js?v=1';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  ✗', msg); } };
// '10♥' → mã lá; thêm '#1' để lấy bản sao bộ thứ 2
const C = t => { const [n, cp] = t.split('#'); const r = RANKS.indexOf(n.slice(0, -1)), s = SUITS.indexOf(n.slice(-1)); if (r < 0 || s < 0) throw new Error('bad card ' + t); return (+cp || 0) * 52 + s * 13 + r; };
const L = str => (str ? str.split(' ').map(C) : []);
// dựng state: lấy ván thật rồi ghi đè các chồng (chồng không nêu → rỗng)
function S(id, piles, o = {}, x = {}) {
  const s = newGame(id, o, 1); const p = {};
  for (const k in s.p) p[k] = { c: [], d: 0 };
  for (const k in piles) { const v = piles[k]; p[k] = typeof v === 'string' ? { c: L(v), d: 0 } : { c: L(v[0]), d: v[1] }; }
  return { ...s, p, x: { ...s.x, ...x } };
}
const mv = (f, i, t) => ({ f, i, t });
function T(name, fn) { const b = fail; fn(); console.log((fail === b ? '✓ ' : '✗ ') + name); }

T('Klondike', () => {
  const V = VARIANTS.klondike;
  let s = S('klondike', { t0: '10♠', t1: '9♥', t2: '9♣', t3: 'K♦', t4: 'Q♠ J♥', w: 'A♥', f0: '' });
  ok(canMove(V, s, mv('t1', 0, 't0')), '9♥ lên 10♠');
  ok(!canMove(V, s, mv('t2', 0, 't0')), '9♣ không lên 10♠ (cùng màu)');
  ok(canMove(V, s, mv('t3', 0, 't5')), 'K vào cột trống');
  ok(!canMove(V, s, mv('t1', 0, 't5')), '9 không vào cột trống');
  ok(canMove(V, s, mv('t4', 0, 't3')), 'bê dây Q♠ J♥ lên K♦');
  ok(canMove(V, s, mv('w', 0, 'f0')), 'A lên đích trống');
  ok(!canMove(V, s, mv('t1', 0, 'f0')), '9 không lên đích trống');
  s = S('klondike', { t0: [ '3♣ 5♥', 1 ], t1: '6♠' });
  const n = apply(V, s, mv('t0', 1, 't1')); ok(n && n.p.t0.d === 0 && n.p.t0.c.length === 1, 'tự lật lá úp sau khi đi');
  ok(s.p.t0.c.length === 2, 'state cũ không bị sửa (bất biến)');
  s = S('klondike', { s: ['A♠ 2♠ 3♠ 4♠', 4] }, { draw: 3 });
  let a = apply(V, s, { k: 'stock' }); ok(a.p.w.c.length === 3 && a.p.s.c.length === 1, 'rút 3');
  a = apply(V, apply(V, a, { k: 'stock' }), { k: 'stock' }); ok(a.p.s.c.length === 4 && a.p.w.c.length === 0 && a.p.s.d === 4, 'hết nọc thì lật lại');
  ok(a.p.s.c.join() === s.p.s.c.join(), 'lật lại giữ đúng thứ tự');
  const full = {}; [0, 1, 2, 3].forEach(i => { full['f' + i] = RANKS.map(r => r + SUITS[i]).join(' '); });
  ok(V.won(S('klondike', full)), 'đủ 4 chồng = thắng');
  s = S('klondike', { f0: 'A♠', f1: 'A♥', t0: '2♠', t1: '3♠' });
  const am = autoMoves(V, s); ok(am.moves.length === 1, 'tự lên đích lá 2 (an toàn), lá 3♠ thì không (A♥… chưa đủ)');
});

T('Tính điểm Tiêu chuẩn', () => {
  const V = VARIANTS.klondike, o = { draw: 1, score: 1 };
  let s = S('klondike', { w: 'A♥ 9♥', t0: '10♠', t1: ['3♣ 5♥', 1], t2: '6♠', f0: '2♠' }, o);
  ok(V.scoreMove(s, apply(V, s, mv('w', 1, 't0')), mv('w', 1, 't0')) === 5, 'bãi → cột +5');
  const s2 = S('klondike', { w: 'A♥' }, o);
  ok(V.scoreMove(s2, apply(V, s2, mv('w', 0, 'f0')), mv('w', 0, 'f0')) === 10, 'lên đích +10');
  ok(V.scoreMove(s, apply(V, s, mv('t1', 1, 't2')), mv('t1', 1, 't2')) === 5, 'lật lá úp +5');
  const s3 = S('klondike', { f0: 'A♥ 2♥', t0: '3♠' }, o);
  ok(V.scoreMove(s3, apply(V, s3, mv('f0', 1, 't0')), mv('f0', 1, 't0')) === -15, 'kéo từ đích xuống −15');
  const s4 = S('klondike', { w: '5♠ 6♠' }, o);
  ok(V.scoreMove(s4, apply(V, s4, { k: 'stock' }), { k: 'stock' }) === -100, 'lật lại nọc (rút 1) −100');
  const s5 = S('klondike', { w: '5♠ 6♠' }, { draw: 3, score: 1 }, { pass: 2 });
  ok(V.scoreMove(s5, apply(V, s5, { k: 'stock' }), { k: 'stock' }) === 0, 'rút 3: vòng 3 chưa bị trừ');
  const s6 = S('klondike', { w: '5♠ 6♠' }, { draw: 3, score: 1 }, { pass: 3 });
  ok(V.scoreMove(s6, apply(V, s6, { k: 'stock' }), { k: 'stock' }) === -20, 'rút 3: từ vòng 4 trừ 20');
  ok(liveScore(o, 100, 35000) === 94 && liveScore(o, 3, 60000) === 0, '−2 mỗi 10 giây, không âm');
  ok(timeBonus(o, 100000) === 7000 && timeBonus(o, 20000) === 0, 'thưởng thời gian 700000/giây (≥30s)');
});

T('Vegas', () => {
  const V = VARIANTS.klondike;
  ok(scoreStart({ score: 2 }) === -52, 'bắt đầu −52');
  const s = S('klondike', { w: 'A♥' }, { draw: 1, score: 2 });
  ok(V.scoreMove(s, apply(V, s, mv('w', 0, 'f0')), mv('w', 0, 'f0')) === 5, 'lên đích +5');
  let a = S('klondike', { s: ['5♠ 6♠', 2] }, { draw: 1, score: 2 });
  a = apply(V, apply(V, a, { k: 'stock' }), { k: 'stock' });
  ok(!V.canStock(a), 'Vegas rút 1: không được lật lại nọc');
  let b = S('klondike', { s: ['5♠ 6♠ 7♠', 3] }, { draw: 3, score: 2 });
  let n = 0; while (V.canStock(b) && n < 20) { b = apply(V, b, { k: 'stock' }); n++; }
  ok(n === 5 && b.x.pass === 3, 'Vegas rút 3: đúng 3 vòng (' + n + ' lần bấm)');
  let c = S('klondike', { s: ['5♠', 1] }, { draw: 1, score: 1 }); for (let i = 0; i < 9; i++) c = apply(V, c, { k: 'stock' });
  ok(c && V.canStock(c), 'Tiêu chuẩn: lật lại không giới hạn');
});

T('Tiện ích chung', () => {
  const V = VARIANTS.klondike;
  const full = {}; [0, 1, 2, 3].forEach(i => { full['f' + i] = RANKS.slice(0, 12).map(r => r + SUITS[i]).join(' '); full['t' + i] = 'K' + SUITS[i]; });
  const s = S('klondike', full);
  const g = greedyFinish(V, s); ok(g && g.length === 4, 'tự xếp nốt tham lam: 4 nước');
  ok(legalMoves(V, s).length >= 4, 'liệt kê nước đi');
  const fresh = newGame('klondike', { draw: 3 }, 99); ok(JSON.stringify(JSON.parse(JSON.stringify(fresh))) === JSON.stringify(fresh), 'state JSON-serializable');
  ok(newGame('klondike', { draw: 3 }, 7).p.t6.c.join() === newGame('klondike', { draw: 1, score: 2 }, 7).p.t6.c.join(), 'số ván không phụ thuộc tuỳ chọn');
  const d = newGame('klondike', {}, 5); ok([0,1,2,3,4,5,6].every(i => d.p['t' + i].c.length === i + 1 && d.p['t' + i].d === i) && d.p.s.c.length === 24, 'chia 1..7 lá, 24 lá nọc');
  ok(newGame('klondike', {}, 42).p.t6.c.join() === newGame('klondike', {}, 42).p.t6.c.join(), 'cùng số ván → cùng cách chia');
  ok(newGame('klondike', {}, 42).p.t6.c.join() !== newGame('klondike', {}, 43).p.t6.c.join(), 'khác số ván → khác');
});

console.log(`\n${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
