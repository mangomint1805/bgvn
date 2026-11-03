// Mô phỏng hàng trăm ván toàn bot: đếm ván kẹt / hành động lỗi / vi phạm bất biến. Chạy: node typhu/test/sim.mjs [số ván]
import './load.mjs';
import { createGame, applyAction, actorOf, setRandom, TILES, GROUPS } from '../js/engine.js?v=43';
import { botAction } from '../js/bot.js?v=43';
const G = +process.argv[2] || 600;
let seed = 12345; setRandom(() => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; });
const st = { games: 0, stuck: 0, errs: 0, inv: 0, actions: 0, rounds: 0, maxRounds: 0, reasons: {}, trades: 0, auctions: 0, buybacks: 0, bankrupt: 0, landmarks: 0, zingBuilds: 0, zingBad: 0, byVariant: {} };
const variants = [{}, { maxRounds: 30 }, { monopolyWin: false, maxRounds: 60 }, { auction: false, buyback: false }, { startMoney: 2500 }, { freeBuild: false }, { freeBuild: false, buyback: false }, { freeBuild: 'zing' }, { freeBuild: 'zing', buyback: false, auction: false }];
for (let g = 0; g < G; g++) {
  const np = 2 + (g % 5), opts = variants[g % variants.length];
  const s = createGame(Array.from({ length: np }, (_, i) => ({ id: 'b' + i, name: 'Bot' + i, isBot: true })), opts);
  let k = 0, lastEv = 0;
  while (s.phase === 'playing' && k < 30000) {
    const pid = actorOf(s);
    const a = botAction(s, pid);
    if (!a) { st.stuck++; if (st.stuck < 4) console.log('KẸT', s.stage, pid); break; }
    const r = applyAction(s, pid, a);
    if (!r.ok) { st.errs++; if (st.errs < 6) console.log('LỖI', r.reason, JSON.stringify(a), s.stage); break; }
    k++;
    for (const e of s.ev) if (e.n > lastEv) { if (e.t === 'traded') st.trades++; if (e.t === 'sold' && e.pid) st.auctions++; if (e.t === 'buyback') st.buybacks++; if (e.t === 'bankrupt') st.bankrupt++; if (e.t === 'build' && e.h === 5) st.landmarks++;
      // luật ZingPlay thật: chỉ được xây ở ô người đang tới lượt vừa dừng
      if (e.t === 'build' && s.opts.freeBuild === 'zing') { st.zingBuilds++; if (e.tile !== s.landed || e.pid !== s.players[s.turn].id) { st.zingBad++; st.inv++; if (st.inv < 4) console.log('XÂY SAI Ô (zing)', JSON.stringify(e), s.landed); } } }
    lastEv = s.evn;
    // bất biến
    const bad = s.players.some(p => !p.out && p.cash < 0 && s.stage !== 'debt') ||
      Object.entries(s.props).some(([i, pr]) => { const p = s.players.find(x => x.id === pr.owner); if (!p || p.out) return true; if (pr.h && TILES[i].type !== 'city') return true; if (pr.h && pr.mort) return true;
        if (TILES[i].type === 'city' && s.opts.freeBuild === false && !s.opts.buyback) { /* xây đều tay chỉ bắt buộc ở luật cổ điển; mua lại đất có thể tách nhóm đang có nhà */ const hs = GROUPS[TILES[i].group].tiles.map(j => s.props[j] ? s.props[j].h : 0); if (Math.max(...hs) - Math.min(...hs) > 1) return true; } return false; });
    if (bad) { st.inv++; if (st.inv < 4) console.log('BẤT BIẾN SAI', s.stage, JSON.stringify(s.opts), s.players.map(p => p.cash + (p.out ? 'x' : '')), JSON.stringify(s.props), JSON.stringify(a)); break; }
  }
  if (s.phase === 'playing' && k >= 30000) { st.stuck++; if (st.stuck < 4) console.log('QUÁ DÀI', s.round, JSON.stringify(opts)); }
  st.games++; st.actions += k; st.rounds += s.round; st.maxRounds = Math.max(st.maxRounds, s.round);
  st.reasons[s.winReason || 'chưa xong'] = (st.reasons[s.winReason || 'chưa xong'] || 0) + 1;
  const vk = JSON.stringify(opts); const vs = (st.byVariant[vk] = st.byVariant[vk] || { n: 0, rounds: 0, max: 0 }); vs.n++; vs.rounds += s.round; vs.max = Math.max(vs.max, s.round);
}
for (const k in st.byVariant) st.byVariant[k] = `${st.byVariant[k].n} ván, TB ${Math.round(st.byVariant[k].rounds / st.byVariant[k].n)} vòng, max ${st.byVariant[k].max}`;
console.log({ ...st, avgActions: Math.round(st.actions / st.games), avgRounds: Math.round(st.rounds / st.games) });
if (st.stuck || st.errs || st.inv) process.exit(1);
