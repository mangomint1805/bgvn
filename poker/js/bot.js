// Bot Poker: chỉ nhìn góc nhìn của chính nó (viewFor) – không biết bài người khác, không biết bộ bài.
// Ước lượng sức mạnh bài bằng mô phỏng Monte Carlo (đối thủ cầm bài ngẫu nhiên), so với tỉ lệ pot (pot odds),
// thêm tính cách riêng từng bot (liều/nhát) và thỉnh thoảng tố bịp (bluff).
import { viewFor, rnd } from './engine.js?v=2';
import { evalCodes, toCode } from './eval.js?v=1';

const ALL = []; for (let r = 2; r <= 14; r++) for (let s = 0; s < 4; s++) ALL.push((r << 2) | s);

// Sức mạnh sơ bộ của 2 lá tẩy (0..3) – dùng để đoán "bài đối thủ thường là gì" khi họ tố
function tierCodes(a, b) {
  let r1 = a >> 2, r2 = b >> 2; if (r2 > r1) [r1, r2] = [r2, r1];
  const suited = (a & 3) === (b & 3);
  if (r1 === r2) return r1 >= 10 ? 3 : r1 >= 7 ? 2 : 1;
  if (r1 === 14 && r2 >= 10) return 3;
  if (r1 >= 13 && r2 >= 11) return suited ? 3 : 2;
  if (r1 === 14 && (suited || r2 >= 9)) return 2;
  if (r2 >= 10) return 2;
  if ((suited && r1 - r2 <= 2 && r2 >= 5) || (r1 >= 12 && r2 >= 8) || r1 === 14) return 1;
  return 0;
}
const catC = sc => Math.floor(sc / 1048576);
// bài đối thủ có "hợp" với cách họ cược không (level 0: thụ động … 3: tố rất to / tất tay)
function fits(a, b, bd, level, bdCat) {
  if (level <= 0) return true;
  if (!bd.length) { const t = tierCodes(a, b); return t >= level || rnd() < [1, 0.3, 0.15, 0.07][level]; }
  const sc = evalCodes([a, b, ...bd]), c = catC(sc);
  const made = c > bdCat; // lá tẩy góp vào bài
  let draw = false;
  if (!made && bd.length < 5) { const su = [0, 0, 0, 0]; for (const x of [a, b, ...bd]) su[x & 3]++; draw = su.some(n => n >= 4); }
  const need = [0, made || draw, made && (c >= 2 || topPair(a, b, bd)), made && c >= 2][level];
  return need || rnd() < [1, 0.35, 0.18, 0.08][level];
}
function topPair(a, b, bd) { const hi = Math.max(...bd.map(x => x >> 2)); return (a >> 2) === hi || (b >> 2) === hi || ((a >> 2) === (b >> 2) && (a >> 2) > hi); }

