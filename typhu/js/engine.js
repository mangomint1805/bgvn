// Cờ Tỷ Phú Sài Gòn – luật chơi (state machine thuần, JSON-serializable, không đụng giao diện).
// Bàn 40 ô cổ điển + vài luật kiểu ZingPlay (mua lại đất, thắng độc quyền). Đơn vị tiền: K.
// Dữ liệu ô/thẻ nạp từ tiles.json + cards.json qua setData().

export let TILES = [], GROUPS = {}, GROUP_LIST = [], CARDS = { chance: [], chest: [] }, STATION_RENT = [25, 50, 100, 200];
export const N = 40, JAIL = 10, GOTO_JAIL = 30, PARKING = 20;
export function setData(tiles, cards) {
  TILES = tiles.tiles; STATION_RENT = tiles.stationRent || STATION_RENT;
  GROUP_LIST = tiles.groups.map(g => ({ ...g, tiles: TILES.map((t, i) => t.group === g.id ? i : -1).filter(i => i >= 0) }));
  GROUPS = Object.fromEntries(GROUP_LIST.map(g => [g.id, g]));
  CARDS = { chance: cards.chance, chest: cards.chest };
}
export const STATIONS = () => TILES.map((t, i) => t.type === 'station' ? i : -1).filter(i => i >= 0);
export const UTILITIES = () => TILES.map((t, i) => t.type === 'utility' ? i : -1).filter(i => i >= 0);
export const isProp = i => ['city', 'station', 'utility'].includes(TILES[i] && TILES[i].type);

let rand = Math.random;
export function setRandom(f) { rand = f || Math.random; }
const d6 = () => 1 + Math.floor(rand() * 6);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export const DEFAULTS = { startMoney: 1500, maxRounds: 0, monopolyWin: true, auction: true, buyback: true, freeBuild: true, travel: true, travelFee: 100, turnTime: 0 };
export const SALARY = 200, JAIL_FINE = 50, MAX_TRADES = 3;
export const houseCost = i => (GROUPS[TILES[i].group] || {}).house || 0;
export const mortgageValue = i => Math.round(TILES[i].price / 2);
export const unmortgageCost = i => Math.round(TILES[i].price / 2 * 1.1);
export const money = k => {
  const a = Math.abs(Math.round(k)), sign = k < 0 ? '-' : '';
  if (a >= 1000) return sign + (a / 1000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',') + 'M';
  return sign + a + 'K';
};

// ---------------- tạo ván ----------------
export function createGame(players, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const s = {
    v: 1, phase: 'playing', opts: o, round: 1, turn: 0, stage: 'roll',
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, avatar: p.avatar || null, color: p.color || '#ff5a5f', cash: o.startMoney, pos: 0, inJail: false, jailTurns: 0, cards: [], out: false, doubles: 0 })),
    props: {}, dice: [1, 1], rolled: false, again: false,
    auction: null, trade: null, debt: null, buyback: null, buyTile: null, landed: null,
    decks: { chance: shuffle([...CARDS.chance.keys()]), chest: shuffle([...CARDS.chest.keys()]) },
    trades: 0, tradeHist: {}, ev: [], evn: 0, log: [], winner: null, winReason: null, ranks: [],
  };
  log(s, '🎲 Bắt đầu ván! Mỗi người có ' + money(o.startMoney) + '.');
  return s;
}
function log(s, text) { s.log.push(text); if (s.log.length > 60) s.log.splice(0, s.log.length - 60); }
function ev(s, e) { s.ev.push({ n: ++s.evn, ...e }); if (s.ev.length > 80) s.ev.splice(0, s.ev.length - 80); }
export const current = s => s.players[s.turn];
export const P = (s, id) => s.players.find(p => p.id === id);
export const alive = s => s.players.filter(p => !p.out);
export const ownerOf = (s, i) => s.props[i] ? s.props[i].owner : null;
export const tilesOf = (s, pid) => Object.keys(s.props).map(Number).filter(i => s.props[i].owner === pid);
export function actorOf(s) {
  if (s.phase !== 'playing') return null;
  if (s.stage === 'auction') return s.auction.active[s.auction.idx];
  if (s.stage === 'trade') return s.trade.to;
  return current(s).id;
}

// ---------------- tính tiền ----------------
export const ownsGroup = (s, pid, g) => GROUPS[g].tiles.every(i => ownerOf(s, i) === pid);
export const groupsOwned = (s, pid) => GROUP_LIST.filter(g => ownsGroup(s, pid, g.id)).map(g => g.id);
export const countType = (s, pid, type) => TILES.filter((t, i) => t.type === type && ownerOf(s, i) === pid).length;
export function rentOf(s, i, diceSum = 7, mult = 1) {
  const pr = s.props[i]; if (!pr || pr.mort) return 0;
  const t = TILES[i];
  if (t.type === 'city') {
    if (pr.h > 0) return t.rent[pr.h];
    return t.rent[0] * (ownsGroup(s, pr.owner, t.group) ? 2 : 1);
  }
  if (t.type === 'station') return STATION_RENT[countType(s, pr.owner, 'station') - 1] * mult;
  if (t.type === 'utility') return diceSum * (mult > 1 ? 10 : countType(s, pr.owner, 'utility') >= 2 ? 10 : 4);
  return 0;
}
export function tileValue(s, i) { const pr = s.props[i]; if (!pr) return TILES[i].price; return (pr.mort ? mortgageValue(i) : TILES[i].price) + (pr.h || 0) * houseCost(i); }
export const buybackPrice = (s, i) => 2 * (TILES[i].price + (s.props[i].h || 0) * houseCost(i));
export function netWorth(s, pid) { const p = P(s, pid); return p.cash + tilesOf(s, pid).reduce((a, i) => a + tileValue(s, i), 0); }
// số tiền tối đa gom được nếu bán hết nhà + thế chấp hết đất
export function liquidity(s, pid) {
  let v = P(s, pid).cash;
  for (const i of tilesOf(s, pid)) { const pr = s.props[i]; v += (pr.h || 0) * houseCost(i) / 2; if (!pr.mort) v += mortgageValue(i); }
  return Math.floor(v);
}

