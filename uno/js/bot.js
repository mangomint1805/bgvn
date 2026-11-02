// Bot UNO đơn giản mà khôn vừa phải.
import { getPlayer, current, playableIds, COLORS, DRAW_VALUE, isWild } from './engine.js';

function bestColor(hand) {
  const cnt = { R: 0, Y: 0, G: 0, B: 0 };
  for (const c of hand) if (!isWild(c)) cnt[c.color]++;
  return COLORS.reduce((a, b) => cnt[b] > cnt[a] ? b : a, COLORS[Math.floor(Math.random() * 4)]);
}

export function botAction(s, pid) {
  const p = getPlayer(s, pid); if (!p || p.out || s.phase !== 'playing') return null;
  const pr = s.pending;
  if (pr) {
    if (pr.player !== pid) return null;
    if (pr.type === 'color' || pr.type === 'roulette') return { type: 'color', color: bestColor(p.hand) };
    if (pr.type === 'target') { const o = s.players.filter(q => !q.out && q !== p).sort((a, b) => a.hand.length - b.hand.length); return { type: 'target', target: o[0].id }; }
    if (pr.type === 'swap') {
      const others = s.players.filter(q => !q.out && q !== p).sort((a, b) => a.hand.length - b.hand.length);
      return { type: 'swap', target: others[0].id };
    }
    return null;
  }
  if (current(s) !== p) return null;
  const ids = playableIds(s, pid);
  if (p.hand.length <= 2 && !p.saidUno && ids.length && Math.random() < 0.85) return { type: 'uno' };
  if (!ids.length) {
    if (s.stack || s.skipStack || s.up) return { type: 'take' };
    if (s.lastDraw && s.lastDraw.player === pid) return { type: 'pass' };
    return { type: 'draw' };
  }
  const cards = p.hand.filter(c => ids.includes(c.id));
  const nextSmall = s.players.some(q => !q.out && q !== p && q.hand.length <= 2);
  const score = c => {
    let v = 0;
    if (isWild(c)) v -= 6; // giữ lá đổi màu
    if (DRAW_VALUE[c.type] || c.type === 'tornado') v += nextSmall ? 8 : 1;
    if (c.type === 'skip' || c.type === 'skipall') v += nextSmall ? 5 : 1;
    if (c.type === 'discall') v += p.hand.filter(x => x.color === c.color).length * 2;
    if (c.type === 'n') v += c.num / 10;
    if (c.color === bestColor(p.hand)) v += 1;
    return v + Math.random();
  };
  cards.sort((a, b) => score(b) - score(a));
  const c = cards[0];
  const tgt = c.type === 'wtd4' ? s.players.filter(q => !q.out && q !== p).sort((a, b) => a.hand.length - b.hand.length)[0].id : undefined;
  return isWild(c) ? { type: 'play', cardId: c.id, color: bestColor(p.hand.filter(x => x !== c)), target: tgt } : { type: 'play', cardId: c.id };
}

// Bot có cơ hội bắt lỗi người quên hô UNO
export function botCatch(s, pid) {
  if (!s.unoWatch || s.unoWatch === pid) return null;
  const t = getPlayer(s, s.unoWatch); if (!t || t.saidUno || t.hand.length !== 1) return null;
  return { type: 'catch', target: t.id };
}
