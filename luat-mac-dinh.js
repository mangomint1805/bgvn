// ╔══════════════════════════════════════════════════════════════════════╗
// ║  ⚙️  LUẬT MẶC ĐỊNH CỦA CÁC GAME BGVN                                     ║
// ╚══════════════════════════════════════════════════════════════════════╝
// File này quyết định tuỳ chọn được CHỌN SẴN khi tạo phòng mới ở mỗi game.
// Trong sảnh chủ phòng vẫn đổi được như bình thường – đây chỉ là giá trị ban đầu.
//
// ✏️ CÁCH SỬA TRÊN GITHUB (không cần biết lập trình):
//   1. Mở https://github.com/mangomint1805/bgvn → bấm vào file  luat-mac-dinh.js
//   2. Bấm nút ✏️ (Edit this file) ở góc phải trên.
//   3. Tìm đúng game, chỉ sửa GIÁ TRỊ nằm giữa dấu ":" và dấu "," – ví dụ  turnTime: 30,  →  turnTime: 45,
//      • Giá trị PHẢI là một trong các giá trị liệt kê ở chú thích "Chọn:" (hoặc nằm trong "Khoảng:").
//      • Chữ thì giữ nguyên dấu nháy đơn:  'house'   · Số thì không nháy: 45   · Bật/tắt: true / false
//      • KHÔNG xoá dấu phẩy, dấu ngoặc { } hay dấu // ; không đổi tên bên trái dấu ":".
//   4. Kéo xuống bấm "Commit changes…" → "Commit changes".
//   5. Đợi khoảng 1–10 phút (GitHub Pages cập nhật + bộ nhớ đệm ~10 phút) rồi tải lại trang game.
//   Xem nhanh luật đang chạy: trang  /luat/  (nút "⚙️ Luật mặc định" ở cuối trang chủ).
//
// 🛟 AN TOÀN:
//   • Giá trị sai / gõ nhầm → game BỎ QUA giá trị đó và dùng luật gốc trong code (không hỏng game).
//   • Lỡ làm hỏng cả file (thiếu dấu phẩy, ngoặc…) → mọi game vẫn chạy bằng luật gốc. Trang /luat/ sẽ báo lỗi.
//   • Thay đổi chỉ áp dụng cho PHÒNG / VÁN MỚI. Phòng đang mở hoặc được khôi phục khi tải lại trang giữ luật đã chọn.
//   • Những thứ máy tự nhớ riêng sẽ THẮNG file này trên máy đó: BANG! (tốc độ, Người mới – khi máy đã bấm chọn),
//     Xếp Bài (tuỳ chọn ván gần nhất, nút tự đưa lên đích), Scribble "Hoạt hình một mình" (lựa chọn lần trước).
//     Ma Sói "bộ vai đã lưu" chỉ áp dụng khi chủ phòng bấm chọn bộ đó.