// ---------------- kiểm tra hành động quản lý tài sản ----------------
// lý do không xây được ('' = xây được). freeBuild (mặc định, kiểu ZingPlay): đất của mình là xây được, không cần đủ bộ màu;
// đủ bộ màu thì vẫn phải xây đều tay. Tắt freeBuild = luật cổ điển (phải đủ bộ màu).
// freeBuild = 'zing' ("ZingPlay thật"): chỉ xây ở ô mình VỪA DỪNG trong lượt này (kể cả ô vừa mua / mua lại), không cần đủ bộ, không bắt xây đều.
// Landmark kiểu ZingPlay: chỉ nâng được khi ô đã có sẵn 4 nhà lúc mình tới (s.landH = số nhà lúc dừng) – không lên thẳng 0 → Landmark.
export const zingBuild = s => s.opts.freeBuild === 'zing';
export function buildBlock(s, pid, i) {
  const pr = s.props[i], t = TILES[i];
  if (!pr || pr.owner !== pid || t.type !== 'city') return 'Không phải đường của bạn';
  if (pr.h >= 5) return 'Đã lên Landmark rồi';
  if (pr.mort) return 'Đất đang thế chấp – chuộc lại trước';
  if (zingBuild(s)) {
    if (current(s).id !== pid || s.landed !== i) return 'Luật ZingPlay: chỉ xây được ở ô vừa dừng trong lượt này';
    if (pr.h === 4 && (s.landH || 0) < 4) return 'Luật ZingPlay: Landmark xây ở lần dừng sau (ô phải có sẵn 4 nhà khi bạn tới)';
    return P(s, pid).cash < houseCost(i) ? 'Không đủ tiền' : '';
  }
  const g = GROUPS[t.group].tiles, full = ownsGroup(s, pid, t.group);
  if (!full && s.opts.freeBuild === false) return 'Cần sở hữu đủ cả nhóm màu mới xây được';
  if (full && g.some(j => s.props[j].mort)) return 'Có đất cùng màu đang thế chấp';
  if (full && pr.h > Math.min(...g.map(j => s.props[j].h))) return 'Đủ bộ màu thì phải xây đều tay – xây các đường cùng màu trước';
  if (P(s, pid).cash < houseCost(i)) return 'Không đủ tiền';
  return '';
}
export const canBuild = (s, pid, i) => !buildBlock(s, pid, i);
export function canSell(s, pid, i) {
  const pr = s.props[i]; if (!pr || pr.owner !== pid || !pr.h) return false;
  if (zingBuild(s) || !ownsGroup(s, pid, TILES[i].group)) return true; // chưa đủ bộ (luật xây tự do) / ZingPlay thật: bán ô nào cũng được
  const g = GROUPS[TILES[i].group].tiles; return pr.h >= Math.max(...g.map(j => s.props[j].h)); // đủ bộ: bán đều tay
}
// nhóm màu có nhà của CHÍNH chủ ô này (nhà của người khác cùng màu không cản mình thế chấp / giao dịch)
const groupHasHouses = (s, i) => { const pr = s.props[i]; return TILES[i].type === 'city' && !!pr && GROUPS[TILES[i].group].tiles.some(j => s.props[j] && s.props[j].owner === pr.owner && s.props[j].h > 0); };
export function canMortgage(s, pid, i) { const pr = s.props[i]; return !!pr && pr.owner === pid && !pr.mort && !groupHasHouses(s, i); }
export function canUnmortgage(s, pid, i) { const pr = s.props[i]; return !!pr && pr.owner === pid && pr.mort && P(s, pid).cash >= unmortgageCost(i); }
export const tradable = (s, pid, i) => !!s.props[i] && s.props[i].owner === pid && !groupHasHouses(s, i);
const MANAGE = ['roll', 'end'];

