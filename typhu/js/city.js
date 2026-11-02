// Phông nền Sài Gòn low-poly, tự dựng bằng khối hình (không dùng ảnh):
// Nhà thờ Đức Bà, Bưu điện TP, Nhà hát TP, UBND TP, Chợ Bến Thành, chùa Bà Thiên Hậu, Bitexco, Landmark 81, sông Sài Gòn + cầu Thủ Thiêm.
import * as THREE from '../../shared/lib/three.module.min.js';

const C = c => new THREE.Color(c);
const mats = new Map();
function M(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!o.unique && mats.has(key)) return mats.get(key);
  const m = new THREE.MeshStandardMaterial({ color: C(color), roughness: 0.8, metalness: 0, flatShading: !!o.flat, ...o.p });
  if (!o.unique) mats.set(key, m); return m;
}
function add(g, geo, mat, x = 0, y = 0, z = 0, ry = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = shadow; m.receiveShadow = true; g.add(m); return m;
}
const box = (g, w, h, d, mat, x = 0, y = 0, z = 0, ry = 0) => add(g, new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry);
const pyramid = (g, r, h, mat, x, y, z) => { const m = add(g, new THREE.ConeGeometry(r, h, 4), mat, x, y + h / 2, z); m.rotation.y = Math.PI / 4; return m; };

// ---------- cửa sổ phát sáng ban đêm ----------
let winTex = null;
function windowTexture() {
  if (winTex) return winTex;
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 128; y += 16) for (let x = 6; x < 64; x += 14) { const on = Math.random() < 0.6; c.fillStyle = on ? `hsl(${40 + Math.random() * 15},90%,${60 + Math.random() * 25}%)` : '#111'; c.fillRect(x, y, 8, 10); }
  winTex = new THREE.CanvasTexture(cv); winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping; winTex.colorSpace = THREE.SRGBColorSpace;
  return winTex;
}
// vật liệu có cửa sổ: ban ngày là kính, ban đêm sáng đèn
function winMat(color, rx = 1, ry = 1, night) {
  const t = windowTexture().clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  const m = new THREE.MeshStandardMaterial({ color: C(color), roughness: 0.5, metalness: 0.2, emissive: C('#ffd27a'), emissiveMap: t, emissiveIntensity: 0 });
  night.push([m, 0, 1.4]); return m;
}

