// Bot Tam Quốc Sát: đoán phe qua "ấn tượng" công khai (s.lean), chơi theo vai trò, dùng kỹ năng.
import { getPlayer, current, alivePlayers, top, distance, inRange, attackRange, hasSkill, weaponOf, armorOf, cardModes, activeSkills, responseOptions, useOptions, orderFrom, effSuit } from './engine.js?v=6';
import { CARD_INFO, GENERALS, isRed, isBlack } from './cards.js?v=6';

const R = () => Math.random();
function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }

// ---------- Đoán phe ----------
function rebelsAlive(s) { const total = s.nRoles.filter(r => r === 'rebel').length; return total - s.players.filter(p => !p.alive && p.role === 'rebel').length; }
function spyAlive(s) { return s.nRoles.includes('spy') && !s.players.some(p => !p.alive && p.role === 'spy'); }
// hết Phản tặc: kẻ "kém trung thành" nhất trong số còn lại (trừ Chúa và chính mình) bị nghi là Nội gián
function suspect(s, me) {
  const c = alivePlayers(s).filter(q => q !== me && q.role !== 'lord' && !(q.revealed && q.role === 'loyal'));
  if (!c.length) return null;
  return c.sort((a, b) => (s.lean[a.id] || 0) - (s.lean[b.id] || 0) || a.id.localeCompare(b.id))[0];
}
const late = s => s.turnCount > 70 + 12 * s.players.length;
// > 0: phe Chúa đang áp đảo phe Phản (Nội gián nên ghìm phe Chúa lại)
function spyTilt(s, me) {
  const pow = q => q.hp + Math.min(4, q.hand.length) * .4 + (q.equip.armor ? .6 : 0);
  let lordS = 0, rebS = 0;
  for (const q of alivePlayers(s)) {
    if (q === me) continue;
    const l = s.lean[q.id] || 0;
    if (q.role === 'lord' || l >= 1) lordS += pow(q); else if (l <= -1) rebS += pow(q);
  }
  // Phản tặc chưa lộ mặt: ước lượng theo số còn sống
  const hidden = rebelsAlive(s) - alivePlayers(s).filter(q => q !== me && (s.lean[q.id] || 0) <= -1).length;
  if (hidden > 0) rebS += hidden * 3;
  return lordS > rebS * 1.15 ? 1 : 0;
}
// +1 bạn, −1 thù, 0 chưa rõ (chỉ dùng thông tin công khai + vai của chính mình)
export function relation(s, me, o) {
  if (me === o) return 2;
  if (!o.alive) return 0;
  if (alivePlayers(s).length === 2) return -1; // còn 2 người khác phe: đấu tới chết
  const lean = s.lean[o.id] || 0;
  const known = o.revealed ? o.role : null;
  switch (me.role) {
    case 'lord': {
      if (known === 'loyal') return 1;
      if (!rebelsAlive(s)) { if (!spyAlive(s)) return 1; return suspect(s, me) === o ? -1 : (lean >= 1 ? 1 : 0); }
      if (lean >= 2) return 1; if (lean <= -1) return -1;
      return 0;
    }
    case 'loyal': {
      if (o.role === 'lord') return 1;
      if (known === 'loyal') return 1;
      if (!rebelsAlive(s)) { if (!spyAlive(s)) return 1; return suspect(s, me) === o ? -1 : 0; }
      if (lean >= 2) return 1; if (lean <= -1) return -1;
      return 0;
    }
    case 'rebel': {
      if (o.role === 'lord') return -1;
      if (lean >= 1) return -1; if (lean <= -1) return 1;
      return 0;
    }
    case 'spy': {
      const others = alivePlayers(s).filter(q => q !== me);
      if (others.length <= 1) return -1;
      if (rebelsAlive(s) && late(s)) { if (o.role === 'lord') return 1; return lean >= 2 ? 0 : -1; } // ván kéo dài: dọn Phản tặc cho nhanh
      if (rebelsAlive(s)) {
        // Nội gián giữ thế cân bằng: phe nào đang áp đảo thì quay sang đánh phe đó (nhưng không giết Chúa sớm)
        const tilt = spyTilt(s, me);
        if (o.role === 'lord') return tilt > 0 && o.hp >= 3 ? 0 : 1;
        if (tilt > 0) { if (lean >= 1) return -1; if (lean <= -1) return 1; return 0; }
        if (lean <= -1) return -1; return 0;
      }
      if (o.role === 'lord') return 1;
      return -1;
    }
  }
  return 0;
}
const isEnemy = (s, me, o) => relation(s, me, o) < 0;
const isFriend = (s, me, o) => relation(s, me, o) > 0;

