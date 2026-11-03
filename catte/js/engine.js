// Luật Cát tê (Catte) – thuần logic, JSON-serializable, không đụng giao diện.
// 2–6 người, bộ 52 lá, mỗi người 6 lá, 6 vòng (trick). 2 nhỏ nhất … A lớn nhất, chất không phân cao thấp.
// Vòng 1–4: người cầm cái đánh lá bất kỳ; người sau ĐÈ (lá cùng chất, lớn hơn lá đang thắng) hoặc ÚP bỏ 1 lá.
// Hết vòng 4 ai chưa ăn vòng nào là CHẾT. Vòng 5–6 lật bài; ai ăn vòng 6 là TỚI, hốt cả nồi.
// Chỉ chơi vui bằng chip ảo – không có tiền thật.
let rand = Math.random;
export function setRandom(fn) { rand = fn; }
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const SUITS = ['S', 'C', 'D', 'H'];
export const SUIT_SYM = { S: '♠︎', C: '♣︎', D: '♦︎', H: '♥︎' };
export const SUIT_NAME = { S: 'Bích', C: 'Chuồn', D: 'Rô', H: 'Cơ' };
export const isRed = s => s === 'D' || s === 'H';
export const rankLabel = r => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[r] || String(r);
export const cardName = c => c ? rankLabel(c.r) + SUIT_SYM[c.s] : '?';
export const mkCard = (r, s) => ({ id: rankLabel(r) + s, r, s });
export function parseCard(id) { const s = id.slice(-1), t = id.slice(0, -1); const r = { J: 11, Q: 12, K: 13, A: 14 }[t] || +t; return mkCard(r, s); }
export function fullDeck() { const d = []; for (const s of SUITS) for (let r = 2; r <= 14; r++) d.push(mkCard(r, s)); return d; }

export const MIN_PLAYERS = 2, MAX_PLAYERS = 6, HAND = 6, TRICKS = 6, CUT = 4;
export const REFILL = 1000; // "Xin mẹ thêm chip"
export const DEFAULT_OPTS = {
  ante: 50,          // tiền cược mỗi ván (chip ảo)
  startChips: 1000,  // chip lúc vào bàn
  turnTime: 25,      // giây mỗi lượt (hết giờ máy đánh giùm)
  showdown: 'chung', // vòng 5: 'chung' = mọi người chọn lá úp cùng lúc rồi lật | 'ngua' = đánh lần lượt, ngửa bài
  wQuads: true,      // tới trắng: tứ quý
  wFlush: true,      // tới trắng: 6 lá cùng chất
  wSmall: true,      // tới trắng: 6 lá đều nhỏ hơn 6 (2–5)
  bWhite: false,     // tới trắng ăn thêm 1 cược mỗi nhà
  bSweep: false,     // ăn trọn 4 vòng đầu (cả bàn chết): mỗi nhà thêm ½ cược
  bLow: false,       // tới bằng lá nhỏ (K → 2): người còn sống tới vòng 5 trả thêm (14 − số) × ¼ cược
  thoiAt: false,     // thối Át: người chết còn giữ Át trên tay phạt 1 cược mỗi lá Át
};
export const OPT_CHOICES = { ante: [10, 20, 50, 100, 200], startChips: [500, 1000, 2000, 5000], turnTime: [15, 25, 40, 60], showdown: ['chung', 'ngua'] };
export const WHITE_NAME = { quads: 'Tứ quý', flush: '6 lá đồng chất', small: '6 lá nhỏ hơn 6' };

const P = (s, id) => s.players.find(p => p.id === id);
export const getPlayer = P;
const nm = (s, id) => (P(s, id) || {}).name || '?';
function log(s, t) { s.log.push(t); if (s.log.length > 60) s.log.shift(); }
function ev(s, e) { s.ev.push({ n: ++s.evN, hand: s.handNo, ...e }); if (s.ev.length > 40) s.ev.shift(); }
export const active = s => s.players.filter(p => p.inHand && !p.out);
export function chipTotal(s) { return s.players.reduce((t, p) => t + p.chips, 0) + (s.pot || 0); }

