import { Host, Client, MAX, maxPlayers, loadSnapshot, session, PHRASES, SOLO_DEFAULT } from './net.js?v=19';
import { linkCode, clearLinkCode, inviteUrl, joinByLink } from '../../shared/net/joinlink.js?v=2';
import { createReactions } from '../../shared/ui/react.js?v=2';
import { netStatus } from '../../shared/ui/status.js';
import { Board, buildToolbar, opsToCanvas, W, H } from './draw.js?v=5';
import { CATS, CAT_KEYS, DEFAULT_CATS, buildPool, randomPrompt, parseCustom } from './words.js?v=5';
import { REACTS, GMODES, GMODE_KEYS, buildPlan, groupSizes, frameCount, REVEAL_AUTO, FRAMES_ANIM, FRAMES_SOLO, GSIZE, cleanTease, TEASE_MAX, leaksAny } from './engine.js?v=7';
import { planFrames, totalMs, drawFrame, exportGif, exportVideo, videoType, FW, FH } from './export.js?v=5';
import { encodeGif } from './gif.js?v=5';
import { opsBytes, simplifyOps } from './ops.js?v=5';
import * as fx from './fx.js?v=6';
import { guideHTML } from './guide.js?v=9';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=134';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };

let net = null, isHost = false, myId = null, lobby = null, view = null;

