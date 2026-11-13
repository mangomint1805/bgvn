// Bot Tiến Lên: 4 cấp – easy (🐣 Gà mờ), normal (🙂 Vừa), hard (😈 Cao thủ), master (👑 Huyền thoại)
import { classify, legalFor, rankOf, HEO, isHang, isHeoCombo, isChop, getPlayer, current, applyAction } from './engine.js?v=5';

export const LEVELS = { easy: '🐣 Gà mờ', normal: '🙂 Vừa', hard: '😈 Cao thủ', master: '👑 Huyền thoại' };

// ---------- tách bài thành các bộ (để đánh giá tay bài) ----------
function cnts(hand) { const c = new Array(13).fill(0); for (const x of hand) c[rankOf(x)]++; return c; }
// trả về danh sách "bộ" dạng { type, len, top(rank) } theo 1 chiến lược
function split(hand, straightsFirst) {
  const c = cnts(hand), out = [];
  for (let r = 0; r < 12; r++) if (c[r] === 4) { out.push({ type: 'quad', len: 4, r }); c[r] = 0; }
  // đôi thông
  for (let s = 0; s < 12; s++) {
    if (c[s] < 2) continue;
    let e = s; while (e + 1 < 12 && c[e + 1] >= 2) e++;
    if (e - s + 1 >= 3) { for (let r = s; r <= e; r++) c[r] -= 2; out.push({ type: 'pairs', len: e - s + 1, r: e }); }
    s = e;
  }
  const takeStraights = onlySingles => {
    let again = true;
    while (again) {
      again = false;
      let best = null;
      for (let s = 0; s < 12; s++) {
        let e = s;
        const ok = r => c[r] > 0 && (!onlySingles || c[r] === 1 || c[r] === 3);
        if (!ok(s)) continue;
        while (e + 1 < 12 && ok(e + 1)) e++;
        if (e - s + 1 >= 3 && (!best || e - s > best[1] - best[0])) best = [s, e];
      }
      if (best) { for (let r = best[0]; r <= best[1]; r++) c[r]--; out.push({ type: 'straight', len: best[1] - best[0] + 1, r: best[1] }); again = true; }
    }
  };
  if (straightsFirst) takeStraights(false); else takeStraights(true);
  for (let r = 0; r < 13; r++) {
    if (c[r] === 4) out.push({ type: 'quad', len: 4, r });
    else if (c[r] === 3) out.push({ type: 'triple', len: 3, r });
    else if (c[r] === 2) out.push({ type: 'pair', len: 2, r });
    else if (c[r] === 1) out.push({ type: 'single', len: 1, r });
  }
  return out;
}
// điểm tay bài: càng thấp càng tốt (≈ số lượt cần để hết bài, trừ phần "kiểm soát" của heo / hàng)
function scoreParts(parts) {
  let sc = 0;
  for (const p of parts) {
    sc += 1;
    if (p.type === 'quad' || p.type === 'pairs') sc -= 1.3;
    else if (p.r === HEO) sc -= 0.9;
    else if (p.r === 11) sc -= 0.35;
    else if (p.type === 'single') sc += 0.35 * (1 - p.r / 11);
    else if (p.type === 'pair') sc += 0.12 * (1 - p.r / 11);
  }
  return sc;
}
export function handScore(hand) {
  if (!hand.length) return -100;
  return Math.min(scoreParts(split(hand, true)), scoreParts(split(hand, false)));
}
export const splitHand = split;

// lá có phải lớn nhất còn lại (không ai đè nổi) – chỉ dùng thông tin công khai + bài mình
function isBossSingle(s, hand, top) {
  const gone = new Set([...(s.gone || []), ...hand]);
  for (let c = top + 1; c < 52; c++) if (!gone.has(c)) return false;
  return true;
}

