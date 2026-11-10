// Sinh 52 mặt bài "Mèo con" (BGVN tự vẽ) → themes/meocon/cards/<hạng>_<chất>.svg
// Chạy: node solitaire/themes/meocon/make-cards.mjs   (không cần thư viện; file web chỉ đọc các SVG đã sinh)
// Mỗi file có 2 lớp: .f (lá to) và .c (lá nhỏ ≤ 58px: chỉ số to + mèo to) – đổi bằng @media bên trong SVG,
// vì SVG nạp qua <img> tính media query theo đúng bề rộng ảnh trên màn hình.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'cards');
const RED = '#e0527a', RED_D = '#c43765', PLUM = '#4a3b6b', PLUM_D = '#3a2c58';
const LINE = '#5b3a4c', GOLD = '#f6c75a', PINK = '#ff8fb3', CREAM = '#fff7fa';
const n = v => +(+v).toFixed(1);

// ---------- chữ số chỉ số vẽ bằng nét (giống BGVN Deck, không phụ thuộc font) – hộp cao 40 ----------
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

// ---------- chất có tai mèo (hộp 100×100) ----------
const SUIT = {
  h: { d: 'M50 93C46 86 36 76 24 64 11 51 3 41 3 28 3 14 13 4 27 4c10 0 18 6 23 17C55 10 63 4 73 4c14 0 24 10 24 24 0 13-8 23-21 36C64 76 54 86 50 93z', t: 'translate(8 11) scale(.84)',
    ears: [[13, 30], [33, 16], [11, 4]], face: 46 },
  d: { d: 'M50 1C59 19 72 35 89 50 72 65 59 81 50 99 41 81 28 65 11 50 28 35 41 19 50 1z', t: 'translate(6 4) scale(.88)',
    ears: [[22, 38], [40, 18], [14, 13]], face: 52 },
  s: { d: 'M50 2C55 15 66 25 78 35 90 45 97 53 97 65c0 12-9 21-21 21-9 0-16-4-20-11 1 10 5 17 13 22H31c8-5 12-12 13-22-4 7-11 11-20 11C12 86 3 77 3 65 3 53 10 45 22 35 34 25 45 15 50 2z', t: 'translate(8 13) scale(.84)',
    ears: [[19, 46], [36, 27], [12, 20]], face: 62 },
  c: { d: 'M50 6a21 21 0 1 1 0 42 21 21 0 1 1 0-42zM26 37a21 21 0 1 1 0 42 21 21 0 1 1 0-42zM74 37a21 21 0 1 1 0 42 21 21 0 1 1 0-42zM42 40h16v24H42zM54 58c0 18 4 30 14 39H32c10-9 14-21 14-39z', t: 'translate(8 8) scale(.84)',
    ears: [[34, 26], [45, 14], [31, 6]], face: 32 },
};
const isRedS = s => s === 'h' || s === 'd';
const sCol = s => (isRedS(s) ? RED : PLUM), sDark = s => (isRedS(s) ? RED_D : PLUM_D);
const mirror = p => [100 - p[0], p[1]];
const shrink = (tri, k) => { const c = [0, 1].map(i => (tri[0][i] + tri[1][i] + tri[2][i]) / 3); return tri.map(p => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k + 1.5]); };
const poly = (pts, a = '') => `<path d="M${pts.map(p => p.map(n).join(' ')).join('L')}z"${a}/>`;