// ---------------- hành động ----------------
export function applyAction(s, pid, a) {
  if (!a || typeof a !== 'object') return no('Hành động không hợp lệ');
  if (s.phase !== 'playing') return no('Ván đã kết thúc');
  const p = P(s, pid); if (!p || p.out) return no('Bạn không còn trong ván');
  const cur = current(s), mine = cur.id === pid;
  // huỷ giao dịch do mình đề nghị
  if (a.type === 'cancel') { if (s.stage !== 'trade' || s.trade.from !== pid) return no('Không có giao dịch để huỷ'); log(s, `↩️ ${p.name} rút lại lời đề nghị.`); s.stage = s.trade.back; s.trade = null; return ok(); }
  if (actorOf(s) !== pid) return no('Chưa tới lượt bạn');
  switch (a.type) {
    case 'roll': {
      if (s.stage !== 'roll') return no('Chưa được đổ');
      return doRoll(s, p);
    }
    case 'payJail': {
      if (s.stage !== 'roll' || !p.inJail) return no('Bạn không ở tù');
      if (p.cash < JAIL_FINE) return no('Không đủ tiền nộp phạt');
      p.cash -= JAIL_FINE; p.inJail = false; p.jailTurns = 0; ev(s, { t: 'pay', from: pid, to: null, amt: JAIL_FINE, why: 'jail' }); ev(s, { t: 'free', pid });
      log(s, `🔓 ${p.name} nộp ${money(JAIL_FINE)} ra tù.`); return ok();
    }
    case 'useCard': {
      if (s.stage !== 'roll' || !p.inJail || !p.cards.length) return no('Không có thẻ ra tù');
      const deck = p.cards.shift(); s.decks[deck].push(CARDS[deck].findIndex(c => c.id === 'free_jail'));
      p.inJail = false; p.jailTurns = 0; ev(s, { t: 'free', pid }); log(s, `🗝️ ${p.name} dùng thẻ ra tù miễn phí.`); return ok();
    }
    case 'buy': {
      if (s.stage !== 'buy') return no('Không có ô để mua');
      const i = s.buyTile; if (p.cash < TILES[i].price) return no('Không đủ tiền');
      const prev = s.props[i] && s.props[i].mort ? P(s, s.props[i].owner) : null;
      p.cash -= TILES[i].price; s.props[i] = { owner: pid, h: 0, mort: false };
      if (prev) log(s, `🏦 ${prev.name} mất ${TILES[i].name} vì để thế chấp.`);
      ev(s, { t: 'buy', pid, tile: i, amt: TILES[i].price }); log(s, `🏷️ ${p.name} mua ${TILES[i].name} giá ${money(TILES[i].price)}.`);
      s.buyTile = null; if (checkWin(s)) return ok(); finishLanding(s); return ok();
    }
    case 'decline': {
      if (s.stage !== 'buy') return no('Không có ô để mua');
      const i = s.buyTile; s.buyTile = null;
      if (s.opts.auction && alive(s).length > 1) startAuction(s, i);
      else { log(s, `🙅 ${p.name} không mua ${TILES[i].name}.`); finishLanding(s); }
      return ok();
    }
    case 'bid': case 'pass': {
      if (s.stage !== 'auction') return no('Không có đấu giá');
      const A = s.auction;
      if (a.type === 'bid') {
        const amt = Math.floor(+a.amount);
        if (!(amt > A.high) || amt < 10) return no('Giá phải cao hơn ' + money(A.high));
        if (amt > p.cash) return no('Không đủ tiền');
        A.high = amt; A.by = pid; ev(s, { t: 'bid', pid, amt }); A.idx = (A.idx + 1) % A.active.length;
      } else {
        A.active.splice(A.idx, 1); ev(s, { t: 'pass', pid }); if (A.idx >= A.active.length) A.idx = 0;
      }
      return auctionCheck(s);
    }
    case 'buyback': case 'skipBuyback': {
      if (s.stage !== 'buyback') return no('Không thể mua lại');
      const i = s.buyback.tile; s.buyback = null;
      if (a.type === 'buyback') {
        const pr = s.props[i], price = buybackPrice(s, i), old = P(s, pr.owner);
        if (p.cash < price) { finishLanding(s); return no('Không đủ tiền mua lại'); }
        // đất đang thế chấp: ngân hàng thu lại khoản chuộc từ tiền mua, người mua nhận đất sạch nợ
        const bank = pr.mort ? unmortgageCost(i) : 0;
        p.cash -= price; old.cash += price - bank; pr.owner = pid; pr.mort = false;
        if (bank) log(s, `🏦 Ngân hàng thu ${money(bank)} nợ thế chấp, ${old.name} nhận ${money(price - bank)}.`);
        ev(s, { t: 'buyback', pid, from: old.id, tile: i, amt: price });
        log(s, `💥 ${p.name} MUA LẠI ${TILES[i].name} của ${old.name} với giá ${money(price)}!`);
        if (checkWin(s)) return ok();
      }
      finishLanding(s); return ok();
    }
    case 'build': case 'sell': case 'mortgage': case 'unmortgage': {
      if (!mine) return no('Chỉ làm được trong lượt của bạn');
      const allowed = a.type === 'build' || a.type === 'unmortgage' ? MANAGE : [...MANAGE, 'debt'];
      if (!allowed.includes(s.stage)) return no('Lúc này chưa làm được');
      const i = +a.tile, t = TILES[i], pr = s.props[i];
      if (a.type === 'build') {
        // n > 1: xây nhiều nhà một lần (hộp "Xây mấy nhà?"); kiểm tra từng bước, hỏng giữa chừng thì hoàn lại hết
        const n = Math.max(1, Math.min(5, Math.floor(+a.n) || 1)), h0 = pr ? pr.h : 0, c0 = p.cash;
        for (let k = 0; k < n; k++) {
          const why = buildBlock(s, pid, i);
          if (why) { if (pr) { pr.h = h0; p.cash = c0; } return no(k ? `Chỉ xây thêm được ${k} nhà (${why})` : 'Chưa xây được ở đây' + (why ? ': ' + why : '')); }
          p.cash -= houseCost(i); pr.h++;
        }
        for (let h = h0 + 1; h <= pr.h; h++) ev(s, { t: 'build', pid, tile: i, h, amt: houseCost(i) });
        log(s, pr.h === 5 ? `🏛️ ${p.name} xây ${n > 1 ? (n - 1) + ' nhà + ' : ''}LANDMARK ở ${t.name}!` : n > 1 ? `🏠 ${p.name} xây ${n} nhà ở ${t.name} (giờ có ${pr.h}).` : `🏠 ${p.name} xây nhà thứ ${pr.h} ở ${t.name}.`);
      } else if (a.type === 'sell') {
        if (!canSell(s, pid, i)) return no('Không bán được nhà ở đây');
        const v = Math.floor(houseCost(i) / 2); pr.h--; p.cash += v; ev(s, { t: 'sell', pid, tile: i, h: pr.h, amt: v });
        log(s, `🔨 ${p.name} bán 1 ${pr.h === 4 ? 'Landmark' : 'nhà'} ở ${t.name} (+${money(v)}).`);
      } else if (a.type === 'mortgage') {
        if (!canMortgage(s, pid, i)) return no('Không thế chấp được (bán hết nhà trong nhóm trước)');
        pr.mort = true; p.cash += mortgageValue(i); ev(s, { t: 'mort', pid, tile: i, amt: mortgageValue(i) });
        log(s, `🏦 ${p.name} thế chấp ${t.name} (+${money(mortgageValue(i))}).`);
      } else {
        if (!canUnmortgage(s, pid, i)) return no('Không chuộc được');
        pr.mort = false; p.cash -= unmortgageCost(i); ev(s, { t: 'unmort', pid, tile: i, amt: unmortgageCost(i) });
        log(s, `🔑 ${p.name} chuộc lại ${t.name} (-${money(unmortgageCost(i))}).`);
      }
      return ok();
    }
    case 'trade': {
      if (!mine || !MANAGE.includes(s.stage)) return no('Chỉ giao dịch được trong lượt của bạn');
      if (s.trades >= MAX_TRADES) return no(`Mỗi lượt chỉ đề nghị tối đa ${MAX_TRADES} lần`);
      const t = cleanTrade(a); const err = tradeError(s, pid, t); if (err) return no(err);
      s.trades++; s.trade = { from: pid, ...t, back: s.stage }; s.stage = 'trade';
      t.give.tiles.concat(t.get.tiles).forEach(i => { const h = s.tradeHist[pid + '>' + i]; s.tradeHist[pid + '>' + i] = { r: s.round, k: h ? h.k + 1 : 1 }; });
      ev(s, { t: 'offer', from: pid, to: t.to }); log(s, `🤝 ${p.name} đề nghị giao dịch với ${P(s, t.to).name}.`);
      return ok();
    }
    case 'accept': case 'reject': {
      if (s.stage !== 'trade') return no('Không có giao dịch');
      const T = s.trade, from = P(s, T.from); s.trade = null; s.stage = T.back;
      if (a.type === 'reject') { ev(s, { t: 'reject', from: T.from, to: pid }); log(s, `🙅 ${p.name} từ chối giao dịch của ${from.name}.`); return ok(); }
      const err = tradeError(s, T.from, T); if (err) return no('Giao dịch không còn hợp lệ: ' + err);
      from.cash += T.get.cash - T.give.cash; p.cash += T.give.cash - T.get.cash;
      T.give.tiles.forEach(i => { s.props[i].owner = pid; }); T.get.tiles.forEach(i => { s.props[i].owner = T.from; });
      for (let k = 0; k < T.give.cards; k++) p.cards.push(from.cards.shift());
      for (let k = 0; k < T.get.cards; k++) from.cards.push(p.cards.shift());
      ev(s, { t: 'traded', from: T.from, to: pid, give: T.give, get: T.get }); log(s, `✅ ${p.name} đồng ý giao dịch với ${from.name}.`);
      checkWin(s); return ok();
    }
    case 'payDebt': {
      if (s.stage !== 'debt') return no('Bạn không nợ');
      const D = s.debt; if (p.cash < D.amount) return no(`Còn thiếu ${money(D.amount - p.cash)} – bán nhà hoặc thế chấp đất`);
      s.debt = null; s.stage = 'resolving'; payOut(s, p, D.to, D.why); return cont(s, D.then);
    }
    case 'autoRaise': { // ⚡ tự bán nhà/thế chấp vừa đủ rồi trả nợ luôn
      if (s.stage !== 'debt') return no('Bạn không nợ');
      const D = s.debt;
      if (!planRaise(s, pid, D.amount).ok) return no('Bán hết nhà + thế chấp hết đất vẫn chưa đủ – đành phá sản');
      const r = autoRaise(s, p, D.amount);
      if (r.steps.length) { ev(s, { t: 'raise', pid, steps: r.steps, amt: r.raised }); log(s, `⚡ ${p.name} tự ${raiseSummary(r.steps)} → +${money(r.raised)}.`); }
      s.debt = null; s.stage = 'resolving'; payOut(s, p, D.to, D.why); return cont(s, D.then);
    }
    case 'bankrupt': {
      if (s.stage !== 'debt') return no('Chỉ phá sản khi đang nợ');
      const D = s.debt; s.debt = null;
      const creditors = D.to.filter(x => x.pid);
      bankrupt(s, p, creditors.length === 1 ? creditors[0].pid : null);
      return ok();
    }
    case 'travel': case 'stay': { // ✈️ Bãi đậu xe = Du lịch: chọn 1 ô bất kỳ để bay tới ngay
      if (s.stage !== 'travel') return no('Không phải lúc du lịch');
      if (a.type === 'stay') { log(s, `🅿️ ${p.name} ở lại nghỉ ngơi.`); finishLanding(s); return ok(); }
      const to = +a.tile;
      if (!travelOk(to)) return no('Không bay tới ô đó được');
      const fee = +s.opts.travelFee || 0; if (p.cash < fee) return no(`Cần ${money(fee)} mới mua được vé máy bay`);
      if (fee) p.cash -= fee;
      log(s, `✈️ ${p.name} ${fee ? 'trả ' + money(fee) + ' vé máy bay, ' : ''}du lịch tới ${TILES[to].name}!`); moveTo(s, p, to, 'fly'); land(s, p); return ok();
    }
    case 'end': {
      if (s.stage !== 'end') return no('Chưa kết thúc lượt được');
      nextTurn(s); return ok();
    }
  }
  return no('Hành động không hợp lệ');
}
const ok = () => ({ ok: true });
const no = reason => ({ ok: false, reason });

