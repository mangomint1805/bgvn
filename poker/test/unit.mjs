// Unit test: đánh giá bài, so bài, kicker, chia pot, pot phụ, luật cược tối thiểu, mù tay đôi.
// Chạy: node poker/test/unit.mjs
import { evaluate, scoreOf, catOf, CAT_NAME, evalCodes, toCode } from '../js/eval.js?v=1';
import { createGame, applyAction, viewFor, computePots, nextHand, chipsOnTable, setRandom, legal } from '../js/engine.js?v=1';
import { equity } from '../js/bot.js?v=1';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
const H = s => s.trim().split(/\s+/);
const cat = s => catOf(scoreOf(H(s)));
const cmp = (a, b) => Math.sign(scoreOf(H(a)) - scoreOf(H(b)));

// ---------- 1. nhận đúng hạng bài ----------
const CASES = [
  ['As Ks Qs Js Ts 2d 3c', 8, 'Thùng phá sảnh Hoàng gia (10-J-Q-K-A)'],
  ['9h 8h 7h 6h 5h Ac Ad', 8, 'Thùng phá sảnh tới 9'],
  ['Ah 2h 3h 4h 5h Kd Kc', 8, 'Thùng phá sảnh tới 5'],
  ['7c 7d 7h 7s Kd 2c 3c', 7, 'Tứ quý 7'],
  ['Kc Kd Kh 2s 2d 9c 4h', 6, 'Cù lũ: ba lá K, đôi 2'],
  ['Kc Kd Kh 2s 2d 2c 4h', 6, 'Cù lũ: ba lá K, đôi 2'], // 2 bộ ba → cù lũ
  ['Ac Qc 9c 5c 2c Kd Kh', 5, 'Thùng A cao'],
  ['Ac Qc 9c 5c 2c 3c 7c', 5, 'Thùng A cao'], // 7 lá cùng chất
  ['9d Tc Jh Qs Kd 2c 2d', 4, 'Sảnh tới K'],
  ['Ad 2c 3h 4s 5d Kc Kd', 4, 'Sảnh tới 5 (A-2-3-4-5)'],
  ['Ad Kc Qh Js Td 3c 3d', 4, 'Sảnh tới A'],
  ['5d 6c 7h 8s 9d Tc Jd', 4, 'Sảnh tới J'],
  ['8c 8d 8h Ks 2d 4c 6h', 3, 'Sám cô 8'],
  ['Jc Jd 4h 4s Ad 2c 9h', 2, 'Hai đôi J và 4'],
  ['Jc Jd 4h 4s 9d 9c Ah', 2, 'Hai đôi J và 9'], // 3 đôi: lấy 2 đôi cao
  ['Qc Qd 4h 7s 9d 2c Th', 1, 'Một đôi Q'],
  ['Ac Jd 9h 7s 4d 3c 2h', 0, 'Mậu thầu A cao'],
  ['Qc Jd 9h 7s 4d 3c 2h', 0, 'Mậu thầu Q cao'],
];
for (const [h, c, d] of CASES) { const e = evaluate(H(h)); eq(e.cat, c, 'hạng ' + h); eq(e.desc, d, 'tên ' + h); eq(e.best.length, 5, '5 lá ' + h); }
eq(CAT_NAME, ['Mậu thầu', 'Một đôi', 'Hai đôi', 'Sám cô', 'Sảnh', 'Thùng', 'Cù lũ', 'Tứ quý', 'Thùng phá sảnh'], 'tên hạng tiếng Việt');
// thứ tự hạng
const ladder = ['As Ks Qs Js Ts', 'Kd Qd Jd Td 9d', '2c 2d 2h 2s 3d', 'Ac Ad Ah Ks Kd', '2c 3c 4c 5c 7c', 'Ac 2d 3h 4s 5d', 'Ac Ad Ah 2s 3d', 'Ac Ad Kh Ks 2d', 'Ac Ad 4h 3s 2d', 'Ac Kd Qh Js 9d'];
for (let i = 0; i + 1 < ladder.length; i++) eq(cmp(ladder[i], ladder[i + 1]), 1, `${ladder[i]} > ${ladder[i + 1]}`);

