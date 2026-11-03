// Hướng dẫn luật Mèo Nổ (tiếng Việt)
import { cardHTML } from './cards.js?v=6';
import { CARD } from './engine.js?v=6';
const row = items => `<div class="cards-row">${items.map(([t, txt]) => `<div>${cardHTML({ t }, 'sm')}<span><b>${CARD[t].name}</b> <i class="en">(${CARD[t].en})</i>: ${txt}</span></div>`).join('')}</div>`;

export function openGuide(openModal) {
  const tabs = {
    basic: ['💣 Cơ bản', () => `
      <h3>Số người</h3><p><b>2–8 người</b>, thiếu người thì thêm bot (bot cũng biết ĐÉO! và gài bom đấy 😼).</p>
      <h3>Mục tiêu</h3><p>Là <b>con mèo cuối cùng còn sống</b>. Trong chồng bài có <b>số người − 1</b> lá <b>Mèo Nổ</b>. Ai bốc trúng mà không gỡ được là <b>BÙM</b> – bị loại.</p>
      <h3>Chia bài</h3><p>Mỗi người có <b>1 Gỡ Bom + 7 lá</b>. Phần còn lại trộn chung với Mèo Nổ (và vài Gỡ Bom dư) thành chồng bài. Bộ bài tự co giãn theo số người cho ván không quá dài.</p>
      <h3>Lượt của bạn</h3><ol>
        <li>Đánh <b>bao nhiêu lá chức năng tuỳ thích</b> (hoặc không đánh gì). Bấm lá để chọn, rồi bấm nút <b>Đánh</b>.</li>
        <li>Kết thúc lượt bằng cách <b>BỐC 1 lá</b> từ chồng bài (bấm chồng bài hoặc nút <b>Bốc bài</b>).</li></ol>
      <p>Một số lá cho bạn kết thúc lượt mà <b>khỏi bốc</b>: Đổ Vỏ, Né Gắt. Móc Đáy thì bốc lá dưới cùng.</p>
      <h3>Bốc trúng Mèo Nổ 💣</h3><ul>
        <li>Có <b>Gỡ Bom</b>: tự động dùng nó, rồi bạn <b>bí mật chọn chỗ nhét bom lại</b> bằng thanh trượt từ <b>trên cùng</b> (người kế bốc ngay 😈) tới <b>dưới cùng</b>. Không ai khác biết bạn nhét ở đâu.</li>
        <li>Không có: <b>nổ tung</b>, bị loại, bài trên tay bỏ hết.</li></ul>
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
        ['nope', 'huỷ hành động vừa đánh (xem tab ĐÉO!).'],
      ])}
      <h3>Mèo thường (5 loại)</h3>${row([['cat1', 'không có tác dụng riêng.'], ['cat2', 'đánh đôi / bộ ba.'], ['cat3', 'đánh đôi / bộ ba.'], ['cat4', 'đánh đôi / bộ ba.'], ['cat5', 'đánh đôi / bộ ba.']])}
      <p>🐾 Mèo thường có dấu <b>🐾×2</b> ở góc phải: chỉ có tác dụng khi <b>đánh theo cặp</b> (đôi / bộ ba cùng loại). Tên tiếng Anh trong ngoặc là tên lá tương ứng ở game gốc <i>Exploding Kittens</i> (chỉ để tham chiếu).</p>
      <p>💡 <b>Bấm giữ</b> (điện thoại) hoặc <b>chuột phải</b> vào lá trên tay để xem lá to và tác dụng; bấm chồng bỏ để xem lá vừa đánh.</p>
      <p>Chủ phòng có thể tắt <b>Cải Mệnh</b> và <b>Móc Đáy</b> trong sảnh để chơi bản cơ bản.</p>`],
    combo: ['🙅 Combo & ĐÉO!', () => `
      <h3>Combo mèo</h3><ul>
        <li><b>ĐÔI</b> (2 mèo cùng loại): chọn 1 người, <b>rút ngẫu nhiên</b> 1 lá trên tay họ.</li>
        <li><b>BỘ BA</b> (3 mèo cùng loại): chọn 1 người và <b>gọi tên 1 lá</b> (vd. Gỡ Bom). Họ có thì phải đưa, không có thì hụt.</li></ul>
      <p>Mẹo bấm: chạm 1 lá mèo là hiện nút <b>Đánh đôi</b> / <b>Bộ ba</b> nếu bạn có đủ.</p>
      <h3>ĐÉO! 🙅</h3><ul>
        <li>Sau <b>mỗi hành động</b> (lá chức năng hoặc combo), có <b>~3 giây</b> để mọi người phản ứng – thanh đếm ngược hiện cho cả bàn.</li>
        <li>Ai cầm lá <b>ĐÉO!</b> sẽ thấy nút <b>ĐÉO!</b> to đỏ. Bấm là huỷ hành động đó (lá đã đánh vẫn mất).</li>
        <li>Có người ĐÉO! thì cửa sổ <b>mở lại từ đầu</b>: người khác có thể ĐÉO! cái ĐÉO! đó để hành động có hiệu lực trở lại. Cứ thế chồng tiếp – số ĐÉO! lẻ là bị huỷ, chẵn là được.</li>
        <li>Không ĐÉO! được <b>Mèo Nổ</b> và <b>Gỡ Bom</b>. Cũng không thể ĐÉO! việc bốc bài.</li>
        <li>ĐÉO! chỉ đánh được trong cửa sổ này, kể cả khi chưa tới lượt bạn. Bot cũng biết ĐÉO! đấy 😼</li></ul>`],
    tips: ['💡 Mẹo', () => `<ul>
      <li>Thanh <b>💣 nguy cơ</b> giữa bàn cho biết còn bao nhiêu bom trong bao nhiêu lá, và xác suất lá kế là bom. Tắt/bật bằng nút 🎲 trên thanh công cụ.</li>
      <li>Vừa Soi Kèo thấy bom trên cùng? Đánh <b>Đổ Vỏ / Né Gắt / Xào Bài / Móc Đáy</b> để thoát.</li>
      <li>Gỡ bom xong nhét ngay <b>trên cùng</b> để người kế "ăn" – nhất là khi họ không còn Gỡ Bom.</li>
      <li>Hết Gỡ Bom thì gom mèo để đánh <b>bộ ba gọi tên Gỡ Bom</b>.</li>
      <li>Giữ <b>ĐÉO!</b> cho lúc bị Đổ Vỏ hoặc bị đòi Gỡ Bom.</li>
      <li>Con <b>mèo canh bài</b> giữa hộp ngủ khò khi yên bình, dỏng tai khi tới lượt bạn và xù lông khi bom sắp nổ – nhìn nó là biết tình hình 😼. Chạm vào để vuốt ve.</li>
      <li>Nhạc nền (🎵) <b>căng dần</b> khi tỉ lệ bom tăng. Bấm 📜 xem nhật ký, ⚡ chỉnh tốc độ hiệu ứng.</li></ul>`],
  };
  const draw = k => {
    openModal(`<button class="close-x" onclick="__closeModal()" aria-label="Đóng">✕</button><h2>📖 Cách chơi Mèo Nổ</h2><div class="guide"><div class="tabs">${Object.entries(tabs).map(([id, [t]]) => `<button class="chip ${id === k ? 'on' : ''}" data-tab="${id}">${t}</button>`).join('')}</div>${tabs[k][1]()}</div>`, 'wide');
    document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => draw(b.dataset.tab));
  };
  draw('basic');
}
