import { Host, Client, MAX, loadSnapshot, session, TL_PHRASES, BEG_LIMIT } from './net.js?v=5';
import { hintsAllowed, lockToggle, BOT_ONLY_NOTE } from '../../shared/ui/botonly.js?v=1';
import { linkCode, clearLinkCode, inviteUrl, joinByLink } from '../../shared/net/joinlink.js?v=2';
import { netStatus } from '../../shared/ui/status.js';
import { createReactions } from '../../shared/ui/react.js?v=2';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=102';
import { classify, legalPlays, badFinish, VE_HEO, comboName, comboKind, rankOf, HEO, BETS, TURN_TIMES, DEFAULT_OPTS, START_CHIPS, TOI_TRANG, isHang, cardName } from './engine.js?v=4';
import { rankPlays, splitHand, LEVELS } from './bot.js?v=4';
import { cardHTML } from './cards.js?v=5';
import { guideHTML } from './guide.js?v=6';
import * as fx from './tfx.js?v=5';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const fmt = n => (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('vi-VN');
const sgn = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n).toLocaleString('vi-VN');
const clean = n => String(n || '').replace(' 🤖', '');

let net = null, isHost = false, myId = null, lobby = null, view = null, prevView = null, modalKey = null;
let sel = new Set(), hintList = [], hintIdx = -1, hintKey = '';
// 💡 Gợi ý + gợi ý ghép bộ chỉ có khi chơi với bot: phòng có ≥ 2 người thật thì tắt (theo danh sách người chơi hiện tại)
const hintOk = () => hintsAllowed(lobby || (view && view.players));
let sortMode = ls.get('tl-sort') === 'combo' ? 'combo' : 'rank';
let incoming = false; // đang có lá bay vào bàn

// ---------- avatar ----------
const AV_COL = ['#e0263c', '#ff8a3d', '#d9a400', '#1fa35c', '#139c94', '#2f7bef', '#7a5cff', '#c044e0', '#e8317d', '#4d5d7d'];
// màu avatar theo thứ tự ghế (để 4 người không trùng màu), ngoài ván thì theo tên
const SEAT_COL = ['#2f7bef', '#e0263c', '#1fa35c', '#c044e0'];
function avColor(name) {
  const list = (view && view.players) || (lobby && lobby.players) || [];
  const i = list.findIndex(p => p.name === name); if (i >= 0 && i < 4) return SEAT_COL[i];
  let h = 0; for (const ch of clean(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AV_COL[h % AV_COL.length];
}
const avatar = (name, cls = '') => `<div class="av ${cls}" style="background:${avColor(name)}">${esc([...clean(name).trim()][0] || '?').toUpperCase()}</div>`;

// ---------- màu bàn (của riêng từng người, lưu máy) ----------
const THEMES = { xanh: '🟢 Nỉ xanh', tet: '🧧 Đỏ Tết', go: '🪵 Gỗ tối' };
let theme = THEMES[ls.get('tl-theme')] ? ls.get('tl-theme') : 'xanh';
function setTheme(t, say = false) {
  theme = THEMES[t] ? t : 'xanh'; ls.set('tl-theme', theme);
  document.body.dataset.tlt = theme;
  $$('#theme-seg [data-theme]').forEach(b => b.classList.toggle('on', b.dataset.theme === theme));
  if (say) toast('🎨 Bàn ' + THEMES[theme].replace(/^\S+ /, ''));
}

// ---------- màn hình / hộp thoại ----------
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); if (id !== 'screen-game') fx.musicMood('lobby'); }
let toastT;
function toast(m, kind = '') { const t = $('#toast'); t.textContent = m; t.className = 'toast show ' + kind; clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
function openModal(html, cls = '', key = null) { $('#modal-box').className = 'modal-box ' + cls; $('#modal-box').innerHTML = html; $('#modal').classList.add('open'); modalKey = key; $('#modal-box').scrollTop = 0; }
function closeModal() { $('#modal').classList.remove('open'); modalKey = null; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && modalKey !== 'end') closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modal').classList.contains('open') && modalKey !== 'end') closeModal(); });
window.__closeModal = closeModal;

// ---------- trang chủ ----------
$('#name').value = ls.get('bgvn-name') || '';
$('#hero').innerHTML = [47, 51, 44, 0, 49].map((c, i) => cardHTML(c, '', `style="--rot:${(i - 2) * 13}deg;animation-delay:${i * 90}ms"`)).join('');
function myName() { const n = $('#name').value.trim().slice(0, 16) || 'Bạn'; ls.set('bgvn-name', n); return n; }
const handlers = {
  onLobby(info, code, started) {
    lobby = info; $('#room-code').textContent = code;
    if (!started) { if (view) { view = null; prevView = null; } renderLobby(); if (!$('#screen-lobby').classList.contains('active') && modalKey !== 'end') show('screen-lobby'); }
    else if (modalKey === 'end') renderEndBeg();
  },
  onState(v) {
    if (!v) { view = null; prevView = null; if (modalKey === 'end') closeModal(); show('screen-lobby'); renderLobby(); return; }
    timerEnd = v.timer ? Date.now() + v.timer.ms : 0; timerPid = v.timer ? v.timer.pid : null; timerTotal = v.timer ? v.timer.total : 1;
    prevView = view; view = v;
    if (!$('#screen-game').classList.contains('active')) { show('screen-game'); prevView = null; sel.clear(); }
    if (prevView && prevView.gameNo !== v.gameNo) { prevView = null; sel.clear(); }
    // bỏ chọn lá không còn trong tay
    const hand = myHand(); for (const c of [...sel]) if (!hand.includes(c)) sel.delete(c);
    animate(prevView, view);
    render();
  },
  onError(m) { toast(m, 'bad'); fx.sfx.bad(); },
  onNote(m) { toast(m); },
  onJoined(id) { myId = id; },
  onDisconnect() {},
  onKicked() { net = null; view = null; lobby = null; closeModal(); show('screen-home'); },
  onNet(t, k, retry) { netStatus(t, k, retry); },
  onReact(msg) { reacts.show(msg); },
};
function startHost(offline) {
  fx.actx(); fx.musicResumeIfOn();
  if (net) (net.leave ? net.leave() : net.destroy());
  net = new Host(myName(), handlers, offline); isHost = true; myId = 'host';
  if (offline) { session.save('tienlen', { role: 'host', code: 'OFFLINE' }); net.addBot(); net.addBot(); net.addBot(); }
  $('#code-box').style.display = offline ? 'none' : '';
  show('screen-lobby');
}
$('#btn-offline').onclick = () => startHost(true);
$('#btn-create').onclick = () => startHost(false);
$('#btn-join').onclick = () => {
  const code = $('#join-code').value.trim().toUpperCase(); if (code.length < 5) { toast('Nhập mã phòng 5 ký tự nhé.'); return; }
  fx.actx(); fx.musicResumeIfOn();
  if (net) (net.leave ? net.leave() : net.destroy());
  net = new Client(code, myName(), handlers); isHost = false; $('#code-box').style.display = '';
};
$('#join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-join').click(); });
// link mời ?room=MÃ (shared/net/joinlink.js): mở link là vào thẳng phòng
const qcode = linkCode(); if (qcode) $('#join-code').value = qcode;
function linkJoin(code) { $('#join-code').value = code; joinByLink({ code, toast: m => toast(m), join: n => { $('#name').value = n; $('#btn-join').click(); }, abort: () => leave() }); }
function leave() { if (net) (net.leave ? net.leave() : net.destroy()); net = null; view = null; lobby = null; closeModal(); show('screen-home'); reacts.setVisible(false); }
$('#btn-leave-lobby').onclick = leave;
$('#btn-leave').onclick = () => openModal(`<h2>Rời bàn?</h2><p class="center">${isHost ? (net && net.offline ? 'Ván với bot sẽ kết thúc.' : 'Bạn là chủ phòng – rời đi sẽ giải tán bàn của mọi người.') : 'Bạn có thể vào lại bằng mã phòng (máy sẽ đánh thay trong lúc vắng).'}</p><div class="btns"><button class="btn" onclick="__closeModal()">Ở lại</button><button class="btn red" id="m-leave">Rời bàn</button></div>`);
document.addEventListener('click', e => { if (e.target.id === 'm-leave') leave(); });
$('#btn-copy').onclick = () => { const url = inviteUrl($('#room-code').textContent); navigator.clipboard?.writeText(url).then(() => toast('Đã chép link mời 📋'), () => toast(url)); };

