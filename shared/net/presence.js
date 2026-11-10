// 🟢 Đếm người đang mở BGVN: mỗi trang giữ 1 WebSocket nhẹ tới máy chủ (ping/pong tự trả lời, không tốn).
// Nghe số: addEventListener('bgvn-online', e => e.detail) · số gần nhất: window.__bgvnOnline
import { WS, API } from './api.js?v=1';
let ws = null, wait = 2000, ka = null, started = false;
function connect() {
  try { ws = new WebSocket(WS() + '/presence'); } catch (e) { setTimeout(connect, wait); return; }
  ws.onopen = () => { wait = 2000; clearInterval(ka); ka = setInterval(() => { try { if (ws.readyState === 1) ws.send('ping'); } catch (e) {} }, 30000); };
  ws.onmessage = ev => { if (ev.data === 'pong') return; try { const m = JSON.parse(ev.data); if (m.t === 'online') { window.__bgvnOnline = m.n; dispatchEvent(new CustomEvent('bgvn-online', { detail: m.n })); } } catch (e) {} };
  ws.onclose = () => { clearInterval(ka); setTimeout(connect, wait); wait = Math.min(wait * 2, 60000); };
  ws.onerror = () => {};
}
export function startPresence() { if (started) return; started = true; connect(); checkQuota(); }

// ⚠️ Báo cho người chơi khi máy chủ chính sắp/đã hết hạn mức miễn phí trong ngày (làm mới 7h sáng VN)
const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
async function checkQuota() {
  let st = null; const c = ss.get('bgvn-quota');
  try { const o = c && JSON.parse(c); if (o && Date.now() - o.at < 5 * 60e3) st = o.s; } catch (e) {}
  if (!st) {
    try { const r = await fetch(API() + '/status', { cache: 'no-store' }); st = r.ok ? await r.json() : { level: 'full' }; }
    catch (e) { st = null; } // mất mạng hẳn: không kết luận gì
    if (st) ss.set('bgvn-quota', JSON.stringify({ at: Date.now(), s: st }));
  }
  if (!st || st.level === 'ok' || ss.get('bgvn-quota-x') === st.level) return;
  const reset = st.resetAt ? new Date(st.resetAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '7:00';
  const txt = st.level === 'full'
    ? `⚠️ Hôm nay BGVN đông quá nên máy chủ chính đã hết lượt miễn phí – web tự chuyển sang đường dự phòng, vào phòng có thể chậm hoặc hay rớt hơn. Máy chủ chính mở lại lúc ${reset} sáng mai nha 💖`
    : `⚠️ Hôm nay BGVN đông vui quá – máy chủ chính sắp hết lượt miễn phí (${Math.round(st.pct)}%). Nếu vào phòng chậm thì thử lại hoặc chơi với bot nha. Làm mới lúc ${reset} sáng mai.`;
  const show = () => {
    const d = document.createElement('div'); d.id = 'bgvn-quota'; d.setAttribute('role', 'status');
    d.style.cssText = `position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);z-index:9990;width:min(560px,calc(100vw - 20px));display:flex;gap:10px;align-items:flex-start;padding:10px 12px 10px 14px;border-radius:16px;font:700 13.5px/1.4 Nunito,system-ui,sans-serif;box-shadow:0 10px 28px #0003;background:${st.level === 'full' ? '#ffe1e4' : '#fff1d6'};color:${st.level === 'full' ? '#7a1020' : '#6b4500'}`;
    d.innerHTML = `<span style="flex:1"></span><button aria-label="Đóng" style="flex:none;border:0;background:#0001;border-radius:50%;width:30px;height:30px;font-size:15px;cursor:pointer;color:inherit">✕</button>`;
    d.firstChild.textContent = txt;
    d.lastChild.onclick = () => { d.remove(); ss.set('bgvn-quota-x', st.level); };
    document.body.append(d);
  };
  document.body ? show() : addEventListener('DOMContentLoaded', show);
}
// hiển thị "🟢 N người đang online" vào phần tử el
export function mountOnline(el, fmt = n => `<i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#2fc76f;box-shadow:0 0 0 3px #2fc76f33;margin-right:6px;vertical-align:1px"></i><b>${n}</b> người đang online`) {
  startPresence();
  const draw = n => { if (n == null) { el.hidden = true; return; } el.hidden = false; el.innerHTML = fmt(n); };
  draw(window.__bgvnOnline); addEventListener('bgvn-online', e => draw(e.detail));
}
startPresence();
