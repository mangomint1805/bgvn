// Đường đua sa mạc 3D bằng Three.js – mọi mô hình (đường đua, kim tự tháp, lạc đà, xúc xắc, thảm) dựng bằng code.
// Hiệu năng điện thoại: KHÔNG thêm/bớt đèn lúc chạy (đèn dựng sẵn, chỉ đổi cường độ), hạt dùng pool có giới hạn,
// hình học / vật liệu / texture dùng chung, thảm sa mạc + xúc xắc dựng sẵn rồi chỉ bật/tắt.
import * as THREE from '../../shared/lib/three.module.min.js';
import { OrbitControls } from '../../shared/lib/OrbitControls.js';
import { CAMEL, RACERS, CRAZY, TRACK } from './engine.js?v=1';

export const QUALITY = { low: { aa: false, pr: 1, shadow: 0, deco: 0.4 }, med: { aa: true, pr: 1.5, shadow: 1024, deco: 0.75 }, high: { aa: true, pr: 2, shadow: 2048, deco: 1 } };
const FONT = '"Be Vietnam Pro", system-ui, sans-serif', TITLE = '"Baloo 2", "Be Vietnam Pro", system-ui, sans-serif';
const col = c => new THREE.Color(c);
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.75, metalness: 0, ...o });
const ease = t => t * t * (3 - 2 * t), easeOut = t => 1 - Math.pow(1 - t, 3);
const tex = cv => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
export const DIE_COLORS = { ...Object.fromEntries(RACERS.map(c => [c, CAMEL[c].color])), xam: '#9aa0a8' };

// ---------- hình học đường đua: 16 ô vòng quanh kim tự tháp (đi theo chiều kim đồng hồ khi nhìn từ trên) ----------
const R = 6.1, R1 = 5.05, R2 = 7.15, TH = 0.2, SEG = Math.PI * 2 / TRACK, A0 = Math.PI + SEG * 0.5; // ô 1 ở ngay sau vạch đích (phía trước camera)
const angOf = p => A0 - (p - 0.5) * SEG;
export function spaceXZ(p) {
  if (p > TRACK) { const a = angOf(p - TRACK) , r = R2 + 1.25; return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r); } // khu về đích (ngoài vòng)
  const a = angOf(Math.max(1, p)); return new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R);
}
const baseY = p => p > TRACK ? 0.32 : TH;
// hướng nhìn theo chiều tiến (tiếp tuyến chiều kim đồng hồ)
const yawAt = p => { const a = angOf(Math.min(TRACK, Math.max(1, p > TRACK ? p - TRACK : p))); const tx = Math.sin(a), tz = -Math.cos(a); return Math.atan2(-tz, tx); };
const CS = 0.9, STACK_H = 0.86; // cỡ lạc đà, độ cao mỗi tầng chồng

