// 🟢 Đếm người đang mở BGVN: mỗi trang giữ 1 WebSocket nhẹ tới máy chủ (ping/pong tự trả lời, không tốn).
// Nghe số: addEventListener('bgvn-online', e => e.detail) · số gần nhất: window.__bgvnOnline
import { WS } from './api.js?v=1';
let ws = null, wait = 2000, ka = null, started = false;
function connect() {
  try { ws = new WebSocket(WS() + '/presence'); } catch (e) { setTimeout(connect, wait); return; }
  ws.onopen = () => { wait = 2000; clearInterval(ka); ka = setInterval(() => { try { if (ws.readyState === 1) ws.send('ping'); } catch (e) {} }, 30000); };
  ws.onmessage = ev => { if (ev.data === 'pong') return; try { const m = JSON.parse(ev.data); if (m.t === 'online') { window.__bgvnOnline = m.n; dispatchEvent(new CustomEvent('bgvn-online', { detail: m.n })); } } catch (e) {} };
  ws.onclose = () => { clearInterval(ka); setTimeout(connect, wait); wait = Math.min(wait * 2, 60000); };
  ws.onerror = () => {};
}
export function startPresence() { if (started) return; started = true; connect(); }
// hiển thị "🟢 N người đang online" vào phần tử el
export function mountOnline(el, fmt = n => `<i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#2fc76f;box-shadow:0 0 0 3px #2fc76f33;margin-right:6px;vertical-align:1px"></i><b>${n}</b> người đang online`) {
  startPresence();
  const draw = n => { if (n == null) { el.hidden = true; return; } el.hidden = false; el.innerHTML = fmt(n); };
  draw(window.__bgvnOnline); addEventListener('bgvn-online', e => draw(e.detail));
}
startPresence();
