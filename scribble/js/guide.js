import { GMODES, GMODE_KEYS } from './engine.js?v=4';
// Hướng dẫn luật Scribble it!
export function guideHTML() {
  return `
  <h2>📖 Cách chơi Scribble it!</h2>
  <div class="guide">
    <section>
      <h3>🎨 Đoán hình</h3>
      <ol>
        <li>Mỗi lượt có <b>1 hoạ sĩ</b>. Hoạ sĩ chọn 1 trong <b>3 từ</b> (15 giây không chọn là máy chọn hộ).</li>
        <li>Hoạ sĩ vẽ trong thời gian chủ phòng đặt (mặc định 80 giây). <b>Không được viết chữ</b> lên tranh nha 😤</li>
        <li>Mọi người gõ đáp án vào khung chat. Không cần dấu, không cần viết hoa: <i>“banh mi”</i> = <i>“Bánh mì”</i>. Bỏ chữ “con/cái/cây…” ở đầu cũng được: <i>“mèo”</i> = <i>“con mèo”</i>.</li>
        <li>Hội mê LMHT? Chủ phòng bật chủ đề <b>🎮 Tướng Liên Minh</b> (đủ 173 tướng, tên tiếng Anh như trong game). Dấu cách, chấm, nháy, “&amp;” bỏ qua hết: <i>“leesin”</i>, <i>“kaisa”</i>, <i>“chogath”</i>, <i>“drmundo”</i> đều đúng.</li>
        <li>Sai đúng 1 ký tự thì bạn (và chỉ bạn) thấy <b>“Gần đúng rồi! 🔥”</b>.</li>
        <li>Phía trên có ô gợi ý <b>_ _ _ _&nbsp;&nbsp;_ _</b> cho biết số chữ mỗi từ, càng về cuối càng lộ thêm chữ.</li>
        <li>Đoán ra rồi thì chat vẫn được, nhưng chỉ hoạ sĩ và những người đã đoán ra mới đọc được 🤫.</li>
        <li>Lượt kết thúc khi hết giờ hoặc tất cả đã đoán ra. Mỗi vòng ai cũng được vẽ 1 lần.</li>
      </ol>
      <h4>Tính điểm</h4>
      <ul>
        <li>Người đoán: <b>100 – 500 điểm</b>, đoán càng nhanh càng nhiều.</li>
        <li>Hoạ sĩ: tối đa <b>300 điểm</b>, chia theo tỉ lệ số người đoán ra.</li>
      </ul>
    </section>
    <section>
      <h3>📞 Tam sao thất bản</h3>
      <ol>
        <li>Mỗi người <b>viết 1 câu</b> (bí ý tưởng thì bấm 🎲).</li>
        <li>Câu được chuyền cho người kế để <b>vẽ lại</b>.</li>
        <li>Người sau nữa chỉ thấy tranh, phải <b>đoán thành câu</b>… cứ thế xoay vòng.</li>
        <li>Mỗi bước có đồng hồ, hết giờ là tự nộp những gì đang có.</li>
        <li>Cuối ván chủ phòng bấm <b>Tiếp ▶</b> để chiếu lại từng chuỗi – xem câu chuyện “tam sao thất bản” tới đâu, thả 😂🔥💀 thoải mái.</li>
        <li>Bấm <b>⬇ Tải album</b> để lưu ảnh ghép cả ván về máy.</li>
      </ol>
      <h4>Các kiểu chơi (chủ phòng chọn trong sảnh)</h4>
      <ul class="gm-list">${GMODE_KEYS.map(k => `<li><b>${GMODES[k].icon} ${GMODES[k].name}:</b> ${GMODES[k].desc}</li>`).join('')}</ul>
      <ul>
        <li>🎞️ Kiểu <b>Hoạt hình / Phông nền / Một mình</b>: chiếu lại xong mỗi chuỗi thành phim lặp – kéo thanh <b>Tốc độ</b>, bấm <b>⬇ GIF</b> hoặc <b>⬇ Ảnh ghép</b> để lưu.</li>
        <li>🏆 Kiểu <b>Chấm điểm</b>: +100 cho mỗi 👍 vào bước của bạn; chuỗi mà câu cuối khớp câu đầu (hoặc bước nào cũng được 👍 nhiều hơn 👎) thì ai góp mặt cũng +200. Không tự chấm mình được.</li>
        <li>🖍️ Kiểu <b>Vẽ tiếp</b>: nét của người trước là nền – tẩy bị khoá, nút 🗑️ chỉ xoá nét của bạn.</li>
        <li>🎉 Phòng thường tối đa <b>12 người</b>; muốn đông tới <b>30 người</b> thì chọn <b>Đông vui</b>. <b>Một mình</b> thì bấm “🧑‍🎨 Hoạt hình 1 mình” ở trang chủ, không cần mạng.</li>
      </ul>
    </section>
    <section>
      <h3>🖌️ Bảng vẽ</h3>
      <ul>
        <li>20 màu, 5 cỡ nét, <b>tẩy</b>, <b>đổ màu</b> (bấm vào vùng kín), <b>hoàn tác</b>, <b>xoá hết</b>.</li>
        <li>Máy tính: <kbd>B</kbd> bút, <kbd>E</kbd> tẩy, <kbd>F</kbd> đổ màu, <kbd>Ctrl</kbd>+<kbd>Z</kbd> hoàn tác.</li>
        <li>Điện thoại: vẽ thẳng bằng ngón tay, trang sẽ không cuộn khi đang vẽ.</li>
      </ul>
    </section>
    <section>
      <h3>🌐 Chơi online</h3>
      <ul>
        <li>Cần ít nhất <b>2 người</b>. Một người tạo phòng, gửi mã 5 ký tự (hoặc link mời) cho hội bạn.</li>
        <li>Chế độ Đoán hình cho phép vào giữa ván – vào là thấy lại toàn bộ tranh đang vẽ.</li>
        <li>Lỡ tải lại trang? Cứ mở lại, máy tự vào lại đúng phòng. Hoạ sĩ rớt mạng quá 8 giây thì bị bỏ lượt.</li>
        <li>Chỉ có một mình? Bấm <b>“✏️ Vẽ thử”</b> để luyện tay, hoặc <b>“🧑‍🎨 Hoạt hình 1 mình”</b> để vẽ một đoạn phim 5 khung (không cần mạng).</li>
      </ul>
    </section>
  </div>`;
}
