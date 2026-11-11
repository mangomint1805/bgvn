// Cờ Tỷ Phú Sài Gòn – giao diện: trang chủ, tạo nhân vật, sảnh, ván chơi 3D, hoạt ảnh sự kiện.
import { hintsAllowed, BOT_ONLY_NOTE } from '../../shared/ui/botonly.js?v=1';
import { linkCode, clearLinkCode, inviteUrl, joinByLink } from '../../shared/net/joinlink.js?v=2';
import { Host, Client, MAX, loadSnapshot, session, cleanAvatar, TYPHU_PHRASES } from './net.js?v=58';
import { createReactions, EMOJIS as REACT_EMOJIS } from '../../shared/ui/react.js?v=2';
import {
  setData, TILES, GROUPS, GROUP_LIST, STATION_RENT, money, rentOf, canBuild, canSell, canMortgage, canUnmortgage, houseCost, mortgageValue,
  unmortgageCost, travelOk, buildBlock, tradable, tradeError, buybackPrice, netWorth, tilesOf, ownsGroup, JAIL_FINE, MAX_TRADES, isProp,
  tradeImpact, tradeSideValue, planRaise, raiseSummary,
} from './engine.js?v=55';
import { Board3D, THEMES } from './scene3d.js?v=56';
import * as fx from './fx.js?v=50';
import { guideHTML } from './guide.js?v=55';
import { OPTIONS, PRESETS, buildAvatar, portrait } from '../../shared/js/avatar3d.js';
import * as THREE from '../../shared/lib/three.module.min.js';
import { OrbitControls } from '../../shared/lib/OrbitControls.js';
import { netStatus } from '../../shared/ui/status.js';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=111';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const settings = fx.settings;

// ---------- dữ liệu bàn cờ ----------
const [tilesData, cardsData] = await Promise.all(['tiles.json?v=49', 'cards.json?v=49'].map(u => fetch(u).then(r => r.json())));
setData(tilesData, cardsData);
const VN = 'ẮẰẲẴẶẤẦẨẪẬĐđơưƯƠếềểễệ';
const fontsReady = Promise.race([
  Promise.all(['800 40px "Be Vietnam Pro"', '700 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"', '800 40px "Baloo 2"'].map(f => document.fonts.load(f, 'Aa ' + VN).catch(() => null))),
  sleep(4500),
]);

// ---------- tiện ích giao diện ----------
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); if (id !== 'screen-game') fx.musicMood('lobby'); syncMusicBtns(); }
let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
// nút bấm có hàm xử lý, tách theo vùng (panel / modal / lobby) để vẽ lại vùng này không làm hỏng vùng kia
const fns = { panel: [], modal: [], lobby: [] };
function btn(scope, label, fn, cls = '', dis = false, title = '') { const i = fns[scope].push(fn) - 1; return `<button class="btn ${cls}" data-f="${scope}:${i}" ${dis ? 'disabled' : ''} ${title ? `title="${esc(title)}"` : ''}>${label}</button>`; }
function fnAttr(scope, fn) { return `data-f="${scope}:${fns[scope].push(fn) - 1}"`; }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-f]'); if (b && !b.disabled) { const [sc, i] = b.dataset.f.split(':'); const f = fns[sc] && fns[sc][+i]; if (f) { fx.sfx.click(); f(e, b); } return; }
  if (e.target.closest('[data-close]')) closeModal();
});
let modalKey = null, onModalClose = null;
function openModal(html, cls = '', key = null) {
  if (onModalClose) { const f = onModalClose; onModalClose = null; f(); }
  $('#modal-box').className = 'modal-box ' + cls; $('#modal-box').innerHTML = html; $('#modal').classList.add('open'); modalKey = key;
}
function setModal(html) { const b = $('#modal-box'), y = b.scrollTop; b.innerHTML = html; b.scrollTop = y; }
function closeModal() { $('#modal').classList.remove('open'); modalKey = null; fns.modal = []; if (onModalClose) { const f = onModalClose; onModalClose = null; f(); } if (B) { B.pick([]); syncTravelMark(); } }
// ✈️ du lịch: KHÔNG làm sáng cả bàn nữa. Chạm 1 ô trên bàn để chọn (chỉ ô đó sáng), chạm lần nữa / bấm nút để bay.
const myTravel = () => !!shown && shown.phase === 'playing' && shown.stage === 'travel' && isMine(shown.actor);
let travelSel = null;
const travelBad = i => !travelOk(i) ? (TILES[i].type === 'parking' ? 'Bạn đang ở Bãi đậu xe rồi' : 'Không bay vào tù được 😅') : shown && i === P(shown, shown.actor).pos ? 'Bạn đang đứng ở đây rồi' : '';
// 📍 ô đích trên bàn 3D: kind 'travel' (đang chọn nơi bay) hoặc 'move' (đích sau khi đổ / bay / thẻ)
let markKind = null, markTok = 0;
function setMark(kind, i, label, color) { if (!B) return; markKind = kind; markTok++; B.target(i, label, color); }
function clearMark(kind, delay = 0) {
  if (!B || (kind && markKind !== kind)) return;
  const tok = markTok, go = () => { if (tok !== markTok) return; markKind = null; B.clearTarget(); };
  if (delay) setTimeout(go, delay); else go();
}
function syncTravelMark() {
  if (!B) return;
  if (!myTravel()) { travelSel = null; clearMark('travel'); return; }
  if (travelSel != null && !travelBad(travelSel)) setMark('travel', travelSel, '✈️ ' + tileName(travelSel), '#5ec8ff');
  else clearMark('travel');
}
function travelTap(i) {
  const why = travelBad(i); if (why) { toast(why); return; }
  if (travelSel === i) { flyTo(i); return; }
  travelSel = i; syncTravelMark(); renderPanel();
}
function flyTo(i) { const pid = shown.actor; travelSel = null; setMark('move', i, '✈️ ' + tileName(i), '#5ec8ff'); send(pid, { type: 'travel', tile: i }); }
function openTravel() {
  const v = shown, me = v.actor;
  const row = i => `<div class="row" style="border-left:6px solid ${gColor(i)};padding-left:8px"><span class="nm" ${fnAttr('modal', () => { travelSel = i; closeModal(); renderPanel(); })}>${esc(tileName(i))} <small>${v.props[i] ? (v.props[i].owner === me ? '🙋 của mình ' : '👤 ' + esc(nm(v, v.props[i].owner)) + ' ') + statusOf(v, i) : isProp(i) ? '🏦 trống · ' + money(TILES[i].price) : ''}</small></span><button class="btn sm pri" ${fnAttr('modal', () => { closeModal(); flyTo(i); })}>✈️ Bay</button></div>`;
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>✈️ Du lịch tới đâu?</h2><p class="note">${+v.opts.travelFee ? `🎫 Vé máy bay: <b>${money(+v.opts.travelFee)}</b>. ` : ''}Mẹo: chạm thẳng vào ô trên bàn cờ cũng chọn được. Bay ngược qua <b>Bắt đầu</b> vẫn nhận 200K. Không bay tới Vào tù được.</p><div class="mg">${TILES.map((t, i) => i).filter(i => travelOk(i) && i !== v.players.find(p => p.id === me).pos).map(row).join('')}</div>`);
}
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && modalKey !== 'lock') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modal').classList.contains('open') && modalKey !== 'lock') closeModal(); });

// ảnh chân dung nhân vật (cache)
const pcache = new Map();
function pic(cfg, size = 96) {
  const k = JSON.stringify(cfg || {}) + size;
  if (!pcache.has(k)) { let u = ''; try { u = portrait(cfg || PRESETS[0], size); } catch (e) {} pcache.set(k, u || 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='); }
  return pcache.get(k);
}

// ---------- hồ sơ người chơi (dùng chung mọi game) ----------
function loadAvatar() {
  try { const a = JSON.parse(ls.get('bgvn-avatar')); if (a && a.kind) return cleanAvatar(a); } catch (e) {}
  const a = cleanAvatar(PRESETS[Math.floor(Math.random() * PRESETS.length)]); ls.set('bgvn-avatar', JSON.stringify(a)); return a;
}
let myAvatar = loadAvatar();
$('#name').value = ls.get('bgvn-name') || '';
const myName = () => { const n = ($('#name').value.trim() || 'Bạn').slice(0, 16); ls.set('bgvn-name', n); return n; };
const meProfile = () => ({ name: myName(), avatar: myAvatar });
function refreshMe() { $('#me-portrait').src = pic(myAvatar, 168); }
refreshMe();
$('#name').addEventListener('change', () => { myName(); if (net && !shown) net.setProfile(meProfile()); });

// ---------- trình tạo nhân vật (xem trước 3D) ----------
const LBL = { kind: 'Kiểu nhân vật', skin: 'Màu da / lông', hair: 'Kiểu tóc', hairColor: 'Màu tóc', hat: 'Nón', outfit: 'Trang phục', acc: 'Phụ kiện', horns: 'Sừng 😈', color: 'Màu chủ đạo (màu quân)' };
function openAvatarEditor(initial, onSave, title = '🎨 Tạo nhân vật') {
  let cfg = cleanAvatar(initial);
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>${title}</h2>
    <div class="av-wrap"><div><div class="av-view" id="av-view"></div><p class="note" style="text-align:center">Kéo để xoay nhân vật</p></div>
    <div><div class="av-row"><b>Mẫu có sẵn</b><div class="presets" id="av-presets"></div></div><div id="av-rows"></div></div></div>
    <div class="mbtns"><button class="btn ghost" data-close>Huỷ</button>${btn('modal', 'Lưu nhân vật ✓', () => { onSave(cleanAvatar(cfg)); closeModal(); }, 'pri')}</div>`, 'wide', 'avatar');
  const el = $('#av-view');
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { el.innerHTML = `<img src="${pic(cfg, 220)}" style="width:100%;height:100%;object-fit:contain">`; }
  let sc, cam, ctl, av = null;
  if (r) {
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace; r.shadowMap.enabled = true; el.appendChild(r.domElement);
    sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x88aa77, 1.3)); const d = new THREE.DirectionalLight(0xffffff, 1.8); d.position.set(2, 4, 3); d.castShadow = true; sc.add(d);
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.08, 40), new THREE.MeshStandardMaterial({ color: '#7bd389' })); ground.position.y = -0.04; ground.receiveShadow = true; sc.add(ground);
    cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20); cam.position.set(1.0, 1.3, 3.6);
    ctl = new OrbitControls(cam, r.domElement); ctl.target.set(0, 0.6, 0); ctl.enablePan = false; ctl.minDistance = 2; ctl.maxDistance = 5; ctl.update();
    const size = () => { const w = el.clientWidth || 200, h = el.clientHeight || 200; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    const ro = new ResizeObserver(size); ro.observe(el); size();
    r.setAnimationLoop(t => { if (av) { av.rotation.y = Math.sin(t / 1400) * 0.5; if (av.userData.head) av.userData.head.rotation.z = Math.sin(t / 500) * 0.05; av.position.y = Math.abs(Math.sin(t / 400)) * 0.03; } ctl.update(); r.render(sc, cam); });
    onModalClose = () => { r.setAnimationLoop(null); ro.disconnect(); ctl.dispose(); r.dispose(); try { r.forceContextLoss(); } catch (e) {} };
  }
  const rebuild = () => { if (sc) { if (av) sc.remove(av); av = buildAvatar(cfg); av.traverse(m => { if (m.isMesh) m.castShadow = true; }); sc.add(av); } else el.querySelector('img').src = pic(cfg, 220); rows(); };
  const rows = () => {
    $('#av-rows').innerHTML = Object.entries(OPTIONS).map(([k, list]) => `<div class="av-row"><b>${LBL[k] || k}</b><div class="av-opts">${list.map(o => Array.isArray(o)
      ? `<button data-k="${k}" data-v="${o[0]}" class="${cfg[k] === o[0] ? 'on' : ''}">${o[1]}</button>`
      : `<button class="sw ${String(cfg[k]).toLowerCase() === o.toLowerCase() ? 'on' : ''}" data-k="${k}" data-v="${o}" style="background:${o}" aria-label="${o}"></button>`).join('')}</div></div>`).join('');
    $$('#av-rows [data-k]').forEach(b => b.onclick = () => { cfg = { ...cfg, [b.dataset.k]: b.dataset.v }; fx.sfx.hop(); $$('#av-presets button').forEach(x => x.classList.remove('on')); rebuild(); });
  };
  $('#av-presets').innerHTML = PRESETS.map((p, i) => `<button data-p="${i}"><img src="${pic(cleanAvatar(p), 80)}" alt="">${esc(p.name)}</button>`).join('');
  $$('#av-presets [data-p]').forEach(b => b.onclick = () => { cfg = cleanAvatar(PRESETS[+b.dataset.p]); fx.sfx.hop(); $$('#av-presets button').forEach(x => x.classList.toggle('on', x === b)); rebuild(); });
  rebuild();
}
const editMine = () => openAvatarEditor(myAvatar, a => { myAvatar = a; ls.set('bgvn-avatar', JSON.stringify(a)); refreshMe(); if (net && !shown) net.setProfile(meProfile()); toast('Đã lưu nhân vật ✨'); });
$('#btn-avatar').onclick = editMine;
$('#btn-avatar-lobby').onclick = editMine;

