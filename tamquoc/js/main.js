// Giao diện Tam Quốc Sát + nối với lớp mạng (host-authoritative). Mọi hình vẽ tự làm bằng CSS/SVG/emoji.
import { hintsAllowed, lockToggle, BOT_ONLY_NOTE } from '../../shared/ui/botonly.js?v=1';
import { linkCode, clearLinkCode, inviteUrl, joinByLink } from '../../shared/net/joinlink.js?v=2';
import { CARD_INFO, GENERALS, SKILLS, KINGDOMS, ROLES, SUIT_SYMBOL, SUIT_NAME, cardLabel, cardName, rankLabel, rolesFor, infoOf } from './cards.js?v=7';
import { JUDGE_TEXT } from './engine.js?v=7';
import { Host, Client, loadSnapshot, session, MAX, MIN, TQ_PHRASES, TRAIN_OPTS } from './net.js?v=20';
import { createReactions } from '../../shared/ui/react.js?v=2';
import { netStatus } from '../../shared/ui/status.js';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=130';
import { syncPick, endPick, pickActive } from '../../shared/ui/seatpick.js?v=1';
import { portrait, blankPortrait, cardHTML, backHTML, generalCardHTML, kindTag, iconsFor, emoOf } from './art.js?v=9';
import * as fx from './fx.js?v=8';
import { musicToggle, musicIsOn, musicVolume, musicResumeIfOn, musicIntensity, musicStinger } from './music.js?v=8';
import { openGuide as guide } from './guide.js?v=10';
import { SKILL_HELP, SKILL_TYPE } from './skillhelp.js?v=7';
import { PHASE_HELP } from './coach.js?v=7';

const GAME = 'tamquoc';
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const suitify = s => String(s).replace(/([♥♦])/g, '<span class="red">$1</span>');
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const isTouch = matchMedia('(hover: none)').matches;

let net = null, isHost = false, myId = null, view = null, prev = null, lobby = [];
let lobbyOpts = { exp: true, expGen: true };
let ui = null, askSig = '', modalSig = '', lastEv = 0, autoPass = null, introShown = false, endShown = false;

// ======================= MÀN HÌNH =======================
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id)); if (id !== 'screen-game') { musicIntensity(-1); endPick(); } }
let toastT;
function toast(msg, kind = '') { const t = $('#toast'); t.innerHTML = suitify(esc(msg)); t.className = 'toast ' + kind; clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2800); }
function openModal(html, cls = '') { $('#modal-box').innerHTML = html; $('#modal-box').className = 'modal-box ' + cls; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); modalSig = modalSig ? 'closed:' + modalSig : ''; }
const modalOpen = () => !$('#modal').classList.contains('hidden');
window.__closeModal = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
const openGuide = () => guide(openModal, closeModal);

// ======================= TRANG CHỦ =======================
$('#name').value = ls.get('bgvn-name') || '';
function myName() { const n = $('#name').value.trim() || 'Bạn'; ls.set('bgvn-name', n); return n; }
(() => {
  const ids = ['guanyu', 'caocao', 'zhouyu', 'diaochan', 'zhugeliang'];
  $('#hero').innerHTML = ids.map((g, i) => `<div class="hero-g" style="--r:${(i - 2) * 9}deg;--i:${i - 2};--y:${Math.abs(i - 2) * 8}px;--d:${i * 90}ms;z-index:${5 - Math.abs(i - 2)}">${portrait(g)}</div>`).join('')
    + `<div class="hero-c">${cardHTML({ id: 'h1', type: 'sat', suit: 'S', rank: 7 }, 'sm')}</div><div class="hero-c r">${cardHTML({ id: 'h2', type: 'dao', suit: 'H', rank: 3 }, 'sm')}</div>`;
})();
const handlers = {
  onLobby(info, code, started, opts) { lobby = info; if (opts) lobbyOpts = opts; renderSettings(); $('#room-code').textContent = code; renderLobby(); if (!started) { if (view) { view = null; prev = null; } closeModal(); show('screen-lobby'); } },
  onState(v) { onState(v); },
  onError(m) { toast(m, 'bad'); fx.sfx.bad(); if (pending) { pending = false; if (view) render(); } },
  onJoined(id) { myId = id; },
  onDisconnect() { toast('Mất kết nối với chủ phòng – đang tự vào lại…'); },
  onNet(t, k, retry) { netStatus(t, k, retry); },
  onReact(msg) { reacts.show(msg); },
};
function startHost(offline, training = false) {
  musicResumeIfOn();
  if (net && net.leave) net.leave();
  net = new Host(myName(), handlers, offline); isHost = true; myId = 'host';
  if (training) net.setOpts(TRAIN_OPTS);
  if (hintPref() != null) net.setHints('host', hintPref());
  if (offline) { session.save(GAME, { role: 'host', code: 'OFFLINE' }); for (let i = 0; i < (training ? 3 : 4); i++) net.addBot(); }
  $('#code-box').style.display = offline ? 'none' : '';
  if (/debug/.test(location.hash)) window.__net = net;
  show('screen-lobby'); renderLobby();
}
$('#btn-offline').onclick = () => startHost(true);
$('#btn-train').onclick = () => startHost(true, true);
$('#btn-create').onclick = () => startHost(false);
$('#btn-join').onclick = () => {
  const code = $('#join-code').value.trim().toUpperCase(); if (code.length !== 5) { toast('Mã phòng gồm 5 ký tự nhé.'); return; }
  musicResumeIfOn(); if (net && net.leave) net.leave();
  net = new Client(code, myName(), handlers, hintPref()); isHost = false; $('#code-box').style.display = ''; $('#room-code').textContent = code;
  lobby = []; show('screen-lobby'); renderLobby(); $('#wait-msg').textContent = 'Đang kết nối…';
};
$('#join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-join').click(); });
// link mời ?room=MÃ (shared/net/joinlink.js): mở link là vào thẳng phòng
const qcode = linkCode(); if (qcode) $('#join-code').value = qcode;
function linkJoin(code) { $('#join-code').value = code; joinByLink({ code, toast: m => toast(m), join: n => { $('#name').value = n; $('#btn-join').click(); }, abort: () => leave() }); }
function leave() { reacts.setVisible(false); if (net) (net.leave ? net.leave() : net.destroy()); net = null; view = null; prev = null; lobby = []; closeModal(); history.replaceState(null, '', location.pathname); show('screen-home'); }
$('#btn-leave-lobby').onclick = leave;
$('#btn-leave').onclick = () => {
  openModal(`<h2>Rời ván?</h2><p class="center-txt">${isHost ? 'Bạn là chủ phòng – rời đi sẽ kết thúc ván cho mọi người.' : 'Bot sẽ đánh thay bạn. Có thể vào lại bằng mã phòng.'}</p><div class="row"><button class="btn" id="m-stay">Ở lại</button><button class="btn red" id="m-leave">Rời ván</button></div>`);
  $('#m-stay').onclick = closeModal; $('#m-leave').onclick = leave;
};
$('#btn-copy').onclick = () => { const url = inviteUrl($('#room-code').textContent); navigator.clipboard?.writeText(url).then(() => toast('Đã chép link mời 📋', 'ok'), () => toast(url)); };
$('#btn-addbot').onclick = () => net && net.addBot && net.addBot();
$('#opt-exp').onchange = $('#opt-gen').onchange = $('#opt-train').onchange = () => { if (isHost && net && net.setOpts) net.setOpts({ exp: $('#opt-exp').checked, expGen: $('#opt-gen').checked, training: $('#opt-train').checked }); };
$('#btn-start').onclick = () => { musicResumeIfOn(); net && net.start && net.start(); };
$('#btn-guide-home').onclick = $('#btn-guide').onclick = $('#btn-guide2').onclick = openGuide;
$('#btn-news-home').onclick = $('#btn-news').onclick = () => { openNews('tamquoc'); $('#btn-news-home').classList.remove('bgvn-dot'); $('#btn-news').classList.remove('bgvn-dot'); };
newsBadge($('#btn-news-home'), 'tamquoc'); newsBadge($('#btn-news'), 'tamquoc');
$('#btn-log').onclick = () => $('#log').classList.toggle('hidden');
$('#btn-log-close').onclick = () => $('#log').classList.add('hidden');

// ---- cài đặt: tốc độ, nhạc, âm thanh ----
function renderSettings() {
  const k = fx.getSpeed(); const opts = Object.entries(fx.SPEEDS).map(([key, v]) => `<option value="${key}"${key === k ? ' selected' : ''}>⏱ ${v.name}</option>`).join('');
  $('#speed').innerHTML = opts; $('#speed-home').innerHTML = opts;
  const on = musicIsOn(); $('#btn-music-home').textContent = `🎵 Nhạc: ${on ? 'bật' : 'tắt'}`; $('#btn-music-home').classList.toggle('on', on); $('#btn-music').style.opacity = on ? 1 : .45;
  $('#btn-mute').textContent = fx.isMuted() ? '🔇' : '🔊';
  const ho = hintsActive(); $('#btn-hint').classList.toggle('on', ho); $('#btn-hint').innerHTML = `💡<small>${!hintOk() ? 'Gợi ý: chỉ khi chơi với bot' : ho ? 'Gợi ý: bật' : 'Gợi ý: tắt'}</small>`; lockToggle($('#btn-hint'), !hintOk());
}
$('#speed').onchange = $('#speed-home').onchange = e => { fx.setSpeed(e.target.value); renderSettings(); };
$('#btn-music-home').onclick = $('#btn-music').onclick = () => { musicToggle(); renderSettings(); if (view) musicMood(view); };
$('#vol').value = musicVolume(); $('#vol').oninput = e => musicVolume(+e.target.value);
$('#btn-mute').onclick = () => { fx.toggleMute(); renderSettings(); };
// ---- gợi ý (💡): lựa chọn riêng mỗi người, nhớ trong trình duyệt; Tập chơi thì mặc định bật ----
const HINT_KEY = 'bgvn-tq-hints';
function hintPref() { const v = ls.get(HINT_KEY); return v === '1' ? true : v === '0' ? false : null; }
// gợi ý / thầy đồ chỉ có khi chơi với bot: phòng có ≥ 2 người thật thì tắt (chủ phòng cũng không tính gợi ý – xem net.js hintFor)
const hintOk = () => hintsAllowed(lobby && lobby.length ? lobby : view && view.players);
function hintsActive() { if (!hintOk()) return false; const p = hintPref(); return p != null ? p : !!((view && view.opts && view.opts.training) || (!view && lobbyOpts.training)); }
$('#btn-hint').onclick = () => {
  if (!hintOk()) { toast('💡 Gợi ý: ' + BOT_ONLY_NOTE, 'info'); return; }
  const on = !hintsActive(); ls.set(HINT_KEY, on ? '1' : '0');
  if (net) { if (isHost) net.setHints(myId, on); else if (net.setHints) net.setHints(on); }
  renderSettings(); toast(on ? '💡 Đã bật gợi ý: lá nên đánh sẽ sáng vàng kèm lý do' : 'Đã tắt gợi ý', 'info'); if (view) render();
};
$('#btn-more').onclick = e => { e.stopPropagation(); $('#tb-opts').classList.toggle('open'); };
document.addEventListener('click', e => { if (!e.target.closest('#tb-opts') && !e.target.closest('#btn-more')) $('#tb-opts').classList.remove('open'); });
document.addEventListener('pointerdown', () => musicResumeIfOn(), { once: true });
renderSettings();

// ======================= SẢNH =======================
const AVC = ['#d6452f', '#3a6fd8', '#2f9e5b', '#e0a83a', '#8a5cd6', '#d64f8a', '#2a9bb0', '#7d808c'];
function renderLobby() {
  const ul = $('#plist'); ul.innerHTML = '';
  lobby.forEach((p, i) => {
    const li = el('li', '', `<span class="av" style="background:${AVC[i % AVC.length]}">${esc((p.name || '?').replace(' 🤖', '').slice(0, 1).toUpperCase())}</span><span class="nm">${esc(p.name)}${p.id === 'host' ? ' <small>👑 chủ phòng</small>' : ''}${p.id === myId ? ' <small>(bạn)</small>' : ''}${p.connected === false ? ' <small class="off">(mất kết nối)</small>' : ''}</span>`);
    if (isHost && p.id !== 'host') { const b = el('button', 'x', '✕'); b.title = p.isBot ? 'Xoá bot' : 'Mời ra'; b.onclick = () => net.removePlayer(p.id); li.appendChild(b); }
    ul.appendChild(li);
  });
  const n = lobby.length;
  $('#pcount').textContent = `${n}/${MAX}`;
  const roles = rolesFor(Math.max(MIN, Math.min(MAX, n || MIN)));
  $('#role-preview').innerHTML = (n >= MIN ? roles.map(r => `<span class="rchip r-${r}"><i class="seal">${SEAL[r]}</i>${ROLES[r].name}</span>`).join('') : '<span class="muted">Cần ít nhất 2 người.</span>')
    + `<div class="role-desc">${[...new Set(roles)].map(r => `<p><b>${ROLES[r].icon} ${ROLES[r].name}:</b> ${ROLES[r].desc}</p>`).join('')}</div>`;
  $('#opt-exp').checked = lobbyOpts.exp !== false; $('#opt-gen').checked = lobbyOpts.expGen !== false; $('#opt-train').checked = !!lobbyOpts.training;
  $('#opt-exp').disabled = $('#opt-gen').disabled = $('#opt-train').disabled = !isHost;
  $('#btn-addbot').style.display = isHost ? '' : 'none'; $('#btn-addbot').disabled = n >= MAX;
  $('#btn-start').style.display = isHost ? '' : 'none'; $('#btn-start').disabled = n < MIN || n > MAX;
  $('#wait-msg').textContent = isHost ? (n < MIN ? 'Thêm bot hoặc mời bạn bè (2–8 người).' : `Sẵn sàng! ${n} người – bấm Bắt đầu.`) : (n ? 'Đang chờ chủ phòng bắt đầu…' : 'Đang kết nối…');
}

// ======================= STATE =======================
let pending = false, pendT = 0;
function send(a) {
  ui = null; if (!net) return;
  pending = true; clearTimeout(pendT); pendT = setTimeout(() => { if (pending) { pending = false; if (view) render(); } }, 4000);
  if (isHost) net.act('host', a); else net.act(a);
  if (pending && view) render(); // chờ chủ phòng trả lời: khoá nút để khỏi bấm 2 lần
}
const P = id => view && view.players.find(p => p.id === id);
const me = () => P(myId);
const nameOf = id => { const p = P(id); return p ? (p.id === myId ? 'Bạn' : p.name) : '?'; };
const nmB = id => `<b>${esc(nameOf(id))}</b>`;
function sigOf(v) { const a = v && v.ask; if (!a) return ''; return [v.turnCount, a.task, a.type, a.purpose || '', a.type === 'general' ? '' : (a.players || []).join(','), a.need ?? '', a.count ?? '', a.forWho || '', a.src || '', a.tgt || '', a.from || '', a.trick || '', a.n ?? '', (a.cards || []).length].join('|'); }

