// 🔄 Gợi ý xoay ngang điện thoại ở những game bàn rộng (vd. Tiến Lên 13 lá).
// Web không tự xoay máy được (iPhone không cho) → chỉ nhắc nhẹ khi vào bàn ở màn hình dọc; Android có thêm nút "Xoay ngang" (toàn màn hình + khoá ngang).
// Tự ẩn sau 8 giây hoặc khi đã xoay; nhắc tối đa 3 lần, bấm ✕ là thôi hẳn.
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
export function rotateHint(game, screen = '#screen-game') {
  const scr = document.querySelector(screen); if (!scr) return;
  const KEY = 'bgvn-rot-' + game, mq = matchMedia('(orientation:portrait) and (max-width:600px) and (pointer:coarse)');
  let el = null, t = 0, shown = false;
  const hide = () => { clearTimeout(t); if (el) { el.remove(); el = null; } };
  const canLock = !!(screen && window.screen.orientation && window.screen.orientation.lock && document.documentElement.requestFullscreen) && !/iPhone|iPad|iPod/i.test(navigator.userAgent);
  function check() {
    const want = scr.classList.contains('active') && mq.matches;
    if (!want) return hide();
    if (el || shown) return; /* mỗi lần mở trang chỉ nhắc một lần */
    const n = +ls.get(KEY) || 0; if (n >= 3) return;
    shown = true; ls.set(KEY, String(n + 1));
    el = document.createElement('div'); el.className = 'bgvn-rot'; el.setAttribute('role', 'status');
    el.innerHTML = `<style>.bgvn-rot{position:fixed;left:50%;top:max(64px,calc(env(safe-area-inset-top) + 58px));transform:translateX(-50%);z-index:90;display:flex;align-items:center;gap:8px;width:max-content;max-width:calc(100vw - 16px);background:#2a2340;color:#fff;border-radius:999px;padding:7px 8px 7px 14px;box-shadow:0 12px 26px -10px #000a;font:800 13.5px/1.25 Nunito,system-ui,sans-serif;animation:bgvnRot .3s ease-out}
.bgvn-rot i{font-style:normal;font-size:18px;display:inline-block;animation:bgvnTilt 1.6s ease-in-out infinite}.bgvn-rot button{flex:none;border:0;cursor:pointer;border-radius:999px;min-height:32px;font:800 13px Nunito,system-ui,sans-serif}
.bgvn-rot .go{padding:0 12px;color:#fff;background:linear-gradient(120deg,#ff4d6a,#ff7a45 55%,#ffb23d)}.bgvn-rot .x{width:32px;background:#ffffff22;color:#fff}
@keyframes bgvnRot{from{opacity:0;transform:translate(-50%,-8px)}}@keyframes bgvnTilt{0%,30%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}
@media (prefers-reduced-motion:reduce){.bgvn-rot,.bgvn-rot i{animation:none}}</style><i>📱</i><span>Xoay ngang máy để bàn rộng hơn</span>${canLock ? '<button class="go" type="button">Xoay ngang</button>' : ''}<button class="x" type="button" aria-label="Đóng">✕</button>`;
    el.querySelector('.x').onclick = () => { ls.set(KEY, '3'); hide(); };
    const go = el.querySelector('.go');
    if (go) go.onclick = async () => { try { await document.documentElement.requestFullscreen(); await window.screen.orientation.lock('landscape'); } catch (e) { try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e2) {} } hide(); };
    document.body.append(el); t = setTimeout(hide, 8000);
  }
  /* chờ 4 giây cho các lời nhắc đầu ván hiện xong rồi mới nhắc xoay */
  let w = 0; const later = () => { clearTimeout(w); if (!(scr.classList.contains('active') && mq.matches)) return hide(); w = setTimeout(check, 4000); };
  new MutationObserver(later).observe(scr, { attributes: true, attributeFilter: ['class'] });
  mq.addEventListener ? mq.addEventListener('change', later) : mq.addListener(later);
  later();
}
