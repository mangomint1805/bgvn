// Cờ cá ngựa – luật chơi (state machine thuần, JSON-serializable, không đụng giao diện).
// Đường đua 56 ô (14 ô mỗi cạnh) đi theo chiều kim đồng hồ, mỗi người 4 ngựa, đích 6 bậc.
// Vị trí 1 con ngựa (tiến độ riêng của người đó):
//   -1        : trong chuồng
//   0..55     : trên đường đua (0 = ô xuất quân, 55 = ô cửa đích – ô ngay trước ô xuất quân)
//   56..61    : trên đích, bậc 1..6 (56 = bậc 1, 61 = bậc 6)
// Ô tuyệt đối trên đường đua = (ghế × 14 + tiến độ) mod 56.

export const TRACK = 56, SIDE = 14, GATE = 55, HOME0 = 56, TOP = 61, HORSES = 4;
export const COLORS = ['#e53935', '#1e88e5', '#2fb350', '#f4b400'];
export const COLOR_NAMES = ['Đỏ', 'Xanh dương', 'Xanh lá', 'Vàng'];
// dice: 2 (mặc định, luật nhà anh Minto) | 1 · moveMode: 'total' (dồn tổng 1 con) | 'split' (tách 2 xúc xắc)
// exit2: 'd16' (đôi hoặc 1+6) | 'any6' (đôi hoặc có 1 con 6) · exit1 (1 xúc xắc): '6' | '16'
// homeRule: 'vn' (lên bậc n phải đổ đúng n) | 'count' (đi đúng số bước) · winRule: 'top4' (chiếm bậc 3-4-5-6) | 'home' (cả 4 vào đích)
export const DEFAULTS = { dice: 2, moveMode: 'total', exit2: 'd16', exit1: '6', noJump: true, homeRule: 'vn', winRule: 'top4', triple: false, playOn: false, turnTime: 0, botLevel: 'normal' };

let rand = Math.random;
export function setRandom(f) { rand = f || Math.random; }
const d6 = () => 1 + Math.floor(rand() * 6);

export const absSq = (seat, p) => (seat * SIDE + p) % TRACK;
export const P = (s, id) => s.players.find(p => p.id === id);
export const current = s => s.players[s.turn];
export const actorOf = s => s.phase === 'playing' ? current(s).id : null;
export const onTrack = pos => pos >= 0 && pos <= GATE;
export const inHome = pos => pos >= HOME0;
export const step = pos => pos - GATE; // bậc 1..6 khi inHome
function log(s, text) { s.log.push(text); if (s.log.length > 80) s.log.splice(0, s.log.length - 80); }
function ev(s, e) { s.ev.push({ n: ++s.evn, ...e }); if (s.ev.length > 80) s.ev.splice(0, s.ev.length - 80); }

export function seatsFor(n) { return n <= 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3]; }

export function createGame(players, opts = {}) {
  const o = { ...DEFAULTS, ...opts }; o.dice = +o.dice === 1 ? 1 : 2;
  const seats = seatsFor(players.length);
  const s = {
    v: 1, phase: 'playing', opts: o, round: 1, turn: 0, stage: 'roll',
    players: players.map((p, i) => { const seat = p.seat != null ? p.seat : seats[i]; return { id: p.id, name: p.name, isBot: !!p.isBot, seat, color: COLORS[seat], horses: [-1, -1, -1, -1], done: false, kicks: 0, kicked: 0 }; }),
    dice: [], left: [], full: false, moves: [], streak: 0, ev: [], evn: 0, log: [], winner: null, ranks: [],
  };
  log(s, '🐴 Bắt đầu ván! ' + (o.dice === 2 ? 'Đổ đôi hoặc 1+6 để xuất chuồng.' : 'Đổ 6 để xuất chuồng.'));
  ev(s, { t: 'turn', pid: s.players[0].id });
  return s;
}

// ngựa nào đang đứng ở ô tuyệt đối sq (chỉ tính đường đua)
export function occupant(s, sq) {
  for (const p of s.players) for (let h = 0; h < HORSES; h++) { const pos = p.horses[h]; if (onTrack(pos) && absSq(p.seat, pos) === sq) return { pid: p.id, h }; }
  return null;
}
const homeOcc = (p, k) => p.horses.includes(GATE + k);

// có được xuất chuồng với lần đổ này không
export function exitOk(s, dice) {
  const o = s.opts;
  if (o.dice === 1) return dice[0] === 6 || (o.exit1 === '16' && dice[0] === 1);
  const [a, b] = dice; if (a === b) return true;
  return o.exit2 === 'any6' ? (a === 6 || b === 6) : (a + b === 7 && (a === 6 || a === 1));
}
// lần đổ có được đổ thêm không (luôn trùng với điều kiện xuất chuồng)
export const bonusOk = (s, dice) => exitOk(s, dice);

