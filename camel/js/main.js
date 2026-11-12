// Đua Lạc Đà 3D – giao diện: trang chủ, sảnh, ván chơi (3D + bảng HUD 2D), hoạt ảnh sự kiện.
import { hintsAllowed, BOT_ONLY_NOTE } from '../../shared/ui/botonly.js?v=1';
import { linkCode, clearLinkCode, inviteUrl, joinByLink } from '../../shared/net/joinlink.js?v=2';
import { Host, Client, MAX, loadSnapshot, session, CAMEL_PHRASES, setSpeedFn } from './net.js?v=13';
import { createReactions, EMOJIS as REACT_EMOJIS } from '../../shared/ui/react.js?v=2';
import { CAMEL, RACERS, TRACK, LEG_ROLLS, OVERALL_PAY, legalTiles, ranking } from './engine.js?v=1';
import { simLeg } from './bot.js?v=1';
import { Board3D, DIE_COLORS } from './scene3d.js?v=2';
import * as fx from './fx.js?v=2';
import { guideHTML } from './guide.js?v=2';
import { netStatus } from '../../shared/ui/status.js';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=125';

const GAME = 'camel';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const settings = fx.settings, k = () => fx.S();
if (settings.odds === undefined) settings.odds = false; // % gợi ý mặc định ẩn
setSpeedFn(() => fx.S());
const VN = 'ẮẰẲẴẶẤẦẨẪẬĐđơưƯƠếềểễệ';
const fontsReady = Promise.race([Promise.all(['800 40px "Be Vietnam Pro"', '800 40px "Baloo 2"'].map(f => document.fonts.load(f, 'Aa ' + VN).catch(() => null))), sleep(3500)]);
const PCOL = ['#ff7a1a', '#00a6a6', '#e84393', '#6c5ce7', '#2d3436', '#0984e3', '#b8860b', '#16a085'];
const CN = c => CAMEL[c].short;
const cc = c => `--cc:${CAMEL[c].color}`;

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
let modalKey = null, modalT = null;
function openModal(html, cls = '', key = null) { clearTimeout(modalT); $('#modal-box').className = 'modal-box ' + cls; $('#modal-box').innerHTML = html; $('#modal').classList.add('open'); modalKey = key; $('#modal-box').scrollTop = 0; }
function closeModal() { clearTimeout(modalT); $('#modal').classList.remove('open'); modalKey = null; fns.modal = []; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modal').classList.contains('open')) closeModal(); });

$('#name').value = ls.get('bgvn-name') || '';
const myName = () => { const n = ($('#name').value.trim() || 'Bạn').slice(0, 16); ls.set('bgvn-name', n); return n; };

// ---------- cài đặt / hướng dẫn / có gì mới ----------
function openSettings() {
  const seg = (key, list, fn) => `<div class="seg">${list.map(([v, n]) => `<button class="${settings[key] === v ? 'on' : ''}" ${fnAttr('modal', () => { settings[key] = v; fx.saveSettings(); fn && fn(v); openSettings(); })}>${n}</button>`).join('')}</div>`;
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>⚙️ Cài đặt</h2>
    <div class="set-row"><b>🎵 Nhạc nền</b><div class="seg"><button class="${settings.musicOn ? 'on' : ''}" ${fnAttr('modal', () => { fx.musicToggle(!settings.musicOn); syncMusicBtns(); openSettings(); })}>${settings.musicOn ? 'Đang bật' : 'Đang tắt'}</button></div>
      <input type="range" min="0" max="1" step="0.05" value="${settings.music}" id="vol-music" aria-label="Âm lượng nhạc"></div>
    <div class="set-row"><b>🔊 Hiệu ứng âm thanh</b><input type="range" min="0" max="1" step="0.05" value="${settings.sfx}" id="vol-sfx" aria-label="Âm lượng hiệu ứng"></div>
    <div class="set-row"><b>📊 % gợi ý trên vé</b>${oddsOk() ? seg('odds', [[true, 'Hiện'], [false, 'Ẩn']], () => shown && renderPanel()) : `<div class="seg"><button disabled>Hiện</button><button class="on" disabled>Ẩn</button></div><small style="flex-basis:100%;opacity:.75">🔒 ${BOT_ONLY_NOTE}</small>`}</div>
    <div class="set-row"><b>✨ Hiệu ứng hình ảnh</b>${seg('effects', [[true, 'Bật'], [false, 'Tắt']], v => B && B.setEffects(v))}</div>
    <div class="set-row"><b>🖥️ Chất lượng 3D</b>${seg('quality', [['low', 'Thấp'], ['med', 'Vừa'], ['high', 'Cao']], v => B && B.setQuality(v))}</div>
    <div class="set-row"><b>⏩ Tốc độ hoạt ảnh</b>${seg('speed', [['slow', 'Chậm'], ['normal', 'Vừa'], ['fast', 'Nhanh']])}</div>
    <p class="note">Máy yếu / điện thoại nóng: chọn chất lượng Thấp. Cài đặt lưu trên máy này.</p>
    <div class="mbtns">${btn('modal', '📖 Hướng dẫn luật', () => openGuide(), 'ghost')}<button class="btn ghost" id="btn-news-set">📝 Có gì mới</button></div>`, '', 'settings');
  const nb = $('#btn-news-set'); newsBadge(nb, GAME); nb.onclick = () => { fx.sfx.click(); news(); };
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
function news() { openNews(GAME); $$('.bgvn-dot').forEach(b => b.classList.remove('bgvn-dot')); }
for (const id of ['#btn-news-home', '#btn-news-lobby']) { const b = $(id); newsBadge(b, GAME); b.onclick = () => { fx.sfx.click(); news(); }; }
$('#btn-guide-home').onclick = openGuide;

// ---------- kết nối ----------
let net = null, isHost = false, myId = null, lobby = null;
const handlers = {
  onLobby(info, code, started) { lobby = info; $('#room-code').textContent = code; if (!started) { if (shown) resetGame(); renderLobby(); if (!$('#screen-lobby').classList.contains('active')) show('screen-lobby'); } },
  onState(v) { if (!v) { resetGame(); renderLobby(); show('screen-lobby'); return; } receive(v); },
  onError(m) { toast(m); fx.sfx.bad(); if (busy) { busy = false; renderPanel(); } },
  onJoined(id) { myId = id; },
  onDisconnect() { netStatus('Mất kết nối – đang vào lại…', 'wait'); },
  onNet(t, kind, retry) { netStatus(t, kind, retry); },
  onReact(msg) { reacts.show(msg); },
};
function startHost(offline) {
  fx.actx(); fx.musicResumeIfOn();
  net = new Host(myName(), handlers, offline); isHost = true; myId = 'host';
  if (offline) { session.save(GAME, { role: 'host', code: 'OFFLINE' }); net.addBot(); net.addBot(); net.addBot(); }
  $('#code-box').style.display = offline ? 'none' : '';
  show('screen-lobby'); renderLobby();
}
$('#btn-offline').onclick = () => startHost(true);
$('#btn-create').onclick = () => startHost(false);
$('#btn-join').onclick = () => {
  const code = $('#join-code').value.trim().toUpperCase(); if (code.length < 5) return toast('Nhập mã phòng 5 ký tự nhé.');
  fx.actx(); fx.musicResumeIfOn();
  net = new Client(code, myName(), handlers); isHost = false; $('#code-box').style.display = '';
};
$('#join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-join').click(); });
// link mời ?room=MÃ (shared/net/joinlink.js): mở link là vào thẳng phòng
const qcode = linkCode(); if (qcode) $('#join-code').value = qcode;
function linkJoin(code) { $('#join-code').value = code; joinByLink({ code, toast: m => toast(m), join: n => { $('#name').value = n; $('#btn-join').click(); }, abort: () => leave() }); }
function leave() { if (net) { try { net.leave(); } catch (e) {} } net = null; lobby = null; resetGame(); closeModal(); netStatus(''); show('screen-home'); }
$('#btn-leave-lobby').onclick = leave;
$('#btn-leave').onclick = () => openModal(`<h2>Rời ván?</h2><p style="text-align:center">${isHost ? 'Bạn là chủ phòng – rời đi sẽ kết thúc cuộc đua của mọi người.' : 'Bạn có thể vào lại bằng mã phòng (máy sẽ tạm chơi thay).'}</p>
  <div class="mbtns"><button class="btn ghost" data-close>Ở lại</button>${btn('modal', 'Rời ván', leave, 'red')}</div>`);
$('#btn-copy').onclick = () => { const url = inviteUrl($('#room-code').textContent.trim()); (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Đã chép link mời 📋'), () => toast(url)); };

// ---------- sảnh ----------
const OPTS = [
  ['crazy', '🥴 Lạc đà xỉn (chạy ngược)', [[true, 'Bật'], [false, 'Tắt']], 'Thêm 2 con Đen/Trắng chạy lùi + 1 xúc xắc xám. Vui và loạn hơn!'],
];
function renderLobby() {
  if (!lobby) return; fns.lobby = [];
  const ps = lobby.players;
  $('#pcount').textContent = `${ps.length}/${MAX}`;
  $('#plist').innerHTML = ps.map((p, i) => {
    const tag = p.id === 'host' ? '👑 Chủ phòng' : p.isBot ? '🤖 Bot' : p.connected ? '🌐 Online' : '📴 Mất kết nối';
    return `<li><span class="av" style="background:${PCOL[i % 8]}33">${p.isBot ? '🤖' : '🐪'}</span><div><b>${esc(p.name)}</b>${p.id === myId ? ' <small>(bạn)</small>' : ''}<br><small>${tag}</small></div>${isHost && p.id !== 'host' ? `<button class="x" ${fnAttr('lobby', () => net.removePlayer(p.id))} aria-label="Mời ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#opts').innerHTML = OPTS.map(([key, name, list, hint]) => `<div class="opt"><b>${name}</b><div class="seg">${list.map(([v, n]) =>
    `<button class="${lobby.opts[key] === v ? 'on' : ''}" ${isHost ? fnAttr('lobby', () => net.setOpt(key, v)) : 'disabled'}>${n}</button>`).join('')}</div>${hint ? `<small>${hint}</small>` : ''}</div>`).join('') +
    `<div class="opt"><b>🪙 Tiền</b><small>Mỗi người 3 xu ảo. Vé chặng 5/3/2/2 · cược chung cuộc 8/5/3/2/1 · sai −1. Chơi vui bằng xu ảo, không cá cược tiền thật.</small></div>`;
  $('#btn-addbot').style.display = isHost ? '' : 'none'; $('#btn-addbot').disabled = ps.length >= MAX;
  $('#btn-start').style.display = isHost ? '' : 'none'; $('#wait-msg').style.display = isHost ? 'none' : '';
}
$('#btn-addbot').onclick = () => { fx.sfx.click(); net && net.addBot(); };
$('#btn-start').onclick = () => { fx.actx(); net && net.start(); };

// ================= VÁN CHƠI =================
let B = null, flat = false, shown = null, seenEv = 0, busy = false, deadlineAt = 0, endShown = false, logOpen = false, trayN = 0, lastTurnPid = null;
const ui = { mode: 'main', sel: null, side: 1, kind: 'win', key: '' };
const queue = []; let pumping = false;
const P = (v, id) => v.players.find(p => p.id === id);
const pIdx = (v, id) => v.players.findIndex(p => p.id === id);
const pcol = (v, id) => PCOL[Math.max(0, pIdx(v, id)) % 8];
const cur = v => v.players[v.turn];
const isMine = id => !!shown && id === shown.me;
const nm = (v, id) => ((P(v, id) || {}).name || '?').replace(' 🤖', '');
const youOr = (v, id) => isMine(id) ? 'Bạn' : esc(nm(v, id));
const colorsOf = v => Object.fromEntries(v.players.map((p, i) => [p.id, PCOL[i % 8]]));
// không có WebGL: mọi lệnh 3D là no-op, đường đua vẽ bằng ô 2D
const NULLB = new Proxy({}, { get: (t, key) => key === 'then' ? undefined : key === 'cam' ? { mode: 'overview' } : key === 'board' ? null : () => Promise.resolve(null) });

function resetGame() {
  reacts && reacts.setVisible(false);
  shown = null; seenEv = 0; busy = false; endShown = false; queue.length = 0; deadlineAt = 0; lastTurnPid = null; ui.mode = 'main'; ui.sel = null;
  if (B && !flat) B.markSpaces([]);
  if (modalKey && modalKey !== 'settings' && modalKey !== 'guide') closeModal();
}
function receive(v) { deadlineAt = v.clock ? Date.now() + v.clock.ms : 0; queue.push(v); pump(); }
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
    console.warn(e); B = NULLB; flat = true;
    $('#game3d').insertAdjacentHTML('beforeend', '<div class="track2d" id="track2d"></div>');
    $('#track2d').addEventListener('click', e => { const c = e.target.closest('[data-sp]'); if (c && c.classList.contains('mk')) placeTile(+c.dataset.sp); });
    toast('Máy không hỗ trợ 3D (WebGL) – dùng đường đua 2D nhé.');
  }
  if (location.hash === '#debug') window.__B = B;
  return B;
}
async function pump() {
  if (pumping) return; pumping = true;
  try {
    while (queue.length) {
      const v = queue.shift();
      const fresh = !shown || v.fxN < seenEv || !$('#screen-game').classList.contains('active');
      if (fresh) { await enterGame(v); continue; }
      const evs = v.fx.filter(e => e.id > seenEv); seenEv = v.fxN;
      const fast = queue.length > 2 || document.hidden;
      if (evs.length && !fast) { $('#panel').classList.add('busy'); if (!flat) B.markSpaces([]); for (const e of evs) { try { await animate(e, v); } catch (err) { console.error(err); } } }
      else if (fast) for (const e of evs) if (e.k === 'end') { endShown = false; }
      applyView(v);
    }
  } finally { pumping = false; }
}
async function enterGame(v) {
  show('screen-game'); closeModal();
  await ensureBoard();
  B.resize(); B.sync(v, colorsOf(v)); B.snap && B.snap();
  seenEv = v.fxN; endShown = v.phase === 'ended'; trayN = v.rolled.length;
  applyView(v);
  if (v.phase === 'playing' && v.fxN <= 1) { fx.banner('Xuất phát! 🐪💨', 'gold'); fx.sfx.grunt(); }
  if (!flat && !ls.get('camel-camhint')) { $('#cam-hint').hidden = false; setTimeout(() => { $('#cam-hint').hidden = true; }, 6000); ls.set('camel-camhint', '1'); }
}
function applyView(v) {
  const prevCoins = shown ? Object.fromEntries(shown.players.map(p => [p.id, p.coins])) : null;
  shown = v; busy = false;
  B.sync(v, colorsOf(v)); trayN = v.rolled.length;
  $('#panel').classList.remove('busy');
  reacts.setVisible(true);
  const c = v.phase === 'playing' ? cur(v) : null;
  const turnKey = c ? c.id + ':' + v.seq : '';
  if (turnKey !== ui.key) { ui.key = turnKey; ui.mode = 'main'; ui.sel = null; }
  if (c && c.id !== lastTurnPid) { lastTurnPid = c.id; if (isMine(c.id)) { fx.banner('Tới lượt bạn! 🐪', 'gold sm'); fx.sfx.turn(); } }
  renderTop(); renderPlayers(prevCoins); renderPanel(); renderLog(); renderRank();
  if (flat) renderFlat();
  if (v.phase === 'ended' && !endShown) { endShown = true; showEnd(v); }
}

// ---------- hoạt ảnh từng sự kiện ----------
async function animate(e, v) {
  switch (e.k) {
    case 'ticket': {
      fx.sfx.ticket(); flyChip(`.tkc[data-c="${e.camel}"]`, pcEl(e.pid), `🎫 ${e.value}`, CAMEL[e.camel].color);
      if (!isMine(e.pid)) fx.banner(`${nm(v, e.pid)} lấy vé ${CN(e.camel)} ${e.value}`, 'sm');
      await sleep(650 * k()); break;
    }
    case 'tile': {
      fx.sfx.tile(); await B.tilePop({ pos: e.pos, side: e.side, owner: e.pid }, colorsOf(v), 520 * k());
      B.floatAt(B.spacePos(e.pos), e.side > 0 ? '🌴 Ốc đảo +1' : '🌫️ Ảo ảnh −1', e.side > 0 ? '#1aa86a' : '#7a5cff');
      if (!isMine(e.pid)) fx.banner(`${nm(v, e.pid)} đặt ${e.side > 0 ? 'Ốc đảo 🌴' : 'Ảo ảnh 🌫️'} ô ${e.pos}`, 'sm');
      await sleep(300 * k()); break;
    }
    case 'bet': {
      fx.sfx.bet(); flyChip(pcEl(e.pid), $('#panel .meta') || $('#panel'), e.kind === 'win' ? '🏆 ?' : '🐢 ?', '#24314d', true);
      fx.banner(`${isMine(e.pid) ? 'Bạn' : nm(v, e.pid)} úp cược ${e.kind === 'win' ? 'VÔ ĐỊCH 🏆' : 'BÉT BẢNG 🐢'}`, 'sm');
      await sleep(700 * k()); break;
    }
    case 'roll': {
      fx.sfx.dice();
      const slot = trayN++;
      const p3 = B.dieOut(e.die, e.value, e.color, slot, 850 * k());
      await centerDie(e, v); await p3;
      flashCoin(e.pid, '+1');
      const mv = e.mv, steps = Math.abs(mv.land - mv.from) || 1, ms = (steps <= 3 ? 280 : 230) * k();
      await B.moveUnit(mv, ms, (p, extra) => {
        fx.sfx.hop();
        if (extra && mv.tile) { mv.tile.side > 0 ? fx.sfx.oasis() : fx.sfx.mirage(); flashCoin(mv.tile.owner, '+1'); B.floatAt(B.spacePos(mv.land), `+1 xu ${nm(v, mv.tile.owner)}`, mv.tile.side > 0 ? '#1aa86a' : '#7a5cff'); }
      });
      if (flat && mv.tile) flashCoin(mv.tile.owner, '+1');
      renderRank(B.board || v.board);
      if (mv.to > TRACK) { fx.sfx.finish(); fx.banner(`🏁 ${CAMEL[mv.camel === e.camel ? e.camel : mv.camel].name} cán đích!`, 'gold'); await sleep(600 * k()); }
      break;
    }
    case 'leg': {
      fx.sfx.leg(); fx.banner(`🏁 Hết chặng ${e.sum.leg}!`, 'gold');
      await legModal(e.sum, v);
      await B.legReset(650 * k()); trayN = 0;
      break;
    }
    case 'end': fx.sfx.win(); fx.confetti(120); if (v.result) B.celebrate(v.result.win); await sleep(700 * k()); break;
    case 'start': break;
  }
}
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9] };
const faceHTML = n => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => `<i${PIPS[n].includes(c) ? ' class="on"' : ''}></i>`).join('');
function centerDie(e, v) {
  let ov = $('#dice-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'dice-ov'; ov.setAttribute('aria-hidden', 'true'); $('#game3d').appendChild(ov); }
  const grey = e.die === 'xam', dcol = DIE_COLORS[e.die], pip = grey ? (e.color === 'trang' ? '#fff' : '#1d1b24') : e.die === 'vang' ? '#5a3c00' : '#fff';
  const faces = [e.value, 1 + (e.value % 3), 1 + ((e.value + 1) % 3), e.value, 1 + (e.value % 3), 1 + ((e.value + 1) % 3)];
  ov.innerHTML = `<div class="dc" style="--dcol:${dcol};--pip:${pip}"><div class="dcube">${faces.map((n, i) => `<div class="fc f${i}">${faceHTML(n)}</div>`).join('')}</div></div><div class="dsum"></div>`; ov.className = 'show';
  const ms = Math.round(900 * k()), c = ov.querySelector('.dcube');
  c.style.transition = 'none'; c.style.transform = `rotateX(${(Math.random() * 360) | 0}deg) rotateY(${(Math.random() * 360) | 0}deg)`;
  ov.querySelector('.dc').style.setProperty('--ms', ms + 'ms');
  requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transition = `transform ${ms}ms cubic-bezier(.15,.7,.25,1)`; c.style.transform = `rotateX(${360 * 3}deg) rotateY(${360 * 2}deg)`; ov.querySelector('.dc').classList.add('go'); }));
  return sleep(ms + 60).then(() => {
    const who = isMine(e.pid) ? 'Bạn' : nm(v, e.pid);
    ov.querySelector('.dsum').innerHTML = grey
      ? `🥴 Xám ra <em>${e.value}</em> ${CN(e.color)}${e.camel !== e.color ? ` → <em>${CN(e.camel)}</em> đi (luật xỉn)` : ''} · lùi!`
      : `${esc(who)} lắc: ${CN(e.die)} ra <em>${e.value}</em>!`;
    ov.classList.add('done');
    setTimeout(() => { if (ov.classList.contains('done')) ov.className = ''; }, Math.round(1100 * k()));
    return sleep(Math.round(380 * k()));
  });
}
const pcEl = id => $(`.pc[data-id="${CSS.escape(id || '')}"]`);
function flashCoin(pid, txt) {
  const el = pcEl(pid); if (!el) return; const c = el.querySelector('.coin'); if (!c) return;
  c.classList.remove('up', 'down'); void c.offsetWidth; c.classList.add(txt.startsWith('-') || txt.startsWith('−') ? 'down' : 'up'); fx.sfx.coin();
}
function flyChip(fromSel, toEl, text, color, small = false) {
  const from = typeof fromSel === 'string' ? $(fromSel) : fromSel; if (!from || !toEl || !settings.effects) return;
  const a = from.getBoundingClientRect(), b = toEl.getBoundingClientRect(), d = document.createElement('div');
  d.className = 'fly'; d.textContent = text; d.style.setProperty('--cc', color); d.style.left = (a.left + a.width / 2 - 20) + 'px'; d.style.top = (a.top + a.height / 2 - 12) + 'px';
  if (small) d.style.fontSize = '12px';
  document.body.appendChild(d);
  requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transform = `translate(${b.left + b.width / 2 - a.left - a.width / 2}px,${b.top + b.height / 2 - a.top - a.height / 2}px) scale(.8)`; d.style.opacity = '0.2'; }));
  setTimeout(() => d.remove(), 700);
}

// ---------- tổng kết chặng ----------
const chip = (c, t) => `<b class="${c}" style="${cc(c)}">${t}</b>`;
function legTable(v, rows) {
  return `<table class="sum-tbl">${rows.map(r => `<tr class="${isMine(r.pid) ? 'me' : ''}"><td><b>${esc(nm(v, r.pid))}</b></td><td><div class="chips">${r.items.length ? r.items.map(t => chip(t.camel, `${CN(t.camel)} ${t.gain > 0 ? '+' : ''}${t.gain}`)).join('') : '<small style="color:var(--muted)">không vé</small>'}</div></td><td class="${r.net > 0 ? 'g' : r.net < 0 ? 'l' : ''}">${r.net > 0 ? '+' : ''}${r.net} → 🪙${r.coins}</td></tr>`).join('')}</table>`;
}
function legModal(sum, v) {
  const [a, b] = sum.rank, mine = sum.rows.find(r => isMine(r.pid));
  const ms = Math.round(3700 * k());
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>🏁 Hết chặng ${sum.leg}</h2>
    <div class="sum-rank"><span class="${a}" style="${cc(a)}">🥇 ${CAMEL[a].name}</span><span class="${b}" style="${cc(b)}">🥈 ${CAMEL[b].name}</span></div>
    ${mine ? `<p style="text-align:center;margin:0 0 6px;font-weight:800">${mine.net > 0 ? `Bạn ăn ${mine.net} xu 🤑` : mine.net < 0 ? `Bạn mất ${-mine.net} xu 😭` : 'Bạn hoà vốn 😐'}</p>` : ''}
    ${legTable(v, sum.rows)}<div class="autoclose"><i style="animation-duration:${ms}ms"></i></div>`, '', 'leg');
  return new Promise(res => { modalT = setTimeout(() => { if (modalKey === 'leg') closeModal(); res(); }, ms); const iv = setInterval(() => { if (modalKey !== 'leg') { clearInterval(iv); res(); } }, 200); });
}

// ---------- thanh trên + người chơi ----------
function renderTop() {
  const v = shown, el = $('#turn-tag');
  // nhạc: đang đua / gay cấn khi lạc đà dẫn đầu sắp về đích (≥ ô 13) / hết ván
  { const lead = (v.board || []).reduce((m, s, p) => s && s.length ? Math.max(m, p) : m, 0); fx.musicMood(v.phase === 'ended' ? 'lobby' : lead >= 13 ? 'tense' : 'game'); }
  if (v.phase === 'ended') { const w = v.result.winners.map(id => nm(v, id)).join(', '); el.innerHTML = `<i style="--pc:#ffc928"></i><span>🏆 ${esc(w)} thắng</span>`; }
  else { const c = cur(v); el.innerHTML = `<i style="--pc:${pcol(v, c.id)}"></i><span><small class="lw">Lượt </small>${isMine(c.id) ? 'bạn' : esc(nm(v, c.id))}</span>`; }
  const all = v.opts.crazy ? [...RACERS, 'xam'] : RACERS;
  $('#leg-tag').innerHTML = `<span class="wd">Chặng ${v.leg}</span><span class="nr">C${v.leg} ·</span><span class="dd" title="Xúc xắc đã lắc">${all.map(d => `<i style="--dc:${DIE_COLORS[d]}" class="${v.pyramid.includes(d) ? '' : 'out'}"></i>`).join('')}</span><span>🎲${v.rolled.length}/${LEG_ROLLS}</span>`;
}
setInterval(() => {
  const el = $('#timer'), v = shown;
  if (!v || v.phase !== 'playing' || !deadlineAt) { el.hidden = true; return; }
  const s = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
  el.hidden = false; el.textContent = `⏳ ${s}s`; el.classList.toggle('low', s <= 5);
  if (s <= 5 && s > 0 && isMine(cur(v).id) && s !== el._last) { el._last = s; fx.sfx.tick(); }
}, 250);
function renderPlayers(prev) {
  const v = shown, el = $('#players'), n = v.players.length;
  el.style.setProperty('--cols', n <= 4 ? n : Math.ceil(n / 2));
  const bets = id => v.winBets.filter(b => b.pid === id).length + v.loseBets.filter(b => b.pid === id).length;
  el.innerHTML = v.players.map((p, i) => {
    const badge = (v.away || []).includes(p.id) ? '📴' : p.isBot ? '🤖' : '';
    const ch = prev && prev[p.id] !== undefined && prev[p.id] !== p.coins ? (p.coins > prev[p.id] ? 'up' : 'down') : '';
    const tile = v.tiles.find(t => t.owner === p.id), nb = bets(p.id);
    return `<div class="pc ${isMine(p.id) ? 'me' : ''} ${v.phase === 'playing' && p.id === cur(v).id ? 'turn' : ''}" data-id="${esc(p.id)}" style="--pc:${PCOL[i % 8]}" title="${esc(p.name)}">
      <div class="nm">${isMine(p.id) ? '👤 ' : ''}${esc(nm(v, p.id))}${badge ? ' ' + badge : ''}</div>
      <div class="tk"><span class="coin ${ch}">🪙${p.coins}</span>${p.legTix.map(t => `<b class="${t.camel}" style="${cc(t.camel)}">${t.value}</b>`).join('')}${tile ? `<span class="tl">${tile.side > 0 ? '🌴' : '🌫️'}${tile.pos}</span>` : ''}${nb ? `<span class="bets">🂠${nb}</span>` : ''}</div></div>`;
  }).join('');
}
function renderRank(board) {
  const v = shown; if (!v) return; const r = ranking(board || v.board);
  $('#rank-strip').innerHTML = `🏃 ${r.map((c, i) => `<i class="${c}" style="${cc(c)}" title="${CAMEL[c].name}">${i + 1}</i>`).join('')}`;
}
function renderLog() { if (logOpen) $('#log-list').innerHTML = shown.log.slice().reverse().map(l => `<li>${esc(l)}</li>`).join(''); }
$('#btn-log').onclick = () => { logOpen = !logOpen; $('#log').classList.toggle('open', logOpen); if (shown) renderLog(); };
$('#btn-log-close').onclick = () => { logOpen = false; $('#log').classList.remove('open'); };
$('#btn-follow').onclick = () => { fx.sfx.click(); if (B) { B.follow(); B.focusLead(); } };
$('#btn-overview').onclick = () => { fx.sfx.click(); if (!B) return; B.cam.mode === 'overview' ? B.follow() : B.overview(); };

// ---------- đường đua 2D (máy không có WebGL) ----------
function renderFlat() {
  const v = shown, el = $('#track2d'); if (!el) return;
  const marks = ui.mode === 'tile' && isMine(cur(v)?.id) ? legalTiles(v, v.me) : [];
  const cell = p => { const t = v.tiles.find(x => x.pos === p); return `<div class="sp ${marks.includes(p) ? 'mk' : ''}" data-sp="${p}"><span class="n">${p > TRACK ? '🏁' : p}</span>${t ? `<span class="t">${t.side > 0 ? '🌴' : '🌫️'}</span>` : ''}${(v.board[p] || []).map(c => `<b style="${cc(c)}" title="${CAMEL[c].name}"></b>`).join('')}</div>`; };
  const fin = v.board.slice(TRACK + 1).some(s => s.length);
  el.innerHTML = Array.from({ length: TRACK }, (_, i) => cell(i + 1)).join('') + (fin ? cell(TRACK + 1).replace('data-sp', 'data-fin') : '');
}

// ---------- bảng hành động ----------
function send(a) {
  if (busy || !net) return;
  busy = true; $('#panel').classList.add('busy');
  if (isHost) net.act('host', a); else net.act(a);
  setTimeout(function chk() { if (!busy) return; if (pumping || queue.length) return setTimeout(chk, 1000); busy = false; renderPanel(); }, 5000);
}
let oddsKey = '', odds = null;
// % gợi ý chỉ có khi chơi với bot: phòng có ≥ 2 người thật thì ẩn (theo danh sách người chơi hiện tại)
function oddsOk() { return hintsAllowed(lobby || (shown && shown.players)); }
function getOdds(v) {
  if (!settings.odds || !oddsOk() || v.phase !== 'playing') return null;
  const key = v.leg + ':' + v.seq + ':' + v.rolled.length;
  if (key !== oddsKey) { oddsKey = key; try { odds = simLeg(v, 500); } catch (e) { odds = null; } }
  return odds;
}
function setMode(m) { ui.mode = m; ui.sel = null; renderPanel(); if (flat) renderFlat(); }
function placeTile(pos) {
  const v = shown; if (!v || busy || ui.mode !== 'tile' || !isMine(cur(v).id)) return;
  if (!legalTiles(v, v.me).includes(pos)) { toast('Ô này không đặt được 🙅'); return; }
  if (!flat) B.markSpaces([]); send({ type: 'tile', pos, side: ui.side });
}
function onBoardTap(x, y) {
  const v = shown; if (!v || busy || v.phase !== 'playing' || ui.mode !== 'tile' || !isMine(cur(v).id)) return;
  const p = B.pickSpace(x, y); if (p) { fx.sfx.click(); placeTile(p); }
}
function ticketBoard(v, can) {
  const o = getOdds(v), lead = ranking(v.board)[0];
  return `<div class="tix">${RACERS.map(c => {
    const st = v.tickets[c], top = st[0], pct = o ? Math.round(o.first[c] * 100) : null;
    const f = can && top ? fnAttr('panel', () => { ui.mode = 'main'; ui.sel = ui.sel === c ? null : c; renderPanel(); }) : '';
    return `<button class="tkc ${c} ${top ? '' : 'empty'} ${can && top ? 'can' : ''} ${ui.sel === c ? 'sel' : ''}" data-c="${c}" style="${cc(c)}" ${f} ${top ? '' : 'disabled'} aria-label="Vé ${CN(c)} ${top || 'hết'}">
      ${c === lead ? '<span class="lead">👑</span>' : ''}${pct != null ? `<span class="pct">${pct}%</span>` : ''}<span class="v">${top ? '🎫' + top : '—'}</span><span class="s">${CN(c)} · còn ${st.length}</span></button>`;
  }).join('')}</div>`;
}
function renderPanel() {
  const v = shown, el = $('#panel'); if (!v) return;
  fns.panel = [];
  const meta = `<div class="meta"><span>🏆 Cược vô địch: ${v.winBets.length} lá</span><span>🐢 Cược bét: ${v.loseBets.length} lá</span><span>🎲 Còn ${v.pyramid.length} viên</span></div>`;
  if (v.phase === 'ended') {
    const r = v.result;
    el.innerHTML = `<div class="line"><span>🏆 <b>${CAMEL[r.win].name}</b> về nhất · 🐢 <b>${CAMEL[r.lose].name}</b> về bét. ${r.winners.includes(v.me) ? '<b>Bạn thắng!</b> 🤑' : `${esc(r.winners.map(id => nm(v, id)).join(', '))} thắng.`}</span></div>
      <div class="btns">${btn('panel', '🏆 Xem kết quả', () => showEnd(v), 'gold')}${isHost ? btn('panel', '🔁 Đua ván mới', () => net.restart(), 'pri') : ''}</div>`;
    if (!flat) B.markSpaces([]);
    return;
  }
  const c = cur(v), mine = isMine(c.id) && !busy, me = P(v, v.me);
  let html = '';
  if (!isMine(c.id)) {
    html = ticketBoard(v, false) + `<div class="line"><span>⏳ <b>${esc(nm(v, c.id))}</b> đang nghĩ nước đi…</span></div>` + meta;
    if (!flat) B.markSpaces([]);
  } else if (ui.mode === 'tile') {
    const legal = legalTiles(v, v.me), old = v.tiles.find(t => t.owner === v.me);
    html = `<div class="line"><span>🌴 <b>Đặt thảm</b>${old ? ` (dời từ ô ${old.pos})` : ''}: chọn mặt rồi <b>chạm ô sáng</b> trên đường đua</span></div>
      <div class="seg"><button class="${ui.side > 0 ? 'on' : ''}" ${fnAttr('panel', () => { ui.side = 1; renderPanel(); })}>🌴 Ốc đảo +1</button><button class="${ui.side < 0 ? 'on' : ''}" ${fnAttr('panel', () => { ui.side = -1; renderPanel(); })}>🌫️ Ảo ảnh −1</button></div>
      <div class="grid-sp">${legal.map(p => `<button ${fnAttr('panel', () => placeTile(p))} aria-label="Ô ${p}">${p}</button>`).join('')}${btn('panel', '← Quay lại', () => setMode('main'), 'ghost sm')}</div>`;
    if (!flat) B.markSpaces(legal, ui.side);
  } else if (ui.mode === 'bet') {
    const used = me.used || [];
    html = `<div class="line"><span>🏆 <b>Cược chung cuộc</b> (bí mật) – đúng: ${OVERALL_PAY[(ui.kind === 'win' ? v.winBets : v.loseBets).length] ?? 1} xu · sai −1</span></div>
      <div class="seg"><button class="${ui.kind === 'win' ? 'on' : ''}" ${fnAttr('panel', () => { ui.kind = 'win'; renderPanel(); })}>🏆 Về NHẤT</button><button class="${ui.kind === 'lose' ? 'on' : ''}" ${fnAttr('panel', () => { ui.kind = 'lose'; renderPanel(); })}>🐢 Về BÉT</button></div>
      <div class="camels5">${RACERS.map(cl => `<button class="${cl}" style="${cc(cl)}" ${used.includes(cl) ? 'disabled' : fnAttr('panel', () => send({ type: 'overall', kind: ui.kind, camel: cl }))}>${CN(cl)}<small>${used.includes(cl) ? 'đã dùng' : 'úp lá'}</small></button>`).join('')}</div>
      <div class="btns">${btn('panel', '← Quay lại', () => setMode('main'), 'ghost sm')}</div>`;
    if (!flat) B.markSpaces([]);
  } else {
    html = ticketBoard(v, mine);
    if (ui.sel && v.tickets[ui.sel][0]) {
      const val = v.tickets[ui.sel][0];
      html += `<div class="line"><span>🎫 Vé <b>${CAMEL[ui.sel].name}</b>: về nhất <b>+${val}</b>, nhì <b>+1</b>, còn lại <b>−1</b></span></div>
        <div class="btns">${btn('panel', `✅ Lấy vé ${CN(ui.sel)} ${val}`, () => send({ type: 'leg', camel: ui.sel }), 'green', !mine)}${btn('panel', 'Huỷ', () => { ui.sel = null; renderPanel(); }, 'ghost')}</div>`;
    } else {
      const usedAll = (me.used || []).length >= RACERS.length;
      html += `<div class="line"><span>👉 Tới lượt <b>bạn</b>! Chạm 1 vé ở trên, hoặc:</span></div>
        <div class="btns">${btn('panel', '🎲 Lắc kim tự tháp<small>+1 xu ngay</small>', () => send({ type: 'roll' }), 'roll', !mine || !v.pyramid.length)}${btn('panel', '🌴 Đặt thảm<small>+1 xu mỗi lần dính</small>', () => setMode('tile'), 'tile', !mine)}${btn('panel', '🏆 Cược chung cuộc<small>8/5/3/2/1</small>', () => setMode('bet'), 'bet', !mine || usedAll)}</div>`;
    }
    if (!flat) B.markSpaces([]);
  }
  el.innerHTML = html;
}

// ---------- thả emoji / chọc nhau ----------
var reacts = createReactions({
  send: e => { if (!net) return; if (isHost) net.react('host', e); else net.react(e); },
  seatEl: id => pcEl(id), myId: () => myId,
  nameOf: id => shown && P(shown, id) ? nm(shown, id) : '',
  mount: $('#game3d'), place: 'right:8px;bottom:8px', phrases: CAMEL_PHRASES,
  onShow: msg => { fx.sfx.notify(); if (!flat && B && shown && REACT_EMOJIS.includes(msg.e)) B.floatAt(B.camelPos(ranking(shown.board)[0]), msg.e, pcol(shown, msg.from)); },
});
reacts.setVisible(false);

// ---------- kết thúc cuộc đua ----------
function showEnd(v) {
  const r = v.result; if (!r) return;
  const order = [...v.players].sort((a, b) => b.coins - a.coins);
  const betRows = (list, label) => list.length ? list.map(b => `<tr class="${isMine(b.pid) ? 'me' : ''}"><td>${label}</td><td><b>${esc(nm(v, b.pid))}</b></td><td><div class="chips">${chip(b.camel, CN(b.camel))}</div></td><td class="${b.gain > 0 ? 'g' : 'l'}">${b.gain > 0 ? '+' : ''}${b.gain}</td></tr>`).join('') : `<tr><td colspan="4"><small style="color:var(--muted)">Không ai cược ${label === '🏆' ? 'vô địch' : 'bét'}.</small></td></tr>`;
  const win = r.winners.includes(v.me);
  fx.musicStinger(win ? 'win' : 'lose'); if (!win) setTimeout(() => fx.sfx.lose(), 600);
  setTimeout(() => {
    if (!shown || shown.phase !== 'ended') return;
    openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><div class="win"><div class="trophy">${win ? '🏆' : '🐪'}</div>
      <h2>${esc(r.winners.map(id => nm(v, id)).join(' & '))} THẮNG!</h2><p style="margin:0;font-weight:700">${win ? 'Đoán như thần, giàu nhất sa mạc 🤑' : 'Ván sau gỡ lại nha 😤'}</p></div>
      <div class="sum-rank">${r.rank.map((c, i) => `<span class="${c}" style="${cc(c)}">${['🥇', '🥈', '🥉', '4', '5'][i]} ${CN(c)}</span>`).join('')}</div>
      <h3 style="margin:8px 0 2px">🏁 Chặng cuối</h3>${legTable(v, r.leg.rows)}
      <h3 style="margin:10px 0 2px">🂠 Lật bài cược chung cuộc</h3><table class="sum-tbl">${betRows(r.winBets, '🏆')}${betRows(r.loseBets, '🐢')}</table>
      <h3 style="margin:10px 0 2px">🪙 Bảng xu</h3><table class="sum-tbl">${order.map((p, i) => `<tr class="${isMine(p.id) ? 'me' : ''}"><td>${i + 1}.</td><td><b>${esc(nm(v, p.id))}</b>${r.winners.includes(p.id) ? ' 👑' : ''}</td><td>🪙 ${p.coins}</td></tr>`).join('')}</table>
      <p class="note" style="text-align:center">Chơi vui bằng xu ảo, không cá cược tiền thật.</p>
      <div class="mbtns">${isHost ? btn('modal', '🔁 Đua ván mới', () => { closeModal(); net.restart(); }, 'pri') : ''}${btn('modal', '🗺️ Xem đường đua', closeModal, 'ghost')}${btn('modal', '🏠 Về trang chủ', leave, 'ghost')}</div>`, 'wide', 'end');
  }, 900 * k());
}

// ---------- tải lại trang: tự khôi phục phòng / tự vào lại ----------
(function resume() {
  const snap = loadSnapshot(), ses = session.load(GAME);
  const lk = linkCode(); // mở link mời phòng khác → vào thẳng phòng đó; link của chính phòng mình → vào lại như thường
  if (lk && !(ses && ses.code === lk)) { linkJoin(lk); return; }
  if (lk) clearLinkCode();
  if (snap && ses && ses.role === 'host') {
    fx.musicResumeIfOn();
    const hp = snap.players.find(p => p.id === 'host') || {};
    net = new Host(hp.name || myName(), handlers, !!snap.offline, snap); isHost = true; myId = 'host';
    $('#code-box').style.display = snap.offline ? 'none' : '';
    show('screen-lobby'); if (!snap.offline) netStatus('Đã khôi phục phòng ' + snap.code, 'ok'); return;
  }
  if (ses && ses.role === 'client' && ses.code) { net = new Client(ses.code, myName(), handlers); isHost = false; $('#code-box').style.display = ''; }
})();
if (location.hash === '#debug') window.__dbg = () => ({ net, shown, B, ui, q: () => ({ pumping, queue: queue.length, busy, seenEv }) });
