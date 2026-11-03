// Bot Cát tê: chỉ dùng thông tin công khai (bài mình + các lá đã ngửa), không nhìn trộm bài úp hay bài người khác.
// Ý tưởng: chưa có tồn thì tìm cách ăn 1 vòng để sống; có tồn rồi thì úp lá nhỏ, để dành lá to cho 2 vòng lật bài.
import { getPlayer, waitingOn, beats, fullDeck, seenCards, active, CUT } from './engine.js';

function ctx(s, pid) {
  const me = getPlayer(s, pid);
  const known = new Set([...me.hand.map(c => c.id), ...seenCards(s).map(c => c.id)]);
  // lá mình đã úp (mình biết)
  for (const h of s.history) for (const x of h.plays) if (x.pid === pid && x.card) known.add(x.card.id);
  if (s.trick) for (const x of s.trick.plays) if (x.pid === pid && x.card) known.add(x.card.id);
  const unseen = fullDeck().filter(c => !known.has(c.id));
  return { me, unseen };
}
// xác suất không ai trong `cards` lá bài của đối thủ có lá cùng chất lớn hơn c
function safeP(c, unseen, oppCards) {
  if (!unseen.length) return 1;
  const q = Math.min(1, oppCards / unseen.length);
  const higher = unseen.filter(u => u.s === c.s && u.r > c.r).length;
  return Math.pow(1 - q, higher);
}
const low = cards => [...cards].sort((a, b) => a.r - b.r || (a.id < b.id ? -1 : 1));

export function botAction(s, pid) {
  if (!waitingOn(s).includes(pid)) return null;
  const { me, unseen } = ctx(s, pid);
  const hand = me.hand; if (!hand.length) return null;
  if (hand.length === 1) return { type: 'play', card: hand[0].id };
  const t = s.trick;
  const others = active(s).filter(p => p.id !== pid);
  const oppAll = others.reduce((n, p) => n + p.hand.length, 0);
  // số lá của những người còn phải đánh sau mình trong vòng này
  const played = new Set(t.plays.map(x => x.pid));
  const after = others.filter(p => !played.has(p.id) && !(s.chung && p.id in (s.chung.picks || {})));
  const oppAfter = s.phase === 'chung' ? 0 : after.reduce((n, p) => n + p.hand.length, 0);
  const play = (c, down = false) => ({ type: 'play', card: c.id, down });

  // ---------- vòng 5 (2 lá): chọn lá để ăn vòng 5 rồi giữ lá chắc nhất cho vòng 6 ----------
  if (t.no === CUT + 1) {
    const [a, b] = hand;
    const keepVal = y => safeP(y, unseen, oppAll * 0.5); // vòng 6: còn ~1 lá mỗi đối thủ
    const followVal = y => 0.25 * (y.r - 2) / 12;       // vòng 6 đi sau: phải trùng chất và to hơn lá cái
    const value = (x, y) => {
      if (!t.plays.length) { const w = safeP(x, unseen, oppAll); return w * keepVal(y) + (1 - w) * followVal(y); }
      const top = t.top.card;
      if (!beats(x, top)) return followVal(y) * 0.8;
      const w = safeP(x, unseen, s.phase === 'chung' ? Math.max(0, others.length - 1) * 2 : oppAfter);
      return w * keepVal(y) + (1 - w) * followVal(y);
    };
    return value(a, b) >= value(b, a) ? play(a) : play(b);
  }

  // ---------- vòng 1–4 ----------
  const need = me.won === 0;
  const left = CUT - t.no; // số vòng còn lại trước khi chốt sống/chết (sau vòng này)
  const sorted = low(hand);
  if (!t.plays.length) {
    // cầm cái
    if (need) {
      const sc = hand.map(c => ({ c, p: safeP(c, unseen, oppAll) })).sort((x, y) => y.p - x.p || x.c.r - y.c.r);
      const best = sc[0].p;
      // lá chắc ăn mà nhỏ nhất (đỡ phí lá to)
      const ok = sc.filter(x => x.p >= best - 0.08).sort((x, y) => x.c.r - y.c.r)[0];
      if (best >= 0.5 || left === 0) return play(ok.c);
      // chưa chắc: còn vòng thì thử lá vừa, giữ Át cho vòng sau
      const mid = sc.filter(x => x.c.r < 14).sort((x, y) => y.p - x.p || x.c.r - y.c.r)[0];
      return play((mid || ok).c);
    }
    // có tồn rồi: quăng lá nhỏ nhất, giữ lá to cho lật bài
    return play(sorted[0]);
  }
  const top = t.top.card;
  const bt = low(hand.filter(c => beats(c, top)));
  const lastToAct = after.length === 0;
  if (need) {
    if (!bt.length) return play(sorted[0], true);
    if (lastToAct) return play(bt[0]);
    const sc = bt.map(c => ({ c, p: safeP(c, unseen, oppAfter) }));
    const cheap = sc.find(x => x.p >= 0.6);
    if (cheap) return play(cheap.c);
    const best = [...sc].sort((x, y) => y.p - x.p || x.c.r - y.c.r)[0];
    if (left === 0 || best.p >= 0.3) return play(best.c);
    return play(sorted[0], true);
  }
  // đã có tồn: lá nhỏ nhất đè được thì đè luôn (vừa xả lá vừa có thể ăn)
  if (bt.length && bt[0].id === sorted[0].id) return play(bt[0]);
  // người đang ăn vòng này chưa có tồn → đè cho họ chết, miễn không phải dùng 2 lá to nhất
  const holder = getPlayer(s, t.top.pid);
  if (holder && holder.won === 0 && bt.length) {
    const top2 = new Set(sorted.slice(-2).map(c => c.id));
    const c = bt.find(x => !top2.has(x.id) && (lastToAct || safeP(x, unseen, oppAfter) >= 0.5));
    if (c) return play(c);
  }
  return play(sorted[0], true);
}
