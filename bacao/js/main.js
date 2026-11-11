import { Host, Client, MAX, loadSnapshot, session, BC_PHRASES, setSpeedFn } from './net.js?v=5';
import { linkCode, clearLinkCode, inviteUrl, joinByLink } from '../../shared/net/joinlink.js?v=2';
import { netStatus } from '../../shared/ui/status.js';
import { createReactions } from '../../shared/ui/react.js?v=2';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=120';
import { hintsAllowed, lockToggle, BOT_ONLY_NOTE } from '../../shared/ui/botonly.js?v=1';
import { OPT_CHOICES, DEFAULT_OPTS, handInfo, handLabel, RANK_TXT } from './engine.js?v=2';
import { winChance } from './bot.js?v=1';
import { cardHTML } from './cards.js?v=1';
import * as fx from './bfx.js?v=1';
import { openGuide } from './guide.js?v=1';

const GAME = 'bacao';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const fmt = n => (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('vi-VN');
const sgn = n => n > 0 ? '+' + fmt(n) : n < 0 ? fmt(n) : '0';
setSpeedFn(fx.S);

let net = null, isHost = false, myId = null, lobby = null, view = null, lastEv = 0, roomCode = '';
let draft = 0, draftRound = -1, clockEnd = 0, clockInfo = null;
let revealStart = 0, revealRound = -1, handKey = '', oddsCache = { k: '', v: null };
let oddsOn = ls.get('bc-odds') !== '0';

const AV_COL = ['#ff4d6d', '#ff9f1c', '#e0a800', '#12a66a', '#14a3a0', '#4d8dff', '#7b5cff', '#d94dff', '#ff2d87', '#5b6b8a'];
const avColor = name => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AV_COL[h % AV_COL.length]; };
const clean = n => String(n || '').replace(' 🤖', '').trim();
const avatar = name => `<div class="av" style="background:${avColor(name)}">${esc([...clean(name)][0] || '?').toUpperCase()}</div>`;

// ---------- lá đã nặn (nhớ theo ván, tải lại trang không phải nặn lại) ----------
const peel = {
  k: '', ids: new Set(),
  sync(v) { const k = roomCode + ':' + v.round; if (k === this.k) return; this.k = k; this.ids = new Set(); try { const d = JSON.parse(sessionStorage.getItem('bc-peel') || 'null'); if (d && d.k === k) this.ids = new Set(d.ids); } catch (e) {} },
  add(id) { this.ids.add(id); try { sessionStorage.setItem('bc-peel', JSON.stringify({ k: this.k, ids: [...this.ids] })); } catch (e) {} },
  has(id) { return this.ids.has(id); },
};

// ---------- màn hình ----------
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); if (id !== 'screen-game') fx.musicMood('lobby'); }
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
function openModal(html, cls = '') { $('#modal-box').className = 'modal-box ' + cls; $('#modal-box').innerHTML = html; $('#modal').classList.add('open'); }
function closeModal() { $('#modal').classList.remove('open'); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
window.__closeModal = closeModal;

// ---------- trang chủ ----------
$('#name').value = ls.get('bgvn-name') || '';
const hero = [{ r: 11, s: 'D' }, { r: 13, s: 'H' }, { r: 12, s: 'S' }];
$('#hero').innerHTML = hero.map((c, i) => cardHTML(c, '', `style="transform:translateX(-50%) rotate(${(i - 1) * 18}deg);animation-delay:${i * 110}ms"`)).join('') + '<span class="hero-crown">👑</span>';
function myName() { const n = $('#name').value.trim().slice(0, 16) || 'Bạn'; ls.set('bgvn-name', n); return n; }
const handlers = {
  onLobby(info, code, started) { lobby = info; roomCode = code; $('#room-code').textContent = code; if (!started) { view = null; renderLobby(); if (!$('#screen-lobby').classList.contains('active')) show('screen-lobby'); } },
  onState(v) {
    if (!v) { view = null; closeModal(); show('screen-lobby'); renderLobby(); reacts.setVisible(false); return; }
    const prev = view; view = v;
    clockInfo = v.clock || null; clockEnd = v.clock ? Date.now() + v.clock.ms : 0;
    const fresh = !$('#screen-game').classList.contains('active');
    if (fresh) { show('screen-game'); lastEv = v.evN; handKey = ''; }
    const evs = fresh || !prev ? [] : v.ev.filter(e => e.n > lastEv);
    lastEv = v.evN;
    peel.sync(v);
    if (evs.some(e => e.k === 'show')) { revealStart = Date.now(); revealRound = v.round; }
    if (draftRound !== v.round) { draftRound = v.round; draft = 0; }
    render();
    animate(prev, v, evs);
  },
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
  if (offline) { session.save(GAME, { role: 'host', code: 'OFFLINE' }); while (net.players.length < 5) net.addBot(true); net.pushLobby(); }
  $('#code-box').style.display = offline ? 'none' : '';
  show('screen-lobby');
}
$('#btn-offline').onclick = () => startHost(true);
$('#btn-create').onclick = () => startHost(false);
$('#btn-join').onclick = () => {
  const code = $('#join-code').value.trim().toUpperCase(); if (code.length < 5) { toast('Nhập mã phòng 5 ký tự nhé.'); return; }
  fx.actx(); fx.musicResumeIfOn();
  if (net) (net.leave ? net.leave() : net.destroy());
  net = new Client(code, myName(), handlers); isHost = false; roomCode = code; $('#code-box').style.display = ''; toast('Đang kết nối…');
};
$('#join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-join').click(); });
// link mời ?room=MÃ (shared/net/joinlink.js): mở link là vào thẳng phòng
const qcode = linkCode(); if (qcode) $('#join-code').value = qcode;
function linkJoin(code) { $('#join-code').value = code; joinByLink({ code, toast: m => toast(m), join: n => { $('#name').value = n; $('#btn-join').click(); }, abort: () => leave() }); }
function leave() { if (net) (net.leave ? net.leave() : net.destroy()); net = null; view = null; lobby = null; closeModal(); reacts.setVisible(false); show('screen-home'); }
$('#btn-leave-lobby').onclick = leave;
$('#btn-leave').onclick = () => openModal(`<h2>Rời bàn?</h2><p style="text-align:center">${isHost ? 'Bạn là chủ phòng – rời đi là cả bàn giải tán. Muốn đổi luật thì bấm <b>Về sảnh</b> (giữ nguyên chip).' : 'Bạn có thể vào lại bằng mã phòng.'}</p><div class="btns"><button class="btn" onclick="__closeModal()">Ở lại</button>${isHost ? '<button class="btn" id="m-lobby">🏠 Về sảnh</button>' : ''}<button class="btn red" id="m-leave">Rời bàn</button></div>`);
document.addEventListener('click', e => {
  if (e.target.id === 'm-leave') leave();
  if (e.target.id === 'm-lobby' && isHost && net) { closeModal(); net.restart(); }
});
$('#btn-copy').onclick = () => { const url = inviteUrl($('#room-code').textContent); navigator.clipboard?.writeText(url).then(() => toast('Đã chép link mời 📋'), () => toast(url)); };

