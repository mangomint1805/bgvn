// Lá bài Tây: dùng bộ bài SVG chung BGVN Deck (mặt cổ điển, lá nhỏ tự đổi kiểu compact)
import { RANKS, SUITS, rankOf, suitOf, isRed, HEO } from './engine.js?v=5';
import { faceSVG, backSVG } from '../../shared/ui/deck/deck.js?v=1';

// mặt lá vẽ bằng bộ bài SVG dùng chung (shared/ui/deck) – giữ nguyên class/data-c cũ để CSS & game không đổi
export function cardHTML(c, cls = '', attrs = '') {
  if (c == null) return `<div class="pc back dk-card dk-back ${cls}" ${attrs}>${backSVG()}</div>`;
  const r = rankOf(c), s = suitOf(c);
  return `<div class="pc dk-card ${isRed(c) ? 'red' : 'blk'} r${r} ${r === HEO ? 'heo' : ''} ${cls}" data-c="${c}" aria-label="${RANKS[r]}${SUITS[s]}" ${attrs}>${faceSVG(RANKS[r], SUITS[s])}</div>`;
}
// dãy lá xếp chồng (bàn / tổng kết)
export function rowHTML(cards, cls = '') { return `<div class="crow ${cls}">${cards.map(c => cardHTML(c)).join('')}</div>`; }
