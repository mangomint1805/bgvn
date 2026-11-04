// Đua Lạc Đà – logic thuần (JSON-serializable), không đụng tới giao diện.
// Đường đua 16 ô (1..16), vượt qua ô 16 là về đích (vị trí 17..19).
// board[p] = mảng lạc đà ở ô p, từ DƯỚI lên TRÊN. Lạc đà đi thì cõng cả đám bên trên nó.
export const RACERS = ['do', 'vang', 'lam', 'luc', 'tim'];
export const CRAZY = ['den', 'trang'];
export const TRACK = 16;
export const LEG_ROLLS = 5;            // mỗi chặng lắc 5 viên là hết chặng
export const TICKETS = [5, 3, 2, 2];   // vé chặng mỗi màu: lấy từ trên xuống
export const OVERALL_PAY = [8, 5, 3, 2, 1];
export const START_COINS = 3;
export const MIN_PLAYERS = 2, MAX_PLAYERS = 8;
export const CAMEL = {
  do: { name: 'Đỏ Lửa', short: 'Đỏ', color: '#ff4d4d', dark: '#b3202a' },
  vang: { name: 'Vàng Chanh', short: 'Vàng', color: '#ffc928', dark: '#b88400' },
  lam: { name: 'Xanh Biển', short: 'Lam', color: '#3d8bff', dark: '#1d4fb0' },
  luc: { name: 'Lục Bảo', short: 'Lục', color: '#2fbf71', dark: '#16794a' },
  tim: { name: 'Tím Mộng Mơ', short: 'Tím', color: '#a86bff', dark: '#6234b8' },
  den: { name: 'Đen Xỉn', short: 'Đen', color: '#33313d', dark: '#111018', crazy: true },
  trang: { name: 'Trắng Xỉn', short: 'Trắng', color: '#f4f2ee', dark: '#8d8a84', crazy: true },
};
export const DEFAULT_OPTS = { crazy: true };

let rnd = Math.random;
export function setRandom(f) { rnd = f || Math.random; }
const ri = n => Math.floor(rnd() * n);
const nm = c => CAMEL[c].short;