// ---------- sảnh ----------
const OPT_INFO = {
  toiTrang: ['⚡ Tới trắng', 'Chia bài xong có sảnh rồng, tứ quý heo, 5 đôi thông, 6 đôi, đồng màu… là thắng ngay.'],
  thoiHang: ['💣 Thối hàng', 'Hết ván còn tứ quý / đôi thông trên tay cũng bị phạt (ngoài thối heo).'],
  chatChong: ['🔪 Chặt chồng', 'Bị chặt lại thì đền luôn phần heo/hàng trước đó cho người chặt sau cùng.'],
  spadeEvery: ['♠ Ván nào cũng 3♠ đi trước', 'Tắt: ván sau người về nhất được đi trước.'],
};
function renderLobby() {
  if (!lobby) return;
  const ps = lobby.players, o = lobby.opts || DEFAULT_OPTS, dis = isHost ? '' : 'disabled';
  $('#pcount').textContent = `${ps.length}/${MAX}`;
  $('#plist').innerHTML = ps.map(p => `<li>${avatar(p.name)}<span class="pn">${esc(clean(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === myId ? ' <small>(bạn)</small>' : ''}${p.id === 'host' ? ' 👑' : ''}${!p.connected ? ' <small>📴</small>' : ''}<small class="pc-chips">🪙 ${fmt(p.chips)}</small></span>
    ${p.isBot ? `<button class="chip sm lvl" data-lvl="${p.id}" ${dis} title="Đổi độ khó">${LEVELS[p.level || 'normal']}</button>` : ''}${isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</li>`).join('');
  $$('#plist [data-rm]').forEach(b => b.onclick = () => net.removePlayer(b.dataset.rm));
  const LV = Object.keys(LEVELS);
  $$('#plist [data-lvl]').forEach(b => b.onclick = () => { const p = ps.find(x => x.id === b.dataset.lvl); net.setBotLevel(p.id, LV[(LV.indexOf(p.level || 'normal') + 1) % LV.length]); });
  $('#btn-addbot').style.display = isHost && ps.length < MAX ? '' : 'none';
  const meP = ps.find(p => p.id === myId);
  $('#btn-beg-lobby').style.display = meP && meP.chips < BEG_LIMIT(o.bet) ? '' : 'none';
  $('#opts').innerHTML = `<div class="opt-line"><b>🪙 Cược 1 phần</b><div class="seg">${BETS.map(b => `<button class="chip ${o.bet === b ? 'on' : ''}" data-bet="${b}" ${dis}>${b}</button>`).join('')}</div></div>
    ${Object.entries(OPT_INFO).map(([k, [t, d]]) => `<label class="rule"><input type="checkbox" data-opt="${k}" ${o[k] ? 'checked' : ''} ${dis}><span><b>${t}</b><small>${d}</small></span></label>`).join('')}
    <div class="opt-line"><b>🐷 Về heo</b><div class="seg wrap">${Object.entries(VE_HEO).map(([k, t]) => `<button class="chip ${(o.veHeo || DEFAULT_OPTS.veHeo) === k ? 'on' : ''}" data-vh="${k}" ${dis}>${t}</button>`).join('')}</div></div>
    <div class="opt-line"><b>⏱ Giờ mỗi lượt</b><div class="seg">${TURN_TIMES.map(t => `<button class="chip ${o.turnTime === t ? 'on' : ''}" data-tt="${t}" ${dis}>${t}s</button>`).join('')}</div></div>
    <p class="opt-note">Heo đen ${o.bet} · heo đỏ ${2 * o.bet} · tứ quý ${4 * o.bet} chip… chi tiết trong 📖 Hướng dẫn.</p>`;
  $$('#opts [data-bet]').forEach(b => b.onclick = () => net.setOpt('bet', +b.dataset.bet));
  $$('#opts [data-vh]').forEach(b => b.onclick = () => net.setOpt('veHeo', b.dataset.vh));
  $$('#opts [data-tt]').forEach(b => b.onclick = () => net.setOpt('turnTime', +b.dataset.tt));
  $$('#opts [data-opt]').forEach(i => i.onchange = () => net.setOpt(i.dataset.opt, i.checked));
  $('#btn-start').style.display = isHost ? '' : 'none';
  $('#btn-start').textContent = lobby.gameNo ? `▶ Chia ván ${lobby.gameNo + 1}` : '▶ Chia bài';
  $('#wait-msg').style.display = isHost ? 'none' : '';
}
$('#btn-addbot').onclick = () => net && net.addBot();
$('#btn-start').onclick = () => { fx.actx(); net && net.start(); };
function beg() { if (!net) return; if (isHost) net.beg('host'); else net.beg(); }
$('#btn-beg-lobby').onclick = beg;

