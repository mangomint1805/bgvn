// 🐞 Ghi lại lỗi JavaScript phía người chơi về máy chủ (POST /err) để chủ web biết web hỏng ở đâu mà không cần ai báo.
// Không gửi gì về người chơi ngoài: game, câu báo lỗi, file:dòng, địa chỉ trang (bỏ mã phòng) và loại trình duyệt.
// Tiết kiệm hạn mức: mỗi lần mở trang gửi tối đa 3 lỗi, cùng một lỗi mỗi máy chỉ gửi 1 lần/ngày, bỏ qua lỗi mạng và lỗi của tiện ích trình duyệt.
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const SKIP = /^Script error\.?$|ResizeObserver loop|Failed to fetch|Load failed|NetworkError|Importing a module script failed|dynamically imported module|AbortError|The operation was aborted|NotAllowedError|play\(\) (request|failed)|extension:\/\/|QuotaExceeded/i;
const day = new Date().toISOString().slice(0, 10);
let sent = 0, seen = {};
try { const o = JSON.parse(ls.get('bgvn-errs') || '{}'); if (o.d === day) seen = o.k || {}; } catch (e) {}
function report(msg, at) {
  msg = String(msg || '').slice(0, 300); at = String(at || '').replace(location.origin, '').replace(/\?v=\d+/g, '').slice(0, 160);
  if (!msg || SKIP.test(msg) || SKIP.test(at) || sent >= 3 || navigator.webdriver || !/^https:/.test(location.protocol)) return;
  const k = (msg + '|' + at).slice(0, 120); if (seen[k]) return;
  seen[k] = 1; sent++; ls.set('bgvn-errs', JSON.stringify({ d: day, k: seen }));
  const game = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean)[0] || 'hub';
  import('../net/cfrelay.js?v=4').then(m => fetch(m.cfHttp() + '/err', { method: 'POST', keepalive: true, headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ game, msg, at, page: location.pathname }) })).catch(() => {});
}
addEventListener('error', e => { if (e && e.message) report(e.message, (e.filename || '') + ':' + (e.lineno || 0) + ':' + (e.colno || 0)); });
addEventListener('unhandledrejection', e => { const r = e && e.reason; if (!r) return; const st = String((r && r.stack) || ''); const m = st.match(/(https?:\/\/[^\s)]+:\d+:\d+)/); report((r && r.message) || String(r), m ? m[1] : 'promise'); });
