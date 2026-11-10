// 🌐 Sảnh chung: phòng công khai + chat (lọc chửi thề ở máy chủ) + báo cáo.
// mountLobby(el, { game }) – game = null: sảnh tổng (mọi game, kênh chat "Chung" + kênh game đang lọc)
// openLobby(game) – mở dạng hộp nổi (dùng trong trang game)
import { WS, auth, guestId, myName } from '../net/api.js?v=1';
import { openLogin } from './account.js?v=2';

const ROOT = new URL('../../', import.meta.url).href;
export const GAME_INFO = {
  bang: ['🤠', 'CÀ ĐÙNG!'], uno: ['🃏', 'UNÔ'], typhu: ['🏙️', 'Cờ Tỷ Phú'], tamquoc: ['⚔️', 'Tam Quốc Sát'], meono: ['💣', 'Mèo Nổ'], masoi: ['🐺', 'Ma Sói'],
  scribble: ['🎨', 'Scribble'], tienlen: ['🐷', 'Tiến Lên'], poker: ['♠️', 'Poker'], xidach: ['🂡', 'Xì Dách'], catte: ['🎴', 'Cát Tê'], bacao: ['🀄', 'Ba Cào'],
  cangua: ['🐴', 'Cờ Cá Ngựa'], camel: ['🐪', 'Đua Lạc Đà'],
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hhmm = t => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'vừa mở' : m < 60 ? m + ' phút' : Math.round(m / 60) + ' giờ'; };

