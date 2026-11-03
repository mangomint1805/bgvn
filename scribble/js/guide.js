import { GMODES, GMODE_KEYS } from './engine.js?v=7';
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
        <li>Cuối ván <b>chiếu lại</b> từng chuỗi – xem câu chuyện “tam sao thất bản” tới đâu, thả 😂🔥💀 thoải mái.</li>
        <li><b>Chiếu tự động:</b> mặc định mỗi bước tự sang sau <b>5 giây</b> (bước cuối mỗi chuỗi dừng gấp đôi). Chủ phòng chọn <b>3 / 5 / 8 giây</b> hoặc <b>Tắt</b> (bấm <b>Tiếp ▶</b> bằng tay) ngay trong sảnh hoặc lúc đang chiếu, bấm <b>⏸️ Tạm dừng</b> / <b>▶ Chạy tiếp</b> khi cả bọn còn đang cười – mọi người thấy cùng lúc, đồng hồ góc trên đếm ngược tới bước sau.</li>
        <li><b>⬇️ Tải cả album</b> (cuối ván): gộp mọi chuỗi thành <b>1 GIF động</b> – mỗi bước một khung có tên người và câu/đoán, chuỗi hoạt hình thì chạy thành phim. Chọn mỗi bước hiện 1,5 / 2,5 / 4 giây. Trình duyệt hỗ trợ thì quay thêm được <b>video WebM/MP4</b> (quay theo thời gian thật – giữ tab mở tới khi xong), hoặc lưu <b>ảnh ghép PNG</b>. Có thanh tiến trình và nút Huỷ.</li>
      </ol>
      <h4>Các kiểu chơi (chủ phòng chọn trong sảnh)</h4>
      <ul class="gm-list">${GMODE_KEYS.map(k => `<li><b>${GMODES[k].icon} ${GMODES[k].name}:</b> ${GMODES[k].desc}</li>`).join('')}</ul>
      <ul>
        <li>🎞️ Kiểu <b>Hoạt hình / Phông nền / Một mình</b>: chủ phòng chọn <b>số khung</b> trong sảnh (Hoạt hình/Phông nền: <i>Tự động</i> = theo số người, tối thiểu 6, hoặc 4–16 khung – nhiều khung hơn số người thì có người vẽ 2 lần; Một mình: 3–12 khung, mặc định 5) và <b>tốc độ phim mặc định</b> (1–12 khung/giây). Chiếu lại xong mỗi chuỗi thành phim lặp – ai cũng kéo thanh <b>Tốc độ</b> lại được, bấm <b>⬇ GIF</b> hoặc <b>⬇ Ảnh ghép</b> để lưu.</li>
        <li>🏆 Kiểu <b>Chấm điểm</b>: +100 cho mỗi 👍 vào bước của bạn; chuỗi mà câu cuối khớp câu đầu (hoặc bước nào cũng được 👍 nhiều hơn 👎) thì ai góp mặt cũng +200. Không tự chấm mình được.</li>
        <li>🖍️ Kiểu <b>Vẽ tiếp</b>: nét của người trước là nền – tẩy bị khoá, nút 🗑️ chỉ xoá nét của bạn.</li>
        <li>🎉 Phòng thường tối đa <b>12 người</b>; muốn đông tới <b>30 người</b> thì chọn <b>Đông vui</b>: cả phòng được chia thành <b>nhóm</b> khoảng 6 người (chủ phòng chỉnh 4–8 người/nhóm; nhóm nào cũng ≥ 4 người), chuỗi chỉ chuyền trong nhóm. Lúc chiếu lại xem lần lượt từng nhóm (góc trên ghi <b>Nhóm 2/5</b>), chủ phòng bấm <b>⏭️ Bỏ qua nhóm</b> để sang nhóm sau; album cuối ván có nút chọn nhóm.</li>
        <li><b>Một mình</b>: bấm “🧑‍🎨 Hoạt hình 1 mình” ở trang chủ, chọn số khung, thời gian mỗi khung và tốc độ phim rồi vẽ – không cần mạng.</li>
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
        <li>😂 <b>Thả emoji / chọc nhau</b>: nút 😂 trên thanh trên (trong ván online) – 8 emoji, câu chọc dựng sẵn (“Vẽ gì zậy trời”, “Picasso đây rồi”…) hoặc <b>gõ tự do</b> tối đa 40 ký tự, hiện bong bóng cạnh tên bạn. Chống lộ bài: ở Đoán hình, hoạ sĩ và người đã đoán ra không gửi được câu có đáp án (kể cả gần đúng); người chưa đoán gõ trúng thì tính luôn là đoán; ở Tam sao thất bản đang chơi thì không được lộ câu của chuỗi mình đang làm.</li>
        <li>Lỡ tải lại trang? Cứ mở lại, máy tự vào lại đúng phòng. Hoạ sĩ rớt mạng quá 8 giây thì bị bỏ lượt.</li>
        <li>Chỉ có một mình? Bấm <b>“✏️ Vẽ thử”</b> để luyện tay, hoặc <b>“🧑‍🎨 Hoạt hình 1 mình”</b> để vẽ một đoạn phim 3–12 khung (không cần mạng).</li>
      </ul>
    </section>
  </div>`;
}
