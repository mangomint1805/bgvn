// Sinh 52 mặt bài "Cắt dán" (BGVN tự vẽ, phong cách collage giấy cắt) → themes/catdan/cards/<hạng>_<chất>.svg
// Chạy: node solitaire/themes/catdan/make-cards.mjs [--only 7h,qs,...]
// Mọi hình đều vẽ tay bằng SVG (không dùng ảnh/logo của ai); mỗi lá ghép ngẫu nhiên (có hạt giống cố định) từ thư viện "mẩu giấy".
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'cards');
const n = v => +(+v).toFixed(1);
const INK = '#2b2320', PAPER = '#fbf8f1';
const RED = '#c8243a', BLK = '#1f1d22';

// ---------- RNG có hạt giống ----------
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
let R = rng(1);
const rr = (a, b) => a + (b - a) * R();
const pick = a => a[Math.floor(R() * a.length)];
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// ---------- chất (hộp 100×100) ----------
const SUIT = {
  h: 'M50 93C46 86 36 76 24 64 11 51 3 41 3 28 3 14 13 4 27 4c10 0 18 6 23 17C55 10 63 4 73 4c14 0 24 10 24 24 0 13-8 23-21 36C64 76 54 86 50 93z',
  d: 'M50 1C59 19 72 35 89 50 72 65 59 81 50 99 41 81 28 65 11 50 28 35 41 19 50 1z',
  s: 'M50 2C55 15 66 25 78 35 90 45 97 53 97 65c0 12-9 21-21 21-9 0-16-4-20-11 1 10 5 17 13 22H31c8-5 12-12 13-22-4 7-11 11-20 11C12 86 3 77 3 65 3 53 10 45 22 35 34 25 45 15 50 2z',
  c: 'M50 6a21 21 0 1 1 0 42 21 21 0 1 1 0-42zM26 37a21 21 0 1 1 0 42 21 21 0 1 1 0-42zM74 37a21 21 0 1 1 0 42 21 21 0 1 1 0-42zM42 40h16v24H42zM54 58c0 18 4 30 14 39H32c10-9 14-21 14-39z',
};
const isRedS = s => s === 'h' || s === 'd';
const sCol = s => (isRedS(s) ? RED : BLK);
const RL = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// bảng màu giấy theo chất (đỏ: ấm, đen: lạnh) – nhưng cho trộn chút như collage thật
const WARM = ['#f2a7b8', '#f6c453', '#ef7f5a', '#f9d6c4', '#e94e5b', '#ffb3c7', '#f4e1a1', '#c9e4c5'];
const DARK = ['#24353f', '#2f4b7c', '#3b2f4f', '#2e4a3e', '#1f2a3a', '#4a2f45'];
let darkCourt = false; // J/Q/K chất đen: giấy nền tông tối
const COOL = ['#8fb8de', '#2f4b7c', '#a8c69f', '#c3b1e1', '#5aa59b', '#e7e1d1', '#f4e1a1', '#24353f'];

// ---------- hoa văn giấy ----------
const PAT = (id, kind, c1, c2) => {
  if (kind === 'dots') return `<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${c1}"/><circle cx="4" cy="4" r="1.7" fill="${c2}"/></pattern>`;
  if (kind === 'stripe') return `<pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="9" height="9" fill="${c1}"/><rect width="4" height="9" fill="${c2}"/></pattern>`;
  if (kind === 'gingham') return `<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#fff"/><rect width="6" height="12" fill="${c2}" fill-opacity=".45"/><rect width="12" height="6" fill="${c2}" fill-opacity=".45"/></pattern>`;
  if (kind === 'grid') return `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${c1}"/><path d="M10 0H0V10" fill="none" stroke="${c2}" stroke-width=".7"/></pattern>`;
  if (kind === 'news') return `<pattern id="${id}" width="40" height="7" patternUnits="userSpaceOnUse"><rect width="40" height="7" fill="#efe9dc"/><path d="M1 3.5h9M12 3.5h14M28 3.5h11" stroke="#8d857a" stroke-width="1.4"/></pattern>`;
  if (kind === 'harle') return `<pattern id="${id}" width="14" height="18" patternUnits="userSpaceOnUse"><path d="M7 0 14 9 7 18 0 9z" fill="${c2}"/></pattern>`;
  if (kind === 'flor') return `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M7 3c1.5 0 1.5 2.5 0 2.5 1.5 0 1.5 2.5 0 2.5-1.5 0-1.5-2.5 0-2.5-1.5 0-1.5-2.5 0-2.5z" fill="${c2}"/><circle cx="0" cy="12" r="1.3" fill="${c2}"/><circle cx="14" cy="12" r="1.3" fill="${c2}"/></pattern>`;
  if (kind === 'halftone') return `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(20)"><rect width="6" height="6" fill="${c1}"/><circle cx="3" cy="3" r="1.4" fill="${c2}" fill-opacity=".55"/></pattern>`;
  return `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${c1}"/></pattern>`;
};

// ---------- mép giấy xé ----------
function torn(x, y, w, h, jit = 2.2) {
  const pts = [];
  const edge = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0), k = Math.max(3, Math.round(L / 6)); for (let i = 0; i < k; i++) { const t = i / k; pts.push([x0 + (x1 - x0) * t + rr(-jit, jit) * (y1 !== y0 ? 1 : .3), y0 + (y1 - y0) * t + rr(-jit, jit) * (x1 !== x0 ? 1 : .3)]); } };
  edge(x, y, x + w, y); edge(x + w, y, x + w, y + h); edge(x + w, y + h, x, y + h); edge(x, y + h, x, y);
  return 'M' + pts.map(p => p.map(n).join(' ')).join('L') + 'z';
}
// tem có răng cưa
function stampPath(w, h, r = 2.6) {
  const k = Math.round(w / (r * 2.6)), m = Math.round(h / (r * 2.6)), sx = w / k, sy = h / m;
  let d = `M${-w / 2} ${-h / 2}`;
  for (let i = 0; i < k; i++) d += `h${n(sx / 2 - r)}a${r} ${r} 0 0 0 ${2 * r} 0h${n(sx / 2 - r)}`;
  for (let i = 0; i < m; i++) d += `v${n(sy / 2 - r)}a${r} ${r} 0 0 0 0 ${2 * r}v${n(sy / 2 - r)}`;
  for (let i = 0; i < k; i++) d += `h${n(-(sx / 2 - r))}a${r} ${r} 0 0 0 ${-2 * r} 0h${n(-(sx / 2 - r))}`;
  for (let i = 0; i < m; i++) d += `v${n(-(sy / 2 - r))}a${r} ${r} 0 0 0 0 ${-2 * r}v${n(-(sy / 2 - r))}`;
  return d + 'z';
}

