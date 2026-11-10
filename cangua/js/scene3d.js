// Bàn cờ cá ngựa 3D bằng Three.js – mọi mô hình (bàn, ô, bậc đích, chuồng, ngựa, cúp) dựng bằng code.
// Hiệu năng điện thoại: KHÔNG thêm/bớt đèn lúc chạy (đèn dựng sẵn, chỉ đổi cường độ), hạt dùng pool có giới hạn,
// vật liệu / hình học dùng chung.
import * as THREE from '../../shared/lib/three.module.min.js';
import { OrbitControls } from '../../shared/lib/OrbitControls.js';
import { COLORS, GATE, HOME0, onTrack, absSq } from './engine.js?v=3';

export const QUALITY = { low: { aa: false, pr: 1, shadow: 0, tex: 1024 }, med: { aa: true, pr: 1.5, shadow: 1024, tex: 1536 }, high: { aa: true, pr: 2, shadow: 2048, tex: 2048 } };
const FONT = '"Be Vietnam Pro", system-ui, sans-serif', TITLE = '"Baloo 2", "Be Vietnam Pro", system-ui, sans-serif';
const col = c => new THREE.Color(c);
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.7, metalness: 0, ...o });
const ease = t => t * t * (3 - 2 * t), easeOut = t => 1 - Math.pow(1 - t, 3);
const TH = 0.1, BAS = 0.07; // độ cao mặt ô, nền ngựa
const STEP_H = n => TH + n * 0.075;

// ---------- hình học bàn 15×15 ----------
const SIDE0 = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7]];
const rot = ([c, r], k) => { for (let i = 0; i < k; i++) [c, r] = [14 - r, c]; return [c, r]; };
export const trackCell = i => rot(SIDE0[i % 14], Math.floor(i / 14) % 4);
export const stepCell = (seat, n) => rot([7, n], seat);
const yardC = seat => rot([11.5, 2.5], seat);
const slotCell = (seat, h) => rot([10.7 + (h % 2) * 1.5, 1.7 + Math.floor(h / 2) * 1.5], seat);
const W = ([c, r], y = 0) => new THREE.Vector3(c - 7, y, r - 7);
export const seatAz = seat => Math.PI - seat * Math.PI / 2;

function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
const tint = (hex, k) => '#' + col(hex).lerp(col('#ffffff'), k).getHexString();
const shade = (hex, k) => '#' + col(hex).lerp(col('#000000'), k).getHexString();
const tex = cv => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