// ---------- cài đặt ----------
function openSettings() {
  const seg = (k, list, fn) => `<div class="seg">${list.map(([v, n]) => `<button class="${settings[k] === v ? 'on' : ''}" ${fnAttr('modal', () => { settings[k] = v; fx.saveSettings(); fn && fn(v); openSettings(); })}>${n}</button>`).join('')}</div>`;
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>⚙️ Cài đặt</h2>
    <div class="set-row"><b>🎵 Nhạc nền</b><div class="seg"><button class="${settings.musicOn ? 'on' : ''}" ${fnAttr('modal', () => { fx.musicToggle(!settings.musicOn); syncMusicBtns(); openSettings(); })}>${settings.musicOn ? 'Đang bật' : 'Đang tắt'}</button></div>
      <input type="range" min="0" max="1" step="0.05" value="${settings.music}" id="vol-music" aria-label="Âm lượng nhạc"></div>
    <div class="set-row"><b>🔊 Hiệu ứng âm thanh</b><input type="range" min="0" max="1" step="0.05" value="${settings.sfx}" id="vol-sfx" aria-label="Âm lượng hiệu ứng"></div>
    <div class="set-row"><b>✨ Hiệu ứng hình ảnh</b>${seg('effects', [[true, 'Bật'], [false, 'Tắt']], v => B && B.setEffects(v))}</div>
    <div class="set-row"><b>🌇 Chủ đề</b>${seg('theme', Object.entries(THEMES).map(([k, t]) => [k, t.name]), v => B && B.setTheme(v))}</div>
    <div class="set-row"><b>🖥️ Chất lượng 3D</b>${seg('quality', [['low', 'Thấp'], ['med', 'Vừa'], ['high', 'Cao']], v => B && B.setQuality(v))}</div>
    <div class="set-row"><b>⏩ Tốc độ hoạt ảnh</b>${seg('speed', [['slow', 'Chậm'], ['normal', 'Vừa'], ['fast', 'Nhanh']])}</div>
    <p class="note">Máy yếu / điện thoại nóng: chọn chất lượng Thấp. Cài đặt được lưu trên máy này.</p>
    <div class="mbtns">${btn('modal', '📖 Hướng dẫn luật', () => openGuide(), 'ghost')}${btn('modal', '🧭 Xem lại hướng dẫn', () => replayTour(), 'ghost')}<button class="btn ghost" id="btn-news-set">📝 Có gì mới</button></div>`, '', 'settings');
  const nb = $('#btn-news-set'); newsBadge(nb, 'typhu'); nb.onclick = () => { fx.sfx.click(); news(); };
  $('#vol-music').oninput = e => { settings.music = +e.target.value; fx.applyVolumes(); fx.saveSettings(); };
  $('#vol-sfx').oninput = e => { settings.sfx = +e.target.value; fx.applyVolumes(); fx.saveSettings(); };
  $('#vol-sfx').onchange = () => fx.sfx.cash();
}
$('#btn-settings').onclick = $('#btn-settings-home').onclick = openSettings;
// nút 🎵 nhanh (trang chủ + trong ván)
function syncMusicBtns() { const on = fx.musicIsOn(); for (const b of $$('.btn-music')) { b.classList.toggle('on', on); b.classList.toggle('off', !on); b.style.opacity = on ? '' : '.55'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = on ? 'Nhạc nền: đang bật (bấm để tắt)' : 'Nhạc nền: đang tắt (bấm để bật)'; } const h = $('#btn-music-home'); if (h) h.textContent = on ? '🎵 Nhạc: bật' : '🔇 Nhạc: tắt'; }
for (const b of $$('.btn-music')) b.onclick = () => { fx.actx(); fx.musicToggle(); syncMusicBtns(); if (fx.sfx.click) fx.sfx.click(); };
syncMusicBtns();

const openGuide = () => openModal(guideHTML(), 'wide', 'guide');
// 📝 Có gì mới (patch notes dùng chung)
function news() { openNews('typhu'); $$('.bgvn-dot').forEach(b => b.classList.toggle('bgvn-dot', false)); }
for (const id of ['#btn-news-home', '#btn-news-lobby']) { const b = $(id); newsBadge(b, 'typhu'); b.onclick = () => { fx.sfx.click(); news(); }; }
$('#btn-guide-home').onclick = openGuide;

// ---------- kết nối ----------
let net = null, isHost = false, myId = null, lobby = null;
const handlers = {
  onLobby(info, code, started) {
    lobby = info; $('#room-code').textContent = code;
    if (!started) { if (shown) resetGame(); renderLobby(); if (!$('#screen-lobby').classList.contains('active')) show('screen-lobby'); }
  },
  onState(v, tmo) { if (!v) { resetGame(); renderLobby(); show('screen-lobby'); return; } receive(v, tmo); },
  onError(m) { toast(m); fx.sfx.bad(); if (busy) { busy = false; renderPanel(); } },
  onJoined(id) { myId = id; },
  onDisconnect() { netStatus('Mất kết nối – đang vào lại…', 'wait'); },
  onNet(t, k, retry) { netStatus(t, k, retry); },
  onFail() { leave(); },
  onReact(msg) { reacts.show(msg); },
  onAfk(pid) { const p = shown && shown.players.find(x => x.id === pid); if (p) toast(`⏳ ${p.name} hết giờ – máy đánh giúp.`); },
};
function startHost(offline) {
  fx.actx(); fx.musicResumeIfOn();
  net = new Host(meProfile(), handlers, offline); isHost = true; myId = 'host';
  if (offline) { session.save('typhu', { role: 'host', code: 'OFFLINE' }); net.addBot(); net.addBot(); net.addBot(); }
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
function leave() {
  if (net) { try { net.leave(); } catch (e) {} } net = null; lobby = null; resetGame(); closeModal(); netStatus('');
  show('screen-home');
}
$('#btn-leave-lobby').onclick = leave;
$('#btn-leave').onclick = () => openModal(`<h2>Rời ván?</h2><p style="text-align:center">${isHost ? 'Bạn là chủ phòng – rời đi sẽ kết thúc ván của mọi người.' : 'Bạn có thể vào lại bằng mã phòng (máy sẽ tạm đánh thay).'}</p>
  <div class="mbtns"><button class="btn ghost" data-close>Ở lại</button>${btn('modal', 'Rời ván', leave, 'red')}</div>`);
$('#btn-copy').onclick = () => { const url = inviteUrl($('#room-code').textContent.trim()); (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Đã chép link mời 📋'), () => toast(url)); };

// ---------- sảnh ----------
const OPTS = [
  ['startMoney', '💰 Tiền khởi đầu', [[1500, '1,5M'], [2000, '2M'], [2500, '2,5M']]],
  ['maxRounds', '⏱️ Giới hạn vòng', [[0, 'Không'], [20, '20'], [30, '30'], [50, '50']], 'Hết vòng thì ai nhiều tài sản nhất thắng.'],
  ['monopolyWin', '🏆 Thắng độc quyền', [[true, 'Bật'], [false, 'Tắt']], 'Trọn 3 nhóm màu, cả 4 bến xe hoặc trọn 1 hàng (mọi ô mua được trên 1 cạnh bàn, không thế chấp) là thắng luôn.'],
  ['auction', '🔨 Đấu giá', [[true, 'Bật'], [false, 'Tắt']], 'Không mua thì đem ô đó ra đấu giá.'],
  ['freeBuild', '🏗️ Xây nhà', [[true, 'Không cần đủ bộ'], [false, 'Phải đủ bộ màu'], ['zing', 'ZingPlay thật']], 'Không cần đủ bộ: đất mình là xây được, lúc nào cũng được. Phải đủ bộ: luật cổ điển. ZingPlay thật: chỉ xây ở ô vừa dừng – đứng lên đất mình là hỏi luôn “Xây mấy nhà?”.'],
  ['buyback', '💥 Mua lại đất', [[true, 'Bật'], [false, 'Tắt']], 'Trả thuê xong được mua lại đường đó với giá gấp đôi.'],
  ['travel', '✈️ Bãi đậu xe', [[true, 'Du lịch'], [false, 'Chỉ nghỉ']], 'Du lịch: dừng ở Bãi đậu xe được chọn 1 ô để bay tới ngay (kiểu ZingPlay).'],
  ['travelFee', '🎫 Vé máy bay', [[0, 'Miễn phí'], [50, '50K'], [100, '100K'], [200, '200K']], 'Giá vé khi du lịch từ Bãi đậu xe. Không đủ tiền thì chỉ được nghỉ.'],
  ['turnTime', '⏳ Thời gian suy nghĩ', [[0, 'Không'], [30, '30s'], [60, '60s'], [90, '90s']], 'Hết giờ máy đánh giúp (chơi online).', true],
];
function renderLobby() {
  if (!lobby) return;
  fns.lobby = [];
  const ps = lobby.players;
  $('#pcount').textContent = `${ps.length}/${MAX}`;
  $('#plist').innerHTML = ps.map(p => {
    const tag = p.id === 'host' ? '👑 Chủ phòng' : p.isBot ? '🤖 Máy' : p.local ? '🎮 Cùng máy' : p.connected ? '🌐 Online' : '📴 Mất kết nối';
    return `<li><img src="${pic(p.avatar, 88)}" alt=""><div><b>${esc(p.name)}</b>${p.id === myId ? ' <small>(bạn)</small>' : ''}<br><small>${tag}</small></div>${isHost && p.id !== 'host' ? `<button class="x" ${fnAttr('lobby', () => net.removePlayer(p.id))} aria-label="Mời ra">✕</button>` : ''}</li>`;
  }).join('');
  const offline = net && net.offline;
  $('#opts').innerHTML = OPTS.filter(o => !(o[4] && offline)).map(([k, name, list, hint]) => `<div class="opt"><b>${name}</b><div class="seg">${list.map(([v, n]) =>
    `<button class="${lobby.opts[k] === v ? 'on' : ''}" ${isHost ? fnAttr('lobby', () => net.setOpt(k, v)) : 'disabled'}>${n}</button>`).join('')}</div>${hint ? `<small>${hint}</small>` : ''}</div>`).join('');
  $('#btn-addbot').style.display = $('#btn-addlocal').style.display = isHost ? '' : 'none';
  $('#btn-addbot').disabled = $('#btn-addlocal').disabled = ps.length >= MAX;
  $('#btn-start').style.display = isHost ? '' : 'none'; $('#wait-msg').style.display = isHost ? 'none' : '';
}
$('#btn-addbot').onclick = () => { fx.sfx.click(); net && net.addBot(); };
$('#btn-addlocal').onclick = () => {
  let pick = Math.floor(Math.random() * PRESETS.length);
  const draw = () => openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>🎮 Người chơi cùng máy</h2>
    <p class="note" style="text-align:center;margin-top:0">Nhiều người chơi chung một máy: tới lượt ai người đó bấm.</p>
    <label class="fld"><span>Tên</span><input class="inp" id="loc-name" maxlength="16" placeholder="Tên người chơi"></label>
    <div class="av-row" style="margin-top:8px"><b>Chọn nhân vật</b><div class="presets">${PRESETS.map((p, i) => `<button class="${i === pick ? 'on' : ''}" ${fnAttr('modal', () => { const nm = $('#loc-name').value; pick = i; draw(); $('#loc-name').value = nm; })}><img src="${pic(cleanAvatar(p), 80)}" alt="">${esc(p.name)}</button>`).join('')}</div></div>
    <div class="mbtns">${btn('modal', '＋ Thêm', () => { const nm = $('#loc-name').value.trim() || PRESETS[pick].name; net.addLocal(nm, cleanAvatar(PRESETS[pick])); closeModal(); }, 'pri')}</div>`);
  draw(); setTimeout(() => $('#loc-name') && $('#loc-name').focus(), 50);
};
$('#btn-start').onclick = () => { fx.actx(); net && net.start(); };

// ================= VÁN CHƠI =================
let B = null, shown = null, seenEv = 0, busy = false, deadlineAt = 0, winShown = false, logOpen = false;
const queue = []; let pumping = false, curAnim = '', curBatch = [];
const P = (v, id) => v.players.find(p => p.id === id);
const cur = v => v.players[v.turn];
const mineIds = v => v.controlled || [];
const isMine = id => !!shown && mineIds(shown).includes(id);
const nm = (v, id) => id ? (P(v, id) || {}).name || '?' : 'Ngân hàng';
const tileName = i => TILES[i].name;
const gColor = i => TILES[i].group ? GROUPS[TILES[i].group].color : TILES[i].type === 'station' ? '#24314d' : TILES[i].type === 'utility' ? '#1e88e5' : '#8d99ae';
const multiLocal = v => mineIds(v).length > 1;
const youOr = (v, id) => isMine(id) && !multiLocal(v) ? 'Bạn' : esc(nm(v, id));