// ---------- thư viện "mẩu cắt" (tâm 0,0, cỡ ~70) ----------
const S = (d, f, st = INK, w = 1.6) => `<path d="${d}" fill="${f}" stroke="${st}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const OBJ = {
  strawberry: () => S('M0 34C-20 26-30 6-28-8-26-20-14-24 0-20 14-24 26-20 28-8 30 6 20 26 0 34z', '#e23b48') +
    [[-14, -6], [-4, -10], [8, -8], [18, -4], [-18, 6], [-6, 2], [6, 2], [16, 8], [-10, 14], [2, 14], [10, 20], [-2, 24]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="2.2" fill="#ffe08a"/>`).join('') +
    S('M0-20-14-30-4-26 0-36 4-26 14-30z', '#4f9d4a') + '<path d="M-20-10c4-8 12-10 16-9" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".55"/>',
  cherry: () => '<path d="M-12 14C-10-6-2-22 8-30M12 16C12 0 10-16 8-30" stroke="#5a7b2e" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    S('M8-30c10-6 22-4 26 4-10 4-20 2-26-4z', '#6cae4a') +
    S('M-12 34a12 12 0 1 0 0-24 12 12 0 1 0 0 24z', '#c81d3a') + S('M14 36a12 12 0 1 0 0-24 12 12 0 1 0 0 24z', '#d92945') +
    '<circle cx="-16" cy="18" r="3" fill="#fff" opacity=".7"/><circle cx="10" cy="20" r="3" fill="#fff" opacity=".7"/>',
  butterfly: (c = '#f39b3c') => `<g>${S('M0-4C-10-30-34-34-36-18-38-4-20 2 0 0z', c)}${S('M0-4C10-30 34-34 36-18 38-4 20 2 0 0z', c)}${S('M0 0C-14 4-28 14-24 26-20 34-8 26 0 6z', c)}${S('M0 0C14 4 28 14 24 26 20 34 8 26 0 6z', c)}
<g fill="${INK}"><circle cx="-24" cy="-20" r="3.4"/><circle cx="24" cy="-20" r="3.4"/><circle cx="-16" cy="20" r="2.6"/><circle cx="16" cy="20" r="2.6"/></g>
<g fill="#fff" opacity=".85"><circle cx="-30" cy="-14" r="1.8"/><circle cx="30" cy="-14" r="1.8"/><circle cx="-20" cy="26" r="1.5"/><circle cx="20" cy="26" r="1.5"/></g>
${S('M0-10C3-10 3 20 0 22-3 20-3-10 0-10z', INK)}<path d="M0-10c-2-8-6-12-10-14M0-10c2-8 6-12 10-14" stroke="${INK}" stroke-width="1.4" fill="none"/></g>`,
  disco: () => { let t = ''; for (let y = -30; y < 30; y += 6) for (let x = -30; x < 30; x += 6) { if (Math.hypot(x + 3, y + 3) > 30) continue; const l = 60 + Math.round(((x - y) / 60 + 1) * 70 + rr(-30, 30)); t += `<rect x="${x}" y="${y}" width="5.4" height="5.4" fill="rgb(${l},${l},${l + 18})"/>`; }
    return `<clipPath id="dsc${++uid}"><circle r="30"/></clipPath><circle r="30" fill="#556"/><g clip-path="url(#dsc${uid})">${t}</g><circle r="30" fill="none" stroke="${INK}" stroke-width="1.6"/><path d="M-14-20l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="#fff"/><path d="M0-30v-10" stroke="${INK}" stroke-width="1.4"/>`; },
  daisy: (c = '#fff') => [...Array(12)].map((_, i) => `<ellipse rx="6" ry="17" cy="-17" transform="rotate(${i * 30})" fill="${c}" stroke="${INK}" stroke-width="1.2"/>`).join('') + '<circle r="9" fill="#f6c02f" stroke="' + INK + '" stroke-width="1.4"/><circle r="9" fill="url(#dotY)"/>',
  rose: (c = '#e8557a') => `${S('M-24 18C-30 0-18-22 0-24S30-6 24 14C18 30-16 32-24 18z', c)}<path d="M-12 4C-12-10 10-12 12 0S-2 14-6 4 4-6 4 2M-18 14c8 8 26 6 32-4M-20-6C-14-18 8-22 18-8" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>${S('M-6 28C-20 36-34 30-36 22-26 20-14 22-6 28z', '#5c9b4a')}`,
  mushroom: () => S('M-6 8C-8 20-10 30-6 34H8C10 28 8 20 6 8z', '#f4ead2') + S('M-32 10C-34-14-16-30 0-30S34-14 32 10C14 14-14 14-32 10z', '#d93a33') +
    '<g fill="#fff" stroke="' + INK + '" stroke-width="1"><ellipse cx="-16" cy="-8" rx="6" ry="4"/><ellipse cx="4" cy="-18" rx="5" ry="3.6"/><ellipse cx="18" cy="-4" rx="5" ry="4"/><ellipse cx="-2" cy="2" rx="4" ry="3"/></g>',
  bird: (c = '#e8a33d') => `${S('M-28 10C-20-10 0-16 14-10 22-18 32-16 36-10 30-8 26-6 24 0 22 18 0 26-14 24L-34 30C-30 24-28 18-28 10z', c)}${S('M-14 2C-4-6 10-2 12 8-2 14-12 12-14 2z', '#fff3d6')}
${S('M36-10 44-7 36-4z', '#f2c14e')}<circle cx="27" cy="-10" r="2.2" fill="${INK}"/>${S('M-4-4C4-14 18-8 16 4 6 8-2 6-4-4z', '#7a4a2a')}<path d="M4 22 2 32M12 20 12 30" stroke="${INK}" stroke-width="1.6"/>`,
  moon: () => S('M10-30A30 30 0 1 0 22 22 24 24 0 1 1 10-30z', '#f7d774') + '<circle cx="-12" cy="-6" r="3" fill="#e5bf4f"/><circle cx="-4" cy="12" r="2" fill="#e5bf4f"/>',
  star: (c = '#f6c453') => S('M0-30 8-10 30-9 13 5 19 27 0 15-19 27-13 5-30-9-8-10z', c),
  eye: () => S('M-34 0C-20-20 20-20 34 0 20 20-20 20-34 0z', '#fff') + '<circle r="12" fill="#4a8bb8" stroke="' + INK + '" stroke-width="1.4"/><circle r="5.4" fill="' + INK + '"/><circle cx="4" cy="-4" r="2.4" fill="#fff"/>' +
    '<path d="M-26-10-30-18M-14-16-16-25M0-18V-27M14-16 16-25M26-10 30-18" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/>',
  shell: (c = '#f6c6b4') => S('M0 30-30-6C-26-24-12-32 0-32S26-24 30-6z', c) + '<path d="M0 30-20-22M0 30-8-30M0 30 8-30M0 30 20-22M0 30-28-10M0 30 28-10" stroke="' + INK + '" stroke-width="1.1" opacity=".6"/>' + S('M-8 30h16l-4 6h-8z', c),
  citrus: (c = '#f8c629', p = '#fbe58a') => `<circle r="30" fill="${c}" stroke="${INK}" stroke-width="1.6"/><circle r="26" fill="#fffbe8"/>${[...Array(9)].map((_, i) => `<path d="M0 0L${n(23 * Math.cos(i * .698))} ${n(23 * Math.sin(i * .698))}A23 23 0 0 1 ${n(23 * Math.cos((i + 1) * .698))} ${n(23 * Math.sin((i + 1) * .698))}z" fill="${p}" stroke="#fffbe8" stroke-width="2.2"/>`).join('')}`,
  candle: (c = '#f3e2c4') => S('M-8-14H8V34H-8z', c) + S('M0-30C6-24 6-18 0-14-6-18-6-24 0-30z', '#f7a531') + '<path d="M0-24C2-21 2-18 0-16" stroke="#fff3b0" stroke-width="2" fill="none"/>' + S('M-16 34h32v4h-32z', '#c9a24a'),
  key: () => `<circle cx="-20" r="12" fill="none" stroke="${INK}" stroke-width="7"/><circle cx="-20" r="12" fill="none" stroke="#d9a930" stroke-width="4"/><path d="M-8 0H30M22 0v9M30 0v12" stroke="${INK}" stroke-width="7" stroke-linecap="square"/><path d="M-8 0H30M22 0v9M30 0v12" stroke="#d9a930" stroke-width="4" stroke-linecap="square"/>`,
  teacup: (c = '#9fc3e6') => S('M-36 24H36C30 32-30 32-36 24z', '#fff') + S('M-26-10H26C26 12 14 22 0 22S-26 12-26-10z', '#fff') + S('M26-4c12-2 14 14 0 16', 'none') +
    `<path d="M-24-2C-14 4 14 4 24-2" stroke="${c}" stroke-width="3" fill="none"/>${[-14, 0, 14].map(x => `<circle cx="${x}" cy="10" r="3" fill="${c}"/>`).join('')}<path d="M-8-14c-4-6 4-10 0-16M6-14c-4-6 4-10 0-16" stroke="#9a8f86" stroke-width="1.6" fill="none" opacity=".7"/>`,
  fish: (c = '#5aa5c9') => S('M-30 0C-16-18 14-18 24 0 14 18-16 18-30 0z', c) + S('M22 0 38-14V14z', c) + '<circle cx="-18" cy="-3" r="3" fill="' + INK + '"/>' + '<path d="M-6-8a6 6 0 0 1 0 8M2-8a6 6 0 0 1 0 8M10-8a6 6 0 0 1 0 8M-2 2a6 6 0 0 1 0 8M6 2a6 6 0 0 1 0 8" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/>',
  planet: (c = '#e9a66b') => `<ellipse rx="40" ry="10" fill="none" stroke="${INK}" stroke-width="5" transform="rotate(-18)"/><ellipse rx="40" ry="10" fill="none" stroke="#f3dca0" stroke-width="3" transform="rotate(-18)"/><circle r="22" fill="${c}" stroke="${INK}" stroke-width="1.6"/><path d="M-20-6C-6-2 8-10 21-4M-18 8C-4 12 10 6 20 10" stroke="#fff" stroke-width="2" fill="none" opacity=".45"/><path d="M-38 12C-20 6 20-6 38-24" stroke="#f3dca0" stroke-width="3" fill="none" transform="rotate(0)"/>`,
  tin: (c = '#e8c547') => S('M-36-22H36V22H-36z', '#cfd5da') + S('M-32-18H32V18H-32z', c) + `<text x="0" y="-5" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="10" fill="${INK}" letter-spacing="1">SARDINES</text>` +
    `<g transform="translate(0 8) scale(.55)">${S('M-30 0C-16-12 14-12 24 0 14 12-16 12-30 0z', '#7ea9c4')}${S('M22 0 34-10V10z', '#7ea9c4')}</g>`,
  matches: () => S('M-26-34H26V34H-26z', '#d8352a') + S('M-20-26H20V18H-20z', '#f6e7c8') + `<text x="0" y="-10" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="8" fill="${INK}">SAFETY</text><text x="0" y="2" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="8" fill="${INK}">MATCHES</text>` +
    S('M-6 6h12l-6 8z', '#d8352a') + `<text x="0" y="29" text-anchor="middle" font-family="Georgia,serif" font-size="7" fill="#fff">No. 7</text>`,
  ticket: (c = '#f3c5cf') => S('M-36-16H36V-6A6 6 0 0 0 36 6V16H-36V6A6 6 0 0 0-36-6z', c) + `<path d="M-22-12v24" stroke="${INK}" stroke-width="1" stroke-dasharray="2 2"/><text x="6" y="2" text-anchor="middle" font-family="'Courier New',monospace" font-weight="700" font-size="9" fill="${INK}">ADMIT ONE</text><text x="6" y="11" text-anchor="middle" font-family="'Courier New',monospace" font-size="6" fill="${INK}">Nº 0${Math.floor(rr(100, 999))}</text>`,
  pear: () => S('M0-26C8-26 10-16 12-8 24 2 26 24 0 30-26 24-24 2-12-8-10-16-8-26 0-26z', '#b9d36a') + '<path d="M0-26c0-6 2-10 4-12" stroke="#6b4a2a" stroke-width="2.4" fill="none"/>' + S('M4-34c8-6 16-4 18 2-8 2-14 2-18-2z', '#5c9b4a') + '<path d="M-14 10c0 8 6 12 10 12" stroke="#fff" stroke-width="2.4" fill="none" opacity=".6" stroke-linecap="round"/>',
  ladybug: () => S('M0-22C14-22 24-10 24 4S14 26 0 26-24 18-24 4-14-22 0-22z', '#d8232f') + S('M-12-22C-12-32 12-32 12-22z', INK) + `<path d="M0-22V26" stroke="${INK}" stroke-width="1.6"/><g fill="${INK}"><circle cx="-12" cy="-4" r="4"/><circle cx="12" cy="-4" r="4"/><circle cx="-10" cy="12" r="3.4"/><circle cx="10" cy="12" r="3.4"/></g><circle cx="-5" cy="-28" r="1.6" fill="#fff"/><circle cx="5" cy="-28" r="1.6" fill="#fff"/>`,
  leaf: (c = '#5c9b4a') => S('M0 36C-28 20-28-14 0-36 28-14 28 20 0 36z', c) + `<path d="M0 36V-30M0 16-14 4M0 4-16-8M0-8-12-20M0 16 14 4M0 4 16-8M0-8 12-20" stroke="#e8f2d0" stroke-width="1.4" fill="none" opacity=".8"/>`,
  ball: (num = 8, c = '#1f1d22') => `<circle r="28" fill="${c}" stroke="${INK}" stroke-width="1.6"/><circle r="12" fill="#fff"/><text y="5" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="${num > 9 ? 12 : 15}" fill="${INK}">${num}</text><path d="M-16-18c6-6 14-8 20-6" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>`,
  cassette: (c = '#f29bb4') => S('M-38-24H38V24H-38z', c) + S('M-30-16H30V10H-30z', '#fff7ea') + `<circle cx="-14" cy="-3" r="7" fill="${INK}"/><circle cx="14" cy="-3" r="7" fill="${INK}"/><circle cx="-14" cy="-3" r="3" fill="#fff"/><circle cx="14" cy="-3" r="3" fill="#fff"/>` + S('M-22 24-18 14H18L22 24z', '#d9d2c4') + `<text x="0" y="-9" text-anchor="middle" font-family="'Courier New',monospace" font-size="5.4" fill="${INK}">mixtape ♡</text>`,
  rabbit: () => S('M-12-14C-18-34-16-46-10-46S-4-30-4-14zM12-14C18-34 16-46 10-46S4-30 4-14z', '#f4efe6') + '<path d="M-10-42C-12-32-10-22-8-16M10-42C12-32 10-22 8-16" stroke="#f2b3c0" stroke-width="3" fill="none"/>' +
    S('M0-18C18-18 24-4 22 10 20 24 10 30 0 30S-20 24-22 10C-24-4-18-18 0-18z', '#f4efe6') + `<circle cx="-9" cy="2" r="2.6" fill="${INK}"/><circle cx="9" cy="2" r="2.6" fill="${INK}"/>${S('M-3 10h6l-3 3z', '#f28fa6', '#f28fa6', 1)}<path d="M0 13c-1 4-5 4-6 2M0 13c1 4 5 4 6 2M-6 12-20 10M-6 14-19 17M6 12 20 10M6 14 19 17" stroke="${INK}" stroke-width="1" fill="none"/>`,
  perfume: (c = '#b7a3e0') => S('M-22-6C-22-16-14-20 0-20S22-16 22-6V24C22 30 16 32 0 32S-22 30-22 24z', c) + S('M-8-30H8V-20H-8z', '#d9a930') + S('M-4-40H4V-30H-4z', INK) +
    S('M-14 2H14V18H-14z', '#fff7ea') + `<text x="0" y="13" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="7" fill="${INK}">Nº 5</text><path d="M-16-12c4-4 8-4 10-4" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/>`,
  tv: () => S('M-34-24H34V24H-34z', '#c9884f') + S('M-28-18H14V18H-28z', '#2b2d33') + '<path d="M-24-14H10V14H-24z" fill="#6fc5c0" opacity=".7"/><path d="M-22-8c8-6 16-4 22 2" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>' +
    `<circle cx="24" cy="-8" r="4" fill="${INK}"/><circle cx="24" cy="6" r="4" fill="${INK}"/><path d="M-10-24-20-40M10-24 20-40M-20 24v6M20 24v6" stroke="${INK}" stroke-width="2"/>`,
  lips: () => S('M-30 0C-22-14-8-14 0-8 8-14 22-14 30 0 20 16-20 16-30 0z', '#d42a4c') + '<path d="M-30 0C-14 4 14 4 30 0" stroke="#8c1530" stroke-width="2" fill="none"/><path d="M-12-6c4-2 8-2 10 0" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/>',
  clock: () => `<circle r="30" fill="#f7efdc" stroke="${INK}" stroke-width="3"/>${[...Array(12)].map((_, i) => `<path d="M0-26V-${i % 3 ? 23 : 20}" stroke="${INK}" stroke-width="${i % 3 ? 1.2 : 2.4}" transform="rotate(${i * 30})"/>`).join('')}<path d="M0 0V-16M0 0 12 6" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><circle r="2.4" fill="#c8243a"/>`,
  painting: () => S('M-34-26H34V26H-34z', '#d4a43f') + S('M-26-18H26V18H-26z', '#a9d1e8') + '<path d="M-26 18V4C-14-4-6 0 2 6 10-2 18-6 26 0V18z" fill="#79a86a"/><path d="M-26 18V10C-10 6 6 12 26 8V18z" fill="#4f7d4a"/><circle cx="14" cy="-8" r="5" fill="#f8e08a"/>' + `<path d="M-34-26H34V26H-34z" fill="none" stroke="#8a6420" stroke-width="1" transform="scale(.92)"/>`,
  envelope: (c = '#f3e7cf') => S('M-36-22H36V22H-36z', c) + `<path d="M-36-22 0 4 36-22" fill="none" stroke="${INK}" stroke-width="1.4"/>` + `<g transform="translate(0 2) scale(.16) translate(-50 -50)"><path d="${SUIT.h}" fill="#c8243a"/></g>`,
  sunflower: () => [...Array(14)].map((_, i) => `<path d="M0-14C6-22 4-32 0-36-4-32-6-22 0-14z" fill="#f6b82e" stroke="${INK}" stroke-width="1" transform="rotate(${i * 25.7})"/>`).join('') + `<circle r="15" fill="#6b3f1f" stroke="${INK}" stroke-width="1.4"/><circle r="15" fill="url(#dotY)" opacity=".5"/>`,
  swan: () => S('M-30 14C-30 0-14-4 4 2 8-10 4-22 12-28 20-32 26-26 22-20 18-14 14-8 16 4 24 6 34 4 36 0 36 14 22 24 0 24S-30 22-30 14z', '#fffdf8') + S('M22-24 30-22 24-18z', '#f08a3a') + `<circle cx="18" cy="-24" r="1.8" fill="${INK}"/><path d="M-20 12C-8 6 6 8 14 14" stroke="#d8d2c6" stroke-width="2" fill="none"/>`,
  orchid: () => [0, 72, 144, 216, 288].map(a => `<ellipse rx="11" ry="20" cy="-16" transform="rotate(${a})" fill="#e7a6d6" stroke="${INK}" stroke-width="1.1"/>`).join('') + `<path d="M-8 2C-8 16 8 16 8 2z" fill="#b2347d" stroke="${INK}" stroke-width="1.1"/><circle r="4" fill="#f6e27a"/>`,
  dice: () => `<g transform="rotate(-12)">${S('M-24-24H24V24H-24z', '#fff')}${[[-12, -12], [12, -12], [0, 0], [-12, 12], [12, 12]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${INK}"/>`).join('')}</g>`,
};
let uid = 0;
const OBJ_KEYS = Object.keys(OBJ);
const WARM_OBJ = ['strawberry', 'cherry', 'butterfly', 'rose', 'mushroom', 'star', 'shell', 'citrus', 'candle', 'ticket', 'lips', 'perfume', 'cassette', 'envelope', 'sunflower', 'orchid', 'teacup', 'ladybug', 'matches', 'bird', 'disco', 'clock', 'rabbit', 'pear', 'key'];
const COOL_OBJ = ['butterfly', 'disco', 'daisy', 'bird', 'moon', 'eye', 'fish', 'planet', 'tin', 'pear', 'leaf', 'ball', 'tv', 'clock', 'painting', 'swan', 'dice', 'teacup', 'key', 'rabbit', 'citrus', 'mushroom', 'cassette', 'star', 'shell'];
const CUT = obj => `<g filter="url(#cut)">${obj}</g>`;
const place = (x, y, rot, k, inner) => `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${n(k * 100) / 100})">${inner}</g>`;

