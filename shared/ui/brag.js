// 📸 "Khoe kết quả": thắng ván / có thành tích mới thì hiện nút nhỏ, bấm vào là tạo một tấm ảnh đẹp (kèm link web) để gửi Zalo, Facebook…
// Tự nạp từ stats.js khi có sự kiện 'bgvn-stats'. Cũng gọi tay được: brag({ game, title, sub, lines }) – vd. Cờ thế hôm nay.
import { load, totals, level, GAME_NAMES } from './stats.js?v=8';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } } };
const EMOJI = { bang: '🤠', uno: '🃏', typhu: '🏙️', scribble: '🎨', meono: '💣', tamquoc: '⚔️', masoi: '🐺', camel: '🐪', cangua: '🐴', tienlen: '🐷', catte: '🂡', bacao: '👑', xidach: '🃏', poker: '♠️', solitaire: '🃏', cotuong: '♟️', thathaythach: '🎯' };
const BG = ['#ff7a8a,#ffb23d', '#7b61ff,#3d8bff', '#2fc76f,#8fe3a8', '#ff9a3d,#ffd166', '#ff5fa2,#b06bff', '#3dc7d6,#3d8bff'];
const CSS = `.bg-pill{position:fixed;left:50%;bottom:max(84px,calc(env(safe-area-inset-bottom) + 78px));white-space:nowrap;transform:translateX(-50%);z-index:94;display:flex;align-items:center;gap:6px;padding:5px 5px 5px 16px;border-radius:999px;background:#2a2340;color:#fff;font:800 14.5px Nunito,system-ui,sans-serif;box-shadow:0 14px 30px -10px #000a;animation:bgUp .35s cubic-bezier(.2,.9,.3,1.2)}
.bg-pill button{border:0;border-radius:999px;min-height:38px;cursor:pointer;font:800 14.5px "Baloo 2",Nunito,sans-serif}
.bg-pill .go{padding:0 14px;color:#fff;background:linear-gradient(120deg,#ff4d6a,#ff7a45 55%,#ffb23d)}.bg-pill .x{width:34px;background:#ffffff22;color:#fff}
@keyframes bgUp{from{opacity:0;transform:translate(-50%,16px)}}
.bg-back{position:fixed;inset:0;z-index:97;background:#2a2340cc;display:flex;align-items:center;justify-content:center;padding:12px}
.bg-box{width:min(420px,100%);max-height:100%;overflow:auto;background:#fff7ef;border-radius:24px;padding:12px;display:flex;flex-direction:column;gap:10px;color:#2a2340;font-family:Nunito,system-ui,sans-serif}
.bg-box img{width:100%;height:auto;border-radius:16px;box-shadow:0 10px 24px -12px #0008}
.bg-box p{margin:0;text-align:center;font-weight:700;font-size:13.5px;color:#7b7391}
.bg-row{display:flex;gap:8px;flex-wrap:wrap}.bg-row button,.bg-row a{flex:1;min-height:46px;border-radius:999px;border:1.5px solid #ecdfd0;background:#fff;color:#2a2340;font:800 15px "Baloo 2",Nunito,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;text-decoration:none;white-space:nowrap;padding:0 12px}
.bg-row .pri{border:0;color:#fff;background:linear-gradient(120deg,#ff4d6a,#ff7a45 55%,#ffb23d)}
@media (prefers-reduced-motion:reduce){.bg-pill{animation:none}}`;
let cssOn = false; const css = () => { if (cssOn) return; cssOn = true; const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); };

