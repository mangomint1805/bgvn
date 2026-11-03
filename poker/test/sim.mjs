// Mô phỏng hàng trăm ván bot: 0 kẹt, 0 lỗi, bảo toàn chip, không lộ bài.
// Chạy: node poker/test/sim.mjs [số bàn]
import { createGame, applyAction, nextHand, viewFor, chipsOnTable, legal, setRandom } from '../js/engine.js?v=1';
import { botAction } from '../js/bot.js?v=1';

const TABLES = +process.argv[2] || 60;
let seed = 2024; setRandom(() => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648));
let hands = 0, actions = 0, stuck = 0, errs = 0, chipBad = 0, leak = 0, showdowns = 0, sidePots = 0, splits = 0, rebuys = 0, champs = 0, folds = 0;
const acts = {}; const t0 = Date.now();
for (let t = 0; t < TABLES; t++) {
  const np = 2 + (t % 8); // 2–9 người
  const mode = t % 3 === 2 ? 'tourn' : 'cash';
  const opts = { chips: [500, 1000, 2000][t % 3], bb: [10, 20, 50][t % 3 === 0 ? 1 : t % 3], blindUp: mode === 'tourn' ? 5 : t % 2 ? 10 : 0, mode };
  const s = createGame(Array.from({ length: np }, (_, i) => ({ id: 'b' + i, name: 'Bot' + i, isBot: true })), opts);
  const maxHands = mode === 'tourn' ? 400 : 25;
  let h = 0;
  while (h < maxHands) {
    let k = 0;
    while (s.phase === 'playing' && k < 400) {
      const p = s.players[s.turn];
      if (!p || !legal(s, p.id)) { stuck++; console.log('KẸT: không ai được nói', s.turn); break; }
      // ẩn bài: góc nhìn của người khác không có bài tẩy của p
      if (k % 7 === 0) { const other = s.players.find(q => q.id !== p.id); const v = viewFor(s, other.id); if (p.hole && v.players.find(q => q.id === p.id).hole && !s.reveal[p.id]) leak++; if ('deck' in v) leak++; }
      const a = botAction(s, p.id);
      if (!a) { stuck++; console.log('KẸT: bot không ra quyết định'); break; }
      const r = applyAction(s, p.id, a);
      if (!r.ok) { errs++; if (errs < 6) console.log('LỖI', r.reason, a, legal(s, p.id)); break; }
      acts[a.type] = (acts[a.type] || 0) + 1; actions++; k++;
      if (chipsOnTable(s) !== s.bank) { chipBad++; if (chipBad < 4) console.log('LỆCH CHIP', chipsOnTable(s), s.bank); }
    }
    if (s.phase === 'playing') { stuck++; break; }
    hands++; h++;
    const res = s.result;
    if (res.kind === 'showdown') { showdowns++; if (res.pots.length > 1) sidePots++; if (res.pots.some(p => p.winners.length > 1)) splits++; } else folds++;
    // tổng thắng thua = 0
    const net = Object.values(res.net).reduce((a, b) => a + b, 0); if (net !== 0) { chipBad++; console.log('NET ≠ 0', net); }
    if (chipsOnTable(s) !== s.bank) { chipBad++; console.log('LỆCH CHIP cuối ván', chipsOnTable(s), s.bank); }
    if (s.players.some(p => p.chips < 0 || !Number.isInteger(p.chips))) { chipBad++; console.log('CHIP ÂM/LẺ'); }
    if (s.phase === 'over') { champs++; break; }
    const before = s.players.reduce((a, p) => a + p.rebuys, 0);
    if (!nextHand(s)) { stuck++; console.log('Không mở được ván mới'); break; }
    rebuys += s.players.reduce((a, p) => a + p.rebuys, 0) - before;
  }
  if (mode === 'tourn' && s.phase !== 'over') { console.log('Giải chưa xong sau', h, 'ván', np, 'người'); }
}
console.log({ tables: TABLES, hands, actions, stuck, errs, chipBad, leak, showdowns, folds, sidePots, splits, rebuys, champs, ms: Date.now() - t0 });
console.log('hành động bot:', acts);
if (stuck || errs || chipBad || leak) { console.log('THẤT BẠI'); process.exitCode = 1; } else console.log('OK: 0 kẹt, 0 lỗi, bảo toàn chip, không lộ bài');

// ---------- bot có "khó" không: đấu tay đôi với kiểu chơi đơn giản ----------
const station = s => { const p = s.players[s.turn]; const L = legal(s, p.id); return { type: L.canCheck ? 'check' : 'call' }; };
const maniac = s => { const p = s.players[s.turn]; const L = legal(s, p.id); const r = Math.random(); if (L.canRaise && r < 0.45) return { type: 'raise', to: Math.min(L.maxTo, Math.max(L.minTo, Math.round(L.pot * (0.6 + r)))) }; return { type: L.canCheck ? 'check' : 'call' }; };
const nit = s => { const p = s.players[s.turn]; const L = legal(s, p.id); return { type: L.canCheck ? 'check' : L.toCall <= s.bb ? 'call' : 'fold' }; };
for (const [nm, f] of [['theo hết (calling station)', station], ['tố bừa (maniac)', maniac], ['nhát (chỉ theo rẻ)', nit]]) {
  let net = 0; const HANDS = 400;
  for (let g = 0; g < 4; g++) {
    const s = createGame([{ id: 'bot', name: 'Bot', isBot: true }, { id: 'x', name: 'X', isBot: false }], { chips: 1000, bb: 20 });
    for (let h = 0; h < HANDS / 4; h++) {
      while (s.phase === 'playing') { const p = s.players[s.turn]; applyAction(s, p.id, p.id === 'bot' ? botAction(s, 'bot') : f(s)); }
      const x = s.players[1]; if (x.busted) applyAction(s, 'x', { type: 'rebuy' });
      if (!nextHand(s)) break;
    }
    const bot = s.players[0]; net += bot.chips - 1000 * (1 + bot.rebuys);
  }
  console.log(`Bot vs ${nm}: bot lời ${net} chip sau ${HANDS} ván (${(net / HANDS / 20).toFixed(2)} mù lớn/ván)`);
}
