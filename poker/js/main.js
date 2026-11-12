import { Host, Client, MAX, loadSnapshot, session, setSpeedFn, POKER_PHRASES } from './net.js?v=13';
import { hintsAllowed, lockToggle, BOT_ONLY_NOTE } from '../../shared/ui/botonly.js?v=1';
import { linkCode, clearLinkCode, inviteUrl, joinByLink } from '../../shared/net/joinlink.js?v=2';
import { netStatus } from '../../shared/ui/status.js';
import { createReactions } from '../../shared/ui/react.js?v=2';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=125';
import { OPT_CHOICES } from './engine.js?v=2';
import { evaluate, preflopTier, TIER_TXT } from './eval.js?v=1';
import * as fx from './pfx.js?v=2';
import { openGuide } from './guide.js?v=2';
import { cardHTML } from './cards.js?v=1';
setSpeedFn(fx.S);

const GAME = 'poker';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
export const fmt = n => Math.round(n || 0).toLocaleString('vi-VN');
const dec1 = x => (Math.round(x * 10) / 10).toString().replace('.', ',');
export const fmtS = n => n >= 1e6 ? dec1(n / 1e6) + 'M' : n >= 1e5 ? Math.round(n / 1e3) + 'K' : n >= 1e4 ? dec1(n / 1e3) + 'K' : fmt(n);
const clean = n => String(n || '').replace(' 🤖', '');

let net = null, isHost = false, myId = null, lobby = null, view = null, prev = null, modalKey = null;
let dispBoard = 0, resultAt = 0, boardTimers = [], resultTimer = null, lastHand = 0, lastEvSeen = 0;
let raiseOpen = false, raiseTo = 0, foldArmed = 0;
let clockEnd = 0, clockTotal = 1, clockKind = null, clockPid = null, lastBeep = 0;
let G = null, renderedBoard = 0; // hình học bàn lần vẽ gần nhất
const hintPref = () => ls.get('poker-hint') !== '0';
// gợi ý bài chỉ có khi chơi với bot: phòng có ≥ 2 người thật thì tắt (theo danh sách người chơi hiện tại)
const hintOk = () => hintsAllowed(lobby || (view && view.players));
const hintOn = () => hintPref() && hintOk();

// ---------- lá bài ----------
export { cardHTML }; // lá bài: poker/js/cards.js (bộ bài SVG chung)
const AV_COL = ['#ff5a7a', '#ff8a3d', '#e0a800', '#2fb86f', '#1fa6a0', '#3d8bff', '#7a5cff', '#d94dff', '#ff2d87', '#5b6b8a'];
const avColor = name => { let h = 0; for (const ch of clean(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AV_COL[h % AV_COL.length]; };
const avatar = name => `<div class="av" style="background:${avColor(name)}">${esc([...clean(name).trim()][0] || '?').toUpperCase()}</div>`;

// ---------- màn hình / hộp thoại ----------
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); if (id !== 'screen-game') fx.musicMood('lobby'); }
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
function openModal(html, cls = '', key = null) { $('#modal-box').className = 'modal-box ' + cls; $('#modal-box').innerHTML = html; $('#modal').classList.add('open'); modalKey = key; $('#modal-box').scrollTop = 0; }
function closeModal() { $('#modal').classList.remove('open'); modalKey = null; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && modalKey !== 'over') closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modal').classList.contains('open') && modalKey !== 'over') closeModal(); });
window.__closeModal = closeModal;

