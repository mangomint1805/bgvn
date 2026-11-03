// Unit test luật Scribble it!: node scribble/test/logic.mjs [số ván mô phỏng]
import assert from 'node:assert/strict';
import { norm, isMatch, isNear, leaks, maskWord, wordLens, within1 } from '../js/match.js';
import { CATS, CAT_KEYS, DEFAULT_CATS, totalWords, buildPool, parseCustom, randomPrompt } from '../js/words.js';
import { createGame, applyAction, viewFor, tick, addDraw, addPlayer, setOnline, setRandom, chainFor, bookItems, shiftTime, cleanOpts, buildPlan, itemOps, garticScores, GMODES, GMODE_KEYS, maxPlayers, CHOOSE_MS, TURN_END_MS, GRACE_MS, OFF_SKIP_MS, groupSizes, groupsOf, frameCount, REVEAL_AUTO } from '../js/engine.js';
import { cleanOps, pushOp, simplifyOps, opsBytes, encodePts, decodePts, PALETTE } from '../js/ops.js';
import { encodeGif, GifWriter, UI_COLORS } from '../js/gif.js';

let passed = 0;
const t = (name, fn) => { try { fn(); passed++; } catch (e) { console.error('✗', name); throw e; } };
// random cố định để test lặp lại được
let seed = 12345; setRandom(() => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; });
const P = n => Array.from({ length: n }, (_, i) => ({ id: i ? 'p' + i : 'host', name: ['Minto', 'Tiến', 'Tuni', 'Thành', 'Khiêm', 'Thái', 'Bơ', 'Kem'][i] || 'X' + i }));

// ---------- so khớp ----------
t('bỏ dấu, hoa thường, khoảng trắng', () => {
  assert.equal(norm('Bánh Mì'), 'banhmi'); assert.equal(norm('  ĐI   LÍNH! '), 'dilinh');
  assert.ok(isMatch('banh mi', 'bánh mì')); assert.ok(isMatch('BÁNHMÌ', 'bánh mì')); assert.ok(isMatch('get a job', 'GET A JOB'));
  assert.ok(isMatch('khoa mom', 'khoá mõm')); assert.ok(isMatch('Landmark81', 'Landmark 81'));
  assert.ok(!isMatch('banh', 'bánh mì')); assert.ok(!isMatch('', 'mèo'));
});
t('từ chỉ loại ở đầu', () => {
  assert.ok(isMatch('mèo', 'con mèo')); assert.ok(isMatch('con meo', 'con mèo')); assert.ok(isMatch('cái ô', 'ô'));
  assert.ok(isMatch('ghế', 'cái ghế')); assert.ok(!isMatch('con', 'con mèo'));
});
t('gần đúng sai 1 ký tự', () => {
  assert.ok(within1('banhmi', 'banhmy')); assert.ok(within1('banhmi', 'bahnmi')); assert.ok(within1('banhmi', 'banhm')); assert.ok(within1('banhmi', 'banhmii'));
  assert.ok(!within1('banhmi', 'banhxeo'));
  assert.ok(isNear('banh my', 'bánh mì')); assert.ok(isNear('bahn mi', 'bánh mì')); assert.ok(isNear('get a jo', 'GET A JOB'));
  assert.ok(isNear('meoo', 'con mèo') === false, 'core "meo" ngắn hơn 4 -> không báo gần đúng');
  assert.ok(!isNear('bánh mì', 'bánh mì'), 'đúng hẳn thì không phải gần đúng');
  assert.ok(!isNear('pho', 'phở')); assert.ok(!isNear('xyz', 'bánh mì'));
});
t('chặn lộ đáp án', () => {
  assert.ok(leaks('nó là BANH MI đó', 'bánh mì')); assert.ok(leaks('meo meo', 'con mèo')); assert.ok(!leaks('vẽ đẹp ghê', 'bánh mì'));
});
t('mặt nạ gợi ý giữ khoảng trắng', () => {
  assert.deepEqual(maskWord('bánh mì'), ['_', '_', '_', '_', ' ', '_', '_']);
  assert.deepEqual(maskWord('bánh mì', [1]), ['_', 'á', '_', '_', ' ', '_', '_']);
  assert.deepEqual(maskWord('bi-a'), ['_', '_', '-', '_']);
  assert.deepEqual(wordLens('GET A JOB'), [3, 1, 3]);
});

// ---------- kho từ ----------
t('kho từ ≥ 400, chủ đề đủ', () => {
  assert.ok(totalWords() >= 400, 'chỉ có ' + totalWords());
  for (const k of ['dovat', 'convat', 'monan', 'saigon', 'nghe', 'hanhdong', 'genz', 'hoiban']) assert.ok(CATS[k] && CATS[k].words.length >= 20, k);
  for (const w of ['GET A JOB', 'đi lính', 'cắm sừng', 'khoá mõm']) assert.ok(CATS.hoiban.words.includes(w), w);
  for (const k of CAT_KEYS) for (const w of CATS[k].words) assert.ok(w.length <= 40 && w === w.trim(), w);
});
t('chủ đề Tướng Liên Minh: đủ 173 tướng, so khớp bỏ dấu cách/chấm/nháy/&', () => {
  const lol = CATS.lol.words;
  assert.equal(lol.length, 173); assert.equal(new Set(lol).size, 173);
  for (const w of ['Ahri', 'Yasuo', 'Lee Sin', "Kai'Sa", "Cho'Gath", 'Dr. Mundo', 'Miss Fortune', 'Nunu & Willump', 'Renata Glasc', 'Hwei', 'Smolder', 'Aurora', 'Ambessa', 'Mel', 'Yunara', 'Zaahen', 'Locke', "K'Sante", 'Jarvan IV', 'LeBlanc', 'Wukong'])
    assert.ok(lol.includes(w), w);
  assert.ok(!DEFAULT_CATS.includes('lol'), 'không bật sẵn');
  assert.ok(buildPool({ cats: ['lol'] }).includes("Kai'Sa"));
  for (const [g, a] of [['leesin', 'Lee Sin'], ['kaisa', "Kai'Sa"], ['chogath', "Cho'Gath"], ['drmundo', 'Dr. Mundo'], ['DR MUNDO', 'Dr. Mundo'], ['nunuwillump', 'Nunu & Willump'], ['nunu', 'Nunu & Willump'],
    ['k sante', "K'Sante"], ['missfortune', 'Miss Fortune'], ['renata', 'Renata Glasc'], ['jarvan 4', 'Jarvan IV'], ['velkoz', "Vel'Koz"], ['vi', 'Vi']])
    assert.ok(isMatch(g, a), g + ' ~ ' + a);
  assert.ok(!isMatch('lee', 'Lee Sin')); assert.ok(isNear('yasou', 'Yasuo')); assert.ok(isNear('kaisaa', "Kai'Sa"));
  assert.ok(!leaks('viết gì vậy trời', 'Vi'), 'đáp án ngắn không chặn nhầm'); assert.ok(leaks('là vi đó', 'Vi'));
  assert.deepEqual(maskWord("Kai'Sa").join(''), "___'__");
});
t('từ riêng & chỉ dùng từ riêng', () => {
  assert.deepEqual(parseCustom('a\n  b  \n\nA\nc'), ['a', 'b', 'c']);
  const pool = buildPool({ cats: [], custom: ['x1', 'x2', 'x3'], onlyCustom: true });
  assert.deepEqual(pool.sort(), ['x1', 'x2', 'x3']);
  assert.equal(cleanOpts({ onlyCustom: true, custom: ['a'] }).onlyCustom, false, 'ít hơn 3 từ thì không bật được');
  assert.ok(randomPrompt().includes(' đang '));
});

