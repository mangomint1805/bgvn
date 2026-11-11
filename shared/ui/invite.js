// 📨 Hộp "Mời bạn": mã QR + link + nút chia sẻ của điện thoại. Dùng chung cho mọi game (homebtn.js tự gắn nút cạnh mã phòng).
// QR vẽ bằng thư viện qrcode-generator (MIT, Kazuhiko Arase) – shared/vendor/qrcode.js
import { toast } from './dialog.js?v=1';
const CSS = `.iv-ov{position:fixed;inset:0;z-index:10040;background:#1a1426b3;display:grid;place-items:center;padding:16px;backdrop-filter:blur(3px);animation:iv-f .16s ease-out}
.iv-box{width:min(380px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fffaf3;color:#2a2340;border-radius:26px;padding:22px 20px 18px;box-shadow:0 24px 70px #0008;font:600 15px/1.45 Nunito,system-ui,sans-serif;text-align:center;position:relative;animation:iv-p .24s cubic-bezier(.2,1.2,.4,1)}
.iv-box h2{margin:0 30px 2px;font:800 22px/1.2 "Baloo 2",Nunito,sans-serif}.iv-box p{margin:0;color:#6b5f7a}
.iv-x{position:absolute;top:10px;right:10px;width:38px;height:38px;border-radius:50%;border:0;background:#f0e6da;font-size:17px;cursor:pointer;color:#2a2340}
.iv-qr{width:min(230px,70vw);aspect-ratio:1;margin:14px auto 10px;padding:12px;background:#fff;border-radius:22px;box-shadow:0 10px 26px -14px #2a2340aa,0 0 0 1.5px #f0e2d2;position:relative}
.iv-qr svg{width:100%;height:100%;display:block}.iv-qr img{position:absolute;left:50%;top:50%;width:19%;height:19%;transform:translate(-50%,-50%);background:#fff;border-radius:26%;padding:3%;box-sizing:content-box}
.iv-code{font:800 34px/1 "Baloo 2",ui-monospace,monospace;letter-spacing:6px;margin:6px 0 2px;color:#2a2340}
.iv-link{display:block;font:700 12.5px/1.3 ui-monospace,Menlo,monospace;color:#8a7f96;word-break:break-all;margin:4px 6px 12px}
.iv-acts{display:flex;gap:10px}.iv-b{flex:1;min-height:48px;border-radius:999px;border:1.5px solid #e6d8c8;background:#fff;color:#2a2340;font:800 15.5px "Baloo 2",Nunito,sans-serif;cursor:pointer;transition:transform .1s}
.iv-b:active{transform:scale(.97)}.iv-b.main{border:0;color:#fff;background:linear-gradient(90deg,#ff4d6a,#ff9a3d);box-shadow:0 8px 18px -8px #ff4d5ecc}
#bgvn-invite{display:inline-flex;align-items:center;justify-content:center;gap:8px;margin:10px auto 0;min-height:44px;padding:8px 20px;border-radius:999px;border:0;cursor:pointer;color:#fff;font:800 15.5px "Baloo 2",Nunito,system-ui,sans-serif;background:linear-gradient(90deg,#7b61ff,#3d8bff);box-shadow:0 8px 18px -8px #3d63ffcc}
@keyframes iv-f{from{opacity:0}}@keyframes iv-p{from{opacity:0;transform:translateY(10px) scale(.96)}}`;
const ROOT = new URL('../../', import.meta.url).href;
let lib = null;
const loadQr = () => lib || (lib = new Promise((res, rej) => { if (window.qrcode) return res(window.qrcode); const s = document.createElement('script'); s.src = ROOT + 'shared/vendor/qrcode.js?v=1'; s.onload = () => res(window.qrcode); s.onerror = rej; document.head.append(s); }));
export function inviteCss() { if (document.getElementById('iv-css')) return; const s = document.createElement('style'); s.id = 'iv-css'; s.textContent = CSS; document.head.append(s); }
export async function openInvite({ code, url, title = document.title.split(/[–|-]/)[0].trim() }) {
  inviteCss(); document.getElementById('iv-ov')?.remove();
  const ov = document.createElement('div'); ov.className = 'iv-ov'; ov.id = 'iv-ov';
  ov.innerHTML = `<div class="iv-box" role="dialog" aria-modal="true" aria-label="Mời bạn vào phòng"><button class="iv-x" aria-label="Đóng">✕</button><h2>📨 Mời bạn vào phòng</h2><p>Quét mã bằng camera điện thoại, hoặc gửi link.</p>
    <div class="iv-qr" aria-label="Mã QR vào phòng"></div><div class="iv-code"></div><span class="iv-link"></span>
    <div class="iv-acts"><button class="iv-b" type="button" data-a="copy">📋 Sao chép link</button><button class="iv-b main" type="button" data-a="share" hidden>📤 Chia sẻ</button></div></div>`;
  ov.querySelector('.iv-code').textContent = code; ov.querySelector('.iv-link').textContent = url.replace(/^https?:\/\//, '');
  const share = ov.querySelector('[data-a="share"]'); if (navigator.share) share.hidden = false; else ov.querySelector('[data-a="copy"]').classList.add('main');
  const close = () => { ov.remove(); removeEventListener('keydown', key, true); }, key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  addEventListener('keydown', key, true);
  ov.addEventListener('click', async e => {
    if (e.target === ov || e.target.closest('.iv-x')) return close();
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'copy') { try { await navigator.clipboard.writeText(url); toast('Đã sao chép link mời 📋'); } catch (err) { toast('Không sao chép được – bấm giữ vào link để chép nha'); } }
    if (a === 'share') { try { await navigator.share({ title: `Vào chơi ${title} với mình nè!`, text: `Vào phòng ${code} chơi ${title} trên BGVN nha 🎲`, url }); } catch (err) {} }
  });
  document.body.append(ov);
  try { const q = (await loadQr())(0, 'Q'); q.addData(url); q.make(); ov.querySelector('.iv-qr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }) + `<img src="${ROOT}favicon.svg?v=1" alt="">`; }
  catch (e) { ov.querySelector('.iv-qr').remove(); }
}
