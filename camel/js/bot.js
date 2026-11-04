// Bot Đua Lạc Đà: mô phỏng Monte Carlo các viên còn trong kim tự tháp để ước lượng
// cơ hội về nhất/nhì chặng, rồi chọn hành động có kỳ vọng xu cao nhất. Chỉ dùng thông tin công khai (viewFor).
import { RACERS, TRACK, LEG_ROLLS, OVERALL_PAY, rollDie, ranking, finished, legalTiles, allDice, viewFor, findCamel } from './engine.js?v=1';

const cloneB = b => b.map(s => s.slice());
const rr = n => Math.floor(Math.random() * n);

// Mô phỏng phần còn lại của chặng N lần. Trả xác suất về nhất/nhì mỗi màu + số lần lạc đà dừng trên mỗi ô.
export function simLeg(v, N = 600, extraTile = null) {
  const first = {}, second = {}, landN = {};
  for (const c of RACERS) { first[c] = 0; second[c] = 0; }
  const tiles = extraTile ? [...v.tiles.filter(t => t.owner !== extraTile.owner), extraTile] : v.tiles;
  const left = LEG_ROLLS - v.rolled.length;
  for (let n = 0; n < N; n++) {
    const b = cloneB(v.board), pyr = v.pyramid.slice();
    for (let k = 0; k < left && pyr.length; k++) {
      const die = pyr.splice(rr(pyr.length), 1)[0];
      const r = rollDie(b, tiles, die, rr);
      if (r.mv.tile) landN[r.mv.tile.pos] = (landN[r.mv.tile.pos] || 0) + 1;
      if (finished(b)) break;
    }
    const rk = ranking(b); first[rk[0]]++; second[rk[1]]++;
  }
  for (const c of RACERS) { first[c] /= N; second[c] /= N; }
  for (const k in landN) landN[k] /= N;
  return { first, second, landN };
}
// Mô phỏng tới hết cuộc đua: xác suất mỗi màu về nhất / về bét chung cuộc
export function simRace(v, N = 250) {
  const win = {}, lose = {};
  for (const c of RACERS) { win[c] = 0; lose[c] = 0; }
  for (let n = 0; n < N; n++) {
    const b = cloneB(v.board); let pyr = v.pyramid.slice(), tiles = v.tiles, rolled = v.rolled.length;
    for (let g = 0; g < 80 && !finished(b); g++) {
      if (rolled >= LEG_ROLLS || !pyr.length) { pyr = allDice(v.opts.crazy); rolled = 0; tiles = []; }
      const die = pyr.splice(rr(pyr.length), 1)[0];
      rollDie(b, tiles, die, rr); rolled++;
    }
    const rk = ranking(b); win[rk[0]]++; lose[rk[rk.length - 1]]++;
  }
  for (const c of RACERS) { win[c] /= N; lose[c] /= N; }
  return { win, lose };
}
const ticketEV = (val, p1, p2) => val * p1 + p2 - (1 - p1 - p2);
// EV của các vé mình đang giữ dưới 1 kết quả mô phỏng
const heldEV = (me, sim) => me.legTix.reduce((s, t) => s + ticketEV(t.value, sim.first[t.camel], sim.second[t.camel]), 0);

// Đánh giá mọi lựa chọn. opts.fast: ít mẫu hơn (dùng khi sim hàng trăm ván)
export function evaluate(v, pid, opts = {}) {
  const fast = !!opts.fast, me = v.players.find(p => p.id === pid);
  const base = simLeg(v, fast ? 220 : 700);
  const opt = [];
  // 1) lắc xúc xắc: chắc chắn +1 xu
  opt.push({ ev: 1, a: { type: 'roll' }, why: 'lắc lấy 1 xu' });
  // 2) vé chặng
  for (const c of RACERS) {
    const top = v.tickets[c][0]; if (!top) continue;
    opt.push({ ev: ticketEV(top, base.first[c], base.second[c]), a: { type: 'leg', camel: c }, why: `vé ${c}` });
  }
  // 3) thảm sa mạc: chỉ cân nhắc khi chưa đặt thảm chặng này và chặng còn dài
  const left = LEG_ROLLS - v.rolled.length;
  if (left >= 2 && !v.tiles.some(t => t.owner === pid)) {
    const legal = legalTiles(v, pid);
    // ứng viên: các ô 1–3 bước trước mỗi chồng lạc đà đua (và 1–3 bước sau lạc đà xỉn)
    const cand = new Set();
    for (const c of RACERS) { const [p] = findCamel(v.board, c); for (let d = 1; d <= 3; d++) cand.add(p + d); }
    const list = legal.filter(p => cand.has(p)).slice(0, fast ? 4 : 8);
    const heldBase = heldEV(me, base);
    for (const pos of list) for (const side of [1, -1]) {
      const s = simLeg(v, fast ? 90 : 220, { pos, side, owner: pid });
      const ev = (s.landN[pos] || 0) + heldEV(me, s) - heldBase;
      opt.push({ ev, a: { type: 'tile', pos, side }, why: 'thảm' });
    }
  }
  // 4) cược chung cuộc: khi cuộc đua đã qua nửa đường
  const lead = Math.max(...RACERS.map(c => findCamel(v.board, c)[0]));
  if (lead >= 9 || v.leg >= 4) {
    const race = simRace(v, fast ? 120 : 320);
    const mine = me.used || [];
    for (const c of RACERS) {
      if (mine.includes(c)) continue;
      const payW = OVERALL_PAY[v.winBets.length] ?? 1, payL = OVERALL_PAY[v.loseBets.length] ?? 1;
      opt.push({ ev: race.win[c] * payW - (1 - race.win[c]), a: { type: 'overall', kind: 'win', camel: c }, why: 'cược vô địch' });
      opt.push({ ev: race.lose[c] * payL - (1 - race.lose[c]), a: { type: 'overall', kind: 'lose', camel: c }, why: 'cược bét' });
    }
  }
  return { opt, base };
}

export function botAction(state, pid, opts = {}) {
  if (!state || state.phase !== 'playing' || state.players[state.turn].id !== pid) return null;
  const v = viewFor(state, pid); // bot chỉ được thấy như người thường
  const { opt } = evaluate(v, pid, opts);
  // nhiễu nhẹ cho đỡ máy móc; ưu tiên lắc khi ngang ngửa
  let best = null;
  for (const o of opt) { const s = o.ev + (Math.random() - 0.5) * 0.25 + (o.a.type === 'roll' ? 0.15 : 0); if (!best || s > best.s) best = { s, o }; }
  return best ? best.o.a : { type: 'roll' };
}
// Gợi ý % cho người chơi (giao diện): xác suất về nhất chặng của mỗi màu
export function legOdds(v, N = 500) { return simLeg(v, N); }
export { TRACK };
