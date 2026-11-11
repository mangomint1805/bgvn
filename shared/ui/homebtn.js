// Nút "🏠 Trang chủ" trong hộp thoại "Rời ván/bàn/làng?" của mọi game:
// bấm → chạy đúng thủ tục rời của game (bấm hộ nút Rời), rồi về trang chủ BGVN.
// Dùng: <script type="module" src="../shared/ui/homebtn.js?v=1"></script>
const HOME = '../';
const isLeaveBtn = b => !b.dataset.home && (/^(m-leave|m-quit)$/.test(b.id) || /^\s*(🚪\s*)?Rời/.test(b.textContent || ''));

function inject(root) {
  const h2 = [...(root.matches && root.matches('h2') ? [root] : root.querySelectorAll('h2'))].find(h => /^\s*Rời[\s?]/.test(h.textContent || ''));
  if (!h2) return;
  const box = h2.parentElement;
  if (!box || box.querySelector('[data-home]')) return;
  const leave = [...box.querySelectorAll('button')].find(isLeaveBtn);
  if (!leave) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = leave.className.replace(/\b(red|danger|pri)\b/g, '').trim() || 'btn';
  b.dataset.home = '1';
  b.textContent = '🏠 Về trang chủ';
  b.style.cssText = 'margin-top:8px;width:100%';
  b.onclick = e => {
    e.preventDefault(); e.stopPropagation();
    try { leave.click(); } catch (err) {}
    setTimeout(() => { location.href = HOME; }, 250);
  };
  leave.parentElement.after(b);
}

const mo = new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) inject(n.closest ? (n.closest('[class*=modal],dialog,#modal') || n) : n); });
mo.observe(document.body, { childList: true, subtree: true });

// 💌 Góp ý / ☕ Ủng hộ: thêm link vào chân trang của game (dùng shared/ui/feedback.js)
import('./feedback.js?v=4').then(() => {
  const ft = [...document.querySelectorAll('footer, p.note')].find(e => /fan-made/i.test(e.textContent));
  const box = document.createElement('p'); box.className = 'bgvn-fbline';
  box.style.cssText = 'text-align:center;font-size:13px;margin:6px 0 0;opacity:.9';
  box.innerHTML = '<a href="#" data-feedback style="color:inherit">💌 Góp ý / báo lỗi</a> · <a href="#" data-donate style="color:inherit">☕ Ủng hộ chủ web</a>';
  if (ft) ft.after(box);
}).catch(() => {});

// 🌐 Sảnh chung trong từng game: nút mở sảnh (phòng công khai + chat của game này) ở màn hình đầu
const GAME = location.pathname.replace(/\/+$/, '').split('/').pop();
(() => {
  const ft = [...document.querySelectorAll('footer, p.note')].find(e => /fan-made/i.test(e.textContent));
  if (!ft) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'bgvn-lobbybtn';
  b.innerHTML = '🌐 Phòng công khai & chat';
  b.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:46px;margin:10px 0 4px;border:0;border-radius:999px;cursor:pointer;font:800 16px "Baloo 2",Nunito,system-ui,sans-serif;color:#fff;background:linear-gradient(90deg,#7b61ff,#3d8bff);box-shadow:0 8px 18px -10px #3d8bffaa';
  b.onclick = () => import('./lobby.js?v=4').then(m => m.openLobby(GAME));
  ft.before(b);
  const on = document.createElement('p'); on.hidden = true; on.style.cssText = 'text-align:center;margin:4px 0 8px;font:700 13px Nunito,system-ui,sans-serif;opacity:.85';
  b.after(on);
  import('../net/presence.js?v=5').then(m => { let hide = false; try { hide = localStorage.getItem('bgvn-hide-online') === '1'; } catch (e) {} if (!hide) m.mountOnline(on); }).catch(() => {});
})();

