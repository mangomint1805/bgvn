// 🧪 Kiểm tra tự động BGVN (chạy trên máy dev, KHÔNG phải một phần của web).
// Cần: Node 18+, Playwright (npm i -D playwright hoặc bản cài sẵn), máy chủ tĩnh :8811 và wrangler dev :8787 – xem tools/qa/run.sh
// Dùng: node tools/qa/qa.mjs [game…]   (bỏ trống = tất cả)
// Mỗi game online kiểm tra: tải trang (điện thoại + máy tính) không lỗi JS · tạo phòng · thêm bot · bắt đầu
// · người thứ 2 vào GIỮA VÁN được xem (có dải "Đang xem") · host + khách không lỗi JS. Ảnh chụp lưu ở tools/qa/out/.
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Thiếu playwright: npm i -D playwright'); process.exit(2); }

const WEB = process.env.WEB || 'http://localhost:8811', CF = process.env.CF || 'ws://127.0.0.1:8787';
const OUT = new URL('./out/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const STD = { nm: '#name', jc: '#join-code', rc: '#room-code', bot: '#btn-addbot', start: '#btn-start', nbot: 2 };
const GAMES = {
  bang: { nm: '#inp-name', jc: '#inp-code', rc: '#lobby-code', bot: '#btn-add-bot', nbot: 3 },
  uno: {}, meono: {}, tamquoc: {}, masoi: { nbot: 5 }, tienlen: {}, poker: {}, xidach: {}, bacao: {},
  catte: { specText: 'ghế chờ' }, // Cát tê có sẵn giao diện ghế chờ riêng
  cangua: {}, camel: {}, typhu: {}, cotuong: { nbot: 1 },
  scribble: { online: false }, solitaire: { online: false }, // scribble cần người thật vẽ; solitaire chơi một mình
};
const want = process.argv.slice(2); const list = want.length ? want : Object.keys(GAMES);
const br = await chromium.launch();
const page = async (mobile = true) => {
  const c = await br.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 800 } });
  await c.route(/gstatic\.com\/firebasejs|peerjs|mqtt|hivemq|emqx/, r => r.abort()); // chỉ test đường Cloudflare
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message.slice(0, 160))); return p;
};
let fail = 0;
const res = (g, ok, msg) => { if (!ok) fail++; console.log(`${ok ? '✅' : '❌'} ${g.padEnd(10)} ${msg}`); };

// trang chủ + các trang phụ
for (const path of ['', 'sanh/', 'credits/', 'privacy/', 'terms/', 'luat/', 'quantri/', 'congbang/']) {
  const p = await page(); await p.goto(`${WEB}/${path}?cf=${CF}`).catch(e => p.errs.push(String(e))); await p.waitForTimeout(800);
  res('/' + path, !p.errs.length, p.errs.join(' | ') || 'tải ổn'); await p.context().close();
}

for (const g of list) {
  const c = { ...STD, ...GAMES[g] };
  try {
    for (const mobile of [true, false]) {
      const p = await page(mobile); await p.goto(`${WEB}/${g}/?cf=${CF}`); await p.waitForTimeout(1200);
      await p.screenshot({ path: `${OUT}${g}-home-${mobile ? 'mb' : 'pc'}.png` });
      res(g, !p.errs.length, `màn hình đầu (${mobile ? 'điện thoại' : 'máy tính'}) ${p.errs.join(' | ')}`); await p.context().close();
    }
    if (c.online === false) continue;
    const host = await page(), cli = await page();
    await host.goto(`${WEB}/${g}/?cf=${CF}`); await host.waitForTimeout(1200);
    await host.fill(c.nm, 'Chủ'); await host.click('#btn-create');
    await host.waitForFunction(rc => /^[A-Z0-9]{4,6}$/.test(document.querySelector(rc)?.textContent.trim()), c.rc, { timeout: 15000 });
    const code = (await host.textContent(c.rc)).trim();
    for (let i = 0; i < c.nbot; i++) { await host.click(c.bot); await host.waitForTimeout(150); }
    await host.click(c.start); await host.waitForTimeout(2500);
    await cli.goto(`${WEB}/${g}/?cf=${CF}`); await cli.waitForTimeout(1200);
    await cli.fill(c.nm, 'Xem'); await cli.fill(c.jc, code); await cli.click('#btn-join'); await cli.waitForTimeout(5000);
    const spec = await cli.isVisible('#bgvn-spec') || (!!c.specText && (await cli.textContent('body')).includes(c.specText));
    await cli.screenshot({ path: `${OUT}${g}-spectate.png` }); await host.screenshot({ path: `${OUT}${g}-host.png` });
    const errs = [...host.errs.map(e => 'host: ' + e), ...cli.errs.map(e => 'khách: ' + e)];
    res(g, spec && !errs.length, `online phòng ${code} · vào xem giữa ván ${spec ? 'ok' : 'KHÔNG thấy dải Đang xem'} ${errs.join(' | ')}`);
    await host.context().close(); await cli.context().close();
  } catch (e) { res(g, false, 'lỗi test: ' + e.message.split('\n')[0]); }
}
await br.close();
console.log(fail ? `\n❌ ${fail} mục lỗi – xem ảnh ở tools/qa/out/` : '\n✅ Tất cả ổn. Nhớ xem ảnh chụp ở tools/qa/out/ để soát giao diện.');
process.exit(fail ? 1 : 0);
