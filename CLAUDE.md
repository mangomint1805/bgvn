# BGVN – ghi chú cho Claude

Web board game / game bài tiếng Việt chơi cùng bạn bè: **https://boardgamevui.com**.
Chủ web: Minto. Trả lời bằng tiếng Việt, xưng "em", gọi "anh". Khi làm việc thì báo cáo ngắn gọn.

## Cấu trúc
- Mỗi game là một thư mục (`bang/ uno/ typhu/ tamquoc/ meono/ masoi/ scribble/ tienlen/ poker/ xidach/ catte/ bacao/ cangua/ camel/ solitaire/ cotuong/ thathaythach/`), thường gồm `index.html` + `js/main.js` (giao diện), `js/engine.js` (luật, thuần logic), `js/net.js` (Host/Client), `js/bot.js`, `js/guide.js`.
- `shared/net/`: kết nối. `room.js` chọn đường truyền theo thứ tự **cf → fb → p2p → mqtt**. Cloudflare (`cfrelay.js`) là đường chính; Firebase, PeerJS, MQTT chỉ là dự phòng. `api.js` gom tài khoản, sảnh, khách; `presence.js` đếm người online.
- **Game nhỏ / game mới** (Cờ tướng, Thật hay Thách) không viết `net.js` riêng: dùng `shared/net/simplenet.js` (`makeNet({ game, create, apply, view, actors, bot… })` lo phòng, vào lại, người xem, bot, người chơi cùng máy) + `shared/ui/gamekit.js` / `gamekit.css` (3 màn hình chuẩn, id chuẩn). Chép `thathaythach/` làm mẫu.
- `shared/ui/`: dùng chung: `homebtn.js` (nút trang chủ, phòng công khai), `account.js`, `lobby.js` (sảnh + chat), `settings.js`, `spectate.js` (dải "Đang xem"), `news.js` + `shared/patchnotes.js`.
- `server/`: Cloudflare Worker **bgvn-rooms** (`api.boardgamevui.com`) với các Durable Object `Room`, `Inbox`, `Users`, `Lobby` (SQLite, gói Free). Push lên `main` là Workers Builds tự deploy.
- Trang phụ: `sanh/` (Sảnh chung), `quantri/` (quản trị), `credits/`, `privacy/`, `terms/`, `luat/`. File `luat-mac-dinh.js` là luật chọn sẵn khi tạo phòng.
- Web tĩnh chạy trên GitHub Pages với tên miền riêng (file `CNAME`). DNS và HTTPS do Cloudflare lo.

## Quy tắc kỹ thuật
- **Không có bước build.** Dùng ES module thuần, phá cache bằng `?v=N`. Sửa file nào thì **tăng `?v` ở mọi chỗ import file đó và lan lên cả chuỗi import**: `engine.js` → `net.js` → `main.js` → `index.html`. File dùng chung bị đổi thì tìm mọi chỗ import nó, ví dụ: `grep -rn "homebtn.js?v="`.
- Game theo mô hình **host giữ state**: chủ phòng chạy engine, khách chỉ gửi action. Mọi kiểm tra luật đặt ở engine hoặc host.
- **Vào giữa ván = người xem.** Host dùng `inGame(id)`, đặt `view.spec = true` cho người xem và chặn action của họ. Ván sau họ tự được chơi. Xì dách, Ba Cào, Poker thì gọi `seatPlayers()` trước ván kế.
- Ghi chú trong code viết bằng tiếng Việt. Trong cùng một dòng code dùng `/* */`, không dùng `//`, để không nuốt mất phần code phía sau.
- Có thay đổi người chơi thấy được thì thêm patch note lên **đầu** `shared/patchnotes.js` (id `YYYYMMDD-n`), rồi tăng `patchnotes.js?v` trong `shared/ui/news.js` và `news.js?v` ở các `main.js`.
- Giao diện phải dùng tốt trên **điện thoại** (390px) lẫn máy tính. Phông có chữ Việt đầy đủ: kiểm tra chữ Đ/ư/ơ trước khi đổi phông.

## Giao diện chung
- **Không dùng `alert` / `confirm` / `prompt` của trình duyệt.** Dùng `shared/ui/dialog.js` (`confirmBox`, `promptBox`, `formBox`, `chooseBox`, `alertBox`, `toast`).
- **Khung chung nạp ở mọi trang:** `shared/ui/shell.css` (chuyển trang mượt, màn hình chờ `#bgvn-splash`, nút về trang chủ `.bgvn-chip`) và `shared/ui/feel.js` (rung + tiếng bấm). Trang mới phải có đủ 3 thứ: thẻ `<link>` shell.css trong `<head>`, khối splash ngay sau `<body>`, thẻ script feel.js trước `</body>` – chép từ một trang có sẵn.
- Hồ sơ người chơi: `shared/ui/stats.js` (đếm ván/thắng, cấp độ, thành tích – lưu localStorage `bgvn-stats`) và `shared/ui/profile.js` (hộp hồ sơ, avatar). Mỗi `net.js` bọc `this.h = watch(GAME, handlers, …)`; game mới phải thêm 1 dòng vào bảng `OVER` trong stats.js để biết lúc nào ván xong và ai thắng.
- Mời bạn: `shared/ui/invite.js` (QR + chia sẻ), `homebtn.js` tự gắn nút dưới mã phòng (`#room-code` / `#lobby-code`).
- Nhận diện: logo "xúc xắc cười" ở `shared/img/brand/` (`mark.svg`, icon PNG), `favicon.svg`, `manifest.webmanifest` (cài như app). Màu chủ đạo: mực `#2a2340`, nền `#fff7ef`, dải cam–hồng `#ff4d6a → #ff7a45 → #ffb23d`. Phông: Baloo 2 (tiêu đề), Nunito (chữ thường).
- Trang chủ: mỗi ô game có `data-game`, `data-cat` (`party` / `board` / `card`), `data-min`, `data-max`. Số người đang chơi theo game đến từ sự kiện `bgvn-live` (`detail.games`).

