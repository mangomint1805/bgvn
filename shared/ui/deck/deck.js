// BGVN Deck – bộ bài Tây 52 lá vẽ 100% bằng SVG (tự vẽ, không chép mẫu bài thương mại).
// Mỗi mặt lá được sinh MỘT lần thành <symbol> trong 1 sprite ẩn, mọi lá trên màn hình chỉ là <use href="#…">
// → 52+ lá trên điện thoại vẫn nhẹ. Lá nhỏ (< 50px) tự đổi sang kiểu "compact" (chỉ số to + chất to) bằng container query.
//
// API chính (xem cuối file): cardHTML, backHTML, faceSVG, backSVG, setBack/getBack/BACKS, setFourColor/getFourColor,
// faceDataURI/backDataURI (SVG độc lập cho <img>/canvas), normRank/normSuit, rankLabel, SUIT_CHAR.

const W = 200, H = 280;
const INK = '#1d1a17', GOLD = '#d4a22a', GOLD_D = '#9c7414', RED = '#b42a2f', BLUE = '#26468f', SKIN = '#f8e2c8', PAPER = '#fdf9ef', STEEL = '#e6eaf0';

// ---------- chất ----------
const SUIT_PATH = {
  h: '<path d="M50 93C46 86 36 76 24 64 11 51 3 41 3 28 3 14 13 4 27 4c10 0 18 6 23 17C55 10 63 4 73 4c14 0 24 10 24 24 0 13-8 23-21 36C64 76 54 86 50 93z"/>',
  d: '<path d="M50 1C59 19 72 35 89 50 72 65 59 81 50 99 41 81 28 65 11 50 28 35 41 19 50 1z"/>',
  s: '<path d="M50 2C55 15 66 25 78 35 90 45 97 53 97 65c0 12-9 21-21 21-9 0-16-4-20-11 1 10 5 17 13 22H31c8-5 12-12 13-22-4 7-11 11-20 11C12 86 3 77 3 65 3 53 10 45 22 35 34 25 45 15 50 2z"/>',
  c: '<circle cx="50" cy="27" r="21"/><circle cx="26" cy="58" r="21"/><circle cx="74" cy="58" r="21"/><path d="M42 40h16v24H42z"/><path d="M46 58c0 18-4 30-14 39h36c-10-9-14-21-14-39z"/>',
};
export const SUIT_KEYS = ['s', 'h', 'd', 'c'];
export const SUIT_CHAR = { s: '♠', h: '♥', d: '♦', c: '♣' };
const SUIT_DEF = { s: '#1b1a1f', h: '#c4152f', d: '#c4152f', c: '#1b1a1f' };
const sFill = s => `var(--dk-${s},${SUIT_DEF[s]})`;
const isRedS = s => s === 'h' || s === 'd';

// ---------- chữ số chỉ số (tự vẽ bằng nét, không phụ thuộc font) – hộp cao 40 ----------
const G = {
  1: [26, 'M1.5 40H9M17 40h7.5M3.5 40L13 1 22.5 40M7 27.5h12'],
  2: [24, 'M3 11C3 4.5 7 1 12.5 1 18.5 1 22 5 22 10.5 22 18.5 13 25 3.5 37.5V40H22.5V34'],
  3: [24, 'M2.5 6C5 2.5 8.5 1 12.5 1 18.5 1 21.5 4.5 21.5 9.5 21.5 15 17.5 18.5 10.5 18.8 18.5 19.2 22.5 23.5 22.5 29.5 22.5 36 18 39.5 12 39.5 7.5 39.5 4 38 2 35'],
  4: [24, 'M16.5 40V1.5L2 28.5H23.5M11.5 40h10'],
  5: [24, 'M21.5 2H6.5L4.5 19C7 17 9.5 15.8 13 15.8 19 15.8 22.5 20.5 22.5 27 22.5 35 18.2 39.5 12 39.5 7.5 39.5 4.5 37.5 2.5 34.5'],
  6: [24, 'M20 3.5C18 1.8 16 1 13.5 1 6.5 1 2.5 8 2.5 21.5 2.5 33.5 6.5 39.5 12.8 39.5 19 39.5 22.5 34.5 22.5 28 22.5 21 18.8 16.8 13.2 16.8 8.5 16.8 4.8 19.5 3 23.5'],
  7: [24, 'M2.5 8V2.5H22C15.5 13 11.5 25 10.5 40'],
  8: [24, 'M12.5 19C7.5 19 4 16 4 10.3 4 4.5 7.6 1 12.5 1S21 4.5 21 10.3C21 16 17.5 19 12.5 19 6.5 19 2.5 23 2.5 29.3 2.5 35.8 6.8 39.5 12.5 39.5S22.5 35.8 22.5 29.3C22.5 23 18.5 19 12.5 19z'],
  9: [24, 'M5 36.5C7 38.2 9 39 11.5 39 18.5 39 22.5 32 22.5 18.5 22.5 6.5 18.5.5 12.2.5 6 .5 2.5 5.5 2.5 12 2.5 19 6.2 23.2 11.8 23.2 16.5 23.2 20.2 20.5 22 16.5'],
  10: [33, 'M1.5 7.5L8 2V40M2.5 40H13.5M24.3 1C19.3 1 16.6 8 16.6 20.2S19.3 39.5 24.3 39.5 32 32.4 32 20.2 29.3 1 24.3 1z'],
  11: [22, 'M9 1.5H21M17 1.5V29C17 36 13.8 39.5 9.5 39.5 5.5 39.5 2.5 37 2 33'],
  12: [26, 'M13 1C6.5 1 2.5 8.5 2.5 20.3S6.5 39.5 13 39.5 23.5 32 23.5 20.3 19.5 1 13 1zM13.5 30.5L23 42'],
  13: [27, 'M5.5 1.5V40M1 1.5H10M1 40H10M24 1.5L6 24.5M11.5 17.5L24.5 40M18.5 1.5H26.5M19 40H27'],
};
export const RANK_TXT = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
export const rankLabel = r => RANK_TXT[normRank(r)] || String(normRank(r));

