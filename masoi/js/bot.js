// Bot Ma Sói: nghi ngờ đơn giản (ai bị chỉ điểm nhiều, bị khai là Sói, bị bầu nhiều), sói thì che giấu và cắn người nguy hiểm.
import { P, alive, actors, isWolfRole, ROLES, wolfTargets, wolfLeader, voteCandidates, canVote } from './engine.js?v=1';

let rnd = Math.random;
export function setBotRandom(f) { rnd = f; }
const pick = a => a.length ? a[Math.floor(rnd() * a.length)] : null;
const hash = str => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h / 4294967296; };
const isWolf = p => p && isWolfRole(p.role);
const short = n => String(n).replace(' 🤖', '').trim();

// điểm nghi ngờ của bot `me` dành cho người `t` (càng cao càng nghi)
export function suspicion(s, me, t) {
  if (t.id === me.id) return -999;
  let sc = hash(me.id + t.id + s.day) * 1.6; // cảm tính
  if (me.lover === t.id) return -500;
  const seen = me.seen[t.id];
  if (seen === 'wolf') sc += 12; else if (seen === 'village') sc -= 8;
  if (isWolf(me) && isWolf(t)) return -300; // sói không cắn/bầu đồng bọn (trừ khi bất đắc dĩ)
  const acc = s.dayInfo ? s.dayInfo.accuse : {};
  for (const [by, tg] of Object.entries(acc)) { if (tg === t.id) sc += by === me.id ? 0.3 : 0.9; if (by === t.id && tg === me.id) sc += 1.2; }
  if (s.opts.voteMode === 'open') for (const h of s.history.slice(-4)) for (const [by, tg] of Object.entries(h.votes)) { if (tg === t.id) sc += 0.25; if (by === t.id && tg === me.id) sc += 0.6; }
  // lời khai Tiên Tri
  const claimers = new Set(s.claims.map(c => c.by));
  for (const c of s.claims) {
    if (c.by === me.id) continue;
    const cl = P(s, c.by);
    let trust = claimers.size > 1 ? 0.5 : 0.95;
    if (me.seen[c.by] === 'wolf' || (isWolf(me) && !isWolf(cl))) trust = 0; // sói biết thừa ai nói xạo
    if (c.target === t.id) sc += (c.res === 'wolf' ? 6 : -3) * trust;
    if (c.by === t.id && claimers.size > 1 && !isWolf(me)) sc += 0.8; // đối chất: ai cũng nghi chút
  }
  if (t.idiotOut) sc -= 2;
  if (t.revealed && ROLES[t.role] && ROLES[t.role].team === 'village') sc -= 3;
  return sc;
}
const ranked = (s, me, ids) => ids.map(id => [id, suspicion(s, me, P(s, id))]).sort((a, b) => b[1] - a[1]);
// "độ nguy hiểm" với bầy sói
function danger(s, t) {
  let d = rnd() * 1.2;
  if (s.claims.some(c => c.by === t.id)) d += 5;
  if (t.revealed && ['seer', 'witch', 'guard', 'hunter'].includes(t.role)) d += 4;
  if (t.revealed && t.role === 'hunter') d -= 6; // cắn thợ săn là bị kéo theo
  const acc = s.dayInfo ? s.dayInfo.accuse : {};
  for (const [by, tg] of Object.entries(acc)) if (by === t.id && isWolf(P(s, tg))) d += 1.5;
  if (t.role === 'elder' && t.revealed) d -= 2;
  return d;
}

