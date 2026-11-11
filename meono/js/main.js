import { Host, Client, MAX, loadSnapshot, session, setSpeedFn, MEO_PHRASES } from './net.js?v=14';
import { hintsAllowed, lockToggle, BOT_ONLY_NOTE } from '../../shared/ui/botonly.js?v=1';
import { linkCode, clearLinkCode, inviteUrl, joinByLink } from '../../shared/net/joinlink.js?v=2';
import { createReactions } from '../../shared/ui/react.js?v=2';
import { netStatus } from '../../shared/ui/status.js';
import { CARD, CATS, NAMEABLE, classify, needsTarget, cardName, deckPlan, isCat, awards } from './engine.js?v=8';
import { cardHTML, catSVG, bombSVG, cardIcon, mascotSVG, tint } from './cards.js?v=8';
import * as fx from './mfx.js?v=9';
import { openGuide } from './guide.js?v=10';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=111';
import { startPick, endPick, pickActive } from '../../shared/ui/seatpick.js?v=1';
setSpeedFn(fx.S);

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const GAME = 'meono';

let net = null, isHost = false, myId = null, lobby = null, view = null;
let lastEv = 0, modalKey = null, sel = new Set(), clockEnd = 0, clockTotal = 1, landing = 0, holdUntil = 0, holdT = null;
let probOn = ls.get('meono-prob2') === '1'; // gợi ý xác suất mặc định ẩn
// xác suất bom chỉ có khi chơi với bot: phòng có ≥ 2 người thật thì ẩn (theo danh sách người chơi hiện tại)
const probOk = () => hintsAllowed(lobby || (view && view.players));
const probShown = () => probOn && probOk();
let freshIds = new Set(), skipped = 0, skippedSeen = 0, landingAt = 0;

// ---------- tiện ích ----------
const AV_COL = ['#ff6b35', '#ff5d8f', '#e0a800', '#2fbf71', '#14b8a6', '#3a86ff', '#8e5cf7', '#d94dff', '#a0693a', '#5b6b8a'];
const avColor = name => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AV_COL[h % AV_COL.length]; };
const clean = n => String(n).replace(' 🤖', '').trim();
const furOf = id => tint(avColor(clean((view && view.players.find(p => p.id === id) || {}).name || '?')), 0.5); // màu lông mèo theo người chơi
const avatar = (name, extra = '') => `<div class="av" style="background:${avColor(clean(name))}"><i class="ears"></i><b>${esc([...clean(name)][0] || '?').toUpperCase()}</b>${extra}</div>`;
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); if (id !== 'screen-game') { fx.musicMood('lobby'); endPick(); } }
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
function openModal(html, cls = '', key = null) { $('#modal-box').className = 'modal-box ' + cls; $('#modal-box').innerHTML = html; $('#modal').classList.add('open'); modalKey = key; }
function closeModal() { $('#modal').classList.remove('open'); modalKey = null; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !modalKey) closeModal(); });
window.__closeModal = closeModal;

// ---------- mèo linh vật (ngủ / tỉnh / hoảng / sướng / choáng) ----------
for (const id of ['#mascot', '#home-cat', '#lobby-cat']) $(id).innerHTML = mascotSVG();
let moodOv = null, moodUntil = 0, moodT = null;
function setMood(m, ms) { moodOv = m; moodUntil = Date.now() + ms * fx.S(); updateMascot(); clearTimeout(moodT); moodT = setTimeout(updateMascot, ms * fx.S() + 30); }
function updateMascot() {
  const el = $('#mascot'); if (!view) { el.className = 'mascot m-sleep'; return; }
  let m;
  if (Date.now() < moodUntil) m = moodOv;
  else if (view.phase === 'ended') m = 'happy';
  else {
    const r = risk(view);
    m = (view.pending && view.pending.type === 'bomb') || r >= 0.34 ? 'panic' : isMyTurn() || r >= 0.15 || view.window ? 'alert' : 'sleep';
  }
  el.className = 'mascot m-' + m;
}
const pet = (el, txt = '💕') => { fx.actx(); fx.sfx.pet(); fx.floatText(el, txt, 'ok'); };
$('#mascot').onclick = () => { pet($('#mascot')); setMood('happy', 1400); };
$('#home-cat').onclick = () => { pet($('#home-cat')); fx.pop($('#home-cat'), 'woke'); };
$('#lobby-cat').onclick = () => { pet($('#lobby-cat')); fx.pop($('#lobby-cat'), 'woke'); };

// ---------- thả emoji / chọc nhau (shared/ui/react.js): nút 😂 ở góc dưới phải hộp bài ----------
const reacts = createReactions({
  send: e => { if (!net) return; if (isHost) net.react('host', e); else net.react(e); },
  seatEl: id => id === myId ? $('#actions') : $(`.seat[data-pid="${id}"] .av`),
  myId: () => myId,
  nameOf: id => { const p = view && view.players.find(x => x.id === id); return p ? clean(p.name) : ''; },
  mount: $('#center'), place: 'right:6px;bottom:6px',
  phrases: MEO_PHRASES,
  onShow: msg => { if (/^Meo|^Bốc|^HUỶ KÈO|^Huỷ/.test(msg.e || '')) fx.sfx.meow(0, 1.2 + Math.random() * 0.3, 0.05); else fx.sfx.flip(); },
});
reacts.setVisible(false);
// màn ngang thấp (điện thoại xoay ngang): hộp bài bị ép dẹt → chuyển nút 😂 lên khoảng trống trên thanh công cụ
function placeReact() {
  const b = document.querySelector('.bgr-btn'); if (!b) return;
  const tb = $('.topbar'), tools = $('.topbar .tools'), title = $('.topbar .title-tag');
  let into = $('#center'), pos = { left: '', top: '', right: '6px', bottom: '6px' };
  if (innerHeight < 520 && $('#screen-game').classList.contains('active')) {
    const tr = tb.getBoundingClientRect(), x0 = Math.max(title.offsetParent ? title.getBoundingClientRect().right : 0, $('#btn-leave').getBoundingClientRect().right) - tr.left + 8;
    if (tools.getBoundingClientRect().left - tr.left - x0 >= 52) { into = tb; pos = { left: x0 + 'px', top: '50%', right: '', bottom: '' }; }
  }
  if (b.parentNode !== into) into.appendChild(b);
  Object.assign(b.style, pos, { transform: into === tb ? 'translateY(-50%)' : '' });
}
addEventListener('resize', placeReact);

