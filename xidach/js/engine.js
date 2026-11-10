// Xì dách (blackjack kiểu Việt) – state machine thuần, JSON-serializable, không đụng tới giao diện.
// Một "bàn" chơi nhiều ván liên tiếp, chip ảo giữ qua các ván. Chỉ chơi vui – không có tiền thật.
//
// Pha mỗi ván:  bet (mọi người đặt cược) → [chia 2 lá, xét xì bàn/xì dách ngay] → play (lần lượt Rút/Dằn)
//               → dealer (nhà cái rút, xét từng người hoặc xét hết) → end (tổng kết, chờ ván tiếp)
let rnd = Math.random;
export function setRandom(f) { rnd = f || Math.random; }
const rand = () => rnd();

export const SUITS = ['S', 'C', 'D', 'H']; // ♠ ♣ ♦ ♥
export const SUIT_SYM = { S: '♠', C: '♣', D: '♦', H: '♥' };
export const RANK_TXT = r => r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r);
export const cardText = c => RANK_TXT(c.r) + SUIT_SYM[c.s];

export const DEFAULT_OPTS = {
  startChips: 1000,   // chip ảo mỗi người lúc vào bàn
  minBet: 10,
  maxBet: 200,        // 0 = tất tay (tối đa bằng số chip đang có)
  minPts: 16,         // người chơi phải đủ điểm này mới được Dằn
  caiMin: 15,         // nhà cái phải đủ điểm này mới được xét bài
  aceRule: 'vn',      // 'vn': A = 11/10 (2 lá), 10/1 (3 lá), 1 (4–5 lá) · 'flex': A = 1 hoặc 11 lúc nào cũng được
  mXiBan: 3, mXiDach: 2, mNguLinh: 2, // hệ số ăn/đền theo bài của bên thắng
  bothBust: 'cai',    // cả hai cùng quắc: 'cai' = nhà cái ăn · 'hoa' = hoà
  allowNon: false,    // cho dằn khi chưa đủ điểm (dằn non) – lật ra là thua
  caiMode: 'rotate',  // 'rotate' xoay vòng · 'fixed' cố định · 'bot' bot làm cái · 'xidach' ai xì dách thì làm cái
  caiId: null,        // người làm cái cố định (caiMode 'fixed' / 'bot')
  turnTime: 30,       // giây – treo máy quá thì máy làm giùm
};
export const OPT_CHOICES = {
  startChips: [500, 1000, 2000, 5000], minBet: [10, 20, 50], maxBet: [100, 200, 500, 0],
  minPts: [15, 16], caiMin: [15, 16], aceRule: ['vn', 'flex'], mXiBan: [1, 2, 3], mXiDach: [1, 2, 3], mNguLinh: [1, 2, 3],
  bothBust: ['cai', 'hoa'], allowNon: [false, true], caiMode: ['rotate', 'fixed', 'bot', 'xidach'], turnTime: [20, 30, 45],
};
export function cleanOpts(o = {}) {
  const r = { ...DEFAULT_OPTS };
  for (const k of Object.keys(OPT_CHOICES)) if (k in o && OPT_CHOICES[k].includes(o[k])) r[k] = o[k];
  r.caiId = typeof o.caiId === 'string' ? o.caiId : null;
  return r;
}
export const KIND_NAME = { xiban: 'Xì bàn', xidach: 'Xì dách', ngulinh: 'Ngũ linh', du: 'Đủ tuổi', non: 'Non', quac: 'Quắc' };
const RANK = { xiban: 6, xidach: 5, ngulinh: 4, du: 3, non: 1, quac: 0 };
export const MAX_CARDS = 5, MAX_PLAYERS = 8;

