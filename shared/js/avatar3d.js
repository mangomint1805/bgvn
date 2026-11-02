// Nhân vật chibi 3D low-poly dựng bằng code – dùng chung cho mọi game (quân cờ, avatar).
import * as THREE from '../lib/three.module.min.js';

export const OPTIONS = {
  kind: [['human', 'Người'], ['cat', 'Mèo'], ['dog', 'Cún'], ['panda', 'Gấu trúc'], ['fox', 'Cáo'], ['frog', 'Ếch']],
  skin: ['#ffe0c2', '#f6c9a0', '#e0a878', '#b97a4f', '#8a5634'],
  hair: [['short', 'Tóc ngắn'], ['spiky', 'Tóc dựng'], ['long', 'Tóc dài'], ['bun', 'Búi tóc'], ['bald', 'Trọc']],
  hairColor: ['#2b1d16', '#5a3a22', '#c98b4a', '#f0d27a', '#e85d75', '#5e7bff', '#ffffff'],
  hat: [['none', 'Không'], ['nonla', 'Nón lá'], ['helmet', 'Nón bảo hiểm'], ['cap', 'Nón kết'], ['cowboy', 'Mũ cao bồi'], ['crown', 'Vương miện'], ['chef', 'Mũ đầu bếp']],
  outfit: [['tee', 'Áo thun'], ['aodai', 'Áo dài'], ['vest', 'Vest'], ['jersey', 'Áo đội bóng'], ['apron', 'Tạp dề'], ['army', 'Quân phục']],
  acc: [['none', 'Không'], ['glasses', 'Kính râm'], ['scarf', 'Khăn rằn'], ['backpack', 'Ba lô'], ['moneybag', 'Túi tiền']],
  color: ['#ff5a5f', '#3d8bff', '#2fc76f', '#ffb020', '#a259ff', '#ff7ac8', '#14c4c4', '#8d6e63'],
};
// 16 mẫu dựng sẵn (thay cho 16 emoji cũ)
export const PRESETS = [
  { name: 'Doanh nhân', kind: 'human', skin: '#f6c9a0', hair: 'short', hairColor: '#2b1d16', hat: 'none', outfit: 'vest', acc: 'none', color: '#3d8bff' },
  { name: 'Nữ doanh nhân', kind: 'human', skin: '#ffe0c2', hair: 'long', hairColor: '#2b1d16', hat: 'none', outfit: 'vest', acc: 'glasses', color: '#a259ff' },
  { name: 'Kỹ sư', kind: 'human', skin: '#e0a878', hair: 'short', hairColor: '#5a3a22', hat: 'helmet', outfit: 'tee', acc: 'none', color: '#ffb020' },
  { name: 'Đầu bếp', kind: 'human', skin: '#f6c9a0', hair: 'bun', hairColor: '#5a3a22', hat: 'chef', outfit: 'apron', acc: 'none', color: '#ff5a5f' },
  { name: 'Ca sĩ', kind: 'human', skin: '#ffe0c2', hair: 'spiky', hairColor: '#e85d75', hat: 'none', outfit: 'tee', acc: 'glasses', color: '#ff7ac8' },
  { name: 'Cô Ba Sài Gòn', kind: 'human', skin: '#ffe0c2', hair: 'long', hairColor: '#2b1d16', hat: 'nonla', outfit: 'aodai', acc: 'none', color: '#ff5a5f' },
  { name: 'Anh bộ đội', kind: 'human', skin: '#e0a878', hair: 'short', hairColor: '#2b1d16', hat: 'helmet', outfit: 'army', acc: 'backpack', color: '#2fc76f' },
  { name: 'Cao bồi', kind: 'human', skin: '#b97a4f', hair: 'short', hairColor: '#2b1d16', hat: 'cowboy', outfit: 'tee', acc: 'scarf', color: '#8d6e63' },
  { name: 'Mèo', kind: 'cat', skin: '#f0a040', hair: 'bald', hairColor: '#2b1d16', hat: 'none', outfit: 'tee', acc: 'none', color: '#ffb020' },
  { name: 'Cún', kind: 'dog', skin: '#e8c28e', hair: 'bald', hairColor: '#2b1d16', hat: 'cap', outfit: 'jersey', acc: 'none', color: '#3d8bff' },
  { name: 'Gấu trúc', kind: 'panda', skin: '#ffffff', hair: 'bald', hairColor: '#2b1d16', hat: 'none', outfit: 'tee', acc: 'scarf', color: '#2fc76f' },
  { name: 'Cáo', kind: 'fox', skin: '#ff8a3d', hair: 'bald', hairColor: '#2b1d16', hat: 'none', outfit: 'vest', acc: 'glasses', color: '#ff5a5f' },
  { name: 'Ếch', kind: 'frog', skin: '#5cc85c', hair: 'bald', hairColor: '#2b1d16', hat: 'crown', outfit: 'tee', acc: 'none', color: '#14c4c4' },
  { name: 'Đại gia', kind: 'human', skin: '#f6c9a0', hair: 'bald', hairColor: '#2b1d16', hat: 'crown', outfit: 'vest', acc: 'moneybag', color: '#ffb020' },
  { name: 'Shipper', kind: 'human', skin: '#e0a878', hair: 'short', hairColor: '#2b1d16', hat: 'helmet', outfit: 'jersey', acc: 'backpack', color: '#2fc76f' },
  { name: 'Cầu thủ', kind: 'human', skin: '#b97a4f', hair: 'spiky', hairColor: '#f0d27a', hat: 'none', outfit: 'jersey', acc: 'none', color: '#ff5a5f' },
];
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.6, ...o });
const shadeHex = (c, f) => '#' + new THREE.Color(c).multiplyScalar(f).getHexString();
function add(g, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; }

