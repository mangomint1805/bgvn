// Luật Mèo Nổ – thuần logic, JSON-serializable. Chồng bài: phần tử CUỐI mảng là lá TRÊN CÙNG.
let rand = Math.random;
export function setRandom(fn) { rand = fn; }
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const CATS = ['cat1', 'cat2', 'cat3', 'cat4', 'cat5'];
// tên + mô tả ngắn của từng loại lá
export const CARD = {
  bomb: { name: 'Mèo Nổ', en: 'Exploding Kitten', desc: 'Bốc trúng mà không có Gỡ Bom là BÙM – bị loại!' },
  defuse: { name: 'Gỡ Bom', en: 'Defuse', desc: 'Cứu bạn khỏi Mèo Nổ, rồi lén nhét bom lại chồng bài.' },
  attack: { name: 'Đổ Vỏ', en: 'Attack', desc: 'Hết lượt, khỏi bốc. Người sau gánh 2 lượt (dồn được).' },
  skip: { name: 'Né Gắt', en: 'Skip', desc: 'Hết 1 lượt mà khỏi bốc.' },
  shuffle: { name: 'Xào Bài', en: 'Shuffle', desc: 'Xáo trộn chồng bài.' },
  future: { name: 'Soi Kèo', en: 'See the Future', desc: 'Lén xem 3 lá trên cùng.' },
  alter: { name: 'Cải Mệnh', en: 'Alter the Future', desc: 'Xem 3 lá trên cùng và xếp lại tuỳ ý.' },
  favor: { name: 'Xin Vía', en: 'Favor', desc: 'Chọn 1 người, họ phải cho bạn 1 lá (họ tự chọn).' },
  bottom: { name: 'Móc Đáy', en: 'Draw from the Bottom', desc: 'Bốc lá DƯỚI CÙNG thay vì lá trên cùng (hết lượt).' },
  nope: { name: 'ĐÉO!', en: 'Nope', desc: 'Huỷ 1 hành động bất kỳ (trừ Mèo Nổ, Gỡ Bom). ĐÉO! chồng ĐÉO! được.' },
  cat1: { name: 'Mèo Ú', en: 'Tacocat', desc: 'Mèo thường. Đôi: rút bừa 1 lá. Bộ ba: gọi tên lá.' },
  cat2: { name: 'Mèo Mướp', en: 'Cattermelon', desc: 'Mèo thường. Đôi: rút bừa 1 lá. Bộ ba: gọi tên lá.' },
  cat3: { name: 'Mèo Tam Thể', en: 'Hairy Potato Cat', desc: 'Mèo thường. Đôi: rút bừa 1 lá. Bộ ba: gọi tên lá.' },
  cat4: { name: 'Mèo Xiêm', en: 'Beard Cat', desc: 'Mèo thường. Đôi: rút bừa 1 lá. Bộ ba: gọi tên lá.' },
  cat5: { name: 'Mèo Bông', en: 'Rainbow-Ralphing Cat', desc: 'Mèo thường. Đôi: rút bừa 1 lá. Bộ ba: gọi tên lá.' },
};
export const ACTIONS = ['attack', 'skip', 'shuffle', 'future', 'alter', 'favor', 'bottom'];
// lá có thể gọi tên khi đánh bộ ba
export const NAMEABLE = ['defuse', 'nope', 'attack', 'skip', 'shuffle', 'future', 'alter', 'favor', 'bottom', ...CATS];
export const isCat = t => CATS.includes(t);
export const DEFAULT_OPTS = { turnTime: 45, expansion: true, chaos: false };
const BASE = { attack: 4, skip: 4, shuffle: 4, future: 5, favor: 4, nope: 5, alter: 2, bottom: 3 };
// bộ "🌀 Hỗn loạn": gấp đôi Đổ Vỏ / Móc Đáy, nhiều ĐÉO! và Xào Bài hơn; bớt mèo thường + lá nhẹ để ván không dài ra; thêm 1 Gỡ Bom vì bị dồn lượt nhiều hơn
export const CHAOS = { attack: 2, nope: 1.8, bottom: 2, shuffle: 1.6, skip: 0.8, future: 0.8, favor: 0.8, cats: 0.75, defuse: 1 };