// ---------- trang chủ ----------
$('#name').value = ls.get('bgvn-name') || '';
$('#hero').innerHTML = ['cat1', 'attack', 'bomb', 'defuse', 'cat5'].map((t, i) => cardHTML({ t }, 'hero-card', `style="--r:${(i - 2) * 13}deg;--d:${i * 90}ms"`)).join('');
function myName() { const n = $('#name').value.trim() || 'Bạn'; ls.set('bgvn-name', n); return n; }
const handlers = {
  onLobby(info, code, started) { lobby = info; syncProb(); $('#room-code').textContent = code; if (!started) { view = null; renderLobby(); if (!$('#screen-lobby').classList.contains('active')) { closeModal(); show('screen-lobby'); } } },
  onState(v) { onState(v); },
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
  if (offline) { session.save(GAME, { role: 'host', code: 'OFFLINE' }); net.addBot(); net.addBot(); net.addBot(); }
  $('#code-box').style.display = offline ? 'none' : '';
  show('screen-lobby');
}
$('#btn-offline').onclick = () => startHost(true);
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
function leave() { if (net) (net.leave ? net.leave() : net.destroy()); net = null; view = null; lobby = null; closeModal(); fx.setTension(0); reacts.setVisible(false); show('screen-home'); }
$('#btn-leave-lobby').onclick = leave;
$('#btn-leave').onclick = () => openModal(`<h2>Rời ván?</h2><p class="ctr">${isHost ? 'Bạn là chủ phòng – rời đi sẽ kết thúc ván cho mọi người.' : 'Bạn có thể vào lại bằng mã phòng.'}</p><div class="btns"><button class="btn" onclick="__closeModal()">Ở lại</button><button class="btn red" id="m-leave">Rời ván</button></div>`);
document.addEventListener('click', e => { if (e.target.id === 'm-leave') leave(); });
$('#btn-copy').onclick = () => { const url = inviteUrl($('#room-code').textContent); navigator.clipboard?.writeText(url).then(() => toast('Đã chép link mời 📋'), () => toast(url)); };

// ---------- sảnh ----------
function renderLobby() {
  if (!lobby) return;
  const ps = lobby.players, o = lobby.opts;
  $('#pcount').textContent = `${ps.length}/${MAX}`;
  $('#plist').innerHTML = ps.map(p => `<li>${avatar(p.name)}<span>${esc(clean(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === myId ? ' <small>(bạn)</small>' : ''}${p.id === 'host' ? ' 👑' : ''}${!p.connected ? ' <small>📴</small>' : ''}</span>${isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</li>`).join('');
  $$('#plist [data-rm]').forEach(b => b.onclick = () => net.removePlayer(b.dataset.rm));
  $('#btn-addbot').style.display = isHost && ps.length < MAX ? '' : 'none';
  const dis = isHost ? '' : 'disabled';
  $('#opts').innerHTML = `
    <label class="opt"><span><b>⏱ Đồng hồ mỗi lượt</b><small>Hết giờ máy tự bốc giùm.</small></span>
      <select data-opt="turnTime" ${dis}>${[30, 45, 60, 90].map(n => `<option value="${n}" ${+o.turnTime === n ? 'selected' : ''}>${n} giây</option>`).join('')}</select></label>
    <label class="opt"><input type="checkbox" data-opt="expansion" ${o.expansion ? 'checked' : ''} ${dis}><span><b>🪄 Thêm Cải Mệnh & Móc Đáy</b><small>Tắt để chơi bộ cơ bản.</small></span></label>
    <label class="opt ${o.chaos ? 'hot' : ''}"><input type="checkbox" data-opt="chaos" ${o.chaos ? 'checked' : ''} ${dis}><span><b>🌀 Bộ bài Hỗn loạn</b><small>Gấp đôi Đổ Vỏ${o.expansion ? ', Móc Đáy' : ''}, nhiều HUỶ KÈO! & Xào Bài hơn, thêm 1 Gỡ Bom. Bớt mèo thường.</small></span></label>`;
  $$('#opts [data-opt]').forEach(i => i.onchange = () => net.setOpt(i.dataset.opt, i.type === 'checkbox' ? i.checked : i.value));
  const n = Math.max(2, ps.length), plan = deckPlan(n, o);
  const total = Object.values(plan).reduce((a, b) => a + b, 0);
  $('#deck-info').innerHTML = `🃏 ${n} người${o.chaos ? ' · <b>🌀 Hỗn loạn</b>' : ''}: bộ ${total} lá, <b>${plan.bomb} Mèo Nổ</b>, ${plan.defuse} Gỡ Bom, ${plan.attack} Đổ Vỏ, ${plan.nope} HUỶ KÈO!. Mỗi người 1 Gỡ Bom + 7 lá.`;
  $('#btn-start').style.display = isHost ? '' : 'none';
  $('#wait-msg').style.display = isHost ? 'none' : '';
}
$('#btn-addbot').onclick = () => net && net.addBot();
$('#btn-start').onclick = () => { fx.actx(); net && net.start(); };

// ---------- công cụ ----------
$('#speed').innerHTML = Object.entries(fx.SPEEDS).map(([k, v]) => `<option value="${k}">⚡ ${v.name}</option>`).join('');
$('#speed').value = fx.getSpeed(); $('#speed').onchange = e => { fx.setSpeed(e.target.value); syncSpeed(); };
// điện thoại: nút tốc độ gọn (bấm để xoay vòng Chậm → Vừa → Nhanh) thay cho ô chọn
const SPEED_IC = { slow: '🐢', normal: '⚡', fast: '🚀' };
function syncSpeed() { $('#speed').value = fx.getSpeed(); $('#speed-btn').textContent = SPEED_IC[fx.getSpeed()] || '⚡'; }
$('#speed-btn').onclick = () => { const ks = Object.keys(fx.SPEEDS); const k = ks[(ks.indexOf(fx.getSpeed()) + 1) % ks.length]; fx.setSpeed(k); syncSpeed(); toast(`${SPEED_IC[k]} Tốc độ hiệu ứng: ${fx.SPEEDS[k].name}`); };
syncSpeed();
const syncMusic = () => { $('#btn-music').classList.toggle('on', fx.musicIsOn()); $('#btn-music-home').classList.toggle('on', fx.musicIsOn()); };
$('#btn-music').onclick = $('#btn-music-home').onclick = () => { fx.actx(); fx.musicToggle(); syncMusic(); }; syncMusic();
$('#vol').value = fx.musicVolume(); $('#vol').oninput = e => fx.musicVolume(+e.target.value);
const syncMute = () => $('#btn-mute').textContent = fx.isMuted() ? '🔇' : '🔊';
$('#btn-mute').onclick = () => { fx.toggleMute(); syncMute(); }; syncMute();
const syncProb = () => { $('#btn-prob').classList.toggle('on', probShown()); lockToggle($('#btn-prob'), !probOk()); };
$('#btn-prob').onclick = () => { if (!probOk()) { toast('🎲 Xác suất bom: ' + BOT_ONLY_NOTE); return; } probOn = !probOn; ls.set('meono-prob2', probOn ? '1' : '0'); syncProb(); toast(probOn ? '🎲 Đã bật gợi ý xác suất bom' : '🎲 Đã tắt gợi ý xác suất'); view && render(); }; syncProb();
$('#btn-guide').onclick = $('#btn-guide-home').onclick = () => openGuide(openModal);
// 📝 Có gì mới (patch notes dùng chung): chấm đỏ khi có bản chưa xem
for (const id of ['#btn-news', '#btn-news-home']) { newsBadge($(id), 'meono'); $(id).onclick = () => { openNews('meono'); $$('#btn-news, #btn-news-home').forEach(b => b.classList.toggle('bgvn-dot', false)); }; }
$('#btn-log').onclick = () => $('#log').classList.toggle('open');
$('#btn-log-close').onclick = () => $('#log').classList.remove('open');

