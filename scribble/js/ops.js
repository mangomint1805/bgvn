// Nét vẽ dạng dữ liệu (thuần, dùng chung engine + bảng vẽ + test).
// Toạ độ logic cố định W×H (canvas co giãn theo màn hình, dữ liệu không đổi).
//   {k:'s', g, c, w, p:[x0,y0,dx1,dy1,...]}  nét bút (điểm đầu tuyệt đối, sau đó là độ lệch)
//   {k:'f', g, c, x, y}                       đổ màu
//   {k:'c', g}                                xoá hết (hoàn tác được)
//   {k:'u'}                                   hoàn tác nhóm g cuối cùng
export const W = 800, H = 600;
export const PALETTE = [
  '#ffffff', '#1f2340', '#7c7f95', '#c9cbd6', '#ef2b3a', '#ff7a1a', '#ffd21f', '#b8e34a',
  '#22b852', '#0f7a43', '#18c6e0', '#2a63e8', '#1b2a8c', '#8b4fe3', '#e64ec8', '#ff9fbf',
  '#a0582d', '#5b3418', '#f6d2a8', '#0ea5a0',
];
export const COLOR_NAMES = ['Trắng', 'Đen', 'Xám', 'Xám nhạt', 'Đỏ', 'Cam', 'Vàng', 'Xanh nõn', 'Xanh lá', 'Xanh rêu', 'Xanh ngọc', 'Xanh dương', 'Xanh đậm', 'Tím', 'Hồng đậm', 'Hồng phấn', 'Nâu', 'Nâu đậm', 'Da', 'Xanh mòng két'];
export const SIZES = [3, 7, 13, 22, 38];
const MAXP = 4000, MAXOPS = 8000;
const int = (v, lo, hi) => { v = Math.round(+v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null; };

export function cleanOp(op) {
  if (!op || typeof op !== 'object') return null;
  if (op.k === 'u') return { k: 'u' };
  const g = int(op.g, 0, 1e9); if (g == null) return null;
  if (op.k === 'c') return { k: 'c', g };
  const c = int(op.c, 0, PALETTE.length - 1); if (c == null) return null;
  if (op.k === 'f') { const x = int(op.x, 0, W - 1), y = int(op.y, 0, H - 1); return x == null || y == null ? null : { k: 'f', g, c, x, y }; }
  if (op.k === 's') {
    const w = int(op.w, 0, SIZES.length - 1); if (w == null || !Array.isArray(op.p)) return null;
    const p = op.p.slice(0, MAXP); if (p.length < 2) return null; if (p.length % 2) p.pop();
    const out = new Array(p.length);
    for (let i = 0; i < p.length; i++) { const v = int(p[i], i < 2 ? 0 : -W, i < 2 ? (i ? H : W) : W); if (v == null) return null; out[i] = v; }
    return { k: 's', g, c, w, p: out };
  }
  return null;
}
export function cleanOps(ops, max = MAXOPS) {
  if (!Array.isArray(ops)) return [];
  const out = [];
  for (const o of ops.slice(0, max)) { const c = cleanOp(o); if (c) out.push(c); }
  return out;
}
// Thêm 1 thao tác vào lịch sử. Trả về true nếu cần vẽ lại toàn bộ (hoàn tác).
export function pushOp(list, op) {
  if (op.k === 'u') {
    if (!list.length) return false;
    const g = list[list.length - 1].g;
    while (list.length && list[list.length - 1].g === g) list.pop();
    return true;
  }
  list.push(op); return false;
}
export function decodePts(p) {
  const pts = []; let x = p[0], y = p[1]; pts.push(x, y);
  for (let i = 2; i < p.length; i += 2) { x += p[i]; y += p[i + 1]; pts.push(x, y); }
  return pts;
}
export function encodePts(pts) { // pts: [[x,y],...]
  const p = [pts[0][0], pts[0][1]];
  for (let i = 1; i < pts.length; i++) p.push(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return p;
}
export const opsBytes = ops => JSON.stringify(ops).length;
// Bỏ bớt điểm để bức vẽ gọn hơn (khi nộp tranh quá nặng)
export function simplifyOps(ops, limit = 140000) {
  let cur = ops;
  for (let pass = 0; pass < 6 && opsBytes(cur) > limit; pass++) {
    cur = cur.map(o => {
      if (o.k !== 's' || o.p.length <= 6) return o;
      const pts = decodePts(o.p), keep = [];
      for (let i = 0; i < pts.length / 2; i++) if (i % 2 === 0 || i === pts.length / 2 - 1) keep.push([pts[i * 2], pts[i * 2 + 1]]);
      return { ...o, p: encodePts(keep) };
    });
  }
  return cur;
}