function resetGame() {
  if (typeof reacts !== 'undefined' && reacts) reacts.setVisible(false);
  shown = null; seenEv = 0; busy = false; winShown = false; queue.length = 0; deadlineAt = 0; recap = { list: [], buf: null, open: false, hide: false }; renderRecap(); stopTour(false);
  travelSel = null; markKind = null; if (B) { B.pick([]); B.clearTarget(); }
  if (modalKey && modalKey !== 'avatar' && modalKey !== 'settings') closeModal();
}
function rentsFor(v) {
  const r = {};
  for (const k in v.props) {
    const i = +k, t = TILES[i];
    if (t.type === 'utility') { const n = Object.keys(v.props).filter(j => TILES[j].type === 'utility' && v.props[j].owner === v.props[k].owner).length; r[i] = n >= 2 ? 'Thuê ×10' : 'Thuê ×4'; }
    else r[i] = rentOf(v, i);
  }
  return r;
}
function receive(v, tmo) {
  v.rents = rentsFor(v);
  deadlineAt = tmo ? Date.now() + tmo : 0;
  queue.push(v); pump();
}
async function ensureBoard() {
  if (B) return B;
  await fontsReady;
  if (B) return B;
  try {
    B = new Board3D($('#game3d'), {
      tiles: TILES, groups: GROUPS, quality: settings.quality, theme: settings.theme, effects: settings.effects,
      onCell: i => { fx.sfx.click(); if (myTravel() && !busy) travelTap(i); else openTile(i); },
      onCamera: m => { $('#btn-home-cam').classList.toggle('on', m === 'free'); $('#btn-overview').classList.toggle('on', m === 'overview'); },
    });
  } catch (e) { console.error(e); toast('Máy không hỗ trợ 3D (WebGL) – thử trình duyệt khác nhé.'); throw e; }
  window.__B = B; if (B.dice) B.dice.forEach(d => { d.outer.visible = false; }); // xúc xắc giờ lăn giữa màn hình (lớp 2D)
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
      try { collectRecap(evs, v); } catch (err) { console.error(err); }
      const fast = queue.length > 2 || document.hidden;
      const anim = evs.filter((e, k) => !(e.t === 'build' && evs.slice(k + 1).some(x => x.t === 'build' && x.tile === e.tile)));
      curBatch = anim;
      if (anim.length && !fast) { $('#panel').classList.add('busy'); for (const e of anim) { curAnim = e.t; try { await animate(e, v); } catch (err) { console.error(err); } } curAnim = ''; }
      applyView(v);
    }
  } finally { pumping = false; }
}
async function enterGame(v) {
  show('screen-game'); closeModal();
  await ensureBoard();
  for (const id in B.pawns) if (!v.players.some(p => p.id === id)) B.pawns[id].visible = false;
  B.sync(v); B.placeAll(v.players);
  const c = cur(v); B.setTurn(c.id); B.cam.mode = 'overview'; B.snap(); B.follow(c.id);
  seenEv = v.evn; winShown = v.phase === 'over';
  recapReset(v);
  applyView(v);
  if (v.phase === 'playing' && v.round === 1 && v.evn <= 2) { fx.banner('Bắt đầu! 🎲', 'gold'); fx.sfx.turn(); }
  if (!ls.get('typhu-camhint')) { $('#cam-hint').hidden = false; setTimeout(() => { $('#cam-hint').hidden = true; }, 6000); ls.set('typhu-camhint', '1'); }
}
function applyView(v) {
  shown = v; busy = false;
  B.sync(v);
  for (const p of v.players) if (!p.out && B.pawnTile[p.id] !== p.pos && !B.moving.has(p.id)) B.setPawnTile(p.id, p.pos, 300);
  B.arrange(10, 300);
  if (v.phase === 'playing') B.setTurn(cur(v).id);
  $('#panel').classList.remove('busy');
  reacts.setVisible(true);
  if (!myTravel()) travelSel = null;
  if (markKind === 'move') clearMark('move', 700); else syncTravelMark();
  renderTop(); renderPlayers(); renderPanel(); renderLog();
  if (modalKey === 'manage') renderManage();
  else if (modalKey && modalKey.startsWith('tile:')) openTile(+modalKey.slice(5), true);
  else if (modalKey && modalKey.startsWith('player:')) openPlayer(modalKey.slice(7));
  else if (modalKey === 'trade' && v.stage !== 'roll' && v.stage !== 'end') closeModal();
  else if (modalKey === 'ask' && !(askFor && askFor.tile === v.landed && v.actor === askFor.pid && canBuild(v, askFor.pid, askFor.tile))) closeModal();
  if (v.phase === 'over' && !winShown) { winShown = true; showWin(v); }
  maybeAskBuild(v); maybeTour(v); renderRecap();
}

