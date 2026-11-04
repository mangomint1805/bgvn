// Mô phỏng bot vs bot: node camel/test/sim.mjs 300
import { createGame, applyAction, viewFor, RACERS, CRAZY, TRACK } from '../js/engine.js';
import { botAction } from '../js/bot.js';
const N = +process.argv[2] || 200;
let stuck = 0, errors = 0, bad = 0, turns = 0, legs = 0, crazyGames = 0;
const acts = { roll: 0, leg: 0, tile: 0, overall: 0 };
const wins = {}; const t0 = Date.now();
for (let g = 0; g < N; g++) {
  const n = 2 + (g % 7), crazy = g % 3 !== 2; if (crazy) crazyGames++;
  const st = createGame(Array.from({ length: n }, (_, i) => ({ id: 'b' + i, name: 'Bot' + i, isBot: true })), { crazy });
  let k = 0;
  try {
    while (st.phase === 'playing' && k < 400) {
      const pid = st.players[st.turn].id;
      const a = botAction(st, pid, { fast: true });
      const r = applyAction(st, pid, a);
      if (!r.ok) { errors++; console.log('bad action', a, r.reason); break; }
      acts[a.type]++; k++;
      // bất biến
      const flat = st.board.flat();
      const racers = flat.filter(c => RACERS.includes(c)), cr = flat.filter(c => CRAZY.includes(c));
      if (racers.length !== 5 || new Set(racers).size !== 5 || cr.length !== (crazy ? 2 : 0)) { bad++; console.log('camel count', JSON.stringify(st.board)); break; }
      if (st.players.some(p => p.coins < 0 || !Number.isInteger(p.coins))) { bad++; console.log('coins', st.players.map(p => p.coins)); break; }
      if (st.board.slice(TRACK + 1).flat().length && st.phase !== 'ended') { bad++; console.log('finish not ended'); break; }
      if (st.board[0].length) { bad++; console.log('pos 0'); break; }
      if (st.tiles.some(t => st.tiles.some(u => u !== t && Math.abs(u.pos - t.pos) <= 1))) { bad++; console.log('tiles adjacent'); break; }
      if (st.phase === 'playing' && st.rolled.length >= 5) { bad++; console.log('leg not ended'); break; }
      const v = viewFor(st, st.players[0].id);
      if (st.phase === 'playing' && v.winBets.concat(v.loseBets).some(b => b.pid !== v.me && b.camel)) { bad++; console.log('leak'); break; }
      JSON.parse(JSON.stringify(st));
    }
  } catch (e) { errors++; console.log('ERR', e.stack); }
  if (st.phase !== 'ended') { stuck++; console.log('stuck game', g, k); continue; }
  turns += k; legs += st.leg;
  const w = st.result.winners.map(id => st.players.find(p => p.id === id).name).join('+');
  wins[st.result.win] = (wins[st.result.win] || 0) + 1;
}
console.log(`sim: ${N} ván (${crazyGames} có lạc đà xỉn), kẹt ${stuck}, lỗi ${errors}, vi phạm bất biến ${bad}`);
console.log(`trung bình ${(turns / N).toFixed(1)} lượt, ${(legs / N).toFixed(2)} chặng/ván; hành động`, acts, 'màu thắng', wins, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(stuck || errors || bad ? 1 : 0);