// ---------- 2. kicker, hoà, sảnh A thấp ----------
eq(cmp('Ah Ad Kc 7s 3d 2c 4h', 'As Ac Qc 7d 3h 2s 4d'), 1, 'đôi A kicker K > kicker Q');
eq(cmp('Ah Ad Kc 7s 3d', 'As Ac Kd 7d 2h'), 1, 'đôi A: lá phụ thứ 3 quyết định');
eq(cmp('Ah Ad Kc 7s 3d', 'As Ac Kd 7d 3h'), 0, 'đôi A giống hệt → hoà');
eq(cmp('Kh Kd 5c 5s Ad', 'Ks Kc 5d 5h Qd'), 1, 'hai đôi giống nhau: kicker A > Q');
eq(cmp('Kh Kd 5c 5s 2d', 'Ks Kc 4d 4h Ad'), 1, 'hai đôi: đôi nhỏ 5 > 4 bất kể kicker');
eq(cmp('9h 9d 9c Ks 2d', '9s 9c 9d Qs Jd'), 1, 'sám cô cùng hạng (nhiều bộ bài): kicker');
eq(cmp('Ac 2d 3h 4s 5d', '2c 3d 4h 5s 6d'), -1, 'sảnh A-5 thua sảnh 6');
eq(cmp('Ac 2d 3h 4s 5d', 'Kc Kd Qh Js 9d'), 1, 'sảnh A-5 thắng đôi');
eq(cmp('Ac Kd Qh Js Td', 'Kc Qd Jh Ts 9d'), 1, 'sảnh A cao > sảnh K');
eq(cmp('Ah Kh 9h 7h 2h', 'As Ks 9s 7s 3s'), -1, 'thùng: so lá thứ 5');
eq(cmp('Ah Ac Ad 3h 3s', 'Kh Kc Kd As Ac'), 1, 'cù lũ: bộ ba lớn hơn thắng');
eq(cmp('8h 8c 8d As Ac', '8s 8c 8d Kh Kc'), 1, 'cù lũ cùng bộ ba: đôi lớn hơn');
eq(cmp('7h 7c 7d 7s A2'.replace('A2', 'Ad'), '7h 7c 7d 7s Kd'), 1, 'tứ quý cùng: kicker');
eq(cmp('5h 4h 3h 2h Ah', '6s 5s 4s 3s 2s'), -1, 'thùng phá sảnh A-5 < 6 cao');
// 7 lá: bài chung quyết định → hoà
eq(cmp('2c 3d As Ks Qs Js Ts', '4h 5h As Ks Qs Js Ts'), 0, 'bài chung là thùng phá sảnh → hoà');
eq(cmp('2c 3d Ah Kd Qs Jc Td', '9h 8h Ah Kd Qs Jc Td'), 0, 'sảnh trên bàn → hoà (bài tẩy không giúp)');
eq(cmp('Ac 3d Kh Kd 7s 7c 2d', 'Qc 3h Kh Kd 7s 7c 2d'), 1, 'hai đôi trên bàn: kicker A từ bài tẩy');
eq(cmp('Ac 3d Kh Kd 7s 7c Qd', 'Jc 3h Kh Kd 7s 7c Qd'), 1, 'kicker A vs Q trên bàn');
eq(cmp('4c 3d Kh Kd 7s 7c Qd', '5c 2h Kh Kd 7s 7c Qd'), 0, 'kicker bàn Q chung → hoà');
eq(cmp('6h 2c 3d 4s 5c Kd Kh', 'Ah 2s 3d 4s 5c Kd Kh'), 1, 'sảnh 6 > sảnh A-5 (lá 6 tẩy)');
eq(cmp('Ah Th 2c 7h 9h 3h Kd', 'Kh Qh 2c 7h 9h 3h Kd'), 1, 'thùng A > thùng K');
// lá tô sáng (5 lá thắng) đúng
eq(evaluate(H('Ad 2c 3h 4s 5d Kc Kd')).best, ['5d', '4s', '3h', '2c', 'Ad'], '5 lá sảnh A-5');
eq(evaluate(H('Kc Kd Kh 2s 2d 9c 4h')).best.sort(), ['2d', '2s', 'Kc', 'Kd', 'Kh'], '5 lá cù lũ');
eq(evaluate(H('Jc Jd 4h 4s 9d 9c Ah')).best.sort(), ['9c', '9d', 'Ah', 'Jc', 'Jd'].sort(), '3 đôi: 2 đôi cao + A');

