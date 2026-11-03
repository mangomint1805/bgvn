// Xuất cả album Tam sao thất bản thành 1 file: GIF động (tự mã hoá) hoặc video WebM/MP4 (MediaRecorder).
// Mỗi bước 1 khung có tên người + câu/đoán; chuỗi Hoạt hình thì chạy thành phim lặp vài lần.
// Chạy từng khung rồi nhường trình duyệt (await) để không treo trang, có báo tiến trình và huỷ được.
import { GifWriter, UI_COLORS } from './gif.js?v=5';

export const FW = 480, FH = 420; // kích thước khung (video nhân đôi cho nét)
const INK = '#1f2340', PAPER = '#fff8e8', NOTE = '#fff4b0', MUTED = '#6b6f8a';
const isFrame = r => r === 'frame';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Danh sách khung: { kind:'title'|'item', c, k, ms, anim? }
// ctx: { v, chains:[c…], hold: ms mỗi bước, fps, roleOf(k) }
export function planFrames({ v, chains, hold, fps, roleOf }) {
  const out = [{ kind: 'title', ms: Math.max(1500, hold) }];
  for (const c of chains) {
    let k = 0;
    while (k < v.steps) {
      // các khung hoạt hình liền nhau (≥ 2) chiếu thành phim: mỗi khung 1/fps giây, lặp cho đủ ~3 giây (2–4 lượt)
      let e = k; while (e < v.steps && isFrame(roleOf(k)) && isFrame(roleOf(e))) e++;
      if (e - k >= 2) {
        const n = e - k, per = Math.max(20, Math.round(1000 / fps)), loops = Math.max(2, Math.min(4, Math.ceil(3000 / (n * per))));
        for (let l = 0; l < loops; l++) for (let j = k; j < e; j++) out.push({ kind: 'item', c, k: j, ms: per, anim: { i: j - k + 1, n } });
        out[out.length - 1].ms = Math.max(per, Math.round(hold * 0.6)); // dừng ở khung cuối một chút
        k = e;
      } else { out.push({ kind: 'item', c, k, ms: hold }); k++; }
    }
  }
  return out;
}
export const totalMs = frames => frames.reduce((t, f) => t + f.ms, 0);

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrap(ctx, text, maxW, maxLines) {
  const words = String(text).split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] += '…'; }
  return lines;
}
function fit(ctx, text, maxW, font, size) { let s = size; do { ctx.font = font.replace('#', s); } while (ctx.measureText(text).width > maxW && --s > 11); return s; }

// Vẽ 1 khung lên ctx (toạ độ logic FW×FH; ctx đã scale sẵn)
// info: { v, book, pname, color(name), roleInfo(k)->[icon,label,verb], drawing(c,k)->canvas, title, sub, groupOf(c)->[j, a, g] }
export function drawFrame(ctx, f, info) {
  const { v } = info;
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, FW, FH);
  ctx.strokeStyle = '#e2dcef'; ctx.lineWidth = 1;
  for (let y = 26; y < FH; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FW, y); ctx.stroke(); }
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  if (f.kind === 'title') {
    ctx.fillStyle = INK; ctx.textAlign = 'center';
    fit(ctx, 'Scribble it!', FW - 40, '800 #px "Shantell Sans", sans-serif', 58); ctx.fillText('Scribble it!', FW / 2, 120);
    ctx.fillStyle = '#f0353f'; fit(ctx, info.title, FW - 40, '700 #px "Shantell Sans", sans-serif', 30); ctx.fillText(info.title, FW / 2, 182);
    ctx.fillStyle = MUTED; ctx.font = '600 18px "Be Vietnam Pro", sans-serif';
    wrap(ctx, info.sub, FW - 60, 3).forEach((l, i) => ctx.fillText(l, FW / 2, 236 + i * 28));
    ctx.fillStyle = NOTE; rr(ctx, 120, 330, 240, 46, 14); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = INK; ctx.font = '700 19px "Be Vietnam Pro", sans-serif'; ctx.fillText('Bản fan-made · BGVN', FW / 2, 354);
    ctx.textAlign = 'left'; return;
  }
  const { c, k } = f, it = info.book.get(c + ':' + k), owner = info.pname(v.chains[c]);
  // thanh tên chuỗi
  ctx.fillStyle = info.color(owner); rr(ctx, 10, 8, FW - 20, 40, 14); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
  const [gj, ga, gg] = info.groupOf(c), G = v.groups ? v.groups.length : 1;
  const right = G > 1 ? `Nhóm ${gj + 1}/${G} · ${c - ga + 1}/${gg}` : `${c + 1}/${v.chains.length}`;
  ctx.font = '700 15px "Be Vietnam Pro", sans-serif'; const rw = ctx.measureText(right).width;
  ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(right, FW - 24, 29); ctx.textAlign = 'left';
  const head = (v.gmode === 'icebreaker' ? 'Câu hỏi của ' : v.rot === false ? 'Hoạt hình của ' : 'Chuỗi của ') + owner;
  fit(ctx, head, FW - 64 - rw, '700 #px "Shantell Sans", sans-serif', 20); ctx.fillText(head, 24, 29);
  // dòng ai làm gì
  const [, label, verb] = info.roleInfo(k), who = it ? info.pname(it.by) : '?';
  const step = f.anim ? `Khung ${f.anim.i}/${f.anim.n}` : `Bước ${k + 1}/${v.steps}`;
  ctx.fillStyle = MUTED; ctx.font = '700 15px "Be Vietnam Pro", sans-serif'; ctx.fillText(step, 14, 68);
  const sw = ctx.measureText(step).width + 24;
  ctx.fillStyle = INK; fit(ctx, `${who} ${verb}${it && it.miss ? ' (hết giờ)' : ''}`, FW - sw - 20, '800 #px "Be Vietnam Pro", sans-serif', 18);
  ctx.fillText(`${who} ${verb}${it && it.miss ? ' (hết giờ)' : ''}`, sw, 68); void label;
  // nội dung 4:3
  const bw = 432, bh = 324, bx = (FW - bw) / 2, by = 86;
  ctx.fillStyle = INK; rr(ctx, bx + 4, by + 4, bw, bh, 16); ctx.fill();
  if (it && it.d) {
    ctx.fillStyle = '#fff'; rr(ctx, bx, by, bw, bh, 16); ctx.fill();
    ctx.save(); rr(ctx, bx, by, bw, bh, 16); ctx.clip(); ctx.drawImage(info.drawing(c, k), bx, by, bw, bh); ctx.restore();
    rr(ctx, bx, by, bw, bh, 16); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  } else {
    ctx.fillStyle = NOTE; rr(ctx, bx, by, bw, bh, 16); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    const text = it ? '“' + it.t + '”' : '…';
    let size = 34, lines; do { ctx.font = `${size}px "Patrick Hand", "Be Vietnam Pro", sans-serif`; lines = wrap(ctx, text, bw - 48, 7); } while (lines.length * size * 1.18 > bh - 40 && (size -= 2) > 18);
    ctx.fillStyle = INK; ctx.textAlign = 'center'; const lh = size * 1.18, ty = by + bh / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((l, i) => ctx.fillText(l, FW / 2, ty + i * lh)); ctx.textAlign = 'left';
  }
}

