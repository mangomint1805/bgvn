// Tiến Lên miền Nam – luật thuần logic (JSON được, không đụng giao diện)
// Lá bài là số 0..51: hạng = id >> 2 (0 = "3" … 11 = "A", 12 = "2"), chất = id & 3 (0 ♠ < 1 ♣ < 2 ♦ < 3 ♥).
// Vì vậy so lá chỉ cần so số: lá lớn hơn = id lớn hơn.
let rand = Math.random;
export function setRandom(fn) { rand = fn; }
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
export const SUITS = ['♠', '♣', '♦', '♥'];
export const SUIT_NAME = ['bích', 'chuồn', 'rô', 'cơ'];
export const HEO = 12;
export const rankOf = c => c >> 2;
export const suitOf = c => c & 3;
export const isRed = c => (c & 3) >= 2;
export const cardName = c => RANKS[c >> 2] + SUITS[c & 3];
export const BETS = [10, 20, 50];
export const TURN_TIMES = [20, 30, 60];
export const START_CHIPS = 1000;
export const DEFAULT_OPTS = {
  bet: 10,          // 1 "phần" = bao nhiêu chip
  toiTrang: true,   // tới trắng (thắng ngay khi chia bài)
  thoiHang: true,   // bét còn tứ quý / đôi thông cũng bị thối
  chatChong: true,  // chặt chồng: người bị chặt sau cùng đền luôn phần trước đó
  spadeEvery: false,// ván nào cũng người có 3♠ đi trước (mặc định: người thắng ván trước đi trước)
  turnTime: 30,     // giây mỗi lượt cho người thật (hết giờ máy đánh thay)
  veHeo: 'heoHang', // cấm về (đánh nước cuối) bằng: 'heoHang' heo + tứ quý/đôi thông · 'heo' chỉ heo · 'free' cho phép
};
export const VE_HEO = { heoHang: 'Cấm về heo + hàng', heo: 'Cấm về heo', free: 'Cho phép' };
// chip đổi tay (tính theo "phần" = opts.bet)
export const PAY = { heoDen: 1, heoDo: 2, dt3: 3, tuQuy: 4, dt4: 5, cong: 2, toiTrang: 4 };
// tiền theo hạng: [hạng trả, hạng nhận, số phần]
export const PLACE_PAY = { 2: [[1, 0, 2]], 3: [[2, 0, 2], [1, 0, 1]], 4: [[3, 0, 2], [2, 1, 1]] };
export const TOI_TRANG = { rong: 'Sảnh rồng 3→A', tq2: 'Tứ quý heo', dt5: '5 đôi thông', doi6: '6 đôi', mau: 'Đồng màu 13 lá', tq3: 'Tứ quý 3 (ván đầu)' };

// ---------- nhận dạng bộ ----------
// trả về { type: single|pair|triple|quad|straight|pairs, len, top } hoặc null
export function classify(ids) {
  const n = ids ? ids.length : 0; if (!n) return null;
  const cs = [...ids].sort((a, b) => a - b);
  for (let i = 1; i < n; i++) if (cs[i] === cs[i - 1]) return null;
  if (cs[0] < 0 || cs[n - 1] > 51) return null;
  const r = cs.map(rankOf), top = cs[n - 1];
  if (n === 1) return { type: 'single', len: 1, top };
  if (r.every(x => x === r[0])) return n === 2 ? { type: 'pair', len: 2, top } : n === 3 ? { type: 'triple', len: 3, top } : { type: 'quad', len: 4, top };
  if (r[n - 1] === HEO) return null; // sảnh / đôi thông không được có heo
  if (n >= 3 && r.every((x, i) => i === 0 || x === r[i - 1] + 1)) return { type: 'straight', len: n, top };
  if (n >= 6 && n % 2 === 0) {
    let ok = true;
    for (let i = 0; i < n; i += 2) if (r[i] !== r[i + 1] || (i && r[i] !== r[i - 2] + 1)) { ok = false; break; }
    if (ok) return { type: 'pairs', len: n / 2, top };
  }
  return null;
}
export const isHeoCombo = c => !!c && ['single', 'pair', 'triple'].includes(c.type) && rankOf(c.top) === HEO;
export const isHang = c => !!c && (c.type === 'quad' || (c.type === 'pairs' && c.len >= 3));

