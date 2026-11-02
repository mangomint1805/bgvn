import { Host, Client, MAX } from './net.js?v=5';
import { MODES, COLOR_NAME, cardText, DRAW_VALUE } from './engine.js';
import * as fx from './ufx.js';
import { openGuide } from './guide.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

let net = null, isHost = false, myId = null, lobby = null, view = null, prevView = null;
let shownTop = null, freshIds = new Set(), modalKey = null, landing = false;

// ---------- lá bài ----------
export const SYM = { skip: '⊘', rev: '⇄', d2: '+2', d4: '+4', skipall: '⊘⊘', discall: '✕', wild: '', wd4: '+4', wrd4: '⇄4', wd6: '+6', wd10: '+10', roulette: '?' };
export const LBL = { skip: 'CẤM LƯỢT', rev: 'ĐẢO CHIỀU', d2: 'RÚT 2', d4: 'RÚT 4', skipall: 'CẤM HẾT', discall: 'BỎ CẢ MÀU', wild: 'ĐỔI MÀU', wd4: 'RÚT 4', wrd4: 'ĐẢO + RÚT 4', wd6: 'RÚT 6', wd10: 'RÚT 10', roulette: 'QUAY MÀU' };
export function cardHTML(c, cls = '', attrs = '') {
  if (!c) return `<div class="ucard back ${cls}" ${attrs}></div>`;
  const sym = c.type === 'n' ? String(c.num) : SYM[c.type];
  const under = c.type === 'n' && (c.num === 6 || c.num === 9) ? ' style="text-decoration:underline;text-decoration-thickness:3px"' : '';
  const cor = c.type === 'n' ? c.num : (SYM[c.type] || '★');
  return `<div class="ucard c-${c.color} t-${c.type} ${cls}" data-id="${c.id}" ${attrs}><span class="cor tl">${cor}</span><div class="oval"><b class="${sym.length > 2 ? 'sm' : ''}"${under}>${sym}</b></div><span class="cor br">${cor}</span>${c.type !== 'n' ? `<div class="lbl"><span>${LBL[c.type]}</span></div>` : ''}</div>`;
}
const AV_COL = ['#ff4d5e', '#ff8a3d', '#e0a800', '#2fc76f', '#20a8a0', '#3d8bff', '#7a5cff', '#d94dff', '#ff2d87', '#5b6b8a'];
const avColor = name => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AV_COL[h % AV_COL.length]; };
const avatar = name => `<div class="av" style="background:${avColor(name)}">${esc([...name.replace(' 🤖', '').trim()][0] || '?').toUpperCase()}</div>`;
const COL_HEX = { R: '#ff4d5e', Y: '#ffc23d', G: '#2fc76f', B: '#3d8bff' };

// ---------- màn hình ----------
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
function openModal(html, cls = '', key = null) { $('#modal-box').className = 'modal-box ' + cls; $('#modal-box').innerHTML = html; $('#modal').classList.add('open'); modalKey = key; }
function closeModal() { $('#modal').classList.remove('open'); modalKey = null; }
document.body.appendChild($('#modal'));
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !modalKey) closeModal(); });
window.__closeModal = closeModal;