// ---------- gửi hành động ----------
function send(a) { if (!net) return; if (isHost) net.act('host', a); else net.act(a); }
const me = () => view && view.players.find(p => p.id === myId);
const pname = id => clean((view.players.find(p => p.id === id) || {}).name || '?');
const isMyTurn = () => view && view.phase === 'playing' && view.players[view.turn].id === myId && !view.pending && !view.window;
const risk = v => v.peek && v.peek.length ? (v.peek[0].t === 'bomb' ? 1 : 0) : v.bombsLeft / Math.max(1, v.deckCount);

// ---------- nhận state ----------
function onState(v) {
  if (!v) { view = null; closeModal(); endPick(); show('screen-lobby'); renderLobby(); fx.setTension(0); reacts.setVisible(false); return; }
  // state chủ phòng gửi là sự thật duy nhất: luôn vẽ theo state mới nhất; hàng đợi hoạt ảnh chỉ là phần phụ, có thể bỏ
  const newGame = !!(view && view.gid && v.gid && view.gid !== v.gid);
  const first = !view || newGame || !$('#screen-game').classList.contains('active');
  const prev = view; view = v;
  if (v.clock) { clockEnd = Date.now() + v.clock.ms; clockTotal = v.clock.total || 1; } else clockEnd = 0;
  if (first) { show('screen-game'); closeModal(); sel.clear(); }
  const hand = (me() && me().hand) || []; for (const id of [...sel]) if (!hand.some(c => c.id === id)) sel.delete(id);
  let evs = first ? [] : v.ev.filter(e => e.n > lastEv);
  // tụt lại xa (vừa nối lại, tab bị ngủ, sự kiện cũ đã bị cắt) → bỏ dồn hoạt ảnh, nhảy thẳng tới hiện tại
  if (evs.length && (evs[0].n > lastEv + 1 || evs.length > 8 || document.hidden)) { evs = evs.filter(e => e.k === 'turn' && e.by === myId).slice(-1); skipped++; }
  if (first || skipped !== skippedSeen) { landing = 0; holdUntil = 0; skippedSeen = skipped; }
  if (first && v.turnNo === 1 && v.evN <= 2) evs.push(...v.ev.filter(e => e.k === 'start'));
  lastEv = v.evN;
  if (evs.some(e => e.k === 'bomb' && e.by === myId)) holdUntil = Date.now() + 1500 * fx.S();
  render();
  playEvents(evs, prev);
  if (v.phase === 'ended') fx.musicMood('lobby'); else { if (fx.musicMood() === 'lobby') fx.musicMood('game'); fx.setTension(Math.min(1, risk(v) * 2.4 + (isMyTurn() ? 0.12 : 0))); }
}

