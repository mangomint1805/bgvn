// 👑 Mức Đại sư: gọi động cơ Fairy-Stockfish (GPL-3, ở ../vendor/fsf/) qua giao thức UCI. Chỉ tải khi người chơi chọn mức này.
// Động cơ cần "cross-origin isolation" → đăng ký service worker coi-sw.js (chỉ phạm vi /cotuong/) rồi tải lại trang MỘT lần.
// masterReady(): true = dùng được · false = máy này không chạy được (game tự lùi về mức Khó) · 'reload' = đang tải lại trang để bật.
const ROOT = new URL('../', import.meta.url).href, FLAG = 'cotuong-master';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
let eng = null, loading = null, lines = [], waiters = [];
// không dùng Đại sư nữa thì gỡ service worker (để đăng nhập Google… trên trang này chạy bình thường)
export async function masterOff() { ls.del(FLAG); try { for (const r of await navigator.serviceWorker.getRegistrations()) if (r.scope.endsWith('/cotuong/')) await r.unregister(); } catch (e) {} }
if (ls.get(FLAG) !== '1' && 'serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => { if (r.scope.endsWith('/cotuong/')) r.unregister(); })).catch(() => {});

const say = cmd => eng.postMessage(cmd);
const until = (test, ms = 8000) => new Promise((res, rej) => { const hit = lines.find(test); if (hit) return res(hit); const w = { test, res }; waiters.push(w); setTimeout(() => { waiters = waiters.filter(x => x !== w); rej(new Error('động cơ không trả lời')); }, ms); });
function onLine(l) { lines.push(l); if (lines.length > 200) lines.shift(); for (const w of waiters.slice()) if (w.test(l)) { waiters = waiters.filter(x => x !== w); w.res(l); } }
async function load() {
  if (!self.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') throw new Error('chưa bật cô lập');
  await new Promise((res, rej) => { if (window.Stockfish) return res(); const s = document.createElement('script'); s.src = ROOT + 'vendor/fsf/stockfish.js?v=1'; s.onload = res; s.onerror = rej; document.head.append(s); });
  eng = await window.Stockfish({ locateFile: f => ROOT + 'vendor/fsf/' + f, mainScriptUrlOrBlob: ROOT + 'vendor/fsf/stockfish.js?v=1' });
  eng.addMessageListener(onLine);
  say('uci'); await until(l => l === 'uciok');
  say('setoption name UCI_Variant value xiangqi'); say(`setoption name Threads value ${Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1))}`); say('setoption name Hash value 32');
  say('isready'); await until(l => l === 'readyok');
  return true;
}
export async function masterReady() {
  ls.set(FLAG, '1');
  if (eng) return true;
  if (!self.crossOriginIsolated) {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return false;
    let tried = null; try { tried = sessionStorage.getItem('cotuong-coi'); } catch (e) {}
    if (tried) return false; // đã thử tải lại mà vẫn không được (trình duyệt không hỗ trợ)
    try { sessionStorage.setItem('cotuong-coi', '1'); await navigator.serviceWorker.register(ROOT + 'coi-sw.js', { scope: ROOT }); await navigator.serviceWorker.ready; } catch (e) { return false; }
    setTimeout(() => location.reload(), 700); /* chờ phòng kịp lưu lại rồi mới tải lại trang */ return 'reload';
  }
  try { loading = loading || load(); await loading; return true; } catch (e) { loading = null; eng = null; return false; }
}
// bàn cờ của engine.js → FEN cờ tướng (Mã = n, Tượng = b)
const MAP = { H: 'N', h: 'n', E: 'B', e: 'b' };
export function toFen(board, turn) {
  const rows = [];
  for (let r = 0; r < 10; r++) { let s = '', gap = 0; for (let c = 0; c < 9; c++) { const p = board[r * 9 + c]; if (!p) gap++; else { if (gap) { s += gap; gap = 0; } s += MAP[p] || p; } } rows.push(s + (gap || '')); }
  return `${rows.join('/')} ${turn === 'r' ? 'w' : 'b'} - - 0 1`;
}
let busy = Promise.resolve();
export function masterMove(board, turn, ms = 1500) {
  const job = busy.then(async () => {
    if ((await masterReady()) !== true) throw new Error('không có động cơ');
    lines = []; say('position fen ' + toFen(board, turn)); say('go movetime ' + ms);
    const l = await until(x => x.startsWith('bestmove'), ms + 6000), m = /^bestmove ([a-i])(\d+)([a-i])(\d+)/.exec(l); if (!m) return null;
    const sq = (f, rk) => (10 - +rk) * 9 + (f.charCodeAt(0) - 97);
    return { from: sq(m[1], m[2]), to: sq(m[3], m[4]) };
  });
  busy = job.catch(() => {}); return job;
}