// ---------- công cụ ----------
const syncMusic = () => { $('#btn-music').classList.toggle('on', fx.musicIsOn()); $('#btn-music-home').classList.toggle('on', fx.musicIsOn()); };
$('#btn-music').onclick = $('#btn-music-home').onclick = () => { fx.actx(); fx.musicToggle(); syncMusic(); toast(fx.musicIsOn() ? '🎵 Bật nhạc ngũ cung' : '🎵 Tắt nhạc'); }; syncMusic();
const syncMute = () => { $('#btn-mute').textContent = fx.isMuted() ? '🔇' : '🔊'; };
$('#btn-mute').onclick = () => { fx.toggleMute(); syncMute(); }; syncMute();
$('#btn-guide').onclick = $('#btn-guide-home').onclick = () => openModal(guideHTML((view && view.opts) || (lobby && lobby.opts) || DEFAULT_OPTS), 'guide-box');
const news = () => { openNews('tienlen'); ['#btn-news-home', '#btn-news'].forEach(k => $(k).classList.remove('bgvn-dot')); };
$('#btn-news-home').onclick = $('#btn-news').onclick = news;
newsBadge($('#btn-news-home'), 'tienlen'); newsBadge($('#btn-news'), 'tienlen');
setTheme(theme);
$$('#theme-seg [data-theme]').forEach(b => b.onclick = () => setTheme(b.dataset.theme));
$('#btn-theme').onclick = () => { const k = Object.keys(THEMES); setTheme(k[(k.indexOf(theme) + 1) % k.length], true); };
$('#btn-log').onclick = () => $('#log').classList.toggle('open');
$('#btn-log-close').onclick = () => $('#log').classList.remove('open');
$('#btn-sort').onclick = () => { sortMode = sortMode === 'rank' ? 'combo' : 'rank'; ls.set('tl-sort', sortMode); toast(sortMode === 'rank' ? '🔃 Xếp theo số' : '🔃 Gom theo bộ'); render(); };

// ---------- trạng thái ----------
function send(a) { if (!net) return; if (isHost) net.act('host', a); else net.act(a); }
const me = () => view && view.players.find(p => p.id === myId);
const myHand = () => (me() && me().hand) || [];
const isMyTurn = () => !!(view && view.phase === 'playing' && view.players[view.turn] && view.players[view.turn].id === myId);
const pById = id => view && view.players.find(p => p.id === id);
const nm = (id, subj = true) => id === myId ? (subj ? 'Bạn' : 'bạn') : clean((pById(id) || {}).name || '?');
const chipsOf = id => { if (!view) return 0; const b = view.before && view.before[id] != null ? view.before[id] : START_CHIPS; return view.settled ? (view.chips[id] ?? b) : b + (view.delta[id] || 0); };
function legalNow() { const v = view; if (!isMyTurn()) return []; const h = myHand(); return legalPlays(h, v.table && v.table.combo, v.mustInclude).filter(ids => !badFinish(h, ids, v.opts.veHeo)); }
const keyOf = ids => [...ids].sort((a, b) => a - b).join(',');

// ---------- xếp bài trên tay ----------
function sortedHand(hand) {
  const h = [...hand].sort((a, b) => a - b);
  if (sortMode !== 'combo' || h.length < 3) return h;
  const parts = splitHand(h, true), pool = Array.from({ length: 13 }, () => []);
  for (const c of h) pool[rankOf(c)].push(c);
  const ord = { pairs: 0, straight: 1, quad: 2, triple: 3, pair: 4, single: 5 };
  parts.sort((a, b) => (a.r === HEO) - (b.r === HEO) || ord[a.type] - ord[b.type] || a.r - b.r);
  const out = [];
  for (const p of parts) {
    const take = (r, k) => { for (let i = 0; i < k; i++) if (pool[r].length) out.push(pool[r].shift()); };
    if (p.type === 'straight') for (let r = p.r - p.len + 1; r <= p.r; r++) take(r, 1);
    else if (p.type === 'pairs') for (let r = p.r - p.len + 1; r <= p.r; r++) take(r, 2);
    else take(p.r, p.len);
  }
  for (const r of pool) out.push(...r);
  return out;
}