// ---------- từng công trình (mặt trước hướng +z) ----------
function cathedral(night) { // Nhà thờ Đức Bà: gạch đỏ, 2 tháp chuông mái xám xanh
  const g = new THREE.Group(), brick = M('#c8623f'), trim = M('#e9d8c4'), roof = M('#6d8798', { flat: true }), dark = M('#5a2a1e');
  box(g, 2.4, 1.6, 3.6, brick, 0, 0, -0.6);
  add(g, new THREE.CylinderGeometry(0.01, 1.35, 0.9, 4, 1), M('#9c4a32', { flat: true }), 0, 2.05, -0.6, Math.PI / 4).scale.set(1, 1, 2.1);
  for (const sx of [-1, 1]) {
    box(g, 0.9, 2.9, 0.9, brick, sx * 0.95, 0, 1.0);
    box(g, 1.0, 0.12, 1.0, trim, sx * 0.95, 1.6, 1.0); box(g, 1.0, 0.12, 1.0, trim, sx * 0.95, 2.9, 1.0);
    box(g, 0.25, 0.55, 0.05, dark, sx * 0.95, 2.1, 1.46);
    pyramid(g, 0.7, 1.7, roof, sx * 0.95, 3.0, 1.0);
    box(g, 0.05, 0.4, 0.05, dark, sx * 0.95, 4.7, 1.0); box(g, 0.25, 0.05, 0.05, dark, sx * 0.95, 4.92, 1.0);
  }
  box(g, 1.0, 2.0, 0.8, brick, 0, 0, 1.05);
  add(g, new THREE.CylinderGeometry(0.28, 0.28, 0.06, 20), M('#f3d9c8'), 0, 1.45, 1.47).rotation.x = Math.PI / 2;
  add(g, new THREE.CylinderGeometry(0.15, 0.15, 0.07, 16), dark, 0, 1.45, 1.48).rotation.x = Math.PI / 2;
  box(g, 0.5, 0.75, 0.05, dark, 0, 0, 1.46);
  // tượng Đức Mẹ ở công viên phía trước
  add(g, new THREE.CylinderGeometry(0.35, 0.4, 0.15, 16), trim, 0, 0.08, 2.6); add(g, new THREE.CylinderGeometry(0.05, 0.1, 0.45, 8), M('#f5f5f5'), 0, 0.37, 2.6);
  g.userData.name = 'Nhà thờ Đức Bà'; return g;
}
function postOffice(night) { // Bưu điện TP: mặt tiền vàng kem dài, mái vòm, đồng hồ
  const g = new THREE.Group(), wall = M('#f2d58a'), trim = M('#fff6df'), win = M('#5c8a6a'), roof = M('#8a9aa0', { flat: true });
  box(g, 4.6, 1.3, 1.8, wall, 0, 0, 0); box(g, 4.7, 0.1, 1.9, trim, 0, 1.3, 0);
  box(g, 1.4, 1.75, 1.9, wall, 0, 0, 0.05); box(g, 1.5, 0.1, 2.0, trim, 0, 1.75, 0.05);
  const vault = add(g, new THREE.CylinderGeometry(0.7, 0.7, 4.2, 16, 1, false, 0, Math.PI), roof, 0, 1.35, -0.15); vault.rotation.z = Math.PI / 2; vault.rotation.y = 0; vault.scale.set(0.55, 1, 1);
  add(g, new THREE.CylinderGeometry(0.26, 0.26, 0.05, 20), trim, 0, 1.45, 1.03).rotation.x = Math.PI / 2;
  add(g, new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20), M('#ffffff'), 0, 1.45, 1.05).rotation.x = Math.PI / 2;
  for (let k = -4; k <= 4; k++) if (Math.abs(k) > 1) box(g, 0.22, 0.6, 0.04, winMat('#5c8a6a', 1, 1, night), k * 0.48, 0.35, 0.91);
  box(g, 0.6, 0.9, 0.05, win, 0, 0, 1.01);
  g.userData.name = 'Bưu điện Thành phố'; return g;
}
function operaHouse(night) { // Nhà hát TP: mặt tiền trắng, vòm cửa lớn, 2 tượng
  const g = new THREE.Group(), wall = M('#f6efe2'), trim = M('#d9c8a8'), dark = M('#7d6a55');
  box(g, 3.2, 1.6, 2.4, wall, 0, 0, -0.3); box(g, 3.3, 0.12, 2.5, trim, 0, 1.6, -0.3);
  box(g, 1.6, 2.1, 0.6, wall, 0, 0, 1.1);
  const arch = add(g, new THREE.CylinderGeometry(0.8, 0.8, 0.62, 20, 1, false, -Math.PI / 2, Math.PI), wall, 0, 2.1, 1.1); arch.rotation.x = Math.PI / 2; arch.rotation.z = Math.PI / 2;
  arch.rotation.set(Math.PI / 2, 0, 0); arch.rotation.order = 'YXZ';
  const a2 = add(g, new THREE.CylinderGeometry(0.55, 0.55, 0.05, 20, 1, false, -Math.PI / 2, Math.PI), M('#9fc6e0', { p: { emissive: C('#ffcf7a'), emissiveIntensity: 0 } }), 0, 1.35, 1.42); a2.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  night.push([a2.material, 0, 1.2]);
  box(g, 0.7, 0.9, 0.05, dark, 0, 0, 1.42);
  for (const sx of [-1, 1]) { box(g, 0.3, 0.3, 0.3, trim, sx * 1.15, 1.72, 0.8); add(g, new THREE.CapsuleGeometry(0.08, 0.25, 4, 8), M('#e8e2d6'), sx * 1.15, 2.2, 0.8); }
  for (let k = 0; k < 4; k++) add(g, new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), trim, -1.35 + k * 0.32 + (k > 1 ? 1.75 : 0), 0.65, 0.95);
  g.userData.name = 'Nhà hát Thành phố'; return g;
}
function cityHall(night) { // UBND TP: kiểu Pháp vàng, tháp đồng hồ giữa, cờ đỏ
  const g = new THREE.Group(), wall = M('#f0c64a'), trim = M('#fff4d6'), roof = M('#b8553a', { flat: true }), win = M('#ffffff');
  box(g, 5, 1.4, 1.6, wall, 0, 0, 0); add(g, new THREE.CylinderGeometry(0.01, 1, 0.5, 4), roof, 0, 1.65, 0, Math.PI / 4).scale.set(3.5, 1, 1.1);
  for (const sx of [-1, 1]) { box(g, 0.9, 1.7, 1.8, wall, sx * 2.1, 0, 0.1); pyramid(g, 0.7, 0.5, roof, sx * 2.1, 1.7, 0.1); }
  box(g, 0.9, 2.6, 0.9, wall, 0, 0, 0.4); box(g, 1.0, 0.1, 1.0, trim, 0, 2.6, 0.4);
  add(g, new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20), win, 0, 2.15, 0.86).rotation.x = Math.PI / 2;
  pyramid(g, 0.55, 0.7, roof, 0, 2.7, 0.4);
  box(g, 0.03, 0.8, 0.03, M('#666666'), 0, 3.4, 0.4);
  const flag = box(g, 0.45, 0.28, 0.02, M('#da251d'), 0.24, 3.9, 0.4); g.userData.flag = flag;
  box(g, 0.1, 0.1, 0.03, M('#ffde00'), 0.24, 4.0, 0.42);
  for (let k = -4; k <= 4; k++) if (k) box(g, 0.2, 0.45, 0.04, winMat('#7fb0c9', 1, 1, night), k * 0.5, 0.45, 0.81);
  g.userData.name = 'UBND Thành phố'; return g;
}
function benThanh(night) { // Chợ Bến Thành: thân kem, tháp đồng hồ 4 mặt
  const g = new THREE.Group(), wall = M('#f3e1a6'), roof = M('#c4793e', { flat: true }), trim = M('#ffffff'), dark = M('#7a4f2a');
  box(g, 4.2, 1.0, 3, wall, 0, 0, -0.2);
  add(g, new THREE.CylinderGeometry(0.01, 1, 0.55, 4), roof, 0, 1.27, -0.2, Math.PI / 4).scale.set(3.1, 1, 2.2);
  box(g, 1.1, 2.2, 1.1, wall, 0, 0, 1.0); pyramid(g, 0.9, 0.6, roof, 0, 2.2, 1.0);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; const cl = add(g, new THREE.CylinderGeometry(0.28, 0.28, 0.04, 20), trim, Math.sin(a) * 0.56, 1.75, 1.0 + Math.cos(a) * 0.56); cl.rotation.set(Math.PI / 2, 0, -a); cl.rotation.order = 'YXZ'; cl.rotation.y = a; cl.rotation.x = Math.PI / 2; }
  box(g, 0.04, 0.2, 0.02, dark, 0, 1.78, 1.6); box(g, 0.14, 0.04, 0.02, dark, 0.05, 1.75, 1.6);
  box(g, 0.6, 0.8, 0.05, dark, 0, 0, 1.56);
  for (let k = -3; k <= 3; k++) if (Math.abs(k) > 0) box(g, 0.3, 0.45, 0.04, winMat('#d9a65c', 1, 1, night), k * 0.55, 0.3, 1.31);
  g.userData.name = 'Chợ Bến Thành'; return g;
}
function temple(night) { // Chùa Bà Thiên Hậu: cột đỏ, mái ngói xanh cong, vòng nhang
  const g = new THREE.Group(), red = M('#c62828'), wall = M('#f6d27a'), roof = M('#2e8b7a', { flat: true }), gold = M('#ffcc33', { p: { metalness: 0.5, roughness: 0.35 } });
  box(g, 3.2, 0.25, 2.2, M('#d8d0c0'), 0, 0, 0);
  box(g, 2.8, 1.0, 1.6, wall, 0, 0.25, -0.1);
  for (let k = 0; k < 4; k++) add(g, new THREE.CylinderGeometry(0.07, 0.07, 1.0, 8), red, -1.2 + k * 0.8, 0.75, 0.85);
  const r1 = add(g, new THREE.CylinderGeometry(0.01, 1.2, 0.6, 4), roof, 0, 1.55, 0.1, Math.PI / 4); r1.scale.set(2.2, 1, 1.4);
  const r2 = add(g, new THREE.CylinderGeometry(0.01, 0.9, 0.45, 4), roof, 0, 2.0, 0.1, Math.PI / 4); r2.scale.set(1.9, 1, 1.2);
  for (const sx of [-1, 1]) { const tip = add(g, new THREE.ConeGeometry(0.08, 0.35, 6), gold, sx * 1.75, 1.45, 0.1); tip.rotation.z = sx * -1.0; }
  add(g, new THREE.SphereGeometry(0.12, 10, 8), gold, 0, 2.3, 0.1);
  box(g, 0.8, 0.7, 0.05, red, 0, 0.25, 0.71);
  const lantern = add(g, new THREE.SphereGeometry(0.12, 10, 8), M('#ff3b30', { unique: true, p: { emissive: C('#ff5a2e'), emissiveIntensity: 0.2 } }), -0.7, 1.1, 0.9); lantern.scale.y = 1.3;
  const l2 = add(g, new THREE.SphereGeometry(0.12, 10, 8), lantern.material, 0.7, 1.1, 0.9); l2.scale.y = 1.3;
  night.push([lantern.material, 0.2, 2]);
  for (let k = 0; k < 3; k++) add(g, new THREE.ConeGeometry(0.12, 0.25, 12, 1, true), M('#c98a3a', { p: { side: THREE.DoubleSide } }), -0.6 + k * 0.6, 0.85, 0.3).rotation.x = Math.PI;
  g.userData.name = 'Chùa Bà Thiên Hậu'; return g;
}
function bitexco(night) { // Bitexco: tháp kính thon như búp sen, sân đỗ trực thăng nhô ra
  const g = new THREE.Group();
  const pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(new THREE.Vector2(0.9 * Math.sin(Math.PI * (0.18 + 0.72 * t)) * (1 - t * 0.55) + 0.05, t * 8)); } pts.push(new THREE.Vector2(0, 8));
  const glass = winMat('#8fb6d6', 6, 10, night);
  add(g, new THREE.LatheGeometry(pts, 14), glass, 0, 0, 0);
  const pad = add(g, new THREE.CylinderGeometry(0.55, 0.45, 0.12, 20), M('#5f7f99'), 0.55, 5.6, 0.25); pad.rotation.z = 0.05;
  add(g, new THREE.CylinderGeometry(0.4, 0.4, 0.01, 20), M('#e8d35a'), 0.55, 5.67, 0.25);
  add(g, new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), M('#888888'), 0, 8.4, 0);
  const tip = add(g, new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: C('#ff4444'), emissive: C('#ff2222'), emissiveIntensity: 0.6 }), 0, 8.9, 0); night.push([tip.material, 0.6, 3]);
  g.userData.name = 'Bitexco'; return g;
}
function landmark81(night) { // Landmark 81: các khối vuông xếp tầng cao dần, chóp nhọn
  const g = new THREE.Group(), glass = winMat('#7d9fc0', 2, 12, night);
  const tubes = [[0, 0, 0.9, 9.6], [-0.55, 0, 0.7, 8.2], [0.55, 0, 0.7, 8.4], [0, -0.55, 0.7, 7.6], [0, 0.55, 0.7, 7.9], [-0.5, -0.5, 0.55, 6.2], [0.5, 0.5, 0.55, 6.6], [-0.5, 0.5, 0.55, 5.4], [0.5, -0.5, 0.55, 5.8]];
  for (const [x, z, w, h] of tubes) { box(g, w, h, w, glass, x, 0, z); box(g, w + 0.04, 0.08, w + 0.04, M('#c9d6e3'), x, h, z); }
  const sp = add(g, new THREE.ConeGeometry(0.3, 1.6, 4), M('#b8cbe0', { p: { metalness: 0.5, roughness: 0.3 } }), 0, 10.4, 0); sp.rotation.y = Math.PI / 4;
  const crown = add(g, new THREE.BoxGeometry(0.95, 0.25, 0.95), new THREE.MeshStandardMaterial({ color: C('#d9e6f2'), emissive: C('#7fd4ff'), emissiveIntensity: 0 }), 0, 9.7, 0); night.push([crown.material, 0, 2.5]);
  g.userData.name = 'Landmark 81'; return g;
}
function bridge(night, len = 9) { // cầu Thủ Thiêm (dây văng, 1 trụ nghiêng)
  const g = new THREE.Group(), conc = M('#d9dde2'), road = M('#4a4f57');
  box(g, len, 0.18, 1.1, conc, 0, 0.55, 0); box(g, len, 0.02, 0.8, road, 0, 0.73, 0);
  for (let k = -1; k <= 1; k += 2) box(g, 0.25, 0.55, 0.9, conc, k * len * 0.35, 0, 0);
  const py = add(g, new THREE.BoxGeometry(0.28, 4.2, 0.28), M('#f2f4f7'), 0.6, 2.6, 0); py.rotation.z = 0.22;
  const top = new THREE.Vector3(0.6 - Math.sin(0.22) * 2.1, 2.6 + Math.cos(0.22) * 2.1, 0);
  const pos = []; for (let k = 1; k <= 7; k++) { for (const sz of [-0.42, 0.42]) { pos.push(top.x, top.y - k * 0.12, 0, top.x + k * 0.55, 0.75, sz); pos.push(top.x, top.y - k * 0.12, 0, top.x - k * 0.5 - 0.3, 0.75, sz); } }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xffffff })));
  for (let k = -3; k <= 3; k++) { const l = add(g, new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshStandardMaterial({ color: C('#fff3c4'), emissive: C('#ffd27a'), emissiveIntensity: 0 }), k * 1.2, 0.85, 0.5, 0, false); night.push([l.material, 0, 3]); }
  g.userData.name = 'Cầu Thủ Thiêm'; return g;
}
function tree(palm = false, s = 1) {
  const g = new THREE.Group(), trunk = M('#8d5a3b'), leaf = M(palm ? '#3fa85a' : '#4caf5e', { flat: true });
  add(g, new THREE.CylinderGeometry(0.05 * s, 0.08 * s, (palm ? 1.1 : 0.6) * s, 6), trunk, 0, (palm ? 0.55 : 0.3) * s, 0);
  if (palm) for (let k = 0; k < 6; k++) { const l = add(g, new THREE.ConeGeometry(0.08 * s, 0.7 * s, 4), leaf, Math.cos(k) * 0.25 * s, 1.1 * s, Math.sin(k) * 0.25 * s); l.rotation.z = Math.cos(k) * 1.3; l.rotation.x = -Math.sin(k) * 1.3; }
  else [[0, 0.75, 0.42], [0.18, 0.95, 0.3], [-0.15, 1.05, 0.26]].forEach(([dx, y, r]) => add(g, new THREE.IcosahedronGeometry(r * s, 0), leaf, dx * s, y * s, 0));
  return g;
}
function filler(night, w, h, d, hue) {
  const g = new THREE.Group(); const col = `hsl(${hue},25%,${72 + Math.random() * 12}%)`;
  box(g, w, h, d, winMat(col, Math.max(1, Math.round(w * 1.5)), Math.max(1, Math.round(h * 1.2)), night), 0, 0, 0);
  box(g, w + 0.06, 0.08, d + 0.06, M('#cfd8e3'), 0, h, 0);
  if (Math.random() < 0.4) box(g, w * 0.4, 0.3, d * 0.4, M('#aab4c0'), 0, h + 0.08, 0);
  return g;
}