// ---------- vẽ bàn ----------
function render() {
  const v = view; if (!v) return;
  syncProb();
  const meP = me();
  // đối thủ
  const n = v.players.length, myIdx = Math.max(0, v.players.findIndex(p => p.id === myId));
  const opps = []; for (let k = 1; k < n; k++) opps.push(v.players[(myIdx + k) % n]);
  if (!meP) opps.unshift(v.players[myIdx]);
  const waitId = v.phase !== 'playing' ? null : v.window ? null : v.pending ? v.pending.player : v.players[v.turn].id;
  $('#opps').innerHTML = opps.map(p => {
    const turn = v.phase === 'playing' && v.players[v.turn].id === p.id;
    const away = (v.away || []).includes(p.id);
    const badge = p.out ? '<span class="st dead">💀</span>' : turn && v.turnsLeft > 1 ? `<span class="st x2">×${v.turnsLeft}</span>` : away ? '<span class="st">📴</span>' : '';
    return `<div class="seat ${turn ? 'turn' : ''} ${waitId === p.id ? 'wait' : ''} ${p.out ? 'out' : ''} ${v.winner === p.id ? 'winner' : ''}" data-pid="${p.id}">
      ${avatar(p.name, `<span class="cnt" title="Số lá">${p.out ? '–' : p.handCount}</span>`)}${badge}
      <div class="nm">${esc(clean(p.name))}${p.isBot ? '<small>🤖</small>' : ''}</div></div>`;
  }).join('');
  $('#opps').dataset.n = opps.length;
  // chồng bài
  $('#deck-cnt').textContent = v.deckCount + ' lá';
  $('#deck').classList.toggle('can', isMyTurn());
  $('#deck').classList.toggle('low', v.deckCount <= 3);
  $('#deck').onclick = () => { if (isMyTurn()) doDraw(); };
  $('#discard').onclick = () => { const top = (view.discardTop || []).slice(-1)[0]; if (top) cardDetail(top.t); };
  if (!landing || Date.now() - landingAt > 2500) { landing = 0; renderDiscard(); }
  renderMeter(v);
  updateMascot();
  reacts.setVisible(v.phase === 'playing' || v.phase === 'ended'); placeReact();
  $('#opps').classList.toggle('alert', !!v.window);
  if (!v.window && fx.stampsOn()) fx.clearStamps();
  renderStrip(v, meP);
  renderActions(v, meP);
  renderHand(v, meP);
  $('#log-list').innerHTML = v.log.map(l => `<li>${esc(l)}</li>`).join('');
  $('#log-list').scrollTop = 1e6;
  handlePending(v);
  if (v.phase === 'ended') showWin(v); else if (modalKey === 'win') closeModal();
}
function renderDiscard() {
  const top = view.discardTop || [];
  $('#discard').innerHTML = top.length ? top.map((c, i) => { let h = 0; for (const ch of c.id) h = (h * 17 + ch.charCodeAt(0)) % 360; return cardHTML(c, i === top.length - 1 ? 'top' : 'under', `style="--rot:${(h % 22) - 11}deg"`); }).join('') : '<div class="empty-pile"><svg viewBox="0 0 60 30" class="fishbone" aria-hidden="true"><path d="M6 15 h40 M14 7 l4 8 l-4 8 M24 6 l4 9 l-4 9 M34 7 l4 8 l-4 8" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M46 15 l10 -8 v16 z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="6" cy="15" r="4" fill="currentColor"/></svg>Bỏ bài</div>';
}
function renderMeter(v) {
  const m = $('#meter');
  if (v.phase !== 'playing') { m.innerHTML = ''; m.className = 'meter'; return; }
  const pk = v.peek || [];
  if (pk.length) {
    m.className = 'meter peek ' + (pk[0].t === 'bomb' ? 'hot' : 'safe');
    m.innerHTML = `<span class="lbl">🔮 Bạn biết lá trên cùng:</span><span class="pk">${pk.map((c, i) => `<span class="pki ${c.t === 'bomb' ? 'b' : ''}" title="${cardName(c.t)}">${i === 0 ? '' : '›'}${cardIcon(c.t)}</span>`).join('')}</span><b>${pk[0].t === 'bomb' ? (v.players[v.turn].id === myId ? 'BOM! Né gấp!' : 'BOM – chờ người ăn 😈') : 'An toàn ✅'}</b>`;
    return;
  }
  if (!probShown()) { m.className = 'meter off'; m.innerHTML = `<span class="lbl">💣 ${v.bombsLeft} Mèo Nổ đang nấp</span>`; return; }
  const r = risk(v), pct = Math.round(r * 100);
  const lvl = r >= 0.34 ? 'hot' : r >= 0.15 ? 'warm' : 'cool';
  const word = r >= 0.5 ? 'Toang tới nơi 😱' : r >= 0.34 ? 'Nguy hiểm!' : r >= 0.15 ? 'Hơi run…' : 'Khá yên tâm';
  m.className = 'meter ' + lvl;
  m.innerHTML = `<span class="lbl">💣 ${v.bombsLeft} bom / ${v.deckCount} lá</span><span class="bar"><i style="width:${Math.max(3, pct)}%"></i></span><b>${pct}% · ${word}</b>`;
}
function renderStrip(v, meP) {
  const st = $('#strip');
  const w = v.window;
  if (w && v.phase === 'playing') {
    const what = w.kind === 'pair' ? `ĐÔI ${cardName(w.cards[0].t)}` : w.kind === 'triple' ? `BỘ BA ${cardName(w.cards[0].t)}` : cardName(w.kind);
    const cancelled = w.nopes % 2 === 1;
    const nopeTxt = w.nopes ? `<span class="nn ${cancelled ? 'c' : 'ok'}">🙅×${w.nopes} · ${cancelled ? 'đang bị HUỶ' : 'được cứu lại!'}</span>` : '';
    const key = 'w' + w.id + (w.canNope ? 'y' : 'n');
    if (st.dataset.key !== key) {
      st.dataset.key = key; st.className = 'strip window ' + (cancelled ? 'cancelled' : '');
      st.innerHTML = `<div class="wbox"><div class="wtxt">${w.actor === myId ? 'Bạn' : `<b>${esc(pname(w.actor))}</b>`} đánh <b class="k">${what}</b>${w.target ? ` → ${w.target === myId ? '<b class="you">BẠN</b>' : esc(pname(w.target))}` : ''}${w.named ? ` (đòi ${cardName(w.named)})` : ''} ${nopeTxt}</div>
        <div class="wprog"><i id="wprog"></i></div></div>
        ${w.canNope ? `<button class="btn nope-btn" id="btn-nope">🙅 HUỶ KÈO!</button>` : `<span class="wwait">${meP && !meP.out ? 'Chờ phản ứng…' : ''}</span>`}`;
      const b = $('#btn-nope'); if (b) b.onclick = () => { send({ type: 'nope' }); b.disabled = true; };
    }
    return;
  }
  st.dataset.key = ''; st.className = 'strip';
  if (v.phase !== 'playing') { st.innerHTML = `<div class="hint">${v.winner ? '🏆 ' + esc(pname(v.winner)) + ' thắng!' : ''}</div>`; return; }
  let h;
  const pr = v.pending;
  if (meP && meP.out) h = '💀 Bạn đã nổ tung – ngồi hóng tiếp nhé.';
  else if (pr && pr.player !== myId) h = pr.type === 'bomb' ? `🤫 <b>${esc(pname(pr.player))}</b> đang gỡ bom và lén nhét lại…` : pr.type === 'give' ? `🙏 <b>${esc(pname(pr.player))}</b> đang chọn lá để cho ${pr.to === myId ? 'bạn' : esc(pname(pr.to))}…` : `🪄 <b>${esc(pname(pr.player))}</b> đang xếp lại vận mệnh…`;
  else if (pr) h = '👉 Chọn đi nào!';
  else if (v.players[v.turn].id === myId) h = `🎯 <b>Lượt bạn!</b> Đánh lá tuỳ thích rồi <b>BỐC 1 lá</b> để kết thúc${v.turnsLeft > 1 ? ` · còn <b>${v.turnsLeft} lượt</b>` : ''}.`;
  else h = `Lượt của <b>${esc(pname(v.players[v.turn].id))}</b>${v.turnsLeft > 1 ? ` · phải đi <b>${v.turnsLeft} lượt</b> 😬` : ''}`;
  st.innerHTML = `<div class="hint ${isMyTurn() ? 'mine' : ''}">${h}</div>`;
}
function renderActions(v, meP) {
  const a = [];
  if (v.phase === 'playing' && meP && !meP.out && isMyTurn()) {
    const cards = [...sel].map(id => meP.hand.find(c => c.id === id)).filter(Boolean);
    const kind = classify(cards);
    if (cards.length === 1 && isCat(cards[0].t)) {
      const same = meP.hand.filter(c => c.t === cards[0].t);
      if (same.length >= 2) a.push(`<button class="btn pri" data-combo="2">🐾 Đánh đôi</button>`);
      if (same.length >= 3) a.push(`<button class="btn pri" data-combo="3">🎯 Bộ ba</button>`);
      if (same.length < 2) a.push(`<span class="mini-hint">Cần 2 ${CARD[cards[0].t].name} để đánh đôi</span>`);
    } else if (kind) a.push(`<button class="btn pri" data-play="1">${kind === 'pair' ? '🐾 Đánh đôi' : kind === 'triple' ? '🎯 Bộ ba' : `${cardIcon(kind)} Đánh ${CARD[kind].name}`}</button>`);
    else if (cards.length) a.push(`<span class="mini-hint">${cards.some(c => c.t === 'nope') ? 'HUỶ KÈO! chỉ dùng khi ai đó vừa đánh' : cards.some(c => c.t === 'defuse') ? 'Gỡ Bom tự dùng khi bốc trúng bom' : 'Chọn 1 lá chức năng hoặc 2–3 mèo cùng loại'}</span>`);
    a.unshift(`<button class="btn draw big" data-draw="1">🫳 Bốc bài${probShown() && !(v.peek || []).length ? ` <small>${Math.round(risk(v) * 100)}%💣</small>` : ''}</button>`);
  }
  $('#actions').innerHTML = a.join('');
  const d = $('#actions [data-draw]'); if (d) d.onclick = doDraw;
  const pl = $('#actions [data-play]'); if (pl) pl.onclick = () => playCards([...sel]);
  $$('#actions [data-combo]').forEach(b => b.onclick = () => { const c0 = meP.hand.find(c => sel.has(c.id)); const same = meP.hand.filter(c => c.t === c0.t).slice(0, +b.dataset.combo); playCards(same.map(c => c.id)); });
}
const ORDER = ['defuse', 'nope', 'attack', 'skip', 'shuffle', 'future', 'alter', 'favor', 'bottom', ...CATS];
function renderHand(v, meP) {
  const hEl = $('#hand');
  const hand = [...((meP && meP.hand) || [])].sort((a, b) => ORDER.indexOf(a.t) - ORDER.indexOf(b.t) || (a.id < b.id ? -1 : 1));
  const my = isMyTurn();
  const nopeNow = v.window && v.window.canNope;
  hEl.classList.toggle('myturn', my);
  hEl.innerHTML = hand.length ? hand.map(c => cardHTML(c, `${sel.has(c.id) ? 'sel' : ''} ${nopeNow && c.t === 'nope' ? 'glow' : ''} ${freshIds.has(c.id) ? 'fresh' : ''}`)).join('') : `<div class="empty-hand">${meP && meP.out ? '💀' : 'Hết bài rồi 🫥'}</div>`;
  fitHand();
  $$('#hand .mcard').forEach(el => { el.onclick = () => { if (el._lp === 'done') { el._lp = null; return; } onCardClick(el.dataset.id); }; bindDetail(el); });
}
// bấm giữ (điện thoại) / chuột phải (máy tính): xem lá to + tên gốc + tác dụng
function bindDetail(el) {
  const t = el.dataset.t; if (!t) return;
  el.addEventListener('touchstart', () => { clearTimeout(el._lpT); el._lp = null; el._lpT = setTimeout(() => { el._lp = 'done'; cardDetail(t); }, 450); }, { passive: true });
  el.addEventListener('touchend', () => clearTimeout(el._lpT));
  el.addEventListener('touchmove', () => clearTimeout(el._lpT), { passive: true });
  el.addEventListener('contextmenu', e => { e.preventDefault(); clearTimeout(el._lpT); cardDetail(t); });
}
function cardDetail(t) {
  if (modalKey && modalKey !== 'detail') return; // không đè lên hộp thoại bắt buộc (gỡ bom, cho lá…)
  openModal(`<div class="card-detail">${cardHTML({ t }, 'lg')}<div class="cd-txt"><h2>${CARD[t].name}</h2><p class="cd-en">${CARD[t].en}</p><p>${CARD[t].desc}</p>${isCat(t) ? '<p class="muted">🐾 Đánh theo cặp: <b>đôi</b> rút bừa 1 lá, <b>bộ ba</b> gọi tên lá muốn đòi.</p>' : ''}<p class="muted small">Mẹo: bấm giữ / chuột phải vào lá để xem lại.</p></div></div><div class="btns"><button class="btn" onclick="__closeModal()">Đóng</button></div>`, '', 'detail');
}
function fitHand() {
  // tay bài chật: lá chồng lên nhau, tên rút gọn 2 dòng; quá chật trên điện thoại thì thu nhỏ lá, vẫn chật nữa mới cho vuốt ngang
  const hEl = $('#hand'); hEl.classList.remove('tiny', 'tight');
  const calc = () => {
    const cards = [...hEl.querySelectorAll('.mcard')]; const nn = cards.length; if (!nn) return null;
    const cw = cards[0].offsetWidth; const avail = hEl.clientWidth - 16;
    let ov = nn > 1 ? (avail - cw) / (nn - 1) - cw : 0; ov = Math.min(ov, 6);
    const minOv = -cw * 0.44, over = ov < minOv; ov = Math.max(ov, minOv);
    return { nn, cw, ov, over, avail };
  };
  let r = calc(); if (!r) return;
  if (r.over && innerWidth < 700) { hEl.classList.add('tiny'); r = calc(); }
  hEl.style.setProperty('--ov', r.ov + 'px');
  hEl.classList.toggle('tight', r.ov < -4);
  hEl.style.justifyContent = r.nn * (r.cw + r.ov) - r.ov > r.avail ? 'flex-start' : 'center';
}
addEventListener('resize', () => view && render());
function onCardClick(id) {
  const v = view, meP = me(); if (!v || !meP) return;
  const c = meP.hand.find(x => x.id === id); if (!c) return;
  if (pickActive()) endPick(); // đang chọn người mà bấm lá khác → bỏ phiên chọn
  if (c.t === 'nope' && v.window && v.window.canNope) { send({ type: 'nope' }); return; }
  if (sel.has(id)) sel.delete(id);
  else {
    // chọn lá chức năng thì bỏ chọn lá khác; chọn mèo khác loại thì làm lại từ đầu
    const cur = [...sel].map(x => meP.hand.find(y => y.id === x)).filter(Boolean);
    if (!isCat(c.t) || cur.some(x => x.t !== c.t)) sel.clear();
    sel.add(id);
  }
  fx.sfx.flip();
  if (!isMyTurn() && sel.size) { const hint = c.t === 'nope' ? 'HUỶ KÈO! dùng khi ai đó vừa đánh lá' : 'Chưa tới lượt bạn – chọn trước cũng được 😉'; toast(hint); }
  render();
}
function doDraw() {
  if (!isMyTurn()) return;
  sel.clear();
  const r = risk(view);
  $('#deck').classList.add('suspense');
  if (r >= 0.15) fx.sfx.drumroll(); else fx.sfx.draw();
  setTimeout(() => $('#deck').classList.remove('suspense'), 700);
  send({ type: 'draw' });
}
function playCards(ids) {
  const meP = me(); const cards = ids.map(id => meP.hand.find(c => c.id === id)).filter(Boolean);
  const kind = classify(cards); if (!kind) { fx.sfx.bad(); return; }
  const go = (target, named) => { sel.clear(); send({ type: 'play', cardIds: ids, target, named }); };
  if (!needsTarget(kind)) { go(); return; }
  const title = kind === 'favor' ? '🙏 Xin vía ai? (họ chọn lá cho bạn)' : kind === 'pair' ? '🐾 Rút bừa 1 lá của ai?' : '🎯 Đòi lá của ai?';
  const tap = kind === 'favor' ? '🙏 Chạm vào người muốn <b>xin vía</b>' : kind === 'pair' ? '🐾 Chạm vào người muốn <b>rút bừa 1 lá</b>' : '🎯 Chạm vào người muốn <b>đòi lá</b>';
  const cb = t => { if (kind === 'triple') pickName(t, nmd => go(t, nmd)); else go(t); };
  // chọn ngay trên bàn: ghế đối thủ sáng lên; không thấy ghế (bố cục quá nhỏ) mới mở danh sách cũ
  startPick({
    key: 'play-' + ids.join(','), root: $('#opps'), seat: id => $(`#opps .seat[data-pid="${id}"]`), glow: '.av', title: tap, anchor: () => $('#strip'),
    items: () => view.players.filter(p => !p.out && p.id !== myId).map(p => ({ id: p.id, name: clean(p.name), ok: p.handCount > 0, reason: p.handCount ? '' : 'hết bài' })),
    valid: () => isMyTurn() && ids.every(id => (me().hand || []).some(c => c.id === id)),
    onPick: t => { fx.sfx.flip(); cb(t); }, onCancel: () => render(),
    fallback: () => pickTarget(title, cb),
  });
}
function pickTarget(title, cb) {
  const others = view.players.filter(p => !p.out && p.id !== myId);
  openModal(`<h2>${title}</h2><div class="target-list">${others.map(p => `<button data-t="${p.id}" ${p.handCount ? '' : 'disabled'}>${avatar(p.name)}<span>${esc(clean(p.name))}</span><span class="n">${p.handCount ? p.handCount + ' lá' : 'hết bài'}</span></button>`).join('')}</div><div class="btns"><button class="btn" onclick="__closeModal()">Huỷ</button></div>`);
  $$('.target-list [data-t]').forEach(b => b.onclick = () => { closeModal(); cb(b.dataset.t); });
}
function pickName(target, cb) {
  openModal(`<h2>🎯 Gọi tên lá muốn đòi từ ${esc(pname(target))}</h2><div class="name-grid">${NAMEABLE.map(t => `<button data-n="${t}">${cardHTML({ t }, 'xs')}<span>${CARD[t].name}</span></button>`).join('')}</div><div class="btns"><button class="btn" onclick="__closeModal()">Huỷ</button></div>`, 'wide');
  $$('.name-grid [data-n]').forEach(b => b.onclick = () => { closeModal(); cb(b.dataset.n); });
}