function cleanOpts(o) {
  const r = { ...DEFAULT_OPTS };
  for (const k of Object.keys(DEFAULT_OPTS)) if (o && k in o) {
    if (typeof DEFAULT_OPTS[k] === 'boolean') r[k] = !!o[k];
    else if (k === 'showdown') r[k] = o[k] === 'ngua' ? 'ngua' : 'chung';
    else { const v = +o[k]; r[k] = OPT_CHOICES[k].includes(v) ? v : DEFAULT_OPTS[k]; }
  }
  return r;
}
const newSeat = (p, chips) => ({ id: p.id, name: p.name, isBot: !!p.isBot, chips, hand: [], won: 0, out: false, inHand: false, wins: 0, hands: 0 });

// players: [{id,name,isBot,chips?}] – chips (nếu có) là số chip mang từ trận trước
export function createGame(players, opts = {}, rig = null) {
  const o = cleanOpts(opts);
  const s = {
    gid: Math.random().toString(36).slice(2, 8), opts: o,
    players: players.slice(0, MAX_PLAYERS).map(p => newSeat(p, p.chips != null ? Math.max(0, Math.floor(p.chips)) : o.startChips)),
    handNo: 0, pot: 0, minted: 0, phase: 'deal', trickNo: 0, trick: null, history: [], chung: null, result: null,
    lastWinner: null, leader: null, ev: [], evN: 0, log: [], seq: 0,
  };
  s.startTotal = chipTotal(s);
  s.leader = s.players[Math.floor(rand() * s.players.length)].id; // ván đầu: bốc thăm người cầm cái
  deal(s, rig);
  return s;
}

// đồng bộ người chơi giữa các ván: người mới vào ngồi thêm, người đã rời thì đứng dậy (mang chip theo)
export function syncRoster(s, roster) {
  if (!roster) return;
  const ids = new Set(roster.map(p => p.id));
  for (const p of [...s.players]) if (!ids.has(p.id)) { s.startTotal -= p.chips; s.players = s.players.filter(x => x !== p); log(s, `👋 ${p.name} rời bàn.`); }
  for (const r of roster) {
    if (s.players.length >= MAX_PLAYERS) break;
    const p = P(s, r.id);
    if (p) { p.name = r.name; p.isBot = !!r.isBot; continue; }
    const np = newSeat(r, r.chips != null ? Math.max(0, Math.floor(r.chips)) : s.opts.startChips);
    s.players.push(np); s.startTotal += np.chips; log(s, `🪑 ${np.name} vào bàn.`);
  }
  // giữ thứ tự ghế theo danh sách phòng
  const order = roster.map(p => p.id);
  s.players.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

// ---------- tới trắng ----------
// trả { kind, score: [] } hoặc null. score dùng so khi nhiều người cùng tới trắng (lớn hơn thắng)
export function whiteHand(hand, o = DEFAULT_OPTS) {
  if (!hand || hand.length !== HAND) return null;
  const cnt = {}; for (const c of hand) cnt[c.r] = (cnt[c.r] || 0) + 1;
  const desc = hand.map(c => c.r).sort((a, b) => b - a);
  const quad = Object.keys(cnt).filter(r => cnt[r] === 4).map(Number).sort((a, b) => b - a)[0];
  if (o.wQuads && quad) return { kind: 'quads', rank: quad, score: [3, quad, ...desc] };
  if (o.wFlush && hand.every(c => c.s === hand[0].s)) return { kind: 'flush', score: [2, ...desc] };
  if (o.wSmall && hand.every(c => c.r < 6)) return { kind: 'small', score: [1, ...desc] };
  return null;
}
const cmpScore = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };

// thứ tự ngồi bắt đầu từ pid (đi theo thứ tự ghế – trên bàn là ngược chiều kim đồng hồ)
function orderFrom(s, pid, list = active(s)) {
  const n = s.players.length, i0 = Math.max(0, s.players.findIndex(p => p.id === pid)), out = [];
  for (let k = 0; k < n; k++) { const p = s.players[(i0 + k) % n]; if (list.includes(p)) out.push(p); }
  return out;
}

