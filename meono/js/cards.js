// Vẽ lá bài Mèo Nổ: SVG mèo tự vẽ + emoji. Không dùng hình của game gốc.
import { CARD } from './engine.js?v=5';

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
// tên ngắn 2 dòng – dùng khi tay bài chật (lá chồng lên nhau)
const TWO = {
  bomb: ['MÈO', 'NỔ'], defuse: ['GỠ', 'BOM'], attack: ['ĐỔ', 'VỎ'], skip: ['NÉ', 'GẮT'], shuffle: ['XÀO', 'BÀI'], future: ['SOI', 'KÈO'],
  alter: ['CẢI', 'MỆNH'], favor: ['XIN', 'VÍA'], bottom: ['MÓC', 'ĐÁY'], nope: ['ĐÉO!', ''], cat1: ['MÈO', 'Ú'], cat2: ['MÈO', 'MƯỚP'],
  cat3: ['TAM', 'THỂ'], cat4: ['MÈO', 'XIÊM'], cat5: ['MÈO', 'BÔNG'],
};
const PAW_COL = { cat1: '#e67a12', cat2: '#5e6672', cat3: '#ff9a3c', cat4: '#6b4a3a', cat5: '#a06cd5' };
const paw = (c, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true"><g fill="${c}"><ellipse cx="12" cy="15.5" rx="5.6" ry="4.6"/><circle cx="5.4" cy="9.6" r="2.3"/><circle cx="9.4" cy="5.8" r="2.3"/><circle cx="14.6" cy="5.8" r="2.3"/><circle cx="18.6" cy="9.6" r="2.3"/></g></svg>`;
function artFor(t) {
  if (t === 'bomb') return bombSVG();
  if (t.startsWith('cat')) return catSVG(t);
  if (t === 'defuse') return `<div class="emo">${ICON[t]}</div><div class="emo2">🐟</div>`;
  return `<div class="emo">${ICON[t] || '❓'}</div>`;
}
const badge = t => t === 'bomb' ? '💣' : t.startsWith('cat') ? paw(PAW_COL[t]) : ICON[t];
export function cardHTML(c, cls = '', attrs = '') {
  if (!c) return `<div class="mcard back ${cls}" ${attrs}><i class="tape"></i><div class="back-art">🐾</div></div>`;
  const t = c.t || c; const two = TWO[t] || [CARD[t].name, ''];
  return `<div class="mcard t-${t} ${t.startsWith('cat') ? 'is-cat' : 'is-act'} ${cls}" ${c.id ? `data-id="${c.id}"` : ''} data-t="${t}" ${attrs}>
    <i class="mc-pat"></i><span class="mc-badge">${badge(t)}</span><div class="mc-art">${artFor(t)}</div>
    <div class="mc-name"><span class="full">${CARD[t].name}</span><span class="two">${two[0]}${two[1] ? '<br>' + two[1] : ''}</span></div><div class="mc-desc">${SHORT[t]}</div></div>`;
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
