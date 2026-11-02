// Bàn cờ 3D bằng Three.js – mọi mô hình (đảo, ô đất, nhà, landmark, quân cờ, cây) đều dựng bằng code.
import * as THREE from '../lib/three.module.min.js';
import { OrbitControls } from '../lib/OrbitControls.js';
import { SQUARES, N, GROUPS, money } from './board.js';

const L = 9.8, CW = 1.4, TILE_H = 0.14;
export function cellRect(i) {
  if (i === 0) return [L - CW, L - CW, L, L, null];
  if (i < 8) { const x1 = L - CW - (i - 1); return [x1 - 1, L - CW, x1, L, 'top']; }
  if (i === 8) return [0, L - CW, CW, L, null];
  if (i < 16) { const y1 = L - CW - (i - 9); return [0, y1 - 1, CW, y1, 'right']; }
  if (i === 16) return [0, 0, CW, CW, null];
  if (i < 24) { const x0 = CW + (i - 17); return [x0, 0, x0 + 1, CW, 'bottom']; }
  if (i === 24) return [L - CW, 0, L, CW, null];
  const y0 = CW + (i - 25); return [L - CW, y0, L, y0 + 1, 'left'];
}
const W3 = (x, y) => new THREE.Vector3(x - L / 2, 0, y - L / 2); // toạ độ bàn → thế giới 3D
const col = c => new THREE.Color(c);
const BASE = { start: '#ffd86b', island: '#8fdcf5', festival: '#ff9cc9', travel: '#b2bdff', chance: '#ffe1dc', chest: '#fff3b0', tax: '#ffdede', resort: '#e3f8fc', city: '#fffdf6' };