// ---------------- di chuyển (dùng chung cho engine + bot mô phỏng) ----------------
export function findCamel(board, c) {
  for (let p = 1; p < board.length; p++) { const i = board[p].indexOf(c); if (i >= 0) return [p, i]; }
  return [0, -1];
}
// Lạc đà `camel` đi `steps` ô theo hướng dir (+1 tiến, −1 lùi – lạc đà xỉn). Trả sự kiện di chuyển.
export function moveOn(board, tiles, camel, steps, dir) {
  const [p, i] = findCamel(board, camel);
  const unit = board[p].splice(i);
  let land = p + dir * steps; if (land < 1) land = 1; // lạc đà xỉn lùi tới ô 1 thì dừng
  const tile = tiles.find(t => t.pos === land) || null;
  let to = land, under = false;
  if (tile) { to = land + dir * tile.side; under = tile.side < 0; if (to < 1) to = 1; }
  if (under) board[to].unshift(...unit); else board[to].push(...unit);
  return { camel, unit, from: p, land, to, dir, steps, under, tile: tile ? { pos: tile.pos, side: tile.side, owner: tile.owner } : null };
}
// Viên xúc xắc xám: ra màu nào thì lạc đà xỉn đó lùi – trừ 2 trường hợp đặc biệt
export function crazyToMove(board, rolled) {
  const [pb, ib] = findCamel(board, 'den'), [pw, iw] = findCamel(board, 'trang');
  const carries = (p, i) => board[p].slice(i + 1).some(c => RACERS.includes(c));
  const cb = carries(pb, ib), cw = carries(pw, iw);
  if (cb && !cw) return 'den';       // chỉ 1 con đang cõng lạc đà đua → con đó đi
  if (cw && !cb) return 'trang';
  if (pb === pw && Math.abs(ib - iw) === 1) return ib > iw ? 'den' : 'trang'; // con này cưỡi ngay trên con kia → con trên đi
  return rolled;
}
// Thứ hạng lạc đà đua: xa nhất trước, cùng ô thì con trên cùng trước. (bỏ qua lạc đà xỉn)
export function ranking(board) {
  const out = [];
  for (let p = board.length - 1; p >= 1; p--) for (let i = board[p].length - 1; i >= 0; i--) if (RACERS.includes(board[p][i])) out.push(board[p][i]);
  return out;
}
export const finished = board => board.some((s, p) => p > TRACK && s.some(c => RACERS.includes(c)));
export const emptyBoard = () => Array.from({ length: TRACK + 4 }, () => []);
export const allDice = crazy => crazy ? [...RACERS, 'xam'] : [...RACERS];
// Lắc 1 viên (dùng chung). Trả { die, value, color?, camel, mv }
export function rollDie(board, tiles, die, r = ri) {
  if (die === 'xam') {
    const f = r(6), color = f < 3 ? 'den' : 'trang', value = (f % 3) + 1, camel = crazyToMove(board, color);
    return { die, value, color, camel, mv: moveOn(board, tiles, camel, value, -1) };
  }
  const value = r(3) + 1;
  return { die, value, camel: die, mv: moveOn(board, tiles, die, value, 1) };
}
// Ô đặt thảm hợp lệ: ô 2..16, không có lạc đà, không trùng/kề thảm khác (thảm của chính mình được dời)
export function legalTiles(st, pid) {
  const others = st.tiles.filter(t => t.owner !== pid), out = [];
  for (let p = 2; p <= TRACK; p++) {
    if (st.board[p].length) continue;
    if (others.some(t => Math.abs(t.pos - p) <= 1)) continue;
    out.push(p);
  }
  return out;
}

// ---------------- tạo ván ----------------
export function createGame(players, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  const st = {
    v: 1, phase: 'playing', opts: o, leg: 1, turn: 0, seq: 0,
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, coins: START_COINS, legTix: [], used: [], rolls: 0 })),
    board: emptyBoard(), tiles: [], pyramid: allDice(o.crazy), rolled: [],
    tickets: Object.fromEntries(RACERS.map(c => [c, [...TICKETS]])),
    winBets: [], loseBets: [], log: [], fx: [], fxN: 0, legs: [], result: null,
  };
  // xếp lạc đà ban đầu: lắc từng viên, đứng ở ô 1–3 (ra sau thì đứng trên)
  const order = [...RACERS].sort(() => rnd() - 0.5);
  for (const c of order) st.board[ri(3) + 1].push(c);
  if (o.crazy) for (const c of [...CRAZY].sort(() => rnd() - 0.5)) st.board[TRACK + 1 - (ri(3) + 1)].push(c);
  st.turn = ri(st.players.length);
  log(st, `🏜️ Cuộc đua bắt đầu! ${st.players[st.turn].name} đi trước.`);
  fx(st, { k: 'start' });
  return st;
}
function log(st, m) { st.log.push(m); if (st.log.length > 80) st.log.splice(0, st.log.length - 80); }
function fx(st, e) { e.id = ++st.fxN; st.fx.push(e); if (st.fx.length > 30) st.fx.splice(0, st.fx.length - 30); }
export const current = st => st.players[st.turn];
const pl = (st, id) => st.players.find(p => p.id === id);
const addCoins = (p, n) => { p.coins = Math.max(0, p.coins + n); };