function onState(v) {
  if (!v) { view = null; prev = null; closeModal(); show('screen-lobby'); renderLobby(); return; }
  pending = false;
  const first = !view || !$('#screen-game').classList.contains('active');
  prev = first ? null : view; view = v;
  if (!myId && isHost) myId = 'host';
  const sig = sigOf(v); if (sig !== askSig) { askSig = sig; ui = initUi(v); }
  if (first) { show('screen-game'); lastEv = v.ev.length ? v.ev[v.ev.length - 1].n : 0; introShown = !!(me() && me().general && v.turnCount > 0); endShown = v.phase === 'ended'; }
  setTimer(v.phase === 'playing' ? v.timer : null);
  if (first) renderSettings();
  reacts.setVisible(v.phase === 'playing' || v.phase === 'ended');
  render();
  maybeReveal(v);
  if (!first) playEvents(v); else lastEv = v.ev.length ? v.ev[v.ev.length - 1].n : 0;
  autoModal();
  autoPassCheck();
  musicMood(v);
  if (v.phase === 'ended' && !endShown) { endShown = true; setTimeout(showResults, 1800 * fx.S()); }
}
function initUi(v) {
  const a = v.ask; if (!a || !a.mine) return null;
  if (a.type === 'discard') return { k: 'discard', ids: [] };
  if (a.type === 'liuli') return { k: 'liuli', cardId: null, target: null };
  if (a.type === 'targets') return { k: 'targets', ids: [] };
  if (a.type === 'show') return { k: 'show' };
  return null;
}

// ======================= RENDER =======================
const PH = [['start', 'Đầu', 'Chuẩn bị'], ['judge', 'Phán', 'Phán định'], ['draw', 'Rút', 'Rút bài'], ['play', 'Ra bài', 'Ra bài'], ['discard', 'Bỏ', 'Bỏ bài'], ['end', 'Cuối', 'Kết thúc']];
function render() {
  const v = view; if (!v) return;
  const cur = v.players[v.turn];
  $('#turn-info').innerHTML = v.phase === 'ended' ? 'Ván đã kết thúc' : v.turnCount ? `Lượt ${v.turnCount} · <b>${esc(cur.id === myId ? 'Bạn' : cur.name)}</b>` : 'Chọn võ tướng';
  $('#phases').innerHTML = v.turnCount && v.phase === 'playing' ? PH.map(([k, s, full]) => `<span data-ph="${k}" class="${v.ph === k ? 'on' : ''}${k === 'play' && v.skipPlay ? ' skip' : ''}" title="${full} – bấm để xem giải thích">${s}</span>`).join('') : '';
  renderCoach(); renderSeats(); renderCenter(); renderMe(); renderHand(); renderActions(); markHint(); renderLog();
  requestAnimationFrame(fitCenter);
}

// ---- ghế quanh bàn ----
const SEATS = { // ngang: % theo chiều kim đồng hồ từ trái-dưới lên trên sang phải-dưới
  1: [[50, 13]], 2: [[24, 16], [76, 16]], 3: [[9, 56], [50, 12], [91, 56]], 4: [[9, 62], [31, 13], [69, 13], [91, 62]],
  5: [[7, 68], [17, 22], [50, 11], [83, 22], [93, 68]], 6: [[6, 74], [11, 32], [34, 11], [66, 11], [89, 32], [94, 74]],
  7: [[6, 84], [8, 37], [26, 12], [50, 10], [74, 12], [92, 37], [94, 84]],
};
const SEATS_P = { // dọc (điện thoại)
  1: [[50, 12]], 2: [[27, 13], [73, 13]], 3: [[15, 48], [50, 11], [85, 48]], 4: [[15, 64], [27, 13], [73, 13], [85, 64]],
  5: [[14, 74], [14, 40], [50, 10], [86, 40], [86, 74]], 6: [[14, 82], [14, 50], [28, 14], [72, 14], [86, 50], [86, 82]],
  7: [[13, 85], [13, 58], [15, 30], [50, 10], [85, 30], [87, 58], [87, 85]],
};
function seatOrder() { const ps = view.players; const i = Math.max(0, ps.findIndex(p => p.id === myId)); return ps.slice(i).concat(ps.slice(0, i)); }
const seatEl = pid => document.querySelector(`.seat[data-pid="${pid}"]`);
function hpBar(p, big = false) {
  if (!p.maxHp) return '<div class="hp"></div>';
  const r = p.hp / p.maxHp, c = r > .66 ? 'g' : r > .34 ? 'y' : 'r';
  if (p.maxHp > 5 && !big) return `<div class="hp num ${c}"><i class="on ${c}"></i><b>${Math.max(0, p.hp)}/${p.maxHp}</b></div>`;
  let s = ''; for (let i = 0; i < p.maxHp; i++) s += `<i class="${i < p.hp ? 'on ' + c : ''}"></i>`;
  return `<div class="hp ${big ? 'big' : ''}">${s}</div>`;
}
const SEAL = { lord: '主', loyal: '忠', rebel: '反', spy: '內' };
// cờ nước: chữ Hán + tên Việt (Ngụy/Thục/Ngô/Quần)
const kflag = k => k && KINGDOMS[k] ? `<span class="kflag" title="Nước ${KINGDOMS[k].name}"><b>${KINGDOMS[k].han}</b>${KINGDOMS[k].name}</span>` : '';
function roleChip(p) {
  if (p.role) return `<span class="rchip r-${p.role}"><i class="seal">${SEAL[p.role]}</i>${ROLES[p.role].name}</span>`;
  return '<span class="rchip r-hidden"><i class="seal">?</i>Chưa lộ</span>';
}
function equipIcons(p) {
  const out = [];
  for (const k of ['weapon', 'armor', 'plus', 'minus']) { const c = p.equip[k]; if (!c) continue; const i = CARD_INFO[c.type]; out.push(`<span class="eqi e-${k}" title="${esc(cardName(c))}">${emoOf(c.type)}${k === 'weapon' ? `<b>${i.range}</b>` : k === 'plus' ? '<b>+1</b>' : k === 'minus' ? '<b>−1</b>' : ''}</span>`); }
  return out.join('');
}
function statusBadges(p, long = false) {
  const f = p.flags || {}; const b = [];
  if (f.drunk) b.push(['🍶', 'Say rượu', 'Sát kế tiếp lượt này +1 sát thương']);
  if (f.chained) b.push(['⛓️', 'Bị xích', 'Chịu sát thương lửa/sét sẽ lan sang người bị xích khác']);
  if (f.flipped) b.push(['🏰', 'Lật úp', 'Bỏ qua lượt kế tiếp']);
  if (p.scars && p.scars.length) b.push(['🩹', p.scars.length + ' vết sẹo', 'Bất khuất: ' + p.scars.map(c => rankLabel(c.rank)).join(' ')]);
  if (!b.length) return '';
  return `<span class="stb${long ? ' long' : ''}">${b.map(x => `<i title="${x[1]}: ${x[2]}">${x[0]}${long ? `<small>${x[1]}</small>` : ''}</i>`).join('')}</span>`;
}
function judgeIcons(p) { return p.judge.map(j => `<span class="jdi" title="${CARD_INFO[j.as].name}">${CARD_INFO[j.as].emo}</span>`).join(''); }
function targetInfo() {
  // các ghế đang chọn được + các ghế đã chọn
  const v = view, a = v.ask; if (!ui) { if (a && a.mine && a.type === 'targets') return null; return null; }
  if (ui.k === 'use') return { can: ui.opt.targets, sel: ui.targets };
  if (ui.k === 'jiedao') return ui.a ? { can: ui.opt.second[ui.a] || [], sel: [ui.a], fixed: ui.a } : { can: ui.opt.targets, sel: [] };
  if (ui.k === 'skill') return { can: ui.opt.targets, sel: ui.targets };
  if (ui.k === 'liuli') return { can: a.candidates, sel: ui.target ? [ui.target] : [] };
  if (ui.k === 'targets') return { can: a.candidates, sel: ui.ids };
  return null;
}
function renderSeats() {
  const v = view, table = $('#table');
  table.querySelectorAll('.seat').forEach(s => s.remove());
  const order = seatOrder(); const n = order.length - 1; if (n < 1) return;
  const portraitMode = table.clientWidth < table.clientHeight * 1.15;
  const L = (portraitMode ? SEATS_P : SEATS)[Math.min(7, n)];
  const cur = v.players[v.turn]; const a = v.ask;
  const waiting = a && a.type !== 'nullify' ? a.players : [];
  const ti = targetInfo();
  const TH = table.clientHeight, TW = table.clientWidth;
  // bàn thấp mà đông người: ghế gọn (chân dung nằm bên trái)
  const side = portraitMode ? (n >= 7 ? 3 : n >= 5 ? 2 : 1) : (n >= 6 ? 2 : 1);
  const compact = (!portraitMode && innerHeight <= 500 && n >= 3) || TH / (side + (portraitMode ? .9 : .6)) < (innerWidth <= 760 ? 104 : 128);
  order.slice(1).forEach((p, k) => {
    const [x, y] = L[k] || [50, 10];
    const g = p.general ? GENERALS[p.general] : null;
    const dying = a && a.purpose === 'dying' && a.forWho === p.id;
    const seat = el('div', `seat${compact ? ' compact' : ''}${p.flags && p.flags.chained ? ' chained' : ''}${p.flags && p.flags.flipped ? ' flipped' : ''} k-${p.kingdom || 'none'}${p.id === cur.id && v.turnCount ? ' current' : ''}${!p.alive ? ' dead' : ''}${waiting.includes(p.id) ? ' waiting' : ''}${dying ? ' dying' : ''}`);
    seat.dataset.pid = p.id;
    const top = Math.min(Math.max(y / 100 * TH, portraitMode ? 46 : 64), TH - (portraitMode ? 46 : 60));
    seat.style.left = Math.min(Math.max(x / 100 * TW, 40), TW - 40) + 'px'; seat.style.top = top + 'px';
    const conn = v.conn && v.conn[p.id];
    seat.innerHTML = `<div class="ava">${g ? portrait(p.general) : blankPortrait()}${p.distance != null && p.alive ? `<span class="dist${p.inRange ? ' in' : ''}" title="Khoảng cách từ bạn">${p.distance}</span>` : ''}${!p.alive ? '<span class="rip">☠</span>' : ''}${conn === 'off' ? '<span class="conn" title="Mất kết nối – bot đánh thay">📴</span>' : conn === 'afk' ? '<span class="conn" title="Treo máy – bot đánh thay">💤</span>' : ''}${p.flags && p.flags.luoyi ? '<span class="buff" title="Lỏa y">💪</span>' : ''}${statusBadges(p)}</div>
      <div class="plate"><div class="pname">${esc(p.name)}</div><div class="gname">${g ? g.name : 'đang chọn…'}</div>${hpBar(p)}
        <div class="meta">${kflag(p.kingdom)}<span class="hc" title="Lá trên tay"><i></i>${p.handCount}</span>${equipIcons(p)}${judgeIcons(p)}</div>${roleChip(p)}</div>`;
    if (ti) {
      if (ti.sel.includes(p.id)) seat.classList.add('selected');
      if (ti.can.includes(p.id) && p.id !== ti.fixed) { seat.classList.add('targetable'); seat.onclick = () => clickSeat(p.id); }
      else if (p.id === ti.fixed) seat.onclick = () => { ui.a = null; render(); };
      else { seat.classList.add('out'); seat.onclick = () => toast(outReason(p)); }
    } else seat.onclick = () => showPlayer(p);
    table.appendChild(seat);
    // giữ ghế trong khung bàn (đo chiều cao thật)
    const hh = seat.offsetHeight / 2, hw = seat.offsetWidth / 2;
    seat.style.top = Math.min(Math.max(top, hh + 2), TH - hh - 2) + 'px';
    seat.style.left = Math.min(Math.max(parseFloat(seat.style.left), hw + 2), TW - hw - 2) + 'px';
  });
  syncSeatPick(ti);
}
// chọn mục tiêu ngay trên bàn: ghế hợp lệ sáng + 🎯 (Tab/Enter được), ghế mờ ghi lý do ngắn (khoảng cách/tầm), Esc = huỷ
function shortWhy(p) {
  const as = ui && ui.as, d = p.distance;
  if (ui && ui.k === 'jiedao' && !ui.a && !(p.equip && p.equip.weapon)) return 'không có vũ khí';
  if (as === 'sat' && d != null) return `cách ${d} > tầm ${me().range}`;
  if ((as === 'shunshou' || as === 'bingliang') && d != null) return `cách ${d} > 1`;
  if (d != null && p.inRange === false && ui && (ui.k === 'liuli' || (ui.k === 'skill' && ui.sk === 'xamau'))) return `ngoài tầm (cách ${d})`;
  return 'không chọn được';
}
function syncSeatPick(ti) {
  if (!ti || !view || view.phase !== 'playing') { if (pickActive()) endPick(); return; }
  const mine = ui.k === 'use' || ui.k === 'jiedao' || ui.k === 'skill';
  const pt = promptText();
  const single = (ui.k === 'use' && ui.opt.max === 1) || ui.k === 'jiedao';
  syncPick({
    key: 'tq-' + ui.k + '-' + (ui.cid || ui.sk || askSig), root: $('#table'), seat: id => $(`#table .seat[data-pid="${id}"]`), glow: '.ava', keep: true,
    banner: single, anchor: () => $('#actions'), z: 58, mark: el => el.classList.contains('compact') ? 'right' : 'left',
    title: single ? pt.t.replace(/^👉 Chọn mục tiêu cho/, '🎯 Chạm vào mục tiêu cho').replace('Chọn người', 'Chạm vào người') : `${pt.t} <b>(${ti.sel.length}/${ui.opt ? ui.opt.max || ui.opt.tmax : ''})</b>`,
    cancelable: mine, onCancel: () => { ui = null; render(); },
    items: view.players.filter(p => p.alive && p.id !== myId).map(p => {
      if (p.id === ti.fixed) return { id: p.id, name: p.name, ok: true, sel: true };
      const ok = ti.can.includes(p.id); return { id: p.id, name: p.name, ok, sel: ti.sel.includes(p.id), reason: ok ? '' : shortWhy(p) };
    }),
    onPick: id => { if (!ui) return; if (ti.fixed && id === ti.fixed) { ui.a = null; render(); } else clickSeat(id); },
  });
}
function outReason(p) {
  if (!p.alive) return `${p.name} đã tử trận.`;
  if (ui && (ui.k === 'use') && ui.as === 'sat') return `${p.name} ngoài tầm đánh (cách ${p.distance}, tầm của bạn ${me().range}).`;
  if (ui && ui.k === 'use' && ui.as === 'shunshou') return `${p.name} cách bạn ${p.distance} – Thuận thủ chỉ với tới người cách 1.`;
  return `Không chọn ${p.name} được.`;
}
// Đẩy khu giữa bàn xuống / thu hẹp nếu ghế đè lên
function fitCenter() {
  const table = $('#table'), c = $('#center'); if (!table || !c) return;
  c.style.setProperty('--cpush', '0px'); c.style.maxWidth = ''; c.classList.remove('tight', 'tight2');
  const tr = table.getBoundingClientRect(); let cr = c.getBoundingClientRect(); let push = 0;
  const seats = [...table.querySelectorAll('.seat')].map(s => s.getBoundingClientRect());
  for (const r of seats) { if (r.right < cr.left + 4 || r.left > cr.right - 4) continue; if (r.top + r.height / 2 < cr.top + cr.height / 2) push = Math.max(push, r.bottom + 6 - cr.top); }
  const room = Math.max(0, tr.bottom - cr.bottom - 4);
  c.style.setProperty('--cpush', Math.round(Math.min(push, room)) + 'px');
  cr = c.getBoundingClientRect(); const mid = cr.left + cr.width / 2; let half = cr.width / 2;
  for (const r of seats) {
    if (r.bottom < cr.top || r.top > cr.bottom) continue;
    if (r.right > cr.left && r.right < mid) half = Math.min(half, mid - r.right - 9);
    if (r.left < cr.right && r.left > mid) half = Math.min(half, r.left - mid - 9);
  }
  if (half < cr.width / 2) c.style.maxWidth = Math.max(130, Math.round(half * 2)) + 'px';
  // vẫn tràn xuống dưới bàn → ẩn dòng nhật ký, rồi rút gọn lời nhắc
  if (c.getBoundingClientRect().bottom > tr.bottom + 2) c.classList.add('tight');
  if (c.getBoundingClientRect().bottom > tr.bottom + 2) c.classList.add('tight2');
}
addEventListener('resize', () => { if (view) render(); });

