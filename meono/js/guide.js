// Hướng dẫn luật Mèo Nổ (tiếng Việt)
import { cardHTML } from './cards.js?v=8';
import { CARD } from './engine.js?v=8';
import { gp } from '../../shared/ui/guidepics.js?v=1';
import { GI, GV } from './guide-img.js?v=1';
const row = items => `<div class="cards-row">${items.map(([t, txt]) => `<div>${cardHTML({ t }, 'sm')}<span><b>${CARD[t].name}</b> <i class="en">(${CARD[t].en})</i>: ${txt}</span></div>`).join('')}</div>`;

export function openGuide(openModal) {
  const P = gp(GI, GV);
  const tabs = {
    basic: ['💣 Cơ bản', () => `
      ${P.quick([
        ['q-home', 'Trang chủ Mèo Nổ: ô tên, nút Chơi với bot, Tạo phòng online', '① Nhập tên → ② <b>Chơi với bot</b>, hoặc ③ <b>Tạo phòng online</b> rồi gửi mã cho hội bạn.'],
        ['q-lobby', 'Phòng chờ: danh sách người chơi, nút Thêm bot, nút Bắt đầu', '① Thêm bot (2–8 người) → ② <b>Bắt đầu</b>.'],
        ['turn', 'Lượt của bạn: chồng bài, chọn lá Né Gắt, nút Bốc bài và Đánh Né Gắt', 'Chạm ② lá chức năng → ③ <b>Đánh</b> (đánh bao nhiêu lá cũng được). Xong lượt thì ① <b>bốc 1 lá</b> từ chồng bài. ④ là chồng bỏ.'],
        ['bomb', 'Bốc trúng Mèo Nổ nhưng có Gỡ Bom: thanh trượt chọn chỗ nhét bom', 'Trúng bom mà có Gỡ Bom: ① kéo chọn chỗ nhét bom lại (bí mật) → ② <b>Gỡ bom & nhét lại</b>.'],
      ])}
      <h3>Số người</h3><p><b>2–8 người</b>, thiếu người thì thêm bot (bot cũng biết HUỶ KÈO! và gài bom đấy 😼).</p>
      <h3>Mục tiêu</h3><p>Là <b>con mèo cuối cùng còn sống</b>. Trong chồng bài có <b>số người − 1</b> lá <b>Mèo Nổ</b>. Ai bốc trúng mà không gỡ được là <b>BÙM</b> – bị loại.</p>
      <h3>Chia bài</h3><p>Mỗi người có <b>1 Gỡ Bom + 7 lá</b>. Phần còn lại trộn chung với Mèo Nổ (và vài Gỡ Bom dư) thành chồng bài. Bộ bài tự co giãn theo số người cho ván không quá dài.</p>
      <h3>Lượt của bạn</h3><ol>
        <li>Đánh <b>bao nhiêu lá chức năng tuỳ thích</b> (hoặc không đánh gì). Bấm lá để chọn, rồi bấm nút <b>Đánh</b>.</li>
        <li>Kết thúc lượt bằng cách <b>BỐC 1 lá</b> từ chồng bài (bấm chồng bài hoặc nút <b>Bốc bài</b>).</li></ol>
      <p>Một số lá cho bạn kết thúc lượt mà <b>khỏi bốc</b>: Đổ Vỏ, Né Gắt. Móc Đáy thì bốc lá dưới cùng.</p>
      <h3>Bốc trúng Mèo Nổ 💣</h3>${row([['bomb', 'không gỡ được là bị loại.'], ['defuse', 'tự dùng khi bốc trúng bom.']])}<ul>
        <li>Có <b>Gỡ Bom</b>: tự động dùng nó, rồi bạn <b>bí mật chọn chỗ nhét bom lại</b> bằng thanh trượt từ <b>trên cùng</b> (người kế bốc ngay 😈) tới <b>dưới cùng</b>. Không ai khác biết bạn nhét ở đâu.</li>
        <li>Không có: <b>nổ tung</b>, bị loại, bài trên tay bỏ hết.</li></ul>
      ${P.fig('bomb', 'Hộp thoại chọn chỗ nhét bom lại chồng bài', 'Kéo thanh hoặc bấm nhanh: Trên cùng · Thứ 2 · Ngẫu nhiên · Dưới cùng.')}
      <h3>Đồng hồ</h3><p>Mỗi lượt có <b>đồng hồ</b> (mặc định 45 giây, chủ phòng chỉnh được). Hết giờ máy <b>tự bốc giùm</b>. Chọn chỗ nhét bom / chọn lá cho người khác có 25 giây. Ai rớt mạng thì bot tạm đánh thay.</p>`],
    cards: ['🃏 Các lá', () => `
      ${row([['bomb', 'bốc trúng mà không gỡ được là bị loại. Không đánh ra được.'], ['defuse', 'chỉ dùng khi bốc trúng Mèo Nổ. Gỡ xong nhét bom lại chồng bài, chỗ nào tuỳ bạn.']])}
      <h3>Lá chức năng</h3>${row([
        ['attack', 'kết thúc lượt <b>không cần bốc</b>; người kế phải đi <b>2 lượt</b> liền. Đang gánh nhiều lượt mà đánh Đổ Vỏ thì số lượt còn lại <b>dồn hết + 2</b> cho người sau.'],
        ['skip', 'kết thúc <b>1 lượt</b> mà khỏi bốc. Đang gánh 2 lượt thì Né Gắt chỉ xoá 1 lượt.'],
        ['shuffle', 'xáo trộn chồng bài. Ai đã soi kèo thì coi như mất thông tin.'],
        ['future', 'lén xem 3 lá trên cùng (lá trái nhất là lá sẽ bốc tiếp).'],
        ['alter', 'xem 3 lá trên cùng và <b>xếp lại theo ý bạn</b>.'],
        ['favor', 'chọn 1 người, <b>họ tự chọn</b> 1 lá trên tay để đưa cho bạn.'],
        ['bottom', 'bốc lá <b>dưới cùng</b> thay vì trên cùng – kết thúc lượt. Dưới đáy cũng có thể có bom đó!'],
        ['nope', 'huỷ hành động vừa đánh (xem tab HUỶ KÈO!).'],
      ])}
      <h3>Mèo thường (5 loại)</h3>${row([['cat1', 'mèo cam béo tròn, mắt híp. Không có tác dụng riêng.'], ['cat2', 'mèo xám sọc vằn, mắt xanh lá.'], ['cat3', 'mèo trắng – cam – đen đeo chuông vàng.'], ['cat4', 'mèo kem mặt nâu, mắt xanh dương, dáng kiêu.'], ['cat5', 'mèo lông xù như cục bông, đeo nơ hồng.']])}
      <p>🐾 Mèo thường có dấu <b>🐾×2</b> ở góc phải: chỉ có tác dụng khi <b>đánh theo cặp</b> (đôi / bộ ba cùng loại). Tên tiếng Anh trong ngoặc là tên lá tương ứng ở game gốc <i>Exploding Kittens</i> (chỉ để tham chiếu).</p>
      <p>💡 <b>Bấm giữ</b> (điện thoại) hoặc <b>chuột phải</b> vào lá trên tay để xem lá to và tác dụng; bấm chồng bỏ để xem lá vừa đánh.</p>
      <p>Chủ phòng có thể tắt <b>Cải Mệnh</b> và <b>Móc Đáy</b> trong sảnh để chơi bản cơ bản.</p>
      <p>🐱 Lá nào cũng có 1 chú mèo đang làm đúng việc của lá: Mèo Nổ ôm bom, Gỡ Bom đeo kính cầm kéo, Đổ Vỏ chỉ tay sang con khác, Né Gắt đeo kính đen lướt né… Nhìn hình là nhớ tác dụng. Khi ai đó bốc trúng Mèo Nổ, chú mèo trên lá mang <b>màu lông của người bốc</b>: còn Gỡ Bom thì mèo <b>hú hồn</b> 😮‍💨, hết Gỡ Bom thì mèo <b>khóc</b> 😭.</p>`],
    combo: ['🙅 Combo & HUỶ KÈO!', () => `
      <h3>Combo mèo</h3><ul>
        <li><b>ĐÔI</b> (2 mèo cùng loại): chọn 1 người, <b>rút ngẫu nhiên</b> 1 lá trên tay họ.</li>
        <li><b>BỘ BA</b> (3 mèo cùng loại): chọn 1 người và <b>gọi tên 1 lá</b> (vd. Gỡ Bom). Họ có thì phải đưa, không có thì hụt.</li></ul>
      ${row([['cat2', 'đủ 2 lá cùng loại → <b>Đánh đôi</b>.']])}
      ${P.fig('pair', 'Chạm lá Mèo Mướp, nút Đánh đôi hiện ra', 'Chạm 1 lá mèo là hiện nút <b>🐾 Đánh đôi</b> / <b>Bộ ba</b> nếu bạn có đủ.')}
      <h3>HUỶ KÈO! 🙅</h3>${P.fig('nope', 'Xôi vừa đánh Đổ Vỏ, thanh đếm ngược và nút HUỶ KÈO! màu đỏ', '① Xôi vừa đánh Đổ Vỏ → ② thanh đếm ngược ~3 giây, ai có lá HUỶ KÈO! thấy nút đỏ để huỷ.')}<ul>
        <li>Sau <b>mỗi hành động</b> (lá chức năng hoặc combo), có <b>~3 giây</b> để mọi người phản ứng – thanh đếm ngược hiện cho cả bàn.</li>
        <li>Ai cầm lá <b>HUỶ KÈO!</b> sẽ thấy nút <b>HUỶ KÈO!</b> to đỏ. Bấm là huỷ hành động đó (lá đã đánh vẫn mất).</li>
        <li>Có người HUỶ KÈO! thì cửa sổ <b>mở lại từ đầu</b>: người khác có thể HUỶ KÈO! cái HUỶ KÈO! đó để hành động có hiệu lực trở lại. Cứ thế chồng tiếp – số HUỶ KÈO! lẻ là bị huỷ, chẵn là được.</li>
        <li>Không HUỶ KÈO! được <b>Mèo Nổ</b> và <b>Gỡ Bom</b>. Cũng không thể HUỶ KÈO! việc bốc bài.</li>
        <li>HUỶ KÈO! chỉ đánh được trong cửa sổ này, kể cả khi chưa tới lượt bạn. Bot cũng biết HUỶ KÈO! đấy 😼</li>
        <li>Mỗi lần HUỶ KÈO!, một <b>con dấu mộc to</b> đóng "cộp" giữa bàn cho cả phòng thấy (kèm tiếng mèo rít). HUỶ KÈO! chồng HUỶ KÈO! thì dấu chồng lên nhau, lệch góc: dấu <b>đỏ "HUỶ!"</b> là hành động đang bị huỷ, dấu <b>xanh "cứu lại!"</b> là được hiệu lực trở lại.</li></ul>`],
    modes: ['🌀 Chế độ', () => `
      <h3>🌀 Bộ bài Hỗn loạn</h3><p>Chủ phòng bật trong sảnh. So với bộ thường:</p>${row([['attack', 'gấp đôi số lá.'], ['nope', 'nhiều gần gấp đôi.']])}<ul>
        <li><b>Gấp đôi Đổ Vỏ</b> và <b>Móc Đáy</b> (Móc Đáy chỉ có khi bật Cải Mệnh & Móc Đáy), <b>HUỶ KÈO! ×1.8</b>, <b>Xào Bài ×1.6</b>.</li>
        <li>Bớt mèo thường (×0.75) và bớt Né Gắt, Soi Kèo, Xin Vía (×0.8) để ván không dài ra.</li>
        <li><b>Thêm 1 Gỡ Bom</b> trong chồng bài, vì Đổ Vỏ dồn lượt liên tục nên ai cũng phải bốc nhiều hơn. Số Mèo Nổ vẫn là số người − 1.</li></ul>
      <p>Hợp với hội thích chơi xấu nhau: Đổ Vỏ qua lại, HUỶ KÈO! chồng HUỶ KÈO! liên tục 😈</p>
      <h3>🏅 Huy hiệu cuối ván</h3><p>Hết ván, bảng kết quả trao huy hiệu vui theo số liệu cả ván, ví dụ:</p><ul>
        <li>👑 <b>Vua Huỷ Kèo</b> – HUỶ KÈO! người khác nhiều nhất · 🙊 <b>Bị HUỶ KÈO! sấp mặt</b> – bị HUỶ KÈO! nhiều nhất</li>
        <li>💣 <b>Nam châm hút bom</b> – bốc trúng nhiều Mèo Nổ nhất · ✂️ <b>Thợ gỡ bom</b> – gỡ bom từ 2 lần</li>
        <li>🎒 <b>Chuyên gia gánh vỏ</b> – bị Đổ Vỏ nhiều nhất · 🫵 <b>Trùm đổ vỏ</b> – đổ vỏ người khác nhiều nhất</li>
        <li>🃏 <b>Thánh bốc bài</b> · 🥷 <b>Siêu trộm</b> · 😿 <b>Bị móc túi</b> · 🔮 <b>Nhà tiên tri</b> · 🏃 <b>Né như né người yêu cũ</b></li>
        <li>💥 <b>Ra đi đầu tiên</b> – người nổ sớm nhất · 🧘 <b>Né bom thần sầu</b> – thắng mà chưa từng bốc trúng bom</li></ul>
      <p>Bằng điểm thì cùng nhận. Kèm bảng số liệu từng người: số lá đã bốc, số lần trúng bom (gỡ được mấy lần), số lần HUỶ KÈO! và bị Đổ Vỏ.</p>`],
    tips: ['💡 Mẹo', () => `<ul>
      <li>Thanh <b>💣 nguy cơ</b> giữa bàn cho biết còn bao nhiêu bom trong bao nhiêu lá. <b>Xác suất</b> lá kế là bom <b>mặc định ẩn</b>, chỉ bật được khi <b>chơi với bot</b> (phòng có người thật thì khoá cho công bằng): bấm nút 🎲 trên thanh công cụ.
        ${P.fig('prob', 'Nút xúc xắc trên thanh công cụ và thanh nguy cơ hiện 3 bom trên 28 lá, 11 phần trăm', '① Nút 🎲 → ② thanh nguy cơ hiện thêm % bom.')}</li>
      <li>Vừa Soi Kèo thấy bom trên cùng? Đánh <b>Đổ Vỏ / Né Gắt / Xào Bài / Móc Đáy</b> để thoát.</li>
      <li>Gỡ bom xong nhét ngay <b>trên cùng</b> để người kế "ăn" – nhất là khi họ không còn Gỡ Bom.</li>
      <li>Hết Gỡ Bom thì gom mèo để đánh <b>bộ ba gọi tên Gỡ Bom</b>.</li>
      <li>Giữ <b>HUỶ KÈO!</b> cho lúc bị Đổ Vỏ hoặc bị đòi Gỡ Bom.</li>
      <li>Con <b>mèo canh bài</b> giữa hộp ngủ khò khi yên bình, dỏng tai khi tới lượt bạn và xù lông khi bom sắp nổ – nhìn nó là biết tình hình 😼. Chạm vào để vuốt ve.</li>
      <li>Nhạc nền (🎵) <b>căng dần</b> khi tỉ lệ bom tăng. Bấm 📜 xem nhật ký, ⚡ chỉnh tốc độ hiệu ứng.</li></ul>`],
  };
  const draw = k => {
    openModal(`<button class="close-x" onclick="__closeModal()" aria-label="Đóng">✕</button><h2>📖 Cách chơi Mèo Nổ</h2><div class="guide"><div class="tabs">${Object.entries(tabs).map(([id, [t]]) => `<button class="chip ${id === k ? 'on' : ''}" data-tab="${id}">${t}</button>`).join('')}</div>${tabs[k][1]()}</div>`, 'wide');
    document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => draw(b.dataset.tab));
  };
  draw('basic');
}
