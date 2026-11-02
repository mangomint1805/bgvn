// Bot Cờ tỷ phú
import { SQUARES, N, RESORTS, groupSquares, houseCost, ISLAND_FEE } from './board.js';
import { getP, cur, cost, takeoverPrice, rentOf } from './engine.js';

function reserve(s) { // giữ lại tiền phòng thân theo mức thuê cao nhất trên bàn
  const max = Math.max(100, ...Object.keys(s.props).map(k => rentOf(s, +k)));
  return Math.min(900, Math.round(max * 0.7) + 80);
}
const groupProgress = (s, p, g) => groupSquares(g).filter(i => s.props[i] && s.props[i].owner === p.id).length / groupSquares(g).length;

export function botAction(s, pid) {
  const p = getP(s, pid); if (!p || p.out || s.phase !== 'playing') return null;
  const pr = s.pending;
  if (pr) {
    if (pr.player !== pid) return null;
    const q = SQUARES[pr.pos]; const keep = reserve(s);
    if (pr.type === 'buy') {
      if (p.cash - q.price < keep * 0.5 && q.type === 'city' && groupProgress(s, p, q.group) === 0 && Math.random() < 0.5) return { type: 'skip' };
      let lv = 0; while (lv < pr.maxLevel && p.cash - cost(q, -1, lv + 1) >= keep) lv++;
      return p.cash >= q.price ? { type: 'buy', level: lv } : { type: 'skip' };
    }
    if (pr.type === 'build') {
      const prop = s.props[pr.pos]; let lv = prop.level;
      while (lv < pr.maxLevel && p.cash - cost(q, prop.level, lv + 1) >= keep) lv++;
      return lv > prop.level ? { type: 'build', level: lv } : { type: 'skip' };
    }
    if (pr.type === 'takeover') {
      const price = takeoverPrice(s, pr.pos);
      const good = groupProgress(s, p, q.group) > 0 || q.price >= 200;
      return good && p.cash - price >= keep ? { type: 'takeover' } : { type: 'skip' };
    }
    if (pr.type === 'festival') {
      const best = [...pr.options].sort((a, b) => rentOf(s, b) - rentOf(s, a))[0];
      return { type: 'festival', pos: best };
    }
    return { type: 'skip' };
  }
  if (cur(s) !== p) return null;
  if (s.stage === 'island') return p.cash > 700 && s.round < 15 ? { type: 'pay_island' } : { type: 'roll' };
  if (s.stage === 'travel') {
    // bay tới: đất của mình để xây, hoặc đất trống mua được, tránh đất người khác
    let best = 0, bestScore = -1e9;
    for (let i = 0; i < N; i++) {
      if (i === 24) continue;
      const q = SQUARES[i], prop = s.props[i]; let sc = 0;
      if (q.type === 'city' || q.type === 'resort') {
        if (!prop) sc = p.cash >= q.price ? 50 + q.price / 10 + (q.type === 'city' ? groupProgress(s, p, q.group) * 80 : RESORTS.filter(r => s.props[r] && s.props[r].owner === p.id).length * 30) : -5;
        else if (prop.owner === p.id) sc = prop.level < 4 && p.cash > houseCost(q) ? 40 + q.price / 8 : 5;
        else sc = -rentOf(s, i);
      } else if (q.type === 'start') sc = 30; else if (q.type === 'island') sc = -60; else sc = 0;
      sc += Math.random() * 5;
      if (sc > bestScore) { bestScore = sc; best = i; }
    }
    return { type: 'travel', pos: best };
  }
  return { type: 'roll' };
}
void ISLAND_FEE;
