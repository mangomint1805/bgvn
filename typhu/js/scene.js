// Bàn cờ isometric vẽ bằng Phaser 3 – mọi hình (ô đất, nhà, landmark, quân cờ) đều tự vẽ bằng code, không dùng ảnh ngoài.
import { SQUARES, N, GROUPS, money } from './board.js';

const L = 9.8, CW = 1.4; // cạnh bàn (đơn vị ô), bề rộng ô góc
// toạ độ nhìn từ trên xuống của từng ô: [x0, y0, x1, y1] và cạnh phía trong (để vẽ dải màu)
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
const hex = c => parseInt(c.replace('#', ''), 16);
const shade = (c, f) => { let r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; r = Math.min(255, Math.round(r * f)); g = Math.min(255, Math.round(g * f)); b = Math.min(255, Math.round(b * f)); return (r << 16) | (g << 8) | b; };

export class BoardScene extends Phaser.Scene {
  constructor(api) { super('board'); this.api = api || {}; this.tiles = []; this.pawns = {}; this.bld = {}; }
  // ---------- chiếu isometric ----------
  P(x, y) { return this.flat ? [this.ox + x * this.k, this.oy + y * this.k * 0.9] : [this.ox + (x - y) * this.k, this.oy + (x + y) * this.k * 0.5]; }
  center(i) { const [x0, y0, x1, y1] = cellRect(i); return this.P((x0 + x1) / 2, (y0 + y1) / 2); }
  create() {
    this.makeTextures();
    this.layout();
    this.scale.on('resize', () => { this.layout(); this.redraw(); });
    // kéo để xem, lăn chuột / chụm 2 ngón để phóng to
    this.input.addPointer(1);
    let drag = null, pinch = null;
    this.input.on('pointerdown', p => { drag = { x: p.x, y: p.y, sx: this.cameras.main.scrollX, sy: this.cameras.main.scrollY, moved: false }; });
    this.input.on('pointermove', p => {
      const ps = [this.input.pointer1, this.input.pointer2].filter(q => q && q.isDown);
      const cam = this.cameras.main;
      if (ps.length === 2) { const d = Phaser.Math.Distance.Between(ps[0].x, ps[0].y, ps[1].x, ps[1].y); if (!pinch) pinch = { d, z: cam.zoom }; cam.setZoom(Phaser.Math.Clamp(pinch.z * d / pinch.d, 0.8, 2.6)); if (drag) drag.moved = true; return; }
      pinch = null;
      if (drag && p.isDown) { const dx = p.x - drag.x, dy = p.y - drag.y; if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true; if (drag.moved && cam.zoom > 1.01) cam.setScroll(drag.sx - dx / cam.zoom, drag.sy - dy / cam.zoom); }
    });
    this.input.on('pointerup', () => { this.wasDrag = drag && drag.moved; drag = null; pinch = null; });
    this.input.on('wheel', (p, o, dx, dy) => { const cam = this.cameras.main; cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.8, 2.6)); if (cam.zoom <= 1.01) cam.setScroll(0, 0); });
    this.redraw();
    this.api.ready && this.api.ready(this);
  }
  layout() {
    const W = this.scale.width, H = this.scale.height;
    const thick = 0.035; // độ dày đảo so với bề ngang
    this.flat = H > W * 1.05; // màn dọc (điện thoại): nhìn từ trên xuống cho dễ đọc
    if (this.flat) {
      this.k = Math.min((W * 0.94) / (L + 0.7), (H * 0.96) / ((L + 0.7) * 0.9 + 0.8));
      this.ox = (W - L * this.k) / 2; this.oy = (H - (L * 0.9 + 0.5) * this.k) / 2 + 0.3 * this.k;
      this.T = this.k * 0.35; return;
    }
    this.k = Math.min((W * 0.96) / (2 * L), (H * 0.94) / (L * (1 + 2 * thick) + 0.6));
    this.ox = W / 2; this.oy = (H - L * this.k * (1 + 2 * thick)) / 2 + 0.3 * this.k;
    this.T = L * this.k * thick * 2; // độ dày đảo (px)
  }
  makeTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff); g.fillCircle(8, 8, 8); g.generateTexture('dot', 16, 16); g.clear();
    g.fillStyle(0xffffff); g.fillRect(0, 0, 10, 6); g.generateTexture('confetti', 10, 6); g.destroy();
  }
  // ---------- vẽ cả bàn ----------
  redraw() {
    if (this.root) this.root.destroy();
    this.root = this.add.container(0, 0); this.tiles = []; this.bld = {};
    const g = this.add.graphics(); this.root.add(g);
    const k = this.k, T = this.T;
    // đảo: mặt cỏ + 2 mặt đất phía trước + bóng
    const pad = 0.35, A = this.P(-pad, -pad), B = this.P(L + pad, -pad), C = this.P(L + pad, L + pad), D = this.P(-pad, L + pad);
    if (!this.flat) { g.fillStyle(0x1c2b5a, 0.14); g.fillEllipse(C[0], C[1] + T * 1.4, L * k * 1.3, L * k * 0.18); }
    g.fillStyle(0x6b4226); g.fillPoints([{ x: D[0], y: D[1] }, { x: C[0], y: C[1] }, { x: C[0], y: C[1] + T }, { x: D[0], y: D[1] + T }], true);
    if (!this.flat) { g.fillStyle(0x8a5a32); g.fillPoints([{ x: C[0], y: C[1] }, { x: B[0], y: B[1] }, { x: B[0], y: B[1] + T }, { x: C[0], y: C[1] + T }], true); }
    // vân đất
    g.lineStyle(2, 0x5a361e, 0.6);
    for (let t = 0.33; t < 1; t += 0.33) { g.lineBetween(D[0], D[1] + T * t, C[0], C[1] + T * t); if (!this.flat) g.lineBetween(C[0], C[1] + T * t, B[0], B[1] + T * t); }
    g.fillStyle(0x5cbf6a); g.fillPoints([A, B, C, D].map(([x, y]) => ({ x, y })), true);
    g.fillStyle(0x7bd389); const e = 0.12; g.fillPoints([this.P(-pad + e, -pad + e), this.P(L + pad - e, -pad + e), this.P(L + pad - e, L + pad - e), this.P(-pad + e, L + pad - e)].map(([x, y]) => ({ x, y })), true);
    // sân giữa lát gạch caro
    for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) {
      const x0 = CW + 0.1 + a * (L - 2 * CW - 0.2) / 7, y0 = CW + 0.1 + b * (L - 2 * CW - 0.2) / 7, s = (L - 2 * CW - 0.2) / 7;
      g.fillStyle((a + b) % 2 ? 0xd9eedc : 0xc6e4cb);
      g.fillPoints([this.P(x0, y0), this.P(x0 + s, y0), this.P(x0 + s, y0 + s), this.P(x0, y0 + s)].map(([x, y]) => ({ x, y })), true);
    }
    // cây trang trí
    [[2.3, 2.4, '🌳'], [7.4, 2.3, '🌴'], [2.4, 7.4, '🌴'], [7.5, 7.4, '🌳'], [4.9, 4.9, '⛲'], [3.4, 6.4, '🌷'], [6.4, 3.4, '🌷']].forEach(([x, y, em]) => {
      const [px, py] = this.P(x, y); const t = this.add.text(px, py, em, { fontSize: Math.round(k * 0.95) + 'px' }).setOrigin(0.5, 0.9); this.root.add(t);
    });
    // ô
    for (let i = 0; i < N; i++) this.drawTile(i);
    // sắp xếp chiều sâu: vật ở thấp (y lớn) vẽ đè lên
    this.root.list.forEach(o => { if (o.depthKey == null) o.depthKey = o === g ? -1e9 : o.y; });
    this.root.sort('depthKey');
    // quân cờ
    for (const id in this.pawns) this.pawns[id].destroy();
    this.pawns = {};
    if (this.lastView) { this.sync(this.lastView, true); this.api.placeAll && this.api.placeAll(); }
  }
  drawTile(i) {
    const q = SQUARES[i], [x0, y0, x1, y1, inner] = cellRect(i), k = this.k, gap = 0.05;
    const corners = [[x0 + gap, y0 + gap], [x1 - gap, y0 + gap], [x1 - gap, y1 - gap], [x0 + gap, y1 - gap]].map(([x, y]) => this.P(x, y));
    const g = this.add.graphics(); this.root.add(g); g.depthKey = -1e8 + i;
    const pts = corners.map(([x, y]) => ({ x, y }));
    // bề dày ô
    g.fillStyle(0x000000, 0.18); g.fillPoints(pts.map(p => ({ x: p.x, y: p.y + k * 0.12 })), true);
    const base = q.type === 'start' ? 0xffd86b : q.type === 'island' ? 0x8fdcf5 : q.type === 'festival' ? 0xff9cc9 : q.type === 'travel' ? 0xb2bdff : q.type === 'chance' ? 0xfff1c4 : q.type === 'tax' ? 0xffdede : q.type === 'resort' ? 0xdff7fb : 0xfffdf6;
    g.fillStyle(base); g.fillPoints(pts, true);
    g.lineStyle(1.5, 0x000000, 0.12); g.strokePoints(pts, true);
    // dải màu nhóm phía trong
    if (inner && (q.type === 'city' || q.type === 'resort')) {
      const bw = 0.3; let r;
      if (inner === 'top') r = [x0 + gap, y0 + gap, x1 - gap, y0 + bw]; else if (inner === 'bottom') r = [x0 + gap, y1 - bw, x1 - gap, y1 - gap];
      else if (inner === 'right') r = [x1 - bw, y0 + gap, x1 - gap, y1 - gap]; else r = [x0 + gap, y0 + gap, x0 + bw, y1 - gap];
      const col = q.type === 'city' ? hex(GROUPS[q.group].color) : 0x19b5c9;
      g.fillStyle(col); g.fillPoints([this.P(r[0], r[1]), this.P(r[2], r[1]), this.P(r[2], r[3]), this.P(r[0], r[3])].map(([x, y]) => ({ x, y })), true);
      const [bx, by] = this.P((r[0] + r[2]) / 2, (r[1] + r[3]) / 2);
      const pt = this.add.text(bx, by, money(q.price), { fontFamily: 'Nunito', fontStyle: '900', fontSize: Math.max(8, Math.round(k * 0.2)) + 'px', color: '#ffffff' }).setOrigin(0.5); pt.setShadow(0, 1, '#0006', 1); pt.depthKey = -1e7 + i; this.root.add(pt);
    }
    const [cx, cy] = this.center(i);
    const corner = i % 8 === 0;
    if (q.icon) { const ic = this.add.text(cx, cy - k * (corner ? 0.25 : 0.12), q.icon, { fontSize: Math.round(k * (corner ? 0.85 : 0.45)) + 'px' }).setOrigin(0.5, 0.8); ic.depthKey = cy - 1; this.root.add(ic); }
    const label = this.add.text(cx, cy + k * (q.icon ? 0.12 : 0.02), q.name.replace('Cách Mạng Tháng 8', 'CM Tháng 8'), {
      fontFamily: 'Nunito', fontStyle: '900', fontSize: Math.max(8, Math.round(k * (this.flat ? (corner ? 0.26 : 0.22) : (corner ? 0.24 : 0.19)))) + 'px', color: '#24314d', align: 'center',
      wordWrap: { width: k * (this.flat ? (corner ? 1.3 : (inner === 'left' || inner === 'right' ? 1.1 : 0.9)) : (corner ? 1.6 : 1.05)) }, backgroundColor: corner ? undefined : '#ffffffcc', padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 0.5); label.depthKey = cy - 0.5; this.root.add(label);
    // vùng bấm
    const zone = this.add.zone(0, 0, this.scale.width, this.scale.height).setOrigin(0);
    zone.setInteractive(new Phaser.Geom.Polygon(pts), Phaser.Geom.Polygon.Contains);
    zone.on('pointerup', () => { if (!this.wasDrag) this.api.onCell && this.api.onCell(i); });
    zone.depthKey = -2e9; this.root.add(zone);
    const glow = this.add.graphics(); glow.depthKey = 1e9; this.root.add(glow);
    this.tiles[i] = { g, label, pts, glow, cx, cy };
  }
  // ---------- nhà cửa ----------
  house(x, y, col, s) { // khối nhà isometric nhỏ
    const g = this.add.graphics(); const w = s, h = s * 0.8, r = s * 0.55;
    const c = hex(col);
    g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + w * 0.25, w * 2.1, w * 0.9);
    g.fillStyle(0xfff6e6); g.fillPoints([{ x: x - w, y: y - w * 0.5 + w * 0.5 }, { x, y: y + w * 0.5 }, { x, y: y + w * 0.5 - h }, { x: x - w, y: y - h }], true);
    g.fillStyle(0xe8dcc6); g.fillPoints([{ x, y: y + w * 0.5 }, { x: x + w, y }, { x: x + w, y: y - h }, { x, y: y + w * 0.5 - h }], true);
    g.fillStyle(shade(c, 0.85)); g.fillPoints([{ x: x - w, y: y - h }, { x, y: y + w * 0.5 - h }, { x, y: y + w * 0.5 - h - r }, { x: x - w * 0.5, y: y - h - r * 1.25 }], true);
    g.fillStyle(c); g.fillPoints([{ x, y: y + w * 0.5 - h }, { x: x + w, y: y - h }, { x: x + w * 0.5, y: y - h - r * 1.25 }, { x, y: y + w * 0.5 - h - r }], true);
    g.fillStyle(0x7ab8e8); g.fillRect(x - w * 0.6, y - h * 0.55, w * 0.28, w * 0.28); g.fillRect(x + w * 0.35, y - h * 0.62, w * 0.28, w * 0.28);
    g.depthKey = y; return g;
  }
  tower(x, y, col, s) { // landmark: toà tháp kính có đỉnh vàng
    const g = this.add.graphics(); const w = s * 1.25, h = s * 3.6, c = hex(col);
    g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y + w * 0.3, w * 2.4, w);
    g.fillStyle(shade(c, 1.15)); g.fillPoints([{ x: x - w, y }, { x, y: y + w * 0.5 }, { x, y: y + w * 0.5 - h }, { x: x - w * 0.8, y: y - h * 0.95 }], true);
    g.fillStyle(shade(c, 0.8)); g.fillPoints([{ x, y: y + w * 0.5 }, { x: x + w, y }, { x: x + w * 0.8, y: y - h * 0.95 }, { x, y: y + w * 0.5 - h }], true);
    g.lineStyle(1, 0xffffff, 0.5); for (let t = 0.15; t < 0.95; t += 0.14) { g.lineBetween(x - w * 0.95, y - h * t, x, y + w * 0.5 - h * t); g.lineBetween(x, y + w * 0.5 - h * t, x + w * 0.95, y - h * t); }
    g.fillStyle(0xffd54a); g.fillTriangle(x - w * 0.8, y - h * 0.95, x + w * 0.8, y - h * 0.95, x, y - h * 1.35); g.fillStyle(0xffb300); g.fillTriangle(x, y + w * 0.5 - h, x + w * 0.8, y - h * 0.95, x, y - h * 1.35);
    g.fillStyle(0xfff3b0); g.fillCircle(x, y - h * 1.38, s * 0.18);
    g.depthKey = y; return g;
  }
  flag(x, y, col, s) {
    const g = this.add.graphics(); g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y, s * 1.2, s * 0.5);
    g.fillStyle(0x6d4c41); g.fillRect(x - 1.5, y - s * 2.2, 3, s * 2.2); g.fillStyle(hex(col)); g.fillTriangle(x + 1.5, y - s * 2.2, x + 1.5 + s * 1.3, y - s * 1.85, x + 1.5, y - s * 1.5);
    g.depthKey = y; return g;
  }
  // ---------- cập nhật theo trạng thái ván ----------
  sync(v, force) {
    this.lastView = v;
    const k = this.k;
    for (let i = 0; i < N; i++) {
      const q = SQUARES[i]; if (q.type !== 'city' && q.type !== 'resort') continue;
      const pr = v.props[i]; const owner = pr && v.players.find(p => p.id === pr.owner);
      const key = pr ? `${pr.owner}:${pr.level}:${owner && owner.color}:${v.festival === i}:${v.rents[i]}` : '';
      if (!force && this.bld[i] && this.bld[i].key === key) continue;
      if (this.bld[i]) this.bld[i].objs.forEach(o => o.destroy());
      const objs = []; const t = this.tiles[i];
      // viền màu chủ đất
      t.g.lineStyle(0); if (t.own) t.own.destroy();
      if (pr) {
        const og = this.add.graphics(); og.lineStyle(Math.max(2, k * 0.08), hex(owner.color), 1); og.strokePoints(t.pts, true); og.depthKey = -1e8 + 50 + i; this.root.add(og); objs.push(og);
        const [cx, cy] = [t.cx, t.cy];
        const s = k * 0.2;
        if (q.type === 'resort') objs.push(this.flag(cx + k * 0.25, cy + k * 0.05, owner.color, k * 0.22));
        else if (pr.level === 4) objs.push(this.tower(cx, cy + k * 0.05, owner.color, s));
        else if (pr.level === 0) objs.push(this.flag(cx + k * 0.25, cy + k * 0.05, owner.color, k * 0.22));
        else { const offs = [[0, 0], [-0.32, 0.12], [0.32, 0.12]]; for (let h = 0; h < pr.level; h++) objs.push(this.house(cx + offs[h][0] * k, cy + offs[h][1] * k + k * 0.08, owner.color, s)); }
        const rent = this.add.text(cx, cy + k * 0.42, money(v.rents[i]), { fontFamily: 'Nunito', fontStyle: '900', fontSize: Math.max(8, Math.round(k * 0.2)) + 'px', color: '#ffffff', backgroundColor: owner.color, padding: { x: 4, y: 1 } }).setOrigin(0.5); rent.depthKey = cy + k * 0.6; objs.push(rent);
        if (v.festival === i) { const f = this.add.text(cx - k * 0.35, cy - k * 0.2, '🎉', { fontSize: Math.round(k * 0.5) + 'px' }).setOrigin(0.5); f.depthKey = cy + 1; this.tweens.add({ targets: f, y: f.y - k * 0.15, yoyo: true, repeat: -1, duration: 600 }); objs.push(f); }
        objs.forEach(o => { if (!this.root.exists(o)) this.root.add(o); });
      }
      this.bld[i] = { key, objs };
    }
    this.root.sort('depthKey');
    // quân cờ
    for (const p of v.players) {
      if (!this.pawns[p.id]) this.pawns[p.id] = this.makePawn(p);
      this.pawns[p.id].setVisible(!p.out);
    }
  }
  makePawn(p) {
    const k = this.k, c = this.add.container(0, 0), col = hex(p.color);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25); g.fillEllipse(0, 0, k * 0.55, k * 0.22);
    g.fillStyle(shade(col, 0.75)); g.fillEllipse(0, -k * 0.04, k * 0.48, k * 0.2);
    g.fillStyle(col); g.fillTriangle(-k * 0.2, -k * 0.06, k * 0.2, -k * 0.06, 0, -k * 0.62); g.fillEllipse(0, -k * 0.07, k * 0.4, k * 0.16);
    g.fillStyle(0xffffff, 0.35); g.fillTriangle(-k * 0.1, -k * 0.1, -k * 0.02, -k * 0.1, -k * 0.02, -k * 0.5);
    const body = this.add.container(0, 0, [g]);
    const head = this.add.graphics(); head.fillStyle(0xffffff); head.fillCircle(0, -k * 0.72, k * 0.24); head.lineStyle(Math.max(2, k * 0.06), col); head.strokeCircle(0, -k * 0.72, k * 0.24); body.add(head);
    const av = this.add.text(0, -k * 0.72, p.avatar || '🙂', { fontSize: Math.round(k * 0.32) + 'px' }).setOrigin(0.5); body.add(av);
    c.add(body); c.body2 = body; this.root.add(c); c.depthKey = 0;
    return c;
  }
  pawnXY(i, k2, n) {
    const [cx, cy] = this.center(i); const off = [[-0.25, -0.05], [0.25, -0.05], [-0.25, 0.2], [0.25, 0.2]][k2] || [0, 0];
    return n > 1 ? [cx + off[0] * this.k, cy + off[1] * this.k] : [cx, cy + 0.05 * this.k];
  }
  placePawn(id, i, k2, n, ms = 0) {
    const c = this.pawns[id]; if (!c) return Promise.resolve();
    const [x, y] = this.pawnXY(i, k2, n);
    c.depthKey = y + 0.5; this.root.sort('depthKey');
    if (!ms) { c.setPosition(x, y); return Promise.resolve(); }
    return new Promise(res => this.tweens.add({ targets: c, x, y, duration: ms, ease: 'Sine.easeInOut', onComplete: res }));
  }
  hop(id, i, ms) {
    const c = this.pawns[id]; if (!c) return Promise.resolve();
    const [x, y] = this.pawnXY(i, 0, 1);
    this.tweens.add({ targets: c.body2, y: -this.k * 0.45, duration: ms / 2, yoyo: true, ease: 'Quad.easeOut' });
    return this.placePawn(id, i, 0, 1, ms).then(() => { c.depthKey = y + 0.5; });
  }
  fly(id, i, ms) {
    const c = this.pawns[id]; if (!c) return Promise.resolve();
    this.tweens.add({ targets: c.body2, y: -this.k * 2.2, duration: ms / 2, yoyo: true, ease: 'Sine.easeOut' });
    return this.placePawn(id, i, 0, 1, ms);
  }
  // ---------- hiệu ứng ----------
  burst(i, color = '#ffd54a', n = 24) {
    const t = this.tiles[i]; if (!t) return;
    const em = this.add.particles(t.cx, t.cy - this.k * 0.3, 'dot', { speed: { min: 60, max: 220 }, angle: { min: 200, max: 340 }, gravityY: 400, lifespan: 900, scale: { start: 0.5, end: 0 }, tint: [hex(color), 0xffffff, 0xffd54a], emitting: false });
    em.depthKey = 2e9; this.root.add(em); this.root.sort('depthKey'); em.explode(n); this.time.delayedCall(1200, () => em.destroy());
  }
  floatAt(i, text, color = '#e53935') {
    const t = this.tiles[i]; if (!t) return;
    const tx = this.add.text(t.cx, t.cy - this.k * 0.5, text, { fontFamily: 'Baloo 2', fontStyle: '800', fontSize: Math.round(this.k * 0.45) + 'px', color, stroke: '#ffffff', strokeThickness: 5 }).setOrigin(0.5);
    tx.depthKey = 3e9; this.root.add(tx); this.root.sort('depthKey');
    this.tweens.add({ targets: tx, y: tx.y - this.k * 1.2, alpha: 0, duration: 1400, ease: 'Cubic.easeOut', onComplete: () => tx.destroy() });
  }
  pulse(i) { const t = this.tiles[i]; if (!t) return; t.glow.clear(); t.glow.fillStyle(0xffffff, 0.6); t.glow.fillPoints(t.pts, true); t.glow.alpha = 1; this.tweens.add({ targets: t.glow, alpha: 0, duration: 700 }); }
  pick(options) {
    this.endPick();
    this.picking = options.map(i => { const t = this.tiles[i]; t.glow.clear(); t.glow.lineStyle(Math.max(3, this.k * 0.1), 0xffb300, 1); t.glow.strokePoints(t.pts, true); t.glow.fillStyle(0xffe066, 0.35); t.glow.fillPoints(t.pts, true); t.glow.alpha = 1; return this.tweens.add({ targets: t.glow, alpha: 0.35, yoyo: true, repeat: -1, duration: 500 }); });
    this.pickSet = options;
    this.tiles.forEach((t, i) => { if (!options.includes(i)) t.label.setAlpha(0.35); });
  }
  endPick() { (this.picking || []).forEach(tw => tw.stop()); this.picking = null; this.tiles.forEach(t => { t.glow.clear(); t.label.setAlpha(1); }); }
  confetti() {
    const W = this.scale.width; const em = this.add.particles(0, -10, 'confetti', { x: { min: 0, max: W }, speedY: { min: 150, max: 350 }, speedX: { min: -60, max: 60 }, rotate: { start: 0, end: 720 }, lifespan: 3500, quantity: 4, frequency: 30, tint: [0xff5a5f, 0xffd54a, 0x2fc76f, 0x3d8bff, 0xa259ff] });
    em.setScrollFactor(0); em.depthKey = 4e9; this.root.add(em); this.time.delayedCall(2200, () => em.stop()); this.time.delayedCall(6000, () => em.destroy());
  }
}
