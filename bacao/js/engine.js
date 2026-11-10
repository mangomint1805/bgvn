// Ba Cào (bài cào 3 lá) – state machine thuần, JSON-serializable, không đụng tới giao diện.
// Một "bàn" chơi nhiều ván liên tiếp, chip ảo giữ qua các ván. Chỉ chơi vui – không có tiền thật.
//
// Pha mỗi ván:  bet (đặt cược / góp gà) → [chia 3 lá] → peek (nặn bài, ai xong bấm Chốt) → end (lật bài cùng lúc, tính chip)
// Hai kiểu chơi:  'cai' = 1 nhà cái đấu riêng với từng người · 'pot' = chơi gà: ai cũng góp, bài to nhất hốt hết.
let rnd = Math.random;
export function setRandom(f) { rnd = f || Math.random; }
const rand = () => rnd();

export const SUITS = ['S', 'C', 'D', 'H']; // ♠ ♣ ♦ ♥
export const SUIT_SYM = { S: '♠', C: '♣', D: '♦', H: '♥' };
export const SUIT_NAME = { D: 'Rô', H: 'Cơ', S: 'Bích', C: 'Chuồn' };
export const SUIT_ORDER = { D: 4, H: 3, S: 2, C: 1 }; // Ba Cào: Rô > Cơ > Bích > Chuồn (tép)
export const RANK_TXT = r => r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r);
export const cardText = c => RANK_TXT(c.r) + SUIT_SYM[c.s];

export const DEFAULT_OPTS = {
  mode: 'cai',        // 'cai' = có nhà cái · 'pot' = chơi gà (ai cũng góp, bài to nhất hốt)
  caiMode: 'rotate',  // 'rotate' xoay vòng · 'fixed' cố định · 'bot' bot làm cái · 'batay' ai ba tây/sáp thắng cái thì lên cái
  caiId: null,        // người làm cái cố định (caiMode 'fixed' / 'bot')
  startChips: 1000,   // chip ảo mỗi người lúc vào bàn
  minBet: 10,         // (nhà cái) cược tối thiểu
  maxBet: 200,        // (nhà cái) cược tối đa – 0 = tất tay
  ante: 20,           // (chơi gà) tiền góp mỗi ván
  batay: true,        // tính Ba tây (3 lá J/Q/K) là bài đặc biệt
  sap: 'top',         // Sáp (3 lá cùng số): 'off' không tính · 'top' sáp > ba tây · 'mid' ba tây > sáp
  tie: 'suit',        // bằng điểm: 'suit' so chất lá to nhất (♦>♥>♠>♣) · 'rank' so số lá to nhất (A>K>…>2) · 'push' hoà
  mBaTay: 2,          // hệ số ăn/đền khi thắng bằng ba tây
  mSap: 3,            // hệ số ăn/đền khi thắng bằng sáp
  nan: true,          // nặn bài: tự lật từng lá (kéo/vuốt) trước khi lật chung
  peekTime: 20,       // giây nặn bài – hết giờ tự lật
};
export const OPT_CHOICES = {
  mode: ['cai', 'pot'], caiMode: ['rotate', 'fixed', 'bot', 'batay'],
  startChips: [500, 1000, 2000, 5000], minBet: [10, 20, 50], maxBet: [100, 200, 500, 0], ante: [10, 20, 50, 100],
  batay: [true, false], sap: ['off', 'top', 'mid'], tie: ['suit', 'rank', 'push'],
  mBaTay: [1, 2, 3], mSap: [1, 2, 3, 5], nan: [true, false], peekTime: [10, 20, 30],
};
export function cleanOpts(o = {}) {
  const r = { ...DEFAULT_OPTS };
  for (const k of Object.keys(OPT_CHOICES)) if (o && k in o && OPT_CHOICES[k].includes(o[k])) r[k] = o[k];
  r.caiId = o && typeof o.caiId === 'string' ? o.caiId : null;
  return r;
}
export const MAX_PLAYERS = 8, MIN_PLAYERS = 2;
export const KIND_NAME = { sap: 'Sáp', batay: 'Ba tây', diem: 'Điểm' };

