// Giao diện + nối với lớp mạng
import { CARD_INFO, CHARACTERS, ROLES, SUIT_SYMBOL, rankLabel, cardLabel, suitify } from './cards.js';
import { Host, Client, loadSnapshot, session, BANG_PHRASES } from './net.js?v=11';
import { createReactions } from '../../shared/ui/react.js?v=2';
import { netStatus } from '../../shared/ui/status.js';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=99';
import { imgTag, avatarTag } from './images.js';
import { S, SPEEDS, getSpeed, setSpeed, sfx, cardSfx, gunSfx, fly, shake, flash, floatText, banner, toggleMute, isMuted, shoot, arrows, explode, sparkle, confetti, stamp, screenShake } from './fx.js';
import { THEMES, getTheme, setTheme, onThemeChange } from './themes.js';
import { openGuide } from './guide.js?v=13';
import { musicSetTheme, musicToggle, musicIsOn, musicVolume, musicResumeIfOn, musicIntensity, musicStinger } from './music.js?v=9';

const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let net = null, isHost = false, myId = null, view = null, prevView = null, lobby = [];

// ---------- Màu riêng cho từng người (nhật ký, ghế, tóm tắt lượt) ----------
const PCOLORS = ['#d9412b', '#2b7fd0', '#2f9a52', '#c27a12', '#8e4fd0', '#cc3f86', '#138f8f', '#6f7f15'];
function pcolor(pid) { const i = view ? view.players.findIndex(p => p.id === pid) : -1; return PCOLORS[(i < 0 ? 0 : i) % PCOLORS.length]; }
function pTag(pid) {
  const p = view && view.players.find(x => x.id === pid); if (!p) return '?';
  return `<b class="pn" style="--pc:${pcolor(pid)}">${esc(p.name)}${p.role === 'sheriff' ? ' ⭐' : ''}${pid === myId ? ' (bạn)' : ''}</b>`;
}
// tô màu tên người chơi (và tên nhân vật của họ) trong 1 dòng nhật ký đã escape
function colorize(line) {
  if (!view) return line;
  const keys = [];
  for (const p of view.players) { keys.push([esc(p.name), p.id]); const ch = CHARACTERS[p.character]; if (ch) keys.push([esc(ch.name), p.id]); }
  keys.sort((a, b) => b[0].length - a[0].length);
  const marks = []; let out = line;
  for (const [k, id] of keys) {
    if (!k || !out.includes(k)) continue;
    out = out.split(k).join('\u0001' + marks.length + '\u0002'); marks.push(`<b class="pn" style="--pc:${pcolor(id)}">${k}</b>`);
  }
  return out.replace(/\u0001(\d+)\u0002/g, (_, i) => marks[+i]);
}
function lineActor(line) {
  if (!view) return null; let best = null;
  for (const p of view.players) for (const k of [p.name, CHARACTERS[p.character]?.name]) if (k && line.startsWith(k) && (!best || k.length > best.k.length)) best = { k, id: p.id };
  return best && best.id;
}

// ---------- Chế độ Người mới (mẹo ngay trên bàn) – lưu riêng từng máy ----------
const NB_KEY = 'bgvn-bang-newbie';
let newbie = (() => { try { const x = localStorage.getItem(NB_KEY); return x === null ? true : x === '1'; } catch (e) { return true; } })();
function setNewbie(on) { newbie = !!on; try { localStorage.setItem(NB_KEY, newbie ? '1' : '0'); } catch (e) {} renderNewbieUI(); if (view && $('#screen-game').classList.contains('active')) render(); }
function renderNewbieUI() {
  const b1 = $('#btn-newbie'); if (b1) { b1.innerHTML = `🐣 Chế độ Người mới: <b>${newbie ? 'BẬT' : 'tắt'}</b>`; b1.classList.toggle('on', newbie); b1.setAttribute('aria-pressed', newbie); }
  const b2 = $('#btn-newbie-g'); if (b2) { b2.innerHTML = `🐣<span class="nb-lbl"> Người mới: ${newbie ? 'bật' : 'tắt'}</span>`; b2.style.opacity = newbie ? 1 : .5; b2.setAttribute('aria-pressed', newbie); b2.title = 'Chế độ Người mới: ' + (newbie ? 'bật' : 'tắt'); }
}
let selectedCard = null;
let sidMode = false, sidPick = [];

// ---------- Màn hình ----------
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); $('#' + id).classList.add('active'); }
let toastTimer;
function toast(msg, info = false) { const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (info ? ' info' : ''); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 3000); }

// ---------- Home ----------
try { $('#inp-name').value = localStorage.getItem('bgvn-name') || localStorage.getItem('bangvn-name') || ''; } catch (e) {}
const urlCode = new URLSearchParams(location.search).get('room');
if (urlCode) $('#inp-code').value = urlCode.toUpperCase();