// ---------- vẽ bàn ----------
const POS = { 1: ['top'], 2: ['right', 'left'], 3: ['right', 'top', 'left'] };
function render() {
  const v = view; if (!v) return;
  // nhạc: đang đánh / gay cấn (có người còn ≤ 3 lá) / hết ván
  fx.musicMood(v.phase === 'playing' ? (v.players.some(p => !p.out && p.place == null && p.handCount > 0 && p.handCount <= 3) ? 'tense' : 'game') : 'lobby');
  const meP = me(); const n = v.players.length;
  $('#game-tag').innerHTML = `<span>Ván ${v.gameNo || 1}</span><span class="gt-bet" title="1 phần = ${v.opts.bet} chip">🪙${v.opts.bet}</span>`;
  // đối thủ
  const myIdx = Math.max(0, v.players.findIndex(p => p.id === myId));
  const opps = []; for (let k = 1; k < n; k++) opps.push(v.players[(myIdx + k) % n]);
  const pos = POS[opps.length] || [];
  const curId = v.phase === 'playing' ? v.players[v.turn].id : null;
  $('#opps').innerHTML = opps.map((p, i) => {
    const st = seatStatus(p, v);
    const away = (v.away || []).includes(p.id);
    return `<div class="seat pos-${pos[i]} ${p.id === curId ? 'turn' : ''} ${p.passed && v.phase === 'playing' ? 'passed' : ''} ${p.out ? 'out' : ''} ${p.handCount <= 2 && !p.out && v.phase === 'playing' ? 'danger' : ''}" data-pid="${p.id}">
      <div class="plate">${avatar(p.name)}<div class="ring"></div>
        <div class="who"><b class="nm">${esc(clean(p.name))}${p.isBot ? ` <span class="bot" title="${esc(LEVELS[(v.levels || {})[p.id] || 'normal'])}">🤖</span>` : ''}${away ? ' 📴' : ''}</b><span class="chips">🪙 ${fmt(chipsOf(p.id))}</span></div>
        <div class="cnt ${p.handCount ? '' : 'none'}" title="Còn ${p.handCount} lá">${'<i class="mb"></i>'.repeat(Math.min(3, p.handCount))}<b>${p.handCount}</b></div></div>
      ${st ? `<div class="tag ${st[1]}">${st[0]}</div>` : ''}</div>`;
  }).join('');
  // bàn
  renderPile(v);
  // mình
  renderMe(v, meP);
  renderHand(v, meP);
  renderActions(v, meP);
  // nhật ký
  $('#log-list').innerHTML = v.log.map(l => `<li>${esc(l)}</li>`).join('');
  $('#log-list').scrollTop = 1e6;
  reacts.setVisible(true);
  if (v.phase === 'ended') showEnd(v);
  else if (modalKey === 'end') closeModal();
}
function seatStatus(p, v) {
  if (v.toiTrang) return p.id === v.toiTrang.pid ? ['⚡ Tới trắng', 'gold'] : null;
  if (p.cong) return ['🥶 Cóng', 'bad'];
  if (p.stuck) return ['😵 Kẹt heo', 'bad'];
  if (p.out) return [['', '🥇 Nhất', '🥈 Nhì', '🥉 Ba', 'Bét'][v.finished.indexOf(p.id) + 1] || '✅ Về', 'gold'];
  if (v.phase === 'ended') return p.place ? [['', '🥇 Nhất', '🥈 Nhì', '🥉 Ba', '💀 Bét'][p.place], p.place === 1 ? 'gold' : ''] : null;
  if (p.passed) return ['🙅 Bỏ', 'muted'];
  if (p.handCount === 1) return ['⚠️ 1 lá!', 'hot'];
  return null;
}
function renderPile(v) {
  const top = $('#pile-top'), prev = $('#pile-prev'), cap = $('#pile-cap');
  const t = v.table, tr = v.trick || [];
  const before = tr.length >= 2 ? tr[tr.length - 2] : null;
  const k = t ? keyOf(t.cards) + t.pid : 'none' + v.round;
  if (top.dataset.k !== k) {
    top.dataset.k = k;
    // xoè nhẹ: lá giữa thẳng, hai đầu nghiêng & thấp xuống chút
    const n = t ? t.cards.length : 0, half = (n - 1) / 2 || 1, step = Math.min(4, 22 / Math.max(n, 1));
    const fan = i => { const d = i - (n - 1) / 2; return `style="--rot:${(d * step).toFixed(2)}deg;--dy:${(6 * (d / half) ** 2).toFixed(1)}px"`; };
    top.innerHTML = t ? `<div class="crow tbl fan ${isHang(t.combo) ? 'hang' : ''} ${t.chain ? 'chopped' : ''}">${t.cards.map((c, i) => cardHTML(c, '', n > 1 ? fan(i) : '')).join('')}</div>` : '';
    prev.innerHTML = t && before ? `<div class="crow tbl">${before.cards.map(c => cardHTML(c)).join('')}</div>` : '';
    fitRow(top.firstElementChild); fitRow(prev.firstElementChild);
  }
  top.classList.toggle('incoming', incoming);
  if (v.phase === 'ended') {
    cap.innerHTML = v.toiTrang ? `⚡ <b>${esc(nm(v.toiTrang.pid))}</b> tới trắng: ${esc(TOI_TRANG[v.toiTrang.kind])}` : '🏁 Hết ván';
  } else if (t) {
    cap.innerHTML = `${avatar(pById(t.pid).name, 'xs')}<span><b>${esc(nm(t.pid))}</b> · ${esc(comboName(t.combo))}</span>${t.chain ? '<em class="chop-tag">🔪 chặt</em>' : ''}`;
  } else {
    const L = v.players[v.turn];
    cap.innerHTML = v.mustInclude != null ? `🃏 <b>${esc(nm(L.id))}</b> đi trước · phải có <b class="${v.mustInclude % 4 >= 2 ? 'red' : ''}">${cardName(v.mustInclude)}</b>`
      : `👑 <b>${esc(nm(L.id))}</b> cầm cái · đánh tự do`;
  }
  cap.classList.toggle('empty', !t);
  $('#pile').classList.toggle('has-hang', !!(t && isHang(t.combo)));
}
// dãy lá chồng lên nhau cho vừa chiều ngang
function fitRow(row) {
  if (!row) return;
  const cards = row.children, n = cards.length; if (!n) return;
  const W = row.parentElement.clientWidth || row.clientWidth, cw = cards[0].offsetWidth || 50;
  let step = n > 1 ? Math.min(cw * 0.66, (W - cw) / (n - 1)) : 0;
  step = Math.max(step, cw * 0.22);
  row.style.setProperty('--ov', (step - cw) + 'px');
}
function renderMe(v, meP) {
  if (!meP) { $('#me-info').innerHTML = ''; return; }
  const st = seatStatus(meP, v);
  const my = isMyTurn();
  $('#me').classList.toggle('myturn', my);
  $('#me-info').innerHTML = `${avatar(meP.name)}<div class="who"><b>${esc(clean(meP.name))}</b><span class="chips">🪙 ${fmt(chipsOf(myId))}</span></div><span class="mcnt">${meP.hand.length} lá</span>${st ? `<span class="tag ${st[1]}">${st[0]}</span>` : my ? '<span class="tag go">👉 Lượt bạn</span>' : ''}<span class="afk" id="afk"></span>`;
}
function renderHand(v, meP) {
  const hEl = $('#hand');
  const hand = myHand();
  const my = isMyTurn();
  const legal = my ? legalNow() : [];
  const usable = new Set(legal.flat());
  // gợi ý theo lá đang chọn: các bộ hợp lệ chứa hết lá đã chọn
  const sup = sel.size && hintOk() ? legal.filter(ids => [...sel].every(c => ids.includes(c))) : [];
  const hl = new Set(sup.flat());
  hEl.innerHTML = sortedHand(hand).map(c => cardHTML(c, `${sel.has(c) ? 'sel' : ''} ${my && !usable.has(c) ? 'dim' : ''} ${my && sel.size && hl.has(c) && !sel.has(c) ? 'hl' : ''}`)).join('');
  fitHand();
  // hàng gợi ý
  const sg = $('#suggest');
  if (v.phase !== 'playing' || !meP || meP.out) { sg.innerHTML = `<span class="sg-txt">${meP && meP.out ? (meP.cong ? '🥶 Bạn bị cóng – ngồi xem tiếp nhé' : '😎 Bạn đã về – ngồi xem tiếp nhé') : ''}</span>`; return; }
  if (!my) { const cur = v.players[v.turn]; sg.innerHTML = `<span class="sg-txt">${meP.passed ? '🙅 Bạn đã bỏ – chờ vòng mới… · ' : ''}⏳ Chờ <b>${esc(nm(cur.id))}</b>…</span>`; return; }
  const selC = sel.size ? classify([...sel]) : null;
  const selOk = !!(selC && legal.some(ids => keyOf(ids) === keyOf([...sel])));
  if (sel.size) {
    const list = sup.filter(ids => keyOf(ids) !== keyOf([...sel])).sort((a, b) => a.length - b.length || Math.max(...a) - Math.max(...b)).slice(0, 6);
    const hk = hintIdx >= 0 && hintList[hintIdx] && keyOf(hintList[hintIdx]) === keyOf([...sel]) ? `💡 ${hintIdx + 1}/${hintList.length} · ` : '';
    sg.innerHTML = (selOk ? `<span class="sg-txt ok">${hk}✅ ${esc(comboName(selC))}</span>` : list.length ? '<span class="sg-txt">👉 Ghép thành:</span>' : `<span class="sg-txt bad">${esc(selReason(v, selC))}</span>`) +
      list.map(ids => `<button class="sg" data-ids="${ids.join(',')}">${esc(comboName(classify(ids)))}</button>`).join('');
    $$('#suggest [data-ids]').forEach(b => b.onclick = () => { sel = new Set(b.dataset.ids.split(',').map(Number)); fx.sfx.snap(); render(); });
  } else {
    sg.innerHTML = `<span class="sg-txt">${!legal.length ? '🙈 Không có bài đè được – tự bỏ lượt…' : v.table ? `👆 Chặn <b>${esc(comboName(v.table.combo))}</b> hoặc Bỏ lượt` : v.mustInclude != null ? `👆 Nước đầu phải có <b>${cardName(v.mustInclude)}</b>` : '👑 Bạn cầm cái – đánh bộ gì cũng được'}</span>`;
  }
}
function selReason(v, c) {
  const ids = [...sel];
  if (!c) return ids.length >= 3 && ids.some(x => rankOf(x) === HEO) && ids.some(x => rankOf(x) !== HEO) ? '⛔ Sảnh/đôi thông không được có heo' : '🤔 Chưa thành bộ';
  if (v.mustInclude != null && !ids.includes(v.mustInclude)) return `⛔ Phải có ${cardName(v.mustInclude)}`;
  const bf = badFinish(myHand(), ids, v.opts.veHeo); if (bf) return '⛔ ' + bf + ' – giữ lá thường để về';
  if (v.table) return v.table.combo.type === c.type && v.table.combo.len === c.len ? '⛔ Nhỏ hơn bài trên bàn' : `⛔ Phải là ${comboKind(v.table.combo)}`;
  return '🤔 Chưa thành bộ';
}
function fitHand() {
  const hEl = $('#hand'); const cards = hEl.children; const n = cards.length; if (!n) return;
  const cw = cards[0].offsetWidth; const avail = hEl.clientWidth - 12;
  let ov = n > 1 ? (avail - cw) / (n - 1) - cw : 0;
  ov = Math.min(ov, 4); ov = Math.max(ov, -cw * 0.7);
  hEl.style.setProperty('--ov', ov + 'px');
  hEl.classList.toggle('scroll', n * (cw + ov) - ov > avail + 2);
}
function renderActions(v, meP) {
  const my = isMyTurn() && meP && !meP.out;
  const legal = my ? legalNow() : [];
  const selOk = my && sel.size && legal.some(ids => keyOf(ids) === keyOf([...sel]));
  const pb = $('#btn-play');
  pb.disabled = !selOk;
  const c = selOk ? classify([...sel]) : null;
  pb.innerHTML = c && v.table && isHang(c) && (v.table.combo.type === 'single' || v.table.combo.type === 'pair' || isHang(v.table.combo)) && c.type !== v.table.combo.type ? '🔪 Chặt!' : 'Đánh';
  pb.classList.toggle('chop', pb.textContent.includes('Chặt'));
  // chọn đúng bộ nhưng là nước "về" bị cấm → ghi rõ trên nút
  const selC = my && !selOk && sel.size ? classify([...sel]) : null;
  if (selC && badFinish(myHand(), [...sel], v.opts.veHeo)) pb.innerHTML = '🚫 Cấm về heo';
  $('#btn-pass').disabled = !(my && v.table);
  $('#btn-hint').disabled = !my || !legal.length;
  lockToggle($('#btn-hint'), !hintOk());
  $('#btn-sort').disabled = !myHand().length;
}
addEventListener('resize', () => { if (view) { $('#pile-top').dataset.k = ''; render(); } });

