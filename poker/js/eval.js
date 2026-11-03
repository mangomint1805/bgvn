// Đánh giá bài Poker (Texas Hold'em) – thuần JS, không phụ thuộc DOM.
// Lá bài là chuỗi 2 ký tự: hạng '23456789TJQKA' + chất 's' ♠ 'h' ♥ 'd' ♦ 'c' ♣ (vd. 'As', 'Td', '7h').
// Điểm tay bài là 1 số nguyên: càng lớn càng mạnh, bằng nhau là hoà (chia pot).
//   score = hạng (0..8) * 2^20 + 5 lá quyết định (mỗi lá 4 bit, lá quan trọng trước)
export const RANKS = '23456789TJQKA';
export const SUITS = 'shdc';
export const rankOf = c => RANKS.indexOf(c[0]) + 2; // 2..14
export const suitOf = c => c[1];

// Tên hạng bài tiếng Việt (0 = yếu nhất)
export const CAT_NAME = ['Mậu thầu', 'Một đôi', 'Hai đôi', 'Sám cô', 'Sảnh', 'Thùng', 'Cù lũ', 'Tứ quý', 'Thùng phá sảnh'];
export const CAT_EN = ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];
// tên lá khi nói: "đôi K", "Sám cô 7", "Sảnh tới 10"
export const RANK_VI = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: '10', 9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2' };

const enc = (cat, ks) => { let s = cat; for (let i = 0; i < 5; i++) s = s * 16 + (ks[i] || 0); return s; };
export const catOf = score => Math.floor(score / 1048576); // 16^5

// ---- Đánh giá nhanh 5–7 lá (dùng cho bot mô phỏng và so bài) ----
// codes: mảng số r*4+s (r 2..14, s 0..3)
export function evalCodes(codes) {
  const rc = new Array(15).fill(0), sc = [0, 0, 0, 0], bySuit = [[], [], [], []];
  for (const c of codes) { const r = c >> 2, s = c & 3; rc[r]++; sc[s]++; bySuit[s].push(r); }
  // thùng?
  let fs = -1; for (let s = 0; s < 4; s++) if (sc[s] >= 5) fs = s;
  if (fs >= 0) {
    const rs = bySuit[fs].sort((a, b) => b - a);
    const sf = straightHigh(rs);
    if (sf) return enc(8, [sf]);
  }
  // nhóm theo số lượng
  const quads = [], trips = [], pairs = [], singles = [];
  for (let r = 14; r >= 2; r--) { const n = rc[r]; if (n === 4) quads.push(r); else if (n === 3) trips.push(r); else if (n === 2) pairs.push(r); else if (n === 1) singles.push(r); }
  if (quads.length) { const q = quads[0]; const k = Math.max(...[...trips, ...pairs, ...singles, ...quads.slice(1)], 0); return enc(7, [q, k]); }
  if (trips.length && (trips.length > 1 || pairs.length)) { const t = trips[0]; const p = Math.max(trips[1] || 0, pairs[0] || 0); return enc(6, [t, p]); }
  if (fs >= 0) return enc(5, bySuit[fs].slice(0, 5)); // đã sort giảm dần ở trên
  const distinct = []; for (let r = 14; r >= 2; r--) if (rc[r]) distinct.push(r);
  const st = straightHigh(distinct); if (st) return enc(4, [st]);
  if (trips.length) { const ks = [...pairs, ...singles].sort((a, b) => b - a).slice(0, 2); return enc(3, [trips[0], ...ks]); }
  if (pairs.length >= 2) { const k = Math.max(pairs[2] || 0, singles[0] || 0); return enc(2, [pairs[0], pairs[1], k]); }
  if (pairs.length) return enc(1, [pairs[0], ...singles.slice(0, 3)]);
  return enc(0, singles.slice(0, 5));
}
// rs: các hạng khác nhau hoặc có lặp, giảm dần → lá cao nhất của sảnh (5 nếu là sảnh A-2-3-4-5), 0 nếu không có
function straightHigh(rs) {
  const has = new Array(15).fill(false); for (const r of rs) has[r] = true; has[1] = has[14];
  for (let h = 14; h >= 5; h--) { let ok = true; for (let k = 0; k < 5; k++) if (!has[h - k]) { ok = false; break; } if (ok) return h; }
  return 0;
}
export const toCode = c => (rankOf(c) << 2) | SUITS.indexOf(c[1]);
export const scoreOf = cards => evalCodes(cards.map(toCode));