// ---------- nét vẽ ----------
t('nét vẽ: làm sạch, hoàn tác theo nhóm', () => {
  const ops = cleanOps([{ k: 's', g: 1, c: 4, w: 2, p: [10, 10, 5, 5, 3, -2] }, { k: 's', g: 1, c: 4, w: 2, p: [18, 13, 4, 4] }, { k: 'f', g: 2, c: 6, x: 9999, y: -3 }, { k: 'evil' }, { k: 's', g: 3, c: 1, w: 1, p: 'bad' }]);
  assert.equal(ops.length, 3); assert.equal(ops[2].x, 799); assert.equal(ops[2].y, 0);
  const list = []; ops.forEach(o => pushOp(list, o));
  assert.equal(pushOp(list, { k: 'u' }), true); assert.equal(list.length, 2);
  pushOp(list, { k: 'u' }); assert.equal(list.length, 0, 'hoàn tác cả 2 đoạn của cùng nét');
  assert.deepEqual(decodePts(encodePts([[1, 2], [5, 7], [3, 3]])), [1, 2, 5, 7, 3, 3]);
  const big = Array.from({ length: 300 }, (_, i) => ({ k: 's', g: i, c: 1, w: 1, p: [100, 100, ...Array(300).fill(3)] }));
  assert.ok(opsBytes(simplifyOps(big, 100000)) < opsBytes(big));
});