// a đè được b? (b null = đang cầm cái, đánh gì cũng được)
export function beats(a, b) {
  if (!a) return false;
  if (!b) return true;
  if (a.type === b.type && a.len === b.len) return a.top > b.top;
  const heo = rankOf(b.top) === HEO;
  const dt = n => a.type === 'pairs' && a.len >= n;
  if (b.type === 'single' && heo) return a.type === 'quad' || dt(3);       // 3 đôi thông / tứ quý / 4 đôi thông chặt 1 heo
  if (b.type === 'pair' && heo) return a.type === 'quad' || dt(4);         // tứ quý / 4 đôi thông chặt đôi heo
  if (b.type === 'pairs' && b.len === 3) return a.type === 'quad' || dt(4); // tứ quý / 4 đôi thông chặt 3 đôi thông
  if (b.type === 'quad') return dt(4);                                      // 4 đôi thông chặt tứ quý
  if (b.type === 'pairs' && b.len >= 4) return dt(b.len + 1);
  return false;
}
// có phải "chặt" (có chip đổi tay) không: hàng đè heo, hoặc hàng đè hàng
export const isChop = (a, b) => !!b && isHang(a) && (isHeoCombo(b) || isHang(b));
// giá trị (số phần) của thứ bị chặt / bị thối
export function heoValue(ids) { return ids.filter(c => rankOf(c) === HEO).reduce((t, c) => t + (isRed(c) ? PAY.heoDo : PAY.heoDen), 0); }
export function hangValue(c) { return c.type === 'quad' ? PAY.tuQuy : c.len === 3 ? PAY.dt3 : PAY.dt4 + (c.len - 4); }
export function comboValue(c, ids) { return isHang(c) ? hangValue(c) : heoValue(ids); }

export function comboName(c, ids = null) {
  if (!c) return '';
  const R = RANKS[rankOf(c.top)], heo = rankOf(c.top) === HEO;
  switch (c.type) {
    case 'single': return heo ? `Heo ${SUITS[suitOf(c.top)]}` : `Lẻ ${R}${SUITS[suitOf(c.top)]}`;
    case 'pair': return heo ? 'Đôi heo' : `Đôi ${R}`;
    case 'triple': return heo ? 'Sám heo' : `Sám ${R}`;
    case 'quad': return heo ? 'Tứ quý heo' : `Tứ quý ${R}`;
    case 'straight': return `Sảnh ${RANKS[rankOf(c.top) - c.len + 1]}→${R}`;
    case 'pairs': return `${c.len} đôi thông ${RANKS[rankOf(c.top) - c.len + 1]}→${R}`;
  }
  return '';
}

// ---------- liệt kê các bộ đánh được ----------
// Sảnh / đôi thông: các hàng dưới lấy lá nhỏ nhất (giữ lá to), hàng trên cùng thử mọi chất (quyết định độ lớn).
function groups(hand) { const g = Array.from({ length: 13 }, () => []); for (const c of [...hand].sort((a, b) => a - b)) g[rankOf(c)].push(c); return g; }
function subsets(arr, k) { const out = []; const rec = (i, cur) => { if (cur.length === k) { out.push([...cur]); return; } for (let j = i; j < arr.length; j++) { cur.push(arr[j]); rec(j + 1, cur); cur.pop(); } }; rec(0, []); return out; }
export function allCombos(hand) {
  const g = groups(hand), out = [];
  for (const c of hand) out.push([c]);
  for (let r = 0; r < 13; r++) {
    if (g[r].length >= 2) out.push(...subsets(g[r], 2));
    if (g[r].length >= 3) out.push(...subsets(g[r], 3));
    if (g[r].length === 4) out.push([...g[r]]);
  }
  for (let s = 0; s < 12; s++) {
    const base = [];
    for (let e = s; e < 12 && g[e].length; e++) {
      if (e - s >= 2) for (const t of g[e]) out.push([...base, t]);
      base.push(g[e][0]);
    }
    const pb = [];
    for (let e = s; e < 12 && g[e].length >= 2; e++) {
      if (e - s >= 2) for (const pr of subsets(g[e], 2)) out.push([...pb, ...pr]);
      pb.push(g[e][0], g[e][1]);
    }
  }
  return out;
}
export function legalPlays(hand, tableCombo = null, mustInclude = null) {
  const res = [];
  for (const ids of allCombos(hand)) {
    if (mustInclude != null && !ids.includes(mustInclude)) continue;
    const c = classify(ids);
    if (c && beats(c, tableCombo)) res.push(ids);
  }
  return res;
}