// ---------------- bộ bài ----------------
export function newDeck() {
  const d = [];
  for (const s of SUITS) for (let r = 1; r <= 13; r++) d.push({ r, s, id: RANK_TXT(r) + s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

// ---------------- tính điểm ----------------
export const cardPts = c => c.r >= 10 ? 0 : c.r;          // A = 1, 2–9 = đúng số, 10/J/Q/K = 0 (10 điểm)
export const isFace = c => c.r >= 11;                     // lá "tây": J Q K
const hiRank = r => r === 1 ? 14 : r;                     // khi so lá to nhất: A to nhất
export const handPts = cards => cards.reduce((t, c) => t + cardPts(c), 0) % 10;
// sức mạnh 1 lá khi phân thắng thua bằng điểm
export function cardKey(c, tie = 'suit') {
  return tie === 'rank' ? hiRank(c.r) * 10 + SUIT_ORDER[c.s] : SUIT_ORDER[c.s] * 100 + hiRank(c.r);
}
export const bestCard = (cards, tie = 'suit') => cards.reduce((b, c) => !b || cardKey(c, tie) > cardKey(b, tie) ? c : b, null);
// Bậc bài theo luật bàn: 3 = to nhất … 1 = bài điểm thường
export function tierOf(kind, opts = DEFAULT_OPTS) {
  if (kind === 'sap') return opts.sap === 'top' ? 3 : 2;
  if (kind === 'batay') return opts.sap === 'mid' ? 3 : 2;
  return 1;
}
// Thông tin 1 tay bài: { kind: 'sap'|'batay'|'diem', pts, tier, sapRank?, best }
export function handInfo(cards, opts = DEFAULT_OPTS) {
  const pts = handPts(cards);
  const sap = opts.sap !== 'off' && cards.length === 3 && cards.every(c => c.r === cards[0].r);
  const bt = opts.batay && cards.length === 3 && cards.every(isFace);
  // JJJ vừa là sáp vừa là ba tây → lấy bậc cao hơn
  let kind = 'diem';
  if (sap && bt) kind = tierOf('sap', opts) >= tierOf('batay', opts) ? 'sap' : 'batay';
  else if (sap) kind = 'sap'; else if (bt) kind = 'batay';
  const b = bestCard(cards, opts.tie === 'push' ? 'suit' : opts.tie);
  return { kind, pts, tier: tierOf(kind, opts), sapRank: kind === 'sap' ? hiRank(cards[0].r) : 0, best: b ? b.id : null };
}
// So 2 tay bài (mảng lá). >0: a thắng · <0: b thắng · 0: hoà. Trả kèm lý do ngắn.
export function compareCards(a, b, opts = DEFAULT_OPTS) {
  const A = handInfo(a, opts), B = handInfo(b, opts);
  if (A.tier !== B.tier) return { c: A.tier - B.tier, why: 'bậc' };
  if (A.kind === 'sap' && B.kind === 'sap' && A.sapRank !== B.sapRank) return { c: A.sapRank - B.sapRank, why: 'sáp' };
  if (A.kind === 'diem' && A.pts !== B.pts) return { c: A.pts - B.pts, why: 'điểm' };
  if (opts.tie === 'push') return { c: 0, why: 'hoà' };
  const ka = cardKey(bestCard(a, opts.tie), opts.tie), kb = cardKey(bestCard(b, opts.tie), opts.tie);
  return { c: ka - kb, why: opts.tie === 'rank' ? 'số' : 'chất' };
}
export function multOf(kind, opts = DEFAULT_OPTS) { return kind === 'batay' ? opts.mBaTay : kind === 'sap' ? opts.mSap : 1; }
export function handLabel(I) {
  if (!I) return '';
  if (I.kind === 'sap') return 'Sáp ' + RANK_TXT(I.sapRank === 14 ? 1 : I.sapRank);
  if (I.kind === 'batay') return 'Ba tây';
  return I.pts === 0 ? 'Bù (0 điểm)' : I.pts + ' nút';
}

// ---------------- tạo bàn & ván ----------------
// players: [{id, name, isBot, chips?}]
export function createGame(players, opts = {}) {
  const o = cleanOpts(opts);
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new Error('Cần 2–8 người');
  const s = {
    v: 1, opts: o, round: 0, phase: 'bet', caiId: null, nextCai: null, pot: 0, deck: [],
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, chips: Number.isFinite(p.chips) ? p.chips : o.startChips, granted: 0, cards: [], bet: 0, betDone: false, ready: false, res: null })),
    ev: [], evN: 0, log: [], logN: 0, seq: 0, history: [], winners: [],
  };
  s.bank0 = s.players.reduce((t, p) => t + p.chips, 0);
  if (o.mode === 'cai') {
    const ids = s.players.map(p => p.id);
    if ((o.caiMode === 'fixed' || o.caiMode === 'bot') && ids.includes(o.caiId)) s.caiId = o.caiId;
    else if (o.caiMode === 'bot') s.caiId = (s.players.find(p => p.isBot) || s.players[0]).id;
    else s.caiId = s.players[0].id;
  }
  startRound(s, true);
  return s;
}
export const getP = (s, id) => s.players.find(p => p.id === id);
export const cai = s => s.caiId ? getP(s, s.caiId) : null;
function ev(s, e) { s.evN++; s.ev.push({ n: s.evN, ...e }); if (s.ev.length > 40) s.ev.shift(); }
function log(s, t) { s.logN++; s.log.push(t); if (s.log.length > 60) s.log.shift(); }
const nm = p => p ? p.name.replace(' 🤖', '') : '?';
export const isPot = s => s.opts.mode === 'pot';
export const needOf = s => isPot(s) ? s.opts.ante : s.opts.minBet;