// ---------------- đổ xúc xắc & di chuyển ----------------
function doRoll(s, p) {
  const d = [d6(), d6()], dbl = d[0] === d[1], sum = d[0] + d[1];
  s.dice = d; s.rolled = true; s.again = false; s.trades = s.trades || 0; s.landed = null;
  ev(s, { t: 'roll', pid: p.id, d });
  log(s, `🎲 ${p.name} đổ ${d[0]} + ${d[1]} = ${sum}${dbl ? ' (đôi!)' : ''}.`);
  s.stage = 'resolving';
  if (p.inJail) {
    if (dbl) { p.inJail = false; p.jailTurns = 0; ev(s, { t: 'free', pid: p.id }); log(s, `🔓 ${p.name} đổ đôi, ra tù!`); moveBy(s, p, sum); return ok(); }
    p.jailTurns++;
    if (p.jailTurns >= 3) { log(s, `⛓️ ${p.name} ở tù đủ 3 lượt – nộp ${money(JAIL_FINE)} rồi đi.`); p.inJail = false; p.jailTurns = 0; ev(s, { t: 'free', pid: p.id }); charge(s, p, [{ pid: null, amt: JAIL_FINE }], 'jailMove', 'jail'); return ok(); }
    log(s, `⛓️ ${p.name} chưa ra được tù (${p.jailTurns}/3).`); s.stage = 'end'; return ok();
  }
  if (dbl) { p.doubles++; if (p.doubles >= 3) { log(s, `🚨 ${p.name} đổ đôi 3 lần liền – vào tù!`); goJail(s, p); return ok(); } }
  else p.doubles = 0;
  moveBy(s, p, sum); return ok();
}
function moveBy(s, p, steps) {
  const from = p.pos, to = ((from + steps) % N + N) % N;
  const pass = steps > 0 && from + steps >= N;
  p.pos = to; ev(s, { t: 'move', pid: p.id, from, to, steps, kind: steps < 0 ? 'back' : 'walk' });
  if (pass) salary(s, p);
  land(s, p);
}
function moveTo(s, p, to, kind = 'walk') {
  const from = p.pos, steps = (to - from + N) % N;
  p.pos = to; ev(s, { t: 'move', pid: p.id, from, to, steps, kind });
  if (to < from || (to === 0 && from !== 0)) salary(s, p);
}
function salary(s, p) { p.cash += SALARY; ev(s, { t: 'salary', pid: p.id, amt: SALARY }); log(s, `💵 ${p.name} qua Bắt đầu, nhận ${money(SALARY)}.`); }
function goJail(s, p) {
  const from = p.pos; p.pos = JAIL; p.inJail = true; p.jailTurns = 0; p.doubles = 0; s.again = false;
  ev(s, { t: 'move', pid: p.id, from, to: JAIL, steps: 0, kind: 'jail' }); ev(s, { t: 'jail', pid: p.id });
  log(s, `🚔 ${p.name} vào tù!`); s.stage = 'end';
}
function land(s, p) {
  const i = p.pos, t = TILES[i];
  s.landed = i; s.landH = s.props[i] ? s.props[i].h : 0; ev(s, { t: 'land', pid: p.id, tile: i });
  if (isProp(i)) {
    const pr = s.props[i];
    if (!pr) { s.stage = 'buy'; s.buyTile = i; return; }
    if (pr.owner === p.id) { finishLanding(s); return; }
    // đất đang thế chấp coi như ô trống của ngân hàng: không thu thuê, ai dừng cũng mua được giá gốc (chủ cũ mất đất, đã nhận tiền thế chấp)
    if (pr.mort) { log(s, `🏦 ${t.name} của ${P(s, pr.owner).name} đang thế chấp – thành đất trống, ai dừng cũng mua được!`); s.stage = 'buy'; s.buyTile = i; return; }
    const rent = rentOf(s, i, s.dice[0] + s.dice[1]), owner = P(s, pr.owner);
    log(s, `💸 ${p.name} trả ${money(rent)} tiền thuê ${t.name} cho ${owner.name}.`);
    charge(s, p, [{ pid: owner.id, amt: rent }], t.type === 'city' ? 'buyback' : 'finish', 'rent', i);
    return;
  }
  if (t.type === 'tax') { log(s, `🧾 ${p.name} đóng ${t.name} ${money(t.amount)}.`); charge(s, p, [{ pid: null, amt: t.amount }], 'finish', 'tax'); return; }
  if (t.type === 'gotojail') { goJail(s, p); return; }
  if (t.type === 'parking' && s.noTravel) delete s.noTravel;
  else if (t.type === 'parking' && s.opts.travel !== false && !p.inJail && p.cash < (+s.opts.travelFee || 0)) log(s, `🅿️ ${p.name} tới Bãi đậu xe nhưng không đủ ${money(+s.opts.travelFee)} mua vé máy bay – nghỉ chân thôi.`);
  else if (t.type === 'parking' && s.opts.travel !== false && !p.inJail) { s.stage = 'travel'; log(s, `✈️ ${p.name} tới Bãi đậu xe – được chọn 1 ô để du lịch tới!`); return; }
  if (t.type === 'chance' || t.type === 'chest') { drawCard(s, p, t.type); return; }
  finishLanding(s);
}
// ô được bay tới khi du lịch: mọi ô trừ chính Bãi đậu xe và ô Vào tù
export const travelOk = i => Number.isInteger(i) && i >= 0 && i < N && TILES[i].type !== 'parking' && TILES[i].type !== 'gotojail';
function finishLanding(s) {
  const p = current(s);
  if (s.phase !== 'playing' || p.out) return;
  if (p.inJail || s.stage === 'end') { s.stage = 'end'; s.again = false; return; }
  const dbl = s.dice[0] === s.dice[1] && p.doubles > 0;
  if (dbl) { s.stage = 'roll'; s.again = true; } else { s.stage = 'end'; s.again = false; }
}
function cont(s, then) {
  if (s.phase !== 'playing') return ok();
  const p = current(s);
  if (then === 'jailMove') { moveBy(s, p, s.dice[0] + s.dice[1]); return ok(); }
  if (then && then.startsWith('buyback:')) {
    const i = +then.split(':')[1], pr = s.props[i];
    if (s.opts.buyback && pr && pr.owner !== p.id && pr.h < 5 && TILES[i].type === 'city' && p.cash >= buybackPrice(s, i) && !p.out) { s.stage = 'buyback'; s.buyback = { tile: i, price: buybackPrice(s, i) }; return ok(); }
  }
  if (then === 'continue') return ok();
  finishLanding(s); return ok();
}