// giá trị lá (giữ/bỏ)
function value(s, me, c) {
  const base = { huogong: 4, tiesuo: 3, bingliang: 6, zhuque: 4, guding: 4, tengjia: 5, baiyin: 5, dao: 9, jiu: 5, ne: 6, wuxie: 6, sat: 5, wuzhong: 7, shunshou: 6, guohe: 5, juedou: 4, nanman: 5, wanjian: 5, lebu: 6, jiedao: 3, taoyuan: 3, wugu: 3, shandian: 1,
    bagua: 6, renwang: 5, plus: 5, minus: 4, zhuge: 4, qinggang: 4, qinglong: 4, zhangba: 3, guanshi: 4, fangtian: 3, qilin: 3, cixiong: 3, hanbing: 3 }[c.type] || 2;
  let v = base;
  if (c.type === 'sat' && me.hand.filter(x => x.type === 'sat').length > 2 && !(weaponOf(me) === 'zhuge' || hasSkill(me, 'baohao'))) v -= 2;
  if (CARD_INFO[c.type].kind === 'armor' && me.equip.armor) v -= 3;
  if (CARD_INFO[c.type].kind === 'weapon' && me.equip.weapon) v -= 2;
  if ((c.type === 'plus' && me.equip.plus) || (c.type === 'minus' && me.equip.minus)) v -= 3;
  if (hasSkill(me, 'vothanh') && isRed(c)) v += 1;
  if (hasSkill(me, 'khuynhquoc') && isBlack(c)) v += 1;
  return v;
}
const worstFirst = (s, me, cards) => [...cards].sort((a, b) => value(s, me, a) - value(s, me, b));

// ---------- Hành động ----------
export function botAction(s, pid) {
  const me = getPlayer(s, pid);
  if (!me || s.phase !== 'playing') return null;
  const t = top(s); const ask = t && t.ask;
  if (!ask || !ask.players.includes(pid)) return null;
  try { return decide(s, me, t, ask) || fallback(s, me, ask); }
  catch (e) { return fallback(s, me, ask); }
}
function fallback(s, me, ask) {
  switch (ask.type) {
    case 'play': return { type: 'end' };
    case 'general': { const t = top(s); return { type: 'general', id: t.offers[me.id][0] }; }
    case 'discard': return ask.optional ? { type: 'pass' } : { type: 'discard', ids: me.hand.slice(0, ask.n).map(c => c.id) };
    case 'pick': { const from = getPlayer(s, ask.from); if (from.hand.length && ask.zones.includes('h')) return { type: 'pick', zone: 'h' }; const e = Object.values(from.equip).find(Boolean); if (e && ask.zones.includes('e')) return { type: 'pick', id: e.id }; return { type: 'pick', id: from.judge[0].card.id }; }
    case 'guanxing': { const t = top(s); return { type: 'guanxing', top: t.hold.map(c => c.id), bottom: [] }; }
    case 'targets': return { type: 'targets', ids: [] };
    case 'yesno': return { type: 'no' };
    case 'suit': return { type: 'suit', suit: 'H' };
    case 'wugu': { const t = top(s); return { type: 'pick', id: t.hold[0].id }; }
    default: return { type: 'pass' };
  }
}

