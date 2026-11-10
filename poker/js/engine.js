// Poker Texas Hold'em không giới hạn (No-Limit) – state machine thuần, JSON hoá được, không đụng DOM.
//   createGame(players, opts) · applyAction(state, pid, action) → {ok, reason} · viewFor(state, pid) · nextHand(state)
// Chip là chip ẢO để chơi vui, không quy đổi tiền thật.
import { RANKS, SUITS, evaluate, scoreOf, CAT_NAME } from './eval.js?v=1';
export { CAT_NAME };

let rand = Math.random;
export function setRandom(f) { rand = f || Math.random; }
export const rnd = () => rand();

export const DEFAULT_OPTS = { chips: 1000, bb: 20, blindUp: 0, mode: 'cash', turnTime: 30 };
export const OPT_CHOICES = { chips: [500, 1000, 2000, 5000], bb: [10, 20, 50, 100], blindUp: [0, 5, 10, 15], mode: ['cash', 'tourn'], turnTime: [20, 30, 45] };
// hệ số tăng mù theo cấp (nhân với mù lớn khởi điểm)
export const LEVELS = [1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20, 30, 40, 60, 80, 100, 150, 200];
export const MAX_PLAYERS = 9;

export function blindsAt(opts, level) {
  const f = LEVELS[Math.min(level, LEVELS.length - 1)];
  const bb = Math.max(2, Math.round(opts.bb * f / 2) * 2);
  return { bb, sb: bb / 2 };
}
export function newDeck() {
  const d = []; for (const s of SUITS) for (const r of RANKS) d.push(r + s);
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

function log(s, m) { s.log.push(m); if (s.log.length > 80) s.log.splice(0, s.log.length - 80); s.logN++; }
function ev(s, e) { s.evN++; s.ev.push({ n: s.evN, ...e }); if (s.ev.length > 40) s.ev.splice(0, s.ev.length - 40); }
const fmt = n => Number(n).toLocaleString('vi-VN');
export const nm = p => p.name.replace(' 🤖', '');

export function createGame(players, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  for (const k of Object.keys(OPT_CHOICES)) if (!OPT_CHOICES[k].includes(o[k])) o[k] = DEFAULT_OPTS[k];
  const s = {
    v: 1, opts: o,
    players: players.slice(0, MAX_PLAYERS).map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, chips: o.chips, hole: null, bet: 0, total: 0, folded: false, allIn: false, inHand: false, need: false, acted: false, seen: -1, last: null, busted: false, out: false, place: 0, rebuys: 0 })),
    handNo: 0, level: 0, ...blindsAt(o, 0), button: -1, sbIdx: -1, bbIdx: -1, turn: -1,
    deck: [], board: [], street: null, currentBet: 0, minRaise: 0, raiseN: 0,
    phase: 'playing', result: null, reveal: {}, winner: null, bank: o.chips * Math.min(players.length, MAX_PLAYERS),
    log: [], logN: 0, ev: [], evN: 0, seq: 0,
  };
  log(s, `Bàn mới: ${s.players.length} người, mỗi người ${fmt(o.chips)} chip ảo. ${o.mode === 'tourn' ? 'Giải đấu – hết chip là bị loại!' : 'Chơi vui – hết chip thì xin mẹ thêm 🥺'}`);
  startHand(s);
  return s;
}

const n = s => s.players.length;
const funded = s => s.players.filter(p => !p.out && !p.busted && p.chips > 0);
function nextIdx(s, i, pred) { for (let k = 1; k <= n(s); k++) { const j = (i + k + n(s)) % n(s); if (pred(s.players[j], j)) return j; } return -1; }
const inH = p => p.inHand;
const canAct = p => p.inHand && !p.folded && !p.allIn;
const live = s => s.players.filter(p => p.inHand && !p.folded);

