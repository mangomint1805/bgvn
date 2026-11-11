// 🖼️ Tạo ảnh xem trước khi share link (Open Graph 1200×630) cho từng game: shared/img/og/<game>.jpg
// Lấy hình + chữ từ chính ô game ở trang chủ. Cần máy chủ tĩnh: python3 -m http.server 8811 (ở thư mục gốc repo).
// Chạy: node tools/og/make-og.mjs [game…]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const WEB = process.env.WEB || 'http://localhost:8811', OUT = new URL('../../shared/img/og/', import.meta.url).pathname;
const want = process.argv.slice(2);
import { readFileSync } from 'fs';
const MARK = 'data:image/svg+xml;base64,' + Buffer.from(readFileSync(new URL('../../shared/img/brand/mark.svg', import.meta.url))).toString('base64');
const br = await chromium.launch();
const hub = await br.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 });
await hub.goto(WEB + '/'); await hub.waitForTimeout(1500);
const games = await hub.evaluate(() => [...document.querySelectorAll('.grid .tile[data-game]')].map(t => ({
  g: t.dataset.game, name: t.querySelector('h2').textContent.trim(), desc: t.querySelector('.info p').textContent.trim(),
  tags: [...t.querySelectorAll('.tags i')].map(i => i.textContent.trim()), font: getComputedStyle(t.querySelector('h2')).fontFamily })));
