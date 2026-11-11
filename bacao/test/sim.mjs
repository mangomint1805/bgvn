// node bacao/test/sim.mjs [số bàn] – unit test luật + mô phỏng hàng trăm ván bot (0 kẹt, 0 lỗi, bảo toàn chip)
import { createGame, applyAction, nextRound, handInfo, handPts, compareCards, viewFor, waitingOn, chipTotal, cleanOpts, getP, order, handLabel, multOf, setRandom } from '../js/engine.js?v=2';
import { botAction, betAmount, winChance } from '../js/bot.js?v=1';

let fails = 0, passes = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('❌', m, '→', JSON.stringify(a), '!==', JSON.stringify(b)); } else passes++; };
const C = str => str.split(' ').filter(Boolean).map(t => { const s = t.slice(-1), r = t.slice(0, -1); return { r: r === 'A' ? 1 : r === 'J' ? 11 : r === 'Q' ? 12 : r === 'K' ? 13 : +r, s, id: t }; });
const O = (o = {}) => cleanOpts(o);
const cmp = (a, b, o = {}) => Math.sign(compareCards(C(a), C(b), O(o)).c);

// ---------- điểm ----------
eq(handPts(C('AS 2H 3D')), 6, 'A+2+3 = 6');
eq(handPts(C('9S 8H 3D')), 0, '9+8+3 = 20 → bù 0');
eq(handPts(C('7S 5H 9D')), 1, '7+5+9 = 21 → 1');
eq(handPts(C('10S JH 9D')), 9, '10/J = 0 → 9 nút');
eq(handPts(C('KS QH 10D')), 0, 'KQ10 = 0');
eq(handInfo(C('JS QH KD')).kind, 'batay', 'JQK = ba tây');
eq(handInfo(C('JS QH 10D')).kind, 'diem', 'có lá 10 không phải ba tây');
eq(handInfo(C('JS QH KD'), O({ batay: false })).kind, 'diem', 'tắt ba tây');
eq(handInfo(C('5S 5H 5D')).kind, 'sap', 'ba lá 5 = sáp');
eq(handInfo(C('5S 5H 5D'), O({ sap: 'off' })).kind, 'diem', 'tắt sáp');
eq(handInfo(C('5S 5H 5D'), O({ sap: 'off' })).pts, 5, 'sáp 5 tắt → 15 = 5 nút');
eq(handInfo(C('JS JH JD'), O({ sap: 'top' })).kind, 'sap', 'JJJ sáp>ba tây → sáp');
eq(handInfo(C('JS JH JD'), O({ sap: 'mid' })).kind, 'batay', 'JJJ ba tây>sáp → ba tây');
eq(handInfo(C('JS JH JD'), O({ sap: 'off' })).kind, 'batay', 'JJJ tắt sáp → ba tây');
eq(handLabel(handInfo(C('AS AH AD'))), 'Sáp A', 'nhãn sáp A');
eq(handLabel(handInfo(C('9S 8H 3D'))), 'Bù (0 điểm)', 'nhãn bù');
// ---------- thứ bậc ----------
eq(cmp('JS QH KD', '9S 10H JD'), 1, 'ba tây > 9 nút');
eq(cmp('2S 2H 2D', 'JS QH KD'), 1, 'sáp (top) > ba tây');
eq(cmp('2S 2H 2D', 'JS QH KD', { sap: 'mid' }), -1, 'ba tây > sáp (mid)');
eq(cmp('2S 2H 2D', 'JS QH KD', { sap: 'off' }), -1, 'tắt sáp: 6 nút < ba tây');
eq(cmp('AS AH AD', 'KS KH KD'), 1, 'sáp A > sáp K');
eq(cmp('3S 3H 3D', '2S 2H 2C'), 1, 'sáp 3 > sáp 2');
eq(cmp('9S 10H JD', '8S 10H JD'), 1, '9 > 8 nút');
eq(cmp('9S 8H 3D', 'AS 10H JD'), -1, 'bù 0 < 1 nút');
// bằng điểm – so chất lá to nhất (♦ > ♥ > ♠ > ♣)
eq(cmp('5D 2C 10C', '5H 2S 10S'), 1, '7 nút: có ♦ thắng ♥');
eq(cmp('2D 3C 2C', 'KH 4S 3S'), 1, '7 nút: 2♦ > K♥ (so chất trước)');
eq(cmp('AH 3C 3S', 'KH 4S 3C'), 1, '7 nút cùng ♥: A♥ > K♥');
eq(cmp('2D 3C 2C', 'KH 4S 3S', { tie: 'rank' }), -1, 'so số: K♥ > 2♦');
eq(cmp('AS 3C 3H', 'AD 4S 2C', { tie: 'rank' }), -1, 'so số: cùng A → A♦ > A♠');
eq(cmp('5D 2C 10C', '5H 2S 10S', { tie: 'push' }), 0, 'tắt so chất: hoà');
eq(cmp('JS QH KD', 'JD QS KC'), 1, 'ba tây vs ba tây: K♦ > Q♠? → so chất lá to nhất (♦)');
eq(cmp('JS QH KD', 'JD QS KC', { tie: 'push' }), 0, 'ba tây vs ba tây hoà');
eq(multOf('batay', O({ mBaTay: 3 })), 3, 'hệ số ba tây');
eq(multOf('sap', O()), 3, 'hệ số sáp mặc định');

