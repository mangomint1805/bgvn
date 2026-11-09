// Giao diện Xếp bài cổ điển (Klondike): vẽ bàn, kéo-thả / chạm, hoàn tác, gợi ý, tự xếp, bộ giải, thống kê, lưu ván
import { VARIANTS, newGame, defaultOpts, optsKey, optsName, scoreStart, liveScore, timeBonus, passesLeft, SCORE_NONE, SCORE_VEGAS } from './variants.js?v=1';
import { apply, canMove, legalMoves, autoMoves, greedyFinish, key, hintMove, idsOf, isSeq, isRed, cardName, top } from './core.js?v=1';
import { solve } from './solver.js?v=1';
import { faceHTML, backHTML, drawCard, THEMES, getTheme, setTheme, previewHTML } from './cards.js?v=4';
import * as fx from './sfx.js?v=1';
import { guideHTML } from './guide.js?v=4';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=102';
import { rulesFor } from '../../shared/rules.js?v=1';
// ⚙️ Mặc định cho máy CHƯA từng chơi (luat-mac-dinh.js ở gốc repo). Máy đã chơi thì nhớ tuỳ chọn ván gần nhất ('sol-opts')
// và nút tự đưa lên đích ('sol-auto') – lựa chọn riêng của máy thắng file luật.
const SOL = rulesFor('solitaire', { draw: VARIANTS.klondike.opts.draw.def, score: VARIANTS.klondike.opts.score.def, autoFoundation: true },
  { draw: VARIANTS.klondike.opts.draw.vals, score: VARIANTS.klondike.opts.score.vals, autoFoundation: [true, false] });
VARIANTS.klondike.opts.draw.def = SOL.draw; VARIANTS.klondike.opts.score.def = SOL.score;

const $ = s => document.querySelector(s);
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  json(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } },
  put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtT = ms => { const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); };
const randSeed = () => 1 + Math.floor(Math.random() * 999999);

const board = $('#board'), felt = $('#felt');
let G = null, V = null;          // ván hiện tại + biến thể
let sel = null, busy = false, geo = null, finishMoves = null, drag = null;
const cardEl = new Map(), slotEl = new Map();
const cur = () => G.steps[G.idx].s;
const autoOn = () => { const v = ls.get('sol-auto'); return v === null ? SOL.autoFoundation : v !== '0'; };

// ---------------- ván chơi ----------------
function start(v, o = {}, seed = randSeed(), { record = true } = {}) {
  if (record) recordAbandon();
  V = VARIANTS[v]; const s = newGame(v, o, seed);
  G = { v, o: s.o, seed, steps: [{ m: [], s, sc: scoreStart(s.o) }], idx: 0, t: 0, won: false, assisted: false, counted: false };
  const last = ls.json('sol-opts', {}); last[v] = s.o; ls.put('sol-opts', last); ls.set('sol-last', v);
  resetBoard(); render(); afterStep(true);
}
function restart() { if (busy) return; G.steps.length = 1; G.idx = 0; G.t = 0; G.won = false; G.final = null; G.assisted = false; G.counted = false; clearSel(); render(); afterStep(true); toast('🔁 Chơi lại ván #' + G.seed); }
// Kiểu Solitaire Windows: 1 nước lên đích bất kỳ (KỂ CẢ lá "không an toàn") từ lá trên cùng của cột / bãi.
// Ưu tiên lá nhỏ nhất (A, 2… bay lên trước cho tự nhiên).
function homeOne(s) {
  let best = null, br = 99;
  for (const f in s.p) {
    const kf = s.k[f]; if (kf !== 'tab' && kf !== 'waste' && kf !== 'cell') continue;
    const P = s.p[f]; if (!P.c.length || P.d >= P.c.length) continue;
    const i = P.c.length - 1, r = P.c[i] % 13; if (r >= br) continue;
    for (const t in s.p) if (s.k[t] === 'found') { const m = { f, i, t }; if (canMove(V, s, m)) { best = m; br = r; break; } }
  }
  return best;
}
// chuột phải / nút ⤴️ / chạm 2 ngón / phím A: y như Solitaire Windows – đưa MỌI lá lên được đích lên hết
// (không chỉ lá an toàn), lặp tới khi hết, bay từng lá, hoàn tác 1 lần là về như cũ
function safeUp() {
  flushAuto();
  if (busy || !G || G.won) return false;
  const s = cur(), m = homeOne(s);
  if (!m) { fx.sfx.bad(); toast('Chưa có lá nào lên đích được 🤷', 'bad'); return false; }
  clearSel(); pushStep([m], apply(V, s, m), s); fx.sfx.found(); render(); updateHead(); runAuto(true);
  return true;
}
const hasHome = () => !!G && !G.won && !busy && !!homeOne(cur());
// nút ⤴️ Lên đích luôn có (mờ đi khi không lá nào lên được); chỉ nhường chỗ cho ✨ Tự xếp nốt (nút đó làm hết luôn)
function syncSafeBtn() { const b = $('#btn-safe'); b.hidden = !G || G.won || !!finishMoves; b.disabled = !hasHome(); }
function save() {
  if (!G) return;
  ls.put('sol-game', { v: G.v, o: G.o, seed: G.seed, steps: G.steps.slice(1).map(x => x.m), idx: G.idx, t: Math.round(G.t), won: G.won, assisted: G.assisted, counted: G.counted, final: G.final ?? null, bonus: G.bonus || 0 });
}
function load() {
  const d = ls.json('sol-game', null); if (!d || !VARIANTS[d.v]) return false;
  try {
    const W = VARIANTS[d.v]; let s = newGame(d.v, d.o, d.seed); let sc = scoreStart(s.o); const steps = [{ m: [], s, sc }];
    for (const ms of d.steps) { for (const m of ms) { const n = apply(W, s, m); if (!n) throw new Error('bad save'); sc = addScore(W, sc, s, n, m); s = n; } steps.push({ m: ms, s, sc }); }
    V = W; G = { v: d.v, o: steps[0].s.o, seed: d.seed, steps, idx: Math.min(d.idx, steps.length - 1), t: d.t || 0, won: !!d.won, assisted: !!d.assisted, counted: !!d.counted, final: d.final ?? null, bonus: d.bonus || 0 };
    return true;
  } catch (e) { return false; }
}

// ---------------- thống kê ----------------
const STATS = 'sol-stats';
function rec(win) {
  if (G.counted || G.assisted) return null; G.counted = true;
  const all = ls.json(STATS, {}), k = optsKey(V, G.o);
  const r = all[k] || (all[k] = { p: 0, w: 0, cs: 0, bs: 0, bt: null, bm: null, bsc: null });
  r.p++; const out = {};
  if (win) {
    r.w++; r.cs++; r.bs = Math.max(r.bs, r.cs);
    if (r.bt == null || G.t < r.bt) { out.bestT = r.bt != null; r.bt = Math.round(G.t); }
    if (r.bm == null || G.idx < r.bm) { out.bestM = r.bm != null; r.bm = G.idx; }
    if (G.o.score !== SCORE_NONE && (r.bsc == null || G.final > r.bsc)) { out.bestS = r.bsc != null; r.bsc = G.final; }
  } else r.cs = 0;
  if (G.o.score === SCORE_VEGAS) r.vt = (r.vt || 0) + (win ? G.final : curScore());
  ls.put(STATS, all); return { ...r, ...out };
}
function recordAbandon() { if (G && !G.won && G.idx > 0) rec(false); }

