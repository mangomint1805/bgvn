// Cờ Tỷ Phú Sài Gòn – giao diện: trang chủ, tạo nhân vật, sảnh, ván chơi 3D, hoạt ảnh sự kiện.
import { Host, Client, MAX, loadSnapshot, session, cleanAvatar } from './net.js?v=40';
import {
  setData, TILES, GROUPS, GROUP_LIST, STATION_RENT, money, rentOf, canBuild, canSell, canMortgage, canUnmortgage, houseCost, mortgageValue,
  unmortgageCost, tradable, tradeError, buybackPrice, netWorth, tilesOf, ownsGroup, JAIL_FINE, MAX_TRADES, isProp,
} from './engine.js?v=40';
import { Board3D, THEMES } from './scene3d.js?v=40';
import * as fx from './fx.js?v=40';
import { guideHTML } from './guide.js?v=40';
import { OPTIONS, PRESETS, buildAvatar, portrait } from '../../shared/js/avatar3d.js';
import * as THREE from '../../shared/lib/three.module.min.js';
import { OrbitControls } from '../../shared/lib/OrbitControls.js';
import { netStatus } from '../../shared/ui/status.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const settings = fx.settings;

// ---------- dữ liệu bàn cờ ----------
const [tilesData, cardsData] = await Promise.all(['tiles.json?v=40', 'cards.json?v=40'].map(u => fetch(u).then(r => r.json())));
setData(tilesData, cardsData);
const VN = 'ẮẰẲẴẶẤẦẨẪẬĐđơưƯƠếềểễệ';
const fontsReady = Promise.race([
  Promise.all(['800 40px "Be Vietnam Pro"', '700 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"', '800 40px "Baloo 2"'].map(f => document.fonts.load(f, 'Aa ' + VN).catch(() => null))),
  sleep(4500),
]);