// ---------- lựa chọn bắt buộc ----------
function handlePending(v) {
  const pr = v.pending;
  if (!pr || pr.player !== myId || v.phase !== 'playing') { if (modalKey && modalKey.startsWith('pend')) closeModal(); return; }
  const key = 'pend-' + pr.type + '-' + v.seq;
  if (modalKey && modalKey.startsWith('pend-' + pr.type)) return;
  // chờ hoạt ảnh/banner (vd. "BẠN BỐC TRÚNG MÈO NỔ!") xong rồi mới mở hộp thoại, tối đa thêm ~2.5 giây
  const now = Date.now();
  if (now < holdUntil || (fx.bannerBusy() && now < holdUntil + 2500 * fx.S())) { clearTimeout(holdT); holdT = setTimeout(() => view && handlePending(view), Math.max(120, holdUntil - now + 30)); return; }
  if (pr.type === 'bomb') defuseModal(v, key);
  else if (pr.type === 'give') giveModal(v, pr, key);
  else if (pr.type === 'alter') alterModal(v, pr, key);
}
const posLabel = (p, n) => p === 0 ? 'TRÊN CÙNG – người kế bốc trúng ngay 😈' : p >= n ? 'DƯỚI CÙNG – để dành cho cuối ván' : `Lá thứ ${p + 1} từ trên xuống`;
function defuseModal(v, key) {
  const n = v.deckCount; let pos = Math.min(n, Math.floor(Math.random() * (n + 1)));
  openModal(`<div class="defuse"><div class="bomb-big">${bombSVG('phew', furOf(myId))}</div><h2>💣 Bốc trúng MÈO NỔ!</h2>
    <p class="ctr">May quá, bạn có <b>✂️ Gỡ Bom</b>! Giờ <b>bí mật</b> nhét bom lại chồng bài (${n} lá) – chỉ mình bạn biết chỗ.</p>
    <div class="pos-box"><div class="pos-ends"><span>⬆ Trên cùng</span><span>Dưới cùng ⬇</span></div>
      <input type="range" id="pos" min="0" max="${n}" step="1" value="${pos}" aria-label="Vị trí nhét bom">
      <div class="pos-lbl" id="pos-lbl"></div>
      <div class="pos-quick"><button class="chip" data-q="0">Trên cùng</button><button class="chip" data-q="1">Thứ 2</button><button class="chip" data-q="r">🎲 Ngẫu nhiên</button><button class="chip" data-q="${n}">Dưới cùng</button></div></div>
    <div class="btns"><button class="btn big green" id="btn-defuse">✂️ Gỡ bom & nhét lại</button></div><div class="mtimer"><i id="mtimer"></i></div></div>`, '', key);
  const upd = () => { pos = +$('#pos').value; $('#pos-lbl').textContent = posLabel(pos, n); };
  $('#pos').oninput = upd; upd();
  $$('.pos-quick [data-q]').forEach(b => b.onclick = () => { $('#pos').value = b.dataset.q === 'r' ? Math.floor(Math.random() * (n + 1)) : Math.min(n, +b.dataset.q); upd(); });
  $('#btn-defuse').onclick = () => { closeModal(); send({ type: 'defuse', pos }); };
}
function giveModal(v, pr, key) {
  const hand = me().hand;
  openModal(`<h2>🙏 ${esc(pname(pr.to))} xin vía bạn!</h2><p class="ctr">Chọn 1 lá để đưa cho họ (chọn lá ít giá trị nhất nhé 😏)</p><div class="pick-grid">${hand.map(c => cardHTML(c)).join('')}</div><div class="mtimer"><i id="mtimer"></i></div>`, 'wide', key);
  $$('.pick-grid .mcard').forEach(el => el.onclick = () => { closeModal(); send({ type: 'give', cardId: el.dataset.id }); });
}
function alterModal(v, pr, key) {
  let order = (pr.cards || []).filter(Boolean);
  const draw = () => {
    $('#alter-row').innerHTML = order.map((c, i) => `<div class="alt"><span class="alt-n">${i === 0 ? '1 · trên cùng' : i + 1}</span>${cardHTML(c)}<div class="alt-btns"><button class="chip" data-mv="${i}:-1" ${i === 0 ? 'disabled' : ''} aria-label="Lên trên">◀</button><button class="chip" data-mv="${i}:1" ${i === order.length - 1 ? 'disabled' : ''} aria-label="Xuống dưới">▶</button></div></div>`).join('');
    $$('#alter-row [data-mv]').forEach(b => b.onclick = () => { const [i, d] = b.dataset.mv.split(':').map(Number); const j = i + d; [order[i], order[j]] = [order[j], order[i]]; fx.sfx.flip(); draw(); });
  };
  openModal(`<h2>🪄 Cải Mệnh: xếp lại ${order.length} lá trên cùng</h2><p class="ctr">Lá bên <b>trái</b> sẽ được bốc trước. Bấm ◀ ▶ để đổi chỗ.</p><div class="alter-row" id="alter-row"></div><div class="btns"><button class="btn big pri" id="btn-alter">✅ Xong</button></div><div class="mtimer"><i id="mtimer"></i></div>`, 'wide', key);
  draw();
  $('#btn-alter').onclick = () => { closeModal(); send({ type: 'alter', order: order.map(c => c.id) }); };
}
function futureModal(cards) {
  openModal(`<h2>🔮 Soi kèo 3 lá trên cùng</h2><p class="ctr">Trái nhất = lá sẽ bốc tiếp theo. Chỉ mình bạn thấy!</p><div class="alter-row">${cards.map((c, i) => `<div class="alt"><span class="alt-n">${i === 0 ? '1 · trên cùng' : i + 1}</span>${cardHTML(c)}</div>`).join('') || '<p>Chồng bài trống trơn.</p>'}</div><div class="btns"><button class="btn pri" onclick="__closeModal()">Đã nhớ 👌</button></div>`, 'wide');
}
function showWin(v) {
  if (modalKey === 'win') return;
  const meWin = v.winner === myId;
  const rank = [...v.players].sort((a, b) => (a.place || 99) - (b.place || 99));
  const who = id => id === myId ? '<b>Bạn</b>' : `<b>${esc(pname(id))}</b>`;
  const aw = awards(v).slice(0, 8);
  const badges = aw.length ? `<h3 class="aw-h">🏅 Huy hiệu ván này</h3><div class="awards">${aw.map((a, i) => `<div class="aw" style="--d:${i * 110}ms"><span class="aw-i">${a.icon}</span><span class="aw-t"><b class="aw-n">${a.title}</b><span>${a.ids.map(who).join(' & ')}</span><small>${a.desc}</small></span></div>`).join('')}</div>` : '';
  const st = id => (v.stats || {})[id] || {};
  const table = `<table class="stt"><thead><tr><th></th><th class="nm">Mèo</th><th title="Số lá đã bốc">🃏</th><th title="Bốc trúng Mèo Nổ (số lần gỡ được)">💣</th><th title="HUỶ KÈO! người khác">🙅</th><th title="Bị Đổ Vỏ">🎒</th></tr></thead><tbody>${rank.map(p => { const s = st(p.id); return `<tr class="${p.id === myId ? 'mine' : ''}"><td>${p.place === 1 ? '👑' : '💥'}</td><td class="nm">${esc(clean(p.name))}${p.id === myId ? ' <small>(bạn)</small>' : ''}</td><td>${s.draws || 0}</td><td>${s.bombs || 0}${s.defused ? `<small> ✂️${s.defused}</small>` : ''}</td><td>${s.nopes || 0}</td><td>${s.attacked || 0}</td></tr>`; }).join('')}</tbody></table><p class="stt-key">🃏 lá đã bốc · 💣 trúng bom (✂️ gỡ được) · 🙅 HUỶ KÈO! người khác · 🎒 bị Đổ Vỏ</p>`;
  setTimeout(() => {
    if (!view || view.phase !== 'ended' || modalKey === 'win') return;
    openModal(`<div class="win"><div class="big">${meWin ? '🏆' : '😼'}</div><h2>${meWin ? 'Bạn là con mèo sống sót cuối cùng!' : esc(pname(v.winner)) + ' thắng!'}</h2>
      ${badges}${table}
      <div class="btns">${isHost ? '<button class="btn pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về sảnh</button>' : '<p>Chờ chủ phòng mở ván mới…</p>'}</div></div>`, 'wide', 'win');
    if (aw.length) setTimeout(() => fx.sfx.awards(), 300);
    const ag = $('#m-again'); if (ag) ag.onclick = () => { closeModal(); net.restart(); net.start(); };
    const lb = $('#m-lobby'); if (lb) lb.onclick = () => { closeModal(); net.restart(); };
  }, 3400 * fx.S());
}