// ---------- 3. bộ đánh giá nhanh khớp với duyệt 21 tổ hợp ----------
function brute(cards) { let best = -1; const n = cards.length; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const c5 = cards.filter((_, i) => i !== a && i !== b); best = Math.max(best, scoreOf(c5)); } return best; }
let seed = 12345; const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const DECK = []; for (const s of 'shdc') for (const r of '23456789TJQKA') DECK.push(r + s);
let mism = 0; const catCount = new Array(9).fill(0);
for (let t = 0; t < 30000; t++) {
  const d = DECK.slice(); for (let i = 0; i < 7; i++) { const j = i + Math.floor(rng() * (52 - i)); [d[i], d[j]] = [d[j], d[i]]; }
  const c7 = d.slice(0, 7); const a = scoreOf(c7), b = brute(c7); if (a !== b) { mism++; if (mism < 4) console.log('  lệch', c7.join(' ')); } catCount[catOf(a)]++;
}
ok(mism === 0, `30.000 tay ngẫu nhiên: đánh giá 7 lá khớp duyệt 5 lá (${mism} lệch)`);
// tần suất hạng bài 7 lá (lý thuyết: mậu thầu 17.4%, đôi 43.8%, hai đôi 23.5%, sám 4.8%, sảnh 4.6%, thùng 3.0%, cù lũ 2.6%)
const pct = catCount.map(x => x / 300);
ok(Math.abs(pct[1] - 43.8) < 1.5 && Math.abs(pct[2] - 23.5) < 1.2 && Math.abs(pct[4] - 4.62) < 0.6 && Math.abs(pct[5] - 3.03) < 0.5, 'tần suất hạng bài hợp lý ' + pct.map(x => x.toFixed(1)).join('/'));

// ---------- 4. pot phụ ----------
const P = (id, total, folded = false) => ({ id, total, folded, inHand: true });
eq(computePots([P('a', 100), P('b', 100), P('c', 100)]), [{ amount: 300, eligible: ['a', 'b', 'c'] }], '1 pot');
eq(computePots([P('a', 50), P('b', 200), P('c', 200)]), [{ amount: 150, eligible: ['a', 'b', 'c'] }, { amount: 300, eligible: ['b', 'c'] }], 'A tất tay 50');
eq(computePots([P('a', 50), P('b', 120), P('c', 300), P('d', 300)]), [{ amount: 200, eligible: ['a', 'b', 'c', 'd'] }, { amount: 210, eligible: ['b', 'c', 'd'] }, { amount: 360, eligible: ['c', 'd'] }], '2 pot phụ');
eq(computePots([P('a', 100), P('b', 40, true), P('c', 100)]), [{ amount: 240, eligible: ['a', 'c'] }], 'tiền người bỏ vào pot');
eq(computePots([P('a', 30), P('b', 80, true), P('c', 200), P('d', 200)]), [{ amount: 120, eligible: ['a', 'c', 'd'] }, { amount: 390, eligible: ['c', 'd'] }], 'người bỏ góp nhiều hơn người tất tay');

