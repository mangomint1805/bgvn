// 🎓 Màn "Học chơi nhanh" cho mọi game: vài bước có hình (lấy từ shared/tutorials.js – sinh bởi tools/guide/make.mjs).
// Tự nạp từ feel.js ở trang game. Lần đầu vào một game thì tự hiện một lần; lúc nào cũng mở lại được bằng nút "🎓 Học chơi nhanh" cạnh nút Hướng dẫn.
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const GAME = location.pathname.replace(/\/+$/, '').split('/').pop();
const $ = s => document.querySelector(s);
const CSS = `.bgvn-tut{position:fixed;inset:0;z-index:96;display:flex;align-items:center;justify-content:center;padding:max(10px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom));background:#2a2340cc;opacity:0;transition:opacity .2s;font-family:Nunito,system-ui,sans-serif;color:#2a2340}
.bgvn-tut.on{opacity:1}
.bgvn-tut .bx{width:min(480px,100%);max-height:100%;display:flex;flex-direction:column;background:#fff7ef;border-radius:26px;box-shadow:0 30px 60px -20px #000a;overflow:hidden}
.bgvn-tut .hd{display:flex;align-items:center;gap:8px;padding:12px 12px 6px 16px}
.bgvn-tut .hd b{flex:1;min-width:0;font:800 19px/1.2 "Baloo 2",Nunito,sans-serif}
.bgvn-tut .hd small{display:block;font:700 12.5px Nunito,sans-serif;color:#7b7391}
.bgvn-tut .x{flex:none;border:0;background:#2a234012;color:#2a2340;border-radius:999px;min-height:36px;padding:0 14px;font:800 13.5px Nunito,sans-serif;cursor:pointer}
.bgvn-tut .dots{display:flex;gap:5px;padding:0 16px 8px}.bgvn-tut .dots i{flex:1;height:5px;border-radius:9px;background:#2a23401f;transition:background .2s}.bgvn-tut .dots i.on{background:linear-gradient(90deg,#ff4d6a,#ffb23d)}
.bgvn-tut .sl{flex:1;min-height:0;overflow:auto;padding:4px 16px 8px;display:flex;flex-direction:column;align-items:center;gap:10px;touch-action:pan-y}
.bgvn-tut .sl img{display:block;max-width:100%;width:auto;height:auto;max-height:min(46vh,380px);border-radius:14px;box-shadow:0 4px 14px #0003;background:#0001}
.bgvn-tut .sl .ic{font-size:86px;line-height:1.1;margin:14px 0 2px}
.bgvn-tut .sl p{margin:0;font-weight:700;font-size:16.5px;line-height:1.5;text-align:center;text-wrap:pretty}
.bgvn-tut .sl .no{align-self:center;background:#2a2340;color:#fff;border-radius:999px;padding:2px 12px;font:800 12.5px Nunito,sans-serif}
.bgvn-tut .ft{display:flex;gap:8px;padding:8px 12px 12px;flex-wrap:wrap}
.bgvn-tut .ft button{min-height:48px;border-radius:999px;border:1.5px solid #ecdfd0;background:#fff;color:#2a2340;font:800 16px "Baloo 2",Nunito,sans-serif;cursor:pointer;padding:0 16px}
.bgvn-tut .ft .go{flex:1;border:0;color:#fff;background:linear-gradient(120deg,#ff4d6a,#ff7a45 55%,#ffb23d);box-shadow:inset 0 -3px 0 #0000001f}
.bgvn-tut .ft .bk:disabled{opacity:.35}
.bgvn-tut .ft .full{flex-basis:100%}
.bgvn-tut-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:38px;padding:4px 14px;border-radius:999px;border:0;cursor:pointer;font:800 14px Nunito,system-ui,sans-serif;color:#3a2300;background:linear-gradient(135deg,#ffe27a,#ffb020);box-shadow:0 6px 14px -8px #7a4a00;margin:4px;flex:none;align-self:center;white-space:nowrap}
@media (prefers-reduced-motion:reduce){.bgvn-tut{transition:none}}`;
let cssOn = false, open = false;
const pre = {};
function preload(src) { if (!src) return Promise.resolve(); if (!pre[src]) { const im = new Image(); im.decoding = 'async'; im.src = src; pre[src] = (im.decode ? im.decode() : new Promise(r => { im.onload = r; })).catch(() => {}); } return pre[src]; }
export async function openTutorial() {
  if (open) return; open = true;
  let T; try { T = (await import('../tutorials.js?v=2')).TUT[GAME]; } catch (e) {}
  if (!T || !T.steps.length) { open = false; return; }
  await Promise.race([preload(T.steps[0].img), new Promise(r => setTimeout(r, 700))]); /* chờ ảnh bước 1 tải xong (tối đa 0,7 giây) để hộp hiện ra là đủ hình, không bị giật */
  if (!cssOn) { cssOn = true; const st = document.createElement('style'); st.textContent = CSS; document.head.append(st); }
  ls.set('bgvn-tut-' + GAME, '1');
  const el = document.createElement('div'); el.className = 'bgvn-tut'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Học chơi nhanh ' + T.name);
  const n = T.steps.length, bot = $('#btn-offline'), cta = T.cta !== undefined ? T.cta : '🤖 Chơi thử với bot';
  let i = 0;
  const close = () => { open = false; el.classList.remove('on'); removeEventListener('keydown', key); setTimeout(() => el.remove(), 200); };
  const key = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
  const go = d => { const k = i + d; if (k < 0) return; if (k >= n) return; i = k; draw(); };
  function draw() {
    const s = T.steps[i], last = i === n - 1;
    el.innerHTML = `<div class="bx"><div class="hd"><b>🎓 Học chơi ${T.name}<small>${n} bước · chưa tới 1 phút</small></b><button class="x" type="button">${last ? 'Đóng' : 'Bỏ qua'}</button></div>
<div class="dots">${T.steps.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
<div class="sl"><span class="no">Bước ${i + 1}/${n}</span>${s.img ? `<img src="${s.img}" width="${s.w}" height="${s.h}" style="aspect-ratio:${s.w}/${s.h};width:min(100%, calc(min(46vh,380px) * ${(s.w / s.h).toFixed(3)}))" decoding="async" alt="${(s.alt || '').replace(/"/g, '&quot;')}">` : `<div class="ic">${s.icon || '🎲'}</div>`}<p>${s.html}</p></div>
<div class="ft"><button class="bk" type="button" ${i ? '' : 'disabled'} aria-label="Bước trước">◀</button>${last
      ? (bot && cta ? `<button class="go" type="button" data-a="bot">${cta}</button>` : `<button class="go" type="button" data-a="ok">Hiểu rồi, chơi thôi! 👌</button>`) + `<button class="full" type="button" data-a="guide">📖 Xem luật đầy đủ</button>`
      : `<button class="go" type="button" data-a="next">Tiếp ▶</button>`}</div></div>`;
    el.querySelector('.x').onclick = close; el.querySelector('.bk').onclick = () => go(-1);
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'next') return go(1);
      close();
      if (a === 'bot') setTimeout(() => bot.click(), 220);
      if (a === 'guide') setTimeout(() => { const g = $('#btn-guide-home') || $('#btn-guide'); g ? g.click() : (location.href = 'huong-dan/'); }, 220);
    });
    // nạp sẵn ảnh bước kế cho mượt
    const nx = T.steps[i + 1]; if (nx && nx.img) preload(nx.img);
  }
  // vuốt trái/phải để chuyển bước
  let x0 = null; el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); }, { passive: true });
  el.addEventListener('click', e => { if (e.target === el) close(); });
  addEventListener('keydown', key);
  draw(); document.body.append(el); requestAnimationFrame(() => el.classList.add('on'));
}
function init() {
  const guide = $('#btn-guide-home');
  // nút mở lại cạnh nút Hướng dẫn ở màn hình đầu
  if (guide && !$('#btn-tut')) {
    if (!cssOn) { cssOn = true; const st = document.createElement('style'); st.textContent = CSS; document.head.append(st); }
    const b = document.createElement('button'); b.id = 'btn-tut'; b.type = 'button'; b.className = 'bgvn-tut-btn'; b.textContent = '🎓 Học chơi nhanh'; b.onclick = openTutorial;
    const w0 = guide.getBoundingClientRect().width;
    guide.before(b);
    try { const ps = getComputedStyle(guide.parentElement); if (ps.display.includes('flex') && ps.flexDirection.startsWith('row')) { guide.parentElement.style.flexWrap = 'wrap'; guide.parentElement.style.justifyContent = 'center'; if (guide.getBoundingClientRect().width < w0 * .85) { b.style.flexBasis = '100%'; b.style.margin = '0 0 6px'; } } } catch (e) {} /* nút cũ bị bóp hẹp thì cho nút mới nằm riêng một hàng */
  }
  // lần đầu vào game này: tự hiện một lần (không hiện khi vào bằng link mời, đang có hộp khác mở, đã chơi game này rồi, hoặc khi chạy test tự động)
  if (ls.get('bgvn-tut-' + GAME) || navigator.webdriver || /[?&]room=/.test(location.search)) return;
  let played = !!ls.get('bgvn-session-' + GAME); try { played = played || (ls.get('bgvn-stats') || '').includes('"' + GAME + '"'); } catch (e) {}
  if (played) { ls.set('bgvn-tut-' + GAME, '1'); return; }
  import('../tutorials.js?v=2').then(m => { const T = m.TUT[GAME]; if (T && T.steps[0]) preload(T.steps[0].img); }).catch(() => {}); /* tải trước ảnh bước 1 trong lúc chờ */
  setTimeout(() => {
    const home = $('#screen-home'); if (home && !home.classList.contains('active')) return;
    const shown = e => { const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden' && c.opacity !== '0' && c.pointerEvents !== 'none' && e.getBoundingClientRect().width > 0; };
    if ([...document.querySelectorAll('#modal, .modal, #guide, .bgvn-dlg, dialog[open]')].some(shown)) return; /* đang có hộp khác mở */
    openTutorial();
  }, 900);
}
if (GAME && (document.querySelector('#btn-guide-home') || document.querySelector('#btn-guide'))) init();
