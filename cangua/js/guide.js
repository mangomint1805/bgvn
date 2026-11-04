// Hướng dẫn luật Cờ cá ngựa (tiếng Việt)
export function guideHTML() {
  return `<button class="close-x" data-close aria-label="Đóng">✕</button><h2>📖 Luật Cờ Cá Ngựa</h2><div class="guide">
  <h3>🎯 Mục tiêu</h3><ul>
    <li>2–4 người, mỗi người <b>4 ngựa</b> một màu, bắt đầu trong <b>chuồng</b> (góc sân cùng màu). Thiếu người thì thêm bot.</li>
    <li>Đưa ngựa chạy hết <b>1 vòng 56 ô</b> theo chiều kim đồng hồ, tới <b>cửa đích</b> (ô có cổng cùng màu, ngay trước ô xuất quân) rồi leo lên <b>đích 6 bậc</b> ở giữa bàn.</li>
    <li><b>Thắng</b> (mặc định): 4 ngựa chiếm đủ <b>bậc 3 – 4 – 5 – 6</b>. Tuỳ chọn khác: chỉ cần cả 4 ngựa lên đích (bậc nào cũng được).</li></ul>
  <h3>🎲 Đổ xúc xắc (mặc định 2 xúc xắc – luật nhà)</h3><ul>
    <li><b>Xuất chuồng</b>: chỉ khi đổ được <b>đôi</b> (1-1, 2-2 … 6-6) hoặc <b>1 + 6</b>. Ngựa ra đứng ở ô xuất quân (ô có mũi tên). Xuất chuồng là dùng hết lần đổ đó.</li>
    <li>Đổ <b>đôi hoặc 1+6</b> thì được <b>đổ tiếp</b> sau khi đi.</li>
    <li>Đi bình thường: <b>1 con ngựa đi đúng tổng 2 xúc xắc</b>. Ví dụ đổ 2 + 5 → chọn 1 con đi 7 ô.</li>
    <li>Đổ đôi mà tổng không đi được con nào thì được đi <b>1 con xúc xắc</b> (ví dụ 3-3 → đi 3 ô).</li>
    <li>Về <b>đúng ô cửa đích</b> được dùng tổng <b>hoặc 1 con xúc xắc lẻ</b> (ví dụ còn 1 ô tới cửa, đổ 1 + 4 → dùng con 1).</li>
    <li>Không có nước đi nào thì mất lượt (vẫn được đổ tiếp nếu là đôi / 1+6). Chỉ có <b>1 nước</b> thì game tự đi cho nhanh.</li></ul>
  <div class="ex">Ví dụ: chưa có ngựa nào ngoài sân, đổ 4 + 4 → xuất 1 con, được đổ tiếp; lần sau đổ 2 + 3 → con đó đi 5 ô, hết lượt.</div>
  <h3>🦶 Đá ngựa</h3><ul>
    <li>Đi tới <b>đúng ô</b> có ngựa đối thủ → ngựa đó bị <b>đá về chuồng</b>, phải xuất chuồng lại từ đầu. Xuất chuồng mà ô xuất quân có ngựa đối thủ đứng thì cũng đá luôn.</li>
    <li>Không được đứng lên ô có <b>ngựa nhà</b>.</li>
    <li><b>Không được nhảy qua đầu</b> (mặc định bật): trên đường đi không được vượt qua bất kỳ ngựa nào (nhà hay đối thủ). Tắt tuỳ chọn này thì nhảy qua thoải mái, chỉ tính ô dừng.</li>
    <li>Ngựa đã lên đích thì an toàn, không ai đá được.</li></ul>
  <h3>🏁 Lên đích (bậc 1–6)</h3><ul>
    <li><b>Mặc định (kiểu Việt Nam)</b>: ngựa phải dừng <b>đúng ô cửa đích</b> (đổ dư thì đứng im). Từ cửa, đổ ra số <b>n</b> thì leo thẳng lên <b>bậc n</b>. Đang ở <b>bậc k</b> muốn lên bậc k+1 phải đổ đúng <b>k+1</b>.</li>
    <li>🎲🎲 <b>Đổ đôi lên chuồng</b> (mặc định bật): đổ <b>đôi</b> thì 1 ngựa đang ở cửa đích hoặc trên đích được <b>lên thêm 1 bậc</b> bất kể số (dùng cả lần đổ, vẫn được đổ tiếp). Tắt trong sảnh nếu không chơi luật này.</li>
    <li>Trên đích được dùng <b>1 trong 2 xúc xắc hoặc tổng</b> để ra số cần (ví dụ ở bậc 3 cần 4: đổ 4-x, x-4, 1+3 hay 2+2 đều được).</li>
    <li>Không được vượt ngựa nhà đang đứng trên đích: muốn chiếm bậc 3-4-5-6 thì nên đưa con đầu lên bậc 6 trước.</li>
    <li><b>Tuỳ chọn "Đếm bước"</b>: ngựa đi xuyên qua cửa vào đích, đi đúng số bước, không được vượt quá bậc 6.</li></ul>
  <div class="ex">Ví dụ: ngựa đứng ở cửa, đổ 6 + 2 → chọn con 6 lên thẳng bậc 6 (hoặc con 2 lên bậc 2). Lần sau ở bậc 6 rồi thì con khác lên bậc 5 cần ra số 5.</div>
  <h3>⚙️ Tuỳ chọn trong sảnh</h3><ul>
    <li><b>Số xúc xắc</b>: 2 (mặc định) hoặc 1. Với 1 xúc xắc: đổ <b>6</b> (hoặc <b>1/6</b>) mới xuất chuồng và được đổ tiếp, ngựa đi đúng số đổ.</li>
    <li><b>Cách đi 2 xúc xắc</b>: <b>Dồn tổng</b> (mặc định) hoặc <b>Tách 2 con</b> – mỗi xúc xắc là 1 nước riêng, đi 2 ngựa khác nhau hoặc 1 ngựa đi 2 lần.</li>
    <li><b>Xuất chuồng</b>: đôi hoặc 1+6 (mặc định) / đôi hoặc có 1 con 6.</li>
    <li><b>3 lần thưởng liền mất lượt</b>: đổ đôi/1+6 tới lần thứ 3 liên tiếp thì mất lượt luôn (mặc định tắt – không phải nhóm nào cũng chơi).</li>
    <li><b>Đua tiếp tranh hạng</b>: có người về nhất rồi những người còn lại chơi tiếp tranh hạng 2, 3.</li>
    <li><b>Thời gian suy nghĩ</b> (online): hết giờ máy tự đi giúp. Người rớt mạng thì bot tạm đánh thay, vào lại là chơi tiếp.</li></ul>
  <h3>📱 Điều khiển</h3><ul>
    <li><b>Giữ</b> nút 🎲 giữa màn hình để lấy đà, <b>thả</b> ra là đổ (bấm nhanh cũng được).</li>
    <li>Ngựa đi được có <b>vòng vàng + mũi tên</b>, ô tới có vòng sáng (đỏ = sẽ đá ngựa). Chạm ngựa hoặc ô tới, hoặc bấm nút ở bảng dưới.</li>
    <li>🎯 camera theo ngựa · 🗺️ xem toàn bàn · kéo để xoay, chụm để phóng to. Máy yếu: ⚙️ chọn chất lượng 3D Thấp.</li></ul>
  <p class="note">Bản fan-made phi thương mại cho hội bạn. Luật cá ngựa mỗi nơi một kiểu – chọn trong sảnh cho hợp hội mình nhé.</p></div>`;
}
