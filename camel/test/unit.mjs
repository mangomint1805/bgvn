// Unit test luật Đua Lạc Đà: node camel/test/unit.mjs
import { createGame, applyAction, viewFor, moveOn, crazyToMove, ranking, emptyBoard, legalTiles, setRandom, RACERS, TRACK } from '../js/engine.js';
let pass = 0, fail = 0;
const eq = (a, b, m) => { const ok = JSON.stringify(a) === JSON.stringify(b); ok ? pass++ : (fail++, console.log('FAIL', m, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b))); };
const B = spec => { const b = emptyBoard(); for (const [p, arr] of Object.entries(spec)) b[+p] = arr.slice(); return b; };
const strip = b => Object.fromEntries(b.map((s, p) => [p, s]).filter(([, s]) => s.length));

// --- chồng lạc đà ---
{ const b = B({ 3: ['do', 'vang', 'lam'] }); moveOn(b, [], 'vang', 2, 1); eq(strip(b), { 3: ['do'], 5: ['vang', 'lam'] }, 'cõng con bên trên'); }
{ const b = B({ 3: ['do'], 5: ['luc'] }); moveOn(b, [], 'do', 2, 1); eq(strip(b), { 5: ['luc', 'do'] }, 'đáp lên ô có người → nằm trên'); }
{ const b = B({ 3: ['do', 'vang'], 4: ['tim'] }); moveOn(b, [], 'do', 1, 1); eq(strip(b), { 4: ['tim', 'do', 'vang'] }, 'cả chồng đáp lên trên'); }
{ const b = B({ 3: ['do', 'vang', 'lam'] }); moveOn(b, [], 'lam', 1, 1); eq(strip(b), { 3: ['do', 'vang'], 4: ['lam'] }, 'con trên cùng đi một mình'); }
eq(ranking(B({ 2: ['do', 'vang'], 5: ['lam'], 7: ['luc', 'den', 'tim'] })), ['tim', 'luc', 'lam', 'vang', 'do'], 'xếp hạng bỏ qua lạc đà xỉn');

// --- thảm ---
{ const b = B({ 3: ['do'], 6: ['vang'] }); const t = [{ pos: 5, side: 1, owner: 'a' }]; const e = moveOn(b, t, 'do', 2, 1); eq([strip(b), e.land, e.to, e.under], [{ 6: ['vang', 'do'] }, 5, 6, false], 'ốc đảo +1, nằm trên'); }
{ const b = B({ 3: ['do', 'lam'], 4: ['vang', 'tim'] }); const t = [{ pos: 5, side: -1, owner: 'a' }]; const e = moveOn(b, t, 'do', 2, 1); eq([strip(b), e.to, e.under], [{ 4: ['do', 'lam', 'vang', 'tim'] }, 4, true], 'ảo ảnh −1 chui XUỐNG DƯỚI chồng'); }
{ const b = B({ 3: ['do', 'lam'] }); const t = [{ pos: 4, side: -1, owner: 'a' }]; moveOn(b, t, 'lam', 1, 1); eq(strip(b), { 3: ['lam', 'do'] }, 'ảo ảnh lùi về ô cũ → chui dưới con cũ'); }
{ const b = B({ 14: ['do'] }); const t = [{ pos: 16, side: 1, owner: 'a' }]; const e = moveOn(b, t, 'do', 2, 1); eq(e.to, 17, 'ốc đảo ô 16 → về đích'); }

