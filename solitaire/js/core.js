// Engine chung cho mọi kiểu xếp bài – THUẦN, state JSON-serializable, không đụng DOM.
// Lá bài = số nguyên: copy*52 + chất*13 + số  (số 0=A … 12=K; chất 0♠ 1♥ 2♦ 3♣).
// State: { v, o, seed, k:{pileId:kind}, p:{pileId:{c:[lá…], d:số lá úp ở đáy}}, x:{biến phụ} }
// kind: 'tab' (cột bài), 'found' (đích), 'stock' (nọc), 'waste' (bài lật), 'cell' (ô trống)
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['♠', '♥', '♦', '♣'];
export const SUIT_VN = ['bích', 'cơ', 'rô', 'chuồn'];
export const rk = c => c % 13;
export const st = c => Math.floor(c / 13) % 4;
export const isRed = c => { const s = st(c); return s === 1 || s === 2; };
export const cardName = c => RANKS[rk(c)] + SUITS[st(c)];

// ---------- ngẫu nhiên có seed ----------
export function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function shuffle(arr, rnd) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
// bộ bài: decks bộ, chỉ gồm các chất trong `suits` (Nhện 1/2 chất nhân bản cho đủ 52*decks lá)
export function makeDeck(decks = 1, suits = [0, 1, 2, 3]) {
  const out = [], copies = (4 * decks) / suits.length;
  for (let cp = 0; cp < copies; cp++) for (const su of suits) for (let r = 0; r < 13; r++) out.push(cp * 52 + su * 13 + r);
  return out;
}
export const pile = (c = [], d = 0) => ({ c, d });
export const top = P => P.c[P.c.length - 1];

// ---------- sao chép khi ghi (copy-on-write) ----------
let OWN = null, CUR = null;
export function fork(s) { const n = { ...s, p: { ...s.p }, x: { ...s.x } }; OWN = new Set(); CUR = n; return n; }
export function own(n, id) {
  if (CUR !== n) { OWN = new Set(); CUR = n; }
  if (!OWN.has(id)) { const q = n.p[id]; n.p[id] = { c: q.c.slice(), d: q.d }; OWN.add(id); }
  return n.p[id];
}
// chuyển cards[i..] của pile f sang cuối pile t (không kiểm tra luật)
export function transfer(n, f, i, t, faceUp = true) {
  const F = own(n, f), T = own(n, t); const moved = F.c.splice(i);
  if (F.d > F.c.length) F.d = F.c.length;
  if (faceUp) T.c.push(...moved); else { T.c.push(...moved); T.d = T.c.length; }
  return moved;
}
export function flipTops(n) {
  for (const id in n.p) if (n.k[id] === 'tab') { const P = n.p[id]; if (P.c.length && P.d >= P.c.length) own(n, id).d = P.c.length - 1; }
}
export const idsOf = (s, kind) => Object.keys(s.p).filter(id => s.k[id] === kind);

// ---------- luật xây dựng hay dùng ----------
export const altDown = (a, b) => rk(a) === rk(b) + 1 && isRed(a) !== isRed(b); // b đặt lên a
export const suitDown = (a, b) => rk(a) === rk(b) + 1 && st(a) === st(b);
export const anyDown = (a, b) => rk(a) === rk(b) + 1;
export function isSeq(P, i, link) { const c = P.c; if (i < P.d) return false; for (let j = i + 1; j < c.length; j++) if (!link(c[j - 1], c[j])) return false; return true; }
// đích xếp lên cùng chất A→K
export function foundAccepts(P, card) { if (!P.c.length) return rk(card) === 0; const t = top(P); return st(t) === st(card) && rk(card) === rk(t) + 1; }

// ---------- auto lên đích "an toàn" ----------
// số đích của chất su đã chứa đủ lá 0..r-1
function countF(s, su, r) { let n = 0; for (const id in s.p) if (s.k[id] === 'found') { const P = s.p[id]; if (P.c.length >= r && P.c.length && st(P.c[0]) === su) n++; } return n; }
export const safeAlt = D => (s, c) => { const r = rk(c); if (r <= 1) return true; const opp = isRed(c) ? [0, 3] : [1, 2]; return opp.every(su => countF(s, su, r) >= D); };

// ---------- nước đi ----------
// move: {f, i, t}  (chuyển lá i..cuối của pile f sang t)  hoặc {k:'stock'} (bấm nọc)
export function cardsMoved(s, m) { return m.k ? [] : s.p[m.f].c.slice(m.i); }
export function canMove(V, s, m) {
  if (!m) return false;
  if (m.k === 'stock') return !!(V.canStock && V.canStock(s));
  const F = s.p[m.f], T = s.p[m.t];
  if (!F || !T || m.f === m.t || !(m.i >= F.d && m.i < F.c.length)) return false;
  return !!(V.pick(s, m.f, m.i) && V.drop(s, m.f, m.i, m.t));
}
export function apply(V, s, m) {
  if (!canMove(V, s, m)) return null;
  const n = fork(s);
  if (m.k === 'stock') V.stock(n); else transfer(n, m.f, m.i, m.t);
  (V.after || flipTops)(n);
  return n;
}
const groupOf = (V, s, id) => V.group ? V.group(id, s) : s.k[id];
export function legalMoves(V, s, { dedup = true } = {}) {
  const out = [], ids = Object.keys(s.p);
  for (const f of ids) {
    const kf = s.k[f]; if (kf === 'stock') continue;
    const P = s.p[f];
    for (let i = P.c.length - 1; i >= P.d; i--) {
      if (!V.pick(s, f, i)) break; // pick đơn điệu: i không bốc được thì i-1 cũng không
      const seenEmpty = new Set();
      for (const t of ids) {
        if (t === f) continue;
        const T = s.p[t];
        if (dedup && !T.c.length) { const g = groupOf(V, s, t); if (seenEmpty.has(g)) continue; if (V.drop(s, f, i, t)) { seenEmpty.add(g); out.push({ f, i, t }); } continue; }
        if (V.drop(s, f, i, t)) out.push({ f, i, t });
      }
    }
  }
  if (V.canStock && V.canStock(s)) out.push({ k: 'stock' });
  return out;
}
export const won = (V, s) => V.won(s);
export function cardCount(s) { let n = 0; for (const id in s.p) n += s.p[id].c.length; return n; }

