// Hộp "📝 Có gì mới" (patch notes) dùng chung cho mọi game.
// Dùng: import { openNews, newsBadge } from '../../shared/ui/news.js';
//   nút.onclick = () => openNews('uno');        // mở hộp, chỉ hiện bản của game đó + bản chung
//   newsBadge(nút, 'uno');                       // gắn chấm đỏ "mới" nếu có bản chưa xem
// Hộp tự có CSS riêng (không phụ thuộc theme game), đóng bằng nút ✕ / bấm nền / phím Esc.
import { NOTES, GAMES, latestId } from '../patchnotes.js';
const KEY = g => 'bgvn-news-seen-' + (g || 'all');
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let css = false;
function style() {
  if (css) return; css = true;
  const st = document.createElement('style');
  st.textContent = `
  .bgvn-news{position:fixed;inset:0;z-index:10000;background:#1b142acc;display:flex;align-items:center;justify-content:center;padding:14px;font:500 15px/1.5 "Be Vietnam Pro",system-ui,sans-serif;animation:bgvnNewsIn .18s}
  @keyframes bgvnNewsIn{from{opacity:0}}
  .bgvn-news .box{background:#fffdf7;color:#26213a;width:min(560px,100%);max-height:min(86vh,760px);border-radius:20px;box-shadow:0 20px 50px #0007;display:flex;flex-direction:column;overflow:hidden}
  .bgvn-news .hd{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid #eee3d0;background:linear-gradient(135deg,#fff1d6,#ffe1ec)}
  .bgvn-news .hd h2{margin:0;flex:1;font:800 20px "Baloo 2","Be Vietnam Pro",sans-serif}
  .bgvn-news .x{border:0;background:#fff;border-radius:50%;width:38px;height:38px;font-size:18px;cursor:pointer;box-shadow:0 2px 6px #0002}
  .bgvn-news .tabs{display:flex;gap:6px;flex-wrap:wrap;padding:8px 16px 0}
  .bgvn-news .tabs button{border:1.5px solid #e6dcc8;background:#fff;border-radius:999px;padding:4px 11px;font:700 13px inherit;font-family:inherit;cursor:pointer;color:#26213a}
  .bgvn-news .tabs button.on{background:#26213a;color:#fff;border-color:#26213a}
  .bgvn-news .bd{overflow:auto;padding:6px 16px 18px}
  .bgvn-news .it{padding:12px 0;border-bottom:1px dashed #e8dcc6}
  .bgvn-news .it:last-child{border-bottom:0}
  .bgvn-news .meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px;color:#7b7391}
  .bgvn-news .tag{background:#f3ecff;color:#5b3fc4;border-radius:999px;padding:1px 9px;font-weight:700}
  .bgvn-news .new{background:#ff4d5e;color:#fff;border-radius:999px;padding:1px 8px;font-weight:800;font-size:11px}
  .bgvn-news h3{margin:4px 0 4px;font:800 16.5px "Baloo 2","Be Vietnam Pro",sans-serif}
  .bgvn-news ul{margin:0;padding-left:20px}.bgvn-news li{margin:3px 0}
  .bgvn-dot{position:relative}.bgvn-dot::after{content:"";position:absolute;top:2px;right:2px;width:9px;height:9px;border-radius:50%;background:#ff4d5e;box-shadow:0 0 0 2px #fff}
  @media (prefers-reduced-motion: reduce){.bgvn-news{animation:none}}`;
  document.head.appendChild(st);
}
export function hasNew(game) { const id = latestId(game); return !!id && (ls.get(KEY(game)) || '') < id; }
export function newsBadge(el, game) { if (el && hasNew(game)) el.classList.add('bgvn-dot'); }
export function openNews(game = null) {
  style();
  const seen = ls.get(KEY(game)) || '';
  const wrap = document.createElement('div'); wrap.className = 'bgvn-news';
  const tabs = game ? [game, 'all'] : ['all', ...Object.keys(GAMES).filter(g => g !== 'all')];
  let cur = game || '*';
  const list = () => NOTES.filter(n => cur === '*' ? true : (n.game === cur || (game && cur === game && n.game === 'all')));
  const render = () => {
    const items = list();
    wrap.querySelector('.bd').innerHTML = items.length ? items.map(n => `<div class="it"><div class="meta"><span>${esc(n.date)}</span><span class="tag">${esc(GAMES[n.game] || n.game)}</span>${n.id > seen ? '<span class="new">MỚI</span>' : ''}</div><h3>${esc(n.title)}</h3><ul>${n.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('') : '<p>Chưa có ghi chú.</p>';
    wrap.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.g === cur));
  };
  const tabBtns = (game ? [[game, GAMES[game] || game], ['*', 'Tất cả']] : [['*', 'Tất cả'], ...tabs.map(g => [g, GAMES[g]])])
    .map(([g, n]) => `<button data-g="${g}">${esc(n)}</button>`).join('');
  wrap.innerHTML = `<div class="box" role="dialog" aria-label="Có gì mới"><div class="hd"><h2>📝 Có gì mới</h2><button class="x" aria-label="Đóng">✕</button></div><div class="tabs">${tabBtns}</div><div class="bd"></div></div>`;
  document.body.appendChild(wrap);
  const close = () => { wrap.remove(); removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', onKey);
  wrap.onclick = e => { if (e.target === wrap) close(); };
  wrap.querySelector('.x').onclick = close;
  wrap.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { cur = b.dataset.g; render(); });
  render();
  ls.set(KEY(game), latestId(game));
  if (!game) for (const g of Object.keys(GAMES)) ls.set(KEY(g), latestId(g));
  document.querySelectorAll('.bgvn-dot[data-news]').forEach(el => { if (!hasNew(el.dataset.news)) el.classList.remove('bgvn-dot'); });
}