// ---------------- bộ bài ----------------
export function newDeck() {
  const d = [];
  for (const s of SUITS) for (let r = 1; r <= 13; r++) d.push({ r, s, id: RANK_TXT(r) + s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

// ---------------- tính điểm ----------------
// Giá trị A được phép theo số lá trên tay
export function aceValues(n, aceRule = 'vn') {
  if (aceRule === 'flex') return [11, 1];
  return n <= 2 ? [11, 10, 1] : n === 3 ? [10, 1] : [1];
}
// Điểm tốt nhất (≤ 21 nếu được, không thì nhỏ nhất có thể)
export function handValue(cards, aceRule = 'vn') {
  let base = 0, aces = 0;
  for (const c of cards) { if (c.r === 1) aces++; else base += Math.min(10, c.r); }
  if (!aces) return base;
  const vals = aceValues(cards.length, aceRule);
  let best = -1, min = Infinity;
  const rec = (k, sum) => {
    if (k === aces) { if (sum <= 21 && sum > best) best = sum; if (sum < min) min = sum; return; }
    for (const v of vals) rec(k + 1, sum + v);
  };
  rec(0, base);
  return best >= 0 ? best : min;
}
// Loại bài: xiban | xidach | ngulinh | du | non | quac  (min = điểm tối thiểu để "đủ tuổi")
export function handInfo(cards, opts = DEFAULT_OPTS, min = opts.minPts) {
  const pts = handValue(cards, opts.aceRule);
  let kind;
  if (cards.length === 2 && cards[0].r === 1 && cards[1].r === 1) kind = 'xiban';
  else if (cards.length === 2 && cards.some(c => c.r === 1) && cards.some(c => c.r >= 10)) kind = 'xidach';
  else if (pts > 21) kind = 'quac';
  else if (cards.length >= MAX_CARDS) kind = 'ngulinh';
  else kind = pts >= min ? 'du' : 'non';
  return { kind, pts: kind === 'xiban' ? 21 : pts, n: cards.length };
}
export const isSpecial = k => k === 'xiban' || k === 'xidach';
export function multOf(kind, opts = DEFAULT_OPTS) {
  return kind === 'xiban' ? opts.mXiBan : kind === 'xidach' ? opts.mXiDach : kind === 'ngulinh' ? opts.mNguLinh : 1;
}
// So bài người chơi P với nhà cái C (đều là kết quả handInfo). Trả { r: 'win'|'lose'|'push', mult, why }
export function compare(P, C, opts = DEFAULT_OPTS) {
  const W = (k, why) => ({ r: 'win', mult: multOf(k, opts), why });
  const L = (k, why) => ({ r: 'lose', mult: multOf(k, opts), why });
  const H = why => ({ r: 'push', mult: 0, why });
  const cBig = C.kind === 'xiban' || C.kind === 'xidach' || C.kind === 'ngulinh';
  if (P.kind === 'non') return L(cBig ? C.kind : 'du', 'Dằn non – chưa đủ tuổi');
  if (P.kind === 'quac' && C.kind === 'quac') return opts.bothBust === 'hoa' ? H('Cùng quắc – hoà') : L('du', 'Cùng quắc – nhà cái ăn');
  if (P.kind === 'quac') return L(cBig ? C.kind : 'du', 'Quắc');
  if (C.kind === 'quac') return W(P.kind, 'Nhà cái quắc');
  const pr = RANK[P.kind], cr = RANK[C.kind];
  if (pr > cr) return W(P.kind, KIND_NAME[P.kind] + (P.kind === 'du' ? ` ${P.pts} > ${C.pts}` : ''));
  if (pr < cr) return L(C.kind, KIND_NAME[C.kind] + (C.kind === 'du' ? ` ${C.pts} > ${P.pts}` : ' của nhà cái'));
  if (P.kind === 'du') return P.pts > C.pts ? W('du', `${P.pts} > ${C.pts}`) : P.pts < C.pts ? L('du', `${C.pts} > ${P.pts}`) : H(`Bằng ${P.pts} – hoà`);
  if (P.kind === 'ngulinh') return P.pts < C.pts ? W('ngulinh', 'Ngũ linh ít điểm hơn') : P.pts > C.pts ? L('ngulinh', 'Ngũ linh nhà cái ít điểm hơn') : H('Cùng ngũ linh bằng điểm – hoà');
  return H('Cùng ' + KIND_NAME[P.kind] + ' – hoà');
}

// ---------------- tạo bàn & ván ----------------
// players: [{id, name, isBot, chips?}]
export function createGame(players, opts = {}) {
  const o = cleanOpts(opts);
  if (players.length < 2 || players.length > MAX_PLAYERS) throw new Error('Cần 2–8 người');
  const s = {
    v: 1, opts: o, round: 0, phase: 'bet', caiId: null, nextCai: null, caiOpen: false, turn: null, order: [],
    deck: [], players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, chips: Number.isFinite(p.chips) ? p.chips : o.startChips, granted: 0, cards: [], bet: 0, betDone: false, done: false, revealed: false, res: null })),
    ev: [], evN: 0, log: [], logN: 0, seq: 0, history: [],
  };
  // tổng chip ban đầu (để kiểm tra bảo toàn: tổng chip − tổng chip "xin mẹ" luôn không đổi)
  s.bank0 = s.players.reduce((t, p) => t + p.chips, 0);
  const ids = s.players.map(p => p.id);
  if ((o.caiMode === 'fixed' || o.caiMode === 'bot') && ids.includes(o.caiId)) s.caiId = o.caiId;
  else if (o.caiMode === 'bot') s.caiId = (s.players.find(p => p.isBot) || s.players[0]).id;
  else s.caiId = s.players[0].id;
  startRound(s, true);
  return s;
}
export const getP = (s, id) => s.players.find(p => p.id === id);
export const cai = s => getP(s, s.caiId);
function ev(s, e) { s.evN++; s.ev.push({ n: s.evN, ...e }); if (s.ev.length > 40) s.ev.shift(); }
function log(s, t) { s.logN++; s.log.push(t); if (s.log.length > 60) s.log.shift(); }
const nm = p => p ? p.name.replace(' 🤖', '') : '?';