export function botAction(s, pid) {
  const me = P(s, pid); if (!me || !actors(s).includes(pid)) return null;
  const others = alive(s).filter(p => p.id !== pid);
  switch (s.phase) {
    case 'night': {
      const st = s.step;
      if (st === 'cupid') {
        const pool = alive(s).map(p => p.id);
        const a = rnd() < 0.3 ? pid : pick(pool.filter(x => x !== pid));
        const b = pick(pool.filter(x => x !== a));
        return { type: 'cupid', targets: [a, b] };
      }
      if (st === 'guard') {
        const opts = alive(s).filter(p => p.id !== s.lastGuard);
        if (!opts.length) return { type: 'skip' };
        const claimed = opts.filter(p => s.claims.some(c => c.by === p.id) && suspicion(s, me, p) < 3);
        const t = claimed.length && rnd() < 0.7 ? pick(claimed) : (rnd() < 0.25 && opts.includes(me) ? me : pick(opts));
        return { type: 'guard', target: t.id };
      }
      if (st === 'seer') {
        const un = others.filter(p => !(p.id in me.seen) && !(me.lover === p.id));
        const pool = un.length ? un : others;
        if (!pool.length) return { type: 'skip' };
        const r = ranked(s, me, pool.map(p => p.id));
        return { type: 'seer', target: rnd() < 0.6 ? r[0][0] : pick(pool).id };
      }
      if (st === 'wolves' || st === 'wolves2') {
        const tg = wolfTargets(s).filter(id => id !== me.lover);
        const all = wolfTargets(s);
        const lead = wolfLeader(s);
        if (lead && (tg.includes(lead) || (!tg.length && all.includes(lead)))) return { type: 'wolf', target: lead };
        if (!tg.length) return { type: 'wolf', target: all.length ? all[0] : null };
        const sc = tg.map(id => [id, danger(s, P(s, id))]).sort((a, b) => b[1] - a[1]);
        return { type: 'wolf', target: sc[0][0] };
      }
      if (st === 'witch') {
        const n = s.night, a = { type: 'witch', save: null, poison: null };
        const v = n.victims.filter(id => id !== null);
        if (s.potions.save && v.length) {
          const tgt = v.includes(pid) ? pid : v.find(id => s.claims.some(c => c.by === id)) || v[0];
          const p = s.day <= 2 ? 0.75 : 0.5;
          if (tgt === pid || rnd() < p) a.save = tgt;
        }
        if (s.potions.poison) {
          const r = ranked(s, me, others.map(p => p.id));
          if (r.length && r[0][1] >= 3.5 && rnd() < 0.7 && r[0][0] !== a.save) a.poison = r[0][0];
        }
        return a.save || a.poison ? a : { type: 'skip' };
      }
      return { type: 'skip' };
    }
    case 'day': return { type: 'ready' };
    case 'vote': {
      const cands = voteCandidates(s).filter(id => id !== pid);
      if (!cands.length) return { type: 'vote', target: 'skip' };
      let r = ranked(s, me, cands);
      if (isWolf(me)) { // sói: bầu người tốt bị nghi nhiều nhất cho hoà nhập; đồng bọn bị dồn quá thì "cắt đuôi"
        const good = r.filter(([id]) => !isWolf(P(s, id)) && id !== me.lover);
        const pub = cands.map(id => [id, publicHeat(s, id)]).sort((a, b) => b[1] - a[1]);
        if (pub.length && isWolf(P(s, pub[0][0])) && pub[0][1] >= 3 && rnd() < 0.5) return { type: 'vote', target: pub[0][0] };
        if (good.length) return { type: 'vote', target: (pub.find(([id]) => !isWolf(P(s, id)) && id !== me.lover && pub[0][1] > 0.5) || good[0])[0] };
      }
      // dân: hùa theo số đông một chút để phiếu không bị chia nhỏ
      r = cands.map(id => [id, suspicion(s, me, P(s, id)) + publicHeat(s, id) * 0.7]).sort((a, b) => b[1] - a[1]);
      if (r[0][1] < 0.8 && s.day === 1 && rnd() < 0.35) return { type: 'vote', target: 'skip' };
      return { type: 'vote', target: r[0][0] };
    }
    case 'last': return { type: 'done' };
    case 'hunter': {
      const pool = alive(s).filter(p => p.id !== me.lover);
      if (!pool.length) return { type: 'shoot', target: null };
      const r = ranked(s, me, pool.map(p => p.id));
      return { type: 'shoot', target: r[0][0] };
    }
  }
  return null;
}
// mức độ "bị cả làng nhắm" (công khai)
function publicHeat(s, id) {
  let h = 0;
  const acc = s.dayInfo ? s.dayInfo.accuse : {};
  for (const tg of Object.values(acc)) if (tg === id) h += 1;
  for (const c of s.claims) if (c.target === id && c.res === 'wolf') h += 2;
  if (s.vote) for (const tg of Object.values(s.vote.votes)) if (tg === id) h += 1;
  return h;
}

