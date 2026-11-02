// Giao diện + nối với lớp mạng
import { CARD_INFO, CHARACTERS, ROLES, SUIT_SYMBOL, rankLabel, cardLabel, suitify } from './cards.js';
import { Host, Client } from './net.js';
import { imgTag, avatarTag } from './images.js';
import { S, SPEEDS, getSpeed, setSpeed, sfx, cardSfx, gunSfx, fly, shake, flash, floatText, banner, toggleMute, isMuted, shoot, arrows, explode, sparkle, confetti, stamp, screenShake } from './fx.js';
import { THEMES, getTheme, setTheme, onThemeChange } from './themes.js';
import { openGuide } from './guide.js';
import { musicSetTheme, musicToggle, musicIsOn, musicVolume, musicResumeIfOn } from './music.js';

const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let net = null, isHost = false, myId = null, view = null, prevView = null, lobby = [];
let selectedCard = null;
let sidMode = false, sidPick = [];

// ---------- Màn hình ----------
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); $('#' + id).classList.add('active'); }
let toastTimer;
function toast(msg, info = false) { const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (info ? ' info' : ''); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 3000); }

// ---------- Home ----------
try { $('#inp-name').value = localStorage.getItem('bangvn-name') || ''; } catch (e) {}
const urlCode = new URLSearchParams(location.search).get('room');
if (urlCode) $('#inp-code').value = urlCode.toUpperCase();

