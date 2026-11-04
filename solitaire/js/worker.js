// Web Worker: chạy bộ giải ở luồng riêng để giao diện không bị đơ
import { VARIANTS } from './variants.js?v=1';
import { solve } from './solver.js?v=1';
self.onmessage = e => {
  const { id, state, maxMs = 10000, maxNodes = 250000 } = e.data;
  const V = VARIANTS[state.v];
  try {
    const r = solve(V, state, { maxMs, maxNodes, onProgress: (n, ms) => self.postMessage({ id, progress: n, ms }) });
    self.postMessage({ id, ...r });
  } catch (err) { self.postMessage({ id, res: 'error', error: String(err) }); }
};