export function startRound(s, first = false) {
  if (!first) {
    const idx = s.players.findIndex(p => p.id === s.caiId);
    if (s.opts.caiMode === 'rotate') s.caiId = s.players[(idx + 1) % s.players.length].id;
    else if (s.opts.caiMode === 'xidach' && s.nextCai && getP(s, s.nextCai)) s.caiId = s.nextCai;
  }
  s.nextCai = null;
  s.round++; s.phase = 'bet'; s.caiOpen = false; s.turn = null; s.seq++;
  s.deck = newDeck();
  for (const p of s.players) Object.assign(p, { cards: [], bet: 0, betDone: p.id === s.caiId, done: false, revealed: false, res: null });
  const ci = s.players.findIndex(p => p.id === s.caiId);
  s.order = []; for (let k = 1; k < s.players.length; k++) s.order.push(s.players[(ci + k) % s.players.length].id);
  ev(s, { k: 'round', cai: s.caiId, round: s.round });
  log(s, `Ván ${s.round}: ${nm(cai(s))} làm cái 👑. Đặt cược đi bà con!`);
}
export const maxBetOf = (s, p) => Math.max(0, s.opts.maxBet ? Math.min(s.opts.maxBet, p.chips) : p.chips);
export const canBeg = (s, p) => p && p.chips < s.opts.minBet && (s.phase === 'bet' ? !p.betDone || p.id === s.caiId : s.phase === 'end');
// ai đang phải làm gì (để chủ phòng hẹn giờ bot / AFK)
export function waitingOn(s) {
  if (s.phase === 'bet') return s.players.filter(p => !p.betDone).map(p => p.id);
  if (s.phase === 'play') return s.turn ? [s.turn] : [];
  if (s.phase === 'dealer') return [s.caiId];
  return [];
}

