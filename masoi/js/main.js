import { Host, Client, MAX, MIN, loadSnapshot, session, MS_PHRASES, REACT_PHASES } from './net.js?v=17';
import { linkCode, clearLinkCode, inviteUrl, joinByLink } from '../../shared/net/joinlink.js?v=2';
import { createReactions } from '../../shared/ui/react.js?v=2';
import { netStatus } from '../../shared/ui/status.js';
import { ROLES, ROLE_ORDER, STEP_TEXT, TEAM_NAME, roleList, presetRoles, suggestRoles, HUNTER_PIN, isWolfRole, DEFAULT_OPTS } from './engine.js?v=4';
import { openReplay, replayFollowUpdate } from './replay.js?v=5';
import { coachCheck, coachHide, coachTipEnd } from './coach.js?v=5';
import { roleCardSVG, cardBackSVG, roleChip, roleDot, bambooSVG, dinhSVG, hillsSVG, starsHTML, firefliesHTML, heroSVG } from './art.js?v=4';
import * as fx from './fx.js?v=4';
import { openGuide } from './guide.js?v=6';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=124';
import { syncPick, endPick, pickActive } from '../../shared/ui/seatpick.js?v=1';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const GAME = 'masoi';

let net = null, isHost = false, myId = null, lobby = null, view = null;
let lastEv = 0, curPk = -1, sel = [], witch = { save: null, poison: null, mode: null }, clockEnd = 0, clockTotal = 1;
let tab = 'all', seenChat = {}, lastChatN = 0, dockBig = false, theme = 'night', fresh = true, endShown = false, clockPaused = 0, thiefPk = -1, revealPending = false;

// ---------- cảnh ----------
$('#hills').innerHTML = hillsSVG();
$('#dinh').innerHTML = dinhSVG();
$('#bamboo-l').innerHTML = bambooSVG(11, false);
$('#bamboo-r').innerHTML = bambooSVG(23, true);
$('#stars').innerHTML = starsHTML(70);
$('#fireflies').innerHTML = firefliesHTML(16);
$('#hero').innerHTML = heroSVG();
$('#fire').innerHTML = `<svg viewBox="0 0 120 120"><defs><radialGradient id="fg"><stop offset="0" stop-color="#ffcf6a" stop-opacity=".75"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient></defs>
  <circle class="glow" cx="60" cy="78" r="58" fill="url(#fg)"/>
  <path d="M22 100l76-14M24 86l74 16" stroke="#5c3720" stroke-width="9" stroke-linecap="round"/>
  <path class="fl" d="M60 96C34 92 36 64 50 50C50 64 58 62 56 48C64 30 60 18 60 18C76 34 88 56 80 78C78 90 70 96 60 96Z" fill="#ff6b2b"/>
  <path class="fl fl2" d="M60 96C46 94 44 76 54 66C54 76 60 74 60 64C70 72 76 84 70 92C66 96 63 96 60 96Z" fill="#ffb347"/>
  <path class="fl fl3" d="M60 96C54 95 52 86 58 80C60 86 64 84 64 80C68 86 66 95 60 96Z" fill="#fff1a8"/></svg>`;

// ---------- tiện ích ----------
const AV_COL = ['#e0644f', '#d94d8f', '#c9921e', '#2f9e61', '#14a3a3', '#3a76d6', '#7e5cd6', '#b84dd1', '#a0693a', '#5b6b8a', '#c75b3a', '#3f8f4f'];
const avColor = name => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AV_COL[h % AV_COL.length]; };
const clean = n => String(n).replace(' 🤖', '').trim();
const avatar = (name, isBot) => `<div class="av" style="--c:${avColor(clean(name))}"><b>${esc([...clean(name)][0] || '?').toUpperCase()}</b>${isBot ? '<span class="bot">🤖</span>' : ''}</div>`;
const pl = id => view && view.players.find(p => p.id === id);
const pname = id => { const p = pl(id); return p ? clean(p.name) : '?'; };
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); if (id !== 'screen-game') endPick(); }
let toastT;
function toast(m, ms = 2800) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
let modalKey = null;
function openModal(html, cls = '', key = null) { $('#modal-box').className = 'modal-box ' + cls; $('#modal-box').innerHTML = html; $('#modal').classList.add('show'); modalKey = key; }
function closeModal() { $('#modal').classList.remove('show'); const k = modalKey; modalKey = null; if (k === 'reveal' && view) setTimeout(() => coachCheck(ctx()), 200); }
// cầu nối cho replay.js / coach.js (tránh vòng import)
const CTX = { get view() { return view; }, get net() { return net; }, get isHost() { return isHost; }, get myId() { return myId; }, get revealPending() { return revealPending; }, openModal, closeModal: (...a) => closeModal(...a), modalKey: () => modalKey, revealModal: () => revealModal(), render: () => render(), esc, clean, pl: id => pl(id), pname: id => pname(id) };
const ctx = () => CTX;
window.__closeModal = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && modalKey !== 'reveal') closeModal(); });
const send = a => { if (!net) return; if (isHost) net.act('host', a); else net.act(a); };
const me = () => view && view.me;
const amAlive = () => me() && me().alive;
const amWolf = () => me() && isWolfRole(me().role);

// ---------- chủ đề ngày/đêm ----------
function setTheme(t) {
  theme = t;
  document.body.classList.remove('th-night', 'th-day', 'th-dusk', 'th-dawn', 'th-blood');
  document.body.classList.add('th-' + t);
  document.querySelector('meta[name=theme-color]').content = { night: '#0b1030', day: '#5fb6f0', dusk: '#7a3b7a', dawn: '#c99ac2', blood: '#3a0818' }[t];
}
function phaseTheme(v) {
  if (!v) return 'night';
  if (v.phase === 'ended') return v.winner && v.winner.team === 'wolf' ? 'blood' : 'day';
  return { night: 'night', dawn: 'dawn', day: 'day', vote: 'dusk', last: 'dusk', hunter: theme === 'night' ? 'dawn' : theme }[v.phase] || 'night';
}
function moodFor(v) {
  if (!v) { fx.music('lobby'); fx.ambient('night'); fx.setTension(0); return; }
  const m = { night: 'night', dawn: 'day', day: 'day', vote: 'vote', last: 'vote', hunter: 'vote', ended: v.winner && v.winner.team === 'wolf' ? 'night' : 'day' }[v.phase];
  fx.music(m); fx.ambient(v.phase === 'night' || (v.phase === 'ended' && m === 'night') ? 'night' : 'day');
  fx.setTension(v.phase === 'night' && (v.step === 'wolves' || v.step === 'wolves2') ? 0.8 : 0);
}

