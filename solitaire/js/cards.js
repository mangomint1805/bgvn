// Lá bài: bộ bài SVG chung BGVN Deck (shared/ui/deck) – kiểu chỉ số NGANG ở mép trên
// để đọc được cả khi các lá xếp chồng sát nhau.
import { RANKS, SUITS, rk, st, isRed } from './core.js?v=1';
import { faceSVG, backSVG, faceImage } from '../../shared/ui/deck/deck.js?v=1';

// Mặt/lưng vẽ bằng bộ bài SVG chung (shared/ui/deck), kiểu chỉ số NGANG ('row') để đọc được khi xếp chồng dọc.
const RNUM = r => r + 1; // rk(c) 0..12 → A..K
export function faceHTML(c) { return faceSVG(RNUM(rk(c)), SUITS[st(c)], { index: 'row' }); }
export const BACK = `<span class="bk">${backSVG()}</span>`;
// lá tĩnh (cho hướng dẫn / chọn kiểu chơi)
export function cardHTML(c, cls = '') { return `<div class="pc st ${isRed(c) ? 'red' : 'blk'} ${cls}">${faceHTML(c)}</div>`; }

// vẽ lá lên canvas (hoạt ảnh thắng): dùng ảnh SVG của bộ bài (nạp sẵn lúc rảnh); chưa nạp xong thì vẽ dạng đơn giản
const imgOf = c => faceImage(RNUM(rk(c)), SUITS[st(c)], { index: 'row' });
if (typeof window !== 'undefined') {
  const pre = () => { for (let c = 0; c < 52; c++) imgOf(c); };
  (window.requestIdleCallback || (f => setTimeout(f, 1500)))(pre);
}
export function drawCard(ctx, c, w, h) {
  const r = Math.max(3, w * 0.09), im = imgOf(c);
  ctx.save();
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0.5, 0.5, w - 1, h - 1, r) : ctx.rect(0.5, 0.5, w - 1, h - 1);
  if (im.complete && im.naturalWidth) { ctx.clip(); ctx.drawImage(im, 0, 0, w, h); ctx.restore(); return; }
  ctx.fillStyle = '#fbf7ee'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#c3b8a5'; ctx.stroke();
  ctx.fillStyle = isRed(c) ? '#c4152f' : '#1b1a1f';
  ctx.textBaseline = 'top'; ctx.font = `800 ${Math.round(w * 0.34)}px "Baloo 2", sans-serif`;
  const R = RANKS[rk(c)]; ctx.fillText(R, w * 0.07, h * 0.03);
  const rw = ctx.measureText(R).width;
  ctx.font = `${Math.round(w * 0.28)}px sans-serif`; ctx.fillText(SUITS[st(c)], w * 0.1 + rw, h * 0.045);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${Math.round(w * 0.62)}px sans-serif`;
  ctx.fillText(SUITS[st(c)], w / 2, h * 0.6);
  ctx.restore();
}