// ---------- thao tác ----------
$('#hand').addEventListener('click', e => {
  const el = e.target.closest('.pc'); if (!el || !view) return;
  const c = +el.dataset.c; if (Number.isNaN(c)) return;
  if (sel.has(c)) sel.delete(c); else sel.add(c);
  hintIdx = -1; fx.sfx.snap(); render();
});
function doPlay() {
  if (!isMyTurn() || !sel.size) return;
  const ids = [...sel]; const c = classify(ids);
  if (!c || !legalNow().some(x => keyOf(x) === keyOf(ids))) { toast(selReason(view, c).replace(/^\S+ /, ''), 'bad'); fx.sfx.bad(); fx.shake($('#hand')); return; }
  send({ type: 'play', cards: ids }); sel.clear(); hintIdx = -1;
}
function doPass() { if (!isMyTurn() || !view.table) return; send({ type: 'pass' }); sel.clear(); hintIdx = -1; }
function doHint() {
  if (!hintOk()) { toast('💡 Gợi ý: ' + BOT_ONLY_NOTE); return; }
  if (!isMyTurn()) return;
  const key = view.logN + ':' + myHand().length;
  if (hintKey !== key) { hintKey = key; hintList = rankPlays(view, myId, 'normal').map(x => x.ids); hintIdx = -1; }
  if (!hintList.length) { toast('Không có bài chặn – bỏ lượt thôi 🙈'); return; }
  hintIdx = (hintIdx + 1) % hintList.length; sel = new Set(hintList[hintIdx]);
  fx.sfx.snap(); render();
}
$('#btn-play').onclick = doPlay; $('#btn-pass').onclick = doPass; $('#btn-hint').onclick = doHint;
addEventListener('keydown', e => {
  if (!view || !$('#screen-game').classList.contains('active') || $('#modal').classList.contains('open') || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.key === 'Enter') { e.preventDefault(); doPlay(); } else if (e.key === ' ' || e.key === 'p') { e.preventDefault(); doPass(); } else if (e.key === 'h' || e.key === 'g') doHint(); else if (e.key === 'Escape') { sel.clear(); render(); }
});

