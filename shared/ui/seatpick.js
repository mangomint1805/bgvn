// Chọn đối thủ NGAY TRÊN BÀN (dùng chung mọi game BGVN)
// Ghế hợp lệ sáng viền + nhấp nháy + 🎯; ghế không chọn được bị mờ kèm lý do ("hết bài", "ngoài tầm"…).
// Thanh nhắc mảnh (không che bàn) nói đang chọn gì + nút "✕ Huỷ". Phím: Tab/Enter chọn ghế, Esc huỷ.
// Game tự vẽ lại ghế bao nhiêu lần cũng được: module theo dõi khung ghế (MutationObserver) và gắn lại dấu.
// Không thấy ghế trên màn hình (bố cục quá nhỏ / bị ẩn) → gọi cfg.fallback() (danh sách cũ) nếu có.
//
// startPick(cfg) / syncPick(cfg) – cfg:
//   key        định danh phiên chọn (syncPick cùng key chỉ cập nhật, không mở lại)
//   root       phần tử chứa ghế (theo dõi để gắn lại dấu khi game vẽ lại)
//   seat(id)   → phần tử ghế của người chơi id
//   items      [{ id, ok, reason, sel }] hoặc hàm trả về mảng đó (tính lại mỗi lần vẽ)
//   title      chữ trên thanh nhắc (HTML, tự escape tên trước khi truyền); banner:false = không hiện thanh
//   pos        'top' | 'bottom' (mặc định 'top')
//   glow       selector phần tử bên trong ghế để vẽ vòng sáng (mặc định chính ghế)
//   cancelable mặc định true; onCancel()
//   onPick(id) chọn xong (sau hiệu ứng xác nhận ngắn); keep:true = chọn nhiều, phiên chưa kết thúc
//   valid()    trả false → tự đóng phiên (vd. hết lượt)
//   fallback() khi không thấy ghế
const CSS = `
.sp-ok{cursor:pointer!important;outline:none}
.sp-ring{animation:spPulse 1.05s ease-in-out infinite!important;box-shadow:0 0 0 3px #fff,0 0 0 6px var(--sp-c,#ff3b6b),0 0 22px 6px var(--sp-c,#ff3b6b)!important;z-index:2}
.sp-ok:focus-visible .sp-ring,.sp-ok.sp-ring:focus-visible{box-shadow:0 0 0 3px #fff,0 0 0 7px #2f6bff,0 0 24px 8px #2f6bff!important}
.sp-mark{position:absolute;top:-10px;right:-10px;width:26px;height:26px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1;box-shadow:0 2px 8px -2px #0008,0 0 0 2px var(--sp-c,#ff3b6b);z-index:6;pointer-events:none;animation:spMark 1.05s ease-in-out infinite}
.sp-sel .sp-mark{background:var(--sp-c,#ff3b6b);color:#fff;animation:none}
.sp-sel.sp-ring,.sp-sel .sp-ring{animation:none!important;box-shadow:0 0 0 3px #fff,0 0 0 7px #16a34a,0 0 22px 6px #16a34a!important}
.sp-no{opacity:.5!important;filter:grayscale(.85)!important;cursor:not-allowed!important}
.sp-why{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis;background:#3b3346;color:#fff;font:700 11px/1.25 "Be Vietnam Pro",system-ui,sans-serif;padding:2px 7px;border-radius:999px;z-index:6;pointer-events:none;box-shadow:0 2px 6px -2px #0007}
.sp-under{visibility:hidden!important}
.sp-hit{animation:spHit .32s ease-out!important}
.sp-shake{animation:spShake .32s ease-out!important}
#sp-banner{position:fixed;left:50%;transform:translateX(-50%);z-index:var(--sp-z,35);width:max-content;max-width:calc(100vw - 16px);display:flex;align-items:center;gap:8px;padding:6px 6px 6px 14px;border-radius:999px;background:#2b2433f2;color:#fff;font:600 14px/1.3 "Be Vietnam Pro",system-ui,sans-serif;box-shadow:0 8px 24px -10px #000a,0 0 0 2px var(--sp-c,#ff3b6b);animation:spIn .22s ease-out;pointer-events:auto}
#sp-banner.top{top:calc(env(safe-area-inset-top,0px) + var(--sp-top,8px))}
#sp-banner.bottom{bottom:calc(env(safe-area-inset-bottom,0px) + var(--sp-bot,10px))}
#sp-banner .sp-t{min-width:0;overflow:hidden;text-overflow:ellipsis}
#sp-banner .sp-t b{color:#ffd23f}
#sp-banner .sp-x{flex:none;min-height:40px;min-width:40px;padding:0 14px;border:0;border-radius:999px;background:#fff;color:#2b2433;font:800 14px/1 "Be Vietnam Pro",system-ui,sans-serif;cursor:pointer}
#sp-banner .sp-x:focus-visible{outline:3px solid #2f6bff;outline-offset:2px}
#sp-banner.flash{animation:spShake .32s}
@keyframes spPulse{50%{box-shadow:0 0 0 3px #fff,0 0 0 9px var(--sp-c,#ff3b6b),0 0 30px 12px var(--sp-c,#ff3b6b)}}
@keyframes spMark{50%{transform:scale(1.18) rotate(-12deg)}}
@keyframes spHit{0%{filter:brightness(1)}40%{filter:brightness(1.5) drop-shadow(0 0 14px #ffd23f)}100%{filter:brightness(1)}}
@keyframes spShake{25%{translate:-5px 0}75%{translate:5px 0}}
@keyframes spIn{from{opacity:0;translate:0 -8px}}
@media (prefers-reduced-motion:reduce){.sp-ring,.sp-mark,.sp-hit,.sp-shake,#sp-banner,#sp-banner.flash{animation:none!important}}
@media (max-width:420px){#sp-banner{font-size:13px}.sp-why{font-size:10px;max-width:96px}}
`;
let styled = false;
function style() { if (styled) return; styled = true; const s = document.createElement('style'); s.id = 'sp-style'; s.textContent = CSS; document.head.appendChild(s); }

