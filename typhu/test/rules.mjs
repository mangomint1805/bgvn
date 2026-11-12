// Unit test luật Cờ Tỷ Phú. Chạy: node typhu/test/rules.mjs
import './load.mjs';
import assert from 'assert/strict';
import { SIDES, sideOwned, winCheckFor, createGame, applyAction, setRandom, TILES, CARDS, actorOf, rentOf, buybackPrice, netWorth, canBuild, tradeImpact, tradeSideValue, planRaise, raiseSummary } from '../js/engine.js?v=57';
import { botAction, judgeTrade } from '../js/bot.js?v=57';

let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; console.log('  ✓ ' + name); } catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e.stack || e).toString().split('\n').slice(0, 3).join('\n    ')); } }
// xúc xắc theo kịch bản
function dice(...vals) { const q = vals.flat(); setRandom(() => { if (!q.length) throw new Error('hết xúc xắc kịch bản'); return (q.shift() - 1) / 6 + 0.01; }); }
const T = name => TILES.findIndex(t => t.name === name);
function game(n = 2, opts = {}) { setRandom(Math.random); return createGame(Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'N' + i })), opts); }
const act = (s, pid, a) => { const r = applyAction(s, pid, a); assert.ok(r.ok, `${a.type}: ${r.reason}`); return r; };
const own = (s, pid, i, h = 0, mort = false) => { s.props[i] = { owner: pid, h, mort }; };
const cardTop = (s, deck, id) => { const k = CARDS[deck].findIndex(c => c.id === id); s.decks[deck] = [k, ...s.decks[deck].filter(x => x !== k)]; };
const P = (s, id) => s.players.find(p => p.id === id);

