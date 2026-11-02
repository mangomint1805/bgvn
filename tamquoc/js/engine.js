// Engine luật Tam Quốc Sát – thuần logic, JSON-serializable, không dính mạng/UI.
// Mô hình: "ngăn xếp tác vụ" (s.stack). Mỗi tác vụ {k, stage, ...} được xử lý ở đỉnh ngăn xếp;
// tác vụ cần người chơi quyết định thì gắn t.ask = {type, players:[...], ...} rồi chờ applyAction.
// Tác vụ con trả kết quả qua s.ret cho tác vụ cha (cha đọc ngay khi được chạy lại).
import { buildDeck, CARD_INFO, GENERALS, LORD_IDS, SKILLS, ROLES, rolesFor, cardLabel, cardName, isRed, isBlack, SUIT_SYMBOL, SUIT_NAME, rankLabel, DECK_SIZE } from './cards.js?v=1';

let rand = Math.random;
export function setRandom(fn) { rand = fn; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(a) { return a[Math.floor(rand() * a.length)]; }
export const NULL_TIME = 3; // giây cho cửa sổ Vô giải khả kích

// ======================= KHỞI TẠO =======================
export function createGame(playerList, opts = {}) {
  const n = playerList.length;
  const roles = rolesFor(n);
  if (!roles) throw new Error('Cần 2–8 người chơi');
  shuffle(roles);
  const s = {
    phase: 'playing', players: [], deck: shuffle(buildDeck()), discard: [], turn: 0, turnCount: 0, round: 0,
    stack: [], log: [], ev: [], seq: 0, winner: null, lean: {}, ret: null, tf: {}, nRoles: rolesFor(n),
  };
  playerList.forEach((pl, i) => {
    s.players.push({ id: pl.id, name: pl.name, isBot: !!pl.isBot, role: roles[i], general: null, kingdom: null, gender: null,
      hp: 0, maxHp: 0, alive: true, hand: [], equip: { weapon: null, armor: null, plus: null, minus: null }, judge: [],
      revealed: roles[i] === 'lord', flags: {} });
    s.lean[pl.id] = 0;
  });
  const lord = s.players.find(p => p.role === 'lord');
  s.turn = s.players.indexOf(lord);
  // tướng: Chúa công chọn từ 3 tướng chúa + 2 tướng ngẫu nhiên; người khác 3 tướng ngẫu nhiên
  const pool = shuffle(Object.keys(GENERALS).filter(k => !GENERALS[k].lord));
  const offers = {}; offers[lord.id] = [...LORD_IDS, ...pool.splice(0, 2)];
  log(s, `Ván mới ${n} người. ${lord.name} là Chúa công 👑.`);
  s.stack.push({ k: 'choose', stage: 'lord', offers, pool });
  run(s);
  return s;
}

// ======================= TIỆN ÍCH =======================
function log(s, msg) { s.log.push(msg); if (s.log.length > 250) s.log.shift(); }
function ev(s, e) { e.n = ++s.seq; s.ev.push(e); if (s.ev.length > 80) s.ev.shift(); }
const nm = p => (p ? p.name : '?');
export function getPlayer(s, id) { return s.players.find(p => p.id === id); }
export function current(s) { return s.players[s.turn]; }
export function alivePlayers(s) { return s.players.filter(p => p.alive); }
export function top(s) { return s.stack.length ? s.stack[s.stack.length - 1] : null; }
export function topAsk(s) { const t = top(s); return t && t.ask ? t.ask : null; }
export function hasSkill(p, sk) {
  if (!p || !p.general || !p.alive) return false;
  if (!GENERALS[p.general].skills.includes(sk)) return false;
  return !SKILLS[sk].lord || p.role === 'lord';
}
export function weaponOf(p) { return p.equip.weapon ? p.equip.weapon.type : null; }
export function armorOf(p) { return p.equip.armor ? p.equip.armor.type : null; }
export function attackRange(p) { const w = p.equip.weapon; return w ? CARD_INFO[w.type].range : 1; }
// thứ tự người còn sống bắt đầu từ p (gồm p), theo chiều kim đồng hồ
export function orderFrom(s, p, includeSelf = true) {
  const n = s.players.length, i0 = s.players.indexOf(p), out = [];
  for (let k = includeSelf ? 0 : 1; k < n; k++) { const q = s.players[(i0 + k) % n]; if (q.alive) out.push(q); }
  return out;
}
export function distance(s, a, b) {
  if (a === b) return 0;
  const al = alivePlayers(s); const i = al.indexOf(a), j = al.indexOf(b);
  if (i < 0 || j < 0) return 99;
  const raw = Math.abs(i - j); let d = Math.min(raw, al.length - raw);
  if (b.equip.plus) d++;
  if (a.equip.minus) d--;
  if (hasSkill(a, 'mathuat')) d--;
  return Math.max(1, d);
}
export function inRange(s, a, b) { return a !== b && b.alive && distance(s, a, b) <= attackRange(a); }
function allCards(p) { return [...p.hand, ...Object.values(p.equip).filter(Boolean)]; }
function equipList(p) { return Object.values(p.equip).filter(Boolean); }
function cardCount(p, zones = 'hej') { let n = 0; if (zones.includes('h')) n += p.hand.length; if (zones.includes('e')) n += equipList(p).length; if (zones.includes('j')) n += p.judge.length; return n; }
const kongcheng = p => hasSkill(p, 'khongthanh') && p.hand.length === 0;

function drawCard(s) {
  if (!s.deck.length) {
    if (!s.discard.length) return null;
    s.deck = shuffle(s.discard); s.discard = [];
    log(s, '🔄 Hết bài, xào lại chồng bài bỏ.');
  }
  return s.deck.pop() || null;
}
function draw(s, p, k, why) {
  let got = 0;
  for (let i = 0; i < k; i++) { const c = drawCard(s); if (!c) break; p.hand.push(c); got++; }
  if (got) ev(s, { t: 'draw', p: p.id, k: got });
  return got;
}
// rút lá khỏi tay/trang bị/vùng phán định của p; kích hoạt Liên doanh, Kiêu cơ
function takeOut(s, p, cardId) {
  let i = p.hand.findIndex(c => c.id === cardId);
  if (i >= 0) { const c = p.hand.splice(i, 1)[0]; afterLose(s, p, 'h'); return c; }
  for (const k of Object.keys(p.equip)) if (p.equip[k] && p.equip[k].id === cardId) { const c = p.equip[k]; p.equip[k] = null; afterLose(s, p, 'e'); return c; }
  i = p.judge.findIndex(j => j.card.id === cardId);
  if (i >= 0) return p.judge.splice(i, 1)[0].card;
  return null;
}
function afterLose(s, p, zone) {
  if (!p.alive) return;
  if (zone === 'h' && p.hand.length === 0 && hasSkill(p, 'liendoanh')) { log(s, `${nm(p)} [Liên doanh] mất lá cuối, rút 1 lá.`); ev(s, { t: 'skill', p: p.id, sk: 'liendoanh' }); draw(s, p, 1); }
  if (zone === 'e' && hasSkill(p, 'kieuco')) { log(s, `${nm(p)} [Kiêu cơ] mất trang bị, rút 2 lá.`); ev(s, { t: 'skill', p: p.id, sk: 'kieuco' }); draw(s, p, 2); }
}
function discardIds(s, p, ids) { const out = []; for (const id of ids) { const c = takeOut(s, p, id); if (c) { s.discard.push(c); out.push(c); } } return out; }
function gainCard(s, p, c) { if (c) p.hand.push(c); }
function heal(s, p, k = 1, by = null) {
  const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + k);
  if (p.hp > before) { ev(s, { t: 'heal', p: p.id, k: p.hp - before }); if (by) friendly(s, by, p); }
  return p.hp - before;
}
function setTurnFlag(s, k, v) { s.tf[k] = v; }

// ---- Ấn tượng phe phái (thông tin công khai, bot dùng để đoán vai) ----
const clampLean = (s, id) => { s.lean[id] = Math.max(-8, Math.min(8, s.lean[id])); };
function hostile(s, a, b, w = 1) {
  if (!a || !b || a === b) return;
  if (b.role === 'lord') s.lean[a.id] -= 3 * w;
  else if (s.lean[b.id] > 0) s.lean[a.id] -= w * (1 + Math.min(2, s.lean[b.id] / 3));
  else if (s.lean[b.id] < 0) s.lean[a.id] += w;
  clampLean(s, a.id);
}
function friendly(s, a, b, w = 1) {
  if (!a || !b || a === b) return;
  if (b.role === 'lord') s.lean[a.id] += 1.5 * w;
  else s.lean[a.id] += Math.sign(s.lean[b.id]) * w;
  clampLean(s, a.id);
}

// ======================= VÒNG CHẠY =======================
function run(s) {
  let guard = 0;
  while (s.phase === 'playing' && s.stack.length) {
    if (++guard > 20000) throw new Error('vòng lặp engine quá dài');
    const t = top(s);
    if (t.ask) return;
    const h = TASKS[t.k]; if (!h) throw new Error('tác vụ lạ ' + t.k);
    h(s, t);
  }
}

export function applyAction(s, pid, a) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const t = top(s);
  if (!t || !t.ask) return { ok: false, reason: 'Không có gì để làm.' };
  if (!t.ask.players.includes(pid)) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const p = getPlayer(s, pid);
  if (!p) return { ok: false, reason: 'Không có người này.' };
  if (!a || typeof a !== 'object') return { ok: false, reason: 'Hành động lạ.' };
  let r;
  try {
    r = TASKS[t.k](s, t, { p, a });
  } catch (e) { return { ok: false, reason: 'Lỗi: ' + e.message }; }
  if (r && r.ok === false) return r;
  run(s);
  return { ok: true };
}
const bad = reason => ({ ok: false, reason });
function done(s, t, ret) { if (ret !== undefined) s.ret = ret; const i = s.stack.lastIndexOf(t); if (i >= 0) s.stack.splice(i, 1); }
function push(s, t) { s.stack.push(t); }

