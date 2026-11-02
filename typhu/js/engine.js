// Luật Cờ tỷ phú kiểu ZingPlay – thuần logic.
import { SQUARES, N, SIDES, RESORTS, GROUPS, groupSquares, SALARY, ISLAND_FEE, START_MONEY, houseCost, landmarkCost, value, MULT, CHANCES, money, AVATARS, COLORS } from './board.js';
let rand = Math.random;
export function setRandom(f) { rand = f; }
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const TOKENS = ['#ff5a5f', '#3d8bff', '#2fc76f', '#ffb020'];

// mỗi người một màu: trùng thì đổi sang màu còn trống
function pickColors(list) {
  const used = new Set();
  return list.map(p => { let c = COLORS.includes(p.color) && !used.has(p.color) ? p.color : COLORS.find(x => !used.has(x)); used.add(c); return { ...p, color: c }; });
}
export function createGame(playerList, opts = {}) {
  const startMoney = opts.startMoney || START_MONEY;
  const s = {
    phase: 'playing', turn: 0, stage: 'roll', round: 1, maxRounds: opts.maxRounds || 0, monopolyWin: opts.monopolyWin !== false,
    players: pickColors(playerList).map((p, i) => ({ id: p.id, name: p.name, isBot: !!p.isBot, color: p.color, avatar: p.avatar || AVATARS[i], pos: 0, cash: startMoney, out: false, island: 0, travel: false, freeRent: 0, escape: 0, doubles: 0 })),
    props: {}, // pos -> { owner, level }
    festival: null, pending: null, dice: null, log: [], logN: 0, winner: null, winReason: '',
    deck: shuffle(CHANCES.map(c => c.id)), lastChance: null, moveSeq: 0, lastMove: null, moves: [],
  };
  s.turn = Math.floor(rand() * s.players.length);
  log(s, `Ván mới bắt đầu! ${cur(s).name} đi trước.`);
  return s;
}
function addMove(s, m) { s.lastMove = m; s.moves.push(m); if (s.moves.length > 8) s.moves.shift(); }
function log(s, m) { s.log.push(m); s.logN++; if (s.log.length > 120) s.log.shift(); }
export const cur = s => s.players[s.turn];
export const getP = (s, id) => s.players.find(p => p.id === id);
const alive = s => s.players.filter(p => !p.out);