export function buildAvatar(cfg) {
  cfg = { ...PRESETS[0], ...cfg };
  const g = new THREE.Group(), isHuman = cfg.kind === 'human';
  const skin = M(cfg.kind === 'panda' ? '#ffffff' : cfg.skin), main = M(cfg.color), dark = M('#2b2b33'), white = M('#ffffff');
  // ----- thân + áo -----
  const shirtCol = { tee: cfg.color, aodai: cfg.color, vest: '#2f3545', jersey: cfg.color, apron: '#ffffff', army: '#4f6b3a' }[cfg.outfit];
  const shirt = M(shirtCol);
  add(g, new THREE.CylinderGeometry(0.2, 0.26, 0.42, 12), shirt, 0, 0.42, 0);
  // chân
  const pants = M(cfg.outfit === 'army' ? '#3f5530' : cfg.outfit === 'aodai' ? '#ffffff' : '#3a4a6b');
  add(g, new THREE.CylinderGeometry(0.075, 0.07, 0.26, 8), pants, -0.1, 0.13, 0); add(g, new THREE.CylinderGeometry(0.075, 0.07, 0.26, 8), pants, 0.1, 0.13, 0);
  add(g, new THREE.BoxGeometry(0.13, 0.06, 0.18), dark, -0.1, 0.03, 0.03); add(g, new THREE.BoxGeometry(0.13, 0.06, 0.18), dark, 0.1, 0.03, 0.03);
  // tay
  add(g, new THREE.CapsuleGeometry(0.055, 0.22, 4, 8), shirt, -0.29, 0.45, 0, 0, 0, 0.35); add(g, new THREE.CapsuleGeometry(0.055, 0.22, 4, 8), shirt, 0.29, 0.45, 0, 0, 0, -0.35);
  add(g, new THREE.SphereGeometry(0.06, 8, 6), skin, -0.34, 0.31, 0); add(g, new THREE.SphereGeometry(0.06, 8, 6), skin, 0.34, 0.31, 0);
  if (cfg.outfit === 'aodai') add(g, new THREE.CylinderGeometry(0.24, 0.3, 0.32, 12, 1, true), shirt, 0, 0.18, 0);
  if (cfg.outfit === 'vest') { add(g, new THREE.BoxGeometry(0.1, 0.3, 0.02), white, 0, 0.46, 0.235); add(g, new THREE.BoxGeometry(0.04, 0.22, 0.02), main, 0, 0.45, 0.25); }
  if (cfg.outfit === 'jersey') { add(g, new THREE.BoxGeometry(0.14, 0.12, 0.02), white, 0, 0.45, 0.245); }
  if (cfg.outfit === 'apron') add(g, new THREE.BoxGeometry(0.3, 0.32, 0.02), white, 0, 0.38, 0.25);
  if (cfg.outfit === 'army') { add(g, new THREE.BoxGeometry(0.42, 0.04, 0.42), M('#6b4f2a'), 0, 0.3, 0); }
  // ----- đầu -----
  const head = new THREE.Group(); head.position.y = 0.88; g.add(head);
  add(head, new THREE.SphereGeometry(0.27, 20, 16), skin, 0, 0, 0);
  // mắt + miệng
  const eye = new THREE.SphereGeometry(0.04, 10, 8);
  add(head, eye, dark, -0.09, 0.02, 0.24); add(head, eye, dark, 0.09, 0.02, 0.24);
  add(head, new THREE.SphereGeometry(0.014, 6, 4), white, -0.08, 0.04, 0.275); add(head, new THREE.SphereGeometry(0.014, 6, 4), white, 0.1, 0.04, 0.275);
  add(head, new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), M('#7a2b2b'), 0, -0.08, 0.245, Math.PI, 0, 0);
  add(head, new THREE.SphereGeometry(0.04, 8, 6), M('#ff9a9a', { transparent: true, opacity: 0.6 }), -0.17, -0.05, 0.19); add(head, new THREE.SphereGeometry(0.04, 8, 6), M('#ff9a9a', { transparent: true, opacity: 0.6 }), 0.17, -0.05, 0.19);
  // thú: tai, mõm
  if (cfg.kind === 'cat' || cfg.kind === 'fox') { const e = M(cfg.skin); add(head, new THREE.ConeGeometry(0.09, 0.18, 4), e, -0.16, 0.24, 0, 0, 0, 0.3); add(head, new THREE.ConeGeometry(0.09, 0.18, 4), e, 0.16, 0.24, 0, 0, 0, -0.3); if (cfg.kind === 'fox') add(head, new THREE.ConeGeometry(0.08, 0.16, 6), white, 0, -0.06, 0.25, Math.PI / 2, 0, 0); }
  if (cfg.kind === 'dog') { const e = M(shadeHex(cfg.skin, 0.7)); add(head, new THREE.SphereGeometry(0.1, 8, 6), e, -0.24, 0.05, 0).scale.set(0.5, 1.4, 0.8); add(head, new THREE.SphereGeometry(0.1, 8, 6), e, 0.24, 0.05, 0).scale.set(0.5, 1.4, 0.8); add(head, new THREE.SphereGeometry(0.04, 8, 6), dark, 0, -0.03, 0.27); }
  if (cfg.kind === 'panda') { add(head, new THREE.SphereGeometry(0.08, 8, 6), dark, -0.19, 0.22, 0); add(head, new THREE.SphereGeometry(0.08, 8, 6), dark, 0.19, 0.22, 0); add(head, new THREE.SphereGeometry(0.065, 8, 6), dark, -0.09, 0.02, 0.22).scale.set(1, 1.3, 0.6); add(head, new THREE.SphereGeometry(0.065, 8, 6), dark, 0.09, 0.02, 0.22).scale.set(1, 1.3, 0.6); }
  if (cfg.kind === 'frog') { add(head, new THREE.SphereGeometry(0.09, 10, 8), skin, -0.12, 0.22, 0.08); add(head, new THREE.SphereGeometry(0.09, 10, 8), skin, 0.12, 0.22, 0.08); add(head, eye, dark, -0.12, 0.24, 0.16); add(head, eye, dark, 0.12, 0.24, 0.16); }
  // tóc (chỉ người)
  const hc = M(cfg.hairColor);
  if (isHuman && cfg.hair !== 'bald') {
    add(head, new THREE.SphereGeometry(0.285, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), hc, 0, 0.01, -0.02);
    if (cfg.hair === 'spiky') for (let k = 0; k < 7; k++) add(head, new THREE.ConeGeometry(0.06, 0.16, 5), hc, Math.cos(k) * 0.14, 0.25, Math.sin(k) * 0.14 - 0.02, Math.sin(k) * 0.4, 0, -Math.cos(k) * 0.4);
    if (cfg.hair === 'long') add(head, new THREE.BoxGeometry(0.46, 0.42, 0.14), hc, 0, -0.14, -0.16);
    if (cfg.hair === 'bun') add(head, new THREE.SphereGeometry(0.11, 12, 10), hc, 0, 0.27, -0.12);
    add(head, new THREE.BoxGeometry(0.38, 0.08, 0.1), hc, 0, 0.17, 0.2, -0.3, 0, 0); // mái
  }
  // nón
  const hatY = 0.2;
  if (cfg.hat === 'nonla') { add(head, new THREE.ConeGeometry(0.5, 0.28, 24), M('#f3dc9b', { flatShading: true }), 0, hatY + 0.12, 0); }
  if (cfg.hat === 'helmet') { add(head, new THREE.SphereGeometry(0.3, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), main, 0, 0.02, 0); add(head, new THREE.BoxGeometry(0.3, 0.03, 0.12), dark, 0, 0.05, 0.3); }
  if (cfg.hat === 'cap') { add(head, new THREE.SphereGeometry(0.29, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), main, 0, 0.03, 0); add(head, new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16, 1, false, -Math.PI / 2, Math.PI), main, 0, 0.13, 0.22); }
  if (cfg.hat === 'cowboy') { add(head, new THREE.CylinderGeometry(0.48, 0.48, 0.03, 24), M('#8d5a3b'), 0, hatY, 0); add(head, new THREE.CylinderGeometry(0.2, 0.24, 0.24, 16), M('#8d5a3b'), 0, hatY + 0.12, 0); add(head, new THREE.CylinderGeometry(0.245, 0.245, 0.05, 16), dark, 0, hatY + 0.03, 0); }
  if (cfg.hat === 'crown') { add(head, new THREE.CylinderGeometry(0.17, 0.17, 0.12, 8, 1, true), M('#ffd54a', { metalness: 0.7, roughness: 0.25, side: THREE.DoubleSide }), 0, 0.31, 0); for (let k = 0; k < 8; k++) add(head, new THREE.ConeGeometry(0.03, 0.08, 4), M('#ffd54a', { metalness: 0.7, roughness: 0.25 }), Math.cos(k * Math.PI / 4) * 0.17, 0.41, Math.sin(k * Math.PI / 4) * 0.17); add(head, new THREE.SphereGeometry(0.03, 8, 6), M('#e53935'), 0, 0.31, 0.17); }
  if (cfg.hat === 'chef') { add(head, new THREE.CylinderGeometry(0.2, 0.2, 0.14, 16), white, 0, 0.27, 0); add(head, new THREE.SphereGeometry(0.22, 14, 10), white, 0, 0.4, 0).scale.set(1, 0.75, 1); }
  // phụ kiện
  if (cfg.acc === 'glasses') { add(head, new THREE.BoxGeometry(0.11, 0.06, 0.02), dark, -0.09, 0.03, 0.27); add(head, new THREE.BoxGeometry(0.11, 0.06, 0.02), dark, 0.09, 0.03, 0.27); add(head, new THREE.BoxGeometry(0.07, 0.015, 0.02), dark, 0, 0.04, 0.27); }
  if (cfg.acc === 'scarf') { add(g, new THREE.TorusGeometry(0.19, 0.05, 8, 16), M('#d32f2f'), 0, 0.64, 0, Math.PI / 2, 0, 0); add(g, new THREE.BoxGeometry(0.08, 0.16, 0.03), M('#d32f2f'), 0.08, 0.55, 0.2, 0, 0, 0.2); }
  if (cfg.acc === 'backpack') { add(g, new THREE.BoxGeometry(0.3, 0.32, 0.14), M(shadeHex(cfg.color, 0.7)), 0, 0.45, -0.25); }
  if (cfg.acc === 'moneybag') { add(g, new THREE.SphereGeometry(0.11, 10, 8), M('#9b6b3e'), 0.38, 0.26, 0.05); add(g, new THREE.CylinderGeometry(0.03, 0.05, 0.06, 8), M('#ffd54a'), 0.38, 0.37, 0.05); }
  g.userData.head = head;
  return g;
}

// Vẽ ảnh chân dung nhỏ của nhân vật ra dataURL (dùng làm avatar trong giao diện HTML)
let _r = null;
export function portrait(cfg, size = 128) {
  if (!_r) { _r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); _r.outputColorSpace = THREE.SRGBColorSpace; }
  _r.setSize(size, size, false);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6)); const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(1, 2, 3); sc.add(d);
  const a = buildAvatar(cfg); sc.add(a);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20); cam.position.set(0.35, 1.05, 2.1); cam.lookAt(0, 0.72, 0);
  _r.render(sc, cam);
  return _r.domElement.toDataURL('image/png');
}