// ---------- 5. ván dựng sẵn: chia pot, pot phụ, trả cược thừa ----------
// dựng state rồi ép bài
function rig(n, chips, holes, board, opts = {}) {
  const ps = Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'P' + i }));
  setRandom(() => 0.5);
  const s = createGame(ps, { chips: 1000, bb: 20, ...opts });
  setRandom(null);
  // làm lại ván 1 với chip/bài mong muốn
  s.handNo = 0; s.button = n - 1; // chuyển nút → dealer = P0
  s.players.forEach((p, i) => { p.chips = chips[i]; });
  s.bank = chips.reduce((a, b) => a + b, 0);
  s.phase = 'handover'; s.result = {};
  const real = s.players.map(() => null);
  // nextHand sẽ xáo bộ mới → ghi đè bài sau khi chia
  nextHand(s);
  s.players.forEach((p, i) => { if (p.inHand) p.hole = H(holes[i]); });
  const used = new Set([...holes.join(' ').split(' '), ...H(board)]);
  s.deck = DECK.filter(c => !used.has(c));
  // bộ bài rút từ cuối: [... burn, river, burn, turn, burn, f3,f2,f1] → đặt để board ra đúng thứ tự
  const b = H(board); const tail = [b[4], 'X', b[3], 'X', b[2], b[1], b[0], 'X'];
  s.deck = s.deck.slice(0, s.deck.length - 8).concat(tail.map((c, i) => c === 'X' ? s.deck[s.deck.length - 1 - i] : c));
  void real;
  return s;
}
const act = (s, a) => { const pid = s.players[s.turn].id; const r = applyAction(s, pid, a); if (!r.ok) console.log('  !', pid, a, r.reason); return r; };
{ // 3 người: P0 (dealer), P1 mù nhỏ, P2 mù lớn. P0 tất tay 100, P1 tất tay 300, P2 theo 300. Bài: P0 thắng tất, P1 nhì
  const s = rig(3, [100, 300, 1000], ['Ah Ad', 'Kh Kd', 'Qh Qd'], '2c 7d 9s 3h 4c');
  eq(s.button, 0, 'dealer P0'); eq(s.players[s.sbIdx].id, 'p1', 'mù nhỏ P1'); eq(s.players[s.bbIdx].id, 'p2', 'mù lớn P2');
  eq(s.players[s.turn].id, 'p0', 'UTG (dealer khi 3 người) nói trước');
  act(s, { type: 'allin' }); act(s, { type: 'allin' }); act(s, { type: 'call' });
  eq(s.phase, 'handover', 'tất tay → lật bài'); eq(s.board.join(' '), '2c 7d 9s 3h 4c', 'bàn đúng');
  eq(s.result.pots.map(p => p.amount), [300, 400], 'pot chính 300, pot phụ 400');
  eq(s.players.map(p => p.chips), [300, 400, 700], 'AA ăn pot chính, KK ăn pot phụ');
  eq(chipsOnTable(s), 1400, 'bảo toàn chip');
}
{ // chia đôi pot + chip lẻ: bàn là sảnh, 2 người hoà
  const s = rig(3, [1000, 1000, 1000], ['2c 2d', '3c 3d', '4c 4d'], 'Ts Js Qh Kd Ad');
  act(s, { type: 'raise', to: 55 }); // P0 tố lên 55
  act(s, { type: 'call' }); act(s, { type: 'call' });
  // mọi người xem tới cuối
  while (s.phase === 'playing') act(s, { type: 'check' });
  eq(s.result.pots.length, 1, '1 pot'); eq(s.result.pots[0].winners.length, 3, '3 người hoà (bàn là sảnh A)');
  eq(s.result.pots[0].amount, 165, 'pot 165');
  eq(s.players.map(p => p.chips), [1000, 1000, 1000], 'chia đều 55 mỗi người');
}
{ // chip lẻ cho người gần trái dealer nhất
  const s = rig(3, [1000, 1000, 1000], ['2c 2d', '3c 3d', '7h 8h'], 'Ts Js Qh Kd Ad');
  act(s, { type: 'raise', to: 41 }); act(s, { type: 'call' }); act(s, { type: 'fold' }); // P2 bỏ sau khi đặt mù 20
  while (s.phase === 'playing') act(s, { type: 'check' });
  eq(s.result.pots[0].amount, 102, 'pot 41+41+20'); eq(s.result.pots[0].winners, ['p1', 'p0'], 'người thắng xếp từ trái dealer');
  eq(s.players.map(p => p.chips), [1010, 1010, 980], 'chia 51/51');
}
{ // chip lẻ thật: pot lẻ
  const s = rig(3, [1000, 1000, 1000], ['2c 2d', '3c 3d', '7h 8h'], 'Ts Js Qh Kd Ad');
  act(s, { type: 'raise', to: 40 }); act(s, { type: 'call' }); act(s, { type: 'call' });
  act(s, { type: 'check' }); act(s, { type: 'check' }); act(s, { type: 'raise', to: 21 }); // P0 (sau P1,P2?) – thứ tự sau flop: P1, P2, P0
  // P0 cược 21 sau 2 người xem
  act(s, { type: 'call' }); act(s, { type: 'fold' });
  while (s.phase === 'playing') act(s, { type: 'check' });
  eq(s.result.pots[0].amount, 162, 'pot 120 + 42'); eq(s.result.pots[0].share, { p1: 81, p0: 81 }, 'chia 81/81');
}
{ // trả lại cược không ai theo
  const s = rig(2, [1000, 300], ['Ah Ad', 'Kh Kd'], '2c 7d 9s 3h 4c');
  // tay đôi: dealer = mù nhỏ, nói trước preflop
  eq(s.sbIdx, s.button, 'tay đôi: dealer là mù nhỏ'); eq(s.turn, s.button, 'tay đôi: dealer nói trước preflop');
  act(s, { type: 'raise', to: 1000 }); act(s, { type: 'call' });
  eq(s.players[0].chips, 1300, 'A ăn 600, được trả 700 thừa'); eq(s.players[1].chips, 0, 'K cháy');
  eq(s.players[1].busted, true, 'bị đánh dấu cháy túi');
  eq(chipsOnTable(s), 1300, 'bảo toàn');
}
{ // tay đôi sau flop: mù lớn nói trước
  const s = rig(2, [1000, 1000], ['Ah Ad', 'Kh Kd'], '2c 7d 9s 3h 4c');
  act(s, { type: 'call' }); act(s, { type: 'check' });
  eq(s.street, 'flop', 'sang flop'); eq(s.turn, s.bbIdx, 'tay đôi: mù lớn nói trước sau flop');
}
{ // mù lớn được quyền tố khi mọi người chỉ theo (option)
  const s = rig(3, [1000, 1000, 1000], ['Ah Ad', 'Kh Kd', 'Qh Qd'], '2c 7d 9s 3h 4c');
  act(s, { type: 'call' }); act(s, { type: 'call' });
  eq(s.players[s.turn].id, 'p2', 'tới mù lớn'); const L = legal(s, 'p2'); ok(L.canCheck && L.canRaise, 'mù lớn được Xem hoặc Tố');
  act(s, { type: 'raise', to: 60 }); eq(s.street, 'preflop', 'vẫn preflop sau khi mù lớn tố');
}
{ // tố tối thiểu: tố lần trước +40 → lần sau ≥ +40
  const s = rig(3, [1000, 1000, 1000], ['Ah Ad', 'Kh Kd', 'Qh Qd'], '2c 7d 9s 3h 4c');
  let r = act(s, { type: 'raise', to: 30 }); ok(!r.ok, 'tố lên 30 (< 40) bị từ chối');
  r = act(s, { type: 'raise', to: 60 }); ok(r.ok, 'tố lên 60 hợp lệ (+40)');
  const L = legal(s, 'p1'); eq(L.minTo, 100, 'tố lại tối thiểu tới 100 (+40)');
  r = act(s, { type: 'raise', to: 90 }); ok(!r.ok, 'tố lại lên 90 bị từ chối');
  r = act(s, { type: 'raise', to: 150 }); ok(r.ok, 'tố lại lên 150 (+90)'); eq(legal(s, 'p2').minTo, 240, 'tiếp theo tối thiểu 240');
}
{ // tất tay thiếu mức tố không mở lại quyền tố
  const s = rig(3, [1000, 1000, 130], ['Ah Ad', 'Kh Kd', 'Qh Qd'], '2c 7d 9s 3h 4c');
  act(s, { type: 'raise', to: 100 }); // P0 tố 100 (+80)
  act(s, { type: 'call' });          // P1 theo 100
  act(s, { type: 'allin' });          // P2 tất tay 130 (+30 < 80: tố thiếu)
  eq(s.currentBet, 130, 'mức cược 130');
  const L0 = legal(s, 'p0'); ok(L0 && !L0.canRaise && L0.toCall === 30, 'P0 chỉ được theo 30 hoặc bỏ');
  const r = act(s, { type: 'raise', to: 300 }); ok(!r.ok, 'P0 tố lại bị chặn');
  act(s, { type: 'call' }); const L1 = legal(s, 'p1'); ok(L1 && !L1.canRaise, 'P1 cũng không được tố lại');
}
{ // tất tay đủ mức tố thì mở lại
  const s = rig(3, [1000, 1000, 200], ['Ah Ad', 'Kh Kd', 'Qh Qd'], '2c 7d 9s 3h 4c');
  act(s, { type: 'raise', to: 100 }); act(s, { type: 'call' }); act(s, { type: 'allin' }); // 200 = +100 ≥ 80
  const L0 = legal(s, 'p0'); ok(L0 && L0.canRaise && L0.minTo === 300, 'P0 được tố lại, tối thiểu 300');
}
{ // mù lớn thiếu chip: tất tay khi đặt mù
  const s = rig(3, [1000, 1000, 15], ['Ah Ad', 'Kh Kd', 'Qh Qd'], '2c 7d 9s 3h 4c');
  eq(s.players[2].allIn, true, 'mù lớn tất tay 15'); eq(s.currentBet, 20, 'vẫn phải theo đủ 20');
  act(s, { type: 'call' }); act(s, { type: 'call' });
  eq(s.street, 'flop', 'không ai cần nói nữa → flop');
}
{ // cả bàn tất tay trước flop → chia nốt 5 lá, lật bài
  const s = rig(2, [500, 500], ['7h 2c', 'As Ac'], 'Kd Qd Jd 5s 5c');
  act(s, { type: 'allin' }); act(s, { type: 'call' });
  eq(s.board.length, 5, 'đủ 5 lá'); eq(s.phase, 'handover', 'xong ván'); eq(s.players.find(p => p.id === 'p1').chips + s.players.find(p => p.id === 'p0').chips, 1000, 'bảo toàn');
  eq(s.ev.some(e => e.k === 'runout'), true, 'có sự kiện chia nốt');
}
{ // ẩn bài: viewFor không lộ bài tẩy người khác trước khi lật
  const s = rig(3, [1000, 1000, 1000], ['Ah Ad', 'Kh Kd', 'Qh Qd'], '2c 7d 9s 3h 4c');
  const v = viewFor(s, 'p1');
  eq(v.players[0].hole, null, 'không thấy bài P0'); eq(v.players[1].hole, ['Kh', 'Kd'], 'thấy bài mình'); ok(!('deck' in v), 'không gửi bộ bài');
  ok(!JSON.stringify(v).includes('Ah'), 'không có lá Ah trong view của P1');
  act(s, { type: 'fold' }); act(s, { type: 'call' }); act(s, { type: 'check' });
  while (s.phase === 'playing') act(s, { type: 'check' });
  const v2 = viewFor(s, 'p2');
  eq(v2.players[0].hole, null, 'người bỏ bài không bị lật'); eq(v2.players[1].hole, ['Kh', 'Kd'], 'lật bài người tới showdown');
  ok(!JSON.stringify(v2).includes('Ah'), 'bài người đã bỏ không lộ');
}
{ // thắng do mọi người bỏ: không lật bài
  const s = rig(3, [1000, 1000, 1000], ['Ah Ad', 'Kh Kd', 'Qh Qd'], '2c 7d 9s 3h 4c');
  act(s, { type: 'raise', to: 100 }); act(s, { type: 'fold' }); act(s, { type: 'fold' });
  eq(s.result.kind, 'fold', 'thắng không cần lật'); eq(s.players[0].chips, 1030, '+10+20'); eq(Object.keys(viewFor(s, 'p1').result.hands).length, 0, 'không lộ bài');
}
{ // giải đấu: người hết chip bị loại, người cuối vô địch
  const s = rig(2, [500, 500], ['7h 2c', 'As Ac'], 'Kd Qd Jd 5s 5c', { mode: 'tourn' });
  act(s, { type: 'allin' }); act(s, { type: 'call' });
  eq(s.phase, 'over', 'hết giải'); eq(s.winner, 'p1', 'AA vô địch'); eq(s.players[0].out, true, 'bị loại');
}
{ // chơi vui: người thật cháy túi xin mẹ chip; nếu bàn còn < 2 người có chip thì tự được cho
  const s = rig(3, [500, 500, 500], ['7h 2c', 'As Ac', '3d 8s'], 'Kd Qd Jd 5s 5c');
  act(s, { type: 'allin' }); act(s, { type: 'allin' }); act(s, { type: 'fold' });
  ok(s.players[0].busted, 'P0 cháy túi');
  let r = applyAction(s, 'p1', { type: 'rebuy' }); ok(!r.ok, 'còn chip không được xin');
  r = applyAction(s, 'p0', { type: 'rebuy' }); ok(r.ok && s.players[0].chips === 1000 && s.players[0].rebuys === 1, 'xin mẹ +1000');
  eq(chipsOnTable(s), s.bank, 'ngân hàng cộng thêm');
}
{ // mù tăng dần
  const ps = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  const s = createGame(ps, { chips: 1000, bb: 20, blindUp: 5 });
  for (let h = 1; h < 6; h++) { while (s.phase === 'playing') applyAction(s, s.players[s.turn].id, { type: 'fold' }); nextHand(s); }
  eq(s.handNo, 6, 'ván 6'); eq([s.sb, s.bb], [15, 30], 'mù lên 15/30 sau 5 ván');
}
// ---------- 6. ước lượng sức mạnh bài của bot ----------
{ const e = equity(['As', 'Ad'], [], 1, 3000); ok(e > 0.8 && e < 0.88, 'AA vs 1 đối thủ ~85%: ' + e.toFixed(3)); }
{ const e = equity(['7h', '2c'], [], 1, 3000); ok(e > 0.29 && e < 0.38, '72o vs 1 ~34%: ' + e.toFixed(3)); }
{ const e = equity(['As', 'Ks'], ['Qs', 'Js', 'Ts'], 3, 200); ok(e === 1, 'thùng phá sảnh hoàng gia = 100%'); }

console.log(`unit: ${pass} đạt, ${fail} lỗi`);
if (fail) process.exitCode = 1;
