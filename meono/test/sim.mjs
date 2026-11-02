// Mô phỏng bot vs bot: node meono/test/sim.mjs 500
import { createGame, applyAction, resolveWindow, waitingOn, viewFor } from '../js/engine.js';
import { botAction, botNope } from '../js/bot.js';

const N = +process.argv[2] || 400;
for (const expansion of [true, false]) {
  let stuck = 0, errs = 0, steps = 0, maxSteps = 0, nopes = 0, booms = 0, defuses = 0, wins = {};
  for (let g = 0; g < N; g++) {
    const np = 2 + (g % 7);
    const s = createGame(Array.from({ length: np }, (_, i) => ({ id: 'b' + i, name: 'B' + i, isBot: true })), { expansion });
    const total = s.total;
    let k = 0;
    while (s.phase === 'playing' && k < 4000) {
      k++;
      if (s.window) {
        const order = s.players.filter(p => !p.out).sort(() => Math.random() - 0.5);
        const nb = order.find(p => botNope(s, p.id));
        if (nb) { const r = applyAction(s, nb.id, { type: 'nope' }); if (!r.ok) { errs++; console.log('NOPE ERR', r.reason); break; } nopes++; }
        else resolveWindow(s);
      } else {
        const pid = waitingOn(s);
        const a = botAction(s, pid);
        if (!a) { stuck++; console.log('NO ACTION', pid, s.pending); break; }
        const r = applyAction(s, pid, a);
        if (!r.ok) { errs++; if (errs < 6) console.log('ERR', r.reason, a, s.pending); break; }
      }
      for (const p of s.players) viewFor(s, p.id); // view không được lỗi
      const cnt = s.deck.length + s.discard.length + s.players.reduce((t, p) => t + p.hand.length, 0) + (s.pending && s.pending.bomb ? 1 : 0);
      if (cnt !== total) { console.log('CARD COUNT', cnt, total); errs++; break; }
      const bombs = s.deck.filter(c => c.t === 'bomb').length + (s.pending && s.pending.bomb ? 1 : 0);
      if (s.phase === 'playing' && bombs !== s.players.filter(p => !p.out).length - 1) { console.log('BOMB COUNT', bombs); errs++; break; }
    }
    if (s.phase === 'playing') stuck++;
    steps += k; maxSteps = Math.max(maxSteps, k);
    booms += s.ev.filter(e => e.k === 'boom').length;
    defuses += s.log.filter(l => l.includes('gỡ bom')).length;
    if (s.winner) wins[np] = (wins[np] || 0) + 1;
  }
  console.log(expansion ? 'Có Cải Mệnh/Móc Đáy' : 'Bản cơ bản', { games: N, stuck, errs, avgSteps: Math.round(steps / N), maxSteps, nopes, defuses });
}
