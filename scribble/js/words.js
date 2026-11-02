// Kho từ tiếng Việt chia chủ đề. Mỗi chủ đề là 1 chuỗi, các từ cách nhau bằng "|".
const RAW = {
  dovat: ['🧸 Đồ vật', `cái ô|đồng hồ|kính mắt|điện thoại|máy tính xách tay|bàn phím|chuột máy tính|tai nghe|cái ghế|cái bàn|cái giường|cái gối|cái chăn|quạt máy|máy lạnh|tủ lạnh|nồi cơm điện|ấm đun nước|cái chảo|đôi đũa|cái muỗng|cái nĩa|cái chén|cái ly|chai nước|bàn chải đánh răng|kem đánh răng|khăn tắm|cái gương|cây lược|cây kéo|cây bút|quyển vở|cục tẩy|thước kẻ|cặp sách|ba lô|ví tiền|chìa khoá|ổ khoá|bóng đèn|cây nến|đèn pin|cục pin|sạc dự phòng|tivi|điều khiển tivi|máy ảnh|đàn guitar|đàn piano|cái trống|micro|cái loa|nón lá|mũ bảo hiểm|giày thể thao|dép tổ ong|áo thun|quần jean|cà vạt|đồng hồ báo thức|cái thang|cây chổi|cái xô|móc quần áo|bàn ủi|máy giặt|thùng rác|hộp quà|bong bóng|con diều|con quay|xúc xắc|bộ bài|ống hút|lồng đèn|chiếc nhẫn|vương miện|kính lúp|nam châm|cái búa|cây đinh|tay nắm cửa|cái thớt|bình hoa`],
  convat: ['🐱 Con vật', `con mèo|con chó|con gà|con vịt|con heo|con bò|con trâu|con dê|con ngựa|con thỏ|con chuột|con khỉ|con voi|con hổ|sư tử|con gấu|gấu trúc|con cáo|chó sói|hươu cao cổ|ngựa vằn|hà mã|tê giác|lạc đà|chuột túi|gấu koala|chim cánh cụt|con cú|đại bàng|con vẹt|chim bồ câu|con công|hồng hạc|con cá|cá mập|cá voi|cá heo|bạch tuộc|con mực|con cua|con tôm|ốc sên|con sứa|sao biển|con rùa|cá sấu|con rắn|thằn lằn|con ếch|con bướm|con ong|con kiến|con nhện|con muỗi|con gián|chuồn chuồn|bọ rùa|con sâu|con dơi|con nhím|con sóc|khủng long|kỳ lân|con rồng|con tắc kè|cá vàng|con hải cẩu|chim sẻ`],
  monan: ['🍜 Món ăn Việt', `phở|bánh mì|cơm tấm|bún bò Huế|bún chả|bún riêu|hủ tiếu|mì Quảng|cao lầu|bánh xèo|bánh khọt|gỏi cuốn|chả giò|bánh cuốn|bánh bèo|bánh chưng|bánh tét|bánh trung thu|bánh flan|chè ba màu|xôi gà|xôi xéo|cháo lòng|cơm chiên|cơm gà|gà rán|lẩu thái|lẩu mắm|ốc luộc|hột vịt lộn|bánh tráng trộn|bánh tráng nướng|bò bía|cá viên chiên|trứng chiên|canh chua|cá kho tộ|thịt kho trứng|rau muống xào tỏi|nem nướng|bò lá lốt|bánh bao|bánh da lợn|bánh pía|sữa đậu nành|trà sữa trân châu|cà phê sữa đá|nước mía|sinh tố bơ|trà đá|kem que|dưa hấu|sầu riêng|xoài|chôm chôm|măng cụt|mít|thanh long|mì gói|mắm tôm|nước mắm|bánh căn|bột chiên|phá lấu|bún mắm|bánh canh cua|chuối nướng|bắp xào`],
  saigon: ['🏙️ Địa danh Sài Gòn', `chợ Bến Thành|Nhà thờ Đức Bà|Bưu điện Thành phố|Dinh Độc Lập|phố đi bộ Nguyễn Huệ|Landmark 81|tòa nhà Bitexco|cầu Ánh Sao|phố Bùi Viện|Chợ Lớn|Thảo Cầm Viên|Suối Tiên|Đầm Sen|Hồ Con Rùa|công viên Tao Đàn|Nhà hát Thành phố|cầu Thủ Thiêm|cầu Sài Gòn|sông Sài Gòn|bến Bạch Đằng|đường sách Nguyễn Văn Bình|chợ Bình Tây|địa đạo Củ Chi|rừng Sác Cần Giờ|sân bay Tân Sơn Nhất|ga Sài Gòn|tàu metro số 1|chung cư 42 Nguyễn Huệ|chợ hoa Hồ Thị Kỷ|phố Tây|kênh Nhiêu Lộc|chùa Bà Thiên Hậu|cầu Mống|công viên Lê Văn Tám|bảo tàng Chứng tích Chiến tranh|Phú Mỹ Hưng|bến xe Miền Đông|nhà thờ Tân Định|chợ Tân Định|bến Nhà Rồng|công viên Gia Định|Thủ Đức`],
  nghe: ['👩‍🍳 Nghề nghiệp', `bác sĩ|y tá|giáo viên|công an|lính cứu hoả|đầu bếp|thợ cắt tóc|thợ điện|thợ sửa xe|kỹ sư|lập trình viên|ca sĩ|diễn viên|hoạ sĩ|nhiếp ảnh gia|phi công|tiếp viên hàng không|tài xế|shipper|xe ôm công nghệ|nông dân|ngư dân|nha sĩ|dược sĩ|luật sư|thẩm phán|phóng viên|MC|streamer|YouTuber|ảo thuật gia|chú hề|vận động viên|cầu thủ|bảo vệ|lao công|thợ xây|kiến trúc sư|nhà khoa học|phi hành gia|bán vé số|barista|DJ|người mẫu|thám tử|hướng dẫn viên du lịch|bán hàng online|cứu hộ bãi biển|thợ lặn|bưu tá`],
  hanhdong: ['🏃 Hành động', `ngủ|ngáp|chạy bộ|nhảy dây|bơi|đạp xe|leo núi|nấu ăn|rửa chén|quét nhà|tắm|đánh răng|gội đầu|hát karaoke|nhảy múa|khóc|cười|hắt xì|ăn cơm|uống nước|đọc sách|viết thư|vẽ tranh|chụp ảnh|tự sướng|gọi điện|nhắn tin|lướt TikTok|chơi game|câu cá|trồng cây|tưới cây|xếp hàng|đá bóng|ném bóng|bắn cung|trượt patin|lái xe|kéo co|vỗ tay|ôm|hôn gió|thả tim|đấm|cõng|ngồi thiền|tập gym|hít đất|nhảy dù|lướt sóng|cắm trại|nướng thịt|thổi nến|mở quà|đi chợ|trốn tìm|ngủ gật|đánh nhau|té ngã|phơi đồ`],
  genz: ['😎 Meme Gen Z', `red flag|green flag|crush|thả thính|sống ảo|ăn hành|quay xe|cháy túi|toang|hết nước chấm|gáy|lụm|mlem mlem|báo thủ|chúa hề|flex|chill|slay|ét o ét|khum|u là trời|vô tri|tới công chuyện|đu trend|hóng drama|cà khịa|check-in|cơm chó|FA|bùng kèo|thao túng tâm lý|tấu hài|over hợp|xu cà na|đỉnh nóc kịch trần|ra dẻ|trầm cảm|người yêu cũ|bóc phốt|hệ tư tưởng|cú đêm|tâm linh`],
  hoiban: ['🫂 Hội bạn', `GET A JOB|đi lính|cắm sừng|khoá mõm|thất nghiệp|gánh team|feed|lag|Discord|ngủ nướng|hết tiền|ăn mì gói|deadline|chạy KPI|cày rank|AFK|bỏ bom|lên đồ|TOEIC 990|trễ hẹn|tăng ca|ngồi quán net|xin việc|phỏng vấn|lương tháng|đi nhậu|cà phê bệt|trà chanh chém gió`],
  thethao: ['⚽ Thể thao & trò chơi', `bóng đá|bóng rổ|cầu lông|bóng bàn|quần vợt|đá cầu|cờ vua|cờ tướng|võ thuật|quyền anh|yoga|bowling|đánh golf|trượt tuyết|đua xe|bi-a|ván trượt|nhảy cao|cử tạ|đấu kiếm|ô ăn quan|nhảy lò cò|thả diều|bịt mắt bắt dê|bóng chuyền|huy chương vàng|cúp vô địch|trọng tài|thủ môn|sút phạt đền`],
  thiennhien: ['🌈 Thiên nhiên', `mặt trời|mặt trăng|ngôi sao|cầu vồng|đám mây|cơn mưa|sấm sét|tuyết|lốc xoáy|núi lửa|ngọn núi|thác nước|dòng sông|bãi biển|hòn đảo|sa mạc|khu rừng|cây dừa|hoa sen|hoa mai|hoa đào|hoa hướng dương|xương rồng|cây nấm|chiếc lá|hang động|sao băng|trái đất|hành tinh|ruộng bậc thang|người tuyết|sóng thần`],
  xecoc: ['🛵 Xe cộ', `xe máy|xe đạp|ô tô|xe buýt|xe tải|xe cứu thương|xe cứu hoả|xe cảnh sát|tàu hoả|máy bay|trực thăng|tên lửa|tàu thuỷ|thuyền thúng|xích lô|xe ba gác|xe lăn|khinh khí cầu|tàu ngầm|xe tăng|máy cày|đĩa bay|xe đạp điện|xe kem|cáp treo`],
  // Toàn bộ 173 tướng Liên Minh Huyền Thoại (tên tiếng Anh như trong game, tới Locke – 2026). Chỉ dùng chữ, không dùng hình.
  lol: ['🎮 Tướng Liên Minh', `Aatrox|Ahri|Akali|Akshan|Alistar|Ambessa|Amumu|Anivia|Annie|Aphelios|Ashe|Aurelion Sol|Aurora|Azir|Bard|Bel'Veth|Blitzcrank|Brand|Braum|Briar|Caitlyn|Camille|Cassiopeia|Cho'Gath|Corki|Darius|Diana|Dr. Mundo|Draven|Ekko|Elise|Evelynn|Ezreal|Fiddlesticks|Fiora|Fizz|Galio|Gangplank|Garen|Gnar|Gragas|Graves|Gwen|Hecarim|Heimerdinger|Hwei|Illaoi|Irelia|Ivern|Janna|Jarvan IV|Jax|Jayce|Jhin|Jinx|K'Sante|Kai'Sa|Kalista|Karma|Karthus|Kassadin|Katarina|Kayle|Kayn|Kennen|Kha'Zix|Kindred|Kled|Kog'Maw|LeBlanc|Lee Sin|Leona|Lillia|Lissandra|Locke|Lucian|Lulu|Lux|Malphite|Malzahar|Maokai|Master Yi|Mel|Milio|Miss Fortune|Mordekaiser|Morgana|Naafiri|Nami|Nasus|Nautilus|Neeko|Nidalee|Nilah|Nocturne|Nunu & Willump|Olaf|Orianna|Ornn|Pantheon|Poppy|Pyke|Qiyana|Quinn|Rakan|Rammus|Rek'Sai|Rell|Renata Glasc|Renekton|Rengar|Riven|Rumble|Ryze|Samira|Sejuani|Senna|Seraphine|Sett|Shaco|Shen|Shyvana|Singed|Sion|Sivir|Skarner|Smolder|Sona|Soraka|Swain|Sylas|Syndra|Tahm Kench|Taliyah|Talon|Taric|Teemo|Thresh|Tristana|Trundle|Tryndamere|Twisted Fate|Twitch|Udyr|Urgot|Varus|Vayne|Veigar|Vel'Koz|Vex|Vi|Viego|Viktor|Vladimir|Volibear|Warwick|Wukong|Xayah|Xerath|Xin Zhao|Yasuo|Yone|Yorick|Yunara|Yuumi|Zaahen|Zac|Zed|Zeri|Ziggs|Zilean|Zoe|Zyra`],
  lehoi: ['🧧 Lễ hội', `Tết|lì xì|pháo hoa|mâm ngũ quả|cây nêu|múa lân|Trung thu|đèn ông sao|Giáng sinh|ông già Noel|cây thông Noel|Halloween|quả bí ngô|sinh nhật|đám cưới|Valentine|câu đối đỏ|chợ hoa Tết|đua thuyền|cá chép hoá rồng|bánh kem|thiệp mời`],
};
export const CATS = Object.fromEntries(Object.entries(RAW).map(([k, [name, s]]) => [k, { name, words: s.split('|').map(w => w.trim().normalize('NFC')).filter(Boolean) }]));
export const CAT_KEYS = Object.keys(CATS);
// Tướng LMHT là tên tiếng Anh nên không bật sẵn – chủ phòng tự chọn khi cả hội cùng chơi LMHT
export const DEFAULT_CATS = CAT_KEYS.filter(k => k !== 'lol');
export const totalWords = () => new Set(CAT_KEYS.flatMap(k => CATS[k].words.map(w => w.toLowerCase()))).size;