// ======================= THẮNG / THUA =======================
function kill(s, p, killer) {
  if (!p.alive) return;
  p.alive = false; p.hp = 0; p.revealed = true;
  log(s, `☠️ ${nm(p)} (${GENERALS[p.general].name}) tử trận! Thân phận: ${ROLES[p.role].icon} ${ROLES[p.role].name}.`);
  ev(s, { t: 'death', p: p.id, role: p.role });
  const cards = [...p.hand, ...equipList(p), ...p.judge.map(j => j.card)];
  p.hand = []; p.equip = { weapon: null, armor: null, plus: null, minus: null }; p.judge = [];
  s.discard.push(...cards);
  checkWin(s); if (s.phase !== 'playing') return;
  if (killer && killer.alive && killer !== p) {
    if (p.role === 'rebel') { log(s, `${nm(killer)} diệt Phản tặc, thưởng rút 3 lá.`); draw(s, killer, 3); }
    if (killer.role === 'lord' && p.role === 'loyal') {
      const lost = [...killer.hand, ...equipList(killer)]; killer.hand = []; killer.equip = { weapon: null, armor: null, plus: null, minus: null };
      s.discard.push(...lost); log(s, `😱 Chúa công giết nhầm Trung thần, phải bỏ hết bài trên tay và trang bị!`);
    }
  }
}
function checkWin(s) {
  const al = alivePlayers(s);
  const lord = s.players.find(p => p.role === 'lord');
  if (!lord.alive) {
    if (al.length === 1 && al[0].role === 'spy') endGame(s, 'spy', 'Nội gián là người sống sót cuối cùng! Cáo già thắng!');
    else endGame(s, 'rebel', 'Chúa công đã ngã xuống. Phản tặc thắng!');
    return;
  }
  if (!al.some(p => p.role === 'rebel' || p.role === 'spy')) endGame(s, 'lord', 'Phản tặc và Nội gián đã bị dẹp. Chúa công và Trung thần thắng!');
}
function endGame(s, winner, msg) {
  s.phase = 'ended'; s.winner = winner;
  // trả các lá đang "lơ lửng" (lá phán định, ngũ cốc, quan tinh) về chồng bỏ để bảo toàn bộ bài
  for (const t of s.stack) if (t.hold && t.hold.length) { s.discard.push(...t.hold); t.hold = []; }
  s.stack = [];
  for (const p of s.players) p.revealed = true;
  log(s, `🏆 ${msg}`); ev(s, { t: 'win', w: winner });
}
export function sideOf(role) { return role === 'lord' || role === 'loyal' ? 'lord' : role; }

// ======================= LỰA CHỌN KHI RA BÀI =======================
// Lá (ids) dùng như `as` có hợp lệ không; trả {ok, targets, min, max, second?}
export function useOptions(s, p, ids, as) {
  if (!Array.isArray(ids) || !ids.length) return bad('Chưa chọn lá.');
  const cards = ids.map(id => p.hand.find(c => c.id === id));
  if (cards.some(c => !c) || new Set(ids).size !== ids.length) return bad('Lá không có trên tay.');
  if (ids.length === 2) {
    if (!(as === 'sat' && weaponOf(p) === 'zhangba')) return bad('Không dùng 2 lá được.');
  } else if (ids.length === 1) {
    const c = cards[0];
    if (c.type !== as) {
      const ok = (as === 'sat' && ((hasSkill(p, 'vothanh') && isRed(c)) || (hasSkill(p, 'longdam') && c.type === 'ne')))
        || (as === 'guohe' && hasSkill(p, 'kytap') && isBlack(c))
        || (as === 'lebu' && hasSkill(p, 'quocsac') && c.suit === 'D');
      if (!ok) return bad('Lá này không dùng như vậy được.');
    }
  } else return bad('Số lá không hợp lệ.');
  const others = alivePlayers(s).filter(q => q !== p);
  const info = CARD_INFO[as];
  switch (as) {
    case 'sat': {
      const limit = weaponOf(p) === 'zhuge' || hasSkill(p, 'baohao') ? 99 : 1;
      if ((s.tf.slashes || 0) >= limit) return bad('Mỗi lượt chỉ được dùng 1 Sát.');
      // tầm tính khi lá dùng làm Sát chính là vũ khí đang đeo? (lá trên tay nên không ảnh hưởng)
      const targets = others.filter(q => inRange(s, p, q) && !kongcheng(q)).map(q => q.id);
      if (!targets.length) return bad('Không ai trong tầm đánh.');
      const max = weaponOf(p) === 'fangtian' && ids.length === p.hand.length ? 3 : 1;
      return { ok: true, targets, min: 1, max };
    }
    case 'ne': return bad('Né chỉ đánh ra khi bị Sát hoặc Vạn tiễn.');
    case 'wuxie': return bad('Vô giải chỉ dùng khi có cẩm nang sắp có tác dụng.');
    case 'dao':
      if (p.hp >= p.maxHp) return bad('Máu đang đầy.');
      return { ok: true, targets: [], min: 0, max: 0 };
    case 'wuzhong': case 'nanman': case 'wanjian': case 'taoyuan': case 'wugu':
      return { ok: true, targets: [], min: 0, max: 0 };
    case 'guohe': {
      const targets = others.filter(q => cardCount(q) > 0).map(q => q.id);
      return targets.length ? { ok: true, targets, min: 1, max: 1 } : bad('Không ai có bài để phá.');
    }
    case 'shunshou': {
      const targets = others.filter(q => cardCount(q) > 0 && !hasSkill(q, 'khiemton') && (hasSkill(p, 'kytai') || distance(s, p, q) <= 1)).map(q => q.id);
      return targets.length ? { ok: true, targets, min: 1, max: 1 } : bad('Không ai cách 1 có bài.');
    }
    case 'juedou': {
      const targets = others.filter(q => !kongcheng(q)).map(q => q.id);
      return targets.length ? { ok: true, targets, min: 1, max: 1 } : bad('Không ai để thách đấu.');
    }
    case 'jiedao': {
      const second = {};
      for (const a of others) {
        if (!a.equip.weapon) continue;
        const bs = alivePlayers(s).filter(b => b !== a && inRange(s, a, b) && !kongcheng(b)).map(b => b.id);
        if (bs.length) second[a.id] = bs;
      }
      const targets = Object.keys(second);
      return targets.length ? { ok: true, targets, min: 2, max: 2, second } : bad('Không ai có vũ khí để mượn.');
    }
    case 'lebu': {
      const targets = others.filter(q => !q.judge.some(j => j.as === 'lebu') && !hasSkill(q, 'khiemton')).map(q => q.id);
      return targets.length ? { ok: true, targets, min: 1, max: 1 } : bad('Không ai có thể nhận Lạc bất.');
    }
    case 'shandian':
      if (p.judge.some(j => j.as === 'shandian')) return bad('Đã có Thiểm điện trước mặt.');
      return { ok: true, targets: [], min: 0, max: 0 };
    default:
      if (info && ['weapon', 'armor', 'plus', 'minus'].includes(info.kind)) return { ok: true, targets: [], min: 0, max: 0 };
      return bad('Lá không hợp lệ.');
  }
}
// các cách dùng của 1 lá trên tay trong pha ra bài (cho giao diện + bot)
export function cardModes(s, p, c) {
  const modes = [c.type];
  if (c.type !== 'sat' && ((hasSkill(p, 'vothanh') && isRed(c)) || (hasSkill(p, 'longdam') && c.type === 'ne'))) modes.push('sat');
  if (c.type !== 'guohe' && hasSkill(p, 'kytap') && isBlack(c)) modes.push('guohe');
  if (c.type !== 'lebu' && hasSkill(p, 'quocsac') && c.suit === 'D') modes.push('lebu');
  return modes.map(as => ({ as, ...useOptions(s, p, [c.id], as) }));
}
// kỹ năng chủ động khả dụng
export function activeSkills(s, p) {
  const out = []; const tf = s.tf; const others = alivePlayers(s).filter(q => q !== p);
  if (hasSkill(p, 'nhanduc') && p.hand.length) out.push({ sk: 'nhanduc', cards: [1, 99], zones: 'h', targets: others.map(q => q.id), tmin: 1, tmax: 1 });
  if (hasSkill(p, 'chehanh') && !tf.chehanh && allCards(p).length) out.push({ sk: 'chehanh', cards: [1, 99], zones: 'he', targets: [], tmin: 0, tmax: 0 });
  if (hasSkill(p, 'khonhuc') && p.hp > 0) out.push({ sk: 'khonhuc', cards: [0, 0], targets: [], tmin: 0, tmax: 0 });
  if (hasSkill(p, 'phangian') && !tf.phangian && p.hand.length && others.length) out.push({ sk: 'phangian', cards: [0, 0], targets: others.map(q => q.id), tmin: 1, tmax: 1 });
  if (hasSkill(p, 'thanhnang') && !tf.thanhnang && p.hand.length) { const tg = alivePlayers(s).filter(q => q.hp < q.maxHp).map(q => q.id); if (tg.length) out.push({ sk: 'thanhnang', cards: [1, 1], zones: 'h', targets: tg, tmin: 1, tmax: 1 }); }
  if (hasSkill(p, 'ketnhan') && !tf.ketnhan && p.hand.length >= 2) { const tg = others.filter(q => q.gender === 'm' && q.hp < q.maxHp).map(q => q.id); if (tg.length) out.push({ sk: 'ketnhan', cards: [2, 2], zones: 'h', targets: tg, tmin: 1, tmax: 1 }); }
  if (hasSkill(p, 'ligian') && !tf.ligian && allCards(p).length) { const males = others.filter(q => q.gender === 'm').map(q => q.id); if (males.length >= 2) out.push({ sk: 'ligian', cards: [1, 1], zones: 'he', targets: males, tmin: 2, tmax: 2 }); }
  if (weaponOf(p) === 'zhangba' && p.hand.length >= 2) { const o = useOptionsXamau(s, p); if (o.ok) out.push({ sk: 'xamau', cards: [2, 2], zones: 'h', targets: o.targets, tmin: 1, tmax: 1 }); }
  return out;
}
function useOptionsXamau(s, p) { const ids = p.hand.slice(0, 2).map(c => c.id); return useOptions(s, p, ids, 'sat'); }

