// Luật UNO – thuần logic. Chế độ: classic (cổ điển), house (luật rừng), nomercy (No Mercy).
let rand = Math.random;
export function setRandom(fn) { rand = fn; }
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const COLORS = ['R', 'Y', 'G', 'B'];
export const COLOR_NAME = { R: 'Đỏ', Y: 'Vàng', G: 'Xanh lá', B: 'Xanh dương' };
// Giá trị phạt rút của lá rút
export const DRAW_VALUE = { d2: 2, d4: 4, wd4: 4, wrd4: 4, wd6: 6, wd10: 10 };
export const CARD_NAME = {
  n: 'Số', skip: 'Cấm lượt', rev: 'Đảo chiều', d2: '+2', d4: '+4', skipall: 'Cấm tất cả', discall: 'Bỏ hết màu',
  wild: 'Đổi màu', wd4: 'Đổi màu +4', wrd4: 'Đổi màu đảo chiều +4', wd6: 'Đổi màu +6', wd10: 'Đổi màu +10', roulette: 'Vòng quay màu',
};
export const MODES = {
  classic: { name: 'Cổ điển', rules: { stackDraw: false, stackSkip: false, sevenZero: false, drawUntil: false, mercy: false, noActionFinish: false } },
  house:   { name: 'Luật rừng', rules: { stackDraw: true, stackSkip: true, sevenZero: false, drawUntil: false, mercy: false, noActionFinish: true } },
  nomercy: { name: 'No Mercy', rules: { stackDraw: true, stackSkip: false, sevenZero: true, drawUntil: true, mercy: true, noActionFinish: false } },
};
export const isWild = c => c.color === 'W';

function buildDeck(mode) {
  const d = []; let id = 0; const add = (color, type, num = null) => d.push({ id: 'u' + (id++), color, type, num });
  if (mode === 'nomercy') {
    for (const c of COLORS) {
      for (let n = 0; n <= 9; n++) { add(c, 'n', n); add(c, 'n', n); }
      for (let i = 0; i < 3; i++) { add(c, 'skip'); add(c, 'rev'); add(c, 'd2'); add(c, 'discall'); }
      for (let i = 0; i < 2; i++) { add(c, 'skipall'); add(c, 'd4'); }
    }
    for (let i = 0; i < 8; i++) { add('W', 'wrd4'); add('W', 'roulette'); }
    for (let i = 0; i < 4; i++) { add('W', 'wd6'); add('W', 'wd10'); }
  } else {
    for (const c of COLORS) {
      add(c, 'n', 0);
      for (let n = 1; n <= 9; n++) { add(c, 'n', n); add(c, 'n', n); }
      for (let i = 0; i < 2; i++) { add(c, 'skip'); add(c, 'rev'); add(c, 'd2'); }
    }
    for (let i = 0; i < 4; i++) { add('W', 'wild'); add('W', 'wd4'); }
  }
  return shuffle(d);
}

export function cardText(c) {
  if (c.type === 'n') return `${COLOR_NAME[c.color]} ${c.num}`;
  return isWild(c) ? CARD_NAME[c.type] : `${CARD_NAME[c.type]} ${COLOR_NAME[c.color]}`;
}

export function createGame(playerList, mode = 'house', ruleOverride = {}) {
  const rules = { ...MODES[mode].rules, ...ruleOverride };
  const s = { phase: 'playing', mode, rules, players: [], deck: buildDeck(mode), discard: [], color: null, dir: 1, turn: 0,
    stack: null, skipStack: 0, pending: null, unoWatch: null, log: [], winner: null, turnCount: 1, mustPlay: null, lastAction: null };
  s.players = playerList.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, hand: [], out: false, saidUno: false }));
  for (let k = 0; k < 7; k++) for (const p of s.players) p.hand.push(drawOne(s));
  // lá mở đầu: lá số
  let first; do { first = s.deck.pop(); if (first.type !== 'n') s.deck.unshift(first); } while (first.type !== 'n');
  s.discard.push(first); s.color = first.color;
  s.turn = Math.floor(rand() * s.players.length);
  log(s, `Ván mới (${MODES[mode].name}). Lá mở đầu: ${cardText(first)}. ${s.players[s.turn].name} đi trước.`);
  return s;
}

