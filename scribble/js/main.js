import { Host, Client, MAX, loadSnapshot, session } from './net.js?v=2';
import { netStatus } from '../../shared/ui/status.js';
import { Board, buildToolbar, opsToCanvas, W, H } from './draw.js?v=2';
import { CATS, CAT_KEYS, DEFAULT_CATS, buildPool, randomPrompt, parseCustom } from './words.js?v=2';
import { REACTS } from './engine.js?v=2';
import { opsBytes, simplifyOps } from './ops.js?v=2';
import * as fx from './fx.js?v=2';
import { guideHTML } from './guide.js?v=2';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };

let net = null, isHost = false, myId = null, lobby = null, view = null;

// ---------- tiện ích giao diện ----------
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }
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
const fname = s => fx && String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'tranh';

// ---------- âm thanh ----------
const syncSound = () => $$('.snd-btn').forEach(b => { b.textContent = b.id === 'btn-sound-home' ? (fx.isMuted() ? '🔇 Âm thanh' : '🔊 Âm thanh') : (fx.isMuted() ? '🔇' : '🔊'); });
$$('.snd-btn').forEach(b => b.onclick = () => { fx.toggleMute(); syncSound(); fx.sfx.pop(); }); syncSound();
const syncMusic = () => $('#btn-music-home').classList.toggle('on', fx.musicIsOn());
$('#btn-music-home').onclick = () => { fx.actx(); fx.musicToggle(); syncMusic(); }; syncMusic();
const openGuide = () => openModal(guideHTML() + '<div class="m-btns"><button class="btn pri" data-close>Hiểu rồi! 👌</button></div>', 'wide');
$('#btn-guide-home').onclick = $('#g-guide').onclick = $('#t-guide').onclick = openGuide;

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
$('#btn-join').onclick = () => {
  const code = $('#join-code').value.trim().toUpperCase(); if (code.length < 5) { toast('Nhập mã phòng 5 ký tự nhé.'); return; }
  fx.actx(); fx.musicResumeIfOn();
  if (net) net.leave();
  net = new Client(code, myName(), handlers); isHost = false; myId = null;
};
$('#join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-join').click(); });
const qcode = new URLSearchParams(location.search).get('room'); if (qcode) $('#join-code').value = qcode.toUpperCase().slice(0, 5);
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
  const url = location.origin + location.pathname + '?room=' + $('#room-code').textContent;
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
  $('#pcount').textContent = `${ps.length}/${MAX}`;
  $('#plist').innerHTML = ps.map(p => `<li>${avatar(p.name)}<span class="nm">${esc(p.name)}${p.id === myId ? ' <small>(bạn)</small>' : ''}${p.id === 'host' ? ' 👑' : ''}${!p.connected ? ' <small>📴</small>' : ''}</span>${isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</li>`).join('');
  $$('#plist [data-rm]').forEach(b => b.onclick = () => net.removePlayer(b.dataset.rm));
  const online = ps.filter(p => p.connected).length;
  $('#lobby-tip').innerHTML = online < 2 ? '👋 Cần ít nhất <b>2 người</b>. Gửi mã phòng hoặc bấm <b>Chép link mời</b> cho hội bạn nhé!' : `Đủ người rồi, quẩy thôi! (tối đa ${MAX} người)`;
  $('#modes').innerHTML = Object.entries(MODE_INFO).map(([k, [t, d]]) => `<button class="mode ${o.mode === k ? 'on' : ''}" data-mode="${k}" ${isHost ? '' : 'disabled'}><b>${t}</b><small>${d}</small></button>`).join('');
  $$('#modes [data-mode]').forEach(b => b.onclick = () => net.setOpts({ mode: b.dataset.mode }));
  renderSettings();
  $('#btn-start').style.display = isHost ? '' : 'none';
  $('#btn-start').textContent = online < 2 ? '▶ Bắt đầu (cần ≥ 2 người)' : `▶ Bắt đầu ${MODE_INFO[o.mode][0].slice(2)}`;
  $('#btn-start').classList.toggle('dim', online < 2);
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
    h += isHost ? `<textarea id="s-custom" rows="4" placeholder="Mỗi dòng 1 từ, ví dụ:&#10;Minto ngủ gật&#10;cà phê muối&#10;xe buýt số 19">${esc(o.custom.join('\n'))}</textarea>` : `<p class="hint-txt">${o.custom.length ? esc(o.custom.length + ' từ bí mật do chủ phòng thêm 🤫') : 'Chủ phòng chưa thêm từ riêng.'}</p>`;
    h += `<label class="check"><input type="checkbox" id="s-only" ${o.onlyCustom ? 'checked' : ''} ${isHost && o.custom.length >= 3 ? '' : 'disabled'}><span>Chỉ dùng từ riêng <small>(cần ≥ 3 từ)</small></span></label>`;
  } else {
    h += slider('s-draw', 'Thời gian vẽ', o.drawTime, 30, 180, 10);
    h += slider('s-text', 'Thời gian viết / đoán', o.textTime, 20, 90, 5);
    h += `<p class="hint-txt">Mỗi người viết 1 câu, chuyền tay xen kẽ <b>vẽ ↔ đoán</b>. Có ${Math.max(4, lobby.players.length)} bước, ai cũng được góp mặt vào mọi chuỗi.</p>`;
  }
  box.innerHTML = h;
  if (!isHost) return;
  $$('#settings [data-r]').forEach(b => b.onclick = () => net.setOpts({ rounds: o.rounds + +b.dataset.r }));
  $$('#settings [data-cat]').forEach(b => b.onclick = () => { const k = b.dataset.cat; const cats = o.cats.includes(k) ? o.cats.filter(x => x !== k) : [...o.cats, k]; if (!cats.length && !o.custom.length) { toast('Chọn ít nhất 1 chủ đề nha'); return; } net.setOpts({ cats }); });
  for (const [id, k] of [['s-draw', 'drawTime'], ['s-text', 'textTime']]) {
    const el = $('#' + id); if (!el) continue;
    el.oninput = () => { $('#' + id + '-v').textContent = el.value + ' giây'; };
    el.onchange = () => net.setOpts({ [k]: +el.value });
  }
  const ta = $('#s-custom');
  if (ta) {
    let t; ta.oninput = () => { clearTimeout(t); t = setTimeout(() => net.setOpts({ custom: parseCustom(ta.value) }), 700); };
    ta.onblur = () => { clearTimeout(t); net.setOpts({ custom: parseCustom(ta.value) }); setTimeout(() => { if (settingsPending) { settingsKey = ''; renderSettings(); } }, 0); };
  }
  const only = $('#s-only'); if (only) only.onchange = () => net.setOpts({ onlyCustom: only.checked });
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
  box.classList.toggle('urgent', urgent);
  if (secs !== lastSec) {
    if (urgent && secs > 0 && secs <= (g ? 10 : 5)) fx.sfx.tick();
    lastSec = secs;
  }
  if (t) autoSubmit(left);
}, 200);