function sectorGeo(r1, r2, a, h) {
  const s = new THREE.Shape(), n = 10;
  s.moveTo(Math.cos(-a / 2) * r1, Math.sin(-a / 2) * r1);
  for (let i = 0; i <= n; i++) { const t = -a / 2 + a * i / n; s.lineTo(Math.cos(t) * r2, Math.sin(t) * r2); }
  for (let i = n; i >= 0; i--) { const t = -a / 2 + a * i / n; s.lineTo(Math.cos(t) * r1, Math.sin(t) * r1); }
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.04, bevelSegments: 1, curveSegments: 4 });
  g.rotateX(Math.PI / 2); g.translate(0, h, 0); return g; // mặt trên ở y = h
}
function numCanvas(n, fin = false) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = fin ? '#fff6' : '#ffffff00'; c.fillRect(0, 0, 128, 128);
  c.font = `800 76px ${TITLE}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = 8; c.strokeStyle = '#8a5a1f66'; c.strokeText(String(n), 64, 70); c.fillStyle = '#fffaf0'; c.fillText(String(n), 64, 70);
  return cv;
}
function skyCanvas() {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#5fb6f5'); g.addColorStop(0.55, '#a9dcff'); g.addColorStop(0.82, '#ffe4b8'); g.addColorStop(1, '#ffd08f');
  c.fillStyle = g; c.fillRect(0, 0, 4, 256); return cv;
}
function glowCanvas(inner = '#fff7d6', outer = '#ffd36b00') {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  const g = c.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, inner); g.addColorStop(0.35, '#ffe9a8aa'); g.addColorStop(1, outer);
  c.fillStyle = g; c.fillRect(0, 0, 128, 128); return cv;
}
function sandCanvas() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d');
  c.fillStyle = '#f3cf8a'; c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { c.fillStyle = Math.random() < 0.5 ? '#e8bd72' : '#fbe0a8'; c.globalAlpha = 0.5; c.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  c.globalAlpha = 0.18; c.strokeStyle = '#d9a75a'; c.lineWidth = 3;
  for (let y = 10; y < 256; y += 22) { c.beginPath(); for (let x = 0; x <= 256; x += 8) c.lineTo(x, y + Math.sin(x / 20 + y) * 4); c.stroke(); }
  return cv;
}
// mặt xúc xắc: nền màu + 1–3 chấm (xám: chấm đen/trắng)
function dieCanvas(bg, n, pip = '#fff') {
  const cv = document.createElement('canvas'); cv.width = cv.height = 96; const c = cv.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, 96, 96); c.strokeStyle = '#0003'; c.lineWidth = 6; rrect(c, 4, 4, 88, 88, 16); c.stroke();
  const P = { 1: [[48, 48]], 2: [[28, 28], [68, 68]], 3: [[26, 26], [48, 48], [70, 70]] }[n];
  for (const [x, y] of P) { c.beginPath(); c.arc(x, y, 11, 0, 7); c.fillStyle = pip; c.fill(); c.lineWidth = 3; c.strokeStyle = '#0004'; c.stroke(); }
  return cv;
}
function textSprite(text, bg, fg = '#fff', h = 0.5) {
  const cv = document.createElement('canvas'), c = cv.getContext('2d'), f = 54; c.font = `800 ${f}px ${FONT}`;
  const w = Math.ceil(c.measureText(text).width) + 44; cv.width = w; cv.height = f + 30; c.font = `800 ${f}px ${FONT}`;
  c.fillStyle = bg; rrect(c, 0, 0, w, cv.height, cv.height / 2); c.fill(); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, cv.height / 2 + 3);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(cv), depthWrite: false, depthTest: false, transparent: true })); sp.scale.set(h * w / cv.height, h, 1); sp.renderOrder = 20; return sp;
}

export class Board3D {
  constructor(el, o = {}) {
    this.el = el; this.o = o; this.anims = []; this.camels = {}; this.cam = { mode: 'follow', lastUser: 0, pinned: false };
    this.q = QUALITY[o.quality] ? o.quality : 'med'; this.fxOn = o.effects !== false;
    this.board = Array.from({ length: TRACK + 4 }, () => []);
    this.scene = new THREE.Scene(); this.scene.background = tex(skyCanvas()); this.scene.fog = new THREE.Fog(0xffdcaa, 34, 90);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220); this.camera.position.set(0, 14, 16);
    this.target = new THREE.Vector3();
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.initRenderer();
    this.buildLights(); this.buildWorld(); this.buildTrack(); this.buildPyramid(); this.buildCamels(); this.buildDice(); this.buildTiles(); this.buildFx();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el); this.resize();
    this.clock = new THREE.Clock(); this.snap();
    this.renderer.setAnimationLoop(() => this.frame());
  }
  initRenderer() {
    const Q = QUALITY[this.q];
    if (this.renderer) { this.renderer.setAnimationLoop(null); this.renderer.dispose(); this.renderer.domElement.remove(); this.controls.dispose(); }
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: Q.aa, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(Q.pr, devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = !!Q.shadow; r.shadowMap.type = Q.shadow > 1024 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.el.appendChild(r.domElement); r.domElement.style.touchAction = 'none';
    const ctl = this.controls = new OrbitControls(this.camera, r.domElement);
    Object.assign(ctl, { enableDamping: true, dampingFactor: 0.09, minPolarAngle: 0.08, maxPolarAngle: 1.25, minDistance: 5, maxDistance: 50, enablePan: true, screenSpacePanning: false, zoomSpeed: 0.9, rotateSpeed: 0.7 });
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
    const d = QUALITY[q].deco; this.decos.forEach((m, i) => { m.visible = i / this.decos.length < d; });
  }
  setEffects(on) { this.fxOn = !!on; }
  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xdff1ff, 0xd9a35c, 1.15); this.scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xfff0d0, 2.3); sun.position.set(-9, 16, -6); sun.castShadow = true;
    const Q = QUALITY[this.q]; sun.shadow.mapSize.set(Q.shadow || 512, Q.shadow || 512);
    Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 50 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    this.scene.add(sun); this.scene.add(sun.target);
    // đèn chớp (hiệu ứng): dựng sẵn, chỉ đổi cường độ
    this.flash = [0, 1].map(() => { const l = new THREE.PointLight(0xffffff, 0, 8, 1.5); this.root.add(l); return l; }); this.flashI = 0;
  }
  // ---------- sa mạc, trời, mặt trời ----------
  buildWorld() {
    const st = tex(sandCanvas()); st.wrapS = st.wrapT = THREE.RepeatWrapping; st.repeat.set(14, 14);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(110, 48), new THREE.MeshStandardMaterial({ color: 0xffffff, map: st, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.root.add(ground);
    // mặt trời + quầng sáng
    const sunM = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false }));
    sunM.position.set(-38, 22, -95); this.scene.add(sunM);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(glowCanvas()), transparent: true, depthWrite: false, fog: false }));
    glow.scale.set(34, 34, 1); glow.position.copy(sunM.position); this.scene.add(glow); this.sunGlow = glow;
    // đồi cát
    this.decos = [];
    const duneG = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), duneMs = ['#f0c27a', '#f6d396', '#e9b469'].map(c => std(c, { roughness: 1, flatShading: true }));
    const rng = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    for (let i = 0; i < 22; i++) {
      const a = rng() * Math.PI * 2, r = 16 + rng() * 40, d = new THREE.Mesh(duneG, duneMs[i % 3]);
      d.scale.set(5 + rng() * 9, 1.2 + rng() * 3.5, 3 + rng() * 6); d.rotation.y = rng() * 3; d.position.set(Math.cos(a) * r, -0.05, Math.sin(a) * r);
      d.receiveShadow = true; this.root.add(d); this.decos.push(d);
    }
    // xương rồng + đá (instanced)
    const cacM = std('#3f9b57', { flatShading: true, roughness: 0.8 }), cacG = new THREE.CylinderGeometry(0.22, 0.26, 1.6, 7), armG = new THREE.CylinderGeometry(0.13, 0.15, 0.7, 6);
    const rockG = new THREE.DodecahedronGeometry(0.5, 0), rockM = std('#c99a63', { flatShading: true });
    for (let i = 0; i < 14; i++) {
      const a = rng() * Math.PI * 2, r = 9.8 + rng() * 9;
      if (i % 2 === 0) {
        const g = new THREE.Group(), t = new THREE.Mesh(cacG, cacM); t.position.y = 0.8; t.castShadow = true; g.add(t);
        for (const s of [-1, 1]) { if (rng() < 0.3) continue; const ar = new THREE.Mesh(armG, cacM); ar.position.set(s * 0.36, 0.9 + rng() * 0.3, 0); ar.castShadow = true; g.add(ar); const jn = new THREE.Mesh(armG, cacM); jn.scale.set(1, 0.45, 1); jn.rotation.z = Math.PI / 2; jn.position.set(s * 0.2, 0.62, 0); g.add(jn); }
        g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.scale.setScalar(0.8 + rng() * 0.6); g.rotation.y = rng() * 3; this.root.add(g); this.decos.push(g);
      } else {
        const m = new THREE.Mesh(rockG, rockM); m.position.set(Math.cos(a) * r, 0.15, Math.sin(a) * r); m.scale.set(0.6 + rng(), 0.4 + rng() * 0.5, 0.6 + rng()); m.castShadow = true; this.root.add(m); this.decos.push(m);
      }
    }
    // cây cọ ở 2 góc
    this.palmParts = this.makePalmParts();
    for (const [x, z, s] of [[-10.5, -6.5, 1.3], [10.8, -7.5, 1.1], [-11, 6, 1], [11.5, 5.5, 1.25]]) { const p = this.palm(s); p.position.set(x, 0, z); this.root.add(p); this.decos.push(p); }
    const d = QUALITY[this.q].deco; this.decos.forEach((m, i) => { m.visible = i / this.decos.length < d; });
  }
  makePalmParts() {
    return { trunkG: new THREE.CylinderGeometry(0.1, 0.17, 1, 7), trunkM: std('#a86f3a', { flatShading: true }), leafG: new THREE.ConeGeometry(0.28, 1.5, 4, 1), leafM: std('#2fa35a', { flatShading: true, side: THREE.DoubleSide }), nutG: new THREE.SphereGeometry(0.1, 6, 5), nutM: std('#6b4423') };
  }
  palm(s = 1) {
    const P = this.palmParts, g = new THREE.Group();
    for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(P.trunkG, P.trunkM); t.position.set(i * 0.06, 0.5 + i * 0.95, 0); t.rotation.z = -0.06 * i; t.castShadow = true; g.add(t); }
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(P.leafG, P.leafM); const a = i / 6 * Math.PI * 2; l.scale.set(1, 1, 0.25); l.position.set(0.24 + Math.cos(a) * 0.55, 3.75, Math.sin(a) * 0.55); l.rotation.set(Math.sin(a) * 1.25, -a, -Math.cos(a) * 1.25 - 0.05); l.castShadow = true; g.add(l); }
    for (let i = 0; i < 3; i++) { const n = new THREE.Mesh(P.nutG, P.nutM); n.position.set(0.24 + Math.cos(i * 2) * 0.13, 3.6, Math.sin(i * 2) * 0.13); g.add(n); }
    g.scale.setScalar(s); return g;
  }
  // ---------- đường đua ----------
  buildTrack() {
    const sg = sectorGeo(R1, R2, SEG - 0.035, TH);
    const mA = std('#e7a85a', { roughness: 0.85 }), mB = std('#d8914a', { roughness: 0.85 });
    const ng = new THREE.PlaneGeometry(1.05, 1.05);
    this.spaces = [];
    for (let p = 1; p <= TRACK; p++) {
      const m = new THREE.Mesh(sg, p % 2 ? mA : mB); m.rotation.y = -angOf(p); m.receiveShadow = true; m.castShadow = !!QUALITY[this.q].shadow; this.root.add(m);
      const nm = new THREE.Mesh(ng, new THREE.MeshBasicMaterial({ map: tex(numCanvas(p)), transparent: true, depthWrite: false }));
      const a = angOf(p), rr = R2 - 0.42; nm.position.set(Math.cos(a) * rr, TH + 0.045, Math.sin(a) * rr); nm.rotation.x = -Math.PI / 2; nm.rotation.z = -a + Math.PI / 2; nm.scale.setScalar(0.62); nm.renderOrder = 2; this.root.add(nm);
      this.spaces.push(m);
    }
    // viền đá 2 bên đường
    const rim = (r, w) => { const g = new THREE.Mesh(new THREE.RingGeometry(r - w, r + w, 96), std('#b8793d', { roughness: 0.9 })); g.rotation.x = -Math.PI / 2; g.position.y = 0.02; g.receiveShadow = true; this.root.add(g); };
    rim(R1 - 0.12, 0.14); rim(R2 + 0.12, 0.14);
    // vạch đích + cổng ca rô
    const fin = document.createElement('canvas'); fin.width = 64; fin.height = 256; const c = fin.getContext('2d');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 2 ? '#222' : '#fff'; c.fillRect(x * 16, y * 16, 16, 16); }
    const finT = tex(fin), aF = A0;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.36, R2 - R1 + 0.2), new THREE.MeshStandardMaterial({ map: finT, roughness: 0.6 }));
    line.rotation.x = -Math.PI / 2; line.rotation.z = -aF + Math.PI / 2; line.position.set(Math.cos(aF) * R, TH + 0.045, Math.sin(aF) * R); this.root.add(line);
    const gate = new THREE.Group(), postM = std('#ff5a5f', { roughness: 0.4 }), postG = new THREE.CylinderGeometry(0.11, 0.13, 3.0, 10);
    for (const r of [R1 - 0.35, R2 + 0.35]) { const pm = new THREE.Mesh(postG, postM); pm.position.set(r, 1.5, 0); pm.castShadow = true; gate.add(pm); }
    const bnC = document.createElement('canvas'); bnC.width = 512; bnC.height = 96; const bc = bnC.getContext('2d');
    for (let x = 0; x < 32; x++) for (let y = 0; y < 2; y++) { bc.fillStyle = (x + y) % 2 ? '#222' : '#fff'; bc.fillRect(x * 16, y * 16, 16, 16); bc.fillRect(x * 16, 64 + y * 16, 16, 16); }
    bc.fillStyle = '#ff7a1a'; bc.fillRect(0, 32, 512, 32); bc.fillStyle = '#fff'; bc.font = `800 30px ${TITLE}`; bc.textAlign = 'center'; bc.textBaseline = 'middle'; bc.fillText('🏁 VỀ ĐÍCH 🏁', 256, 49);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(R2 - R1 + 0.9, 0.62, 0.06), [postM, postM, postM, postM, new THREE.MeshStandardMaterial({ map: tex(bnC) }), new THREE.MeshStandardMaterial({ map: tex(bnC) })]);
    banner.position.set((R1 + R2) / 2, 2.75, 0); banner.castShadow = true; gate.add(banner); this.finBanner = banner;
    gate.rotation.y = -aF; this.root.add(gate);
    // khu về đích (bục ngoài vòng, sau vạch đích)
    const podM = std('#fff3dc', { roughness: 0.5 });
    for (let k = 1; k <= 3; k++) { const p = spaceXZ(TRACK + k), m = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.32, 20), podM); m.position.set(p.x, 0.16, p.z); m.castShadow = m.receiveShadow = true; this.root.add(m); }
    // đánh dấu ô (đặt thảm): pool 16
    const mg = new THREE.RingGeometry(0.5, 0.72, 32), dg = new THREE.CircleGeometry(0.5, 24);
    this.marks = Array.from({ length: TRACK + 1 }, (_, p) => {
      const g = new THREE.Group(), m = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.95, depthWrite: false })), d = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }));
      m.rotation.x = d.rotation.x = -Math.PI / 2; g.add(m, d); g.visible = false; g.renderOrder = 5;
      if (p) { const v = spaceXZ(p); g.position.set(v.x, TH + 0.05, v.z); }
      this.root.add(g); return g;
    });
    this.markList = [];
  }
  // ---------- kim tự tháp bậc thang ----------
  buildPyramid() {
    const g = this.pyr = new THREE.Group(), N = 6, base = 3.7, hh = 0.5;
    const mats = [std('#e2b06a', { flatShading: true }), std('#d9a25c', { flatShading: true })];
    for (let i = 0; i < N; i++) { const w = base * (1 - i / N) + 0.25, m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, w), mats[i % 2]); m.position.y = hh / 2 + i * hh; m.castShadow = m.receiveShadow = true; g.add(m); }
    const capM = std('#ffd54a', { metalness: 0.6, roughness: 0.3, emissive: 0x3a2600 });
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.7, 4), capM); cap.position.y = N * hh + 0.35; cap.rotation.y = Math.PI / 4; cap.castShadow = true; g.add(cap); this.cap = cap;
    // cửa + bậc thang mặt trước
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.1), std('#5b3a1e')); door.position.set(0, 0.45, base / 2 + 0.06); g.add(door);
    const stair = std('#f0c47f', { flatShading: true });
    for (let i = 0; i < N; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.4), stair); st.position.set(0, i * hh + hh + 0.09, (base * (1 - (i + 1) / N) + 0.25) / 2 + 0.12); st.visible = i > 1; g.add(st); }
    g.rotation.y = Math.PI / 4 * 0; this.root.add(g);
    this.pyrTop = new THREE.Vector3(0, N * hh + 0.8, 0);
  }
  // ---------- lạc đà low-poly ----------
  buildCamels() {
    const G = {
      body: new THREE.SphereGeometry(0.5, 10, 7), hump: new THREE.SphereGeometry(0.34, 9, 6), neck: new THREE.CylinderGeometry(0.11, 0.16, 0.62, 7),
      head: new THREE.BoxGeometry(0.42, 0.22, 0.24), snout: new THREE.BoxGeometry(0.16, 0.16, 0.2), ear: new THREE.BoxGeometry(0.06, 0.12, 0.05),
      leg: new THREE.CylinderGeometry(0.07, 0.055, 0.6, 6), hoof: new THREE.CylinderGeometry(0.075, 0.085, 0.07, 6), tail: new THREE.CylinderGeometry(0.03, 0.015, 0.36, 5),
      eye: new THREE.SphereGeometry(0.035, 6, 5), cloth: new THREE.BoxGeometry(0.5, 0.05, 0.62), tassel: new THREE.SphereGeometry(0.05, 6, 4),
      ring: new THREE.TorusGeometry(0.75, 0.06, 6, 28), crown: new THREE.CylinderGeometry(0.2, 0.16, 0.16, 5, 1, true), swirl: new THREE.TorusGeometry(0.12, 0.025, 4, 12),
    };
    const eyeM = new THREE.MeshBasicMaterial({ color: 0x1b1b2a }), white = std('#fffaf0'), hoofM = std('#4a3424'), gold = std('#ffd54a', { metalness: 0.6, roughness: 0.3, emissive: 0x3a2600, side: THREE.DoubleSide });
    for (const c of [...RACERS, ...CRAZY]) {
      const info = CAMEL[c], crazy = !!info.crazy;
      const bodyM = std(info.color, { roughness: 0.55, flatShading: true }), darkM = std(info.dark, { roughness: 0.6, flatShading: true });
      const clothM = std(crazy ? (c === 'den' ? '#ff4fa3' : '#30c0ff') : '#fffaf0', { roughness: 0.5 });
      const g = new THREE.Group(), fig = new THREE.Group(); g.add(fig); fig.scale.setScalar(CS);
      const add = (geo, m, x, y, z, sx = 1, sy = 1, sz = 1, rz = 0) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.scale.set(sx, sy, sz); k.rotation.z = rz; k.castShadow = true; fig.add(k); return k; };
      add(G.body, bodyM, 0, 0.86, 0, 1.25, 0.62, 0.62);
      add(G.hump, bodyM, -0.08, 1.16, 0, 1.2, 0.9, 1);
      add(G.cloth, clothM, -0.08, 1.02, 0, 1.6, 1, 1.05);
      add(G.neck, bodyM, 0.62, 1.12, 0, 1, 1, 1, -0.55);
      const head = add(G.head, bodyM, 0.86, 1.42, 0); add(G.snout, darkM, 1.08, 1.38, 0);
      for (const s of [-1, 1]) { add(G.ear, darkM, 0.74, 1.57, s * 0.09); add(G.eye, eyeM, 0.96, 1.48, s * 0.125); }
      const legs = [];
      for (const [x, z] of [[0.38, 0.17], [0.38, -0.17], [-0.38, 0.17], [-0.38, -0.17]]) { const l = add(G.leg, bodyM, x, 0.36, z); add(G.hoof, hoofM, x, 0.04, z); legs.push(l); }
      add(G.tail, darkM, -0.66, 0.84, 0, 1, 1, 1, 0.5);
      if (crazy) { const sw = add(G.swirl, white, 0.88, 1.75, 0); sw.rotation.x = Math.PI / 2; head.rotation.z = 0.25; }
      // vòng sáng + vương miện dẫn đầu
      const ring = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: col(info.color), transparent: true, opacity: 0.85 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.04; ring.visible = false; g.add(ring);
      const crown = new THREE.Mesh(G.crown, gold); crown.position.set(0.0, 1.62 * CS + 0.3, 0); crown.visible = false; g.add(crown);
      g.userData = { c, fig, legs, ring, crown, crazy, pos: 0, idx: 0 };
      this.root.add(g); this.camels[c] = g; g.visible = false;
    }
  }
  // vị trí 1 con lạc đà theo ô + tầng
  slot(pos, idx, n = 1) {
    if (pos <= 0) return new THREE.Vector3(0, -10, 0);
    const p = spaceXZ(pos), y = baseY(pos) + idx * STACK_H;
    return new THREE.Vector3(p.x, y, p.z);
  }
  restYaw(c, pos) { return yawAt(pos) + (CAMEL[c].crazy ? Math.PI : 0); }
  // ---------- xúc xắc ----------
  buildDice() {
    const geo = new THREE.BoxGeometry(0.52, 0.52, 0.52);
    this.dieTex = {}; this.dice = {};
    for (const d of [...RACERS, 'xam']) {
      const bg = DIE_COLORS[d];
      const T = d === 'xam' ? { den: [1, 2, 3].map(n => tex(dieCanvas(bg, n, '#1d1b24'))), trang: [1, 2, 3].map(n => tex(dieCanvas(bg, n, '#ffffff'))) } : { x: [1, 2, 3].map(n => tex(dieCanvas(bg, n, d === 'vang' ? '#5a3c00' : '#fff'))) };
      this.dieTex[d] = T;
      const set = T.x || T.den, alt = T.trang || T.x;
      const mats = [set[1], alt[2], set[0], alt[0], set[2], alt[1]].map(t => new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }));
      const m = new THREE.Mesh(geo, mats); m.castShadow = true; m.visible = false; this.root.add(m);
      this.dice[d] = m;
    }
    // khay xúc xắc đã lắc (trước kim tự tháp)
    this.traySlots = Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 2 + (i - 2.5) * 0.36; return new THREE.Vector3(Math.cos(a) * 3.35, 0.26, Math.sin(a) * 3.35); });
    const tray = new THREE.Mesh(new THREE.RingGeometry(2.95, 3.75, 40, 1, -Math.PI / 2 - 1.2, 2.4), std('#c98a4b', { roughness: 0.8, side: THREE.DoubleSide }));
    tray.rotation.x = -Math.PI / 2; tray.position.y = 0.02; tray.receiveShadow = true; this.root.add(tray);
    // chú thích nhỏ trên khay
    void FONT;
  }
  setDieTop(d, value, color) {
    const m = this.dice[d], T = this.dieTex[d], set = d === 'xam' ? T[color || 'den'] : T.x;
    m.material[2].map = set[value - 1]; m.material[2].needsUpdate = true;
  }
  // ---------- thảm sa mạc (dựng sẵn, bật/tắt) ----------
  buildTiles() {
    const baseG = new THREE.CylinderGeometry(0.78, 0.82, 0.08, 24), ringG = new THREE.TorusGeometry(0.8, 0.06, 6, 28);
    const oasisM = std('#3fc6e0', { roughness: 0.2, metalness: 0.1 }), grassM = std('#58c46a', { flatShading: true }), mirM = new THREE.MeshStandardMaterial({ color: 0xbfd9ff, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.2 });
    const poolG = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20), waveG = new THREE.TorusGeometry(0.4, 0.04, 4, 22);
    const signP = new THREE.PlaneGeometry(0.62, 0.36);
    const signT = { 1: tex(this.signCanvas('+1', '#1aa86a')), '-1': tex(this.signCanvas('−1', '#7a5cff')) };
    this.tileObjs = Array.from({ length: 8 }, () => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(baseG, grassM); base.position.y = 0.04; base.receiveShadow = true; g.add(base);
      const ownerRing = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0xffffff })); ownerRing.rotation.x = Math.PI / 2; ownerRing.position.y = 0.06; g.add(ownerRing);
      const oasis = new THREE.Group(); const pool = new THREE.Mesh(poolG, oasisM); pool.position.set(0.12, 0.1, 0.1); oasis.add(pool);
      const pm = this.palm(0.36); pm.position.set(-0.32, 0.08, -0.25); oasis.add(pm); g.add(oasis);
      const mir = new THREE.Group(); for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(waveG, mirM); w.rotation.x = Math.PI / 2; w.position.y = 0.12 + i * 0.16; w.scale.setScalar(1 - i * 0.22); mir.add(w); } g.add(mir);
      const sign = new THREE.Mesh(signP, new THREE.MeshBasicMaterial({ map: signT[1], transparent: true, depthWrite: false, side: THREE.DoubleSide })); sign.position.set(0, 0.95, 0); sign.renderOrder = 6; g.add(sign);
      g.visible = false; g.userData = { base, ownerRing, oasis, mir, sign, signT, grassM, sandM: std('#e9d3b0', { roughness: 0.3 }) };
      this.root.add(g); return g;
    });
  }
  signCanvas(t, c) {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 74; const x = cv.getContext('2d');
    x.fillStyle = c; rrect(x, 2, 2, 124, 70, 20); x.fill(); x.lineWidth = 5; x.strokeStyle = '#fff'; x.stroke();
    x.fillStyle = '#fff'; x.font = `800 50px ${TITLE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, 64, 41); return cv;
  }
  // ---------- đồng bộ tức thời theo view ----------
  // colors: { pid -> màu người chơi } để tô vòng chủ thảm
  sync(v, colors = {}) {
    this.board = v.board.map(s => s.slice());
    for (const c in this.camels) { const g = this.camels[c]; if (!g.userData.busy) g.visible = false; }
    v.board.forEach((s, p) => s.forEach((c, i) => this.placeCamel(c, p, i)));
    this.syncTiles(v.tiles, colors);
    this.syncDice(v);
    this.updateCrown();
  }
  placeCamel(c, p, i) {
    const g = this.camels[c]; if (!g || g.userData.busy) return;
    g.visible = true; g.userData.pos = p; g.userData.idx = i;
    g.position.copy(this.slot(p, i)); g.rotation.y = this.restYaw(c, p); g.userData.fig.rotation.set(0, 0, 0); g.userData.fig.position.y = 0;
  }
  syncTiles(tiles, colors = {}) {
    this.tileObjs.forEach((g, i) => {
      const t = tiles[i]; g.visible = !!t; if (!t) { g.userData.t = null; return; }
      const u = g.userData, p = spaceXZ(t.pos); g.position.set(p.x, TH, p.z); g.rotation.y = -angOf(t.pos);
      u.oasis.visible = t.side > 0; u.mir.visible = t.side < 0; u.base.material = t.side > 0 ? u.grassM : u.sandM;
      u.sign.material.map = u.signT[t.side > 0 ? 1 : '-1']; u.sign.material.needsUpdate = true; u.ownerRing.material.color.set(colors[t.owner] || '#ffffff');
      u.t = t; if (!g.userData.popping) g.scale.setScalar(1);
    });
  }
  syncDice(v) {
    for (const d in this.dice) { const m = this.dice[d]; if (m.userData.busy) continue; m.visible = false; }
    (v.rolled || []).forEach((r, i) => { const m = this.dice[r.die]; if (!m || m.userData.busy) return; this.setDieTop(r.die, r.value, r.color); m.visible = true; m.position.copy(this.traySlots[i]); m.rotation.set(0, (i - 2.5) * -0.36, 0); });
  }
  updateCrown() {
    let lead = null;
    for (let p = this.board.length - 1; p >= 1 && !lead; p--) for (let i = this.board[p].length - 1; i >= 0; i--) if (RACERS.includes(this.board[p][i])) { lead = this.board[p][i]; break; }
    for (const c in this.camels) this.camels[c].userData.crown.visible = c === lead;
  }
  // ---------- hoạt ảnh ----------
  tween(ms, fn) { return new Promise(res => this.anims.push({ t0: performance.now(), ms: Math.max(1, ms), fn, res })); }
  // xúc xắc bật ra từ đỉnh kim tự tháp, lăn xuống khay
  async dieOut(die, value, color, slotI, ms = 900) {
    const m = this.dice[die]; if (!m) return; m.userData.busy = true; this.setDieTop(die, value, color);
    const from = this.pyrTop.clone(), to = this.traySlots[Math.min(5, slotI)].clone(), r0 = [Math.random() * 6, Math.random() * 6, Math.random() * 6], yaw = (Math.min(5, slotI) - 2.5) * -0.36;
    m.visible = true; this.focusOn(new THREE.Vector3(0, 0, 2));
    this.burst(from, DIE_COLORS[die], 18, 1.2); this.cap.userData.kick = performance.now();
    await this.tween(ms, t => {
      const e = easeOut(t); m.position.set(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * t + Math.sin(Math.PI * Math.min(1, t * 1.15)) * 1.6 + (t > 0.75 ? Math.abs(Math.sin((t - 0.75) * 4 * Math.PI)) * 0.2 * (1 - t) * 4 : 0), from.z + (to.z - from.z) * e);
      const k = 1 - ease(t); m.rotation.set(r0[0] * k * 4, yaw + r0[1] * k * 4, r0[2] * k * 4);
    });
    m.rotation.set(0, yaw, 0); m.position.copy(to); m.userData.busy = false;
  }
  // hết chặng: xúc xắc bay về kim tự tháp, thảm biến mất
  async legReset(ms = 700) {
    const list = Object.values(this.dice).filter(m => m.visible), from = list.map(m => m.position.clone());
    const tl = this.tileObjs.filter(g => g.visible);
    await this.tween(ms, t => {
      list.forEach((m, i) => { const f = from[i]; m.position.set(f.x * (1 - t), f.y + (this.pyrTop.y - f.y) * t + Math.sin(Math.PI * t) * 1.2, f.z * (1 - t)); m.scale.setScalar(1 - t * 0.7); m.rotation.y += 0.2; });
      tl.forEach(g => g.scale.setScalar(Math.max(0.01, 1 - t)));
    });
    list.forEach(m => { m.visible = false; m.scale.setScalar(1); }); tl.forEach(g => { g.visible = false; g.scale.setScalar(1); });
    this.cap.userData.kick = performance.now();
  }
  async tilePop(t, colors = {}, ms = 520) {
    this.syncTiles(this.currentTiles(t), colors);
    const g = this.tileObjs.find(x => x.userData.t && x.userData.t.pos === t.pos); if (!g) return;
    g.userData.popping = true; const p = g.position.clone(); this.focusOn(p);
    this.burst(p.clone().add(new THREE.Vector3(0, 0.3, 0)), t.side > 0 ? '#58c46a' : '#bfd9ff', 26, 1.3);
    await this.tween(ms, x => { const s = x < 0.6 ? easeOut(x / 0.6) * 1.25 : 1.25 - (x - 0.6) / 0.4 * 0.25; g.scale.setScalar(Math.max(0.01, s)); g.position.y = p.y + Math.sin(Math.PI * x) * 0.6; });
    g.scale.setScalar(1); g.position.copy(p); g.userData.popping = false;
  }
  // danh sách thảm sau khi thêm/dời thảm t (cùng chủ thì thay thế)
  currentTiles(t) { const cur = this.tileObjs.filter(g => g.visible && g.userData.t).map(g => g.userData.t).filter(x => x.owner !== t.owner); return [...cur, t]; }
  // cả chồng nhảy từng ô; dính thảm thì nảy thêm 1 ô; cuối cùng xếp lại theo bàn mới
  async moveUnit(mv, msStep = 260, onStep) {
    const unit = mv.unit, b = this.board, gs = unit.map(c => this.camels[c]);
    const [fp] = [mv.from];
    b[fp] = b[fp].filter(c => !unit.includes(c));
    gs.forEach(g => { g.userData.busy = true; });
    const path = []; for (let s = 1; s <= mv.steps; s++) { const p = mv.from + mv.dir * s; if (p < 1) break; path.push(p); if (p > TRACK) break; }
    if (!path.length || path[path.length - 1] !== mv.land) path.push(mv.land);
    const stackTop = p => (b[p] || []).length;
    let cur = gs.map(g => g.position.clone());
    const hopTo = async (p, hgt, ms) => {
      const base = stackTop(p), targets = gs.map((g, i) => this.slot(p, base + i));
      const from = cur, r0 = gs.map(g => g.rotation.y), r1 = gs.map(g => this.restYaw(g.userData.c, Math.max(1, Math.min(TRACK, p))));
      this.focusOn(targets[0]);
      await this.tween(ms, t => {
        const e = ease(t), arc = Math.sin(Math.PI * t) * hgt;
        gs.forEach((g, i) => {
          const f = from[i], to = targets[i]; g.position.set(f.x + (to.x - f.x) * e, f.y + (to.y - f.y) * e + arc, f.z + (to.z - f.z) * e);
          const dr = Math.atan2(Math.sin(r1[i] - r0[i]), Math.cos(r1[i] - r0[i])); g.rotation.y = r0[i] + dr * Math.min(1, t * 2);
          const L = g.userData.legs, sw = Math.sin(t * Math.PI * 2) * 0.5; L[0].rotation.z = sw; L[3].rotation.z = sw; L[1].rotation.z = -sw; L[2].rotation.z = -sw;
          const fig = g.userData.fig, sq = t < 0.12 ? 1 - t : t > 0.88 ? 1 - (1 - t) : 1; fig.scale.set(CS * (1.3 - sq * 0.3), CS * sq, CS * (1.3 - sq * 0.3));
        });
      });
      gs.forEach(g => { g.userData.legs.forEach(l => { l.rotation.z = 0; }); g.userData.fig.scale.setScalar(CS); });
      cur = targets;
    };
    for (const p of path) { await hopTo(p, 0.75 + Math.min(2, stackTop(p) * 0.25), msStep); onStep && onStep(p); }
    if (mv.tile) {
      this.bounceTile(mv.land);
      if (mv.under) {
        // ảo ảnh: lùi 1 ô và CHUI XUỐNG DƯỚI chồng ở đó – chồng cũ được nâng lên
        const p = mv.to, old = (b[p] || []).map(c => this.camels[c]), n = gs.length, olds = old.map(g => g.position.clone());
        const from = cur, targets = gs.map((g, i) => this.slot(p, i));
        this.focusOn(targets[0]);
        await this.tween(msStep * 1.6, t => {
          const e = ease(t);
          gs.forEach((g, i) => { const f = from[i], to = targets[i]; g.position.set(f.x + (to.x - f.x) * e, f.y + (to.y - f.y) * e + Math.sin(Math.PI * t) * 0.5, f.z + (to.z - f.z) * e); });
          old.forEach((g, i) => { const o = olds[i]; g.position.y = o.y + n * STACK_H * ease(Math.min(1, t * 1.6)) + Math.sin(Math.PI * t) * 0.15; });
        });
        cur = targets; onStep && onStep(p, true);
      } else if (mv.to !== mv.land) { await hopTo(mv.to, 0.9, msStep * 1.2); onStep && onStep(mv.to, true); }
    }
    gs.forEach(g => { g.userData.busy = false; });
    // cập nhật bàn nội bộ
    if (mv.under) b[mv.to] = [...unit, ...(b[mv.to] || [])]; else b[mv.to] = [...(b[mv.to] || []), ...unit];
    b.forEach((s, p) => s.forEach((c, i) => this.placeCamel(c, p, i)));
    this.updateCrown();
    if (mv.to > TRACK) { const p = this.slot(mv.to, 0); this.burst(p.clone().add(new THREE.Vector3(0, 1, 0)), '#ffd54a', 60, 2.2); this.flashAt(p, '#ffd54a'); }
  }
  bounceTile(pos) {
    const g = this.tileObjs.find(x => x.visible && x.userData.t && x.userData.t.pos === pos); if (!g) return;
    const y0 = g.position.y; this.burst(g.position.clone().add(new THREE.Vector3(0, 0.3, 0)), g.userData.t.side > 0 ? '#3fc6e0' : '#d9c8ff', 22, 1.2);
    this.tween(420, t => { g.position.y = y0 + Math.sin(Math.PI * t) * 0.25; g.scale.set(1 + Math.sin(Math.PI * t) * 0.2, 1, 1 + Math.sin(Math.PI * t) * 0.2); }).then(() => { g.position.y = y0; g.scale.setScalar(1); });
  }
  celebrate(c) {
    if (!this.fxOn) return; const g = this.camels[c]; if (!g) return;
    const fig = g.userData.fig; this.tween(1100, t => { fig.position.y = Math.abs(Math.sin(t * Math.PI * 4)) * 0.4 * (1 - t); fig.rotation.y = t * Math.PI * 2; }).then(() => { fig.rotation.y = 0; fig.position.y = 0; });
    for (let i = 0; i < 5; i++) setTimeout(() => { const p = new THREE.Vector3((Math.random() - 0.5) * 8, 3 + Math.random() * 2, (Math.random() - 0.5) * 8); this.burst(p, [CAMEL[c].color, '#ffe14d', '#ffffff'][i % 3], 60, 2.2); this.flashAt(p, CAMEL[c].color); }, i * 280);
  }
  // ---------- chọn ô (đặt thảm) ----------
  markSpaces(list, side = 1) {
    this.marks.forEach(m => { m.visible = false; }); this.markList = list || [];
    for (const p of this.markList) { const m = this.marks[p]; if (!m) continue; m.visible = true; m.children[0].material.color.set(side > 0 ? '#5ee08f' : '#b59cff'); }
    if (this.markList.length) this.overviewSoft();
  }
  pickSpace(x, y) {
    const r = this.renderer.domElement.getBoundingClientRect(); let best = null, bd = 60;
    for (const p of this.markList) {
      const v = spaceXZ(p); v.y = TH; const q = v.project(this.camera), sx = (q.x + 1) / 2 * r.width + r.left, sy = (1 - q.y) / 2 * r.height + r.top;
      const d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  // ---------- hạt (pool cố định) ----------
  buildFx() {
    const N = 80;
    this.pools = [0, 1, 2].map(() => {
      const geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, transparent: true, opacity: 0, depthWrite: false });
      const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.visible = false; this.root.add(pts);
      return { pts, geo, pos, mat, vel: new Float32Array(N * 3), n: 0, t: 0, life: 1 };
    });
    this.poolI = 0;
  }
  burst(at, color, n = 30, speed = 1.6) {
    if (!this.fxOn) return; const P = this.pools[this.poolI++ % this.pools.length]; n = Math.min(n, 80);
    P.n = n; P.t = 0; P.life = 1.1; P.mat.color.set(color); P.mat.opacity = 1; P.pts.visible = true;
    for (let k = 0; k < n; k++) { P.pos.set([at.x, at.y, at.z], k * 3); const a = Math.random() * Math.PI * 2, b = Math.random() * 0.9 + 0.2, s = speed * (0.5 + Math.random() * 0.7); P.vel.set([Math.cos(a) * Math.cos(b) * s, Math.sin(b) * s * 1.4, Math.sin(a) * Math.cos(b) * s], k * 3); }
    P.geo.setDrawRange(0, n); P.geo.attributes.position.needsUpdate = true;
  }
  flashAt(p, color) { if (!this.fxOn) return; const l = this.flash[this.flashI++ % 2]; l.color.set(color); l.position.set(p.x, p.y + 1, p.z); l.userData.t0 = performance.now(); l.intensity = 6; }
  floatAt(p, text, color = '#e53935') {
    const sp = textSprite(text, color, '#fff', 0.46); sp.position.copy(p).add(new THREE.Vector3(0, 1.4, 0)); this.root.add(sp);
    const y0 = sp.position.y; this.tween(1500, t => { sp.position.y = y0 + easeOut(t) * 0.9; sp.material.opacity = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25; }).then(() => { this.root.remove(sp); sp.material.map.dispose(); sp.material.dispose(); });
  }
  camelPos(c) { const g = this.camels[c]; return g ? g.position.clone() : new THREE.Vector3(); }
  spacePos(p) { const v = spaceXZ(p); v.y = TH; return v; }
  shake(a = 0.15) { if (this.fxOn) this.shakeAmt = Math.max(this.shakeAmt || 0, a); }
  // ---------- camera ----------
  follow() { this.cam.pinned = false; this.cam.mode = 'follow'; this.o.onCamera && this.o.onCamera('follow'); }
  overview() { this.cam.pinned = true; this.cam.mode = 'overview'; this.o.onCamera && this.o.onCamera('overview'); }
  overviewSoft() { if (this.cam.mode === 'follow') { this.focusPt = new THREE.Vector3(0, 0, 0); this.wide = true; } }
  focusOn(v3) { this.wide = false; this.focusPt = v3.clone(); if (this.cam.mode === 'free' && performance.now() - this.cam.lastUser > 2500 && !this.cam.pinned) { this.cam.mode = 'follow'; this.o.onCamera && this.o.onCamera('follow'); } }
  focusLead() { const c = Object.values(this.camels).find(g => g.userData.crown.visible); if (c) this.focusOn(c.position); }
  resize() {
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h, false); this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.fov = w / h < 0.8 ? 48 : 40; this.camera.updateProjectionMatrix();
    this.portrait = w / h < 0.9;
    // khoảng cách vừa khít cả đường đua + khu về đích
    const pol = this.portrait ? 0.6 : 1.1, cam = this.camera.clone(), pts = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * (R2 + 0.3), 0, Math.sin(a) * (R2 + 0.3))); }
    for (let k = 1; k <= 3; k++) pts.push(spaceXZ(TRACK + k)); pts.push(new THREE.Vector3(0, 3.8, 0)); pts.push(new THREE.Vector3(Math.cos(A0) * R, 3.1, Math.sin(A0) * R));
    let d = 8;
    for (; d < 70; d += 0.4) {
      cam.position.setFromSpherical(new THREE.Spherical(d, pol, 0)); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
      if (pts.every(c => { const p = c.clone().project(cam); return Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.92; })) break;
    }
    this.overDist = d; this.overPol = pol; this.controls.maxDistance = d * 1.5;
  }
  desired() {
    if (this.cam.mode === 'follow' && this.focusPt && !this.wide) {
      const t = this.focusPt.clone().multiplyScalar(0.6); t.y = 0;
      return { t, az: 0, pol: this.portrait ? 0.72 : 1.02, dist: this.overDist * (this.portrait ? 0.72 : 0.68) };
    }
    return { t: new THREE.Vector3(0, 0, 0), az: 0, pol: this.overPol, dist: this.overDist };
  }
  snap() { this.updateCamera(1e6); }
  updateCamera(dt) {
    const c = this.cam, cam = this.camera, tg = this.controls.target;
    if (c.mode === 'free') { this.controls.update(); tg.x = THREE.MathUtils.clamp(tg.x, -10, 10); tg.z = THREE.MathUtils.clamp(tg.z, -10, 10); tg.y = THREE.MathUtils.clamp(tg.y, -0.5, 3); return; }
    const d = this.desired(), k = dt > 100 ? 1 : 1 - Math.pow(0.06, dt);
    const off = cam.position.clone().sub(tg), sph = new THREE.Spherical().setFromVector3(off);
    const dAz = Math.atan2(Math.sin(d.az - sph.theta), Math.cos(d.az - sph.theta));
    sph.theta += dAz * k; sph.phi += (d.pol - sph.phi) * k; sph.radius += (d.dist - sph.radius) * k;
    tg.lerp(d.t, k); cam.position.copy(tg).add(new THREE.Vector3().setFromSpherical(sph)); cam.lookAt(tg);
  }
  frame() {
    const now = performance.now(), el = this.clock.getElapsedTime(), dt = Math.min(0.05, now / 1000 - (this.lastT || now / 1000)); this.lastT = now / 1000;
    this.anims = this.anims.filter(a => { const t = Math.min(1, (now - a.t0) / a.ms); a.fn(t); if (t >= 1) { a.res(); return false; } return true; });
    // nắp vàng kim tự tháp nảy khi nhả xúc xắc
    const kt = (now - (this.cap.userData.kick || -1e9)) / 500; this.cap.position.y = 3.35 + (kt < 1 ? Math.sin(kt * Math.PI) * 0.5 : 0) + Math.sin(el * 2) * 0.03; this.cap.rotation.y = Math.PI / 4 + el * 0.4;
    for (const c in this.camels) {
      const u = this.camels[c].userData;
      if (u.crown.visible) { u.crown.rotation.y = el * 1.8; u.crown.position.y = 1.62 * CS + 0.3 + Math.sin(el * 3) * 0.06; }
      if (!u.busy && this.camels[c].visible) u.fig.rotation.z = Math.sin(el * 1.6 + c.length) * 0.015;
    }
    this.marks.forEach((m, i) => { if (m.visible) m.children[0].scale.setScalar(1 + 0.12 * Math.sin(el * 6 + i)); });
    for (const g of this.tileObjs) if (g.visible) { const u = g.userData; if (u.mir.visible) u.mir.children.forEach((w, i) => { w.position.y = 0.12 + i * 0.16 + Math.sin(el * 2.5 + i) * 0.05; w.material.opacity = 0.45 + Math.sin(el * 3 + i) * 0.15; }); u.sign.lookAt(this.camera.position); }
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