function deal(s) {
  for (let r = 0; r < 2; r++) for (const id of [...s.order, s.caiId]) getP(s, id).cards.push(s.deck.pop());
  ev(s, { k: 'deal' });
  const C = cai(s), ci = handInfo(C.cards, s.opts, s.opts.caiMin);
  if (isSpecial(ci.kind)) { // nhà cái có xì bàn / xì dách: so ngay với cả bàn
    s.caiOpen = true;
    ev(s, { k: 'special', pid: C.id, kind: ci.kind, cai: true });
    log(s, `😱 Nhà cái ${nm(C)} có ${KIND_NAME[ci.kind].toUpperCase()}! Lật bài so ngay cả bàn.`);
    for (const id of s.order) settle(s, getP(s, id), true);
    endRound(s); return;
  }
  for (const id of s.order) {
    const p = getP(s, id), pi = handInfo(p.cards, s.opts);
    if (isSpecial(pi.kind)) {
      ev(s, { k: 'special', pid: p.id, kind: pi.kind });
      log(s, `🤑 ${nm(p)} có ${KIND_NAME[pi.kind]}! Lật bài ăn luôn.`);
      settle(s, p, true);
    }
  }
  s.phase = 'play'; s.turn = null; advance(s);
}
function settle(s, p, quiet = false) {
  if (p.revealed) return;
  const C = cai(s);
  const P = handInfo(p.cards, s.opts), K = handInfo(C.cards, s.opts, s.opts.caiMin);
  const r = compare(P, K, s.opts);
  const amt = r.r === 'push' ? 0 : p.bet * r.mult;
  const delta = r.r === 'win' ? amt : r.r === 'lose' ? -amt : 0;
  p.chips += delta; C.chips -= delta;
  p.revealed = true; p.done = true;
  p.res = { r: r.r, mult: r.mult, delta, why: r.why, kind: P.kind, pts: P.pts };
  ev(s, { k: 'reveal', pid: p.id, r: r.r, delta, mult: r.mult, kind: P.kind, pts: P.pts });
  void quiet; log(s, `${r.r === 'win' ? '✅' : r.r === 'lose' ? '❌' : '🤝'} ${nm(p)} (${P.kind === 'du' || P.kind === 'non' ? P.pts + ' điểm' : KIND_NAME[P.kind]}) ${r.r === 'win' ? `ăn +${amt}` : r.r === 'lose' ? `thua −${amt}` : 'hoà'} – ${r.why}`);
}
function advance(s) {
  const next = s.order.find(id => !getP(s, id).done);
  if (next) { s.turn = next; s.seq++; ev(s, { k: 'turn', pid: next }); return; }
  s.turn = null;
  if (s.order.every(id => getP(s, id).revealed)) { endRound(s); return; }
  s.phase = 'dealer'; s.seq++;
  ev(s, { k: 'turn', pid: s.caiId, cai: true });
  log(s, `👑 Tới lượt nhà cái ${nm(cai(s))} rút & xét bài.`);
}
function endRound(s) {
  for (const id of s.order) if (!getP(s, id).revealed) settle(s, getP(s, id));
  s.phase = 'end'; s.turn = null; s.caiOpen = true; s.seq++;
  const C = cai(s), ci = handInfo(C.cards, s.opts, s.opts.caiMin);
  // "ai xì dách thì làm cái": người có xì bàn (ưu tiên) / xì dách khi nhà cái không có
  if (!isSpecial(ci.kind)) {
    const sp = s.order.map(id => getP(s, id)).filter(p => p.cards.length === 2 && isSpecial(handInfo(p.cards, s.opts).kind));
    sp.sort((a, b) => (handInfo(b.cards, s.opts).kind === 'xiban') - (handInfo(a.cards, s.opts).kind === 'xiban'));
    s.nextCai = sp.length ? sp[0].id : null;
  }
  const deltas = {}; for (const p of s.players) deltas[p.id] = 0;
  for (const id of s.order) { const p = getP(s, id); deltas[id] = p.res.delta; deltas[s.caiId] -= p.res.delta; }
  s.history.push({ round: s.round, cai: s.caiId, deltas }); if (s.history.length > 12) s.history.shift();
  const cd = deltas[s.caiId];
  ev(s, { k: 'end', cai: s.caiId, caiDelta: cd });
  log(s, `🏁 Hết ván ${s.round}. Nhà cái ${nm(C)} ${cd > 0 ? `ăn +${cd}` : cd < 0 ? `đền −${-cd}` : 'huề vốn'}.`);
}
// người vào giữa ván (đang xem) được ngồi vào bàn ở ván sau
export function seatPlayers(s, list) {
  for (const p of list) {
    if (s.players.length >= MAX_PLAYERS || getP(s, p.id)) continue;
    const chips = Number.isFinite(p.chips) ? p.chips : s.opts.startChips;
    s.players.push({ id: p.id, name: p.name, isBot: !!p.isBot, chips, granted: 0, cards: [], bet: 0, betDone: false, done: false, revealed: false, res: null });
    s.bank0 += chips; log(s, `👋 ${p.name} vào bàn.`);
  }
}
export function nextRound(s) { if (s.phase !== 'end') return false; startRound(s); return true; }

