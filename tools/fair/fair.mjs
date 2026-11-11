// ⚖️ Kiểm tra công bằng: cho các bot GIỐNG HỆT NHAU chơi với nhau hàng nghìn ván, xem có ghế nào được lợi không.
// Nếu chia bài / xúc xắc công bằng và bot không "nhìn trộm" thì mỗi ghế phải thắng xấp xỉ như nhau (ghế 0 = chỗ người thật hay ngồi).
// Chạy: node tools/fair/fair.mjs [số ván, mặc định 1500] [game…]
// Cột "lệch": độ lệch lớn nhất so với kỳ vọng, tính theo số lần sai số chuẩn (z). |z| < 3 là bình thường, do ngẫu nhiên.
const N = +process.argv[2] || 1500, want = process.argv.slice(3);
const R = new URL('../../', import.meta.url).href;
const bots = n => Array.from({ length: n }, (_, i) => ({ id: 'b' + i, name: 'B' + i, isBot: true }));
const rows = [];
function report(game, note, wins, total, extra = '') {
  const n = wins.length, exp = total / n, sd = Math.sqrt(total * (1 / n) * (1 - 1 / n));
  const z = wins.map(w => (w - exp) / sd), worst = z.reduce((a, b) => Math.abs(b) > Math.abs(a) ? b : a, 0);
  rows.push({ game, note, 'ghế 0 (người)': (wins[0] / total * 100).toFixed(1) + '%', 'kỳ vọng': (100 / n).toFixed(1) + '%', 'các ghế': wins.map(w => (w / total * 100).toFixed(1)).join(' / '), 'lệch (z)': worst.toFixed(2), 'kết luận': Math.abs(worst) < 3 ? '✅ công bằng' : '⚠️ xem lại', extra });
}
const run = async (g, fn) => { if (want.length && !want.includes(g)) return; try { await fn(); } catch (e) { rows.push({ game: g, note: 'LỖI: ' + e.message.split('\n')[0] }); } };