// chuẩn hoá đầu vào: 1/14/'A', 2..10/'T', 11..13/'J''Q''K' ; chất 's''h''d''c' (hoa/thường) hoặc ♠♥♦♣
export function normRank(r) {
  if (typeof r === 'number') return r === 14 ? 1 : r;
  const t = String(r).toUpperCase();
  return { A: 1, T: 10, J: 11, Q: 12, K: 13 }[t] || parseInt(t, 10);
}
export function normSuit(s) {
  const t = String(s).replace(/︎|️/g, '');
  return { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' }[t] || t.toLowerCase();
}

// chỉ số: chữ (nét) + chất nhỏ, căn giữa theo cx. h = chiều cao chữ
function rankGlyph(r, cx, top, h, s, sw = 6) {
  const [gw, d] = G[r], k = h / 40;
  return `<path transform="translate(${(cx - gw * k / 2).toFixed(2)} ${top}) scale(${k})" d="${d}" fill="none" stroke-width="${sw}" stroke-linejoin="round" style="stroke:${sFill(s)}"/>`;
}
const pip = (s, cx, cy, w, flip = false) =>
  `<use href="#dk-su-${s}" x="${cx - w / 2}" y="${cy - w / 2}" width="${w}" height="${w}"${flip ? ` transform="rotate(180 ${cx} ${cy})"` : ''} style="fill:${sFill(s)}"/>`;
const both = g => `${g}<g transform="rotate(180 ${W / 2} ${H / 2})">${g}</g>`;

// ---------- bố cục chấm (A–10) ----------
const XL = 64, XC = 100, XR = 136, Y0 = 52, Y1 = 228;
const yAt = f => Y0 + (Y1 - Y0) * f;
const LAYOUT = {
  2: [[XC, 0], [XC, 1]],
  3: [[XC, 0], [XC, .5], [XC, 1]],
  4: [[XL, 0], [XR, 0], [XL, 1], [XR, 1]],
  5: [[XL, 0], [XR, 0], [XC, .5], [XL, 1], [XR, 1]],
  6: [[XL, 0], [XR, 0], [XL, .5], [XR, .5], [XL, 1], [XR, 1]],
  7: [[XL, 0], [XR, 0], [XC, .25], [XL, .5], [XR, .5], [XL, 1], [XR, 1]],
  8: [[XL, 0], [XR, 0], [XC, .25], [XL, .5], [XR, .5], [XC, .75], [XL, 1], [XR, 1]],
  9: [[XL, 0], [XR, 0], [XL, 1 / 3], [XR, 1 / 3], [XC, .5], [XL, 2 / 3], [XR, 2 / 3], [XL, 1], [XR, 1]],
  10: [[XL, 0], [XR, 0], [XC, 1 / 6], [XL, 1 / 3], [XR, 1 / 3], [XL, 2 / 3], [XR, 2 / 3], [XC, 5 / 6], [XL, 1], [XR, 1]],
};
const index = (r, s) => both(rankGlyph(r, 22.5, 9, 46, s, 6.2) + pip(s, 22.5, 73, 25));

function aceOfSpades() {
  let leaves = '';
  for (let i = 0; i < 24; i++) {
    const a = i * 15;
    leaves += `<path transform="rotate(${a} 100 140) translate(100 70)" d="${i % 2 ? 'M0-4.5C2.4-1.6 2.4 1.6 0 4.5-2.4 1.6-2.4-1.6 0-4.5z' : 'M0-7C3.6-2.6 3.6 2.6 0 7-3.6 2.6-3.6-2.6 0-7z'}" fill="${i % 2 ? GOLD : INK}"/>`;
  }
  return `<circle cx="100" cy="140" r="62" fill="none" stroke="${INK}" stroke-width="1.6"/><circle cx="100" cy="140" r="58" fill="#fffaf0" stroke="${GOLD}" stroke-width="1.2"/>
  ${leaves}
  <circle cx="100" cy="140" r="78" fill="none" stroke="${INK}" stroke-width=".8" stroke-dasharray="1.5 3.2"/>
  <use href="#dk-su-s" x="48" y="86" width="104" height="104" style="fill:${sFill('s')}"/>
  <use href="#dk-su-s" x="62" y="101" width="76" height="76" fill="none" stroke="${GOLD}" stroke-width="2.4" style="fill:none"/>
  <g transform="translate(100 126)"><circle r="9.5" fill="${RED}" stroke="${GOLD}" stroke-width="2.5"/><path d="M0-15 3-3 15 0 3 3 0 15-3 3-15 0-3-3z" fill="${GOLD}" opacity=".95"/><circle r="3.2" fill="${PAPER}"/></g>
  <g transform="translate(100 232)"><path d="M-38-9H38L32 0 38 9H-38L-32 0z" fill="${INK}"/><path d="M-30-6H30M-30 6H30" stroke="${GOLD}" stroke-width=".9"/>
  <text y="4.3" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="12" letter-spacing="3" fill="${GOLD}">BGVN</text></g>`;
}

// ---------- J / Q / K: hình đôi (đối xứng tâm) trong khung ----------
const PX = 42, PY = 16, PW = 116, PH = 248; // khung
const SUIT_IDX = { s: 0, h: 1, d: 2, c: 3 };
// bảng màu áo theo chất × hạng: [áo chính, vạt trong, tay áo]
const SCHEME = {
  s: { 13: [BLUE, RED, GOLD], 12: [INK, GOLD, BLUE], 11: [RED, BLUE, GOLD] },
  h: { 13: [RED, GOLD, BLUE], 12: [BLUE, RED, GOLD], 11: [GOLD, RED, BLUE] },
  d: { 13: [GOLD, BLUE, RED], 12: [RED, BLUE, GOLD], 11: [BLUE, GOLD, RED] },
  c: { 13: [INK, RED, GOLD], 12: [GOLD, INK, RED], 11: [BLUE, RED, INK] },
};
const ITEM = { // vật cầm tay
  s: { 13: 'sword', 12: 'scepter', 11: 'halberd' },
  h: { 13: 'swordBack', 12: 'rose', 11: 'feather' },
  d: { 13: 'axe', 12: 'fan', 11: 'spear' },
  c: { 13: 'orb', 12: 'tulip', 11: 'arrow' },
};
const MIRROR = { s: { 13: 0, 12: 1, 11: 0 }, h: { 13: 1, 12: 0, 11: 1 }, d: { 13: 0, 12: 1, 11: 1 }, c: { 13: 1, 12: 0, 11: 0 } };
const HAIR = { 13: '#e9e4da', 12: '#d9a43a', 11: '#4a2c17' };
const ink = (w = 1.3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"`;
const PAT = ['dk-p-dot', 'dk-p-chk', 'dk-p-str', 'dk-p-flo'];

function item(kind, inner) {
  const hand = `<ellipse cx="92" cy="101" rx="6.2" ry="5.2" fill="${SKIN}" ${ink(1.1)}/>`;
  switch (kind) {
    case 'sword': return `<path d="M89.6 98V10L92 2l2.4 8v88z" fill="${STEEL}" ${ink(1.1)}/><path d="M92 14v80" stroke="#aab3c0" stroke-width=".9"/><rect x="83" y="93" width="18" height="4.4" rx="2" fill="${GOLD}" ${ink(1)}/><rect x="90.3" y="97" width="3.4" height="15" fill="${INK}"/><circle cx="92" cy="114" r="3.2" fill="${GOLD}" ${ink(1)}/>${hand}`;
    case 'swordBack': return `<g transform="rotate(14 92 100)"><path d="M89.6 98V8L92 0l2.4 8v90z" fill="${STEEL}" ${ink(1.1)}/><rect x="83" y="93" width="18" height="4.4" rx="2" fill="${GOLD}" ${ink(1)}/><rect x="90.3" y="97" width="3.4" height="14" fill="${INK}"/><circle cx="92" cy="113" r="3.2" fill="${GOLD}" ${ink(1)}/></g>${hand}`;
    case 'axe': return `<path d="M92 128V12" stroke="${INK}" stroke-width="4.4"/><path d="M92 128V12" stroke="#8a5a2b" stroke-width="2.4"/><path d="M93 16c10-4 17 2 18 14-2 7-7 9-18 10z" fill="${STEEL}" ${ink(1.1)}/><path d="M91 18c-6 2-9 6-9 10 0 4 3 8 9 9" fill="${STEEL}" ${ink(1.1)}/><circle cx="92" cy="11" r="3" fill="${GOLD}" ${ink(1)}/>${hand}`;
    case 'orb': return `<circle cx="92" cy="88" r="11" fill="${GOLD}" ${ink(1.2)}/><path d="M81 88h22M92 77v22" stroke="${GOLD_D}" stroke-width="1.6"/><circle cx="92" cy="88" r="3" fill="${RED}"/><path d="M92 77v-9M88 71.5h8" stroke="${INK}" stroke-width="2.6"/><path d="M92 77v-9M88 71.5h8" stroke="${GOLD}" stroke-width="1.2"/>${hand}`;
    case 'scepter': return `<path d="M92 126V24" stroke="${INK}" stroke-width="4.2"/><path d="M92 126V24" stroke="${GOLD}" stroke-width="2.2"/><circle cx="92" cy="20" r="5.5" fill="${GOLD}" ${ink(1.1)}/><circle cx="85.5" cy="17" r="3.2" fill="${GOLD}" ${ink(1)}/><circle cx="98.5" cy="17" r="3.2" fill="${GOLD}" ${ink(1)}/><circle cx="92" cy="11.5" r="3.4" fill="${RED}" ${ink(1)}/>${hand}`;
    case 'rose': return `<path d="M92 104C90 88 86 76 84 66" fill="none" stroke="${INK}" stroke-width="1.6"/><path d="M88 86c-7-2-10-7-9-12 6 0 9 5 9 12z" fill="${GOLD}" ${ink(1)}/><circle cx="84" cy="60" r="8" fill="${RED}" ${ink(1.2)}/><path d="M84 55c3 0 4 3 2 5s-6 1-5-2 4-4 7-1" fill="none" stroke="#7a1218" stroke-width="1.1"/>${hand}`;
    case 'tulip': return `<path d="M92 104V70" stroke="${INK}" stroke-width="1.6"/><path d="M92 92c6-4 10-10 9-16-6 2-9 8-9 16z" fill="${GOLD}" ${ink(1)}/><path d="M84 58c0 8 3 13 8 13s8-5 8-13l-4 4-4-7-4 7z" fill="${inner === GOLD ? RED : inner}" ${ink(1.2)}/>${hand}`;
    case 'fan': return `<path d="M92 100L72 66A30 30 0 0 1 108 62z" fill="${PAPER}" ${ink(1.2)}/><path d="M92 100L78 64M92 100L86 61M92 100L94 60M92 100L101 61" stroke="${GOLD_D}" stroke-width="1"/><path d="M72 66A30 30 0 0 1 108 62" fill="none" stroke="${RED}" stroke-width="3"/>${hand}`;
    case 'halberd': return `<path d="M92 130V10" stroke="${INK}" stroke-width="4"/><path d="M92 130V10" stroke="#8a5a2b" stroke-width="2"/><path d="M92 2l3.4 10h-6.8z" fill="${STEEL}" ${ink(1)}/><path d="M94 16c8 0 13 4 13 11-5-2-9-2-13 0z" fill="${STEEL}" ${ink(1.1)}/><path d="M90 18l-6 5 6 3" fill="${STEEL}" ${ink(1)}/>${hand}`;
    case 'spear': return `<path d="M92 130V18" stroke="${INK}" stroke-width="4"/><path d="M92 130V18" stroke="#8a5a2b" stroke-width="2"/><path d="M92 2c4 6 5 12 3.6 18h-7.2C87 14 88 8 92 2z" fill="${STEEL}" ${ink(1.1)}/><path d="M88 22c-4 4-4 9 0 12M96 22c4 4 4 9 0 12" fill="none" stroke="${RED}" stroke-width="2.2"/>${hand}`;
    case 'arrow': return `<path d="M92 120V16" stroke="${INK}" stroke-width="2.8"/><path d="M92 120V16" stroke="#c99b5a" stroke-width="1.2"/><path d="M92 6l4.5 11h-9z" fill="${STEEL}" ${ink(1)}/><path d="M92 112l-5 9v6l5-5 5 5v-6z" fill="${RED}" ${ink(.9)}/>${hand}`;
    case 'feather': return `<path d="M92 104C90 80 96 56 110 40 112 58 104 82 94 102" fill="${PAPER}" ${ink(1.2)}/><path d="M93 100C95 80 100 62 108 46" fill="none" stroke="${GOLD_D}" stroke-width="1"/><path d="M96 88l8-6M95 78l9-7M97 68l7-6" stroke="${GOLD}" stroke-width="1"/>${hand}`;
  }
  return hand;
}

function figure(r, s) {
  const [main, inner, sleeve] = SCHEME[s][r], hair = HAIR[r], it = ITEM[s][r];
  const pat = PAT[(SUIT_IDX[s] + r) % 4];
  const trimCol = main === GOLD ? INK : GOLD;
  const o = [];
  // vật ra sau lưng (vd kiếm chéo)
  // tóc sau (Q: tóc dài; K: tóc bạc chấm vai)
  o.push('<g transform="translate(58 64) scale(1.13) translate(-58 -64)">');
  if (r === 12) o.push(`<path d="M41 47c-2-16 7-23 17-23s19 7 17 23c0 13 3 21 7 27l-14-2-2-18H52l-2 18-14 2c4-6 6-14 5-27z" fill="${hair}" ${ink()}/>`);
  if (r === 13) o.push(`<path d="M43 46c-1 10 1 17 6 22h20c5-5 7-12 6-22z" fill="${hair}" ${ink()}/>`);
  o.push('</g>');
  // khăn choàng / áo choàng sau vai
  o.push(`<path d="M5 140V98C7 84 22 76 42 73L58 80 74 73C94 76 109 84 111 98V140z" fill="${main}" ${ink(1.4)}/>`);
  // hoa văn viền áo
  o.push(`<path d="M10 140V99C12 88 25 81 41 78M106 140V99C104 88 91 81 75 78" fill="none" stroke="${trimCol}" stroke-width="2.2"/>`);
  // vạt trước có hoa văn
  o.push(`<path d="M45 75L58 83 71 75 78 140H38z" fill="${inner}" ${ink(1.2)}/><path d="M45 75L58 83 71 75 78 140H38z" fill="url(#${pat})"/><path d="M45 75L58 83 71 75M58 83V140" fill="none" stroke="${trimCol}" stroke-width="1.6"/>`);
  // tay áo + bàn tay giữ vật (bên phải)
  o.push(`<path d="M74 74C90 78 100 88 99 100L86 104C86 94 82 87 72 83z" fill="${sleeve}" ${ink(1.2)}/><path d="M86.5 100.5L99 97" stroke="${trimCol === INK ? GOLD : trimCol}" stroke-width="3"/>`);
  // tay trái đặt trên ngực
  o.push(`<path d="M42 76C30 82 26 92 30 102L44 99C40 92 42 86 46 82z" fill="${sleeve}" ${ink(1.2)}/><ellipse cx="45" cy="99" rx="5.6" ry="4.6" fill="${SKIN}" ${ink(1.1)}/>`);
  // cổ + cổ áo
  o.push(`<path d="M53 60h10v12H53z" fill="${SKIN}" ${ink(1.1)}/>`);
  if (r === 13) { // cổ lông chồn
    o.push(`<path d="M36 72C42 64 74 64 80 72 76 81 40 81 36 72z" fill="${PAPER}" ${ink(1.2)}/><path d="M44 72v3M51 74v3M58 75v3M65 74v3M72 72v3" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`);
  } else { // cổ xếp ly
    let d = 'M38 71', n = 8; for (let i = 0; i < n; i++) { const x0 = 38 + i * 40 / n, x1 = x0 + 40 / n; d += `Q${(x0 + x1) / 2} ${i % 2 ? 80 : 79} ${x1} 71`; }
    o.push(`<path d="${d}Q58 66 38 71z" fill="${PAPER}" ${ink(1.1)}/>`);
  }
  // mặt
  o.push('<g transform="translate(58 64) scale(1.13) translate(-58 -64)">');
  o.push(`<ellipse cx="58" cy="47" rx="11.5" ry="14" fill="${SKIN}" ${ink(1.2)}/>`);
  o.push(`<path d="M50.5 42.5q3.4-1.8 6.4 0M59.5 42.5q3.4-1.8 6.4 0" fill="none" stroke="${INK}" stroke-width="1"/>`);
  o.push(`<path d="M51.6 46.2q2.3-1.6 4.6 0M60.2 46.2q2.3-1.6 4.6 0" fill="none" stroke="${INK}" stroke-width="1.1"/><circle cx="53.9" cy="46.6" r=".95" fill="${INK}"/><circle cx="62.5" cy="46.6" r=".95" fill="${INK}"/>`);
  o.push(`<path d="M58.4 46.5L56.6 52.4 58.8 53" fill="none" stroke="${INK}" stroke-width="1"/>`);
  o.push(`<circle cx="51.5" cy="52.5" r="2.2" fill="#e9a08f" opacity=".55"/><circle cx="64.5" cy="52.5" r="2.2" fill="#e9a08f" opacity=".55"/>`);
  if (r === 13) { // râu
    o.push(`<path d="M46.8 51c.6 10 5 16.5 11.2 17 6.2-.5 10.6-7 11.2-17-2.6 4.5-6.6 6-11.2 6s-8.6-1.5-11.2-6z" fill="${hair}" ${ink(1.1)}/><path d="M51.5 54.5c3-2 5-2 6.5-.6 1.5-1.4 3.5-1.4 6.5.6-3 2-5 1.5-6.5.4-1.5 1.1-3.5 1.6-6.5-.4z" fill="${hair}" ${ink(1)}/><path d="M55 57.8q3 1.3 6 0" fill="none" stroke="${RED}" stroke-width="1.2"/><path d="M52 60l1 5M58 62v5M64 60l-1 5" stroke="#b9b1a3" stroke-width=".8"/>`);
  } else {
    o.push(`<path d="M54.5 56.4q3.5 2 7 0" fill="none" stroke="${RED}" stroke-width="1.5" stroke-linecap="round"/>`);
  }
  // tóc trước
  if (r === 12) o.push(`<path d="M46.5 40c3-8 20-9 23 0-5-3-9-3-11.5 1C55.5 37 51 37 46.5 40z" fill="${hair}" ${ink(1)}/>`);
  if (r === 11) o.push(`<path d="M44 52c-4-14 3-23 14-23s18 9 14 23c-1-5-2-9-4-11-6 2-14 2-20 0-2 2-3 6-4 11z" fill="${hair}" ${ink(1.1)}/><path d="M44 52c-2 4-1 9 2 12M72 52c2 4 1 9-2 12" fill="none" stroke="${INK}" stroke-width="1.1"/><path d="M43.5 52c-1.5 4-.5 8 2.5 12l1-10zM72.5 52c1.5 4 .5 8-2.5 12l-1-10z" fill="${hair}"/>`);
  if (r === 13) o.push(`<path d="M46 40c3-5 21-5 24 0" fill="none" stroke="${INK}" stroke-width="1"/>`);
  // đội đầu
  if (r === 13) o.push(`<path d="M43 37L40.5 13 48.5 23 53 8 58 21 63 8 67.5 23 75.5 13 73 37z" fill="${GOLD}" ${ink(1.3)}/><path d="M42.2 31H73.8" stroke="${GOLD_D}" stroke-width="1.2"/><rect x="42.6" y="32" width="30.8" height="6" rx="1.5" fill="${GOLD}" ${ink(1.2)}/><circle cx="50" cy="35" r="1.8" fill="${RED}"/><circle cx="58" cy="35" r="2" fill="${BLUE}"/><circle cx="66" cy="35" r="1.8" fill="${RED}"/><circle cx="40.5" cy="12" r="2.2" fill="${GOLD}" ${ink(1)}/><circle cx="53" cy="7" r="2.2" fill="${GOLD}" ${ink(1)}/><circle cx="63" cy="7" r="2.2" fill="${GOLD}" ${ink(1)}/><circle cx="75.5" cy="12" r="2.2" fill="${GOLD}" ${ink(1)}/><path d="M58 21v-6" stroke="${RED}" stroke-width="2.4"/>`);
  if (r === 12) o.push(`<path d="M45.5 35L44.5 22 50.5 28 54.2 18.5 58 26 61.8 18.5 65.5 28 71.5 22 70.5 35z" fill="${GOLD}" ${ink(1.2)}/><rect x="45" y="32" width="26" height="5" rx="1.5" fill="${GOLD}" ${ink(1.1)}/><circle cx="58" cy="34.5" r="1.8" fill="${RED}"/><circle cx="51" cy="34.5" r="1.3" fill="${BLUE}"/><circle cx="65" cy="34.5" r="1.3" fill="${BLUE}"/><circle cx="54.2" cy="17" r="2" fill="${PAPER}" ${ink(.9)}/><circle cx="61.8" cy="17" r="2" fill="${PAPER}" ${ink(.9)}/><circle cx="44.5" cy="21" r="1.7" fill="${GOLD}" ${ink(.9)}/><circle cx="71.5" cy="21" r="1.7" fill="${GOLD}" ${ink(.9)}/>`);
  if (r === 11) o.push(`<path d="M68 26c6-10 14-16 24-18-3 8-10 15-21 21z" fill="${PAPER}" ${ink(1.1)}/><path d="M70 26c5-7 12-12 19-15" fill="none" stroke="${GOLD_D}" stroke-width=".9"/><path d="M39 36c-2-12 8-19 20-19 13 0 22 7 19 19-12-4-27-4-39 0z" fill="${inner}" ${ink(1.3)}/><path d="M39.5 35.5c12-4 26-4 38.5 0l.4 3.5c-13-4-26-4-39.6 0z" fill="${GOLD}" ${ink(1.1)}/><circle cx="58" cy="25" r="2.6" fill="${GOLD}" ${ink(1)}/>`);
  o.push('</g>');
  o.push(item(it, inner));
  let g = `<g transform="translate(0 3)">${o.join('')}</g>`;
  if (MIRROR[s][r]) g = `<g transform="translate(${PW} 0) scale(-1 1)">${g}</g>`;
  return g;
}

function court(r, s) {
  const half = `<g clip-path="url(#dk-clip-half)">${figure(r, s)}${pip(s, 13, 13, 15)}</g>`;
  return `<g transform="translate(${PX} ${PY})">
  <rect x="0" y="0" width="${PW}" height="${PH}" rx="3" fill="#fffaf0"/>
  ${half}<g transform="rotate(180 ${PW / 2} ${PH / 2})">${half}</g>
  <path d="M0 ${PH / 2 + 10}L${PW} ${PH / 2 - 10}" stroke="${GOLD}" stroke-width="2.6"/><path d="M0 ${PH / 2 + 10}L${PW} ${PH / 2 - 10}" stroke="${INK}" stroke-width=".9"/>
  <rect x="2.6" y="2.6" width="${PW - 5.2}" height="${PH - 5.2}" rx="2" fill="none" stroke="${GOLD}" stroke-width="1.4"/>
  <rect x="0" y="0" width="${PW}" height="${PH}" rx="3" fill="none" stroke="${INK}" stroke-width="1.6"/></g>`;
}

// ---------- mặt lá đầy đủ ----------
// row = true: kiểu "chỉ số ngang" (số + chất nằm cạnh nhau ở mép trên) cho bài xếp chồng dọc (Solitaire)
const rowIndex = (r, s, h, top, sw, sz) => {
  const k = h / 40, gw = G[r][0] * k, x0 = 9;
  return rankGlyph(r, x0 + gw / 2, top, h, s, sw) + pip(s, x0 + gw + 4 + sz / 2, top + h / 2 + 1, sz);
};
function faceBody(r, s, row = false) {
  let mid = '';
  const ya = row ? f => 66 + 148 * f : yAt;
  if (r === 1) mid = s === 's' ? aceOfSpades() : pip(s, 100, 140, 74);
  else if (r <= 10) mid = LAYOUT[r].map(([x, f]) => pip(s, x, ya(f), 40, f > .5)).join('');
  else mid = row ? `<g transform="translate(100 ${PY + PH}) scale(.86) translate(-100 -${PY + PH})">${court(r, s)}</g>` : court(r, s);
  return mid + (row ? both(rowIndex(r, s, 38, 8, 6, 28)) : index(r, s));
}
// ---------- mặt lá compact (lá nhỏ): chỉ số to + chất to ----------
function compactBody(r, s, row = false) {
  if (row) {
    const big = r >= 11
      ? `<rect x="40" y="118" width="120" height="146" rx="10" fill="#fffaf0" stroke="${GOLD}" stroke-width="5"/><rect x="40" y="118" width="120" height="146" rx="10" fill="none" stroke="${INK}" stroke-width="1.6"/>
         <path transform="translate(100 160) scale(1.2)" d="${COURT_ICON[r]}" fill="${GOLD}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>${pip(s, 100, 222, 56)}`
      : pip(s, 100, 186, r === 1 ? 128 : 112);
    return rowIndex(r, s, 84, 10, 7, 62) + big;
  }
  const big = r >= 11
    ? `<rect x="92" y="150" width="96" height="116" rx="8" fill="#fffaf0" stroke="${GOLD}" stroke-width="5"/><rect x="92" y="150" width="96" height="116" rx="8" fill="none" stroke="${INK}" stroke-width="1.6"/>
       <path transform="translate(140 186)" d="${COURT_ICON[r]}" fill="${GOLD}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
       ${pip(s, 140, 236, 46)}`
    : pip(s, 136, 204, r === 1 ? 108 : 96);
  return rankGlyph(r, 46, 12, 92, s, 7) + pip(s, 46, 140, 54) + big;
}
const COURT_ICON = { 13: 'M-26 14L-30-14-14 0 0-22 14 0 30-14 26 14z', 12: 'M-22 14L-24-10-10 2 0-16 10 2 24-10 22 14z', 11: 'M-26 12c-4-16 10-26 26-26 16 0 30 10 26 26-16-6-36-6-52 0z' };

// ---------- lưng lá ----------
export const BACKS = [
  { id: 'bgvn', name: 'BGVN ngọc lục bảo' },
  { id: 'red', name: 'Lưới đỏ cổ điển' },
  { id: 'navy', name: 'Hoa văn xanh đêm' },
];
function backBody(id) {
  const frame = (base, line, accent) => `<rect x="0" y="0" width="${W}" height="${H}" fill="#fbf7ee"/><rect x="9" y="9" width="${W - 18}" height="${H - 18}" rx="9" fill="${base}"/>`
    + `<rect x="9" y="9" width="${W - 18}" height="${H - 18}" rx="9" fill="url(#dk-bp-${id})"/>`
    + `<rect x="15" y="15" width="${W - 30}" height="${H - 30}" rx="6" fill="none" stroke="${line}" stroke-width="1.6"/><rect x="19" y="19" width="${W - 38}" height="${H - 38}" rx="4" fill="none" stroke="${accent}" stroke-width=".8"/>`;
  if (id === 'red') return frame('#a3182b', '#fff', '#f3d58a') + `<g transform="translate(100 140)"><path d="M0-30 26 0 0 30-26 0z" fill="#a3182b" stroke="#fff" stroke-width="2"/><path d="M0-21 18 0 0 21-18 0z" fill="none" stroke="#f3d58a" stroke-width="1.2"/>${`<use href="#dk-su-h" x="-9" y="-9" width="18" height="18" fill="#fff"/>`}</g>`;
  if (id === 'navy') {
    let star = ''; for (let i = 0; i < 8; i++) star += `<path transform="rotate(${i * 45})" d="M0 0L5-8 0-28-5-8z" fill="${i % 2 ? '#c9d6f2' : GOLD}"/>`;
    return frame('#17254d', GOLD, '#8ea6dc') + `<g transform="translate(100 140)"><circle r="34" fill="#17254d" stroke="${GOLD}" stroke-width="2"/><circle r="29" fill="none" stroke="#8ea6dc" stroke-width=".8"/>${star}<circle r="5" fill="#17254d" stroke="${GOLD}" stroke-width="1.6"/></g>`;
  }
  // bgvn (mặc định): lục bảo + vàng, huy hiệu hoa sen
  let lotus = ''; for (let i = 0; i < 8; i++) lotus += `<path transform="rotate(${i * 45})" d="M0-6C6-12 6-22 0-30-6-22-6-12 0-6z" fill="${i % 2 ? '#0b4a3c' : GOLD}" stroke="${GOLD}" stroke-width="1"/>`;
  return frame('#0f5a49', GOLD, '#8cc7b2') + `<g transform="translate(100 140)"><circle r="40" fill="#0b4a3c" stroke="${GOLD}" stroke-width="2.2"/><circle r="35" fill="none" stroke="${GOLD}" stroke-width=".7" stroke-dasharray="2 2.6"/>${lotus}<circle r="7" fill="${GOLD}"/><circle r="3.2" fill="#0b4a3c"/></g>`
    + `<g fill="${GOLD}" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="11" letter-spacing="3" text-anchor="middle"><text x="100" y="${H - 30}">BGVN</text><text x="100" y="38" transform="rotate(180 100 34.5)">BGVN</text></g>`;
}

// ---------- định nghĩa dùng chung (chất, hoa văn, clip) ----------
const DEFS = () => SUIT_KEYS.map(s => `<symbol id="dk-su-${s}" viewBox="0 0 100 100">${SUIT_PATH[s]}</symbol>`).join('')
  + `<clipPath id="dk-clip-half"><path d="M-2-2H${PW + 2}V${PH / 2 - 10}L-2 ${PH / 2 + 10}z"/></clipPath>`
  + `<pattern id="dk-p-dot" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.25" fill="${GOLD}"/></pattern>`
  + `<pattern id="dk-p-chk" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M4 0 8 4 4 8 0 4z" fill="none" stroke="${GOLD}" stroke-width=".9"/></pattern>`
  + `<pattern id="dk-p-str" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 1.5h6" stroke="${GOLD}" stroke-width="1.1"/></pattern>`
  + `<pattern id="dk-p-flo" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M4.5 2.2 5.4 4.5 4.5 6.8 3.6 4.5z M2.2 4.5 4.5 3.6 6.8 4.5 4.5 5.4z" fill="${GOLD}"/></pattern>`
  + `<pattern id="dk-bp-red" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="translate(9 9)"><path d="M0 0 10 10M10 0 0 10" stroke="#fff" stroke-opacity=".5" stroke-width="1"/><circle cx="5" cy="5" r="1.1" fill="#f3d58a"/></pattern>`
  + `<pattern id="dk-bp-navy" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="translate(100 140)"><circle cx="0" cy="0" r="8" fill="none" stroke="#8ea6dc" stroke-opacity=".55" stroke-width=".9"/><circle cx="16" cy="0" r="8" fill="none" stroke="#8ea6dc" stroke-opacity=".55" stroke-width=".9"/><circle cx="0" cy="16" r="8" fill="none" stroke="#8ea6dc" stroke-opacity=".55" stroke-width=".9"/><circle cx="16" cy="16" r="8" fill="none" stroke="#8ea6dc" stroke-opacity=".55" stroke-width=".9"/><circle cx="8" cy="8" r="8" fill="none" stroke="#8ea6dc" stroke-opacity=".55" stroke-width=".9"/><circle cx="8" cy="8" r="1.3" fill="${GOLD}"/></pattern>`
  + `<pattern id="dk-bp-bgvn" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="translate(100 140) rotate(45)"><rect width="12" height="12" fill="none" stroke="${GOLD}" stroke-opacity=".38" stroke-width=".8"/><circle cx="6" cy="6" r="1.4" fill="${GOLD}" fill-opacity=".7"/></pattern>`;

// ---------- sprite (lazy) ----------
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
let sprite = null, backId = BACKS.some(b => b.id === LS.get('bgvn-deck-back')) ? LS.get('bgvn-deck-back') : 'bgvn';
const made = new Set();
const hasDOM = () => typeof document !== 'undefined' && !!document.body;
const SYM = (id, body) => `<symbol id="${id}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${body}</symbol>`;
function ensureSprite() {
  if (sprite && sprite.isConnected) return sprite;
  sprite = document.getElementById('dk-sprite');
  if (!sprite) {
    sprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sprite.id = 'dk-sprite'; sprite.setAttribute('aria-hidden', 'true');
    sprite.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none');
    sprite.innerHTML = `<defs>${DEFS()}</defs>${SYM('dk-back', backBody(backId))}`;
    document.body.prepend(sprite);
    made.clear();
  }
  return sprite;
}
function ensure(r, s, row = false) {
  const id = r + s + (row ? 'r' : '');
  if (made.has(id) || !hasDOM()) return id;
  ensureSprite().insertAdjacentHTML('beforeend', SYM(`dk-f-${id}`, faceBody(r, s, row)) + SYM(`dk-c-${id}`, compactBody(r, s, row)));
  made.add(id);
  return id;
}

// ---------- API ----------
// SVG bên trong lá (lấp đầy phần tử cha có class dk-card). Kiểu compact tự bật khi lá rộng < 48px
// (ép bằng class dk-compact / dk-full trên lá). opts.index: 'corner' (mặc định, cổ điển) | 'row' (chỉ số ngang – bài xếp chồng dọc)
export function faceSVG(rank, suit, { index = 'corner' } = {}) {
  const r = normRank(rank), s = normSuit(suit), id = ensure(r, s, index === 'row');
  return `<svg class="dk-svg" aria-hidden="true" focusable="false"><use class="dk-f" href="#dk-f-${id}"/><use class="dk-c" href="#dk-c-${id}"/></svg>`;
}
export function backSVG() { if (hasDOM()) ensureSprite(); return '<svg class="dk-svg" aria-hidden="true" focusable="false"><use href="#dk-back"/></svg>'; }
// lá hoàn chỉnh: <div class="dk-card …">
export function cardHTML(rank, suit, { cls = '', attrs = '', tag = 'div', index = 'corner' } = {}) {
  const r = normRank(rank), s = normSuit(suit);
  return `<${tag} class="dk-card ${isRedS(s) ? 'dk-red' : 'dk-blk'} ${cls}" aria-label="${rankLabel(r)}${SUIT_CHAR[s]}" ${attrs}>${faceSVG(r, s, { index })}</${tag}>`;
}
export function backHTML({ cls = '', attrs = '', tag = 'div' } = {}) { return `<${tag} class="dk-card dk-back ${cls}" ${attrs}>${backSVG()}</${tag}>`; }

export function getBack() { return backId; }
export function setBack(id) {
  if (!BACKS.some(b => b.id === id)) return backId;
  backId = id; LS.set('bgvn-deck-back', id);
  if (hasDOM()) { const old = ensureSprite().querySelector('#dk-back'); if (old) old.remove(); sprite.insertAdjacentHTML('beforeend', SYM('dk-back', backBody(id))); }
  return id;
}
// 4 màu: ♠ đen, ♥ đỏ, ♦ xanh dương, ♣ xanh lá
export function getFourColor() { return LS.get('bgvn-deck-4c') === '1'; }
export function setFourColor(on) { LS.set('bgvn-deck-4c', on ? '1' : '0'); if (typeof document !== 'undefined') document.documentElement.classList.toggle('dk-4c', !!on); return !!on; }
if (typeof document !== 'undefined' && getFourColor()) document.documentElement.classList.add('dk-4c');

// SVG độc lập (tự chứa defs + nền giấy) – cho <img src> hoặc canvas drawImage. fourColor mặc định theo cài đặt.
const FOUR = { s: '#1b1a1f', h: '#c4152f', d: '#1f5fbf', c: '#1c7a3e' };
function standalone(body, fourColor) {
  const vars = SUIT_KEYS.map(s => `--dk-${s}:${fourColor ? FOUR[s] : SUIT_DEF[s]}`).join(';');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="${vars}"><defs>${DEFS()}<linearGradient id="dk-stock" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#fffefa"/><stop offset=".6" stop-color="#faf6ec"/><stop offset="1" stop-color="#f1eadb"/></linearGradient></defs>`
    + `<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="14" fill="url(#dk-stock)" stroke="#bdb2a0" stroke-width="1.5"/>`
    + `<svg x="0" y="0" width="${W}" height="${H}"><clipPath id="dk-rr"><rect width="${W}" height="${H}" rx="14"/></clipPath><g clip-path="url(#dk-rr)">${body}</g></svg></svg>`;
}
const uri = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
export function faceDataURI(rank, suit, { compact = false, index = 'corner', fourColor = getFourColor() } = {}) {
  const r = normRank(rank), s = normSuit(suit), row = index === 'row';
  return uri(standalone(compact ? compactBody(r, s, row) : faceBody(r, s, row), fourColor));
}
// Ảnh (HTMLImageElement) đã cache cho canvas: faceImage(r, s, opts).complete === true thì drawImage được
const imgCache = new Map();
export function faceImage(rank, suit, opts = {}) {
  const k = [normRank(rank), normSuit(suit), opts.compact ? 1 : 0, opts.index || 'corner', opts.fourColor ?? getFourColor()].join();
  if (!imgCache.has(k)) { const im = new Image(); im.decoding = 'async'; im.src = faceDataURI(rank, suit, opts); imgCache.set(k, im); }
  return imgCache.get(k);
}
export function backDataURI(id = backId) { return uri(standalone(backBody(id), false)); }
export const CARD_RATIO = H / W; // 1.4
