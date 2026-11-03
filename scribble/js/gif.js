// Mã hoá ảnh động GIF89a tối giản (tự viết, không thư viện): bảng màu cố định theo bảng màu vẽ, nén LZW.
// encodeGif(frames: ImageData[], { delay: phần trăm giây mỗi khung, loop: true }) -> Uint8Array
import { PALETTE } from './ops.js?v=4';

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const PAL = PALETTE.map(hex); // 20 màu
while (PAL.length < 32) PAL.push([255, 255, 255]);
const BITS = 5; // 32 màu

function nearest(r, g, b, cache) {
  const key = (r << 16) | (g << 8) | b; let v = cache.get(key); if (v != null) return v;
  let best = 0, bd = Infinity;
  for (let i = 0; i < 20; i++) { const p = PAL[i], d = (p[0] - r) ** 2 * 3 + (p[1] - g) ** 2 * 4 + (p[2] - b) ** 2 * 2; if (d < bd) { bd = d; best = i; } }
  cache.set(key, best); return best;
}
// LZW cho GIF (mã độ dài thay đổi, tối đa 12 bit)
function lzw(idx, minSize) {
  const out = []; let cur = 0, nbits = 0;
  const put = (code, size) => { cur |= code << nbits; nbits += size; while (nbits >= 8) { out.push(cur & 255); cur >>>= 8; nbits -= 8; } };
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
  if (nbits > 0) out.push(cur & 255);
  return out;
}
export function encodeGif(frames, { delay = 25, loop = true } = {}) {
  if (!frames.length) return new Uint8Array();
  const w = frames[0].width, h = frames[0].height, bytes = [];
  const str = s => { for (const ch of s) bytes.push(ch.charCodeAt(0)); };
  const u16 = v => bytes.push(v & 255, (v >> 8) & 255);
  str('GIF89a'); u16(w); u16(h); bytes.push(0x80 | 0x70 | (BITS - 1), 0, 0);
  for (const c of PAL) bytes.push(c[0], c[1], c[2]);
  if (loop) { bytes.push(0x21, 0xff, 11); str('NETSCAPE2.0'); bytes.push(3, 1, 0, 0, 0); }
  const cache = new Map();
  for (const f of frames) {
    bytes.push(0x21, 0xf9, 4, 0x04); u16(delay); bytes.push(0, 0);
    bytes.push(0x2c); u16(0); u16(0); u16(w); u16(h); bytes.push(0);
    const d = f.data, idx = new Uint8Array(w * h);
    for (let p = 0, q = 0; p < idx.length; p++, q += 4) idx[p] = nearest(d[q], d[q + 1], d[q + 2], cache);
    const min = Math.max(2, BITS); bytes.push(min);
    const data = lzw(idx, min);
    for (let i = 0; i < data.length; i += 255) { const part = data.slice(i, i + 255); bytes.push(part.length, ...part); }
    bytes.push(0);
  }
  bytes.push(0x3b);
  return new Uint8Array(bytes);
}