// ---- giữa bàn ----
function renderCenter() {
  const v = view;
  $('#deck').innerHTML = backHTML('sm') + `<span class="cnt">${v.deckCount}</span>`;
  $('#discard').innerHTML = v.discardTop ? cardHTML(v.discardTop, 'sm') : '<div class="pile-empty">Chồng bỏ</div>';
  const d = $('#discard').querySelector('.qcard'); if (d) bindCard(d, v.discardTop);
  renderPrompt();
  const lines = v.log.filter(l => !/^— Lượt|^Ván mới|^Mỗi người nhận/.test(l)).slice(-3);
  $('#feed').innerHTML = lines.map((l, i) => `<div class="${i === lines.length - 1 ? 'new' : ''}">${suitify(esc(l))}</div>`).join('');
}
const TRICK_EMO = t => CARD_INFO[t] ? `${CARD_INFO[t].emo} ${CARD_INFO[t].name}` : t;
function promptText() {
  const v = view, a = v.ask, m = me();
  if (v.phase === 'ended') return { t: '🏆 Ván đã kết thúc', s: winText(v.winner) };
  if (!a) return { t: '…' };
  const who = (a.players || [])[0]; const mine = a.mine;
  switch (a.type) {
    case 'general': return mine ? { t: '🎴 Chọn võ tướng của bạn', s: 'Bấm nút bên dưới nếu lỡ đóng bảng chọn.', mine, btn: ['Chọn tướng', showGeneralPick] } : { t: a.players.length === 1 ? `⏳ Chúa công ${nmB(who)} đang chọn tướng…` : '⏳ Mọi người đang chọn tướng…' };
    case 'play': {
      if (!mine) return { t: `⏳ ${nmB(who)} đang ra bài…`, q: true };
      if (ui && (ui.k === 'use' || ui.k === 'jiedao')) {
        const nmc = CARD_INFO[ui.as].name;
        if (ui.as === 'tiesuo') return { t: '⛓️ Thiết tác liên hoàn', s: 'Chọn 1–2 người để xích / gỡ xích (bấm chân dung để chọn mình), hoặc bấm "Trùng chú" để bỏ lá này rút 1 lá.', mine };
        if (ui.k === 'jiedao') return { t: ui.a ? `🔪 Chọn người để ${nmB(ui.a)} phải chém` : '🔪 Chọn người có vũ khí để mượn dao', mine };
        return { t: `👉 Chọn mục tiêu cho <b>${nmc}</b>`, s: ui.opt.max > 1 ? `Tối đa ${ui.opt.max} người – bấm xác nhận khi xong.` : 'Bấm vào ghế sáng viền đỏ. Ghế mờ là không chọn được.', mine };
      }
      if (ui && ui.k === 'skill') return { t: `✨ ${SKILLS[ui.sk] ? SKILLS[ui.sk].name : 'Xà mâu'}`, s: skillHint(ui) + (ui.opt.targets.includes(myId) ? ' Bấm chân dung của bạn để chọn chính mình.' : ''), mine };
      const inr = v.players.filter(q => q.inRange).map(q => esc(q.name));
      return { t: '<b>Lượt của bạn!</b> Bấm lá sáng màu để dùng.', s: `🎯 Tầm đánh ${m.range}: ${inr.length ? inr.join(', ') : 'chưa với tới ai'} · Sát còn ${slashLeft()}`, mine, hint: true };
    }
    case 'card': return cardPrompt(a);
    case 'nullify': {
      const t = `${TRICK_EMO(a.trick)}${a.src ? ' của ' + nmB(a.src) : ''}${a.tgt ? ' → ' + nmB(a.tgt) : ''}`;
      return mine ? { t: `🚫 Dùng Vô giải khả kích?`, s: `${t}${a.count ? ` (đã bị Vô giải ${a.count} lần – ${a.count % 2 ? 'đang bị huỷ' : 'đang có hiệu lực'})` : ''}`, mine } : { t: '🚫 Chờ xem có ai Vô giải…', s: t, q: true };
    }
    case 'discard': {
      const nb = a.n;
      if (a.purpose === 'phase') return mine ? { t: `🗑️ Bỏ bớt ${nb} lá`, s: `Cuối lượt chỉ giữ số lá bằng số máu (${m.hp}). Chọn ${nb} lá ở tay rồi bấm nút.`, mine } : { t: `${nmB(who)} đang bỏ bớt ${nb} lá…`, q: true };
      if (a.purpose === 'songco') return mine ? { t: '⚔️ Thư hùng song kiếm!', s: `Bỏ 1 lá trên tay, hoặc để ${nmB(a.src)} rút 1 lá.`, mine } : { t: `${nmB(who)} chọn: bỏ 1 lá hay cho rút 1 lá…` };
      if (a.purpose === 'cuonglie') return mine ? { t: '👁️ Cương liệt phản đòn!', s: `Bỏ 2 lá trên tay, hoặc chịu mất 1 máu do ${nmB(a.src)}.`, mine } : { t: `${nmB(who)} chọn: bỏ 2 lá hay mất 1 máu…` };
      if (a.purpose === 'huogong') return mine ? { t: '🎇 Hỏa công', s: suitify(`${nmB(a.tgt)} lật ${a.shown ? cardLabel(a.shown) : ''}. Bỏ 1 lá ${SUIT_SYMBOL[a.suit]} trên tay để đốt họ 1 máu?`), mine } : { t: `${nmB(who)} đang tìm lá ${SUIT_SYMBOL[a.suit]} để đốt…` };
      if (a.purpose === 'guanshi') return mine ? { t: '🪓 Quán thạch phủ', s: `${nmB(a.tgt)} đã Né. Bỏ 2 lá (tay/trang bị) để Sát vẫn trúng?`, mine } : { t: `${nmB(who)} đang tính bổ rìu…` };
      return { t: `${nmB(who)} đang bỏ bài…` };
    }
    case 'pick': return mine ? { t: `${a.mode === 'take' ? '✋ Lấy' : '🗑️ Phá'} 1 lá của ${nmB(a.from)}`, mine, btn: ['Mở bảng chọn', showPick] } : { t: `${nmB(who)} đang chọn lá của ${nmB(a.from)}…` };
    case 'guanxing': return mine ? { t: '🪶 Quan tinh: sắp xếp chồng bài', mine, btn: ['Mở bảng xếp', showGuanxing] } : { t: `🪶 ${nmB(who)} [Quan tinh] đang xem ${a.count} lá trên cùng…` };
    case 'show':
      if (a.purpose === 'pindian') return mine ? { t: `🀄 Đọ bài với ${nmB(a.vs)}`, s: 'Chọn 1 lá trên tay úp xuống – số lớn hơn thắng (A nhỏ nhất, K lớn nhất; bằng nhau người khởi xướng thua).', mine } : { t: `🀄 ${nmB(who)} đang chọn lá để đọ bài…` };
      return mine ? { t: `🎇 Hỏa công của ${nmB(a.src)}`, s: 'Chọn 1 lá trên tay để lật cho họ xem. Họ bỏ được lá cùng chất thì bạn bị đốt 1 máu.', mine } : { t: `🎇 ${nmB(who)} đang chọn lá để lật (Hỏa công)…` };
    case 'targets': if (a.purpose && a.purpose !== 'duttap') {
      const T = { thantoc: ['💨 Thần tốc', 'Bỏ qua phán định + rút bài để Sát 1 người bất kỳ (không cần tầm)? Chọn người hoặc bỏ qua.'], loikich: ['⚡ Lôi kích', 'Chọn 1 người phán định: ra ♠ thì họ chịu 2 sát thương sét.'], tietmenh: ['📜 Tiết mệnh', 'Chọn 1 người rút bài tới bằng máu tối đa của họ (tối đa 5).'], khuho: ['🐯 Khu hổ thắng!', `Chọn người trong tầm của ${nmB(a.src)} để họ đánh.`] }[a.purpose] || ['Chọn người', ''];
      return mine ? { t: T[0], s: suitify(T[1]) + (a.candidates.includes(myId) ? ' Bấm chân dung của bạn để chọn chính mình.' : ''), mine } : { t: `${nmB(who)} đang dùng ${T[0]}…` };
    }
      return mine ? { t: '🐺 Đột tập', s: 'Chọn tối đa 2 người để lấy 1 lá trên tay mỗi người (thay cho rút bài), hoặc rút bình thường.', mine } : { t: `🐺 ${nmB(who)} [Đột tập] đang chọn người…` };
    case 'yesno':
      if (a.purpose === 'loay') return mine ? { t: '💪 Lỏa y: cởi giáp?', s: 'Rút ít đi 1 lá, đổi lại Sát/Quyết đấu lượt này gây thêm 1 sát thương.', mine } : { t: `${nmB(who)} đang tính cởi giáp…` };
      if (a.purpose === 'cuthu') return mine ? { t: '🏰 Cứ thủ', s: 'Rút 3 lá rồi lật úp tướng (bỏ qua lượt kế tiếp của bạn)?', mine } : { t: `${nmB(who)} đang tính cố thủ…` };
      if (a.purpose === 'nietban') return mine ? { t: '🐦‍🔥 Niết bàn!', s: 'Bỏ hết bài, rút 3 lá và hồi về 3 máu (chỉ 1 lần mỗi ván)?', mine } : { t: `${nmB(who)} đang tính tái sinh…` };
      if (a.purpose === 'hanbing') return mine ? { t: '❄️ Băng phách kiếm', s: `Không gây sát thương cho ${nmB(a.tgt)} mà phá 2 lá của họ?`, mine } : { t: `${nmB(who)} đang cân nhắc Băng phách kiếm…` };
      return { t: '…' };
    case 'liuli': if (a.purpose === 'thienhuong') return mine ? { t: '🌸 Thiên hương: chuyển sát thương?', s: suitify(`Sắp mất ${a.n} máu. Bỏ 1 lá ♥ trên tay${GENERALS[me().general].skills.includes('hongnhan') ? ' (♠ cũng tính là ♥)' : ''} rồi chọn người nhận thay – họ sẽ rút bài bằng số máu đã mất.`), mine } : { t: `🌸 ${nmB(who)} [Thiên hương] đang tính…` };
      return mine ? { t: '🌺 Lưu ly: chuyển Sát?', s: `${nmB(a.src)} Sát bạn. Bỏ 1 lá (tay/trang bị) rồi chọn người trong tầm để nhận Sát thay.`, mine } : { t: `🌺 ${nmB(who)} [Lưu ly] đang tính chuyển Sát…` };
    case 'suit': return mine ? { t: '🎼 Phản gián: đoán chất!', s: `${nmB(a.src)} thách bạn. Đoán sai chất thì mất 1 máu.`, mine, btn: ['Đoán chất', showSuit] } : { t: `🎼 ${nmB(who)} đang đoán chất…` };
    case 'wugu': return mine ? { t: '🌾 Ngũ cốc: chọn 1 lá', mine, btn: ['Mở bảng chọn', showWugu], peek: a.cards } : { t: `🌾 ${nmB(who)} đang chọn từ Ngũ cốc…`, peek: a.cards };
  }
  return { t: '…' };
}
function slashLeft() { const m = me(); const inf = (m.equip.weapon && m.equip.weapon.type === 'zhuge') || (m.general && GENERALS[m.general].skills.includes('baohao')); return inf ? '∞' : Math.max(0, 1 - (view.tf.slashes || 0)); }
function cardPrompt(a) {
  const mine = a.mine, who = a.players[0], src = a.src;
  const want = CARD_INFO[a.want] ? CARD_INFO[a.want].name : 'lá';
  const need = a.need > 1 ? ` (cần ${a.need} lá)` : '';
  const T = {
    sat: `⚔️ ${nmB(src)} Sát ${nmB(who)}!`, wanjian: `🏹 Vạn tiễn tề phát của ${nmB(src)}!`, nanman: `🐘 Nam man xâm nhập của ${nmB(src)}!`,
    duel: `🤺 Quyết đấu: ${nmB(who)} vs ${nmB(src)}`, dying: `🆘 ${nmB(a.forWho)} hấp hối – cần ${a.need} Đào!`, delegate: `📣 ${nmB(a.forWho)} nhờ đánh hộ ${want}`,
    qinglong: '🐉 Thanh long đao: Sát tiếp?', jiedao: `🔪 Tá đao: ${nmB(who)} phải Sát ${nmB(a.target)}`, quytai: `🦊 Quỷ tài: đổi phán định của ${nmB(a.judgeWho)}?`,
  };
  const t = T[a.purpose] || `${nmB(who)} cần đánh ${want}`;
  if (!mine) return { t, s: `Đang chờ ${nmB(who)}…`, q: a.purpose !== 'dying' };
  const S = {
    sat: `Đánh ${want}${need}, không thì mất máu.`, wanjian: 'Đánh 1 Né, không thì mất 1 máu.', nanman: 'Đánh 1 Sát, không thì mất 1 máu.',
    duel: `Đánh ${want}${need}, không thì thua và mất 1 máu.`, dying: a.forWho === myId ? 'Tự ăn Đào (hoặc uống Rượu) để sống tiếp?' : 'Đánh Đào để cứu?', delegate: 'Bạn có thể đánh hộ hoặc bỏ qua.',
    qinglong: 'Đánh thêm 1 Sát vào người vừa Né?', jiedao: `Sát ${nmB(a.target)}, không thì giao vũ khí cho ${nmB(src)}.`,
    quytai: a.judgeCard ? `Lá phán định: ${cardLabel(a.judgeCard)} – ${JUDGE_TEXT[a.why] || ''}. Đánh 1 lá trên tay để thay?` : '',
  };
  return { t, s: suitify(S[a.purpose] || `Đánh ${want}.`), mine };
}
function winText(w) { return ({ lord: '👑 Chúa công và Trung thần thắng!', rebel: '🔥 Phản tặc thắng!', spy: '🎭 Nội gián thắng!' })[w] || ''; }
function renderPrompt() {
  const p = $('#prompt'); const x = promptText();
  p.className = 'prompt' + (x.mine ? ' mine' : '') + (x.q ? ' quiet' : '') + (x.hint ? ' hint' : '');
  // điện thoại / màn thấp: gợi ý thay chỗ lời nhắc giữa bàn (không chiếm thêm chỗ); bấm vào để xem vì sao + "Làm theo"
  const h = coachInline() && liveHint(); p.onclick = null;
  if (h) {
    const st = h.steps[0]; p.classList.add('has-co');
    p.innerHTML = `<div class="pt">💡 <b>${suitify(esc(st.text))}</b> <span class="co-i" aria-hidden="true">ⓘ</span></div><div class="ps">${st.why ? suitify(esc(cap1(st.why))) : ''}${h.steps.length > 1 ? `${st.why ? ' · ' : ''}rồi ${h.steps.slice(1).map(z => esc(z.text)).join(' → ')}` : ''}</div>`;
    p.onclick = e => { if (!e.target.closest('button')) showCoachHelp(); }; p.title = 'Bấm để xem vì sao / làm theo gợi ý';
  } else
  p.innerHTML = `<div class="pt">${x.t}</div>${x.s ? `<div class="ps">${x.s}</div>` : ''}`;
  if (x.peek && x.peek.length) p.insertAdjacentHTML('beforeend', `<div class="peek">${x.peek.map(c => `<span class="pk${/[HD]/.test(c.suit) ? ' red' : ''}">${CARD_INFO[c.type].emo} ${esc(cardName(c))} <small>${SUIT_SYMBOL[c.suit]}${rankLabel(c.rank)}</small></span>`).join('')}</div>`);
  if (x.btn) { const b = el('button', 'btn sm pri', x.btn[0]); b.onclick = () => { modalSig = ''; x.btn[1](); }; const r = el('div', 'row'); r.appendChild(b); p.appendChild(r); }
}
const cap1 = t => t ? t[0].toUpperCase() + t.slice(1) : t;

