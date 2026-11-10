// Hình lá bài & chân dung: tranh cổ thuộc phạm vi công cộng (Wikimedia Commons, xem img/CREDITS.md) trong img/,
// đè lên lớp SVG tự vẽ (khung màu theo nước, chữ Hán thư pháp, vật biểu tượng) – ảnh lỗi thì tự rơi về SVG.
import { GENERALS, KINGDOMS, CARD_INFO, SUIT_SYMBOL, rankLabel, cardName, isRed, infoOf, artKey } from './cards.js?v=7';
import { IMG } from './images.js?v=9';
import { weaponSVG } from './weapons.js?v=7';
// biểu tượng nhỏ: binh khí/trang bị vẽ SVG đúng hình, còn lại emoji
export function emoOf(type) { const w = weaponSVG(type, 'wi'); return w || (CARD_INFO[type] ? CARD_INFO[type].emo : ''); }
const imgTag = (key, cls) => IMG[key] ? `<img class="${cls}" src="img/${key}.jpg?v=${IMG[key].v || 6}" alt="" draggable="false" loading="lazy" style="object-position:${IMG[key].pos || '50% 30%'}" onerror="this.remove()">` : '';

let uid = 0;
// mây cát tường (tường vân) – nét cuộn đơn giản
const CLOUD = 'M10 30 q8 -14 20 -4 q6 -12 18 -2 q10 -2 8 10 q-6 8 -16 2 q-6 8 -16 0 q-12 4 -14 -6 z';
export function portrait(gid, opts = {}) {
  const g = GENERALS[gid]; if (!g) return blankPortrait();
  const pic = imgTag('g-' + gid, 'pimg');
  if (!pic) return svgPortrait(gid);
  const k = KINGDOMS[g.kingdom];
  return `<span class="portrait pwrap" style="--kc:${k.color}">${svgPortrait(gid)}${pic}<i class="pseal">${k.han}</i></span>`;
}
function svgPortrait(gid) {
  const g = GENERALS[gid];
  const k = KINGDOMS[g.kingdom]; const id = 'pg' + (uid++);
  const fem = g.gender === 'f';
  return `<svg class="portrait" viewBox="0 0 100 100" aria-label="${g.name}">
  <defs>
    <radialGradient id="${id}b" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${k.color}" stop-opacity=".95"/><stop offset="1" stop-color="${k.dark}"/></radialGradient>
    <linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f1e2c2"/></linearGradient>
  </defs>
  <rect width="100" height="100" rx="14" fill="url(#${id}b)"/>
  <g fill="#fff" opacity=".13"><path d="${CLOUD}" transform="translate(-4 2) scale(.9)"/><path d="${CLOUD}" transform="translate(52 64) scale(.8)"/><path d="${CLOUD}" transform="translate(56 -6) scale(.6)"/></g>
  <circle cx="50" cy="47" r="31" fill="url(#${id}m)" stroke="${fem ? '#f3b6c8' : '#f6d78a'}" stroke-width="3"/>
  <circle cx="50" cy="47" r="26.5" fill="none" stroke="${k.color}" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="2 3"/>
  <text x="50" y="62" text-anchor="middle" font-family="'LXGW WenKai TC','KaiTi','STKaiti',serif" font-weight="700" font-size="42" fill="#2b211c">${g.han}</text>
  <rect x="5" y="5" width="20" height="20" rx="4" fill="#c8322a"/><text x="15" y="20.5" text-anchor="middle" font-family="'LXGW WenKai TC',serif" font-weight="700" font-size="15" fill="#fff4e0">${k.han}</text>
  <circle cx="80" cy="80" r="14" fill="#fffaf0" stroke="${k.dark}" stroke-width="2"/>${g.wpn ? `<svg x="68" y="68" width="24" height="24" viewBox="0 0 100 100">${weaponSVG(g.wpn).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>` : `<text x="80" y="86" text-anchor="middle" font-size="16">${g.emo}</text>`}
  ${fem ? '<text x="20" y="90" font-size="13">🌸</text>' : ''}
</svg>`;
}
export function blankPortrait() {
  return `<svg class="portrait" viewBox="0 0 100 100"><rect width="100" height="100" rx="14" fill="#d9ccb4"/><circle cx="50" cy="47" r="31" fill="#f4ecdc"/><text x="50" y="62" text-anchor="middle" font-size="40" fill="#a89a80">?</text></svg>`;
}

const KIND_TAG = { basic: 'Cơ bản', trick: 'Cẩm nang', delay: 'Trì hoãn', weapon: 'Vũ khí', armor: 'Giáp', plus: 'Ngựa +1', minus: 'Ngựa −1' };
export function kindTag(type) { return KIND_TAG[CARD_INFO[type].kind]; }
export function kindClass(type) { const k = CARD_INFO[type].kind; return k === 'basic' ? 'k-basic' : k === 'trick' || k === 'delay' ? 'k-trick' : 'k-equip'; }
// biểu tượng tác dụng dưới hình
const RNG = n => `<i class="ic">🎯${n}</i>`;
const ICONS = {
  sat: '<i class="ic">🎯tầm</i><i class="ic">−1❤️</i>', ne: '<i class="ic">🛡️né</i>', dao: '<i class="ic">❤️+1</i>',
  wuzhong: '<i class="ic">+2🂠</i>', guohe: '<i class="ic">👤🗑️</i>', shunshou: '<i class="ic">📏1</i><i class="ic">✋</i>', juedou: '<i class="ic">👤⚔️</i>',
  nanman: '<i class="ic">👥🗡️</i>', wanjian: '<i class="ic">👥💨</i>', taoyuan: '<i class="ic">👥❤️</i>', wugu: '<i class="ic">👥🂠</i>',
  jiedao: '<i class="ic">👤→👤</i>', wuxie: '<i class="ic">🚫</i>', lebu: '<i class="ic red">♥</i><i class="ic">⏸</i>', shandian: '<i class="ic">♠2–9</i><i class="ic">−3</i>',
  jiu: '<i class="ic">⚔️+1</i><i class="ic">🆘❤️</i>', hoasat: '<i class="ic">🎯tầm</i><i class="ic">🔥−1</i>', loisat: '<i class="ic">🎯tầm</i><i class="ic">🌩️−1</i>',
  huogong: '<i class="ic">👁️🂠</i><i class="ic">🔥</i>', tiesuo: '<i class="ic">⛓️×2</i><i class="ic">↺🂠</i>', bingliang: '<i class="ic">📏1</i><i class="ic">♣</i><i class="ic">⏸🂠</i>',
  tengjia: '<i class="ic">🛡️AoE</i><i class="ic">🔥+1</i>', baiyin: '<i class="ic">≤1❤️</i>',
  bagua: '<i class="ic red">♥♦</i><i class="ic">=💨</i>', renwang: '<i class="ic">♠♣🚫</i>', plus: '<i class="ic">🐎+1</i>', minus: '<i class="ic">🏇−1</i>',
};
export function iconsFor(type) { const i = CARD_INFO[type]; if (ICONS[type]) return ICONS[type]; if (i.kind === 'weapon') return RNG(i.range); return ''; }
// tên gọi tắt quen miệng (hiện trên tay bài điện thoại – lá nhỏ); bấm giữ lá vẫn xem tên đầy đủ
const SHORT = { wuzhong: 'Vô trung', guohe: 'Quá hà', shunshou: 'Thuận thủ', nanman: 'Nam man', wanjian: 'Vạn tiễn', taoyuan: 'Đào viên', wugu: 'Ngũ cốc',
  jiedao: 'Tá đao', wuxie: 'Vô giải', tiesuo: 'Liên hoàn', lebu: 'Lạc bất', bingliang: 'Binh lương', zhuge: 'Liên nỏ', cixiong: 'Song kiếm', qinggang: 'Thanh cương',
  hanbing: 'Băng phách', qinglong: 'Thanh long', zhangba: 'Xà mâu', guanshi: 'Quán thạch', fangtian: 'Hoạ kích', qilin: 'Kỳ lân', zhuque: 'Vũ phiến', guding: 'Cổ đĩnh',
  bagua: 'Bát quái', renwang: 'Nhân vương', baiyin: 'Sư tử' };
export function cardHTML(c, size = '', extra = '') {
  if (!c) return backHTML(size);
  const info = infoOf(c); const red = isRed(c); const key = artKey(c);
  return `<div class="qcard ${kindClass(c.type)} ${size} ${extra}${c.el ? ' el-' + c.el : ''}" data-cid="${c.id}">
    <div class="ctop"><span class="idx${red ? ' red' : ''}">${rankLabel(c.rank)}${SUIT_SYMBOL[c.suit]}</span><span class="ktag">${info.kind === 'weapon' ? 'Tầm ' + info.range : KIND_TAG[info.kind]}</span></div>
    <div class="art">${weaponSVG(key, 'wart') || imgTag('c-' + key, 'cimg')}<span class="han">${info.han}</span><span class="emo">${info.emo}</span></div>
    <div class="cicons">${iconsFor(key)}</div>
    <div class="cname${SHORT[c.type] && !c.v ? ' hs' : ''}"><span class="cn-full">${cardName(c)}</span>${SHORT[c.type] && !c.v ? `<span class="cn-short">${SHORT[c.type]}</span>` : ''}</div></div>`;
}
export function backHTML(size = '') { return `<div class="qcard back ${size}"><div class="back-in"><span>殺</span></div></div>`; }
// chip nhỏ cho trang bị / phán định
export function chipHTML(c, as) {
  const info = as ? CARD_INFO[as] : infoOf(c);
  return `<span class="chip ${kindClass(as || c.type)}${isRed(c) ? ' red' : ''}" data-cid="${c.id}" title="${info.name}"><b>${emoOf(as || c.type)}</b><span class="cn">${as ? info.name : cardName(c)}</span><small>${SUIT_SYMBOL[c.suit]}${rankLabel(c.rank)}</small></span>`;
}
// lá tướng to (chọn tướng / xem chi tiết)
export function generalCardHTML(gid, extra = '') {
  const g = GENERALS[gid]; const k = KINGDOMS[g.kingdom];
  return `<div class="gcard ${extra}" data-gid="${gid}" style="--kc:${k.color};--kd:${k.dark}">
    <div class="gc-top"><span class="gc-k">${k.han} ${k.name}</span><span class="gc-hp">${'<i></i>'.repeat(g.hp)}</span></div>
    <div class="gc-art">${portrait(gid)}</div>
    <div class="gc-name">${g.name}${g.lord ? ' <span class="gc-lord">Chúa</span>' : ''}</div>
    <div class="gc-tag">${g.tag}</div></div>`;
}