// nước đánh làm hết bài (về) có bị cấm không? trả về lý do hoặc null
export function badFinish(hand, ids, veHeo = 'heoHang') {
  if (!veHeo || veHeo === 'free' || ids.length !== hand.length) return null;
  if (ids.some(c => rankOf(c) === HEO)) return 'Không được về bằng heo 🐷';
  if (veHeo === 'heoHang') { const c = classify(ids); if (isHang(c)) return `Không được về bằng ${c.type === 'quad' ? 'tứ quý' : 'đôi thông'} 💣`; }
  return null;
}
// các nước hợp lệ của người đang tới lượt (đã trừ nước "về" bị cấm)
export function legalFor(s, pid) {
  const p = getPlayer(s, pid); if (!p) return [];
  return legalPlays(p.hand, s.table && s.table.combo, s.mustInclude).filter(ids => !badFinish(p.hand, ids, s.opts && s.opts.veHeo));
}
// tới lượt CHẶN (không phải cầm cái) mà trên tay không có bộ nào đè/chặt được → nên tự bỏ lượt
export function mustAutoPass(s, pid) {
  if (!s || s.phase !== 'playing' || !s.table) return false;
  const p = s.players[s.turn];
  if (!p || p.id !== pid || p.out || s.table.pid === pid) return false;
  return legalFor(s, pid).length === 0;
}

// ---------- tới trắng ----------
export function toiTrangOf(hand, firstGame = false) {
  if (hand.length !== 13) return null;
  const g = groups(hand), cnt = g.map(x => x.length);
  if (cnt.slice(0, 12).every(x => x >= 1)) return 'rong';
  if (cnt[HEO] === 4) return 'tq2';
  let run = 0; for (let r = 0; r < 12; r++) { run = cnt[r] >= 2 ? run + 1 : 0; if (run >= 5) return 'dt5'; }
  if (cnt.reduce((t, x) => t + Math.floor(x / 2), 0) >= 6) return 'doi6';
  if (hand.every(isRed) || hand.every(c => !isRed(c))) return 'mau';
  if (firstGame && cnt[0] === 4) return 'tq3';
  return null;
}
const TT_ORDER = ['rong', 'tq2', 'dt5', 'doi6', 'mau', 'tq3'];

// hàng còn trong tay (để tính thối): tứ quý trước, rồi các dây đôi thông ≥ 3
export function hangInHand(hand) {
  const g = groups(hand), found = [];
  const left = g.map(x => x.length);
  for (let r = 0; r < 12; r++) if (left[r] === 4) { found.push({ type: 'quad', len: 4, top: g[r][3] }); left[r] = 0; }
  let s = 0;
  while (s < 12) {
    if (left[s] < 2) { s++; continue; }
    let e = s; while (e + 1 < 12 && left[e + 1] >= 2) e++;
    const len = e - s + 1;
    if (len >= 3) found.push({ type: 'pairs', len, top: g[e][g[e].length - 1] });
    s = e + 1;
  }
  return found;
}
export function thoiValue(hand, thoiHang = true) {
  const heo = heoValue(hand);
  const hang = thoiHang ? hangInHand(hand).reduce((t, c) => t + hangValue(c), 0) : 0;
  return { heo, hang, total: heo + hang };
}

// ---------- ván chơi ----------
export const getPlayer = (s, id) => s.players.find(p => p.id === id);
export const current = s => s.players[s.turn];
const pname = p => p.name.replace(' 🤖', '');
function log(s, m) { s.log.push(m); if (s.log.length > 80) s.log.splice(0, s.log.length - 80); s.logN = (s.logN || 0) + 1; }
function fx(s, e) { s.fxN = (s.fxN || 0) + 1; s.fx.push({ id: s.fxN, ...e }); if (s.fx.length > 24) s.fx.splice(0, s.fx.length - 24); }
function pay(s, from, to, units, why, note = '') {
  if (!units || from === to) return 0;
  const n = units * s.opts.bet;
  s.delta[from] -= n; s.delta[to] += n;
  s.pays.push({ from, to, n, why, note });
  return n;
}