// nước đi của 1 con ngựa với 1 giá trị v. Trả null nếu không đi được.
function horseMove(s, p, h, v) {
  const o = s.opts, pos = p.horses[h];
  if (pos < 0) return null;
  if (inHome(pos)) {
    const k = step(pos); if (k >= 6) return null;
    if (o.homeRule === 'vn') { if (v !== k + 1 || homeOcc(p, k + 1)) return null; return { h, v, kind: 'home', from: pos, to: pos + 1, path: [pos + 1] }; }
    const to = pos + v; if (to > TOP) return null;
    const path = []; for (let q = pos + 1; q <= to; q++) { if (p.horses.includes(q)) return null; path.push(q); }
    return { h, v, kind: 'home', from: pos, to, path };
  }
  if (o.homeRule === 'vn' && pos === GATE) { // đứng ở cửa đích: đổ n lên thẳng bậc n (không vượt ngựa trên đích)
    if (v > 6) return null;
    for (let k = 1; k <= v; k++) if (homeOcc(p, k)) return null;
    return { h, v, kind: 'home', from: pos, to: GATE + v, path: Array.from({ length: v }, (_, i) => GATE + 1 + i) };
  }
  const to = pos + v, max = o.homeRule === 'vn' ? GATE : TOP; if (to > max) return null;
  const path = []; let kick = null;
  for (let q = pos + 1; q <= to; q++) {
    path.push(q);
    if (q <= GATE) {
      const occ = occupant(s, absSq(p.seat, q));
      if (q === to) { if (occ) { if (occ.pid === p.id) return null; kick = occ; } }
      else if (occ && o.noJump) return null; // "không được nhảy qua đầu"
    } else if (p.horses.includes(q)) return null; // không vượt / chồng ngựa trên đích
  }
  return { h, v, kind: to > GATE ? 'home' : 'track', from: pos, to, path, kick };
}
// ngựa đang "trên đích" theo nghĩa dùng giá trị lên bậc (trên đích, hoặc đứng ở cửa đích với luật vn)
const homeish = (s, pos) => inHome(pos) || (s.opts.homeRule === 'vn' && pos === GATE);

// mọi nước đi hợp lệ với các giá trị còn lại (s.left) của lần đổ hiện tại
export function legalMoves(s, pid = actorOf(s)) {
  const p = P(s, pid); if (!p || s.phase !== 'playing' || !s.left.length) return [];
  const o = s.opts, L = s.left, out = [], seen = new Set();
  const add = m => { if (!m) return; const k = m.kind === 'out' ? 'out' : m.h + ':' + m.to; if (seen.has(k)) return; seen.add(k); out.push(m); };
  // xuất chuồng: chỉ khi chưa dùng xúc xắc nào của lần đổ này
  if (s.full && exitOk(s, s.dice)) {
    const h = p.horses.indexOf(-1);
    if (h >= 0) { const occ = occupant(s, absSq(p.seat, 0)); if (!occ || occ.pid !== pid) add({ h, kind: 'out', from: -1, to: 0, path: [0], kick: occ, v: 0, all: true }); }
  }
  let trackVals, homeVals;
  if (o.dice === 1) trackVals = homeVals = [L[0]];
  else if (o.moveMode === 'split') trackVals = homeVals = [...new Set(L)];
  else { const [a, b] = s.dice, T = a + b; trackVals = [T]; homeVals = [...new Set([a, b, T])]; }
  for (let h = 0; h < HORSES; h++) {
    const pos = p.horses[h];
    for (const v of homeish(s, pos) ? homeVals : trackVals) add(horseMove(s, p, h, v));
    // về đúng ô cửa đích (luật vn) được dùng 1 xúc xắc lẻ – không thì ngựa đứng sát cửa sẽ kẹt mãi vì tổng ≥ 2
    if (o.dice === 2 && o.moveMode !== 'split' && o.homeRule === 'vn' && onTrack(pos) && pos < GATE && GATE - pos <= 6)
      for (const v of new Set(s.dice)) { const m = horseMove(s, p, h, v); if (m && m.to === GATE) add(m); }
  }
  // luật đôi (dồn tổng): tổng không đi được con nào thì được đi 1 con xúc xắc
  if (o.dice === 2 && o.moveMode !== 'split' && s.dice[0] === s.dice[1] && !out.some(m => m.kind !== 'out'))
    for (let h = 0; h < HORSES; h++) if (!homeish(s, p.horses[h])) add(horseMove(s, p, h, s.dice[0]));
  return out;
}

export function finished(s, p) { return p.horses.every(pos => s.opts.winRule === 'home' ? inHome(pos) : pos >= GATE + 3); }
export const progress = p => p.horses.reduce((a, x) => a + (x < 0 ? 0 : x + 1), 0);

