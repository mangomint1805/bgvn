// 👤 Tài khoản BGVN (tuỳ chọn): nút đăng nhập + hộp đăng nhập / tạo tài khoản / Google.
// Dùng: import { mountAccount, openLogin } from '…/shared/ui/account.js?v=6'; mountAccount(element)
import { auth } from '../net/api.js?v=5';
import { promptBox, formBox } from './dialog.js?v=1';
import { avatarHTML, profileCss, openProfile } from './profile.js?v=7';

const CSS = `.ac-btn{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:6px 14px;border-radius:999px;border:1.5px solid #ecdfd0;background:#fff;color:#2a2340;font:800 14px Nunito,system-ui,sans-serif;cursor:pointer;max-width:220px}
.ac-btn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ac-btn .v{color:#2f9e5b}
.ac-menu{position:absolute;z-index:9998;background:#fff;border-radius:14px;box-shadow:0 12px 32px #2a234033;padding:6px;min-width:190px;font:700 14px Nunito,sans-serif}
.ac-menu button{display:block;width:100%;text-align:left;border:0;background:none;padding:10px 12px;border-radius:10px;cursor:pointer;color:#2a2340;font:inherit}.ac-menu button:hover{background:#f6efe6}
.ac-ov{position:fixed;inset:0;z-index:9999;background:#1a1426aa;display:grid;place-items:center;padding:14px}
.ac-box{width:min(400px,100%);max-height:calc(100dvh - 28px);overflow:auto;background:#fffaf3;color:#2a2340;border-radius:22px;padding:18px;box-shadow:0 20px 60px #0006;font:600 15px/1.45 Nunito,system-ui,sans-serif;position:relative}
.ac-box h2{margin:0 36px 4px 0;font:800 22px/1.2 "Baloo 2",Nunito,sans-serif}
.ac-x{position:absolute;top:10px;right:10px;width:38px;height:38px;border-radius:50%;border:0;background:#f0e6da;font-size:18px;cursor:pointer;color:#2a2340}
.ac-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;background:#f0e6da;border-radius:999px;padding:4px;margin:10px 0}
.ac-tabs button{border:0;border-radius:999px;min-height:38px;font:800 14px Nunito,sans-serif;background:none;color:#2a2340;cursor:pointer}.ac-tabs button[aria-pressed=true]{background:#fff;box-shadow:0 2px 6px #0001}
.ac-box label{display:block;font-weight:800;font-size:13px;margin:10px 0 4px;color:#6b5f7a}
.ac-box input{width:100%;box-sizing:border-box;border:1.5px solid #e2d4c4;border-radius:12px;padding:11px 12px;font:600 16px Nunito,sans-serif;background:#fff;color:#2a2340}
.ac-go{width:100%;margin-top:14px;border:0;border-radius:999px;min-height:48px;font:800 16px "Baloo 2",Nunito,sans-serif;color:#fff;background:linear-gradient(90deg,#ff4d5e,#ff9a3d);cursor:pointer}.ac-go:disabled{opacity:.6}
.ac-err{color:#c0263b;font-weight:700;min-height:20px;margin:8px 0 0;font-size:14px}
.ac-or{display:flex;align-items:center;gap:10px;color:#8a7f96;font-size:13px;margin:14px 0 10px}.ac-or::before,.ac-or::after{content:"";flex:1;height:1.5px;background:#ecdfd0}
.ac-g{display:flex;justify-content:center;min-height:44px}
.ac-note{font-size:12.5px;color:#8a7f96;margin-top:12px}`;
function css() { if (document.getElementById('ac-css')) return; const s = document.createElement('style'); s.id = 'ac-css'; s.textContent = CSS; document.head.append(s); }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function modal(html) {
  css(); closeModal();
  const ov = document.createElement('div'); ov.className = 'ac-ov'; ov.id = 'ac-ov';
  ov.innerHTML = `<div class="ac-box" role="dialog" aria-modal="true"><button class="ac-x" aria-label="Đóng">✕</button>${html}</div>`;
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.ac-x')) closeModal(); });
  document.body.append(ov); return ov.querySelector('.ac-box');
}
function closeModal() { document.getElementById('ac-ov')?.remove(); }

