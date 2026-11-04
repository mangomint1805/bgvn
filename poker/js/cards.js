// Lá bài Tây: dùng bộ bài SVG chung BGVN Deck (shared/ui/deck) – mặt cổ điển, lá nhỏ tự đổi kiểu compact.
import { faceSVG, backSVG } from '../../shared/ui/deck/deck.js?v=1';
const SUIT_NAME = { s: 'bích', h: 'cơ', d: 'rô', c: 'chuồn' };
const rkTxt = r => r === 'T' ? '10' : r;
// c: mã 2 ký tự ('As', 'Td', …) hoặc null (úp). Giữ nguyên class .card/.red/.blk + data-c như trước.
export function cardHTML(c, cls = '', attrs = '') {
  if (!c) return `<div class="card back dk-card dk-back ${cls}" ${attrs}>${backSVG()}</div>`;
  const r = c[0], s = c[1], red = s === 'h' || s === 'd';
  return `<div class="card dk-card ${red ? 'red' : 'blk'} ${cls}" data-c="${c}" aria-label="${rkTxt(r)} ${SUIT_NAME[s]}" ${attrs}>${faceSVG(r, s)}</div>`;
}