// symbol "si" (chỉ số: chất + tai, không mặt) và "sp" (chấm: có mặt mèo)
function suitDefs(s) {
  const S = SUIT[s], c = sCol(s), L = S.ears, R = L.map(mirror);
  const ears = poly(L, '') + poly(R, '');
  const shape = `<path transform="${S.t}" d="${S.d}"/>`;
  const si = `<symbol id="si" viewBox="0 0 100 100"><path d="${S.d}" fill="${c}"/></symbol>`; // chỉ số: chất trơn cho dễ đọc
  const red = isRedS(s), y = S.face, cl = s === 'c' ? .62 : 1; // mặt nhỏ hơn trên lá chuồn (nằm trên thuỳ trên)
  const inner = red ? '#ffd0de' : '#b99ad0';
  const eye = x => red
    ? `<ellipse cx="${x}" cy="${y}" rx="${n(4.6 * cl)}" ry="${n(5.6 * cl)}" fill="#4b1f36"/><circle cx="${n(x + 1.6 * cl)}" cy="${n(y - 2 * cl)}" r="${n(1.8 * cl)}" fill="#fff"/>`
    : `<ellipse cx="${x}" cy="${y}" rx="${n(4.8 * cl)}" ry="${n(5.6 * cl)}" fill="#ffe27a"/><ellipse cx="${x}" cy="${y}" rx="${n(1.5 * cl)}" ry="${n(4.4 * cl)}" fill="#2a1f3d"/><circle cx="${n(x + 1.8 * cl)}" cy="${n(y - 2.2 * cl)}" r="${n(1.3 * cl)}" fill="#fff"/>`;
  const dx = 11 * cl, my = y + 8 * cl;
  const face = `${eye(50 - dx)}${eye(50 + dx)}
<ellipse cx="${n(50 - 19 * cl)}" cy="${n(my)}" rx="${n(5 * cl)}" ry="${n(3 * cl)}" fill="${red ? '#ffc2d4' : '#e88fb0'}" opacity=".9"/><ellipse cx="${n(50 + 19 * cl)}" cy="${n(my)}" rx="${n(5 * cl)}" ry="${n(3 * cl)}" fill="${red ? '#ffc2d4' : '#e88fb0'}" opacity=".9"/>
<path d="M${n(50 - 2.4 * cl)} ${n(y + 5.5 * cl)}h${n(4.8 * cl)}l${n(-2.4 * cl)} ${n(2.8 * cl)}z" fill="#ffb3c9"/><path d="M50 ${n(y + 8.3 * cl)}c-.6 ${n(3 * cl)}-${n(4.6 * cl)} ${n(3.6 * cl)}-${n(5.8 * cl)} ${n(1 * cl)}M50 ${n(y + 8.3 * cl)}c.6 ${n(3 * cl)} ${n(4.6 * cl)} ${n(3.6 * cl)} ${n(5.8 * cl)} ${n(1 * cl)}" fill="none" stroke="${red ? '#4b1f36' : '#f3dcf0'}" stroke-width="${n(1.5 * cl)}" stroke-linecap="round"/>`;
  const sp = `<symbol id="sp" viewBox="0 0 100 100"><g fill="${c}" stroke="${sDark(s)}" stroke-width="2.4" stroke-linejoin="round">${ears}${shape}</g>${s === 'c' ? `<g fill="${c}">${shape}</g>` : ''}
<g fill="${inner}">${poly(shrink(L, .5))}${poly(shrink(R, .5))}</g>${face}</symbol>`;
  return si + sp;
}

const STYLE = '<style>.c{display:none}@media (max-width:58px){.f{display:none}.c{display:inline}}</style>';
const PAW = `<pattern id="paw" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(-16)"><g fill="#f6b9cd" fill-opacity=".32"><ellipse cx="12" cy="15" rx="5" ry="4.2"/><circle cx="6.6" cy="9" r="2"/><circle cx="10.4" cy="6.4" r="2"/><circle cx="14.6" cy="6.6" r="2"/><circle cx="18" cy="9.6" r="2"/></g><path d="M35 34c-1.8-1.8-4.2.4-2.3 2.3l2.3 2.3 2.3-2.3c1.9-1.9-.5-4.1-2.3-2.3z" fill="#f6b9cd" fill-opacity=".38"/></pattern>`;
const STOCK = `<rect width="200" height="280" fill="${CREAM}"/><rect width="200" height="280" fill="url(#paw)"/><rect x="4.5" y="4.5" width="191" height="271" rx="13" fill="none" stroke="#f3a8c1" stroke-width="2.4"/>`;

const rankGlyph = (r, x, top, h, s, sw) => { const [, d] = G[r], k = h / 40; return `<path transform="translate(${n(x)} ${top}) scale(${n(k * 1000) / 1000})" d="${d}" fill="none" stroke="${sDark(s)}" stroke-width="${n(sw / k)}" stroke-linecap="round" stroke-linejoin="round"/>`; };
const useS = (id, cx, cy, w) => `<use href="#${id}" x="${n(cx - w / 2)}" y="${n(cy - w / 2)}" width="${n(w)}" height="${n(w)}"/>`;
const rowIndex = (r, s, h, top, sw, sz) => { const gw = G[r][0] * h / 40, x0 = 11; return rankGlyph(r, x0, top, h, s, sw) + useS('si', x0 + gw + 3 + sz / 2, top + h / 2 + 1, sz); };
const both = g => `${g}<g transform="rotate(180 100 140)">${g}</g>`;