// ---------------- hành động ----------------
// a: {type:'leg', camel} | {type:'tile', pos, side} | {type:'roll'} | {type:'overall', kind:'win'|'lose', camel}
export function applyAction(st, pid, a) {
  if (!st || st.phase !== 'playing') return { ok: false, reason: 'Cuộc đua đã kết thúc.' };
  const p = current(st);
  if (!p || p.id !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (!a || typeof a !== 'object') return { ok: false, reason: 'Hành động lạ.' };
  if (a.type === 'leg') {
    if (!RACERS.includes(a.camel)) return { ok: false, reason: 'Màu lạc đà không hợp lệ.' };
    const stack = st.tickets[a.camel];
    if (!stack.length) return { ok: false, reason: `Hết vé ${nm(a.camel)} rồi.` };
    const value = stack.shift();
    p.legTix.push({ camel: a.camel, value });
    log(st, `🎫 ${p.name} lấy vé ${nm(a.camel)} (${value} xu nếu về nhất).`);
    fx(st, { k: 'ticket', pid, camel: a.camel, value });
  } else if (a.type === 'tile') {
    const pos = +a.pos, side = +a.side;
    if (side !== 1 && side !== -1) return { ok: false, reason: 'Chọn Ốc đảo hoặc Ảo ảnh.' };
    if (!legalTiles(st, pid).includes(pos)) return { ok: false, reason: 'Không đặt thảm ở ô này được (ô trống, không sát thảm khác, không phải ô 1).' };
    const old = st.tiles.find(t => t.owner === pid);
    st.tiles = st.tiles.filter(t => t.owner !== pid);
    st.tiles.push({ pos, side, owner: pid });
    log(st, `${side > 0 ? '🌴' : '🌫️'} ${p.name} ${old ? 'dời' : 'đặt'} ${side > 0 ? 'Ốc đảo (+1)' : 'Ảo ảnh (−1)'} ở ô ${pos}.`);
    fx(st, { k: 'tile', pid, pos, side, from: old ? old.pos : 0 });
  } else if (a.type === 'roll') {
    if (!st.pyramid.length) return { ok: false, reason: 'Kim tự tháp hết xúc xắc.' };
    const die = st.pyramid.splice(ri(st.pyramid.length), 1)[0];
    const r = rollDie(st.board, st.tiles, die);
    st.rolled.push({ die, value: r.value, color: r.color || null, camel: r.camel });
    addCoins(p, 1); p.rolls++;
    if (r.mv.tile) { const o = pl(st, r.mv.tile.owner); if (o) addCoins(o, 1); }
    const who = r.mv.unit.length > 1 ? ` (cõng ${r.mv.unit.length - 1} đứa)` : '';
    const dieTxt = die === 'xam' ? `xám ra ${r.value} ${nm(r.color)}` : `${nm(die)} ra ${r.value}`;
    log(st, `🎲 ${p.name} lắc: ${dieTxt} → ${CAMEL[r.camel].name} ${r.mv.dir > 0 ? 'tiến' : 'lùi'} tới ô ${Math.min(r.mv.to, TRACK + 1) > TRACK ? 'ĐÍCH' : r.mv.to}${who}.` +
      (r.mv.tile ? ` Dính ${r.mv.tile.side > 0 ? 'Ốc đảo' : 'Ảo ảnh'} của ${pl(st, r.mv.tile.owner)?.name || '?'} (+1 xu cho chủ thảm).` : ''));
    fx(st, { k: 'roll', pid, die, value: r.value, color: r.color || null, camel: r.camel, mv: r.mv });
    if (finished(st.board)) { endRace(st); return { ok: true }; }
    if (st.rolled.length >= LEG_ROLLS) endLeg(st);
  } else if (a.type === 'overall') {
    if (a.kind !== 'win' && a.kind !== 'lose') return { ok: false, reason: 'Chọn cược Vô địch hoặc Bét bảng.' };
    if (!RACERS.includes(a.camel)) return { ok: false, reason: 'Màu lạc đà không hợp lệ.' };
    if (p.used.includes(a.camel)) return { ok: false, reason: `Bạn đã dùng lá ${nm(a.camel)} rồi.` };
    p.used.push(a.camel);
    (a.kind === 'win' ? st.winBets : st.loseBets).push({ pid, camel: a.camel });
    log(st, `${a.kind === 'win' ? '🏆' : '🐢'} ${p.name} úp 1 lá cược ${a.kind === 'win' ? 'VÔ ĐỊCH' : 'BÉT BẢNG'} (bí mật).`);
    fx(st, { k: 'bet', pid, kind: a.kind });
  } else return { ok: false, reason: 'Hành động lạ.' };
  st.seq++;
  st.turn = (st.turn + 1) % st.players.length;
  return { ok: true };
}

// chấm vé chặng: về nhất = giá vé, về nhì = +1, còn lại −1
function scoreLeg(st) {
  const rank = ranking(st.board), first = rank[0], second = rank[1];
  const rows = st.players.map(p => {
    const items = p.legTix.map(t => ({ ...t, gain: t.camel === first ? t.value : t.camel === second ? 1 : -1 }));
    const net = items.reduce((s, x) => s + x.gain, 0);
    const before = p.coins; addCoins(p, net);
    return { pid: p.id, items, net, coins: p.coins, lost: before + net < 0 ? -(before + net) : 0 };
  });
  return { leg: st.leg, rank, rows, rolled: st.rolled.map(r => ({ ...r })) };
}
function resetLeg(st) {
  for (const p of st.players) p.legTix = [];
  st.tickets = Object.fromEntries(RACERS.map(c => [c, [...TICKETS]]));
  st.tiles = []; st.pyramid = allDice(st.opts.crazy); st.rolled = [];
}
function endLeg(st) {
  const sum = scoreLeg(st);
  st.legs.push({ leg: sum.leg, rank: sum.rank, net: Object.fromEntries(sum.rows.map(r => [r.pid, r.net])) });
  log(st, `🏁 Hết chặng ${st.leg}! ${CAMEL[sum.rank[0]].name} dẫn đầu, ${CAMEL[sum.rank[1]].name} bám đuôi.`);
  fx(st, { k: 'leg', sum });
  resetLeg(st); st.leg++;
}
function endRace(st) {
  const leg = scoreLeg(st);
  st.legs.push({ leg: leg.leg, rank: leg.rank, net: Object.fromEntries(leg.rows.map(r => [r.pid, r.net])) });
  const rank = leg.rank, win = rank[0], lose = rank[rank.length - 1];
  const pay = (bets, target) => { let k = 0; return bets.map(b => { const ok = b.camel === target; const gain = ok ? (OVERALL_PAY[k++] ?? 1) : -1; addCoins(pl(st, b.pid), gain); return { ...b, ok, gain }; }); };
  const winBets = pay(st.winBets, win), loseBets = pay(st.loseBets, lose);
  const top = Math.max(...st.players.map(p => p.coins));
  const winners = st.players.filter(p => p.coins === top).map(p => p.id);
  st.result = { leg, rank, win, lose, winBets, loseBets, winners, coins: Object.fromEntries(st.players.map(p => [p.id, p.coins])) };
  st.phase = 'ended';
  log(st, `🏆 ${CAMEL[win].name} về đích đầu tiên! ${CAMEL[lose].name} về bét. Người thắng: ${winners.map(id => pl(st, id).name).join(', ')} (${top} xu).`);
  fx(st, { k: 'end' });
  st.seq++;
}

// ---------------- góc nhìn từng người (ẩn lá cược chung cuộc của người khác) ----------------
export function viewFor(st, pid) {
  const v = JSON.parse(JSON.stringify(st));
  v.me = pid;
  if (st.phase !== 'ended') {
    v.winBets = st.winBets.map(b => ({ pid: b.pid, camel: b.pid === pid ? b.camel : null }));
    v.loseBets = st.loseBets.map(b => ({ pid: b.pid, camel: b.pid === pid ? b.camel : null }));
    for (const p of v.players) if (p.id !== pid) { p.usedN = p.used.length; p.used = null; }
  }
  v.log = st.log.slice(-40);
  return v;
}
