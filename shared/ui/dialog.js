// 💬 Hộp thoại BGVN – thay cho alert / confirm / prompt xám xịt của trình duyệt.
// import { confirmBox, promptBox, alertBox, chooseBox, formBox, toast } from '…/shared/ui/dialog.js?v=1'
//   await confirmBox('Xoá thật nha?', { title, ok: 'Xoá', danger: true })   → true / false
//   await promptBox('Tên mới:', { value, placeholder, maxlength, type })     → chuỗi / null
//   await chooseBox('Làm gì với tin này?', [{ id, label, danger }])           → id / null
//   await formBox('Đổi mật khẩu', [{ id, label, type, placeholder }])         → { id: giá trị } / null
const CSS = `.dg-ov{position:fixed;inset:0;z-index:10050;background:#1a1426b3;display:grid;place-items:center;padding:16px;animation:dg-f .16s ease-out;backdrop-filter:blur(3px)}
.dg-box{width:min(400px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fffaf3;color:#2a2340;border-radius:24px;padding:22px 20px 18px;box-shadow:0 24px 70px #0008;font:600 15.5px/1.5 Nunito,system-ui,sans-serif;animation:dg-p .22s cubic-bezier(.2,1.2,.4,1)}
.dg-box h2{margin:0 0 6px;font:800 21px/1.25 "Baloo 2",Nunito,sans-serif}
.dg-box p{margin:0 0 4px;color:#4a405c;white-space:pre-line}
.dg-box label{display:block;font-weight:800;font-size:13px;margin:12px 0 4px;color:#6b5f7a}
.dg-box input{width:100%;box-sizing:border-box;border:1.5px solid #e2d4c4;border-radius:13px;padding:11px 13px;font:600 16px Nunito,sans-serif;background:#fff;color:#2a2340;outline:none}
.dg-box input:focus{border-color:#7b61ff;box-shadow:0 0 0 3px #7b61ff33}
.dg-err{color:#c0263b;font-weight:800;font-size:13.5px;min-height:18px;margin-top:6px}
.dg-acts{display:flex;gap:10px;margin-top:16px}.dg-acts.col{flex-direction:column}
.dg-b{flex:1;min-height:46px;border-radius:999px;border:1.5px solid #e6d8c8;background:#fff;color:#2a2340;font:800 15.5px "Baloo 2",Nunito,sans-serif;cursor:pointer;padding:6px 16px;transition:transform .1s,filter .15s}
.dg-b:hover{filter:brightness(1.04)}.dg-b:active{transform:scale(.97)}
.dg-b.ok{border:0;color:#fff;background:linear-gradient(90deg,#ff4d6a,#ff9a3d);box-shadow:0 8px 18px -8px #ff4d5ecc}
.dg-b.danger{border:0;color:#fff;background:linear-gradient(90deg,#e0384a,#c0263b);box-shadow:0 8px 18px -8px #c0263bcc}
.dg-b.ghost{border-color:transparent;background:#f3e9dc}
.dg-toast{position:fixed;left:50%;bottom:max(24px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:10060;background:#2a2340;color:#fff;padding:11px 20px;border-radius:999px;font:800 15px Nunito,sans-serif;box-shadow:0 10px 28px #0005;max-width:90vw;text-align:center;animation:dg-p .25s cubic-bezier(.2,1.2,.4,1)}
@keyframes dg-f{from{opacity:0}}@keyframes dg-p{from{opacity:0;transform:translateY(10px) scale(.96)}}
@media (prefers-reduced-motion:reduce){.dg-ov,.dg-box,.dg-toast{animation:none}}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function css() { if (document.getElementById('dg-css')) return; const s = document.createElement('style'); s.id = 'dg-css'; s.textContent = CSS; document.head.append(s); }

// lõi: dựng hộp, trả Promise; done(v) đóng hộp và trả v
function open(build) {
  css();
  return new Promise(res => {
    const prev = document.activeElement, ov = document.createElement('div'); ov.className = 'dg-ov';
    const box = document.createElement('div'); box.className = 'dg-box'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); ov.append(box);
    let closed = false;
    const done = v => { if (closed) return; closed = true; removeEventListener('keydown', key, true); ov.remove(); try { prev && prev.focus && prev.focus(); } catch (e) {} res(v); };
    const api = { box, done, cancel: () => done(null), submit: null };
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); api.cancel(); }
      else if (e.key === 'Enter' && api.submit && !e.isComposing && e.target.tagName !== 'BUTTON') { e.preventDefault(); api.submit(); }
      else if (e.key === 'Tab') { const f = [...box.querySelectorAll('input,button')]; if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    };
    addEventListener('keydown', key, true);
    ov.addEventListener('pointerdown', e => { if (e.target === ov) api.cancel(); });
    build(api); document.body.append(ov);
    (box.querySelector('input') || box.querySelector('.dg-b.ok') || box.querySelector('button'))?.focus(); // nút nguy hiểm không bao giờ được chọn sẵn
  });
}
const head = (title, text) => (title ? `<h2>${esc(title)}</h2>` : '') + (text ? `<p>${esc(text)}</p>` : '');

export function alertBox(text, { title = '', ok = 'Đã hiểu' } = {}) {
  return open(d => { d.box.innerHTML = head(title, text) + `<div class="dg-acts"><button class="dg-b ok" type="button">${esc(ok)}</button></div>`; d.box.querySelector('.dg-b').onclick = () => d.done(true); d.submit = () => d.done(true); d.cancel = () => d.done(true); }).then(() => {});
}
export function confirmBox(text, { title = '', ok = 'Đồng ý', cancel = 'Thôi', danger = false } = {}) {
  return open(d => {
    d.box.innerHTML = head(title, text) + `<div class="dg-acts"><button class="dg-b ghost" type="button" data-v="0">${esc(cancel)}</button><button class="dg-b ${danger ? 'danger' : 'ok'}" type="button" data-v="1">${esc(ok)}</button></div>`;
    d.box.querySelectorAll('.dg-b').forEach(b => b.onclick = () => d.done(b.dataset.v === '1')); d.submit = () => d.done(true); d.cancel = () => d.done(false);
  });
}
export function formBox(title, fields, { text = '', ok = 'Lưu', cancel = 'Thôi', validate = null } = {}) {
  return open(d => {
    d.box.innerHTML = head(title, text) + fields.map((f, i) => `${f.label ? `<label for="dg-i${i}">${esc(f.label)}</label>` : '<div style="height:8px"></div>'}<input id="dg-i${i}" type="${f.type || 'text'}" ${f.maxlength ? `maxlength="${+f.maxlength}"` : ''} placeholder="${esc(f.placeholder || '')}" value="${esc(f.value || '')}" autocomplete="${f.autocomplete || 'off'}" ${f.type === 'password' ? '' : 'autocapitalize="sentences"'}>`).join('')
      + `<div class="dg-err" role="alert"></div><div class="dg-acts"><button class="dg-b ghost" type="button" data-v="0">${esc(cancel)}</button><button class="dg-b ok" type="button" data-v="1">${esc(ok)}</button></div>`;
    const vals = () => Object.fromEntries(fields.map((f, i) => [f.id, d.box.querySelector('#dg-i' + i).value]));
    d.submit = () => { const v = vals(), err = validate ? validate(v) : ''; if (err) { d.box.querySelector('.dg-err').textContent = err; return; } d.done(v); };
    d.box.querySelector('[data-v="0"]').onclick = () => d.cancel(); d.box.querySelector('[data-v="1"]').onclick = () => d.submit();
    const first = d.box.querySelector('input'); if (first && first.value) setTimeout(() => first.select(), 0);
  });
}
export function promptBox(text, { title = '', value = '', placeholder = '', maxlength = 0, type = 'text', ok = 'Xong', cancel = 'Thôi', required = false } = {}) {
  return formBox(title || text, [{ id: 'v', value, placeholder, maxlength, type }], { text: title ? text : '', ok, cancel, validate: v => required && !v.v.trim() ? 'Chưa nhập gì nè' : '' }).then(r => r ? r.v : null);
}
export function chooseBox(title, choices, { text = '', cancel = 'Thôi' } = {}) {
  return open(d => {
    d.box.innerHTML = head(title, text) + `<div class="dg-acts col">${choices.map(c => `<button class="dg-b ${c.danger ? 'danger' : ''}" type="button" data-id="${esc(c.id)}">${esc(c.label)}</button>`).join('')}<button class="dg-b ghost" type="button" data-id="">${esc(cancel)}</button></div>`;
    d.box.querySelectorAll('.dg-b').forEach(b => b.onclick = () => d.done(b.dataset.id || null));
  });
}
export function toast(text, ms = 2600) { css(); document.querySelector('.dg-toast')?.remove(); const t = document.createElement('div'); t.className = 'dg-toast'; t.setAttribute('role', 'status'); t.textContent = text; document.body.append(t); setTimeout(() => t.remove(), ms); }