// ---------- hoạt ảnh ----------
const seatEl = id => id === myId ? $('#me-info') : $(`.seat[data-pid="${id}"] .plate`);
const ptOf = id => { const el = seatEl(id); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const CHOP_TXT = ['Bị chặt heo kìa 🐷🔪', 'Heo quay rồi! 🐷🔥', 'Ối dồi ôi, mất heo!', 'Toang heo rồi 🫠'];
const pick = a => a[Math.floor(Math.random() * a.length)];
function animate(a, b) {
  if (!b) return;
  if (!a) { // vừa vào ván: chia bài
    if (b.phase === 'playing' && b.moves === 0) dealAnim(b);
    if (b.toiTrang) setTimeout(() => toiTrangFx(b), 300);
    return;
  }
  const evs = (b.fx || []).filter(e => e.id > (a.fxN || 0));
  let delay = 0;
  for (const e of evs) {
    if (e.k === 'play') {
      incoming = true;
      const heo = e.cards.some(c => rankOf(c) === HEO);
      // điểm xuất phát chụp NGAY (trước khi vẽ lại): lá trên tay mình, hoặc quạt bài của ghế đối thủ
      const fan = e.from === myId ? null : $(`.seat[data-pid="${e.from}"] .cnt`) || seatEl(e.from);
      const rectOf = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; };
      const items = e.cards.map((c, i) => {
        const hc = e.from === myId ? $(`#hand .pc[data-c="${c}"]`) : null;
        const from = hc ? rectOf(hc) : rectOf(fan || seatEl(e.from));
        if (from && !hc) { from.w = Math.min(from.w, 26); from.r = (i - (e.cards.length - 1) / 2) * 8 - 10; from.o = .7; }
        return { html: cardHTML(c), from, to: () => {
          const el = $(`#pile-top .pc[data-c="${c}"]`); if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: el.offsetWidth, h: el.offsetHeight, rot: parseFloat(el.style.getPropertyValue('--rot')) || 0 };
        } };
      });
      fx.flyCards(items, { delay, duration: 420, stagger: Math.min(40, 240 / e.cards.length), onEnd: () => { incoming = false; $('#pile-top').classList.remove('incoming'); fx.pop($('#pile-top'), 'land'); heo ? fx.sfx.heo() : fx.sfx.play(e.cards.length); } });
      if (heo && !evs.some(x => x.k === 'chop')) setTimeout(() => fx.floatText($('#pile-top'), '🐷 Heo!', 'heo'), delay + 460);
    } else if (e.k === 'pass') {
      setTimeout(() => { fx.floatText(seatEl(e.from), pick(['Bỏ 🙈', 'Né 🏃', 'Thôi 😶', 'Bỏ ✋'])); fx.sfx.pass(); }, delay);
    } else if (e.k === 'chop') {
      delay += 480;
      setTimeout(() => chopAnim(e), delay);
      delay += 600;
    } else if (e.k === 'round') {
      setTimeout(() => { fx.sfx.round(); fx.floatText(seatEl(e.from), '👑 Cầm cái', 'gold'); }, delay + 250);
    } else if (e.k === 'finish') {
      setTimeout(() => { fx.sfx.finish(); fx.burst(seatEl(e.from), 26); fx.banner(e.n === 1 ? `🥇 ${nm(e.from)} về nhất!` : `${['', '', '🥈', '🥉'][e.n] || '✅'} ${nm(e.from)} về ${['', '', 'nhì', 'ba'][e.n] || ''}`, e.n === 1 ? 'gold' : ''); }, delay + 400);
    } else if (e.k === 'stuck') {
      setTimeout(() => { fx.sfx.cong(); fx.banner(`😵 ${nm(e.from)} kẹt heo!`, 'ice', 'Luật cấm về heo – chịu bét, bị thối'); fx.shake(seatEl(e.from)); }, delay + 700);
    } else if (e.k === 'cong') {
      setTimeout(() => { fx.sfx.cong(); fx.banner(`🥶 ${nm(e.from)} bị CÓNG!`, 'ice', 'Chưa đánh được lá nào mà người ta về rồi'); fx.shake(seatEl(e.from)); }, delay + 900);
    } else if (e.k === 'end') {
      setTimeout(() => { const mine = b.places && b.places[0] === myId; if (mine) { fx.sfx.win(); fx.confetti(); fx.musicStinger('win'); } else { fx.sfx.lose(); fx.musicStinger('lose'); } }, delay + 700);
    }
  }
  if (isMyTurn() && !(a.phase === 'playing' && a.players[a.turn] && a.players[a.turn].id === myId)) {
    setTimeout(() => { fx.sfx.turn(); fx.pop($('#me-info'), 'pop'); navigator.vibrate && navigator.vibrate(20); }, delay + 420);
  }
}
function chopAnim(e) {
  fx.chopFx($('#pile-top')); fx.sfx.chop(); fx.shake($('#table'));
  const sub = e.stacked ? `Chặt chồng! ${nm(e.from)} ăn trọn 🔪🔪` : e.heo ? (e.to === myId ? pick(CHOP_TXT) : `${nm(e.to, true)} bị chặt heo kìa 🐷🔪`) : `${nm(e.from)} chặt hàng của ${nm(e.to, false)} 💣`;
  fx.banner('CHẶT! 🔪', 'chop', sub);
  setTimeout(() => {
    fx.arc(ptOf(e.to), ptOf(e.from), { text: `${nm(e.to)} → ${nm(e.from, false)}: ${e.n} 🪙`, color: '#e0263c' });
    fx.coinRain(seatEl(e.to), seatEl(e.from), 6); fx.sfx.coins();
    fx.floatText(seatEl(e.to), `−${e.n} 🪙`, 'minus'); setTimeout(() => fx.floatText(seatEl(e.from), `+${e.n} 🪙`, 'plus'), 450);
  }, 1250);
}
function toiTrangFx(v) {
  fx.sfx.toiTrang(); fx.confetti();
  fx.banner('⚡ TỚI TRẮNG!', 'gold', `${nm(v.toiTrang.pid)}: ${TOI_TRANG[v.toiTrang.kind]}`);
}
function dealAnim(v) {
  fx.sfx.deal();
  const ps = v.players; let k = 0;
  for (let r = 0; r < 3; r++) for (const p of ps) fx.fly(cardHTML(null), $('#pile'), seatEl(p.id), { delay: (k++) * 40, duration: 300 });
  setTimeout(() => { fx.banner('Chia bài! 🃏', ''); }, 500);
}

