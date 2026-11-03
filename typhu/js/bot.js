// Bot "thông minh vừa phải": mua đất có tính toán, xây đều, đấu giá theo định giá, giao dịch để gom đủ nhóm màu.
import {
  TILES, GROUPS, GROUP_LIST, P, current, actorOf, alive, tilesOf, ownerOf, ownsGroup, rentOf, canBuild, canSell, canMortgage, canUnmortgage,
  houseCost, unmortgageCost, mortgageValue, tradable, tradeError, buybackPrice, isProp, JAIL_FINE, MAX_TRADES, zingBuild, tradeImpact,
} from './engine.js?v=44';

// tiền nên giữ lại để trả tiền thuê bất ngờ
function reserve(s, pid) {
  let worst = 0;
  for (const k in s.props) { const pr = s.props[k]; if (pr.owner !== pid && !pr.mort) worst = Math.max(worst, rentOf(s, +k, 7)); }
  return Math.min(700, 120 + Math.round(worst * 0.45));
}
const groupOf = i => TILES[i].group;
// có nhóm này thì mình được bao nhiêu ô, còn thiếu mấy ô
function groupStat(s, pid, g) { const tl = GROUPS[g].tiles; const mine = tl.filter(i => ownerOf(s, i) === pid).length; return { mine, need: tl.length - mine, size: tl.length }; }
const unowned = s => TILES.filter((t, i) => isProp(i) && !s.props[i]).length;

// giá trị 1 ô đối với 1 người (dùng cho đấu giá + giao dịch)
export function tileWorth(s, pid, i, extraOwned = []) {
  const t = TILES[i]; let v = t.price;
  if (t.type === 'city') {
    const tl = GROUPS[t.group].tiles;
    const have = tl.filter(j => j === i || ownerOf(s, j) === pid || extraOwned.includes(j)).length;
    if (have === tl.length) v += t.price * 1.2 + GROUPS[t.group].house; // hoàn thành nhóm
    else if (have === tl.length - 1) v += t.price * 0.3;
    const others = tl.filter(j => j !== i && ownerOf(s, j) && ownerOf(s, j) !== pid);
    if (others.length && new Set(others.map(j => ownerOf(s, j))).size === 1 && others.length === tl.length - 1) v += t.price * 0.4; // chặn người khác
  } else if (t.type === 'station') {
    const n = TILES.filter((x, j) => x.type === 'station' && (ownerOf(s, j) === pid || extraOwned.includes(j))).length;
    v += n * 40;
  }
  return v;
}