// bộ bài co giãn theo số người: còn khoảng 3 lá/người + 8 lá trong chồng sau khi chia
export function deckPlan(n, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  const f = Math.min(2, Math.max(0.6, (10 * n + 8) / 51));
  const plan = {};
  for (const [t, c] of Object.entries(BASE)) {
    if (!o.expansion && (t === 'alter' || t === 'bottom')) continue;
    plan[t] = Math.max(t === 'nope' || t === 'future' ? 2 : 1, Math.round(c * f * (o.chaos ? CHAOS[t] || 1 : 1)));
  }
  for (const c of CATS) plan[c] = Math.max(2, Math.round(4 * f * (o.chaos ? CHAOS.cats : 1)));
  plan.defuse = n + (n <= 3 ? 2 : Math.max(1, 6 - n)) + (o.chaos ? CHAOS.defuse : 0);
  plan.bomb = n - 1;
  return plan;
}

const P = (s, id) => s.players.find(p => p.id === id);
export const getPlayer = P;
export const current = s => s.players[s.turn];
export const alive = s => s.players.filter(p => !p.out);
const nm = (s, id) => (P(s, id) || {}).name || '?';
function log(s, t) { s.log.push(t); if (s.log.length > 80) s.log.shift(); s.logN++; }
// thống kê cho huy hiệu cuối ván (tạo lười để state cũ trong localStorage vẫn chạy)
const blankStat = () => ({ draws: 0, bombs: 0, defused: 0, boom: 0, nopes: 0, noped: 0, attacked: 0, attacks: 0, steals: 0, stolen: 0, peeks: 0, skips: 0, outAt: 0 });
const st = (s, id) => { const all = s.stats || (s.stats = {}); return all[id] || (all[id] = blankStat()); };
function ev(s, e) { s.ev.push({ n: ++s.evN, ...e }); if (s.ev.length > 40) s.ev.shift(); }
export const cardName = t => (CARD[t] || {}).name || t;
// tên gốc tiếng Anh (Exploding Kittens) để tham chiếu – chỉ dùng chữ
export const cardEn = t => (CARD[t] || {}).en || '';

export function createGame(playerList, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  const n = playerList.length;
  const plan = deckPlan(n, o);
  let id = 0; const mk = t => ({ id: 'k' + (id++), t });
  const pool = [];
  for (const [t, c] of Object.entries(plan)) if (t !== 'bomb' && t !== 'defuse') for (let i = 0; i < c; i++) pool.push(mk(t));
  shuffle(pool);
  const s = {
    phase: 'playing', opts: o, players: playerList.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, hand: [], out: false, place: 0 })),
    deck: [], discard: [], turn: 0, turnsLeft: 1, window: null, winSeq: 0, pending: null, peek: {}, log: [], logN: 0, ev: [], evN: 0,
    winner: null, seq: 0, turnNo: 1, total: 0, gid: Math.random().toString(36).slice(2, 8), stats: {},
  };
  for (const p of s.players) st(s, p.id);
  for (const p of s.players) { for (let k = 0; k < 7; k++) p.hand.push(pool.pop()); p.hand.push(mk('defuse')); }
  s.deck = pool;
  for (let i = 0; i < plan.defuse - n; i++) s.deck.push(mk('defuse'));
  for (let i = 0; i < plan.bomb; i++) s.deck.push(mk('bomb'));
  shuffle(s.deck);
  s.total = id;
  s.turn = Math.floor(rand() * n);
  log(s, `Chia bài xong${o.chaos ? ' (🌀 bộ Hỗn loạn)' : ''}! ${plan.bomb} Mèo Nổ đang nấp trong ${s.deck.length} lá. ${nm(s, current(s).id)} đi trước.`);
  ev(s, { k: 'start' });
  return s;
}

