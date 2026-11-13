// 🏅 Hồ sơ người chơi: avatar, cấp độ, thống kê từng game, thành tích. Dữ liệu ở shared/ui/stats.js (lưu trên máy này).
// import { openProfile, avatarHTML } from '…/shared/ui/profile.js?v=2'
import { load, totals, level, ACHS, GAME_NAMES } from './stats.js?v=9';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
export const AVATARS = ['🐱', '🐶', '🦊', '🐼', '🐯', '🐸', '🐵', '🐰', '🐻', '🐨', '🦁', '🐷', '🐙', '🦄', '🐲', '🤖', '👻', '🧙', '🥷', '🤠'];
const BG = ['#ff7a8a,#ffb23d', '#7b61ff,#3d8bff', '#2fc76f,#8fe3a8', '#ff9a3d,#ffd166', '#ff5fa2,#b06bff', '#3dc7d6,#3d8bff'];
export function avatar() { let a = null; try { a = JSON.parse(ls.get('bgvn-avatar')); } catch (e) {} return a && AVATARS.includes(a.e) ? a : { e: AVATARS[0], c: 0, def: true }; }
export function avatarHTML(size = 40, a = avatar()) { return `<span class="pf-av" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .56)}px;background:linear-gradient(135deg,${BG[a.c % BG.length]})">${a.e}</span>`; }
const CSS = `.pf-av{display:inline-grid;place-items:center;border-radius:50%;flex:none;line-height:1;box-shadow:inset 0 -3px 0 #0000001a,0 4px 10px -6px #2a234088;user-select:none}
.pf-ov{position:fixed;inset:0;z-index:9999;background:#1a1426b3;display:grid;place-items:center;padding:14px;backdrop-filter:blur(3px);animation:pf-f .16s ease-out}
.pf-box{width:min(520px,100%);max-height:calc(100dvh - 28px);overflow:auto;background:#fffaf3;color:#2a2340;border-radius:26px;padding:20px 18px 18px;box-shadow:0 24px 70px #0008;font:600 15px/1.45 Nunito,system-ui,sans-serif;position:relative;animation:pf-p .24s cubic-bezier(.2,1.2,.4,1)}
.pf-x{position:absolute;top:10px;right:10px;width:38px;height:38px;border-radius:50%;border:0;background:#f0e6da;font-size:17px;cursor:pointer;color:#2a2340;z-index:2}
.pf-head{display:flex;align-items:center;gap:14px;margin-right:40px}.pf-head button{border:0;background:none;padding:0;cursor:pointer;position:relative;border-radius:50%}
.pf-head button::after{content:"✏️";position:absolute;right:-4px;bottom:-4px;width:26px;height:26px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:13px;box-shadow:0 2px 6px #0003}
.pf-name{font:800 24px/1.1 "Baloo 2",Nunito,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pf-sub{color:#6b5f7a;font-weight:800;font-size:13.5px}
.pf-lv{margin:14px 0 4px}.pf-lv b{font:800 15px "Baloo 2"}.pf-bar{height:12px;border-radius:999px;background:#f0e6da;overflow:hidden;margin-top:5px}.pf-bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#ff4d6a,#ffb23d)}
.pf-nums{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.pf-nums div{background:#fff;border:1.5px solid #f0e2d2;border-radius:16px;padding:10px 4px;text-align:center}
.pf-nums b{display:block;font:800 24px/1 "Baloo 2",Nunito,sans-serif}.pf-nums small{color:#8a7f96;font-weight:800;font-size:12px}
.pf-box h3{margin:16px 0 8px;font:800 17px "Baloo 2",Nunito,sans-serif;display:flex;justify-content:space-between;align-items:baseline}.pf-box h3 small{font:800 12.5px Nunito;color:#8a7f96}
.pf-ach{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:8px}
.pf-a{display:flex;gap:9px;align-items:center;background:#fff;border:1.5px solid #f0e2d2;border-radius:16px;padding:8px 10px;min-height:58px}
.pf-a i{font-style:normal;font-size:26px;flex:none;width:34px;text-align:center}.pf-a b{display:block;font:800 13.5px/1.2 Nunito,sans-serif}.pf-a small{display:block;color:#8a7f96;font-size:11.5px;font-weight:700;line-height:1.25}
.pf-a.no{background:#f6efe6;border-style:dashed}.pf-a.no i{filter:grayscale(1);opacity:.4}.pf-a.no b{color:#8a7f96}
.pf-a.yes{border-color:#ffd166;background:linear-gradient(135deg,#fff,#fff6dc)}
.pf-g{display:grid;grid-template-columns:1fr auto auto;gap:4px 14px;align-items:center;font-weight:800}.pf-g span{color:#8a7f96;font-size:13px;text-align:right}.pf-g em{font-style:normal;color:#2e8b57;font-size:13px;text-align:right}
.pf-empty{background:#fff;border:1.5px dashed #e6d8c8;border-radius:16px;padding:16px;text-align:center;color:#6b5f7a}
.pf-pick{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:10px 0}.pf-pick button{aspect-ratio:1;border-radius:50%;border:3px solid transparent;font-size:26px;cursor:pointer;background:#fff;box-shadow:0 0 0 1.5px #f0e2d2}
.pf-pick button[aria-pressed=true]{border-color:#7b61ff}.pf-col{display:flex;gap:10px;justify-content:center;margin:6px 0 2px}.pf-col button{width:38px;height:38px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1.5px #e6d8c8;cursor:pointer}.pf-col button[aria-pressed=true]{box-shadow:0 0 0 3px #7b61ff}
.pf-note{font-size:12.5px;color:#8a7f96;margin:14px 0 0;text-align:center}
@keyframes pf-f{from{opacity:0}}@keyframes pf-p{from{opacity:0;transform:translateY(10px) scale(.97)}}
@media (max-width:420px){.pf-nums b{font-size:20px}.pf-ach{grid-template-columns:1fr 1fr}}`;
export function profileCss() { if (document.getElementById('pf-css')) return; const s = document.createElement('style'); s.id = 'pf-css'; s.textContent = CSS; document.head.append(s); }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function openProfile() {
  profileCss(); document.getElementById('pf-ov')?.remove();
  const ov = document.createElement('div'); ov.className = 'pf-ov'; ov.id = 'pf-ov';
  const close = () => { ov.remove(); removeEventListener('keydown', key, true); }, key = e => { if (e.key === 'Escape' && !document.querySelector('.dg-ov')) { e.stopPropagation(); close(); } };
  let picking = false;
  const draw = () => {
    const s = load(), t = totals(s), lv = level(t), name = (ls.get('bgvn-name') || '').trim() || 'Người chơi', a = avatar();
    const got = ACHS.filter(x => s.ach[x.id]).length, pct = lv.to ? Math.round((lv.xp - lv.from) / (lv.to - lv.from) * 100) : 100;
    const games = Object.entries(s.g).filter(([, v]) => v.p).sort((x, y) => y[1].p - x[1].p);
    ov.innerHTML = `<div class="pf-box" role="dialog" aria-modal="true" aria-label="Hồ sơ của bạn"><button class="pf-x" aria-label="Đóng">✕</button>
      <div class="pf-head"><button type="button" data-a="pick" aria-label="Đổi hình đại diện">${avatarHTML(72, a)}</button><div style="min-width:0"><div class="pf-name">${esc(name)}</div><div class="pf-sub">Cấp ${lv.lv} · ${lv.name}</div></div></div>
      ${picking ? `<div class="pf-pick">${AVATARS.map(e => `<button type="button" data-e="${e}" aria-pressed="${e === a.e}">${e}</button>`).join('')}</div><div class="pf-col">${BG.map((c, i) => `<button type="button" data-c="${i}" aria-pressed="${i === a.c % BG.length}" style="background:linear-gradient(135deg,${c})" aria-label="Màu ${i + 1}"></button>`).join('')}</div>` : ''}
      <div class="pf-lv"><b>${lv.to ? `${lv.xp - lv.from} / ${lv.to - lv.from} điểm tới cấp ${lv.lv + 1}` : 'Đã đạt cấp cao nhất 👑'}</b><div class="pf-bar"><i style="width:${pct}%"></i></div></div>
      <div class="pf-nums"><div><b>${t.p}</b><small>ván đã chơi</small></div><div><b>${t.w}</b><small>ván thắng</small></div><div><b>${t.p ? Math.round(t.w / t.p * 100) : 0}%</b><small>tỉ lệ thắng</small></div><div><b>${t.best}</b><small>chuỗi thắng</small></div></div>
      <h3>🏅 Thành tích <small>${got} / ${ACHS.length}</small></h3>
      <div class="pf-ach">${ACHS.map(x => { const ok = !!s.ach[x.id], of = !ok && x.of ? x.of(t) : null; return `<div class="pf-a ${ok ? 'yes' : 'no'}"><i>${x.icon}</i><span><b>${x.name}</b><small>${x.desc}${of ? ` (${Math.min(of[0], of[1])}/${of[1]})` : ''}</small></span></div>`; }).join('')}</div>
      <h3>🎮 Theo từng game</h3>
      ${games.length ? `<div class="pf-g">${games.map(([g, v]) => `<div>${esc(GAME_NAMES[g] || g)}</div><span>${v.p} ván</span><em>${v.w || 0} thắng</em>`).join('')}</div>` : '<div class="pf-empty">Chưa có ván nào. Chơi xong một ván là có số liệu ở đây liền nha 🎲</div>'}
      <p class="pf-note">Mỗi ván +10 điểm, thắng +20 điểm nữa. Hồ sơ lưu trên máy này – đổi máy hoặc xoá dữ liệu trình duyệt là mất.</p></div>`;
  };
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('.pf-x')) return close();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'pick') { picking = !picking; return draw(); }
    if (b.dataset.e || b.dataset.c) { const a = avatar(); ls.set('bgvn-avatar', JSON.stringify({ e: b.dataset.e || a.e, c: b.dataset.c != null ? +b.dataset.c : a.c, t: Date.now() })); try { dispatchEvent(new CustomEvent('bgvn-avatar')); } catch (x) {} draw(); }
  });
  addEventListener('keydown', key, true); draw(); document.body.append(ov);
}
