// Lá bài Tây: dùng bộ bài SVG chung BGVN Deck (shared/ui/deck). Không dùng hình ảnh ngoài.
import { RANK_TXT, SUIT_SYM } from './engine.js?v=1';
import { faceSVG, backSVG } from '../../shared/ui/deck/deck.js?v=1';
// c: {r, s} hoặc null (úp). cls: lớp thêm (mini, big…). Mặt/lưng vẽ bằng bộ bài SVG chung.
export function cardHTML(c, cls = '', attrs = '') {
  if (!c) return `<div class="pc back dk-card dk-back ${cls}" ${attrs}>${backSVG()}</div>`;
  const red = c.s === 'H' || c.s === 'D', rk = RANK_TXT(c.r), su = SUIT_SYM[c.s];
  return `<div class="pc dk-card ${red ? 'red' : 'blk'} ${cls}" data-id="${c.id || rk + c.s}" aria-label="${rk} ${su}" ${attrs}>${faceSVG(c.r, c.s)}</div>`;
}
export const C = (rk, s) => ({ r: rk === 'A' ? 1 : rk === 'J' ? 11 : rk === 'Q' ? 12 : rk === 'K' ? 13 : +rk, s });
export const row = (...cs) => cs.map(([rk, s]) => cardHTML(C(rk, s), 'mini')).join('');