const CSS = `.lb{--ink:#2a2340;--mut:#7b7391;--line:#ecdfd0;color:var(--ink);font:600 15px/1.45 Nunito,system-ui,sans-serif;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:16px;min-height:0}
.lb *{box-sizing:border-box}
.lb-col{background:#fff;border-radius:22px;box-shadow:0 14px 30px -18px #2a234066;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.lb-h{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1.5px solid var(--line);flex-wrap:wrap}
.lb-h h3{margin:0;font:800 19px "Baloo 2",Nunito,sans-serif;flex:1;min-width:120px}
.lb-dot{width:9px;height:9px;border-radius:50%;background:#bbb;display:inline-block;margin-right:4px}.lb-dot.on{background:#2fc76f;box-shadow:0 0 0 3px #2fc76f33}
.lb-chips{display:flex;gap:6px;overflow-x:auto;padding:8px 12px;border-bottom:1.5px solid var(--line);scrollbar-width:none}.lb-chips::-webkit-scrollbar{display:none}
.lb-chips button{flex:none;border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:5px 12px;min-height:36px;font:800 13px Nunito,sans-serif;cursor:pointer;color:var(--ink)}
.lb-chips button[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
.lb-rooms{overflow:auto;padding:10px 12px;display:grid;gap:8px;align-content:start;min-height:160px}
.lb-room{display:flex;align-items:center;gap:10px;background:#fffaf3;border:1.5px solid var(--line);border-radius:16px;padding:10px 12px;text-decoration:none;color:inherit}
.lb-room:hover{border-color:#ffb27a;background:#fff4ea}
.lb-room .e{font-size:28px;width:40px;text-align:center;flex:none}.lb-room .t{flex:1;min-width:0}.lb-room b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lb-room small{color:var(--mut)}.lb-room .go{flex:none;background:linear-gradient(90deg,#ff4d5e,#ff9a3d);color:#fff;border-radius:999px;padding:8px 14px;font:800 14px "Baloo 2",Nunito,sans-serif}
.lb-empty{color:var(--mut);text-align:center;padding:18px 8px}
.lb-empty a,.lb-new{color:#2f5fd0}
.lb-chat{display:flex;flex-direction:column;min-height:0;flex:1}
.lb-msgs{flex:1;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:6px;min-height:200px}
.lb-m{display:flex;gap:8px;align-items:flex-start;position:relative}
.lb-av{width:30px;height:30px;border-radius:50%;flex:none;display:grid;place-items:center;color:#fff;font:800 14px Nunito}
.lb-b{background:#f6efe6;border-radius:4px 14px 14px 14px;padding:6px 10px;max-width:calc(100% - 70px);word-wrap:break-word;overflow-wrap:anywhere}
.lb-m.me{flex-direction:row-reverse}.lb-m.me .lb-b{background:#ffe9d6;border-radius:14px 4px 14px 14px}
.lb-n{font-weight:800;font-size:13px}.lb-n .v{color:#2f9e5b}.lb-n time{font-weight:600;color:var(--mut);font-size:11.5px;margin-left:6px}
.lb-rp{border:0;background:none;cursor:pointer;opacity:.35;font-size:15px;padding:4px;align-self:center;min-width:32px;min-height:32px}.lb-rp:hover,.lb-rp:focus-visible{opacity:1}
.lb-in{display:flex;gap:8px;padding:10px 12px;border-top:1.5px solid var(--line);align-items:flex-end;flex-wrap:wrap}
.lb-in input{flex:1;min-width:0;border:1.5px solid var(--line);border-radius:999px;padding:10px 14px;font:600 16px Nunito,sans-serif;color:var(--ink);background:#fff}
.lb-in button{border:0;border-radius:999px;min-height:44px;padding:0 16px;font:800 15px "Baloo 2",Nunito,sans-serif;background:var(--ink);color:#fff;cursor:pointer}
.lb-who{width:100%;font-size:12.5px;color:var(--mut);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.lb-who input{flex:0 1 150px;padding:5px 10px;font-size:14px;border-radius:10px}
.lb-who a{color:#2f5fd0;cursor:pointer}
.lb-rule{font-size:12px;color:var(--mut);padding:0 12px 8px}
.lb-err{font-size:13px;color:#c0263b;padding:0 12px;min-height:0}
.lb-tabs{display:none}
@media (max-width:760px){
 .lb{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr);gap:10px}
 .lb-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;background:#f0e6da;border-radius:999px;padding:4px}
 .lb-tabs button{border:0;border-radius:999px;min-height:42px;font:800 15px Nunito,sans-serif;background:none;color:var(--ink);cursor:pointer}
 .lb-tabs button[aria-pressed=true]{background:#fff;box-shadow:0 2px 6px #0001}
 .lb[data-tab=rooms] .lb-col.c{display:none}.lb[data-tab=chat] .lb-col.r{display:none}
 .lb-msgs{min-height:45vh}
}
.lb-ov{position:fixed;inset:0;z-index:9990;background:#1a1426aa;display:grid;place-items:center;padding:10px}
.lb-mod{width:min(980px,100%);height:min(720px,calc(100dvh - 20px));background:#fff7ef;border-radius:24px;padding:12px;display:flex;flex-direction:column;gap:10px;box-shadow:0 20px 60px #0006}
.lb-mod > header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.lb-mod > header h2{margin:0;flex:1;font:800 22px "Baloo 2",Nunito,sans-serif;color:#2a2340}
.lb-mod > header button.x{width:40px;height:40px;border-radius:50%;border:0;background:#f0e6da;font-size:18px;cursor:pointer}
.lb-mod .lb{flex:1;min-height:0}.lb-mod .lb-col{min-height:0}`;
function css() { if (document.getElementById('lb-css')) return; const s = document.createElement('style'); s.id = 'lb-css'; s.textContent = CSS; document.head.append(s); }
const COLORS = ['#ff4d5e', '#ff9a3d', '#2fc76f', '#3d8bff', '#7b61ff', '#20b2aa', '#e05297', '#c58a1a'];
const colorOf = s => COLORS[[...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length];

export function mountLobby(el, { game = null } = {}) {
  css();
  let filter = game || 'all', ch = game || 'all', rooms = [], me = null, ws = null, wait = 1000, dead = false, msgs = { [ch]: [] };
  const chans = () => game ? [game, 'all'] : ['all', ...(filter !== 'all' ? [filter] : [])];
  el.innerHTML = `<div class="lb" data-tab="rooms">
    <div class="lb-tabs" role="tablist"><button data-tab="rooms" aria-pressed="true">🚪 Phòng <span class="n">0</span></button><button data-tab="chat" aria-pressed="false">💬 Chat</button></div>
    <section class="lb-col r"><div class="lb-h"><h3>🚪 Phòng đang chờ</h3><span class="lb-st"><i class="lb-dot"></i><small>đang nối…</small></span></div>
      ${game ? '' : `<div class="lb-chips lb-gf"><button data-g="all" aria-pressed="true">Tất cả</button>${Object.entries(GAME_INFO).map(([k, [e, n]]) => `<button data-g="${k}" aria-pressed="false">${e} ${n}</button>`).join('')}</div>`}
      <div class="lb-rooms"></div></section>
    <section class="lb-col c"><div class="lb-h"><h3>💬 Chat</h3></div>
      <div class="lb-chips lb-cf"></div>
      <div class="lb-chat"><div class="lb-msgs" aria-live="polite"></div>
      <p class="lb-rule">💛 Nói chuyện lịch sự nha – từ bậy tự bị che. Bấm 🚩 để báo cáo tin xấu.</p><p class="lb-err"></p>
      <form class="lb-in"><div class="lb-who"></div><input maxlength="300" placeholder="Nhắn gì đó…" enterkeyhint="send" aria-label="Tin nhắn"><button type="submit">Gửi</button></form></div></section></div>`;
  const $ = s => el.querySelector(s), root = $('.lb');
  $('.lb-tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; root.dataset.tab = b.dataset.tab; el.querySelectorAll('.lb-tabs button').forEach(x => x.setAttribute('aria-pressed', x === b)); if (b.dataset.tab === 'chat') scrollEnd(); };
  if (!game) $('.lb-gf').onclick = e => { const b = e.target.closest('button'); if (!b) return; filter = b.dataset.g; el.querySelectorAll('.lb-gf button').forEach(x => x.setAttribute('aria-pressed', x === b)); drawRooms(); drawChans(); if (filter !== 'all') { ch = filter; join(); } else { ch = 'all'; drawMsgs(); } };

  const drawRooms = () => {
    const list = rooms.filter(r => filter === 'all' || r.game === filter);
    el.querySelector('.lb-tabs .n').textContent = list.length;
    $('.lb-rooms').innerHTML = list.length ? list.map(r => { const [e, n] = GAME_INFO[r.game] || ['🎲', r.game]; return `<a class="lb-room" href="${ROOT}${r.game}/?room=${r.code}"><span class="e">${e}</span><span class="t"><b>${esc(n)} · phòng của ${esc(r.host)}</b><small>👥 ${r.n} người · mở ${ago(r.created)} · mã ${r.code}</small></span><span class="go">Vào ▶</span></a>`; }).join('')
      : `<div class="lb-empty">Chưa có phòng công khai nào${filter !== 'all' ? ' cho ' + esc(GAME_INFO[filter]?.[1] || '') : ''} 🥲<br>Tạo phòng rồi bật <b>🌐 Công khai</b> để người khác vào chơi cùng nha!${filter !== 'all' || game ? `<br><a href="${ROOT}${game || filter}/?public=1">✨ Tạo phòng công khai ${esc(GAME_INFO[game || filter]?.[1] || '')}</a>` : ''}</div>`;
  };
  const drawChans = () => { const cs = chans(); $('.lb-cf').innerHTML = cs.map(c => `<button data-c="${c}" aria-pressed="${c === ch}">${c === 'all' ? '🌐 Chung' : (GAME_INFO[c]?.[0] + ' ' + GAME_INFO[c]?.[1])}</button>`).join(''); $('.lb-cf').hidden = cs.length < 2; };
  $('.lb-cf').onclick = e => { const b = e.target.closest('button'); if (!b) return; ch = b.dataset.c; drawChans(); drawMsgs(); };
  const msgHTML = m => { const mine = !!me && m.who === me.who; return `<div class="lb-m${mine ? ' me' : ''}" data-id="${m.id}"><span class="lb-av" style="background:${colorOf(m.name)}">${esc([...m.name][0] || '?').toUpperCase()}</span><div class="lb-b"><div class="lb-n">${esc(m.name)}${m.v ? ' <span class="v" title="Đã đăng nhập">✓</span>' : ''}<time>${hhmm(m.ts)}</time></div>${esc(m.text)}</div>${mine ? '' : (me && me.admin ? '<button class="lb-rp lb-adm" title="Quản trị: ẩn tin / cấm chat" aria-label="Quản trị">🛡️</button>' : '') + '<button class="lb-rp" title="Báo cáo tin này" aria-label="Báo cáo">🚩</button>'}</div>`; };
  const scrollEnd = () => { const b = $('.lb-msgs'); b.scrollTop = b.scrollHeight; };
  const drawMsgs = () => { const l = msgs[ch] || []; $('.lb-msgs').innerHTML = l.length ? l.map(msgHTML).join('') : '<div class="lb-empty">Chưa ai nói gì… mở lời trước đi nè 👋</div>'; scrollEnd(); };
  const drawWho = () => {
    const u = auth.user();
    $('.lb-who').innerHTML = u ? `Chat với tên <b>${esc(u.name)}</b> <span style="color:#2f9e5b">✓</span>` : `Tên: <input class="lb-nm" maxlength="20" value="${esc(myName() || 'Khách')}" aria-label="Tên của bạn"> · <a class="lb-login">Đăng nhập</a> để có dấu ✓`;
    const nm = $('.lb-nm'); if (nm) nm.onchange = () => { try { localStorage.setItem('bgvn-name', nm.value.trim().slice(0, 20)); } catch (e) {} hello(); };
    const lg = $('.lb-login'); if (lg) lg.onclick = () => openLogin();
  };
  $('.lb-msgs').onclick = e => {
    const b = e.target.closest('.lb-rp'); if (!b) return;
    const id = +b.closest('.lb-m').dataset.id;
    if (b.classList.contains("lb-adm")) {
      const c = prompt('🛡️ Quản trị tin này – gõ số:\n1 = Ẩn tin\n2 = Cấm chat 24 giờ\n3 = Cấm chat 7 ngày\n4 = Cấm chat vĩnh viễn'); if (!c) return;
      const hours = { 2: 24, 3: 168, 4: 87600 }[c.trim()];
      if (c.trim() === '1') send({ t: 'mod', op: 'hide', id }); else if (hours) send({ t: 'mod', op: 'ban', id, hours, reason: 'Quản trị viên xử lý trong chat' });
      return;
    }
    const reason = prompt('Báo cáo tin nhắn này vì sao? (chửi bậy, quấy rối, spam, lừa đảo…)'); if (reason === null) return;
    send({ t: 'report', id, reason });
  };
  $('.lb-in').onsubmit = e => {
    e.preventDefault(); const inp = $('.lb-in > input'), t = inp.value.trim(); if (!t) return;
    if (!ws || ws.readyState !== 1) { err('Đang nối lại máy chủ, đợi xíu nha…'); return; }
    send({ t: 'chat', ch, text: t }); inp.value = ''; inp.focus();
  };
  const err = t => { $('.lb-err').textContent = t || ''; clearTimeout(err.t); if (t) err.t = setTimeout(() => { $('.lb-err').textContent = ''; }, 4000); };
  const send = o => { try { ws.send(JSON.stringify(o)); } catch (e) {} };
  const hello = () => send({ t: 'hello', token: auth.token(), guest: guestId(), name: (auth.user()?.name) || myName() || 'Khách', chs: chans() });
  const join = () => { msgs[ch] = msgs[ch] || []; drawMsgs(); send({ t: 'join', chs: chans() }); };
  const status = on => { $('.lb-st').innerHTML = `<i class="lb-dot${on ? ' on' : ''}"></i><small>${on ? 'trực tiếp' : 'đang nối lại…'}</small>`; };
  let ka = null;
  function connect() {
    if (dead) return;
    try { ws = new WebSocket(WS() + '/lobby'); } catch (e) { setTimeout(connect, wait); return; }
    ws.onopen = () => { wait = 1000; status(true); hello(); clearInterval(ka); ka = setInterval(() => { if (ws.readyState === 1) ws.send('ping'); }, 25000); };
    ws.onmessage = ev => {
      if (ev.data === 'pong') return; let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'me') { me = m; drawMsgs(); }
      else if (m.t === 'rooms') { rooms = m.list || []; drawRooms(); }
      else if (m.t === 'hist') { msgs[m.ch] = m.msgs; if (m.ch === ch) drawMsgs(); }
      else if (m.t === 'msg') { const l = msgs[m.m.ch] = msgs[m.m.ch] || []; l.push(m.m); if (l.length > 120) l.shift(); if (m.m.ch === ch) { const box = $('.lb-msgs'); const near = box.scrollHeight - box.scrollTop - box.clientHeight < 120; if (l.length === 1) drawMsgs(); else { box.insertAdjacentHTML('beforeend', msgHTML(m.m)); if (near) scrollEnd(); } } }
      else if (m.t === 'del') { for (const k in msgs) msgs[k] = msgs[k].filter(x => x.id !== m.id); el.querySelector(`.lb-m[data-id="${m.id}"]`)?.remove(); }
      else if (m.t === 'err') err(m.msg);
      else if (m.t === 'ok') err(m.msg);
      else if (m.t === 'banned') err('⛔ Bạn đang bị cấm chat' + (m.reason ? ': ' + m.reason : ''));
      else if (m.t === 'reload') join();
    };
    ws.onclose = () => { clearInterval(ka); status(false); if (!dead) { setTimeout(connect, wait); wait = Math.min(wait * 2, 20000); } };
    ws.onerror = () => {};
  }
  const off = auth.onChange(() => { drawWho(); hello(); });
  drawRooms(); drawChans(); drawWho(); drawMsgs(); connect();
  return { destroy() { dead = true; off(); clearInterval(ka); try { ws.close(); } catch (e) {} } };
}

export function openLobby(game = null) {
  css(); document.getElementById('lb-ov')?.remove();
  const ov = document.createElement('div'); ov.className = 'lb-ov'; ov.id = 'lb-ov';
  ov.innerHTML = `<div class="lb-mod" role="dialog" aria-modal="true"><header><h2>🌐 Sảnh ${game ? esc(GAME_INFO[game]?.[1] || '') : 'chung'}</h2><a href="${ROOT}sanh/${game ? '?game=' + game : ''}" style="font:800 14px Nunito;color:#2f5fd0">Mở trang Sảnh ↗</a><button class="x" aria-label="Đóng">✕</button></header><div class="lb-host"></div></div>`;
  document.body.append(ov);
  const L = mountLobby(ov.querySelector('.lb-host'), { game });
  ov.querySelector('.lb-host').style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column';
  ov.querySelector('.lb-host .lb').style.flex = '1';
  const close = () => { L.destroy(); ov.remove(); removeEventListener('keydown', k); };
  const k = e => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', k);
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.x')) close(); });
}
