// Luật Ma Sói – thuần logic, JSON-serializable. Máy làm quản trò.
// Chủ phòng (net.js) giữ đồng hồ: gọi timeout(s) khi hết giờ pha, hỏi actors(s) để biết ai cần hành động.
let rand = Math.random;
export function setRandom(fn) { rand = fn; }
const pick = a => a[Math.floor(rand() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------- VAI ----------------
// team: wolf | village | tanner (phe riêng). seerSees: kết quả Tiên tri thấy.
export const ROLES = {
  wolf:     { name: 'Ma Sói',        emoji: '🐺', team: 'wolf',    color: '#c0392b', short: 'Mỗi đêm cùng bầy cắn 1 người.' },
  alpha:    { name: 'Sói Trùm',      emoji: '👑', team: 'wolf',    color: '#6d1f2f', short: 'Sói đầu đàn – Tiên tri soi ra “Dân”.', seerSees: 'village' },
  cub:      { name: 'Sói Con',       emoji: '🐾', team: 'wolf',    color: '#d35400', short: 'Sói nhỏ – nếu bị giết, đêm sau bầy sói cắn 2 người.', fun: true },
  villager: { name: 'Dân Làng',      emoji: '🧑‍🌾', team: 'village', color: '#3f8f4f', short: 'Không có phép. Vũ khí: cái mồm và lá phiếu.' },
  seer:     { name: 'Tiên Tri',      emoji: '🔮', team: 'village', color: '#7b4bc4', short: 'Mỗi đêm soi 1 người: Sói hay không.' },
  guard:    { name: 'Bảo Vệ',        emoji: '🛡️', team: 'village', color: '#2a6fb5', short: 'Mỗi đêm che chở 1 người khỏi sói. Không 2 đêm liền cùng người.' },
  witch:    { name: 'Phù Thủy',      emoji: '🧪', team: 'village', color: '#1f8f7a', short: '1 bình cứu + 1 bình độc, mỗi bình dùng 1 lần cả ván.' },
  hunter:   { name: 'Thợ Săn',       emoji: '🏹', team: 'village', color: '#8a5a2b', short: 'Khi chết được kéo theo 1 người (trừ khi bị đầu độc).' },
  cupid:    { name: 'Thần Tình Yêu', emoji: '💘', team: 'village', color: '#e05487', short: 'Đêm đầu ghép đôi 2 người. Một người chết, người kia chết theo.' },
  elder:    { name: 'Già Làng',      emoji: '👴', team: 'village', color: '#b8892b', short: 'Da dày: chịu được 1 lần sói cắn.' },
  idiot:    { name: 'Kẻ Ngốc',       emoji: '🤪', team: 'village', color: '#e08a1e', short: 'Bị treo cổ thì lộ vai, sống tiếp nhưng mất quyền bỏ phiếu.' },
  tanner:   { name: 'Thằng Chán Đời', emoji: '🥀', team: 'tanner',  color: '#6b7280', short: 'Thắng MỘT MÌNH nếu bị dân làng treo cổ.', fun: true },
};
export const ROLE_ORDER = ['wolf', 'alpha', 'cub', 'seer', 'guard', 'witch', 'hunter', 'cupid', 'elder', 'idiot', 'tanner', 'villager'];
export const isWolfRole = r => ROLES[r] && ROLES[r].team === 'wolf';
export const TEAM_NAME = { wolf: 'Phe Sói', village: 'Phe Dân Làng', lovers: 'Cặp Đôi', tanner: 'Thằng Chán Đời', draw: 'Hoà' };
export const MIN_PLAYERS = 5, MAX_PLAYERS = 16;

// bộ vai gợi ý (không kể Dân Làng – tự lấp phần còn lại)
const PRESETS = {
  5: { wolf: 1, seer: 1, guard: 1 },
  6: { wolf: 1, seer: 1, guard: 1, hunter: 1 },
  7: { wolf: 2, seer: 1, guard: 1, witch: 1, hunter: 1 },
  8: { wolf: 2, seer: 1, guard: 1, witch: 1, hunter: 1, cupid: 1 },
  9: { wolf: 2, seer: 1, guard: 1, witch: 1, hunter: 1, cupid: 1, idiot: 1 },
  10: { wolf: 2, seer: 1, guard: 1, witch: 1, hunter: 1, cupid: 1, idiot: 1 },
  11: { wolf: 2, alpha: 1, seer: 1, guard: 1, witch: 1, hunter: 1, cupid: 1, idiot: 1 },
  12: { wolf: 2, alpha: 1, seer: 1, guard: 1, witch: 1, hunter: 1, cupid: 1, idiot: 1, elder: 1 },
  13: { wolf: 2, alpha: 1, cub: 1, seer: 1, guard: 1, witch: 1, hunter: 1, cupid: 1, idiot: 1, elder: 1 },
  14: { wolf: 2, alpha: 1, cub: 1, seer: 1, guard: 1, witch: 1, hunter: 1, cupid: 1, idiot: 1, elder: 1 },
  15: { wolf: 2, alpha: 1, cub: 1, seer: 1, guard: 1, witch: 1, hunter: 1, cupid: 1, idiot: 1, elder: 1, tanner: 1 },
  16: { wolf: 2, alpha: 1, cub: 1, seer: 1, guard: 1, witch: 1, hunter: 1, cupid: 1, idiot: 1, elder: 1, tanner: 1 },
};
export function presetRoles(n) { return { ...PRESETS[Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, n))] }; }
// danh sách vai đầy đủ (có Dân Làng lấp chỗ) + kiểm tra hợp lệ
export function roleList(n, roles) {
  const list = [];
  for (const r of ROLE_ORDER) if (r !== 'villager') for (let i = 0; i < (+roles[r] || 0); i++) list.push(r);
  const wolves = list.filter(isWolfRole).length;
  if (n < MIN_PLAYERS) return { ok: false, reason: `Cần ít nhất ${MIN_PLAYERS} người (thêm bot nhé).`, list };
  if (n > MAX_PLAYERS) return { ok: false, reason: `Tối đa ${MAX_PLAYERS} người.`, list };
  if (!wolves) return { ok: false, reason: 'Phải có ít nhất 1 con Sói.', list };
  if (wolves * 2 >= n) return { ok: false, reason: 'Sói quá đông – phải ít hơn một nửa số người.', list };
  if (list.length > n) return { ok: false, reason: `Bộ vai có ${list.length} vai đặc biệt nhưng chỉ có ${n} người.`, list };
  while (list.length < n) list.push('villager');
  return { ok: true, list, wolves };
}