// tỉ lệ thắng (hoà tính nửa) của bài mình trước các đối thủ; levels[i] = mức hung hăng của đối thủ i
export function equity(hole, board, opp, iters = 300, levels = null) {
  const mine = hole.map(toCode), bd = board.map(toCode);
  const used = new Set([...mine, ...bd]);
  const deck = ALL.filter(c => !used.has(c));
  const need = 5 - bd.length, bdCat = bd.length >= 3 ? catC(evalCodes(bd)) : 0;
  let win = 0;
  for (let it = 0; it < iters; it++) {
    // xáo phần đầu bộ bài vừa đủ dùng (thêm chỗ dư để thử lại bài đối thủ)
    const k = Math.min(deck.length, need + opp * 2 + 22);
    for (let i = 0; i < k; i++) { const j = i + Math.floor(rnd() * (deck.length - i)); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    // chọn bài cho đối thủ trước (theo cách họ cược), phần còn lại chia nốt bàn
    let pos = 0; const oh = [];
    for (let o = 0; o < opp; o++) {
      const lv = levels ? levels[o] || 0 : 0;
      let tries = 0;
      while (tries < 10 && pos + 3 < k - need && !fits(deck[pos], deck[pos + 1], bd, lv, bdCat)) { pos += 2; tries++; }
      oh.push(deck[pos], deck[pos + 1]); pos += 2;
    }
    const full = bd.concat(deck.slice(pos, pos + need));
    const my = evalCodes(mine.concat(full));
    let ties = 0, lose = false;
    for (let o = 0; o < opp; o++) {
      const sc = evalCodes([oh[o * 2], oh[o * 2 + 1], ...full]);
      if (sc > my) { lose = true; break; }
      if (sc === my) ties++;
    }
    if (!lose) win += ties ? 1 / (ties + 1) : 1;
  }
  return win / iters;
}
// mức hung hăng của 1 đối thủ, chỉ dựa trên thông tin công khai
function oppLevel(v, p) {
  const t = p.last && p.last.t, pre = v.street === 'preflop';
  if (p.allIn) return 3;
  let lv = 0;
  if (t === 'raise') lv = pre ? (p.last.a >= 7 * v.bb ? 3 : 2) : 3;
  else if (t === 'bet') lv = p.last.a > 0.75 * Math.max(1, v.pot - p.last.a) ? 3 : 2;
  else if (t === 'call') lv = 1;
  if (!pre && p.total > 6 * v.bb) lv = Math.max(lv, 1);
  return lv;
}

// tính cách bot theo id (cố định cả ván): aggr = độ hung hăng, loose = độ "lỏng tay", bluff = hay bịp
function persona(id) {
  let h = 7; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const f = k => ((h >>> (k * 5)) % 100) / 100;
  return { aggr: 0.85 + f(0) * 0.5, loose: 0.9 + f(1) * 0.25, bluff: 0.6 + f(2) * 0.9 };
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function botAction(state, pid) {
  const v = viewFor(state, pid);
  const me = v.players.find(p => p.id === pid);
  if (!me) return null;
  if (v.phase !== 'playing') return me.busted && v.opts.mode === 'cash' ? { type: 'rebuy' } : null;
  const L = v.legal; if (!L) return null;
  return decide(v, me, L, persona(pid));
}

export function decide(v, me, L, P) {
  const opps = v.players.filter(p => p.id !== me.id && p.inHand && !p.folded);
  const nOpp = Math.max(1, opps.length);
  const pre = v.street === 'preflop';
  const ranked = opps.map(p => oppLevel(v, p)).sort((a, b) => b - a).slice(0, 5);
  let eq = equity(me.hole, v.board, ranked.length || 1, pre ? 160 : 260, ranked);
  // mỗi đối thủ thêm là thêm khả năng có người cầm bài to → chuẩn hoá về "so với bàn"
  const fair = 1 / (nOpp + 1);
  const rel = eq / fair; // >1: mạnh hơn trung bình
  const pot = L.pot, toCall = L.toCall, stack = me.chips;
  const potOdds = toCall / (pot + toCall || 1);
  // đối thủ cược càng to so với pot thì bài họ càng có thể mạnh – trừ hao
  const pressure = toCall / Math.max(1, pot - toCall);
  if (toCall > 0) eq -= clamp(0.03 * pressure, 0, 0.06) / P.loose;
  const r = rnd();
  const raiseTo = frac => {
    const base = v.currentBet + frac * (pot + toCall);
    let to = Math.round(base / v.sb) * v.sb;
    to = clamp(to, L.minTo, L.maxTo);
    if (to > L.maxTo * 0.8) to = L.maxTo; // gần hết chip thì tất tay luôn
    return { type: 'raise', to };
  };
  const late = v.street === 'turn' || v.street === 'river';
  const strong = rel > 2.1 || eq > 0.72;
  const good = rel > 1.45 || eq > 0.55;
  if (L.canCheck) {
    if (strong && L.canRaise) return r < 0.18 ? { type: 'check' } : raiseTo((0.55 + rnd() * 0.45) * P.aggr); // thỉnh thoảng giăng bẫy
    if (good && L.canRaise && r < 0.55 * P.aggr) return raiseTo(0.4 + rnd() * 0.35);
    // bịp: ít đối thủ, vòng sau, không ai cược
    if (L.canRaise && !pre && nOpp <= 2 && r < 0.11 * P.bluff * (late ? 1.3 : 1)) return raiseTo(0.5 + rnd() * 0.4);
    if (pre && L.canRaise && rel > 1.25 && r < 0.3 * P.aggr) return raiseTo(0.6);
    return { type: 'check' };
  }
  // phải theo
  const allInCall = toCall >= stack;
  if (strong) {
    if (L.canRaise && r < 0.5 * P.aggr && !allInCall) return raiseTo((0.7 + rnd() * 0.5) * P.aggr);
    return { type: 'call' };
  }
  const margin = pre ? 0.02 : 0.05;
  if (eq > potOdds + margin) {
    if (good && L.canRaise && r < 0.18 * P.aggr && !allInCall) return raiseTo(0.6 + rnd() * 0.3);
    return { type: 'call' };
  }
  // rẻ thì theo xem thêm (nhất là trước flop / có cửa ra bài)
  const cheap = toCall <= Math.max(v.bb, stack * 0.03) * P.loose;
  if (cheap && eq > potOdds - 0.08) return { type: 'call' };
  if (pre && toCall <= v.bb && rel > 0.85 * (2 - P.loose)) return { type: 'call' };
  // tố bịp hiếm hoi
  if (L.canRaise && late && nOpp === 1 && pressure < 0.7 && r < 0.05 * P.bluff) return raiseTo(1);
  return { type: 'fold' };
}