// ---- 🎓 thầy đồ: gợi ý + giải thích pha ----
let coachNote = null, coachNoteT = 0;
function setCoachNote(html, ms = 6000) { if (coachInline()) { const t = $('#toast'); t.innerHTML = html; t.className = 'toast info'; clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 4200); return; } coachNote = html; clearTimeout(coachNoteT); coachNoteT = setTimeout(() => { coachNote = null; if (view) renderCoach(); }, ms * Math.max(1, fx.S())); if (view) renderCoach(); }
const liveHint = () => { const v = view; if (!v || !hintsActive() || pending || !v.ask || !v.ask.mine || !v.hint || !v.hint.steps || !v.hint.steps.length) return null; if (v.hint.type !== v.ask.type) return null; return v.hint; };
const PH_NAME = { start: 'chuẩn bị', judge: 'phán định', draw: 'rút bài', play: 'ra bài', discard: 'bỏ bài', end: 'kết thúc lượt' };
const coachInline = () => innerWidth <= 760 || innerHeight <= 700;
function doHint(h) { if (modalOpen() && (modalSig === askSig)) closeModal(); ui = null; send(JSON.parse(JSON.stringify(h.steps[0].a))); }
function renderCoach() {
  const box = $('#coach'), v = view, m = me();
  const on = hintsActive() && v && v.phase === 'playing' && m && m.alive && !coachInline();
  box.classList.toggle('hidden', !on); document.body.classList.toggle('coaching', !!on);
  if (!on) { box.innerHTML = ''; return; }
  const h = liveHint(); const cur = v.players[v.turn];
  let main;
  if (h) {
    const st = h.steps[0];
    const more = h.steps.length > 1 ? `<small class="co-more">Sau đó: ${h.steps.slice(1).map((x, i) => `${i + 2}) ${esc(x.text)}`).join(' → ')}</small>` : '';
    main = `<div class="co-tx"><span class="co-n">1</span><b>${suitify(esc(st.text))}</b>${st.why ? `<span class="co-why"> – ${suitify(esc(st.why))}</span>` : ''}${more}</div>`;
  } else if (v.ask && v.ask.mine && pending) main = '<div class="co-tx muted">⏳ Đang gửi…</div>';
  else if (v.ask && v.ask.mine) main = '<div class="co-tx muted">🤔 Thầy đang nghĩ… (bạn cứ tự chọn nhé)</div>';
  else if (!v.turnCount) main = '<div class="co-tx">🎴 Mọi người đang chọn võ tướng. Tướng nhiều máu (4) dễ chơi hơn cho người mới.</div>';
  else main = `<div class="co-tx">⏳ Lượt của <b>${esc(cur.id === myId ? 'bạn' : cur.name)}</b> · pha ${PH_NAME[v.ph] || '…'}. ${cur.id === myId ? '' : 'Xem họ đánh gì; nếu họ nhắm vào bạn, bạn sẽ được hỏi đáp trả.'}</div>`;
  box.innerHTML = `<span class="co-ic" aria-hidden="true">${v.opts && v.opts.training ? '🎓' : '💡'}</span>${coachNote ? `<div class="co-note">${coachNote}</div>` : ''}${main}<div class="co-btns">${h ? '<button class="btn sm pri" id="co-do">👉 Làm theo</button>' : ''}<button class="btn sm ghost co-q" id="co-q" title="Giải thích tình huống và các pha">?</button></div>`;
  if (h) $('#co-do').onclick = () => doHint(h);
  $('#co-q').onclick = () => showCoachHelp();
}
// đánh dấu lá / ghế / nút mà gợi ý nhắc tới
function markHint() {
  const h = liveHint(); if (!h) return;
  h.steps.forEach((st, i) => {
    for (const id of st.cards || []) { const c = document.querySelector(`#hand .qcard[data-cid="${id}"], #me-info .eqc[data-cid="${id}"]`); if (c && !c.classList.contains('hinted')) { c.classList.add('hinted'); c.dataset.step = i + 1; } }
    if (i === 0) for (const pid of st.targets || []) { const se = pid === myId ? $('#me-info .me-ava') : seatEl(pid); if (se) se.classList.add('hint-tgt'); }
  });
  const a = h.steps[0].a; const act = a.type === 'skill' ? 'skill:' + a.skill : a.type === 'targets' && !(a.ids || []).length ? 'targets0' : a.type;
  const b = document.querySelector(`#actions [data-act="${act}"]`); if (b) b.classList.add('hinted');
}
function phaseListHTML(cur) { return `<ol class="ph-list">${Object.entries(PHASE_HELP).map(([k, [n, d]]) => `<li class="${k === cur ? 'on' : ''}"><b>${n}</b><span>${d}</span></li>`).join('')}</ol>`; }
function showPhaseHelp(ph) {
  openModal(`<h3>🔄 Một lượt gồm 6 pha</h3><p class="muted small center-txt">Pha đang sáng đỏ trên bàn là pha hiện tại. Lượt của mỗi người đều đi đủ 6 pha theo thứ tự.</p>${phaseListHTML(ph)}<div class="row"><button class="btn pri" id="ph-ok">Đã hiểu</button></div>`);
  modalSig = 'info'; $('#ph-ok').onclick = closeModal;
}
function showCoachHelp() {
  const v = view, h = liveHint();
  const sit = h && h.sit ? `<p class="co-sit">${suitify(esc(h.sit))}</p>` : '';
  const plan = h ? `<div class="pv-box"><span class="lbl">💡 Gợi ý của thầy</span>${h.steps.map((st, i) => `<p><b>${i + 1}) ${suitify(esc(st.text))}</b>${st.why ? ` – ${suitify(esc(st.why))}` : ''}</p>`).join('')}<p class="muted small">Gợi ý dùng đúng "bộ não" của bot và chỉ dựa trên thông tin công khai (ai từng đánh ai) – không nhìn trộm bài hay vai của người khác.</p></div>` : '';
  openModal(`<h3>🎓 Đang có chuyện gì?</h3>${sit}${plan}<div class="pv-box"><span class="lbl">Các pha trong lượt</span>${phaseListHTML(v && v.ph)}</div>
    <p class="muted small">Mẹo: lá <b>viền vàng có số</b> là lá thầy gợi ý (số = thứ tự nên đánh), ghế <b>có cờ 💡</b> là mục tiêu gợi ý. Tắt/bật gợi ý trong ⚙️.</p>
    <div class="row"><button class="btn ghost" id="ch-guide">📖 Luật</button>${h ? '<button class="btn pri" id="ch-do">👉 Làm theo gợi ý</button>' : ''}<button class="btn${h ? ' ghost' : ' pri'}" id="ch-ok">Tự đánh</button></div>`);
  modalSig = 'info'; $('#ch-ok').onclick = closeModal; $('#ch-guide').onclick = openGuide; if (h) $('#ch-do').onclick = () => { closeModal(); doHint(h); };
}
$('#phases').addEventListener('click', e => { const sp = e.target.closest('span[data-ph]'); if (sp) showPhaseHelp(sp.dataset.ph); });

// ---- 🎴 mở đầu ván: lật thẻ thân phận (thẻ tre + ấn son) ----
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
let revealT = [];
function maybeReveal(v) {
  if (!v || v.phase !== 'playing' || v.turnCount !== 0 || !v.gid) return;
  const m = me(); if (!m || !m.role || m.general) return;
  if (ls.get('bgvn-tq-reveal') === v.gid) return; ls.set('bgvn-tq-reveal', v.gid);
  showReveal(v);
}
function showReveal(v) {
  const ps = seatOrder(); const m = me(); const lord = ps.find(p => p.role === 'lord');
  const box = $('#reveal'); revealT.forEach(clearTimeout); revealT = [];
  const slip = (p, i) => `<div class="slip${p.id === myId ? ' mine' : ''}${p.role === 'lord' ? ' lord' : ''}" style="--i:${i}" data-pid="${p.id}"><div class="slip-in"><div class="slip-f sb"><i></i><span>?</span></div><div class="slip-f sf r-${p.role || 'hidden'}">${p.role ? `<b>${ROLES[p.role].name}</b><i class="ss">${SEAL[p.role]}</i>` : ''}</div></div><small>${esc(p.id === myId ? 'Bạn' : p.name.replace(' 🤖', ''))}</small></div>`;
  box.innerHTML = `<div class="rv-box" style="--n:${ps.length}"><div class="rv-kick"><span class="han">身分</span> Bốc thẻ thân phận</div>
    <div class="rv-slips">${ps.map(slip).join('')}</div>
    <div class="rv-msg" id="rv-msg"><p class="muted">Mỗi người bốc 1 thẻ tre – chỉ mình bạn thấy thẻ của bạn…</p></div>
    <div class="row"><button class="btn ghost" id="rv-skip">Bỏ qua ›</button></div></div>`;
  box.classList.remove('hidden'); box.classList.toggle('still', REDUCED);
  const msg = $('#rv-msg'); const k = REDUCED ? 0 : Math.min(1, Math.max(.35, fx.S()));
  const mineTxt = () => `<p class="rv-me r-${m.role}"><i class="seal">${SEAL[m.role]}</i> Bạn là <b>${ROLES[m.role].name}</b></p><p class="rv-goal">${roleGoal(m.role)}</p>`;
  const lordTxt = () => m.role === 'lord' ? '<p class="rv-lord">👑 Cả bàn đều biết bạn là Chúa công – bạn đi lượt đầu và được +1 máu.</p>' : `<p class="rv-lord">👑 Chúa công lộ mặt: <b>${esc(lord.name)}</b> – cả bàn đều thấy.</p>`;
  const flip = (pid, cls) => { const e = box.querySelector(`.slip[data-pid="${pid}"] .slip-in`); if (e) e.classList.add(cls); };
  const close = () => { revealT.forEach(clearTimeout); revealT = []; box.classList.add('hidden'); box.innerHTML = ''; };
  $('#rv-skip').onclick = close;
  const at = (fn, ms) => revealT.push(setTimeout(fn, ms * k));
  if (REDUCED) { flip(myId, 'flip'); if (lord) flip(lord.id, 'flip'); msg.innerHTML = mineTxt() + lordTxt(); $('#rv-skip').textContent = 'Vào chọn tướng ⚔️'; revealT.push(setTimeout(close, 9000)); return; }
  fx.sfx.drum();
  at(() => { flip(myId, 'up'); }, 1100);
  at(() => { flip(myId, 'flip'); fx.sfx.judge(); }, 1500);
  at(() => { flip(myId, 'stamp'); fx.sfx.equip(); msg.innerHTML = mineTxt(); }, 2000);
  if (lord && lord.id !== myId) { at(() => { flip(lord.id, 'up'); }, 3100); at(() => { flip(lord.id, 'flip'); fx.sfx.myturn(); }, 3400); at(() => { flip(lord.id, 'stamp'); msg.insertAdjacentHTML('beforeend', lordTxt()); }, 3800); }
  else at(() => { msg.insertAdjacentHTML('beforeend', lordTxt()); box.querySelectorAll('.slip:not(.mine) .slip-in').forEach(e => e.classList.add('bow')); fx.sfx.myturn(); }, 3200);
  at(() => { const b = $('#rv-skip'); if (b) { b.textContent = 'Vào chọn tướng ⚔️'; b.className = 'btn pri'; } }, 4300);
  at(close, 9500);
}