export const DEFAULT_OPTS = {
  auto: true,            // tự gợi ý bộ vai theo số người
  roles: presetRoles(8),
  reveal: false,         // lộ vai khi chết
  voteMode: 'open',      // open | secret
  tie: 'revote',         // revote (bầu lại 1 lần giữa những người hoà) | none (hoà thì không ai bị treo)
  doubleSave: 'live',    // Bảo vệ + Phù thủy cùng cứu 1 người: live (sống) | die (chết – luật "sữa đổ")
  dayTime: 120, voteTime: 40, nightTime: 25,
};

// ---------------- tiện ích ----------------
export const P = (s, id) => s.players.find(p => p.id === id);
export const alive = s => s.players.filter(p => p.alive);
const has = (s, role) => s.players.some(p => p.role === role);
const holder = (s, role) => s.players.find(p => p.role === role);
const holderAlive = (s, role) => s.players.find(p => p.role === role && p.alive);
const nm = (s, id) => (P(s, id) || {}).name || '?';
export const STEP_ROLE = { cupid: 'cupid', guard: 'guard', seer: 'seer', wolves: 'wolf', wolves2: 'wolf', witch: 'witch' };
export const STEP_TEXT = {
  cupid: ['💘', 'Thần Tình Yêu thức dậy, bắn mũi tên ghép đôi…'],
  guard: ['🛡️', 'Bảo Vệ thức dậy, chọn người để che chở…'],
  seer: ['🔮', 'Tiên Tri thức dậy, nhìn vào quả cầu…'],
  wolves: ['🐺', 'Bầy Sói thức dậy, chọn con mồi…'],
  wolves2: ['🐾', 'Sói Con đã chết – bầy Sói nổi điên, cắn thêm người nữa!'],
  witch: ['🧪', 'Phù Thủy thức dậy, khuấy nồi thuốc…'],
};

function bump(s) { s.seq++; }
function newPhase(s) { s.pk++; s.seq++; }
function ev(s, k, data = {}) { s.evN++; s.ev.push({ n: s.evN, k, day: s.day, ...data }); if (s.ev.length > 40) s.ev.shift(); }
function log(s, txt, k = '') { s.log.push({ day: s.day, ph: s.phase, txt, k }); if (s.log.length > 200) s.log.shift(); }
function note(s, pid, txt) { const p = P(s, pid); if (p) { p.notes.push({ day: s.day, txt }); if (p.notes.length > 40) p.notes.shift(); } }
function sys(s, ch, text) { s.chatN++; s.chat.push({ n: s.chatN, ch, by: null, text, day: s.day }); trimChat(s); }
function trimChat(s) { if (s.chat.length > 260) s.chat.splice(0, s.chat.length - 260); }
export const teamOf = (s, p) => {
  if (s.mixedLove && p.lover) return 'lovers';
  return ROLES[p.role].team;
};

// ---------------- tạo ván ----------------
export function createGame(playerList, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  const roles = o.auto ? presetRoles(playerList.length) : o.roles;
  const rl = roleList(playerList.length, roles);
  if (!rl.ok) throw new Error(rl.reason);
  const deal = shuffle(rl.list.slice());
  const s = {
    phase: 'night', step: null, stepFake: false, steps: [], day: 1, pk: 0, seq: 0,
    opts: { ...o, roles: { ...roles } }, roleCount: countRoles(rl.list),
    players: playerList.map((p, i) => ({ id: p.id, name: p.name, isBot: !!p.isBot, role: deal[i], alive: true, lover: null, elderHit: false, idiotOut: false, revealed: false, cause: null, diedDay: null, notes: [], seen: {} })),
    night: null, lastGuard: null, potions: { save: true, poison: true }, cubRevenge: false, mixedLove: false, lovers: null,
    dayInfo: null, vote: null, condemned: null, hunterQueue: [], hunterNext: null, deaths: [],
    history: [], claims: [], log: [], chat: [], chatN: 0, ev: [], evN: 0, winner: null, quiet: 0,
  };
  for (const p of s.players) note(s, p.id, `Bạn là ${ROLES[p.role].emoji} ${ROLES[p.role].name}. ${ROLES[p.role].short}`);
  const wolves = s.players.filter(p => isWolfRole(p.role));
  for (const w of wolves) if (wolves.length > 1) note(s, w.id, '🐺 Đồng bọn: ' + wolves.filter(x => x !== w).map(x => `${x.name} (${ROLES[x.role].name})`).join(', '));
  ev(s, 'start');
  log(s, '🌕 Ván bắt đầu. Trăng lên, làng chìm vào giấc ngủ…', 'night');
  startNight(s);
  return s;
}
function countRoles(list) { const c = {}; for (const r of list) c[r] = (c[r] || 0) + 1; return c; }

