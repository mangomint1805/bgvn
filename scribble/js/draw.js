// Bảng vẽ: canvas logic 800×600 co giãn theo khung, vẽ bằng chuột/cảm ứng (pointer events),
// gom điểm thành lô ~100ms để gửi qua mạng, hoàn tác/xoá/đổ màu đều là "thao tác" phát lại được.
import { W, H, PALETTE, SIZES, COLOR_NAMES, pushOp, decodePts, encodePts } from './ops.js?v=2';
export { W, H, PALETTE, SIZES };

const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function floodFill(ctx, x, y, hex) {
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  const [r, g, b] = hexRgb(hex), i0 = (y * W + x) * 4;
  const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2];
  if (Math.abs(tr - r) + Math.abs(tg - g) + Math.abs(tb - b) < 6) return;
  const TOL = 96, mask = new Uint8Array(W * H);
  const ok = p => !mask[p] && Math.abs(d[p * 4] - tr) + Math.abs(d[p * 4 + 1] - tg) + Math.abs(d[p * 4 + 2] - tb) <= TOL;
  const stack = [x, y];
  while (stack.length) {
    const sy = stack.pop(); let sx = stack.pop();
    let p = sy * W + sx; if (!ok(p)) continue;
    while (sx > 0 && ok(p - 1)) { sx--; p--; }
    let up = false, dn = false;
    while (sx < W && ok(p)) {
      mask[p] = 1;
      if (sy > 0) { const q = p - W; if (ok(q)) { if (!up) { stack.push(sx, sy - 1); up = true; } } else up = false; }
      if (sy < H - 1) { const q = p + W; if (ok(q)) { if (!dn) { stack.push(sx, sy + 1); dn = true; } } else dn = false; }
      sx++; p++;
    }
  }
  // tô cả viền khử răng cưa 1px quanh vùng để không lộ khe trắng
  const paint = p => { d[p * 4] = r; d[p * 4 + 1] = g; d[p * 4 + 2] = b; d[p * 4 + 3] = 255; };
  for (let p = 0; p < W * H; p++) {
    if (!mask[p]) continue; paint(p);
    const px = p % W;
    if (px > 0 && !mask[p - 1]) paint(p - 1);
    if (px < W - 1 && !mask[p + 1]) paint(p + 1);
    if (p >= W && !mask[p - W]) paint(p - W);
    if (p < W * (H - 1) && !mask[p + W]) paint(p + W);
  }
  ctx.putImageData(img, 0, 0);
}
export function renderOp(ctx, op) {
  if (op.k === 'c') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); return; }
  if (op.k === 'f') { floodFill(ctx, op.x, op.y, PALETTE[op.c]); return; }
  if (op.k !== 's') return;
  const pts = decodePts(op.p), w = SIZES[op.w];
  ctx.strokeStyle = ctx.fillStyle = PALETTE[op.c]; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (pts.length === 2) { ctx.beginPath(); ctx.arc(pts[0], pts[1], w / 2, 0, Math.PI * 2); ctx.fill(); return; }
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.stroke();
}
export function renderAll(ctx, ops) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); for (const op of ops || []) renderOp(ctx, op); }
// Vẽ ra canvas rời (để làm ảnh album / ảnh xem lại)
export function opsToCanvas(ops) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  renderAll(c.getContext('2d', { willReadFrequently: true }), ops); return c;
}