// màu biến thể cho một số mẩu
function objVariant(key, warm) {
  const f = OBJ[key];
  const pal = warm ? ['#f39b3c', '#e94e7a', '#f6c453', '#e8557a', '#ef7f5a'] : ['#5aa5c9', '#7d6bc2', '#5aa59b', '#3d6fb0', '#9fc3e6'];
  switch (key) {
    case 'butterfly': case 'bird': case 'fish': case 'rose': case 'teacup': case 'cassette': case 'perfume': case 'ticket': case 'shell': case 'planet': case 'leaf':
      return f(pick(pal));
    case 'citrus': return R() < .5 ? f('#f8c629', '#fbe58a') : f('#f08a2c', '#f7b25e');
    case 'ball': return f(Math.floor(rr(1, 15)), pick(['#1f1d22', '#2f4b7c', '#c8243a', '#3b8a4f', '#7d3fa0']));
    default: return f();
  }
}

// mẩu chữ (kiểu nhãn cắt tạp chí / máy đánh chữ)
const SNIPS = ['hên xui', 'may mắn', 'xếp bài vui', 'chill thôi', 'ván này thắng', 'lucky', 'mon amour', 'hôm nay đẹp trời', 'bonjour', 'tới luôn', 'cà phê sữa', 'kẹo ngọt', 'mơ mộng', 'souvenir', 'thư tay', 'hẹn gặp lại'];
function snip(x, y, rot, txt, bg = '#fff', fg = INK) {
  const w = txt.length * 6.1 + 10;
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})" filter="url(#sh)"><rect x="${n(-w / 2)}" y="-8" width="${n(w)}" height="15" fill="${bg}"/><text y="3.6" text-anchor="middle" font-family="'Courier New',monospace" font-weight="700" font-size="10" fill="${fg}">${txt}</text></g>`;
}
// băng keo giấy
function tape(x, y, rot, w, c) {
  const h = 11, j = () => n(rr(-1.5, 1.5));
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})"><path d="M${-w / 2} ${-h / 2}H${w / 2}l${j()} 2.5 ${j()} 3 ${j()} 2.5V${h / 2}H${-w / 2}l${j()}-2.5 ${j()}-3 ${j()}-2.5z" fill="${c}" fill-opacity=".72"/><path d="M${-w / 2 + 3} -1H${w / 2 - 3}" stroke="#fff" stroke-width="1.2" stroke-dasharray="3 3" opacity=".6"/></g>`;
}

