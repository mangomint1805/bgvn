// Mô phỏng bot vs bot: node masoi/test/sim.mjs 600
// Kiểm tra: 0 ván kẹt, 0 lỗi, điều kiện thắng đúng, view không lỗi, luật được giữ (thuốc 1 lần, bảo vệ không 2 đêm liền…)
import { createGame, applyAction, actors, timeout, viewFor, winnerOf, presetRoles, roleList, ROLES, isWolfRole, teamOf, P } from '../js/engine.js?v=2';
import { botAction, botDayPlan, botLine, botWolfLine } from '../js/bot.js?v=2';

const N = +process.argv[2] || 600;
const ALL_SPECIAL = ['alpha', 'cub', 'seer', 'guard', 'witch', 'hunter', 'cupid', 'elder', 'idiot', 'tanner'];
let stuck = 0, errs = 0, games = 0, steps = 0, maxSteps = 0, maxDay = 0;
const wins = {}, causes = {}, feats = { mixedLove: 0, idiot: 0, elderSaved: 0, hunterShot: 0, cubRevenge: 0, tannerWin: 0, revote: 0, poisonHunter: 0 };
const fail = (g, msg, s) => { errs++; if (errs <= 8) console.log('LỖI ván', g, msg, s && { phase: s.phase, step: s.step, day: s.day }); };

function randomRoles(n) {
  const r = { wolf: 1 + Math.floor(Math.random() * Math.max(1, Math.floor((n - 1) / 3))) };
  for (const k of ALL_SPECIAL) if (Math.random() < 0.5) r[k] = 1;
  let wolves = r.wolf + (r.alpha || 0) + (r.cub || 0);
  while (wolves * 2 >= n) { if (r.cub) { delete r.cub; } else if (r.alpha) { delete r.alpha; } else r.wolf--; wolves = r.wolf + (r.alpha || 0) + (r.cub || 0); }
  let total = Object.values(r).reduce((a, b) => a + b, 0);
  for (const k of ALL_SPECIAL) if (total > n && r[k]) { delete r[k]; total--; }
  return r;
}