let S = null; // phiên đang chạy
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const items = () => (typeof S.cfg.items === 'function' ? S.cfg.items() : S.cfg.items) || [];

export const pickActive = key => !!S && (key == null || S.cfg.key === key || (typeof key === 'string' && key.endsWith('*') && String(S.cfg.key).startsWith(key.slice(0, -1))));
export const pickKey = () => S ? S.cfg.key : null;

function visible(el) {
  if (!el || !el.isConnected) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 20 || r.height < 20) return false;
  if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false;
  const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none';
}

function clearEl(el) {
  if (!el) return;
  el.classList.remove('sp-ok', 'sp-no', 'sp-sel', 'sp-ring', 'sp-hit', 'sp-shake');
  el.querySelectorAll('.sp-ring').forEach(x => x.classList.remove('sp-ring'));
  el.querySelectorAll(':scope .sp-mark, :scope .sp-why').forEach(x => x.remove());
  if (el.dataset.spTab != null) { if (el.dataset.spTab === '') el.removeAttribute('tabindex'); else el.setAttribute('tabindex', el.dataset.spTab); delete el.dataset.spTab; }
  if (el.dataset.spRole != null) { if (el.dataset.spRole === '') el.removeAttribute('role'); else el.setAttribute('role', el.dataset.spRole); delete el.dataset.spRole; }
  if (el.dataset.spAria != null) { if (el.dataset.spAria === '') el.removeAttribute('aria-label'); else el.setAttribute('aria-label', el.dataset.spAria); delete el.dataset.spAria; }
  if (el.dataset.spPos) { el.style.position = ''; delete el.dataset.spPos; }
  el.querySelectorAll('[data-sp-pos]').forEach(x => { x.style.position = ''; delete x.dataset.spPos; });
  delete el.dataset.sp; delete el.dataset.spSig;
  el.removeAttribute('aria-disabled');
}
const posOk = el => { if (getComputedStyle(el).position === 'static') { el.style.position = 'relative'; el.dataset.spPos = '1'; } };