// ---------- nền (giấy xé, tem, đĩa tròn, vòm) ----------
let patN = 0;
function backdrop(kind, cx, cy, w, h, rot, warm, defs) {
  const pal = warm ? WARM : COOL, c1 = darkCourt ? pick(DARK) : pick(pal), c2 = pick(pal.filter(c => c !== c1));
  const pk = pick(darkCourt ? ['dots', 'stripe', 'halftone', 'plain'] : ['dots', 'stripe', 'gingham', 'grid', 'news', 'halftone', 'plain', 'plain']);
  const id = `p${++patN}`; defs.push(PAT(id, pk, c1, c2));
  if (kind === 'torn') return `<g transform="translate(${n(cx)} ${n(cy)}) rotate(${n(rot)})" filter="url(#sh)"><path d="${torn(-w / 2, -h / 2, w, h)}" fill="url(#${id})"/></g>`;
  if (kind === 'stamp') return `<g transform="translate(${n(cx)} ${n(cy)}) rotate(${n(rot)})" filter="url(#sh)"><path d="${stampPath(w, h)}" fill="#fffdf6"/><rect x="${n(-w / 2 + 6)}" y="${n(-h / 2 + 6)}" width="${n(w - 12)}" height="${n(h - 12)}" fill="url(#${id})"/><text x="${n(w / 2 - 9)}" y="${n(-h / 2 + 18)}" text-anchor="end" font-family="Georgia,serif" font-weight="700" font-size="10" fill="${INK}">${pick(['5đ', '20đ', '12¢', '1đ', '50¢'])}</text></g>`;
  if (kind === 'disk') return `<g transform="translate(${n(cx)} ${n(cy)})" filter="url(#sh)"><circle r="${n(w / 2)}" fill="url(#${id})"/></g>`;
  // arch
  return `<g transform="translate(${n(cx)} ${n(cy)}) rotate(${n(rot)})" filter="url(#sh)"><path d="M${-w / 2} ${h / 2}V${n(-h / 2 + w / 2)}A${w / 2} ${w / 2} 0 0 1 ${w / 2} ${n(-h / 2 + w / 2)}V${h / 2}z" fill="url(#${id})"/></g>`;
}