// ---------------- ĐÊM ----------------
function startNight(s) {
  s.phase = 'night';
  s.night = { guard: null, seer: null, cupid: null, wolfVotes: {}, wolfFirm: {}, victims: [], save: null, poison: null, acted: {} };
  const st = [];
  if (s.day === 1 && has(s, 'cupid')) st.push('cupid');
  if (has(s, 'guard')) st.push('guard');
  if (has(s, 'seer')) st.push('seer');
  st.push('wolves');
  if (s.cubRevenge) st.push('wolves2');
  if (has(s, 'witch')) st.push('witch');
  s.steps = st; s.step = null;
  ev(s, 'night');
  sys(s, 'all', `🌙 Đêm ${s.day} buông xuống. Cả làng đi ngủ…`);
  nextStep(s);
}
function nextStep(s) {
  const i = s.step ? s.steps.indexOf(s.step) + 1 : 0;
  if (i >= s.steps.length) { resolveNight(s); return; }
  s.step = s.steps[i]; s.night.acted = {};
  if (s.step === 'wolves2') { s.night.wolfVotes = {}; s.night.wolfFirm = {}; }
  // vai đã chết / hết thuốc: vẫn "gọi" cho giống thật (chủ phòng chờ vài giây), không ai hành động
  const r = STEP_ROLE[s.step];
  if (r === 'wolf') s.stepFake = false;
  else {
    const h = holderAlive(s, r);
    s.stepFake = !h || (s.step === 'witch' && !s.potions.save && !s.potions.poison);
  }
  newPhase(s);
  ev(s, 'step', { step: s.step });
  if (s.step === 'witch' && !s.stepFake) {
    const w = holderAlive(s, 'witch');
    const v = s.night.victims;
    note(s, w.id, v.length ? `🩸 Đêm ${s.day}: Sói cắn ${v.map(x => nm(s, x)).join(' và ')}.` : `🌙 Đêm ${s.day}: không ai bị sói cắn.`);
  }
}
function stepActors(s) {
  const r = STEP_ROLE[s.step];
  if (s.stepFake) return [];
  if (r === 'wolf') {
    const ws = alive(s).filter(p => isWolfRole(p.role));
    const notVoted = ws.filter(w => !(w.id in s.night.wolfVotes));
    if (notVoted.length) return notVoted.map(w => w.id);
    const lead = wolfLeader(s);
    return ws.filter(w => s.night.wolfVotes[w.id] !== lead && !s.night.wolfFirm[w.id]).map(w => w.id);
  }
  const h = holderAlive(s, r);
  return h && !s.night.acted[h.id] ? [h.id] : [];
}
// mục tiêu sói đang dẫn đầu (hoà: lấy người được chọn sớm nhất – để bot hùa theo, ván không treo)
export function wolfLeader(s) {
  const cnt = {}, order = [];
  for (const t of Object.values(s.night.wolfVotes)) { if (!t) continue; if (!(t in cnt)) order.push(t); cnt[t] = (cnt[t] || 0) + 1; }
  let best = null, bc = 0;
  for (const t of order) if (cnt[t] > bc) { best = t; bc = cnt[t]; }
  return best;
}
export function wolfTargets(s) { return alive(s).filter(p => !isWolfRole(p.role) && !s.night.victims.includes(p.id)).map(p => p.id); }
function finishWolves(s, byTimeout) {
  const ws = alive(s).filter(p => isWolfRole(p.role));
  let t = null;
  const votes = Object.values(s.night.wolfVotes).filter(Boolean);
  if (votes.length) {
    const cnt = {}; for (const v of votes) cnt[v] = (cnt[v] || 0) + 1;
    const top = Math.max(...Object.values(cnt));
    const tops = Object.keys(cnt).filter(k => cnt[k] === top);
    t = tops.length === 1 ? tops[0] : (byTimeout ? pick(tops) : wolfLeader(s));
  }
  if (t && P(s, t) && P(s, t).alive) {
    s.night.victims.push(t);
    s.chatN++; s.chat.push({ n: s.chatN, ch: 'wolf', by: null, text: `🩸 Bầy sói chốt: ${nm(s, t)}.`, day: s.day }); trimChat(s);
  } else {
    s.chatN++; s.chat.push({ n: s.chatN, ch: 'wolf', by: null, text: '😶 Bầy sói không chốt được ai – đêm nay nhịn đói.', day: s.day }); trimChat(s);
  }
  for (const w of ws) note(s, w.id, t ? `🐺 Đêm ${s.day}: bầy sói cắn ${nm(s, t)}.` : `🐺 Đêm ${s.day}: bầy sói không cắn ai.`);
}

