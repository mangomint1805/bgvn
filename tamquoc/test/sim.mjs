// Mô phỏng hàng trăm ván toàn bot: đếm ván kẹt/lỗi, kiểm tra bảo toàn bài, thống kê phe thắng.
// Chạy: node tamquoc/test/sim.mjs [số ván=400]
import { createGame, applyAction, top, countCards, DECK_SIZE, viewFor } from '../js/engine.js?v=1';
import { botAction } from '../js/bot.js?v=1';

const GAMES = +(process.argv[2] || 400);
const MAX_STEPS = 40000;
const wins = {}; const byN = {};
let stuck = 0, errors = 0, lost = 0, totalTurns = 0, maxTurns = 0, done = 0;
const rejects = {}; const askTypes = {}; const evc = {}; const genWins = {}; const genGames = {};
for (let g = 0; g < GAMES; g++) {
  const n = 2 + (g % 7);
  const players = Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'Bot' + i, isBot: true }));
  let s;
  try { s = createGame(players); } catch (e) { errors++; console.log('Lỗi tạo ván', e); continue; }
  let steps = 0, fail = false;
  while (s.phase === 'playing' && steps < MAX_STEPS) {
    steps++;
    const t = top(s);
    if (!t || !t.ask) { console.log('Không có ask!', g, t && t.k); fail = true; break; }
    const pids = t.ask.players;
    const pid = pids[Math.floor(Math.random() * pids.length)];
    askTypes[t.ask.type] = (askTypes[t.ask.type] || 0) + 1;
    const a = botAction(s, pid);
    if (!a) { console.log('Bot không có action', t.ask.type, t.k); fail = true; break; }
    let r;
    try { r = applyAction(s, pid, a); } catch (e) { console.log('Exception', e); errors++; fail = true; break; }
    if (!r.ok) {
      const key = t.ask.type + ':' + r.reason; rejects[key] = (rejects[key] || 0) + 1;
      if (/^Lỗi/.test(r.reason)) { errors++; console.log('LỖI engine', r.reason, JSON.stringify(a), t.k, t.stage); fail = true; break; }
      // thử hành động an toàn
      const safe = t.ask.type === 'play' ? { type: 'end' } : { type: 'pass' };
      const r2 = applyAction(s, pid, safe);
      if (!r2.ok) { console.log('Kẹt:', r.reason, JSON.stringify(a), '|', r2.reason, t.ask.type, t.k); fail = true; break; }
    }
    for (const e of s.ev) if (e.n > (s._seen || 0)) { const k = e.t === 'skill' ? 'sk:' + e.sk : e.t === 'use' ? 'use:' + e.as : e.t === 'play' ? 'play:' + e.as + (e.via ? '/' + e.via : '') : e.t; evc[k] = (evc[k] || 0) + 1; }
    s._seen = s.seq;
    if (steps % 50 === 0) { const c = countCards(s); if (c !== DECK_SIZE) { console.log('Mất bài giữa ván!', c, 'game', g, 'step', steps, t.k); lost++; break; } }
    if (steps % 97 === 0) { for (const p of players) JSON.stringify(viewFor(s, p.id)); }
  }
  const c = countCards(s); if (c !== DECK_SIZE) { lost++; console.log('Mất bài cuối ván: tổng =', c, 'game', g); }
  if (s.phase !== 'ended') { stuck++; if (!fail) console.log('Ván không kết thúc', g, 'n=' + n, 'lượt', s.turnCount, s.log.slice(-6)); }
  else {
    done++; wins[s.winner] = (wins[s.winner] || 0) + 1; byN[n] = byN[n] || {}; byN[n][s.winner] = (byN[n][s.winner] || 0) + 1;
    totalTurns += s.turnCount; maxTurns = Math.max(maxTurns, s.turnCount);
    for (const p of s.players) { genGames[p.general] = (genGames[p.general] || 0) + 1; const won = s.winner === 'lord' ? (p.role === 'lord' || p.role === 'loyal') : p.role === s.winner; if (won) genWins[p.general] = (genWins[p.general] || 0) + 1; }
  }
  // JSON round-trip được
  JSON.parse(JSON.stringify(s));
}
const pct = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, (100 * v / done).toFixed(1) + '%']));
console.log({ GAMES, done, stuck, errors, lost, wins: pct(wins), avgTurns: (totalTurns / Math.max(1, done)).toFixed(1), maxTurns });
console.log('Theo số người:', JSON.stringify(byN));
console.log('Sự kiện:', JSON.stringify(Object.fromEntries(Object.entries(evc).sort())));
console.log('Loại hỏi:', JSON.stringify(askTypes));
if (Object.keys(rejects).length) console.log('Bị từ chối:', rejects);
const gw = Object.keys(genGames).map(k => [k, (100 * (genWins[k] || 0) / genGames[k]).toFixed(0) + '%', genGames[k]]).sort((a, b) => parseInt(b[1]) - parseInt(a[1]));
console.log('Tỉ lệ thắng theo tướng:', gw.map(x => x.join(':')).join('  '));
if (stuck || errors || lost) process.exit(1);
