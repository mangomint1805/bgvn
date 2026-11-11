// 🏅 Thống kê + thành tích của người chơi (lưu trên máy này – localStorage 'bgvn-stats'; ai đăng nhập thì shared/ui/sync.js đồng bộ thêm lên tài khoản).
// Mỗi net.js bọc handlers: this.h = watch(GAME, handlers, () => this.id) → tự đếm ván đã chơi / thắng khi ván kết thúc.
// Thêm game mới: thêm 1 dòng vào bảng OVER bên dưới (trả null khi ván CHƯA xong; { won: true/false/null } khi xong).
const KEY = 'bgvn-stats';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
export const GAME_NAMES = { bang: 'CÀ ĐÙNG!', uno: 'UNÔ', typhu: 'Cờ Tỷ Phú', scribble: 'Scribble it!', meono: 'Mèo Nổ', tamquoc: 'Tam Quốc Sát', masoi: 'Ma Sói', camel: 'Đua Lạc Đà', cangua: 'Cờ cá ngựa', tienlen: 'Tiến Lên', catte: 'Cát tê', bacao: 'Ba Cào', xidach: 'Xì dách', poker: 'Poker', solitaire: 'Xếp bài', cotuong: 'Cờ tướng', thathaythach: 'Thật hay Thách' };
const byId = (v, id) => (v.players || []).find(p => p.id === id);
const isMe = (v, me) => id => id === me;
const SIDE = { bang: { law: ['sheriff', 'deputy'], outlaw: ['outlaw'], renegade: ['renegade'] }, tamquoc: { lord: ['lord', 'loyal'], rebel: ['rebel'], spy: ['spy'] } };
const team = g => (v, me) => v.phase === 'ended' ? { won: (SIDE[g][v.winner] || []).includes((byId(v, me) || {}).role) } : null;
const single = (...ph) => (v, me) => ph.includes(v.phase) ? { won: v.winner === me } : null;
const chip = (v, me) => { if (v.phase !== 'end') return null; const r = (byId(v, me) || {}).res; return { won: r ? (r.delta > 0 ? true : r.delta < 0 ? false : null) : null }; };
const OVER = {
  bang: team('bang'), tamquoc: team('tamquoc'),
  uno: single('ended'), meono: single('ended'), tienlen: single('ended'), typhu: single('over'), cangua: single('over'),
  masoi: (v, me) => v.phase === 'ended' ? { won: !!(v.winner && (v.winner.ids || []).includes(me)) } : null,
  poker: (v, me) => v.phase === 'handover' || v.phase === 'over' ? { won: !!(v.result && v.result.won && v.result.won[me] > 0) } : null,
  xidach: chip, bacao: chip,
  catte: (v, me) => v.phase === 'handEnd' ? { won: !!(v.result && v.result.winner === me) } : null,
  camel: (v, me) => v.phase === 'ended' ? { won: !!(v.result && (v.result.winners || []).includes(me)) } : null,
  cotuong: (v, me) => v.phase === 'ended' && !v.puzzle ? { won: v.winner ? v.winner === me : null } : null, // hoà: không tính thắng thua
  thathaythach: v => v.phase === 'ended' ? { won: null } : null, // game vui, không có thắng thua
  scribble: (v, me) => v.phase === 'end' ? { won: ((v.players || []).slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0] || {}).id === me } : null,
};