function resolveNight(s) {
  const n = s.night, deaths = [];
  for (const v of n.victims) {
    const p = P(s, v); if (!p || !p.alive) continue;
    const guarded = n.guard === v, saved = n.save === v;
    if (guarded && saved && s.opts.doubleSave === 'die') { deaths.push([v, 'wolf']); continue; }
    if (guarded || saved) continue;
    if (p.role === 'elder' && !p.elderHit) { p.elderHit = true; note(s, v, `👴 Đêm ${s.day}: bạn bị sói cắn nhưng da dày quá, vẫn sống! (lần sau thì hết)`); continue; }
    deaths.push([v, 'wolf']);
  }
  if (n.poison && P(s, n.poison).alive) { // bị độc thì tính là chết vì độc (Thợ Săn bị độc không bắn được)
    const d = deaths.find(x => x[0] === n.poison);
    if (d) d[1] = 'poison'; else deaths.push([n.poison, 'poison']);
  }
  if (s.cubRevenge && s.steps.includes('wolves2')) s.cubRevenge = false;
  s.lastGuard = n.guard;
  s.deaths = [];
  for (const [id, cause] of deaths) kill(s, id, cause);
  s.phase = 'dawn'; s.step = null; s.stepFake = false;
  newPhase(s);
  ev(s, 'dawn', { deaths: s.deaths.slice() });
  if (!s.deaths.length) { log(s, `🌤 Sáng ngày ${s.day}: đêm qua bình yên, không ai chết.`, 'day'); sys(s, 'all', '🐓 Ò ó o! Trời sáng – đêm qua bình yên, không ai chết.'); }
  else {
    const txt = s.deaths.map(d => deathText(s, d)).join('; ');
    log(s, `☀️ Sáng ngày ${s.day}: ${txt}.`, 'death');
    sys(s, 'all', `🐓 Ò ó o! Trời sáng – ${txt}.`);
  }
}
function deathText(s, d) {
  const p = P(s, d.id);
  const role = s.opts.reveal ? ` (${ROLES[p.role].emoji} ${ROLES[p.role].name})` : '';
  const why = { wolf: 'đã chết trong đêm', poison: 'đã chết trong đêm', love: 'chết theo người yêu 💔', shot: 'trúng tên của Thợ Săn 🏹', hang: 'bị treo cổ' }[d.cause] || 'đã chết';
  return `${p.name}${role} ${why}`;
}

// chết + dây chuyền (người yêu, Thợ Săn, Sói Con)
function kill(s, id, cause) {
  const p = P(s, id); if (!p || !p.alive) return;
  p.alive = false; p.cause = cause; p.diedDay = s.day;
  if (s.opts.reveal) p.revealed = true;
  s.deaths.push({ id, cause });
  ev(s, 'death', { id, cause, role: s.opts.reveal ? p.role : null });
  if (p.role === 'hunter' && cause !== 'poison') s.hunterQueue.push(id);
  if (p.role === 'cub') s.cubRevenge = true;
  if (p.lover) { const l = P(s, p.lover); if (l && l.alive) kill(s, l.id, 'love'); }
}