function log(s, m) { s.logN = (s.logN || 0) + 1; s.log.push(m); if (s.log.length > 200) s.log.shift(); }
export const top = s => s.discard[s.discard.length - 1];
export const getPlayer = (s, id) => s.players.find(p => p.id === id);
export const current = s => s.players[s.turn];
const alive = s => s.players.filter(p => !p.out);
function drawOne(s) {
  if (!s.deck.length) {
    const t = s.discard.pop(); s.deck = shuffle(s.discard.map(c => ({ ...c }))); s.discard = [t];
    if (s.deck.length) log(s, 'Hết bài, xào lại chồng bỏ.');
  }
  return s.deck.pop() || null;
}
function nextIdx(s, from = s.turn, steps = 1) {
  let i = from; const n = s.players.length;
  for (let k = 0; k < steps; k++) { do { i = (i + s.dir + n) % n; } while (s.players[i].out); }
  return i;
}
function give(s, p, k) {
  let got = 0;
  for (let i = 0; i < k; i++) { const c = drawOne(s); if (!c) break; p.hand.push(c); got++; }
  p.saidUno = false;
  checkMercy(s, p);
  return got;
}
function checkMercy(s, p) {
  if (s.rules.mercy && !p.out && p.hand.length >= 25) {
    p.out = true; s.discard.unshift(...p.hand); p.hand = [];
    log(s, `💀 ${p.name} giữ từ 25 lá trở lên, bị loại (luật No Mercy)!`);
    const al = alive(s); if (al.length === 1) win(s, al[0]);
  }
}
function win(s, p) { s.phase = 'ended'; s.winner = p.id; s.pending = null; s.stack = null; log(s, `🏆 ${p.name} thắng ván!`); }

// ---------- Kiểm tra lá đánh được ----------
export function canPlay(s, p, c) {
  if (s.phase !== 'playing' || p.out) return false;
  if (s.rules.noActionFinish && isFinishingAction(p, c)) return false;
  const t = top(s);
  if (s.stack) { // đang bị dồn phạt rút: chỉ được chồng lá rút giá trị bằng hoặc cao hơn
    if (!s.rules.stackDraw || !DRAW_VALUE[c.type]) return false;
    return DRAW_VALUE[c.type] >= s.stack.last;
  }
  if (s.skipStack) return s.rules.stackSkip && c.type === 'skip';
  if (s.mustPlay) return c.id === s.mustPlay;
  if (isWild(c)) return true;
  if (c.color === s.color) return true;
  if (c.type === 'n') return t.type === 'n' && t.num === c.num;
  return c.type === t.type;
}
// Luật "không về bằng lá chức năng": lá cuối cùng phải là lá số
export function isFinishingAction(p, c) {
  if (c.type === 'n') return false;
  if (p.hand.length === 1) return true;
  if (c.type === 'discall') return p.hand.every(x => x === c || x.color === c.color);
  return false;
}
export function playableIds(s, pid) {
  const p = getPlayer(s, pid); if (!p || current(s) !== p || s.pending) return [];
  return p.hand.filter(c => canPlay(s, p, c)).map(c => c.id);
}

