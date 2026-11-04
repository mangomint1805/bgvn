// Sim Klondike: hàng trăm ván, mỗi ván tới 400 nước ngẫu nhiên hợp lệ (xen gợi ý), kiểm tra bảo toàn 52 lá, không trùng,
// state JSON được, điểm tính được, tự xếp nốt luôn thắng. node solitaire/test/sim.mjs [số ván mỗi bộ luật]
import { VARIANTS, newGame, scoreStart } from '../js/variants.js?v=1';
import { apply, legalMoves, autoMoves, hintMove, greedyFinish, mulberry32 } from '../js/core.js?v=1';

const V = VARIANTS.klondike, GAMES = +process.argv[2] || 60, STEPS = 400, rnd = mulberry32(2024);
const all = s => { const a = []; for (const id in s.p) a.push(...s.p[id].c); return a; };
let bad = 0;
for (const draw of [1, 3]) for (const score of [0, 1, 2]) {
  let moves = 0, wins = 0, stuck = 0, hints = 0, minSc = Infinity, maxSc = -Infinity;
  for (let g = 0; g < GAMES; g++) {
    let s = newGame('klondike', { draw, score }, 1 + Math.floor(rnd() * 999999)), sc = scoreStart(s.o);
    const deck = all(s).sort((a, b) => a - b).join();
    if (all(s).length !== 52 || deck !== [...Array(52).keys()].join()) { bad++; console.log('chia sai'); }
    for (let k = 0; k < STEPS; k++) {
      const ms = legalMoves(V, s); if (!ms.length) { stuck++; break; }
      let m = ms[Math.floor(rnd() * ms.length)];
      if (k % 3 === 0) { const h = hintMove(V, s); if (h) { m = h.m; hints++; } }
      const n = apply(V, s, m); if (!n) { bad++; console.log('apply null', m); break; }
      sc += V.scoreMove(s, n, m); if (score === 1) sc = Math.max(0, sc);
      const am = autoMoves(V, n); let cur = n;
      for (const a of am.moves) { const nx = apply(V, cur, a); sc += V.scoreMove(cur, nx, a); cur = nx; }
      s = cur; moves++;
      const cards = all(s);
      if (cards.length !== 52 || new Set(cards).size !== 52 || cards.slice().sort((a, b) => a - b).join() !== deck) { bad++; console.log('MẤT/TRÙNG lá', m); break; }
      for (const pid in s.p) { const P = s.p[pid]; if (P.d < 0 || P.d > P.c.length || (s.k[pid] === 'stock' && P.d !== P.c.length)) { bad++; console.log('d sai', pid); } }
      if (score === 2) { const f = ['f0', 'f1', 'f2', 'f3'].reduce((a, id) => a + s.p[id].c.length, 0); if (sc !== -52 + 5 * f) { bad++; console.log('điểm Vegas lệch', sc, f); break; } }
      if (k % 50 === 0 && JSON.stringify(JSON.parse(JSON.stringify(s))) !== JSON.stringify(s)) { bad++; console.log('JSON lỗi'); }
      if (V.won(s)) { wins++; break; }
    }
    minSc = Math.min(minSc, sc); maxSc = Math.max(maxSc, sc);
    if (score === 1 && sc < 0) { bad++; console.log('điểm Tiêu chuẩn âm'); }
    const f = greedyFinish(V, s); if (f) { let c = s; for (const m of f) c = apply(V, c, m); if (!V.won(c)) { bad++; console.log('greedyFinish sai'); } }
  }
  console.log(`rút ${draw} · điểm ${['không', 'chuẩn', 'vegas'][score]}: ${GAMES} ván, ${moves} nước, thắng ${wins}, hết nước ${stuck}, điểm ${minSc}…${maxSc}`);
}
console.log(`Lỗi: ${bad}`); process.exit(bad ? 1 : 0);