function getName() {
  const n = $('#inp-name').value.trim();
  if (!n) { toast('Nhập tên trước đã!'); $('#inp-name').focus(); return null; }
  try { localStorage.setItem('bangvn-name', n); } catch (e) {}
  return n;
}
const handlers = {
  onLobby(players, code, started) { lobby = players; renderLobby(code); if (!started && !view) show('screen-lobby'); },
  onState(v) { prevView = view; view = v; markFresh(prevView, v); if (!v) { prevView = null; show('screen-lobby'); return; } const first = !$('#screen-game').classList.contains('active'); show('screen-game'); render(); if (first) dealAnimation(); else animateDiff(prevView, view); },
  onError(msg) { toast(msg); },
  onJoined(id) { myId = id; },
  onDisconnect() { toast('Mất kết nối với chủ phòng. Tải lại trang để vào lại.'); },
};
$('#btn-create').onclick = () => {
  const n = getName(); if (!n) return;
  isHost = true; myId = 'host';
  net = new Host(n, handlers);
  $('#lobby-host-actions').classList.remove('hidden'); $('#lobby-msg').textContent = 'Gửi mã phòng cho bạn bè. Cần 4–7 người (có thể thêm bot).';
  show('screen-lobby'); $('#lobby-code').textContent = '…';
};
$('#btn-offline').onclick = () => {
  const n = getName(); if (!n) return;
  isHost = true; myId = 'host';
  net = new Host(n, handlers, true);
  if (location.hash === '#debug') window.__net = net;
  for (let i = 0; i < 3; i++) net.addBot();
  $('#lobby-host-actions').classList.remove('hidden'); $('#btn-copy').classList.add('hidden');
  show('screen-lobby');
};
$('#btn-join').onclick = () => {
  const n = getName(); if (!n) return;
  const code = $('#inp-code').value.trim().toUpperCase();
  if (code.length !== 5) { toast('Mã phòng gồm 5 ký tự.'); return; }
  isHost = false; net = new Client(code, n, handlers);
  $('#lobby-host-actions').classList.add('hidden');
  show('screen-lobby'); $('#lobby-code').textContent = code; $('#lobby-msg').textContent = 'Đang kết nối…';
};
$('#btn-copy').onclick = () => {
  const code = $('#lobby-code').textContent;
  const url = location.origin + location.pathname + '?room=' + code;
  navigator.clipboard?.writeText(url).then(() => toast('Đã sao chép link mời!', true), () => toast(url, true));
};
$('#btn-add-bot').onclick = () => net?.addBot();
$('#btn-start').onclick = () => net?.start();
$('#btn-leave').onclick = () => { net?.destroy(); location.href = location.pathname; };
$('#btn-log-toggle').onclick = () => $('#log').classList.toggle('hidden');
$('#btn-mute').textContent = isMuted() ? '🔇' : '🔊';
$('#btn-mute').onclick = () => { $('#btn-mute').textContent = toggleMute() ? '🔇' : '🔊'; };
document.body.appendChild($('#modal')); // nằm trên lớp hiệu ứng
$('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };

// ---------- Chủ đề + nhạc ----------
function renderThemeUI() {
  const t = getTheme();
  const pick = $('#theme-pick'); pick.innerHTML = '';
  for (const [k, th] of Object.entries(THEMES)) { const b = el('button', k === t ? 'on' : '', `${th.icon} ${th.name}`); b.onclick = () => setTheme(k); pick.appendChild(b); }
  const sel = $('#theme-select'); sel.innerHTML = Object.entries(THEMES).map(([k, th]) => `<option value="${k}"${k === t ? ' selected' : ''}>${th.icon} ${th.name}</option>`).join('');
}
function renderMusicUI() { const o = musicIsOn(); $('#btn-music-home').textContent = `🎵 Nhạc nền: ${o ? 'bật' : 'tắt'}`; $('#btn-music-home').classList.toggle('on', o); $('#btn-music').style.opacity = o ? 1 : .45; }
$('#theme-select').onchange = e => setTheme(e.target.value);
function renderSpeedUI() {
  const k = getSpeed();
  $('#speed-pick').innerHTML = '<span class="pick-lbl">Tốc độ hiệu ứng:</span>' + Object.entries(SPEEDS).map(([key, v]) => `<button data-s="${key}" class="${key === k ? 'on' : ''}">${v.name}</button>`).join('');
  $('#speed-pick').querySelectorAll('button').forEach(b => b.onclick = () => { setSpeed(b.dataset.s); renderSpeedUI(); });
  $('#speed-select').innerHTML = Object.entries(SPEEDS).map(([key, v]) => `<option value="${key}"${key === k ? ' selected' : ''}>⏱ ${v.name}</option>`).join('');
}
$('#speed-select').onchange = e => { setSpeed(e.target.value); renderSpeedUI(); };
renderSpeedUI();
onThemeChange(t => { renderThemeUI(); musicSetTheme(t); });
$('#btn-music-home').onclick = $('#btn-music').onclick = () => { musicToggle(); renderMusicUI(); };
$('#music-vol').value = musicVolume(); $('#music-vol').oninput = e => musicVolume(+e.target.value);
document.addEventListener('pointerdown', () => musicResumeIfOn(), { once: true });
setTheme(getTheme()); renderMusicUI();


function renderLobby(code) {
  if (code) $('#lobby-code').textContent = code;
  const ul = $('#lobby-players'); ul.innerHTML = '';
  lobby.forEach((p, i) => {
    const li = el('li', '', `<span>${i + 1}. ${esc(p.name)}${p.id === 'host' ? ' 👑' : ''}${p.connected === false ? ' <span class="off">(mất kết nối)</span>' : ''}</span>`);
    if (isHost && p.id !== 'host') { const b = el('button', 'btn small ghost', p.isBot ? 'Xoá bot' : 'Mời ra'); b.onclick = () => net.removePlayer(p.id); li.appendChild(b); }
    ul.appendChild(li);
  });
  if (isHost) { $('#btn-start').disabled = lobby.length < 4 || lobby.length > 7; $('#btn-add-bot').disabled = lobby.length >= 7; $('#lobby-msg').textContent = `${lobby.length}/7 người. ${lobby.length < 4 ? 'Cần thêm ' + (4 - lobby.length) + ' người hoặc bot.' : 'Sẵn sàng!'}`; }
  else if (!view) $('#lobby-msg').textContent = 'Đang chờ chủ phòng bắt đầu…';
}

// ---------- Gửi action ----------
function send(a) { selectedCard = null; sidMode = false; if (isHost) net.act('host', a); else net.act(a); }

// ---------- Lá bài ----------
const KIND_TAG = { brown: 'Dùng ngay', blue: 'Trang bị', gun: 'Súng' };
export function cardEl(c, size = '') {
  const info = CARD_INFO[c.type];
  const red = c.suit === 'H' || c.suit === 'D';
  const d = el('div', `pcard ${info.kind} ${size}`);
  d.innerHTML = `<div class="ctop"><span class="idx${red ? ' red' : ''}">${rankLabel(c.rank)}${SUIT_SYMBOL[c.suit]}</span><span class="ktag">${info.kind === 'gun' ? 'Tầm ' + info.range : KIND_TAG[info.kind]}</span></div>
    <div class="art">${imgTag(c.type)}</div>
    <div class="cname">${info.name}</div><div class="cshort"><span>${suitify(info.short || '')}</span></div>`;
  d.title = `${info.name} (${info.en})\n${info.desc}`;
  // nhấn giữ (điện thoại) hoặc chuột phải (máy tính) để xem mô tả đầy đủ
  let lp; d.addEventListener('touchstart', () => { lp = setTimeout(() => { lp = 'done'; showCardDetail(c); }, 450); }, { passive: true });
  d.addEventListener('touchend', e => { if (lp === 'done') { e.preventDefault(); e.stopPropagation(); } else clearTimeout(lp); lp = null; });
  d.addEventListener('touchmove', () => { clearTimeout(lp); lp = null; }, { passive: true });
  d.dataset.cid = c.id;
  return d;
}
function backHTML(size = '') { return `<div class="pcard back ${size}"><div class="back-inner"><span>BANG!</span></div></div>`; }
function roleCardHTML(role, size = '') {
  const r = ROLES[role];
  return `<div class="pcard role ${size}"><div class="ctop"><span class="ktag">Vai trò</span></div><div class="art">${imgTag(role)}</div><div class="cname">${r.name}</div>${size === 'lg' ? `<div class="cdesc">${r.desc}</div>` : ''}</div>`;
}
function charCardHTML(id, size = '') {
  const ch = CHARACTERS[id];
  return `<div class="pcard char ${size}"><div class="ctop"><span class="ktag">Wanted</span><span class="chp">${'●'.repeat(ch.hp)}</span></div><div class="art">${imgTag(id)}</div>
    <div class="cname">${ch.name}</div>${size === 'lg' ? `<div class="cdesc">${suitify(ch.desc)}</div>` : ''}</div>`;
}

// ---------- Render bàn chơi ----------
function me() { return view.players.find(p => p.id === myId); }
function seatOrder() {
  // xếp từ mình theo chiều kim đồng hồ
  const ps = view.players; const i = ps.findIndex(p => p.id === myId);
  return ps.slice(i).concat(ps.slice(0, i));
}
const SEATS = {
  3: [[10, 50], [50, 12], [90, 50]],
  4: [[9, 60], [27, 14], [73, 14], [91, 60]],
  5: [[7, 64], [17, 22], [50, 10], [83, 22], [93, 64]],
  6: [[5, 76], [12, 27], [35, 9], [65, 9], [88, 27], [95, 76]],
};
const SEATS_P = { // màn hình dọc (điện thoại)
  3: [[15, 50], [50, 9], [85, 50]],
  4: [[15, 66], [27, 13], [73, 13], [85, 66]],
  5: [[15, 74], [15, 38], [50, 8], [85, 38], [85, 74]],
  6: [[15, 80], [14, 49], [27, 15], [73, 15], [86, 49], [85, 80]],
};
function seatEl(pid) { return document.querySelector(`.seat[data-pid="${pid}"]`); }

const BULLET = '<svg viewBox="0 0 10 26"><path class="tip" d="M2 10 Q2 2.5 5 1 Q8 2.5 8 10 Z"/><rect class="case" x="2" y="10" width="6" height="12" rx=".6"/><rect class="rim" x="1.4" y="21.5" width="7.2" height="3.2" rx=".8"/><rect class="shine" x="3" y="11" width="1.1" height="10" rx=".5"/></svg>';
function sheriffName() { const s = view.players.find(p => p.role === 'sheriff'); return s ? (s.id === myId ? 'bạn' : esc(s.name)) : 'Cảnh sát trưởng'; }
function roleGoal(role) {
  return ({ sheriff: 'Hạ hết Tội phạm và Kẻ hai mặt. Cẩn thận đừng bắn nhầm Phó cảnh sát.',
    deputy: `Bảo vệ Cảnh sát trưởng (${sheriffName()}) và cùng hạ Tội phạm, Kẻ hai mặt. Giữ bí mật vai trò.`,
    outlaw: `Hạ Cảnh sát trưởng (${sheriffName()}). Các Tội phạm khác là đồng đội nhưng bạn không biết là ai.`,
    renegade: `Là người sống sót cuối cùng: giúp diệt Tội phạm trước, cuối cùng một mình đấu Cảnh sát trưởng (${sheriffName()}).` })[role];
}
function showIntro() {
  const m = me(); if (!m || !m.role) return; const R = ROLES[m.role], ch = CHARACTERS[m.character];
  openModal(`<div class="intro"><div class="intro-kicker">Ván mới · bí mật của bạn</div>
    <div class="cards">${roleCardHTML(m.role, 'lg')}${charCardHTML(m.character, 'lg')}</div>
    <div class="intro-txt"><p><span class="lbl">Bạn là</span><b class="big">${R.icon} ${R.name}</b></p><p class="goal">${roleGoal(m.role)}</p>
      <p><span class="lbl">Nhân vật</span><b>${ch.name}</b> · ${m.maxHp} viên đạn (máu)</p><p class="skill">${suitify(ch.desc)}</p>
      <p class="tip">💡 Vai trò và kỹ năng luôn hiện ở góc dưới bên trái. Bấm vào đó để xem lại màn này.</p></div>
    <div class="row"><button class="btn ghost" id="intro-guide">📖 Xem luật</button><button class="btn primary" id="intro-ok">Đã hiểu, vào ván!</button></div></div>`);
  $('#intro-ok').onclick = closeModal; $('#intro-guide').onclick = () => { closeModal(); openGuide(); };
}
// Xấp bài úp xoè ra theo số lá trên tay
function handFan(n) {
  const k = Math.min(n, 6); let backs = '';
  for (let i = 0; i < k; i++) { const off = i - (k - 1) / 2; backs += `<i style="--r:${off * 9}deg;--x:${off * 7}px"></i>`; }
  return `<span class="hfan" title="${n} lá trên tay"><span class="backs" style="--n:${k}">${backs}</span><b>${n}</b></span>`;
}
function hpDots(p) {
  let s = ''; for (let i = 0; i < p.maxHp; i++) s += `<i class="bul${i < p.hp ? ' on' : ''}">${BULLET}</i>`;
  return `<div class="hpbar" title="Máu: ${p.hp}/${p.maxHp}">${s}</div>`;
}

// ---------- Lá mới vào tay ----------
const fresh = new Map();
function markFresh(a, b) {
  const pa = a?.players.find(p => p.id === myId), pb = b?.players.find(p => p.id === myId);
  if (!pa?.hand || !pb?.hand) return;
  const old = new Set(pa.hand.map(c => c.id)); const now = Date.now();
  for (const c of pb.hand) if (!old.has(c.id)) fresh.set(c.id, now);
}
function isFresh(id) { const t = fresh.get(id); return t && Date.now() - t < 4000 * S(); }

// ---------- Khung mô tả lá bài ----------
const tip = el('div', '', ''); tip.id = 'card-tip'; document.body.appendChild(tip);
function attachTip(ce, c, opt) {
  const info = CARD_INFO[c.type];
  ce.addEventListener('mouseenter', () => {
    tip.innerHTML = `<div class="te">${info.kind === 'gun' ? 'Súng · tầm ' + info.range : KIND_TAG[info.kind]} · ${rankLabel(c.rank)}${suitify(SUIT_SYMBOL[c.suit])}</div><div class="tn">${info.name}</div><div class="td">${suitify(info.desc)}</div>${opt && !opt.ok ? `<div class="tw">⛔ ${opt.reason}</div>` : ''}`;
    const r = ce.getBoundingClientRect(); const x = Math.min(innerWidth - 260, Math.max(10, r.left + r.width / 2 - 125));
    tip.style.left = x + 'px'; tip.style.top = Math.max(50, r.top - 40 - tip.offsetHeight) + 'px'; tip.classList.add('on');
  });
  ce.addEventListener('mouseleave', () => tip.classList.remove('on'));
  ce.addEventListener('click', () => tip.classList.remove('on'));
}
// ---------- Bong bóng thoại ----------
function bubbleAt(pid, card) {
  const anchor = pid === myId ? $('#me-info') : seatEl(pid)?.querySelector('.avatar'); if (!anchor) return;
  const r = anchor.getBoundingClientRect(); const info = CARD_INFO[card.type];
  const b = el('div', 'bubble', `${imgTag(card.type)}<span>${info.name}</span>`);
  b.style.left = (r.left + r.width / 2) + 'px'; b.style.top = (r.top - 6) + 'px';
  document.body.appendChild(b); setTimeout(() => b.remove(), 2000 * S());
}

function render() {
  const v = view; if (!v) return;
  if (selectedCard && !v.players.find(p => p.id === myId)?.hand?.some(c => c.id === selectedCard)) selectedCard = null;
  const cur = v.players[v.turn];
  const pr = v.prompt;
  $('#turn-info').innerHTML = v.phase === 'ended' ? 'Ván đã kết thúc' : `Lượt ${v.turnCount} · <b>${esc(cur.name)}</b>${cur.id === myId ? ' (bạn)' : ''}`;

  // ---- Ghế quanh bàn ----
  const table = $('#table'); table.querySelectorAll('.seat').forEach(s => s.remove());
  const order = seatOrder(); const n = order.length;
  const waitingId = pr ? pr.player : null;
  order.forEach((p, k) => {
    if (k === 0) return; // mình ở dưới, hiện ở khu tay bài
    // vị trí ghế cố định theo số đối thủ: từ trái-dưới, lên trên, sang phải-dưới (chiều kim đồng hồ)
    const portrait = table.clientWidth < table.clientHeight * 1.15;
    const L = (portrait ? SEATS_P : SEATS)[Math.max(3, Math.min(6, n - 1))];
    const [x, y] = L[k - 1] || [50, 10];
    const seat = el('div', 'seat' + (p.id === cur.id ? ' current' : '') + (!p.alive ? ' dead' : '') + (p.id === waitingId ? ' waiting' : ''));
    seat.dataset.pid = p.id;
    const TH = table.clientHeight, top = Math.min(Math.max(y / 100 * TH, portrait ? 52 : 78), TH - (portrait ? 48 : 70));
    seat.style.left = x + '%'; seat.style.top = top + 'px';
    const ch = CHARACTERS[p.character];
    const role = p.role ? `<div class="role-chip ${p.role}" title="${ROLES[p.role].desc}">${ROLES[p.role].icon} ${ROLES[p.role].name}</div>`
      : `<div class="role-chip hidden-role" title="Vai trò chỉ lộ khi người này bị loại (Cảnh sát trưởng lộ từ đầu)">❓ Chưa lộ</div>`;
    seat.innerHTML = `
      <div class="avatar"><div class="face">${avatarTag(p.character)}</div>${p.distance != null ? `<div class="dist" title="Khoảng cách từ bạn tới ${esc(p.name)}"><b>${p.distance}</b><small>cách</small></div>` : ''}${p.table.some(c => c.type === 'jail') ? '<div class="bars"></div>' : ''}${p.table.some(c => c.type === 'dynamite') ? '<div class="fuse">🧨</div>' : ''}${!p.alive ? '<div class="rip">☠</div>' : ''}</div>
      <div class="plate"><div class="pname">${esc(p.name)}</div><div class="pchar">${ch.name}</div>${hpDots(p)}<div class="stats">${handFan(p.handCount)}<span class="rngbig" title="Tầm bắn của ${esc(p.name)}">🎯 ${p.gunRange}</span></div>${role}</div>
      <div class="equip ${x < 50 ? 'right' : 'left'}"></div>`;
    const eq = seat.querySelector('.equip');
    for (const c of p.table) { const info = CARD_INFO[c.type]; const m = el('span', 'eqchip ' + info.kind, `${imgTag(c.type)}<b>${info.name}</b>`); m.title = `${info.name}: ${info.desc}`; attachTip(m, c); m.onclick = e => { e.stopPropagation(); if (matchMedia('(hover: none)').matches) showCardDetail(c); }; m.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); showCardDetail(c); }; eq.appendChild(m); }
    // chọn mục tiêu
    if (selectedCard && v.myOptions?.[selectedCard]?.targets?.includes(p.id)) { seat.classList.add('targetable'); seat.onclick = () => chooseTarget(p); }
    else if (selectedCard && v.myOptions?.[selectedCard]?.targets) { seat.classList.add('out'); seat.onclick = () => toast(`${p.name} ngoài tầm (cách ${p.distance}, tầm của bạn ${me().gunRange})`); }
    else if (pr && pr.type === 'draw_option' && pr.player === myId && pr.character === 'jessejones' && p.alive && p.handCount) { seat.classList.add('targetable'); seat.onclick = () => send({ type: 'draw_from_player', target: p.id }); }
    else seat.onclick = () => showCharacter(p);
    table.appendChild(seat);
  });

  // ---- Giữa bàn ----
  $('#deck').innerHTML = backHTML('sm') + `<div class="pile-count">${v.deckCount}</div>`;
  const dp = $('#discard'); dp.innerHTML = '';
  if (v.discardTop) { const dc = cardEl(v.discardTop, 'sm'); attachTip(dc, v.discardTop); dp.appendChild(dc); } else dp.innerHTML = '<div class="pile-empty">Chồng bỏ</div>';
  renderPrompt(); renderFeed();

  // ---- Khu của tôi ----
  const m = me(); const ch = CHARACTERS[m.character];
  const mine = $('#me-area');
  mine.classList.toggle('current', cur.id === myId && v.phase === 'playing');
  mine.classList.toggle('dead', !m.alive);
  $('#me-cards').innerHTML = '';
  const R = m.role ? ROLES[m.role] : null;
  $('#me-info').innerHTML = `<div class="me-top"><div class="me-ava"><div class="face">${avatarTag(m.character)}</div></div>
      <div class="me-id"><div class="pname">${esc(m.name)}</div>${hpDots(m)}</div>
      <div class="me-range" title="Tầm bắn: bạn bắn được người có khoảng cách ≤ số này"><b>${m.gunRange}</b><small>tầm bắn</small></div></div>
    <div class="me-cols">${R ? `<div class="me-role ${m.role}"><span class="lbl">Vai trò</span><b>${R.icon} ${R.name}</b><span class="goal">${roleGoal(m.role)}</span></div>` : ''}
    <div class="me-skill"><span class="lbl">Kỹ năng · ${ch.name}</span>${suitify(ch.desc)}</div></div>`;
  $('#me-info').onclick = () => showIntro();
  const mt = $('#me-table'); mt.innerHTML = '';
  for (const c of m.table) { const tc = cardEl(c, 'sm'); attachTip(tc, c); mt.appendChild(tc); }

  // ---- Tay bài (xoè quạt) ----
  const hand = $('#me-hand'); hand.innerHTML = '';
  const responding = pr && pr.player === myId && pr.type === 'respond';
  const discarding = pr && pr.player === myId && pr.type === 'discard';
  const cards = m.hand || []; const cnt = cards.length;
  hand.style.setProperty('--overlap', cnt <= 4 ? '-2px' : cnt <= 6 ? '-12px' : '-24px');
  cards.forEach((c, i) => {
    const ce = cardEl(c);
    const mid = (cnt - 1) / 2; const off = i - mid;
    ce.style.setProperty('--rot', (cnt > 1 ? off * Math.min(5, 24 / cnt) : 0) + 'deg');
    ce.style.setProperty('--lift', (Math.abs(off) * Math.abs(off) * (cnt > 5 ? 1.6 : 2.4)) + 'px');
    if (responding) {
      if (v.myResponses.includes(c.id)) { ce.classList.add('respond', 'playable'); ce.onclick = () => send({ type: 'respond_card', cardId: c.id }); }
      else ce.classList.add('disabled');
    } else if (discarding) {
      ce.classList.add('playable', 'discardable'); ce.onclick = () => send({ type: 'discard_card', cardId: c.id });
    } else if (sidMode && v.myOptions) {
      ce.classList.add('playable'); if (sidPick.includes(c.id)) ce.classList.add('selected');
      ce.onclick = () => { sidPick = sidPick.includes(c.id) ? sidPick.filter(x => x !== c.id) : [...sidPick, c.id].slice(-2); if (sidPick.length === 2) { send({ type: 'ability_sid', cardIds: sidPick }); sidMode = false; sidPick = []; } else render(); };
    } else if (v.myOptions) {
      const o = v.myOptions[c.id];
      if (o.ok) { ce.classList.add('playable'); if (selectedCard === c.id) ce.classList.add('selected'); ce.onclick = () => clickCard(c, o); }
      else { ce.classList.add('disabled'); ce.title += '\n⛔ ' + o.reason; ce.onclick = () => toast(o.reason); }
    }
    attachTip(ce, c, v.myOptions?.[c.id]);
    if (isFresh(c.id)) ce.classList.add('fresh');
    hand.appendChild(ce);
  });
  renderActions(); renderLog();
}