export function startRound(s, first = false) {
  if (!first && !isPot(s)) {
    const idx = s.players.findIndex(p => p.id === s.caiId);
    if (s.opts.caiMode === 'rotate') s.caiId = s.players[(idx + 1) % s.players.length].id;
    else if (s.opts.caiMode === 'batay' && s.nextCai && getP(s, s.nextCai)) s.caiId = s.nextCai;
  }
  s.nextCai = null; s.winners = [];
  s.round++; s.phase = 'bet'; s.seq++; s.pot = 0;
  s.deck = newDeck();
  for (const p of s.players) Object.assign(p, { cards: [], bet: 0, betDone: p.id === s.caiId, ready: false, res: null });
  ev(s, { k: 'round', cai: s.caiId, round: s.round });
  log(s, isPot(s) ? `Ván ${s.round}: chơi gà – mỗi người góp ${s.opts.ante} chip 🐔` : `Ván ${s.round}: ${nm(cai(s))} làm cái 👑. Đặt cược đi bà con!`);
}
// người chơi (không phải nhà cái) theo thứ tự ngồi, bắt đầu sau nhà cái
export function order(s) {
  if (isPot(s)) return s.players.map(p => p.id);
  const ci = s.players.findIndex(p => p.id === s.caiId), out = [];
  for (let k = 1; k < s.players.length; k++) out.push(s.players[(ci + k) % s.players.length].id);
  return out;
}
export const maxBetOf = (s, p) => Math.max(0, s.opts.maxBet ? Math.min(s.opts.maxBet, p.chips) : p.chips);
export const canBeg = (s, p) => !!p && p.chips < needOf(s) && (s.phase === 'bet' ? !p.betDone || p.id === s.caiId : s.phase === 'end');
// ai đang phải làm gì (để chủ phòng hẹn giờ bot / AFK)
export function waitingOn(s) {
  if (s.phase === 'bet') return s.players.filter(p => !p.betDone).map(p => p.id);
  if (s.phase === 'peek') return s.players.filter(p => !p.ready).map(p => p.id);
  return [];
}

function deal(s) {
  const ids = isPot(s) ? order(s) : [...order(s), s.caiId];
  for (let r = 0; r < 3; r++) for (const id of ids) getP(s, id).cards.push(s.deck.pop());
  s.seq++;
  ev(s, { k: 'deal' });
  if (s.opts.nan) { s.phase = 'peek'; for (const p of s.players) p.ready = false; log(s, '🤏 Chia bài xong – nặn từ từ thôi nha!'); }
  else showdown(s);
}