// ---------------- đồng hồ ----------------
let lastTick = performance.now();
setInterval(() => {
  const now = performance.now(), dt = now - lastTick; lastTick = now;
  if (G && !G.won && G.idx > 0 && !document.hidden) { G.t += dt; $('#timer').textContent = fmtT(G.t); showScore(); }
}, 500);
setInterval(() => { if (G && !G.won && G.idx > 0) save(); }, 5000);
addEventListener('pagehide', save);

// ---------------- bố cục + vẽ ----------------
function compute() {
  const s = cur(), pad = 8;
  const fw = felt.clientWidth, fh0 = felt.clientHeight, fh = fh0 - solvReserve(), aw = fw - 2 * pad, ah = fh - 2 * pad;
  let best = null;
  for (const wide of V.layout.length >= 2 ? [false, true] : [false]) {
    const L = V.layout(s, wide); const cwW = aw / L.W, cwH = ah / (L.H * 1.4);
    let cw = Math.min(cwW, cwH, 118); cw = Math.max(cw, Math.min(cwW, 40));
    if (!best || cw > best.cw + 0.5) best = { L, cw };
  }
  const { L } = best, cw = Math.floor(best.cw), ch = Math.round(cw * 1.4);
  const offX = Math.max(pad, Math.floor((fw - L.W * cw) / 2));
  const piles = {}; let maxB = 0;
  L.piles.forEach((p, order) => {
    const P = s.p[p.id], x = offX + p.x * cw, y = pad + p.y * ch, n = P.c.length, pos = [];
    if (p.fan === 'd') {
      const upF = p.up || 0.27; let ug = upF * ch, dg = 0.12 * ch;
      const limit = p.maxH ? p.maxH * ch : Math.max(fh - pad - y, ch * 2.2);
      const nd = Math.min(P.d, Math.max(0, n - 1)), nu = Math.max(0, n - 1 - nd), need = nd * dg + nu * ug, room = limit - ch;
      if (need > room && need > 0) {
        const k = Math.max(0, room) / need; ug *= k; dg *= k;
        ug = Math.max(ug, Math.min(upF * ch, Math.max(11, 0.17 * ch))); dg = Math.max(dg, Math.min(0.12 * ch, Math.max(3, 0.05 * ch)));
      }
      let yy = y; for (let i = 0; i < n; i++) { pos.push([x, yy]); yy += i < P.d ? dg : ug; }
    } else if (p.fan === 'w') {
      const show = Math.min(p.show || 1, n);
      for (let i = 0; i < n; i++) pos.push([x + Math.max(0, i - (n - show)) * 0.3 * cw, y]);
    } else for (let i = 0; i < n; i++) pos.push([x, y]);
    const last = pos[pos.length - 1] || [x, y];
    const hit = { l: x, t: y, r: Math.max(x + cw, last[0] + cw), b: Math.max(y + ch, last[1] + ch) };
    piles[p.id] = { p, x, y, pos, hit, order }; maxB = Math.max(maxB, hit.b);
  });
  for (const t of L.tags || []) maxB = Math.max(maxB, pad + (t.y + 0.4) * ch);
  return { L, cw, ch, pad, offX, piles, H: Math.max(maxB + pad, fh0), W: fw };
}
function resetBoard() { board.innerHTML = ''; cardEl.clear(); slotEl.clear(); }
function cardNode(c) {
  let el = cardEl.get(c);
  if (!el) {
    el = document.createElement('div'); el.className = 'pc ' + (isRed(c) ? 'red' : 'blk');
    el.innerHTML = faceHTML(c) + backHTML(); el.dataset.c = c; board.appendChild(el); cardEl.set(c, el);
  }
  return el;
}
function render() {
  const s = cur(); geo = compute(); const { cw, ch, piles } = geo;
  board.style.setProperty('--cw', cw + 'px'); board.style.setProperty('--ch', ch + 'px');
  board.style.height = geo.H + 'px'; board.classList.toggle('tiny', cw < 46); board.classList.toggle('mini', cw < 36); board.classList.toggle('small', cw < 64);
  board.querySelectorAll('.ptag,.badge,.deco').forEach(n => n.remove());
  for (const d of geo.L.deco || []) { const n = document.createElement('div'); n.className = 'deco ' + (d.cls || ''); Object.assign(n.style, { left: geo.offX + d.x * cw + 'px', top: geo.pad + d.y * ch + 'px', width: d.w * cw + 'px', height: d.h * ch + 'px' }); n.innerHTML = '<i></i><b></b>'; board.appendChild(n); }
  const seen = new Set();
  for (const id in piles) {
    const g = piles[id], P = s.p[id], kind = s.k[id];
    let sl = slotEl.get(id);
    if (!sl) { sl = document.createElement('div'); sl.className = 'slot k-' + kind; sl.dataset.p = id; board.appendChild(sl); slotEl.set(id, sl); }
    sl.style.transform = `translate(${g.x}px,${g.y}px)`;
    let lab = g.p.lab ?? '';
    if (kind === 'stock' && V.canStock) lab = V.canStock(s) ? '↻' : '✕';
    if (kind === 'stock' && !P.c.length && passesLeft(s) != null && V.canStock(s)) lab = '↻' + passesLeft(s);
    sl.textContent = lab;
    const base = (g.order + 1) * 220;
    P.c.forEach((c, i) => {
      const el = cardNode(c), down = i < P.d, [x, y] = g.pos[i]; seen.add(c); if (el.hidden) el.hidden = false;
      if (el.classList.contains('down') !== down) {
        el.classList.toggle('down', down);
        if (!down && el._p != null && !reduced()) { el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip'); }
      }
      // lá vừa đổi chồng bay ở trên các lá khác (nhưng vẫn giữ thứ tự trong chồng)
      el._z = base + i;
      if (el._p != null && el._p !== id) { el._boost = true; clearTimeout(el._mv); el._mv = setTimeout(() => { el._boost = false; el.style.zIndex = el._z; }, 320); }
      el._p = id; el.dataset.p = id; el.dataset.i = i;
      el.style.transform = `translate(${x}px,${y}px)`; el.style.zIndex = el._z + (el._boost ? 20000 : 0);
      el.setAttribute('aria-label', down ? 'Lá úp' : cardName(c));
      el.classList.toggle('sel', !!sel && sel.p === id && i >= sel.i);
    });
    if (g.p.badge) addBadge(g.x + cw - 10, g.y - 8, g.p.badge, 'hour');
    if (kind === 'stock' && P.c.length) {
      addBadge(g.x + cw - 12, g.y + ch - 14, P.c.length, 'cnt');
    }
  }
  for (const [c, el] of cardEl) if (!seen.has(c) && !el.hidden) { el.hidden = true; delete el.dataset.p; el._p = null; }
  for (const t of geo.L.tags || []) {
    const n = document.createElement('div'); n.className = 'ptag ' + (t.cls || ''); n.textContent = t.text;
    Object.assign(n.style, { left: geo.offX + t.x * cw + 'px', top: geo.pad + t.y * ch + 'px', width: t.w * cw + 'px' }); board.appendChild(n);
  }
}
function addBadge(x, y, text, cls) { const n = document.createElement('div'); n.className = 'badge ' + cls; n.textContent = text; n.style.left = x + 'px'; n.style.top = y + 'px'; board.appendChild(n); }
let rz = 0; addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => G && render()); });