// ---------------- trả tiền / nợ / phá sản ----------------
function payOut(s, p, to, why) {
  for (const x of to) {
    if (!x.amt) continue;
    p.cash -= x.amt; if (x.pid) P(s, x.pid).cash += x.amt;
    ev(s, { t: 'pay', from: p.id, to: x.pid, amt: x.amt, why });
  }
}
// người đang tới lượt trả tiền; thiếu thì vào trạng thái nợ để tự bán/thế chấp
function charge(s, p, to, then, why, tile) {
  const amt = to.reduce((a, x) => a + x.amt, 0);
  const nextTag = then === 'buyback' ? 'buyback:' + tile : then;
  if (p.cash >= amt) { payOut(s, p, to, why); cont(s, nextTag); return; }
  s.stage = 'debt'; s.debt = { amount: amt, to, then: nextTag, why };
  ev(s, { t: 'debt', pid: p.id, amt, why }); log(s, `😰 ${p.name} thiếu tiền! Cần ${money(amt)} – bán nhà/thế chấp hoặc phá sản.`);
}
// người KHÔNG tới lượt bị buộc trả (thẻ sinh nhật...): tự bán nhà/thế chấp, vẫn thiếu thì phá sản
function forcePay(s, payer, toPid, amt, why) {
  if (payer.cash < amt) autoRaise(s, payer, amt);
  if (payer.cash >= amt) { payOut(s, payer, [{ pid: toPid, amt }], why); return; }
  bankrupt(s, payer, toPid);
}
// ⚡ gom tiền tự động (dùng cho nút "Tự bán nhà/thế chấp cho đủ" + người bị buộc trả ngoài lượt).
// Tất định, ít thiệt nhất: bán nhà trước (nhóm đắt trước, đều tay – ô nhiều nhà nhất trước), hết nhà mới thế chấp đất (rẻ trước).
// Còn thiếu ít: chọn món RẺ NHẤT vừa đủ bù phần thiếu để khỏi bán dư. Dừng ngay khi đủ.
function raiseStep(s, pid, need) {
  const p = P(s, pid), rem = need - p.cash, own = tilesOf(s, pid);
  const sells = own.filter(i => canSell(s, pid, i));
  if (sells.length) {
    const val = i => Math.floor(houseCost(i) / 2);
    const cover = sells.filter(i => val(i) >= rem).sort((a, b) => val(a) - val(b) || s.props[b].h - s.props[a].h || a - b)[0];
    return { t: 'sell', tile: cover != null ? cover : sells.sort((a, b) => val(b) - val(a) || s.props[b].h - s.props[a].h || b - a)[0] };
  }
  const morts = own.filter(i => canMortgage(s, pid, i));
  if (morts.length) {
    const cover = morts.filter(i => mortgageValue(i) >= rem).sort((a, b) => mortgageValue(a) - mortgageValue(b) || a - b)[0];
    return { t: 'mort', tile: cover != null ? cover : morts.sort((a, b) => mortgageValue(a) - mortgageValue(b) || a - b)[0] };
  }
  return null;
}
function doRaiseStep(s, p, st, emit = true) {
  const pr = s.props[st.tile];
  if (st.t === 'sell') { const v = Math.floor(houseCost(st.tile) / 2); pr.h--; p.cash += v; if (emit) ev(s, { t: 'sell', pid: p.id, tile: st.tile, h: pr.h, amt: v }); return v; }
  pr.mort = true; p.cash += mortgageValue(st.tile); if (emit) ev(s, { t: 'mort', pid: p.id, tile: st.tile, amt: mortgageValue(st.tile) }); return mortgageValue(st.tile);
}
// kế hoạch gom tiền (không đổi state): { steps, raised, ok } – UI dùng để xem trước
export function planRaise(s, pid, need) {
  const c = { opts: s.opts, props: JSON.parse(JSON.stringify(s.props)), players: s.players.map(q => ({ ...q })), turn: s.turn, landed: s.landed, landH: s.landH };
  const p = P(c, pid), steps = []; let raised = 0, guard = 0;
  while (p.cash < need && guard++ < 300) { const st = raiseStep(c, pid, need); if (!st) break; raised += doRaiseStep(c, p, st, false); steps.push(st); }
  return { steps, raised, ok: p.cash >= need };
}
// gộp các bước thành câu ngắn: "bán 3 nhà (Nguyễn Huệ ×2, Lê Lợi), thế chấp Cống Quỳnh"
export function raiseSummary(steps) {
  const sold = {}, mort = [];
  for (const st of steps) { if (st.t === 'sell') sold[st.tile] = (sold[st.tile] || 0) + 1; else mort.push(st.tile); }
  const nSold = Object.values(sold).reduce((a, b) => a + b, 0), out = [];
  if (nSold) out.push(`bán ${nSold} nhà (${Object.keys(sold).map(i => TILES[i].name + (sold[i] > 1 ? ' ×' + sold[i] : '')).join(', ')})`);
  if (mort.length) out.push(`thế chấp ${mort.map(i => TILES[i].name).join(', ')}`);
  return out.join(', ') || 'không cần bán gì';
}
export function autoRaise(s, p, need) {
  const steps = []; let raised = 0, guard = 0;
  while (p.cash < need && guard++ < 300) { const st = raiseStep(s, p.id, need); if (!st) break; raised += doRaiseStep(s, p, st); steps.push(st); }
  return { steps, raised };
}
function bankrupt(s, p, creditorId) {
  const cr = creditorId && P(s, creditorId);
  const own = tilesOf(s, p.id);
  if (cr && !cr.out) {
    cr.cash += Math.max(0, p.cash);
    own.forEach(i => { s.props[i].owner = cr.id; });
    cr.cards.push(...p.cards);
    log(s, `💀 ${p.name} PHÁ SẢN! Toàn bộ tài sản về tay ${cr.name}.`);
  } else {
    own.forEach(i => { delete s.props[i]; });
    p.cards.forEach(d => s.decks[d].push(CARDS[d].findIndex(c => c.id === 'free_jail')));
    log(s, `💀 ${p.name} PHÁ SẢN! Đất đai trả về ngân hàng.`);
  }
  p.cards = []; p.cash = 0; p.out = true; p.inJail = false;
  s.ranks.unshift(p.id);
  ev(s, { t: 'bankrupt', pid: p.id, to: cr ? cr.id : null, tiles: own });
  if (checkWin(s)) return;
  if (s.auction) { // đang đấu giá mà phá sản (hiếm) – rút khỏi đấu giá
    const A = s.auction, k = A.active.indexOf(p.id); if (k >= 0) { A.active.splice(k, 1); if (A.idx >= A.active.length) A.idx = 0; } if (A.by === p.id) { A.by = null; A.high = 0; }
  }
  if (current(s).id === p.id) { s.debt = null; s.buyback = null; s.trade = null; s.auction = null; nextTurn(s); }
}