function renderActions() {
  const a = $('#actions'); a.innerHTML = '';
  const v = view, m = me(); const pr = v.prompt;
  if (v.phase === 'ended') {
    const names = { law: 'Phe Cảnh sát', outlaw: 'Tội phạm', renegade: 'Kẻ hai mặt' };
    a.appendChild(el('div', 'winner', `🏆 ${names[v.winner]} thắng!`));
    if (isHost) { const b = el('button', 'btn primary', 'Về phòng chờ'); b.onclick = () => net.restart(); a.appendChild(b); }
    return;
  }
  if (!m.alive) { a.appendChild(el('div', 'muted', 'Bạn đã bị loại – ngồi xem tiếp nhé')); return; }
  const myTurn = v.players[v.turn].id === myId && !pr && v.step === 'play';
  if (myTurn) {
    if (selectedCard) { const b = el('button', 'btn ghost', 'Huỷ chọn'); b.onclick = () => { selectedCard = null; render(); }; a.appendChild(b); }
    if (v.canSid) { const b = el('button', 'btn', sidMode ? 'Chọn 2 lá để bỏ…' : '💊 Bỏ 2 lá hồi 1 máu'); b.onclick = () => { sidMode = !sidMode; sidPick = []; selectedCard = null; render(); }; a.appendChild(b); }
    const b = el('button', 'btn primary', m.handCount > m.hp ? `Kết thúc lượt (bỏ ${m.handCount - m.hp} lá)` : 'Kết thúc lượt'); b.onclick = () => { sidMode = false; send({ type: 'end_turn' }); }; a.appendChild(b);
  }
}