// ---------------- NGÀY ----------------
function afterDeaths(s, next) {
  // next: 'day' | 'night'
  if (s.hunterQueue.length) { s.hunterNext = next; s.phase = 'hunter'; newPhase(s); const h = P(s, s.hunterQueue[0]); h.revealed = true; ev(s, 'hunterUp', { id: h.id }); sys(s, 'all', `🏹 ${h.name} là Thợ Săn! Trước khi gục xuống, anh ta giương nỏ…`); return; }
  if (checkWin(s)) return;
  if (next === 'day') startDay(s); else { s.day++; if (s.day > 30) { endGame(s, 'draw', [], 'Làng kiệt sức sau 30 ngày – hoà!'); return; } startNight(s); }
}
function startDay(s) {
  s.phase = 'day'; s.dayInfo = { ready: {}, accuse: {} };
  newPhase(s);
  ev(s, 'day');
  sys(s, 'all', `☀️ Ngày ${s.day}: thảo luận đi cả làng! Ai đáng ngờ?`);
}
function startVote(s, candidates = null, round = 1) {
  s.phase = 'vote'; s.vote = { votes: {}, round, candidates, tally: null };
  newPhase(s);
  ev(s, 'vote', { round, candidates });
  sys(s, 'all', round > 1 ? `⚖️ Hoà phiếu! Bầu lại giữa: ${candidates.map(x => nm(s, x)).join(', ')}.` : '⚖️ Hết giờ bàn – bỏ phiếu treo cổ!');
}
export const canVote = (s, p) => p && p.alive && !p.idiotOut;
export function voteCandidates(s) {
  if (!s.vote) return [];
  return s.vote.candidates ? s.vote.candidates.filter(id => P(s, id).alive) : alive(s).map(p => p.id);
}
function resolveVote(s) {
  const v = s.vote, cnt = {}; let skip = 0;
  for (const [by, t] of Object.entries(v.votes)) { if (!canVote(s, P(s, by))) continue; if (t === 'skip') skip++; else cnt[t] = (cnt[t] || 0) + 1; }
  v.tally = { cnt, skip };
  const top = Math.max(0, ...Object.values(cnt));
  const tops = Object.keys(cnt).filter(k => cnt[k] === top);
  s.history.push({ day: s.day, round: v.round, votes: { ...v.votes } });
  if (s.history.length > 40) s.history.shift();
  let hanged = null;
  if (top > 0 && skip < top) {
    if (tops.length === 1) hanged = tops[0];
    else if (s.opts.tie === 'revote' && v.round === 1) {
      ev(s, 'voteResult', { id: null, tie: tops, tally: v.tally, votes: s.opts.voteMode === 'open' ? v.votes : null });
      log(s, `⚖️ Ngày ${s.day}: hoà phiếu giữa ${tops.map(x => nm(s, x)).join(', ')} – bầu lại.`, 'vote');
      startVote(s, tops, 2); return;
    }
  }
  ev(s, 'voteResult', { id: hanged, tally: v.tally, votes: s.opts.voteMode === 'open' ? v.votes : null });
  if (!hanged) {
    log(s, `🤷 Ngày ${s.day}: không ai bị treo cổ${tops.length > 1 && top > 0 && skip < top ? ' (hoà phiếu)' : ''}.`, 'vote');
    sys(s, 'all', '🤷 Không ai bị treo cổ hôm nay. Trời lại tối…');
    s.quiet++;
    afterDeaths(s, 'night'); return;
  }
  const p = P(s, hanged);
  if (p.role === 'idiot' && !p.idiotOut) {
    p.idiotOut = true; p.revealed = true;
    ev(s, 'idiot', { id: hanged });
    log(s, `🤪 ${p.name} bị treo… nhưng hoá ra là KẺ NGỐC! Được tha, nhưng mất quyền bỏ phiếu.`, 'vote');
    sys(s, 'all', `🤪 Dây vừa thắt thì ${p.name} cười hô hố – là KẺ NGỐC! Làng tha cho, nhưng từ nay không được bỏ phiếu.`);
    afterDeaths(s, 'night'); return;
  }
  if (p.role === 'tanner') {
    s.condemned = hanged; s.deaths = []; kill(s, hanged, 'hang');
    log(s, `🥀 ${p.name} bị treo cổ – và đó chính là điều hắn muốn!`, 'vote');
    endGame(s, 'tanner', [hanged], `${p.name} là Thằng Chán Đời – bị treo cổ đúng ý, thắng một mình!`);
    return;
  }
  s.condemned = hanged; s.phase = 'last';
  newPhase(s);
  ev(s, 'condemned', { id: hanged });
  log(s, `⚖️ Ngày ${s.day}: ${p.name} bị dân làng bỏ phiếu treo cổ.`, 'vote');
  sys(s, 'all', `🪢 ${p.name} bị đưa lên giàn treo. Lời trăng trối?`);
}
function finishLast(s) {
  const id = s.condemned; s.deaths = [];
  kill(s, id, 'hang');
  const p = P(s, id);
  sys(s, 'all', `💀 ${p.name} đã bị treo cổ${s.opts.reveal ? ` – là ${ROLES[p.role].emoji} ${ROLES[p.role].name}` : ''}.`);
  const extra = s.deaths.filter(d => d.id !== id);
  if (extra.length) { const t = extra.map(d => deathText(s, d)).join('; '); log(s, t + '.', 'death'); sys(s, 'all', t + '.'); }
  s.condemned = null;
  afterDeaths(s, 'night');
}
function shoot(s, target) {
  const hid = s.hunterQueue.shift(), h = P(s, hid);
  s.deaths = [];
  if (target && P(s, target) && P(s, target).alive) {
    ev(s, 'shot', { by: hid, id: target });
    kill(s, target, 'shot');
    const t = s.deaths.map(d => deathText(s, d)).join('; ');
    log(s, `🏹 ${h.name} (Thợ Săn) kéo theo ${nm(s, target)}. ${t}.`, 'death');
    sys(s, 'all', `🏹 Phựt! ${t}.`);
  } else { log(s, `🏹 ${h.name} (Thợ Săn) không bắn ai.`, 'death'); sys(s, 'all', `🏹 ${h.name} hạ nỏ, không bắn ai.`); }
  if (s.hunterQueue.length) { newPhase(s); const n2 = P(s, s.hunterQueue[0]); n2.revealed = true; ev(s, 'hunterUp', { id: n2.id }); return; }
  const next = s.hunterNext; s.hunterNext = null;
  if (checkWin(s)) return;
  if (next === 'day') startDay(s); else { s.day++; if (s.day > 30) { endGame(s, 'draw', [], 'Làng kiệt sức sau 30 ngày – hoà!'); return; } startNight(s); }
}

// ---------------- THẮNG / THUA ----------------
export function winnerOf(s) {
  const al = alive(s);
  if (!al.length) return { team: 'draw', reason: 'Không còn ai sống sót…' };
  if (s.mixedLove) {
    const [a, b] = s.lovers.map(id => P(s, id));
    if (a.alive && b.alive && al.length === 2) return { team: 'lovers', reason: 'Chỉ còn lại đôi uyên ương – tình yêu chiến thắng tất cả!' };
  }
  const wolvesAlive = al.filter(p => isWolfRole(p.role));
  if (!wolvesAlive.length) return { team: 'village', reason: 'Con Sói cuối cùng đã bị tiêu diệt!' };
  const wolfTeam = al.filter(p => teamOf(s, p) === 'wolf').length;
  if (wolfTeam > 0 && wolfTeam >= al.length - wolfTeam) return { team: 'wolf', reason: 'Sói đã đông bằng dân – cả làng thành bữa tối!' };
  return null;
}
function checkWin(s) {
  const w = winnerOf(s); if (!w) return false;
  let ids;
  if (w.team === 'lovers') ids = s.lovers.slice();
  else if (w.team === 'draw') ids = [];
  else ids = s.players.filter(p => teamOf(s, p) === w.team).map(p => p.id);
  endGame(s, w.team, ids, w.reason);
  return true;
}
function endGame(s, team, ids, reason) {
  s.phase = 'ended'; s.step = null; s.winner = { team, ids, reason };
  for (const p of s.players) p.revealed = true;
  newPhase(s);
  ev(s, 'win', { team, ids });
  log(s, team === 'draw' ? `🏁 Hoà! ${reason}` : `🏁 ${TEAM_NAME[team]} thắng! ${reason}`, 'win');
  sys(s, 'all', team === 'draw' ? `🏁 HOÀ! ${reason}` : `🏁 ${TEAM_NAME[team]} THẮNG! ${reason}`);
}

