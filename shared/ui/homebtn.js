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
import('./feedback.js?v=2').then(() => {
  const ft = [...document.querySelectorAll('footer, p.note')].find(e => /fan-made/i.test(e.textContent));
  const box = document.createElement('p'); box.className = 'bgvn-fbline';
  box.style.cssText = 'text-align:center;font-size:13px;margin:6px 0 0;opacity:.9';
  box.innerHTML = '<a href="#" data-feedback style="color:inherit">💌 Góp ý / báo lỗi</a> · <a href="#" data-donate style="color:inherit">☕ Ủng hộ chủ web</a>';
  if (ft) ft.after(box);
}).catch(() => {});