## Hình ảnh
- Icon ô game ở trang chủ: `node tools/icons/make-icons.mjs && node tools/icons/fit.mjs` → `shared/img/icons/<game>.svg` (tự vẽ bằng code). Sửa icon thì tăng `?v` ở `index.html`.
- Ảnh xem trước khi share link: chạy máy chủ tĩnh `:8811` rồi `node tools/og/make-og.mjs [game…]` → `shared/img/og/<game>.jpg` (lấy hình + chữ từ ô game ở trang chủ).

## Kiểm tra trước khi push
- Tự động: `bash tools/qa/run.sh [game…]` chạy máy chủ tĩnh `:8811` + `wrangler dev :8787` rồi test mọi game. Ảnh chụp nằm ở `tools/qa/out/`, phải mở xem chứ đừng chỉ đọc ✅.
- Thủ công: xem `tools/qa/CHECKLIST.md`.
- Chạy local: thêm `?cf=ws://127.0.0.1:8787` vào URL để client dùng máy chủ local (giá trị được nhớ trong localStorage `bgvn-cf`; xoá đi để quay về máy chủ thật).
- `server/.dev.vars` (ADMIN_KEY để test) **không bao giờ được commit**.

## Game mới – nhớ đăng ký đủ chỗ
Ô game ở `index.html` (+ CSS nền, số game ở hero) · `GAME_NAMES` + `OVER` trong `stats.js` · `GAMES` trong `shared/patchnotes.js`, `shared/ui/lobby.js`, `shared/ui/settings.js`, `shared/ui/feedback.js`, `server/src/lobby.js` (đổi server = deploy lại) · icon (`tools/icons`) + ảnh OG · `tools/qa/qa.mjs` · `credits/` nếu dùng thứ của người khác. Xong thì chạy `python3 tools/bump.py` để tăng `?v` cả chuỗi import.
- Cờ tướng: test luật `node cotuong/test/sim.mjs`, sinh cờ thế `node tools/cotuong/make-puzzles.mjs`. Mức Đại sư = Fairy-Stockfish (GPL-3, `cotuong/vendor/fsf/`), cần service worker `cotuong/coi-sw.js` để bật cross-origin isolation (chỉ đăng ký khi chọn Đại sư).
- Thật hay Thách: câu hỏi ở `thathaythach/js/cards.js` – chỉ nội dung lành mạnh (không rượu bia, không 18+, không ép lộ chuyện riêng tư nặng); test `node thathaythach/test/sim.mjs`.

## Bot và tính công bằng
- Bot chỉ được dùng bài của chính nó + thông tin công khai trên bàn. **Không** đọc bài người khác, thứ tự chồng bài hay vai bí mật; **không** viết luật phân biệt người thật với bot (`isBot`) trong `bot.js`.
- Sửa bot hay luật chia bài thì chạy `node tools/fair/fair.mjs` (bot giống nhau đấu nhau, mỗi ghế phải thắng xấp xỉ nhau) và cập nhật số ở trang `congbang/` nếu lệch đáng kể.

## Những điều anh đã dặn – luôn giữ
- **Không dùng tên bạn bè thật** của anh cho bot, ví dụ hay nội dung web. Tên bot dễ thương (Mochi, Bơ, Pudding…), và trong cùng một bàn các tên phải **khác chữ cái đầu** vì avatar hiện chữ cái đầu.
- **Ảnh/tranh:** chỉ dùng hình tự vẽ bằng code, tranh thuộc phạm vi công cộng hoặc có giấy phép rõ ràng, và ghi nguồn ở `credits/`. Không dùng art game thương mại hay tranh còn bản quyền. Ngoại lệ: ảnh Hoàng Nguyệt Anh do anh tự tạo bằng AI, không cần ghi credit.
- **Bí mật:** không đưa email, mật khẩu hay key vào repo (repo công khai). `ADMIN_KEY` là secret runtime trên Cloudflare. Không bao giờ hỏi anh dán key/mật khẩu vào chat; anh tự nhập ở trang `quantri/`. Quyền admin gắn vào tài khoản qua `claim-admin`, không qua email.
- Câu "fan-made phi thương mại" đã có ở trang Credits, **không** in lên bàn cờ hay bản đồ.
- Solitaire: không hiện thông báo khi không đi được lá bài.
- Tên game: **UNÔ**, **CÀ ĐÙNG!** (phông Bevan), Tam Quốc Sát. Lá chặn trong Mèo Nổ tên là **HUỶ KÈO!**.
- Game bài chỉ dùng chip/xu ảo, không có tiền thật.

## Commit
Commit lên `main` và push luôn (web và máy chủ tự deploy). Sau khi push, kiểm tra web thật, ví dụ `curl https://api.boardgamevui.com/presence`.
