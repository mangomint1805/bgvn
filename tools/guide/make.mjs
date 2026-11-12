// 📖 Trích phần "Hướng dẫn" có sẵn trong từng game (chạy trên máy dev, KHÔNG phải một phần của web) rồi sinh ra:
//   1) shared/tutorials.js        – các bước "Bắt đầu nhanh" (ảnh + chữ) cho màn học chơi nhanh (shared/ui/tutorial.js)
//   2) <game>/huong-dan/index.html – trang luật chơi tĩnh, toàn chữ thật để Google đọc được
// Cần máy chủ tĩnh: python3 -m http.server 8811 (ở thư mục gốc repo). Chạy: node tools/guide/make.mjs [game…]
// Sửa guide.js của game nào thì chạy lại cho game đó, rồi python3 tools/bump.py.
import { createRequire } from 'module';
import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const WEB = process.env.WEB || 'http://localhost:8811', ROOT = new URL('../../', import.meta.url).pathname;
const ALL = ['bang', 'uno', 'typhu', 'scribble', 'meono', 'tamquoc', 'masoi', 'camel', 'cangua', 'tienlen', 'catte', 'bacao', 'xidach', 'poker', 'solitaire', 'cotuong', 'thathaythach'];
const only = process.argv.slice(2), games = only.length ? only : ALL;
// tên hiển thị + câu mô tả cho thẻ <meta> (lấy từ trang game)
const EXTRA = JSON.parse(fs.readFileSync(new URL('./extra.json', import.meta.url)));
// phiên bản ?v hiện tại của khung chung – lấy từ một trang có sẵn để trang sinh ra không bị lùi phiên bản
const ref = fs.readFileSync(ROOT + 'tienlen/index.html', 'utf8'), ver = (f, d) => (ref.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [0, d])[1];
const V_SHELL = ver('shell.css', 2), V_FEEL = ver('feel.js', 4);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const b = await chromium.launch();
const tutPath = ROOT + 'shared/tutorials.js';
let TUT = {}; try { TUT = JSON.parse(fs.readFileSync(tutPath, 'utf8').replace(/^[\s\S]*?export const TUT = /, '').replace(/;\s*$/, '')); } catch (e) {}