// ---------- Hành động ----------
// {type:'play', cardId, color?} | {type:'draw'} | {type:'pass'} | {type:'take'} | {type:'color', color} | {type:'swap', target} | {type:'uno'} | {type:'catch', target}
export function applyAction(s, pid, a) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const p = getPlayer(s, pid); if (!p || p.out) return { ok: false, reason: 'Bạn đã bị loại.' };
  if (a.type === 'uno') { if (p.hand.length <= 2) { p.saidUno = true; log(s, `📣 ${p.name}: UNO!`); if (s.unoWatch === p.id) s.unoWatch = null; return { ok: true }; } return { ok: false, reason: 'Chỉ hô UNO khi còn 1–2 lá.' }; }
  if (a.type === 'catch') {
    const t = getPlayer(s, a.target);
    if (!t || s.unoWatch !== t.id || t.saidUno || t.hand.length !== 1 || t === p) return { ok: false, reason: 'Không bắt được.' };
    s.unoWatch = null; log(s, `🚨 ${p.name} bắt lỗi ${t.name} quên hô UNO! ${t.name} rút 2 lá.`); give(s, t, 2); return { ok: true };
  }
  const pr = s.pending;
  if (pr) {
    if (pr.player !== pid) return { ok: false, reason: 'Đang chờ người khác.' };
    if (pr.type === 'color' && a.type === 'color' && COLORS.includes(a.color)) { s.pending = null; s.color = a.color; log(s, `${p.name} chọn màu ${COLOR_NAME[a.color]}.`); finishEffect(s, pr.card, p); return { ok: true }; }
    if (pr.type === 'swap' && a.type === 'swap') {
      const t = getPlayer(s, a.target); if (!t || t.out || t === p) return { ok: false, reason: 'Chọn người khác.' };
      [p.hand, t.hand] = [t.hand, p.hand]; p.saidUno = t.saidUno = false; log(s, `🔄 ${p.name} đổi bài với ${t.name}.`);
      s.pending = null; endTurn(s, 1); return { ok: true };
    }
    if (pr.type === 'roulette' && a.type === 'color' && COLORS.includes(a.color)) {
      s.pending = null; let k = 0, c;
      do { c = drawOne(s); if (!c) break; p.hand.push(c); k++; } while (!(c.color === a.color));
      p.saidUno = false; log(s, `🎡 ${p.name} chọn ${COLOR_NAME[a.color]}, lật ${k} lá mới ra màu đó.`);
      checkMercy(s, p); if (s.phase === 'playing') endTurn(s, 1); return { ok: true };
    }
    return { ok: false, reason: 'Hãy hoàn tất lựa chọn.' };
  }
  if (current(s) !== p) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (s.unoWatch && s.unoWatch !== p.id) s.unoWatch = null; // người kế đã hành động: hết thời gian bắt lỗi
  switch (a.type) {
    case 'play': {
      const c = p.hand.find(x => x.id === a.cardId);
      if (!c || !canPlay(s, p, c)) return { ok: false, reason: 'Lá này không đánh được.' };
      p.hand.splice(p.hand.indexOf(c), 1); s.discard.push(c); s.mustPlay = null;
      log(s, `${p.name} đánh ${cardText(c)}.`);
      if (!isWild(c)) s.color = c.color;
      // còn 1 lá mà chưa hô UNO -> có thể bị bắt
      if (p.hand.length === 1 && !p.saidUno) s.unoWatch = p.id;
      if (p.hand.length !== 1) p.saidUno = p.hand.length === 0 ? p.saidUno : false;
      if (c.type === 'discall') {
        const same = p.hand.filter(x => x.color === c.color);
        if (same.length) { p.hand = p.hand.filter(x => x.color !== c.color); s.discard.splice(s.discard.length - 1, 0, ...same); log(s, `🗑️ ${p.name} bỏ thêm ${same.length} lá màu ${COLOR_NAME[c.color]}.`); }
        if (p.hand.length === 1 && !p.saidUno) s.unoWatch = p.id;
      }
      if (p.hand.length === 0) { win(s, p); return { ok: true }; }
      if (isWild(c)) {
        if (a.color && COLORS.includes(a.color)) { s.color = a.color; log(s, `${p.name} chọn màu ${COLOR_NAME[a.color]}.`); finishEffect(s, c, p); }
        else s.pending = { type: 'color', player: p.id, card: c };
        return { ok: true };
      }
      finishEffect(s, c, p); return { ok: true };
    }
    case 'draw': {
      if (s.stack) return { ok: false, reason: 'Đang bị phạt: chồng lá rút hoặc chịu phạt.' };
      if (s.skipStack) return { ok: false, reason: 'Đang bị cấm lượt.' };
      if (s.mustPlay) return { ok: false, reason: 'Hãy đánh lá vừa rút.' };
      if (s.rules.drawUntil) {
        let k = 0, c;
        do { c = drawOne(s); if (!c) break; p.hand.push(c); k++; } while (!canPlay(s, p, c));
        p.saidUno = false; log(s, `${p.name} rút ${k} lá mới có lá đánh được.`);
        checkMercy(s, p); if (s.phase !== 'playing' || p.out) { if (p.out && s.phase === 'playing') endTurn(s, 1); return { ok: true }; }
        if (c) s.mustPlay = c.id; else endTurn(s, 1);
        return { ok: true };
      }
      const got = give(s, p, 1); log(s, `${p.name} rút 1 lá.`);
      const c = p.hand[p.hand.length - 1];
      if (got && canPlay(s, p, c)) { s.mustPlay = c.id; s.drewPlayable = c.id; s.lastDraw = { player: p.id, card: c.id }; return { ok: true }; }
      endTurn(s, 1); return { ok: true };
    }
    case 'pass': {
      if (!s.lastDraw || s.lastDraw.player !== p.id) return { ok: false, reason: 'Phải rút bài trước.' };
      s.lastDraw = null; endTurn(s, 1); return { ok: true };
    }
    case 'take': {
      if (s.stack) { const n = s.stack.total; s.stack = null; const got = give(s, p, n); log(s, `😵 ${p.name} chịu phạt rút ${got} lá.`); if (s.phase === 'playing') endTurn(s, 1); return { ok: true }; }
      if (s.skipStack) { s.skipStack = 0; log(s, `⛔ ${p.name} bị cấm lượt.`); endTurn(s, 1); return { ok: true }; }
      return { ok: false, reason: 'Không có gì để chịu.' };
    }
  }
  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

