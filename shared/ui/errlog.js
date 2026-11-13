// 🐞 Ghi lại lỗi JavaScript phía người chơi về máy chủ (POST /err) để chủ web biết web hỏng ở đâu mà không cần ai báo.
// Không gửi gì về người chơi ngoài: game, câu báo lỗi, file:dòng, địa chỉ trang (bỏ mã phòng) và loại trình duyệt.
// Tiết kiệm hạn mức: mỗi lần mở trang gửi tối đa 3 lỗi, cùng một lỗi mỗi máy chỉ gửi 1 lần/ngày, bỏ qua lỗi mạng và lỗi của tiện ích trình duyệt.
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const SKIP = /^Script error\.?$|ResizeObserver loop|Failed to fetch|Load failed|NetworkError|Importing a module script failed|dynamically imported module|AbortError|The operation was aborted|NotAllowedError|play\(\) (request|failed)|extension:\/\/|QuotaExceeded|zaloJSV2|iabjs:|Java object is gone|view transition|skipTransition|InvalidStateError|@context|isReCreate|M_ID|_META|IABInnerFrame|Error creating WebGL context|window\.ethereum/i; /* lỗi do trình duyệt nhúng (Zalo, Facebook), ví tiền số của Brave hoặc tiện ích trình duyệt chèn vào, không phải lỗi của web */
const day = new Date().toISOString().slice(0, 10);
let sent = 0, seen = {};
try { const o = JSON.parse(ls.get('bgvn-errs') || '{}'); if (o.d === day) seen = o.k || {}; } catch (e) {}
// Trình duyệt quá cũ không hiểu cú pháp mới (?. / ??) → cả game không chạy. Không sửa được từ phía web, nên hiện dải nhắc cập nhật thay vì để màn hình đứng im.
let oldShown = false;
function oldBrowser() {
  if (oldShown || !document.body) return; oldShown = true;
  var d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:99999;background:#2a2340;color:#fff;border-radius:14px;padding:12px 14px;font:700 14px/1.4 Nunito,system-ui,sans-serif;box-shadow:0 10px 30px -8px #000a;text-align:center';
  d.textContent = '😢 Trình duyệt này hơi cũ nên BGVN chưa chạy được. Bạn cập nhật Chrome / Safari (hoặc mở bằng trình duyệt khác) rồi vào lại nha!';
  document.body.appendChild(d);
}
function report(msg, at) {
  if (/SyntaxError: Unexpected token [?.]/.test(String(msg || ''))) { oldBrowser(); return; }
  msg = String(msg || '').slice(0, 300); at = String(at || '').replace(location.origin, '').replace(/\?v=\d+/g, '').slice(0, 160);
  if (!msg || SKIP.test(msg) || SKIP.test(at) || sent >= 3 || navigator.webdriver || !/^https:/.test(location.protocol)) return;
  const k = (msg + '|' + at).slice(0, 120); if (seen[k]) return;
  seen[k] = 1; sent++; ls.set('bgvn-errs', JSON.stringify({ d: day, k: seen }));
  const game = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean)[0] || 'hub';
  import('../net/cfrelay.js?v=5').then(m => fetch(m.cfHttp() + '/err', { method: 'POST', keepalive: true, headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ game, msg, at, page: location.pathname }) })).catch(() => {});
}
addEventListener('error', e => { if (e && e.message && (!e.filename || e.filename.startsWith(location.origin + '/')) && !/^(chrome|moz|safari)-extension:/.test(e.filename || '')) report(e.message, (e.filename || '') + ':' + (e.lineno || 0) + ':' + (e.colno || 0)); });
addEventListener('unhandledrejection', e => { const r = e && e.reason; if (!r) return; const st = String((r && r.stack) || ''); if (!st.includes(location.origin)) return; /* chỉ ghi lỗi phát ra từ code của web */ const m = st.match(/(https?:\/\/[^\s)]+:\d+:\d+)/); report((r && r.message) || String(r), m ? m[1] : 'promise'); });
