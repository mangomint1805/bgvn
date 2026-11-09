// ⚙️ Nạp "luật mặc định" dùng chung cho mọi game: file ../luat-mac-dinh.js (gốc repo, Minto sửa trên GitHub).
// - Nạp bằng dynamic import trong try/catch + hẹn giờ: file lỗi cú pháp / mất mạng / 404 → game vẫn chạy bằng luật gốc trong code.
// - Top-level await: module game import file này sẽ chờ nạp xong (tối đa ~3 giây) nên rulesFor() gọi đồng bộ được,
//   kể cả lúc tạo phòng offline, chủ phòng online hay khôi phục phòng khi tải lại trang.
// - Chống cache: thêm ?t=<số phút hiện tại> → trình duyệt lấy bản mới mỗi phút. GitHub Pages tự cache ~10 phút,
//   nên sau khi Commit có thể phải đợi tới ~10 phút mới thấy luật mới.
const FILE = '../luat-mac-dinh.js';
export const RULES_URL = new URL(FILE, import.meta.url).href;
let RAW = {}, ERR = null;
try {
  const t = Math.floor(Date.now() / 60000);
  const mod = await Promise.race([
    import(`${FILE}?t=${t}`),
    new Promise((_, rej) => setTimeout(() => rej(new Error('quá 3 giây chưa nạp được')), 3000)),
  ]);
  const d = mod && mod.default;
  if (d && typeof d === 'object' && !Array.isArray(d)) RAW = d; else throw new Error('file không có "export default { … }"');
} catch (e) {
  ERR = e; RAW = {};
  try { console.warn('[luật mặc định] Không đọc được luat-mac-dinh.js → dùng luật gốc trong code.', e && e.message || e); } catch (x) {}
}
export const rulesError = () => ERR;
// phần cấu hình thô của 1 game (đọc thôi, đừng sửa)
export const rawRules = game => (RAW && typeof RAW[game] === 'object' && RAW[game]) || {};

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const warn = (path, v, why) => { try { console.warn(`[luật mặc định] ${path} = ${JSON.stringify(v)} không hợp lệ (${why}) → giữ luật gốc.`); } catch (e) {} };
// allowed: mảng giá trị · hàm (v) => bool · { min, max, step?, int? } · object lồng nhau (cho giá trị là object)
function okVal(v, d, a) {
  if (Array.isArray(a)) return a.some(x => x === v) ? [true] : [false, 'phải là một trong: ' + a.map(x => JSON.stringify(x)).join(', ')];
  if (typeof a === 'function') { let r = false; try { r = !!a(v); } catch (e) {} return r ? [true] : [false, 'không đúng dạng']; }
  if (isObj(a) && ('min' in a || 'max' in a)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return [false, 'phải là số'];
    if (a.int !== false && !Number.isInteger(v)) return [false, 'phải là số nguyên'];
    if (v < a.min || v > a.max) return [false, `phải từ ${a.min} đến ${a.max}`];
    if (a.step && (v - a.min) % a.step) return [false, `phải theo bước ${a.step}`];
    return [true];
  }
  if (typeof d === 'boolean') return typeof v === 'boolean' ? [true] : [false, 'phải là true hoặc false'];
  if (typeof d === 'number') return typeof v === 'number' && Number.isFinite(v) ? [true] : [false, 'phải là số'];
  if (typeof d === 'string') return typeof v === 'string' ? [true] : [false, "phải là chữ trong dấu nháy '…'"];
  return [typeof v === typeof d, 'sai kiểu'];
}
// Trộn cấu hình (cfg) vào luật gốc (fallback): chỉ nhận khoá có trong fallback, giá trị phải hợp lệ; trả object MỚI.
export function mergeRules(cfg, fallback, allowed = {}, path = '') {
  const out = JSON.parse(JSON.stringify(fallback));
  if (!isObj(cfg)) { if (cfg !== undefined) warn(path || '?', cfg, 'phải là { … }'); return out; }
  for (const [k, v] of Object.entries(cfg)) {
    const p = path ? path + '.' + k : k;
    if (!(k in fallback)) { try { console.warn(`[luật mặc định] ${p}: không có tuỳ chọn này → bỏ qua.`); } catch (e) {} continue; }
    const d = fallback[k], a = allowed ? allowed[k] : undefined;
    if (isObj(d) && typeof a !== 'function') { out[k] = mergeRules(v, d, isObj(a) ? a : {}, p); continue; }
    const [ok, why] = okVal(v, d, a);
    if (ok) out[k] = isObj(v) || Array.isArray(v) ? JSON.parse(JSON.stringify(v)) : v; else warn(p, v, why);
  }
  return out;
}
// rulesFor('uno', { mode: 'house', … }, { mode: ['classic', 'house', 'nomercy'] }) → luật gốc đã trộn cấu hình hợp lệ
export function rulesFor(game, fallback, allowed = {}) { return mergeRules(RAW ? RAW[game] : undefined, fallback, allowed, game); }
