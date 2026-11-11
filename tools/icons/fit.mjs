// Cắt khung SVG sát hình (đo bằng trình duyệt) để icon hiện to hơn trong ô game. Chạy sau make-icons.mjs.
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const DIR = new URL('../../shared/img/icons/', import.meta.url).pathname;
const br = await chromium.launch(); const p = await br.newPage();
for (const f of readdirSync(DIR).filter(f => f.endsWith('.svg'))) {
  const src = readFileSync(DIR + f, 'utf8');
  await p.setContent(src);
  const b = await p.evaluate(() => { const r = document.querySelector('svg > g').getBBox(); return [r.x, r.y, r.width, r.height]; });
  const pad = 12, [x, y, w, h] = [b[0] - pad, b[1] - pad / 2, b[2] + pad * 2, b[3] + pad * 1.5 + 8]; // chừa chỗ cho bóng đổ
  const vb = [x, y, w, h].map(v => Math.round(v));
  writeFileSync(DIR + f, src.replace(/viewBox="[^"]*" width="\d+" height="\d+"/, `viewBox="${vb.join(' ')}" width="${vb[2]}" height="${vb[3]}"`));
  console.log(f, vb.join(' '));
}
await br.close();