// ảnh thu nhỏ: ô game chỉ còn hình + tên (ẩn mô tả, nút Chơi, nhãn MỚI, dừng hiệu ứng)
await hub.addStyleTag({ content: `#ogbox{position:fixed;left:0;top:0;width:440px;height:520px;z-index:99999}
#ogbox .tile{width:440px!important;height:520px!important;min-height:0!important;margin:0!important;transform:none!important;padding-top:0!important}
#ogbox .tile .info p,#ogbox .tile .tags,#ogbox .tile .play,#ogbox .tile .newtag,#ogbox .tile .livetag{display:none!important}
#ogbox .tile .info{flex:0!important;margin-top:auto;padding:22px 26px!important}#ogbox .tile h2{font-size:46px!important}
#ogbox .art:has(.ic){height:420px!important;padding:40px 0 70px!important}#ogbox .art .ic{max-width:88%!important}
#ogbox .uno .art{top:150px!important}*{animation:none!important;transition:none!important}` });
await hub.waitForTimeout(300);
const page = await br.newPage({ viewport: { width: 1200, height: 630 } });
for (const x of games) {
  if (want.length && !want.includes(x.g)) continue;
  await hub.evaluate(g => { document.getElementById('ogbox')?.remove(); const box = document.createElement('div'); box.id = 'ogbox'; box.append(document.querySelector(`.grid .tile[data-game="${g}"]`).cloneNode(true)); document.body.append(box); }, x.g);
  await hub.waitForTimeout(200);
  const thumb = (await hub.locator('#ogbox .tile').screenshot({ type: 'png' })).toString('base64');
  await page.setContent(`<!doctype html><meta charset=utf-8><link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Nunito:wght@700;800;900&family=Bevan&display=swap" rel="stylesheet">
  <style>*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;overflow:hidden;font-family:Nunito,sans-serif;color:#2a2340;display:flex;gap:44px;padding:56px;
  background:radial-gradient(circle at 6% 8%,#ffc7d4 0,transparent 40%),radial-gradient(circle at 92% 12%,#ffe3a8 0,transparent 42%),radial-gradient(circle at 88% 96%,#bcd3ff 0,transparent 44%),#fff7ee}
  img{width:440px;height:520px;border-radius:30px;box-shadow:0 24px 50px -20px #2a2340aa;flex:none}.r{display:flex;flex-direction:column;padding-top:10px;min-width:0;flex:1}
  h1{font:800 66px/1.02 'Baloo 2'}p{font:800 27px/1.4 Nunito;color:#4a405c;margin-top:14px}.t{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.t i{font:900 21px Nunito;font-style:normal;background:#2a2340;color:#fff;border-radius:999px;padding:6px 16px}
  .cta{margin-top:22px;font:800 25px Nunito;color:#ff4d5e}.logo{margin-top:auto;align-self:flex-end;font:800 44px 'Baloo 2';display:flex;gap:10px;align-items:center}</style>
  <img src="data:image/png;base64,${thumb}"><div class="r"><h1 style="${x.g === 'bang' ? "font-family:Bevan;font-size:58px" : ''}">${x.name}</h1><p>${x.desc}</p><div class="t">${x.tags.map(t => `<i>${t}</i>`).join('')}</div>
  <div class="cta">👉 Bấm link là vào chơi cùng hội bạn – không cần cài đặt</div><div class="logo"><img src="${MARK}" style="width:54px;height:54px;border-radius:0;box-shadow:none">BGVN</div></div>`);
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + x.g + '.jpg', type: 'jpeg', quality: 88 });
  console.log('og', x.g);
}
// ảnh chung cho trang chủ: shared/img/og.jpg
if (!want.length || want.includes('hub')) {
  const th = [];
  for (const g of ['bang', 'uno', 'meono', 'masoi', 'typhu', 'tienlen', 'tamquoc', 'cangua', 'poker']) {
    await hub.evaluate(g => { document.getElementById('ogbox')?.remove(); const box = document.createElement('div'); box.id = 'ogbox'; box.append(document.querySelector(`.grid .tile[data-game="${g}"]`).cloneNode(true)); document.body.append(box); }, g);
    await hub.waitForTimeout(150); th.push((await hub.locator('#ogbox .tile').screenshot({ type: 'png' })).toString('base64'));
  }
  await page.setContent(`<!doctype html><meta charset=utf-8><link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Nunito:wght@700;800;900&display=swap" rel="stylesheet">
  <style>*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;overflow:hidden;font-family:Nunito,sans-serif;color:#2a2340;display:flex;
  background:radial-gradient(circle at 6% 8%,#ffc7d4 0,transparent 40%),radial-gradient(circle at 92% 12%,#ffe3a8 0,transparent 42%),radial-gradient(circle at 88% 96%,#bcd3ff 0,transparent 44%),radial-gradient(circle at 4% 94%,#c9f0d8 0,transparent 40%),#fff7ee}
  .l{width:560px;padding:60px 0 56px 64px;display:flex;flex-direction:column}.b{display:flex;align-items:center;gap:14px;font:800 52px/1 'Baloo 2'}.b img{width:78px;height:78px}
  h1{font:800 51px/1.06 'Baloo 2';letter-spacing:-1px;margin-top:44px;white-space:nowrap}h1 span{background:linear-gradient(90deg,#ff4d6a,#ff7a45 55%,#ffb23d);-webkit-background-clip:text;color:transparent}
  p{font:800 25px/1.4 Nunito;color:#5d5475;margin-top:18px}.u{margin-top:auto;align-self:flex-start;background:#2a2340;color:#fff;font:800 34px/1 'Baloo 2';padding:14px 30px 16px;border-radius:999px;box-shadow:0 8px 0 #ff4d6a}
  .r{flex:1;position:relative}.g{position:absolute;left:40px;top:-40px;display:grid;grid-template-columns:repeat(3,200px);gap:18px;transform:rotate(7deg)}
  .g img{width:200px;height:236px;border-radius:22px;box-shadow:0 18px 34px -16px #2a2340aa}.g img:nth-child(3n+2){transform:translateY(46px)}.g img:nth-child(3n){transform:translateY(-20px)}</style>
  <div class="l"><div class="b"><img src="${MARK}">BGVN</div><h1>Board game tiếng Việt.<br><span>Mở link là chơi.</span></h1><p>15 game chơi cùng hội bạn hoặc với bot. Không cần cài app, miễn phí.</p><div class="u">boardgamevui.com</div></div>
  <div class="r"><div class="g">${th.map(t => `<img src="data:image/png;base64,${t}">`).join('')}</div></div>`);
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + '../og.jpg', type: 'jpeg', quality: 88 }); console.log('og hub');
}
await br.close();