// 🌐 Công khai phòng: hiện công tắc cạnh mã phòng (chỉ chủ phòng online)
let wantPublic = false;
try { if (/[?&]public=1/.test(location.search)) sessionStorage.setItem('bgvn-pub-next', '1'); wantPublic = sessionStorage.getItem('bgvn-pub-next') === '1' || localStorage.getItem('bgvn-pub-default') === '1'; } catch (e) {}
function pubToggle() {
  const host = window.__bgvnHost; if (!host || host.dead) return;
  const codeEl = document.querySelector('#room-code, #lobby-code'); if (!codeEl) return;
  const code = (codeEl.textContent || '').trim(); if (!/^[A-Z0-9]{5}$/.test(code) || code !== host.code) return;
  const anchor = document.getElementById('code-box') || codeEl;
  if (!anchor.offsetParent) return; // đang ẩn
  let w = document.getElementById('bgvn-pub');
  const key = 'bgvn-pub-' + host.game + '-' + code;
  let saved = null; try { saved = sessionStorage.getItem(key); } catch (e) {}
  if (!w) {
    w = document.createElement('label'); w.id = 'bgvn-pub';
    w.style.cssText = 'display:flex;align-items:center;gap:10px;margin:10px auto;max-width:420px;padding:10px 14px;border-radius:16px;background:#eef3ff;border:1.5px solid #c9d6ff;color:#22306b;font:700 14px/1.35 Nunito,system-ui,sans-serif;cursor:pointer;text-align:left';
    w.innerHTML = '<input type="checkbox" style="width:22px;height:22px;flex:none;accent-color:#3d63ff"><span><b>🌐 Công khai phòng</b><br><small style="font-weight:600;opacity:.85">Hiện ở Sảnh chung để người lạ vào chơi cùng. Tắt = chỉ ai có mã/link mới vào được.</small></span>';
    anchor.after(w);
    w.querySelector('input').onchange = e => { const on = e.target.checked; try { sessionStorage.setItem(key, on ? '1' : '0'); sessionStorage.removeItem('bgvn-pub-next'); } catch (x) {} host.setPublic(on); };
  }
  const cb = w.querySelector('input');
  if (w.dataset.code !== code || w.dataset.host !== host.pubK) { // phòng mới / chủ phòng mới (tải lại trang)
    w.dataset.code = code; w.dataset.host = host.pubK;
    const on = saved === '1' || (saved === null && wantPublic);
    cb.checked = on; if (on !== !!host.pub) host.setPublic(on);
    if (wantPublic) { wantPublic = false; try { sessionStorage.removeItem('bgvn-pub-next'); sessionStorage.setItem(key, on ? '1' : '0'); } catch (e) {} }
  }
}
// 📨 Nút "Mời bạn (QR)" ngay dưới mã phòng – ai trong phòng cũng thấy (chủ phòng lẫn khách)
function inviteBtn() {
  const codeEl = document.querySelector('#room-code, #lobby-code'); let b = document.getElementById('bgvn-invite');
  const code = codeEl ? (codeEl.textContent || '').trim() : '';
  const anchor = codeEl && (document.getElementById('code-box') || codeEl);
  if (!anchor || !anchor.offsetParent || !/^[A-Z0-9]{5}$/.test(code)) { if (b) b.remove(); return; }
  if (b && b.previousElementSibling === anchor) return;
  if (b) b.remove();
  b = document.createElement('button'); b.id = 'bgvn-invite'; b.type = 'button'; b.textContent = '📨 Mời bạn (mã QR)';
  b.style.cssText = 'display:flex';
  import('./invite.js?v=1').then(m => { m.inviteCss(); b.onclick = () => { const c = (document.querySelector('#room-code, #lobby-code').textContent || '').trim(); m.openInvite({ code: c, url: location.origin + location.pathname + '?room=' + encodeURIComponent(c) }); }; });
  anchor.after(b);
}
setInterval(() => { pubToggle(); inviteBtn(); }, 1000);
