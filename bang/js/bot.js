// Bot đơn giản cho Bang!
import { getPlayer, current, alivePlayers, topPrompt, getPlayOptions, responseCards, distance } from './engine.js?v=2';
import { CARD_INFO, rolesFor } from './cards.js';

function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }

// ---------- Trí nhớ của bot: "ai đã bắn ai" (chỉ dùng thông tin công khai trong s.acts) ----------
const HOSTILE = { bang: 2, duel: 2, jail: 1.5, panic: 1, catbalou: 1 };
// Điểm "phe luật" của từng người nhìn từ góc của `me`: dương = có vẻ phe Cảnh sát, âm = có vẻ Tội phạm.
export function suspicion(s, me) {
  const sheriff = s.players.find(p => p.role === 'sheriff');
  const sc = {}; for (const p of s.players) sc[p.id] = 0;
  const acts = (s.acts || []).filter(a => a.by && a.to && HOSTILE[a.card] && a.by !== a.to);
  const known = id => { const q = s.players.find(p => p.id === id); return q && (q.revealed || q === me) ? q.role : null; };
  const recent = n => s.turnCount - n <= alivePlayers(s).length; // trong khoảng 1 vòng gần đây
  for (let pass = 0; pass < 2; pass++) {
    const prev = { ...sc };
    for (const p of s.players) sc[p.id] = 0;
    for (const a of acts) {
      const w = HOSTILE[a.card] * (recent(a.n) ? 1.5 : 1);
      const vr = known(a.to);
      if (sheriff && a.to === sheriff.id) sc[a.by] -= w * 1.5;            // bắn sếp: rất đáng ngờ
      else if (vr === 'outlaw') sc[a.by] += w * 0.8;                      // bắn Tội phạm đã lộ / bắn mình (nếu mình là Tội phạm)
      else if (vr === 'deputy') sc[a.by] -= w * 0.8;                      // bắn Phó
      else if (pass) {                                                   // bắn người đang bị nghi
        if (prev[a.to] <= -2) sc[a.by] += w * 0.6;
        else if (prev[a.to] >= 2) sc[a.by] -= w * 0.5;
      }
    }
  }
  for (const p of s.players) if (p.revealed) sc[p.id] = p.role === 'outlaw' ? -99 : p.role === 'sheriff' || p.role === 'deputy' ? 99 : 0;
  return sc;
}

