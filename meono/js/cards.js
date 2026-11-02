// Vẽ lá bài Mèo Nổ: SVG mèo tự vẽ + emoji. Không dùng hình của game gốc.
import { CARD } from './engine.js?v=2';

let uid = 0;
// thông số từng giống mèo
const BREED = {
  cat1: { fur: '#ffa53d', ear: '#ff8a1f', inner: '#ffc1b5', fat: 1, eyes: 'happy', tabby: '#e67a12', cheek: '#ff9e9e' },
  cat2: { fur: '#a9b0bb', ear: '#8c94a1', inner: '#f6b9c5', eyes: 'round', tabby: '#5e6672', eyeCol: '#6cc04a' },
  cat3: { fur: '#fffaf2', ear: '#2d2a32', inner: '#ffc1cf', eyes: 'round', patches: true, eyeCol: '#d9a31b' },
  cat4: { fur: '#f3e3c7', ear: '#5b3d2e', inner: '#c9907a', eyes: 'round', mask: '#6b4a3a', eyeCol: '#3d8bff' },
  cat5: { fur: '#ffffff', ear: '#ffe0ec', inner: '#ff9ec4', eyes: 'sparkle', fluffy: true, cheek: '#ffb3cf', eyeCol: '#a06cd5' },
};
export function catSVG(kind, extra = '') {
  const b = BREED[kind] || BREED.cat1; const id = 'cl' + (uid++);
  const rx = b.fat ? 38 : 33, ry = b.fat ? 31 : 29;
  const head = `<ellipse cx="50" cy="58" rx="${rx}" ry="${ry}"/>`;
  const earL = `<path d="M${50 - rx + 4} 46 L${50 - rx + 8} 14 L${50 - 8} 34 Z"/>`, earR = `<path d="M${50 + rx - 4} 46 L${50 + rx - 8} 14 L${50 + 8} 34 Z"/>`;
  const inL = `<path d="M${50 - rx + 10} 40 L${50 - rx + 11} 22 L${50 - 13} 35 Z" fill="${b.inner}"/>`, inR = `<path d="M${50 + rx - 10} 40 L${50 + rx - 11} 22 L${50 + 13} 35 Z" fill="${b.inner}"/>`;
  let deco = '';
  if (b.tabby) deco += `<path d="M50 30 v10 M42 31 l2 9 M58 31 l-2 9" stroke="${b.tabby}" stroke-width="3.5" stroke-linecap="round"/><path d="M${50 - rx} 58 h9 M${50 - rx + 1} 66 h8 M${50 + rx} 58 h-9 M${50 + rx - 1} 66 h-8" stroke="${b.tabby}" stroke-width="3" stroke-linecap="round"/>`;
  if (b.patches) deco += `<ellipse cx="30" cy="40" rx="16" ry="13" fill="#ff9a3c"/><ellipse cx="72" cy="38" rx="13" ry="11" fill="#2d2a32"/><ellipse cx="78" cy="78" rx="10" ry="8" fill="#ff9a3c"/>`;
  if (b.mask) deco += `<ellipse cx="50" cy="66" rx="17" ry="15" fill="${b.mask}" opacity=".85"/>`;
  if (b.fluffy) deco += `<path d="M${50 - rx} 70 q-6 -4 -2 -10 q-6 -4 0 -10 M${50 + rx} 70 q6 -4 2 -10 q6 -4 0 -10" stroke="${b.fur}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  let eyes;
  if (b.eyes === 'happy') eyes = `<path d="M33 56 q6 -7 12 0 M55 56 q6 -7 12 0" stroke="#2d2a32" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  else if (b.eyes === 'sparkle') eyes = `<circle cx="38" cy="55" r="7.5" fill="#2d2a32"/><circle cx="62" cy="55" r="7.5" fill="#2d2a32"/><circle cx="40.5" cy="52" r="3" fill="#fff"/><circle cx="64.5" cy="52" r="3" fill="#fff"/><circle cx="36" cy="58" r="1.4" fill="#fff"/><circle cx="60" cy="58" r="1.4" fill="#fff"/>`;
  else eyes = `<ellipse cx="38" cy="55" rx="6.5" ry="7" fill="${b.eyeCol || '#7bd389'}"/><ellipse cx="62" cy="55" rx="6.5" ry="7" fill="${b.eyeCol || '#7bd389'}"/><ellipse cx="38" cy="55" rx="2.2" ry="5.5" fill="#1d1b22"/><ellipse cx="62" cy="55" rx="2.2" ry="5.5" fill="#1d1b22"/><circle cx="40" cy="52" r="1.6" fill="#fff"/><circle cx="64" cy="52" r="1.6" fill="#fff"/>`;
  const cheek = b.cheek ? `<ellipse cx="29" cy="67" rx="6" ry="3.5" fill="${b.cheek}" opacity=".8"/><ellipse cx="71" cy="67" rx="6" ry="3.5" fill="${b.cheek}" opacity=".8"/>` : '';
  const face = `<path d="M46.5 64 h7 l-3.5 4 z" fill="#ff7a9a"/><path d="M50 68 q-3 5 -7 3 M50 68 q3 5 7 3" stroke="#2d2a32" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M20 63 l-12 -3 M20 68 l-12 2 M80 63 l12 -3 M80 68 l12 2" stroke="#2d2a32" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`;
  return `<svg viewBox="0 0 100 100" class="art" aria-hidden="true"><defs><clipPath id="${id}">${head}</clipPath></defs>
    <g fill="${b.ear}">${earL}${earR}</g>${inL}${inR}<g fill="${b.fur}" stroke="#2d2a3222" stroke-width="2">${head}</g><g clip-path="url(#${id})">${deco}</g>${eyes}${cheek}${face}${extra}</svg>`;
}
// Mèo Nổ: quả bom tròn có tai mèo, ngòi lửa xèo xèo
export function bombSVG() {
  return `<svg viewBox="0 0 100 100" class="art bomb-art" aria-hidden="true">
    <path d="M24 44 L22 18 L40 32 Z M76 44 L78 18 L60 32 Z" fill="#26222b"/><path d="M27 38 L26 25 L36 33 Z M73 38 L74 25 L64 33 Z" fill="#ff5d8f"/>
    <circle cx="50" cy="60" r="31" fill="#26222b"/><ellipse cx="38" cy="47" rx="8" ry="5" fill="#fff" opacity=".18" transform="rotate(-30 38 47)"/>
    <path d="M34 54 l11 5 M66 54 l-11 5" stroke="#ff3d2e" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="62" r="4" fill="#ffd23f"/><circle cx="60" cy="62" r="4" fill="#ffd23f"/>
    <path d="M42 75 q8 -6 16 0" stroke="#ffd23f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="44" y="24" width="12" height="8" rx="2" fill="#5b5662"/><path class="fuse" d="M50 24 q2 -10 12 -12 q8 -2 10 -8" stroke="#c9a46b" stroke-width="3" fill="none" stroke-linecap="round"/>
    <g class="spark-g"><circle cx="72" cy="5" r="5" fill="#ffd23f"/><circle cx="72" cy="5" r="2.5" fill="#fff"/></g></svg>`;
}
const ICON = { defuse: '✂️', attack: '🫵', skip: '🏃', shuffle: '🌀', future: '🔮', alter: '🪄', favor: '🙏', bottom: '🪝', nope: '🙅' };
const SHORT = {
  bomb: 'BÙM! Không có Gỡ Bom là bị loại', defuse: 'Cứu mạng khi bốc trúng bom', attack: 'Khỏi bốc, người sau gánh 2 lượt', skip: 'Hết 1 lượt, khỏi bốc',
  shuffle: 'Xáo trộn chồng bài', future: 'Lén xem 3 lá trên cùng', alter: 'Xem & xếp lại 3 lá trên', favor: '1 người phải cho bạn 1 lá',
  bottom: 'Bốc lá dưới đáy, hết lượt', nope: 'Huỷ 1 hành động', cat1: 'Đôi: cướp bừa · Ba: gọi tên', cat2: 'Đôi: cướp bừa · Ba: gọi tên',
  cat3: 'Đôi: cướp bừa · Ba: gọi tên', cat4: 'Đôi: cướp bừa · Ba: gọi tên', cat5: 'Đôi: cướp bừa · Ba: gọi tên',
};
function artFor(t) {
  if (t === 'bomb') return bombSVG();
  if (t.startsWith('cat')) return catSVG(t);
  if (t === 'defuse') return `<div class="emo">${ICON[t]}</div><div class="emo2">🥫</div>`;
  return `<div class="emo">${ICON[t] || '❓'}</div>`;
}
export function cardHTML(c, cls = '', attrs = '') {
  if (!c) return `<div class="mcard back ${cls}" ${attrs}><div class="back-art">🐾</div></div>`;
  const t = c.t || c;
  return `<div class="mcard t-${t} ${t.startsWith('cat') ? 'is-cat' : ''} ${cls}" ${c.id ? `data-id="${c.id}"` : ''} data-t="${t}" ${attrs}>
    <div class="mc-art">${artFor(t)}</div><div class="mc-name">${CARD[t].name}</div><div class="mc-desc">${SHORT[t]}</div></div>`;
}
export const cardIcon = t => t === 'bomb' ? '💣' : t.startsWith('cat') ? '🐱' : ICON[t] || '🃏';