// ---------------- thẻ Cơ hội / Khí vận ----------------
function drawCard(s, p, deck) {
  const idx = s.decks[deck].shift(), c = CARDS[deck][idx];
  if (c.id !== 'free_jail') s.decks[deck].push(idx);
  const title = c.title.replace(/\{name\}/g, p.name);
  ev(s, { t: 'card', pid: p.id, deck, id: c.id, title, text: c.text });
  log(s, `${deck === 'chance' ? '❓' : '💰'} ${p.name} rút ${deck === 'chance' ? 'Cơ hội' : 'Khí vận'}: ${title} – ${c.text}`);
  const others = alive(s).filter(x => x.id !== p.id);
  const find = name => TILES.findIndex(t => t.name === name);
  const goTo = (i, kind) => { moveTo(s, p, i, kind); land(s, p); };
  const nearest = type => { for (let k = 1; k <= N; k++) { const i = (p.pos + k) % N; if (TILES[i].type === type) return i; } return p.pos; };
  const gain = amt => { p.cash += amt; ev(s, { t: 'gain', pid: p.id, amt }); finishLanding(s); };
  const pay = amt => charge(s, p, [{ pid: null, amt }], 'finish', 'card');
  const repairs = (h, lm) => { let n = 0, L = 0; tilesOf(s, p.id).forEach(i => { const x = s.props[i].h || 0; if (x === 5) L++; else n += x; }); const amt = n * h + L * lm; if (amt) pay(amt); else finishLanding(s); };
  switch (c.id) {
    case 'go_nguyenhue': return goTo(find('Nguyễn Huệ'));
    case 'go_dongkhoi': return goTo(find('Đồng Khởi'));
    case 'go_conghoa': return goTo(find('Cộng Hòa'));
    case 'go_mienDong': return goTo(find('Bến xe Miền Đông'));
    case 'go_start': return goTo(0);
    case 'near_station': { moveTo(s, p, nearest('station')); return landMult(s, p); }
    case 'near_utility': { moveTo(s, p, nearest('utility')); return landMult(s, p); }
    case 'back3': { moveBy(s, p, -3); return; }
    case 'flood': { const from = p.pos; p.pos = PARKING; ev(s, { t: 'move', pid: p.id, from, to: PARKING, steps: 0, kind: 'fly' }); s.noTravel = true; return land(s, p); }
    case 'jail': return goJail(s, p);
    case 'free_jail': p.cards.push(deck); return finishLanding(s);
    case 'dividend': return gain(100);
    case 'vietlott': return gain(150);
    case 'bank_error': return gain(200);
    case 'salary13': case 'inherit': case 'insurance': return gain(100);
    case 'stock': case 'tax_refund': return gain(50);
    case 'beauty': return gain(20);
    case 'fine': case 'school': case 'doctor': return pay(50);
    case 'hospital': return pay(100);
    case 'repair': return repairs(25, 100);
    case 'roadwork': return repairs(40, 115);
    case 'leader': { if (!others.length) return finishLanding(s); return charge(s, p, others.map(o => ({ pid: o.id, amt: 50 })), 'finish', 'card'); }
    case 'birthday': case 'lixi': {
      const amt = c.id === 'birthday' ? 30 : 20;
      for (const o of others) { if (s.phase !== 'playing') return; forcePay(s, o, p.id, amt, 'gift'); }
      return finishLanding(s);
    }
  }
  finishLanding(s);
}
function landMult(s, p) {
  const i = p.pos, pr = s.props[i];
  s.landed = i; s.landH = pr ? pr.h : 0; ev(s, { t: 'land', pid: p.id, tile: i });
  if (!pr) { s.stage = 'buy'; s.buyTile = i; return; }
  if (pr.owner === p.id || pr.mort) { finishLanding(s); return; }
  // bến xe gấp đôi, điện nước đổ lại × 10
  const t = TILES[i]; let sum = 0;
  if (t.type === 'utility') { const d = [d6(), d6()]; sum = d[0] + d[1]; ev(s, { t: 'roll', pid: p.id, d, util: true }); log(s, `🎲 ${p.name} đổ ${sum} để tính tiền điện nước.`); }
  const rent = rentOf(s, i, sum, 2), owner = P(s, pr.owner);
  log(s, `💸 ${p.name} trả ${money(rent)} cho ${owner.name} (${t.name}).`);
  charge(s, p, [{ pid: owner.id, amt: rent }], 'finish', 'rent', i);
}