let gsi = null;
function loadGsi() { return gsi || (gsi = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = () => res(window.google); s.onerror = rej; document.head.append(s); })); }

export async function openLogin(mode = 'login') {
  const box = modal(`<h2>👤 Tài khoản BGVN</h2><p style="margin:0;color:#6b5f7a">Không bắt buộc nha – đăng nhập để giữ tên, có dấu ✓ khi chat ở Sảnh chung.</p>
    <div class="ac-tabs"><button data-m="login">Đăng nhập</button><button data-m="register">Tạo tài khoản</button></div>
    <form id="ac-f" autocomplete="on"><div id="ac-name-w"><label for="ac-name">Tên hiển thị</label><input id="ac-name" maxlength="20" autocomplete="nickname" placeholder="VD: Kẹo"></div>
    <label for="ac-u">Tên đăng nhập</label><input id="ac-u" maxlength="20" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="chữ thường không dấu, số, . _">
    <label for="ac-p">Mật khẩu</label><input id="ac-p" type="password" maxlength="100" autocomplete="current-password" placeholder="ít nhất 6 ký tự">
    <p class="ac-err" id="ac-e"></p><button class="ac-go" id="ac-go">Đăng nhập</button></form>
    <div id="ac-gw" hidden><div class="ac-or">hoặc</div><div class="ac-g" id="ac-g"></div></div>
    <p class="ac-note">Quên mật khẩu? Nhắn chủ web qua 💌 Góp ý để được đặt lại. BGVN không lưu email. · <a href="${new URL('../../privacy/', import.meta.url).href}" target="_blank" rel="noopener">Chính sách riêng tư</a></p>`);
  const setMode = m => {
    mode = m; box.querySelectorAll('.ac-tabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m));
    box.querySelector('#ac-name-w').hidden = m !== 'register'; box.querySelector('#ac-go').textContent = m === 'register' ? 'Tạo tài khoản' : 'Đăng nhập';
    box.querySelector('#ac-p').autocomplete = m === 'register' ? 'new-password' : 'current-password'; box.querySelector('#ac-e').textContent = '';
  };
  box.querySelector('.ac-tabs').onclick = e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); };
  setMode(mode);
  try { box.querySelector('#ac-name').value = localStorage.getItem('bgvn-name') || ''; } catch (e) {}
  box.querySelector('#ac-f').onsubmit = async e => {
    e.preventDefault();
    const go = box.querySelector('#ac-go'), err = box.querySelector('#ac-e');
    const u = box.querySelector('#ac-u').value.trim().toLowerCase(), p = box.querySelector('#ac-p').value;
    if (!u || !p) { err.textContent = 'Điền tên đăng nhập và mật khẩu nha'; return; }
    go.disabled = true; err.textContent = '';
    const r = mode === 'register' ? await auth.register(u, p, box.querySelector('#ac-name').value.trim()) : await auth.login(u, p);
    go.disabled = false;
    if (r.ok) { closeModal(); toast(`Chào ${r.user.name} 👋`); } else err.textContent = r.msg || 'Có lỗi, thử lại nha';
  };
  // Google (nếu chủ web đã bật)
  const cfg = await auth.config();
  if (cfg && cfg.google) {
    try {
      const g = await loadGsi(); box.querySelector('#ac-gw').hidden = false;
      g.accounts.id.initialize({ client_id: cfg.google, callback: async resp => { const r = await auth.google(resp.credential); if (r.ok) { closeModal(); toast(`Chào ${r.user.name} 👋`); } else box.querySelector('#ac-e').textContent = r.msg || 'Không đăng nhập được bằng Google'; } });
      g.accounts.id.renderButton(box.querySelector('#ac-g'), { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: 'vi', width: Math.min(320, box.clientWidth - 40) });
    } catch (e) {}
  }
}