// ---------- trang chủ ----------
$('#name').value = ls.get('bgvn-name') || '';
const hero = [{ color: 'R', type: 'n', num: 7 }, { color: 'Y', type: 'skip' }, { color: 'W', type: 'wd4' }, { color: 'G', type: 'rev' }, { color: 'B', type: 'd2' }];
$('#hero-cards').innerHTML = hero.map((c, i) => cardHTML(c, '', `style="transform:translateX(-50%) rotate(${(i - 2) * 14}deg);animation-delay:${i * 80}ms"`)).join('');
function myName() { const n = $('#name').value.trim() || 'Bạn'; ls.set('bgvn-name', n); return n; }
const handlers = {
  onLobby(info, code, started) { lobby = info; $('#room-code').textContent = code; if (!started) { view = null; prevView = null; renderLobby(); if (!$('#screen-lobby').classList.contains('active')) show('screen-lobby'); } },
  onState(v) { if (!v) { view = null; closeModal(); show('screen-lobby'); renderLobby(); return; } prevView = view; view = v; if (!$('#screen-game').classList.contains('active')) { show('screen-game'); prevView = null; } render(); animate(prevView, view); },
  onError(m) { toast(m); fx.sfx.bad(); },
  onJoined(id) { myId = id; },
  onDisconnect() { toast('Mất kết nối – đang tự vào lại…'); },
};
function startHost(offline) {
  fx.actx(); fx.musicResumeIfOn();
  net = new Host(myName(), handlers, offline); isHost = true; myId = 'host';
  if (offline) { net.addBot(); net.addBot(); net.addBot(); }
  $('#code-box').style.display = offline ? 'none' : '';
  show('screen-lobby');
}
$('#btn-offline').onclick = () => startHost(true);
$('#btn-create').onclick = () => startHost(false);
$('#btn-join').onclick = () => {
  const code = $('#join-code').value.trim(); if (code.length < 5) { toast('Nhập mã phòng 5 ký tự nhé.'); return; }
  fx.actx(); fx.musicResumeIfOn();
  net = new Client(code, myName(), handlers); isHost = false; $('#code-box').style.display = ''; toast('Đang kết nối…');
};
$('#join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-join').click(); });
const qcode = new URLSearchParams(location.search).get('room'); if (qcode) $('#join-code').value = qcode.toUpperCase();
function leave() { if (net) net.destroy(); net = null; view = null; lobby = null; closeModal(); show('screen-home'); }
$('#btn-leave-lobby').onclick = leave;
$('#btn-leave').onclick = () => openModal(`<h2>Rời ván?</h2><p style="text-align:center">${isHost ? 'Bạn là chủ phòng – rời đi sẽ kết thúc ván cho mọi người.' : 'Bạn có thể vào lại bằng mã phòng.'}</p><div class="win"><div class="btns"><button class="btn" onclick="__closeModal()">Ở lại</button><button class="btn red" id="m-leave">Rời ván</button></div></div>`);
document.addEventListener('click', e => { if (e.target.id === 'm-leave') leave(); });
$('#btn-copy').onclick = () => { const url = location.origin + location.pathname + '?room=' + $('#room-code').textContent; navigator.clipboard?.writeText(url).then(() => toast('Đã chép link mời 📋'), () => toast(url)); };