// lá có thể đánh ra để đáp trả (want: ne | sat | dao | wuxie | any)
export function responseOptions(s, p, want, forWho) {
  const out = []; const seen = new Set();
  const add = (c, as) => { if (!seen.has(c.id)) { seen.add(c.id); out.push({ ids: [c.id], as }); } };
  if (!p || !p.alive) return out;
  if (want === 'ne') {
    for (const c of p.hand) if (c.type === 'ne') add(c, 'ne');
    if (hasSkill(p, 'longdam')) for (const c of p.hand) if (c.type === 'sat') add(c, 'ne');
    if (hasSkill(p, 'khuynhquoc')) for (const c of p.hand) if (isBlack(c)) add(c, 'ne');
  } else if (want === 'sat') {
    for (const c of p.hand) if (c.type === 'sat') add(c, 'sat');
    if (hasSkill(p, 'vothanh')) for (const c of p.hand) if (isRed(c)) add(c, 'sat');
    if (hasSkill(p, 'longdam')) for (const c of p.hand) if (c.type === 'ne') add(c, 'sat');
    if (weaponOf(p) === 'zhangba' && p.hand.length >= 2) out.push({ ids: null, pick: 2, as: 'sat', via: 'zhangba' });
  } else if (want === 'dao') {
    for (const c of p.hand) if (c.type === 'dao') add(c, 'dao');
    if (hasSkill(p, 'capcuu') && current(s) !== p) for (const c of allCards(p)) if (isRed(c)) add(c, 'dao');
  } else if (want === 'wuxie') {
    for (const c of p.hand) if (c.type === 'wuxie') add(c, 'wuxie');
  } else if (want === 'any') {
    for (const c of p.hand) add(c, 'any');
  }
  return out;
}
// kiểm tra lá đáp trả hợp lệ; trả mảng lá hoặc null
function matchResponse(s, p, want, ids) {
  if (!Array.isArray(ids) || !ids.length) return null;
  const opts = responseOptions(s, p, want);
  if (ids.length === 2 && want === 'sat' && opts.some(o => o.via === 'zhangba')) {
    if (ids[0] === ids[1] || !ids.every(id => p.hand.some(c => c.id === id))) return null;
    return ids;
  }
  if (ids.length !== 1) return null;
  return opts.some(o => o.ids && o.ids[0] === ids[0]) ? ids : null;
}
function colorOf(cards) { if (!cards.length) return null; const r = cards.every(isRed), b = cards.every(isBlack); return r ? 'red' : b ? 'black' : null; }

// ======================= CÁC TÁC VỤ =======================
const TASKS = {};

// ---- Chọn tướng ----
TASKS.choose = (s, t, inp) => {
  const lord = s.players.find(p => p.role === 'lord');
  if (inp) {
    if (inp.a.type !== 'general') return bad('Hãy chọn tướng.');
    const id = inp.a.id; const p = inp.p;
    if (!t.offers[p.id] || !t.offers[p.id].includes(id) || p.general) return bad('Tướng không hợp lệ.');
    setGeneral(s, p, id);
    if (t.stage === 'lord') {
      // các tướng chúa không được chọn trả về pool
      t.pool.push(...t.offers[lord.id].filter(x => x !== id)); shuffle(t.pool);
      for (const q of s.players) if (q !== lord) t.offers[q.id] = t.pool.splice(0, 3);
      t.stage = 'others';
    }
    delete t.ask; return { ok: true };
  }
  if (t.stage === 'lord') { t.ask = { type: 'general', players: [lord.id] }; return; }
  const pending = s.players.filter(p => !p.general).map(p => p.id);
  if (pending.length) { t.ask = { type: 'general', players: pending }; return; }
  // xong: chia bài, bắt đầu từ Chúa công
  done(s, t);
  for (const p of s.players) draw(s, p, 4);
  log(s, 'Mỗi người nhận 4 lá. Chúa công đi trước!');
  push(s, { k: 'nextTurn', first: true });
};
function setGeneral(s, p, id) {
  const g = GENERALS[id];
  p.general = id; p.kingdom = g.kingdom; p.gender = g.gender;
  p.maxHp = g.hp + (p.role === 'lord' && s.players.length > 2 ? 1 : 0); p.hp = p.maxHp;
  log(s, `${nm(p)} chọn tướng ${g.name}${p.role === 'lord' ? '' : ''}.`);
  ev(s, { t: 'general', p: p.id, g: id });
}

// ---- Lượt chơi ----
TASKS.nextTurn = (s, t) => {
  done(s, t);
  if (!t.first) {
    const n = s.players.length; let i = s.turn;
    for (let k = 0; k < n; k++) { i = (i + 1) % n; if (s.players[i].alive) break; }
    s.turn = i;
  }
  s.turnCount++;
  const p = current(s);
  s.tf = { slashes: 0, slashed: false, skipPlay: false };
  p.flags.luoyi = false;
  log(s, `— Lượt ${s.turnCount}: ${nm(p)} (${GENERALS[p.general].name}) —`);
  ev(s, { t: 'turn', p: p.id });
  push(s, { k: 'nextTurn' });
  for (const k of ['ph_end', 'ph_discard', 'ph_play', 'ph_draw', 'ph_judge', 'ph_start']) push(s, { k, stage: 'begin' });
};

TASKS.ph_start = (s, t, inp) => {
  const p = current(s);
  if (!p.alive) return done(s, t);
  if (inp) { // Quan tinh
    if (inp.a.type !== 'guanxing') return bad('Hãy sắp xếp các lá.');
    const topIds = inp.a.top || [], botIds = inp.a.bottom || [];
    const all = [...topIds, ...botIds];
    if (all.length !== t.hold.length || new Set(all).size !== all.length || !all.every(id => t.hold.some(c => c.id === id))) return bad('Sắp xếp không hợp lệ.');
    const by = id => t.hold.find(c => c.id === id);
    for (let i = topIds.length - 1; i >= 0; i--) s.deck.push(by(topIds[i])); // lá đầu danh sách nằm trên cùng
    for (const id of botIds) s.deck.unshift(by(id));
    t.hold = [];
    log(s, `${nm(p)} [Quan tinh] xem bài: ${topIds.length} lá để trên, ${botIds.length} lá xuống đáy.`);
    delete t.ask; return done(s, t);
  }
  if (t.stage === 'begin') {
    if (hasSkill(p, 'quantinh')) {
      const x = Math.min(5, alivePlayers(s).length); t.hold = [];
      for (let i = 0; i < x; i++) { const c = drawCard(s); if (c) t.hold.push(c); }
      if (!t.hold.length) return done(s, t);
      ev(s, { t: 'skill', p: p.id, sk: 'quantinh' });
      t.stage = 'qx'; t.ask = { type: 'guanxing', players: [p.id] }; return;
    }
    if (hasSkill(p, 'lacthan')) { t.stage = 'luoshen'; t.loops = 0; }
    else return done(s, t);
  }
  if (t.stage === 'luoshen') {
    if (t.loops++ > 12) return done(s, t);
    t.stage = 'luoshenRes'; push(s, { k: 'judge', who: p.id, why: 'luoshen', stage: 'begin' }); return;
  }
  if (t.stage === 'luoshenRes') {
    const r = s.ret;
    if (r && r.card && r.hit) { // lá đen: về tay
      const i = s.discard.findIndex(c => c.id === r.card.id);
      if (i >= 0) { p.hand.push(s.discard.splice(i, 1)[0]); log(s, `${nm(p)} [Lạc thần] nhận ${cardLabel(r.card)}.`); }
      t.stage = 'luoshen'; return;
    }
    return done(s, t);
  }
  done(s, t);
};

TASKS.ph_judge = (s, t) => {
  const p = current(s);
  if (t.stage === 'begin') { t.left = p.judge.length; t.stage = 'next'; }
  if (t.stage === 'next') {
    if (!p.alive || !p.judge.length || t.left <= 0) return done(s, t);
    t.left--;
    const entry = p.judge.pop(); t.hold = [entry.card]; t.as = entry.as;
    log(s, `${nm(p)} phán định ${CARD_INFO[entry.as].name}.`);
    t.stage = 'null'; push(s, { k: 'nullify', trick: entry.as, src: null, tgt: p.id, count: 0, passed: [] }); return;
  }
  if (t.stage === 'null') {
    if (s.ret && s.ret.canceled) {
      log(s, `${CARD_INFO[t.as].name} trước mặt ${nm(p)} bị Vô giải khả kích huỷ.`);
      if (t.as === 'shandian') passLightning(s, p, t.hold.pop()); else s.discard.push(...t.hold);
      t.hold = []; t.stage = 'next'; return;
    }
    if (!p.alive) { s.discard.push(...t.hold); t.hold = []; return done(s, t); }
    t.stage = 'jres'; push(s, { k: 'judge', who: p.id, why: t.as, stage: 'begin' }); return;
  }
  if (t.stage === 'jres') {
    const r = s.ret || {};
    if (t.as === 'lebu') {
      s.discard.push(...t.hold); t.hold = [];
      if (!r.hit) { s.tf.skipPlay = true; log(s, `🍶 ${nm(p)} mải vui quên về: bỏ qua pha ra bài!`); ev(s, { t: 'lebu', p: p.id }); }
      else log(s, `${nm(p)} tỉnh táo, thoát Lạc bất tư thục.`);
      t.stage = 'next'; return;
    }
    if (t.as === 'shandian') {
      if (r.hit) {
        s.discard.push(...t.hold); t.hold = [];
        log(s, `⚡ Sét đánh trúng ${nm(p)}! Mất 3 máu.`); ev(s, { t: 'lightning', p: p.id });
        t.stage = 'next'; push(s, { k: 'damage', tgt: p.id, src: null, n: 3, cards: [], nature: 'thunder', stage: 'begin' }); return;
      }
      passLightning(s, p, t.hold.pop()); t.hold = []; t.stage = 'next'; return;
    }
    s.discard.push(...t.hold); t.hold = []; t.stage = 'next';
  }
};
function passLightning(s, p, card) {
  for (const q of orderFrom(s, p, false)) {
    if (!q.judge.some(j => j.as === 'shandian')) { q.judge.unshift({ card, as: 'shandian' }); log(s, `Thiểm điện chuyền sang ${nm(q)}.`); ev(s, { t: 'passbolt', from: p.id, to: q.id }); return; }
  }
  if (p.alive && !p.judge.some(j => j.as === 'shandian')) { p.judge.unshift({ card, as: 'shandian' }); return; }
  s.discard.push(card);
}