console.log('Cờ Tỷ Phú – kiểm tra luật');
test('dữ liệu 40 ô, 32 thẻ', () => { assert.equal(TILES.length, 40); assert.equal(CARDS.chance.length, 16); assert.equal(CARDS.chest.length, 16); assert.equal(TILES[10].type, 'jail'); assert.equal(TILES[30].type, 'gotojail'); });
test('đổ xúc xắc, mua đất', () => {
  const s = game(); dice(1, 2); act(s, 'p0', { type: 'roll' });
  assert.equal(P(s, 'p0').pos, 3); assert.equal(s.stage, 'buy');
  act(s, 'p0', { type: 'buy' }); assert.equal(s.props[3].owner, 'p0'); assert.equal(P(s, 'p0').cash, 1500 - 60); assert.equal(s.stage, 'end');
  act(s, 'p0', { type: 'end' }); assert.equal(actorOf(s), 'p1');
});
test('không phải lượt thì bị từ chối', () => { const s = game(); assert.equal(applyAction(s, 'p1', { type: 'roll' }).ok, false); });
test('tiền thuê đất trống, gấp đôi khi đủ nhóm, theo số nhà', () => {
  const s = game(); own(s, 'p1', 3); dice(1, 2); act(s, 'p0', { type: 'roll' });
  assert.equal(P(s, 'p0').cash, 1496); assert.equal(P(s, 'p1').cash, 1504);
  own(s, 'p1', 1); assert.equal(rentOf(s, 3), 8);
  s.props[1].h = 2; s.props[3].h = 2; assert.equal(rentOf(s, 3), 60); s.props[3].h = 5; assert.equal(rentOf(s, 3), 450);
});
test('xây nhà đều tay, Landmark sau 4 nhà', () => {
  const s = game(); own(s, 'p0', 1); own(s, 'p0', 3);
  act(s, 'p0', { type: 'build', tile: 1 }); assert.equal(applyAction(s, 'p0', { type: 'build', tile: 1 }).ok, false, 'phải xây đều');
  act(s, 'p0', { type: 'build', tile: 3 }); act(s, 'p0', { type: 'build', tile: 1 });
  s.props[1].h = 4; s.props[3].h = 3; assert.equal(applyAction(s, 'p0', { type: 'build', tile: 1 }).ok, false, 'Landmark cần đủ 4 nhà cả nhóm');
  s.props[3].h = 4; act(s, 'p0', { type: 'build', tile: 1 }); assert.equal(s.props[1].h, 5);
  assert.equal(applyAction(s, 'p0', { type: 'build', tile: 1 }).ok, false);
});
test('luật cổ điển (freeBuild tắt): không xây khi chưa đủ nhóm hoặc có ô thế chấp', () => {
  const s = game(); s.opts.freeBuild = false; own(s, 'p0', 1); assert.equal(applyAction(s, 'p0', { type: 'build', tile: 1 }).ok, false);
  own(s, 'p0', 3, 0, true); assert.equal(applyAction(s, 'p0', { type: 'build', tile: 1 }).ok, false);
});
test('kiểu ZingPlay (mặc định): xây được khi chưa đủ nhóm; đủ nhóm mà có ô thế chấp thì không', () => {
  const s = game(); own(s, 'p0', 1); assert.equal(applyAction(s, 'p0', { type: 'build', tile: 1 }).ok, true);
  const s2 = game(); own(s2, 'p0', 1); own(s2, 'p0', 3, 0, true); assert.equal(applyAction(s2, 'p0', { type: 'build', tile: 1 }).ok, false);
});
test('bán nhà đều tay, nửa giá', () => {
  const s = game(); own(s, 'p0', 1, 2); own(s, 'p0', 3, 1);
  assert.equal(applyAction(s, 'p0', { type: 'sell', tile: 3 }).ok, false);
  act(s, 'p0', { type: 'sell', tile: 1 }); assert.equal(P(s, 'p0').cash, 1525);
});
test('thế chấp nửa giá, chuộc +10%, không thế chấp khi nhóm còn nhà', () => {
  const s = game(); own(s, 'p0', 39); act(s, 'p0', { type: 'mortgage', tile: 39 }); assert.equal(P(s, 'p0').cash, 1700);
  act(s, 'p0', { type: 'unmortgage', tile: 39 }); assert.equal(P(s, 'p0').cash, 1700 - 220);
  own(s, 'p0', 1, 1); own(s, 'p0', 3, 0); assert.equal(applyAction(s, 'p0', { type: 'mortgage', tile: 3 }).ok, false);
});
test('ô thế chấp không thu tiền thuê', () => {
  const s = game(); own(s, 'p1', 3, 0, true); dice(1, 2); act(s, 'p0', { type: 'roll' }); assert.equal(P(s, 'p0').cash, 1500);
});
test('không mua thì đấu giá, người trả cao nhất được', () => {
  const s = game(3); dice(1, 2); act(s, 'p0', { type: 'roll' }); act(s, 'p0', { type: 'decline' });
  assert.equal(s.stage, 'auction'); assert.equal(actorOf(s), 'p1');
  act(s, 'p1', { type: 'bid', amount: 20 }); assert.equal(applyAction(s, 'p2', { type: 'bid', amount: 20 }).ok, false);
  act(s, 'p2', { type: 'bid', amount: 40 }); act(s, 'p0', { type: 'pass' }); act(s, 'p1', { type: 'pass' });
  assert.equal(s.props[3].owner, 'p2'); assert.equal(P(s, 'p2').cash, 1460); assert.equal(s.stage, 'end');
});
test('đấu giá mà ai cũng bỏ thì đất vẫn của ngân hàng', () => {
  const s = game(2); dice(1, 2); act(s, 'p0', { type: 'roll' }); act(s, 'p0', { type: 'decline' }); act(s, 'p1', { type: 'pass' }); act(s, 'p0', { type: 'pass' });
  assert.equal(s.props[3], undefined); assert.equal(s.stage, 'end');
});
test('mua lại đất (giá gấp đôi giá trị), không áp dụng Landmark', () => {
  const s = game(); own(s, 'p1', 1); own(s, 'p1', 3, 2); s.props[1].h = 2; dice(1, 2); act(s, 'p0', { type: 'roll' });
  assert.equal(s.stage, 'buyback'); const price = buybackPrice(s, 3); assert.equal(price, 2 * (60 + 2 * 50));
  const c0 = P(s, 'p0').cash, c1 = P(s, 'p1').cash; act(s, 'p0', { type: 'buyback' });
  assert.equal(s.props[3].owner, 'p0'); assert.equal(s.props[3].h, 2); assert.equal(P(s, 'p0').cash, c0 - price); assert.equal(P(s, 'p1').cash, c1 + price);
  const s2 = game(); own(s2, 'p1', 1, 4); own(s2, 'p1', 3, 5); dice(1, 2); act(s2, 'p0', { type: 'roll' }); assert.equal(s2.stage, 'end');
});
test('bến xe thuê theo số bến, điện nước ×4 / ×10', () => {
  const s = game(); own(s, 'p1', 5); own(s, 'p1', 15); assert.equal(rentOf(s, 5), 50); own(s, 'p1', 25); assert.equal(rentOf(s, 15), 100);
  own(s, 'p1', 12); assert.equal(rentOf(s, 12, 8), 32); own(s, 'p1', 28); assert.equal(rentOf(s, 12, 8), 80);
  const s3 = game(); own(s3, 'p1', 12); s3.players[0].pos = 1; dice(5, 6); act(s3, 'p0', { type: 'roll' }); assert.equal(P(s3, 'p0').pos, 12); assert.equal(P(s3, 'p1').cash, 1500 + 44);
});
test('qua Bắt đầu nhận 200K', () => { const s = game(); s.players[0].pos = 38; cardTop(s, 'chest', 'stock'); /* thẻ ngẫu nhiên có thể dời quân → cố định */ dice(1, 3); act(s, 'p0', { type: 'roll' }); assert.equal(P(s, 'p0').pos, 2); assert.equal(P(s, 'p0').cash >= 1700 - 200, true); assert.ok(s.ev.some(e => e.t === 'salary')); });
test('thuế', () => { const s = game(); dice(1, 3); act(s, 'p0', { type: 'roll' }); assert.equal(P(s, 'p0').cash, 1300); });
test('ô Vào tù → ở tù, đổ đôi được ra, đổ đôi thì đi tiếp', () => {
  const s = game(); s.players[0].pos = 25; dice(2, 3); act(s, 'p0', { type: 'roll' }); const p = P(s, 'p0');
  assert.equal(p.pos, 10); assert.equal(p.inJail, true); assert.equal(s.stage, 'end'); act(s, 'p0', { type: 'end' });
  dice(1, 2); act(s, 'p1', { type: 'roll' }); if (s.stage === 'buy') act(s, 'p1', { type: 'decline' }); while (s.stage === 'auction') act(s, actorOf(s), { type: 'pass' }); act(s, 'p1', { type: 'end' });
  dice(3, 3); act(s, 'p0', { type: 'roll' }); assert.equal(p.inJail, false); assert.equal(p.pos, 16); assert.notEqual(s.stage, 'roll', 'ra tù bằng đôi không được đổ thêm');
});
test('nộp 50K ra tù, thẻ ra tù', () => {
  const s = game(); const p = P(s, 'p0'); p.pos = 10; p.inJail = true; act(s, 'p0', { type: 'payJail' }); assert.equal(p.cash, 1450); assert.equal(p.inJail, false); assert.equal(s.stage, 'roll');
  p.inJail = true; p.cards = ['chance']; s.decks.chance = s.decks.chance.filter(k => CARDS.chance[k].id !== 'free_jail'); act(s, 'p0', { type: 'useCard' }); assert.equal(p.inJail, false); assert.equal(p.cards.length, 0);
  assert.ok(s.decks.chance.some(k => CARDS.chance[k].id === 'free_jail'));
});
test('ở tù 3 lượt không ra đôi thì bị buộc nộp 50K rồi đi', () => {
  const s = game(); const p = P(s, 'p0'); p.pos = 10; p.inJail = true; p.jailTurns = 2; dice(1, 2); act(s, 'p0', { type: 'roll' });
  assert.equal(p.inJail, false); assert.equal(p.pos, 13); assert.equal(p.cash, 1450);
});
test('đổ đôi được đi tiếp, 3 lần đôi liên tiếp vào tù', () => {
  const s2 = game(); const p = P(s2, 'p0');
  s2.players[0].pos = 20; own(s2, 'p0', 24); dice(2, 2); act(s2, 'p0', { type: 'roll' });
  assert.equal(s2.stage, 'roll'); assert.equal(s2.again, true);
  p.pos = 0; dice(1, 1); s2.decks.chest = [s2.decks.chest.find(k => CARDS.chest[k].id === 'beauty'), ...s2.decks.chest.filter(k => CARDS.chest[k].id !== 'beauty')]; act(s2, 'p0', { type: 'roll' }); assert.equal(s2.stage, 'roll');
  dice(3, 3); act(s2, 'p0', { type: 'roll' }); assert.equal(p.inJail, true); assert.equal(p.pos, 10); assert.equal(s2.stage, 'end');
});
test('thiếu tiền → nợ → thế chấp rồi trả', () => {
  const s = game(); own(s, 'p1', 39, 5); own(s, 'p1', 37, 5); own(s, 'p0', 1); s.players[0].pos = 35; P(s, 'p0').cash = 100; dice(1, 3); act(s, 'p0', { type: 'roll' });
  assert.equal(s.stage, 'debt'); assert.equal(s.debt.amount, 2000);
  assert.equal(applyAction(s, 'p0', { type: 'payDebt' }).ok, false);
  act(s, 'p0', { type: 'mortgage', tile: 1 }); assert.equal(P(s, 'p0').cash, 130);
  act(s, 'p0', { type: 'bankrupt' }); assert.equal(P(s, 'p0').out, true); assert.equal(s.props[1].owner, 'p1'); assert.equal(s.phase, 'over'); assert.equal(s.winner, 'p1'); assert.equal(s.winReason, 'last');
});
test('trả nợ xong thì ván tiếp tục', () => {
  const s = game(3); own(s, 'p1', 3); own(s, 'p0', 39); P(s, 'p0').cash = 2; dice(1, 2); act(s, 'p0', { type: 'roll' }); assert.equal(s.stage, 'debt');
  act(s, 'p0', { type: 'mortgage', tile: 39 }); act(s, 'p0', { type: 'payDebt' }); assert.notEqual(s.stage, 'debt'); assert.equal(P(s, 'p1').cash, 1504);
});
test('⚡ tự gom tiền: bán nhà nhóm đắt trước, đều tay, đủ là dừng rồi trả luôn', () => {
  const s = game(); own(s, 'p1', 39, 3); [31, 32, 34].forEach(i => own(s, 'p0', i, 2)); own(s, 'p0', 1, 1); own(s, 'p0', 3, 1); own(s, 'p0', 5);
  s.players[0].pos = 35; P(s, 'p0').cash = 1000; dice(1, 3); act(s, 'p0', { type: 'roll' });
  assert.equal(s.stage, 'debt'); assert.equal(s.debt.amount, 1400);
  const before = JSON.stringify(s); const plan = planRaise(s, 'p0', 1400); assert.equal(JSON.stringify(s), before, 'planRaise không đổi state');
  assert.equal(plan.ok, true); assert.equal(plan.steps.length, 4);
  act(s, 'p0', { type: 'autoRaise' });
  assert.deepEqual([31, 32, 34].map(i => s.props[i].h).sort(), [0, 1, 1], 'bán đều tay nhóm xanh lá');
  assert.equal(s.props[1].h, 1); assert.equal(s.props[3].h, 1); assert.equal(s.props[5].mort, false, 'không bán/thế chấp dư');
  assert.equal(P(s, 'p0').cash, 0); assert.equal(P(s, 'p1').cash, 1500 + 1400); assert.notEqual(s.stage, 'debt'); assert.equal(s.debt, null);
  const e = s.ev.find(x => x.t === 'raise'); assert.ok(e && e.amt === 400); assert.match(raiseSummary(e.steps), /bán 4 nhà/);
});
test('⚡ tự gom tiền: hết nhà thì thế chấp – chọn ô rẻ nhất vừa đủ, không thế chấp dư', () => {
  const s = game(); own(s, 'p1', 39, 3); own(s, 'p0', 1); own(s, 'p0', 3); own(s, 'p0', 5); own(s, 'p0', 6, 1);
  s.players[0].pos = 35; P(s, 'p0').cash = 1300; dice(1, 3); act(s, 'p0', { type: 'roll' }); assert.equal(s.stage, 'debt');
  act(s, 'p0', { type: 'autoRaise' });
  assert.equal(s.props[6].h, 0); assert.equal(s.props[5].mort, true); assert.equal(s.props[1].mort, false); assert.equal(s.props[3].mort, false); assert.equal(s.props[6].mort, false);
  assert.equal(P(s, 'p0').cash, 25); assert.equal(s.stage, 'end');
});
test('⚡ tự gom tiền: không đủ thì bị từ chối, không đụng tài sản; ngoài lúc nợ cũng bị từ chối', () => {
  const s = game(); own(s, 'p1', 39, 5); own(s, 'p0', 31, 1); own(s, 'p0', 1);
  assert.equal(applyAction(s, 'p0', { type: 'autoRaise' }).ok, false);
  s.players[0].pos = 35; P(s, 'p0').cash = 100; dice(1, 3); act(s, 'p0', { type: 'roll' }); assert.equal(s.stage, 'debt');
  const before = JSON.stringify(s); assert.equal(applyAction(s, 'p0', { type: 'autoRaise' }).ok, false); assert.equal(JSON.stringify(s), before);
  assert.equal(applyAction(s, 'p1', { type: 'autoRaise' }).ok, false, 'người khác không bấm hộ được');
});
test('⚡ tự gom tiền theo luật ZingPlay thật (bán ô nào cũng được)', () => {
  const s = game(2, { freeBuild: 'zing' }); own(s, 'p1', 39, 3); own(s, 'p0', 31, 3); own(s, 'p0', 6, 2);
  s.players[0].pos = 35; P(s, 'p0').cash = 1250; dice(1, 3); act(s, 'p0', { type: 'roll' });
  act(s, 'p0', { type: 'autoRaise' }); assert.equal(s.props[31].h, 1); assert.equal(s.props[6].h, 2); assert.equal(P(s, 'p0').cash, 50);
});
test('phá sản với ngân hàng → đất trả về ngân hàng', () => {
  const s = game(3); own(s, 'p0', 1); P(s, 'p0').cash = 10; dice(1, 3); act(s, 'p0', { type: 'roll' }); assert.equal(s.stage, 'debt'); act(s, 'p0', { type: 'bankrupt' });
  assert.equal(s.props[1], undefined); assert.equal(actorOf(s), 'p1'); assert.equal(s.phase, 'playing');
});
test('giao dịch có xác nhận', () => {
  const s = game(); own(s, 'p0', 1); own(s, 'p1', 3);
  act(s, 'p0', { type: 'trade', to: 'p1', give: { cash: 100, tiles: [1] }, get: { tiles: [3] } }); assert.equal(s.stage, 'trade'); assert.equal(actorOf(s), 'p1');
  act(s, 'p1', { type: 'accept' }); assert.equal(s.props[1].owner, 'p1'); assert.equal(s.props[3].owner, 'p0'); assert.equal(P(s, 'p1').cash, 1600); assert.equal(s.stage, 'roll');
  act(s, 'p0', { type: 'trade', to: 'p1', give: { cash: 5 } }); act(s, 'p1', { type: 'reject' }); assert.equal(P(s, 'p1').cash, 1600);
  act(s, 'p0', { type: 'trade', to: 'p1', give: { cash: 5 } }); act(s, 'p0', { type: 'cancel' }); assert.equal(s.stage, 'roll');
  assert.equal(applyAction(s, 'p0', { type: 'trade', to: 'p1', give: { cash: 5 } }).ok, false, 'tối đa 3 lần mỗi lượt');
});
test('không giao dịch đất khi nhóm màu còn nhà', () => {
  const s = game(); own(s, 'p0', 1, 1); own(s, 'p0', 3, 1); assert.equal(applyAction(s, 'p0', { type: 'trade', to: 'p1', give: { tiles: [1] }, get: { cash: 10 } }).ok, false);
});
test('thắng khi sở hữu trọn 3 nhóm màu (mua ô cuối)', () => {
  const s = game(); [1, 3, 6, 8, 11, 13, 14].forEach(i => own(s, 'p0', i)); s.players[0].pos = 5; dice(1, 3); act(s, 'p0', { type: 'roll' }); act(s, 'p0', { type: 'buy' });
  assert.equal(s.phase, 'over'); assert.equal(s.winner, 'p0'); assert.equal(s.winReason, 'groups');
});
test('thắng khi sở hữu cả 4 bến xe', () => {
  const s = game(); [5, 15, 25].forEach(i => own(s, 'p0', i)); s.players[0].pos = 32; dice(1, 2); act(s, 'p0', { type: 'roll' }); act(s, 'p0', { type: 'buy' });
  assert.equal(s.winReason, 'stations'); assert.equal(s.winner, 'p0');
});
test('tắt thắng độc quyền thì chơi tiếp', () => {
  const s = game(2, { monopolyWin: false }); [5, 15, 25].forEach(i => own(s, 'p0', i)); s.players[0].pos = 32; dice(1, 2); act(s, 'p0', { type: 'roll' }); act(s, 'p0', { type: 'buy' }); assert.equal(s.phase, 'playing');
});
test('giới hạn vòng: hết vòng người giàu nhất thắng', () => {
  const s = game(2, { maxRounds: 1 }); P(s, 'p1').cash = 3000;
  dice(1, 3); act(s, 'p0', { type: 'roll' }); act(s, 'p0', { type: 'end' }); dice(1, 3); act(s, 'p1', { type: 'roll' }); act(s, 'p1', { type: 'end' });
  assert.equal(s.phase, 'over'); assert.equal(s.winReason, 'rounds'); assert.equal(s.winner, 'p1');
});
test('thẻ: lùi 3 ô, về Bắt đầu, sửa nhà, sinh nhật', () => {
  const s = game(3); cardTop(s, 'chance', 'back3'); dice(3, 4); act(s, 'p0', { type: 'roll' }); assert.equal(P(s, 'p0').pos, 4); assert.equal(P(s, 'p0').cash, 1300, 'lùi về ô thuế');
  const s2 = game(); cardTop(s2, 'chance', 'go_start'); dice(3, 4); act(s2, 'p0', { type: 'roll' }); assert.equal(P(s2, 'p0').pos, 0); assert.equal(P(s2, 'p0').cash, 1700);
  const s3 = game(); own(s3, 'p0', 1, 5); own(s3, 'p0', 3, 4); cardTop(s3, 'chance', 'repair'); dice(3, 4); act(s3, 'p0', { type: 'roll' }); assert.equal(P(s3, 'p0').cash, 1500 - 100 - 4 * 25);
  const s4 = game(3); cardTop(s4, 'chest', 'birthday'); dice(1, 1); act(s4, 'p0', { type: 'roll' }); assert.equal(P(s4, 'p0').cash, 1560); assert.equal(P(s4, 'p1').cash, 1470);
  const ev = s4.ev.find(e => e.t === 'card'); assert.equal(ev.title.includes('N0'), true, 'tên người bốc thay {name}');
});
test('thẻ sinh nhật: người không đủ tiền tự thế chấp, vẫn thiếu thì phá sản về người bốc', () => {
  const s = game(3); P(s, 'p1').cash = 10; own(s, 'p1', 39); P(s, 'p2').cash = 5; cardTop(s, 'chest', 'birthday'); dice(1, 1); act(s, 'p0', { type: 'roll' });
  assert.equal(s.props[39].mort, true); assert.equal(P(s, 'p1').cash, 10 + 200 - 30); assert.equal(P(s, 'p2').out, true); assert.equal(P(s, 'p0').cash, 1500 + 30 + 5);
});
test('thẻ tới bến xe gần nhất trả gấp đôi', () => {
  const s = game(); own(s, 'p1', 15); cardTop(s, 'chance', 'near_station'); dice(3, 4); act(s, 'p0', { type: 'roll' }); assert.equal(P(s, 'p0').pos, 15); assert.equal(P(s, 'p1').cash, 1550);
});
test('thẻ vào tù', () => { const s = game(); cardTop(s, 'chance', 'jail'); dice(3, 4); act(s, 'p0', { type: 'roll' }); assert.equal(P(s, 'p0').inJail, true); assert.equal(P(s, 'p0').pos, 10); });
test('tài sản ròng', () => { const s = game(); own(s, 'p0', 1, 2); own(s, 'p0', 39, 0, true); assert.equal(netWorth(s, 'p0'), 1500 + 60 + 100 + 200); });