// ---------- tiện ích giao diện ----------
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }
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
function closeModal() { $('#modal').classList.remove('open'); modalKey = null; fns.modal = []; if (onModalClose) { const f = onModalClose; onModalClose = null; f(); } if (B) B.pick([]); }
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
    <div class="set-row"><b>🎵 Nhạc nền</b><div class="seg"><button class="${settings.musicOn ? 'on' : ''}" ${fnAttr('modal', () => { fx.musicToggle(!settings.musicOn); openSettings(); })}>${settings.musicOn ? 'Đang bật' : 'Đang tắt'}</button></div>
      <input type="range" min="0" max="1" step="0.05" value="${settings.music}" id="vol-music" aria-label="Âm lượng nhạc"></div>
    <div class="set-row"><b>🔊 Hiệu ứng âm thanh</b><input type="range" min="0" max="1" step="0.05" value="${settings.sfx}" id="vol-sfx" aria-label="Âm lượng hiệu ứng"></div>
    <div class="set-row"><b>✨ Hiệu ứng hình ảnh</b>${seg('effects', [[true, 'Bật'], [false, 'Tắt']], v => B && B.setEffects(v))}</div>
    <div class="set-row"><b>🌇 Chủ đề</b>${seg('theme', Object.entries(THEMES).map(([k, t]) => [k, t.name]), v => B && B.setTheme(v))}</div>
    <div class="set-row"><b>🖥️ Chất lượng 3D</b>${seg('quality', [['low', 'Thấp'], ['med', 'Vừa'], ['high', 'Cao']], v => B && B.setQuality(v))}</div>
    <div class="set-row"><b>⏩ Tốc độ hoạt ảnh</b>${seg('speed', [['slow', 'Chậm'], ['normal', 'Vừa'], ['fast', 'Nhanh']])}</div>
    <p class="note">Máy yếu / điện thoại nóng: chọn chất lượng Thấp. Cài đặt được lưu trên máy này.</p>`, '', 'settings');
  $('#vol-music').oninput = e => { settings.music = +e.target.value; fx.applyVolumes(); fx.saveSettings(); };
  $('#vol-sfx').oninput = e => { settings.sfx = +e.target.value; fx.applyVolumes(); fx.saveSettings(); };
  $('#vol-sfx').onchange = () => fx.sfx.cash();
}
$('#btn-settings').onclick = $('#btn-settings-home').onclick = openSettings;
const openGuide = () => openModal(guideHTML(), 'wide', 'guide');
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
const qcode = new URLSearchParams(location.search).get('room'); if (qcode) $('#join-code').value = qcode.toUpperCase().slice(0, 5);
function leave() {
  if (net) { try { net.leave(); } catch (e) {} } net = null; lobby = null; resetGame(); closeModal(); netStatus('');
  show('screen-home');
}
$('#btn-leave-lobby').onclick = leave;
$('#btn-leave').onclick = () => openModal(`<h2>Rời ván?</h2><p style="text-align:center">${isHost ? 'Bạn là chủ phòng – rời đi sẽ kết thúc ván của mọi người.' : 'Bạn có thể vào lại bằng mã phòng (máy sẽ tạm đánh thay).'}</p>
  <div class="mbtns"><button class="btn ghost" data-close>Ở lại</button>${btn('modal', 'Rời ván', leave, 'red')}</div>`);
$('#btn-copy').onclick = () => { const url = location.origin + location.pathname + '?room=' + $('#room-code').textContent.trim(); (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Đã chép link mời 📋'), () => toast(url)); };

// ---------- sảnh ----------
const OPTS = [
  ['startMoney', '💰 Tiền khởi đầu', [[1500, '1,5M'], [2000, '2M'], [2500, '2,5M']]],
  ['maxRounds', '⏱️ Giới hạn vòng', [[0, 'Không'], [20, '20'], [30, '30'], [50, '50']], 'Hết vòng thì ai nhiều tài sản nhất thắng.'],
  ['monopolyWin', '🏆 Thắng độc quyền', [[true, 'Bật'], [false, 'Tắt']], 'Trọn 3 nhóm màu hoặc cả 4 bến xe là thắng luôn.'],
  ['auction', '🔨 Đấu giá', [[true, 'Bật'], [false, 'Tắt']], 'Không mua thì đem ô đó ra đấu giá.'],
  ['buyback', '💥 Mua lại đất', [[true, 'Bật'], [false, 'Tắt']], 'Trả thuê xong được mua lại đường đó với giá gấp đôi.'],
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
const queue = []; let pumping = false;
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
  shown = null; seenEv = 0; busy = false; winShown = false; queue.length = 0; deadlineAt = 0;
  if (B) { B.pick([]); }
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
      onCell: i => { fx.sfx.click(); openTile(i); },
      onCamera: m => { $('#btn-home-cam').classList.toggle('on', m === 'free'); $('#btn-overview').classList.toggle('on', m === 'overview'); },
    });
  } catch (e) { console.error(e); toast('Máy không hỗ trợ 3D (WebGL) – thử trình duyệt khác nhé.'); throw e; }
  window.__B = B;
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
      if (evs.length && !fast) { $('#panel').classList.add('busy'); for (const e of evs) { try { await animate(e, v); } catch (err) { console.error(err); } } }
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
  renderTop(); renderPlayers(); renderPanel(); renderLog();
  if (modalKey === 'manage') renderManage();
  else if (modalKey && modalKey.startsWith('tile:')) openTile(+modalKey.slice(5), true);
  else if (modalKey && modalKey.startsWith('player:')) openPlayer(modalKey.slice(7));
  else if (modalKey === 'trade' && v.stage !== 'roll' && v.stage !== 'end') closeModal();
  if (v.phase === 'over' && !winShown) { winShown = true; showWin(v); }
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
      await B.rollDice(e.d, B.pawnTile[e.pid] ?? 0);
      if (e.d[0] === e.d[1] && !e.util) { fx.banner('Đôi! 🎲🎲', 'gold sm'); }
      await sleep(150 * k()); break;
    }
    case 'move': await moveAnim(e); break;
    case 'land': B.pulse(e.tile, 0.9); break;
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
function setDice(d) { const el = $('#panel .dice-r'); if (el) el.textContent = `🎲 ${d[0]} + ${d[1]}`; }
const pcEl = id => $(`.pc[data-id="${CSS.escape(id || '')}"]`);
function flashPc(id) { const el = pcEl(id); if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

// ---------- thanh trên + người chơi ----------
function renderTop() {
  const v = shown; $('#round-tag').textContent = `Vòng ${v.round}${v.opts.maxRounds ? '/' + v.opts.maxRounds : ''}`;
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
$('#btn-overview').onclick = () => { fx.sfx.click(); if (!B) return; B.cam.mode === 'overview' ? B.home() : B.overview(); };

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
  const tools = pid => [btn('panel', '🏗️ Tài sản', () => openManage(pid), 'ghost sm'), btn('panel', '🤝 Giao dịch', () => openTrade(pid), 'ghost sm', v.trades >= MAX_TRADES)];
  switch (v.stage) {
    case 'roll': {
      if (!mine) { lines.push(head(actor, `⏳ <b>${who}</b> ${A.inJail ? 'đang ở tù, tính cách ra…' : 'chuẩn bị đổ xúc xắc…'}`)); break; }
      if (A.inJail) {
        lines.push(head(actor, `⛓️ <b>${who}</b> đang ở tù (lượt ${A.jailTurns + 1}/3)`));
        btns.push(btn('panel', '🎲 Đổ đôi để ra', () => send(me, { type: 'roll' }), 'pri main'));
        btns.push(btn('panel', `🔓 Nộp ${money(JAIL_FINE)}`, () => send(me, { type: 'payJail' }), 'gold', A.cash < JAIL_FINE));
        if (A.cards.length) btns.push(btn('panel', '🗝️ Dùng thẻ', () => send(me, { type: 'useCard' }), 'green'));
      } else {
        lines.push(head(actor, v.again ? `🎲 Đôi! <b>${who}</b> được đổ tiếp` : `🎲 Tới lượt <b>${who === 'Bạn' ? 'bạn' : who}</b>!`));
        btns.push(btn('panel', '🎲 Đổ xúc xắc', () => send(me, { type: 'roll' }), 'pri main'));
      }
      btns.push(...tools(me)); break;
    }
    case 'buy': {
      const i = v.buyTile, t = TILES[i];
      lines.push(head(actor, mine ? `🏷️ <b>${who}</b> dừng ở ô trống – mua không?` : `🤔 <b>${who}</b> đang cân nhắc mua…`), mini(i));
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
        lines.push(`<div class="sub">${tradeSummary(v, T, actor)}</div>`);
        btns.push(btn('panel', '✅ Đồng ý', () => send(me, { type: 'accept' }), 'green main'), btn('panel', '🙅 Từ chối', () => send(me, { type: 'reject' }), 'red'), btn('panel', '🔍 Chi tiết', () => openOffer(v), 'ghost sm'));
      } else {
        lines.push(head(T.from, `🤝 <b>${youOr(v, T.from)}</b> đề nghị giao dịch với <b>${esc(nm(v, T.to))}</b>…`));
        lines.push(`<div class="sub">${tradeSummary(v, T, null)}</div>`);
        if (isMine(T.from)) btns.push(btn('panel', '↩️ Rút lại', () => send(T.from, { type: 'cancel' }), 'ghost'));
      }
      break;
    }
    case 'debt': {
      const D = v.debt;
      if (!mine) { lines.push(head(actor, `😰 <b>${who}</b> đang xoay ${money(D.amount)} để trả nợ…`)); break; }
      lines.push(head(actor, `😰 <b>${who}</b> phải trả <b>${money(D.amount)}</b> – đang có ${money(A.cash)}`));
      lines.push(`<div class="sub">Bán nhà hoặc thế chấp đất để gom đủ tiền. Hết cách thì đành phá sản.</div>`);
      btns.push(btn('panel', '💳 Trả nợ', () => send(me, { type: 'payDebt' }), 'green main', A.cash < D.amount));
      btns.push(btn('panel', '🏗️ Bán / Thế chấp', () => openManage(me), 'gold'));
      btns.push(btn('panel', '💀 Phá sản', () => confirmBankrupt(me), 'red sm'));
      break;
    }
    case 'end': {
      if (!mine) { lines.push(head(actor, `⏳ <b>${who}</b> đang tính toán…`)); break; }
      lines.push(head(actor, `✅ ${who === 'Bạn' ? 'Bạn' : '<b>' + who + '</b>'} có thể xây nhà, giao dịch rồi kết thúc lượt.`));
      btns.push(btn('panel', '✅ Kết thúc lượt', () => send(me, { type: 'end' }), 'pri main'));
      btns.push(...tools(me)); break;
    }
    default: lines.push(head(actor, `⏳ ${who}…`));
  }
  el.innerHTML = lines.join('') + (btns.length ? `<div class="btns">${btns.join('')}</div>` : '');
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
  if (TILES[i].type === 'city' && ok1 && canBuild(v, pid, i)) out.push(btn(scope, pr.h === 4 ? `🏛️ Landmark -${money(houseCost(i))}` : `🏠 Xây -${money(houseCost(i))}`, () => send(pid, { type: 'build', tile: i }), 'green sm'));
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
      ${pr && pr.h < 5 && !pr.mort && v.opts.buyback ? `<tr><td>💥 Giá mua lại</td><td>${money(buybackPrice(v, i))}</td></tr>` : ''}</table>`;
  } else if (t.type === 'station') {
    const n = pr ? Object.keys(v.props).filter(j => TILES[j].type === 'station' && v.props[j].owner === pr.owner).length : 0;
    body = `<table>${STATION_RENT.map((r, k) => `<tr class="${n === k + 1 ? 'cur' : ''}"><td>Chủ có ${k + 1} bến xe</td><td>${money(r)}</td></tr>`).join('')}<tr><td>Thế chấp được</td><td>${money(mortgageValue(i))}</td></tr></table>`;
  } else if (t.type === 'utility') {
    body = `<table><tr><td>Chủ có 1 công ty</td><td>4 × xúc xắc</td></tr><tr><td>Chủ có cả Điện lực + Cấp nước</td><td>10 × xúc xắc</td></tr><tr><td>Thế chấp được</td><td>${money(mortgageValue(i))}</td></tr></table>`;
  } else {
    const D = { start: 'Đi qua hoặc dừng ở đây nhận 200K.', jail: 'Đứng đây bình thường chỉ là ghé thăm. Người bị bắt vào tù ở ô này tối đa 3 lượt.', parking: 'Nghỉ chân miễn phí – không có gì xảy ra.', gotojail: 'Dừng ở đây là đi thẳng vào tù, không qua Bắt đầu, không nhận 200K.', chance: 'Rút 1 thẻ Cơ hội và làm theo.', chest: 'Rút 1 thẻ Khí vận và làm theo.', tax: `Dừng ở đây đóng ${money(t.amount || 0)} cho ngân hàng.` };
    body = `<p style="padding:12px 14px;margin:0;font-weight:600">${D[t.type] || ''}</p>`;
  }
  const here = v ? v.players.filter(p => !p.out && p.pos === i) : [];
  const ownRow = isProp(i) ? `<div class="own">${owner ? `<img src="${pic(owner.avatar, 60)}" alt="">Chủ: ${esc(owner.name)} ${statusOf(v, i)}` : '🏦 Chưa có chủ – giá ' + money(t.price)}</div>` : '';
  const actPid = v && mineIds(v).find(id => pr && pr.owner === id);
  const mb = v && actPid ? manageBtns(v, actPid, i) : '';
  const html = `<button class="close-x" data-close aria-label="Đóng">✕</button><div class="deed" style="--gc:${gColor(i)}"><div class="hd"><small>${t.type === 'city' ? 'Nhóm ' + GROUPS[t.group].name : t.type === 'station' ? 'Bến xe' : t.type === 'utility' ? 'Công ty' : 'Ô đặc biệt'}</small><b>${esc(t.name)}</b>${t.area ? `<small>${esc(t.area)}</small>` : ''}</div>${ownRow}${body}
    ${here.length ? `<div class="own">Đang đứng: ${here.map(p => `<img src="${pic(p.avatar, 60)}" alt="" title="${esc(p.name)}">`).join('')}</div>` : ''}</div>${mb ? `<div class="mbtns">${mb}</div>` : ''}`;
  if (refresh) { $('#modal-box').innerHTML = html; } else openModal(html, '', 'tile:' + i);
  B && B.pick([i]);
}
function openPlayer(id) {
  const v = shown, p = v && P(v, id); if (!p) return;
  const own = tilesOf(v, id).sort((a, b) => a - b);
  const html = `<button class="close-x" data-close aria-label="Đóng">✕</button><div class="win" style="margin-bottom:6px"><img src="${pic(p.avatar, 160)}" alt=""><h2 style="margin:4px 0 0">${esc(p.name)}</h2>
    <div class="sub">💵 ${money(p.cash)} · 💎 tài sản ${money(v.worth[id] || 0)}${p.cards.length ? ` · 🗝️ ${p.cards.length} thẻ ra tù` : ''}${p.inJail ? ' · ⛓️ đang ở tù' : ''}${p.out ? ' · 💀 phá sản' : ''}</div></div>
    <div class="mg">${own.length ? own.map(i => `<div class="row" style="border-left:6px solid ${gColor(i)};padding-left:8px"><span class="nm" ${fnAttr('modal', () => openTile(i))}>${esc(tileName(i))} <small>${statusOf(v, i)}</small></span><small>${money(TILES[i].price)}</small></div>`).join('') : '<p class="note" style="text-align:center">Chưa có miếng đất nào.</p>'}</div>`;
  if (modalKey === 'player:' + id) { $('#modal-box').innerHTML = html; } else openModal(html, '', 'player:' + id);
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
  const debt = v.stage === 'debt' && v.actor === pid ? `<p class="sub" style="text-align:center">Cần trả <b>${money(v.debt.amount)}</b> · đang có <b>${money(p.cash)}</b></p>` : '';
  $('#modal-box').innerHTML = `<button class="close-x" data-close aria-label="Đóng">✕</button><h2>🏗️ Tài sản của ${esc(p.name)}</h2>
    <p style="text-align:center;margin:0">💵 <b>${money(p.cash)}</b> tiền mặt</p>${debt}
    ${groups.length ? `<div class="mg">${groups.map(g => `<div class="grp"><h5 style="--gc:${g.color}"><i></i>${g.name}${g.full ? ' ✅ đủ nhóm' : ` (${g.mine.length}/${g.tiles.length})`}</h5>
      ${g.mine.map(i => `<div class="row"><span class="nm" ${fnAttr('modal', () => openTile(i))}>${esc(tileName(i))} <small>${statusOf(v, i) || money(TILES[i].price)}</small></span>${manageBtns(v, pid, i)}</div>`).join('')}</div>`).join('')}</div>`
      : '<p class="note" style="text-align:center">Bạn chưa có miếng đất nào.</p>'}
    <p class="note">Xây nhà cần đủ nhóm màu, xây đều tay; 4 nhà rồi mới lên Landmark. Bán nhà được nửa giá. Thế chấp nhận nửa giá, chuộc lại +10%.</p>`;
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
    $('#modal-box').innerHTML = `<button class="close-x" data-close aria-label="Đóng">✕</button><h2>🤝 Giao dịch</h2>
      <div class="tr-who">${others.map(o => `<button class="${o.id === st.to ? 'on' : ''}" ${fnAttr('modal', () => { st.to = o.id; st.get = { cash: 0, tiles: [], cards: 0 }; draw(); })}><img src="${pic(o.avatar, 60)}" alt="">${esc(o.name)}</button>`).join('')}</div>
      <div class="tr-cols">
        <div class="tr-col"><h4>${multiLocal(v) ? esc(me.name) + ' đưa' : 'Bạn đưa'} <small class="sub">(có ${money(me.cash)})</small></h4>${list(pid, 'give')}
          <label>💵 Tiền <input class="inp" type="number" min="0" step="10" max="${me.cash}" value="${st.give.cash || ''}" data-cash="give" placeholder="0"></label>
          ${me.cards.length ? `<label>🗝️ Thẻ ra tù <input class="inp" type="number" min="0" max="${me.cards.length}" value="${st.give.cards || ''}" data-cards="give" placeholder="0"></label>` : ''}</div>
        <div class="tr-col"><h4>${esc(them.name)} đưa <small class="sub">(có ${money(them.cash)})</small></h4>${list(st.to, 'get')}
          <label>💵 Tiền <input class="inp" type="number" min="0" step="10" max="${them.cash}" value="${st.get.cash || ''}" data-cash="get" placeholder="0"></label>
          ${them.cards.length ? `<label>🗝️ Thẻ ra tù <input class="inp" type="number" min="0" max="${them.cards.length}" value="${st.get.cards || ''}" data-cards="get" placeholder="0"></label>` : ''}</div>
      </div>
      <p class="sub" id="tr-err" style="text-align:center;color:#c62828;min-height:20px;margin:8px 0 0">${err && err !== 'Giao dịch trống' ? esc(err) : ''}</p>
      <div class="mbtns"><button class="btn ghost" data-close>Huỷ</button>${btn('modal', `📨 Gửi đề nghị (${MAX_TRADES - v.trades} lần)`, () => { closeModal(); send(pid, { type: 'trade', ...t }); }, 'pri', !!err || v.trades >= MAX_TRADES)}</div>`;
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
    <div class="mbtns">${btn('modal', '✅ Đồng ý', () => { closeModal(); send(me, { type: 'accept' }); }, 'green')}${btn('modal', '🙅 Từ chối', () => { closeModal(); send(me, { type: 'reject' }); }, 'red')}</div>`, 'wide', 'offer');
}

// ---------- kết thúc ván ----------
function showWin(v) {
  const w = P(v, v.winner);
  if (w) { B.celebrate(w.id); fx.sfx.win(); fx.confetti(160); }
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
  if (snap && ses && ses.role === 'host') {
    fx.musicResumeIfOn();
    const hp = snap.players.find(p => p.id === 'host') || {};
    net = new Host({ name: hp.name || myName(), avatar: hp.avatar || myAvatar }, handlers, !!snap.offline, snap); isHost = true; myId = 'host';
    $('#code-box').style.display = snap.offline ? 'none' : '';
    show('screen-lobby'); if (!snap.offline) netStatus('Đã khôi phục phòng ' + snap.code, 'ok'); return;
  }
  if (ses && ses.role === 'client' && ses.code) { net = new Client(ses.code, meProfile(), handlers); isHost = false; $('#code-box').style.display = ''; }
})();
if (location.hash === '#debug') window.__dbg = () => ({ net, shown, B, showCard: e => showCard(e, shown), openTile, openManage, openTrade, openPlayer, showWin });
