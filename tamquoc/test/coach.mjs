// Kiểm tra "thầy đồ" (gợi ý cho người mới): chạy ván toàn bot, ở mỗi câu hỏi tính gợi ý cho người được hỏi.
// Yêu cầu: không lỗi, không làm thay đổi state thật, bước đầu luôn hợp lệ, có chữ giải thích, không lộ vai ẩn.
// Chạy: node tamquoc/test/coach.mjs [số ván=120]
import { createGame, applyAction, top } from '../js/engine.js?v=7';
import { botAction } from '../js/bot.js?v=7';
import { coachHint } from '../js/coach.js?v=7';
import { ROLES } from '../js/cards.js?v=7';
const GAMES = +(process.argv[2] || 120);
let hints = 0, empty = 0, errors = 0, mutated = 0, invalid = 0, noText = 0, leak = 0, multi = 0; const types = {};
const samples = {};
for (let g = 0; g < GAMES; g++) {
  const n = 2 + (g % 7);
  const players = Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: ['Minto', 'Tiến', 'Tuni', 'Thành', 'Khiêm', 'Thái', 'Mochi', 'Bắp'][i], isBot: true }));
  const s = createGame(players, { exp: g % 2 === 0, expGen: g % 2 === 0, training: true });
  let steps = 0;
  while (s.phase === 'playing' && steps++ < 30000) {
    const t = top(s); const pid = t.ask.players[Math.floor(Math.random() * t.ask.players.length)];
    if (steps % 3 === 0) {
      const before = JSON.stringify(s); let h;
      try { h = coachHint(s, pid, true); } catch (e) { errors++; if (errors < 6) console.log('LỖI coach', t.ask.type, t.ask.purpose, e.stack.split('\n').slice(0, 3).join(' | ')); }
      if (JSON.stringify(s) !== before) mutated++;
      if (h) {
        hints++; types[h.type] = (types[h.type] || 0) + 1;
        if (!h.steps.length) empty++;
        else {
          if (h.steps.length > 1) multi++;
          const st = h.steps[0]; if (!st.text) noText++;
          const c = JSON.parse(before); const r = applyAction(c, pid, st.a); if (!r.ok) { invalid++; console.log('Gợi ý không hợp lệ', r.reason, JSON.stringify(st.a)); }
          // vai ẩn của người khác không được xuất hiện trong lời giải thích
          const me = s.players.find(p => p.id === pid);
          for (const q of s.players) if (q !== me && !q.revealed && q.role !== 'lord') { const txt = h.steps.map(x => x.text + ' ' + x.why).join(' '); if (new RegExp(`${q.name}[^.;·]{0,4}(là|đã lộ là) ${ROLES[q.role].name}`).test(txt)) leak++; }
          const k = h.type + ':' + (t.ask.purpose || ''); if (!samples[k]) samples[k] = `${st.text} — ${st.why}${h.steps.length > 1 ? ' | sau đó: ' + h.steps.slice(1).map(x => x.text).join(' → ') : ''}`;
        }
      }
    }
    const a = botAction(s, pid); const r = applyAction(s, pid, a);
    if (!r.ok) { const r2 = applyAction(s, pid, t.ask.type === 'play' ? { type: 'end' } : { type: 'pass' }); if (!r2.ok) break; }
  }
}
console.log({ GAMES, hints, empty, multiStepPlans: multi, errors, mutated, invalid, noText, leak, types });
for (const [k, v] of Object.entries(samples).sort()) console.log(' ·', k.padEnd(18), v);
if (errors || mutated || invalid || noText || leak) process.exit(1);