function getName() {
  const n = $('#inp-name').value.trim();
  if (!n) { toast('Nhập tên trước đã!'); $('#inp-name').focus(); return null; }
  try { localStorage.setItem('bgvn-name', n); } catch (e) {}
  return n;
}
const handlers = {
  onLobby(players, code, started) { lobby = players; renderLobby(code); if (!started && !view) show('screen-lobby'); },
  onState(v) { if (discardQueue.length) setTimeout(sendNextDiscard, 120); else if (!(v && v.prompt && v.prompt.type === 'discard')) discardSel.clear(); setTimer(v && v.phase === 'playing' ? v.timer : null); prevView = view; view = v; markFresh(prevView, v); if (!v) { prevView = null; show('screen-lobby'); return; } const first = !$('#screen-game').classList.contains('active'); show('screen-game'); render(); musicMood(v); if (first) dealAnimation(); else animateDiff(prevView, view); },
  onError(msg) { toast(msg); },
  onReact(msg) { reacts.show(msg); },
  onJoined(id) { myId = id; },
  onDisconnect() { toast('Mất kết nối với chủ phòng – đang tự vào lại…'); },
  onStatus(m) { const el = $('#lobby-msg'); if (el) el.textContent = m; },
  onNet(t, k, retry) { netStatus(t, k, retry); },
};
// ---------- Tải lại trang: tự khôi phục phòng / tự vào lại ----------
function resume() {
  const snap = loadSnapshot(), ses = session.load('bang');
  const name = (() => { try { return localStorage.getItem('bangvn-name') || localStorage.getItem('bgvn-name') || 'Bạn'; } catch (e) { return 'Bạn'; } })();
  if (snap && ses && ses.role === 'host') {
    isHost = true; myId = 'host';
    net = new Host(snap.players.find(p => p.id === 'host')?.name || name, handlers, !!snap.offline, snap);
    if (location.hash === '#debug') window.__net = net;
    $('#lobby-host-actions').classList.remove('hidden'); if (snap.offline) $('#btn-copy').classList.add('hidden');
    show('screen-lobby'); netStatus('Đã khôi phục phòng ' + snap.code, 'ok'); return;
  }
  if (ses && ses.role === 'client' && ses.code) {
    isHost = false; net = new Client(ses.code, ses.name || name, handlers);
    $('#lobby-host-actions').classList.add('hidden');
    show('screen-lobby'); $('#lobby-code').textContent = ses.code; $('#lobby-msg').textContent = 'Đang vào lại phòng…';
  }
}
setTimeout(resume, 0);
$('#btn-create').onclick = () => {
  const n = getName(); if (!n) return;
  isHost = true; myId = 'host'; net?.leave?.();
  net = new Host(n, handlers); if (location.hash === '#debug') window.__net = net;
  $('#lobby-host-actions').classList.remove('hidden'); $('#lobby-msg').textContent = 'Gửi mã phòng cho bạn bè. Cần 4–7 người (có thể thêm bot).';
  show('screen-lobby'); $('#lobby-code').textContent = '…';
};
$('#btn-offline').onclick = () => {
  const n = getName(); if (!n) return;
  isHost = true; myId = 'host'; net?.leave?.();
  net = new Host(n, handlers, true); session.save('bang', { role: 'host', code: 'OFFLINE' });
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
$('#btn-leave').onclick = () => { net?.leave ? net.leave() : net?.destroy(); location.href = location.pathname; };
$('#btn-log-toggle').onclick = () => $('#log').classList.toggle('hidden');
$('#btn-recap').onclick = $('#btn-recap-log').onclick = () => showRecap();
$('#btn-newbie').onclick = () => setNewbie(!newbie);
$('#btn-newbie-g').onclick = e => { e.stopPropagation(); setNewbie(!newbie); };
renderNewbieUI();
// 📝 Có gì mới (patch notes dùng chung)
for (const id of ['#btn-news-home', '#btn-news-g']) { const b = $(id); newsBadge(b, 'bang'); b.onclick = e => { e.stopPropagation(); $('#tb-opts').classList.remove('open'); openNews('bang'); document.querySelectorAll('#btn-news-home,#btn-news-g').forEach(x => x.classList.remove('bgvn-dot')); }; }
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
// Điện thoại: gom chủ đề / tốc độ / âm lượng vào nút ⚙️
$('#btn-more').onclick = e => { e.stopPropagation(); $('#tb-opts').classList.toggle('open'); };
document.addEventListener('click', e => { if (!e.target.closest('#tb-opts') && !e.target.closest('#btn-more')) $('#tb-opts').classList.remove('open'); });
// Đẩy khu giữa bàn xuống nếu bị ghế phía trên đè lên
function fitCenter() {
  const table = $('#table'), c = table && table.querySelector('.center'); if (!c) return;
  c.style.setProperty('--cpush', '0px'); c.style.maxWidth = ''; c.classList.remove('narrow');
  // lời nhắc có hàng lá bài để chọn: hiện nổi lên giữa màn hình (như hộp thoại) thay vì nhét vào giữa bàn
  const big = (innerWidth <= 760 || landCompact()) && !!c.querySelector('.prompt .pcard');
  c.classList.toggle('big', big); if (big) return;
  const tr = table.getBoundingClientRect(), cr = c.getBoundingClientRect(); let push = 0;
  for (const s of table.querySelectorAll('.seat')) {
    const r = s.getBoundingClientRect();
    if (r.right < cr.left + 4 || r.left > cr.right - 4) continue;
    if (r.top + r.height / 2 < cr.top + cr.height / 2) push = Math.max(push, r.bottom + 8 - cr.top);
  }
  const room = Math.max(0, tr.bottom - cr.bottom);
  c.style.setProperty('--cpush', Math.round(Math.min(push, room)) + 'px');
  // ghế hai bên đè vào chữ ở giữa: thu hẹp khu giữa
  c.style.maxWidth = '';
  const r2 = c.getBoundingClientRect(), mid = r2.left + r2.width / 2; let half = r2.width / 2;
  for (const s of table.querySelectorAll('.seat')) {
    const r = s.getBoundingClientRect();
    if (r.bottom < r2.top || r.top > r2.bottom) continue;
    if (r.right > r2.left && r.right < mid) half = Math.min(half, mid - r.right - 4);
    if (r.left < r2.right && r.left > mid) half = Math.min(half, r.left - mid - 4);
  }
  if (half < r2.width / 2) c.style.maxWidth = Math.max(120, Math.round(half * 2)) + 'px';
  // khu giữa bị ép quá hẹp (nhiều ghế, màn nhỏ): ẩn dòng phụ "trong tầm bắn" – số "cách" trên ghế đã cho biết
  c.classList.toggle('narrow', half * 2 < 200);
}
let resizeT; addEventListener('resize', () => { requestAnimationFrame(fitCenter); clearTimeout(resizeT); resizeT = setTimeout(() => { if (view && $('#screen-game').classList.contains('active')) render(); }, 150); });
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
// Biểu tượng tác dụng dưới hình (giống lá gốc)
const RNG = n => `<i class="ic irng">🎯 ${n}</i>`;
const ICONS = {
  bang: () => '<i class="ic irng">🎯 tầm</i><i class="ic">💥</i>', missed: () => '<i class="ic">🛡️</i>', beer: () => '<i class="ic">❤️+1</i>',
  panic: () => RNG(1) + '<i class="ic">✋🂠</i>', catbalou: () => '<i class="ic">👥</i><i class="ic">🗑️🂠</i>',
  stagecoach: () => '<i class="ic">+2🂠</i>', wellsfargo: () => '<i class="ic">+3🂠</i>', store: () => '<i class="ic">👥 1🂠</i>',
  saloon: () => '<i class="ic">👥 ❤️+1</i>', indians: () => '<i class="ic">👥</i><i class="ic">💥</i>', duel: () => '<i class="ic">👤⚔️</i>',
  gatling: () => '<i class="ic">👥</i><i class="ic">💥</i>', dynamite: () => '<i class="ic">🧨 ♠2–9</i><i class="ic">−3❤️</i>',
  jail: () => '<i class="ic">⛓️</i><i class="ic red">♥</i>', barrel: () => '<i class="ic">🛢️</i><i class="ic red">♥</i>',
  scope: () => '<i class="ic">👁️ −1</i>', mustang: () => '<i class="ic">🐎 +1</i>',
};
function iconsFor(type) { const info = CARD_INFO[type]; if (ICONS[type]) return ICONS[type](); if (info.kind === 'gun') return RNG(info.range) + (type === 'volcanic' ? '<i class="ic">∞💥</i>' : ''); return ''; }
export function cardEl(c, size = '') {
  const info = CARD_INFO[c.type];
  const red = c.suit === 'H' || c.suit === 'D';
  const d = el('div', `pcard ${info.kind} ${size}`);
  d.innerHTML = `<div class="ctop"><span class="idx${red ? ' red' : ''}">${rankLabel(c.rank)}${SUIT_SYMBOL[c.suit]}</span><span class="ktag">${info.kind === 'gun' ? 'Tầm ' + info.range : KIND_TAG[info.kind]}</span></div>
    <div class="art">${imgTag(c.type)}<div class="cicons">${iconsFor(c.type)}</div></div>
    <div class="cname">${info.name}</div><div class="cshort"><span>${suitify(info.short || '')}</span></div>`;
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
// đặt độ cao ghế theo chiều cao bàn HIỆN TẠI (gọi lại sau khi tay bài/nút dưới đổi cỡ làm bàn co giãn)
function placeSeatTop(seat, table) {
  const TH = table.clientHeight, portrait = !!seat.dataset.portrait, y = +seat.dataset.y, sh = seat.offsetHeight;
  let top = seat.dataset.land ? y / 100 * TH : Math.min(Math.max(y / 100 * TH, portrait ? 52 : 78), TH - (portrait ? 48 : 70));
  if (sh && TH > sh) top = Math.min(Math.max(top, sh / 2 + (seat.dataset.land ? 2 : 6)), TH - sh / 2 - 2);
  seat.style.top = top + 'px';
}
// điện thoại xoay ngang (bàn thấp, rộng): ghế dồn 2 bên, chừa cột giữa cho chồng bài + hộp nhắc
const SEATS_L = {
  3: [[10, 62], [27, 30], [73, 30]],
  4: [[9, 66], [27, 30], [73, 30], [91, 66]],
  5: [[4, 80], [19, 22], [32, 30], [68, 30], [92, 66]],
  6: [[4, 80], [19, 22], [32, 30], [68, 30], [81, 22], [96, 80]],
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
  return `<span class="hfan"><span class="backs" style="--n:${k}">${backs}</span><b>${n}</b></span>`;
}
function hpDots(p) {
  // Cảnh sát trưởng có thêm 1 viên đạn: viên đó màu vàng sáng lấp lánh
  let s = ''; for (let i = 0; i < p.maxHp; i++) s += `<i class="bul${i < p.hp ? ' on' : ''}${p.role === 'sheriff' && i === p.maxHp - 1 ? ' star' : ''}">${BULLET}</i>`;
  return `<div class="hpbar">${s}</div>`;
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
  $('#turn-info').innerHTML = v.phase === 'ended' ? 'Ván đã kết thúc' : `<span class="hide-m">Lượt ${v.turnCount} · </span><b>${esc(cur.name)}</b>${cur.id === myId ? ' (bạn)' : ''}`;

  renderCoach(); // trước khi xếp ghế: hộp mẹo đổi chiều cao khu dưới → bàn co lại
  // ---- Ghế quanh bàn ----
  const table = $('#table'); table.querySelectorAll('.seat').forEach(s => s.remove());
  const order = seatOrder(); const n = order.length;
  const waitingId = pr ? pr.player : null;
  order.forEach((p, k) => {
    if (k === 0) return; // mình ở dưới, hiện ở khu tay bài
    // vị trí ghế cố định theo số đối thủ: từ trái-dưới, lên trên, sang phải-dưới (chiều kim đồng hồ)
    const portrait = table.clientWidth < table.clientHeight * 1.15;
    const land = landCompact();
    const L = (land ? SEATS_L : portrait ? SEATS_P : SEATS)[Math.max(3, Math.min(6, n - 1))];
    const [x, y] = L[k - 1] || [50, 10];
    const seat = el('div', 'seat' + (p.id === cur.id ? ' current' : '') + (!p.alive ? ' dead' : '') + (p.id === waitingId ? ' waiting' : ''));
    seat.dataset.pid = p.id; seat.style.setProperty('--pc', pcolor(p.id));
    seat.style.left = x + '%'; seat.dataset.y = y; seat.dataset.portrait = portrait ? 1 : ''; seat.dataset.land = land ? 1 : '';
    const ch = CHARACTERS[p.character];
    const role = p.role ? `<div class="role-chip ${p.role}">${ROLES[p.role].icon} ${ROLES[p.role].name}</div>`
      : `<div class="role-chip hidden-role">❓ Chưa lộ</div>`;
    seat.innerHTML = `
      <div class="avatar"><div class="face">${avatarTag(p.character)}</div>${p.distance != null ? `<div class="dist"><b>${p.distance}</b><small>cách</small></div>` : ''}${p.table.some(c => c.type === 'jail') ? '<div class="bars"></div>' : ''}${p.table.some(c => c.type === 'dynamite') ? '<div class="fuse">🧨</div>' : ''}${!p.alive ? '<div class="rip">☠</div>' : ''}</div>
      <div class="plate"><div class="pname">${esc(p.name)}</div><div class="pchar">${ch.name}</div>${hpDots(p)}<div class="stats">${handFan(p.handCount)}<span class="rngbig">🎯 ${p.gunRange}</span></div>${role}</div>
      <div class="equip ${x < 50 ? 'right' : 'left'}"></div>`;
    const eq = seat.querySelector('.equip');
    for (const c of p.table) { const info = CARD_INFO[c.type]; const m = el('span', 'eqchip ' + info.kind, `${imgTag(c.type)}<b>${info.name}</b>`); attachTip(m, c); m.onclick = e => { e.stopPropagation(); if (matchMedia('(hover: none)').matches) showCardDetail(c); }; m.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); showCardDetail(c); }; eq.appendChild(m); }
    // chọn mục tiêu
    if (selectedCard && v.myOptions?.[selectedCard]?.targets?.includes(p.id)) { seat.classList.add('targetable'); seat.onclick = () => chooseTarget(p); }
    else if (selectedCard && v.myOptions?.[selectedCard]?.targets) { seat.classList.add('out'); seat.onclick = () => toast(`${p.name} ngoài tầm (cách ${p.distance}, tầm của bạn ${me().gunRange})`); }
    else if (pr && pr.type === 'draw_option' && pr.player === myId && pr.character === 'jessejones' && p.alive && p.handCount) { seat.classList.add('targetable'); seat.onclick = () => send({ type: 'draw_from_player', target: p.id }); }
    else seat.onclick = () => showCharacter(p);
    table.appendChild(seat);
    // giữ ghế nằm gọn trong bàn: không tràn mép màn hình, không chui xuống thanh trên
    const TW = table.clientWidth, sw = seat.offsetWidth, sh = seat.offsetHeight;
    if (sw && TW > sw) seat.style.left = Math.min(Math.max(x / 100 * TW, sw / 2 + 2), TW - sw / 2 - 2) + 'px';
    placeSeatTop(seat, table);
  });
  requestAnimationFrame(fitCenter);

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
  $('#me-info').style.setProperty('--pc', pcolor(myId));
  $('#me-info').innerHTML = `<div class="me-top"><div class="me-ava"><div class="face">${avatarTag(m.character)}</div></div>
      <div class="me-id"><div class="pname">${esc(m.name)}</div>${hpDots(m)}</div>
      <div class="me-range"><b>${m.gunRange}</b><small>tầm bắn</small></div></div>
    <div class="me-cols">${R ? `<div class="me-role ${m.role}"><span class="lbl">Vai trò</span><b>${R.icon} ${R.name}</b><span class="goal">${roleGoal(m.role)}</span></div>` : ''}
    <div class="me-skill"><span class="lbl">Kỹ năng · ${ch.name}</span>${suitify(ch.desc)}</div></div>`;
  $('#me-info').onclick = () => showIntro();
  const mt = $('#me-table'); mt.innerHTML = ''; mt.parentElement.classList.toggle('empty', !m.table.length);
  for (const c of m.table) { const tc = cardEl(c, 'sm'); attachTip(tc, c); mt.appendChild(tc); }

  // ---- Tay bài (xoè quạt) ----
  const hand = $('#me-hand'); hand.innerHTML = '';
  const responding = pr && pr.player === myId && pr.type === 'respond';
  const discarding = pr && pr.player === myId && pr.type === 'discard';
  const cards = m.hand || []; const cnt = cards.length;
  { // xếp thẳng hàng: nhiều lá thì thu nhỏ bớt trước, hết cỡ mới chồng mép
    const mob = innerWidth <= 760, max = mob ? 82 : 118, min = mob ? 62 : 86, mr = $('.me-right'), rightEdge = mr && m.table.length && mr.getBoundingClientRect().width ? mr.getBoundingClientRect().left - 10 : innerWidth, avail = Math.max(200, mob ? innerWidth - 24 : rightEdge - (($('.me-left') || $('#me-info') || hand).getBoundingClientRect().right || 0) - 60);
    const w = Math.max(min, Math.min(max, (avail - (cnt - 1) * 6) / Math.max(1, cnt)));
    const ov = cnt > 1 ? Math.min(3, ((avail - w) / (cnt - 1) - w) / 2) : 3;
    hand.style.setProperty('--hw', w + 'px'); hand.style.setProperty('--overlap', Math.max(-w * 0.3, ov) + 'px');
  }
  cards.forEach((c, i) => {
    const ce = cardEl(c);
    const mid = (cnt - 1) / 2; const off = i - mid;
    void off;
    if (responding) {
      if (v.myResponses.includes(c.id)) { ce.classList.add('respond', 'playable'); ce.onclick = () => send({ type: 'respond_card', cardId: c.id }); }
      else ce.classList.add('disabled');
    } else if (discarding) {
      ce.classList.add('playable', 'discardable'); if (discardSel.has(c.id)) ce.classList.add('to-discard'); ce.onclick = () => toggleDiscard(c.id);
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
  { const t = $('#table'); t.querySelectorAll('.seat').forEach(s => placeSeatTop(s, t)); requestAnimationFrame(fitCenter); }
  reacts.setVisible(v.phase === 'playing' || v.phase === 'ended');
}

// điện thoại dọc: nút của hộp nhắc (né một chạm, bỏ bài) đưa xuống thanh dưới cho dễ bấm, giữa bàn khỏi bị dài
let promptActs = [];
// Nút của hộp nhắc (né một chạm, chịu đòn, bỏ bài) luôn nằm ở thanh nút dưới tay bài – cùng chỗ với "Kết thúc lượt",
// giữa bàn chỉ còn tiêu đề + 1 dòng nên không đè ghế ở mọi cỡ màn.
const mobPrompt = () => true;
const landCompact = () => matchMedia('(max-height: 500px) and (orientation: landscape)').matches;
function renderActions() {
  const a = $('#actions'); a.innerHTML = '';
  if (promptActs.length) { a.classList.add('prompt-acts'); for (const b of promptActs) a.appendChild(b); promptActs = []; return; }
  a.classList.remove('prompt-acts');
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
  f.innerHTML = lines.map((l, i) => `<div class="${i === lines.length - 1 ? 'new' : ''}">${suitify(colorize(esc(l)))}</div>`).join('');
}
function renderPrompt() {
  const v = view, p = $('#prompt'); p.innerHTML = ''; p.className = 'prompt'; promptActs = [];
  const pr = v.prompt;
  if (!pr || v.phase === 'ended') {
    const cur = v.players[v.turn];
    if (v.phase === 'playing') {
      p.classList.add('quiet');
      const inl = newbie && landCompact() ? coachTips() : null; // màn ngang thấp: mẹo Người mới gộp vào đây
      const inlHTML = inl && inl.tip ? `<div class="co-inline">${inl.tip}</div>` : '';
      if (cur.id !== myId) { p.innerHTML = `⏳ Đang tới lượt <b>${esc(cur.name)}</b>…` + (inl ? `<div class="co-inline">${inl.role}</div>` : ''); return; }
      p.classList.add('hint');
      if (selectedCard && !me().hand.some(x => x.id === selectedCard)) selectedCard = null;
      if (selectedCard) { const c = me().hand.find(x => x.id === selectedCard); p.innerHTML = `👉 Bấm vào người <b>sáng viền đỏ</b> để dùng <b>${CARD_INFO[c.type].name}</b>. Người bị mờ là ở ngoài tầm.`; return; }
      const inRange = v.players.filter(q => q.alive && q.id !== myId && q.distance != null && q.distance <= me().gunRange).map(q => esc(q.name));
      const shortHint = (newbie && innerWidth <= 760) || landCompact(); // mẹo Người mới đã nói cách chơi ở dưới: giữa bàn gọn lại
      p.innerHTML = `<b>Lượt của bạn!</b>${shortHint ? '' : ' Bấm các lá <b>sáng màu</b> để đánh, xong bấm <b>Kết thúc lượt</b>.'}<br><span class="inrange">🎯 Trong tầm bắn (≤ ${me().gunRange}): ${inRange.length ? inRange.join(', ') : 'chưa ai – cần súng tầm xa hơn'}</span>${inlHTML}`;
    }
    return;
  }
  const who = v.players.find(x => x.id === pr.player);
  const src = pr.source ? v.players.find(x => x.id === pr.source) : null;
  const mine = pr.player === myId;
  if (mine) p.classList.add('mine');
  const kindText = { bang: `💥 ${src?.name} bắn ${mine ? 'bạn' : who.name}!`, gatling: `🔫 ${src?.name} quét Gatling!`, indians: `🏹 ${src?.name} gọi Indians!`, duel: `⚔️ Duel – ${mine ? 'tới bạn' : who.name} đáp trả` };
  if (pr.type === 'respond') {
    p.appendChild(el('div', 'ptitle', kindText[pr.kind]));
    if (mine) {
      const dodge = pr.kind === 'bang' || pr.kind === 'gatling';
      const need = dodge ? `Cần ${pr.need} lá Missed!` : 'Cần 1 lá BANG!';
      // né một chạm: hiện sẵn nút cho từng lá đáp trả hợp lệ (vẫn bấm được lá viền xanh dưới tay)
      const ids = v.myResponses || []; const hand = me().hand || [];
      const cards = ids.map(id => hand.find(c => c.id === id)).filter(Boolean);
      const pickC = []; for (const c of cards) if (!pickC.some(x => x.type === c.type)) pickC.push(c); // mỗi loại 1 nút trước
      const mob = mobPrompt();
      // mỗi loại lá 1 nút (bỏ lá nào cùng loại cũng như nhau) → hộp nhắc gọn 1 hàng, không đè ghế phía trên
      p.appendChild(el('div', 'sub', cards.length ? (innerWidth <= 760 || landCompact() ? `${need} 👇` : `${need} – bấm nút xanh ở dưới.`) : `${need} – bạn không có lá nào để ${dodge ? 'né' : 'đáp trả'}, đành chịu đòn.`));
      const row = el('div', 'row resp-row');
      const lock = () => row.querySelectorAll('button').forEach(x => x.disabled = true);
      const tight = mob && pickC.length > 1 && innerWidth < 430; // điện thoại hẹp + 2 loại lá: bỏ chữ "Dùng" cho vừa 1 hàng
      for (const c of pickC.slice(0, 2)) {
        const b = el('button', 'btn primary resp-btn', `${c.type === 'missed' ? '🛡️' : '💥'} ${tight ? '' : 'Dùng '}${suitify(esc(cardLabel(c)))}`);
        b.onclick = () => { lock(); send({ type: 'respond_card', cardId: c.id }); }; row.appendChild(b);
      }
      const b = el('button', 'btn danger', mob && pickC.length > 1 ? '💔 Chịu' : '💔 Chịu đòn'); b.onclick = () => { lock(); send({ type: 'take_hit' }); }; row.appendChild(b);
      if (mob) promptActs = [...row.children]; else p.appendChild(row);
    } else p.appendChild(el('div', 'sub', `Đang chờ ${esc(who.name)}…`));
    return;
  }
  if (pr.type === 'discard') {
    if (!mine) { p.appendChild(el('div', 'ptitle', `${esc(who.name)} đang bỏ bớt bài…`)); return; }
    const need = me().handCount - me().hp;
    for (const id of [...discardSel]) if (!me().hand.some(c => c.id === id)) discardSel.delete(id);
    p.appendChild(el('div', 'ptitle', `🗑️ Bỏ bớt ${need} lá`));
    p.appendChild(el('div', 'sub', mobPrompt() ? `Chỉ giữ được ${me().hp} lá (= số máu). Chọn ${need} lá ở tay rồi bấm nút dưới.` : `Cuối lượt chỉ được giữ số lá bằng số máu (${me().hp}). Bấm chọn ${need} lá ở tay bên dưới (lá chọn sẽ có dấu ✕), rồi bấm nút.`));
    const btns = el('div', 'row');
    const ok = el('button', 'btn primary', discardSel.size === need ? `🗑️ Bỏ ${need} lá đã chọn` : `Đã chọn ${discardSel.size}/${need}`);
    ok.disabled = discardSel.size !== need || discardQueue.length > 0;
    ok.onclick = () => { discardQueue = [...discardSel]; discardSel.clear(); sendNextDiscard(); };
    btns.appendChild(ok); if (mobPrompt()) promptActs = [ok]; else p.appendChild(btns);
    return;
  }
  if (pr.type === 'store') {
    p.appendChild(el('div', 'ptitle', `🏪 General Store – ${mine ? 'bạn chọn 1 lá' : esc(who.name) + ' đang chọn'}`));
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
      promptActs = [...row.children]; return; // nút ở thanh dưới, giống né một chạm
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
function chooseTarget(p, sure) {
  const o = view.myOptions[selectedCard];
  const mr = me().role, ct = me().hand.find(x => x.id === selectedCard)?.type;
  if (newbie && !sure && p.role === 'sheriff' && (mr === 'deputy' || mr === 'renegade') && ['bang', 'missed', 'duel', 'jail', 'panic', 'catbalou'].includes(ct)) {
    openModal(`<h3>🐣 Khoan đã!</h3><p>${mr === 'deputy' ? 'Bạn là <b>Phó cảnh sát</b> – bắn sếp ⭐ là đang giúp Tội phạm đó!' : 'Bạn là <b>Kẻ hai mặt</b> – sếp ⭐ chết sớm thì Tội phạm thắng, bạn cũng thua.'}</p><p class="muted">Vẫn muốn dùng <b>${CARD_INFO[ct].name}</b> lên ${esc(p.name)}?</p><div class="row" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn ghost" id="nb-no">Thôi, chọn người khác</button><button class="btn danger" id="nb-yes">Vẫn đánh</button></div>`);
    $('#nb-no').onclick = closeModal; $('#nb-yes').onclick = () => { closeModal(); chooseTarget(p, true); };
    return;
  }
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
    <h3>${info.name} ${info.en !== info.name ? `<small>${info.en}</small>` : ""}</h3><p>${suitify(info.desc)}</p>
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
  for (const line of view.log) {
    const d = el('div', /^— Lượt/.test(line) ? 'turnline' : '', suitify(colorize(esc(line))));
    const a = lineActor(line.replace(/^— Lượt của /, '')); if (a) d.style.setProperty('--pc', pcolor(a)), d.classList.add('who');
    l.appendChild(d);
  }
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
    } else if ((m = line.match(/^(.+) quét Gatling!$/))) {
      const s = pidByName(b, m[1]); cardSfx('gatling');
      b.players.filter(p => p.alive && p.id !== s).forEach((p, i) => shoot(anchorFor(s), anchorFor(p.id), { delay: 80 + i * 110 }));
      hitDelay = 450 * S(); screenShake();
    } else if ((m = line.match(/^(.+) gọi Indians! tấn công tất cả\.$/))) {
      const s = pidByName(b, m[1]); banner('🏹 Indians tấn công!'); cardSfx('indians');
      b.players.filter(p => p.alive && p.id !== s).forEach((p, i) => arrows(anchorFor(s), anchorFor(p.id), { delay: 200 + i * 140, onHit: () => sfx.card() }));
      hitDelay = 800 * S();
    } else if ((m = line.match(/^(.+) (?:đánh .+ né đạn|né được nhờ Barrel)\.$/))) {
      const t = pidByName(b, m[1]); if (/Barrel/.test(line)) { cardSfx('barrel'); setTimeout(() => cardSfx('missed'), 250); } else cardSfx('missed');
      setTimeout(() => stamp(anchorFor(t), 'HỤT!'), 320 * S());
    } else if ((m = line.match(/^💥 Dynamite nổ! (.+) mất 3 máu\.$/))) {
      const t = pidByName(b, m[1]); sfx.boom(); explode(anchorFor(t));
    } else if ((m = line.match(/thách (.+) Duel!$/))) {
      banner('⚔ Duel!', m[1].trim()); cardSfx('duel');
    } else if ((m = line.match(/nhốt (.+) vào Jail\.$/))) {
      const t = pidByName(b, m[1]); setTimeout(() => stamp(anchorFor(t), 'NHÀ TÙ'), 350);
    } else if ((m = line.match(/^(.+) bị giam, mất lượt\.$/))) {
      stamp(anchorFor(pidByName(b, m[1])), 'MẤT LƯỢT');
    } else if (/mở Saloon/.test(line)) {
      banner('🥃 Saloon!', 'Mọi người hồi 1 máu');
    } else if ((m = line.match(/^(.+) mở General Store/))) {
      banner('🏪 General Store', 'Mỗi người chọn 1 lá');
    }
  }
  // Lấy bài của người khác: lá bay từ người bị lấy về người lấy
  let discardSrc = null;
  const byChar = ch => b.players.find(p => p.character === ch)?.id;
  for (const line of lines) {
    let m, taker = null, victim = null;
    if ((m = line.match(/^(.+) dùng Panic! lấy 1 lá của (.+)\.$/))) { taker = pidByName(b, m[1]); victim = pidByName(b, m[2]); discardSrc = taker; }
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
  if (/hồi 1 máu/.test(txt) && !/uống Beer|Saloon/.test(txt)) sfx.heal();
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
    const r = (b.players.find(p => p.id === myId) || {}).role;
    const won = b.winner === 'law' ? r === 'sheriff' || r === 'deputy' : b.winner === r;
    musicStinger(won ? 'win' : 'lose');
  }
  for (const l of newLines(a, b)) { if (/ bị loại! Vai trò/.test(l)) musicStinger('death'); else if (/ thách .+ Duel!$/.test(l)) musicStinger('duel'); }
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

// ---------- Đồng hồ đếm giờ (chống treo máy) ----------
let timerEnd = 0, timerPid = null, timerIv = null, lastBeep = 0;
function setTimer(t) {
  let el = document.getElementById('turn-timer');
  if (!t) { timerEnd = 0; el.style.display = 'none'; clearInterval(timerIv); timerIv = null; return; }
  timerEnd = Date.now() + t.ms; timerPid = t.pid;
  if (!timerIv) timerIv = setInterval(tickTimer, 250);
  tickTimer();
}
function tickTimer() {
  const el = document.getElementById('turn-timer'); if (!el || !view) return;
  const left = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
  if (!timerEnd) { el.style.display = 'none'; return; }
  const mine = timerPid === myId; const p = view.players.find(x => x.id === timerPid);
  el.style.display = '';
  el.className = (mine ? 'mine ' : '') + (left <= 10 ? 'low' : '');
  el.innerHTML = `⏳ ${mine ? 'Bạn còn' : esc(p ? p.name : '?') + ':'} <b>${left}s</b>`;
  if (mine && left <= 5 && left > 0 && left !== lastBeep) { lastBeep = left; sfx.turn(); }
}

// ---------- Bỏ bớt bài cuối lượt: chọn đủ rồi bỏ một lần ----------
let discardSel = new Set(), discardQueue = [];
function toggleDiscard(id) {
  const need = me().handCount - me().hp;
  if (discardSel.has(id)) discardSel.delete(id);
  else { if (discardSel.size >= need) discardSel.delete([...discardSel][0]); discardSel.add(id); }
  sfx.card(); render();
}
function sendNextDiscard() {
  const pr = view && view.prompt;
  if (!pr || pr.type !== 'discard' || pr.player !== myId) { discardQueue = []; return; }
  const id = discardQueue.shift(); if (id) send({ type: 'discard_card', cardId: id });
}

// ---------- Nhạc theo diễn biến ----------
function newLines(a, b) { const la = a.log || [], lb = b.log || []; if (!la.length) return []; const last = la[la.length - 1]; const i = lb.lastIndexOf(last); return i >= 0 ? lb.slice(i + 1) : []; }
function musicMood(v) {
  if (!v || v.phase !== 'playing') { musicIntensity(0); return; }
  const alive = v.players.filter(p => p.alive), meP = v.players.find(p => p.id === myId), pr = v.prompt;
  const sheriff = v.players.find(p => p.role === 'sheriff');
  let lv = 0;
  if (alive.some(p => p.hp <= 1) || alive.length <= Math.ceil(v.players.length / 2) || (meP && meP.alive && meP.hp <= 2)) lv = 1;
  if (alive.length <= 2 || (meP && meP.alive && meP.hp <= 1) || (pr && pr.kind === 'duel') || (sheriff && sheriff.alive && sheriff.hp <= 1)) lv = 2;
  musicIntensity(lv);
}

// ---------- ⏪ Lượt vừa rồi: tóm tắt ai đánh gì lên ai ----------
const HOSTILE_CARDS = ['bang', 'duel', 'panic', 'catbalou', 'jail'];
function cardNm(t) { return CARD_INFO[t] ? CARD_INFO[t].name : t; }
function actText(a) {
  const B = pTag(a.by), T = pTag(a.to);
  switch (a.card) {
    case 'bang': return `💥 ${B} bắn ${T} → ${a.res === 'missed' ? '<i class="ok">né được</i>' : a.res === 'barrel' ? '<i class="ok">Barrel đỡ</i>' : a.res === 'hit' ? '<i class="bad">trúng 💔</i>' : '<i>đang chờ…</i>'}`;
    case 'duel': return `⚔️ ${B} thách ${T} Duel → ${a.lost ? pTag(a.lost) + ' <i class="bad">thua</i>' : '<i>đang đấu…</i>'}`;
    case 'panic': return `😱 ${B} Panic! lấy ${a.got ? '<b>' + cardNm(a.got) + '</b>' : '1 lá trên tay'} của ${T}`;
    case 'catbalou': return `🐈 ${B} Cat Balou: ${T} bỏ <b>${a.got ? cardNm(a.got) : '1 lá'}</b>`;
    case 'jail': return a.by ? `⛓️ ${B} nhốt ${T} vào Jail` : a.res === 'stuck' ? `⛓️ ${T} bị giam, <i class="bad">mất lượt</i>` : `🔓 ${T} thoát Jail`;
    case 'gatling': case 'indians': return `${a.card === 'gatling' ? '🔫' : '🏹'} ${B} ${a.card === 'gatling' ? 'quét Gatling' : 'gọi Indians!'} → ${a.hit && a.hit.length ? 'trúng: ' + a.hit.map(pTag).join(', ') : '<i class="ok">không ai trúng</i>'}`;
    case 'beer': return `🍺 ${B} uống Beer`;
    case 'saloon': return `🥃 ${B} mở Saloon – ai cũng hồi 1 máu`;
    case 'stagecoach': case 'wellsfargo': return `🛺 ${B} rút thêm bài (${cardNm(a.card)})`;
    case 'store': return `🏪 ${B} mở General Store`;
    case 'sid': return `💊 ${B} bỏ 2 lá hồi 1 máu`;
    case 'dynamite': return a.res === 'boom' ? `🧨 Dynamite nổ: ${T} <i class="bad">mất 3 máu</i>` : `🧨 ${B} đặt Dynamite`;
    case 'kill': return `☠️ ${T} bị loại${a.role ? ' – là <b>' + ROLES[a.role].name + '</b>' : ''}${a.by ? ' (bởi ' + B + ')' : ''}`;
    default: return CARD_INFO[a.card] ? `🧰 ${B} trang bị <b>${cardNm(a.card)}</b>` : '';
  }
}
function turnGroups(v) {
  const groups = [];
  for (const a of v.acts || []) {
    let g = groups.length && groups[groups.length - 1].n === a.n ? groups[groups.length - 1] : null;
    if (!g) { g = { n: a.n, by: a.card === 'turn' ? a.by : a.t, items: [] }; groups.push(g); }
    if (a.card !== 'turn') g.items.push(a);
  }
  return groups;
}
function recapHTML() {
  const v = view; const groups = turnGroups(v);
  const alive = v.players.filter(p => p.alive).length;
  const cur = v.phase === 'playing' ? v.turnCount : Infinity;
  const show = groups.filter(g => g.n <= cur).slice(-(alive + 1)).reverse();
  const lastDone = show.find(g => g.n < cur);
  let h = `<div class="recap"><h3>⏪ Lượt vừa rồi</h3>`;
  if (!show.length) h += '<p class="muted">Chưa có gì xảy ra.</p>';
  for (const g of show) {
    const lbl = g.n === cur ? 'Lượt này' : g === lastDone ? 'Lượt vừa rồi' : 'Trước đó';
    const items = g.items.map(actText).filter(Boolean);
    h += `<div class="rc-turn${g === lastDone ? ' last' : ''}"><div class="rc-h"><span class="rc-lbl">${lbl}</span> ${pTag(g.by)}</div>${items.length ? '<ul>' + items.map(x => `<li>${x}</li>`).join('') + '</ul>' : `<p class="muted rc-none">${g.n === cur ? 'Chưa đánh lá nào.' : 'Không đánh lá nào.'}</p>`}</div>`;
  }
  // ai tấn công ai trong cả ván (công khai) – để đoán vai
  const tally = {};
  for (const a of v.acts || []) if (a.by && a.to && a.by !== a.to && HOSTILE_CARDS.includes(a.card)) { const k = a.by; (tally[k] = tally[k] || {})[a.to] = (tally[k][a.to] || 0) + 1; }
  const rows = Object.entries(tally);
  if (rows.length) {
    h += `<h4>🎯 Ai tấn công ai (cả ván)</h4><div class="rc-tally">` + rows.map(([by, m]) => `<div>${pTag(by)} → ${Object.entries(m).sort((a, b) => b[1] - a[1]).map(([to, k]) => `${pTag(to)}${k > 1 ? ' ×' + k : ''}`).join(' ')}</div>`).join('') + '</div>';
    h += `<p class="rc-hint">💡 Hay tấn công sếp ⭐ → dễ là <b>Tội phạm</b>. Hay bắn kẻ bắn sếp → dễ là <b>phe Cảnh sát</b>. (Tính BANG!, Duel, Jail, Panic!, Cat Balou)</p>`;
  }
  return h + `<button class="btn" id="rc-close">Đóng</button></div>`;
}
function showRecap() { if (!view) return; openModal(recapHTML()); $('#rc-close').onclick = closeModal; }

// ---------- 🐣 Mẹo cho Người mới ----------
function coachTips() {
  const v = view, m = me(); if (!m || !m.alive || v.phase !== 'playing' || !m.role) return null;
  const sh = v.players.find(p => p.role === 'sheriff');
  const shName = sh ? (sh.id === myId ? 'bạn' : esc(sh.name)) : '';
  const role = { sheriff: '⭐ <b>Sếp:</b> bắn kẻ tấn công bạn, coi chừng nhầm Phó.',
    deputy: `🎖️ <b>Phó:</b> đừng bắn sếp ⭐ ${shName}, bắn kẻ bắn sếp.`,
    outlaw: `🤠 <b>Tội phạm:</b> dồn sức bắn sếp ⭐ ${shName}.`,
    renegade: '🎭 <b>Hai mặt:</b> diệt Tội phạm trước, giữ sếp ⭐ tới cuối.' }[m.role];
  const pr = v.prompt, hand = m.hand || [], has = t => hand.some(c => c.type === t);
  const since = v.turnCount - v.players.filter(p => p.alive).length;
  const attackersOf = to => [...new Set((v.acts || []).filter(a => a.to === to && a.by && a.by !== to && HOSTILE_CARDS.includes(a.card) && a.n > since).map(a => a.by))]
    .filter(id => id !== myId && v.players.find(p => p.id === id)?.alive);
  const myTurn = v.players[v.turn].id === myId && !pr && v.step === 'play';
  // lá BANG! đánh được lúc này (Calamity Janet: cả Missed!)
  const bc = v.myOptions ? hand.find(c => (c.type === 'bang' || c.type === 'missed') && v.myOptions[c.id]?.ok && v.myOptions[c.id].targetMode === 'player') : null;
  const bangOpt = bc ? v.myOptions[bc.id] : null;
  const inRange = id => !!bangOpt && bangOpt.targets.includes(id);
  let tip = '';
  if (pr && pr.player === myId) {
    const ok = (v.myResponses || []).length;
    if (pr.type === 'respond') {
      if (pr.kind === 'bang' || pr.kind === 'gatling') tip = ok ? '💡 Bấm nút xanh 🛡️ ở dưới để né – khỏi mất máu.' : '💡 Không có Missed! – đành chịu. Nên giữ 1 lá Missed! hoặc có Barrel.';
      else if (pr.kind === 'indians') tip = ok ? '💡 Bỏ 1 lá <b>BANG!</b> để khỏi mất máu (Missed! không chặn được).' : '💡 Indians chỉ chặn bằng BANG! – không có thì chịu.';
      else tip = ok ? '💡 Duel: hai bên lần lượt bỏ BANG!, ai hết trước thì mất máu.' : '💡 Hết BANG! nên thua Duel, mất 1 máu.';
    } else if (pr.type === 'discard') tip = '💡 Bỏ lá ít dùng (súng tầm ngắn, lá trùng); nên giữ <b>Missed!</b> và <b>Beer</b>.';
    else if (pr.type === 'store') tip = '💡 Nên lấy Beer, Missed! hoặc súng tầm xa.';
    else if (pr.type === 'draw_option') tip = '💡 Không chắc thì cứ rút từ bộ bài.';
  } else if (myTurn) {
    const blue = ['barrel', 'mustang', 'scope'].find(t => has(t) && !m.table.some(c => c.type === t));
    const gun = hand.filter(c => CARD_INFO[c.type].kind === 'gun' && CARD_INFO[c.type].range > m.gunRange).sort((a, b) => CARD_INFO[b.type].range - CARD_INFO[a.type].range)[0];
    const shAtk = sh && sh.id !== myId ? attackersOf(sh.id) : [], meAtk = attackersOf(myId);
    if (m.hp <= 2 && m.hp < m.maxHp && has('beer')) tip = '🍺 Máu thấp – uống <b>Beer</b> ngay!';
    else if (has('wellsfargo') || has('stagecoach')) tip = `💡 Đánh <b>${has('wellsfargo') ? 'Wells Fargo' : 'Stagecoach'}</b> trước để rút thêm bài.`;
    else if (blue) tip = `🛡️ Trang bị <b>${cardNm(blue)}</b> – đặt trước mặt, có tác dụng mãi.`;
    else if (gun) tip = `🔫 Trang bị <b>${cardNm(gun.type)}</b> để bắn xa ${CARD_INFO[gun.type].range}.`;
    else if (m.role === 'outlaw' && sh && bangOpt) tip = inRange(sh.id) ? `🎯 Sếp ⭐ ${shName} đang trong tầm – <b>BANG!</b> ngay!` : `🔭 Sếp ⭐ ngoài tầm (cách ${sh.distance}) – cần súng xa hơn.`;
    else if ((m.role === 'deputy' || m.role === 'renegade') && shAtk.length && bangOpt) { const t = shAtk.find(inRange) || shAtk[0]; tip = `🎯 ${pTag(t)} vừa tấn công sếp – nghi là <b>Tội phạm</b>${inRange(t) ? ', bắn trả!' : ' (đang ngoài tầm).'}`; }
    else if (m.role === 'sheriff' && meAtk.length && bangOpt) { const t = meAtk.find(inRange) || meAtk[0]; tip = `🎯 ${pTag(t)} vừa tấn công bạn – có thể là <b>Tội phạm</b>.`; }
    else if (m.hp <= 2) tip = '❤️ Máu thấp: giữ Missed! để né, đừng bỏ Beer.';
    else if (hand.length > m.hp) tip = `🗑️ Cuối lượt chỉ được giữ ${m.hp} lá – đánh bớt bài trước khi kết thúc.`;
    else tip = '💡 Bấm lá <b>sáng màu</b> để đánh, xong bấm <b>Kết thúc lượt</b>.';
  } else {
    if (m.hp <= 1 && has('beer')) tip = '🍺 Còn 1 máu: Beer trên tay sẽ tự cứu bạn.';
    else tip = '👀 Để ý ai bắn ai – bấm <b>⏪</b> xem lượt vừa rồi để đoán vai.';
  }
  return { role, tip };
}
function renderCoach() {
  const c = $('#coach'); if (!c) return;
  // máy tính: đặt trên khung thông tin của mình (cột trái còn trống) để bàn chơi không bị thấp đi; điện thoại: trên tay bài
  const home = innerWidth > 760 ? $('.me-left') : $('.me-mid');
  if (c.parentElement !== home) home.insertBefore(c, home.firstChild);
  const t = newbie && view && !landCompact() ? coachTips() : null;
  c.classList.toggle('hidden', !t);
  if (!t) { c.innerHTML = ''; return; }
  c.innerHTML = `<span class="co-role">${t.role}</span>${t.tip ? `<span class="co-tip">${t.tip}</span>` : ''}`;
}

// ---------- 😂 Thả emoji / chọc nhau (shared/ui/react.js) ----------
const reacts = createReactions({
  send: e => { if (!net) return; if (isHost) net.react('host', e); else net.react(e); },
  seatEl: id => id === myId ? $('#me-info') : $(`.seat[data-pid="${id}"] .plate`),
  myId: () => myId,
  nameOf: id => { const p = view && view.players.find(x => x.id === id); return p ? p.name.replace(' 🤖', '') : ''; },
  mount: $('#table'), place: 'left:22%;bottom:8px', // điện thoại dọc: CSS đưa xuống góc phải dưới
  phrases: BANG_PHRASES,
  onShow: () => sfx.card(),
});
reacts.setVisible(false);
// điện thoại dọc: nút 😂 nằm cố định góc phải dưới màn hình (gắn vào body để không bị khu tay bài che); máy tính: mép dưới bàn
// Chỗ đặt nút 😂 (không đè lên gì): điện thoại dọc → trong khung thông tin của mình (giữa tên và ô tầm bắn);
// màn vừa / điện thoại ngang → nằm trên thanh trên; máy tính → mép dưới bàn, giữa các ghế.
function placeReactBtn() {
  const rb = document.querySelector('.bgr-btn'); if (!rb) return;
  const disp = rb.style.display, w = innerWidth, land = landCompact();
  const mode = w <= 760 && !land ? 'me' : w <= 1100 || land ? 'bar' : 'table';
  if (mode === 'me') { const ml = $('.me-left'); if (rb.parentElement !== ml) ml.appendChild(rb); rb.style.cssText = 'position:absolute;right:64px;top:7px;width:40px;height:40px;font-size:21px;z-index:3'; }
  else if (mode === 'bar') { if (rb.parentElement !== $('.topbar')) $('.topbar').insertBefore(rb, $('#btn-guide')); rb.style.cssText = 'position:static;width:36px;height:36px;font-size:19px;flex:0 0 auto'; }
  else { if (rb.parentElement !== $('#table')) $('#table').appendChild(rb); rb.style.cssText = 'position:absolute;left:22%;bottom:8px'; }
  rb.style.display = disp;
}
placeReactBtn(); addEventListener('resize', placeReactBtn);