// players: [{id, name, isBot}], opts: DEFAULT_OPTS + { starter: id người đi trước (người thắng ván trước) | null, firstGame: bool }
export function createGame(players, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  if (players.length < 2 || players.length > 4) throw new Error('Tiến Lên cần 2–4 người');
  const deck = shuffle(Array.from({ length: 52 }, (_, i) => i));
  const s = {
    phase: 'playing', opts: o, players: [], turn: 0, table: null, trick: [], round: 1,
    mustInclude: null, finished: [], places: null, log: [], logN: 0, fx: [], fxN: 0,
    delta: {}, pays: [], gone: [], toiTrang: null, chopCount: 0, moves: 0,
  };
  s.players = players.map((p, i) => ({ id: p.id, name: p.name, isBot: !!p.isBot, hand: deck.slice(i * 13, i * 13 + 13).sort((a, b) => a - b), out: false, passed: false, played: false, cong: false, place: null }));
  for (const p of s.players) s.delta[p.id] = 0;
  // ai đi trước
  const st = o.starter && !o.spadeEvery ? s.players.findIndex(p => p.id === o.starter) : -1;
  if (st >= 0) { s.turn = st; log(s, `${pname(s.players[st])} thắng ván trước nên được đi trước.`); }
  else {
    let low = 99, who = 0;
    s.players.forEach((p, i) => { if (p.hand[0] < low) { low = p.hand[0]; who = i; } });
    s.turn = who; s.mustInclude = low;
    log(s, low === 0 ? `${pname(s.players[who])} có 3♠ – đi trước và phải đánh kèm 3♠.` : `Không ai có 3♠ – ${pname(s.players[who])} giữ lá nhỏ nhất (${cardName(low)}) đi trước.`);
  }
  s.leader = s.turn;
  // tới trắng
  if (o.toiTrang) {
    let best = null;
    for (let k = 0; k < s.players.length; k++) {
      const i = (s.turn + k) % s.players.length, p = s.players[i];
      const t = toiTrangOf(p.hand, !!o.firstGame || st < 0);
      if (t && (!best || TT_ORDER.indexOf(t) < TT_ORDER.indexOf(best.kind))) best = { pid: p.id, kind: t };
    }
    if (best) {
      s.toiTrang = best;
      const w = getPlayer(s, best.pid);
      log(s, `⚡ ${pname(w)} TỚI TRẮNG: ${TOI_TRANG[best.kind]}! Ăn trắng cả bàn.`);
      for (const p of s.players) if (p.id !== w.id) pay(s, p.id, w.id, PAY.toiTrang, 'toitrang', TOI_TRANG[best.kind]);
      fx(s, { k: 'toitrang', from: w.id, kind: best.kind });
      w.place = 1;
      s.places = [w.id, ...s.players.filter(p => p !== w).map(p => p.id)];
      s.players.forEach(p => { p.place = s.places.indexOf(p.id) + 1; });
      s.phase = 'ended'; s.winner = w.id;
      return s;
    }
  }
  log(s, `Lượt của ${pname(s.players[s.turn])}.`);
  return s;
}

const activeIdx = s => s.players.map((p, i) => i).filter(i => !s.players[i].out);
function nextActive(s, from) { const n = s.players.length; for (let k = 1; k <= n; k++) { const j = (from + k) % n; if (!s.players[j].out) return j; } return -1; }

