// Mã hoá ảnh động GIF89a tối giản (tự viết, không thư viện): bảng màu cố định theo bảng màu vẽ (+ vài màu giao diện), nén LZW.
//   encodeGif(frames: ImageData[], { delay: phần trăm giây mỗi khung, loop: true }) -> Uint8Array
//   new GifWriter(w, h, { loop, extra: ['#rrggbb'…] }) · .frame(imageData, delay) · .finish() -> Uint8Array  (từng khung một, để xuất album dài không treo trang)
import { PALETTE } from './ops.js?v=5';

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const BITS = 5, SIZE = 1 << BITS; // 32 màu
// màu giao diện dùng trong khung album (giấy, giấy note, chữ xám, viền nhạt…)
export const UI_COLORS = ['#fff8e8', '#fff4b0', '#6b6f8a', '#e2dcef', '#ffe3e6', '#dcf7e6', '#e2ebff', '#e0a800', '#b9bccb', '#3a3f63', '#fbe9c6', '#f0353f'];

// mảng byte tự nới rộng (push từng byte vào Array JS rất chậm với ảnh lớn)
class Buf {
  constructor(n = 1 << 16) { this.a = new Uint8Array(n); this.n = 0; }
  need(k) { if (this.n + k <= this.a.length) return; let m = this.a.length * 2; while (m < this.n + k) m *= 2; const b = new Uint8Array(m); b.set(this.a.subarray(0, this.n)); this.a = b; }
  b(v) { this.need(1); this.a[this.n++] = v; }
  u16(v) { this.need(2); this.a[this.n++] = v & 255; this.a[this.n++] = (v >> 8) & 255; }
  str(s) { for (const ch of s) this.b(ch.charCodeAt(0)); }
  bytes() { return this.a.slice(0, this.n); }
}
// LZW cho GIF (mã độ dài thay đổi, tối đa 12 bit), ghi thẳng thành các khối con ≤ 255 byte
function lzw(idx, minSize, out) {
  const tmp = new Buf(idx.length >> 2 || 64); let cur = 0, nbits = 0;
  const put = (code, size) => { cur |= code << nbits; nbits += size; while (nbits >= 8) { tmp.b(cur & 255); cur >>>= 8; nbits -= 8; } };
  const clear = 1 << minSize, eoi = clear + 1;
  let size = minSize + 1, next = eoi + 1, dict = new Map();
  put(clear, size);
  let prefix = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i], key = prefix * 4096 + k, hit = dict.get(key);
    if (hit != null) { prefix = hit; continue; }
    put(prefix, size);
    if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
    else { put(clear, size); dict = new Map(); size = minSize + 1; next = eoi + 1; }
    prefix = k;
  }
  put(prefix, size); put(eoi, size);
  if (nbits > 0) tmp.b(cur & 255);
  const d = tmp.a, n = tmp.n;
  out.b(minSize);
  for (let i = 0; i < n; i += 255) { const len = Math.min(255, n - i); out.need(len + 1); out.a[out.n++] = len; out.a.set(d.subarray(i, i + len), out.n); out.n += len; }
  out.b(0);
}
export class GifWriter {
  constructor(w, h, { loop = true, extra = [] } = {}) {
    this.w = w; this.h = h; this.pal = PALETTE.concat(extra).slice(0, SIZE).map(hex); this.cache = new Map(); this.out = new Buf(1 << 18);
    const o = this.out, pal = this.pal.slice(); while (pal.length < SIZE) pal.push([255, 255, 255]);
    o.str('GIF89a'); o.u16(w); o.u16(h); o.b(0x80 | 0x70 | (BITS - 1)); o.b(0); o.b(0);
    for (const c of pal) { o.b(c[0]); o.b(c[1]); o.b(c[2]); }
    if (loop) { o.b(0x21); o.b(0xff); o.b(11); o.str('NETSCAPE2.0'); o.b(3); o.b(1); o.b(0); o.b(0); o.b(0); }
  }
  nearest(r, g, b) {
    const key = (r << 16) | (g << 8) | b; let v = this.cache.get(key); if (v != null) return v;
    let best = 0, bd = Infinity; const P = this.pal;
    for (let i = 0; i < P.length; i++) { const p = P[i], d = (p[0] - r) ** 2 * 3 + (p[1] - g) ** 2 * 4 + (p[2] - b) ** 2 * 2; if (d < bd) { bd = d; best = i; } }
    if (this.cache.size > 200000) this.cache.clear();
    this.cache.set(key, best); return best;
  }
  // delay: phần trăm giây (1/100 s)
  frame(img, delay = 25) {
    const o = this.out, w = this.w, h = this.h;
    o.b(0x21); o.b(0xf9); o.b(4); o.b(0x04); o.u16(Math.max(2, Math.min(65535, Math.round(delay)))); o.b(0); o.b(0);
    o.b(0x2c); o.u16(0); o.u16(0); o.u16(w); o.u16(h); o.b(0);
    const d = img.data, idx = new Uint8Array(w * h);
    for (let p = 0, q = 0; p < idx.length; p++, q += 4) idx[p] = this.nearest(d[q], d[q + 1], d[q + 2]);
    lzw(idx, BITS, o);
  }
  finish() { this.out.b(0x3b); return this.out.bytes(); }
}
export function encodeGif(frames, { delay = 25, loop = true } = {}) {
  if (!frames.length) return new Uint8Array();
  const g = new GifWriter(frames[0].width, frames[0].height, { loop });
  for (const f of frames) g.frame(f, delay);
  return g.finish();
}
