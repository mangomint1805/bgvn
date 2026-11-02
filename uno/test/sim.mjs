import { createGame, applyAction, current, MODES } from '../js/engine.js';
import { botAction, botCatch } from '../js/bot.js';

const N = +process.argv[2] || 300;
for (const extras of [false, true]) for (const mode of Object.keys(MODES)) {
  let stuck = 0, errs = 0, turns = 0, elim = 0, maxTurns = 0;
  for (let g = 0; g < N; g++) {
    const np = 2 + (g % 7);
    const s = createGame(Array.from({ length: np }, (_, i) => ({ id: 'b' + i, name: 'B' + i, isBot: true })), mode, { extras });
    let k = 0;
    while (s.phase === 'playing' && k < 5000) {
      const pid = s.owe ? s.owe.player : s.pending ? s.pending.player : current(s).id;
      if (Math.random() < 0.3) for (const q of s.players) { const c = botCatch(s, q.id); if (c) { applyAction(s, q.id, c); break; } }
      if (s.phase !== 'playing') break;
      const a = botAction(s, pid);
      if (!a) { stuck++; break; }
      const r = applyAction(s, pid, a);
      if (!r.ok) { errs++; if (errs < 5) console.log(mode, 'ERR', r.reason, a, s.stack, s.skipStack, s.mustPlay); break; }
      // kiểm tra bảo toàn số lá
      const total = s.deck.length + s.discard.length + s.players.reduce((t, p) => t + p.hand.length, 0);
      const want = s.deckTotal;
      if (total !== want) { console.log(mode, 'CARD COUNT', total); errs++; break; }
      k++;
    }
    if (s.phase === 'playing') stuck++;
    turns += k; maxTurns = Math.max(maxTurns, k);
    elim += s.players.filter(p => p.out).length;
  }
  console.log(mode, extras ? '+mở rộng' : '', { games: N, stuck, errs, avgActions: Math.round(turns / N), maxTurns, elim });
}
