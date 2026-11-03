// Unit test luật Cát tê: node catte/test/unit.mjs
import { createGame, applyAction, nextHand, whiteHand, legalMoves, viewFor, beats, parseCard, chipTotal, waitingOn } from '../js/engine.js';
import { botAction } from '../js/bot.js';
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('❌', m); } };
const C = parseCard;
const H = s => s.split(' ').map(C);
const P3 = [{ id: 'a', name: 'An' }, { id: 'b', name: 'Bình' }, { id: 'c', name: 'Chi' }];
const NOW = { wQuads: false, wFlush: false, wSmall: false };
function game(rig, opts = {}, players = P3) {
  const s = createGame(players, { ...NOW, ...opts }, rig);
  s.leader = players[0].id; // tests: a cầm cái – chia lại cho chắc
  s.trick = { no: 1, leader: 'a', lead: null, top: null, plays: [], turn: 'a' };
  return s;
}
const play = (s, pid, card, down = false) => applyAction(s, pid, { type: 'play', card, down });

// --- so lá ---
ok(beats(C('9H'), C('8H')) && !beats(C('8H'), C('9H')) && !beats(C('AS'), C('2H')), 'beats: cùng chất & lớn hơn');
ok(beats(C('AH'), C('KH')) && !beats(C('2H'), C('AH')), 'A lớn nhất, 2 nhỏ nhất');