// ---------- ban ngày: chỉ điểm, khai, nói nhảm ----------
// trả về danh sách việc bot muốn làm trong buổi thảo luận: [{a: action}] – chủ phòng rải ra theo thời gian
export function botDayPlan(s, pid) {
  const me = P(s, pid); if (!me || !me.alive || s.phase !== 'day') return [];
  const plan = [];
  const others = alive(s).filter(p => p.id !== pid);
  if (!others.length) return plan;
  // Tiên Tri thật: khai khi thấy sói (hoặc khi đã soi được kha khá)
  if (me.role === 'seer') {
    const wolves = Object.entries(me.seen).filter(([id, r]) => r === 'wolf' && P(s, id).alive && !s.claims.some(c => c.by === pid && c.target === id));
    if (wolves.length && rnd() < 0.9) plan.push({ type: 'claim', target: wolves[0][0], res: 'wolf' });
    else if (s.day >= 3 && rnd() < 0.3) { const g = Object.entries(me.seen).find(([id, r]) => r === 'village' && P(s, id).alive && !s.claims.some(c => c.by === pid && c.target === id)); if (g) plan.push({ type: 'claim', target: g[0], res: 'village' }); }
  }
  // Sói đôi khi khai bịa để đổ tội (khi có Tiên Tri thật vừa khai một đồng bọn)
  if (isWolf(me) && rnd() < 0.18) {
    const real = s.claims.find(c => c.day === s.day && isWolf(P(s, c.target)) && c.by !== pid);
    const fake = real ? real.by : null;
    if (fake && P(s, fake).alive && !isWolf(P(s, fake))) plan.push({ type: 'claim', target: fake, res: 'wolf' });
  }
  // chỉ điểm
  if (rnd() < 0.75) {
    let r = ranked(s, me, others.map(p => p.id));
    if (isWolf(me)) r = r.filter(([id]) => !isWolf(P(s, id)) && id !== me.lover);
    if (r.length) plan.push({ type: 'accuse', target: r[0][0] });
  }
  // vài câu nói
  const n = rnd() < 0.5 ? 1 : rnd() < 0.5 ? 2 : 0;
  for (let i = 0; i < n; i++) plan.push({ type: 'chat', ch: 'all', text: botLine(s, me) });
  return plan;
}
const L = {
  open: ['Ủa đêm qua ai làm gì đó khai lẹ 😤', 'Tui ngủ say như chết, không biết gì hết 😴', 'Sáng ra thấy lạnh gáy ghê 🥶', 'Làng mình có biến rồi mấy ní', 'Ai nói ít là đáng nghi nha', 'Bình tĩnh, đừng bầu bừa nha cả làng 🙏', 'Tui là dân thường, thề luôn 🥲', 'Nay ai cũng im re vậy?'],
  sus: ['Nghi {X} quá nha 🤨', '{X} nãy giờ im im, sus ghê', 'Tui đặt cược {X} là sói 🐺', '{X} ơi giải thích coi?', 'Linh cảm của tui chỉ vào {X}', '{X} nói chuyện nghe gian gian 😏'],
  def: ['Tui vô tội mà trời 😭', 'Bầu tui là phí phiếu nha!', 'Đừng nhìn tui, nhìn {X} kìa!'],
  wolfAll: ['Tui chỉ là nông dân hiền lành thôi 🌾', 'Tối qua tui nghe tiếng sói tru phía rặng tre…', 'Sói chắc chắn nằm trong mấy người im lặng'],
  dead: ['Huhu chết oan 😭', 'Tui sẽ ám cả làng 👻', 'Ở dưới này lạnh lắm…'],
  wolfChat: ['Cắn {X} đi, nó nói nhiều quá 😈', 'Chốt {X} nha bầy', 'Đêm nay xử {X}', '{X} có vẻ là Tiên Tri, xơi luôn'],
};
const fill = (t, x) => t.replace('{X}', x);
export function botLine(s, me) {
  const others = alive(s).filter(p => p.id !== me.id);
  const r = ranked(s, me, others.map(p => p.id)).filter(([id]) => !(isWolf(me) && isWolf(P(s, id))));
  const top = r.length ? short(P(s, r[0][0]).name) : 'ai đó';
  const acc = s.dayInfo ? s.dayInfo.accuse : {};
  if (Object.values(acc).filter(t => t === me.id).length >= 2 && rnd() < 0.7) return fill(pick(L.def), top);
  if (isWolf(me) && rnd() < 0.3) return pick(L.wolfAll);
  return rnd() < 0.55 ? fill(pick(L.sus), top) : pick(L.open);
}
export function botWolfLine(s, me) {
  const t = wolfLeader(s) || (wolfTargets(s)[0] || null);
  return t ? fill(pick(L.wolfChat), short(P(s, t).name)) : 'Đêm nay im lặng thôi 🤫';
}
export function botGhostLine() { return pick(L.dead); }
export function botLastWords(s, me) {
  const pool = isWolf(me) ? ['Tui là dân… thật đó 😭', 'Các người sẽ hối hận 😤', 'Nhớ tui nha 🥀'] : ['Tui là dân mà, mấy người treo nhầm rồi 😭', 'Sói còn trong làng đó, cẩn thận!', 'Báo thù cho tui nha 🥲'];
  return pick(pool);
}
export { canVote };