function decide(s, me, t, ask) {
  switch (ask.type) {
    case 'general': return chooseGeneral(s, me, t.offers[me.id]);
    case 'play': return playTurn(s, me);
    case 'card': return respondCard(s, me, t, ask);
    case 'nullify': return nullifyDecision(s, me, ask);
    case 'discard': return discardDecision(s, me, t, ask);
    case 'pick': return pickDecision(s, me, ask);
    case 'guanxing': return guanxing(s, me, t);
    case 'targets': {
      const cands = ask.candidates.map(id => getPlayer(s, id));
      const enemies = cands.filter(q => isEnemy(s, me, q)).sort((a, b) => a.hp - b.hp);
      if (ask.purpose === 'thantoc') { const e = enemies.filter(q => !(armorOf(q) === 'tengjia')); return { type: 'targets', ids: e.length && (e[0].hp <= 2 || me.hand.length <= 2 || R() < .4) ? [e[0].id] : [] }; }
      if (ask.purpose === 'loikich') return { type: 'targets', ids: enemies.length ? [enemies[0].id] : [] };
      if (ask.purpose === 'tietmenh') { const f = cands.filter(q => q === me || isFriend(s, me, q)).sort((a, b) => (Math.min(5, b.maxHp) - b.hand.length) - (Math.min(5, a.maxHp) - a.hand.length)); return { type: 'targets', ids: f.length ? [f[0].id] : [] }; }
      if (ask.purpose === 'khuho') { const e = enemies.length ? enemies : cands.filter(q => !isFriend(s, me, q) && q !== me); return { type: 'targets', ids: [(e[0] || cands[0]).id] }; }
      // Đột tập
      const c = cands.filter(q => !isFriend(s, me, q)).sort((a, b) => relation(s, me, a) - relation(s, me, b) || b.hand.length - a.hand.length);
      return { type: 'targets', ids: c.slice(0, 2).map(q => q.id) };
    }
    case 'show': {
      if (ask.purpose === 'pindian') { const c = [...me.hand].sort((a, b) => b.rank - a.rank)[0]; return { type: 'show', id: c.id }; }
      const src = getPlayer(s, ask.src); const c = worstFirst(s, me, me.hand)[0];
      if (src && isEnemy(s, me, src)) { // lật chất mà kẻ địch khó có (chất ít gặp)
        const cnt = {}; for (const x of me.hand) cnt[x.suit] = (cnt[x.suit] || 0) + 1;
        const r = [...me.hand].sort((a, b) => (cnt[a.suit] - cnt[b.suit]) || value(s, me, a) - value(s, me, b))[0]; return { type: 'show', id: r.id };
      }
      return { type: 'show', id: c.id };
    }
    case 'yesno': {
      if (ask.purpose === 'loay') {
        const sats = me.hand.filter(c => c.type === 'sat').length + me.hand.filter(c => c.type === 'juedou').length;
        const hasT = alivePlayers(s).some(q => q !== me && isEnemy(s, me, q) && inRange(s, me, q));
        return { type: sats >= 1 && hasT && R() < .8 ? 'yes' : 'no' };
      }
      if (ask.purpose === 'nietban') return { type: 'yes' };
      if (ask.purpose === 'cuthu') return { type: me.hp <= 2 || me.hand.length <= 1 || R() < .25 ? 'yes' : 'no' };
      if (ask.purpose === 'hanbing') { const tg = getPlayer(s, ask.tgt); return { type: isFriend(s, me, tg) || (tg.hp > 2 && Object.values(tg.equip).filter(Boolean).length >= 2) ? 'yes' : 'no' }; }
      return { type: 'no' };
    }
    case 'liuli': {
      if (ask.purpose === 'thienhuong') {
        const hearts = worstFirst(s, me, me.hand.filter(c => effSuit(me, c) === 'H' && c.type !== 'dao'));
        const e = ask.candidates.map(id => getPlayer(s, id)).filter(q => isEnemy(s, me, q)).sort((a, b) => a.hp - b.hp);
        if (!hearts.length || !e.length || (ask.n <= 1 && me.hp >= 3 && R() < .5)) return { type: 'pass' };
        return { type: 'liuli', cardId: hearts[0].id, target: e[0].id };
      }
      const src = getPlayer(s, ask.src);
      const cands = ask.candidates.map(id => getPlayer(s, id)).filter(q => isEnemy(s, me, q));
      if (!cands.length) return { type: 'pass' };
      const cards = worstFirst(s, me, [...me.hand, ...Object.values(me.equip).filter(Boolean)]).filter(c => c.type !== 'dao');
      if (!cards.length) return { type: 'pass' };
      void src;
      return { type: 'liuli', cardId: cards[0].id, target: cands.sort((a, b) => a.hp - b.hp)[0].id };
    }
    case 'suit': return { type: 'suit', suit: rnd(['S', 'H', 'C', 'D']) };
    case 'wugu': return { type: 'pick', id: [...t.hold].sort((a, b) => value(s, me, b) - value(s, me, a))[0].id };
  }
  return null;
}

function chooseGeneral(s, me, offers) {
  const score = { zhangfei: 8, guanyu: 8, zhaoyun: 8, lvbu: 8, huanggai: 7, sunquan: 8, liubei: 7, caocao: 7, simayi: 7, guojia: 7, zhenji: 7, zhangliao: 8, zhugeliang: 6, huangyueying: 7, zhouyu: 7, huatuo: 8, diaochan: 7, machao: 7, xuchu: 6, ganning: 7, lvmeng: 6, luxun: 7, daqiao: 7, sunshangxiang: 6, xiahoudun: 7, xiahouyuan: 7, caoren: 7, dianwei: 7, xunyu: 7, huangzhong: 8, weiyan: 7, pangtong: 7, wolong: 8, xiaoqiao: 7, zhoutai: 7, taishici: 7, zhangjiao: 7, yuanshao: 8 };
  const sorted = [...offers].sort((a, b) => (score[b] || 5) + R() * 3 - (score[a] || 5) - R() * 3);
  return { type: 'general', id: sorted[0] };
}