// bộ này còn ai đè được không (chỉ xét bài chưa lộ: chưa đánh và không nằm trong tay mình)
export function isBoss(s, hand, c) {
  const seen = new Set([...(s.gone || []), ...hand]);
  const un = new Array(13).fill(0), hiTop = new Array(13).fill(false);
  const tr = rankOf(c.top);
  for (let x = 0; x < 52; x++) if (!seen.has(x)) { un[rankOf(x)]++; if (rankOf(x) === tr && x > c.top) hiTop[tr] = true; }
  if (c.type === 'single' || c.type === 'pair' || c.type === 'triple') {
    const k = c.len;
    if (hiTop[tr] && un[tr] >= k) return false;
    for (let r = tr + 1; r < 13; r++) if (un[r] >= k) return false;
    return true;
  }
  if (c.type === 'straight' || c.type === 'pairs') {
    const k = c.type === 'pairs' ? 2 : 1;
    for (let e = tr; e < 12; e++) {
      if (e === tr && !hiTop[tr]) continue;
      let ok = true; for (let r = e - c.len + 1; r <= e; r++) if (r < 0 || un[r] < k) { ok = false; break; }
      if (ok) return false;
    }
    return true;
  }
  return true;
}
// thứ tự ưu tiên các nước đi (dùng cho bot và nút 💡 Gợi ý)
export function rankPlays(s, pid, level = 'normal') {
  const p = getPlayer(s, pid); if (!p) return [];
  const table = s.table && s.table.combo;
  const plays = legalFor(s, pid);
  const veHeo = (s.opts && s.opts.veHeo) || 'free';
  const base = handScore(p.hand);
  const others = s.players.filter(q => q.id !== pid && !q.out);
  const minOpp = others.length ? Math.min(...others.map(q => q.hand ? q.hand.length || q.handCount || 13 : 13)) : 13;
  const endgame = p.hand.length <= 5 || minOpp <= 3;
  // cao thủ: còn ≤ 1 bộ "không ai đè nổi" thì đánh hết các bộ chắc thắng trước rồi về
  let plan = false;
  if (level === 'hard' && !table) {
    const parts = split(p.hand, true);
    plan = parts.length <= 4 && parts.filter(q => q.type !== 'quad' && q.type !== 'pairs' && q.r !== HEO && q.r !== 11).length <= 1;
  }
  const scored = plays.map(ids => {
    const c = classify(ids), rest = p.hand.filter(x => !ids.includes(x));
    let sc = handScore(rest) - base;
    if (!rest.length) sc = -999; // về luôn
    // cấm về heo: đừng để trên tay chỉ còn heo (sẽ kẹt, bị thối) – giữ lại 1 lá thường để về
    else if (veHeo !== 'free' && rest.every(x => rankOf(x) === HEO)) sc += 8;
    const heoUsed = ids.filter(x => rankOf(x) === HEO).length;
    if (table) {
      if (isChop(c, table)) sc -= isHeoCombo(table) ? 4 : 2.5; // chặt được là chặt
      else if (isHang(c)) sc += endgame ? 0.5 : 2.5;
      if (heoUsed && !isHeoCombo(table) && !endgame) sc += rankOf(table.top) >= 10 ? 0.4 : 1.4;
    } else {
      // cầm cái: xả bộ nhỏ trước, giữ heo / hàng
      if (heoUsed) sc += endgame ? 0.3 : 2;
      if (isHang(c)) sc += endgame ? 0.8 : 3;
      sc += (rankOf(c.top) / 12) * 0.9 - (c.len - 1) * 0.08;
      if (level === 'hard' && minOpp === 1 && c.type === 'single' && !isBossSingle(s, p.hand, c.top)) sc += 2.5; // đối thủ còn 1 lá: đừng ra lẻ nhỏ
      if (level === 'hard' && minOpp === 2 && c.type === 'pair') sc += 0.8;
      if (level === 'hard' && plan) { if (isBoss(s, p.hand, c)) sc -= 3; }
    }
    // đè lá lẻ khi đối thủ sắp về: hard thì đè bằng lá to nhất
    if (table && level === 'hard' && minOpp === 1 && table.type === 'single' && c.type === 'single') sc -= c.top / 52;
    return { ids, c, sc };
  });
  scored.sort((a, b) => a.sc - b.sc || a.c.top - b.c.top);
  return scored;
}