// ---------- hoạt ảnh từng sự kiện ----------
const k = () => fx.S();
async function animate(e, v) {
  const pc = id => P(v, id) ? P(v, id).color : '#ff7a1a';
  switch (e.t) {
    case 'turn': {
      B.setTurn(e.pid); B.follow(e.pid); fx.sfx.turn();
      if (isMine(e.pid)) fx.banner(multiLocal(v) ? `Lượt ${nm(v, e.pid)}!` : 'Tới lượt bạn!', 'gold sm');
      await sleep(200 * k()); break;
    }
    case 'roll': {
      B.follow(e.pid); fx.sfx.dice(); setDice(e.d);
      // 📍 đích đến: tìm sự kiện đi bộ ngay sau lần đổ này để báo trước ô sẽ dừng
      const bi = curBatch.indexOf(e), mv = !e.util && bi >= 0 ? curBatch.slice(bi + 1).find(x => x.t === 'roll' || (x.t === 'move' && x.pid === e.pid)) : null;
      const dest = mv && mv.t === 'move' && mv.kind !== 'jail' && mv.from !== mv.to ? mv.to : null;
      await centerDice(e.d, isMine(e.pid) && rollPower != null ? rollPower : 0.5, dest, () => { if (dest != null) setMark('move', dest, '📍 ' + tileName(dest), '#ffd54a'); }); rollPower = null;
      if (e.d[0] === e.d[1] && !e.util) { fx.banner('Đôi! 🎲🎲', 'gold sm'); }
      await sleep(150 * k()); break;
    }
    case 'move': await moveAnim(e); break;
    case 'land': B.pulse(e.tile, 0.9); clearMark('move', 650); break;
    case 'salary': fx.sfx.cash(); B.coins(null, e.pid, 5); B.floatAt(e.pid, '+' + money(e.amt), '#1aa86a'); flashPc(e.pid); await sleep(300 * k()); break;
    case 'buy': case 'sold': {
      if (!e.pid) { fx.banner('Không ai mua 🤷', 'sm'); await sleep(500 * k()); break; }
      fx.sfx.buy(); B.fireworks(e.tile, 2, [pc(e.pid), '#ffd54a']); B.floatAt(e.tile, '🏷️ ' + money(e.amt), pc(e.pid));
      if (e.t === 'sold') fx.banner(`🔨 ${nm(v, e.pid)} chốt ${money(e.amt)}!`, 'sm');
      partialProp(e.tile, { owner: e.pid, h: 0, mort: false }, v);
      await sleep(650 * k()); break;
    }
    case 'pay': {
      const big = e.amt >= 200;
      B.coins(e.from, e.to || null, Math.min(12, 3 + Math.round(e.amt / 60)));
      B.floatAt(e.from, '-' + money(e.amt), '#e53935');
      if (e.to) setTimeout(() => B.floatAt(e.to, '+' + money(e.amt), '#1aa86a'), 450 * k());
      if (big && e.why === 'rent') { B.shake(Math.min(0.4, 0.1 + e.amt / 2500)); fx.sfx.ouch(); fx.shakeEl(pcEl(e.from)); if (e.amt >= 600) fx.banner('💸 Đau ví!', 'red sm'); }
      else fx.sfx.pay();
      flashPc(e.from); if (e.to) flashPc(e.to);
      await sleep(700 * k()); break;
    }
    case 'gain': fx.sfx.cash(); B.coins(null, e.pid, 5); B.floatAt(e.pid, '+' + money(e.amt), '#1aa86a'); flashPc(e.pid); await sleep(500 * k()); break;
    case 'card': await showCard(e, v); break;
    case 'jail': break;
    case 'free': fx.sfx.unlock(); B.floatAt(e.pid, '🔓 Ra tù', '#1aa86a'); await sleep(300 * k()); break;
    case 'debt': fx.sfx.bad(); if (isMine(e.pid)) fx.banner('😰 Thiếu tiền!', 'red sm'); break;
    case 'auction': fx.sfx.auction(); fx.banner('🔨 Đấu giá!', 'gold'); B.pulse(e.tile, 1); await sleep(450 * k()); break;
    case 'bid': fx.sfx.bid(); B.floatAt(e.pid, '🙋 ' + money(e.amt), '#ff7a1a'); await sleep(150 * k()); break;
    case 'pass': B.floatAt(e.pid, 'Bỏ', '#8d99ae'); break;
    case 'buyback': {
      fx.sfx.takeover(); fx.banner('💥 MUA LẠI!', 'red'); B.shake(0.25); B.coins(e.pid, e.from, 8);
      B.floatAt(e.tile, '💥 ' + money(e.amt), pc(e.pid)); partialProp(e.tile, { ...(shown.props[e.tile] || { h: 0, mort: false }), owner: e.pid }, v);
      B.fireworks(e.tile, 3, [pc(e.pid)]); await sleep(900 * k()); break;
    }
    case 'build': {
      partialProp(e.tile, { ...(shown.props[e.tile] || {}), h: e.h, owner: e.pid, mort: false }, v);
      if (e.h === 5) { fx.sfx.landmark(); fx.banner('🏛️ LANDMARK!', 'gold'); B.fireworks(e.tile, 6); fx.confetti(70); B.shake(0.12); await sleep(900 * k()); }
      else { fx.sfx.build(); B.floatAt(e.tile, '🏠 -' + money(e.amt), '#ff7a1a'); await sleep(250 * k()); }
      break;
    }
    case 'sell': fx.sfx.pay(); B.floatAt(e.tile, '🔨 +' + money(e.amt), '#1aa86a'); partialProp(e.tile, { ...(shown.props[e.tile] || {}), h: e.h }, v); await sleep(200 * k()); break;
    case 'mort': fx.sfx.cash(); B.floatAt(e.tile, '🏦 +' + money(e.amt), '#6b7895'); partialProp(e.tile, { ...(shown.props[e.tile] || {}), mort: true }, v); await sleep(200 * k()); break;
    case 'raise': fx.sfx.cash(); toast(`⚡ ${nm(v, e.pid)} đã ${raiseSummary(e.steps)} (+${money(e.amt)})`); await sleep(300 * k()); break;
    case 'unmort': fx.sfx.unlock(); B.floatAt(e.tile, '🔑 Chuộc', '#1aa86a'); await sleep(200 * k()); break;
    case 'offer': fx.sfx.notify(); if (isMine(e.to)) fx.banner('🤝 Có kèo giao dịch!', 'sm'); break;
    case 'reject': fx.sfx.bad(); toast(`🙅 ${nm(v, e.to)} từ chối giao dịch.`); break;
    case 'traded': fx.sfx.trade(); fx.banner('🤝 Chốt kèo!', 'green'); await sleep(500 * k()); break;
    case 'bankrupt': fx.sfx.bankrupt(); fx.banner(`💀 ${nm(v, e.pid)} phá sản!`, 'red sm'); B.shake(0.3); await sleep(1000 * k()); break;
  }
}
// cập nhật tạm 1 ô trên bàn 3D giữa chuỗi hoạt ảnh (để cờ/nhà hiện đúng lúc)
function partialProp(i, pr, v) {
  if (!shown) return;
  const tmp = { ...shown, players: v.players, props: { ...shown.props, [i]: pr } }; tmp.rents = rentsFor(tmp);
  B.sync(tmp); shown = { ...shown, props: tmp.props, rents: tmp.rents };
}
async function moveAnim(e) {
  const id = e.pid; B.follow(id);
  if (e.from !== e.to && !(markKind === 'move' && B.tgt && B.tgt.i === e.to)) setMark('move', e.to, (e.kind === 'jail' ? '🚔 ' : e.kind === 'fly' ? '✈️ ' : '📍 ') + tileName(e.to), e.kind === 'jail' ? '#ff8a80' : e.kind === 'fly' ? '#5ec8ff' : '#ffd54a');
  if (e.kind === 'jail') { clearMark('move', 1400 * k()); }
  if (e.kind === 'jail') { fx.sfx.jail(); B.sirens(2400); fx.banner('🚔 Vào tù!', 'red'); await B.fly(id, 10, 950 * k()); return; }
  if (e.kind === 'fly' || (!e.steps && e.from !== e.to)) { fx.sfx.hop(); await B.fly(id, e.to, 900 * k()); return; }
  if (!e.steps) return;
  const n = Math.abs(e.steps), dir = e.steps < 0 || e.kind === 'back' ? -1 : 1, path = [];
  for (let s = 1; s <= n; s++) path.push(((e.from + dir * s) % 40 + 40) % 40);
  const ms = (n <= 12 ? 230 : Math.max(55, 1100 / n)) * k();
  await B.walk(id, path, ms, i => { fx.sfx.hop(); if (i === 0) B.floatAt(0, '🏁', '#e53935'); });
}
function showCard(e, v) {
  return new Promise(res => {
    fx.sfx.card(); B.drawCard(e.deck);
    setTimeout(() => {
      const ov = $('#card-ov'), flip = $('#flip'), chest = e.deck === 'chest';
      $('#flip-back').className = 'face back' + (chest ? ' chest' : ''); $('#flip-back').textContent = chest ? 'KHÍ VẬN' : 'CƠ HỘI';
      $('#flip-front').className = 'face front' + (chest ? ' chest' : '');
      $('#flip-front').innerHTML = `<span class="dk">${chest ? 'KHÍ VẬN' : 'CƠ HỘI'}</span><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p><small class="who">${esc(nm(v, e.pid))}</small>`;
      const nf = flip.cloneNode(true); flip.replaceWith(nf);
      ov.classList.add('open');
      let done = false; const fin = () => { if (done) return; done = true; ov.classList.remove('open'); ov.onclick = null; res(); };
      ov.onclick = () => { if (Date.now() - t0 > 700) fin(); }; const t0 = Date.now();
      setTimeout(fin, Math.max(2200, 3100 * k()));
    }, 450 * k());
  });
}
// ---------- nút đổ giữa màn hình (giữ để lấy đà, kiểu ZingPlay) + xúc xắc lăn giữa màn hình ----------
let rollPower = null, hold = null;
function fabEl() {
  let f = $('#rollfab'); if (f) return f;
  f = document.createElement('button'); f.id = 'rollfab'; f.type = 'button'; f.hidden = true; f.setAttribute('aria-label', 'Giữ để đổ xúc xắc');
  f.innerHTML = '<span class="ring"></span><span class="ic">🎲</span><b class="tx">GIỮ ĐỂ ĐỔ</b><i class="pw">Lực 0%</i>';
  $('#game3d').appendChild(f);
  const start = e => { if (f.hidden || hold || busy) return; e.preventDefault(); try { f.setPointerCapture && e.pointerId != null && f.setPointerCapture(e.pointerId); } catch (_) {}
    hold = { t0: performance.now(), p: 0 }; f.classList.add('hold'); fx.sfx.click();
    const tick = () => { if (!hold) return; const t = (performance.now() - hold.t0) / 1000; hold.p = (1 - Math.cos(t * Math.PI * 2 / 1.3)) / 2; f.style.setProperty('--p', hold.p.toFixed(3)); f.querySelector('.pw').textContent = `Lực ${Math.round(hold.p * 100)}%`; hold.raf = requestAnimationFrame(tick); };
    tick(); };
  const end = e => { if (!hold) return; const h = hold; hold = null; cancelAnimationFrame(h.raf); f.classList.remove('hold');
    if (e && e.type === 'pointercancel') { f.style.setProperty('--p', 0); return; }
    const quick = performance.now() - h.t0 < 180; rollPower = quick ? 0.35 + Math.random() * 0.4 : h.p;
    const v = shown; if (!v || v.stage !== 'roll' || !isMine(v.actor)) return;
    f.hidden = true; send(v.actor, { type: 'roll' }); };
  f.addEventListener('pointerdown', start); f.addEventListener('pointerup', end); f.addEventListener('pointercancel', end); f.addEventListener('lostpointercapture', e => { if (hold) end(e); });
  f.addEventListener('contextmenu', e => e.preventDefault());
  f.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
  f.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') end(e); });
  return f;
}
function updateFab(v) {
  const f = fabEl(), show = !!v && v.phase === 'playing' && v.stage === 'roll' && isMine(v.actor) && !busy;
  if (!show && hold) { cancelAnimationFrame(hold.raf); hold = null; f.classList.remove('hold'); }
  f.hidden = !show; if (!show) return;
  const A = P(v, v.actor); f.classList.toggle('jail', !!A.inJail);
  f.querySelector('.tx').textContent = A.inJail ? 'ĐỔ ĐÔI ĐỂ RA' : v.again ? 'ĐỔ TIẾP!' : 'GIỮ ĐỂ ĐỔ';
  if (!hold) { f.style.setProperty('--p', 0); f.querySelector('.pw').textContent = multiLocal(v) ? esc(A.name) : 'Giữ rồi thả'; }
}
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const faceHTML = n => `<div class="df">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => `<i${PIPS[n].includes(c) ? ' class="on"' : ''}></i>`).join('')}</div>`;
// mặt n hướng ra người xem: góc xoay của khối
const FACE_ROT = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
function centerDice(d, power = 0.5, dest = null, onReveal = null) {
  let ov = $('#dice-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'dice-ov'; ov.setAttribute('aria-hidden', 'true'); $('#game3d').appendChild(ov); }
  const cube = () => `<div class="dc"><div class="dcube">${[1, 6, 2, 5, 3, 4].map((n, k) => `<div class="fc f${k}">${faceHTML(n)}</div>`).join('')}</div></div>`;
  ov.innerHTML = `<div class="dbox">${cube()}${cube()}</div><div class="dsum"></div>`; ov.className = 'show';
  const ms = Math.round((750 + power * 650) * k()), spins = 2 + Math.round(power * 3);
  [...ov.querySelectorAll('.dcube')].forEach((c, i) => {
    const [rx, ry] = FACE_ROT[d[i]], X = rx + 360 * (spins + i), Y = ry + 360 * (spins + 1 - i) * (i ? -1 : 1);
    c.style.transition = 'none'; c.style.transform = `rotateX(${(Math.random() * 360) | 0}deg) rotateY(${(Math.random() * 360) | 0}deg)`;
    c.parentNode.style.setProperty('--ms', ms + 'ms'); c.parentNode.style.setProperty('--h', (40 + power * 70).toFixed(0) + 'px');
    requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transition = `transform ${ms}ms cubic-bezier(.15,.7,.25,1)`; c.style.transform = `rotateX(${X}deg) rotateY(${Y}deg)`; c.parentNode.classList.add('go'); }));
  });
  return sleep(ms + 60).then(() => {
    ov.querySelector('.dsum').innerHTML = `${d[0]} + ${d[1]} = <b>${d[0] + d[1]}</b>${d[0] === d[1] ? ' <em>ĐÔI!</em>' : ''}${dest != null ? `<span class="dto">→ 📍 ${esc(tileName(dest))}</span>` : ''}`; ov.classList.add('done');
    if (onReveal) try { onReveal(); } catch (err) { console.error(err); }
    setTimeout(() => { if (ov.classList.contains('done')) ov.className = ''; }, Math.round(900 * k()));
    return sleep(Math.round(380 * k()));
  });
}
function setDice(d) { const el = $('#panel .dice-r'); if (el) el.textContent = `🎲 ${d[0]} + ${d[1]}`; }
const pcEl = id => $(`.pc[data-id="${CSS.escape(id || '')}"]`);
function flashPc(id) { const el = pcEl(id); if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

// ---------- thanh trên + người chơi ----------
function renderTop() {
  const v = shown;
  // nhạc: đang chơi / gay cấn (có người mắc nợ, sắp phá sản hoặc vòng cuối) / hết ván
  fx.musicMood(v.phase === 'over' ? 'lobby' : v.stage === 'debt' || v.debt || v.players.some(p => !p.out && p.cash < 0) || (v.opts.maxRounds && v.round >= v.opts.maxRounds) ? 'tense' : 'game');
  $('#round-tag').textContent = `Vòng ${v.round}${v.opts.maxRounds ? '/' + v.opts.maxRounds : ''}`;
}
setInterval(() => {
  const el = $('#timer'); const v = shown;
  if (!v || v.phase !== 'playing' || !deadlineAt) { el.hidden = true; return; }
  const s = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
  el.hidden = false; el.innerHTML = `⏳ <span class="tn">${esc(isMine(v.actor) && !multiLocal(v) ? 'Bạn' : nm(v, v.actor))} · </span>${s}s`;
  el.classList.toggle('low', s <= 10);
  if (s <= 5 && s > 0 && isMine(v.actor) && s !== el._last) { el._last = s; fx.sfx.tick(); }
}, 250);
function renderPlayers() {
  const v = shown, n = v.players.length, el = $('#players');
  el.style.setProperty('--cols', n <= 3 ? n : n === 4 ? 4 : 3);
  el.innerHTML = v.players.map(p => {
    const st = [p.inJail ? '⛓️' : '', p.cards.length ? '🗝️' : '', (v.away || []).includes(p.id) ? '📴' : '', p.isBot ? '🤖' : ''].join('');
    return `<div class="pc ${p.id === cur(v).id && v.phase === 'playing' ? 'turn' : ''} ${p.out ? 'out' : ''}" data-id="${esc(p.id)}" style="--pc:${p.color}" ${fnAttr('panel', () => openPlayer(p.id))}>
      <img src="${pic(p.avatar, 72)}" alt=""><div class="tx"><div class="nm">${esc(p.name.replace(' 🤖', ''))}</div><div class="cs">${p.out ? 'Phá sản' : money(p.cash)}</div><div class="wo">💎 ${money(v.worth[p.id] || 0)} · 🏠 ${tilesOf(v, p.id).length}</div></div>${st ? `<span class="st">${st}</span>` : ''}</div>`;
  }).join('');
}
function renderLog() { if (logOpen) $('#log-list').innerHTML = shown.log.slice().reverse().map(l => `<li>${esc(l)}</li>`).join(''); }
$('#btn-log').onclick = () => { logOpen = !logOpen; $('#log').classList.toggle('open', logOpen); if (shown) renderLog(); };
$('#btn-log-close').onclick = () => { logOpen = false; $('#log').classList.remove('open'); };
$('#btn-home-cam').onclick = () => { fx.sfx.click(); B && B.home(); };
$('#btn-overview').onclick = () => { fx.sfx.click(); if (!B) return; B.cam.map ? B.home() : B.overview(); };

// ---------- bảng hành động ----------
function send(pid, a) {
  if (busy || !net) return;
  busy = true; $('#panel').classList.add('busy');
  if (isHost) net.act(pid, a); else net.act(a);
  setTimeout(function chk() { if (!busy) return; if (pumping || queue.length) return setTimeout(chk, 1000); busy = false; renderPanel(); }, 5000);
}
const mini = i => { const t = TILES[i]; return `<div class="mini"><i style="--gc:${gColor(i)}"></i><div><b>${esc(t.name)}</b>${t.area ? ` <span class="sub">· ${esc(t.area)}</span>` : ''}<br><span class="sub">Giá ${money(t.price)}${t.type === 'city' ? ` · thuê ${money(t.rent[0])}→${money(t.rent[5])}` : ''}</span></div>${btnInfo(i)}</div>`; };
const btnInfo = i => `<button class="chip sm" style="margin-left:auto" ${fnAttr('panel', () => openTile(i))}>ℹ️ Chi tiết</button>`;
function renderPanel() {
  const v = shown, el = $('#panel'); if (!v) return;
  fns.panel = []; renderPlayers();
  const lines = [], btns = [];
  const head = (pid, text) => `<div class="line"><img src="${pic(P(v, pid).avatar, 56)}" alt=""><span>${text}</span><span class="dice-r">🎲 ${v.dice[0]} + ${v.dice[1]}</span></div>`;
  if (v.phase === 'over') {
    const w = P(v, v.winner);
    lines.push(head(v.winner, `🏆 <b>${esc(w ? w.name : '?')}</b> thắng ván này!`));
    btns.push(btn('panel', '🏆 Xem kết quả', () => showWin(v), 'gold main'));
    if (isHost) btns.push(btn('panel', '🔁 Ván mới', () => net.restart(), 'pri'));
    el.innerHTML = lines.join('') + `<div class="btns">${btns.join('')}</div>`; return;
  }
  const actor = v.actor, A = P(v, actor), mine = isMine(actor), who = youOr(v, actor), me = mine ? actor : null;
  // nút xây nhà phải dễ thấy: có ô xây được thì nút sáng màu + số ô; đứng trên đất của mình thì có nút xây ngay tại chỗ
  const buildable = pid => pid ? tilesOf(v, pid).filter(i => canBuild(v, pid, i)) : [];
  const tools = pid => { const n = buildable(pid).length;
    return [btn('panel', n ? `🏠<span class="lbl"> Xây nhà</span> (${n})` : '🏗️<span class="lbl"> Tài sản</span>', () => openManage(pid), (n ? 'green sm' : 'ghost sm') + ' tool', false, 'Xây nhà, bán nhà, thế chấp, chuộc đất'), btn('panel', '🤝<span class="lbl"> Giao dịch</span>', () => openTrade(pid), 'ghost sm tool', v.trades >= MAX_TRADES, 'Giao dịch')]; };
  const buildHere = pid => { const i = A.pos; if (!pid || TILES[i].type !== 'city' || !canBuild(v, pid, i)) return null; const pr = v.props[i];
    if (v.opts.freeBuild === 'zing') return btn('panel', `${pr.h === 4 ? '🏛️ Landmark' : '🏠 Xây'} tại đây…`, () => openBuildAsk(pid, i), 'gold', false, 'Xây mấy nhà ở ' + TILES[i].name);
    return btn('panel', `${pr.h === 4 ? '🏛️ Landmark' : '🏠 Xây'} tại đây −${money(houseCost(i))}`, () => send(pid, { type: 'build', tile: i }), 'gold', false, 'Xây ở ' + TILES[i].name); };
  switch (v.stage) {
    case 'roll': {
      if (!mine) { lines.push(head(actor, `⏳ <b>${who}</b> ${A.inJail ? 'đang ở tù, tính cách ra…' : 'chuẩn bị đổ xúc xắc…'}`)); break; }
      if (A.inJail) {
        lines.push(head(actor, `⛓️ <b>${who}</b> đang ở tù (lượt ${A.jailTurns + 1}/3)`));
        lines.push('<div class="sub">🎲 Giữ nút xúc xắc giữa màn hình để đổ đôi ra tù, hoặc:</div>');
        btns.push(btn('panel', `🔓 Nộp ${money(JAIL_FINE)}`, () => send(me, { type: 'payJail' }), 'gold', A.cash < JAIL_FINE));
        if (A.cards.length) btns.push(btn('panel', '🗝️ Dùng thẻ', () => send(me, { type: 'useCard' }), 'green'));
      } else {
        lines.push(head(actor, v.again ? `🎲 Đôi! <b>${who}</b> được đổ tiếp` : `🎲 Tới lượt <b>${who === 'Bạn' ? 'bạn' : who}</b>!`));
        lines.push('<div class="sub">👇 <b>Giữ</b> nút 🎲 giữa màn hình để lấy đà, <b>thả</b> ra là đổ (bấm nhanh cũng được).</div>');
      }
      btns.push(...tools(me)); break;
    }
    case 'buy': {
      const i = v.buyTile, t = TILES[i];
      const mo = v.props[i] && v.props[i].mort ? v.props[i].owner : null;
      lines.push(head(actor, mine ? (mo ? `🏦 Đất của ${esc(nm(v, mo))} đang thế chấp – <b>${who}</b> mua luôn không?` : `🏷️ <b>${who}</b> dừng ở ô trống – mua không?`) : `🤔 <b>${who}</b> đang cân nhắc mua…`), mini(i));
      if (mine) {
        btns.push(btn('panel', A.cash >= t.price ? `🏷️ Mua ${money(t.price)}` : '💸 Không đủ tiền', () => send(me, { type: 'buy' }), 'pri main', A.cash < t.price));
        btns.push(btn('panel', v.opts.auction && v.players.filter(p => !p.out).length > 1 ? '🔨 Không mua (đấu giá)' : '🙅 Không mua', () => send(me, { type: 'decline' }), 'ghost'));
      }
      break;
    }
    case 'auction': {
      const Au = v.auction, t = TILES[Au.tile];
      lines.push(head(actor, `🔨 Đấu giá · cao nhất <b>${Au.by ? money(Au.high) + ' – ' + esc(nm(v, Au.by)) : 'chưa ai trả'}</b>`), mini(Au.tile));
      if (mine) {
        const steps = [10, 50, 100].map(s => Math.max(10, Au.high + s));
        for (const amt of steps) btns.push(btn('panel', `🙋 ${money(amt)}`, () => send(me, { type: 'bid', amount: amt }), amt === steps[0] ? 'gold main' : 'gold', amt > A.cash));
        btns.push(btn('panel', '🙅 Bỏ', () => send(me, { type: 'pass' }), 'ghost'));
        lines.push(`<div class="sub">${multiLocal(v) ? esc(A.name) + ' – ' : ''}Bạn có ${money(A.cash)} · giá gốc ${money(t.price)} · còn ${Au.active.length} người</div>`);
      } else lines.push(`<div class="sub">Đang chờ ${esc(A.name)} trả giá… (còn ${Au.active.length} người)</div>`);
      break;
    }
    case 'buyback': {
      const i = v.buyback.tile, pr = v.props[i], price = buybackPrice(v, i);
      lines.push(head(actor, mine ? `💥 Mua lại <b>${esc(tileName(i))}</b> của ${esc(nm(v, pr.owner))}?` : `💥 <b>${who}</b> đang tính mua lại ${esc(tileName(i))}…`), mini(i));
      if (mine) { btns.push(btn('panel', `💥 Mua lại ${money(price)}`, () => send(me, { type: 'buyback' }), 'red main', A.cash < price)); btns.push(btn('panel', '🙅 Thôi', () => send(me, { type: 'skipBuyback' }), 'ghost')); }
      break;
    }
    case 'trade': {
      const T = v.trade;
      if (mine) {
        lines.push(head(T.from, `🤝 <b>${esc(nm(v, T.from))}</b> đề nghị giao dịch với ${who}:`));
        lines.push(`<div class="sub">${tradeSummary(v, T, actor)}</div>`, tradeWarn(v, T.from, T, actor, true));
        btns.push(btn('panel', '✅ Đồng ý', () => send(me, { type: 'accept' }), 'green main'), btn('panel', '🙅 Từ chối', () => send(me, { type: 'reject' }), 'red'), btn('panel', '🔍 Chi tiết', () => openOffer(v), 'ghost sm'));
      } else {
        lines.push(head(T.from, `🤝 <b>${youOr(v, T.from)}</b> đề nghị giao dịch với <b>${esc(nm(v, T.to))}</b>…`));
        lines.push(`<div class="sub">${tradeSummary(v, T, null)}</div>`, tradeWarn(v, T.from, T, mineIds(v).find(id => id === T.from) || null, true));
        if (isMine(T.from)) btns.push(btn('panel', '↩️ Rút lại', () => send(T.from, { type: 'cancel' }), 'ghost'));
      }
      break;
    }
    case 'travel': {
      const sel = mine && travelSel != null && !travelBad(travelSel) ? travelSel : null;
      lines.push(head(actor, !mine ? `✈️ <b>${who}</b> đang chọn nơi du lịch…` : sel != null ? `✈️ Bay tới <b>${esc(tileName(sel))}</b>? <span class="sub">(chạm ô lần nữa hoặc bấm nút để bay · chạm ô khác để đổi)</span>` : `✈️ <b>${who}</b> tới Bãi đậu xe – <b>chạm 1 ô</b> trên bàn cờ để chọn nơi du lịch!`));
      if (mine) {
        if (sel != null) btns.push(btn('panel', `✈️ Bay tới ${esc(tileName(sel))}`, () => flyTo(sel), 'pri main'), btn('panel', 'ℹ️', () => openTile(sel), 'ghost sm', false, 'Xem ô ' + TILES[sel].name));
        btns.push(btn('panel', '🗺️ Chọn ô', () => openTravel(), sel != null ? 'ghost' : 'pri main'), btn('panel', '🅿️ Ở lại', () => send(me, { type: 'stay' }), 'ghost'));
      }
      break;
    }
    case 'debt': {
      const D = v.debt;
      if (!mine) { lines.push(head(actor, `😰 <b>${who}</b> đang xoay ${money(D.amount)} để trả nợ…`)); break; }
      lines.push(head(actor, `😰 <b>${who}</b> phải trả <b>${money(D.amount)}</b> – đang có ${money(A.cash)}`));
      lines.push(`<div class="sub">Bán nhà hoặc thế chấp đất để gom đủ tiền. Hết cách thì đành phá sản.</div>`);
      const canPay = A.cash >= D.amount, plan = canPay ? null : planRaise(v, me, D.amount);
      if (plan && plan.ok) lines.push(`<div class="sub raise-pv">⚡ Tự động sẽ ${esc(raiseSummary(plan.steps))} <b>(+${money(plan.raised)})</b> rồi trả luôn.</div>`);
      else if (plan) lines.push(`<div class="sub">😵 Bán hết nhà + thế chấp hết đất vẫn thiếu – chỉ còn cách phá sản.</div>`);
      if (plan && plan.ok) btns.push(btn('panel', '⚡ Tự bán nhà/thế chấp cho đủ', () => send(me, { type: 'autoRaise' }), 'gold main'));
      btns.push(btn('panel', '💳 Trả nợ', () => send(me, { type: 'payDebt' }), canPay ? 'green main' : 'green', !canPay));
      btns.push(btn('panel', '🏗️ Tự chọn bán', () => openManage(me), canPay || (plan && plan.ok) ? 'ghost' : 'gold main'));
      btns.push(btn('panel', '💀 Phá sản', () => confirmBankrupt(me), 'red sm tiny'));
      break;
    }
    case 'end': {
      if (!mine) { lines.push(head(actor, `⏳ <b>${who}</b> đang tính toán…`)); break; }
      const nb = buildable(me).length, bh = buildHere(me);
      lines.push(head(actor, nb ? `🏠 ${who === 'Bạn' ? 'Bạn' : '<b>' + who + '</b>'} xây được nhà trên <b>${nb} ô</b> – bấm <b>${bh ? 'Xây tại đây' : 'Xây nhà'}</b>. Xong thì Kết thúc lượt.` : `✅ ${who === 'Bạn' ? 'Bạn' : '<b>' + who + '</b>'} có thể giao dịch, thế chấp… rồi Kết thúc lượt.`));
      btns.push(btn('panel', '✅ Kết thúc lượt', () => send(me, { type: 'end' }), 'pri main'));
      if (bh) btns.push(bh);
      btns.push(...tools(me)); break;
    }
    default: lines.push(head(actor, `⏳ ${who}…`));
  }
  el.innerHTML = lines.join('') + (btns.length ? `<div class="btns">${btns.join('')}</div>` : '');
  updateFab(v);
  el.classList.toggle('busy', busy);
}
function tradeSummary(v, T, viewer) {
  const side = s => [...s.tiles.map(i => `<b style="color:${gColor(i)}">${esc(tileName(i))}</b>`), s.cash ? `<b>${money(s.cash)}</b>` : '', s.cards ? `${s.cards} 🗝️` : ''].filter(Boolean).join(', ') || 'không gì';
  if (viewer === T.to) return `Bạn nhận: ${side(T.give)} · Bạn đưa: ${side(T.get)}`;
  return `${esc(nm(v, T.from))} đưa: ${side(T.give)} · đổi lấy: ${side(T.get)}`;
}
function confirmBankrupt(pid) {
  openModal(`<h2>💀 Tuyên bố phá sản?</h2><p style="text-align:center">Toàn bộ tài sản sẽ về tay chủ nợ và bạn rời cuộc chơi.</p>
    <div class="mbtns"><button class="btn ghost" data-close>Để xoay tiếp</button>${btn('modal', 'Phá sản', () => { closeModal(); send(pid, { type: 'bankrupt' }); }, 'red')}</div>`);
}

// ---------- thông tin ô ----------
const statusOf = (v, i) => { const pr = v.props[i]; if (!pr) return ''; return pr.mort ? '🏦 thế chấp' : pr.h === 5 ? '🏛️ Landmark' : pr.h ? `🏠×${pr.h}` : ''; };
function manageBtns(v, pid, i, scope = 'modal') {
  const st = v.stage, ok1 = ['roll', 'end'].includes(st), ok2 = ['roll', 'end', 'debt'].includes(st), pr = v.props[i], out = [];
  if (!pr || pr.owner !== pid || v.actor !== pid || cur(v).id !== pid) return '';
  if (TILES[i].type === 'city' && ok1 && pr.h < 5 && !(v.opts.freeBuild === 'zing' && v.landed !== i)) { const why = buildBlock(v, pid, i); out.push(btn(scope, pr.h === 4 ? `🏛️ Landmark -${money(houseCost(i))}` : `🏠 Xây -${money(houseCost(i))}`, () => send(pid, { type: 'build', tile: i }), 'green sm', !!why)); if (why) out.push(`<small class="why">⚠️ ${esc(why)}</small>`); }
  if (ok2 && canSell(v, pid, i)) out.push(btn(scope, `🔨 Bán nhà +${money(Math.floor(houseCost(i) / 2))}`, () => send(pid, { type: 'sell', tile: i }), 'gold sm'));
  if (ok2 && canMortgage(v, pid, i)) out.push(btn(scope, `🏦 Thế chấp +${money(mortgageValue(i))}`, () => send(pid, { type: 'mortgage', tile: i }), 'ghost sm'));
  if (ok1 && pr.mort) out.push(btn(scope, `🔑 Chuộc -${money(unmortgageCost(i))}`, () => send(pid, { type: 'unmortgage', tile: i }), 'blue sm', !canUnmortgage(v, pid, i)));
  return out.join('');
}
function openTile(i, refresh = false) {
  const v = shown, t = TILES[i]; if (!t) return;
  const pr = v && v.props[i], owner = pr && P(v, pr.owner);
  let body = '';
  if (t.type === 'city') {
    const full = v && pr && ownsGroup(v, pr.owner, t.group), h = pr ? pr.h : -1;
    const rows = [['Đất trống', t.rent[0], pr && h === 0 && !full], ['Đủ nhóm màu (×2)', t.rent[0] * 2, pr && h === 0 && full], ...[1, 2, 3, 4].map(n => [`${n} nhà`, t.rent[n], h === n]), ['🏛️ Landmark', t.rent[5], h === 5]];
    body = `<table>${rows.map(([a, b, c]) => `<tr class="${c ? 'cur' : ''}"><td>${a}</td><td>${money(b)}</td></tr>`).join('')}
      <tr><td>Giá mỗi nhà / Landmark</td><td>${money(houseCost(i))}</td></tr><tr><td>Thế chấp được</td><td>${money(mortgageValue(i))}</td></tr><tr><td>Chuộc lại</td><td>${money(unmortgageCost(i))}</td></tr>
      ${pr && pr.mort ? `<tr><td>🏦 Đang thế chấp – ai dừng cũng mua được</td><td>${money(t.price)}</td></tr>` : pr && pr.h < 5 && v.opts.buyback ? `<tr><td>💥 Giá mua lại</td><td>${money(buybackPrice(v, i))}</td></tr>` : ''}</table>`;
  } else if (t.type === 'station') {
    const n = pr ? Object.keys(v.props).filter(j => TILES[j].type === 'station' && v.props[j].owner === pr.owner).length : 0;
    body = `<table>${STATION_RENT.map((r, k) => `<tr class="${n === k + 1 ? 'cur' : ''}"><td>Chủ có ${k + 1} bến xe</td><td>${money(r)}</td></tr>`).join('')}<tr><td>Thế chấp được</td><td>${money(mortgageValue(i))}</td></tr></table>`;
  } else if (t.type === 'utility') {
    body = `<table><tr><td>Chủ có 1 công ty</td><td>4 × xúc xắc</td></tr><tr><td>Chủ có cả Điện lực + Cấp nước</td><td>10 × xúc xắc</td></tr><tr><td>Thế chấp được</td><td>${money(mortgageValue(i))}</td></tr></table>`;
  } else {
    const D = { start: 'Đi qua hoặc dừng ở đây nhận 200K.', jail: 'Đứng đây bình thường chỉ là ghé thăm. Người bị bắt vào tù ở ô này tối đa 3 lượt.', parking: 'Dừng ở đây được DU LỊCH: chọn 1 ô bất kỳ (trừ Vào tù) để bay tới ngay; bay ngược qua Bắt đầu vẫn nhận 200K. Muốn thì ở lại nghỉ cũng được.', gotojail: 'Dừng ở đây là đi thẳng vào tù, không qua Bắt đầu, không nhận 200K.', chance: 'Rút 1 thẻ Cơ hội và làm theo.', chest: 'Rút 1 thẻ Khí vận và làm theo.', tax: `Dừng ở đây đóng ${money(t.amount || 0)} cho ngân hàng.` };
    body = `<p style="padding:12px 14px;margin:0;font-weight:600">${D[t.type] || ''}</p>`;
  }
  const here = v ? v.players.filter(p => !p.out && p.pos === i) : [];
  const ownRow = isProp(i) ? `<div class="own">${owner ? `<img src="${pic(owner.avatar, 60)}" alt="">Chủ: ${esc(owner.name)} ${statusOf(v, i)}` : '🏦 Chưa có chủ – giá ' + money(t.price)}</div>` : '';
  const actPid = v && mineIds(v).find(id => pr && pr.owner === id);
  const mb = v && actPid ? manageBtns(v, actPid, i) : '';
  const html = `<button class="close-x" data-close aria-label="Đóng">✕</button><div class="deed" style="--gc:${gColor(i)}"><div class="hd"><small>${t.type === 'city' ? 'Nhóm ' + GROUPS[t.group].name : t.type === 'station' ? 'Bến xe' : t.type === 'utility' ? 'Công ty' : 'Ô đặc biệt'}</small><b>${esc(t.name)}</b>${t.area ? `<small>${esc(t.area)}</small>` : ''}</div>${ownRow}${body}
    ${here.length ? `<div class="own">Đang đứng: ${here.map(p => `<img src="${pic(p.avatar, 60)}" alt="" title="${esc(p.name)}">`).join('')}</div>` : ''}</div>${mb ? `<div class="mbtns">${mb}</div>` : ''}`;
  const fly = myTravel() && travelOk(i) && i !== P(v, v.actor).pos ? `<div class="mbtns">${btn('modal', '✈️ Bay tới đây', () => { closeModal(); flyTo(i); }, 'pri main')}</div>` : '';
  if (refresh) { setModal(html + fly); } else openModal(html + fly, '', 'tile:' + i);
  B && B.pick([i]);
}
function openPlayer(id) {
  const v = shown, p = v && P(v, id); if (!p) return;
  const own = tilesOf(v, id).sort((a, b) => a - b);
  const html = `<button class="close-x" data-close aria-label="Đóng">✕</button><div class="win" style="margin-bottom:6px"><img src="${pic(p.avatar, 160)}" alt=""><h2 style="margin:4px 0 0">${esc(p.name)}</h2>
    <div class="sub">💵 ${money(p.cash)} · 💎 tài sản ${money(v.worth[id] || 0)}${p.cards.length ? ` · 🗝️ ${p.cards.length} thẻ ra tù` : ''}${p.inJail ? ' · ⛓️ đang ở tù' : ''}${p.out ? ' · 💀 phá sản' : ''}</div></div>
    <div class="mg">${own.length ? own.map(i => `<div class="row" style="border-left:6px solid ${gColor(i)};padding-left:8px"><span class="nm" ${fnAttr('modal', () => openTile(i))}>${esc(tileName(i))} <small>${statusOf(v, i)}</small></span><small>${money(TILES[i].price)}</small></div>`).join('') : '<p class="note" style="text-align:center">Chưa có miếng đất nào.</p>'}</div>`;
  if (modalKey === 'player:' + id) { setModal(html); } else openModal(html, '', 'player:' + id);
}

// ---------- quản lý tài sản ----------
let manageFor = null;
function openManage(pid) { manageFor = pid; openModal('', 'wide', 'manage'); renderManage(); }
function renderManage() {
  const v = shown, pid = manageFor, p = v && P(v, pid); if (!p) return closeModal();
  fns.modal = [];
  const own = tilesOf(v, pid);
  const groups = [...GROUP_LIST.map(g => ({ name: 'Nhóm ' + g.name, color: g.color, tiles: g.tiles, full: ownsGroup(v, pid, g.id) })),
    { name: 'Bến xe', color: '#24314d', tiles: TILES.map((t, i) => t.type === 'station' ? i : -1).filter(i => i >= 0) },
    { name: 'Công ty', color: '#1e88e5', tiles: TILES.map((t, i) => t.type === 'utility' ? i : -1).filter(i => i >= 0) }]
    .map(g => ({ ...g, mine: g.tiles.filter(i => own.includes(i)) })).filter(g => g.mine.length);
  const plan = v.stage === 'debt' && v.actor === pid && p.cash < v.debt.amount ? planRaise(v, pid, v.debt.amount) : null;
  const debt = v.stage === 'debt' && v.actor === pid ? `<p class="sub" style="text-align:center">Cần trả <b>${money(v.debt.amount)}</b> · đang có <b>${money(p.cash)}</b></p>${plan && plan.ok ? `<div class="mbtns">${btn('modal', '⚡ Tự bán nhà/thế chấp cho đủ', () => { closeModal(); send(pid, { type: 'autoRaise' }); }, 'gold main')}</div>` : ''}` : '';
  setModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>🏗️ Tài sản của ${esc(p.name)}</h2><p class="sub" style="text-align:center;margin:-4px 0 4px">Xây nhà · bán nhà · thế chấp · chuộc đất</p>
    <p style="text-align:center;margin:0">💵 <b>${money(p.cash)}</b> tiền mặt</p>${debt}
    ${groups.length ? `<div class="mg">${groups.map(g => `<div class="grp"><h5 style="--gc:${g.color}"><i></i>${g.name}${g.full ? ' ✅ đủ nhóm' : ` (${g.mine.length}/${g.tiles.length})`}</h5>
      ${g.mine.map(i => `<div class="row"><span class="nm" ${fnAttr('modal', () => openTile(i))}>${esc(tileName(i))} <small>${statusOf(v, i) || money(TILES[i].price)}</small></span>${manageBtns(v, pid, i)}</div>`).join('')}</div>`).join('')}</div>`
      : '<p class="note" style="text-align:center">Bạn chưa có miếng đất nào.</p>'}
    <p class="note">${v.opts.freeBuild === 'zing' ? 'Luật ZingPlay thật: chỉ xây được ở ô vừa dừng trong lượt này (không cần đủ bộ, không bắt xây đều)' : (v.opts.freeBuild === false ? 'Xây nhà cần đủ nhóm màu' : 'Đất của mình là xây được, không cần đủ nhóm màu') + '; đủ nhóm thì phải xây đều tay'}. 4 nhà rồi mới lên Landmark. Bán nhà được nửa giá. Thế chấp nhận nửa giá, chuộc lại +10%. Chỉ thao tác được trong lượt của mình.</p>`);
}

// ---------- giao dịch ----------
function openTrade(pid) {
  const v = shown, others = v.players.filter(p => !p.out && p.id !== pid);
  if (!others.length) return toast('Không còn ai để giao dịch.');
  const st = { to: others[0].id, give: { cash: 0, tiles: [], cards: 0 }, get: { cash: 0, tiles: [], cards: 0 } };
  const draw = () => {
    const v = shown; if (!v || !['roll', 'end'].includes(v.stage) || v.actor !== pid) return closeModal();
    fns.modal = [];
    const me = P(v, pid), them = P(v, st.to);
    const list = (owner, side) => {
      const ts = tilesOf(v, owner).sort((a, b) => a - b);
      return ts.length ? ts.map(i => { const ok = tradable(v, owner, i), on = st[side].tiles.includes(i);
        return `<label style="--gc:${gColor(i)}"><input type="checkbox" data-side="${side}" data-tile="${i}" ${on ? 'checked' : ''} ${ok ? '' : 'disabled'}><i></i>${esc(tileName(i))} <small class="sub">${v.props[i].mort ? '🏦' : ''}${ok ? money(TILES[i].price) : 'có nhà'}</small></label>`; }).join('') : '<p class="note">Không có đất.</p>';
    };
    const t = { to: st.to, give: st.give, get: st.get }, err = tradeError(v, pid, t);
    setModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>🤝 Giao dịch</h2>
      <div class="tr-who">${others.map(o => `<button class="${o.id === st.to ? 'on' : ''}" ${fnAttr('modal', () => { st.to = o.id; st.get = { cash: 0, tiles: [], cards: 0 }; draw(); })}><img src="${pic(o.avatar, 60)}" alt="">${esc(o.name)}</button>`).join('')}</div>
      <div class="tr-cols">
        <div class="tr-col"><h4>${multiLocal(v) ? esc(me.name) + ' đưa' : 'Bạn đưa'} <small class="sub">(có ${money(me.cash)})</small></h4>${list(pid, 'give')}
          <label>💵 Tiền <input class="inp" type="number" min="0" step="10" max="${me.cash}" value="${st.give.cash || ''}" data-cash="give" placeholder="0"></label>
          ${me.cards.length ? `<label>🗝️ Thẻ ra tù <input class="inp" type="number" min="0" max="${me.cards.length}" value="${st.give.cards || ''}" data-cards="give" placeholder="0"></label>` : ''}</div>
        <div class="tr-col"><h4>${esc(them.name)} đưa <small class="sub">(có ${money(them.cash)})</small></h4>${list(st.to, 'get')}
          <label>💵 Tiền <input class="inp" type="number" min="0" step="10" max="${them.cash}" value="${st.get.cash || ''}" data-cash="get" placeholder="0"></label>
          ${them.cards.length ? `<label>🗝️ Thẻ ra tù <input class="inp" type="number" min="0" max="${them.cards.length}" value="${st.get.cards || ''}" data-cards="get" placeholder="0"></label>` : ''}</div>
      </div>
      ${tradeValues(v, t, pid)}${tradeWarn(v, pid, t, pid)}
      <p class="sub" id="tr-err" style="text-align:center;color:#c62828;min-height:20px;margin:8px 0 0">${err && err !== 'Giao dịch trống' ? esc(err) : ''}</p>
      <div class="mbtns"><button class="btn ghost" data-close>Huỷ</button>${btn('modal', `📨 Gửi đề nghị · còn ${MAX_TRADES - v.trades} lần`, () => { closeModal(); send(pid, { type: 'trade', ...t }); }, 'pri', !!err || v.trades >= MAX_TRADES)}</div>`);
    $$('#modal-box [data-tile]').forEach(c => c.onchange = () => { const s = st[c.dataset.side], i = +c.dataset.tile; s.tiles = c.checked ? [...s.tiles, i] : s.tiles.filter(x => x !== i); draw(); });
    $$('#modal-box [data-cash]').forEach(c => c.onchange = () => { st[c.dataset.cash].cash = Math.max(0, Math.floor(+c.value || 0)); draw(); });
    $$('#modal-box [data-cards]').forEach(c => c.onchange = () => { st[c.dataset.cards].cards = Math.max(0, Math.floor(+c.value || 0)); draw(); });
  };
  openModal('', 'wide', 'trade'); draw();
}
function openOffer(v) {
  const T = v.trade; if (!T) return;
  const side = s => `${s.tiles.map(i => `<div class="row" style="border-left:6px solid ${gColor(i)};padding-left:8px"><span class="nm" ${fnAttr('modal', () => openTile(i))}>${esc(tileName(i))} <small>${statusOf(v, i) || money(TILES[i].price)}</small></span></div>`).join('')}
    ${s.cash ? `<div class="row">💵 <b>${money(s.cash)}</b></div>` : ''}${s.cards ? `<div class="row">🗝️ ${s.cards} thẻ ra tù</div>` : ''}${!s.tiles.length && !s.cash && !s.cards ? '<div class="row sub">Không gì</div>' : ''}`;
  const me = T.to;
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>🤝 Lời đề nghị từ ${esc(nm(v, T.from))}</h2>
    <div class="tr-cols"><div class="tr-col"><h4>Bạn nhận</h4><div class="mg">${side(T.give)}</div></div><div class="tr-col"><h4>Bạn đưa</h4><div class="mg">${side(T.get)}</div></div></div>
    ${tradeValues(v, T, me, true)}${tradeWarn(v, T.from, T, me)}
    <div class="mbtns">${btn('modal', '✅ Đồng ý', () => { closeModal(); send(me, { type: 'accept' }); }, 'green')}${btn('modal', '🙅 Từ chối', () => { closeModal(); send(me, { type: 'reject' }); }, 'red')}</div>`, 'wide', 'offer');
}

// tổng giá trị mỗi bên + chênh lệch (asReceiver: người xem là người NHẬN lời đề nghị)
// bảng tính lời/lỗ + cảnh báo kèo chỉ có khi chơi với bot: phòng có ≥ 2 người thật (online hoặc cùng máy) thì ẩn
const adviceOk = () => hintsAllowed(lobby || (shown && shown.players));
function tradeValues(v, t, viewer, asReceiver = false) {
  const empty = x => !x.cash && !x.tiles.length && !x.cards;
  if (empty(t.give) && empty(t.get)) return '';
  if (!adviceOk()) return `<p class="note tr-note">⚖️ Bảng tính lời/lỗ của kèo: ${BOT_ONLY_NOTE}.</p>`;
  const vGive = tradeSideValue(v, t.give), vGet = tradeSideValue(v, t.get);
  const out = asReceiver ? vGet : vGive, inn = asReceiver ? vGive : vGet, d = inn - out;
  const you = multiLocal(v) && viewer ? esc(nm(v, viewer)) : 'Bạn';
  return `<div class="tr-val"><div><small>${you} đưa</small><b>${money(out)}</b></div>
    <div class="df ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? `▲ Lời ${money(d)}` : d < 0 ? `▼ Bù ${money(-d)}` : '⚖️ Ngang giá'}</div>
    <div><small>${you} nhận</small><b>${money(inn)}</b></div></div>
    <p class="note tr-note">Giá trị = tiền + giá đất + nhà (đất thế chấp tính nửa giá, thẻ ra tù ${money(JAIL_FINE)}).</p>`;
}
// cảnh báo nổi bật: kèo giúp ai gom đủ bộ màu / đủ 4 bến xe / thắng ngay / sắp thắng
function tradeWarn(v, from, t, viewer, compact = false) {
  if (!adviceOk()) return '';
  let imp; try { imp = tradeImpact(v, from, t); } catch (e) { return ''; }
  const who = pid => viewer && pid === viewer && !multiLocal(v) ? 'bạn' : esc(nm(v, pid));
  const msgs = [];
  for (const x of imp) {
    if (x.win) { msgs.push({ lv: 3, h: `🏆 Kèo này giúp <b>${who(x.pid)}</b> THẮNG NGAY (${x.win === 'groups' ? 'trọn 3 nhóm màu' : 'đủ 4 bến xe'})!` }); continue; }
    if (x.newGroups.length) msgs.push({ lv: 2, h: `⚠️ Kèo này giúp <b>${who(x.pid)}</b> gom đủ bộ màu ${x.newGroups.map(g => `<span class="gchip" style="--gc:${GROUPS[g].color}">${esc(GROUPS[g].name)}</span>`).join(' ')}` });
    if (x.allStations) msgs.push({ lv: 2, h: `⚠️ Kèo này giúp <b>${who(x.pid)}</b> gom đủ 4 bến xe 🚌` });
    if (x.near) msgs.push({ lv: 2, h: `🔥 <b>${who(x.pid).replace(/^b/, 'B')}</b> sắp thắng: ${x.groups >= 2 ? 'có 2 nhóm màu, thêm 1 nhóm nữa là thắng' : 'có 3/4 bến xe, thêm 1 bến nữa là thắng'}` });
  }
  if (!msgs.length) return '';
  msgs.sort((a, b) => b.lv - a.lv);
  const list = compact ? msgs.slice(0, 1) : msgs;
  return `<div class="tr-warn${compact ? ' sm' : ''}">${list.map(m => `<div class="${m.lv === 3 ? 'win' : ''}">${m.h}</div>`).join('')}</div>`;
}

// ---------- luật ZingPlay thật: đứng lên đất mình thì hỏi "Xây mấy nhà?" ----------
let askFor = null, askedKey = '';
function maybeAskBuild(v) {
  if (v.phase !== 'playing' || v.opts.freeBuild !== 'zing' || v.landed == null) return;
  const pid = v.actor, i = v.landed;
  if (!isMine(pid) || cur(v).id !== pid || !['end', 'roll'].includes(v.stage) || !canBuild(v, pid, i)) return;
  const land = [...v.ev].reverse().find(e => e.t === 'land' && e.pid === pid);
  const key = `${v.round}:${v.turn}:${i}:${land ? land.n : 0}`;
  if (askedKey === key || $('#modal').classList.contains('open') || $('#card-ov').classList.contains('open')) return;
  askedKey = key; openBuildAsk(pid, i);
}
function openBuildAsk(pid, i) {
  const v = shown, t = TILES[i], pr = v && v.props[i], p = v && P(v, pid); if (!pr || !p) return;
  const c = houseCost(i), opts = [];
  const cap = (v.landH || 0) >= 4 ? 5 : 4; // Landmark chỉ ở lần dừng sau khi đã đủ 4 nhà
  for (let n = 1; pr.h + n <= cap && n * c <= p.cash; n++) opts.push(n);
  if (!opts.length) return;
  askFor = { pid, tile: i };
  const lab = n => pr.h + n === 5 ? (n > 1 ? `🏛️ ${n - 1} nhà + Landmark` : '🏛️ Landmark') : `🏠 ${n} nhà`;
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>🏗️ Xây mấy nhà?</h2>
    <div class="deed" style="--gc:${gColor(i)}"><div class="hd"><small>${multiLocal(v) ? esc(p.name) + ' · ' : ''}Bạn vừa dừng ở đất của mình</small><b>${esc(t.name)}</b></div>
    <div class="own">Đang có: ${pr.h ? (pr.h === 5 ? '🏛️ Landmark' : '🏠×' + pr.h) : 'đất trống'} · mỗi nhà ${money(c)} · bạn có ${money(p.cash)}</div></div>
    <div class="ask-grid">${opts.map(n => btn('modal', `${lab(n)}<small>−${money(n * c)} · thuê ${money(t.rent[pr.h + n])}</small>`, () => { closeModal(); send(pid, { type: 'build', tile: i, n }); }, pr.h + n === 5 ? 'gold' : 'green')).join('')}</div>
    <p class="note" style="text-align:center">Luật ZingPlay thật: chỉ xây được ở ô vừa dừng. Có sẵn 4 nhà thì lần dừng sau mới lên được 🏛️ Landmark.</p>
    <div class="mbtns"><button class="btn ghost" data-close>Thôi, để sau</button></div>`, '', 'ask');
}

