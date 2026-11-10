// Lá bài: mặc định là bộ bài SVG chung BGVN Deck (shared/ui/deck) – kiểu chỉ số NGANG ở mép trên
// để đọc được cả khi các lá xếp chồng sát nhau.
// Theme ảnh (mỗi lá 1 file SVG trong themes/<thư mục>/, xem README.txt ở đó) – chỉ tải khi chọn theme:
//   🏺 Ai Cập: bộ bài KDE "Ancient Egyptians" (LGPL-2.0) + nền KPatience "Desert Sands" (GPL-2.0+)
//   🐧 Cánh cụt: bộ bài KDE "Penguins" (GPL-3.0+, Tux của Larry Ewing…) + nền băng tuyết BGVN tự vẽ
//   👑 Tim hồng: bộ bài KDE "Jolly Royal" (LGPL-2.0) + nền KPatience "Royal Hearts" (GPL-2.0+)
//   🐱 Mèo con: BGVN tự vẽ cả bộ – 52 mặt mèo hồng pastel (themes/meocon/make-cards.mjs sinh ra; lá nhỏ tự đổi kiểu compact
//      bằng @media bên trong SVG) + lưng mèo tam thể
import { RANKS, SUITS, rk, st, isRed } from './core.js?v=1';
import { faceSVG, backSVG, faceImage } from '../../shared/ui/deck/deck.js?v=1';

export const EGYPT_CREDIT = 'Bộ bài Ancient Egyptians (Sean Wilson) – KDE libkdegames, giấy phép GNU LGPL 2.0 · Nền bàn Desert Sands (Sean Wilson) – KDE KPatience, giấy phép GNU GPL 2.0 trở lên';
// dir: thư mục ảnh (có cards/<hạng>_<chất>.svg + back.svg); r: bo góc / bề rộng; ix: phủ nhãn chỉ số dễ đọc khi lá nhỏ
export const THEMES = {
  classic: { name: '🃏 Cổ điển', desc: 'Bộ bài BGVN tự vẽ, bàn nỉ xanh' },
  meo: { name: '🐱 Mèo con', desc: 'Cả bộ bài mèo hồng pastel – J Q K là 12 bé mèo hoàng gia, BGVN tự vẽ', dir: 'themes/meocon/', back: 'themes/meocon/back.svg?v=1', r: 0.08,
    credit: 'Mặt bài, lưng bài và nền bàn Mèo con: BGVN tự vẽ', readme: 'themes/meocon/README.txt' },
  catdan: { name: '✂️ Cắt dán', desc: 'Bộ bài collage giấy cắt – sticker, tem, băng keo; J Q K là gấu, thỏ, cáo hoàng gia. BGVN tự vẽ', dir: 'themes/catdan/', back: 'themes/catdan/back.svg?v=1', r: 0.06,
    credit: 'Mặt bài, lưng bài và nền bàn Cắt dán: BGVN tự vẽ', readme: 'themes/catdan/README.txt' },
  penguins: { name: '🐧 Cánh cụt', desc: 'Bộ bài Penguins của KDE – J Q K là chim cánh cụt Tux', dir: 'themes/penguins/', r: 0.07, ix: true,
    credit: 'Bộ bài Penguins (Matthew Woehlke 2009, dựa trên Ace of Penguins của DJ Delorie & Markus Oberhumer; Original Tux artwork created by Larry Ewing, Simon Budig and Anja Gerwinski) – KDE libkdegames, giấy phép GNU GPL 3.0 trở lên · Nền băng tuyết: BGVN tự vẽ',
    readme: 'themes/penguins/README.txt' },
  royal: { name: '👑 Tim hồng', desc: 'Bộ bài Jolly Royal + nền Royal Hearts của KDE', dir: 'themes/royalhearts/', r: 0.06, ix: true,
    credit: 'Bộ bài Jolly Royal (Sean Wilson) – KDE libkdegames, giấy phép GNU LGPL 2.0 · Nền bàn Royal Hearts (Sean Wilson & Eugene Trounev) – KDE KPatience, giấy phép GNU GPL 2.0 trở lên',
    readme: 'themes/royalhearts/README.txt' },
  egypt: { name: '🏺 Ai Cập', desc: 'Bộ bài Ancient Egyptians + nền Desert Sands của KDE KPatience', dir: 'themes/ancientegypt/', r: 0.045,
    credit: EGYPT_CREDIT, readme: 'themes/ancientegypt/README.txt' },
};
const TV = '?v=1';
const KR = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'], KS = ['spade', 'heart', 'diamond', 'club'];
export const themeURL = (t, c) => `${THEMES[t].dir}cards/${KR[rk(c)]}_${KS[st(c)]}.svg${TV}`;
const backURL = t => THEMES[t].back || (THEMES[t].dir ? `${THEMES[t].dir}cards/back.svg${TV}` : null);
export const egyptURL = c => themeURL('egypt', c);
export const EGYPT_BACK = backURL('egypt');