// ---------- bố cục chấm 2–10 ----------
const XL = 62, XC = 100, XR = 138, ya = f => 72 + 136 * f;
const LAYOUT = {
  2: [[XC, 0], [XC, 1]], 3: [[XC, 0], [XC, .5], [XC, 1]], 4: [[XL, 0], [XR, 0], [XL, 1], [XR, 1]],
  5: [[XL, 0], [XR, 0], [XC, .5], [XL, 1], [XR, 1]], 6: [[XL, 0], [XR, 0], [XL, .5], [XR, .5], [XL, 1], [XR, 1]],
  7: [[XL, 0], [XR, 0], [XC, .25], [XL, .5], [XR, .5], [XL, 1], [XR, 1]],
  8: [[XL, 0], [XR, 0], [XC, .25], [XL, .5], [XR, .5], [XC, .75], [XL, 1], [XR, 1]],
  9: [[XL, 0], [XR, 0], [XL, 1 / 3], [XR, 1 / 3], [XC, .5], [XL, 2 / 3], [XR, 2 / 3], [XL, 1], [XR, 1]],
  10: [[XL, 0], [XR, 0], [XC, 1 / 6], [XL, 1 / 3], [XR, 1 / 3], [XL, 2 / 3], [XR, 2 / 3], [XC, 5 / 6], [XL, 1], [XR, 1]],
};

// ---------- đầu mèo (tâm 0,0; mặt rx 46 ry 38) ----------
// o: fur, pat (solid|tabby|calico|tux|siam|bicolor|tortie), p1, p2, earL/earR (màu tai), eyes (open|happy|wink|sleep), iris, ink (nét mặt), must (ria vua)
function catHead(o, id) {
  const ink = o.ink || LINE, lw = 3;
  const earL = [[-43, -12], [-39, -58], [-9, -34]], earR = earL.map(([x, y]) => [-x, y]);
  const inL = [[-35, -24], [-34.5, -48], [-17, -34]], inR = inL.map(([x, y]) => [-x, y]);
  let s = `<clipPath id="hc${id}"><ellipse rx="46" ry="38"/></clipPath>`;
  s += poly(earL, ` fill="${o.earL || o.fur}" stroke="${ink === '#f3e6f5' ? '#241b2b' : LINE}" stroke-width="${lw}" stroke-linejoin="round"`);
  s += poly(earR, ` fill="${o.earR || o.fur}" stroke="${ink === '#f3e6f5' ? '#241b2b' : LINE}" stroke-width="${lw}" stroke-linejoin="round"`);
  s += poly(inL, ` fill="${o.inEar || '#ffadc6'}"`) + poly(inR, ` fill="${o.inEar || '#ffadc6'}"`);
  s += `<ellipse rx="46" ry="38" fill="${o.fur}"/>`;
  let p = '';
  const st = (d, c, w = 4.5) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  if (o.pat === 'tabby') p = st('M-13-37l3 11M0-39v12M13-37l-3 11', o.p1) + st('M-47-4l11 2M-47 7l11-1M47-4l-11 2M47 7l-11-1', o.p1, 3.6);
  if (o.pat === 'calico') p = `<path d="M-50-8C-44-30-30-40-12-41-14-26-28-12-50-8z" fill="${o.p1}"/><path d="M12-41c18 0 32 8 38 26-12 2-24-4-30-12-4-5-6-9-8-14z" fill="${o.p2}"/><path d="M30 20c8-6 16-4 20 0v20H28c-2-8-2-14 2-20z" fill="${o.p1}"/>`;
  if (o.pat === 'tux') p = `<path d="M0-24C7-10 24 2 24 16 24 34-24 34-24 16-24 2-7-10 0-24z" fill="#fffdfb"/>`;
  if (o.pat === 'siam') p = `<ellipse cy="13" rx="21" ry="17" fill="${o.p1}" opacity=".78"/><ellipse cy="15" rx="12" ry="9" fill="${o.p1}" opacity=".5"/>`;
  if (o.pat === 'bicolor') p = `<path d="M-50 2C-48-26-28-40 0-40S48-26 50 2C40-6 26-10 14-10 8-10 3-6 0 2-3-6-8-10-14-10-26-10-40-6-50 2z" fill="${o.p1}"/>`;
  if (o.pat === 'tortie') p = `<path d="M-50-2C-44-24-30-36-16-38-18-22-30-8-50-2z" fill="${o.p1}"/><path d="M8-40C22-36 30-28 28-18 18-20 10-28 8-40z" fill="${o.p2}"/><path d="M26 10c8-4 16-2 22 4l-2 20H24c-4-8-4-18 2-24z" fill="${o.p1}"/><path d="M-30 20c6 0 10 6 8 12H-44c2-6 8-12 14-12z" fill="${o.p2}"/>`;
  if (o.pat === 'stripes') p = st('M-12-36l3 10M0-38v11M12-36l-3 10', o.p1, 3.6);
  if (p) s += `<g clip-path="url(#hc${id})">${p}</g>`;
  s += `<ellipse rx="46" ry="38" fill="none" stroke="${ink === '#f3e6f5' ? '#241b2b' : LINE}" stroke-width="${lw}"/>`;
  // mắt
  const eyeOpen = x => o.iris
    ? `<ellipse cx="${x}" cy="2" rx="7.4" ry="9" fill="${o.iris}" stroke="#3b2a35" stroke-width="1.6"/><ellipse cx="${x}" cy="3" rx="3.4" ry="6.6" fill="#2a1f2c"/><circle cx="${x + 2.6}" cy="-2" r="2.8" fill="#fff"/><circle cx="${x - 2.4}" cy="6.5" r="1.3" fill="#fff"/>`
    : `<ellipse cx="${x}" cy="2" rx="7" ry="8.6" fill="#3b2a35"/><circle cx="${x + 2.6}" cy="-1.6" r="2.9" fill="#fff"/><circle cx="${x - 2}" cy="5.8" r="1.3" fill="#fff"/>`;
  const happy = x => st(`M${x - 7} 5Q${x} -5 ${x + 7} 5`, ink, 3.2);
  const sleep = x => st(`M${x - 7} 1Q${x} 9 ${x + 7} 1`, ink, 3.2);
  const E = o.eyes || 'open';
  s += E === 'happy' ? happy(-18) + happy(18) : E === 'sleep' ? sleep(-18) + sleep(18) : E === 'wink' ? eyeOpen(-18) + st('M11 2Q18 -4 25 2', ink, 3.2) + st('M12 2l7 4', ink, 2.4) : eyeOpen(-18) + eyeOpen(18);
  s += `<ellipse cx="-30" cy="15" rx="8" ry="4.6" fill="#ff8fb3" opacity=".6"/><ellipse cx="30" cy="15" rx="8" ry="4.6" fill="#ff8fb3" opacity=".6"/>`;
  s += `<path d="M-3.6 10h7.2L0 14.4z" fill="#ff7aa2" stroke="${ink === '#f3e6f5' ? '#ffb3c9' : LINE}" stroke-width="1.4" stroke-linejoin="round"/>`;
  if (o.must) s += `<path d="M0 16c-4-3.5-11-4-15 0-2.4 2.4-5.6 2.4-7-.6 0 5 4 8 9 6 4-1.6 8-3.6 13-5.4zM0 16c4-3.5 11-4 15 0 2.4 2.4 5.6 2.4 7-.6 0 5-4 8-9 6-4-1.6-8-3.6-13-5.4z" fill="${o.must}" stroke="${ink === '#f3e6f5' ? '#241b2b' : LINE}" stroke-width="1.2" stroke-linejoin="round"/><path d="M-4 24.5q4 3 8 0" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`;
  else s += st('M0 14.4c-1 4.4-6.6 5.2-8.6 1.4M0 14.4c1 4.4 6.6 5.2 8.6 1.4', ink, 2.1);
  s += `<g stroke="${ink}" stroke-width="1.7" stroke-linecap="round" opacity=".85"><path d="M-40 7-58 3M-40 13-57 16M40 7 58 3M40 13 57 16"/></g>`;
  return s;
}