test('xây tự do: bán nhà ở ô lẻ (nhóm chưa đủ) không lỗi; nhà người khác cùng màu không cản thế chấp/giao dịch', () => {
  const s = game(); own(s, 'p0', 1, 2);
  act(s, 'p0', { type: 'sell', tile: 1 }); assert.equal(s.props[1].h, 1);
  own(s, 'p1', 3); assert.equal(s.stage, 'roll');
  dice(1, 2); act(s, 'p0', { type: 'roll' }); act(s, 'p0', { type: 'skipBuyback' }); act(s, 'p0', { type: 'end' });
  act(s, 'p1', { type: 'mortgage', tile: 3 }); assert.equal(s.props[3].mort, true);
});


console.log('— Luật "ZingPlay thật" (chỉ xây ở ô vừa dừng) + xây nhiều nhà một lần');
const Z = { freeBuild: 'zing' };
test('zing: chưa dừng ở ô thì không xây; dừng ở đất mình thì xây được nhiều nhà một lần', () => {
  const s = game(2, Z); own(s, 'p0', 1); own(s, 'p0', 3);
  assert.equal(applyAction(s, 'p0', { type: 'build', tile: 1 }).ok, false, 'đầu lượt chưa dừng ô nào');
  dice(1, 2); act(s, 'p0', { type: 'roll' }); assert.equal(s.landed, 3); assert.equal(s.stage, 'end');
  assert.equal(canBuild(s, 'p0', 3), true); assert.equal(canBuild(s, 'p0', 1), false, 'ô không vừa dừng');
  act(s, 'p0', { type: 'build', tile: 3, n: 3 }); assert.equal(s.props[3].h, 3); assert.equal(P(s, 'p0').cash, 1500 - 150);
  assert.equal(s.ev.filter(e => e.t === 'build').length, 3, 'mỗi nhà 1 sự kiện để hoạt ảnh');
  assert.equal(applyAction(s, 'p0', { type: 'build', tile: 1 }).ok, false);
  act(s, 'p0', { type: 'end' }); assert.equal(s.landed, null);
  dice(1, 2); act(s, 'p1', { type: 'roll' }); // p1 dừng ở đất p0 (trả thuê) – p0 không xây được ngoài lượt
  assert.equal(applyAction(s, 'p0', { type: 'build', tile: 3 }).ok, false);
});
test('zing: đủ bộ màu cũng không bắt xây đều; Landmark chỉ ở lần dừng sau khi có sẵn 4 nhà; bán nhà ô nào cũng được', () => {
  const s = game(2, Z); own(s, 'p0', 1); own(s, 'p0', 3); dice(1, 2); act(s, 'p0', { type: 'roll' });
  assert.equal(applyAction(s, 'p0', { type: 'build', tile: 3, n: 5 }).ok, false, 'không lên thẳng 0 → Landmark');
  act(s, 'p0', { type: 'build', tile: 3, n: 4 }); assert.equal(s.props[3].h, 4); assert.equal(s.props[1].h, 0); assert.equal(P(s, 'p0').cash, 1500 - 200);
  assert.equal(applyAction(s, 'p0', { type: 'build', tile: 3 }).ok, false, 'cùng lần dừng chưa lên Landmark');
  const s3 = game(2, Z); own(s3, 'p0', 3, 4); dice(1, 2); act(s3, 'p0', { type: 'roll' }); act(s3, 'p0', { type: 'build', tile: 3 }); assert.equal(s3.props[3].h, 5);
  assert.ok(s3.log.at(-1).includes('LANDMARK'));
  s.props[1].h = 1; act(s, 'p0', { type: 'sell', tile: 1 }); assert.equal(s.props[1].h, 0);
});
test('zing: vừa mua đất xong xây luôn; mua lại đất xong cũng xây được', () => {
  const s = game(2, Z); dice(1, 2); act(s, 'p0', { type: 'roll' }); act(s, 'p0', { type: 'buy' }); act(s, 'p0', { type: 'build', tile: 3, n: 2 }); assert.equal(s.props[3].h, 2);
  const s2 = game(2, Z); own(s2, 'p1', 3, 1); dice(1, 2); act(s2, 'p0', { type: 'roll' }); assert.equal(s2.stage, 'buyback'); act(s2, 'p0', { type: 'buyback' });
  act(s2, 'p0', { type: 'build', tile: 3 }); assert.equal(s2.props[3].h, 2);
});
test('xây nhiều nhà thiếu tiền giữa chừng → hoàn lại hết, không mất tiền', () => {
  const s = game(2, Z); own(s, 'p0', 3); dice(1, 2); act(s, 'p0', { type: 'roll' }); P(s, 'p0').cash = 120;
  const r = applyAction(s, 'p0', { type: 'build', tile: 3, n: 3 }); assert.equal(r.ok, false); assert.match(r.reason, /2 nhà/);
  assert.equal(s.props[3].h, 0); assert.equal(P(s, 'p0').cash, 120);
});
test('zing: đổ đôi dừng đất mình vẫn xây được trước khi đổ tiếp; đổ tiếp thì đổi ô', () => {
  const s = game(2, Z); own(s, 'p0', 6); own(s, 'p0', 1); dice(3, 3); act(s, 'p0', { type: 'roll' }); assert.equal(s.stage, 'roll'); assert.equal(s.again, true);
  act(s, 'p0', { type: 'build', tile: 6 }); dice(1, 2); act(s, 'p0', { type: 'roll' }); assert.equal(s.landed, 9);
  assert.equal(applyAction(s, 'p0', { type: 'build', tile: 6 }).ok, false);
});
test('luật mặc định: xây nhiều nhà một lần vẫn phải đều tay khi đủ bộ (không xây lố, hoàn lại)', () => {
  const s = game(); own(s, 'p0', 1); own(s, 'p0', 3); assert.equal(applyAction(s, 'p0', { type: 'build', tile: 1, n: 2 }).ok, false);
  assert.equal(s.props[1].h, 0); assert.equal(P(s, 'p0').cash, 1500);
  const s2 = game(); own(s2, 'p0', 6); act(s2, 'p0', { type: 'build', tile: 6, n: 2 }); assert.equal(s2.props[6].h, 2, 'chưa đủ bộ: xây tự do');
});
test('bot hiểu luật zing: chỉ xây ở ô vừa dừng, xây nhiều nhà một lần, không đòi xây ô khác', () => {
  const s = game(2, Z); own(s, 'p0', 1); own(s, 'p0', 3); own(s, 'p0', 39); s.players.forEach(p => { p.isBot = true; });
  let a = botAction(s, 'p0'); assert.notEqual(a.type, 'build', 'đầu lượt không xây');
  dice(1, 2); act(s, 'p0', { type: 'roll' }); a = botAction(s, 'p0');
  assert.equal(a.type, 'build'); assert.equal(a.tile, 3); assert.ok(a.n >= 2, 'xây nhiều nhà một lần'); act(s, 'p0', a);
  for (let k = 0; k < 5; k++) { a = botAction(s, 'p0'); if (a.type === 'build') { assert.equal(a.tile, 3); act(s, 'p0', a); } else break; }
  assert.ok(['end', 'trade', 'unmortgage'].includes(a.type));
});