// ---------------- đấu giá ----------------
function startAuction(s, i) {
  const ids = [];
  for (let k = 1; k <= s.players.length; k++) { const q = s.players[(s.turn + k) % s.players.length]; if (!q.out) ids.push(q.id); }
  s.auction = { tile: i, high: 0, by: null, active: ids, idx: 0 }; s.stage = 'auction';
  ev(s, { t: 'auction', tile: i }); log(s, `🔨 Đấu giá ${TILES[i].name}! Giá khởi điểm 10K.`);
}
function auctionCheck(s) {
  const A = s.auction;
  const done = A.active.length === 0 || (A.active.length === 1 && A.by === A.active[0]);
  if (!done) return ok();
  s.auction = null; s.stage = 'resolving';
  if (A.by) {
    const w = P(s, A.by); w.cash -= A.high; s.props[A.tile] = { owner: w.id, h: 0, mort: false };
    ev(s, { t: 'sold', pid: w.id, tile: A.tile, amt: A.high }); log(s, `🔨 ${w.name} thắng đấu giá ${TILES[A.tile].name} với ${money(A.high)}.`);
    if (checkWin(s)) return ok();
  } else { ev(s, { t: 'sold', pid: null, tile: A.tile }); log(s, `🔨 Không ai mua ${TILES[A.tile].name}.`); }
  finishLanding(s); return ok();
}