function renderFeed() {
  const f = $('#feed'); if (!f) return;
  const lines = view.log.filter(l => !/^— Lượt|^Ván mới/.test(l)).slice(-3);
  f.innerHTML = lines.map((l, i) => `<div class="${i === lines.length - 1 ? 'new' : ''}">${suitify(esc(l))}</div>`).join('');
}
function renderPrompt() {
  const v = view, p = $('#prompt'); p.innerHTML = ''; p.className = 'prompt';
  const pr = v.prompt;
  if (!pr || v.phase === 'ended') {
    const cur = v.players[v.turn];
    if (v.phase === 'playing') {
      p.classList.add('quiet');
      if (cur.id !== myId) { p.innerHTML = `⏳ Đang tới lượt <b>${esc(cur.name)}</b>…`; return; }
      p.classList.add('hint');
      if (selectedCard && !me().hand.some(x => x.id === selectedCard)) selectedCard = null;
      if (selectedCard) { const c = me().hand.find(x => x.id === selectedCard); p.innerHTML = `👉 Bấm vào người <b>sáng viền đỏ</b> để dùng <b>${CARD_INFO[c.type].name}</b>. Người bị mờ là ở ngoài tầm.`; return; }
      const inRange = v.players.filter(q => q.alive && q.id !== myId && q.distance != null && q.distance <= me().gunRange).map(q => esc(q.name));
      p.innerHTML = `<b>Lượt của bạn!</b> Bấm các lá <b>sáng màu</b> để đánh, xong bấm <b>Kết thúc lượt</b>.<br><span class="inrange">🎯 Trong tầm bắn (≤ ${me().gunRange}): ${inRange.length ? inRange.join(', ') : 'chưa ai – cần súng tầm xa hơn'}</span>`;
    }
    return;
  }
  const who = v.players.find(x => x.id === pr.player);
  const src = pr.source ? v.players.find(x => x.id === pr.source) : null;
  const mine = pr.player === myId;
  if (mine) p.classList.add('mine');
  const kindText = { bang: `💥 ${src?.name} bắn ${mine ? 'bạn' : who.name}!`, gatling: `🔫 ${src?.name} quét Gatling!`, indians: `🏹 ${src?.name} gọi Thổ dân!`, duel: `⚔️ Đấu súng – ${mine ? 'tới bạn' : who.name} đáp trả` };
  if (pr.type === 'respond') {
    p.appendChild(el('div', 'ptitle', kindText[pr.kind]));
    if (mine) {
      const need = pr.kind === 'bang' || pr.kind === 'gatling' ? `Cần ${pr.need} lá Hụt!` : 'Cần 1 lá Bắn!';
      p.appendChild(el('div', 'sub', `${need} – bấm lá viền xanh trên tay, hoặc chịu mất 1 máu.`));
      const row = el('div', 'row'); const b = el('button', 'btn danger', '💔 Chịu đòn'); b.onclick = () => send({ type: 'take_hit' }); row.appendChild(b); p.appendChild(row);
    } else p.appendChild(el('div', 'sub', `Đang chờ ${who.name}…`));
    return;
  }
  if (pr.type === 'discard') { p.appendChild(el('div', 'ptitle', mine ? `Bỏ bớt ${me().handCount - me().hp} lá` : `${who.name} đang bỏ bớt bài…`)); if (mine) p.appendChild(el('div', 'sub', 'Bấm vào lá muốn bỏ.')); return; }
  if (pr.type === 'store') {
    p.appendChild(el('div', 'ptitle', `🏪 Tạp hóa – ${mine ? 'bạn chọn 1 lá' : esc(who.name) + ' đang chọn'}`));
    const row = el('div', 'row store-row' + (mine ? '' : ' peek'));
    for (const c of pr.cards) { const ce = cardEl(c, 'sm'); if (mine) { ce.classList.add('playable'); attachTip(ce, c); ce.onclick = () => send({ type: 'store_pick', cardId: c.id }); } row.appendChild(ce); }
    p.appendChild(row); return;
  }
  if (pr.type === 'draw_option') {
    if (!mine) { p.appendChild(el('div', 'ptitle', `${who.name} đang rút bài…`)); return; }
    const row = el('div', 'row');
    if (pr.character === 'kitcarlson') {
      p.appendChild(el('div', 'ptitle', 'Kit Carlson: chọn 2 lá để giữ'));
      let keep = [];
      for (const c of pr.cards) { const ce = cardEl(c, 'sm'); ce.classList.add('playable'); ce.onclick = () => { keep = keep.includes(c.id) ? keep.filter(x => x !== c.id) : [...keep, c.id]; ce.classList.toggle('selected'); if (keep.length === 2) send({ type: 'kit_choose', keep }); }; row.appendChild(ce); }
    } else {
      p.appendChild(el('div', 'ptitle', pr.character === 'jessejones' ? 'Jesse Jones: rút từ bộ bài, hoặc bấm 1 người để lấy 1 lá tay họ' : 'Pedro Ramirez: rút từ bộ bài, hoặc lấy lá trên cùng chồng bỏ'));
      const b1 = el('button', 'btn primary', 'Rút 2 từ bộ bài'); b1.onclick = () => send({ type: 'draw_from_deck' }); row.appendChild(b1);
      if (pr.character === 'pedroramirez' && v.discardTop) { const b2 = el('button', 'btn', `Lấy ${suitify(cardLabel(v.discardTop))}`); b2.onclick = () => send({ type: 'draw_from_discard' }); row.appendChild(b2); }
    }
    p.appendChild(row);
  }
}