// ---------- đồng hồ (thanh đếm ngược) ----------
let lastTick = 0, lastBeat = 0;
function frame() {
  requestAnimationFrame(frame);
  if (!view || view.phase !== 'playing') { $('#clockbar').className = 'clockbar'; return; }
  const left = Math.max(0, clockEnd - Date.now()), frac = clockEnd ? left / clockTotal : 0;
  const w = $('#wprog'); if (w) w.style.width = (frac * 100).toFixed(1) + '%';
  const mt = $('#mtimer'); if (mt) mt.style.width = (frac * 100).toFixed(1) + '%';
  const cb = $('#clockbar');
  const ck = view.clock;
  if (ck && ck.kind !== 'window' && clockEnd) {
    const who = view.pending ? view.pending.player : view.players[view.turn].id;
    const mine = who === myId; const sec = Math.ceil(left / 1000);
    cb.className = 'clockbar on' + (mine ? ' mine' : '') + (sec <= 10 ? ' low' : '');
    cb.querySelector('i').style.width = (frac * 100).toFixed(1) + '%';
    cb.dataset.t = `⏱ ${mine ? 'Bạn' : pname(who)} · ${sec}s`;
    if (mine && sec <= 5 && sec > 0 && sec !== lastTick) { lastTick = sec; fx.sfx.tick(); }
  } else cb.className = 'clockbar';
  // tim đập khi tới lượt mình mà nguy cơ cao (khi tắt nhạc)
  if (isMyTurn() && !fx.musicIsOn() && risk(view) >= 0.25 && Date.now() - lastBeat > 1300 - risk(view) * 500) { lastBeat = Date.now(); fx.sfx.heartbeat(0.12 + risk(view) * 0.25); }
}
requestAnimationFrame(frame);