function showdown(s) {
  const o = s.opts, hands = {};
  for (const p of s.players) hands[p.id] = handInfo(p.cards, o);
  const deltas = {}; for (const p of s.players) deltas[p.id] = 0;
  if (isPot(s)) {
    // xếp hạng: bài to nhất hốt gà
    const ids = order(s);
    let best = [ids[0]];
    for (const id of ids.slice(1)) {
      const c = compareCards(getP(s, id).cards, getP(s, best[0]).cards, o).c;
      if (c > 0) best = [id]; else if (c === 0) best.push(id);
    }
    s.winners = best;
    const share = Math.floor(s.pot / best.length); let rem = s.pot - share * best.length;
    for (const id of best) { deltas[id] += share + (rem > 0 ? 1 : 0); if (rem > 0) rem--; }
    // thắng bằng ba tây / sáp: mỗi người thua trả thêm (hệ số − 1) × tiền góp
    const W = hands[best[0]], m = best.length === 1 ? multOf(W.kind, o) : 1;
    if (m > 1) for (const id of ids) if (!best.includes(id)) { const x = o.ante * (m - 1); deltas[id] -= x; deltas[best[0]] += x; }
    for (const id of ids) {
      const p = getP(s, id), won = best.includes(id), net = deltas[id] - p.bet; // bet = tiền đã góp
      p.chips += deltas[id];
      p.res = { r: won ? (best.length > 1 ? 'split' : 'win') : 'lose', delta: net, mult: won ? m : 1, kind: hands[id].kind, pts: hands[id].pts,
        why: won ? (best.length > 1 ? `Chia gà ${best.length} người` : `Hốt gà ${fmtN(deltas[id])}`) : `Thua ${handLabel(W)} của ${nm(getP(s, best[0]))}` };
      deltas[id] = net;
    }
    s.pot = 0;
    log(s, `🃏 Lật bài! ${best.map(id => nm(getP(s, id))).join(' & ')} ${best.length > 1 ? 'chia gà' : 'hốt gà'} với ${handLabel(hands[best[0]])}${m > 1 ? ` (×${m})` : ''}.`);
  } else {
    const C = cai(s), K = hands[C.id];
    let bestId = null;
    for (const id of order(s)) {
      const p = getP(s, id), P = hands[id];
      const c = compareCards(p.cards, C.cards, o).c;
      let r, mult, why;
      if (c > 0) { r = 'win'; mult = multOf(P.kind, o); why = `${handLabel(P)} > ${handLabel(K)}`; }
      else if (c < 0) { r = 'lose'; mult = multOf(K.kind, o); why = `Cái ${handLabel(K)}${K.kind === 'diem' && P.kind === 'diem' && K.pts === P.pts ? ' (to chất hơn)' : ''}`; }
      else { r = 'push'; mult = 0; why = 'Bằng điểm – hoà'; }
      if (c > 0 && P.kind === 'diem' && K.kind === 'diem' && P.pts === K.pts) why = `Bằng ${P.pts} nút, ${o.tie === 'rank' ? 'lá to hơn' : 'to chất hơn'}`;
      const amt = r === 'push' ? 0 : p.bet * mult, delta = r === 'win' ? amt : r === 'lose' ? -amt : 0;
      p.chips += delta; C.chips -= delta; deltas[id] = delta; deltas[C.id] -= delta;
      p.res = { r, mult, delta, why, kind: P.kind, pts: P.pts };
      if (r === 'win' && P.kind !== 'diem' && (!bestId || compareCards(p.cards, getP(s, bestId).cards, o).c > 0)) bestId = id;
    }
    C.res = { r: deltas[C.id] > 0 ? 'win' : deltas[C.id] < 0 ? 'lose' : 'push', delta: deltas[C.id], mult: 1, why: 'Nhà cái', kind: K.kind, pts: K.pts };
    s.nextCai = o.caiMode === 'batay' ? bestId : null;
    // người có bài to nhất bàn (để giao diện tô sáng)
    let top = [C.id];
    for (const id of order(s)) { const c = compareCards(getP(s, id).cards, getP(s, top[0]).cards, o).c; if (c > 0) top = [id]; else if (c === 0) top.push(id); }
    s.winners = top;
    const cd = deltas[C.id];
    log(s, `🃏 Lật bài! Nhà cái ${nm(C)} có ${handLabel(K)} → ${cd > 0 ? `ăn +${cd}` : cd < 0 ? `đền ${-cd}` : 'huề vốn'}.`);
    for (const id of order(s)) { const p = getP(s, id); log(s, `${p.res.r === 'win' ? '✅' : p.res.r === 'lose' ? '❌' : '🤝'} ${nm(p)} (${handLabel(hands[id])}) ${p.res.r === 'win' ? `ăn +${p.res.delta}` : p.res.r === 'lose' ? `thua ${p.res.delta}` : 'hoà'}${p.res.mult > 1 ? ` ×${p.res.mult}` : ''}`); }
  }
  s.phase = 'end'; s.seq++;
  s.history.push({ round: s.round, cai: s.caiId, deltas }); if (s.history.length > 12) s.history.shift();
  ev(s, { k: 'show', winners: s.winners, cai: s.caiId, caiDelta: s.caiId ? deltas[s.caiId] : 0, kinds: Object.fromEntries(Object.entries(hands).map(([k, v]) => [k, v.kind])) });
}
const fmtN = n => String(n);
// người vào giữa ván (đang xem) được ngồi vào bàn ở ván sau
export function seatPlayers(s, list) {
  for (const p of list) {
    if (s.players.length >= MAX_PLAYERS || getP(s, p.id)) continue;
    const chips = Number.isFinite(p.chips) ? p.chips : s.opts.startChips;
    s.players.push({ id: p.id, name: p.name, isBot: !!p.isBot, chips, granted: 0, cards: [], bet: 0, betDone: false, ready: false, res: null });
    s.bank0 += chips; log(s, `👋 ${p.name} vào bàn.`);
  }
}
export function nextRound(s) { if (s.phase !== 'end') return false; startRound(s); return true; }