export class Board {
  // host: phần tử khung (kích thước do CSS quyết định); bảng tự co theo tỉ lệ 4:3 nằm giữa khung
  constructor(host, { editable = false, onOps = null, onChange = null } = {}) {
    this.host = host; this.onOps = onOps; this.onChange = onChange;
    this.el = document.createElement('div'); this.el.className = 'board';
    this.cv = document.createElement('canvas'); this.cv.width = W; this.cv.height = H;
    this.el.appendChild(this.cv); host.appendChild(this.el);
    this.ctx = this.cv.getContext('2d', { willReadFrequently: true });
    this.ops = []; this.color = 1; this.size = 1; this.tool = 'pen'; this.g = 1; this.cur = null;
    renderAll(this.ctx, []);
    this.ro = new ResizeObserver(() => this.fit()); this.ro.observe(host); this.fit();
    const c = this.cv;
    c.addEventListener('pointerdown', e => this.down(e));
    c.addEventListener('pointermove', e => this.move(e));
    c.addEventListener('pointerup', e => this.up(e));
    c.addEventListener('pointercancel', e => this.up(e));
    c.addEventListener('lostpointercapture', e => this.up(e));
    c.addEventListener('touchstart', e => { if (this.editable) e.preventDefault(); }, { passive: false });
    c.addEventListener('touchmove', e => { if (this.editable) e.preventDefault(); }, { passive: false });
    c.addEventListener('contextmenu', e => { if (this.editable) e.preventDefault(); });
    this.setEditable(editable);
  }
  fit() {
    const r = this.host.getBoundingClientRect(); if (!r.width || !r.height) return;
    let w = r.width, h = w * H / W; if (h > r.height) { h = r.height; w = h * W / H; }
    this.el.style.width = Math.floor(w) + 'px'; this.el.style.height = Math.floor(h) + 'px';
  }
  setEditable(b) { this.editable = !!b; this.el.classList.toggle('editable', this.editable); this.el.dataset.tool = this.tool; if (!b) this.finish(); }
  setTool(t) { this.tool = t; this.el.dataset.tool = t; }
  pt(e) {
    const r = this.cv.getBoundingClientRect();
    return [Math.max(0, Math.min(W - 1, Math.round((e.clientX - r.left) / r.width * W))), Math.max(0, Math.min(H - 1, Math.round((e.clientY - r.top) / r.height * H)))];
  }
  down(e) {
    if (!this.editable || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); this.finish();
    const p = this.pt(e);
    if (this.tool === 'fill') { this.commit({ k: 'f', g: this.g++, c: this.color, x: p[0], y: p[1] }); return; }
    try { this.cv.setPointerCapture(e.pointerId); } catch (x) {}
    this.cur = { id: e.pointerId, g: this.g++, c: this.tool === 'eraser' ? 0 : this.color, w: this.size, pts: [p], sent: 0 };
    renderOp(this.ctx, { k: 's', c: this.cur.c, w: this.cur.w, p: [p[0], p[1]] });
    clearInterval(this.flushT); this.flushT = setInterval(() => this.flush(), 100);
  }
  move(e) {
    const s = this.cur; if (!s || e.pointerId !== s.id) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) {
      const p = this.pt(ev), last = s.pts[s.pts.length - 1];
      if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 2) continue;
      s.pts.push(p);
      const ctx = this.ctx; ctx.strokeStyle = PALETTE[s.c]; ctx.lineWidth = SIZES[s.w]; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
    }
  }
  up(e) { if (this.cur && (!e || e.pointerId === this.cur.id)) this.finish(); }
  // gửi phần nét mới (kèm điểm cuối của lô trước để nét liền mạch)
  flush() {
    const s = this.cur; if (!s) return;
    if (s.sent >= s.pts.length && s.sent > 0) return;
    const from = Math.max(0, s.sent - 1), part = s.pts.slice(from);
    const op = { k: 's', g: s.g, c: s.c, w: s.w, p: encodePts(part) };
    s.sent = s.pts.length; this.ops.push(op); this.emit([op]);
  }
  finish() { if (!this.cur) return; this.flush(); clearInterval(this.flushT); this.cur = null; }
  commit(op) {
    this.finish();
    if (pushOp(this.ops, op)) renderAll(this.ctx, this.ops); else renderOp(this.ctx, op);
    this.emit([op]);
  }
  emit(ops) { this.onOps && this.onOps(ops); this.onChange && this.onChange(); }
  undo() { if (this.ops.length || this.cur) this.commit({ k: 'u' }); }
  clear() { this.commit({ k: 'c', g: this.g++ }); }
  // nhận thao tác từ người khác
  apply(ops) {
    let redraw = false;
    for (const op of ops) { if (pushOp(this.ops, op)) redraw = true; else if (!redraw) renderOp(this.ctx, op); }
    if (redraw) renderAll(this.ctx, this.ops);
  }
  setOps(ops) {
    this.cur = null; clearInterval(this.flushT); this.ops = [];
    for (const op of ops || []) pushOp(this.ops, op);
    this.g = this.ops.reduce((m, o) => Math.max(m, (o.g || 0) + 1), 1);
    renderAll(this.ctx, this.ops);
  }
  getOps() { this.flush(); return this.ops.slice(); }
  isEmpty() { return !this.ops.length; }
  destroy() { this.ro.disconnect(); clearInterval(this.flushT); this.el.remove(); }
}