// ---------- tiện ích giao diện ----------
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); syncReacts(id); if (id !== 'screen-game' && id !== 'screen-gartic') fx.musicMood('lobby'); }
// ---------- thả emoji / chọc nhau (shared/ui/react.js): nút nằm trên thanh trên, không đè bảng vẽ / ô chat ----------
let reacts = null;
function syncReacts(id) {
  if (!reacts) return;
  const slot = id === 'screen-game' ? $('#g-rx') : id === 'screen-gartic' ? $('#t-rx') : null;
  if (slot && reacts.button.parentElement !== slot) slot.appendChild(reacts.button);
  reacts.setVisible(!!slot && !!net && !net.offline);
}
const active = id => $('#' + id).classList.contains('active');
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
let modalLock = false;
function openModal(html, cls = '', lock = false) { $('#modal-box').className = 'modal-box ' + cls; $('#modal-box').innerHTML = html; $('#modal').classList.add('open'); modalLock = lock; }
function closeModal() { $('#modal').classList.remove('open'); modalLock = false; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !modalLock) closeModal(); if (e.target.closest('[data-close]')) closeModal(); });
const AV = ['#ef2b3a', '#ff7a1a', '#e0a800', '#22b852', '#0ea5a0', '#2a63e8', '#8b4fe3', '#e64ec8', '#a0582d', '#1b2a8c'];
const avColor = n => { let h = 0; for (const ch of String(n)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AV[h % AV.length]; };
const avatar = (n, cls = '') => `<i class="av ${cls}" style="--av:${avColor(n)}">${esc(([...String(n).trim()][0] || '?').toUpperCase())}</i>`;
const pname = id => { const ps = (view && view.players) || (lobby && lobby.players) || []; return (ps.find(p => p.id === id) || {}).name || '?'; };
function download(canvas, name) {
  canvas.toBlob(b => { if (!b) { toast('Không tạo được ảnh 😢'); return; } const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Đã lưu ảnh 📸'); }, 'image/png');
}
function saveBlob(blob, name, msg) {
  const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 8000); toast(msg);
}
const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtDur = ms => { const t = Math.round(ms / 1000); return t >= 60 ? `${Math.floor(t / 60)} phút ${t % 60 ? (t % 60) + ' giây' : ''}`.trim() : t + ' giây'; };
// nhóm (Đông vui) chứa chuỗi c: [chỉ số nhóm, chuỗi đầu nhóm, số chuỗi]
const grpOf = (v, c) => { const gs = v.groups && v.groups.length ? v.groups : [[0, v.chains.length]]; const j = Math.max(0, gs.findIndex(([a, g]) => c >= a && c < a + g)); return [j, gs[j][0], gs[j][1]]; };
const nGroups = v => v.groups && v.groups.length > 1 ? v.groups.length : 0;
const fname = s => fx && String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'tranh';

// ---------- âm thanh ----------
// trang chủ: 2 nút riêng; trong ván: nút loa mở bảng nhỏ bật/tắt hiệu ứng & nhạc nền
function syncSound() {
  const m = fx.isMuted(), mu = fx.musicIsOn();
  $('#btn-sound-home').textContent = m ? '🔇 Âm thanh' : '🔊 Âm thanh'; $('#btn-sound-home').classList.toggle('on', !m);
  $('#btn-music-home').textContent = mu ? '🎵 Nhạc: bật' : '🎵 Nhạc: tắt'; $('#btn-music-home').classList.toggle('on', mu);
  $('#sp-sfx').textContent = m ? '🔇 Hiệu ứng: tắt' : '🔊 Hiệu ứng: bật'; $('#sp-sfx').classList.toggle('on', !m);
  $('#sp-music').textContent = mu ? '🎵 Nhạc nền: bật' : '🎵 Nhạc nền: tắt'; $('#sp-music').classList.toggle('on', mu);
  $$('.ic.snd-btn').forEach(b => b.classList.toggle('muted', m));
}
const toggleSfx = () => { fx.toggleMute(); syncSound(); fx.sfx.pop(); };
const toggleMusic = () => { fx.actx(); fx.musicToggle(); syncSound(); };
$('#btn-sound-home').onclick = toggleSfx; $('#btn-music-home').onclick = toggleMusic;
$('#sp-sfx').onclick = toggleSfx; $('#sp-music').onclick = toggleMusic;
$$('.ic.snd-btn').forEach(b => b.onclick = e => {
  e.stopPropagation(); const pop = $('#snd-pop');
  if (!pop.hidden) { pop.hidden = true; return; }
  const r = b.getBoundingClientRect(); pop.style.top = r.bottom + 8 + 'px'; pop.style.right = Math.max(8, innerWidth - r.right) + 'px';
  pop.hidden = false; fx.sfx.pop();
});
document.addEventListener('pointerdown', e => { const pop = $('#snd-pop'); if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('.ic.snd-btn')) pop.hidden = true; });
syncSound();
// tiếng bút chì / tẩy / đổ màu cho mọi bảng vẽ
const inkFx = { onInk: (d, tool) => fx.scribble(d, tool), onTool: k => (k === 'fill' ? fx.sfx.fill() : k === 'undo' ? fx.sfx.undo() : fx.sfx.crumple()) };
const openGuide = () => openModal(guideHTML() + '<div class="m-btns"><button class="btn pri" data-close>Hiểu rồi! 👌</button></div>', 'wide');
$('#btn-guide-home').onclick = $('#g-guide').onclick = $('#t-guide').onclick = openGuide;
// 📝 Có gì mới (patch notes dùng chung): trang chủ, thanh trên trong ván (màn rộng) và bảng loa (điện thoại)
$$('.news-btn').forEach(b => { newsBadge(b, 'scribble'); b.onclick = () => { $('#snd-pop').hidden = true; openNews('scribble'); $$('.news-btn').forEach(x => x.classList.remove('bgvn-dot')); }; });

// ---------- trang chủ ----------
$('#name').value = ls.get('bgvn-name') || '';
function myName() { const n = $('#name').value.trim().slice(0, 16) || 'Hoạ sĩ ẩn danh'; ls.set('bgvn-name', n); return n; }
const handlers = {
  onLobby(info, code, started) {
    lobby = info; $('#room-code').textContent = code;
    if (!started) { view = null; renderLobby(); if (!active('screen-lobby')) { closeModal(); show('screen-lobby'); } }
  },
  onState(v) {
    if (!v) { view = null; closeModal(); show('screen-lobby'); renderLobby(); return; }
    const prev = view; view = v;
    if (v.mode === 'guess') renderGuess(v, prev && prev.gid === v.gid ? prev : null);
    else renderGartic(v, prev && prev.gid === v.gid ? prev : null);
  },
  onDraw(ops, n) { onDraw(ops, n); },
  onCanvas(m) { onCanvas(m); },
  onBook(m) { onBook(m); },
  onError(m) { toast(m); fx.sfx.bad(); },
  onReact(msg) { reacts && reacts.show(msg); },
  onTease(msg) { showTease(msg); },
  onJoined(id) { myId = id; },
  onFail() { if (!view && !lobby) show('screen-home'); },
  onNet(t, k, retry) { netStatus(t, k, retry); },
};
function startHost() {
  fx.actx(); fx.musicResumeIfOn();
  if (net) net.leave();
  net = new Host(myName(), handlers); isHost = true; myId = 'host';
  show('screen-lobby');
}
$('#btn-create').onclick = startHost;
// Hoạt hình một mình: chủ phòng không mạng, bắt đầu luôn
// chọn số khung / thời gian / tốc độ phim rồi vẽ luôn (cũng dùng cho nút "Vẽ đoạn mới")
function openSolo() {
  let pr = {}; try { pr = JSON.parse(ls.get('scribble-solo')) || {}; } catch (e) {}
  let fr = clampN(+pr.frames || SOLO_DEFAULT.frames, FRAMES_SOLO[0], FRAMES_SOLO[1]), fps = clampN(+pr.fps || SOLO_DEFAULT.fps, 1, 12), dt = clampN(Math.round((+pr.drawTime || SOLO_DEFAULT.drawTime) / 10) * 10, 30, 180);
  const per = d => Math.max(30, Math.round(d * 0.75));
  openModal(`<h2>🧑‍🎨 Hoạt hình một mình</h2><p class="center muted">Tự vẽ từng khung – khung trước hiện mờ để bạn nhích dần. Vẽ xong là thành phim, tải GIF được. Không cần mạng.</p>
    <div class="set row"><span>Số khung</span><div class="stepper"><button class="tb" id="so-m" aria-label="Bớt khung">−</button><b id="so-n">${fr}</b><button class="tb" id="so-p" aria-label="Thêm khung">+</button></div></div>
    <label class="set"><span>Thời gian mỗi khung <b id="so-t-v">${per(dt)} giây</b></span><input type="range" id="so-t" min="30" max="180" step="10" value="${dt}"></label>
    <label class="set"><span>Tốc độ phim <b id="so-f-v">${fps} khung/giây</b></span><input type="range" id="so-f" min="1" max="12" step="1" value="${fps}"></label>
    <div class="m-btns"><button class="btn" data-close>Huỷ</button><button class="btn pri" id="so-go">▶ Bắt đầu vẽ</button></div>`);
  const upd = () => { $('#so-n').textContent = fr; $('#so-m').disabled = fr <= FRAMES_SOLO[0]; $('#so-p').disabled = fr >= FRAMES_SOLO[1]; };
  $('#so-m').onclick = () => { fr = clampN(fr - 1, FRAMES_SOLO[0], FRAMES_SOLO[1]); upd(); fx.sfx.pop(); };
  $('#so-p').onclick = () => { fr = clampN(fr + 1, FRAMES_SOLO[0], FRAMES_SOLO[1]); upd(); fx.sfx.pop(); };
  $('#so-t').oninput = e => { dt = +e.target.value; $('#so-t-v').textContent = per(dt) + ' giây'; };
  $('#so-f').oninput = e => { fps = +e.target.value; $('#so-f-v').textContent = fps + ' khung/giây'; };
  upd();
  $('#so-go').onclick = () => {
    ls.set('scribble-solo', JSON.stringify({ frames: fr, fps, drawTime: dt })); closeModal();
    fx.actx(); fx.musicResumeIfOn();
    if (net && net.offline) net.restart();
    else { if (net) net.leave(); net = new Host(myName(), handlers, null, true); isHost = true; myId = 'host'; }
    net.setOpts({ mode: 'gartic', gmode: 'solo', frames: fr, fps, drawTime: dt }); net && net.start();
  };
}
$('#btn-solo').onclick = openSolo;
$('#btn-join').onclick = () => {
  const code = $('#join-code').value.trim().toUpperCase(); if (code.length < 5) { toast('Nhập mã phòng 5 ký tự nhé.'); return; }
  fx.actx(); fx.musicResumeIfOn();
  if (net) net.leave();
  net = new Client(code, myName(), handlers); isHost = false; myId = null;
};
$('#join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-join').click(); });
// link mời ?room=MÃ (shared/net/joinlink.js): mở link là vào thẳng phòng
const qcode = linkCode(); if (qcode) $('#join-code').value = qcode;
function linkJoin(code) { $('#join-code').value = code; joinByLink({ code, toast: m => toast(m), join: n => { $('#name').value = n; $('#btn-join').click(); }, abort: () => leave() }); }
function leave() {
  if (net) net.leave(); net = null; view = null; lobby = null; isHost = false; myId = null;
  closeModal(); netStatus(''); show('screen-home'); curTurn = null; tStepKey = null;
}
$('#btn-leave-lobby').onclick = leave;
function askLeave() {
  openModal(`<h2>Rời ván?</h2><p class="center">${isHost ? 'Bạn là chủ phòng – rời đi là cả phòng giải tán đó nha.' : 'Bạn có thể vào lại bằng mã phòng.'}</p><div class="m-btns"><button class="btn" data-close>Ở lại</button><button class="btn red" id="m-leave">Rời ván</button></div>`);
  $('#m-leave').onclick = leave;
}
$('#g-leave').onclick = $('#t-leave').onclick = askLeave;
$('#btn-copy').onclick = () => {
  const url = inviteUrl($('#room-code').textContent);
  (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Đã chép link mời 📋'), () => toast(url));
};

// ---------- sảnh ----------
const MODE_INFO = {
  guess: ['🎨 Đoán hình', 'Lần lượt làm hoạ sĩ, cả phòng gõ đoán. Nhanh tay ăn nhiều điểm!'],
  gartic: ['📞 Tam sao thất bản', 'Viết câu → vẽ lại → đoán lại → … chuyền vòng tròn, cuối ván chiếu lại cười xỉu.'],
};
let settingsKey = '', settingsPending = false;
function renderLobby() {
  if (!lobby) return;
  const ps = lobby.players, o = lobby.opts;
  const mx = maxPlayers(o);
  $('#pcount').textContent = `${ps.length}/${mx}`;
  $('#code-box').style.display = net && net.offline ? 'none' : '';
  $('#plist').innerHTML = ps.map(p => `<li>${avatar(p.name)}<span class="nm">${esc(p.name)}${p.id === myId ? ' <small>(bạn)</small>' : ''}${p.id === 'host' ? ' 👑' : ''}${!p.connected ? ' <small>📴</small>' : ''}</span>${isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</li>`).join('');
  $$('#plist [data-rm]').forEach(b => b.onclick = () => net && net.removePlayer(b.dataset.rm));
  const online = ps.filter(p => p.connected).length;
  const solo = o.mode === 'gartic' && o.gmode === 'solo', need = solo ? 1 : 2;
  $('#lobby-tip').innerHTML = online < need ? '👋 Cần ít nhất <b>2 người</b>. Gửi mã phòng hoặc bấm <b>Chép link mời</b> cho hội bạn nhé! (Chỉ có mình bạn? Chọn Tam sao thất bản › <b>Một mình</b>.)' : online > mx ? `⚠️ Chế độ này tối đa <b>${mx} người</b> – chọn <b>🎉 Đông vui</b> để chơi tới ${MAX} người.` : `Đủ người rồi, quẩy thôi! (tối đa ${mx} người)`;
  $('#modes').innerHTML = Object.entries(MODE_INFO).map(([k, [t, d]]) => `<button class="mode ${o.mode === k ? 'on' : ''}" data-mode="${k}" ${isHost ? '' : 'disabled'}><b>${t}</b><small>${d}</small></button>`).join('');
  $$('#modes [data-mode]').forEach(b => b.onclick = () => net && net.setOpts({ mode: b.dataset.mode }));
  renderSettings();
  $('#btn-start').style.display = isHost ? '' : 'none';
  $('#btn-start').textContent = online < need ? '▶ Bắt đầu (cần ≥ 2 người)' : `▶ Bắt đầu ${o.mode === 'gartic' ? GMODES[o.gmode].icon + ' ' + GMODES[o.gmode].name : MODE_INFO[o.mode][0].slice(2)}`;
  $('#btn-start').classList.toggle('dim', online < need || online > mx);
  $('#wait-msg').style.display = isHost ? 'none' : '';
}
function renderSettings() {
  const o = lobby.opts, box = $('#settings');
  const key = JSON.stringify([o, isHost]);
  if (key === settingsKey) return;
  if (box.contains(document.activeElement) && document.activeElement.tagName === 'TEXTAREA') { settingsPending = true; return; }
  settingsKey = key; settingsPending = false;
  const dis = isHost ? '' : 'disabled';
  const slider = (id, label, val, min, max, step) => `<label class="set"><span>${label} <b id="${id}-v">${val} giây</b></span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}" ${dis}></label>`;
  let h = '';
  if (o.mode === 'guess') {
    h += `<div class="set row"><span>Số vòng</span><div class="stepper"><button class="tb" data-r="-1" ${dis} aria-label="Bớt vòng">−</button><b>${o.rounds}</b><button class="tb" data-r="1" ${dis} aria-label="Thêm vòng">+</button></div></div>`;
    h += slider('s-draw', 'Thời gian vẽ', o.drawTime, 30, 180, 10);
    h += `<h4>Chủ đề <small>(${buildPool(o).length} từ)</small></h4><div class="cats">${CAT_KEYS.map(k => `<button class="cat ${o.cats.includes(k) ? 'on' : ''}" data-cat="${k}" ${dis}>${CATS[k].name} <small>${CATS[k].words.length}</small></button>`).join('')}</div>`;
    h += `<h4>Từ riêng của hội <small>(${o.custom.length} từ)</small></h4>`;
    h += isHost ? `<textarea id="s-custom" rows="4" placeholder="Mỗi dòng 1 từ, ví dụ:&#10;Kẹo ngủ gật&#10;cà phê muối&#10;xe buýt số 19">${esc(o.custom.join('\n'))}</textarea>` : `<p class="hint-txt">${o.custom.length ? esc(o.custom.length + ' từ bí mật do chủ phòng thêm 🤫') : 'Chủ phòng chưa thêm từ riêng.'}</p>`;
    h += `<label class="check"><input type="checkbox" id="s-only" ${o.onlyCustom ? 'checked' : ''} ${isHost && o.custom.length >= 3 ? '' : 'disabled'}><span>Chỉ dùng từ riêng <small>(cần ≥ 3 từ)</small></span></label>`;
  } else {
    const g = GMODES[o.gmode] || GMODES.normal;
    h += `<h4>Kiểu chơi</h4><div class="gmodes">${GMODE_KEYS.map(k => `<button class="gm ${o.gmode === k ? 'on' : ''}" data-gm="${k}" ${dis} title="${esc(GMODES[k].desc)}"><i>${GMODES[k].icon}</i><span>${GMODES[k].name}</span></button>`).join('')}</div>
      <p class="gm-desc"><b>${g.icon} ${g.name}:</b> ${esc(g.desc)}</p>`;
    if (o.gmode === 'custom') {
      const KN = { text: '✍️ Viết', draw: '🎨 Vẽ', frame: '🎞️ Khung' };
      h += `<div class="set row"><span>Số bước</span><div class="stepper"><button class="tb" data-cs="-1" ${dis} aria-label="Bớt bước">−</button><b>${o.cSteps}</b><button class="tb" data-cs="1" ${dis} aria-label="Thêm bước">+</button></div></div>`;
      h += slider('s-ctime', 'Thời gian mỗi bước', o.cTime, 10, 180, 5);
      h += `<div class="ckinds">${o.cKinds.map((kk, i) => `<button class="ck k-${kk}" data-ck="${i}" ${dis} title="Bấm để đổi kiểu bước ${i + 1}"><small>${i + 1}</small>${KN[kk]}</button>`).join('')}</div><p class="hint-txt">Bấm từng ô để đổi: Viết → Vẽ → Khung hoạt hình. Viết sau hình = đoán hình, vẽ sau hình = chép lại, khung sau khung = thấy mờ khung trước.</p>`;
    } else {
      h += slider('s-draw', o.gmode === 'complement' ? 'Thời gian vẽ tiếp' : ['animation', 'background', 'solo'].includes(o.gmode) ? 'Thời gian vẽ (khung sau ngắn hơn)' : 'Thời gian vẽ', o.drawTime, 30, 180, 10);
      if (!['complement', 'animation', 'background', 'solo'].includes(o.gmode)) h += slider('s-text', o.gmode === 'icebreaker' ? 'Thời gian viết câu hỏi' : 'Thời gian viết / đoán', o.textTime, 20, 90, 5);
      if (['speed', 'secret', 'crowd', 'knockoff'].includes(o.gmode)) h += `<p class="hint-txt">⏱ Chế độ này tự rút ngắn đồng hồ so với số giây ở trên.</p>`;
    }
    const n = lobby.players.length, plan = buildPlan(o, Math.max(1, n)), gs = groupSizes(n, o);
    const stepper = (key, label, val, txt) => `<div class="set row"><span>${label}</span><div class="stepper"><button class="tb" data-${key}="-1" ${dis} aria-label="Bớt">−</button><b class="${txt ? 'txt' : ''}">${val}</b><button class="tb" data-${key}="1" ${dis} aria-label="Thêm">+</button></div></div>`;
    if (o.gmode === 'animation' || o.gmode === 'background') h += stepper('fr', 'Số khung', o.frames ? frameCount(o, n) : `Tự động · ${frameCount(o, n)}`, !o.frames);
    if (o.gmode === 'solo') h += stepper('fr', 'Số khung mỗi người', frameCount(o, 1));
    if (o.gmode === 'crowd') h += stepper('gs', 'Người mỗi nhóm', `~${o.gSize}`);
    if (['animation', 'background', 'solo'].includes(o.gmode) || (o.gmode === 'custom' && o.cKinds.includes('frame'))) h += `<label class="set"><span>Tốc độ phim mặc định <b id="s-fps-v">${o.fps} khung/giây</b></span><input type="range" id="s-fps" min="1" max="12" step="1" value="${o.fps}" ${dis}></label>`;
    h += `<div class="set row wrap"><span>Chiếu lại cuối ván</span><div class="seg">${REVEAL_AUTO.map(x => `<button class="sg ${o.revealAuto === x ? 'on' : ''}" data-ra="${x}" ${dis}>${x ? x + ' giây' : 'Bấm tay'}</button>`).join('')}</div></div>`;
    const rv = o.revealAuto ? `Chiếu lại tự sang bước sau ${o.revealAuto} giây (chủ phòng tạm dừng được).` : 'Chiếu lại: chủ phòng bấm Tiếp từng bước.';
    const many = plan.length > n && n > 1 && o.gmode !== 'solo' ? ' Nhiều bước hơn số người nên có người làm 2 lần.' : '';
    h += `<p class="hint-txt">${o.gmode === 'solo' ? `Mỗi người tự vẽ ${plan.length} khung hoạt hình của riêng mình.` : o.gmode === 'crowd' ? (gs.length > 1 ? `Phòng ${n} người → <b>${gs.length} nhóm</b> (${gs.join(' + ')} người). Chuỗi chỉ chuyền trong nhóm, qua ${plan.length} người; cuối ván chiếu lần lượt từng nhóm.` : `Phòng ${n} người: 1 nhóm, mỗi chuỗi qua ${plan.length} người. Từ khoảng ${Math.max(8, Math.ceil(o.gSize * 1.5))} người sẽ chia nhóm.`) : o.gmode === 'custom' ? `${o.cSteps} bước, mỗi bước ${o.cTime} giây.` : `Có ${plan.length} bước, ai cũng được góp mặt vào mọi chuỗi.${many}`} ${rv}</p>`;
  }
  box.innerHTML = h;
  if (!isHost) return;
  $$('#settings [data-r]').forEach(b => b.onclick = () => net && net.setOpts({ rounds: o.rounds + +b.dataset.r }));
  $$('#settings [data-gm]').forEach(b => b.onclick = () => { net.setOpts({ gmode: b.dataset.gm }); fx.sfx.pop(); });
  $$('#settings [data-cs]').forEach(b => b.onclick = () => { const n = Math.max(2, Math.min(20, o.cSteps + +b.dataset.cs)); const ks = o.cKinds.slice(0, n); while (ks.length < n) ks.push(ks.length % 2 ? 'draw' : 'text'); net.setOpts({ cSteps: n, cKinds: ks }); });
  $$('#settings [data-fr]').forEach(b => b.onclick = () => {
    const n = lobby.players.length, d = +b.dataset.fr;
    if (o.gmode === 'solo') { net.setOpts({ frames: clampN(frameCount(o, 1) + d, FRAMES_SOLO[0], FRAMES_SOLO[1]) }); return; }
    // Tự động (theo số người) ↔ 4…16 khung
    const cur = o.frames ? frameCount(o, n) : 0, list = [0]; for (let x = FRAMES_ANIM[0]; x <= FRAMES_ANIM[1]; x++) list.push(x);
    net.setOpts({ frames: list[clampN(list.indexOf(cur) + d, 0, list.length - 1)] });
  });
  $$('#settings [data-gs]').forEach(b => b.onclick = () => net && net.setOpts({ gSize: clampN(o.gSize + +b.dataset.gs, GSIZE[0], GSIZE[1]) }));
  $$('#settings [data-ra]').forEach(b => b.onclick = () => { net.setOpts({ revealAuto: +b.dataset.ra }); fx.sfx.pop(); });
  const fpsEl = $('#s-fps'); if (fpsEl) { fpsEl.oninput = () => { $('#s-fps-v').textContent = fpsEl.value + ' khung/giây'; }; fpsEl.onchange = () => net && net.setOpts({ fps: +fpsEl.value }); }
  $$('#settings [data-ck]').forEach(b => b.onclick = () => { const ks = o.cKinds.slice(), i = +b.dataset.ck, L = ['text', 'draw', 'frame']; ks[i] = L[(L.indexOf(ks[i]) + 1) % 3]; net.setOpts({ cKinds: ks }); });
  $$('#settings [data-cat]').forEach(b => b.onclick = () => { const k = b.dataset.cat; const cats = o.cats.includes(k) ? o.cats.filter(x => x !== k) : [...o.cats, k]; if (!cats.length && !o.custom.length) { toast('Chọn ít nhất 1 chủ đề nha'); return; } net.setOpts({ cats }); });
  for (const [id, k] of [['s-draw', 'drawTime'], ['s-text', 'textTime'], ['s-ctime', 'cTime']]) {
    const el = $('#' + id); if (!el) continue;
    el.oninput = () => { $('#' + id + '-v').textContent = el.value + ' giây'; };
    el.onchange = () => net && net.setOpts({ [k]: +el.value });
  }
  const ta = $('#s-custom');
  if (ta) {
    let t; ta.oninput = () => { clearTimeout(t); t = setTimeout(() => net && net.setOpts({ custom: parseCustom(ta.value) }), 700); };
    ta.onblur = () => { clearTimeout(t); net.setOpts({ custom: parseCustom(ta.value) }); setTimeout(() => { if (settingsPending) { settingsKey = ''; renderSettings(); } }, 0); };
  }
  const only = $('#s-only'); if (only) only.onchange = () => net && net.setOpts({ onlyCustom: only.checked });
}
$('#btn-start').onclick = () => { fx.actx(); if (net && isHost) net.start(); };

// ---------- đồng hồ ----------
const RING = 2 * Math.PI * 19;
let clock = { end: 0, total: 0 }, lastSec = -1;
function setClock(v) { clock = { end: Date.now() + (v.left || 0), total: v.total || 0, on: !!v.total }; }
setInterval(() => {
  const g = active('screen-game'), t = active('screen-gartic'); if (!g && !t) return;
  const p = g ? 'g' : 't', box = $('#' + p + '-timer');
  if (!clock.on || !view) { box.classList.add('off'); $('#' + p + '-secs').textContent = '–'; return; }
  box.classList.remove('off');
  const left = Math.max(0, clock.end - Date.now()), secs = Math.ceil(left / 1000);
  $('#' + p + '-secs').textContent = secs;
  $('#' + p + '-ring').style.strokeDashoffset = RING * (1 - Math.min(1, left / clock.total));
  const urgent = secs <= 10 && ((g && view.phase === 'draw') || (t && view.phase === 'play'));
  // nhạc: đang vẽ/đoán; 15 giây cuối chuyển sang bài gấp gáp; hết ván về nhạc sảnh
  fx.musicMood(view.phase === 'end' ? 'lobby' : secs <= 15 && left > 0 && ((g && view.phase === 'draw') || (t && view.phase === 'play')) ? 'tense' : 'game');
  box.classList.toggle('urgent', urgent);
  if (secs !== lastSec) {
    if (urgent && secs > 0 && secs <= (g ? 10 : 5)) fx.sfx.tick();
    lastSec = secs;
  }
  if (t) { autoSubmit(left); garticTick(); }
}, 200);

// ======================= ĐOÁN HÌNH =======================
let gBoard = null, gTools = null, cv = 0, curTurn = null, canvasBuf = null, syncPending = false, chatKey = '', overlayKey = '', endShown = null, lastClose = 0, hintKey = '';
function ensureGBoard() {
  if (gBoard) return;
  gBoard = new Board($('#g-board'), { ...inkFx, onOps: ops => { if (!net || !view || view.drawer !== myId) return; net.draw(ops); cv++; } });
  gTools = buildToolbar($('#g-tools'), gBoard);
  gBoard.el.appendChild($('#g-overlay')); // hộp chọn từ / tổng kết nằm gọn trên mặt tranh
}
function requestSync() { if (syncPending || !net) return; syncPending = true; net.sync(); setTimeout(() => { syncPending = false; }, 3000); }
function onDraw(ops, n) {
  if (!view || view.mode !== 'guess' || !gBoard || syncPending) return;
  if (n !== cv + 1) { requestSync(); return; }
  gBoard.apply(ops); cv = n;
  const len = ops.reduce((t, o) => t + (o.p ? o.p.length / 2 : 0), 0); if (len) fx.scribble(Math.min(30, len * 2), 'pen', 0.45);
}
function onCanvas(m) {
  if (!view || view.mode !== 'guess' || m.tk !== curTurn) return;
  if (m.first) canvasBuf = [];
  if (!canvasBuf) return;
  canvasBuf.push(...m.ops);
  if (m.last) { ensureGBoard(); gBoard.setOps(canvasBuf); cv = m.cv; canvasBuf = null; syncPending = false; }
}
function renderGuess(v, p) {
  if (!active('screen-game')) { closeModal(); show('screen-game'); }
  ensureGBoard();
  const me = v.players.find(x => x.id === myId) || {};
  const amDrawer = v.drawer === myId, drawing = amDrawer && v.phase === 'draw';
  $('#screen-game').classList.toggle('is-drawer', drawing);
  gBoard.setEditable(drawing); gTools.closePop();
  if (v.turnKey !== curTurn) { curTurn = v.turnKey; gBoard.setOps([]); cv = v.cv; canvasBuf = null; syncPending = false; if (isHost) requestSync(); }
  else if (v.cv > cv && !drawing) requestSync();
  setClock(v);
  // thanh trên: vòng + gợi ý
  const dn = esc(pname(v.drawer));
  $('#g-cap').innerHTML = v.phase === 'end' ? '🏁 Hết ván' : `Vòng ${Math.min(v.round, v.rounds)}/${v.rounds} · ${v.phase === 'choose' ? (amDrawer ? 'bạn chọn từ' : dn + ' đang chọn từ') : v.phase === 'draw' ? (amDrawer ? 'bạn đang vẽ ✏️' : dn + ' đang vẽ') : 'hết lượt'}`;
  let hint;
  if (v.word && (v.phase === 'draw' || v.phase === 'turnEnd')) hint = `<span class="word ${amDrawer ? 'mine' : 'got'} ${[...v.word].length > 14 ? 'long' : ''}">${esc(v.word)}</span>`;
  else if (v.mask) {
    const words = v.mask.join('').split(' ');
    hint = words.map(w => `<span class="w">${[...w].map(ch => `<i class="${ch === '_' ? 'blank' : 'shown'}">${ch === '_' ? '' : esc(ch)}</i>`).join('')}</span>`).join('') + `<small class="lens">${v.lens.join(' ')}</small>`;
  } else hint = '<span class="dots">…</span>';
  const hk = v.turnKey + '|' + hint;
  if (hk !== hintKey) { const was = hintKey.split('|')[0] === String(v.turnKey) && v.mask; hintKey = hk; $('#g-hint').innerHTML = hint; if (was && v.phase === 'draw' && p && p.phase === 'draw') { fx.pop($('#g-hint')); fx.sfx.pop(); } }
  renderPlayers(v);
  renderChat(v);
  renderOverlay(v);
  const inp = $('#g-input');
  inp.placeholder = amDrawer && v.phase === 'draw' ? 'Chat (không được lộ đáp án 🤐)' : me.guessed && v.phase === 'draw' ? 'Bạn đoán ra rồi – chat kín với hội đã đoán 🤫' : 'Gõ đáp án ở đây…';
  inp.parentElement.classList.toggle('secret', !!(me.guessed && v.phase === 'draw'));
  // hiệu ứng theo thay đổi
  if (p && p.turnKey === v.turnKey) {
    for (const pl of v.players) {
      const was = p.players.find(x => x.id === pl.id);
      if (pl.guessed && was && !was.guessed) {
        const chip = $(`#g-players [data-id="${pl.id}"]`);
        if (pl.id === myId) { fx.sfx.mine(); fx.banner(`Chính xác! +${pl.gain} 🎉`, 'ok'); fx.confetti(50); }
        else { fx.sfx.correct(); fx.banner(`${pl.name} đoán ra rồi! 🎯`, 'blue'); }
        fx.burst(chip); fx.floatUp('+' + pl.gain, chip, 'pts'); fx.pop(chip, 'bump');
      }
    }
    if (p.phase === 'choose' && v.phase === 'draw') { fx.sfx.turn(); if (amDrawer) fx.banner('Vẽ đi nào! ✏️', 'blue'); }
    if (p.phase === 'draw' && v.phase === 'turnEnd') { if (v.endReason === 'time') { fx.sfx.timeUp(); fx.banner('Hết giờ! ⏰', 'red'); } else if (v.endReason === 'all') fx.banner('Cả phòng đoán ra! 🙌', 'ok'); }
  }
  if (v.turnKey !== (p && p.turnKey) && v.phase === 'choose' && amDrawer) { fx.sfx.myTurn(); fx.banner('Tới lượt bạn vẽ! 🎨', 'blue'); }
  const close = v.chat.filter(m => m.close).pop();
  if (close && close.id > lastClose) { if (lastClose) { fx.sfx.close(); fx.banner('Gần đúng rồi! 🔥', 'orange'); fx.pop($('#g-form'), 'shake'); } lastClose = close.id; }
  if (v.phase === 'end' && endShown !== v.gid) { endShown = v.gid; fx.sfx.win(); fx.fireworks(); showResults(v); }
}
function renderPlayers(v) {
  const order = v.players.slice().sort((a, b) => b.score - a.score);
  const rank = new Map(order.map((p, i) => [p.id, i + 1]));
  $('#g-players').innerHTML = v.players.map(p => `<div class="pl ${p.guessed ? 'ok' : ''} ${p.id === v.drawer && v.phase !== 'end' ? 'drawer' : ''} ${p.on ? '' : 'off'} ${p.id === myId ? 'me' : ''}" data-id="${p.id}" style="order:${rank.get(p.id)}">
    <span class="rk">#${rank.get(p.id)}</span>${avatar(p.name)}<span class="pi"><b>${esc(p.name)}${p.id === myId ? ' <small>(bạn)</small>' : ''}</b><small>${p.score} điểm${p.gain && (v.phase === 'turnEnd' || p.guessed) ? ` <em>+${p.gain}</em>` : ''}</small></span>
    <span class="st">${p.id === v.drawer && v.phase !== 'end' ? '✏️' : p.guessed ? '✅' : !p.on ? '📴' : ''}</span></div>`).join('');
}
function renderChat(v) {
  const key = v.chat.map(m => m.id).join(',');
  if (key === chatKey) return;
  const log = $('#g-chat'), near = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
  const old = chatKey ? Math.max(...chatKey.split(',').map(Number)) : 0;
  chatKey = key;
  log.innerHTML = v.chat.map(m => {
    if (m.kind === 'sys') return `<li class="sys ${m.close ? 'close' : ''} ${m.warn ? 'warn' : ''} ${m.ans ? 'ans' : ''}">${esc(m.text)}</li>`;
    if (m.kind === 'ok') return `<li class="okm">🎉 ${esc(m.text)}</li>`;
    return `<li class="${m.in ? 'inner' : ''} ${m.from === myId ? 'mine' : ''}">${m.in ? '<span class="lock">🤫</span>' : ''}<b style="color:${avColor(m.name)}">${esc(m.name)}</b> ${esc(m.text)}</li>`;
  }).join('');
  if (near || v.chat.some(m => m.id > old && m.from === myId)) log.scrollTop = log.scrollHeight;
  if (old && v.chat.some(m => m.id > old && m.kind === 'chat' && m.from !== myId)) fx.sfx.pop();
}
function renderOverlay(v) {
  const ov = $('#g-overlay'), amDrawer = v.drawer === myId;
  const key = [v.phase, v.turnKey, amDrawer, v.phase === 'turnEnd' || v.phase === 'end' ? JSON.stringify(v.players.map(p => [p.id, p.gain, p.score])) : ''].join('|');
  if (key === overlayKey) return; overlayKey = key;
  let h = '';
  if (v.phase === 'choose') {
    h = amDrawer
      ? `<div class="ov-card"><h3>Chọn 1 từ để vẽ ✏️</h3><div class="choices">${v.choices.map((w, i) => `<button class="btn choice" data-i="${i}">${esc(w)}</button>`).join('')}</div><button class="link" id="ov-skip">Bỏ lượt này</button></div>`
      : `<div class="ov-card">${avatar(pname(v.drawer), 'big wiggle')}<h3>${esc(pname(v.drawer))} đang chọn từ…</h3><p class="muted">Chuẩn bị tinh thần đoán nha 👀</p></div>`;
  } else if (v.phase === 'turnEnd') {
    const gains = v.players.filter(p => p.gain).sort((a, b) => b.gain - a.gain);
    const why = { all: 'Cả phòng đoán ra! 🙌', time: 'Hết giờ ⏰', left: 'Hoạ sĩ rớt mạng 📴', skip: 'Hoạ sĩ bỏ lượt 🏳️' }[v.endReason] || '';
    h = `<div class="ov-card">${v.word ? `<small class="muted">Đáp án là</small><h2 class="ans-word">${esc(v.word)}</h2>` : '<h3>Bỏ lượt</h3>'}<p class="muted">${why}</p>
      <ul class="gains">${gains.length ? gains.map(p => `<li>${avatar(p.name)}<span>${esc(p.name)}${p.id === v.drawer ? ' ✏️' : ''}</span><b>+${p.gain}</b></li>`).join('') : '<li class="none">Không ai ăn điểm lượt này 😶</li>'}</ul></div>`;
  } else if (v.phase === 'end') {
    h = `<div class="ov-card"><h2>🏁 Hết ván!</h2><button class="btn pri" id="ov-res">🏆 Xem bảng điểm</button></div>`;
  }
  ov.hidden = !h; ov.innerHTML = h;
  $$('#g-overlay [data-i]').forEach(b => b.onclick = () => { fx.sfx.choose(); net.act({ type: 'choose', idx: +b.dataset.i }); });
  const sk = $('#ov-skip'); if (sk) sk.onclick = () => net && net.act({ type: 'skip' });
  const rs = $('#ov-res'); if (rs) rs.onclick = () => showResults(view);
}
function showResults(v) {
  const ps = v.players.slice().sort((a, b) => b.score - a.score);
  const medal = ['🥇', '🥈', '🥉'];
  const pod = [1, 0, 2].filter(i => ps[i]).map(i => `<div class="pod p${i + 1}">${avatar(ps[i].name, 'big')}<b>${esc(ps[i].name)}</b><small>${ps[i].score} điểm</small><div class="step">${medal[i]}</div></div>`).join('');
  openModal(`<h2 class="center">🏆 Bảng vàng</h2><div class="podium">${pod}</div>
    <ol class="final">${ps.map((p, i) => `<li class="${p.id === myId ? 'me' : ''}"><span>${i + 1}</span>${avatar(p.name)}<b>${esc(p.name)}</b><em>${p.score}</em></li>`).join('')}</ol>
    <div class="m-btns">${isHost ? '<button class="btn pri" id="m-again">🔁 Ván mới</button>' : '<p class="muted">Đợi chủ phòng mở ván mới…</p>'}<button class="btn" data-close>Đóng</button></div>`, 'results');
  const a = $('#m-again'); if (a) a.onclick = () => { closeModal(); net && net.restart(); };
}
$('#g-form').addEventListener('submit', e => {
  e.preventDefault(); const inp = $('#g-input'), t = inp.value.trim(); if (!t || !net) return;
  net.act({ type: 'guess', text: t }); inp.value = ''; fx.sfx.send();
});

// ======================= TAM SAO THẤT BẢN =======================
let tBoard = null, tTools = null, tStepKey = null, tEditing = false, tKind = null, autoSent = {}, draftT, tTask = null, tPeekShown = null, tMaskShown = null;
const book = new Map(); let bookGid = null, bookAsked = 0;
// kiểu bước: [biểu tượng, nhãn, động từ trong album]
const ROLE = {
  write: ['✍️', 'Viết câu', 'viết'], guess: ['🤔', 'Đoán', 'đoán'], draw: ['🎨', 'Vẽ', 'vẽ'], copy: ['👀', 'Vẽ lại', 'vẽ lại'], question: ['❓', 'Đặt câu hỏi', 'hỏi'],
  answer: ['💬', 'Vẽ câu trả lời', 'trả lời'], doodle: ['〰️', 'Vẽ bậy', 'vẽ bậy'], extend: ['🖍️', 'Vẽ tiếp', 'vẽ tiếp'], frame: ['🎞️', 'Khung hình', 'vẽ khung'],
  bg: ['🏞️', 'Phông nền', 'vẽ phông'], retell: ['🔁', 'Viết lại', 'viết lại'], free: ['🎨', 'Vẽ tự do', 'vẽ'],
};
const roleOf = (v, k) => (v.plan && v.plan[k]) || (k === 0 ? 'write' : k % 2 ? 'draw' : 'guess');
const QS = ['Món ăn tủ của bạn là gì?', 'Nếu trúng số 1 tỷ bạn làm gì đầu tiên?', 'Siêu năng lực bạn muốn có?', 'Con vật nào giống bạn nhất?', 'Cuối tuần này đi đâu chơi?', 'Hồi bé bạn mơ làm nghề gì?', 'Thứ không thể thiếu khi đi du lịch?', 'Món quà sinh nhật tệ nhất có thể?', 'Bạn sợ nhất con gì?', 'Nếu được đổi thân xác với ai 1 ngày?'];
const DKEY = 'scribble-draft';
function ensureTBoard() {
  if (tBoard) return;
  tBoard = new Board($('#t-board'), { ...inkFx, onChange: () => { clearTimeout(draftT); draftT = setTimeout(saveDraft, 400); } });
  tTools = buildToolbar($('#t-tools'), tBoard);
}
function saveDraft() {
  if (!tStepKey) return;
  const d = { k: tStepKey }; if (tKind === 'draw' && tBoard) d.ops = tBoard.ops; else d.text = $('#t-input').value;
  try { localStorage.setItem(DKEY, JSON.stringify(d)); } catch (e) {}
}
function loadDraft(k) { try { const d = JSON.parse(localStorage.getItem(DKEY)); return d && d.k === k ? d : null; } catch (e) { return null; } }
$('#t-input').addEventListener('input', () => { clearTimeout(draftT); draftT = setTimeout(saveDraft, 400); });
$('#t-dice').onclick = () => { $('#t-input').value = tTask && tTask.role === 'question' ? QS[Math.floor(Math.random() * QS.length)] : randomPrompt(); saveDraft(); fx.sfx.pop(); };
const stepElapsed = () => clock.total ? clock.total - Math.max(0, clock.end - Date.now()) : 0;
function renderGartic(v, p) {
  if (!active('screen-gartic')) { closeModal(); show('screen-gartic'); }
  ensureTBoard();
  if (v.gid !== bookGid) { book.clear(); bookGid = v.gid; bookAsked = 0; revealDom = null; }
  setClock(v);
  const gm = GMODES[v.gmode] || GMODES.normal, R0 = ROLE[v.kind] || ROLE.write;
  $('#t-cap').textContent = v.phase === 'play' ? `${gm.icon} Bước ${v.step + 1}/${v.steps} · ${R0[1]}` : v.phase === 'reveal' ? `${gm.icon} Chiếu lại${nGroups(v) ? ` · Nhóm ${grpOf(v, v.reveal.c)[0] + 1}/${nGroups(v)}` : ''}${v.reveal.auto ? (v.reveal.paused ? ' · ⏸️ tạm dừng' : ` · tự chiếu ${v.reveal.auto}s`) : ''}` : `📚 Album · ${gm.name}`;
  $('#t-steps').innerHTML = Array.from({ length: v.steps }, (_, i) => { const r = ROLE[roleOf(v, i)] || ROLE.write; return `<i class="${v.phase !== 'play' || i < v.step ? 'done' : i === v.step ? 'cur' : ''}" title="${r[1]}">${r[0]}</i>`; }).join('');
  const play = $('#t-play'), wait = $('#t-wait'), rev = $('#t-reveal');
  if (v.phase === 'play') {
    rev.hidden = true; stopAnims();
    const t = v.task; tTask = t;
    if (!t) { play.hidden = true; wait.hidden = false; wait.innerHTML = waitHTML(v, false); return; }
    const key = v.gid + ':' + v.step;
    if (key !== tStepKey) setupStep(v, t, key);
    const showWait = t.done && !tEditing;
    play.hidden = showWait; wait.hidden = !showWait;
    $('#screen-gartic').classList.toggle('is-drawer', !showWait && t.kind === 'draw');
    if (showWait) { wait.innerHTML = waitHTML(v, true); $('#t-edit').onclick = () => { tEditing = true; renderGartic(view, null); }; }
    $('#t-done').textContent = t.done ? 'Nộp lại ✓' : 'Xong ✓';
    if (t.kind === 'draw') tBoard.setEditable(!showWait && !peeking());
    if (p && p.step === v.step) { const n = v.players.filter(x => x.done).length, n0 = p.players.filter(x => x.done).length; if (n > n0 && showWait) fx.sfx.pop(); }
    garticTick();
  } else {
    play.hidden = true; wait.hidden = true; rev.hidden = false; tBoard.setEditable(false); tStepKey = null; tTask = null; hidePeek();
    $('#screen-gartic').classList.remove('is-drawer');
    if (!v.chains.every((_, c) => book.has(c + ':0')) && Date.now() - bookAsked > 4000) { bookAsked = Date.now(); net.needBook(); }
    renderReveal(v, p);
  }
}
function waitHTML(v, mine) {
  const done = v.players.filter(x => x.done).length;
  const extra = v.task && v.task.desc && v.task.desc.blind ? '<p class="muted">🙈 Tranh vẽ mù của bạn sẽ được mở ra lúc chiếu lại.</p>' : '';
  return `<div class="wait-card"><div class="big-emo">${mine ? '✅' : '👀'}</div><h3>${mine ? 'Đã nộp! Ngồi chờ hội bạn nha' : 'Đang xem ván…'}</h3>
    <p class="muted">${done}/${v.players.length} người xong</p>${extra}${grpWho(v)}
    <ul class="who">${whoList(v).map(x => `<li data-id="${x.id}" class="${x.done ? 'done' : ''} ${x.on ? '' : 'off'}">${avatar(x.name)}<span>${esc(x.name)}</span><b>${x.done ? '✓' : x.on ? '…' : '📴'}</b></li>`).join('')}</ul>
    ${mine ? '<button class="btn" id="t-edit">✏️ Sửa lại</button>' : ''}</div>`;
}
// Đông vui: phòng tới 30 người -> chỉ liệt kê nhóm của mình
function whoList(v) {
  if (!nGroups(v)) return v.players;
  const i = Math.max(0, v.chains.indexOf(myId)), [, a, g] = grpOf(v, i), ids = new Set(v.chains.slice(a, a + g));
  return v.players.filter(x => ids.has(x.id));
}
function grpWho(v) {
  if (!nGroups(v)) return '';
  const [j] = grpOf(v, Math.max(0, v.chains.indexOf(myId))), mine = whoList(v);
  return `<p class="grp-line"><span class="grp">Nhóm ${j + 1}/${nGroups(v)}</span> nhóm bạn: ${mine.filter(x => x.done).length}/${mine.length} xong</p>`;
}
// che đề (Vẽ mù): giữ chữ cái đầu mỗi từ, hoặc che hết
const maskText = (t, all) => all ? '❓❓❓' : String(t).split(' ').map(w => [...w][0] + '•'.repeat(Math.max(0, [...w].length - 1))).join(' ');
function setupStep(v, t, key) {
  tStepKey = key; tEditing = false; tKind = t.kind; tPeekShown = null; tMaskShown = null; hidePeek();
  const d = loadDraft(key), pr = $('#t-prompt'), inp = $('#t-input'), role = t.role || t.kind, ds = t.desc || {};
  const sg = $('#screen-gartic'); sg.dataset.kind = t.kind; sg.dataset.role = role;
  const q = x => `<b class="q">“${esc(x)}”</b>`, sugg = t.sugg ? `<small>💡 Bí ý tưởng? Thử: <i>${esc(t.sugg)}</i></small>` : '';
  const H = {
    write: `<span class="emo">✍️</span><div><b>Viết một câu thật bá đạo</b><small>Người kế tiếp sẽ phải vẽ lại câu này 😈</small></div>`,
    question: `<span class="emo">❓</span><div><b>Đặt 1 câu hỏi cho cả bọn</b><small>Mọi người sẽ <b>vẽ</b> câu trả lời – giấu tới cuối ván mới chiếu 🤫</small></div>`,
    retell: `<span class="emo">🔁</span><div><small>Viết lại câu này theo kiểu của bạn:</small>${q(t.prompt ? t.prompt.t : '')}</div>`,
    guess: `<span class="emo">🤔</span><div><b>Người trước vẽ cái gì đây?</b><small>Đoán thành 1 câu nhé</small></div>`,
    draw: `<span class="emo">🎨</span><div><small>Vẽ lại câu này:</small><span id="t-q">${q(t.prompt ? t.prompt.t : '')}</span>${ds.mask ? `<small id="t-qn">🙈 Đề sẽ bị che sau ${Math.round(ds.mask / 1000)} giây – nhìn nhanh!</small>` : ''}</div>`,
    answer: `<span class="emo">💬</span><div><small>Vẽ câu trả lời của bạn cho câu hỏi:</small>${q(t.prompt ? t.prompt.t : '')}</div>`,
    copy: `<span class="emo">👀</span><div><b>${ds.peek ? 'Nhìn kỹ rồi vẽ lại y chang!' : 'Chép lại hình này'}</b><small id="t-qn">${ds.peek ? `Chỉ được nhìn ${Math.round(ds.peek / 1000)} giây rồi bị che – vẽ theo trí nhớ` : 'Hình mẫu ở bên cạnh 👉'}</small></div>${!ds.peek && t.prompt && t.prompt.d ? '<div class="ref" id="t-ref"></div>' : ''}`,
    doodle: `<span class="emo">〰️</span><div><b>Vẽ vài nét bậy thật nhanh!</b><small>Người sau sẽ vẽ tiếp lên đó 😈</small></div>`,
    extend: `<span class="emo">🖍️</span><div><b>Vẽ tiếp lên tranh này</b><small>Nét cũ không xoá được – biến nó thành thứ gì đó hay ho!</small></div>`,
    frame: t.onion ? `<span class="emo">🎞️</span><div><b>${t.frame ? `Khung ${t.frame}/${v.steps} – ` : ''}Vẽ khung kế tiếp</b><small>Khung trước hiện mờ – nhích từng chút cho thành chuyển động</small></div>`
      : `<span class="emo">🎞️</span><div><b>${t.frame ? `Khung 1/${v.steps} – ` : ''}${t.prompt && t.prompt.t ? 'Vẽ khung đầu cho câu này:' : 'Vẽ khung đầu tiên của đoạn hoạt hình'}</b>${t.prompt && t.prompt.t ? q(t.prompt.t) : sugg}</div>`,
    bg: `<span class="emo">🏞️</span><div><b>Vẽ phông nền</b><small>Phông này giữ nguyên, mọi khung sau vẽ đè lên</small>${sugg}</div>`,
    free: `<span class="emo">🎨</span><div><b>Vẽ gì cũng được!</b>${sugg}</div>`,
  };
  pr.innerHTML = H[role] || H.draw;
  if (role === 'frame' && ds.layer && t.onion) pr.querySelector('small').textContent = 'Phông nền giữ nguyên, khung trước hiện mờ – vẽ nhân vật nhích dần';
  const ref = $('#t-ref'); if (ref) ref.appendChild(opsToCanvas(t.prompt.d));
  if (t.kind === 'draw') {
    tBoard.setOnion(t.onion || null); tBoard.setBlind(!!ds.blind); tBoard.setBase(t.base || []);
    $('#t-board').classList.toggle('blindwrap', !!ds.blind);
    tBoard.setOps(d && d.ops || []); tBoard.setEditable(true); tTools.refresh();
  } else {
    tBoard.setOnion(null); tBoard.setBlind(false); tBoard.setBase([]); $('#t-board').classList.remove('blindwrap');
    if (t.kind === 'guess') { tBoard.setOps(t.prompt && t.prompt.d || []); tBoard.setEditable(false); }
    inp.value = d && d.text || '';
    inp.placeholder = role === 'question' ? 'VD: Món ăn tủ của bạn là gì?' : role === 'write' ? 'VD: Con mèo đang hát karaoke ở chợ Bến Thành' : role === 'retell' ? 'Viết lại theo ý bạn…' : 'Mình đoán là…';
  }
  if (v.step > 0) { fx.sfx.turn(); fx.banner(`${(ROLE[role] || ROLE.draw)[0]} ${(ROLE[role] || ROLE.draw)[1]}!`, 'blue'); }
}
// Nhìn trộm / Bánh mì kẹp: hiện hình mẫu che lên bảng vẽ trong vài giây đầu (tính theo đồng hồ của chủ phòng nên tải lại trang không được xem lại)
const peeking = () => { const t = tTask; return !!(t && t.desc && t.desc.peek && t.prompt && t.prompt.d && stepElapsed() < t.desc.peek && !t.done); };
function hidePeek() { const o = $('#t-peek'); if (o) o.remove(); }
function garticTick() {
  const t = tTask, v = view; if (!t || !v || v.phase !== 'play' || !tStepKey) return;
  const ds = t.desc || {};
  if (ds.peek && t.prompt && t.prompt.d) {
    const left = ds.peek - stepElapsed();
    if (left > 0 && !t.done) {
      let o = $('#t-peek');
      if (!o) { o = document.createElement('div'); o.id = 't-peek'; o.className = 'peek'; o.innerHTML = '<b class="cd"></b><small>Nhớ kỹ nhé! 👀</small>'; o.prepend(opsToCanvas(t.prompt.d)); $('#t-board').appendChild(o); tBoard.setEditable(false); tPeekShown = tStepKey; }
      o.querySelector('.cd').textContent = Math.ceil(left / 1000);
    } else if ($('#t-peek')) { hidePeek(); if (!t.done || tEditing) tBoard.setEditable(true); if (tPeekShown === tStepKey) { fx.sfx.pop(); toast('🙈 Hết giờ nhìn – vẽ theo trí nhớ!'); } $('#t-qn') && ($('#t-qn').textContent = 'Hình đã bị che – vẽ theo trí nhớ nhé 🧠'); }
  }
  if (ds.mask && t.prompt && t.prompt.t && stepElapsed() >= ds.mask && tMaskShown !== tStepKey) {
    tMaskShown = tStepKey; const qe = $('#t-q');
    if (qe) { qe.innerHTML = `<b class="q masked">“${esc(maskText(t.prompt.t, ds.maskAll))}”</b>`; const n = $('#t-qn'); if (n) n.textContent = ds.maskAll ? '🙈 Đề đã bị che hết – nhớ được bao nhiêu vẽ bấy nhiêu!' : '🙈 Đề đã bị che bớt – chỉ còn chữ cái đầu!'; }
  }
}
function submitTask(auto = false) {
  const v = view; if (!v || v.mode !== 'gartic' || v.phase !== 'play' || !v.task) return;
  const t = v.task;
  if (t.kind === 'draw') {
    let ops = tBoard.getOps(); if (opsBytes(ops) > 140000) ops = simplifyOps(ops, 140000);
    net.act({ type: 'submit', step: v.step, ops });
  } else {
    let text = $('#t-input').value.trim();
    if (!text) { if (!auto) { toast('Viết gì đó đi nè ✍️'); fx.pop($('#t-form'), 'shake'); return; } text = t.role === 'question' ? QS[Math.floor(Math.random() * QS.length)] : t.kind === 'write' ? randomPrompt() : '🤷 (bí quá)'; }
    net.act({ type: 'submit', step: v.step, text });
  }
  tEditing = false; autoSent[tStepKey] = true;
  if (!auto) fx.sfx.submit();
}
function autoSubmit(left) {
  const v = view; if (!v || v.mode !== 'gartic' || v.phase !== 'play' || !v.task || !tStepKey) return;
  if (left > 500 || autoSent[tStepKey]) return;
  if (v.task.done && !tEditing) return;
  submitTask(true); toast('Hết giờ – đã tự nộp ⏰');
}
$('#t-done').onclick = () => { if (peeking()) { toast('Đợi hết giờ nhìn đã nha 👀'); return; } submitTask(false); };
$('#t-form').addEventListener('submit', e => { e.preventDefault(); submitTask(false); });

// ---------- chiếu lại & album ----------
let revealDom = null, albumSel = 0, endShownT = null;
const drawCache = new Map();
function drawingImg(key, ops) {
  if (!drawCache.has(key)) { const c = opsToCanvas(ops); c.className = 'drawing'; drawCache.set(key, c); }
  return drawCache.get(key);
}
function onBook(m) {
  if (m.gid !== bookGid) { book.clear(); bookGid = m.gid; drawCache.clear(); }
  for (const it of m.items) book.set(it.key, it);
  if (view && view.mode === 'gartic' && (view.phase === 'reveal' || view.phase === 'end')) { revealDom = null; renderReveal(view, null); }
}
const isFrameRole = r => r === 'frame' || r === 'bg';
function itemHTML(v, c, k) {
  const it = book.get(c + ':' + k), role = roleOf(v, k), kind = it && it.d ? 'draw' : k === 0 ? 'write' : 'guess';
  const verb = (ROLE[role] || ROLE.draw)[2];
  const who = it ? pname(it.by) : '…';
  const vote = v.gmode === 'score' && k > 0 ? `<div class="votes"><button class="vt" data-v="1" ${it && it.by === myId ? 'disabled title="Không tự chấm mình"' : 'title="Khớp với bước trước"'}>👍 <small></small></button><button class="vt" data-v="-1" ${it && it.by === myId ? 'disabled' : 'title="Lệch khỏi bước trước"'}>👎 <small></small></button></div>` : '';
  return `<div class="item ${kind} r-${role}" data-key="${c}:${k}"><div class="by">${avatar(who)}<span><b>${esc(who)}</b> ${verb}${isFrameRole(role) && v.gmode !== 'background' ? ` <small>· khung ${k + 1}</small>` : ''}${it && it.miss ? ' <small>(hết giờ)</small>' : ''}</span></div>
    <div class="content">${!it ? '<div class="bubble muted">Đang tải…</div>' : it.d ? '<div class="pic"></div>' : `<div class="bubble">${esc(it.t)}</div>`}</div>
    ${vote}<div class="reacts">${REACTS.map(e => `<button class="re" data-e="${e}">${e}<small></small></button>`).join('')}</div></div>`;
}
// ---- hoạt hình: chiếu lặp các khung của 1 chuỗi, chỉnh tốc độ, tải GIF / ảnh ghép ----
let anims = [], animFps = 4, animFpsGid = null; // tốc độ phim: mặc định do chủ phòng chọn trong sảnh, mỗi người kéo lại được
function stopAnims() { anims.forEach(a => clearInterval(a.t)); anims = []; }
function framesOf(v, c) {
  const out = [];
  for (let k = 0; k < v.steps; k++) {
    const r = roleOf(v, k); if (r !== 'frame' && !(r === 'bg' && v.gmode !== 'background')) continue;
    const it = book.get(c + ':' + k); if (it && it.d) out.push(drawingImg(c + ':' + k, it.d));
  }
  return out;
}
function animHTML() { return `<div class="anim"><div class="anim-head">🎬 <b>Thành phim!</b> <small>Chiếu lặp các khung</small></div><canvas width="400" height="300"></canvas>
  <label class="set"><span>Tốc độ <b class="fps">4 khung/giây</b></span><input type="range" class="anim-fps" min="1" max="12" step="1" value="4"></label>
  <div class="dl-row"><button class="btn sm anim-gif">⬇ GIF</button><button class="btn sm anim-strip">⬇ Ảnh ghép</button></div></div>`; }
function mountAnim(el, v, c) {
  const frames = framesOf(v, c); if (frames.length < 2) { el.remove(); return; }
  if (animFpsGid !== v.gid) { animFpsGid = v.gid; animFps = (v.opts && v.opts.fps) || 4; }
  const cv = el.querySelector('canvas'), ctx = cv.getContext('2d'); let i = 0, fps = animFps;
  el.querySelector('.anim-fps').value = fps;
  const show = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 300); ctx.drawImage(frames[i % frames.length], 0, 0, 400, 300); i++; };
  const a = { t: 0 }; const run = () => { clearInterval(a.t); a.t = setInterval(show, 1000 / fps); el.querySelector('.fps').textContent = fps + ' khung/giây'; };
  show(); run(); anims.push(a);
  el.querySelector('.anim-fps').oninput = e => { fps = animFps = +e.target.value; run(); };
  const nm = fname(pname(v.chains[c]));
  el.querySelector('.anim-gif').onclick = () => {
    const off = document.createElement('canvas'); off.width = 400; off.height = 300; const o = off.getContext('2d', { willReadFrequently: true });
    const imgs = frames.map(f => { o.fillStyle = '#fff'; o.fillRect(0, 0, 400, 300); o.drawImage(f, 0, 0, 400, 300); return o.getImageData(0, 0, 400, 300); });
    const bytes = encodeGif(imgs, { delay: Math.max(2, Math.round(100 / fps)) });
    const u = URL.createObjectURL(new Blob([bytes], { type: 'image/gif' })); const l = document.createElement('a'); l.href = u; l.download = `scribble-hoathinh-${nm}.gif`; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Đã lưu GIF 🎞️');
  };
  el.querySelector('.anim-strip').onclick = () => {
    const cols = Math.min(5, frames.length), rows = Math.ceil(frames.length / cols), cw = 400, ch = 300, g = 12;
    const out = document.createElement('canvas'); out.width = cols * cw + (cols + 1) * g; out.height = rows * ch + (rows + 1) * g + 40; const o = out.getContext('2d');
    o.fillStyle = '#fff8e8'; o.fillRect(0, 0, out.width, out.height); o.fillStyle = '#1f2340'; o.font = '700 22px "Be Vietnam Pro", sans-serif'; o.fillText(`Hoạt hình của ${pname(v.chains[c])} · Scribble it!`, g, 28);
    frames.forEach((f, j) => { const x = g + (j % cols) * (cw + g), y = 40 + g + Math.floor(j / cols) * (ch + g); o.drawImage(f, x, y, cw, ch); o.strokeStyle = '#1f2340'; o.lineWidth = 2; o.strokeRect(x, y, cw, ch); o.fillText(String(j + 1), x + 8, y + 26); });
    download(out, `scribble-hoathinh-${nm}.png`);
  };
}
function leaderHTML(v) {
  if (!v.scores) return '';
  const rows = Object.entries(v.scores).sort((a, b) => b[1] - a[1]);
  return `<div class="lb"><h4>🏆 Bảng điểm</h4><ol>${rows.map(([id, pt], i) => `<li class="${id === myId ? 'me' : ''}"><span>${i === 0 && pt > 0 ? '👑' : i + 1 + '.'}</span>${avatar(pname(id))}<b>${esc(pname(id))}</b><i>${pt}</i></li>`).join('')}</ol><small class="muted">+100 mỗi 👍 · chuỗi giữ được ý gốc: mọi người góp mặt +200</small></div>`;
}
let lastGrpBanner = '';
function renderReveal(v, p) {
  const box = $('#t-reveal'), n = v.chains.length;
  const end = v.phase === 'end';
  const c = end ? Math.min(albumSel, n - 1) : v.reveal.c, upto = end ? v.steps - 1 : v.reveal.u;
  const G = nGroups(v), [gj, ga, gg] = grpOf(v, c);
  const dk = v.gid + '|' + c + '|' + end;
  if (!revealDom || revealDom.key !== dk) {
    stopAnims();
    const kept = v.kept && v.kept[c] != null ? (v.kept[c] ? ' <span class="kept ok">✅ giữ được ý gốc</span>' : ' <span class="kept">💥 lạc đề</span>') : '';
    const chip = i => `<button class="chip ${i === c ? 'on' : ''}" data-tab="${i}">${esc(pname(v.chains[i]))}</button>`;
    const tabs = !end ? '' : (G ? `<div class="tabs grp-tabs">${v.groups.map(([a], j) => `<button class="chip sm ${j === gj ? 'on' : ''}" data-tab="${a}">Nhóm ${j + 1}</button>`).join('')}</div>` : '')
      + `<div class="tabs">${Array.from({ length: G ? gg : n }, (_, i) => chip(G ? ga + i : i)).join('')}</div>`;
    box.innerHTML = `<div class="rv-head">${tabs}
      <h3>${avatar(pname(v.chains[c]))} <span class="rv-t">${v.gmode === 'icebreaker' ? 'Câu hỏi của' : v.rot === false ? 'Hoạt hình của' : 'Chuỗi của'} ${esc(pname(v.chains[c]))}</span> <small>${G ? `${c - ga + 1}/${gg}` : `${c + 1}/${n}`}</small>${G ? ` <span class="grp">Nhóm ${gj + 1}/${G}</span>` : ''}${kept}</h3></div>
      <div class="feed" id="t-feed"></div><div class="rv-bar" id="t-bar"></div>`;
    revealDom = { key: dk, shown: -1, anim: false, bar: '' };
    $$('#t-reveal [data-tab]').forEach(b => b.onclick = () => { albumSel = +b.dataset.tab; revealDom = null; renderReveal(view, null); });
    // Đông vui: sang nhóm mới thì báo to
    if (G && !end && v.reveal.u === 0 && c === ga && lastGrpBanner !== v.gid + ':' + gj) { lastGrpBanner = v.gid + ':' + gj; fx.banner(`Nhóm ${gj + 1}/${G} 🎉`, 'blue'); }
  }
  const feed = $('#t-feed');
  for (let k = revealDom.shown + 1; k <= upto; k++) {
    feed.insertAdjacentHTML('beforeend', itemHTML(v, c, k));
    const el = feed.lastElementChild, it = book.get(c + ':' + k);
    if (it && it.d) el.querySelector('.pic').appendChild(drawingImg(c + ':' + k, it.d));
    if (!end && revealDom.shown >= 0) { el.classList.add('pop-in'); fx.sfx.reveal(); }
    el.querySelectorAll('.re').forEach(b => b.onclick = () => { fx.sfx.react(); net.act({ type: 'react', key: el.dataset.key, e: b.dataset.e }); });
    el.querySelectorAll('.vt').forEach(b => b.onclick = () => { fx.sfx.pop(); net.act({ type: 'vote', key: el.dataset.key, v: +b.dataset.v }); });
  }
  if (upto > revealDom.shown) { revealDom.shown = upto; const last = feed.lastElementChild; if (last) setTimeout(() => last.scrollIntoView({ behavior: fx.reduced() ? 'auto' : 'smooth', block: 'nearest' }), 60); }
  // chuỗi đã lật hết: có từ 2 khung hình trở lên thì chiếu thành phim
  if (upto >= v.steps - 1 && !revealDom.anim && v.plan && v.plan.some(isFrameRole)) {
    revealDom.anim = true; feed.insertAdjacentHTML('beforeend', animHTML()); mountAnim(feed.lastElementChild, v, c);
    if (!end) setTimeout(() => { const a = feed.querySelector('.anim'); a && a.scrollIntoView({ behavior: fx.reduced() ? 'auto' : 'smooth', block: 'nearest' }); }, 120);
  }
  // cảm xúc + chấm điểm
  for (const el of feed.querySelectorAll('.item')) {
    const r = (v.reacts || {})[el.dataset.key] || { n: {}, mine: [] }, pr = p && p.reacts && p.reacts[el.dataset.key];
    el.querySelectorAll('.re').forEach(b => {
      const e = b.dataset.e, cnt = r.n[e] || 0;
      b.querySelector('small').textContent = cnt || ''; b.classList.toggle('on', r.mine.includes(e));
      if (pr && cnt > (pr.n[e] || 0)) { fx.floatUp(e, b, 'emo'); if (!r.mine.includes(e)) fx.sfx.react(); }
    });
    const vt = (v.votes || {})[el.dataset.key] || { up: 0, down: 0, mine: 0 };
    el.querySelectorAll('.vt').forEach(b => { const up = b.dataset.v === '1'; b.querySelector('small').textContent = (up ? vt.up : vt.down) || ''; b.classList.toggle('on', vt.mine === (up ? 1 : -1)); });
  }
  // thanh điều khiển (chỉ vẽ lại khi đổi – nút không bị thay giữa lúc bấm)
  const bar = $('#t-bar');
  const barKey = JSON.stringify(end ? ['end', c, v.scores || null, isHost, !!(net && net.offline)] : [v.reveal.c, v.reveal.u, v.reveal.auto, v.reveal.paused, isHost]);
  if (revealDom.bar === barKey) return;
  revealDom.bar = barKey;
  if (!end) {
    const r = v.reveal, last = r.u >= v.steps - 1, lastChain = r.c >= n - 1, lastInGroup = r.c >= ga + gg - 1;
    const label = !last ? 'Tiếp ▶' : lastChain ? 'Xem album 🏁' : G && lastInGroup ? `Sang nhóm ${gj + 2} ▶` : 'Chuỗi tiếp theo ▶';
    const status = r.auto ? (r.paused ? '⏸️ Đang tạm dừng' : `⏩ Tự chiếu mỗi ${r.auto} giây`) : '';
    bar.innerHTML = isHost
      ? `<button class="btn big pri" id="t-next">${label}</button>
        <div class="rv-ctl">${r.auto ? `<button class="btn sm ${r.paused ? 'blue' : ''}" id="t-pause">${r.paused ? '▶ Chạy tiếp' : '⏸️ Tạm dừng'}</button>` : ''}
          <span class="seg-w"><span class="seg-l">Tự chiếu</span><div class="seg" role="group" aria-label="Tự chiếu">${REVEAL_AUTO.map(x => `<button class="sg ${r.auto === x ? 'on' : ''}" data-ra="${x}" aria-label="${x ? x + ' giây' : 'Bấm tay'}">${x ? x + 's' : 'Tắt'}</button>`).join('')}</div></span></div>
        <div class="rv-links">${G && gj < G - 1 ? `<button class="link" id="t-skipg">⏭️ Bỏ qua nhóm ${gj + 1}</button>` : ''}<button class="link" id="t-skip">Bỏ qua, xem album luôn</button></div>`
      : `<p class="muted center">${status ? `<b class="rv-st">${status}</b> · ` : 'Chủ phòng đang bấm tiếp… '}${v.gmode === 'score' ? 'chấm 👍/👎 từng bước nào!' : 'thả cảm xúc đi nào 😂🔥💀'}</p>`;
    const nx = $('#t-next'); if (nx) nx.onclick = () => net && net.act({ type: 'next' });
    const sk = $('#t-skip'); if (sk) sk.onclick = () => net && net.act({ type: 'skipReveal' });
    const sg = $('#t-skipg'); if (sg) sg.onclick = () => net && net.act({ type: 'skipGroup' });
    const pa = $('#t-pause'); if (pa) pa.onclick = () => { fx.sfx.pop(); net.act({ type: 'pause', on: !r.paused }); };
    $$('#t-bar [data-ra]').forEach(b => b.onclick = () => { fx.sfx.pop(); net.act({ type: 'autoReveal', sec: +b.dataset.ra }); });
  } else {
    bar.innerHTML = `${leaderHTML(v)}<div class="dl-row"><button class="btn" id="t-dl1">🖼️ Ảnh chuỗi này</button><button class="btn pri" id="t-dlall">⬇️ Tải cả album</button></div>${isHost ? `<button class="btn big blue" id="t-again">🔁 ${net && net.offline ? 'Vẽ đoạn mới' : 'Về sảnh chơi tiếp'}</button>` : '<p class="muted center">Đợi chủ phòng mở ván mới…</p>'}`;
    $('#t-dl1').onclick = () => download(albumCanvas(view, [c]), `scribble-${fname(pname(view.chains[c]))}.png`);
    $('#t-dlall').onclick = () => openExport(view, c);
    const ag = $('#t-again'); if (ag) ag.onclick = () => { if (net.offline) openSolo(); else net.restart(); };
    if (endShownT !== v.gid) { endShownT = v.gid; fx.sfx.win(); fx.fireworks(3500); }
  }
}