// ---------- trang chủ ----------
$('#name').value = ls.get('bgvn-name') || '';
function myName() { const n = $('#name').value.trim() || 'Bạn'; ls.set('bgvn-name', n); return n; }
const handlers = {
  onLobby(info, code, started) { lobby = info; if (!started) reacts.setVisible(false); $('#room-code').textContent = code; if (!started) { view = null; fresh = true; curPk = -1; renderLobby(); if (!$('#screen-lobby').classList.contains('active')) { if (modalKey !== 'end') closeModal(); show('screen-lobby'); setBody(null); } } },
  onState(v) { onState(v); },
  onReact(msg) { reacts.show(msg); },
  onError(m) { toast(m); fx.sfx.bad(); },
  onJoined(id) { myId = id; },
  onDisconnect() {},
  onNet(t, k, retry) { netStatus(t, k, retry); },
};
function startHost(offline) {
  fx.actx(); fx.musicResumeIfOn();
  if (net && net.leave) net.leave();
  net = new Host(myName(), handlers, offline); isHost = true; myId = 'host';
  if (offline) { session.save(GAME, { role: 'host', code: 'OFFLINE' }); net.addBot(7); }
  $('#code-box').style.display = offline ? 'none' : '';
  show('screen-lobby');
}
$('#btn-offline').onclick = () => startHost(true);
$('#btn-tutorial').onclick = () => { startHost(true); net.startTutorial(); };
$('#btn-create').onclick = () => startHost(false);
$('#btn-join').onclick = () => {
  const code = $('#join-code').value.trim(); if (code.length < 5) { toast('Nhập mã phòng 5 ký tự nhé.'); return; }
  fx.actx(); fx.musicResumeIfOn();
  if (net && net.leave) net.leave();
  net = new Client(code, myName(), handlers); isHost = false; $('#code-box').style.display = '';
};
$('#join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-join').click(); });
$('#join-code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });
// link mời ?room=MÃ (shared/net/joinlink.js): mở link là vào thẳng phòng
const qcode = linkCode(); if (qcode) $('#join-code').value = qcode;
function linkJoin(code) { $('#join-code').value = code; joinByLink({ code, toast: m => toast(m), join: n => { $('#name').value = n; $('#btn-join').click(); }, abort: () => leave() }); }
function leave() { if (net) (net.leave ? net.leave() : net.destroy()); net = null; view = null; lobby = null; closeModal(); coachHide(); reacts.setVisible(false); show('screen-home'); setBody(null); setTheme('night'); moodFor(null); }
$('#btn-leave-lobby').onclick = leave;
$('#btn-leave').onclick = () => openModal(`<h2>Rời làng?</h2><p class="ctr">${isHost ? 'Bạn là chủ phòng – rời đi sẽ kết thúc ván cho mọi người.' : 'Bạn có thể vào lại bằng mã phòng (máy làm giùm lúc bạn vắng).'}</p><div class="btns"><button class="btn" onclick="__closeModal()">Ở lại</button><button class="btn red" id="m-leave">Rời ván</button></div>`);
document.addEventListener('click', e => { if (e.target.id === 'm-leave') leave(); });
$('#btn-copy').onclick = () => { const url = inviteUrl($('#room-code').textContent); navigator.clipboard?.writeText(url).then(() => toast('Đã chép link mời 📋'), () => toast(url)); };

// ---------- sảnh ----------
const OPT_SEL = {
  voteMode: ['🗳️ Kiểu bỏ phiếu', 'Công khai: thấy ai bầu ai.', [['open', 'Công khai'], ['secret', 'Ẩn']]],
  tie: ['⚖️ Khi hoà phiếu', '', [['revote', 'Bầu lại 1 lần'], ['none', 'Không treo ai']]],
  doubleSave: ['🛡️🧪 Bảo Vệ + Phù Thủy cùng cứu', 'Luật “sữa đổ”: cứu 2 lần là chết.', [['live', 'Sống'], ['die', 'Chết (sữa đổ)']]],
  dayTime: ['☀️ Thời gian thảo luận', 'Ai cũng sẵn sàng thì vào bầu sớm.', [60, 90, 120, 180, 240, 300].map(n => [n, n < 120 ? n + ' giây' : n / 60 + ' phút'])],
  voteTime: ['⏳ Thời gian bỏ phiếu', '', [20, 30, 40, 60, 90].map(n => [n, n + ' giây'])],
  nightTime: ['🌙 Thời gian mỗi vai ban đêm', 'Sói được gấp rưỡi.', [15, 20, 25, 30, 45].map(n => [n, n + ' giây'])],
  hunter: ['🏹 Thợ Săn', 'Ghim mù: mỗi đêm ghim trước 1 người, chỉ kéo theo khi chết ngay trong đêm đó.', [['shot', 'Chết thì bắn 1 người'], ['pin', 'Ghim mù mỗi đêm']]],
  wolfTie: ['🐺 Sói chọn không thống nhất', '', [['first', 'Cắn người được chọn trước'], ['none', 'Không ai bị cắn']]],
};
// luật bật/tắt (theo góp ý "chơi như có quản trò thật")
const OPT_CHK = {
  fixedNight: ['⏱️ Đêm kín giờ', 'Mỗi vai luôn chạy đủ giờ, kể cả vai đã chết – không ai đoán được vai nào còn sống. Đêm sẽ dài hơn.'],
  secretDeath: ['🤫 Chết kín', 'Sáng ra chỉ báo ai chết, không lộ vì Sói, thuốc độc, tình yêu hay bị ghim.'],
  witchBlind: ['🌫️ Phù Thủy mù', 'Dùng bình cứu rồi thì các đêm sau không còn biết Sói cắn ai.'],
  afkAuto: ['🎲 Hết giờ máy chọn giúp', 'Vai chưa kịp chọn sẽ được chọn ngẫu nhiên (trừ Phù Thủy) và báo riêng cho người đó.'],
  wolfSelf: ['🐺 Sói được cắn Sói', 'Cho mấy pha "tự cắn" để lừa cả làng.'],
};
const STYLE_GM = { hunter: 'pin', wolfTie: 'none', fixedNight: true, secretDeath: true, witchBlind: true, afkAuto: true, wolfSelf: true };
const STYLE_FUN = Object.fromEntries(Object.keys(STYLE_GM).map(k => [k, DEFAULT_OPTS[k]]));
const sameRoles = (a, b) => ROLE_ORDER.every(r => r === 'villager' || (+a[r] || 0) === (+b[r] || 0));
function renderLobby() {
  if (!lobby) return;
  const ps = lobby.players, o = lobby.opts, n = ps.length, dis = isHost ? '' : 'disabled';
  $('#pcount').textContent = `${n}/${MAX}`;
  $('#plist').innerHTML = ps.map(p => `<li class="${p.id === myId ? 'me' : ''}">${avatar(p.name, p.isBot)}<span class="pn">${esc(clean(p.name))}</span>${p.id === myId || p.id === 'host' || !p.connected ? `<span class="tg">${p.id === myId ? '<small>(bạn)</small>' : ''}${p.id === 'host' ? '👑' : ''}${!p.connected ? '📴' : ''}</span>` : ''}${isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</li>`).join('');
  $$('#plist [data-rm]').forEach(b => b.onclick = () => net.removePlayer(b.dataset.rm));
  $('#btn-addbot').style.display = isHost && n < MAX ? '' : 'none';
  $('#btn-fill').style.display = isHost && n < 8 ? '' : 'none';
  $('#btn-fill').textContent = `🤖 Thêm ${8 - n} bot cho đủ 8`;
  $('#opt-auto').checked = !!o.auto; $('#opt-auto').disabled = !isHost;
  const rl = roleList(n, o.roles);
  const specials = ROLE_ORDER.filter(r => r !== 'villager').reduce((t, r) => t + (+o.roles[r] || 0), 0);
  $('#roles').innerHTML = ROLE_ORDER.map(r => {
    const c = r === 'villager' ? Math.max(0, n - specials) : (+o.roles[r] || 0);
    return `<div class="rrow ${c ? '' : 'off'} ${r === 'villager' ? 'vill' : ''}" style="--c:${ROLES[r].color}"><span class="re">${ROLES[r].emoji}</span><span class="rn">${ROLES[r].name}<small>${r === 'villager' ? 'Tự lấp chỗ trống' : esc(ROLES[r].short)}</small></span>
      <button data-rd="${r}" ${dis} aria-label="Bớt ${ROLES[r].name}">−</button><b class="cnt">${c}</b><button data-ri="${r}" ${dis} aria-label="Thêm ${ROLES[r].name}">+</button></div>`;
  }).join('');
  $$('#roles [data-rd]').forEach(b => b.onclick = () => { fx.sfx.click(); net.setRole(b.dataset.rd, (+lobby.opts.roles[b.dataset.rd] || 0) - 1); });
  $$('#roles [data-ri]').forEach(b => b.onclick = () => { fx.sfx.click(); net.setRole(b.dataset.ri, (+lobby.opts.roles[b.dataset.ri] || 0) + 1); });
  const wolves = rl.list.filter(isWolfRole).length;
  $('#role-sum').textContent = rl.ok ? `🐺 ${wolves} Sói · 🧑‍🌾 ${n - wolves} người khác${rl.extra ? ' · 🃏 +2 lá thừa' : ''}` : '';
  // gợi ý bộ vai theo số người
  const sg = $('#suggest');
  if (sg) {
    const list = suggestRoles(n).filter(g => roleList(n, g.roles).ok);
    sg.innerHTML = n < 5 ? '' : `<b class="sg-t">💡 Gợi ý cho ${n} người</b><div class="sg-list">${list.map(g => `<button type="button" data-sg="${g.id}" aria-pressed="${sameRoles(g.roles, o.roles)}" ${dis}><b>${g.emoji} ${g.name}</b><small>${g.desc}</small><i>${presetSummary(g.roles)}</i></button>`).join('')}</div>`;
    $$('#suggest [data-sg]').forEach(b => b.onclick = () => { const g = suggestRoles(lobby.players.length).find(x => x.id === b.dataset.sg); if (!g) return; fx.sfx.ok(); if (g.id === 'std') net.setOpt('auto', true); else net.applyPreset(g.roles); toast(`${g.emoji} Đã chọn bộ “${g.name}”`); });
  }
  renderPresets();
  $('#role-err').textContent = rl.ok ? '' : '⚠️ ' + rl.reason;
  $('#opts').innerHTML = `<label class="opt"><input type="checkbox" data-opt="reveal" ${o.reveal ? 'checked' : ''} ${dis}><span><b>🪦 Lộ vai khi chết</b><small>Tắt: chỉ biết ai chết, không biết là ai.</small></span></label>` +
    Object.entries(OPT_SEL).map(([k, [t, sub, list]]) => `<label class="opt"><span><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</span><select data-opt="${k}" ${dis}>${list.map(([v, l]) => `<option value="${v}" ${String(o[k]) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`).join('');
  const gm = Object.entries(STYLE_GM).every(([k, v]) => o[k] === v), fun = Object.entries(STYLE_FUN).every(([k, v]) => o[k] === v);
  $('#opts').innerHTML = `<div class="opt style"><span><b>🎩 Kiểu chơi</b><small>Quản trò: Thợ Săn ghim mù, Sói hoà phiếu thì nhịn, đêm kín giờ, chết kín, Phù Thủy mù, hết giờ máy chọn giúp.</small></span><div class="seg2"><button type="button" data-style="fun" aria-pressed="${fun}" ${dis}>🎲 Vui vẻ</button><button type="button" data-style="gm" aria-pressed="${gm}" ${dis}>🎩 Quản trò</button></div></div>` + $('#opts').innerHTML +
    Object.entries(OPT_CHK).map(([k, [t, sub]]) => `<label class="opt"><input type="checkbox" data-opt="${k}" ${o[k] ? 'checked' : ''} ${dis}><span><b>${t}</b><small>${sub}</small></span></label>`).join('');
  $$('#opts [data-opt]').forEach(i => i.onchange = () => net.setOpt(i.dataset.opt, i.type === 'checkbox' ? i.checked : i.value));
  $$('#opts [data-style]').forEach(b => b.onclick = () => { fx.sfx.click(); for (const [k, v] of Object.entries(b.dataset.style === 'gm' ? STYLE_GM : STYLE_FUN)) net.setOpt(k, v); toast(b.dataset.style === 'gm' ? '🎩 Đã bật bộ luật Quản trò' : '🎲 Về bộ luật Vui vẻ'); });
  $('#btn-start').style.display = isHost ? '' : 'none';
  $('#btn-start').disabled = !rl.ok;
  $('#wait-msg').style.display = isHost ? 'none' : '';
}
$('#opt-auto').onchange = e => net && net.setOpt('auto', e.target.checked);
// ---------- bộ vai đã lưu của hội (localStorage, chỉ chủ phòng) ----------
const PRESET_KEY = 'bgvn-masoi-presets';
const RULE_KEYS = ['reveal', 'voteMode', 'tie', 'doubleSave', 'dayTime', 'voteTime', 'nightTime', 'hunter', 'wolfTie', 'fixedNight', 'secretDeath', 'witchBlind', 'afkAuto', 'wolfSelf'];
const loadPresets = () => { try { const a = JSON.parse(ls.get(PRESET_KEY) || '[]'); return Array.isArray(a) ? a.filter(x => x && x.name && x.roles) : []; } catch (e) { return []; } };
const savePresets = a => ls.set(PRESET_KEY, JSON.stringify(a.slice(0, 12)));
function presetSummary(roles) { return ROLE_ORDER.filter(r => r !== 'villager' && roles[r]).map(r => ROLES[r].emoji + (roles[r] > 1 ? '×' + roles[r] : '')).join(''); }
function renderPresets() {
  const box = $('#presets'); if (!box) return;
  if (!isHost || !lobby) { box.style.display = 'none'; return; }
  box.style.display = '';
  const list = loadPresets();
  box.innerHTML = `<div class="ps-head"><b>💾 Bộ vai của hội</b><button class="chip sm" id="ps-save">＋ Lưu bộ đang chọn</button></div>` +
    (list.length ? `<div class="ps-list">${list.map((x, i) => `<div class="ps"><button class="ps-use" data-ps="${i}" title="Dùng bộ này"><b>${esc(x.name)}</b><small>${presetSummary(x.roles)}${x.n ? ` · lưu lúc ${x.n} người` : ''}</small></button><button class="x" data-psx="${i}" aria-label="Xoá ${esc(x.name)}">✕</button></div>`).join('')}</div>` : '<p class="ps-empty">Chưa lưu bộ nào. Chỉnh vai + luật xong bấm “Lưu” để lần sau chọn lại 1 chạm.</p>');
  $('#ps-save').onclick = savePresetModal;
  $$('#presets [data-ps]').forEach(b => b.onclick = () => { const x = loadPresets()[+b.dataset.ps]; if (!x) return; fx.sfx.ok(); net.applyPreset(x.roles, x.opts); toast(`✅ Đã chọn bộ “${x.name}”`); });
  $$('#presets [data-psx]').forEach(b => b.onclick = () => { const a = loadPresets(); const x = a[+b.dataset.psx]; if (!x) return; openModal(`<h2>Xoá bộ vai?</h2><p class="ctr">Xoá “<b>${esc(x.name)}</b>” khỏi máy này?</p><div class="btns"><button class="btn" onclick="__closeModal()">Thôi</button><button class="btn red" id="psx-ok">Xoá</button></div>`); $('#psx-ok').onclick = () => { a.splice(+b.dataset.psx, 1); savePresets(a); closeModal(); renderPresets(); }; });
}
function savePresetModal() {
  if (!lobby) return;
  const roles = { ...lobby.opts.roles };
  openModal(`<h2>💾 Lưu bộ vai</h2><p class="ctr">${presetSummary(roles)} + luật chơi hiện tại. Lưu trên máy này để lần sau chọn lại nhanh.</p>
    <label class="fld"><span>Tên bộ</span><input id="ps-name" maxlength="28" placeholder="VD: Bộ hội GET A JOB" value=""></label>
    <div class="btns"><button class="btn" onclick="__closeModal()">Thôi</button><button class="btn pri" id="ps-ok">💾 Lưu</button></div>`);
  const inp = $('#ps-name'); setTimeout(() => inp.focus(), 50);
  const go = () => {
    const name = inp.value.trim() || 'Bộ hội GET A JOB';
    const a = loadPresets().filter(x => x.name.toLowerCase() !== name.toLowerCase());
    a.unshift({ name, roles, opts: Object.fromEntries(RULE_KEYS.map(k => [k, lobby.opts[k]])), n: lobby.players.length });
    savePresets(a); closeModal(); renderPresets(); toast(`💾 Đã lưu “${name}”`); fx.sfx.ok();
  };
  $('#ps-ok').onclick = go; inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}
$('#btn-addbot').onclick = () => { fx.sfx.click(); net && net.addBot(); };
$('#btn-fill').onclick = () => { fx.sfx.click(); net && net.addBot(Math.max(0, 8 - lobby.players.length)); };
$('#btn-start').onclick = () => { fx.actx(); net && net.start(); };

// ---------- công cụ ----------
const syncMusic = () => { $('#btn-music').classList.toggle('on', fx.musicIsOn()); $('#btn-music-home').classList.toggle('on', fx.musicIsOn()); };
$('#btn-music').onclick = $('#btn-music-home').onclick = () => { fx.actx(); fx.musicToggle(); syncMusic(); if (!view) moodFor(null); }; syncMusic();
$('#vol').value = fx.musicVolume(); $('#vol').oninput = e => fx.musicVolume(+e.target.value);
const syncMute = () => $('#btn-mute').textContent = fx.isMuted() ? '🔇' : '🔊';
$('#btn-mute').onclick = () => { fx.toggleMute(); syncMute(); }; syncMute();
const syncVoice = () => $('#btn-voice').classList.toggle('on', fx.voiceIsOn());
$('#btn-voice').onclick = () => { const on = fx.voiceToggle(); syncVoice(); toast(on ? '🗣️ Quản trò sẽ đọc to (nếu máy có giọng tiếng Việt). Chơi chung phòng thì chỉ bật 1 máy thôi nha.' : '🗣️ Tắt giọng quản trò.', 3500); if (on) fx.say('Xin chào cả làng'); }; syncVoice();
$('#btn-guide').onclick = $('#btn-guide-home').onclick = () => openGuide(openModal);
for (const id of ['#btn-news', '#btn-news-home']) { const b = $(id); newsBadge(b, 'masoi'); b.onclick = () => { openNews('masoi'); $$('#btn-news,#btn-news-home').forEach(x => x.classList.toggle('bgvn-dot', false)); }; }
document.addEventListener('pointerdown', () => { fx.actx(); if (!view && !$('#screen-game').classList.contains('active')) moodFor(null); }, { once: true });

// ---------- giữ để xem vai ----------
function peekHTML() {
  const m = me(); if (!m) return '';
  const R = ROLES[m.role];
  const extra = [];
  if (m.lover) extra.push(`💘 Người yêu: <b>${esc(pname(m.lover))}</b>`);
  if (isWolfRole(m.role)) { const mates = view.players.filter(p => p.id !== m.id && p.role && isWolfRole(p.role)); if (mates.length) extra.push(`🐺 Đồng bọn: <b>${mates.map(p => esc(clean(p.name)) + (p.alive ? '' : ' 💀')).join(', ')}</b>`); }
  if (m.role === 'seer') { const s = Object.entries(m.seen || {}); if (s.length) extra.push('🔮 ' + s.map(([id, r]) => `${esc(pname(id))}: <b>${r === 'wolf' ? 'Sói' : 'Dân'}</b>`).join(' · ')); }
  if (m.role === 'medium') { const s = Object.entries(m.seen || {}); if (s.length) extra.push('🕯️ ' + s.map(([id, r]) => `${esc(pname(id))}: <b>${r === 'wolf' ? 'phe Sói' : r === 'village' ? 'phe Dân' : 'phe riêng'}</b>`).join(' · ')); }
  if (m.role === 'witch' && view.potions) extra.push(`🧪 Bình cứu: <b>${view.potions.save ? 'còn' : 'hết'}</b> · ☠️ Bình độc: <b>${view.potions.poison ? 'còn' : 'hết'}</b>`);
  if (m.role === 'elder') extra.push(m.elderHit ? '👴 Đã mất mạng phụ' : '👴 Còn mạng phụ');
  if (m.idiotOut) extra.push('🤪 Đã lộ – không được bỏ phiếu');
  return roleCardSVG(m.role) + `<div class="pk-txt">${m.role === 'hunter' && view && view.opts.hunter === 'pin' ? HUNTER_PIN : R.short}${extra.length ? '<br>' + extra.join('<br>') : ''}</div>`;
}
function peek(on) {
  if (on && !me()) return;
  if (on) { $('#peek').innerHTML = peekHTML(); fx.sfx.reveal(); }
  document.body.classList.toggle('peeking', on);
}
const mc = $('#mycard');
mc.addEventListener('pointerdown', e => { e.preventDefault(); try { mc.setPointerCapture(e.pointerId); } catch (x) {} peek(true); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => mc.addEventListener(t, () => peek(false)));
mc.addEventListener('contextmenu', e => e.preventDefault());
mc.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); peek(true); } });
mc.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') peek(false); });
$('#mycard-art').innerHTML = cardBackSVG();

// màn nhận vai: giữ để lật
function revealModal() {
  revealPending = false;
  const m = me(); if (!m) return;
  openModal(`<h2>🌕 Vai của bạn</h2><p class="ctr">Cúi xuống, che màn hình, rồi <b>bấm giữ</b> lá bài để lật. Thả tay là úp lại.</p>
    <div class="reveal-card" id="rv"><div class="flip"><div class="face">${cardBackSVG()}</div><div class="face front">${roleCardSVG(m.role)}</div></div></div>
    <p class="reveal-hint" id="rv-hint">👆 Giữ để xem</p>
    <div class="btns"><button class="btn pri" id="rv-ok" disabled>Đã nhớ vai 👍</button></div>`, '', 'reveal');
  const rv = $('#rv'); let seen = false;
  const on = e => { e.preventDefault(); try { rv.setPointerCapture(e.pointerId); } catch (x) {} rv.classList.add('open'); if (!seen) { seen = true; fx.sfx.reveal(); $('#rv-ok').disabled = false; $('#rv-hint').innerHTML = `${ROLES[m.role].emoji} <b>${ROLES[m.role].name}</b> – ${ROLES[m.role].short}`; } };
  const off = () => rv.classList.remove('open');
  rv.addEventListener('pointerdown', on); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => rv.addEventListener(t, off));
  rv.addEventListener('contextmenu', e => e.preventDefault());
  $('#rv-ok').onclick = () => { closeModal(); fx.sfx.ok(); };
}

// ---------- nhận state ----------
function setBody(v) {
  const b = document.body.classList;
  [...b].filter(c => /^(ph|step)-/.test(c)).forEach(c => b.remove(c));
  b.add('ph-' + (v ? v.phase : 'home'));
  if (v && v.step) b.add('step-' + v.step);
  b.toggle('ghost', !!(v && v.me && !v.me.alive));
  b.toggle('act-on', !!(v && v.phase === 'night' && v.myTurn && amAliveIn(v)));
}
const amAliveIn = v => v.me && v.me.alive;
function onState(v) {
  if (!v) { view = null; endShown = false; return; }
  const prev = view; view = v;
  if (!$('#screen-game').classList.contains('active')) { show('screen-game'); if (modalKey !== 'reveal') closeModal(); }
  if (v.pk !== curPk) { sel = []; witch = { save: null, poison: null, mode: null }; curPk = v.pk; if ((modalKey === 'claim' && v.phase !== 'day') || modalKey === 'thief') closeModal(); }
  clockPaused = v.clock && v.clock.paused ? v.clock.ms : 0;
  if (v.clock) { const end = Date.now() + v.clock.ms; if (clockPaused || Math.abs(end - clockEnd) > 900 || v.clock.total !== clockTotal) { clockEnd = end; clockTotal = v.clock.total; } } else clockEnd = 0;
  const t = phaseTheme(v); if (t !== theme) setTheme(t);
  moodFor(v); setBody(v);
  if (fresh) { // vừa vào/tải lại: không chiếu lại hoạt ảnh cũ
    fresh = false; lastEv = v.evN; lastChatN = v.chat.length ? v.chat[v.chat.length - 1].n : 0;
    for (const c of v.chat) seenChat[c.ch] = Math.max(seenChat[c.ch] || 0, c.n);
    tab = defaultTab(v);
    if (v.phase === 'night' && v.day === 1 && v.pk <= 4 && !(v.opts.tutorial && isHost && net && net.tut && !net.tut.off && !net.tut.seen.includes('welcome'))) { revealPending = true; setTimeout(revealModal, 300); }
    if (v.phase === 'ended') setTimeout(endModal, 400);
  } else {
    const evs = v.ev.filter(e => e.n > lastEv); lastEv = v.evN;
    if (evs.length) playEvents(evs, prev);
    newChat(v);
  }
  render();
  if (v.phase === 'night' && v.step === 'thief' && v.myTurn && v.extra && thiefPk !== v.pk) { thiefPk = v.pk; setTimeout(thiefModal, 500); }
  replayFollowUpdate(ctx());
  coachCheck(ctx());
}
function defaultTab(v) {
  if (v.me && !v.me.alive && v.phase !== 'ended') return 'ghost';
  if (v.phase === 'night' && v.me && isWolfRole(v.me.role) && v.me.alive) return 'wolf';
  return 'all';
}
function newChat(v) {
  const fresh = v.chat.filter(c => c.n > lastChatN);
  if (!fresh.length) return;
  lastChatN = fresh[fresh.length - 1].n;
  for (const c of fresh) {
    if (c.by && c.by !== myId) { fx.sfx.chat(); const el = document.querySelector(`.seat[data-pid="${c.by}"]`); if (el) fx.pop(el, 'talk'); }
  }
}
function render() {
  if (!view) return;
  renderPhase(); renderSeats(); renderAct(); renderDock();
  // thả emoji: người sống chỉ lúc trời sáng (đêm thả là lộ ai đang thức); hồn ma thì chỉ hồn ma khác thấy
  const m = view.me, on = !!m && (view.phase === 'ended' || !m.alive || REACT_PHASES.includes(view.phase));
  reacts.setVisible(on);
  $('#seats-wrap').classList.toggle('has-react', on);
}

// ---------- đầu trang ----------
function renderPhase() {
  const v = view, aliveN = v.players.filter(p => p.alive).length;
  const [ic, title] = {
    night: ['🌙', `Đêm ${v.day}`], dawn: ['🐓', `Sáng ngày ${v.day}`], day: ['☀️', `Ngày ${v.day} · Thảo luận`],
    vote: ['⚖️', v.vote && v.vote.round > 1 ? 'Bầu lại!' : 'Bỏ phiếu treo cổ'], last: ['🪢', 'Lời trăng trối'], hunter: ['🏹', 'Thợ Săn giương nỏ'], ended: ['🏁', 'Kết thúc'],
  }[v.phase];
  $('#phase').innerHTML = `<span class="pi">${ic}</span><span class="pt">${title}<small>${aliveN}/${v.players.length} còn sống${v.mixedLove && v.me && v.me.lover ? ' · 💘 phe Cặp Đôi' : ''}</small></span>`;
  // dòng dẫn truyện
  let ni = '📜', txt = '', hot = false;
  const m = v.me;
  if (v.phase === 'night') {
    const st = STEP_TEXT[v.step] || ['🌙', 'Đêm khuya…'];
    ni = st[0]; txt = st[1];
    if (m && m.alive && v.myTurn) { hot = true; txt = myStepText(v); }
    else if (m && !m.alive) txt = st[1] + (v.stepFake ? ' (vai này đã chết – chỉ giả vờ gọi)' : '');
  } else if (v.phase === 'dawn') { ni = '🐓'; txt = v.deaths && v.deaths.length ? 'Ò ó o… Trời sáng. Làng mất người rồi!' : 'Ò ó o… Trời sáng. Đêm qua bình yên!'; }
  else if (v.phase === 'day') { ni = '🗣️'; txt = m && m.alive ? 'Bàn tán đi cả làng! <b>Chạm vào ai đó để chỉ điểm 👉</b>. Bấm “Sẵn sàng” khi muốn bỏ phiếu.' : 'Dân làng đang cãi nhau… Hồn ma chỉ được hóng 🍿'; }
  else if (v.phase === 'vote') { ni = '⚖️'; txt = m && m.alive && !m.idiotOut ? '<b>Chạm vào người bạn muốn treo cổ</b> – hoặc Bỏ qua.' : 'Cả làng đang bỏ phiếu…'; hot = !!v.myTurn; }
  else if (v.phase === 'last') { ni = '🪢'; txt = v.condemned === myId ? '<b>Bạn bị treo cổ!</b> Gõ lời trăng trối ở khung chat rồi bấm Xong.' : `${esc(pname(v.condemned))} đang nói lời trăng trối…`; hot = v.condemned === myId; }
  else if (v.phase === 'hunter') { ni = '🏹'; txt = v.hunter === myId ? '<b>Bạn là Thợ Săn!</b> Chạm vào 1 người để kéo theo.' : `${esc(pname(v.hunter))} là Thợ Săn – đang nhắm bắn ai đó…`; hot = v.hunter === myId; }
  else if (v.phase === 'ended') { ni = '🏁'; txt = `<b>${v.winner.team === 'draw' ? 'Hoà!' : TEAM_NAME[v.winner.team] + ' thắng!'}</b> ${esc(v.winner.reason)}`; }
  $('#narr').innerHTML = `<span class="ni">${ni}</span><span class="nt">${txt}</span><b class="ntime" id="ntime"></b>`;
  $('#narr').classList.toggle('hot', hot);
}
function myStepText(v) {
  switch (v.step) {
    case 'cupid': return '<b>Bạn là Thần Tình Yêu 💘</b> – chạm chọn 2 người để ghép đôi.';
    case 'guard': return '<b>Bạn là Bảo Vệ 🛡️</b> – chạm chọn người để che chở đêm nay.';
    case 'hunter': return '<b>Bạn là Thợ Săn 🏹</b> – ghim sẵn 1 người. Nếu đêm nay bạn chết, người đó chết theo.';
    case 'seer': return '<b>Bạn là Tiên Tri 🔮</b> – chạm chọn người để soi.';
    case 'wolves': case 'wolves2': return `<b>Bầy Sói đi săn 🐺</b> – chạm vào con mồi. Cả bầy phải thống nhất${v.step === 'wolves2' ? ' (lượt cắn thêm!)' : ''}.`;
    case 'witch': return '<b>Bạn là Phù Thủy 🧪</b> – cứu, đầu độc, hay đi ngủ?';
    case 'thief': return '<b>Bạn là Kẻ Trộm 🃏</b> – tráo lấy 1 trong 2 lá thừa, hoặc giữ nguyên.';
    case 'medium': return '<b>Bạn là Bà Đồng 🕯️</b> – chạm vào 1 người <b>đã chết</b> để gọi hồn.';
  }
  return '';
}

// ---------- ghế ngồi ----------
// chế độ chọn hiện tại → hàm kiểm tra mục tiêu hợp lệ
function pickMode() {
  const v = view, m = v.me; if (!m) return null;
  if (v.phase === 'night' && m.alive && v.myTurn) {
    if (v.step === 'witch') return witch.mode === 'poison' ? 'poison' : null;
    return v.step === 'wolves2' ? 'wolves' : v.step;
  }
  if (v.phase === 'day' && m.alive) return 'accuse';
  if (v.phase === 'vote' && m.alive && !m.idiotOut) return 'vote';
  if (v.phase === 'hunter' && v.hunter === myId) return 'hunter';
  return null;
}
function canPick(mode, p) {
  const v = view;
  if (mode === 'medium') return !p.alive && p.id !== myId && !(v.me.seen && p.id in v.me.seen);
  if (!p.alive) return false;
  switch (mode) {
    case 'cupid': return true;
    case 'guard': return p.id !== v.lastGuard;
    case 'seer': return p.id !== myId;
    case 'wolves': return (v.wolfTargets || []).includes(p.id);
    case 'poison': return p.id !== myId;
    case 'accuse': return p.id !== myId;
    case 'vote': return p.id !== myId && v.vote && v.vote.candidates.includes(p.id);
    case 'hunter': return p.id !== myId;
  }
  return false;
}
let ringKey = '';
function layoutRing(n) {
  const w = $('#seats-wrap'), W = w.clientWidth, H = w.clientHeight;
  const wide = innerWidth >= 900 && H >= 380;
  let ok = false, pos = [];
  if (wide) {
    const rx = W / 2 - 64, ry = H / 2 - 54;
    const pts = []; let L = 0;
    for (let i = 0; i <= 720; i++) { const a = -Math.PI / 2 + i / 720 * Math.PI * 2; const p = [W / 2 + rx * Math.cos(a), H / 2 + ry * Math.sin(a)]; if (i) L += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); pts.push(p); pts[i].L = L; }
    if (L / n >= 124) {
      ok = true;
      for (let k = 0; k < n; k++) { const target = k * L / n; const p = pts.find(q => q.L >= target) || pts[0]; pos.push([p[0] / W * 100, p[1] / H * 100]); }
    }
  }
  w.classList.toggle('ring', ok);
  return ok ? pos : null;
}
addEventListener('resize', () => { if (view) renderSeats(); });
function renderSeats() {
  const v = view, mode = pickMode();
  const pos = layoutRing(v.players.length);
  const votes = {}, acc = {}, wolfv = {};
  if (v.phase === 'vote' && v.vote && v.vote.votes) for (const t of Object.values(v.vote.votes)) if (t !== 'skip') votes[t] = (votes[t] || 0) + 1;
  if (v.dayInfo) for (const t of Object.values(v.dayInfo.accuse)) acc[t] = (acc[t] || 0) + 1;
  if (v.wolfVotes) for (const t of Object.values(v.wolfVotes)) if (t) wolfv[t] = (wolfv[t] || 0) + 1;
  const m = v.me, ghost = m && !m.alive;
  const winners = v.winner ? new Set(v.winner.ids) : null;
  $('#seats').innerHTML = v.players.map((p, i) => {
    const can = mode && canPick(mode, p);
    const isSel = sel.includes(p.id) || (mode === 'poison' && witch.poison === p.id) || (mode === 'vote' && v.vote && v.vote.mine === p.id) || (mode === 'accuse' && v.dayInfo && v.dayInfo.accuse[myId] === p.id) || (mode === 'wolves' && v.wolfVotes && v.wolfVotes[myId] === p.id);
    const known = p.role;
    const publicRole = known && (p.revealed || v.phase === 'ended' || p.idiotOut);
    const wolfmate = m && isWolfRole(m.role) && known && isWolfRole(known) && p.id !== myId;
    const cls = ['seat', p.id === myId ? 'me' : '', p.alive ? '' : 'dead', can ? 'can' : (mode && p.alive && p.id !== myId ? 'no' : ''), isSel ? 'sel' : '', wolfmate ? 'wolfmate' : '', v.condemned === p.id && v.phase === 'last' ? 'condemned' : '', winners && winners.has(p.id) ? 'win' : ''].filter(Boolean).join(' ');
    const b = [];
    if (votes[p.id]) b.push(`<span class="badge b-votes">${votes[p.id]}</span>`);
    if (acc[p.id] && (v.phase === 'day' || v.phase === 'vote')) b.push(`<span class="badge b-acc">👉${acc[p.id]}</span>`);
    if (v.phase === 'day' && v.dayInfo && v.dayInfo.ready[p.id] && p.alive) b.push('<span class="badge b-ready">✓ Sẵn</span>');
    if ((v.away || []).includes(p.id)) b.push('<span class="badge b-away">📴</span>');
    if (p.lover) b.push(`<span class="badge b-love ${ghost || v.phase === 'ended' ? '' : 'priv'}">💘</span>`);
    if (wolfv[p.id]) b.push(`<span class="badge b-wolfv priv">🐺×${wolfv[p.id]}</span>`);
    if (known) b.push(`<span class="${publicRole || ghost ? '' : 'priv'}">${roleDot(known)}</span>`.replace('<span class="">', '<span>'));
    else if (m && m.seen && m.seen[p.id]) { const r = m.seen[p.id]; b.push(`<span class="rdot priv" style="--c:${r === 'wolf' ? '#c0392b' : r === 'village' ? '#3f8f4f' : '#6b7280'}" title="${m.role === 'medium' ? 'Kết quả gọi hồn' : 'Kết quả soi'}">${r === 'wolf' ? '🐺' : r === 'village' ? '✓' : '?'}</span>`); }
    let sub = '';
    if (!p.alive) sub = { night: 'chết đêm', wolf: 'bị cắn', poison: 'chết đêm', love: 'chết vì tình', shot: 'trúng tên', hang: 'bị treo' }[p.cause] || 'đã chết';
    else if (p.idiotOut) sub = '🤪 mất phiếu';
    else if (v.phase === 'vote' && v.vote && v.vote.votes && v.vote.votes[p.id]) sub = '→ ' + (v.vote.votes[p.id] === 'skip' ? 'bỏ qua' : pname(v.vote.votes[p.id]));
    else if (v.phase === 'vote' && v.vote && v.vote.voted.includes(p.id)) sub = '✓ đã bầu';
    else if (v.phase === 'day' && v.dayInfo && v.dayInfo.accuse[p.id]) sub = '👉 ' + pname(v.dayInfo.accuse[p.id]);
    else if (p.id === myId) sub = '⭐ bạn';
    else if (p.isBot) sub = 'bot';
    const style = pos ? ` style="--x:${pos[i][0].toFixed(2)}%;--y:${pos[i][1].toFixed(2)}%"` : '';
    return `<button class="${cls}" data-pid="${p.id}"${style} ${can ? '' : 'tabindex="-1"'} aria-label="${esc(clean(p.name))}${p.alive ? '' : ' (đã chết)'}">${avatar(p.name, false)}<span class="nm">${esc(clean(p.name))}</span><span class="sub">${esc(sub)}</span>${b.join('')}</button>`;
  }).join('');
  $$('#seats .seat').forEach(el => el.onclick = () => seatClick(el.dataset.pid));
  syncSeatPick(v, mode);
}
// chọn ngay trên vòng ghế (dùng chung với các game khác): ghế chọn được sáng + 🎯, ghế không chọn được mờ kèm lý do
// (thanh hành động bên dưới đã nói đang chọn gì + nút Bỏ qua, nên không hiện thanh nhắc riêng)
function whyNot(mode, p) {
  const v = view;
  if (mode === 'medium') return v.me.seen && p.id in v.me.seen ? 'đã gọi hồn' : '';
  if (mode === 'guard' && p.id === v.lastGuard) return 'đã che đêm qua';
  if (mode === 'wolves') { const m = v.me; return m && p.role && isWolfRole(p.role) ? 'đồng bọn' : 'không cắn được'; }
  if (mode === 'vote') return 'không lên giàn';
  return '';
}
function syncSeatPick(v, mode) {
  if (!mode || !v.players.some(p => canPick(mode, p))) { if (pickActive()) endPick(); return; }
  syncPick({
    key: 'ms-' + mode + '-' + (v.day || 0) + '-' + (v.phase || ''), root: $('#seats'), seat: id => $(`#seats .seat[data-pid="${id}"]`), glow: '.av', keep: true, banner: false, cancelable: false,
    items: v.players.filter(p => mode === 'medium' ? !p.alive : p.alive).filter(p => canPick(mode, p) || p.id !== myId).map(p => {
      const ok = canPick(mode, p); return { id: p.id, name: clean(p.name), ok, sel: ok && $(`#seats .seat[data-pid="${p.id}"]`)?.classList.contains('sel'), reason: ok ? '' : whyNot(mode, p) };
    }),
    onPick: id => seatClick(id),
  });
}
function seatClick(pid) {
  const v = view, mode = pickMode(), p = pl(pid);
  if (!mode || !p || !canPick(mode, p)) { if (mode && p && p.alive) { fx.sfx.bad(); } return; }
  fx.actx(); fx.sfx.pick();
  switch (mode) {
    case 'cupid': if (sel.includes(pid)) sel = sel.filter(x => x !== pid); else { sel.push(pid); if (sel.length > 2) sel.shift(); } break;
    case 'guard': case 'seer': case 'hunter': case 'medium': sel = sel[0] === pid ? [] : [pid]; break;
    case 'poison': witch.poison = witch.poison === pid ? null : pid; break;
    case 'wolves': send({ type: 'wolf', target: pid }); fx.sfx.claw(); break;
    case 'accuse': send({ type: 'accuse', target: pid }); break;
    case 'vote': send({ type: 'vote', target: pid }); fx.sfx.vote(); break;
  }
  render();
}

// ---------- hàng hành động ----------
function renderAct() {
  const v = view, m = v.me, el = $('#act-body');
  let hint = '', btns = [], mine = false;
  const B = (id, label, cls = '', dis = false) => `<button class="btn ${cls}" id="${id}" ${dis ? 'disabled' : ''}>${label}</button>`;
  if (!m) { el.innerHTML = '<div class="hint">👀 Bạn đang xem.</div>'; return; }
  const ghostTxt = '👻 Bạn đã thành hồn ma. Xem được mọi vai, chat ở kênh <b>Hồn ma</b>. Đừng mách nha!';
  switch (v.phase) {
    case 'night':
      if (!m.alive) { hint = ghostTxt; break; }
      if (!v.myTurn) { hint = isWolfRole(m.role) && (v.step === 'wolves' || v.step === 'wolves2') ? '🐺 Đã chọn – chờ cả bầy thống nhất… (giữ ý = bấm lại cùng người)' : nightWaitText(v, m); if (isWolfRole(m.role) && (v.step === 'wolves' || v.step === 'wolves2')) { btns.push(B('a-nobite', '🙅 Không cắn ai')); } break; }
      mine = true;
      if (v.step === 'cupid') { hint = sel.length ? `💘 ${sel.map(pname).join(' ❤ ')}${sel.length < 2 ? ' + …' : ''}` : 'Chọn 2 người (được chọn chính mình).'; btns.push(B('a-cupid', '💘 Ghép đôi', 'pri', sel.length !== 2), B('a-skip', 'Bỏ qua')); }
      else if (v.step === 'guard') { hint = sel[0] ? `🛡️ Bảo vệ <b>${esc(pname(sel[0]))}</b>` : `Chọn người để bảo vệ${v.lastGuard ? ` (không được chọn lại ${esc(pname(v.lastGuard))})` : ''}.`; btns.push(B('a-guard', '🛡️ Bảo vệ', 'pri', !sel[0]), B('a-skip', 'Bỏ qua')); }
      else if (v.step === 'hunter') { hint = sel[0] ? `🏹 Ghim <b>${esc(pname(sel[0]))}</b>` : 'Chạm vào người bạn muốn ghim đêm nay.'; btns.push(B('a-pin', '🏹 Ghim', 'red', !sel[0]), B('a-skip', 'Không ghim')); }
      else if (v.step === 'thief') {
        const ex = v.extra || [];
        hint = `🃏 2 lá thừa: ${ex.map(r => `<b>${ROLES[r].emoji} ${ROLES[r].name}</b>`).join(' và ')}. Lấy 1 lá (thành vai đó) hoặc giữ nguyên.`;
        ex.forEach((r, i) => btns.push(B('a-th-' + i, `${ROLES[r].emoji} Lấy ${ROLES[r].name}`, i ? 'purple' : 'pri')));
        btns.push(B('a-th-keep', '🃏 Giữ nguyên'));
      }
      else if (v.step === 'medium') { hint = sel[0] ? `🕯️ Gọi hồn <b>${esc(pname(sel[0]))}</b>` : 'Chạm vào 1 người đã chết (ghế mờ) để hỏi họ thuộc phe nào.'; btns.push(B('a-medium', '🕯️ Gọi hồn', 'purple', !sel[0]), B('a-skip', 'Bỏ qua')); }
      else if (v.step === 'seer') { hint = sel[0] ? `🔮 Soi <b>${esc(pname(sel[0]))}</b>` : 'Chọn người để soi.'; btns.push(B('a-seer', '🔮 Soi', 'purple', !sel[0]), B('a-skip', 'Bỏ qua')); }
      else if (v.step === 'wolves' || v.step === 'wolves2') {
        const wv = v.wolfVotes || {}; const lines = Object.entries(wv).map(([w, t]) => `${esc(pname(w))}→${t ? esc(pname(t)) : '🙅'}`);
        hint = lines.length ? '🐺 ' + lines.join(' · ') : 'Chạm vào con mồi (bàn ở kênh 🐺 Sói).';
        btns.push(B('a-nobite', '🙅 Không cắn ai'));
      } else if (v.step === 'witch') {
        const vic = v.victims || [], pot = v.potions || {};
        hint = (v.opts.witchBlind && !pot.save ? '🌫️ Bình cứu đã dùng – bạn không còn biết Sói cắn ai.' : vic.length ? `🩸 Sói vừa cắn: <b>${vic.map(x => esc(pname(x))).join(', ')}</b>` : '🌙 Đêm nay không ai bị cắn.') + (witch.mode === 'poison' ? '<br>☠️ Chạm vào người cần đầu độc' + (witch.poison ? `: <b>${esc(pname(witch.poison))}</b>` : '…') : '');
        if (pot.save) for (const x of vic) btns.push(B('a-save-' + x, (witch.save === x ? '✅ ' : '🧪 ') + 'Cứu ' + esc(pname(x)), witch.save === x ? 'green' : ''));
        if (pot.poison) btns.push(B('a-poison', witch.poison ? `☠️ Độc: ${esc(pname(witch.poison))}` : '☠️ Đầu độc…', witch.mode === 'poison' ? 'purple' : ''));
        btns.push(B('a-witch', witch.save || witch.poison ? '✨ Xong' : '😴 Không làm gì', 'pri'));
      }
      break;
    case 'dawn': hint = '🐓 Trời sáng rồi… xem ai còn ai mất.'; break;
    case 'day':
      if (!m.alive) { hint = ghostTxt; break; }
      { const ready = v.dayInfo && v.dayInfo.ready[myId]; const alive = v.players.filter(p => p.alive).length, rn = v.dayInfo ? Object.values(v.dayInfo.ready).filter(Boolean).length : 0;
        hint = `👉 Chạm vào người để chỉ điểm (chạm lại để rút). ${rn}/${alive} người sẵn sàng bỏ phiếu.`;
        btns.push(B('a-ready', ready ? (isHost || m.role === 'seer' ? '✅ Đã sẵn sàng' : '✅ Đã sẵn sàng (bấm để huỷ)') : '✋ Sẵn sàng bầu', ready ? 'green' : 'pri'));
        if (m.role === 'seer' && Object.keys(m.seen || {}).length) btns.push(B('a-claim', '📢 Khai soi', 'purple'));
        if (isHost) btns.push(B('a-early', '⏩ Bầu sớm')); }
      break;
    case 'vote':
      if (!m.alive) { hint = ghostTxt; break; }
      if (m.idiotOut) { hint = '🤪 Bạn đã lộ là Kẻ Ngốc – không được bỏ phiếu, chỉ được… nói.'; break; }
      { const mv = v.vote && v.vote.mine; const n = v.vote ? v.vote.voted.length : 0, tot = v.players.filter(p => p.alive && !p.idiotOut).length;
        hint = (mv ? `🗳️ Bạn bầu: <b>${mv === 'skip' ? 'Bỏ qua' : esc(pname(mv))}</b> (đổi được tới khi mọi người bầu xong). ` : '🗳️ Chạm vào người muốn treo cổ. ') + `${n}/${tot} đã bầu.`;
        mine = !mv;
        btns.push(B('a-vskip', mv === 'skip' ? '✅ Bỏ qua' : '🙅 Bỏ qua (không treo ai)', mv === 'skip' ? 'green' : '')); }
      break;
    case 'last':
      if (v.condemned === myId) { mine = true; hint = '🥀 Gõ lời trăng trối ở khung chat (kênh Làng), rồi bấm Xong.'; btns.push(B('a-done', '🥀 Xong', 'red')); }
      else hint = `🪢 ${esc(pname(v.condemned))} đang nói lời trăng trối…`;
      break;
    case 'hunter':
      if (v.hunter === myId) { mine = true; hint = sel[0] ? `🏹 Nhắm <b>${esc(pname(sel[0]))}</b>` : '🏹 Chạm vào người bạn muốn kéo theo.'; btns.push(B('a-shoot', '🏹 Bắn!', 'red', !sel[0]), B('a-noshoot', 'Hạ nỏ')); }
      else hint = `🏹 ${esc(pname(v.hunter))} đang nhắm…`;
      break;
    case 'ended':
      hint = `🏁 <b>${v.winner.team === 'draw' ? 'Hoà!' : TEAM_NAME[v.winner.team] + ' thắng!'}</b>`;
      btns.push(B('a-result', '📜 Kết quả', 'pri'), B('a-replay', '🎞️ Xem lại ván', 'purple'));
      if (isHost) btns.push(B('a-again', '🔁 Ván mới'));
      break;
  }
  el.innerHTML = `<div class="hint">${hint}</div>${btns.length ? `<div class="btns">${btns.join('')}</div>` : ''}`;
  el.classList.toggle('mine', mine);
  const on = (id, f) => { const b = document.getElementById(id); if (b) b.onclick = () => { fx.actx(); fx.sfx.click(); f(); }; };
  on('a-skip', () => send({ type: 'skip' }));
  on('a-th-0', () => { send({ type: 'thief', take: 0 }); fx.sfx.magic(); });
  on('a-th-1', () => { send({ type: 'thief', take: 1 }); fx.sfx.magic(); });
  on('a-th-keep', () => send({ type: 'thief', take: null }));
  on('a-medium', () => { send({ type: 'medium', target: sel[0] }); });
  on('a-early', () => { send({ type: 'early' }); toast('⏩ Chủ phòng cho bỏ phiếu sớm!'); });
  on('a-replay', () => openReplay(ctx(), 0));
  on('a-cupid', () => { send({ type: 'cupid', targets: sel.slice() }); fx.sfx.heart(); });
  on('a-guard', () => { send({ type: 'guard', target: sel[0] }); fx.sfx.shield(); });
  on('a-seer', () => { send({ type: 'seer', target: sel[0] }); });
  on('a-pin', () => { send({ type: 'hunter', target: sel[0] }); });
  on('a-nobite', () => send({ type: 'wolf', target: null }));
  (v.victims || []).forEach(x => on('a-save-' + x, () => { witch.save = witch.save === x ? null : x; fx.sfx.potion(); render(); }));
  on('a-poison', () => { witch.mode = witch.mode === 'poison' ? null : 'poison'; if (!witch.mode) witch.poison = null; render(); });
  on('a-witch', () => { if (witch.save || witch.poison) { send({ type: 'witch', save: witch.save, poison: witch.poison }); if (witch.poison) fx.sfx.poison(); else fx.sfx.potion(); } else send({ type: 'skip' }); });
  on('a-ready', () => send({ type: 'ready', on: !(v.dayInfo && v.dayInfo.ready[myId]) }));
  on('a-claim', claimModal);
  on('a-vskip', () => { send({ type: 'vote', target: 'skip' }); fx.sfx.vote(); });
  on('a-done', () => send({ type: 'done' }));
  on('a-shoot', () => send({ type: 'shoot', target: sel[0] }));
  on('a-noshoot', () => send({ type: 'shoot', target: null }));
  on('a-result', endModal);
  on('a-again', () => { closeModal(); net.restart(); });
}
// ban đêm chưa tới lượt: nói rõ cho người mới là mình có việc gì không, đã xong hay sắp tới lượt
const NIGHT_ORDER = ['thief', 'cupid', 'guard', 'hunter', 'seer', 'medium', 'wolves', 'witch'];
function nightWaitText(v, m) {
  const mine = isWolfRole(m.role) ? 'wolves' : NIGHT_ORDER.includes(m.role) ? m.role : null;
  // không ghi tên vai ra đây: chơi chung phòng, người ngồi cạnh liếc màn hình là lộ
  if (!mine || ((mine === 'cupid' || mine === 'thief') && v.day !== 1)) return '😴 Nhắm mắt, ngủ ngoan… Cúi xuống điện thoại cho khỏi lộ nha.';
  const cur = NIGHT_ORDER.indexOf(v.step === 'wolves2' ? 'wolves' : v.step);
  return NIGHT_ORDER.indexOf(mine) > cur ? '😴 Chưa tới lượt bạn – lát nữa máy sẽ gọi dậy (khung trên sáng vàng). Cúi xuống điện thoại nha.' : '😴 Bạn xong việc đêm nay rồi, ngủ ngoan… Cúi xuống điện thoại cho khỏi lộ nha.';
}
function claimModal() {
  const m = me(); const list = Object.entries(m.seen || {});
  openModal(`<h2>📢 Khai kết quả soi</h2><p class="ctr">Cả làng sẽ biết bạn là Tiên Tri – Sói cũng biết luôn đó! Chọn kết quả muốn công bố:</p>
    <div class="targets">${list.map(([id, r]) => `<button class="btn ${r === 'wolf' ? 'red' : 'green'}" data-cl="${id}" data-res="${r}">${esc(pname(id))}: ${r === 'wolf' ? '🐺 Sói' : '🙂 Dân'}</button>`).join('')}</div>
    <div class="btns"><button class="btn" onclick="__closeModal()">Thôi, giấu nghề</button></div>`, '', 'claim');
  $$('[data-cl]').forEach(b => b.onclick = () => { send({ type: 'claim', target: b.dataset.cl, res: b.dataset.res }); closeModal(); fx.sfx.magic(); });
}

// ---------- khung chat ----------
const TAB_INFO = { all: ['💬 Làng', 't-all'], wolf: ['🐺 Sói', 't-wolf'], love: ['💘 Đôi', 't-love'], ghost: ['👻 Hồn ma', 't-ghost'], log: ['📒 Sổ & Nhật ký', 't-log'] };
const QUICK = {
  all: ['Tui là dân 🙏', 'Nghi quá nha 🤨', 'Ai khai đi?', 'Bỏ qua đi', 'Đừng bầu tui 😭', '😂', '🐺?'],
  wolf: ['Cắn ai đây?', 'Chốt nha', 'Cắn đứa nói nhiều', 'Mai giả làm dân nha 🤫'],
  love: ['❤️', 'Mình phải sống sót nha', 'Đừng bầu nhau nha 💘'],
  ghost: ['Huhu chết oan 😭', 'Hóng 🍿', 'Sói là…🤐'],
};
function tabsFor(v) {
  const t = ['all'];
  const m = v.me, ghost = m && !m.alive, all = ghost || v.phase === 'ended';
  if ((m && isWolfRole(m.role)) || all) t.push('wolf');
  if ((m && m.lover) || (all && v.chat.some(c => c.ch === 'love'))) t.push('love');
  if (all) t.push('ghost');
  t.push('log');
  return t;
}
function renderDock() {
  const v = view, tabs = tabsFor(v);
  if (!tabs.includes(tab)) tab = defaultTab(v);
  if (tab !== 'log') for (const c of v.chat) if (c.ch === tab) seenChat[tab] = Math.max(seenChat[tab] || 0, c.n);
  const unread = ch => v.chat.filter(c => c.ch === ch && c.n > (seenChat[ch] || 0) && c.by !== myId).length;
  $('#tabs').innerHTML = tabs.map(t => { const u = t !== 'log' && t !== tab ? unread(t) : 0; return `<button class="tab ${TAB_INFO[t][1]} ${t === tab ? 'on' : ''}" data-tab="${t}">${TAB_INFO[t][0]}${u ? `<span class="dot">${u > 9 ? '9+' : u}</span>` : ''}</button>`; }).join('');
  $$('#tabs [data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; fx.sfx.click(); renderDock(); });
  const box = $('#msgs'), atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  let html = '';
  if (tab === 'log') {
    const notes = (v.me && v.me.notes || []).map(n => `<div class="m note">📒 <span class="tm">N${n.day}</span> ${esc(n.txt)}</div>`).join('');
    html = (notes ? `<div class="m sys big">📒 Sổ tay riêng (chỉ bạn thấy)</div>${notes}` : '') + `<div class="m sys big">📜 Nhật ký làng</div>` + v.log.map(l => `<div class="m lg ${l.k}">${esc(l.txt)}</div>`).join('');
  } else {
    const list = v.chat.filter(c => c.ch === tab);
    html = list.length ? list.map(c => {
      if (!c.by) return `<div class="m sys ${c.acc ? 'acc' : ''} ${/Trời sáng|buông xuống|THẮNG|treo cổ|Thợ Săn/.test(c.text) ? 'big' : ''}">${esc(c.text)}</div>`;
      const p = pl(c.by), nm = p ? clean(p.name) : '?';
      return `<div class="m ${c.by === myId ? 'mine' : ''} ${c.claim ? 'claim' : ''} ${c.last ? 'last' : ''}"><b style="color:${avColor(nm)}">${esc(nm)}${c.last ? ' 🥀' : ''}</b>: ${esc(c.text)}</div>`;
    }).join('') : `<div class="empty">${{ all: 'Chưa ai nói gì…', wolf: '🐺 Kênh bí mật của bầy Sói.', love: '💘 Kênh riêng của cặp đôi.', ghost: '👻 Kênh của hồn ma.' }[tab]}</div>`;
  }
  if (box.dataset.k !== tab + html.length) { box.innerHTML = html; box.dataset.k = tab + html.length; if (atBottom || box.dataset.t !== tab) box.scrollTop = box.scrollHeight; box.dataset.t = tab; }
  // ô nhập
  const can = tab !== 'log' && v.channels.includes(tab);
  const inp = $('#say-in');
  inp.disabled = !can; $('#say-btn').disabled = !can;
  inp.placeholder = can ? (v.phase === 'last' && v.condemned === myId ? 'Lời trăng trối…' : { all: 'Nói với cả làng…', wolf: 'Thì thầm với bầy…', love: 'Nói với người ấy…', ghost: 'Than thở với hồn ma…' }[tab])
    : tab === 'log' ? 'Chọn kênh chat để nói' : tab === 'all' && v.phase === 'night' ? '🤫 Ban đêm cả làng ngủ…' : tab === 'all' && v.phase === 'last' ? '🤫 Im lặng nghe trăng trối…' : v.me && !v.me.alive ? '👻 Hồn ma chỉ nói ở kênh Hồn ma' : 'Không nói được ở đây';
  $('#quick').innerHTML = can ? (QUICK[tab] || []).map(q => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('') : '';
  $('#quick').style.display = can ? '' : 'none';
  $$('#quick [data-q]').forEach(b => b.onclick = () => { send({ type: 'chat', ch: tab, text: b.dataset.q }); });
}
$('#say').onsubmit = e => { e.preventDefault(); const t = $('#say-in').value.trim(); if (!t || !view) return; send({ type: 'chat', ch: tab, text: t }); $('#say-in').value = ''; };
$('#btn-dock').onclick = () => { dockBig = !dockBig; $('#dock').classList.toggle('big', dockBig); $('#btn-dock').textContent = dockBig ? '⤡' : '⤢'; };

// ---------- đồng hồ ----------
let lastTick = 0;
function frame() {
  requestAnimationFrame(frame);
  const c = $('#clock');
  if (!view || !clockEnd || view.phase === 'ended') { c.className = 'clock'; const nt = $('#ntime'); if (nt) nt.textContent = ''; return; }
  const left = clockPaused ? clockPaused : Math.max(0, clockEnd - Date.now()), sec = Math.ceil(left / 1000);
  c.className = 'clock on' + (sec <= 10 ? ' low' : '');
  c.querySelector('i').style.width = (left / clockTotal * 100).toFixed(1) + '%';
  const nt = $('#ntime'); if (nt && clockPaused) { if (!nt.querySelector('.pz')) nt.innerHTML = '<i class="pz" aria-label="Tạm dừng"></i>'; nt.classList.remove('low'); return; }
  if (nt) { nt.textContent = sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : sec + 's'; nt.classList.toggle('low', sec <= 10); }
  if (view.myTurn && amAlive() && sec <= 5 && sec > 0 && sec !== lastTick) { lastTick = sec; fx.sfx.tick(); }
}
requestAnimationFrame(frame);

// ---------- hoạt ảnh theo sự kiện ----------
const seatEl = id => document.querySelector(`.seat[data-pid="${id}"]`);
function announce(html, hold = 4200) {
  const n = document.createElement('div'); n.className = 'announce'; n.style.setProperty('--hold', hold + 'ms'); n.innerHTML = html;
  n.onclick = () => n.remove();
  $('#fx-layer').appendChild(n); setTimeout(() => n.remove(), hold + 600);
}
const CAUSE_TXT = { night: 'đã chết trong đêm', wolf: 'đã chết trong đêm', poison: 'đã chết trong đêm', love: 'chết theo người yêu 💔', shot: 'trúng tên 🏹', hang: 'bị treo cổ' };
const tomb = (d, i) => { const p = pl(d.id); const r = d.role || (p && p.revealed ? p.role : null); return `<div class="tomb" style="animation-delay:${i * 0.25}s"><div class="stone">${r ? ROLES[r].emoji : '🪦'}</div><b>${esc(pname(d.id))}</b><small>${r ? ROLES[r].name : CAUSE_TXT[d.cause] || ''}</small></div>`; };
function playEvents(evs) {
  let t = 0;
  const at = (ms, f) => setTimeout(f, ms);
  const hasDawn = evs.some(e => e.k === 'dawn');
  for (const e of evs) {
    switch (e.k) {
      case 'night': at(t, () => {
        document.body.classList.add('flash-night'); setTimeout(() => document.body.classList.remove('flash-night'), 1500);
        fx.banner(`🌙 Đêm ${e.day}<small>Màn đêm buông xuống… cả làng đi ngủ</small>`, 'night', 2600); fx.sfx.howl(); fx.say(`Đêm ${e.day}. Màn đêm buông xuống, cả làng đi ngủ.`);
        if (view.me && view.me.alive && isWolfRole(view.me.role)) tab = 'wolf';
      }); t += 600; break;
      case 'step': at(t + 400, () => {
        const st = STEP_TEXT[e.step]; if (st) fx.say(st[1].replace('…', ''));
        if (e.step === 'wolves' || e.step === 'wolves2') fx.sfx.howlOne();
        if (view.phase === 'night' && view.myTurn && view.me && view.me.alive && view.step === e.step) { fx.sfx.ok(); try { navigator.vibrate && navigator.vibrate([120, 80, 120]); } catch (x) {} fx.pop($('#act'), 'pop'); }
      }); break;
      case 'seen': at(t + 200, () => { fx.sfx.magic(); const w = e.res === 'wolf'; if (e.medium) fx.banner(`🕯️ Hồn ${esc(pname(e.id))}<small>${w ? 'là phe SÓI 🐺' : e.res === 'village' ? 'là phe Dân Làng 🧑‍🌾' : 'là phe riêng 🥀'}</small>`, w ? 'blood' : 'night', 2600); else fx.banner(`🔮 ${esc(pname(e.id))}<small>${w ? 'LÀ SÓI! 🐺' : 'không phải Sói 🙂'}</small>`, w ? 'blood' : 'gold', 2600); }); break;
      case 'dawn': at(t, () => {
        fx.sfx.rooster(); fx.say(e.deaths.length ? 'Trời sáng. Đêm qua có người chết.' : 'Trời sáng. Đêm qua bình yên.');
        const ds = e.deaths || [];
        if (ds.some(d => d.cause === 'wolf')) setTimeout(() => { fx.claw(); fx.sfx.claw(); }, 900);
        if (ds.length) setTimeout(() => fx.sfx.death(), 1300);
        announce(`<h3>🐓 Sáng ngày ${e.day}</h3><p class="an-sub">${ds.length ? 'Đêm qua làng mất người…' : 'Đêm qua bình yên, không ai chết 🌤'}</p>${ds.length ? `<div class="tombs">${ds.map(tomb).join('')}</div>` : ''}`, ds.length ? 4800 : 3200);
        tab = defaultTab(view) === 'ghost' ? 'ghost' : 'all';
      }); t += 900; break;
      case 'day': at(t, () => { fx.sfx.drum(); if (!hasDawn) fx.banner(`☀️ Ngày ${e.day}`, 'dawn'); }); break;
      case 'vote': at(t, () => { fx.sfx.gong(); fx.banner(e.round > 1 ? '⚖️ Hoà phiếu – bầu lại!' : '⚖️ Bỏ phiếu treo cổ!', 'gold', 2000); fx.say(e.round > 1 ? 'Hoà phiếu. Bầu lại.' : 'Bỏ phiếu treo cổ.'); if (view.me && view.me.alive) tab = 'all'; }); t += 300; break;
      case 'voteResult': at(t, () => {
        const ta = e.tally; const parts = ta ? Object.entries(ta.cnt).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${pname(id)} ${n}`) : [];
        if (ta && ta.skip) parts.push(`bỏ qua ${ta.skip}`);
        if (parts.length) toast('🗳️ Kết quả: ' + parts.join(' · '), 4000);
        if (!e.id && !e.tie) fx.banner('🤷 Không ai bị treo', 'dawn', 2000);
      }); t += 400; break;
      case 'condemned': at(t, () => { fx.sfx.drumroll(); fx.banner(`🪢 ${esc(pname(e.id))}<small>bị dân làng treo cổ!</small>`, 'blood', 2400); fx.say(`${pname(e.id)} bị treo cổ.`); }); t += 500; break;
      case 'idiot': at(t, () => { fx.sfx.idiot(); fx.banner(`🤪 ${esc(pname(e.id))} là KẺ NGỐC!<small>Được tha, nhưng mất quyền bỏ phiếu</small>`, 'gold', 3000); }); t += 500; break;
      case 'hunterUp': at(t + (hasDawn ? 4500 : 600), () => { fx.banner(`🏹 ${esc(pname(e.id))} là THỢ SĂN!<small>Kéo theo ai đây?</small>`, 'gold', 2400); fx.sfx.drum(); }); break;
      case 'shot': at(t, () => { fx.sfx.shot(); fx.flash('#ffffff', 400); const el = seatEl(e.id); if (el) { fx.shake(el); fx.floatText(el, '🏹 Phựt!'); } }); t += 500; break;
      case 'death': if (!hasDawn) at(t, () => {
        const el = seatEl(e.id);
        if (e.cause === 'hang') { fx.sfx.death(); if (el) fx.floatText(el, '💀'); }
        else if (e.cause === 'love') { if (el) fx.floatText(el, '💔'); fx.sfx.lose(); }
        else if (e.cause === 'shot') { if (el) fx.floatText(el, '💀'); }
        if (e.role) setTimeout(() => toast(`🪦 ${pname(e.id)} là ${ROLES[e.role].emoji} ${ROLES[e.role].name}`), 900);
        if (e.id === myId) setTimeout(() => { fx.banner('👻 Bạn đã chết!<small>Giờ bạn là hồn ma – xem được mọi thứ</small>', 'night', 2600); tab = 'ghost'; renderDock(); }, 1200);
      }); else if (e.id === myId) at(t + 4800, () => { fx.banner('👻 Bạn đã chết!<small>Giờ bạn là hồn ma – xem được mọi thứ</small>', 'night', 2600); tab = 'ghost'; renderDock(); }); break;
      case 'win': at(t + (hasDawn ? 3800 : 1200), () => {
        const w = view.winner, iWon = w && w.ids.includes(myId);
        if (w.team === 'wolf') { fx.sfx.wolfwin(); fx.claw(); } else { fx.sfx.win(); fx.confetti(); }
        if (!iWon && w.team !== 'wolf') setTimeout(() => fx.sfx.lose(), 1200);
        if (modalKey !== 'replay') endModal(); // đang xem lại thì không đè lên
      }); break;
    }
  }
}
// Kẻ Trộm: xem 2 lá thừa bằng hình
function thiefModal() {
  const v = view; if (!v || v.step !== 'thief' || !v.myTurn || !v.extra) return;
  if (modalKey || revealPending) { setTimeout(thiefModal, 700); return; } // chờ lật xong lá vai
  openModal(`<h2>🃏 Hai lá bài thừa</h2><p class="ctr">Chạm vào lá muốn lấy – bạn sẽ thành vai đó. Không thích thì giữ nguyên làm Kẻ Trộm (như Dân thường).</p>
    <div class="thief-pick">${v.extra.map((r, i) => `<button class="tp" data-tk="${i}" aria-label="Lấy ${ROLES[r].name}">${roleCardSVG(r)}<span>${ROLES[r].emoji} ${ROLES[r].name}</span></button>`).join('')}</div>
    <div class="btns"><button class="btn" id="tk-keep">🃏 Giữ nguyên</button><button class="btn" onclick="__closeModal()">Để sau</button></div>`, '', 'thief');
  $$('[data-tk]').forEach(b => b.onclick = () => { send({ type: 'thief', take: +b.dataset.tk }); fx.sfx.magic(); closeModal(); });
  $('#tk-keep').onclick = () => { send({ type: 'thief', take: null }); closeModal(); };
}
function endModal() {
  const v = view; if (!v || !v.winner) return;
  const w = v.winner, ids = new Set(w.ids), iWon = ids.has(myId);
  const title = { wolf: '🐺 PHE SÓI THẮNG!', village: '🧑‍🌾 DÂN LÀNG THẮNG!', lovers: '💘 CẶP ĐÔI THẮNG!', tanner: '🥀 THẰNG CHÁN ĐỜI THẮNG!', draw: '🤝 HOÀ!' }[w.team];
  openModal(`<h2 class="win-title ${w.team}">${title}</h2><p class="ctr">${esc(w.reason)}</p><p class="ctr"><b>${iWon ? '🎉 Bạn thắng!' : v.me ? '😵 Bạn thua rồi…' : ''}</b></p>
    <div class="endgrid">${v.players.map(p => `<div class="ec ${ids.has(p.id) ? 'won' : 'lose'}">${roleCardSVG(p.role)}<div class="nm">${ids.has(p.id) ? '🏆 ' : ''}${esc(clean(p.name))}${p.alive ? '' : ' 💀'}${p.lover ? ' 💘' : ''}</div></div>`).join('')}</div>
    ${coachTipEnd(ctx())}
    <div class="btns"><button class="btn purple" id="e-replay">🎞️ Xem lại cả ván</button>${isHost ? '<button class="btn pri" id="e-again">🔁 Chơi ván mới</button>' : ''}<button class="btn" onclick="__closeModal()">Xem bàn</button></div>`, 'wide', 'end');
  const b = $('#e-again'); if (b) b.onclick = () => { closeModal(); net.restart(); };
  $('#e-replay').onclick = () => openReplay(ctx(), 0);
}
// ---------- thả emoji / chọc nhau (shared/ui/react.js) ----------
const reacts = createReactions({
  send: e => { if (!net) return; if (isHost) net.react('host', e); else net.react(e); },
  seatEl: id => document.querySelector(`.seat[data-pid="${id}"]`),
  myId: () => myId,
  nameOf: id => pname(id),
  mount: $('#react-slot'), place: 'right:10px;bottom:8px',
  phrases: MS_PHRASES,
  onShow: () => fx.sfx.chat(),
});
reacts.setVisible(false);
if (location.hash === '#debug') window.__dbg = () => ({ net, view, sel, tab, modalKey });

// ---------- Tải lại trang: tự khôi phục phòng / tự vào lại ----------
(function resume() {
  const snap = loadSnapshot(), ses = session.load(GAME);
  const lk = linkCode(); // mở link mời phòng khác → vào thẳng phòng đó; link của chính phòng mình → vào lại như thường
  if (lk && !(ses && ses.code === lk)) { linkJoin(lk); return; }
  if (lk) clearLinkCode();
  if (snap && ses && ses.role === 'host') {
    fx.musicResumeIfOn();
    net = new Host((snap.players.find(p => p.id === 'host') || {}).name || myName(), handlers, !!snap.offline, snap); isHost = true; myId = 'host';
    $('#code-box').style.display = snap.offline ? 'none' : '';
    show('screen-lobby'); netStatus('Đã khôi phục phòng ' + (snap.offline ? 'chơi với bot' : snap.code), 'ok'); return;
  }
  if (ses && ses.role === 'client' && ses.code) {
    net = new Client(ses.code, ses.name || myName(), handlers); isHost = false; $('#code-box').style.display = '';
  }
})();