// ---------- Đoán hình ----------
function guessGame(n = 3, opts = {}) { return createGame(P(n), { mode: 'guess', rounds: 2, drawTime: 80, ...opts }, 0); }
t('vòng chơi: chọn từ, đoán đúng, điểm theo tốc độ, hoạ sĩ ăn điểm', () => {
  const s = guessGame(3);
  assert.equal(s.phase, 'choose'); assert.equal(s.choices.length, 3);
  const dr = s.drawer, others = s.players.filter(p => p.id !== dr).map(p => p.id);
  assert.equal(applyAction(s, others[0], { type: 'choose', idx: 0 }, 100).ok, false, 'người khác không chọn hộ');
  const vO = viewFor(s, others[0], 0); assert.equal(vO.choices, null); assert.ok(viewFor(s, dr, 0).choices.length === 3);
  assert.ok(applyAction(s, dr, { type: 'choose', idx: 1 }, 1000).ok);
  assert.equal(s.phase, 'draw'); const w = s.word;
  assert.equal(viewFor(s, others[0], 1000).word, null, 'người đoán không thấy đáp án');
  assert.equal(viewFor(s, dr, 1000).word, w);
  assert.ok(viewFor(s, others[0], 1000).mask.every(ch => ch === '_' || ch === ' ' || !/[\p{L}\p{N}]/u.test(ch)));
  // đoán sai
  applyAction(s, others[0], { type: 'guess', text: 'zzzz' }, 2000);
  assert.equal(viewFor(s, others[1], 2000).chat.at(-1).text, 'zzzz');
  // đoán đúng sớm -> điểm cao, muộn -> thấp hơn
  const r1 = applyAction(s, others[0], { type: 'guess', text: w.toUpperCase() }, 3000);
  assert.ok(r1.correct); assert.equal(s.phase, 'draw');
  assert.ok(!viewFor(s, others[1], 3000).chat.some(m => m.text === w.toUpperCase()), 'không lộ chữ đáp án');
  assert.equal(viewFor(s, others[0], 3000).word, w, 'đoán ra rồi thì thấy từ');
  // người đã đoán ra chat -> người chưa đoán không thấy
  applyAction(s, others[0], { type: 'guess', text: 'dễ quá ae' }, 3500);
  assert.ok(!viewFor(s, others[1], 3500).chat.some(m => m.text === 'dễ quá ae'));
  assert.ok(viewFor(s, dr, 3500).chat.some(m => m.text === 'dễ quá ae'));
  const r2 = applyAction(s, others[1], { type: 'guess', text: w }, 60000);
  assert.ok(r2.correct); assert.ok(r1.pts > r2.pts, `nhanh hơn được nhiều điểm hơn ${r1.pts} > ${r2.pts}`);
  assert.equal(s.phase, 'turnEnd', 'mọi người đoán ra thì kết thúc lượt sớm');
  assert.equal(s.players.find(p => p.id === dr).score, 300, 'hoạ sĩ ăn điểm khi tất cả đoán ra');
  assert.equal(viewFor(s, others[1], 60000).chat.some(m => m.text === 'dễ quá ae'), true, 'hết lượt thì tin nhắn kín được mở');
  // sang lượt tiếp
  tick(s, 60000 + TURN_END_MS); assert.equal(s.phase, 'choose'); assert.notEqual(s.drawer, dr);
});
t('gần đúng chỉ báo riêng, hoạ sĩ không lộ đáp án', () => {
  const s = guessGame(3); const dr = s.drawer, o = s.players.find(p => p.id !== dr).id, o2 = s.players.find(p => p.id !== dr && p.id !== o).id;
  s.choices = ['bánh mì', 'phở', 'mèo']; applyAction(s, dr, { type: 'choose', idx: 0 }, 0);
  const r = applyAction(s, o, { type: 'guess', text: 'banh my' }, 1000); assert.ok(r.close);
  assert.ok(viewFor(s, o, 1000).chat.some(m => m.close && m.text.includes('Gần đúng')));
  assert.ok(!viewFor(s, o2, 1000).chat.some(m => m.close || m.text === 'banh my'), 'người khác không thấy câu gần đúng');
  const b = applyAction(s, dr, { type: 'guess', text: 'là BÁNH MÌ nha' }, 1500); assert.ok(b.blocked);
  assert.ok(!viewFor(s, o, 1500).chat.some(m => m.text.includes('BÁNH')));
});
t('gợi ý mở dần, hết giờ kết thúc lượt, chọn từ tự động', () => {
  const s = guessGame(2, { drawTime: 60 }); const dr = s.drawer;
  tick(s, CHOOSE_MS - 1); assert.equal(s.phase, 'choose');
  tick(s, CHOOSE_MS); assert.equal(s.phase, 'draw', 'hết 15s tự chọn');
  const o = s.players.find(p => p.id !== dr).id;
  const hidden = v => v.mask.filter(c => c === '_').length;
  const h0 = hidden(viewFor(s, o, CHOOSE_MS));
  tick(s, CHOOSE_MS + 59000);
  const h1 = hidden(viewFor(s, o, CHOOSE_MS + 59000));
  if (s.hintAt.length) assert.ok(h1 < h0, 'gợi ý phải mở chữ'); assert.ok(h1 >= 1, 'không bao giờ mở hết');
  tick(s, CHOOSE_MS + 60000); assert.equal(s.phase, 'turnEnd'); assert.equal(s.endReason, 'time');
  assert.equal(s.players.find(p => p.id === dr).score, 0, 'không ai đoán ra -> hoạ sĩ 0 điểm');
});
t('đủ số vòng thì kết thúc, mỗi người vẽ mỗi vòng 1 lần', () => {
  const s = guessGame(3, { rounds: 2 }); let now = 0; const drew = {};
  for (let i = 0; i < 50 && s.phase !== 'end'; i++) {
    if (s.phase === 'choose') { drew[s.drawer] = (drew[s.drawer] || 0) + 1; applyAction(s, s.drawer, { type: 'choose', idx: 0 }, now); }
    else if (s.phase === 'draw') { for (const p of s.players) if (p.id !== s.drawer) applyAction(s, p.id, { type: 'guess', text: s.word }, now += 1000); }
    else if (s.phase === 'turnEnd') tick(s, now += TURN_END_MS);
  }
  assert.equal(s.phase, 'end'); assert.deepEqual(Object.values(drew), [2, 2, 2]);
});
t('nét vẽ chỉ nhận từ hoạ sĩ khi đang vẽ', () => {
  const s = guessGame(2); const dr = s.drawer, o = s.players.find(p => p.id !== dr).id;
  assert.equal(addDraw(s, dr, [{ k: 's', g: 1, c: 1, w: 1, p: [1, 1] }]), null, 'đang chọn từ chưa vẽ được');
  applyAction(s, dr, { type: 'choose', idx: 0 }, 0); const cv = s.cv;
  assert.ok(addDraw(s, dr, [{ k: 's', g: 1, c: 1, w: 1, p: [1, 1, 2, 2] }])); assert.equal(s.cv, cv + 1);
  assert.equal(addDraw(s, o, [{ k: 's', g: 1, c: 1, w: 1, p: [1, 1] }]), null);
  assert.equal(s.canvas.length, 1);
});
t('hoạ sĩ rớt mạng bị bỏ lượt, người vào giữa ván', () => {
  const s = guessGame(3); const dr = s.drawer;
  setOnline(s, dr, false, 1000); tick(s, 1000 + OFF_SKIP_MS - 1); assert.equal(s.phase, 'choose');
  tick(s, 1000 + OFF_SKIP_MS); assert.equal(s.phase, 'turnEnd'); assert.equal(s.endReason, 'left');
  assert.ok(addPlayer(s, { id: 'late', name: 'Thái' })); assert.ok(s.order.includes('late'));
  assert.ok(viewFor(s, 'late', 0).players.some(p => p.id === 'late'));
});
t('người đoán rớt mạng không chặn kết thúc sớm', () => {
  const s = guessGame(3); const dr = s.drawer; const [a, b] = s.players.filter(p => p.id !== dr).map(p => p.id);
  applyAction(s, dr, { type: 'choose', idx: 0 }, 0);
  setOnline(s, b, false, 500);
  applyAction(s, a, { type: 'guess', text: s.word }, 1000); assert.equal(s.phase, 'turnEnd');
});
t('dời thời gian khi chủ phòng tải lại trang', () => {
  const s = guessGame(2); const d0 = s.deadline; shiftTime(s, 5000); assert.equal(s.deadline, d0 + 5000);
});

// ---------- Tam sao thất bản ----------
t('chuỗi: mỗi người làm mỗi chuỗi đúng 1 lần (≥ 4 người)', () => {
  for (const n of [4, 5, 7]) {
    const s = createGame(P(n), { mode: 'gartic' }, 0); assert.equal(s.steps, n);
    for (let c = 0; c < n; c++) { const who = new Set(); for (let k = 0; k < n; k++) who.add(s.order.find(id => chainFor(s, id, k) === c)); assert.equal(who.size, n); }
    for (let k = 0; k < n; k++) assert.equal(new Set(s.order.map(id => chainFor(s, id, k))).size, n, 'mỗi bước mỗi người 1 chuỗi khác nhau');
  }
  assert.equal(createGame(P(2), { mode: 'gartic' }, 0).steps, 4, 'ít người vẫn đủ 4 bước');
});
t('viết → vẽ → đoán → chiếu lại → cảm xúc', () => {
  const s = createGame(P(4), { mode: 'gartic', drawTime: 60, textTime: 30 }, 0);
  assert.equal(viewFor(s, 'host', 0).task.kind, 'write');
  assert.equal(applyAction(s, 'host', { type: 'submit', step: 0, text: '   ' }, 10).ok, false);
  s.order.forEach((id, i) => assert.ok(applyAction(s, id, { type: 'submit', step: 0, text: 'câu số ' + i }, 100).ok));
  assert.equal(s.step, 1, 'nộp đủ thì sang bước');
  const v = viewFor(s, s.order[1], 100); assert.equal(v.task.kind, 'draw'); assert.equal(v.task.prompt.t, 'câu số 0', 'người kế vẽ câu của người trước');
  assert.equal(applyAction(s, s.order[1], { type: 'submit', step: 0, text: 'x' }, 200).ok, false, 'bước cũ không nộp được');
  // 2 người nộp tranh, 2 người để hết giờ
  applyAction(s, s.order[0], { type: 'submit', step: 1, ops: [{ k: 's', g: 1, c: 4, w: 2, p: [10, 10, 30, 30] }] }, 1000);
  applyAction(s, s.order[1], { type: 'submit', step: 1, ops: [] }, 1000);
  assert.equal(s.step, 1); tick(s, s.deadline + GRACE_MS - 1); assert.equal(s.step, 1);
  tick(s, s.deadline + GRACE_MS); assert.equal(s.step, 2, 'hết giờ + ân hạn thì tự sang bước');
  const g = viewFor(s, s.order[2], 0).task; assert.equal(g.kind, 'guess'); assert.ok(Array.isArray(g.prompt.d));
  // người rớt mạng lâu không chặn bước
  setOnline(s, s.order[3], false, 70000);
  s.order.slice(0, 3).forEach(id => applyAction(s, id, { type: 'submit', step: 2, text: 'đoán' }, 70500));
  assert.equal(s.step, 2); tick(s, 80000); assert.equal(s.step, 3);
  const now = s.deadline + GRACE_MS; tick(s, now); assert.equal(s.phase, 'reveal');
  assert.equal(bookItems(s).length, 16, 'đủ 4×4 mục, ô trống được lấp');
  assert.equal(applyAction(s, s.order.find(id => id !== 'host'), { type: 'next' }, now).ok, false, 'chỉ chủ phòng bấm tiếp');
  assert.ok(applyAction(s, 'p1', { type: 'react', key: '0:0', e: '😂' }).ok);
  assert.equal(applyAction(s, 'p1', { type: 'react', key: '0:2', e: '😂' }).ok, false, 'chưa lật thì chưa thả được');
  assert.deepEqual(viewFor(s, 'p1').reacts['0:0'], { n: { '😂': 1 }, mine: ['😂'] });
  applyAction(s, 'p1', { type: 'react', key: '0:0', e: '😂' }); assert.deepEqual(viewFor(s, 'p1').reacts['0:0'].n, {}, 'bấm lại thì gỡ');
  let k = 0; while (s.phase === 'reveal' && k++ < 100) applyAction(s, 'host', { type: 'next' }, now);
  assert.equal(s.phase, 'end'); assert.equal(k, 16);
});