// ---------- tải cả album: GIF động / video / ảnh ghép ----------
async function fontsReady() {
  try { await Promise.all(['800 40px "Shantell Sans"', '700 20px "Shantell Sans"', '700 16px "Be Vietnam Pro"', '800 18px "Be Vietnam Pro"', '600 18px "Be Vietnam Pro"', '30px "Patrick Hand"'].map(f => document.fonts.load(f, 'Ảnh ạ ữ'))); } catch (e) {}
}
function openExport(v, cur) {
  const G = nGroups(v), [gj, ga, gg] = grpOf(v, cur), vt = videoType(), gm = GMODES[v.gmode] || GMODES.normal;
  const HOLDS = [1500, 2500, 4000];
  let hold = +(ls.get('scribble-hold') || 2500); if (!HOLDS.includes(hold)) hold = 2500;
  let scope = 'all', job = null;
  const chains = () => scope === 'all' ? v.chains.map((_, i) => i) : Array.from({ length: gg }, (_, i) => ga + i);
  const info = {
    v, book, pname, color: avColor, roleInfo: k => ROLE[roleOf(v, k)] || ROLE.draw, groupOf: c => grpOf(v, c),
    drawing: (c, k) => drawingImg(c + ':' + k, book.get(c + ':' + k).d),
    title: 'Tam sao thất bản · ' + gm.name,
    sub: '',
  };
  const plan = () => { const ch = chains(); info.sub = `${scope === 'all' ? '' : `Nhóm ${gj + 1} · `}${ch.length} chuỗi · ${new Set(ch.map(c => v.chains[c])).size} người vẽ · ${new Date().toLocaleDateString('vi-VN')}`; return planFrames({ v, chains: ch, hold, fps: animFpsGid === v.gid ? animFps : (v.opts && v.opts.fps) || 4, roleOf: k => roleOf(v, k) }); };
  const missing = v.chains.some((_, c) => Array.from({ length: v.steps }, (_, k) => !book.has(c + ':' + k)).some(Boolean));
  if (missing) { net.needBook(); toast('Album chưa tải đủ – đợi vài giây rồi thử lại nha'); return; }
  const seg = (id, items, on) => `<div class="seg" id="${id}">${items.map(([k, t]) => `<button class="sg ${k === on ? 'on' : ''}" data-k="${k}">${t}</button>`).join('')}</div>`;
  openModal(`<h2>⬇️ Tải cả album</h2><p class="center muted ex-intro">Gộp mọi chuỗi thành 1 file chạy lần lượt: mỗi bước một khung, có tên người và câu/đoán.</p>
    <canvas class="ex-prev" width="${FW}" height="${FH}" aria-label="Xem trước khung đầu"></canvas>
    <div class="set row wrap"><span>Mỗi bước hiện</span>${seg('ex-hold', HOLDS.map(h => [h, String(h / 1000).replace('.', ',') + ' giây']), hold)}</div>
    ${G ? `<div class="set row wrap"><span>Tải</span>${seg('ex-scope', [['all', `Cả ${G} nhóm`], ['grp', `Chỉ nhóm ${gj + 1}`]], scope)}</div>` : ''}
    <p class="hint-txt center" id="ex-sum"></p>
    <div class="ex-btns"><button class="btn pri" id="ex-gif">🖼️ GIF động</button>${vt ? `<button class="btn blue" id="ex-vid">🎬 Video ${/mp4/.test(vt) ? 'MP4' : 'WebM'}</button>` : ''}<button class="btn" id="ex-png">🧩 Ảnh ghép</button></div>
    ${vt ? '' : '<p class="hint-txt center">Trình duyệt này chưa quay video được – tải GIF nhé.</p>'}
    <div class="ex-prog" id="ex-prog" hidden><div class="bar"><i id="ex-bar"></i></div><small id="ex-msg"></small><button class="btn sm" id="ex-cancel">Huỷ</button></div>
    <div class="m-btns"><button class="btn" data-close id="ex-close">Đóng</button></div>`, 'export');
  const sum = () => {
    const f = plan(), ms = totalMs(f);
    $('#ex-sum').textContent = `${f.length} khung · dài khoảng ${fmtDur(ms)}${vt ? ` · video quay mất chừng đó thời gian` : ''}`;
    const pc = $('.ex-prev'); if (pc && f[1]) { const x = pc.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); drawFrame(x, f[1], info); }
  };
  fontsReady().then(() => { if ($('#ex-sum')) sum(); });
  sum();
  $$('#ex-hold .sg').forEach(b => b.onclick = () => { hold = +b.dataset.k; ls.set('scribble-hold', hold); $$('#ex-hold .sg').forEach(x => x.classList.toggle('on', x === b)); sum(); });
  $$('#ex-scope .sg').forEach(b => b.onclick = () => { scope = b.dataset.k; $$('#ex-scope .sg').forEach(x => x.classList.toggle('on', x === b)); sum(); });
  const busy = on => { modalLock = on; $$('#modal-box .ex-btns .btn, #modal-box .seg .sg').forEach(b => b.disabled = on); $('#ex-prog').hidden = !on; $('#ex-close').hidden = on; };
  const nm = `scribble-album${scope === 'grp' ? '-nhom' + (gj + 1) : ''}`;
  const run = async (kind) => {
    if (job) return;
    await fontsReady();
    const frames = plan(), total = totalMs(frames); job = { cancel: false }; busy(true);
    const t0 = Date.now();
    const prog = x => { const bar = $('#ex-bar'); if (!bar) return; bar.style.width = Math.round(x * 100) + '%';
      $('#ex-msg').textContent = kind === 'gif' ? `Đang ghép GIF… ${Math.round(x * 100)}%` : `Đang quay video… ${fmtDur(x * total)} / ${fmtDur(total)} (giữ tab này mở nhé)`; };
    prog(0);
    try {
      const blob = kind === 'gif' ? await exportGif(frames, info, prog, job) : await exportVideo(frames, info, prog, job);
      if (blob) { saveBlob(blob, `${nm}.${kind === 'gif' ? 'gif' : /mp4/.test(blob.type) ? 'mp4' : 'webm'}`, kind === 'gif' ? `Đã lưu GIF (${(blob.size / 1048576).toFixed(1)} MB) 🎞️` : 'Đã lưu video 🎬'); fx.sfx.win(); }
      else toast('Đã huỷ');
    } catch (e) { console.error(e); toast('Xuất không được 😢 ' + (e && e.message || '')); }
    window.__lastExport = { kind, ms: Date.now() - t0, frames: frames.length };
    job = null; if ($('#ex-prog')) busy(false);
  };
  $('#ex-gif').onclick = () => run('gif');
  const vb = $('#ex-vid'); if (vb) vb.onclick = () => run('video');
  $('#ex-png').onclick = () => download(albumCanvas(v, chains()), `${nm}.png`);
  $('#ex-cancel').onclick = () => { if (job) job.cancel = true; };
}
// Ảnh album ghép: mỗi chuỗi một cột, mỗi bước một ô
function wrapText(ctx, text, maxW) {
  const words = String(text).split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines.slice(0, 7);
}
function albumCanvas(v, chains) {
  const CW = 400, CH = 300, PAD = 28, GAP = 26, ROW = CH + 54, HEAD = 110, COLH = 46;
  const w = PAD * 2 + chains.length * CW + (chains.length - 1) * GAP, h = HEAD + COLH + v.steps * ROW + 50;
  const s = Math.min(1, Math.sqrt(14e6 / (w * h)));
  const cvs = document.createElement('canvas'); cvs.width = Math.round(w * s); cvs.height = Math.round(h * s);
  const ctx = cvs.getContext('2d'); ctx.scale(s, s);
  ctx.fillStyle = '#fff8e8'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#e7e2f5'; ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  const gm = GMODES[v.gmode] || GMODES.normal;
  ctx.fillStyle = '#1f2340'; ctx.font = '800 44px "Shantell Sans", sans-serif'; ctx.textBaseline = 'top';
  ctx.fillText('Scribble it! – Tam sao thất bản', PAD, 26);
  ctx.font = '600 18px "Be Vietnam Pro", sans-serif'; ctx.fillStyle = '#6b6f8a';
  ctx.fillText(`${gm.name} · ${new Date().toLocaleDateString('vi-VN')} · BGVN`, PAD, 80);
  const rr = (x, y, ww, hh, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + ww, y, x + ww, y + hh, r); ctx.arcTo(x + ww, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + ww, y, r); ctx.closePath(); };
  chains.forEach((c, ci) => {
    const x = PAD + ci * (CW + GAP);
    ctx.fillStyle = avColor(pname(v.chains[c])); rr(x, HEAD, CW, 36, 18); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 20px "Shantell Sans", sans-serif'; ctx.fillText((v.gmode === 'icebreaker' ? 'Câu hỏi của ' : 'Chuỗi của ') + pname(v.chains[c]), x + 16, HEAD + 7);
    for (let k = 0; k < v.steps; k++) {
      const it = book.get(c + ':' + k), y = HEAD + COLH + k * ROW, r = ROLE[roleOf(v, k)] || ROLE.draw;
      ctx.fillStyle = '#1f2340'; ctx.font = '700 17px "Be Vietnam Pro", sans-serif';
      ctx.fillText(`${it ? pname(it.by) : '?'} ${r[0]} ${r[2]}`, x + 4, y + 4);
      const by = y + 30;
      ctx.save(); ctx.fillStyle = '#1f2340'; rr(x + 4, by + 4, CW, CH, 16); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fff'; rr(x, by, CW, CH, 16); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1f2340'; ctx.stroke();
      if (it && it.d) { ctx.save(); rr(x, by, CW, CH, 16); ctx.clip(); ctx.drawImage(drawingImg(c + ':' + k, it.d), x, by, CW, CH); ctx.restore(); rr(x, by, CW, CH, 16); ctx.stroke(); }
      else if (it) {
        ctx.fillStyle = '#1f2340'; ctx.font = '30px "Patrick Hand", sans-serif';
        const lines = wrapText(ctx, '“' + it.t + '”', CW - 50), lh = 36, ty = by + CH / 2 - lines.length * lh / 2;
        ctx.textAlign = 'center'; lines.forEach((l, i) => ctx.fillText(l, x + CW / 2, ty + i * lh)); ctx.textAlign = 'left';
      }
    }
  });
  return cvs;
}