// ---------- trang chủ ----------
$('#name').value = ls.get('bgvn-name') || '';
$('#hero').innerHTML = ['As', 'Kh', 'Qd', 'Jc', 'Ts'].map((c, i) => cardHTML(c, 'hero-c', `style="--i:${i - 2};animation-delay:${i * 90}ms"`)).join('') + '<div class="hero-chips"><i></i><i></i><i></i></div>';
function myName() { const n = $('#name').value.trim() || 'Bạn'; ls.set('bgvn-name', n); return n; }
const handlers = {
  onLobby(info, code, started) { lobby = info; syncHint(); $('#room-code').textContent = code; if (!started) { view = null; prev = null; renderLobby(); if (!$('#screen-lobby').classList.contains('active')) { closeModal(); show('screen-lobby'); } } },
  onState(v) { if (!v) { view = null; prev = null; closeModal(); show('screen-lobby'); renderLobby(); return; } onView(v); },
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
  if (offline) { session.save(GAME, { role: 'host', code: 'OFFLINE' }); for (let i = 0; i < 4; i++) net.addBot(); }
  $('#code-box').style.display = offline ? 'none' : '';
  show('screen-lobby');
}
$('#btn-offline').onclick = () => startHost(true);
$('#btn-create').onclick = () => startHost(false);
$('#btn-join').onclick = () => {
  const code = $('#join-code').value.trim(); if (code.length < 5) { toast('Nhập mã phòng 5 ký tự nhé.'); return; }
  fx.actx(); fx.musicResumeIfOn();
  if (net && net.leave) net.leave();
  net = new Client(code, myName(), handlers); isHost = false; $('#code-box').style.display = ''; toast('Đang kết nối…');
};
$('#join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-join').click(); });
$('#join-code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });
// link mời ?room=MÃ (shared/net/joinlink.js): mở link là vào thẳng phòng
const qcode = linkCode(); if (qcode) $('#join-code').value = qcode;
function linkJoin(code) { $('#join-code').value = code; joinByLink({ code, toast: m => toast(m), join: n => { $('#name').value = n; $('#btn-join').click(); }, abort: () => leave() }); }
function leave() { if (net) (net.leave ? net.leave() : net.destroy()); net = null; view = null; prev = null; lobby = null; closeModal(); reacts.setVisible(false); show('screen-home'); }
$('#btn-leave-lobby').onclick = leave;
function askLeave() { openModal(`<h2>Rời bàn?</h2><p class="center-t">${isHost ? 'Bạn là chủ phòng – rời đi sẽ kết thúc bàn cho mọi người.' : 'Bạn có thể vào lại bằng mã phòng.'}</p><div class="btns"><button class="btn" onclick="__closeModal()">Ở lại</button><button class="btn red" id="m-leave">Rời bàn</button></div>`); $('#m-leave').onclick = leave; }
$('#btn-leave').onclick = askLeave;
$('#btn-copy').onclick = () => { const url = inviteUrl($('#room-code').textContent); navigator.clipboard?.writeText(url).then(() => toast('Đã chép link mời 📋'), () => toast(url)); };

// ---------- sảnh ----------
const OPT_UI = {
  mode: ['Chế độ', { cash: '🎉 Chơi vui', tourn: '🏆 Giải đấu' }, { cash: 'Hết chip thì “Xin mẹ thêm chip” để chơi tiếp.', tourn: 'Hết chip là bị loại. Người cuối cùng còn chip vô địch!' }],
  chips: ['Chip khởi điểm', v => fmt(v)],
  bb: ['Mù nhỏ / mù lớn', v => `${fmt(v / 2)}/${fmt(v)}`],
  blindUp: ['Tăng mù', v => v ? `mỗi ${v} ván` : 'Không'],
  turnTime: ['Thời gian mỗi lượt (online)', v => v + ' giây'],
};
function renderLobby() {
  if (!lobby) return;
  const ps = lobby.players, o = lobby.opts;
  $('#pcount').textContent = `${ps.length}/${MAX}`;
  $('#plist').innerHTML = ps.map(p => `<li>${avatar(p.name)}<span>${esc(clean(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === myId ? ' <small>(bạn)</small>' : ''}${p.id === 'host' ? ' 👑' : ''}${!p.connected ? ' <small>📴</small>' : ''}</span>${isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</li>`).join('');
  $$('#plist [data-rm]').forEach(b => b.onclick = () => net.removePlayer(b.dataset.rm));
  $('#btn-addbot').style.display = isHost && ps.length < MAX ? '' : 'none';
  $('#opts').innerHTML = Object.entries(OPT_UI).map(([k, [title, lab, desc]]) => {
    const btns = OPT_CHOICES[k].map(v => `<button class="opt ${o[k] === v ? 'on' : ''}" data-k="${k}" data-v="${v}" ${isHost ? '' : 'disabled'}>${typeof lab === 'function' ? lab(v) : lab[v]}</button>`).join('');
    return `<div class="opt-row"><b>${title}</b><div class="opt-btns">${btns}</div>${desc ? `<small>${desc[o[k]]}</small>` : ''}</div>`;
  }).join('');
  $$('#opts [data-k]').forEach(b => b.onclick = () => net.setOpt(b.dataset.k, b.dataset.v));
  $('#btn-start').style.display = isHost ? '' : 'none';
  $('#wait-msg').style.display = isHost ? 'none' : '';
}
$('#btn-addbot').onclick = () => net && net.addBot();
$('#btn-start').onclick = () => { fx.actx(); net && net.start(); };

// ---------- công cụ ----------
const syncMusic = () => $('#btn-music-home').classList.toggle('on', fx.musicIsOn());
$('#btn-music-home').onclick = () => { fx.actx(); fx.musicToggle(); syncMusic(); }; syncMusic();
$('#btn-guide-home').onclick = () => openGuide(openModal, cardHTML);
const news = () => { openNews(GAME); $$('[data-news]').forEach(el => el.classList.remove('bgvn-dot')); };
$('#btn-news-home').onclick = news;
newsBadge($('#btn-news-home'), GAME); newsBadge($('#btn-menu'), GAME);
const syncHint = () => { $('#btn-hint').classList.toggle('on', hintOn()); lockToggle($('#btn-hint'), !hintOk()); };
$('#btn-hint').onclick = () => { if (!hintOk()) { toast('💡 Gợi ý bài: ' + BOT_ONLY_NOTE); return; } ls.set('poker-hint', hintPref() ? '0' : '1'); syncHint(); toast(hintOn() ? '💡 Bật gợi ý: hiện tên bài bạn đang có' : 'Đã tắt gợi ý bài'); render(); }; syncHint();
$('#btn-log').onclick = () => $('#log').classList.toggle('open');
$('#btn-log-close').onclick = () => $('#log').classList.remove('open');
$('#btn-board').onclick = () => openBoard();
$('#btn-menu').onclick = () => openMenu();
function openMenu() {
  const sp = Object.entries(fx.SPEEDS).map(([k, v]) => `<button class="opt ${fx.getSpeed() === k ? 'on' : ''}" data-sp="${k}">${v.name}</button>`).join('');
  openModal(`<button class="close-x" onclick="__closeModal()" aria-label="Đóng">✕</button><h2>⚙️ Cài đặt</h2>
    <div class="menu">
      <div class="m-row"><span>🎵 Nhạc nền</span><button class="opt ${fx.musicIsOn() ? 'on' : ''}" id="m-music">${fx.musicIsOn() ? 'Đang bật' : 'Đang tắt'}</button></div>
      <div class="m-row"><span>🔉 Âm lượng nhạc</span><input type="range" id="m-vol" min="0" max="1" step="0.05" value="${fx.musicVolume()}"></div>
      <div class="m-row"><span>🔔 Âm lượng hiệu ứng</span><input type="range" id="m-sfxvol" min="0" max="1" step="0.05" value="${fx.sfxVolume()}"></div>
      <div class="m-row"><span>🔊 Hiệu ứng âm thanh</span><button class="opt ${fx.isMuted() ? '' : 'on'}" id="m-mute">${fx.isMuted() ? 'Đang tắt' : 'Đang bật'}</button></div>
      <div class="m-row"><span>⚡ Tốc độ bot & hiệu ứng</span><div class="opt-btns">${sp}</div></div>
      <div class="m-row"><span>💡 Gợi ý bài cho người mới${hintOk() ? '' : `<br><small style="opacity:.7">🔒 ${BOT_ONLY_NOTE}</small>`}</span><button class="opt ${hintOn() ? 'on' : ''}" id="m-hint" ${hintOk() ? '' : 'disabled'}>${!hintOk() ? 'Đang tắt' : hintOn() ? 'Đang bật' : 'Đang tắt'}</button></div>
      <div class="m-btns"><button class="btn" id="m-guide">📖 Hướng dẫn</button><button class="btn" id="m-news">📝 Có gì mới</button><button class="btn red" id="m-quit">🚪 Rời bàn</button></div>
    </div>`, '', 'menu');
  $('#m-music').onclick = () => { fx.actx(); fx.musicToggle(); syncMusic(); openMenu(); };
  $('#m-vol').oninput = e => fx.musicVolume(+e.target.value);
  $('#m-sfxvol').oninput = e => fx.sfxVolume(+e.target.value);
  $('#m-sfxvol').onchange = () => fx.sfx.chip();
  $('#m-mute').onclick = () => { fx.toggleMute(); openMenu(); };
  $('#m-hint').onclick = () => { if (!hintOk()) return; ls.set('poker-hint', hintPref() ? '0' : '1'); syncHint(); render(); openMenu(); };
  $$('[data-sp]').forEach(b => b.onclick = () => { fx.setSpeed(b.dataset.sp); openMenu(); });
  $('#m-guide').onclick = () => openGuide(openModal, cardHTML);
  $('#m-news').onclick = () => { closeModal(); news(); };
  $('#m-quit').onclick = askLeave;
}
function openBoard() {
  const v = view; if (!v) return;
  const tourn = v.opts.mode === 'tourn', base = v.opts.chips;
  const rows = [...v.players].sort((a, b) => tourn ? ((a.out ? a.place : 0) - (b.out ? b.place : 0)) || b.chips - a.chips : b.chips - a.chips);
  openModal(`<button class="close-x" onclick="__closeModal()" aria-label="Đóng">✕</button><h2>🏆 Bảng chip</h2>
    <p class="center-t sm">${tourn ? `Giải đấu · ván ${v.handNo} · mù ${fmt(v.sb)}/${fmt(v.bb)}` : `Chơi vui · mỗi lần xin mẹ được ${fmt(base)} chip`}</p>
    <table class="lb"><thead><tr><th></th><th>Người chơi</th><th>Chip</th><th>${tourn ? 'Hạng' : 'Lời/lỗ'}</th></tr></thead><tbody>${rows.map((p, i) => {
      const netv = p.chips - base * (1 + p.rebuys);
      return `<tr class="${p.id === myId ? 'me' : ''}"><td>${i + 1}</td><td class="nm">${avatar(p.name)}<span>${esc(clean(p.name))}${p.id === myId ? ' <small>(bạn)</small>' : ''}${p.rebuys ? `<small class="rb">xin mẹ ×${p.rebuys}</small>` : ''}</span></td><td><b>${fmt(p.chips)}</b></td><td>${tourn ? (p.out ? `#${p.place}` : '–') : `<span class="${netv >= 0 ? 'up' : 'down'}">${netv >= 0 ? '+' : ''}${fmt(netv)}</span>`}</td></tr>`;
    }).join('')}</tbody></table><p class="center-t sm">Chip ảo, chỉ để chơi vui 😉</p>`, '', 'board');
}

// ---------- gửi hành động ----------
function send(a) { if (!net) return; if (isHost) net.act('host', a); else net.act(a); }
const meP = () => view && view.players.find(p => p.id === myId);
const pname = id => clean((view.players.find(p => p.id === id) || {}).name || '?');
const myTurn = () => view && view.phase === 'playing' && view.legal && view.players[view.turn] && view.players[view.turn].id === myId;

// ---------- nhận state mới ----------
function onView(v) {
  prev = view; view = v;
  if (v.clock) { clockEnd = Date.now() + v.clock.ms; clockTotal = v.clock.total || 1; clockKind = v.clock.kind; clockPid = v.clock.pid; } else { clockEnd = 0; clockKind = null; clockPid = null; }
  const fresh = !$('#screen-game').classList.contains('active');
  if (fresh) { show('screen-game'); prev = null; closeModal(); }
  const newHand = !prev || v.handNo !== prev.handNo;
  if (newHand) { boardTimers.forEach(clearTimeout); boardTimers = []; clearTimeout(resultTimer); dispBoard = v.board.length; resultAt = v.result ? Date.now() : 0; raiseOpen = false; if (prev && modalKey === 'over') closeModal(); }
  if (!myTurn()) raiseOpen = false;
  // bài chung mới: lật dần (chia nốt khi tất tay thì chậm từng lá cho hồi hộp)
  const newEv = v.ev.filter(e => e.n > (prev ? prev.evN : v.evN));
  const runout = newEv.find(e => e.k === 'runout');
  let boardDone = 0;
  if (!newHand && v.board.length > dispBoard) {
    const steps = []; let b = dispBoard;
    while (b < v.board.length) { const nb = b === 0 ? 3 : b + 1; steps.push(Math.min(nb, v.board.length)); b = nb; }
    const gap = runout ? 1100 : 0, first = prev && prev.players.some(p => p.bet > 0) ? 450 : 150;
    steps.forEach((nb, i) => { const t = (first + i * gap + (runout ? 500 : 0)) * fx.S(); boardDone = t; boardTimers.push(setTimeout(() => { dispBoard = nb; render(); fx.sfx.flip(); }, t)); });
  }
  if (v.result && !(prev && prev.result && prev.handNo === v.handNo)) {
    const delay = boardDone + (v.result.kind === 'showdown' ? 700 : 450) * fx.S();
    resultAt = Date.now() + delay; clearTimeout(resultTimer); resultTimer = setTimeout(() => { render(); celebrate(); }, delay + 20);
  }
  render();
  animate(prev, v, newEv, newHand);
  if (newHand && v.ev.some(e => e.k === 'level' && e.n > lastEvSeen) && prev) { fx.banner(`⬆️ Mù tăng: ${fmt(v.sb)}/${fmt(v.bb)}`, 'gold'); fx.sfx.level(); }
  lastEvSeen = v.evN;
  if (myTurn() && !(prev && prev.phase === 'playing' && prev.players[prev.turn] && prev.players[prev.turn].id === myId && prev.handNo === v.handNo && prev.street === v.street)) setTimeout(() => { if (myTurn()) fx.sfx.turn(); }, 300 * fx.S());
  if (v.phase === 'over') showOver(v);
}
const resultShown = () => view && view.result && Date.now() >= resultAt;

// ---------- hình học bàn: ghế quanh hình bầu dục (chia đều theo chu vi) ----------
function geometry(v) {
  const T = $('#table'), W = T.clientWidth, H = T.clientHeight;
  const small = W < 560 || H < 430;
  const big = W >= 900 && H >= 470;
  const PW = small ? Math.round(Math.min(92, Math.max(80, W * 0.235))) : big ? 136 : 108, PH = small ? 44 : big ? 62 : 54, mini = small ? 26 : big ? 40 : 34;
  const topPad = mini * 1.4 - 4, botPad = 20;
  const top = topPad + PH / 2, bot = H - botPad - PH / 2;
  const cy = (top + bot) / 2, cx = W / 2;
  let ry = (bot - top) / 2, rx = W / 2 - PW / 2 - 10;
  rx = Math.min(rx, ry * 2.05); ry = Math.min(ry, rx * 1.6);
  // điểm trên elip: t = 0 ở dưới cùng (chỗ mình), tăng dần theo chiều kim đồng hồ (sang trái)
  const P = t => ({ x: cx - rx * Math.sin(t), y: cy + ry * Math.cos(t) });
  const N = 720, cum = [0]; let last = P(0);
  for (let i = 1; i <= N; i++) { const p = P(i / N * 2 * Math.PI); cum.push(cum[i - 1] + Math.hypot(p.x - last.x, p.y - last.y)); last = p; }
  const L = cum[N], n = v.players.length, myIdx = Math.max(0, v.players.findIndex(p => p.id === myId));
  const seats = {};
  v.players.forEach((p, i) => {
    const k = (i - myIdx + n) % n, target = L * k / n;
    let j = 0; while (j < N && cum[j] < target) j++;
    seats[p.id] = { ...P(j / N * 2 * Math.PI), k };
  });
  // bài chung: rộng tối đa sao cho không đè ghế nào nằm ngang tầm giữa bàn
  const gap = small ? 4 : 6;
  let cw = small ? 50 : big ? 78 : 66;
  const bandFor = c => [cy - c * 0.7 - 6, cy + c * 0.7 + 6]; // chỉ hàng bài (pot / kết quả hẹp, nằm giữa)
  for (let it = 0; it < 3; it++) {
    const [b0, b1] = bandFor(cw);
    let half = rx - 10;
    for (const s of Object.values(seats)) if (s.y + PH / 2 + 12 > b0 && s.y - PH / 2 - mini < b1) half = Math.min(half, Math.abs(s.x - cx) - PW / 2 - 8);
    cw = Math.max(30, Math.min(small ? 50 : big ? 78 : 66, Math.floor((2 * half - 4 * gap) / 5)));
  }
  const boardW = 5 * cw + 4 * gap, [b0, b1] = bandFor(cw);
  const boardRect = { l: cx - boardW / 2 - 4, r: cx + boardW / 2 + 4, t: b0, b: b1 };
  // chỗ đặt chip cược của từng ghế (phía trong bàn). Không có chỗ trống (đè bài chung / ghế khác) thì ghi số chip lên nhãn dưới ghế.
  const pills = {}, PLW = small ? 50 : big ? 76 : 66, PLH = big ? 26 : 22;
  const rects = Object.values(seats).map(s => ({ l: s.x - PW / 2 - 4, r: s.x + PW / 2 + 4, t: s.y - PH / 2 - mini * 1.1, b: s.y + PH / 2 + 12 }));
  const over = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  const free = (x, y) => { const q = { l: x - PLW / 2, r: x + PLW / 2, t: y - PLH / 2, b: y + PLH / 2 }; return !over(q, boardRect) && !rects.some(r => over(q, r)) && q.l > 2 && q.r < W - 2; };
  for (const [id, s] of Object.entries(seats)) {
    const dx = cx - s.x, dy = cy - s.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    const edge = Math.min((PW / 2 + PLW / 2) / Math.max(1e-3, Math.abs(ux)), (PH / 2 + PLH / 2 + (uy < 0 ? mini : 10)) / Math.max(1e-3, Math.abs(uy)));
    pills[id] = null;
    for (const extra of [4, 12, 22]) { const x = s.x + ux * (edge + extra), y = s.y + uy * (edge + extra); if (free(x, y)) { pills[id] = { x, y }; break; } }
  }
  return { W, H, cx, cy, rx, ry, PW, PH, mini, cw, gap, boardW, seats, pills, small, big };
}

// ---------- vẽ bàn ----------
const TAG = { sb: 'Mù nhỏ', bb: 'Mù lớn', fold: 'Bỏ bài', check: 'Xem', call: 'Theo', bet: 'Cược', raise: 'Tố', allin: 'TẤT TAY' };
function render() {
  const v = view; if (!v || !$('#screen-game').classList.contains('active')) return;
  // nhạc: river hoặc có người all-in = gay cấn; hết giải về nhạc sảnh
  fx.musicMood(v.phase === 'over' ? 'lobby' : v.phase === 'playing' && (v.street === 'river' || v.players.some(p => p.allIn && p.inHand && !p.folded)) ? 'tense' : 'game');
  syncHint();
  const g = G = geometry(v);
  const T = $('#table'); T.classList.toggle('big', g.big); T.style.setProperty('--pw', g.PW + 'px'); T.style.setProperty('--ph', g.PH + 'px'); T.style.setProperty('--mini', g.mini + 'px'); T.style.setProperty('--cw', g.cw + 'px');
  const felt = $('#felt'); Object.assign(felt.style, { left: g.cx - g.rx + 'px', top: g.cy - g.ry + 'px', width: 2 * g.rx + 'px', height: 2 * g.ry + 'px' });
  const shownRes = resultShown() ? v.result : null;
  const best = shownRes && shownRes.kind === 'showdown' ? new Set(shownRes.pots[0].best) : null;
  const winners = shownRes ? new Set(Object.keys(shownRes.won)) : new Set();
  // gợi ý: 5 lá đang tạo nên bài của mình
  const me = meP();
  let myEval = null;
  const board = v.board.slice(0, dispBoard);
  if (me && me.hole && board.length >= 3) myEval = evaluate([...me.hole, ...board]);
  const hl = hintOn() && myEval && !best && !me.folded ? new Set(myEval.best) : null;
  // thông tin trên thanh trên
  $('#info').innerHTML = `<b>${v.opts.mode === 'tourn' ? '🏆 ' : ''}Ván ${v.handNo}</b><span>Mù ${fmtS(v.sb)}/${fmtS(v.bb)}${v.opts.blindUp ? ` · ⬆${v.nextLevelIn === 1 ? ' ván sau' : ' sau ' + v.nextLevelIn}` : ''}</span>`;
  // ghế
  const curId = v.phase === 'playing' && v.players[v.turn] ? v.players[v.turn].id : null;
  $('#seats').innerHTML = v.players.map((p, i) => {
    const s = g.seats[p.id], mine = p.id === myId;
    const cls = ['seat', mine ? 'me' : '', p.id === curId ? 'turn' : '', p.folded && p.inHand ? 'folded' : '', !p.inHand ? 'idle' : '', p.allIn ? 'allin' : '', winners.has(p.id) ? 'win' : ''].join(' ');
    let tag = '';
    const hand = shownRes && shownRes.hands[p.id];
    if (p.out) tag = `<span class="tag out">Bị loại #${p.place}</span>`;
    else if (p.busted) tag = '<span class="tag out">Cháy túi 💸</span>';
    else if (hand) tag = `<span class="tag hand ${winners.has(p.id) ? 'w' : ''}">${hand.name}</span>`;
    else if (shownRes && winners.has(p.id)) tag = `<span class="tag hand w">Thắng!</span>`;
    else if (p.last && p.inHand) tag = `<span class="tag t-${p.last.t}">${TAG[p.last.t] || ''}${p.bet > 0 && !g.pills[p.id] ? ` <i class="ci"></i>${fmtS(p.bet)}` : p.last.t === 'raise' || p.last.t === 'bet' ? ' ' + fmtS(p.last.a) : ''}</span>`;
    else if (p.bet > 0 && !g.pills[p.id]) tag = `<span class="tag"><i class="ci"></i>${fmtS(p.bet)}</span>`;
    else if (!p.inHand) tag = '<span class="tag out">Ngồi chờ</span>';
    let cards = '';
    if (!mine && p.inHand && p.hasCards) cards = p.hole ? `<div class="hole open">${p.hole.map(c => cardHTML(c, `mini ${best ? (best.has(c) && winners.has(p.id) ? 'win' : 'dim') : ''}`)).join('')}</div>` : `<div class="hole">${cardHTML(null, 'mini')}${cardHTML(null, 'mini')}</div>`;
    const away = v.away && v.away.includes(p.id);
    return `<div class="${cls}" data-pid="${p.id}" style="left:${s.x}px;top:${s.y}px">
      ${cards}<div class="plate">${avatar(p.name)}<div class="pt"><b class="nm">${mine ? 'Bạn' : esc(clean(p.name))}${away ? ' 📴' : ''}</b><span class="ch"><i class="ci"></i>${fmtS(p.chips)}</span></div>${p.id === clockPid && clockKind === 'turn' ? '<div class="tbar"><i></i></div>' : ''}</div>
      ${i === v.button ? '<span class="dealer" title="Dealer">D</span>' : ''}${tag}</div>`;
  }).join('');
  // chip cược đang đặt
  $('#pills').innerHTML = v.players.filter(p => p.bet > 0 && g.pills[p.id]).map(p => { const q = g.pills[p.id]; return `<div class="pill" data-pid="${p.id}" style="left:${q.x}px;top:${q.y}px"><i class="ci"></i>${fmtS(p.bet)}</div>`; }).join('');
  // giữa bàn
  const C = $('#center'); C.style.left = g.cx + 'px'; C.style.top = g.cy + 'px';
  $('#board').innerHTML = Array.from({ length: 5 }, (_, i) => {
    const c = board[i];
    if (!c) return '<div class="slot"></div>';
    const k = best ? (best.has(c) ? 'win' : 'dim') : hl && hl.has(c) ? 'hl' : '';
    return cardHTML(c, `${k} ${i >= (renderedBoard || 0) ? 'flip-in' : ''}`);
  }).join('');
  renderedBoard = board.length;
  const collected = v.phase === 'playing' ? v.pots.reduce((t, p) => t + p.amount, 0) : 0;
  let potH = '';
  if (v.phase === 'playing') {
    potH = collected ? `<span class="pot-main"><i class="ci"></i>Pot ${fmt(collected)}</span>` : '';
    if (v.pots.length > 1) potH += `<span class="pot-side">${v.pots.map((p, i) => `${i ? 'Phụ ' + i : 'Chính'} ${fmtS(p.amount)}`).join(' · ')}</span>`;
  } else if (v.result && !shownRes) {
    const tot = v.result.pots.reduce((t, p) => t + p.amount, 0);
    potH = `<span class="pot-main"><i class="ci"></i>Pot ${fmt(tot)}</span>`;
  }
  $('#pot').innerHTML = potH;
  $('#result').innerHTML = shownRes ? resultLines(shownRes) : v.phase === 'playing' && v.street !== 'preflop' && !board.length ? '' : '';
  renderMe(v, me, myEval, board);
  // nhật ký
  $('#log-list').innerHTML = v.log.map(l => `<li class="${/^—/.test(l) ? 'hd' : ''}">${esc(l)}</li>`).join('');
  $('#log-list').scrollTop = 1e6;
  reacts.setVisible(true);
}
function resultLines(r) {
  const nameOf = id => id === myId ? 'Bạn' : pname(id);
  const pots = r.pots.slice(0, 3);
  return pots.map((p, i) => {
    const who = p.winners.map(nameOf).map(esc).join(' + ');
    const lab = r.pots.length > 1 ? `<small>${i ? 'Pot phụ ' + i : 'Pot chính'}</small> ` : '';
    const how = r.kind === 'fold' ? 'mọi người bỏ bài' : esc(p.desc);
    return `<div class="rl ${p.winners.includes(myId) ? 'mine' : ''}">${lab}${p.winners.length > 1 ? '🤝' : '🏆'} <b>${who}</b> ${p.winners.length > 1 ? 'chia' : 'ăn'} ${fmt(p.amount)}<em>${how}</em></div>`;
  }).join('') + (r.pots.length > 3 ? `<div class="rl"><small>+${r.pots.length - 3} pot phụ nữa (xem 📜)</small></div>` : '');
}

// ---------- khu vực của mình: bài tẩy, gợi ý, nút ----------
function renderMe(v, me, myEval, board) {
  if (!me) return;
  const shownRes = resultShown() ? v.result : null;
  const best = shownRes && shownRes.kind === 'showdown' ? new Set(shownRes.pots[0].best) : null;
  const hl = hintOn() && myEval && !best && !me.folded ? new Set(myEval.best) : null;
  const mc = $('#mycards');
  if (me.hole) {
    const key = v.handNo + me.hole.join('');
    const html = me.hole.map(c => cardHTML(c, `big ${best ? (best.has(c) && shownRes.won[myId] ? 'win' : 'dim') : hl && hl.has(c) ? 'hl' : ''} ${me.folded ? 'folded' : ''}`)).join('');
    mc.innerHTML = html; if (mc.dataset.k !== key) { mc.dataset.k = key; mc.querySelectorAll('.card').forEach((el, i) => { el.style.animationDelay = (500 + i * 120) * fx.S() + 'ms'; el.classList.add('flip-in'); }); }
  } else mc.innerHTML = `${cardHTML(null, 'big ghost')}${cardHTML(null, 'big ghost')}`;
  // dòng trạng thái
  const L = v.legal, st = $('#status'), cur = v.players[v.turn];
  let s = '';
  const myT = myTurn();
  $('#me').classList.toggle('myturn', !!myT);
  if (v.phase === 'over') s = v.winner === myId ? '🏆 <b>Bạn vô địch!</b>' : `🏆 <b>${esc(pname(v.winner))}</b> vô địch giải!`;
  else if (v.phase === 'handover') {
    if (shownRes) { const n = shownRes.net[myId] || 0, w = shownRes.won[myId] || 0; s = n > 0 ? `🎉 <b>Bạn ăn ${fmt(w)}</b> (lời +${fmt(n)})` : w > 0 ? `😌 Lấy lại ${fmt(w)} (${n ? 'lỗ ' + fmt(-n) : 'hoà vốn'})` : n < 0 ? `😢 Ván này mất ${fmt(-n)}` : 'Ván xong'; }
    else s = '🃏 Lật bài…';
  } else if (myT) s = `🎯 <b>Tới lượt bạn!</b> ${L.canCheck ? 'Xem miễn phí hoặc cược' : `Cần theo <b>${fmt(L.toCall)}</b>`}`;
  else if (me.out) s = '💀 Bạn đã bị loại – ngồi xem tiếp nhé';
  else if (me.busted) s = '💸 Cháy túi rồi! Xin mẹ thêm chip đi 🥺';
  else if (me.folded) s = `🙈 Bạn đã bỏ bài · chờ <b>${esc(cur ? clean(cur.name) : '')}</b>`;
  else if (cur) s = `⏳ <b>${esc(clean(cur.name))}</b> đang nghĩ…${v.away && v.away.includes(cur.id) ? ' (rớt mạng – máy đánh giùm)' : ''}`;
  st.innerHTML = s;
  // gợi ý cho người mới
  const h = $('#hint');
  if (hintOn() && me.hole && !me.folded) {
    if (board.length >= 3 && myEval) h.innerHTML = `💡 Bạn đang có: <b>${esc(myEval.desc)}</b>`;
    else { const t = preflopTier(me.hole); h.innerHTML = `💡 <b>${esc(t.name)}</b> – ${TIER_TXT[t.tier]}`; }
    h.style.display = '';
  } else if (!hintOn() && me.hole && !me.folded) { h.innerHTML = posTxt(v); h.style.display = h.innerHTML ? '' : 'none'; }
  else h.style.display = 'none';
  renderActions(v, me, L);
}
function posTxt(v) {
  const i = v.players.findIndex(p => p.id === myId);
  return i === v.button ? 'Bạn đang giữ nút Dealer' : i === v.sbIdx ? 'Bạn đặt mù nhỏ' : i === v.bbIdx ? 'Bạn đặt mù lớn' : '';
}
function renderActions(v, me, L) {
  const A = $('#actions'), R = $('#raise');
  let html = '';
  if (v.phase === 'handover' || v.phase === 'over') {
    const secs = clockKind === 'next' && clockEnd ? Math.max(0, Math.ceil((clockEnd - Date.now()) / 1000)) : 0;
    if (me.busted && v.opts.mode === 'cash') html += `<button class="btn pink big-a" data-a="rebuy">🥺 Xin mẹ thêm chip <small>+${fmt(v.opts.chips)}</small></button>`;
    if (v.phase === 'over') html += isHost ? `<button class="btn pri big-a" data-a="again">🏆 Giải mới</button><button class="btn" data-a="lobby">Về sảnh</button>` : '<p class="wait-a">Chờ chủ phòng mở giải mới…</p>';
    else if (isHost) html += `<button class="btn pri big-a" data-a="next">▶ Ván tiếp${secs ? ` <small>(${secs}s)</small>` : ''}</button>`;
    else html += `<p class="wait-a">Ván mới sau ${secs || '…'}s</p>`;
    R.hidden = true;
  } else if (me.busted && v.opts.mode === 'cash') {
    html = `<button class="btn pink big-a" data-a="rebuy">🥺 Xin mẹ thêm chip <small>+${fmt(v.opts.chips)}</small></button>`; R.hidden = true;
  } else if (myTurn() && L) {
    if (raiseOpen && L.canRaise) {
      renderRaise(v, L); R.hidden = false;
      const allin = raiseTo >= L.maxTo;
      html = `<button class="btn" data-a="cancel">✕ Huỷ</button><button class="btn pri wide" data-a="raise">${allin ? '🔥 TẤT TAY' : L.isBet ? '✓ Cược' : '✓ Tố tới'} ${fmt(raiseTo)}</button>`;
    } else {
      R.hidden = true;
      const callAll = L.toCall >= me.chips;
      html = `<button class="btn red" data-a="fold">Bỏ bài</button>` +
        (L.canCheck ? `<button class="btn green" data-a="check">✓ Xem</button>` : `<button class="btn green" data-a="call">${callAll ? '🔥 Tất tay' : 'Theo'} <b>${fmtS(L.toCall)}</b></button>`) +
        (L.canRaise ? `<button class="btn gold" data-a="open">${L.isBet ? 'Cược' : 'Tố'} ▲</button>` : '');
    }
  } else {
    R.hidden = true; raiseOpen = false;
    html = `<button class="btn red" disabled>Bỏ bài</button><button class="btn green" disabled>Xem / Theo</button><button class="btn gold" disabled>Tố ▲</button>`;
  }
  A.innerHTML = html;
  A.querySelectorAll('[data-a]').forEach(b => b.onclick = () => onAct(b.dataset.a));
}
function onAct(a) {
  const v = view, L = v && v.legal;
  fx.actx();
  if (a === 'rebuy') { send({ type: 'rebuy' }); fx.sfx.rebuy(); return; }
  if (a === 'next') { if (isHost) net.nextNow(); return; }
  if (a === 'again') { closeModal(); net.restart(); net.start(); return; }
  if (a === 'lobby') { closeModal(); net.restart(); return; }
  if (!L) return;
  if (a === 'fold') {
    if (L.canCheck && Date.now() > foldArmed) { foldArmed = Date.now() + 2500; toast('Đang được Xem miễn phí mà! Bấm Bỏ bài lần nữa nếu chắc 🤨'); return; }
    send({ type: 'fold' }); return;
  }
  if (a === 'check') return send({ type: 'check' });
  if (a === 'call') return send({ type: 'call' });
  if (a === 'open') { raiseOpen = true; raiseTo = L.isBet ? clampTo(Math.round(L.pot * 0.5), L) : L.minTo; render(); return; }
  if (a === 'cancel') { raiseOpen = false; render(); return; }
  if (a === 'raise') { raiseOpen = false; send(raiseTo >= L.maxTo ? { type: 'allin' } : { type: 'raise', to: raiseTo }); }
}
const clampTo = (x, L) => Math.max(L.minTo, Math.min(L.maxTo, Math.round(x)));
function potTo(frac, v, L) { return clampTo(v.currentBet + frac * (L.pot + L.toCall), L); }
function renderRaise(v, L) {
  const R = $('#raise'); raiseTo = clampTo(raiseTo, L);
  const step = Math.max(1, v.sb);
  const quick = [['Min', L.minTo], ['½ Pot', potTo(0.5, v, L)], ['Pot', potTo(1, v, L)], ['Tất tay', L.maxTo]];
  R.innerHTML = `<div class="r-quick">${quick.map(([t, x]) => `<button class="opt ${raiseTo === x ? 'on' : ''}" data-to="${x}">${t}<small>${fmtS(x)}</small></button>`).join('')}</div>
    <div class="r-slide"><button class="opt pm" data-d="-1" aria-label="Bớt">−</button><input type="range" id="r-range" min="${L.minTo}" max="${L.maxTo}" step="1" value="${raiseTo}" aria-label="Số chip tố"><button class="opt pm" data-d="1" aria-label="Thêm">＋</button></div>`;
  R.querySelectorAll('[data-to]').forEach(b => b.onclick = () => { raiseTo = +b.dataset.to; fx.sfx.chip(1); render(); });
  R.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { raiseTo = clampTo(raiseTo + (+b.dataset.d) * v.bb, L); fx.sfx.chip(1); render(); });
  const rg = R.querySelector('#r-range');
  rg.oninput = () => {
    let x = +rg.value; if (x < L.maxTo) x = Math.max(L.minTo, Math.round(x / step) * step);
    raiseTo = clampTo(x, L);
    const btn = $('#actions [data-a="raise"]'); if (btn) btn.innerHTML = `${raiseTo >= L.maxTo ? '🔥 TẤT TAY' : L.isBet ? '✓ Cược' : '✓ Tố tới'} ${fmt(raiseTo)}`;
    R.querySelectorAll('[data-to]').forEach(b => b.classList.toggle('on', +b.dataset.to === raiseTo));
  };
  rg.onchange = () => render();
}

