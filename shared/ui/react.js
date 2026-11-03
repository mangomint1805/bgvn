// =====================================================================================
//  Thả emoji / chọc nhau nhanh khi chơi – module dùng chung cho mọi game BGVN
// =====================================================================================
//  Giao diện: 1 nút tròn 😂 → bảng nhỏ 8 emoji + vài câu chọc ngắn. Bấm 1 cái là emoji bay lên
//  từ ghế người gửi cho cả bàn thấy (câu chữ thì hiện bong bóng cạnh ghế). Chống spam bằng
//  cooldown (mặc định 1.5 giây) ở máy người gửi + bộ lọc ở máy chủ phòng.
//
//  CÁCH TÍCH HỢP (host-authoritative, giống shared/net/room.js):
//
//  1) Giao diện (mọi máy):
//       import { createReactions } from '../../shared/ui/react.js';
//       const reacts = createReactions({
//         send: e => isHost ? net.react('host', e) : net.react(e),  // gửi lên chủ phòng
//         seatEl: id => document.querySelector(`.seat[data-pid="${id}"]`), // phần tử ghế theo id
//         myId: () => myId,                       // id của mình (để không hiện đôi khi chủ phòng phát lại)
//         nameOf: id => tên người chơi,           // (tuỳ chọn) dùng khi không tìm thấy ghế
//         mount: document.querySelector('#table'),// (tuỳ chọn) chỗ gắn nút; mặc định góc dưới phải màn hình
//         place: 'left:8px;bottom:8px',           // (tuỳ chọn) vị trí nút trong mount
//         phrases: ['Khoá mõm nè!', …],           // (tuỳ chọn) câu chọc riêng của game (≤ 24 ký tự)
//         onShow: msg => âm thanh,                // (tuỳ chọn)
//       });
//       reacts.show(msg)      // gọi khi nhận {t:'react', e, from} từ chủ phòng
//       reacts.setVisible(b)  // ẩn/hiện nút (vd. chỉ hiện trong ván)
//       reacts.destroy()
//
//  2) Mạng – tin nhắn gợi ý:
//       người chơi → chủ phòng : {t:'react', e}
//       chủ phòng → mọi người  : {t:'react', e, from}   (from do CHỦ PHÒNG gán theo kết nối, không tin client)
//     Ở Host:
//       import { isReact, hostLimiter } from '../../shared/ui/react.js';
//       const lim = hostLimiter();                         // chặn spam: mỗi người ≥ 1.2 giây/lần
//       react(from, e) { if (!isReact(e, PHRASES) || !lim(from)) return;
//         for (const p of players) p.conn?.send({ t: 'react', e, from });
//         handlers.onReact({ e, from }); }                 // chủ phòng tự hiện trên máy mình
//     Chế độ chơi với bot (offline) dùng đúng hàm react() đó, không cần mạng.
//
//  3) Bot chọc lại (tuỳ chọn): pickReact('attack' | 'hurt' | 'win' | 'reply' | 'uno', pools?)
//     trả 1 emoji/câu hợp tâm trạng; Host gọi react(botId, pickReact(...)) sau 1–2 giây cho tự nhiên.
//
//  Không phụ thuộc thư viện ngoài; CSS tự chèn (tiền tố .bgr-); tôn trọng prefers-reduced-motion.
// =====================================================================================

export const EMOJIS = ['😂', '😈', '🤡', '🙏', '😭', '🔥', '💀', '🫵'];
export const PHRASES = ['Cứu tui', 'Gà quá!', 'Đỉnh nóc!', 'Từ từ thôi!', 'GG', 'Chờ xíu…'];
export const COOLDOWN = 1500;

