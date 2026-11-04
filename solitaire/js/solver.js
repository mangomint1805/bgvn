// Bộ giải tổng quát: tìm kiếm best-first theo heuristic + bảng trạng thái đã thăm.
// Chỉ cắt tỉa an toàn (tự đưa lá "an toàn" lên đích) nên nếu duyệt hết mà không thấy lời giải → ván KHÔNG giải được.
import { apply, legalMoves, autoMoves, key, heur } from './core.js?v=1';

class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(p, v) { const a = this.a; a.push([p, v]); let i = a.length - 1; while (i > 0) { const j = (i - 1) >> 1; if (a[j][0] <= a[i][0]) break; [a[i], a[j]] = [a[j], a[i]]; i = j; } }
  pop() {
    const a = this.a, r = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, rr = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (rr < a.length && a[rr][0] < a[m][0]) m = rr; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } }
    return r[1];
  }
}

// trả về { res: 'win' | 'lose' | 'unknown', moves, nodes, ms }
export function solve(V, s0, { maxNodes = 150000, maxMs = 8000, now = () => Date.now(), onProgress = null } = {}) {
  const t0 = now();
  const first = autoMoves(V, s0);
  const done = (res, moves = []) => ({ res, moves, nodes: count, ms: now() - t0 });
  let count = 0;
  if (V.won(first.s)) return done('win', first.moves);
  // nút: [state, parentIdx, moves(dẫn tới nút này)]
  const S = [first.s], P = [-1], M = [first.moves], D = [0];
  const seen = new Set([key(V, first.s)]);
  const heap = new Heap(); heap.push(heur(V, first.s), 0);
  const path = idx => { const out = []; while (idx >= 0) { out.unshift(...M[idx]); idx = P[idx]; } return out; };
  while (heap.size) {
    const idx = heap.pop(); const s = S[idx]; S[idx] = null; count++;
    if ((count & 255) === 0) {
      const el = now() - t0; if (el > maxMs) return done('unknown');
      if (onProgress && (count & 4095) === 0) onProgress(count, el);
    }
    if (count > maxNodes) return done('unknown');
    for (const m of legalMoves(V, s)) {
      let n = apply(V, s, m); if (!n) continue;
      const am = autoMoves(V, n); n = am.s;
      const k = key(V, n); if (seen.has(k)) continue; seen.add(k);
      const j = S.length; S.push(n); P.push(idx); M.push([m, ...am.moves]); D.push(D[idx] + 1);
      if (V.won(n)) return done('win', path(j));
      heap.push(heur(V, n) + D[j] * 0.05, j);
    }
  }
  return done('lose');
}
