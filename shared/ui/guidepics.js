// Ảnh minh hoạ cho trang Hướng dẫn của mọi game: ảnh chụp thật (img/guide/*.webp, lazy-load) + khung "Bắt đầu nhanh".
// Dùng: import { gp } from '../../shared/ui/guidepics.js?v=1'; const P = gp(GI, GV);  P.fig('home', 'alt', 'chú thích')
const CSS = `
.gp-quick{margin:6px 0 16px;padding:10px 12px 12px;border-radius:16px;border:2px dashed rgba(127,127,127,.45);background:rgba(127,127,127,.08)}
.gp-quick>h3{margin:0 0 8px!important}
.gp-steps{list-style:none;margin:0;padding:0;display:grid;gap:12px;grid-template-columns:minmax(0,1fr);counter-reset:gp}
@media (min-width:720px){.gp-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
.gp-steps>li{counter-increment:gp;display:flex;flex-direction:column;gap:6px;min-width:0;margin:0!important}
.gp-steps .gp-txt{line-height:1.45;font-size:.95em}
.gp-steps .gp-txt::before{content:'Bước ' counter(gp);display:inline-block;margin-right:6px;padding:1px 8px;border-radius:99px;background:#ff2d6f;color:#fff;font-weight:800;font-size:12px;vertical-align:1px}
.gp-img{display:block;width:auto;max-width:100%;height:auto;max-height:min(62vh,440px);margin:0 auto;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.18);background:rgba(127,127,127,.15)}
.gp-fig{margin:8px auto 14px;max-width:100%;text-align:center}
.gp-fig figcaption{margin-top:5px;font-size:.86em;opacity:.85;line-height:1.4;text-align:center}
.gp-side{display:grid;gap:10px;align-items:start;margin:8px 0 12px;grid-template-columns:minmax(0,1fr)}
@media (min-width:720px){.gp-side{grid-template-columns:minmax(0,300px) minmax(0,1fr)}.gp-side .gp-fig{margin:0}}
.gp-side>div{min-width:0}
.gp-ill{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:flex-end;margin:8px 0 12px;padding:10px;border-radius:14px;background:rgba(127,127,127,.09)}
.gp-ill>figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;max-width:100%}
.gp-ill figcaption{font-size:.8em;text-align:center;line-height:1.3;max-width:230px}
.gp-arrow{align-self:center;font-size:20px;font-weight:800;opacity:.75}
`;
let injected = false;
export function guideCss() {
  if (injected || typeof document === 'undefined') return;
  injected = true; const s = document.createElement('style'); s.id = 'bgvn-guidepics'; s.textContent = CSS; document.head.appendChild(s);
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// GI = { key: [w, h] } (ảnh ở img/guide/key.webp), GV = số phiên bản cache
const extras = new Set();
export function gp(GI, GV = 1, extraCss = '') {
  guideCss();
  if (extraCss && typeof document !== 'undefined' && !extras.has(extraCss)) { extras.add(extraCss); const s = document.createElement('style'); s.textContent = extraCss; document.head.appendChild(s); }
  const img = (k, alt) => { const d = GI[k]; if (!d) return ''; return `<img class="gp-img" src="img/guide/${k}.webp?v=${GV}" width="${d[0]}" height="${d[1]}" loading="lazy" decoding="async" alt="${esc(alt)}">`; };
  const fig = (k, alt, cap = '') => `<figure class="gp-fig">${img(k, alt)}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  return {
    img, fig,
    // ảnh + chữ cạnh nhau (máy tính) / ảnh trên chữ dưới (điện thoại)
    side: (k, alt, html, cap = '') => `<div class="gp-side">${fig(k, alt, cap)}<div>${html}</div></div>`,
    // steps: [[key, alt, text], ...] – key có thể là HTML sẵn (bắt đầu bằng '<')
    quick: (steps, title = '⚡ Bắt đầu nhanh') => `<section class="gp-quick"><h3>${title}</h3><ol class="gp-steps">${steps.map(([k, alt, t]) => `<li>${k.startsWith('<') ? k : img(k, alt)}<div class="gp-txt">${t}</div></li>`).join('')}</ol></section>`,
  };
}
// Hàng minh hoạ tự vẽ (lá bài, sơ đồ…): items = [[html, caption], ...] hoặc '→' để chèn mũi tên
export const ill = items => { guideCss(); return `<div class="gp-ill">${items.map(it => it === '→' || it === '=' || it === '+' ? `<span class="gp-arrow">${it === '→' ? '➜' : it}</span>` : `<figure>${it[0]}${it[1] ? `<figcaption>${it[1]}</figcaption>` : ''}</figure>`).join('')}</div>`; };