// --- lạc đà xỉn ---
{ const b = B({ 15: ['den', 'do'] }); moveOn(b, [], 'den', 2, -1); eq(strip(b), { 13: ['den', 'do'] }, 'xỉn lùi cõng lạc đà đua'); }
{ const b = B({ 2: ['trang'] }); moveOn(b, [], 'trang', 3, -1); eq(strip(b), { 1: ['trang'] }, 'xỉn lùi quá ô 1 thì dừng ở ô 1'); }
{ const b = B({ 10: ['den'], 8: ['vang'] }); const t = [{ pos: 8, side: 1, owner: 'a' }]; moveOn(b, t, 'den', 2, -1); eq(strip(b), { 7: ['den'], 8: ['vang'] }, 'xỉn dính ốc đảo: lùi thêm 1'); }
{ const b = B({ 10: ['den'], 7: ['vang'] }); const t = [{ pos: 8, side: -1, owner: 'a' }]; moveOn(b, t, 'den', 2, -1); eq(strip(b), { 9: ['den'], 7: ['vang'] }, 'xỉn dính ảo ảnh: đẩy ngược 1 ô'); }
eq(crazyToMove(B({ 14: ['den', 'do'], 16: ['trang'] }), 'trang'), 'den', 'chỉ đen đang cõng → đen đi dù ra trắng');
eq(crazyToMove(B({ 14: ['den'], 16: ['trang', 'lam'] }), 'den'), 'trang', 'chỉ trắng đang cõng → trắng đi');
eq(crazyToMove(B({ 14: ['trang', 'den'] }), 'trang'), 'den', 'đen cưỡi ngay trên trắng → đen đi');
eq(crazyToMove(B({ 14: ['den', 'trang'] }), 'den'), 'trang', 'trắng cưỡi ngay trên đen → trắng đi');
eq(crazyToMove(B({ 14: ['den', 'do'], 16: ['trang', 'lam'] }), 'trang'), 'trang', 'cả 2 cùng cõng → theo xúc xắc');
eq(crazyToMove(B({ 12: ['den'], 15: ['trang'] }), 'den'), 'den', 'bình thường → theo xúc xắc');

