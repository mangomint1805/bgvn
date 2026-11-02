// Bot Mèo Nổ: chỉ dùng thông tin hợp lệ (bài mình, lá đã soi, số bom/số lá công khai).
import { getPlayer, current, alive, validPeek, bombsLeft, isCat, CATS, validTargets } from './engine.js?v=3';

const pick = a => a[Math.floor(Math.random() * a.length)];
const VALUE = { defuse: 100, nope: 40, attack: 35, skip: 30, alter: 28, future: 25, bottom: 22, shuffle: 18, favor: 15 };
const val = (p, c) => VALUE[c.t] != null ? VALUE[c.t] : (p.hand.filter(x => x.t === c.t).length >= 2 ? 12 : 3);

function nextOf(s, pid) { const n = s.players.length; const i = s.players.findIndex(p => p.id === pid); for (let k = 1; k <= n; k++) { const q = s.players[(i + k) % n]; if (!q.out) return q; } return null; }

export function botAction(s, pid) {
  const p = getPlayer(s, pid); if (!p || p.out || s.phase !== 'playing' || s.window) return null;
  const pr = s.pending;
  if (pr) {
    if (pr.player !== pid) return null;
    if (pr.type === 'bomb') {
      // nhét bom: hay nhét sát trên cho người kế, đôi khi giấu ngẫu nhiên
      const n = s.deck.length; const r = Math.random();
      const pos = s.turnsLeft > 1 ? Math.min(n, 1 + Math.floor(Math.random() * 3)) : r < 0.45 ? 0 : r < 0.65 ? Math.min(n, 1) : Math.floor(Math.random() * (n + 1));
      return { type: 'defuse', pos };
    }
    if (pr.type === 'give') {
      const c = [...p.hand].sort((a, b) => val(p, a) - val(p, b))[0];
      return { type: 'give', cardId: c && c.id };
    }
    if (pr.type === 'alter') {
      const cards = pr.cards.map(id => s.deck.find(c => c.id === id));
      // bom cho xuống dưới (mình còn phải bốc); nếu sắp đẩy lượt thì để bom trên cùng cho người sau
      const willPass = p.hand.some(c => c.t === 'attack' || c.t === 'skip') && s.turnsLeft === 1;
      const sorted = [...cards].sort((a, b) => ((a.t === 'bomb') - (b.t === 'bomb')) * (willPass ? -1 : 1));
      return { type: 'alter', order: sorted.map(c => c.id) };
    }
    return null;
  }
  if (current(s) !== p) return null;
  const has = t => p.hand.find(c => c.t === t);
  const play = (c, extra = {}) => ({ type: 'play', cardIds: [c.id], ...extra });
  const peek = validPeek(s, pid);
  const n = s.deck.length, b = bombsLeft(s);
  const risk = peek.length ? (peek[0].t === 'bomb' ? 1 : 0) : b / Math.max(1, n);
  const defuse = !!has('defuse');
  const targets = validTargets(s, pid);
  const richest = () => targets.map(id => getPlayer(s, id)).sort((a, b) => b.hand.length - a.hand.length)[0];

  // bộ ba: đòi Gỡ Bom khi mình không có
  if (!defuse && targets.length) {
    for (const t of CATS) { const cs = p.hand.filter(c => c.t === t); if (cs.length >= 3 && Math.random() < 0.8) return { type: 'play', cardIds: cs.slice(0, 3).map(c => c.id), target: richest().id, named: 'defuse' }; }
  }
  if (peek.length && peek[0].t === 'bomb') {
    // biết chắc trên cùng là bom
    for (const t of ['attack', 'skip', 'alter', 'bottom', 'shuffle']) { const c = has(t); if (c && !(t === 'bottom' && n <= 1)) return play(c); }
    return { type: 'draw' };
  }
  if (peek.length && peek[0].t !== 'bomb') {
    // trên cùng an toàn: có thể kiếm chác trước rồi bốc
    if (targets.length && Math.random() < 0.5) { const pr2 = pairOrFavor(p, richest); if (pr2) return pr2; }
    return { type: 'draw' };
  }
  // chưa biết gì: liệu cơm gắp mắm
  const danger = defuse ? risk > 0.34 : risk > 0.12;
  if (targets.length && (!defuse || Math.random() < 0.35)) { const pr2 = pairOrFavor(p, richest); if (pr2 && Math.random() < (defuse ? 0.5 : 0.85)) return pr2; }
  if (risk > 0.08) { const f = has('future') || has('alter'); if (f && Math.random() < (danger ? 0.9 : 0.5)) return play(f); }
  if (danger) {
    const nx = nextOf(s, pid);
    const atk = has('attack'), sk = has('skip'), bt = has('bottom'), sh = has('shuffle');
    if (atk && Math.random() < 0.8) return play(atk);
    if (sk && Math.random() < 0.8) return play(sk);
    if (bt && n > 1 && Math.random() < 0.6) return play(bt);
    if (sh && Math.random() < 0.3) return play(sh);
    void nx;
  }
  if (risk > 0.5 && has('attack')) return play(has('attack'));
  return { type: 'draw' };
}

function pairOrFavor(p, richest) {
  const t = richest(); if (!t) return null;
  for (const k of CATS) { const cs = p.hand.filter(c => c.t === k); if (cs.length === 2) return { type: 'play', cardIds: cs.map(c => c.id), target: t.id }; }
  for (const k of CATS) { const cs = p.hand.filter(c => c.t === k); if (cs.length >= 3) return { type: 'play', cardIds: cs.slice(0, 2).map(c => c.id), target: t.id }; }
  const f = p.hand.find(c => c.t === 'favor'); if (f && Math.random() < 0.6) return { type: 'play', cardIds: [f.id], target: t.id };
  return null;
}

// Bot có ĐÉO! không? (gọi khi cửa sổ đang mở)
export function botNope(s, pid) {
  const w = s.window; const p = getPlayer(s, pid);
  if (!w || !p || p.out || w.last === pid || !p.hand.some(c => c.t === 'nope')) return false;
  const nopes = p.hand.filter(c => c.t === 'nope').length;
  const cancelled = w.nopes % 2 === 1; // hiện hành động đang bị huỷ
  const mine = w.actor === pid;
  if (mine) return cancelled && (w.kind === 'attack' || w.kind === 'skip' || w.kind === 'triple' || isRisky(s, pid)) ? Math.random() < 0.75 : false;
  // hành động của người khác đang có hiệu lực: có hại cho mình không?
  if (cancelled) return false; // người ta đã bị chặn rồi, khỏi phí
  const nx = nextOf(s, w.actor);
  if (w.target === pid) return Math.random() < (w.kind === 'triple' && w.named === 'defuse' && p.hand.some(c => c.t === 'defuse') ? 0.95 : 0.6);
  if (w.kind === 'attack' && nx && nx.id === pid) return Math.random() < (p.hand.some(c => c.t === 'defuse') ? 0.45 : 0.75);
  if ((w.kind === 'skip') && nx && nx.id === pid && bombsLeft(s) / Math.max(1, s.deck.length) > 0.25) return Math.random() < 0.3;
  if (nopes >= 2 && alive(s).length === 2) return Math.random() < 0.3;
  return false;
}
function isRisky(s, pid) { const p = getPlayer(s, pid); return !p.hand.some(c => c.t === 'defuse') && bombsLeft(s) / Math.max(1, s.deck.length) > 0.15; }
export { isCat };