// ---------- 12 nhân vật J/Q/K ----------
// fur, pat…, dress (áo/choàng), acc (nón / nơ), hat
const CH = {
  s13: { name: 'Vua Mực', fur: '#3d3542', ink: '#f3e6f5', iris: '#ffd75e', inEar: '#c98aa8', must: '#e9e2ef', dress: '#9a86d6', eyes: 'open' },
  s12: { name: 'Hậu Bông', fur: '#fffdfb', iris: '#7cc4f2', dress: '#c7b5f0', acc: '#8a72d6', eyes: 'wink' },
  s11: { name: 'Bồi Mướp Xám', fur: '#cdc8d4', pat: 'tabby', p1: '#8d8597', dress: '#9fdcc7', acc: '#7f68c9', eyes: 'happy' },
  h13: { name: 'Vua Cam', fur: '#ffb46e', pat: 'tabby', p1: '#e5823a', must: '#c8662a', dress: '#f27a9c', eyes: 'open' },
  h12: { name: 'Hậu Tam Thể', fur: '#fffaf3', pat: 'calico', p1: '#ffad62', p2: '#6b4a3e', earL: '#ffad62', earR: '#6b4a3e', dress: '#ffb3c9', acc: '#e0527a', eyes: 'open', iris: '#8bd17c' },
  h11: { name: 'Bồi Kem', fur: '#fbe6c6', pat: 'stripes', p1: '#ebc28f', dress: '#ffc9a8', acc: '#e0527a', eyes: 'open' },
  d13: { name: 'Vua Mướp', fur: '#cf9f76', pat: 'tabby', p1: '#7e5a40', must: '#6e4b33', dress: '#ff9e8a', eyes: 'happy' },
  d12: { name: 'Hậu Xiêm', fur: '#fbefdc', pat: 'siam', p1: '#7a5a4a', earL: '#7a5a4a', earR: '#7a5a4a', inEar: '#c98f9a', iris: '#6fb6f0', dress: '#a9d8f5', acc: '#e0527a', eyes: 'open' },
  d11: { name: 'Bồi Gừng', fur: '#fffdfb', pat: 'bicolor', p1: '#ffa95e', earL: '#ffa95e', earR: '#ffa95e', dress: '#ffd88a', acc: '#f27a9c', eyes: 'wink' },
  c13: { name: 'Vua Tro', fur: '#aab5ca', iris: '#9bdc7a', must: '#7d89a3', dress: '#7dc9b0', eyes: 'open' },
  c12: { name: 'Hậu Bò Sữa', fur: '#3d3542', ink: '#f3e6f5', pat: 'tux', iris: '#ffd75e', inEar: '#c98aa8', dress: '#d7c4f7', acc: '#ff8fb3', eyes: 'open' },
  c11: { name: 'Bồi Đồi Mồi', fur: '#5d4038', ink: '#f3e6f5', pat: 'tortie', p1: '#e8924a', p2: '#f2c07a', inEar: '#d99a8f', iris: '#ffd75e', dress: '#bfe3a5', acc: '#4a3b6b', eyes: 'open' },
};