function canvas(scale) { const c = document.createElement('canvas'); c.width = FW * scale; c.height = FH * scale; const x = c.getContext('2d', { willReadFrequently: scale === 1 }); x.scale(scale, scale); return [c, x]; }

// GIF: trả về Blob. onProgress(0..1). job.cancel = true để huỷ.
export async function exportGif(frames, info, onProgress, job = {}) {
  const [cv, ctx] = canvas(1), g = new GifWriter(FW, FH, { extra: UI_COLORS });
  let t = performance.now();
  for (let i = 0; i < frames.length; i++) {
    if (job.cancel) return null;
    drawFrame(ctx, frames[i], info);
    g.frame(ctx.getImageData(0, 0, FW, FH), Math.round(frames[i].ms / 10));
    if (performance.now() - t > 30) { onProgress((i + 1) / frames.length); await sleep(0); t = performance.now(); }
  }
  onProgress(1);
  return new Blob([g.finish()], { type: 'image/gif' });
}

// Video: MP4 nếu trình duyệt ghi được, không thì WebM. Quay theo thời gian thật (độ dài video = thời gian quay).
export function videoType() {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null;
  for (const t of ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) { try { if (MediaRecorder.isTypeSupported(t)) return t; } catch (e) {} }
  return null;
}
export async function exportVideo(frames, info, onProgress, job = {}) {
  const type = videoType(); if (!type) throw new Error('Trình duyệt không hỗ trợ quay video');
  const [cv, ctx] = canvas(2);
  // canvas phải nằm trong trang thì một số trình duyệt mới chịu ghi khung
  Object.assign(cv.style, { position: 'fixed', left: '-10000px', top: '0', width: '48px', height: '42px', pointerEvents: 'none' }); document.body.appendChild(cv);
  const stream = cv.captureStream(30), rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 3e6 }), chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise(r => { rec.onstop = r; });
  const total = totalMs(frames);
  try {
    drawFrame(ctx, frames[0], info); rec.start(1000);
    const t0 = performance.now(); let at = 0;
    for (let i = 0; i < frames.length; i++) {
      if (job.cancel) break;
      drawFrame(ctx, frames[i], info); at += frames[i].ms;
      // vẽ lại đều đặn để luồng video không bị "đứng hình" quá lâu giữa 2 khung
      while (!job.cancel) { const now = performance.now() - t0, left = at - now; if (left <= 0) break; await sleep(Math.min(left, 120)); if (at - (performance.now() - t0) > 40) ctx.drawImage(cv, 0, 0, 1, 1, 0, 0, 0.5, 0.5); onProgress(Math.min(1, (performance.now() - t0) / total)); }
    }
    await sleep(250);
  } finally { if (rec.state !== 'inactive') rec.stop(); stream.getTracks().forEach(t => t.stop()); }
  await stopped; cv.remove();
  if (job.cancel) return null;
  onProgress(1);
  return new Blob(chunks, { type: type.split(';')[0] });
}