// ---------- Pha ra bài ----------
function playTurn(s, me) {
  const others = alivePlayers(s).filter(q => q !== me);
  const enemies = others.filter(q => isEnemy(s, me, q));
  const friends = others.filter(q => isFriend(s, me, q));
  const modes = {}; for (const c of me.hand) modes[c.id] = cardModes(s, me, c);
  const usable = (as) => me.hand.filter(c => modes[c.id].some(m => m.as === as && m.ok)).map(c => ({ c, o: modes[c.id].find(m => m.as === as) }));
  const realFirst = (list, as) => list.sort((a, b) => (a.c.type === as ? 0 : 1) - (b.c.type === as ? 0 : 1) || value(s, me, a.c) - value(s, me, b.c));
  const use = (x, as, targets = []) => ({ type: 'use', ids: [x.c.id], as, targets });
  const skills = activeSkills(s, me); const sk = k => skills.find(o => o.sk === k);
  s.tf.botSteps = (s.tf.botSteps || 0) + 1;
  if (s.tf.botSteps > 40) return { type: 'end' };

  // 1. trang bị
  for (const kind of ['armor', 'plus', 'minus', 'weapon']) {
    for (const c of me.hand) {
      const info = CARD_INFO[c.type]; if (info.kind !== kind) continue;
      const cur = me.equip[kind];
      if (kind === 'weapon') {
        const better = !cur || (c.type === 'zhuge' && me.hand.filter(x => modes[x.id].some(m => m.as === 'sat')).length >= 2) || (info.range > CARD_INFO[cur.type].range && cur.type !== 'zhuge');
        if (better) return use({ c }, c.type);
      } else if (!cur) return use({ c }, c.type);
      else if (kind === 'armor' && cur.type === 'renwang' && c.type === 'bagua' && R() < .4) return use({ c }, c.type);
    }
  }
  // 2. hồi máu
  const peaches = usable('dao');
  if (peaches.length && me.hp < me.maxHp && (me.hp <= 2 || peaches.length > 1 || me.hand.length > me.hp + 1)) return use(peaches[0], 'dao');
  // 3. rút bài
  let x = usable('wuzhong')[0]; if (x) return use(x, 'wuzhong');
  // 4. kỹ năng
  if (sk('khonhuc') && (me.hp >= 3 || (me.hp >= 2 && me.hand.some(c => c.type === 'dao'))) && (s.tf.khonhucN || 0) < 2) { s.tf.khonhucN = (s.tf.khonhucN || 0) + 1; return { type: 'skill', skill: 'khonhuc' }; }
  if (sk('thanhnang')) {
    const tg = [me, ...friends].filter(q => q.hp < q.maxHp).sort((a, b) => a.hp - b.hp)[0];
    if (tg && sk('thanhnang').targets.includes(tg.id)) { const c = worstFirst(s, me, me.hand)[0]; return { type: 'skill', skill: 'thanhnang', ids: [c.id], targets: [tg.id] }; }
  }
  if (sk('ketnhan')) {
    const tg = sk('ketnhan').targets.map(id => getPlayer(s, id)).filter(q => !isEnemy(s, me, q))[0];
    if (tg && me.hp < me.maxHp && me.hand.length >= 3) { const cs = worstFirst(s, me, me.hand).slice(0, 2); return { type: 'skill', skill: 'ketnhan', ids: cs.map(c => c.id), targets: [tg.id] }; }
  }
  if (sk('chehanh') && me.hand.length) {
    const junk = worstFirst(s, me, me.hand).filter(c => value(s, me, c) <= 3);
    if (junk.length) return { type: 'skill', skill: 'chehanh', ids: junk.map(c => c.id) };
  }
  const giveTo = friends.filter(q => !(me.role === 'spy' && q.role === 'lord'));
  if (sk('nhanduc') && giveTo.length && me.hand.length > me.hp && !(s.tf.nhanduc >= 2)) {
    const f = giveTo.sort((a, b) => a.hand.length - b.hand.length)[0];
    const cs = worstFirst(s, me, me.hand).filter(c => !(c.type === 'sat' && enemies.some(e => inRange(s, me, e)))).slice(0, Math.min(2, me.hand.length - 1 || 1));
    if (cs.length) return { type: 'skill', skill: 'nhanduc', ids: cs.map(c => c.id), targets: [f.id] };
  }
  if (sk('phangian') && enemies.length && me.hand.length) { const e = enemies.sort((a, b) => a.hp - b.hp)[0]; return { type: 'skill', skill: 'phangian', targets: [e.id] }; }
  if (sk('ligian')) {
    const males = sk('ligian').targets.map(id => getPlayer(s, id));
    const victim = males.filter(q => isEnemy(s, me, q) && !(hasSkill(q, 'khongthanh') && !q.hand.length)).sort((a, b) => a.hp - b.hp)[0];
    const user = victim && males.filter(q => q !== victim && !isFriend(s, me, q)).sort((a, b) => b.hand.length - a.hand.length)[0];
    if (victim && user) { const c = worstFirst(s, me, [...me.hand, ...Object.values(me.equip).filter(Boolean)])[0]; return { type: 'skill', skill: 'ligian', ids: [c.id], targets: [user.id, victim.id] }; }
  }
  if (sk('cuongtap')) {
    const e = sk('cuongtap').targets.map(id => getPlayer(s, id)).filter(q => isEnemy(s, me, q)).sort((a, b) => a.hp - b.hp)[0];
    const wpn = me.hand.find(c => CARD_INFO[c.type].kind === 'weapon');
    if (e && (wpn || (me.hp >= 3 && (e.hp <= 2 || R() < .4)))) return { type: 'skill', skill: 'cuongtap', ids: wpn ? [wpn.id] : [], targets: [e.id] };
  }
  if (sk('thiennghia') && me.hand.some(c => c.rank >= 11) && me.hand.some(c => c.type === 'sat')) {
    const e = sk('thiennghia').targets.map(id => getPlayer(s, id)).filter(q => isEnemy(s, me, q))[0]; if (e) return { type: 'skill', skill: 'thiennghia', targets: [e.id] };
  }
  if (sk('khuho') && me.hand.some(c => c.rank >= 10)) {
    const e = sk('khuho').targets.map(id => getPlayer(s, id)).find(q => !isFriend(s, me, q) && alivePlayers(s).some(x => x !== q && inRange(s, q, x) && isEnemy(s, me, x)));
    if (e) return { type: 'skill', skill: 'khuho', targets: [e.id] };
  }
  // 5. cẩm nang
  const pickT = (targets, f = isEnemy) => targets.map(id => getPlayer(s, id)).filter(q => f(s, me, q)).sort((a, b) => a.hp - b.hp || armorScore(b) - armorScore(a))[0];
  x = usable('lebu')[0]; if (x) { const tg = pickT(x.o.targets); if (tg) return use(x, 'lebu', [tg.id]); }
  x = usable('bingliang')[0]; if (x) { const tg = pickT(x.o.targets); if (tg) return use(x, 'bingliang', [tg.id]); }
  x = realFirst(usable('huogong'), 'huogong')[0];
  if (x && me.hand.length >= 3 && new Set(me.hand.map(c => c.suit)).size >= 2) { const tg = pickT(x.o.targets.filter(id => id !== me.id)); if (tg) return use(x, 'huogong', [tg.id]); }
  x = realFirst(usable('tiesuo'), 'tiesuo')[0];
  if (x) {
    const chainedFriends = [me, ...friends].filter(q => q.flags.chained).slice(0, 2);
    const freeEnemies = enemies.filter(q => !q.flags.chained).sort((a, b) => a.hp - b.hp).slice(0, 2);
    if (chainedFriends.length) return use(x, 'tiesuo', chainedFriends.map(q => q.id));
    if (freeEnemies.length >= 2 || (freeEnemies.length && R() < .3)) return use(x, 'tiesuo', freeEnemies.map(q => q.id));
    if (x.c.type === 'tiesuo') return use(x, 'tiesuo', []);
  }
  x = usable('shunshou')[0]; if (x) { const tg = pickT(x.o.targets) || (x.o.targets.map(id => getPlayer(s, id)).find(q => q.judge.length && !isEnemy(s, me, q))); if (tg) return use(x, 'shunshou', [tg.id]); }
  x = realFirst(usable('guohe'), 'guohe')[0]; if (x) { const tg = pickT(x.o.targets) || x.o.targets.map(id => getPlayer(s, id)).find(q => isFriend(s, me, q) && q.judge.length); if (tg) return use(x, 'guohe', [tg.id]); }
  x = usable('jiedao')[0];
  if (x) {
    for (const aid of x.o.targets) {
      const a = getPlayer(s, aid); if (isFriend(s, me, a)) continue;
      const bs = x.o.second[aid].map(id => getPlayer(s, id)).filter(b => b !== me);
      const b = bs.find(q => isEnemy(s, me, q)) || (isEnemy(s, me, a) ? bs.find(q => !isFriend(s, me, q)) : null);
      if (b) return { type: 'use', ids: [x.c.id], as: 'jiedao', targets: [a.id, b.id] };
    }
  }
  const nEnemy = enemies.length, nFriend = friends.length;
  const aoeOk = (nEnemy >= nFriend && nEnemy) || (late(s) && !(me.role === 'loyal' || me.role === 'spy') ) || (late(s) && others.every(q => q.role !== 'lord' || q.hp > 1));
  x = usable('nanman')[0]; if (x && aoeOk) return use(x, 'nanman');
  x = usable('wanjian')[0]; if (x && aoeOk) return use(x, 'wanjian');
  x = usable('taoyuan')[0]; if (x) { const hurt = q => q.hp < q.maxHp ? 1 : 0; const good = [me, ...friends].reduce((a, q) => a + hurt(q), 0), badv = enemies.reduce((a, q) => a + hurt(q), 0); if (good > badv) return use(x, 'taoyuan'); }
  x = usable('wugu')[0]; if (x && (nFriend >= nEnemy || R() < .3)) return use(x, 'wugu');
  x = usable('shandian')[0]; if (x && me.role !== 'lord' && R() < .35) return use(x, 'shandian');
  // 6. Quyết đấu
  const mySats = me.hand.filter(c => responseOptions(s, me, 'sat').some(o => o.ids && o.ids[0] === c.id)).length;
  x = usable('juedou')[0];
  if (x) { const tg = pickT(x.o.targets); if (tg && (mySats >= Math.min(2, tg.hand.length) || tg.hp <= 1 || me.flags.luoyi || late(s))) return use(x, 'juedou', [tg.id]); }
  // 7. Sát
  const sats = realFirst(usable('sat'), 'sat');
  for (const sx of sats) {
    const cand = sx.o.targets.map(id => getPlayer(s, id));
    let tg = cand.filter(q => isEnemy(s, me, q));
    if (!tg.length && R() < (late(s) ? .7 : me.role === 'rebel' ? .25 : me.role === 'lord' ? .3 : .12) && s.turnCount > s.players.length) tg = cand.filter(q => relation(s, me, q) === 0);
    if (!tg.length) break;
    tg.sort((a, b) => slashScore(s, me, b, sx.c) - slashScore(s, me, a, sx.c));
    const best = tg[0]; if (slashScore(s, me, best, sx.c) < -5) break;
    // uống Rượu trước khi chém kẻ địch yếu máu (hoặc khi dư Rượu)
    const wine = !me.flags.drunk && !s.tf.jiu && usable('jiu').find(w => w.c.id !== sx.c.id);
    if (wine && isEnemy(s, me, best) && (best.hp <= 2 || me.hand.filter(c => c.type === 'jiu').length > 1) && !(armorOf(best) === 'renwang' && isBlack(sx.c) && weaponOf(me) !== 'qinggang')) return use(wine, 'jiu');
    const targets = [best.id, ...tg.slice(1, sx.o.max).map(q => q.id)];
    if (!sx.c.el && sx.c.type === 'sat' && modes[sx.c.id].some(m => m.as === 'hoasat' && m.ok) && (armorOf(best) === 'tengjia' || best.flags.chained || R() < .5)) return use(sx, 'hoasat', targets);
    return use(sx, 'sat', targets);
  }
  // Loạn kích: 2 lá cùng chất như Vạn tiễn
  if (sk('loankich') && aoeOk && me.hand.length >= 3) {
    const by = {}; for (const c of worstFirst(s, me, me.hand)) (by[c.suit] = by[c.suit] || []).push(c);
    const pr = Object.values(by).find(l => l.length >= 2 && l.slice(0, 2).every(c => value(s, me, c) <= 6));
    if (pr) return { type: 'skill', skill: 'loankich', ids: pr.slice(0, 2).map(c => c.id) };
  }
  // Xà mâu: 2 lá rác như Sát
  if (sk('xamau') && me.hand.length >= 4 && (s.tf.slashes || 0) === 0) {
    const tg = pickT(sk('xamau').targets); if (tg) { const cs = worstFirst(s, me, me.hand).slice(0, 2); return { type: 'skill', skill: 'xamau', ids: cs.map(c => c.id), targets: [tg.id] }; }
  }
  // dư Đào khi gần bỏ bài
  if (peaches.length && me.hp < me.maxHp) return use(peaches[0], 'dao');
  return { type: 'end' };
}
function armorScore(q) { return (q.equip.armor ? 2 : 0) + (q.equip.plus ? 1 : 0); }
function slashScore(s, me, q, c) {
  let v = 10 - q.hp * 2 - q.hand.length * .5;
  if (armorOf(q) === 'renwang' && isBlack(c) && weaponOf(me) !== 'qinggang') v -= 20;
  if (armorOf(q) === 'tengjia' && weaponOf(me) !== 'qinggang') v += c.el === 'fire' || weaponOf(me) === 'zhuque' ? 4 : c.el ? 0 : -20;
  if (q.flags.chained && c.el) v += 2;
  if (armorOf(q) === 'bagua' && weaponOf(me) !== 'qinggang') v -= 2;
  if (q.role === 'lord' && me.role === 'rebel') v += 4;
  return v;
}

