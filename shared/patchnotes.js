// Patch notes BGVN – mới nhất ở trên. game: 'all' | 'bang' | 'uno' | 'typhu' | 'scribble' | 'meono' | 'tamquoc' | 'masoi'
// Thêm bản mới: chèn object lên ĐẦU mảng, id tăng dần theo thời gian (YYYYMMDD-n).
export const GAMES = {
  all: '🎲 BGVN', bang: '🤠 BANG!', uno: '🃏 UNO', typhu: '🏙️ Cờ Tỷ Phú', scribble: '🎨 Scribble it!',
  meono: '💣 Mèo Nổ', tamquoc: '⚔️ Tam Quốc Sát', masoi: '🐺 Ma Sói',
};
export const NOTES = [
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