function put(s, p, amt) { amt = Math.max(0, Math.min(amt, p.chips)); p.chips -= amt; p.bet += amt; p.total += amt; if (p.chips === 0 && p.inHand) p.allIn = true; return amt; }

export function startHand(s) {
  s.handNo++; s.seq++;
  // mù tăng dần
  if (s.opts.blindUp > 0) {
    const lv = Math.floor((s.handNo - 1) / s.opts.blindUp);
    if (lv !== s.level) { s.level = lv; Object.assign(s, blindsAt(s.opts, lv)); log(s, `⬆️ Mù tăng lên ${fmt(s.sb)}/${fmt(s.bb)}!`); ev(s, { k: 'level', sb: s.sb, bb: s.bb }); }
  }
  for (const p of s.players) Object.assign(p, { hole: null, bet: 0, total: 0, folded: false, allIn: false, need: false, acted: false, seen: -1, last: null, inHand: !p.out && !p.busted && p.chips > 0 });
  const act = s.players.filter(inH);
  s.board = []; s.result = null; s.reveal = {}; s.raiseN = 0;
  // nút Dealer: chuyển sang người kế tiếp còn chip (ván đầu: bốc thăm)
  s.button = s.button < 0 ? s.players.indexOf(act[Math.floor(rand() * act.length)]) : nextIdx(s, s.button, inH);
  const heads = act.length === 2;
  s.sbIdx = heads ? s.button : nextIdx(s, s.button, inH);
  s.bbIdx = nextIdx(s, s.sbIdx, inH);
  s.deck = newDeck();
  for (let r = 0; r < 2; r++) for (let k = 1; k <= n(s); k++) { const p = s.players[(s.sbIdx - 1 + k + n(s)) % n(s)]; if (p.inHand) { p.hole = p.hole || []; p.hole.push(s.deck.pop()); } }
  const sbP = s.players[s.sbIdx], bbP = s.players[s.bbIdx];
  put(s, sbP, s.sb); sbP.last = { t: 'sb', a: sbP.bet };
  put(s, bbP, s.bb); bbP.last = { t: 'bb', a: bbP.bet };
  s.street = 'preflop'; s.currentBet = s.bb; s.minRaise = s.bb;
  for (const p of act) { p.need = !p.allIn; }
  log(s, `— Ván ${s.handNo} · Dealer: ${nm(s.players[s.button])} · mù ${fmt(s.sb)}/${fmt(s.bb)} (${nm(sbP)} / ${nm(bbP)})`);
  ev(s, { k: 'deal', street: 'preflop' });
  s.turn = s.bbIdx; // người đầu tiên = người sau mù lớn (đấu tay đôi: Dealer/mù nhỏ nói trước)
  advance(s);
}

// ---------- thông tin hành động hợp lệ ----------
export function legal(s, pid) {
  const p = s.players[s.turn];
  if (s.phase !== 'playing' || !p || p.id !== pid || !canAct(p)) return null;
  const toCall = Math.max(0, s.currentBet - p.bet);
  const maxTo = p.bet + p.chips;
  const reopened = !p.acted || p.seen < s.raiseN;
  // được tố khi: còn chip sau khi theo, quyền tố được mở lại (chưa nói, hoặc có người tố đủ mức sau lần nói trước), và còn người khác có thể theo
  const canRaise = p.chips > toCall && reopened && liveCanActOthers(s, p);
  const minTo = Math.min(maxTo, s.currentBet + s.minRaise);
  return { toCall: Math.min(toCall, p.chips), canCheck: toCall === 0, canCall: toCall > 0, canRaise, minTo, maxTo, isBet: s.currentBet === 0, pot: potTotal(s) };
}
// tố chỉ có nghĩa khi còn ít nhất 1 người khác có thể theo
function liveCanActOthers(s, p) { return s.players.some(q => q !== p && canAct(q)); }
export const potTotal = s => s.players.reduce((t, p) => t + p.total, 0);