// ---------- tóm tắt "lượt vừa rồi" của người khác ----------
let recap = { list: [], buf: null, open: false, hide: false };
function recapReset(v) { recap = { list: [], buf: v && v.phase === 'playing' ? { pid: cur(v).id, ev: [] } : null, open: false, hide: false }; renderRecap(); }
function collectRecap(evs, v) {
  for (const e of evs) {
    if (e.t === 'turn' || e.t === 'win') {
      const prev = recap.buf; flushRecap(v);
      if (prev && isMine(prev.pid) && e.t === 'turn' && !isMine(e.pid)) { recap.list = []; recap.open = false; } // mình vừa xong lượt → bắt đầu gom tóm tắt mới
      recap.buf = e.t === 'turn' ? { pid: e.pid, ev: [] } : null; continue;
    }
    if (!recap.buf) recap.buf = { pid: (shown && cur(shown).id) || e.pid, ev: [] };
    recap.buf.ev.push(e);
  }
}
function flushRecap(v) {
  const b = recap.buf; recap.buf = null;
  if (!b || isMine(b.pid) || !b.ev.length) return;
  const r = summarize(b, v); if (!r) return;
  recap.list.push(r); if (recap.list.length > 6) recap.list.shift();
  recap.hide = false;
  if (r.imp) fx.sfx.notify();
}
function summarize(b, v) {
  const me = id => isMine(id), N = id => me(id) ? (multiLocal(v) ? esc(nm(v, id)) : 'bạn') : esc(nm(v, id));
  const head = [], det = []; let imp = false, seg = null;
  const builds = {};
  for (const e of b.ev) {
    switch (e.t) {
      case 'roll': if (!e.util) { seg = `đổ ${e.d[0]}+${e.d[1]}`; head.push(seg); } det.push(`🎲 Đổ ${e.d[0]} + ${e.d[1]}${e.util ? ' (tính tiền điện nước)' : ''}`); break;
      case 'land': { const t = `→ <b>${esc(tileName(e.tile))}</b>`; if (head.length && head[head.length - 1] === seg) head[head.length - 1] = seg + ' ' + t; else head.push(t); det.push(`📍 Dừng ở ${esc(tileName(e.tile))}`); break; }
      case 'pay': {
        const why = { rent: 'tiền thuê', tax: 'thuế', jail: 'phạt ra tù', card: 'theo thẻ', gift: 'mừng' }[e.why] || '';
        const txt = e.to ? `trả ${N(e.to)} ${money(e.amt)}` : `nộp ${money(e.amt)}${why ? ' ' + why : ''}`;
        if (me(e.to) || me(e.from)) { imp = true; head.push(me(e.from) && e.from !== b.pid ? `<b>${N(e.from)}</b> mừng ${money(e.amt)}` : `<b class="hot">${txt}</b>`); }
        else if (e.amt >= 300) { imp = imp || e.why === 'rent'; head.push(txt); }
        det.push(`💸 ${e.from === b.pid ? '' : N(e.from) + ' '}${e.to ? 'trả ' + N(e.to) : 'nộp ngân hàng'} ${money(e.amt)}${why ? ' (' + why + ')' : ''}`); break;
      }
      case 'buy': head.push(`mua ${esc(tileName(e.tile))}`); det.push(`🏷️ Mua ${esc(tileName(e.tile))} giá ${money(e.amt)}`); break;
      case 'sold': if (e.pid) { const t = `${e.pid === b.pid ? '' : N(e.pid) + ' '}thắng đấu giá ${esc(tileName(e.tile))} ${money(e.amt)}`; head.push(t); det.push('🔨 ' + t); } else det.push(`🔨 Không ai mua ${esc(tileName(e.tile))}`); break;
      case 'buyback': { const mine = me(e.from); imp = imp || mine; const t = `💥 mua lại ${esc(tileName(e.tile))} của ${N(e.from)} (${money(e.amt)})`; head.push(mine ? `<b class="hot">${t}</b>` : t); det.push(t); break; }
      case 'build': builds[e.tile] = Math.max(builds[e.tile] || 0, e.h); break;
      case 'card': head.push(`rút “${esc(e.title)}”`); det.push(`${e.deck === 'chance' ? '❓ Cơ hội' : '💰 Khí vận'}: ${esc(e.title)} – ${esc(e.text)}`); break;
      case 'jail': head.push('🚔 vào tù'); det.push('🚔 Vào tù'); break;
      case 'free': det.push('🔓 Ra tù'); break;
      case 'salary': det.push(`💵 Qua Bắt đầu +${money(e.amt)}`); break;
      case 'gain': det.push(`💰 Nhận ${money(e.amt)}`); break;
      case 'mort': det.push(`🏦 Thế chấp ${esc(tileName(e.tile))} (+${money(e.amt)})`); break;
      case 'unmort': det.push(`🔑 Chuộc ${esc(tileName(e.tile))}`); break;
      case 'sell': det.push(`🔨 Bán nhà ở ${esc(tileName(e.tile))}`); break;
      case 'raise': det.push(`⚡ Tự ${esc(raiseSummary(e.steps))} (+${money(e.amt)})`); break;
      case 'traded': { const mine = me(e.from) || me(e.to); imp = imp || mine; const t = `🤝 chốt kèo với ${N(e.from === b.pid ? e.to : e.from)}`; head.push(mine ? `<b class="hot">${t}</b>` : t); det.push(t); break; }
      case 'reject': det.push(`🙅 ${N(e.to)} từ chối giao dịch`); break;
      case 'bankrupt': { imp = true; const t = `💀 ${N(e.pid)} phá sản${e.to ? ' → tài sản về ' + N(e.to) : ''}`; head.push(`<b class="hot">${t}</b>`); det.push(t); break; }
    }
  }
  for (const i in builds) { const h = builds[i], t = h === 5 ? `🏛️ lên Landmark ${esc(tileName(+i))}` : `🏠 xây tới ${h} nhà ở ${esc(tileName(+i))}`; head.push(t); det.push(t); }
  if (!head.length && !det.length) return null;
  return { pid: b.pid, head: `<b>${esc(nm(v, b.pid).replace(' 🤖', ''))}</b> ${head.slice(0, 4).join(', ')}${head.length > 4 ? '…' : ''}`, det, imp };
}
function renderRecap() {
  const el = $('#recap'); if (!el) return;
  const L = recap.list;
  if (!L.length || recap.hide || !shown) { el.hidden = true; el.innerHTML = ''; return; }
  // dòng gọn: lượt quan trọng gần nhất (dính tới bạn / phá sản / thuê lớn), không có thì lượt mới nhất
  const top = [...L].reverse().find(r => r.imp) || L[L.length - 1];
  el.hidden = false; el.classList.toggle('imp', !!top.imp); el.classList.toggle('open', recap.open);
  el.innerHTML = `<div class="rc-top"><button class="rc-main" aria-expanded="${recap.open}" title="Bấm để xem chi tiết">📣 <span>${recap.open ? `<b>Lượt vừa rồi</b> · ${L.length} lượt của người khác` : top.head}</span>${L.length > 1 && !recap.open ? `<i class="more">+${L.length - 1}</i>` : ''}<i class="car">${recap.open ? '▴' : '▾'}</i></button><button class="rc-x" aria-label="Ẩn tóm tắt">✕</button></div>
    ${recap.open ? `<div class="rc-body">${L.slice().reverse().map(r => `<div class="rc-turn ${r.imp ? 'imp' : ''}"><div class="rh">${r.head}</div><ul>${r.det.map(d => `<li>${d}</li>`).join('')}</ul></div>`).join('')}
      <button class="chip sm rc-log">📜 Nhật ký đầy đủ</button></div>` : ''}`;
  el.querySelector('.rc-main').onclick = () => { fx.sfx.click(); recap.open = !recap.open; renderRecap(); };
  el.querySelector('.rc-x').onclick = () => { fx.sfx.click(); recap.hide = true; recap.open = false; renderRecap(); };
  const lg = el.querySelector('.rc-log'); if (lg) lg.onclick = () => { recap.open = false; renderRecap(); $('#btn-log').click(); };
}

