// Mô phỏng hàng trăm ván toàn bot: đếm ván kẹt / lỗi / vi phạm bất biến. Chạy: node cangua/test/sim.mjs [số ván]
import { createGame, applyAction, actorOf, setRandom, absSq, onTrack, legalMoves, GATE, TOP } from '../js/engine.js?v=3';
import { botAction } from '../js/bot.js?v=3';
const G = +process.argv[2] || 800;
let seed = 4242; setRandom(() => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; });
const variants = [{}, { homeRule: 'vn', dblHalf: false }, { homeRule: 'vn' }, { dblHalf: false }, { winRule: 'home', homeRule: 'thru' }, { moveMode: 'split', homeRule: 'thru' }, { dice: 1, homeRule: 'thru' }, { noJump: false }, { homeRule: 'count' }, { winRule: 'home' }, { playOn: true }, { moveMode: 'split' }, { exit2: 'any6' }, { triple: true }, { dice: 1 }, { dice: 1, exit1: '16', homeRule: 'count' }, { moveMode: 'split', noJump: false, playOn: true }];
const levels = ['easy', 'normal', 'hard'];
const st = { games: 0, stuck: 0, errs: 0, inv: 0, actions: 0, kicks: 0, outs: 0, triple: 0, wins: {}, byVar: {} };
for (let g = 0; g < G; g++) {
  const np = 2 + (g % 3), opts = { ...variants[g % variants.length] };
  const lv = Array.from({ length: np }, (_, i) => levels[(g + i) % 3]);
  const s = createGame(Array.from({ length: np }, (_, i) => ({ id: 'b' + i, name: 'Bot' + i, isBot: true })), opts);
  let k = 0, last = 0, rolls = 0;
  while (s.phase === 'playing' && k < 20000) {
    const pid = actorOf(s), a = botAction(s, pid, lv[s.turn]);
    if (!a) { st.stuck++; if (st.stuck < 4) console.log('KẸT', s.stage, JSON.stringify(s.moves)); break; }
    const r = applyAction(s, pid, a); if (a.type === 'roll') rolls++;
    if (!r.ok) { st.errs++; if (st.errs < 6) console.log('LỖI', r.reason, JSON.stringify(a), s.stage); break; }
    k++;
    for (const e of s.ev) if (e.n > last) { if (e.t === 'kick') st.kicks++; if (e.t === 'out') st.outs++; if (e.t === 'triple') st.triple++; }
    last = s.evn;
    // bất biến: 4 ngựa/người, vị trí hợp lệ, không 2 ngựa chung 1 ô đường đua, không 2 ngựa chung 1 bậc
    const seen = new Set(); let bad = '';
    for (const p of s.players) {
      if (p.horses.length !== 4) bad = 'số ngựa';
      const hs = new Set();
      for (const x of p.horses) {
        if (!Number.isInteger(x) || x < -1 || x > TOP) bad = 'vị trí ' + x;
        if (onTrack(x)) { const q = absSq(p.seat, x); if (seen.has(q)) bad = 'chung ô ' + q; seen.add(q); }
        else if (x > GATE) { if (hs.has(x)) bad = 'chung bậc'; hs.add(x); }
      }
    }
    if (s.stage === 'move' && !legalMoves(s).length) bad = 'move không có nước';
    if (bad) { st.inv++; if (st.inv < 5) console.log('BẤT BIẾN SAI', bad, JSON.stringify(opts), JSON.stringify(s.players.map(p => p.horses))); break; }
  }
  if (s.phase === 'playing') { st.stuck++; if (st.stuck < 4) console.log('QUÁ DÀI', JSON.stringify(opts), JSON.stringify(s.players.map(p => p.horses))); }
  st.games++; st.actions += k;
  const w = s.players.findIndex(p => p.id === s.winner); st.wins[lv[w]] = (st.wins[lv[w]] || 0) + 1;
  const vk = JSON.stringify(opts); const v = st.byVar[vk] = st.byVar[vk] || { n: 0, a: 0, max: 0, r: 0, rd: 0, rdm: 0 }; v.n++; v.a += k; v.max = Math.max(v.max, k); v.r += rolls; v.rd += s.round; v.rdm = Math.max(v.rdm, s.round);
}
for (const k in st.byVar) { const v = st.byVar[k]; st.byVar[k] = `${v.n} ván, TB ${Math.round(v.a / v.n)} hành động (max ${v.max}), ${Math.round(v.r / v.n)} lần đổ, ${Math.round(v.rd / v.n)} vòng (max ${v.rdm})`; }
console.log({ ...st, avgActions: Math.round(st.actions / st.games) });
if (st.stuck || st.errs || st.inv) process.exit(1);