// ---------- dựng cả thành phố ----------
// level: 0 thấp, 1 vừa, 2 cao. Trả về { group, night: [[material, ngày, đêm]], tick(t), water }
export function buildCity(level = 1) {
  const g = new THREE.Group(), night = [];
  // mặt đất: đảo lớn, quảng trường lát gạch quanh bàn, đường phố
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(30, 27, 2.2, 56, 1), [M('#8a6a4a'), M('#7cc47a'), M('#6b4f35')]);
  ground.position.y = -1.6; ground.receiveShadow = true; g.add(ground);
  const pave = new THREE.Mesh(new THREE.BoxGeometry(17, 0.1, 17), M('#efe6d6')); pave.position.y = -0.47; pave.receiveShadow = true; g.add(pave);
  const road = M('#5b6170'), line = M('#f4f1e8');
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, r = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 30), road); r.position.set(Math.sin(a) * 23, -0.47, Math.cos(a) * 23); r.rotation.y = a; r.receiveShadow = true; if (k !== 1) g.add(r);
    const ring = new THREE.Mesh(new THREE.BoxGeometry(21, 0.06, 1.6), road); ring.position.set(Math.sin(a) * 9.7, -0.46, Math.cos(a) * 9.7); ring.rotation.y = a; ring.receiveShadow = true; g.add(ring);
    for (let j = -4; j <= 4; j++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.065, 0.08), line); d.position.set(Math.sin(a) * 9.7 + Math.cos(a) * j * 2.2, -0.45, Math.cos(a) * 9.7 - Math.sin(a) * j * 2.2); d.rotation.y = a; g.add(d); }
  }
  // sông Sài Gòn phía đông
  const waterMat = new THREE.MeshStandardMaterial({ color: C('#4aa8d8'), roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 56, 6, 30), waterMat); water.rotation.x = -Math.PI / 2; water.position.set(17.2, -0.48, 0); water.receiveShadow = true; g.add(water);
  const bankL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 54), M('#c9c2b2')); bankL.position.set(13.85, -0.44, 0); g.add(bankL);
  const bankR = bankL.clone(); bankR.position.x = 20.55; g.add(bankR);
  // công trình: [hàm dựng, x, z, mức tối thiểu]
  const place = (o, x, z, minLevel = 0, s = 1) => { if (level < minLevel) return null; o.position.set(x, -0.42, z); o.scale.setScalar(s); o.rotation.y = Math.atan2(-x, -z); g.add(o); return o; };
  place(cathedral(night), -3.4, -11.6, 0);
  place(postOffice(night), 4.2, -11.2, 1);
  place(operaHouse(night), -11.6, 3.8, 1);
  const hall = place(cityHall(night), -12, -4.2, 1);
  place(benThanh(night), -2.6, 11.6, 0);
  place(temple(night), 4.4, 11.8, 1);
  place(bitexco(night), 11.4, 10.2, 0);
  place(landmark81(night), 22.5, -9, 0, 1.1);
  const br = bridge(night, 10); br.position.set(17.2, -0.5, 2.5); g.add(br);
  // cây
  const trees = [];
  const treeSpots = [[-11.6, -11.6], [11.8, 6.6], [-11.6, 11.6], [11.6, -6.5], [-1, -9.6], [1.2, 9.4], [-9.4, 0.6], [0.4, -13.2], [-6.5, -12], [8, -12.5], [-12.5, 8], [-12.5, -9], [6.5, 13], [-6.5, 13.4], [11.8, -3], [11.8, 4], [-13.5, 0.2], [10, -8]];
  treeSpots.forEach(([x, z], k) => { if (level === 0 && k > 6) return; const t = tree(k % 3 === 0, 1 + (k % 4) * 0.12); t.position.set(x, -0.42, z); g.add(t); trees.push(t); });
  // nhà phố + cao ốc xa (chất lượng vừa/cao)
  if (level >= 1) {
    let rnd = 7; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
    const n = level >= 2 ? 46 : 18;
    for (let k = 0; k < n; k++) {
      const a = R() * Math.PI * 2, r = 17 + R() * 9, x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (x > 12.5 && x < 22) continue; // sông
      if (Math.hypot(x - 22.5, z + 9) < 3.5 || Math.hypot(x - 11.4, z - 10.2) < 3) continue;
      const tall = R() < 0.35, w = 1.2 + R() * 1.3, h = tall ? 3 + R() * 4.5 : 1 + R() * 1.6;
      const b = filler(night, w, h, 1.2 + R() * 1.2, 190 + R() * 60); b.position.set(x, -0.42, z); b.rotation.y = Math.atan2(-x, -z); g.add(b);
    }
  }
  // thuyền trên sông
  const boats = [];
  if (level >= 1) for (let k = 0; k < (level >= 2 ? 3 : 1); k++) {
    const b = new THREE.Group(); box(b, 0.5, 0.18, 1.4, M('#ffffff'), 0, 0, 0); box(b, 0.35, 0.25, 0.5, M(['#ffb020', '#e53935', '#3d8bff'][k]), 0, 0.18, -0.15);
    b.position.set(16 + k * 1.2, -0.45, -20 + k * 14); b.userData.v = 0.6 + k * 0.25; g.add(b); boats.push(b);
  }
  g.traverse(o => { if (o.isMesh && level === 0) o.castShadow = false; });
  const tick = t => {
     waterMat.color.offsetHSL(0, 0, Math.sin(t * 2) * 0.0004);
    boats.forEach(b => { b.position.z += b.userData.v * 0.016; if (b.position.z > 24) b.position.z = -24; b.position.y = -0.45 + Math.sin(t * 2 + b.userData.v * 5) * 0.03; });
    if (hall && hall.userData.flag) hall.userData.flag.rotation.y = Math.sin(t * 3) * 0.25;
    trees.forEach((tr, k) => { tr.rotation.z = Math.sin(t * 1.3 + k) * 0.02; });
  };
  return { group: g, night, tick, water: waterMat };
}