function updateHead() {
  $('#v-name').textContent = V.vn; $('#v-opt').textContent = optsName(V, G.o); showScore();
  $('#deal-no').textContent = '#' + G.seed; $('#moves').textContent = G.idx; $('#timer').textContent = fmtT(G.t);
  $('#btn-undo').disabled = G.idx === 0; $('#btn-redo').disabled = G.idx >= G.steps.length - 1;
  document.title = 'Xếp bài cổ điển (Solitaire) – BGVN';
}

// ---------------- đi bài ----------------
function sound(s, n, m) {
  const fc = x => idsOf(x, 'found').reduce((a, id) => a + x.p[id].c.length, 0);
  const dn = x => idsOf(x, 'tab').reduce((a, id) => a + x.p[id].d, 0);
  if (m.k === 'stock') fx.sfx.deal();
  else if (fc(n) - fc(s) >= 13) fx.sfx.run();
  else if (s.k[m.t] === 'found') fx.sfx.found();
  else if (dn(n) < dn(s)) fx.sfx.flip();
  else fx.sfx.place();
}
function addScore(W, sc, s, n, m) { const v = (+sc || 0) + (W.scoreMove ? W.scoreMove(s, n, m) : 0); return s.o.score === SCORE_VEGAS ? v : Math.max(0, v); }
function pushStep(ms, n, prev) { const sc = addScore(V, G.steps[G.idx].sc, prev, n, ms[0]); G.steps.length = G.idx + 1; G.steps.push({ m: ms, s: n, sc }); G.idx++; }
const curScore = () => (G.won && G.final != null ? G.final : liveScore(G.o, G.steps[G.idx].sc, G.t));
function showScore() { const el = $('#score-wrap'); el.hidden = G.o.score === SCORE_NONE; $('#score').textContent = (G.o.score === SCORE_VEGAS ? '$' : '') + curScore(); }
function userMove(m) {
  if (busy || G.won) return false;
  const s = cur(), n = apply(V, s, m);
  if (!n) { fx.sfx.bad(); return false; }
  sel = null; pushStep([m], n, s); sound(s, n, m); render();
  if (autoOn() && V.safe) runAuto(); else afterStep();
  return true;
}
// autoAll = true: đang chạy "lên đích hết" kiểu Windows (mọi lá lên được); false: chỉ lá an toàn
let autoT = 0, autoRun = false, autoAll = false;
function autoStep() {
  if (G.won) return false;
  const s = cur(); let m, n;
  if (autoAll) { m = homeOne(s); if (!m) return false; n = apply(V, s, m); }
  else { const r = autoMoves(V, s, 1); if (!r.moves.length) return false; m = r.moves[0]; n = r.s; }
  const stp = G.steps[G.idx]; stp.sc = addScore(V, stp.sc, stp.s, n, m); stp.m.push(m); stp.s = n; return true;
}
function runAuto(all = false) {
  busy = true; autoRun = true; autoAll = all;
  const tick = () => {
    if (!autoStep()) { busy = false; autoRun = false; autoAll = false; afterStep(); return; }
    fx.sfx.found(); render(); showScore();
    autoT = setTimeout(tick, reduced() ? 20 : 110);
  };
  autoT = setTimeout(tick, reduced() ? 20 : 150);
}
// người chơi chạm/kéo tiếp khi bài đang tự bay lên đích: làm nốt ngay, không nuốt thao tác
function flushAuto() {
  if (!autoRun) return; clearTimeout(autoT);
  let n = 0; while (autoStep()) n++;
  busy = false; autoRun = false; autoAll = false; if (n) fx.sfx.found(); render(); afterStep();
}
function playSeq(moves, delay, done) {
  busy = true; clearSel(); let i = 0;
  const tick = () => {
    if (i >= moves.length || !G) { busy = false; afterStep(); done && done(); return; }
    const s = cur(), m = moves[i++], n = apply(V, s, m);
    if (!n) { busy = false; afterStep(); return; }
    pushStep([m], n, s); sound(s, n, m); render(); updateHead();
    setTimeout(tick, reduced() ? 15 : delay);
  };
  tick();
}
let finishKey = null;
function findFinish(s) {
  if (V.won(s)) return null;
  const g = greedyFinish(V, s); if (g) return g;
  for (const id of idsOf(s, 'tab')) { const P = s.p[id]; if (P.d > 0 || (P.c.length && !isSeq(P, 0, V.link))) return null; }
  const k = key(V, s); if (finishKey && finishKey[0] === k) return finishKey[1];
  const r = solve(V, s, { maxNodes: 4000, maxMs: 150 });
  const res = r.res === 'win' ? r.moves : null; finishKey = [k, res]; return res;
}
function afterStep(initial = false) {
  const s = cur(); updateHead(); save();
  if (V.won(s) && !G.won) { onWin(); solvSchedule(); syncSafeBtn(); return; }
  finishMoves = G.won ? null : findFinish(s);
  $('#btn-finish').hidden = !finishMoves;
  solvSchedule(); syncSafeBtn();
  if (!initial && !G.won && !legalMoves(V, s).length) toast('Hết nước đi rồi 😵 Thử ↶ Hoàn tác hoặc 🆕 Ván mới nhé.', 'bad', 3800);
}
function undo() { flushAuto(); if (busy || G.idx === 0) return; G.idx--; G.won = false; G.final = null; clearSel(); fx.sfx.undo(); render(); afterStep(true); }
function redo() { if (busy || G.idx >= G.steps.length - 1) return; G.idx++; clearSel(); fx.sfx.place(); render(); afterStep(true); }
function doStock() {
  const s = cur();
  if (!V.canStock || !V.canStock(s)) {
    fx.sfx.bad();
    toast(G.o.score === SCORE_VEGAS && s.p.w.c.length ? 'Luật Vegas: hết lượt lật lại nọc rồi 💸' : 'Hết nọc rồi!', 'bad');
    return;
  }
  userMove({ k: 'stock' });
}
function homeMove(pid, i) {
  const s = cur();
  for (const t in s.p) if (s.k[t] === 'found') { const m = { f: pid, i, t }; if (canMove(V, s, m)) return m; }
  return null;
}
function smartMove(pid, i) { // chạm đúp: ưu tiên lên đích, không thì tìm chỗ hợp lý trên bàn
  const s = cur(); const h = homeMove(pid, i); if (h) return h;
  let emp = null;
  for (const t in s.p) { if (t === pid || s.k[t] !== 'tab') continue; const m = { f: pid, i, t }; if (canMove(V, s, m)) { if (s.p[t].c.length) return m; emp = emp || m; } }
  return emp && !(i === 0 && s.k[pid] === 'tab') ? emp : null;
}