export function applyAction(s, pid, a) {
  if (!a || typeof a !== 'object') return { ok: false, reason: 'Hành động không hợp lệ' };
  if (a.type === 'rebuy') return rebuy(s, pid);
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã xong, chờ ván mới nhé' };
  const p = s.players[s.turn];
  if (!p || p.id !== pid) return { ok: false, reason: 'Chưa tới lượt bạn 😤' };
  const L = legal(s, pid); if (!L) return { ok: false, reason: 'Bạn không thể hành động lúc này' };
  let t = a.type;
  if (t === 'allin') {
    if (p.chips <= L.toCall || !L.canRaise) t = 'call';
    else { a = { type: 'raise', to: L.maxTo }; t = 'raise'; }
    if (t === 'call' && L.toCall === 0) return { ok: false, reason: 'Không thể tất tay lúc này – hãy Xem' };
  }
  if (t === 'fold') {
    p.folded = true; p.last = { t: 'fold' };
    log(s, `${nm(p)} bỏ bài.`); ev(s, { k: 'act', pid, t: 'fold' });
  } else if (t === 'check') {
    if (!L.canCheck) return { ok: false, reason: `Phải theo ${fmt(L.toCall)} hoặc bỏ bài` };
    p.last = { t: 'check' }; log(s, `${nm(p)} xem (check).`); ev(s, { k: 'act', pid, t: 'check' });
  } else if (t === 'call') {
    if (L.canCheck) return { ok: false, reason: 'Không có gì để theo – bấm Xem' };
    const amt = put(s, p, L.toCall);
    p.last = { t: p.allIn ? 'allin' : 'call', a: p.bet };
    log(s, `${nm(p)} ${p.allIn ? 'tất tay' : 'theo'} ${fmt(amt)}.`); ev(s, { k: 'act', pid, t: p.allIn ? 'allin' : 'call', a: amt });
  } else if (t === 'raise' || t === 'bet') {
    if (!L.canRaise) return { ok: false, reason: L.toCall ? 'Không được tố thêm – chỉ được theo hoặc bỏ' : 'Không thể cược lúc này' };
    let to = Math.floor(+a.to);
    if (!Number.isFinite(to)) return { ok: false, reason: 'Số chip không hợp lệ' };
    if (to > L.maxTo) to = L.maxTo;
    if (to <= s.currentBet) return { ok: false, reason: 'Phải tố cao hơn mức hiện tại' };
    if (to < L.minTo && to !== L.maxTo) return { ok: false, reason: `${L.isBet ? 'Cược' : 'Tố'} tối thiểu ${L.isBet ? '' : 'tới '}${fmt(L.minTo)}` };
    const inc = to - s.currentBet, wasBet = s.currentBet === 0;
    put(s, p, to - p.bet);
    if (inc >= s.minRaise) { s.minRaise = inc; s.raiseN++; } // tố đủ mức: mở lại quyền tố cho mọi người
    s.currentBet = to;
    for (const q of s.players) if (q !== p && canAct(q)) q.need = true;
    const kind = p.allIn ? 'allin' : wasBet ? 'bet' : 'raise';
    p.last = { t: kind, a: to };
    log(s, `${nm(p)} ${kind === 'allin' ? 'TẤT TAY' : wasBet ? 'cược' : 'tố lên'} ${fmt(to)}.`); ev(s, { k: 'act', pid, t: kind, a: to });
  } else return { ok: false, reason: 'Hành động không hợp lệ' };
  p.acted = true; p.seen = s.raiseN; p.need = false; s.seq++;
  advance(s);
  return { ok: true };
}