export function botAction(s, pid) {
  if (s.phase !== 'playing' || actorOf(s) !== pid) return null;
  const p = P(s, pid), R = reserve(s, pid);
  switch (s.stage) {
    case 'buy': {
      const i = s.buyTile, t = TILES[i], st = t.type === 'city' ? groupStat(s, pid, t.group) : null;
      const completes = st && st.need === 1;
      const want = completes || t.type === 'station' || p.cash - t.price >= R * (unowned(s) > 10 ? 0.6 : 1);
      return p.cash >= t.price && want ? { type: 'buy' } : { type: 'decline' };
    }
    case 'auction': {
      const A = s.auction, worth = tileWorth(s, pid, A.tile);
      const cap = Math.min(Math.round(worth * 0.95), p.cash - Math.round(R * 0.5));
      const step = A.high < 100 ? 10 : A.high < 300 ? 20 : 50;
      const bid = Math.max(10, A.high + step);
      return bid <= cap ? { type: 'bid', amount: bid } : { type: 'pass' };
    }
    case 'buyback': {
      const i = s.buyback.tile, price = buybackPrice(s, i), st = groupStat(s, pid, groupOf(i));
      const good = st.need === 1 || (s.props[i].h >= 3 && p.cash - price > R * 2);
      return good && p.cash - price >= R ? { type: 'buyback' } : { type: 'skipBuyback' };
    }
    case 'trade': return judgeTrade(s, pid) ? { type: 'accept' } : { type: 'reject' };
    case 'debt': {
      if (p.cash >= s.debt.amount) return { type: 'payDebt' };
      const a = raiseStep(s, pid); return a || { type: 'bankrupt' };
    }
    case 'roll': case 'end': {
      const m = manage(s, pid, R); if (m) return m;
      if (s.stage === 'end') return { type: 'end' };
      if (p.inJail) {
        const early = unowned(s) > 8;
        if (early && p.cards.length) return { type: 'useCard' };
        if (early && p.cash - JAIL_FINE > R) return { type: 'payJail' };
      }
      return { type: 'roll' };
    }
  }
  return null;
}
// 1 bước gom tiền khi nợ: bán nhà nhóm đắt trước, sau đó thế chấp đất ít giá trị trước
function raiseStep(s, pid) {
  const own = tilesOf(s, pid);
  const mort = own.filter(i => canMortgage(s, pid, i) && !(TILES[i].type === 'city' && ownsGroup(s, pid, groupOf(i)))).sort((a, b) => TILES[a].price - TILES[b].price)[0];
  if (mort != null) return { type: 'mortgage', tile: mort };
  const sell = own.filter(i => canSell(s, pid, i)).sort((a, b) => houseCost(b) - houseCost(a))[0];
  if (sell != null) return { type: 'sell', tile: sell };
  const m2 = own.filter(i => canMortgage(s, pid, i)).sort((a, b) => TILES[a].price - TILES[b].price)[0];
  if (m2 != null) return { type: 'mortgage', tile: m2 };
  return null;
}
// trong lượt: chuộc đất, xây nhà, đề nghị giao dịch
function manage(s, pid, R) {
  const p = P(s, pid), own = tilesOf(s, pid);
  // luật ZingPlay thật: chỉ xây được ở ô vừa dừng, cơ hội hiếm → xây luôn nhiều nhà một lần (giữ dự trữ thấp hơn chút)
  if (zingBuild(s)) {
    const i = s.landed;
    if (i != null && canBuild(s, pid, i)) {
      const c = houseCost(i), keep = Math.round(R * 0.8);
      const cap = (s.landH || 0) >= 4 ? 5 : 4; // Landmark chỉ ở lần dừng sau
      let n = 0; while (s.props[i].h + n < cap && p.cash - (n + 1) * c >= keep) n++;
      if (n) return { type: 'build', tile: i, n };
    }
  }
  // xây: ưu tiên nhóm đắt (tiền thuê cao), giữ dự trữ
  const build = own.filter(i => canBuild(s, pid, i) && p.cash - houseCost(i) >= R).sort((a, b) => TILES[b].price - TILES[a].price || s.props[a].h - s.props[b].h)[0];
  if (build != null) return { type: 'build', tile: build };
  // chuộc đất thuộc nhóm đã đủ trước
  const un = own.filter(i => canUnmortgage(s, pid, i) && p.cash - unmortgageCost(i) >= R + 150)
    .sort((a, b) => (TILES[b].type === 'city' && ownsGroup(s, pid, groupOf(b))) - (TILES[a].type === 'city' && ownsGroup(s, pid, groupOf(a))) || TILES[b].price - TILES[a].price)[0];
  if (un != null) return { type: 'unmortgage', tile: un };
  if (s.trades < 1 && MAX_TRADES > 0) { const t = proposeTrade(s, pid, R); if (t) return t; }
  return null;
}
function proposeTrade(s, pid, R) {
  const p = P(s, pid);
  for (const g of GROUP_LIST) {
    const st = groupStat(s, pid, g.id); if (st.need !== 1 || st.mine < 1) continue;
    const i = g.tiles.find(j => ownerOf(s, j) !== pid); const o = ownerOf(s, i); if (!o) continue;
    const owner = P(s, o); if (owner.out || !tradable(s, o, i)) continue;
    const h = s.tradeHist[pid + '>' + i];
    if (h && s.round - h.r < 3) continue;
    const tries = h ? h.k : 0;
    // đổi chéo: họ cũng thiếu đúng 1 ô mà ô đó của mình → đổi đất lấy đất (bù tiền nếu lệch giá)
    for (const g2 of GROUP_LIST) {
      if (g2.id === g.id) continue;
      const st2 = groupStat(s, o, g2.id); if (st2.need !== 1) continue;
      const j = g2.tiles.find(x => ownerOf(s, x) !== o); if (ownerOf(s, j) !== pid || !tradable(s, pid, j)) continue;
      const diff = Math.max(0, Math.round((TILES[i].price - TILES[j].price) / 10) * 10 + 20 * tries);
      if (p.cash - diff < R) continue;
      const t = { type: 'trade', to: o, give: { cash: diff, tiles: [j], cards: 0 }, get: { cash: 0, tiles: [i], cards: 0 } };
      if (!tradeError(s, pid, t) && !tradeImpact(s, pid, t)[1].win) return t;
    }
    if (groupStat(s, o, g.id).mine >= 2 && tries < 2) continue; // họ cũng đang gom nhóm này – thử ít thôi
    const offer = Math.round(TILES[i].price * (1.6 + 0.3 * tries) / 10) * 10 + 40;
    if (p.cash - offer < R) continue;
    const t = { type: 'trade', to: o, give: { cash: offer, tiles: [], cards: 0 }, get: { cash: 0, tiles: [i], cards: 0 } };
    if (!tradeError(s, pid, t)) return t;
  }
  return null;
}
// bot là người nhận lời đề nghị
export function judgeTrade(s, pid) {
  const T = s.trade, me = P(s, pid), R = reserve(s, pid);
  if (tradeError(s, T.from, T)) return false;
  const imp = tradeImpact(s, T.from, T);
  if (imp[0].win && !imp[1].win) return false; // không bao giờ dâng chiến thắng cho đối phương
  if (imp[1].win) return true;
  const valIn = T.give.tiles.reduce((a, i) => a + tileWorth(s, pid, i, T.give.tiles) * (s.props[i].mort ? 0.55 : 1), 0) + T.give.cash + T.give.cards * 40;
  let valOut = T.get.tiles.reduce((a, i) => a + tileWorth(s, pid, i) * (s.props[i].mort ? 0.55 : 1), 0) + T.get.cash + T.get.cards * 40;
  // nếu nhờ giao dịch mà đối phương đủ nhóm màu → đòi thêm
  for (const i of T.get.tiles) {
    if (TILES[i].type !== 'city') continue;
    const g = GROUPS[TILES[i].group].tiles;
    if (g.every(j => ownerOf(s, j) === T.from || T.get.tiles.includes(j))) valOut += TILES[i].price * 0.35;
  }
  if (me.cash - T.get.cash < Math.min(R, 150)) return false;
  return valIn >= valOut * 1.08;
}