TASKS.ph_draw = (s, t, inp) => {
  const p = current(s);
  if (!p.alive) return done(s, t);
  if (inp) {
    const a = inp.a;
    if (t.stage === 'tuxi') {
      if (a.type !== 'targets') return bad('Chọn người hoặc bỏ qua.');
      const ids = a.ids || [];
      if (ids.length > 2 || new Set(ids).size !== ids.length || !ids.every(id => t.ask.candidates.includes(id))) return bad('Mục tiêu không hợp lệ.');
      delete t.ask;
      if (!ids.length) { normalDraw(s, p, 2); return done(s, t); }
      for (const id of ids) {
        const q = getPlayer(s, id); if (!q.hand.length) continue;
        const c = takeOut(s, q, pick(q.hand).id); p.hand.push(c); hostile(s, p, q, .5);
        ev(s, { t: 'move', from: q.id, to: p.id, card: c, priv: [p.id, q.id] });
      }
      log(s, `${nm(p)} [Đột tập] lấy 1 lá trên tay của ${ids.map(id => nm(getPlayer(s, id))).join(' và ')}.`);
      ev(s, { t: 'skill', p: p.id, sk: 'duttap' });
      return done(s, t);
    }
    if (t.stage === 'luoyi') {
      if (a.type !== 'yes' && a.type !== 'no') return bad('Chọn có hoặc không.');
      delete t.ask;
      if (a.type === 'yes') { p.flags.luoyi = true; log(s, `💪 ${nm(p)} [Lỏa y] cởi giáp: rút 1 lá, Sát/Quyết đấu lượt này +1 sát thương!`); ev(s, { t: 'skill', p: p.id, sk: 'loay' }); normalDraw(s, p, 1); }
      else normalDraw(s, p, 2);
      return done(s, t);
    }
    return bad('Hành động không hợp lệ.');
  }
  if (hasSkill(p, 'duttap')) {
    const cand = alivePlayers(s).filter(q => q !== p && q.hand.length).map(q => q.id);
    if (cand.length) { t.stage = 'tuxi'; t.ask = { type: 'targets', players: [p.id], candidates: cand, min: 0, max: 2, purpose: 'duttap' }; return; }
  }
  if (hasSkill(p, 'loay')) { t.stage = 'luoyi'; t.ask = { type: 'yesno', players: [p.id], purpose: 'loay' }; return; }
  normalDraw(s, p, hasSkill(p, 'anhtu') ? 3 : 2);
  done(s, t);
};
function normalDraw(s, p, k) { const g = draw(s, p, k); log(s, `${nm(p)} rút ${g} lá.`); }

TASKS.ph_play = (s, t, inp) => {
  const p = current(s);
  if (!p.alive || s.tf.skipPlay) return done(s, t);
  if (!inp) { t.ask = { type: 'play', players: [p.id] }; return; }
  const a = inp.a;
  if (a.type === 'end') { delete t.ask; return done(s, t); }
  let r;
  if (a.type === 'use') r = doUse(s, p, a);
  else if (a.type === 'skill') r = doSkill(s, p, a);
  else return bad('Hành động không hợp lệ.');
  if (r && r.ok === false) return r;
  delete t.ask; return { ok: true };
};

TASKS.ph_discard = (s, t, inp) => {
  const p = current(s);
  if (!p.alive) return done(s, t);
  if (inp) {
    if (inp.a.type !== 'discard') return bad('Hãy bỏ bài.');
    const ids = inp.a.ids || [];
    if (ids.length !== t.ask.n || new Set(ids).size !== ids.length || !ids.every(id => p.hand.some(c => c.id === id))) return bad(`Chọn đúng ${t.ask.n} lá trên tay.`);
    const cs = discardIds(s, p, ids); log(s, `${nm(p)} bỏ ${cs.length} lá.`); ev(s, { t: 'discard', p: p.id, cards: cs });
    delete t.ask; return done(s, t);
  }
  if (hasSkill(p, 'khacky') && !s.tf.slashed) { if (p.hand.length > p.hp) { log(s, `${nm(p)} [Khắc kỷ] không Sát lượt này: giữ nguyên bài.`); ev(s, { t: 'skill', p: p.id, sk: 'khacky' }); } return done(s, t); }
  const ex = p.hand.length - Math.max(0, p.hp);
  if (ex <= 0) return done(s, t);
  t.ask = { type: 'discard', players: [p.id], n: ex, purpose: 'phase' };
};

TASKS.ph_end = (s, t) => {
  const p = current(s);
  done(s, t);
  if (p.alive && hasSkill(p, 'benguyet')) { log(s, `${nm(p)} [Bế nguyệt] rút 1 lá.`); ev(s, { t: 'skill', p: p.id, sk: 'benguyet' }); draw(s, p, 1); }
  p.flags.luoyi = false;
};

// ---- Dùng lá trong pha ra bài ----
function doUse(s, p, a) {
  const ids = a.ids, as = a.as;
  const o = useOptions(s, p, ids, as);
  if (!o.ok) return o;
  const targets = Array.isArray(a.targets) ? a.targets : [];
  if (targets.length < o.min || targets.length > o.max || new Set(targets).size !== targets.length) return bad('Số mục tiêu không đúng.');
  if (as === 'jiedao') {
    if (!o.targets.includes(targets[0]) || !(o.second[targets[0]] || []).includes(targets[1])) return bad('Mục tiêu không hợp lệ.');
  } else if (!targets.every(id => o.targets.includes(id))) return bad('Mục tiêu không hợp lệ.');
  const info = CARD_INFO[as];
  const real = ids.map(id => p.hand.find(c => c.id === id));
  const tg = targets.map(id => getPlayer(s, id));
  const conv = real.length > 1 || real[0].type !== as;
  const label = conv ? `${info.name} (${real.map(cardLabel).join(' + ')})` : cardLabel(real[0]);
  // lá trì hoãn & trang bị: đặt lên bàn
  if (info.kind === 'delay') {
    const c = takeOut(s, p, ids[0]); const who = as === 'shandian' ? p : tg[0];
    who.judge.push({ card: c, as });
    log(s, as === 'shandian' ? `${nm(p)} đặt ⚡ Thiểm điện trước mặt mình.` : `${nm(p)} tặng ${nm(who)} 🍶 Lạc bất tư thục${conv ? ' [Quốc sắc]' : ''}.`);
    ev(s, { t: 'use', p: p.id, card: c, as, to: [who.id] });
    if (as === 'lebu') hostile(s, p, who, 1.5);
    return { ok: true };
  }
  if (['weapon', 'armor', 'plus', 'minus'].includes(info.kind)) {
    const c = takeOut(s, p, ids[0]); const slot = info.kind;
    const old = p.equip[slot]; p.equip[slot] = c;
    log(s, `${nm(p)} trang bị ${cardName(c)}.`); ev(s, { t: 'equip', p: p.id, card: c });
    if (old) { s.discard.push(old); afterLose(s, p, 'e'); }
    return { ok: true };
  }
  const cs = discardIds(s, p, ids);
  ev(s, { t: 'use', p: p.id, card: cs[0], cards: cs, as, to: targets });
  if (info.kind === 'trick') tapTri(s, p);
  switch (as) {
    case 'sat': {
      s.tf.slashes = (s.tf.slashes || 0) + 1; s.tf.slashed = true;
      log(s, `${nm(p)} ⚔️ Sát ${tg.map(nm).join(', ')} bằng ${label}.`);
      for (let i = tg.length - 1; i >= 0; i--) push(s, slashTask(p, tg[i], cs));
      return { ok: true };
    }
    case 'dao': heal(s, p, 1); log(s, `${nm(p)} ăn 🍑 Đào, hồi 1 máu.`); return { ok: true };
    case 'wuzhong': log(s, `${nm(p)} dùng ✨ Vô trung sinh hữu.`); push(s, { k: 'trick', trick: 'wuzhong', src: p.id, tgt: p.id, cards: cs, stage: 'begin' }); return { ok: true };
    case 'guohe': case 'shunshou': case 'juedou':
      log(s, `${nm(p)} dùng ${info.emo} ${info.name} lên ${nm(tg[0])}${conv ? ' (' + label + ')' : ''}.`);
      push(s, { k: 'trick', trick: as, src: p.id, tgt: tg[0].id, cards: cs, stage: 'begin' }); return { ok: true };
    case 'jiedao':
      log(s, `${nm(p)} 🔪 Tá đao sát nhân: bắt ${nm(tg[0])} chém ${nm(tg[1])}.`);
      push(s, { k: 'trick', trick: 'jiedao', src: p.id, tgt: tg[0].id, b: tg[1].id, cards: cs, stage: 'begin' }); return { ok: true };
    case 'nanman': case 'wanjian': {
      log(s, as === 'nanman' ? `🐘 ${nm(p)} thả voi: Nam man xâm nhập!` : `🏹 ${nm(p)} ra lệnh: Vạn tiễn tề phát!`);
      const q = orderFrom(s, p, false);
      for (let i = q.length - 1; i >= 0; i--) push(s, { k: 'trick', trick: as, src: p.id, tgt: q[i].id, cards: cs, stage: 'begin' });
      return { ok: true };
    }
    case 'taoyuan': {
      log(s, `🌸 ${nm(p)} mở tiệc Đào viên kết nghĩa: ai cũng hồi 1 máu.`);
      const q = orderFrom(s, p, true);
      for (let i = q.length - 1; i >= 0; i--) if (q[i].hp < q[i].maxHp) push(s, { k: 'trick', trick: 'taoyuan', src: p.id, tgt: q[i].id, cards: cs, stage: 'begin' });
      return { ok: true };
    }
    case 'wugu': {
      const q = orderFrom(s, p, true); const hold = [];
      for (let i = 0; i < q.length; i++) { const c = drawCard(s); if (c) hold.push(c); }
      log(s, `🌾 ${nm(p)} dùng Ngũ cốc phong đăng: lật ${hold.map(cardLabel).join(', ')}.`);
      push(s, { k: 'wugu', src: p.id, order: q.map(x => x.id), i: 0, hold, stage: 'next' });
      return { ok: true };
    }
  }
  return { ok: true };
}
function tapTri(s, p) { if (hasSkill(p, 'taptri')) { log(s, `${nm(p)} [Tập trí] rút 1 lá.`); ev(s, { t: 'skill', p: p.id, sk: 'taptri' }); draw(s, p, 1); } }
function slashTask(src, tgt, cards, extra = {}) {
  return { k: 'slash', src: src.id, tgt: tgt.id, cards: cards.map(c => c.id), color: colorOf(cards), stage: 'begin', ...extra };
}

