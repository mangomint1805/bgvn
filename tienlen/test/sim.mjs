// Mô phỏng bot vs bot + kiểm tra luật: node tienlen/test/sim.mjs 500
import { createGame, applyAction, current, classify, beats, legalPlays, toiTrangOf, thoiValue, isChop, mustAutoPass, legalFor, badFinish, cardName, START_CHIPS, DEFAULT_OPTS, setRandom } from '../js/engine.js?v=5';
import { botAction, LEVELS } from '../js/bot.js?v=6';

let fails = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('❌', m, '→', JSON.stringify(a), '≠', JSON.stringify(b)); } };
// lá: "3♠" → id
const R = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'], S = '♠♣♦♥';
const C = t => t.split(' ').map(x => R.indexOf(x.slice(0, -1)) * 4 + S.indexOf(x.slice(-1)));
const K = t => classify(C(t));

// ---------- nhận dạng bộ ----------
eq(K('7♥').type, 'single', 'lẻ');
eq(K('7♠ 7♥').type, 'pair', 'đôi');
eq(K('7♠ 8♥'), null, 'không phải đôi');
eq(K('9♠ 9♣ 9♥').type, 'triple', 'sám');
eq(K('J♠ J♣ J♦ J♥').type, 'quad', 'tứ quý');
eq(K('3♠ 4♦ 5♣'), { type: 'straight', len: 3, top: C('5♣')[0] }, 'sảnh 3');
eq(K('Q♠ K♦ A♣'), { type: 'straight', len: 3, top: C('A♣')[0] }, 'sảnh Q-K-A');
eq(K('K♠ A♦ 2♣'), null, 'sảnh không được có heo');
eq(K('3♠ 5♦ 6♣'), null, 'sảnh hở');
eq(K('5♠ 5♥ 6♣ 6♦ 7♠ 7♥').type, 'pairs', '3 đôi thông');
eq(K('5♠ 5♥ 6♣ 6♦ 7♠ 7♥ 8♣ 8♦').len, 4, '4 đôi thông');
eq(K('K♠ K♥ A♣ A♦ 2♠ 2♥'), null, 'đôi thông không có heo');
eq(K('5♠ 5♥ 6♣ 6♦'), null, '2 đôi thông không phải bộ');
eq(K('5♠ 5♥ 7♣ 7♦ 8♠ 8♥'), null, 'đôi thông hở');
// ---------- chặn ----------
eq(beats(K('7♥'), K('7♦')), true, '7♥ > 7♦ (cơ > rô)');
eq(beats(K('7♣'), K('7♠')), true, 'chuồn > bích');
eq(beats(K('7♦'), K('7♣')), true, 'rô > chuồn');
eq(beats(K('8♠'), K('7♥')), true, '8 > 7');
eq(beats(K('2♠'), K('A♥')), true, 'heo > A');
eq(beats(K('8♠ 8♣'), K('8♦ 8♥')), false, 'đôi 8 đen < đôi 8 có ♥');
eq(beats(K('4♠ 5♠ 6♥'), K('4♦ 5♦ 6♦')), true, 'sảnh cùng dài, lá đỉnh lớn hơn');
eq(beats(K('4♠ 5♠ 6♥ 7♠'), K('4♦ 5♦ 6♦')), false, 'sảnh khác độ dài');
eq(beats(K('9♠ 9♣'), K('8♠')), false, 'đôi không đè lẻ');
// ---------- chặt heo ----------
const dt3 = K('5♠ 5♥ 6♣ 6♦ 7♠ 7♥'), tq = K('9♠ 9♣ 9♦ 9♥'), dt4 = K('3♠ 3♥ 4♣ 4♦ 5♠ 5♥ 6♣ 6♦');
eq(beats(dt3, K('2♥')), true, '3 đôi thông chặt 1 heo');
eq(beats(dt3, K('2♠ 2♥')), false, '3 đôi thông KHÔNG chặt đôi heo');
eq(beats(tq, K('2♥')), true, 'tứ quý chặt heo');
eq(beats(tq, K('2♠ 2♥')), true, 'tứ quý chặt đôi heo');
eq(beats(tq, dt3), true, 'tứ quý chặt 3 đôi thông');
eq(beats(dt3, tq), false, '3 đôi thông không chặt tứ quý');
eq(beats(dt4, K('2♥')), true, '4 đôi thông chặt heo');
eq(beats(dt4, K('2♦ 2♥')), true, '4 đôi thông chặt đôi heo');
eq(beats(dt4, tq), true, '4 đôi thông chặt tứ quý');
eq(beats(dt4, dt3), true, '4 đôi thông chặt 3 đôi thông');
eq(beats(K('10♠ 10♣ 10♦ 10♥'), tq), true, 'tứ quý lớn đè tứ quý nhỏ');
eq(beats(tq, K('8♠')), false, 'tứ quý không đè lá thường');
eq(beats(tq, K('2♠ 2♣ 2♥')), false, 'không chặt sám heo');
eq(isChop(tq, K('2♥')), true, 'tứ quý trên heo là chặt');
eq(isChop(K('2♥'), K('2♠')), false, 'heo đè heo không phải chặt');
// ---------- tới trắng / thối ----------
eq(toiTrangOf(C('3♠ 4♠ 5♣ 6♦ 7♠ 8♥ 9♠ 10♣ J♦ Q♠ K♥ A♠ 3♥')), 'rong', 'sảnh rồng');
eq(toiTrangOf(C('2♠ 2♣ 2♦ 2♥ 3♠ 5♣ 6♦ 8♠ 9♥ 10♠ J♣ Q♦ K♠')), 'tq2', 'tứ quý heo');
eq(toiTrangOf(C('3♠ 3♥ 4♣ 4♦ 5♠ 5♥ 6♣ 6♦ 7♠ 7♥ 9♠ J♣ K♦')), 'dt5', '5 đôi thông');
eq(toiTrangOf(C('3♠ 3♥ 5♣ 5♦ 7♠ 7♥ 9♣ 9♦ J♠ J♥ K♠ K♣ A♦')), 'doi6', '6 đôi');
eq(toiTrangOf(C('3♦ 3♥ 4♦ 5♦ 7♥ 8♦ 9♥ 10♦ J♥ Q♦ K♥ A♦ 2♥')), 'mau', 'đồng màu đỏ');
eq(toiTrangOf(C('3♠ 3♣ 3♦ 3♥ 5♣ 6♦ 8♠ 9♥ 10♠ J♣ Q♦ K♠ A♥'), true), 'tq3', 'tứ quý 3 ván đầu');
eq(toiTrangOf(C('3♠ 3♣ 3♦ 3♥ 5♣ 6♦ 8♠ 9♥ 10♠ J♣ Q♦ K♠ A♥'), false), null, 'tứ quý 3 ván sau không tính');
eq(toiTrangOf(C('3♠ 4♣ 6♦ 7♥ 8♠ 9♣ 10♦ J♥ Q♠ K♣ A♦ 2♥ 2♠')), null, 'bài thường');
eq(thoiValue(C('2♠ 2♥ 5♣')).heo, 3, 'thối heo đen + đỏ = 3 phần');
eq(thoiValue(C('9♠ 9♣ 9♦ 9♥ 2♦')).total, 6, 'thối tứ quý + heo rô');
eq(thoiValue(C('9♠ 9♣ 9♦ 9♥'), false).total, 0, 'tắt thối hàng');
eq(thoiValue(C('5♠ 5♥ 6♣ 6♦ 7♠ 7♥')).hang, 3, 'thối 3 đôi thông');