// ---------------- hành động ----------------
// a: {type:'bet', amount} | {type:'beg'} | {type:'ready'}
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
      if (p.betDone) return { ok: false, reason: 'Bạn đã chốt rồi' };
      if (p.chips < needOf(s)) return { ok: false, reason: 'Hết chip rồi – xin mẹ thêm đi 🥺' };
      let amt;
      if (isPot(s)) { amt = o.ante; s.pot += amt; p.chips -= amt; }
      else {
        amt = Math.floor(+a.amount);
        if (!Number.isFinite(amt) || amt < o.minBet) return { ok: false, reason: `Cược ít nhất ${o.minBet} chip` };
        if (amt > maxBetOf(s, p)) return { ok: false, reason: `Cược tối đa ${maxBetOf(s, p)} chip` };
      }
      p.bet = amt; p.betDone = true; s.seq++;
      ev(s, { k: 'bet', pid, amount: amt }); log(s, isPot(s) ? `🐔 ${nm(p)} góp gà ${amt}.` : `🪙 ${nm(p)} cược ${amt}.`);
      if (s.players.every(q => q.betDone)) deal(s);
      return { ok: true };
    }
    case 'ready': {
      if (s.phase !== 'peek') return { ok: false, reason: 'Chưa tới lúc lật bài' };
      if (p.ready) return { ok: true };
      p.ready = true; s.seq++;
      ev(s, { k: 'ready', pid });
      if (s.players.every(q => q.ready)) showdown(s);
      return { ok: true };
    }
  }
  return { ok: false, reason: 'Hành động lạ' };
}

// ---------------- góc nhìn từng người (giấu bài người khác) ----------------
export function viewFor(s, pid) {
  const end = s.phase === 'end';
  return {
    v: s.v, opts: s.opts, round: s.round, phase: s.phase, caiId: s.caiId, pot: s.pot, order: order(s),
    deckCount: s.deck.length, ev: s.ev, evN: s.evN, log: s.log, logN: s.logN, seq: s.seq, history: s.history,
    winners: end ? s.winners : [], nextCai: end ? s.nextCai : null, me: pid,
    players: s.players.map(p => {
      const open = p.id === pid || end;
      const o = { id: p.id, name: p.name, isBot: p.isBot, chips: p.chips, granted: p.granted, bet: p.bet, betDone: p.betDone, ready: p.ready, res: end ? p.res : null, n: p.cards.length };
      if (open && p.cards.length) { o.cards = p.cards.map(c => ({ ...c })); o.info = handInfo(p.cards, s.opts); }
      else o.cards = null;
      return o;
    }),
  };
}
// Bảo toàn chip: tổng chip − tổng chip xin thêm + tiền gà đang giữa bàn = tổng ban đầu
export const chipTotal = s => s.players.reduce((t, p) => t + p.chips - p.granted, 0) + s.pot;
