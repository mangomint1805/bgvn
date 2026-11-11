import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const games = process.argv.slice(2); const b = await chromium.launch();
for (const g of games) {
  const p = await (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:8811/${g}/`); await p.waitForTimeout(1500);
  const has = await p.$('#btn-guide-home'); if (!has) { console.log(g, 'NO #btn-guide-home'); continue; }
  await p.click('#btn-guide-home'); await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); return r.width > 200 && r.height > 200 && getComputedStyle(e).visibility !== 'hidden'; };
    const box = [...document.querySelectorAll('#modal-box, .modal-box, .modal .box, #modal > div, dialog[open]')].filter(vis)[0];
    if (!box) return { box: null };
    const tabs = [...box.querySelectorAll('[data-tab], .tabs button, .g-tabs button, .gtabs button, [role=tab]')];
    return { box: box.id || box.className, tabs: tabs.map(t => t.textContent.trim()).join(' | '), quick: box.querySelectorAll('.gp-steps > li').length, len: box.innerText.length, attrs: tabs[0] ? [...tabs[0].attributes].map(a => a.name).join(',') : '' };
  });
  console.log(g, JSON.stringify(r), errs.join('|'));
}
await b.close();
