// 💌 Góp ý / báo lỗi + ☕ Ủng hộ chủ web – dùng chung cho trang chủ và các game.
// Góp ý gửi tới máy chủ BGVN trên Cloudflare (POST /feedback, chủ web đọc ở https://api.boardgamevui.com/admin).
// Không tới được Cloudflare thì gửi dự phòng vào Firebase: feedback/<id>.
import { FIREBASE } from '../net/fbrelay.js';
import { cfHttp } from '../net/cfrelay.js';
const apiBase = () => cfHttp();

const V = '10.12.2';
const ROOT = new URL('../../', import.meta.url).href; // gốc web (dù đang ở trang game nào)
const GAMES = { '': 'Trang chủ / chung', bang: 'CÀ ĐÙNG!', uno: 'UNÔ', typhu: 'Cờ Tỷ Phú', tamquoc: 'Tam Quốc Sát', meono: 'Mèo Nổ', masoi: 'Ma Sói', scribble: 'Scribble', tienlen: 'Tiến Lên', poker: 'Poker', xidach: 'Xì Dách', catte: 'Cát Tê', bacao: 'Ba Cào', cangua: 'Cờ Cá Ngựa', camel: 'Đua Lạc Đà', solitaire: 'Xếp bài' };
const curGame = () => { const seg = location.pathname.replace(/\/+$/, '').split('/').pop(); return GAMES[seg] !== undefined && seg !== '' ? seg : ''; };

const CSS = `.fb-ov{position:fixed;inset:0;z-index:9999;background:#1a1426aa;display:grid;place-items:center;padding:14px;animation:fbIn .2s}
@keyframes fbIn{from{opacity:0}}
.fb-box{width:min(440px,100%);max-height:calc(100dvh - 28px);overflow:auto;background:#fffaf3;color:#2a2340;border-radius:22px;padding:18px 18px 16px;box-shadow:0 20px 60px #0006;font:500 15px/1.45 Nunito,system-ui,sans-serif;position:relative}
.fb-box h2{margin:0 36px 6px 0;font:800 21px/1.2 "Baloo 2",Nunito,sans-serif}
.fb-box p{margin:6px 0}
.fb-x{position:absolute;top:10px;right:10px;width:38px;height:38px;border-radius:50%;border:0;background:#f0e6da;font-size:18px;cursor:pointer;color:#2a2340}
.fb-chips{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
.fb-chips button{border:1.5px solid #e2d4c4;background:#fff;border-radius:999px;padding:7px 12px;font:800 14px Nunito,sans-serif;cursor:pointer;color:#2a2340;min-height:40px}
.fb-chips button[aria-pressed=true]{background:#2a2340;color:#fff;border-color:#2a2340}
.fb-box label{display:block;font-weight:800;font-size:13px;margin:10px 0 4px;color:#6b5f7a}
.fb-box select,.fb-box textarea,.fb-box input{width:100%;box-sizing:border-box;border:1.5px solid #e2d4c4;border-radius:12px;padding:10px 12px;font:500 15px Nunito,sans-serif;background:#fff;color:#2a2340}
.fb-box textarea{min-height:120px;resize:vertical}
.fb-count{text-align:right;font-size:12px;color:#8a7f96}
.fb-send{width:100%;margin-top:12px;border:0;border-radius:999px;min-height:48px;font:800 16px "Baloo 2",Nunito,sans-serif;color:#fff;background:linear-gradient(90deg,#ff4d5e,#ff9a3d);cursor:pointer}
.fb-send:disabled{opacity:.55;cursor:default}
.fb-note{font-size:12.5px;color:#8a7f96}
.fb-ok{text-align:center;padding:14px 0}.fb-ok b{font-size:40px;display:block}
.fb-qr{display:block;width:min(300px,100%);margin:10px auto;border-radius:14px;box-shadow:0 6px 20px #0002}
.fb-tip{background:#fff1d6;border-radius:12px;padding:8px 12px;font-size:13.5px}`;