// ---------- các kiểu chơi Tam sao thất bản ----------
const L = (x, y, g = 1) => [{ k: 's', g, c: 1, w: 1, p: [x, y, 20, 20] }];
const Pn = n => Array.from({ length: n }, (_, i) => ({ id: i ? 'p' + i : 'host', name: 'N' + i }));
// nộp hết 1 bước cho mọi người
function doStep(s, now, fn) { const k = s.step; for (const id of s.order.slice()) { if (s.step !== k) break; const t = viewFor(s, id, now).task; applyAction(s, id, fn(t, id, k), now); } }
const auto = (t, id, k) => t.desc.t === 'draw' ? { type: 'submit', step: k, ops: L(10 + k, 10 + k, k + 1) } : { type: 'submit', step: k, text: `chữ ${id} ${k}` };
t('13 kiểu chơi (Bình thường + 12 mới) có tên/mô tả tiếng Việt, opts được làm sạch', () => {
  assert.equal(GMODE_KEYS.length, 13);
  for (const k of GMODE_KEYS) { assert.ok(GMODES[k].name && GMODES[k].desc.length > 20 && GMODES[k].icon, k); }
  assert.equal(cleanOpts({ mode: 'gartic', gmode: 'xyz' }).gmode, 'normal');
  const o = cleanOpts({ mode: 'gartic', gmode: 'custom', cSteps: 99, cTime: 3, cKinds: ['draw', 'bậy'] });
  assert.equal(o.cSteps, 20); assert.equal(o.cTime, 10); assert.equal(o.cKinds.length, 20); assert.equal(o.cKinds[0], 'draw'); assert.equal(o.cKinds[1], 'draw', 'kiểu lạ thì về mặc định');
  assert.equal(maxPlayers(cleanOpts({ mode: 'gartic', gmode: 'crowd' })), 30); assert.equal(maxPlayers(cleanOpts({ mode: 'gartic' })), 12); assert.equal(maxPlayers(cleanOpts({})), 12);
});
t('mọi kiểu chơi chạy hết ván: đủ ô, chuỗi xoay đúng', () => {
  for (const gm of GMODE_KEYS) for (const n of [1, 2, 3, 5]) {
    if (n === 1 && gm !== 'solo') continue;
    const s = createGame(Pn(n), { mode: 'gartic', gmode: gm }, 0); let now = 0, g = 0;
    while (s.phase === 'play' && g++ < 50) { doStep(s, now, auto); now += 1000; }
    assert.equal(s.phase, 'reveal', gm + n); assert.equal(bookItems(s).length, n * s.steps, gm);
    for (let k = 0; k < s.steps; k++) assert.equal(new Set(s.order.map(id => chainFor(s, id, k))).size, n, gm + ' mỗi bước mỗi người 1 chuỗi');
    if (gm === 'solo') assert.ok(s.order.every((id, i) => chainFor(s, id, 3) === i), 'Một mình: ai cũng vẽ chuỗi của mình');
  }
});
t('Tốc chiến / Vẽ mù / Đông vui: đồng hồ ngắn hơn Bình thường', () => {
  const o = cleanOpts({ mode: 'gartic', drawTime: 80, textTime: 40 });
  const N = buildPlan({ ...o, gmode: 'normal' }, 4), S = buildPlan({ ...o, gmode: 'speed' }, 4), X = buildPlan({ ...o, gmode: 'secret' }, 4);
  assert.deepEqual(N.map(d => d.role), ['write', 'draw', 'guess', 'draw']); assert.deepEqual(S.map(d => d.role), N.map(d => d.role));
  S.forEach((d, k) => assert.ok(d.ms < N[k].ms, 'tốc chiến ngắn hơn ở bước ' + k)); X.forEach((d, k) => assert.ok(d.ms < N[k].ms));
  assert.ok(X[1].blind && X[1].mask > 0 && !X[1].maskAll && X[3].maskAll, 'vẽ mù: che một phần rồi che hết');
  const C = buildPlan({ ...o, gmode: 'crowd' }, 30); assert.equal(C.length, 6, '30 người: chuỗi chỉ qua 6 người'); assert.ok(C[1].ms < N[1].ms);
  assert.equal(buildPlan({ ...o, gmode: 'crowd' }, 8).length, 6, '8 người = 1 nhóm, chuỗi qua 6 người');
});
t('Nhìn trộm: sau câu đầu chỉ vẽ, xem hình trước có giới hạn, giờ giảm dần', () => {
  const s = createGame(Pn(5), { mode: 'gartic', gmode: 'knockoff', drawTime: 80 }, 0); let now = 0;
  assert.deepEqual(s.plan.map(d => d.role), ['write', 'draw', 'copy', 'copy', 'copy']);
  for (let k = 3; k < 5; k++) assert.ok(s.plan[k].ms < s.plan[k - 1].ms, 'giảm dần');
  doStep(s, now, auto); doStep(s, now, auto);
  const id = s.order[2], t2 = viewFor(s, id, now).task; assert.equal(t2.role, 'copy'); assert.equal(t2.desc.peek, 5000); assert.ok(Array.isArray(t2.prompt.d) && t2.prompt.d.length, 'đề là hình người trước');
  const c = chainFor(s, id); assert.deepEqual(t2.prompt.d, s.book[c][1].d);
});
t('Bánh mì kẹp: viết đầu – chép hình giữa – đoán cuối', () => {
  const s = createGame(Pn(6), { mode: 'gartic', gmode: 'sandwich' }, 0);
  assert.deepEqual(s.plan.map(d => d.t), ['text', 'draw', 'draw', 'draw', 'draw', 'text']);
  assert.equal(s.plan[5].role, 'guess'); assert.ok(s.plan.slice(2, 5).every(d => d.role === 'copy' && d.peek));
});
t('Vẽ tiếp: nét cũ là nền khoá, "xoá hết" chỉ xoá nét mới, album ghép đủ lớp', () => {
  const s = createGame(Pn(3), { mode: 'gartic', gmode: 'complement' }, 0); let now = 0;
  assert.equal(s.plan[0].role, 'doodle'); assert.ok(s.plan[0].ms <= 10000, 'bước đầu rất ngắn'); assert.ok(s.plan.slice(1).every(d => d.layer && d.role === 'extend'));
  doStep(s, now, (t, id, k) => ({ type: 'submit', step: k, ops: L(100, 100, 1) }));
  const id = s.order[1], c = chainFor(s, id), t1 = viewFor(s, id, now).task;
  assert.deepEqual(t1.base, s.book[c][0].d, 'thấy nét bước trước làm nền'); assert.ok(!t1.prompt);
  // gửi kèm nét cũ + xoá hết + nét mới: chỉ giữ nét mới sau lần xoá
  applyAction(s, id, { type: 'submit', step: 1, ops: [...L(1, 1, 5), { k: 'c', g: 6 }, ...L(200, 200, 7)] }, now);
  assert.deepEqual(s.book[c][1].d, L(200, 200, 7));
  assert.deepEqual(itemOps(s, c, 1), [...s.book[c][0].d, ...L(200, 200, 7)], 'ô hiện ra = nền + nét mới');
  doStep(s, now, auto); doStep(s, now, auto);
  const it = bookItems(s).find(x => x.key === c + ':2'); assert.equal(it.d.length, 3, 'bước 3 = 3 lớp');
});
t('Phá băng: câu hỏi ở bước đầu, các bước sau đều vẽ trả lời cùng câu hỏi', () => {
  const s = createGame(Pn(4), { mode: 'gartic', gmode: 'icebreaker' }, 0); let now = 0;
  assert.deepEqual(s.plan.map(d => d.role), ['question', 'answer', 'answer', 'answer']);
  doStep(s, now, (t, id, k) => ({ type: 'submit', step: k, text: 'Hỏi của ' + id })); doStep(s, now, auto);
  const id = s.order[0], t2 = viewFor(s, id, now).task, c = chainFor(s, id);
  assert.equal(t2.prompt.t, s.book[c][0].t, 'đề luôn là câu hỏi gốc, không thấy tranh người trước');
});
t('Hoạt hình & Phông nền: lớp mờ khung trước, phông khoá cho mọi khung', () => {
  const a = createGame(Pn(3), { mode: 'gartic', gmode: 'animation' }, 0); let now = 0;
  assert.equal(a.steps, 6); assert.ok(a.plan.every(d => d.role === 'frame'));
  assert.ok(viewFor(a, 'host', now).task.sugg, 'khung đầu có gợi ý');
  doStep(a, now, auto);
  const t1 = viewFor(a, a.order[1], now).task, c1 = chainFor(a, a.order[1]);
  assert.deepEqual(t1.onion, a.book[c1][0].d); assert.ok(!t1.base);
  const b = createGame(Pn(3), { mode: 'gartic', gmode: 'background' }, 0);
  assert.equal(b.plan[0].role, 'bg'); doStep(b, now, auto);
  const u1 = viewFor(b, b.order[0], now).task, cb = chainFor(b, b.order[0]);
  assert.deepEqual(u1.base, b.book[cb][0].d); assert.ok(!u1.onion, 'khung 1 chưa có khung trước');
  doStep(b, now, auto);
  const u2 = viewFor(b, b.order[0], now).task, cb2 = chainFor(b, b.order[0]);
  assert.deepEqual(u2.base, b.book[cb2][0].d, 'vẫn là phông gốc'); assert.deepEqual(u2.onion, b.book[cb2][1].d, 'mờ khung trước (không lẫn phông)');
  assert.deepEqual(itemOps(b, cb2, 1), [...b.book[cb2][0].d, ...b.book[cb2][1].d]);
});
t('Một mình: 1 người chơi được 5 khung, mỗi bước vẫn là chuỗi của mình', () => {
  const s = createGame(Pn(1), { mode: 'gartic', gmode: 'solo' }, 0); let now = 0;
  assert.equal(s.steps, 5);
  for (let k = 0; k < 5; k++) { const t = viewFor(s, 'host', now).task; assert.equal(t.frame, k + 1); if (k) assert.ok(t.onion); applyAction(s, 'host', { type: 'submit', step: k, ops: L(k * 10, 5, k + 1) }, now); }
  assert.equal(s.phase, 'reveal'); assert.equal(bookItems(s).length, 5);
});
t('Chấm điểm: 👍/👎 từng bước, không tự chấm, chuỗi giữ ý gốc được thưởng', () => {
  const s = createGame(Pn(4), { mode: 'gartic', gmode: 'score' }, 0); let now = 0;
  doStep(s, now, (t, id, k) => ({ type: 'submit', step: k, text: 'con mèo ' + id }));
  doStep(s, now, auto);
  doStep(s, now, (t, id, k) => ({ type: 'submit', step: k, text: 'đoán bừa' })); doStep(s, now, auto);
  assert.equal(s.phase, 'reveal');
  const author = s.book[0][1].by, other = s.order.find(id => id !== author);
  assert.equal(applyAction(s, other, { type: 'vote', key: '0:1', v: 1 }).ok, false, 'chưa lật tới');
  applyAction(s, 'host', { type: 'next' });
  assert.equal(applyAction(s, author, { type: 'vote', key: '0:1', v: 1 }).ok, false, 'không tự chấm');
  assert.equal(applyAction(s, other, { type: 'vote', key: '0:0', v: 1 }).ok, false, 'câu gốc không chấm');
  assert.ok(applyAction(s, other, { type: 'vote', key: '0:1', v: 1 }).ok);
  assert.equal(garticScores(s).pts[author], 100);
  const v = viewFor(s, other); assert.deepEqual(v.votes['0:1'], { up: 1, down: 0, mine: 1 }); assert.equal(v.scores[author], 100);
  applyAction(s, other, { type: 'vote', key: '0:1', v: 1 }); assert.equal(garticScores(s).pts[author], 0, 'bấm lại thì gỡ');
  // chuỗi có câu cuối khớp câu đầu: mọi người góp mặt +200
  s.book[1][3] = { by: s.book[1][3].by, t: s.book[1][0].t };
  const sc = garticScores(s); assert.equal(sc.kept[1], true); for (const it of s.book[1]) assert.ok(sc.pts[it.by] >= 200);
  assert.equal(applyAction(createGame(Pn(2), { mode: 'gartic' }, 0), 'host', { type: 'vote', key: '0:1', v: 1 }).ok, false, 'chế độ khác không chấm');
});
t('Tuỳ chỉnh: số bước, thời gian và kiểu từng bước', () => {
  const s = createGame(Pn(3), { mode: 'gartic', gmode: 'custom', cSteps: 5, cTime: 25, cKinds: ['draw', 'text', 'text', 'frame', 'frame'] }, 0);
  assert.deepEqual(s.plan.map(d => d.role), ['free', 'guess', 'retell', 'frame', 'frame']);
  assert.ok(s.plan.every(d => d.ms === 25000)); assert.ok(!s.plan[3].onion && s.plan[4].onion, 'khung sau khung mới thấy mờ');
  const s2 = createGame(Pn(2), { mode: 'gartic', gmode: 'custom', cSteps: 3, cKinds: ['text', 'draw', 'draw'] }, 0);
  assert.deepEqual(s2.plan.map(d => d.role), ['write', 'draw', 'copy']);
});
t('rớt mạng: bước của họ tự lấp khi hết giờ (mọi kiểu chơi)', () => {
  for (const gm of GMODE_KEYS) {
    const s = createGame(Pn(3), { mode: 'gartic', gmode: gm }, 0);
    setOnline(s, 'p2', false, 0); let now = 0, g = 0;
    while (s.phase === 'play' && g++ < 40) { for (const id of ['host', 'p1']) { const t = viewFor(s, id, now).task; if (t && !t.done) applyAction(s, id, auto(t, id, s.step), now); } now += 3000; tick(s, now); now = Math.max(now, s.deadline + GRACE_MS); tick(s, now); }
    assert.equal(s.phase, 'reveal', gm); assert.ok(bookItems(s).some(x => x.miss), gm);
  }
});
t('tải lại trang (chủ phòng): kế hoạch & đồng hồ giữ nguyên', () => {
  const s = createGame(Pn(3), { mode: 'gartic', gmode: 'knockoff' }, 1000);
  const j = JSON.parse(JSON.stringify(s)), dl = j.deadline; shiftTime(j, 5000);
  assert.equal(j.deadline, dl + 5000); assert.deepEqual(j.plan, s.plan); assert.equal(viewFor(j, 'host', 6000).task.role, 'write');
});


