import { Host, Client, MAX, loadSnapshot, session, XD_PHRASES, setSpeedFn } from './net.js?v=6';
import { linkCode, clearLinkCode, inviteUrl, joinByLink } from '../../shared/net/joinlink.js?v=2';
import { netStatus } from '../../shared/ui/status.js';
import { createReactions } from '../../shared/ui/react.js?v=2';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=112';
import { KIND_NAME, OPT_CHOICES, DEFAULT_OPTS, MAX_CARDS } from './engine.js?v=2';
import { cardHTML } from './cards.js?v=2';
import * as fx from './xfx.js?v=2';
import { openGuide } from './guide.js?v=3';

const GAME = 'xidach';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const fmt = n => (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('vi-VN');
const sgn = n => n > 0 ? '+' + fmt(n) : n < 0 ? fmt(n) : '0';
setSpeedFn(fx.S);

let net = null, isHost = false, myId = null, lobby = null, view = null, lastEv = 0, modalKey = null;
let draft = 0, draftRound = -1, clockEnd = 0, clockInfo = null, flipNow = new Set(), shownMine = new Set();

const AV_COL = ['#ff4d6d', '#ff9f1c', '#e0a800', '#12a66a', '#14a3a0', '#4d8dff', '#7b5cff', '#d94dff', '#ff2d87', '#5b6b8a'];
const avColor = name => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AV_COL[h % AV_COL.length]; };
const clean = n => String(n || '').replace(' 🤖', '').trim();
const avatar = name => `<div class="av" style="background:${avColor(name)}">${esc([...clean(name)][0] || '?').toUpperCase()}</div>`;