for (let g = 0; g < N; g++) {
  const n = 5 + (g % 12);
  const custom = g % 3 !== 0;
  const opts = {
    auto: !custom, roles: custom ? randomRoles(n) : presetRoles(n),
    reveal: g % 2 === 0, voteMode: g % 4 < 2 ? 'open' : 'secret', tie: g % 5 < 3 ? 'revote' : 'none', doubleSave: g % 7 < 2 ? 'die' : 'live',
  };
  if (!roleList(n, opts.roles).ok) { fail(g, 'bộ vai sai ' + JSON.stringify(opts.roles)); continue; }
  const s = createGame(Array.from({ length: n }, (_, i) => ({ id: 'b' + i, name: 'Bot' + i, isBot: true })), opts);
  games++;
  let k = 0, lastPk = -1, saveUsed = 0, poisonUsed = 0, lastGuardNight = {};
  const afk = g % 6 === 5; // ván "người thật bỏ máy": hay để hết giờ
  try {
    while (s.phase !== 'ended' && k < 6000) {
      k++;
      if (s.pk !== lastPk) {
        lastPk = s.pk;
        if ((s.phase === 'day' || (s.phase === 'night' && s.step === s.steps[0])) && winnerOf(s)) { fail(g, 'đáng lẽ đã kết thúc: ' + JSON.stringify(winnerOf(s)), s); break; }
        if (s.phase === 'day') { // bot thảo luận
          for (const p of s.players.filter(p => p.alive)) for (const a of botDayPlan(s, p.id)) { const r = applyAction(s, p.id, a); if (!r.ok && a.type !== 'claim') { fail(g, 'dayplan ' + r.reason + JSON.stringify(a), s); } }
          for (const p of s.players.filter(p => p.alive)) botLine(s, p);
        }
        if (s.phase === 'night' && (s.step === 'wolves' || s.step === 'wolves2')) for (const p of s.players.filter(p => p.alive && isWolfRole(p.role))) { const r = applyAction(s, p.id, { type: 'chat', ch: 'wolf', text: botWolfLine(s, p) }); if (!r.ok) fail(g, 'wolf chat ' + r.reason, s); }
        if (s.phase === 'vote' && s.vote.round === 2) feats.revote++;
      }
      const acts = actors(s);
      if (!acts.length || (afk && Math.random() < 0.15)) { timeout(s); continue; }
      const pid = acts[Math.floor(Math.random() * acts.length)];
      const p = P(s, pid);
      if (s.phase !== 'last' && s.phase !== 'hunter' && !p.alive) { fail(g, 'người chết phải hành động ' + pid, s); break; }
      const a = botAction(s, pid);
      if (!a) { stuck++; console.log('KHÔNG CÓ HÀNH ĐỘNG', s.phase, s.step, pid); break; }
      const before = { ...s.potions };
      if (a.type === 'guard') { if (a.target === s.lastGuard) { fail(g, 'bảo vệ 2 đêm liền', s); break; } }
      const r = applyAction(s, pid, a);
      if (!r.ok) { fail(g, r.reason + ' ' + JSON.stringify(a), s); break; }
      if (before.save && !s.potions.save) saveUsed++;
      if (before.poison && !s.potions.poison) poisonUsed++;
      for (const q of s.players) viewFor(s, q.id);
    }
  } catch (e) { fail(g, 'EXCEPTION ' + e.stack, s); continue; }
  if (s.phase !== 'ended') { stuck++; console.log('KẸT ván', g, s.phase, s.step, s.day); continue; }
  if (saveUsed > 1 || poisonUsed > 1) fail(g, 'thuốc dùng 2 lần');
  // kiểm tra điều kiện thắng
  const w = s.winner, al = s.players.filter(p => p.alive);
  const wolvesAlive = al.filter(p => isWolfRole(p.role)).length;
  if (w.team === 'village' && wolvesAlive) fail(g, 'dân thắng mà còn sói', s);
  if (w.team === 'wolf') { const wt = al.filter(p => teamOf(s, p) === 'wolf').length; if (wt < al.length - wt || !wt) fail(g, 'sói thắng sai', s); }
  if (w.team === 'lovers' && !(al.length === 2 && al.every(p => p.lover) && s.mixedLove)) fail(g, 'cặp đôi thắng sai', s);
  if (w.team === 'tanner') { const t = P(s, w.ids[0]); if (t.role !== 'tanner' || t.cause !== 'hang') fail(g, 'chán đời thắng sai', s); feats.tannerWin++; }
  // người yêu: một chết thì cả hai chết
  if (s.lovers) { const [a, b] = s.lovers.map(id => P(s, id)); if (a.alive !== b.alive) fail(g, 'cặp đôi lệch sống/chết', s); if (s.mixedLove) feats.mixedLove++; }
  for (const p of s.players) { if (!p.alive) causes[p.cause] = (causes[p.cause] || 0) + 1; if (p.role === 'hunter' && p.cause === 'poison') feats.poisonHunter++; if (p.idiotOut) feats.idiot++; if (p.role === 'elder' && p.elderHit) feats.elderSaved++; }
  if (s.ev.some(e => e.k === 'shot')) feats.hunterShot++;
  if (s.log.some(l => /Sói Con|cắn thêm/.test(l.txt)) || s.steps.includes('wolves2')) feats.cubRevenge++;
  if (w.team !== 'draw') { const ids = new Set(w.ids); for (const p of s.players) if (ids.has(p.id) !== (w.team === 'lovers' ? s.lovers.includes(p.id) : w.team === 'tanner' ? p.id === w.ids[0] : teamOf(s, p) === w.team)) { fail(g, 'danh sách người thắng sai', s); break; } }
  wins[w.team] = (wins[w.team] || 0) + 1;
  steps += k; maxSteps = Math.max(maxSteps, k); maxDay = Math.max(maxDay, s.day);
}
console.log({ games, stuck, errs, avgSteps: Math.round(steps / games), maxSteps, maxDay });
console.log('Thắng:', wins);
console.log('Cách chết:', causes);
console.log('Tình huống đặc biệt:', feats);
if (stuck || errs) process.exit(1);
