// Bot đơn giản cho Bang!
import { getPlayer, current, alivePlayers, topPrompt, getPlayOptions, responseCards, distance } from './engine.js';
import { CARD_INFO } from './cards.js';

function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }

// Bot "nghi ngờ": ai có vẻ là địch với bot?
function enemiesOf(s, me) {
  const others = alivePlayers(s).filter(p => p !== me);
  const sheriff = others.find(p => p.role === 'sheriff');
  switch (me.role) {
    case 'outlaw': return sheriff ? [sheriff, ...others.filter(p => p.revealed && p.role === 'deputy')] : others;
    case 'deputy': return others.filter(p => p.role !== 'sheriff' && !(p.revealed && p.role === 'deputy'));
    case 'sheriff': return others.filter(p => !(p.revealed && p.role === 'deputy'));
    case 'renegade': {
      // giúp cảnh sát giết tội phạm trước, còn ít người thì quay sang cảnh sát
      const outlaws = others.filter(p => p.revealed && p.role === 'outlaw');
      if (others.length <= 1) return others;
      return others.filter(p => p.role !== 'sheriff').length ? others.filter(p => p.role !== 'sheriff') : others;
    }
  }
  return others;
}

// Trả về action cho bot `pid`, hoặc null nếu không phải việc của bot
export function botAction(s, pid) {
  const me = getPlayer(s, pid);
  if (!me || !me.alive || s.phase !== 'playing') return null;
  const pr = topPrompt(s);
  if (pr) {
    if (pr.player !== pid) return null;
    switch (pr.type) {
      case 'draw_option': {
        if (pr.character === 'kitcarlson') {
          const sorted = [...pr.cards].sort((a, b) => score(b) - score(a));
          return { type: 'kit_choose', keep: sorted.slice(0, 2).map(c => c.id) };
        }
        if (pr.character === 'jessejones') {
          const t = enemiesOf(s, me).filter(p => p.hand.length).sort((a, b) => b.hand.length - a.hand.length)[0];
          if (t && Math.random() < 0.7) return { type: 'draw_from_player', target: t.id };
        }
        if (pr.character === 'pedroramirez' && s.discard.length) {
          const top = s.discard[s.discard.length - 1];
          if (score(top) >= 2) return { type: 'draw_from_discard' };
        }
        return { type: 'draw_from_deck' };
      }
      case 'discard': {
        const worst = [...me.hand].sort((a, b) => score(a) - score(b))[0];
        return { type: 'discard_card', cardId: worst.id };
      }
      case 'store': {
        const best = [...pr.cards].sort((a, b) => score(b) - score(a))[0];
        return { type: 'store_pick', cardId: best.id };
      }
      case 'respond': {
        const cards = responseCards(me, pr.kind);
        if (!cards.length) return { type: 'take_hit' };
        // nếu còn nhiều máu và lá đáp trả hiếm, đôi khi chịu đòn (duel: luôn bắn lại)
        if (pr.kind !== 'duel' && me.hp >= 3 && cards.length === 1 && Math.random() < 0.15) return { type: 'take_hit' };
        return { type: 'respond_card', cardId: cards[0].id };
      }
    }
    return null;
  }
  if (current(s) !== me || s.step !== 'play') return null;

  const enemies = enemiesOf(s, me);
  const opts = me.hand.map(c => ({ c, o: getPlayOptions(s, pid, c.id) })).filter(x => x.o.ok);
  const find = t => opts.find(x => x.c.type === t);

  // 1. Hồi máu
  let x = find('beer'); if (x) return { type: 'play_card', cardId: x.c.id };
  if (me.character === 'sidketchum' && me.hp < me.maxHp && me.hand.length >= 3) {
    const sorted = [...me.hand].sort((a, b) => score(a) - score(b));
    return { type: 'ability_sid', cardIds: [sorted[0].id, sorted[1].id] };
  }
  x = find('saloon'); if (x && me.hp < me.maxHp) return { type: 'play_card', cardId: x.c.id };
  // 2. Rút bài
  x = find('wellsfargo') || find('stagecoach'); if (x) return { type: 'play_card', cardId: x.c.id };
  x = find('store'); if (x) return { type: 'play_card', cardId: x.c.id };
  // 3. Trang bị
  for (const t of ['barrel', 'mustang', 'scope']) { x = find(t); if (x) return { type: 'play_card', cardId: x.c.id }; }
  const gunOpt = opts.filter(y => CARD_INFO[y.c.type].kind === 'gun').sort((a, b) => CARD_INFO[b.c.type].range - CARD_INFO[a.c.type].range)[0];
  if (gunOpt) {
    const myGun = me.table.find(c => CARD_INFO[c.type].kind === 'gun');
    const curRange = myGun ? CARD_INFO[myGun.type].range : 1;
    if (CARD_INFO[gunOpt.c.type].range > curRange || gunOpt.c.type === 'volcanic') return { type: 'play_card', cardId: gunOpt.c.id };
  }
  x = find('dynamite'); if (x && Math.random() < 0.5) return { type: 'play_card', cardId: x.c.id };
  // 4. Tấn công
  const pickTarget = targets => {
    const ids = targets.filter(id => enemies.some(e => e.id === id));
    const pool = ids.length ? ids : (me.role === 'renegade' ? targets : []);
    if (!pool.length) return null;
    // ưu tiên máu thấp
    return pool.map(id => getPlayer(s, id)).sort((a, b) => a.hp - b.hp || a.hand.length - b.hand.length)[0].id;
  };
  x = find('jail'); if (x) { const t = pickTarget(x.o.targets); if (t) return { type: 'play_card', cardId: x.c.id, target: t }; }
  x = find('panic'); if (x) { const t = pickTarget(x.o.targets); if (t) return { type: 'play_card', cardId: x.c.id, target: t, pick: pickCard(s, t) }; }
  x = find('catbalou'); if (x) { const t = pickTarget(x.o.targets); if (t) return { type: 'play_card', cardId: x.c.id, target: t, pick: pickCard(s, t) }; }
  const myBangs = me.hand.filter(c => c.type === 'bang').length;
  x = find('gatling'); if (x && alivePlayers(s).length >= 3) return { type: 'play_card', cardId: x.c.id };
  x = find('indians'); if (x) return { type: 'play_card', cardId: x.c.id };
  x = find('bang') || (me.character === 'calamityjanet' ? find('missed') : null);
  if (x) { const t = pickTarget(x.o.targets); if (t) return { type: 'play_card', cardId: x.c.id, target: t }; }
  x = find('duel'); if (x && myBangs >= 2) { const t = pickTarget(x.o.targets); if (t) return { type: 'play_card', cardId: x.c.id, target: t }; }
  return { type: 'end_turn' };
}

function pickCard(s, targetId) {
  const t = getPlayer(s, targetId);
  const gun = t.table.find(c => CARD_INFO[c.type].kind === 'gun' && c.type !== 'volcanic');
  const good = t.table.find(c => ['barrel', 'mustang', 'scope'].includes(c.type));
  if (gun && Math.random() < 0.6) return gun.id;
  if (good) return good.id;
  if (t.hand.length) return 'hand';
  return t.table[0].id;
}

// Giá trị lá bài (để bỏ/giữ)
function score(c) {
  return ({ beer: 5, missed: 4, bang: 3, wellsfargo: 4, stagecoach: 3, store: 2, panic: 3, catbalou: 3, gatling: 4, indians: 3,
    duel: 2, saloon: 2, barrel: 3, mustang: 3, scope: 2, jail: 2, dynamite: 1, volcanic: 2, schofield: 2, remington: 3, carabine: 3, winchester: 4 })[c.type] || 1;
}