// ---------- chia bài ----------
function deal(s, rig) {
  const o = s.opts;
  s.handNo++; s.phase = 'play'; s.trickNo = 1; s.history = []; s.chung = null; s.result = null; s.pot = 0; s.seq++;
  s.handStart = {};
  for (const p of s.players) {
    p.inHand = true; p.out = false; p.won = 0; p.hand = []; p.hands++;
    // hết chip thì mẹ cho thêm để không ai bị loại vĩnh viễn
    if (p.chips < o.ante) { p.chips += REFILL; s.minted += REFILL; ev(s, { k: 'refill', by: p.id, amt: REFILL, auto: true }); log(s, `🧧 Mẹ dúi cho ${p.name} ${REFILL} chip.`); }
    s.handStart[p.id] = p.chips;
    const a = Math.min(o.ante, p.chips); p.chips -= a; s.pot += a;
  }
  const deck = shuffle(fullDeck());
  s.players.forEach((p, i) => { p.hand = rig && rig[i] ? rig[i].map(x => typeof x === 'string' ? parseCard(x) : x) : []; });
  const used = new Set(s.players.flatMap(p => p.hand.map(c => c.id)));
  const rest = deck.filter(c => !used.has(c.id));
  for (const p of s.players) while (p.hand.length < HAND) p.hand.push(rest.pop());
  if (!P(s, s.leader)) s.leader = s.players[0].id;
  log(s, `🃏 Ván ${s.handNo}: chia 6 lá, mỗi người góp ${o.ante} chip – nồi ${s.pot}. ${nm(s, s.leader)} cầm cái.`);
  ev(s, { k: 'deal', leader: s.leader, pot: s.pot });
  // tới trắng ngay khi chia
  let best = null;
  for (const p of orderFrom(s, s.leader)) { const w = whiteHand(p.hand, o); if (w && (!best || cmpScore(w.score, best.w.score) > 0)) best = { p, w }; }
  if (best) { endHand(s, best.p.id, 'white', { kind: best.w.kind, rank: best.w.rank, cards: best.p.hand.map(c => ({ ...c })) }); return; }
  s.trick = { no: 1, leader: s.leader, lead: null, top: null, plays: [], turn: s.leader };
}

export function nextHand(s, roster = null) {
  if (s.phase !== 'handEnd') return false;
  syncRoster(s, roster);
  if (s.players.length < MIN_PLAYERS) return false;
  s.leader = P(s, s.lastWinner) ? s.lastWinner : s.players[0].id; // người tới ván trước cầm cái ván sau
  deal(s);
  return true;
}

// ---------- luật đè / úp ----------
export const beats = (card, top) => !!top && card.s === top.s && card.r > top.r;
// lá nào đè được (vòng hiện tại)
export function beatable(s, pid) {
  const p = P(s, pid), t = s.trick; if (!p || !t || !t.top) return [];
  return p.hand.filter(c => beats(c, t.top.card));
}
// vòng lật bài (5–6): mọi lá đều ngửa
export const isShowdown = s => s.trickNo > CUT;
// ai đang phải ra quyết định
export function waitingOn(s) {
  if (s.phase === 'play' && s.trick) return [s.trick.turn];
  if (s.phase === 'chung' && s.chung) return s.chung.need.filter(id => !(id in s.chung.picks));
  return [];
}
// tất cả nước đi hợp lệ: [{card, down}]
export function legalMoves(s, pid) {
  if (!waitingOn(s).includes(pid)) return [];
  const p = P(s, pid), t = s.trick; const out = [];
  if (s.phase === 'chung') return p.hand.map(c => ({ card: c.id, down: false }));
  const lead = !t.plays.length;
  for (const c of p.hand) {
    if (lead || isShowdown(s)) { out.push({ card: c.id, down: false }); continue; }
    if (beats(c, t.top.card)) out.push({ card: c.id, down: false });
    out.push({ card: c.id, down: true });
  }
  return out;
}