// ---------- thanh công cụ ----------
const ICON = {
  pen: '<svg viewBox="0 0 24 24"><path d="M4 20l1.2-4.6L16.5 4.1a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z"/><path d="M14.5 6l3.5 3.5"/></svg>',
  eraser: '<svg viewBox="0 0 24 24"><path d="M8.5 20H20M4.6 15.6l9.9-9.9a2 2 0 0 1 2.8 0l2.5 2.5a2 2 0 0 1 0 2.8L12 18.8a4 4 0 0 1-5.6 0l-1.8-1.8a1 1 0 0 1 0-1.4z"/><path d="M9 11l5 5"/></svg>',
  fill: '<svg viewBox="0 0 24 24"><path d="M5 11l6-6 8 8-6 6a2 2 0 0 1-2.8 0L5 13.8a2 2 0 0 1 0-2.8z"/><path d="M3 11h16"/><path d="M20.5 16s1.5 2 1.5 3a1.5 1.5 0 0 1-3 0c0-1 1.5-3 1.5-3z" class="fl"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  clear: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
};
export function buildToolbar(container, board) {
  const el = document.createElement('div'); el.className = 'tools';
  el.innerHTML = `
    <div class="tb-pal">${PALETTE.map((c, i) => `<button class="sw" data-c="${i}" style="--c:${c}" title="${COLOR_NAMES[i]}" aria-label="Màu ${COLOR_NAMES[i]}"></button>`).join('')}</div>
    <button class="tb tb-color" data-pop="pal" title="Chọn màu" aria-label="Chọn màu"><i class="cur"></i></button>
    <div class="tb-sizes">${SIZES.map((s, i) => `<button class="tb sz" data-s="${i}" title="Cỡ ${i + 1}" aria-label="Cỡ nét ${i + 1}"><i style="--d:${Math.min(26, 4 + s * 0.6)}px"></i></button>`).join('')}</div>
    <button class="tb tb-size" data-pop="size" title="Cỡ nét" aria-label="Cỡ nét"><i></i></button>
    <span class="tb-sep"></span>
    <button class="tb" data-t="pen" title="Bút (B)" aria-label="Bút">${ICON.pen}</button>
    <button class="tb" data-t="eraser" title="Tẩy (E)" aria-label="Tẩy">${ICON.eraser}</button>
    <button class="tb" data-t="fill" title="Đổ màu (F)" aria-label="Đổ màu">${ICON.fill}</button>
    <span class="tb-sep"></span>
    <button class="tb" data-a="undo" title="Hoàn tác (Ctrl+Z)" aria-label="Hoàn tác">${ICON.undo}</button>
    <button class="tb" data-a="clear" title="Xoá hết" aria-label="Xoá hết">${ICON.clear}</button>
    <div class="tb-pop" hidden></div>`;
  container.appendChild(el);
  const pop = el.querySelector('.tb-pop');
  const refresh = () => {
    el.querySelectorAll('.sw').forEach(b => b.classList.toggle('on', +b.dataset.c === board.color));
    el.querySelectorAll('.sz').forEach(b => b.classList.toggle('on', +b.dataset.s === board.size));
    el.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === board.tool));
    el.querySelector('.tb-color .cur').style.background = PALETTE[board.color];
    const d = Math.min(26, 4 + SIZES[board.size] * 0.6); const si = el.querySelector('.tb-size i'); si.style.width = si.style.height = d + 'px';
    el.style.setProperty('--cur', PALETTE[board.color]);
  };
  const closePop = () => { pop.hidden = true; pop.dataset.kind = ''; };
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
    if (b.dataset.c != null) { board.color = +b.dataset.c; if (board.tool === 'eraser') board.setTool('pen'); closePop(); }
    else if (b.dataset.s != null) { board.size = +b.dataset.s; closePop(); }
    else if (b.dataset.t) board.setTool(b.dataset.t);
    else if (b.dataset.a === 'undo') board.undo();
    else if (b.dataset.a === 'clear') board.clear();
    else if (b.dataset.pop) {
      const k = b.dataset.pop; if (pop.dataset.kind === k && !pop.hidden) { closePop(); return; }
      pop.dataset.kind = k; pop.hidden = false;
      pop.innerHTML = k === 'pal' ? el.querySelector('.tb-pal').innerHTML : el.querySelector('.tb-sizes').innerHTML;
      refresh(); pop.querySelectorAll('.sw').forEach(x => x.classList.toggle('on', +x.dataset.c === board.color));
      pop.querySelectorAll('.sz').forEach(x => x.classList.toggle('on', +x.dataset.s === board.size));
      return;
    }
    refresh();
  });
  document.addEventListener('pointerdown', e => { if (!pop.hidden && !el.contains(e.target)) closePop(); });
  refresh();
  return { el, refresh, closePop };
}
