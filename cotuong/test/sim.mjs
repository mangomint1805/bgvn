// Kiểm tra luật + bot Cờ tướng: node cotuong/test/sim.mjs [số ván]
import { START, legalMoves, inCheck, createGame, applyAction, pseudoMoves, notation, viewFor } from '../js/engine.js';
import { botAction, bestMove } from '../js/bot.js';
let fails = 0; const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('❌', m, '→', JSON.stringify(a), '≠', JSON.stringify(b)); } };
const B = rows => rows.join('').split('').map(c => c === '.' ? '' : c);
const sq = (r, c) => r * 9 + c;
eq(legalMoves(START.slice(), 'r').length, 44, 'thế khai cuộc: Đỏ có 44 nước');
eq(legalMoves(START.slice(), 'b').length, 44, 'thế khai cuộc: Đen có 44 nước');
eq(notation(START, sq(7, 7), sq(7, 4)), 'Pháo 2 bình 5', 'ghi nước Pháo 2 bình 5');
eq(notation(START, sq(9, 7), sq(7, 6)), 'Mã 2 tấn 3', 'ghi nước Mã 2 tấn 3');
eq(notation(START, sq(0, 1), sq(2, 2)), 'Mã 2 tấn 3', 'Đen: Mã 2 tấn 3');
// Mã bị cản chân
{ const b = B(['....k....', '.........', '.........', '.........', '.........', '.........', '.........', '....P....', '....H....', '....K....']); eq(pseudoMoves(b, sq(8, 4)).map(m => m % 100).sort((x, y) => x - y), [sq(9, 2), sq(9, 6), sq(7, 2), sq(7, 6)].sort((x, y) => x - y), 'Mã bị cản chân phía trước'); }
// Tượng không qua sông, bị chặn mắt
{ const b = B(['....k....', '.........', '.........', '.........', '.........', '..E......', '...p.....', '.........', '.........', '....K....']); eq(pseudoMoves(b, sq(5, 2)).map(m => m % 100).sort((x, y) => x - y), [sq(7, 0)].sort((x, y) => x - y), 'Tượng: không qua sông, bị chặn mắt, còn 1 nước'); }
// Pháo ăn phải có ngòi
{ const b = B(['....k....', '.........', '....p....', '.........', '....p....', '.........', '....C....', '.........', '.........', '...K.....']); const ms = pseudoMoves(b, sq(6, 4)).map(m => m % 100); eq(ms.includes(sq(2, 4)), true, 'Pháo ăn qua ngòi'); eq(ms.includes(sq(4, 4)), false, 'Pháo không ăn trực tiếp'); eq(ms.includes(sq(5, 4)), true, 'Pháo đi thẳng'); }
// Tốt qua sông mới đi ngang
{ const b = B(['....k....', '.........', '.........', '.........', '..P......', '.........', '....P....', '.........', '.........', '....K....']); eq(pseudoMoves(b, sq(4, 2)).length, 3, 'Tốt qua sông: 3 nước'); eq(pseudoMoves(b, sq(6, 4)).length, 1, 'Tốt chưa qua sông: 1 nước'); }
// Lộ mặt Tướng
{ const b = B(['....k....', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '....R....', '....K....']); eq(legalMoves(b, 'r', sq(8, 4)).every(m => (m % 100) % 9 === 4), true, 'Xe đang che mặt Tướng: chỉ đi dọc'); }
// Chiếu bí: Xe + Tướng đối mặt
{ const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], {}); s.board = B(['...k.....', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '....R....', '.....K...']); const r = applyAction(s, 'a', { type: 'move', from: sq(8, 4), to: sq(8, 3) }); eq(r.ok, true, 'Xe chiếu'); eq(s.check, true, 'đang chiếu'); eq(s.phase, 'playing', 'chưa bí (Tướng né được)'); }
{ const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], {}); s.board = B(['...k.....', '....R....', '.........', '.........', '.........', '.........', '.........', '.........', '.....R...', '....K....']); applyAction(s, 'a', { type: 'move', from: sq(8, 5), to: sq(0, 5) }); eq(s.phase, 'ended', 'chiếu bí 2 Xe'); eq(s.winner, 'a', 'Đỏ thắng'); eq(s.result.kind, 'mate', 'kiểu: chiếu bí'); }
// xin hoà, xin thua, đi lại với bot
{ const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], {}); applyAction(s, 'a', { type: 'draw' }); eq(s.offer, 'r', 'cầu hoà'); applyAction(s, 'b', { type: 'draw' }); eq(s.result.kind, 'agree', 'đồng ý hoà'); eq(s.winner, null, 'hoà: không ai thắng'); }
{ const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B', isBot: true }], {}); applyAction(s, 'a', { type: 'move', from: sq(7, 7), to: sq(7, 4) }); applyAction(s, 'b', botAction(s, 'b')); eq(s.moves.length, 2, '2 nước'); applyAction(s, 'a', { type: 'undo' }); eq(s.moves.length, 0, 'đi lại với bot: lùi 2 nước'); eq(s.board.join(), START.join(), 'bàn về như cũ'); }
// bot thấy chiếu bí 1 nước
{ const b = B(['...k.....', '....R....', '.........', '.........', '.........', '.........', '.........', '.........', '.....R...', '....K....']); const s = createGame([{ id: 'a', name: 'A', isBot: true }, { id: 'b', name: 'B' }], {}); s.board = b; applyAction(s, 'a', botAction(s, 'a')); eq([s.phase, s.winner], ['ended', 'a'], 'bot kết thúc ván trong 1 nước (chiếu bí hoặc vây hết nước)'); }
// mô phỏng: bot đấu bot, mọi nước phải hợp lệ, ván phải kết thúc
const N = +process.argv[2] || 12; let ended = 0, plies = 0, res = {}, t0 = Date.now(), lv = { hardWins: 0, easyWins: 0, draws: 0 };
for (let g = 0; g < N; g++) {
  const hardRed = g % 2 === 0;
  const s = createGame([{ id: 'a', name: 'A', isBot: true, level: hardRed ? 'normal' : 'easy' }, { id: 'b', name: 'B', isBot: true, level: hardRed ? 'easy' : 'normal' }], {});
  let k = 0;
  while (s.phase === 'playing' && k++ < 400) { const pid = s.players.find(p => p.side === s.turn).id, a = botAction(s, pid); const r = applyAction(s, pid, a); if (!r.ok) { fails++; console.log('❌ bot đi sai', a, r.reason); break; } if (!s.board.includes('K') || !s.board.includes('k')) { fails++; console.log('❌ mất Tướng'); break; } }
  if (s.phase === 'ended') { ended++; res[s.result.kind] = (res[s.result.kind] || 0) + 1; const w = s.players.find(p => p.id === s.winner); if (!w) lv.draws++; else if (w.level === 'normal') lv.hardWins++; else lv.easyWins++; }
  plies += k; JSON.stringify(viewFor(s, 'a'));
}
console.log(`mô phỏng ${N} ván: kết thúc ${ended}, trung bình ${Math.round(plies / N)} nước, ${Math.round((Date.now() - t0) / plies)} ms/nước`, res, '· Vừa thắng Dễ:', lv);
console.log(fails ? `❌ ${fails} lỗi` : '✅ Luật + bot ổn'); process.exitCode = fails ? 1 : 0;
