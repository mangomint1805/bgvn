// node xidach/test/sim.mjs [số ván]  – unit test luật + mô phỏng hàng trăm ván bot (0 kẹt, 0 lỗi, bảo toàn chip)
import { createGame, applyAction, nextRound, handValue, handInfo, compare, viewFor, waitingOn, chipTotal, DEFAULT_OPTS, cleanOpts, OPT_CHOICES, getP, setRandom } from '../js/engine.js?v=2';
import { botAction } from '../js/bot.js?v=1';

let fails = 0, passes = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('❌', m, '→', JSON.stringify(a), '!==', JSON.stringify(b)); } else passes++; };
const C = str => str.split(' ').map(t => { const s = t.slice(-1), r = t.slice(0, -1); return { r: r === 'A' ? 1 : r === 'J' ? 11 : r === 'Q' ? 12 : r === 'K' ? 13 : +r, s, id: t }; });
const O = (o = {}) => cleanOpts(o);

// ---------- điểm ----------
eq(handValue(C('AS 5H')), 16, 'A + 5 (2 lá) = 16');
eq(handValue(C('AS AH')), 21, 'AA 2 lá tính 11+10');
eq(handValue(C('AS 5H 5D')), 20, 'A 3 lá = 10 → 20');
eq(handValue(C('AS 5H 9D')), 15, 'A 3 lá: 10 thì quắc nên = 1 → 15');
eq(handValue(C('AS 5H 2D 3C')), 11, 'A 4 lá = 1');
eq(handValue(C('AS 5H 2D 3C'), 'flex'), 21, 'luật linh hoạt: A 4 lá = 11');
eq(handValue(C('KS QH 5D')), 25, 'quắc 25');
eq(handValue(C('AS AH AD')), 21, 'AAA 3 lá = 10+10+1');
eq(handValue(C('AS AH AD AC 7S')), 11, 'AAAA7 = 11');
eq(handValue(C('JS QH')), 20, 'J Q = 20');
eq(handValue(C('AS 10H 5D')), 16, 'A 10 5 = 1+10+5');
// ---------- loại bài ----------
eq(handInfo(C('AS AH')).kind, 'xiban', 'xì bàn');
eq(handInfo(C('AS KH')).kind, 'xidach', 'xì dách A K');
eq(handInfo(C('10S AH')).kind, 'xidach', 'xì dách 10 A');
eq(handInfo(C('AS 9H')).kind, 'du', 'A 9 = 20 thường');
eq(handInfo(C('2S 3H 4D 2C 5S')).kind, 'ngulinh', 'ngũ linh 16');
eq(handInfo(C('2S 3H 4D 2C AS')).kind, 'ngulinh', 'ngũ linh 12 điểm (dưới 16 vẫn là ngũ linh)');
eq(handInfo(C('2S 3H 4D 7C 6S')).kind, 'quac', '5 lá 22 = quắc');
eq(handInfo(C('9S 6H')).kind, 'non', '15 = non (cần 16)');
eq(handInfo(C('9S 6H'), O({ minPts: 15 })).kind, 'du', '15 đủ khi tối thiểu 15');
eq(handInfo(C('9S 6H'), O(), 15).kind, 'du', 'nhà cái 15 đủ xét');
eq(handInfo(C('KS 7H 5D')).kind, 'quac', 'quắc 22');
eq(handInfo(C('AS 5H 9D')).kind, 'non', 'A 5 9 = 15 non');
// ---------- so bài & hệ số ----------
const I = (s, o = O(), min) => handInfo(C(s), o, min);
const cmp = (p, c, o = O()) => { const r = compare(I(p, o), I(c, o, o.caiMin), o); return r.r + '×' + r.mult; };
eq(cmp('AS AH', 'AD KH'), 'win×3', 'xì bàn > xì dách nhà cái, ăn ×3');
eq(cmp('AS KH', 'AD AH'), 'lose×3', 'thua xì bàn nhà cái ×3');
eq(cmp('AS KH', 'AD QH'), 'push×0', 'cùng xì dách hoà');
eq(cmp('AS KH', '9D 9H'), 'win×2', 'xì dách ăn ×2');
eq(cmp('2S 3H 4D 2C 5S', 'AD QH'), 'lose×2', 'ngũ linh thua xì dách');
eq(cmp('2S 3H 4D 2C 5S', '10D QH'), 'win×2', 'ngũ linh thắng 20 ×2');
eq(cmp('2S 3H 4D 2C 5S', '2D 3C 4H 2H 6S'), 'win×2', 'cùng ngũ linh: ít điểm hơn thắng');
eq(cmp('2S 3H 4D 2C 6S', '2D 3C 4H 2H 5S'), 'lose×2', 'cùng ngũ linh: nhiều điểm hơn thua');
eq(cmp('2S 3H 4D 2C 5S', '2D 3C 4H 2H 5D'), 'push×0', 'cùng ngũ linh bằng điểm hoà');
eq(cmp('10S 9H', '10D 8H'), 'win×1', '19 > 18');
eq(cmp('10S 7H', '10D 8H'), 'lose×1', '17 < 18');
eq(cmp('10S 8H', '10D 8C'), 'push×0', 'bằng 18 hoà');
eq(cmp('KS QH 5D', '10D 8H'), 'lose×1', 'quắc thua');
eq(cmp('KS QH 5D', '10D 6H 8C'), 'lose×1', 'cùng quắc: nhà cái ăn (mặc định)');
eq(cmp('KS QH 5D', '10D 6H 8C', O({ bothBust: 'hoa' })), 'push×0', 'cùng quắc: hoà (tuỳ chọn)');
eq(cmp('10S 6H', '10D 6H 8C'), 'win×1', 'nhà cái quắc, người 16 ăn');
eq(cmp('2S 3H 4D 2C 5S', '10D 6H 8C'), 'win×2', 'nhà cái quắc, ngũ linh vẫn ×2');
eq(cmp('9S 5H', '10D 6H 8C', O({ allowNon: true })), 'lose×1', 'dằn non: thua kể cả khi cái quắc');
eq(cmp('KS QH 5D', '2D 3C 4H 2H 5D'), 'lose×2', 'quắc gặp ngũ linh nhà cái đền ×2');
eq(cmp('AS KH', '9D 9H', O({ mXiDach: 1 })), 'win×1', 'hệ số xì dách tuỳ chỉnh');