const removeCards = (p, ids) => { const out = []; for (const id of ids) { const i = p.hand.findIndex(c => c.id === id); if (i < 0) return null; out.push(p.hand.splice(i, 1)[0]); } return out; };
const hasType = (p, t) => p.hand.some(c => c.t === t);
const bombsLeft = s => s.deck.filter(c => c.t === 'bomb').length;

function nextAlive(s, from) { const n = s.players.length; for (let k = 1; k <= n; k++) { const i = (from + k) % n; if (!s.players[i].out) return i; } return from; }
function advance(s, turns = 1) {
  s.turn = nextAlive(s, s.turn); s.turnsLeft = turns; s.turnNo++;
  ev(s, { k: 'turn', by: current(s).id, turns });
}
function endOneTurn(s) {
  s.turnsLeft--;
  if (s.turnsLeft > 0) { s.turnNo++; log(s, `${nm(s, current(s).id)} còn phải đi thêm ${s.turnsLeft} lượt.`); ev(s, { k: 'turn', by: current(s).id, turns: s.turnsLeft }); }
  else advance(s);
}
function checkWin(s) {
  const al = alive(s);
  if (al.length <= 1) {
    s.phase = 'ended'; s.winner = al[0] ? al[0].id : null; s.window = null; s.pending = null;
    if (al[0]) al[0].place = 1;
    log(s, `🏆 ${nm(s, s.winner)} là con mèo cuối cùng sống sót!`); ev(s, { k: 'win', by: s.winner });
    return true;
  }
  return false;
}
function clearPeeks(s, except) { for (const k of Object.keys(s.peek)) if (k !== except) delete s.peek[k]; }

// bốc 1 lá (trên cùng hoặc dưới cùng). Trả true nếu lượt đã được xử lý xong.
function drawCard(s, p, fromBottom) {
  const c = fromBottom ? s.deck.shift() : s.deck.pop();
  if (!c) { endOneTurn(s); return; }
  st(s, p.id).draws++;
  if (!fromBottom) for (const k of Object.keys(s.peek)) { if (s.peek[k][0] === c.id) s.peek[k].shift(); else delete s.peek[k]; }
  if (c.t === 'bomb') {
    log(s, `💣 ${p.name} bốc trúng MÈO NỔ!`); st(s, p.id).bombs++;
    if (hasType(p, 'defuse')) {
      s.pending = { type: 'bomb', player: p.id, bomb: c };
      ev(s, { k: 'bomb', by: p.id, safe: true, bottom: !!fromBottom });
    } else {
      p.out = true; p.place = alive(s).length + 1; st(s, p.id).boom++; st(s, p.id).outAt = s.turnNo;
      s.discard.push(c, ...p.hand.splice(0));
      delete s.peek[p.id];
      log(s, `💥 BÙM! ${p.name} không có Gỡ Bom và đã nổ tung. Bị loại!`);
      ev(s, { k: 'boom', by: p.id, bottom: !!fromBottom });
      if (!checkWin(s)) { s.turnsLeft = 1; advance(s); }
    }
    return;
  }
  p.hand.push(c);
  log(s, `${p.name} bốc 1 lá${fromBottom ? ' từ dưới đáy' : ''}.`);
  ev(s, { k: 'draw', by: p.id, card: c, priv: [p.id], bottom: !!fromBottom });
  endOneTurn(s);
}

// xác định kiểu đánh từ các lá được chọn
export function classify(cards) {
  if (!cards.length) return null;
  if (cards.length === 1) { const t = cards[0].t; return ACTIONS.includes(t) ? t : null; }
  if (cards.every(c => c.t === cards[0].t) && isCat(cards[0].t)) return cards.length === 2 ? 'pair' : cards.length === 3 ? 'triple' : null;
  return null;
}
export const needsTarget = k => k === 'favor' || k === 'pair' || k === 'triple';
export const validTargets = (s, pid) => s.players.filter(q => !q.out && q.id !== pid && q.hand.length > 0).map(q => q.id);