// ---------- màn hình ----------
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); if (id !== 'screen-game') fx.musicMood('lobby'); }
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
function openModal(html, cls = '', key = null) { $('#modal-box').className = 'modal-box ' + cls; $('#modal-box').innerHTML = html; $('#modal').classList.add('open'); modalKey = key; }
function closeModal() { $('#modal').classList.remove('open'); modalKey = null; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
window.__closeModal = closeModal;

// ---------- trang chủ ----------
$('#name').value = ls.get('bgvn-name') || '';
const hero = [{ r: 10, s: 'D' }, { r: 1, s: 'H' }, { r: 13, s: 'S' }];
$('#hero').innerHTML = hero.map((c, i) => cardHTML(c, '', `style="transform:translateX(-50%) rotate(${(i - 1) * 16}deg);animation-delay:${i * 90}ms"`)).join('');
function myName() { const n = $('#name').value.trim() || 'Bạn'; ls.set('bgvn-name', n); return n; }
const handlers = {
  onLobby(info, code, started) { lobby = info; $('#room-code').textContent = code; if (!started) { view = null; renderLobby(); if (!$('#screen-lobby').classList.contains('active')) show('screen-lobby'); } },
  onState(v) {
    if (!v) { view = null; closeModal(); show('screen-lobby'); renderLobby(); reacts.setVisible(false); return; }
    const prev = view; view = v;
    clockInfo = v.clock || null; clockEnd = v.clock ? Date.now() + v.clock.ms : 0;
    const fresh = !$('#screen-game').classList.contains('active');
    if (fresh) { show('screen-game'); lastEv = v.evN; shownMine = new Set(); }
    const evs = fresh || !prev ? [] : v.ev.filter(e => e.n > lastEv);
    lastEv = v.evN;
    flipNow = new Set(evs.filter(e => e.k === 'reveal').map(e => e.pid));
    if (evs.some(e => e.k === 'end' || (e.k === 'special' && e.cai))) for (const p of v.players) if (!p.revealed || p.id === v.caiId) flipNow.add(p.id);
    if (draftRound !== v.round) { draftRound = v.round; draft = 0; }
    render(); flipNow = new Set();
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
  if (offline) { session.save(GAME, { role: 'host', code: 'OFFLINE' }); net.addBot(); net.addBot(); net.addBot(); }
  $('#code-box').style.display = offline ? 'none' : '';
  show('screen-lobby');
}
$('#btn-offline').onclick = () => startHost(true);
$('#btn-create').onclick = () => startHost(false);
$('#btn-join').onclick = () => {
  const code = $('#join-code').value.trim(); if (code.length < 5) { toast('Nhập mã phòng 5 ký tự nhé.'); return; }
  fx.actx(); fx.musicResumeIfOn();
  if (net) (net.leave ? net.leave() : net.destroy());
  net = new Client(code, myName(), handlers); isHost = false; $('#code-box').style.display = ''; toast('Đang kết nối…');
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
const OPT_UI = [
  ['caiMode', '👑 Ai làm cái', [['rotate', '🔄 Xoay vòng'], ['fixed', '📌 Cố định'], ['bot', '🤖 Bot làm cái'], ['xidach', '🃏 Ai xì dách làm cái']]],
  ['startChips', '💰 Vốn mỗi người (chip ảo)', OPT_CHOICES.startChips.map(v => [v, fmt(v)])],
  ['minBet', '🪙 Cược tối thiểu', OPT_CHOICES.minBet.map(v => [v, fmt(v)])],
  ['maxBet', '🪙 Cược tối đa', OPT_CHOICES.maxBet.map(v => [v, v ? fmt(v) : 'Tất tay'])],
  ['minPts', '✋ Người chơi được dằn từ', [[15, '15 điểm'], [16, '16 điểm']]],
  ['caiMin', '👀 Nhà cái được xét từ', [[15, '15 điểm'], [16, '16 điểm']]],
  ['mXiBan', '🅰️🅰️ Xì bàn ăn', [[1, '×1'], [2, '×2'], [3, '×3']]],
  ['mXiDach', '🅰️🔟 Xì dách ăn', [[1, '×1'], [2, '×2'], [3, '×3']]],
  ['mNguLinh', '🖐️ Ngũ linh ăn', [[1, '×1'], [2, '×2'], [3, '×3']]],
  ['bothBust', '💥 Cùng quắc', [['cai', 'Nhà cái ăn'], ['hoa', 'Hoà']]],
  ['aceRule', '🅰️ Lá A', [['vn', 'Kiểu Việt'], ['flex', 'Linh hoạt 1/11']]],
  ['allowNon', '🍼 Dằn non', [[false, 'Không cho'], [true, 'Cho (lật ra thua)']]],
  ['turnTime', '⏳ Thời gian mỗi lượt', [[20, '20 giây'], [30, '30 giây'], [45, '45 giây']]],
];
const OPT_DESC = {
  caiMode: o => ({ rotate: 'Mỗi ván nhà cái chuyển sang người kế tiếp.', fixed: 'Một người làm cái suốt – bấm 👑 cạnh tên để chọn.', bot: 'Một bot ngồi cái suốt, ai cũng làm "con".', xidach: 'Ai ăn xì bàn / xì dách (khi nhà cái không có) thì ván sau lên làm cái.' })[o.caiMode],
  aceRule: o => o.aceRule === 'vn' ? 'A = 11/10 khi 2 lá, 10/1 khi 3 lá, 1 khi 4–5 lá.' : 'A = 1 hoặc 11 lúc nào cũng được (kiểu blackjack).',
  bothBust: o => o.bothBust === 'cai' ? 'Người chơi và nhà cái cùng quắc thì nhà cái vẫn ăn.' : 'Cùng quắc thì hoà, không ai mất chip.',
};
function renderLobby() {
  if (!lobby) return;
  const ps = lobby.players, o = lobby.opts || DEFAULT_OPTS, dis = isHost ? '' : 'disabled';
  $('#pcount').textContent = `${ps.length}/${MAX}`;
  const caiFixed = (o.caiMode === 'fixed' || o.caiMode === 'bot') ? (o.caiId || (o.caiMode === 'fixed' ? 'host' : null)) : null;
  $('#plist').innerHTML = ps.map(p => `<li>${avatar(p.name)}<span class="nm">${esc(p.name)}${p.id === myId ? ' <small>(bạn)</small>' : ''}${p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}${!p.connected ? ' 📴' : ''}${p.chips != null ? `<br><small>💰 ${fmt(p.chips)} chip</small>` : ''}</span>
    ${isHost ? `<button class="mk ${caiFixed === p.id ? 'on' : ''}" data-cai="${p.id}" title="Cho làm cái">👑${caiFixed === p.id ? ' Cái' : ''}</button>` : caiFixed === p.id ? '<span class="mk on">👑 Cái</span>' : ''}
    ${isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</li>`).join('');
  $$('#plist [data-rm]').forEach(b => b.onclick = () => net.removePlayer(b.dataset.rm));
  $$('#plist [data-cai]').forEach(b => b.onclick = () => net.setOpt('caiId', b.dataset.cai));
  $('#btn-addbot').style.display = isHost && ps.length < MAX ? '' : 'none';
  $('#btn-reset-chips').style.display = isHost && ps.some(p => p.chips != null) ? '' : 'none';
  $('#opts').innerHTML = OPT_UI.map(([k, label, ch]) => `<div class="opt"><b>${label}</b><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v="${String(v)}" class="${o[k] === v ? 'on' : ''}" ${dis}>${t}</button>`).join('')}</div>${OPT_DESC[k] ? `<small>${OPT_DESC[k](o)}</small>` : ''}</div>`).join('');
  $$('#opts [data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; const v = OPT_CHOICES[k].find(x => String(x) === b.dataset.v); net.setOpt(k, v); });
  $('#btn-start').style.display = isHost ? '' : 'none';
  $('#wait-msg').style.display = isHost ? 'none' : '';
}
$('#btn-addbot').onclick = () => net && net.addBot();
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

// ---------- gửi hành động ----------
function send(a) { if (!net) return; fx.actx(); if (isHost) net.act('host', a); else net.act(a); }
const P = id => view && view.players.find(p => p.id === id);
const me = () => P(myId);
const nameOf = id => clean((P(id) || {}).name || '?');
const amCai = () => view && view.caiId === myId;
const maxBet = p => Math.max(0, view.opts.maxBet ? Math.min(view.opts.maxBet, p.chips) : p.chips);
const canBegV = p => p && p.chips < view.opts.minBet && (view.phase === 'end' || (view.phase === 'bet' && (!p.betDone || p.id === view.caiId)));

// ---------- vẽ bàn ----------
function kindBadge(info, big = false) {
  if (!info) return '';
  const k = info.kind;
  if (k === 'xiban' || k === 'xidach' || k === 'ngulinh') return `<span class="badge sp ${big ? 'big' : ''}">${KIND_NAME[k]}${k === 'ngulinh' ? ' ' + info.pts : ''}</span>`;
  if (k === 'quac') return `<span class="badge quac ${big ? 'big' : ''}">💥 ${info.pts}</span>`;
  return `<span class="badge ${big ? 'big' : ''}">${info.pts} điểm</span>`;
}
const resBadge = r => !r ? '' : r.r === 'win' ? `<span class="badge win">+${fmt(r.delta)}${r.mult > 1 ? ` ×${r.mult}` : ''}</span>` : r.r === 'lose' ? `<span class="badge lose">${fmt(r.delta)}${r.mult > 1 ? ` ×${r.mult}` : ''}</span>` : '<span class="badge push">Hoà 🤝</span>';
function cardsOf(p, flip) {
  if (p.cards) return p.cards.map((c, i) => cardHTML(c, flip ? 'flip' : '', flip ? `style="animation-delay:${i * 70}ms"` : '')).join('');
  return Array.from({ length: p.n }, () => cardHTML(null)).join('');
}
function render() {
  const v = view; if (!v) return;
  // nhạc: cái lật bài / xét bài = gay cấn
  fx.musicMood(v.phase === 'dealer' ? 'tense' : 'game');
  const C = P(v.caiId);
  $('#round-tag').innerHTML = `Ván ${v.round} · 👑 ${amCai() ? 'Bạn' : esc(nameOf(v.caiId))} làm cái`;
  renderDealer(v, C);
  renderSeats(v);
  renderMe(v);
  renderHint(v);
  $('#log-list').innerHTML = v.log.map(l => `<li>${esc(l)}</li>`).join('');
  $('#log-list').scrollTop = 1e6;
  reacts.setVisible(true);
  tickClock();
}
function renderDealer(v, C) {
  const d = $('#dealer'); d.dataset.pid = C.id;
  d.classList.toggle('turn', v.phase === 'dealer');
  if (amCai()) {
    d.innerHTML = `<div class="who"><span class="crown">👑</span><div class="nm">Bạn đang làm nhà cái<small>Ăn/đền với từng người · bài của bạn ở dưới 👇</small></div></div>`;
    return;
  }
  const st = v.phase === 'bet' ? 'Chờ mọi người đặt cược' : v.phase === 'play' ? 'Chờ mọi người rút xong' : v.phase === 'dealer' ? '<span class="dot3">Đang rút & xét bài</span>' : '';
  d.innerHTML = `<div class="who">${avatar(C.name)}<div class="nm"><span class="crown">👑</span>${esc(clean(C.name))}${C.isBot ? ' 🤖' : ''}<small>💰 ${fmt(C.chips)} · ${st || 'Nhà cái'}</small></div></div>
    <div class="cards">${C.n ? cardsOf(C, flipNow.has(C.id)) : ''}</div>${C.info ? kindBadge(C.info, true) : ''}`;
}
function seatStatus(v, p) {
  if (p.res) return resBadge(p.res);
  if (v.phase === 'bet') return p.betDone ? '' : '<span class="stt dot3">Đang chọn cược</span>';
  if (v.phase === 'play') return v.turn === p.id ? '<span class="stt dot3">Đang rút</span>' : p.done ? '<span class="stt">Xong ✋</span>' : '<span class="stt">Chờ lượt</span>';
  if (v.phase === 'dealer') return '<span class="stt">Chờ xét 😬</span>';
  return '';
}
function renderSeats(v) {
  const caiInfo = amCai() && P(myId).info, canXet = v.phase === 'dealer' && amCai() && caiInfo && caiInfo.kind !== 'non';
  const ids = v.order.filter(id => id !== myId);
  $('#seats').innerHTML = ids.map(id => {
    const p = P(id), turn = v.phase === 'play' && v.turn === id;
    const away = (v.away || []).includes(id);
    return `<div class="seat ${turn ? 'turn' : ''} ${p.done ? 'done' : ''} ${p.revealed ? 'revealed' : ''} ${away ? 'away' : ''}" data-pid="${id}">
      <div class="st-h">${avatar(p.name)}<div class="st-n">${esc(clean(p.name))}${p.isBot ? ' 🤖' : ''}<small>💰 ${fmt(p.chips)}</small></div></div>
      <div class="st-c">${p.n ? cardsOf(p, flipNow.has(id)) : '<span class="stt">—</span>'}</div>
      <div class="st-f">${p.bet ? `<span class="bet">🪙 ${fmt(p.bet)}</span>` : ''}${p.info && (p.revealed || v.phase === 'end') ? kindBadge(p.info) : ''}${seatStatus(v, p)}${v.phase === 'dealer' && amCai() && !p.revealed ? `<button class="btn gold xet" data-xet="${id}" ${canXet ? '' : 'disabled'} title="Lật bài người này">👀 Xét</button>` : ''}</div>
    </div>`;
  }).join('') || '<p class="hint">Chỉ có bạn với nhà cái 😎</p>';
  $$('#seats [data-xet]').forEach(b => b.onclick = () => send({ type: 'reveal', target: b.dataset.xet }));
}
function renderMe(v) {
  const m = me(); if (!m) return;
  const cai = amCai();
  $('#me-top').innerHTML = `${avatar(m.name)}<span class="nm">${cai ? '<span class="crw">👑</span>' : ''}<span class="nt">${esc(clean(m.name))}${cai ? ' · Nhà cái' : ''}</span></span>${m.bet ? `<span class="bet badge">🪙 ${fmt(m.bet)}</span>` : ''}<span class="clock" id="clock" style="display:none"></span><span class="chips ${m.chips < 0 ? 'neg' : ''}">💰 ${fmt(m.chips)}</span>`;
  $('#hand').className = 'hand n' + (m.n || 0); $('.me-hand').classList.toggle('empty', !m.n);
  $('#hand').innerHTML = (m.cards || []).map((c, i) => cardHTML(c, shownMine.has(c.id) ? '' : 'flip', shownMine.has(c.id) ? '' : `style="animation-delay:${i * 60}ms"`)).join('');
  (m.cards || []).forEach(c => shownMine.add(c.id));
  const pe = $('#pts'), I = m.info;
  if (I && m.n) {
    const k = I.kind, sp = k === 'xiban' || k === 'xidach' || k === 'ngulinh';
    pe.className = 'pts ' + (sp ? 'sp' : k);
    const min = cai ? v.opts.caiMin : v.opts.minPts;
    pe.innerHTML = sp ? `<b>${k === 'ngulinh' ? I.pts : '★'}</b><small>${KIND_NAME[k]}</small>` : k === 'quac' ? `<b>${I.pts}</b><small>Quắc 💥</small>` : `<b>${I.pts}</b><small>${k === 'non' ? `Non 🍼 (cần ${min})` : 'điểm · đủ tuổi'}</small>`;
  } else { pe.className = 'pts'; pe.innerHTML = ''; }
  renderActions(v, m);
}
function chipVals(v, m) { const b = v.opts.minBet, mx = maxBet(m); return [b, b * 5, b * 10, b * 20].filter(x => x <= Math.max(mx, b)); }
function renderActions(v, m) {
  const a = $('#actions'), cai = amCai(), I = m.info;
  let h = '';
  const beg = canBegV(m) ? `<button class="btn gold" data-act="beg">🥺 Xin mẹ thêm chip</button>` : '';
  if (v.phase === 'bet') {
    if (cai) h = `<div class="msg">👑 Bạn làm cái ván này – chờ mọi người đặt cược…</div>${beg}`;
    else if (m.betDone) h = `<div class="msg big">✅ Đã chốt cược ${fmt(m.bet)} – chờ chia bài</div>`;
    else if (beg) h = `<div class="msg">Hết vốn rồi 😭 dưới ${v.opts.minBet} chip thì không cược được.</div>${beg}`;
    else {
      const mx = maxBet(m), vals = chipVals(v, m);
      h = `<div class="tray">${vals.map((x, i) => `<button class="tok t${i + 1}" data-tok="${x}" ${draft + x > mx && draft >= mx ? 'disabled' : ''} aria-label="Thêm ${x} chip"><span>${x >= 1000 ? x / 1000 + 'K' : x}</span></button>`).join('')}<button class="chip sm" data-act="max">Tối đa</button></div>
        <div class="betbox"><button class="chip" data-act="clear" ${draft ? '' : 'disabled'}>Xoá</button><span class="betval"><small>Cược</small>${fmt(draft)}</span><button class="btn green" data-act="bet" ${draft >= v.opts.minBet ? '' : 'disabled'}>Chốt cược ✅</button></div>`;
    }
  } else if (v.phase === 'play') {
    if (cai) h = '<div class="msg">👑 Chờ mọi người rút xong rồi tới lượt bạn…</div>';
    else if (v.turn === myId) {
      const non = I && I.kind === 'non';
      h = `<button class="btn blue" data-act="hit" ${m.n >= MAX_CARDS ? 'disabled' : ''}>🃏 Rút</button><button class="btn ${non && !v.opts.allowNon ? '' : 'green'}" data-act="stand" ${non && !v.opts.allowNon ? 'style="opacity:.55"' : ''}>✋ Dằn</button>`;
    } else if (m.done) h = `<div class="msg">${m.res ? '' : I && I.kind === 'quac' ? 'Quắc rồi bà con ơi 💥 – cầu nhà cái quắc theo 🙏' : I && I.kind === 'ngulinh' ? 'Ngũ linh nè 🖐️ – ngồi chờ ăn thôi 😎' : '✋ Đã dằn – chờ nhà cái xét 😬'}</div>${m.res ? `<div class="msg big">${resLine(m.res)}</div>` : ''}`;
    else h = `<div class="msg">⏳ Chờ tới lượt bạn…</div>`;
  } else if (v.phase === 'dealer') {
    if (cai) {
      const non = I.kind === 'non';
      h = `<button class="btn blue" data-act="hit" ${m.n >= MAX_CARDS || I.kind === 'quac' ? 'disabled' : ''}>🃏 Rút</button><button class="btn gold" data-act="revealAll" ${non ? 'style="opacity:.55"' : ''}>👀 Xét hết</button>`;
    } else h = `<div class="msg">${m.res ? resLine(m.res) : I && I.kind === 'quac' ? '💥 Quắc rồi… nín thở chờ nhà cái 🙏' : '😬 Nhà cái đang xét bài… hồi hộp ghê'}</div>`;
  } else if (v.phase === 'end') {
    const mine = cai ? caiDelta(v) : m.res ? m.res.delta : 0;
    const line = cai ? `👑 Ván này nhà cái ${mine > 0 ? `ăn <b>+${fmt(mine)}</b> 🤑` : mine < 0 ? `đền <b>${fmt(mine)}</b> 😭` : 'huề vốn 🤝'}` : m.res ? resLine(m.res) : '';
    const left = clockInfo && clockInfo.kind === 'next' && clockEnd ? Math.max(0, Math.ceil((clockEnd - Date.now()) / 1000)) : 0;
    h = `<div class="msg big">${line}</div>${isHost ? `<button class="btn pri" data-act="next">▶ Ván tiếp${left ? ` <small id="next-left">(${left}s)</small>` : ''}</button><button class="btn" data-act="lobby">🏠 Về sảnh</button>` : '<div class="msg">Chờ chủ phòng chia ván mới…</div>'}${beg}<button class="chip board" data-act="board" title="Bảng chip" aria-label="Bảng chip">📊</button>`;
  }
  a.innerHTML = h;
  $$('#actions [data-tok]').forEach(b => b.onclick = () => {
    const x = +b.dataset.tok, mx = maxBet(m);
    if (draft + x > mx) { draft = mx; toast(`Tối đa ${fmt(mx)} chip nha`); } else draft += x;
    fx.sfx.chip(); renderActions(view, me()); fx.pop($('.betval'));
  });
  $$('#actions [data-act]').forEach(b => b.onclick = () => onAct(b.dataset.act));
}
function resLine(r) { return r.r === 'win' ? `🤑 Ăn rồi! <b>+${fmt(r.delta)}</b>${r.mult > 1 ? ` (×${r.mult})` : ''} – ${esc(r.why)}` : r.r === 'lose' ? `😭 Toang, mất <b>${fmt(-r.delta)}</b>${r.mult > 1 ? ` (×${r.mult})` : ''} – ${esc(r.why)}` : `🤝 Hoà, huề vốn – ${esc(r.why)}`; }
function caiDelta(v) { return v.order.reduce((t, id) => t - ((P(id).res || {}).delta || 0), 0); }
function onAct(k) {
  const v = view, m = me(); if (!v || !m) return;
  if (k === 'max') { draft = maxBet(m); fx.sfx.chips(); renderActions(v, m); return; }
  if (k === 'clear') { draft = 0; renderActions(v, m); return; }
  if (k === 'bet') { send({ type: 'bet', amount: draft }); fx.sfx.chips(); return; }
  if (k === 'stand' && m.info && m.info.kind === 'non' && !v.opts.allowNon) { toast(`Chưa đủ tuổi (dưới ${v.opts.minPts}) – rút tiếp đi 🍼`); fx.sfx.bad(); fx.shake($('#pts')); return; }
  if (k === 'revealAll' && m.info && m.info.kind === 'non') { toast(`Nhà cái chưa đủ ${v.opts.caiMin} điểm – rút tiếp đã 🍼`); fx.sfx.bad(); fx.shake($('#pts')); return; }
  if (k === 'next') { if (isHost) net.next(); return; }
  if (k === 'lobby') { if (isHost) net.restart(); return; }
  if (k === 'board') { openBoard(); return; }
  send({ type: k });
}
function renderHint(v) {
  const h = $('#hint'), C = P(v.caiId);
  let t = '';
  if (v.phase === 'bet') { const ps = v.order.map(P); t = `🪙 Đặt cược đi bà con! <b>${ps.filter(p => p.betDone).length}/${ps.length}</b> đã chốt`; }
  else if (v.phase === 'play') t = v.turn === myId ? '🎯 <b>Tới lượt bạn!</b> Rút thêm hay dằn?' : `🃏 Lượt của <b>${esc(nameOf(v.turn))}</b>`;
  else if (v.phase === 'dealer') {
    if (amCai()) { const I = me().info; t = I.kind === 'non' ? `👑 Bạn có ${I.pts} – nhà cái phải đủ <b>${v.opts.caiMin}</b> mới được xét, rút tiếp!` : '👀 Đủ tuổi rồi! Bấm <b>Xét</b> trên ghế để lật riêng từng người, rút thêm, hoặc <b>Xét hết</b>.'; }
    else t = `👑 Nhà cái <b>${esc(clean(C.name))}</b> đang rút & xét bài…`;
  } else if (v.phase === 'end') { const cd = caiDelta(v); t = `🏁 Hết ván ${v.round} · nhà cái ${cd > 0 ? 'ăn +' + fmt(cd) : cd < 0 ? 'đền ' + fmt(cd) : 'huề vốn'}${v.nextCai && v.opts.caiMode === 'xidach' && v.nextCai !== v.caiId ? ` · ván sau <b>${esc(nameOf(v.nextCai))}</b> lên cái 👑` : ''}`; }
  h.innerHTML = t;
}
// bảng chip cả bàn
function openBoard() {
  const v = view; if (!v) return;
  const rows = [...v.players].sort((a, b) => b.chips - a.chips);
  const hist = v.history.slice(-6);
  openModal(`<button class="close-x" onclick="__closeModal()" aria-label="Đóng">✕</button><h2>📊 Bảng chip</h2><p style="text-align:center;margin:0 0 8px;color:var(--muted)">Ván ${v.round} · chip ảo, chỉ để vui 🪙</p>
    <table class="score"><tbody>${rows.map(p => `<tr class="${p.id === myId ? 'mine' : ''}"><td>${avatar(p.name)}</td><td><b>${esc(clean(p.name))}</b>${p.id === v.caiId ? ' 👑' : ''}${p.id === myId ? ' <small>(bạn)</small>' : ''}<div class="hist">${hist.map(h => { const d = h.deltas[p.id] || 0; return `<i class="${d > 0 ? 'p' : d < 0 ? 'm' : ''}" title="Ván ${h.round}">${h.cai === p.id ? '👑' : ''}${sgn(d)}</i>`; }).join('')}</div>${p.granted ? `<small style="color:var(--muted)">đã xin mẹ ${fmt(p.granted)}</small>` : ''}</td><td class="n">${fmt(p.chips)}</td></tr>`).join('')}</tbody></table>
    <div class="btns"><button class="btn" onclick="__closeModal()">Đóng</button></div>`, '', 'board');
}

// ---------- đồng hồ ----------
function tickClock() {
  const el = $('#clock'), v = view; if (!el) return;
  if (!v || !clockInfo || !clockEnd) { el.style.display = 'none'; return; }
  const left = Math.max(0, Math.ceil((clockEnd - Date.now()) / 1000));
  const mine = (clockInfo.kind === 'bet' && (clockInfo.pids || []).includes(myId) && !me().betDone) || (clockInfo.kind === 'turn' && clockInfo.pid === myId);
  const nl = $('#next-left'); if (nl) nl.textContent = `(${left}s)`;
  if (!mine) { el.style.display = 'none'; return; }
  el.style.display = ''; el.textContent = `⏳ ${left}s`; el.classList.toggle('low', left <= 8);
  if (left <= 5 && left > 0 && left !== tickClock.last) { tickClock.last = left; fx.sfx.tick(); }
}
setInterval(tickClock, 250);

// ---------- hoạt ảnh ----------
const seatEl = id => id === myId ? $('#hand') : id === (view && view.caiId) ? $('#dealer') : $(`.seat[data-pid="${id}"]`);
const deckEl = () => $('#dealer');
function animate(prev, v, evs) {
  if (!prev) return;
  const S = fx.S();
  let at = 0;
  const run = (f, d = 0) => setTimeout(f, (at + d) * S);
  for (const e of evs) {
    switch (e.k) {
      case 'round': run(() => { fx.banner(`Ván ${e.round} · ${e.cai === myId ? 'Bạn' : nameOf(e.cai)} làm cái 👑`, 'cai'); fx.sfx.turn(); }); at += 300; break;
      case 'bet': if (e.pid !== myId) run(() => { fx.sfx.chip(); fx.floatText(seatEl(e.pid), '🪙 ' + fmt(e.amount)); }); break;
      case 'deal': dealAnim(v); at += 900; break;
      case 'hit': run(() => { fx.sfx.deal(); fx.fly(cardHTML(null), deckEl(), seatEl(e.pid), { duration: 360 }); }); break;
      case 'turn': if (e.pid === myId) run(() => { fx.sfx.turn(); fx.pop($('#actions')); }, 250); break;
      case 'special': run(() => {
        const who = e.pid === myId ? 'Bạn' : nameOf(e.pid);
        fx.banner(e.kind === 'xiban' ? `${who}: XÌ BÀN!!! 🚀` : `${who}: XÌ DÁCH! 🤑`, e.cai ? 'cai' : 'good');
        fx.sfx.special(); fx.burst(seatEl(e.pid), 28);
      }, 300); at += 600; break;
      case 'xet': run(() => fx.sfx.xet()); break;
      case 'reveal': run(() => {
        fx.sfx.flip();
        const el = seatEl(e.pid), cls = e.r === 'win' ? 'win' : e.r === 'lose' ? 'lose' : '';
        fx.floatText(el, e.r === 'push' ? 'Hoà 🤝' : sgn(e.delta), cls);
        if (e.pid === myId) myResult(e);
      }, 150); at += 160; break;
      case 'caibust': run(() => { fx.banner(e.pid === myId ? 'Quắc rồi bà con ơi 💥' : 'Nhà cái quắc! Cả làng ăn tiền 🎉', 'bad'); fx.sfx.bust(); fx.shake($('#dealer')); }); at += 500; break;
      case 'beg': run(() => { fx.banner(`🥺 ${e.pid === myId ? 'Bạn' : nameOf(e.pid)} xin mẹ thêm chip`, ''); fx.sfx.beg(); }); break;
      case 'end': run(() => {
        if (e.cai === myId) { const d = e.caiDelta; fx.banner(d > 0 ? `Nhà cái ăn +${fmt(d)} 🤑` : d < 0 ? `Nhà cái đền ${fmt(d)} 😭` : 'Huề vốn 🤝', d > 0 ? 'good' : d < 0 ? 'bad' : ''); d > 0 ? fx.sfx.win() : d < 0 ? fx.sfx.lose() : fx.sfx.push(); if (d >= 4 * v.opts.minBet) fx.confetti(60); }
      }, 400); break;
    }
  }
  // bài của chính mình: quắc / ngũ linh / 21
  const a = prev.players.find(p => p.id === myId), b = v.players.find(p => p.id === myId);
  if (a && b && b.cards && a.cards && b.cards.length > a.cards.length && a.cards.length >= 2 && b.info) {
    const k = b.info.kind;
    setTimeout(() => {
      if (k === 'quac' && !(evs.some(e => e.k === 'caibust'))) { fx.banner('Quắc rồi bà con ơi 💥', 'bad'); fx.sfx.bust(); fx.shake($('#hand')); }
      else if (k === 'ngulinh') { fx.banner('Ngũ linh nè 🖐️', 'good'); fx.sfx.ngulinh(); fx.burst($('#pts'), 24); }
      else if (b.info.pts === 21) { fx.banner('Hai mốt nút! Ngon 😎', 'good'); fx.sfx.special(); }
      else if (k === 'non') fx.floatText($('#pts'), 'Chưa đủ tuổi 🍼');
    }, 380 * S);
  }
}
function myResult(e) {
  if (e.r === 'win') { fx.banner(`Ăn rồi! +${fmt(e.delta)} 🤑`, 'good'); fx.sfx.win(); if (e.mult > 1 || e.delta >= 5 * view.opts.minBet) fx.confetti(70); }
  else if (e.r === 'lose') { fx.banner(`Toang, mất ${fmt(-e.delta)} 😭`, 'bad'); fx.sfx.lose(); }
  else { fx.banner('Hoà, huề vốn 🤝', ''); fx.sfx.push(); }
}
function dealAnim(v) {
  let k = 0; const order = [...v.order, v.caiId];
  for (let r = 0; r < 2; r++) for (const id of order) { const d = k++ * 80; setTimeout(() => fx.sfx.deal(), d * fx.S()); fx.fly(cardHTML(null), deckEl(), seatEl(id), { delay: d, duration: 340 }); }
}

// ---------- thả emoji / chọc nhau ----------
const reacts = createReactions({
  send: e => { if (!net) return; if (isHost) net.react('host', e); else net.react(e); },
  seatEl: id => id === myId ? $('#me-top') : id === (view && view.caiId) ? $('#dealer') : $(`.seat[data-pid="${id}"]`),
  myId: () => myId,
  nameOf: id => nameOf(id),
  mount: $('#me'), place: 'right:10px;top:4px',
  phrases: XD_PHRASES,
  onShow: () => fx.sfx.pip(),
});
reacts.setVisible(false);
addEventListener('resize', () => view && render());
if (location.hash === '#debug') window.__dbg = () => ({ net, view });

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