// ---- khu của tôi ----
function renderMe() {
  const v = view, m = me(); const box = $('#me-info');
  if (!m) { box.innerHTML = ''; return; }
  const g = m.general ? GENERALS[m.general] : null;
  $('#me').className = `me k-${m.kingdom || 'none'}${v.players[v.turn].id === myId && v.phase === 'playing' && v.turnCount ? ' current' : ''}${!m.alive ? ' dead' : ''}`;
  const zoneSel = ui && ((ui.k === 'skill' && ui.opt.zones === 'he') || (ui.k === 'discard' && view.ask.zones === 'he') || (ui.k === 'liuli' && view.ask.purpose !== 'thienhuong'));
  const eq = ['weapon', 'armor', 'plus', 'minus'].map(k => m.equip[k] ? `<span class="eqc e-${k}${zoneSel && !(ui.k === 'discard' && k === 'weapon' && view.ask.purpose === 'guanshi') ? ' pickable' : ''}${selIds().includes(m.equip[k].id) ? ' sel' : ''}" data-cid="${m.equip[k].id}">${emoOf(m.equip[k].type)}<b>${esc(cardName(m.equip[k]))}</b><small class="${/[HD]/.test(m.equip[k].suit) ? 'red' : ''}">${SUIT_SYMBOL[m.equip[k].suit]}${rankLabel(m.equip[k].rank)}</small></span>` : '').join('');
  const jd = m.judge.map(j => `<span class="eqc jd" data-cid="${j.card.id}">${CARD_INFO[j.as].emo}<b>${CARD_INFO[j.as].name}</b></span>`).join('');
  const sk = g ? g.skills.map(s => `<button class="skc${SKILLS[s].lord && m.role !== 'lord' ? ' off' : ''}" data-sk="${s}">${SKILLS[s].name}</button>`).join('') : '';
  box.innerHTML = `<div class="me-ava">${g ? portrait(m.general) : blankPortrait()}${!m.alive ? '<span class="rip">☠</span>' : ''}</div>
    <div class="me-id"><div class="pname">${esc(m.name)} <span class="gname">${g ? '· ' + g.name : ''}</span></div>${hpBar(m, true)}<div class="me-row">${kflag(m.kingdom)}${m.role ? roleChip(m) : ''}<span class="rng" title="Tầm đánh">🎯 ${m.range}</span>${statusBadges(m, true)}</div></div>
    <div class="me-zone">${eq || jd ? eq + jd : '<span class="muted small">Chưa có trang bị</span>'}</div>
    <div class="me-skills">${sk}</div>`;
  const ti = targetInfo(); const meAva = box.querySelector('.me-ava');
  if (ti && ti.can.includes(myId)) { meAva.classList.add('targetable'); if (ti.sel.includes(myId)) meAva.classList.add('selected'); meAva.title = 'Chọn chính mình'; meAva.onclick = () => clickSeat(myId); }
  else meAva.onclick = () => showIntro(true);
  box.querySelectorAll('.skc').forEach(b => { b.onclick = () => showSkill(b.dataset.sk); b.title = 'Bấm để xem chi tiết kỹ năng'; });
  box.querySelectorAll('.eqc').forEach(c => {
    const card = allMine().find(x => x.id === c.dataset.cid) || (m.judge.find(j => j.card.id === c.dataset.cid) || {}).card;
    if (c.classList.contains('pickable')) c.onclick = () => toggleSel(c.dataset.cid);
    else c.onclick = () => card && showCard(card, c.classList.contains('jd') ? m.judge.find(j => j.card.id === card.id).as : null);
    if (card && !isTouch) attachTip(c, card);
  });
}
function allMine() { const m = me(); return m ? [...(m.hand || []), ...Object.values(m.equip).filter(Boolean)] : []; }
function selIds() { if (!ui) return []; if (ui.k === 'skill' || ui.k === 'discard' || ui.k === 'zhangba') return ui.ids; if (ui.k === 'liuli') return ui.cardId ? [ui.cardId] : []; if (ui.k === 'use' || ui.k === 'jiedao' || ui.k === 'modes') return [ui.cid]; return []; }

// ---- tay bài ----
function renderHand() {
  const v = view, m = me(), hand = $('#hand'); hand.innerHTML = '';
  if (!m || !m.hand) return;
  const a = v.ask, mine = a && a.mine && !pending;
  const cnt = m.hand.length;
  // điện thoại: lá tối thiểu 66px (chữ ≥10px), đông bài thì xếp chồng (vẫn lộ số/chất + đầu tên); màn ngang thấp: lá nhỏ hơn cho bàn còn chỗ
  const short = innerHeight <= 500, mob = innerWidth <= 760 || short;
  const max = short ? 70 : mob ? 84 : 112, min = short ? 60 : mob ? 66 : 80;
  const avail = Math.max(220, hand.clientWidth - 16);
  const w = Math.max(min, Math.min(max, (avail - (cnt - 1) * 5) / Math.max(1, cnt)));
  const ov = cnt > 1 ? Math.min(4, ((avail - w) / (cnt - 1) - w) / 2) : 4;
  hand.style.setProperty('--cw', w + 'px'); hand.style.setProperty('--ov', Math.max(-w * .36, ov) + 'px');
  hand.classList.toggle('ovl', ov < -3);
  const respIds = mine && (a.type === 'card' || a.type === 'nullify') && a.options ? a.options.filter(o => o.ids).map(o => o.ids[0]) : [];
  const hn = m.general && GENERALS[m.general].skills.includes('hongnhan');
  const okSel = c => { if (!ui) return true; if (ui.k === 'liuli' && a.purpose === 'thienhuong') return c.suit === 'H' || (hn && c.suit === 'S'); if (ui.k === 'discard' && a.suit) return (c.suit === 'S' && hn ? 'H' : c.suit) === a.suit; if (ui.k === 'skill' && ui.opt.sameSuit && ui.ids.length) { const f = m.hand.find(x => x.id === ui.ids[0]); return !f || f.suit === c.suit || ui.ids.includes(c.id); } return true; };
  const sel = selIds();
  m.hand.forEach(c => {
    const t = el('div', '', cardHTML(c)); const ce = t.firstElementChild;
    bindCard(ce, c);
    if (sel.includes(c.id)) ce.classList.add('selected');
    if (ui && (ui.k === 'skill' || ui.k === 'discard' || ui.k === 'zhangba' || ui.k === 'liuli')) {
      const ok = (ui.k !== 'skill' || ui.opt.cards[1] > 0) && okSel(c);
      if (ok) { ce.classList.add('playable'); ce.onclick = () => toggleSel(c.id); } else ce.classList.add('dim');
    } else if (mine && a.type === 'play') {
      const modes = (v.myModes && v.myModes[c.id]) || [];
      const okm = modes.filter(x => x.ok);
      if (okm.length) { ce.classList.add('playable'); ce.onclick = () => clickPlay(c, okm); }
      else { ce.classList.add('dim'); ce.onclick = () => toast((modes[0] && modes[0].reason) || 'Chưa dùng được lá này.'); }
    } else if (mine && a.type === 'card') {
      if (respIds.includes(c.id)) { ce.classList.add('playable', 'resp'); ce.onclick = () => send({ type: 'respond', ids: [c.id] }); }
      else ce.classList.add('dim');
    } else if (mine && a.type === 'nullify') {
      if (respIds.includes(c.id)) { ce.classList.add('playable', 'resp'); ce.onclick = () => send({ type: 'respond', ids: [c.id] }); } else ce.classList.add('dim');
    } else if (mine && a.type === 'show') { ce.classList.add('playable', 'resp'); ce.onclick = () => send({ type: 'show', id: c.id }); }
    if (isFresh(c.id)) ce.classList.add('fresh');
    hand.appendChild(ce);
  });
}
const fresh = new Map();
function isFresh(id) { const t = fresh.get(id); return t && Date.now() - t < 3500 * fx.S(); }
function markFresh() { const pa = prev && prev.players.find(p => p.id === myId), pb = me(); if (!pa || !pa.hand || !pb || !pb.hand) return; const old = new Set(pa.hand.map(c => c.id)); for (const c of pb.hand) if (!old.has(c.id)) fresh.set(c.id, Date.now()); }