// Mức ưu tiên tấn công từng người (≤ 0: không đánh). Trả về {id: số}
function priorities(s, me) {
  const others = alivePlayers(s).filter(p => p !== me);
  const sc = suspicion(s, me);
  const sheriff = others.find(p => p.role === 'sheriff');
  const total = rolesFor(s.players.length) || [];
  const outlawsLeft = total.filter(r => r === 'outlaw').length - s.players.filter(p => !p.alive && p.role === 'outlaw').length;
  const deputiesLeft = total.filter(r => r === 'deputy').length - s.players.filter(p => !p.alive && p.role === 'deputy').length;
  const late = s.turnCount > 18 * s.players.length; // ván quá dài: bớt dè dặt để không ai treo ván
  // ai vừa bắn sếp (trong 1 vòng gần đây)?
  const hitSheriff = {};
  if (sheriff) for (const a of s.acts || []) if (a.to === sheriff.id && HOSTILE[a.card] && s.turnCount - a.n <= others.length + 1) hitSheriff[a.by] = (hitSheriff[a.by] || 0) + 1;
  const pr = {};
  for (const p of others) {
    const v = sc[p.id];
    let x = 0;
    switch (me.role) {
      case 'outlaw':
        if (p.role === 'sheriff') x = 10 + (5 - p.hp);
        else if (p.revealed && p.role === 'deputy') x = 6;
        else if (v > 0) x = 2 + Math.min(4, v);
        else if (v === 0) x = 0.6;
        else x = late ? 0.3 : 0; // người đang bắn sếp: chắc là đồng đội
        break;
      case 'deputy':
        if (p.role === 'sheriff') x = 0; // KHÔNG BAO GIỜ bắn sếp
        else if (v < 0) x = 3 - v + (hitSheriff[p.id] ? 6 : 0);
        else if (v === 0) x = 0.6;
        else x = late ? 0.3 : 0;
        break;
      case 'sheriff':
        if (!deputiesLeft) x = 3 + Math.max(0, -v); // không còn Phó: ai cũng là địch
        else if (v < 0) x = 3 - v + (hitSheriff[p.id] ? 4 : 0);
        else if (v === 0) x = 0.8;
        else x = (late || v < 2) ? 0.3 : 0; // có vẻ là Phó: tránh bắn nhầm
        break;
      case 'renegade':
        if (p.role === 'sheriff') x = outlawsLeft > 0 ? 0 : (others.length === 1 ? 10 : 1); // giữ sếp sống tới cuối
        else if (outlawsLeft > 0) x = v < 0 ? 3 - v : v === 0 ? 0.8 : 0.4;
        else x = 5;
        break;
    }
    pr[p.id] = x;
  }
  return pr;
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
          const pri = priorities(s, me);
          const t = alivePlayers(s).filter(p => p !== me && p.hand.length && pri[p.id] > 0).sort((a, b) => pri[b.id] - pri[a.id] || b.hand.length - a.hand.length)[0];
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

  const pri = priorities(s, me);
  const sheriff = alivePlayers(s).find(p => p.role === 'sheriff');
  // Phó / Kẻ hai mặt (khi còn Tội phạm) không tung đòn đánh cả bàn lúc sếp yếu
  const outlawsLeft = (rolesFor(s.players.length) || []).filter(r => r === 'outlaw').length - s.players.filter(p => !p.alive && p.role === 'outlaw').length;
  const protectSheriff = sheriff && (me.role === 'deputy' || (me.role === 'renegade' && outlawsLeft > 0));
  const massOk = !protectSheriff || sheriff.hp >= 3;
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
  const pickTarget = (targets, min = 0.5) => {
    const pool = targets.filter(id => pri[id] >= min);
    if (!pool.length) return null;
    // ưu tiên cao nhất, rồi máu thấp
    return pool.map(id => getPlayer(s, id)).sort((a, b) => pri[b.id] - pri[a.id] || a.hp - b.hp || a.hand.length - b.hand.length)[0].id;
  };
  x = find('jail'); if (x) { const t = pickTarget(x.o.targets); if (t) return { type: 'play_card', cardId: x.c.id, target: t }; }
  x = find('panic'); if (x) { const t = pickTarget(x.o.targets); if (t) return { type: 'play_card', cardId: x.c.id, target: t, pick: pickCard(s, t) }; }
  x = find('catbalou'); if (x) { const t = pickTarget(x.o.targets); if (t) return { type: 'play_card', cardId: x.c.id, target: t, pick: pickCard(s, t) }; }
  const myBangs = me.hand.filter(c => c.type === 'bang').length;
  x = find('gatling'); if (x && alivePlayers(s).length >= 3 && massOk) return { type: 'play_card', cardId: x.c.id };
  x = find('indians'); if (x && massOk) return { type: 'play_card', cardId: x.c.id };
  x = find('bang') || (me.character === 'calamityjanet' ? find('missed') : null);
  if (x) { const t = pickTarget(x.o.targets); if (t) return { type: 'play_card', cardId: x.c.id, target: t }; }
  x = find('duel');
  if (x) { // Duel: cần đủ BANG! để thắng; Tội phạm liều hơn khi nhắm vào sếp
    const t = pickTarget(x.o.targets);
    if (t && (myBangs >= 2 || (me.role === 'outlaw' && getPlayer(s, t).role === 'sheriff' && myBangs >= 1))) return { type: 'play_card', cardId: x.c.id, target: t };
  }
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
