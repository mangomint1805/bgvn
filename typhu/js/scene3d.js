// Bàn cờ 3D 40 ô bằng Three.js – mọi mô hình (bàn, ô, nhà, landmark, xúc xắc, quân cờ, thành phố) đều dựng bằng code.
import * as THREE from '../../shared/lib/three.module.min.js';
import { OrbitControls } from '../../shared/lib/OrbitControls.js';
import { buildAvatar } from '../../shared/js/avatar3d.js';
import { buildCity } from './city.js?v=47';

export const FONT = '"Be Vietnam Pro", system-ui, sans-serif', TITLE = '"Baloo 2", "Be Vietnam Pro", system-ui, sans-serif';
const TW = 1, TD = 1.6, CW = 1.6, L = 2 * CW + 9 * TW, TILE_H = 0.12;
const col = c => new THREE.Color(c);
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.75, metalness: 0, ...o });
const fmt = k => { const a = Math.abs(Math.round(k)); return (k < 0 ? '-' : '') + (a >= 1000 ? (a / 1000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',') + 'M' : a + 'K'); };
const ease = t => t * t * (3 - 2 * t), easeOut = t => 1 - Math.pow(1 - t, 3);
export const QUALITY = { low: { aa: false, pr: 1, shadow: 0, city: 0, tex: 150 }, med: { aa: true, pr: 1.5, shadow: 1024, city: 1, tex: 210 }, high: { aa: true, pr: 2, shadow: 2048, city: 2, tex: 256 } };
export const THEMES = {
  day: { name: 'Ngày nắng', top: '#4fa3e8', hor: '#cdeeff', sun: '#fff1d6', sunI: 2.3, sunPos: [-10, 18, 8], hs: '#e3f4ff', hg: '#6b8f4a', hI: 1.05, lamp: 0, night: 0, exp: 1.0, stars: false },
  sunset: { name: 'Hoàng hôn', top: '#4b4d9a', hor: '#ffad7a', sun: '#ffb070', sunI: 2.1, sunPos: [-16, 7, -10], hs: '#ffd7b8', hg: '#5a4a6a', hI: 0.95, lamp: 0.6, night: 0.45, exp: 1.0, stars: false },
  night: { name: 'Đêm Sài Gòn', top: '#060b24', hor: '#26306a', sun: '#8fa3ff', sunI: 0.35, sunPos: [8, 16, -6], hs: '#4a5aa0', hg: '#0e0e1a', hI: 0.42, lamp: 1.7, night: 1, exp: 1.0, stars: true },
};

// ---------- hình học ô: cellRect trên bàn (x,y trong [0,L]) + góc xoay mặt chữ ----------
export function cellInfo(i) {
  const side = Math.floor(i / 10), k = i % 10, theta = [0, -Math.PI / 2, Math.PI, Math.PI / 2][side];
  let cx, cy, w, d;
  if (k === 0) { w = d = CW; [cx, cy] = [[L - CW / 2, L - CW / 2], [CW / 2, L - CW / 2], [CW / 2, CW / 2], [L - CW / 2, CW / 2]][side]; }
  else {
    w = TW; d = TD; const off = CW + (k - 1) * TW + TW / 2;
    [cx, cy] = [[L - off, L - TD / 2], [TD / 2, L - off], [off, TD / 2], [L - TD / 2, off]][side];
  }
  return { side, corner: k === 0, theta, x: cx - L / 2, z: cy - L / 2, w, d };
}
// toạ độ cục bộ của ô (u: ngang, v: sâu, +v hướng ra mép ngoài) → thế giới
function local(i, u, v) { const c = cellInfo(i), s = Math.sin(c.theta), co = Math.cos(c.theta); return new THREE.Vector3(c.x + u * co + v * s, 0, c.z - u * s + v * co); }
export const camAz = i => cellInfo(i).theta + (i % 10 === 0 ? Math.PI / 4 : 0);

