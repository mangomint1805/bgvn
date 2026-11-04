// Lá bài tự vẽ (HTML/CSS + SVG nhỏ cho J/Q/K) – cùng tinh thần lá bài Tiến Lên của BGVN,
// nhưng chỉ số đặt NGANG ở mép trên để đọc được cả khi các lá xếp chồng sát nhau.
import { RANKS, SUITS, rk, st, isRed } from './core.js?v=1';

const COURT = {
  10: '<path d="M10 30 L16 8 L22 22 L28 8 L34 22 L40 8 L46 30 Z"/>',
  11: '<path d="M8 30 L12 12 L20 22 L28 6 L36 22 L44 12 L48 30 Z"/><circle cx="28" cy="5" r="3"/>',
  12: '<path d="M6 30 L10 10 L19 20 L28 4 L37 20 L46 10 L50 30 Z"/><rect x="6" y="31" width="44" height="5" rx="2"/>',
};
export function faceHTML(c) {
  const r = rk(c), S = SUITS[st(c)], R = RANKS[r];
  let mid;
  if (r >= 10) mid = `<span class="court"><svg viewBox="0 0 56 40" aria-hidden="true">${COURT[r]}</svg><b>${R}</b></span>`;
  else if (r === 0) mid = `<span class="ace">${S}</span>`;
  else mid = `<span class="pip">${S}</span>`;
  return `<span class="ix${R.length > 1 ? ' two' : ''}"><b>${R}</b><i>${S}</i></span>${mid}<span class="br"><b>${R}</b><i>${S}</i></span>`;
}
export const BACK = '<span class="bk"><i></i></span>';
// lá tĩnh (cho hướng dẫn / chọn kiểu chơi)
export function cardHTML(c, cls = '') { return `<div class="pc st ${isRed(c) ? 'red' : 'blk'} ${cls}">${faceHTML(c)}</div>`; }

// vẽ lá lên canvas (hoạt ảnh thắng)
export function drawCard(ctx, c, w, h) {
  const r = Math.max(3, w * 0.1);
  ctx.save();
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0.5, 0.5, w - 1, h - 1, r) : ctx.rect(0.5, 0.5, w - 1, h - 1);
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#cfc6dc'; ctx.stroke();
  ctx.fillStyle = isRed(c) ? '#e0263c' : '#1f1b2e';
  ctx.textBaseline = 'top'; ctx.font = `800 ${Math.round(w * 0.34)}px "Baloo 2", sans-serif`;
  const R = RANKS[rk(c)]; ctx.fillText(R, w * 0.07, h * 0.03);
  const rw = ctx.measureText(R).width;
  ctx.font = `${Math.round(w * 0.28)}px sans-serif`; ctx.fillText(SUITS[st(c)], w * 0.1 + rw, h * 0.045);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${Math.round(w * 0.62)}px sans-serif`;
  ctx.fillText(SUITS[st(c)], w / 2, h * 0.6);
  ctx.restore();
}
