// Bot Ba Cào: chỉ cần đặt cược hợp lý (bài chia sau khi cược nên không nhìn được gì) và nặn xong thì chốt.
// Bot không nhìn trộm bộ bài hay bài người khác.
import { getP, maxBetOf, canBeg, isPot, handInfo, compareCards, SUITS } from './engine.js?v=2';

const R = () => Math.random();
// Cược: phần lớn nhỏ, vốn dày thì mạnh tay hơn, sắp cạn vốn thì rón rén; thỉnh thoảng "tất tay" cho vui
export function betAmount(s, p, r = R) {
  const o = s.opts, max = maxBetOf(s, p), min = o.minBet;
  const steps = [1, 1, 1, 2, 2, 3, 5, 5, 10];
  let amt = min * steps[Math.floor(r() * steps.length)];
  const ratio = p.chips / o.startChips;
  if (ratio > 1.5 && r() < 0.35) amt *= 2;
  if (ratio < 0.4) amt = Math.min(amt, min * 2);
  amt = Math.min(amt, Math.max(min, Math.floor(p.chips * 0.25 / min) * min)); // không đặt quá 1/4 vốn
  if (r() < 0.03) amt = max; // tất tay
  amt = Math.max(min, Math.min(max, amt));
  return Math.floor(amt / min) * min || min;
}
export function botAction(s, pid) {
  const p = getP(s, pid); if (!p) return null;
  if (s.phase === 'bet') {
    if (pid === s.caiId) return canBeg(s, p) ? { type: 'beg' } : null;
    if (p.betDone) return null;
    if (canBeg(s, p)) return { type: 'beg' };
    return isPot(s) ? { type: 'bet' } : { type: 'bet', amount: betAmount(s, p) };
  }
  if (s.phase === 'peek' && !p.ready) return { type: 'ready' };
  return null;
}
// Ước lượng cửa thắng của 1 tay bài (Monte Carlo trên các lá mình chưa thấy). Dùng cho gợi ý khi chơi với bot.
// opp: số đối thủ (nhà cái: 1 – chỉ so với cái; chơi gà: số người còn lại)
export function winChance(cards, opts, opp = 1, n = 1500, r = R) {
  const seen = new Set(cards.map(c => c.id));
  const rest = [];
  for (const su of SUITS) for (let k = 1; k <= 13; k++) { const id = (k === 1 ? 'A' : k === 11 ? 'J' : k === 12 ? 'Q' : k === 13 ? 'K' : String(k)) + su; if (!seen.has(id)) rest.push({ r: k, s: su, id }); }
  let win = 0, tie = 0;
  for (let t = 0; t < n; t++) {
    // xáo một phần đủ dùng
    const need = opp * 3;
    for (let i = 0; i < need; i++) { const j = i + Math.floor(r() * (rest.length - i)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    let lost = false, tied = false;
    for (let k = 0; k < opp && !lost; k++) {
      const c = compareCards(cards, rest.slice(k * 3, k * 3 + 3), opts).c;
      if (c < 0) lost = true; else if (c === 0) tied = true;
    }
    if (!lost) { if (tied) tie++; else win++; }
  }
  return { win: win / n, tie: tie / n, kind: handInfo(cards, opts).kind };
}