function clickCard(c, o) {
  sidMode = false;
  if (o.targetMode === 'none') { send({ type: 'play_card', cardId: c.id }); return; }
  selectedCard = selectedCard === c.id ? null : c.id;
  render();
}
function chooseTarget(p) {
  const o = view.myOptions[selectedCard];
  if (!o.pickCard) { send({ type: 'play_card', cardId: selectedCard, target: p.id }); return; }
  const cardType = me().hand.find(x => x.id === selectedCard).type;
  openModal(`<h3>${CARD_INFO[cardType].name} → ${esc(p.name)}</h3><p class="muted">Lấy lá nào?</p><div class="cards" id="pick-row"></div><button class="btn ghost" id="pick-cancel">Huỷ</button>`);
  const row = $('#pick-row');
  if (p.handCount) { const b = el('div', 'pick-hand', backHTML('sm') + `<div>Ngẫu nhiên trên tay (${p.handCount})</div>`); b.onclick = () => { closeModal(); send({ type: 'play_card', cardId: selectedCard, target: p.id, pick: 'hand' }); }; row.appendChild(b); }
  for (const c of p.table) { const ce = cardEl(c, 'sm'); ce.classList.add('playable'); ce.onclick = () => { closeModal(); send({ type: 'play_card', cardId: selectedCard, target: p.id, pick: c.id }); }; row.appendChild(ce); }
  $('#pick-cancel').onclick = closeModal;
}
function showCardDetail(c) {
  const info = CARD_INFO[c.type]; const red = c.suit === 'H' || c.suit === 'D';
  const big = cardEl(c, 'lg').outerHTML;
  openModal(`<div class="detail">${big}<div class="detail-txt"><div class="lbl">${info.kind === 'gun' ? 'Súng · tầm ' + info.range : KIND_TAG[info.kind]} · ${rankLabel(c.rank)}${suitify(SUIT_SYMBOL[c.suit])}</div>
    <h3>${info.name} <small>${info.en}</small></h3><p>${suitify(info.desc)}</p>
    <p class="muted" style="font-size:12px">${info.kind === 'brown' ? 'Lá nâu: dùng ngay rồi bỏ.' : 'Lá xanh: đặt trước mặt, tác dụng đến khi bị lấy hoặc bỏ.'}</p></div></div>
    <button class="btn" id="d-close">Đóng</button>`);
  $('#d-close').onclick = closeModal;
}
function showCharacter(p) {
  const ch = CHARACTERS[p.character];
  const roleTxt = p.role ? `${ROLES[p.role].icon} ${ROLES[p.role].name}` : '❓ Chưa lộ vai trò';
  const eq = p.table.length ? p.table.map(c => `<div class="eqrow" data-cid="${c.id}">${imgTag(c.type)}<div><b>${CARD_INFO[c.type].name}</b><span>${suitify(CARD_INFO[c.type].desc)}</span></div></div>`).join('') : '<p class="muted">Chưa có trang bị nào.</p>';
  openModal(`<div class="charview"><div class="cv-ava">${avatarTag(p.character)}</div><div class="cv-head"><h3>${esc(p.name)}</h3><div class="cv-role">${roleTxt}</div>${hpDots(p)}</div></div>
    <div class="cv-stats"><div><b>${p.gunRange}</b><small>tầm bắn</small></div>${p.distance != null ? `<div><b>${p.distance}</b><small>cách bạn</small></div>` : ''}<div><b>${p.handCount}</b><small>lá trên tay</small></div></div>
    <div class="cv-box"><span class="lbl">Nhân vật · ${ch.name}</span>${suitify(ch.desc)}</div>
    <div class="cv-box"><span class="lbl">Trang bị trước mặt</span>${eq}</div>
    <button class="btn" id="m-close">Đóng</button>`);
  $('#m-close').onclick = closeModal;
  $('#modal-box').querySelectorAll('.eqrow').forEach(r => r.onclick = () => showCardDetail(p.table.find(c => c.id === r.dataset.cid)));
}
function openModal(html) { $('#modal-box').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }

