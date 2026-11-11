// ♟️ Luật Cờ tướng (thuần logic, không đụng giao diện).
// Bàn 10 hàng × 9 cột: ô = hàng * 9 + cột, hàng 0 ở trên (phe Đen), hàng 9 ở dưới (phe Đỏ). Đỏ đi trước.
// Quân: K Tướng · A Sĩ · E Tượng · R Xe · H Mã · C Pháo · P Tốt – chữ HOA là Đỏ, chữ thường là Đen.
export const ROWS = 10, COLS = 9;
export const START = [
  'rheakaehr', '.........', '.c.....c.', 'p.p.p.p.p', '.........',
  '.........', 'P.P.P.P.P', '.C.....C.', '.........', 'RHEAKAEHR',
].join('').split('').map(c => c === '.' ? '' : c);
export const sideOf = p => !p ? null : (p === p.toUpperCase() ? 'r' : 'b');
export const other = s => s === 'r' ? 'b' : 'r';
const rc = i => [Math.floor(i / 9), i % 9];
const inB = (r, c) => r >= 0 && r < 10 && c >= 0 && c < 9;
const inPalace = (r, c, side) => c >= 3 && c <= 5 && (side === 'r' ? r >= 7 : r <= 2);
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const HORSE = [[-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0], [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]]; // [dr, dc, chân r, chân c]

// nước đi "giả hợp lệ" của quân ở ô i (chưa xét chuyện để Tướng bị chiếu). Tướng "bay" ăn Tướng đối diện cũng tính là 1 nước – để dò chiếu cho gọn.
export function pseudoMoves(b, i, out = []) {
  const p = b[i]; if (!p) return out;
  const side = sideOf(p), t = p.toUpperCase(), [r, c] = rc(i);
  const add = (r2, c2) => { const j = r2 * 9 + c2; if (sideOf(b[j]) !== side) out.push(i * 100 + j); };
  if (t === 'K') {
    for (const [dr, dc] of ORTH) { const r2 = r + dr, c2 = c + dc; if (inB(r2, c2) && inPalace(r2, c2, side)) add(r2, c2); }
    const d = side === 'r' ? -1 : 1; for (let r2 = r + d; r2 >= 0 && r2 < 10; r2 += d) { const q = b[r2 * 9 + c]; if (q) { if (q.toUpperCase() === 'K') out.push(i * 100 + r2 * 9 + c); break; } }
  } else if (t === 'A') { for (const [dr, dc] of DIAG) { const r2 = r + dr, c2 = c + dc; if (inB(r2, c2) && inPalace(r2, c2, side)) add(r2, c2); } }
  else if (t === 'E') { for (const [dr, dc] of DIAG) { const r2 = r + 2 * dr, c2 = c + 2 * dc; if (!inB(r2, c2) || (side === 'r' ? r2 < 5 : r2 > 4) || b[(r + dr) * 9 + c + dc]) continue; add(r2, c2); } }
  else if (t === 'H') { for (const [dr, dc, lr, lc] of HORSE) { const r2 = r + dr, c2 = c + dc; if (!inB(r2, c2) || b[(r + lr) * 9 + c + lc]) continue; add(r2, c2); } }
  else if (t === 'R') { for (const [dr, dc] of ORTH) for (let r2 = r + dr, c2 = c + dc; inB(r2, c2); r2 += dr, c2 += dc) { const q = b[r2 * 9 + c2]; if (!q) out.push(i * 100 + r2 * 9 + c2); else { if (sideOf(q) !== side) out.push(i * 100 + r2 * 9 + c2); break; } } }
  else if (t === 'C') {
    for (const [dr, dc] of ORTH) { let jumped = false; for (let r2 = r + dr, c2 = c + dc; inB(r2, c2); r2 += dr, c2 += dc) { const q = b[r2 * 9 + c2]; if (!jumped) { if (!q) out.push(i * 100 + r2 * 9 + c2); else jumped = true; } else if (q) { if (sideOf(q) !== side) out.push(i * 100 + r2 * 9 + c2); break; } } }
  } else if (t === 'P') {
    const d = side === 'r' ? -1 : 1; if (inB(r + d, c)) add(r + d, c);
    if (side === 'r' ? r <= 4 : r >= 5) { if (c > 0) add(r, c - 1); if (c < 8) add(r, c + 1); }
  }
  return out;
}
export function allPseudo(b, side, out = []) { for (let i = 0; i < 90; i++) if (b[i] && sideOf(b[i]) === side) pseudoMoves(b, i, out); return out; }
export const kingSq = (b, side) => b.indexOf(side === 'r' ? 'K' : 'k');
// phe `side` có đang bị chiếu không
export function inCheck(b, side) { const k = kingSq(b, side); if (k < 0) return true; for (const m of allPseudo(b, other(side))) if (m % 100 === k) return true; return false; }
// nước hợp lệ thật sự: đi xong Tướng mình không bị chiếu (kể cả "lộ mặt Tướng")
export function legalMoves(b, side, from = null) {
  const cand = from == null ? allPseudo(b, side) : (sideOf(b[from]) === side ? pseudoMoves(b, from) : []), out = [];
  for (const m of cand) { const f = Math.floor(m / 100), t = m % 100; if (b[t] && b[t].toUpperCase() === 'K') continue; const cap = b[t]; b[t] = b[f]; b[f] = ''; if (!inCheck(b, side)) out.push(m); b[f] = b[t]; b[t] = cap; }
  return out;
}
export const posKey = (b, turn) => turn + b.map(p => p || '.').join('');