// ---------- tiền ----------
export function rentOf(s, pos) {
  const q = SQUARES[pos], pr = s.props[pos]; if (!pr) return 0;
  let r;
  if (q.type === 'resort') { const c = RESORTS.filter(i => s.props[i] && s.props[i].owner === pr.owner).length; r = 50 * Math.pow(2, c - 1); }
  else {
    r = value(q, pr.level) * MULT[pr.level];
    if (groupSquares(q.group).every(i => s.props[i] && s.props[i].owner === pr.owner)) r *= 1.5; // đủ bộ màu
  }
  if (s.festival === pos) r *= 2;
  return Math.round(r / 5) * 5;
}
export function assets(s, p) {
  let v = p.cash;
  for (const [pos, pr] of Object.entries(s.props)) if (pr.owner === p.id) v += value(SQUARES[pos], pr.level);
  return v;
}
function owned(s, p) { return Object.keys(s.props).map(Number).filter(i => s.props[i].owner === p.id); }
// trả tiền: thiếu thì tự bán bớt đất (giá 60%), vẫn thiếu thì phá sản
function pay(s, p, amount, to) {
  amount = Math.round(amount);
  if (p.cash < amount) raise(s, p, amount - p.cash);
  const paid = Math.min(p.cash, amount);
  p.cash -= paid; if (to) to.cash += paid;
  if (paid < amount) bankrupt(s, p, to);
  return paid;
}
function raise(s, p, need) {
  const mine = owned(s, p).sort((a, b) => value(SQUARES[a], s.props[a].level) - value(SQUARES[b], s.props[b].level));
  for (const pos of mine) {
    if (need <= 0) break;
    const v = Math.round(value(SQUARES[pos], s.props[pos].level) * 0.6);
    delete s.props[pos]; if (s.festival === pos) s.festival = null;
    p.cash += v; need -= v; log(s, `🏚️ ${p.name} bán ${SQUARES[pos].name} được ${money(v)}.`);
  }
}
function bankrupt(s, p, to) {
  p.out = true; p.cash = 0;
  for (const pos of owned(s, p)) { delete s.props[pos]; if (s.festival === pos) s.festival = null; }
  log(s, `💀 ${p.name} phá sản!`);
  const al = alive(s); if (al.length === 1) win(s, al[0], 'Người cuối cùng trụ lại');
}
function win(s, p, why) { if (s.phase === 'ended') return; s.phase = 'ended'; s.winner = p.id; s.winReason = why; s.pending = null; log(s, `🏆 ${p.name} thắng! (${why})`); }
function checkMonopoly(s, p) {
  if (!s.monopolyWin || s.phase !== 'playing' || p.out) return;
  const own = i => s.props[i] && s.props[i].owner === p.id;
  const full = GROUPS.filter(g => groupSquares(g.id).every(own)).length;
  if (full >= 3) return win(s, p, 'Độc quyền 3 màu');
  if (RESORTS.every(own)) return win(s, p, 'Độc quyền du lịch');
  for (const [a, b] of SIDES) { const sq = []; for (let i = a; i <= b; i++) if (['city', 'resort'].includes(SQUARES[i].type)) sq.push(i); if (sq.every(own)) return win(s, p, 'Độc quyền 1 dãy phố'); }
}

