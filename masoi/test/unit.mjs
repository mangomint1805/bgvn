// Unit test các tương tác khó: node masoi/test/unit.mjs
import { createGame, applyAction, actors, timeout, viewFor, P, roleList, setRandom, isWolfRole } from '../js/engine.js?v=4';
import * as eng from '../js/engine.js?v=4';
import { botAction } from '../js/bot.js?v=4';

let pass = 0, failN = 0;
const ok = (c, msg) => { if (c) pass++; else { failN++; console.log('  ✗', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (được ${JSON.stringify(a)}, cần ${JSON.stringify(b)})`);
const pending = [];
function test(name, f) { const before = failN; const done = () => console.log((failN === before ? '✓ ' : '✗ ') + name); try { const r = f(); if (r && r.then) { pending.push(r.then(done, e => { failN++; console.log('  ✗ EXCEPTION', e.stack); done(); })); return; } } catch (e) { failN++; console.log('  ✗ EXCEPTION', e.stack); } done(); }

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

// ---------------- vai mới ----------------
test('Kẻ Trộm: bộ bài có thêm 2 lá thừa, không bao giờ là Sói', () => {
  const rl = roleList(6, { wolf: 2, thief: 1, seer: 1 });
  ok(rl.ok && rl.list.length === 8 && rl.extra === 2, 'có Kẻ Trộm → 8 lá cho 6 người');
  ok(!roleList(6, { wolf: 1, thief: 1, seer: 1, guard: 1, witch: 1, hunter: 1, cupid: 1, elder: 1, idiot: 1 }).ok, 'quá 8 lá → lỗi');
  for (let k = 0; k < 200; k++) {
    const s = createGame(Array.from({ length: 6 }, (_, i) => ({ id: 'p' + i, name: 'N' + i })), { auto: false, roles: { wolf: 2, thief: 1, seer: 1 } });
    if (s.extra.length !== 2 || s.extra.some(r => isWolfRole(r) || r === 'thief')) { ok(false, 'lá thừa sai: ' + s.extra); break; }
    if (s.players.filter(p => isWolfRole(p.role)).length !== 2) { ok(false, 'phải đủ 2 Sói trong làng'); break; }
  }
  ok(true, '200 lần chia');
});
test('Kẻ Trộm: đêm 1 tráo lấy 1 lá thừa → thành vai đó, các bước vẫn gọi đủ', () => {
  const s = mk(['thief', 'wolf', 'villager', 'villager', 'villager', 'villager']);
  s.extra = ['seer', 'guard'];
  s.steps = ['thief', 'guard', 'seer', 'wolves']; s.step = 'thief'; s.stepFake = false; // dựng lại như lúc tạo ván có 2 lá thừa này
  eq(actors(s), ['p0'], 'Kẻ Trộm dậy đầu tiên');
  ok(viewFor(s, 'p0').extra && viewFor(s, 'p0').extra.length === 2, 'Kẻ Trộm thấy 2 lá thừa');
  ok(!viewFor(s, 'p2').extra, 'người khác không thấy lá thừa');
  deny(s, 'p0', { type: 'thief', take: 5 }, 'lá không tồn tại');
  act(s, 'p0', { type: 'thief', take: 0 });
  eq(P(s, 'p0').role, 'seer', 'thành Tiên Tri'); eq(s.extra, ['thief', 'guard'], 'lá Kẻ Trộm nằm lại');
  eq(s.step, 'guard', 'bước Bảo Vệ vẫn được gọi'); ok(s.stepFake, '…nhưng là bước giả (lá Bảo Vệ nằm ngoài)');
  timeout(s); eq(s.step, 'seer', 'tới Tiên Tri'); eq(actors(s), ['p0'], 'Kẻ Trộm (giờ là Tiên Tri) được soi luôn đêm 1');
  act(s, 'p0', { type: 'seer', target: 'p1' }); eq(P(s, 'p0').seen.p1, 'wolf', 'soi ra Sói');
  ok(s.rec.some(r => r.k === 'thief' && r.took === 'seer'), 'ghi vào biên niên');
});
test('Kẻ Trộm giữ nguyên lá: là Dân thường, đêm sau không được gọi', () => {
  const s = mk(['thief', 'wolf', 'villager', 'villager', 'villager', 'villager']);
  s.extra = ['villager', 'villager']; s.steps = ['thief', 'wolves']; s.step = 'thief'; s.stepFake = false;
  act(s, 'p0', { type: 'thief', take: null });
  eq(P(s, 'p0').role, 'thief', 'vẫn là Kẻ Trộm');
  act(s, 'p1', { type: 'wolf', target: 'p2' });
  until(s, 'day'); allReady(s); voteAll(s, 'skip'); until(s, 'night');
  ok(!s.steps.includes('thief'), 'đêm 2 không có bước Kẻ Trộm');
  ok(createGame(Array.from({ length: 6 }, (_, i) => ({ id: 'p' + i, name: 'N' + i })), { auto: false, roles: { wolf: 1, thief: 1 } }).steps[0] === 'thief', 'ván có Kẻ Trộm: đêm 1 bắt đầu bằng Kẻ Trộm');
});
test('Bà Đồng: gọi hồn người chết biết phe; chưa ai chết thì bước giả', () => {
  const s = mk(['medium', 'wolf', 'villager', 'villager', 'villager', 'villager', 'wolf']);
  eq(s.step, 'medium', 'có bước Bà Đồng'); ok(s.stepFake, 'đêm 1 chưa ai chết → giả');
  timeout(s);
  act(s, 'p1', { type: 'wolf', target: 'p2' }); act(s, 'p6', { type: 'wolf', target: 'p2' });
  until(s, 'day'); allReady(s); voteAll(s, 'p6', { p1: 'skip' }); until(s, 'night');
  ok(!P(s, 'p6').alive, 'p6 (sói) bị treo');
  eq(s.step, 'medium', 'đêm 2: Bà Đồng'); ok(!s.stepFake, 'có hồn để gọi');
  deny(s, 'p0', { type: 'medium', target: 'p3' }, 'không gọi hồn người sống');
  act(s, 'p0', { type: 'medium', target: 'p6' });
  eq(P(s, 'p0').seen.p6, 'wolf', 'hồn p6 là phe Sói');
  ok(P(s, 'p0').notes.some(n => /phe SÓI/.test(n.txt)), 'Bà Đồng được báo riêng');
  ok(!viewFor(s, 'p3').ev.some(e => e.k === 'seen'), 'người khác không biết');
  act(s, 'p1', { type: 'wolf', target: 'p3' });
  until(s, 'day'); allReady(s); voteAll(s, 'skip'); until(s, 'night');
  eq(s.step, 'medium', 'đêm 3'); deny(s, 'p0', { type: 'medium', target: 'p6' }, 'không gọi lại hồn đã hỏi');
  act(s, 'p0', { type: 'medium', target: 'p2' }); eq(P(s, 'p0').seen.p2, 'village', 'p2 phe Dân');
});
test('Ông Già Lẩm Cẩm: tưởng mình là Tiên Tri, soi bốc đại; chết/hết ván mới lộ', () => {
  const s = mk(['lunatic', 'wolf', 'villager', 'villager', 'villager', 'villager', 'seer']);
  eq(viewFor(s, 'p0').me.role, 'seer', 'tự thấy mình là Tiên Tri');
  eq(viewFor(s, 'p0').players[0].role, 'seer', 'ghế mình cũng hiện Tiên Tri');
  const s0 = createGame(Array.from({ length: 6 }, (_, i) => ({ id: 'p' + i, name: 'N' + i })), { auto: false, roles: { wolf: 1, lunatic: 1 }, forceRole: { p0: 'lunatic' } });
  ok(P(s0, 'p0').notes[0].txt.includes('Tiên Tri') && !/Lẩm/.test(JSON.stringify(viewFor(s0, 'p0').me)), 'sổ tay ghi là Tiên Tri, không lộ chữ Lẩm Cẩm');
  eq(s.step, 'seer', 'bước Tiên Tri'); eq(actors(s).sort(), ['p0', 'p6'], 'Tiên Tri thật và Lẩm Cẩm cùng dậy');
  let rnd = 0.1; setRandom(() => rnd);
  act(s, 'p0', { type: 'seer', target: 'p2' }); eq(P(s, 'p0').seen.p2, 'wolf', 'bốc đại: dân hoá Sói');
  setRandom(Math.random);
  act(s, 'p6', { type: 'seer', target: 'p0' }); eq(P(s, 'p6').seen.p0, 'village', 'Tiên Tri thật soi Lẩm Cẩm = Dân');
  ok(s.rec.some(r => r.k === 'seer' && r.lun && r.truth === 'village'), 'biên niên ghi rõ bốc đại');
  act(s, 'p1', { type: 'wolf', target: 'p0' });
  ok(!P(s, 'p0').alive, 'Lẩm Cẩm chết');
  eq(viewFor(s, 'p0').me.role, 'lunatic', 'chết rồi mới biết mình lẩm cẩm');
  ok(P(s, 'p0').notes.some(n => /LẨM CẨM/.test(n.txt)), 'có lời báo');
  const s2 = mk(['lunatic', 'wolf', 'villager', 'villager', 'villager', 'villager']);
  const b = botAction(s2, 'p0'); eq(b && b.type, 'seer', 'bot Lẩm Cẩm cũng đi soi');
});
test('Biên niên: chỉ gửi khi hết ván, đủ đêm/ngày, phiếu từng người', () => {
  const s = mk(['wolf', 'guard', 'seer', 'witch', 'villager', 'villager']);
  act(s, 'p1', { type: 'guard', target: 'p4' });
  act(s, 'p2', { type: 'seer', target: 'p0' });
  act(s, 'p0', { type: 'wolf', target: 'p4' });
  act(s, 'p3', { type: 'skip' });
  ok(!viewFor(s, 'p4').rec, 'giữa ván không ai có biên niên');
  until(s, 'day'); allReady(s);
  act(s, 'p2', { type: 'claim', target: 'p0', res: 'wolf' });
  voteAll(s, 'p0', { p0: 'p5' }); timeout(s);
  eq(s.phase, 'ended', 'treo sói → hết ván');
  const r = viewFor(s, 'p5').rec;
  ok(r && r.length > 5, 'người chơi thường cũng có biên niên khi hết ván');
  const kinds = r.map(x => x.k);
  for (const k of ['deal', 'guard', 'seer', 'bite', 'saved', 'skip', 'claim', 'vote', 'die', 'win']) ok(kinds.includes(k), 'có mục ' + k);
  const v = r.find(x => x.k === 'vote'); eq(v.hanged, 'p0', 'ghi người bị treo'); eq(v.votes.p0, 'p5', 'ghi phiếu từng người');
  eq(r.find(x => x.k === 'guard').ph, 'n', 'Bảo Vệ thuộc Đêm'); eq(v.ph, 'd', 'bỏ phiếu thuộc Ngày'); eq(v.d, 1, 'ngày 1');
});
test('Ván tập: ép vai cho người chơi', () => {
  for (let k = 0; k < 30; k++) {
    const want = ['seer', 'guard', 'witch', 'wolf'][k % 4];
    const s = createGame(Array.from({ length: 6 }, (_, i) => ({ id: i ? 'b' + i : 'host', name: 'N' + i })), { auto: false, roles: { wolf: 1, seer: 1, guard: 1, witch: 1 }, forceRole: { host: want }, tutorial: true });
    if (P(s, 'host').role !== want) { ok(false, 'vai ép sai ' + want); break; }
    if (s.opts.forceRole) { ok(false, 'không lưu forceRole vào state'); break; }
  }
  ok(true, 'ép vai 30 lần');
});

test('Thả emoji: ban đêm cấm, ban ngày cả làng thấy, hồn ma chỉ hồn ma thấy', async () => {
  const { Host, MS_PHRASES } = await import('../js/net.js?v=17');
  const got = [];
  const h = new Host('Chủ', { onLobby() {}, onState() {}, onError() {}, onReact: m => got.push(m) }, true);
  h.addBot(5); h.opts.auto = false; h.opts.roles = { wolf: 1 };
  h.start(); h.clearTimers(); h.schedule = () => {}; h.broadcast = () => {};
  const s = h.state, sent = {};
  const fake = id => ({ send: m => (sent[id] = sent[id] || []).push(m) });
  h.players[1].conn = fake(h.players[1].id); h.players[2].conn = fake(h.players[2].id);
  ok(s.phase === 'night', 'đang đêm');
  ok(!h.react('host', '😂'), 'ban đêm không thả được');
  ok(!h.react('host', 'hack <b>'), 'câu lạ bị chặn');
  while (s.phase !== 'day') timeout(s);
  h.lim = () => true;
  ok(h.react('host', MS_PHRASES[0]) && got.length === 1 && sent[h.players[1].id].length === 1, 'ban ngày: chủ phòng + người khác đều thấy');
  const dead = P(s, h.players[1].id); dead.alive = false;
  got.length = 0; sent[h.players[1].id] = []; sent[h.players[2].id] = [];
  ok(h.react(dead.id, '💀'), 'hồn ma thả được');
  ok(!got.length && !sent[h.players[2].id].length && sent[h.players[1].id].length === 1, 'chỉ hồn ma thấy (người sống không nhận)');
  h.destroy();
});

// ---------- luật theo góp ý: ghim mù, sói hoà phiếu, phù thủy mù, đêm kín giờ, máy chọn giúp, chết kín ----------
const { suggestRoles } = await import('../js/engine.js?v=4');
test('Gợi ý bộ vai: 3 bộ hợp lệ cho mọi số người 5–16', () => {
  for (let n = 5; n <= 16; n++) for (const g of suggestRoles(n)) { const r = roleList(n, g.roles); ok(r.ok, `${n} người – bộ ${g.id}: ${r.reason}`); ok(r.list.filter(x => x !== 'villager').length <= n + 2, 'không quá số lá'); }
});
test('Thợ Săn ghim mù: chết trong đêm thì người bị ghim chết theo; bị treo thì không', () => {
  let s = mk(BASE, { hunter: 'pin' });
  act(s, 'p1', { type: 'guard', target: 'p1' }); eq(s.step, 'hunter', 'có lượt Thợ Săn ghim');
  deny(s, 'p5', { type: 'hunter', target: 'p5' }, 'không tự ghim mình');
  act(s, 'p5', { type: 'hunter', target: 'p0' }); eq(viewFor(s, 'p5').pin, 'p0', 'Thợ Săn thấy người mình ghim'); ok(viewFor(s, 'p3').pin === undefined, 'người khác không thấy');
  act(s, 'p0', { type: 'wolf', target: 'p5' }); act(s, 'p2', { type: 'skip' });
  eq(s.phase, 'dawn', 'trời sáng, không có pha bắn'); ok(!P(s, 'p5').alive && !P(s, 'p0').alive, 'Thợ Săn chết, người bị ghim chết theo'); eq(s.hunterQueue.length, 0, 'không xếp hàng bắn');
  s = mk(BASE, { hunter: 'pin' }); // bị độc cũng kéo theo
  act(s, 'p1', { type: 'guard', target: 'p1' }); act(s, 'p5', { type: 'hunter', target: 'p3' }); act(s, 'p0', { type: 'wolf', target: null }); act(s, 'p2', { type: 'witch', poison: 'p5' });
  ok(!P(s, 'p5').alive && !P(s, 'p3').alive, 'bị độc trong đêm vẫn kéo người bị ghim');
  s = mk(BASE, { hunter: 'pin' }); // sống qua đêm rồi bị treo: không kéo ai
  act(s, 'p1', { type: 'guard', target: 'p1' }); act(s, 'p5', { type: 'hunter', target: 'p0' }); act(s, 'p0', { type: 'wolf', target: 'p3' }); act(s, 'p2', { type: 'skip' });
  until(s, 'day'); allReady(s); voteAll(s, 'p5'); until(s, 'night', 6);
  ok(!P(s, 'p5').alive && P(s, 'p0').alive, 'Thợ Săn bị treo, người bị ghim vẫn sống');
});
test('Sói hoà phiếu → không ai bị cắn; Sói được cắn Sói khi bật luật', () => {
  const R = ['wolf', 'wolf', 'witch', 'villager', 'villager', 'villager', 'villager'];
  let s = mk(R, { wolfTie: 'none' });
  act(s, 'p0', { type: 'wolf', target: 'p3' }); act(s, 'p1', { type: 'wolf', target: 'p4' }); timeout(s);
  eq(s.night.victims, [], 'hoà → không ai bị cắn');
  s = mk(R, {}); deny(s, 'p0', { type: 'wolf', target: 'p1' }, 'mặc định không cắn được Sói');
  s = mk(R, { wolfSelf: true }); act(s, 'p0', { type: 'wolf', target: 'p1' }); act(s, 'p1', { type: 'wolf', target: 'p1' }); eq(s.night.victims, ['p1'], 'cắn được Sói');
});
test('Phù Thủy hết bình cứu thì không biết ai bị cắn', () => {
  const s = mk(BASE, { witchBlind: true });
  act(s, 'p1', { type: 'guard', target: 'p1' }); act(s, 'p0', { type: 'wolf', target: 'p3' }); ok(viewFor(s, 'p2').victims.includes('p3'), 'còn bình cứu: thấy'); act(s, 'p2', { type: 'witch', save: 'p3' });
  until(s, 'day'); allReady(s); voteAll(s, 'skip'); until(s, 'night', 6);
  act(s, 'p1', { type: 'guard', target: 'p0' }); act(s, 'p0', { type: 'wolf', target: 'p4' }); eq(s.step, 'witch', 'vẫn có lượt Phù Thủy (còn bình độc)');
  ok(!viewFor(s, 'p2').victims, 'hết bình cứu: không thấy nạn nhân'); ok(P(s, 'p2').notes.some(n => n.txt.includes('không còn biết')), 'có ghi chú giải thích');
});
test('Đêm kín giờ: chọn xong vẫn chờ hết giờ, lượt vai đã chết dài như thật', () => {
  const s = mk(BASE, { fixedNight: true, nightTime: 20 });
  act(s, 'p1', { type: 'guard', target: 'p3' }); eq(s.step, 'guard', 'chưa sang lượt kế'); ok(!viewFor(s, 'p1').myTurn, 'đã chọn xong');
  timeout(s); eq(s.step, 'wolves', 'hết giờ mới sang Sói'); act(s, 'p0', { type: 'wolf', target: 'p1' }); eq(s.step, 'wolves', 'Sói chọn xong vẫn chờ'); timeout(s); eq(s.night.victims, ['p1'], 'chốt mục tiêu khi hết giờ');
  P(s, 'p2').alive = false; s.step = 'wolves'; timeout(s); eq(s.step, 'witch', 'vẫn gọi Phù Thủy'); ok(s.stepFake, 'lượt giả');
  const { phaseMs } = eng; eq(phaseMs(s), 20 * 1200, 'lượt giả dài đúng bằng lượt thật');
});
test('Hết giờ máy chọn giúp + báo riêng; bầy Sói ngủ quên vẫn có mục tiêu (không phải Sói)', () => {
  const s = mk(BASE, { afkAuto: true });
  timeout(s); ok(s.night.guard, 'Bảo Vệ được chọn giúp'); ok(P(s, 'p1').notes.some(n => n.txt.includes('hệ thống đã tự chọn')), 'Bảo Vệ được báo');
  eq(s.step, 'wolves', 'sang lượt Sói'); timeout(s); eq(s.night.victims.length, 1, 'Sói có mục tiêu'); ok(s.night.victims[0] !== 'p0', 'không tự cắn');
  timeout(s); eq(s.night.poison, null, 'Phù Thủy không bị chọn giúp'); eq(s.phase, 'dawn', 'trời sáng');
  const s2 = mk(BASE, {}); timeout(s2); eq(s2.night.guard, null, 'mặc định: không chọn giúp');
});
test('Chết kín: người sống không biết nguyên nhân chết trong đêm, hồn ma thì biết', () => {
  const s = mk(BASE, { secretDeath: true });
  act(s, 'p1', { type: 'guard', target: 'p1' }); act(s, 'p0', { type: 'wolf', target: 'p3' }); act(s, 'p2', { type: 'witch', poison: 'p4' });
  eq(viewFor(s, 'p1').players.find(p => p.id === 'p4').cause, 'night', 'người sống chỉ thấy "chết trong đêm"'); eq(viewFor(s, 'p1').deaths.map(d => d.cause), ['night', 'night'], 'bảng báo tử cũng kín');
  eq(viewFor(s, 'p4').players.find(p => p.id === 'p4').cause, 'poison', 'hồn ma biết');
  ok(s.ev.filter(e => e.k === 'death').every(e => e.cause === 'night'), 'sự kiện không lộ');
});
test('Bot chơi được trọn ván với bộ luật quản trò', async () => {
  for (let g = 0; g < 40; g++) {
    const n = 6 + g % 9, s = createGame(Array.from({ length: n }, (_, i) => ({ id: 'b' + i, name: 'B' + i, isBot: true })), { hunter: 'pin', wolfTie: 'none', wolfSelf: true, witchBlind: true, fixedNight: g % 2 === 0, afkAuto: true, secretDeath: true });
    let k = 0; while (s.phase !== 'ended' && k++ < 4000) { const as = actors(s); let did = false; for (const id of as) { const a = botAction(s, id); if (a && applyAction(s, id, a).ok) { did = true; break; } } if (!did) timeout(s); }
    ok(s.phase === 'ended', `ván ${g} (${n} người) phải kết thúc`); ok(s.hunterQueue.length === 0, 'không có pha bắn ở luật ghim');
  }
});
await Promise.all(pending);
console.log(`\n${pass} kiểm tra đạt, ${failN} lỗi`);
process.exit(failN ? 1 : 0);