function newRound(s, ownerIdx) {
  for (const p of s.players) p.passed = false;
  s.table = null; s.trick = []; s.round++;
  const lead = s.players[ownerIdx].out ? nextActive(s, ownerIdx) : ownerIdx;
  s.turn = lead; s.leader = lead;
  const L = s.players[lead];
  log(s, s.players[ownerIdx].out ? `Vòng mới – ${pname(L)} hưởng sái, được đánh tự do.` : `Vòng mới – ${pname(L)} cầm cái, đánh tự do.`);
  fx(s, { k: 'round', from: L.id });
  settleLead(s);
}
// cầm cái mà không còn nước nào được phép (vd. chỉ còn heo, bị cấm về heo) → kẹt: ngồi chờ, chịu bét + thối
function settleLead(s) {
  while (s.phase === 'playing' && !s.table) {
    const L = s.players[s.turn];
    if (legalFor(s, L.id).length) return;
    L.out = true; L.stuck = true;
    log(s, `😵 ${pname(L)} kẹt – chỉ còn ${s.opts.veHeo === 'heoHang' ? 'heo / hàng' : 'heo'} mà luật cấm về bằng nó → chịu bét, bị thối!`);
    fx(s, { k: 'stuck', from: L.id });
    if (activeIdx(s).length <= 1) { finishGame(s); return; }
    const nx = nextActive(s, s.turn);
    s.turn = nx; s.leader = nx; s.mustInclude = null;
    log(s, `${pname(s.players[nx])} được đánh tự do.`);
  }
}
// chuyển lượt sau khi người ở vị trí fromIdx vừa đánh / bỏ
function advance(s, fromIdx) {
  const n = s.players.length, owner = s.players.findIndex(p => p.id === s.table.pid);
  for (let k = 1; k <= n; k++) {
    const j = (fromIdx + k) % n;
    if (j === owner) break;
    const p = s.players[j];
    if (!p.out && !p.passed) { s.turn = j; return; }
  }
  newRound(s, owner);
}

function finishGame(s) {
  // ai còn lại cuối cùng → bét (trước những người bị cóng)
  const rest = s.players.filter(p => !p.out);
  const cong = s.players.filter(p => p.cong);
  const stuck = s.players.filter(p => p.stuck && !p.cong);
  s.places = [...s.finished, ...rest.map(p => p.id), ...stuck.map(p => p.id), ...cong.map(p => p.id)];
  s.players.forEach(p => { p.place = s.places.indexOf(p.id) + 1; });
  const n = s.players.length, win = s.places[0];
  for (const [a, b, u] of PLACE_PAY[n]) pay(s, s.places[a], s.places[b], u, 'place', `Hạng ${a + 1} trả hạng ${b + 1}`);
  // thối heo / thối hàng: ai còn bài trên tay lúc hết ván
  for (const p of s.players) {
    if (!p.hand.length) continue;
    const t = thoiValue(p.hand, s.opts.thoiHang);
    if (t.heo) { pay(s, p.id, win, t.heo, 'thoi', 'Thối heo'); log(s, `🐷💨 ${pname(p)} thối heo!`); }
    if (t.hang) { pay(s, p.id, win, t.hang, 'thoi', 'Thối hàng'); log(s, `💣 ${pname(p)} thối hàng!`); }
    if (p.cong) pay(s, p.id, win, PAY.cong, 'cong', 'Bị cóng');
  }
  s.phase = 'ended'; s.winner = win; s.table = s.table || null;
  log(s, `🏁 Hết ván! ${s.places.map((id, i) => `${i + 1}. ${pname(getPlayer(s, id))}`).join(' · ')}`);
  fx(s, { k: 'end', from: win });
}