function finishEffect(s, c, p) {
  const n = alive(s).length; s.lastDraw = null; s.drewPlayable = null;
  const v = DRAW_VALUE[c.type];
  if (c.type === 'wrd4' || c.type === 'rev') {
    s.dir *= -1; log(s, `🔁 Đảo chiều!`);
    if (c.type === 'rev' && n === 2) { log(s, `${nameAt(s, 1)} bị mất lượt.`); return endTurn(s, 2); }
  }
  if (v) {
    if (s.rules.stackDraw) { s.stack = { total: (s.stack ? s.stack.total : 0) + v, last: v }; log(s, `➕ Dồn phạt: ${s.stack.total} lá cho ${nameAt(s, 1)}!`); return endTurn(s, 1); }
    const t = s.players[nextIdx(s)]; const got = give(s, t, v); log(s, `😵 ${t.name} rút ${got} lá và mất lượt.`);
    return endTurn(s, 2);
  }
  switch (c.type) {
    case 'skip':
      if (s.rules.stackSkip) { s.skipStack = 1; log(s, `⛔ ${nameAt(s, 1)} bị cấm lượt (có thể chồng Cấm lượt để chuyền).`); return endTurn(s, 1); }
      log(s, `⛔ ${nameAt(s, 1)} bị cấm lượt.`); return endTurn(s, 2);
    case 'skipall': log(s, `⛔ Cấm tất cả! ${p.name} đi tiếp.`); return endTurn(s, 0);
    case 'roulette': { const t = s.players[nextIdx(s)]; s.turn = nextIdx(s); s.pending = { type: 'roulette', player: t.id }; return; }
    case 'n':
      if (s.rules.sevenZero && c.num === 7 && n > 1) { s.pending = { type: 'swap', player: p.id }; return; }
      if (s.rules.sevenZero && c.num === 0) {
        const al = alive(s); const hands = al.map(q => q.hand);
        al.forEach((q, i) => { q.hand = hands[(i - s.dir + al.length) % al.length]; q.saidUno = false; });
        log(s, `🔄 Lá 0: mọi người chuyền bài theo chiều chơi.`);
      }
  }
  endTurn(s, 1);
}
function nameAt(s, k) { return s.players[nextIdx(s, s.turn, k)].name; }
function endTurn(s, steps) {
  if (s.phase !== 'playing') return;
  s.lastDraw = null; s.drewPlayable = null; s.mustPlay = null;
  if (steps > 0) s.turn = nextIdx(s, s.turn, steps);
  else if (current(s).out) s.turn = nextIdx(s);
  s.turnCount++;
  if (s.skipStack && s.turn !== undefined) {
    const p = current(s);
    if (!p.hand.some(c => c.type === 'skip')) { s.skipStack = 0; log(s, `⛔ ${p.name} bị cấm lượt.`); return endTurn(s, 1); }
  }
}

// ---------- View cho từng người ----------
export function viewFor(s, pid) {
  const me = getPlayer(s, pid);
  return {
    phase: s.phase, mode: s.mode, rules: s.rules, winner: s.winner, turn: s.turn, dir: s.dir, color: s.color, top: top(s),
    deckCount: s.deck.length, stack: s.stack, skipStack: s.skipStack, mustPlay: s.mustPlay, turnCount: s.turnCount,
    canPass: !!(s.lastDraw && s.lastDraw.player === pid), unoWatch: s.unoWatch,
    pending: s.pending ? { type: s.pending.type, player: s.pending.player } : null,
    log: s.log.slice(-40), logN: s.logN || 0, me: pid, lastDraw: s.lastDraw && s.lastDraw.player === pid ? s.lastDraw.card : null,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, out: p.out, handCount: p.hand.length, saidUno: p.saidUno, hand: p === me ? p.hand : null })),
    playable: playableIds(s, pid),
  };
}
