// Mô phỏng bot vs bot: node catte/test/sim.mjs 500
// Mỗi trận chơi nhiều ván liên tiếp (chip mang sang ván sau), đủ mọi số người 2–6 và các tuỳ chọn luật.
// Kiểm tra: 0 kẹt, 0 lỗi, tổng chip bảo toàn (= chip ban đầu + chip mẹ cho), mỗi ván đúng 6 lá/người, không lá trùng.
import { createGame, applyAction, waitingOn, nextHand, viewFor, legalMoves, chipTotal, DEFAULT_OPTS } from '../js/engine.js';
import { botAction } from '../js/bot.js';

const N = +process.argv[2] || 300;
let fails = 0;
const check = (ok, ...m) => { if (!ok) { fails++; if (fails < 15) console.log('FAIL', ...m); } };
const VARIANTS = [
  {}, { showdown: 'ngua' }, { bWhite: true, bSweep: true, bLow: true, thoiAt: true, ante: 200, startChips: 500 },
  { wQuads: false, wFlush: false, wSmall: false, showdown: 'ngua', ante: 10 }, { ante: 100, bLow: true },
];
for (const vo of VARIANTS) {
  let stuck = 0, errs = 0, hands = 0, how = {}, deadN = 0, wins = {}, refills = 0, maxSteps = 0, survivors = 0, botFirstWins = 0;
  for (let g = 0; g < N; g++) {
    const np = 2 + (g % 5);
    const s = createGame(Array.from({ length: np }, (_, i) => ({ id: 'b' + i, name: 'B' + i, isBot: true })), vo);
    const HANDS = 6;
    for (let h = 0; h < HANDS; h++) {
      // bài chia đúng
      const all = s.players.flatMap(p => p.hand.map(c => c.id));
      if (s.phase === 'play') { check(new Set(all).size === all.length && all.length === np * 6, 'deal', all.length); }
      let k = 0;
      while ((s.phase === 'play' || s.phase === 'chung') && k < 200) {
        k++;
        const ws = waitingOn(s);
        if (!ws.length) { stuck++; console.log('NO WAIT', s.phase); break; }
        const pid = ws[Math.floor(Math.random() * ws.length)];
        // góc nhìn phải ẩn bài người khác
        const v = viewFor(s, pid);
        check(v.players.every(p => p.id === pid || !p.hand.length), 'leak hand');
        const a = botAction(s, pid);
        if (!a) { stuck++; console.log('NO ACTION', pid, s.phase); break; }
        check(legalMoves(s, pid).some(m => m.card === a.card && (m.down === !!a.down || s.phase === 'chung' || s.trickNo > 4)), 'bot illegal', a);
        const r = applyAction(s, pid, a);
        if (!r.ok) { errs++; if (errs < 6) console.log('ERR', r.reason, a); break; }
        check(chipTotal(s) === s.startTotal + s.minted, 'chips mid', chipTotal(s), s.startTotal + s.minted);
      }
      maxSteps = Math.max(maxSteps, k);
      if (s.phase !== 'handEnd') { stuck++; break; }
      hands++;
      const R = s.result; how[R.how] = (how[R.how] || 0) + 1;
      deadN += s.players.filter(p => p.out).length;
      survivors += s.players.filter(p => p.inHand && !p.out).length;
      check(chipTotal(s) === s.startTotal + s.minted, 'chips end', chipTotal(s), s.startTotal + s.minted);
      check(s.pot === 0, 'pot left');
      check(s.players.every(p => p.chips >= 0), 'negative chips');
      const sumD = Object.values(R.deltas).reduce((a, b) => a + b, 0);
      check(sumD === 0, 'deltas sum', sumD);
      if (R.how === 'toi') {
        const w = s.players.find(p => p.id === R.winner);
        check(!w.out && w.won >= 2, 'toi winner must survive & win ≥2 tricks', w.won);
        check(s.history.length === 6, 'six tricks', s.history.length);
        check(s.players.every(p => !p.inHand || p.out || p.hand.length === 0), 'cards left after toi');
      }
      if (R.how === 'sweep') check(s.players.filter(p => !p.out).length === 1 && s.history.length === 4, 'sweep');
      for (const p of s.players) if (p.out) check(p.won === 0 && p.hand.length === 2, 'dead player state', p.won, p.hand.length);
      wins[R.winner] = (wins[R.winner] || 0) + 1;
      refills += s.ev.filter(e => e.k === 'refill').length;
      if (h < HANDS - 1) {
        const lw = s.lastWinner;
        check(nextHand(s, s.players.map(p => ({ id: p.id, name: p.name, isBot: true }))), 'nextHand');
        check(s.phase === 'handEnd' || s.leader === lw, 'winner leads next hand');
      }
    }
  }
  console.log(JSON.stringify(vo), { matches: N, hands, stuck, errs, how, deadPerHand: +(deadN / hands).toFixed(2), survivorsPerHand: +(survivors / hands).toFixed(2), maxSteps });
  if (stuck || errs) fails++;
}
// bot thông minh hơn bot ngẫu nhiên? (bot 0 = bot xịn, còn lại đánh ngẫu nhiên hợp lệ)
{
  let smart = 0, games = 0;
  for (let g = 0; g < N * 2; g++) {
    const np = 2 + (g % 5);
    const s = createGame(Array.from({ length: np }, (_, i) => ({ id: 'b' + i, name: 'B' + i, isBot: true })), { wQuads: false, wFlush: false, wSmall: false });
    let k = 0;
    while ((s.phase === 'play' || s.phase === 'chung') && k++ < 200) {
      const pid = waitingOn(s)[0];
      const a = pid === 'b0' ? botAction(s, pid) : (() => { const m = legalMoves(s, pid); const x = m[Math.floor(Math.random() * m.length)]; return { type: 'play', card: x.card, down: x.down }; })();
      applyAction(s, pid, a);
    }
    games++; if (s.result && s.result.winner === 'b0') smart++;
  }
  const rate = smart / games;
  console.log('Bot xịn thắng', (rate * 100).toFixed(1) + '% số ván (ngẫu nhiên kỳ vọng ~' + (100 * [2, 3, 4, 5, 6].reduce((t, n) => t + 1 / n, 0) / 5).toFixed(1) + '%)');
  check(rate > 0.5, 'bot should beat random players clearly', rate);
}
console.log(fails ? `❌ ${fails} lỗi` : '✅ Sim OK');
process.exitCode = fails ? 1 : 0;