// ======================= VẼ THỬ =======================
let pBoard = null, pWord = '';
function newWord() { const pool = buildPool({ cats: DEFAULT_CATS }); pWord = pool[Math.floor(Math.random() * pool.length)]; $('#p-word').textContent = pWord; }
$('#btn-practice').onclick = () => {
  fx.actx(); fx.musicResumeIfOn(); show('screen-practice');
  if (!pBoard) { pBoard = new Board($('#p-board'), { ...inkFx, editable: true }); buildToolbar($('#p-tools'), pBoard); }
  newWord();
};
$('#p-next').onclick = () => { newWord(); if (!pBoard.isEmpty()) pBoard.clear(); fx.sfx.choose(); };
$('#p-save').onclick = () => download(pBoard.cv, `scribble-${fname(pWord)}.png`);
$('#p-leave').onclick = () => show('screen-home');

// ---------- phím tắt ----------
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const b = active('screen-game') ? gBoard : active('screen-gartic') ? tBoard : active('screen-practice') ? pBoard : null;
  if (!b || !b.editable) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); b.undo(); }
  else if (k === 'b' || k === 'e' || k === 'f') { b.setTool({ b: 'pen', e: 'eraser', f: 'fill' }[k]); }
  else return;
  const t = b.el.closest('.screen').querySelector('.tools'); t && t.dispatchEvent(new Event('refresh'));
  $$('.tools').forEach(el => el.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x.dataset.t === b.tool)));
});
// chặn kéo-để-tải-lại khi đang vẽ trên điện thoại
document.addEventListener('touchmove', e => { if (e.target.closest && e.target.closest('.board.editable')) e.preventDefault(); }, { passive: false });

