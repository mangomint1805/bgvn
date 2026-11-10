# ✅ Checklist trước khi đẩy bản lớn

Chạy `bash tools/qa/run.sh` trước, rồi soát tay những mục sau (mục nào không liên quan tới thay đổi thì bỏ qua).

## Giao diện
- [ ] Mở ảnh trong `tools/qa/out/`: chữ không tràn, không đè lên nhau, chữ Việt đủ dấu (Đ, ư, ơ…), nút bấm được trên điện thoại.
- [ ] Trang chủ: tên game thẳng hàng, nút ⚙️ Cài đặt, nút đăng nhập, số người online.
- [ ] Trong game có nút về trang chủ; menu ⚙️ của game mở được.

## Chơi online (2 thiết bị hoặc 2 cửa sổ ẩn danh)
- [ ] Tạo phòng → khách vào bằng mã và bằng link mời.
- [ ] Đang chơi mà khách tải lại trang → vào lại đúng chỗ. Chủ phòng tải lại trang → phòng vẫn còn.
- [ ] Người thứ 3 vào giữa ván → được xem, có dải "👀 Đang xem". Ván sau người đó được chơi.
- [ ] Bật 🌐 Công khai phòng → phòng hiện ở Sảnh chung; tắt → phòng biến mất.
- [ ] Thả emoji / câu chọc hiện đủ ở cả 2 bên.

## Tài khoản, chat, quản trị
- [ ] Đăng nhập bằng tên đăng nhập và bằng Google; đổi tên; đăng xuất.
- [ ] Chat ở Sảnh: từ bậy bị che, nút 🚩 báo cáo dùng được.
- [ ] Trang `quantri/`: số liệu hiện ra, các tab Báo cáo / Góp ý / Đang cấm / Tài khoản mở được.

## Sau khi push
- [ ] `curl https://api.boardgamevui.com/presence` trả về `{"ok":true,...}`.
- [ ] Mở boardgamevui.com bằng điện thoại thật, vào một game vừa sửa và chơi thử 1 ván với bot.
- [ ] Patch note mới hiện trong mục 📰 Có gì mới.
