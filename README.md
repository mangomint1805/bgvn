# 🎲 BGVN – Board game Việt chơi online

Chơi ngay: **https://mangomint1805.github.io/bgvn/**

Web tĩnh (GitHub Pages) + PeerJS: một người tạo phòng, bạn bè nhập mã 5 ký tự là vào chơi. Không cần server, không cần cài đặt, có bot thêm/xoá tuỳ ý.

| Game | Đường dẫn | Ghi chú |
|---|---|---|
| **BANG!** | [`/bang/`](https://mangomint1805.github.io/bgvn/bang/) | Bản cơ bản 80 lá, 16 nhân vật, 4 vai trò. 4–7 người. 5 chủ đề, nhạc nền, hiệu ứng, âm thanh riêng từng lá. |
| **UNO** | [`/uno/`](https://mangomint1805.github.io/bgvn/uno/) | 3 chế độ: Cổ điển (108 lá), Luật rừng (cộng dồn, Cấm chồng Cấm, không chặn ngang), No Mercy (168 lá, +6/+10, Quay màu, 7–0, ≥25 lá bị loại). 2–10 người. |

## Cấu trúc
```
index.html        trang chọn game
bang/             BANG! (js/engine.js, bot.js, net.js, main.js, …)
uno/
  js/engine.js    luật UNO thuần logic (3 chế độ + tuỳ chỉnh luật)
  js/bot.js       bot
  js/net.js       PeerJS host/client (mã phòng tiền tố bgvn-uno-)
  js/main.js      giao diện, hoạt ảnh
  js/ufx.js       âm thanh tổng hợp WebAudio, hiệu ứng, nhạc nền
  js/guide.js     hướng dẫn
  test/sim.mjs    mô phỏng bot vs bot: node uno/test/sim.mjs 300
```

## Chạy thử ở máy
```
python3 -m http.server 8000   # mở http://localhost:8000
```

Dự án fan-made phi thương mại. Không liên kết với dV Giochi (BANG!) hay Mattel (UNO). Tranh minh hoạ BANG! là tranh thuộc phạm vi công cộng từ Wikimedia Commons.