// ---- Kỹ năng chủ động ----
function doSkill(s, p, a) {
  const opt = activeSkills(s, p).find(o => o.sk === a.skill);
  if (!opt) return bad('Không dùng được kỹ năng này lúc này.');
  const ids = Array.isArray(a.ids) ? a.ids : []; const targets = Array.isArray(a.targets) ? a.targets : [];
  if (ids.length < opt.cards[0] || ids.length > opt.cards[1] || new Set(ids).size !== ids.length) return bad('Số lá chọn không đúng.');
  const pool = opt.zones === 'he' ? allCards(p) : p.hand;
  if (!ids.every(id => pool.some(c => c.id === id))) return bad('Lá không hợp lệ.');
  if (targets.length < opt.tmin || targets.length > opt.tmax || new Set(targets).size !== targets.length || !targets.every(id => opt.targets.includes(id))) return bad('Mục tiêu không hợp lệ.');
  const tg = targets.map(id => getPlayer(s, id));
  ev(s, { t: 'skill', p: p.id, sk: a.skill, to: targets });
  switch (a.skill) {
    case 'nhanduc': {
      const q = tg[0];
      for (const id of ids) { const c = takeOut(s, p, id); q.hand.push(c); }
      ev(s, { t: 'move', from: p.id, to: q.id, k: ids.length, priv: [p.id, q.id] });
      friendly(s, p, q); log(s, `${nm(p)} [Nhân đức] tặng ${nm(q)} ${ids.length} lá.`);
      s.tf.nhanduc = (s.tf.nhanduc || 0) + ids.length;
      if (s.tf.nhanduc >= 2 && !s.tf.nhanducHeal && p.hp < p.maxHp) { s.tf.nhanducHeal = true; heal(s, p, 1); log(s, `${nm(p)} hồi 1 máu nhờ lòng nhân.`); }
      return { ok: true };
    }
    case 'chehanh': {
      s.tf.chehanh = true; const cs = discardIds(s, p, ids); ev(s, { t: 'discard', p: p.id, cards: cs });
      log(s, `${nm(p)} [Chế hành] đổi ${cs.length} lá.`); draw(s, p, cs.length); return { ok: true };
    }
    case 'khonhuc': {
      log(s, `🔥 ${nm(p)} [Khổ nhục] tự đánh mình: mất 1 máu, rút 2 lá.`);
      push(s, { k: 'loseHp', who: p.id, n: 1, stage: 'begin', then: 'khonhuc' }); return { ok: true };
    }
    case 'phangian': {
      s.tf.phangian = true; log(s, `${nm(p)} [Phản gián] thử thách ${nm(tg[0])}: đoán chất đi!`);
      push(s, { k: 'fanjian', src: p.id, tgt: tg[0].id, stage: 'begin' }); return { ok: true };
    }
    case 'thanhnang': {
      s.tf.thanhnang = true; const cs = discardIds(s, p, ids); ev(s, { t: 'discard', p: p.id, cards: cs });
      heal(s, tg[0], 1, p); log(s, `🌿 ${nm(p)} [Thanh nang] chữa cho ${tg[0] === p ? 'mình' : nm(tg[0])} 1 máu.`); return { ok: true };
    }
    case 'ketnhan': {
      s.tf.ketnhan = true; const cs = discardIds(s, p, ids); ev(s, { t: 'discard', p: p.id, cards: cs });
      heal(s, p, 1); heal(s, tg[0], 1, p); log(s, `💞 ${nm(p)} [Kết nhân] cùng ${nm(tg[0])} hồi 1 máu.`); return { ok: true };
    }
    case 'ligian': {
      const [x, y] = tg;
      if (kongcheng(y)) return bad('Người thứ hai đang Không thành, không thể bị Quyết đấu.');
      s.tf.ligian = true; const cs = discardIds(s, p, ids); ev(s, { t: 'discard', p: p.id, cards: cs });
      log(s, `🌙 ${nm(p)} [Ly gián]: ${nm(x)} buộc phải Quyết đấu ${nm(y)}!`);
      hostile(s, p, y, .5);
      push(s, { k: 'duel', a: x.id, b: y.id, cards: [], stage: 'begin', ligian: true }); return { ok: true };
    }
    case 'xamau': {
      return doUse(s, p, { ids, as: 'sat', targets });
    }
  }
  return bad('Kỹ năng lạ.');
}

// ---- Mất máu (không phải sát thương) ----
TASKS.loseHp = (s, t) => {
  const p = getPlayer(s, t.who);
  if (t.stage === 'begin') {
    if (!p.alive) return done(s, t);
    p.hp -= t.n; ev(s, { t: 'damage', p: p.id, k: t.n, lose: true });
    t.stage = 'after';
    if (p.hp <= 0) { push(s, { k: 'dying', who: p.id, src: null, stage: 'begin' }); return; }
  }
  done(s, t);
  if (p.alive && t.then === 'khonhuc') draw(s, p, 2);
};

// ---- Phản gián ----
TASKS.fanjian = (s, t, inp) => {
  const src = getPlayer(s, t.src), tgt = getPlayer(s, t.tgt);
  if (inp) {
    if (inp.a.type !== 'suit' || !SUIT_SYMBOL[inp.a.suit]) return bad('Chọn 1 chất.');
    delete t.ask; const guess = inp.a.suit;
    if (!src.hand.length) return done(s, t);
    const c = takeOut(s, src, pick(src.hand).id); tgt.hand.push(c);
    ev(s, { t: 'move', from: src.id, to: tgt.id, card: c });
    log(s, `${nm(tgt)} đoán ${SUIT_SYMBOL[guess]} ${SUIT_NAME[guess]}, rút được ${cardLabel(c)}${c.suit === guess ? ' – đoán trúng!' : ' – sai rồi!'}`);
    done(s, t);
    if (c.suit !== guess) { hostile(s, src, tgt); push(s, { k: 'damage', tgt: tgt.id, src: src.id, n: 1, cards: [], stage: 'begin' }); }
    return { ok: true };
  }
  if (!src.alive || !tgt.alive || !src.hand.length) return done(s, t);
  t.ask = { type: 'suit', players: [tgt.id], src: src.id };
};

// ---- Sát ----
TASKS.slash = (s, t, inp) => {
  const src = getPlayer(s, t.src); let tgt = getPlayer(s, t.tgt);
  if (inp) {
    const a = inp.a;
    if (t.stage === 'liuliAns') {
      if (a.type === 'pass') { delete t.ask; t.stage = 'songco'; return { ok: true }; }
      if (a.type !== 'liuli') return bad('Chọn lá và người, hoặc bỏ qua.');
      if (!t.ask.candidates.includes(a.target) || !allCards(tgt).some(c => c.id === a.cardId)) return bad('Không hợp lệ.');
      delete t.ask;
      const cs = discardIds(s, tgt, [a.cardId]); ev(s, { t: 'discard', p: tgt.id, cards: cs });
      const nt = getPlayer(s, a.target);
      log(s, `🌺 ${nm(tgt)} [Lưu ly] bỏ 1 lá, chuyển Sát sang ${nm(nt)}!`); ev(s, { t: 'skill', p: tgt.id, sk: 'luuly', to: [nt.id] });
      hostile(s, tgt, nt, .5);
      t.tgt = nt.id; t.redirected = true; t.stage = 'songco'; return { ok: true };
    }
    if (t.stage === 'songcoAns') {
      delete t.ask;
      if (a.type === 'discard' && Array.isArray(a.ids) && a.ids.length === 1 && tgt.hand.some(c => c.id === a.ids[0])) {
        const cs = discardIds(s, tgt, a.ids); ev(s, { t: 'discard', p: tgt.id, cards: cs }); log(s, `${nm(tgt)} bỏ 1 lá vì Song kiếm.`);
      } else if (a.type === 'pass') { draw(s, src, 1); log(s, `${nm(src)} rút 1 lá nhờ Song kiếm.`); }
      else { t.ask = t.lastAsk; return bad('Bỏ 1 lá hoặc để đối phương rút.'); }
      t.stage = 'tieqi'; return { ok: true };
    }
    if (t.stage === 'guanshiAns') {
      delete t.ask;
      if (a.type === 'discard' && Array.isArray(a.ids) && a.ids.length === 2 && new Set(a.ids).size === 2 && a.ids.every(id => allCards(src).some(c => c.id === id && c !== src.equip.weapon))) {
        const cs = discardIds(s, src, a.ids); ev(s, { t: 'discard', p: src.id, cards: cs });
        log(s, `🪓 ${nm(src)} bổ Quán thạch phủ: Sát vẫn trúng!`); ev(s, { t: 'skill', p: src.id, sk: 'guanshi', to: [tgt.id] });
        t.stage = 'hit'; return { ok: true };
      }
      if (a.type === 'pass') return done(s, t);
      t.ask = t.lastAsk; return bad('Chọn 2 lá để bỏ hoặc bỏ qua.');
    }
    if (t.stage === 'hanbingAns') {
      delete t.ask;
      if (a.type === 'yes') {
        log(s, `❄️ ${nm(src)} dùng Băng phách kiếm: không gây sát thương mà phá 2 lá của ${nm(tgt)}.`);
        done(s, t); push(s, { k: 'pick', chooser: src.id, from: tgt.id, mode: 'discard', zones: 'he', stage: 'begin' }); push(s, { k: 'pick', chooser: src.id, from: tgt.id, mode: 'discard', zones: 'he', stage: 'begin' });
        hostile(s, src, tgt, .5); return { ok: true };
      }
      t.stage = 'hit2'; return { ok: true };
    }
    return bad('Hành động không hợp lệ.');
  }
  if (!tgt || !tgt.alive) return done(s, t);
  switch (t.stage) {
    case 'begin': {
      hostile(s, src, tgt);
      if (!t.redirected && hasSkill(tgt, 'luuly') && allCards(tgt).length) {
        const cand = alivePlayers(s).filter(q => q !== tgt && q !== src && inRange(s, tgt, q) && !kongcheng(q)).map(q => q.id);
        if (cand.length) { t.stage = 'liuliAns'; t.ask = { type: 'liuli', players: [tgt.id], candidates: cand, src: src.id }; return; }
      }
      t.stage = 'songco'; return;
    }
    case 'songco': {
      if (src.alive && weaponOf(src) === 'cixiong' && src.gender && tgt.gender && src.gender !== tgt.gender) {
        log(s, `⚔️ Thư hùng song kiếm của ${nm(src)} phát động.`);
        if (!tgt.hand.length) { draw(s, src, 1); t.stage = 'tieqi'; return; }
        t.stage = 'songcoAns'; t.ask = t.lastAsk = { type: 'discard', players: [tgt.id], n: 1, optional: true, purpose: 'songco', src: src.id }; return;
      }
      t.stage = 'tieqi'; return;
    }
    case 'tieqi': {
      if (hasSkill(src, 'thietky')) { t.stage = 'tieqiRes'; push(s, { k: 'judge', who: src.id, why: 'tieqi', stage: 'begin' }); return; }
      t.stage = 'armor'; return;
    }
    case 'tieqiRes': {
      if (s.ret && s.ret.hit) { t.noDodge = true; log(s, `🐎 ${nm(src)} [Thiết kỵ]: ${nm(tgt)} không thể Né!`); ev(s, { t: 'skill', p: src.id, sk: 'thietky', to: [tgt.id] }); }
      t.stage = 'armor'; return;
    }
    case 'armor': {
      const ignore = src.alive && weaponOf(src) === 'qinggang';
      if (!ignore && armorOf(tgt) === 'renwang' && t.color === 'black') {
        log(s, `🛡️ Nhân vương thuẫn của ${nm(tgt)} chặn Sát đen!`); ev(s, { t: 'block', p: tgt.id }); return done(s, t);
      }
      t.ignore = ignore;
      if (t.noDodge) { t.stage = 'hit'; return; }
      t.need = hasSkill(src, 'vosong') ? 2 : 1; t.got = 0; t.stage = 'dodgeLoop'; return;
    }
    case 'dodgeLoop': {
      if (t.got >= t.need) { t.stage = 'dodged'; return; }
      t.stage = 'dodgeRes';
      push(s, { k: 'askCard', who: tgt.id, want: 'ne', src: src.id, bagua: !t.ignore, purpose: 'sat', need: t.need - t.got, stage: 'begin' });
      return;
    }
    case 'dodgeRes': {
      if (s.ret && s.ret.ok) { t.got++; t.stage = 'dodgeLoop'; return; }
      t.stage = 'hit'; return;
    }
    case 'dodged': {
      ev(s, { t: 'dodge', p: tgt.id });
      if (!src.alive) return done(s, t);
      if (weaponOf(src) === 'qinglong' && responseOptions(s, src, 'sat').length) {
        t.stage = 'qinglongRes';
        push(s, { k: 'askCard', who: src.id, want: 'sat', src: tgt.id, optional: true, purpose: 'qinglong', stage: 'begin' }); return;
      }
      if (weaponOf(src) === 'guanshi' && allCards(src).filter(c => c !== src.equip.weapon).length >= 2) {
        t.stage = 'guanshiAns'; t.ask = t.lastAsk = { type: 'discard', players: [src.id], n: 2, optional: true, zones: 'he', purpose: 'guanshi', tgt: tgt.id }; return;
      }
      return done(s, t);
    }
    case 'qinglongRes': {
      const r = s.ret; done(s, t);
      if (r && r.ok && tgt.alive) {
        log(s, `🐉 ${nm(src)} vung Thanh long đao chém tiếp ${nm(tgt)}!`); ev(s, { t: 'skill', p: src.id, sk: 'qinglong', to: [tgt.id] });
        push(s, slashTask(src, tgt, r.cards, { fromQinglong: true }));
      }
      return;
    }
    case 'hit': {
      if (src.alive && weaponOf(src) === 'hanbing' && allCards(tgt).length) { t.stage = 'hanbingAns'; t.ask = { type: 'yesno', players: [src.id], purpose: 'hanbing', tgt: tgt.id }; return; }
      t.stage = 'hit2'; return;
    }
    case 'hit2': {
      done(s, t);
      if (src.alive && weaponOf(src) === 'qilin' && (tgt.equip.plus || tgt.equip.minus)) {
        const h = tgt.equip.plus || tgt.equip.minus;
        takeOut(s, tgt, h.id); s.discard.push(h);
        log(s, `🏹 Kỳ lân cung bắn rụng ngựa ${cardName(h)} của ${nm(tgt)}.`); ev(s, { t: 'discard', p: tgt.id, cards: [h] });
      }
      const n = 1 + (src.flags.luoyi ? 1 : 0);
      push(s, { k: 'damage', tgt: tgt.id, src: src.id, n, cards: t.cards, stage: 'begin' });
      return;
    }
  }
};