export function applyAction(s, pid, a) {
  if (!a || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const p = P(s, pid); if (!p) return { ok: false, reason: 'Không tìm thấy người chơi.' };
  if (p.out) return { ok: false, reason: 'Bạn đã nổ rồi, ngồi xem thôi 💀' };
  const r = act(s, p, a);
  if (r.ok) s.seq++;
  return r;
}

function act(s, p, a) {
  const pid = p.id;
  if (a.type === 'nope') {
    const w = s.window; if (!w) return { ok: false, reason: 'Không có gì để ĐÉO!' };
    if (w.last === pid) return { ok: false, reason: 'Bạn vừa đánh rồi, chờ người khác.' };
    const c = p.hand.find(x => x.t === 'nope'); if (!c) return { ok: false, reason: 'Bạn không có lá ĐÉO!' };
    p.hand.splice(p.hand.indexOf(c), 1); s.discard.push(c);
    w.nopes++; w.last = pid; w.id = ++s.winSeq; w.chain.push(pid);
    st(s, pid).nopes++; st(s, w.nopes === 1 ? w.actor : w.chain[w.nopes - 2]).noped++;
    log(s, `🙅 ${p.name}: ĐÉO!${w.nopes % 2 === 0 ? ' (huỷ lá ĐÉO! trước đó)' : ''}`);
    ev(s, { k: 'nope', by: pid, nopes: w.nopes, card: c });
    return { ok: true };
  }
  if (s.window) return { ok: false, reason: 'Đang chờ xem có ai ĐÉO! không…' };
  const pr = s.pending;
  if (pr) {
    if (pr.player !== pid) return { ok: false, reason: 'Đang chờ người khác.' };
    if (pr.type === 'bomb' && a.type === 'defuse') {
      const d = p.hand.find(c => c.t === 'defuse'); if (!d) return { ok: false, reason: 'Bạn không có Gỡ Bom.' };
      p.hand.splice(p.hand.indexOf(d), 1); s.discard.push(d); st(s, pid).defused++;
      let pos = Math.round(+a.pos); if (!Number.isFinite(pos)) pos = Math.floor(rand() * (s.deck.length + 1));
      pos = Math.max(0, Math.min(s.deck.length, pos));
      s.deck.splice(s.deck.length - pos, 0, pr.bomb);
      clearPeeks(s);
      if (pos === 0) s.peek[pid] = [pr.bomb.id];
      s.pending = null;
      log(s, `✂️ ${p.name} gỡ bom thành công và lén nhét Mèo Nổ lại vào chồng bài 🤫`);
      ev(s, { k: 'defuse', by: pid, card: d, pos, priv: [pid] });
      endOneTurn(s);
      return { ok: true };
    }
    if (pr.type === 'give' && a.type === 'give') {
      const c = p.hand.find(x => x.id === a.cardId) || (a.cardId == null && p.hand[0]);
      if (!c) return { ok: false, reason: 'Chọn 1 lá để cho.' };
      p.hand.splice(p.hand.indexOf(c), 1); const to = P(s, pr.to); to.hand.push(c); st(s, to.id).steals++; st(s, pid).stolen++;
      s.pending = null;
      log(s, `🙏 ${p.name} đưa cho ${to.name} 1 lá.`);
      ev(s, { k: 'give', by: pid, to: to.id, card: c, priv: [pid, to.id] });
      return { ok: true };
    }
    if (pr.type === 'alter' && a.type === 'alter') {
      const ids = pr.cards; const order = Array.isArray(a.order) ? a.order : ids;
      if (order.length !== ids.length || !ids.every(id => order.includes(id))) return { ok: false, reason: 'Thứ tự không hợp lệ.' };
      const top = s.deck.splice(s.deck.length - ids.length, ids.length);
      const byId = Object.fromEntries(top.map(c => [c.id, c]));
      s.deck.push(...order.slice().reverse().map(id => byId[id]));
      clearPeeks(s); s.peek[pid] = order.slice();
      s.pending = null;
      log(s, `🪄 ${p.name} đã xếp lại vận mệnh của ${ids.length} lá trên cùng.`);
      ev(s, { k: 'altered', by: pid });
      return { ok: true };
    }
    return { ok: false, reason: 'Đang chờ bạn chọn.' };
  }
  if (current(s) !== p) return { ok: false, reason: 'Chưa tới lượt bạn 😤' };
  if (a.type === 'draw') { drawCard(s, p, false); return { ok: true }; }
  if (a.type === 'play') {
    const ids = Array.isArray(a.cardIds) ? a.cardIds : [];
    if (new Set(ids).size !== ids.length) return { ok: false, reason: 'Lá bị trùng.' };
    const cards = ids.map(id => p.hand.find(c => c.id === id));
    if (cards.some(c => !c)) return { ok: false, reason: 'Bạn không có lá này.' };
    const kind = classify(cards);
    if (!kind) return { ok: false, reason: cards.length > 1 ? 'Combo phải là 2 hoặc 3 lá mèo cùng loại.' : cards[0].t === 'nope' ? 'ĐÉO! chỉ đánh khi ai đó vừa làm gì.' : cards[0].t === 'defuse' ? 'Gỡ Bom chỉ dùng khi bốc trúng Mèo Nổ.' : isCat(cards[0].t) ? 'Mèo thường phải đánh theo đôi hoặc bộ ba.' : 'Không đánh được lá này.' };
    let target = null, named = null;
    if (needsTarget(kind)) {
      target = a.target; const tp = P(s, target);
      if (!tp || tp.out || tp.id === pid) return { ok: false, reason: 'Chọn 1 người còn sống khác.' };
      if (!tp.hand.length) return { ok: false, reason: `${tp.name} hết bài rồi.` };
      if (kind === 'triple') { named = a.named; if (!NAMEABLE.includes(named)) return { ok: false, reason: 'Gọi tên 1 lá.' }; }
    }
    removeCards(p, ids); s.discard.push(...cards);
    s.window = { id: ++s.winSeq, actor: pid, kind, cards, target, named, nopes: 0, last: pid, chain: [] };
    const what = kind === 'pair' ? `ĐÔI ${cardName(cards[0].t)}` : kind === 'triple' ? `BỘ BA ${cardName(cards[0].t)}` : cardName(kind);
    log(s, `${p.name} đánh ${what}${target ? ' → ' + nm(s, target) : ''}${named ? ` (đòi lá ${cardName(named)})` : ''}.`);
    ev(s, { k: 'play', by: pid, kind, cards, to: target, named });
    return { ok: true };
  }
  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

// hết cửa sổ ĐÉO!: thực thi (nếu số ĐÉO! chẵn) – chủ phòng gọi khi hết giờ
export function resolveWindow(s) {
  const w = s.window; if (!w || s.phase !== 'playing') return false;
  s.window = null; s.seq++;
  const p = P(s, w.actor);
  if (w.nopes % 2 === 1) {
    log(s, `❌ ${w.kind === 'pair' ? 'Đôi ' + cardName(w.cards[0].t) : w.kind === 'triple' ? 'Bộ ba ' + cardName(w.cards[0].t) : cardName(w.kind)} của ${p.name} đã bị ĐÉO!`);
    ev(s, { k: 'noped', by: w.actor, kind: w.kind });
    return true;
  }
  if (p.out) return true;
  ev(s, { k: 'resolve', by: w.actor, kind: w.kind, to: w.target });
  const t = w.target && P(s, w.target);
  switch (w.kind) {
    case 'attack': {
      const turns = (s.turnsLeft > 1 ? s.turnsLeft : 0) + 2;
      const vic = s.players[nextAlive(s, s.turn)].id; st(s, p.id).attacks++; if (vic !== p.id) st(s, vic).attacked++;
      log(s, `🫵 ${p.name} đổ vỏ! ${nm(s, vic)} phải gánh ${turns} lượt.`);
      advance(s, turns); break;
    }
    case 'skip': st(s, p.id).skips++; log(s, `🏃 ${p.name} né gắt, khỏi bốc.`); endOneTurn(s); break;
    case 'shuffle': shuffle(s.deck); clearPeeks(s); log(s, `🌀 Chồng bài đã được xào lại!`); ev(s, { k: 'shuffle' }); break;
    case 'future': {
      const top = s.deck.slice(-3).reverse();
      s.peek[p.id] = top.map(c => c.id); st(s, p.id).peeks++;
      log(s, `🔮 ${p.name} đã soi kèo 3 lá trên cùng.`);
      ev(s, { k: 'future', by: p.id, cards: top, priv: [p.id] }); break;
    }
    case 'alter': {
      const top = s.deck.slice(-3).reverse();
      st(s, p.id).peeks++; s.pending = { type: 'alter', player: p.id, cards: top.map(c => c.id) }; break;
    }
    case 'bottom': drawCard(s, p, true); break;
    case 'favor':
      if (!t || t.out || !t.hand.length) { log(s, `${nm(s, w.target)} chẳng còn lá nào để cho 🤷`); break; }
      s.pending = { type: 'give', player: t.id, to: p.id }; break;
    case 'pair': {
      if (!t || t.out || !t.hand.length) { log(s, `${nm(s, w.target)} chẳng còn lá nào 🤷`); break; }
      const c = t.hand.splice(Math.floor(rand() * t.hand.length), 1)[0]; p.hand.push(c); st(s, p.id).steals++; st(s, t.id).stolen++;
      log(s, `🐾 ${p.name} rút bừa 1 lá của ${t.name}.`);
      ev(s, { k: 'steal', by: p.id, to: t.id, card: c, priv: [p.id, t.id] }); break;
    }
    case 'triple': {
      const i = t && !t.out ? t.hand.findIndex(c => c.t === w.named) : -1;
      if (i < 0) { log(s, `🙈 ${nm(s, w.target)} không có lá ${cardName(w.named)}. Hụt!`); ev(s, { k: 'miss', by: p.id, to: w.target, named: w.named }); break; }
      const c = t.hand.splice(i, 1)[0]; p.hand.push(c); st(s, p.id).steals++; st(s, t.id).stolen++;
      log(s, `🎯 ${t.name} phải nộp lá ${cardName(c.t)} cho ${p.name}!`);
      ev(s, { k: 'steal', by: p.id, to: t.id, card: c, named: true }); break;
    }
  }
  return true;
}

// ai đang được chờ hành động (để đếm giờ / gọi bot)
export function waitingOn(s) {
  if (s.phase !== 'playing' || s.window) return null;
  if (s.pending) return s.pending.player;
  return current(s).id;
}

function validPeek(s, pid) {
  const pk = s.peek[pid]; if (!pk || !pk.length) return [];
  const out = [];
  for (let i = 0; i < pk.length; i++) { const c = s.deck[s.deck.length - 1 - i]; if (!c || c.id !== pk[i]) break; out.push(c); }
  return out;
}
export { validPeek, bombsLeft };

export function viewFor(s, pid) {
  const w = s.window, pr = s.pending, meP = P(s, pid);
  return {
    phase: s.phase, gid: s.gid, opts: s.opts, me: pid, turn: s.turn, turnsLeft: s.turnsLeft, turnNo: s.turnNo, seq: s.seq,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, out: p.out, place: p.place, handCount: p.hand.length, hand: p.id === pid || s.phase === 'ended' ? p.hand : undefined })),
    deckCount: s.deck.length, bombsLeft: bombsLeft(s), discardCount: s.discard.length, discardTop: s.discard.slice(-3),
    window: w ? { id: w.id, actor: w.actor, kind: w.kind, cards: w.cards, target: w.target, named: w.named, nopes: w.nopes, last: w.last, chain: w.chain,
      canNope: !!(meP && !meP.out && w.last !== pid && meP.hand.some(c => c.t === 'nope')) } : null,
    pending: pr ? { type: pr.type, player: pr.player, to: pr.to, cards: pr.player === pid && pr.type === 'alter' ? pr.cards.map(id => s.deck.find(c => c.id === id)) : undefined } : null,
    peek: meP ? validPeek(s, pid) : [],
    log: s.log.slice(-60), logN: s.logN, evN: s.evN,
    ev: s.ev.map(e => (e.priv && !e.priv.includes(pid) ? { ...e, card: undefined, cards: undefined, pos: undefined } : e)),
    winner: s.winner, stats: s.stats || {},
  };
}

