// Unit test luật Scribble it!: node scribble/test/logic.mjs [số ván mô phỏng]
import assert from 'node:assert/strict';
import { norm, isMatch, isNear, leaks, maskWord, wordLens, within1 } from '../js/match.js';
import { CATS, CAT_KEYS, DEFAULT_CATS, totalWords, buildPool, parseCustom, randomPrompt } from '../js/words.js';
import { createGame, applyAction, viewFor, tick, addDraw, addPlayer, setOnline, setRandom, chainFor, bookItems, shiftTime, cleanOpts, CHOOSE_MS, TURN_END_MS, GRACE_MS, OFF_SKIP_MS } from '../js/engine.js';
import { cleanOps, pushOp, simplifyOps, opsBytes, encodePts, decodePts } from '../js/ops.js';

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

// ---------- mô phỏng ngẫu nhiên: không ván nào kẹt ----------
const N = +process.argv[2] || 200; let stuck = 0, errs = 0;
for (let gi = 0; gi < N; gi++) {
  const n = 2 + (gi % 7), mode = gi % 2 ? 'gartic' : 'guess';
  const s = createGame(P(n), { mode, rounds: 1 + (gi % 3), drawTime: 30 + (gi % 5) * 30 }, 0);
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
      if (Math.random() < 0.7) { const kind = viewFor(s, who, now).task?.kind; applyAction(s, who, kind === 'draw' ? { type: 'submit', step: s.step, ops: [] } : { type: 'submit', step: s.step, text: 'abc' }, now); }
    } else if (s.phase === 'reveal') { applyAction(s, 'host', { type: 'next' }, now); if (Math.random() < 0.3) applyAction(s, who, { type: 'react', key: s.reveal.c + ':0', e: '🔥' }); }
    tick(s, now);
    try { JSON.parse(JSON.stringify(s)); for (const p of s.players) viewFor(s, p.id, now); } catch (e) { errs++; console.log(e); break; }
  }
  if (s.phase !== 'end') { stuck++; if (stuck < 3) console.log('KẸT', mode, n, s.phase, s.step); }
}
console.log(`✓ ${passed} nhóm test đạt · mô phỏng ${N} ván: kẹt ${stuck}, lỗi ${errs}`);
if (stuck || errs) process.exit(1);