// ---------- vẽ ảnh 1080×1350 ----------
const img = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
function wrap(ctx, text, maxW) { const words = String(text).split(' '), out = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
export async function drawCard({ game, title, sub, lines = [] }) {
  try { await Promise.all(['800 80px "Baloo 2"', '800 40px Nunito', '700 34px Nunito'].map(f => document.fonts.load(f))); } catch (e) {}
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#ff4d6a'); g.addColorStop(.55, '#ff7a45'); g.addColorStop(1, '#ffb23d'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.globalAlpha = .12; x.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc((i * 263) % W, 120 + ((i * 397) % H), 60 + (i % 4) * 40, 0, 7); x.fill(); } x.globalAlpha = 1;
  // thẻ trắng
  x.shadowColor = '#0004'; x.shadowBlur = 40; x.shadowOffsetY = 18; x.fillStyle = '#fff7ef'; rr(x, 70, 150, W - 140, H - 330, 56); x.fill(); x.shadowColor = 'transparent';
  // logo + tên web ở đầu
  const mark = await img(new URL('../img/brand/mark.svg', import.meta.url).href);
  if (mark) x.drawImage(mark, 70, 40, 84, 84);
  x.fillStyle = '#fff'; x.font = '800 54px "Baloo 2", Nunito, sans-serif'; x.textBaseline = 'middle'; x.fillText('BGVN · Board Game Vui', 170, 84);
  // hình game
  const ic = await img(new URL(`../img/icons/${game}.svg`, import.meta.url).href);
  if (ic) { const s = 300, r = Math.min(s / ic.width, s / ic.height); x.drawImage(ic, W / 2 - ic.width * r / 2, 200, ic.width * r, ic.height * r); }
  else { x.font = '220px sans-serif'; x.textAlign = 'center'; x.fillText(EMOJI[game] || '🎲', W / 2, 360); }
  x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  // tiêu đề + dòng phụ
  x.fillStyle = '#2a2340'; x.font = '800 78px "Baloo 2", Nunito, sans-serif';
  let y = 580; for (const l of wrap(x, title, W - 220).slice(0, 2)) { x.fillText(l, W / 2, y); y += 84; }
  if (sub) { x.fillStyle = '#ff4d6a'; x.font = '800 44px Nunito, sans-serif'; x.fillText(sub, W / 2, y + 6); y += 70; }
  // các dòng chi tiết
  x.font = '700 36px Nunito, sans-serif'; x.fillStyle = '#5b5270';
  const stop = H - 330; /* chừa chỗ cho dòng tên người chơi */
  y += 10; for (const l of lines.slice(0, 5)) for (const w of wrap(x, l, W - 260).slice(0, 2)) { if (y + 52 > stop) break; y += 52; x.fillText(w, W / 2, y); }
  // người chơi
  let av = null; try { av = JSON.parse(ls.get('bgvn-avatar')); } catch (e) {}
  const name = (ls.get('bgvn-name') || '').trim(), lv = level(totals(load()));
  const py = H - 300; const cg = x.createLinearGradient(0, py, 0, py + 110); const [c1, c2] = BG[((av && av.c) || 0) % BG.length].split(','); cg.addColorStop(0, c1); cg.addColorStop(1, c2);
  x.fillStyle = cg; x.beginPath(); x.arc(220, py + 55, 55, 0, 7); x.fill();
  x.font = '64px sans-serif'; x.textBaseline = 'middle'; x.fillText((av && av.e) || '🐱', 220, py + 60);
  x.textAlign = 'left'; x.fillStyle = '#2a2340'; x.font = '800 44px "Baloo 2", Nunito, sans-serif'; x.fillText(name || 'Người chơi BGVN', 300, py + 35);
  x.fillStyle = '#7b7391'; x.font = '700 32px Nunito, sans-serif'; x.fillText(`⭐ Cấp ${lv.lv} · ${lv.name}`, 300, py + 82);
  // chân: link mời
  x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = '800 50px "Baloo 2", Nunito, sans-serif'; x.fillText(`boardgamevui.com/${game === 'hub' ? '' : game}`, W / 2, H - 92);
  x.font = '700 32px Nunito, sans-serif'; x.globalAlpha = .92; x.fillText('Vào chơi cùng mình đi! Miễn phí, mở link là chơi', W / 2, H - 42); x.globalAlpha = 1;
  return new Promise(r => c.toBlob(b => r(b), 'image/png'));
}

// ---------- hộp chia sẻ ----------
export async function brag(info) {
  css();
  const back = document.createElement('div'); back.className = 'bg-back'; back.innerHTML = '<div class="bg-box"><p>Đang vẽ ảnh…</p></div>'; document.body.append(back);
  const close = () => back.remove(); back.onclick = e => { if (e.target === back) close(); };
  const blob = await drawCard(info); if (!blob) { close(); return; }
  const url = URL.createObjectURL(blob), link = `https://boardgamevui.com/${info.game === 'hub' ? '' : info.game + '/'}`, file = new File([blob], `bgvn-${info.game}.png`, { type: 'image/png' });
  const text = `${info.title}${info.sub ? ' – ' + info.sub : ''} 😎 Vào chơi cùng mình nè: ${link}`;
  const canFile = !!(navigator.canShare && navigator.canShare({ files: [file] }));
  back.querySelector('.bg-box').innerHTML = `<img src="${url}" alt="Ảnh khoe kết quả"><p>Gửi ảnh này cho hội bạn để rủ vào chơi nha 😆</p>
<div class="bg-row">${canFile ? '<button class="pri" data-a="share">📤 Chia sẻ</button>' : ''}<a class="${canFile ? '' : 'pri'}" href="${url}" download="bgvn-${info.game}.png">⬇️ Lưu ảnh</a></div>
<div class="bg-row"><button data-a="copy">🔗 Chép lời mời</button><button data-a="close">Đóng</button></div>`;
  back.querySelector('.bg-box').onclick = async e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'close') return close();
    if (a === 'share') { try { await navigator.share({ files: [file], text }); } catch (err) {} return; }
    if (a === 'copy') { try { await navigator.clipboard.writeText(text); e.target.textContent = '✅ Đã chép'; } catch (err) { e.target.textContent = '😅 Không chép được'; } }
  };
}

