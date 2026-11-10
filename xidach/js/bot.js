// Bot Xì dách: rút/dằn theo ngưỡng hợp lý, nhà cái bot xét bài có tính toán.
// Bot chỉ dùng thông tin công khai + bài của chính nó (không nhìn trộm bộ bài).
import { handInfo, handValue, getP, maxBetOf, canBeg, MAX_CARDS, RANK_TXT } from './engine.js?v=2';

const R = () => Math.random();
// Xác suất quắc nếu rút thêm 1 lá (tính trên các lá mình chưa thấy)
export function bustChance(s, pid) {
  const me = getP(s, pid), seen = new Set(me.cards.map(c => c.id));
  for (const p of s.players) if (p.revealed || (p.id === s.caiId && s.caiOpen)) for (const c of p.cards) seen.add(c.id);
  let bust = 0, tot = 0;
  for (const su of ['S', 'C', 'D', 'H']) for (let r = 1; r <= 13; r++) {
    const id = RANK_TXT(r) + su; if (seen.has(id)) continue;
    tot++; if (handValue([...me.cards, { r, s: su }], s.opts.aceRule) > 21) bust++;
  }
  return tot ? bust / tot : 1;
}
function betAmount(s, p) {
  const o = s.opts, max = maxBetOf(s, p), min = o.minBet;
  // phần lớn cược nhỏ, thỉnh thoảng "tất tay" cho vui
  const steps = [1, 1, 1, 2, 2, 3, 5, 5, 10, 20];
  let amt = min * steps[Math.floor(R() * steps.length)];
  if (p.chips > o.startChips * 1.5 && R() < 0.3) amt *= 2;
  amt = Math.max(min, Math.min(max, amt));
  return Math.floor(amt / min) * min || min;
}
function playerMove(s, p) {
  const o = s.opts, I = handInfo(p.cards, o), n = p.cards.length;
  if (I.kind === 'quac' || n >= MAX_CARDS) return null;
  if (I.kind === 'non') return { type: 'hit' };
  const t = I.pts, pb = bustChance(s, p.id);
  if (n === 4) return t <= 17 && pb < 0.62 && R() < (t <= 16 ? 0.75 : 0.4) ? { type: 'hit' } : { type: 'stand' }; // săn ngũ linh
  if (t <= 16) return pb < 0.6 && R() < 0.5 ? { type: 'hit' } : { type: 'stand' };
  if (t === 17) return pb < 0.45 && R() < 0.2 ? { type: 'hit' } : { type: 'stand' };
  return { type: 'stand' };
}
// Nhà cái bot: chưa đủ điểm thì rút; đủ rồi thì cân nhắc xét người rút nhiều lá trước rồi mới liều rút tiếp.
function caiMove(s, p) {
  const o = s.opts, I = handInfo(p.cards, o, o.caiMin), n = p.cards.length;
  if (I.kind === 'non' && n < MAX_CARDS) return { type: 'hit' };
  const pend = s.order.map(id => getP(s, id)).filter(q => !q.revealed);
  if (!pend.length) return { type: 'revealAll' };
  const t = I.pts;
  if (n >= MAX_CARDS || t >= 20) return { type: 'revealAll' };
  const pb = bustChance(s, p.id);
  // người đã rút ≥ 3 lá dễ quắc: xét trước để "chốt" phần thắng trước khi nhà cái liều rút (nhất là khi cùng quắc = hoà)
  const heavy = pend.filter(q => q.cards.length >= 3).sort((a, b) => b.cards.length - a.cards.length);
  const mayHit = t <= 16 ? pb < 0.7 : t === 17 ? pb < 0.5 : t === 18 ? pb < 0.3 && pend.length >= 3 : false;
  if (heavy.length && (mayHit || o.bothBust === 'hoa') && t <= 18) return { type: 'reveal', target: heavy[0].id };
  // người còn lại là người dằn với 2 lá (thường 17–21): điểm thấp thì phải liều thêm
  const light = pend.filter(q => q.cards.length === 2).length;
  if (mayHit && (t <= 16 || light >= Math.ceil(pend.length / 2))) return { type: 'hit' };
  // điểm cao: xét người 2 lá trước (dễ thua họ nếu rút), xong mới xét hết
  return { type: 'revealAll' };
}
export function botAction(s, pid) {
  const p = getP(s, pid); if (!p) return null;
  if (s.phase === 'bet') {
    if (pid === s.caiId) return canBeg(s, p) ? { type: 'beg' } : null;
    if (p.betDone) return null;
    if (canBeg(s, p)) return { type: 'beg' };
    return { type: 'bet', amount: betAmount(s, p) };
  }
  if (s.phase === 'play' && s.turn === pid) return playerMove(s, p);
  if (s.phase === 'dealer' && s.caiId === pid) return caiMove(s, p);
  return null;
}
