// ♟️ Cờ tướng – giao diện. Luật ở engine.js, bot ở bot.js, mạng ở shared/net/simplenet.js, khung màn hình ở shared/ui/gamekit.js
import { makeNet } from '../../shared/net/simplenet.js?v=1';
import * as E from './engine.js?v=1';
import { botAction, botWants } from './bot.js?v=1';
import { masterMove, masterReady, masterOff } from './master.js?v=1';
import { PUZZLES } from './puzzles.js?v=1';
import { gameKit, $, $$, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=1';
import { confirmBox, promptBox, toast as tip } from '../../shared/ui/dialog.js?v=1';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=113';

const LV = { easy: ['🌱 Dễ', 'Mới tập chơi'], normal: ['⚔️ Vừa', 'Biết đánh, có sơ hở'], hard: ['🔥 Khó', 'Tính trước 4–5 nước'], master: ['👑 Đại sư', 'Động cơ Fairy-Stockfish'] };
const GLYPH = { han: { K: '帥', A: '仕', E: '相', R: '俥', H: '傌', C: '炮', P: '兵', k: '將', a: '士', e: '象', r: '車', h: '馬', c: '砲', p: '卒' }, viet: { K: 'Tướng', A: 'Sĩ', E: 'Tượng', R: 'Xe', H: 'Mã', C: 'Pháo', P: 'Tốt' } };
let style = ls.get('cotuong-style') === 'viet' ? 'viet' : 'han', sound = ls.get('cotuong-sound') !== '0';
const glyph = p => style === 'han' ? GLYPH.han[p] : GLYPH.viet[p.toUpperCase()];

// bot: mức Đại sư gọi động cơ ngoài (bất đồng bộ); lỗi thì lùi về mức Khó
async function botPlay(s, pid) {
  const me = s.players.find(p => p.id === pid);
  if (me && me.level === 'master' && s.phase === 'playing' && s.turn === me.side && !(s.undo && s.undo.by !== me.side) && !(s.offer && s.offer !== me.side)) {
    try { const mv = await masterMove(s.board, s.turn); if (mv && E.legalMoves(s.board, me.side, mv.from).includes(mv.from * 100 + mv.to)) return { type: 'move', ...mv }; } catch (e) {}
    return botAction({ ...s, players: s.players.map(p => p === me ? { ...p, level: 'hard' } : p) }, pid);
  }
  return botAction(s, pid);
}
const NET = makeNet({
  game: 'cotuong', min: 2, max: 2, maxSeats: 10, allowLocal: true, minMsg: 'Cờ tướng cần 2 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { first: 'host', level: 'normal' }, optOk: (k, v) => k in E.OPT_CHOICES && E.OPT_CHOICES[k].includes(v),
  create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: botWants, bot: botPlay, botDelay: () => 450 + Math.random() * 350,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Kẹo', 'Xôi'],
});

// ---------- âm thanh nhỏ ----------
let ac = null;
function beep(kind) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), F = { move: [420, 180, .09, 'triangle'], cap: [260, 90, .16, 'square'], check: [880, 1320, .22, 'sine'], end: [523, 1046, .5, 'sine'] }[kind];
    o.type = F[3]; o.frequency.setValueAtTime(F[0], t); o.frequency.exponentialRampToValueAtTime(F[1], t + F[2]);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'cap' ? .12 : .16, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + F[2] + .05);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + F[2] + .08);
  } catch (e) {}
}