function rebuy(s, pid) {
  const p = s.players.find(x => x.id === pid);
  if (!p) return { ok: false, reason: '?' };
  if (s.opts.mode !== 'cash') return { ok: false, reason: 'Giải đấu không được xin thêm chip' };
  if (!p.busted || p.chips > 0) return { ok: false, reason: 'Bạn vẫn còn chip mà 😏' };
  doRebuy(s, p); s.seq++;
  return { ok: true };
}
function doRebuy(s, p, why = '') {
  p.chips = s.opts.chips; p.busted = false; p.rebuys++; s.bank += s.opts.chips;
  log(s, `🥺 ${nm(p)} ${why || 'xin mẹ thêm chip'}: +${fmt(s.opts.chips)} (lần ${p.rebuys}).`); ev(s, { k: 'rebuy', pid: p.id, a: s.opts.chips });
}

// ---------- tiến trình vòng cược ----------
function advance(s) {
  const lv = live(s);
  if (lv.length === 1) return winByFold(s, lv[0]);
  const pend = p => canAct(p) && (p.need || p.bet < s.currentBet);
  const nx = nextIdx(s, s.turn, pend);
  if (nx >= 0) { s.turn = nx; return; }
  endStreet(s);
}
function endStreet(s) {
  if (s.players.some(p => p.bet > 0)) ev(s, { k: 'collect', street: s.street });
  for (const p of s.players) { p.bet = 0; p.need = false; p.acted = false; p.seen = -1; }
  s.currentBet = 0; s.minRaise = s.bb; s.raiseN = 0;
  const actors = s.players.filter(canAct);
  if (s.street === 'river') return showdown(s);
  if (actors.length <= 1) { // mọi người còn lại đã tất tay: lật bài rồi chia nốt
    for (const p of live(s)) s.reveal[p.id] = true;
    const from = s.board.length;
    while (s.board.length < 5) { s.deck.pop(); dealBoard(s, s.board.length === 0 ? 3 : 1); }
    ev(s, { k: 'runout', from });
    log(s, `🔥 Tất tay! Lật bài và chia nốt: ${s.board.slice(from).join(' ')}`);
    return showdown(s);
  }
  s.deck.pop(); // đốt 1 lá
  const nextSt = { preflop: 'flop', flop: 'turn', turn: 'river' }[s.street];
  dealBoard(s, nextSt === 'flop' ? 3 : 1);
  s.street = nextSt;
  for (const p of s.players) if (p.last && !['fold', 'allin'].includes(p.last.t)) p.last = null;
  for (const p of actors) p.need = true;
  log(s, `${{ flop: '🃏 Flop', turn: '🃏 Turn', river: '🃏 River' }[nextSt]}: ${s.board.join(' ')}`);
  ev(s, { k: 'deal', street: nextSt });
  s.turn = s.button;
  advance(s);
}
function dealBoard(s, k) { for (let i = 0; i < k; i++) s.board.push(s.deck.pop()); }

