// Cờ cá ngựa 3D – giao diện: trang chủ, sảnh, ván chơi 3D, hoạt ảnh sự kiện, nút đổ giữ-để-đổ.
import { linkCode, clearLinkCode, inviteUrl, joinByLink } from '../../shared/net/joinlink.js?v=2';
import { Host, Client, MAX, loadSnapshot, session, CANGUA_PHRASES } from './net.js?v=7';
import { createReactions, EMOJIS as REACT_EMOJIS } from '../../shared/ui/react.js?v=2';
import { COLOR_NAMES, GATE, HOME0, exitOk } from './engine.js?v=3';
import { Board3D } from './scene3d.js?v=3';
import * as fx from './fx.js?v=3';
import { guideHTML } from './guide.js?v=4';
import { netStatus } from '../../shared/ui/status.js';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=102';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const settings = fx.settings, k = () => fx.S();
const VN = 'ẮẰẲẴẶẤẦẨẪẬĐđơưƯƠếềểễệ';
const fontsReady = Promise.race([Promise.all(['800 40px "Be Vietnam Pro"', '800 40px "Baloo 2"'].map(f => document.fonts.load(f, 'Aa ' + VN).catch(() => null))), sleep(3500)]);

// ---------- tiện ích ----------
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); if (id !== 'screen-game') fx.musicMood('lobby'); syncMusicBtns(); }
let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
const fns = { panel: [], modal: [], lobby: [] };
function btn(scope, label, fn, cls = '', dis = false, title = '') { const i = fns[scope].push(fn) - 1; return `<button class="btn ${cls}" data-f="${scope}:${i}" ${dis ? 'disabled' : ''} ${title ? `title="${esc(title)}"` : ''}>${label}</button>`; }
function fnAttr(scope, fn) { return `data-f="${scope}:${fns[scope].push(fn) - 1}"`; }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-f]'); if (b && !b.disabled) { const [sc, i] = b.dataset.f.split(':'); const f = fns[sc] && fns[sc][+i]; if (f) { fx.sfx.click(); f(e, b); } return; }
  if (e.target.closest('[data-close]')) closeModal();
});
let modalKey = null;
function openModal(html, cls = '', key = null) { $('#modal-box').className = 'modal-box ' + cls; $('#modal-box').innerHTML = html; $('#modal').classList.add('open'); modalKey = key; $('#modal-box').scrollTop = 0; }
function closeModal() { $('#modal').classList.remove('open'); modalKey = null; fns.modal = []; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modal').classList.contains('open')) closeModal(); });

$('#name').value = ls.get('bgvn-name') || '';
const myName = () => { const n = ($('#name').value.trim() || 'Bạn').slice(0, 16); ls.set('bgvn-name', n); return n; };
const meProfile = () => ({ name: myName() });
$('#name').addEventListener('change', () => { myName(); if (net && !shown) net.setProfile(meProfile()); });

// ---------- cài đặt / hướng dẫn / có gì mới ----------
function openSettings() {
  const seg = (key, list, fn) => `<div class="seg">${list.map(([v, n]) => `<button class="${settings[key] === v ? 'on' : ''}" ${fnAttr('modal', () => { settings[key] = v; fx.saveSettings(); fn && fn(v); openSettings(); })}>${n}</button>`).join('')}</div>`;
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>⚙️ Cài đặt</h2>
    <div class="set-row"><b>🎵 Nhạc nền</b><div class="seg"><button class="${settings.musicOn ? 'on' : ''}" ${fnAttr('modal', () => { fx.musicToggle(!settings.musicOn); syncMusicBtns(); openSettings(); })}>${settings.musicOn ? 'Đang bật' : 'Đang tắt'}</button></div>
      <input type="range" min="0" max="1" step="0.05" value="${settings.music}" id="vol-music" aria-label="Âm lượng nhạc"></div>
    <div class="set-row"><b>🔊 Hiệu ứng âm thanh</b><input type="range" min="0" max="1" step="0.05" value="${settings.sfx}" id="vol-sfx" aria-label="Âm lượng hiệu ứng"></div>
    <div class="set-row"><b>✨ Hiệu ứng hình ảnh</b>${seg('effects', [[true, 'Bật'], [false, 'Tắt']], v => B && B.setEffects(v))}</div>
    <div class="set-row"><b>🖥️ Chất lượng 3D</b>${seg('quality', [['low', 'Thấp'], ['med', 'Vừa'], ['high', 'Cao']], v => B && B.setQuality(v))}</div>
    <div class="set-row"><b>⏩ Tốc độ hoạt ảnh</b>${seg('speed', [['slow', 'Chậm'], ['normal', 'Vừa'], ['fast', 'Nhanh']])}</div>
    <p class="note">Máy yếu / điện thoại nóng: chọn chất lượng Thấp. Cài đặt lưu trên máy này.</p>
    <div class="mbtns">${btn('modal', '📖 Hướng dẫn luật', () => openGuide(), 'ghost')}<button class="btn ghost" id="btn-news-set">📝 Có gì mới</button></div>`, '', 'settings');
  const nb = $('#btn-news-set'); newsBadge(nb, 'cangua'); nb.onclick = () => { fx.sfx.click(); news(); };
  $('#vol-music').oninput = e => { settings.music = +e.target.value; fx.actx(); fx.applyVolumes(); fx.saveSettings(); };
  $('#vol-sfx').oninput = e => { settings.sfx = +e.target.value; fx.actx(); fx.applyVolumes(); fx.saveSettings(); };
  $('#vol-sfx').onchange = () => fx.sfx.hop();
}
$('#btn-settings').onclick = $('#btn-settings-home').onclick = () => { fx.actx(); openSettings(); };
// nút 🎵 nhanh (trang chủ + trong ván)
function syncMusicBtns() { const on = fx.musicIsOn(); for (const b of $$('.btn-music')) { b.classList.toggle('on', on); b.classList.toggle('off', !on); b.style.opacity = on ? '' : '.55'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = on ? 'Nhạc nền: đang bật (bấm để tắt)' : 'Nhạc nền: đang tắt (bấm để bật)'; } const h = $('#btn-music-home'); if (h) h.textContent = on ? '🎵 Nhạc: bật' : '🔇 Nhạc: tắt'; }
for (const b of $$('.btn-music')) b.onclick = () => { fx.actx(); fx.musicToggle(); syncMusicBtns(); if (fx.sfx.click) fx.sfx.click(); };
syncMusicBtns();

const openGuide = () => openModal(guideHTML(), 'wide', 'guide');
function news() { openNews('cangua'); $$('.bgvn-dot').forEach(b => b.classList.remove('bgvn-dot')); }
for (const id of ['#btn-news-home', '#btn-news-lobby']) { const b = $(id); newsBadge(b, 'cangua'); b.onclick = () => { fx.sfx.click(); news(); }; }
$('#btn-guide-home').onclick = openGuide;

// ---------- kết nối ----------
let net = null, isHost = false, myId = null, lobby = null;
const handlers = {
  onLobby(info, code, started) { lobby = info; $('#room-code').textContent = code; if (!started) { if (shown) resetGame(); renderLobby(); if (!$('#screen-lobby').classList.contains('active')) show('screen-lobby'); } },
  onState(v, tmo) { if (!v) { resetGame(); renderLobby(); show('screen-lobby'); return; } receive(v, tmo); },
  onError(m) { toast(m); fx.sfx.bad(); if (busy) { busy = false; renderPanel(); } },
  onJoined(id) { myId = id; },
  onDisconnect() { netStatus('Mất kết nối – đang vào lại…', 'wait'); },
  onNet(t, kind, retry) { netStatus(t, kind, retry); },
  onFail() { leave(); },
  onReact(msg) { reacts.show(msg); },
  onAfk(pid) { const p = shown && P(shown, pid); if (p) toast(`⏳ ${p.name} hết giờ – máy đi giúp.`); },
};
function startHost(offline) {
  fx.actx(); fx.musicResumeIfOn();
  net = new Host(meProfile(), handlers, offline); isHost = true; myId = 'host';
  if (offline) { session.save('cangua', { role: 'host', code: 'OFFLINE' }); net.addBot(); net.addBot(); net.addBot(); }
  $('#code-box').style.display = offline ? 'none' : '';
  show('screen-lobby'); renderLobby();
}
$('#btn-offline').onclick = () => startHost(true);
$('#btn-create').onclick = () => startHost(false);
$('#btn-join').onclick = () => {
  const code = $('#join-code').value.trim().toUpperCase(); if (code.length < 5) return toast('Nhập mã phòng 5 ký tự nhé.');
  fx.actx(); fx.musicResumeIfOn();
  net = new Client(code, meProfile(), handlers); isHost = false; $('#code-box').style.display = '';
};
$('#join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-join').click(); });
// link mời ?room=MÃ (shared/net/joinlink.js): mở link là vào thẳng phòng
const qcode = linkCode(); if (qcode) $('#join-code').value = qcode;
function linkJoin(code) { $('#join-code').value = code; joinByLink({ code, toast: m => toast(m), join: n => { $('#name').value = n; $('#btn-join').click(); }, abort: () => leave() }); }
function leave() { if (net) { try { net.leave(); } catch (e) {} } net = null; lobby = null; resetGame(); closeModal(); netStatus(''); show('screen-home'); }
$('#btn-leave-lobby').onclick = leave;
$('#btn-leave').onclick = () => openModal(`<h2>Rời ván?</h2><p style="text-align:center">${isHost ? 'Bạn là chủ phòng – rời đi sẽ kết thúc ván của mọi người.' : 'Bạn có thể vào lại bằng mã phòng (bot sẽ tạm đi thay).'}</p>
  <div class="mbtns"><button class="btn ghost" data-close>Ở lại</button>${btn('modal', 'Rời ván', leave, 'red')}</div>`);
$('#btn-copy').onclick = () => { const url = inviteUrl($('#room-code').textContent.trim()); (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Đã chép link mời 📋'), () => toast(url)); };

// ---------- sảnh ----------
// [key, tên, lựa chọn, gợi ý, điều kiện hiện]
const OPTS = [
  ['dice', '🎲 Số xúc xắc', [[2, '2 con'], [1, '1 con']], 'Mặc định 2 xúc xắc (luật nhà).'],
  ['moveMode', '🧮 Cách đi', [['total', 'Dồn tổng 1 con'], ['split', 'Tách 2 con']], 'Tách: mỗi xúc xắc là 1 nước riêng, đi 2 ngựa khác nhau cũng được.', o => o.dice === 2],
  ['exit2', '🚪 Xuất chuồng', [['d16', 'Đôi hoặc 1+6'], ['any6', 'Đôi hoặc có con 6']], 'Đổ được thì cũng được đổ tiếp.', o => o.dice === 2],
  ['exit1', '🚪 Xuất chuồng', [['6', 'Chỉ 6'], ['16', '1 hoặc 6']], 'Đổ được thì cũng được đổ tiếp.', o => o.dice === 1],
  ['noJump', '🚧 Nhảy qua đầu ngựa', [[true, 'Không được'], [false, 'Được']], 'Không được: trên đường đi không vượt qua con ngựa nào.'],
  ['homeRule', '🏁 Vào chuồng', [['thru', 'Đếm thẳng vào (luật nhà)'], ['vn', 'Dừng ở cửa, ra n lên bậc n'], ['count', 'Đếm bước cả trong chuồng']], o => ({
    thru: 'Cách chuồng 2 ô: đổ 3 vào bậc 1, đổ 8 lên luôn bậc 6. Trong chuồng chỉ lên 1 bậc mỗi lần đổ đôi.',
    vn: 'Dừng đúng ô cửa, ra n thì lên bậc n; bậc k lên k+1 phải ra đúng k+1.',
    count: 'Đi xuyên cửa vào chuồng, trong chuồng cũng đi đúng số bước, không quá bậc 6.' })[o.homeRule]],
  ['dblUp', '🎲🎲 Đôi lên chuồng', [[true, 'Bật'], [false, 'Tắt']], 'Đổ đôi thì 1 ngựa ở cửa đích hoặc trên đích được lên thêm 1 bậc, bất kể số.', o => o.homeRule === 'vn' && o.dice === 2],
  ['dblHalf', '✂️ Đổ đôi', [[true, 'Chọn đi cả hoặc nửa'], [false, 'Chỉ đi cả tổng']], 'Ví dụ 3-3: đi 6 ô hoặc chỉ 3 ô (cả trên đường lẫn lúc vào chuồng).', o => o.dice === 2 && o.moveMode === 'total'],
  ['winRule', '🏆 Thắng khi', [['top4', 'Chiếm bậc 3-4-5-6'], ['home', 'Cả 4 lên đích']]],
  ['triple', '😵 3 lần thưởng liền', [[false, 'Không sao'], [true, 'Mất lượt']], 'Đổ đôi / 1+6 tới lần thứ 3 liên tiếp thì mất lượt.', o => o.dice === 2],
  ['playOn', '🥈 Đua tiếp tranh hạng', [[false, 'Tắt'], [true, 'Bật']]],
  ['botLevel', '🤖 Độ khó bot', [['easy', 'Dễ'], ['normal', 'Vừa'], ['hard', 'Khó']]],
  ['turnTime', '⏳ Thời gian suy nghĩ', [[0, 'Không'], [15, '15s'], [30, '30s'], [45, '45s']], 'Hết giờ máy tự đi giúp.', (o, off) => !off],
];
function renderLobby() {
  if (!lobby) return; fns.lobby = [];
  const ps = lobby.players, offline = net && net.offline;
  $('#pcount').textContent = `${ps.length}/${MAX}`;
  $('#plist').innerHTML = ps.map(p => {
    const tag = p.id === 'host' ? '👑 Chủ phòng' : p.isBot ? '🤖 Bot' : p.connected ? '🌐 Online' : '📴 Mất kết nối';
    return `<li><span class="av">${p.isBot ? '🤖' : '🐴'}</span><div><b>${esc(p.name)}</b>${p.id === myId ? ' <small>(bạn)</small>' : ''}<br><small>${tag}</small></div>${isHost && p.id !== 'host' ? `<button class="x" ${fnAttr('lobby', () => net.removePlayer(p.id))} aria-label="Mời ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#opts').innerHTML = OPTS.filter(o => !o[4] || o[4](lobby.opts, offline)).map(([key, name, list, hint]) => `<div class="opt"><b>${name}</b><div class="seg">${list.map(([v, n]) =>
    `<button class="${lobby.opts[key] === v ? 'on' : ''}" ${isHost ? fnAttr('lobby', () => net.setOpt(key, v)) : 'disabled'}>${n}</button>`).join('')}</div>${hint ? `<small>${typeof hint === 'function' ? hint(lobby.opts) || '' : hint}</small>` : ''}</div>`).join('');
  $('#btn-addbot').style.display = isHost ? '' : 'none'; $('#btn-addbot').disabled = ps.length >= MAX;
  $('#btn-start').style.display = isHost ? '' : 'none'; $('#wait-msg').style.display = isHost ? 'none' : '';
}
$('#btn-addbot').onclick = () => { fx.sfx.click(); net && net.addBot(); };
$('#btn-start').onclick = () => { fx.actx(); net && net.start(); };

// ================= VÁN CHƠI =================
let B = null, shown = null, seenEv = 0, busy = false, deadlineAt = 0, winShown = false, logOpen = false;
const queue = []; let pumping = false;
const P = (v, id) => v.players.find(p => p.id === id);
const cur = v => v.players[v.turn];
const isMine = id => !!shown && (shown.controlled || []).includes(id);
const nm = (v, id) => ((P(v, id) || {}).name || '?').replace(' 🤖', '');
const youOr = (v, id) => isMine(id) ? 'Bạn' : esc(nm(v, id));
const mySeat = v => { const me = v.players.find(p => (v.controlled || []).includes(p.id)); return me ? me.seat : 2; };
// bàn giả khi máy không có WebGL: mọi lệnh là no-op, vẫn chơi được bằng các nút ở bảng dưới
const NULLB = new Proxy({}, { get: (t, key) => key === 'then' || key === 'horses' ? undefined : key === 'cam' ? { mode: 'overview' } : () => Promise.resolve(null) });

function resetGame() {
  reacts && reacts.setVisible(false);
  shown = null; seenEv = 0; busy = false; winShown = false; queue.length = 0; deadlineAt = 0;
  if (B) B.highlight(0, []); updateFab(null);
  if (modalKey && modalKey !== 'settings' && modalKey !== 'guide') closeModal();
}
function receive(v, tmo) { deadlineAt = tmo ? Date.now() + tmo : 0; queue.push(v); pump(); }
async function ensureBoard() {
  if (B) return B;
  await fontsReady; if (B) return B;
  try {
    B = new Board3D($('#game3d'), {
      quality: settings.quality, effects: settings.effects,
      onTap: (x, y) => onBoardTap(x, y),
      onCamera: m => { $('#btn-follow').classList.toggle('on', m === 'follow'); $('#btn-overview').classList.toggle('on', m === 'overview'); },
    });
    $('#btn-follow').classList.add('on');
  } catch (e) {
    console.warn(e); B = NULLB;
    $('#game3d').insertAdjacentHTML('beforeend', '<div class="no3d">🙈 Máy/trình duyệt này không chạy được 3D (WebGL).<br>Vẫn chơi được bằng các nút ở bảng dưới nhé.</div>');
    toast('Máy không hỗ trợ 3D (WebGL) – chơi bằng nút bên dưới nhé.');
  }
  if (location.hash === '#debug') window.__B = B;
  return B;
}
async function pump() {
  if (pumping) return; pumping = true;
  try {
    while (queue.length) {
      const v = queue.shift();
      const fresh = !shown || v.evn < seenEv || !$('#screen-game').classList.contains('active');
      if (fresh) { await enterGame(v); continue; }
      const evs = v.ev.filter(e => e.n > seenEv); seenEv = v.evn;
      const fast = queue.length > 2 || document.hidden;
      if (evs.length && !fast) { $('#panel').classList.add('busy'); B.highlight(0, []); updateFab(null, true); for (const e of evs) { try { await animate(e, v); } catch (err) { console.error(err); } } }
      applyView(v);
    }
  } finally { pumping = false; }
}
async function enterGame(v) {
  show('screen-game'); closeModal();
  await ensureBoard();
  B.setMySeat(mySeat(v)); B.resize(); B.sync(v); B.setTurn(cur(v).seat); B.snap && B.snap();
  seenEv = v.evn; winShown = v.phase === 'over';
  applyView(v);
  if (v.phase === 'playing' && v.evn <= 2) { fx.banner('Xuất phát! 🐴', 'gold'); fx.sfx.out(); }
  if (!ls.get('cangua-camhint')) { $('#cam-hint').hidden = false; setTimeout(() => { $('#cam-hint').hidden = true; }, 6000); ls.set('cangua-camhint', '1'); }
}
function applyView(v) {
  shown = v; busy = false;
  B.sync(v);
  if (v.phase === 'playing') B.setTurn(cur(v).seat); else B.setTurn(-1);
  $('#panel').classList.remove('busy');
  reacts.setVisible(true);
  renderTop(); renderPlayers(); renderPanel(); renderLog();
  const mine = v.phase === 'playing' && v.stage === 'move' && isMine(cur(v).id);
  B.highlight(cur(v).seat, mine ? v.moves : []);
  updateFab(v);
  if (v.phase === 'over' && !winShown) { winShown = true; showWin(v); }
}

// ---------- hoạt ảnh từng sự kiện ----------
const seatOf = (v, id) => (P(v, id) || {}).seat ?? 0;
async function animate(e, v) {
  switch (e.t) {
    case 'turn': {
      B.setTurn(seatOf(v, e.pid)); B.focusSeat(seatOf(v, e.pid)); fx.sfx.turn();
      if (isMine(e.pid) && !e.again) fx.banner('Tới lượt bạn! 🎲', 'gold sm');
      await sleep(150 * k()); break;
    }
    case 'roll': {
      fx.sfx.dice();
      await centerDice(e.d, isMine(e.pid) && rollPower != null ? rollPower : 0.5, e.bonus, v); rollPower = null;
      if (e.bonus) { fx.sfx.six(); fx.banner(v.opts.dice === 1 ? `Ra ${e.d[0]}! Đổ tiếp 🎲` : e.d[0] === e.d[1] ? 'Đôi! Được đổ tiếp 🎲' : '1 + 6! Được đổ tiếp 🎲', 'gold sm'); }
      break;
    }
    case 'nomove': fx.sfx.nomove(); fx.banner(isMine(e.pid) ? 'Không đi được 😶' : `${nm(v, e.pid)} đứng hình 😶`, 'sm'); await sleep(500 * k()); break;
    case 'triple': fx.sfx.bad(); fx.banner('3 lần thưởng liền – mất lượt 😵', 'red sm'); await sleep(700 * k()); break;
    case 'out': {
      const s = seatOf(v, e.pid); if (e.auto) await previewAuto(s, { kind: 'out', h: e.h, from: -1, to: 0 }, v, e);
      fx.sfx.out(); await B.exit(s, e.h, 650 * k());
      B.floatAt && B.floatAt(B.horsePos(s, e.h), 'Xuất chuồng!', P(v, e.pid).color); break;
    }
    case 'move': {
      const s = seatOf(v, e.pid), n = e.path.length, ms = (n <= 8 ? 210 : Math.max(110, 1700 / n)) * k();
      if (e.auto) await previewAuto(s, { kind: 'move', h: e.h, from: e.from, to: e.to, kick: e.kick, dbl: e.v === 0 && e.to > GATE && e.to - e.from === 1 && e.from > GATE }, v, e);
      await B.walk(s, e.h, e.path, ms, pos => { fx.sfx.hop(); if (pos > GATE && pos === e.to) { fx.sfx.home(); } });
      if (e.to >= HOME0 && B.floatAt) B.floatAt(B.horsePos(s, e.h), e.from < HOME0 ? `Lên đích bậc ${e.to - GATE}! 🏁` : `Bậc ${e.to - GATE}`, '#1aa86a');
      break;
    }
    case 'kick': {
      const vs = seatOf(v, e.vic); fx.sfx.kick();
      const p = B.kicked(vs, e.vh, 1000 * k());
      if (isMine(e.vic)) { fx.banner('Bị đá về chuồng rồi 🐴💨', 'red sm'); setTimeout(() => fx.sfx.ouch(), 300); }
      else if (isMine(e.pid)) fx.banner('Đá bay màu! 🦶💥', 'gold sm');
      else fx.banner(`${nm(v, e.pid)} đá ${nm(v, e.vic)} 🦶`, 'sm');
      flashPc(e.vic); fx.shakeEl(pcEl(e.vic));
      await p; break;
    }
    case 'finish': {
      const s = seatOf(v, e.pid); fx.sfx.win(); B.celebrate(s); fx.confetti(60);
      fx.banner(isMine(e.pid) ? `🏆 Bạn về ${e.rank === 1 ? 'NHẤT' : 'hạng ' + e.rank}!` : `🏆 ${nm(v, e.pid)} về hạng ${e.rank}!`, 'gold');
      await sleep(1400 * k()); break;
    }
  }
}
// máy tự đi (chỉ 1 nước): vẫn cho thấy điểm đến một chút rồi mới đi
async function previewAuto(seat, m, v, e) {
  if (!B.preview) return;
  B.preview(seat, m); await sleep((isMine(e.pid) ? 750 : 450) * k()); B.highlight(0, []);
}
// ---------- nút đổ giữa màn hình (giữ để lấy đà) + xúc xắc lăn giữa màn hình ----------
let rollPower = null, hold = null;
function fabEl() {
  let f = $('#rollfab'); if (f) return f;
  f = document.createElement('button'); f.id = 'rollfab'; f.type = 'button'; f.hidden = true; f.setAttribute('aria-label', 'Giữ để đổ xúc xắc');
  f.innerHTML = '<span class="ring"></span><span class="ic">🎲</span><b class="tx">GIỮ ĐỂ ĐỔ</b><i class="pw">Giữ rồi thả</i>';
  $('#game3d').appendChild(f);
  const start = e => { if (f.hidden || hold || busy) return; e.preventDefault(); try { f.setPointerCapture && e.pointerId != null && f.setPointerCapture(e.pointerId); } catch (_) {}
    fx.actx(); hold = { t0: performance.now(), p: 0 }; f.classList.add('hold'); fx.sfx.click();
    const tick = () => { if (!hold) return; const t = (performance.now() - hold.t0) / 1000; hold.p = (1 - Math.cos(t * Math.PI * 2 / 1.3)) / 2; f.style.setProperty('--p', hold.p.toFixed(3)); f.querySelector('.pw').textContent = `Lực ${Math.round(hold.p * 100)}%`; hold.raf = requestAnimationFrame(tick); };
    tick(); };
  const end = e => { if (!hold) return; const h = hold; hold = null; cancelAnimationFrame(h.raf); f.classList.remove('hold');
    if (e && e.type === 'pointercancel') { f.style.setProperty('--p', 0); return; }
    const quick = performance.now() - h.t0 < 180; rollPower = quick ? 0.35 + Math.random() * 0.4 : h.p;
    const v = shown; if (!v || v.stage !== 'roll' || !isMine(cur(v).id)) return;
    f.hidden = true; send({ type: 'roll' }); };
  f.addEventListener('pointerdown', start); f.addEventListener('pointerup', end); f.addEventListener('pointercancel', end); f.addEventListener('lostpointercapture', e => { if (hold) end(e); });
  f.addEventListener('contextmenu', e => e.preventDefault());
  f.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
  f.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') end(e); });
  return f;
}
function updateFab(v, forceHide = false) {
  const f = fabEl(), on = !forceHide && !!v && v.phase === 'playing' && v.stage === 'roll' && isMine(cur(v).id) && !busy;
  if (!on && hold) { cancelAnimationFrame(hold.raf); hold = null; f.classList.remove('hold'); }
  f.hidden = !on; if (!on) return;
  const again = v.ev.length && v.ev[v.ev.length - 1].t === 'turn' && v.ev[v.ev.length - 1].again;
  f.classList.toggle('again', !!again); f.querySelector('.tx').textContent = again ? 'ĐỔ TIẾP!' : 'GIỮ ĐỂ ĐỔ';
  if (!hold) { f.style.setProperty('--p', 0); f.querySelector('.pw').textContent = 'Giữ rồi thả'; }
}
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const faceHTML = n => `<div class="df">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => `<i${PIPS[n].includes(c) ? ' class="on"' : ''}></i>`).join('')}</div>`;
const FACE_ROT = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
function centerDice(d, power = 0.5, bonus = false, v = shown) {
  let ov = $('#dice-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'dice-ov'; ov.setAttribute('aria-hidden', 'true'); $('#game3d').appendChild(ov); }
  const cube = () => `<div class="dc"><div class="dcube">${[1, 6, 2, 5, 3, 4].map((n, i) => `<div class="fc f${i}">${faceHTML(n)}</div>`).join('')}</div></div>`;
  ov.innerHTML = `<div class="dbox">${d.map(cube).join('')}</div><div class="dsum"></div>`; ov.className = 'show';
  const ms = Math.round((750 + power * 650) * k()), spins = 2 + Math.round(power * 3);
  [...ov.querySelectorAll('.dcube')].forEach((c, i) => {
    const [rx, ry] = FACE_ROT[d[i]], X = rx + 360 * (spins + i), Y = ry + 360 * (spins + 1 - i) * (i ? -1 : 1);
    c.style.transition = 'none'; c.style.transform = `rotateX(${(Math.random() * 360) | 0}deg) rotateY(${(Math.random() * 360) | 0}deg)`;
    c.parentNode.style.setProperty('--ms', ms + 'ms'); c.parentNode.style.setProperty('--h', (40 + power * 70).toFixed(0) + 'px');
    requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transition = `transform ${ms}ms cubic-bezier(.15,.7,.25,1)`; c.style.transform = `rotateX(${X}deg) rotateY(${Y}deg)`; c.parentNode.classList.add('go'); }));
  });
  return sleep(ms + 60).then(() => {
    const two = d.length === 2, canOut = v && exitOk(v, d);
    ov.querySelector('.dsum').innerHTML = two ? `${d[0]} + ${d[1]} = <b>${d[0] + d[1]}</b>${d[0] === d[1] ? ' <em>ĐÔI!</em>' : canOut ? ' <em>XUẤT!</em>' : ''}` : `<b>${d[0]}</b>${bonus ? ' <em>ĐỔ TIẾP!</em>' : ''}`;
    ov.classList.add('done');
    setTimeout(() => { if (ov.classList.contains('done')) ov.className = ''; }, Math.round(900 * k()));
    return sleep(Math.round(420 * k()));
  });
}
const pcEl = id => $(`.pc[data-id="${CSS.escape(id || '')}"]`);
function flashPc(id) { const el = pcEl(id); if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

// ---------- thanh trên + người chơi ----------
function renderTop() {
  const v = shown, el = $('#turn-tag');
  // nhạc: đang đua / gay cấn khi có người đã đưa ≥ 3 ngựa vào chuồng đích / hết ván
  fx.musicMood(v.phase === 'over' ? 'lobby' : v.players.some(p => p.horses && p.horses.filter(x => x > 55).length >= 3) ? 'tense' : 'game');
  if (v.phase === 'over') { const w = P(v, v.winner); el.innerHTML = `<i style="--pc:${w.color}"></i><span>🏆 ${esc(nm(v, w.id))} thắng</span>`; return; }
  const c = cur(v); el.innerHTML = `<i style="--pc:${c.color}"></i><span><small class="lw">Lượt </small>${isMine(c.id) ? 'bạn' : esc(nm(v, c.id))}<small class="rd"> · vòng ${v.round}</small></span>`;
}
setInterval(() => {
  const el = $('#timer'), v = shown;
  if (!v || v.phase !== 'playing' || !deadlineAt) { el.hidden = true; return; }
  const s = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
  el.hidden = false; el.textContent = `⏳ ${s}s`; el.classList.toggle('low', s <= 5);
  if (s <= 5 && s > 0 && isMine(cur(v).id) && s !== el._last) { el._last = s; fx.sfx.tick(); }
}, 250);
function renderPlayers() {
  const v = shown, el = $('#players');
  el.style.setProperty('--cols', v.players.length);
  el.innerHTML = v.players.map(p => {
    const st = p.horses.map(x => x < 0 ? 0 : x <= GATE ? 1 : 2), cnt = [0, 1, 2].map(t => st.filter(x => x === t).length);
    const rank = v.ranks.indexOf(p.id), badge = p.done ? `🏆${rank + 1}` : (v.away || []).includes(p.id) ? '📴' : p.isBot ? '🤖' : '';
    return `<div class="pc ${isMine(p.id) ? 'me' : ''} ${v.phase === 'playing' && p.id === cur(v).id ? 'turn' : ''} ${p.done ? 'done' : ''}" data-id="${esc(p.id)}" style="--pc:${p.color}" title="${esc(p.name)} – ${COLOR_NAMES[p.seat]}">
      <div class="nm">${isMine(p.id) ? '👤 ' : ''}${esc(nm(v, p.id))}</div>
      <div class="hs">${st.map(t => `<i class="${['', 't', 'h'][t]}"></i>`).join('')}</div>
      <div class="sum">🏠${cnt[0]} 🐎${cnt[1]} 🏁${cnt[2]}</div>${badge ? `<span class="badge">${badge}</span>` : ''}</div>`;
  }).join('');
}
function renderLog() { if (logOpen) $('#log-list').innerHTML = shown.log.slice().reverse().map(l => `<li>${esc(l)}</li>`).join(''); }
$('#btn-log').onclick = () => { logOpen = !logOpen; $('#log').classList.toggle('open', logOpen); if (shown) renderLog(); };
$('#btn-log-close').onclick = () => { logOpen = false; $('#log').classList.remove('open'); };
$('#btn-follow').onclick = () => { fx.sfx.click(); B && B.follow(); };
$('#btn-overview').onclick = () => { fx.sfx.click(); if (!B) return; B.cam.mode === 'overview' ? B.follow() : B.overview(); };

// ---------- bảng hành động ----------
function send(a) {
  if (busy || !net) return;
  busy = true; $('#panel').classList.add('busy');
  if (isHost) net.act('host', a); else net.act(a);
  setTimeout(function chk() { if (!busy) return; if (pumping || queue.length) return setTimeout(chk, 1000); busy = false; renderPanel(); updateFab(shown); }, 5000);
}
function moveLabel(v, m) {
  const kick = m.kick ? ` · đá ${esc(nm(v, m.kick.pid))}! 🦶` : '', d = v.dice || [], T = d[0] + d[1];
  const dbl = v.opts.dice === 2 && d.length === 2 && d[0] === d[1] && v.opts.moveMode !== 'split';
  const use = dbl && v.opts.dblHalf === true && m.v ? (m.v === T ? ` <small>(cả đôi ${T})</small>` : ` <small>(nửa đôi ${m.v})</small>`)
    : v.opts.dice === 2 && (v.opts.moveMode === 'split' || m.v !== T) && m.v ? ` <small>(dùng ${m.v})</small>` : '';
  if (m.kind === 'out') return `🚪 Xuất chuồng${kick}`;
  if (m.dbl) return `🎲🎲 Ngựa ${m.h + 1} lên bậc ${m.to - GATE} (nhờ đôi)`;
  if (m.to > GATE && m.from <= GATE && v.opts.homeRule !== 'vn') return `🏁 Ngựa ${m.h + 1} đi ${m.to - m.from} → bậc ${m.to - GATE}${use}`;
  if (m.to > GATE) return `🏁 Ngựa ${m.h + 1} → bậc ${m.to - GATE}${use}`;
  if (m.to === GATE) return `🐎 Ngựa ${m.h + 1} đi ${m.to - m.from} ô về cửa chuồng${use}${kick}`;
  return `🐎 Ngựa ${m.h + 1} đi ${m.to - m.from} ô${use}${kick}`;
}
function pickMove(m) { const v = shown; if (!v || v.stage !== 'move' || !isMine(cur(v).id)) return; send(m.kind === 'out' ? { type: 'move', out: true } : { type: 'move', h: m.h, to: m.to }); }
function onBoardTap(x, y) {
  const v = shown; if (!v || busy || v.phase !== 'playing' || v.stage !== 'move' || !isMine(cur(v).id)) return;
  const pk = B.pickAt(x, y); if (pk == null) return;
  const m = v.moves[pk.i]; if (!m) return;
  // chạm ngựa có nhiều nước (vd. đôi đi cả / nửa): hỏi chạm điểm đến hoặc chọn ở bảng dưới
  const same = v.moves.filter(x => x.h === m.h && x.kind !== 'out');
  if (!pk.byTo && same.length > 1 && m.kind !== 'out') { toast('Con này có nhiều nước – chạm vào điểm đến hoặc chọn ở bảng dưới nhé 👇'); $$('#panel .btns .btn').forEach(b => fx.shakeEl(b)); return; }
  fx.sfx.click(); pickMove(m);
}
function renderPanel() {
  const v = shown, el = $('#panel'); if (!v) return;
  fns.panel = [];
  const dice = v.dice && v.dice.length ? `<span class="dice-r">🎲 ${v.dice.join(' + ')}</span>` : '';
  const head = (p, text) => `<div class="line"><span class="dot" style="--pc:${p.color}"></span><span>${text}</span>${dice}</div>`;
  if (v.phase === 'over') {
    const w = P(v, v.winner);
    el.innerHTML = head(w, `🏆 <b>${youOr(v, w.id)}</b> ${isMine(w.id) ? 'thắng rồi! Đỉnh nóc 🔥' : 'thắng ván này!'}`) + `<div class="btns">${btn('panel', '🏆 Xem kết quả', () => showWin(v), 'gold')}${isHost ? btn('panel', '🔁 Ván mới', () => net.restart(), 'pri') : ''}</div>`;
    return;
  }
  const c = cur(v), mine = isMine(c.id), who = youOr(v, c.id);
  const lines = [], btns = [];
  if (v.stage === 'roll') {
    const again = v.ev.length && v.ev[v.ev.length - 1].t === 'turn' && v.ev[v.ev.length - 1].again;
    if (mine) {
      lines.push(head(c, again ? '🎲 Được <b>đổ tiếp</b>!' : `🎲 Tới lượt <b>bạn</b>!`));
      lines.push(`<div class="sub">👇 <b>Giữ</b> nút 🎲 giữa màn hình rồi <b>thả</b> để đổ. ${v.opts.dice === 2 ? (v.opts.exit2 === 'any6' ? 'Đôi hoặc có con 6' : 'Đôi hoặc 1+6') : v.opts.exit1 === '16' ? 'Ra 1 hoặc 6' : 'Ra 6'} mới xuất chuồng.</div>`);
    } else lines.push(head(c, `⏳ <b>${who}</b> ${again ? 'được đổ tiếp…' : 'đang đổ xúc xắc…'}`));
  } else if (v.stage === 'move') {
    if (mine) {
      lines.push(head(c, `👆 Chạm <b>điểm đến</b> trên bàn hoặc chọn nước:`));
      const d = v.dice; if (d.length === 2 && d[0] === d[1] && v.opts.dblHalf === true && v.opts.moveMode === 'total' && v.moves.some(m => m.v === d[0] && m.kind !== 'out'))
        lines.push(`<div class="sub">✂️ Đôi ${d[0]}-${d[1]}: đi <b>cả ${d[0] * 2}</b> hoặc <b>nửa ${d[0]}</b> – mỗi lựa chọn có vòng sáng + số bước trên bàn.</div>`);
      v.moves.forEach(m => btns.push(btn('panel', moveLabel(v, m), () => pickMove(m), m.kick ? 'kick' : m.kind === 'out' ? 'out' : m.to > GATE ? 'green' : '')));
      if (v.opts.moveMode === 'split' && v.left.length === 1 && v.dice.length === 2) lines.push(`<div class="sub">Còn con <b>${v.left[0]}</b> chưa đi.</div>`);
    } else lines.push(head(c, `🤔 <b>${who}</b> đang chọn ngựa…`));
  }
  el.innerHTML = lines.join('') + (btns.length ? `<div class="btns${btns.length >= 4 ? ' many' : ''}">${btns.join('')}</div>` : '');
  if (btns.length && B && B.pulseMark) $$('#panel .btns .btn').forEach((b, i) => {
    const on = () => B.pulseMark(i), off = () => B.pulseMark(-1);
    b.addEventListener('pointerenter', on); b.addEventListener('focus', on); b.addEventListener('pointerleave', off); b.addEventListener('blur', off);
  });
}

// ---------- thả emoji / chọc nhau ----------
var reacts = createReactions({
  send: e => { if (!net) return; if (isHost) net.react('host', e); else net.react(e); },
  seatEl: id => pcEl(id), myId: () => myId,
  nameOf: id => shown && P(shown, id) ? nm(shown, id) : '',
  mount: $('#game3d'), place: 'right:8px;bottom:8px', phrases: CANGUA_PHRASES,
  onShow: msg => { fx.sfx.notify(); const p = shown && P(shown, msg.from); if (B && B.floatAt && p && REACT_EMOJIS.includes(msg.e)) { const h = p.horses.findIndex(x => x >= 0); B.floatAt(h >= 0 ? B.horsePos(p.seat, h) : B.horsePos(p.seat, 0), msg.e, '#7a5cff'); } },
});
reacts.setVisible(false);

// ---------- kết thúc ván ----------
function showWin(v) {
  const w = P(v, v.winner);
  if (w) { B.celebrate(w.seat); fx.sfx.win(); fx.confetti(140); }
  fx.musicStinger(w && isMine(w.id) ? 'win' : 'lose'); if (!(w && isMine(w.id))) setTimeout(() => fx.sfx.lose(), 600);
  setTimeout(() => {
    if (!shown || shown.phase !== 'over') return;
    openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><div class="win"><div class="trophy">🏆</div>
      <h2>${esc(w ? nm(v, w.id) : '?')} THẮNG!</h2><p style="margin:0;font-weight:700">${isMine(w.id) ? 'Ngựa nhà mình chạy như gió 🐎💨' : 'Ván sau phục thù nha 😤'}</p>
      <ol>${v.ranks.map(id => { const p = P(v, id); return `<li style="--pc:${p.color}"><i></i>${esc(nm(v, id))} – 🏁${p.horses.filter(x => x > GATE).length}/4 · 🦶 đá ${p.kicks} · bị đá ${p.kicked}</li>`; }).join('')}</ol></div>
      <div class="mbtns">${isHost ? btn('modal', '🔁 Ván mới', () => { closeModal(); net.restart(); }, 'pri') : ''}${btn('modal', '🗺️ Xem bàn', closeModal, 'ghost')}${btn('modal', '🏠 Về trang chủ', leave, 'ghost')}</div>`, '', 'win');
  }, w ? 1800 * k() : 300);
}

// ---------- tải lại trang: tự khôi phục phòng / tự vào lại ----------
(function resume() {
  const snap = loadSnapshot(), ses = session.load('cangua');
  const lk = linkCode(); // mở link mời phòng khác → vào thẳng phòng đó; link của chính phòng mình → vào lại như thường
  if (lk && !(ses && ses.code === lk)) { linkJoin(lk); return; }
  if (lk) clearLinkCode();
  if (snap && ses && ses.role === 'host') {
    fx.musicResumeIfOn();
    const hp = snap.players.find(p => p.id === 'host') || {};
    net = new Host({ name: hp.name || myName() }, handlers, !!snap.offline, snap); isHost = true; myId = 'host';
    $('#code-box').style.display = snap.offline ? 'none' : '';
    show('screen-lobby'); if (!snap.offline) netStatus('Đã khôi phục phòng ' + snap.code, 'ok'); return;
  }
  if (ses && ses.role === 'client' && ses.code) { net = new Client(ses.code, meProfile(), handlers); isHost = false; $('#code-box').style.display = ''; }
})();
if (location.hash === '#debug') window.__dbg = () => ({ net, shown, B, q: () => ({ pumping, queue: queue.length, busy, seenEv }) });