// ---------- Đáp trả ----------
function respondCard(s, me, t, ask) {
  const opts = ask.options || [];
  const real = opts.filter(o => o.ids);
  const pickOpt = () => { const o = [...real].sort((a, b) => value(s, me, cardById(me, a.ids[0])) - value(s, me, cardById(me, b.ids[0])))[0]; return o ? { type: 'respond', ids: o.ids } : null; };
  const zhangba = () => { if (!opts.some(o => o.via === 'zhangba')) return null; const cs = worstFirst(s, me, me.hand).filter(c => c.type !== 'dao').slice(0, 2); return cs.length === 2 ? { type: 'respond', ids: cs.map(c => c.id) } : null; };
  switch (ask.purpose) {
    case 'quytai': {
      const who = getPlayer(s, ask.judgeWho); const rel = relation(s, me, who);
      const goodFor = hit => ({ lebu: hit, shandian: !hit, bagua: hit, tieqi: !hit, cuonglie: !hit, luoshen: hit })[ask.why];
      // muốn kết quả tốt cho bạn, xấu cho địch (tieqi/cuonglie: "hit" xấu cho người phán định? tieqi: người phán định là kẻ Sát)
      const wantHit = (() => {
        if (ask.why === 'tieqi') return rel > 0; // Mã Siêu phán: đỏ thì mục tiêu không né – tốt cho Mã Siêu
        if (ask.why === 'cuonglie') return rel > 0; // Hạ Hầu Đôn phán: không ♥ là phạt kẻ gây sát thương – tốt cho Hạ Hầu
        return rel > 0 ? goodFor(true) : rel < 0 ? !goodFor(true) : null;
      })();
      if (wantHit == null) return { type: 'pass' };
      const now = judgeHitLocal(ask.why, ask.judgeCard);
      if (now === wantHit) return { type: 'pass' };
      const c = worstFirst(s, me, me.hand).find(c => judgeHitLocal(ask.why, c) === wantHit);
      return c ? { type: 'respond', ids: [c.id] } : { type: 'pass' };
    }
    case 'dying': {
      const who = getPlayer(s, ask.forWho);
      const save = who === me || isFriend(s, me, who) || (me.role === 'spy' && who.role === 'lord');
      if (!save) return { type: 'pass' };
      return pickOpt() || { type: 'pass' };
    }
    case 'delegate': {
      const who = getPlayer(s, ask.forWho);
      return isFriend(s, me, who) && R() < .9 ? (pickOpt() || { type: 'pass' }) : { type: 'pass' };
    }
    case 'qinglong': return pickOpt() || { type: 'pass' };
    case 'jiedao': {
      const b = getPlayer(s, ask.target);
      if (isFriend(s, me, b) || b === me) return { type: 'pass' };
      return pickOpt() || zhangba() || { type: 'pass' };
    }
    case 'duel': {
      const opp = getPlayer(s, ask.src);
      if (isFriend(s, me, opp) && me.hp > 1) return { type: 'pass' };
      return pickOpt() || zhangba() || (ask.canDelegate ? { type: 'delegate' } : { type: 'pass' });
    }
    default: { // sat → Né, nanman → Sát, wanjian → Né
      if (ask.want === 'ne' && real.length === 1 && me.hp >= 3 && R() < .1 && ask.need <= 1) return { type: 'pass' };
      return pickOpt() || zhangba() || (ask.canDelegate ? { type: 'delegate' } : { type: 'pass' });
    }
  }
}
function cardById(me, id) { return [...me.hand, ...Object.values(me.equip).filter(Boolean)].find(c => c.id === id) || { type: 'x' }; }
function judgeHitLocal(why, c) {
  if (!c) return false;
  switch (why) {
    case 'lebu': return c.suit === 'H';
    case 'shandian': return c.suit === 'S' && c.rank >= 2 && c.rank <= 9;
    case 'bagua': case 'tieqi': return isRed(c);
    case 'cuonglie': return c.suit !== 'H';
    case 'luoshen': return isBlack(c);
  }
  return false;
}