// ---------------- chọn / chạm ----------------
function canPick(pid, i) { const s = cur(); const P = s.p[pid]; return s.k[pid] !== 'stock' && i >= P.d && i < P.c.length && V.pick(s, pid, i); }
function setSel(p, i) { sel = { p, i }; markSel(); }
function clearSel() { if (sel) { sel = null; markSel(); } }
function markSel() { for (const [, el] of cardEl) el.classList.toggle('sel', !!sel && el.dataset.p === sel.p && +el.dataset.i >= sel.i); }
let lastTap = { p: null, i: -1, t: 0 };
function onTap(pid, i) {
  flushAuto();
  if (busy || !G || G.won) return;
  const s = cur(), kind = s.k[pid], now = performance.now();
  const dbl = i >= 0 && lastTap.p === pid && lastTap.i === i && now - lastTap.t < 400;
  lastTap = { p: pid, i, t: now };
  if (kind === 'stock') { clearSel(); doStock(); return; }
  if (dbl) { lastTap.t = 0; const m = canPick(pid, i) && smartMove(pid, i); clearSel(); if (m) userMove(m); else fx.sfx.bad(); return; }
  if (sel) {
    if (sel.p === pid && sel.i === i) { clearSel(); return; }
    if (sel.p !== pid) { const m = { f: sel.p, i: sel.i, t: pid }; if (canMove(V, s, m)) { userMove(m); return; } }
  }
  if (i >= 0 && canPick(pid, i)) { setSel(pid, i); fx.sfx.select(); }
  else { if (sel) fx.sfx.bad(); clearSel(); }
}

// ---------------- kéo-thả ----------------
function dragRect(d, e) { const [x, y] = d.base[0]; const dx = e.clientX - d.x0, dy = e.clientY - d.y0; return { l: x + dx, t: y + dy, r: x + dx + geo.cw, b: y + dy + geo.ch }; }
function dropTarget(d, e) {
  const R = dragRect(d, e), s = cur(), out = [];
  for (const id in geo.piles) {
    if (id === d.pid) continue; const h = geo.piles[id].hit;
    const a = Math.max(0, Math.min(R.r, h.r) - Math.max(R.l, h.l)) * Math.max(0, Math.min(R.b, h.b) - Math.max(R.t, h.t));
    if (a > 0) out.push([a, id]);
  }
  out.sort((a, b) => b[0] - a[0]);
  for (const [, id] of out) { const m = { f: d.pid, i: d.i, t: id }; if (canMove(V, s, m)) return m; }
  return null;
}
let tgtEl = null;
function markTarget(m) {
  const el = m ? (() => { const P = cur().p[m.t]; return P.c.length ? cardEl.get(top(P)) : slotEl.get(m.t); })() : null;
  if (el === tgtEl) return; tgtEl && tgtEl.classList.remove('tgt'); tgtEl = el; el && el.classList.add('tgt');
}
board.addEventListener('pointerdown', e => {
  if (e.button > 0 || !G || twoTap) return; fx.actx(); flushAuto();
  const el = e.target.closest('.pc,.slot');
  if (!el) { clearSel(); return; }
  let pid = el.dataset.p; if (pid == null) return;
  let i = el.classList.contains('pc') ? +el.dataset.i : -1;
  // chạm trúng lá đang bay (vd. bấm nọc liên tục) → xét theo vị trí thật trên bàn
  if (el._boost && geo) {
    const br = board.getBoundingClientRect(), x = e.clientX - br.left, y = e.clientY - br.top;
    for (const id in geo.piles) { const h = geo.piles[id].hit; if (x >= h.l && x <= h.r && y >= h.t && y <= h.b) { pid = id; const P = cur().p[id]; i = P.c.length ? P.c.length - 1 : -1; if (P.c.length) { const pos = geo.piles[id].pos; for (let k = P.c.length - 1; k >= 0; k--) if (y >= pos[k][1]) { i = k; break; } } break; } }
  }
  // bãi chỉ có lá trên cùng là đi được (lá mới lật còn đang xoay có thể làm trượt chạm xuống lá dưới)
  if (i >= 0 && G && cur().k[pid] === 'waste') i = cur().p[pid].c.length - 1;
  drag = { pid, i, x0: e.clientX, y0: e.clientY, on: false, id: e.pointerId };
});
addEventListener('pointermove', e => {
  const d = drag; if (!d || e.pointerId !== d.id) return;
  const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
  if (!d.on) {
    if (Math.hypot(dx, dy) < 7) return;
    if (busy || G.won || d.i < 0 || !canPick(d.pid, d.i)) { drag = null; return; }
    d.on = true; clearSel();
    const P = cur().p[d.pid]; d.els = P.c.slice(d.i).map(c => cardEl.get(c)); d.base = geo.piles[d.pid].pos.slice(d.i);
    d.els.forEach((el, k) => { el.classList.add('drag'); el.style.zIndex = 9000 + k; });
    try { board.setPointerCapture(e.pointerId); } catch (err) {}
  }
  e.preventDefault();
  d.els.forEach((el, k) => { el.style.transform = `translate(${d.base[k][0] + dx}px,${d.base[k][1] + dy}px)`; });
  if (!d.raf) d.raf = requestAnimationFrame(() => { d.raf = 0; if (drag === d) markTarget(dropTarget(d, e)); });
}, { passive: false });
addEventListener('pointerup', e => {
  const d = drag; if (!d || e.pointerId !== d.id) return; drag = null;
  if (!d.on) { if (!twoTap) onTap(d.pid, d.i); return; }
  markTarget(null); d.els.forEach(el => el.classList.remove('drag'));
  const m = dropTarget(d, e);
  if (!m || !userMove(m)) { render(); if (!m) fx.sfx.bad(); }
});
addEventListener('pointercancel', e => { const d = drag; if (!d || e.pointerId !== d.id) return; drag = null; if (d.on) { markTarget(null); d.els.forEach(el => el.classList.remove('drag')); render(); } });

// ---------------- chuột phải (kiểu Solitaire Windows) + chạm 2 ngón ----------------
felt.addEventListener('contextmenu', e => e.preventDefault());
const touchPts = new Map(); let twoTap = null;
felt.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button === 2) { e.preventDefault(); fx.actx(); safeUp(); return; }
  if (e.pointerType !== 'touch') return;
  touchPts.set(e.pointerId, [e.clientX, e.clientY]);
  if (touchPts.size === 2 && !(drag && drag.on)) { twoTap = { t: performance.now() }; drag = null; clearSel(); }
  else if (touchPts.size > 2) twoTap = null;
}, true);
felt.addEventListener('pointermove', e => { const p = touchPts.get(e.pointerId); if (p && twoTap && Math.hypot(e.clientX - p[0], e.clientY - p[1]) > 14) twoTap = null; }, true);
const touchEnd = (e, ok) => {
  if (!touchPts.delete(e.pointerId)) return;
  if (!ok) twoTap = null;
  if (twoTap && !touchPts.size) { const q = twoTap; twoTap = null; drag = null; if (performance.now() - q.t < 450) safeUp(); }
};
addEventListener('pointerup', e => touchEnd(e, true), true);
addEventListener('pointercancel', e => touchEnd(e, false), true);

// ---------------- gợi ý ----------------
function doHint() {
  flushAuto();
  if (busy || G.won) return;
  const s = cur(); const seen = new Set(G.steps.slice(0, G.idx).map(x => key(V, x.s)));
  const h = hintMove(V, s, seen, solve);
  if (!h) { fx.sfx.bad(); toast('Bí thật rồi 😵 Không còn nước nào đáng đi – thử ↶ Hoàn tác hoặc ván mới.', 'bad', 3500); return; }
  showHint(h.m); fx.sfx.hint();
}
function showHint(m) {
  const s = cur(), els = [];
  if (m.k === 'stock') { const P = s.p.s; els.push(P.c.length ? cardEl.get(top(P)) : slotEl.get('s')); toast(!P.c.length ? '💡 Lật lại nọc thử xem' : '💡 Bấm nọc chia thêm bài'); }
  else {
    s.p[m.f].c.slice(m.i).forEach(c => els.push(cardEl.get(c)));
    const T = s.p[m.t]; els.push(T.c.length ? cardEl.get(top(T)) : slotEl.get(m.t));
  }
  els.forEach(el => { if (!el) return; el.classList.remove('hint'); void el.offsetWidth; el.classList.add('hint'); setTimeout(() => el.classList.remove('hint'), 1900); });
  const first = els[0]; if (first && first.scrollIntoView) { const r = first.getBoundingClientRect(), fr = felt.getBoundingClientRect(); if (r.top < fr.top || r.bottom > fr.bottom) first.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); }
}