// ---------- ghi nước đi kiểu Việt: "Pháo 2 bình 5", "Mã 8 tấn 7" ----------
export const NAME = { K: 'Tướng', A: 'Sĩ', E: 'Tượng', R: 'Xe', H: 'Mã', C: 'Pháo', P: 'Tốt' };
export function notation(b, from, to) {
  const p = b[from], side = sideOf(p), t = p.toUpperCase(), [r1, c1] = rc(from), [r2, c2] = rc(to);
  const file = c => side === 'r' ? 9 - c : c + 1, fwd = side === 'r' ? r1 - r2 : r2 - r1;
  let who = NAME[t] + ' ' + file(c1);
  const same = []; for (let r = 0; r < 10; r++) if (b[r * 9 + c1] === p) same.push(r);
  if (same.length === 2 && t !== 'A' && t !== 'E') { const front = side === 'r' ? Math.min(...same) : Math.max(...same); who = NAME[t] + (r1 === front ? ' trước' : ' sau'); }
  if (r1 === r2) return `${who} bình ${file(c2)}`;
  const straight = 'KRCP'.includes(t);
  return `${who} ${fwd > 0 ? 'tấn' : 'thoái'} ${straight ? Math.abs(fwd) : file(c2)}`;
}

// ---------- ván chơi ----------
export const DEFAULT_OPTS = { first: 'host', level: 'normal', style: 'han' }; // first: 'host' | 'guest' | 'random' (ai cầm Đỏ đi trước)
export const OPT_CHOICES = { first: ['host', 'guest', 'random'], level: ['easy', 'normal', 'hard'], style: ['han', 'viet'] };
export function createGame(players, opts = {}) {
  if (players.length < 2) throw new Error('Cờ tướng cần đúng 2 người (thêm bot nếu chơi một mình).');
  const o = { ...DEFAULT_OPTS, ...opts }, two = players.slice(0, 2);
  const hostRed = o.first === 'random' ? Math.random() < 0.5 : o.first !== 'guest';
  const ps = two.map((p, i) => ({ id: p.id, name: p.name, isBot: !!p.isBot, level: p.level || o.level, side: (i === 0) === hostRed ? 'r' : 'b' }));
  const setup = Array.isArray(o.setup) && o.setup.length === 90 ? o.setup.slice() : null; // cờ thế: bàn xếp sẵn, Đỏ (chủ phòng) đi trước
  if (setup) { ps[0].side = 'r'; ps[1].side = 'b'; }
  const s = { v: 1, opts: { ...o, setup: undefined }, players: ps, board: setup || START.slice(), turn: 'r', puzzle: o.puzzle || null, phase: 'playing', winner: null, result: null, moves: [], check: false, caps: { r: [], b: [] }, offer: null, undo: null, quiet: 0, seq: 0, gid: Math.random().toString(36).slice(2, 8) };
  s.hist = [{ k: posKey(s.board, s.turn), chk: false }];
  return s;
}
export const pOf = (s, side) => s.players.find(p => p.side === side);
export const actors = s => s.phase === 'playing' ? [pOf(s, s.turn).id] : [];
function end(s, winnerSide, kind) { s.phase = 'ended'; s.winner = winnerSide ? pOf(s, winnerSide).id : null; s.result = { kind, side: winnerSide }; s.offer = null; s.undo = null; s.seq++; }
export function applyAction(s, pid, a) {
  const me = s.players.find(p => p.id === pid); if (!me) return { ok: false, reason: 'Bạn đang xem ván này.' };
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const opp = s.players.find(p => p !== me);
  if (a.type === 'resign') { end(s, opp.side, 'resign'); return { ok: true }; }
  if (a.type === 'draw') { if (s.offer === me.side) return { ok: false, reason: 'Bạn đã cầu hoà rồi, chờ đối thủ trả lời.' }; if (s.offer === opp.side) { end(s, null, 'agree'); return { ok: true }; } s.offer = me.side; s.seq++; return { ok: true }; }
  if (a.type === 'drawNo') { if (s.offer !== opp.side) return { ok: false, reason: 'Không có lời cầu hoà nào.' }; s.offer = null; s.seq++; return { ok: true }; }
  if (a.type === 'undo') { // xin đi lại: với bot thì được luôn, với người thì phải đối thủ đồng ý
    const n = s.turn === me.side ? 2 : 1; if (s.moves.length < n) return { ok: false, reason: 'Chưa có nước nào để đi lại.' };
    if (opp.isBot) { takeBack(s, n); return { ok: true }; }
    if (s.undo) return { ok: false, reason: 'Đang chờ trả lời xin đi lại.' }; s.undo = { by: me.side, n }; s.seq++; return { ok: true };
  }
  if (a.type === 'undoOk' || a.type === 'undoNo') { if (!s.undo || s.undo.by !== opp.side) return { ok: false, reason: 'Không có lời xin đi lại.' }; const n = s.undo.n; s.undo = null; if (a.type === 'undoOk' && s.moves.length >= n) takeBack(s, n); s.seq++; return { ok: true }; }
  if (a.type !== 'move') return { ok: false, reason: 'Hành động lạ.' };
  if (s.turn !== me.side) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const from = a.from | 0, to = a.to | 0;
  if (!(from >= 0 && from < 90 && to >= 0 && to < 90) || !legalMoves(s.board, me.side, from).includes(from * 100 + to)) return { ok: false, reason: inCheck(s.board, me.side) ? 'Đang bị chiếu – phải giải chiếu trước.' : 'Nước đi không hợp lệ.' };
  const b = s.board, piece = b[from], cap = b[to], text = notation(b, from, to);
  b[to] = piece; b[from] = ''; if (cap) { s.caps[me.side].push(cap); s.quiet = 0; } else s.quiet++;
  s.turn = opp.side; s.check = inCheck(b, s.turn); s.offer = null; s.undo = null; s.seq++;
  s.moves.push({ from, to, piece, cap: cap || '', check: s.check, text });
  const key = posKey(b, s.turn); s.hist.push({ k: key, chk: s.check });
  if (!legalMoves(b, s.turn).length) { end(s, me.side, s.check ? 'mate' : 'stale'); return { ok: true }; } // hết nước đi (chiếu bí hoặc vây khốn) là thua
  // lặp lại 3 lần: bên nào chiếu mãi (chiếu dai) thì thua, còn lại là hoà
  const idx = s.hist.map((h, i) => h.k === key ? i : -1).filter(i => i >= 0);
  if (idx.length >= 3) {
    const cyc = s.hist.slice(idx[idx.length - 3] + 1); // các thế cờ trong vòng lặp; chỉ số chẵn/lẻ xen kẽ hai bên
    const byMover = cyc.filter((_, i) => (cyc.length - 1 - i) % 2 === 0), byOther = cyc.filter((_, i) => (cyc.length - 1 - i) % 2 === 1);
    const moverAll = byMover.length > 0 && byMover.every(h => h.chk), otherAll = byOther.length > 0 && byOther.every(h => h.chk);
    if (moverAll && !otherAll) end(s, opp.side, 'perp'); else if (otherAll && !moverAll) end(s, me.side, 'perp'); else end(s, null, 'repeat');
    return { ok: true };
  }
  if (s.quiet >= 120) { end(s, null, 'quiet'); return { ok: true }; } // 60 nước mỗi bên không ăn quân
  return { ok: true };
}
function takeBack(s, n) {
  for (let i = 0; i < n; i++) { const m = s.moves.pop(); if (!m) break; s.board[m.from] = m.piece; s.board[m.to] = m.cap; if (m.cap) s.caps[sideOf(m.piece)].pop(); s.hist.pop(); s.turn = sideOf(m.piece); }
  s.check = inCheck(s.board, s.turn); s.quiet = 0; s.offer = null; s.seq++;
}
export const RESULT_TEXT = { mate: 'Chiếu bí', stale: 'Hết nước đi', resign: 'Đối thủ xin thua', agree: 'Hai bên đồng ý hoà', repeat: 'Lặp lại thế cờ 3 lần', perp: 'Chiếu dai (chiếu lặp lại mãi)', quiet: '60 nước không ăn quân' };
export function viewFor(s, pid) {
  const me = s.players.find(p => p.id === pid);
  return { v: s.v, gid: s.gid, opts: s.opts, players: s.players.map(p => ({ ...p })), board: s.board.slice(), turn: s.turn, phase: s.phase, winner: s.winner, result: s.result, puzzle: s.puzzle, moves: s.moves.slice(-200), nMoves: s.moves.length, check: s.check, caps: { r: s.caps.r.slice(), b: s.caps.b.slice() }, offer: s.offer, undo: s.undo, seq: s.seq, me: pid, mySide: me ? me.side : null };
}