export function botAction(s, pid, level = 'normal') {
  if (!s || s.phase !== 'playing') return null;
  const p = getPlayer(s, pid); if (!p || current(s) !== p) return null;
  if (level === 'master') return masterAction(s, pid);
  const r = rankPlays(s, pid, level);
  if (!s.table) {
    if (!r.length) return null; // không thể xảy ra (cầm cái luôn có lá lẻ)
    if (level === 'easy') { const pick = r.slice().sort((a, b) => a.c.top - b.c.top)[0]; return { type: 'play', cards: Math.random() < 0.7 ? pick.ids : r[0].ids }; }
    return { type: 'play', cards: r[0].ids };
  }
  if (!r.length) return { type: 'pass' };
  if (level === 'easy') {
    const chop = r.find(x => isChop(x.c, s.table.combo));
    if (chop && Math.random() < 0.6) return { type: 'play', cards: chop.ids };
    if (Math.random() < 0.15) return { type: 'pass' };
    const small = r.filter(x => !isHang(x.c)).sort((a, b) => a.c.top - b.c.top)[0] || r[0];
    return { type: 'play', cards: small.ids };
  }
  const best = r[0];
  const minOpp = Math.min(...s.players.filter(q => q.id !== pid && !q.out).map(q => q.hand.length));
  const passCost = level === 'hard' ? (minOpp <= 2 ? 1.6 : 0.45) : 0.6;
  if (best.sc < passCost) return { type: 'play', cards: best.ids };
  return { type: 'pass' };
}

// ---------- 👑 Huyền thoại: "đánh thử trong đầu" (Monte Carlo) ----------
// Bot KHÔNG nhìn bài người khác: nó chỉ biết bài mình, các lá đã đánh và số lá mỗi người còn (đều là thông tin công khai).
// Nó chia ngẫu nhiên số bài chưa lộ cho các đối thủ (đúng số lá), với mỗi nước đi có thể thì chơi thử tới hết ván,
// lặp lại nhiều lần rồi chọn nước có kết quả trung bình (tiền thắng/thua) tốt nhất.
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function cloneState(s) {
  return { ...s, players: s.players.map(p => ({ ...p, hand: p.hand.slice() })), gone: s.gone.slice(), finished: s.finished.slice(), table: s.table ? { ...s.table } : null,
    trick: [], log: [], fx: [], pays: [], delta: { ...s.delta }, places: s.places ? s.places.slice() : s.places };
}
function sampleWorld(s, pid) {
  const me = getPlayer(s, pid), seen = new Set([...(s.gone || []), ...me.hand]);
  const pool = []; for (let c = 0; c < 52; c++) if (!seen.has(c)) pool.push(c);
  shuffle(pool);
  const w = cloneState(s);
  for (const q of w.players) if (q.id !== pid) { const n = q.hand.length; q.hand = pool.splice(0, n); } /* chỉ dùng SỐ LÁ, không dùng bài thật */
  return w;
}
function rollout(w, pid) {
  let k = 0;
  while (w.phase === 'playing' && k++ < 400) {
    const c = current(w), a = botAction(w, c.id, c.id === pid ? 'hard' : 'normal');
    if (!a || !applyAction(w, c.id, a).ok) break;
  }
  const me = w.players.find(p => p.id === pid);
  return (w.delta[pid] || 0) / ((w.opts && w.opts.bet) || 1) + (me && me.place === 1 ? 0.5 : 0);
}
function masterAction(s, pid) {
  const r = rankPlays(s, pid, 'hard');
  if (!r.length) return s.table ? { type: 'pass' } : null;
  if (r.length === 1 && !s.table) return { type: 'play', cards: r[0].ids };
  const cands = r.slice(0, s.table ? 6 : 8).map(x => ({ a: { type: 'play', cards: x.ids }, sum: 0, n: 0 }));
  if (s.table) cands.push({ a: { type: 'pass' }, sum: 0, n: 0 });
  const t0 = Date.now(), BUDGET = 220;
  let worlds = 0;
  while (worlds < 400 && (worlds < 12 || Date.now() - t0 < BUDGET)) {
    const w = sampleWorld(s, pid); worlds++;
    for (const c of cands) {
      const x = cloneState(w);
      if (!applyAction(x, pid, c.a).ok) { c.sum -= 99; c.n++; continue; }
      c.sum += rollout(x, pid); c.n++;
    }
  }
  cands.sort((a, b) => b.sum / b.n - a.sum / a.n);
  return cands[0].a;
}