// ---------------- thắng ----------------
function onWin() {
  G.won = true; $('#btn-finish').hidden = true; finishMoves = null;
  G.bonus = timeBonus(G.o, G.t); G.final = liveScore(G.o, G.steps[G.idx].sc, G.t) + G.bonus; showScore();
  const r = rec(true); save(); fx.sfx.win();
  winAnim(() => showWin(r));
}
function winAnim(done) {
  if (reduced()) { done(); return; }
  const cv = $('#win-canvas'), dpr = Math.min(2, devicePixelRatio || 1), Wd = innerWidth, Hd = innerHeight;
  cv.width = Wd * dpr; cv.height = Hd * dpr; cv.hidden = false; cv.classList.remove('fade');
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const { cw, ch } = geo, br = board.getBoundingClientRect(), s = cur();
  const piles = Object.keys(geo.piles).filter(id => s.k[id] === 'found' && s.p[id].c.length).map(id => ({ id, c: s.p[id].c, x: br.left + geo.piles[id].x, y: br.top + geo.piles[id].y }));
  const queue = []; const maxLen = Math.max(0, ...piles.map(p => p.c.length));
  for (let k = 0; k < maxLen && queue.length < 56; k++) for (const p of piles) { const c = p.c[p.c.length - 1 - k]; if (c != null && queue.length < 56) queue.push({ c, x: p.x, y: p.y }); }
  const imgs = new Map(), img = c => { if (!imgs.has(c)) { const o = document.createElement('canvas'); o.width = cw * dpr; o.height = ch * dpr; const x = o.getContext('2d'); x.scale(dpr, dpr); drawCard(x, c, cw, ch); imgs.set(c, o); } return imgs.get(c); };
  const hidden = [], act = []; let qi = 0, stopped = false, last = performance.now(), nextAt = last;
  const t0 = last;
  const finish = () => {
    if (stopped) return; stopped = true; removeEventListener('pointerdown', finish, true); removeEventListener('keydown', finish, true);
    cv.classList.add('fade'); setTimeout(() => { cv.hidden = true; cv.classList.remove('fade'); hidden.forEach(el => { el.style.visibility = ''; }); done(); }, 450);
  };
  addEventListener('pointerdown', finish, true); addEventListener('keydown', finish, true);
  const frame = now => {
    if (stopped) return;
    const k = Math.min(3, (now - last) / 16.7); last = now;
    if (now >= nextAt && qi < queue.length) {
      const q = queue[qi++]; const el = cardEl.get(q.c); if (el) { el.style.visibility = 'hidden'; hidden.push(el); }
      act.push({ c: q.c, x: q.x, y: q.y, vx: (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 4), vy: -2 - Math.random() * 6 });
      nextAt = now + 170;
    }
    for (let j = act.length - 1; j >= 0; j--) {
      const a = act[j];
      for (let st = 0; st < 2; st++) { a.vy += 0.42 * k / 2; a.x += a.vx * k / 2; a.y += a.vy * k / 2; if (a.y + ch > Hd) { a.y = Hd - ch; a.vy *= -0.78; } ctx.drawImage(img(a.c), a.x, a.y, cw, ch); }
      if (a.x < -cw || a.x > Wd) act.splice(j, 1);
    }
    if ((qi >= queue.length && !act.length) || now - t0 > 11000) { finish(); return; }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
function showWin(r) {
  const best = r ? [r.bestT && '⏱ Kỷ lục thời gian mới!', r.bestM && '👣 Kỷ lục số nước mới!', r.bestS && '🏆 Kỷ lục điểm mới!'].filter(Boolean) : [];
  const quips = ['Đỉnh nóc kịch trần! 🔥', 'Xếp bài như máy luôn 😎', 'Não to quá trời 🧠', 'Ngon lành cành đào 🍑', 'Không phải dạng vừa đâu 💅'];
  const sc = G.o.score === SCORE_NONE ? '' : `<span>🏆 <b>${G.o.score === SCORE_VEGAS ? '$' : ''}${G.final}</b> điểm${G.bonus ? ` <small>(thưởng giờ +${G.bonus})</small>` : ''}</span>`;
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button>
  <div class="win-box"><div class="win-ic">🏆</div><h2>Xếp xong rồi!</h2><p class="win-q">${quips[Math.floor(Math.random() * quips.length)]}</p>
  <div class="win-st">${sc}<span>⏱ <b>${fmtT(G.t)}</b></span><span>👣 <b>${G.idx}</b> nước</span><span>Ván <b>#${G.seed}</b></span></div>
  ${best.map(b => `<p class="win-rec">${b}</p>`).join('')}
  ${G.assisted ? '<p class="muted">Ván có máy giải giúp nên không tính vào thống kê.</p>' : r ? `<p class="muted">${esc(optsName(V, G.o))}: thắng ${r.w}/${r.p} ván · chuỗi thắng ${r.cs}</p>` : ''}
  <div class="mrow"><button class="btn pri" data-act="new">🆕 Ván mới</button><button class="btn" data-act="opts">⚙️ Tuỳ chọn</button></div></div>`);
}

// ---------------- hộp thoại ----------------
const modal = $('#modal'), mbox = $('#modal-box');
let onModalClose = null;
function openModal(html, cls = '') { mbox.className = 'modal-box ' + cls; mbox.innerHTML = html; modal.classList.add('on'); mbox.scrollTop = 0; }
function closeModal() { if (!modal.classList.contains('on')) return; modal.classList.remove('on'); const f = onModalClose; onModalClose = null; f && f(); }
modal.addEventListener('click', e => {
  if (e.target === modal || e.target.closest('[data-close]')) { closeModal(); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  ({
    new: () => { closeModal(); start(V.id, G.o); },
    opts: () => optsBox(), deal: () => dealBox(), restart: () => { closeModal(); restart(); },
    solve: () => askSolver(), stats: () => showStats(), guide: () => openModal(guideHTML(V.id), 'wide'),
    news: () => { closeModal(); news(); },
    auto: () => { ls.set('sol-auto', autoOn() ? '0' : '1'); moreMenu(); syncSafeBtn(); toast(autoOn() ? '✅ Bật tự đưa lá an toàn lên đích' : 'Tắt tự đưa lên đích – dùng ⤴️ Lên đích hoặc chuột phải'); },
    dark: () => { setDark(b.dataset.m); moreMenu(); toast({ auto: '🌓 Sáng/tối theo máy', light: '☀️ Giao diện sáng', dark: '🌙 Giao diện tối' }[darkPref()]); },
    solv: () => { ls.set('sol-solvable', solvOn() ? '0' : '1'); moreMenu(); render(); solvSchedule(); toast(solvOn() ? '🧠 Bật báo giải được hay không' : 'Tắt báo giải được hay không'); },
    theme: () => themeBox(), settheme: () => { pickTheme(b.dataset.t); themeBox(); },
    music: () => { fx.actx(); fx.musicToggle(); syncAudio(); moreMenu(); }, mute: () => { fx.toggleMute(); syncAudio(); moreMenu(); },
    resetstats: () => { if (b.dataset.sure) { ls.put(STATS, {}); showStats(); toast('Đã xoá thống kê'); } else { b.dataset.sure = '1'; b.textContent = 'Chắc chưa? Bấm lần nữa để xoá'; } },
  }[a] || (() => {}))();
});
function moreMenu() {
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>☰ Thêm</h2>
  <div class="menu">
    <button data-act="opts">⚙️ Rút 1 / Rút 3 · Cách tính điểm</button>
    <button data-act="deal">🔢 Chọn số ván</button>
    <button data-act="restart">🔁 Chơi lại ván này</button>
    <button data-act="solve">🧠 Ván này giải được không?</button>
    <button data-act="stats">📊 Thống kê</button>
    <button data-act="auto" class="tg ${autoOn() ? 'on' : ''}">🪄 Tự đưa lá an toàn lên đích <em>${autoOn() ? 'BẬT' : 'TẮT'}</em></button>
    <button data-act="solv" class="tg ${solvOn() ? 'on' : ''}">🧠 Báo giải được hay không (góc trái dưới) <em>${solvOn() ? 'BẬT' : 'TẮT'}</em></button>
    <button data-act="theme">🎨 Giao diện bài <em>${THEMES[getTheme()].name}</em></button>
    <div class="seg" role="group" aria-label="Chế độ sáng / tối"><span>🌓 Sáng / tối</span><span class="seg-b">${[['auto', 'Tự động'], ['light', 'Sáng'], ['dark', 'Tối']].map(([m, t]) => `<button data-act="dark" data-m="${m}" class="${darkPref() === m ? 'on' : ''}" aria-pressed="${darkPref() === m}">${t}</button>`).join('')}</span></div>
    <button data-act="music" class="tg ${fx.musicIsOn() ? 'on' : ''}">🎵 Nhạc nền <em>${fx.musicIsOn() ? 'BẬT' : 'TẮT'}</em></button>
    <button data-act="mute" class="tg ${fx.isMuted() ? '' : 'on'}">🔊 Âm thanh <em>${fx.isMuted() ? 'TẮT' : 'BẬT'}</em></button>
    <button data-act="guide">📖 Hướng dẫn</button>
    <button data-act="news">📝 Có gì mới</button>
  </div><p class="note">Bản fan-made phi thương mại · Chơi một mình, không cần mạng. Chuột phải lên bàn = đưa mọi lá lên được lên đích (y như Windows).</p>
  ${THEMES[getTheme()].credit ? `<p class="credit center">${THEMES[getTheme()].name.split(' ')[0]} ${THEMES[getTheme()].credit}.</p>` : ''}`);
}
// tuỳ chọn ván: rút 1/3 + cách tính điểm (áp dụng từ ván mới)
function optsBox(first = false) {
  const o = { ...G.o };
  const row = (k, d) => `<h3>${d.label}</h3><div class="vopts">${d.vals.map((v, j) => `<button class="vo ${o[k] === v ? 'on' : ''}" data-k="${k}" data-val="${v}">${d.names[j]}</button>`).join('')}</div>`;
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>${first ? '🃏 Xếp bài cổ điển' : '⚙️ Tuỳ chọn ván'}</h2>
  ${first ? '<p class="muted">Solitaire kiểu Windows ngày xưa – chọn luật rồi chiến! Đổi lúc nào cũng được ở nút tên game phía trên.</p>' : ''}
  <div class="optbox">${Object.entries(V.opts).map(([k, d]) => row(k, d)).join('')}</div>
  <ul class="opt-help"><li><b>Rút 1</b>: dễ hơn, lật từng lá. <b>Rút 3</b>: lật 3 lá, chỉ chơi được lá trên cùng.</li>
  <li><b>Tiêu chuẩn</b>: +10 lên đích, +5 bài lật xuống cột / lật lá úp, −15 kéo từ đích xuống, −2 mỗi 10 giây, thắng có thưởng thời gian.</li>
  <li><b>Vegas</b>: bắt đầu −$52 điểm ảo, mỗi lá lên đích +$5; rút 1 chỉ lật nọc 1 vòng, rút 3 được 3 vòng. Chỉ là điểm cho vui, không cá cược.</li></ul>
  <div class="mrow"><button class="btn pri" id="opt-go">${first ? '▶ Chơi luôn' : '🆕 Ván mới với tuỳ chọn này'}</button></div>
  ${first ? '' : '<p class="muted center">Ván đang chơi dở (đã đi nước nào) sẽ tính là thua.</p>'}`);
  mbox.querySelectorAll('.vo').forEach(b => b.onclick = () => { o[b.dataset.k] = +b.dataset.val; b.parentElement.querySelectorAll('.vo').forEach(x => x.classList.toggle('on', x === b)); });
  $('#opt-go').onclick = () => { closeModal(); if (first && G.idx === 0) { start(V.id, o, G.seed, { record: false }); } else start(V.id, o); toast(`🃏 ${optsName(V, o)} – ván #${G.seed}`); };
}
function dealBox() {
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>🔢 Chọn số ván</h2>
  <p class="muted">Cùng số ván = cùng cách chia bài. Gửi số cho bạn bè để thi xem ai xếp nhanh hơn!</p>
  <form id="deal-form" class="deal-form"><input id="deal-in" type="number" inputmode="numeric" min="1" max="999999" value="${G.seed}" aria-label="Số ván"><button class="btn pri" type="submit">Chơi ván này</button></form>
  <div class="mrow"><button class="btn" data-act="new">🎲 Ván ngẫu nhiên</button><button class="btn" data-act="restart">🔁 Chơi lại #${G.seed}</button></div>`);
  const inp = $('#deal-in'); inp.select();
  $('#deal-form').onsubmit = e => { e.preventDefault(); const n = Math.floor(+inp.value); if (!(n >= 1 && n <= 999999)) { toast('Số ván từ 1 tới 999999 nha', 'bad'); return; } closeModal(); start(V.id, G.o, n); toast(`Ván #${n} – chiến thôi!`); };
}
function showStats() {
  const all = ls.json(STATS, {}); const rows = [];
  for (const d of V.opts.draw.vals) for (const sc of V.opts.score.vals) {
    const o = { draw: d, score: sc }, r = all[optsKey(V, o)]; if (!r || !r.p) continue;
    const scTxt = sc === SCORE_NONE ? '–' : `${sc === SCORE_VEGAS ? '$' : ''}${r.bsc ?? '–'}${sc === SCORE_VEGAS && r.vt != null ? `<small>tổng ${r.vt >= 0 ? '' : '−'}$${Math.abs(r.vt)}</small>` : ''}`;
    rows.push(`<tr><td><b>${optsName(V, o).replace(' · ', '</b><small>')}</small></td><td>${r.p}</td><td>${r.w} <small>(${Math.round(100 * r.w / r.p)}%)</small></td><td>${r.cs} <small>/ ${r.bs}</small></td><td>${r.bt != null ? fmtT(r.bt) : '–'}${r.bm != null ? `<small>${r.bm} nước</small>` : ''}</td><td>${scTxt}</td></tr>`);
  }
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>📊 Thống kê</h2>
  ${rows.length ? `<div class="tbl-wrap"><table class="stats"><thead><tr><th>Luật</th><th>Ván</th><th>Thắng</th><th>Chuỗi<small>hiện / max</small></th><th>Nhanh nhất</th><th>Điểm cao</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>` : '<p class="muted">Chưa có ván nào xong. Chơi đi rồi tính! 😤</p>'}
  <p class="muted">Ván bỏ dở (đã đi ít nhất 1 nước) tính là thua. Ván có máy giải giúp không được tính. Điểm Vegas là điểm ảo cho vui.</p>
  ${rows.length ? '<div class="mrow"><button class="btn gray" data-act="resetstats">🗑 Xoá thống kê</button></div>' : ''}`, 'wide');
}

function themeBox() {
  const t0 = getTheme();
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>🎨 Giao diện bài</h2>
  <div class="th-pick">${Object.entries(THEMES).map(([id, T]) => `<button data-act="settheme" data-t="${id}" class="${id === t0 ? 'on' : ''}" aria-pressed="${id === t0}">${previewHTML(id)}<span>${T.name}</span><small>${T.desc}</small></button>`).join('')}</div>
  <div class="credit"><p>Theme 🐧 👑 🏺 dùng nguyên bộ bài / nền bàn của dự án KDE (không vẽ lại, chỉ tách từng lá + nén). Nguồn, tác giả và toàn văn giấy phép ở README của từng theme:</p>
  <ul>${Object.values(THEMES).filter(T => T.credit).map(T => `<li><b>${T.name}</b>: ${T.credit}. <a href="${T.readme}" target="_blank" rel="noopener">README</a></li>`).join('')}</ul></div>
  <div class="mrow"><button class="btn pri" data-close>Xong</button></div>`);
}
function pickTheme(t) {
  if (t === getTheme() || !THEMES[t]) return;
  setTheme(t); flushAuto(); resetBoard(); render();
  toast({ classic: '🃏 Về bộ bài cổ điển', egypt: '🏺 Theme Ai Cập – bộ bài KDE Ancient Egyptians', penguins: '🐧 Theme Cánh cụt – bộ bài KDE Penguins', royal: '👑 Theme Tim hồng – bộ bài KDE Jolly Royal', meo: '🐱 Theme Mèo con – meo meo~' }[t] || THEMES[t].name);
}