console.log('— Giao dịch: tổng giá trị + cảnh báo gom bộ / sắp thắng');
test('tổng giá trị 1 bên: tiền + đất (thế chấp tính nửa) + thẻ ra tù', () => {
  const s = game(); own(s, 'p0', 1); own(s, 'p0', 39, 0, true);
  assert.equal(tradeSideValue(s, { cash: 100, tiles: [1, 39], cards: 1 }), 100 + 60 + 200 + 50);
});
test('cảnh báo: kèo giúp gom đủ bộ màu, đủ 4 bến xe (= thắng), chỉ còn 1 bước là thắng', () => {
  const s = game(); own(s, 'p0', 1); own(s, 'p1', 3);
  let im = tradeImpact(s, 'p0', { to: 'p1', give: { cash: 200, tiles: [], cards: 0 }, get: { cash: 0, tiles: [3], cards: 0 } });
  assert.deepEqual(im[0].newGroups, ['brown']); assert.equal(im[0].win, null); assert.equal(im[1].newGroups.length, 0);
  [5, 15, 25].forEach(i => own(s, 'p1', i)); own(s, 'p0', 35);
  im = tradeImpact(s, 'p0', { to: 'p1', give: { cash: 0, tiles: [35], cards: 0 }, get: { cash: 300, tiles: [], cards: 0 } });
  assert.equal(im[1].allStations, true); assert.equal(im[1].win, 'stations');
  const s2 = game(); [6, 8, 9, 1].forEach(i => own(s2, 'p0', i)); own(s2, 'p1', 3);
  im = tradeImpact(s2, 'p0', { to: 'p1', give: { cash: 0, tiles: [], cards: 0 }, get: { cash: 0, tiles: [3], cards: 0 } });
  assert.equal(im[0].near, true, '2 nhóm màu → còn 1 nhóm nữa là thắng');
  s2.opts.monopolyWin = false; im = tradeImpact(s2, 'p0', { to: 'p1', give: { cash: 0, tiles: [], cards: 0 }, get: { cash: 0, tiles: [3], cards: 0 } });
  assert.equal(im[0].near, false); assert.equal(im[0].win, null);
});
test('bot không nhận kèo làm đối phương thắng ngay dù trả rất nhiều tiền', () => {
  const s = game(); [5, 15, 25].forEach(i => own(s, 'p0', i)); own(s, 'p1', 35); P(s, 'p0').cash = 5000;
  act(s, 'p0', { type: 'trade', to: 'p1', give: { cash: 4000, tiles: [], cards: 0 }, get: { cash: 0, tiles: [35], cards: 0 } });
  assert.equal(judgeTrade(s, 'p1'), false);
});

