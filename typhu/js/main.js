import { Host, Client, MAX } from './net.js?v=1';
import { SQUARES, N, GROUPS, groupSquares, houseCost, landmarkCost, value, MULT, SALARY, ISLAND_FEE, money, AVATARS, COLORS } from './board.js';
import { skylineSVG } from './skyline.js';
import { Board3D } from './scene3d.js?v=3';
let B = null; // bàn cờ 3D
import { cost } from './engine.js';
import * as fx from './fx.js';
import { openGuide } from './guide.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
let net = null, isHost = false, myId = null, lobby = null, view = null, prev = null, modalKey = null;
const disp = {}; let seenSeq = 0, animBusy = Promise.resolve(), seenChance = null;

// ---------- tiện ích ----------
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }
let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
function openModal(html, cls = '', key = null) { $('#modal-box').className = 'modal-box ' + cls; $('#modal-box').innerHTML = html; $('#modal').classList.add('open'); modalKey = key; }
function closeModal() { $('#modal').classList.remove('open'); modalKey = null; }
window.__closeModal = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !modalKey) closeModal(); });
const pawnIc = (c, av = '') => `<span class="pawn-ic" style="background:${c}">${av}</span>`;
const me = () => view && view.players.find(p => p.id === myId);
const P = id => view.players.find(p => p.id === id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- trang chủ / sảnh ----------
$('#name').value = ls.get('bgvn-name') || '';
document.querySelector('.sky').insertAdjacentHTML('beforeend', skylineSVG());
let prof = { avatar: AVATARS.includes(ls.get('typhu-avatar')) ? ls.get('typhu-avatar') : AVATARS[0], color: COLORS.includes(ls.get('typhu-color')) ? ls.get('typhu-color') : COLORS[0] };
function drawPickers() {
  $('#av-pick').innerHTML = AVATARS.map(a => `<button class="${a === prof.avatar ? 'on' : ''}" data-av="${a}" style="--pc:${prof.color}">${a}</button>`).join('');
  $('#col-pick').innerHTML = COLORS.map(c => `<button class="${c === prof.color ? 'on' : ''}" data-col="${c}" style="background:${c}"></button>`).join('');
  $$('#av-pick [data-av]').forEach(b => b.onclick = () => { prof.avatar = b.dataset.av; ls.set('typhu-avatar', prof.avatar); fx.sfx.hop(); drawPickers(); });
  $$('#col-pick [data-col]').forEach(b => b.onclick = () => { prof.color = b.dataset.col; ls.set('typhu-color', prof.color); fx.sfx.hop(); drawPickers(); });
}
drawPickers();
const myName = () => { const n = $('#name').value.trim() || 'Bạn'; ls.set('bgvn-name', n); return n; };
const handlers = {
  onLobby(info, code, started) { lobby = info; $('#room-code').textContent = code; if (!started) { view = null; renderLobby(); if (!$('#screen-lobby').classList.contains('active')) show('screen-lobby'); } },
  onState(v) {
    if (!v) { view = null; closeModal(); show('screen-lobby'); renderLobby(); return; }
    setTimer(v.phase === 'playing' ? v.timer : null);
    prev = view; view = v;
    if (!$('#screen-game').classList.contains('active')) { show('screen-game'); buildBoard(); prev = null; seenSeq = v.moves.length ? v.moves[v.moves.length - 1].seq : 0; v.players.forEach(p => disp[p.id] = p.pos); fx.banner('Bắt đầu! 🎲', 'Y'); }
    render(); effects(prev, v);
  },
  onError(m) { toast(m); fx.sfx.payout(); },
  onStatus(m) { toast(m); },
  onJoined(id) { myId = id; },
  onDisconnect() { toast('Mất kết nối – đang tự vào lại…'); },
};
function startHost(offline) {
  fx.actx(); fx.musicResumeIfOn();
  net = new Host(myName(), handlers, offline, prof); isHost = true; myId = 'host';
  if (offline) { net.addBot(); net.addBot(); net.addBot(); }
  $('#code-box').style.display = offline ? 'none' : '';
  show('screen-lobby');
}
$('#btn-offline').onclick = () => startHost(true);
$('#btn-create').onclick = () => startHost(false);
$('#btn-join').onclick = () => {
  const code = $('#join-code').value.trim(); if (code.length < 5) return toast('Nhập mã phòng 5 ký tự nhé.');
  fx.actx(); fx.musicResumeIfOn(); net = new Client(code, myName(), handlers, prof); isHost = false; $('#code-box').style.display = ''; toast('Đang kết nối…');
};
$('#join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-join').click(); });
const qcode = new URLSearchParams(location.search).get('room'); if (qcode) $('#join-code').value = qcode.toUpperCase();
function leave() { if (net) net.destroy(); net = null; view = null; lobby = null; closeModal(); show('screen-home'); }
$('#btn-leave-lobby').onclick = leave;
$('#btn-leave').onclick = () => openModal(`<h2 style="text-align:center">Rời ván?</h2><p style="text-align:center">${isHost ? 'Bạn là chủ phòng – rời đi sẽ kết thúc ván.' : 'Bạn có thể vào lại bằng mã phòng.'}</p><div class="mbtns"><button class="btn" onclick="__closeModal()">Ở lại</button><button class="btn pri" id="m-leave">Rời ván</button></div>`);
document.addEventListener('click', e => { if (e.target.id === 'm-leave') leave(); });
$('#btn-copy').onclick = () => { const url = location.origin + location.pathname + '?room=' + $('#room-code').textContent; navigator.clipboard?.writeText(url).then(() => toast('Đã chép link mời 📋'), () => toast(url)); };
const OPTS = [
  ['startMoney', 'Tiền khởi đầu', [[1500, '1,5M'], [2000, '2M'], [3000, '3M']]],
  ['maxRounds', 'Giới hạn vòng', [[0, 'Không'], [20, '20 vòng'], [30, '30 vòng']], 'Hết vòng thì ai nhiều tài sản nhất thắng.'],
  ['monopolyWin', 'Thắng bằng độc quyền', [[true, 'Bật'], [false, 'Tắt']], 'Độc quyền 3 màu / cả 4 điểm du lịch / 1 dãy phố là thắng luôn.'],
];
function renderLobby() {
  if (!lobby) return;
  const ps = lobby.players;
  $('#pcount').textContent = `${ps.length}/${MAX}`;
  $('#plist').innerHTML = ps.map((p, i) => `<li>${pawnIc(p.color, p.avatar)}<span>${esc(p.name)}${p.id === myId ? ' <small>(bạn)</small>' : ''}${p.id === 'host' ? ' 👑' : ''}</span>${isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}">✕</button>` : ''}</li>`).join('');
  $$('#plist [data-rm]').forEach(b => b.onclick = () => net.removePlayer(b.dataset.rm));
  $('#btn-addbot').style.display = isHost && ps.length < MAX ? '' : 'none';
  $('#opts').innerHTML = OPTS.map(([k, t, ch, note]) => `<div class="opt"><b>${t}</b><div class="seg">${ch.map(([v, l]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${lobby.opts[k] === v ? 'on' : ''}" ${isHost ? '' : 'disabled'}>${l}</button>`).join('')}</div>${note ? `<small>${note}</small>` : ''}</div>`).join('');
  $$('#opts [data-k]').forEach(b => b.onclick = () => net.setOpt(b.dataset.k, JSON.parse(b.dataset.v)));
  $('#btn-start').style.display = isHost ? '' : 'none';
  $('#wait-msg').style.display = isHost ? 'none' : '';
}
$('#btn-addbot').onclick = () => net && net.addBot();
$('#btn-start').onclick = () => { fx.actx(); net && net.start(); };

// ---------- công cụ ----------
$('#speed').innerHTML = Object.entries(fx.SPEEDS).map(([k, v]) => `<option value="${k}">⚡ ${v.name}</option>`).join('');
$('#speed').value = fx.getSpeed(); $('#speed').onchange = e => fx.setSpeed(e.target.value);
const syncMusic = () => { $('#btn-music').classList.toggle('on', fx.musicIsOn()); $('#btn-music-home').classList.toggle('on', fx.musicIsOn()); };
$('#btn-music').onclick = $('#btn-music-home').onclick = () => { fx.actx(); fx.musicToggle(); syncMusic(); }; syncMusic();
const syncMute = () => $('#btn-mute').textContent = fx.isMuted() ? '🔇' : '🔊';
$('#btn-mute').onclick = () => { fx.toggleMute(); syncMute(); }; syncMute();
$('#btn-guide').onclick = $('#btn-guide-home').onclick = () => openGuide(openModal);
$('#btn-log').onclick = () => $('#log').classList.toggle('open');
$('#btn-log-close').onclick = () => $('#log').classList.remove('open');
function send(a) { if (!net) return; if (isHost) net.act('host', a); else net.act(a); }

// ---------- bàn cờ 3D ----------
function buildBoard() {
  if (!B) B = new Board3D($('#game3d'), { onCell });
  B.resetPawns && B.resetPawns();
  B.sync(view); placeAll();
}
function placeAll() {
  if (!view || !B) return;
  const groups = {};
  for (const p of view.players) { if (p.out) continue; const i = disp[p.id] ?? p.pos; (groups[i] = groups[i] || []).push(p.id); }
  for (const i in groups) groups[i].forEach((id, k) => B.placePawn(id, +i, k, groups[i].length));
}
addEventListener('resize', () => requestAnimationFrame(placeAll));

// ---------- vẽ ----------
function render() {
  const v = view; if (!v) return;
  $('#round-tag').textContent = `Vòng ${v.round}${v.maxRounds ? '/' + v.maxRounds : ''}`;
  if (B) { B.sync(v); B.setTurn(v.phase === 'playing' ? (v.pending ? v.pending.player : v.players[v.turn].id) : null); }
  // người chơi
  const n = v.players.length;
  const myIdx = Math.max(0, v.players.findIndex(p => p.id === myId));
  $('#players').innerHTML = v.players.map((p, i) => {
    const slot = (i - myIdx + n) % n; const turn = v.phase === 'playing' && (v.pending ? v.pending.player === p.id : v.players[v.turn].id === p.id);
    const props = Object.values(v.props).filter(x => x.owner === p.id).length;
    const badges = [p.island ? `🏝️ ${p.island} lượt` : '', p.travel ? '✈️ sắp bay' : '', p.freeRent ? `🎟️×${p.freeRent}` : '', p.escape ? `🚤×${p.escape}` : ''].filter(Boolean);
    return `<div class="pcard p${slot} ${turn ? 'turn' : ''} ${p.out ? 'out' : ''}" data-pid="${p.id}" style="--pc:${p.color}">${pawnIc(p.color, p.avatar)}<div class="pn">${esc(p.name)}${p.id === myId ? ' (bạn)' : ''}</div><div class="cash">${p.out ? 'Phá sản' : money(p.cash)}</div>
      <div class="sub"><span>🏠 ${props} ô</span><span>💎 ${money(p.assets)}</span></div>${badges.length ? `<div class="badges">${badges.map(b => `<span>${b}</span>`).join('')}</div>` : ''}</div>`;
  }).join('');
  renderCenter();
  $('#log-list').innerHTML = v.log.map(l => `<li>${esc(l)}</li>`).join(''); $('#log-list').scrollTop = 1e6;
  $('#c-feed').innerHTML = v.log.slice(-3).map(l => `<div>${esc(l)}</div>`).join('');
  handlePending();
  if (v.phase === 'ended') showWin();
}
const isMyTurn = () => view && view.phase === 'playing' && !view.pending && view.players[view.turn].id === myId;
let picking = null; // { type, options, cb }
function renderCenter() {
  const v = view, a = $('#c-actions'), h = $('#c-hint'); a.innerHTML = ''; h.innerHTML = '';
  if (v.phase !== 'playing') return;
  const cp = v.players[v.turn];
  if (v.pending) { h.innerHTML = v.pending.player === myId ? '' : `⏳ ${esc(P(v.pending.player).name)} đang quyết định…`; return; }
  if (!isMyTurn()) { h.innerHTML = `Lượt của <b style="color:${cp.color}">${esc(cp.name)}</b>${cp.island ? ' (đang ở Côn Đảo)' : ''}`; return; }
  if (v.stage === 'travel') { h.innerHTML = '✈️ <b>Chọn ô muốn bay tới</b> trên bàn cờ'; startPick('travel', [...Array(N).keys()].filter(i => i !== 24), i => send({ type: 'travel', pos: i })); return; }
  if (v.stage === 'island') {
    h.innerHTML = `🏝️ Bạn đang ở Côn Đảo (còn ${me().island} lượt). Đổ ra <b>đôi</b> để thoát, hoặc trả tiền.`;
    a.innerHTML = `<button class="btn roll" data-a="roll">🎲 Đổ thử</button><button class="btn blue" data-a="pay_island" ${me().cash < ISLAND_FEE ? 'disabled' : ''}>🚤 Trả ${money(ISLAND_FEE)}</button>`;
  } else { a.innerHTML = `<button class="btn roll" data-a="roll">🎲 Đổ xúc xắc</button>`; h.innerHTML = 'Tới lượt bạn!'; }
  $$('#c-actions [data-a]').forEach(b => b.onclick = () => { b.disabled = true; if (b.dataset.a === 'roll') { fx.sfx.dice(); rollAnim(); } send({ type: b.dataset.a }); });
}
function startPick(type, options, cb) { if (picking && picking.type === type) return; picking = { type, options, cb }; B && B.pick(options); }
function endPick() { picking = null; B && B.endPick(); }
function onCell(i) {
  if (picking && picking.options.includes(i)) { const cb = picking.cb; endPick(); cb(i); return; }
  showDeed(i);
}

// ---------- xúc xắc ----------
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
function drawDie(el, n) { el.innerHTML = ''; for (let k = 1; k <= 9; k++) { const d = document.createElement('i'); if (!PIPS[n].includes(k)) d.style.visibility = 'hidden'; el.appendChild(d); } el.classList.toggle('red', n === 1 || n === 4); }
drawDie($('#d1'), 6); drawDie($('#d2'), 6);
let rolling = null;
function rollAnim() { if (rolling) return; const d1 = $('#d1'), d2 = $('#d2'); d1.classList.add('roll'); d2.classList.add('roll'); rolling = setInterval(() => { drawDie(d1, 1 + (Math.random() * 6 | 0)); drawDie(d2, 1 + (Math.random() * 6 | 0)); }, 70); }
function showDice(d) {
  return new Promise(res => {
    if (!rolling) { fx.sfx.dice(); rollAnim(); }
    setTimeout(() => { clearInterval(rolling); rolling = null; const d1 = $('#d1'), d2 = $('#d2'); d1.classList.remove('roll'); d2.classList.remove('roll'); drawDie(d1, d[0]); drawDie(d2, d[1]); fx.pop(d1, 'land'); fx.pop(d2, 'land'); if (d[0] === d[1]) fx.banner('Đổ đôi! 🎲🎲', 'Y'); res(); }, 520 * fx.S());
  });
}

// ---------- hoạt ảnh theo thay đổi ----------
function effects(a, b) {
  const newMoves = (b.moves || []).filter(m => m.seq > seenSeq);
  const diceChanged = b.dice && (!a || !a.dice || a.dice !== b.dice) && (newMoves.length || (a && JSON.stringify(a.dice) !== JSON.stringify(b.dice)) || (a && a.logN !== b.logN && /🎲/.test(b.log[b.log.length - 1] || '')));
  if (newMoves.length) seenSeq = newMoves[newMoves.length - 1].seq;
  const run = async () => {
    if (diceChanged && b.dice) await showDice(b.dice); else if (rolling) { clearInterval(rolling); rolling = null; $$('.die').forEach(d => d.classList.remove('roll')); }
    for (const m of newMoves) await animateMove(m);
    placeAll();
    if (a) moneyFx(a, b);
    if (b.phase === 'ended' && a && a.phase !== 'ended' && B) { B.celebrate(b.winner); }
    if (b.lastChance && (!seenChance || seenChance.seq !== b.lastChance.seq) && a) { seenChance = b.lastChance; await showChance(b.lastChance); } else if (!a) seenChance = b.lastChance;
    logFx(a, b);
  };
  animBusy = animBusy.then(run, run);
  if (!a) return;
}
async function animateMove(m) {
  if (!B) { disp[m.id] = m.to; return; }
  const stepMs = 230 * fx.S();
  B.follow(m.id); // camera bám theo quân đang đi
  if (m.kind === 'walk' || m.kind === 'back') {
    const dir = m.kind === 'back' ? -1 : 1, steps = Math.abs(m.steps) || ((m.to - m.from + N) % N);
    let i = m.from;
    for (let k = 0; k < steps; k++) {
      i = (i + dir + N) % N; disp[m.id] = i; fx.sfx.hop();
      await B.hop(m.id, i, stepMs);
      if (i === 0 && dir > 0) { B.floatAt(0, '+' + money(SALARY), '#1a9e52'); fx.sfx.cash(); B.burst(0, '#2fc76f', 20); }
    }
  } else if (m.kind === 'fly') { fx.sfx.plane(); disp[m.id] = m.to; await B.fly(m.id, m.to, 1300 * fx.S()); }
  else { if (m.to === 8) fx.sfx.island(); disp[m.id] = m.to; await B.placePawn(m.id, m.to, 0, 1, 700 * fx.S(), 1.2); }
  disp[m.id] = m.to; placeAll(); B.pulse(m.to);
  await sleep(250 * fx.S()); B.follow(null);
}
function moneyFx(a, b) {
  for (const p of b.players) {
    const q = a.players.find(x => x.id === p.id); if (!q) continue;
    const d = p.cash - q.cash; if (!d) continue;
    const card = $(`.pcard[data-pid="${p.id}"]`);
    fx.floatText(card, (d > 0 ? '+' : '') + money(d), d > 0 ? 'good' : '');
    if (p.id === myId) d > 0 ? fx.sfx.cash() : fx.sfx.payout();
  }
}
function logFx(a, b) {
  if (!a) return;
  const k = Math.min(30, b.logN - a.logN); if (k <= 0) return;
  for (const l of b.log.slice(-k)) {
    if (/Landmark/.test(l)) { fx.sfx.landmark(); fx.banner('🏛️ Landmark!', 'Y'); const pos = posInLine(l); pos != null && (B.burst(pos, '#ffd54a', 70), B.shake()); }
    else if (/ mua lại /.test(l)) { fx.sfx.takeover(); fx.banner('🤝 Mua lại!', 'R'); }
    else if (/ xây lên | mua .* và xây /.test(l)) { fx.sfx.build(); const pos = posInLine(l); pos != null && B.burst(pos, (P(b.players[b.turn].id) || {}).color || '#ffd54a', 30); }
    else if (/ mua /.test(l)) { fx.sfx.cash(); const pos = posInLine(l); pos != null && (B.burst(pos, '#ffd54a', 18), B.floatAt(pos, '🏠 Mua!', '#ff7a1a')); }
    else if (/tổ chức Lễ hội/.test(l)) { fx.sfx.festival(); fx.banner('🎉 Lễ hội x2!', 'R'); }
    else if (/phá sản/.test(l)) { fx.sfx.bankrupt(); fx.banner('💀 Phá sản!', 'R'); B.shake(); }
    else if (/ trả .* tiền thuê /.test(l)) { const pos = posInLine(l); const m2 = l.match(/ trả ([\d.,]+[KM])/); pos != null && m2 && B.floatAt(pos, '-' + m2[1], '#e53935'); }
    else if (/bị giam ở Côn Đảo/.test(l)) fx.banner('🏝️ Ra đảo!', 'B');
    else if (/Độc quyền|thắng!/.test(l)) {}
  }
  if (b.phase === 'ended' && a.phase !== 'ended') { fx.confetti(); fx.sfx.landmark(); }
}
function posInLine(l) { let best = null, len = 0; SQUARES.forEach((q, i) => { if ((q.type === 'city' || q.type === 'resort') && l.includes(q.name) && q.name.length > len) { best = i; len = q.name.length; } }); return best; }
async function showChance(c) {
  fx.sfx.chance();
  if (B) await B.drawCard(c.deck || 'chance');
  const wrap = document.createElement('div'); wrap.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;z-index:45;pointer-events:none';
  wrap.innerHTML = `<div class="chance-card ${c.deck === 'chest' ? 'chest' : ''}"><h3>${c.deck === 'chest' ? '💰 Khí vận' : '❓ Cơ hội'}</h3><p>${esc(c.text)}</p><small>${esc(P(c.player) ? P(c.player).name : '')}</small></div>`;
  document.body.appendChild(wrap); setTimeout(() => { wrap.style.transition = 'opacity .3s'; wrap.style.opacity = '0'; setTimeout(() => wrap.remove(), 300); }, 2200 * fx.S());
}

// ---------- quyết định: mua / xây / mua lại / lễ hội ----------
function deedHTML(i, curLv = -1) {
  const q = SQUARES[i]; const g = q.type === 'city' ? GROUPS[q.group].color : '#19b5c9';
  if (q.type === 'resort') return `<div class="deed" style="--gc:${g}"><div class="hd"><small>${q.icon} Điểm du lịch</small><b>${q.name}</b></div><table>
    <tr><td>Giá mua</td><td>${money(q.price)}</td></tr><tr><td>Thuê (có 1 / 2 / 3 / 4 điểm)</td><td>50K / 100K / 200K / 400K</td></tr></table></div>`;
  const rows = ['Đất trống', '1 nhà', '2 nhà', '3 nhà', '🏛️ Landmark'].map((t, lv) => `<tr class="${lv === curLv ? 'cur' : ''}"><td>${t}</td><td>${money(Math.round(value(q, lv) * MULT[lv] / 5) * 5)}</td></tr>`).join('');
  return `<div class="deed" style="--gc:${g}"><div class="hd"><small>Nhóm ${GROUPS[q.group].name} · ${groupSquares(q.group).length} đường</small><b>${q.name}</b></div><table>
    <tr><td>Giá đất</td><td>${money(q.price)}</td></tr><tr><td>Mỗi nhà</td><td>${money(houseCost(q))}</td></tr><tr><td>Landmark</td><td>${money(landmarkCost(q))}</td></tr>
    <tr><td colspan="2" style="text-align:center;background:#f6f8ff;font-weight:900">Tiền thuê</td></tr>${rows}<tr><td colspan="2" style="font-size:12px;color:#6b7895">Đủ bộ màu: thuê ×1,5 · Lễ hội: ×2</td></tr></table></div>`;
}
function showDeed(i) {
  const q = SQUARES[i]; if (q.type !== 'city' && q.type !== 'resort') return;
  const pr = view && view.props[i];
  openModal(`<button class="close-x" onclick="__closeModal()">✕</button>${deedHTML(i, pr ? pr.level : -1)}${pr ? `<p style="text-align:center">Chủ: <b style="color:${P(pr.owner).color}">${esc(P(pr.owner).name)}</b> · thuê hiện tại <b>${money(view.rents[i])}</b></p>` : '<p style="text-align:center;color:#6b7895">Chưa có chủ</p>'}`);
}
function handlePending() {
  const pr = view.pending;
  if (!pr || pr.player !== myId || view.phase !== 'playing') { if (modalKey && modalKey.startsWith('pend')) closeModal(); if (picking && picking.type === 'festival') endPick(); if (!(isMyTurn() && view.stage === 'travel') && picking && picking.type === 'travel') endPick(); return; }
  const key = 'pend-' + pr.type + '-' + view.logN;
  if (modalKey === key) return;
  animBusy.then(() => {
    if (!view.pending || view.pending.player !== myId || modalKey === key) return;
    const p = me(), q = SQUARES[pr.pos];
    if (pr.type === 'festival') { closeModal(); toast('🎉 Chọn 1 đất của bạn để tổ chức Lễ hội (thuê ×2)'); startPick('festival', pr.options, i => send({ type: 'festival', pos: i })); modalKey = key; return; }
    if (pr.type === 'takeover') {
      openModal(`${deedHTML(pr.pos, view.props[pr.pos].level)}<p style="text-align:center">Mua lại <b>${q.name}</b> từ <b>${esc(P(view.props[pr.pos].owner).name)}</b> với giá <b>${money(pr.price)}</b>?<br><small>Bạn có ${money(p.cash)}</small></p>
        <div class="mbtns"><button class="btn" data-x="skip">Thôi</button><button class="btn pri" data-x="takeover">🤝 Mua lại</button></div>`, '', key);
      $$('#modal-box [data-x]').forEach(b => b.onclick = () => { closeModal(); send({ type: b.dataset.x }); });
      return;
    }
    // mua / xây
    const from = pr.type === 'buy' ? -1 : view.props[pr.pos].level;
    const levels = [];
    for (let lv = Math.max(0, from + 1); lv <= pr.maxLevel; lv++) levels.push(lv);
    let pick = levels.filter(lv => cost(q, from, lv) <= p.cash).pop();
    if (pick == null) pick = levels[0];
    const LBL = ['🚩 Đất', '🏠 1 nhà', '🏠 2 nhà', '🏠 3 nhà', '🏛️ Landmark'];
    const draw = () => {
      openModal(`${deedHTML(pr.pos, pick)}<div class="levels">${levels.map(lv => `<button data-lv="${lv}" class="${lv === pick ? 'on' : ''}" ${cost(q, from, lv) > p.cash ? 'disabled' : ''}>${LBL[lv]}<small>${money(cost(q, from, lv))}</small></button>`).join('')}</div>
        <p style="text-align:center;margin:0 0 10px">Bạn có <b>${money(p.cash)}</b> → còn <b>${money(p.cash - cost(q, from, pick))}</b></p>
        <div class="mbtns"><button class="btn" data-x="skip">Bỏ qua</button><button class="btn pri" data-x="ok" ${cost(q, from, pick) > p.cash ? 'disabled' : ''}>${pr.type === 'buy' ? '🏠 Mua' : '🔨 Xây'} – ${money(cost(q, from, pick))}</button></div>`, '', key);
      $$('#modal-box [data-lv]').forEach(b => b.onclick = () => { pick = +b.dataset.lv; draw(); });
      $$('#modal-box [data-x]').forEach(b => b.onclick = () => { closeModal(); send(b.dataset.x === 'skip' ? { type: 'skip' } : { type: pr.type, level: pick }); });
    };
    draw();
  });
}
function showWin() {
  if (modalKey === 'win') return;
  const w = P(view.winner);
  animBusy.then(() => setTimeout(() => {
    if (!view || view.phase !== 'ended') return;
    const rank = [...view.players].sort((a, b) => (a.out - b.out) || b.assets - a.assets);
    openModal(`<div class="win"><div class="big">${view.winner === myId ? '🏆' : '🎉'}</div><h2>${view.winner === myId ? 'Bạn là Tỷ phú Sài Gòn!' : esc(w.name) + ' thắng!'}</h2><p>${esc(view.winReason)}</p>
      <ol style="text-align:left;display:inline-block">${rank.map(p => `<li>${esc(p.name)} – ${p.out ? 'phá sản' : money(p.assets)}</li>`).join('')}</ol>
      <div class="mbtns">${isHost ? '<button class="btn pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về sảnh</button>' : '<p>Chờ chủ phòng mở ván mới…</p>'}</div></div>`, '', 'win');
    const ag = $('#m-again'); if (ag) ag.onclick = () => { closeModal(); net.restart(); net.start(); };
    const lb = $('#m-lobby'); if (lb) lb.onclick = () => { closeModal(); net.restart(); };
  }, 900));
}

// ---------- đồng hồ ----------
let tEnd = 0, tPid = null, tIv = null;
function setTimer(t) {
  const el = $('#timer');
  if (!t) { tEnd = 0; el.style.display = 'none'; clearInterval(tIv); tIv = null; return; }
  tEnd = Date.now() + t.ms; tPid = t.pid; if (!tIv) tIv = setInterval(tick, 250); tick();
}
function tick() {
  const el = $('#timer'); if (!tEnd || !view) { el.style.display = 'none'; return; }
  const left = Math.max(0, Math.ceil((tEnd - Date.now()) / 1000)); const p = P(tPid);
  el.style.display = ''; el.classList.toggle('low', left <= 8);
  el.innerHTML = `⏳ ${tPid === myId ? 'Bạn' : esc(p ? p.name : '?')}: <b>${left}s</b>`;
}
if (location.hash === '#debug') window.__dbg = () => ({ net, view });
