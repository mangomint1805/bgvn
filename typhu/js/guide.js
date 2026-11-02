import { SALARY, ISLAND_FEE } from './board.js';
export function openGuide(openModal) {
  openModal(`<button class="close-x" onclick="__closeModal()">✕</button><h2 style="text-align:center">📖 Cách chơi Cờ Tỷ Phú</h2><div class="guide">
  <h3>🎯 Mục tiêu</h3><ul><li>Làm mọi người <b>phá sản</b>, hoặc thắng ngay khi <b>độc quyền</b>:
    <ul><li>đủ <b>3 nhóm màu</b>, hoặc</li><li>cả <b>4 điểm du lịch</b> (Chợ Bến Thành, Thảo Cầm Viên, Bến Nhà Rồng, Cần Giờ), hoặc</li><li>toàn bộ đất trên <b>1 dãy phố</b> (1 cạnh bàn cờ).</li></ul></li>
    <li>Nếu chủ phòng đặt giới hạn vòng: hết vòng ai nhiều tài sản nhất thắng.</li></ul>
  <h3>🎲 Lượt chơi</h3><ul><li>Bấm <b>Đổ xúc xắc</b>, quân cờ đi theo tổng 2 xúc xắc.</li><li>Đổ <b>đôi</b> được đi thêm lượt; đôi 3 lần liền thì bị đưa ra Côn Đảo.</li><li>Đi qua <b>Khởi hành</b> nhận lương ${SALARY}K.</li></ul>
  <h3>🏠 Đất & nhà</h3><ul><li>Dừng ở đường chưa có chủ: được <b>mua đất</b> và xây luôn tới 3 nhà.</li><li>Dừng lại ở đất của mình: xây thêm nhà; đủ 3 nhà thì xây được <b>🏛️ Landmark</b> (thuê cực cao, không ai mua lại được).</li>
    <li>Dừng ở đất người khác: trả <b>tiền thuê</b>. Sau đó nếu chưa có Landmark, bạn được <b>mua lại</b> với giá gấp đôi giá trị.</li><li>Đủ cả nhóm màu thì tiền thuê ×1,5. Bấm vào ô bất kỳ để xem bảng giá.</li></ul>
  <h3>⭐ Ô đặc biệt</h3><ul><li>🏝️ <b>Côn Đảo</b>: bị giam tối đa 3 lượt. Đổ ra đôi để thoát, hoặc trả ${ISLAND_FEE}K.</li><li>🎉 <b>Lễ hội</b>: chọn 1 đất của bạn, tiền thuê ở đó ×2.</li>
    <li>✈️ <b>Tân Sơn Nhất</b>: lượt sau được bay tới ô bất kỳ.</li><li>❓ <b>Cơ hội</b>: rút thẻ may rủi. 💸 <b>Thuế</b>: đóng 10% tài sản.</li><li>🏖️ <b>Điểm du lịch</b>: không xây nhà, có càng nhiều điểm thì thuê càng cao.</li></ul>
  <h3>💸 Hết tiền</h3><ul><li>Không đủ tiền trả thì game tự bán bớt đất rẻ nhất (60% giá trị). Bán hết vẫn thiếu là <b>phá sản</b>.</li></ul>
  <h3>⏳ Chống treo máy</h3><ul><li>Mỗi quyết định có 25 giây, hết giờ máy tự chọn giúp.</li></ul></div>`, 'wide');
}
