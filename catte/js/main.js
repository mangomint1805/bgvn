import { Host, Client, MAX, loadSnapshot, session, setSpeedFn, CT_PHRASES, NEXT_MS } from './net.js?v=13';
import { linkCode, clearLinkCode, inviteUrl, joinByLink } from '../../shared/net/joinlink.js?v=2';
import { createReactions } from '../../shared/ui/react.js?v=2';
import { netStatus } from '../../shared/ui/status.js';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=130';
import { cardName, rankLabel, SUIT_SYM, SUIT_NAME, WHITE_NAME, OPT_CHOICES, CUT, REFILL, parseCard } from './engine.js?v=2';
import { cardHTML, cardTxt, suitTxt } from './cards.js?v=3';
import { initHandDrag } from '../../shared/ui/handsort.js?v=3';
import * as fx from './cfx.js?v=3';
import { openGuide } from './guide.js?v=4';
setSpeedFn(fx.S);

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const GAME = 'catte';

let net = null, isHost = false, myId = null, lobby = null, view = null;
let lastEv = 0, lastHandSeen = 0, modalKey = null, sel = null, clockEnd = 0, clockTotal = 1;
let resultT = null, hold = null, holdT = null, sdBusy = 0, sdQueue = [], resultFor = null, seen = new Set(), lastTap = { id: null, t: 0 };

// ---------- tiện ích ----------
const AV_COL = ['#ff6b35', '#ff5d8f', '#e0a800', '#2fbf71', '#14b8a6', '#3a86ff', '#8e5cf7', '#d94dff', '#a0693a', '#5b6b8a'];
const clean = n => String(n || '').replace(' 🤖', '').trim();
const avColor = name => { let h = 0; for (const ch of clean(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AV_COL[h % AV_COL.length]; };
const initial = name => esc(([...clean(name)][0] || '?').toUpperCase());
const fmt = n => n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace('.0', '') + 'k' : String(n);
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); if (id !== 'screen-game') fx.musicMood('lobby'); }
let toastT;
function toast(m) { const t = $('#toast'); t.innerHTML = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
function openModal(html, cls = '', key = null) { const b = $('#modal-box'); b.onclick = null; b.className = 'modal-box ' + cls; b.innerHTML = html; $('#modal').classList.add('open'); modalKey = key; }
function closeModal() { $('#modal').classList.remove('open'); modalKey = null; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && modalKey !== 'result') closeModal(); });
window.__closeModal = closeModal;

// ---------- thả emoji / chọc nhau ----------
const reacts = createReactions({
  send: e => { if (!net) return; if (isHost) net.react('host', e); else net.react(e); },
  seatEl: id => $(`.seat[data-pid="${id}"] .av`),
  myId: () => myId,
  nameOf: id => { const p = view && view.players.find(x => x.id === id); return p ? clean(p.name) : ''; },
  mount: $('#table'), place: 'right:6px;bottom:6px',
  phrases: CT_PHRASES,
  onShow: () => fx.sfx.flip(),
});
reacts.setVisible(false);

