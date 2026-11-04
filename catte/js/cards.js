// Lá bài Tây: dùng bộ bài SVG chung BGVN Deck (shared/ui/deck) – mặt cổ điển, lá nhỏ tự đổi kiểu compact.
import { SUIT_SYM, rankLabel, isRed } from './engine.js?v=2';
import { faceSVG, backSVG } from '../../shared/ui/deck/deck.js?v=1';
// card: {id,r,s} | null (lưng lá). cls: lớp thêm. attrs: thuộc tính thêm. Mặt/lưng vẽ bằng bộ bài SVG chung.
export function cardHTML(c, cls = '', attrs = '') {
  if (!c) return `<div class="pc back dk-card dk-back ${cls}" ${attrs}>${backSVG()}</div>`;
  return `<div class="pc dk-card ${isRed(c.s) ? 'red' : 'blk'} s-${c.s} ${cls}" data-id="${c.id}" aria-label="${rankLabel(c.r)}${SUIT_SYM[c.s]}" ${attrs}>${faceSVG(c.r, c.s)}</div>`;
}
// chữ lá bài có màu (dùng trong câu chữ)
export function cardTxt(c) { if (!c) return '🂠'; return `<b class="ct ${isRed(c.s) ? 'red' : 'blk'}">${rankLabel(c.r)}${SUIT_SYM[c.s]}</b>`; }
export const suitTxt = s => `<b class="ct ${isRed(s) ? 'red' : 'blk'}">${SUIT_SYM[s]}</b>`;