// ---------- tổng kết ván ----------
const MEDAL = ['', '🥇', '🥈', '🥉', '💀'];
const WHY = { place: 'Hạng', chop: 'Chặt', thoi: 'Thối', cong: 'Cóng', toitrang: 'Tới trắng' };
function showEnd(v) {
  if (modalKey === 'end' && $('#modal-box').dataset.g === String(v.gameNo)) { renderEndBeg(); return; }
  if (modalKey === 'end') return;
  if (showEnd.t) return;
  showEnd.t = setTimeout(() => {
    showEnd.t = null;
    if (!view || view.phase !== 'ended') return;
    const v2 = view; const order = [...v2.players].sort((a, b) => a.place - b.place);
    const myP = v2.players.find(p => p.id === myId);
    const w = v2.places[0];
    const head = v2.toiTrang ? (w === myId ? `Tới trắng! Ăn trắng cả bàn<small class="tt-kind">${esc(TOI_TRANG[v2.toiTrang.kind])}</small>` : `${esc(nm(w))} tới trắng!<small class="tt-kind">${esc(TOI_TRANG[v2.toiTrang.kind])}</small>`)
      : !myP ? `${esc(nm(w))} về nhất!` : myP.cong ? 'Cóng rồi bạn ơi 🥶' : myP.place === v2.players.length ? (v2.players.length === 2 ? 'Thua rồi… ván sau gỡ 🥲' : 'Bét bảng rồi… 🥲') : ['', 'Về nhất! Đỉnh nóc kịch trần 🥇', 'Về nhì – cũng ra gì đó 😎', 'Hạng ba, cũng không tệ 💪'][myP.place] || 'Hết ván!';
    const rows = order.map(p => {
      const items = {};
      for (const x of v2.pays) {
        if (x.from !== p.id && x.to !== p.id) continue;
        const key = x.why === 'chop' ? (x.to === p.id ? 'Chặt được' : 'Bị chặt') : x.why === 'thoi' ? x.note : WHY[x.why];
        items[key] = (items[key] || 0) + (x.to === p.id ? x.n : -x.n);
      }
      const d = v2.delta[p.id] || 0;
      const lines = Object.entries(items).filter(([, n]) => n).map(([k, n]) => `<span class="it ${n > 0 ? 'up' : 'dn'}">${esc(k)} ${sgn(n)}</span>`).join('');
      const left = p.hand && p.hand.length && (!v2.toiTrang || p.id === w) ? `<div class="crow mini left">${[...p.hand].sort((a, b) => a - b).map(c => cardHTML(c)).join('')}</div>` : '';
      return `<tr class="${p.id === myId ? 'me' : ''} ${p.place === 1 ? 'w' : ''}"><td class="md">${p.cong ? '🥶' : MEDAL[p.place] || ''}</td><td>${avatar(p.name)}</td>
        <td class="nm"><b>${esc(clean(p.name))}${p.id === myId ? ' <small>(bạn)</small>' : ''}</b>${p.cong ? ' <small class="cong">bị cóng</small>' : ''}<div class="its">${lines || '<span class="it">—</span>'}</div>${left}</td>
        <td class="tot ${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${sgn(d)}<small>🪙 ${fmt(chipsOf(p.id))}</small></td></tr>`;
    }).join('');
    const btns = isHost ? `<button class="btn pri" id="m-again">▶ Ván tiếp</button><button class="btn" id="m-lobby">Về sảnh</button>` : '<p class="wait">Chờ chủ phòng chia ván tiếp…</p>';
    openModal(`<div class="end" data-g="${v2.gameNo}"><div class="big">${v2.toiTrang ? '⚡' : myP && myP.place === 1 ? '🏆' : myP && (myP.cong || myP.place === v2.players.length) ? '🥲' : '🎉'}</div><h2>${head}</h2>
      <table class="sum"><tbody>${rows}</tbody></table>
      <p class="sum-note">1 phần = ${v2.opts.bet} chip · chip ảo, chơi vui không cá cược.</p>
      <div id="end-beg"></div>
      <div class="btns">${btns}</div></div>`, 'end-box', 'end');
    $('#modal-box').dataset.g = String(v2.gameNo);
    renderEndBeg();
    const ag = $('#m-again'); if (ag) ag.onclick = () => { closeModal(); net.restart(); net.start(); };
    const lb = $('#m-lobby'); if (lb) lb.onclick = () => { closeModal(); net.restart(); };
  }, (v.toiTrang ? 2600 : 1700));
}
function renderEndBeg() {
  const el = $('#end-beg'); if (!el || !view) return;
  const mine = chipsOf(myId), lim = BEG_LIMIT(view.opts.bet);
  el.innerHTML = mine < lim ? `<button class="btn yellow" id="m-beg">🥺 Xin mẹ thêm chip</button><small class="beg-note">Còn ${fmt(mine)} chip – mẹ cho thêm ${START_CHIPS}, chơi vui thôi nha!</small>` : '';
  const b = $('#m-beg'); if (b) b.onclick = beg;
  // cập nhật số chip trong bảng (sau khi xin)
}