// ======================= ĐOÁN HÌNH =======================
let gBoard = null, gTools = null, cv = 0, curTurn = null, canvasBuf = null, syncPending = false, chatKey = '', overlayKey = '', endShown = null, lastClose = 0, hintKey = '';
function ensureGBoard() {
  if (gBoard) return;
  gBoard = new Board($('#g-board'), { onOps: ops => { if (!net || !view || view.drawer !== myId) return; net.draw(ops); cv++; } });
  gTools = buildToolbar($('#g-tools'), gBoard);
  gBoard.el.appendChild($('#g-overlay')); // hộp chọn từ / tổng kết nằm gọn trên mặt tranh
}
function requestSync() { if (syncPending || !net) return; syncPending = true; net.sync(); setTimeout(() => { syncPending = false; }, 3000); }
function onDraw(ops, n) {
  if (!view || view.mode !== 'guess' || !gBoard || syncPending) return;
  if (n !== cv + 1) { requestSync(); return; }
  gBoard.apply(ops); cv = n;
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
  if (v.word && (v.phase === 'draw' || v.phase === 'turnEnd')) hint = `<span class="word ${amDrawer ? 'mine' : 'got'}">${esc(v.word)}</span>`;
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
  const sk = $('#ov-skip'); if (sk) sk.onclick = () => net.act({ type: 'skip' });
  const rs = $('#ov-res'); if (rs) rs.onclick = () => showResults(view);
}
function showResults(v) {
  const ps = v.players.slice().sort((a, b) => b.score - a.score);
  const medal = ['🥇', '🥈', '🥉'];
  const pod = [1, 0, 2].filter(i => ps[i]).map(i => `<div class="pod p${i + 1}">${avatar(ps[i].name, 'big')}<b>${esc(ps[i].name)}</b><small>${ps[i].score} điểm</small><div class="step">${medal[i]}</div></div>`).join('');
  openModal(`<h2 class="center">🏆 Bảng vàng</h2><div class="podium">${pod}</div>
    <ol class="final">${ps.map((p, i) => `<li class="${p.id === myId ? 'me' : ''}"><span>${i + 1}</span>${avatar(p.name)}<b>${esc(p.name)}</b><em>${p.score}</em></li>`).join('')}</ol>
    <div class="m-btns">${isHost ? '<button class="btn pri" id="m-again">🔁 Ván mới</button>' : '<p class="muted">Đợi chủ phòng mở ván mới…</p>'}<button class="btn" data-close>Đóng</button></div>`, 'results');
  const a = $('#m-again'); if (a) a.onclick = () => { closeModal(); net.restart(); };
}
$('#g-form').addEventListener('submit', e => {
  e.preventDefault(); const inp = $('#g-input'), t = inp.value.trim(); if (!t || !net) return;
  net.act({ type: 'guess', text: t }); inp.value = ''; fx.sfx.send();
});