// ---------- nâng cấp 11/2026: chiếu tự động, nhóm Đông vui, số khung ----------
function playAll(s, now = 0) { let g = 0; while (s.phase === 'play' && g++ < 60) { doStep(s, now, auto); now += 1000; } return now; }
t('chiếu lại tự động: mặc định 5 giây, ô cuối chuỗi dừng gấp đôi, tạm dừng/tiếp đồng bộ', () => {
  assert.equal(cleanOpts({}).revealAuto, 5); assert.equal(cleanOpts({ revealAuto: 0 }).revealAuto, 0); assert.equal(cleanOpts({ revealAuto: 7 }).revealAuto, 5); assert.equal(cleanOpts({ revealAuto: 8 }).revealAuto, 8);
  const s = createGame(Pn(3), { mode: 'gartic', revealAuto: 3 }, 0); let now = playAll(s);
  assert.equal(s.phase, 'reveal'); assert.equal(s.reveal.auto, 3); assert.equal(s.deadline, now - 1000 + 3000);
  now = s.deadline - 1; assert.equal(tick(s, now), false); assert.equal(s.reveal.u, 0);
  let v = viewFor(s, 'p1', now); assert.equal(v.total, 3000); assert.equal(v.left, 1); assert.equal(v.reveal.auto, 3);
  now += 1; assert.equal(tick(s, now), true); assert.equal(s.reveal.u, 1, 'tự sang bước');
  while (s.reveal.u < s.steps - 1) { now = s.deadline; tick(s, now); }
  assert.equal(s.reveal.ms, 6000, 'ô cuối chuỗi: gấp đôi');
  assert.equal(applyAction(s, 'p1', { type: 'pause', on: true }, now).ok, false, 'chỉ chủ phòng tạm dừng');
  assert.ok(applyAction(s, 'host', { type: 'pause', on: true }, now).ok); assert.equal(s.deadline, 0); assert.equal(viewFor(s, 'p2', now).reveal.paused, true);
  assert.equal(tick(s, now + 60000), false, 'đang tạm dừng thì đứng yên'); assert.equal(viewFor(s, 'p2', now).total, 0);
  assert.ok(applyAction(s, 'host', { type: 'pause', on: false }, now).ok); assert.equal(s.deadline, now + 6000);
  now = s.deadline; tick(s, now); assert.deepEqual([s.reveal.c, s.reveal.u], [1, 0], 'sang chuỗi tiếp');
  assert.equal(applyAction(s, 'host', { type: 'autoReveal', sec: 4 }, now).ok, false, 'chỉ 0/3/5/8 giây');
  assert.ok(applyAction(s, 'host', { type: 'autoReveal', sec: 0 }, now).ok); assert.equal(s.deadline, 0); assert.equal(tick(s, now + 1e6), false, 'tắt tự động: đứng yên');
  assert.equal(applyAction(s, 'host', { type: 'pause', on: true }, now).ok, false);
  assert.ok(applyAction(s, 'host', { type: 'next' }, now).ok); assert.equal(s.reveal.u, 1, 'vẫn bấm tay được');
  assert.ok(applyAction(s, 'host', { type: 'autoReveal', sec: 8 }, now).ok); assert.equal(s.deadline, now + 8000);
  applyAction(s, 'host', { type: 'next' }, now + 100); assert.equal(s.deadline, now + 100 + 8000, 'bấm tay thì đếm lại từ đầu');
  const j = JSON.parse(JSON.stringify(s)); shiftTime(j, 5000); assert.equal(j.deadline, s.deadline + 5000, 'tải lại trang: đồng hồ chiếu dời theo');
  let g = 0; now = s.deadline; while (s.phase === 'reveal' && g++ < 100) { tick(s, now); now = s.deadline || now; }
  assert.equal(s.phase, 'end'); assert.equal(s.deadline, 0); assert.equal(REVEAL_AUTO.join(), '0,3,5,8');
});
t('Đông vui: chia nhóm ≥ 4 người, chuỗi chỉ chuyền trong nhóm', () => {
  const o = { gmode: 'crowd' };
  assert.deepEqual(groupSizes(30, o), [6, 6, 6, 6, 6]); assert.deepEqual(groupSizes(13, o), [7, 6]); assert.deepEqual(groupSizes(8, o), [8]);
  assert.deepEqual(groupSizes(30, { gmode: 'crowd', gSize: 4 }), [5, 5, 4, 4, 4, 4, 4]); assert.deepEqual(groupSizes(30, { gmode: 'crowd', gSize: 8 }), [8, 8, 7, 7]);
  assert.deepEqual(groupSizes(9, { gmode: 'normal' }), [9], 'kiểu khác: 1 nhóm'); assert.equal(cleanOpts({ gSize: 99 }).gSize, 8); assert.equal(cleanOpts({}).gSize, 6);
  for (const [n, gs] of [[30, 6], [13, 6], [17, 5], [26, 4], [3, 6]]) {
    const s = createGame(Pn(n), { mode: 'gartic', gmode: 'crowd', gSize: gs }, 0), G = groupsOf(s);
    assert.equal(G.reduce((t, g) => t + g[1], 0), n); assert.ok(G.length === 1 || G.every(g => g[1] >= 4));
    assert.ok(G.length === 1 || s.steps <= Math.min(...G.map(g => g[1])), 'không ai làm 1 chuỗi 2 lần');
    for (let k = 0; k < s.steps; k++) assert.equal(new Set(s.order.map(id => chainFor(s, id, k))).size, n, 'mỗi bước mỗi người 1 chuỗi khác nhau');
    for (const [a, g] of G) for (let c = a; c < a + g; c++) for (let k = 0; k < s.steps; k++) { const i = s.order.findIndex(id => chainFor(s, id, k) === c); assert.ok(i >= a && i < a + g, 'chuỗi ở trong nhóm'); }
    if (G.length > 1) { const who = new Set(); for (let k = 0; k < s.steps; k++) who.add(s.order.find(id => chainFor(s, id, k) === 0)); assert.equal(who.size, s.steps); }
    assert.deepEqual(viewFor(s, 'host', 0).groups, G);
  }
  const s = createGame(Pn(12), { mode: 'gartic', gmode: 'crowd', revealAuto: 0 }, 0); let now = playAll(s);
  assert.equal(s.phase, 'reveal'); assert.deepEqual(groupsOf(s), [[0, 6], [6, 6]]); assert.equal(bookItems(s).length, 12 * s.steps);
  assert.equal(applyAction(s, 'p3', { type: 'skipGroup' }, now).ok, false);
  applyAction(s, 'host', { type: 'next' }, now); assert.ok(applyAction(s, 'host', { type: 'skipGroup' }, now).ok); assert.deepEqual([s.reveal.c, s.reveal.u], [6, 0], 'bỏ qua phần còn lại của nhóm 1');
  assert.ok(applyAction(s, 'host', { type: 'skipGroup' }, now).ok); assert.equal(s.phase, 'end', 'nhóm cuối: bỏ qua là xem album');
});
t('Hoạt hình / Phông nền / Một mình: chọn số khung, tốc độ phim mặc định', () => {
  assert.equal(cleanOpts({ frames: 99 }).frames, 16); assert.equal(cleanOpts({ frames: 1 }).frames, 3); assert.equal(cleanOpts({}).frames, 0);
  assert.equal(cleanOpts({ fps: 30 }).fps, 12); assert.equal(cleanOpts({}).fps, 4);
  assert.equal(frameCount({ gmode: 'animation', frames: 0 }, 3), 6); assert.equal(frameCount({ gmode: 'animation', frames: 0 }, 9), 9); assert.equal(frameCount({ gmode: 'background', frames: 3 }, 9), 4);
  assert.equal(frameCount({ gmode: 'solo', frames: 0 }, 1), 5); assert.equal(frameCount({ gmode: 'solo', frames: 16 }, 1), 12);
  const a = createGame(Pn(3), { mode: 'gartic', gmode: 'animation', frames: 10, fps: 8 }, 0);
  assert.equal(a.steps, 10); assert.ok(a.plan.every(d => d.role === 'frame')); assert.equal(viewFor(a, 'p1', 0).opts.fps, 8);
  playAll(a); assert.equal(a.phase, 'reveal'); assert.equal(bookItems(a).length, 30);
  const b = createGame(Pn(2), { mode: 'gartic', gmode: 'background', frames: 7 }, 0); assert.equal(b.steps, 7); assert.equal(b.plan[0].role, 'bg');
  const s = createGame(Pn(1), { mode: 'gartic', gmode: 'solo', frames: 9 }, 0); assert.equal(s.steps, 9);
  for (let k = 0; k < 9; k++) { const tk = viewFor(s, 'host', 0).task; assert.equal(tk.frame, k + 1); applyAction(s, 'host', { type: 'submit', step: k, ops: L(k * 10, 5, k + 1) }, 0); }
  assert.equal(s.phase, 'reveal'); assert.equal(bookItems(s).length, 9);
});