// ---------------- 🧠 báo "giải được không" liên tục (như KPatience) ----------------
// Chạy bộ giải trong Web Worker RIÊNG sau mỗi nước/hoàn tác/ván mới (chờ 300ms cho gọn), huỷ lượt cũ khi thế bài đổi,
// mỗi lượt tối đa 4 giây. Chỉ để XEM – không tính là "có máy giúp" (chỉ "Cho máy giải luôn" mới tính).
const solvEl = $('#solv');
const solvOn = () => ls.get('sol-solvable') !== '0';
const SOLV_TXT = { calc: ['🧠', 'Đang tính…'], win: ['✅', 'Giải được'], lose: ['❌', 'Hết đường'], unknown: ['🤔', 'Chưa chắc'] };
const SOLV_TIP = { calc: 'Máy đang thử giải thế bài này…', win: '✅ Máy tìm được đường thắng từ thế bài này (máy biết cả lá úp).', lose: '❌ Máy đã thử hết mọi đường: thế bài này không thắng được nữa. Thử ↶ Hoàn tác!', unknown: '🤔 Máy chưa tìm ra đường thắng trong 4 giây – chưa chắc thua đâu, chơi tiếp đi!' };
const SV = { w: null, busy: false, id: 0, t: 0, st: null, cache: new Map() };
const solvBar = () => matchMedia('(min-width:1280px) and (min-height:600px)').matches;
function solvReserve() { return solvOn() && G && !G.won && !solvBar() ? (innerWidth <= 420 ? 30 : 36) : 0; }
function solvShow(st) {
  SV.st = st;
  solvEl.hidden = !st; if (st) { solvEl.className = 'solv ' + st; solvEl.firstElementChild.textContent = SOLV_TXT[st][0]; solvEl.lastElementChild.textContent = SOLV_TXT[st][1]; solvEl.title = SOLV_TIP[st]; }
}
function solvCancel() { SV.id++; clearTimeout(SV.t); if (SV.busy && SV.w) { SV.w.terminate(); SV.w = null; } SV.busy = false; }
function solvCache(k, r) { SV.cache.set(k, r); if (SV.cache.size > 600) SV.cache.delete(SV.cache.keys().next().value); }
function solvSchedule() {
  solvCancel();
  if (!solvOn() || !G || G.won) { solvShow(null); return; }
  const s = cur(), k = key(V, s);
  if (SV.cache.has(k)) { solvShow(SV.cache.get(k)); return; }
  solvShow('calc');
  const id = SV.id; SV.t = setTimeout(() => { if (id === SV.id) solvRun(s, k); }, 300);
}
function solvRun(s, k) {
  const id = SV.id;
  try { if (!SV.w) SV.w = new Worker(new URL('./worker.js?v=1', import.meta.url), { type: 'module' }); }
  catch (e) { solvShow('unknown'); return; }
  SV.busy = true;
  SV.w.onmessage = e => {
    const d = e.data; if (d.id !== id || d.progress != null) return;
    SV.busy = false;
    const r = d.res === 'win' || d.res === 'lose' ? d.res : 'unknown';
    solvCache(k, r);
    // có lời giải → mọi thế bài dọc theo lời giải cũng giải được (đi đúng đường thì báo ngay, khỏi tính lại)
    if (r === 'win' && d.moves) { let x = s; for (const m of d.moves) { x = apply(V, x, m); if (!x) break; solvCache(key(V, x), 'win'); } }
    if (id === SV.id && G && !G.won) solvShow(r);
  };
  SV.w.onerror = () => { SV.busy = false; SV.w = null; if (id === SV.id) solvShow('unknown'); };
  SV.w.postMessage({ id, state: s, maxMs: 4000, maxNodes: 200000 });
}
solvEl.onclick = () => { if (SV.st) toast(SOLV_TIP[SV.st], SV.st === 'lose' ? 'bad' : '', 3200); };