// ---------- sảnh ----------
// [khoá, nhãn, lựa chọn, hiện khi]
const OPT_UI = [
  ['mode', '🎲 Kiểu chơi', [['cai', '👑 Có nhà cái'], ['pot', '🐔 Chơi gà (góp chung)']]],
  ['caiMode', '👑 Ai làm cái', [['rotate', '🔄 Xoay vòng'], ['fixed', '📌 Cố định'], ['bot', '🤖 Bot làm cái'], ['batay', '🃏 Ai ba tây thì làm cái']], o => o.mode === 'cai'],
  ['startChips', '💰 Vốn mỗi người (chip ảo)', OPT_CHOICES.startChips.map(v => [v, fmt(v)])],
  ['minBet', '🪙 Cược tối thiểu', OPT_CHOICES.minBet.map(v => [v, fmt(v)]), o => o.mode === 'cai'],
  ['maxBet', '🪙 Cược tối đa', OPT_CHOICES.maxBet.map(v => [v, v ? fmt(v) : 'Tất tay']), o => o.mode === 'cai'],
  ['ante', '🐔 Tiền góp gà mỗi ván', OPT_CHOICES.ante.map(v => [v, fmt(v)]), o => o.mode === 'pot'],
  ['batay', '👑 Ba tây (3 lá J Q K)', [[true, 'Tính là bài to'], [false, 'Không tính']]],
  ['sap', '🔥 Sáp (3 lá cùng số)', [['top', 'Sáp > Ba tây'], ['mid', 'Ba tây > Sáp'], ['off', 'Không tính']]],
  ['tie', '⚖️ Bằng điểm thì', [['suit', 'So chất ♦>♥>♠>♣'], ['rank', 'So lá to (A>K>…)'], ['push', 'Hoà']]],
  ['mBaTay', '👑 Ba tây ăn', [[1, '×1'], [2, '×2'], [3, '×3']], o => o.batay],
  ['mSap', '🔥 Sáp ăn', [[1, '×1'], [2, '×2'], [3, '×3'], [5, '×5']], o => o.sap !== 'off'],
  ['nan', '🤏 Nặn bài', [[true, 'Có – tự kéo hé từng lá'], [false, 'Không – lật luôn']]],
  ['peekTime', '⏳ Thời gian nặn', [[10, '10 giây'], [20, '20 giây'], [30, '30 giây']], o => o.nan],
];
const OPT_DESC = {
  mode: o => o.mode === 'cai' ? 'Một người làm nhà cái, ăn/đền riêng với từng người.' : 'Ai cũng góp gà, lật bài cùng lúc – bài to nhất hốt hết.',
  caiMode: o => ({ rotate: 'Mỗi ván nhà cái chuyển sang người kế tiếp.', fixed: 'Một người làm cái suốt – bấm 👑 cạnh tên để chọn.', bot: 'Một bot ngồi cái suốt, ai cũng làm "con".', batay: 'Ai ăn cái bằng ba tây / sáp thì ván sau lên làm cái.' })[o.caiMode],
  tie: o => ({ suit: 'Bằng điểm: lá có chất to nhất thắng (Rô > Cơ > Bích > Chuồn), cùng chất thì A > K > … > 2.', rank: 'Bằng điểm: lá số to nhất thắng (A > K > … > 2), cùng số thì so chất.', push: 'Bằng điểm thì hoà (nhà cái: trả lại tiền · chơi gà: chia đều).' })[o.tie],
  sap: o => o.sap === 'off' ? 'Ba lá cùng số chỉ tính điểm bình thường.' : 'Sáp A to nhất, rồi K, Q … 2.',
};
function renderLobby() {
  if (!lobby) return;
  const ps = lobby.players, o = { ...DEFAULT_OPTS, ...(lobby.opts || {}) }, dis = isHost ? '' : 'disabled';
  $('#pcount').textContent = `${ps.length}/${MAX}`;
  const caiFixed = o.mode === 'cai' && (o.caiMode === 'fixed' || o.caiMode === 'bot') ? (o.caiId || (o.caiMode === 'fixed' ? 'host' : null)) : null;
  $('#plist').innerHTML = ps.map(p => `<li>${avatar(p.name)}<span class="nm">${esc(p.name)}${p.id === myId ? ' <small>(bạn)</small>' : ''}${p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}${!p.connected ? ' 📴' : ''}${p.chips != null ? `<br><small>💰 ${fmt(p.chips)} chip</small>` : ''}</span>
    ${isHost && o.mode === 'cai' ? `<button class="mk ${caiFixed === p.id ? 'on' : ''}" data-cai="${p.id}" title="Cho làm cái">👑${caiFixed === p.id ? ' Cái' : ''}</button>` : caiFixed === p.id ? '<span class="mk on">👑 Cái</span>' : ''}
    ${isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</li>`).join('');
  $$('#plist [data-rm]').forEach(b => b.onclick = () => net.removePlayer(b.dataset.rm));
  $$('#plist [data-cai]').forEach(b => b.onclick = () => net.setOpt('caiId', b.dataset.cai));
  $('#btn-addbot').style.display = isHost && ps.length < MAX ? '' : 'none';
  $('#btn-fill').style.display = isHost && ps.length < MAX - 1 ? '' : 'none';
  $('#btn-reset-chips').style.display = isHost && ps.some(p => p.chips != null) ? '' : 'none';
  $('#opts').innerHTML = OPT_UI.filter(([, , , when]) => !when || when(o)).map(([k, label, ch]) => `<div class="opt"><b>${label}</b><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v="${String(v)}" class="${o[k] === v ? 'on' : ''}" ${dis}>${t}</button>`).join('')}</div>${OPT_DESC[k] ? `<small>${OPT_DESC[k](o)}</small>` : ''}</div>`).join('');
  $$('#opts [data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; const v = OPT_CHOICES[k].find(x => String(x) === b.dataset.v); net.setOpt(k, v); });
  $('#btn-start').style.display = isHost ? '' : 'none';
  $('#wait-msg').style.display = isHost ? 'none' : '';
}
$('#btn-addbot').onclick = () => net && net.addBot();
$('#btn-fill').onclick = () => net && net.fillBots && net.fillBots();
$('#btn-reset-chips').onclick = () => net && net.resetChips && net.resetChips();
$('#btn-start').onclick = () => { fx.actx(); net && net.start(); };

// ---------- công cụ ----------
const syncMusic = () => { $('#btn-music').classList.toggle('on', fx.musicIsOn()); $('#btn-music-home').classList.toggle('on', fx.musicIsOn()); };
$('#btn-music').onclick = $('#btn-music-home').onclick = () => { fx.actx(); fx.musicToggle(); syncMusic(); }; syncMusic();
const syncMute = () => $('#btn-mute').textContent = fx.isMuted() ? '🔇' : '🔊';
$('#btn-mute').onclick = () => { fx.toggleMute(); syncMute(); }; syncMute();
$('#btn-guide').onclick = $('#btn-guide-home').onclick = () => openGuide(openModal, (view && view.opts) || (lobby && lobby.opts) || DEFAULT_OPTS);
const news = () => { openNews(GAME); ['#btn-news-home', '#btn-news'].forEach(k => $(k).classList.remove('bgvn-dot')); };
$('#btn-news-home').onclick = $('#btn-news').onclick = news;
newsBadge($('#btn-news-home'), GAME); newsBadge($('#btn-news'), GAME);
$('#btn-log').onclick = () => $('#log').classList.toggle('open');
$('#btn-log-close').onclick = () => $('#log').classList.remove('open');
$('#round-tag').onclick = () => openBoard();
// 🎯 cửa thắng: chỉ khi chơi với bot (phòng có từ 2 người thật trở lên thì khoá)
const hintOk = () => hintsAllowed((view && view.players) || lobby);
function syncOdds() { const b = $('#btn-odds'); lockToggle(b, !hintOk()); b.classList.toggle('on', oddsOn && hintOk()); }
$('#btn-odds').onclick = () => {
  if (!hintOk()) { toast('🔒 Cửa thắng: ' + BOT_ONLY_NOTE.toLowerCase()); return; }
  oddsOn = !oddsOn; ls.set('bc-odds', oddsOn ? '1' : '0'); toast(oddsOn ? '🎯 Hiện cửa thắng ước tính' : 'Đã tắt cửa thắng'); handKey = ''; render();
};

// ---------- gửi hành động ----------
function send(a) { if (!net) return; fx.actx(); if (isHost) net.act('host', a); else net.act(a); }
const P = id => view && view.players.find(p => p.id === id);
const me = () => P(myId);
const nameOf = id => clean((P(id) || {}).name || '?');
const isPot = () => view && view.opts.mode === 'pot';
const amCai = () => view && !isPot() && view.caiId === myId;
const maxBet = p => Math.max(0, view.opts.maxBet ? Math.min(view.opts.maxBet, p.chips) : p.chips);
const need = () => isPot() ? view.opts.ante : view.opts.minBet;
const canBegV = p => p && p.chips < need() && (view.phase === 'end' || (view.phase === 'bet' && (!p.betDone || p.id === view.caiId)));

// ---------- lịch lật bài lúc chưng (kịch tính: lần lượt từng người, nhà cái cuối cùng) ----------
const STEP = 380;
function revealOrder(v) { const ids = v.order.filter(id => id !== v.caiId); if (v.caiId && !isPot()) ids.push(v.caiId); return ids; }
function revealOffset(v, id) { const i = revealOrder(v).indexOf(id); if (i < 0) return 0; return (500 + i * STEP + (id === v.caiId && !isPot() ? 500 : 0)) * fx.S(); }
const revealTotal = v => revealOffset(v, revealOrder(v).slice(-1)[0]) + 700 * fx.S();
// còn bao lâu nữa thì lá của id được lật (0 = đã lật)
function revealLeft(v, id) { if (v.phase !== 'end' || revealRound !== v.round || fx.reduced()) return 0; return Math.max(0, revealStart + revealOffset(v, id) - Date.now()); }
const inReveal = v => v.phase === 'end' && revealRound === v.round && Date.now() - revealStart < revealTotal(v);

// ---------- vẽ bàn ----------
function kindBadge(info, big = false, cls = '') {
  if (!info) return '';
  const k = info.kind, B = big ? 'big' : '';
  if (k === 'sap') return `<span class="badge sp sap ${B} ${cls}">🔥 ${esc(handLabel(info))}</span>`;
  if (k === 'batay') return `<span class="badge sp ${B} ${cls}">👑 Ba tây</span>`;
  if (info.pts === 0) return `<span class="badge bu ${B} ${cls}">Bù 0</span>`;
  return `<span class="badge ${info.pts === 9 ? 'nine' : ''} ${B} ${cls}">${info.pts} nút</span>`;
}
const resBadge = (r, cls = '') => !r ? '' : r.r === 'win' || (r.r === 'split' && r.delta > 0) ? `<span class="badge win ${cls}">${sgn(r.delta)}${r.mult > 1 ? ` ×${r.mult}` : ''}</span>` : r.r === 'lose' || r.delta < 0 ? `<span class="badge lose ${cls}">${fmt(r.delta)}${r.mult > 1 ? ` ×${r.mult}` : ''}</span>` : `<span class="badge push ${cls}">Hoà 🤝</span>`;
function seatCards(v, p) {
  if (!p.n) return '';
  if (!p.cards) return Array.from({ length: p.n }, () => cardHTML(null)).join('');
  const left = revealLeft(v, p.id);
  if (!left) return p.cards.map(c => cardHTML(c)).join('');
  return p.cards.map((c, i) => `<div class="f3" style="--d:${left + i * 70}ms"><div class="f3i">${cardHTML(c)}${cardHTML(null)}</div></div>`).join('');
}
const delayStyle = (v, id, extra = 350) => { const l = revealLeft(v, id); return l ? `style="--d:${l + extra * fx.S()}ms"` : ''; };
function render() {
  const v = view; if (!v) return;
  fx.musicMood(v.phase === 'peek' || inReveal(v) ? 'tense' : 'game');
  $('#round-tag').innerHTML = isPot() ? `Ván ${v.round} · 🐔 Gà ${fmt(v.opts.ante)}` : `Ván ${v.round} · 👑 ${amCai() ? 'Bạn làm cái' : esc(nameOf(v.caiId))}`;
  $('#table').classList.toggle('pot-mode', isPot());
  renderDealer(v); renderPot(v); renderSeats(v); renderMe(v); renderHint(v);
  $('#log-list').innerHTML = v.log.map(l => `<li>${esc(l)}</li>`).join('');
  $('#log-list').scrollTop = 1e6;
  reacts.setVisible(true); syncOdds();
  tickClock();
}
function renderDealer(v) {
  const d = $('#dealer');
  if (isPot()) { d.style.display = 'none'; return; }
  d.style.display = ''; const C = P(v.caiId); d.dataset.pid = C.id;
  const win = v.phase === 'end' && v.winners.includes(C.id) && !revealLeft(v, C.id);
  d.classList.toggle('winner', win);
  if (amCai()) { d.innerHTML = `<div class="who"><span class="crown">👑</span><div class="nm">Bạn đang làm nhà cái<small>Ăn/đền với từng người · bài của bạn ở dưới 👇</small></div></div>`; return; }
  const st = v.phase === 'bet' ? 'Chờ mọi người đặt cược' : v.phase === 'peek' ? (C.ready ? 'Nặn xong ✅' : '<span class="dot3">Đang nặn bài</span>') : 'Nhà cái';
  d.innerHTML = `<div class="who">${avatar(C.name)}<div class="nm"><span class="crown">👑</span>${esc(clean(C.name))}${C.isBot ? ' 🤖' : ''}<small>💰 ${fmt(C.chips)} · ${st}</small></div></div>
    <div class="cards">${seatCards(v, C)}</div>${C.info && v.phase === 'end' ? `<span class="pop-in" ${delayStyle(v, C.id)}>${kindBadge(C.info, true)}</span>` : ''}${C.res ? `<span class="pop-in" ${delayStyle(v, C.id, 600)}><span class="badge ${C.res.delta > 0 ? 'win' : C.res.delta < 0 ? 'lose' : 'push'}">${C.res.delta ? sgn(C.res.delta) : 'Huề vốn'}</span></span>` : ''}`;
}
function renderPot(v) {
  const el = $('#pot');
  if (!isPot()) { el.style.display = 'none'; return; }
  el.style.display = '';
  const amt = v.phase === 'end' ? v.players.reduce((t, p) => t + (p.bet || 0), 0) : v.pot;
  const stack = Math.min(8, Math.ceil(amt / Math.max(1, v.opts.ante)));
  const w = v.phase === 'end' && !inReveal(v) ? v.winners.map(nameOf).join(' & ') : '';
  el.innerHTML = `<div class="pot-chips" aria-hidden="true">${Array.from({ length: stack }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div><div class="pot-amt"><small>🐔 Gà</small>${fmt(amt)}</div>${w ? `<div class="pot-win">🏆 ${esc(w)} hốt!</div>` : ''}`;
}
function seatStatus(v, p) {
  if (v.phase === 'end' && p.res) return `<span class="pop-in" ${delayStyle(v, p.id, 650)}>${resBadge(p.res)}</span>`;
  if (v.phase === 'bet') return p.betDone ? '' : `<span class="stt dot3">${isPot() ? 'Đang góp' : 'Đang chọn cược'}</span>`;
  if (v.phase === 'peek') return p.ready ? '<span class="stt ok">Xong ✅</span>' : '<span class="stt dot3">Đang nặn 🤏</span>';
  return '';
}
function renderSeats(v) {
  const ids = v.order.filter(id => id !== myId && id !== v.caiId);
  $('#seats').classList.toggle('many', ids.length > 4);
  $('#seats').innerHTML = ids.map(id => {
    const p = P(id), away = (v.away || []).includes(id);
    const win = v.phase === 'end' && v.winners.includes(id) && !revealLeft(v, id);
    return `<div class="seat ${p.ready && v.phase === 'peek' ? 'ready' : ''} ${away ? 'away' : ''} ${win ? 'winner' : ''}" data-pid="${id}">
      <div class="st-h">${avatar(p.name)}<div class="st-n"><span class="nm">${esc(clean(p.name))}</span><small>💰 ${fmt(p.chips)}</small></div></div>
      <div class="st-c">${p.n ? seatCards(v, p) : '<span class="stt">—</span>'}</div>
      <div class="st-f">${p.bet && !isPot() ? `<span class="bet">🪙 ${fmt(p.bet)}</span>` : ''}${p.info && v.phase === 'end' ? `<span class="pop-in" ${delayStyle(v, id)}>${kindBadge(p.info)}</span>` : ''}${seatStatus(v, p)}</div>
    </div>`;
  }).join('') || '<p class="hint">Chỉ có bạn với nhà cái 😎</p>';
}

// ---------- tay bài của mình + nặn bài ----------
const allPeeled = m => !!(m && m.cards && m.cards.every(c => peel.has(c.id)));
const canSee = (v, m) => !!(m && m.cards && (v.phase === 'end' || !v.opts.nan || m.ready || allPeeled(m)));
function renderMe(v) {
  const m = me(); if (!m) return;
  const cai = amCai();
  $('#me-top').innerHTML = `${avatar(m.name)}<span class="nm">${cai ? '<span class="crw">👑</span>' : ''}<span class="nt">${esc(clean(m.name))}${cai ? ' · Nhà cái' : ''}</span></span>${m.bet && !isPot() ? `<span class="bet badge">🪙 ${fmt(m.bet)}</span>` : ''}<span class="clock" id="clock" style="display:none"></span><span class="chips ${m.chips < 0 ? 'neg' : ''}">💰 ${fmt(m.chips)}</span>`;
  $('.me-hand').classList.toggle('empty', !m.n);
  $('#me').classList.toggle('winner', v.phase === 'end' && v.winners.includes(myId) && !revealLeft(v, myId));
  const sq = v.phase === 'peek' && v.opts.nan && !m.ready;
  const key = [v.round, v.phase, m.n, sq, m.ready, [...peel.ids].join(), revealLeft(v, myId) > 0].join('|');
  if (key !== handKey) {
    handKey = key;
    const h = $('#hand'); h.className = 'hand' + (sq ? ' squeeze' : '');
    if (!m.cards) h.innerHTML = Array.from({ length: m.n || 0 }, () => cardHTML(null)).join('');
    else if (v.phase === 'end' && !v.opts.nan) { const l = revealLeft(v, myId); h.innerHTML = m.cards.map((c, i) => l ? `<div class="f3" style="--d:${l + i * 90}ms"><div class="f3i">${cardHTML(c)}${cardHTML(null)}</div></div>` : cardHTML(c)).join(''); }
    else if (v.phase === 'end' || !v.opts.nan || m.ready) h.innerHTML = m.cards.map(c => cardHTML(c)).join('');
    else h.innerHTML = m.cards.map((c, i) => peel.has(c.id) ? `<div class="sq open" data-id="${c.id}">${cardHTML(c)}</div>`
      : `<div class="sq" data-id="${c.id}" data-i="${i}">${cardHTML(c)}<div class="sq-b" role="button" tabindex="0" aria-label="Nặn lá thứ ${i + 1}">${cardHTML(null)}<span class="sq-tip">${i === 0 && !peel.ids.size ? '👆 Kéo để nặn' : ''}</span></div></div>`).join('');
    if (sq) bindSqueeze();
    renderPts(v, m);
  } else renderPts(v, m);
  renderActions(v, m);
}
function renderPts(v, m) {
  const pe = $('#pts');
  if (!m.n || !m.cards) { pe.className = 'pts'; pe.innerHTML = ''; return; }
  if (!canSee(v, m)) { const n = m.cards.filter(c => peel.has(c.id)).length; pe.className = 'pts hid'; pe.innerHTML = `<b>?</b><small>Đã nặn ${n}/3</small>`; return; }
  if (v.phase === 'end' && revealLeft(v, myId)) { pe.className = 'pts hid'; pe.innerHTML = '<b>🥁</b><small>Lật nè…</small>'; return; }
  const I = m.info || handInfo(m.cards, v.opts), k = I.kind;
  pe.className = 'pts ' + (k !== 'diem' ? 'sp ' + k : I.pts === 0 ? 'bu' : I.pts === 9 ? 'nine' : I.pts >= 7 ? 'hi' : 'lo');
  const big = k === 'batay' ? '👑' : k === 'sap' ? RANK_TXT(I.sapRank === 14 ? 1 : I.sapRank) : I.pts;
  const lbl = k === 'batay' ? 'Ba tây' : k === 'sap' ? 'Sáp 🔥' : I.pts === 0 ? 'Bù 😭' : I.pts === 9 ? '9 nút 😎' : 'nút';
  let odds = '';
  if (oddsOn && hintOk() && v.phase !== 'end') {
    const opp = isPot() ? Math.max(1, v.order.length - 1) : 1, k2 = m.cards.map(c => c.id).join() + opp + v.opts.sap + v.opts.tie + v.opts.batay;
    if (oddsCache.k !== k2) oddsCache = { k: k2, v: winChance(m.cards, v.opts, opp, 1200) };
    odds = `<em title="Ước tính bằng mô phỏng – ${BOT_ONLY_NOTE.toLowerCase()}">🎯 ${Math.round(oddsCache.v.win * 100)}%${amCai() ? '/người' : ''}</em>`;
  }
  pe.innerHTML = `<b>${big}</b><small>${lbl}</small>${odds}`;
}
// kéo lá úp để hé dần (nặn bài); kéo quá nửa / chạm nhẹ là lật hẳn
function bindSqueeze() {
  $$('#hand .sq:not(.open) .sq-b').forEach(b => {
    const sq = b.parentElement, id = sq.dataset.id;
    let st = null;
    const end = (e, cancel) => {
      if (!st) return; const { dx, dy, moved } = st; st = null;
      const h = sq.offsetHeight || 90, p = Math.hypot(dx, dy) / (h * 0.8);
      if (!cancel && (p > 0.5 || !moved)) openCard(sq, id, dx, dy, !moved);
      else { b.style.transition = 'transform .25s'; b.style.transform = ''; sq.classList.remove('dragging'); }
    };
    b.addEventListener('pointerdown', e => { fx.actx(); st = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, moved: false }; try { b.setPointerCapture(e.pointerId); } catch (x) {} b.style.transition = 'none'; e.preventDefault(); });
    b.addEventListener('pointermove', e => {
      if (!st) return; st.dx = e.clientX - st.x; st.dy = e.clientY - st.y;
      if (Math.hypot(st.dx, st.dy) > 6) { st.moved = true; sq.classList.add('dragging'); }
      const h = sq.offsetHeight || 90, lim = h * 1.1, d = Math.min(lim, Math.hypot(st.dx, st.dy)), k = d / (Math.hypot(st.dx, st.dy) || 1);
      b.style.transform = `translate(${st.dx * k}px,${st.dy * k}px) rotate(${(st.dx * k) / h * 10}deg)`;
      if (st.moved) fx.sfx.peel();
    });
    b.addEventListener('pointerup', e => end(e, false));
    b.addEventListener('pointercancel', e => end(e, true));
    b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(sq, id, 0, -1, true); } });
  });
}
function openCard(sq, id, dx, dy, tap) {
  if (peel.has(id)) return;
  const b = sq.querySelector('.sq-b');
  const n = Math.hypot(dx, dy) || 1, far = (sq.offsetHeight || 90) * 1.6;
  if (b) { b.style.transition = `transform ${tap ? 0.32 : 0.22}s ease-in, opacity .3s`; b.style.transform = tap ? 'translateY(-110%) rotate(-6deg)' : `translate(${dx / n * far}px,${dy / n * far}px) rotate(${dx / n * 14}deg)`; b.style.opacity = '0'; }
  fx.sfx.flip(); peel.add(id); sq.classList.add('open'); sq.classList.remove('dragging');
  setTimeout(() => { handKey = ''; if (view) { renderMe(view); if (allPeeled(me())) onAllPeeled(); } }, 260);
}
function quickFlip() {
  const m = me(); if (!m || !m.cards) return;
  m.cards.forEach((c, i) => { if (!peel.has(c.id)) setTimeout(() => { const sq = $(`#hand .sq[data-id="${c.id}"]`); if (sq) openCard(sq, c.id, 0, -1, true); else peel.add(c.id); }, i * 140); });
}
// nặn xong cả 3 lá: chỉ mình thấy, nhảy hiệu ứng theo bài
function onAllPeeled() {
  const m = me(); if (!m || !m.cards || onAllPeeled.k === peel.k) return; onAllPeeled.k = peel.k;
  myHandFx(m.info || handInfo(m.cards, view.opts));
}
function myHandFx(I) {
  if (I.kind === 'batay') { fx.banner('Ba tây rồi bà con ơi 👑', 'good'); fx.sfx.batay(); fx.burst($('#pts'), 30); }
  else if (I.kind === 'sap') { fx.banner(`SÁP ${RANK_TXT(I.sapRank === 14 ? 1 : I.sapRank)}! Cháy quá 🔥`, 'good'); fx.sfx.sap(); fx.burst($('#pts'), 36, ['#ff4d00', '#ffb703', '#ff2d6f']); }
  else if (I.pts === 0) { fx.banner('Bù rồi 0 điểm 😭', 'bad'); fx.sfx.bu(); fx.shake($('#pts')); }
  else if (I.pts === 9) { fx.banner('9 nút ngon lành 😎', 'good'); fx.sfx.nine(); fx.pop($('#pts')); }
  else if (I.pts >= 7) { fx.floatText($('#pts'), `${I.pts} nút – cũng ngon 😏`); fx.pop($('#pts')); }
  else fx.floatText($('#pts'), `${I.pts} nút… cầu trời 🙏`);
}

function chipVals(v, m) { const b = v.opts.minBet, mx = maxBet(m); return [b, b * 5, b * 10, b * 20].filter(x => x <= Math.max(mx, b)); }
function renderActions(v, m) {
  const a = $('#actions'), cai = amCai();
  let h = '';
  const beg = canBegV(m) ? `<button class="btn gold" data-act="beg">🥺 Xin mẹ thêm chip</button>` : '';
  if (v.phase === 'bet') {
    if (cai) h = `<div class="msg">👑 Bạn làm cái ván này – chờ mọi người đặt cược…</div>${beg}`;
    else if (m.betDone) h = `<div class="msg big">✅ ${isPot() ? `Đã góp gà ${fmt(m.bet)}` : `Đã chốt cược ${fmt(m.bet)}`} – chờ chia bài</div>`;
    else if (beg) h = `<div class="msg">Hết vốn rồi 😭 dưới ${fmt(need())} chip thì không ${isPot() ? 'góp' : 'cược'} được.</div>${beg}`;
    else if (isPot()) h = `<button class="btn green" data-act="ante">🐔 Góp gà ${fmt(v.opts.ante)}</button>`;
    else {
      const mx = maxBet(m), vals = chipVals(v, m);
      h = `<div class="tray">${vals.map((x, i) => `<button class="tok t${i + 1}" data-tok="${x}" ${draft >= mx ? 'disabled' : ''} aria-label="Thêm ${x} chip"><span>${x >= 1000 ? x / 1000 + 'K' : x}</span></button>`).join('')}<button class="chip sm" data-act="max">Tối đa</button></div>
        <div class="betbox"><button class="chip" data-act="clear" ${draft ? '' : 'disabled'}>Xoá</button><span class="betval"><small>Cược</small>${fmt(draft)}</span><button class="btn green" data-act="bet" ${draft >= v.opts.minBet ? '' : 'disabled'}>Chốt cược ✅</button></div>`;
    }
  } else if (v.phase === 'peek') {
    const done = v.players.filter(p => p.ready).length;
    if (m.ready) h = `<div class="msg big">✅ Chốt rồi – chờ mọi người nặn (${done}/${v.players.length})</div>`;
    else h = `${allPeeled(m) ? '' : '<button class="btn blue" data-act="quick">⚡ Lật nhanh</button>'}<button class="btn ${allPeeled(m) ? 'pri' : 'green'}" data-act="ready">✅ Chốt bài!</button>`;
  } else if (v.phase === 'end') {
    const res = cai ? m.res : m.res;
    const line = inReveal(v) ? '🥁 Lật bài nè… hồi hộp ghê 😬' : cai ? `👑 Ván này nhà cái ${res.delta > 0 ? `ăn <b>+${fmt(res.delta)}</b> 🤑` : res.delta < 0 ? `đền <b>${fmt(res.delta)}</b> 😭` : 'huề vốn 🤝'}` : res ? resLine(res) : '';
    const left = clockInfo && clockInfo.kind === 'next' && clockEnd ? Math.max(0, Math.ceil((clockEnd - Date.now()) / 1000)) : 0;
    h = `<div class="msg big">${line}</div>${isHost ? `<button class="btn pri" data-act="next">▶ Ván tiếp${left ? ` <small id="next-left">(${left}s)</small>` : ''}</button><button class="btn" data-act="lobby">🏠 Về sảnh</button>` : '<div class="msg">Chờ chủ phòng chia ván mới…</div>'}${beg}<button class="chip board" data-act="board" title="Bảng chip" aria-label="Bảng chip">📊</button>`;
  }
  const sig = h;
  if (a.dataset.sig === sig) return; a.dataset.sig = sig;
  a.innerHTML = h;
  $$('#actions [data-tok]').forEach(b => b.onclick = () => {
    const x = +b.dataset.tok, mx = maxBet(me());
    if (draft + x > mx) { draft = mx; toast(`Tối đa ${fmt(mx)} chip nha`); } else draft += x;
    fx.sfx.chip(); renderActions(view, me()); fx.pop($('.betval'));
  });
  $$('#actions [data-act]').forEach(b => b.onclick = () => onAct(b.dataset.act));
}
function resLine(r) {
  if (r.r === 'split') return `🤝 Chia gà – ${r.delta >= 0 ? `<b>${sgn(r.delta)}</b>` : `<b>${fmt(r.delta)}</b>`}`;
  return r.r === 'win' ? `🤑 Ăn rồi! <b>+${fmt(r.delta)}</b>${r.mult > 1 ? ` (×${r.mult})` : ''} – ${esc(r.why)}` : r.r === 'lose' ? `😭 Toang, mất <b>${fmt(-r.delta)}</b>${r.mult > 1 ? ` (×${r.mult})` : ''} – ${esc(r.why)}` : `🤝 Hoà, huề vốn – ${esc(r.why)}`;
}
function onAct(k) {
  const v = view, m = me(); if (!v || !m) return;
  if (k === 'max') { draft = maxBet(m); fx.sfx.chips(); renderActions(v, m); return; }
  if (k === 'clear') { draft = 0; renderActions(v, m); return; }
  if (k === 'bet') { send({ type: 'bet', amount: draft }); fx.sfx.chips(); return; }
  if (k === 'ante') { send({ type: 'bet' }); fx.sfx.chips(); return; }
  if (k === 'quick') { quickFlip(); return; }
  if (k === 'ready') { if (!allPeeled(m)) { quickFlip(); setTimeout(() => send({ type: 'ready' }), 600 * fx.S()); } else send({ type: 'ready' }); return; }
  if (k === 'next') { if (isHost) net.next(); return; }
  if (k === 'lobby') { if (isHost) net.restart(); return; }
  if (k === 'board') { openBoard(); return; }
  send({ type: k });
}
function renderHint(v) {
  const h = $('#hint'); let t = '';
  const ps = v.players;
  if (v.phase === 'bet') { const who = ps.filter(p => p.id !== v.caiId || isPot()); t = isPot() ? `🐔 Góp gà đi! <b>${who.filter(p => p.betDone).length}/${who.length}</b> đã góp` : `🪙 Đặt cược đi! <b>${who.filter(p => p.betDone).length}/${who.length}</b> đã chốt`; }
  else if (v.phase === 'peek') t = me() && me().ready ? `⏳ Chờ mọi người nặn xong <b>${ps.filter(p => p.ready).length}/${ps.length}</b>` : '🤏 <b>Nặn bài!</b> Kéo lá úp để hé dần';
  else if (v.phase === 'end') {
    if (inReveal(v)) t = '🥁 <b>Lật bài!</b> Ai to nhất đây…';
    else if (isPot()) { const W = P(v.winners[0]); t = v.winners.length > 1 ? `🤝 Chia gà: <b>${v.winners.map(id => esc(nameOf(id))).join(', ')}</b>` : `🏆 <b>${esc(nameOf(W.id))}</b> hốt gà với ${esc(handLabel(W.info))}`; }
    else { const C = P(v.caiId), cd = C.res ? C.res.delta : 0; t = `🏁 Nhà cái ${esc(handLabel(C.info))} · ${cd > 0 ? 'ăn +' + fmt(cd) : cd < 0 ? 'đền ' + fmt(cd) : 'huề vốn'}${v.nextCai && v.opts.caiMode === 'batay' && v.nextCai !== v.caiId ? ` · ván sau <b>${esc(nameOf(v.nextCai))}</b> lên cái 👑` : ''}`; }
  }
  h.innerHTML = t;
}
// bảng chip cả bàn
function openBoard() {
  const v = view; if (!v) return;
  const rows = [...v.players].sort((a, b) => b.chips - a.chips);
  const hist = v.history.slice(-6);
  openModal(`<button class="close-x" onclick="__closeModal()" aria-label="Đóng">✕</button><h2>📊 Bảng chip</h2><p style="text-align:center;margin:0 0 8px;color:var(--muted)">Ván ${v.round} · chip ảo, chỉ để vui 🪙</p>
    <table class="score"><tbody>${rows.map(p => `<tr class="${p.id === myId ? 'mine' : ''}"><td>${avatar(p.name)}</td><td><b>${esc(clean(p.name))}</b>${p.id === v.caiId && !isPot() ? ' 👑' : ''}${p.id === myId ? ' <small>(bạn)</small>' : ''}<div class="hist">${hist.map(h => { const d = h.deltas[p.id] || 0; return `<i class="${d > 0 ? 'p' : d < 0 ? 'm' : ''}" title="Ván ${h.round}">${h.cai === p.id ? '👑' : ''}${sgn(d)}</i>`; }).join('')}</div>${p.granted ? `<small style="color:var(--muted)">đã xin mẹ ${fmt(p.granted)}</small>` : ''}</td><td class="n">${fmt(p.chips)}</td></tr>`).join('')}</tbody></table>
    <div class="btns"><button class="btn" onclick="__closeModal()">Đóng</button></div>`);
}

// ---------- đồng hồ ----------
function tickClock() {
  const el = $('#clock'), v = view; if (!el) return;
  const nl = $('#next-left');
  if (!v || !clockInfo || !clockEnd) { el.style.display = 'none'; return; }
  const left = Math.max(0, Math.ceil((clockEnd - Date.now()) / 1000));
  if (nl) nl.textContent = `(${left}s)`;
  const m = me();
  const mine = m && (clockInfo.pids || []).includes(myId) && ((clockInfo.kind === 'bet' && !m.betDone) || (clockInfo.kind === 'peek' && !m.ready));
  if (!mine) { el.style.display = 'none'; return; }
  el.style.display = ''; el.textContent = `⏳ ${left}s`; el.classList.toggle('low', left <= 5);
  if (left <= 5 && left > 0 && left !== tickClock.last) { tickClock.last = left; fx.sfx.tick(); }
}
setInterval(tickClock, 250);
// trong lúc lật bài: vẽ lại vài nhịp để huy hiệu / dòng kết quả cập nhật
setInterval(() => { const v = view; if (v && v.phase === 'end' && revealRound === v.round && Date.now() - revealStart < revealTotal(v) + 600) { renderActions(v, me()); renderHint(v); renderPot(v); renderPts(v, me()); renderDealer(v); fx.musicMood(inReveal(v) ? 'tense' : 'game'); markWinners(v); } }, 300);
function markWinners(v) {
  for (const id of v.winners) { const el = id === myId ? $('#me') : id === v.caiId && !isPot() ? $('#dealer') : $(`.seat[data-pid="${id}"]`); if (el && !revealLeft(v, id)) el.classList.add('winner'); }
}

// ---------- hoạt ảnh ----------
const seatEl = id => id === myId ? $('#hand') : view && id === view.caiId && !isPot() ? $('#dealer') : $(`.seat[data-pid="${id}"]`);
const deckEl = () => isPot() ? $('#pot') : $('#dealer');
function animate(prev, v, evs) {
  if (!prev) return;
  const S = fx.S();
  for (const e of evs) {
    switch (e.k) {
      case 'round': setTimeout(() => { fx.banner(isPot() ? `Ván ${e.round} · Chơi gà 🐔` : `Ván ${e.round} · ${e.cai === myId ? 'Bạn' : nameOf(e.cai)} làm cái 👑`, 'cai'); fx.sfx.turn(); }, 0); break;
      case 'bet': if (e.pid !== myId) { fx.sfx.chip(); fx.floatText(seatEl(e.pid), (isPot() ? '🐔 ' : '🪙 ') + fmt(e.amount)); } break;
      case 'deal': dealAnim(v); break;
      case 'beg': fx.banner(`🥺 ${e.pid === myId ? 'Bạn' : nameOf(e.pid)} xin mẹ thêm chip`, ''); fx.sfx.beg(); break;
      case 'show': showAnim(v, e); break;
    }
  }
}
function dealAnim(v) {
  let k = 0; const order = isPot() ? v.order : [...v.order, v.caiId];
  for (let r = 0; r < 3; r++) for (const id of order) { const d = k++ * 55; setTimeout(() => fx.sfx.deal(), d * fx.S()); fx.fly(cardHTML(null), deckEl(), seatEl(id), { delay: d, duration: 320 }); }
  if (v.opts.nan) setTimeout(() => { fx.pop($('#hand')); fx.sfx.turn(); }, (k * 55 + 350) * fx.S());
}
function showAnim(v, e) {
  fx.sfx.roll(); fx.banner('Lật bài!!! 🃏', 'cai');
  const ids = revealOrder(v);
  for (const id of ids) {
    const p = P(id), t = revealOffset(v, id);
    setTimeout(() => {
      fx.sfx.flip();
      const el = seatEl(id), k = p.info && p.info.kind;
      if (id !== myId && (k === 'batay' || k === 'sap')) { fx.burst(el, 22); fx.floatText(el, k === 'batay' ? 'Ba tây 👑' : 'Sáp 🔥', 'win'); fx.sfx.batay(); }
      else if (id !== myId && p.info && p.info.pts === 0 && k === 'diem') fx.floatText(el, 'Bù 😭', 'lose');
    }, t);
  }
  setTimeout(() => {
    const m = me(); if (!m) return;
    if (!view.opts.nan && m.info) myHandFx(m.info);
    const r = m.res; if (!r) return;
    setTimeout(() => {
      if (amCai()) { const d = r.delta; fx.banner(d > 0 ? `Nhà cái ăn +${fmt(d)} 🤑` : d < 0 ? `Nhà cái đền ${fmt(d)} 😭` : 'Huề vốn 🤝', d > 0 ? 'good' : d < 0 ? 'bad' : ''); d > 0 ? fx.sfx.win() : d < 0 ? fx.sfx.lose() : fx.sfx.push(); if (d >= 4 * v.opts.minBet) fx.confetti(60); return; }
      if (r.delta > 0) { fx.banner(isPot() ? `Hốt gà! +${fmt(r.delta)} 🐔` : `Ăn rồi! +${fmt(r.delta)} 🤑`, 'good'); fx.sfx.win(); fx.musicStinger('win'); if (r.mult > 1 || isPot()) fx.confetti(80); }
      else if (r.delta < 0) { fx.banner(`Toang, mất ${fmt(-r.delta)} 😭`, 'bad'); fx.sfx.lose(); }
      else { fx.banner(r.r === 'split' ? 'Chia gà, huề vốn 🤝' : 'Hoà, huề vốn 🤝', ''); fx.sfx.push(); }
      const el = seatEl(myId); fx.floatText(el, r.delta ? sgn(r.delta) : 'Hoà 🤝', r.delta > 0 ? 'win' : r.delta < 0 ? 'lose' : '');
    }, view.opts.nan ? 0 : 1300 * fx.S());
  }, revealTotal(v));
  void e;
}

// ---------- thả emoji / chọc nhau ----------
const reacts = createReactions({
  send: e => { if (!net) return; if (isHost) net.react('host', e); else net.react(e); },
  seatEl: id => id === myId ? $('#me-top') : id === (view && view.caiId) && !isPot() ? $('#dealer') : $(`.seat[data-pid="${id}"]`),
  myId: () => myId,
  nameOf: id => nameOf(id),
  mount: $('#me'), place: 'right:10px;top:4px',
  phrases: BC_PHRASES,
  onShow: () => fx.sfx.pip(),
});
reacts.setVisible(false);
addEventListener('resize', () => { if (view) { handKey = ''; render(); } });
if (location.hash === '#debug') window.__dbg = () => ({ net, view, peel });

// ---------- Tải lại trang: tự khôi phục phòng / tự vào lại ----------
(function resume() {
  const snap = loadSnapshot(), ses = session.load(GAME);
  const lk = linkCode(); // mở link mời phòng khác → vào thẳng phòng đó; link của chính phòng mình → vào lại như thường
  if (lk && !(ses && ses.code === lk)) { linkJoin(lk); return; }
  if (lk) clearLinkCode();
  if (snap && ses && ses.role === 'host') {
    fx.musicResumeIfOn();
    net = new Host((snap.players.find(p => p.id === 'host') || {}).name || myName(), handlers, !!snap.offline, snap); isHost = true; myId = 'host'; roomCode = snap.code;
    $('#code-box').style.display = snap.offline ? 'none' : '';
    show('screen-lobby'); netStatus('Đã khôi phục phòng ' + (snap.offline ? 'chơi với bot' : snap.code), 'ok'); return;
  }
  if (ses && ses.role === 'client' && ses.code) {
    net = new Client(ses.code, ses.name || myName(), handlers); isHost = false; roomCode = ses.code; $('#code-box').style.display = '';
  }
})();