// ---------- GIF tự viết: giải mã lại để chắc chắn đúng chuẩn ----------
function decodeGif(b) {
  let p = 0; const u8 = () => b[p++], u16 = () => b[p++] | (b[p++] << 8);
  assert.equal(String.fromCharCode(...b.slice(0, 6)), 'GIF89a'); p = 6;
  const w = u16(), h = u16(), f = u8(); p += 2; const pal = []; for (let i = 0; i < 2 << (f & 7); i++) pal.push([u8(), u8(), u8()]);
  const frames = [], delays = []; let loop = false;
  for (;;) {
    const t = u8();
    if (t === 0x3b) break;
    if (t === 0x21) { const l = u8(); if (l === 0xf9) { p += 2; delays.push(u16()); p += 1; } else if (l === 0xff) { loop = true; p += 12; } while (b[p]) p += b[p] + 1; p++; continue; }
    assert.equal(t, 0x2c); p += 8; u8();
    const min = u8(), data = []; for (let n = u8(); n; n = u8()) { for (let i = 0; i < n; i++) data.push(b[p++]); }
    // LZW giải nén
    const clear = 1 << min, eoi = clear + 1; let size = min + 1, dict = [], out = [], bit = 0, prev = null;
    const reset = () => { dict = Array.from({ length: eoi + 1 }, (_, i) => [i]); size = min + 1; prev = null; };
    reset();
    for (;;) {
      let code = 0; for (let i = 0; i < size; i++, bit++) code |= ((data[bit >> 3] >> (bit & 7)) & 1) << i;
      if (code === clear) { reset(); continue; } if (code === eoi) break;
      let e = code < dict.length ? dict[code] : prev.concat(prev[0]);
      if (prev) { dict.push(prev.concat(e[0])); if (dict.length === (1 << size) && size < 12) size++; }
      out.push(...e); prev = e;
    }
    frames.push(out);
  }
  return { w, h, pal, frames, delays, loop };
}
t('GIF: mã hoá đúng chuẩn, giữ đúng màu từng điểm, độ trễ từng khung', () => {
  const W = 37, H = 23, mk = fn => { const d = new Uint8ClampedArray(W * H * 4), idx = []; for (let i = 0; i < W * H; i++) { const k = fn(i), c = PALETTE[k]; idx.push(k); d.set([1, 3, 5].map(j => parseInt(c.slice(j, j + 2), 16)).concat(255), i * 4); } return { img: { width: W, height: H, data: d }, idx }; };
  let sd = 9; const rnd = () => (sd = (sd * 1103515245 + 12345) % 2147483648) / 2147483648;
  const A = mk(() => Math.floor(rnd() * 20)), B = mk(i => (i >> 3) % 20);
  const g = decodeGif(encodeGif([A.img, B.img], { delay: 30 }));
  assert.equal(g.w, W); assert.equal(g.frames.length, 2); assert.ok(g.loop); assert.deepEqual(g.delays, [30, 30]);
  assert.deepEqual(g.frames[0], A.idx); assert.deepEqual(g.frames[1], B.idx);
  // ảnh lớn đủ để bảng mã LZW đầy (4096) rồi xoá lại
  const BW = 400, BH = 300, big = new Uint8ClampedArray(BW * BH * 4), bi = [];
  for (let i = 0; i < BW * BH; i++) { const k = Math.floor(rnd() * 20), c = PALETTE[k]; bi.push(k); big.set([1, 3, 5].map(j => parseInt(c.slice(j, j + 2), 16)).concat(255), i * 4); }
  const gw = new GifWriter(BW, BH, { extra: UI_COLORS }); gw.frame({ width: BW, height: BH, data: big }, 150); gw.frame({ width: BW, height: BH, data: big }, 7);
  const g2 = decodeGif(gw.finish()); assert.deepEqual(g2.delays, [150, 7]); assert.deepEqual(g2.frames[0], bi); assert.deepEqual(g2.frames[1], bi);
  assert.deepEqual(g2.pal[20], [255, 248, 232], 'màu giấy nằm trong bảng màu');
});

