// Luật UNO – thuần logic. Chế độ: classic (cổ điển), house (luật rừng), nomercy (No Mercy).
let rand = Math.random;
export function setRandom(fn) { rand = fn; }
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const COLORS = ['R', 'Y', 'G', 'B'];
export const COLOR_NAME = { R: 'Đỏ', Y: 'Vàng', G: 'Xanh lá', B: 'Xanh dương' };
// Giá trị phạt rút của lá rút
export const DRAW_VALUE = { d2: 2, d4: 4, wd4: 4, wrd4: 4, wd6: 6, wd10: 10, wtd4: 4 };
export const CARD_NAME = {
  n: 'Số', skip: 'Khoá mõm', rev: 'Đảo chiều', d2: '+2', d4: '+4', skipall: 'Khoá mõm cả bàn', discall: 'Xả màu',
  wild: 'Đổi màu', wd4: 'Đổi màu +4', wtd4: 'Cộng nhắm +4', wup: 'Up', tornado: 'Bão tố', wrd4: 'Đổi màu đảo chiều +4', wd6: 'Đổi màu +6', wd10: 'Đổi màu +10', roulette: 'Vòng quay màu', nou: 'No U', shield: 'Khiên', dq: '+?', gift: 'Tặng quà', steal: 'Móc túi', wswap: 'Đổi tay',
};
export const MODES = {
  classic: { name: 'Cổ điển', rules: { stackDraw: false, stackAny: false, stackSkip: false, sevenZero: false, drawUntil: false, mercy: false, noActionFinish: false, extras: false } },
  house:   { name: 'Luật rừng', rules: { stackDraw: true, stackAny: true, stackSkip: true, sevenZero: false, drawUntil: false, mercy: false, noActionFinish: true, extras: true } },
  nomercy: { name: 'No Mercy', rules: { stackDraw: true, stackAny: false, stackSkip: false, sevenZero: true, drawUntil: true, mercy: true, noActionFinish: false, extras: false } },
};
export const isWild = c => c.color === 'W';

function buildDeck(mode, rules = {}) {
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
  if (rules.extras) { // lá mở rộng
    for (const c of COLORS) { add(c, 'tornado'); if (mode !== 'nomercy') add(c, 'discall'); add(c, 'nou'); add(c, 'gift'); add(c, 'steal'); add('W', 'dq'); }
    for (let i = 0; i < 2; i++) { add('W', 'wtd4'); add('W', 'wup'); add('W', 'wswap'); add('W', 'shield'); add('W', 'shield'); }
  }
  return shuffle(d);
}

export function cardText(c) {
  if (c.type === 'n') return `${COLOR_NAME[c.color]} ${c.num}`;
  return isWild(c) ? CARD_NAME[c.type] : `${CARD_NAME[c.type]} ${COLOR_NAME[c.color]}`;
}