// ---------- vẽ chữ ----------
function wrap(c, text, maxW) { const words = text.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } lines.push(cur); return lines; }
function fitLines(c, text, maxW, maxLines, size, weight = 800, family = FONT) {
  let s = size, lines;
  for (; s > 8; s -= 2) { c.font = `${weight} ${s}px ${family}`; lines = wrap(c, text, maxW); if (lines.length <= maxLines && lines.every(l => c.measureText(l).width <= maxW)) break; }
  return { lines, size: s };
}
function drawLines(c, lines, x, y, size, lh = 1.12) { const h = size * lh; lines.forEach((l, k) => c.fillText(l, x, y + (k - (lines.length - 1) / 2) * h)); }
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
function icon(c, kind, x, y, s, name) {
  c.save(); c.translate(x, y); c.scale(s / 100, s / 100); c.lineJoin = 'round';
  if (kind === 'station') { // xe buýt
    c.fillStyle = '#2f9e44'; rr(c, -46, -34, 92, 62, 12); c.fill(); c.fillStyle = '#d7f5ff'; for (let k = 0; k < 3; k++) { rr(c, -38 + k * 27, -26, 22, 20, 4); c.fill(); }
    c.fillStyle = '#ffd54a'; c.fillRect(-46, 4, 92, 8); c.fillStyle = '#24314d'; for (const wx of [-26, 26]) { c.beginPath(); c.arc(wx, 30, 11, 0, 7); c.fill(); }
  } else if (kind === 'power') { c.fillStyle = '#ffc928'; c.strokeStyle = '#b77d00'; c.lineWidth = 5; c.beginPath(); c.moveTo(10, -50); c.lineTo(-30, 8); c.lineTo(-4, 8); c.lineTo(-14, 50); c.lineTo(30, -10); c.lineTo(4, -10); c.closePath(); c.fill(); c.stroke(); }
  else if (kind === 'water') { c.fillStyle = '#3aa0ff'; c.strokeStyle = '#1565c0'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -50); c.bezierCurveTo(30, -10, 40, 10, 38, 22); c.arc(0, 22, 38, 0, Math.PI); c.bezierCurveTo(-40, 10, -30, -10, 0, -50); c.fill(); c.stroke(); c.fillStyle = '#fff8'; c.beginPath(); c.ellipse(-14, 18, 7, 13, 0.3, 0, 7); c.fill(); }
  else if (kind === 'chest') { // túi tiền
    c.fillStyle = '#b07a3a'; c.beginPath(); c.ellipse(0, 18, 44, 36, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(-18, -18); c.lineTo(18, -18); c.lineTo(28, -44); c.lineTo(-28, -44); c.closePath(); c.fill();
    c.fillStyle = '#ffd54a'; c.fillRect(-24, -24, 48, 9); c.font = `900 46px ${TITLE}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('₫', 0, 22);
  } else if (kind === 'tax') { c.fillStyle = '#fff'; c.strokeStyle = '#8d99ae'; c.lineWidth = 5; rr(c, -32, -44, 64, 88, 8); c.fill(); c.stroke(); c.fillStyle = '#c0c8d6'; for (let k = 0; k < 4; k++) c.fillRect(-20, -28 + k * 16, 40 - (k % 2) * 14, 6); c.fillStyle = '#e53935'; c.beginPath(); c.arc(16, 30, 16, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = `900 22px ${TITLE}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('%', 16, 31); }
  c.restore();
}
function tileCanvas(i, tile, st, S) {
  const ci = cellInfo(i), W = Math.round(ci.w * S), H = Math.round(ci.d * S);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const BG = { start: '#fff1c9', jail: '#ffe7cc', parking: '#e5f3ff', gotojail: '#ffe2e2', chance: '#fff0ee', chest: '#fff7d6', tax: '#f3f4f8' };
  c.fillStyle = BG[tile.type] || '#fffaf0'; c.fillRect(0, 0, W, H);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const ink = '#24314d', muted = '#7a8399', u = S / 100;
  if (!ci.corner) {
    const band = H * 0.2;
    if (tile.type === 'city') { c.fillStyle = st.groupColor; c.fillRect(0, 0, W, band); c.fillStyle = '#ffffff55'; c.fillRect(0, band - 4 * u / 2, W, 2 * u / 2); }
    if (tile.type === 'station') { c.fillStyle = '#24314d'; c.fillRect(0, 0, W, band * 0.75); c.fillStyle = '#fff'; c.font = `800 ${18 * u}px ${FONT}`; c.fillText('BẾN XE', W / 2, band * 0.4); }
    let name = tile.name, cy = H * 0.45;
    if (tile.type === 'station') { icon(c, 'station', W / 2, H * 0.36, 52 * u); name = name.replace('Bến xe ', ''); cy = H * 0.6; }
    if (tile.type === 'utility') { icon(c, /Điện/.test(name) ? 'power' : 'water', W / 2, H * 0.3, 54 * u); c.fillStyle = muted; c.font = `700 ${12 * u}px ${FONT}`; c.fillText('CÔNG TY', W / 2, H * 0.52); name = name.replace('Công ty ', ''); cy = H * 0.62; }
    if (tile.type === 'chance') { c.fillStyle = '#e53935'; c.font = `800 ${96 * u}px ${TITLE}`; c.fillText('?', W / 2, H * 0.42); c.strokeStyle = '#ffffff'; c.lineWidth = 3 * u; c.strokeText('?', W / 2, H * 0.42); c.fillText('?', W / 2, H * 0.42); name = 'CƠ HỘI'; cy = H * 0.78; }
    if (tile.type === 'chest') { icon(c, 'chest', W / 2, H * 0.4, 66 * u); name = 'KHÍ VẬN'; cy = H * 0.78; }
    if (tile.type === 'tax') { icon(c, 'tax', W / 2, H * 0.36, 58 * u); cy = H * 0.66; }
    c.fillStyle = tile.type === 'chance' ? '#c62828' : tile.type === 'chest' ? '#a86b00' : ink;
    const f = fitLines(c, name.toUpperCase() === name ? name : name, W * 0.9, tile.type === 'city' ? 3 : 2, (tile.type === 'city' ? 19 : 17) * u, 800);
    if (tile.type === 'city') cy = H * 0.44;
    drawLines(c, f.lines, W / 2, cy, f.size);
    if (tile.type === 'city' && tile.area) { c.fillStyle = muted; const fa = fitLines(c, tile.area, W * 0.9, 1, 11 * u, 600); drawLines(c, fa.lines, W / 2, H * 0.66, fa.size); }
    // giá / chủ sở hữu
    const py = H * 0.84, ph = H * 0.13;
    if (tile.price) {
      if (st.owner) {
        c.fillStyle = st.mort ? '#9aa3b5' : st.owner; rr(c, W * 0.07, py - ph / 2, W * 0.86, ph, ph / 2.4); c.fill();
        c.fillStyle = '#fff'; c.font = `800 ${(st.mort ? 12 : 15) * u}px ${FONT}`; c.fillText(st.mort ? 'THẾ CHẤP' : typeof st.rent === 'string' ? st.rent : 'Thuê ' + fmt(st.rent), W / 2, py + u);
      } else { c.fillStyle = ink; c.font = `800 ${17 * u}px ${FONT}`; c.fillText(fmt(tile.price), W / 2, py); }
    } else if (tile.type === 'tax') { c.fillStyle = '#c62828'; c.font = `800 ${15 * u}px ${FONT}`; c.fillText('Trả ' + fmt(tile.amount), W / 2, py); }
    if (st.mort) { c.save(); c.translate(W / 2, H * 0.45); c.rotate(-0.5); c.strokeStyle = '#d32f2fcc'; c.lineWidth = 4 * u; rr(c, -W * 0.46, -16 * u, W * 0.92, 32 * u, 6 * u); c.stroke(); c.fillStyle = '#d32f2fcc'; c.font = `800 ${15 * u}px ${FONT}`; c.fillText('THẾ CHẤP', 0, 1); c.restore(); c.fillStyle = '#00000018'; c.fillRect(0, 0, W, H); }
  } else {
    // ô góc: chữ xoay chéo hướng về góc ngoài (dưới-phải ảnh)
    const t = tile.type;
    if (t === 'jail') {
      const s = W * 0.66; c.fillStyle = '#ff9a3d'; c.fillRect(0, 0, s, s); c.strokeStyle = '#24314d'; c.lineWidth = 7 * u / 1.6; for (let k = 1; k < 6; k++) { c.beginPath(); c.moveTo(k * s / 6, 4); c.lineTo(k * s / 6, s - 4); c.stroke(); }
      c.save(); c.translate(s / 2, s / 2); c.rotate(-Math.PI / 4); c.fillStyle = '#fff'; c.strokeStyle = '#24314d'; c.lineWidth = 8 * u / 1.6; c.font = `800 ${38 * u}px ${TITLE}`; c.strokeText('Ở TÙ', 0, 6 * u); c.fillText('Ở TÙ', 0, 6 * u); c.restore();
      const fit = (txt, maxW, sz) => { c.font = `800 ${sz}px ${FONT}`; const w = c.measureText(txt).width; if (w > maxW) c.font = `800 ${sz * maxW / w}px ${FONT}`; };
      const strip = W - s; c.fillStyle = ink;
      fit('GHÉ THĂM', s * 0.9, strip * 0.42); c.fillText('GHÉ THĂM', s / 2, s + strip / 2);
      c.save(); c.translate(s + strip / 2, s / 2); c.rotate(-Math.PI / 2); fit('GHÉ THĂM', s * 0.9, strip * 0.42); c.fillText('GHÉ THĂM', 0, 0); c.restore();
      c.fillStyle = '#ff9a3d'; c.beginPath(); c.arc(s + strip / 2, s + strip / 2, strip * 0.3, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = `800 ${strip * 0.34}px ${FONT}`; c.fillText('👋', s + strip / 2, s + strip / 2 + 1);
    } else {
      c.save(); c.translate(W / 2, H / 2); c.rotate(-Math.PI / 4);
      if (t === 'start') {
        c.fillStyle = '#e53935'; c.font = `800 ${40 * u}px ${TITLE}`; c.fillText('BẮT ĐẦU', 0, -14 * u);
        c.fillStyle = ink; c.font = `800 ${17 * u}px ${FONT}`; c.fillText('Nhận ' + fmt(200), 0, 20 * u);
      } else if (t === 'parking') {
        c.fillStyle = '#1e6fd9'; rr(c, -28 * u, -62 * u, 56 * u, 56 * u, 10 * u); c.fill(); c.fillStyle = '#fff'; c.font = `800 ${46 * u}px ${TITLE}`; c.fillText('P', 0, -32 * u);
        c.fillStyle = ink; c.font = `800 ${24 * u}px ${TITLE}`; c.fillText('BÃI ĐẬU XE', 0, 18 * u); c.fillStyle = '#2f9e44'; c.font = `800 ${15 * u}px ${FONT}`; c.fillText('✈️ DU LỊCH', 0, 44 * u);
      } else if (t === 'gotojail') {
        c.fillStyle = '#e53935'; rr(c, -32 * u, -60 * u, 30 * u, 22 * u, 8 * u); c.fill(); c.fillStyle = '#1e6fd9'; rr(c, 2 * u, -60 * u, 30 * u, 22 * u, 8 * u); c.fill(); c.fillStyle = '#24314d'; c.fillRect(-36 * u, -40 * u, 72 * u, 9 * u);
        c.fillStyle = '#c62828'; c.font = `800 ${40 * u}px ${TITLE}`; c.fillText('VÀO TÙ', 0, 0); c.fillStyle = ink; c.font = `700 ${13 * u}px ${FONT}`; c.fillText('Đi thẳng vào tù,', 0, 28 * u); c.fillText('không qua Bắt đầu', 0, 44 * u);
      }
      c.restore();
      if (t === 'start') { // mũi tên chỉ hướng đi
        c.fillStyle = '#e53935'; const y = H * 0.88, x1 = W * 0.85, x0 = W * 0.18; c.fillRect(x0 + 18 * u, y - 7 * u, x1 - x0 - 18 * u, 14 * u); c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + 26 * u, y - 20 * u); c.lineTo(x0 + 26 * u, y + 20 * u); c.closePath(); c.fill();
      }
    }
  }
  c.strokeStyle = '#00000022'; c.lineWidth = 3; c.strokeRect(1.5, 1.5, W - 3, H - 3);
  return cv;
}
function plazaCanvas(size) {
  const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d');
  const gr = c.createRadialGradient(S / 2, S / 2, 80, S / 2, S / 2, S * 0.75); gr.addColorStop(0, '#fffdf4'); gr.addColorStop(1, '#f3e7c9'); c.fillStyle = gr; c.fillRect(0, 0, S, S);
  c.strokeStyle = '#d8c79e'; c.lineWidth = 10; c.strokeRect(16, 16, S - 32, S - 32); c.strokeStyle = '#e53935'; c.lineWidth = 4; c.strokeRect(32, 32, S - 64, S - 64);
  const bill = (x, y, r, s2 = 1, colr = '#7ccf8a') => { c.save(); c.translate(x, y); c.rotate(r); c.scale(s2, s2); c.fillStyle = colr; rr(c, -78, -36, 156, 72, 8); c.fill(); c.strokeStyle = '#ffffffaa'; c.lineWidth = 5; rr(c, -68, -26, 136, 52, 6); c.stroke(); c.fillStyle = '#ffffffdd'; c.font = `800 40px ${TITLE}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('500K', 0, 3); c.restore(); };
  bill(210, 300, -0.5, 1, '#5cb8e6'); bill(330, 210, 0.35, 0.8, '#f08aa8'); bill(760, 820, 0.6, 0.9, '#7ccf8a'); bill(850, 690, -0.3, 0.75, '#f6b24a'); bill(620, 180, 0.2, 0.7, '#7ccf8a'); bill(160, 620, 0.9, 0.7, '#f6b24a');
  c.save(); c.translate(700, 690); c.scale(0.8, 0.8); c.fillStyle = '#8a5a30'; c.beginPath(); c.ellipse(0, 40, 118, 104, 0, 0, 7); c.fill(); c.fillStyle = '#a8713e'; c.beginPath(); c.ellipse(-18, 22, 96, 86, 0, 0, 7); c.fill();
  c.fillStyle = '#8a5a30'; c.beginPath(); c.moveTo(-45, -55); c.lineTo(45, -55); c.lineTo(28, -96); c.lineTo(-28, -96); c.closePath(); c.fill(); c.fillStyle = '#ffd54a'; c.fillRect(-56, -64, 112, 16);
  c.fillStyle = '#ffd54a'; c.font = `800 120px ${TITLE}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('₫', -8, 44); c.restore();
  c.save(); c.translate(530, 600); c.rotate(-Math.PI / 4); c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `800 128px ${TITLE}`; c.lineWidth = 22; c.strokeStyle = '#ffffff'; c.lineJoin = 'round'; c.strokeText('CỜ TỶ PHÚ!', 0, 0); c.fillStyle = '#d81b2a'; c.fillText('CỜ TỶ PHÚ!', 0, 0);
  c.font = `800 60px ${TITLE}`; c.lineWidth = 12; c.strokeText('SÀI GÒN', 0, 92); c.fillStyle = '#24314d'; c.fillText('SÀI GÒN', 0, 92); c.restore();
  const pad = (x, y, color, text) => { c.save(); c.translate(x, y); c.rotate(-Math.PI / 4); c.strokeStyle = color; c.lineWidth = 8; c.setLineDash([22, 14]); c.strokeRect(-120, -84, 240, 168); c.setLineDash([]); c.fillStyle = color; c.font = `800 46px ${TITLE}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, text === 'CƠ HỘI' ? -118 : 124); c.restore(); };
  pad(250, 770, '#d81b2a', 'CƠ HỘI'); pad(775, 255, '#c58f00', 'KHÍ VẬN');
  c.fillStyle = '#8a7a5a'; c.font = `700 22px ${FONT}`; c.textAlign = 'center'; c.fillText('Bản fan-made phi thương mại · BGVN', S / 2, S - 54);
  return cv;
}
function cardCanvas(deck) {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 220; const c = cv.getContext('2d');
  c.fillStyle = deck === 'chest' ? '#ffcf3a' : '#e53935'; rr(c, 0, 0, 320, 220, 22); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 10; rr(c, 14, 14, 292, 192, 14); c.stroke();
  c.fillStyle = deck === 'chest' ? '#5a3d00' : '#fff'; c.font = `800 52px ${TITLE}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(deck === 'chest' ? 'KHÍ VẬN' : 'CƠ HỘI', 160, 118);
  return cv;
}
function dieCanvas(n) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#fffdf8'; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#e6dfd0'; c.lineWidth = 8; rr(c, 4, 4, 120, 120, 22); c.stroke();
  const P = { 1: [[64, 64]], 2: [[34, 34], [94, 94]], 3: [[30, 30], [64, 64], [98, 98]], 4: [[34, 34], [94, 34], [34, 94], [94, 94]], 5: [[32, 32], [96, 32], [64, 64], [32, 96], [96, 96]], 6: [[34, 30], [94, 30], [34, 64], [94, 64], [34, 98], [94, 98]] };
  c.fillStyle = n === 1 || n === 4 ? '#e53935' : '#24314d'; for (const [x, y] of P[n]) { c.beginPath(); c.arc(x, y, n === 1 ? 16 : 12, 0, 7); c.fill(); }
  return cv;
}
const tex = cv => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
function textSprite(text, bg, fg = '#fff', h = 0.4) {
  const cv = document.createElement('canvas'), c = cv.getContext('2d'), f = 54; c.font = `800 ${f}px ${FONT}`;
  const w = Math.ceil(c.measureText(text).width) + 40; cv.width = w; cv.height = f + 30; c.font = `800 ${f}px ${FONT}`;
  c.fillStyle = bg; rr(c, 0, 0, w, cv.height, cv.height / 2); c.fill(); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, cv.height / 2 + 3);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(cv), depthWrite: false, depthTest: false, transparent: true })); sp.scale.set(h * w / cv.height, h, 1); sp.renderOrder = 20; return sp;
}
// mặt xúc xắc: thứ tự vật liệu BoxGeometry [+x,-x,+y,-y,+z,-z]
const DIE_FACES = [2, 5, 1, 6, 3, 4];
const DIE_ROT = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [0, 0, Math.PI / 2], 5: [0, 0, -Math.PI / 2], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0] };