// ---------- huy hiệu vui cuối ván ----------
// v: state hoặc view (cần players[{id,name,place,out}], stats, winner). Trả [{ k, icon, title, desc, ids, val }]
const BADGES = [
  ['nopes', '👑', 'Vua ĐÉO', n => `ĐÉO! người khác ${n} lần`, 1],
  ['noped', '🙊', 'Bị ĐÉO! sấp mặt', n => `Bị ĐÉO! ${n} lần`, 1],
  ['bombs', '💣', 'Nam châm hút bom', n => `Bốc trúng ${n} quả Mèo Nổ`, 1],
  ['defused', '✂️', 'Thợ gỡ bom', n => `Gỡ bom ${n} lần`, 2],
  ['attacked', '🎒', 'Chuyên gia gánh vỏ', n => `Bị Đổ Vỏ ${n} lần`, 1],
  ['attacks', '🫵', 'Trùm đổ vỏ', n => `Đổ vỏ cho người khác ${n} lần`, 2],
  ['draws', '🃏', 'Thánh bốc bài', n => `Bốc ${n} lá`, 1],
  ['steals', '🥷', 'Siêu trộm', n => `Cướp / xin được ${n} lá`, 1],
  ['stolen', '😿', 'Bị móc túi', n => `Bị lấy mất ${n} lá`, 2],
  ['peeks', '🔮', 'Nhà tiên tri', n => `Soi / sửa vận mệnh ${n} lần`, 2],
  ['skips', '🏃', 'Né như né người yêu cũ', n => `Né Gắt ${n} lần`, 2],
];
export function awards(v) {
  const stats = v.stats || {}, ps = v.players || [];
  const get = (id, k) => (stats[id] || {})[k] || 0;
  const out = [];
  for (const [k, icon, title, desc, min] of BADGES) {
    const best = Math.max(0, ...ps.map(p => get(p.id, k)));
    if (best < min) continue;
    const ids = ps.filter(p => get(p.id, k) === best).map(p => p.id);
    if (ids.length > 2 && ids.length >= ps.length) continue; // ai cũng bằng nhau thì thôi
    out.push({ k, icon, title, desc: desc(best), ids, val: best });
  }
  // nổ đầu tiên (người có place lớn nhất trong số đã nổ)
  const dead = ps.filter(p => p.out && p.place);
  if (dead.length && ps.length >= 3) { const f = dead.sort((a, b) => b.place - a.place)[0]; const t = get(f.id, 'outAt'); out.push({ k: 'first', icon: '💥', title: 'Ra đi đầu tiên', desc: t ? `Nổ tung ở lượt ${t}` : 'Nổ tung sớm nhất', ids: [f.id], val: t }); }
  // thắng mà chưa từng bốc trúng bom
  if (v.winner && get(v.winner, 'bombs') === 0 && ps.length >= 2) out.push({ k: 'clean', icon: '🧘', title: 'Né bom thần sầu', desc: 'Thắng mà chưa từng bốc trúng bom', ids: [v.winner], val: 0 });
  return out;
}