// ---------- ván có sắp bài ----------
// deck.pop(): lá cuối mảng được chia trước. Chia vòng: mỗi vòng 1 lá theo thứ tự order() rồi tới cái
function rigged(cards, n, opts = {}) {
  const s = createGame(Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'P' + i })), opts);
  const list = C(cards); s.deck = [...s.deck.filter(c => !list.some(x => x.id === c.id)), ...list.reverse()];
  return s;
}
{ // nhà cái: thắng ba tây ×2, thua cái, hoà
  // p0 cái; order = p1 p2 p3 ; chia: vòng1 p1 p2 p3 p0, vòng2..., vòng3...
  const s = rigged('JS 5D 5H 9C  QH 2C 2S 10C  KD 10S 10H 8C', 4, { mBaTay: 2, tie: 'suit' });
  // p1: J Q K ba tây · p2: 5♦ 2♣ 10♠ = 7 · p3: 5♥ 2♠ 10♥ = 7 · cái: 9 10 8 = 7 (♣ to nhất 10♣/9♣/8♣ → chất chuồn)
  eq(s.caiId, 'p0', 'p0 làm cái');
  for (const id of ['p1', 'p2', 'p3']) eq(applyAction(s, id, { type: 'bet', amount: 50 }).ok, true, id + ' cược');
  eq(s.phase, 'peek', 'chia xong → nặn bài');
  eq(getP(s, 'p1').cards.length, 3, '3 lá');
  eq(applyAction(s, 'p1', { type: 'bet', amount: 50 }).ok, false, 'không cược lại');
  for (const id of ['p1', 'p2', 'p3', 'p0']) applyAction(s, id, { type: 'ready' });
  eq(s.phase, 'end', 'lật bài');
  eq(getP(s, 'p1').res.delta, 100, 'ba tây ăn ×2');
  eq(getP(s, 'p2').res.r, 'win', '7 nút có ♦ thắng cái 7 nút chuồn');
  eq(getP(s, 'p3').res.r, 'win', '7 nút có ♥ thắng cái 7 nút chuồn');
  eq(getP(s, 'p0').chips, 1000 - 200, 'cái đền 100+50+50');
  eq(chipTotal(s), 4000, 'bảo toàn chip');
}
{ // so chất: cái thắng; tie=push thì hoà
  const s = rigged('5C 9D  2C 8H  10C 10D', 2, { nan: false });
  // p1: 5♣ 2♣ 10♣ = 7 ; cái p0: 9♦ 8♥ 10♦ = 7 → cái có ♦ to hơn
  applyAction(s, 'p1', { type: 'bet', amount: 20 });
  eq(s.phase, 'end', 'tắt nặn bài → lật ngay');
  eq(getP(s, 'p1').res.r, 'lose', 'bằng 7 nút, cái to chất hơn');
  eq(getP(s, 'p1').res.delta, -20, 'thua 20');
  const t = rigged('5C 9D  2C 8H  10C 10D', 2, { nan: false, tie: 'push' });
  applyAction(t, 'p1', { type: 'bet', amount: 20 });
  eq(t.players.find(p => p.id === 'p1').res.r, 'push', 'tie=push → hoà');
  eq(chipTotal(t), 2000, 'bảo toàn chip hoà');
}
{ // cái có sáp → đền theo hệ số của cái
  const s = rigged('9S 4D  9H 4H  JD 4S', 2, { nan: false, mSap: 5 });
  applyAction(s, 'p1', { type: 'bet', amount: 10 });
  eq(getP(s, 'p1').res.delta, -50, 'thua sáp cái ×5');
}
{ // chơi gà: góp → bài to nhất hốt hết, ba tây được thêm
  const s = rigged('JS 5D 5H  QH 2C 2S  KD 10S AH', 3, { mode: 'pot', ante: 20, mBaTay: 2, nan: false });
  eq(s.caiId, null, 'chơi gà không có cái');
  for (const id of ['p0', 'p1', 'p2']) eq(applyAction(s, id, { type: 'bet' }).ok, true, id + ' góp gà');
  eq(s.phase, 'end', 'lật');
  eq(s.winners, ['p0'], 'p0 ba tây hốt');
  eq(getP(s, 'p0').res.delta, 40 + 40, 'hốt gà 60 (lãi 40) + mỗi người trả thêm 20');
  eq(getP(s, 'p1').res.delta, -40, 'p1 mất góp + thêm');
  eq(chipTotal(s), 3000, 'bảo toàn chip gà');
}
{ // chơi gà hoà khi tie=push: chia đều, dư lẻ
  const s = rigged('5D 5H 4S  2C 2S 3H  10C 10S 10D', 3, { mode: 'pot', ante: 10, tie: 'push', nan: false });
  // p0: 5 2 10 = 7 · p1: 5 2 10 = 7 · p2: 4 3 10 = 7 → 3 người chia 30
  for (const id of ['p0', 'p1', 'p2']) applyAction(s, id, { type: 'bet' });
  eq(s.winners.length, 3, '3 người chia gà');
  eq(s.players.map(p => p.res.delta), [0, 0, 0], 'chia đều huề vốn');
  const t = rigged('5D 5H  2C 2S  10C 10S', 2, { mode: 'pot', ante: 10, tie: 'push', nan: false });
  for (const p of t.players) applyAction(t, p.id, { type: 'bet' });
  eq(chipTotal(t), 2000, 'bảo toàn chip chia gà');
}
{ // xoay vòng nhà cái + xin mẹ + ai ba tây thì làm cái
  const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C', chips: 5 }], { caiMode: 'rotate' });
  eq(s.caiId, 'a', 'ván 1 a làm cái');
  eq(applyAction(s, 'c', { type: 'bet', amount: 10 }).ok, false, 'không đủ chip');
  eq(applyAction(s, 'c', { type: 'beg' }).ok, true, 'xin mẹ');
  eq(getP(s, 'c').chips, 1000, 'mẹ cho đủ vốn');
  eq(applyAction(s, 'b', { type: 'beg' }).ok, false, 'còn chip không xin được');
  s.phase = 'end'; nextRound(s); eq(s.caiId, 'b', 'xoay sang b');
  const t = rigged('JS 5D  QH 2C  KD 10S', 2, { caiMode: 'batay', nan: false });
  applyAction(t, 'p1', { type: 'bet', amount: 10 });
  eq(t.nextCai, 'p1', 'p1 ba tây thắng cái → lên cái'); nextRound(t); eq(t.caiId, 'p1', 'đã đổi cái');
}
{ // view giấu bài
  const s = rigged('9S 10S 10H 5H 6D 9C 8D 9D 7D', 3);
  applyAction(s, 'p1', { type: 'bet', amount: 10 }); applyAction(s, 'p2', { type: 'bet', amount: 10 });
  const v = viewFor(s, 'p1');
  eq(v.players.find(p => p.id === 'p1').cards.length, 3, 'thấy bài mình');
  eq(v.players.find(p => p.id === 'p2').cards, null, 'không thấy bài người khác');
  eq(v.players.find(p => p.id === 'p0').cards, null, 'không thấy bài nhà cái');
  eq('deck' in v, false, 'không lộ bộ bài');
  eq(applyAction(s, 'p1', { type: 'hit' }).ok, false, 'hành động lạ bị chặn');
}
{ // bot cược hợp lệ
  const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B', chips: 30 }], { maxBet: 0 });
  for (let i = 0; i < 200; i++) { const x = betAmount(s, getP(s, 'b')); if (x < 10 || x > 30 || x % 10) { fails++; console.log('❌ cược bot sai', x); break; } }
  passes++;
  const w = winChance(C('JS QH KD'), O(), 1, 400); eq(w.win > 0.9, true, 'ba tây gần như chắc thắng');
  const z = winChance(C('9S 8H 3D'), O(), 1, 400); eq(z.win < 0.2, true, 'bù 0 khó thắng');
}

