// Engine luật Bang! – thuần logic, không dính mạng/UI.
// Host chạy engine; client chỉ gửi action và nhận view.
import { buildDeck, CARD_INFO, CHARACTERS, ROLES, rolesFor, cardLabel, SUIT_SYMBOL, rankLabel } from './cards.js';

let rand = Math.random;
export function setRandom(fn) { rand = fn; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(a) { return a[Math.floor(rand() * a.length)]; }

// ---------- Khởi tạo ----------
export function createGame(playerList) {
  // playerList: [{id, name, isBot}]
  const n = playerList.length;
  const roles = rolesFor(n);
  if (!roles) throw new Error('Cần 4–7 người chơi');
  shuffle(roles);
  const chars = shuffle(Object.keys(CHARACTERS)).slice(0, n);
  const state = {
    phase: 'playing', players: [], deck: shuffle(buildDeck()), discard: [],
    turn: 0, step: 'play', pending: [], log: [], winner: null, turnCount: 0,
  };
  playerList.forEach((pl, i) => {
    const role = roles[i], ch = chars[i];
    const maxHp = CHARACTERS[ch].hp + (role === 'sheriff' ? 1 : 0);
    state.players.push({ id: pl.id, name: pl.name, isBot: !!pl.isBot, role, character: ch,
      hp: maxHp, maxHp, hand: [], table: [], alive: true, bangs: 0, revealed: role === 'sheriff' });
  });
  state.turn = state.players.findIndex(p => p.role === 'sheriff');
  for (const p of state.players) for (let i = 0; i < p.hp; i++) p.hand.push(drawFromDeck(state));
  log(state, `Ván mới bắt đầu. ${name(sheriffOf(state))} là Cảnh sát trưởng.`);
  beginTurn(state);
  return state;
}

// ---------- Tiện ích ----------
function log(s, msg) { s.log.push(msg); if (s.log.length > 200) s.log.shift(); }
function name(p) { return p ? p.name : '?'; }
function sheriffOf(s) { return s.players.find(p => p.role === 'sheriff'); }
export function getPlayer(s, id) { return s.players.find(p => p.id === id); }
export function current(s) { return s.players[s.turn]; }
export function alivePlayers(s) { return s.players.filter(p => p.alive); }
function hasTable(p, type) { return p.table.some(c => c.type === type); }
function gunOf(p) { return p.table.find(c => CARD_INFO[c.type].kind === 'gun'); }
function gunRange(p) { const g = gunOf(p); return g ? CARD_INFO[g.type].range : 1; }
export function topPrompt(s) { return s.pending.length ? s.pending[s.pending.length - 1] : null; }

function drawFromDeck(s) {
  if (!s.deck.length) {
    if (!s.discard.length) return null;
    const top = s.discard.pop(); // giữ lá trên cùng chồng bỏ
    s.deck = shuffle(s.discard); s.discard = top ? [top] : [];
    log(s, 'Hết bài, xào lại chồng bài bỏ.');
  }
  return s.deck.pop() || null;
}
function giveCards(s, p, k) { for (let i = 0; i < k; i++) { const c = drawFromDeck(s); if (c) p.hand.push(c); } }
function removeCard(p, cardId) {
  let i = p.hand.findIndex(c => c.id === cardId);
  if (i >= 0) return p.hand.splice(i, 1)[0];
  i = p.table.findIndex(c => c.id === cardId);
  if (i >= 0) return p.table.splice(i, 1)[0];
  return null;
}
function discardCard(s, p, cardId) { const c = removeCard(p, cardId); if (c) s.discard.push(c); return c; }

// Khoảng cách từ a nhìn b
export function distance(s, a, b) {
  const al = alivePlayers(s);
  const i = al.indexOf(a), j = al.indexOf(b);
  if (i < 0 || j < 0 || a === b) return 0;
  const raw = Math.abs(i - j); let d = Math.min(raw, al.length - raw);
  if (hasTable(b, 'mustang') || b.character === 'paulregret') d++;
  if (hasTable(a, 'scope') || a.character === 'rosedoolan') d--;
  return Math.max(1, d);
}

// "Lật bài" (draw!) – Lucky Duke lật 2 chọn 1
function drawCheck(s, p, predicate, what) {
  const n = p.character === 'luckyduke' ? 2 : 1;
  const flipped = [];
  for (let i = 0; i < n; i++) { const c = drawFromDeck(s); if (c) flipped.push(c); }
  let chosen = flipped.find(predicate) || flipped[0];
  for (const c of flipped) s.discard.push(c);
  if (!chosen) return false;
  const ok = predicate(chosen);
  log(s, `${name(p)} lật bài (${what}): ${SUIT_SYMBOL[chosen.suit]}${rankLabel(chosen.rank)} → ${ok ? 'thành công' : 'thất bại'}.`);
  return ok;
}
const isHeart = c => c.suit === 'H';

// ---------- Lượt chơi ----------
function beginTurn(s) {
  const p = current(s);
  p.bangs = 0; s.turnCount++;
  log(s, `— Lượt của ${name(p)} —`);
  // Thuốc nổ
  const dyn = p.table.find(c => c.type === 'dynamite');
  if (dyn) {
    const boom = drawCheck(s, p, c => c.suit === 'S' && c.rank >= 2 && c.rank <= 9, 'Thuốc nổ');
    if (boom) {
      discardCard(s, p, dyn.id);
      log(s, `💥 Thuốc nổ nổ! ${name(p)} mất 3 máu.`);
      damage(s, p, 3, null);
      if (!p.alive) return; // post() sẽ chuyển lượt
    } else {
      removeCard(p, dyn.id);
      const al = alivePlayers(s); const nxt = al[(al.indexOf(p) + 1) % al.length];
      nxt.table.push(dyn);
      log(s, `Thuốc nổ chuyền sang ${name(nxt)}.`);
    }
  }
  // Nhà tù
  const jail = p.table.find(c => c.type === 'jail');
  if (jail) {
    const free = drawCheck(s, p, isHeart, 'Nhà tù');
    discardCard(s, p, jail.id);
    if (!free) { log(s, `${name(p)} bị giam, mất lượt.`); s.step = 'skipped'; nextTurn(s); return; }
    log(s, `${name(p)} thoát khỏi Nhà tù.`);
  }
  // Rút bài
  if (p.character === 'jessejones' || p.character === 'pedroramirez' || p.character === 'kitcarlson') {
    const prompt = { type: 'draw_option', player: p.id, character: p.character };
    if (p.character === 'kitcarlson') {
      prompt.cards = []; for (let i = 0; i < 3; i++) { const c = drawFromDeck(s); if (c) prompt.cards.push(c); }
    }
    s.step = 'draw'; s.pending.push(prompt); return;
  }
  normalDraw(s, p); s.step = 'play';
}

function normalDraw(s, p) {
  const c1 = drawFromDeck(s); if (c1) p.hand.push(c1);
  const c2 = drawFromDeck(s); if (c2) p.hand.push(c2);
  if (p.character === 'blackjack' && c2) {
    log(s, `Black Jack lật lá thứ 2: ${cardLabel(c2)}.`);
    if (c2.suit === 'H' || c2.suit === 'D') { giveCards(s, p, 1); log(s, `Lá đỏ → Black Jack rút thêm 1 lá.`); }
  }
  log(s, `${name(p)} rút 2 lá.`);
}

function nextTurn(s) {
  if (s.phase !== 'playing') return;
  const n = s.players.length; let i = s.turn;
  for (let k = 0; k < n; k++) { i = (i + 1) % n; if (s.players[i].alive) break; }
  s.turn = i; s.step = 'play';
  beginTurn(s);
}

// ---------- Sát thương / chết ----------
function damage(s, target, amount, source) {
  if (!target.alive) return;
  for (let i = 0; i < amount; i++) {
    target.hp--;
    if (target.character === 'bartcassidy') { giveCards(s, target, 1); log(s, `Bart Cassidy rút 1 lá vì mất máu.`); }
    if (target.character === 'elgringo' && source && source !== target && source.hand.length) {
      const c = pick(source.hand); removeCard(source, c.id); target.hand.push(c);
      log(s, `El Gringo lấy 1 lá từ tay ${name(source)}.`);
    }
  }
  log(s, `${name(target)} mất ${amount} máu (còn ${Math.max(0, target.hp)}).`);
  if (target.hp <= 0) {
    // Tự dùng Bia cứu mạng
    while (target.hp <= 0 && alivePlayers(s).length > 2) {
      const beer = target.hand.find(c => c.type === 'beer');
      if (!beer) break;
      discardCard(s, target, beer.id); target.hp++;
      log(s, `🍺 ${name(target)} uống Bia để sống sót!`);
    }
    if (target.hp <= 0) killPlayer(s, target, source);
  }
}

function killPlayer(s, p, killer) {
  p.alive = false; p.hp = 0; p.revealed = true;
  log(s, `☠️ ${name(p)} bị loại! Vai trò: ${ROLES[p.role].name}.`);
  const vulture = s.players.find(q => q.alive && q.character === 'vulturesam');
  const cards = [...p.hand, ...p.table]; p.hand = []; p.table = [];
  if (vulture) { vulture.hand.push(...cards); log(s, `Vulture Sam lấy hết bài của ${name(p)}.`); }
  else s.discard.push(...cards);
  // Bỏ prompt của người chết
  s.pending = s.pending.filter(pr => {
    if (pr.queue) { pr.queue = pr.queue.filter(id => id !== p.id); if (pr.queue.length) { pr.player = pr.queue[0]; return true; } return false; }
    return pr.player !== p.id;
  });
  // Thưởng / phạt
  if (killer && killer !== p && killer.alive) {
    if (p.role === 'outlaw') { giveCards(s, killer, 3); log(s, `${name(killer)} giết Tội phạm, rút 3 lá.`); }
    if (killer.role === 'sheriff' && p.role === 'deputy') {
      s.discard.push(...killer.hand, ...killer.table); killer.hand = []; killer.table = [];
      log(s, `Cảnh sát trưởng giết nhầm Phó, phải bỏ hết bài!`);
    }
  }
  checkWin(s);
}

function checkWin(s) {
  const al = alivePlayers(s);
  const sheriff = sheriffOf(s);
  if (!sheriff.alive) {
    if (al.length === 1 && al[0].role === 'renegade') endGame(s, 'renegade', 'Kẻ hai mặt là người sống sót cuối cùng!');
    else endGame(s, 'outlaw', 'Cảnh sát trưởng đã chết. Tội phạm thắng!');
    return;
  }
  if (!al.some(p => p.role === 'outlaw' || p.role === 'renegade')) endGame(s, 'law', 'Hết Tội phạm và Kẻ hai mặt. Phe Cảnh sát thắng!');
}
function endGame(s, winner, msg) { s.phase = 'ended'; s.winner = winner; s.pending = []; for (const p of s.players) p.revealed = true; log(s, `🏆 ${msg}`); }

// ---------- Kiểm tra đánh bài ----------
export function getPlayOptions(s, pid, cardId) {
  const p = getPlayer(s, pid);
  if (!p || !p.alive || s.phase !== 'playing') return { ok: false, reason: 'Không thể đánh.' };
  if (current(s) !== p || s.step !== 'play' || s.pending.length) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const c = p.hand.find(x => x.id === cardId);
  if (!c) return { ok: false, reason: 'Không có lá này.' };
  const others = alivePlayers(s).filter(q => q !== p);
  let type = c.type;
  if (p.character === 'calamityjanet' && type === 'missed') type = 'bang';
  switch (type) {
    case 'bang': {
      const unlimited = p.character === 'willythekid' || hasTable(p, 'volcanic');
      if (!unlimited && p.bangs >= 1) return { ok: false, reason: 'Mỗi lượt chỉ bắn được 1 lần.' };
      const targets = others.filter(q => distance(s, p, q) <= gunRange(p)).map(q => q.id);
      if (!targets.length) return { ok: false, reason: 'Không ai trong tầm bắn.' };
      return { ok: true, targetMode: 'player', targets };
    }
    case 'missed': return { ok: false, reason: 'Hụt! chỉ dùng khi bị bắn.' };
    case 'beer':
      if (alivePlayers(s).length <= 2) return { ok: false, reason: 'Còn 2 người, Bia vô hiệu.' };
      if (p.hp >= p.maxHp) return { ok: false, reason: 'Máu đã đầy.' };
      return { ok: true, targetMode: 'none' };
    case 'panic': {
      const targets = others.filter(q => distance(s, p, q) <= 1 && (q.hand.length || q.table.length)).map(q => q.id);
      if (!targets.length) return { ok: false, reason: 'Không ai ở khoảng cách 1 có bài.' };
      return { ok: true, targetMode: 'player', targets, pickCard: true };
    }
    case 'catbalou': {
      const targets = others.filter(q => q.hand.length || q.table.length).map(q => q.id);
      if (!targets.length) return { ok: false, reason: 'Không ai có bài.' };
      return { ok: true, targetMode: 'player', targets, pickCard: true };
    }
    case 'duel': return { ok: true, targetMode: 'player', targets: others.map(q => q.id) };
    case 'jail': {
      const targets = others.filter(q => q.role !== 'sheriff' && !hasTable(q, 'jail')).map(q => q.id);
      if (!targets.length) return { ok: false, reason: 'Không ai có thể bị giam.' };
      return { ok: true, targetMode: 'player', targets };
    }
    case 'stagecoach': case 'wellsfargo': case 'store': case 'saloon': case 'indians': case 'gatling':
      return { ok: true, targetMode: 'none' };
    case 'dynamite': case 'barrel': case 'scope': case 'mustang':
      if (hasTable(p, type)) return { ok: false, reason: 'Đã có lá này trên bàn.' };
      return { ok: true, targetMode: 'none' };
    default:
      if (CARD_INFO[type].kind === 'gun') return { ok: true, targetMode: 'none' };
      return { ok: false, reason: 'Lá không hợp lệ.' };
  }
}

// ---------- Áp dụng action ----------
// action: {type, cardId?, target?, pick?, keep?, cardIds?}
export function applyAction(s, pid, action) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const p = getPlayer(s, pid);
  if (!p || !p.alive) return { ok: false, reason: 'Bạn đã bị loại.' };
  const prompt = topPrompt(s);
  let r;
  try {
    if (prompt) {
      if (prompt.player !== pid) return { ok: false, reason: 'Đang chờ người khác.' };
      r = handlePromptAction(s, p, prompt, action);
    } else {
      if (current(s) !== p) return { ok: false, reason: 'Chưa tới lượt bạn.' };
      r = handleTurnAction(s, p, action);
    }
  } catch (e) { return { ok: false, reason: 'Lỗi: ' + e.message }; }
  if (r && r.ok === false) return r;
  post(s);
  return { ok: true };
}

