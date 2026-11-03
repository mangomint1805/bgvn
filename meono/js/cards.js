// Vẽ lá bài Mèo Nổ: mỗi lá là 1 chú mèo hoạt hình đang làm hành động của lá (SVG tự vẽ, nét mực đậm). Không dùng hình của game gốc.
import { CARD } from './engine.js?v=7';

let uid = 0;
const K = '#2d2a32';
const S = (w = 3) => `stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
// tay/chân/đuôi: nét mực dày + lõi màu lông (đầu tròn = bàn chân)
const L = (d, col, w = 7) => `<path d="${d}" fill="none" stroke="${K}" stroke-width="${w + 3.4}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
// pha màu với trắng (t = 0..1)
export function tint(hex, t = 0.5) {
  const n = parseInt(String(hex).replace('#', ''), 16); if (!Number.isFinite(n)) return hex;
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * t));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

// ---------- mắt / miệng (toạ độ cục bộ của đầu, tâm 0,0) ----------
function eyesSVG(kind, ec) {
  const both = f => f(-10) + f(10);
  switch (kind) {
    case 'happy': return `<path d="M-14.5 1.5 q4.5 -6 9 0 M5.5 1.5 q4.5 -6 9 0" fill="none" ${S(2.8)}/>`;
    case 'closed': return `<path d="M-14.5 0 q4.5 3.5 9 0 M5.5 0 q4.5 3.5 9 0" fill="none" ${S(2.6)}/>`;
    case 'round': return both(x => `<ellipse cx="${x}" cy="0" rx="4.8" ry="5.4" fill="${ec}" ${S(1.6)}/><ellipse cx="${x}" cy="0.3" rx="1.7" ry="4.1" fill="${K}"/><circle cx="${x + 1.6}" cy="-2.2" r="1.4" fill="#fff"/>`);
    case 'big': return both(x => `<circle cx="${x}" cy="0" r="5" fill="${K}"/><circle cx="${x + 1.8}" cy="-1.9" r="1.9" fill="#fff"/><circle cx="${x - 1.7}" cy="2" r=".9" fill="#fff"/>`);
    case 'sparkle': return both(x => `<circle cx="${x}" cy="0" r="6.6" fill="${ec}" ${S(1.8)}/><circle cx="${x}" cy=".6" r="4.2" fill="${K}"/><circle cx="${x + 2}" cy="-2.3" r="2.5" fill="#fff"/><circle cx="${x - 2.2}" cy="2.6" r="1.2" fill="#fff"/><path d="M${x - 5} 7.4 q5 2.4 10 0" fill="none" stroke="#9fdcff" stroke-width="1.8" stroke-linecap="round"/>`);
    case 'panic': return both(x => `<circle cx="${x}" cy="-.5" r="6.2" fill="#fff" ${S(2)}/><circle cx="${x + (x < 0 ? 1 : -1)}" cy="0" r="1.8" fill="${K}"/>`);
    case 'cry': return `<path d="M-15 -3.5 l6.5 3.5 l-6.5 3.5 M15 -3.5 l-6.5 3.5 l6.5 3.5" fill="none" ${S(2.6)}/><path d="M-14 4 q-1 9 1 17 q3 3 6 0 q2 -8 -1 -17 z M14 4 q1 9 -1 17 q-3 3 -6 0 q-2 -8 1 -17 z" fill="#7cc8ff" ${S(1.4)}/>`;
    case 'smug': return both(x => `<path d="M${x - 5} 0 a5 4.6 0 0 0 10 0 z" fill="${K}"/><path d="M${x - 6} -.4 h12" ${S(2.4)}/><circle cx="${x + 1.6}" cy="1.6" r="1.1" fill="#fff"/>`);
    case 'angry': return both(x => `<circle cx="${x}" cy="1" r="4" fill="${K}"/><circle cx="${x + 1.3}" cy="-.4" r="1.3" fill="#fff"/>`) + `<path d="M-16 -7.5 l10 4 M16 -7.5 l-10 4" fill="none" ${S(3)}/>`;
    case 'shades': return `<path d="M-18 -5 h14 q1 0 1 1 q-1 9 -8 9 q-7 0 -8 -9 q0 -1 1 -1 z M18 -5 h-14 q-1 0 -1 1 q1 9 8 9 q7 0 8 -9 q0 -1 -1 -1 z" fill="${K}" ${S(1.6)}/><path d="M-3 -3.5 h6 M-26 -3 l8 -1 M26 -3 l-8 -1" ${S(2.2)}/><path d="M-15 -2.5 l4 0 M5 -2.5 l4 0" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>`;
    case 'goggles': return `<path d="M-27 -4 h54" stroke="#f59e0b" stroke-width="5.5"/><path d="M-27 -4 h54" stroke="${K}" stroke-width="1.2" opacity=".5"/>` + both(x => `<circle cx="${x}" cy="-1" r="8.4" fill="#d9f2ff" stroke="${K}" stroke-width="2.8"/><circle cx="${x}" cy="0" r="3.6" fill="${K}"/><circle cx="${x + 1.3}" cy="-1.3" r="1.3" fill="#fff"/><path d="M${x - 5} -5 l3 -1.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`);
    case 'focus': return both(x => `<circle cx="${x}" cy="0" r="3.4" fill="${K}"/>`) + `<path d="M-15 -5 h9 M6 -5 h9" fill="none" ${S(2.4)}/>`;
    default: return '';
  }
}
function mouthSVG(kind) {
  switch (kind) {
    case 'o': return `<ellipse cx="0" cy="11.5" rx="3.4" ry="4" fill="#7a1f35" ${S(1.8)}/>`;
    case 'yell': return `<path d="M-6 9 q6 -2 12 0 q0 10 -6 10 q-6 0 -6 -10 z" fill="#7a1f35" ${S(1.9)}/><ellipse cx="0" cy="16.5" rx="3.2" ry="2" fill="#ff8fa8"/>`;
    case 'grin': return `<path d="M-7 8.5 q7 1.5 14 0 q-1 8 -7 8 q-6 0 -7 -8 z" fill="#7a1f35" ${S(1.8)}/><path d="M-3.5 14.5 q3.5 -3 7 0" fill="#ff8fa8"/>`;
    case 'wobble': return `<path d="M-7 11 q1.75 -2.5 3.5 0 q1.75 2.5 3.5 0 q1.75 -2.5 3.5 0 q1.75 2.5 3.5 0" fill="none" ${S(1.9)}/>`;
    case 'smirk': return `<path d="M-6 9.5 q6 3.5 11 -2.5" fill="none" ${S(2)}/>`;
    case 'tongue': return `<path d="M0 8 q-3 4 -6 2 M0 8 q3 4 6 2" fill="none" ${S(1.9)}/><path d="M1 10.5 q1 6 4 5 q2.5 -1 1 -5.5" fill="#ff8fa8" ${S(1.4)}/>`;
    case 'sad': return `<path d="M-6 14.5 q6 -7 12 0 q-6 2 -12 0 z" fill="#7a1f35" ${S(1.8)}/>`;
    case 'flat': return `<path d="M-4.5 11 h9" ${S(2.2)}/>`;
    default: return `<path d="M0 8 q-3 4.2 -6.4 2.2 M0 8 q3 4.2 6.4 2.2" fill="none" ${S(1.9)}/>`; // ":3"
  }
}
// đầu mèo: pat = tabby | calico | point | none ; fluffy = viền lông xù
function face(o) {
  const { x = 50, y = 44, s = 1, rot = 0, fur = '#ffa53d', ear, inner = '#ffb3c1', pat, pc = '#e67a12', eyes = 'big', ec = '#7bd389', mouth = 'w', blush = true, fluffy = false, top = '', front = '', bow = '' } = o;
  const id = 'kf' + (uid++);
  let g = `<path d="M-24 -5 L-21 -31 L-5 -19 Z M24 -5 L21 -31 L5 -19 Z" fill="${ear || fur}" ${S(3)}/><path d="M-19.5 -11 L-18.5 -25 L-10 -18.5 Z M19.5 -11 L18.5 -25 L10 -18.5 Z" fill="${inner}"/>`;
  if (fluffy) {
    const tuft = [[-27, -2], [-29, 6], [-25, 14], [-17, 20], [-7, 23], [3, 23], [13, 21], [21, 16], [27, 8], [28, -1]];
    g += tuft.map(([a, b]) => `<circle cx="${a}" cy="${b}" r="6.2" fill="${fur}" ${S(3)}/>`).join('');
    g += `<ellipse cx="0" cy="0" rx="26" ry="21" fill="${fur}" ${S(3)}/>` + tuft.map(([a, b]) => `<circle cx="${a}" cy="${b}" r="4.6" fill="${fur}"/>`).join('') + `<ellipse cx="0" cy="0" rx="24.5" ry="19.6" fill="${fur}"/>`;
  } else g += `<ellipse cx="0" cy="0" rx="26" ry="21" fill="${fur}" ${S(3)}/>`;
  let p = '';
  if (pat === 'tabby') p = `<path d="M0 -21 v8 M-7.5 -20 l1.8 6.5 M7.5 -20 l-1.8 6.5 M-27 -1 h7.5 M-27 6 h6.5 M27 -1 h-7.5 M27 6 h-6.5" stroke="${pc}" stroke-width="3.2" stroke-linecap="round"/>`;
  if (pat === 'calico') p = `<ellipse cx="-16" cy="-13" rx="14" ry="11" fill="#ff9a3c"/><ellipse cx="17" cy="-14" rx="12" ry="9.5" fill="${K}"/>`;
  if (pat === 'point') p = `<ellipse cx="0" cy="6" rx="14.5" ry="12.5" fill="${pc}"/>`;
  if (p) g += `<defs><clipPath id="${id}"><ellipse cx="0" cy="0" rx="25" ry="20"/></clipPath></defs><g clip-path="url(#${id})">${p}</g>`;
  g += eyesSVG(eyes, ec);
  if (blush && eyes !== 'cry') g += `<ellipse cx="-17" cy="7.5" rx="4.4" ry="2.4" fill="#ff7f8f" opacity=".55"/><ellipse cx="17" cy="7.5" rx="4.4" ry="2.4" fill="#ff7f8f" opacity=".55"/>`;
  g += `<path d="M-2.8 4.6 h5.6 l-2.8 3 z" fill="#ff7a9a" ${S(1.1)}/>` + mouthSVG(mouth);
  g += `<path d="M-21 4 l-11 -2 M-21 8 l-11 3 M21 4 l11 -2 M21 8 l11 3" stroke="${K}" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${g}${bow}${top}${front}</g>`;
}
// thân ngồi (elip có viền) + hoạ tiết cắt theo thân
function body(x, y, rx, ry, fur, pat, pc, rot = 0) {
  const id = 'kb' + (uid++);
  let p = '';
  if (pat === 'tabby') p = `<path d="M${x - rx} ${y - 6} q8 3 14 0 M${x - rx} ${y + 4} q8 3 13 0 M${x + rx} ${y - 6} q-8 3 -14 0 M${x + rx} ${y + 4} q-8 3 -13 0" stroke="${pc}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  if (pat === 'calico') p = `<ellipse cx="${x - rx * .55}" cy="${y + ry * .2}" rx="${rx * .45}" ry="${ry * .55}" fill="#ff9a3c"/><ellipse cx="${x + rx * .7}" cy="${y - ry * .3}" rx="${rx * .35}" ry="${ry * .4}" fill="${K}"/>`;
  if (pat === 'belly') p = `<ellipse cx="${x}" cy="${y + ry * .25}" rx="${rx * .55}" ry="${ry * .7}" fill="#fff8ee"/>`;
  return `<g transform="rotate(${rot} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fur}" ${S(3)}/>${p ? `<defs><clipPath id="${id}"><ellipse cx="${x}" cy="${y}" rx="${rx - 1.4}" ry="${ry - 1.4}"/></clipPath></defs><g clip-path="url(#${id})">${p}</g>` : ''}</g>`;
}
const paw = (x, y, fur, r = 5.2) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .82}" fill="${fur}" ${S(2.6)}/>`;
const sweat = (x, y, s = 1) => `<path d="M${x} ${y} q${5 * s} ${8 * s} 0 ${11 * s} q${-5 * s} ${-3 * s} 0 ${-11 * s} z" fill="#7cc8ff" ${S(1.5)}/>`;
const heart = (x, y, s = 1, c = '#ff5d8f') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 4 c-4 -5 -11 -2 -8 4 l8 7 l8 -7 c3 -6 -4 -9 -8 -4z" fill="${c}" ${S(2 / s)}/>`;
const star = (x, y, r = 6, c = '#ffd23f') => { const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; pts.push((x + Math.cos(a) * rr).toFixed(1) + ',' + (y + Math.sin(a) * rr).toFixed(1)); } return `<polygon points="${pts.join(' ')}" fill="${c}" ${S(2)}/>`; };
const miniCard = (x, y, rot, fill = '#fff', mark = '') => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-7.5" y="-10.5" width="15" height="21" rx="3" fill="${fill}" ${S(2.4)}/>${mark}</g>`;
const backMark = '<path d="M-3.6 1.6 a3.6 3 0 1 0 7.2 0 a3.6 3 0 1 0 -7.2 0 M-4.6 -3.2 h.1 M-1.5 -5.4 h.1 M1.5 -5.4 h.1 M4.6 -3.2 h.1" stroke="#8a5a2b" stroke-width="2.4" stroke-linecap="round" fill="none"/>';