// ---------- nút nổi sau ván thắng ----------
let pillT = 0;
export function offer(info, ms = 14000) {
  css(); document.querySelector('.bg-pill')?.remove(); clearTimeout(pillT);
  const p = document.createElement('div'); p.className = 'bg-pill'; p.setAttribute('role', 'status');
  p.innerHTML = `<span>${info.pill || '🎉 Ván đẹp đó!'}</span><button class="go" type="button">📸 Khoe</button><button class="x" type="button" aria-label="Đóng">✕</button>`;
  p.querySelector('.go').onclick = () => { p.remove(); brag(info); };
  p.querySelector('.x').onclick = () => p.remove();
  document.body.append(p); pillT = setTimeout(() => p.remove(), ms);
}
addEventListener('bgvn-stats', e => {
  const d = e.detail || {}; if (!d.game || navigator.webdriver) return;
  const fresh = d.fresh || []; if (d.won !== true && !fresh.length) return;
  const s = load(), g = s.g[d.game] || { p: 0, w: 0 }, name = GAME_NAMES[d.game] || 'BGVN';
  const lines = [`Đã thắng ${g.w} / ${g.p} ván ${name}`]; if (s.streak > 1) lines.push(`🔥 Chuỗi thắng ${s.streak} ván liền`);
  fresh.slice(0, 2).forEach(a => lines.push(`${a.icon} Thành tích mới: ${a.name}`));
  const info = { game: d.game, title: d.won === true ? `Mình vừa thắng ván ${name}!` : `Thành tích mới ở ${name}!`, sub: d.won === true ? '🏆 Chiến thắng' : '', lines, pill: d.won === true ? '🏆 Thắng rồi!' : `${fresh[0].icon} Thành tích mới!` };
  setTimeout(() => offer(info), 2400); /* nút nằm cao hơn dải thông báo thành tích nên hiện cùng lúc được */
});