// ---------- chỉ dẫn lần đầu (bong bóng lần lượt chỉ vào từng nút) ----------
const TOUR_KEY = 'typhu-tour-v1';
let tour = null;
function maybeTour(v) {
  if (tour || ls.get(TOUR_KEY) || v.phase !== 'playing' || v.stage !== 'roll' || !isMine(v.actor) || cur(v).inJail) return;
  if ($('#modal').classList.contains('open') || $('#card-ov').classList.contains('open')) return;
  startTour();
}
function replayTour() {
  closeModal();
  if (shown && $('#screen-game').classList.contains('active')) startTour();
  else { ls.set(TOUR_KEY, ''); toast('🧭 Hướng dẫn sẽ hiện khi bạn vào ván.'); }
}
function tourTile() {
  const v = shown; if (!v || !B) return null;
  const me = mineIds(v).map(id => P(v, id)).find(p => p && !p.out); const from = me ? me.pos : 0;
  for (let k = 1; k < 40; k++) { const i = (from + k) % 40; if (TILES[i].type === 'city') return i; }
  return 1;
}
function tileRect(i) {
  if (!B || i == null) return null;
  const r = $('#game3d').getBoundingClientRect(), p = B.tileCenter(i).project(B.camera);
  if (p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) return null;
  const x = r.left + (p.x + 1) / 2 * r.width, y = r.top + (1 - p.y) / 2 * r.height;
  return { left: x - 26, top: y - 26, right: x + 26, bottom: y + 26, width: 52, height: 52 };
}
function tourSteps() {
  const v = shown, zing = v && v.opts.freeBuild === 'zing';
  const q = s => () => { const el = $(s); return el && el.offsetParent ? el.getBoundingClientRect() : null; };
  const byText = (sel, txt) => () => { const el = [...document.querySelectorAll(sel)].find(b => b.textContent.includes(txt) || (b.title || '').includes(txt)); return el && el.offsetParent ? el.getBoundingClientRect() : null; };
  const myCard = () => { const id = v && mineIds(v)[0]; const el = id && pcEl(id); return el ? el.getBoundingClientRect() : null; };
  return [
    { at: q('#rollfab'), t: '🎲 Đổ xúc xắc', d: 'Tới lượt thì <b>giữ</b> nút to này để lấy đà rồi <b>thả</b> ra (bấm nhanh cũng được). Đổ <b>đôi</b> được đổ tiếp, đôi 3 lần liền là vào tù!' },
    { at: () => tileRect(tour && tour.tile), pick: true, t: '🏙️ Ô đất & bảng giá', d: 'Bấm vào <b>ô bất kỳ</b> trên bàn để xem giá, tiền thuê, chủ đất. Dừng ở ô trống thì được mua. Kéo để xoay bàn, chụm để phóng to.' },
    { at: byText('#panel .btn', 'Xây nhà'), t: '🏠 Xây nhà', d: zing ? 'Luật <b>ZingPlay thật</b>: chỉ xây ở ô vừa dừng. Đứng lên đất mình là tự hiện hộp <b>“Xây mấy nhà?”</b>.' : 'Đất của bạn là xây được nhà. Có ô xây được thì nút này <b>sáng xanh</b> kèm số ô. 4 nhà → lên 🏛️ Landmark.' },
    { at: byText('#panel .btn', 'Giao dịch'), t: '🤝 Giao dịch', d: 'Đổi đất + tiền với người khác. Bảng giao dịch tính sẵn <b>tổng giá trị</b> mỗi bên và cảnh báo nếu kèo giúp ai gom đủ bộ.' },
    { at: myCard, t: '💵 Tài sản & thế chấp', d: 'Thẻ của bạn: tiền mặt và 💎 tổng tài sản. Hết tiền thì mở <b>🏗️ Tài sản</b> để bán nhà (nửa giá) hoặc <b>thế chấp</b> đất (chuộc lại +10%).' },
    { at: q('#panel .btn.main'), t: '✅ Kết thúc lượt', d: 'Đi xong, mua/xây xong thì nút <b>Kết thúc lượt</b> hiện đúng chỗ này – bấm để nhường lượt. Chúc bạn thành đại gia Sài Gòn! 🏙️' },
  ];
}
function startTour() {
  stopTour(false);
  const layer = document.createElement('div'); layer.id = 'tour'; layer.className = 'tour';
  layer.innerHTML = '<div class="tour-spot"></div><div class="tour-bub" role="dialog" aria-live="polite"><i class="tour-arr"></i><div class="tour-c"></div></div>';
  document.body.appendChild(layer);
  $('#cam-hint').hidden = true;
  tour = { k: 0, el: layer, steps: tourSteps(), tile: tourTile(), raf: 0 };
  drawTour();
  const loop = () => { if (!tour) return; placeTour(); tour.raf = requestAnimationFrame(loop); }; loop();
}
function drawTour() {
  const T = tour, st = T.steps[T.k], last = T.k === T.steps.length - 1;
  T.el.querySelector('.tour-c').innerHTML = `<div class="tour-h"><b>${st.t}</b><small>${T.k + 1}/${T.steps.length}</small></div><p>${st.d}</p>
    <div class="tour-b"><button class="btn ghost sm" data-tour="skip">Bỏ qua</button><button class="btn pri sm" data-tour="next">${last ? 'Xong 🎉' : 'Tiếp →'}</button></div>`;
  T.el.querySelectorAll('[data-tour]').forEach(b => b.onclick = () => { fx.sfx.click(); if (b.dataset.tour === 'skip' || last) stopTour(true); else { T.k++; drawTour(); } });
  if (B) B.pick(st.pick && T.tile != null ? [T.tile] : []);
  placeTour();
}
function placeTour() {
  const T = tour; if (!T) return;
  const st = T.steps[T.k], bub = T.el.querySelector('.tour-bub'), spot = T.el.querySelector('.tour-spot'), arr = T.el.querySelector('.tour-arr');
  let r = null; try { r = st.at(); } catch (e) {}
  if (!r || !r.width) { const pe = $('#panel'); r = pe && pe.offsetParent ? pe.getBoundingClientRect() : null; }
  const W = innerWidth, H = innerHeight, pad = 6;
  if (r) { Object.assign(spot.style, { display: 'block', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' }); }
  else spot.style.display = 'none';
  const bw = Math.min(330, W - 24); bub.style.width = bw + 'px';
  const bh = bub.offsetHeight, gap = 14;
  let x, y, side;
  if (!r) { x = (W - bw) / 2; y = (H - bh) / 2; side = 'none'; }
  else {
    const below = H - r.bottom - pad, above = r.top - pad, right = W - r.right - pad, left = r.left - pad;
    if (above >= bh + gap) side = 'top'; else if (below >= bh + gap) side = 'bottom'; else if (right >= bw + gap) side = 'right'; else if (left >= bw + gap) side = 'left'; else side = above > below ? 'top' : 'bottom';
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (side === 'top' || side === 'bottom') { x = Math.max(12, Math.min(W - bw - 12, cx - bw / 2)); y = side === 'top' ? r.top - pad - gap - bh : r.bottom + pad + gap; }
    else { y = Math.max(8, Math.min(H - bh - 8, cy - bh / 2)); x = side === 'right' ? r.right + pad + gap : r.left - pad - gap - bw; }
    y = Math.max(4, Math.min(H - bh - 4, y));
    arr.className = 'tour-arr ' + side;
    if (side === 'top' || side === 'bottom') { arr.style.left = Math.max(16, Math.min(bw - 16, cx - x)) + 'px'; arr.style.top = ''; }
    else { arr.style.top = Math.max(16, Math.min(bh - 16, cy - y)) + 'px'; arr.style.left = ''; }
  }
  bub.style.left = x + 'px'; bub.style.top = y + 'px'; bub.dataset.side = side;
}
function stopTour(done) {
  if (!tour) return;
  cancelAnimationFrame(tour.raf); tour.el.remove(); tour = null;
  if (B) B.pick([]);
  if (done) ls.set(TOUR_KEY, '1');
}

// ---------- thả emoji / chọc nhau (shared/ui/react.js): ghế = thẻ người chơi, emoji bay cả trên đầu quân 3D ----------
var reacts = createReactions({
  send: e => { if (!net) return; if (isHost) net.react('host', e); else net.react(e); },
  seatEl: id => pcEl(id),
  myId: () => myId,
  nameOf: id => { const p = shown && P(shown, id); return p ? p.name.replace(' 🤖', '') : ''; },
  mount: $('#game3d'), place: 'right:8px;bottom:8px',
  phrases: TYPHU_PHRASES,
  onShow: msg => { fx.sfx.notify(); if (B && shown && REACT_EMOJIS.includes(msg.e) && B.pawns[msg.from] && B.pawns[msg.from].visible !== false) B.floatAt(msg.from, msg.e, '#7a5cff'); },
});
reacts.setVisible(false);

// ---------- kết thúc ván ----------
function showWin(v) {
  const w = P(v, v.winner);
  if (w) { B.celebrate(w.id); fx.sfx.win(); fx.confetti(160); }
  fx.musicStinger(w && isMine(w.id) ? 'win' : 'lose'); if (!(w && isMine(w.id))) setTimeout(() => fx.sfx.lose(), 600);
  const why = { last: 'là người cuối cùng trụ lại 💪', groups: 'sở hữu trọn 3 nhóm màu 🏘️', stations: 'gom đủ cả 4 bến xe 🚌', rounds: 'giàu nhất khi hết giới hạn vòng 💰' }[v.winReason] || '';
  setTimeout(() => {
    if (!shown || shown.phase !== 'over') return;
    openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><div class="win"><div class="trophy">🏆</div>${w ? `<img src="${pic(w.avatar, 200)}" alt="">` : ''}
      <h2>${esc(w ? w.name : '?')} THẮNG!</h2><p style="margin:0;font-weight:700">${why}</p>
      <ol>${v.ranks.map(id => { const p = P(v, id); return p ? `<li>${esc(p.name)} – ${p.out ? 'phá sản' : '💎 ' + money(v.worth[id] || 0)}</li>` : ''; }).join('')}</ol></div>
      <div class="mbtns">${isHost ? btn('modal', '🔁 Ván mới', () => { closeModal(); net.restart(); }, 'pri') : ''}${btn('modal', '🗺️ Xem bàn cờ', closeModal, 'ghost')}${btn('modal', '🏠 Về trang chủ', leave, 'ghost')}</div>`, '', 'win');
  }, w ? 2200 * k() : 300);
}

// ---------- tải lại trang: tự khôi phục phòng / tự vào lại ----------
(function resume() {
  const snap = loadSnapshot(), ses = session.load('typhu');
  const lk = linkCode(); // mở link mời phòng khác → vào thẳng phòng đó; link của chính phòng mình → vào lại như thường
  if (lk && !(ses && ses.code === lk)) { linkJoin(lk); return; }
  if (lk) clearLinkCode();
  if (snap && ses && ses.role === 'host') {
    fx.musicResumeIfOn();
    const hp = snap.players.find(p => p.id === 'host') || {};
    net = new Host({ name: hp.name || myName(), avatar: hp.avatar || myAvatar }, handlers, !!snap.offline, snap); isHost = true; myId = 'host';
    $('#code-box').style.display = snap.offline ? 'none' : '';
    show('screen-lobby'); if (!snap.offline) netStatus('Đã khôi phục phòng ' + snap.code, 'ok'); return;
  }
  if (ses && ses.role === 'client' && ses.code) { net = new Client(ses.code, meProfile(), handlers); isHost = false; $('#code-box').style.display = ''; }
})();
if (location.hash === '#debug') window.__dbg = () => ({ net, shown, B, showCard: e => showCard(e, shown), openTile, openManage, openTrade, openPlayer, showWin, openBuildAsk, startTour, recap: () => recap, renderRecap, q: () => ({ pumping, queue: queue.length, busy, seenEv, anim: curAnim }) });
