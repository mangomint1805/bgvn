// 📱 Mở trong trình duyệt nhúng của Zalo / Facebook / Messenger / TikTok… thì game dễ giật, rớt phòng khi chuyển app và không lưu được tài khoản.
// → hiện một dải nhắc nhỏ mời mở bằng Safari / Chrome. Bấm ✕ thì 3 ngày sau mới nhắc lại.
const ua = navigator.userAgent || '';
const APP = /Zalo/i.test(ua) ? 'Zalo' : /FBAN|FBAV|FB_IAB|FB4A/i.test(ua) ? (/Messenger/i.test(ua) ? 'Messenger' : 'Facebook') : /Instagram/i.test(ua) ? 'Instagram' : /BytedanceWebview|musical_ly|TikTok/i.test(ua) ? 'TikTok' : /\bLine\//i.test(ua) ? 'LINE' : '';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
if (APP && !(+ls.get('bgvn-inapp-x') > Date.now() - 3 * 864e5)) {
  const ios = /iPhone|iPad|iPod/i.test(ua), url = location.href;
  const bar = document.createElement('div'); bar.className = 'bgvn-inapp'; bar.setAttribute('role', 'status');
  bar.innerHTML = `<style>.bgvn-inapp{position:fixed;left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));z-index:95;background:#2a2340;color:#fff;border-radius:18px;padding:12px 40px 12px 14px;box-shadow:0 14px 30px -10px #000a;font:700 13.5px/1.4 Nunito,system-ui,sans-serif;max-width:520px;margin:0 auto}
.bgvn-inapp b{display:block;font-size:15px;margin-bottom:2px}.bgvn-inapp small{display:block;opacity:.8;font-weight:600;margin-top:6px}
.bgvn-inapp .r{display:flex;gap:8px;margin-top:9px;flex-wrap:wrap}.bgvn-inapp a,.bgvn-inapp button.c{flex:1;min-height:40px;border:0;border-radius:999px;font:800 14px Nunito,system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;text-decoration:none;white-space:nowrap;padding:0 14px}
.bgvn-inapp a{background:linear-gradient(120deg,#ff4d6a,#ff7a45 55%,#ffb23d);color:#fff}.bgvn-inapp button.c{background:#ffffff22;color:#fff}
.bgvn-inapp .x{position:absolute;right:6px;top:6px;width:32px;height:32px;border:0;border-radius:50%;background:#ffffff22;color:#fff;font:800 14px Nunito,system-ui;cursor:pointer}</style>
<button class="x" aria-label="Đóng">✕</button><b>📱 Bạn đang mở trong ${APP}</b>Trình duyệt của ${APP} dễ làm game giật, rớt phòng. Mở bằng ${ios ? 'Safari' : 'Chrome'} sẽ mượt hơn nhiều.
<div class="r"><a href="#" class="o">Mở bằng ${ios ? 'Safari' : 'trình duyệt'}</a><button class="c" type="button">Sao chép link</button></div><small>Không mở được? Bấm dấu <b style="display:inline;font-size:inherit">⋯</b> ở góc trên rồi chọn “Mở bằng trình duyệt”.</small>`;
  const open = bar.querySelector('.o');
  open.href = ios ? 'x-safari-' + url : `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  bar.querySelector('.c').onclick = async e => { let ok = false; try { await navigator.clipboard.writeText(url); ok = true; } catch (err) { try { const t = document.createElement('textarea'); t.value = url; document.body.append(t); t.select(); ok = document.execCommand('copy'); t.remove(); } catch (er) {} } e.target.textContent = ok ? '✅ Đã chép – dán vào ' + (ios ? 'Safari' : 'Chrome') : 'Chép chưa được 😢'; };
  bar.querySelector('.x').onclick = () => { ls.set('bgvn-inapp-x', String(Date.now())); bar.remove(); };
  const add = () => document.body.append(bar); document.body ? add() : addEventListener('DOMContentLoaded', add);
}
