// Thanh trạng thái kết nối dùng chung: luôn cho biết đang làm gì, lỗi thì có nút Thử lại.
let el, hideT;
function ensure() {
  if (el) return el;
  el = document.createElement('div'); el.id = 'net-status';
  el.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:9999;display:none;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;font:700 14px/1.3 Nunito,system-ui,sans-serif;box-shadow:0 8px 24px -8px #0006;max-width:92vw;text-align:center;transition:opacity .25s';
  document.body.appendChild(el);
  const st = document.createElement('style'); st.textContent = '@keyframes ns-spin{to{transform:rotate(360deg)}}#net-status .sp{width:14px;height:14px;border:2.5px solid #fff6;border-top-color:#fff;border-radius:50%;animation:ns-spin .8s linear infinite;flex:none}#net-status button{border:0;border-radius:999px;padding:3px 10px;font:800 13px Nunito,sans-serif;cursor:pointer;background:#fff;color:#b3261e}';
  document.head.appendChild(st);
  return el;
}
// kind: 'wait' | 'ok' | 'fail'
export function netStatus(text, kind = 'wait', onRetry) {
  const e = ensure(); clearTimeout(hideT);
  if (!text) { e.style.display = 'none'; return; }
  e.style.display = 'flex'; e.style.opacity = '1';
  e.style.background = kind === 'fail' ? '#b3261e' : kind === 'ok' ? '#1a9e52' : '#24314d'; e.style.color = '#fff';
  e.innerHTML = (kind === 'wait' ? '<span class="sp"></span>' : kind === 'ok' ? '✅' : '⚠️') + `<span>${String(text).replace(/</g, '&lt;')}</span>` + (kind === 'fail' && onRetry ? '<button>Thử lại</button>' : '');
  if (kind === 'fail' && onRetry) e.querySelector('button').onclick = () => onRetry();
  if (kind === 'ok') hideT = setTimeout(() => { e.style.opacity = '0'; setTimeout(() => { e.style.display = 'none'; }, 260); }, 1600);
}