// ---- Hỏi đánh lá đáp trả (Né / Sát) ----
TASKS.askCard = (s, t, inp) => {
  const p = getPlayer(s, t.who);
  if (inp) {
    const a = inp.a;
    if (a.type === 'pass') { delete t.ask; return done(s, t, { ok: false }); }
    if (a.type === 'delegate') {
      if (!t.ask.canDelegate) return bad('Không nhờ được.');
      delete t.ask; t.delegated = true; t.stage = 'delegateRes';
      const kd = t.want === 'ne' ? 'wei' : 'shu';
      const order = orderFrom(s, p, false).filter(q => q.kingdom === kd).map(q => q.id);
      log(s, `${nm(p)} [${t.want === 'ne' ? 'Hộ giá' : 'Kích tướng'}] kêu gọi quân ${kd === 'wei' ? 'Ngụy' : 'Thục'} đánh hộ!`);
      ev(s, { t: 'skill', p: p.id, sk: t.want === 'ne' ? 'hogia' : 'kichtuong' });
      push(s, { k: 'delegate', for: p.id, want: t.want, order, i: 0, src: t.src, purpose: t.purpose });
      return { ok: true };
    }
    if (a.type !== 'respond') return bad('Chọn lá để đánh hoặc bỏ qua.');
    const ids = matchResponse(s, p, t.want, a.ids);
    if (!ids) return bad('Lá này không dùng được.');
    delete t.ask;
    const cs = discardIds(s, p, ids);
    playedLog(s, p, cs, t.want);
    if (t.want === 'sat' && p === current(s)) s.tf.slashed = true;
    return done(s, t, { ok: true, cards: cs }), { ok: true };
  }
  if (!p || !p.alive) return done(s, t, { ok: false });
  if (t.stage === 'begin') {
    if (t.want === 'ne' && t.bagua && armorOf(p) === 'bagua') {
      t.stage = 'baguaRes'; push(s, { k: 'judge', who: p.id, why: 'bagua', stage: 'begin' }); return;
    }
    t.stage = 'ask';
  }
  if (t.stage === 'baguaRes') {
    if (s.ret && s.ret.hit) { log(s, `☯️ Bát quái trận bảo vệ ${nm(p)}: coi như đã Né!`); ev(s, { t: 'play', p: p.id, as: 'ne', via: 'bagua' }); return done(s, t, { ok: true, cards: [] }); }
    t.stage = 'ask';
  }
  if (t.stage === 'delegateRes') {
    if (s.ret && s.ret.ok) return done(s, t, s.ret);
    t.stage = 'ask';
  }
  if (t.stage === 'ask') {
    const opts = responseOptions(s, p, t.want);
    const kd = t.want === 'ne' ? 'wei' : 'shu';
    const canDelegate = !t.delegated && ((t.want === 'ne' && hasSkill(p, 'hogia')) || (t.want === 'sat' && t.purpose !== 'qinglong' && t.purpose !== 'jiedao' && hasSkill(p, 'kichtuong')))
      && alivePlayers(s).some(q => q !== p && q.kingdom === kd);
    if (!opts.length && !canDelegate) return done(s, t, { ok: false });
    t.ask = { type: 'card', players: [p.id], want: t.want, options: opts, canDelegate, src: t.src, purpose: t.purpose, need: t.need || 1, target: t.target || null };
  }
};
function playedLog(s, p, cs, want) {
  const info = CARD_INFO[want];
  const conv = cs.length !== 1 || cs[0].type !== want;
  log(s, `${nm(p)} đánh ${info.emo} ${info.name}${conv ? ' (' + cs.map(cardLabel).join(' + ') + ')' : ''}.`);
  ev(s, { t: 'play', p: p.id, as: want, cards: cs, card: cs[0] });
}

TASKS.delegate = (s, t, inp) => {
  const forP = getPlayer(s, t.for);
  if (inp) {
    const a = inp.a; const h = inp.p;
    if (a.type === 'pass') { delete t.ask; t.i++; return { ok: true }; }
    if (a.type !== 'respond') return bad('Chọn lá hoặc bỏ qua.');
    const ids = matchResponse(s, h, t.want, a.ids);
    if (!ids) return bad('Lá này không dùng được.');
    delete t.ask;
    const cs = discardIds(s, h, ids); playedLog(s, h, cs, t.want);
    log(s, `${nm(h)} đánh hộ ${nm(forP)}!`); friendly(s, h, forP);
    return done(s, t, { ok: true, cards: cs }), { ok: true };
  }
  while (t.i < t.order.length) {
    const h = getPlayer(s, t.order[t.i]);
    if (!forP.alive) break;
    if (!h.alive) { t.i++; continue; }
    const opts = responseOptions(s, h, t.want).filter(o => o.ids);
    if (!opts.length) { t.i++; continue; }
    t.ask = { type: 'card', players: [h.id], want: t.want, options: opts, purpose: 'delegate', forWho: forP.id, src: t.src, optional: true };
    return;
  }
  done(s, t, { ok: false });
};