// ---- lá bài: chi tiết, tooltip ----
const tip = $('#card-tip');
function tipHTML(c, as) { const i = as ? CARD_INFO[as] : infoOf(c); return `<div class="te">${kindTag(as || c.type)}${i.kind === 'weapon' ? ' · tầm ' + i.range : ''} · ${suitify(SUIT_SYMBOL[c.suit])}${rankLabel(c.rank)} ${SUIT_NAME[c.suit]}</div><div class="tn">${esc(as ? i.name : cardName(c))}</div><div class="td">${suitify(i.desc)}</div>`; }
function attachTip(node, c, as) {
  node.addEventListener('mouseenter', () => { tip.innerHTML = tipHTML(c, as); const r = node.getBoundingClientRect(); tip.style.left = Math.min(innerWidth - 270, Math.max(8, r.left + r.width / 2 - 130)) + 'px'; tip.classList.add('on'); tip.style.top = Math.max(8, r.top - tip.offsetHeight - 10) + 'px'; });
  node.addEventListener('mouseleave', () => tip.classList.remove('on'));
  node.addEventListener('click', () => tip.classList.remove('on'));
}
function bindCard(ce, c) {
  if (!isTouch) attachTip(ce, c);
  let lp; ce.addEventListener('touchstart', () => { lp = setTimeout(() => { lp = 'done'; showCard(c); }, 450); }, { passive: true });
  ce.addEventListener('touchend', e => { if (lp === 'done') { e.preventDefault(); e.stopPropagation(); } else clearTimeout(lp); lp = null; });
  ce.addEventListener('touchmove', () => { clearTimeout(lp); lp = null; }, { passive: true });
  ce.addEventListener('contextmenu', e => { e.preventDefault(); showCard(c); });
  if (!ce.onclick) ce.onclick = () => showCard(c);
}
function showCard(c, as) {
  const i = as ? CARD_INFO[as] : infoOf(c);
  openModal(`<div class="detail">${cardHTML(c, 'lg')}<div class="dt">${tipHTML(c, as)}<p class="muted small">${i.kind === 'basic' ? 'Lá cơ bản.' : i.kind === 'trick' ? 'Cẩm nang: dùng xong bỏ vào chồng bỏ, có thể bị Vô giải khả kích.' : i.kind === 'delay' ? 'Cẩm nang trì hoãn: đặt vào vùng phán định, có tác dụng ở pha Phán định.' : 'Trang bị: đặt trước mặt, có tác dụng tới khi bị thay/phá.'}</p></div></div><div class="row"><button class="btn" id="d-close">Đóng</button></div>`);
  $('#d-close').onclick = closeModal;
}
function showPlayer(p) {
  const g = p.general ? GENERALS[p.general] : null; const k = p.kingdom ? KINGDOMS[p.kingdom] : null;
  const eq = Object.values(p.equip).filter(Boolean).map(c => `<div class="eqrow">${cardHTML(c, 'xs')}<div><b>${esc(cardName(c))}</b><span>${suitify(CARD_INFO[c.type].desc)}</span></div></div>`).join('')
    + p.judge.map(j => `<div class="eqrow">${cardHTML(j.card, 'xs')}<div><b>${CARD_INFO[j.as].name} (phán định)</b><span>${suitify(CARD_INFO[j.as].desc)}</span></div></div>`).join('');
  openModal(`<div class="pview" style="--kc:${k ? k.color : '#999'}"><div class="pv-ava">${g ? portrait(p.general) : blankPortrait()}</div><div class="pv-head"><h3>${esc(p.name)}</h3><div>${g ? `${g.name} · ${k.han} ${k.name} · ${g.gender === 'f' ? 'nữ' : 'nam'}` : 'Chưa chọn tướng'}</div>${hpBar(p, true)}${roleChip(p)}</div></div>
    <div class="pv-stats"><div><b>${p.handCount}</b><small>lá trên tay</small></div><div><b>${p.range}</b><small>tầm đánh</small></div>${p.distance != null ? `<div><b>${p.distance}</b><small>cách bạn</small></div>` : ''}</div>
    ${g ? `<div class="pv-box"><span class="lbl">Kỹ năng <small>(bấm tên để xem chi tiết)</small></span>${g.skills.map(s => `<p>${skLink(s)} ${SKILLS[s].desc}</p>`).join('')}</div>` : ''}
    <div class="pv-box"><span class="lbl">Trang bị & phán định</span>${eq || '<p class="muted">Trống trơn.</p>'}</div>
    <div class="row"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = closeModal;
  bindSkLinks(() => showPlayer(P(p.id) || p));
}

// ======================= KỸ NĂNG: BẢNG CHI TIẾT =======================
const skLink = s => `<span class="skl" role="button" tabindex="0" data-sk="${s}">${SKILLS[s].name}${SKILLS[s].lord ? ' (Chúa)' : ''}</span>:`;
function bindSkLinks(back) {
  $('#modal-box').querySelectorAll('.skl').forEach(b => { const go = e => { e.stopPropagation(); e.preventDefault(); showSkill(b.dataset.sk, back); }; b.onclick = go; b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') go(e); }; });
}
const ACTIVE_TXT = { auto: 'Không – tự kích hoạt, bạn không cần bấm', active: 'Có – bạn tự bấm nút trong pha Ra bài', conv: 'Có – bạn chủ động bấm lá để dùng', ask: 'Nửa nọ nửa kia – tới lúc game sẽ hỏi, bạn chọn có dùng hay không', lord: 'Chỉ dùng được khi bạn là Chúa công' };
function showSkill(sk, back) {
  const k = SKILLS[sk]; if (!k) return; const h = SKILL_HELP[sk] || { t: 'auto', when: '', ex: '' }; const ty = SKILL_TYPE[h.t] || SKILL_TYPE.auto;
  const owners = Object.entries(GENERALS).filter(([, g]) => g.skills.includes(sk)).map(([, g]) => g.name).join(', ');
  const m = me(); const mineOff = k.lord && m && m.general && GENERALS[m.general].skills.includes(sk) && m.role && m.role !== 'lord';
  openModal(`<div class="skd"><div class="skd-h"><span class="skd-k">技</span><div><h3>${k.name}</h3><small>${esc(owners)}</small></div><span class="skd-t t-${h.t}">${ty.icon} ${ty.name}</span></div>
    <p class="skd-desc">${suitify(k.desc)}</p>
    ${mineOff ? '<p class="skd-warn">⚠️ Bạn không phải Chúa công nên kỹ năng này không có tác dụng ván này.</p>' : ''}
    <div class="skd-grid">
      <div class="skd-row"><b>👆 Chủ động?</b><p>${ACTIVE_TXT[h.t] || ''}</p></div>
      <div class="skd-row"><b>⏰ Khi nào dùng</b><p>${suitify(h.when)}</p></div>
      <div class="skd-row"><b>🖐️ Cách bấm</b><p>${ty.how}</p></div>
      <div class="skd-row ex"><b>📖 Ví dụ</b><p>${suitify(h.ex)}</p></div>
    </div>
    <div class="row">${back ? '<button class="btn ghost" id="sk-back">← Quay lại</button>' : ''}<button class="btn pri" id="sk-close">Đã hiểu 👍</button></div></div>`, 'skill-modal');
  modalSig = 'info';
  $('#sk-close').onclick = closeModal; if (back) $('#sk-back').onclick = () => back();
}
// bấm giữ (điện thoại) / chuột phải: mở bảng chi tiết, không kích hoạt nút
function longPress(node, fn) {
  let lp = null;
  node.addEventListener('touchstart', () => { lp = setTimeout(() => { lp = 'done'; fn(); }, 480); }, { passive: true });
  node.addEventListener('touchend', e => { if (lp === 'done') { e.preventDefault(); e.stopPropagation(); } else clearTimeout(lp); lp = null; });
  node.addEventListener('touchmove', () => { clearTimeout(lp); lp = null; }, { passive: true });
  node.addEventListener('contextmenu', e => { e.preventDefault(); fn(); });
}

// ======================= THAO TÁC =======================
function clickPlay(c, modes) {
  if (ui && ui.cid === c.id) { ui = null; render(); return; }
  if (modes.length > 1) { ui = { k: 'modes', cid: c.id, modes }; render(); return; }
  startUse(c.id, modes[0]);
}
function startUse(cid, opt) {
  if (!opt.max) { send({ type: 'use', ids: [cid], as: opt.as, targets: [] }); return; }
  ui = opt.as === 'jiedao' ? { k: 'jiedao', cid, as: opt.as, opt, a: null } : { k: 'use', cid, as: opt.as, opt, targets: [] };
  render();
}
function clickSeat(pid) {
  if (!ui) return;
  if (ui.k === 'use') {
    ui.targets = ui.targets.includes(pid) ? ui.targets.filter(x => x !== pid) : [...ui.targets, pid];
    if (ui.opt.max === 1 && ui.targets.length === 1) { send({ type: 'use', ids: [ui.cid], as: ui.as, targets: ui.targets }); return; }
    if (ui.targets.length > ui.opt.max) ui.targets.shift();
  } else if (ui.k === 'jiedao') {
    if (!ui.a) ui.a = pid; else { send({ type: 'use', ids: [ui.cid], as: 'jiedao', targets: [ui.a, pid] }); return; }
  } else if (ui.k === 'skill') {
    ui.targets = ui.targets.includes(pid) ? ui.targets.filter(x => x !== pid) : [...ui.targets, pid];
    if (ui.targets.length > ui.opt.tmax) ui.targets.shift();
    if (skillReady() && ui.opt.tmax === ui.targets.length && ui.opt.cards[1] === ui.ids.length && ui.opt.cards[0] === ui.opt.cards[1]) { sendSkill(); return; }
  } else if (ui.k === 'liuli') ui.target = ui.target === pid ? null : pid;
  else if (ui.k === 'targets') { const mx = view.ask.max || 2; ui.ids = ui.ids.includes(pid) ? ui.ids.filter(x => x !== pid) : [...ui.ids, pid]; if (ui.ids.length > mx) ui.ids.shift(); if (mx === 1 && ui.ids.length === 1 && view.ask.min === 1) { send({ type: 'targets', ids: ui.ids }); return; } }
  fx.sfx.card(); render();
}
function toggleSel(id) {
  if (!ui) return;
  if (ui.k === 'liuli') { ui.cardId = ui.cardId === id ? null : id; }
  else {
    const lim = ui.k === 'skill' ? ui.opt.cards[1] : ui.k === 'zhangba' ? 2 : view.ask.n;
    ui.ids = ui.ids.includes(id) ? ui.ids.filter(x => x !== id) : [...ui.ids, id];
    if (ui.ids.length > lim) ui.ids.shift();
    if (ui.k === 'zhangba' && ui.ids.length === 2) { send({ type: 'respond', ids: ui.ids }); return; }
  }
  fx.sfx.card(); render();
}
function skillReady() { const o = ui.opt; return ui.ids.length >= o.cards[0] && ui.ids.length <= o.cards[1] && ui.targets.length >= o.tmin && ui.targets.length <= o.tmax; }
function sendSkill() { if (!ui || ui.k !== 'skill') return; send({ type: 'skill', skill: ui.sk, ids: ui.ids, targets: ui.targets }); }
function skillHint(u) {
  const o = u.opt; const parts = [];
  if (o.cards[1] > 0) parts.push(o.cards[0] === o.cards[1] ? `chọn ${o.cards[0]} lá${o.zones === 'he' ? ' (tay/trang bị)' : ''}` : `chọn lá${o.zones === 'he' ? ' (tay/trang bị)' : ''} (đã chọn ${u.ids.length})`);
  if (o.tmax > 0) parts.push(o.tmax === 1 ? 'chọn 1 người' : `chọn ${o.tmin} người (người đầu Quyết đấu người sau)`);
  return (SKILLS[u.sk] ? SKILLS[u.sk].desc + ' — ' : 'Dùng 2 lá trên tay như 1 Sát — ') + parts.join(', ') + '.';
}
const SKILL_ICON = { cuongtap: '⚔️', khuho: '🐯', thiennghia: '🎯', loankich: '🏹', nhanduc: '🤝', chehanh: '⚖️', khonhuc: '🔥', phangian: '🎼', thanhnang: '🌿', ketnhan: '💞', ligian: '🌙', xamau: '🐍' };
function renderActions() {
  const box = $('#actions'); box.innerHTML = ''; const v = view, a = v.ask, m = me();
  const add = (txt, cls, fn, dis = false) => { const b = el('button', 'btn ' + (cls || ''), txt); b.onclick = fn; b.disabled = dis; box.appendChild(b); return b; };
  if (v.phase === 'ended') {
    box.appendChild(el('div', 'winner', winText(v.winner)));
    add('📋 Kết quả', '', showResults);
    if (isHost) add('🔁 Về phòng chờ', 'pri', () => net.restart());
    return;
  }
  if (!m) return;
  if (!m.alive) { box.appendChild(el('div', 'muted', '☠ Bạn đã tử trận – ngồi xem tiếp nhé')); return; }
  if (pending && a && a.mine) { box.appendChild(el('div', 'muted small idle', '⏳ Đang gửi…')); return; }
  if (!a || !a.mine) { const t = v.timer && v.timer.pids && v.timer.pids.length ? '' : ''; box.appendChild(el('div', 'muted small idle', t || (v.players[v.turn].id === myId ? '…' : 'Chờ tới lượt bạn'))); return; }
  switch (a.type) {
    case 'play': {
      if (ui && ui.k === 'modes') {
        box.appendChild(el('span', 'lbl', 'Dùng như:'));
        const u = ui; for (const o of u.modes) add(`${CARD_INFO[o.as].emo} ${CARD_INFO[o.as].name}`, 'pri', () => startUse(u.cid, o));
        add('Huỷ', 'ghost', () => { ui = null; render(); }); return;
      }
      if (ui && (ui.k === 'use' || ui.k === 'jiedao')) {
        const u = ui;
        if (u.k === 'use' && u.as === 'tiesuo') { add(u.targets.length ? `⛓️ Xích ${u.targets.length} người` : '♻️ Trùng chú (rút 1)', 'pri', () => send({ type: 'use', ids: [u.cid], as: u.as, targets: u.targets })); }
        else if (u.k === 'use' && u.opt.max > 1) add(`⚔️ Sát ${u.targets.length} người`, 'pri', () => send({ type: 'use', ids: [u.cid], as: u.as, targets: u.targets }), u.targets.length < u.opt.min);
        add('Huỷ chọn', 'ghost', () => { ui = null; render(); }); return;
      }
      if (ui && ui.k === 'skill') {
        add(`✅ ${ui.sk === 'xamau' ? 'Sát' : SKILLS[ui.sk].name}`, 'pri', sendSkill, !skillReady());
        add('Huỷ', 'ghost', () => { ui = null; render(); }); return;
      }
      for (const o of v.mySkills || []) {
        const b = add(`${SKILL_ICON[o.sk] || '✨'} ${o.sk === 'xamau' ? 'Xà mâu' : SKILLS[o.sk].name}`, 'sk', () => {
          if (!o.cards[1] && !o.tmax) { send({ type: 'skill', skill: o.sk, ids: [], targets: [] }); return; }
          ui = { k: 'skill', sk: o.sk, opt: o, ids: [], targets: [] }; render();
        });
        b.dataset.act = 'skill:' + o.sk; if (SKILLS[o.sk]) { longPress(b, () => showSkill(o.sk)); b.title = 'Bấm giữ / chuột phải để xem chi tiết kỹ năng'; }
      }
      const over = m.hand.length - Math.max(0, m.hp);
      add(over > 0 && !(GENERALS[m.general].skills.includes('khacky') && !v.tf.slashes) ? `⏭ Kết thúc (bỏ ${over} lá)` : '⏭ Kết thúc lượt', 'pri end', () => send({ type: 'end' })).dataset.act = 'end';
      return;
    }
    case 'card': {
      const zb = (a.options || []).some(o => o.via === 'zhangba');
      if (ui && ui.k === 'zhangba') { box.appendChild(el('span', 'lbl', `🐍 Chọn 2 lá (${ui.ids.length}/2)`)); add('Huỷ', 'ghost', () => { ui = null; render(); }); return; }
      if (zb) add('🐍 Xà mâu: 2 lá = Sát', '', () => { ui = { k: 'zhangba', ids: [] }; render(); });
      if (a.canDelegate) add(a.want === 'ne' ? '📣 Hộ giá (nhờ quân Ngụy)' : '📣 Kích tướng (nhờ quân Thục)', '', () => send({ type: 'delegate' })).dataset.act = 'delegate';
      const PASS = { leiji: 'Thôi', sat: '💔 Chịu đòn', wanjian: '💔 Chịu đòn', nanman: '💔 Chịu đòn', duel: '🏳️ Chịu thua', dying: a.forWho === myId ? 'Thôi' : 'Không cứu', delegate: 'Bỏ qua', qinglong: 'Thôi', jiedao: '🗡️ Giao vũ khí', quytai: 'Không đổi' };
      add(PASS[a.purpose] || 'Bỏ qua', a.purpose === 'sat' || a.purpose === 'wanjian' || a.purpose === 'nanman' || a.purpose === 'duel' ? 'red' : 'ghost', () => send({ type: 'pass' })).dataset.act = 'pass';
      return;
    }
    case 'nullify': {
      add('Bỏ qua', 'ghost', () => send({ type: 'pass' })).dataset.act = 'pass';
      if (['nanman', 'wanjian', 'taoyuan', 'wugu'].includes(a.trick)) add('Bỏ qua cả lá này', 'ghost', () => { autoPass = `${a.trick}|${a.src}|${view.turnCount}`; send({ type: 'pass' }); });
      return;
    }
    case 'discard': {
      if (!ui || ui.k !== 'discard') ui = { k: 'discard', ids: [] };
      const n = a.n, k = ui.ids.length;
      const u = ui; add(k === n ? `🗑️ Bỏ ${n} lá đã chọn` : `Chọn ${k}/${n} lá`, 'pri', () => send({ type: 'discard', ids: u.ids }), k !== n);
      if (a.optional) add(({ songco: '🎁 Cho rút 1 lá', cuonglie: '💔 Chịu mất 1 máu', guanshi: 'Thôi', huogong: 'Không đốt' })[a.purpose] || 'Bỏ qua', 'ghost', () => send({ type: 'pass' })).dataset.act = 'pass';
      return;
    }
    case 'targets': {
      if (!ui || ui.k !== 'targets') ui = { k: 'targets', ids: [] };
      const u = ui; const L = { duttap: ['🐺 Lấy bài', 'Rút 2 lá bình thường'], thantoc: ['💨 Thần tốc!', 'Thôi, đi lượt bình thường'], loikich: ['⚡ Giáng sét', 'Thôi'], tietmenh: ['📜 Cho rút bài', 'Thôi'], khuho: ['🐯 Ra lệnh đánh', null] }[a.purpose] || ['Xác nhận', 'Bỏ qua'];
      add(`${L[0]}${u.ids.length ? ' → ' + u.ids.map(id => esc(nameOf(id))).join(', ') : ''}`, 'pri', () => send({ type: 'targets', ids: u.ids }), u.ids.length < Math.max(1, a.min || 0));
      if (L[1] && !(a.min > 0)) add(L[1], 'ghost', () => send({ type: 'targets', ids: [] })).dataset.act = 'targets0';
      return;
    }
    case 'show': box.appendChild(el('span', 'lbl', a.purpose === 'pindian' ? '🀄 Bấm 1 lá trên tay để đọ' : '🎇 Bấm 1 lá trên tay để lật')); return;
    case 'yesno': { const L = { loay: ['💪 Cởi giáp!', 'Rút 2 lá bình thường'], hanbing: ['❄️ Phá 2 lá', 'Gây sát thương'], cuthu: ['🏰 Cố thủ (rút 3)', 'Thôi'], nietban: ['🐦‍🔥 Niết bàn!', 'Không'] }[a.purpose] || ['Có', 'Không']; add(L[0], 'pri', () => send({ type: 'yes' })).dataset.act = 'yes'; add(L[1], 'ghost', () => send({ type: 'no' })).dataset.act = 'no'; return; }
    case 'liuli': {
      if (!ui || ui.k !== 'liuli') ui = { k: 'liuli', cardId: null, target: null };
      const u = ui; add(`🌺 Chuyển Sát${u.cardId ? '' : ' (chọn 1 lá)'}${u.target ? ' → ' + esc(nameOf(u.target)) : ' (chọn người)'}`, 'pri', () => send({ type: 'liuli', cardId: u.cardId, target: u.target }), !(u.cardId && u.target));
      add('Thôi', 'ghost', () => send({ type: 'pass' })).dataset.act = 'pass'; return;
    }
    case 'general': add('🎴 Chọn tướng', 'pri', () => { modalSig = ''; showGeneralPick(); }); return;
    case 'pick': add('Mở bảng chọn', 'pri', () => { modalSig = ''; showPick(); }); return;
    case 'guanxing': add('Mở bảng xếp', 'pri', () => { modalSig = ''; showGuanxing(); }); return;
    case 'wugu': add('Mở bảng chọn', 'pri', () => { modalSig = ''; showWugu(); }); return;
    case 'suit': add('Đoán chất', 'pri', () => { modalSig = ''; showSuit(); }); return;
  }
}
function autoPassCheck() {
  const a = view.ask; if (!a || !a.mine || a.type !== 'nullify') return;
  // cẩm nang của chính mình đang có hiệu lực: khỏi hỏi "Vô giải lá của bạn?" – tự bỏ qua cho ván chạy nhanh
  if (a.src === myId && !(a.count % 2)) { setTimeout(() => { const b = view.ask; if (b && b.type === 'nullify' && b.mine && b.src === myId && !(b.count % 2) && !pending) send({ type: 'pass' }); }, 250); return; }
  if (!autoPass) return;
  if (autoPass === `${a.trick}|${a.src}|${view.turnCount}`) setTimeout(() => { if (view.ask && view.ask.type === 'nullify' && view.ask.mine) send({ type: 'pass' }); }, 150);
  else if (!/^(nanman|wanjian|taoyuan|wugu)$/.test(a.trick)) autoPass = null;
}

// ---- hộp thoại tự mở theo câu hỏi ----
function autoModal() {
  const a = view.ask;
  if (!a || !a.mine) { if (modalSig && !modalSig.startsWith('closed:') && modalSig !== 'info') { $('#modal').classList.add('hidden'); modalSig = ''; } return; }
  const map = { general: showGeneralPick, pick: showPick, guanxing: showGuanxing, wugu: showWugu, suit: showSuit };
  if (!map[a.type]) { if (modalSig && !modalSig.startsWith('closed:') && modalSig !== 'info') { $('#modal').classList.add('hidden'); modalSig = ''; } return; }
  if (modalSig === askSig || modalSig === 'closed:' + askSig) return;
  if (modalOpen() && modalSig === 'info') return; // đang xem thông tin khác: để nút trong lời nhắc
  map[a.type]();
}
function showGeneralPick() {
  const a = view.ask; if (!a || a.type !== 'general' || !a.mine) return;
  const m = me();
  openModal(`<div class="gpick"><div class="gp-role">${m.role ? `<span class="rchip big r-${m.role}">${ROLES[m.role].icon} Bạn là ${ROLES[m.role].name}</span><p>${roleGoal(m.role)}</p>` : ''}</div>
    <h3>Chọn 1 võ tướng</h3><div class="gp-list">${(a.offers || []).map(id => `<button class="gp-item" data-g="${id}">${generalCardHTML(id)}<div class="gp-sk">${GENERALS[id].skills.map(s => `<p>${skLink(s)} ${SKILLS[s].desc}</p>`).join('')}</div></button>`).join('')}</div>${hintsActive() && view.hint && view.hint.steps[0] && view.hint.steps[0].a.type === 'general' ? `<p class="gp-hint">💡 Gợi ý: <b>${esc(GENERALS[view.hint.steps[0].a.id].name)}</b> – dễ chơi cho người mới. Bấm tên kỹ năng (chữ đỏ gạch chân) để xem chi tiết.</p>` : '<p class="muted small center-txt">Bấm tên kỹ năng (chữ gạch chân) để xem giải thích chi tiết.</p>'}</div>`, 'wide');
  modalSig = askSig;
  bindSkLinks(() => { modalSig = ''; showGeneralPick(); });
  const hg = view.hint && view.hint.steps[0] && view.hint.steps[0].a.type === 'general' && hintsActive() ? view.hint.steps[0].a.id : null;
  if (hg) { const it = $('#modal-box').querySelector(`.gp-item[data-g="${hg}"]`); if (it) it.classList.add('hinted'); }
  $('#modal-box').querySelectorAll('.gp-item').forEach(b => b.onclick = () => { closeModal(); send({ type: 'general', id: b.dataset.g }); });
}
function showPick() {
  const a = view.ask; if (!a || a.type !== 'pick' || !a.mine) return;
  const from = P(a.from);
  const hand = a.zones.includes('h') && a.fromHand ? `<button class="pk-hand" data-z="h">${backHTML('sm')}<span>Ngẫu nhiên trên tay<br><b>${a.fromHand} lá</b></span></button>` : '';
  const eq = a.zones.includes('e') ? a.fromEquip.map(c => `<button class="pk-c" data-id="${c.id}">${cardHTML(c, 'sm')}</button>`).join('') : '';
  const jd = a.zones.includes('j') ? a.fromJudge.map(j => `<button class="pk-c" data-id="${j.card.id}">${cardHTML(j.card, 'sm')}<small>${CARD_INFO[j.as].name}</small></button>`).join('') : '';
  openModal(`<h3>${a.mode === 'take' ? '✋ Lấy' : '🗑️ Phá'} 1 lá của ${esc(from.name)}${a.skill === 'phandap' ? ' [Phản đáp]' : ''}</h3><div class="pk-row">${hand}${eq}${jd}</div><p class="muted small center-txt">Trang bị và lá phán định thì thấy rõ; bài trên tay thì bốc mù.</p>`);
  modalSig = askSig;
  $('#modal-box').querySelectorAll('button[data-z],button[data-id]').forEach(b => b.onclick = () => { closeModal(); send(b.dataset.z ? { type: 'pick', zone: 'h' } : { type: 'pick', id: b.dataset.id }); });
}
function showWugu() {
  const a = view.ask; if (!a || a.type !== 'wugu' || !a.mine) return;
  openModal(`<h3>🌾 Ngũ cốc phong đăng – chọn 1 lá</h3><div class="pk-row">${a.cards.map(c => `<button class="pk-c" data-id="${c.id}">${cardHTML(c, 'sm')}</button>`).join('')}</div>`);
  modalSig = askSig;
  $('#modal-box').querySelectorAll('button[data-id]').forEach(b => b.onclick = () => { closeModal(); send({ type: 'pick', id: b.dataset.id }); });
}
function showSuit() {
  const a = view.ask; if (!a || a.type !== 'suit' || !a.mine) return;
  openModal(`<h3>🎼 Phản gián của ${esc(nameOf(a.src))}</h3><p class="center-txt">Đoán chất của lá bạn sắp rút từ tay họ. Sai chất là mất 1 máu!</p><div class="suits">${['S', 'H', 'C', 'D'].map(s => `<button class="suit-b${/[HD]/.test(s) ? ' red' : ''}" data-s="${s}">${SUIT_SYMBOL[s]}<small>${SUIT_NAME[s]}</small></button>`).join('')}</div>`);
  modalSig = askSig;
  $('#modal-box').querySelectorAll('.suit-b').forEach(b => b.onclick = () => { closeModal(); send({ type: 'suit', suit: b.dataset.s }); });
}
let gx = null;
function showGuanxing() {
  const a = view.ask; if (!a || a.type !== 'guanxing' || !a.mine) return;
  if (!gx || gx.sig !== askSig) gx = { sig: askSig, top: a.cards.map(c => c.id), bottom: [] };
  const byId = id => a.cards.find(c => c.id === id);
  const rowH = (ids, where) => ids.map((id, i) => `<div class="gx-c">${cardHTML(byId(id), 'sm')}<div class="gx-b"><button data-mv="${where}:${i}:-1" ${i === 0 ? 'disabled' : ''}>◀</button><button data-mv="${where}:${i}:x">${where === 't' ? '⬇' : '⬆'}</button><button data-mv="${where}:${i}:1" ${i === ids.length - 1 ? 'disabled' : ''}>▶</button></div></div>`).join('') || '<span class="muted small">(trống)</span>';
  openModal(`<h3>🪶 Quan tinh – xếp lại ${a.cards.length} lá</h3><p class="muted small center-txt">Hàng trên: lá trái nhất sẽ được rút trước. ⬇ đưa xuống đáy chồng bài.</p>
    <div class="gx-lbl">⬆ Trên cùng chồng bài</div><div class="gx-row">${rowH(gx.top, 't')}</div><div class="gx-lbl">⬇ Dưới đáy</div><div class="gx-row">${rowH(gx.bottom, 'b')}</div>
    <div class="row"><button class="btn pri" id="gx-ok">✅ Xong</button></div>`, 'wide');
  modalSig = askSig;
  $('#modal-box').querySelectorAll('[data-mv]').forEach(b => b.onclick = () => {
    const [w, si, d] = b.dataset.mv.split(':'); const i = +si; const L = w === 't' ? gx.top : gx.bottom;
    if (d === 'x') { const [id] = L.splice(i, 1); (w === 't' ? gx.bottom : gx.top).push(id); }
    else { const j = i + +d; [L[i], L[j]] = [L[j], L[i]]; }
    showGuanxing();
  });
  $('#gx-ok').onclick = () => { closeModal(); send({ type: 'guanxing', top: gx.top, bottom: gx.bottom }); };
}
function roleGoal(role) {
  const lord = view && view.players.find(p => p.role === 'lord'); const ln = lord ? (lord.id === myId ? 'bạn' : esc(lord.name)) : 'Chúa công';
  return ({ lord: 'Dẹp sạch Phản tặc và Nội gián. Cẩn thận đừng chém nhầm Trung thần!', loyal: `Bảo vệ Chúa công (${ln}) tới cùng, cùng diệt Phản tặc và Nội gián. Giữ kín thân phận.`,
    rebel: `Lật đổ Chúa công (${ln}). Các Phản tặc khác là đồng đội nhưng bạn không biết là ai.`, spy: `Phải là người sống sót cuối cùng: giúp diệt Phản tặc trước, cuối cùng một mình đấu Chúa công (${ln}).` })[role] || '';
}
function showIntro(force) {
  const m = me(); if (!m || !m.general || !m.role) return;
  const g = GENERALS[m.general];
  openModal(`<div class="intro"><div class="kick">${force ? 'Thân phận của bạn' : 'Ván mới · bí mật của bạn'}</div>
    <div class="intro-cards">${generalCardHTML(m.general)}<div class="role-card r-${m.role}"><span class="ri rseal">${SEAL[m.role]}</span><b>${ROLES[m.role].name}</b></div></div>
    <p class="goal">${roleGoal(m.role)}</p>
    <div class="pv-box"><span class="lbl">${g.name} · ${m.maxHp} máu</span>${g.skills.map(s => `<p>${skLink(s)} ${SKILLS[s].desc}${SKILLS[s].lord && m.role !== 'lord' ? ' <i class="muted">(không có tác dụng vì bạn không phải Chúa)</i>' : ''}</p>`).join('')}</div>
    <p class="muted small">💡 Bấm vào chân dung của bạn ở góc dưới để xem lại · bấm tên kỹ năng để xem chi tiết.</p>
    <div class="row"><button class="btn ghost" id="i-guide">📖 Xem luật</button><button class="btn pri" id="i-ok">Vào trận! ⚔️</button></div></div>`);
  modalSig = 'info';
  $('#i-ok').onclick = closeModal; $('#i-guide').onclick = openGuide; bindSkLinks(() => showIntro(true));
}
function showResults() {
  const v = view; if (!v || v.phase !== 'ended') return;
  const m = me(); const side = r => r === 'lord' || r === 'loyal' ? 'lord' : r;
  const won = m && side(m.role) === v.winner;
  openModal(`<div class="results"><h2>${won ? '🏆 Thắng rồi!' : '😵 Thua mất rồi…'}</h2><p class="center-txt">${winText(v.winner)}</p>
    <div class="res-list">${v.players.map(p => `<div class="res-row${side(p.role) === v.winner ? ' win' : ''}${!p.alive ? ' dead' : ''}"><div class="res-ava">${p.general ? portrait(p.general) : blankPortrait()}</div><div><b>${esc(p.name)}${p.id === myId ? ' (bạn)' : ''}</b><small>${p.general ? GENERALS[p.general].name : ''}${p.alive ? '' : ' · ☠ tử trận'}</small></div>${roleChip(p)}</div>`).join('')}</div>
    <div class="row">${isHost ? '<button class="btn pri" id="r-again">🔁 Về phòng chờ</button>' : ''}<button class="btn" id="r-close">Xem bàn</button></div></div>`);
  modalSig = 'info';
  $('#r-close').onclick = closeModal; if ($('#r-again')) $('#r-again').onclick = () => { closeModal(); net.restart(); };
}

// ---- nhật ký ----
function renderLog() {
  const l = $('#log-list'); if ($('#log').classList.contains('hidden')) return;
  l.innerHTML = view.log.map(x => `<div class="${/^— Lượt/.test(x) ? 'turn' : ''}">${suitify(esc(x))}</div>`).join(''); l.scrollTop = l.scrollHeight;
}
$('#btn-log').addEventListener('click', () => view && renderLog());

// ======================= ĐỒNG HỒ =======================
let tEnd = 0, tTotal = 1, tPids = [], tIv = null, lastBeep = 0;
function setTimer(t) {
  if (!t || !t.pids || !t.pids.length) { tEnd = 0; $('#timer').className = 'timer'; $('#timer').innerHTML = ''; return; }
  tEnd = Date.now() + t.ms; tTotal = t.total || t.ms; tPids = t.pids;
  if (!tIv) tIv = setInterval(tick, 250); tick();
}
function tick() {
  const box = $('#timer'); if (!tEnd || !view) { box.className = 'timer'; box.innerHTML = ''; return; }
  const left = Math.max(0, Math.ceil((tEnd - Date.now()) / 1000)); const mine = tPids.includes(myId);
  const who = mine ? 'Bạn' : tPids.length > 1 ? `${tPids.length} người` : (P(tPids[0]) || {}).name || '?';
  box.className = 'timer on' + (mine ? ' mine' : '') + (left <= 5 ? ' low' : '');
  box.innerHTML = `<span>⏳ ${esc(who)} <b>${left}s</b></span><i style="width:${Math.max(0, Math.min(100, (tEnd - Date.now()) / tTotal * 100))}%"></i>`;
  if (mine && left <= 5 && left > 0 && left !== lastBeep) { lastBeep = left; fx.sfx.tick(); }
}

// ======================= HIỆU ỨNG THEO SỰ KIỆN =======================
const anchor = pid => pid === myId ? ($('#me-info .me-ava') || $('#hand')) : seatEl(pid);
const handAnchor = pid => pid === myId ? $('#hand') : seatEl(pid);
function bubbleAt(pid, html, cls = '') { const a = anchor(pid); if (a) fx.bubble(a, html, cls); }
const SKILL_SFX = { gianhung: 'skill', phandap: 'skill', cuonglie: 'bad', khonhuc: 'hit', liendoanh: 'draw', thietky: 'skill' };
function playEvents(v) {
  markFresh();
  const evs = v.ev.filter(e => e.n > lastEv); if (v.ev.length) lastEv = Math.max(lastEv, v.ev[v.ev.length - 1].n);
  if (!evs.length) return;
  let t = 0; const step = 170;
  const at = (fn, d = 0) => setTimeout(fn, (t + d) * fx.S());
  const coach = hintsActive();
  for (const e of evs.slice(-14)) {
    if (coach && e.p === myId) {
      if (e.t === 'turn') setCoachNote('🔄 Lượt của bạn: ① Phán định (nếu có lá trì hoãn) → ② Rút 2 lá → ③ Ra bài → ④ Bỏ bài thừa');
      else if (e.t === 'judgeRes' && JUDGE_TEXT[e.why]) setCoachNote(suitify(`🔮 Phán định – ${esc(JUDGE_TEXT[e.why])}. Lật được ${esc(cardLabel(e.card))}.`));
      else if (e.t === 'lebu') setCoachNote('🏮 Lạc bất trúng: lượt này bạn bị bỏ qua pha Ra bài (vẫn được rút bài).');
      else if (e.t === 'bingliang') setCoachNote('🍚 Binh lương trúng: lượt này bạn không được rút bài.');
      else if (e.t === 'dying') setCoachNote('🆘 Bạn đang hấp hối (0 máu): ai có Đào sẽ được hỏi có cứu không. Chính bạn cũng tự ăn Đào/Rượu được.');
    }
    switch (e.t) {
      case 'turn': at(() => { if (e.p === myId) { fx.sfx.myturn(); fx.banner('Tới lượt bạn!', 'Pha ra bài – bấm lá sáng màu'); } else fx.sfx.turn(); }); break;
      case 'general': if (e.p === myId) at(() => { if (!introShown) { introShown = true; showIntro(); } }, 300); break;
      case 'draw': { const n = Math.min(e.k, 4); for (let i = 0; i < n; i++) at(() => fx.fly(backHTML('sm'), $('#deck'), handAnchor(e.p), { duration: 380, sound: i === 0 }), i * 90); if (e.p === myId) at(() => fx.sfx.draw()); t += 60; break; }
      case 'use': {
        const card = e.card; const info = e.as === 'sat' && card ? infoOf(card) : CARD_INFO[e.as];
        at(() => {
          bubbleAt(e.p, `<b>${e.as === 'sat' ? info.emo : emoOf(e.as)} ${info.name}</b>`);
          const dest = info.kind === 'delay' ? (e.to && e.to[0] ? anchor(e.to[0]) : $('#discard')) : (e.to && e.to.length === 1 ? anchor(e.to[0]) : $('#discard'));
          if (card) fx.fly(cardHTML(card, 'sm'), handAnchor(e.p), dest, { duration: 480 });
          if (e.as === 'sat') { fx.sfx.slash(); (e.to || []).forEach((id, i) => { fx.slashFx(anchor(id), 260 + i * 120); if (card && card.el === 'fire') fx.fireFx(anchor(id), 300 + i * 120); }); if (card && card.el) (card.el === 'fire' ? fx.sfx.fire : fx.sfx.thunder)(); }
          else if (e.as === 'nanman') { fx.sfx.elephant(); fx.banner('🐘 Nam man xâm nhập!', 'Ai không ra Sát mất 1 máu'); fx.screenShake(); }
          else if (e.as === 'wanjian') { fx.sfx.arrows(); fx.banner('🏹 Vạn tiễn tề phát!', 'Ai không ra Né mất 1 máu'); v.players.filter(p => p.alive && p.id !== e.p).forEach((p, i) => fx.arrowsFx(handAnchor(e.p), anchor(p.id), 120 + i * 90)); }
          else if (e.as === 'taoyuan') { fx.sfx.heal(); fx.banner('🌸 Đào viên kết nghĩa', 'Mọi người hồi 1 máu'); }
          else if (e.as === 'wugu') { fx.sfx.good(); fx.banner('🌾 Ngũ cốc phong đăng', 'Mỗi người chọn 1 lá'); }
          else if (e.as === 'juedou') { fx.sfx.drum(); musicStinger('duel'); }
          else if (e.as === 'dao') { fx.sfx.peach(); }
          else if (e.as === 'jiu') { fx.sfx.drink(); fx.stamp(anchor(e.p), 'SAY RƯỢU 🍶', 'red'); }
          else if (e.as === 'hoasat') { fx.sfx.fire(); (e.to || []).forEach((id, i) => fx.fireFx(anchor(id), 260 + i * 120)); }
          else if (e.as === 'huogong') { fx.sfx.fire(); }
          else if (e.as === 'tiesuo') fx.sfx.chain();
          else if (e.as === 'lebu' || e.as === 'shandian') fx.sfx.equip();
          else fx.sfx.skill();
        });
        t += step + 80; break;
      }
      case 'play': at(() => {
        const info = e.as === 'sat' && e.cards && e.cards[0] ? infoOf(e.cards[0]) : CARD_INFO[e.as];
        bubbleAt(e.p, `<b>${info ? info.emo + ' ' + info.name : ''}</b>${e.via === 'bagua' ? ' <small>Bát quái</small>' : ''}`);
        if (e.cards && e.cards[0]) fx.fly(cardHTML(e.cards[0], 'sm'), handAnchor(e.p), $('#discard'), { duration: 420 });
        if (e.as === 'ne') { fx.sfx.dodge(); fx.shieldFx(anchor(e.p), e.via === 'bagua' ? '☯️' : '💨'); }
        else if (e.as === 'sat') fx.sfx.slash();
        else if (e.as === 'dao') fx.sfx.peach();
        else if (e.as === 'jiu') fx.sfx.drink();
      }); t += step; break;
      case 'equip': at(() => { fx.sfx.equip(); bubbleAt(e.p, `<b>${emoOf(e.card.type)} ${esc(cardName(e.card))}</b>`); fx.fly(cardHTML(e.card, 'sm'), handAnchor(e.p), anchor(e.p), { duration: 420, scaleTo: .6 }); }); t += step; break;
      case 'discard': if (e.cards && e.cards.length) at(() => e.cards.slice(0, 3).forEach((c, i) => fx.fly(cardHTML(c, 'sm'), handAnchor(e.p), $('#discard'), { delay: i * 80, duration: 400, rotate: Math.random() * 10 - 5, sound: i === 0 }))); t += 80; break;
      case 'move': at(() => fx.fly(e.card && !e.hidden ? cardHTML(e.card, 'sm') : backHTML('sm'), handAnchor(e.from), handAnchor(e.to), { duration: 560 })); if (e.to === myId && e.card) at(() => toast(`Bạn nhận được ${cardLabel(e.card)}`, 'ok'), 500); else if (e.from === myId && e.to !== myId) at(() => toast(`${nameOf(e.to)} lấy mất 1 lá của bạn!`), 500); t += step; break;
      case 'damage': at(() => {
        const box = e.p === myId ? $('#me') : seatEl(e.p); const a = anchor(e.p);
        fx.shake(box); fx.flash(box); fx.floatText(a, `−${e.k}${e.nature === 'fire' ? '🔥' : e.nature === 'thunder' ? '⚡' : ''}`, e.nature === 'fire' ? '#e2561e' : e.nature === 'thunder' ? '#6b5fd6' : undefined); fx.sfx.hit(); if (e.k >= 2 || e.p === myId) fx.screenShake();
        if (e.nature === 'fire') fx.fireFx(a); else if (e.nature === 'thunder') fx.sparks(a, '200,190,255');
      }, e.nature === 'thunder' ? 350 : 120); t += step; break;
      case 'heal': at(() => { const a = anchor(e.p); fx.healFx(a); fx.floatText(a, `+${e.k}`, '#2f9e5b'); fx.flash(e.p === myId ? $('#me') : seatEl(e.p), 'flash-heal'); fx.sfx.heal(); }); t += step; break;
      case 'dying': at(() => { fx.stamp(anchor(e.p), 'HẤP HỐI', 'red'); fx.sfx.dying(); }); t += step; break;
      case 'death': at(() => { fx.sfx.death(); musicStinger('death'); fx.banner(`☠ ${esc(nameOf(e.p))} tử trận`, `${ROLES[e.role].icon} ${ROLES[e.role].name}`, 'dark'); }, 200); t += step * 2; break;
      case 'judge': at(() => { fx.sfx.judge(); fx.judgeFlip(cardHTML(e.card), $('#center'), (e.swap ? '🦊 Quỷ tài đổi: ' : '🔮 ') + (JUDGE_TEXT[e.why] || 'Phán định')); }); t += step * 3; break;
      case 'judgeRes': at(() => (e.hit === (e.why === 'lebu') ? fx.sfx.good : fx.sfx.bad)(), 0); break;
      case 'lebu': at(() => fx.stamp(anchor(e.p), 'MẤT PHA RA BÀI', 'red')); t += step; break;
      case 'bingliang': at(() => fx.stamp(anchor(e.p), 'MẤT PHA RÚT BÀI', 'red')); t += step; break;
      case 'chain': at(() => { fx.sfx.chain(); fx.stamp(anchor(e.p), e.on ? '⛓️ BỊ XÍCH' : 'GỠ XÍCH', e.on ? '' : 'blue'); }); t += 90; break;
      case 'flip': at(() => fx.stamp(anchor(e.p), e.on ? '🏰 LẬT ÚP' : 'LẬT LẠI', 'blue')); t += 90; break;
      case 'show': at(() => { bubbleAt(e.p, `<b>Lật: ${CARD_INFO[e.card.type] ? esc(cardName(e.card)) : ''} ${suitify(SUIT_SYMBOL[e.card.suit])}${rankLabel(e.card.rank)}</b>`); fx.fly(cardHTML(e.card, 'sm'), handAnchor(e.p), $('#center'), { duration: 520 }); }); t += step; break;
      case 'pindian': at(() => { fx.sfx.drum(); fx.banner(`🀄 Đọ bài: ${esc(nameOf(e.a))} ${rankLabel(e.ca.rank)} – ${rankLabel(e.cb.rank)} ${esc(nameOf(e.b))}`, `${esc(nameOf(e.win ? e.a : e.b))} thắng!`); }); t += step * 2; break;
      case 'lightning': at(() => { fx.sfx.thunder(); fx.boltFx(anchor(e.p)); }); t += step; break;
      case 'passbolt': at(() => fx.fly('<div class="fly-emo">⚡</div>', anchor(e.from), anchor(e.to), { duration: 520 })); t += 60; break;
      case 'block': at(() => { fx.sfx.shield(); fx.shieldFx(anchor(e.p), '🛡️'); fx.stamp(anchor(e.p), 'VÔ HIỆU'); }); t += step; break;
      case 'dodge': at(() => fx.stamp(anchor(e.p), 'NÉ!', 'blue'), 120); break;
      case 'duel': at(() => fx.banner('🤺 Quyết đấu!', `${esc(nameOf(e.a))} ⚔ ${esc(nameOf(e.b))}`)); t += step; break;
      case 'nullify': at(() => { fx.sfx.nullify(); bubbleAt(e.p, '<b>🚫 Vô giải!</b>'); if (e.tgt) fx.stamp(anchor(e.tgt), e.count % 2 ? 'VÔ GIẢI' : 'GIẢI LẠI', 'blue'); if (e.card) fx.fly(cardHTML(e.card, 'sm'), handAnchor(e.p), $('#discard'), { duration: 380 }); }); t += step; break;
      case 'canceled': at(() => fx.stamp(anchor(e.p), 'BỊ HUỶ', 'blue')); break;
      case 'wugu': at(() => fx.fly(cardHTML(e.card, 'sm'), $('#center'), handAnchor(e.p), { duration: 460 })); t += 80; break;
      case 'skill': if (SKILLS[e.sk]) at(() => { bubbleAt(e.p, `<b>✨ ${SKILLS[e.sk].name}</b>`, 'skill'); (fx.sfx[SKILL_SFX[e.sk]] || fx.sfx.qin)(); }); else if (e.sk === 'qinglong' || e.sk === 'guanshi') at(() => { bubbleAt(e.p, `<b>${e.sk === 'qinglong' ? '🐉 Thanh long đao' : '🪓 Quán thạch phủ'}</b>`); fx.sfx.slash(); (e.to || []).forEach(id => fx.slashFx(anchor(id), 150)); }); t += 90; break;
      case 'win': at(() => {
        const m = me(); const side = r => r === 'lord' || r === 'loyal' ? 'lord' : r; const won = m && side(m.role) === e.w;
        fx.banner(won ? '🏆 Chiến thắng!' : '😵 Thất bại', winText(e.w)); if (won) { fx.sfx.win(); fx.confetti(); } else fx.sfx.lose(); musicStinger(won ? 'win' : 'lose');
      }, 600); break;
    }
  }
}
function musicMood(v) {
  if (!v || v.phase !== 'playing') { musicIntensity(-1); return; }
  if (!v.turnCount) { musicIntensity(0); return; }
  const alive = v.players.filter(p => p.alive), m = me(), a = v.ask; const lord = v.players.find(p => p.role === 'lord');
  let lv = 0;
  if (alive.some(p => p.hp <= 1) || alive.length <= Math.ceil(v.players.length / 2) || (m && m.alive && m.hp <= 2)) lv = 1;
  if ((alive.length <= 2 && v.players.length > 2) || (m && m.alive && m.hp <= 1) || (a && (a.purpose === 'dying' || a.purpose === 'duel')) || (lord && lord.alive && lord.hp <= 1)) lv = 2;
  musicIntensity(lv);
}

// ======================= THẢ EMOJI / CHỌC NHAU (shared/ui/react.js) =======================
// nút 😂 nằm trên thanh trên cùng (cạnh ⚙️) – không đè bài, nút hành động hay ghế
const reacts = createReactions({
  send: e => { if (!net) return; if (isHost) net.react('host', e); else net.react(e); },
  seatEl: id => id === myId ? $('#me-info .me-ava') : seatEl(id),
  myId: () => myId,
  nameOf: id => { const p = P(id); return p ? p.name.replace(' 🤖', '') : ''; },
  mount: $('#react-slot'), place: 'position:relative;right:auto;bottom:auto',
  phrases: TQ_PHRASES,
  onShow: () => fx.sfx.card(),
});
reacts.setVisible(false);

// ======================= TẢI LẠI TRANG: VÀO LẠI =======================
window.addEventListener('beforeunload', e => { if (net && view && view.phase === 'playing' && !isHost) { /* client vào lại được, không chặn */ } });
if (/debug/.test(location.hash)) window.__dbg = () => ({ net, view, ui });
(function resume() {
  const snap = loadSnapshot(), ses = session.load(GAME);
  const lk = linkCode(); // mở link mời phòng khác → vào thẳng phòng đó; link của chính phòng mình → vào lại như thường
  if (lk && !(ses && ses.code === lk)) { linkJoin(lk); return; }
  if (lk) clearLinkCode();
  if (snap && ses && ses.role === 'host') {
    musicResumeIfOn();
    net = new Host((snap.players.find(p => p.id === 'host') || {}).name || myName(), handlers, !!snap.offline, snap); isHost = true; myId = 'host';
    if (/debug/.test(location.hash)) window.__net = net;
    $('#code-box').style.display = snap.offline ? 'none' : '';
    show('screen-lobby'); if (!snap.offline) netStatus('Đã khôi phục phòng ' + snap.code, 'ok'); return;
  }
  if (ses && ses.role === 'client' && ses.code) {
    net = new Client(ses.code, ses.name || myName(), handlers, hintPref()); isHost = false; $('#code-box').style.display = ''; $('#room-code').textContent = ses.code;
    show('screen-lobby'); renderLobby();
  }
})();