// ---------- di chuyển ----------
function moveBy(s, p, steps) {
  const from = p.pos; let passed = false;
  for (let k = 0; k < steps; k++) { p.pos = (p.pos + 1) % N; if (p.pos === 0) passed = true; }
  addMove(s, { id: p.id, from, to: p.pos, steps, kind: 'walk', seq: ++s.moveSeq });
  if (passed) { p.cash += SALARY; log(s, `💰 ${p.name} qua Khởi hành, nhận lương ${money(SALARY)}.`); }
  land(s, p);
}
function jumpTo(s, p, to, getSalary = true, kind = 'jump') {
  const from = p.pos; const passed = getSalary && to <= from && to !== from;
  p.pos = to; addMove(s, { id: p.id, from, to, steps: 0, kind, seq: ++s.moveSeq });
  if (passed || (getSalary && to === 0)) { p.cash += SALARY; log(s, `💰 ${p.name} qua Khởi hành, nhận lương ${money(SALARY)}.`); }
  land(s, p);
}
function sendIsland(s, p) {
  const from = p.pos; p.pos = 8; p.doubles = 0; addMove(s, { id: p.id, from, to: 8, steps: 0, kind: 'jump', seq: ++s.moveSeq });
  if (p.escape) { p.escape--; log(s, `🚤 ${p.name} dùng thẻ thoát đảo, không bị giam.`); return; }
  p.island = 3; log(s, `🏝️ ${p.name} bị giam ở Côn Đảo!`);
}
function land(s, p) {
  const pos = p.pos, q = SQUARES[pos], pr = s.props[pos];
  switch (q.type) {
    case 'start': return;
    case 'island': sendIsland(s, p); return;
    case 'festival': {
      const mine = owned(s, p).filter(i => SQUARES[i].type === 'city');
      if (mine.length) s.pending = { type: 'festival', player: p.id, options: mine };
      else log(s, `🎉 ${p.name} tới Lễ hội nhưng chưa có đất để tổ chức.`);
      return;
    }
    case 'travel': p.travel = true; log(s, `✈️ ${p.name} ra sân bay – lượt sau được bay tới ô bất kỳ.`); return;
    case 'tax': { const t = Math.round(assets(s, p) * 0.1 / 5) * 5; pay(s, p, t, null); log(s, `💸 ${p.name} đóng thuế ${money(t)} (10% tài sản).`); return; }
    case 'chance': return drawChance(s, p);
    case 'city': case 'resort': {
      if (!pr) {
        if (p.cash >= q.price) s.pending = { type: 'buy', player: p.id, pos, maxLevel: q.type === 'city' ? 3 : 0 };
        else log(s, `${p.name} không đủ tiền mua ${q.name}.`);
        return;
      }
      if (pr.owner === p.id) {
        if (q.type === 'city' && pr.level < 4) {
          const can = pr.level === 3 ? cost(q, 3, 4) <= p.cash : cost(q, pr.level, pr.level + 1) <= p.cash;
          if (can) s.pending = { type: 'build', player: p.id, pos, from: pr.level, maxLevel: pr.level === 3 ? 4 : 3 };
        }
        return;
      }
      const owner = getP(s, pr.owner); const r = rentOf(s, pos);
      if (p.freeRent) { p.freeRent--; log(s, `🎟️ ${p.name} dùng thẻ miễn phí, khỏi trả ${money(r)} cho ${owner.name}.`); }
      else { const paid = pay(s, p, r, owner); log(s, `💸 ${p.name} trả ${money(paid)} tiền thuê ${q.name} cho ${owner.name}.`); }
      if (p.out || s.phase !== 'playing') return;
      if (q.type === 'city' && pr.level < 4) {
        const price = takeoverPrice(s, pos);
        if (p.cash >= price) s.pending = { type: 'takeover', player: p.id, pos, price };
      }
      return;
    }
  }
}
export const takeoverPrice = (s, pos) => value(SQUARES[pos], s.props[pos].level) * 2;
export function cost(q, from, to) {
  let c = 0;
  if (from < 0) { c += q.price; from = 0; }
  for (let l = from + 1; l <= to; l++) c += l === 4 ? landmarkCost(q) : houseCost(q);
  return c;
}
function drawChance(s, p) {
  if (!s.deck.length) s.deck = shuffle(CHANCES.map(c => c.id));
  const id = s.deck.pop(); const c = CHANCES.find(x => x.id === id);
  s.lastChance = { id, player: p.id, text: c.text, seq: s.moveSeq + 1 + s.logN };
  log(s, `❓ Cơ hội cho ${p.name}: ${c.text}`);
  const others = alive(s).filter(q => q !== p);
  switch (id) {
    case 'lotto': p.cash += 300; break;
    case 'bonus': p.cash += 150; break;
    case 'fine': pay(s, p, 150, null); break;
    case 'bday': for (const q of others) { pay(s, q, 50, p); if (s.phase !== 'playing') return; } break;
    case 'treat': for (const q of others) { if (p.out) break; pay(s, p, 50, q); } break;
    case 'start': jumpTo(s, p, 0); break;
    case 'island': sendIsland(s, p); break;
    case 'festival': jumpTo(s, p, 16); break;
    case 'airport': jumpTo(s, p, 24); break;
    case 'back3': { const from = p.pos; p.pos = (p.pos - 3 + N) % N; addMove(s, { id: p.id, from, to: p.pos, steps: -3, kind: 'back', seq: ++s.moveSeq }); land(s, p); break; }
    case 'free': p.freeRent++; break;
    case 'escape': p.escape++; break;
    case 'storm': {
      const rich = others.filter(q => owned(s, q).some(i => s.props[i].level > 0 && s.props[i].level < 4)).sort((a, b) => assets(s, b) - assets(s, a))[0];
      if (!rich) { log(s, '🌤️ Bão tan, không ai thiệt hại.'); break; }
      const targets = owned(s, rich).filter(i => s.props[i].level > 0 && s.props[i].level < 4).sort((a, b) => SQUARES[b].price - SQUARES[a].price);
      s.props[targets[0]].level--; log(s, `🌪️ Một căn nhà của ${rich.name} ở ${SQUARES[targets[0]].name} bị sập.`); break;
    }
    case 'repair': { const n = owned(s, p).reduce((t, i) => t + Math.min(3, s.props[i].level) + (s.props[i].level === 4 ? 2 : 0), 0); if (n) pay(s, p, 20 * n, null); break; }
  }
}

