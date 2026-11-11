// 🤖 Bot Cờ tướng: tìm kiếm alpha–beta + ăn quân tới khi "yên" (quiescence). Chỉ nhìn bàn cờ – cờ tướng không có thông tin ẩn.
// Mức: easy (nhìn 2 nước, hay đi lệch) · normal (3 nước) · hard (đào sâu dần trong ~1 giây, thường 4–5 nước).
import { allPseudo, sideOf, other, legalMoves, pOf } from './engine.js?v=1';
const VAL = { K: 10000, R: 900, C: 450, H: 400, E: 200, A: 200, P: 100 };
// điểm vị trí (nhìn từ phía Đỏ, hàng 0 là đất địch)
const PST = {
  P: [[0, 3, 6, 9, 12, 9, 6, 3, 0], [18, 36, 56, 80, 120, 80, 56, 36, 18], [14, 26, 42, 60, 80, 60, 42, 26, 14], [10, 20, 30, 34, 40, 34, 30, 20, 10], [6, 12, 18, 18, 20, 18, 18, 12, 6], [2, 0, 8, 0, 8, 0, 8, 0, 2], [0, 0, -2, 0, 4, 0, -2, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0]],
  H: [[4, 8, 16, 12, 4, 12, 16, 8, 4], [4, 10, 28, 16, 8, 16, 28, 10, 4], [12, 14, 16, 20, 18, 20, 16, 14, 12], [8, 24, 18, 24, 20, 24, 18, 24, 8], [6, 16, 14, 18, 16, 18, 14, 16, 6], [4, 12, 16, 14, 12, 14, 16, 12, 4], [2, 6, 8, 6, 10, 6, 8, 6, 2], [4, 2, 8, 8, 4, 8, 8, 2, 4], [0, 2, 4, 4, -2, 4, 4, 2, 0], [0, -4, 0, 0, 0, 0, 0, -4, 0]],
  C: [[6, 4, 0, -10, -12, -10, 0, 4, 6], [2, 2, 0, -4, -14, -4, 0, 2, 2], [2, 2, 0, -10, -8, -10, 0, 2, 2], [0, 0, -2, 4, 10, 4, -2, 0, 0], [0, 0, 0, 2, 8, 2, 0, 0, 0], [-2, 0, 4, 2, 6, 2, 4, 0, -2], [0, 0, 0, 2, 4, 2, 0, 0, 0], [4, 0, 8, 6, 10, 6, 8, 0, 4], [0, 2, 4, 6, 6, 6, 4, 2, 0], [0, 0, 2, 6, 6, 6, 2, 0, 0]],
  R: [[14, 14, 12, 18, 16, 18, 12, 14, 14], [16, 20, 18, 24, 26, 24, 18, 20, 16], [12, 12, 12, 18, 18, 18, 12, 12, 12], [12, 18, 16, 22, 22, 22, 16, 18, 12], [12, 14, 12, 18, 18, 18, 12, 14, 12], [12, 16, 14, 20, 20, 20, 14, 16, 12], [6, 10, 8, 14, 14, 14, 8, 10, 6], [4, 8, 6, 14, 12, 14, 6, 8, 4], [8, 4, 8, 16, 8, 16, 8, 4, 8], [-2, 10, 6, 14, 12, 14, 6, 10, -2]],
};
function evaluate(b, side) { // điểm cho phe `side`
  let sc = 0;
  for (let i = 0; i < 90; i++) { const p = b[i]; if (!p) continue; const t = p.toUpperCase(), red = p === t, r = Math.floor(i / 9), c = i % 9; const v = VAL[t] + (PST[t] ? PST[t][red ? r : 9 - r][red ? c : 8 - c] : 0); sc += red ? v : -v; }
  return side === 'r' ? sc : -sc;
}
const order = (b, ms) => ms.map(m => { const cap = b[m % 100]; return [m, cap ? VAL[cap.toUpperCase()] * 10 - VAL[b[Math.floor(m / 100)].toUpperCase()] : 0]; }).sort((x, y) => y[1] - x[1]).map(x => x[0]);
let nodes = 0, deadline = 0, stop = false;
function quiesce(b, side, alpha, beta, depth) {
  const stand = evaluate(b, side); if (depth === 0) return stand;
  if (stand >= beta) return beta; if (stand > alpha) alpha = stand;
  for (const m of order(b, allPseudo(b, side).filter(m => b[m % 100]))) {
    const f = Math.floor(m / 100), t = m % 100, cap = b[t]; if (cap.toUpperCase() === 'K') return 20000;
    b[t] = b[f]; b[f] = ''; const sc = -quiesce(b, other(side), -beta, -alpha, depth - 1); b[f] = b[t]; b[t] = cap;
    if (sc >= beta) return beta; if (sc > alpha) alpha = sc;
  }
  return alpha;
}
function search(b, side, depth, alpha, beta, ply) {
  if ((++nodes & 2047) === 0 && Date.now() > deadline) stop = true;
  if (stop) return 0;
  if (depth <= 0) return quiesce(b, side, alpha, beta, 4);
  let best = -30000;
  for (const m of order(b, allPseudo(b, side))) {
    const f = Math.floor(m / 100), t = m % 100, cap = b[t]; if (cap && cap.toUpperCase() === 'K') return 20000 - ply; // ăn được Tướng = thắng (nước trước của địch là phạm luật / bị chiếu bí)
    b[t] = b[f]; b[f] = ''; const sc = -search(b, other(side), depth - 1, -beta, -alpha, ply + 1); b[f] = b[t]; b[t] = cap;
    if (stop) return 0;
    if (sc > best) best = sc; if (sc > alpha) alpha = sc; if (alpha >= beta) break;
  }
  return best;
}
export const LEVELS = { easy: { depth: 2, ms: 400, noise: 90 }, normal: { depth: 3, ms: 900, noise: 16 }, hard: { depth: 6, ms: 1200, noise: 0 } };
// trả về { from, to } – nước tốt nhất tìm được cho phe `side`
export function bestMove(board, side, level = 'normal', history = []) {
  const L = LEVELS[level] || LEVELS.normal, b = board.slice(), legal = legalMoves(b, side); if (!legal.length) return null;
  deadline = Date.now() + L.ms; nodes = 0; stop = false;
  let scored = legal.map(m => [m, 0]);
  for (let d = 1; d <= L.depth; d++) {
    const cur = []; let alpha = -30000;
    for (const [m] of scored) {
      const f = Math.floor(m / 100), t = m % 100, cap = b[t]; b[t] = b[f]; b[f] = '';
      let sc = -search(b, other(side), d - 1, -30000, -alpha + (L.noise ? 200 : 1), 1); b[f] = b[t]; b[t] = cap;
      if (stop) break;
      if (history.includes(m)) sc -= 40; // tránh đi tới đi lui một nước
      cur.push([m, sc]); if (sc > alpha) alpha = sc;
    }
    if (stop && cur.length < scored.length) { if (d === 1) scored = cur.length ? cur : scored; break; }
    scored = cur.sort((x, y) => y[1] - x[1]);
    if (scored[0][1] > 15000) break; // thấy chiếu bí rồi
  }
  const top = scored[0][1];
  const pool = L.noise ? scored.filter(x => x[1] >= top - L.noise) : [scored[0]]; // mức dễ: chọn ngẫu nhiên trong các nước "tàm tạm"
  const pick = top > 15000 ? scored[0] : pool[Math.floor(Math.random() * pool.length)];
  return { from: Math.floor(pick[0] / 100), to: pick[0] % 100 };
}
export function botAction(s, pid) {
  const me = s.players.find(p => p.id === pid); if (!me || s.phase !== 'playing') return null;
  if (s.undo && s.undo.by !== me.side) return { type: 'undoOk' };
  if (s.offer && s.offer !== me.side) return { type: evaluate(s.board, me.side) < -150 ? 'draw' : 'drawNo' }; // đang lép thì nhận hoà
  if (s.turn !== me.side) return null;
  const recent = s.moves.slice(-8).filter(m => sideOf(m.piece) === me.side).map(m => m.to * 100 + m.from); // nước "quay về" vừa đi
  const mv = bestMove(s.board, me.side, me.level || s.opts.level, recent);
  return mv ? { type: 'move', ...mv } : { type: 'resign' };
}
export const botWants = s => { const ids = []; if (s.phase !== 'playing') return ids; const t = pOf(s, s.turn); ids.push(t.id); for (const p of s.players) if (p.id !== t.id && ((s.offer && s.offer !== p.side) || (s.undo && s.undo.by !== p.side))) ids.push(p.id); return ids; };
