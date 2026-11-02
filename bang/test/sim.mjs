import { createGame, applyAction, topPrompt, current, alivePlayers } from '../js/engine.js';
import { botAction } from '../js/bot.js';

const GAMES = +(process.argv[2] || 300);
const wins = { law: 0, outlaw: 0, renegade: 0 };
let totalTurns = 0, maxTurns = 0, stuck = 0;
const rejects = {};

for (let g = 0; g < GAMES; g++) {
  const n = 4 + (g % 4);
  const players = Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'Bot' + i, isBot: true }));
  const s = createGame(players);
  let steps = 0;
  while (s.phase === 'playing' && steps < 5000) {
    steps++;
    const pr = topPrompt(s);
    const pid = pr ? pr.player : current(s).id;
    const a = botAction(s, pid);
    if (!a) { console.log('Bot không có action!', JSON.stringify(pr), s.step, current(s).id, pid); stuck++; break; }
    const r = applyAction(s, pid, a);
    if (!r.ok) {
      rejects[r.reason] = (rejects[r.reason] || 0) + 1;
      if (a.type !== 'end_turn') { const r2 = applyAction(s, pid, { type: 'end_turn' }); if (!r2.ok) { console.log('Kẹt:', r.reason, a, r2.reason, JSON.stringify(pr)); stuck++; break; } }
      else { console.log('Kẹt end_turn:', r.reason, JSON.stringify(pr)); stuck++; break; }
    }
  }
  if (s.phase !== 'ended') { stuck++; console.log('Game không kết thúc', g, s.turnCount, s.log.slice(-10)); }
  else { wins[s.winner]++; totalTurns += s.turnCount; maxTurns = Math.max(maxTurns, s.turnCount); }
  // kiểm tra bảo toàn số lá
  const total = s.deck.length + s.discard.length + s.players.reduce((a, p) => a + p.hand.length + p.table.length, 0) + s.pending.reduce((a, pr) => a + (pr.cards ? pr.cards.length : 0), 0);
  if (total !== 80) console.log('Mất bài! tổng =', total, 'game', g);
}
console.log({ GAMES, wins, avgTurns: (totalTurns / GAMES).toFixed(1), maxTurns, stuck, rejects });
