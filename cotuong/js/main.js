// ♟️ Cờ tướng – giao diện. Luật ở engine.js, bot ở bot.js, mạng ở shared/net/simplenet.js, khung màn hình ở shared/ui/gamekit.js
import { makeNet } from '../../shared/net/simplenet.js?v=10';
import * as E from './engine.js?v=1';
import { botAction, botWants } from './bot.js?v=1';
import { masterMove, masterReady, masterOff } from './master.js?v=1';
import { PUZZLES } from './puzzles.js?v=1';
import { today, state as dailyState, markSolved } from './today.js?v=1';
import { gameKit, $, $$, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=3';
import { confirmBox, promptBox, toast as tip } from '../../shared/ui/dialog.js?v=1';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=136';

const LV = { easy: ['🌱 Dễ', 'Mới tập chơi'], normal: ['⚔️ Vừa', 'Biết đánh, có sơ hở'], hard: ['🔥 Khó', 'Tính trước 4–5 nước'], master: ['👑 Đại sư', 'Động cơ Fairy-Stockfish'] };
const GLYPH = { han: { K: '帥', A: '仕', E: '相', R: '俥', H: '傌', C: '炮', P: '兵', k: '將', a: '士', e: '象', r: '車', h: '馬', c: '砲', p: '卒' }, viet: { K: 'Tướng', A: 'Sĩ', E: 'Tượng', R: 'Xe', H: 'Mã', C: 'Pháo', P: 'Tốt' } };
let style = ['han', 'viet', 'pic'].includes(ls.get('cotuong-style')) ? ls.get('cotuong-style') : 'han', sound = ls.get('cotuong-sound') !== '0';
// quân cờ bằng hình (tự vẽ, một màu theo phe): Tướng = vương miện, Sĩ = khiên, Tượng = voi, Xe = bánh xe, Mã = ngựa, Pháo = khẩu pháo, Tốt = nón lá
const PIC = {
  K: '<path d="M14 70 8 30l22 16 20-28 20 28 22-16-6 40z"/><rect x="14" y="76" width="72" height="10" rx="4"/>',
  A: '<path fill-rule="evenodd" d="M50 10 84 22v26c0 22-14 35-34 42-20-7-34-20-34-42V22zm0 22-6 12-13 2 9 9-2 13 12-6 12 6-2-13 9-9-13-2z"/>',
  E: '<circle cx="22" cy="40" r="17"/><circle cx="78" cy="40" r="17"/><path d="M30 38c0-14 9-22 20-22s20 8 20 22c0 12-5 20-10 25v13c0 9-6 14-13 12-5-1-7-6-5-9 3 2 7 1 7-4V63c-11-3-19-12-19-25z"/><path d="M34 60c-3 6-3 12 0 16 2-4 5-8 8-10zM66 60c3 6 3 12 0 16-2-4-5-8-8-10z"/>',
  R: '<path fill-rule="evenodd" d="M50 10a40 40 0 1 1 0 80 40 40 0 0 1 0-80zm0 11a29 29 0 1 0 0 58 29 29 0 0 0 0-58z"/><circle cx="50" cy="50" r="9"/><path d="M47 20h6v60h-6zM20 47h60v6H20z"/><path d="M27.5 31.700 31.700 27.500 72.500 68.300 68.300 72.500zM68.300 27.500 72.500 31.700 31.700 72.500 27.500 68.300z"/>',
  H: '<path d="M26 88c1-16 8-24 15-33-8 3-13 9-19 7-5-2-7-8-3-13 7-9 13-17 16-27l6-12 7 9c18 3 30 18 31 40 1 11-1 21-4 29z"/>',
  C: '<path d="M10 52 62 22l12 20-52 30z"/><path fill-rule="evenodd" d="M40 54a18 18 0 1 1 0 36 18 18 0 0 1 0-36zm0 10a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"/><circle cx="84" cy="20" r="7"/>',
  P: '<path d="M50 12 6 54c14 6 74 6 88 0z"/><path d="M28 62c0 16 9 27 22 27s22-11 22-27c-14 3-30 3-44 0z"/>',
};
const picSvg = p => `<svg viewBox="0 0 100 100" aria-hidden="true">${PIC[p.toUpperCase()]}</svg>`;
// kiểu chữ Hán (Google Fonts, giấy phép mở – chỉ tải đúng 18 chữ cần dùng). noMa: phông thiếu chữ 傌 → quân Mã đỏ dùng chữ 馬
const FONTS = [['tong', 'Tống', 'Noto Serif TC', 900], ['khai', 'Khải', 'LXGW WenKai TC', 700], ['but', 'Bút lông', 'Yuji Syuku', 400, 1], ['hac', 'Nét đậm', 'Noto Sans TC', 900], ['co', 'Cổ điển', 'Cactus Classical Serif', 400], ['tay', 'Viết tay', 'Iansui', 400], ['tron', 'Bo tròn', 'Chiron GoRound TC', 900]];
let font = FONTS.find(f => f[0] === ls.get('cotuong-font')) || FONTS[0];
const fontCss = f => `"${f[2]}","Noto Serif TC","Noto Serif CJK TC","Songti TC",SimSun,"PMingLiU",serif`;
const applyFont = () => { document.body.style.setProperty('--pcfont', fontCss(font)); document.body.style.setProperty('--pcw', font[3]); document.body.style.setProperty('--pcstroke', font[3] < 700 ? '.04em' : '0'); /* phông nét mảnh: tô đậm thêm cho dễ đọc */ }; applyFont();
const han = p => p === 'H' && font[4] ? '馬' : GLYPH.han[p];
const glyph = p => style === 'pic' ? picSvg(p) : style === 'han' ? han(p) : GLYPH.viet[p.toUpperCase()];
const STYLE_CLS = () => style === 'viet' ? 'vi' : style === 'pic' ? 'pic' : '';
const STYLE_SEG = () => `<div class="seg"><button type="button" data-style="han" aria-pressed="${style === 'han'}">Chữ Hán 帥</button><button type="button" data-style="viet" aria-pressed="${style === 'viet'}">Chữ Việt</button><button type="button" data-style="pic" aria-pressed="${style === 'pic'}">Hình vẽ 👑</button></div>`;

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
// Tiếng quân cờ tổng hợp theo CHẤT LIỆU của theme: một cú gõ = tiếng chạm (nhiễu lọc, rất ngắn) + vài tần số ngân riêng của vật liệu.
// [tần số ngân (Hz)], thời gian ngân (s), [lọc nhiễu: kiểu, Hz], độ dài tiếng chạm (s), âm lượng chạm, âm lượng ngân
const MATERIAL = {
  go: { modes: [430, 960, 1620], ring: .08, noise: ['lowpass', 1500], hit: .03, nGain: .32, mGain: .22 },   /* gỗ sáng: "cạch" ấm, tắt nhanh */
  mun: { modes: [290, 660, 1250], ring: .1, noise: ['lowpass', 1150], hit: .035, nGain: .36, mGain: .28 },    /* gỗ mun đặc: trầm, chắc */
  ngoc: { modes: [1500, 2380, 3700], ring: .18, noise: ['bandpass', 2200], hit: .014, nGain: .1, mGain: .16 }, /* ngọc: "keng" trong, ngân dài */
  giay: { modes: [190, 420], ring: .05, noise: ['lowpass', 850], hit: .06, nGain: .5, mGain: .16 },          /* quân dẹt trên giấy: "bộp" êm */
  da: { modes: [820, 1750, 2700], ring: .05, noise: ['bandpass', 1900], hit: .018, nGain: .3, mGain: .18 }, /* đá: "tách" sắc, khô */
  dao: { modes: [1250, 1950, 3050], ring: .12, noise: ['bandpass', 1700], hit: .016, nGain: .12, mGain: .15 }, /* sứ: "tinh" nhẹ */
  dem: { modes: [1050, 1580, 2110], ring: .26, noise: ['bandpass', 2400], hit: .012, nGain: .05, mGain: .14 }, /* pha lê: ngân lâu như chuông gió */
};
let noiseBuf = null;
function knock(m, at, gain = 1, pitch = 1) {
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * .12, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const out = ac.createGain(), soft = ac.createBiquadFilter(); out.gain.value = gain * .45; /* chừa khoảng để 2 tiếng chồng nhau không vỡ */ soft.type = 'lowpass'; soft.frequency.value = 3800; soft.Q.value = .5; /* cắt bớt tần số cao cho đỡ chói tai */ out.connect(soft).connect(ac.destination);
  const n = ac.createBufferSource(), f = ac.createBiquadFilter(), ng = ac.createGain(); n.buffer = noiseBuf; f.type = m.noise[0]; f.frequency.value = m.noise[1] * pitch; f.Q.value = .6;
  ng.gain.setValueAtTime(m.nGain, at); ng.gain.exponentialRampToValueAtTime(.0001, at + m.hit); n.connect(f).connect(ng).connect(out); n.start(at); n.stop(at + m.hit + .02);
  m.modes.forEach((hz, i) => { const o = ac.createOscillator(), g = ac.createGain(), len = m.ring / (1 + i * .7); o.type = 'sine'; o.frequency.setValueAtTime(hz * pitch * 1.03, at); o.frequency.exponentialRampToValueAtTime(hz * pitch, at + .02);
    g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(m.mGain / (1 + i * 1.1), at + .007); g.gain.exponentialRampToValueAtTime(.0001, at + len + .01); o.connect(g).connect(out); o.start(at); o.stop(at + len + .03); });
}
function beep(kind) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime, m = MATERIAL[document.body.dataset.theme] || MATERIAL.go;
    if (kind === 'pick') return knock(m, t, .35, 1.35);                                   /* nhấc quân: chạm khẽ */
    if (kind === 'move') return knock(m, t, 1, 1);                                        /* đặt quân xuống bàn */
    if (kind === 'cap') { knock(m, t, 1.1, .9); knock(m, t + .075, .45, 1.12); return; } /* ăn quân: đập mạnh + quân bị ăn văng ra */
    const o = ac.createOscillator(), g = ac.createGain(), F = { check: [660, 990, .22, 'sine'], end: [440, 880, .5, 'sine'] }[kind]; if (!F) return;
    o.type = F[3]; o.frequency.setValueAtTime(F[0], t); o.frequency.exponentialRampToValueAtTime(F[1], t + F[2]);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.09, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + F[2] + .05);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + F[2] + .08);
  } catch (e) {}
}