// ---------- thả emoji / chọc nhau ----------
const reacts = createReactions({
  send: e => { if (!net) return; if (isHost) net.react('host', e); else net.react(e); },
  seatEl: id => seatEl(id),
  myId: () => myId,
  nameOf: id => nm(id),
  mount: $('#me'), place: 'right:8px;top:4px',
  phrases: TL_PHRASES,
  onShow: () => fx.sfx.pip(),
});
reacts.setVisible(false);

// ---------- đồng hồ lượt ----------
let timerEnd = 0, timerPid = null, timerTotal = 1, beeped = 0;
setInterval(() => {
  if (!view || view.phase !== 'playing') return;
  const left = timerEnd ? Math.max(0, timerEnd - Date.now()) : 0;
  $$('.seat .ring').forEach(r => { r.style.removeProperty('--p'); });
  if (timerPid && timerEnd) {
    const ring = $(`.seat[data-pid="${timerPid}"] .ring`);
    if (ring) ring.style.setProperty('--p', Math.round(100 * left / timerTotal) + '%');
  }
  const el = $('#afk'); if (!el) return;
  const s = Math.ceil(left / 1000);
  const on = timerPid === myId && timerEnd && s <= 15;
  el.textContent = on ? `⏳ ${s}s` : ''; el.classList.toggle('on', !!on);
  if (on && s <= 5 && s !== beeped) { beeped = s; fx.sfx.tick(); }
}, 250);
// đóng / tải lại trang: lưu ngay ván của chủ phòng
addEventListener('pagehide', () => { if (net && net.saveNow) net.saveNow(); });
if (location.hash === '#debug') window.__dbg = () => ({ net, view, sel: [...sel] });

// ---------- tải lại trang: tự khôi phục phòng / tự vào lại ----------
(function resume() {
  const snap = loadSnapshot(), ses = session.load('tienlen');
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