export function createGame(playerList, mode = 'house', ruleOverride = {}) {
  const rules = { ...MODES[mode].rules, ...ruleOverride };
  const s = { phase: 'playing', mode, rules, players: [], deck: buildDeck(mode, rules), up: null, deckTotal: 0, discard: [], color: null, dir: 1, turn: 0,
    stack: null, skipStack: 0, pending: null, owe: null, unoWatch: null, log: [], winner: null, turnCount: 1, mustPlay: null, lastAction: null, fx: [], fxN: 0 };
  s.deckTotal = s.deck.length;
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
// Sự kiện "ai chơi ai" cho giao diện vẽ mũi tên: {id, k: loại, from, to, n}
function ev(s, k, from, to, n = 0) {
  if (!s.fx) s.fx = [];
  s.fxN = (s.fxN || 0) + 1; s.fx.push({ id: s.fxN, k, from, to, n });
  if (s.fx.length > 12) s.fx.shift();
}
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
// Phạt rút: người bị phạt phải tự bốc từng lá (lệnh 'pull'). left = số lá còn phải bốc, until = bốc tới khi ra màu đó.
// Bốc xong: s.turn = resume.turn rồi endTurn(resume.steps) (steps < 0: giữ nguyên lượt).
function startOwe(s, t, spec, resumeTurn, steps) {
  s.owe = { player: t.id, got: 0, left: spec.left || 0, until: spec.until || null, kind: spec.kind, resume: { turn: resumeTurn, steps } };
}
function finishOwe(s) {
  const o = s.owe; s.owe = null; if (s.phase !== 'playing') return;
  const t = getPlayer(s, o.player);
  if (o.kind === 'tornado') log(s, `🌪️ ${t.name} bốc ${o.got} lá mới ra màu ${COLOR_NAME[o.until]} và mất lượt.`);
  else if (o.kind === 'roulette') log(s, `🎡 ${t.name} bốc ${o.got} lá mới ra màu ${COLOR_NAME[o.until]}.`);
  else if (o.kind === 'mystery') log(s, `❓ ${t.name} bốc tổng cộng ${o.got} lá và mất lượt.`);
  else if (o.kind === 'up') log(s, `⬆️ ${t.name} không theo được Up, bốc ${o.got} lá.`);
  else log(s, `😵 ${t.name} chịu phạt, bốc ${o.got} lá.`);
  s.turn = o.resume.turn;
  if (o.resume.steps >= 0) endTurn(s, o.resume.steps);
  else if (current(s).out) endTurn(s, 1);
}
function checkMercy(s, p) {
  if (s.rules.mercy && !p.out && p.hand.length >= 25) {
    p.out = true; s.discard.unshift(...p.hand); p.hand = [];
    log(s, `💀 ${p.name} giữ từ 25 lá trở lên, bị loại (luật No Mercy)!`);
    const al = alive(s); if (al.length === 1) win(s, al[0]);
  }
}
function win(s, p) { s.phase = 'ended'; s.winner = p.id; s.pending = null; s.stack = null; s.owe = null; log(s, `🏆 ${p.name} thắng ván!`); }

// ---------- Kiểm tra lá đánh được ----------
export function canPlay(s, p, c) {
  if (s.phase !== 'playing' || p.out) return false;
  if (s.rules.noActionFinish && isFinishingAction(p, c)) return false;
  const t = top(s);
  if (s.stack) { // đang bị dồn phạt rút: chỉ được chồng lá rút giá trị bằng hoặc cao hơn
    if (c.type === 'shield') return true; // Khiên: chặn lá cộng, chuyền phạt sang người kế
    if (c.type === 'nou') { const f = s.stack.from && getPlayer(s, s.stack.from); return !!(f && !f.out && f !== p); } // No U: dội phạt ngược lại, màu nào cũng được
    if (!s.rules.stackDraw || !DRAW_VALUE[c.type]) return false;
    return s.rules.stackAny || DRAW_VALUE[c.type] >= s.stack.last; // stackAny: +2 và +4 chồng lẫn nhau thoải mái
  }
  if (s.skipStack) return s.rules.stackSkip && c.type === 'skip';
  if (s.up) { // chuỗi Up: chỉ lá số, màu nào cũng được, số phải bằng hoặc lớn hơn
    if (c.type !== 'n') return false;
    return s.up.first || c.num >= s.up.n;
  }
  if (s.mustPlay) return c.id === s.mustPlay;
  if (c.type === 'tornado') return c.color === s.color; // Bão tố chỉ đánh lên lá cùng màu
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
  const p = getPlayer(s, pid); if (!p || current(s) !== p || s.pending || s.owe) return [];
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
    s.unoWatch = null; log(s, `🚨 ${p.name} bắt lỗi ${t.name} quên hô UNO! ${t.name} rút 2 lá.`); ev(s, 'catch', p.id, t.id, 2); give(s, t, 2); return { ok: true };
  }
  if (a.type === 'pull') {
    const o = s.owe; if (!o || o.player !== p.id) return { ok: false, reason: 'Không có gì để bốc.' };
    const c = drawOne(s);
    if (!c) { finishOwe(s); return { ok: true }; }
    p.hand.push(c); p.saidUno = false; o.got++;
    let done;
    if (o.until) done = c.color === o.until || isWild(c);
    else if (o.kind === 'mystery' && o.got === 1) { // lá +?: lá đầu tiên quyết định phải bốc thêm bao nhiêu
      o.reveal = c.type === 'n' ? c.num : -1; o.left = Math.max(0, o.reveal);
      if (!isWild(c)) { s.color = c.color; log(s, `🎨 Màu mới: ${COLOR_NAME[c.color]}.`); }
      log(s, c.type === 'n' ? `❓ ${p.name} lật ra số ${c.num}${c.num ? `: bốc thêm ${c.num} lá!` : ': thoát nạn!'}` : `❓ ${p.name} lật ra lá chức năng: được tha!`);
      done = o.left <= 0;
    } else done = --o.left <= 0;
    checkMercy(s, p);
    if (s.phase !== 'playing') return { ok: true };
    if (p.out || done) finishOwe(s);
    return { ok: true };
  }
  if (s.owe) return { ok: false, reason: `Chờ ${getPlayer(s, s.owe.player).name} bốc phạt xong đã.` };
  const pr = s.pending;
  if (pr) {
    if (pr.player !== pid) return { ok: false, reason: 'Đang chờ người khác.' };
    if (pr.type === 'color' && a.type === 'color' && COLORS.includes(a.color)) { s.pending = null; s.color = a.color; log(s, `${p.name} chọn màu ${COLOR_NAME[a.color]}.`); finishEffect(s, pr.card, p); return { ok: true }; }
    if (pr.type === 'target' && a.type === 'target') {
      const t = getPlayer(s, a.target); if (!t || t.out || t === p) return { ok: false, reason: 'Chọn người khác.' };
      s.pending = null; s._target = t.id; finishEffect(s, pr.card, p); return { ok: true };
    }
    if (pr.type === 'swap' && a.type === 'swap') {
      const t = getPlayer(s, a.target); if (!t || t.out || t === p) return { ok: false, reason: 'Chọn người khác.' };
      [p.hand, t.hand] = [t.hand, p.hand]; p.saidUno = t.saidUno = false; log(s, `🔄 ${p.name} đổi bài với ${t.name}.`); ev(s, 'swap7', p.id, t.id);
      s.pending = null; endTurn(s, 1); return { ok: true };
    }
    if (pr.type === 'roulette' && a.type === 'color' && COLORS.includes(a.color)) {
      s.pending = null; log(s, `🎡 ${p.name} chọn ${COLOR_NAME[a.color]}: tự bốc tới khi ra màu đó!`);
      startOwe(s, p, { kind: 'roulette', until: a.color }, s.turn, 1); return { ok: true };
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
      s._target = a.target || null; s._give = Array.isArray(a.give) ? a.give.slice(0, 2) : null;
      if (isWild(c) && c.type !== 'dq') { // +?: không chọn màu, màu theo lá người kế bốc ra
        if (a.color && COLORS.includes(a.color)) { s.color = a.color; log(s, `${p.name} chọn màu ${COLOR_NAME[a.color]}.`); finishEffect(s, c, p); }
        else s.pending = { type: 'color', player: p.id, card: c };
        return { ok: true };
      }
      finishEffect(s, c, p); return { ok: true };
    }
    case 'draw': {
      if (s.stack) return { ok: false, reason: 'Đang bị phạt: chồng lá rút hoặc chịu phạt.' };
      if (s.skipStack) return { ok: false, reason: 'Đang bị khoá mõm.' };
      if (s.up) return { ok: false, reason: 'Đang chuỗi Up: đánh lá số hợp lệ hoặc chịu rút.' };
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
      if (s.stack) { const n = s.stack.total; s.stack = null; log(s, `😵 ${p.name} chịu phạt: tự bốc ${n} lá!`); startOwe(s, p, { kind: 'stack', left: n }, s.turn, 1); return { ok: true }; }
      if (s.skipStack) { s.skipStack = 0; log(s, `🤐 ${p.name} bị khoá mõm.`); endTurn(s, 1); return { ok: true }; }
      if (s.up) { const n = s.up.first ? 2 : Math.max(1, s.up.n); s.up = null; startOwe(s, p, { kind: 'up', left: n }, s.turn, -1); return { ok: true }; }
      return { ok: false, reason: 'Không có gì để chịu.' };
    }
  }
  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

function finishEffect(s, c, p) {
  const n = alive(s).length; s.lastDraw = null; s.drewPlayable = null;
  if (s.up && c.type === 'n') { s.up.first = false; s.up.n = c.num; log(s, `⬆️ Up! Người kế phải đánh lá số ≥ ${c.num}.`); return endTurn(s, 1); }
  if (c.type === 'wtd4') {
    const t = getPlayer(s, s._target); s._target = null;
    if (!t || t.out || t === p) { s.pending = { type: 'target', player: p.id, card: c }; return; }
    if (s.rules.stackDraw) { // cộng dồn như lá rút thường, nhưng phạt bay thẳng tới người bị nhắm
      s.stack = { total: (s.stack ? s.stack.total : 0) + 4, last: 4, from: p.id };
      log(s, `🎯 ${p.name} nhắm ${t.name}: dồn phạt ${s.stack.total} lá!`); ev(s, 'aim', p.id, t.id, s.stack.total);
      s.turn = s.players.indexOf(t); return endTurn(s, 0);
    }
    log(s, `🎯 ${p.name} nhắm ${t.name}: tự bốc 4 lá!`); ev(s, 'aim', p.id, t.id, 4);
    return startOwe(s, t, { kind: 'stack', left: 4 }, s.turn, 1);
  }
  if (c.type === 'nou') {
    const f = s.stack && s.stack.from && getPlayer(s, s.stack.from);
    if (f && !f.out && f !== p) { s.stack.from = p.id; log(s, `🔄 NO U! ${p.name} dội ${s.stack.total} lá ngược về ${f.name}!`); ev(s, 'nou', p.id, f.id, s.stack.total); s.turn = s.players.indexOf(f); return endTurn(s, 0); }
    s.dir *= -1; log(s, `🔄 No U! Đảo chiều.`);
    return endTurn(s, n === 2 ? 2 : 1);
  }
  if (c.type === 'steal' || c.type === 'gift' || c.type === 'wswap') {
    const t = getPlayer(s, s._target); s._target = null;
    if (!t || t.out || t === p) { s.pending = { type: 'target', player: p.id, card: c }; return; }
    if (c.type === 'steal') {
      if (t.hand.length >= 2) { const x = t.hand.splice(Math.floor(rand() * t.hand.length), 1)[0]; p.hand.push(x); p.saidUno = false; log(s, `🫳 ${p.name} móc túi ${t.name}, lấy được 1 lá!`); ev(s, 'steal', p.id, t.id, 1); if (t.hand.length === 1 && !t.saidUno) s.unoWatch = t.id; }
      else { log(s, `🫳 ${p.name} móc túi ${t.name} nhưng túi rỗng!`); ev(s, 'steal', p.id, t.id, 0); }
    } else if (c.type === 'gift') {
      const max = Math.min(2, p.hand.length - 1); // phải giữ lại ít nhất 1 lá
      let give = (s._give || []).map(id => p.hand.find(x => x.id === id)).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).slice(0, max);
      if (give.length < max) { // tự chọn lá "xấu" nhất: lá số to, không đụng lá Đổi màu
        const rest = p.hand.filter(x => !give.includes(x)).sort((a, b) => (isWild(a) - isWild(b)) || ((b.type === 'n' ? b.num : 5) - (a.type === 'n' ? a.num : 5)));
        give = give.concat(rest.slice(0, max - give.length));
      }
      p.hand = p.hand.filter(x => !give.includes(x)); t.hand.push(...give); t.saidUno = false;
      log(s, `🎁 ${p.name} tặng ${t.name} ${give.length} lá. Quà nè!`); ev(s, 'gift', p.id, t.id, give.length);
      if (p.hand.length === 1 && !p.saidUno) s.unoWatch = p.id;
      checkMercy(s, t); if (s.phase !== 'playing') return;
    } else {
      [p.hand, t.hand] = [t.hand, p.hand]; p.saidUno = t.saidUno = false;
      log(s, `🤝 ${p.name} đổi nguyên tay bài với ${t.name}!`); ev(s, 'wswap', p.id, t.id);
      if (t.hand.length === 1) s.unoWatch = t.id;
    }
    s._give = null; return endTurn(s, 1);
  }
  if (c.type === 'shield' && s.stack) {
    s.stack.from = p.id; log(s, `🛡️ ${p.name} giơ Khiên! ${s.stack.total} lá phạt chuyển sang ${nameAt(s, 1)}.`);
    endTurn(s, 1); ev(s, 'shield', p.id, current(s).id, s.stack.total); return;
  }
  if (c.type === 'dq') {
    const t = s.players[nextIdx(s)];
    log(s, `❓ +?! ${t.name} bốc 1 lá: ra số mấy thì bốc thêm bấy nhiêu, lá chức năng thì được tha.`); ev(s, 'dq', p.id, t.id);
    return startOwe(s, t, { kind: 'mystery', left: 1 }, s.turn, 2);
  }
  if (c.type === 'tornado') {
    const t = s.players[nextIdx(s)];
    log(s, `🌪️ Bão tố! ${t.name} phải tự bốc tới khi ra màu ${COLOR_NAME[c.color]}!`); ev(s, 'tornado', p.id, t.id);
    return startOwe(s, t, { kind: 'tornado', until: c.color }, s.turn, 2);
  }
  if (c.type === 'wup') { s.up = { color: s.color, n: 0, first: true }; log(s, `⬆️ Up! Từ ${nameAt(s, 1)}: mỗi người đánh 1 lá số, số sau phải bằng hoặc lớn hơn số trước.`); return endTurn(s, 1); }
  const v = DRAW_VALUE[c.type];
  if (c.type === 'wrd4' || c.type === 'rev') {
    s.dir *= -1; log(s, `🔁 Đảo chiều!`);
    if (c.type === 'rev' && n === 2) { log(s, `${nameAt(s, 1)} bị mất lượt.`); return endTurn(s, 2); }
  }
  if (v) {
    if (s.rules.stackDraw) { s.stack = { total: (s.stack ? s.stack.total : 0) + v, last: v, from: p.id }; log(s, `➕ Dồn phạt: ${s.stack.total} lá cho ${nameAt(s, 1)}!`); endTurn(s, 1); ev(s, 'plus', p.id, current(s).id, s.stack.total); return; }
    const t = s.players[nextIdx(s)]; log(s, `😵 ${t.name} phải tự bốc ${v} lá và mất lượt!`); ev(s, 'plus', p.id, t.id, v);
    return startOwe(s, t, { kind: 'stack', left: v }, s.turn, 2);
  }
  switch (c.type) {
    case 'skip':
      if (s.rules.stackSkip) { s.skipStack = 1; log(s, `⛔ ${nameAt(s, 1)} bị khoá mõm (có thể chồng Khoá mõm để chuyền).`); ev(s, 'skip', p.id, s.players[nextIdx(s)].id); return endTurn(s, 1); }
      log(s, `🤐 ${nameAt(s, 1)} bị khoá mõm.`); ev(s, 'skip', p.id, s.players[nextIdx(s)].id); return endTurn(s, 2);
    case 'skipall': log(s, `🤐 Khoá mõm cả bàn! ${p.name} đi tiếp.`); return endTurn(s, 0);
    case 'roulette': { const t = s.players[nextIdx(s)]; ev(s, 'roulette', p.id, t.id); s.turn = nextIdx(s); s.pending = { type: 'roulette', player: t.id }; return; }
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
    if (!p.hand.some(c => c.type === 'skip')) { s.skipStack = 0; log(s, `🤐 ${p.name} bị khoá mõm.`); return endTurn(s, 1); }
  }
}