export function applyAction(s, pid, a) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const idx = s.players.findIndex(p => p.id === pid), p = s.players[idx];
  if (!p) return { ok: false, reason: 'Không có người chơi này.' };
  if (idx !== s.turn) return { ok: false, reason: 'Chưa tới lượt bạn 😤' };
  if (!a || typeof a !== 'object') return { ok: false, reason: 'Hành động lạ.' };
  if (a.type === 'pass') {
    if (!s.table) return { ok: false, reason: 'Bạn đang cầm cái – phải đánh, không được bỏ.' };
    p.passed = true; s.moves++;
    log(s, `${pname(p)} bỏ lượt.`);
    fx(s, { k: 'pass', from: p.id });
    advance(s, idx);
    if (s.phase === 'playing') log(s, `Lượt của ${pname(current(s))}.`);
    return { ok: true };
  }
  if (a.type !== 'play') return { ok: false, reason: 'Hành động lạ.' };
  const ids = Array.isArray(a.cards) ? a.cards.map(Number) : [];
  if (!ids.length || ids.some(c => !p.hand.includes(c))) return { ok: false, reason: 'Lá này không có trong tay bạn.' };
  const c = classify(ids);
  if (!c) return { ok: false, reason: ids.length >= 3 && ids.some(x => rankOf(x) === HEO) && ids.some(x => rankOf(x) !== HEO) ? 'Sảnh / đôi thông không được có heo (2).' : 'Mấy lá này không thành bộ nào hết.' };
  if (s.mustInclude != null && !ids.includes(s.mustInclude)) return { ok: false, reason: `Nước đầu tiên phải có ${cardName(s.mustInclude)}.` };
  const bf = badFinish(p.hand, ids, s.opts.veHeo); if (bf) return { ok: false, reason: bf };
  const t = s.table;
  if (t && !beats(c, t.combo)) return { ok: false, reason: t.combo.type === c.type && t.combo.len === c.len ? 'Bài nhỏ hơn bài trên bàn rồi 😅' : `Phải đánh ${comboKind(t.combo)} lớn hơn (hoặc hàng chặt được).` };
  // chặt?
  let chain = 0, chopFx = null;
  if (t && isChop(c, t.combo)) {
    const base = comboValue(t.combo, t.cards);
    const units = (s.opts.chatChong ? (t.chain || 0) : 0) + base;
    const victim = getPlayer(s, t.pid);
    pay(s, t.pid, p.id, units, 'chop', `${comboName(c)} chặt ${comboName(t.combo)}`);
    chain = units; s.chopCount++;
    log(s, `🔪 ${pname(p)} CHẶT ${comboName(t.combo)} của ${pname(victim)}! (${units * s.opts.bet} chip)`);
    chopFx = { k: 'chop', from: p.id, to: t.pid, n: units * s.opts.bet, what: comboName(t.combo), by: comboName(c), stacked: !!t.chain && s.opts.chatChong, heo: isHeoCombo(t.combo) };
  }
  p.hand = p.hand.filter(x => !ids.includes(x));
  p.played = true; s.mustInclude = null; s.moves++;
  const sorted = [...ids].sort((x, y) => x - y);
  s.gone.push(...sorted);
  s.table = { pid: p.id, cards: sorted, combo: c, chain };
  s.trick.push({ pid: p.id, cards: sorted, combo: c });
  if (s.trick.length > 6) s.trick.splice(0, s.trick.length - 6);
  if (!chain) log(s, `${pname(p)} đánh ${comboName(c)}${p.hand.length && p.hand.length <= 2 ? ` – còn ${p.hand.length} lá!` : ''}.`);
  fx(s, { k: 'play', from: p.id, cards: sorted });
  if (chopFx) fx(s, chopFx);
  if (!p.hand.length) {
    p.out = true; s.finished.push(p.id);
    const place = s.finished.length;
    log(s, place === 1 ? `🥇 ${pname(p)} về nhất!` : `${['', '🥇', '🥈', '🥉'][place] || '✅'} ${pname(p)} về ${['', 'nhất', 'nhì', 'ba'][place]}.`);
    fx(s, { k: 'finish', from: p.id, n: place });
    if (place === 1) { // cóng: người chưa đánh được lá nào khi đã có người về nhất
      for (const q of s.players) if (!q.out && !q.played) {
        q.out = true; q.cong = true;
        log(s, `🥶 ${pname(q)} bị CÓNG – chưa đánh được lá nào!`);
        fx(s, { k: 'cong', from: q.id, to: p.id });
      }
    }
    if (activeIdx(s).length <= 1) { finishGame(s); return { ok: true }; }
  }
  advance(s, idx);
  if (s.phase === 'playing') log(s, `Lượt của ${pname(current(s))}.`);
  return { ok: true };
}
export function comboKind(c) { return { single: 'lá lẻ', pair: 'đôi', triple: 'sám', quad: 'tứ quý', straight: `sảnh ${c.len} lá`, pairs: `${c.len} đôi thông` }[c.type]; }

// ẩn bài người khác (hết ván thì lật hết)
export function viewFor(s, pid) {
  const v = JSON.parse(JSON.stringify(s));
  for (const p of v.players) { p.handCount = p.hand.length; if (p.id !== pid && s.phase !== 'ended') p.hand = []; }
  v.gone = undefined;
  v.me = pid;
  return v;
}