// ---------- chân dung (J/Q/K): bóng nghiêng cắt giấy trong khung oval ----------
const PROFILE = 'M-10-50C10-52 26-40 28-22 29-16 30-12 34-6L38 2C36 5 33 6 31 7 32 10 31 12 30 13 32 16 30 18 28 19 29 24 27 28 22 30 18 32 14 30 12 33L12 50-24 50C-22 38-24 30-30 22-40 10-38-10-34-26-30-42-22-50-10-50Z';
function portrait(r, s, warm, defs) {
  const pal = warm ? WARM : COOL;
  const bgc = darkCourt ? pick(DARK) : pick(pal), sil = pick(warm ? ['#2b2320', '#7a2233', '#3a2a4a'] : ['#1f2a3a', '#2b2320', '#244a44']);
  const id = `p${++patN}`; defs.push(PAT(id, pick(darkCourt ? ['dots', 'stripe', 'halftone'] : ['dots', 'stripe', 'gingham', 'halftone']), bgc, pick(pal.filter(c => c !== bgc))));
  let hat = '';
  if (r === 13) hat = S('M-26-44-30-74-16-58-4-80 8-58 22-76 20-44C6-48-12-48-26-44z', '#e3b23c') + '<g fill="#c8243a"><circle cx="-4" cy="-54" r="3.4"/></g><g fill="#3d6fb0"><circle cx="-18" cy="-50" r="2.4"/><circle cx="10" cy="-50" r="2.4"/></g>';
  else if (r === 12) hat = `<path d="M22-32C18-52-4-58-20-52-38-46-46-28-44-8-42 14-46 34-40 52H-22C-26 36-26 26-30 18Z" fill="${sil}"/><circle cx="-36" cy="-38" r="15" fill="${sil}"/>` + // tóc búi + xoã sau gáy
    [[-46, -44, 'rose', '#f29bb4'], [-34, -56, 'daisy'], [-18, -60, 'rose', '#e8557a'], [-2, -58, 'daisy'], [12, -52, 'rose', '#f6c453']].map(([x, y, k, c]) => place(x, y, 0, .3, k === 'rose' ? OBJ.rose(c) : OBJ.daisy())).join('') +
    S('M-14-62-16-72-9-66-4-76 1-66 8-72 6-62C-2-64-8-64-14-62z', '#e3b23c') + `<path d="M-4 6v5" stroke="#e3b23c" stroke-width="1.4"/><circle cx="-4" cy="15" r="4" fill="#fffdf6" stroke="${INK}" stroke-width=".8"/>`; // vòng hoa, tiara, hoa tai ngọc
  else hat = `${S('M-34-36C-34-60-6-66 10-60 24-56 32-46 30-36z', warm ? '#c8243a' : '#2f4b7c')}${S('M-38-36H34V-30H-38z', '#e3b23c')}<path d="M18-58C30-80 46-84 54-80 46-74 34-66 22-54z" fill="#f6efe2" stroke="${INK}" stroke-width="1.4"/><path d="M22-56C32-70 42-76 50-79" stroke="${INK}" stroke-width="1" fill="none"/>`;
  let collar = r === 13 ? S('M-46 78C-44 56-24 48 0 48S44 56 46 78z', warm ? '#a3263c' : '#2f4b7c') + S('M-30 52C-20 62 20 62 30 52 26 46-26 46-30 52z', '#f6efe2') + '<g fill="' + INK + '"><circle cx="-18" cy="54" r="1.6"/><circle cx="0" cy="56" r="1.6"/><circle cx="18" cy="54" r="1.6"/></g>'
    : r === 12 ? S('M-44 78C-42 58-24 50 0 50S42 58 44 78z', pick(warm ? ['#e8557a', '#f39b3c'] : ['#7d6bc2', '#5aa59b'])) + `<path d="M-20 54C-12 62 12 62 20 54" stroke="#fff" stroke-width="5" stroke-dasharray=".1 6" stroke-linecap="round" fill="none"/>`
      : S('M-44 78C-42 58-24 50 0 50S42 58 44 78z', pick(warm ? ['#ef7f5a', '#f6c453'] : ['#5aa5c9', '#a8c69f'])) + '<path d="M-24 52q4 8 8 0 4 8 8 0 4 8 8 0 4 8 8 0 4 8 8 0 4 8 8 0" fill="#fffdf6" stroke="' + INK + '" stroke-width="1.2"/>';
  // nhân vật hoàng gia là thú cắt giấy: K gấu, Q thỏ, J cáo
  const eyes = (dx, y, k = 1) => `<g fill="${INK}"><ellipse cx="${-dx}" cy="${y}" rx="${3.2 * k}" ry="${4 * k}"/><ellipse cx="${dx}" cy="${y}" rx="${3.2 * k}" ry="${4 * k}"/></g><g fill="#fff"><circle cx="${-dx + 1}" cy="${y - 1.4}" r="1.2"/><circle cx="${dx + 1}" cy="${y - 1.4}" r="1.2"/></g><g fill="#f4a3b4" opacity=".75"><ellipse cx="${-dx - 8}" cy="${y + 9}" rx="5" ry="3"/><ellipse cx="${dx + 8}" cy="${y + 9}" rx="5" ry="3"/></g>`;
  let head;
  if (r === 13) { const fur = pick(['#a8754a', '#c89b6d', '#8a5a3c']);
    head = `${S('M-28-42a13 13 0 1 0 0 26 13 13 0 1 0 0-26zM28-42a13 13 0 1 0 0 26 13 13 0 1 0 0-26z', fur)}<g fill="#e9c9a5"><circle cx="-28" cy="-29" r="6.5"/><circle cx="28" cy="-29" r="6.5"/></g>
${S('M0-36C24-36 40-20 40 2S24 40 0 40-40 24-40 2-24-36 0-36z', fur)}${S('M0 8C12 8 18 16 18 23S10 36 0 36-18 30-18 23-12 8 0 8z', '#f1dcc0')}${S('M-6 14H6C6 19 2 21 0 21S-6 19-6 14z', INK)}<path d="M0 21v6M-6 29c3 3 9 3 12 0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>${eyes(14, 0)}
<g transform="translate(0 6)">${hat}</g>`;
  } else if (r === 12) {
    head = `<g transform="translate(0 12) scale(1.5)">${OBJ.rabbit()}</g>` + [[-30, -6, 'rose', '#f29bb4'], [-16, -13, 'daisy'], [0, -15, 'rose', '#e8557a'], [16, -13, 'daisy'], [30, -6, 'rose', '#f6c453']].map(([x, y, k, c]) => place(x, y, 0, .32, k === 'rose' ? OBJ.rose(c) : OBJ.daisy())).join('') +
      S('M-8-18-10-28-4-22 0-32 4-22 10-28 8-18C2-20-2-20-8-18z', '#e3b23c') + `<path d="M-30 50C-20 58 20 58 30 50" stroke="#fffdf6" stroke-width="5" stroke-dasharray=".1 6.5" stroke-linecap="round" fill="none"/>`;
  } else { const fur = pick(['#e7863a', '#d9702e', '#f0a04b']);
    head = `${S('M0 34C-16 34-38 18-42-2L-36-40-14-20C-6-23 6-23 14-20L36-40 42-2C38 18 16 34 0 34Z', fur)}<g fill="${INK}" opacity=".8"><path d="M-33-31-31-12-20-20z"/><path d="M33-31 31-12 20-20z"/></g>
${S('M0 34C-12 34-30 22-38 6-24 10-10 16 0 16S24 10 38 6C30 22 12 34 0 34Z', '#fffaf0')}${S('M-5 24H5C5 28 2 30 0 30S-5 28-5 24z', INK)}${eyes(15, 2, .9)}
<g transform="translate(0 16)">${hat}</g>`;
  }
  { const cid = `p${++patN}`; defs.push(PAT(cid, r === 11 ? 'harle' : r === 13 ? 'flor' : pick(['dots', 'flor']), '#fff', r === 13 ? '#e3b23c' : '#fffdf6'));
    const bd = r === 13 ? 'M-46 78C-44 56-24 48 0 48S44 56 46 78z' : 'M-44 78C-42 58-24 50 0 50S42 58 44 78z';
    const k = collar.indexOf('/>') + 2; collar = collar.slice(0, k) + `<path d="${bd}" fill="url(#${cid})" fill-opacity="${r === 11 ? .45 : .7}"/>` + collar.slice(k); } // hoạ tiết vải áo
  const dy = r === 13 ? -18 : r === 11 ? -24 : -4; // thân áo nhô lên sát cằm, đầu không lơ lửng
  const face = `<g transform="translate(0 ${dy})">${collar.replace(/ 78([Cz])/g, ' 110$1')}</g>${head}`;
  return `<g filter="url(#sh)"><ellipse cx="100" cy="146" rx="58" ry="74" fill="#fffdf6"/><ellipse cx="100" cy="146" rx="52" ry="68" fill="url(#${id})"/><ellipse cx="100" cy="146" rx="52" ry="68" fill="none" stroke="#c9a24a" stroke-width="3"/></g>
<clipPath id="pc${patN}"><ellipse cx="100" cy="146" rx="52" ry="68"/></clipPath><g clip-path="url(#pc${patN})"><g transform="translate(98 160) scale(.8)">${face}</g></g>`;
}

