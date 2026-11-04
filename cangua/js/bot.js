// Bot cờ cá ngựa: ưu tiên đá ngựa, xuất chuồng, lên đích, né chỗ nguy hiểm. 3 mức: easy / normal / hard.
import { P, absSq, onTrack, inHome, GATE, HOME0, TRACK, occupant, exitOk } from './engine.js?v=3';

// xác suất (thô) 1 ô tuyệt đối bị ngựa đối thủ đá ở lượt sau
function threat(s, me, sq, ignore = null) {
  const o = s.opts; let risk = 0;
  const reach = o.dice === 1 ? { 1: 1 / 6, 2: 1 / 6, 3: 1 / 6, 4: 1 / 6, 5: 1 / 6, 6: 1 / 6 }
    : { 2: 1 / 36, 3: 2 / 36, 4: 3 / 36, 5: 4 / 36, 6: 5 / 36, 7: 6 / 36, 8: 5 / 36, 9: 4 / 36, 10: 3 / 36, 11: 2 / 36, 12: 1 / 36 };
  for (const p of s.players) {
    if (p.id === me.id || p.done) continue;
    for (let h = 0; h < 4; h++) {
      const pos = p.horses[h]; if (!onTrack(pos)) continue;
      const a = absSq(p.seat, pos), d = (sq - a + TRACK) % TRACK;
      if (!d || !reach[d] || pos + d > GATE) continue;
      if (o.noJump) { let blocked = false; for (let k = 1; k < d; k++) { const oc = occupant(s, (a + k) % TRACK); if (oc && !(ignore && oc.pid === ignore.pid && oc.h === ignore.h)) { blocked = true; break; } } if (blocked) continue; }
      risk += reach[d] * (o.dice === 2 && d <= 6 ? 1.6 : 1); // đôi mà tổng kẹt thì đi 1 con – tăng nhẹ nguy cơ ô gần
    }
    // ô xuất quân của đối thủ còn ngựa trong chuồng
    if (absSq(p.seat, 0) === sq && p.horses.includes(-1)) risk += o.dice === 1 ? (o.exit1 === '16' ? 1 / 3 : 1 / 6) : (o.exit2 === 'any6' ? 16 / 36 : 8 / 36);
  }
  return Math.min(1, risk);
}

// luật nhà mới: vào chuồng càng sâu càng tốt (ngựa sau không vượt được ngựa trước), lên bậc nhờ đôi rất quý
function thruHome(s, me, m) {
  const b = m.to - GATE, need = s.opts.winRule === 'top4' ? 3 : 1;
  const above = k => me.horses.some(x => x > GATE + k); // đã có ngựa nhà ở trên bậc k
  if (m.from <= GATE) {
    let sc = 18 + b * 7;                     // bậc 6 = 60, bậc 1 = 25
    if (b < need) sc -= 14;                  // dưới bậc 3: còn phải chờ nhiều lần đôi
    if (!above(b) && b < 6) sc -= (6 - b) * 2; // chặn đường vào các bậc trên còn trống
    return sc;
  }
  // lên 1 bậc nhờ đôi
  let sc = 34 + b * 2;
  if (m.from - GATE < need) sc += 10;        // đang dưới bậc 3 → cần lên lắm
  if (!above(b)) sc += 6;                    // con trên cùng lên → mở thêm chỗ bên dưới
  return sc;
}

export function scoreMove(s, pid, m, level = 'normal') {
  const me = P(s, pid), hard = level === 'hard';
  let sc = 0;
  const worth = pos => pos < 0 ? 0 : 10 + pos * 0.9;
  if (m.kick) { const v = P(s, m.kick.pid); sc += 70 + v.horses[m.kick.h] * 1.3; }
  if (m.kind === 'out') sc += 48 - me.horses.filter(x => onTrack(x)).length * 6;
  if (m.kind === 'home' && me && s.opts.homeRule === 'thru') sc += thruHome(s, me, m);
  else if (m.kind === 'home') sc += m.from <= GATE ? 55 : 22 + (m.to - HOME0) * 3;
  sc += (m.to - Math.max(0, m.from)) * 0.6;
  // an toàn: trước / sau
  if (m.kind !== 'home' || m.to <= GATE) {
    const sqTo = absSq(me.seat, m.to), rTo = threat(s, me, sqTo, { pid, h: m.h });
    sc -= rTo * worth(m.to) * (hard ? 1.6 : 1.1);
  }
  if (onTrack(m.from)) { const rFrom = threat(s, me, absSq(me.seat, m.from)); sc += rFrom * worth(m.from) * (hard ? 1.3 : 0.9); }
  else if (inHome(m.from)) sc += 4;
  // gần cửa đích thì nên đưa về
  if (m.to <= GATE && m.to > GATE - 8) sc += 6;
  // đứng chắn ô xuất quân của mình khi còn ngựa trong chuồng thì nên dời đi
  if (m.from === 0 && me.horses.filter(x => x < 0).length) sc += 8;
  return sc;
}

export function botAction(s, pid, level = s.opts.botLevel || 'normal') {
  if (s.phase !== 'playing' || s.players[s.turn].id !== pid) return null;
  if (s.stage === 'roll') return { type: 'roll' };
  if (s.stage !== 'move' || !s.moves.length) return null;
  const ms = s.moves;
  let best = ms[0], bs = -1e9;
  for (const m of ms) {
    let sc = scoreMove(s, pid, m, level);
    if (level === 'easy') sc = sc * 0.4 + Math.random() * 60;
    else if (level === 'normal') sc += Math.random() * 6;
    if (sc > bs) { bs = sc; best = m; }
  }
  return best.kind === 'out' ? { type: 'move', out: true } : { type: 'move', h: best.h, to: best.to };
}
export { exitOk };