// ---------- Vô giải ----------
const HARM = { guohe: 1, shunshou: 1, juedou: 1, nanman: 1, wanjian: 1, lebu: 1.5, shandian: .6, jiedao: .5, huogong: .8, bingliang: 1.2, tiesuo: .3 };
const HELP = { wuzhong: 1, taoyuan: .6, wugu: .2 };
function nullifyDecision(s, me, ask) {
  const tgt = ask.tgt ? getPlayer(s, ask.tgt) : null; if (!tgt) return { type: 'pass' };
  const rel = relation(s, me, tgt);
  if (rel === 0) return { type: 'pass' };
  const effective = ask.count % 2 === 0;
  let want, weight;
  if (HARM[ask.trick]) {
    want = rel < 0; weight = HARM[ask.trick];
    if (ask.trick === 'nanman' || ask.trick === 'wanjian') { // tự đỡ được thì khỏi phí
      const need = ask.trick === 'nanman' ? 'sat' : 'ne';
      if (rel > 0 && responseOptions(s, tgt, need).length && tgt === me) weight = .2;
      if (tgt.hp <= 1) weight = 2;
    }
  } else { want = rel > 0; weight = HELP[ask.trick] || .3; if (ask.trick === 'taoyuan' && rel < 0 && tgt.hp > 1) weight = .1; }
  if (want === effective) return { type: 'pass' };
  const myW = responseOptions(s, me, 'wuxie').length;
  const p = Math.min(.95, weight * (tgt === me ? 1 : .7) * (myW > 1 ? 1.3 : 1));
  if (R() < p) { const o = responseOptions(s, me, 'wuxie'); const c = o.length ? worstFirst(s, me, o.map(x => me.hand.find(h => h.id === x.ids[0])))[0] : null; return c ? { type: 'respond', ids: [c.id] } : { type: 'pass' }; }
  return { type: 'pass' };
}

