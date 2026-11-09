// Lá bài: mặc định là bộ bài SVG chung BGVN Deck (shared/ui/deck) – kiểu chỉ số NGANG ở mép trên
// để đọc được cả khi các lá xếp chồng sát nhau.
// Theme "🏺 Ai Cập": bộ bài "Ancient Egyptians" của KDE (libkdegames, LGPL-2.0) + nền "Desert Sands" của KPatience (GPL-2.0+),
// mỗi lá 1 file SVG trong themes/ancientegypt/ (xem README.txt ở đó) – chỉ tải khi chọn theme.
import { RANKS, SUITS, rk, st, isRed } from './core.js?v=1';
import { faceSVG, backSVG, faceImage } from '../../shared/ui/deck/deck.js?v=1';

export const THEMES = {
  classic: { name: '🃏 Cổ điển', desc: 'Bộ bài BGVN tự vẽ, bàn nỉ xanh' },
  egypt: { name: '🏺 Ai Cập', desc: 'Bộ bài Ancient Egyptians + nền Desert Sands của KDE KPatience' },
};
export const EGYPT_CREDIT = 'Bộ bài Ancient Egyptians (Sean Wilson) – KDE libkdegames, giấy phép GNU LGPL 2.0 · Nền bàn Desert Sands (Sean Wilson) – KDE KPatience, giấy phép GNU GPL 2.0 trở lên';
const EG = 'themes/ancientegypt/', EGV = '?v=1';
const KR = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'], KS = ['spade', 'heart', 'diamond', 'club'];
export const egyptURL = c => `${EG}cards/${KR[rk(c)]}_${KS[st(c)]}.svg${EGV}`;
export const EGYPT_BACK = `${EG}cards/back.svg${EGV}`;

const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
let theme = THEMES[LS.get('sol-theme')] ? LS.get('sol-theme') : 'classic';
const applyTheme = () => { if (typeof document !== 'undefined') document.documentElement.dataset.solTheme = theme; };
applyTheme();
export const getTheme = () => theme;
export function setTheme(t) { if (!THEMES[t]) return theme; theme = t; LS.set('sol-theme', t); applyTheme(); preload(); return t; }

// Mặt/lưng vẽ bằng bộ bài SVG chung (shared/ui/deck), kiểu chỉ số NGANG ('row') để đọc được khi xếp chồng dọc.
const RNUM = r => r + 1; // rk(c) 0..12 → A..K
const img = src => `<img class="th-img" src="${src}" alt="" draggable="false" decoding="async">`;
export function faceHTML(c) { return theme === 'egypt' ? img(egyptURL(c)) : faceSVG(RNUM(rk(c)), SUITS[st(c)], { index: 'row' }); }
export function backHTML() { return `<span class="bk">${theme === 'egypt' ? img(EGYPT_BACK) : backSVG()}</span>`; }
// lá tĩnh (cho hướng dẫn / chọn kiểu chơi)
export function cardHTML(c, cls = '') { return `<div class="pc st ${isRed(c) ? 'red' : 'blk'} ${cls}">${faceHTML(c)}</div>`; }

// vẽ lá lên canvas (hoạt ảnh thắng): dùng ảnh SVG của bộ bài (nạp sẵn lúc rảnh); chưa nạp xong thì vẽ dạng đơn giản
const egImgs = new Map();
const egImg = c => { let im = egImgs.get(c); if (!im) { im = new Image(); im.decoding = 'async'; im.src = egyptURL(c); egImgs.set(c, im); } return im; };
const imgOf = c => (theme === 'egypt' ? egImg(c) : faceImage(RNUM(rk(c)), SUITS[st(c)], { index: 'row' }));
function preload() {
  if (typeof window === 'undefined') return;
  (window.requestIdleCallback || (f => setTimeout(f, 1500)))(() => { for (let c = 0; c < 52; c++) imgOf(c); });
}
preload();
export function drawCard(ctx, c, w, h) {
  const r = Math.max(3, w * (theme === 'egypt' ? 0.045 : 0.09)), im = imgOf(c);
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
// xem trước 1 theme (A♠, Q♥, K♣ + lưng) – dùng trong hộp chọn giao diện, không phụ thuộc theme đang bật
export function previewHTML(t) {
  const cs = [0, 24, 51];
  const face = c => (t === 'egypt' ? img(egyptURL(c)) : faceSVG(RNUM(rk(c)), SUITS[st(c)], { index: 'row' }));
  const back = t === 'egypt' ? img(EGYPT_BACK) : backSVG();
  return `<div class="th-prev ${t === 'egypt' ? 'eg' : 'cl'}">${cs.map(c => `<div class="pc st">${face(c)}</div>`).join('')}<div class="pc st down"><span class="bk">${back}</span></div></div>`;
}
