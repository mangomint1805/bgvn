// Unit test luật cờ cá ngựa. Chạy: node cangua/test/rules.mjs
import { createGame, applyAction, legalMoves, absSq, occupant, GATE, HOME0, exitOk, finished } from '../js/engine.js?v=1';
let pass = 0, fail = 0;
const t = (name, f) => { try { f(); pass++; } catch (e) { fail++; console.log('✗', name, '-', e.message); } };
const eq = (a, b, m = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} mong ${JSON.stringify(b)}, nhận ${JSON.stringify(a)}`); };
const ok = (c, m = 'sai') => { if (!c) throw new Error(m); };
const G = (n = 2, o = {}) => createGame(Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'P' + i })), o);
const roll = (s, d, pid = s.players[s.turn].id) => applyAction(s, pid, { type: 'roll', force: d });

t('ghế 2 người đối diện, 3, 4 người', () => { eq(G(2).players.map(p => p.seat), [0, 2]); eq(G(3).players.map(p => p.seat), [0, 1, 2]); eq(G(4).players.map(p => p.seat), [0, 1, 2, 3]); });
t('điều kiện xuất chuồng 2 xúc xắc', () => {
  const s = G(); eq([[3, 3], [6, 1], [1, 6], [6, 5], [2, 5], [1, 1]].map(d => exitOk(s, d)), [true, true, true, false, false, true]);
  const s2 = G(2, { exit2: 'any6' }); eq([[6, 5], [2, 5], [4, 4]].map(d => exitOk(s2, d)), [true, false, true]);
  const s1 = G(2, { dice: 1 }); eq([[6], [1], [5]].map(d => exitOk(s1, d)), [true, false, false]);
  const s3 = G(2, { dice: 1, exit1: '16' }); eq([[6], [1], [5]].map(d => exitOk(s3, d)), [true, true, false]);
});
t('không đôi/1+6 thì không xuất được → chuyển lượt', () => { const s = G(); roll(s, [2, 5]); eq(s.turn, 1); eq(s.players[0].horses, [-1, -1, -1, -1]); ok(s.ev.some(e => e.t === 'nomove')); });
t('đổ 6+1: tự xuất chuồng (chỉ 1 nước) + được đổ tiếp', () => { const s = G(); roll(s, [6, 1]); eq(s.players[0].horses, [0, -1, -1, -1]); eq(s.turn, 0); eq(s.stage, 'roll'); });
t('đôi: chọn xuất chuồng hoặc đi tổng', () => {
  const s = G(); s.players[0].horses = [5, -1, -1, -1]; roll(s, [2, 2]);
  eq(s.stage, 'move'); eq(s.moves.map(m => m.kind).sort(), ['out', 'track']); eq(s.moves.find(m => m.kind === 'track').to, 9);
  applyAction(s, 'p0', { type: 'move', h: 0 }); eq(s.players[0].horses[0], 9); eq(s.turn, 0, 'đôi được đổ tiếp');
});
t('không đôi: đi tổng 2 xúc xắc, hết lượt', () => { const s = G(); s.players[0].horses = [5, 10, -1, -1]; roll(s, [2, 3]); applyAction(s, 'p0', { type: 'move', h: 1 }); eq(s.players[0].horses, [5, 15, -1, -1]); eq(s.turn, 1); });
t('đá ngựa: đứng đúng ô đối thủ → đối thủ về chuồng', () => {
  const s = G(); const sq = absSq(0, 12); const opp = s.players[1]; // ghế 2
  opp.horses[0] = (sq - absSq(2, 0) + 56) % 56; ok(occupant(s, sq).pid === 'p1');
  s.players[0].horses = [7, -1, -1, -1]; roll(s, [2, 3]);
  eq(s.players[0].horses[0], 12); eq(opp.horses[0], -1); ok(s.ev.some(e => e.t === 'kick' && e.vic === 'p1'));
});
t('xuất chuồng đá ngựa đứng ở ô xuất quân', () => { const s = G(); s.players[1].horses[0] = (absSq(0, 0) - absSq(2, 0) + 56) % 56; roll(s, [6, 1]); eq(s.players[0].horses[0], 0); eq(s.players[1].horses[0], -1); });
t('không được đứng lên ngựa nhà / không xuất khi ô xuất quân có ngựa nhà', () => {
  const s = G(); s.players[0].horses = [0, 5, -1, -1]; roll(s, [2, 3]); eq(s.players[0].horses, [0, 10, -1, -1], 'con 0 không được đè con 1 → chỉ còn 1 nước, tự đi');
  const s2 = G(); s2.players[0].horses = [0, -1, -1, -1]; roll(s2, [6, 1]); ok(!legalMoves(s2).some(m => m.kind === 'out')); eq(s2.players[0].horses, [7, -1, -1, -1]);
});
t('không nhảy qua đầu (mặc định) / tắt thì nhảy được', () => {
  const mk = o => { const s = G(2, o); s.players[0].horses = [3, -1, -1, -1]; s.players[1].horses[0] = (absSq(0, 6) - absSq(2, 0) + 56) % 56; roll(s, [4, 5]); return s; };
  const a = mk({}); eq(a.players[0].horses[0], 3, 'bị chặn'); eq(a.turn, 1);
  const b = mk({ noJump: false }); eq(b.players[0].horses[0], 12);
});
t('đôi mà tổng kẹt thì đi 1 con xúc xắc', () => {
  const s = G(); s.players[0].horses = [3, -1, -1, -1]; s.players[0].horses = [3, 9, -1, -1]; // tổng 6: 3→9 đè nhà; 9→15 bị? không – thêm chặn
  s.players[1].horses[0] = (absSq(0, 12) - absSq(2, 0) + 56) % 56; // 9+6=15 phải qua ô 12 → chặn
  s.players[0].horses[2] = 48; s.players[0].horses[3] = 50; // 50+6=56>55 không được (vn); 52 cũng không
  roll(s, [3, 3]);
  // tổng 6 không đi được con nào → cho đi 3: 3→6, 9→12 (đá), 50→53, 52→55
  ok(s.stage === 'move'); eq(s.moves.filter(m => m.kind !== 'out').map(m => m.to).sort((a, b) => a - b), [6, 12, 53], '48→51 phải nhảy qua ngựa nhà ở 50');
});
t('về cửa đích bằng 1 xúc xắc lẻ', () => { const s = G(); s.players[0].horses = [54, -1, -1, -1]; roll(s, [1, 4]); eq(s.players[0].horses[0], GATE); const s2 = G(); s2.players[0].horses = [51, -1, -1, -1]; roll(s2, [3, 4]); eq(s2.players[0].horses[0], GATE, 'con 4'); });
t('luật vn: phải dừng đúng cửa đích, từ cửa đổ n lên thẳng bậc n', () => {
  const s = G(); s.players[0].horses = [50, -1, -1, -1]; roll(s, [6, 4]); eq(s.players[0].horses[0], 50, 'quá cửa thì đứng im');
  const s2 = G(); s2.players[0].horses = [50, -1, -1, -1]; roll(s2, [2, 3]); eq(s2.players[0].horses[0], GATE);
  const s3 = G(); s3.players[0].horses = [GATE, -1, -1, -1]; roll(s3, [6, 2]); eq(s3.stage, 'move'); eq(s3.moves.map(m => m.to).sort(), [HOME0 + 1, HOME0 + 5].sort(), 'dùng 2 hoặc 6 (tổng 8 quá)');
  applyAction(s3, 'p0', { type: 'move', h: 0, to: HOME0 + 5 }); eq(s3.players[0].horses[0], HOME0 + 5);
});
t('luật vn: từ bậc k lên k+1 phải đổ đúng k+1 (1 con hoặc tổng)', () => {
  const s = G(); s.players[0].horses = [HOME0 + 2, 10, -1, -1]; roll(s, [2, 2]); // bậc 3 → cần 4 = tổng
  ok(s.moves.some(m => m.h === 0 && m.to === HOME0 + 3));
  const s2 = G(); s2.players[0].horses = [HOME0 + 2, -1, -1, -1]; roll(s2, [1, 2]); eq(s2.players[0].horses[0], HOME0 + 2);
});
t('không vượt ngựa nhà trên đích', () => { const s = G(); s.players[0].horses = [GATE, HOME0 + 1, -1, -1]; roll(s, [5, 1]); eq(s.players[0].horses[0], GATE + 1, 'chỉ lên được bậc 1 (giá trị 1)'); });
t('luật đếm bước: đi xuyên cửa vào đích, không quá bậc 6', () => {
  const s = G(2, { homeRule: 'count' }); s.players[0].horses = [52, -1, -1, -1]; roll(s, [3, 4]); eq(s.players[0].horses[0], 59);
  const s2 = G(2, { homeRule: 'count' }); s2.players[0].horses = [52, -1, -1, -1]; roll(s2, [5, 6]); eq(s2.players[0].horses[0], 52);
});
t('thắng: chiếm bậc 3-4-5-6', () => {
  const s = G(); s.players[0].horses = [HOME0 + 5, HOME0 + 4, HOME0 + 3, GATE]; roll(s, [2, 1]); // từ cửa lên bậc 3 bằng tổng 3 (hoặc bậc 1/2)
  eq(s.stage, 'move'); applyAction(s, 'p0', { type: 'move', h: 3, to: HOME0 + 2 }); eq(s.players[0].horses[3], HOME0 + 2); eq(s.phase, 'over'); eq(s.winner, 'p0'); eq(s.ranks, ['p0', 'p1']);
});
t('luật "cả 4 vào đích" thắng sớm hơn', () => { const s = G(2, { winRule: 'home' }); s.players[0].horses = [HOME0 + 5, HOME0 + 4, HOME0 + 3, GATE]; roll(s, [1, 4]); ok(finished(s, s.players[0])); eq(s.phase, 'over'); });
t('đua tiếp tranh hạng', () => {
  const s = G(3, { playOn: true }); s.players[0].horses = [HOME0 + 5, HOME0 + 4, HOME0 + 3, GATE]; roll(s, [2, 1]); applyAction(s, 'p0', { type: 'move', h: 3, to: HOME0 + 2 });
  eq(s.phase, 'playing'); eq(s.ranks, ['p0']); eq(s.turn, 1); roll(s, [2, 3]); eq(s.turn, 2); roll(s, [2, 3]); eq(s.turn, 1, 'bỏ qua người đã về');
});
t('tách xúc xắc (split): 2 nước riêng', () => {
  const s = G(2, { moveMode: 'split' }); s.players[0].horses = [5, 20, -1, -1]; roll(s, [2, 4]); eq(s.stage, 'move');
  applyAction(s, 'p0', { type: 'move', h: 0, to: 7 }); eq(s.stage, 'move'); eq(s.left, [4]); applyAction(s, 'p0', { type: 'move', h: 1, to: 24 }); eq(s.players[0].horses.slice(0, 2), [7, 24]); eq(s.turn, 1);
});
t('1 xúc xắc: 6 xuất chuồng, đổ tiếp', () => { const s = G(2, { dice: 1 }); roll(s, [6]); eq(s.players[0].horses[0], 0); eq(s.turn, 0); roll(s, [3]); eq(s.players[0].horses[0], 3); eq(s.turn, 1); });
t('3 lần thưởng liền mất lượt (tuỳ chọn)', () => {
  const s = G(2, { triple: true }); s.players[0].horses = [10, -1, -1, -1];
  roll(s, [1, 1]); if (s.stage === 'move') applyAction(s, 'p0', { type: 'move', h: 0 }); roll(s, [2, 2]); if (s.stage === 'move') applyAction(s, 'p0', { type: 'move', h: 0 });
  eq(s.turn, 0); const before = JSON.stringify(s.players[0].horses); roll(s, [3, 3]); eq(s.turn, 1); eq(JSON.stringify(s.players[0].horses), before); ok(s.ev.some(e => e.t === 'triple'));
  const s2 = G(); roll(s2, [1, 1]); roll(s2, [6, 1]); if (s2.stage === 'move') applyAction(s2, 'p0', { type: 'move', out: true }); roll(s2, [3, 3]); ok(!s2.ev.some(e => e.t === 'triple'), 'mặc định tắt');
});
t('sai lượt / sai giai đoạn bị từ chối', () => { const s = G(); ok(!applyAction(s, 'p1', { type: 'roll' }).ok); ok(!applyAction(s, 'p0', { type: 'move', h: 0 }).ok); });
console.log(`rules: ${pass} đạt, ${fail} lỗi`); if (fail) process.exit(1);
