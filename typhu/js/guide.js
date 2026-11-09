// Hướng dẫn luật Cờ Tỷ Phú Sài Gòn (tiếng Việt)
import { TILES, GROUP_LIST, STATION_RENT, SALARY, JAIL_FINE, money } from './engine.js?v=55';
import { gp, ill } from '../../shared/ui/guidepics.js?v=1';
import { GI, GV } from './guide-img.js?v=1';
// ô bàn cờ thu nhỏ (tự vẽ bằng CSS) để minh hoạ các loại ô
const tile = (band, icon, name, sub = '') => `<span style="display:inline-flex;flex-direction:column;width:76px;height:96px;border-radius:8px;overflow:hidden;background:#fffaf0;border:2px solid #2f6b3a;box-shadow:0 2px 5px rgba(0,0,0,.15);color:#333;font-size:11px;font-weight:800;text-align:center;line-height:1.2">
  <span style="height:16px;background:${band || 'transparent'}"></span><span style="font-size:22px;margin:4px 0 2px">${icon}</span><span style="padding:0 3px">${name}</span><small style="opacity:.7;font-weight:700;margin-top:auto;margin-bottom:4px">${sub}</small></span>`;

export function guideHTML() {
  const taxes = TILES.filter(t => t.type === 'tax').map(t => `${t.name} ${money(t.amount)}`).join(', ');
  const P = gp(GI, GV);
  const groups = GROUP_LIST.map(g => `<span class="gchip" style="--gc:${g.color}">${g.name}</span>`).join(' ');
  return `<button class="close-x" data-close aria-label="Đóng">✕</button><h2>📖 Luật chơi Cờ Tỷ Phú Sài Gòn</h2><div class="guide">
  ${P.quick([
    ['q-home', 'Trang chủ Cờ Tỷ Phú: ô tên, nút Chơi với máy, Tạo phòng online', '① Nhập tên → ② <b>Chơi với máy / cùng máy</b>, hoặc ③ <b>Tạo phòng online</b> rồi gửi mã cho hội bạn.'],
    ['q-lobby', 'Phòng chờ: danh sách người chơi, nút Thêm máy, nút Bắt đầu', '① Thêm máy hoặc người chơi cùng máy (tuỳ chọn bên dưới) → ② <b>Bắt đầu</b>.'],
    ['turn', 'Tới lượt: nút xúc xắc tròn màu cam Giữ để đổ, nút Tài sản và Giao dịch', '① <b>Giữ</b> nút 🎲 rồi thả để đổ. ② Tài sản (xây nhà, thế chấp) · ③ Giao dịch.'],
    ['buy', 'Dừng ở ô trống: nút Mua 220K và Không mua (đấu giá)', 'Dừng ở ô trống: ① <b>Mua</b> theo giá, hoặc ② bỏ qua để đem ra <b>đấu giá</b>.'],
  ])}
  <h3>🎯 Thắng thế nào?</h3>${ill([[tile('#e53935', '🏙️', '×3 nhóm', ''), 'trọn 3 nhóm màu'], [tile('#555', '🚌', '×4 bến xe', ''), 'cả 4 bến'], [tile('', '💸', 'Phá sản hết', ''), 'còn mình bạn']])}<ul>
    <li>Làm cả bàn <b>phá sản</b>, chỉ còn mình bạn, <b>hoặc</b></li>
    <li>Sở hữu <b>trọn 3 nhóm màu</b> (đủ hết các ô của 3 màu), <b>hoặc</b></li>
    <li>Sở hữu <b>cả 4 bến xe</b> (Miền Đông, Miền Tây, Chợ Lớn, An Sương), <b>hoặc</b></li>
    <li>Sở hữu <b>trọn 1 hàng</b>: mọi ô mua được trên 1 cạnh bàn (đường, bến xe, công ty), không ô nào đang thế chấp.</li>
    <li>Ba cách thắng nhanh trên tắt được trong sảnh (“Thắng độc quyền”). Nếu chủ phòng đặt <b>giới hạn vòng</b>: hết vòng, ai có <b>tài sản ròng</b> lớn nhất thắng.</li></ul>
  ${ill([[tile(GROUP_LIST[0].color, '🏙️', 'Đường', '60K–400K'), 'mua, xây nhà'], [tile('#555', '🚌', 'Bến xe', '200K'), 'có 4 bến'], [tile('#999', '⚡', 'Điện / Nước', '150K'), 'thu theo xúc xắc'], [tile('', '❓', 'Cơ hội', ''), 'rút thẻ đỏ'], [tile('', '💰', 'Khí vận', ''), 'rút thẻ vàng'], [tile('', '🧾', 'Thuế', ''), 'nộp tiền'], [tile('', '🚔', 'Vào tù', ''), ''], [tile('', '🅿️', 'Bãi đậu xe', ''), '✈️ du lịch']])}
  <h3>🎲 Một lượt chơi</h3><ul>
    <li>Đổ 2 xúc xắc, quân đi theo tổng số chấm.</li>
    <li>Đổ <b>đôi</b> được đổ tiếp. Đôi <b>3 lần liền</b> thì vào tù luôn.</li>
    <li>Đi qua hoặc dừng ở <b>Bắt đầu</b> nhận ${money(SALARY)}.</li>
    <li>Trong lượt của mình (trước hoặc sau khi đổ) có thể xây nhà, thế chấp, chuộc đất, đề nghị giao dịch.</li></ul>
  <h3>🏷️ Mua đất & đấu giá</h3>${P.fig('buy', 'Bảng mua đất', 'Bấm <b>Chi tiết</b> để xem bảng giá đầy đủ trước khi mua.')}<ul>
    <li>Dừng ở ô chưa có chủ (đường, bến xe, công ty) thì được mua theo giá in trên ô.</li>
    <li>Không mua thì ô đó được đem ra <b>đấu giá</b>: mọi người lần lượt trả giá (từ 10K) hoặc bỏ, người trả cao nhất được đất.</li></ul>
  <h3>💸 Tiền thuê</h3>${P.side('tile', 'Bảng giá ô Lý Thường Kiệt: tiền thuê đất trống, đủ nhóm, 1 đến 4 nhà, Landmark, giá thế chấp và chuộc', '<p>Bấm vào <b>ô bất kỳ</b> trên bàn để mở bảng giá: thuê đất trống, đủ nhóm (×2), theo số nhà, Landmark, giá nhà, thế chấp và chuộc lại.</p>')}<ul>
    <li><b>Đường</b>: trả theo bảng của ô. Chủ có <b>đủ nhóm màu</b> thì đất trống thu <b>gấp đôi</b>. Có nhà thì thu theo số nhà.</li>
    <li>Nhóm màu: ${groups}</li>
    <li><b>Bến xe</b>: chủ có 1/2/3/4 bến thu ${STATION_RENT.map(money).join(' / ')}.</li>
    <li><b>Điện lực, Cấp nước</b>: có 1 công ty thu <b>4 ×</b> tổng xúc xắc, có cả 2 thu <b>10 ×</b>.</li>
    <li>Ô đang <b>thế chấp</b> không thu tiền thuê. Ở tù vẫn thu tiền thuê bình thường.</li></ul>
  <h3>🏠 Xây nhà & Landmark</h3>${P.fig('manage', 'Bảng Tài sản: nút Xây nhà, Bán nhà, Chuộc đất', 'Bảng 🏗️ Tài sản: ① xây nhà · ② bán nhà (nửa giá) · ③ chuộc đất đang thế chấp. Đủ nhóm thì phải xây đều tay nên vài nút bị mờ.')}<ul>
    <li>Mặc định (kiểu ZingPlay): <b>đường của mình là xây được</b>, không cần đủ nhóm màu. Trong lượt của mình: bấm nút <b>🏠 Xây nhà</b> (nút xanh ở bảng dưới, hiện số ô xây được; không có ô nào thì nút tên <b>🏗️ Tài sản</b>), hoặc bấm thẳng vào ô trên bàn. Đứng trên đất của mình thì có nút <b>Xây tại đây</b>.</li>
    <li>Chủ phòng chọn 1 trong 3 kiểu xây ở mục <b>🏗️ Xây nhà</b> trong sảnh: <b>Không cần đủ bộ</b> (mặc định), <b>Phải đủ bộ màu</b> (cổ điển), hoặc <b>ZingPlay thật</b>.</li>
    <li><b>ZingPlay thật</b>: chỉ được xây ở <b>ô vừa dừng</b> trong lượt của mình (kể cả ô vừa mua hoặc vừa mua lại). Đứng lên đất mình là game tự hỏi <b>“Xây mấy nhà?”</b> – chọn 1, 2, 3, 4 nhà (tối đa đủ tiền). Ô đã có sẵn 4 nhà khi bạn dừng lại lần sau thì nâng được lên <b>🏛️ Landmark</b>. Kiểu này không cần đủ bộ màu và không bắt xây đều tay.</li>
    <li>Hai kiểu kia: khi đã <b>đủ nhóm màu</b> thì phải <b>xây đều tay</b> (ô ít nhà nhất trong nhóm xây trước) và không ô nào trong nhóm đang thế chấp. Tối đa 4 nhà, sau đó nâng lên <b>🏛️ Landmark</b> (thuê cực đắt).</li>
    <li>Bán nhà lại cho ngân hàng được <b>nửa giá</b>, cũng phải bán đều tay.</li></ul>
  <h3>💥 Mua lại đất (kiểu ZingPlay)</h3><ul>
    <li>Trả tiền thuê ở <b>đường</b> của người khác xong, bạn được quyền <b>mua lại</b> ô đó với giá <b>gấp đôi giá trị</b> (giá đất + nhà). Nhà trên đất giữ nguyên.</li>
    <li>Không mua lại được ô có <b>Landmark</b>, bến xe và công ty.</li></ul>
  <h3>🏦 Thế chấp</h3>${ill([[tile(GROUP_LIST[5] ? GROUP_LIST[5].color : '#e53935', '🏦', 'Đang thế chấp', 'ai dừng cũng mua được'), '= coi như <b>ô trống</b>'], '→', [tile(GROUP_LIST[5] ? GROUP_LIST[5].color : '#e53935', '🔑', 'Chuộc lại', 'nửa giá + 10%'), 'chuộc sớm kẻo mất đất']])}<ul>
    <li>Thế chấp một ô nhận ngay <b>nửa giá</b> đất. Muốn thế chấp đường thì phải bán hết nhà <b>của mình</b> trong nhóm màu đó trước.</li>
    <li>Chuộc lại: trả nửa giá <b>+ 10%</b>.</li>
    <li>⚠️ Đất đang thế chấp coi như <b>ô trống</b>: không thu thuê, và <b>ai dừng ở đó cũng mua được</b> với giá gốc (trả ngân hàng, không qua đấu giá nếu họ mua). Chủ cũ mất đất – nhớ chuộc sớm! Người dừng không mua thì đem ra đấu giá như ô trống.</li></ul>
  <h3>🤝 Giao dịch</h3>${P.fig('turn', 'Nút Giao dịch ở bảng dưới', 'Trong lượt của mình bấm ③ <b>🤝 Giao dịch</b> ở bảng dưới.')}<ul>
    <li>Trong lượt của mình, đề nghị đổi đất + tiền + thẻ ra tù với 1 người. Người kia bấm <b>Đồng ý</b> mới thành.</li>
    <li>Không giao được đất khi chủ ô còn nhà trong nhóm màu đó (bán nhà trước). Mỗi lượt tối đa 3 lời đề nghị.</li>
    <li>Bảng giao dịch tự tính <b>tổng giá trị</b> mỗi bên (tiền + giá đất + nhà; đất thế chấp tính nửa giá) và phần <b>chênh lệch</b>.</li>
    <li>Kèo nào giúp ai đó <b>gom đủ bộ màu</b>, <b>đủ 4 bến xe</b>, <b>thắng ngay</b> hoặc <b>sắp thắng</b> thì hiện cảnh báo ⚠️ cho cả người gửi lẫn người nhận – đọc kỹ trước khi bấm Đồng ý!</li></ul>
  <h3>🚔 Tù</h3>${ill([[tile('', '🚔', 'Vào tù', ''), 'dừng ở đây = vào tù'], [tile('', '👀', 'Thăm tù', ''), 'chỉ ghé thăm']])}<ul>
    <li>Vào tù khi: dừng ở ô <b>Vào tù</b>, rút thẻ “Tù ngay”, hoặc đổ đôi 3 lần liền. Đứng ở ô Thăm tù bình thường thì chỉ là ghé thăm.</li>
    <li>Ra tù: nộp ${money(JAIL_FINE)} trước khi đổ, dùng <b>thẻ ra tù</b>, hoặc đổ ra <b>đôi</b> (đi luôn nhưng không đổ thêm).</li>
    <li>Ở tù tối đa 3 lượt: lượt thứ 3 vẫn không ra đôi thì nộp ${money(JAIL_FINE)} rồi đi.</li></ul>
  <h3>❓ Thẻ & thuế</h3>${ill([[tile('#e53935', '❓', 'Cơ hội', ''), ''], [tile('#f4b400', '💰', 'Khí vận', ''), ''], [tile('', '🧾', 'Thuế', ''), '']])}<ul>
    <li><b>Cơ hội</b> (đỏ) và <b>Khí vận</b> (vàng): rút 1 thẻ, làm theo nội dung – có thẻ được tiền, có thẻ mất tiền, có thẻ bắt đi xa.</li>
    <li>Thuế: ${taxes}.</li></ul>
  <h3>✈️ Bãi đậu xe = Du lịch</h3>${P.fig('travel', 'Tới Bãi đậu xe: nút Chọn ô và Ở lại', '① <b>Chọn ô</b> rồi chạm ô sáng trên bàn để bay tới · ② <b>Ở lại</b>.')}<ul>
    <li>Dừng ở <b>Bãi đậu xe</b> (do đổ xúc xắc) thì được chọn <b>1 ô bất kỳ</b> để bay tới ngay: bấm ô đang sáng trên bàn cờ hoặc nút <b>🗺️ Chọn ô</b>. Tới nơi thì xử lý như dừng bình thường (mua đất, trả thuê, rút thẻ…).</li>
    <li>🎫 Bay phải mua <b>vé máy bay</b> (mặc định <b>100K</b>, chủ phòng chỉnh trong sảnh). Không đủ tiền mua vé thì chỉ được nghỉ chân.</li>
    <li>Không bay tới ô <b>Vào tù</b> được. Bay ngược qua <b>Bắt đầu</b> vẫn nhận 200K. Muốn thì bấm <b>🅿️ Ở lại</b>.</li>
    <li>Bị thẻ "Ngập đường" đẩy tới Bãi đậu xe thì không được du lịch. Tắt luật này trong sảnh (✈️ Bãi đậu xe → Chỉ nghỉ) thì ô này chỉ để nghỉ chân.</li></ul>
  <h3>😰 Hết tiền & phá sản</h3><ul>
    <li>Không đủ tiền trả thì bán nhà / thế chấp đất để gom tiền rồi bấm <b>Trả nợ</b>. Lười tính? Bấm <b>⚡ Tự bán nhà/thế chấp cho đủ</b>: máy tự bán/thế chấp <b>vừa đủ</b> (có ghi trước sẽ bán gì) rồi trả luôn.
      ${P.fig('debt', 'Đang nợ 400K: nút Tự bán nhà thế chấp cho đủ, Trả nợ, Tự chọn bán, Phá sản', '① ⚡ Tự bán cho đủ – hoặc tự chọn bán, hết cách mới Phá sản.')}</li>
    <li>Gom hết vẫn thiếu thì <b>phá sản</b>: toàn bộ tài sản về tay chủ nợ (hoặc trả về ngân hàng nếu nợ ngân hàng).</li></ul>
  <h3>🎮 Điều khiển</h3><ul>
    <li>Kéo để xoay bàn, chụm/cuộn để phóng to. Camera tự bám người đang đi; bấm <b>🎯</b> để về góc nhìn, <b>🗺️</b> để xem toàn bàn.</li>
    <li>Bấm vào một ô bất kỳ để xem bảng giá. Bấm vào thẻ người chơi để xem tài sản của họ.</li>
    <li>Lần đầu vào ván có <b>chỉ dẫn từng bước</b> (bong bóng chỉ vào từng nút). Muốn xem lại: <b>⚙️ → 🧭 Xem lại hướng dẫn</b>.</li>
    <li>Sau lượt của người khác, góc trên bàn cờ hiện thẻ <b>📣 tóm tắt lượt vừa rồi</b> (vd. “Tiến đổ 4+3 → Bùi Viện, trả bạn 950K”). Bấm để xem chi tiết các lượt, ✕ để ẩn. Nhật ký đầy đủ vẫn ở nút 📜.</li>
    <li>Chơi online: ai treo máy quá giờ thì máy đánh giúp; rớt mạng thì máy tạm đánh thay, tải lại trang là vào lại đúng ván.</li></ul>
  <p class="note">Bản fan-made phi thương mại cho hội bạn – không liên kết với nhà phát hành nào.</p></div>`;
}
