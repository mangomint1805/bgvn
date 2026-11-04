// Lá bài Tây tự vẽ (HTML + CSS): mặt lá to rõ ở góc, lưng lá BGVN
import { RANKS, SUITS, rankOf, suitOf, isRed, HEO } from './engine.js?v=3';

// mặt hình J / Q / K: huy hiệu tự vẽ bằng SVG (không theo mẫu bài thương mại)
const COURT = {
  8: '<path d="M10 30 L16 8 L22 22 L28 8 L34 22 L40 8 L46 30 Z" />', // J: răng cưa
  9: '<path d="M8 30 L12 12 L20 22 L28 6 L36 22 L44 12 L48 30 Z"/><circle cx="28" cy="5" r="3"/>', // Q: vương miện thanh
  10: '<path d="M6 30 L10 10 L19 20 L28 4 L37 20 L46 10 L50 30 Z"/><rect x="6" y="31" width="44" height="5" rx="2"/>', // K: vương miện lớn
};
export function cardHTML(c, cls = '', attrs = '') {
  if (c == null) return `<div class="pc back ${cls}" ${attrs}><span class="bk"><b>TL</b></span></div>`;
  const r = rankOf(c), s = suitOf(c), R = RANKS[r], S = SUITS[s];
  let mid;
  if (r >= 8 && r <= 10) mid = `<span class="court"><svg viewBox="0 0 56 40" aria-hidden="true">${COURT[r]}</svg><b>${R}</b><i>${S}</i></span>`;
  else if (r === 11) mid = `<span class="ace">${S}</span>`;
  else if (r === HEO) mid = `<span class="pig">${S}<em>HEO</em></span>`;
  else mid = `<span class="pip">${S}</span>`;
  return `<div class="pc ${isRed(c) ? 'red' : 'blk'} r${r} ${r === HEO ? 'heo' : ''} ${cls}" data-c="${c}" ${attrs}><span class="ix"><b>${R}</b><i>${S}</i></span>${mid}</div>`;
}
// dãy lá xếp chồng (bàn / tổng kết)
export function rowHTML(cards, cls = '') { return `<div class="crow ${cls}">${cards.map(c => cardHTML(c)).join('')}</div>`; }
