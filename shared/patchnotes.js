// Patch notes BGVN – mới nhất ở trên. game: 'all' | 'bang' | 'uno' | 'typhu' | 'scribble' | 'meono' | 'tamquoc' | 'masoi'
// Thêm bản mới: chèn object lên ĐẦU mảng, id tăng dần theo thời gian (YYYYMMDD-n).
export const GAMES = {
  all: '🎲 BGVN', bang: '🤠 BANG!', uno: '🃏 UNO', typhu: '🏙️ Cờ Tỷ Phú', scribble: '🎨 Scribble it!',
  meono: '💣 Mèo Nổ', tamquoc: '⚔️ Tam Quốc Sát', masoi: '🐺 Ma Sói',
  xidach: '🃏 Xì dách', poker: '♠️ Poker', tienlen: '🐷 Tiến Lên', catte: '🂡 Cát tê', cangua: '🐴 Cờ cá ngựa', camel: '🐪 Đua Lạc Đà', solitaire: '🃏 Xếp bài', bacao: '👑 Ba Cào',
};
export const NOTES = [
  { id: '20261110-08', date: '10/11/2026', game: 'all', title: 'Nút về trang chủ + sửa lặt vặt', items: [
    '🏠 Hộp "Rời ván?" ở mọi game có thêm nút Về trang chủ BGVN (Bang!: trong ⚙️).',
    '🎴 Tam Quốc Sát: màn bốc thẻ thân phận – chữ trên thẻ tre không còn bị vỡ dấu/cắt chữ, nền che kín, chữ "Bạn là …" dễ đọc.',
    '🤖 Tên bot có chữ cái đầu khác nhau (Kẹo, Xôi, Gấu Bông, Đậu, Nấm, Sữa…) để avatar không trùng.',
  ] },
  { id: '20261110-07', date: '10/11/2026', game: 'all', title: 'Đổi tên bot', items: [
    '🤖 Bot ở mọi game giờ có tên cute: Kẹo, Xôi, Gấu Bông, Đậu, Nấm, Sữa, Mochi, Pudding… (chữ cái đầu khác nhau cho dễ nhìn) – ví dụ trong hướng dẫn cũng đổi theo.',
  ] },
  { id: '20261110-06', date: '10/11/2026', game: 'solitaire', title: 'Theme mới: ✂️ Cắt dán', items: [
    '✂️ Bộ bài collage giấy cắt BGVN tự vẽ: mỗi lá là một bức cắt dán sticker, tem, băng keo khác nhau; J Q K là cáo, thỏ, gấu hoàng gia (chất đen tông tối).',
    '🟫 Bàn thảm nâu + lưng bài giấy kraft tem BGVN. Chọn ở nút tên game → Giao diện.',
  ] },
  { id: '20261110-05', date: '10/11/2026', game: 'all', title: 'Bản đồ 3D: chuột trái kéo, chuột phải xoay', items: [
    '🖱️ Cờ Tỷ Phú, Cờ cá ngựa, Đua Lạc Đà: giữ chuột trái kéo để di bản đồ, giữ chuột phải để xoay, lăn chuột để phóng to. Điện thoại vẫn như cũ.',
  ] },
  { id: '20261110-04', date: '10/11/2026', game: 'solitaire', title: 'Bộ bài mèo hồng pastel', items: [
    '🐱 Theme Mèo con giờ có bộ mặt bài riêng BGVN tự vẽ: chất bài là mèo, Át mỗi chất một bé mèo, J/Q/K là 12 bé mèo đội mũ/vương miện khác nhau.',
  ] },
  { id: '20261110-03', date: '10/11/2026', game: 'solitaire', title: 'Bỏ thông báo khi chuột phải không có lá', items: [
    '🔇 Chuột phải mà không có lá nào lên đích được thì chỉ kêu một tiếng, không hiện thanh thông báo nữa.',
  ] },
  { id: '20261110-02', date: '10/11/2026', game: 'solitaire', title: 'Theme mới, chế độ tối, chuột phải kiểu Windows', items: [
    '🎀 Thêm theme: 🐱 Mèo con (BGVN tự vẽ), 🐧 Cánh cụt (bộ Penguins của KDE), 👑 Tim hồng (Jolly Royal + Royal Hearts của KDE). Bấm 🎨 để chọn.',
    '🌙 Chế độ tối: tự theo máy, hoặc chọn Sáng/Tối trong ☰ Thêm.',
    '🖱️ Chuột phải / nút ⤴️ Lên đích giờ đưa mọi lá lên được đích (như Solitaire Windows), hoàn tác 1 lần là về.',
  ] },
  { id: '20261110-01', date: '10/11/2026', game: 'solitaire', title: 'Theme Ai Cập, chuột phải, báo giải được', items: [
    '🏺 Theme Ai Cập: bộ bài "Ancient Egyptians" và nền "Desert Sands" gốc của KDE KPatience (tác giả Sean Wilson, giấy phép LGPL/GPL – xem themes/ancientegypt).',
    '🖱️ Chuột trái kéo bài, chuột phải đưa hết lá an toàn lên ô A (như Solitaire Windows). Điện thoại: nút ⤴️ Lên đích hoặc chạm 2 ngón.',
    '🧠 Góc trái dưới tự báo ván còn giải được không (✅ / ❌ / 🤔) sau mỗi nước đi – tắt được trong ☰ Thêm.',
  ] },
  { id: '20261109-06', date: '09/11/2026', game: 'bacao', title: 'Game mới: Ba Cào!', items: [
    '👑 Ba Cào 2–8 người: 3 lá tính nút, ba tây (J/Q/K) và sáp (3 lá cùng số) là bài to. Có nhà cái hoặc chơi gà góp chung.',
    '🤏 Nặn bài: kéo lá úp để hé dần cho hồi hộp, hoặc Lật nhanh. Lật bài chung có trống dồn.',
    '🪙 Chip ảo, hết thì xin mẹ. Có bot, chơi online, hướng dẫn có hình.',
  ] },
  { id: '20261109-05', date: '09/11/2026', game: 'camel', title: 'Sửa lỗi không rời ván được', items: [
    '🔧 Nút "Rời ván" (và các nút trong hộp thoại như "Đua ván mới") bấm được lại bình thường.',
  ] },
  { id: '20261109-04', date: '09/11/2026', game: 'typhu', title: 'Đổi luật mặc định', items: [
    '🏗️ Xây nhà kiểu ZingPlay thật (chỉ xây ở ô vừa dừng).',
    '🔨 Tắt đấu giá: không mua thì ô đó vẫn để trống.',
  ] },
  { id: '20261109-03', date: '09/11/2026', game: 'all', title: 'Đổi luật mặc định', items: [
    '🐴 Cờ cá ngựa: đổ đôi / 1+6 lần thứ 3 liên tiếp thì mất lượt.',
    '♠️ Poker: tăng mù sau mỗi 5 ván.',
    '🃏 Xì dách: nhà cái đủ 16 điểm mới được xét bài; người chơi và nhà cái cùng quắc thì hoà.',
  ] },
  { id: '20261109-02', date: '09/11/2026', game: 'tienlen', title: 'Thêm kiểu tới trắng', items: [
    '⚡ Tới trắng thêm kiểu "cả bài không có lá người" (không có J, Q, K nào). Đủ bộ: sảnh rồng, tứ quý heo, 5 đôi thông, 6 đôi (tứ quý tính 2 đôi), đồng màu 13 lá, không lá người, tứ quý 3 ván đầu.',
  ] },
  { id: '20261109-01', date: '09/11/2026', game: 'typhu', title: 'Thắng khi trọn 1 hàng, vé máy bay, bản đồ tự điều khiển', items: [
    '🏆 Luật thắng mới: sở hữu trọn 1 hàng (mọi ô mua được trên 1 cạnh bàn, không thế chấp) là thắng luôn.',
    '🎫 Du lịch từ Bãi đậu xe phải mua vé máy bay 100K (chỉnh được: miễn phí/50K/100K/200K). Không đủ tiền thì chỉ nghỉ.',
    '🗺️ Chế độ bản đồ không còn tự xoay theo lượt: chuột trái kéo để di bản đồ, chuột phải kéo để xoay (điện thoại: 1 ngón di, 2 ngón xoay/thu phóng).',
  ] },
  { id: '20261105-07', date: '05/11/2026', game: 'tienlen', title: 'Tự xếp bài trên tay', items: [
    '✋ Kéo lá sang trái/phải để tự xếp bài (đang chọn nhiều lá thì kéo cả nhóm). Chạm nhẹ vẫn là chọn lá. Nút 🔃 xếp lại tự động. Tải lại trang vẫn giữ cách xếp.',
  ] },
  { id: '20261105-06', date: '05/11/2026', game: 'cangua', title: 'Chốt luật mặc định', items: [
    '📏 Luật mặc định: mỗi lượt đi 1 ngựa; đổ đôi được đi cả hoặc nửa (3+3 đi 3 hay 6), không đôi thì đi đủ tổng; vào chuồng đếm thẳng từ ngoài, không cần dừng ở cửa; không nhảy qua đầu ngựa; chỉ còn 1 nước thì bắt buộc đi; thắng khi 4 ngựa chiếm bậc 3-4-5-6.',
    '🔄 Phòng/ván lưu từ bản cũ tự chuyển về luật mặc định mới ở ván sau.',
  ] },
  { id: '20261105-05', date: '05/11/2026', game: 'all', title: 'Chọn đối thủ ngay trên bàn', items: [
    '🎯 Mèo Nổ, UNO, BANG!, Tam Quốc Sát, Ma Sói: tới lúc chọn người thì ghế chọn được sáng lên có 🎯, chạm thẳng vào ghế là xong – ghế không chọn được mờ đi kèm lý do (hết bài, ngoài tầm…). Có nút ✕ Huỷ, phím Esc.',
  ] },
  { id: '20261105-04', date: '05/11/2026', game: 'meono', title: 'Sửa con dấu ĐÉO! mất dấu', items: [
    '🔧 Con dấu ĐÉO! giữa bàn hiện đủ dấu tiếng Việt (HUỶ!, CỨU LẠI!), vân mực nhẹ hơn cho dễ đọc.',
  ] },
  { id: '20261105-03', date: '05/11/2026', game: 'all', title: 'Nhạc tự bật, hướng dẫn có hình, bộ bài Tây mới', items: [
    '🎵 Nhạc nền tự bật khi chạm vào game (tắt thì máy nhớ). Mỗi game 2–3 bài hợp chất: sảnh, đang chơi, lúc gay cấn – chuyển mượt, đổi tab không mất nhạc. Thêm tiếng tích tắc hết giờ, thắng/thua.',
    '🖼️ Hướng dẫn mọi game có "⚡ Bắt đầu nhanh" và hình minh hoạ cho từng luật (ảnh chụp thật + lá bài/bàn cờ vẽ sẵn).',
    '🃏 Bộ bài Tây vẽ lại đẹp kiểu cổ điển: J/Q/K hai đầu có khung, Át bích hoa văn, 3 kiểu lưng bài – dùng cho Tiến Lên, Cát tê, Xì dách, Poker, Xếp bài.',
  ] },
  { id: '20261105-02', date: '05/11/2026', game: 'solitaire', title: 'Game mới: Xếp bài (Solitaire)!', items: [
    '🃏 Xếp bài Klondike như Windows ngày xưa: rút 1 hoặc 3, điểm Tiêu chuẩn / Vegas (điểm ảo) / không tính.',
    '↶ Hoàn tác không giới hạn, 💡 gợi ý, chạm đúp lên đích, tự xếp nốt – thắng thì bài nảy tưng bừng.',
    '🧠 "Ván này giải được không?" – máy tự giải thử. Có thống kê, số ván để chơi lại đúng ván.',
  ] },
  { id: '20261105-01', date: '05/11/2026', game: 'all', title: 'Bấm link là vào phòng, gợi ý chỉ khi chơi với bot', items: [
    '🔗 Mở link phòng bạn gửi là vào thẳng sảnh (chưa có tên thì hỏi tên 1 lần). Phòng hết hạn thì báo và quay về trang đầu.',
    '🙈 Có từ 2 người thật trong phòng thì tắt gợi ý / xác suất (Mèo Nổ % bom, Lạc Đà % vé, Poker 💡, Tiến Lên 💡 Gợi ý, Tam Quốc Sát thầy đồ, BANG! 🐣, Cờ tỷ phú tính lời lỗ giao dịch). Chơi với bot vẫn dùng được.',
  ] },
  { id: '20261104-18', date: '04/11/2026', game: 'tienlen', title: 'Tên sảnh mới', items: [
    '🃏 Sảnh ghi rõ số lá (vd. "Sảnh 5 lá 6→10"). Sảnh 3-4-5-6 là "3 năm 6 tháng có là chi 💔", sảnh 6-7-8-9 là "Sống bằng tình cảm 🥹".',
  ] },
  { id: '20261104-17', date: '04/11/2026', game: 'tienlen', title: 'Bàn mới, cấm về heo, tự bỏ lượt', items: [
    '🎨 Bàn nỉ viền gỗ, đèn lồng, ghế đối thủ có quạt bài – 3 màu bàn: Nỉ xanh, Đỏ Tết, Gỗ tối (nút 🎨).',
    '🃏 Lá bài bay ra từ chỗ người đánh vào giữa bàn, chặt thì bay từ ghế người chặt.',
    '🐷 Luật mới (mặc định): cấm về bằng heo, tứ quý, đôi thông. Chỉ còn bài cấm là kẹt, chịu bét.',
    '😶 Không có bài đè được thì tự bỏ lượt. Nút Bỏ lượt dời sang trái, xa nút Đánh.',
  ] },
  { id: '20261104-16', date: '04/11/2026', game: 'typhu', title: 'Sửa máy bay, tự bán trả nợ, báo ô đích', items: [
    '✈️ Hết lỗi vàng cả bàn khi du lịch: chạm 1 ô trên bàn để chọn (chỉ ô đó sáng), chạm lại hoặc bấm "Bay tới…" để bay.',
    '⚡ Thiếu tiền trả nợ: nút "Tự bán nhà/thế chấp cho đủ" – bán ít nhất có thể, đủ là dừng, có tóm tắt đã bán gì.',
    '📍 Đổ xúc xắc xong hiện ngay tên ô sẽ tới và đánh dấu ô đích trên bàn.',
  ] },
  { id: '20261104-15', date: '04/11/2026', game: 'cangua', title: 'Luật vào chuồng mới, đôi đi cả/nửa, hiện điểm đến', items: [
    '🏁 Vào chuồng đếm thẳng: cách cửa 2 ô, đổ 3 vào bậc 1, đổ 8 lên luôn bậc 6. Đã vào chuồng thì phải đổ đôi mới lên thêm 1 bậc.',
    '✂️ Đổ đôi được chọn đi cả hoặc nửa (3-3 đi 3 hay 6 đều được).',
    '🎯 Đổ xong hiện ngay điểm đến của từng nước trên bàn (đỏ là đá được ngựa bạn) – chạm điểm đến là đi.',
  ] },
  { id: '20261104-14', date: '04/11/2026', game: 'all', title: 'Ẩn tỉ lệ gợi ý mặc định', items: [
    '🙈 Mèo Nổ (% bom) và Đua Lạc Đà (% về nhất trên vé) giờ mặc định ẩn tỉ lệ cho đỡ "spoil". Muốn xem thì bật lại: Mèo Nổ bấm nút 🎲, Đua Lạc Đà vào ⚙️ Cài đặt.',
  ] },
  { id: '20261104-13', date: '04/11/2026', game: 'cangua', title: 'Đổ đôi lên chuồng', items: [
    '🎲🎲 Đổ đôi thì 1 ngựa ở cửa đích hoặc trên đích được lên thêm 1 bậc, bất kể số – vẫn được đổ tiếp. Tắt được trong sảnh.',
  ] },
  { id: '20261104-12', date: '04/11/2026', game: 'camel', title: 'Game mới: Đua Lạc Đà 3D!', items: [
    '🐪 Lạc đà 3D chồng lên nhau, con dưới đi là cõng cả chồng. Mỗi lượt: lấy vé chặng, đặt thảm ốc đảo/ảo ảnh, lắc kim tự tháp, hoặc cược kín con về nhất/bét.',
    '🤪 Lạc đà xỉn đen/trắng chạy ngược phá đám (tắt được). Vé hiện % về nhất chặng cho dễ chơi.',
    '🪙 Chơi bằng xu ảo, ai giàu nhất thắng. Có bot, chơi online, thả emoji.',
  ] },
  { id: '20261104-11', date: '04/11/2026', game: 'typhu', title: 'Đất thế chấp thành đất trống', items: [
    '🏦 Đất đang thế chấp giờ coi như ô trống: ai dừng ở đó cũng mua được với giá gốc, chủ cũ mất đất. Muốn giữ thì nhớ chuộc sớm!',
    '↩️ Bỏ luật cũ "mua lại đất thế chấp giá gấp đôi".',
  ] },
  { id: '20261104-10', date: '04/11/2026', game: 'cangua', title: 'Game mới: Cờ cá ngựa 3D!', items: [
    '🐴 Cờ cá ngựa 3D 2–4 người: 2 xúc xắc, đổ đôi hoặc 1+6 mới xuất chuồng và được đổ tiếp.',
    '💥 Đứng đúng ô ngựa bạn là đá bay về chuồng. Không nhảy qua đầu, lên đích bậc 3-4-5-6 là thắng.',
    '⚙️ Nhiều luật nhà chỉnh trong sảnh (1 hay 2 xúc xắc, dồn tổng hay tách, kiểu lên đích…), bot 3 mức.',
  ] },
  { id: '20261104-09', date: '04/11/2026', game: 'catte', title: 'Thuật ngữ chuẩn: tùng', items: [
    '📚 Dùng đúng thuật ngữ "tùng": ăn vòng = ăn tùng, chưa có tùng nào là sắp chết ☠️. Hướng dẫn có thêm mục Thuật ngữ (tùng, tranh tùng, úp/thiệp, chưng, xổ, tới, vàng tùng).',
  ] },
  { id: '20261104-08', date: '04/11/2026', game: 'catte', title: 'Game mới: Cát tê!', items: [
    '🂡 Cát tê 2–6 người: 6 lá, 6 vòng – đè cùng chất lớn hơn hoặc úp bỏ. Hết vòng 4 chưa ăn vòng nào là chết ☠️.',
    '🔥 Vòng 5 chưng bài, vòng 6 lật – ai ăn vòng cuối là tới, hốt nồi. Tới trắng: tứ quý, 6 lá đồng chất, 6 lá dưới 6.',
    '🧧 Chip ảo, hết thì xin mẹ. Luật thưởng & kiểu vòng 5 chỉnh trong sảnh.',
  ] },
  { id: '20261104-07', date: '04/11/2026', game: 'tienlen', title: 'Game mới: Tiến Lên miền Nam!', items: [
    '🐷 Tiến Lên miền Nam 2–4 người: lẻ, đôi, sám, sảnh, đôi thông, tứ quý – chặt heo, chặt chồng, tới trắng, thối heo, cóng.',
    '💡 Chạm 1 lá là gợi ý bộ đánh được, có nút Gợi ý và nút 🔪 Chặt! sáng lên khi chặt được.',
    '🤖 Bot 3 cấp: Gà mờ / Vừa / Cao thủ. Chip ảo, hết thì xin mẹ.',
  ] },
  { id: '20261104-06', date: '04/11/2026', game: 'poker', title: 'Game mới: Poker!', items: [
    '♠️ Texas Hold\'em không giới hạn 2–9 người: mù, tố đúng luật, tất tay, pot phụ, chia pot khi hoà.',
    '💡 Gợi ý cho người mới: hiện tên bài đang có và tô 5 lá tạo bài. Lật bài đọc tên tiếng Việt (Cù lũ, Thùng, Sảnh…).',
    '🤖 Bot biết đoán bài và thỉnh thoảng bịp. Chế độ Chơi vui (xin mẹ thêm chip) hoặc Giải đấu (hết chip là loại).',
  ] },
  { id: '20261104-05', date: '04/11/2026', game: 'xidach', title: 'Game mới: Xì dách!', items: [
    '🃏 Xì dách kiểu Việt 2–8 người: đặt chip, rút/dằn, xì bàn, xì dách, ngũ linh, quắc – nhà cái tự chọn xét bài từng người.',
    '👑 Cái xoay vòng, cố định, bot làm cái hoặc ai xì dách thì làm cái. Hệ số, điểm dằn, lá A chỉnh được trong sảnh.',
    '🥺 Hết chip thì "Xin mẹ thêm chip". Chỉ chơi vui bằng chip ảo.',
  ] },
  { id: '20261104-04', date: '04/11/2026', game: 'bang', title: 'Né một chạm, xem lại lượt, mẹo người mới, thả emoji', items: [
    '🛡️ Bị bắn mà có Missed! (hoặc BANG! khi bị Indians/Duel): hiện sẵn nút xanh "Dùng Missed!" – bấm một phát là né, hoặc "Chịu đòn".',
    '⏪ Nút "Lượt vừa rồi": tóm tắt ai bắn ai, né hay trúng, ai Panic! ai… kèm bảng "Ai tấn công ai" cả ván để đoán vai.',
    '🎨 Mỗi người một màu, nhật ký và dòng tin giữa bàn tô tên theo màu cho dễ theo dõi.',
    '🐣 Chế độ Người mới: mẹo theo vai và tình huống ngay trên bàn, hỏi lại nếu Phó định bắn sếp. Tắt được ở phòng chờ hoặc ⚙️.',
    '😂 Thả emoji, chọc nhau ("Né đi cưng!", "Uống Beer đi"…), bot cũng biết chọc lại.',
    '🤖 Bot khôn hơn: nhớ ai đã bắn ai, Phó không bắn sếp, tỉ lệ thắng các phe cân hơn.',
  ] },
  { id: '20261104-03', date: '04/11/2026', game: 'tamquoc', title: 'Lá nhỏ hiện đủ hình', items: [
    '🖼️ Lá bài nhỏ trong bảng xem người chơi (trang bị & phán định) giờ hiện đủ hình, không còn bị tên dài che mất.',
  ] },
  { id: '20261104-02', date: '04/11/2026', game: 'all', title: 'Nút chính là vào phòng online', items: [
    '🌐 Màn hình đầu của UNO, Cờ tỷ phú, Mèo Nổ, Tam Quốc Sát, Ma Sói: "Tạo phòng online" và ô nhập mã phòng lên đầu, "Chơi với bot" xuống dưới.',
  ] },
  { id: '20261104-01', date: '04/11/2026', game: 'typhu', title: 'Giữ để đổ xúc xắc, lăn giữa màn hình, hết giật pháo hoa', items: [
    '🎲 Nút đổ xúc xắc to ở giữa màn hình: giữ để lấy đà (vòng lực chạy), thả ra là đổ – kiểu ZingPlay. Bấm nhanh cũng được.',
    '🎯 Xúc xắc lăn ngay giữa màn hình, hiện tổng điểm, đổ đôi có chữ ĐÔI!',
    '🎆 Pháo hoa / hoa giấy không còn làm tụt FPS (dùng lại đèn, ít mảnh hơn trên điện thoại).',
  ] },
  { id: '20261103-17', date: '03/11/2026', game: 'typhu', title: 'Bãi đậu xe = Du lịch, chữ ô góc gọn gàng', items: [
    '✈️ Dừng ở Bãi đậu xe được chọn 1 ô bất kỳ (trừ Vào tù) để bay tới ngay – bấm ô sáng trên bàn hoặc nút 🗺️ Chọn ô. Bay ngược qua Bắt đầu vẫn nhận 200K. Tắt được trong sảnh.',
    '🚔 Sửa chữ ô Nhà tù, Vào tù, Bắt đầu bị cắt/tràn ra ngoài.',
  ] },
  { id: '20261103-16', date: '03/11/2026', game: 'typhu', title: 'Mua lại đất đang thế chấp', items: [
    '💥 Dừng ở đường của người khác đang thế chấp vẫn được mua lại (giá gấp đôi). Ngân hàng trừ khoản chuộc, chủ cũ nhận phần còn lại, mình nhận đất sạch nợ.',
  ] },
  { id: '20261103-15', date: '03/11/2026', game: 'uno', title: 'Lá Up phạt theo độ dài chuỗi', items: [
    '⬆️ Gãy chuỗi Up giờ phải rút đúng số lá số đã được đánh từ lúc lá Up ra (ít nhất 1) – chuỗi càng dài càng đau.',
  ] },
  { id: '20261103-14', date: '03/11/2026', game: 'uno', title: 'Bão Tố đúng màu & nhạc không tắt', items: [
    '🌀 Hình xoáy trên lá Bão Tố giờ cùng màu lá bài.',
    '🎵 Chuyển tab/ra màn hình chính rồi quay lại, nhạc nền tự bật lại.',
  ] },
  { id: '20261103-13', date: '03/11/2026', game: 'uno', title: 'Chuỗi cộng dồn & bốc thử', items: [
    '➕ Chuỗi cộng dồn giữ nguyên mũi tên "ai dồn cho ai" trên màn hình tới khi có người chịu phạt.',
    '🎲 Bị dồn mà không có lá chồng: bốc thử 1 lá – trúng lá cộng, Khiên hoặc No U là đánh chồng tiếp ngay (+? không tính).',
  ] },
  { id: '20261103-12', date: '03/11/2026', game: 'typhu', title: 'Chỉ dẫn, ZingPlay thật, giao dịch thông minh', items: [
    '🧭 Lần đầu vào ván có chỉ dẫn từng bước (xem lại trong ⚙️).',
    '🏗️ Luật mới "ZingPlay thật": đứng lên đất mình là hỏi luôn "Xây mấy nhà?".',
    '🤝 Giao dịch hiện tổng giá trị mỗi bên và cảnh báo kèo giúp đối thủ gom bộ hay sắp thắng.',
    '📣 Thẻ tóm tắt lượt vừa rồi của người khác, bấm để xem chi tiết.',
    '😂 Thả emoji, chọc nhau ("Trả tiền thuê đi!", "Vô tù chơi"…), bot cũng biết chọc lại.',
    '📱 Xoay ngang điện thoại gọn hơn; sửa lỗi chọn kiểu xây nhà trong sảnh không ăn.',
  ] },
  { id: '20261103-11', date: '03/11/2026', game: 'scribble', title: 'Thả emoji, gõ câu chọc tự do', items: [
    '😂 Thả emoji / chọc nhau ngay trong ván: câu dựng sẵn hoặc gõ tự do (≤ 40 ký tự), câu nào lộ đáp án thì tự chặn.',
  ] },
  { id: '20261103-10', date: '03/11/2026', game: 'meono', title: 'Thả emoji, chọc nhau', items: [
    '😂 Thả emoji và chọc nhau kiểu mèo ngay trong ván ("Bốc đi bé!", "ĐÉO nhé!", "Bom đâu rồi?"…), bot thỉnh thoảng cũng chọc lại.',
  ] },
  { id: '20261103-9', date: '03/11/2026', game: 'masoi', title: 'Thả emoji, chọc nhau', items: [
    '😂 Thả emoji / chọc nhau ("Sói là mày!", "Oan quá trời"…) lúc trời sáng – ban đêm nút ẩn cho khỏi lộ ai đang thức, hồn ma thì chỉ hồn ma thấy.',
  ] },
  { id: '20261103-8', date: '03/11/2026', game: 'uno', title: 'Thấy rõ ai chơi ai, thả emoji, tính điểm', items: [
    '🎯 Móc túi, tặng quà, nhắm +4, No U dội ngược… có mũi tên bay từ người làm tới người bị, kèm dòng chữ ngắn.',
    '😂 Nút thả emoji và câu chọc ("Ăn +4 đi cưng", "Cứu tui"…), cả bàn đều thấy; bot cũng biết chọc lại.',
    '🏆 Tuỳ chọn "Tính điểm tới 200/300/500": chơi nhiều ván, bảng điểm sau mỗi ván, ai cán mốc trước là vô địch.',
    '💡 Lần đầu gặp lá mở rộng hiện gợi ý "Lá này làm gì?"; bấm giữ lá bất kỳ để xem mô tả.',
    '📱 Điện thoại: chữ trên lá to hơn, bài to hơn trên máy màn cao, giữa bàn hiện dòng "vừa xảy ra".',
  ] },
  { id: '20261103-7', date: '03/11/2026', game: 'masoi', title: 'Xem lại cả ván, ván tập & vai mới', items: [
    '🎞️ Xem lại cả ván: hết ván lộ hết vai, xem từng đêm/ngày ai cắn ai, ai soi ai, ai bầu ai; chủ phòng chiếu cho cả hội cùng xem.',
    '🎓 Ván tập cho người mới: chơi với 5 bot, máy giải thích từng bước bằng bong bóng; đồng hồ dừng lúc đọc.',
    '⏩ Chủ phòng có nút Bầu sớm; bot tự bấm Sẵn sàng sau vài giây, ván với bot nhanh hơn hẳn.',
    '3 vai vui mới: 🃏 Kẻ Trộm (đêm 1 tráo vai với 1 trong 2 lá thừa), 🕯️ Bà Đồng (gọi hồn người chết hỏi phe), 👓 Ông Già Lẩm Cẩm (tưởng mình là Tiên Tri, soi toàn bốc đại).',
    '💾 Lưu bộ vai + luật của hội (vd. "Bộ hội GET A JOB"), lần sau chạm 1 cái là chọn lại.',
    'Sửa: biểu tượng chỉ điểm hiện được trên máy cũ; tên ở sảnh không còn bị cắt mất 👑.',
  ] },
  { id: '20261103-6', date: '03/11/2026', game: 'meono', title: 'Lá nào cũng có mèo 🐱', items: [
    'Vẽ lại cả 15 lá: mỗi lá là 1 chú mèo làm đúng việc của lá (ôm bom, cắt dây, chỉ tay đổ vỏ, đeo kính đen né gắt, bói cầu, vẫy đũa…).',
    'ĐÉO! đóng dấu mộc to giữa bàn kèm tiếng "cộp" và mèo rít; ĐÉO! chồng ĐÉO! thì dấu chồng lên nhau (đỏ = bị huỷ, xanh = được cứu lại).',
    'Bốc trúng Mèo Nổ: mèo trên lá mang màu của người bốc – còn Gỡ Bom thì hú hồn, hết Gỡ Bom thì khóc.',
    'Cuối ván có huy hiệu vui (👑 Vua ĐÉO, 💣 Nam châm hút bom, 🎒 Chuyên gia gánh vỏ…) và bảng số liệu từng người.',
    'Chủ phòng bật được bộ bài 🌀 Hỗn loạn: gấp đôi Đổ Vỏ và Móc Đáy, nhiều ĐÉO! và Xào Bài hơn, thêm 1 Gỡ Bom.',
  ] },
  { id: '20261103-5', date: '03/11/2026', game: 'scribble', title: 'Chiếu album tự động & tải cả album', items: [
    '⏯️ Album tự lật sau 3/5/8 giây (hoặc tắt); chủ phòng Tạm dừng / Chạy tiếp, cả phòng thấy cùng lúc.',
    '⬇️ "Tải cả album": gộp mọi chuỗi thành 1 GIF có tên người + câu/đoán, hoặc quay video MP4/WebM, có thanh tiến trình.',
    '🎉 Đông vui chia nhóm (~6 người/nhóm), chiếu lần lượt "Nhóm 2/5", chủ phòng bỏ qua nhóm được.',
    '🎞️ Hoạt hình / Phông nền chọn được 4–16 khung, Một mình 3–12 khung, chỉnh tốc độ phim mặc định trong sảnh.',
    '🛠️ Nút bấm hết rung khi rê chuột, bấm "Xong" không còn hụt.',
  ] },
  { id: '20261103-4', date: '03/11/2026', game: 'all', title: 'Rà soát toàn bộ 7 game', items: [
    'UNO: sửa lỗi ô "Lá mở rộng" không bật được – giờ Luật rừng có sẵn No U, Khiên, +?, Tặng quà, Móc túi, Đổi tay, Bão tố, Up…',
    'UNO: đồng hồ chống treo máy (40 giây mỗi lượt, 20 giây khi bốc phạt), gợi ý đúng khi người khác đang chọn mục tiêu.',
    'BANG!: gọn hơn trên điện thoại nhỏ và khi xoay ngang, thông báo không che bài lúc cần né.',
    'Cờ Tỷ Phú: sửa lỗi bán nhà có thể làm đứng ván; nút "🏠 Xây nhà" và "Xây tại đây" dễ thấy; nhà của người khác không còn chặn thế chấp/giao dịch đất của mình.',
    'Ma Sói: chơi được khi xoay ngang, mặt sau lá vai ghi "VAI BÍ MẬT", thông báo không chồng nhau.',
    'Tam Quốc Sát: chữ trên lá bài trên điện thoại to hơn, tên gọn dễ đọc, màn ngang chơi được.',
    'Mèo Nổ: thiết kế lại mặt lá (mỗi loại 1 màu + chữ tắt góc trái), bấm giữ xem chi tiết, thêm tên gốc tiếng Anh.',
    'Scribble it!: thêm 12 kiểu chơi kiểu Gartic Phone – Tốc chiến, Nhìn trộm, Bánh mì kẹp, Vẽ mù, Vẽ tiếp, Phá băng, Hoạt hình, Phông nền, Một mình, Chấm điểm, Đông vui, Tuỳ chỉnh.',
    'Trang chủ: chữ không còn đè lên hình.',
  ] },
  { id: '20261103-3', date: '03/11/2026', game: 'tamquoc', title: 'Tranh đúng người, đúng lá', items: [
    'Trương Phi: tranh Kuniyoshi cảnh cầu Trường Bản; Ngụy Diên: tranh kinh kịch cuối Thanh – đồ lại nét mực trắng đen cho đồng bộ.',
    'Lá Đào là quả đào (Mẫn Trinh, 1788); lá Hỏa Sát là trận Xích Bích. Nguồn: The Met, Cleveland Museum of Art (CC0).',
  ] },
  { id: '20261103-2', date: '03/11/2026', game: 'tamquoc', title: 'Bản cổ trang + mở rộng Quân Tranh', items: [
    'Thêm lá Rượu 🍶 (Sát kế tiếp +1 sát thương, tự cứu khi hấp hối).',
    'Bản mở rộng Quân Tranh (bật trong sảnh): Hỏa Sát, Lôi Sát, Hỏa công, Thiết tác liên hoàn, Binh lương, Đằng giáp, Bạch ngân sư tử, Chu tước vũ phiến, Cổ đĩnh đao, ngựa Hoa lưu + 13 võ tướng mới.',
    'Giao diện cổ trang: nền thuỷ mặc, bàn sơn mài, cuộn lụa, ấn son; 60 tranh cổ phạm vi công cộng; binh khí vẽ đúng hình dạng (Thanh Long Đao lưỡi bản to gắn thẳng đầu cán).',
  ] },
  { id: '20261103-1', date: '03/11/2026', game: 'all', title: 'Kết nối ổn định hơn', items: [
    'Rớt mạng thoáng qua là tự vào lại trong ~1 giây; im lặng 8 giây thì tự nối lại; chủ phòng chập mạng thì phòng tự mở lại.',
  ] },
  { id: '20261102-9', date: '02/11/2026', game: 'masoi', title: 'Ra mắt Ma Sói 🐺', items: [
    '12 vai (Sói, Sói Trùm, Sói con, Tiên tri, Bảo vệ, Phù thuỷ, Thợ săn, Cupid, Già làng, Kẻ ngốc, Thằng Chán Đời, Dân làng), máy làm quản trò.',
    'Chat riêng cho Sói, kênh hồn ma cho người chết, giữ tay để xem vai, rung khi tới lượt.',
  ] },
  { id: '20261102-8', date: '02/11/2026', game: 'tamquoc', title: 'Ra mắt Tam Quốc Sát ⚔️', items: [
    '25 võ tướng 4 nước, vai trò ẩn Chúa công/Trung thần/Phản tặc/Nội gián, đủ cẩm nang và trang bị, bot, chơi online.',
  ] },
  { id: '20261102-7', date: '02/11/2026', game: 'meono', title: 'Ra mắt Mèo Nổ 💣', items: [
    'Bốc bài né bom, Gỡ Bom rồi nhét lại cho đứa khác, lá chặn ĐÉO! có 3 giây để hô.',
    'Giao diện quán mèo, nổ kiểu truyện tranh, mèo linh vật, tiếng mèo; sửa lỗi máy khách bị tụt lại khi rớt mạng.',
  ] },
  { id: '20261102-6', date: '02/11/2026', game: 'scribble', title: 'Ra mắt Scribble it! 🎨', items: [
    'Đoán hình (kiểu skribbl) và Tam sao thất bản (kiểu Gartic Phone); kho 552 từ tiếng Việt + chủ đề Tướng Liên Minh (173 tướng).',
    'Giao diện sổ vẽ nguệch ngoạc, tiếng bút chì, nhạc marimba.',
  ] },
  { id: '20261102-5', date: '02/11/2026', game: 'typhu', title: 'Cờ Tỷ Phú 40 ô 3D 🏙️', items: [
    'Bàn 3D 40 ô đường Sài Gòn (gần nhà hội bạn + trung tâm Q1), landmark thành phố, camera bám quân.',
    'Quân cờ là nhân vật tự tạo (có cả sừng 😈 và đồ hầu gái), xúc xắc 3D, thẻ Cơ hội/Khí vận do anh Minto đặt tên.',
    'Luật cổ điển + ZingPlay: đấu giá, giao dịch, thế chấp, mua lại đất, Landmark; thắng bằng 3 nhóm màu hoặc 4 bến xe. Xây nhà không cần đủ bộ màu (mặc định).',
  ] },
  { id: '20261102-4', date: '02/11/2026', game: 'uno', title: 'UNO Luật rừng bá đạo', items: [
    'Lá mới: No U, Khiên, +?, Tặng quà, Móc túi, Đổi tay; +2 và +4 chồng lẫn nhau thoải mái.',
    'Bị phạt thì tự bốc từng lá, mỗi lá cách 1 giây 😈; Cấm lượt đổi tên thành Khoá mõm; 3 chủ đề màu.',
  ] },
  { id: '20261102-3', date: '02/11/2026', game: 'all', title: 'Vào phòng dễ hơn', items: [
    'Kết nối chính qua Firebase (mạng nào cũng qua), dự phòng P2P và MQTT; tải lại trang là tự vào lại ván.',
  ] },
  { id: '20261102-2', date: '02/11/2026', game: 'bang', title: 'BANG! chống treo máy', items: [
    'Đồng hồ lượt, tự chịu đòn khi không có lá né, nhạc đổi theo diễn biến, tên lá giữ tiếng Anh gốc, Beer dùng được khi còn 2 người.',
  ] },
  { id: '20261102-1', date: '02/11/2026', game: 'all', title: 'BGVN ra đời', items: [
    'Trang chọn game; BANG! chuyển vào /bang/; thêm UNO (Cổ điển, Luật rừng, No Mercy).',
  ] },
  { id: '20261031-1', date: '31/10/2026', game: 'bang', title: 'Ra mắt BANG! Việt hoá 🤠', items: [
    'Chơi BANG! online với bạn bè, tranh minh hoạ phạm vi công cộng, hướng dẫn theo luật chính thức.',
  ] },
];
export const latestId = game => (NOTES.find(n => !game || n.game === game || n.game === 'all') || {}).id || '';