// ---------- kịch bản cố định ----------
function rigged(order, n = 3, o = {}) { // order: các lá rút ra theo thứ tự (deck.pop)
  const s = createGame(Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'P' + i })), o);
  s.deck = C(order).reverse().concat([]); // pop() lấy lá đầu tiên trong chuỗi
  return s;
}
{ // nhà cái xì dách ngay: so cả bàn, ván kết thúc. Thứ tự chia: p1 p2 cái(p0), 2 vòng
  const s = rigged('AS 9S 10H AH KD AD', 3);
  applyAction(s, 'p1', { type: 'bet', amount: 50 }); applyAction(s, 'p2', { type: 'bet', amount: 20 });
  eq(s.phase, 'end', 'cái xì dách → kết thúc ngay');
  eq(getP(s, 'p1').res.delta, 150, 'p1 xì bàn (A A) thắng xì dách nhà cái ×3 = +150');
  eq(getP(s, 'p2').res.delta, -40, 'p2 (9 K = 19) thua xì dách ×2 = −40');
  eq(getP(s, 'p0').chips, 890, 'nhà cái −110');
  eq(chipTotal(s), 3000, 'bảo toàn chip');
}
{ // người có xì dách ăn ngay, còn lại chơi tiếp
  const s = rigged('AS 9S 5H KH 7D 8C 4S KC', 3);
  applyAction(s, 'p1', { type: 'bet', amount: 100 }); applyAction(s, 'p2', { type: 'bet', amount: 10 });
  eq(getP(s, 'p1').res && getP(s, 'p1').res.delta, 200, 'p1 xì dách ăn ×2 ngay');
  eq(s.phase, 'play', 'chơi tiếp'); eq(s.turn, 'p2', 'tới p2');
  // p2: 9 + 7 = 16 → dằn
  eq(applyAction(s, 'p2', { type: 'stand' }).ok, true, 'p2 dằn 16');
  eq(s.phase, 'dealer', 'tới nhà cái');
  // cái: 5 + 8 = 13 < 15 → không được xét
  eq(applyAction(s, 'p0', { type: 'revealAll' }).ok, false, 'cái 13 chưa được xét');
  applyAction(s, 'p0', { type: 'hit' }); // +4 = 17
  eq(applyAction(s, 'p0', { type: 'reveal', target: 'p2' }).ok, true, 'cái 17 xét p2');
  eq(getP(s, 'p2').res.delta, -10, 'p2 16 thua cái 17');
  eq(s.phase, 'end', 'hết người → kết thúc');
  eq(chipTotal(s), 3000, 'bảo toàn chip 2');
}
{ // dằn dưới 16 bị chặn; quắc tự hết lượt; cái quắc đền người chưa quắc
  const s = rigged('9S 10S 10H 5H 6D 9C 8D 9D', 3);
  applyAction(s, 'p1', { type: 'bet', amount: 10 }); applyAction(s, 'p2', { type: 'bet', amount: 10 });
  // p1: 9 5 = 14, p2: 10 6 = 16, cái: 10 9 = 19
  eq(applyAction(s, 'p1', { type: 'stand' }).ok, false, '14 không được dằn');
  applyAction(s, 'p1', { type: 'hit' }); // +8 = 22 quắc
  eq(getP(s, 'p1').done, true, 'quắc tự xong lượt');
  eq(s.turn, 'p2', 'tới p2');
  applyAction(s, 'p2', { type: 'stand' });
  applyAction(s, 'p0', { type: 'hit' }); // 19 + 9 = 28 quắc
  eq(s.phase, 'end', 'cái quắc → lật hết');
  eq(getP(s, 'p1').res.r, 'lose', 'p1 cùng quắc: cái ăn');
  eq(getP(s, 'p2').res.r, 'win', 'p2 16 ăn vì cái quắc');
  eq(chipTotal(s), 3000, 'bảo toàn chip 3');
}
{ // xoay vòng nhà cái + xin mẹ
  const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C', chips: 5 }], { caiMode: 'rotate' });
  eq(s.caiId, 'a', 'ván 1 a làm cái');
  eq(applyAction(s, 'c', { type: 'bet', amount: 10 }).ok, false, 'không đủ chip không cược được');
  eq(applyAction(s, 'c', { type: 'beg' }).ok, true, 'xin mẹ được');
  eq(getP(s, 'c').chips, 1000, 'mẹ cho đủ 1000');
  eq(applyAction(s, 'b', { type: 'beg' }).ok, false, 'còn chip không xin được');
  s.phase = 'end'; nextRound(s); eq(s.caiId, 'b', 'ván 2 xoay sang b');
  s.phase = 'end'; nextRound(s); eq(s.caiId, 'c', 'ván 3 xoay sang c');
}
{ // ai xì dách thì làm cái
  const s = rigged('AS 9S 5H KH 7D 8C 4S KC', 3, { caiMode: 'xidach' });
  applyAction(s, 'p1', { type: 'bet', amount: 10 }); applyAction(s, 'p2', { type: 'bet', amount: 10 });
  applyAction(s, 'p2', { type: 'stand' }); applyAction(s, 'p0', { type: 'hit' }); applyAction(s, 'p0', { type: 'revealAll' });
  eq(s.nextCai, 'p1', 'p1 xì dách → làm cái ván sau'); nextRound(s); eq(s.caiId, 'p1', 'đã chuyển cái');
}
{ // view giấu bài
  const s = rigged('9S 10S 10H 5H 6D 9C 8D 9D', 3);
  applyAction(s, 'p1', { type: 'bet', amount: 10 }); applyAction(s, 'p2', { type: 'bet', amount: 10 });
  const v = viewFor(s, 'p1');
  eq(v.players.find(p => p.id === 'p1').cards.length, 2, 'thấy bài mình');
  eq(v.players.find(p => p.id === 'p2').cards, null, 'không thấy bài người khác');
  eq(v.players.find(p => p.id === 'p0').cards, null, 'không thấy bài nhà cái');
  eq('deck' in v, false, 'không lộ bộ bài');
}