// ---------- View cho từng người ----------
export function viewFor(s, pid) {
  const me = getPlayer(s, pid);
  return {
    phase: s.phase, mode: s.mode, rules: s.rules, winner: s.winner, turn: s.turn, dir: s.dir, color: s.color, top: top(s),
    deckCount: s.deck.length, stack: s.stack, skipStack: s.skipStack, up: s.up, mustPlay: s.mustPlay, turnCount: s.turnCount,
    canPass: !!(s.lastDraw && s.lastDraw.player === pid), unoWatch: s.unoWatch,
    pending: s.pending ? { type: s.pending.type, player: s.pending.player, card: s.pending.card ? s.pending.card.type : null } : null,
    owe: s.owe ? { player: s.owe.player, got: s.owe.got, left: s.owe.left, until: s.owe.until, kind: s.owe.kind, reveal: s.owe.reveal } : null,
    log: s.log.slice(-40), logN: s.logN || 0, fx: (s.fx || []).slice(-8), fxN: s.fxN || 0, me: pid, lastDraw: s.lastDraw && s.lastDraw.player === pid ? s.lastDraw.card : null,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, out: p.out, handCount: p.hand.length, saidUno: p.saidUno, hand: p === me ? p.hand : null })),
    playable: playableIds(s, pid),
  };
}