// ---------- sân giữa ----------
function plazaTexture() {
  const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d');
  c.fillStyle = '#fffaf0'; c.fillRect(0, 0, S, S);
  c.strokeStyle = '#e9dcc0'; c.lineWidth = 10; c.strokeRect(14, 14, S - 28, S - 28);
  // tờ tiền bay (vẽ đơn giản)
  const bill = (x, y, r, s2 = 1) => { c.save(); c.translate(x, y); c.rotate(r); c.scale(s2, s2); c.fillStyle = '#f0a040'; c.fillRect(-70, -32, 140, 64); c.strokeStyle = '#b86a14'; c.lineWidth = 5; c.strokeRect(-62, -24, 124, 48); c.fillStyle = '#b86a14'; c.font = '900 40px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('₫', 0, 3); c.restore(); };
  bill(250, 230, -0.5); bill(380, 330, 0.3, 0.8); bill(700, 760, 0.6, 0.9); bill(820, 600, -0.3, 0.75); bill(560, 220, 0.2, 0.7);
  // túi tiền
  c.save(); c.translate(512, 470); c.fillStyle = '#7a5230'; c.beginPath(); c.ellipse(0, 40, 120, 105, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#9b6b3e'; c.beginPath(); c.ellipse(-20, 20, 100, 90, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#7a5230'; c.beginPath(); c.moveTo(-45, -55); c.lineTo(45, -55); c.lineTo(25, -95); c.lineTo(-25, -95); c.closePath(); c.fill(); c.fillStyle = '#ffd54a'; c.fillRect(-55, -62, 110, 16);
  c.fillStyle = '#ffd54a'; c.font = '900 120px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('₫', -10, 40); c.restore();
  // chữ CỜ TỶ PHÚ! chéo, đỏ – hướng về người xem
  c.save(); c.translate(545, 600); c.rotate(-Math.PI / 4);
  c.font = '900 110px "Baloo 2", Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = 18; c.strokeStyle = '#ffffff'; c.strokeText('CỜ TỶ PHÚ!', 0, 0); c.fillStyle = '#d81b2a'; c.fillText('CỜ TỶ PHÚ!', 0, 0);
  c.font = '800 54px "Baloo 2", Nunito, sans-serif'; c.fillStyle = '#24314d'; c.fillText('Sài Gòn', 0, 80); c.restore();
  // ô đặt bài: Cơ hội (đỏ) và Khí vận (vàng)
  const pad = (x, y, color, text, fg) => { c.save(); c.translate(x, y); c.rotate(-Math.PI / 4); c.strokeStyle = color; c.lineWidth = 8; c.setLineDash([22, 14]); c.strokeRect(-115, -80, 230, 160); c.setLineDash([]);
    c.fillStyle = fg; c.font = '900 46px "Baloo 2", Nunito, sans-serif'; c.textAlign = 'center'; c.fillText(text, 0, text === 'CƠ HỘI' ? -105 : 140); c.restore(); };
  pad(250, 760, '#d81b2a', 'CƠ HỘI', '#d81b2a'); pad(775, 255, '#e0a800', 'KHÍ VẬN', '#c58f00');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex;
}
function cardTexture(deck) {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 220; const c = cv.getContext('2d');
  c.fillStyle = deck === 'chest' ? '#ffd54a' : '#e53935'; c.fillRect(0, 0, 320, 220); c.strokeStyle = '#fff'; c.lineWidth = 10; c.strokeRect(14, 14, 292, 192);
  c.fillStyle = deck === 'chest' ? '#5a3d00' : '#fff'; c.font = '900 54px "Baloo 2", Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(deck === 'chest' ? 'KHÍ VẬN' : 'CƠ HỘI', 160, 120);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// ---------- vẽ chữ lên mặt ô bằng canvas ----------
function tileTexture(i) {
  const q = SQUARES[i], [x0, y0, x1, y1, inner] = cellRect(i);
  const w = x1 - x0, h = y1 - y0, S = 220, cw = Math.round(w * S), ch = Math.round(h * S);
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const c = cv.getContext('2d');
  c.fillStyle = BASE[q.type]; c.fillRect(0, 0, cw, ch);
  // dải màu phía trong + giá
  const band = 0.28 * S;
  if (inner && (q.type === 'city' || q.type === 'resort')) {
    c.fillStyle = q.type === 'city' ? GROUPS[q.group].color : '#19b5c9';
    const r = inner === 'top' ? [0, 0, cw, band] : inner === 'bottom' ? [0, ch - band, cw, band] : inner === 'right' ? [cw - band, 0, band, ch] : [0, 0, band, ch];
    c.fillRect(...r);
    c.save(); c.translate(r[0] + r[2] / 2, r[1] + r[3] / 2); if (inner === 'left' || inner === 'right') c.rotate(-Math.PI / 2);
    c.fillStyle = '#fff'; c.font = `900 ${Math.round(S * 0.17)}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(money(q.price), 0, 2); c.restore();
  }
  // chữ tên: xoay theo cạnh để người ngồi ngoài đọc được
  const rot = -Math.PI / 4; // mọi chữ xoay về phía người xem (camera nhìn chéo từ góc Khởi hành)
  c.save(); c.translate(cw / 2, ch / 2 + (inner === 'top' ? band / 2 : inner === 'bottom' ? -band / 2 : 0)); if (inner === 'right') c.translate(-band / 2, 0); if (inner === 'left') c.translate(band / 2, 0);
  c.rotate(rot); c.textAlign = 'center'; c.textBaseline = 'middle';
  const corner = !inner;
  if (q.icon) { c.font = `${Math.round(S * (corner ? 0.6 : 0.34))}px serif`; c.fillText(q.icon, 0, -S * (corner ? 0.2 : 0.18)); }
  c.fillStyle = '#24314d'; c.font = `900 ${Math.round(S * (corner ? 0.2 : 0.155))}px Nunito, sans-serif`;
  const words = q.name.replace('Cách Mạng Tháng 8', 'CM Tháng 8').split(' '); const lines = []; let cur = '';
  const maxW = (corner ? 1.5 : 1.05) * S;
  for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t; } lines.push(cur);
  const lh = S * (corner ? 0.22 : 0.17), y0t = (q.icon ? S * (corner ? 0.16 : 0.12) : 0) - (lines.length - 1) * lh / 2;
  lines.forEach((ln, k) => c.fillText(ln, 0, y0t + k * lh));
  c.restore();
  c.strokeStyle = '#0000001a'; c.lineWidth = 4; c.strokeRect(2, 2, cw - 4, ch - 4);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex;
}
function labelSprite(text, bg, fg = '#fff', scale = 0.5) {
  const cv = document.createElement('canvas'); const c = cv.getContext('2d'); const f = 56; c.font = `900 ${f}px Nunito, sans-serif`;
  const w = Math.ceil(c.measureText(text).width) + 30; cv.width = w; cv.height = f + 22; c.font = `900 ${f}px Nunito, sans-serif`;
  c.fillStyle = bg; const r = 18; c.beginPath(); c.roundRect(0, 0, w, cv.height, r); c.fill(); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, cv.height / 2 + 3);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false })); sp.scale.set(scale * w / cv.height, scale, 1); sp.renderOrder = 10; return sp;
}
function emojiSprite(e, size = 0.6) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'); c.font = '100px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, 64, 72);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false })); sp.scale.set(size, size, 1); return sp;
}
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.75, metalness: 0, ...o });

export class Board3D {
  constructor(container, api = {}) {
    this.api = api; this.el = container; this.tiles = []; this.bld = {}; this.pawns = {}; this.anims = [];
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, devicePixelRatio)); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    container.appendChild(r.domElement);
    const sc = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    this.controls = new OrbitControls(this.camera, r.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, minPolarAngle: 0.25, maxPolarAngle: 1.15, minDistance: 7, maxDistance: 30, enablePan: true, screenSpacePanning: false });
    // ánh sáng
    sc.add(new THREE.HemisphereLight(0xdff4ff, 0x6b8f4a, 1.1));
    const sun = this.sun = new THREE.DirectionalLight(0xfff2d6, 2.2); sun.position.set(-8, 14, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    sc.add(sun);
    this.buildIsland(); this.buildTiles(); this.buildDecor();
    // vẽ lại chữ trên ô khi font Nunito tải xong
    if (document.fonts) document.fonts.load('900 40px Nunito').then(() => this.tiles.forEach((t, i) => { t.mesh.material[2].map.dispose(); t.mesh.material[2].map = tileTexture(i); t.mesh.material[2].needsUpdate = true; })).catch(() => {});
    this.ray = new THREE.Raycaster(); this.mouse = new THREE.Vector2();
    let down = null;
    r.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    r.domElement.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) this.click(e); down = null; });
    this.controls.addEventListener('start', () => { this.userMoved = true; clearTimeout(this.umt); });
    this.controls.addEventListener('end', () => { clearTimeout(this.umt); this.umt = setTimeout(() => { this.userMoved = false; }, 6000); });
    this.resize(); addEventListener('resize', () => this.resize());
    this.clock = new THREE.Clock();
    r.setAnimationLoop(() => this.frame());
  }
  resize() {
    const w = this.el.clientWidth || innerWidth, h = this.el.clientHeight || innerHeight;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const portrait = h > w;
    // đặt camera chéo góc như ZingPlay, lùi xa vừa đủ thấy trọn bàn; màn dọc thì nhìn cao hơn cho dễ đọc
    const vf = THREE.MathUtils.degToRad(this.camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * w / h);
    const pol = portrait ? 0.42 : 0.9, az = Math.PI / 4;
    const rW = L * 0.74, rH = L * 0.74 * (portrait ? 0.95 : Math.cos(pol) * 0.9 + 0.25);
    const dist = Math.max(rW / Math.tan(hf / 2), rH / Math.tan(vf / 2)) * (portrait ? 0.9 : 0.8);
    this.homeDist = dist; this.homePol = pol; this.tOff = portrait ? 0.3 : 0.9; // dời tâm nhìn để bàn nằm cao hơn, chừa chỗ cho bảng điều khiển
    this.controls.maxDistance = dist * 1.6;
    this.camera.position.set(Math.sin(pol) * Math.sin(az) * dist, Math.cos(pol) * dist, Math.sin(pol) * Math.cos(az) * dist);
    this.controls.target.set(this.tOff, -0.3, this.tOff); this.controls.update();
  }
  buildIsland() {
    const s = L + 0.8, top = new THREE.Group();
    const grass = new THREE.Mesh(new THREE.BoxGeometry(s, 0.35, s), [std('#8a5a32'), std('#8a5a32'), std('#6cc46f'), std('#6b4226'), std('#8a5a32'), std('#7a4b2a')]);
    grass.position.y = -0.175; grass.receiveShadow = true; top.add(grass);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(s + 0.02, 0.08, s + 0.02), std('#5cb85f')); rim.position.y = -0.02; rim.receiveShadow = true; top.add(rim);
    const dirt = new THREE.Mesh(new THREE.BoxGeometry(s - 0.1, 0.9, s - 0.1), std('#7a4b2a', { roughness: 1 })); dirt.position.y = -0.8; top.add(dirt);
    // đá lơ lửng phía dưới
    const rock = new THREE.Mesh(new THREE.ConeGeometry(s * 0.55, 3.2, 7), std('#6b5a4e', { roughness: 1, flatShading: true })); rock.rotation.x = Math.PI; rock.position.y = -2.85; top.add(rock);
    const rock2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.6, 6), std('#7d6b5e', { flatShading: true })); rock2.rotation.x = Math.PI; rock2.position.set(3.6, -2.2, 2.8); top.add(rock2);
    // sân giữa: kiểu bàn cờ tỷ phú Việt Nam – nền kem, chữ CỜ TỶ PHÚ! đỏ chéo, tiền bay
    const PS = L - 2 * CW - 0.2;
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(PS, 0.06, PS), [std('#e8dfc8'), std('#e8dfc8'), new THREE.MeshStandardMaterial({ map: plazaTexture(), roughness: 0.9 }), std('#e8dfc8'), std('#e8dfc8'), std('#e8dfc8')]);
    plaza.position.y = 0.03; plaza.receiveShadow = true; top.add(plaza);
    this.scene.add(top); this.island = top;
  }
  buildTiles() {
    for (let i = 0; i < N; i++) {
      const [x0, y0, x1, y1] = cellRect(i), g = 0.05, w = x1 - x0 - 2 * g, d = y1 - y0 - 2 * g;
      const side = std('#e9e2d2');
      const mats = [side, side, new THREE.MeshStandardMaterial({ map: tileTexture(i), roughness: 0.85 }), side, side, side];
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, TILE_H, d), mats); const c = W3((x0 + x1) / 2, (y0 + y1) / 2);
      m.position.set(c.x, TILE_H / 2, c.z); m.castShadow = true; m.receiveShadow = true; m.userData.i = i;
      this.scene.add(m);
      const own = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, TILE_H * 0.7, d + 0.08), std('#ffffff')); own.position.set(c.x, TILE_H * 0.35, c.z); own.visible = false; this.scene.add(own);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.02, d + 0.06), new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.0, depthWrite: false })); glow.position.set(c.x, TILE_H + 0.02, c.z); this.scene.add(glow);
      this.tiles[i] = { mesh: m, own, glow, c, w, d };
    }
  }
  buildDecor() {
    const tree = (x, z, s = 1, palm = false) => {
      const g = new THREE.Group(); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.09 * s, 0.6 * s, 6), std('#8d5a3b')); trunk.position.y = 0.3 * s; trunk.castShadow = true; g.add(trunk);
      if (palm) { for (let k = 0; k < 6; k++) { const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09 * s, 0.7 * s, 4), std('#3fa85a', { flatShading: true })); leaf.position.set(Math.cos(k) * 0.25 * s, 0.62 * s, Math.sin(k) * 0.25 * s); leaf.rotation.z = Math.cos(k) * 1.3; leaf.rotation.x = -Math.sin(k) * 1.3; leaf.castShadow = true; g.add(leaf); } }
      else { [[0, 0.75, 0.42], [0.18, 0.95, 0.3], [-0.15, 1.05, 0.26]].forEach(([dx, y, r]) => { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 0), std('#4caf5e', { flatShading: true })); b.position.set(dx * s, y * s, 0); b.castShadow = true; g.add(b); }); }
      g.position.set(x, 0.06, z); this.scene.add(g);
    };
    const R = (L - 2 * CW) / 2 - 0.6;
    tree(-R, -R, 0.9); tree(R, R, 0.9, true); tree(R * 0.15, -R * 1.02, 0.6, true); tree(-R * 1.02, R * 0.1, 0.6);
    // chồng bài Cơ hội & Khí vận nằm trên sân giữa
    this.piles = {};
    const pileAt = (deck, bx, by) => {
      const g = new THREE.Group(); const tex = cardTexture(deck);
      for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.025, 0.7), [std('#fff'), std('#fff'), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), std('#fff'), std('#fff'), std('#fff')]); m.position.y = 0.075 + k * 0.028; m.rotation.y = (Math.random() - 0.5) * 0.08; m.castShadow = m.receiveShadow = true; g.add(m); }
      const w = W3(bx, by); g.position.set(w.x, 0, w.z); g.rotation.y = Math.PI / 4; this.scene.add(g); this.piles[deck] = { g, tex };
    };
    const PS = L - 2 * CW - 0.2, u = v2 => CW + 0.1 + v2 * PS;
    pileAt('chance', u(250 / 1024), u(760 / 1024)); pileAt('chest', u(775 / 1024), u(255 / 1024));
  }
  // ---------- mô hình nhà ----------
  house(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.3), std('#fff6e6')); body.position.y = 0.13; body.castShadow = body.receiveShadow = true; g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 4), std(color, { flatShading: true })); roof.position.y = 0.36; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.01), std('#8d5a3b')); door.position.set(0, 0.06, 0.151); g.add(door);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.07, 0.07), std('#9fd3ff', { emissive: 0x335577 })); win.position.set(0.151, 0.16, 0); g.add(win);
    return g;
  }
  tower(color) {
    const g = new THREE.Group(); const c = col(color);
    const glass = new THREE.MeshStandardMaterial({ color: c.clone().lerp(new THREE.Color('#bfe3ff'), 0.45), roughness: 0.15, metalness: 0.4 });
    [[0.5, 0.46, 0.55, 0], [0.42, 0.38, 0.5, 0.55], [0.34, 0.28, 0.45, 1.05], [0.26, 0.2, 0.35, 1.5]].forEach(([b, t, h, y]) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(t / Math.SQRT2, b / Math.SQRT2, h, 4), glass); m.rotation.y = Math.PI / 4; m.position.y = y + h / 2; m.castShadow = true; g.add(m);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(t / Math.SQRT2 + 0.01, t / Math.SQRT2 + 0.01, 0.04, 4), std(color)); band.rotation.y = Math.PI / 4; band.position.y = y + h; g.add(band);
    });
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), std('#ffd54a', { metalness: 0.6, roughness: 0.3, emissive: 0x553300 })); spire.position.y = 2.1; spire.rotation.y = Math.PI / 4; spire.castShadow = true; g.add(spire);
    const star = new THREE.PointLight(0xffd54a, 1.2, 2); star.position.y = 2.4; g.add(star);
    return g;
  }
  flag(color) {
    const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6), std('#6d4c41')); pole.position.y = 0.3; pole.castShadow = true; g.add(pole);
    const fl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.01), std(color)); fl.position.set(0.13, 0.5, 0); fl.castShadow = true; g.add(fl); g.userData.flag = fl; return g;
  }
  sync(v) {
    this.lastView = v;
    for (let i = 0; i < N; i++) {
      const q = SQUARES[i]; if (q.type !== 'city' && q.type !== 'resort') continue;
      const pr = v.props[i], owner = pr && v.players.find(p => p.id === pr.owner);
      const key = pr ? `${pr.owner}|${pr.level}|${owner.color}|${v.festival === i}|${v.rents[i]}` : '';
      if (this.bld[i] && this.bld[i].key === key) continue;
      if (this.bld[i]) this.bld[i].objs.forEach(o => this.scene.remove(o));
      const t = this.tiles[i], objs = [];
      t.own.visible = !!pr; if (pr) t.own.material.color.set(owner.color);
      if (pr) {
        const at = (o, dx = 0, dz = 0) => { o.position.set(t.c.x + dx, TILE_H, t.c.z + dz); this.scene.add(o); objs.push(o); return o; };
        if (q.type === 'resort' || pr.level === 0) at(this.flag(owner.color), 0.25, 0.1);
        else if (pr.level === 4) { const tw = at(this.tower(owner.color)); tw.scale.setScalar(0.85); this.pop(tw); }
        else { const offs = [[0, 0], [-0.28, 0.2], [0.28, 0.2]]; for (let h = 0; h < pr.level; h++) this.pop(at(this.house(owner.color), offs[h][0] * (t.w > t.d ? 1 : 0.6), offs[h][1] * (t.w > t.d ? 0.6 : 1))); }
        const lb = labelSprite(money(v.rents[i]), owner.color, '#fff', 0.26); lb.position.set(t.c.x, TILE_H + 0.75, t.c.z); this.scene.add(lb); objs.push(lb);
        if (v.festival === i) { const fe = emojiSprite('🎉', 0.6); fe.position.set(t.c.x, TILE_H + 1.15, t.c.z); fe.userData.bob = true; this.scene.add(fe); objs.push(fe); }
      }
      this.bld[i] = { key, objs };
    }
    for (const p of v.players) { if (!this.pawns[p.id]) this.pawns[p.id] = this.makePawn(p); this.pawns[p.id].visible = !p.out; }
  }
  pop(o) { const s = o.scale.x; o.scale.setScalar(0.01); this.tween(400, t => o.scale.setScalar(s * (t < 0.7 ? t / 0.7 * 1.15 : 1.15 - (t - 0.7) / 0.3 * 0.15))); }
  makePawn(p) {
    const g = new THREE.Group();
    const pts = [[0, 0], [0.2, 0], [0.21, 0.04], [0.17, 0.07], [0.12, 0.1], [0.08, 0.3], [0.11, 0.33], [0.07, 0.36], [0, 0.36]].map(([x, y]) => new THREE.Vector2(x, y));
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), std(p.color, { roughness: 0.35, metalness: 0.1 })); body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), std(p.color, { roughness: 0.3 })); head.position.y = 0.46; head.castShadow = true; g.add(head);
    const av = emojiSprite(p.avatar || '🙂', 0.42); av.position.y = 0.86; g.add(av);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 24), new THREE.MeshBasicMaterial({ color: col(p.color) })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.86; ring.scale.set(1.25, 1.25, 1.25); ring.visible = false; g.add(ring);
    g.userData = { av, ring, hop: 0 };
    this.scene.add(g); return g;
  }
  pawnXZ(i, k, n) { const t = this.tiles[i]; const off = [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.2], [0.22, 0.2]][k] || [0, 0]; return n > 1 ? [t.c.x + off[0], t.c.z + off[1]] : [t.c.x, t.c.z]; }
  placePawn(id, i, k, n, ms = 0, hop = 0) {
    const g = this.pawns[id]; if (!g) return Promise.resolve();
    const [x, z] = this.pawnXZ(i, k, n), sx = g.position.x, sz = g.position.z;
    if (!ms) { g.position.set(x, TILE_H, z); return Promise.resolve(); }
    return this.tween(ms, t => { const e = t * t * (3 - 2 * t); g.position.set(sx + (x - sx) * e, TILE_H + Math.sin(Math.PI * t) * hop, sz + (z - sz) * e); });
  }
  hop(id, i, ms) { return this.placePawn(id, i, 0, 1, ms, 0.45); }
  fly(id, i, ms) { return this.placePawn(id, i, 0, 1, ms, 3); }
  setTurn(id) { for (const k in this.pawns) this.pawns[k].userData.ring.visible = k === id; }
  resetPawns() { for (const k in this.pawns) this.scene.remove(this.pawns[k]); this.pawns = {}; }
  follow(id) { this.following = id; }
  shake() { const cam = this.camera; this.tween(450, t => { const a = (1 - t) * 0.12; cam.position.x += (Math.random() - 0.5) * a; cam.position.y += (Math.random() - 0.5) * a; }); }
  drawCard(deck) { // lá bài bay lên khỏi chồng, lật về phía camera
    const pile = this.piles[deck]; if (!pile) return Promise.resolve();
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.025, 0.7), [std('#fff'), std('#fff'), new THREE.MeshStandardMaterial({ map: pile.tex }), std('#fff'), std('#fff'), std('#fff')]);
    m.castShadow = true; const st = pile.g.position.clone(); st.y = 0.3; m.position.copy(st); m.rotation.y = Math.PI / 4; this.scene.add(m);
    const cam = this.camera.position, end = st.clone().lerp(new THREE.Vector3(cam.x, cam.y, cam.z), 0.35);
    return this.tween(700, t => { const e = 1 - Math.pow(1 - t, 3); m.position.lerpVectors(st, end, e); m.position.y += Math.sin(Math.PI * t) * 0.8; m.rotation.x = e * (Math.PI / 2 - 0.35); m.scale.setScalar(1 + e * 0.6); })
      .then(() => new Promise(r => setTimeout(r, 350))).then(() => this.tween(350, t => { m.scale.setScalar(1.6 * (1 - t) + 0.01); })).then(() => this.scene.remove(m));
  }
  celebrate(id) { const p = this.pawns[id]; if (!p) return; this.following = id; let k = 0; const iv = setInterval(() => { const i = this.tiles.findIndex(t => Math.hypot(t.c.x - p.position.x, t.c.z - p.position.z) < 0.8); this.burst(i < 0 ? 0 : i, ['#ff5a5f', '#ffd54a', '#2fc76f', '#3d8bff'][k % 4], 60); if (++k > 6) clearInterval(iv); }, 350); this.tween(2400, t => { p.rotation.y = t * Math.PI * 4; }); }
  // ---------- hiệu ứng ----------
  tween(ms, fn) { return new Promise(res => this.anims.push({ t0: performance.now(), ms, fn, res })); }
  burst(i, color = '#ffd54a', n = 40) {
    const t = this.tiles[i]; if (!t) return;
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
    for (let k = 0; k < n; k++) { pos[k * 3] = t.c.x; pos[k * 3 + 1] = 0.5; pos[k * 3 + 2] = t.c.z; vel.push([(Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3]); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: col(color), size: 0.12, transparent: true })); this.scene.add(pts);
    this.tween(1100, tt => { for (let k = 0; k < n; k++) { pos[k * 3] += vel[k][0] * 0.016; pos[k * 3 + 1] += (vel[k][1] - 9 * tt) * 0.016; pos[k * 3 + 2] += vel[k][2] * 0.016; } geo.attributes.position.needsUpdate = true; pts.material.opacity = 1 - tt; }).then(() => this.scene.remove(pts));
  }
  floatAt(i, text, color = '#e53935') {
    const t = this.tiles[i]; if (!t) return; const sp = labelSprite(text, '#ffffff', color, 0.38); sp.position.set(t.c.x, 0.9, t.c.z); this.scene.add(sp);
    this.tween(1400, tt => { sp.position.y = 0.9 + tt * 1.4; sp.material.opacity = 1 - tt * tt; }).then(() => this.scene.remove(sp));
  }
  pulse(i) { const t = this.tiles[i]; if (!t) return; this.tween(700, tt => { t.glow.material.opacity = 0.7 * (1 - tt); }); }
  pick(options) { this.pickSet = options; this.tiles.forEach((t, i) => { t.picked = options.includes(i); }); }
  endPick() { this.pickSet = null; this.tiles.forEach(t => { t.picked = false; t.glow.material.opacity = 0; }); }
  click(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.mouse, this.camera);
    const hit = this.ray.intersectObjects(this.tiles.map(t => t.mesh))[0];
    if (hit && this.api.onCell) this.api.onCell(hit.object.userData.i);
  }
  focus(i) { // đưa camera về phía ô
    const t = this.tiles[i]; if (!t) return; const tg = this.controls.target, sx = tg.x, sz = tg.z;
    this.tween(600, tt => { tg.set(sx + (t.c.x * 0.35 - sx) * tt, -0.3, sz + (t.c.z * 0.35 - sz) * tt); });
  }
  frame() {
    const now = performance.now(), el = this.clock.getElapsedTime();
    this.anims = this.anims.filter(a => { const t = Math.min(1, (now - a.t0) / a.ms); a.fn(t); if (t >= 1) { a.res(); return false; } return true; });
    if (this.pickSet) this.tiles.forEach(t => { if (t.picked) t.glow.material.opacity = 0.35 + 0.3 * Math.sin(el * 6); });
    for (const k in this.pawns) { const u = this.pawns[k].userData; u.ring.rotation.z = el * 2; u.ring.position.y = 0.86 + Math.sin(el * 3) * 0.03; }
    for (const i in this.bld) this.bld[i].objs.forEach(o => { if (o.userData.bob) o.position.y = TILE_H + 1.15 + Math.sin(el * 4) * 0.08; if (o.userData.flag) o.userData.flag.rotation.y = Math.sin(el * 3 + +i) * 0.3; });
    if (this.water) this.water.scale.y = 1 + Math.sin(el * 5) * 0.2;
    // camera bám theo quân đang di chuyển: lia mục tiêu + kéo gần lại một chút
    const tg = this.controls.target, f = this.following && this.pawns[this.following];
    const want = f ? new THREE.Vector3(f.position.x * 0.55 + this.tOff, -0.3, f.position.z * 0.55 + this.tOff) : new THREE.Vector3(this.tOff, -0.3, this.tOff);
    tg.lerp(want, 0.06);
    if (this.homeDist && !this.userMoved) {
      const off = this.camera.position.clone().sub(tg); const d = off.length(), wd = this.homeDist * (f ? 0.78 : 1);
      off.multiplyScalar(1 + (wd / d - 1) * 0.05); this.camera.position.copy(tg).add(off);
    }
    this.controls.update(); this.renderer.render(this.scene, this.camera);
  }
}
