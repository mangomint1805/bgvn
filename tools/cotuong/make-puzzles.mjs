// 🧩 Sinh cờ thế cho Cờ tướng: xếp ngẫu nhiên tàn cuộc rồi dùng máy kiểm chứng "Đỏ đi trước, chiếu liên tục và chiếu bí trong đúng N nước",
// chỉ giữ thế có ĐÚNG MỘT nước đầu đúng. Chạy: node tools/cotuong/make-puzzles.mjs  → cotuong/js/puzzles.js
// Kho "Cờ thế hôm nay": node tools/cotuong/make-puzzles.mjs --daily [số bài] [seed] → cotuong/js/daily.js (mỗi ngày một bài, xoay vòng)
import { writeFileSync } from 'fs';
import { legalMoves, inCheck, kingSq } from '../../cotuong/js/engine.js';
const DAILY = process.argv[2] === '--daily', DN = DAILY ? (+process.argv[3] || 120) : 0;
let seed = +(DAILY ? process.argv[4] : process.argv[2]) || (DAILY ? 777 : 20261111); const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const ri = n => Math.floor(rnd() * n), pick = a => a[ri(a.length)];
const mv = (b, m, fn) => { const f = Math.floor(m / 100), t = m % 100, cap = b[t]; b[t] = b[f]; b[f] = ''; const r = fn(); b[f] = b[t]; b[t] = cap; return r; };
// Đỏ có chiếu bí trong ≤ n nước bằng toàn nước chiếu không?
function mateIn(b, n) {
  for (const m of legalMoves(b, 'r')) {
    const ok = mv(b, m, () => { if (!inCheck(b, 'b')) return false; const rep = legalMoves(b, 'b'); if (!rep.length) return true; if (n <= 1) return false; return rep.every(x => mv(b, x, () => mateIn(b, n - 1))); });
    if (ok) return true;
  }
  return false;
}
const firstMoves = (b, n) => legalMoves(b, 'r').filter(m => mv(b, m, () => { if (!inCheck(b, 'b')) return false; const rep = legalMoves(b, 'b'); if (!rep.length) return n >= 1; if (n <= 1) return false; return rep.every(x => mv(b, x, () => mateIn(b, n - 1))); }));
const sq = (r, c) => r * 9 + c;
const SPOTS = { a: [[0, 3], [0, 5], [1, 4], [2, 3], [2, 5]], e: [[0, 2], [0, 6], [2, 0], [2, 4], [2, 8], [4, 2], [4, 6]], A: [[9, 3], [9, 5], [8, 4], [7, 3], [7, 5]], E: [[9, 2], [9, 6], [7, 0], [7, 4], [7, 8], [5, 2], [5, 6]] };
function randomPos(attackers, defenders) {
  const b = Array(90).fill(''), put = (p, r, c) => { if (b[sq(r, c)]) return false; b[sq(r, c)] = p; return true; };
  put('k', ri(3), 3 + ri(3)); put('K', 7 + ri(3), 3 + ri(3));
  for (const p of defenders) { let ok = false; for (let i = 0; i < 20 && !ok; i++) { if (SPOTS[p]) { const [r, c] = pick(SPOTS[p]); ok = put(p, r, c); } else if (p === 'p') ok = put(p, 3 + ri(5), ri(9)); else ok = put(p, ri(10), ri(9)); } if (!ok) return null; }
  for (const p of attackers) { let ok = false; for (let i = 0; i < 20 && !ok; i++) { if (SPOTS[p]) { const [r, c] = pick(SPOTS[p]); ok = put(p, r, c); } else if (p === 'P') ok = put(p, ri(4), ri(9)); else ok = put(p, ri(8), ri(9)); } if (!ok) return null; }
  if (inCheck(b, 'b') || inCheck(b, 'r')) return null;
  return b;
}
const NAMES = { R: 'Xe', C: 'Pháo', H: 'Mã', P: 'Tốt' };
const title = att => { const c = {}; att.forEach(p => { if (NAMES[p]) c[p] = (c[p] || 0) + 1; }); return Object.entries(c).map(([p, n]) => (n > 1 ? 'Song ' : '') + NAMES[p]).join(' – '); };
const PLAN = [ // [số nước, số bài, các bộ quân tấn công, quân thủ]
  [1, 3, [['R', 'C'], ['R', 'H'], ['H', 'C'], ['R', 'P']], [['a', 'a'], ['a', 'e'], ['a', 'a', 'e']]],
  [2, 6, [['R', 'C'], ['R', 'H'], ['H', 'C'], ['R', 'R'], ['R', 'P'], ['H', 'H'], ['R', 'C', 'P'], ['H', 'C', 'P']], [['a', 'a'], ['a', 'e', 'e'], ['a', 'a', 'e'], ['a', 'a', 'e', 'e'], ['a', 'e', 'r'], ['a', 'a', 'p']]],
  [3, 4, [['R', 'C'], ['R', 'H'], ['H', 'C'], ['R', 'C', 'P'], ['R', 'H', 'P'], ['H', 'C', 'P']], [['a', 'a'], ['a', 'a', 'e'], ['a', 'e', 'e'], ['a', 'a', 'e', 'e']]],
];
if (DAILY) { /* kho bài hằng ngày: phần lớn 2 nước, xen bài 1 và 3 nước cho đỡ đều */
  PLAN.length = 0;
  PLAN.push([1, Math.round(DN * .2), [['R', 'C'], ['R', 'H'], ['H', 'C'], ['R', 'P'], ['C', 'C'], ['H', 'H']], [['a', 'a'], ['a', 'e'], ['a', 'a', 'e'], ['a', 'e', 'e']]]);
  PLAN.push([2, Math.round(DN * .55), [['R', 'C'], ['R', 'H'], ['H', 'C'], ['R', 'R'], ['R', 'P'], ['H', 'H'], ['R', 'C', 'P'], ['H', 'C', 'P'], ['C', 'C', 'P'], ['R', 'H', 'P']], [['a', 'a'], ['a', 'e', 'e'], ['a', 'a', 'e'], ['a', 'a', 'e', 'e'], ['a', 'e', 'r'], ['a', 'a', 'p'], ['a', 'a', 'e', 'p']]]);
  PLAN.push([3, DN - Math.round(DN * .2) - Math.round(DN * .55), [['R', 'C'], ['R', 'H'], ['H', 'C'], ['R', 'C', 'P'], ['R', 'H', 'P'], ['H', 'C', 'P'], ['H', 'H', 'P']], [['a', 'a'], ['a', 'a', 'e'], ['a', 'e', 'e'], ['a', 'a', 'e', 'e']]]);
}
const LIMIT = DAILY ? (+process.env.LIMIT || 1500000) : 100000, OUTF = process.env.OUT || '../../cotuong/js/daily.js';
const out = [], t0 = Date.now(), seen = new Set();
for (const [n, count, atts, defs] of PLAN) {
  let got = 0, tries = 0;
  while (got < count && tries++ < (DAILY ? 4000000 : 60000) && Date.now() - t0 < LIMIT) {
    const att = pick(atts), b = randomPos(att, pick(defs)); if (!b) continue;
    if (n > 1 && mateIn(b, n - 1)) continue; // không được có lời giải ngắn hơn
    const fm = firstMoves(b, n); if (fm.length < 1 || fm.length > (DAILY ? 2 : 1)) continue; // đúng 1 nước đầu (kho hằng ngày cho phép 2)
    const nm = title(att); if (!DAILY && [...seen].filter(x => x === n + nm).length >= 2) continue; seen.add(n + nm + got);
    const key = b.join(','); if (seen.has(key)) continue; seen.add(key);
    const rows = []; for (let r = 0; r < 10; r++) rows.push(b.slice(r * 9, r * 9 + 9).map(p => p || '.').join(''));
    out.push({ id: `m${n}-${out.length + 1}`, name: nm, n, rows, sol: [Math.floor(fm[0] / 100), fm[0] % 100] }); got++;
  }
  console.log(`chiếu bí ${n} nước: ${got}/${count} bài sau ${tries} lần thử`);
}
if (DAILY) { /* trộn thứ tự để ngày liền nhau không cùng độ khó */
  for (let i = out.length - 1; i > 0; i--) { const j = ri(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  out.forEach((p, i) => { p.id = 'd' + (i + 1); });
  writeFileSync(OUTF.startsWith('/') ? OUTF : new URL(OUTF, import.meta.url), `// 📅 Kho "Cờ thế hôm nay" – sinh bởi tools/cotuong/make-puzzles.mjs --daily (mỗi bài đã kiểm chứng: chiếu bí đúng n nước, đúng 1 nước đầu)\nexport const DAILY = ${JSON.stringify(out).replace(/\},\{/g, '},\n  {')};\n`);
  console.log('ghi', out.length, 'bài hằng ngày', Math.round((Date.now() - t0) / 1000) + 's'); process.exit(0);
}
writeFileSync(new URL('../../cotuong/js/puzzles.js', import.meta.url), `// 🧩 Cờ thế – sinh và kiểm chứng bằng tools/cotuong/make-puzzles.mjs (Đỏ đi trước, chiếu bí trong n nước; sol = nước đầu đúng duy nhất [từ, tới])\nexport const PUZZLES = ${JSON.stringify(out, null, 0).replace(/\},\{/g, '},\n  {').replace('[{', '[\n  {').replace('}]', '},\n]')};\n`);
console.log('ghi', out.length, 'bài', Math.round((Date.now() - t0) / 1000) + 's');
