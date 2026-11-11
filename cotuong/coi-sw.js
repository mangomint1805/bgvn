// Service worker CHỈ cho trang Cờ tướng khi bật mức Đại sư: thêm tiêu đề "cross-origin isolation" để trình duyệt cho phép
// động cơ cờ chạy nhiều luồng (SharedArrayBuffer). GitHub Pages không đặt được tiêu đề này nên phải làm ở đây.
// Phạm vi: /cotuong/ – không ảnh hưởng trang khác. Tắt mức Đại sư thì master.js gỡ worker này đi.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.cache === 'only-if-cached' && r.mode !== 'same-origin') return;
  e.respondWith(fetch(r).then(res => {
    if (res.status === 0) return res; // phản hồi "mờ" (no-cors): không sửa được
    const h = new Headers(res.headers);
    h.set('Cross-Origin-Embedder-Policy', /Chrome|Firefox/.test(self.navigator.userAgent) ? 'credentialless' : 'require-corp'); /* credentialless: nhẹ tay hơn với tài nguyên ngoài (phông, đăng nhập Google) */ h.set('Cross-Origin-Opener-Policy', 'same-origin'); h.set('Cross-Origin-Resource-Policy', 'cross-origin');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  }));
});