// ---------- chỉ số góc (chữ có chân + chất, NGANG để đọc khi xếp chồng) ----------
function index(r, s, size = 34, sz = 24) {
  const t = RL[r - 1], w = ({ '10': 1.15, Q: .8, K: .76, A: .74, J: .52 }[t] || .6) * size;
  return `<text x="10" y="${n(size * .86 + 4)}" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="${size}" fill="${sCol(s)}" ${t === '10' ? 'letter-spacing="-2"' : ''}>${t}</text>` +
    `<path transform="translate(${n(12 + w)} ${n(size * .47 + 4 - sz / 2)}) scale(${sz / 100})" d="${SUIT[s]}" fill="${sCol(s)}"/>`;
}
const both = g => `${g}<g transform="rotate(180 100 140)">${g}</g>`;

const DEFS0 = `<filter id="cut" x="-25%" y="-25%" width="150%" height="150%"><feMorphology in="SourceAlpha" operator="dilate" radius="2.4" result="d"/><feFlood flood-color="#fffdf8"/><feComposite in2="d" operator="in" result="w"/><feGaussianBlur in="d" stdDeviation="1.4"/><feOffset dx="1" dy="1.8" result="b"/><feFlood flood-color="#3a2a1a" flood-opacity=".32"/><feComposite in2="b" operator="in" result="sh"/><feMerge><feMergeNode in="sh"/><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="sh" x="-10%" y="-10%" width="125%" height="125%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.2"/><feOffset dx=".8" dy="1.6" result="b"/><feFlood flood-color="#3a2a1a" flood-opacity=".28"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<pattern id="dotY" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".9" fill="#3a2410" fill-opacity=".45"/></pattern>`;
const STYLE = '<style>.c{display:none}@media (max-width:58px){.f{display:none}.c{display:inline}}</style>';
const STOCK = `<rect width="200" height="280" rx="12" fill="${PAPER}"/><rect x="3.5" y="3.5" width="193" height="273" rx="10" fill="none" stroke="#e4dccb" stroke-width="1.4"/>`;