// ---------- mô phỏng ----------
const N = +process.argv[2] || 400;
const variants = [{}, { caiMode: 'fixed' }, { caiMode: 'xidach', bothBust: 'hoa' }, { aceRule: 'flex', minPts: 15, caiMin: 16 }, { allowNon: true, maxBet: 0, mXiBan: 2 }, { caiMode: 'bot', startChips: 500, minBet: 50 }];
let stuck = 0, errs = 0, rounds = 0, bad = 0, actions = 0;
const stat = { win: 0, lose: 0, push: 0 }, kinds = {};
let caiNet = 0;
for (let g = 0; g < N; g++) {
  const n = 2 + (g % 7), opt = variants[g % variants.length];
  const s = createGame(Array.from({ length: n }, (_, i) => ({ id: 'b' + i, name: 'B' + i, isBot: true })), opt);
  const T0 = chipTotal(s);
  for (let r = 0; r < 12; r++) {
    let k = 0;
    while (s.phase !== 'end' && k < 400) {
      const w = waitingOn(s);
      if (!w.length) { stuck++; break; }
      const pid = w[Math.floor(Math.random() * w.length)];
      const a = botAction(s, pid);
      if (!a) { stuck++; console.log('KẸT', s.phase, pid, getP(s, pid).cards); break; }
      const res = applyAction(s, pid, a); actions++;
      if (!res.ok) { errs++; if (errs < 6) console.log('LỖI', res.reason, a, s.phase); break; }
      if (chipTotal(s) !== T0) { bad++; break; }
      // view không bao giờ lộ bài người chưa lật
      if (Math.random() < 0.05) { const v = viewFor(s, pid); for (const q of v.players) if (q.id !== pid && q.cards && !q.revealed && s.phase !== 'end' && !(q.id === s.caiId && s.caiOpen)) bad++; }
      k++;
    }
    if (s.phase !== 'end') { stuck++; break; }
    // bảo toàn từng ván: tổng delta = 0
    const h = s.history[s.history.length - 1]; if (Object.values(h.deltas).reduce((a, b) => a + b, 0) !== 0) bad++;
    caiNet += h.deltas[s.caiId];
    for (const id of s.order) { const p = getP(s, id); stat[p.res.r]++; kinds[p.res.kind] = (kinds[p.res.kind] || 0) + 1; if (p.cards.length > 5 || p.cards.length < 2) bad++; }
    if (getP(s, s.caiId).cards.length > 5) bad++;
    rounds++;
    // sau ván: ai hết chip thì xin mẹ (giống bot), rồi ván mới
    for (const p of s.players) if (p.chips < s.opts.minBet) applyAction(s, p.id, { type: 'beg' });
    nextRound(s);
    if (chipTotal(s) !== T0) bad++;
  }
}
const tot = stat.win + stat.lose + stat.push;
console.log(`Unit: ${passes} đúng, ${fails} sai`);
console.log(`Sim: ${N} bàn, ${rounds} ván, ${actions} hành động · kẹt ${stuck} · lỗi ${errs} · sai bảo toàn/lộ bài ${bad}`);
console.log(`Kết quả người chơi: thắng ${(stat.win / tot * 100).toFixed(1)}% · thua ${(stat.lose / tot * 100).toFixed(1)}% · hoà ${(stat.push / tot * 100).toFixed(1)}% · nhà cái lãi trung bình ${(caiNet / rounds).toFixed(1)} chip/ván`);
console.log('Loại bài người chơi:', kinds);
void DEFAULT_OPTS; void OPT_CHOICES; void setRandom;
if (fails || stuck || errs || bad) process.exitCode = 1;