reacts = createReactions({
  send: e => { if (!net) return; if (isHost) net.react('host', e); else net.react(e); },
  // ghế = thẻ người chơi (Đoán hình) / dòng tên ở màn chờ (Tam sao thất bản); không thấy thì hiện giữa màn kèm tên
  seatEl: id => { const el = document.querySelector(`.screen.active #g-players [data-id="${id}"], .screen.active .who [data-id="${id}"]`); return el; },
  myId: () => myId, nameOf: id => pname(id),
  mount: $('#g-rx'), place: 'left:0;top:0', phrases: PHRASES,
  onShow: () => fx.sfx.react(),
});
syncReacts('');
// ---- câu chọc gõ tự do: thêm ô gõ vào bảng emoji (module dùng chung chỉ có câu dựng sẵn) ----
const seatOf = id => document.querySelector(`.screen.active #g-players [data-id="${id}"], .screen.active .who [data-id="${id}"]`);
const teaseEcho = []; let teaseReady = 0;
function showTease(msg, local = false) {
  if (!msg || typeof msg.text !== 'string') return;
  const text = cleanTease(msg.text); if (!text) return;
  if (!local && msg.from === myId) { const i = teaseEcho.findIndex(x => x.text === text && Date.now() - x.t < 6000); if (i >= 0) { teaseEcho.splice(i, 1); return; } }
  const el = seatOf(msg.from), r = el && el.getBoundingClientRect(), found = !!(r && (r.width || r.height));
  const n = document.createElement('div'); n.className = 'bgr-bub rx-free-bub';
  n.innerHTML = (found ? '' : `<b>${esc(pname(msg.from))}:</b> `) + esc(text);
  document.body.appendChild(n);
  const w = n.offsetWidth, h = n.offsetHeight, ax = found ? r.left + r.width / 2 : innerWidth / 2, top = found ? r.top : innerHeight * 0.3, bot = found ? r.bottom : innerHeight * 0.3;
  let y = top - 6; if (y - h < 8) { y = bot + 6; n.classList.add('below'); }
  n.style.left = Math.max(8 + w / 2, Math.min(innerWidth - 8 - w / 2, ax)) + 'px'; n.style.top = y + 'px';
  setTimeout(() => n.remove(), 3200); fx.sfx.react();
}
new MutationObserver(ms => { for (const m of ms) for (const p of m.addedNodes) if (p.classList && p.classList.contains('bgr-panel')) {
  p.insertAdjacentHTML('beforeend', `<form class="rx-free" autocomplete="off"><input maxlength="${TEASE_MAX}" placeholder="Gõ câu chọc…" aria-label="Câu chọc tự do" enterkeyhint="send"><button type="submit" aria-label="Gửi câu chọc">➤</button></form>`);
  const f = p.querySelector('.rx-free'), inp = f.querySelector('input');
  // bảng mở phía trên nút mà cao thêm thì kéo lại cho khỏi tràn
  const rr = p.getBoundingClientRect(); if (rr.bottom > innerHeight - 8) p.style.top = Math.max(8, innerHeight - 8 - rr.height) + 'px';
  f.onsubmit = e => {
    e.preventDefault(); const text = cleanTease(inp.value); if (!text || !net) return;
    if (Date.now() < teaseReady) { toast('Từ từ thôi 😆'); return; }
    // mình đã biết đáp án / đề (hoạ sĩ, đã đoán ra, câu đề Tam sao) mà câu lộ ra thì báo luôn, khỏi gửi (chủ phòng vẫn lọc lại)
    const v = view, known = !v ? [] : v.mode === 'guess' ? (v.phase === 'draw' && v.word ? [v.word] : v.phase === 'choose' && v.choices ? v.choices : []) : v.phase === 'play' && v.task && v.task.prompt && v.task.prompt.t ? [v.task.prompt.t] : [];
    if (known.length && leaksAny(text, known)) { toast(v.mode === 'guess' ? 'Câu này lộ đáp án rồi 🤫' : 'Câu này lộ đề rồi 🤫 – để dành lúc chiếu lại nha'); fx.sfx.bad(); return; }
    teaseReady = Date.now() + 1500; teaseEcho.push({ text, t: Date.now() });
    showTease({ from: myId, text }, true);
    if (isHost) net.tease('host', text); else net.tease(text);
    reacts.close();
  };
} }).observe(document.body, { childList: true });
if (location.hash === '#debug') window.__dbg = () => ({ net, view, cv, myId, gBoard, tBoard, book });

// ---------- Tải lại trang: tự khôi phục phòng / tự vào lại ----------
(function resume() {
  const snap = loadSnapshot(), ses = session.load('scribble');
  const lk = linkCode(); // mở link mời phòng khác → vào thẳng phòng đó; link của chính phòng mình → vào lại như thường
  if (lk && !(ses && ses.code === lk)) { linkJoin(lk); return; }
  if (lk) clearLinkCode();
  if (snap && ses && ses.role === 'host') {
    fx.musicResumeIfOn();
    net = new Host((snap.players.find(p => p.id === 'host') || {}).name || myName(), handlers, snap); isHost = true; myId = 'host';
    show('screen-lobby'); if (!snap.offline) netStatus('Đã khôi phục phòng ' + snap.code, 'ok'); return;
  }
  if (ses && ses.role === 'client' && ses.code) {
    net = new Client(ses.code, ses.name || myName(), handlers); isHost = false;
  }
})();