function post(s) {
  if (s.phase !== 'playing') return;
  // Suzy Lafayette
  for (const p of alivePlayers(s)) if (p.character === 'suzylafayette' && !p.hand.length) { giveCards(s, p, 1); log(s, `Suzy Lafayette hết bài, rút 1 lá.`); }
  // Dọn prompt của người chết / rỗng
  s.pending = s.pending.filter(pr => { const q = getPlayer(s, pr.player); return q && q.alive; });
  if (!current(s).alive && !s.pending.length) nextTurn(s);
}

function handleTurnAction(s, p, a) {
  if (s.step !== 'play') return { ok: false, reason: 'Chưa thể hành động.' };
  switch (a.type) {
    case 'play_card': return playCard(s, p, a);
    case 'ability_sid': {
      if (p.character !== 'sidketchum') return { ok: false, reason: 'Không có kỹ năng này.' };
      if (!a.cardIds || a.cardIds.length !== 2) return { ok: false, reason: 'Chọn đúng 2 lá.' };
      if (p.hp >= p.maxHp) return { ok: false, reason: 'Máu đã đầy.' };
      for (const id of a.cardIds) if (!p.hand.some(c => c.id === id)) return { ok: false, reason: 'Không có lá này.' };
      for (const id of a.cardIds) discardCard(s, p, id);
      p.hp++; log(s, `Sid Ketchum bỏ 2 lá, hồi 1 máu.`); return { ok: true };
    }
    case 'end_turn':
      if (p.hand.length > p.hp) { s.step = 'discard'; s.pending.push({ type: 'discard', player: p.id }); return { ok: true }; }
      nextTurn(s); return { ok: true };
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}

function playCard(s, p, a) {
  const opt = getPlayOptions(s, p.id, a.cardId);
  if (!opt.ok) return opt;
  const c = p.hand.find(x => x.id === a.cardId);
  let type = c.type;
  if (p.character === 'calamityjanet' && type === 'missed') type = 'bang';
  let target = null;
  if (opt.targetMode === 'player') {
    target = getPlayer(s, a.target);
    if (!target || !opt.targets.includes(a.target)) return { ok: false, reason: 'Mục tiêu không hợp lệ.' };
  }
  const info = CARD_INFO[c.type];
  const others = alivePlayers(s).filter(q => q !== p);

  switch (type) {
    case 'bang': {
      discardCard(s, p, c.id); p.bangs++;
      log(s, `${name(p)} 💥 bắn ${name(target)}!`);
      pushShot(s, p, target, p.character === 'slabthekiller' ? 2 : 1, 'bang');
      break;
    }
    case 'beer': discardCard(s, p, c.id); p.hp++; log(s, `${name(p)} uống Bia, hồi 1 máu.`); break;
    case 'panic': case 'catbalou': {
      discardCard(s, p, c.id);
      let taken;
      if (a.pick && a.pick !== 'hand') {
        taken = removeCard(target, a.pick);
        if (!taken) return { ok: false, reason: 'Lá đó không có trên bàn.' }; // (bài đã bỏ ra; chấp nhận rủi ro nhỏ)
      } else {
        if (!target.hand.length) { const tc = target.table[0]; taken = removeCard(target, tc.id); }
        else { const rc = pick(target.hand); taken = removeCard(target, rc.id); }
      }
      if (type === 'panic') { p.hand.push(taken); log(s, `${name(p)} dùng Hoảng loạn! lấy 1 lá của ${name(target)}.`); }
      else { s.discard.push(taken); log(s, `${name(p)} dùng Cat Balou, ${name(target)} phải bỏ ${cardLabel(taken)}.`); }
      break;
    }
    case 'stagecoach': discardCard(s, p, c.id); giveCards(s, p, 2); log(s, `${name(p)} dùng Xe ngựa, rút 2 lá.`); break;
    case 'wellsfargo': discardCard(s, p, c.id); giveCards(s, p, 3); log(s, `${name(p)} dùng Wells Fargo, rút 3 lá.`); break;
    case 'saloon': discardCard(s, p, c.id); for (const q of alivePlayers(s)) if (q.hp < q.maxHp) q.hp++; log(s, `${name(p)} mở Quán rượu, ai cũng hồi 1 máu.`); break;
    case 'store': {
      discardCard(s, p, c.id);
      const al = alivePlayers(s); const start = al.indexOf(p);
      const queue = []; for (let i = 0; i < al.length; i++) queue.push(al[(start + i) % al.length].id);
      const cards = []; for (let i = 0; i < al.length; i++) { const d = drawFromDeck(s); if (d) cards.push(d); }
      log(s, `${name(p)} mở Tạp hóa: ${cards.map(cardLabel).join(', ')}.`);
      s.pending.push({ type: 'store', player: queue[0], queue, cards });
      break;
    }
    case 'indians': {
      discardCard(s, p, c.id); log(s, `${name(p)} gọi Thổ dân! tấn công tất cả.`);
      const queue = orderFrom(s, p).map(q => q.id);
      if (queue.length) s.pending.push({ type: 'respond', kind: 'indians', source: p.id, player: queue[0], queue, need: 1 });
      break;
    }
    case 'gatling': {
      discardCard(s, p, c.id); log(s, `${name(p)} quét Súng Gatling!`);
      const queue = orderFrom(s, p);
      // mỗi người: thùng rượu tự động, rồi vào hàng chờ nếu chưa né
      const need = {};
      const ids = [];
      for (const q of queue) { const n = 1 - barrelSaves(s, q, 1); if (n > 0) { ids.push(q.id); need[q.id] = n; } else log(s, `${name(q)} né được nhờ Thùng rượu.`); }
      if (ids.length) s.pending.push({ type: 'respond', kind: 'gatling', source: p.id, player: ids[0], queue: ids, need: 1, needMap: need });
      break;
    }
    case 'duel': {
      discardCard(s, p, c.id); log(s, `${name(p)} thách ${name(target)} Đấu súng!`);
      s.pending.push({ type: 'respond', kind: 'duel', player: target.id, other: p.id, source: p.id });
      break;
    }
    case 'jail': {
      removeCard(p, c.id); target.table.push(c); log(s, `${name(p)} nhốt ${name(target)} vào Nhà tù.`); break;
    }
    default: {
      // bài xanh để trước mặt
      removeCard(p, c.id);
      if (info.kind === 'gun') { const g = gunOf(p); if (g) discardCard(s, p, g.id); }
      p.table.push(c); log(s, `${name(p)} trang bị ${info.name}.`);
    }
  }
  return { ok: true };
}

function orderFrom(s, p) { const al = alivePlayers(s); const i = al.indexOf(p); const out = []; for (let k = 1; k < al.length; k++) out.push(al[(i + k) % al.length]); return out; }

// Thùng rượu: trả về số lần né thành công (tối đa `need`)
function barrelSaves(s, q, need) {
  let saves = 0;
  const checks = (hasTable(q, 'barrel') ? 1 : 0) + (q.character === 'jourdonnais' ? 1 : 0);
  for (let i = 0; i < checks && saves < need; i++) if (drawCheck(s, q, isHeart, 'Thùng rượu')) saves++;
  return saves;
}

function pushShot(s, source, target, need, kind) {
  need -= barrelSaves(s, target, need);
  if (need <= 0) { log(s, `${name(target)} né được nhờ Thùng rượu.`); return; }
  s.pending.push({ type: 'respond', kind, source: source.id, player: target.id, need });
}

// ---------- Xử lý prompt ----------
function handlePromptAction(s, p, pr, a) {
  switch (pr.type) {
    case 'draw_option': {
      if (pr.character === 'kitcarlson') {
        if (a.type !== 'kit_choose' || !a.keep || a.keep.length !== 2) return { ok: false, reason: 'Chọn 2 lá để giữ.' };
        const keep = pr.cards.filter(c => a.keep.includes(c.id));
        if (keep.length !== 2) return { ok: false, reason: 'Lá không hợp lệ.' };
        const back = pr.cards.find(c => !a.keep.includes(c.id));
        p.hand.push(...keep); if (back) s.deck.push(back);
        log(s, `Kit Carlson xem 3 lá, giữ 2.`);
        s.pending.pop(); s.step = 'play'; return { ok: true };
      }
      if (a.type === 'draw_from_deck') { normalDraw(s, p); s.pending.pop(); s.step = 'play'; return { ok: true }; }
      if (a.type === 'draw_from_player' && pr.character === 'jessejones') {
        const t = getPlayer(s, a.target);
        if (!t || !t.alive || t === p || !t.hand.length) return { ok: false, reason: 'Người đó không có bài.' };
        const c = pick(t.hand); removeCard(t, c.id); p.hand.push(c); giveCards(s, p, 1);
        log(s, `Jesse Jones rút 1 lá từ tay ${name(t)} và 1 lá từ bộ bài.`);
        s.pending.pop(); s.step = 'play'; return { ok: true };
      }
      if (a.type === 'draw_from_discard' && pr.character === 'pedroramirez') {
        if (!s.discard.length) return { ok: false, reason: 'Chồng bài bỏ trống.' };
        const c = s.discard.pop(); p.hand.push(c); giveCards(s, p, 1);
        log(s, `Pedro Ramirez lấy ${cardLabel(c)} từ chồng bỏ và rút 1 lá.`);
        s.pending.pop(); s.step = 'play'; return { ok: true };
      }
      return { ok: false, reason: 'Hành động không hợp lệ.' };
    }
    case 'discard': {
      if (a.type !== 'discard_card') return { ok: false, reason: 'Phải bỏ bài.' };
      if (!discardCard(s, p, a.cardId)) return { ok: false, reason: 'Không có lá này.' };
      if (p.hand.length <= p.hp) { s.pending.pop(); nextTurn(s); }
      return { ok: true };
    }
    case 'store': {
      if (a.type !== 'store_pick') return { ok: false, reason: 'Chọn 1 lá.' };
      const i = pr.cards.findIndex(c => c.id === a.cardId);
      if (i < 0) return { ok: false, reason: 'Lá không hợp lệ.' };
      const c = pr.cards.splice(i, 1)[0]; p.hand.push(c);
      log(s, `${name(p)} lấy ${cardLabel(c)} từ Tạp hóa.`);
      pr.queue.shift();
      while (pr.queue.length && pr.cards.length) {
        const q = getPlayer(s, pr.queue[0]);
        if (!q || !q.alive) { pr.queue.shift(); continue; }
        if (pr.cards.length === 1) { q.hand.push(pr.cards.pop()); log(s, `${name(q)} lấy lá cuối từ Tạp hóa.`); pr.queue.shift(); continue; }
        pr.player = q.id; return { ok: true };
      }
      s.discard.push(...pr.cards); s.pending.pop(); return { ok: true };
    }
    case 'respond': return handleRespond(s, p, pr, a);
    default: return { ok: false, reason: 'Prompt lạ.' };
  }
}

// Lá nào dùng để né / đáp trả
export function responseCards(p, kind) {
  const janet = p.character === 'calamityjanet';
  if (kind === 'bang' || kind === 'gatling') return p.hand.filter(c => c.type === 'missed' || (janet && c.type === 'bang'));
  return p.hand.filter(c => c.type === 'bang' || (janet && c.type === 'missed')); // indians, duel
}

function handleRespond(s, p, pr, a) {
  const source = getPlayer(s, pr.source);
  const advanceQueue = () => {
    if (pr.queue) {
      pr.queue.shift();
      if (pr.queue.length) { pr.player = pr.queue[0]; pr.need = pr.needMap ? pr.needMap[pr.player] : 1; return; }
    }
    s.pending.pop();
  };
  if (a.type === 'take_hit') {
    if (pr.kind === 'duel') { log(s, `${name(p)} thua Đấu súng.`); s.pending.pop(); damage(s, p, 1, getPlayer(s, pr.other)); return { ok: true }; }
    log(s, `${name(p)} trúng đòn.`);
    advanceQueue(); damage(s, p, 1, source); return { ok: true };
  }
  if (a.type !== 'respond_card') return { ok: false, reason: 'Chọn lá đáp trả hoặc chịu đòn.' };
  const c = responseCards(p, pr.kind).find(x => x.id === a.cardId);
  if (!c) return { ok: false, reason: 'Lá này không dùng được.' };
  discardCard(s, p, c.id);
  if (pr.kind === 'duel') {
    log(s, `${name(p)} bỏ ${cardLabel(c)} trong Đấu súng.`);
    const other = pr.other; pr.other = pr.player; pr.player = other; return { ok: true };
  }
  if (pr.kind === 'indians') { log(s, `${name(p)} bỏ Bắn! chống Thổ dân.`); advanceQueue(); return { ok: true }; }
  // bang / gatling
  pr.need--;
  log(s, `${name(p)} đánh ${cardLabel(c)} né đạn.`);
  if (pr.need <= 0) { advanceQueue(); }
  return { ok: true };
}

// ---------- View cho từng người chơi ----------
export function viewFor(s, pid) {
  const me = getPlayer(s, pid);
  const pr = topPrompt(s);
  return {
    phase: s.phase, winner: s.winner, turn: s.turn, step: s.step, turnCount: s.turnCount,
    deckCount: s.deck.length, discardTop: s.discard.length ? s.discard[s.discard.length - 1] : null, discardCount: s.discard.length,
    log: s.log.slice(-40),
    me: pid,
    players: s.players.map(p => ({
      id: p.id, name: p.name, isBot: p.isBot, hp: p.hp, maxHp: p.maxHp, alive: p.alive, character: p.character,
      role: (p.revealed || p === me) ? p.role : null,
      hand: p === me ? p.hand : null, handCount: p.hand.length, table: p.table, bangs: p.bangs,
      distance: me && me.alive && p.alive && p !== me ? distance(s, me, p) : null,
      gunRange: gunRange(p),
    })),
    prompt: pr ? sanitizePrompt(pr, pid) : null,
    myOptions: me && me.alive && !pr && current(s) === me && s.step === 'play'
      ? Object.fromEntries(me.hand.map(c => [c.id, getPlayOptions(s, pid, c.id)])) : null,
    myResponses: pr && pr.player === pid && pr.type === 'respond' ? responseCards(me, pr.kind).map(c => c.id) : null,
    canSid: me && me.alive && !pr && current(s) === me && s.step === 'play' && me.character === 'sidketchum' && me.hp < me.maxHp && me.hand.length >= 2,
  };
}
function sanitizePrompt(pr, pid) {
  const out = { ...pr };
  if (pr.type === 'draw_option' && pr.player !== pid) delete out.cards;
  return out;
}