// tự đưa lên đích các lá an toàn (chỉ biến thể có V.safe)
export function autoMoves(V, s, limit = 200) {
  const moves = []; if (!V.safe) return { s, moves };
  let cur = s, again = true;
  while (again && moves.length < limit) {
    again = false;
    for (const f in cur.p) {
      const kf = cur.k[f]; if (kf !== 'tab' && kf !== 'waste' && kf !== 'cell') continue;
      const P = cur.p[f]; if (!P.c.length || P.d >= P.c.length) continue;
      const card = top(P); if (!V.safe(cur, card)) continue;
      for (const t in cur.p) if (cur.k[t] === 'found') {
        const m = { f, i: P.c.length - 1, t };
        if (canMove(V, cur, m)) { cur = apply(V, cur, m); moves.push(m); again = true; break; }
      }
      if (again) break;
    }
  }
  return { s: cur, moves };
}
// lên đích tham lam (không bấm nọc): thắng được thì trả về chuỗi nước
export function greedyFinish(V, s, limit = 400) {
  let cur = s; const moves = [];
  for (let n = 0; n < limit; n++) {
    if (V.won(cur)) return moves;
    let found = null;
    outer: for (const f in cur.p) {
      const kf = cur.k[f]; if (kf === 'found' || kf === 'stock') continue;
      const P = cur.p[f]; if (!P.c.length) continue;
      for (const t in cur.p) if (cur.k[t] === 'found' || (V.finishTo && V.finishTo(t))) {
        const m = { f, i: P.c.length - 1, t };
        if (canMove(V, cur, m)) { found = m; break outer; }
      }
    }
    if (!found) return V.won(cur) ? moves : null;
    cur = apply(V, cur, found); moves.push(found);
  }
  return null;
}

// ---------- khoá trạng thái (cho bộ giải) + điểm heuristic ----------
const ch = c => String.fromCharCode(40 + c);
function pileKey(P) { let s = P.d + ':'; for (const c of P.c) s += ch(c); return s; }
export function key(V, s) {
  if (V.key) return V.key(s);
  const groups = {}; const parts = [];
  for (const id in s.p) {
    const k = s.k[id]; const pk = pileKey(s.p[id]);
    if ((k === 'tab' || k === 'cell') && !(V.ordered)) (groups[k] = groups[k] || []).push(pk); else parts.push(pk);
  }
  for (const g of Object.keys(groups).sort()) parts.push(groups[g].sort().join('|'));
  return parts.join('/') + (V.xkey ? '#' + V.xkey(s) : '');
}
export function heur(V, s) {
  if (V.heur) return V.heur(s);
  let f = 0, down = 0, brk = 0, cells = 0, emptyT = 0, rest = 0;
  for (const id in s.p) {
    const P = s.p[id], k = s.k[id], n = P.c.length;
    if (k === 'found') f += n;
    else if (k === 'tab') { down += P.d; if (!n) emptyT++; for (let i = Math.max(P.d + 1, 1); i < n; i++) if (!V.link(P.c[i - 1], P.c[i])) brk++; }
    else if (k === 'cell') cells += n;
    else rest += n;
  }
  return -f * 20 + down * 6 + brk * 4 + cells * 3 - emptyT * 3 + rest;
}

// ---------- gợi ý ----------
// seen: Set các key đã đi qua trong ván (tránh gợi ý đi vòng)
export function hintMove(V, s, seen = new Set(), solveFn = null) {
  if (solveFn) { const r = solveFn(V, s, { maxNodes: 1500, maxMs: 90 }); if (r.res === 'win' && r.moves.length) return { m: r.moves[0], sure: true }; }
  const ms = legalMoves(V, s); if (!ms.length) return null;
  const h0 = heur(V, s);
  let best = null, bs = -Infinity;
  for (const m of ms) {
    const n = apply(V, s, m); if (!n) continue;
    if (V.won(n)) return { m, sure: true };
    let sc = h0 - heur(V, n);
    if (seen.has(key(V, n))) sc -= 1000;
    if (m.k === 'stock') sc = Math.min(sc, 0) - 3;
    else {
      const F = s.p[m.f];
      if (s.k[m.f] === 'found') sc -= 40; // kéo từ đích xuống: chỉ khi bí
      if (m.i > 0 && m.i === F.d) sc += 8; // lật được lá úp
      if (m.i === 0 && !s.p[m.t].c.length && s.k[m.f] === s.k[m.t]) sc -= 60; // dời cả cột sang cột trống: vô nghĩa
      if (s.k[m.t] === 'found') sc += 6;
    }
    if (sc > bs) { bs = sc; best = m; }
  }
  if (!best || bs <= -900) return null;
  return { m: best, sure: false };
}
