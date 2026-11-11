// 🖼️ Tạo ảnh xem trước khi share link (Open Graph 1200×630) cho từng game: shared/img/og/<game>.jpg
// Lấy hình + chữ từ chính ô game ở trang chủ. Cần máy chủ tĩnh: python3 -m http.server 8811 (ở thư mục gốc repo).
// Chạy: node tools/og/make-og.mjs [game…]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const WEB = process.env.WEB || 'http://localhost:8811', OUT = new URL('../../shared/img/og/', import.meta.url).pathname;
const want = process.argv.slice(2);
const br = await chromium.launch();
const hub = await br.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 });
await hub.goto(WEB + '/'); await hub.waitForTimeout(1500);
const games = await hub.evaluate(() => [...document.querySelectorAll('.tile[data-game]')].map(t => ({
  g: t.dataset.game, name: t.querySelector('h2').textContent.trim(), desc: t.querySelector('.info p').textContent.trim(),
  tags: [...t.querySelectorAll('.tags i')].map(i => i.textContent.trim()), font: getComputedStyle(t.querySelector('h2')).fontFamily })));
// ảnh thu nhỏ: ô game chỉ còn hình + tên (ẩn mô tả, nút Chơi, nhãn MỚI, dừng hiệu ứng)
await hub.addStyleTag({ content: `#ogbox{position:fixed;left:0;top:0;width:440px;height:520px;z-index:99999}
#ogbox .tile{width:440px!important;height:520px!important;min-height:0!important;margin:0!important;transform:none!important;padding-top:0!important}
#ogbox .tile .info p,#ogbox .tile .tags,#ogbox .tile .play,#ogbox .tile .newtag{display:none!important}
#ogbox .tile .info{flex:0!important;margin-top:auto;padding:22px 26px!important}#ogbox .tile h2{font-size:46px!important}
#ogbox .art:has(.ic){height:420px!important;padding:40px 0 70px!important}#ogbox .art .ic{max-width:88%!important}
#ogbox .uno .art{top:150px!important}*{animation:none!important;transition:none!important}` });
await hub.waitForTimeout(300);
const page = await br.newPage({ viewport: { width: 1200, height: 630 } });
for (const x of games) {
  if (want.length && !want.includes(x.g)) continue;
  await hub.evaluate(g => { document.getElementById('ogbox')?.remove(); const box = document.createElement('div'); box.id = 'ogbox'; box.append(document.querySelector(`.tile[data-game="${g}"]`).cloneNode(true)); document.body.append(box); }, x.g);
  await hub.waitForTimeout(200);
  const thumb = (await hub.locator('#ogbox .tile').screenshot({ type: 'png' })).toString('base64');
  await page.setContent(`<!doctype html><meta charset=utf-8><link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Nunito:wght@700;800;900&family=Bevan&display=swap" rel="stylesheet">
  <style>*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;overflow:hidden;font-family:Nunito,sans-serif;color:#2a2340;display:flex;gap:44px;padding:56px;
  background:radial-gradient(circle at 6% 8%,#ffc7d4 0,transparent 40%),radial-gradient(circle at 92% 12%,#ffe3a8 0,transparent 42%),radial-gradient(circle at 88% 96%,#bcd3ff 0,transparent 44%),#fff7ee}
  img{width:440px;height:520px;border-radius:30px;box-shadow:0 24px 50px -20px #2a2340aa;flex:none}.r{display:flex;flex-direction:column;padding-top:10px;min-width:0;flex:1}
  h1{font:800 66px/1.02 'Baloo 2'}p{font:800 27px/1.4 Nunito;color:#4a405c;margin-top:14px}.t{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.t i{font:900 21px Nunito;font-style:normal;background:#2a2340;color:#fff;border-radius:999px;padding:6px 16px}
  .cta{margin-top:22px;font:800 25px Nunito;color:#ff4d5e}.logo{margin-top:auto;align-self:flex-end;font:800 44px 'Baloo 2';display:flex;gap:10px;align-items:center}.logo b{background:linear-gradient(90deg,#ff4d5e,#ff9a3d,#f5c518,#2fc76f,#3d63ff);-webkit-background-clip:text;color:transparent}</style>
  <img src="data:image/png;base64,${thumb}"><div class="r"><h1 style="${x.g === 'bang' ? "font-family:Bevan;font-size:58px" : ''}">${x.name}</h1><p>${x.desc}</p><div class="t">${x.tags.map(t => `<i>${t}</i>`).join('')}</div>
  <div class="cta">👉 Bấm link là vào chơi cùng hội bạn – không cần cài đặt</div><div class="logo">🎲 <b>BGVN</b></div></div>`);
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + x.g + '.jpg', type: 'jpeg', quality: 88 });
  console.log('og', x.g);
}
await br.close();
