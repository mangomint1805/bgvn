// Kiểm tra luật Thật hay Thách: node thathaythach/test/sim.mjs
import * as E from '../js/engine.js';
import { CARDS, TOPICS } from '../js/cards.js';
const ok = (c, m) => { if (!c) { console.error('❌', m); process.exit(1); } };
let nT = 0, nD = 0; const seen = new Set();
for (const tp of TOPICS) { const c = CARDS[tp.id]; ok(c && c.t.length >= 6 && c.d.length >= 6, 'thiếu câu: ' + tp.id); for (const k of ['t', 'd']) for (const [lv, tx] of c[k]) { ok([1, 2, 3].includes(lv) && tx.length <= 140, 'câu lỗi: ' + tx); ok(!seen.has(tx), 'trùng: ' + tx); seen.add(tx); k === 't' ? nT++ : nD++; } ok(c.t.some(x => x[0] === 1) && c.d.some(x => x[0] === 1), 'chủ đề phải có câu nhẹ: ' + tp.id); }
const ps = ['host', 'a', 'b'].map(id => ({ id, name: id }));
for (const order of ['turn', 'random']) for (let g = 0; g < 200; g++) {
  const s = E.createGame(ps, { topics: ['banbe'], level: 1, order, rounds: 3, skips: 1 }); let turns = 0, prev = null; const texts = [];
  while (s.phase !== 'ended') {
    ok(s.cur !== prev || ps.length === 1, 'một người bị gọi 2 lần liền'); prev = s.cur; turns++;
    ok(!E.applyAction(s, s.cur === 'a' ? 'b' : 'a', { type: 'pick', kind: 't' }).ok, 'người khác rút được câu');
    ok(E.applyAction(s, s.cur, { type: 'pick', kind: 'r' }).ok, 'không rút được'); ok(!s.card.text.includes('{ai}'), 'chưa điền tên'); texts.push(s.card.text);
    if (Math.random() < .3) { const t = s.card.text; ok(E.applyAction(s, s.cur, { type: 'swap' }).ok && s.card.text !== t, 'đổi câu lỗi'); ok(!E.applyAction(s, s.cur, { type: 'swap' }).ok, 'đổi 2 lần'); }
    const p = s.players.find(x => x.id === s.cur), sk = Math.random() < .4, r = E.applyAction(s, s.cur, { type: sk ? 'skip' : 'done' });
    if (!r.ok) { ok(sk && p.left === 0, 'từ chối sai'); E.applyAction(s, p.id, { type: 'done' }); }
    ok(turns < 50, 'không kết thúc');
  }
  ok(turns === 9, 'sai số lượt: ' + turns); ok(s.players.every(p => p.t + p.d + p.skip === 3 && p.skip <= 1), 'đếm sai'); ok(E.viewFor(s).awards, 'thiếu danh hiệu');
}
const s = E.createGame(ps, { rounds: 0 }); for (let i = 0; i < 400; i++) { E.applyAction(s, s.cur, { type: 'pick', kind: 'd' }); E.applyAction(s, s.cur, { type: 'done' }); } ok(s.phase !== 'ended' && s.card === null, 'chơi không giới hạn');
ok(!E.applyAction(s, 'a', { type: 'end' }).ok && E.applyAction(s, 'host', { type: 'end' }).ok && s.phase === 'ended', 'kết thúc');
ok(E.optOk('custom', [{ k: 't', text: 'Câu tự viết?' }]) && !E.optOk('custom', [{ k: 'x', text: 'a' }]) && !E.optOk('topics', []) && E.optOk('topics', ['game']), 'optOk');
console.log(`✅ Luật ổn · ${TOPICS.length} chủ đề · ${nT} câu Thật + ${nD} câu Thách = ${nT + nD} câu`);