export function applyAction(s, pid, a) {
  if (!a || typeof a !== 'object') return { ok: false, reason: 'Hành động lạ.' };
  const p = P(s, pid);
  if (a.type === 'refill') {
    if (!p) return { ok: false, reason: 'Bạn chưa ngồi vào bàn.' };
    if (p.chips >= s.opts.ante * 4) return { ok: false, reason: 'Còn nhiều chip mà xin gì nữa 😤' };
    p.chips += REFILL; s.minted += REFILL; s.seq++;
    ev(s, { k: 'refill', by: pid, amt: REFILL }); log(s, `🧧 ${p.name} xin mẹ thêm ${REFILL} chip.`);
    return { ok: true };
  }
  if (a.type !== 'play') return { ok: false, reason: 'Hành động lạ.' };
  if (!p || !p.inHand) return { ok: false, reason: 'Bạn không có bài ván này.' };
  if (p.out) return { ok: false, reason: 'Bạn đã chết ván này rồi ☠️' };
  if (!waitingOn(s).includes(pid)) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const card = p.hand.find(c => c.id === a.card);
  if (!card) return { ok: false, reason: 'Bạn không có lá đó.' };
  // chưng bài: chọn lá úp, chờ đủ người rồi lật cùng lúc
  if (s.phase === 'chung') {
    s.chung.picks[pid] = card.id; s.seq++;
    ev(s, { k: 'chungPick', by: pid });
    if (!waitingOn(s).length) revealChung(s);
    return { ok: true };
  }
  const t = s.trick, lead = !t.plays.length, show = isShowdown(s);
  let down = !!a.down;
  if (lead || show) down = false;
  else if (!down && !beats(card, t.top.card)) return { ok: false, reason: t.top.card.s === card.s ? `Phải lớn hơn ${cardName(t.top.card)} mới đè được – không thì úp.` : `Đè phải cùng chất ${SUIT_NAME[t.top.card.s]} ${SUIT_SYM[t.top.card.s]} – không thì úp.` };
  p.hand = p.hand.filter(c => c !== card);
  const play = { pid, card: { ...card }, down };
  t.plays.push(play); s.seq++;
  let beat = false;
  if (lead) { t.lead = card.s; t.top = { pid, card: { ...card } }; }
  else if (!down && beats(card, t.top.card)) { t.top = { pid, card: { ...card } }; beat = true; }
  ev(s, { k: 'play', by: pid, card: { ...card }, down, beat, lead, trick: t.no });
  advance(s);
  return { ok: true };
}

function advance(s) {
  const t = s.trick;
  const order = orderFrom(s, t.leader);
  const next = order.find(p => !t.plays.some(x => x.pid === p.id));
  if (!next) { resolveTrick(s); return; }
  // vòng 5 chưng bài: cái đã ra lá, mọi người còn lại chọn cùng lúc
  if (t.no === CUT + 1 && s.opts.showdown === 'chung' && t.plays.length === 1) {
    s.phase = 'chung'; s.chung = { need: order.filter(p => p.id !== t.leader).map(p => p.id), picks: {} };
    ev(s, { k: 'chungStart', leader: t.leader, card: { ...t.plays[0].card } });
    return;
  }
  t.turn = next.id;
}

function revealChung(s) {
  const t = s.trick, ch = s.chung;
  for (const p of orderFrom(s, t.leader)) {
    if (p.id === t.leader) continue;
    const card = p.hand.find(c => c.id === ch.picks[p.id]);
    p.hand = p.hand.filter(c => c !== card);
    t.plays.push({ pid: p.id, card: { ...card }, down: false });
    if (beats(card, t.top.card)) t.top = { pid: p.id, card: { ...card } };
  }
  s.phase = 'play'; s.chung = null;
  ev(s, { k: 'reveal', trick: t.no, plays: t.plays.map(x => ({ pid: x.pid, card: { ...x.card } })), winner: t.top.pid });
  resolveTrick(s);
}

function resolveTrick(s) {
  const t = s.trick, w = P(s, t.top.pid);
  w.won++;
  s.history.push({ no: t.no, leader: t.leader, plays: t.plays.map(x => ({ ...x, card: { ...x.card } })), winner: w.id, top: { ...t.top.card } });
  ev(s, { k: 'trick', no: t.no, winner: w.id, card: { ...t.top.card } });
  log(s, `${t.no <= CUT ? '✅' : '🔥'} Vòng ${t.no}: ${w.name} ăn với ${cardName(t.top.card)}.`);
  if (t.no === CUT) {
    const dead = active(s).filter(p => !p.won);
    for (const p of dead) p.out = true;
    if (dead.length) { ev(s, { k: 'dead', ids: dead.map(p => p.id) }); log(s, `☠️ ${dead.map(p => p.name).join(', ')} chết (không ăn vòng nào).`); }
    const alive = active(s);
    if (alive.length === 1) { endHand(s, alive[0].id, 'sweep', {}); return; }
  }
  if (t.no === TRICKS) { endHand(s, w.id, 'toi', { card: { ...t.top.card } }); return; }
  s.trickNo = t.no + 1;
  s.trick = { no: s.trickNo, leader: w.id, lead: null, top: null, plays: [], turn: w.id };
  if (s.trickNo === CUT + 1) ev(s, { k: 'showdown', alive: active(s).map(p => p.id), leader: w.id });
  // vòng 6: ai cũng còn đúng 1 lá – tự lật lần lượt
  if (s.trickNo === TRICKS) {
    ev(s, { k: 'final', leader: w.id });
    for (const p of orderFrom(s, w.id)) applyAction(s, p.id, { type: 'play', card: p.hand[0].id });
  }
}

