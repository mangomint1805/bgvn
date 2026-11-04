// Gợi ý / xác suất chỉ dành cho ván chơi với bot: phòng có từ 2 người thật trở lên (online hoặc cùng máy) thì tắt.
export const BOT_ONLY_NOTE = 'Chỉ có khi chơi với bot';
// đếm người thật trong danh sách người chơi (mảng hoặc { players: [...] })
export function humanCount(list) {
  const ps = Array.isArray(list) ? list : (list && list.players) || [];
  return ps.filter(p => p && !p.isBot).length;
}
export const hintsAllowed = list => humanCount(list) < 2;
// làm mờ nút bật/tắt gợi ý khi bị khoá (vẫn bấm được để hiện lời nhắc)
export function lockToggle(el, locked) {
  if (!el) return;
  el.classList.toggle('bot-only-lock', !!locked);
  el.style.opacity = locked ? '.45' : '';
  el.setAttribute('aria-disabled', locked ? 'true' : 'false');
  if (locked) { if (!el.dataset.title0) el.dataset.title0 = el.getAttribute('title') || ''; el.title = '🔒 ' + BOT_ONLY_NOTE; }
  else if (el.dataset.title0 !== undefined) { el.title = el.dataset.title0; delete el.dataset.title0; }
}
