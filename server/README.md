# Máy chủ phòng chơi BGVN (Cloudflare Workers + Durable Objects)

- `src/index.js`: chuyển tin WebSocket giữa chủ phòng và người chơi (mỗi phòng 1 Durable Object), hộp thư góp ý, trang `/admin` đọc góp ý.
- Chạy gói **Free** của Cloudflare (Durable Objects dạng SQLite). Hết lượt miễn phí trong ngày thì chỉ báo lỗi, không tự tính tiền – web tự chuyển sang Firebase/PeerJS dự phòng.
- Tên miền: `api.boardgamevui.com` (khai trong `wrangler.jsonc`, Cloudflare tự tạo DNS).
- Mật khẩu trang góp ý: biến bí mật `ADMIN_KEY` (Cloudflare → Workers → bgvn-rooms → Settings → Variables and Secrets).

Chạy thử ở máy: `npm install && echo 'ADMIN_KEY="thu"' > .dev.vars && npx wrangler dev`, rồi mở game với `?cf=ws://127.0.0.1:8787`.