// ---------- mô phỏng ----------
const N = +process.argv[2] || 400;
const variants = [{}, { mode: 'pot' }, { caiMode: 'fixed', tie: 'rank' }, { caiMode: 'batay', sap: 'mid', mSap: 5 }, { mode: 'pot', tie: 'push', ante: 100, startChips: 500 },
  { nan: false, maxBet: 0, batay: false, sap: 'off' }, { caiMode: 'bot', startChips: 500, minBet: 50, mBaTay: 3 }];
let stuck = 0, errs = 0, rounds = 0, bad = 0, actions = 0, caiNet = 0, caiRounds = 0;
const kinds = {}, stat = { win: 0, lose: 0, push: 0, split: 0 };
for (let g = 0; g < N; g++) {
  const n = 2 + (g % 7), opt = variants[g % variants.length];
  const s = createGame(Array.from({ length: n }, (_, i) => ({ id: 'b' + i, name: 'B' + i, isBot: true })), opt);
  const T0 = chipTotal(s);
  for (let r = 0; r < 15; r++) {
    let k = 0;
    while (s.phase !== 'end' && k < 200) {
      const w = waitingOn(s);
      if (!w.length) { stuck++; break; }
      const pid = w[Math.floor(Math.random() * w.length)];
      const a = botAction(s, pid);
      if (!a) { stuck++; console.log('KẸT', s.phase, pid); break; }
      const res = applyAction(s, pid, a); actions++;
      if (!res.ok) { errs++; if (errs < 6) console.log('LỖI', res.reason, a, s.phase); break; }
      if (chipTotal(s) !== T0) { bad++; break; }
      if (Math.random() < 0.08) { const v = viewFor(s, pid); for (const q of v.players) if (q.id !== pid && q.cards && s.phase !== 'end') bad++; }
      k++;
    }
    if (s.phase !== 'end') { stuck++; break; }
    const h = s.history[s.history.length - 1];
    if (Object.values(h.deltas).reduce((a, b) => a + b, 0) !== 0) { bad++; console.log('tổng delta ≠ 0', h); }
    if (s.pot !== 0) bad++;
    for (const p of s.players) { if (p.cards.length !== 3) bad++; kinds[handInfo(p.cards, s.opts).kind] = (kinds[handInfo(p.cards, s.opts).kind] || 0) + 1; }
    for (const id of order(s)) stat[getP(s, id).res.r]++;
    if (s.caiId) { caiNet += h.deltas[s.caiId]; caiRounds++; }
    if (!s.winners.length) bad++;
    rounds++;
    for (const p of s.players) if (p.chips < (s.opts.mode === 'pot' ? s.opts.ante : s.opts.minBet)) applyAction(s, p.id, { type: 'beg' });
    nextRound(s);
    if (chipTotal(s) !== T0) bad++;
  }
}
const tot = stat.win + stat.lose + stat.push + stat.split;
console.log(`Unit: ${passes} đúng, ${fails} sai`);
console.log(`Sim: ${N} bàn, ${rounds} ván, ${actions} hành động · kẹt ${stuck} · lỗi ${errs} · sai bảo toàn/lộ bài ${bad}`);
console.log(`Kết quả người chơi: thắng ${(stat.win / tot * 100).toFixed(1)}% · thua ${(stat.lose / tot * 100).toFixed(1)}% · hoà ${(stat.push / tot * 100).toFixed(1)}% · chia gà ${(stat.split / tot * 100).toFixed(1)}% · nhà cái lãi TB ${(caiNet / Math.max(1, caiRounds)).toFixed(2)} chip/ván`);
console.log('Loại bài:', kinds);
void setRandom;
if (fails || stuck || errs || bad) process.exitCode = 1;