// ---------------- AI ĐANG PHẢI LÀM GÌ ----------------
export function actors(s) {
  switch (s.phase) {
    case 'night': return stepActors(s);
    case 'day': return alive(s).filter(p => !s.dayInfo.ready[p.id]).map(p => p.id);
    case 'vote': return alive(s).filter(p => canVote(s, p) && !(p.id in s.vote.votes)).map(p => p.id);
    case 'last': return [s.condemned];
    case 'hunter': return s.hunterQueue.slice(0, 1);
    default: return [];
  }
}
// thời lượng gợi ý cho pha hiện tại (ms) – chủ phòng dùng làm đồng hồ
export function phaseMs(s) {
  const o = s.opts;
  switch (s.phase) {
    case 'night': return s.stepFake ? 3500 + Math.floor(rand() * 3500) : (s.step === 'wolves' || s.step === 'wolves2' ? o.nightTime * 1600 : s.step === 'witch' ? o.nightTime * 1200 : o.nightTime * 1000);
    case 'dawn': return 6500 + s.deaths.length * 1200;
    case 'day': return o.dayTime * 1000;
    case 'vote': return o.voteTime * 1000;
    case 'last': return 15000;
    case 'hunter': return 25000;
    default: return 0;
  }
}

// hết giờ pha: chốt những gì đã có
export function timeout(s) {
  switch (s.phase) {
    case 'night':
      if (s.step === 'wolves' || s.step === 'wolves2') finishWolves(s, true);
      nextStep(s); return true;
    case 'dawn': afterDeaths(s, 'day'); return true;
    case 'day': startVote(s); return true;
    case 'vote': resolveVote(s); return true;
    case 'last': finishLast(s); return true;
    case 'hunter': shoot(s, null); return true;
  }
  return false;
}

