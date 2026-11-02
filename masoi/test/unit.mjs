// Unit test các tương tác khó: node masoi/test/unit.mjs
import { createGame, applyAction, actors, timeout, viewFor, P } from '../js/engine.js?v=1';

let pass = 0, failN = 0;
const ok = (c, msg) => { if (c) pass++; else { failN++; console.log('  ✗', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (được ${JSON.stringify(a)}, cần ${JSON.stringify(b)})`);
function test(name, f) { const before = failN; try { f(); } catch (e) { failN++; console.log('  ✗ EXCEPTION', e.stack); } console.log((failN === before ? '✓ ' : '✗ ') + name); }

// tạo ván với vai cố định theo thứ tự: roles[i] cho người 'p'+i
function mk(roles, opts = {}) {
  const cnt = {}; for (const r of roles) if (r !== 'villager') cnt[r] = (cnt[r] || 0) + 1;
  const s = createGame(roles.map((r, i) => ({ id: 'p' + i, name: 'N' + i })), { auto: false, roles: cnt, ...opts });
  s.players.forEach((p, i) => { p.role = roles[i]; p.notes = []; });
  return s;
}
const act = (s, pid, a) => { const r = applyAction(s, pid, a); ok(r.ok, `hành động ${pid} ${JSON.stringify(a)} phải hợp lệ: ${r.reason}`); return r; };
const deny = (s, pid, a, msg) => { const r = applyAction(s, pid, a); ok(!r.ok, msg); return r; };
const id = r => r; // tên gọn
// chạy tới pha cụ thể bằng timeout
const until = (s, phase, max = 20) => { let k = 0; while (s.phase !== phase && k++ < max) timeout(s); ok(s.phase === phase, `phải tới pha ${phase}, đang ${s.phase}`); };
const allReady = s => { for (const p of s.players.filter(p => p.alive)) if (s.phase === 'day') applyAction(s, p.id, { type: 'ready' }); };
const voteAll = (s, target, except = {}) => { for (const p of s.players.filter(p => p.alive && !p.idiotOut)) if (s.phase === 'vote' && !(p.id in s.vote.votes)) applyAction(s, p.id, { type: 'vote', target: except[p.id] || (p.id === target ? 'skip' : target) }); };

// vai: p0 sói, p1 bảo vệ, p2 phù thủy, p3 dân, p4 dân, p5 thợ săn
const BASE = ['wolf', 'guard', 'witch', 'villager', 'villager', 'hunter'];

test('Bảo vệ + Phù Thủy cùng cứu 1 người – luật mặc định: sống', () => {
  const s = mk(BASE, { doubleSave: 'live' });
  eq(s.step, 'guard', 'đêm 1 bắt đầu với Bảo Vệ');
  act(s, 'p1', { type: 'guard', target: 'p3' });
  eq(s.step, 'wolves', 'tới lượt sói');
  act(s, 'p0', { type: 'wolf', target: 'p3' });
  eq(s.step, 'witch', 'tới Phù Thủy');
  ok(viewFor(s, 'p2').victims.includes('p3'), 'Phù Thủy thấy nạn nhân');
  ok(!viewFor(s, 'p3').victims, 'người khác không thấy nạn nhân');
  act(s, 'p2', { type: 'witch', save: 'p3' });
  eq(s.phase, 'dawn', 'trời sáng');
  ok(P(s, 'p3').alive, 'p3 sống');
  eq(s.deaths.length, 0, 'không ai chết');
});
test('Bảo vệ + Phù Thủy cùng cứu – luật "sữa đổ": chết', () => {
  const s = mk(BASE, { doubleSave: 'die' });
  act(s, 'p1', { type: 'guard', target: 'p3' });
  act(s, 'p0', { type: 'wolf', target: 'p3' });
  act(s, 'p2', { type: 'witch', save: 'p3' });
  ok(!P(s, 'p3').alive, 'p3 chết vì được cứu 2 lần');
  ok(!s.potions.save, 'bình cứu đã dùng');
});
test('Bảo vệ không được che cùng 1 người 2 đêm liền', () => {
  const s = mk(BASE);
  act(s, 'p1', { type: 'guard', target: 'p4' });
  act(s, 'p0', { type: 'wolf', target: 'p3' });
  act(s, 'p2', { type: 'skip' });
  until(s, 'day'); allReady(s); eq(s.phase, 'vote', 'cả làng sẵn sàng → bỏ phiếu');
  voteAll(s, 'skip'); until(s, 'night');
  deny(s, 'p1', { type: 'guard', target: 'p4' }, 'đêm 2 không được che lại p4');
  act(s, 'p1', { type: 'guard', target: 'p1' });
});
test('Phù Thủy: mỗi bình 1 lần, không tự đầu độc, cứu đúng nạn nhân', () => {
  const s = mk(BASE);
  act(s, 'p1', { type: 'skip' });
  act(s, 'p0', { type: 'wolf', target: 'p4' });
  deny(s, 'p2', { type: 'witch', save: 'p3' }, 'không cứu người không bị cắn');
  deny(s, 'p2', { type: 'witch', poison: 'p2' }, 'không tự đầu độc');
  act(s, 'p2', { type: 'witch', save: 'p4', poison: 'p0' });
  ok(!P(s, 'p0').alive && P(s, 'p4').alive, 'sói chết vì độc, p4 sống');
  eq(s.phase, 'dawn', 'sáng');
  timeout(s);
  eq(s.phase, 'ended', 'hết sói → dân thắng'); eq(s.winner.team, 'village', 'phe dân');
});
test('Thợ Săn bị đầu độc: KHÔNG được bắn', () => {
  const s = mk(BASE);
  act(s, 'p1', { type: 'skip' });
  act(s, 'p0', { type: 'wolf', target: 'p3' });
  act(s, 'p2', { type: 'witch', poison: 'p5' });
  ok(!P(s, 'p5').alive && P(s, 'p5').cause === 'poison', 'thợ săn chết vì độc');
  timeout(s); // dawn → day
  eq(s.phase, 'day', 'không có pha Thợ Săn');
});
test('Thợ Săn bị sói cắn VÀ bị độc cùng đêm: vẫn tính là độc, không bắn', () => {
  const s = mk(BASE);
  act(s, 'p1', { type: 'skip' });
  act(s, 'p0', { type: 'wolf', target: 'p5' });
  act(s, 'p2', { type: 'witch', poison: 'p5' });
  eq(P(s, 'p5').cause, 'poison', 'nguyên nhân: độc');
  timeout(s); eq(s.phase, 'day', 'không bắn');
});
test('Thợ Săn bị sói cắn: bắn kéo theo, dây chuyền thắng thua', () => {
  const s = mk(BASE);
  act(s, 'p1', { type: 'skip' });
  act(s, 'p0', { type: 'wolf', target: 'p5' });
  act(s, 'p2', { type: 'skip' });
  timeout(s); eq(s.phase, 'hunter', 'pha Thợ Săn');
  eq(actors(s), ['p5'], 'thợ săn (đã chết) được hành động');
  deny(s, 'p3', { type: 'shoot', target: 'p0' }, 'người khác không bắn được');
  act(s, 'p5', { type: 'shoot', target: 'p0' });
  eq(s.phase, 'ended', 'bắn trúng sói cuối → hết ván'); eq(s.winner.team, 'village', 'dân thắng');
});
test('Thợ Săn bị treo cổ: lời trăng trối rồi bắn', () => {
  const s = mk(BASE);
  act(s, 'p1', { type: 'skip' }); act(s, 'p0', { type: 'wolf', target: 'p3' }); act(s, 'p2', { type: 'skip' });
  until(s, 'day'); allReady(s); voteAll(s, 'p5');
  eq(s.phase, 'last', 'lời trăng trối'); eq(s.condemned, 'p5', 'p5 bị treo');
  act(s, 'p5', { type: 'chat', ch: 'all', text: 'Tui là thợ săn đó!' });
  deny(s, 'p4', { type: 'chat', ch: 'all', text: 'chen ngang' }, 'người khác im lặng khi trăng trối');
  act(s, 'p5', { type: 'done' });
  eq(s.phase, 'hunter', 'được bắn');
  act(s, 'p5', { type: 'shoot', target: 'p4' });
  eq(s.phase, 'night', 'sang đêm');
});
test('Cupid ghép đôi khác phe (Sói + Dân) → phe Cặp Đôi thắng khi chỉ còn 2', () => {
  const s = mk(['cupid', 'wolf', 'villager', 'villager', 'seer', 'villager', 'wolf']);
  eq(s.step, 'cupid', 'đêm đầu Cupid');
  deny(s, 'p0', { type: 'cupid', targets: ['p1', 'p1'] }, 'không ghép 1 người với chính họ');
  act(s, 'p0', { type: 'cupid', targets: ['p1', 'p2'] });
  ok(s.mixedLove, 'đôi khác phe');
  eq(P(s, 'p1').lover, 'p2', 'p1 yêu p2');
  ok(viewFor(s, 'p2').players.find(p => p.id === 'p1').role === 'wolf', 'người yêu biết vai nhau');
  ok(viewFor(s, 'p3').players.find(p => p.id === 'p1').lover === null, 'người ngoài không biết cặp đôi');
  // giết hết, chừa cặp đôi
  for (const id of ['p0', 'p3', 'p4', 'p5', 'p6']) { P(s, id).alive = false; P(s, id).cause = 'wolf'; }
  s.step = s.steps[s.steps.length - 1]; s.night.acted = {}; s.stepFake = true; timeout(s); // kết thúc đêm
  timeout(s); // dawn
  eq(s.phase, 'ended', 'hết ván'); eq(s.winner.team, 'lovers', 'cặp đôi thắng'); eq(s.winner.ids.sort(), ['p1', 'p2'], 'đúng 2 người');
});
test('Cặp đôi: 1 người chết, người kia chết theo (và kích hoạt Thợ Săn)', () => {
  const s = mk(['cupid', 'wolf', 'villager', 'hunter', 'seer', 'villager', 'wolf', 'villager']);
  act(s, 'p0', { type: 'cupid', targets: ['p2', 'p3'] });
  ok(!s.mixedLove, 'cùng phe dân');
  act(s, 'p4', { type: 'seer', target: 'p6' });
  act(s, 'p1', { type: 'wolf', target: 'p2' }); act(s, 'p6', { type: 'wolf', target: 'p2' });
  ok(!P(s, 'p2').alive && !P(s, 'p3').alive, 'cả hai chết');
  eq(P(s, 'p3').cause, 'love', 'p3 chết vì tình');
  timeout(s); eq(s.phase, 'hunter', 'Thợ Săn chết vì tình vẫn được bắn');
  act(s, 'p3', { type: 'shoot', target: null }); eq(s.phase, 'day', 'sang ngày');
});
test('Cặp đôi cùng phe: thắng theo phe mình (không có phe thứ ba)', () => {
  const s = mk(['cupid', 'wolf', 'villager', 'villager', 'villager']);
  act(s, 'p0', { type: 'cupid', targets: ['p2', 'p3'] });
  act(s, 'p1', { type: 'wolf', target: 'p0' });
  for (const id of ['p1']) { /* hang the wolf */ }
  until(s, 'day'); allReady(s); voteAll(s, 'p1'); timeout(s); // last → chết
  eq(s.phase, 'ended', 'hết ván'); eq(s.winner.team, 'village', 'dân thắng'); ok(s.winner.ids.includes('p2') && s.winner.ids.includes('p0'), 'cupid + cặp đôi cùng thắng');
});
test('Già Làng chịu được 1 lần cắn, lần 2 chết', () => {
  const s = mk(['wolf', 'elder', 'villager', 'villager', 'villager', 'villager']);
  act(s, 'p0', { type: 'wolf', target: 'p1' });
  ok(P(s, 'p1').alive && P(s, 'p1').elderHit, 'sống sau lần cắn đầu');
  eq(s.deaths.length, 0, 'sáng ra không ai chết');
  ok(P(s, 'p1').notes.some(n => /da dày/.test(n.txt)), 'Già Làng được báo');
  until(s, 'day'); allReady(s); voteAll(s, 'skip'); until(s, 'night');
  act(s, 'p0', { type: 'wolf', target: 'p1' });
  ok(!P(s, 'p1').alive, 'lần 2 chết');
});
test('Già Làng được Bảo Vệ che: không mất "mạng phụ"', () => {
  const s = mk(['wolf', 'elder', 'guard', 'villager', 'villager', 'villager']);
  act(s, 'p2', { type: 'guard', target: 'p1' }); act(s, 'p0', { type: 'wolf', target: 'p1' });
  ok(!P(s, 'p1').elderHit, 'còn nguyên mạng phụ');
});
test('Kẻ Ngốc bị treo: lộ vai, sống, mất quyền bầu; treo lần 2 thì chết', () => {
  const s = mk(['wolf', 'idiot', 'villager', 'villager', 'villager', 'villager', 'wolf']);
  act(s, 'p0', { type: 'wolf', target: 'p2' }); act(s, 'p6', { type: 'wolf', target: 'p2' });
  until(s, 'day'); allReady(s); voteAll(s, 'p1');
  eq(s.phase, 'night', 'không có trăng trối, sang đêm luôn');
  ok(P(s, 'p1').alive && P(s, 'p1').idiotOut, 'Kẻ Ngốc còn sống, đã lộ');
  eq(viewFor(s, 'p3').players.find(p => p.id === 'p1').role, 'idiot', 'cả làng thấy vai Kẻ Ngốc');
  act(s, 'p0', { type: 'wolf', target: 'p3' }); act(s, 'p6', { type: 'wolf', target: 'p3' });
  until(s, 'day'); allReady(s);
  deny(s, 'p1', { type: 'vote', target: 'p0' }, 'Kẻ Ngốc không được bầu');
  ok(!actors(s).includes('p1'), 'không chờ phiếu của Kẻ Ngốc');
  voteAll(s, 'p1');
  eq(s.phase, 'last', 'lần 2: trăng trối'); timeout(s);
  ok(!P(s, 'p1').alive, 'lần 2 chết thật');
});
test('Thằng Chán Đời bị treo → thắng một mình', () => {
  const s = mk(['wolf', 'tanner', 'villager', 'villager', 'villager', 'villager']);
  act(s, 'p0', { type: 'wolf', target: 'p2' });
  until(s, 'day'); allReady(s); voteAll(s, 'p1');
  eq(s.phase, 'ended', 'hết ván'); eq(s.winner.team, 'tanner', 'chán đời thắng'); eq(s.winner.ids, ['p1'], 'một mình');
});
test('Sói Con chết → đêm sau bầy sói cắn 2 người', () => {
  const s = mk(['wolf', 'cub', 'villager', 'villager', 'villager', 'villager', 'villager', 'witch']);
  act(s, 'p0', { type: 'wolf', target: 'p2' }); act(s, 'p1', { type: 'wolf', target: 'p2' });
  act(s, 'p7', { type: 'skip' });
  until(s, 'day'); allReady(s); voteAll(s, 'p1'); timeout(s);
  eq(s.phase, 'night', 'sang đêm'); ok(s.steps.includes('wolves2'), 'có bước cắn thêm');
  act(s, 'p0', { type: 'wolf', target: 'p3' });
  eq(s.step, 'wolves2', 'bước cắn thêm');
  deny(s, 'p0', { type: 'wolf', target: 'p3' }, 'không cắn lại người vừa cắn');
  act(s, 'p0', { type: 'wolf', target: 'p4' });
  eq(s.step, 'witch', 'Phù Thủy');
  eq(viewFor(s, 'p7').victims, ['p3', 'p4'], 'Phù Thủy thấy 2 nạn nhân');
  act(s, 'p7', { type: 'witch', save: 'p4' });
  ok(!P(s, 'p3').alive && P(s, 'p4').alive, 'p3 chết, p4 được cứu');
  until(s, 'day'); allReady(s); voteAll(s, 'skip'); until(s, 'night');
  ok(!s.steps.includes('wolves2'), 'chỉ trả thù 1 đêm');
});
test('Tiên Tri: Sói Trùm hiện là Dân, kết quả chỉ Tiên Tri thấy', () => {
  const s = mk(['alpha', 'seer', 'villager', 'villager', 'wolf', 'villager', 'villager']);
  act(s, 'p1', { type: 'seer', target: 'p0' });
  eq(P(s, 'p1').seen.p0, 'village', 'Sói Trùm = dân');
  ok(viewFor(s, 'p1').ev.some(e => e.k === 'seen'), 'Tiên Tri nhận sự kiện');
  ok(!viewFor(s, 'p2').ev.some(e => e.k === 'seen'), 'người khác không thấy');
  act(s, 'p0', { type: 'wolf', target: 'p2' }); act(s, 'p4', { type: 'wolf', target: 'p2' });
  until(s, 'day'); allReady(s); voteAll(s, 'skip'); until(s, 'night');
  act(s, 'p1', { type: 'seer', target: 'p4' }); eq(P(s, 'p1').seen.p4, 'wolf', 'Sói thường = sói');
});
test('Bầy sói bất đồng: hết giờ lấy đa số; thống nhất thì xong sớm', () => {
  const s = mk(['wolf', 'wolf', 'wolf', 'villager', 'villager', 'villager', 'villager', 'villager']);
  act(s, 'p0', { type: 'wolf', target: 'p3' }); act(s, 'p1', { type: 'wolf', target: 'p4' }); act(s, 'p2', { type: 'wolf', target: 'p4' });
  eq(s.step, 'wolves', 'chưa thống nhất → còn chờ');
  eq(actors(s), ['p0'], 'chờ con sói lệch ý');
  act(s, 'p0', { type: 'wolf', target: 'p3' }); eq(actors(s), [], 'giữ ý kiến → hết người phải chờ');
  timeout(s); ok(!P(s, 'p4').alive && P(s, 'p3').alive, 'đa số: p4 chết');
});
test('Kênh chat: sói chỉ sói (và hồn ma) thấy; ban đêm làng không chat được', () => {
  const s = mk(['wolf', 'wolf', 'villager', 'villager', 'villager', 'villager', 'villager']);
  act(s, 'p0', { type: 'chat', ch: 'wolf', text: 'cắn p2 nha' });
  deny(s, 'p2', { type: 'chat', ch: 'all', text: 'alo' }, 'ban đêm không chat làng');
  deny(s, 'p2', { type: 'chat', ch: 'wolf', text: 'hi' }, 'dân không chat kênh sói');
  ok(viewFor(s, 'p1').chat.some(c => c.text === 'cắn p2 nha'), 'sói khác thấy');
  ok(!viewFor(s, 'p2').chat.some(c => c.ch === 'wolf'), 'dân không thấy');
  eq(viewFor(s, 'p2').players.find(p => p.id === 'p0').role, null, 'dân không biết vai sói');
  eq(viewFor(s, 'p1').players.find(p => p.id === 'p0').role, 'wolf', 'sói biết đồng bọn');
  act(s, 'p0', { type: 'wolf', target: 'p2' }); act(s, 'p1', { type: 'wolf', target: 'p2' });
  timeout(s);
  const g = viewFor(s, 'p2');
  ok(g.chat.some(c => c.ch === 'wolf'), 'hồn ma xem được kênh sói');
  eq(g.channels, ['ghost'], 'hồn ma chỉ chat kênh hồn ma');
  act(s, 'p2', { type: 'chat', ch: 'ghost', text: 'boo' });
  ok(!viewFor(s, 'p3').chat.some(c => c.ch === 'ghost'), 'người sống không đọc kênh hồn ma');
});
test('Bỏ phiếu: hoà → bầu lại; hoà lần 2 → không ai bị treo', () => {
  const s = mk(['wolf', 'villager', 'villager', 'villager', 'villager', 'villager'], { tie: 'revote' });
  act(s, 'p0', { type: 'wolf', target: 'p5' });
  until(s, 'day'); allReady(s);
  const t = { p0: 'p1', p1: 'p0', p2: 'p1', p3: 'p0', p4: 'skip' };
  for (const [a, b] of Object.entries(t)) act(s, a, { type: 'vote', target: b });
  eq(s.phase, 'vote', 'bầu lại'); eq(s.vote.round, 2, 'vòng 2'); eq(s.vote.candidates.sort(), ['p0', 'p1'], 'chỉ 2 người hoà');
  deny(s, 'p2', { type: 'vote', target: 'p3' }, 'vòng 2 chỉ bầu người hoà');
  for (const [a, b] of Object.entries(t)) act(s, a, { type: 'vote', target: b });
  eq(s.phase, 'night', 'không ai bị treo'); ok(s.players.filter(p => p.alive).length === 5, 'không ai chết thêm');
});
test('Bỏ phiếu ẩn: người khác không thấy ai bầu ai', () => {
  const s = mk(['wolf', 'villager', 'villager', 'villager', 'villager', 'villager'], { voteMode: 'secret' });
  act(s, 'p0', { type: 'wolf', target: 'p5' });
  until(s, 'day'); allReady(s);
  act(s, 'p1', { type: 'vote', target: 'p0' });
  const v = viewFor(s, 'p2').vote;
  eq(v.votes, null, 'không lộ phiếu'); eq(v.voted, ['p1'], 'chỉ biết ai đã bầu');
  eq(viewFor(s, 'p1').vote.mine, 'p0', 'thấy phiếu của mình');
});
test('Lộ vai khi chết (tuỳ chọn)', () => {
  const s = mk(['wolf', 'seer', 'villager', 'villager', 'villager', 'villager'], { reveal: true });
  act(s, 'p1', { type: 'seer', target: 'p2' }); act(s, 'p0', { type: 'wolf', target: 'p1' });
  eq(viewFor(s, 'p3').players.find(p => p.id === 'p1').role, 'seer', 'thấy vai người chết');
  const s2 = mk(['wolf', 'seer', 'villager', 'villager', 'villager', 'villager'], { reveal: false });
  act(s2, 'p1', { type: 'seer', target: 'p2' }); act(s2, 'p0', { type: 'wolf', target: 'p1' });
  eq(viewFor(s2, 'p3').players.find(p => p.id === 'p1').role, null, 'không lộ vai');
});
test('Sói đông bằng dân → Sói thắng ngay sau đêm', () => {
  const s = mk(['wolf', 'wolf', 'villager', 'villager', 'villager']);
  act(s, 'p0', { type: 'wolf', target: 'p2' }); act(s, 'p1', { type: 'wolf', target: 'p2' });
  timeout(s); eq(s.phase, 'ended', 'hết'); eq(s.winner.team, 'wolf', 'sói thắng');
});
test('Vai chết vẫn được "gọi" ban đêm (giả vờ, không ai hành động)', () => {
  const s = mk(['wolf', 'seer', 'villager', 'villager', 'villager', 'villager', 'wolf']);
  act(s, 'p1', { type: 'seer', target: 'p2' });
  act(s, 'p0', { type: 'wolf', target: 'p1' }); act(s, 'p6', { type: 'wolf', target: 'p1' });
  until(s, 'day'); allReady(s); voteAll(s, 'skip'); until(s, 'night');
  eq(s.step, 'seer', 'vẫn có bước Tiên Tri'); ok(s.stepFake, 'bước giả'); eq(actors(s), [], 'không ai phải làm');
  ok(!viewFor(s, 'p2').stepFake, 'người sống không biết là giả');
});
console.log(`\n${pass} kiểm tra đạt, ${failN} lỗi`);
if (failN) process.exit(1);