// ---------- sảnh ----------
const RULE_INFO = {
  stackDraw: ['Cộng dồn lá rút', 'Bị +2/+4… thì chồng lá rút bằng hoặc lớn hơn để đẩy phạt đi tiếp.'],
  stackSkip: ['Chồng lá Cấm', 'Bị Cấm lượt thì đánh Cấm lượt để chuyền cho người kế.'],
  sevenZero: ['Luật 7 – 0', 'Đánh 7: đổi bài với 1 người. Đánh 0: mọi người chuyền bài theo chiều chơi.'],
  drawUntil: ['Rút tới khi đánh được', 'Không có lá hợp thì rút liên tục tới khi ra lá đánh được (bắt buộc đánh).'],
  mercy: ['Luật không khoan nhượng', 'Ai giữ từ 25 lá trở lên bị loại.'],
  noActionFinish: ['Không về bằng lá chức năng', 'Lá cuối cùng phải là lá số. Còn mỗi lá chức năng/đổi màu thì phải rút bài.'],
};
const MODE_DESC = {
  classic: 'Luật chuẩn 108 lá. Không có lá đánh được thì rút 1 lá, hợp thì đánh luôn.',
  house: 'Luật rừng quen thuộc: cộng dồn +2/+4, Cấm chồng Cấm, không về bằng lá chức năng, không chặn ngang.',
  nomercy: 'Bộ 168 lá cực gắt: +6, +10, Quay màu, Bỏ cả màu, 7–0, ≥ 25 lá là bị loại!',
};
function renderLobby() {
  if (!lobby) return;
  const ps = lobby.players;
  $('#pcount').textContent = `${ps.length}/${MAX}`;
  $('#plist').innerHTML = ps.map(p => `<li>${avatar(p.name)}<span>${esc(p.name)}${p.id === myId ? ' <small>(bạn)</small>' : ''}${p.id === 'host' ? ' 👑' : ''}${!p.connected ? ' <small>📴</small>' : ''}</span>${isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}">✕</button>` : ''}</li>`).join('');
  $$('#plist [data-rm]').forEach(b => b.onclick = () => net.removePlayer(b.dataset.rm));
  $('#btn-addbot').style.display = isHost ? '' : 'none';
  $('#modes').innerHTML = Object.entries(MODES).map(([k, m]) => `<button class="mode ${lobby.mode === k ? 'on' : ''}" data-mode="${k}" ${isHost ? '' : 'disabled'}><b>${k === 'nomercy' ? '💀 ' : k === 'house' ? '🔥 ' : '🎴 '}${m.name}</b><small>${MODE_DESC[k]}</small></button>`).join('');
  $$('#modes [data-mode]').forEach(b => b.onclick = () => net.setMode(b.dataset.mode));
  $('#rules').innerHTML = Object.entries(RULE_INFO).map(([k, [t, d]]) => `<label class="rule"><input type="checkbox" data-rule="${k}" ${lobby.rules[k] ? 'checked' : ''} ${isHost ? '' : 'disabled'}><span><b>${t}</b><small>${d}</small></span></label>`).join('');
  $$('#rules [data-rule]').forEach(i => i.onchange = () => net.setRule(i.dataset.rule, i.checked));
  $('#btn-start').style.display = isHost ? '' : 'none';
  $('#wait-msg').style.display = isHost ? 'none' : '';
}
$('#btn-addbot').onclick = () => net && net.addBot();
$('#btn-start').onclick = () => { fx.actx(); net && net.start(); };

// ---------- công cụ ----------
$('#speed').innerHTML = Object.entries(fx.SPEEDS).map(([k, v]) => `<option value="${k}">⚡ ${v.name}</option>`).join('');
$('#speed').value = fx.getSpeed(); $('#speed').onchange = e => fx.setSpeed(e.target.value);
const syncMusic = () => { $('#btn-music').classList.toggle('on', fx.musicIsOn()); $('#btn-music-home').classList.toggle('on', fx.musicIsOn()); };
$('#btn-music').onclick = $('#btn-music-home').onclick = () => { fx.actx(); fx.musicToggle(); syncMusic(); }; syncMusic();
$('#vol').value = fx.musicVolume(); $('#vol').oninput = e => fx.musicVolume(+e.target.value);
const syncMute = () => $('#btn-mute').textContent = fx.isMuted() ? '🔇' : '🔊';
$('#btn-mute').onclick = () => { fx.toggleMute(); syncMute(); }; syncMute();
$('#btn-guide').onclick = $('#btn-guide-home').onclick = () => openGuide(openModal, cardHTML);
$('#btn-log').onclick = () => $('#log').classList.toggle('open');
$('#btn-log-close').onclick = () => $('#log').classList.remove('open');

// ---------- gửi hành động ----------
function send(a) { if (!net) return; if (isHost) net.act('host', a); else net.act(a); }
const me = () => view && view.players.find(p => p.id === myId);
const isMyTurn = () => view && view.phase === 'playing' && view.players[view.turn].id === myId && !view.pending;
const pname = id => (view.players.find(p => p.id === id) || {}).name || '?';

function pickColor(title, cb) {
  openModal(`<h2>${title}</h2><div class="color-pick">${['R', 'Y', 'G', 'B'].map(c => `<button data-c="${c}" style="background:${COL_HEX[c]}">${COLOR_NAME[c]}<small>${(me().hand || []).filter(x => x.color === c).length} lá trong tay</small></button>`).join('')}</div>${cb.cancel ? '<div class="win"><div class="btns"><button class="btn" onclick="__closeModal()">Huỷ</button></div></div>' : ''}`, '', cb.key || null);
  $$('.color-pick [data-c]').forEach(b => b.onclick = () => { closeModal(); cb(b.dataset.c); });
}

// ---------- vẽ bàn ----------
function render() {
  const v = view; if (!v) return;
  const meP = me();
  $('#mode-tag').textContent = (v.mode === 'nomercy' ? '💀 ' : v.mode === 'house' ? '🔥 ' : '🎴 ') + MODES[v.mode].name;
  // đối thủ
  const n = v.players.length, myIdx = v.players.findIndex(p => p.id === myId);
  const opps = []; for (let k = 1; k < n; k++) opps.push(v.players[(myIdx + k) % n]);
  const tbl = $('#table').getBoundingClientRect(); const portrait = tbl.width < tbl.height * 1.05;
  $('#opps').innerHTML = opps.map((p, i) => {
    let x, y;
    if (portrait) { // xếp theo hình chữ U: cột trái → hàng trên → cột phải, cách đều nhau
      const W = tbl.width, H = tbl.height, mx = 48, top = 62, bot = H * 0.8;
      const side = bot - top, across = W - 2 * mx, L = 2 * side + across;
      const m = opps.length; let d = m === 1 ? L / 2 : (L * (i + 0.5)) / m;
      if (m > 1 && m <= 3) d = side + across * (i + 0.5) / m;
      let px, py;
      if (d < side) { px = mx; py = bot - d; } else if (d < side + across) { px = mx + (d - side); py = top; } else { px = W - mx; py = top + (d - side - across); }
      x = px / W * 100; y = py / H * 100;
    } else {
      const t = opps.length === 1 ? 0.5 : i / (opps.length - 1);
      const ang = Math.PI * (1 - t);
      x = 50 + 42 * Math.cos(ang); y = Math.max(12, 60 - 46 * Math.sin(ang));
      x = Math.min(Math.max(x, 70 / tbl.width * 100), 100 - 70 / tbl.width * 100);
    }
    const turn = v.phase === 'playing' && (v.pending ? v.pending.player === p.id : v.players[v.turn].id === p.id);
    const fanN = Math.min(p.handCount, 8);
    const fan = Array.from({ length: fanN }, (_, j) => `<div class="ucard back mini" style="transform:rotate(${(j - (fanN - 1) / 2) * 9}deg)"></div>`).join('');
    const canCatch = v.unoWatch === p.id && p.handCount === 1 && !p.saidUno;
    return `<div class="seat ${turn ? 'turn' : ''} ${p.out ? 'out' : ''} ${p.handCount <= 2 && !p.out ? 'danger' : ''}" data-pid="${p.id}" style="left:${x}%;top:${y}%">
      <div class="plate">${avatar(p.name)}<span class="count">${p.handCount}</span>${p.saidUno && p.handCount <= 2 ? '<span class="uno-tag">UNO!</span>' : ''}
      <div class="nm">${esc(p.name.replace(' 🤖', ''))}${p.isBot ? ' <span class="bot">🤖</span>' : ''}</div><div class="fan">${fan || '<small>—</small>'}</div></div>
      ${canCatch ? `<button class="btn red catchme" data-catch="${p.id}">🚨 Bắt lỗi!</button>` : ''}</div>`;
  }).join('');
  $$('[data-catch]').forEach(b => b.onclick = () => send({ type: 'catch', target: b.dataset.catch }));
  // giữa bàn
  $('#deck-cnt').textContent = v.deckCount + ' lá';
  const canDraw = isMyTurn() && !v.stack && !v.skipStack && !v.mustPlay && !v.canPass;
  $('#deck').classList.toggle('can', canDraw);
  $('#deck').onclick = () => { if (canDraw) send({ type: 'draw' }); };
  if (!landing) renderDiscard(v.top);
  $('#color-dot').style.setProperty('--cc', COL_HEX[v.color] || '#ccc');
  $('#color-dot').title = 'Màu hiện tại: ' + COLOR_NAME[v.color];
  $('#dir').classList.toggle('ccw', v.dir < 0);
  $('#dir').style.color = (COL_HEX[v.color] || '#7a5cff') + '66';
  const sb = $('#stack-badge');
  sb.textContent = v.stack ? `+${v.stack.total} lá!` : v.skipStack ? '⛔ Cấm lượt' : '';
  sb.classList.toggle('show', !!(v.stack || v.skipStack));
  // gợi ý
  renderHint(v, meP);
  // tay bài
  const hand = (meP && meP.hand) || [];
  const order = { R: 0, Y: 1, G: 2, B: 3, W: 4 };
  const typeOrd = c => c.type === 'n' ? c.num : 10 + Object.keys(SYM).indexOf(c.type);
  const sorted = [...hand].sort((a, b) => order[a.color] - order[b.color] || typeOrd(a) - typeOrd(b));
  const my = isMyTurn();
  const hEl = $('#hand'); hEl.classList.toggle('myturn', my);
  hEl.innerHTML = sorted.map(c => {
    const ok = my && v.playable.includes(c.id);
    return cardHTML(c, `${ok ? 'ok' : my ? 'no' : ''} ${freshIds.has(c.id) ? 'fresh' : ''} ${v.mustPlay === c.id && my ? 'must' : ''}`);
  }).join('');
  fitHand();
  $$('#hand .ucard').forEach(el => el.onclick = () => onCardClick(el.dataset.id));
  renderActions(v, meP);
  // nhật ký
  $('#log-list').innerHTML = v.log.map(l => `<li>${esc(l)}</li>`).join('');
  $('#log-list').scrollTop = 1e6;
  handlePending(v);
  if (v.phase === 'ended') showWin(v);
  else if (modalKey === 'win') closeModal();
}
function renderDiscard(c) {
  if (!c) return;
  shownTop = c;
  let h = 0; for (const ch of c.id) h = (h * 17 + ch.charCodeAt(0)) % 360;
  $('#discard').innerHTML = cardHTML(c, '', `style="transform:rotate(${(h % 24) - 12}deg)"`);
}
function fitHand() {
  const hEl = $('#hand'); const cards = hEl.children; const nn = cards.length; if (!nn) return;
  const cw = cards[0].offsetWidth; const avail = hEl.clientWidth - 24;
  let ov = nn > 1 ? (avail - cw) / (nn - 1) - cw : 0;
  ov = Math.min(ov, 6); ov = Math.max(ov, -cw * 0.62);
  hEl.style.setProperty('--ov', ov + 'px');
  hEl.style.justifyContent = nn * (cw + ov) > avail ? 'flex-start' : 'center';
}
addEventListener('resize', () => view && render());
function renderHint(v, meP) {
  const h = $('#hint'); h.classList.remove('mine');
  if (v.phase !== 'playing') { h.textContent = ''; h.style.display = 'none'; return; }
  h.style.display = '';
  const dot = `<span class="cc" style="background:${COL_HEX[v.color]}"></span> <b>${COLOR_NAME[v.color]}</b>`;
  if (meP && meP.out) { h.innerHTML = '💀 Bạn đã bị loại – ngồi xem tiếp nhé.'; return; }
  if (v.pending) { h.innerHTML = v.pending.player === myId ? '👉 Bạn đang chọn…' : `⏳ ${esc(pname(v.pending.player))} đang ${v.pending.type === 'swap' ? 'chọn người đổi bài' : 'chọn màu'}…`; return; }
  const cur = v.players[v.turn];
  if (cur.id !== myId) { h.innerHTML = `Lượt của <b>${esc(cur.name)}</b> · màu ${dot}`; return; }
  h.classList.add('mine');
  if (v.stack) h.innerHTML = v.playable.length ? `🔥 Bị dồn <b>+${v.stack.total}</b>! Chồng lá rút ≥ +${v.stack.last} để đẩy đi, hoặc chịu phạt.` : `😵 Không có lá để chồng – bấm <b>Chịu phạt +${v.stack.total}</b>.`;
  else if (v.skipStack) h.innerHTML = '⛔ Bạn bị Cấm! Đánh Cấm lượt để chuyền, hoặc chịu mất lượt.';
  else if (v.mustPlay) h.innerHTML = '✨ Lá vừa rút đánh được – bấm vào nó để đánh' + (v.canPass ? ', hoặc Giữ lại.' : '!');
  else if (v.playable.length) h.innerHTML = `🎯 Lượt bạn! Đánh lá cùng màu ${dot}, cùng số/ký hiệu, hoặc lá Đổi màu.`;
  else if (v.rules.noActionFinish && meP.hand.length === 1 && meP.hand[0].type !== 'n') h.innerHTML = '🚫 Lá cuối không được là lá chức năng – bấm <b>Rút bài</b>.';
  else h.innerHTML = `🙈 Không có lá hợp màu ${dot} – bấm <b>Rút bài</b>.`;
}
function renderActions(v, meP) {
  const a = []; const my = isMyTurn();
  if (v.phase === 'playing' && meP && !meP.out) {
    if (my && v.stack) a.push(`<button class="btn red" data-act="take">😵 Chịu phạt +${v.stack.total}</button>`);
    else if (my && v.skipStack) a.push(`<button class="btn red" data-act="take">⛔ Chịu mất lượt</button>`);
    else if (my && v.canPass) a.push(`<button class="btn" data-act="pass">✋ Giữ lại, qua lượt</button>`);
    else if (my && !v.mustPlay) a.push(`<button class="btn blue" data-act="draw">🂠 Rút bài</button>`);
    if (meP.handCount <= 2 && !meP.saidUno && (my || v.unoWatch === myId)) a.push(`<button class="btn uno" data-act="uno">UNO!</button>`);
  }
  $('#actions').innerHTML = a.join('');
  $$('#actions [data-act]').forEach(b => b.onclick = () => { if (b.dataset.act === 'uno') fx.sfx.uno(); send({ type: b.dataset.act }); });
}
function onCardClick(id) {
  const v = view; if (!isMyTurn()) { toast('Chưa tới lượt bạn 😤'); return; }
  const c = me().hand.find(x => x.id === id); if (!c) return;
  if (!v.playable.includes(id)) { fx.sfx.bad(); fx.shake($(`#hand [data-id="${id}"]`)); toast(v.rules.noActionFinish && (me().hand.length === 1 || (c.type === 'discall' && me().hand.every(x => x.color === c.color))) && c.type !== 'n' ? 'Không được về bằng lá chức năng – lá cuối phải là lá số!' : v.stack ? `Phải chồng lá rút ≥ +${v.stack.last}` : v.mustPlay ? 'Chỉ được đánh lá vừa rút' : 'Lá này không hợp màu/số'); return; }
  if (c.color === 'W') { pickColor('Chọn màu tiếp theo', Object.assign(col => send({ type: 'play', cardId: id, color: col }), { cancel: true })); return; }
  send({ type: 'play', cardId: id });
}
function handlePending(v) {
  const pr = v.pending;
  if (!pr || pr.player !== myId || v.phase !== 'playing') { if (modalKey && modalKey.startsWith('pend')) closeModal(); return; }
  const key = 'pend-' + pr.type + v.logN;
  if (modalKey && modalKey.startsWith('pend')) return;
  if (pr.type === 'color') pickColor('Chọn màu tiếp theo', Object.assign(col => send({ type: 'color', color: col }), { key }));
  else if (pr.type === 'roulette') pickColor('🎡 Vòng quay màu! Chọn 1 màu – bạn sẽ lật bài tới khi ra màu đó', Object.assign(col => send({ type: 'color', color: col }), { key }));
  else if (pr.type === 'swap') {
    const others = v.players.filter(p => !p.out && p.id !== myId);
    openModal(`<h2>🔄 Đổi bài với ai?</h2><div class="target-list">${others.map(p => `<button data-t="${p.id}">${avatar(p.name)}${esc(p.name)}<span class="n">${p.handCount} lá</span></button>`).join('')}</div>`, '', key);
    $$('.target-list [data-t]').forEach(b => b.onclick = () => { closeModal(); send({ type: 'swap', target: b.dataset.t }); });
  }
}
function showWin(v) {
  if (modalKey === 'win') return;
  const w = v.players.find(p => p.id === v.winner);
  const meWin = v.winner === myId;
  const rank = [...v.players].sort((a, b) => (a.out - b.out) || a.handCount - b.handCount);
  setTimeout(() => {
    if (!view || view.phase !== 'ended') return;
    openModal(`<div class="win"><div class="big">${meWin ? '🏆' : '🎉'}</div><h2>${meWin ? 'Bạn thắng rồi!' : esc(w ? w.name : '?') + ' thắng!'}</h2>
      <ol style="text-align:left;display:inline-block">${rank.map(p => `<li>${esc(p.name)} – ${p.out ? 'bị loại' : p.handCount + ' lá'}</li>`).join('')}</ol>
      <div class="btns">${isHost ? '<button class="btn pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về sảnh</button>' : '<p>Chờ chủ phòng mở ván mới…</p>'}</div></div>`, '', 'win');
    const ag = $('#m-again'); if (ag) ag.onclick = () => { closeModal(); net.restart(); net.start(); };
    const lb = $('#m-lobby'); if (lb) lb.onclick = () => { closeModal(); net.restart(); };
  }, 1400 * fx.S());
}