export default {
  // ===== 🤠 BANG! =====
  // BANG! không có tuỳ chọn phòng – đây là mặc định cho máy CHƯA từng chọn (máy đã bấm chọn thì giữ lựa chọn riêng).
  bang: {
    speed: 'normal', // Tốc độ hiệu ứng — Tốc độ hoạt ảnh và bot đánh. · Chọn: 'slow' = Chậm | 'normal' = Vừa | 'fast' = Nhanh
    newbie: true, // Chế độ Người mới — Hiện mẹo nên đánh gì, đoán vai (chỉ khi chơi với bot). · Chọn: true = Bật | false = Tắt
  },

  // ===== 🃏 UNO =====
  uno: {
    mode: 'house', // Chế độ — Chế độ được chọn sẵn khi tạo phòng. · Chọn: 'classic' = Cổ điển | 'house' = Luật rừng | 'nomercy' = No Mercy
    match: false, // Tính điểm nhiều ván — Cộng điểm qua nhiều ván tới mốc thì vô địch. · Chọn: true = Bật | false = Tắt
    matchTarget: 500, // Mốc điểm vô địch — Điểm cần đạt khi bật Tính điểm nhiều ván. · Chọn: 200 = 200 | 300 = 300 | 500 = 500
    modes: { // Luật được bật sẵn của từng chế độ (bấm chọn chế độ trong sảnh là nạp bộ luật này)
      classic: { // 🙂 Cổ điển
        stackDraw: false, // Cộng dồn lá rút — Bị +2/+4 thì chồng lá rút bằng/lớn hơn để đẩy phạt đi tiếp. · Chọn: true = Bật | false = Tắt
        stackAny: false, // +2 / +4 chồng lẫn nhau — Lá rút nào chồng lên lá rút nào cũng được. · Chọn: true = Bật | false = Tắt
        stackSkip: false, // Chồng Khoá mõm — Bị khoá mõm thì đánh Khoá mõm để chuyền cho người kế. · Chọn: true = Bật | false = Tắt
        sevenZero: false, // Luật 7 – 0 — Đánh 7 đổi bài với 1 người, đánh 0 cả bàn chuyền bài. · Chọn: true = Bật | false = Tắt
        drawUntil: false, // Rút tới khi đánh được — Không có lá hợp thì rút liên tục tới khi ra lá đánh được. · Chọn: true = Bật | false = Tắt
        mercy: false, // Luật không khoan nhượng — Ai giữ từ 25 lá trở lên bị loại. · Chọn: true = Bật | false = Tắt
        noActionFinish: false, // Không về bằng lá chức năng — Lá cuối cùng phải là lá số. · Chọn: true = Bật | false = Tắt
        extras: false, // Lá mở rộng — Thêm No U, Khiên, Bão tố, Tặng quà, Móc túi… vào bộ bài. · Chọn: true = Bật | false = Tắt
      },
      house: { // 🌳 Luật rừng
        stackDraw: true, // Cộng dồn lá rút — Bị +2/+4 thì chồng lá rút bằng/lớn hơn để đẩy phạt đi tiếp. · Chọn: true = Bật | false = Tắt
        stackAny: true, // +2 / +4 chồng lẫn nhau — Lá rút nào chồng lên lá rút nào cũng được. · Chọn: true = Bật | false = Tắt
        stackSkip: true, // Chồng Khoá mõm — Bị khoá mõm thì đánh Khoá mõm để chuyền cho người kế. · Chọn: true = Bật | false = Tắt
        sevenZero: false, // Luật 7 – 0 — Đánh 7 đổi bài với 1 người, đánh 0 cả bàn chuyền bài. · Chọn: true = Bật | false = Tắt
        drawUntil: false, // Rút tới khi đánh được — Không có lá hợp thì rút liên tục tới khi ra lá đánh được. · Chọn: true = Bật | false = Tắt
        mercy: false, // Luật không khoan nhượng — Ai giữ từ 25 lá trở lên bị loại. · Chọn: true = Bật | false = Tắt
        noActionFinish: true, // Không về bằng lá chức năng — Lá cuối cùng phải là lá số. · Chọn: true = Bật | false = Tắt
        extras: true, // Lá mở rộng — Thêm No U, Khiên, Bão tố, Tặng quà, Móc túi… vào bộ bài. · Chọn: true = Bật | false = Tắt
      },
      nomercy: { // 💀 No Mercy
        stackDraw: true, // Cộng dồn lá rút — Bị +2/+4 thì chồng lá rút bằng/lớn hơn để đẩy phạt đi tiếp. · Chọn: true = Bật | false = Tắt
        stackAny: false, // +2 / +4 chồng lẫn nhau — Lá rút nào chồng lên lá rút nào cũng được. · Chọn: true = Bật | false = Tắt
        stackSkip: false, // Chồng Khoá mõm — Bị khoá mõm thì đánh Khoá mõm để chuyền cho người kế. · Chọn: true = Bật | false = Tắt
        sevenZero: true, // Luật 7 – 0 — Đánh 7 đổi bài với 1 người, đánh 0 cả bàn chuyền bài. · Chọn: true = Bật | false = Tắt
        drawUntil: true, // Rút tới khi đánh được — Không có lá hợp thì rút liên tục tới khi ra lá đánh được. · Chọn: true = Bật | false = Tắt
        mercy: true, // Luật không khoan nhượng — Ai giữ từ 25 lá trở lên bị loại. · Chọn: true = Bật | false = Tắt
        noActionFinish: false, // Không về bằng lá chức năng — Lá cuối cùng phải là lá số. · Chọn: true = Bật | false = Tắt
        extras: false, // Lá mở rộng — Thêm No U, Khiên, Bão tố, Tặng quà, Móc túi… vào bộ bài. · Chọn: true = Bật | false = Tắt
      },
    },
  },

  // ===== 🏙️ Cờ Tỷ Phú =====
  typhu: {
    startMoney: 1500, // Tiền khởi đầu — Tiền mỗi người lúc bắt đầu. · Chọn: 1500 = 1,5M | 2000 = 2M | 2500 = 2,5M
    maxRounds: 0, // Giới hạn vòng — Hết vòng thì ai nhiều tài sản nhất thắng. · Chọn: 0 = Không giới hạn | 20 = 20 vòng | 30 = 30 vòng | 50 = 50 vòng
    monopolyWin: true, // Thắng độc quyền — Trọn 3 nhóm màu, cả 4 bến xe hoặc trọn 1 hàng là thắng luôn. · Chọn: true = Bật | false = Tắt
    auction: false, // Đấu giá — Không mua thì đem ô đó ra đấu giá. · Chọn: true = Bật | false = Tắt
    freeBuild: 'zing', // Xây nhà — Điều kiện được xây nhà. · Chọn: true = Không cần đủ bộ | false = Phải đủ bộ màu | 'zing' = ZingPlay thật (chỉ xây ở ô vừa dừng)
    buyback: true, // Mua lại đất — Trả thuê xong được mua lại đường đó với giá gấp đôi. · Chọn: true = Bật | false = Tắt
    travel: true, // Bãi đậu xe — Dừng ở Bãi đậu xe thì làm gì. · Chọn: true = Du lịch (bay tới 1 ô) | false = Chỉ nghỉ
    travelFee: 100, // Vé máy bay — Giá vé khi du lịch từ Bãi đậu xe (không đủ tiền thì chỉ nghỉ). · Chọn: 0 = Miễn phí | 50 = 50K | 100 = 100K | 200 = 200K
    turnTime: 60, // Thời gian suy nghĩ (online) — Hết giờ máy đánh giúp. Chơi với bot luôn là Không. · Chọn: 0 = Không | 30 = 30 giây | 60 = 60 giây | 90 = 90 giây
  },

  // ===== 🎨 Scribble =====
  scribble: {
    mode: 'guess', // Trò chơi — Trò được chọn sẵn khi tạo phòng. · Chọn: 'guess' = Đoán hình | 'gartic' = Tam sao thất bản
    gmode: 'normal', // Kiểu Tam sao thất bản — Kiểu chơi chọn sẵn của Tam sao thất bản. · Chọn: 'normal' = Bình thường | 'speed' = Tốc chiến | 'knockoff' = Nhìn trộm | 'sandwich' = Bánh mì kẹp | 'secret' = Vẽ mù | 'complement' = Vẽ tiếp | 'icebreaker' = Phá băng | 'animation' = Hoạt hình | 'background' = Phông nền | 'solo' = Một mình | 'score' = Chấm điểm | 'crowd' = Đông vui | 'custom' = Tuỳ chỉnh
    rounds: 3, // Số vòng (Đoán hình) — Mỗi vòng ai cũng được vẽ 1 lần. · Khoảng: số nguyên từ 1 đến 10
    drawTime: 80, // Thời gian vẽ (giây) — Số giây mỗi lượt vẽ. · Khoảng: số nguyên từ 30 đến 180 (bước 10)
    textTime: 40, // Thời gian viết / đoán (giây) — Số giây mỗi bước viết câu (Tam sao thất bản). · Khoảng: số nguyên từ 20 đến 90 (bước 5)
    cSteps: 6, // Số bước (Tuỳ chỉnh) — Số bước của kiểu Tuỳ chỉnh (các bước xen kẽ Viết/Vẽ). · Khoảng: số nguyên từ 2 đến 20
    cTime: 60, // Thời gian mỗi bước (Tuỳ chỉnh) — Số giây mỗi bước của kiểu Tuỳ chỉnh. · Khoảng: số nguyên từ 10 đến 180 (bước 5)
    revealAuto: 5, // Chiếu lại cuối ván — Số giây tự sang bước sau khi chiếu lại. · Chọn: 0 = Bấm tay | 3 = 3 giây | 5 = 5 giây | 8 = 8 giây
    frames: 0, // Số khung (Hoạt hình / Phông nền) — 0 = tự động theo số người, hoặc 4–16 khung. · Khoảng: số nguyên từ 0 đến 16 – Chỉ 0 hoặc 4–16
    fps: 4, // Tốc độ phim (khung/giây) — Tốc độ chiếu ảnh động. · Khoảng: số nguyên từ 1 đến 12
    gSize: 6, // Người mỗi nhóm (Đông vui) — Cỡ nhóm khi chơi kiểu Đông vui. · Khoảng: số nguyên từ 4 đến 8
    cats: { // Chủ đề từ được bật sẵn (true = bật, false = tắt; phải còn ít nhất 1 chủ đề bật)
      dovat: true, // 🧸 Đồ vật — Bật chủ đề này trong kho từ Đoán hình. · Chọn: true = Bật | false = Tắt
      convat: true, // 🐱 Con vật — Bật chủ đề này trong kho từ Đoán hình. · Chọn: true = Bật | false = Tắt
      monan: true, // 🍜 Món ăn Việt — Bật chủ đề này trong kho từ Đoán hình. · Chọn: true = Bật | false = Tắt
      saigon: true, // 🏙️ Địa danh Sài Gòn — Bật chủ đề này trong kho từ Đoán hình. · Chọn: true = Bật | false = Tắt
      nghe: true, // 👩‍🍳 Nghề nghiệp — Bật chủ đề này trong kho từ Đoán hình. · Chọn: true = Bật | false = Tắt
      hanhdong: true, // 🏃 Hành động — Bật chủ đề này trong kho từ Đoán hình. · Chọn: true = Bật | false = Tắt
      genz: true, // 😎 Meme Gen Z — Bật chủ đề này trong kho từ Đoán hình. · Chọn: true = Bật | false = Tắt
      hoiban: true, // 🫂 Hội bạn — Bật chủ đề này trong kho từ Đoán hình. · Chọn: true = Bật | false = Tắt
      thethao: true, // ⚽ Thể thao & trò chơi — Bật chủ đề này trong kho từ Đoán hình. · Chọn: true = Bật | false = Tắt
      thiennhien: true, // 🌈 Thiên nhiên — Bật chủ đề này trong kho từ Đoán hình. · Chọn: true = Bật | false = Tắt
      xecoc: true, // 🛵 Xe cộ — Bật chủ đề này trong kho từ Đoán hình. · Chọn: true = Bật | false = Tắt
      lol: false, // 🎮 Tướng Liên Minh — Bật chủ đề này trong kho từ Đoán hình. · Chọn: true = Bật | false = Tắt
      lehoi: true, // 🧧 Lễ hội — Bật chủ đề này trong kho từ Đoán hình. · Chọn: true = Bật | false = Tắt
    },
    solo: { // 🧑‍🎨 Hoạt hình một mình (máy đã từng vẽ một mình thì nhớ lựa chọn riêng của máy đó)
      frames: 5, // Một mình: số khung — Số khung khi vẽ Hoạt hình một mình. · Khoảng: số nguyên từ 3 đến 12
      fps: 4, // Một mình: tốc độ phim — Khung/giây khi vẽ một mình. · Khoảng: số nguyên từ 1 đến 12
      drawTime: 80, // Một mình: thời gian vẽ — Giây mỗi khung (khung sau ngắn hơn chút). · Khoảng: số nguyên từ 30 đến 180 (bước 10)
    },
  },

  // ===== 💣 Mèo Nổ =====
  meono: {
    turnTime: 45, // Thời gian mỗi lượt — Hết giờ máy đánh giúp. · Chọn: 30 = 30 giây | 45 = 45 giây | 60 = 60 giây | 90 = 90 giây
    expansion: true, // Thêm Cải Mệnh & Móc Đáy — Tắt để chơi bộ cơ bản. · Chọn: true = Bật | false = Tắt
    chaos: false, // Bộ bài Hỗn loạn — Gấp đôi Đổ Vỏ, nhiều ĐÉO! & Xào Bài hơn, thêm Gỡ Bom. · Chọn: true = Bật | false = Tắt
  },

  // ===== ⚔️ Tam Quốc Sát =====
  tamquoc: {
    exp: true, // Bản mở rộng Quân Tranh — Thêm Rượu, Hỏa Sát, Lôi Sát, Hỏa công, Đằng giáp… · Chọn: true = Bật | false = Tắt
    expGen: true, // Tướng mở rộng — Thêm 13 võ tướng mở rộng. · Chọn: true = Bật | false = Tắt
    training: false, // Tập chơi (có gợi ý) — Có "thầy" gợi ý lá nên đánh; online gấp đôi thời gian. · Chọn: true = Bật | false = Tắt
    tapChoi: { // 🎓 Khi bấm nút "Tập chơi" (chơi một mình với bot, luôn bật gợi ý)
      exp: false, // Nút 🎓 Tập chơi: bản mở rộng — Bản mở rộng khi bấm nút Tập chơi một mình. · Chọn: true = Bật | false = Tắt
      expGen: false, // Nút 🎓 Tập chơi: tướng mở rộng — Tướng mở rộng khi bấm nút Tập chơi một mình. · Chọn: true = Bật | false = Tắt
    },
  },

  // ===== 🐺 Ma Sói =====
  masoi: {
    auto: true, // Tự gợi ý bộ vai — Bật: bộ vai tự đổi theo số người. Tắt: dùng bộ vai bên dưới. · Chọn: true = Bật | false = Tắt
    roles: { // Bộ vai dùng khi TẮT Tự gợi ý (số lá mỗi vai; Sói 0–6, vai khác 0 hoặc 1)
      wolf: 2, // 🐺 Ma Sói — Số lá vai này khi tắt Tự gợi ý (Dân Làng tự lấp chỗ trống). · Khoảng: số nguyên từ 0 đến 6
      alpha: 0, // 👑 Sói Trùm — Số lá vai này khi tắt Tự gợi ý (Dân Làng tự lấp chỗ trống). · Chọn: 0 = Không có | 1 = Có 1
      cub: 0, // 🐾 Sói Con — Số lá vai này khi tắt Tự gợi ý (Dân Làng tự lấp chỗ trống). · Chọn: 0 = Không có | 1 = Có 1
      seer: 1, // 🔮 Tiên Tri — Số lá vai này khi tắt Tự gợi ý (Dân Làng tự lấp chỗ trống). · Chọn: 0 = Không có | 1 = Có 1
      guard: 1, // 🛡️ Bảo Vệ — Số lá vai này khi tắt Tự gợi ý (Dân Làng tự lấp chỗ trống). · Chọn: 0 = Không có | 1 = Có 1
      witch: 1, // 🧪 Phù Thủy — Số lá vai này khi tắt Tự gợi ý (Dân Làng tự lấp chỗ trống). · Chọn: 0 = Không có | 1 = Có 1
      hunter: 1, // 🏹 Thợ Săn — Số lá vai này khi tắt Tự gợi ý (Dân Làng tự lấp chỗ trống). · Chọn: 0 = Không có | 1 = Có 1
      cupid: 1, // 💘 Thần Tình Yêu — Số lá vai này khi tắt Tự gợi ý (Dân Làng tự lấp chỗ trống). · Chọn: 0 = Không có | 1 = Có 1
      elder: 0, // 👴 Già Làng — Số lá vai này khi tắt Tự gợi ý (Dân Làng tự lấp chỗ trống). · Chọn: 0 = Không có | 1 = Có 1
      idiot: 0, // 🤪 Kẻ Ngốc — Số lá vai này khi tắt Tự gợi ý (Dân Làng tự lấp chỗ trống). · Chọn: 0 = Không có | 1 = Có 1
      medium: 0, // 🕯️ Bà Đồng — Số lá vai này khi tắt Tự gợi ý (Dân Làng tự lấp chỗ trống). · Chọn: 0 = Không có | 1 = Có 1
      thief: 0, // 🃏 Kẻ Trộm — Số lá vai này khi tắt Tự gợi ý (Dân Làng tự lấp chỗ trống). · Chọn: 0 = Không có | 1 = Có 1
      lunatic: 0, // 👓 Ông Già Lẩm Cẩm — Số lá vai này khi tắt Tự gợi ý (Dân Làng tự lấp chỗ trống). · Chọn: 0 = Không có | 1 = Có 1
      tanner: 0, // 🥀 Thằng Chán Đời — Số lá vai này khi tắt Tự gợi ý (Dân Làng tự lấp chỗ trống). · Chọn: 0 = Không có | 1 = Có 1
    },
    reveal: false, // Lộ vai khi chết — Tắt: chỉ biết ai chết, không biết là vai gì. · Chọn: true = Bật | false = Tắt
    voteMode: 'open', // Kiểu bỏ phiếu — Công khai: thấy ai bầu ai. · Chọn: 'open' = Công khai | 'secret' = Ẩn
    tie: 'revote', // Khi hoà phiếu — Xử lý khi số phiếu bằng nhau. · Chọn: 'revote' = Bầu lại 1 lần | 'none' = Không treo ai
    doubleSave: 'live', // Bảo Vệ + Phù Thủy cùng cứu — Luật "sữa đổ": cứu 2 lần là chết. · Chọn: 'live' = Sống | 'die' = Chết (sữa đổ)
    dayTime: 120, // Thời gian thảo luận — Ai cũng sẵn sàng thì vào bầu sớm. · Chọn: 60 = 60 giây | 90 = 90 giây | 120 = 2 phút | 180 = 3 phút | 240 = 4 phút | 300 = 5 phút
    voteTime: 40, // Thời gian bỏ phiếu — Số giây để bầu. · Chọn: 20 = 20 giây | 30 = 30 giây | 40 = 40 giây | 60 = 60 giây | 90 = 90 giây
    nightTime: 25, // Thời gian mỗi vai ban đêm — Sói được gấp rưỡi. · Chọn: 15 = 15 giây | 20 = 20 giây | 25 = 25 giây | 30 = 30 giây | 45 = 45 giây
    vanTap: { // 🎓 Ván tập cho người mới (nút Ván tập, chơi offline 6 người)
      reveal: true, // Ván tập: lộ vai khi chết — Áp dụng cho nút 🎓 Ván tập. · Chọn: true = Bật | false = Tắt
      dayTime: 180, // Ván tập: thời gian thảo luận — Áp dụng cho nút 🎓 Ván tập. · Chọn: 60 = 60 giây | 90 = 90 giây | 120 = 2 phút | 180 = 3 phút | 240 = 4 phút | 300 = 5 phút
      voteTime: 60, // Ván tập: thời gian bỏ phiếu — Áp dụng cho nút 🎓 Ván tập. · Chọn: 20 = 20 giây | 30 = 30 giây | 40 = 40 giây | 60 = 60 giây | 90 = 90 giây
      nightTime: 45, // Ván tập: thời gian mỗi vai ban đêm — Áp dụng cho nút 🎓 Ván tập. · Chọn: 15 = 15 giây | 20 = 20 giây | 25 = 25 giây | 30 = 30 giây | 45 = 45 giây
    },
  },

  // ===== 🂡 Tiến Lên =====
  tienlen: {
    bet: 10, // Cược 1 phần — Heo đen 1 phần, heo đỏ 2 phần… (chip ảo). · Chọn: 10 = 10 chip | 20 = 20 chip | 50 = 50 chip
    toiTrang: true, // Tới trắng — Chia bài xong có sảnh rồng, tứ quý heo, 5 đôi thông… là thắng ngay. · Chọn: true = Bật | false = Tắt
    thoiHang: true, // Thối hàng — Hết ván còn tứ quý / đôi thông trên tay cũng bị phạt. · Chọn: true = Bật | false = Tắt
    chatChong: true, // Chặt chồng — Bị chặt lại thì đền luôn phần trước cho người chặt sau cùng. · Chọn: true = Bật | false = Tắt
    spadeEvery: false, // Ván nào cũng 3♠ đi trước — Tắt: ván sau người về nhất được đi trước. · Chọn: true = Bật | false = Tắt
    turnTime: 30, // Giờ mỗi lượt — Hết giờ máy đánh thay. · Chọn: 20 = 20 giây | 30 = 30 giây | 60 = 60 giây
    veHeo: 'heoHang', // Về heo — Có được đánh nước cuối bằng heo/hàng không. · Chọn: 'heoHang' = Cấm về heo + hàng | 'heo' = Cấm về heo | 'free' = Cho phép
    botLevel: 'normal', // Độ khó bot mới thêm — Độ khó của bot khi bấm Thêm bot (vẫn đổi từng bot được). · Chọn: 'easy' = Gà mờ | 'normal' = Vừa | 'hard' = Cao thủ | 'master' = Huyền thoại
  },

  // ===== 🎴 Cát Tê =====
  catte: {
    ante: 50, // Tiền cược mỗi ván — Ai cũng góp vào nồi, người tới hốt hết. · Chọn: 10 = 10 chip | 20 = 20 chip | 50 = 50 chip | 100 = 100 chip | 200 = 200 chip
    startChips: 1000, // Chip lúc vào bàn — Chip ảo mỗi người. · Chọn: 500 = 500 | 1000 = 1.000 | 2000 = 2.000 | 5000 = 5.000
    showdown: 'chung', // Vòng 5 — Cách đánh vòng cuối. · Chọn: 'chung' = Chưng bài (chọn lá úp cùng lúc) | 'ngua' = Đánh lần lượt, ngửa bài
    turnTime: 25, // Đồng hồ mỗi lượt — Hết giờ máy đánh giùm. · Chọn: 15 = 15 giây | 25 = 25 giây | 40 = 40 giây | 60 = 60 giây
    wQuads: true, // Tới trắng: Tứ quý — 4 lá cùng số là thắng ngay khi chia. · Chọn: true = Bật | false = Tắt
    wFlush: true, // Tới trắng: 6 lá đồng chất — 6 lá cùng 1 chất. · Chọn: true = Bật | false = Tắt
    wSmall: true, // Tới trắng: 6 lá nhỏ hơn 6 — Toàn lá 2, 3, 4, 5. · Chọn: true = Bật | false = Tắt
    bWhite: false, // Tới trắng ăn gấp đôi — Mỗi nhà trả thêm 1 cược. · Chọn: true = Bật | false = Tắt
    bSweep: false, // Ăn trọn 4 vòng — Cả bàn chết: mỗi nhà trả thêm ½ cược. · Chọn: true = Bật | false = Tắt
    bLow: false, // Tới bằng lá nhỏ — Từ 3 người: tới bằng K…2 ăn thêm ¼…3 cược mỗi người còn sống. · Chọn: true = Bật | false = Tắt
    thoiAt: false, // Thối Át — Chết mà còn giữ Át: phạt 1 cược mỗi Át. · Chọn: true = Bật | false = Tắt
  },

  // ===== 🂱 Xì Dách =====
  xidach: {
    caiMode: 'rotate', // Ai làm cái — Cách chọn nhà cái. · Chọn: 'rotate' = Xoay vòng | 'fixed' = Cố định (chủ phòng làm cái) | 'bot' = Bot làm cái | 'xidach' = Ai xì dách làm cái
    startChips: 1000, // Vốn mỗi người — Chip ảo lúc vào bàn. · Chọn: 500 = 500 | 1000 = 1.000 | 2000 = 2.000 | 5000 = 5.000
    minBet: 10, // Cược tối thiểu — Mức cược nhỏ nhất. · Chọn: 10 = 10 | 20 = 20 | 50 = 50
    maxBet: 200, // Cược tối đa — Mức cược lớn nhất. · Chọn: 100 = 100 | 200 = 200 | 500 = 500 | 0 = Tất tay
    minPts: 16, // Người chơi được dằn từ — Đủ điểm này mới được dằn. · Chọn: 15 = 15 điểm | 16 = 16 điểm
    caiMin: 16, // Nhà cái được xét từ — Nhà cái đủ điểm này mới được xét bài. · Chọn: 15 = 15 điểm | 16 = 16 điểm
    mXiBan: 3, // Xì bàn ăn — Hệ số ăn/đền khi có xì bàn. · Chọn: 1 = ×1 | 2 = ×2 | 3 = ×3
    mXiDach: 2, // Xì dách ăn — Hệ số ăn/đền khi có xì dách. · Chọn: 1 = ×1 | 2 = ×2 | 3 = ×3
    mNguLinh: 2, // Ngũ linh ăn — Hệ số ăn/đền khi có ngũ linh. · Chọn: 1 = ×1 | 2 = ×2 | 3 = ×3
    bothBust: 'hoa', // Cùng quắc — Người chơi và nhà cái cùng quắc thì sao. · Chọn: 'cai' = Nhà cái ăn | 'hoa' = Hoà
    aceRule: 'vn', // Lá A — Cách tính điểm lá A. · Chọn: 'vn' = Kiểu Việt | 'flex' = Linh hoạt 1/11
    allowNon: false, // Dằn non — Cho dằn khi chưa đủ điểm (lật ra là thua). · Chọn: false = Không cho | true = Cho (lật ra thua)
    turnTime: 30, // Thời gian mỗi lượt — Treo máy quá thì máy làm giùm. · Chọn: 20 = 20 giây | 30 = 30 giây | 45 = 45 giây
  },

  // ===== ♠️ Poker =====
  poker: {
    mode: 'cash', // Chế độ — Chế độ chọn sẵn. · Chọn: 'cash' = Chơi vui (hết chip xin thêm) | 'tourn' = Giải đấu (hết chip bị loại)
    chips: 1000, // Chip khởi điểm — Chip ảo mỗi người. · Chọn: 500 = 500 | 1000 = 1.000 | 2000 = 2.000 | 5000 = 5.000
    bb: 20, // Mù lớn — Mù nhỏ = một nửa. · Chọn: 10 = 5/10 | 20 = 10/20 | 50 = 25/50 | 100 = 50/100
    blindUp: 5, // Tăng mù (lúc tạo phòng) — Tăng mù sau mỗi bao nhiêu ván. · Chọn: 0 = Không | 5 = Mỗi 5 ván | 10 = Mỗi 10 ván | 15 = Mỗi 15 ván
    turnTime: 30, // Thời gian mỗi lượt (online) — Hết giờ máy đánh giùm. · Chọn: 20 = 20 giây | 30 = 30 giây | 45 = 45 giây
    modeBlindUp: { // Tăng mù tự đặt khi bấm đổi chế độ trong sảnh
      cash: 0, // Tăng mù khi chuyển sang Chơi vui — Bấm chọn chế độ Chơi vui trong sảnh thì Tăng mù về giá trị này. · Chọn: 0 = Không | 5 = Mỗi 5 ván | 10 = Mỗi 10 ván | 15 = Mỗi 15 ván
      tourn: 10, // Tăng mù khi chuyển sang Giải đấu — Bấm chọn chế độ Giải đấu trong sảnh thì Tăng mù về giá trị này. · Chọn: 0 = Không | 5 = Mỗi 5 ván | 10 = Mỗi 10 ván | 15 = Mỗi 15 ván
    },
  },

  // ===== 🐴 Cờ Cá Ngựa =====
  cangua: {
    dice: 2, // Số xúc xắc — Đổ 1 hay 2 xúc xắc. · Chọn: 2 = 2 con | 1 = 1 con
    moveMode: 'total', // Cách đi (2 xúc xắc) — Dồn tổng cho 1 ngựa hay tách mỗi xúc xắc 1 nước. · Chọn: 'total' = Dồn tổng 1 con | 'split' = Tách 2 con
    exit2: 'd16', // Xuất chuồng (2 xúc xắc) — Đổ gì thì được ra quân. · Chọn: 'd16' = Đôi hoặc 1+6 | 'any6' = Đôi hoặc có con 6
    exit1: '6', // Xuất chuồng (1 xúc xắc) — Đổ gì thì được ra quân. · Chọn: '6' = Chỉ 6 | '16' = 1 hoặc 6
    noJump: true, // Nhảy qua đầu ngựa — Trên đường đi có được vượt qua ngựa khác không. · Chọn: true = Không được | false = Được
    homeRule: 'thru', // Vào chuồng — Cách đi vào chuồng đích. · Chọn: 'thru' = Đếm thẳng vào (luật nhà) | 'vn' = Dừng ở cửa, ra n lên bậc n | 'count' = Đếm bước cả trong chuồng
    dblUp: true, // Đôi lên chuồng — Đổ đôi thì 1 ngựa ở cửa/trên đích lên thêm 1 bậc (chỉ khi Vào chuồng = vn, 2 xúc xắc). · Chọn: true = Bật | false = Tắt
    dblHalf: true, // Đổ đôi — Đổ đôi được đi cả tổng hay nửa. · Chọn: true = Chọn đi cả hoặc nửa | false = Chỉ đi cả tổng
    winRule: 'top4', // Thắng khi — Điều kiện thắng. · Chọn: 'top4' = Chiếm bậc 3-4-5-6 | 'home' = Cả 4 lên đích
    triple: true, // 3 lần thưởng liền — Đổ đôi / 1+6 lần thứ 3 liên tiếp thì sao. · Chọn: false = Không sao | true = Mất lượt
    playOn: false, // Đua tiếp tranh hạng — Có người về nhất rồi vẫn đua tiếp tranh hạng 2, 3. · Chọn: true = Bật | false = Tắt
    botLevel: 'normal', // Độ khó bot — Bot đi khôn cỡ nào. · Chọn: 'easy' = Dễ | 'normal' = Vừa | 'hard' = Khó
    turnTime: 30, // Thời gian suy nghĩ (online) — Hết giờ máy đi giúp. Chơi với bot luôn là Không. · Chọn: 0 = Không | 15 = 15 giây | 30 = 30 giây | 45 = 45 giây
  },

  // ===== 🐪 Đua Lạc Đà =====
  camel: {
    crazy: true, // Lạc đà xỉn (chạy ngược) — Thêm 2 con Đen/Trắng chạy lùi + 1 xúc xắc xám. · Chọn: true = Bật | false = Tắt
  },

  // ===== 🂠 Xếp Bài =====
  // Chỉ áp dụng cho máy CHƯA từng chơi: máy đã chơi thì nhớ tuỳ chọn ván gần nhất / nút bật-tắt riêng.
  solitaire: {
    draw: 1, // Rút — Lật mấy lá mỗi lần rút. · Chọn: 1 = Rút 1 | 3 = Rút 3
    score: 1, // Tính điểm — Kiểu tính điểm. · Chọn: 1 = Tiêu chuẩn | 2 = Vegas | 0 = Không tính điểm
    autoFoundation: true, // Tự đưa lá an toàn lên đích — Tự đẩy lá chắc chắn an toàn lên ô đích. · Chọn: true = Bật | false = Tắt
  },

  // ===== 🃏 Ba Cào =====
  bacao: {
    mode: 'cai', // Kiểu chơi — Có nhà cái ăn/đền từng người, hay chơi gà góp chung. · Chọn: 'cai' = Có nhà cái | 'pot' = Chơi gà (góp chung, bài to nhất hốt)
    caiMode: 'rotate', // Ai làm cái — Cách chọn nhà cái (kiểu Có nhà cái). · Chọn: 'rotate' = Xoay vòng | 'fixed' = Cố định (chủ phòng làm cái) | 'bot' = Bot làm cái | 'batay' = Ai ba tây thì làm cái
    startChips: 1000, // Vốn mỗi người — Chip ảo lúc vào bàn. · Chọn: 500 = 500 | 1000 = 1.000 | 2000 = 2.000 | 5000 = 5.000
    minBet: 10, // Cược tối thiểu — Mức cược nhỏ nhất (kiểu Có nhà cái). · Chọn: 10 = 10 | 20 = 20 | 50 = 50
    maxBet: 200, // Cược tối đa — Mức cược lớn nhất (kiểu Có nhà cái). · Chọn: 100 = 100 | 200 = 200 | 500 = 500 | 0 = Tất tay
    ante: 20, // Tiền góp gà — Mỗi người góp mỗi ván (kiểu Chơi gà). · Chọn: 10 = 10 | 20 = 20 | 50 = 50 | 100 = 100
    batay: true, // Ba tây — 3 lá J/Q/K là bài to, thắng mọi bài điểm. · Chọn: true = Tính | false = Không tính
    sap: 'top', // Sáp (3 lá cùng số) — Có tính sáp không, xếp trên hay dưới ba tây. · Chọn: 'top' = Sáp > Ba tây | 'mid' = Ba tây > Sáp | 'off' = Không tính
    tie: 'suit', // Bằng điểm thì — Cách phân thắng thua khi bằng nút. · Chọn: 'suit' = So chất lá to nhất (♦ > ♥ > ♠ > ♣) | 'rank' = So lá số to nhất (A > K > … > 2) | 'push' = Hoà
    mBaTay: 2, // Ba tây ăn — Hệ số ăn/đền khi thắng bằng ba tây. · Chọn: 1 = ×1 | 2 = ×2 | 3 = ×3
    mSap: 3, // Sáp ăn — Hệ số ăn/đền khi thắng bằng sáp. · Chọn: 1 = ×1 | 2 = ×2 | 3 = ×3 | 5 = ×5
    nan: true, // Nặn bài — Tự kéo hé từng lá trước khi lật chung. · Chọn: true = Có | false = Không (lật luôn)
    peekTime: 20, // Thời gian nặn — Hết giờ máy tự lật giùm. · Chọn: 10 = 10 giây | 20 = 20 giây | 30 = 30 giây
  },
};