// món chính lá 2–10: không trùng trong cùng chất, 2 chất cùng tông lấy 2 nửa khác nhau của danh sách
const BIGS = (() => { R = rng(4242); const w = shuffle(WARM_OBJ), c = shuffle(COOL_OBJ); return { h: w.slice(0, 9), d: w.slice(9, 18), s: c.slice(0, 9), c: c.slice(9, 18) }; })();
// ---------- lắp 1 lá ----------
function card(r, s) {
  R = rng(r * 31 + 'shdc'.indexOf(s) * 997 + 7); patN = 0; uid = 0;
  const warm = r >= 11 ? isRedS(s) : isRedS(s) ? R() < .82 : R() < .18; // trộn chút cho giống collage thật; J/Q/K theo đúng tông chất
  darkCourt = r >= 11 && !isRedS(s);
  const defs = [];
  let body = '';
  let objs = shuffle(warm ? WARM_OBJ : COOL_OBJ);
  if (r >= 2 && r <= 10) { const b = BIGS[s][r - 2]; objs = [b, ...objs.filter(k => k !== b)]; }
  if (r >= 11) {
    body += backdrop('torn', 100, 150, 150, 176, rr(-3, 3), warm, defs);
    body += portrait(r, s, warm, defs);
    body += CUT(place(rr(40, 52), rr(214, 226), rr(-20, 20), .48, objVariant(objs[0], warm)));
    body += CUT(place(rr(150, 160), rr(76, 88), rr(-20, 20), .42, objVariant(objs[1], warm)));
    body += tape(100, 76, rr(-6, 6), 54, pick(warm ? ['#f29bb4', '#f6c453'] : ['#8fb8de', '#a8c69f']));
  } else if (r === 1) {
    const id = `p${++patN}`; defs.push(PAT(id, pick(['gingham', 'dots', 'stripe', 'halftone']), isRedS(s) ? '#f9d6c4' : '#e7e1d1', isRedS(s) ? '#e94e5b' : '#2f4b7c'));
    body += backdrop(pick(['torn', 'stamp']), 100, 146, 140, 170, rr(-4, 4), warm, defs);
    body += `<g filter="url(#cut)"><path transform="translate(42 86) scale(1.16)" d="${SUIT[s]}" fill="url(#${id})" stroke="${sCol(s)}" stroke-width="2.4"/></g>`;
    body += CUT(place(rr(140, 150), rr(80, 92), rr(-25, 25), .62, objVariant(objs[0], warm)));
    body += CUT(place(rr(50, 62), rr(206, 216), rr(-25, 25), .56, objVariant(objs[1], warm)));
    body += snip(rr(110, 130), 226, rr(-6, 6), pick(SNIPS));
  } else {
    const k1 = pick(['torn', 'torn', 'stamp', 'disk', 'arch']);
    body += backdrop(k1, rr(92, 108), rr(140, 152), rr(112, 140), rr(130, 160), rr(-8, 8), warm, defs);
    if (R() < .6) body += backdrop(pick(['torn', 'disk']), rr(60, 140), rr(96, 200), rr(56, 80), rr(40, 70), rr(-20, 20), !warm && R() < .3 ? true : warm, defs);
    const big = objs[0];
    body += CUT(place(rr(92, 108), rr(138, 154), rr(-14, 14), rr(1.2, 1.45), objVariant(big, warm)));
    const spots = shuffle([[54, 84], [146, 86], [52, 214], [146, 208], [150, 150], [48, 150]]);
    const m = r <= 4 ? 2 : r <= 7 ? 3 : 3;
    for (let i = 0; i < m; i++) body += CUT(place(spots[i][0] + rr(-6, 6), spots[i][1] + rr(-6, 6), rr(-30, 30), rr(.44, .62), objVariant(objs[i + 1], warm)));
    if (R() < .7) body += tape(rr(70, 130), rr(64, 78), rr(-12, 12), rr(36, 56), pick(warm ? ['#f29bb4', '#f6c453', '#c9e4c5'] : ['#8fb8de', '#a8c69f', '#c3b1e1']));
    if (R() < .55) body += snip(rr(78, 122), rr(222, 230), rr(-8, 8), pick(SNIPS));
  }
  // lá nhỏ: chỉ số to + 1 mẩu to
  const comp = index(r, s, 60, 46) + CUT(place(100, 182, 0, r >= 11 ? 1.3 : 1.25, r >= 11 ? `<g transform="translate(-96 -150)">${portrait(r, s, warm, defs)}</g>` : r === 1 ? `<path transform="translate(-50 -50)" d="${SUIT[s]}" fill="${sCol(s)}"/>` : objVariant(objs[0], warm)));
  const full = body + both(index(r, s));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">${STYLE}
<defs>${DEFS0}${defs.join('')}</defs>${STOCK}
<g class="f">${full}</g><g class="c">${comp}</g></svg>`;
}

const KR = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'], KS = { s: 'spade', h: 'heart', d: 'diamond', c: 'club' };
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
mkdirSync(OUT_DIR, { recursive: true });
let total = 0, cnt = 0;
for (const s of 'shdc') for (let r = 1; r <= 13; r++) {
  const code = ['a', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k'][r - 1] + s;
  if (only.length && !only.includes(code)) continue;
  const svg = card(r, s).replace(/\n\s*/g, '\n');
  writeFileSync(join(OUT_DIR, `${KR[r - 1]}_${KS[s]}.svg`), svg); total += svg.length; cnt++;
}
// lưng bài: giấy kraft + tem BGVN + vài sticker (đối xứng xoay 180° để không lộ chiều)
if (!only.length) {
  R = rng(99); patN = 0; darkCourt = false; const defs = [PAT('pk1', 'dots', '#f6c6b4', '#e8557a'), PAT('pk2', 'stripe', '#c3b1e1', '#8fb8de')];
  const half = `${CUT(place(52, 62, -18, .5, OBJ.butterfly('#f39b3c')))}${CUT(place(150, 58, 14, .42, OBJ.star()))}${tape(100, 30, -4, 70, '#f29bb4')}${CUT(place(46, 116, 10, .34, OBJ.cherry()))}`;
  const back = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280"><defs>${DEFS0}${defs.join('')}
<pattern id="kr" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#c9a27a"/><path d="M2 5h6M14 3l5 2M5 17l6-1M16 14h5M9 21l4 1" stroke="#a8825a" stroke-width=".8" opacity=".7"/><circle cx="20" cy="20" r=".8" fill="#8a6640"/><circle cx="8" cy="10" r=".6" fill="#efd9b8"/></pattern></defs>
<rect width="200" height="280" rx="12" fill="url(#kr)"/><rect x="9" y="9" width="182" height="262" rx="7" fill="none" stroke="#fffdf6" stroke-width="2" stroke-dasharray="6 4" opacity=".85"/>
${half}<g transform="rotate(180 100 140)">${half}</g>
<g transform="translate(100 140) rotate(-4)" filter="url(#sh)"><path d="${stampPath(98, 120, 3)}" fill="#fffdf6"/><rect x="-41" y="-52" width="82" height="104" fill="url(#pk1)"/>
<rect x="-30" y="-14" width="60" height="28" fill="#fffdf6"/><text y="7.5" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="20" fill="${INK}" letter-spacing="1">BGVN</text>
<text y="-26" text-anchor="middle" font-family="'Courier New',monospace" font-weight="700" font-size="9" fill="${INK}">cắt · dán</text><text y="36" text-anchor="middle" font-family="'Courier New',monospace" font-weight="700" font-size="9" fill="${INK}">xếp bài vui</text></g></svg>`;
  writeFileSync(join(OUT_DIR, '..', 'back.svg'), back.replace(/\n\s*/g, '\n'));
}
console.log(`${cnt} lá → ${OUT_DIR} (${(total / 1024).toFixed(0)} KB)`);
