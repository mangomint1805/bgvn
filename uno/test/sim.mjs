import { createGame, applyAction, current, MODES, newMatch, recordRound, cardPoints } from '../js/engine.js';
import { botAction, botCatch } from '../js/bot.js';

const N = +process.argv[2] || 300;
let fxBad = 0, fxSeen = {};
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
      for (const e of s.fx) { fxSeen[e.k] = (fxSeen[e.k] || 0) + 1; if (!s.players.some(q => q.id === e.from) || !s.players.some(q => q.id === e.to) || e.from === e.to) fxBad++; }
      k++;
    }
    if (s.phase === 'playing') stuck++;
    turns += k; maxTurns = Math.max(maxTurns, k);
    elim += s.players.filter(p => p.out).length;
  }
  console.log(mode, extras ? '+mở rộng' : '', { games: N, stuck, errs, avgActions: Math.round(turns / N), maxTurns, elim });
}

// ---------- sự kiện "ai chơi ai" ----------
console.log('fx events (đếm theo lượt quét):', Object.keys(fxSeen).sort().join(','), 'fxBad', fxBad);
if (fxBad) { console.log('LỖI: sự kiện fx sai người'); process.exitCode = 1; }

// ---------- tính điểm nhiều ván ----------
const eq = (a, b, m) => { if (a !== b) { console.log('LỖI điểm:', m, a, '!==', b); process.exitCode = 1; } };
eq(cardPoints({ type: 'n', num: 7, color: 'R' }), 7, 'lá số');
eq(cardPoints({ type: 'skip', color: 'R' }), 20, 'khoá mõm');
eq(cardPoints({ type: 'd2', color: 'R' }), 20, '+2');
eq(cardPoints({ type: 'wd4', color: 'W' }), 50, 'đổi màu +4');
eq(cardPoints({ type: 'nou', color: 'R' }), 50, 'No U (mở rộng)');
eq(cardPoints({ type: 'd4', color: 'R' }), 50, '+4 có màu');
{
  const m = newMatch(true, 200);
  const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }], 'classic');
  s.phase = 'ended'; s.winner = 'a'; s.players[0].hand = [];
  s.players[1].hand = [{ type: 'n', num: 9, color: 'R' }, { type: 'skip', color: 'G' }];
  s.players[2].hand = [{ type: 'wild', color: 'W' }];
  const r = recordRound(m, s); eq(r.gained, 79, 'cộng điểm ván'); eq(m.scores.a, 79, 'tổng A');
  eq(recordRound(m, s), null, 'không cộng 2 lần'); eq(m.scores.a, 79, 'tổng A sau gọi lại'); eq(m.round, 1, 'số ván');
  eq(m.champion, null, 'chưa vô địch');
  const s2 = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }], 'classic');
  s2.phase = 'ended'; s2.winner = 'a'; s2.players[0].hand = []; s2.players[1].hand = [{ type: 'wd4', color: 'W' }, { type: 'wd4', color: 'W' }, { type: 'n', num: 3, color: 'Y' }]; s2.players[2].hand = [];
  recordRound(m, s2); eq(m.scores.a, 182, 'tổng A ván 2'); eq(m.champion, null, 'chưa đủ 200');
  const s3 = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }], 'classic');
  s3.phase = 'ended'; s3.winner = 'a'; s3.players[1].hand = [{ type: 'n', num: 5, color: 'B' }, { type: 'rev', color: 'B' }];
  recordRound(m, s3); eq(m.scores.a >= 200, true, 'đạt mục tiêu'); eq(m.champion, 'a', 'vô địch chung cuộc');
  eq(recordRound(newMatch(false), s3), null, 'tắt tính điểm thì không cộng');
  // JSON hoá được (lưu snapshot)
  eq(JSON.stringify(JSON.parse(JSON.stringify(m))), JSON.stringify(m), 'match JSON');
  // ván thật bằng bot: điểm = tổng điểm bài còn lại của người thua
  const m2 = newMatch(true, 500);
  for (let g = 0; g < 30 && !m2.champion; g++) {
    const s = createGame([{ id: 'x', name: 'X' }, { id: 'y', name: 'Y' }, { id: 'z', name: 'Z' }], 'house');
    let k = 0; while (s.phase === 'playing' && k++ < 5000) { const pid = s.owe ? s.owe.player : s.pending ? s.pending.player : current(s).id; applyAction(s, pid, botAction(s, pid)); }
    const want = s.players.filter(p => p.id !== s.winner).reduce((t, p) => t + p.hand.reduce((u, c) => u + cardPoints(c), 0), 0);
    const r = recordRound(m2, s); eq(r.gained, want, 'điểm ván bot');
  }
  console.log('tính điểm: OK', process.exitCode ? '(có lỗi)' : '', 'giải bot:', m2.round, 'ván, vô địch:', m2.champion, m2.scores);
}