// ---------- 5 giống mèo thường ----------
const BREED = {
  cat1: { fur: '#ffa53d', inner: '#ffc1b5', pat: 'tabby', pc: '#e67a12', eyes: 'happy' },
  cat2: { fur: '#a9b0bb', inner: '#f6b9c5', pat: 'tabby', pc: '#5e6672', eyes: 'round', ec: '#6cc04a' },
  cat3: { fur: '#fffaf2', inner: '#ffc1cf', pat: 'calico', eyes: 'round', ec: '#e0a91b' },
  cat4: { fur: '#f6e7cc', ear: '#5b3d2e', inner: '#c9907a', pat: 'point', pc: '#6b4a3a', eyes: 'round', ec: '#3d8bff' },
  cat5: { fur: '#fbeaff', inner: '#ff9ec4', eyes: 'sparkle', ec: '#a06cd5', fluffy: true },
};
const CAT_ART = {
  // Mèo Ú: tròn như cục mochi, nằm ườn, mắt híp sung sướng
  cat1: () => { const b = BREED.cat1; return L('M88 80 q12 -2 8 -16', b.fur, 7) + body(56, 72, 38, 22, b.fur, 'tabby', b.pc) + `<ellipse cx="56" cy="80" rx="20" ry="10" fill="#fff1dc"/>` + paw(36, 92, b.fur, 6) + paw(76, 92, b.fur, 6) + face({ ...b, x: 56, y: 50, s: 1.02, mouth: 'tongue' }); },
  // Mèo Mướp: ngồi thẳng lưng, sọc vằn khắp người, đuôi sọc
  cat2: () => { const b = BREED.cat2; return L('M74 88 q20 0 16 -22 q-2 -8 -8 -6', b.fur, 7) + `<path d="M84 76 l6 -3 M87 68 l6 1" stroke="${b.pc}" stroke-width="3" stroke-linecap="round"/>` + body(58, 74, 21, 20, b.fur, 'tabby', b.pc) + paw(50, 92, b.fur) + paw(66, 92, b.fur) + face({ ...b, x: 58, y: 44, s: .96 }); },
  // Mèo Tam Thể: trắng-cam-đen, đeo vòng cổ chuông vàng
  cat3: () => { const b = BREED.cat3; return L('M76 88 q18 -2 14 -20', '#ff9a3c', 7) + body(58, 75, 22, 19, b.fur, 'calico') + paw(49, 92, b.fur) + paw(67, 92, b.fur) + face({ ...b, x: 58, y: 45, s: .96, mouth: 'w' }) + `<path d="M42 62 q16 8 32 0" fill="none" stroke="#e11d48" stroke-width="5" stroke-linecap="round"/><circle cx="58" cy="67.5" r="5" fill="#ffd23f" ${S(2.2)}/><path d="M55.5 68.5 h5" ${S(1.6)}/>`; },
  // Mèo Xiêm: dáng thon, mặt-tai-chân-đuôi nâu đậm, mắt xanh, hếch mũi kiêu kỳ
  cat4: () => { const b = BREED.cat4; return L('M70 90 q24 -4 18 -30 q-2 -6 -6 -8', '#5b3d2e', 6) + body(58, 76, 17, 18, b.fur) + L('M51 82 v8', '#5b3d2e', 6) + L('M65 82 v8', '#5b3d2e', 6) + face({ ...b, x: 58, y: 44, s: .94, rot: -6, mouth: 'smirk', blush: false }); },
  // Mèo Bông: lông xù như cục bông, nơ hồng
  cat5: () => { const b = BREED.cat5; const tuft = [[34, 72], [36, 84], [46, 92], [58, 94], [70, 92], [80, 84], [82, 72]]; return L('M80 86 q18 -4 12 -22', b.fur, 10) + tuft.map(([a, c]) => `<circle cx="${a}" cy="${c}" r="7" fill="${b.fur}" ${S(3)}/>`).join('') + `<ellipse cx="58" cy="76" rx="23" ry="17" fill="${b.fur}"/>` + face({ ...b, x: 58, y: 46, s: .92, bow: `<path d="M12 -26 l-7 -6 v12 z M12 -26 l7 -6 v12 z" fill="#ff6fa8" ${S(2)}/><circle cx="12" cy="-26" r="2.6" fill="#ff6fa8" ${S(1.6)}/>` }); },
};
export function catSVG(kind) { return `<svg viewBox="0 0 100 100" class="art" aria-hidden="true">${(CAT_ART[kind] || CAT_ART.cat1)()}</svg>`; }