// ---------- mô phỏng ngẫu nhiên: không ván nào kẹt ----------
const N = +process.argv[2] || 200; let stuck = 0, errs = 0;
for (let gi = 0; gi < N; gi++) {
  const mode = gi % 2 ? 'gartic' : 'guess';
  const gmode = GMODE_KEYS[Math.floor(gi / 2) % GMODE_KEYS.length];
  const n = mode === 'gartic' && gmode === 'crowd' ? 8 + (gi % 23) : 2 + (gi % 7);
  const s = createGame(P(n), { mode, gmode, rounds: 1 + (gi % 3), drawTime: 30 + (gi % 5) * 30, revealAuto: [0, 3, 5, 8][gi % 4], frames: gi % 3 ? 0 : 3 + (gi % 14), gSize: 4 + (gi % 5), cSteps: 2 + (gi % 9), cKinds: ['frame', 'text', 'draw', 'frame', 'text', 'draw', 'draw', 'frame', 'text', 'text'] }, 0);
  let now = 0, steps = 0;
  while (s.phase !== 'end' && steps++ < 5000) {
    now += 500 + Math.floor(Math.random() * 3000);
    const who = s.players[Math.floor(Math.random() * s.players.length)].id;
    if (Math.random() < 0.05) setOnline(s, who, Math.random() < 0.6, now);
    if (s.mode === 'guess') {
      if (s.phase === 'choose' && who === s.drawer && Math.random() < 0.5) applyAction(s, who, { type: 'choose', idx: 2 }, now);
      if (s.phase === 'draw') {
        if (who === s.drawer) addDraw(s, who, [{ k: 's', g: steps, c: 2, w: 1, p: [5, 5, 1, 1] }]);
        else applyAction(s, who, { type: 'guess', text: Math.random() < 0.3 ? s.word : 'x' + steps }, now);
      }
    } else if (s.phase === 'play') {
      if (Math.random() < 0.7) { const kind = viewFor(s, who, now).task?.kind; applyAction(s, who, kind === 'draw' ? { type: 'submit', step: s.step, ops: Math.random() < 0.5 ? [] : L(5, 5, steps) } : { type: 'submit', step: s.step, text: 'abc' }, now); }
    } else if (s.phase === 'reveal') { const r = Math.random(); applyAction(s, 'host', r < 0.5 ? { type: 'next' } : r < 0.6 ? { type: 'pause', on: Math.random() < 0.5 } : r < 0.65 ? { type: 'skipGroup' } : r < 0.7 ? { type: 'autoReveal', sec: [0, 3, 5, 8][Math.floor(Math.random() * 4)] } : { type: 'noop' }, now); if (Math.random() < 0.3) applyAction(s, who, { type: 'react', key: s.reveal.c + ':0', e: '🔥' }); if (Math.random() < 0.3) applyAction(s, who, { type: 'vote', key: s.reveal.c + ':' + s.reveal.u, v: 1 }); }
    tick(s, now);
    try { JSON.parse(JSON.stringify(s)); for (const p of s.players) viewFor(s, p.id, now); } catch (e) { errs++; console.log(e); break; }
  }
  if (s.phase !== 'end') { stuck++; if (stuck < 3) console.log('KẸT', mode, n, s.phase, s.step); }
}
console.log(`✓ ${passed} nhóm test đạt · mô phỏng ${N} ván: kẹt ${stuck}, lỗi ${errs}`);
if (stuck || errs) process.exit(1);