// ---- Đánh giá đầy đủ: điểm + 5 lá tạo thành bài (để tô sáng) + tên tiếng Việt ----
export function evaluate(cards) {
  const score = scoreOf(cards);
  const best = cards.length <= 5 ? orderFive(cards) : bestFive(cards, score);
  return { score, cat: catOf(score), best, name: CAT_NAME[catOf(score)], desc: describe(score, best) };
}
function combos(arr, k, start = 0, cur = [], out = []) {
  if (cur.length === k) { out.push(cur.slice()); return out; }
  for (let i = start; i <= arr.length - (k - cur.length); i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); }
  return out;
}
function bestFive(cards, score) {
  for (const c5 of combos(cards, 5)) if (scoreOf(c5) === score) return orderFive(c5);
  return cards.slice(0, 5);
}
// xếp 5 lá theo thứ tự "đọc bài": nhóm nhiều lá trước, cao trước; sảnh A-2-3-4-5 thì A đứng cuối
function orderFive(c5) {
  const cnt = {}; for (const c of c5) cnt[rankOf(c)] = (cnt[rankOf(c)] || 0) + 1;
  const sorted = [...c5].sort((a, b) => cnt[rankOf(b)] - cnt[rankOf(a)] || rankOf(b) - rankOf(a));
  const rs = sorted.map(rankOf);
  if (rs.join() === '14,5,4,3,2') sorted.push(sorted.shift());
  return sorted;
}
// Mô tả chi tiết: "Một đôi K", "Hai đôi A và 8", "Sảnh tới 5 (A-2-3-4-5)", "Cù lũ: ba lá 8, đôi 3"…
export function describe(score, best) {
  const cat = catOf(score), k = []; let s = score; for (let i = 0; i < 5; i++) { k.unshift(s % 16); s = Math.floor(s / 16); }
  const R = r => RANK_VI[r];
  switch (cat) {
    case 8: return k[0] === 14 ? 'Thùng phá sảnh Hoàng gia (10-J-Q-K-A)' : `Thùng phá sảnh tới ${R(k[0])}`;
    case 7: return `Tứ quý ${R(k[0])}`;
    case 6: return `Cù lũ: ba lá ${R(k[0])}, đôi ${R(k[1])}`;
    case 5: return `Thùng ${R(k[0])} cao`;
    case 4: return k[0] === 5 ? 'Sảnh tới 5 (A-2-3-4-5)' : `Sảnh tới ${R(k[0])}`;
    case 3: return `Sám cô ${R(k[0])}`;
    case 2: return `Hai đôi ${R(k[0])} và ${R(k[1])}`;
    case 1: return `Một đôi ${R(k[0])}`;
    default: return `Mậu thầu ${R(k[0])} cao`;
  }
}
// So bài: >0 nếu a mạnh hơn b
export const compare = (a, b) => scoreOf(a) - scoreOf(b);

// Gợi ý bài tẩy trước flop cho người mới (không phải lời khuyên tuyệt đối)
export function preflopTier(hole) {
  const [a, b] = hole.map(rankOf).sort((x, y) => y - x), suited = hole[0][1] === hole[1][1];
  const nm = `${RANK_VI[a]} ${RANK_VI[b]}`;
  if (a === b) return { name: `Đôi ${RANK_VI[a]}`, tier: a >= 10 ? 3 : a >= 7 ? 2 : 1 };
  const gap = a - b;
  let tier = 0;
  if (a === 14 && b >= 10) tier = 3;
  else if (a >= 13 && b >= 11) tier = suited ? 3 : 2;
  else if (a === 14 && (suited || b >= 9)) tier = 2;
  else if (b >= 10) tier = 2;
  else if (suited && gap <= 2 && b >= 5) tier = 1;
  else if (a >= 12 && b >= 8) tier = 1;
  else if (a === 14) tier = 1;
  return { name: nm + (suited ? ' đồng chất' : ''), tier };
}
export const TIER_TXT = ['bài yếu – cân nhắc bỏ', 'tạm được', 'khá mạnh 👍', 'rất mạnh 💪'];