// ---------- Mèo Nổ: mèo ôm quả bom đang cháy ngòi ----------
// mood: panic (mặc định) | phew (có Gỡ Bom – hú hồn) | cry (không có – khóc) ; fur: màu lông theo người bốc
export function bombSVG(mood = 'panic', fur = '#fff3e0') {
  const f = fur, ef = mood === 'cry' ? 'cry' : mood === 'phew' ? 'happy' : 'panic';
  const mo = mood === 'cry' ? 'sad' : mood === 'phew' ? 'wobble' : 'o';
  const extra = mood === 'cry' ? '' : sweat(mood === 'phew' ? 23 : 25, mood === 'phew' ? -16 : -14, mood === 'phew' ? 1.2 : 1);
  const bubble = mood === 'phew' ? `<g font-family="Baloo 2,sans-serif" font-weight="800" transform="translate(72 28)"><path d="M10 54 q-8 -2 -6 -9 q2 -6 9 -4 q4 -6 10 -2 q6 -1 6 5 q5 4 0 8 q-3 4 -9 2 q-5 3 -10 0 z" fill="#fff" ${S(2)}/><text x="17" y="52" text-anchor="middle" font-size="9" fill="${K}">phù~</text></g>` : '';
  return `<svg viewBox="0 0 100 100" class="art bomb-art m-${mood}" aria-hidden="true">
    ${face({ x: 52, y: 36, s: .86, fur: f, inner: '#ffb3c1', eyes: ef, mouth: mo, blush: mood !== 'cry', front: extra })}
    <circle cx="52" cy="72" r="23" fill="#26222b" ${S(3)}/><ellipse cx="42" cy="62" rx="7" ry="4.2" fill="#fff" opacity=".28" transform="rotate(-32 42 62)"/>
    <rect x="62" y="47" width="11" height="8" rx="2" fill="#5b5662" ${S(2.4)} transform="rotate(30 67.5 51)"/>
    <path class="fuse" d="M70 48 q6 -10 14 -10 q6 0 6 -7" stroke="#c9a46b" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <g class="spark-g"><path d="M90 22 l2 6 l6 -1 l-4 5 l4 5 l-6 -1 l-2 6 l-2 -6 l-6 1 l4 -5 l-4 -5 l6 1 z" fill="#ffd23f" ${S(1.6)}/><circle cx="90" cy="32" r="2.4" fill="#fff"/></g>
    ${L('M31 60 q-6 14 9 22', f, 7.5)}${L('M74 62 q4 12 -10 20', f, 7.5)}
    ${paw(32, 95, f, 5.5)}${paw(72, 95, f, 5.5)}${bubble}</svg>`;
}