// ---------------- bộ giải (Web Worker) ----------------
let worker = null, wid = 0;
function askSolver() {
  if (busy) return;
  const s = cur(), id = ++wid;
  if (V.won(s)) { toast('Thắng rồi còn hỏi 😆'); return; }
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>🧠 Ván này giải được không?</h2>
  <p class="sv"><span class="spin" aria-hidden="true"></span> Máy đang thử mọi đường… đã xét <b id="sv-n">0</b> thế bài</p>
  <p class="muted">Máy biết hết lá úp nên đây là câu hỏi "có đường thắng không", tối đa khoảng 10 giây.</p>
  <div class="mrow"><button class="btn gray" data-close>Huỷ</button></div>`);
  onModalClose = () => { if (wid === id) { wid++; if (worker) { worker.terminate(); worker = null; } } };
  const got = d => {
    if (d.id !== id || wid !== id) return;
    if (d.progress != null) { const n = $('#sv-n'); if (n) n.textContent = d.progress.toLocaleString('vi-VN'); return; }
    onModalClose = null; showSolve(d, s);
  };
  try {
    if (!worker) { worker = new Worker(new URL('./worker.js?v=1', import.meta.url), { type: 'module' }); }
    worker.onmessage = e => got(e.data);
    worker.onerror = () => { worker = null; setTimeout(() => got({ id, ...solve(V, s, { maxMs: 2500, maxNodes: 60000 }) }), 30); };
    worker.postMessage({ id, state: s, maxMs: 10000, maxNodes: 300000 });
  } catch (e) { setTimeout(() => got({ id, ...solve(V, s, { maxMs: 2500, maxNodes: 60000 }) }), 30); }
}
function showSolve(d, s) {
  const n = (d.nodes || 0).toLocaleString('vi-VN');
  let body;
  if (d.res === 'win') body = `<p class="sv-ok">✅ <b>Giải được!</b> Máy tìm ra một lời giải dài <b>${d.moves.length}</b> nước (xét ${n} thế bài).</p>
    <div class="mrow"><button class="btn pri" id="sv-first">💡 Chỉ nước đầu</button><button class="btn" id="sv-play">▶ Cho máy giải luôn</button></div><p class="muted">Xem máy giải thì ván này không tính kỷ lục.</p>`;
  else if (d.res === 'lose') body = `<p class="sv-bad">❌ <b>Hết đường thắng rồi.</b> Máy đã thử hết ${n} thế bài có thể. Hoàn tác vài nước hoặc chơi ván mới nhé.</p><div class="mrow"><button class="btn pri" data-act="new">🆕 Ván mới</button></div>`;
  else if (d.res === 'error') body = `<p class="sv-bad">Máy bị lỗi khi giải 😵 (${esc(d.error || '')})</p>`;
  else body = `<p class="sv-meh">🤔 <b>Chưa chắc.</b> Sau ${Math.round((d.ms || 0) / 1000)} giây (${n} thế bài) máy chưa tìm ra lời giải – không có nghĩa là thua đâu. Cứ chơi tiếp!</p>`;
  openModal(`<button class="close-x" data-close aria-label="Đóng">✕</button><h2>🧠 Kết quả</h2>${body}<div class="mrow"><button class="btn gray" data-close>Đóng</button></div>`);
  const f = $('#sv-first'), p = $('#sv-play');
  if (f) f.onclick = () => { closeModal(); if (cur() === s) { showHint(d.moves[0]); fx.sfx.hint(); } };
  if (p) p.onclick = () => { closeModal(); if (cur() !== s) return; G.assisted = true; playSeq(d.moves, 230); };
}

// ---------------- 🌓 sáng / tối: theo máy (mặc định) hoặc chọn tay, nhớ trong 'sol-dark' ----------------
// (index.html có đoạn script nhỏ đặt class 'dark' ngay từ đầu để khỏi nháy trắng)
const darkMQ = (() => { try { return matchMedia('(prefers-color-scheme: dark)'); } catch (e) { return null; } })();
const darkPref = () => { const v = ls.get('sol-dark'); return v === 'light' || v === 'dark' ? v : 'auto'; };
function applyDark() {
  const p = darkPref(), on = p === 'dark' || (p === 'auto' && !!darkMQ && darkMQ.matches);
  const h = document.documentElement; h.classList.toggle('dark', on); h.style.colorScheme = on ? 'dark' : 'light';
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = on ? '#17141f' : '#fff6ea';
}
function setDark(m) { ls.set('sol-dark', m === 'light' || m === 'dark' ? m : 'auto'); applyDark(); }
applyDark();
if (darkMQ) { const f = () => applyDark(); darkMQ.addEventListener ? darkMQ.addEventListener('change', f) : darkMQ.addListener(f); }

// ---------------- linh tinh ----------------
let toastT = 0;
function toast(msg, cls = '', ms = 2200) { const t = $('#toast'); t.textContent = msg; t.className = 'toast on ' + cls; clearTimeout(toastT); toastT = setTimeout(() => { t.className = 'toast ' + cls; }, ms); }
function syncAudio() { $('#btn-music').classList.toggle('off', !fx.musicIsOn()); $('#btn-mute').textContent = fx.isMuted() ? '🔇' : '🔊'; }
function news() { openNews('solitaire'); $('#btn-news').classList.remove('bgvn-dot'); }
$('#btn-undo').onclick = undo; $('#btn-redo').onclick = redo; $('#btn-hint').onclick = doHint; $('#btn-safe').onclick = () => safeUp();
$('#btn-new').onclick = () => { if (busy) return; start(V.id, G.o); toast(`🆕 Ván #${G.seed}`); };
$('#btn-more').onclick = moreMenu; $('#btn-variant').onclick = () => optsBox(); $('#btn-deal').onclick = dealBox;
$('#btn-finish').onclick = () => { if (finishMoves && !busy) playSeq(finishMoves, 95); };
$('#btn-guide').onclick = () => openModal(guideHTML(V.id), 'wide');
$('#btn-news').onclick = news; newsBadge($('#btn-news'), 'solitaire');
$('#btn-music').onclick = () => { fx.actx(); fx.musicToggle(); syncAudio(); toast(fx.musicIsOn() ? '🎵 Bật nhạc chill' : '🎵 Tắt nhạc'); };
$('#btn-mute').onclick = () => { fx.toggleMute(); syncAudio(); };
syncAudio();
// nhạc nền BẬT mặc định: phát ở lần chạm/bấm phím đầu tiên (trình duyệt chặn tự phát); tắt thì nhớ luôn
const firstGesture = () => { removeEventListener('pointerdown', firstGesture, true); removeEventListener('keydown', firstGesture, true); fx.actx(); fx.musicResumeIfOn(); };
addEventListener('pointerdown', firstGesture, true); addEventListener('keydown', firstGesture, true);
addEventListener('keydown', e => {
  if (modal.classList.contains('on')) { if (e.key === 'Escape') closeModal(); return; }
  if (e.target.closest && e.target.closest('input,textarea')) return;
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && k === 'y') { e.preventDefault(); redo(); }
  else if (!mod && !e.altKey) {
    if (k === 'h') doHint(); else if (k === 'n') $('#btn-new').click(); else if (k === 'f') $('#btn-finish').click(); else if (k === 'a') safeUp();
    else if (k === ' ' || k === 'd') { e.preventDefault(); if (!busy && !G.won && V.canStock) doStock(); }
    else if (k === 'escape') clearSel(); else return;
  }
});

// debug/test hook (dùng cho test tự động)
window.__sol = { get G() { return G; }, get sel() { return sel; }, get busy() { return busy; }, get lastTap() { return lastTap; }, get V() { return V; }, start, render, cur, userMove, apply: m => apply(V, cur(), m), legal: () => legalMoves(V, cur()),
  inject(s) { G.steps.length = G.idx + 1; G.steps.push({ m: [], s, sc: G.steps[G.idx].sc }); G.idx++; render(); afterStep(); }, geo: () => geo,
  safeUp, undo, pickTheme, setDark, homeOne: () => homeOne(cur()), get solv() { return SV.st; }, get solvCache() { return SV.cache.size; } };

// ---------------- khởi động ----------------
if (load()) { render(); afterStep(true); if (G.won) $('#btn-finish').hidden = true; }
else { const seen = ls.get('sol-last'); start('klondike', ls.json('sol-opts', {}).klondike || {}, randSeed(), { record: false }); if (!seen) optsBox(true); }
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => G && render());