// --- ván đầy đủ: vé chặng, thảm, cược ---
const mk = (crazy = false) => { setRandom(() => 0.1); const g = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }], { crazy }); setRandom(); return g; };
{
  const g = mk(); g.turn = 0;
  g.board = B({ 1: ['do', 'vang', 'lam', 'luc', 'tim'] });
  eq(applyAction(g, 'b', { type: 'roll' }).ok, false, 'không phải lượt');
  applyAction(g, 'a', { type: 'leg', camel: 'tim' }); applyAction(g, 'b', { type: 'leg', camel: 'tim' }); applyAction(g, 'c', { type: 'leg', camel: 'tim' });
  applyAction(g, 'a', { type: 'leg', camel: 'tim' });
  eq(g.players.map(p => p.legTix.map(t => t.value)), [[5, 2], [3], [2]], 'vé giảm dần 5/3/2/2');
  eq(applyAction(g, 'b', { type: 'leg', camel: 'tim' }).ok, false, 'hết vé');
  eq(legalTiles(g, 'b').includes(1), false, 'không đặt thảm ô 1');
  eq(applyAction(g, 'b', { type: 'tile', pos: 5, side: -1 }).ok, true, 'đặt thảm');
  eq(applyAction(g, 'c', { type: 'tile', pos: 6, side: 1 }).ok, false, 'không đặt kề thảm');
  eq(applyAction(g, 'c', { type: 'tile', pos: 7, side: 1 }).ok, true, 'đặt thảm cách 1 ô');
  eq(applyAction(g, 'a', { type: 'overall', kind: 'win', camel: 'do' }).ok, true, 'cược vô địch');
  eq(applyAction(g, 'b', { type: 'overall', kind: 'lose', camel: 'do' }).ok, true, 'cược bét');
  eq(applyAction(g, 'c', { type: 'overall', kind: 'win', camel: 'lam' }).ok, true, 'cược C');
  eq(applyAction(g, 'a', { type: 'overall', kind: 'lose', camel: 'do' }).ok, false, 'một màu chỉ 1 lá');
  // ẩn thông tin
  const vb = viewFor(g, 'b');
  eq([vb.winBets.map(x => x.camel), vb.loseBets.map(x => x.camel), vb.players[0].used, vb.players[0].usedN, vb.players[1].used], [[null, null], ['do'], null, 1, ['do']], 'view ẩn lá cược người khác');
  eq(JSON.stringify(vb).includes('"camel":"lam"') && vb.winBets.some(x => x.camel === 'lam'), false, 'không lộ lá lam của C');
}
// chấm chặng: dựng tay
{
  const g = mk(); g.turn = 0;
  g.board = B({ 1: ['do', 'vang', 'lam', 'luc', 'tim'] });
  g.players[0].legTix = [{ camel: 'tim', value: 5 }, { camel: 'luc', value: 3 }, { camel: 'do', value: 2 }];
  g.players[1].legTix = [{ camel: 'do', value: 5 }]; g.players[1].coins = 0;
  g.players[2].legTix = [];
  g.rolled = [1, 2, 3, 4].map(() => ({ die: 'x' })); g.pyramid = ['vang']; // còn đúng 1 viên: vàng ra 1→ ô 2 cõng lam,luc,tim
  setRandom(() => 0); applyAction(g, 'a', { type: 'roll' }); setRandom();
  eq(strip(g.board), { 1: ['do'], 2: ['vang', 'lam', 'luc', 'tim'] }, 'vàng cõng 3 đứa');
  const L = g.fx.find(e => e.k === 'leg');
  eq(L && L.sum.rank.slice(0, 2), ['tim', 'luc'], 'xếp hạng chặng');
  // A: 3 xu + 1 (lắc) + 5 (tim nhất) + 1 (luc nhì) − 1 (do) = 9 ; B: 0 − 1 → 0 (không âm)
  eq(g.players.map(p => p.coins), [9, 0, 3], 'tiền chặng + không âm');
  eq([g.leg, g.pyramid.length, g.rolled.length, g.tiles.length, g.players[0].legTix.length, g.tickets.tim], [2, 5, 0, 0, 0, [5, 3, 2, 2]], 'reset chặng');
}
// chấm chung cuộc
{
  const g = mk(); g.turn = 0;
  g.board = B({ 14: ['lam'], 15: ['do'], 16: ['vang', 'luc', 'tim'] });
  g.winBets = [{ pid: 'b', camel: 'lam' }, { pid: 'a', camel: 'tim' }, { pid: 'c', camel: 'tim' }, { pid: 'b', camel: 'tim' }];
  g.loseBets = [{ pid: 'c', camel: 'lam' }, { pid: 'a', camel: 'do' }];
  g.players.forEach(p => p.coins = 0);
  g.pyramid = ['tim']; setRandom(() => 0); applyAction(g, 'a', { type: 'roll' }); setRandom(); // tim +1 → ô 17 về đích
  eq(g.phase, 'ended', 'về đích kết thúc');
  eq([g.result.win, g.result.lose], ['tim', 'lam'], 'nhất tim, bét lam');
  eq(g.result.winBets.map(b => b.gain), [-1, 8, 5, 3], 'trả 8/5/3, sai −1');
  eq(g.result.loseBets.map(b => b.gain), [8, -1], 'cược bét');
  // a: 1(lắc) + 8 − 1 = 8 ; b: 0 −1 + 3 = max(0,..) ; c: 5 + 8 = 13
  eq(g.players.map(p => p.coins), [8, 3, 13], 'tiền chung cuộc');
  eq(g.result.winners, ['c'], 'người giàu nhất thắng');
}
// xúc xắc xám có trong kim tự tháp khi bật lạc đà xỉn; hết chặng sau 5 viên (còn 1 viên)
{
  const g = mk(true);
  eq([g.pyramid.length, g.pyramid.includes('xam')], [6, true], '6 viên khi có lạc đà xỉn');
  eq(g.board.flat().length, 7, '7 lạc đà trên đường');
  for (let i = 0; i < 5 && g.phase === 'playing'; i++) applyAction(g, g.players[g.turn].id, { type: 'roll' });
  if (g.phase === 'playing') eq([g.leg, g.pyramid.length], [2, 6], 'hết chặng sau 5 viên, kim tự tháp đầy lại');
}