// ---------- lượt ----------
function roll() { return [1 + Math.floor(rand() * 6), 1 + Math.floor(rand() * 6)]; }
function afterResolve(s) {
  if (s.phase !== 'playing' || s.pending) return;
  const p = cur(s);
  if (!p.out && s.dice && s.dice[0] === s.dice[1] && !p.island && !s.noExtra) { s.stage = 'roll'; log(s, `🎲 ${p.name} được đổ đôi, đi tiếp!`); return; }
  nextTurn(s);
}
function nextTurn(s) {
  s.noExtra = false;
  const p = cur(s); p.doubles = 0;
  let i = s.turn; do { i = (i + 1) % s.players.length; } while (s.players[i].out);
  if (i <= s.turn) {
    s.round++;
    if (s.maxRounds && s.round > s.maxRounds) {
      const best = alive(s).sort((a, b) => assets(s, b) - assets(s, a))[0];
      return win(s, best, `Giàu nhất sau ${s.maxRounds} vòng`);
    }
  }
  s.turn = i; s.dice = null;
  const q = cur(s);
  s.stage = q.travel ? 'travel' : q.island ? 'island' : 'roll';
}

// action: roll | pay_island | travel{pos} | buy{level} | build{level} | takeover | festival{pos} | skip
export function applyAction(s, pid, a) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const p = getP(s, pid); if (!p || p.out) return { ok: false, reason: 'Bạn đã phá sản.' };
  const pr = s.pending;
  if (pr) {
    if (pr.player !== pid) return { ok: false, reason: 'Đang chờ người khác.' };
    const q = SQUARES[pr.pos];
    if (a.type === 'skip') { s.pending = null; afterResolve(s); return { ok: true }; }
    if (pr.type === 'buy' && a.type === 'buy') {
      const lv = Math.max(0, Math.min(pr.maxLevel, a.level | 0)); const c = cost(q, -1, lv);
      if (c > p.cash) return { ok: false, reason: 'Không đủ tiền.' };
      p.cash -= c; s.props[pr.pos] = { owner: p.id, level: lv };
      log(s, `🏠 ${p.name} mua ${q.name}${lv ? ` và xây ${lv} nhà` : ''} (${money(c)}).`);
      s.pending = null; checkMonopoly(s, p); afterResolve(s); return { ok: true };
    }
    if (pr.type === 'build' && a.type === 'build') {
      const prop = s.props[pr.pos]; const lv = Math.max(prop.level + 1, Math.min(pr.maxLevel, a.level | 0));
      if (lv === 4 && prop.level !== 3) return { ok: false, reason: 'Cần đủ 3 nhà mới xây Landmark.' };
      const c = cost(q, prop.level, lv); if (c > p.cash) return { ok: false, reason: 'Không đủ tiền.' };
      p.cash -= c; prop.level = lv;
      log(s, lv === 4 ? `🏛️ ${p.name} xây Landmark ở ${q.name}! (${money(c)})` : `🔨 ${p.name} xây lên ${lv} nhà ở ${q.name} (${money(c)}).`);
      s.pending = null; afterResolve(s); return { ok: true };
    }
    if (pr.type === 'takeover' && a.type === 'takeover') {
      const prop = s.props[pr.pos]; const owner = getP(s, prop.owner); const price = takeoverPrice(s, pr.pos);
      if (price > p.cash) return { ok: false, reason: 'Không đủ tiền.' };
      p.cash -= price; owner.cash += price; prop.owner = p.id;
      log(s, `🤝 ${p.name} mua lại ${q.name} từ ${owner.name} với giá ${money(price)}!`);
      s.pending = null; checkMonopoly(s, p);
      if (s.phase === 'playing' && prop.level < 3 && p.cash >= houseCost(q)) { s.pending = { type: 'build', player: p.id, pos: pr.pos, from: prop.level, maxLevel: 3 }; return { ok: true }; }
      afterResolve(s); return { ok: true };
    }
    if (pr.type === 'festival' && a.type === 'festival') {
      if (!pr.options.includes(a.pos)) return { ok: false, reason: 'Chọn đất của bạn.' };
      s.festival = a.pos; log(s, `🎉 ${p.name} tổ chức Lễ hội ở ${SQUARES[a.pos].name} – tiền thuê x2!`);
      s.pending = null; afterResolve(s); return { ok: true };
    }
    return { ok: false, reason: 'Hãy chọn trong bảng.' };
  }
  if (cur(s) !== p) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (s.stage === 'travel') {
    if (a.type !== 'travel' || !(a.pos >= 0 && a.pos < N) || a.pos === 24) return { ok: false, reason: 'Chọn ô muốn bay tới.' };
    p.travel = false; s.dice = null; s.noExtra = true; log(s, `✈️ ${p.name} bay tới ${SQUARES[a.pos].name}.`);
    jumpTo(s, p, a.pos, true, 'fly'); afterResolve(s); return { ok: true };
  }
  if (s.stage === 'island') {
    if (a.type === 'pay_island') {
      if (p.cash < ISLAND_FEE) return { ok: false, reason: 'Không đủ tiền.' };
      p.cash -= ISLAND_FEE; p.island = 0; s.stage = 'roll'; log(s, `🚤 ${p.name} trả ${money(ISLAND_FEE)} rời Côn Đảo.`); return { ok: true };
    }
    if (a.type !== 'roll') return { ok: false, reason: 'Đổ xúc xắc hoặc trả tiền rời đảo.' };
    const d = roll(); s.dice = d; s.noExtra = true;
    if (d[0] === d[1]) { p.island = 0; log(s, `🎲 ${p.name} đổ đôi ${d[0]}–${d[1]}, thoát Côn Đảo!`); moveBy(s, p, d[0] + d[1]); afterResolve(s); return { ok: true }; }
    p.island--; log(s, `🎲 ${p.name} đổ ${d[0]}–${d[1]}, chưa thoát được (còn ${p.island} lượt).`);
    nextTurn(s); return { ok: true };
  }
  if (a.type !== 'roll') return { ok: false, reason: 'Hãy đổ xúc xắc.' };
  const d = roll(); s.dice = d; s.noExtra = false;
  if (d[0] === d[1]) { p.doubles++; if (p.doubles >= 3) { log(s, `🎲 ${p.name} đổ đôi 3 lần liền!`); sendIsland(s, p); s.noExtra = true; nextTurn(s); return { ok: true }; } }
  else p.doubles = 0;
  log(s, `🎲 ${p.name} đổ ${d[0]}–${d[1]}.`);
  moveBy(s, p, d[0] + d[1]); afterResolve(s); return { ok: true };
}

export function viewFor(s, pid) {
  return {
    phase: s.phase, turn: s.turn, stage: s.stage, round: s.round, maxRounds: s.maxRounds, dice: s.dice, me: pid,
    players: s.players.map(p => ({ ...p, assets: assets(s, p) })),
    props: s.props, festival: s.festival, pending: s.pending, log: s.log.slice(-30), logN: s.logN,
    winner: s.winner, winReason: s.winReason, lastMove: s.lastMove, moves: s.moves, lastChance: s.lastChance,
    rents: Object.fromEntries(Object.keys(s.props).map(k => [k, rentOf(s, +k)])),
  };
}