// ---------- phòng chờ ----------
let botLevel = ls.get('cotuong-level') || 'normal';
function renderLobby(info, ui) {
  const host = ui.isHost ? ui.net.raw : null, seated = info.players.slice(0, 2), extra = info.players.slice(2);
  $('#pcount').textContent = `${Math.min(2, info.players.length)}/2`;
  const row = (p, i) => `<li class="${p.connected ? '' : 'off'}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${LV[p.level || info.opts.level][0]}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}${i > 1 ? ' <small>· xem</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  $('#plist').innerHTML = seated.map(row).join('') + extra.map((p, i) => row(p, i + 2)).join('');
  const bot = seated.find(p => p.isBot);
  $('#add-box').innerHTML = !ui.isHost ? '' : (seated.length < 2 || bot ? `<div class="opt"><b>🤖 Sức cờ của máy</b><div class="lv">${Object.entries(LV).map(([k, [n, d]]) => `<button type="button" data-lv="${k}" aria-pressed="${(bot ? bot.level : botLevel) === k}">${n}<small>${d}</small></button>`).join('')}</div></div>` : '')
    + (seated.length < 2 ? `<div class="row-btns"><button class="btn" id="btn-addbot">＋ Thêm máy</button><button class="btn" id="btn-addlocal">＋ Người chơi cùng máy</button></div>` : '');
  const o = info.opts, dis = ui.isHost ? '' : 'disabled';
  $('#opts').innerHTML = `<div class="opt"><b>🔴 Ai cầm quân Đỏ (đi trước)</b><div class="seg">${[['host', 'Chủ phòng'], ['guest', 'Người kia'], ['random', 'Ngẫu nhiên']].map(([v, n]) => `<button type="button" data-first="${v}" aria-pressed="${o.first === v}" ${dis}>${n}</button>`).join('')}</div></div>
    <div class="opt"><b>字 Chữ trên quân cờ</b><div class="seg"><button type="button" data-style="han" aria-pressed="${style === 'han'}">Chữ Hán 帥</button><button type="button" data-style="viet" aria-pressed="${style === 'viet'}">Chữ Việt (Tướng)</button></div><small>Chỉ đổi trên máy bạn. Trong ván bấm nút 字 để đổi nhanh.</small></div>
    <div class="opt"><small>Luật: chiếu bí hoặc hết nước đi là thua · không được để hai Tướng nhìn thẳng mặt nhau · chiếu lặp lại mãi (chiếu dai) bị xử thua · lặp thế cờ 3 lần là hoà.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = seated.length < 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
  $('#wait-msg').textContent = info.players.findIndex(p => p.id === ui.myId) > 1 ? 'Bàn đã đủ 2 kỳ thủ – bạn sẽ được xem ván đấu 👀' : 'Đang chờ chủ phòng bắt đầu…';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return; const h = ui.isHost ? ui.net.raw : null;
  if (b.dataset.style) { setStyle(b.dataset.style); renderLobby(ui.lobby, ui); return; }
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  if (b.dataset.first) h.setOpt('first', b.dataset.first);
  if (b.dataset.lv) { botLevel = b.dataset.lv; ls.set('cotuong-level', botLevel); if (botLevel !== 'master') masterOff(); const bot = h.players.find(p => p.isBot); if (bot) bot.level = botLevel; if (botLevel === 'master') warmMaster(); h.pushLobby(); }
  if (b.id === 'btn-addbot') { h.addBot({ level: botLevel }); if (botLevel === 'master') warmMaster(); }
  if (b.id === 'btn-addlocal') { const n = await promptBox('Hai người chuyền máy cho nhau, mỗi người một lượt.', { title: '👥 Tên người chơi thứ hai', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true }); if (n) h.addLocal(n); }
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();
async function warmMaster() { const ok = await masterReady(); if (ok === 'reload') return; if (!ok) tip('Máy này chưa chạy được mức Đại sư – máy sẽ đánh ở mức Khó nha.', 3600); }

// ---------- bàn cờ ----------
const boardEl = $('#board'); let sel = null, hints = [], pcs = new Map(), shownMoves = -1, shownGid = null, flip = false, endShown = null;
const GRID = (() => {
  let s = ''; const L = (x1, y1, x2, y2) => { s += `M${x1} ${y1}L${x2} ${y2}`; };
  for (let r = 0; r < 10; r++) L(50, 50 + r * 100, 850, 50 + r * 100);
  for (let c = 0; c < 9; c++) { if (c === 0 || c === 8) L(50 + c * 100, 50, 50 + c * 100, 950); else { L(50 + c * 100, 50, 50 + c * 100, 450); L(50 + c * 100, 550, 50 + c * 100, 950); } }
  L(350, 50, 550, 250); L(550, 50, 350, 250); L(350, 750, 550, 950); L(550, 750, 350, 950);
  let m = ''; const mark = (r, c) => { const x = 50 + c * 100, y = 50 + r * 100; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { if ((c === 0 && dx < 0) || (c === 8 && dx > 0)) continue; m += `M${x + dx * 26} ${y + dy * 10}L${x + dx * 10} ${y + dy * 10}L${x + dx * 10} ${y + dy * 26}`; } };
  [[2, 1], [2, 7], [7, 1], [7, 7], [3, 0], [3, 2], [3, 4], [3, 6], [3, 8], [6, 0], [6, 2], [6, 4], [6, 6], [6, 8]].forEach(([r, c]) => mark(r, c));
  return `<svg class="grid" viewBox="0 0 900 1000" aria-hidden="true"><path d="${s}" fill="none" stroke="var(--grid)" stroke-width="4" stroke-linecap="round"/><path d="${m}" fill="none" stroke="var(--grid)" stroke-width="3" stroke-linecap="round"/>
    <g class="river" fill="var(--grid)" opacity=".62" font-family="'Noto Serif CJK SC','Songti SC','Noto Serif SC',SimSun,serif" font-weight="800" font-size="62" text-anchor="middle"><text x="250" y="522">楚 河</text><text x="650" y="522">漢 界</text></g></svg>`;
})();
const pos = i => { let r = Math.floor(i / 9), c = i % 9; if (flip) { r = 9 - r; c = 8 - c; } return [(c + .5) / 9 * 100, (r + .5) / 10 * 100]; };
function buildBoard(v) {
  boardEl.innerHTML = GRID + Array.from({ length: 90 }, (_, i) => `<div class="sq" data-i="${i}"></div>`).join('');
  boardEl.classList.toggle('flip', flip);
  for (const q of $$('#board .sq')) { const [x, y] = pos(+q.dataset.i); q.style.left = x + '%'; q.style.top = y + '%'; }
  pcs = new Map(); v.board.forEach((p, i) => { if (p) addPiece(p, i); });
}
function addPiece(p, i) { const el = document.createElement('div'); el.className = `pc ${E.sideOf(p)} ${style === 'viet' ? 'vi' : ''}`; el.dataset.p = p; el.innerHTML = `<b>${glyph(p)}</b>`; const [x, y] = pos(i); el.style.left = x + '%'; el.style.top = y + '%'; boardEl.append(el); pcs.set(i, el); return el; }
function setStyle(s) { style = s; ls.set('cotuong-style', s); for (const el of pcs.values()) { el.classList.toggle('vi', s === 'viet'); el.firstChild.textContent = glyph(el.dataset.p); } if (ui.view) renderBars(ui.view); }
const turnPlayer = v => v.players.find(p => p.side === v.turn);
const canMove = v => v.phase === 'playing' && !v.spec && ui.controls(turnPlayer(v).id);
const actor = v => { const t = turnPlayer(v); if (ui.controls(t.id) && !t.isBot) return t; return v.players.find(p => ui.controls(p.id) && !p.isBot) || null; }; // người mình đang "cầm" để xin thua / cầu hoà
function banner(t) { const b = document.createElement('div'); b.className = 'banner'; b.textContent = t; boardEl.append(b); setTimeout(() => b.remove(), 1400); }

function render(v, prev) {
  const me = v.players.find(p => p.id === ui.myId), both = v.players.every(p => ui.controls(p.id));
  const wantFlip = !!(!both && me && me.side === 'b');
  if (shownGid !== v.gid || wantFlip !== flip || !boardEl.firstChild || v.nMoves < shownMoves || v.nMoves > shownMoves + 1) { flip = wantFlip; buildBoard(v); shownGid = v.gid; sel = null; if (v.nMoves < shownMoves) beep('move'); }
  else if (v.nMoves === shownMoves + 1) { // đúng 1 nước mới: cho quân trượt đi
    const m = v.moves[v.moves.length - 1], el = pcs.get(m.from), dead = pcs.get(m.to);
    if (dead) { dead.classList.add('gone'); setTimeout(() => dead.remove(), 220); }
    if (el) { pcs.delete(m.from); pcs.set(m.to, el); const [x, y] = pos(m.to); el.style.left = x + '%'; el.style.top = y + '%'; }
    sel = null; beep(m.cap ? 'cap' : 'move');
    if (v.phase === 'playing' && m.check) { setTimeout(() => beep('check'), 160); banner('Chiếu!'); }
  }
  shownMoves = v.nMoves;
  // đánh dấu: nước vừa đi, quân đang chọn, gợi ý, Tướng bị chiếu
  const last = v.moves[v.moves.length - 1];
  for (const q of $$('#board .sq')) { const i = +q.dataset.i; q.className = 'sq' + (last && (i === last.from || i === last.to) ? ' last' : '') + (hints.includes(i) && sel != null ? ' hint' + (v.board[i] ? ' cap' : '') : ''); }
  const kq = v.check && v.phase === 'playing' ? E.kingSq(v.board, v.turn) : -1;
  for (const [i, el] of pcs) { el.classList.toggle('sel', i === sel); el.classList.toggle('chk', i === kq); }
  renderBars(v);
  if (v.phase === 'ended' && endShown !== v.gid) { endShown = v.gid; beep('end'); setTimeout(() => showEnd(v), 700); }
  if (v.phase === 'playing') endShown = null;
}
function renderBars(v) {
  const tp = turnPlayer(v), bottomSide = flip ? 'b' : 'r';
  const bar = (side, el) => {
    const p = v.players.find(x => x.side === side), on = v.phase === 'playing' && v.turn === side, caps = v.caps[side];
    el.className = `pbar ${el.id === 'p-top' ? 'top' : 'bottom'}${on ? ' turn-on' : ''}${on && p.isBot ? ' thinking' : ''}`;
    el.innerHTML = `${avatar(p.name, 34)}<span class="side ${side}"></span><span class="nm">${esc(cleanName(p.name))}<small>${side === 'r' ? 'Quân Đỏ' : 'Quân Đen'}${p.isBot ? ' · máy ' + LV[p.level][0] : ''}${(v.away || []).includes(p.id) ? ' · mất kết nối' : ''}</small></span><span class="think">đang nghĩ…</span>
      <span class="caps">${caps.map(c => `<span class="${E.sideOf(c)} ${style === 'viet' ? 'vi' : ''}">${style === 'han' ? GLYPH.han[c] : GLYPH.viet[c.toUpperCase()].slice(0, 2)}</span>`).join('')}</span>`;
  };
  bar(bottomSide === 'r' ? 'b' : 'r', $('#p-top')); bar(bottomSide, $('#p-bot'));
  const t = $('#turn'), mine = canMove(v);
  t.className = 'turn' + (mine ? ' me' : '');
  t.innerHTML = v.phase === 'ended' ? '🏁 Hết ván' : `<i class="${v.turn}"></i>${v.puzzle && mine ? `🧩 Chiếu bí trong ${v.puzzle.n} nước` : mine ? (v.players.every(p => ui.controls(p.id) && !p.isBot) ? `Lượt ${esc(cleanName(tp.name))}` : 'Tới lượt bạn') : `Lượt ${esc(cleanName(tp.name))}`}${v.check ? ' · bị chiếu!' : ''}`;
  // nút hành động
  const a = actor(v), opp = a && v.players.find(p => p !== a), box = $('#acts');
  if (v.spec || !a) { box.innerHTML = ''; return; }
  if (v.phase === 'ended') { box.innerHTML = ui.isHost ? `<button class="btn pri" data-a="again">🔁 ${v.puzzle ? 'Thử lại' : 'Ván mới (đổi màu quân)'}</button><button class="btn" data-a="lobby">${v.puzzle ? '🧩 Cờ thế khác' : 'Về phòng chờ'}</button>` : '<p class="wait" style="margin:4px">Chờ chủ phòng mở ván mới…</p>'; return; }
  if (v.offer && v.offer !== a.side && ui.controls(a.id)) { box.innerHTML = `<button class="btn pri" data-a="draw">🤝 Đồng ý hoà</button><button class="btn" data-a="drawNo">Đánh tiếp</button>`; return; }
  if (v.undo && v.undo.by !== a.side) { box.innerHTML = `<button class="btn pri" data-a="undoOk">↩️ Cho đi lại</button><button class="btn" data-a="undoNo">Không cho</button>`; return; }
  box.innerHTML = `<button class="btn sm" data-a="undo" ${v.nMoves ? '' : 'disabled'}>↩️ ${v.undo ? 'Đang xin…' : 'Đi lại'}</button><button class="btn sm" data-a="draw" ${v.puzzle ? 'disabled' : ''}>🤝 ${v.offer === a.side ? 'Đã cầu hoà' : 'Cầu hoà'}</button><button class="btn sm" data-a="resign">🏳️ Xin thua</button>`;
}
boardEl.addEventListener('click', e => {
  const q = e.target.closest('.sq'), v = ui.view; if (!q || !v || !canMove(v)) return;
  const i = +q.dataset.i, p = v.board[i], side = v.turn;
  if (sel != null && hints.includes(i)) { const from = sel; sel = null; hints = []; ui.actAs(turnPlayer(v).id, { type: 'move', from, to: i }); if (ui.view === v) render(v); /* chủ phòng: nước đi đã vẽ xong ngay trong actAs, đừng vẽ lại bàn cũ */ return; }
  if (p && E.sideOf(p) === side) { sel = i; hints = E.legalMoves(v.board.slice(), side, i).map(m => m % 100); if (!hints.length) tip(v.check ? 'Đang bị chiếu – quân này không giải chiếu được.' : 'Quân này đang kẹt, không đi được.', 1800); }
  else { sel = null; hints = []; }
  render(v);
});
$('#acts').addEventListener('click', async e => {
  const b = e.target.closest('button[data-a]'), v = ui.view; if (!b || !v) return; const k = b.dataset.a, a = actor(v);
  if (k === 'again') { const h = ui.net.raw; if (v.puzzle) return startPuzzle(PUZZLES.find(p => p.id === v.puzzle.id)); h.restart(); h.setOpt('first', v.players[0].side === 'r' ? 'guest' : 'host'); h.start(); return; }
  if (k === 'lobby') { if (v.puzzle) { ui.leave(); openPuzzles(); } else ui.net.raw.restart(); return; }
  if (!a) return;
  if (k === 'resign' && !(await confirmBox('Ván này sẽ tính là thua.', { title: '🏳️ Xin thua?', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true }))) return;
  ui.actAs(a.id, { type: k });
});
function showEnd(v) {
  if (ui.view !== v && (!ui.view || ui.view.gid !== v.gid || ui.view.phase !== 'ended')) return;
  const w = v.players.find(p => p.id === v.winner), mine = v.players.filter(p => ui.controls(p.id) && !p.isBot), iWon = w && mine.length === 1 && mine[0].id === w.id, iLost = w && mine.length === 1 && mine[0].id !== w.id;
  let extra = '', nextPz = null;
  if (v.puzzle) { const ok = w && w.id === 'host' && Math.ceil(v.nMoves / 2) <= v.puzzle.n; if (ok) { const d = solved(); d[v.puzzle.id] = 1; ls.set('cotuong-pz', JSON.stringify(d)); nextPz = PUZZLES[PUZZLES.findIndex(x => x.id === v.puzzle.id) + 1] || null; } extra = `<p style="text-align:center">${ok ? `🎉 Giải đúng trong ${Math.ceil(v.nMoves / 2)} nước!` : w && w.id === 'host' ? `Thắng rồi, nhưng đề yêu cầu chiếu bí trong <b>${v.puzzle.n}</b> nước. Thử lại nha!` : 'Chưa đúng – thử lại nha 💪'}</p>`; }
  ui.openModal(`<h2>${!w ? '🤝 Hoà cờ' : iWon ? '🏆 Bạn thắng!' : iLost ? '😵 Bạn thua rồi' : `🏆 ${esc(cleanName(w.name))} thắng`}</h2><p style="text-align:center;color:var(--muted);font-weight:800">${E.RESULT_TEXT[v.result.kind] || ''} · ${v.nMoves} nước</p>${extra}<div class="btns">${nextPz ? '<button class="btn pri" id="m-next">🧩 Bài tiếp theo</button>' : ''}<button class="btn" id="m-close">Xem lại bàn cờ</button></div>`);
  $('#m-close').onclick = ui.closeModal;
  if (nextPz) $('#m-next').onclick = () => { ui.closeModal(); ui.leave(); startPuzzle(nextPz); };
}
// ---------- biên bản, luật ----------
$('#btn-moves').onclick = () => { const v = ui.view; if (!v) return; const rows = []; for (let i = 0; i < v.moves.length; i += 2) rows.push(`<i>${i / 2 + 1}.</i><span>${esc(v.moves[i].text)}${v.moves[i].check ? ' +' : ''}</span><span>${v.moves[i + 1] ? esc(v.moves[i + 1].text) + (v.moves[i + 1].check ? ' +' : '') : ''}</span>`); ui.openModal(`<h2>📜 Biên bản</h2>${rows.length ? `<div class="mv-list"><i></i><b style="color:var(--red)">Đỏ</b><b>Đen</b>${rows.join('')}</div>` : '<p style="text-align:center">Chưa có nước nào.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`); $('#m-close').onclick = ui.closeModal; const l = $('.mv-list'); if (l) l.scrollTop = l.scrollHeight; };
function openGuide() {
  const r = (k, t) => `<span>${GLYPH.han[k]}</span><div><b>${GLYPH.viet[k]}</b> – ${t}</div>`;
  ui.openModal(`<h2>📖 Luật Cờ tướng</h2><div class="rules"><p><b>Mục tiêu:</b> chiếu bí Tướng đối phương. Đỏ đi trước, mỗi lượt đi một quân. Quân đứng ở <b>giao điểm</b> các đường kẻ.</p>
    <h3>Cách đi từng quân</h3><div class="pcs">${r('K', 'đi 1 bước ngang/dọc, chỉ trong cung (ô 3×3 có gạch chéo).')}${r('A', 'đi chéo 1 bước, chỉ trong cung.')}${r('E', 'đi chéo đúng 2 bước ("điền"), không được qua sông; có quân đứng giữa đường chéo thì bị cản.')}${r('R', 'đi thẳng ngang/dọc bao xa cũng được, không nhảy qua quân.')}${r('H', 'đi hình chữ L (1 thẳng + 1 chéo). Có quân đứng sát ngay hướng đi thẳng thì bị <b>cản chân</b>.')}${r('C', 'đi như Xe; nhưng muốn <b>ăn</b> quân thì phải nhảy qua đúng 1 quân (gọi là ngòi).')}${r('P', 'đi thẳng 1 bước, không lùi. Qua sông rồi thì được đi ngang.')}</div>
    <h3>Luật cần nhớ</h3><ul><li>Hai Tướng <b>không được nhìn thẳng mặt nhau</b> trên cùng một cột mà không có quân che.</li><li>Bị chiếu thì phải giải chiếu ngay. <b>Hết nước đi</b> (kể cả khi không bị chiếu) là thua.</li><li><b>Chiếu dai</b> (chiếu lặp đi lặp lại mãi) bị xử thua. Lặp lại một thế cờ 3 lần thì hoà.</li><li>60 nước mỗi bên không ai ăn quân thì hoà.</li></ul>
    <h3>Mẹo cho người mới</h3><ul><li>Bấm vào quân của mình: chấm xanh là chỗ đi được, vòng đỏ là quân ăn được.</li><li>Chưa quen chữ Hán? Bấm nút <b>字</b> để đổi sang chữ Việt.</li><li>Chơi với máy được <b>đi lại</b> thoải mái.</li></ul></div><div class="btns"><button class="btn pri" id="m-close">Đã hiểu</button></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
$('#btn-style').onclick = () => setStyle(style === 'han' ? 'viet' : 'han');
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('cotuong-sound', sound ? '1' : '0'); drawSound(); beep('move'); };
$('#btn-news-home').onclick = () => openNews('cotuong'); newsBadge($('#btn-news-home'), 'cotuong');

// ---------- cờ thế ----------
const solved = () => { try { return JSON.parse(ls.get('cotuong-pz')) || {}; } catch (e) { return {}; } };
function openPuzzles() {
  const d = solved();
  ui.openModal(`<h2>🧩 Cờ thế</h2><p style="text-align:center;color:var(--muted)">Bạn cầm quân Đỏ, đi trước. Chiếu bí trong số nước đề cho.</p><div class="pz-grid">${PUZZLES.map((p, i) => `<button type="button" data-pz="${p.id}" class="${d[p.id] ? 'done' : ''}">${d[p.id] ? '✅' : '🧩'} Bài ${i + 1}<small>${esc(p.name)} · ${p.n} nước</small></button>`).join('')}</div><div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
  $('.pz-grid').onclick = e => { const b = e.target.closest('[data-pz]'); if (b) { ui.closeModal(); startPuzzle(PUZZLES.find(p => p.id === b.dataset.pz)); } };
}
function startPuzzle(pz) {
  if (!pz) return; const h = ui.startHost(true, true);
  h.addBot({ level: 'hard' }); h.start({ first: 'host', setup: pz.rows.join('').split('').map(c => c === '.' ? '' : c), puzzle: { id: pz.id, name: pz.name, n: pz.n } });
}
$('#btn-puzzle').onclick = openPuzzles;

const ui = gameKit({
  game: 'cotuong', net: NET,
  offline: h => h.addBot({ level: botLevel }),
  onLobby: (info, ui2) => renderLobby(info, ui2),
  onState: (v, prev) => { if (!v) { sel = null; hints = []; shownMoves = -1; shownGid = null; return; } if (prev && prev.seq !== v.seq) { /* trạng thái mới: bỏ gợi ý cũ nếu hết lượt */ if (!canMove(v)) { sel = null; hints = []; } } render(v, prev); },
});
if (location.hash === '#debug') window.__dbg = () => ({ ui, E });