await run('uno', async () => {
  const E = await import(R + 'uno/js/engine.js'), B = await import(R + 'uno/js/bot.js');
  for (const np of [2, 4]) { const wins = Array(np).fill(0); let tot = 0;
    for (let g = 0; g < N; g++) { const s = E.createGame(bots(np), 'classic', {}); let k = 0;
      while (s.phase === 'playing' && k++ < 5000) { const pid = s.owe ? s.owe.player : s.pending ? s.pending.player : E.current(s).id; const a = B.botAction(s, pid); if (!a || !E.applyAction(s, pid, a).ok) break; }
      if (s.winner) { wins[+s.winner.slice(1)]++; tot++; } }
    report('UNÔ', np + ' người', wins, tot); }
});
await run('meono', async () => {
  const E = await import(R + 'meono/js/engine.js'), B = await import(R + 'meono/js/bot.js');
  const np = 4, wins = Array(np).fill(0); let tot = 0;
  for (let g = 0; g < N; g++) { const s = E.createGame(bots(np), {}); let k = 0;
    while (s.phase === 'playing' && k++ < 4000) { if (s.window) { const nb = s.players.find(p => !p.out && B.botNope(s, p.id)); if (nb) { if (!E.applyAction(s, nb.id, { type: 'nope' }).ok) break; } else E.resolveWindow(s); continue; }
      const pid = E.waitingOn(s), a = B.botAction(s, pid); if (!a || !E.applyAction(s, pid, a).ok) break; }
    if (s.winner) { wins[+s.winner.slice(1)]++; tot++; } }
  report('Mèo Nổ', np + ' người', wins, tot);
});
await run('tienlen', async () => {
  const E = await import(R + 'tienlen/js/engine.js'), B = await import(R + 'tienlen/js/bot.js');
  const np = 4, wins = Array(np).fill(0); let tot = 0, starter = null;
  for (let g = 0; g < N; g++) { const s = E.createGame(bots(np), { ...E.DEFAULT_OPTS, starter, firstGame: g === 0 }); let k = 0;
    while (s.phase === 'playing' && k++ < 2000) { const c = E.current(s), a = B.botAction(s, c.id, 'normal'); if (!a || !E.applyAction(s, c.id, a).ok) break; }
    if (s.winner) { wins[+s.winner.slice(1)]++; tot++; starter = s.winner; } }
  report('Tiến Lên', np + ' người, bot "vừa"', wins, tot, 'người thắng ván trước được đi trước');
});
await run('cangua', async () => {
  const E = await import(R + 'cangua/js/engine.js'), B = await import(R + 'cangua/js/bot.js');
  const np = 4, wins = Array(np).fill(0), dice = Array(7).fill(0); let tot = 0, rolls = 0; const M = Math.min(N, 400);
  for (let g = 0; g < M; g++) { const s = E.createGame(bots(np), {}); let k = 0;
    while (s.phase === 'playing' && k++ < 20000) { const pid = E.actorOf(s), a = B.botAction(s, pid, 'normal'); if (!a || !E.applyAction(s, pid, a).ok) break; if (a.type === 'roll') for (const d of s.dice || []) { dice[d]++; rolls++; } }
    if (s.winner) { wins[+String(s.winner).slice(1)]++; tot++; } }
  report('Cờ cá ngựa', np + ' người', wins, tot, 'xúc xắc 1–6: ' + dice.slice(1).map(d => (d / rolls * 100).toFixed(1)).join(' / ') + '% (chuẩn 16,7%)');
});
await run('camel', async () => {
  const E = await import(R + 'camel/js/engine.js'), B = await import(R + 'camel/js/bot.js');
  const np = 4, wins = Array(np).fill(0); let tot = 0; const M = Math.min(N, 300);
  for (let g = 0; g < M; g++) { const st = E.createGame(bots(np), {}); let k = 0;
    while (st.phase === 'playing' && k++ < 400) { const pid = st.players[st.turn].id, a = B.botAction(st, pid, { fast: true }); if (!a || !E.applyAction(st, pid, a).ok) break; }
    const w = st.result && st.result.winners; if (w && w.length) { w.forEach(id => { wins[+id.slice(1)] += 1 / w.length; }); tot++; } }
  report('Đua Lạc Đà', np + ' người', wins.map(x => Math.round(x)), tot);
});
// game cược chip: so số chip lời/lỗ trung bình mỗi ván của từng ghế
function chipReport(game, note, delta, hands, extra = '') {
  rows.push({ game, note, 'ghế 0 (người)': (delta[0] / hands).toFixed(2) + ' chip/ván', 'kỳ vọng': '≈ 0', 'các ghế': delta.map(d => (d / hands).toFixed(2)).join(' / '), 'lệch (z)': '', 'kết luận': '', extra });
}
await run('poker', async () => {
  const E = await import(R + 'poker/js/engine.js'), B = await import(R + 'poker/js/bot.js');
  const np = 4, wins = Array(np).fill(0); let tot = 0; const M = Math.min(N, 600);
  for (let g = 0; g < M; g++) { const s = E.createGame(bots(np), { mode: 'cash' });
    for (let h = 0; h < 4; h++) { let k = 0; while (s.phase === 'playing' && k++ < 400) { const p = s.players[s.turn]; if (!p) break; const a = B.botAction(s, p.id); if (!a || !E.applyAction(s, p.id, a).ok) break; }
      const won = s.result && s.result.won; if (won) { const ids = Object.keys(won).filter(id => won[id] > 0); ids.forEach(id => { wins[+id.slice(1)] += 1 / ids.length; }); tot++; }
      for (const p of s.players) if (p.busted) E.applyAction(s, p.id, { type: 'rebuy' }); if (!E.nextHand(s)) break; } }
  report('Poker', np + ' người, số ván thắng pot', wins.map(x => Math.round(x)), tot);
});
for (const [g, name] of [['xidach', 'Xì dách'], ['bacao', 'Ba Cào']]) await run(g, async () => {
  const E = await import(R + g + '/js/engine.js'), B = await import(R + g + '/js/bot.js');
  const np = 4, delta = Array(np).fill(0), caiD = [0, 0], M = Math.min(N, 800); let hands = 0;
  for (let i = 0; i < M; i++) { const s = E.createGame(bots(np), {});
    for (let r = 0; r < 4; r++) { const before = s.players.map(p => p.chips + 0); let k = 0;
      while (s.phase !== 'end' && k++ < 400) { const w = E.waitingOn(s); if (!w.length) break; const pid = w[Math.floor(Math.random() * w.length)], a = B.botAction(s, pid); if (!a || !E.applyAction(s, pid, a).ok) break; }
      if (s.phase !== 'end') break;
      s.players.forEach((p, j) => { const d = p.res ? p.res.delta : p.chips - before[j]; delta[j] += d; if (s.caiId) { if (p.id === s.caiId) { caiD[0] += d; caiD[1]++; } } }); hands++;
      if (!E.nextRound(s)) break; } }
  chipReport(name, np + ' người', delta, hands, caiD[1] ? `nhà cái lời TB ${(caiD[0] / caiD[1]).toFixed(2)} chip/ván (lợi thế cái là luật của game, cái xoay vòng)` : '');
});
console.table(rows);
console.log(`\nMỗi dòng: ${N} ván (game dài thì ít hơn). Bot giống hệt nhau nên ghế nào cũng phải thắng xấp xỉ nhau.`);