const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
let theme = THEMES[LS.get('sol-theme')] ? LS.get('sol-theme') : 'classic';
const applyTheme = () => { if (typeof document !== 'undefined') document.documentElement.dataset.solTheme = theme; };
applyTheme();
export const getTheme = () => theme;
export function setTheme(t) { if (!THEMES[t]) return theme; theme = t; LS.set('sol-theme', t); applyTheme(); preload(); return t; }

// Mặt/lưng vẽ bằng bộ bài SVG chung (shared/ui/deck), kiểu chỉ số NGANG ('row') để đọc được khi xếp chồng dọc.
const RNUM = r => r + 1; // rk(c) 0..12 → A..K
const img = src => `<img class="th-img" src="${src}" alt="" draggable="false" decoding="async">`;
// nhãn chỉ số của BGVN phủ lên góc lá ảnh – chỉ hiện khi lá nhỏ (CSS #board.small), để bộ bài nét mảnh vẫn đọc được
const ixHTML = c => `<b class="th-ix" aria-hidden="true">${RANKS[rk(c)]}<i>${SUITS[st(c)]}</i></b>`;
function faceFor(t, c) {
  const T = THEMES[t];
  if (T.dir) return img(themeURL(t, c)) + (T.ix ? ixHTML(c) : '');
  return faceSVG(RNUM(rk(c)), SUITS[st(c)], { index: 'row' });
}
const backFor = t => (backURL(t) ? img(backURL(t)) : backSVG());
export function faceHTML(c) { return faceFor(theme, c); }
export function backHTML() { return `<span class="bk">${backFor(theme)}</span>`; }
// lá tĩnh (cho hướng dẫn / chọn kiểu chơi)
export function cardHTML(c, cls = '') { return `<div class="pc st ${isRed(c) ? 'red' : 'blk'} ${cls}">${faceHTML(c)}</div>`; }

// vẽ lá lên canvas (hoạt ảnh thắng): dùng ảnh SVG của bộ bài (nạp sẵn lúc rảnh); chưa nạp xong thì vẽ dạng đơn giản
const thImgs = new Map();
const thImg = c => { const k = theme + c; let im = thImgs.get(k); if (!im) { im = new Image(); im.decoding = 'async'; im.src = themeURL(theme, c); thImgs.set(k, im); } return im; };
const imgOf = c => (THEMES[theme].dir ? thImg(c) : faceImage(RNUM(rk(c)), SUITS[st(c)], { index: 'row' }));
function preload() {
  if (typeof window === 'undefined') return;
  (window.requestIdleCallback || (f => setTimeout(f, 1500)))(() => { for (let c = 0; c < 52; c++) imgOf(c); });
}
preload();
export function drawCard(ctx, c, w, h) {
  const r = Math.max(3, w * (THEMES[theme].r || 0.09)), im = imgOf(c);
  ctx.save();
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0.5, 0.5, w - 1, h - 1, r) : ctx.rect(0.5, 0.5, w - 1, h - 1);
  if (im.complete && im.naturalWidth) {
    ctx.clip();
    if (!THEMES[theme].dir) { ctx.fillStyle = theme === 'meo' ? '#fff8fb' : '#fbf7ee'; ctx.fill(); }
    ctx.drawImage(im, 0, 0, w, h); ctx.restore(); return;
  }
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
// xem trước 1 theme (A♠, Q♥, K♣ + lưng) – dùng trong hộp chọn giao diện, không phụ thuộc theme đang bật.
// Ảnh xem trước tải lười (loading=lazy) – chỉ 4 file nhỏ mỗi theme.
export function previewHTML(t) {
  const cs = [0, 24, 51];
  const face = c => faceFor(t, c).replace('<img ', '<img loading="lazy" ');
  return `<div class="th-prev tp-${t}">${cs.map(c => `<div class="pc st ${isRed(c) ? 'red' : 'blk'}">${face(c)}</div>`).join('')}<div class="pc st down"><span class="bk">${backFor(t).replace('<img ', '<img loading="lazy" ')}</span></div></div>`;
}