// ---------- kịch bản ván: 3♠, chặt, cóng, thanh toán ----------
function rig(hands, opts = {}) {
  const s = createGame(hands.map((h, i) => ({ id: 'p' + i, name: 'P' + i })), { toiTrang: false, veHeo: 'free', ...opts });
  s.players.forEach((p, i) => { p.hand = C(hands[i]).sort((a, b) => a - b); });
  let low = 99, who = 0; s.players.forEach((p, i) => { if (p.hand[0] < low) { low = p.hand[0]; who = i; } });
  if (!opts.starter) { s.turn = who; s.mustInclude = low; }
  return s;
}
{
  const s = rig(['3♠ 4♥ 2♥ 9♣', '5♠ 5♥ 6♣ 6♦ 7♠ 7♥ K♠', '8♠ 10♣ J♦']);
  eq(applyAction(s, 'p0', { type: 'play', cards: C('4♥') }).ok, false, 'phải có 3♠ nước đầu');
  eq(applyAction(s, 'p1', { type: 'play', cards: C('K♠') }).ok, false, 'chưa tới lượt');
  eq(applyAction(s, 'p0', { type: 'pass' }).ok, false, 'cầm cái không được bỏ');
  eq(applyAction(s, 'p0', { type: 'play', cards: C('3♠') }).ok, true, 'đánh 3♠');
  eq(applyAction(s, 'p1', { type: 'play', cards: C('K♠') }).ok, true, 'P1 đè K♠');
  eq(applyAction(s, 'p2', { type: 'pass' }).ok, true, 'P2 bỏ');
  eq(applyAction(s, 'p0', { type: 'play', cards: C('2♥') }).ok, true, 'P0 heo cơ');
  eq(applyAction(s, 'p1', { type: 'play', cards: C('5♠ 5♥ 6♣ 6♦ 7♠ 7♥') }).ok, true, 'P1 chặt heo bằng 3 đôi thông');
  eq(s.pays[0], { from: 'p0', to: 'p1', n: 20, why: 'chop', note: '3 đôi thông 5→7 chặt Heo ♥' }, 'chặt heo đỏ = 2 phần');
  eq(s.players[2].passed, true, 'P2 đã bỏ thì khoá tới hết vòng');
  eq(s.phase, 'ended', 'P1 hết bài, P2 cóng → hết ván (3 người: còn 1)');
  eq(s.players[2].cong, true, 'P2 bị cóng');
  eq(s.places, ['p1', 'p0', 'p2'], 'hạng: P1, P0, P2 (cóng bét)');
  // chặt 2 phần; hạng: P2→P1 2 phần, P0→P1 1 phần; thối: P0 còn 4♥ 9♣ (không heo); P2 cóng 2 phần
  eq(s.delta, { p0: -30, p1: 70, p2: -40 }, 'thanh toán cuối ván');
  eq(Object.values(s.delta).reduce((a, b) => a + b, 0), 0, 'tổng chip không đổi');
}
{ // chặt chồng 4 người: P1 tứ quý chặt heo P0, P2 4 đôi thông chặt chồng
  const s = rig(['3♠ 2♠ A♣', '9♠ 9♣ 9♦ 9♥ K♥', '4♠ 4♥ 5♣ 5♦ 6♠ 6♥ 7♣ 7♦ Q♠', '8♦ 10♣ J♦'], { bet: 10 });
  applyAction(s, 'p0', { type: 'play', cards: C('3♠') });
  applyAction(s, 'p1', { type: 'pass' }); applyAction(s, 'p2', { type: 'pass' }); applyAction(s, 'p3', { type: 'pass' });
  eq(s.turn, 0, 'mọi người bỏ → P0 cầm cái lại');
  eq(s.table, null, 'vòng mới bàn trống');
  applyAction(s, 'p0', { type: 'play', cards: C('2♠') });
  eq(applyAction(s, 'p1', { type: 'play', cards: C('9♠ 9♣ 9♦ 9♥') }).ok, true, 'tứ quý chặt heo bích');
  eq(applyAction(s, 'p2', { type: 'play', cards: C('4♠ 4♥ 5♣ 5♦ 6♠ 6♥ 7♣ 7♦') }).ok, true, '4 đôi thông chặt chồng tứ quý');
  eq(s.delta, { p0: -10, p1: 10 - 50, p2: 50, p3: 0 }, 'chặt chồng: heo 1 + tứ quý 4 = 5 phần');
}
{ // tắt chặt chồng
  const s = rig(['3♠ 2♠ A♣', '9♠ 9♣ 9♦ 9♥ K♥', '4♠ 4♥ 5♣ 5♦ 6♠ 6♥ 7♣ 7♦ Q♠', '8♦ 10♣ J♦'], { chatChong: false });
  applyAction(s, 'p0', { type: 'play', cards: C('3♠') }); for (const q of ['p1', 'p2', 'p3']) applyAction(s, q, { type: 'pass' });
  applyAction(s, 'p0', { type: 'play', cards: C('2♠') });
  applyAction(s, 'p1', { type: 'play', cards: C('9♠ 9♣ 9♦ 9♥') });
  applyAction(s, 'p2', { type: 'play', cards: C('4♠ 4♥ 5♣ 5♦ 6♠ 6♥ 7♣ 7♦') });
  eq(s.delta.p2, 40, 'không chặt chồng: chỉ ăn tứ quý 4 phần');
}
{ // hưởng sái: người về nhất, mọi người bỏ → người kế tiếp cầm cái
  const s = rig(['3♠ 4♣', '5♠ 6♣', '7♠ 8♣', 'K♦ 9♥']);
  applyAction(s, 'p0', { type: 'play', cards: C('3♠') });
  applyAction(s, 'p1', { type: 'play', cards: C('5♠') });
  applyAction(s, 'p2', { type: 'play', cards: C('7♠') });
  applyAction(s, 'p3', { type: 'play', cards: C('9♥') });
  applyAction(s, 'p0', { type: 'pass' }); applyAction(s, 'p1', { type: 'pass' }); applyAction(s, 'p2', { type: 'pass' });
  eq(s.turn, 3, 'P3 cầm cái');
  applyAction(s, 'p3', { type: 'play', cards: C('K♦') });
  eq(s.players[3].out, true, 'P3 về nhất');
  eq(s.players.filter(p => p.cong).length, 0, 'không ai cóng (ai cũng đã đánh)');
  applyAction(s, 'p0', { type: 'pass' }); applyAction(s, 'p1', { type: 'pass' }); applyAction(s, 'p2', { type: 'pass' });
  eq(s.turn, 0, 'người kế P3 (P0) hưởng sái');
  eq(s.table, null, 'bàn trống');
}
{ // thối heo: bét còn heo trả cho nhất
  const s = rig(['3♠', '4♠ 2♥ 2♠'], {});
  applyAction(s, 'p0', { type: 'play', cards: C('3♠') });
  eq(s.phase, 'ended', '2 người: P0 về là hết');
  eq(s.players[1].cong, true, 'P1 chưa đánh lá nào → cóng');
  eq(s.delta.p1, -(2 + 3 + 2) * 10, 'P1: hạng 2 + thối heo (1+2) + cóng 2 = 7 phần');
}
{ // người thắng ván trước đi trước, không cần 3♠
  const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }], { starter: 'c', toiTrang: false });
  eq(s.turn, 2, 'người thắng trước đi trước'); eq(s.mustInclude, null, 'không bắt buộc 3♠');
  const s2 = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { starter: 'b', spadeEvery: true, toiTrang: false });
  eq(s2.mustInclude != null, true, 'tuỳ chọn ván nào cũng 3♠');
}
{ // tự bỏ lượt: chỉ khi đang CHẶN mà không có bộ nào đè / chặt được
  const s = rig(['3♠ 4♣ 2♥', '5♠ 6♣', '7♠ 8♣ 9♥', 'K♦ Q♥ J♣']); s.mustInclude = null;
  eq(mustAutoPass(s, 'p0'), false, 'cầm cái (bàn trống) → không tự bỏ');
  applyAction(s, 'p0', { type: 'play', cards: C('2♥') });
  eq(mustAutoPass(s, 'p1'), true, 'không có gì đè heo cơ → tự bỏ');
  eq(mustAutoPass(s, 'p2'), false, 'chưa tới lượt P2 → không');
  applyAction(s, 'p1', { type: 'pass' });
  eq(mustAutoPass(s, 'p2'), true, 'P2 cũng không đè được');
}
{ // có hàng chặt được heo → KHÔNG tự bỏ
  const s = rig(['3♠ 2♥ 4♣', '9♠ 9♣ 9♦ 9♥ K♥', '5♠ 6♣', 'J♦ Q♣']); s.mustInclude = null;
  applyAction(s, 'p0', { type: 'play', cards: C('2♥') });
  eq(mustAutoPass(s, 'p1'), false, 'có tứ quý chặt heo → được chọn chặt');
  const t = rig(['3♠ 7♦ 4♣', '8♠ K♥', '5♠ 6♣', 'J♦ Q♣']); t.mustInclude = null;
  applyAction(t, 'p0', { type: 'play', cards: C('7♦') });
  eq(mustAutoPass(t, 'p1'), false, 'có lá lớn hơn → không tự bỏ');
  applyAction(t, 'p1', { type: 'play', cards: C('8♠') });
  eq(mustAutoPass(t, 'p2'), true, '5♠ 6♣ không đè được 8♠');
  applyAction(t, 'p2', { type: 'pass' }); applyAction(t, 'p3', { type: 'play', cards: C('J♦') });
  applyAction(t, 'p0', { type: 'pass' }); applyAction(t, 'p1', { type: 'pass' });
  eq(t.turn, 3, 'P3 cầm cái vòng mới'); eq(mustAutoPass(t, 'p3'), false, 'cầm cái thì không bao giờ tự bỏ');
}
{ // mô phỏng: người tự bỏ mỗi khi mustAutoPass → không bao giờ bị từ chối, ván vẫn kết thúc
  let bad = 0;
  for (let g = 0; g < 60; g++) {
    const s = createGame(['a', 'b', 'c', 'd'].slice(0, 2 + g % 3).map(id => ({ id, name: id, isBot: true })), { ...DEFAULT_OPTS, toiTrang: g % 2 === 0 });
    let k = 0;
    while (s.phase === 'playing' && k++ < 2000) {
      const cur = current(s);
      if (mustAutoPass(s, cur.id)) { if (!applyAction(s, cur.id, { type: 'pass' }).ok) { bad++; break; } continue; }
      const a = botAction(s, cur.id, 'normal'); if (!a || !applyAction(s, cur.id, a).ok) { bad++; break; }
    }
    if (s.phase !== 'ended') bad++;
  }
  eq(bad, 0, 'tự bỏ lượt không làm kẹt ván');
}
{ // cấm về heo: không được về bằng heo; còn mỗi heo thì kẹt → bét + thối heo
  const s = rig(['3♠ 2♥', '4♠ 5♣', '6♦ 7♥'], { veHeo: 'heo', bet: 10 });
  applyAction(s, 'p0', { type: 'play', cards: C('3♠') });
  applyAction(s, 'p1', { type: 'play', cards: C('4♠') });
  applyAction(s, 'p2', { type: 'play', cards: C('6♦') });
  eq(applyAction(s, 'p0', { type: 'play', cards: C('2♥') }), { ok: false, reason: 'Không được về bằng heo 🐷' }, 'về bằng heo bị từ chối');
  eq(mustAutoPass(s, 'p0'), true, 'chỉ còn heo khi chặn → tự bỏ');
  applyAction(s, 'p0', { type: 'pass' }); applyAction(s, 'p1', { type: 'pass' });
  applyAction(s, 'p2', { type: 'play', cards: C('7♥') });
  eq(s.players[2].out, true, 'P2 về nhất');
  applyAction(s, 'p0', { type: 'pass' }); applyAction(s, 'p1', { type: 'pass' });
  eq(s.players[0].stuck, true, 'P0 cầm cái mà chỉ còn heo → kẹt');
  eq(s.phase, 'ended', 'còn 1 người → hết ván');
  eq(s.places, ['p2', 'p1', 'p0'], 'người kẹt heo chịu bét');
  eq(s.pays.some(x => x.why === 'thoi' && x.from === 'p0'), true, 'kẹt heo bị thối heo');
}
{ // cấm về heo + hàng (mặc định)
  eq(DEFAULT_OPTS.veHeo, 'heoHang', 'mặc định cấm về heo + hàng');
  const s = rig(['9♠ 9♣ 9♦ 9♥', '3♠ 4♣', '5♠ 6♣'], { veHeo: 'heoHang', starter: 'p0' }); s.turn = 0; s.mustInclude = null;
  eq(legalFor(s, 'p0').some(ids => ids.length === 4), false, 'không được về bằng tứ quý');
  eq(legalFor(s, 'p0').length > 0, true, 'vẫn đánh lẻ được');
  eq(applyAction(s, 'p0', { type: 'play', cards: C('9♠ 9♣ 9♦ 9♥') }).reason, 'Không được về bằng tứ quý 💣', 'lý do tứ quý');
  eq(badFinish(C('5♠ 5♥ 6♣ 6♦ 7♠ 7♥'), C('5♠ 5♥ 6♣ 6♦ 7♠ 7♥'), 'heoHang'), 'Không được về bằng đôi thông 💣', 'không về bằng 3 đôi thông');
  eq(badFinish(C('5♠ 5♥ 6♣ 6♦ 7♠ 7♥'), C('5♠ 5♥ 6♣ 6♦ 7♠ 7♥'), 'heo'), null, 'chỉ cấm heo → về đôi thông được');
  eq(badFinish(C('2♠ 2♥'), C('2♠ 2♥'), 'free'), null, 'cho phép → về heo được');
  eq(badFinish(C('2♠ 2♥ 3♦'), C('2♠ 2♥'), 'heoHang'), null, 'chưa hết bài thì đánh heo bình thường');
}
console.log(fails ? `LUẬT: ${fails} lỗi` : 'Luật: OK (unit test)');