function toast(t) {
  css(); const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10000;background:#2a2340;color:#fff;padding:10px 18px;border-radius:999px;font:800 15px Nunito,sans-serif;box-shadow:0 8px 24px #0004;max-width:90vw;text-align:center';
  d.textContent = t; document.body.append(d); setTimeout(() => d.remove(), 2600);
}

function menu(anchor) {
  document.querySelector('.ac-menu')?.remove();
  const m = document.createElement('div'); m.className = 'ac-menu';
  const u = auth.user();
  m.innerHTML = `<div style="padding:8px 12px;color:#8a7f96;font-size:13px">${u.username ? '@' + esc(u.username) : 'Tài khoản Google'}</div>${u.admin ? '<button data-a="admin">🛠️ Quản trị BGVN</button>' : ''}<button data-a="prof">🏅 Hồ sơ &amp; thành tích</button><button data-a="set">⚙️ Cài đặt</button><button data-a="name">✏️ Đổi tên hiển thị</button>${u.username ? '<button data-a="pw">🔑 Đổi mật khẩu</button>' : ''}<button data-a="out">🚪 Đăng xuất</button>`;
  document.body.append(m);
  const r = anchor.getBoundingClientRect(); m.style.top = (r.bottom + scrollY + 6) + 'px'; m.style.left = Math.max(8, Math.min(r.right + scrollX - m.offsetWidth, innerWidth - m.offsetWidth - 8)) + 'px';
  const off = e => { if (!m.contains(e.target)) { m.remove(); removeEventListener('pointerdown', off, true); } };
  setTimeout(() => addEventListener('pointerdown', off, true), 0);
  m.onclick = async e => {
    const a = e.target.closest('button')?.dataset.a; if (!a) return; m.remove();
    if (a === 'out') { await auth.logout(); toast('Đã đăng xuất'); }
    if (a === 'admin') location.href = new URL('../../quantri/', import.meta.url).href;
    if (a === 'prof') openProfile();
    if (a === 'set') import('./settings.js?v=11').then(m => m.openSettings());
    if (a === 'name') { const n = await promptBox('Tên này hiện khi bạn vào phòng và chat (2–20 ký tự).', { title: '✏️ Đổi tên hiển thị', value: u.name, maxlength: 20, ok: 'Đổi tên', required: true }); if (n) { const r = await auth.rename(n); toast(r.ok ? 'Đổi tên rồi nè ✨' : r.msg); } }
    if (a === 'pw') {
      const v = await formBox('🔑 Đổi mật khẩu', [{ id: 'o', label: 'Mật khẩu hiện tại', type: 'password', autocomplete: 'current-password' }, { id: 'n', label: 'Mật khẩu mới (ít nhất 6 ký tự)', type: 'password', autocomplete: 'new-password', maxlength: 100 }], { ok: 'Đổi mật khẩu', validate: v => !v.o ? 'Nhập mật khẩu hiện tại nha' : v.n.length < 6 ? 'Mật khẩu mới cần ít nhất 6 ký tự' : '' });
      if (!v) return; const r = await auth.password(v.o, v.n); toast(r.ok ? 'Đổi mật khẩu rồi 🔑' : r.msg);
    }
  };
}

export function mountAccount(el) {
  css();
  const draw = u => {
    el.innerHTML = u ? `<button class="ac-btn" type="button" aria-haspopup="menu" style="padding-left:5px">${avatarHTML(30)} <span>${esc(u.name)}</span> <b class="v" title="Đã đăng nhập">✓</b></button>` : `<button class="ac-btn" type="button">👤 <span>Đăng nhập</span></button>`;
    el.firstElementChild.onclick = e => u ? menu(e.currentTarget) : openLogin();
  };
  profileCss(); draw(auth.user()); auth.onChange(draw); addEventListener('bgvn-avatar', () => draw(auth.user()));
  if (auth.user()) auth.refresh(); // phiên hết hạn → tự đăng xuất
}
