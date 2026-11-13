// 💬 Chat trong phòng chơi – dùng chung cho mọi game (trừ Ma Sói, Vẽ đoán đã có chat riêng).
// shared/net/room.js tự nạp file này khi có phòng online và đưa vào `api`:
//   { game, host, send(text), history(), alive() }  – tin mới tới qua sự kiện window 'bgvn-chat' ({id, from, text, host, old} hoặc {reset:true}).
// Giao diện: một "tai" 💬 dính mép trái màn hình (kéo lên xuống được), bấm mở hộp chat; có tin mới khi đang đóng thì hiện chấm đỏ + bong bóng xem nhanh.
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const CSS = `
.brc-tab{position:fixed;left:0;z-index:25;width:38px;height:46px;border:0;border-radius:0 16px 16px 0;background:#fff;box-shadow:0 8px 20px -8px #2a234088,0 2px 6px #2a234022;font-size:20px;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0 2px 0 0;touch-action:none;-webkit-tap-highlight-color:transparent}
.brc-tab[hidden],.brc-box[hidden],.brc-peek[hidden]{display:none}
.brc-tab b{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;border-radius:9px;background:#ff4d6a;color:#fff;font:800 11px/18px Nunito,sans-serif;padding:0 4px;box-sizing:border-box}
.brc-tab b:empty{display:none}
.brc-peek{position:fixed;left:44px;z-index:25;max-width:min(260px,calc(100vw - 60px));background:#2a2340;color:#fff;border-radius:14px;padding:7px 11px;font:700 13px/1.3 Nunito,sans-serif;box-shadow:0 10px 24px -8px #2a2340aa;pointer-events:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;animation:brc-in .2s ease-out}
.brc-peek i{font-style:normal;color:#ffb23d;font-weight:800}
.brc-box{position:fixed;left:8px;bottom:8px;z-index:60;width:min(340px,calc(100vw - 16px));height:min(420px,62vh);background:#fff7ef;color:#2a2340;border-radius:20px;box-shadow:0 18px 40px -12px #2a2340aa,0 2px 8px #2a234022;display:flex;flex-direction:column;overflow:hidden;font:700 14px/1.35 Nunito,sans-serif;animation:brc-in .18s ease-out}
.brc-head{display:flex;align-items:center;gap:8px;padding:9px 8px 9px 14px;background:linear-gradient(90deg,#ff4d6a,#ff7a45,#ffb23d);color:#fff;font:800 15px/1 "Baloo 2",Nunito,sans-serif}
.brc-head span{flex:1}
.brc-head button{width:32px;height:32px;border:0;border-radius:50%;background:#ffffff33;color:#fff;font-size:16px;cursor:pointer}
.brc-list{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px;overscroll-behavior:contain}
.brc-empty{margin:auto;text-align:center;color:#8a7f9c;font-weight:700}
.brc-m{max-width:86%;align-self:flex-start;background:#fff;border-radius:14px 14px 14px 4px;padding:6px 10px;box-shadow:0 1px 3px #2a234018;overflow-wrap:anywhere}
.brc-m.me{align-self:flex-end;background:#ffe3d2;border-radius:14px 14px 4px 14px}
.brc-m small{display:block;font-weight:800;font-size:11.5px;color:#c2581f}
.brc-form{display:flex;gap:6px;padding:8px;background:#fff;border-top:1px solid #f0e4d8}
.brc-form input{flex:1;min-width:0;border:2px solid #eadfd2;border-radius:999px;padding:8px 13px;font:700 16px/1.2 Nunito,sans-serif;color:#2a2340;background:#fffdfb;outline:none}
.brc-form input:focus{border-color:#ff7a45}
.brc-form button{flex:none;width:42px;height:42px;border:0;border-radius:50%;background:#ff7a45;color:#fff;font-size:18px;cursor:pointer}
@keyframes brc-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.brc-box,.brc-peek{animation:none}}
`;
let ui = null;
function build() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const tab = document.createElement('button'); tab.className = 'brc-tab'; tab.type = 'button'; tab.setAttribute('aria-label', 'Chat trong phòng'); tab.innerHTML = '💬<b></b>';
  const peek = document.createElement('div'); peek.className = 'brc-peek'; peek.hidden = true;
  const box = document.createElement('div'); box.className = 'brc-box'; box.hidden = true;
  box.innerHTML = '<div class="brc-head"><span>💬 Chat trong phòng</span><button type="button" aria-label="Đóng">✕</button></div><div class="brc-list" aria-live="polite"></div><form class="brc-form"><input type="text" maxlength="140" placeholder="Nhắn cả phòng…" autocomplete="off" enterkeyhint="send"><button type="submit" aria-label="Gửi">➤</button></form>';
  document.body.append(tab, peek, box);
  const list = box.querySelector('.brc-list'), inp = box.querySelector('input'), badge = tab.querySelector('b');
  const u = { api: null, tab, box, list, seen: new Set(), unread: 0, peekT: 0 };
  const place = y => { y = Math.max(70, Math.min(innerHeight - 120, y)); tab.style.top = y + 'px'; peek.style.top = (y + 6) + 'px'; };
  place(+ls.get('bgvn-chat-y') || Math.round(innerHeight * .42));
  addEventListener('resize', () => place(parseFloat(tab.style.top) || 200));
  const empty = () => { if (!list.children.length) list.innerHTML = '<div class="brc-empty">Chưa ai nói gì.<br>Chào cả phòng một câu đi nè 👋</div>'; };
  u.clear = () => { u.seen.clear(); list.innerHTML = ''; u.unread = 0; badge.textContent = ''; empty(); };
  u.open = on => {
    box.hidden = !on; peek.hidden = true;
    if (on) { u.unread = 0; badge.textContent = ''; list.scrollTop = list.scrollHeight; if (matchMedia('(pointer:fine)').matches) inp.focus(); }
  };
  u.add = m => {
    if (m.reset) { u.clear(); return; }
    if (!m.text || (m.id && u.seen.has(m.id))) return; if (m.id) u.seen.add(m.id);
    list.querySelector('.brc-empty')?.remove();
    const mine = u.api && (u.api.host ? !!m.host : !m.host && m.from === (ls.get('bgvn-name') || ''));
    const el = document.createElement('div'); el.className = 'brc-m' + (mine ? ' me' : '');
    if (!mine) { const s = document.createElement('small'); s.textContent = (m.host ? '👑 ' : '') + m.from; el.appendChild(s); }
    el.appendChild(document.createTextNode(m.text)); list.appendChild(el);
    while (list.children.length > 80) list.firstChild.remove();
    const near = list.scrollHeight - list.scrollTop - list.clientHeight < 90; if (near || mine) list.scrollTop = list.scrollHeight;
    if (box.hidden && !m.old && !mine) {
      u.unread++; badge.textContent = u.unread > 9 ? '9+' : u.unread;
      peek.textContent = ''; const i = document.createElement('i'); i.textContent = m.from + ': '; peek.append(i, m.text); peek.hidden = false;
      clearTimeout(u.peekT); u.peekT = setTimeout(() => { peek.hidden = true; }, 4500);
    }
  };
  // kéo "tai" lên xuống; bấm (không kéo) thì mở/đóng
  let drag = null;
  tab.addEventListener('pointerdown', e => { drag = { y: e.clientY, top: parseFloat(tab.style.top), moved: false }; try { tab.setPointerCapture(e.pointerId); } catch (x) {} });
  tab.addEventListener('pointermove', e => { if (!drag) return; const d = e.clientY - drag.y; if (Math.abs(d) > 6) drag.moved = true; if (drag.moved) place(drag.top + d); });
  const up = () => { if (!drag) return; const moved = drag.moved; drag = null; if (moved) ls.set('bgvn-chat-y', parseFloat(tab.style.top)); else u.open(box.hidden); };
  tab.addEventListener('pointerup', up); tab.addEventListener('pointercancel', () => { drag = null; });
  box.querySelector('.brc-head button').onclick = () => u.open(false);
  box.querySelector('form').onsubmit = e => { e.preventDefault(); const t = inp.value.trim(); if (!t || !u.api) return; u.api.send(t); inp.value = ''; };
  for (const ev of ['keydown', 'keyup', 'keypress']) box.addEventListener(ev, e => { e.stopPropagation(); if (ev === 'keydown' && e.key === 'Escape') u.open(false); }); /* gõ chat không kích phím tắt của game */
  addEventListener('bgvn-chat', e => u.add(e.detail || {}));
  setInterval(() => { const on = !!(u.api && u.api.alive()); if (tab.hidden === on) { tab.hidden = !on; if (!on) { u.open(false); peek.hidden = true; } } }, 1500); /* rời phòng thì ẩn */
  empty();
  return u;
}
export function mountRoomChat(api) {
  if (!ui) ui = build();
  const fresh = ui.api && (ui.api.host || api.host) && ui.api !== api; /* phòng mới do mình mở → xoá chat cũ */
  ui.api = api; ui.tab.hidden = false;
  if (fresh) ui.clear();
  for (const m of api.history()) ui.add({ ...m, old: true });
}