// ---------- mô phỏng hàng trăm ván ----------
const N = +process.argv[2] || 400;
const lv = Object.keys(LEVELS);
let stuck = 0, errs = 0, games = 0, chops = 0, cong = 0, ketHeo = 0, toi = 0, moves = 0, chipBad = 0, wins = { easy: 0, normal: 0, hard: 0 }, seats = { easy: 0, normal: 0, hard: 0 };
let seed = 12345; setRandom(() => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; });
for (const np of [2, 3, 4]) {
  const chips = {}; const ids = Array.from({ length: np }, (_, i) => 'b' + i);
  ids.forEach(id => { chips[id] = START_CHIPS; });
  let minted = 0, starter = null;
  for (let g = 0; g < N; g++) {
    const levels = ids.map((_, i) => lv[(i + g) % 3]);
    const opts = { ...DEFAULT_OPTS, bet: [10, 20, 50][g % 3], chatChong: g % 4 !== 1, thoiHang: g % 5 !== 2, spadeEvery: g % 7 === 3, veHeo: ['heoHang', 'heo', 'free'][g % 3], starter, firstGame: g === 0 };
    for (const id of ids) if (chips[id] < 5 * opts.bet) { chips[id] += START_CHIPS; minted += START_CHIPS; }
    const s = createGame(ids.map(id => ({ id, name: id, isBot: true })), opts);
    let k = 0;
    while (s.phase === 'playing' && k < 2000) {
      const cur = current(s); const a = botAction(s, cur.id, levels[s.turn]);
      if (!a) { stuck++; break; }
      const r = applyAction(s, cur.id, a);
      if (!r.ok) { errs++; if (errs < 6) console.log('ERR', r.reason, a, s.table); break; }
      const total = s.players.reduce((t, p) => t + p.hand.length, 0) + s.gone.length;
      if (total !== np * 13) { errs++; console.log('LỖI số lá', total); break; }
      k++;
    }
    if (s.phase !== 'ended') { stuck++; continue; }
    const sum = Object.values(s.delta).reduce((a, b) => a + b, 0);
    if (sum !== 0) chipBad++;
    if (new Set(s.places).size !== np) { errs++; console.log('LỖI hạng', s.places); }
    for (const p of s.players) chips[p.id] += s.delta[p.id];
    const all = Object.values(chips).reduce((a, b) => a + b, 0);
    if (all !== np * START_CHIPS + minted) chipBad++;
    games++; moves += s.moves; chops += s.chopCount; cong += s.players.filter(p => p.cong).length; ketHeo += s.players.filter(p => p.stuck).length; if (s.toiTrang) toi++;
    if (np === 4) { const w = s.players.findIndex(p => p.id === s.places[0]); wins[levels[w]]++; levels.forEach(l => seats[l]++); }
    starter = s.places[0];
  }
}
console.log({ games, stuck, errs, chipBad, avgMoves: +(moves / games).toFixed(1), chopsPerGame: +(chops / games).toFixed(2), cong, ketHeo, toiTrang: toi });
console.log('Tỉ lệ về nhất (4 người, theo cấp bot):', Object.fromEntries(Object.keys(wins).map(k => [k, (wins[k] / seats[k] * 4 * 100).toFixed(0) + '% (kỳ vọng ngẫu nhiên 100%)'])));
if (fails || stuck || errs || chipBad) { console.log('❌ CÓ LỖI'); process.exitCode = 1; } else console.log('✅ 0 kẹt, 0 lỗi, tổng chip bảo toàn');