// trả lại phần cược không ai theo (người cược cao nhất hơn người thứ hai)
function refundUncalled(s) {
  const tops = [...s.players].sort((a, b) => b.total - a.total);
  if (tops.length < 2 || tops[0].total === tops[1].total) return;
  const diff = tops[0].total - tops[1].total;
  tops[0].total -= diff; tops[0].chips += diff;
  if (tops[0].bet) tops[0].bet = Math.max(0, tops[0].bet - diff);
  if (tops[0].chips > 0 && tops[0].allIn) tops[0].allIn = false;
  log(s, `↩️ Trả lại ${nm(tops[0])} ${fmt(diff)} chip không ai theo.`);
}
// Chia pot chính / pot phụ theo mức góp của người còn trong ván
export function computePots(players, key = 'total') {
  const amt = p => p[key];
  const levels = [...new Set(players.filter(p => p.inHand && !p.folded && amt(p) > 0).map(amt))].sort((a, b) => a - b);
  const pots = []; let prev = 0;
  for (const L of levels) {
    let amount = 0; for (const p of players) amount += Math.max(0, Math.min(amt(p), L) - prev);
    const elig = players.filter(p => p.inHand && !p.folded && amt(p) >= L).map(p => p.id);
    if (amount > 0) { if (pots.length && pots[pots.length - 1].eligible.length === elig.length) pots[pots.length - 1].amount += amount; else pots.push({ amount, eligible: elig }); }
    prev = L;
  }
  // phần góp của người đã bỏ vượt mức cao nhất (hiếm) dồn vào pot cuối
  const rest = players.reduce((t, p) => t + Math.max(0, amt(p) - prev), 0);
  if (rest && pots.length) pots[pots.length - 1].amount += rest;
  return pots;
}
function winByFold(s, w) {
  refundUncalled(s);
  const pot = potTotal(s);
  ev(s, { k: 'collect', street: s.street });
  w.chips += pot;
  const net = {}; for (const p of s.players) net[p.id] = (p.id === w.id ? pot : 0) - p.total;
  s.result = { kind: 'fold', pots: [{ amount: pot, winners: [w.id], name: null, best: [], share: { [w.id]: pot } }], hands: {}, won: { [w.id]: pot }, net };
  log(s, `🏆 ${nm(w)} ăn ${fmt(pot)} (mọi người bỏ bài).`);
  finishHand(s);
}
function showdown(s) {
  refundUncalled(s);
  const lv = live(s);
  const hands = {};
  for (const p of lv) { s.reveal[p.id] = true; const e = evaluate([...p.hole, ...s.board]); hands[p.id] = { score: e.score, cat: e.cat, name: e.name, desc: e.desc, best: e.best }; }
  const pots = computePots(s.players);
  const won = {};
  const order = []; for (let k = 1; k <= n(s); k++) order.push(s.players[(s.button + k) % n(s)].id); // chip lẻ: người gần bên trái Dealer nhất
  const out = pots.map((pt, i) => {
    let best = -1; for (const id of pt.eligible) best = Math.max(best, hands[id].score);
    const ws = pt.eligible.filter(id => hands[id].score === best).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const each = Math.floor(pt.amount / ws.length); let odd = pt.amount - each * ws.length;
    const share = {};
    for (const id of ws) { const g = each + (odd > 0 ? 1 : 0); if (odd > 0) odd--; share[id] = g; won[id] = (won[id] || 0) + g; }
    const w0 = hands[ws[0]];
    return { amount: pt.amount, winners: ws, name: w0.name, desc: w0.desc, best: w0.best, share, side: i > 0, eligible: pt.eligible };
  });
  ev(s, { k: 'collect', street: s.street });
  for (const p of s.players) if (won[p.id]) p.chips += won[p.id];
  const net = {}; for (const p of s.players) net[p.id] = (won[p.id] || 0) - p.total;
  s.result = { kind: 'showdown', pots: out, hands, won, net };
  for (const p of lv) log(s, `🂠 ${nm(p)}: ${p.hole.join(' ')} → ${hands[p.id].desc}`);
  out.forEach((pt, i) => log(s, `🏆 ${pots.length > 1 ? (i ? `Pot phụ ${i}` : 'Pot chính') + ' ' : ''}${fmt(pt.amount)}: ${pt.winners.map(id => nm(s.players.find(p => p.id === id))).join(' + ')}${pt.winners.length > 1 ? ' chia nhau' : ''} (${pt.desc})`));
  finishHand(s);
}
function finishHand(s) {
  for (const p of s.players) { p.total = 0; p.bet = 0; }
  s.phase = 'handover'; s.turn = -1; s.seq++;
  ev(s, { k: 'win', won: s.result.won });
  // hết chip
  const bustNow = s.players.filter(p => p.inHand && p.chips === 0);
  if (s.opts.mode === 'tourn') {
    const left = s.players.filter(p => !p.out && p.chips > 0).length;
    for (const p of bustNow) { p.out = true; p.place = left + 1; log(s, `💀 ${nm(p)} hết chip – bị loại (hạng ${p.place}).`); ev(s, { k: 'bust', pid: p.id }); }
    if (left <= 1) {
      const w = s.players.find(p => !p.out && p.chips > 0) || s.players[0];
      w.place = 1; s.winner = w.id; s.phase = 'over';
      log(s, `🏆🏆 ${nm(w)} vô địch giải đấu sau ${s.handNo} ván!`); ev(s, { k: 'champion', pid: w.id });
    }
  } else {
    for (const p of bustNow) { p.busted = true; log(s, `💸 ${nm(p)} cháy túi!`); ev(s, { k: 'bust', pid: p.id }); }
  }
}