// ---------- hoạt ảnh theo sự kiện ----------
const seatEl = pid => pid === myId ? $('#hand') : $(`.seat[data-pid="${pid}"] .av`);
const KIND_FX = {
  attack: ['🫵 ĐỔ VỎ!', 'attack'], skip: ['🏃 NÉ GẮT!', 'skip'], shuffle: ['🌀 XÀO BÀI!', 'shuffle'], future: ['🔮 SOI KÈO', 'future'],
  alter: ['🪄 CẢI MỆNH', 'alter'], favor: ['🙏 XIN VÍA', 'favor'], bottom: ['🪝 MÓC ĐÁY', 'skip'], pair: ['🐾 ĐÔI MÈO!', 'steal'], triple: ['🎯 BỘ BA MÈO!', 'steal'],
};
function flyToDiscard(cards, from, delay = 0) {
  landing++; landingAt = Date.now();
  cards.forEach((c, i) => fx.fly(cardHTML(c), from, $('#discard'), { delay: delay + i * 110, duration: 420, rotate: (i - 1) * 8, onEnd: i === cards.length - 1 ? () => { landing = Math.max(0, landing - 1); renderDiscard(); fx.pop($('#discard .top')); } : null }));
}
// lá Mèo Nổ bốc trúng: mèo mang màu lông của người bốc; có Gỡ Bom → hú hồn, không có → khóc
function revealBomb(dur = 1300, by = null, safe = true) {
  const n = document.createElement('div'); n.className = 'reveal ' + (safe ? 'safe' : 'doom');
  const who = by ? (by === myId ? 'BẠN' : esc(pname(by))) : '';
  n.innerHTML = fx.comicBurst('#fff3b0', '#ff8a00', 12) + cardHTML({ t: 'bomb' }, 'lg', '', { mood: safe ? 'phew' : 'cry', fur: by ? furOf(by) : undefined }) + '<b class="reveal-bang">!!</b>' + (who ? `<span class="reveal-who">${who}${safe ? ' · có Gỡ Bom 😮‍💨' : ' · hết Gỡ Bom 😭'}</span>` : '');
  $('#fx-layer').appendChild(n); setTimeout(() => n.remove(), dur * fx.S());
}
function playEvents(evs, prev) {
  let t = 0; const S = fx.S();
  for (const e of evs) {
    const at = t;
    const run = f => setTimeout(f, at);
    switch (e.k) {
      case 'start': run(() => dealAnim()); t += 900 * S; break;
      case 'play': run(() => {
        fx.clearStamps();
        flyToDiscard(e.cards || [], seatEl(e.by));
        const [txt, s] = KIND_FX[e.kind] || ['', 'play']; fx.sfx.play(); setTimeout(() => (fx.sfx[s] || fx.sfx.play)(), 200 * S);
        fx.banner(txt, 'k-' + e.kind);
        if (e.kind === 'pair' || e.kind === 'triple') fx.sfx.meow(0.15, e.kind === 'triple' ? 0.9 : 1.3, 0.07);
        if (e.to) setTimeout(() => fx.floatText(seatEl(e.to), e.to === myId ? '😨 Bạn!' : '🎯'), 300 * S);
      }); t += 250 * S; break;
      case 'nope': run(() => {
        flyToDiscard([e.card || { t: 'nope' }], seatEl(e.by)); setMood('panic', 900); fx.shake($('#strip'));
        const lv = e.nopes || 1; fx.sfx.stamp(lv);
        fx.stamp({ level: lv, who: e.by === myId ? 'Bạn' : pname(e.by), cancel: lv % 2 === 1, at: fx.ctr($('#center')) });
      }); t += 250 * S; break;
      case 'noped': run(() => { fx.sfx.denied(); fx.floatText(seatEl(e.by), '❌ Bị HUỶ KÈO!', 'bad'); }); break;
      case 'resolve': run(() => {
        if (e.kind === 'shuffle') { fx.sfx.shuffle(); fx.pop($('#deck'), 'shuffling'); }
        if (e.kind === 'attack') { fx.sfx.attack(); }
      }); break;
      case 'future': run(() => { if (e.by === myId && e.cards) futureModal(e.cards); else fx.floatText(seatEl(e.by), '🔮👀'); }); break;
      case 'altered': run(() => { fx.sfx.alter(); fx.floatText(seatEl(e.by), '🪄'); }); break;
      case 'draw': run(() => {
        const mine = e.by === myId;
        fx.fly(mine && e.card ? cardHTML(e.card) : cardHTML(null), e.bottom ? $('#deck .mcard') : $('#deck .top'), seatEl(e.by), { duration: mine ? 520 : 420, cls: mine ? 'reveal-fly' : '' });
        fx.sfx.draw();
        if (mine && e.card) { freshIds = new Set([e.card.id]); setTimeout(() => { freshIds.clear(); $$('#hand .fresh').forEach(x => x.classList.remove('fresh')); }, 2500 * S); setTimeout(() => { fx.floatText($('#hand'), 'Phù… an toàn 😮‍💨', 'ok'); }, 450 * S); render(); }
      }); t += 300 * S; break;
      case 'bomb': {
        run(() => { revealBomb(1400, e.by, true); fx.sfx.fuse(); fx.shake($('#table')); setMood('panic', 1800); fx.banner(e.by === myId ? '💣 BẠN BỐC TRÚNG MÈO NỔ!' : `💣 ${pname(e.by)} bốc trúng Mèo Nổ!`, 'bomb'); });
        t += 1500 * S; break;
      }
      case 'boom': {
        run(() => { revealBomb(1100, e.by, false); fx.sfx.fuse(); fx.sfx.meow(0.2, 0.75, 0.07); fx.banner(e.by === myId ? '💣 MÈO NỔ… không có Gỡ Bom!' : `💣 ${pname(e.by)} bốc trúng Mèo Nổ!`, 'bomb'); });
        setTimeout(() => { setMood('dizzy', 2600); fx.sfx.boom(); fx.explode(seatEl(e.by) || $('#deck'), [catSVG('cat1'), catSVG('cat2'), catSVG('cat3'), catSVG('cat4'), catSVG('cat5')]); fx.banner(e.by === myId ? '💥 Bạn đã nổ tung!' : `💥 ${pname(e.by)} nổ tung!`, 'boom'); }, at + 1100 * S);
        t += 2600 * S; break;
      }
      case 'defuse': run(() => {
        fx.sfx.defuse(); fx.banner('✂️ Gỡ bom thành công!', 'defuse'); setMood('happy', 1500);
        fx.fly(cardHTML(null), seatEl(e.by), $('#deck .top'), { duration: 520, cls: 'sneak' }); setTimeout(() => fx.floatText($('#deck'), '🤫'), 500 * S);
        if (e.by === myId && e.pos != null) toast(`Bạn đã nhét bom ở: ${posLabel(e.pos, view.deckCount - 1).split(' –')[0].toLowerCase()} 🤫`);
      }); t += 500 * S; break;
      case 'give': case 'steal': run(() => {
        const from = e.k === 'give' ? e.by : e.to, to = e.k === 'give' ? e.to : e.by;
        const seen = e.card && (from === myId || to === myId);
        fx.fly(seen ? cardHTML(e.card) : cardHTML(null), seatEl(from), seatEl(to), { duration: 560 }); fx.sfx.steal();
        if (to === myId && e.card) setTimeout(() => toast(`🎁 Bạn nhận được ${cardName(e.card.t)} từ ${pname(from)}`), 500 * S);
        if (from === myId && e.card) setTimeout(() => toast(`😿 ${pname(to)} lấy mất ${cardName(e.card.t)} của bạn`), 500 * S);
      }); t += 400 * S; break;
      case 'miss': run(() => { fx.floatText(seatEl(e.to), '🙈 Hụt!'); fx.sfx.denied(); }); break;
      case 'turn': run(() => {
        if (e.by === myId) { fx.sfx.turn(); fx.pop($('#hand'), 'pulse'); if (e.turns > 1) fx.banner(`😬 Bạn phải đi ${e.turns} lượt!`, 'attack'); }
        else if (e.turns > 1) fx.floatText(seatEl(e.by), `×${e.turns}`, 'bad');
      }); break;
      case 'win': setTimeout(() => { fx.confetti(); fx.sfx.win(); fx.musicStinger(view && view.winner === myId ? 'win' : 'lose'); }, at + 600 * S); break;
    }
  }
  void prev;
}
function dealAnim() {
  let k = 0;
  for (let r = 0; r < 3; r++) for (const p of view.players) { if (p.out) continue; fx.fly(cardHTML(null), $('#deck .top'), seatEl(p.id), { delay: (k++) * 40, duration: 360 }); }
  fx.sfx.shuffle();
  setTimeout(() => { fx.banner('Né bom thôi! 💣', 'start'); fx.sfx.meow(0, 1.1, 0.08); }, (k * 40 + 380) * fx.S());
}
if (location.hash === '#debug') window.__dbg = () => ({ net, view, sel: [...sel], skipped });

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
