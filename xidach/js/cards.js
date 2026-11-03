// Lá bài Tây tự vẽ bằng CSS (mặt & lưng BGVN). Không dùng hình ảnh ngoài.
import { RANK_TXT, SUIT_SYM } from './engine.js?v=1';
const FACE = { 11: '🤴', 12: '👸', 13: '🫅' }; // J Q K – vẽ bằng emoji + khung, không chép mẫu lá thương mại
// c: {r, s} hoặc null (úp). cls: lớp thêm (mini, big…)
export function cardHTML(c, cls = '', attrs = '') {
  if (!c) return `<div class="pc back ${cls}" ${attrs}><i></i></div>`;
  const red = c.s === 'H' || c.s === 'D', rk = RANK_TXT(c.r), su = SUIT_SYM[c.s];
  const mid = c.r >= 11 ? `<span class="face"><b>${rk}</b><em>${FACE[c.r]}</em></span>` : c.r === 1 ? `<span class="pip ace">${su}</span>` : `<span class="pip">${su}</span>`;
  return `<div class="pc ${red ? 'red' : 'blk'} ${cls}" data-id="${c.id || rk + c.s}" aria-label="${rk} ${su}" ${attrs}><span class="ix">${rk}<i>${su}</i></span>${mid}<span class="ix br">${rk}<i>${su}</i></span></div>`;
}
export const C = (rk, s) => ({ r: rk === 'A' ? 1 : rk === 'J' ? 11 : rk === 'Q' ? 12 : rk === 'K' ? 13 : +rk, s });
export const row = (...cs) => cs.map(([rk, s]) => cardHTML(C(rk, s), 'mini')).join('');