const flower = (x, y, c, r = 5) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<circle cx="${n(Math.cos(a * Math.PI / 180 - 1.57) * r)}" cy="${n(Math.sin(a * Math.PI / 180 - 1.57) * r)}" r="${n(r * .78)}" fill="${c}"/>`).join('')}<circle r="${n(r * .62)}" fill="#ffe27a"/></g>`;
const paw = (x, y, fur, ink) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="9" fill="${fur}" stroke="${ink}" stroke-width="2.6"/><path d="M${x - 4} ${y - 8}v4M${x + 4} ${y - 8}v4" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>`;
const crownK = `<path d="M-25-29-29-64-14-49 0-71 14-49 29-64 25-29C9-34-9-34-25-29z" fill="${GOLD}" stroke="${LINE}" stroke-width="2.6" stroke-linejoin="round"/><path d="M-25-35C-9-40 9-40 25-35" fill="none" stroke="#e39b2e" stroke-width="3"/><circle cy="-71" r="4" fill="${PINK}" stroke="${LINE}" stroke-width="1.6"/><circle cx="-29" cy="-64" r="3.2" fill="#9fe0cf" stroke="${LINE}" stroke-width="1.4"/><circle cx="29" cy="-64" r="3.2" fill="#9fe0cf" stroke="${LINE}" stroke-width="1.4"/><circle cy="-46" r="4.6" fill="${PINK}" stroke="${LINE}" stroke-width="1.6"/>`;
const tiara = `<path d="M-18-33-21-52-9-43 0-58 9-43 21-52 18-33C6-36-6-36-18-33z" fill="${GOLD}" stroke="${LINE}" stroke-width="2.4" stroke-linejoin="round"/><circle cy="-58" r="3.4" fill="#9fe0cf" stroke="${LINE}" stroke-width="1.4"/><circle cy="-42" r="3.4" fill="${PINK}" stroke="${LINE}" stroke-width="1.4"/>`;
const bow = c => `<g transform="translate(-36 -44) rotate(-18)"><path d="M0 0C-8-12-24-10-22 2-20 13-6 8 0 0zM0 0C8-12 24-10 22 2 20 13 6 8 0 0z" fill="${c}" stroke="${LINE}" stroke-width="2.2" stroke-linejoin="round"/><path d="M-3 2-8 16l6-3 2 6 3-17z" fill="${c}" stroke="${LINE}" stroke-width="1.8" stroke-linejoin="round"/><circle r="5" fill="${c}" stroke="${LINE}" stroke-width="2.2"/></g>`;
const hatJ = (c, s) => `<path d="M-31-28C-32-50-16-60 0-60S32-50 31-28C10-33-10-33-31-28z" fill="${c}" stroke="${LINE}" stroke-width="2.6" stroke-linejoin="round"/><path d="M-33-27C-11-34 11-34 33-27" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M-33-27C-11-34 11-34 33-27" fill="none" stroke="${LINE}" stroke-width="1.2" stroke-dasharray="2 3"/><circle cy="-60" r="5" fill="#fff" stroke="${LINE}" stroke-width="2"/>
<path d="M18-46C30-60 46-66 58-82 58-64 44-50 24-42z" fill="${s === 'c' || s === 's' ? '#b99ad0' : '#ffc2d4'}" stroke="${LINE}" stroke-width="2.2" stroke-linejoin="round"/><path d="M22-44C34-55 46-64 56-78" fill="none" stroke="${LINE}" stroke-width="1.2"/>`;

function body(o, r, s) {
  const ink = LINE, d = o.dress;
  let b = '';
  if (r === 13) { // áo choàng + cổ lông trắng chấm đen + gậy
    b += `<path d="M-62 130C-60 76-42 44 0 44S60 76 62 130z" fill="${d}" stroke="${ink}" stroke-width="2.8"/><path d="M-6 50 0 130M6 50 0 130" stroke="${ink}" stroke-width="1.6" opacity=".35"/>`;
    b += `<path d="M-44 52C-30 34 30 34 44 52 46 62 34 68 22 64 10 72-10 72-22 64-34 68-46 62-44 52z" fill="#fffdfb" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>`;
    b += [[-30, 54], [-12, 60], [10, 60], [30, 54], [-20, 48], [20, 48], [0, 52]].map(([x, y]) => `<path d="M${x} ${y - 3}v5" stroke="#3b2a35" stroke-width="2.4" stroke-linecap="round"/>`).join('');
    b += `<path d="M54 96 58 2" stroke="${ink}" stroke-width="7" stroke-linecap="round"/><path d="M54 96 58 2" stroke="${GOLD}" stroke-width="3.6" stroke-linecap="round"/>${useS('sp', 58, -8, 30)}`;
    b += paw(-16, 84, o.fur, ink) + paw(52, 70, o.fur, ink);
  } else if (r === 12) { // váy + vòng ngọc trai + bó hoa
    b += `<path d="M-50 130C-50 80-36 46 0 46S50 80 50 130z" fill="${d}" stroke="${ink}" stroke-width="2.8"/>`;
    b += `<path d="M-30 48C-26 70 26 70 30 48" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-dasharray=".1 7.6"/>`;
    b += `<path d="M-18 96C-14 82-6 74 0 70 6 74 14 82 18 96z" fill="#9fdcb4" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>`;
    b += flower(-11, 70, '#ff9ec0', 7) + flower(11, 68, '#ffffff', 7) + flower(0, 58, isRedS(s) ? '#c9b3ff' : '#ff7aa2', 7);
    b += paw(-20, 94, o.fur, ink) + paw(20, 94, o.fur, ink);
  } else { // áo bồi + cổ bèo + cuộn len
    b += `<path d="M-50 130C-50 80-36 46 0 46S50 80 50 130z" fill="${d}" stroke="${ink}" stroke-width="2.8"/>`;
    b += `<path d="M-30 50q5 10 10 0 5 10 10 0 5 10 10 0 5 10 10 0 5 10 10 0 5 10 10 0" fill="#fffdfb" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>`;
    b += [62, 78, 94].map(y => `<circle cy="${y}" r="3" fill="${o.acc}" stroke="${ink}" stroke-width="1.4"/>`).join('');
    const yc = isRedS(s) ? '#ffb3c9' : '#c9b8ef', yd = sCol(s);
    b += `<path d="M30 92c10 6 22 2 30 14" fill="none" stroke="${yd}" stroke-width="2.4" stroke-linecap="round"/><circle cx="22" cy="86" r="16" fill="${yc}" stroke="${ink}" stroke-width="2.6"/><path d="M10 78q12 4 22 18M12 90q10-12 24-10M18 72q-2 12 10 28" fill="none" stroke="${yd}" stroke-width="2" stroke-linecap="round"/>`;
    b += paw(-22, 84, o.fur, ink) + paw(8, 76, o.fur, ink);
  }
  return b;
}
function character(r, s, id) {
  const o = CH[s + r];
  const head = catHead(o, id);
  const gear = r === 13 ? crownK : r === 12 ? tiara + bow(o.acc) : hatJ(o.acc, s);
  return { body: `<g transform="translate(0 -8)">${body(o, r, s)}</g>`, head: `<g transform="translate(0 10)">${head + gear}</g>` }; // đầu đặt sát vai, không lơ lửng
}
const PANEL_BG = s => (isRedS(s) ? '#ffe4ed' : '#ece6fb'), PANEL_BG2 = s => (isRedS(s) ? '#fff3f7' : '#f6f2ff');
function court(r, s, compact) {
  const c = character(r, s, compact ? 'c' : 'f');
  if (!compact) {
    const sp = [[38, 74], [162, 74]].map(([x, y]) => useS('si', x, y, 16)).join('');
    const sparkle = (x, y, k) => `<path transform="translate(${x} ${y}) scale(${k})" d="M0-6 1.6-1.6 6 0 1.6 1.6 0 6-1.6 1.6-6 0-1.6-1.6z" fill="#fff"/>`;
    return `<clipPath id="pf"><rect x="22" y="58" width="156" height="166" rx="14"/></clipPath>