// ---------- Tính điểm nhiều ván (tuỳ chọn "Tính điểm tới 500") ----------
// Người về nhất cộng điểm theo bài còn trên tay người khác: lá số = mặt số, lá chức năng màu = 20,
// lá đổi màu / +4 / lá mở rộng = 50.
const ACTION20 = ['skip', 'rev', 'd2', 'skipall', 'discall'];
export function cardPoints(c) { return c.type === 'n' ? c.num : ACTION20.includes(c.type) ? 20 : 50; }
export const MATCH_TARGETS = [200, 300, 500];
export function newMatch(on = false, target = 500) { return { on: !!on, target: MATCH_TARGETS.includes(+target) ? +target : 500, round: 0, scores: {}, last: null, champion: null }; }
// Gọi khi ván kết thúc: cộng điểm đúng 1 lần (đánh dấu s.scored). Trả về kết quả ván hoặc null.
export function recordRound(m, s) {
  if (!m || !m.on || s.phase !== 'ended' || s.scored) return null;
  s.scored = true;
  const detail = {}; let gained = 0;
  for (const p of s.players) {
    const pts = p.hand.reduce((t, c) => t + cardPoints(c), 0);
    detail[p.id] = { cards: p.hand.length, pts, out: !!p.out };
    if (p.id !== s.winner) gained += pts;
  }
  m.round++; m.scores[s.winner] = (m.scores[s.winner] || 0) + gained;
  m.last = { round: m.round, winner: s.winner, gained, detail };
  if (m.scores[s.winner] >= m.target) m.champion = s.winner;
  return m.last;
}