// ---------- trang chủ ----------
$('#name').value = ls.get('bgvn-name') || '';
$('#hero').innerHTML = ['9H', 'KS', 'AH', '7C', 'QD'].map((id, i) => cardHTML(parseCard(id), 'hero-card', `style="--r:${(i - 2) * 12}deg;--d:${i * 90}ms"`)).join('');
function myName() { const n = $('#name').value.trim() || 'Bạn'; ls.set('bgvn-name', n); return n; }
const handlers = {
  onLobby(info, code, started) { lobby = info; $('#room-code').textContent = code; if (!started) { view = null; renderLobby(); if (!$('#screen-lobby').classList.contains('active')) { closeModal(); show('screen-lobby'); } } },
  onState(v) { onState(v); },
  onError(m) { toast(esc(m)); fx.sfx.bad(); },
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
function leave() { if (net) (net.leave ? net.leave() : net.destroy()); net = null; view = null; lobby = null; closeModal(); clearSd(); reacts.setVisible(false); show('screen-home'); }
$('#btn-leave-lobby').onclick = leave;
$('#btn-leave').onclick = () => openModal(`<h2>Rời bàn?</h2><p class="ctr">${isHost ? 'Bạn là chủ phòng – rời đi là giải tán bàn luôn đó.' : 'Bạn vào lại được bằng mã phòng (bot đánh giùm lúc vắng).'}</p><div class="btns"><button class="btn" onclick="__closeModal()">Ở lại</button><button class="btn red" id="m-leave">Rời bàn</button></div>`);
document.addEventListener('click', e => { if (e.target.id === 'm-leave') leave(); });
$('#btn-copy').onclick = () => { const url = inviteUrl($('#room-code').textContent); navigator.clipboard?.writeText(url).then(() => toast('Đã chép link mời 📋'), () => toast(esc(url))); };

// ---------- sảnh ----------
const OPT_TXT = {
  wQuads: ['🀄 Tới trắng: Tứ quý', '4 lá cùng số là thắng ngay khi chia.'],
  wFlush: ['🀄 Tới trắng: 6 lá đồng chất', '6 lá cùng 1 chất.'],
  wSmall: ['🀄 Tới trắng: 6 lá nhỏ hơn 6', 'Toàn lá 2, 3, 4, 5.'],
  bWhite: ['💰 Tới trắng ăn gấp đôi', 'Mỗi nhà trả thêm 1 cược.'],
  bSweep: ['🧹 Ăn trọn 4 vòng', 'Cả bàn chết: mỗi nhà trả thêm ½ cược.'],
  bLow: ['🐣 Tới bằng lá nhỏ', 'Từ 3 người: tới bằng K…2 ăn thêm ¼…3 cược mỗi người còn sống.'],
  thoiAt: ['🅰️ Thối Át', 'Chết mà còn giữ Át: phạt 1 cược mỗi Át.'],
};
function renderLobby() {
  if (!lobby) return;
  const ps = lobby.players, o = lobby.opts;
  $('#pcount').textContent = `${ps.length}/${MAX}`;
  $('#plist').innerHTML = ps.map(p => `<li><div class="av" style="background:${avColor(p.name)}">${initial(p.name)}</div><span>${esc(clean(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === myId ? ' <small>(bạn)</small>' : ''}${p.id === 'host' ? ' 👑' : ''}${!p.connected ? ' <small>📴</small>' : ''}${p.chips != null ? ` <small class="chipn">🪙${fmt(p.chips)}</small>` : ''}</span>${isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</li>`).join('');
  $$('#plist [data-rm]').forEach(b => b.onclick = () => net.removePlayer(b.dataset.rm));
  $('#btn-addbot').style.display = isHost && ps.length < MAX ? '' : 'none';
  const dis = isHost ? '' : 'disabled';
  const sel_ = (k, label, sub, fmtv) => `<label class="opt"><span><b>${label}</b><small>${sub}</small></span><select data-opt="${k}" ${dis}>${OPT_CHOICES[k].map(v => `<option value="${v}" ${String(o[k]) === String(v) ? 'selected' : ''}>${fmtv(v)}</option>`).join('')}</select></label>`;
  $('#opts').innerHTML =
    sel_('ante', '🪙 Tiền cược mỗi ván', 'Ai cũng góp vào nồi, người tới hốt hết.', v => v + ' chip') +
    sel_('startChips', '💼 Chip lúc vào bàn', 'Chip ảo – hết thì xin mẹ.', v => v + ' chip') +
    sel_('showdown', '🔥 Vòng 5', 'Chưng: chọn lá úp cùng lúc rồi lật.', v => v === 'chung' ? '🤫 Chưng bài' : '👀 Đánh lần lượt') +
    sel_('turnTime', '⏱ Đồng hồ mỗi lượt', 'Hết giờ máy đánh giùm.', v => v + ' giây') +
    Object.entries(OPT_TXT).map(([k, [t, sub]]) => `<label class="opt"><input type="checkbox" data-opt="${k}" ${o[k] ? 'checked' : ''} ${dis}><span><b>${t}</b><small>${sub}</small></span></label>`).join('');
  $$('#opts [data-opt]').forEach(i => i.onchange = () => net.setOpt(i.dataset.opt, i.type === 'checkbox' ? i.checked : i.value));
  $('#btn-start').style.display = isHost ? '' : 'none';
  $('#wait-msg').style.display = isHost ? 'none' : '';
}
$('#btn-addbot').onclick = () => net && net.addBot();
$('#btn-start').onclick = () => { fx.actx(); net && net.start(); };

// ---------- công cụ ----------
const SPEED_IC = { slow: '🐢', normal: '⚡', fast: '🚀' };
function syncSpeed() { $('#speed-btn').textContent = SPEED_IC[fx.getSpeed()] || '⚡'; }
$('#speed-btn').onclick = () => { const ks = Object.keys(fx.SPEEDS); const k = ks[(ks.indexOf(fx.getSpeed()) + 1) % ks.length]; fx.setSpeed(k); syncSpeed(); toast(`${SPEED_IC[k]} Tốc độ hiệu ứng: ${fx.SPEEDS[k].name}`); };
syncSpeed();
const syncMusic = () => { $('#btn-music').classList.toggle('on', fx.musicIsOn()); $('#btn-music-home').classList.toggle('on', fx.musicIsOn()); };
$('#btn-music').onclick = $('#btn-music-home').onclick = () => { fx.actx(); fx.musicToggle(); syncMusic(); }; syncMusic();
const syncMute = () => $('#btn-mute').textContent = fx.isMuted() ? '🔇' : '🔊';
$('#btn-mute').onclick = () => { fx.toggleMute(); syncMute(); }; syncMute();
$('#btn-guide').onclick = $('#btn-guide-home').onclick = () => openGuide(openModal);
for (const id of ['#btn-news', '#btn-news-home']) { newsBadge($(id), 'catte'); $(id).onclick = () => { openNews('catte'); $$('#btn-news, #btn-news-home').forEach(b => b.classList.toggle('bgvn-dot', false)); }; }
$('#btn-log').onclick = () => $('#log').classList.toggle('open');
$('#btn-log-close').onclick = () => $('#log').classList.remove('open');

// ---------- gửi hành động ----------
function send(a) { if (!net) return; if (isHost) net.act('host', a); else net.act(a); }
const me = () => view && view.players.find(p => p.id === myId);
const pl = id => view && view.players.find(p => p.id === id);
const pname = id => id === myId ? 'Bạn' : clean((pl(id) || (view && (view.waitingSeats || []).find(p => p.id === id)) || {}).name || '?');
const myTurn = () => !!(view && view.waiting && view.waiting.includes(myId));
const alive = () => view.players.filter(p => p.inHand && !p.out);

// ---------- nhận state ----------
function onState(v) {
  if (!v) { view = null; closeModal(); clearSd(); show('screen-lobby'); renderLobby(); reacts.setVisible(false); return; }
  const newMatch = !!(view && view.gid !== v.gid);
  const first = !view || newMatch || !$('#screen-game').classList.contains('active');
  view = v;
  if (v.clock) { clockEnd = Date.now() + v.clock.ms; clockTotal = v.clock.total || 1; } else clockEnd = 0;
  if (first) { show('screen-game'); closeModal(); sel = null; hold = null; clearSd(); seen = new Set(); }
  let evs = first ? [] : v.ev.filter(e => e.n > lastEv);
  // tụt quá xa (vừa vào lại, tab ngủ) → bỏ hoạt ảnh, nhảy thẳng tới hiện tại
  if (evs.length && (evs[0].n > lastEv + 1 || evs.length > 14 || document.hidden)) evs = [];
  if (first && v.handNo === 1 && v.evN <= 3) evs = v.ev.filter(e => e.k === 'deal' || e.k === 'win');
  lastEv = v.evN;
  if (v.handNo !== lastHandSeen) { lastHandSeen = v.handNo; sel = null; if (modalKey === 'result') closeModal(); resultFor = null; clearTimeout(resultT); resultT = null; hold = null; clearTimeout(holdT); clearSd(); }
  if (sel && !(me() && me().hand.some(c => c.id === sel))) sel = null;
  if (hold && v.trick && v.trick.plays.length) gather(true);
  playEvents(evs);
  render();
  if (v.phase === 'handEnd' && !sdBusy && !sdQueue.length && resultFor !== v.handNo && !resultT) scheduleResult(evs.some(e => e.k === 'win' && e.how === 'sweep') ? 3000 * fx.S() : evs.some(e => e.k === 'win') ? 1200 * fx.S() : 0);
}
function scheduleResult(ms) { clearTimeout(resultT); resultT = setTimeout(() => { resultT = null; showResult(); }, ms); }

// ---------- vẽ bàn ----------
function seatOrder(v) {
  const n = v.players.length, i0 = Math.max(0, v.players.findIndex(p => p.id === myId));
  const out = []; for (let k = 0; k < n; k++) out.push(v.players[(i0 + k) % n]); return out;
}
function geom() {
  const t = $('#table'), W = t.clientWidth, H = t.clientHeight;
  const compact = W < 520 || H < 330;
  const sw = compact ? 66 : 90, sh = compact ? 84 : 92, chh = compact ? 26 : 39;
  const rx = Math.max(60, W / 2 - sw / 2 - 4), ry = Math.max(60, H / 2 - sh / 2 - 2);
  // lá vừa đánh nằm giữa ghế và nồi: không đè lên ghế, không đè lên nồi
  const f = Math.max((14 + chh) / ry, Math.min(0.56, (ry - sh / 2 - chh - 4) / ry));
  return { W, H, compact, cx: W / 2, cy: H / 2, rx, ry, f };
}
function render() {
  const v = view; if (!v) return;
  // nhạc: vòng chưng / các nước cuối (sau vòng loại) = gay cấn
  fx.musicMood(v.phase === 'chung' || (v.phase === 'play' && v.trickNo > CUT) ? 'tense' : 'game');
  $('#hand-no').textContent = `Ván ${v.handNo}`;
  renderProg(v); renderPrompt(v); renderHand(v); renderActions(v); renderSeats(v); renderPot(v);
  $('#table').classList.toggle('hot', v.phase !== 'handEnd' && v.trickNo > CUT);
  reacts.setVisible(true);
  $('#log-list').innerHTML = v.log.map(l => `<li>${esc(l)}</li>`).join('');
  $('#log-list').scrollTop = 1e6;
}
function renderProg(v) {
  const hist = v.history || [];
  const cur = v.phase === 'handEnd' ? 0 : v.trickNo;
  const pips = [];
  for (let i = 1; i <= 6; i++) {
    const h = hist.find(x => x.no === i), w = h && pl(h.winner);
    pips.push(`<span class="pip-t ${i > CUT ? 'fire' : ''} ${i === cur ? 'cur' : ''} ${h ? 'done' : ''}" title="Vòng ${i}${h ? ': ' + esc(pname(h.winner)) + ' ăn' : ''}" ${w ? `style="--c:${avColor(w.name)}"` : ''}>${h ? (h.winner === myId ? '⭐' : initial(w ? w.name : '?')) : i > CUT ? '🔥' : i}</span>`);
    if (i === CUT) pips.push('<span class="cut" title="Hết vòng 4: ai chưa có tùng nào là chết">☠️</span>');
  }
  let right = '';
  if (v.phase === 'handEnd') right = v.result ? `🏆 <b>${esc(pname(v.result.winner))}</b>` : '';
  else if (v.trickNo === 1) right = '🎯 Ăn 1 vòng để sống';
  else if (v.trickNo <= CUT) { const r = alive().filter(p => !p.won); right = r.length ? `☠️ <b>${r.length}</b> người chưa ăn` : '😮‍💨 Ai cũng sống'; }
  else right = `🔥 Lật bài · ${alive().length} người`;
  $('#prog').innerHTML = `<span class="rd">${v.phase === 'handEnd' ? 'Hết ván' : `Vòng <b>${v.trickNo}</b>/6`}</span><span class="pips">${pips.join('')}</span><span class="risk">${right}</span>`;
}
function displayPlays(v) {
  if (hold) return { plays: hold.plays, winner: hold.winner, top: null, done: true };
  if (!v.trick) return { plays: [], top: null };
  return { plays: v.trick.plays, top: v.trick.top ? v.trick.top.pid : null };
}
function renderSeats(v) {
  const g = geom(), order = seatOrder(v), n = order.length;
  $('#table').classList.toggle('compact', g.compact);
  const D = displayPlays(v);
  const turnIds = v.waiting || [];
  const showdown = v.phase !== 'handEnd' && v.trickNo > CUT;
  const html = order.map((p, k) => {
    const ang = (90 - k * 360 / n) * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
    const x = g.cx + g.rx * ca, y = g.cy + g.ry * sa;
    const sx = g.cx + g.rx * g.f * ca, sy = g.cy + g.ry * g.f * sa * (Math.abs(sa) <= 0.6 ? 1.35 : 1); // ghế hai bên: giãn lá theo chiều dọc cho khỏi chồng nhau
    const play = D.plays.find(q => q.pid === p.id);
    const isTop = play && !play.down && (D.done ? D.winner === p.id : D.top === p.id);
    const risk = v.phase !== 'handEnd' && p.inHand && !p.out && !p.won && v.trickNo <= CUT && v.trickNo >= 2;
    const away = (v.away || []).includes(p.id);
    const badge = p.out ? '<span class="bd dead">💀</span>' : risk ? `<span class="bd risk ${v.trickNo === CUT ? 'hot' : ''}">☠️</span>` : away ? '<span class="bd">📴</span>' : '';
    const wins = p.won ? `<span class="wins">${p.won > 3 ? `✅×${p.won}` : '✅'.repeat(p.won)}</span>` : '';
    let slot = '';
    const key = `${v.handNo}-${hold ? hold.no : v.trickNo}-${p.id}`;
    if (play) {
      const fresh = !seen.has(key); seen.add(key);
      const c = play.down ? (play.card && p.id === myId ? play.card : null) : play.card;
      slot = `<div class="slot ${fresh ? 'in' : ''} ${play.down ? 'down' : ''} ${isTop ? 'top' : ''}" data-slot="${p.id}" style="left:${sx}px;top:${sy}px;--fx:${(x - sx).toFixed(0)}px;--fy:${(y - sy).toFixed(0)}px">${cardHTML(c, play.down ? 'folded' + (c ? ' mine' : '') : '')}${isTop ? '<span class="crown">👑</span>' : ''}${play.down ? '<span class="dn">úp</span>' : ''}</div>`;
    } else if (v.phase === 'chung' && v.chung && v.chung.picks && p.id in v.chung.picks) {
      const mine = p.id === myId && typeof v.chung.picks[p.id] === 'string';
      slot = `<div class="slot chungp" data-slot="${p.id}" style="left:${sx}px;top:${sy}px">${cardHTML(mine ? parseCard(v.chung.picks[p.id]) : null, mine ? 'mine-pick' : '')}<span class="dn">🤫</span></div>`;
    }
    const cls = ['seat', turnIds.includes(p.id) ? 'turn' : '', p.out ? 'out' : '', risk ? 'risk' : '', p.id === myId ? 'mine' : '', v.result && v.result.winner === p.id ? 'winner' : '', showdown && p.inHand && !p.out ? 'alive' : '', v.leader === p.id && v.trickNo === 1 && v.phase !== 'handEnd' ? 'dealer' : ''].join(' ');
    return slot + `<div class="${cls}" data-pid="${p.id}" style="left:${x}px;top:${y}px"><div class="av" style="background:${avColor(p.name)}">${initial(p.name)}${badge}${p.isBot ? '<span class="bot">🤖</span>' : ''}</div><div class="nm">${p.id === myId ? 'Bạn' : esc(clean(p.name))}</div><div class="sub"><span class="chips">🪙${fmt(p.chips)}</span>${wins}</div></div>`;
  }).join('');
  $('#seats').innerHTML = html;
}
function renderPot(v) {
  const amt = v.phase === 'handEnd' && v.result ? v.result.pot : v.pot;
  $('#pot').innerHTML = `<b title="Nồi chip ảo">🪙 ${fmt(amt)}</b>`;
}
function renderPrompt(v) {
  const m = me(); let h = '', sub = '', cls = '';
  const t = v.trick;
  if (!m) { h = '👀 Bạn đang ngồi ghế chờ'; sub = 'Ván sau sẽ được chia bài nha.'; }
  else if (v.phase === 'handEnd' && (sdBusy || sdQueue.length)) { h = '🥁 Đang lật bài…'; sub = 'Nín thở nào 😳'; cls = 'hot'; }
  else if (v.phase === 'handEnd') {
    const r = v.result || {};
    h = r.winner === myId ? (r.how === 'white' ? '🀄 BẠN TỚI TRẮNG!!' : r.how === 'sweep' ? '🧹 BẠN ĂN TRẮNG!!' : '🏆 BẠN TỚI RỒI!!') : `🏆 ${esc(pname(r.winner))} ${r.how === 'white' ? 'tới trắng' : r.how === 'sweep' ? 'ăn trắng' : 'tới'}!`;
    sub = 'Ván mới chia sau ít giây…'; cls = r.winner === myId ? 'win' : '';
  } else if (m.out) { h = '☠️ Bạn chết rồi…'; sub = 'Ngồi hóng drama lật bài nha 🍿'; cls = 'dead'; }
  else if (v.phase === 'chung') {
    const picked = v.chung && v.chung.picks && myId in v.chung.picks;
    if (v.chung.need.includes(myId) && !picked) { h = '🤫 CHƯNG BÀI! Chọn 1 lá úp'; sub = `Cái ra ${cardTxt(t.plays[0].card)} – lá ${suitTxt(t.lead)} lớn hơn mới ăn. Lật cùng lúc!`; cls = 'mine hot'; }
    else { h = picked ? '🤐 Đã chưng – chờ cả bàn…' : `🤫 Mọi người đang chưng bài…`; sub = `${Object.keys(v.chung.picks || {}).length}/${v.chung.need.length} người đã chọn`; }
  } else if (myTurn()) {
    cls = 'mine';
    if (!t.plays.length) {
      h = t.no > CUT ? `👑 Bạn cầm cái vòng ${t.no} – LẬT BÀI!` : `👑 Bạn cầm cái vòng ${t.no}`;
      sub = t.no > CUT ? 'Ra lá mà người khác không đè được nha.' : !m.won ? `Đánh lá bất kỳ · <b>chưa có tùng nào</b> – còn ${CUT - t.no + 1} vòng để tranh tùng ☠️` : 'Đánh lá bất kỳ. Có tồn rồi, giữ lá to cho lật bài 😎';
      if (t.no > CUT) cls += ' hot';
    } else if (t.no > CUT) { h = '🔥 Lật bài! Chọn 1 lá'; sub = `Lá đang ăn ${cardTxt(t.top.card)} – lá ${suitTxt(t.lead)} lớn hơn mới ăn.`; cls += ' hot'; }
    else {
      const can = (v.legal || []).some(x => !x.down);
      h = '⚔️ ĐÈ hoặc ÚP?';
      sub = can ? `Lá đang ăn ${cardTxt(t.top.card)} · lá <b class="okc">sáng xanh ⬆</b> đè được` : `Không có lá ${suitTxt(t.lead)} lớn hơn ${cardTxt(t.top.card)} – úp 1 lá thôi 🙈`;
      if (!m.won) sub += ` · ${t.no === CUT ? '<b class="bad">vòng cuối để sống!</b>' : 'chưa có tùng ☠️'}`;
    }
  } else {
    const w = (v.waiting || [])[0];
    h = `⏳ <b>${esc(pname(w))}</b> đang ${t && !t.plays.length ? 'cầm cái' : 'suy nghĩ'}…`;
    sub = t && t.top ? `Lá đang ăn: ${cardTxt(t.top.card)} của ${esc(pname(t.top.pid))}` : (m.won ? `Bạn có ${m.won} tùng ✅` : (t && t.no <= CUT ? 'Bạn chưa có tùng nào ☠️' : ''));
  }
  const p = $('#prompt'); p.className = 'prompt ' + cls;
  p.innerHTML = `<div class="ph">${h}</div><div class="ps">${sub}</div>`;
}
const SUIT_ORD = { S: 0, C: 1, D: 2, H: 3 };
// tự xếp bài: kéo lá sang trái/phải (chỉ là giao diện, nhớ trong ván đang chơi)
let ownOrd = null;
const drag = initHandDrag($('#hand'), {
  attr: 'id', str: true,
  enabled: () => !!(view && me() && me().hand.length > 1),
  selected: () => new Set(),
  onDrop: ids => { if (ids) { ownOrd = { no: view.handNo, ids }; fx.sfx.flip(); } renderHand(view); },
});
$('#btn-resort').onclick = () => { ownOrd = null; renderHand(view); };
function renderHand(v) {
  const m = me(); const hEl = $('#hand');
  if (!m) { hEl.innerHTML = '<div class="empty-hand">🪑 Ghế chờ</div>'; return; }
  let hand = [...m.hand].sort((a, b) => SUIT_ORD[a.s] - SUIT_ORD[b.s] || a.r - b.r);
  if (ownOrd && ownOrd.no !== v.handNo) ownOrd = null; /* ván mới: xếp lại tự động */
  if (ownOrd) { const pos = id => { const i = ownOrd.ids.indexOf(id); return i < 0 ? 99 : i; }; hand = hand.map((c, i) => [c, i]).sort((a, b) => pos(a[0].id) - pos(b[0].id) || a[1] - b[1]).map(x => x[0]); }
  $('#btn-resort').hidden = !ownOrd || hand.length < 2;
  /* đang kéo dở: giữ nguyên tay bài, trừ khi bài trên tay đã đổi */
  if (drag.active) { if (hand.map(c => c.id).join() !== [...hEl.querySelectorAll('.pc[data-id]')].map(x => x.dataset.id).join()) drag.cancel(); else return; }
  const turn = myTurn(), legal = v.legal || [];
  const canBeat = id => legal.some(x => x.card === id && !x.down);
  const lead = v.trick && !v.trick.plays.length;
  const pickedId = v.phase === 'chung' && v.chung && typeof (v.chung.picks || {})[myId] === 'string' ? v.chung.picks[myId] : null;
  hEl.className = 'hand n' + hand.length + (turn ? ' myturn' : '') + (m.out ? ' dead' : '');
  hEl.innerHTML = hand.length ? hand.map(c => {
    const cls = [turn && (canBeat(c.id) && !lead && v.trickNo <= CUT) ? 'can' : '', turn && (lead || v.trickNo > CUT) ? 'any' : '', sel === c.id ? 'sel' : '', !turn ? 'idle' : '', pickedId === c.id ? 'picked' : ''].join(' ');
    return cardHTML(c, cls);
  }).join('') : `<div class="empty-hand">${m.out ? '💀 Hết phần' : v.phase === 'handEnd' ? '🃏 Chờ chia ván mới' : '🫥'}</div>`;
  $$('#hand .pc').forEach(el => el.onclick = () => onCard(el.dataset.id));
}
function renderActions(v) {
  const a = [], m = me();
  if (v.phase === 'handEnd') {
    if (isHost) a.push(`<button class="btn pri" data-a="next">▶ Ván tiếp <small id="next-s"></small></button>`);
    if (m && m.chips < v.opts.ante * 4) a.push('<button class="btn gold" data-a="refill">🧧 Xin mẹ thêm chip</button>');
    a.push('<button class="btn" data-a="result">📋 Kết quả</button>');
  } else if (m && myTurn()) {
    const t = v.trick, c = sel && m.hand.find(x => x.id === sel);
    if (v.phase === 'chung') a.push(`<button class="btn pri big" data-a="up" ${c ? '' : 'disabled'}>🤫 Chưng ${c ? cardTxt(c) : 'lá này'}</button>`);
    else if (!t.plays.length || t.no > CUT) a.push(`<button class="btn pri big" data-a="up" ${c ? '' : 'disabled'}>🃏 ${t.no > CUT ? 'Lật' : 'Đánh'} ${c ? cardTxt(c) : ''}</button>`);
    else {
      const can = c && (v.legal || []).some(x => x.card === c.id && !x.down);
      a.push(`<button class="btn green big" data-a="up" ${can ? '' : 'disabled'}>⬆ Đè${can ? ' ' + cardTxt(c) : c ? '' : ' <small>chọn lá</small>'}</button>`);
      a.push(`<button class="btn dark big" data-a="down" ${c ? '' : 'disabled'}>🙈 Úp${c ? ' ' + cardTxt(c) : ''}</button>`);
    }
  }
  $('#actions').innerHTML = a.join('');
  $$('#actions [data-a]').forEach(b => b.onclick = () => doAct(b.dataset.a));
}
function doAct(k) {
  if (k === 'next') { closeModal(); if (isHost) net.nextHand(); return; }
  if (k === 'refill') { send({ type: 'refill' }); fx.sfx.chips(8); return; }
  if (k === 'result') { resultFor = null; showResult(true); return; }
  if (!sel) return;
  playCard(sel, k === 'down');
}
function playCard(id, down) {
  const v = view; if (!myTurn()) return;
  const legal = v.legal || [];
  if (v.phase !== 'chung' && !legal.some(x => x.card === id && !!x.down === !!down)) { fx.sfx.bad(); toast(down ? 'Không úp được lá này.' : 'Lá này không đè được – úp thôi 🙈'); return; }
  sel = null;
  if (v.phase === 'chung') fx.sfx.pick(); else if (down) fx.sfx.fold(); else fx.sfx.play();
  send({ type: 'play', card: id, down: !!down });
}
function onCard(id) {
  const v = view; if (!v || !me()) return;
  if (!myTurn()) { fx.sfx.flip(); toast(v.phase === 'handEnd' ? 'Ván đã xong rồi 😆' : me().out ? 'Bạn chết rồi, ngồi hóng thôi 💀' : 'Chưa tới lượt bạn – từ từ thôi 😉'); return; }
  const now = Date.now();
  // chạm 2 lần = làm luôn: đè nếu đè được, không thì úp
  if (lastTap.id === id && now - lastTap.t < 420) {
    lastTap = { id: null, t: 0 };
    const legal = v.legal || [];
    const up = legal.some(x => x.card === id && !x.down);
    playCard(id, !up && v.phase !== 'chung');
    return;
  }
  lastTap = { id, t: now };
  sel = sel === id ? null : id; fx.sfx.flip();
  renderHand(v); renderActions(v);
}
addEventListener('resize', () => view && render());
// bàn đổi kích thước (thanh nút / lời nhắc thay đổi) → xếp lại ghế cho khỏi lệch
if (window.ResizeObserver) { let rw = 0, rh = 0; new ResizeObserver(es => { const r = es[0].contentRect; if (view && (Math.abs(r.width - rw) > 1 || Math.abs(r.height - rh) > 1)) { rw = r.width; rh = r.height; renderSeats(view); } }).observe($('#table')); }

// ---------- kết quả ván ----------
function showResult(force = false) {
  const v = view; if (!v || v.phase !== 'handEnd' || !v.result) return;
  if (!force && resultFor === v.handNo) return; resultFor = v.handNo;
  const r = v.result, w = pl(r.winner), mine = r.winner === myId;
  const how = r.how === 'white' ? `🀄 Tới trắng: <b>${WHITE_NAME[r.kind]}${r.rank ? ' ' + rankLabel(r.rank) : ''}</b>` : r.how === 'sweep' ? '🧹 Ăn trọn 4 vòng – cả bàn chết!' : `Tới bằng ${cardTxt(r.card)} ở vòng 6`;
  const rows = v.players.filter(p => p.inHand).sort((a, b) => (r.deltas[b.id] || 0) - (r.deltas[a.id] || 0)).map(p => {
    const d = r.deltas[p.id] || 0;
    const st = p.id === r.winner ? '🏆' : p.out ? '☠️' : r.how === 'white' ? '😶' : '😵';
    const left = p.hand && p.hand.length ? `<span class="rh">${p.hand.map(c => cardHTML(c, 'xs')).join('')}</span>` : '';
    return `<tr class="${p.id === myId ? 'mine' : ''}"><td>${st}</td><td class="nm">${p.id === myId ? 'Bạn' : esc(clean(p.name))}${left}</td><td>${p.won ? '✅' + p.won : '–'}</td><td class="${d > 0 ? 'pos' : d < 0 ? 'neg' : ''}">${d > 0 ? '+' : ''}${d}</td><td>🪙${fmt(p.chips)}</td></tr>`;
  }).join('');
  const bon = r.bonuses && r.bonuses.length ? `<div class="bonus">${r.bonuses.map(b => `<span>💸 ${esc(pname(b.from))} → ${esc(pname(r.winner))}: <b>${b.amt}</b> (${esc(b.why)})</span>`).join('')}</div>` : '';
  const hands = r.how === 'white' && r.cards ? `<div class="wh-cards">${r.cards.map(c => cardHTML(c, 'sm')).join('')}</div>` : '';
  const quip = mine ? ['Đỉnh nóc kịch trần 🔥', 'Tới như chưa từng được tới 😎', 'Ăn hết, không chừa một cọng 🍜'] : r.how === 'white' ? ['Chưa kịp đánh đã thua 😶', 'Bài gì mà đẹp dữ vậy 😭', 'Nhân phẩm bùng nổ 🀄'] : r.how === 'sweep' ? ['Cả bàn lên bảng đếm số ☠️', 'Bị dắt mũi 4 vòng liền 🫠', 'Ăn trắng không trượt phát nào 🧹'] : (me() && me().out) ? ['Chết oan quá trời 😭', 'Lần sau giữ lá to nha 🫠', 'Úp nhiều quá rồi đó bạn ơi 🙈'] : ['Suýt nữa là tới rồi 🥲', 'Lá cuối không đủ đô 😮‍💨', 'GG, ván sau gỡ 💪'];
  const btns = `${isHost ? '<button class="btn pri" id="r-next">▶ Ván tiếp</button><button class="btn" id="r-lobby">Về sảnh</button>' : '<span class="muted">⏳ Chờ chủ phòng chia ván mới…</span>'}${me() && me().chips < v.opts.ante * 4 ? '<button class="btn gold" id="r-refill">🧧 Xin mẹ thêm chip</button>' : ''}<button class="btn" id="r-close">👀 Xem bàn</button>`;
  openModal(`<div class="result ${mine ? 'iwin' : ''}"><div class="big">${mine ? '🏆' : r.how === 'white' ? '🀄' : '🃏'}</div>
    <h2>${mine ? 'BẠN TỚI!!' : esc(clean(w ? w.name : '?')) + (r.how === 'white' ? ' TỚI TRẮNG!' : r.how === 'sweep' ? ' ĂN TRẮNG!' : ' TỚI!')}</h2>
    <p class="how">${how} · hốt nồi <b>🪙${r.pot}</b></p><p class="quip">${quip[v.handNo % quip.length]}</p>${hands}
    <table class="rt"><thead><tr><th></th><th class="nm">Người chơi</th><th title="Số vòng đã ăn">Vòng</th><th>± chip</th><th>Còn</th></tr></thead><tbody>${rows}</tbody></table>${bon}
    <div class="rnext" id="r-count"></div>
    <div class="btns">${btns}</div><p class="note">🎈 Chip ảo, chơi cho vui – không có giá trị thật.</p></div>`, 'wide', 'result');
  const b = id => $('#' + id);
  if (b('r-next')) b('r-next').onclick = () => { closeModal(); net.nextHand(); };
  if (b('r-lobby')) b('r-lobby').onclick = () => { closeModal(); net.restart(); };
  if (b('r-refill')) b('r-refill').onclick = () => { send({ type: 'refill' }); fx.sfx.chips(8); b('r-refill').remove(); };
  b('r-close').onclick = closeModal;
}

// ---------- màn lật bài kịch tính ----------
function clearSd() { sdQueue = []; sdBusy = 0; const s = $('#sd'); s.className = 'sd'; s.innerHTML = ''; }
function sdPush(fn) { sdQueue.push(fn); if (!sdBusy) sdNext(); }
function sdNext() {
  const fn = sdQueue.shift();
  if (!fn) {
    sdBusy = 0; $('#sd').className = 'sd'; $('#sd').innerHTML = '';
    if (view) render();
    if (view && view.phase === 'handEnd' && view.result) { fx.chipsFly($('#pot'), seatAv(view.result.winner), 8); fx.sfx.chips(8); scheduleResult(1000 * fx.S()); }
    return;
  }
  sdBusy = 1; const ms = fn();
  setTimeout(sdNext, ms);
}
function sdCards(list, title, sub) {
  const s = $('#sd');
  s.innerHTML = `<div class="sd-box"><h2 class="sd-t">${title}</h2><p class="sd-s">${sub}</p><div class="sd-row n${list.length}">${list.map(x => `<div class="sd-c" data-pid="${x.pid}"><div class="flip ${x.open ? 'open' : ''}"><div class="fb">${cardHTML(null)}</div><div class="ff">${cardHTML(x.card)}</div></div><span class="sd-n" style="--c:${avColor((pl(x.pid) || {}).name || '?')}">${x.pid === myId ? 'Bạn' : esc(pname(x.pid))}${x.tag ? `<small>${x.tag}</small>` : ''}</span></div>`).join('')}</div><div class="sd-w" id="sd-w"></div></div>`;
  s.className = 'sd on';
}
const flipEl = pid => { const e = $(`#sd .sd-c[data-pid="${pid}"] .flip`); if (e) e.classList.add('open'); };
function sdWin(pid, txt) {
  const c = $(`#sd .sd-c[data-pid="${pid}"]`); if (c) c.classList.add('win');
  $$('#sd .sd-c').forEach(x => { if (x !== c) x.classList.add('lose'); });
  const w = $('#sd-w'); if (w) { w.innerHTML = txt; w.classList.add('on'); }
}
// vòng 5 chưng: lá cái ngửa sẵn, cả bàn lật cùng lúc
function sdReveal(e) {
  sdPush(() => {
    const S = fx.S(), list = e.plays.map((x, i) => ({ ...x, open: i === 0, tag: i === 0 ? 'cầm cái' : 'chưng' }));
    sdCards(list, '🤫 CHƯNG BÀI – LẬT!', `Vòng 5 · lá ${suitTxt(list[0].card.s)} lớn nhất ăn`);
    fx.sfx.drum(1.1 * S);
    setTimeout(() => { list.forEach(x => flipEl(x.pid)); fx.sfx.reveal(); }, 1150 * S);
    setTimeout(() => { sdWin(e.winner, `${e.winner === myId ? '😎 Bạn' : '<b>' + esc(pname(e.winner)) + '</b>'} ăn vòng 5 → cầm cái vòng 6`); fx.sfx.trick(); }, 1900 * S);
    return 3100 * S;
  });
}
// vòng 6: lật lần lượt từng lá, lá cuối có trống dồn
function sdFinal() {
  sdPush(() => {
    const S = fx.S(), h = (view.history || []).find(x => x.no === 6);
    if (!h) return 10;
    const list = h.plays.map((x, i) => ({ ...x, tag: i === 0 ? 'cầm cái' : '' }));
    sdCards(list, '🔥 VÒNG 6 – LẬT BÀI!', `Ai ăn vòng này là <b>TỚI</b> 🏆 · lá ${suitTxt(list[0].card.s)} lớn nhất`);
    fx.sfx.showdown();
    let t = 800;
    list.forEach((x, i) => {
      const last = i === list.length - 1 && list.length > 1;
      if (last) { setTimeout(() => fx.sfx.drum(0.8 * S), t * S); t += 800; }
      setTimeout(() => { flipEl(x.pid); fx.sfx.reveal(); }, t * S); t += 850;
    });
    setTimeout(() => { sdWin(h.winner, h.winner === myId ? '🏆 BẠN TỚI!!!' : `🏆 <b>${esc(pname(h.winner))}</b> TỚI!`); fx.sfx.hit(); setTimeout(() => h.winner === myId ? fx.sfx.toi() : fx.sfx.lose(), 250 * S); if (h.winner === myId) fx.confetti(); }, t * S);
    return (t + 1500) * S;
  });
}
function sdWhite(e) {
  sdPush(() => {
    const S = fx.S(), cards = (view.result && view.result.cards) || [];
    const s = $('#sd');
    s.innerHTML = `<div class="sd-box white"><h2 class="sd-t">🀄 TỚI TRẮNG!</h2><p class="sd-s"><b>${esc(pname(e.by))}</b> vừa chia đã có <b>${WHITE_NAME[e.kind] || ''}</b></p><div class="sd-row n6 tight">${cards.map((c, i) => `<div class="sd-c"><div class="flip" style="--d:${i * 120}ms">${'<div class="fb">' + cardHTML(null) + '</div><div class="ff">' + cardHTML(c) + '</div>'}</div></div>`).join('')}</div><div class="sd-w on">Thắng luôn, khỏi đánh 😱</div></div>`;
    s.className = 'sd on';
    fx.sfx.white();
    setTimeout(() => $$('#sd .flip').forEach((f, i) => setTimeout(() => f.classList.add('open'), i * 120 * S)), 500 * S);
    if (e.by === myId) setTimeout(() => fx.confetti(), 900 * S);
    return 3300 * S;
  });
}

// ---------- hoạt ảnh theo sự kiện ----------
const seatAv = pid => $(`.seat[data-pid="${pid}"] .av`);
function gather(now = false) {
  if (!hold) return;
  const h = hold; hold = null; clearTimeout(holdT);
  if (!now && !fx.reduced()) {
    const to = seatAv(h.winner);
    $$('#seats .slot').forEach(sl => fx.fly(sl.innerHTML.replace(/<span class="(crown|dn)">.*?<\/span>/g, ''), sl, to, { duration: 380, scale: 0.4 }));
  }
  if (view) renderSeats(view), renderPot(view);
}
function playEvents(evs) {
  const S = fx.S();
  for (const e of evs) {
    switch (e.k) {
      case 'deal': setTimeout(() => {
        fx.sfx.shuffle();
        const pot = $('#pot'); let k = 0;
        for (let r = 0; r < 2; r++) for (const p of view.players) fx.fly(cardHTML(null), pot, seatAv(p.id), { delay: (k++) * 45, duration: 320, scale: 0.6 });
        if (!evs.some(x => x.k === 'win')) fx.banner(`🃏 Ván ${e.hand} · ${esc(pname(e.leader))} cầm cái`, 'deal', 1300);
        if (e.leader === myId) setTimeout(() => fx.sfx.turn(), 700 * S);
      }, 30); break;
      case 'play': {
        const pid = e.by;
        setTimeout(() => {
          const sl = $(`#seats .slot[data-slot="${pid}"]`);
          if (e.down) { fx.sfx.fold(); fx.floatText(sl || seatAv(pid), 'Úp 🙈', 'soft'); }
          else if (e.lead) { fx.sfx.play(); }
          else if (e.beat) { fx.sfx.beat(); fx.floatText(sl || seatAv(pid), e.card && e.card.r === 14 ? 'ĐÈ ÁT! 💥' : 'ĐÈ! ⬆', 'ok'); if (sl) fx.pop(sl, 'slam'); }
          else fx.sfx.play();
        }, 40);
        break;
      }
      case 'trick': {
        const h = (view.history || []).find(x => x.no === e.no);
        if (!h) break;
        clearTimeout(holdT);
        hold = { no: e.no, plays: h.plays, winner: e.winner };
        const first = !(view.history || []).some(x => x.no < e.no && x.winner === e.winner);
        setTimeout(() => {
          const el = seatAv(e.winner);
          if (e.winner === myId) fx.sfx.myTrick(); else fx.sfx.trick();
          fx.floatText(el, e.no <= CUT && first ? (e.winner === myId ? 'Sống rồi! 😮‍💨' : 'Có tùng ✅') : `Ăn vòng ${e.no} ✅`, 'ok');
          fx.pop($(`.seat[data-pid="${e.winner}"]`), 'pop');
        }, 250 * S);
        if (e.no < 6) holdT = setTimeout(() => gather(), 1050 * S);
        break;
      }
      case 'dead': setTimeout(() => {
        const names = e.ids.map(pname);
        fx.sfx.dead();
        e.ids.forEach(id => { fx.shake($(`.seat[data-pid="${id}"]`)); fx.floatText(seatAv(id), '☠️ CHẾT', 'bad'); });
        fx.banner(e.ids.includes(myId) ? '☠️ BẠN CHẾT RỒI!' : `☠️ ${esc(names.join(', '))} CHẾT!`, 'dead', 1500);
      }, 700 * S); break;
      case 'showdown': setTimeout(() => { fx.sfx.showdown(); fx.banner('🔥 LẬT BÀI! 🔥', 'fire', 1400); }, 1500 * S); break;
      case 'chungStart': if (e.leader !== myId) setTimeout(() => { if (alive().some(p => p.id === myId)) fx.sfx.turn(); }, 300); break;
      case 'chungPick': if (e.by !== myId) setTimeout(() => fx.floatText(seatAv(e.by), '🤫', 'soft'), 50); break;
      case 'reveal': sdReveal(e); break;
      case 'final': sdFinal(); break;
      case 'win': {
        if (e.how === 'white') sdWhite(e);
        else if (e.how === 'sweep') setTimeout(() => { fx.banner(`🧹 ${esc(pname(e.by))} ĂN TRẮNG!`, 'fire', 1600); fx.sfx.toi(); if (e.by === myId) fx.confetti(); }, 1300 * S);
        if (e.how === 'sweep') setTimeout(() => { fx.chipsFly($('#pot'), seatAv(e.by), 8); fx.sfx.chips(8); }, 1800 * S);
        break;
      }
      case 'refill': setTimeout(() => toast(`🧧 Mẹ dúi cho ${esc(pname(e.by))} ${e.amt} chip${e.auto ? ' (hết chip nè)' : ''}`), 300); break;
    }
  }
}

// ---------- đồng hồ ----------
let lastTick = 0;
function frame() {
  requestAnimationFrame(frame);
  const cb = $('#clockbar');
  if (!view) { cb.className = 'clockbar'; return; }
  const ck = view.clock, left = Math.max(0, clockEnd - Date.now()), frac = clockEnd ? left / clockTotal : 0;
  const ns = $('#next-s'); if (ns) ns.textContent = ck && ck.kind === 'next' ? Math.ceil(left / 1000) + 's' : '';
  if (!ck || ck.kind === 'next' || !clockEnd) { cb.className = 'clockbar'; $$('.seat .av.ring').forEach(a => a.classList.remove('ring')); return; }
  const mine = (ck.pids || []).includes(myId) && myTurn(); const sec = Math.ceil(left / 1000);
  cb.className = 'clockbar on' + (mine ? ' mine' : '') + (sec <= 5 ? ' low' : '');
  cb.querySelector('i').style.width = (frac * 100).toFixed(1) + '%';
  cb.dataset.t = mine ? `⏱ ${sec}s` : '';
  for (const pid of ck.pids || []) { const a = seatAv(pid); if (a) { a.classList.add('ring'); a.style.setProperty('--p', (frac * 100).toFixed(1) + '%'); } }
  if (mine && sec <= 5 && sec > 0 && sec !== lastTick) { lastTick = sec; fx.sfx.tick(); }
}
requestAnimationFrame(frame);
if (location.hash === '#debug') window.__dbg = () => ({ net, view, sel, hold, sdBusy });

// ---------- tải lại trang: tự khôi phục phòng / vào lại ----------
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
void REFILL; void cardName; void SUIT_SYM; void NEXT_MS;
