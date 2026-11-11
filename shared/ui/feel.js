// ✨ Cảm giác bấm chung: rung nhẹ trên điện thoại + tiếng "tách" nhỏ ở giao diện chung (trang chủ, trang phụ, hộp thoại, cài đặt, sảnh).
// Trong ván chơi mỗi game có âm thanh riêng nên ở đó chỉ rung, không kêu thêm.
// Tắt trong ⚙️ Cài đặt: bgvn-ui-sfx = '0' (tiếng), bgvn-haptic = '0' (rung); "Tắt hết nhạc nền" không ảnh hưởng tiếng nút.
import './inapp.js?v=1'; /* nhắc mở bằng Safari/Chrome khi đang ở trình duyệt nhúng của Zalo, Facebook… */
// Giao diện chung (hộp thoại, thông báo nổi, hồ sơ, tin mới…) viết bằng Nunito + Baloo 2. Game nào không tự nạp 2 phông này thì nạp giúp,
// kẻo chữ Việt rơi về phông máy và mỗi chữ một kiểu.
{ const have = f => [...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some(l => l.href.includes('family=' + f)), need = [];
  if (!have('Nunito')) need.push('family=Nunito:wght@600;700;800'); if (!have('Baloo+2')) need.push('family=Baloo+2:wght@700;800');
  if (need.length) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?' + need.join('&') + '&display=swap'; document.head.append(l); } }
const on = k => { try { return localStorage.getItem(k) !== '0'; } catch (e) { return true; } };
const SHARED = '.dg-box,.st-box,.ac-box,.ac-menu,.bgvn-news,.lb,.lb-ov,#bgvn-fb,.bgvn-chip,[data-ui-sfx]';
let ac = null, last = 0;
function tick(hi) {
  const now = performance.now(); if (now - last < 45) return; last = now;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(hi ? 880 : 620, t); o.frequency.exponentialRampToValueAtTime(hi ? 1320 : 360, t + .055);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.055, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + .075);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .09);
  } catch (e) {}
}
addEventListener('pointerdown', e => {
  const t = e.target.closest && e.target.closest('button,a[href],[role="button"],select,input[type="checkbox"],input[type="radio"],label.st-row');
  if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true') return;
  if (on('bgvn-haptic') && e.pointerType === 'touch' && navigator.vibrate) { try { navigator.vibrate(8); } catch (err) {} }
  if (on('bgvn-ui-sfx') && (document.documentElement.dataset.uiSfx === '1' || t.closest(SHARED))) tick(t.matches('.btn-main,.dg-b.ok,.ac-go,.play') || !!t.closest('.tile'));
}, { capture: true, passive: true });
export const uiTick = tick;