// Bắt đầu ván kế (chủ phòng gọi sau khi xem kết quả). Trả về false nếu không thể.
// người vào giữa ván (đang xem) được ngồi vào bàn ở ván sau – chỉ chế độ chơi vui (giải đấu thì chờ giải mới)
export function seatPlayers(s, list) {
  if (s.opts.mode !== 'cash') return;
  for (const p of list) {
    if (s.players.length >= MAX_PLAYERS || s.players.some(q => q.id === p.id)) continue;
    s.players.push({ id: p.id, name: p.name, isBot: !!p.isBot, chips: s.opts.chips, hole: null, bet: 0, total: 0, folded: false, allIn: false, inHand: false, need: false, acted: false, seen: -1, last: null, busted: false, out: false, place: 0, rebuys: 0 });
    s.bank += s.opts.chips; log(s, `👋 ${p.name} vào bàn.`);
  }
}
export function nextHand(s) {
  if (s.phase !== 'handover') return false;
  if (s.opts.mode === 'cash') {
    for (const p of s.players) if (p.busted && p.isBot) doRebuy(s, p, 'gọi điện xin mẹ thêm chip');
    if (funded(s).length < 2) for (const p of s.players) if (p.busted) doRebuy(s, p, 'được mẹ thương cho thêm chip');
  }
  if (funded(s).length < 2) return false;
  s.phase = 'playing';
  startHand(s);
  return true;
}

// tổng chip trên bàn (để kiểm tra bảo toàn): chip trong túi + chip đang cược
export const chipsOnTable = s => s.players.reduce((t, p) => t + p.chips + p.total, 0);

// ---------- góc nhìn của 1 người: giấu bài tẩy người khác, giấu bộ bài ----------
export function viewFor(s, pid) {
  const shown = id => id === pid || !!s.reveal[id];
  const v = {
    opts: s.opts, handNo: s.handNo, level: s.level, sb: s.sb, bb: s.bb, button: s.button, sbIdx: s.sbIdx, bbIdx: s.bbIdx, turn: s.turn,
    board: s.board.slice(), street: s.street, currentBet: s.currentBet, minRaise: s.minRaise, phase: s.phase, winner: s.winner,
    nextLevelIn: s.opts.blindUp ? s.opts.blindUp - ((s.handNo - 1) % s.opts.blindUp) : 0, next: blindsAt(s.opts, s.level + 1),
    log: s.log.slice(-40), logN: s.logN, ev: s.ev.slice(), evN: s.evN, seq: s.seq, deckCount: s.deck.length,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, chips: p.chips, bet: p.bet, total: p.total, folded: p.folded, allIn: p.allIn, inHand: p.inHand, busted: p.busted, out: p.out, place: p.place, rebuys: p.rebuys, last: p.last, hasCards: !!p.hole && !p.folded, hole: p.hole && shown(p.id) && !(p.folded && p.id !== pid) ? p.hole.slice() : null })),
    pot: potTotal(s), pots: [],
    result: s.result ? JSON.parse(JSON.stringify(s.result)) : null,
    me: pid, legal: legal(s, pid),
  };
  // pot đã gom (không tính cược đang đặt trên vòng này)
  if (s.phase === 'playing') v.pots = computePots(s.players.map(p => ({ ...p, collected: p.total - p.bet })), 'collected');
  if (v.result) { for (const id of Object.keys(v.result.hands)) if (!shown(id)) delete v.result.hands[id]; }
  return v;
}