// Kiểm tra 1 reaction có hợp lệ không (chủ phòng dùng để lọc tin nhắn lạ)
export function isReact(e, phrases = PHRASES) {
  return typeof e === 'string' && e.length <= 40 && (EMOJIS.includes(e) || phrases.includes(e));
}
// Bộ lọc spam phía chủ phòng: trả về hàm (from) => true nếu cho phép
export function hostLimiter(ms = COOLDOWN - 300) {
  const last = {};
  return from => { const now = Date.now(); if (now - (last[from] || 0) < ms) return false; last[from] = now; return true; };
}
const MOOD = {
  attack: ['😈', '🫵', '😂', '🔥'],
  hurt: ['😭', '💀', '🙏', 'Cứu tui'],
  win: ['🔥', '😂', 'GG', 'Đỉnh nóc!'],
  reply: ['🤡', '😂', '🫵', '😈'],
  uno: ['🔥', '😈', 'Từ từ thôi!'],
};
// pools: { attack: ['Ăn +4 đi cưng', …], … } – câu riêng của game, trộn thêm vào
export function pickReact(mood = 'reply', pools = {}) {
  const list = [...(MOOD[mood] || MOOD.reply), ...((pools && pools[mood]) || [])];
  return list[Math.floor(Math.random() * list.length)];
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let cssDone = false;
function injectCSS() {
  if (cssDone) return; cssDone = true;
  const st = document.createElement('style'); st.id = 'bgr-css';
  st.textContent = `
.bgr-btn{position:fixed;right:12px;bottom:12px;z-index:20;width:44px;height:44px;border-radius:50%;border:0;background:#fff;box-shadow:0 8px 20px -8px #2a234088,0 2px 6px #2a234022;font-size:23px;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0;-webkit-tap-highlight-color:transparent;transition:transform .12s}
.bgr-btn:active{transform:scale(.92)}
.bgr-btn.cd{background:conic-gradient(#7a5cff55 var(--p,0%),#fff 0)}
.bgr-btn.open{box-shadow:0 0 0 3px #7a5cff,0 8px 20px -8px #2a234088}
.bgr-panel{position:fixed;z-index:70;background:#fff;border-radius:20px;padding:8px;box-shadow:0 18px 40px -12px #2a2340aa,0 2px 8px #2a234022;width:min(292px,calc(100vw - 16px));font:700 14px/1.25 "Be Vietnam Pro",Nunito,system-ui,sans-serif;color:#2a2340;animation:bgr-in .16s ease-out}
.bgr-panel .em{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.bgr-panel .em button{height:46px;border:0;border-radius:14px;background:#f5f1ff;font-size:26px;cursor:pointer;padding:0}
.bgr-panel .ph{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
.bgr-panel .ph button{border:0;border-radius:999px;background:#2a2340;color:#fff;font:800 13px/1 "Be Vietnam Pro",Nunito,sans-serif;padding:0 11px;min-height:36px;cursor:pointer}
.bgr-panel button:disabled{opacity:.4;cursor:default}
.bgr-panel button:not(:disabled):active{transform:scale(.94)}
.bgr-fly{position:fixed;z-index:80;pointer-events:none;font-size:42px;line-height:1;transform:translate(-50%,-50%);filter:drop-shadow(0 4px 6px #0004);animation:bgr-fly 1.9s ease-out forwards}
.bgr-fly small{position:absolute;left:50%;top:100%;transform:translateX(-50%);font:800 11px "Be Vietnam Pro",Nunito,sans-serif;background:#2a2340;color:#fff;border-radius:8px;padding:1px 6px;white-space:nowrap}
.bgr-bub{position:fixed;z-index:80;pointer-events:none;background:#fff;color:#2a2340;border-radius:16px;padding:6px 12px;font:800 14px/1.25 "Be Vietnam Pro",Nunito,sans-serif;box-shadow:0 10px 24px -8px #2a2340aa;white-space:nowrap;transform:translate(-50%,-100%);animation:bgr-bub 2.4s ease-out forwards}
.bgr-bub::after{content:"";position:absolute;left:50%;bottom:-6px;margin-left:-6px;border:6px solid transparent;border-bottom:0;border-top-color:#fff}
.bgr-bub.below{transform:translate(-50%,0)}.bgr-bub.below::after{bottom:auto;top:-6px;border:6px solid transparent;border-top:0;border-bottom-color:#fff}
.bgr-bub b{color:#7a5cff}
@keyframes bgr-in{from{opacity:0;transform:translateY(8px) scale(.96)}}
@keyframes bgr-fly{0%{opacity:0;transform:translate(-50%,-30%) scale(.4)}12%{opacity:1;transform:translate(-50%,-60%) scale(1.25)}25%{transform:translate(-50%,-70%) scale(1) rotate(-8deg)}40%{transform:translate(-50%,-90%) rotate(8deg)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-190%) scale(.9)}}
@keyframes bgr-bub{0%{opacity:0;margin-top:8px}10%{opacity:1;margin-top:0}82%{opacity:1}100%{opacity:0;margin-top:-10px}}
@media (prefers-reduced-motion:reduce){.bgr-fly{animation:bgr-fade 1.9s forwards;transform:translate(-50%,-80%)}.bgr-bub{animation:bgr-fade 2.4s forwards}.bgr-panel{animation:none}
@keyframes bgr-fade{0%,80%{opacity:1}100%{opacity:0}}}`;
  document.head.appendChild(st);
}

export function createReactions(opts = {}) {
  injectCSS();
  const o = { cooldown: COOLDOWN, phrases: PHRASES, ...opts };
  const btn = document.createElement('button');
  btn.className = 'bgr-btn'; btn.type = 'button'; btn.textContent = '😂';
  btn.title = 'Thả emoji / chọc nhau'; btn.setAttribute('aria-label', 'Thả emoji, chọc nhau');
  if (o.mount) { btn.style.cssText = 'position:absolute;' + (o.place || 'left:8px;bottom:8px'); o.mount.appendChild(btn); }
  else document.body.appendChild(btn);
  let panel = null, readyAt = 0, cdT = null, dead = false;
  const echo = []; // đã tự hiện trên máy mình, chờ chủ phòng phát lại thì bỏ qua

  function cooling() { return Date.now() < readyAt; }
  function tickCD() {
    clearInterval(cdT);
    btn.classList.add('cd');
    cdT = setInterval(() => {
      const left = readyAt - Date.now();
      if (left <= 0 || dead) { clearInterval(cdT); btn.classList.remove('cd'); btn.style.removeProperty('--p'); syncPanel(); return; }
      btn.style.setProperty('--p', Math.round(100 * (1 - left / o.cooldown)) + '%');
    }, 60);
  }
  function syncPanel() { if (panel) panel.querySelectorAll('button').forEach(b => { b.disabled = cooling(); }); }
  function close() { if (panel) { panel.remove(); panel = null; btn.classList.remove('open'); } }
  function open() {
    if (panel) { close(); return; }
    panel = document.createElement('div'); panel.className = 'bgr-panel'; panel.setAttribute('role', 'dialog');
    panel.innerHTML = `<div class="em">${EMOJIS.map(e => `<button type="button" data-e="${e}">${e}</button>`).join('')}</div>` +
      `<div class="ph">${o.phrases.map(e => `<button type="button" data-e="${esc(e)}">${esc(e)}</button>`).join('')}</div>`;
    document.body.appendChild(panel); btn.classList.add('open');
    // đặt bảng ngay trên nút, kẹp trong màn hình
    const r = btn.getBoundingClientRect(), pw = panel.offsetWidth, ph = panel.offsetHeight;
    let x = r.left + r.width / 2 - pw / 2; x = Math.max(8, Math.min(innerWidth - pw - 8, x));
    let y = r.top - ph - 8; if (y < 8) y = Math.min(innerHeight - ph - 8, r.bottom + 8);
    panel.style.left = x + 'px'; panel.style.top = y + 'px';
    panel.querySelectorAll('[data-e]').forEach(b => b.onclick = ev => { ev.stopPropagation(); fire(b.dataset.e); });
    syncPanel();
  }
  function fire(e) {
    if (cooling() || !isReact(e, o.phrases)) return;
    readyAt = Date.now() + o.cooldown; tickCD(); close();
    const me = o.myId ? o.myId() : null;
    echo.push({ e, t: Date.now() });
    show({ e, from: me }, true);
    try { o.send && o.send(e); } catch (x) {}
  }
  btn.onclick = ev => { ev.stopPropagation(); open(); };
  const outside = ev => { if (panel && !panel.contains(ev.target) && ev.target !== btn) close(); };
  const onKey = ev => { if (ev.key === 'Escape') close(); };
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('keydown', onKey);

  function anchor(from) {
    const el = o.seatEl ? o.seatEl(from) : null;
    if (el && el.isConnected) { const r = el.getBoundingClientRect(); if (r.width || r.height) return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, bottom: r.bottom, found: true }; }
    return { x: innerWidth / 2, y: innerHeight * 0.3, top: innerHeight * 0.3, bottom: innerHeight * 0.3, found: false };
  }
  // Hiện 1 reaction: msg = {e, from}
  function show(msg, local = false) {
    if (dead || !msg || !isReact(msg.e, o.phrases)) return;
    const me = o.myId ? o.myId() : null;
    if (!local && msg.from != null && msg.from === me) { // chủ phòng phát lại cái mình vừa thả
      const i = echo.findIndex(x => x.e === msg.e && Date.now() - x.t < 5000);
      if (i >= 0) { echo.splice(i, 1); return; }
    }
    while (echo.length && Date.now() - echo[0].t > 5000) echo.shift();
    const a = anchor(msg.from);
    const who = !a.found && o.nameOf ? o.nameOf(msg.from) : '';
    if (EMOJIS.includes(msg.e)) {
      const n = document.createElement('div'); n.className = 'bgr-fly';
      n.innerHTML = esc(msg.e) + (who ? `<small>${esc(who)}</small>` : '');
      n.style.left = (a.x + (Math.random() * 16 - 8)) + 'px'; n.style.top = a.y + 'px';
      document.body.appendChild(n); setTimeout(() => n.remove(), 2000);
    } else {
      const n = document.createElement('div'); n.className = 'bgr-bub';
      n.innerHTML = (who ? `<b>${esc(who)}:</b> ` : '') + esc(msg.e);
      document.body.appendChild(n);
      const w = n.offsetWidth, h = n.offsetHeight;
      const x = Math.max(8 + w / 2, Math.min(innerWidth - 8 - w / 2, a.x));
      let y = a.top - 6;
      if (y - h < 8) { y = a.bottom + 6; n.classList.add('below'); }
      n.style.left = x + 'px'; n.style.top = y + 'px';
      setTimeout(() => n.remove(), 2500);
    }
    try { o.onShow && o.onShow(msg); } catch (x) {}
  }
  return {
    show: m => show(m, false),
    open, close,
    setVisible(v) { btn.style.display = v ? '' : 'none'; if (!v) close(); },
    button: btn,
    destroy() { dead = true; close(); clearInterval(cdT); btn.remove(); document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', onKey); },
  };
}
