// Lá bài Tây tự vẽ bằng CSS: số to ở góc, chất to giữa lá, lưng lá thiết kế riêng BGVN.
import { SUIT_SYM, rankLabel, isRed } from './engine.js?v=1';
const FACE = { 11: 'J', 12: 'Q', 13: 'K' };
// card: {id,r,s} | null (lưng lá). cls: lớp thêm. attrs: thuộc tính thêm
export function cardHTML(c, cls = '', attrs = '') {
  if (!c) return `<div class="pc back ${cls}" ${attrs}><span class="bk"><i>BG</i></span></div>`;
  const sym = SUIT_SYM[c.s], lab = rankLabel(c.r);
  const mid = FACE[c.r] ? `<span class="face"><b>${lab}</b><i>${sym}</i></span>` : c.r === 14 ? `<span class="pip ace">${sym}</span>` : `<span class="pip">${sym}</span>`;
  return `<div class="pc ${isRed(c.s) ? 'red' : 'blk'} s-${c.s} ${cls}" data-id="${c.id}" ${attrs}><span class="ix"><b>${lab}</b><i>${sym}</i></span>${mid}<span class="ix br"><b>${lab}</b><i>${sym}</i></span></div>`;
}
// chữ lá bài có màu (dùng trong câu chữ)
export function cardTxt(c) { if (!c) return '🂠'; return `<b class="ct ${isRed(c.s) ? 'red' : 'blk'}">${rankLabel(c.r)}${SUIT_SYM[c.s]}</b>`; }
export const suitTxt = s => `<b class="ct ${isRed(s) ? 'red' : 'blk'}">${SUIT_SYM[s]}</b>`;