// --- thêm: luật xỉn qua applyAction, thảm, chủ thảm +1, cược thứ 6 trở đi ---
{
  const g = mk(true); g.turn = 0;
  g.board = B({ 5: ['do', 'vang', 'lam', 'luc', 'tim'], 12: ['den', 'do2'].filter(x => x !== 'do2'), 14: ['trang'] });
  g.board[12] = ['den']; g.board[5] = ['vang', 'lam', 'luc', 'tim']; g.board[14] = ['trang', 'do'];
  g.pyramid = ['xam']; g.rolled = [];
  // xúc xắc xám ra "đen 2" (f=1) nhưng chỉ Trắng đang cõng Đỏ → Trắng đi lùi 2, cõng Đỏ về ô 12, nằm trên Đen
  setRandom(() => 0.17); applyAction(g, 'a', { type: 'roll' }); setRandom();
  eq(strip(g.board), { 5: ['vang', 'lam', 'luc', 'tim'], 12: ['den', 'trang', 'do'] }, 'xám: con đang cõng đi dù ra màu kia');
  const r = g.rolled[0]; eq([r.die, r.color, r.camel, r.value], ['xam', 'den', 'trang', 2], 'ghi lại lần lắc xám');
}
eq(crazyToMove(B({ 9: ['den', 'trang', 'do'] }), 'den'), 'trang', 'cả 2 cõng, trắng ngay trên đen → trắng đi');
eq(crazyToMove(B({ 9: ['den', 'do', 'trang'] }), 'trang'), 'den', 'đen cõng (đỏ), trắng không cõng ai → đen đi');
{ const b = B({ 10: ['trang'], 8: ['lam', 'den'] }); const t = [{ pos: 8, side: -1, owner: 'a' }]; const e = moveOn(b, t, 'trang', 2, -1); eq([strip(b), e.under], [{ 8: ['lam', 'den'], 9: ['trang'] }, true], 'xỉn dính ảo ảnh: đẩy ngược về ô 9 (trống)'); }
{ const b = B({ 3: ['do'], 5: ['lam'] }); const t = [{ pos: 4, side: -1, owner: 'a' }]; moveOn(b, t, 'lam', 2, 1); eq(strip(b), { 3: ['do'], 7: ['lam'] }, 'không dính thảm thì đi bình thường'); }
{ const b = B({ 2: ['do'], 4: ['vang', 'lam'] }); const t = [{ pos: 5, side: -1, owner: 'a' }]; moveOn(b, t, 'do', 3, 1); eq(strip(b), { 4: ['do', 'vang', 'lam'] }, 'ảo ảnh: chui dưới chồng 2 con'); }
{
  const g = mk(); g.turn = 0; g.board = B({ 1: ['do'], 3: ['vang', 'lam', 'luc', 'tim'] });
  eq(legalTiles(g, 'a').includes(3), false, 'không đặt thảm lên ô có lạc đà');
  applyAction(g, 'a', { type: 'tile', pos: 2, side: 1 });
  eq(legalTiles(g, 'b').some(p => p >= 1 && p <= 3), false, 'không đặt sát thảm người khác');
  g.turn = 0; applyAction(g, 'a', { type: 'tile', pos: 8, side: -1 });
  eq(g.tiles, [{ pos: 8, side: -1, owner: 'a' }], 'đặt lại = dời thảm của mình');
  g.tiles = [{ pos: 2, side: 1, owner: 'c' }]; g.pyramid = ['do']; g.turn = 1; const c0 = g.players[2].coins, b0 = g.players[1].coins;
  setRandom(() => 0); applyAction(g, 'b', { type: 'roll' }); setRandom();
  eq([strip(g.board)[3], g.players[2].coins - c0, g.players[1].coins - b0], [['vang', 'lam', 'luc', 'tim', 'do'], 1, 1], 'ốc đảo: +1 ô, chủ thảm +1, người lắc +1');
}
{
  const g = mk(); g.turn = 0; g.board = B({ 15: ['lam', 'do', 'vang', 'luc'], 16: ['tim'] }); g.players.forEach(p => p.coins = 0);
  g.winBets = ['a', 'b', 'c', 'a', 'b', 'c'].map((pid, i) => ({ pid, camel: ['tim', 'tim', 'tim', 'tim', 'tim', 'tim'][i] }));
  g.pyramid = ['tim']; setRandom(() => 0); applyAction(g, 'a', { type: 'roll' }); setRandom();
  eq(g.result.winBets.map(b => b.gain), [8, 5, 3, 2, 1, 1], 'cược đúng từ lá thứ 6 trở đi được 1');
  eq(g.result.lose, 'lam', 'bét = con dưới cùng ô cuối');
}
{ const g = mk(); eq(applyAction(g, g.players[g.turn].id, { type: 'leg', camel: 'den' }).ok, false, 'không có vé cho lạc đà xỉn');
  eq(applyAction(g, g.players[g.turn].id, { type: 'overall', kind: 'win', camel: 'den' }).ok, false, 'không cược lạc đà xỉn'); }
console.log(`unit: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