function ensureCss() { if (document.getElementById('fb-css')) return; const s = document.createElement('style'); s.id = 'fb-css'; s.textContent = CSS; document.head.append(s); }
function modal(html) {
  ensureCss(); close();
  const ov = document.createElement('div'); ov.className = 'fb-ov'; ov.id = 'fb-ov';
  ov.innerHTML = `<div class="fb-box" role="dialog" aria-modal="true"><button class="fb-x" aria-label="Đóng">✕</button>${html}</div>`;
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.fb-x')) close(); });
  document.addEventListener('keydown', esc);
  document.body.append(ov); return ov.querySelector('.fb-box');
}
function esc(e) { if (e.key === 'Escape') close(); }
function close() { document.getElementById('fb-ov')?.remove(); document.removeEventListener('keydown', esc); }
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let sdk = null;
function fb() {
  if (!sdk) sdk = (async () => {
    const app = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
    const d = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-database.js`);
    const a = app.getApps().length ? app.getApp() : app.initializeApp(FIREBASE);
    return { ...d, db: d.getDatabase(a) };
  })();
  return sdk;
}
const LAST = 'bgvn-fb-last';

export function openFeedback(game = curGame()) {
  const box = modal(`<h2>💌 Góp ý / Báo lỗi</h2>
    <p>Gặp lỗi hay có ý tưởng hay? Kể cho chủ web nghe với nha 🥰</p>
    <div class="fb-chips" id="fb-t"><button data-t="bug" aria-pressed="true">🐞 Báo lỗi</button><button data-t="idea" aria-pressed="false">💡 Góp ý</button><button data-t="other" aria-pressed="false">💬 Khác</button></div>
    <label for="fb-g">Game</label><select id="fb-g">${Object.entries(GAMES).map(([k, n]) => `<option value="${k}"${k === game ? ' selected' : ''}>${n}</option>`).join('')}</select>
    <label for="fb-m">Nội dung</label><textarea id="fb-m" maxlength="2000" placeholder="Ví dụ: Ở Tiến Lên, lúc mình đánh đôi 3 thì nút Đánh bị mờ…"></textarea><div class="fb-count" id="fb-c">0/2000</div>
    <label for="fb-ct">Liên hệ (tuỳ chọn – Facebook, email… nếu muốn được trả lời)</label><input id="fb-ct" maxlength="100" autocomplete="off">
    <p class="fb-note">Đừng ghi mật khẩu hay thông tin nhạy cảm nha. Web tự gửi kèm tên trang và loại trình duyệt để dễ tìm lỗi.</p>
    <button class="fb-send" id="fb-s">Gửi 💌</button>`);
  let t = 'bug';
  box.querySelector('#fb-t').onclick = e => { const b = e.target.closest('button'); if (!b) return; t = b.dataset.t; box.querySelectorAll('#fb-t button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
  const m = box.querySelector('#fb-m'), c = box.querySelector('#fb-c'), s = box.querySelector('#fb-s');
  m.oninput = () => { c.textContent = `${m.value.length}/2000`; };
  setTimeout(() => m.focus(), 50);
  s.onclick = async () => {
    const msg = m.value.trim();
    if (msg.length < 3) { m.focus(); m.placeholder = 'Viết vài chữ đã nha 😅'; return; }
    let last = 0; try { last = +localStorage.getItem(LAST) || 0; } catch (e) {}
    if (Date.now() - last < 60000) { s.textContent = 'Đợi 1 phút rồi gửi tiếp nha ⏳'; return; }
    s.disabled = true; s.textContent = 'Đang gửi…';
    try {
      const data = { t, msg: msg.slice(0, 2000), game: box.querySelector('#fb-g').value, contact: box.querySelector('#fb-ct').value.trim().slice(0, 100), page: location.pathname.slice(0, 200) };
      const timeout = ms => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
      let sent = false;
      try {
        const r = await Promise.race([fetch(apiBase() + '/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }), timeout(8000)]);
        const j = await r.json().catch(() => ({}));
        if (j.ok) sent = true; else if (r.status === 400) throw Object.assign(new Error(j.msg || 'bad'), { user: j.msg });
      } catch (e) { if (e.user) throw e; }
      if (!sent) { // dự phòng: Firebase
        const F = await fb();
        await Promise.race([F.push(F.ref(F.db, 'feedback'), { ...data, ua: navigator.userAgent.slice(0, 300), ts: F.serverTimestamp() }), timeout(12000)]);
      }
      try { localStorage.setItem(LAST, String(Date.now())); } catch (e) {}
      box.innerHTML = `<button class="fb-x" aria-label="Đóng">✕</button><div class="fb-ok"><b>💖</b><h2 style="margin:6px 0">Gửi rồi nè!</h2><p>Cảm ơn bạn nhiều nha, chủ web sẽ đọc và sửa sớm 🛠️</p></div>`;
    } catch (e) {
      s.disabled = false; s.textContent = 'Gửi lại 💌';
      box.querySelector('.fb-note').textContent = e && e.user ? '😅 ' + e.user : '😣 Chưa gửi được (mạng yếu hoặc máy chủ bận). Bạn thử lại sau chút nha.';
    }
  };
}

export function openDonate() {
  modal(`<h2>☕ Ủng hộ chủ web</h2>
    <p>BGVN miễn phí, không quảng cáo. Nếu bạn thấy vui thì mời chủ web ly cà phê để có động lực làm thêm game mới nha 🥹</p>
    <img class="fb-qr" src="${ROOT}shared/img/donate-qr.png" alt="Mã QR chuyển khoản ủng hộ (VietQR)">
    <p class="fb-tip">📱 Mở app ngân hàng → <b>Quét QR</b> → nhập số tiền tuỳ tâm. Nội dung có thể ghi tên bạn để chủ web cảm ơn nè.</p>
    <p class="fb-note">Ủng hộ là hoàn toàn tự nguyện và <b>không</b> đổi được chip, vật phẩm hay quyền lợi gì trong game. Chip trong các game bài chỉ là chip ảo để chơi vui.</p>`);
}

// tự gắn nút cho phần tử có data-feedback / data-donate
document.addEventListener('click', e => {
  const f = e.target.closest('[data-feedback]'); if (f) { e.preventDefault(); openFeedback(f.dataset.feedback || curGame()); return; }
  const d = e.target.closest('[data-donate]'); if (d) { e.preventDefault(); openDonate(); }
});