// ---------------- giao dịch ----------------
function cleanTrade(a) {
  const side = x => ({ cash: Math.max(0, Math.floor(+((x || {}).cash) || 0)), tiles: [...new Set(((x || {}).tiles || []).map(Number))].filter(i => i >= 0 && i < N), cards: Math.max(0, Math.floor(+((x || {}).cards) || 0)) });
  return { to: String(a.to), give: side(a.give), get: side(a.get) };
}
export function tradeError(s, from, t) {
  const A = P(s, from), B = P(s, t.to);
  if (!B || B.out || B.id === from) return 'Người nhận không hợp lệ';
  if (!t.give.cash && !t.give.tiles.length && !t.give.cards && !t.get.cash && !t.get.tiles.length && !t.get.cards) return 'Giao dịch trống';
  if (t.give.cash > A.cash) return 'Bạn không đủ tiền';
  if (t.get.cash > B.cash) return B.name + ' không đủ tiền';
  if (t.give.cards > A.cards.length || t.get.cards > B.cards.length) return 'Không đủ thẻ ra tù';
  for (const i of t.give.tiles) if (!tradable(s, from, i)) return `Không giao được ${TILES[i].name} (phải là đất của bạn, nhóm màu chưa có nhà)`;
  for (const i of t.get.tiles) if (!tradable(s, t.to, i)) return `Không lấy được ${TILES[i].name}`;
  return null;
}

// tổng giá trị 1 bên của giao dịch: tiền + giá đất (đang thế chấp tính nửa giá) + nhà + thẻ ra tù (tính bằng tiền phạt tù)
export const tradeSideValue = (s, side) => side.cash + side.tiles.reduce((a, i) => a + tileValue(s, i), 0) + side.cards * JAIL_FINE;
// giao dịch này làm thay đổi gì cho mỗi bên: gom đủ nhóm màu mới, đủ 4 bến xe, thắng ngay, hay chỉ còn 1 bước là thắng
export function tradeImpact(s, from, t) {
  const after = i => t.give.tiles.includes(i) ? t.to : t.get.tiles.includes(i) ? from : ownerOf(s, i);
  const st = STATIONS();
  return [from, t.to].map(pid => {
    const gBefore = GROUP_LIST.filter(g => g.tiles.every(i => ownerOf(s, i) === pid)).map(g => g.id);
    const gAfter = GROUP_LIST.filter(g => g.tiles.every(i => after(i) === pid)).map(g => g.id);
    const sBefore = st.filter(i => ownerOf(s, i) === pid).length, sAfter = st.filter(i => after(i) === pid).length;
    const newGroups = gAfter.filter(g => !gBefore.includes(g)), allStations = sAfter >= st.length && sBefore < st.length;
    const mw = !!s.opts.monopolyWin;
    const win = mw && (gAfter.length >= 3 && newGroups.length ? 'groups' : allStations ? 'stations' : null) || null;
    const near = mw && !win && ((gAfter.length === 2 && newGroups.length > 0) || (sAfter === st.length - 1 && sAfter > sBefore));
    return { pid, newGroups, groups: gAfter.length, stations: sAfter, allStations, win, near };
  });
}

// ---------------- thắng / chuyển lượt ----------------
export function winCheckFor(s, pid) {
  if (!s.opts.monopolyWin) return null;
  if (groupsOwned(s, pid).length >= 3) return 'groups';
  if (countType(s, pid, 'station') >= STATIONS().length) return 'stations';
  if (sideOwned(s, pid) != null) return 'side';
  return null;
}
// trọn 1 hàng: mọi ô mua được trên 1 cạnh bàn (đường, bến xe, công ty) đều của mình và không thế chấp
export const SIDES = () => [0, 1, 2, 3].map(k => TILES.map((t, i) => i).filter(i => i > k * 10 && i < k * 10 + 10 && isProp(i)));
export function sideOwned(s, pid) { const k = SIDES().findIndex(side => side.every(i => s.props[i] && s.props[i].owner === pid && !s.props[i].mort)); return k < 0 ? null : k; }
function checkWin(s) {
  const al = alive(s);
  if (al.length <= 1) { endGame(s, al[0] ? al[0].id : null, 'last'); return true; }
  for (const p of al) { const r = winCheckFor(s, p.id); if (r) { endGame(s, p.id, r); return true; } }
  return false;
}
function endGame(s, pid, reason) {
  s.phase = 'over'; s.winner = pid; s.winReason = reason; s.stage = 'over';
  s.auction = null; s.trade = null; s.debt = null; s.buyback = null;
  const rest = alive(s).filter(p => p.id !== pid).sort((a, b) => netWorth(s, b.id) - netWorth(s, a.id)).map(p => p.id);
  s.ranks = [pid, ...rest, ...s.ranks.filter(x => x !== pid && !rest.includes(x))].filter(Boolean);
  const w = P(s, pid), why = { last: 'là người cuối cùng trụ lại', groups: 'sở hữu trọn 3 nhóm màu', stations: 'sở hữu cả 4 bến xe', side: 'sở hữu trọn 1 hàng', rounds: 'giàu nhất khi hết giới hạn vòng' }[reason];
  ev(s, { t: 'win', pid, reason }); log(s, `🏆 ${w ? w.name : '?'} THẮNG – ${why}!`);
}
function nextTurn(s) {
  const n = s.players.length; let k = s.turn;
  current(s).doubles = 0;
  for (let step = 1; step <= n; step++) {
    const j = (s.turn + step) % n;
    if (!s.players[j].out) { if (j <= s.turn) s.round++; k = j; break; }
  }
  s.turn = k; s.stage = 'roll'; s.again = false; s.rolled = false; s.trades = 0; s.buyTile = null; s.landed = null;
  if (s.opts.maxRounds && s.round > s.opts.maxRounds) {
    s.round = s.opts.maxRounds;
    const best = alive(s).sort((a, b) => netWorth(s, b.id) - netWorth(s, a.id))[0];
    endGame(s, best.id, 'rounds'); return;
  }
  ev(s, { t: 'turn', pid: current(s).id, round: s.round });
}

// ---------------- góc nhìn cho từng người ----------------
export function viewFor(s, pid) {
  const v = JSON.parse(JSON.stringify(s));
  v.decks = { chance: s.decks.chance.length, chest: s.decks.chest.length };
  v.me = pid; v.actor = actorOf(s);
  v.worth = Object.fromEntries(s.players.map(p => [p.id, netWorth(s, p.id)]));
  return v;
}
