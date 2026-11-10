// 👀 Chế độ xem: vào phòng lúc đang chơi thì được xem ván, ván sau tự được chia bài.
// Host: đánh dấu view.spec = true cho người chưa có trong ván. Client: specBanner(view && view.spec).
const CSS = `#bgvn-spec{position:fixed;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9000;display:flex;align-items:center;gap:8px;
background:#2a2340e6;color:#fff;padding:7px 14px;border-radius:999px;font:800 13px/1.3 Nunito,system-ui,sans-serif;box-shadow:0 6px 20px #0004;pointer-events:none;max-width:calc(100vw - 24px);text-align:center;white-space:nowrap}
#bgvn-spec b{color:#ffd166}
body.bgvn-spec .hand,body.bgvn-spec [data-spec-hide]{pointer-events:none}`;
let el = null;
export function specBanner(on, text) {
  if (!on) { if (el) { el.remove(); el = null; } document.body.classList.remove('bgvn-spec'); return; }
  if (!document.getElementById('bgvn-spec-css')) { const s = document.createElement('style'); s.id = 'bgvn-spec-css'; s.textContent = CSS; document.head.append(s); }
  if (!el) { el = document.createElement('div'); el.id = 'bgvn-spec'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.innerHTML = text || '👀 <span>Đang xem · <b>ván sau</b> được vào chơi</span>';
  document.body.classList.add('bgvn-spec');
}
