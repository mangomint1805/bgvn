import { Host, Client, MAX, loadSnapshot, session, UNO_PHRASES } from './net.js?v=37';
import { linkCode, clearLinkCode, inviteUrl, joinByLink } from '../../shared/net/joinlink.js?v=2';
import { netStatus } from '../../shared/ui/status.js';
import { createReactions } from '../../shared/ui/react.js?v=2';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=135';
import { startPick, endPick, pickActive } from '../../shared/ui/seatpick.js?v=1';
import { MODES, COLOR_NAME, cardText, DRAW_VALUE, CARD_NAME, MATCH_TARGETS, deckTypes } from './engine.js?v=21';
import * as fx from './ufx.js?v=20';
import { openGuide, CARD_HELP, NEW_TYPES } from './guide.js?v=21';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

let net = null, isHost = false, myId = null, lobby = null, view = null, prevView = null;
let shownTop = null, freshIds = new Set(), modalKey = null, landing = false;

// ---------- lá bài ----------
export const SYM = { skip: '⊘', rev: '⇄', d2: '+2', d4: '+4', skipall: '⊘⊘', discall: '✕', wild: '', wd4: '+4', wrd4: '⇄4', wd6: '+6', wd10: '+10', roulette: '?', wtd4: '🎯4', wup: '⬆', tornado: '🌀', nou: '↺U', shield: '🛡', dq: '+?', gift: '🎁', steal: '🫳', wswap: '🤝' };
export const LBL = { skip: 'KHOÁ MÕM', rev: 'ĐẢO CHIỀU', d2: 'RÚT 2', d4: 'RÚT 4', skipall: 'KHOÁ BÀN', discall: 'XẢ MÀU', wild: 'ĐỔI MÀU', wd4: 'RÚT 4', wrd4: 'ĐẢO +4', wd6: 'RÚT 6', wd10: 'RÚT 10', roulette: 'QUAY MÀU', wtd4: 'NHẮM +4', wup: 'UP', tornado: 'BÃO TỐ', nou: 'NO U', shield: 'KHIÊN', dq: 'CỘNG ?', gift: 'TẶNG QUÀ', steal: 'MÓC TÚI', wswap: 'ĐỔI TAY' };
export function cardHTML(c, cls = '', attrs = '') {
  if (!c) return `<div class="ucard back ${cls}" ${attrs}></div>`;
  if (c.type === 'tornado') { // xoáy vẽ bằng nét cùng màu lá (emoji 🌀 luôn màu xanh)
    const sw = k => `<svg viewBox="0 0 24 24" width="${k}em" height="${k}em" style="vertical-align:-.12em" aria-hidden="true"><path d="M12 12.2c.9-.5.6-1.9-.5-2-1.6-.2-2.6 1.6-2 3 .8 2 3.6 2.4 5.1 1 2.2-2 1.4-5.7-1.3-6.6C10.2 6.6 6.8 8.6 6.3 11.6c-.6 3.6 2.4 6.8 6 6.6 4.6-.2 7.5-4.9 6.1-9.2C17 4.9 12.1 2.9 8 4.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;
    return `<div class="ucard c-${c.color} t-${c.type} ${cls}" data-id="${c.id}" ${attrs}><span class="cor tl">${sw(1)}</span><div class="oval"><b>${sw(1.25)}</b></div><span class="cor br">${sw(1)}</span><div class="lbl"><span>${LBL[c.type]}</span></div></div>`;
  }
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
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); if (id !== 'screen-game') { fx.musicMood('lobby'); endPick(); } }
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
  onState(v) { afkEnd = v && v.timer ? Date.now() + v.timer.ms : 0; afkPid = v && v.timer ? v.timer.pid : null; if (!v) { view = null; closeModal(); endPick(); show('screen-lobby'); renderLobby(); return; } prevView = view; view = v; if (!$('#screen-game').classList.contains('active')) { show('screen-game'); prevView = null; } render(); animate(prevView, view); },
  onError(m) { toast(m); fx.sfx.bad(); },
  onJoined(id) { myId = id; },
  onDisconnect() {},
  onNet(t, k, retry) { netStatus(t, k, retry); },
  onReact(msg) { reacts.show(msg); },
};
function startHost(offline) {
  fx.actx(); fx.musicResumeIfOn();
  if (net && net.leave) net.leave();
  net = new Host(myName(), handlers, offline); isHost = true; myId = 'host';
  if (offline) session.save('uno', { role: 'host', code: 'OFFLINE' });
  if (offline) { net && net.addBot(); net && net.addBot(); net && net.addBot(); }
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
// link mời ?room=MÃ (shared/net/joinlink.js): mở link là vào thẳng phòng
const qcode = linkCode(); if (qcode) $('#join-code').value = qcode;
function linkJoin(code) { $('#join-code').value = code; joinByLink({ code, toast: m => toast(m), join: n => { $('#name').value = n; $('#btn-join').click(); }, abort: () => leave() }); }
function leave() { if (net) (net.leave ? net.leave() : net.destroy()); net = null; view = null; lobby = null; closeModal(); show('screen-home'); }
$('#btn-leave-lobby').onclick = leave;
$('#btn-leave').onclick = () => openModal(`<h2>Rời ván?</h2><p style="text-align:center">${isHost ? 'Bạn là chủ phòng – rời đi sẽ kết thúc ván cho mọi người.' : 'Bạn có thể vào lại bằng mã phòng.'}</p><div class="win"><div class="btns"><button class="btn" onclick="__closeModal()">Ở lại</button><button class="btn red" id="m-leave">Rời ván</button></div></div>`);
document.addEventListener('click', e => { if (e.target.id === 'm-leave') leave(); });
$('#btn-copy').onclick = () => { const url = inviteUrl($('#room-code').textContent); navigator.clipboard?.writeText(url).then(() => toast('Đã chép link mời 📋'), () => toast(url)); };

// ---------- sảnh ----------
const RULE_INFO = {
  stackDraw: ['Cộng dồn lá rút', 'Bị +2/+4… thì chồng lá rút bằng hoặc lớn hơn để đẩy phạt đi tiếp.'],
  stackAny: ['+2 / +4 chồng lẫn nhau', 'Lá rút nào chồng lên lá rút nào cũng được (+2 lên +4 vẫn được).'],
  stackSkip: ['Chồng Khoá mõm', 'Bị khoá mõm thì đánh Khoá mõm để chuyền cho người kế.'],
  sevenZero: ['Luật 7 – 0', 'Đánh 7: đổi bài với 1 người. Đánh 0: mọi người chuyền bài theo chiều chơi.'],
  drawUntil: ['Rút tới khi đánh được', 'Không có lá hợp thì rút liên tục tới khi ra lá đánh được (bắt buộc đánh).'],
  mercy: ['Luật không khoan nhượng', 'Ai giữ từ 25 lá trở lên bị loại.'],
  extras: ['Lá mở rộng', 'Thêm Cộng nhắm +4, Bão tố, Xả màu, Up, +?, No U, Khiên, Tặng quà, Móc túi và Đổi tay vào bộ bài.'],
  noActionFinish: ['Không về bằng lá chức năng', 'Lá cuối cùng phải là lá số. Còn mỗi lá chức năng/đổi màu thì phải rút bài.'],
};
const MODE_DESC = {
  classic: 'Luật chuẩn 108 lá. Không có lá đánh được thì rút 1 lá, hợp thì đánh luôn.',
  house: 'Luật rừng quen thuộc: cộng dồn +2/+4, Khoá mõm chồng Khoá mõm, tự bốc phạt từng lá, không về bằng lá chức năng, có sẵn lá mở rộng (No U, Khiên, +?, Bão tố…).',
  nomercy: 'Bộ 168 lá cực gắt: +6, +10, Quay màu, Xả màu, 7–0, ≥ 25 lá là bị loại!',
};
function renderLobby() {
  if (!lobby) return;
  const ps = lobby.players;
  $('#pcount').textContent = `${ps.length}/${MAX}`;
  $('#plist').innerHTML = ps.map(p => `<li>${avatar(p.name)}<span>${esc(p.name)}${p.id === myId ? ' <small>(bạn)</small>' : ''}${p.id === 'host' ? ' 👑' : ''}${!p.connected ? ' <small>📴</small>' : ''}</span>${isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}">✕</button>` : ''}</li>`).join('');
  $$('#plist [data-rm]').forEach(b => b.onclick = () => net && net.removePlayer(b.dataset.rm));
  $('#btn-addbot').style.display = isHost ? '' : 'none';
  $('#modes').innerHTML = Object.entries(MODES).map(([k, m]) => `<button class="mode ${lobby.mode === k ? 'on' : ''}" data-mode="${k}" ${isHost ? '' : 'disabled'}><b>${k === 'nomercy' ? '💀 ' : k === 'house' ? '🔥 ' : '🎴 '}${m.name}</b><small>${MODE_DESC[k]}</small></button>`).join('');
  $$('#modes [data-mode]').forEach(b => b.onclick = () => net && net.setMode(b.dataset.mode));
  $('#rules').innerHTML = Object.entries(RULE_INFO).map(([k, [t, d]]) => `<label class="rule"><input type="checkbox" data-rule="${k}" ${lobby.rules[k] ? 'checked' : ''} ${isHost ? '' : 'disabled'}><span><b>${t}</b><small>${d}</small></span></label>`).join('');
  $$('#rules [data-rule]').forEach(i => i.onchange = () => net && net.setRule(i.dataset.rule, i.checked));
  { /* 🚫 bỏ bớt loại lá: bấm vào lá nào thì lá đó không có trong bộ bài ván này */
    const ban = lobby.ban || [], types = deckTypes(lobby.mode, lobby.rules);
    $('#ban').innerHTML = types.map(t => `<button class="banchip ${ban.includes(t) ? 'off' : ''}" data-ban="${t}" ${isHost ? '' : 'disabled'} aria-pressed="${ban.includes(t)}">${ban.includes(t) ? '🚫' : '✅'} ${esc(CARD_NAME[t])}</button>`).join('');
    $('#ban-note').textContent = ban.filter(t => types.includes(t)).length ? `Đang bỏ ${ban.filter(t => types.includes(t)).length} loại lá.` : 'Bấm vào loại lá muốn bỏ khỏi bộ bài (lá số luôn có).';
    $$('#ban [data-ban]').forEach(b => b.onclick = () => isHost && net && net.setBan && net.setBan(b.dataset.ban, !b.classList.contains('off')));
  }
  renderMatchOpt();
  $('#btn-start').style.display = isHost ? '' : 'none';
  $('#wait-msg').style.display = isHost ? 'none' : '';
}
// tuỳ chọn "Tính điểm tới 500": chơi nhiều ván, người về nhất cộng điểm bài còn lại của người khác
function renderMatchOpt() {
  const m = lobby.match || { on: false, target: 500, round: 0, scores: {} };
  const dis = isHost ? '' : 'disabled';
  $('#match-opt').innerHTML = `<label class="rule"><input type="checkbox" id="match-on" ${m.on ? 'checked' : ''} ${dis}><span><b>🏆 Tính điểm tới ${m.target}</b><small>Chơi nhiều ván. Hết ván, người về nhất cộng điểm theo bài còn trên tay người khác (số = mặt số, lá chức năng 20, Đổi màu/+4/lá mở rộng 50). Ai đạt ${m.target} điểm trước là vô địch!</small></span></label>
    <div class="targets ${m.on ? '' : 'off'}"><span>Mục tiêu:</span>${MATCH_TARGETS.map(t => `<button class="chip ${m.target === t ? 'on' : ''}" data-target="${t}" ${dis}>${t}</button>`).join('')}</div>
    ${m.on && m.round ? `<div class="lobby-score"><b>Bảng điểm sau ${m.round} ván</b>${scoreRows(m, lobby.players)}${isHost ? '<button class="chip sm" id="match-reset">🧹 Xoá điểm, chơi lại từ đầu</button>' : ''}</div>` : ''}`;
  const on = $('#match-on'); if (on) on.onchange = () => net && net.setMatch(on.checked, m.target);
  $$('#match-opt [data-target]').forEach(b => b.onclick = () => net && net.setMatch(true, +b.dataset.target));
  const rs = $('#match-reset'); if (rs) rs.onclick = () => net && net.resetMatch();
}
// các hàng bảng điểm: tên, (điểm ván vừa rồi), tổng, thanh tiến độ tới mục tiêu
function scoreRows(m, players, withLast = false) {
  const L = m.last || {};
  const rows = players.map(p => ({ p, total: m.scores[p.id] || 0, d: L.detail && L.detail[p.id] }))
    .sort((a, b) => b.total - a.total || ((a.d && a.d.pts) || 0) - ((b.d && b.d.pts) || 0));
  return `<table class="score"><tbody>${rows.map(({ p, total, d }) => {
    const win = withLast && L.winner === p.id;
    const sub = !withLast || !d ? '' : win ? `<span class="gain">+${L.gained}</span>` : d.out ? '<small>bị loại</small>' : `<small>${d.cards} lá · ${d.pts} điểm</small>`;
    return `<tr class="${win ? 'w' : ''} ${p.id === myId ? 'me' : ''}"><td>${avatar(p.name)}</td><td class="nm">${esc(p.name.replace(' 🤖', ''))}${p.id === myId ? ' <small>(bạn)</small>' : ''}<div class="bar"><i style="width:${Math.min(100, total / m.target * 100)}%"></i></div></td><td class="sub">${sub}</td><td class="tot">${total}</td></tr>`;
  }).join('')}</tbody></table>`;
}
function openScores() {
  const m = view && view.match; if (!m) return;
  openModal(`<button class="close-x" onclick="__closeModal()">✕</button><h2>🏆 Bảng điểm</h2><p class="score-cap">Ván ${m.round + (view.phase === 'playing' ? 1 : 0)} · ai đạt <b>${m.target}</b> điểm trước là vô địch</p>${scoreRows(m, view.players, !!m.last && view.phase === 'ended')}`);
}
$('#btn-addbot').onclick = () => net && net.addBot();
$('#btn-start').onclick = () => { fx.actx(); net && net.start(); };

// ---------- công cụ ----------
// chủ đề màu nền
const THEMES = [['candy', '🍬 Kẹo ngọt'], ['sea', '🌊 Biển xanh'], ['sunset', '🌇 Hoàng hôn']];
function applyTheme(k) { document.documentElement.dataset.theme = k; try { localStorage.setItem('uno-theme', k); } catch (e) {} }
let themeK = (() => { try { return localStorage.getItem('uno-theme') || 'candy'; } catch (e) { return 'candy'; } })(); applyTheme(themeK);
const nextTheme = () => { const i = THEMES.findIndex(t => t[0] === themeK); themeK = THEMES[(i + 1) % THEMES.length][0]; applyTheme(themeK); toast('Chủ đề: ' + THEMES.find(t => t[0] === themeK)[1]); };
$('#btn-theme').onclick = nextTheme; $('#btn-theme-home').onclick = nextTheme;
$('#speed').innerHTML = Object.entries(fx.SPEEDS).map(([k, v]) => `<option value="${k}">⚡ ${v.name}</option>`).join('');
$('#speed').value = fx.getSpeed(); $('#speed').onchange = e => fx.setSpeed(e.target.value);
const syncMusic = () => { $('#btn-music').classList.toggle('on', fx.musicIsOn()); $('#btn-music-home').classList.toggle('on', fx.musicIsOn()); };
$('#btn-music').onclick = $('#btn-music-home').onclick = () => { fx.actx(); fx.musicToggle(); syncMusic(); }; syncMusic();
$('#vol').value = fx.musicVolume(); $('#vol').oninput = e => fx.musicVolume(+e.target.value);
const syncMute = () => $('#btn-mute').textContent = fx.isMuted() ? '🔇' : '🔊';
$('#btn-mute').onclick = () => { fx.toggleMute(); syncMute(); }; syncMute();
$('#btn-guide').onclick = $('#btn-guide-home').onclick = () => openGuide(openModal, cardHTML);
// 📝 Có gì mới (patch notes dùng chung)
const news = () => { openNews('uno'); ['#btn-news-home', '#btn-news'].forEach(k => $(k).classList.remove('bgvn-dot')); };
$('#btn-news-home').onclick = $('#btn-news').onclick = news; window.__news = news;
newsBadge($('#btn-news-home'), 'uno'); newsBadge($('#btn-news'), 'uno');
$('#btn-log').onclick = () => $('#log').classList.toggle('open');
$('#btn-log-close').onclick = () => $('#log').classList.remove('open');

// ---------- gửi hành động ----------
function send(a) { if (!net) return; if (isHost) net.act('host', a); else net.act(a); }
const me = () => view && view.players.find(p => p.id === myId);
const isMyTurn = () => view && view.phase === 'playing' && view.players[view.turn].id === myId && !view.pending && !view.owe;
const iOwe = () => view && view.phase === 'playing' && view.owe && view.owe.player === myId;
// tự bốc phạt: mỗi lần cách nhau 1 giây
const PULL_CD = 1000; let pullReadyAt = 0, pullT = null;
function pull() {
  if (!iOwe()) return;
  const now = Date.now(); if (now < pullReadyAt) { fx.sfx.bad(); fx.shake($('#deck')); return; }
  pullReadyAt = now + PULL_CD; send({ type: 'pull' }); renderActions(view, me());
  clearTimeout(pullT); pullT = setTimeout(() => view && renderActions(view, me()), PULL_CD + 20);
}
const pname = id => (view.players.find(p => p.id === id) || {}).name || '?';

function pickColor(title, cb) {
  openModal(`<h2>${title}</h2><div class="color-pick">${['R', 'Y', 'G', 'B'].map(c => `<button data-c="${c}" style="background:${COL_HEX[c]}">${COLOR_NAME[c]}<small>${(me().hand || []).filter(x => x.color === c).length} lá trong tay</small></button>`).join('')}</div>${cb.cancel ? '<div class="win"><div class="btns"><button class="btn" onclick="__closeModal()">Huỷ</button></div></div>' : ''}`, '', cb.key || null);
  $$('.color-pick [data-c]').forEach(b => b.onclick = () => { closeModal(); cb(b.dataset.c); });
}

// chọn đối thủ ngay trên bàn (ghế sáng lên + 🎯); không thấy ghế mới mở danh sách cũ
const TAP = { steal: '🫳 Chạm vào người muốn <b>móc túi</b>', gift: '🎁 Chạm vào người muốn <b>tặng quà</b>', wswap: '🤝 Chạm vào người muốn <b>đổi tay</b>', wtd4: '🎯 Chạm vào người bị <b>nhắm rút 4 lá</b>', swap: '🔄 Chạm vào người muốn <b>đổi bài</b>' };
function pickTarget(title, cb, key = null, minCards = 0, act = 'wtd4', cardId = null) {
  const elig = () => view.players.filter(p => !p.out && p.id !== myId);
  const any = () => elig().some(p => p.handCount >= minCards);
  const pk = key ? 'pend-' + key : 'play-' + act + '-' + cardId;
  startPick({
    key: pk, root: $('#opps'), seat: id => $(`#opps .seat[data-pid="${id}"]`), glow: '.plate', title: TAP[act] || title, anchor: () => $('#hint'),
    items: () => elig().map(p => { const ok = p.handCount >= minCards || !any(); return { id: p.id, name: p.name.replace(' 🤖', ''), ok, reason: ok ? '' : `chỉ còn ${p.handCount} lá` }; }),
    valid: () => key ? !!(view && view.phase === 'playing' && view.pending && view.pending.player === myId) : !!(isMyTurn() && cardId && (me().hand || []).some(c => c.id === cardId)),
    cancelable: !key, onCancel: () => render(),
    onPick: t => { fx.sfx.flip && fx.sfx.flip(); cb(t); },
    fallback: () => listTarget(title, cb, key, minCards),
  });
}
function listTarget(title, cb, key = null, minCards = 0) {
  const others = view.players.filter(p => !p.out && p.id !== myId && (p.handCount >= minCards || view.players.filter(q => !q.out && q.id !== myId && q.handCount >= minCards).length === 0));
  openModal(`<h2>${title}</h2><div class="target-list">${others.map(p => `<button data-t="${p.id}">${avatar(p.name)}${esc(p.name)}<span class="n">${p.handCount} lá</span></button>`).join('')}</div>${key ? '' : '<div class="win"><div class="btns"><button class="btn" onclick="__closeModal()">Huỷ</button></div></div>'}`, '', key);
  $$('.target-list [data-t]').forEach(b => b.onclick = () => { closeModal(); cb(b.dataset.t); });
}

// ---------- vẽ bàn ----------
function render() {
  const v = view; if (!v) return;
  const meP = me();
  const mt = $('#mode-tag'), mIcon = v.mode === 'nomercy' ? '💀 ' : v.mode === 'house' ? '🔥 ' : '🎴 ';
  mt.innerHTML = v.match ? `${mIcon}<span class="mt-name">${MODES[v.mode].name} · </span>Ván ${v.match.round + (v.phase === 'playing' ? 1 : 0)}<span class="mt-t"> · 🎯${v.match.target}</span>` : mIcon + MODES[v.mode].name;
  mt.classList.toggle('btn-like', !!v.match); mt.onclick = v.match ? openScores : null; mt.title = v.match ? 'Xem bảng điểm' : '';
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
      <div class="nm">${esc(p.name.replace(' 🤖', ''))}${p.isBot ? ' <span class="bot">🤖</span>' : ''}</div><div class="fan">${fan || '<small>—</small>'}</div>${v.match ? `<span class="pts" title="Điểm">⭐${v.match.scores[p.id] || 0}</span>` : ''}</div>
      ${canCatch ? `<button class="btn red catchme" data-catch="${p.id}">🚨 Bắt lỗi!</button>` : ''}</div>`;
  }).join('');
  $$('[data-catch]').forEach(b => b.onclick = () => send({ type: 'catch', target: b.dataset.catch }));
  // giữa bàn
  $('#deck-cnt').textContent = v.deckCount + ' lá';
  const canDraw = isMyTurn() && !v.stack && !v.skipStack && !v.up && !v.mustPlay && !v.canPass;
  $('#deck').classList.toggle('can', canDraw || !!iOwe());
  $('#deck').onclick = () => { if (iOwe()) pull(); else if (canDraw) send({ type: 'draw' }); };
  if (!landing) renderDiscard(v.top);
  $('#color-dot').style.setProperty('--cc', COL_HEX[v.color] || '#ccc');
  $('#color-dot').title = 'Màu hiện tại: ' + COLOR_NAME[v.color];
  $('#dir').classList.toggle('ccw', v.dir < 0);
  $('#dir').style.color = (COL_HEX[v.color] || '#7a5cff') + '66';
  const sb = $('#stack-badge');
  sb.textContent = v.stack ? `+${v.stack.total} lá!` : v.skipStack ? '🤐 Khoá mõm' : v.up ? (v.up.first ? '⬆ UP: đánh lá số' : `⬆ UP ≥ ${v.up.n} · dồn ${v.up.count || 0}`) : '';
  if (v.owe) sb.textContent = v.owe.until ? `🌪️ Bốc tới ${COLOR_NAME[v.owe.until]}` : v.owe.kind === 'mystery' && !v.owe.got ? '❓ +? bốc thử 1 lá' : `🃏 Còn ${v.owe.left} lá`;
  sb.classList.toggle('show', !!(v.stack || v.skipStack || v.up || v.owe));
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
  $$('#hand .ucard').forEach(el => el.onclick = () => { if (Date.now() < noClickUntil) return; onCardClick(el.dataset.id); });
  renderActions(v, meP);
  requestAnimationFrame(() => drawChain(view));
  renderTicker(v);
  // nhật ký
  $('#log-list').innerHTML = v.log.map(l => `<li>${esc(l)}</li>`).join('');
  $('#log-list').scrollTop = 1e6;
  handlePending(v);
  checkNewTips(v, hand);
  reacts.setVisible(v.phase === 'playing' || v.phase === 'ended');
  // nhạc: đang chơi / gay cấn (có người còn ≤ 2 lá) / hết ván về nhạc sảnh
  fx.musicMood(v.phase === 'playing' ? (v.players.some(p => !p.out && p.handCount <= 2) ? 'tense' : 'game') : 'lobby');
  if (v.phase === 'ended') showWin(v);
  else if (modalKey === 'win') closeModal();
}
// dòng "vừa xảy ra" đặt vào khoảng trống giữa hàng đối thủ và giữa bàn (chỉ hiện khi đủ chỗ)
function renderTicker(v) {
  const tk = $('#ticker'), tb = $('#table').getBoundingClientRect(), cr = $('#center').getBoundingClientRect();
  let floor = tb.top;
  for (const el of $$('#opps .seat')) { const r = el.getBoundingClientRect(); if (r.right > cr.left - 10 && r.left < cr.right + 10 && r.bottom < cr.top + 20) floor = Math.max(floor, r.bottom); }
  const gap = cr.top - 26 - floor; // chừa chỗ cho vòng mũi tên chiều chơi
  const lines = v.log.slice(-3).filter(l => !/^Ván /.test(l) || v.log.length < 3).slice(gap >= 64 ? -2 : -1);
  if (gap < 30 || v.phase !== 'playing' || !lines.length) { tk.style.display = 'none'; return; }
  tk.style.display = ''; tk.style.top = (floor - tb.top + gap / 2) + 'px';
  const html = lines.map((l, i) => `<div class="${i === lines.length - 1 ? 'now' : ''}">${esc(l)}</div>`).join('');
  if (tk.dataset.n !== String(v.logN)) { tk.innerHTML = html; tk.dataset.n = v.logN; fx.pop(tk.lastElementChild, 'tk-in'); }
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
  if (v.owe) {
    const o = v.owe, col = o.until ? `<span class="cc" style="background:${COL_HEX[o.until]}"></span> <b>${COLOR_NAME[o.until]}</b>` : '';
    if (o.player === myId) { h.classList.add('mine'); h.innerHTML = o.until ? `🌪️ Tự bốc từng lá tới khi ra màu ${col} (hoặc lá Đổi màu)! Đã bốc <b>${o.got}</b>.` : o.kind === 'mystery' && !o.got ? '❓ Bốc 1 lá: ra số mấy thì bốc thêm bấy nhiêu, ra lá chức năng thì được tha!' : `😵 Tự bốc phạt đi! Còn <b>${o.left}</b> lá.`; }
    else h.innerHTML = `😈 <b>${esc(pname(o.player))}</b> đang bốc phạt… ${o.until ? `tìm màu ${col}, ` : `còn ${o.left} lá, `}đã bốc ${o.got}`;
    return;
  }
  if (v.pending) { h.innerHTML = v.pending.player === myId ? '👉 Bạn đang chọn…' : `⏳ ${esc(pname(v.pending.player))} đang ${({ swap: 'chọn người đổi bài', target: { steal: 'chọn người để móc túi', gift: 'chọn người nhận quà', wswap: 'chọn người đổi tay' }[v.pending.card] || 'chọn người bị nhắm +4', roulette: 'chọn màu cho Vòng quay' })[v.pending.type] || 'chọn màu'}…`; return; }
  const cur = v.players[v.turn];
  if (cur.id !== myId) { h.innerHTML = `Lượt của <b>${esc(cur.name)}</b> · màu ${dot}`; return; }
  h.classList.add('mine');
  if (v.stack) h.innerHTML = v.playable.length ? `🔥 Bị dồn <b>+${v.stack.total}</b>! Chồng ${v.rules.stackAny ? 'lá +2/+4 bất kỳ' : `lá rút ≥ +${v.stack.last}`}${v.rules.extras ? ', giơ <b>Khiên</b> để chuyền tiếp, hoặc <b>No U</b> để dội ngược' : ''}, hoặc chịu phạt.` : v.stackDrew === myId ? `😵 Bốc thử không trúng – bấm <b>Chịu phạt +${v.stack.total}</b>.` : `😵 Không có lá để chồng – <b>🎲 Bốc thử 1 lá</b> (trúng lá cộng / Khiên / No U là chồng tiếp được) hoặc <b>Chịu phạt +${v.stack.total}</b>.`;
  else if (v.skipStack) h.innerHTML = '🤐 Bạn bị khoá mõm! Đánh Khoá mõm để chuyền, hoặc chịu mất lượt.';
  else if (v.up) h.innerHTML = v.up.first ? '⬆️ Up! Đánh 1 lá số bất kỳ (màu nào cũng được), không có thì chịu rút 1.' : `⬆️ Up! Đánh lá số <b>≥ ${v.up.n}</b> (màu nào cũng được), không có thì rút <b>${Math.max(1, v.up.count || 0)}</b> lá (= số lá số đã đánh trong chuỗi).`;
  else if (v.mustPlay) h.innerHTML = '✨ Lá vừa rút đánh được – bấm vào nó để đánh' + (v.canPass ? ', hoặc Giữ lại.' : '!');
  else if (v.playable.length) h.innerHTML = `🎯 Lượt bạn! Đánh lá cùng màu ${dot}, cùng số/ký hiệu, hoặc lá Đổi màu.`;
  else if (v.rules.noActionFinish && meP.hand.length === 1 && meP.hand[0].type !== 'n') h.innerHTML = '🚫 Lá cuối không được là lá chức năng – bấm <b>Rút bài</b>.';
  else h.innerHTML = `🙈 Không có lá hợp màu ${dot} – bấm <b>Rút bài</b>.`;
}
function renderActions(v, meP) {
  const a = []; const my = isMyTurn();
  if (v.phase === 'playing' && meP && !meP.out) {
    if (iOwe()) { const wait = Date.now() < pullReadyAt; a.push(`<button class="btn red pull ${wait ? 'cd' : ''}" data-act="pull" ${wait ? 'disabled' : ''}>🃏 Bốc! ${v.owe.until ? `(tìm ${COLOR_NAME[v.owe.until]})` : v.owe.kind === 'mystery' && !v.owe.got ? '(xem số mấy ❓)' : `(còn ${v.owe.left})`}</button>`); }
    else if (my && v.stack) { if (v.stackDrew !== myId && v.deckCount > 0) a.push(`<button class="btn blue" data-act="stackdraw" title="Bốc 1 lá: trúng lá cộng, Khiên hoặc No U thì đánh chồng tiếp ngay (+? không tính)">🎲 Bốc thử</button>`); a.push(`<button class="btn red" data-act="take">😵 Chịu phạt +${v.stack.total}</button>`); }
    else if (my && v.skipStack) a.push(`<button class="btn red" data-act="take">🤐 Chịu khoá mõm</button>`);
    else if (my && v.up) a.push(`<button class="btn red" data-act="take">⬆️ Chịu rút ${Math.max(1, v.up.count || 0)}</button>`);
    else if (my && v.canPass) a.push(`<button class="btn" data-act="pass">✋ Giữ lại, qua lượt</button>`);
    else if (my && !v.mustPlay) a.push(`<button class="btn blue" data-act="draw">🂠 Rút bài</button>`);
    if (meP.handCount <= 2 && !meP.saidUno && (my || v.unoWatch === myId)) a.push(`<button class="btn uno" data-act="uno">UNO!</button>`);
  }
  $('#actions').innerHTML = a.join('');
  $$('#actions [data-act]').forEach(b => b.onclick = () => { if (b.dataset.act === 'pull') return pull(); if (b.dataset.act === 'uno') fx.sfx.uno(); send({ type: b.dataset.act }); });
}
function onCardClick(id) {
  const v = view; if (!isMyTurn()) { toast('Chưa tới lượt bạn 😤'); return; }
  const c = me().hand.find(x => x.id === id); if (!c) return;
  if (!v.playable.includes(id)) { fx.sfx.bad(); fx.shake($(`#hand [data-id="${id}"]`)); toast(v.rules.noActionFinish && (me().hand.length === 1 || (c.type === 'discall' && me().hand.every(x => x.color === c.color))) && c.type !== 'n' ? 'Không được về bằng lá chức năng – lá cuối phải là lá số!' : v.stack ? (v.rules.stackAny ? 'Đang bị dồn: chỉ chồng được lá +2/+4' : `Phải chồng lá rút ≥ +${v.stack.last}`) : v.mustPlay ? 'Chỉ được đánh lá vừa rút' : 'Lá này không hợp màu/số'); return; }
  if (c.type === 'wtd4') { pickColor('🎯 Cộng nhắm +4 – chọn màu tiếp theo', Object.assign(col => pickTarget('🎯 Nhắm ai rút 4 lá?', t => send({ type: 'play', cardId: id, color: col, target: t }), null, 0, 'wtd4', id), { cancel: true })); return; }
  if (c.type === 'wswap') { pickColor('🤝 Đổi tay – chọn màu tiếp theo', Object.assign(col => pickTarget('🤝 Đổi nguyên tay bài với ai?', t => send({ type: 'play', cardId: id, color: col, target: t }), null, 0, 'wswap', id), { cancel: true })); return; }
  if (c.type === 'steal') { pickTarget('🫳 Móc túi ai? (lấy ngẫu nhiên 1 lá)', t => send({ type: 'play', cardId: id, target: t }), null, 2, 'steal', id); return; }
  if (c.type === 'gift') { pickTarget('🎁 Tặng quà cho ai?', t => pickGift(id, gs => send({ type: 'play', cardId: id, target: t, give: gs })), null, 0, 'gift', id); return; }
  if (c.type === 'dq') { send({ type: 'play', cardId: id }); return; }
  if (c.color === 'W') { pickColor('Chọn màu tiếp theo', Object.assign(col => send({ type: 'play', cardId: id, color: col }), { cancel: true })); return; }
  send({ type: 'play', cardId: id });
}
// chọn tối đa 2 lá để "tặng" (phải giữ lại ít nhất 1 lá)
function pickGift(giftId, cb) {
  const rest = (me().hand || []).filter(x => x.id !== giftId), max = Math.min(2, rest.length - 1);
  if (max <= 0) { cb([]); return; }
  const sel = new Set();
  openModal(`<h2>🎁 Chọn ${max} lá để tặng</h2><div class="gift-pick">${rest.map(c => cardHTML(c)).join('')}</div><div class="win"><div class="btns"><button class="btn" onclick="__closeModal()">Huỷ</button><button class="btn pri" id="gift-ok" disabled>Tặng 🎁</button></div></div>`);
  $$('.gift-pick .ucard').forEach(el => el.onclick = () => {
    const k = el.dataset.id; if (sel.has(k)) sel.delete(k); else if (sel.size < max) sel.add(k);
    $$('.gift-pick .ucard').forEach(e => e.classList.toggle('sel', sel.has(e.dataset.id)));
    $('#gift-ok').disabled = sel.size !== max;
  });
  $('#gift-ok').onclick = () => { closeModal(); cb([...sel]); };
}
function handlePending(v) {
  const pr = v.pending;
  if (!pr || pr.player !== myId || v.phase !== 'playing') { if (modalKey && modalKey.startsWith('pend')) closeModal(); if (pickActive('pend-*')) endPick(); return; }
  const key = 'pend-' + pr.type + v.logN;
  if (modalKey && modalKey.startsWith('pend')) return;
  if (pickActive('pend-*')) return;
  if (pr.type === 'color') pickColor('Chọn màu tiếp theo', Object.assign(col => send({ type: 'color', color: col }), { key }));
  else if (pr.type === 'roulette') pickColor('🎡 Vòng quay màu! Chọn 1 màu – bạn sẽ lật bài tới khi ra màu đó', Object.assign(col => send({ type: 'color', color: col }), { key }));
  else if (pr.type === 'target') pickTarget({ steal: '🫳 Móc túi ai?', gift: '🎁 Tặng quà cho ai?', wswap: '🤝 Đổi tay với ai?' }[pr.card] || '🎯 Nhắm ai rút 4 lá?', t => send({ type: 'target', target: t }), key, pr.card === 'steal' ? 2 : 0, pr.card in TAP ? pr.card : 'wtd4');
  else if (pr.type === 'swap') pickTarget('🔄 Đổi bài với ai?', t => send({ type: 'swap', target: t }), key, 0, 'swap');
}
function showWin(v) {
  if (modalKey === 'win') return;
  const w = v.players.find(p => p.id === v.winner);
  const meWin = v.winner === myId;
  const rank = [...v.players].sort((a, b) => (a.out - b.out) || a.handCount - b.handCount);
  const m = v.match, champ = m && m.champion;
  setTimeout(() => {
    if (!view || view.phase !== 'ended') return;
    const wn = esc(w ? w.name.replace(' 🤖', '') : '?');
    const head = champ ? `<div class="big">🏆</div><h2>${champ === myId ? 'Bạn vô địch chung cuộc!' : wn + ' vô địch chung cuộc!'}</h2><p class="score-cap">Cán mốc ${m.target} điểm sau ${m.round} ván 🎆</p>`
      : `<div class="big">${meWin ? '🏆' : '🎉'}</div><h2>${meWin ? 'Bạn thắng rồi!' : wn + ' thắng!'}</h2>${m && m.last ? `<p class="score-cap">Ván ${m.round}: ${meWin ? 'bạn' : wn} được <b>+${m.last.gained}</b> điểm · mục tiêu ${m.target}</p>` : ''}`;
    const body = m ? scoreRows(m, v.players, true) : `<ol style="text-align:left;display:inline-block">${rank.map(p => `<li>${esc(p.name)} – ${p.out ? 'bị loại' : p.handCount + ' lá'}</li>`).join('')}</ol>`;
    const again = m ? (champ ? '🏆 Giải mới' : '▶ Ván tiếp') : '🔁 Ván mới';
    openModal(`<div class="win">${head}${body}
      <div class="btns">${isHost ? `<button class="btn pri" id="m-again">${again}</button><button class="btn" id="m-lobby">Về sảnh</button>` : `<p>Chờ chủ phòng mở ${m && !champ ? 'ván tiếp' : 'ván mới'}…</p>`}</div></div>`, '', 'win');
    if (champ) { fx.fireworks(9); fx.confetti(); }
    const ag = $('#m-again'); if (ag) ag.onclick = () => { closeModal(); net && net.restart(); net && net.start(); };
    const lb = $('#m-lobby'); if (lb) lb.onclick = () => { closeModal(); net && net.restart(); };
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
  const newFx = (b.fx || []).filter(e => e.id > (a.fxN || 0));
  const fxKinds = new Set(newFx.map(e => e.k));
  newFx.slice(-2).forEach((e, i) => setTimeout(() => showArc(e), (i * 350 + (e.k === 'catch' ? 100 : 260)) * fx.S()));
  // lá mới trên chồng bỏ
  if (b.top && a.top && b.top.id !== a.top.id) {
    const line = lines.find(l => / đánh /.test(l)); const who = line && findByLine(line);
    const from = who ? seatEl(who.id) : $('#deck');
    landing = true; renderDiscard(a.top);
    let rot = 0; for (const ch of b.top.id) rot = (rot * 17 + ch.charCodeAt(0)) % 360;
    fx.fly(cardHTML(b.top), from, $('#discard'), { duration: 420, rotate: (rot % 24) - 12, scale: 96 / 84, onEnd: () => {
      landing = false; if (!view) return; /* đã rời ván lúc lá bài còn đang bay */ renderDiscard(view.top); fx.pop($('#discard .ucard'));
      playSfx(b.top); fx.burst($('#discard'), b.top.color, b.top.type === 'n' ? 10 : 24);
      bannerFor(b.top, b, fxKinds);
    } });
  }
  // rút bài
  for (const p of b.players) {
    const q = a.players.find(x => x.id === p.id); if (!q) continue;
    const d = p.handCount - q.handCount;
    const swapped = lines.some(l => /đổi bài|chuyền bài/.test(l));
    if (d > 0 && !swapped) {
      const el = seatEl(p.id);
      // lá đến từ tay người khác (Móc túi / Tặng quà) thì bay từ ghế người đó, không phải từ chồng bài
      const src = newFx.find(e => (e.k === 'steal' && e.n && e.from === p.id) || (e.k === 'gift' && e.to === p.id));
      const fromEl = src ? seatEl(src.k === 'steal' ? src.to : src.from) : $('#deck');
      for (let i = 0; i < Math.min(d, 6); i++) fx.fly(cardHTML(null), fromEl, el, { delay: i * 90, duration: 380 });
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
    else if (/bắt lỗi/.test(l)) { fx.sfx.caught(); }
    else if (/bị loại/.test(l)) { fx.sfx.out(); fx.banner('💀 ' + (who ? who.name.replace(' 🤖', '') : '') + ' bị loại', 'R'); }
    else if (/đổi bài|chuyền bài/.test(l)) { fx.sfx.swap(); fx.banner('🔄 Đổi bài!', 'B'); }
    else if (/ chọn màu /.test(l) || /chọn [^,]+, lật/.test(l)) { const c = Object.keys(COLOR_NAME).find(k => l.includes(COLOR_NAME[k] + '.') || l.includes(COLOR_NAME[k] + ',')); if (c) { setTimeout(() => { fx.ring($('#color-dot'), c); fx.pop($('#color-dot')); }, 450 * fx.S()); } if (/lật/.test(l)) fx.sfx.roulette(); }
    else if (/chịu phạt/.test(l) && who) { fx.shake(seatEl(who.id)); }
    else if (/bị khoá mõm\./.test(l) && who) { fx.sfx.skip(); fx.floatText(seatEl(who.id), '🤐'); }
  }
  // tới lượt mình
  if (isMyTurn() && !(a.phase === 'playing' && a.players[a.turn].id === myId && !a.pending)) setTimeout(() => fx.sfx.turn(), 380 * fx.S());
  if (b.phase === 'ended' && a.phase !== 'ended') setTimeout(() => { if (b.winner === myId) { fx.confetti(); fx.sfx.win(); fx.musicStinger('win'); } else { fx.sfx.lose(); fx.confetti(); fx.musicStinger('lose'); } }, 600 * fx.S());
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
  else if (t === 'tornado') { fx.sfx.roulette(); fx.sfx.discall(); }
  else if (t === 'wup') fx.sfx.uno();
  else if (t === 'wtd4') { fx.sfx.wild(); fx.sfx.plus(4); }
  else if (t === 'shield') fx.sfx.wild();
  else if (t === 'dq') fx.sfx.roulette();
  else if (t === 'nou') { fx.sfx.rev(); if (view && view.stack) fx.sfx.plus(4); }
  else if (t === 'gift' || t === 'steal' || t === 'wswap') fx.sfx.discall();
  else if (DRAW_VALUE[t]) { fx.sfx.plus(DRAW_VALUE[t]); if (t === 'wrd4') fx.sfx.rev(); }
}
// lá đã có mũi tên "ai chơi ai" thì không cần banner to giữa màn hình nữa
const ARC_OF = { wtd4: 'aim', steal: 'steal', gift: 'gift', wswap: 'wswap', nou: 'nou', shield: 'shield', tornado: 'tornado', dq: 'dq' };
function bannerFor(c, v, kinds = new Set()) {
  const t = c.type, col = c.color === 'W' ? (v.color || '') : c.color;
  if (ARC_OF[t] && kinds.has(ARC_OF[t])) { if (v.stack && v.stack.total >= 8) fx.shake($('#table')); return; }
  if (DRAW_VALUE[t]) fx.banner(v.stack ? `+${v.stack.total}!` : `+${DRAW_VALUE[t]}!`, col);
  else if (t === 'skip') fx.banner('🤐 Khoá mõm!', col);
  else if (t === 'skipall') fx.banner('🤐 Khoá mõm cả bàn!', col);
  else if (t === 'rev') fx.banner('⇄ Đảo chiều!', col);
  else if (t === 'discall') fx.banner('🗑️ Xả màu!', col);
  else if (t === 'roulette') fx.banner('🎡 Quay màu!', '');
  else if (t === 'wild') fx.banner('🌈 Đổi màu!', '');
  else if (t === 'tornado') fx.banner('🌪️ Bão tố!', col);
  else if (t === 'wup') fx.banner('⬆️ UP!', '');
  else if (t === 'wtd4') fx.banner('🎯 Cộng nhắm +4!', '');
  else if (t === 'nou') fx.banner(v.stack ? `🔄 NO U! +${v.stack.total}` : '🔄 No U!', col);
  else if (t === 'dq') fx.banner('❓ +?!', col);
  else if (t === 'shield') fx.banner(v.stack ? `🛡️ Khiên! +${v.stack.total} chuyền đi` : '🛡️ Khiên!', '');
  else if (t === 'gift') fx.banner('🎁 Tặng quà!', col);
  else if (t === 'steal') fx.banner('🫳 Móc túi!', col);
  else if (t === 'wswap') fx.banner('🤝 Đổi tay!', '');
  if (t === 'wd10' || t === 'wd6' || (v.stack && v.stack.total >= 8)) fx.shake($('#table'));
}
function dealAnim(v) {
  const n = v.players.length; let k = 0;
  for (let r = 0; r < 3; r++) for (const p of v.players) { if (p.out) continue; fx.fly(cardHTML(null), $('#deck'), seatEl(p.id), { delay: (k++) * 45, duration: 360 }); }
  setTimeout(() => fx.sfx.flip(), 50);
  setTimeout(() => { fx.banner('Bắt đầu! 🎉', ''); fx.sfx.turn(); }, (k * 45 + 400) * fx.S());
  void n;
}
// ---------- thả emoji / chọc nhau (shared/ui/react.js) ----------
const reacts = createReactions({
  send: e => { if (!net) return; if (isHost) net.react('host', e); else net.react(e); },
  seatEl: id => id === myId ? $('#actions') : $(`.seat[data-pid="${id}"] .plate`),
  myId: () => myId,
  nameOf: id => { const p = view && view.players.find(x => x.id === id); return p ? p.name.replace(' 🤖', '') : ''; },
  mount: $('#me'), place: 'right:8px;top:5px',
  phrases: UNO_PHRASES,
  onShow: () => fx.pip(),
});
reacts.setVisible(false);

// ---------- "ai chơi ai": mũi tên cong giữa 2 ghế + bong bóng chữ ----------
const ARC = {
  aim: ['🎯', '#ff2d87', (A, B, n) => `🎯 ${A} nhắm ${B} +${n}`],
  steal: ['🫳', '#7a5cff', (A, B, n) => n ? `😈 ${A} móc túi ${B}` : `🫳 ${A} móc túi ${B}… rỗng!`],
  gift: ['🎁', '#2fc76f', (A, B, n) => `🎁 ${A} tặng ${B} ${n} lá`],
  wswap: ['🤝', '#3d8bff', (A, B) => `🤝 ${A} đổi tay với ${B}`, true],
  swap7: ['🔄', '#3d8bff', (A, B) => `🔄 ${A} đổi bài với ${B}`, true],
  nou: ['↩️', '#ff4d5e', (A, B, n) => `🔄 NO U! ${A} dội +${n} về ${B}`],
  shield: ['🛡️', '#20a8a0', (A, B, n) => `🛡️ ${A} chuyền +${n} cho ${B}`],
  tornado: ['🌪️', '#ff8a3d', (A, B) => `🌪️ ${A} thổi Bão tố vào ${B}`],
  dq: ['❓', '#7a5cff', (A, B) => `❓ ${A} cho ${B} ăn +?`],
  plus: [null, '#ff4d5e', (A, B, n) => `😵 ${A} dồn +${n} cho ${B}`],
  skip: ['🤐', '#5b6b8a', (A, B) => `🤐 ${A} khoá mõm ${B}`],
  catch: ['🚨', '#ff4d5e', (A, B) => `🚨 ${A} bắt lỗi ${B}: +2`],
  roulette: ['🎡', '#7a5cff', (A, B) => `🎡 ${A} bắt ${B} quay màu`],
};
// Chuỗi cộng dồn: giữ mũi tên "ai dồn cho ai" trên màn hình tới khi có người chịu phạt
function drawChain(v) {
  let svg = document.getElementById('chain-layer');
  const ch = v && v.phase === 'playing' && v.stack && v.stack.chain;
  if (!ch || !ch.length) { if (svg) svg.innerHTML = ''; return; }
  if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'chain-layer'; document.body.appendChild(svg); }
  svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
  const rec = ch.slice(-6), icon = { plus: '➕', aim: '🎯', nou: '🔄', shield: '🛡️' };
  svg.innerHTML = '<defs><marker id="chain-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ff2d55"/></marker></defs>' + rec.map((e, i) => {
    const a = arcPoint(e.from), b = arcPoint(e.to); if (!a || !b) return '';
    const last = i === rec.length - 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - Math.min(90, Math.hypot(b.x - a.x, b.y - a.y) * .28) - i * 6;
    const lx = (a.x + 2 * mx + b.x) / 4, ly = (a.y + 2 * my + b.y) / 4;
    return `<g opacity="${last ? 1 : .45 + i * .08}"><path d="M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}" fill="none" stroke="#ff2d55" stroke-width="${last ? 4 : 2.5}" stroke-dasharray="${last ? '0' : '7 6'}" stroke-linecap="round" marker-end="url(#chain-ah)"${last ? ' class="chain-live"' : ''}/><g transform="translate(${lx} ${ly})"><circle r="15" fill="#fff" stroke="#ff2d55" stroke-width="2.5"/><text text-anchor="middle" dy="5" font-size="13" font-weight="800" fill="#ff2d55" font-family="Baloo 2,sans-serif">${e.k === 'plus' ? '+' + e.n : icon[e.k]}</text></g></g>`;
  }).join('');
}
addEventListener('resize', () => requestAnimationFrame(() => drawChain(view)));
function arcPoint(id) {
  if (id === myId) { const r = $('#hand').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top - 6 }; }
  const el = $(`.seat[data-pid="${id}"] .plate`); if (!el) return null;
  const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
function showArc(e) {
  const d = ARC[e.k]; if (!d || !view) return;
  const nm = (id, subj) => id === myId ? (subj ? 'Bạn' : 'bạn') : ((view.players.find(p => p.id === id) || {}).name || '?').replace(' 🤖', '');
  const a = arcPoint(e.from), b = arcPoint(e.to); if (!a || !b) return;
  const maxY = $('#hand').getBoundingClientRect().top - 4; // bong bóng không bao giờ che bài trên tay
  fx.arc(a, b, { icon: d[0] || `<b>+${e.n}</b>`, color: d[1], text: d[2](nm(e.from, true), nm(e.to), e.n), both: !!d[3], maxY, avoid: $('#center').getBoundingClientRect(), delayText: ['plus', 'skip'].includes(e.k) ? 900 : 0 });
}

// ---------- "Lá này làm gì?": gợi ý lần đầu gặp lá mở rộng + bấm giữ lá để xem mô tả ----------
const TIP_SEEN = 'uno-tips-seen', TIP_OFF = 'uno-tips-off';
let tipSeen = (() => { try { return new Set(JSON.parse(ls.get(TIP_SEEN) || '[]')); } catch (e) { return new Set(); } })();
const tipsOff = () => ls.get(TIP_OFF) === '1';
const tipQ = []; let tipT = null, tipCur = null;
function checkNewTips(v, hand) {
  if (tipsOff() || v.phase !== 'playing') return;
  const seen = [...hand, v.top].filter(Boolean);
  for (const c of seen) if (NEW_TYPES.includes(c.type) && !tipSeen.has(c.type) && !tipQ.some(x => x.type === c.type) && !(tipCur && tipCur.card.type === c.type)) tipQ.push({ type: c.type, card: c });
  if (!tipCur) nextTip();
}
function nextTip() {
  const it = tipQ.shift(); if (!it) return;
  tipSeen.add(it.type); ls.set(TIP_SEEN, JSON.stringify([...tipSeen]));
  showTip(it.card, true);
}
function showTip(c, auto = false) {
  if (!c) return;
  clearTimeout(tipT); tipCur = { card: c, auto };
  const el = $('#tip');
  const nm = c.type === 'n' ? cardText(c) : (c.color === 'W' ? CARD_NAME[c.type] : `${CARD_NAME[c.type]} ${COLOR_NAME[c.color]}`);
  el.innerHTML = `<div class="tip-card">${cardHTML(c)}</div><div class="tip-body"><small>${auto ? '💡 Lá mới – lá này làm gì?' : '📖 Lá này làm gì?'}</small><b>${esc(nm)}</b><p>${CARD_HELP[c.type] || ''}</p>
    <div class="tip-btns"><button class="chip sm on" data-tip="ok">${auto ? 'Hiểu rồi 👌' : 'Đóng'}</button>${auto ? '<button class="chip sm" data-tip="off">Tắt gợi ý</button>' : '<small class="tip-note">Mẹo: bấm giữ lá bất kỳ để xem</small>'}</div></div>`;
  const meTop = $('#me').getBoundingClientRect().top;
  el.style.bottom = Math.max(8, innerHeight - meTop + 6) + 'px';
  el.classList.add('show');
  el.querySelector('[data-tip="ok"]').onclick = hideTip;
  const off = el.querySelector('[data-tip="off"]'); if (off) off.onclick = () => { ls.set(TIP_OFF, '1'); tipQ.length = 0; hideTip(); toast('Đã tắt gợi ý lá mới. Bấm giữ lá vẫn xem được mô tả.'); };
  tipT = setTimeout(hideTip, auto ? 9000 : 6000);
}
function hideTip() { clearTimeout(tipT); $('#tip').classList.remove('show'); tipCur = null; setTimeout(() => { if (!tipCur) nextTip(); }, 500); }
// bấm giữ lá trên tay (điện thoại) hoặc chuột phải (máy tính) để xem mô tả
let noClickUntil = 0, lpT = null, lpStart = null;
const cardOf = id => (me() && me().hand || []).find(c => c.id === id);
$('#hand').addEventListener('pointerdown', e => {
  const el = e.target.closest('.ucard'); if (!el) return;
  lpStart = { x: e.clientX, y: e.clientY }; clearTimeout(lpT);
  const id = el.dataset.id;
  lpT = setTimeout(() => { lpT = null; noClickUntil = Date.now() + 600; showTip(cardOf(id)); navigator.vibrate && navigator.vibrate(15); }, 480);
});
const lpCancel = () => { clearTimeout(lpT); lpT = null; };
addEventListener('pointerup', lpCancel); addEventListener('pointercancel', lpCancel);
addEventListener('pointermove', e => { if (lpT && lpStart && Math.hypot(e.clientX - lpStart.x, e.clientY - lpStart.y) > 10) lpCancel(); });
$('#hand').addEventListener('contextmenu', e => { const el = e.target.closest('.ucard'); if (!el) return; e.preventDefault(); lpCancel(); showTip(cardOf(el.dataset.id)); });
// bấm vào lá trên chồng bỏ cũng xem được mô tả
$('#discard').addEventListener('click', () => { if (view && view.top) showTip(view.top); });

// ---------- đồng hồ chống treo máy: còn ≤ 15 giây thì nhắc ----------
let afkEnd = 0, afkPid = null, afkBeep = 0;
setInterval(() => {
  const el = $('#afk'); if (!el) return;
  const left = afkEnd ? Math.max(0, Math.ceil((afkEnd - Date.now()) / 1000)) : 0;
  const on = !!(afkEnd && afkPid === myId && view && view.phase === 'playing' && left <= 15);
  el.style.display = on ? '' : 'none';
  if (on) { el.textContent = `⏳ ${left}s`; if (left <= 5 && left !== afkBeep) { afkBeep = left; fx.sfx.tick(); } }
}, 250);
if (location.hash === '#debug') window.__dbg = () => ({ net, view });

// ---------- Tải lại trang: tự khôi phục phòng / tự vào lại ----------
(function resume() {
  const snap = loadSnapshot(), ses = session.load('uno');
  const lk = linkCode(); // mở link mời phòng khác → vào thẳng phòng đó; link của chính phòng mình → vào lại như thường
  if (lk && !(ses && ses.code === lk)) { linkJoin(lk); return; }
  if (lk) clearLinkCode();
  if (snap && ses && ses.role === 'host') {
    fx.musicResumeIfOn();
    net = new Host((snap.players.find(p => p.id === 'host') || {}).name || myName(), handlers, !!snap.offline, snap); isHost = true; myId = 'host';
    $('#code-box').style.display = snap.offline ? 'none' : '';
    show('screen-lobby'); netStatus('Đã khôi phục phòng ' + snap.code, 'ok'); return;
  }
  if (ses && ses.role === 'client' && ses.code) {
    net = new Client(ses.code, ses.name || myName(), handlers); isHost = false; $('#code-box').style.display = '';
  }
})();