// ---------- hoạt ảnh: chia bài, chip bay ----------
const seatEl = id => $(`.seat[data-pid="${id}"] .plate`);
const betEl = id => $(`.pill[data-pid="${id}"]`) || $(`.seat[data-pid="${id}"] .tag`);
const potEl = () => $('#pot .pot-main') || $('#board');
const CHIP = '<i class="chipfly"></i>';
let prevPills = {};
function animate(a, b, newEv, newHand) {
  const tb = $('#table').getBoundingClientRect();
  const abs = q => q ? { x: tb.left + q.x, y: tb.top + q.y } : null;
  if (newHand) {
    // chia bài: lá úp bay từ giữa bàn tới từng người
    const order = b.players.filter(p => p.inHand);
    let k = 0;
    for (let r = 0; r < 2; r++) for (const p of order) { const to = p.id === myId ? $('#mycards') : seatEl(p.id); fx.fly(cardHTML(null, 'mini'), $('#board'), to, { delay: k++ * 70, duration: 320 }); }
    setTimeout(() => fx.sfx.deal(), 30); setTimeout(() => fx.sfx.deal(), 300 * fx.S());
    // mù
    for (const p of b.players) if (p.bet > 0) fx.fly(CHIP, seatEl(p.id), betEl(p.id), { delay: 200, duration: 380 });
  } else if (a) {
    // cược thêm: chip bay từ ghế ra trước mặt
    for (const p of b.players) {
      const q = a.players.find(x => x.id === p.id); if (!q) continue;
      if (p.bet > q.bet && a.street === b.street) { fx.fly(CHIP, seatEl(p.id), betEl(p.id), { duration: 340 }); }
    }
    // gom chip vào pot khi hết vòng
    const collect = newEv.some(e => e.k === 'collect');
    if (collect) {
      let k = 0;
      for (const q of a.players) if (q.bet > 0 || (b.players.find(x => x.id === q.id) || {}).bet > q.bet) { const from = prevPills[q.id] ? abs(prevPills[q.id]) : seatEl(q.id); fx.fly(CHIP, from, potEl(), { delay: 120 + k++ * 40, duration: 420 }); }
      if (k) setTimeout(() => fx.sfx.collect(), 200 * fx.S());
    }
    // âm thanh hành động
    for (const e of newEv) if (e.k === 'act') {
      if (e.t === 'fold') fx.sfx.fold(); else if (e.t === 'check') fx.sfx.check(); else if (e.t === 'allin') { fx.sfx.allin(); const el = seatEl(e.pid); if (el) fx.floatText(el, 'TẤT TAY!', 'allin'); } else fx.sfx.chip(e.t === 'call' ? 2 : 4);
    } else if (e.k === 'rebuy') { fx.sfx.rebuy(); const el = seatEl(e.pid); if (el) fx.floatText(el, '+' + fmtS(e.a) + ' 🥺', 'gold'); if (e.pid === myId) toast('Mẹ cho thêm ' + fmt(e.a) + ' chip, chơi cẩn thận nha 🥺'); }
    if (newEv.some(e => e.k === 'runout')) setTimeout(() => fx.banner('🔥 Tất tay! Lật bài!', 'red'), 200 * fx.S());
  }
  prevPills = {}; if (G) for (const [id, q] of Object.entries(G.pills)) prevPills[id] = q || { x: G.seats[id].x, y: G.seats[id].y + G.PH / 2 + 4 };
  // chỉ giữ vị trí của người đang có cược
  for (const id of Object.keys(prevPills)) { const p = b.players.find(x => x.id === id); if (!p || !p.bet) delete prevPills[id]; }
}
// khoảnh khắc ăn pot
function celebrate() {
  const v = view; if (!v || !v.result) return;
  const r = v.result;
  let k = 0;
  for (const [id, amt] of Object.entries(r.won)) {
    const el = seatEl(id) || (id === myId ? $('#mycards') : null);
    for (let i = 0; i < Math.min(6, 2 + Math.round(amt / v.bb / 10)); i++) fx.fly(CHIP, potEl() || $('#board'), el, { delay: k * 60 + i * 50, duration: 520 });
    setTimeout(() => { const e2 = seatEl(id); if (e2) { fx.floatText(e2, '+' + fmtS(amt), 'win'); fx.pop(e2); } }, 600 * fx.S());
    k++;
  }
  const mine = r.won[myId];
  if (mine) { fx.sfx.win(); if ((r.net[myId] || 0) >= v.bb * 25) fx.confetti(70); }
  else if ((r.net[myId] || 0) < 0) fx.sfx.lose(); else fx.sfx.collect();
  if (r.kind === 'showdown') {
    const p0 = r.pots[0];
    const who = p0.winners.map(id => id === myId ? 'Bạn' : pname(id)).join(' + ');
    fx.banner(`${p0.winners.length > 1 ? '🤝' : '🏆'} ${who}: ${p0.name}!`, p0.winners.includes(myId) ? 'gold' : '');
  }
  for (const e of v.ev) if (e.k === 'bust' && e.n > (v.evN - 6)) { if (e.pid === myId) { fx.sfx.bust(); setTimeout(() => toast(v.opts.mode === 'cash' ? '💸 Cháy túi! Bấm “Xin mẹ thêm chip” để chơi tiếp' : '💀 Hết chip – bạn bị loại!'), 900); } }
}
function showOver(v) {
  if (modalKey === 'over') return;
  setTimeout(() => {
    if (!view || view.phase !== 'over' || modalKey === 'over') return;
    const rows = [...view.players].sort((a, b) => (a.place || 99) - (b.place || 99));
    const meWin = view.winner === myId;
    openModal(`<div class="over"><div class="big">🏆</div><h2>${meWin ? 'Bạn vô địch giải đấu!' : esc(pname(view.winner)) + ' vô địch!'}</h2><p class="center-t sm">Sau ${view.handNo} ván · cầm trọn ${fmt(view.players.find(p => p.id === view.winner).chips)} chip ảo</p>
      <ol class="podium">${rows.map(p => `<li class="${p.id === myId ? 'me' : ''}"><span class="pl">#${p.place || 1}</span>${avatar(p.name)}<span>${esc(clean(p.name))}</span></li>`).join('')}</ol>
      <div class="btns">${isHost ? '<button class="btn pri" id="o-again">🏆 Giải mới</button><button class="btn" id="o-lobby">Về sảnh</button>' : '<p>Chờ chủ phòng mở giải mới…</p>'}<button class="btn" onclick="__closeModal()">Xem bàn</button></div></div>`, '', 'over');
    if (meWin) { fx.confetti(140); fx.sfx.win(); fx.musicStinger('win'); } else fx.musicStinger('lose');
    const ag = $('#o-again'); if (ag) ag.onclick = () => onAct('again');
    const lb = $('#o-lobby'); if (lb) lb.onclick = () => onAct('lobby');
  }, 2600 * fx.S());
}

// ---------- đồng hồ: thanh thời gian lượt + đếm ngược ván mới ----------
setInterval(() => {
  if (!view) return;
  const left = clockEnd ? Math.max(0, clockEnd - Date.now()) : 0, frac = clockEnd ? left / clockTotal : 0;
  const cb = $('#clockbar');
  const mine = clockKind === 'turn' && clockPid === myId && myTurn();
  cb.classList.toggle('on', !!mine); cb.classList.toggle('low', mine && left < 8000);
  cb.firstElementChild.style.width = (mine ? frac * 100 : 0) + '%';
  if (clockKind === 'turn') { const tb = $(`.seat[data-pid="${clockPid}"] .tbar i`); if (tb) { tb.style.width = frac * 100 + '%'; tb.parentElement.classList.toggle('low', left < 8000); } }
  if (mine) { const sec = Math.ceil(left / 1000); if (sec <= 5 && sec > 0 && sec !== lastBeep) { lastBeep = sec; fx.sfx.tick(); } }
  if (clockKind === 'next' && view.phase === 'handover') { const secs = Math.max(0, Math.ceil(left / 1000)); const b = $('#actions [data-a="next"] small'); if (b) b.textContent = `(${secs}s)`; const w = $('#actions .wait-a'); if (w) w.textContent = `Ván mới sau ${secs}s`; }
}, 200);
addEventListener('resize', () => { if (view) render(); });

// ---------- thả emoji / chọc nhau ----------
const reacts = createReactions({
  send: e => { if (!net) return; if (isHost) net.react('host', e); else net.react(e); },
  seatEl: id => $(`.seat[data-pid="${id}"] .plate`),
  myId: () => myId,
  nameOf: id => { const p = view && view.players.find(x => x.id === id); return p ? clean(p.name) : ''; },
  mount: $('#me'), place: 'right:8px;top:8px',
  phrases: POKER_PHRASES,
  onShow: () => fx.sfx.pip(),
});
reacts.setVisible(false);
if (location.hash === '#debug') window.__dbg = () => ({ net, view, G });

// ---------- tải lại trang: tự khôi phục phòng / tự vào lại ----------
(function resume() {
  const snap = loadSnapshot(), ses = session.load(GAME);
  const lk = linkCode(); // mở link mời phòng khác → vào thẳng phòng đó; link của chính phòng mình → vào lại như thường
  if (lk && !(ses && ses.code === lk)) { linkJoin(lk); return; }
  if (lk) clearLinkCode();
  if (snap && ses && ses.role === 'host') {
    fx.musicResumeIfOn();
    net = new Host((snap.players.find(p => p.id === 'host') || {}).name || myName(), handlers, !!snap.offline, snap); isHost = true; myId = 'host';
    $('#code-box').style.display = snap.offline ? 'none' : '';
    show('screen-lobby'); netStatus('Đã khôi phục bàn ' + (snap.offline ? 'chơi với bot' : snap.code), 'ok'); return;
  }
  if (ses && ses.role === 'client' && ses.code) {
    net = new Client(ses.code, ses.name || myName(), handlers); isHost = false; $('#code-box').style.display = '';
  }
})();