// --- đè / úp ---
{
  const s = game([H('9H 2S 3S 4C 5C 6D'), H('10H 8H KS 7C 2D 3D'), H('AH 7S 8S 9C 10C 4D')]);
  ok(waitingOn(s)[0] === 'a', 'cái đi trước');
  ok(!play(s, 'b', '10H').ok, 'chưa tới lượt thì không được đánh');
  ok(play(s, 'a', '9H').ok, 'cái đánh lá bất kỳ');
  ok(!play(s, 'b', '8H').ok, 'lá nhỏ hơn không được đè');
  ok(!play(s, 'b', 'KS').ok, 'khác chất không được đè');
  const lm = legalMoves(s, 'b');
  ok(lm.filter(m => !m.down).map(m => m.card).join() === '10H', 'chỉ 10♥ đè được');
  ok(lm.filter(m => m.down).length === 6, 'lá nào cũng úp được');
  ok(play(s, 'b', '10H').ok, 'đè bằng 10♥');
  ok(!play(s, 'c', '9C').ok, 'phải lớn hơn lá đang thắng (10♥), không phải lá cái');
  ok(play(s, 'c', 'AH', true).ok, 'được úp cả lá đè được');
  ok(s.history[0].winner === 'b', 'lá đè cao nhất ăn vòng (lá úp không tính)');
  ok(s.trick.leader === 'b' && waitingOn(s)[0] === 'b', 'người ăn cầm cái vòng sau');
  const va = viewFor(s, 'a');
  ok(va.history[0].plays[2].card === null && viewFor(s, 'c').history[0].plays[2].card.id === 'AH', 'lá úp chỉ chủ nhân thấy');
  ok(va.players.find(p => p.id === 'b').hand.length === 0 && va.players.find(p => p.id === 'b').handCount === 5, 'ẩn bài người khác');
}
// --- chết sau vòng 4 + tới vòng 6 (lật ngửa lần lượt) ---
{
  const s = game([H('AS KS 2C 3C 4D 5D'), H('2S 3S QS JS 6D 7D'), H('4S 5S 6S 7S AC KC')], { showdown: 'ngua' });
  // a ăn 2 vòng đầu bằng Át, K bích; c giữ AC KC
  play(s, 'a', 'AS'); play(s, 'b', '2S', true); play(s, 'c', '4S', true);
  play(s, 'a', 'KS'); play(s, 'b', '3S', true); play(s, 'c', '5S', true);
  ok(s.players[0].won === 2, 'a ăn 2 vòng');
  play(s, 'a', '2C'); play(s, 'b', 'QS', true); ok(play(s, 'c', 'AC').ok, 'c đè A♣');
  ok(s.trick.leader === 'c', 'c cầm cái vòng 4');
  play(s, 'c', '6S'); play(s, 'a', '3C', true); play(s, 'b', 'JS', true);
  const b = s.players[1];
  ok(b.out && b.won === 0, 'b không ăn vòng nào → chết sau vòng 4');
  ok(s.ev.some(e => e.k === 'dead' && e.ids.join() === 'b'), 'sự kiện chết');
  ok(s.phase === 'play' && s.trickNo === 5, 'còn 2 người → vào vòng lật bài');
  ok(!play(s, 'b', '6D').ok, 'người chết không được đánh');
  // vòng 5: c cầm cái (ăn vòng 4)
  ok(play(s, 'c', 'KC').ok, 'c dẫn K♣ vòng 5');
  ok(play(s, 'a', '4D').ok, 'vòng 5 lật bài: lá nào cũng ngửa');
  ok(s.phase === 'handEnd' && s.history.length === 6, 'vòng 6 tự lật, ván kết thúc');
  ok(s.result.winner === 'c' && s.result.how === 'toi', 'c ăn vòng 6 → TỚI');
  ok(s.result.pot === 150 && s.result.deltas.c === 100 && s.result.deltas.a === -50, 'người tới hốt nồi');
  ok(chipTotal(s) === s.startTotal + s.minted, 'bảo toàn chip');
  nextHand(s); ok(s.leader === 'c', 'người tới cầm cái ván sau');
}
// --- ăn trọn 4 vòng: cả bàn chết ---
{
  const s = game([H('AS AC AD AH 2S 3S'), H('2C 3C 4C 5C 6C 7C'), H('2D 3D 4D 5D 6D 7D')], { bSweep: true });
  for (const c of ['AS', 'AC', 'AD', 'AH']) { play(s, 'a', c); play(s, 'b', s.players[1].hand[0].id, true); play(s, 'c', s.players[2].hand[0].id, true); }
  ok(s.phase === 'handEnd' && s.result.how === 'sweep' && s.result.winner === 'a', 'ăn trắng 4 vòng thắng luôn');
  ok(s.result.bonuses.length === 2 && s.result.bonuses[0].amt === 25, 'thưởng ½ cược mỗi nhà');
  ok(chipTotal(s) === s.startTotal + s.minted, 'bảo toàn chip (sweep)');
}
// --- chưng bài vòng 5 ---
{
  const s = game([H('AS KS 9H 2C 3C 4C'), H('2S 3S QH 5C 6C 7C'), H('4S 5S 6S 8H 8C 9C')]);
  play(s, 'a', 'AS'); play(s, 'b', '2S', true); play(s, 'c', '4S', true);
  play(s, 'a', 'KS'); play(s, 'b', '3S', true); play(s, 'c', '5S', true);
  play(s, 'a', '2C'); ok(play(s, 'b', '5C').ok, 'b đè 5♣'); ok(play(s, 'c', '8C').ok, 'c đè 8♣');
  play(s, 'c', '6S'); play(s, 'a', '3C', true); play(s, 'b', '6C', true);
  ok(s.players[1].out, 'b chết');
  // vòng 5: c cầm cái, chưng
  play(s, 'c', '9C');
  ok(s.phase === 'chung' && waitingOn(s).join() === 'a', 'vòng 5 chưng: người còn lại chọn cùng lúc');
  const vc = viewFor(s, 'c');
  ok(vc.chung && vc.chung.need.join() === 'a', 'view chưng');
  ok(play(s, 'a', '4C').ok, 'a chưng 4♣');
  ok(s.history[4].winner === 'c' && s.phase === 'handEnd' && s.result.winner === 'a', 'c ăn vòng 5, a lật 9♥ không bị đè → a TỚI (c còn 8♥)');
}
// --- tới trắng ---
ok(whiteHand(H('KS KC KD KH 2S 3D')).kind === 'quads', 'tứ quý');
ok(whiteHand(H('2H 5H 9H JH QH AH')).kind === 'flush', '6 lá đồng chất');
ok(whiteHand(H('2S 3C 4D 5H 5S 2H')).kind === 'small', '6 lá nhỏ hơn 6');
ok(!whiteHand(H('2S 3C 4D 5H 6S 2H')), 'có lá 6 thì không tính nhỏ hơn 6');
ok(!whiteHand(H('KS KC KD KH 2S 3D'), { wQuads: false, wFlush: true, wSmall: true }), 'tắt luật tứ quý');
{
  const s = createGame(P3, { bWhite: true }, [H('2S 3S 4D 5D 6H 7H'), H('9S 9C 9D 9H 2C 3C'), H('2H 5H 9H JH QH AH').map(c => c.id === '2H' ? C('10H') : c)]);
  ok(s.phase === 'handEnd' && s.result.how === 'white' && s.result.winner === 'b' && s.result.kind === 'quads', 'tứ quý > đồng chất khi cùng tới trắng');
  ok(s.result.bonuses.length === 2 && s.result.deltas.b === 200, 'tới trắng ăn nồi + thưởng 1 cược mỗi nhà');
  ok(chipTotal(s) === s.startTotal + s.minted, 'bảo toàn chip (trắng)');
}
{
  const s = createGame(P3, {}, [H('2S 3S 4S 5D 6H 7H'), H('2H 3H 4H 5H 2C 3C'), H('AS 5S 9S JS QS KS')]);
  ok(s.result && s.result.winner === 'c' && s.result.kind === 'flush', 'đồng chất > 6 lá nhỏ');
}
// --- chip ảo: hết chip được mẹ cho ---
{
  const s = game([H('9H 2S 3S 4C 5C 6D'), H('10H 8H KS 7C 2D 3D'), H('AH 7S 8S 9C 10C 4D')]);
  s.startTotal -= s.players[0].chips - 10; s.players[0].chips = 10;
  ok(applyAction(s, 'a', { type: 'refill' }).ok && s.players[0].chips === 1010, 'xin mẹ thêm chip');
  ok(!applyAction(s, 'a', { type: 'refill' }).ok, 'còn nhiều chip thì không xin được');
  ok(chipTotal(s) === s.startTotal + s.minted, 'bảo toàn chip (xin thêm)');
  s.phase = 'handEnd'; s.players[0].chips += s.pot; s.pot = 0; s.startTotal -= s.players[1].chips; s.players[1].chips = 0; s.lastWinner = 'a'; nextHand(s);
  ok(s.players[1].chips === 1000 - 50, 'tự động xin chip khi không đủ cược');
  ok(chipTotal(s) === s.startTotal + s.minted, 'bảo toàn chip (tự xin)');
}
// --- thối Át + tới bằng lá nhỏ ---
{
  const s = game([H('AS KS 2C 3C 4D 5D'), H('2S 3S QS JS AD AH'), H('4S 5S 6S 7S AC KC')], { showdown: 'ngua', thoiAt: true, bLow: true });
  play(s, 'a', 'AS'); play(s, 'b', '2S', true); play(s, 'c', '4S', true);
  play(s, 'a', 'KS'); play(s, 'b', '3S', true); play(s, 'c', '5S', true);
  play(s, 'a', '2C'); play(s, 'b', 'QS', true); play(s, 'c', 'AC');
  play(s, 'c', '6S'); play(s, 'a', '3C', true); play(s, 'b', 'JS', true);
  play(s, 'c', 'KC'); play(s, 'a', '4D');
  const R = s.result;
  ok(R.winner === 'c' && R.card.id === '7S', 'tới bằng 7♠');
  ok(R.bonuses.some(b => b.from === 'b' && b.amt === 100 && /Thối/.test(b.why)), 'b chết giữ 2 Át → thối 2 cược');
  ok(R.bonuses.some(b => b.from === 'a' && b.amt === Math.floor(50 * 7 / 4)), 'tới bằng lá 7: người còn sống trả (14−7)/4 cược');
  ok(!R.bonuses.some(b => b.from === 'b' && /lá/.test(b.why)), 'người chết không trả thưởng lá nhỏ');
  ok(chipTotal(s) === s.startTotal + s.minted, 'bảo toàn chip (thưởng)');
}
// --- bot ---
{
  // chưa có tồn, vòng 4, đè được thì phải đè
  const s = game([H('9H 2S'), H('10H 3S'), H('AH 4S')]);
  s.trickNo = 4; s.trick.no = 4; s.players[0].won = 2; s.players[2].won = 1; s.players.forEach(p => p.hand = p.hand.slice(0, 2));
  play(s, 'a', '9H');
  const a = botAction(s, 'b');
  ok(a.card === '10H' && !a.down, 'bot chưa có tồn: vòng 4 cố đè để sống');
  const s2 = game([H('AS 2C 3C 4D 9H KD'), H('10H 3S 5C 6C 7C 8C'), H('JH 4S 5S 6S 7S 8S')]);
  const a2 = botAction(s2, 'a');
  ok(a2.card === 'AS', 'bot cầm cái chưa có tồn: đánh Át chắc ăn');
  play(s2, 'a', 'AS');
  const a3 = botAction(s2, 'b'); ok(a3.down && a3.card === '3S', 'không đè được thì úp lá nhỏ nhất');
}
console.log(`${n - fails}/${n} test qua`);
process.exitCode = fails ? 1 : 0;