// ---------------- hành động ----------------
// a: {type:'bet', amount} | {type:'beg'} | {type:'hit'} | {type:'stand'} | {type:'reveal', target} | {type:'revealAll'}
export function applyAction(s, pid, a) {
  const p = getP(s, pid);
  if (!p) return { ok: false, reason: 'Không có người chơi này' };
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động lạ' };
  const o = s.opts, isCai = pid === s.caiId;
  switch (a.type) {
    case 'beg': {
      if (!canBeg(s, p)) return { ok: false, reason: 'Còn chip mà xin gì nữa 😤' };
      const add = o.startChips - p.chips; p.chips += add; p.granted += add;
      ev(s, { k: 'beg', pid, amount: add }); log(s, `🥺 ${nm(p)} xin mẹ thêm chip – mẹ cho ${add} chip, bớt bớt lại nha!`);
      return { ok: true };
    }
    case 'bet': {
      if (s.phase !== 'bet') return { ok: false, reason: 'Hết giờ đặt cược rồi' };
      if (isCai) return { ok: false, reason: 'Nhà cái không đặt cược' };
      if (p.betDone) return { ok: false, reason: 'Bạn đã chốt cược' };
      const amt = Math.floor(+a.amount);
      if (p.chips < o.minBet) return { ok: false, reason: 'Hết chip rồi – xin mẹ thêm đi 🥺' };
      if (!Number.isFinite(amt) || amt < o.minBet) return { ok: false, reason: `Cược ít nhất ${o.minBet} chip` };
      if (amt > maxBetOf(s, p)) return { ok: false, reason: `Cược tối đa ${maxBetOf(s, p)} chip` };
      p.bet = amt; p.betDone = true; s.seq++;
      ev(s, { k: 'bet', pid, amount: amt }); log(s, `🪙 ${nm(p)} cược ${amt}.`);
      if (s.players.every(q => q.betDone)) deal(s);
      return { ok: true };
    }
    case 'hit': {
      if (s.phase === 'play') {
        if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn 😤' };
        if (p.cards.length >= MAX_CARDS) return { ok: false, reason: 'Tối đa 5 lá' };
        p.cards.push(s.deck.pop()); s.seq++;
        const pi = handInfo(p.cards, o);
        ev(s, { k: 'hit', pid, n: p.cards.length });
        log(s, `🃏 ${nm(p)} rút lá thứ ${p.cards.length}.`);
        if (pi.kind === 'quac' || p.cards.length >= MAX_CARDS) { p.done = true; ev(s, { k: 'done', pid }); advance(s); }
        return { ok: true };
      }
      if (s.phase === 'dealer' && isCai) {
        if (p.cards.length >= MAX_CARDS) return { ok: false, reason: 'Tối đa 5 lá' };
        if (handInfo(p.cards, o, o.caiMin).kind === 'quac') return { ok: false, reason: 'Quắc rồi còn rút gì nữa' };
        p.cards.push(s.deck.pop()); s.seq++;
        const ci = handInfo(p.cards, o, o.caiMin);
        ev(s, { k: 'hit', pid, n: p.cards.length, cai: true });
        log(s, `👑 Nhà cái rút lá thứ ${p.cards.length}.`);
        if (ci.kind === 'quac') { s.caiOpen = true; ev(s, { k: 'caibust', pid }); log(s, `💥 Nhà cái ${nm(p)} QUẮC (${ci.pts})! Lật hết bài nè.`); endRound(s); }
        else if (p.cards.length >= MAX_CARDS) { s.caiOpen = true; log(s, `🖐️ Nhà cái ${nm(p)} NGŨ LINH! Lật hết bài nè.`); endRound(s); }
        return { ok: true };
      }
      return { ok: false, reason: 'Chưa tới lượt bạn 😤' };
    }
    case 'stand': {
      if (s.phase !== 'play' || s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn 😤' };
      const pi = handInfo(p.cards, o);
      if (pi.kind === 'non' && !o.allowNon) return { ok: false, reason: `Chưa đủ tuổi (dưới ${o.minPts}) – rút tiếp đi 🍼` };
      p.done = true; s.seq++;
      ev(s, { k: 'done', pid, stand: true }); log(s, `✋ ${nm(p)} dằn.`);
      advance(s);
      return { ok: true };
    }
    case 'reveal': case 'revealAll': {
      if (s.phase !== 'dealer' || !isCai) return { ok: false, reason: 'Chỉ nhà cái mới được xét bài' };
      const ci = handInfo(p.cards, o, o.caiMin);
      if (ci.kind === 'non') return { ok: false, reason: `Nhà cái chưa đủ ${o.caiMin} điểm – rút tiếp đã` };
      s.caiOpen = true; s.seq++;
      if (a.type === 'revealAll') { ev(s, { k: 'xet', all: true }); log(s, `👀 Nhà cái ${nm(p)} xét hết (${ci.kind === 'du' ? ci.pts + ' điểm' : KIND_NAME[ci.kind]}).`); endRound(s); return { ok: true }; }
      const t = getP(s, a.target);
      if (!t || t.id === pid || t.revealed) return { ok: false, reason: 'Người này đã lật bài rồi' };
      ev(s, { k: 'xet', pid: t.id }); log(s, `👀 Nhà cái xét ${nm(t)}.`);
      settle(s, t);
      if (s.order.every(id => getP(s, id).revealed)) endRound(s);
      return { ok: true };
    }
  }
  return { ok: false, reason: 'Hành động lạ' };
}

// ---------------- góc nhìn từng người (giấu bài người khác) ----------------
export function viewFor(s, pid) {
  const end = s.phase === 'end';
  const v = {
    v: s.v, opts: s.opts, round: s.round, phase: s.phase, caiId: s.caiId, caiOpen: s.caiOpen, turn: s.turn, order: s.order,
    deckCount: s.deck.length, ev: s.ev, evN: s.evN, log: s.log, logN: s.logN, seq: s.seq, history: s.history, nextCai: end ? s.nextCai : null,
    me: pid,
    players: s.players.map(p => {
      const open = p.id === pid || p.revealed || end || (p.id === s.caiId && s.caiOpen);
      const o = { id: p.id, name: p.name, isBot: p.isBot, chips: p.chips, granted: p.granted, bet: p.bet, betDone: p.betDone, done: p.done, revealed: p.revealed, res: p.res, n: p.cards.length };
      if (open) { o.cards = p.cards.map(c => ({ ...c })); o.info = handInfo(p.cards, s.opts, p.id === s.caiId ? s.opts.caiMin : s.opts.minPts); }
      else o.cards = null;
      return o;
    }),
  };
  return v;
}
// Bảo toàn chip: tổng chip − tổng chip xin thêm = tổng ban đầu
export const chipTotal = s => s.players.reduce((t, p) => t + p.chips - p.granted, 0);
