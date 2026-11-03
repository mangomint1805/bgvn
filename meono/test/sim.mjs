// Mô phỏng bot vs bot: node meono/test/sim.mjs 500
// Chạy cả bộ thường lẫn bộ 🌀 Hỗn loạn (có/không bản mở rộng), kiểm tra số lá, số bom, thống kê & huy hiệu cuối ván.
import { createGame, applyAction, resolveWindow, waitingOn, viewFor, deckPlan, awards } from '../js/engine.js';
import { botAction, botNope } from '../js/bot.js';

const N = +process.argv[2] || 400;
let fails = 0;
const check = (ok, ...msg) => { if (!ok) { fails++; if (fails < 12) console.log('FAIL', ...msg); } };

// bộ hỗn loạn phải thật sự "hỗn loạn" hơn bộ thường và vẫn đủ Gỡ Bom
for (let n = 2; n <= 8; n++) for (const expansion of [true, false]) {
  const a = deckPlan(n, { expansion }), b = deckPlan(n, { expansion, chaos: true });
  check(b.attack > a.attack && b.nope > a.nope && b.shuffle >= a.shuffle, 'chaos deck', n, a, b);
  if (expansion) check(b.bottom > a.bottom, 'chaos bottom', n);
  check(b.defuse === a.defuse + 1 && b.bomb === n - 1, 'chaos defuse/bomb', n, b);
  const pool = Object.entries(b).filter(([t]) => t !== 'bomb' && t !== 'defuse').reduce((t, [, c]) => t + c, 0);
  check(pool >= 7 * n + 4, 'chaos deck too small', n, pool);
}

for (const chaos of [false, true]) for (const expansion of [true, false]) {
  let stuck = 0, errs = 0, steps = 0, maxSteps = 0, nopes = 0, booms = 0, defuses = 0, draws = 0, attacks = 0, maxTurns = 0;
  const badgeSeen = {};
  for (let g = 0; g < N; g++) {
    const np = 2 + (g % 7);
    const s = createGame(Array.from({ length: np }, (_, i) => ({ id: 'b' + i, name: 'B' + i, isBot: true })), { expansion, chaos });
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
      maxTurns = Math.max(maxTurns, s.turnsLeft);
      for (const p of s.players) viewFor(s, p.id); // view không được lỗi
      const cnt = s.deck.length + s.discard.length + s.players.reduce((t, p) => t + p.hand.length, 0) + (s.pending && s.pending.bomb ? 1 : 0);
      if (cnt !== total) { console.log('CARD COUNT', cnt, total); errs++; break; }
      const bombs = s.deck.filter(c => c.t === 'bomb').length + (s.pending && s.pending.bomb ? 1 : 0);
      if (s.phase === 'playing' && bombs !== s.players.filter(p => !p.out).length - 1) { console.log('BOMB COUNT', bombs); errs++; break; }
    }
    if (s.phase === 'playing') stuck++;
    steps += k; maxSteps = Math.max(maxSteps, k);
    // thống kê phải khớp với diễn biến ván
    const S = Object.values(s.stats), sum = key => S.reduce((t, x) => t + x[key], 0);
    check(S.length === np, 'stats size');
    check(sum('boom') === np - 1, 'boom count', sum('boom'), np);
    check(sum('bombs') === sum('defused') + sum('boom'), 'bombs = defused + boom', sum('bombs'), sum('defused'), sum('boom'));
    check(sum('nopes') === sum('noped'), 'nopes = noped');
    check(sum('steals') === sum('stolen'), 'steals = stolen');
    check(sum('draws') >= sum('bombs'), 'draws >= bombs');
    for (const p of s.players) if (p.out) check(s.stats[p.id].outAt > 0, 'outAt');
    const v = viewFor(s, 'b0'); check(v.stats && Object.keys(v.stats).length === np, 'view stats');
    const aw = awards(v);
    for (const a of aw) { check(a.ids.length && a.ids.every(id => s.players.some(p => p.id === id)), 'award ids', a); badgeSeen[a.k] = (badgeSeen[a.k] || 0) + 1; }
    booms += sum('boom'); defuses += sum('defused'); draws += sum('draws'); attacks += sum('attacks');
  }
  console.log(`${chaos ? '🌀 Hỗn loạn' : 'Bộ thường'} · ${expansion ? 'có Cải Mệnh/Móc Đáy' : 'bản cơ bản'}`, { games: N, stuck, errs, avgSteps: Math.round(steps / N), maxSteps, nopes, attacks, defuses, avgDraws: +(draws / N).toFixed(1), maxTurnsStack: maxTurns });
  console.log('   huy hiệu:', Object.entries(badgeSeen).map(([k, c]) => `${k}:${c}`).join(' '));
  if (stuck || errs) fails++;
}
// state cũ (trước khi có thống kê) vẫn chơi tiếp được
{
  const s = createGame([{ id: 'a', name: 'A', isBot: true }, { id: 'b', name: 'B', isBot: true }], {});
  delete s.stats;
  let k = 0; while (s.phase === 'playing' && k++ < 3000) { if (s.window) { resolveWindow(s); continue; } const pid = waitingOn(s); const r = applyAction(s, pid, botAction(s, pid)); if (!r.ok) { check(false, 'old state', r.reason); break; } }
  check(s.phase === 'ended' && s.stats && awards(viewFor(s, 'a')).length >= 0, 'old state ended');
}
console.log(fails ? `❌ ${fails} lỗi` : '✅ Tất cả kiểm tra đều qua');
process.exitCode = fails ? 1 : 0;