// ---------- hoạt ảnh ----------
const seatEl = pid => pid === myId ? $('#hand') : $(`.seat[data-pid="${pid}"] .plate`);
function findByLine(line) {
  const ps = [...view.players].sort((a, b) => b.name.length - a.name.length);
  return ps.find(p => line.startsWith(p.name) || line.includes(' ' + p.name));
}
function animate(a, b) {
  if (!b) return;
  if (!a) { dealAnim(b); return; }
  const lines = b.logN > a.logN ? b.log.slice(-Math.min(40, b.logN - a.logN)) : [];
  // lá mới trên chồng bỏ
  if (b.top && a.top && b.top.id !== a.top.id) {
    const line = lines.find(l => / đánh /.test(l)); const who = line && findByLine(line);
    const from = who ? seatEl(who.id) : $('#deck');
    landing = true; renderDiscard(a.top);
    let rot = 0; for (const ch of b.top.id) rot = (rot * 17 + ch.charCodeAt(0)) % 360;
    fx.fly(cardHTML(b.top), from, $('#discard'), { duration: 420, rotate: (rot % 24) - 12, scale: 96 / 84, onEnd: () => {
      landing = false; renderDiscard(view.top); fx.pop($('#discard .ucard'));
      playSfx(b.top); fx.burst($('#discard'), b.top.color, b.top.type === 'n' ? 10 : 24);
      bannerFor(b.top, b);
    } });
  }
  // rút bài
  for (const p of b.players) {
    const q = a.players.find(x => x.id === p.id); if (!q) continue;
    const d = p.handCount - q.handCount;
    const swapped = lines.some(l => /đổi bài|chuyền bài/.test(l));
    if (d > 0 && !swapped) {
      const el = seatEl(p.id);
      for (let i = 0; i < Math.min(d, 6); i++) fx.fly(cardHTML(null), $('#deck'), el, { delay: i * 90, duration: 380 });
      setTimeout(() => fx.sfx.draw(), 100);
      if (d >= 2) setTimeout(() => fx.floatText(el, '+' + d), 300 * fx.S());
    }
  }
  // lá mới trong tay mình
  const mineA = new Set((a.players.find(p => p.id === myId)?.hand || []).map(c => c.id));
  const mineB = b.players.find(p => p.id === myId)?.hand || [];
  const newOnes = mineB.filter(c => !mineA.has(c.id)).map(c => c.id);
  if (newOnes.length && newOnes.length < mineB.length) { freshIds = new Set(newOnes); setTimeout(() => { freshIds.clear(); $$('#hand .fresh').forEach(e => e.classList.remove('fresh')); }, 4000 * fx.S()); render(); }
  // dòng nhật ký đặc biệt
  for (const l of lines) {
    const who = findByLine(l);
    if (/: UNO!/.test(l)) { fx.sfx.uno(); if (who) fx.floatText(seatEl(who.id), 'UNO!', 'uno'); if (who && who.id !== myId) fx.banner('UNO!', 'uno'); }
    else if (/bắt lỗi/.test(l)) { fx.sfx.caught(); fx.banner('🚨 BẮT LỖI!', 'R'); }
    else if (/bị loại/.test(l)) { fx.sfx.out(); fx.banner('💀 ' + (who ? who.name.replace(' 🤖', '') : '') + ' bị loại', 'R'); }
    else if (/đổi bài|chuyền bài/.test(l)) { fx.sfx.swap(); fx.banner('🔄 Đổi bài!', 'B'); }
    else if (/ chọn màu /.test(l) || /chọn [^,]+, lật/.test(l)) { const c = Object.keys(COLOR_NAME).find(k => l.includes(COLOR_NAME[k] + '.') || l.includes(COLOR_NAME[k] + ',')); if (c) { setTimeout(() => { fx.ring($('#color-dot'), c); fx.pop($('#color-dot')); }, 450 * fx.S()); } if (/lật/.test(l)) fx.sfx.roulette(); }
    else if (/chịu phạt/.test(l) && who) { fx.shake(seatEl(who.id)); }
    else if (/bị cấm lượt\./.test(l) && who) { fx.sfx.skip(); fx.floatText(seatEl(who.id), '⛔'); }
  }
  // tới lượt mình
  if (isMyTurn() && !(a.phase === 'playing' && a.players[a.turn].id === myId && !a.pending)) setTimeout(() => fx.sfx.turn(), 380 * fx.S());
  if (b.phase === 'ended' && a.phase !== 'ended') setTimeout(() => { if (b.winner === myId) { fx.confetti(); fx.sfx.win(); } else { fx.sfx.win(); fx.confetti(); } }, 600 * fx.S());
}
function playSfx(c) {
  const t = c.type;
  if (t === 'n') fx.sfx.play();
  else if (t === 'skip') fx.sfx.skip();
  else if (t === 'skipall') fx.sfx.skipall();
  else if (t === 'rev') fx.sfx.rev();
  else if (t === 'discall') fx.sfx.discall();
  else if (t === 'roulette') fx.sfx.roulette();
  else if (t === 'wild') fx.sfx.wild();
  else if (DRAW_VALUE[t]) { fx.sfx.plus(DRAW_VALUE[t]); if (t === 'wrd4') fx.sfx.rev(); }
}
function bannerFor(c, v) {
  const t = c.type, col = c.color === 'W' ? (v.color || '') : c.color;
  if (DRAW_VALUE[t]) fx.banner(v.stack ? `+${v.stack.total}!` : `+${DRAW_VALUE[t]}!`, col);
  else if (t === 'skip') fx.banner('⛔ Cấm!', col);
  else if (t === 'skipall') fx.banner('⛔ Cấm hết!', col);
  else if (t === 'rev') fx.banner('⇄ Đảo chiều!', col);
  else if (t === 'discall') fx.banner('🗑️ Bỏ cả màu!', col);
  else if (t === 'roulette') fx.banner('🎡 Quay màu!', '');
  else if (t === 'wild') fx.banner('🌈 Đổi màu!', '');
  if (t === 'wd10' || t === 'wd6' || (v.stack && v.stack.total >= 8)) fx.shake($('#table'));
}
function dealAnim(v) {
  const n = v.players.length; let k = 0;
  for (let r = 0; r < 3; r++) for (const p of v.players) { if (p.out) continue; fx.fly(cardHTML(null), $('#deck'), seatEl(p.id), { delay: (k++) * 45, duration: 360 }); }
  setTimeout(() => fx.sfx.flip(), 50);
  setTimeout(() => { fx.banner('Bắt đầu! 🎉', ''); fx.sfx.turn(); }, (k * 45 + 400) * fx.S());
  void n;
}
if (location.hash === '#debug') window.__dbg = () => ({ net, view });