export function load() { let s = null; try { s = JSON.parse(ls.get(KEY)); } catch (e) {} s = s && typeof s === 'object' ? s : {}; s.g = s.g || {}; s.ach = s.ach || {}; s.days = s.days || []; s.streak = s.streak || 0; s.best = s.best || 0; return s; }
const save = s => ls.set(KEY, JSON.stringify(s));
export function totals(s = load()) { let p = 0, w = 0, kinds = 0, top = 0; for (const g in s.g) { p += s.g[g].p || 0; w += s.g[g].w || 0; if (s.g[g].p) kinds++; top = Math.max(top, s.g[g].w || 0); } return { p, w, kinds, top, days: s.days.length, streak: s.streak, best: s.best, night: !!s.night }; }
export const ACHS = [
  { id: 'first', icon: '🎲', name: 'Ván đầu tiên', desc: 'Chơi xong 1 ván', ok: t => t.p >= 1 },
  { id: 'p10', icon: '🎮', name: 'Dân chơi', desc: 'Chơi 10 ván', ok: t => t.p >= 10, of: t => [t.p, 10] },
  { id: 'p50', icon: '🔥', name: 'Cày cuốc', desc: 'Chơi 50 ván', ok: t => t.p >= 50, of: t => [t.p, 50] },
  { id: 'p200', icon: '👑', name: 'Huyền thoại bàn tròn', desc: 'Chơi 200 ván', ok: t => t.p >= 200, of: t => [t.p, 200] },
  { id: 'w1', icon: '🏆', name: 'Thắng lợi đầu tay', desc: 'Thắng 1 ván', ok: t => t.w >= 1 },
  { id: 'w10', icon: '🥇', name: 'Cao thủ', desc: 'Thắng 10 ván', ok: t => t.w >= 10, of: t => [t.w, 10] },
  { id: 'w50', icon: '💎', name: 'Trùm cuối', desc: 'Thắng 50 ván', ok: t => t.w >= 50, of: t => [t.w, 50] },
  { id: 's3', icon: '⚡', name: 'Vào guồng', desc: 'Thắng 3 ván liên tiếp', ok: t => t.best >= 3, of: t => [t.best, 3] },
  { id: 's5', icon: '🚀', name: 'Không thể cản', desc: 'Thắng 5 ván liên tiếp', ok: t => t.best >= 5, of: t => [t.best, 5] },
  { id: 'k5', icon: '🧭', name: 'Thử cho biết', desc: 'Chơi 5 game khác nhau', ok: t => t.kinds >= 5, of: t => [t.kinds, 5] },
  { id: 'k10', icon: '🍱', name: 'Nếm đủ mùi', desc: 'Chơi 10 game khác nhau', ok: t => t.kinds >= 10, of: t => [t.kinds, 10] },
  { id: 'k15', icon: '🗂️', name: 'Sưu tầm gia', desc: 'Chơi đủ cả 15 game', ok: t => t.kinds >= 15, of: t => [t.kinds, 15] },
  { id: 'm10', icon: '🎓', name: 'Chuyên gia', desc: 'Thắng 10 ván cùng một game', ok: t => t.top >= 10, of: t => [t.top, 10] },
  { id: 'd3', icon: '☕', name: 'Khách quen', desc: 'Chơi vào 3 ngày khác nhau', ok: t => t.days >= 3, of: t => [t.days, 3] },
  { id: 'd7', icon: '🏠', name: 'Người nhà', desc: 'Chơi vào 7 ngày khác nhau', ok: t => t.days >= 7, of: t => [t.days, 7] },
  { id: 'night', icon: '🦉', name: 'Cú đêm', desc: 'Chơi xong một ván lúc nửa đêm (0h–5h)', ok: t => t.night },
];
// cấp độ: mỗi ván +10 điểm, thắng +20 nữa
export const LEVELS = ['Tân binh', 'Tập sự', 'Dân chơi', 'Tay chơi', 'Cao thủ', 'Đại cao thủ', 'Bậc thầy', 'Tông sư', 'Huyền thoại', 'Truyền kỳ'];
export function level(t = totals()) { const xp = t.p * 10 + t.w * 20, lv = Math.min(LEVELS.length, Math.floor(Math.sqrt(xp / 50)) + 1), need = n => 50 * (n - 1) * (n - 1); return { xp, lv, name: LEVELS[lv - 1], from: need(lv), to: lv >= LEVELS.length ? null : need(lv + 1) }; }

export function record(game, won) {
  const s = load(), g = s.g[game] = s.g[game] || { p: 0, w: 0 }, d = new Date(), day = d.toISOString().slice(0, 10), before = level(totals(s)).lv;
  g.p++; g.last = Date.now(); s.first = s.first || Date.now();
  if (won === true) { g.w++; s.streak++; s.best = Math.max(s.best, s.streak); } else if (won === false) s.streak = 0;
  if (!s.days.includes(day)) { s.days.push(day); if (s.days.length > 400) s.days.shift(); }
  if (d.getHours() < 5) s.night = 1;
  const t = totals(s), fresh = ACHS.filter(a => !s.ach[a.id] && a.ok(t)); fresh.forEach(a => { s.ach[a.id] = Date.now(); });
  save(s);
  try { dispatchEvent(new CustomEvent('bgvn-stats', { detail: { game, won, fresh } })); } catch (e) {}
  const up = level(t); const msgs = fresh.map(a => `${a.icon} Thành tích mới: ${a.name}`); if (up.lv > before) msgs.push(`⭐ Lên cấp ${up.lv}: ${up.name}`);
  if (msgs.length) import('./dialog.js?v=1').then(m => msgs.forEach((x, i) => setTimeout(() => m.toast(x, 3600), 1800 + i * 3800))).catch(() => {});
}
const live = {};
export function observe(game, view, me) {
  try {
    const st = live[game] = live[game] || { active: false };
    if (!view) { st.active = false; return; }
    if (view.spec || !OVER[game]) return;
    const id = view.me != null && typeof view.me !== 'object' ? view.me : (Array.isArray(view.controlled) && view.controlled[0]) || me;
    const r = OVER[game](view, id);
    if (!r) { st.active = true; return; }
    if (st.active) { st.active = false; record(game, r.won); }
  } catch (e) {}
}
// bọc handlers của net.js: giữ nguyên mọi hàm khác, chỉ nghe lén onState
export function watch(game, handlers, getId) {
  if (!handlers || typeof handlers.onState !== 'function') return handlers;
  const w = Object.create(handlers);
  w.onState = function (view, ...rest) { observe(game, view, getId ? getId() : null); return handlers.onState.call(handlers, view, ...rest); };
  return w;
}
// ☁️ có đăng nhập thì nạp phần đồng bộ hồ sơ theo tài khoản (khách không nạp gì thêm)
const hasAuth = () => { try { return !!JSON.parse(ls.get('bgvn-auth') || 'null'); } catch (e) { return false; } };
let syncOn = false; const startSync = () => { if (syncOn || !hasAuth()) return; syncOn = true; import('./sync.js?v=1').catch(() => { syncOn = false; }); };
try { startSync(); addEventListener('bgvn-auth', startSync); } catch (e) {}