// ======================= TAM SAO THẤT BẢN =======================
let tBoard = null, tTools = null, tStepKey = null, tEditing = false, tKind = null, autoSent = {}, draftT;
const book = new Map(); let bookGid = null, bookAsked = 0;
const KIND = { write: ['✍️', 'Viết câu'], draw: ['🎨', 'Vẽ'], guess: ['🤔', 'Đoán'] };
const DKEY = 'scribble-draft';
function ensureTBoard() {
  if (tBoard) return;
  tBoard = new Board($('#t-board'), { onChange: () => { clearTimeout(draftT); draftT = setTimeout(saveDraft, 400); } });
  tTools = buildToolbar($('#t-tools'), tBoard);
}
function saveDraft() {
  if (!tStepKey) return;
  const d = { k: tStepKey }; if (tKind === 'draw' && tBoard) d.ops = tBoard.ops; else d.text = $('#t-input').value;
  try { localStorage.setItem(DKEY, JSON.stringify(d)); } catch (e) {}
}
function loadDraft(k) { try { const d = JSON.parse(localStorage.getItem(DKEY)); return d && d.k === k ? d : null; } catch (e) { return null; } }
$('#t-input').addEventListener('input', () => { clearTimeout(draftT); draftT = setTimeout(saveDraft, 400); });
$('#t-dice').onclick = () => { $('#t-input').value = randomPrompt(); saveDraft(); fx.sfx.pop(); };
function renderGartic(v, p) {
  if (!active('screen-gartic')) { closeModal(); show('screen-gartic'); }
  ensureTBoard();
  if (v.gid !== bookGid) { book.clear(); bookGid = v.gid; bookAsked = 0; revealDom = null; }
  setClock(v);
  $('#t-cap').textContent = v.phase === 'play' ? `Bước ${v.step + 1}/${v.steps} · ${KIND[v.kind][1]}` : v.phase === 'reveal' ? '🎬 Chiếu lại' : '📚 Album cả ván';
  $('#t-steps').innerHTML = Array.from({ length: v.steps }, (_, i) => { const k = i === 0 ? 'write' : i % 2 ? 'draw' : 'guess'; return `<i class="${v.phase !== 'play' || i < v.step ? 'done' : i === v.step ? 'cur' : ''}" title="${KIND[k][1]}">${KIND[k][0]}</i>`; }).join('');
  const play = $('#t-play'), wait = $('#t-wait'), rev = $('#t-reveal');
  if (v.phase === 'play') {
    rev.hidden = true;
    const t = v.task;
    if (!t) { play.hidden = true; wait.hidden = false; wait.innerHTML = waitHTML(v, false); return; }
    const key = v.gid + ':' + v.step;
    if (key !== tStepKey) setupStep(v, t, key);
    const showWait = t.done && !tEditing;
    play.hidden = showWait; wait.hidden = !showWait;
    $('#screen-gartic').classList.toggle('is-drawer', !showWait && t.kind === 'draw');
    if (showWait) { wait.innerHTML = waitHTML(v, true); $('#t-edit').onclick = () => { tEditing = true; renderGartic(view, null); }; }
    $('#t-done').textContent = t.done ? 'Nộp lại ✓' : 'Xong ✓';
    if (t.kind === 'draw') tBoard.setEditable(!showWait);
    if (p && p.step === v.step) { const n = v.players.filter(x => x.done).length, n0 = p.players.filter(x => x.done).length; if (n > n0 && showWait) fx.sfx.pop(); }
  } else {
    play.hidden = true; wait.hidden = true; rev.hidden = false; tBoard.setEditable(false); tStepKey = null;
    $('#screen-gartic').classList.remove('is-drawer');
    if (!v.chains.every((_, c) => book.has(c + ':0')) && Date.now() - bookAsked > 4000) { bookAsked = Date.now(); net.needBook(); }
    renderReveal(v, p);
  }
}
function waitHTML(v, mine) {
  const done = v.players.filter(x => x.done).length;
  return `<div class="wait-card"><div class="big-emo">${mine ? '✅' : '👀'}</div><h3>${mine ? 'Đã nộp! Ngồi chờ hội bạn nha' : 'Đang xem ván…'}</h3>
    <p class="muted">${done}/${v.players.length} người xong</p>
    <ul class="who">${v.players.map(x => `<li class="${x.done ? 'done' : ''} ${x.on ? '' : 'off'}">${avatar(x.name)}<span>${esc(x.name)}</span><b>${x.done ? '✓' : x.on ? '…' : '📴'}</b></li>`).join('')}</ul>
    ${mine ? '<button class="btn" id="t-edit">✏️ Sửa lại</button>' : ''}</div>`;
}
function setupStep(v, t, key) {
  tStepKey = key; tEditing = false; tKind = t.kind;
  const d = loadDraft(key), pr = $('#t-prompt'), inp = $('#t-input');
  const sg = $('#screen-gartic'); sg.dataset.kind = t.kind;
  if (t.kind === 'write') {
    pr.innerHTML = `<span class="emo">✍️</span><div><b>Viết một câu thật bá đạo</b><small>Người kế tiếp sẽ phải vẽ lại câu này 😈</small></div>`;
    inp.value = d && d.text || ''; inp.placeholder = 'VD: Con mèo đang hát karaoke ở chợ Bến Thành';
  } else if (t.kind === 'draw') {
    pr.innerHTML = `<span class="emo">🎨</span><div><small>Vẽ lại câu này:</small><b class="q">“${esc(t.prompt ? t.prompt.t : '')}”</b></div>`;
    tBoard.setOps(d && d.ops || []); tBoard.setEditable(true);
  } else {
    pr.innerHTML = `<span class="emo">🤔</span><div><b>Người trước vẽ cái gì đây?</b><small>Đoán thành 1 câu nhé</small></div>`;
    tBoard.setOps(t.prompt && t.prompt.d || []); tBoard.setEditable(false);
    inp.value = d && d.text || ''; inp.placeholder = 'Mình đoán là…';
  }
  if (v.step > 0) { fx.sfx.turn(); fx.banner(`${KIND[t.kind][0]} ${KIND[t.kind][1]}!`, 'blue'); }
}
function submitTask(auto = false) {
  const v = view; if (!v || v.mode !== 'gartic' || v.phase !== 'play' || !v.task) return;
  const t = v.task;
  if (t.kind === 'draw') {
    let ops = tBoard.getOps(); if (opsBytes(ops) > 140000) ops = simplifyOps(ops, 140000);
    net.act({ type: 'submit', step: v.step, ops });
  } else {
    let text = $('#t-input').value.trim();
    if (!text) { if (!auto) { toast('Viết gì đó đi nè ✍️'); fx.pop($('#t-form'), 'shake'); return; } text = t.kind === 'write' ? randomPrompt() : '🤷 (bí quá)'; }
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
$('#t-done').onclick = () => submitTask(false);
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
function itemHTML(v, c, k) {
  const it = book.get(c + ':' + k), kind = k === 0 ? 'write' : k % 2 ? 'draw' : 'guess';
  const verb = { write: 'viết', draw: 'vẽ', guess: 'đoán' }[kind];
  const who = it ? pname(it.by) : '…';
  return `<div class="item ${kind}" data-key="${c}:${k}"><div class="by">${avatar(who)}<span><b>${esc(who)}</b> ${verb}${it && it.miss ? ' <small>(hết giờ)</small>' : ''}</span></div>
    <div class="content">${!it ? '<div class="bubble muted">Đang tải…</div>' : it.d ? '<div class="pic"></div>' : `<div class="bubble">${esc(it.t)}</div>`}</div>
    <div class="reacts">${REACTS.map(e => `<button class="re" data-e="${e}">${e}<small></small></button>`).join('')}</div></div>`;
}
function renderReveal(v, p) {
  const box = $('#t-reveal'), n = v.chains.length;
  const end = v.phase === 'end';
  const c = end ? Math.min(albumSel, n - 1) : v.reveal.c, upto = end ? v.steps - 1 : v.reveal.u;
  const dk = v.gid + '|' + c + '|' + end;
  if (!revealDom || revealDom.key !== dk) {
    box.innerHTML = `<div class="rv-head">${end ? `<div class="tabs">${v.chains.map((id, i) => `<button class="chip ${i === c ? 'on' : ''}" data-tab="${i}">${esc(pname(id))}</button>`).join('')}</div>` : ''}
      <h3>${avatar(pname(v.chains[c]))} Chuỗi của ${esc(pname(v.chains[c]))} <small>${c + 1}/${n}</small></h3></div>
      <div class="feed" id="t-feed"></div><div class="rv-bar" id="t-bar"></div>`;
    revealDom = { key: dk, shown: -1 };
    $$('#t-reveal [data-tab]').forEach(b => b.onclick = () => { albumSel = +b.dataset.tab; revealDom = null; renderReveal(view, null); });
  }
  const feed = $('#t-feed');
  for (let k = revealDom.shown + 1; k <= upto; k++) {
    feed.insertAdjacentHTML('beforeend', itemHTML(v, c, k));
    const el = feed.lastElementChild, it = book.get(c + ':' + k);
    if (it && it.d) el.querySelector('.pic').appendChild(drawingImg(c + ':' + k, it.d));
    if (!end && revealDom.shown >= 0) { el.classList.add('pop-in'); fx.sfx.reveal(); }
    el.querySelectorAll('.re').forEach(b => b.onclick = () => { fx.sfx.react(); net.act({ type: 'react', key: el.dataset.key, e: b.dataset.e }); });
  }
  if (upto > revealDom.shown) { revealDom.shown = upto; const last = feed.lastElementChild; if (last) setTimeout(() => last.scrollIntoView({ behavior: fx.reduced() ? 'auto' : 'smooth', block: 'nearest' }), 60); }
  // cảm xúc
  for (const el of feed.querySelectorAll('.item')) {
    const r = (v.reacts || {})[el.dataset.key] || { n: {}, mine: [] }, pr = p && p.reacts && p.reacts[el.dataset.key];
    el.querySelectorAll('.re').forEach(b => {
      const e = b.dataset.e, cnt = r.n[e] || 0;
      b.querySelector('small').textContent = cnt || ''; b.classList.toggle('on', r.mine.includes(e));
      if (pr && cnt > (pr.n[e] || 0)) { fx.floatUp(e, b, 'emo'); if (!r.mine.includes(e)) fx.sfx.react(); }
    });
  }
  // thanh điều khiển
  const bar = $('#t-bar');
  if (!end) {
    const r = v.reveal, last = r.u >= v.steps - 1, lastChain = r.c >= n - 1;
    bar.innerHTML = isHost
      ? `<button class="btn big pri" id="t-next">${!last ? 'Tiếp ▶' : !lastChain ? 'Chuỗi tiếp theo ▶' : 'Xem album 🏁'}</button><button class="link" id="t-skip">Bỏ qua, xem album luôn</button>`
      : `<p class="muted center">Chủ phòng đang bấm tiếp… thả cảm xúc đi nào 😂🔥💀</p>`;
    const nx = $('#t-next'); if (nx) nx.onclick = () => net.act({ type: 'next' });
    const sk = $('#t-skip'); if (sk) sk.onclick = () => net.act({ type: 'skipReveal' });
  } else {
    bar.innerHTML = `<div class="dl-row"><button class="btn" id="t-dl1">⬇ Tải chuỗi này</button><button class="btn pri" id="t-dlall">⬇ Tải cả album</button></div>${isHost ? '<button class="btn big blue" id="t-again">🔁 Về sảnh chơi tiếp</button>' : '<p class="muted center">Đợi chủ phòng mở ván mới…</p>'}`;
    $('#t-dl1').onclick = () => download(albumCanvas(view, [c]), `scribble-${fname(pname(view.chains[c]))}.png`);
    $('#t-dlall').onclick = () => download(albumCanvas(view, view.chains.map((_, i) => i)), 'scribble-album.png');
    const ag = $('#t-again'); if (ag) ag.onclick = () => net.restart();
    if (endShownT !== v.gid) { endShownT = v.gid; fx.sfx.win(); fx.fireworks(3500); }
  }
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
  ctx.fillStyle = '#1f2340'; ctx.font = '800 46px "Baloo 2", sans-serif'; ctx.textBaseline = 'top';
  ctx.fillText('Scribble it! – Tam sao thất bản', PAD, 26);
  ctx.font = '600 18px "Be Vietnam Pro", sans-serif'; ctx.fillStyle = '#6b6f8a';
  ctx.fillText(new Date().toLocaleDateString('vi-VN') + ' · BGVN', PAD, 80);
  const rr = (x, y, ww, hh, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + ww, y, x + ww, y + hh, r); ctx.arcTo(x + ww, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + ww, y, r); ctx.closePath(); };
  chains.forEach((c, ci) => {
    const x = PAD + ci * (CW + GAP);
    ctx.fillStyle = avColor(pname(v.chains[c])); rr(x, HEAD, CW, 36, 18); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 20px "Be Vietnam Pro", sans-serif'; ctx.fillText('Chuỗi của ' + pname(v.chains[c]), x + 16, HEAD + 7);
    for (let k = 0; k < v.steps; k++) {
      const it = book.get(c + ':' + k), y = HEAD + COLH + k * ROW;
      const verb = k === 0 ? '✍️ viết' : k % 2 ? '🎨 vẽ' : '🤔 đoán';
      ctx.fillStyle = '#1f2340'; ctx.font = '700 17px "Be Vietnam Pro", sans-serif';
      ctx.fillText(`${it ? pname(it.by) : '?'} ${verb}`, x + 4, y + 4);
      const by = y + 30;
      ctx.save(); ctx.fillStyle = '#1f2340'; rr(x + 4, by + 4, CW, CH, 16); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fff'; rr(x, by, CW, CH, 16); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1f2340'; ctx.stroke();
      if (it && it.d) { ctx.save(); rr(x, by, CW, CH, 16); ctx.clip(); ctx.drawImage(drawingImg(c + ':' + k, it.d), x, by, CW, CH); ctx.restore(); rr(x, by, CW, CH, 16); ctx.stroke(); }
      else if (it) {
        ctx.fillStyle = '#1f2340'; ctx.font = '700 26px "Be Vietnam Pro", sans-serif';
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
  if (!pBoard) { pBoard = new Board($('#p-board'), { editable: true }); buildToolbar($('#p-tools'), pBoard); }
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

if (location.hash === '#debug') window.__dbg = () => ({ net, view, cv, myId, gBoard, tBoard, book });

// ---------- Tải lại trang: tự khôi phục phòng / tự vào lại ----------
(function resume() {
  const snap = loadSnapshot(), ses = session.load('scribble');
  if (snap && ses && ses.role === 'host') {
    fx.musicResumeIfOn();
    net = new Host((snap.players.find(p => p.id === 'host') || {}).name || myName(), handlers, snap); isHost = true; myId = 'host';
    show('screen-lobby'); netStatus('Đã khôi phục phòng ' + snap.code, 'ok'); return;
  }
  if (ses && ses.role === 'client' && ses.code) {
    net = new Client(ses.code, ses.name || myName(), handlers); isHost = false;
  }
})();