// ---------- lá chức năng: mỗi lá 1 chú mèo đang làm việc của lá ----------
const ART = {
  // Gỡ Bom: mèo đeo kính bảo hộ, lè lưỡi tập trung, cầm kéo cắt dây đỏ của quả bom nhỏ
  defuse: () => { const f = '#ffd8a8'; return `<path d="M22 74 q-4 -14 8 -22" stroke="#ff3d2e" stroke-width="4.2" fill="none" stroke-linecap="round"/><path d="M33 47 q8 -8 6 -18" stroke="#ff3d2e" stroke-width="4.2" fill="none" stroke-linecap="round"/><path d="M14 75 q-6 -12 -2 -24" stroke="#3a86ff" stroke-width="4.2" fill="none" stroke-linecap="round"/>
    <circle cx="19" cy="85" r="12" fill="#26222b" ${S(2.8)}/><ellipse cx="14" cy="80" rx="3.4" ry="2.2" fill="#fff" opacity=".3"/>` + body(70, 82, 19, 15, f, 'belly') + face({ x: 66, y: 42, s: .88, fur: f, inner: '#ffb3c1', eyes: 'goggles', mouth: 'tongue', blush: false }) +
    `<g transform="translate(42 60) rotate(37)"><path d="M1 -1.5 L-25 -9 Q-27 -7.5 -25 -6 L1 3 Z" fill="#eef2f7" ${S(2.2)}/><path d="M1 1.5 L-25 9 Q-27 7.5 -25 6 L1 -3 Z" fill="#dfe5ec" ${S(2.2)}/><circle cx="10" cy="-6.5" r="5.6" fill="#fff" stroke="#e5383b" stroke-width="3.8"/><circle cx="10" cy="6.5" r="5.6" fill="#fff" stroke="#e5383b" stroke-width="3.8"/><path d="M1 -1 L6 -4 M1 1 L6 4" ${S(3)}/><circle cx="1" cy="0" r="2.2" fill="${K}"/></g>` + L('M66 72 q-6 6 -14 -2', f, 7) +
    `<path d="M26 42 l-5 -5 M31 39 l0 -7 M22 50 l-7 0" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`; },
  // Đổ Vỏ: mèo mặt gian chỉ tay đẩy trách nhiệm sang con mèo nhỏ đang hoảng, kèm ×2
  attack: () => { const f = '#fff0dd'; return body(42, 80, 20, 16, f, 'belly') + face({ x: 42, y: 48, s: .86, fur: f, inner: '#ffb3c1', eyes: 'smug', mouth: 'smirk' }) + L('M52 76 L76 66', f, 7) + `<circle cx="80" cy="64" r="2.6" fill="${f}" ${S(2)}/>` +
    face({ x: 84, y: 86, s: .4, fur: '#9ad0ff', inner: '#ffb3c1', eyes: 'panic', mouth: 'o', blush: false }) + sweat(94, 70, .7) +
    `<g transform="rotate(10 78 40)"><circle cx="78" cy="40" r="11" fill="#ffd23f" ${S(2.6)}/><text x="78" y="45" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="13" fill="${K}">×2</text></g>`; },
  // Né Gắt: mèo đeo kính đen lướt nghiêng người, vệt gió phía sau
  skip: () => { const f = '#d7d0ff'; return `<path d="M6 60 h18 M2 70 h22 M8 80 h16" stroke="#fff" stroke-width="4" stroke-linecap="round"/>` + L('M42 84 q-18 4 -22 -10', f, 6) + body(56, 76, 19, 15, f, 'belly', null, -18) + L('M52 88 l-12 6', f, 6.5) + L('M66 88 l12 2', f, 6.5) +
    face({ x: 62, y: 46, s: .88, rot: -14, fur: f, inner: '#ffb3c1', eyes: 'shades', mouth: 'smirk' }) + L('M70 70 q12 -2 16 -12', f, 6.5) + `<path d="M86 50 l3 -4 M90 55 l5 -1" stroke="${K}" stroke-width="2.4" stroke-linecap="round"/>`; },
  // Xào Bài: mèo giơ 2 tay tung bài lên trời, cười toe
  shuffle: () => { const f = '#ffe4a8'; return miniCard(36, 16, -24, '#e6b376', backMark) + miniCard(58, 9, 4, '#fff', `<text y="4" text-anchor="middle" font-size="11">💣</text>`) + miniCard(80, 17, 26, '#e6b376', backMark) + miniCard(92, 42, 50, '#fff', `<text y="4" text-anchor="middle" font-size="10">🐾</text>`) +
    `<path d="M30 34 q4 -6 10 -6 M70 30 q6 0 10 6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-dasharray="3 4"/>` + body(58, 84, 18, 13, f, 'belly') + L('M44 80 q-12 -10 -10 -26', f, 6.5) + L('M72 80 q12 -10 10 -26', f, 6.5) +
    face({ x: 58, y: 60, s: .8, fur: f, inner: '#ffb3c1', eyes: 'happy', mouth: 'grin' }); },
  // Soi Kèo: mèo thầy bói quấn khăn, ôm quả cầu thuỷ tinh phát sáng
  future: () => { const f = '#f3d9ff'; return body(56, 70, 22, 18, '#7c3aed') + face({ x: 56, y: 40, s: .84, fur: f, inner: '#ffb3c1', eyes: 'sparkle', ec: '#38bdf8', mouth: 'o', top: `<path d="M-20 -14 q20 -24 40 0 q-20 -6 -40 0 z" fill="#a855f7" ${S(2.6)}/><circle cx="0" cy="-18" r="3.6" fill="#ff3d6e" ${S(1.6)}/>` }) +
    `<path d="M40 96 h32 l-5 -9 h-22 z" fill="#f59e0b" ${S(2.6)}/><circle cx="56" cy="76" r="15" fill="#bfe9ff" ${S(3)}/><circle cx="56" cy="76" r="9" fill="#ffffff" opacity=".55"/><path d="M48 70 q3 -5 8 -5" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
    `<text x="57" y="83" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="17" fill="#7c3aed" opacity=".75">?</text>` +
    paw(41, 80, f, 5.4) + paw(71, 80, f, 5.4) + star(86, 30, 5, '#fff') + star(26, 70, 4, '#fff') + star(90, 60, 3.4, '#ffd23f'); },
  // Cải Mệnh: mèo phù thuỷ đội nón nhọn vẫy đũa, 3 lá bay vòng đổi chỗ
  alter: () => { const f = '#2d2a32', fl = '#4b4553'; return body(42, 80, 19, 15, fl) + face({ x: 42, y: 52, s: .8, fur: fl, ear: fl, inner: '#ff9ec4', eyes: 'round', ec: '#ffd23f', mouth: 'grin', blush: false, top: `<path d="M-26 -16 q26 -10 52 0 q-26 7 -52 0 z" fill="#5b21b6" ${S(2.6)}/><path d="M-13 -18 L8 -56 L13 -18 z" fill="#5b21b6" ${S(2.6)}/><path d="M-12 -21 q12 -4 24 0" stroke="#ffd23f" stroke-width="4" fill="none"/>` }) +
    L('M56 76 q8 -6 12 -14', fl, 6) + `<path d="M66 64 L78 40" stroke="${f}" stroke-width="5" stroke-linecap="round"/><path d="M66 64 L78 40" stroke="#c4a484" stroke-width="2.4" stroke-linecap="round"/>` + star(79, 37, 6.4) +
    miniCard(88, 58, 12, '#fff', '<text y="4" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="11" fill="#2d2a32">1</text>') + miniCard(84, 82, -8, '#fff', '<text y="4" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="11" fill="#2d2a32">2</text>') + miniCard(66, 92, -24, '#fff', '<text y="4" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="11" fill="#2d2a32">3</text>') +
    `<path d="M70 26 q10 -6 18 2 M96 70 q2 6 -2 10" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-dasharray="2 4"/>`; },
  // Xin Vía: mèo chắp tay xin xỏ, mắt long lanh, tim bay
  favor: () => { const f = '#fffdf6'; return body(58, 82, 19, 14, f, 'belly') + face({ x: 58, y: 48, s: .92, fur: f, inner: '#ffb3c1', pat: 'calico', eyes: 'sparkle', ec: '#8b5cf6', mouth: 'w' }) +
    L('M44 82 q4 -6 12 -10', f, 6.5) + L('M72 82 q-4 -6 -12 -10', f, 6.5) + `<ellipse cx="55.5" cy="70" rx="4.5" ry="6.5" fill="${f}" ${S(2.4)} transform="rotate(14 55.5 70)"/><ellipse cx="60.5" cy="70" rx="4.5" ry="6.5" fill="${f}" ${S(2.4)} transform="rotate(-14 60.5 70)"/>` +
    heart(88, 22, .8) + heart(30, 62, .6, '#fff') + heart(92, 46, .5, '#fff'); },
  // Móc Đáy: mèo nằm rạp, lè lưỡi, thò tay móc lá dưới đáy chồng bài
  bottom: () => { const f = '#ffcf99'; return `<g>${[0, 1, 2, 3].map(i => `<rect x="${26 + (i % 2) * 2}" y="${36 + i * 11}" width="34" height="13" rx="3" fill="#e6b376" ${S(2.4)}/>`).join('')}</g><rect x="44" y="80" width="34" height="13" rx="3" fill="#fff" ${S(2.4)}/><text x="61" y="90.5" text-anchor="middle" font-size="9">🐾</text>` +
    `<path d="M24 84 h-6 M24 89 h-8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>` + L('M92 92 q4 -16 -6 -20', f, 6) + body(84, 82, 14, 11, f, 'tabby', '#e08a3c') + face({ x: 80, y: 60, s: .62, fur: f, inner: '#ffb3c1', pat: 'tabby', pc: '#e08a3c', eyes: 'smug', mouth: 'tongue' }) + L('M74 84 Q66 88 56 87', f, 6) + `<path d="M34 28 l2 -6 M42 26 v-7 M50 28 l-2 -6" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`; },
  // ĐÉO!: mèo cau có giơ bàn chân chặn + cầm biển "ĐÉO!"
  nope: () => { const f = '#fff3e6'; return `<path d="M70 48 V86" stroke="${K}" stroke-width="6.5" stroke-linecap="round"/><path d="M70 48 V86" stroke="#c9a46b" stroke-width="3" stroke-linecap="round"/>
    <g transform="rotate(8 72 28)"><path d="M62 6 h20 l14 14 v18 l-14 14 h-20 l-14 -14 v-18 z" fill="#fff" ${S(3)}/><path d="M63.5 10 h17 l11.5 11.5 v15 l-11.5 11.5 h-17 l-11.5 -11.5 v-15 z" fill="#be123c"/><text x="72" y="34" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="15" fill="#fff" stroke="${K}" stroke-width="1" paint-order="stroke">ĐÉO!</text></g>` +
    body(48, 84, 19, 13, f, 'belly') + face({ x: 46, y: 58, s: .76, fur: f, inner: '#ffb3c1', pat: 'tabby', pc: '#e8a25a', eyes: 'angry', mouth: 'yell' }) + paw(70, 74, f, 5.2) +
    L('M34 80 q-8 -4 -10 -16', f, 6.5) + `<g transform="translate(22 58)"><ellipse cx="0" cy="2" rx="9" ry="8" fill="${f}" ${S(2.6)}/><ellipse cx="0" cy="4.5" rx="4.2" ry="3.4" fill="#ff9eb5"/><circle cx="-5" cy="-2.5" r="1.8" fill="#ff9eb5"/><circle cx="0" cy="-4" r="1.8" fill="#ff9eb5"/><circle cx="5" cy="-2.5" r="1.8" fill="#ff9eb5"/></g>`; },
};
const ICON = { defuse: '✂️', attack: '🫵', skip: '🏃', shuffle: '🌀', future: '🔮', alter: '🪄', favor: '🙏', bottom: '🪝', nope: '🙅' };
const SHORT = {
  bomb: 'BÙM! Không có Gỡ Bom là bị loại', defuse: 'Cứu mạng khi bốc trúng bom', attack: 'Khỏi bốc, người sau gánh 2 lượt', skip: 'Hết 1 lượt, khỏi bốc',
  shuffle: 'Xáo trộn chồng bài', future: 'Lén xem 3 lá trên cùng', alter: 'Xem & xếp lại 3 lá trên', favor: '1 người phải cho bạn 1 lá',
  bottom: 'Bốc lá dưới đáy, hết lượt', nope: 'Huỷ 1 hành động', cat1: 'Đôi: cướp bừa · Ba: gọi tên', cat2: 'Đôi: cướp bừa · Ba: gọi tên',
  cat3: 'Đôi: cướp bừa · Ba: gọi tên', cat4: 'Đôi: cướp bừa · Ba: gọi tên', cat5: 'Đôi: cướp bừa · Ba: gọi tên',
};
// chữ viết tắt ở góc trên trái – lá xếp chồng chỉ lộ mép trái vẫn đọc được
const ABBR = { bomb: 'NỔ', defuse: 'GỠ', attack: 'ĐỔ', skip: 'NÉ', shuffle: 'XÀO', future: 'SOI', alter: 'CẢI', favor: 'XIN', bottom: 'MÓC', nope: 'ĐÉO', cat1: 'Ú', cat2: 'MƯỚP', cat3: 'TAM', cat4: 'XIÊM', cat5: 'BÔNG' };
const PAW_COL = { cat1: '#b45309', cat2: '#334155', cat3: '#c2410c', cat4: '#4a2c1d', cat5: '#7e22ce' };
const pawIcon = (c, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true"><g fill="${c}"><ellipse cx="12" cy="15.5" rx="5.6" ry="4.6"/><circle cx="5.4" cy="9.6" r="2.3"/><circle cx="9.4" cy="5.8" r="2.3"/><circle cx="14.6" cy="5.8" r="2.3"/><circle cx="18.6" cy="9.6" r="2.3"/></g></svg>`;
function artFor(t, opt = {}) {
  if (t === 'bomb') return bombSVG(opt.mood, opt.fur);
  if (t.startsWith('cat')) return catSVG(t);
  return ART[t] ? `<svg viewBox="0 0 100 100" class="art" aria-hidden="true">${ART[t]()}</svg>` : `<div class="emo">${ICON[t] || '❓'}</div>`;
}
const cornerIcon = t => t === 'bomb' ? '💣' : t.startsWith('cat') ? pawIcon(PAW_COL[t]) : ICON[t];
// lá bài: góc trên trái (biểu tượng + chữ tắt), hình mèo lớn ở giữa, tên chữ to đậm; mèo thường có dấu "đánh theo cặp"
// opt (chỉ cho Mèo Nổ): { mood: 'panic'|'phew'|'cry', fur: màu lông }
export function cardHTML(c, cls = '', attrs = '', opt = {}) {
  if (!c) return `<div class="mcard back ${cls}" ${attrs}><i class="tape"></i><div class="back-art">🐾</div></div>`;
  const t = c.t || c; const cat = t.startsWith('cat');
  return `<div class="mcard t-${t} ${cat ? 'is-cat' : 'is-act'} ${cls}" ${c.id ? `data-id="${c.id}"` : ''} data-t="${t}" title="${CARD[t].name} (${CARD[t].en}): ${CARD[t].desc}" ${attrs}>
    <i class="mc-pat"></i><span class="mc-corner"><span class="mc-ci">${cornerIcon(t)}</span><b class="mc-ab">${ABBR[t]}</b></span>${cat ? '<span class="mc-pair" title="Đánh theo cặp">🐾×2</span>' : ''}<div class="mc-art">${artFor(t, opt)}</div>
    <div class="mc-name">${CARD[t].name}</div><div class="mc-en">${CARD[t].en}</div><div class="mc-desc">${SHORT[t]}</div></div>`;
}
export const cardIcon = t => t === 'bomb' ? '💣' : t.startsWith('cat') ? '🐱' : ICON[t] || '🃏';

// Mèo linh vật nằm cạnh chồng bài: ngủ / tỉnh / hoảng / sướng / choáng (đổi bằng class m-*)
export function mascotSVG() {
  return `<svg viewBox="0 0 120 100" class="mascot-svg" aria-hidden="true">
    <ellipse cx="60" cy="93" rx="44" ry="5" fill="#0000001c"/>
    <path class="m-tail" d="M96 80 q20 -2 16 -22 q-2 -9 -9 -6" stroke="#2d2a32" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path class="m-tail" d="M96 80 q20 -2 16 -22 q-2 -9 -9 -6" stroke="#ffa53d" stroke-width="7" fill="none" stroke-linecap="round"/>
    <g class="m-body"><path d="M16 90 q-4 -44 44 -46 q48 2 44 46 z" fill="#ffa53d" stroke="#2d2a32" stroke-width="3.5"/>
      <path d="M40 52 q4 8 0 16 M60 46 v14 M80 52 q-4 8 0 16" stroke="#e67a12" stroke-width="4" fill="none" stroke-linecap="round"/>
      <ellipse cx="36" cy="88" rx="10" ry="5" fill="#fff4e6" stroke="#2d2a32" stroke-width="3"/><ellipse cx="84" cy="88" rx="10" ry="5" fill="#fff4e6" stroke="#2d2a32" stroke-width="3"/></g>
    <g class="m-head"><g class="m-ears"><path d="M30 40 L28 10 L52 26 Z M90 40 L92 10 L68 26 Z" fill="#ffa53d" stroke="#2d2a32" stroke-width="3.5" stroke-linejoin="round"/><path d="M34 32 L33 18 L46 27 Z M86 32 L87 18 L74 27 Z" fill="#ff9eb5"/></g>
      <ellipse cx="60" cy="44" rx="34" ry="27" fill="#ffa53d" stroke="#2d2a32" stroke-width="3.5"/>
      <path d="M60 18 v8 M52 19 l2 7 M68 19 l-2 7" stroke="#e67a12" stroke-width="3.5" stroke-linecap="round"/>
      <ellipse cx="38" cy="54" rx="6" ry="3.5" fill="#ff8c8c" opacity=".7"/><ellipse cx="82" cy="54" rx="6" ry="3.5" fill="#ff8c8c" opacity=".7"/>
      <g class="ey ey-sleep" stroke="#2d2a32" stroke-width="3.2" fill="none" stroke-linecap="round"><path d="M40 44 q6 5 12 0 M68 44 q6 5 12 0"/></g>
      <g class="ey ey-open"><ellipse cx="46" cy="43" rx="6" ry="7" fill="#2d2a32"/><ellipse cx="74" cy="43" rx="6" ry="7" fill="#2d2a32"/><circle cx="48" cy="40" r="2.2" fill="#fff"/><circle cx="76" cy="40" r="2.2" fill="#fff"/></g>
      <g class="ey ey-panic"><circle cx="45" cy="42" r="9" fill="#fff" stroke="#2d2a32" stroke-width="3"/><circle cx="75" cy="42" r="9" fill="#fff" stroke="#2d2a32" stroke-width="3"/><circle cx="45" cy="43" r="2.6" fill="#2d2a32"/><circle cx="75" cy="43" r="2.6" fill="#2d2a32"/><path d="M98 26 q5 8 0 11 q-5 -3 0 -11z" fill="#6ec6ff" stroke="#2d2a32" stroke-width="1.5"/></g>
      <g class="ey ey-happy" stroke="#2d2a32" stroke-width="3.4" fill="none" stroke-linecap="round"><path d="M40 46 q6 -8 12 0 M68 46 q6 -8 12 0"/></g>
      <g class="ey ey-dizzy" stroke="#2d2a32" stroke-width="3" stroke-linecap="round"><path d="M40 37 l11 11 M51 37 l-11 11 M69 37 l11 11 M80 37 l-11 11"/></g>
      <path d="M56.5 51 h7 l-3.5 3.5 z" fill="#ff6f91"/>
      <path class="mo mo-calm" d="M60 55 q-3 4 -6 2 M60 55 q3 4 6 2" stroke="#2d2a32" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <ellipse class="mo mo-o" cx="60" cy="60" rx="4.5" ry="5.5" fill="#7a1f35" stroke="#2d2a32" stroke-width="2"/>
      <path d="M26 50 l-14 -3 M26 55 l-14 2 M94 50 l14 -3 M94 55 l14 2" stroke="#2d2a32" stroke-width="2" stroke-linecap="round" opacity=".55"/></g>
    <g class="m-zz" font-family="Baloo 2,sans-serif" font-weight="800" fill="#7a6f80"><text x="96" y="16" font-size="15">z</text><text x="106" y="6" font-size="11">z</text></g>
    <g class="m-bang"><path d="M10 6 l6 22 l-6 -2 z" fill="#e5383b" stroke="#2d2a32" stroke-width="2" stroke-linejoin="round"/><circle cx="14" cy="33" r="3" fill="#e5383b" stroke="#2d2a32" stroke-width="2"/></g>
    <g class="m-heart"><path d="M100 14 c-4 -6 -12 -2 -9 4 l9 8 l9 -8 c3 -6 -5 -10 -9 -4z" fill="#ff5d8f" stroke="#2d2a32" stroke-width="2"/></g></svg>`;
}