for (const g of games) {
  const p = await (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  await p.goto(`${WEB}/${g}/`); await p.waitForTimeout(1500);
  const meta = await p.evaluate(() => ({ title: document.title, desc: document.querySelector('meta[name=description]')?.content || '' }));
  const name = meta.title.split(/ [–|] /)[0].replace(/ online$/i, '').trim();
  await p.evaluate(() => (document.querySelector('#btn-guide-home') || document.querySelector('#btn-guide')).click()); await p.waitForTimeout(700); /* bấm bằng JS: có game mở sẵn một hộp khác che nút */
  const data = await p.evaluate(async () => {
    const vis = e => { const r = e.getBoundingClientRect(); return r.width > 200 && r.height > 200; };
    const box = () => [...document.querySelectorAll('#modal-box, .modal-box, .guide-box')].filter(vis)[0];
    const TABS = '[data-tab], [data-gt], [data-g], .tabs button, .g-tabs button';
    const KEEP = new Set(['H2', 'H3', 'H4', 'P', 'UL', 'OL', 'LI', 'B', 'I', 'EM', 'STRONG', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'FIGURE', 'FIGCAPTION', 'IMG', 'BR', 'SECTION', 'SMALL']);
    const clean = root => {
      const c = root.cloneNode(true);
      c.querySelectorAll('svg, button, input, select, script, style, canvas, .tabs, .g-tabs, .g-toc, .close-x, .m-btns, .btns, .mbtns, [hidden]').forEach(e => e.remove());
      c.querySelectorAll('img').forEach(e => { if (!e.classList.contains('gp-img')) e.remove(); });
      const walk = el => {
        for (const ch of [...el.children]) walk(ch);
        if (el === c) return;
        if (!KEEP.has(el.tagName)) { const block = /^(DIV|DETAILS|SUMMARY|ARTICLE|HEADER|FOOTER|DL|DT|DD)$/.test(el.tagName); const f = document.createDocumentFragment(); if (block) f.append(' '); while (el.firstChild) f.append(el.firstChild); if (block) f.append(document.createElement('br')); el.replaceWith(f); return; }
        const keep = el.tagName === 'IMG' ? ['src', 'width', 'height', 'alt'] : el.tagName === 'SECTION' && el.classList.contains('gp-quick') ? ['class'] : el.tagName === 'OL' && el.classList.contains('gp-steps') ? ['class'] : ['colspan', 'rowspan'];
        for (const a of [...el.attributes]) if (!keep.includes(a.name)) el.removeAttribute(a.name);
        if (el.tagName === 'IMG') el.setAttribute('loading', 'lazy');
      };
      walk(c);
      return c.innerHTML.replace(/(\s*<br>\s*){2,}/g, '<br>').replace(/^\s*(<br>\s*)+|(\s*<br>)+\s*$/g, '').replace(/[ \t]+\n/g, '\n').trim();
    };
    const steps = () => [...box().querySelectorAll('.gp-steps > li')].map(li => { const im = li.querySelector('img.gp-img'); const t = li.querySelector('.gp-txt'); return { img: im ? im.getAttribute('src') : null, w: im ? +im.getAttribute('width') : 0, h: im ? +im.getAttribute('height') : 0, alt: im ? im.alt : '', html: t ? t.innerHTML.trim() : '' }; });
    const n = box().querySelectorAll(TABS).length, out = { quick: steps(), tabs: [] };
    if (!n) { out.tabs.push({ t: '', html: clean(box()) }); return out; }
    for (let i = 0; i < n; i++) {
      const t = box().querySelectorAll(TABS)[i], label = t.textContent.trim();
      if (/Có gì mới/.test(label)) continue;
      t.click(); await new Promise(r => setTimeout(r, 250));
      out.tabs.push({ t: label, html: clean(box()) });
    }
    return out;
  });
  await p.context().close();

  // ---- 1) dữ liệu màn học chơi nhanh ----
  const x = EXTRA[g] || {};
  const steps = (x.steps || data.quick).map(s => ({ ...s, img: s.img || null }));
  TUT[g] = { name, ...(x.cta !== undefined ? { cta: x.cta } : {}), steps };

  // ---- 2) trang luật chơi tĩnh ----
  let body = data.tabs.map(tb => (tb.t ? `<h2>${esc(tb.t)}</h2>\n` : '') + tb.html).join('\n\n');
  body = body.replace(/<h2>📖[^<]*<\/h2>/g, '').replace(/src="img\//g, 'src="../img/');
  const url = `https://boardgamevui.com/${g}/huong-dan/`, title = `Cách chơi ${name} – luật và hướng dẫn | BGVN`;
  const desc = (x.desc || `Luật ${name} đầy đủ bằng tiếng Việt, có hình minh hoạ từng bước. ` + meta.desc).slice(0, 300);
  const others = ALL.filter(o => o !== g).map(o => `<a href="../../${o}/huong-dan/">${esc((TUT[o] && TUT[o].name) || o)}</a>`).join(' · ');
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:url" content="${url}"><meta property="og:site_name" content="BGVN">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="https://boardgamevui.com/shared/img/og/${g}.jpg"><meta property="og:locale" content="vi_VN">
<meta name="theme-color" content="#fff7ef">
<link rel="icon" href="../../favicon.svg?v=1" type="image/svg+xml"><link rel="apple-touch-icon" href="../../shared/img/brand/apple-touch-icon.png?v=1">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:wght@600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../shared/ui/shell.css?v=${V_SHELL}">
<link rel="stylesheet" href="../../shared/ui/guidepage.css?v=1">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: `Cách chơi ${name}`, inLanguage: 'vi', description: desc, mainEntityOfPage: url, image: `https://boardgamevui.com/shared/img/og/${g}.jpg`, publisher: { '@type': 'Organization', name: 'BGVN – Board Game Vui', url: 'https://boardgamevui.com/' } })}</script>
</head>
<body>
<header class="gp-top"><a class="bgvn-chip" href="../../" aria-label="Về trang chủ BGVN"><img src="../../favicon.svg?v=1" alt="" width="26" height="26"><b>BGVN</b></a><a class="gp-play" href="../">▶ Chơi ${esc(name)}</a></header>
<main class="gp-main">
<nav class="gp-crumb"><a href="../../">Trang chủ</a> › <a href="../">${esc(name)}</a> › Cách chơi</nav>
<h1>Cách chơi ${esc(name)}</h1>
<p class="gp-lead">${esc(meta.desc)}</p>
<p><a class="gp-cta" href="../">▶ Chơi ${esc(name)} ngay – miễn phí, không cần cài đặt</a></p>
<article class="gp-body">
${body}
</article>
<p><a class="gp-cta" href="../">▶ Vào chơi ${esc(name)}</a></p>
<nav class="gp-more"><h2>Luật các game khác</h2><p>${others}</p></nav>
</main>
<footer class="gp-foot"><a href="../../">BGVN – Board Game Vui</a> · <a href="../../gioi-thieu/">Giới thiệu</a> · <a href="../../credits/">Credits</a> · <a href="../../privacy/">Riêng tư</a></footer>
<script type="module" async src="../../shared/ui/feel.js?v=${V_FEEL}"></script>
</body>
</html>
`;
  fs.mkdirSync(`${ROOT}${g}/huong-dan`, { recursive: true });
  fs.writeFileSync(`${ROOT}${g}/huong-dan/index.html`, html);
  console.log(`✅ ${g.padEnd(13)} ${name} · ${steps.length} bước nhanh · ${data.tabs.length} mục · ${Math.round(body.replace(/<[^>]+>/g, '').length / 100) / 10}k chữ`);
}
await b.close();
fs.writeFileSync(tutPath, `// Tự sinh bởi tools/guide/make.mjs – ĐỪNG sửa tay. Các bước "Bắt đầu nhanh" của từng game cho màn học chơi (shared/ui/tutorial.js).\nexport const TUT = ${JSON.stringify(TUT, null, 1)};\n`);