function boardCanvas(S) {
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d');
  const M = 0.3, U = S / (15 + 2 * M), X = v => (v + M) * U; // ô (c,r) bắt đầu tại X(c)
  c.fillStyle = '#c98a4b'; c.fillRect(0, 0, S, S);
  const g = c.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#fbefd6'); c.fillStyle = g; rrect(c, X(0) - 4, X(0) - 4, 15 * U + 8, 15 * U + 8, U * 0.4); c.fill();
  // sân chuồng
  for (let k = 0; k < 4; k++) {
    const [cc, cr] = yardC(k), x0 = X(cc - 3) + U * 0.12, y0 = X(cr - 3) + U * 0.12, w = 6 * U - U * 0.24, cl = COLORS[k];
    const gg = c.createRadialGradient(x0 + w / 2, y0 + w / 2, U, x0 + w / 2, y0 + w / 2, w * 0.75); gg.addColorStop(0, tint(cl, 0.55)); gg.addColorStop(1, tint(cl, 0.25));
    c.fillStyle = gg; rrect(c, x0, y0, w, w, U * 0.6); c.fill(); c.lineWidth = U * 0.12; c.strokeStyle = shade(cl, 0.15); c.stroke();
    c.fillStyle = '#ffffff55'; for (let i = 0; i < 40; i++) { const px = x0 + ((i * 97) % 100) / 100 * w, py = y0 + ((i * 53 + 17) % 100) / 100 * w; c.beginPath(); c.arc(px, py, U * 0.06, 0, 7); c.fill(); }
  }
  // trung tâm: 4 tam giác màu hướng vào giữa
  const cx = X(7.5), cy = X(7.5), h = 1.5 * U;
  [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy], k) => { c.fillStyle = tint(COLORS[k], 0.15); c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + dx * h - dy * h, cy + dy * h + dx * h); c.lineTo(cx + dx * h + dy * h, cy + dy * h - dx * h); c.closePath(); c.fill(); });
  // dải màu đường về đích
  for (let k = 0; k < 4; k++) for (let n = 1; n <= 5; n++) { const [sc, sr] = stepCell(k, n); c.fillStyle = tint(COLORS[k], 0.35); c.fillRect(X(sc) + U * 0.03, X(sr) + U * 0.03, U * 0.94, U * 0.94); }
  // bóng đổ dưới ô đường đua
  c.fillStyle = '#0000001a'; for (let i = 0; i < 56; i++) { const [tc, tr] = trackCell(i); rrect(c, X(tc) + U * 0.06, X(tr) + U * 0.1, U * 0.92, U * 0.92, U * 0.16); c.fill(); }
  // chữ
  c.textAlign = 'center'; c.textBaseline = 'middle';
  // (dòng 'fan-made phi thương mại' đã chuyển sang trang Credits)
  return cv;
}
function stepCanvas(color, n) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = color; c.fillRect(0, 0, 128, 128); c.fillStyle = '#ffffff30'; c.fillRect(0, 0, 128, 18);
  c.strokeStyle = '#ffffff99'; c.lineWidth = 6; rrect(c, 8, 8, 112, 112, 18); c.stroke();
  c.fillStyle = '#fff'; c.font = `800 78px ${TITLE}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#0006'; c.shadowBlur = 6; c.fillText(String(n), 64, 70);
  return cv;
}
function arrowCanvas() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#ffffffee'; c.beginPath(); c.moveTo(64, 16); c.lineTo(104, 62); c.lineTo(78, 62); c.lineTo(78, 108); c.lineTo(50, 108); c.lineTo(50, 62); c.lineTo(24, 62); c.closePath(); c.fill();
  return cv;
}
function textSprite(text, bg, fg = '#fff', h = 0.5) {
  const cv = document.createElement('canvas'), c = cv.getContext('2d'), f = 54; c.font = `800 ${f}px ${FONT}`;
  const w = Math.ceil(c.measureText(text).width) + 44; cv.width = w; cv.height = f + 30; c.font = `800 ${f}px ${FONT}`;
  c.fillStyle = bg; rrect(c, 0, 0, w, cv.height, cv.height / 2); c.fill(); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, cv.height / 2 + 3);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(cv), depthWrite: false, depthTest: false, transparent: true })); sp.scale.set(h * w / cv.height, h, 1); sp.renderOrder = 20; return sp;
}
// ô bo góc
function roundTile(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -w / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + w - r); s.quadraticCurveTo(x + w, y + w, x + w - r, y + w);
  s.lineTo(x + r, y + w); s.quadraticCurveTo(x, y + w, x, y + w - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1, curveSegments: 3 });
  g.rotateX(-Math.PI / 2); g.translate(0, 0.0, 0); return g;
}
// hình đầu ngựa (quân mã) – nhìn nghiêng, mặt hướng +x
function knightGeo() {
  const s = new THREE.Shape();
  s.moveTo(-0.2, 0); s.lineTo(0.2, 0); s.lineTo(0.17, 0.1);
  s.quadraticCurveTo(0.02, 0.2, 0.08, 0.33); s.lineTo(0.27, 0.42); s.quadraticCurveTo(0.35, 0.47, 0.29, 0.55);
  s.lineTo(0.12, 0.63); s.lineTo(0.07, 0.74); s.lineTo(0.0, 0.66); s.lineTo(-0.05, 0.72);
  s.quadraticCurveTo(-0.24, 0.6, -0.21, 0.33); s.quadraticCurveTo(-0.17, 0.16, -0.2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -0.08); g.computeVertexNormals(); return g;
}

export class Board3D {
  constructor(el, o = {}) {
    this.el = el; this.o = o; this.anims = []; this.horses = {}; this.cam = { mode: 'follow', focus: null, lastUser: 0, pinned: false };
    this.q = QUALITY[o.quality] ? o.quality : 'med'; this.fxOn = o.effects !== false; this.mySeat = 2; this.seats = new Set([0, 1, 2, 3]);
    this.scene = new THREE.Scene(); this.scene.background = col('#bfe6ff'); this.scene.fog = new THREE.Fog(0xbfe6ff, 30, 70);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150); this.camera.position.set(0, 16, 14);
    this.target = new THREE.Vector3();
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.initRenderer();
    this.buildLights(); this.buildBoard(); this.buildStables(); this.buildGoal(); this.buildHorses(); this.buildFx();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el); this.resize();
    this.clock = new THREE.Clock(); this.snap();
    this.renderer.setAnimationLoop(() => this.frame());
  }
  initRenderer() {
    const Q = QUALITY[this.q];
    if (this.renderer) { this.renderer.setAnimationLoop(null); this.renderer.dispose(); this.renderer.domElement.remove(); this.controls.dispose(); }
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: Q.aa, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(Q.pr, devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = !!Q.shadow; r.shadowMap.type = Q.shadow > 1024 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.el.appendChild(r.domElement); r.domElement.style.touchAction = 'none';
    const ctl = this.controls = new OrbitControls(this.camera, r.domElement);
    Object.assign(ctl, { enableDamping: true, dampingFactor: 0.09, minPolarAngle: 0.05, maxPolarAngle: 1.2, minDistance: 5, maxDistance: 40, enablePan: true, screenSpacePanning: false, zoomSpeed: 0.9, rotateSpeed: 0.7 });
    // chuột trái kéo = di bản đồ, chuột phải kéo = xoay, lăn = phóng to (cảm ứng giữ nguyên)
    ctl.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }; ctl.screenSpacePanning = false;
    ctl.target.copy(this.target);
    ctl.addEventListener('start', () => { this.cam.mode = 'free'; this.cam.lastUser = performance.now(); this.o.onCamera && this.o.onCamera('free'); });
    ctl.addEventListener('change', () => { if (this.cam.mode === 'free') this.cam.lastUser = performance.now(); });
    let down = null;
    r.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    r.domElement.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 8 && this.o.onTap) this.o.onTap(e.clientX, e.clientY); down = null; });
    if (this.sun) { this.sun.shadow.mapSize.set(Q.shadow || 512, Q.shadow || 512); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
    if (this.clock) { r.setAnimationLoop(() => this.frame()); this.resize(); }
  }
  setQuality(q) {
    if (!QUALITY[q] || q === this.q) return; this.q = q; this.initRenderer();
    const m = this.boardTop; if (m.map) m.map.dispose(); m.map = tex(boardCanvas(QUALITY[q].tex)); m.needsUpdate = true;
  }
  setEffects(on) { this.fxOn = !!on; }
  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xeaf6ff, 0x7a8f5a, 1.05); this.scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xfff1d6, 2.2); sun.position.set(-7, 14, 6); sun.castShadow = true;
    const Q = QUALITY[this.q]; sun.shadow.mapSize.set(Q.shadow || 512, Q.shadow || 512);
    Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    this.scene.add(sun); this.scene.add(sun.target);
    // đèn pháo hoa / đá ngựa: dựng sẵn, chỉ đổi cường độ (thêm/bớt đèn làm biên dịch lại shader → tụt FPS)
    this.flash = [0, 1].map(() => { const l = new THREE.PointLight(0xffffff, 0, 7, 1.5); this.root.add(l); return l; }); this.flashI = 0;
  }
  // ---------- bàn ----------
  buildBoard() {
    const B = 15.6;
    this.boardTop = new THREE.MeshStandardMaterial({ map: tex(boardCanvas(QUALITY[this.q].tex)), roughness: 0.85 });
    const wood = std('#b97a3f', { roughness: 0.6 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(B, 0.5, B), [wood, wood, this.boardTop, wood, wood, wood]); base.position.y = -0.25; base.receiveShadow = true; this.root.add(base);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 40), std('#8fd27a', { roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.52; ground.receiveShadow = true; this.root.add(ground);
    // ô đường đua: 1 InstancedMesh, màu theo từng ô
    const tg = roundTile(0.84, TH - 0.03, 0.14);
    const tm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
    const im = this.tilesIM = new THREE.InstancedMesh(tg, tm, 56); im.receiveShadow = true; im.castShadow = !!QUALITY[this.q].shadow;
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 56; i++) {
      const p = W(trackCell(i), 0.015); m4.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(i, m4);
      const seat = Math.floor(i / 14), j = i % 14;
      im.setColorAt(i, col(j === 0 ? COLORS[seat] : j === 13 ? tint(COLORS[(seat + 1) % 4], 0.55) : '#ffffff'));
    }
    this.root.add(im);
    // mũi tên ô xuất quân + cổng ở ô cửa đích
    const at = tex(arrowCanvas()), am = new THREE.MeshBasicMaterial({ map: at, transparent: true, depthWrite: false });
    const ag = new THREE.PlaneGeometry(0.62, 0.62);
    this.gates = [];
    for (let k = 0; k < 4; k++) {
      const s0 = W(trackCell(k * 14)), s1 = W(trackCell(k * 14 + 1));
      const a = new THREE.Mesh(ag, am); a.rotation.x = -Math.PI / 2; a.rotation.z = Math.atan2(-(s1.x - s0.x), -(s1.z - s0.z)); a.position.set(s0.x, TH + 0.012, s0.z); this.root.add(a);
      // cổng chào ở ô cửa đích (ô ngay trước ô xuất quân)
      const g = new THREE.Group(), gp = W(trackCell((k * 14 + 55) % 56)), inward = W([7, 7]).sub(gp).normalize();
      const post = new THREE.CylinderGeometry(0.035, 0.04, 0.9, 6), pm = std(COLORS[k], { roughness: 0.4 });
      for (const sgn of [-1, 1]) { const m = new THREE.Mesh(post, pm); m.position.set(sgn * 0.46, 0.45, 0); m.castShadow = true; g.add(m); }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.1, 0.08), pm); bar.position.y = 0.92; bar.castShadow = true; g.add(bar);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.02), std('#ffffff')); flag.position.set(0, 1.1, 0); g.add(flag); g.userData.flag = flag;
      g.position.copy(gp).add(inward.clone().multiplyScalar(0.48)); g.rotation.y = Math.atan2(inward.x, inward.z); this.root.add(g); this.gates.push(g);
    }
    // bậc đích 1–6, cao dần về giữa
    this.steps = [];
    const side = std('#ffffff', { roughness: 0.5 });
    for (let k = 0; k < 4; k++) for (let n = 1; n <= 6; n++) {
      const h = STEP_H(n), top = new THREE.MeshStandardMaterial({ map: tex(stepCanvas(COLORS[k], n)), roughness: 0.5 });
      const sm = std(tint(COLORS[k], 0.25), { roughness: 0.5 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.9), [sm, sm, top, side, sm, sm]); const p = W(stepCell(k, n)); m.position.set(p.x, h / 2, p.z);
      m.rotation.y = -k * Math.PI / 2; m.castShadow = m.receiveShadow = true; this.root.add(m); this.steps.push(m);
    }
    void side;
  }
  buildStables() {
    this.stables = [];
    const wood = std('#a8743d'), roofs = COLORS.map(c => std(c, { flatShading: true, roughness: 0.6 })), wall = std('#fff3dc'), padG = new THREE.CylinderGeometry(0.42, 0.45, 0.05, 24);
    const postG = new THREE.BoxGeometry(0.07, 0.42, 0.07), railG = new THREE.BoxGeometry(1, 0.05, 0.04);
    const posts = new THREE.InstancedMesh(postG, wood, 4 * 16), rails = new THREE.InstancedMesh(railG, wood, 4 * 8);
    let pi = 0, ri = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    for (let k = 0; k < 4; k++) {
      const g = new THREE.Group(); this.root.add(g);
      const c0 = W(rot([11.45, 2.45], k)); // tâm hàng rào
      const plat = new THREE.Mesh(roundTile(3.3, 0.06, 0.35), std(tint(COLORS[k], 0.6), { roughness: 0.9 })); plat.position.set(c0.x, 0.0, c0.z); plat.receiveShadow = true; g.add(plat);
      // hàng rào 4 cạnh, chừa cổng phía ô xuất quân
      const half = 1.6;
      for (let s = 0; s < 4; s++) {
        const ang = s * Math.PI / 2; q.setFromAxisAngle(up, ang);
        for (let t = 0; t < 4; t++) {
          const u = -half + t * (2 * half / 3), lx = Math.cos(ang) * u - Math.sin(ang) * half, lz = -Math.sin(ang) * u - Math.cos(ang) * half;
          m4.compose(new THREE.Vector3(c0.x + lx, 0.25, c0.z + lz), q, sc); posts.setMatrixAt(pi++, m4);
        }
        for (const y of [0.18, 0.36]) { const lx = -Math.sin(ang) * half, lz = -Math.cos(ang) * half; m4.compose(new THREE.Vector3(c0.x + lx, y, c0.z + lz), q, new THREE.Vector3(3.2, 1, 1)); rails.setMatrixAt(ri++, m4); }
      }
      // ô đứng của 4 ngựa
      const pads = [];
      for (let h = 0; h < 4; h++) { const p = W(slotCell(k, h)); const m = new THREE.Mesh(padG, std(tint(COLORS[k], 0.3), { roughness: 0.5 })); m.position.set(p.x, 0.04, p.z); m.receiveShadow = true; g.add(m); pads.push(m); }
      // chuồng ngựa nhỏ ở góc ngoài
      const bc = W(rot([13.55, 0.6], k)), barn = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.62, 0.8), wall); body.position.y = 0.31; body.castShadow = true; barn.add(body);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.8, 0.45, 4, 1), roofs[k]); roof.position.y = 0.85; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.85); roof.castShadow = true; barn.add(roof);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.02), std(shade(COLORS[k], 0.2))); door.position.set(0, 0.21, 0.41); barn.add(door);
      const hay = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 12), std('#f1c75b')); hay.rotation.z = Math.PI / 2; hay.position.set(0.72, 0.18, 0.1); hay.castShadow = true; barn.add(hay);
      barn.position.copy(bc); barn.rotation.y = seatAz(k) + Math.PI / 4 + Math.PI; g.add(barn);
      // vòng sáng báo lượt
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.06, 6, 48), new THREE.MeshBasicMaterial({ color: col(COLORS[k]), transparent: true, opacity: 0 })); ring.rotation.x = Math.PI / 2; ring.position.set(c0.x, 0.08, c0.z); g.add(ring);
      this.stables.push({ g, pads, ring, plat });
    }
    posts.count = pi; rails.count = ri; posts.castShadow = rails.castShadow = true; this.root.add(posts, rails);
  }
  buildGoal() {
    const g = this.goal = new THREE.Group(), gold = std('#ffc928', { metalness: 0.75, roughness: 0.28, emissive: 0x3a2800 });
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, STEP_H(6) + 0.08, 24), std('#fffaf0', { roughness: 0.4 })); ped.position.y = (STEP_H(6) + 0.08) / 2; ped.castShadow = ped.receiveShadow = true; g.add(ped);
    const pts = [[0.0, 0], [0.22, 0], [0.22, 0.05], [0.07, 0.1], [0.05, 0.3], [0.1, 0.36], [0.3, 0.5], [0.34, 0.78], [0.3, 0.8], [0.0, 0.62]].map(([x, y]) => new THREE.Vector2(x, y));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), gold); cup.position.y = STEP_H(6) + 0.08; cup.castShadow = true; g.add(cup);
    for (const s of [-1, 1]) { const hd = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 14, Math.PI * 1.3), gold); hd.position.set(s * 0.34, STEP_H(6) + 0.72, 0); hd.rotation.z = s > 0 ? -Math.PI / 2.4 : Math.PI + Math.PI / 2.4; g.add(hd); }
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshBasicMaterial({ color: 0xfff1a8 })); star.position.y = STEP_H(6) + 1.1; g.add(star); this.star = star;
    this.root.add(g);
  }
  buildHorses() {
    const kg = knightGeo(), baseG = new THREE.CylinderGeometry(0.25, 0.29, BAS, 22), collarG = new THREE.TorusGeometry(0.23, 0.03, 6, 22), eyeG = new THREE.SphereGeometry(0.03, 8, 6), maneG = new THREE.BoxGeometry(0.1, 0.36, 0.08);
    const ringG = new THREE.TorusGeometry(0.42, 0.065, 6, 28), arrowG = new THREE.ConeGeometry(0.16, 0.34, 10), hitG = null; void hitG;
    const white = std('#fffaf0', { roughness: 0.35 }), eyeM = new THREE.MeshBasicMaterial({ color: 0x1b1b2a });
    for (let k = 0; k < 4; k++) {
      const body = std(COLORS[k], { roughness: 0.32, metalness: 0.05 }), mane = std(shade(COLORS[k], 0.35), { roughness: 0.5 });
      const rm = new THREE.MeshBasicMaterial({ color: 0xffe14d }), arm = new THREE.MeshBasicMaterial({ color: 0xffe14d });
      this.horses[k] = [0, 1, 2, 3].map(h => {
        const g = new THREE.Group(), fig = new THREE.Group(); g.add(fig); fig.scale.setScalar(1.18);
        const b = new THREE.Mesh(baseG, white); b.position.y = BAS / 2; fig.add(b);
        const cl = new THREE.Mesh(collarG, body); cl.rotation.x = Math.PI / 2; cl.position.y = BAS; fig.add(cl);
        const kn = new THREE.Mesh(kg, body); kn.position.y = BAS; kn.scale.setScalar(1.05); fig.add(kn);
        const mn = new THREE.Mesh(maneG, mane); mn.position.set(-0.16, BAS + 0.46, 0); mn.rotation.z = -0.35; fig.add(mn);
        for (const s of [-1, 1]) { const e = new THREE.Mesh(eyeG, eyeM); e.position.set(0.13, BAS + 0.56, s * 0.12); fig.add(e); }
        fig.traverse(m => { if (m.isMesh) { m.castShadow = true; } });
        const ring = new THREE.Mesh(ringG, rm); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; ring.visible = false; g.add(ring);
        const arrow = new THREE.Mesh(arrowG, arm); arrow.rotation.x = Math.PI; arrow.position.y = 1.35; arrow.visible = false; g.add(arrow);
        g.userData = { fig, ring, arrow, seat: k, h, pos: -1 };
        const p = this.posOf(k, h, -1); g.position.copy(p); g.rotation.y = this.restYaw(k, -1);
        this.root.add(g); return g;
      });
    }
    // điểm đích sáng (pool): vòng sáng + ngựa ma mờ + nhãn số bước (đỏ = đá ngựa)
    const mg = new THREE.RingGeometry(0.26, 0.46, 28), dg = new THREE.CircleGeometry(0.24, 20);
    this.marks = Array.from({ length: 16 }, () => {
      const g = new THREE.Group(), m = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.9, depthWrite: false })), d = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
      m.rotation.x = d.rotation.x = -Math.PI / 2; g.add(m, d); g.visible = false; g.renderOrder = 5;
      const gm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, depthWrite: false });
      const ghost = new THREE.Group(), gb = new THREE.Mesh(baseG, gm), gk = new THREE.Mesh(kg, gm); gb.position.y = BAS / 2; gk.position.y = BAS; gk.scale.setScalar(1.05); ghost.add(gb, gk); ghost.scale.setScalar(1.18); g.add(ghost);
      g.userData = { ghost, gm, label: null, key: '' };
      this.root.add(g); return g;
    });
    this.picks = []; this.markI = -1;
  }
  // ---------- vị trí ----------
  posOf(seat, h, pos) {
    if (pos < 0) return W(slotCell(seat, h), 0.065);
    if (pos <= GATE) return W(trackCell(absSq(seat, pos)), TH);
    const n = pos - GATE; return W(stepCell(seat, n), STEP_H(n));
  }
  restYaw(seat, pos) { // hướng mặt ngựa khi đứng yên: theo chiều đi
    let a, b;
    if (pos < 0) return seatAz(seat) + Math.PI / 2 + Math.PI;
    if (pos >= GATE) { a = this.posOf(seat, 0, Math.max(GATE, pos - 1)); b = this.posOf(seat, 0, Math.min(61, Math.max(GATE + 1, pos + (pos >= 61 ? 0 : 1)))); if (pos >= 61) { a = this.posOf(seat, 0, 60); b = this.posOf(seat, 0, 61); } }
    else { a = this.posOf(seat, 0, pos); b = this.posOf(seat, 0, pos + 1); }
    return Math.atan2(-(b.z - a.z), b.x - a.x);
  }
  // đặt tức thời theo view
  sync(v) {
    this.seats = new Set(v.players.map(p => p.seat));
    for (let k = 0; k < 4; k++) { const used = this.seats.has(k); this.horses[k].forEach(g => { g.visible = used; }); this.stables[k].plat.material.color.set(used ? tint(COLORS[k], 0.6) : '#e8e2d4'); }
    for (const p of v.players) p.horses.forEach((pos, h) => this.place(p.seat, h, pos));
  }
  place(seat, h, pos) {
    const g = this.horses[seat][h]; if (g.userData.busy) return;
    g.userData.pos = pos; g.position.copy(this.posOf(seat, h, pos)); g.rotation.y = this.restYaw(seat, pos); g.userData.fig.rotation.set(0, 0, 0); g.userData.fig.position.y = 0;
  }
  setMySeat(seat) { this.mySeat = seat; }
  setTurn(seat) { this.turnSeat = seat; }
  // camera nhìn về phía ngựa của 1 người (đầu lượt)
  focusSeat(seat) {
    const ps = this.horses[seat].filter(g => g.userData.pos >= 0).map(g => g.position);
    const c = new THREE.Vector3(); if (ps.length) { ps.forEach(p => c.add(p)); c.multiplyScalar(1 / ps.length); } else c.copy(W(yardC(seat)));
    this.focusOn(c);
  }
  // làm sáng ngựa đi được + ô tới
  // nhãn trên ô tới: số bước / bậc chuồng
  static markText(m) {
    if (m.kind === 'out') return m.kick ? 'Xuất · ĐÁ!' : 'Xuất chuồng';
    const n = m.to - m.from, b = m.to - GATE;
    const t = m.dbl ? `Lên bậc ${b}` : m.to > GATE ? `${n} → bậc ${b}` : `${n} ô`;
    return m.kick ? `ĐÁ! ${t}` : t;
  }
  setMark(mk, seat, m, lift = 0) {
    const p = this.posOf(seat, m.h, m.to), u = mk.userData, red = !!m.kick;
    mk.position.set(p.x, p.y + 0.02, p.z); mk.visible = true; mk.scale.setScalar(1);
    mk.children[0].material.color.set(red ? '#ff3b3b' : '#ffe14d');
    u.gm.color.set(tint(COLORS[seat], 0.25)); u.ghost.rotation.y = this.restYaw(seat, m.to);
    const text = Board3D.markText(m), key = text + red;
    if (u.key !== key) {
      if (u.label) { mk.remove(u.label); u.label.material.map.dispose(); u.label.material.dispose(); }
      u.label = textSprite(text, red ? '#e53935' : '#1b1b2a', '#fff', 0.36); u.key = key; mk.add(u.label);
    }
    const k = this.portrait ? 1.35 : 1, s0 = u.label.userData.s0 || (u.label.userData.s0 = u.label.scale.clone()); u.label.scale.set(s0.x * k, s0.y * k, 1); // điện thoại dọc: chữ to hơn
    u.label.position.set(0, 1.25 + lift * (this.portrait ? 0.56 : 0.42), 0);
  }
  // làm sáng 1 nước khi rê chuột / focus nút ở bảng dưới (-1 = bỏ)
  pulseMark(i) { this.markI = i; }
  // xem trước 1 nước (khi máy tự đi vì chỉ có 1 nước)
  preview(seat, m) { this.highlight(seat, [m]); }
  highlight(seat, moves, focus = true) {
    for (let k = 0; k < 4; k++) this.horses[k].forEach(g => { g.userData.ring.visible = g.userData.arrow.visible = false; });
    this.marks.forEach(m => { m.visible = false; });
    this.picks = []; this.markI = -1;
    if (!moves || !moves.length) return;
    const stack = {};
    moves.forEach((m, i) => {
      const g = this.horses[seat][m.h]; g.userData.ring.visible = g.userData.arrow.visible = true;
      const key = m.kind === 'out' ? 'o' : m.to > GATE ? 'c' + m.to : 't' + absSq(seat, m.to), lift = stack[key] = (stack[key] ?? -1) + 1;
      const mk = this.marks[i]; if (mk) this.setMark(mk, seat, m, lift);
      this.picks.push({ i, h: m.h, horse: g, to: this.posOf(seat, m.h, m.to) });
    });
    if (!focus) return;
    const c = new THREE.Vector3(); this.picks.forEach(p => c.add(p.horse.position).add(p.to)); this.focusOn(c.multiplyScalar(1 / (2 * this.picks.length)));
  }
  // chạm màn hình → nước đi gần nhất (theo ngựa, ô tới hoặc nhãn số bước), trong bán kính ~52px
  // trả { i, byTo }: byTo = chạm đúng điểm đến (chọn luôn nước đó)
  pickAt(x, y) {
    const r = this.renderer.domElement.getBoundingClientRect(); let best = null, bd = 52;
    const scr = v => { const p = v.clone().project(this.camera); return [(p.x + 1) / 2 * r.width + r.left, (1 - p.y) / 2 * r.height + r.top]; };
    for (const pk of this.picks) {
      const mk = this.marks[pk.i], lab = mk && mk.userData.label ? mk.localToWorld(mk.userData.label.position.clone()) : null;
      const cands = [[pk.horse.position.clone().add(new THREE.Vector3(0, 0.4, 0)), 1, false], [pk.to, 0.85, true], [pk.to.clone().add(new THREE.Vector3(0, 0.5, 0)), 0.9, true]];
      if (lab) cands.push([lab, 0.8, true]);
      for (const [v, w, byTo] of cands) {
        const [sx, sy] = scr(v), d = Math.hypot(sx - x, sy - y) / w; if (d < bd) { bd = d; best = { i: pk.i, byTo }; }
      }
    }
    return best;
  }
  // ---------- hoạt ảnh ----------
  tween(ms, fn) { return new Promise(res => this.anims.push({ t0: performance.now(), ms: Math.max(1, ms), fn, res })); }
  async hop(g, to, ms, hgt = 0.45, spin = 0) {
    const s = g.position.clone(), dx = to.x - s.x, dz = to.z - s.z, r0 = g.rotation.y;
    const r1 = Math.hypot(dx, dz) > 0.01 ? Math.atan2(-dz, dx) : r0, dr = Math.atan2(Math.sin(r1 - r0), Math.cos(r1 - r0)), fig = g.userData.fig;
    await this.tween(ms, t => {
      const e = ease(t); g.position.set(s.x + dx * e, s.y + (to.y - s.y) * e + Math.sin(Math.PI * t) * hgt, s.z + dz * e);
      g.rotation.y = r0 + dr * Math.min(1, t * 3) + spin * t;
      const sq = t < 0.15 ? 1 - t * 1.4 : t > 0.85 ? 1 - (1 - t) * 1.4 : 1, F = 1.18; fig.scale.set(F * (1.5 - sq * 0.5), F * sq, F * (1.5 - sq * 0.5));
    });
    fig.scale.setScalar(1.18);
  }
  focusOn(v3) { this.focusPt = v3.clone(); if (this.cam.mode === 'free' && performance.now() - this.cam.lastUser > 2500 && !this.cam.pinned) { this.cam.mode = 'follow'; this.o.onCamera && this.o.onCamera('follow'); } }
  async walk(seat, h, path, msStep = 210, onStep) {
    const g = this.horses[seat][h]; if (!path.length) return; g.userData.busy = true;
    for (const pos of path) { const to = this.posOf(seat, h, pos); this.focusOn(to); await this.hop(g, to, msStep, pos > GATE ? 0.55 : 0.42); onStep && onStep(pos); }
    g.userData.busy = false; g.userData.pos = path[path.length - 1];
    const r0 = g.rotation.y, r1 = this.restYaw(seat, g.userData.pos), dr = Math.atan2(Math.sin(r1 - r0), Math.cos(r1 - r0)); this.tween(160, t => { g.rotation.y = r0 + dr * t; });
  }
  async exit(seat, h, ms = 650) {
    const g = this.horses[seat][h]; g.userData.busy = true; const to = this.posOf(seat, h, 0); this.focusOn(to);
    await this.hop(g, to, ms, 1.3, Math.PI * 2); g.userData.busy = false; g.userData.pos = 0; g.rotation.y = this.restYaw(seat, 0);
    this.burst(to, COLORS[seat], 24);
  }
  // bị đá: bay vòng cung xoay tít về chuồng
  async kicked(seat, h, ms = 1000) {
    const g = this.horses[seat][h]; g.userData.busy = true; const from = g.position.clone(), to = this.posOf(seat, h, -1), fig = g.userData.fig;
    this.burst(from.clone().add(new THREE.Vector3(0, 0.3, 0)), '#ffffff', 40); this.flashAt(from, COLORS[seat]); this.shake(0.28);
    await this.tween(ms, t => { const e = easeOut(t); g.position.set(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e + Math.sin(Math.PI * t) * 3.2, from.z + (to.z - from.z) * e); fig.rotation.z = t * Math.PI * 4; fig.rotation.x = t * Math.PI * 2; });
    fig.rotation.set(0, 0, 0);
    await this.tween(260, t => { fig.position.y = Math.abs(Math.sin(t * Math.PI * 2)) * 0.25 * (1 - t); });
    g.userData.busy = false; g.userData.pos = -1; g.rotation.y = this.restYaw(seat, -1); this.burst(to, COLORS[seat], 16);
  }
  bounce(seat, h) { const fig = this.horses[seat][h].userData.fig; return this.tween(600, t => { fig.position.y = Math.abs(Math.sin(t * Math.PI * 3)) * 0.35 * (1 - t); fig.rotation.y = t * Math.PI * 2; }).then(() => { fig.rotation.y = 0; }); }
  celebrate(seat) {
    if (!this.fxOn) return; this.horses[seat].forEach((g, i) => setTimeout(() => this.bounce(seat, i), i * 120));
    for (let i = 0; i < 5; i++) setTimeout(() => { const p = W([7 + (Math.random() - 0.5) * 6, 7 + (Math.random() - 0.5) * 6], 2.5 + Math.random()); this.burst(p, [COLORS[seat], '#ffe14d', '#ffffff'][i % 3], 60, 2.2); this.flashAt(p, COLORS[seat]); }, i * 280);
  }
  // ---------- hạt (pool cố định) ----------
  buildFx() {
    const N = 90;
    this.pools = [0, 1, 2].map(() => {
      const geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0, depthWrite: false });
      const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.visible = false; this.root.add(pts);
      return { pts, geo, pos, mat, vel: new Float32Array(N * 3), n: 0, t: 0, life: 1, g: 4 };
    });
    this.poolI = 0;
  }
  burst(at, color, n = 30, speed = 1.6) {
    if (!this.fxOn) return; const P = this.pools[this.poolI++ % this.pools.length]; n = Math.min(n, 90);
    P.n = n; P.t = 0; P.life = 1.1; P.mat.color.set(color); P.mat.opacity = 1; P.pts.visible = true;
    for (let k = 0; k < n; k++) { P.pos.set([at.x, at.y, at.z], k * 3); const a = Math.random() * Math.PI * 2, b = Math.random() * 0.9 + 0.2, s = speed * (0.5 + Math.random() * 0.7); P.vel.set([Math.cos(a) * Math.cos(b) * s, Math.sin(b) * s * 1.4, Math.sin(a) * Math.cos(b) * s], k * 3); }
    P.geo.setDrawRange(0, n); P.geo.attributes.position.needsUpdate = true;
  }
  flashAt(p, color) { if (!this.fxOn) return; const l = this.flash[this.flashI++ % 2]; l.color.set(color); l.position.set(p.x, p.y + 1, p.z); l.userData.t0 = performance.now(); l.intensity = 6; }
  floatAt(p, text, color = '#e53935') {
    if (!this.fxOn && !text) return; const sp = textSprite(text, color, '#fff', 0.42); sp.position.copy(p).add(new THREE.Vector3(0, 1.0, 0)); this.root.add(sp);
    const y0 = sp.position.y; this.tween(1500, t => { sp.position.y = y0 + easeOut(t) * 0.9; sp.material.opacity = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25; }).then(() => { this.root.remove(sp); sp.material.map.dispose(); sp.material.dispose(); });
  }
  horsePos(seat, h) { return this.horses[seat][h].position.clone(); }
  shake(a = 0.15) { if (this.fxOn) this.shakeAmt = Math.max(this.shakeAmt || 0, a); }
  // ---------- camera ----------
  follow() { this.cam.pinned = false; this.cam.mode = 'follow'; this.o.onCamera && this.o.onCamera('follow'); }
  overview() { this.cam.pinned = true; this.cam.mode = 'overview'; this.o.onCamera && this.o.onCamera('overview'); }
  resize() {
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h, false); this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.fov = w / h < 0.8 ? 46 : 40; this.camera.updateProjectionMatrix();
    this.portrait = w / h < 0.9;
    // khoảng cách vừa khít cả bàn: thử dần cho tới khi 4 góc bàn nằm trong khung
    const pol = this.portrait ? 0.38 : 0.6, cam = this.camera.clone(), corners = [[-7.9, -7.9], [7.9, -7.9], [-7.9, 7.9], [7.9, 7.9]].map(([x, z]) => new THREE.Vector3(x, 0, z));
    let d = 8; const az = seatAz(this.mySeat);
    for (; d < 60; d += 0.4) {
      cam.position.setFromSpherical(new THREE.Spherical(d, pol, az)); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
      if (corners.every(c => { const p = c.clone().project(cam); return Math.abs(p.x) < 0.96 && Math.abs(p.y) < 0.94; })) break;
    }
    this.overDist = d; this.overPol = pol; this.controls.maxDistance = d * 1.4;
  }
  desired() {
    const az = seatAz(this.mySeat);
    if (this.cam.mode === 'follow' && this.focusPt) {
      const t = this.focusPt.clone().multiplyScalar(0.55); t.y = 0;
      return { t, az, pol: this.portrait ? 0.62 : 0.78, dist: this.overDist * (this.portrait ? 0.7 : 0.66) };
    }
    return { t: new THREE.Vector3(0, 0, 0), az, pol: this.overPol, dist: this.overDist };
  }
  snap() { this.updateCamera(1e6); }
  updateCamera(dt) {
    const c = this.cam, cam = this.camera, tg = this.controls.target;
    if (c.mode === 'free') { this.controls.update(); tg.x = THREE.MathUtils.clamp(tg.x, -9, 9); tg.z = THREE.MathUtils.clamp(tg.z, -9, 9); tg.y = THREE.MathUtils.clamp(tg.y, -0.5, 2); return; }
    const d = this.desired(), k = dt > 100 ? 1 : 1 - Math.pow(0.05, dt);
    const off = cam.position.clone().sub(tg), sph = new THREE.Spherical().setFromVector3(off);
    const dAz = Math.atan2(Math.sin(d.az - sph.theta), Math.cos(d.az - sph.theta));
    sph.theta += dAz * k; sph.phi += (d.pol - sph.phi) * k; sph.radius += (d.dist - sph.radius) * k;
    tg.lerp(d.t, k); cam.position.copy(tg).add(new THREE.Vector3().setFromSpherical(sph)); cam.lookAt(tg);
  }
  frame() {
    const now = performance.now(), el = this.clock.getElapsedTime(), dt = Math.min(0.05, now / 1000 - (this.lastT || now / 1000)); this.lastT = now / 1000;
    this.anims = this.anims.filter(a => { const t = Math.min(1, (now - a.t0) / a.ms); a.fn(t); if (t >= 1) { a.res(); return false; } return true; });
    for (let k = 0; k < 4; k++) {
      const st = this.stables[k], on = k === this.turnSeat; st.ring.material.opacity = on ? 0.45 + 0.35 * Math.sin(el * 4) : 0; st.ring.visible = on;
      for (const g of this.horses[k]) { const u = g.userData; if (u.arrow.visible) { u.arrow.position.y = 1.35 + Math.sin(el * 5) * 0.1; u.arrow.rotation.y = el * 2.5; u.ring.scale.setScalar(1 + Math.sin(el * 6) * 0.08); } }
      const f = this.gates[k].userData.flag; f.rotation.y = Math.sin(el * 3 + k) * 0.4;
    }
    this.marks.forEach((m, i) => { if (!m.visible) return; const hot = i === this.markI; m.children[0].scale.setScalar((hot ? 1.35 : 1) + 0.12 * Math.sin(el * 6 + i)); m.userData.gm.opacity = hot ? 0.85 : 0.6 + 0.1 * Math.sin(el * 4); });
    this.star.rotation.y = el * 1.6; this.star.position.y = STEP_H(6) + 1.1 + Math.sin(el * 2) * 0.05;
    for (const P of this.pools) if (P.pts.visible) {
      P.t += dt; const k = P.t / P.life; if (k >= 1) { P.pts.visible = false; continue; }
      for (let i = 0; i < P.n; i++) { P.vel[i * 3 + 1] -= 5 * dt; P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] = Math.max(0.05, P.pos[i * 3 + 1] + P.vel[i * 3 + 1] * dt); P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt; }
      P.geo.attributes.position.needsUpdate = true; P.mat.opacity = 1 - k * k;
    }
    for (const l of this.flash) if (l.intensity > 0) { const t = (now - l.userData.t0) / 700; l.intensity = t >= 1 ? 0 : 6 * (1 - t); }
    this.updateCamera(dt || 0.016);
    if (this.shakeAmt > 0.002) { const a = this.shakeAmt; this.camera.position.x += (Math.random() - 0.5) * a; this.camera.position.y += (Math.random() - 0.5) * a; this.shakeAmt *= 0.88; }
    this.renderer.render(this.scene, this.camera);
  }
  dispose() { this.renderer.setAnimationLoop(null); this.ro.disconnect(); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
export { onTrack, HOME0 };