// ---------- phòng chờ ----------
let botLevel = ls.get('cotuong-level') || 'normal';
function renderLobby(info, ui) {
  const host = ui.isHost && ui.net ? ui.net.raw : null, seated = info.players.slice(0, 2), extra = info.players.slice(2);
  $('#pcount').textContent = `${Math.min(2, info.players.length)}/2`;
  const row = (p, i) => `<li class="${p.connected ? '' : 'off'}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${LV[p.level || info.opts.level][0]}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}${i > 1 ? ' <small>· xem</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  $('#plist').innerHTML = seated.map(row).join('') + extra.map((p, i) => row(p, i + 2)).join('');
  const bot = seated.find(p => p.isBot);
  $('#add-box').innerHTML = !ui.isHost ? '' : (seated.length < 2 || bot ? `<div class="opt"><b>🤖 Sức cờ của máy</b><div class="lv">${Object.entries(LV).map(([k, [n, d]]) => `<button type="button" data-lv="${k}" aria-pressed="${(bot ? bot.level : botLevel) === k}">${n}<small>${d}</small></button>`).join('')}</div></div>` : '')
    + (seated.length < 2 ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button><button class="btn" id="btn-addlocal">+ Người chơi cùng máy</button></div>` : '');
  const o = info.opts, dis = ui.isHost ? '' : 'disabled';
  $('#opts').innerHTML = `<div class="opt"><b>🔴 Ai cầm quân Đỏ (đi trước)</b><div class="seg">${[['host', 'Chủ phòng'], ['guest', 'Người kia'], ['random', 'Ngẫu nhiên']].map(([v, n]) => `<button type="button" data-first="${v}" aria-pressed="${o.first === v}" ${dis}>${n}</button>`).join('')}</div></div>
    <div class="opt"><b>字 Mặt quân cờ</b>${STYLE_SEG()}<small>Chưa quen chữ Hán thì chọn Chữ Việt hoặc Hình vẽ. Chỉ đổi trên máy bạn.</small></div>
    <div class="opt"><b>🎨 Giao diện bàn cờ</b><div class="row-btns"><button type="button" class="btn sm" id="btn-theme-lobby">${(THEMES.find(t => t[0] === theme) || THEMES[0])[1]} · đổi…</button></div><small>7 kiểu bàn, 7 kiểu chữ Hán. Trong ván bấm nút 🎨 để đổi.</small></div>
    <div class="opt"><small>Luật: chiếu bí hoặc hết nước đi là thua · không được để hai Tướng nhìn thẳng mặt nhau · chiếu lặp lại mãi (chiếu dai) bị xử thua · lặp thế cờ 3 lần là hoà.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = seated.length < 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
  $('#wait-msg').textContent = info.players.findIndex(p => p.id === ui.myId) > 1 ? 'Bàn đã đủ 2 kỳ thủ – bạn sẽ được xem ván đấu 👀' : 'Đang chờ chủ phòng bắt đầu…';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return; const h = ui.isHost ? ui.net.raw : null;
  if (b.dataset.style) { setStyle(b.dataset.style); renderLobby(ui.lobby, ui); return; }
  if (b.id === 'btn-theme-lobby') { openTheme(); return; }
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
    <g class="river" fill="var(--grid)" style="opacity:var(--river);font-family:var(--pcfont);font-weight:var(--pcw)" font-size="62" text-anchor="middle"><text x="250" y="522">楚 河</text><text x="650" y="522">漢 界</text></g></svg>`;
})();
const pos = i => { let r = Math.floor(i / 9), c = i % 9; if (flip) { r = 9 - r; c = 8 - c; } return [(c + .5) / 9 * 100, (r + .5) / 10 * 100]; };
function buildBoard(v) {
  boardEl.innerHTML = GRID + Array.from({ length: 90 }, (_, i) => `<div class="sq" data-i="${i}"></div>`).join('');
  boardEl.classList.toggle('flip', flip);
  for (const q of $$('#board .sq')) { const [x, y] = pos(+q.dataset.i); q.style.left = x + '%'; q.style.top = y + '%'; }
  pcs = new Map(); v.board.forEach((p, i) => { if (p) addPiece(p, i); });
}
function addPiece(p, i) { const el = document.createElement('div'); el.className = `pc ${E.sideOf(p)} ${STYLE_CLS()}`; el.dataset.p = p; el.innerHTML = `<b>${glyph(p)}</b>`; const [x, y] = pos(i); el.style.left = x + '%'; el.style.top = y + '%'; boardEl.append(el); pcs.set(i, el); return el; }
function setStyle(s) { style = s; ls.set('cotuong-style', s); for (const el of pcs.values()) { el.classList.toggle('vi', s === 'viet'); el.classList.toggle('pic', s === 'pic'); el.firstChild.innerHTML = glyph(el.dataset.p); } if (ui.view) renderBars(ui.view); }
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
      <span class="caps">${caps.map(c => `<span class="${E.sideOf(c)} ${STYLE_CLS()}">${style === 'viet' ? GLYPH.viet[c.toUpperCase()].slice(0, 2) : glyph(c)}</span>`).join('')}</span>`;
  };
  bar(bottomSide === 'r' ? 'b' : 'r', $('#p-top')); bar(bottomSide, $('#p-bot'));
  const t = $('#turn'), mine = canMove(v);
  t.className = 'turn' + (mine ? ' me' : '');
  t.innerHTML = v.phase === 'ended' ? '🏁 Hết ván' : `${v.puzzle && mine ? '' : `<i class="${v.turn}"></i>`}<span title="${v.puzzle ? `Chiếu bí trong ${v.puzzle.n} nước` : ''}">${v.puzzle && mine ? `🧩 Bí ${v.puzzle.n} nước` : mine ? (v.players.every(p => ui.controls(p.id) && !p.isBot) ? `Lượt ${esc(cleanName(tp.name))}` : 'Tới lượt bạn') : `Lượt ${esc(cleanName(tp.name))}`}${v.check ? ' · bị chiếu!' : ''}</span>`;
  // nút hành động
  const a = actor(v), opp = a && v.players.find(p => p !== a), box = $('#acts');
  if (v.spec || !a) { box.innerHTML = ''; return; }
  if (v.phase === 'ended') { box.innerHTML = ui.isHost ? `<button class="btn pri" data-a="again">🔁 ${v.puzzle ? 'Thử lại' : 'Ván mới (đổi màu quân)'}</button><button class="btn" data-a="lobby">${v.puzzle ? '🧩 Cờ thế khác' : 'Về phòng chờ'}</button>` : '<p class="wait" style="margin:4px">Chờ chủ phòng mở ván mới…</p>'; return; }
  if (v.offer && v.offer !== a.side && ui.controls(a.id)) { box.innerHTML = `<button class="btn pri" data-a="draw">🤝 Đồng ý hoà</button><button class="btn" data-a="drawNo">Đánh tiếp</button>`; return; }
  if (v.undo && v.undo.by !== a.side) { box.innerHTML = `<button class="btn pri" data-a="undoOk">↩️ Cho đi lại</button><button class="btn" data-a="undoNo">Không cho</button>`; return; }
  box.innerHTML = `<button class="btn sm" data-a="undo" ${v.nMoves ? '' : 'disabled'}>↩️ ${v.undo ? 'Đang xin…' : 'Đi lại'}</button>${v.puzzle ? '<button class="btn sm" data-a="hint">💡 Gợi ý</button>' : `<button class="btn sm" data-a="draw">🤝 ${v.offer === a.side ? 'Đã cầu hoà' : 'Cầu hoà'}</button>`}<button class="btn sm" data-a="resign">🏳️ Xin thua</button>`;
}
// 💡 Gợi ý cờ thế: bấm lần 1 chỉ quân cần đi, lần 2 chỉ luôn ô đến (tự tìm nước chiếu bí từ thế đang có)
let hintAt = null;
function mateMove(b, n) {
  const mv = (m, fn) => { const f = Math.floor(m / 100), t = m % 100, cap = b[t]; b[t] = b[f]; b[f] = ''; const r = fn(); b[f] = b[t]; b[t] = cap; return r; };
  const forced = n => { for (const m of E.legalMoves(b, 'r')) if (mv(m, () => E.inCheck(b, 'b') && E.legalMoves(b, 'b').every(x => mv(x, () => n > 1 && forced(n - 1) != null)))) return m; return null; };
  for (let k = 1; k <= n; k++) { const m = forced(k); if (m != null) return m; }
  return null;
}
function showHint(v) {
  if (!v.puzzle || !canMove(v)) return;
  const left = v.puzzle.n - Math.floor(v.nMoves / 2), m = mateMove(v.board.slice(), Math.max(1, left));
  if (m == null) { tip('Thế này không còn chiếu bí kịp nữa – bấm ↩️ Đi lại để thử hướng khác nha'); return; }
  const from = Math.floor(m / 100), to = m % 100, again = hintAt === v.seq + ':' + from;
  sel = from; hints = again ? [to] : E.legalMoves(v.board.slice(), 'r', from).map(x => x % 100); hintAt = v.seq + ':' + from;
  render(v); tip(again ? `💡 Đi ${E.NAME[v.board[from].toUpperCase()]} tới ô đang sáng` : `💡 Thử đi quân ${E.NAME[v.board[from].toUpperCase()]} đang chọn – bấm Gợi ý lần nữa để xem ô đến`);
}
boardEl.addEventListener('click', e => {
  const q = e.target.closest('.sq'), v = ui.view; if (!q || !v || !canMove(v)) return;
  const i = +q.dataset.i, p = v.board[i], side = v.turn;
  if (sel != null && hints.includes(i)) { const from = sel; sel = null; hints = []; ui.actAs(turnPlayer(v).id, { type: 'move', from, to: i }); if (ui.view === v) render(v); /* chủ phòng: nước đi đã vẽ xong ngay trong actAs, đừng vẽ lại bàn cũ */ return; }
  if (p && E.sideOf(p) === side) { sel = i; beep('pick'); hints = E.legalMoves(v.board.slice(), side, i).map(m => m % 100); if (!hints.length) tip(v.check ? 'Đang bị chiếu – quân này không giải chiếu được.' : 'Quân này đang kẹt, không đi được.', 1800); }
  else { sel = null; hints = []; }
  render(v);
});
$('#acts').addEventListener('click', async e => {
  const b = e.target.closest('button[data-a]'), v = ui.view; if (!b || !v) return; const k = b.dataset.a, a = actor(v);
  if (k === 'again') { const h = ui.net.raw; if (v.puzzle) return v.puzzle.daily ? startDaily() : startPuzzle(PUZZLES.find(p => p.id === v.puzzle.id)); h.restart(); h.setOpt('first', v.players[0].side === 'r' ? 'guest' : 'host'); h.start(); return; }
  if (k === 'lobby') { if (v.puzzle) { ui.leave(); openPuzzles(); } else ui.net.raw.restart(); return; }
  if (!a) return;
  if (k === 'hint') return showHint(v);
  if (k === 'resign' && !(await confirmBox('Ván này sẽ tính là thua.', { title: '🏳️ Xin thua?', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true }))) return;
  ui.actAs(a.id, { type: k });
});
function showEnd(v) {
  if (ui.view !== v && (!ui.view || ui.view.gid !== v.gid || ui.view.phase !== 'ended')) return;
  const w = v.players.find(p => p.id === v.winner), mine = v.players.filter(p => ui.controls(p.id) && !p.isBot), iWon = w && mine.length === 1 && mine[0].id === w.id, iLost = w && mine.length === 1 && mine[0].id !== w.id;
  let extra = '', nextPz = null;
  let daily = null;
  if (v.puzzle) { const ok = w && w.id === 'host' && Math.ceil(v.nMoves / 2) <= v.puzzle.n; if (ok && v.puzzle.daily) daily = markSolved(v.puzzle.daily); if (ok && !v.puzzle.daily) { const d = solved(); d[v.puzzle.id] = 1; ls.set('cotuong-pz', JSON.stringify(d)); nextPz = PUZZLES[PUZZLES.findIndex(x => x.id === v.puzzle.id) + 1] || null; } extra = `<p style="text-align:center">${ok && daily ? `🎉 Giải xong Cờ thế hôm nay!<br>🔥 Chuỗi <b>${daily.streak}</b> ngày liên tiếp${daily.best > daily.streak ? ` (kỷ lục ${daily.best})` : ''}` : ok ? `🎉 Giải đúng trong ${Math.ceil(v.nMoves / 2)} nước!` : w && w.id === 'host' ? `Thắng rồi, nhưng đề yêu cầu chiếu bí trong <b>${v.puzzle.n}</b> nước. Thử lại nha!` : 'Chưa đúng – thử lại nha 💪'}</p>`; }
  ui.openModal(`<h2>${!w ? '🤝 Hoà cờ' : iWon ? '🏆 Bạn thắng!' : iLost ? '😵 Bạn thua rồi' : `🏆 ${esc(cleanName(w.name))} thắng`}</h2><p style="text-align:center;color:var(--muted);font-weight:800">${E.RESULT_TEXT[v.result.kind] || ''} · ${Math.ceil(v.nMoves / 2)} nước</p>${extra}<div class="btns">${daily ? '<button class="btn pri" id="m-brag">📸 Khoe</button>' : ''}${nextPz ? '<button class="btn pri" id="m-next">🧩 Bài tiếp theo</button>' : ''}<button class="btn" id="m-close">Xem lại bàn cờ</button></div>`);
  $('#m-close').onclick = ui.closeModal;
  if (daily) $('#m-brag').onclick = () => { ui.closeModal(); /* đóng hộp kết quả để thẻ khoe hiện rõ */ return import('../../shared/ui/brag.js?v=1').then(m => m.brag({ game: 'cotuong', title: `Mình giải xong Cờ thế #${v.puzzle.no}!`, sub: `🔥 Chuỗi ${daily.streak} ngày`, lines: [`Chiếu bí trong ${v.puzzle.n} nước`, 'Mỗi ngày một bài mới – thử sức đi!'] })); };
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
// 🎨 theme bàn cờ – chỉ đổi trên máy mình
const THEMES = [['go', 'Gỗ sáng'], ['mun', 'Gỗ mun'], ['ngoc', 'Ngọc bích'], ['giay', 'Giấy dó'], ['da', 'Cờ đá'], ['dao', 'Hoa đào'], ['dem', 'Đêm trăng']];
let theme = THEMES.some(t => t[0] === ls.get('cotuong-theme')) ? ls.get('cotuong-theme') : 'go';
const setTheme = (t, hear) => { theme = t; ls.set('cotuong-theme', t); document.body.dataset.theme = t; if (hear) beep('move'); /* nghe thử tiếng quân của chất liệu mới */ }; setTheme(theme);
function openTheme() {
  const draw = () => {
    ui.openModal(`<h2>🎨 Giao diện bàn cờ</h2><div class="th-grid">${THEMES.map(([k, n]) => `<button type="button" data-th="${k}" aria-pressed="${theme === k}"><span class="th-prev" data-theme-prev="${k}"><i class="r">${style === 'han' ? '帥' : style === 'pic' ? picSvg('K') : 'T'}</i><i class="b">${style === 'han' ? '將' : style === 'pic' ? picSvg('H') : 'T'}</i></span>${n}</button>`).join('')}</div>
      <div class="opt"><b>字 Mặt quân cờ</b>${STYLE_SEG()}<small>Hình vẽ: 👑 Tướng · 🛡️ Sĩ · 🐘 Tượng · ☸️ Xe · 🐴 Mã · 💥 Pháo · nón lá = Tốt. Chỉ đổi trên máy bạn.</small></div>
      ${style === 'han' ? `<div class="opt"><b>🖌️ Kiểu chữ Hán</b><div class="fn-row">${FONTS.map(f => `<button type="button" data-font="${f[0]}" aria-pressed="${font === f}"><b style="font:${f[3]} 26px ${fontCss(f).replace(/"/g, "'")}">帥</b>${f[1]}</button>`).join('')}</div></div>` : ''}
      <div class="btns"><button class="btn" id="m-close">Xong</button></div>`);
    $('#m-close').onclick = ui.closeModal;
  };
  draw();
  $('#modal-box').onclick = e => { const b = e.target.closest('[data-th],[data-style],[data-font]'); if (!b || !$('.th-grid')) return; if (b.dataset.th) setTheme(b.dataset.th, true); else if (b.dataset.font) { font = FONTS.find(f => f[0] === b.dataset.font) || FONTS[0]; ls.set('cotuong-font', font[0]); applyFont(); setStyle(style); } else setStyle(b.dataset.style); draw(); if (ui.lobby && !ui.view) renderLobby(ui.lobby, ui); };
}
$('#btn-style').onclick = openTheme;
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
function drawDaily() {
  const b = $('#btn-daily'); if (!b) return; const t = today(), d = dailyState();
  b.innerHTML = `📅 Cờ thế hôm nay <small>#${t.no} · ${d.done[t.day] ? '✅ đã giải' : `chiếu bí ${t.n} nước`}${d.streak ? ` · 🔥 ${d.streak} ngày` : ''}</small>`;
}
function startDaily() { const t = today(); startPuzzle({ ...t, name: `Cờ thế hôm nay #${t.no}` }, { daily: t.day, no: t.no }); }
function startPuzzle(pz, more = {}) {
  if (!pz) return; const h = ui.startHost(true, true);
  h.addBot({ level: 'hard' }); h.start({ first: 'host', setup: pz.rows.join('').split('').map(c => c === '.' ? '' : c), puzzle: { id: pz.id, name: pz.name, n: pz.n, ...more } });
}
$('#btn-puzzle').onclick = openPuzzles;
$('#btn-daily').onclick = startDaily; drawDaily(); addEventListener('focus', drawDaily);
if (/[?&]daily=1/.test(location.search)) { history.replaceState(null, '', location.pathname); setTimeout(startDaily, 300); } /* vào từ ô Thử thách hôm nay ở trang chủ */

const ui = gameKit({
  game: 'cotuong', net: NET,
  offline: h => h.addBot({ level: botLevel }),
  onLobby: (info, ui2) => renderLobby(info, ui2),
  onState: (v, prev) => { if (!v) { sel = null; hints = []; shownMoves = -1; shownGid = null; return; } if (prev && prev.seq !== v.seq) { /* trạng thái mới: bỏ gợi ý cũ nếu hết lượt */ if (!canMove(v)) { sel = null; hints = []; } } render(v, prev); },
});
if (location.hash === '#debug') window.__dbg = () => ({ ui, E });