// ---------------- hành động ----------------
export function applyAction(s, pid, a) {
  const ok = () => ({ ok: true }), no = reason => ({ ok: false, reason });
  if (!a || s.phase !== 'playing') return no('Ván đã kết thúc.');
  if (actorOf(s) !== pid) return no('Chưa tới lượt bạn.');
  const p = current(s);
  if (a.type === 'roll') {
    if (s.stage !== 'roll') return no('Chọn ngựa để đi đã.');
    s.dice = s.opts.dice === 1 ? [d6()] : [d6(), d6()];
    if (a.force && Array.isArray(a.force)) s.dice = a.force.slice(0, s.opts.dice); // chỉ dùng trong test
    s.left = [...s.dice]; s.full = true;
    const bonus = bonusOk(s, s.dice);
    s.streak = bonus ? s.streak + 1 : 0;
    ev(s, { t: 'roll', pid, d: [...s.dice], bonus });
    if (bonus && s.opts.triple && s.opts.dice === 2 && s.streak >= 3) {
      ev(s, { t: 'triple', pid }); log(s, `😵 ${p.name} đổ thưởng 3 lần liền – mất lượt!`);
      s.streak = 0; s.left = []; nextTurn(s, false); return ok();
    }
    return afterUse(s, p, true);
  }
  if (a.type === 'move') {
    if (s.stage !== 'move') return no('Đổ xúc xắc trước đã.');
    const m = s.moves.find(x => (a.out ? x.kind === 'out' : x.h === a.h && x.kind !== 'out' && (a.to == null || x.to === a.to)));
    if (!m) return no('Ngựa đó không đi được nước này.');
    doMove(s, p, m, false);
    return afterUse(s, p, false);
  }
  return no('Hành động không hợp lệ.');
}
// sau khi đổ / đi: tính nước tiếp theo, tự đi nếu chỉ còn 1 nước, hết nước thì chuyển lượt
function afterUse(s, p, justRolled) {
  for (let guard = 0; guard < 4 && s.phase === 'playing'; guard++) {
    if (p.done) break;
    const ms = legalMoves(s, p.id);
    if (!ms.length) { if (justRolled) { ev(s, { t: 'nomove', pid: p.id }); log(s, `😶 ${p.name} đổ ${s.dice.join('+')} – không đi được con nào.`); } break; }
    if (ms.length === 1) { doMove(s, p, ms[0], true); justRolled = false; continue; }
    s.stage = 'move'; s.moves = ms; return { ok: true };
  }
  if (s.phase === 'playing') nextTurn(s, !p.done && bonusOk(s, s.dice));
  return { ok: true };
}
function doMove(s, p, m, auto) {
  const o = s.opts;
  if (m.kick) kick(s, p, m.kick);
  p.horses[m.h] = m.to;
  if (m.kind === 'out') { ev(s, { t: 'out', pid: p.id, h: m.h, auto }); log(s, `🚪 ${p.name} xuất chuồng 1 con ngựa.`); }
  else { ev(s, { t: 'move', pid: p.id, h: m.h, from: m.from, to: m.to, path: m.path, v: m.v, auto, kick: m.kick || null }); if (m.to >= HOME0 && m.from < HOME0) log(s, `🏁 ${p.name} đưa 1 ngựa lên đích bậc ${step(m.to)}.`); }
  if (m.kick) ev(s, { t: 'kick', pid: p.id, h: m.h, vic: m.kick.pid, vh: m.kick.h, at: absSq(p.seat, m.to) });
  // dùng xúc xắc
  if (m.all || o.dice === 1 || o.moveMode !== 'split') s.left = [];
  else { const i = s.left.indexOf(m.v); if (i >= 0) s.left.splice(i, 1); else s.left = []; }
  s.full = false; s.moves = [];
  if (!p.done && finished(s, p)) {
    p.done = true; s.ranks.push(p.id); ev(s, { t: 'finish', pid: p.id, rank: s.ranks.length });
    log(s, `🏆 ${p.name} về đích ${o.winRule === 'top4' ? '(chiếm bậc 3-4-5-6)' : 'đủ 4 ngựa'} – hạng ${s.ranks.length}!`);
    const left = s.players.filter(x => !x.done);
    if (!o.playOn || left.length <= 1) endGame(s);
  }
}
function kick(s, p, k) {
  const v = P(s, k.pid); v.horses[k.h] = -1; p.kicks++; v.kicked++;
  log(s, `🦶 ${p.name} đá ngựa của ${v.name} về chuồng!`);
}
function endGame(s) {
  const rest = s.players.filter(x => !s.ranks.includes(x.id)).sort((a, b) => progress(b) - progress(a));
  s.ranks.push(...rest.map(x => x.id));
  s.phase = 'over'; s.stage = 'over'; s.winner = s.ranks[0]; s.left = []; s.moves = [];
  ev(s, { t: 'win', pid: s.winner });
}
function nextTurn(s, again) {
  s.moves = []; s.left = []; s.full = false;
  if (s.phase !== 'playing') return;
  if (!again) {
    s.streak = 0;
    let t = s.turn; for (let k = 0; k < s.players.length; k++) { t = (t + 1) % s.players.length; if (!s.players[t].done) break; }
    if (t <= s.turn) s.round++;
    s.turn = t;
  }
  s.stage = 'roll';
  ev(s, { t: 'turn', pid: current(s).id, again });
}

// Không có thông tin ẩn: ai cũng thấy hết
export function viewFor(s) { return JSON.parse(JSON.stringify(s)); }