test('trọn 1 hàng là thắng (không tính ô thế chấp)', () => {
  const s = game(2); const side = SIDES()[1]; assert.ok(side.length >= 7);
  side.forEach(i => own(s, 'p0', i)); assert.equal(sideOwned(s, 'p0'), 1); assert.equal(winCheckFor(s, 'p0'), 'side');
  s.props[side[0]].mort = true; assert.equal(sideOwned(s, 'p0'), null);
  const s2 = game(2, { monopolyWin: false }); SIDES()[1].forEach(i => own(s2, 'p0', i)); assert.equal(winCheckFor(s2, 'p0'), null);
});
test('du lịch tốn vé máy bay, không đủ tiền thì chỉ nghỉ', () => {
  const s = game(2); const me = P(s, 'p0'); me.pos = 16; dice(2, 2, 6, 5);
  act(s, 'p0', { type: 'roll' }); assert.equal(s.stage, 'travel');
  const c0 = me.cash; act(s, 'p0', { type: 'travel', tile: 21 }); assert.equal(me.pos, 21); assert.ok(c0 - me.cash >= 100);
  const s2 = game(2); const m2 = P(s2, 'p0'); m2.pos = 16; m2.cash = 50; dice(2, 2, 6, 5);
  act(s2, 'p0', { type: 'roll' }); assert.notEqual(s2.stage, 'travel'); assert.equal(m2.pos, 20);
  const s3 = game(2, { travelFee: 0 }); const m3 = P(s3, 'p0'); m3.pos = 16; m3.cash = 0; dice(2, 2, 6, 5); act(s3, 'p0', { type: 'roll' }); assert.equal(s3.stage, 'travel');
});

console.log(`\n${pass} đạt, ${fail} lỗi`);
if (fail) process.exit(1);