// ---------------- HÀNH ĐỘNG ----------------
const CHAT_MAX = 160;
export function chatChannels(s, p) {
  if (!p) return [];
  if (s.phase === 'ended') return ['all'];
  if (!p.alive) return ['ghost'];
  const ch = [];
  const dayish = ['dawn', 'day', 'vote', 'hunter'].includes(s.phase) || (s.phase === 'last' && s.condemned === p.id);
  if (dayish) ch.push('all');
  if (isWolfRole(p.role)) ch.push('wolf');
  if (p.lover) ch.push('love');
  return ch;
}
export function applyAction(s, pid, a) {
  const p = P(s, pid);
  if (!p) return { ok: false, reason: 'Không có trong ván.' };
  if (!a || typeof a !== 'object') return { ok: false, reason: 'Lệnh sai.' };
  if (a.type === 'chat') {
    const text = String(a.text || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
    if (!text) return { ok: false, reason: 'Tin nhắn trống.' };
    if (!chatChannels(s, p).includes(a.ch)) return { ok: false, reason: a.ch === 'all' && s.phase === 'night' ? 'Ban đêm cả làng đang ngủ – không nói chuyện được 🤫' : 'Bạn không chat được ở kênh này.' };
    s.chatN++; s.chat.push({ n: s.chatN, ch: a.ch, by: pid, text, day: s.day, last: s.phase === 'last' && s.condemned === pid && a.ch === 'all' ? 1 : 0 }); trimChat(s);
    bump(s); return { ok: true };
  }
  if (s.phase === 'ended') return { ok: false, reason: 'Ván đã kết thúc.' };
  const acts = actors(s);
  switch (a.type) {
    case 'cupid': case 'guard': case 'seer': case 'witch': case 'skip': {
      if (s.phase !== 'night') return { ok: false, reason: 'Chưa tới lúc.' };
      const step = s.step;
      if (!acts.includes(pid) || (a.type !== 'skip' && a.type !== step) || step === 'wolves' || step === 'wolves2') return { ok: false, reason: 'Chưa tới lượt bạn.' };
      const n = s.night;
      if (a.type === 'cupid') {
        const t = a.targets || [];
        if (t.length !== 2 || t[0] === t[1] || !t.every(id => P(s, id) && P(s, id).alive)) return { ok: false, reason: 'Chọn đúng 2 người khác nhau.' };
        const [x, y] = t.map(id => P(s, id));
        x.lover = y.id; y.lover = x.id; s.lovers = [x.id, y.id]; n.cupid = t.slice();
        s.mixedLove = (ROLES[x.role].team === 'wolf') !== (ROLES[y.role].team === 'wolf') || x.role === 'tanner' || y.role === 'tanner';
        note(s, pid, `💘 Bạn đã ghép đôi ${x.name} ❤ ${y.name}.`);
        for (const [me, other] of [[x, y], [y, x]]) note(s, me.id, `💘 Bạn đã trúng tên! Người yêu của bạn: ${other.name} (${ROLES[other.role].emoji} ${ROLES[other.role].name}). Một người chết, người kia chết theo.${s.mixedLove ? ' Hai bạn khác phe – giờ là phe riêng: thắng khi chỉ còn 2 bạn sống!' : ''}`);
        s.chatN++; s.chat.push({ n: s.chatN, ch: 'love', by: null, text: '💘 Hai bạn đã thành một đôi. Kênh này chỉ hai bạn (và hồn ma) đọc được.', day: s.day }); trimChat(s);
      } else if (a.type === 'guard') {
        const t = P(s, a.target);
        if (!t || !t.alive) return { ok: false, reason: 'Chọn người còn sống.' };
        if (a.target === s.lastGuard) return { ok: false, reason: 'Không được bảo vệ cùng 1 người 2 đêm liền.' };
        n.guard = a.target; note(s, pid, `🛡️ Đêm ${s.day}: bạn bảo vệ ${t.name}.`);
      } else if (a.type === 'seer') {
        const t = P(s, a.target);
        if (!t || !t.alive || t.id === pid) return { ok: false, reason: 'Chọn 1 người khác còn sống.' };
        const res = ROLES[t.role].seerSees || (ROLES[t.role].team === 'wolf' ? 'wolf' : 'village');
        n.seer = t.id; p.seen[t.id] = res;
        note(s, pid, `🔮 Đêm ${s.day}: ${t.name} ${res === 'wolf' ? 'LÀ SÓI 🐺' : 'không phải Sói 🙂'}.`);
        ev(s, 'seen', { to: pid, id: t.id, res });
      } else if (a.type === 'witch') {
        const save = a.save || null, poison = a.poison || null;
        if (save && (!s.potions.save || !n.victims.includes(save))) return { ok: false, reason: 'Không cứu được người này.' };
        if (poison && (!s.potions.poison || !P(s, poison) || !P(s, poison).alive || poison === pid)) return { ok: false, reason: 'Không đầu độc được người này.' };
        if (save) { n.save = save; s.potions.save = false; note(s, pid, `🧪 Đêm ${s.day}: bạn dùng bình CỨU cho ${nm(s, save)}.`); }
        if (poison) { n.poison = poison; s.potions.poison = false; note(s, pid, `☠️ Đêm ${s.day}: bạn đầu độc ${nm(s, poison)}.`); }
      }
      n.acted[pid] = true; bump(s);
      if (!stepActors(s).length) nextStep(s);
      return { ok: true };
    }
    case 'wolf': {
      if (s.phase !== 'night' || !(s.step === 'wolves' || s.step === 'wolves2') || !p.alive || !isWolfRole(p.role)) return { ok: false, reason: 'Chưa tới lượt Sói.' };
      if (a.target !== null && !wolfTargets(s).includes(a.target)) return { ok: false, reason: 'Không cắn được người này.' };
      if (pid in s.night.wolfVotes && s.night.wolfVotes[pid] === a.target) s.night.wolfFirm[pid] = true; // giữ nguyên ý kiến
      else delete s.night.wolfFirm[pid];
      s.night.wolfVotes[pid] = a.target; bump(s);
      // tất cả sói đã chọn và thống nhất → xong
      const ws = alive(s).filter(q => isWolfRole(q.role));
      const vals = ws.map(w => s.night.wolfVotes[w.id]);
      if (ws.every(w => w.id in s.night.wolfVotes) && vals.every(v => v === vals[0])) { finishWolves(s, false); nextStep(s); }
      return { ok: true };
    }
    case 'ready': {
      if (s.phase !== 'day' || !p.alive) return { ok: false, reason: 'Chưa tới lúc.' };
      s.dayInfo.ready[pid] = a.on === false ? false : true;
      if (a.on === false) delete s.dayInfo.ready[pid];
      bump(s);
      if (!actors(s).length) startVote(s);
      return { ok: true };
    }
    case 'accuse': {
      if (s.phase !== 'day' && s.phase !== 'vote') return { ok: false, reason: 'Chỉ chỉ điểm được ban ngày.' };
      if (!p.alive) return { ok: false, reason: 'Hồn ma không chỉ điểm được.' };
      const t = a.target ? P(s, a.target) : null;
      if (a.target && (!t || !t.alive || t.id === pid)) return { ok: false, reason: 'Chọn người khác còn sống.' };
      const info = s.dayInfo || (s.dayInfo = { ready: {}, accuse: {} });
      if (!a.target || info.accuse[pid] === a.target) delete info.accuse[pid];
      else { info.accuse[pid] = a.target; s.chatN++; s.chat.push({ n: s.chatN, ch: 'all', by: null, text: `🫵 ${p.name} nghi ${t.name}!`, day: s.day, acc: 1 }); trimChat(s); }
      bump(s); return { ok: true };
    }
    case 'claim': { // công khai kết quả soi (ai cũng "khai" được – thật hay bịa là chuyện của bạn 😏)
      if (!['day', 'vote'].includes(s.phase) || !p.alive) return { ok: false, reason: 'Chỉ khai được ban ngày.' };
      const t = P(s, a.target); if (!t || t.id === pid || !['wolf', 'village'].includes(a.res)) return { ok: false, reason: 'Khai sai.' };
      if (s.claims.some(c => c.by === pid && c.target === a.target)) return { ok: false, reason: 'Bạn khai người này rồi.' };
      s.claims.push({ by: pid, target: a.target, res: a.res, day: s.day });
      s.chatN++; s.chat.push({ n: s.chatN, ch: 'all', by: pid, text: `🔮 Tôi là Tiên Tri! Tôi đã soi ${t.name}: ${a.res === 'wolf' ? 'LÀ SÓI 🐺' : 'người tốt 🙂'}`, day: s.day, claim: 1 }); trimChat(s);
      bump(s); return { ok: true };
    }
    case 'vote': {
      if (s.phase !== 'vote') return { ok: false, reason: 'Chưa tới lúc bỏ phiếu.' };
      if (!canVote(s, p)) return { ok: false, reason: p.idiotOut ? 'Kẻ Ngốc đã mất quyền bỏ phiếu.' : 'Hồn ma không bỏ phiếu.' };
      if (a.target !== 'skip' && (!voteCandidates(s).includes(a.target) || a.target === pid)) return { ok: false, reason: 'Không bầu được người này.' };
      s.vote.votes[pid] = a.target; bump(s);
      if (!actors(s).length) resolveVote(s);
      return { ok: true };
    }
    case 'done': {
      if (s.phase !== 'last' || s.condemned !== pid) return { ok: false, reason: 'Chưa tới lúc.' };
      finishLast(s); return { ok: true };
    }
    case 'shoot': {
      if (s.phase !== 'hunter' || s.hunterQueue[0] !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
      if (a.target && (!P(s, a.target) || !P(s, a.target).alive)) return { ok: false, reason: 'Chọn người còn sống.' };
      shoot(s, a.target || null); return { ok: true };
    }
  }
  return { ok: false, reason: 'Lệnh không hợp lệ.' };
}

// ---------------- GÓC NHÌN TỪNG NGƯỜI ----------------
export function knownRole(s, viewer, p) {
  if (!viewer) return s.phase === 'ended' || p.revealed ? p.role : null;
  if (p.id === viewer.id || p.revealed || s.phase === 'ended' || !viewer.alive) return p.role;
  if (isWolfRole(viewer.role) && isWolfRole(p.role)) return p.role;
  if (viewer.lover === p.id) return p.role; // người yêu biết vai nhau
  return null;
}
export function viewFor(s, pid) {
  const me = P(s, pid);
  const ghost = me && !me.alive;
  const all = !me || ghost || s.phase === 'ended';
  const acts = actors(s);
  const v = {
    phase: s.phase, step: s.step, stepFake: s.stepFake && all ? true : undefined, day: s.day, pk: s.pk, seq: s.seq,
    opts: s.opts, roleCount: s.roleCount, steps: s.steps,
    me: me ? { id: me.id, role: me.role, alive: me.alive, lover: me.lover, notes: me.notes, seen: me.seen, idiotOut: me.idiotOut, elderHit: me.role === 'elder' ? me.elderHit : undefined } : null,
    myTurn: acts.includes(pid),
    players: s.players.map(p => {
      const lv = me && (p.id === me.lover || (me.lover && p.id === me.id) || all || (me.role === 'cupid' && s.lovers && s.lovers.includes(p.id)));
      return { id: p.id, name: p.name, isBot: p.isBot, alive: p.alive, cause: p.alive ? null : p.cause, diedDay: p.diedDay, role: knownRole(s, me, p), revealed: p.revealed, idiotOut: p.idiotOut, lover: lv ? p.lover : null };
    }),
    potions: me && (me.role === 'witch' || all) ? s.potions : null,
    lastGuard: me && (me.role === 'guard' || all) ? s.lastGuard : null,
    log: s.log.slice(-80), ev: s.ev.filter(e => !e.to || e.to === pid || all).slice(-20), evN: s.evN,
    chat: s.chat.filter(c => c.ch === 'all' || (c.ch === 'wolf' && (all || (me && isWolfRole(me.role)))) || (c.ch === 'ghost' && all) || (c.ch === 'love' && (all || (me && me.lover)))).slice(-150),
    channels: chatChannels(s, me),
    claims: s.claims, winner: s.winner, mixedLove: all ? s.mixedLove : (me && me.lover ? s.mixedLove : undefined),
    condemned: s.condemned, hunter: s.phase === 'hunter' ? s.hunterQueue[0] : null, deaths: s.phase === 'dawn' ? s.deaths : null,
    history: s.opts.voteMode === 'open' || all ? s.history.slice(-6) : [],
  };
  if (s.phase === 'night' && s.night) {
    const n = s.night;
    if (me && isWolfRole(me.role) || all) { v.wolfVotes = n.wolfVotes; v.wolfTargets = wolfTargets(s); }
    if (me && me.role === 'witch' && s.step === 'witch' || all) v.victims = n.victims;
    if (all) v.nightInfo = { guard: n.guard, seer: n.seer, save: n.save, poison: n.poison };
  }
  if (s.dayInfo && (s.phase === 'day' || s.phase === 'vote')) v.dayInfo = { ready: s.dayInfo.ready, accuse: s.dayInfo.accuse };
  if (s.vote && (s.phase === 'vote' || s.phase === 'last' || s.phase === 'night' || s.phase === 'hunter' || s.phase === 'ended')) {
    const open = s.opts.voteMode === 'open' || all;
    v.vote = { round: s.vote.round, candidates: voteCandidates(s), tally: s.vote.tally, mine: me ? s.vote.votes[me.id] : undefined,
      votes: open ? s.vote.votes : null, voted: Object.keys(s.vote.votes) };
    if (s.phase !== 'vote' && s.phase !== 'last' && s.phase !== 'ended') v.vote = null;
  }
  return v;
}