// ---- Phán định ----
// hit: kết quả "kích hoạt" theo loại: lebu (♥ = thoát), shandian (♠2–9 = nổ), bagua/tieqi (đỏ), cuonglie (≠♥), luoshen (đen)
function judgeHit(why, c) {
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
export const JUDGE_TEXT = { lebu: 'Lạc bất: ra ♥ thì thoát', shandian: 'Thiểm điện: ♠2–9 thì sét đánh', bagua: 'Bát quái: ra đỏ = Né', tieqi: 'Thiết kỵ: ra đỏ thì không Né được', cuonglie: 'Cương liệt: không ra ♥ thì phạt', luoshen: 'Lạc thần: ra đen thì nhận lá' };
TASKS.judge = (s, t, inp) => {
  const who = getPlayer(s, t.who);
  if (inp) { // Quỷ tài
    const a = inp.a; const sm = inp.p;
    delete t.ask;
    if (a.type === 'pass') { t.stage = 'final'; return { ok: true }; }
    if (a.type !== 'respond' || !Array.isArray(a.ids) || a.ids.length !== 1 || !sm.hand.some(c => c.id === a.ids[0])) { t.ask = t.lastAsk; return bad('Chọn 1 lá trên tay hoặc bỏ qua.'); }
    const c = takeOut(s, sm, a.ids[0]);
    s.discard.push(t.hold.pop()); t.hold.push(c);
    log(s, `🦊 ${nm(sm)} [Quỷ tài] đổi lá phán định thành ${cardLabel(c)}.`); ev(s, { t: 'judge', p: who.id, card: c, why: t.why, swap: sm.id });
    t.stage = 'final'; return { ok: true };
  }
  if (t.stage === 'begin') {
    const c = drawCard(s); t.hold = c ? [c] : [];
    if (!c) return done(s, t, { hit: false, card: null });
    ev(s, { t: 'judge', p: who.id, card: c, why: t.why });
    t.stage = 'modify'; t.asked = [];
  }
  if (t.stage === 'modify') {
    const cur = t.hold[0]; const now = judgeHit(t.why, cur);
    const sm = alivePlayers(s).find(q => hasSkill(q, 'quytai') && !t.asked.includes(q.id) && q.hand.some(c => judgeHit(t.why, c) !== now));
    if (sm) { t.asked.push(sm.id); t.ask = t.lastAsk = { type: 'card', players: [sm.id], want: 'any', options: sm.hand.map(c => ({ ids: [c.id], as: 'any' })), purpose: 'quytai', judgeWho: who.id, why: t.why, judgeCard: cur, optional: true }; return; }
    t.stage = 'final';
  }
  if (t.stage === 'final') {
    const c = t.hold.pop(); const hit = judgeHit(t.why, c);
    log(s, `🔮 Phán định của ${nm(who)}: ${cardLabel(c)} → ${JUDGE_TEXT[t.why] ? (hit ? 'ứng nghiệm' : 'không ứng') : ''}.`);
    ev(s, { t: 'judgeRes', p: who.id, card: c, why: t.why, hit });
    if (who.alive && hasSkill(who, 'thiendo')) { who.hand.push(c); log(s, `${nm(who)} [Thiên đố] nhận lá phán định.`); }
    else s.discard.push(c);
    done(s, t, { hit, card: c });
  }
};

// ---- Sát thương ----
TASKS.damage = (s, t) => {
  const tgt = getPlayer(s, t.tgt), src = t.src ? getPlayer(s, t.src) : null;
  if (t.stage === 'begin') {
    if (!tgt.alive) return done(s, t);
    tgt.hp -= t.n;
    log(s, `💥 ${nm(tgt)} mất ${t.n} máu${src && src !== tgt ? ' do ' + nm(src) : ''} (còn ${Math.max(0, tgt.hp)}).`);
    ev(s, { t: 'damage', p: tgt.id, k: t.n, src: t.src, nature: t.nature || 'normal' });
    if (src) hostile(s, src, tgt);
    t.stage = 'after';
    if (tgt.hp <= 0) { push(s, { k: 'dying', who: tgt.id, src: t.src, stage: 'begin' }); return; }
  }
  done(s, t);
  if (!tgt.alive) return;
  // kỹ năng sau khi bị sát thương (đẩy ngược để chạy theo thứ tự)
  const after = [];
  if (hasSkill(tgt, 'gianhung')) {
    const got = [];
    for (const id of t.cards || []) { const i = s.discard.findIndex(c => c.id === id); if (i >= 0) got.push(s.discard.splice(i, 1)[0]); }
    if (got.length) { tgt.hand.push(...got); log(s, `🏯 ${nm(tgt)} [Gian hùng] thu ${got.map(cardLabel).join(', ')} về tay.`); ev(s, { t: 'skill', p: tgt.id, sk: 'gianhung' }); }
  }
  if (hasSkill(tgt, 'dike')) { log(s, `🍷 ${nm(tgt)} [Di kế] rút ${2 * t.n} lá.`); ev(s, { t: 'skill', p: tgt.id, sk: 'dike' }); draw(s, tgt, 2 * t.n); }
  if (src && src.alive && src !== tgt && hasSkill(tgt, 'phandap') && allCards(src).length) after.push({ k: 'pick', chooser: tgt.id, from: src.id, mode: 'take', zones: 'he', stage: 'begin', skill: 'phandap' });
  if (src && src.alive && src !== tgt && hasSkill(tgt, 'cuonglie')) after.push({ k: 'cuonglie', who: tgt.id, src: src.id, stage: 'begin' });
  for (let i = after.length - 1; i >= 0; i--) push(s, after[i]);
};

TASKS.cuonglie = (s, t, inp) => {
  const p = getPlayer(s, t.who), src = getPlayer(s, t.src);
  if (inp) {
    const a = inp.a; delete t.ask;
    if (a.type === 'discard' && Array.isArray(a.ids) && a.ids.length === 2 && new Set(a.ids).size === 2 && a.ids.every(id => src.hand.some(c => c.id === id))) {
      const cs = discardIds(s, src, a.ids); ev(s, { t: 'discard', p: src.id, cards: cs }); log(s, `${nm(src)} chịu bỏ 2 lá vì Cương liệt.`); done(s, t); return { ok: true };
    }
    if (a.type === 'pass') { done(s, t); push(s, { k: 'damage', tgt: src.id, src: p.id, n: 1, cards: [], stage: 'begin' }); return { ok: true }; }
    t.ask = t.lastAsk; return bad('Bỏ 2 lá hoặc chịu 1 máu.');
  }
  if (t.stage === 'begin') { log(s, `👁️ ${nm(p)} [Cương liệt] phản đòn!`); ev(s, { t: 'skill', p: p.id, sk: 'cuonglie' }); t.stage = 'res'; push(s, { k: 'judge', who: p.id, why: 'cuonglie', stage: 'begin' }); return; }
  if (t.stage === 'res') {
    if (!(s.ret && s.ret.hit) || !src.alive) return done(s, t);
    if (src.hand.length < 2) { done(s, t); push(s, { k: 'damage', tgt: src.id, src: p.id, n: 1, cards: [], stage: 'begin' }); return; }
    t.stage = 'ans'; t.ask = t.lastAsk = { type: 'discard', players: [src.id], n: 2, optional: true, purpose: 'cuonglie', src: p.id };
  }
};

// ---- Hấp hối: hỏi Đào lần lượt ----
TASKS.dying = (s, t, inp) => {
  const p = getPlayer(s, t.who);
  if (inp) {
    const a = inp.a; const h = inp.p;
    if (a.type === 'pass') { delete t.ask; t.i++; return { ok: true }; }
    if (a.type !== 'respond') return bad('Chọn Đào hoặc bỏ qua.');
    const ids = matchResponse(s, h, 'dao', a.ids);
    if (!ids) return bad('Lá này không cứu được.');
    delete t.ask;
    const cs = discardIds(s, h, ids);
    let k = 1;
    if (hasSkill(p, 'cuuvien') && h !== p && h.kingdom === 'wu') k = 2;
    p.hp = Math.min(p.maxHp, p.hp + k);
    log(s, `🍑 ${nm(h)} ${h === p ? 'tự ăn Đào' : 'cứu ' + nm(p) + ' bằng Đào'}${cs[0].type !== 'dao' ? ' [Cấp cứu]' : ''}${k > 1 ? ' [Cứu viện +1]' : ''} (còn ${p.hp} máu).`);
    ev(s, { t: 'play', p: h.id, as: 'dao', cards: cs, card: cs[0] }); ev(s, { t: 'heal', p: p.id, k });
    friendly(s, h, p, 1.5);
    return { ok: true };
  }
  if (t.stage === 'begin') {
    t.order = orderFrom(s, current(s).alive ? current(s) : p, true).map(q => q.id);
    if (!t.order.includes(p.id)) t.order.push(p.id);
    t.i = 0; t.stage = 'loop';
    log(s, `🆘 ${nm(p)} hấp hối! Cần ${1 - p.hp} quả Đào.`); ev(s, { t: 'dying', p: p.id });
  }
  if (!p.alive) return done(s, t);
  while (true) {
    if (p.hp > 0) return done(s, t, { saved: true });
    if (t.i >= t.order.length) { done(s, t); kill(s, p, t.src ? getPlayer(s, t.src) : null); return; }
    const h = getPlayer(s, t.order[t.i]);
    if (!h.alive) { t.i++; continue; }
    const opts = responseOptions(s, h, 'dao');
    if (!opts.length) { t.i++; continue; }
    t.ask = { type: 'card', players: [h.id], want: 'dao', options: opts, purpose: 'dying', forWho: p.id, need: 1 - p.hp, optional: true };
    return;
  }
};

// ---- Chọn lá của người khác (Quá hà / Thuận thủ / Phản đáp / Băng phách) ----
TASKS.pick = (s, t, inp) => {
  const ch = getPlayer(s, t.chooser), from = getPlayer(s, t.from);
  const zones = t.zones || 'hej';
  if (inp) {
    const a = inp.a;
    if (a.type !== 'pick') return bad('Chọn 1 lá.');
    let c = null;
    if (a.zone === 'h') { if (!zones.includes('h') || !from.hand.length) return bad('Không có lá trên tay.'); c = takeOut(s, from, pick(from.hand).id); }
    else {
      const ok = (zones.includes('e') && equipList(from).some(x => x.id === a.id)) || (zones.includes('j') && from.judge.some(j => j.card.id === a.id));
      if (!ok) return bad('Lá không hợp lệ.');
      c = takeOut(s, from, a.id);
    }
    delete t.ask; finishPick(s, t, ch, from, c, a.zone === 'h'); return { ok: true };
  }
  if (!from.alive || !ch.alive || !cardCount(from, zones)) return done(s, t);
  if (!(zones.includes('e') && equipList(from).length) && !(zones.includes('j') && from.judge.length)) {
    // chỉ có bài trên tay: rút ngẫu nhiên luôn
    const c = takeOut(s, from, pick(from.hand).id); finishPick(s, t, ch, from, c, true); return;
  }
  t.ask = { type: 'pick', players: [ch.id], from: from.id, zones, mode: t.mode, skill: t.skill || null };
};
function finishPick(s, t, ch, from, c, fromHand) {
  done(s, t);
  if (!c) return;
  if (t.mode === 'take') {
    ch.hand.push(c);
    ev(s, { t: 'move', from: from.id, to: ch.id, card: c, priv: fromHand ? [ch.id, from.id] : null });
    log(s, `${nm(ch)}${t.skill === 'phandap' ? ' [Phản đáp]' : ''} lấy ${fromHand ? '1 lá trên tay' : cardLabel(c)} của ${nm(from)}.`);
    if (t.skill === 'phandap') ev(s, { t: 'skill', p: ch.id, sk: 'phandap' });
  } else {
    s.discard.push(c); ev(s, { t: 'discard', p: from.id, cards: [c] });
    log(s, `${nm(ch)} phá ${cardLabel(c)} của ${nm(from)}.`);
  }
  hostile(s, ch, from, .5);
}

// ---- Vô giải khả kích: cửa sổ phản ứng (nhiều người cùng lúc) ----
TASKS.nullify = (s, t, inp) => {
  if (inp) {
    const a = inp.a; const p = inp.p;
    if (a.type === 'pass') { t.passed.push(p.id); delete t.ask; return { ok: true }; }
    if (a.type !== 'respond') return bad('Đánh Vô giải hoặc bỏ qua.');
    const ids = matchResponse(s, p, 'wuxie', a.ids);
    if (!ids) return bad('Cần lá Vô giải khả kích.');
    delete t.ask;
    const cs = discardIds(s, p, ids); t.count++; t.passed = [];
    const tg = getPlayer(s, t.tgt);
    log(s, `🚫 ${nm(p)} đánh Vô giải khả kích${t.count > 1 ? ' (huỷ lại lần ' + t.count + ')' : ''} vào ${CARD_INFO[t.trick].name}${tg ? ' với ' + nm(tg) : ''}!`);
    ev(s, { t: 'nullify', p: p.id, card: cs[0], count: t.count, trick: t.trick, tgt: t.tgt });
    tapTri(s, p);
    return { ok: true };
  }
  const holders = alivePlayers(s).filter(q => !t.passed.includes(q.id) && q.hand.some(c => c.type === 'wuxie')).map(q => q.id);
  if (!holders.length) return done(s, t, { canceled: t.count % 2 === 1 });
  t.ask = { type: 'nullify', players: holders, trick: t.trick, src: t.src, tgt: t.tgt, count: t.count };
};

// ---- Cẩm nang có mục tiêu (qua cửa sổ Vô giải) ----
TASKS.trick = (s, t) => {
  const src = getPlayer(s, t.src), tgt = getPlayer(s, t.tgt);
  if (t.stage === 'begin') {
    if (!tgt.alive) return done(s, t);
    t.stage = 'res'; push(s, { k: 'nullify', trick: t.trick, src: t.src, tgt: t.tgt, count: 0, passed: [] }); return;
  }
  if (t.stage !== 'res') return done(s, t);
  const canceled = s.ret && s.ret.canceled;
  done(s, t);
  if (!tgt.alive) return;
  if (canceled) { ev(s, { t: 'canceled', p: tgt.id, trick: t.trick }); return; }
  switch (t.trick) {
    case 'wuzhong': draw(s, tgt, 2); log(s, `${nm(tgt)} rút 2 lá.`); return;
    case 'taoyuan': heal(s, tgt, 1, src.id === tgt.id ? null : src); return;
    case 'guohe': if (src.alive) push(s, { k: 'pick', chooser: src.id, from: tgt.id, mode: 'discard', zones: 'hej', stage: 'begin' }); return;
    case 'shunshou': if (src.alive) push(s, { k: 'pick', chooser: src.id, from: tgt.id, mode: 'take', zones: 'hej', stage: 'begin' }); return;
    case 'juedou': hostile(s, src, tgt); push(s, { k: 'duel', a: src.id, b: tgt.id, cards: t.cards.map(c => c.id), stage: 'begin' }); return;
    case 'nanman': case 'wanjian': {
      hostile(s, src, tgt, .3);
      push(s, { k: 'aoe', trick: t.trick, src: src.id, tgt: tgt.id, cards: t.cards.map(c => c.id), stage: 'ask' }); return;
    }
    case 'jiedao': {
      const b = getPlayer(s, t.b);
      if (!tgt.equip.weapon) return;
      if (!b.alive || !inRange(s, tgt, b) || kongcheng(b)) { giveWeapon(s, tgt, src); return; }
      push(s, { k: 'jiedao', src: src.id, a: tgt.id, b: b.id, stage: 'ask' }); return;
    }
  }
};
function giveWeapon(s, from, to) {
  const w = from.equip.weapon; if (!w) return;
  takeOut(s, from, w.id);
  if (to.alive) { to.hand.push(w); log(s, `${nm(from)} không chịu chém, đành giao ${cardName(w)} cho ${nm(to)}.`); ev(s, { t: 'move', from: from.id, to: to.id, card: w }); }
  else s.discard.push(w);
}
TASKS.jiedao = (s, t) => {
  const src = getPlayer(s, t.src), a = getPlayer(s, t.a), b = getPlayer(s, t.b);
  if (t.stage === 'ask') {
    if (!a.alive) return done(s, t);
    t.stage = 'res'; push(s, { k: 'askCard', who: a.id, want: 'sat', src: src.id, target: b.id, optional: true, purpose: 'jiedao', stage: 'begin' }); return;
  }
  const r = s.ret; done(s, t);
  if (r && r.ok && b.alive) { log(s, `${nm(a)} đành chém ${nm(b)}.`); push(s, slashTask(a, b, r.cards)); }
  else giveWeapon(s, a, src);
};
TASKS.aoe = (s, t) => {
  const src = getPlayer(s, t.src), tgt = getPlayer(s, t.tgt);
  if (t.stage === 'ask') {
    if (!tgt.alive) return done(s, t);
    t.stage = 'res';
    push(s, { k: 'askCard', who: tgt.id, want: t.trick === 'nanman' ? 'sat' : 'ne', src: src.id, bagua: t.trick === 'wanjian', purpose: t.trick, stage: 'begin' }); return;
  }
  const r = s.ret; done(s, t);
  if (!(r && r.ok) && tgt.alive) push(s, { k: 'damage', tgt: tgt.id, src: src.alive ? src.id : null, n: 1, cards: t.cards, stage: 'begin' });
};
TASKS.duel = (s, t) => {
  const a = getPlayer(s, t.a), b = getPlayer(s, t.b);
  if (t.stage === 'begin') { t.cur = b.id; t.stage = 'round'; ev(s, { t: 'duel', a: a.id, b: b.id }); }
  const resp = getPlayer(s, t.cur), opp = resp === a ? b : a;
  if (t.stage === 'round') {
    if (!resp.alive || !opp.alive) return done(s, t);
    t.need = hasSkill(opp, 'vosong') ? 2 : 1; t.got = 0; t.stage = 'loop';
  }
  if (t.stage === 'loop') {
    if (t.got >= t.need) { t.cur = opp.id; t.stage = 'round'; return; }
    t.stage = 'res'; push(s, { k: 'askCard', who: resp.id, want: 'sat', src: opp.id, purpose: 'duel', need: t.need - t.got, stage: 'begin' }); return;
  }
  if (t.stage === 'res') {
    if (s.ret && s.ret.ok) { t.got++; t.stage = 'loop'; return; }
    done(s, t);
    if (!resp.alive) return;
    log(s, `${nm(resp)} thua Quyết đấu!`);
    const n = 1 + (opp === a && opp.flags.luoyi && !t.ligian ? 1 : 0);
    push(s, { k: 'damage', tgt: resp.id, src: opp.alive ? opp.id : null, n, cards: t.cards || [], stage: 'begin' });
  }
};
TASKS.wugu = (s, t, inp) => {
  if (inp) {
    if (inp.a.type !== 'pick') return bad('Chọn 1 lá.');
    const i = t.hold.findIndex(c => c.id === inp.a.id); if (i < 0) return bad('Lá không hợp lệ.');
    const c = t.hold.splice(i, 1)[0]; inp.p.hand.push(c); delete t.ask;
    log(s, `${nm(inp.p)} chọn ${cardLabel(c)} từ Ngũ cốc.`); ev(s, { t: 'wugu', p: inp.p.id, card: c });
    t.i++; t.stage = 'next'; return { ok: true };
  }
  if (t.stage === 'next') {
    if (t.i >= t.order.length || !t.hold.length) { s.discard.push(...t.hold); t.hold = []; return done(s, t); }
    const p = getPlayer(s, t.order[t.i]);
    if (!p.alive) { t.i++; return; }
    t.stage = 'null'; push(s, { k: 'nullify', trick: 'wugu', src: t.src, tgt: p.id, count: 0, passed: [] }); return;
  }
  if (t.stage === 'null') {
    const p = getPlayer(s, t.order[t.i]);
    if ((s.ret && s.ret.canceled) || !p.alive) { t.i++; t.stage = 'next'; return; }
    if (t.hold.length === 1) { const c = t.hold.pop(); p.hand.push(c); log(s, `${nm(p)} nhận lá cuối ${cardLabel(c)} từ Ngũ cốc.`); ev(s, { t: 'wugu', p: p.id, card: c }); t.i++; t.stage = 'next'; return; }
    t.stage = 'pick'; t.ask = { type: 'wugu', players: [p.id] };
  }
};

// ======================= VIEW =======================
export function viewFor(s, pid) {
  const me = getPlayer(s, pid);
  const t = top(s); const ask = t && t.ask ? t.ask : null;
  const cur = current(s);
  const v = {
    phase: s.phase, winner: s.winner, turn: s.turn, turnCount: s.turnCount, me: pid,
    deckCount: s.deck.length, discardTop: s.discard.length ? s.discard[s.discard.length - 1] : null, discardCount: s.discard.length,
    log: s.log.slice(-50), nRoles: s.nRoles,
    stage: t ? t.k : null,
    ph: (() => { for (let i = s.stack.length - 1; i >= 0; i--) if (/^ph_/.test(s.stack[i].k)) return s.stack[i].k.slice(3); return null; })(),
    skipPlay: !!s.tf.skipPlay,
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: p.isBot, general: p.general, kingdom: p.kingdom, gender: p.gender, hp: p.hp, maxHp: p.maxHp, alive: p.alive,
      role: (p.revealed || p === me || s.phase === 'ended') ? p.role : null,
      hand: p === me ? p.hand : null, handCount: p.hand.length, equip: p.equip, judge: p.judge, flags: p.flags,
      distance: me && me.alive && p.alive && p !== me && p.general && me.general ? distance(s, me, p) : null,
      range: attackRange(p), inRange: !!(me && me.alive && p.alive && p !== me && me.general && inRange(s, me, p)),
    })),
    ev: s.ev.map(e => sanitizeEv(e, pid)),
    ask: ask ? sanitizeAsk(s, t, ask, pid) : null,
    tf: { slashes: s.tf.slashes || 0 },
  };
  if (ask && ask.type === 'play' && ask.players.includes(pid)) {
    v.myModes = Object.fromEntries(me.hand.map(c => [c.id, cardModes(s, me, c)]));
    v.mySkills = activeSkills(s, me);
  }
  return v;
}
function sanitizeEv(e, pid) {
  if (e.priv && !e.priv.includes(pid) && e.card) { const { card, ...rest } = e; return { ...rest, hidden: true }; }
  return e;
}
function sanitizeAsk(s, t, ask, pid) {
  const out = { ...ask, task: t.k, mine: ask.players.includes(pid) };
  if (ask.type === 'general') { out.offers = t.offers[pid] || null; }
  if (ask.type === 'guanxing') { out.cards = out.mine ? t.hold : null; out.count = t.hold.length; }
  if (ask.type === 'wugu' || (t.k === 'wugu')) out.cards = t.hold;
  if (t.k === 'wugu' && !out.cards) out.cards = t.hold;
  if (ask.type === 'card' && !out.mine) delete out.options;
  if (ask.type === 'nullify') { out.hasWuxie = out.mine; out.players = out.mine ? [pid] : []; } // không lộ ai đang cầm Vô giải
  if (ask.type === 'pick') {
    const from = getPlayer(s, ask.from);
    out.fromHand = from.hand.length; out.fromEquip = equipList(from); out.fromJudge = from.judge;
  }
  return out;
}

// đếm bài (test bảo toàn)
export function countCards(s) {
  let n = s.deck.length + s.discard.length;
  for (const p of s.players) n += p.hand.length + equipList(p).length + p.judge.length;
  for (const t of s.stack) if (t.hold) n += t.hold.length;
  return n;
}
export { DECK_SIZE };
