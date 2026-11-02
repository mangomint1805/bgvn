// Binh khí & trang bị vẽ tay bằng SVG theo lối tranh khắc gỗ (nét mực, mảng màu phẳng).
// Hình dáng theo mô tả trên Wikipedia:
//  - Thanh long yển nguyệt đao (guandao 偃月刀): lưỡi bản to GẮN THẲNG TRÊN ĐẦU CÁN, sống lưỡi có móc/khấc nhỏ,
//    mũi hơi ngả về phía sống, khắc rồng; cổ đao (吞口) hình đầu rồng; cuối cán có mũi nhọn đối trọng (鐏).
//  - Trượng bát xà mâu (蛇矛): giáo dài, mũi lượn sóng như thân rắn.
//  - Phương thiên hoạ kích (方天畫戟): mũi giáo ở giữa, hai bên là hai lưỡi trăng khuyết đối xứng.
//  - Quán thạch phủ: rìu chiến cán dài, lưỡi cong rộng. Kỳ lân cung: cung phản khúc (recurve).
//  - Gia Cát liên nỏ (諸葛弩): nỏ liên phát có hộp tên trên báng và tay đòn kéo dây.
//  - Kiếm (劍): lưỡi thẳng hai lưỡi có gân giữa; Đao (刀): một lưỡi, sống thẳng, lưỡi cong, chuôi vòng.
//  - Bát quái: 8 quẻ quanh Thái cực (Tiên thiên: Càn trên, Khôn dưới, Ly trái, Khảm phải).
const INK = '#1f1813', STEEL = '#d5dbd8', STEEL2 = '#a9b4b2', WOOD = '#6b3a1a', BRZ = '#c39a45', BRZ2 = '#8a6526', RED = '#a8291b';
const S = `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;
const pole = (y1, y2, x = 50, w = 3.4) => `<rect x="${x - w / 2}" y="${y1}" width="${w}" height="${y2 - y1}" rx="1" fill="${WOOD}" ${S}/>`
  + Array.from({ length: Math.floor((y2 - y1) / 14) }, (_, i) => `<path d="M${x - w / 2} ${y1 + 8 + i * 14} l${w} -2" stroke="#3a1a0c" stroke-width=".8"/>`).join('');
const tassel = (x, y) => `<path d="M${x} ${y} C${x + 7} ${y + 4} ${x + 9} ${y + 11} ${x + 6} ${y + 18} C${x + 4} ${y + 12} ${x + 1} ${y + 9} ${x - 1} ${y + 17} C${x - 3} ${y + 10} ${x - 4} ${y + 5} ${x} ${y} Z" fill="${RED}" ${S} stroke-width="1.1"/>`
  + `<path d="M${x + 1} ${y + 3} l1 10 M${x + 4} ${y + 4} l2 9" stroke="#6a140c" stroke-width=".7"/>`;
const butt = (y, x = 50) => `<path d="M${x - 2.6} ${y} L${x + 2.6} ${y} L${x} ${y + 8} Z" fill="${STEEL2}" ${S}/><rect x="${x - 3}" y="${y - 2}" width="6" height="3" fill="${BRZ}" ${S} stroke-width="1"/>`;
const collar = (y, x = 50, w = 8) => `<rect x="${x - w / 2}" y="${y}" width="${w}" height="4" rx="1" fill="${BRZ}" ${S}/>`;
const rot = (deg, body, k = .84) => `<g transform="translate(50 52) scale(${k}) rotate(${deg}) translate(-50 -50)">${body}</g>`;

// lưỡi xà mâu lượn sóng (tính sẵn)
function snakeBlade(y0, y1, amp, waves, w0) {
  const L = [], R = []; const n = 36;
  for (let i = 0; i <= n; i++) {
    const t = i / n; const y = y1 + (y0 - y1) * t; // t=0 gốc, t=1 mũi
    const cx = 50 + amp * Math.sin(t * waves * Math.PI) * (1 - t * .35);
    const w = w0 * (1 - Math.pow(t, 1.6)) + .2;
    L.push([cx - w, y]); R.push([cx + w, y]);
  }
  const f = p => p.map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1));
  return 'M' + f(L).join(' L') + ' L' + f(R.reverse()).join(' L') + ' Z';
}
const SNAKE = snakeBlade(-12, 30, 4.2, 3.5, 4.4);
const SNAKE_MID = (() => { let d = ''; for (let i = 0; i <= 30; i++) { const t = i / 30, y = 30 + (-12 - 30) * t; d += (i ? ' L' : 'M') + (50 + 4.2 * Math.sin(t * 3.5 * Math.PI) * (1 - t * .35)).toFixed(1) + ' ' + y.toFixed(1); } return d; })();

// kiếm thẳng (jian) dựng đứng, tâm 50
function jian(blade = STEEL, x = 50) {
  return `<path d="M${x - 3.6} 72 L${x - 3.6} 4 L${x} -6 L${x + 3.6} 4 L${x + 3.6} 72 Z" fill="${blade}" ${S}/>`
    + `<path d="M${x} -3 L${x} 70" stroke="${INK}" stroke-width=".8" opacity=".7"/>`
    + `<path d="M${x - 12} 72 C${x - 8} 76 ${x + 8} 76 ${x + 12} 72 C${x + 8} 79 ${x - 8} 79 ${x - 12} 72 Z" fill="${BRZ}" ${S}/>`
    + `<rect x="${x - 2.8}" y="77" width="5.6" height="20" rx="1.5" fill="#3a1a0c" ${S}/>`
    + Array.from({ length: 5 }, (_, i) => `<path d="M${x - 2.8} ${80 + i * 3.6} l5.6 2" stroke="${BRZ}" stroke-width=".8"/>`).join('')
    + `<path d="M${x - 4.5} 97 L${x + 4.5} 97 L${x + 3} 103 L${x - 3} 103 Z" fill="${BRZ}" ${S}/>`;
}
// đao một lưỡi (dao) có chuôi vòng
function dao() {
  return `<path d="M46 72 L46 6 C46 0 48 -4 52 -8 C58 -2 61 8 60 22 C59 40 55 58 54 72 Z" fill="${STEEL}" ${S}/>`
    + `<path d="M48 70 L48 8" stroke="${INK}" stroke-width=".8" opacity=".6"/><path d="M52 -2 C55 4 56 10 55 16" stroke="#fff" stroke-width="1" opacity=".8"/>`
    + `<ellipse cx="50" cy="74" rx="9" ry="3" fill="${BRZ}" ${S}/>`
    + `<rect x="47.4" y="77" width="5.2" height="16" rx="1.5" fill="#3a1a0c" ${S}/>`
    + `<circle cx="50" cy="98" r="5" fill="none" stroke="${INK}" stroke-width="4"/><circle cx="50" cy="98" r="5" fill="none" stroke="${BRZ}" stroke-width="2.2"/>`;
}

const W = {
  // Thanh long yển nguyệt đao
  qinglong: rot(36, pole(36, 104) + butt(104)
    + `<path d="M46 31 L46 7 L42.6 4.6 L46 1.6 L46 -3 C46 -6 44.5 -8.5 41.5 -11 C53 -10 62.5 -2.5 65.5 8 C67.5 16.5 64.5 25 56.5 31 Z" fill="${STEEL}" ${S}/>`
    + `<path d="M48.5 27 C55 24 52 18 57 14 C61 11 59 5 54.5 2 C52 0.5 50 2 50.5 4.5" fill="none" stroke="#2f6a52" stroke-width="1.4"/><circle cx="51" cy="4" r="1.1" fill="#2f6a52"/>`
    + `<path d="M52 22 l2 -1 M55 17 l2 -1 M57 10 l2 0" stroke="#2f6a52" stroke-width="1"/>`
    + `<path d="M43.5 30 C44 35 46.5 38.5 50 39 C53.5 38.5 57 35 57.5 30 C55 32 52 32.5 50 32.5 C47.5 32.5 45.5 31.5 43.5 30 Z" fill="${BRZ}" ${S}/>`
    + `<circle cx="47.6" cy="34" r="1" fill="${INK}"/><path d="M53 35 l1.5 1.5 l1 -2" stroke="${INK}" stroke-width=".8" fill="none"/>`
    + tassel(51, 39)),
  // Trượng bát xà mâu
  zhangba: rot(36, pole(34, 106) + butt(106)
    + `<path d="${SNAKE}" fill="${STEEL}" ${S}/><path d="${SNAKE_MID}" stroke="${INK}" stroke-width=".7" fill="none" opacity=".7"/>`
    + collar(30) + tassel(50, 34)),
  // Phương thiên hoạ kích
  fangtian: rot(36, pole(34, 106) + butt(106)
    + `<path d="M50 -12 C54 -4 54.5 4 52.5 12 L47.5 12 C45.5 4 46 -4 50 -12 Z" fill="${STEEL}" ${S}/><path d="M50 -8 L50 11" stroke="${INK}" stroke-width=".7"/>`
    + `<rect x="34" y="19" width="32" height="3.4" rx="1" fill="${BRZ}" ${S}/><rect x="47" y="11" width="6" height="22" rx="1.4" fill="${BRZ}" ${S}/>`
    + `<path d="M37.5 6 C25 12 25 30 37.5 36 C32.5 29 32.5 13 37.5 6 Z" fill="${STEEL}" ${S}/>`
    + `<path d="M62.5 6 C75 12 75 30 62.5 36 C67.5 29 67.5 13 62.5 6 Z" fill="${STEEL}" ${S}/>`
    + collar(32) + tassel(50, 36)),
  // Quán thạch phủ – rìu chiến cán dài
  guanshi: rot(32, pole(-2, 106) + butt(106)
    + `<path d="M50 -14 L53 -2 L47 -2 Z" fill="${STEEL2}" ${S}/>`
    + `<path d="M51.5 2 L58 4 C64 -5 72 -3 75 6 C78 17 76 30 67 38 C63 32 58 29 51.5 28 Z" fill="${STEEL}" ${S}/>`
    + `<path d="M58 6 C62 14 62 22 58 27" stroke="${INK}" stroke-width=".8" fill="none" opacity=".6"/><circle cx="56" cy="16" r="2.2" fill="none" stroke="${INK}" stroke-width="1"/>`
    + `<path d="M48.5 8 L41 10 L39 20 L48.5 23 Z" fill="${STEEL2}" ${S}/>` + collar(0, 50, 7) + collar(29, 50, 7)),
  // Kỳ lân cung – cung phản khúc + tên
  qilin: `<path d="M57 6 C50 5 43 9 40 19 C36 31 39 42 36 50 C39 58 36 69 40 81 C43 91 50 95 57 94" fill="none" stroke="${INK}" stroke-width="6.4" stroke-linecap="round"/>`
    + `<path d="M57 6 C50 5 43 9 40 19 C36 31 39 42 36 50 C39 58 36 69 40 81 C43 91 50 95 57 94" fill="none" stroke="${WOOD}" stroke-width="3.6" stroke-linecap="round"/>`
    + `<path d="M40 19 C37 28 39 36 37 44 M40 81 C37 72 39 64 37 56" stroke="${BRZ}" stroke-width="1.4" fill="none"/>`
    + `<rect x="33" y="44" width="7" height="12" rx="2" fill="${RED}" ${S}/>`
    + `<path d="M55.5 8 L55.5 92" stroke="${INK}" stroke-width=".9"/>`
    + `<path d="M24 50 L90 50" stroke="${WOOD}" stroke-width="2.2"/><path d="M90 50 L83 46.5 L84.5 50 L83 53.5 Z" fill="${STEEL2}" ${S} stroke-width="1"/>`
    + `<path d="M24 50 L18 45 M24 50 L18 55 M28 50 L22 45 M28 50 L22 55" stroke="${RED}" stroke-width="2"/>`,
  // Gia Cát liên nỏ
  zhuge: `<path d="M10 60 L16 54 L74 54 L76 62 L18 62 L14 70 L6 70 Z" fill="${WOOD}" ${S}/>`
    + `<path d="M72 22 C84 34 84 82 72 94" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M72 22 C84 34 84 82 72 94" fill="none" stroke="${BRZ}" stroke-width="3" stroke-linecap="round"/>`
    + `<path d="M72.5 23 L60 52 M72.5 93 L60 60" stroke="${INK}" stroke-width=".9"/>`
    + `<rect x="30" y="34" width="34" height="20" rx="1.5" fill="#8a4a22" ${S}/><path d="M34 38 L60 38 M34 43 L60 43 M34 48 L60 48" stroke="#3a1a0c" stroke-width=".8"/>`
    + `<path d="M64 36 L69 37.5 L64 39 Z M64 41 L69 42.5 L64 44 Z M64 46 L69 47.5 L64 49 Z" fill="${STEEL2}" ${S} stroke-width=".8"/>`
    + `<path d="M31 36 L10 26 L8 30 L24 56" fill="none" stroke="${INK}" stroke-width="4.6" stroke-linejoin="round"/><path d="M31 36 L10 26 L8 30 L24 56" fill="none" stroke="${WOOD}" stroke-width="2.4" stroke-linejoin="round"/>`
    + `<circle cx="31" cy="36" r="2" fill="${BRZ}" ${S} stroke-width="1"/><circle cx="24" cy="56" r="2" fill="${BRZ}" ${S} stroke-width="1"/>`,
  // Thư hùng song kiếm – hai thanh kiếm thẳng bắt chéo
  cixiong: `<g transform="rotate(-30 50 50) translate(0 2) scale(.92) translate(4 4)">${jian(STEEL)}</g><g transform="rotate(30 50 50) translate(0 2) scale(.92) translate(4 4)">${jian('#e6dcc4')}</g>`,
  qinggang: rot(40, jian('#a9c0cc') + `<path d="M50 6 L50 66" stroke="#1f4a66" stroke-width="1.2" opacity=".8"/>`),
  hanbing: rot(40, jian('#e4f3f8') + `<path d="M48 14 l4 0 M50 12 l0 4 M48.5 12.5 l3 3 M51.5 12.5 l-3 3 M47.5 40 l5 0 M50 37.5 l0 5" stroke="#5aa3c2" stroke-width=".9"/>`)
    + `<g stroke="#5aa3c2" stroke-width="1.3" stroke-linecap="round"><path d="M18 22 l8 0 M22 18 l0 8 M19 19 l6 6 M25 19 l-6 6"/><path d="M78 74 l6 0 M81 71 l0 6"/></g>`,
  // Cổ đĩnh đao – đao một lưỡi bản rộng
  guding: rot(38, dao()),
  // Chu tước vũ phiến – quạt lông đỏ
  zhuque: `<g transform="translate(0 -4)">` + (() => {
    let f = '';
    for (let i = -4; i <= 4; i++) {
      const a = i * 15 * Math.PI / 180, L = 40 - Math.abs(i) * 2.2;
      const x2 = 50 + Math.sin(a) * L, y2 = 60 - Math.cos(a) * L;
      const nx = Math.cos(a) * 6, ny = Math.sin(a) * 6;
      f += `<path d="M50 60 C${(50 + (x2 - 50) * .5 - nx).toFixed(1)} ${(60 + (y2 - 60) * .5 - ny).toFixed(1)} ${(x2 - nx * .6).toFixed(1)} ${(y2 - ny * .6).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)} C${(x2 + nx * .6).toFixed(1)} ${(y2 + ny * .6).toFixed(1)} ${(50 + (x2 - 50) * .5 + nx).toFixed(1)} ${(60 + (y2 - 60) * .5 + ny).toFixed(1)} 50 60 Z" fill="${Math.abs(i) % 2 ? '#c4442b' : '#e07a2e'}" ${S} stroke-width="1.1"/>`
        + `<path d="M50 60 L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="#5c120a" stroke-width=".7"/>`;
    }
    return f + `<ellipse cx="50" cy="60" rx="7" ry="4.5" fill="${BRZ}" ${S}/><rect x="47.5" y="62" width="5" height="30" rx="1.5" fill="${WOOD}" ${S}/>`
      + `<rect x="46.5" y="90" width="7" height="5" rx="1" fill="${BRZ}" ${S}/>` + tassel(50, 93);
  })() + '</g>',
  // Bát quái trận
  bagua: (() => {
    const TRI = { qian: [1, 1, 1], dui: [1, 1, 0], li: [1, 0, 1], zhen: [1, 0, 0], kun: [0, 0, 0], gen: [0, 0, 1], kan: [0, 1, 0], xun: [0, 1, 1] }; // dưới → trên
    const ORDER = [['qian', -90], ['dui', -135], ['li', 180], ['zhen', 135], ['kun', 90], ['gen', 45], ['kan', 0], ['xun', -45]];
    let s = `<path d="${Array.from({ length: 8 }, (_, i) => { const a = (i * 45 - 112.5) * Math.PI / 180; return (i ? 'L' : 'M') + (50 + 47 * Math.cos(a)).toFixed(1) + ' ' + (50 + 47 * Math.sin(a)).toFixed(1); }).join(' ')} Z" fill="#ecdcae" ${S}/>`;
    for (const [k, deg] of ORDER) {
      const a = deg * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
      TRI[k].forEach((yang, j) => {
        const r = 25 + j * 6.2, cx = 50 + ux * r, cy = 50 + uy * r, h = 8.5;
        const seg = (t0, t1) => `<path d="M${(cx + px * t0).toFixed(1)} ${(cy + py * t0).toFixed(1)} L${(cx + px * t1).toFixed(1)} ${(cy + py * t1).toFixed(1)}" stroke="${INK}" stroke-width="3.4"/>`;
        s += yang ? seg(-h, h) : seg(-h, -1.8) + seg(1.8, h);
      });
    }
    s += `<circle cx="50" cy="50" r="17" fill="#f6ecd5" ${S}/><path d="M50 33 A17 17 0 0 1 50 67 A8.5 8.5 0 0 1 50 50 A8.5 8.5 0 0 0 50 33 Z" fill="${INK}"/>`
      + `<circle cx="50" cy="41.5" r="2.6" fill="${INK}"/><circle cx="50" cy="58.5" r="2.6" fill="#f6ecd5"/>`;
    return s;
  })(),
  // Nhân vương thuẫn – khiên sơn son mặt thú
  renwang: `<path d="M50 5 C68 7 84 12 85 19 L81 68 C77 83 63 91 50 96 C37 91 23 83 19 68 L15 19 C16 12 32 7 50 5 Z" fill="#8a2416" ${S}/>`
    + `<path d="M50 11 C65 13 78 17 79 22 L75.5 66 C72 78 61 85 50 89 C39 85 28 78 24.5 66 L21 22 C22 17 35 13 50 11 Z" fill="none" stroke="${BRZ}" stroke-width="2.2"/>`
    + `<path d="M30 36 C34 28 44 28 46 36 M70 36 C66 28 56 28 54 36" fill="none" stroke="${BRZ}" stroke-width="2.6"/>`
    + `<ellipse cx="38.5" cy="41" rx="5" ry="3.6" fill="${BRZ}" ${S} stroke-width="1"/><ellipse cx="61.5" cy="41" rx="5" ry="3.6" fill="${BRZ}" ${S} stroke-width="1"/><circle cx="38.5" cy="41" r="1.4" fill="${INK}"/><circle cx="61.5" cy="41" r="1.4" fill="${INK}"/>`
    + `<path d="M46 46 L50 56 L54 46" fill="${BRZ}" ${S} stroke-width="1"/>`
    + `<path d="M34 62 C40 70 60 70 66 62 C60 66 40 66 34 62 Z" fill="${BRZ}" ${S} stroke-width="1"/><path d="M40 64.5 l1.5 5 l1.5 -4.6 M60 64.5 l-1.5 5 l-1.5 -4.6" fill="#f6ecd5" ${S} stroke-width=".8"/>`
    + `<path d="M26 26 C24 30 25 34 28 34 M74 26 C76 30 75 34 72 34" fill="none" stroke="${BRZ}" stroke-width="1.6"/>`,
  // Đằng giáp – áo giáp mây đan
  tengjia: `<defs><pattern id="wvp" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#c89a52"/><path d="M0 0 L6 6 M6 0 L0 6" stroke="#7a5320" stroke-width="1"/></pattern></defs>`
    + `<path d="M30 14 L40 10 C44 16 56 16 60 10 L70 14 L84 26 L76 40 L70 36 L70 86 C60 92 40 92 30 86 L30 36 L24 40 L16 26 Z" fill="url(#wvp)" ${S}/>`
    + `<path d="M40 10 C44 20 56 20 60 10" fill="none" stroke="${INK}" stroke-width="1.4"/><path d="M30 50 C42 54 58 54 70 50 M30 66 C42 70 58 70 70 66" fill="none" stroke="#5a3a10" stroke-width="2.2"/>`
    + `<rect x="30" y="56" width="40" height="5" fill="${WOOD}" ${S} stroke-width="1"/><rect x="46" y="55" width="8" height="7" rx="1" fill="${BRZ}" ${S} stroke-width="1"/>`,
  // Bạch ngân sư tử – khoá đai đầu sư tử bằng bạc
  baiyin: `<rect x="4" y="44" width="92" height="14" rx="2" fill="#5a2d17" ${S}/><path d="M8 47 L92 47 M8 55 L92 55" stroke="${BRZ}" stroke-width=".8"/>`
    + Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2; return `<circle cx="${(50 + Math.cos(a) * 27).toFixed(1)}" cy="${(50 + Math.sin(a) * 27).toFixed(1)}" r="7" fill="#c9ced2" ${S} stroke-width="1.1"/>`; }).join('')
    + `<circle cx="50" cy="50" r="23" fill="#e3e7ea" ${S}/>`
    + `<path d="M36 42 C40 36 46 37 47 42 M64 42 C60 36 54 37 53 42" fill="none" stroke="${INK}" stroke-width="1.6"/><circle cx="41.5" cy="44.5" r="2.4" fill="${INK}"/><circle cx="58.5" cy="44.5" r="2.4" fill="${INK}"/>`
    + `<path d="M45 49 C47 53 53 53 55 49 L50 56 Z" fill="#8a9196" ${S} stroke-width="1"/>`
    + `<path d="M39 60 C44 66 56 66 61 60" fill="none" stroke="${INK}" stroke-width="1.6"/><circle cx="50" cy="66" r="5" fill="none" stroke="${BRZ}" stroke-width="2"/>`,
  // song kích của Điển Vi (kích: mũi giáo + 1 lưỡi trăng khuyết)
  shuangji: (() => {
    const ji = `<rect x="48.4" y="22" width="3.2" height="70" rx="1" fill="${WOOD}" ${S}/><path d="M50 -6 C53.5 2 54 10 52.2 18 L47.8 18 C46 10 46.5 2 50 -6 Z" fill="${STEEL}" ${S}/>`
      + `<rect x="47" y="17" width="6" height="7" rx="1" fill="${BRZ}" ${S}/><rect x="36" y="18.6" width="12" height="3" fill="${BRZ}" ${S} stroke-width="1"/>`
      + `<path d="M39 6 C28 12 28 28 39 34 C34.5 27 34.5 13 39 6 Z" fill="${STEEL}" ${S}/>` + tassel(50, 24);
    return `<g transform="rotate(-28 50 50) translate(-6 6) scale(.86)">${ji}</g><g transform="rotate(28 50 50) translate(20 6) scale(.86) scale(-1 1) translate(-100 0)">${ji}</g>`;
  })(),
};
export const WEAPON_TYPES = Object.keys(W);
export function weaponSVG(type, cls = 'wpn') {
  if (!W[type]) return '';
  return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true">${W[type]}</svg>`;
}
