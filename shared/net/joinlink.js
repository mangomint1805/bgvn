// Link mời vào phòng, dùng chung mọi game.
// Định dạng chuẩn: <trang game>/?room=MÃ. Vẫn nhận kiểu cũ/khác: ?r=MÃ, ?code=MÃ, #MÃ.
// Mở link là vào thẳng phòng (tên lưu ở localStorage 'bgvn-name'; chưa có tên thì hỏi 1 ô "Tên của bạn").
// Vào được thì xoá mã khỏi URL (tải lại trang sẽ đi đường "vào lại" bình thường qua session).
// Kết quả vào phòng nghe qua sự kiện 'bgvn-room' do shared/net/room.js phát ra.
const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/; // bảng chữ của makeCode() trong room.js
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

export function linkCode() {
  try {
    const q = new URLSearchParams(location.search);
    let c = (q.get('room') || q.get('r') || q.get('code') || '').trim().toUpperCase();
    if (!c) { const h = location.hash.replace(/^#/, ''); if (CODE_RE.test(h)) c = h; } // #MÃ (viết hoa – để khỏi nhầm #debug)
    return CODE_RE.test(c) ? c : null;
  } catch (e) { return null; }
}
export function inviteUrl(code) { return location.origin + location.pathname + '?room=' + encodeURIComponent(String(code || '').trim().toUpperCase()); }
export function clearLinkCode() {
  try {
    const q = new URLSearchParams(location.search);
    ['room', 'r', 'code'].forEach(k => q.delete(k));
    const h = location.hash.replace(/^#/, '');
    const qs = q.toString();
    history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + (h && !CODE_RE.test(h) ? '#' + h : ''));
  } catch (e) {}
}
export function savedName() { return (ls.get('bgvn-name') || ls.get('bangvn-name') || '').trim(); }

// hộp nhỏ 1 ô "Tên của bạn" → Promise<tên | null (huỷ)>
export function askName(code) {
  return new Promise(res => {
    const wrap = document.createElement('div');
    wrap.id = 'bgvn-askname';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(20,24,40,.55);backdrop-filter:blur(3px)';
    wrap.innerHTML = `<form style="background:#fff;color:#1d2433;border-radius:20px;padding:20px 18px 16px;width:min(340px,100%);box-shadow:0 18px 50px -12px rgba(0,0,0,.5);font-family:'Be Vietnam Pro',system-ui,sans-serif;text-align:center">
      <div style="font:800 20px/1.25 'Baloo 2','Be Vietnam Pro',system-ui,sans-serif;margin-bottom:4px">🎟️ Vào phòng ${code}</div>
      <label for="bgvn-askname-in" style="display:block;font-weight:700;margin:6px 0 8px">Tên của bạn</label>
      <input id="bgvn-askname-in" maxlength="16" autocomplete="nickname" enterkeyhint="go" placeholder="VD: Mai" style="width:100%;box-sizing:border-box;font:600 17px 'Be Vietnam Pro',system-ui,sans-serif;padding:11px 14px;border:2px solid #d5dbe8;border-radius:14px;outline:none;text-align:center">
      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="button" data-x style="flex:1;min-height:44px;border:0;border-radius:14px;background:#eef1f7;color:#4a5570;font:700 15px 'Be Vietnam Pro',system-ui,sans-serif;cursor:pointer">Huỷ</button>
        <button type="submit" style="flex:2;min-height:44px;border:0;border-radius:14px;background:#2f7bef;color:#fff;font:800 15px 'Be Vietnam Pro',system-ui,sans-serif;cursor:pointer">Vào phòng 🚀</button>
      </div></form>`;
    document.body.appendChild(wrap);
    const inp = wrap.querySelector('input');
    setTimeout(() => inp.focus(), 50);
    const done = v => { wrap.remove(); res(v); };
    wrap.querySelector('[data-x]').onclick = () => done(null);
    wrap.querySelector('form').onsubmit = e => {
      e.preventDefault();
      const n = inp.value.trim().slice(0, 16);
      if (!n) { inp.style.borderColor = '#e0263c'; inp.focus(); return; }
      ls.set('bgvn-name', n); done(n);
    };
  });
}

// Vào phòng từ link. join(name): game tự bấm "Vào" như bình thường; abort(): rời phòng, về trang chủ; toast(msg): thông báo.
export async function joinByLink({ code, join, abort, toast }) {
  let name = savedName();
  if (!name) { name = await askName(code); if (!name) { clearLinkCode(); return false; } }
  const off = () => removeEventListener('bgvn-room', on);
  const on = e => {
    const d = (e && e.detail) || {};
    if (d.code !== code) return;
    if (d.type === 'welcome') { off(); clearLinkCode(); return; }
    if (d.type !== 'fail' && d.type !== 'reject') return;
    off(); clearLinkCode();
    try { abort && abort(); } catch (x) {}
    const ns = document.getElementById('net-status'); if (ns) ns.style.display = 'none';
    const m = d.type === 'reject' && d.msg ? `😢 ${d.msg} (phòng ${code})` : `😢 Phòng ${code} không còn – nhờ chủ phòng gửi link mới nhé.`;
    setTimeout(() => toast && toast(m), 30);
  };
  addEventListener('bgvn-room', on);
  try { join(name); } catch (e) { off(); throw e; }
  return true;
}
