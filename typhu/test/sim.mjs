import { createGame, applyAction, cur } from '../js/engine.js';
import { botAction } from '../js/bot.js';
const G = +process.argv[2] || 500;
const stats = { stuck: 0, errs: 0, actions: 0, rounds: 0, reasons: {}, max: 0, neg: 0 };
for (let g = 0; g < G; g++) {
  const np = 2 + (g % 3);
  const s = createGame(Array.from({ length: np }, (_, i) => ({ id: 'b' + i, name: 'B' + i, isBot: true })), { maxRounds: g % 5 === 0 ? 30 : 0 });
  let k = 0;
  while (s.phase === 'playing' && k < 6000) {
    const pid = s.pending ? s.pending.player : cur(s).id;
    const a = botAction(s, pid); if (!a) { stats.stuck++; break; }
    const r = applyAction(s, pid, a); if (!r.ok) { stats.errs++; if (stats.errs < 5) console.log('ERR', r.reason, a, s.stage, s.pending); break; }
    if (s.players.some(p => p.cash < 0)) stats.neg++;
    k++;
  }
  if (s.phase === 'playing') stats.stuck++;
  stats.actions += k; stats.rounds += s.round; stats.max = Math.max(stats.max, s.round);
  stats.reasons[s.winReason] = (stats.reasons[s.winReason] || 0) + 1;
}
console.log({ ...stats, avgActions: Math.round(stats.actions / G), avgRounds: Math.round(stats.rounds / G) });