let lastLogLen = 0;
function renderLog() {
  const l = $('#log-list'); l.innerHTML = '';
  for (const line of view.log) l.appendChild(el('div', '', suitify(esc(line))));
  l.scrollTop = l.scrollHeight;
  lastLogLen = view.log.length;
}

// ---------- Hiệu ứng theo thay đổi state ----------
function anchorFor(pid) { return pid === myId ? $('#me-hand') : seatEl(pid); }
function dealAnimation() {
  const order = seatOrder(); let d = 0;
  for (let r = 0; r < 4; r++) for (const p of order) { if (p.handCount > r) fly(backHTML('sm'), $('#deck'), anchorFor(p.id), { delay: d, duration: 380 }); d += 45; }
  setTimeout(() => banner('BANG!', 'Cảnh sát trưởng đi trước'), d * S());
  setTimeout(showIntro, d * S() + 1300 * S() + 600);
}
function newLogLines(a, b) {
  const la = a.log, lb = b.log; if (!la.length) return lb;
  for (let j = lb.length - 1; j >= 0; j--) {
    if (lb[j] !== la[la.length - 1]) continue;
    let k = 1; while (k < 4 && j - k >= 0 && la.length - 1 - k >= 0 && lb[j - k] === la[la.length - 1 - k]) k++;
    if (k >= Math.min(4, la.length, j + 1)) return lb.slice(j + 1);
  }
  return lb.filter(x => !la.includes(x));
}
function pidByName(v, name) { name = name.trim(); return v.players.find(p => p.name === name)?.id; }
function animateDiff(a, b) {
  if (!a || !b) return;
  const lines = newLogLines(a, b);
  let hitDelay = 0;
  for (const line of lines) {
    let m;
    if ((m = line.match(/^(.+) 💥 bắn (.+)!$/))) {
      const s = pidByName(b, m[1]), t = pidByName(b, m[2]);
      const gun = b.players.find(p => p.id === s)?.table.find(c => CARD_INFO[c.type].kind === 'gun')?.type;
      gunSfx(gun); shoot(anchorFor(s), anchorFor(t)); hitDelay = 300 * S();
    } else if ((m = line.match(/^(.+) quét Súng Gatling!$/))) {
      const s = pidByName(b, m[1]); cardSfx('gatling');
      b.players.filter(p => p.alive && p.id !== s).forEach((p, i) => shoot(anchorFor(s), anchorFor(p.id), { delay: 80 + i * 110 }));
      hitDelay = 450 * S(); screenShake();
    } else if ((m = line.match(/^(.+) gọi Thổ dân! tấn công tất cả\.$/))) {
      const s = pidByName(b, m[1]); banner('🏹 Thổ dân tấn công!'); cardSfx('indians');
      b.players.filter(p => p.alive && p.id !== s).forEach((p, i) => arrows(anchorFor(s), anchorFor(p.id), { delay: 200 + i * 140, onHit: () => sfx.card() }));
      hitDelay = 800 * S();
    } else if ((m = line.match(/^(.+) (?:đánh .+ né đạn|né được nhờ Thùng rượu)\.$/))) {
      const t = pidByName(b, m[1]); if (/Thùng rượu/.test(line)) { cardSfx('barrel'); setTimeout(() => cardSfx('missed'), 250); } else cardSfx('missed');
      setTimeout(() => stamp(anchorFor(t), 'HỤT!'), 320 * S());
    } else if ((m = line.match(/^💥 Thuốc nổ nổ! (.+) mất 3 máu\.$/))) {
      const t = pidByName(b, m[1]); sfx.boom(); explode(anchorFor(t));
    } else if ((m = line.match(/thách (.+) Đấu súng!$/))) {
      banner('⚔ Đấu súng!', m[1].trim()); cardSfx('duel');
    } else if ((m = line.match(/nhốt (.+) vào Nhà tù\.$/))) {
      const t = pidByName(b, m[1]); setTimeout(() => stamp(anchorFor(t), 'NHÀ TÙ'), 350);
    } else if ((m = line.match(/^(.+) bị giam, mất lượt\.$/))) {
      stamp(anchorFor(pidByName(b, m[1])), 'MẤT LƯỢT');
    } else if (/mở Quán rượu/.test(line)) {
      banner('🥃 Quán rượu!', 'Mọi người hồi 1 máu');
    } else if ((m = line.match(/^(.+) mở Tạp hóa/))) {
      banner('🏪 Tạp hóa', 'Mỗi người chọn 1 lá');
    }
  }
  // Lấy bài của người khác: lá bay từ người bị lấy về người lấy
  let discardSrc = null;
  const byChar = ch => b.players.find(p => p.character === ch)?.id;
  for (const line of lines) {
    let m, taker = null, victim = null;
    if ((m = line.match(/^(.+) dùng Hoảng loạn! lấy 1 lá của (.+)\.$/))) { taker = pidByName(b, m[1]); victim = pidByName(b, m[2]); discardSrc = taker; }
    else if ((m = line.match(/^(.+) dùng Cat Balou,/))) { discardSrc = null; }
    else if ((m = line.match(/^El Gringo lấy 1 lá từ tay (.+)\.$/))) { taker = byChar('elgringo'); victim = pidByName(b, m[1]); }
    else if ((m = line.match(/^Jesse Jones rút 1 lá từ tay (.+) và/))) { taker = byChar('jessejones'); victim = pidByName(b, m[1]); }
    else if ((m = line.match(/^Vulture Sam lấy hết bài của (.+)\.$/))) { taker = byChar('vulturesam'); victim = pidByName(b, m[1]); }
    if (!taker || !victim) continue;
    const mine = b.players.find(p => p.id === myId);
    if (taker === myId && mine?.hand) {
      const before = new Set((a.players.find(p => p.id === myId)?.hand || []).map(c => c.id));
      const got = mine.hand.filter(c => !before.has(c.id)).slice(0, line.startsWith('Jesse') ? 1 : 99);
      got.slice(0, 3).forEach((c, i) => fly(cardEl(c, 'sm').outerHTML, anchorFor(victim), $('#me-hand'), { delay: 150 + i * 150, duration: 650 }));
      if (got.length) setTimeout(() => toast(`🤠 Bạn lấy được: ${got.map(cardLabel).join(', ')}`, true), 700 * S());
    } else {
      fly(backHTML('sm'), anchorFor(victim), anchorFor(taker), { delay: 150, duration: 650 });
      if (victim === myId) setTimeout(() => toast(`${b.players.find(p => p.id === taker)?.name} lấy mất 1 lá của bạn!`), 600 * S());
    }
  }
  const txt = lines.join(' ');
  if (/hồi 1 máu/.test(txt) && !/uống Bia|Quán rượu/.test(txt)) sfx.heal();
  if (/☠️/.test(txt)) sfx.death();
  // Lượt mới
  if (a.turn !== b.turn && b.phase === 'playing') { sfx.turn(); const cur = b.players[b.turn]; if (cur.id === myId) banner('Tới lượt bạn!'); }
  // Bài bay & máu
  for (const pb of b.players) {
    const pa = a.players.find(x => x.id === pb.id); if (!pa) continue;
    const anchor = anchorFor(pb.id); const box = pb.id === myId ? $('#me-area') : anchor; const txtAt = pb.id === myId ? $('#me-info') : anchor;
    const gained = pb.handCount - pa.handCount;
    if (gained > 0 && b.deckCount < a.deckCount) for (let i = 0; i < Math.min(gained, 4); i++) fly(backHTML('sm'), $('#deck'), anchor, { delay: i * 110, duration: 420 });
    if (pb.hp < pa.hp) setTimeout(() => { shake(box); flash(box); floatText(txtAt, `-${pa.hp - pb.hp}`); sfx.hit(); }, hitDelay);
    if (pb.hp > pa.hp && pb.alive) { floatText(txtAt, `+${pb.hp - pa.hp}`, '#3f8f4f'); flash(box, 'flash-heal'); sparkle(txtAt); }
    if (pa.alive && !pb.alive) setTimeout(() => banner(`☠ ${esc(pb.name)} bị loại`, pb.role ? ROLES[pb.role].name : ''), hitDelay + 300);
    if (pb.table.length > pa.table.length) { const nc = pb.table.find(c => !pa.table.some(x => x.id === c.id)); if (nc) { cardSfx(nc.type); if (nc.type !== 'dynamite' || pa.handCount > pb.handCount) bubbleAt(nc.type === 'jail' ? a.players[a.turn].id : pb.id, nc); const tgt = pb.id === myId ? $('#me-table') : anchor?.querySelector('.equip'); const src = a.players[a.turn].id === myId ? $('#me-hand') : seatEl(a.players[a.turn].id); fly(cardEl(nc, 'sm').outerHTML, src || anchor, tgt || anchor, { duration: 450 }); } }
  }
  // Lá vừa bỏ bay về chồng bỏ
  if (b.discardTop && (!a.discardTop || a.discardTop.id !== b.discardTop.id)) {
    const loser = discardSrc ? b.players.find(p => p.id === discardSrc) : b.players.find(pb => { const pa = a.players.find(x => x.id === pb.id); return pa && pb.handCount < pa.handCount; });
    fly(cardEl(b.discardTop, 'sm').outerHTML, loser ? anchorFor(loser.id) : $('#deck'), $('#discard'), { duration: 420, rotate: (Math.random() * 10 - 5) });
    if (loser && b.phase === 'playing' && !(b.prompt && b.prompt.type === 'discard' && b.prompt.player === loser.id) && !(a.prompt && a.prompt.type === 'discard')) {
      bubbleAt(loser.id, b.discardTop);
      if (['stagecoach', 'wellsfargo', 'store', 'panic', 'catbalou', 'beer', 'saloon'].includes(b.discardTop.type)) cardSfx(b.discardTop.type);
    }
  }
  if (a.phase === 'playing' && b.phase === 'ended') {
    const names = { law: 'Phe Cảnh sát thắng!', outlaw: 'Tội phạm thắng!', renegade: 'Kẻ hai mặt thắng!' };
    setTimeout(() => { sfx.win(); confetti(); banner('🏆 ' + names[b.winner]); }, 700);
  }
}

// ---------- Hướng dẫn ----------
$('#btn-guide-home').onclick = () => openGuide();
$('#btn-guide').onclick = () => openGuide();

window.addEventListener('beforeunload', e => { if (net && view && view.phase === 'playing') { e.preventDefault(); e.returnValue = ''; } });

// bài trang trí trang chủ
(() => {
  const hero = $('#hero-cards'); const pick = [['bang', 'S', 14], ['stagecoach', 'S', 9], ['beer', 'H', 8], ['winchester', 'S', 8], ['saloon', 'H', 5]];
  pick.forEach(([type, suit, rank], i) => { const c = cardEl({ id: 'h' + i, type, suit, rank }); const off = i - 2; c.style.setProperty('--r', off * 8 + 'deg'); c.style.setProperty('--y', Math.abs(off) * 10 + 'px'); c.style.setProperty('--d', i * 80 + 'ms'); hero.appendChild(c); });
})();