// Từ riêng: mỗi dòng 1 từ, tối đa 40 ký tự, tối đa 500 từ
export function parseCustom(text) {
  const arr = Array.isArray(text) ? text : String(text || '').split(/\r?\n|,/);
  const seen = new Set(), out = [];
  for (let w of arr) { w = String(w).normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 40); if (w && !seen.has(w.toLowerCase())) { seen.add(w.toLowerCase()); out.push(w); } if (out.length >= 500) break; }
  return out;
}
// Danh sách từ để chọn (không trùng, bỏ qua hoa thường)
export function buildPool(opts) {
  const custom = parseCustom(opts.custom || []);
  const list = opts.onlyCustom && custom.length >= 3 ? custom : [...(opts.cats || DEFAULT_CATS).filter(k => CATS[k]).flatMap(k => CATS[k].words), ...custom];
  const seen = new Set(), out = [];
  for (const w of list.length >= 3 ? list : CATS.dovat.words) { const k = w.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(w); } }
  return out;
}
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
// Câu gợi ý vui cho Tam sao thất bản: "<ai đó> đang <làm gì> ở <đâu>"
export function randomPrompt(r = Math.random) {
  const who = r() < 0.5 ? pick(CATS.convat.words, r) : pick(CATS.nghe.words, r);
  const what = pick(CATS.hanhdong.words, r);
  const where = r() < 0.6 ? 'ở ' + pick(CATS.saigon.words, r) : r() < 0.5 ? 'trên ' + pick(CATS.xecoc.words, r) : 'cùng ' + pick(CATS.monan.words, r);
  const s = `${who} đang ${what} ${where}`;
  return s[0].toUpperCase() + s.slice(1);
}
