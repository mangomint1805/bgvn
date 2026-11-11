// ⚙️ Cài đặt chung BGVN (lưu trên máy này): tên mặc định, âm thanh, phòng công khai, số online, dữ liệu.
import { auth } from '../net/api.js?v=1';
import { confirmBox } from './dialog.js?v=1';
const ROOT = new URL('../../', import.meta.url).href;
const GAMES = ['bang', 'uno', 'typhu', 'tamquoc', 'meono', 'masoi', 'scribble', 'tienlen', 'poker', 'xidach', 'catte', 'bacao', 'cangua', 'camel', 'solitaire'];
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

const CSS = `.st-ov{position:fixed;inset:0;z-index:9999;background:#1a1426aa;display:grid;place-items:center;padding:14px}
.st-box{width:min(460px,100%);max-height:calc(100dvh - 28px);overflow:auto;background:#fffaf3;color:#2a2340;border-radius:22px;padding:18px;box-shadow:0 20px 60px #0006;font:600 15px/1.45 Nunito,system-ui,sans-serif;position:relative}
.st-box h2{margin:0 36px 10px 0;font:800 22px "Baloo 2",Nunito,sans-serif}
.st-x{position:absolute;top:10px;right:10px;width:38px;height:38px;border-radius:50%;border:0;background:#f0e6da;font-size:18px;cursor:pointer;color:#2a2340}
.st-sec{background:#fff;border-radius:16px;padding:10px 14px;margin:10px 0;border:1.5px solid #ecdfd0}
.st-sec h3{margin:2px 0 6px;font:800 15px Nunito,sans-serif;color:#6b5f7a}
.st-row{display:flex;align-items:center;gap:10px;min-height:44px;cursor:pointer}
.st-row span{flex:1}.st-row small{display:block;color:#8a7f96;font-weight:600;font-size:12.5px}
.st-row input[type=checkbox]{width:22px;height:22px;accent-color:#3d63ff;flex:none}
.st-box input[type=text]{width:100%;box-sizing:border-box;border:1.5px solid #e2d4c4;border-radius:12px;padding:10px 12px;font:600 16px Nunito,sans-serif}
.st-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:42px;padding:6px 14px;border-radius:999px;border:1.5px solid #ecdfd0;background:#fff;color:#2a2340;font:800 14px Nunito,sans-serif;cursor:pointer;text-decoration:none}
.st-btn.red{border-color:#f3b9c0;color:#c0263b}
.st-acts{display:flex;gap:8px;flex-wrap:wrap}`;

export function openSettings() {
  if (!document.getElementById('st-css')) { const s = document.createElement('style'); s.id = 'st-css'; s.textContent = CSS; document.head.append(s); }
  document.getElementById('st-ov')?.remove();
  const musicOn = GAMES.some(g => ls.get('bgvn-music-' + g) !== '0');
  const ov = document.createElement('div'); ov.className = 'st-ov'; ov.id = 'st-ov';
  const u = auth.user();
  ov.innerHTML = `<div class="st-box" role="dialog" aria-modal="true"><button class="st-x" aria-label="Đóng">✕</button><h2>⚙️ Cài đặt</h2>
    <div class="st-sec"><h3>👤 Tên của bạn</h3><input type="text" id="st-name" maxlength="20" placeholder="Tên hiện khi vào phòng" value="">
      <p style="margin:6px 0 0;font-size:12.5px;color:#8a7f96">${u ? 'Đang đăng nhập: ' + esc(u.name) + (u.admin ? ' · 🛠️ quản trị viên' : '') : 'Tự điền sẵn ở mọi game. Đăng nhập để giữ tên trên mọi máy.'}</p></div>
    <div class="st-sec"><h3>🔊 Âm thanh</h3>
      <label class="st-row"><input type="checkbox" id="st-music" ${musicOn ? 'checked' : ''}><span>Nhạc nền ở mọi game<small>Tắt/bật một lần cho tất cả game (vẫn chỉnh riêng trong từng game được)</small></span></label>
      <label class="st-row"><input type="checkbox" id="st-mute" ${ls.get('bgvn-mute-all') === '1' ? 'checked' : ''}><span>Tắt hết nhạc nền<small>Dùng khi đang ở chỗ cần yên lặng</small></span></label></div>
    <div class="st-sec"><h3>🌐 Chơi online</h3>
      <label class="st-row"><input type="checkbox" id="st-pub" ${ls.get('bgvn-pub-default') === '1' ? 'checked' : ''}><span>Tạo phòng là tự công khai<small>Phòng mới tự hiện ở Sảnh chung (vẫn tắt được trong phòng)</small></span></label>
      <label class="st-row"><input type="checkbox" id="st-online" ${ls.get('bgvn-hide-online') === '1' ? '' : 'checked'}><span>Hiện số người đang online</span></label></div>
    <div class="st-sec"><h3>🧰 Khác</h3><div class="st-acts">
      <a class="st-btn" href="${ROOT}luat/">⚙️ Luật mặc định</a><a class="st-btn" href="${ROOT}credits/">📜 Credits</a><a class="st-btn" href="${ROOT}privacy/">🔒 Riêng tư</a>
      ${u && u.admin ? `<a class="st-btn" href="${ROOT}quantri/">🛠️ Quản trị</a>` : ''}
      <button class="st-btn red" id="st-clear" type="button">🗑️ Xoá dữ liệu trên máy này</button></div></div>
  </div>`;
  document.body.append(ov);
  const $ = s => ov.querySelector(s);
  $('#st-name').value = ls.get('bgvn-name') || '';
  $('#st-name').onchange = e => { const v = e.target.value.trim().slice(0, 20); ls.set('bgvn-name', v); if (auth.user() && v.length >= 2) auth.rename(v); };
  $('#st-music').onchange = e => GAMES.forEach(g => ls.set('bgvn-music-' + g, e.target.checked ? '1' : '0'));
  $('#st-mute').onchange = e => ls.set('bgvn-mute-all', e.target.checked ? '1' : '0');
  $('#st-pub').onchange = e => ls.set('bgvn-pub-default', e.target.checked ? '1' : '0');
  $('#st-online').onchange = e => { ls.set('bgvn-hide-online', e.target.checked ? '0' : '1'); document.querySelectorAll('#online').forEach(el => { el.style.display = e.target.checked ? '' : 'none'; }); };
  $('#st-clear').onclick = async () => {
    if (!(await confirmBox('Tên, giao diện, luật đã chọn và ván đang chơi dở trên máy này sẽ bị xoá. Tài khoản vẫn còn trên máy chủ, bạn chỉ bị đăng xuất.', { title: '🗑️ Xoá dữ liệu trên máy này?', ok: 'Xoá hết', danger: true }))) return;
    try { Object.keys(localStorage).filter(k => /^(bgvn|bangvn|meono|uno|typhu|sol|tq|masoi|scribble|camel|cangua|poker|tienlen|xidach|catte|bacao)/i.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    location.reload();
  };
  const close = () => { ov.remove(); removeEventListener('keydown', k); };
  const k = e => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', k);
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.st-x')) close(); });
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