function decorate() {
  if (!S) return;
  if (S.cfg.valid && !S.cfg.valid()) { endPick(); return; }
  const list = items(); const seen = new Set();
  for (const it of list) {
    const el = S.cfg.seat(it.id); if (!el) continue; seen.add(el);
    const sig = `${it.ok ? 1 : 0}|${it.reason || ''}|${it.sel ? 1 : 0}`;
    if (el.dataset.spSig === sig && el.dataset.sp) continue;
    clearEl(el);
    el.dataset.sp = it.ok ? 'ok' : 'no'; el.dataset.spSig = sig; el.dataset.spId = it.id;
    el.dataset.spTab = el.getAttribute('tabindex') ?? ''; el.dataset.spRole = el.getAttribute('role') ?? ''; el.dataset.spAria = el.getAttribute('aria-label') ?? '';
    posOk(el);
    const name = it.name || (el.dataset.spAria || el.textContent || '').trim().split('\n')[0].slice(0, 40);
    if (it.ok) {
      el.classList.add('sp-ok'); if (it.sel) el.classList.add('sp-sel');
      el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Chọn ${it.name || name}`);
      const g = (S.cfg.glow && el.querySelector(S.cfg.glow)) || el; g.classList.add('sp-ring');
      if (g !== el) { if (getComputedStyle(g).position === 'static') { g.style.position = 'relative'; g.dataset.spPos = '1'; } }
      const m = document.createElement('span'); m.className = 'sp-mark'; m.setAttribute('aria-hidden', 'true'); m.textContent = it.sel ? '✓' : '🎯'; g.appendChild(m);
    } else {
      el.classList.add('sp-no'); el.setAttribute('tabindex', '-1'); el.setAttribute('aria-disabled', 'true');
      if (it.reason) { const w = document.createElement('span'); w.className = 'sp-why'; w.textContent = it.reason; el.appendChild(w); }
    }
  }
  // ghế đã được dấu nhưng không còn trong danh sách (vd. người vừa chết) → gỡ dấu
  if (S.cfg.root) S.cfg.root.querySelectorAll('[data-sp]').forEach(el => { if (!seen.has(el)) clearEl(el); });
  place(document.getElementById('sp-banner'));
}

function banner() {
  let b = document.getElementById('sp-banner');
  if (!S || S.cfg.banner === false) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'sp-banner'; b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite'); document.body.appendChild(b); }
  b.className = S.cfg.pos === 'bottom' ? 'bottom' : 'top';
  if (S.cfg.z) b.style.setProperty('--sp-z', S.cfg.z); else b.style.removeProperty('--sp-z');
  if (S.cfg.offset != null) b.style.setProperty(S.cfg.pos === 'bottom' ? '--sp-bot' : '--sp-top', S.cfg.offset + 'px');
  const can = S.cfg.cancelable !== false;
  const html = `<span class="sp-t">${S.cfg.title || '🎯 Chạm vào người bạn muốn chọn'}</span>${can ? '<button type="button" class="sp-x" aria-label="Huỷ chọn (Esc)">✕ Huỷ</button>' : ''}`;
  place(b);
  if (b.dataset.html !== html) { b.innerHTML = html; b.dataset.html = html; const x = b.querySelector('.sp-x'); if (x) x.onclick = e => { e.stopPropagation(); cancelPick(); }; place(b); }
}

// anchor: đặt thanh nhắc đè lên 1 vùng không quan trọng lúc chọn (vd. dòng gợi ý), không che ghế
function place(b) {
  if (!S || !b) return;
  const a = S.cfg.anchor && (typeof S.cfg.anchor === 'function' ? S.cfg.anchor() : S.cfg.anchor);
  document.querySelectorAll('.sp-under').forEach(x => { if (x !== a) x.classList.remove('sp-under'); });
  if (!a || !a.isConnected || !a.getBoundingClientRect().height) { b.style.top = ''; b.style.bottom = ''; return; }
  a.classList.add('sp-under');
  const r = a.getBoundingClientRect(), h = b.offsetHeight || 52;
  b.className = 'anch'; b.style.bottom = 'auto';
  b.style.top = Math.max(4, Math.min(innerHeight - h - 4, r.top + r.height / 2 - h / 2)) + 'px';
}
addEventListener('resize', () => place(document.getElementById('sp-banner')));
function flash(el, why) {
  if (el) { el.classList.remove('sp-shake'); void el.offsetWidth; el.classList.add('sp-shake'); setTimeout(() => el.classList.remove('sp-shake'), 340); }
  const b = document.getElementById('sp-banner');
  if (b && why) { const t = b.querySelector('.sp-t'); const old = S && S.cfg.title; t.textContent = '⛔ ' + why; b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); clearTimeout(flash.t); flash.t = setTimeout(() => { if (S && t.isConnected) { t.innerHTML = old; } }, 1600); }
  else if (why && S && S.cfg.onDenied) S.cfg.onDenied(why);
}

function pick(el) {
  if (!S || S.busy) return;
  const id = el.dataset.spId, cfg = S.cfg;
  if (el.dataset.sp !== 'ok') { flash(el, (items().find(i => String(i.id) === String(id)) || {}).reason); return; }
  if (cfg.keep) { el.classList.add('sp-hit'); cfg.onPick(id, el); return; }
  S.busy = true; el.classList.add('sp-hit');
  const go = () => { if (S && S.cfg === cfg) endPick(); cfg.onPick(id, el); };
  if (reduced()) go(); else setTimeout(go, 230);
}

function onClick(e) {
  if (!S) return;
  const el = e.target.closest && e.target.closest('[data-sp]');
  if (!el || (S.cfg.root && !S.cfg.root.contains(el))) return;
  e.preventDefault(); e.stopPropagation();
  pick(el);
}
function onKey(e) {
  if (!S) return;
  if (e.key === 'Escape') {
    // hộp thoại đang mở thì để hộp thoại xử lý Esc trước
    if (document.querySelector('.modal.open, .modal.show, #modal.open, #modal.show')) return;
    if (S.cfg.cancelable !== false) { e.preventDefault(); cancelPick(); }
    return;
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.closest) {
    const el = e.target.closest('[data-sp]');
    if (el && (!S.cfg.root || S.cfg.root.contains(el))) { e.preventDefault(); e.stopPropagation(); pick(el); }
  }
}

let mo = null, queued = false;
function observe() {
  if (mo) mo.disconnect();
  if (!S || !S.cfg.root) return;
  mo = new MutationObserver(() => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; decorate(); }); });
  mo.observe(S.cfg.root, { childList: true, subtree: true });
}

// Mở phiên chọn. Trả về true nếu chọn trên bàn, false nếu đã chuyển sang danh sách dự phòng.
export function startPick(cfg) {
  style();
  if (S) endPick();
  const list = (typeof cfg.items === 'function' ? cfg.items() : cfg.items) || [];
  const okSeats = list.filter(i => i.ok).map(i => cfg.seat(i.id));
  if (cfg.fallback && (!okSeats.length || okSeats.some(el => !visible(el)))) { cfg.fallback(); return false; }
  S = { cfg, busy: false };
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
  observe(); decorate(); banner();
  if (S && cfg.focus !== false && document.documentElement.dataset.spKbd === '1') { const f = S.cfg.root && S.cfg.root.querySelector('[data-sp="ok"]'); if (f) f.focus({ preventScroll: true }); }
  return true;
}
// Gọi mỗi lần game vẽ lại (bang/tamquoc): cùng key thì chỉ cập nhật
export function syncPick(cfg) {
  if (S && S.cfg.key === cfg.key) { S.cfg = cfg; S.busy = false; if (mo && cfg.root) observe(); decorate(); banner(); return true; }
  return startPick(cfg);
}
export function endPick() {
  if (!S) return;
  const root = S.cfg.root; S = null;
  if (mo) { mo.disconnect(); mo = null; }
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('keydown', onKey, true);
  if (root) root.querySelectorAll('[data-sp]').forEach(clearEl);
  const b = document.getElementById('sp-banner'); if (b) b.remove();
  document.querySelectorAll('.sp-under').forEach(x => x.classList.remove('sp-under'));
}
export function cancelPick() {
  if (!S || S.cfg.cancelable === false) return;
  const f = S.cfg.onCancel; endPick(); if (f) f();
}
// nhớ người dùng đang dùng bàn phím (để tự focus ghế đầu tiên khi mở phiên)
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', e => { if (e.key === 'Tab') document.documentElement.dataset.spKbd = '1'; }, true);
  document.addEventListener('pointerdown', () => { document.documentElement.dataset.spKbd = '0'; }, true);
}
