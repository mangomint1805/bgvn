// Mô phỏng hàng loạt ván bot: đếm ván kẹt/lỗi, kiểm tra bảo toàn bài, in tỉ lệ thắng từng phe.
// Chạy: node bang/test/sim.mjs [số ván]
import { createGame, applyAction, topPrompt, current, viewFor, getPlayer } from '../js/engine.js';
import { botAction, suspicion } from '../js/bot.js';

const GAMES = +(process.argv[2] || 1000);
const wins = { law: 0, outlaw: 0, renegade: 0 };
const byN = {};
let totalTurns = 0, maxTurns = 0, stuck = 0, errors = 0;
const rejects = {};
const viol = { deputyShotSheriff: 0, actsMissing: 0, viewNoActs: 0 };
let deputyShots = 0, deputyShotsAtSheriffAttacker = 0;

for (let g = 0; g < GAMES; g++) {
  const n = 4 + (g % 4);
  const players = Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'Bot' + i, isBot: true }));
  const s = createGame(players);
  let steps = 0;
  try {
    while (s.phase === 'playing' && steps < 5000) {
      steps++;
      const pr = topPrompt(s);
      const pid = pr ? pr.player : current(s).id;
      const a = botAction(s, pid);
      if (!a) { console.log('Bot không có action!', JSON.stringify(pr), s.step, current(s).id, pid); stuck++; break; }
      const me = getPlayer(s, pid);
      // Phó cảnh sát không bao giờ nhắm vào sếp
      if (me.role === 'deputy' && a.type === 'play_card' && a.target) {
        const t = getPlayer(s, a.target);
        if (t.role === 'sheriff') viol.deputyShotSheriff++;
        deputyShots++;
        const sc = suspicion(s, me); if (sc[t.id] < 0) deputyShotsAtSheriffAttacker++;
      }
      const before = s.acts.length;
      const r = applyAction(s, pid, a);
      if (r.ok && a.type === 'play_card' && s.acts.length === before && s.acts.length < 300) viol.actsMissing++;
      if (!r.ok) {
        rejects[r.reason] = (rejects[r.reason] || 0) + 1;
        if (a.type !== 'end_turn') { const r2 = applyAction(s, pid, { type: 'end_turn' }); if (!r2.ok) { console.log('Kẹt:', r.reason, a, r2.reason, JSON.stringify(pr)); stuck++; break; } }
        else { console.log('Kẹt end_turn:', r.reason, JSON.stringify(pr)); stuck++; break; }
      }
    }
  } catch (e) { errors++; console.log('Lỗi JS ván', g, e.stack); }
  if (!Array.isArray(viewFor(s, 'p0').acts)) viol.viewNoActs++;
  if (s.phase !== 'ended') { stuck++; console.log('Game không kết thúc', g, s.turnCount, s.log.slice(-10)); }
  else {
    wins[s.winner]++; totalTurns += s.turnCount; maxTurns = Math.max(maxTurns, s.turnCount);
    byN[n] = byN[n] || { law: 0, outlaw: 0, renegade: 0, games: 0 }; byN[n][s.winner]++; byN[n].games++;
  }
  // kiểm tra bảo toàn số lá
  const total = s.deck.length + s.discard.length + s.players.reduce((a, p) => a + p.hand.length + p.table.length, 0) + s.pending.reduce((a, pr) => a + (pr.cards ? pr.cards.length : 0), 0);
  if (total !== 80) { errors++; console.log('Mất bài! tổng =', total, 'game', g); }
}
const pct = (x, t) => (100 * x / Math.max(1, t)).toFixed(1) + '%';
const done = wins.law + wins.outlaw + wins.renegade;
console.log(`\n=== BANG! sim: ${GAMES} ván bot ===`);
console.log(`Phe Cảnh sát: ${pct(wins.law, done)} · Tội phạm: ${pct(wins.outlaw, done)} · Kẻ hai mặt: ${pct(wins.renegade, done)}`);
for (const n of Object.keys(byN)) { const b = byN[n]; console.log(`  ${n} người (${b.games} ván): Cảnh sát ${pct(b.law, b.games)} · Tội phạm ${pct(b.outlaw, b.games)} · Kẻ hai mặt ${pct(b.renegade, b.games)}`); }
console.log(`Trung bình ${(totalTurns / Math.max(1, done)).toFixed(1)} lượt/ván, dài nhất ${maxTurns}. Phó bắn người đang bị nghi: ${pct(deputyShotsAtSheriffAttacker, deputyShots)}`);
console.log({ stuck, errors, rejects, viol });
const okRates = wins.law / done >= 0.33 && wins.law / done <= 0.47 && wins.outlaw / done >= 0.38 && wins.outlaw / done <= 0.52 && wins.renegade / done >= 0.04 && wins.renegade / done <= 0.16;
const fail = stuck || errors || viol.deputyShotSheriff || viol.actsMissing || viol.viewNoActs || (GAMES >= 500 && !okRates);
console.log(fail ? '❌ CÓ LỖI / LỆCH CÂN BẰNG' : '✅ OK: 0 kẹt, 0 lỗi, tỉ lệ thắng trong khoảng mục tiêu');
process.exit(fail ? 1 : 0);