// ---------- Bỏ bài ----------
function discardDecision(s, me, t, ask) {
  const n = ask.n;
  if (ask.purpose === 'huogong') {
    const tg = getPlayer(s, ask.tgt); const m = worstFirst(s, me, me.hand.filter(c => effSuit(me, c) === ask.suit && c.type !== 'dao'));
    return m.length && !isFriend(s, me, tg) && tg !== me && (isEnemy(s, me, tg) || R() < .3) ? { type: 'discard', ids: [m[0].id] } : { type: 'pass' };
  }
  if (ask.purpose === 'songco') { const w = worstFirst(s, me, me.hand)[0]; return w && value(s, me, w) <= 4 ? { type: 'discard', ids: [w.id] } : { type: 'pass' }; }
  if (ask.purpose === 'cuonglie') { if (me.hp <= 2 || me.hand.length >= 4) return { type: 'discard', ids: worstFirst(s, me, me.hand).slice(0, 2).map(c => c.id) }; return { type: 'pass' }; }
  if (ask.purpose === 'guanshi') {
    const tg = getPlayer(s, ask.tgt);
    const pool = worstFirst(s, me, [...me.hand, ...Object.values(me.equip).filter(c => c && c !== me.equip.weapon)]).filter(c => c.type !== 'dao');
    if (isEnemy(s, me, tg) && pool.length >= 2 && (tg.hp <= 2 || me.hand.length >= 4)) return { type: 'discard', ids: pool.slice(0, 2).map(c => c.id) };
    return { type: 'pass' };
  }
  return { type: 'discard', ids: worstFirst(s, me, me.hand).slice(0, n).map(c => c.id) };
}
function pickDecision(s, me, ask) {
  const from = getPlayer(s, ask.from); const rel = relation(s, me, from);
  if (ask.zones.includes('j') && from.judge.length && rel >= 0) return { type: 'pick', id: from.judge[0].card.id };
  const eq = Object.values(from.equip).filter(Boolean);
  if (ask.zones.includes('e') && eq.length && rel <= 0) {
    const pr = { armor: 3, plus: 2, weapon: 1.5, minus: 1 };
    const best = eq.sort((a, b) => (pr[CARD_INFO[b.type].kind] || 0) - (pr[CARD_INFO[a.type].kind] || 0))[0];
    if (!from.hand.length || R() < .7) return { type: 'pick', id: best.id };
  }
  if (ask.zones.includes('h') && from.hand.length) return { type: 'pick', zone: 'h' };
  if (eq.length && ask.zones.includes('e')) return { type: 'pick', id: eq[eq.length - 1].id };
  if (from.judge.length && ask.zones.includes('j')) return { type: 'pick', id: from.judge[0].card.id };
  return { type: 'pick', zone: 'h' };
}
function guanxing(s, me, t) {
  // có Lạc bất thì đưa ♥ lên đầu; còn lại lá tốt ở trên, xấu xuống đáy
  const cards = [...t.hold];
  const hasLebu = me.judge.some(j => j.as === 'lebu');
  const sorted = cards.sort((a, b) => value(s, me, b) - value(s, me, a));
  if (hasLebu) { const h = sorted.findIndex(c => c.suit === 'H'); if (h > 0) sorted.unshift(sorted.splice(h, 1)[0]); }
  const keep = sorted.filter((c, i) => i < 2 || value(s, me, c) >= 5);
  const bottom = sorted.filter(c => !keep.includes(c));
  return { type: 'guanxing', top: keep.map(c => c.id), bottom: bottom.map(c => c.id) };
}