export class Board3D {
  constructor(el, o = {}) {
    this.el = el; this.o = o; this.tiles = o.tiles; this.groups = o.groups; this.anims = []; this.tileObjs = []; this.bld = {}; this.pawns = {}; this.pawnTile = {}; this.jailed = {}; this.moving = new Set();
    this.q = QUALITY[o.quality] ? o.quality : 'med'; this.themeName = THEMES[o.theme] ? o.theme : 'day'; this.fxOn = o.effects !== false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220);
    this.camera.position.set(0, 20, 16);
    this.cam = { mode: 'overview', focus: null, az: 0, pol: 0.6, dist: 24, target: new THREE.Vector3(), cur: null, lastUser: 0 };
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.initRenderer();
    this.buildLights(); this.buildSky(); this.buildBoard(); this.buildDice(); this.buildCityLayer(); this.fwInit();
    this.setTheme(this.themeName);
    this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el); this.resize();
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());
  }
  // ---------- renderer + điều khiển (dựng lại khi đổi chất lượng) ----------
  initRenderer() {
    const Q = QUALITY[this.q];
    if (this.renderer) { this.renderer.setAnimationLoop(null); this.renderer.dispose(); this.renderer.domElement.remove(); this.controls.dispose(); }
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: Q.aa, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(Q.pr, devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = !!Q.shadow; r.shadowMap.type = Q.shadow > 1024 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.el.appendChild(r.domElement); r.domElement.style.touchAction = 'none';
    const ctl = this.controls = new OrbitControls(this.camera, r.domElement);
    Object.assign(ctl, { enableDamping: true, dampingFactor: 0.09, minPolarAngle: 0.15, maxPolarAngle: 1.22, minDistance: 4, maxDistance: 40, enablePan: true, screenSpacePanning: false, zoomSpeed: 0.9, rotateSpeed: 0.7 });
    ctl.target.copy(this.cam.target);
    ctl.addEventListener('start', () => { this.cam.mode = 'free'; this.cam.pinned = false; this.cam.lastUser = performance.now(); this.o.onCamera && this.o.onCamera('free'); });
    ctl.addEventListener('change', () => { if (this.cam.mode === 'free') this.cam.lastUser = performance.now(); });
    let down = null;
    r.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    r.domElement.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 7) this.click(e); down = null; });
    if (this.sun) { this.sun.shadow.mapSize.set(Q.shadow || 512, Q.shadow || 512); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
    if (this.clock) { r.setAnimationLoop(() => this.frame()); this.resize(); }
  }
  setQuality(q) {
    if (!QUALITY[q] || q === this.q) return; this.q = q; this.initRenderer();
    this.buildCityLayer(); this.refreshTiles(true); this.setTheme(this.themeName);
  }
  setEffects(on) { this.fxOn = !!on; }
  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x666666, 1); this.scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xffffff, 2); sun.castShadow = true;
    const Q = QUALITY[this.q]; sun.shadow.mapSize.set(Q.shadow || 512, Q.shadow || 512);
    Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 60 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    this.scene.add(sun); this.scene.add(sun.target);
    this.fill = new THREE.DirectionalLight(0xffe6c4, 0); this.scene.add(this.fill); this.scene.add(this.fill.target);
    this.lamp = new THREE.PointLight(0xffd9a0, 0, 26, 1.2); this.lamp.position.set(0, 7, 0); this.scene.add(this.lamp);
    this.siren = [new THREE.PointLight(0xff2020, 0, 6), new THREE.PointLight(0x2060ff, 0, 6)]; this.siren.forEach(l => this.scene.add(l));
  }
  buildSky() {
    const g = new THREE.SphereGeometry(120, 24, 16), cols = []; const pos = g.attributes.position;
    for (let k = 0; k < pos.count; k++) cols.push(1, 1, 1);
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); this.scene.add(this.sky);
    const sp = []; for (let k = 0; k < 400; k++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 1.2 + 0.15; sp.push(Math.cos(a) * Math.cos(b) * 110, Math.sin(b) * 110, Math.sin(a) * Math.cos(b) * 110); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, fog: false, transparent: true, opacity: 0.85 })); this.scene.add(this.stars);
    this.scene.fog = new THREE.Fog(0xffffff, 45, 110);
  }
  setTheme(name) {
    const T = THEMES[name] || THEMES.day; this.themeName = THEMES[name] ? name : 'day';
    const top = col(T.top), hor = col(T.hor), pos = this.sky.geometry.attributes.position, c = this.sky.geometry.attributes.color;
    for (let k = 0; k < pos.count; k++) { const y = Math.max(0, pos.getY(k) / 120); const m = hor.clone().lerp(top, Math.pow(y, 0.6)); c.setXYZ(k, m.r, m.g, m.b); }
    c.needsUpdate = true; this.scene.fog.color.copy(hor);
    this.sun.color.set(T.sun); this.sun.intensity = T.sunI; this.sun.position.set(...T.sunPos); this.hemi.color.set(T.hs); this.hemi.groundColor.set(T.hg); this.hemi.intensity = T.hI;
    this.lamp.intensity = T.lamp * 12; this.fill.intensity = T.night * 0.9; this.renderer.toneMappingExposure = T.exp; this.stars.visible = T.stars;
    if (this.city) this.city.night.forEach(([m, d, n]) => { m.emissiveIntensity = d + (n - d) * T.night; });
    (this.lampHeads || []).forEach(m => { m.material.emissiveIntensity = T.night * 2.5; });
  }
  buildCityLayer() {
    if (this.city) { this.scene.remove(this.city.group); }
    this.city = buildCity(QUALITY[this.q].city); this.scene.add(this.city.group);
    this.setTheme && this.sky && this.setTheme(this.themeName);
  }
  // ---------- bàn cờ ----------
  buildBoard() {
    const b = this.board = new THREE.Group(); this.root.add(b);
    const base = new THREE.Mesh(new THREE.BoxGeometry(L + 0.5, 0.42, L + 0.5), [std('#1f7a4a'), std('#1f7a4a'), std('#2a9a5e'), std('#1f7a4a'), std('#1f7a4a'), std('#1f7a4a')]);
    base.position.y = -0.21; base.receiveShadow = true; base.castShadow = true; b.add(base);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(L + 0.62, 0.08, L + 0.62), std('#ffd54a', { metalness: 0.4, roughness: 0.35 })); rim.position.y = -0.38; b.add(rim);
    const PS = L - 2 * TD - 0.06;
    this.plazaMat = new THREE.MeshStandardMaterial({ map: tex(plazaCanvas()), roughness: 0.9 });
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(PS, 0.04, PS), [std('#e8dfc8'), std('#e8dfc8'), this.plazaMat, std('#e8dfc8'), std('#e8dfc8'), std('#e8dfc8')]);
    plaza.position.y = 0.02; plaza.receiveShadow = true; b.add(plaza);
    const side = std('#efe6d2');
    for (let i = 0; i < 40; i++) {
      const ci = cellInfo(i), g = 0.035;
      const top = new THREE.MeshStandardMaterial({ roughness: 0.85 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(ci.w - 2 * g, TILE_H, ci.d - 2 * g), [side, side, top, side, side, side]);
      m.position.set(ci.x, TILE_H / 2, ci.z); m.rotation.y = ci.theta; m.castShadow = true; m.receiveShadow = true; m.userData.tile = i; b.add(m);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(ci.w - 0.02, 0.02, ci.d - 0.02), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, depthWrite: false }));
      glow.position.set(ci.x, TILE_H + 0.015, ci.z); glow.rotation.y = ci.theta; b.add(glow);
      this.tileObjs[i] = { mesh: m, top, glow, key: null };
    }
    this.refreshTiles(true);
    // đèn đường quanh bàn (sáng khi tối)
    this.lampHeads = [];
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4, r = L / 2 * Math.SQRT2 + 0.9, x = Math.sin(a) * r, z = Math.cos(a) * r;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.4, 6), std('#3a4150')); pole.position.set(x, 0.28, z); this.root.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd27a, emissiveIntensity: 0 })); head.position.set(x, 1.0, z); this.root.add(head); this.lampHeads.push(head);
    }
    // chồng thẻ Cơ hội / Khí vận trên sân giữa
    this.piles = {};
    const uv = v => -PS / 2 + v * PS;
    for (const [deck, ux, uy] of [['chance', 250, 770], ['chest', 775, 255]]) {
      const g = new THREE.Group(), t = tex(cardCanvas(deck));
      for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.025, 0.76), [std('#fff'), std('#fff'), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), std('#fff'), std('#fff'), std('#fff')]); m.position.y = 0.055 + k * 0.028; m.rotation.y = (Math.random() - 0.5) * 0.08; m.castShadow = true; g.add(m); }
      g.position.set(uv(ux / 1024), 0, uv(uy / 1024)); g.rotation.y = Math.PI / 4; b.add(g); this.piles[deck] = { g, tex: t };
    }
  }
  // vẽ lại mặt chữ các ô (chủ sở hữu, tiền thuê, thế chấp)
  refreshTiles(force = false) {
    const S = QUALITY[this.q].tex, v = this.view;
    for (let i = 0; i < 40; i++) {
      const t = this.tiles[i], pr = v && v.props[i], owner = pr && v.players.find(p => p.id === pr.owner);
      const st = { groupColor: t.group ? this.groups[t.group].color : null, owner: owner ? owner.color : null, mort: pr && pr.mort, rent: pr ? (v.rents || {})[i] || 0 : 0 };
      const key = JSON.stringify(st) + S;
      const o = this.tileObjs[i]; if (!force && o.key === key) continue;
      o.key = key; if (o.top.map) o.top.map.dispose(); o.top.map = tex(tileCanvas(i, t, st, S)); o.top.needsUpdate = true;
    }
  }
  // ---------- nhà / landmark / cờ ----------
  house(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), std('#fff6e6')); body.position.y = 0.07; body.castShadow = true; g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.12, 4), std(color, { flatShading: true })); roof.position.y = 0.2; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
    return g;
  }
  landmark(color) {
    const g = new THREE.Group(), glass = new THREE.MeshStandardMaterial({ color: col(color).lerp(col('#cfe8ff'), 0.4), roughness: 0.2, metalness: 0.45, emissive: col('#ffd27a'), emissiveIntensity: THEMES[this.themeName].night * 0.6 });
    [[0.5, 0.42, 0.35, 0], [0.4, 0.32, 0.35, 0.35], [0.3, 0.22, 0.3, 0.7]].forEach(([b, t, h, y]) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(t / Math.SQRT2, b / Math.SQRT2, h, 4), glass); m.rotation.y = Math.PI / 4; m.position.y = y + h / 2; m.castShadow = true; g.add(m);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(t / Math.SQRT2 + 0.012, t / Math.SQRT2 + 0.012, 0.035, 4), std(color)); band.rotation.y = Math.PI / 4; band.position.y = y + h; g.add(band);
    });
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.4, 4), std('#ffd54a', { metalness: 0.7, roughness: 0.25, emissive: 0x664400 })); spire.position.y = 1.2; spire.rotation.y = Math.PI / 4; spire.castShadow = true; g.add(spire);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xfff1a8 })); star.position.y = 1.45; g.add(star); g.userData.spin = star;
    return g;
  }
  flag(color) {
    const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6), std('#6d4c41')); pole.position.y = 0.225; pole.castShadow = true; g.add(pole);
    const fl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 0.01), std(color)); fl.position.set(0.1, 0.38, 0); fl.castShadow = true; g.add(fl); g.userData.flag = fl; return g;
  }
  // đồng bộ sở hữu / nhà / quân cờ theo view
  sync(v) {
    this.view = v; this.refreshTiles();
    for (let i = 0; i < 40; i++) {
      const pr = v.props[i], owner = pr && v.players.find(p => p.id === pr.owner);
      const key = pr ? `${owner.color}|${pr.h}|${pr.mort}` : '';
      const cur = this.bld[i]; if (cur && cur.key === key) continue;
      if (cur) cur.objs.forEach(o => this.board.remove(o));
      const objs = [], ci = cellInfo(i);
      if (pr && !pr.mort && !ci.corner) {
        const at = (o, u, vv) => { const p = local(i, u, vv); o.position.set(p.x, TILE_H, p.z); o.rotation.y = ci.theta; o.traverse(m => { m.userData.tile = i; }); this.board.add(o); objs.push(o); return o; };
        const prevH = cur && cur.h || 0;
        if (pr.h === 5) { const lm = at(this.landmark(owner.color), 0, -0.58); lm.scale.setScalar(0.78); if (prevH !== 5) this.pop(lm, true); }
        else if (pr.h > 0) for (let k = 0; k < pr.h; k++) { const hs = at(this.house(owner.color), -0.33 + k * 0.22, -0.62); if (k >= prevH) this.pop(hs); }
        else { const f = at(this.flag(owner.color), 0.32, -0.6); if (!cur || !cur.key) this.pop(f); }
      }
      this.bld[i] = { key, objs, h: pr ? pr.h : 0 };
    }
    for (const p of v.players) {
      if (!this.pawns[p.id]) this.pawns[p.id] = this.makePawn(p);
      const g = this.pawns[p.id]; g.visible = !p.out; this.jailed[p.id] = p.inJail;
      if (g.userData.cfgKey !== JSON.stringify(p.avatar)) { this.root.remove(g); this.pawns[p.id] = this.makePawn(p); }
    }
  }
  pop(o, big = false) {
    const s = o.scale.x; o.scale.setScalar(0.01);
    this.tween(big ? 700 : 380, t => { const k = t < 0.6 ? easeOut(t / 0.6) * 1.2 : 1.2 - 0.2 * ease((t - 0.6) / 0.4); o.scale.setScalar(s * k); if (big) o.rotation.y += 0.05 * (1 - t); });
  }
  // ---------- quân cờ = nhân vật avatar ----------
  makePawn(p) {
    const g = new THREE.Group();
    const av = buildAvatar(p.avatar || {}); av.scale.setScalar(0.58); g.add(av);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.04, 24), std(p.color, { roughness: 0.4 })); disc.position.y = 0.02; disc.receiveShadow = true; g.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 8, 32), new THREE.MeshBasicMaterial({ color: col(p.color) })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.03; ring.visible = false; g.add(ring);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 12), new THREE.MeshBasicMaterial({ color: col(p.color) })); arrow.rotation.x = Math.PI; arrow.position.y = 1.05; arrow.visible = false; g.add(arrow);
    g.userData = { av, ring, arrow, cfgKey: JSON.stringify(p.avatar) };
    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    const i = this.pawnTile[p.id] ?? p.pos ?? 0; const pos = local(i, 0, 0.2); g.position.set(pos.x, TILE_H, pos.z); g.rotation.y = cellInfo(i).theta;
    this.root.add(g); return g;
  }
  slots(i, n, jailedMode) {
    const ci = cellInfo(i);
    if (i === 10) {
      if (jailedMode) return [[-0.5, -0.5], [-0.15, -0.5], [-0.5, -0.15], [-0.15, -0.15], [-0.32, -0.66], [-0.32, 0.0]].slice(0, n);
      return [[0.62, 0.62], [0.62, 0.25], [0.25, 0.62], [0.62, -0.12], [-0.12, 0.62], [0.62, -0.48]].slice(0, n);
    }
    if (ci.corner) return [[0, 0], [-0.35, 0.3], [0.3, -0.35], [0.35, 0.35], [-0.35, -0.3], [0.05, 0.55]].slice(0, Math.max(1, n));
    const S = { 1: [[0, 0.2]], 2: [[-0.22, 0.2], [0.22, 0.2]], 3: [[-0.22, 0], [0.22, 0], [0, 0.45]], 4: [[-0.22, 0], [0.22, 0], [-0.22, 0.45], [0.22, 0.45]] };
    return S[n] || [[-0.22, -0.15], [0.22, -0.15], [-0.22, 0.25], [0.22, 0.25], [-0.22, 0.6], [0.22, 0.6]];
  }
  // xếp các quân trên ô i
  arrange(i, ms = 250) {
    const ids = Object.keys(this.pawnTile).filter(id => this.pawnTile[id] === i && this.pawns[id] && this.pawns[id].visible && !this.moving.has(id));
    for (const jm of [false, true]) {
      const grp = ids.filter(id => !!this.jailed[id] === jm && (i === 10 || !jm)).concat(i !== 10 && jm ? ids.filter(id => this.jailed[id]) : []);
      const sl = this.slots(i, grp.length, jm);
      grp.forEach((id, k) => {
        const g = this.pawns[id], [u, v] = sl[k] || [0, 0], p = local(i, u, v), sx = g.position.x, sz = g.position.z, th = cellInfo(i).theta + (i % 10 === 0 ? Math.PI / 4 : 0), r0 = g.rotation.y;
        const dr = Math.atan2(Math.sin(th - r0), Math.cos(th - r0));
        if (!ms) { g.position.set(p.x, TILE_H, p.z); g.rotation.y = th; return; }
        this.tween(ms, t => { const e = ease(t); g.position.x = sx + (p.x - sx) * e; g.position.z = sz + (p.z - sz) * e; g.rotation.y = r0 + dr * e; });
      });
    }
  }
  setPawnTile(id, i, ms = 0) { const old = this.pawnTile[id]; this.pawnTile[id] = i; if (old != null && old !== i) this.arrange(old, ms); this.arrange(i, ms); }
  placeAll(players) { for (const p of players) this.pawnTile[p.id] = p.pos; for (let i = 0; i < 40; i++) this.arrange(i, 0); }
  // đi từng ô: path = mảng chỉ số ô
  async walk(id, path, msStep = 230, onStep) {
    const g = this.pawns[id]; if (!g || !path.length) return;
    this.moving.add(id); const from = this.pawnTile[id]; delete this.pawnTile[id]; if (from != null) this.arrange(from);
    this.follow(id);
    for (const i of path) {
      const p = local(i, 0, 0.15), sx = g.position.x, sz = g.position.z, dx = p.x - sx, dz = p.z - sz;
      const r0 = g.rotation.y, r1 = Math.atan2(dx, dz), dr = Math.atan2(Math.sin(r1 - r0), Math.cos(r1 - r0));
      await this.tween(msStep, t => {
        const e = ease(t); g.position.set(sx + dx * e, TILE_H + Math.sin(Math.PI * t) * 0.38, sz + dz * e); g.rotation.y = r0 + dr * Math.min(1, t * 3);
        const sq = t < 0.15 ? 1 - t * 1.2 : t > 0.85 ? 1 - (1 - t) * 1.2 : 1; g.userData.av.scale.set(0.58 * (1.5 - sq * 0.5), 0.58 * sq, 0.58 * (1.5 - sq * 0.5));
      });
      g.userData.av.scale.setScalar(0.58); this.camFocusTile = i; onStep && onStep(i); this.pulse(i, 0.5);
    }
    this.moving.delete(id); this.setPawnTile(id, path[path.length - 1], 220);
  }
  // bay vòng cung tới ô (vào tù, thẻ dời chỗ)
  async fly(id, to, ms = 900) {
    const g = this.pawns[id]; if (!g) return;
    this.moving.add(id); const from = this.pawnTile[id]; delete this.pawnTile[id]; if (from != null) this.arrange(from);
    this.follow(id); this.camFocusTile = to;
    const p = local(to, 0, 0.15), sx = g.position.x, sz = g.position.z;
    await this.tween(ms, t => { const e = ease(t); g.position.set(sx + (p.x - sx) * e, TILE_H + Math.sin(Math.PI * t) * 3, sz + (p.z - sz) * e); g.rotation.y += 0.25; });
    this.moving.delete(id); this.setPawnTile(id, to, 200); this.shake(0.12);
  }
  setTurn(id) {
    this.turnId = id;
    for (const k in this.pawns) { const u = this.pawns[k].userData; u.ring.visible = u.arrow.visible = k === id; }
  }
  // ---------- camera ----------
  follow(id) { this.cam.focus = id; if (this.cam.pinned) return; if (this.cam.mode === 'overview' || (this.cam.mode === 'free' && performance.now() - this.cam.lastUser > 2500)) this.cam.mode = 'follow'; if (this.cam.mode === 'follow') this.camFocusTile = this.pawnTile[id] ?? this.camFocusTile; }
  home() { this.cam.pinned = false; this.cam.mode = 'follow'; if (this.cam.focus && this.pawnTile[this.cam.focus] != null) this.camFocusTile = this.pawnTile[this.cam.focus]; this.o.onCamera && this.o.onCamera('follow'); }
  overview() { this.cam.pinned = true; this.cam.mode = 'overview'; this.o.onCamera && this.o.onCamera('overview'); }
  resize() {
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h, false); this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.fov = w / h < 0.8 ? 50 : w / h < 1.2 ? 44 : 38; this.camera.updateProjectionMatrix();
    const vf = THREE.MathUtils.degToRad(this.camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * w / h);
    this.closeDist = THREE.MathUtils.clamp(Math.max(2.5 / Math.tan(hf / 2), 2.6 / Math.tan(vf / 2)), 6, 11);
    this.overDist = Math.max((L * 0.62) / Math.tan(hf / 2), (L * 0.68) / Math.tan(vf / 2));
    this.controls.maxDistance = Math.max(this.overDist * 1.25, 20);
  }
  desired() {
    const c = this.cam, portrait = this.camera.aspect < 0.8;
    if (c.mode === 'follow' && c.focus && this.pawns[c.focus]) {
      // camera đứng chéo phía sau quân (theo chiều đi), nhìn dọc theo hàng ô sắp tới
      const g = this.pawns[c.focus], i = this.camFocusTile ?? this.pawnTile[c.focus] ?? 0, ci = cellInfo(i);
      const az = camAz(i) + (ci.corner ? 0.25 : portrait ? 0.62 : 0.42);
      const dir = new THREE.Vector3(-Math.cos(ci.theta), 0, Math.sin(ci.theta)); // hướng đi dọc cạnh
      const t = new THREE.Vector3(g.position.x * 0.88, 0.2, g.position.z * 0.88).add(dir.multiplyScalar(portrait ? 1.1 : 0.8));
      return { t, az, pol: portrait ? 0.78 : 0.88, dist: this.closeDist };
    }
    const i = this.cam.focus && this.pawnTile[this.cam.focus] != null ? this.pawnTile[this.cam.focus] : 0;
    const side = Math.round(camAz(i) / (Math.PI / 2)) * (Math.PI / 2);
    return { t: new THREE.Vector3(0, 0, 0), az: side, pol: portrait ? 0.32 : 0.6, dist: this.overDist };
  }
  snap() { this.updateCamera(1e6); }
  updateCamera(dt) {
    const c = this.cam, cam = this.camera, tg = this.controls.target;
    if (c.mode === 'free') { this.controls.update(); const lim = L / 2 + 3; tg.x = THREE.MathUtils.clamp(tg.x, -lim, lim); tg.z = THREE.MathUtils.clamp(tg.z, -lim, lim); tg.y = THREE.MathUtils.clamp(tg.y, -0.5, 2); return; }
    const d = this.desired(), k = dt > 100 ? 1 : 1 - Math.pow(0.04, dt);
    const off = cam.position.clone().sub(tg), sph = new THREE.Spherical().setFromVector3(off);
    const az0 = sph.theta, dAz = Math.atan2(Math.sin(d.az - az0), Math.cos(d.az - az0));
    sph.theta = az0 + dAz * k * 0.8; sph.phi += (d.pol - sph.phi) * k; sph.radius += (d.dist - sph.radius) * k;
    tg.lerp(d.t, k);
    cam.position.copy(tg).add(new THREE.Vector3().setFromSpherical(sph)); cam.lookAt(tg);
  }
  // ---------- xúc xắc 3D ----------
  buildDice() {
    const mats = DIE_FACES.map(n => new THREE.MeshStandardMaterial({ map: tex(dieCanvas(n)), roughness: 0.35 }));
    this.dice = [0, 1].map(k => {
      const outer = new THREE.Group(), inner = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), mats); inner.castShadow = true; outer.add(inner);
      outer.position.set(-0.4 + k * 0.8, 0.21, 3.0); this.root.add(outer); return { outer, inner };
    });
  }
  rollDice(vals, nearTile = 0) {
    const ci = cellInfo(nearTile), inward = new THREE.Vector3(-ci.x, 0, -ci.z).normalize();
    const base = new THREE.Vector3(ci.x, 0, ci.z).add(inward.clone().multiplyScalar(ci.corner ? 2.6 : 2.2));
    const side = new THREE.Vector3(inward.z, 0, -inward.x);
    return Promise.all(this.dice.map((d, k) => {
      const end = base.clone().add(side.clone().multiplyScalar(k ? 0.36 : -0.36)), start = end.clone().add(inward.clone().multiplyScalar(-1.2)).add(side.clone().multiplyScalar((Math.random() - 0.5) * 0.6));
      const tr = DIE_ROT[vals[k]], spin = [1 + (Math.random() * 3 | 0), 1 + (Math.random() * 2 | 0), 1 + (Math.random() * 3 | 0)].map(n => n * Math.PI * 2 * (Math.random() < 0.5 ? -1 : 1));
      d.outer.rotation.y = Math.random() * Math.PI * 2; const ms = 1050 + k * 120;
      return this.tween(ms, t => {
        const e = easeOut(t), h = 0.21 + Math.abs(Math.sin(Math.PI * 2.4 * Math.pow(t, 0.8))) * 1.6 * Math.pow(1 - t, 1.6) + (1 - t) * 0.6;
        d.outer.position.set(start.x + (end.x - start.x) * e, h, start.z + (end.z - start.z) * e);
        d.inner.rotation.set(tr[0] + spin[0] * (1 - e), tr[1] + spin[1] * (1 - e), tr[2] + spin[2] * (1 - e));
      }).then(() => { d.outer.position.y = 0.21; });
    }));
  }
  // ---------- thẻ ----------
  drawCard(deck) {
    const pile = this.piles[deck]; if (!pile) return Promise.resolve();
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.025, 0.76), [std('#fff'), std('#fff'), new THREE.MeshStandardMaterial({ map: pile.tex }), std('#fff'), std('#fff'), std('#fff')]);
    const st = pile.g.position.clone(); st.y = 0.25; m.position.copy(st); m.rotation.y = Math.PI / 4; this.board.add(m);
    return this.tween(650, t => { const e = easeOut(t); m.position.y = 0.25 + e * 1.6; m.rotation.x = e * Math.PI * 1.0; m.rotation.z = e * 0.4; m.scale.setScalar(1 + e * 0.4); })
      .then(() => this.tween(250, t => m.scale.setScalar(1.4 * (1 - t) + 0.01))).then(() => this.board.remove(m));
  }
  // ---------- hiệu ứng ----------
  tween(ms, fn) { return new Promise(res => this.anims.push({ t0: performance.now(), ms: Math.max(1, ms), fn, res })); }
  tileCenter(i) { const c = cellInfo(i); return new THREE.Vector3(c.x, TILE_H, c.z); }
  pulse(i, a = 0.8) { const o = this.tileObjs[i]; if (!o) return; this.tween(600, t => { o.glow.material.opacity = Math.max(o.glow.material.opacity * 0, a * (1 - t)); }); }
  fireworks(i, n = 3, colors) {
    if (!this.fxOn) return; const c = i == null ? new THREE.Vector3(0, 0, 0) : this.tileCenter(i);
    const cs = colors || ['#ff5a5f', '#ffd54a', '#2fc76f', '#3d8bff', '#ff7ac8', '#ffffff'];
    for (let k = 0; k < n; k++) setTimeout(() => this.firework(c.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6)), cs[(Math.random() * cs.length) | 0]), k * 260);
  }
  fwInit() { this.fwPool = { lights: [0, 1].map(() => { const l = new THREE.PointLight(0xffffff, 0, 6); this.root.add(l); return l; }), li: 0, live: 0, mats: {}, rock: new THREE.SphereGeometry(0.05, 6, 4) }; }
  // pháo hoa dùng lại đèn/vật liệu có sẵn: thêm/bớt PointLight mỗi lần làm three.js biên dịch lại toàn bộ shader → tụt FPS
  firework(at, color) {
    if (!this.fwPool) this.fwInit();
    const F = this.fwPool; if (F.live >= 6) return; F.live++;
    const m = F.mats[color] || (F.mats[color] = { b: new THREE.MeshBasicMaterial({ color: col(color) }), p: new THREE.PointsMaterial({ color: col(color), size: 0.13, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }) });
    const rocket = new THREE.Mesh(F.rock, m.b); rocket.position.copy(at); this.root.add(rocket);
    const top = 2.2 + Math.random() * 1.2;
    this.tween(450, t => { rocket.position.y = at.y + easeOut(t) * top; }).then(() => {
      this.root.remove(rocket); const n = 60, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
      for (let k = 0; k < n; k++) { pos.set([at.x, at.y + top, at.z], k * 3); const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1), s = 1.6 + Math.random() * 0.6; vel.push([Math.sin(b) * Math.cos(a) * s, Math.cos(b) * s, Math.sin(b) * Math.sin(a) * s]); }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pm = m.p.clone(); const pts = new THREE.Points(geo, pm); this.root.add(pts);
      const light = F.lights[F.li++ % F.lights.length]; light.color.set(col(color)); light.position.set(at.x, at.y + top, at.z); light.intensity = 4;
      let last = 0;
      this.tween(1300, t => { const dt = t - last; last = t; for (let k = 0; k < n; k++) { vel[k][1] -= 3.2 * dt * 1.3; pos[k * 3] += vel[k][0] * dt * 1.3; pos[k * 3 + 1] += vel[k][1] * dt * 1.3; pos[k * 3 + 2] += vel[k][2] * dt * 1.3; vel[k][0] *= 0.985; vel[k][2] *= 0.985; } geo.attributes.position.needsUpdate = true; pm.opacity = 1 - t * t; light.intensity = Math.min(light.intensity, 4 * (1 - t)); })
        .then(() => { this.root.remove(pts); geo.dispose(); pm.dispose(); light.intensity = 0; F.live--; });
    });
  }
  pawnPos(id) { const g = id && this.pawns[id]; return g ? g.position.clone().add(new THREE.Vector3(0, 0.5, 0)) : new THREE.Vector3(0, 0.4, 0); }
  coins(fromId, toId, n = 6) {
    if (!this.fxOn) return Promise.resolve(); const a = this.pawnPos(fromId), b = this.pawnPos(toId);
    const geo = new THREE.CylinderGeometry(0.08, 0.08, 0.025, 14), mat = std('#ffcf33', { metalness: 0.7, roughness: 0.3, emissive: 0x553300 });
    const ps = [];
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(geo, mat); m.position.copy(a); m.rotation.x = Math.PI / 2; this.root.add(m);
      const h = 1 + a.distanceTo(b) * 0.25;
      ps.push(new Promise(r => setTimeout(r, k * 70)).then(() => this.tween(650, t => { const e = ease(t); m.position.lerpVectors(a, b, e); m.position.y += Math.sin(Math.PI * t) * h; m.rotation.y += 0.3; })).then(() => this.root.remove(m)));
    }
    return Promise.all(ps);
  }
  floatAt(where, text, color = '#e53935', up = true) {
    const p = typeof where === 'number' ? this.tileCenter(where).add(new THREE.Vector3(0, 0.8, 0)) : this.pawnPos(where).add(new THREE.Vector3(0, 0.6, 0));
    const sp = textSprite(text, color, '#fff', 0.3); sp.position.copy(p); this.root.add(sp);
    this.tween(1500, t => { sp.position.y = p.y + (up ? 1 : -0.3) * easeOut(t) * 1.1; sp.material.opacity = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25; }).then(() => { this.root.remove(sp); sp.material.map.dispose(); });
  }
  shake(a = 0.15) { if (this.fxOn) this.shakeAmt = Math.max(this.shakeAmt || 0, a); }
  sirens(ms = 2200) { if (!this.fxOn) return; const p = this.tileCenter(10); this.siren[0].position.set(p.x - 0.3, 1.2, p.z); this.siren[1].position.set(p.x + 0.3, 1.2, p.z); this.sirenUntil = performance.now() + ms; }
  celebrate(id) {
    const g = this.pawns[id]; if (!g) return; this.follow(id); this.cam.mode = 'follow';
    this.tween(2600, t => { g.rotation.y += 0.18; g.userData.av.position.y = Math.abs(Math.sin(t * Math.PI * 5)) * 0.35; }).then(() => { g.userData.av.position.y = 0; });
    const i = this.pawnTile[id] ?? 0; this.fireworks(i, 8);
  }
  bump(id) { const g = this.pawns[id]; if (!g) return; this.tween(500, t => { g.userData.av.position.y = Math.sin(Math.PI * t) * 0.3; g.userData.av.rotation.z = Math.sin(t * Math.PI * 4) * 0.2 * (1 - t); }); }
  pick(list) { this.picked = new Set(list || []); }
  click(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ptr, this.camera);
    const hit = this.ray.intersectObjects(this.board.children, true).find(h => h.object.userData.tile != null);
    if (hit && this.o.onCell) this.o.onCell(hit.object.userData.tile);
  }
  frame() {
    const now = performance.now(), el = this.clock.getElapsedTime(), dt = Math.min(0.05, now / 1000 - (this.lastT || now / 1000)); this.lastT = now / 1000;
    this.anims = this.anims.filter(a => { const t = Math.min(1, (now - a.t0) / a.ms); a.fn(t); if (t >= 1) { a.res(); return false; } return true; });
    for (const k in this.pawns) { const u = this.pawns[k].userData; if (u.arrow.visible) { u.arrow.position.y = 1.05 + Math.sin(el * 4) * 0.06; u.arrow.rotation.y = el * 2; } if (!this.moving.has(k)) u.av.rotation.y = Math.sin(el * 1.3 + k.length) * 0.15; }
    for (const i in this.bld) this.bld[i].objs.forEach(o => { if (o.userData.flag) o.userData.flag.rotation.y = Math.sin(el * 3 + +i) * 0.35; if (o.userData.spin) o.userData.spin.rotation.y = el * 2; });
    if (this.picked && this.picked.size) this.tileObjs.forEach((o, i) => { if (this.picked.has(i)) o.glow.material.opacity = 0.3 + 0.25 * Math.sin(el * 6); });
    if (this.city) this.city.tick(el);
    const on = this.sirenUntil && now < this.sirenUntil; this.siren[0].intensity = on ? (Math.sin(el * 18) > 0 ? 6 : 0) : 0; this.siren[1].intensity = on ? (Math.sin(el * 18) > 0 ? 0 : 6) : 0;
    this.updateCamera(dt || 0.016);
    if (this.shakeAmt > 0.002) { const a = this.shakeAmt; this.camera.position.x += (Math.random() - 0.5) * a; this.camera.position.y += (Math.random() - 0.5) * a; this.shakeAmt *= 0.88; }
    const sp = this.sun.position, tg = this.controls.target; this.sun.target.position.set(tg.x * 0.5, 0, tg.z * 0.5); this.sun.position.set(...THEMES[this.themeName].sunPos).add(this.sun.target.position);
    if (this.fill.intensity) { this.fill.position.copy(this.camera.position); this.fill.target.position.copy(tg); }
    void sp; this.renderer.render(this.scene, this.camera);
  }
  dispose() { this.renderer.setAnimationLoop(null); this.ro.disconnect(); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