function pay(s, from, to, amt, why, list) {
  const x = Math.max(0, Math.min(Math.floor(amt), from.chips)); if (!x) return;
  from.chips -= x; to.chips += x; list.push({ from: from.id, amt: x, why });
}

function endHand(s, wid, how, extra) {
  const o = s.opts, w = P(s, wid);
  const bonuses = [];
  const pot = s.pot;
  w.chips += pot; s.pot = 0; w.wins++;
  const others = s.players.filter(p => p.inHand && p.id !== wid);
  if (how === 'white' && o.bWhite) for (const p of others) pay(s, p, w, o.ante, 'Tới trắng', bonuses);
  if (how === 'sweep' && o.bSweep) for (const p of others) pay(s, p, w, o.ante / 2, 'Ăn trọn 4 vòng', bonuses);
  if (how === 'toi' && o.bLow && extra.card && extra.card.r < 14 && s.players.filter(p => p.inHand).length >= 3)
    for (const p of others) if (!p.out) pay(s, p, w, o.ante * (14 - extra.card.r) / 4, `Tới bằng lá ${rankLabel(extra.card.r)}`, bonuses);
  if (o.thoiAt && how !== 'white') for (const p of others) if (p.out) { const n = p.hand.filter(c => c.r === 14).length; if (n) pay(s, p, w, o.ante * n, `Thối ${n} Át`, bonuses); }
  const deltas = {}; for (const p of s.players) if (p.inHand) deltas[p.id] = p.chips - (s.handStart[p.id] ?? p.chips);
  s.result = { winner: wid, how, ...extra, pot, bonuses, deltas, tricks: Object.fromEntries(s.players.map(p => [p.id, p.won])) };
  s.phase = 'handEnd'; s.trick = null; s.chung = null; s.lastWinner = wid; s.seq++;
  const txt = how === 'white' ? `🀄 ${w.name} TỚI TRẮNG (${WHITE_NAME[extra.kind]}${extra.rank ? ' ' + rankLabel(extra.rank) : ''})!` : how === 'sweep' ? `🧹 ${w.name} ăn trọn, cả bàn chết!` : `🏆 ${w.name} TỚI bằng ${cardName(extra.card)}!`;
  log(s, `${txt} Hốt nồi ${pot} chip${bonuses.length ? ' + ' + bonuses.reduce((t, b) => t + b.amt, 0) + ' tiền thưởng' : ''}.`);
  ev(s, { k: 'win', by: wid, how, kind: extra.kind, card: extra.card, pot });
}

// ---------- góc nhìn từng người (ẩn bài người khác) ----------
export function viewFor(s, pid) {
  const v = JSON.parse(JSON.stringify(s));
  const reveal = s.phase === 'handEnd';
  delete v.handStart;
  for (const p of v.players) {
    p.handCount = p.hand.length;
    if (p.id !== pid && !reveal) p.hand = [];
  }
  const hide = x => { if (x.down && x.pid !== pid && !reveal) x.card = null; };
  if (v.trick) v.trick.plays.forEach(hide);
  for (const h of v.history) h.plays.forEach(hide);
  if (v.chung) v.chung.picks = Object.fromEntries(Object.entries(v.chung.picks).map(([k, c]) => [k, k === pid ? c : true]));
  for (const e of v.ev) if (e.k === 'play' && e.down && e.by !== pid) e.card = null;
  v.me = pid; v.legal = legalMoves(s, pid); v.waiting = waitingOn(s);
  return v;
}

// ---------- tiện ích cho giao diện / bot ----------
// vòng bài đã lật công khai (lá ngửa) – thông tin ai cũng biết
export function seenCards(s) {
  const out = [];
  for (const h of s.history) for (const x of h.plays) if (!x.down && x.card) out.push(x.card);
  if (s.trick) for (const x of s.trick.plays) if (!x.down && x.card) out.push(x.card);
  return out;
}