<rect x="22" y="58" width="156" height="166" rx="14" fill="${PANEL_BG(s)}"/>
<g clip-path="url(#pf)"><circle cx="100" cy="122" r="58" fill="${PANEL_BG2(s)}"/>${sparkle(48, 116, 1.2)}${sparkle(154, 104, 1)}${sparkle(150, 150, .8)}
<g transform="translate(100 122) scale(.84)">${c.body}${c.head}</g></g>${sp}
<rect x="22" y="58" width="156" height="166" rx="14" fill="none" stroke="${sCol(s)}" stroke-width="3"/><rect x="27" y="63" width="146" height="156" rx="10" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round"/>`;
  }
  return `<clipPath id="pc"><rect x="20" y="86" width="160" height="180" rx="16"/></clipPath>
<rect x="20" y="86" width="160" height="180" rx="16" fill="${PANEL_BG(s)}"/><g clip-path="url(#pc)"><g transform="translate(100 186) scale(1.12)">${c.body}${c.head}</g></g>
<rect x="20" y="86" width="160" height="180" rx="16" fill="none" stroke="${sCol(s)}" stroke-width="5"/>`;
}

// ---------- con Át: mỗi chất 1 dáng ----------
function ace(s, k = '') {
  const c = sCol(s), D = sDark(s);
  const sparkle = (x, y, k, f = '#ffd0de') => `<path transform="translate(${x} ${y}) scale(${k})" d="M0-6 1.6-1.6 6 0 1.6 1.6 0 6-1.6 1.6-6 0-1.6-1.6z" fill="${f}"/>`;
  const pawPrint = (x, y, k, a, f) => `<g transform="translate(${x} ${y}) rotate(${a}) scale(${k})" fill="${f}"><ellipse cy="4" rx="6" ry="5"/><circle cx="-6" cy="-4" r="2.4"/><circle cx="-2" cy="-7.5" r="2.4"/><circle cx="3" cy="-7.5" r="2.4"/><circle cx="7" cy="-4" r="2.4"/></g>`;
  if (s === 'h') { // mèo cam ôm trái tim
    const o = { fur: '#ffb46e', pat: 'tabby', p1: '#e5823a', eyes: 'open' };
    return `<g transform="translate(100 104) scale(.8)">${catHead(o, 'a' + k)}</g>
<path transform="translate(38 106) scale(1.24)" d="${SUIT.h.d}" fill="${c}" stroke="${D}" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M58 134c2-10 10-16 20-16" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>
${paw(76, 120, o.fur, LINE)}${paw(124, 120, o.fur, LINE)}
${sparkle(40, 92, 1.4)}${sparkle(162, 82, 1.1)}${sparkle(158, 200, 1)}${pawPrint(44, 214, .9, -20, '#f6b9cd')}`;
  }
  if (s === 'd') { // mèo trắng ngồi trong ô cửa hình rô
    const o = { fur: '#fffdfb', iris: '#7cc4f2', eyes: 'happy', inEar: '#ffadc6' };
    return `<clipPath id="ad${k}"><path d="M100 62 164 148 100 234 36 148z"/></clipPath>
<path d="M100 62 164 148 100 234 36 148z" fill="#ffd9e5"/>
<g clip-path="url(#ad${k})"><circle cx="100" cy="150" r="46" fill="#fff3f7"/><path d="M60 236C60 196 76 176 100 176S140 196 140 236z" fill="#fffdfb" stroke="${LINE}" stroke-width="2.6"/>
<g transform="translate(100 150) scale(.74)">${catHead(o, 'a' + k)}</g>${paw(86, 190, o.fur, LINE)}${paw(114, 190, o.fur, LINE)}</g>
<path d="M100 62 164 148 100 234 36 148z" fill="none" stroke="${c}" stroke-width="8" stroke-linejoin="round"/>
<path d="M100 74 155 148" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1 6" opacity=".9"/>
${sparkle(48, 82, 1.3)}${sparkle(156, 216, 1.2)}${useS('si', 160, 84, 18)}${useS('si', 42, 214, 18)}`;
  }
  if (s === 's') { // chính lá bích là một bé mèo đen mắt vàng, đuôi cong
    return `<path d="M136 196c22 0 30-18 22-30-6-9-18-6-16 3" fill="none" stroke="${D}" stroke-width="9" stroke-linecap="round"/>
${useS('sp', 100, 140, 150)}
<g fill="#6b5a8e" stroke="${D}" stroke-width="2"><ellipse cx="80" cy="190" rx="11" ry="8"/><ellipse cx="120" cy="190" rx="11" ry="8"/></g><g fill="#ff9fbf"><circle cx="80" cy="191.5" r="3"/><circle cx="120" cy="191.5" r="3"/></g>
<g stroke="#e9d9f2" stroke-width="1.6" stroke-linecap="round" opacity=".9"><path d="M58 140 38 136M58 146 39 150M142 140 162 136M142 146 161 150"/></g>
${sparkle(46, 90, 1.4, '#c9b8ef')}${sparkle(158, 96, 1.1, '#c9b8ef')}${pawPrint(48, 214, .9, -18, '#d8cdee')}${pawPrint(152, 222, .8, 16, '#d8cdee')}`;
  }
  // c: mèo mướp xám ngủ trên lá chuồn
  const o = { fur: '#cdc8d4', pat: 'tabby', p1: '#8d8597', eyes: 'sleep' };
  const z = (x, y, k) => `<path transform="translate(${x} ${y}) scale(${k})" d="M0 0h9L0 10h9" fill="none" stroke="#9a86d6" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  const club = `<path transform="translate(38 104) scale(1.24)" d="${SUIT.c.d}"`;
  return `${club} fill="${c}" stroke="${D}" stroke-width="5" stroke-linejoin="round"/>${club} fill="${c}"/>
<g transform="translate(0 -14)"><path d="M140 128c16 4 22 18 18 32-2 7-9 8-12 3" fill="none" stroke="${LINE}" stroke-width="12" stroke-linecap="round"/><path d="M140 128c16 4 22 18 18 32-2 7-9 8-12 3" fill="none" stroke="${o.fur}" stroke-width="7" stroke-linecap="round"/>
<path d="M70 132C72 114 88 106 104 106S136 114 138 132z" fill="${o.fur}" stroke="${LINE}" stroke-width="2.6"/>
<g transform="translate(96 106) rotate(-10) scale(.68)">${catHead(o, 'a' + k)}</g>
${paw(78, 132, o.fur, LINE)}${paw(108, 134, o.fur, LINE)}</g>
${z(136, 66, 1)}${z(152, 54, .75)}${z(164, 44, .55)}${sparkle(44, 88, 1.3, '#d8cdee')}${pawPrint(156, 214, .9, 16, '#d8cdee')}`;
}

// ---------- lắp 1 lá ----------
function card(r, s) {
  let full = '', comp = '';
  if (r === 1) full = ace(s);
  else if (r <= 10) full = LAYOUT[r].map(([x, f]) => useS('sp', x, ya(f), 41)).join('');
  else full = court(r, s, false);
  full += both(rowIndex(r, s, 40, 9, 6, 30));
  if (r === 1) comp = useS('sp', 100, 180, 150) + `<path transform="translate(100 108) scale(.62)" d="M-25-29-29-64-14-49 0-71 14-49 29-64 25-29C9-34-9-34-25-29z" fill="${GOLD}" stroke="${LINE}" stroke-width="4" stroke-linejoin="round"/>`;
  else if (r <= 10) comp = useS('sp', 100, 184, 136);
  else comp = court(r, s, true);
  comp = rowIndex(r, s, 62, 8, 8.5, 54) + comp;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">${STYLE}
<defs>${PAW}${suitDefs(s)}</defs>${STOCK}
<g class="f">${full}</g><g class="c">${comp}</g></svg>`;
}

const KR = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'], KS = { s: 'spade', h: 'heart', d: 'diamond', c: 'club' };
mkdirSync(OUT_DIR, { recursive: true });
let total = 0;
for (const s of 'shdc') for (let r = 1; r <= 13; r++) {
  const svg = card(r, s).replace(/\n\s*/g, '\n');
  writeFileSync(join(OUT_DIR, `${KR[r - 1]}_${KS[s]}.svg`), svg); total += svg.length;
}
console.log(`52 lá → ${OUT_DIR} (${(total / 1024).toFixed(0)} KB)`);
