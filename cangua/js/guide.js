// Hướng dẫn luật Cờ cá ngựa (tiếng Việt)
export function guideHTML() {
  return `<button class="close-x" data-close aria-label="Đóng">✕</button><h2>📖 Luật Cờ Cá Ngựa</h2><div class="guide">
  <h3>🎯 Mục tiêu</h3><ul>
    <li>2–4 người, mỗi người <b>4 ngựa</b> một màu, bắt đầu trong <b>chuồng</b> (góc sân cùng màu). Thiếu người thì thêm bot.</li>
    <li>Đưa ngựa chạy hết <b>1 vòng 56 ô</b> theo chiều kim đồng hồ, qua <b>ô cửa</b> (ô có cổng cùng màu, ngay trước ô xuất quân) rồi vào <b>chuồng đích 6 bậc</b> ở giữa bàn (bậc 1 sát cửa, <b>bậc 6 là đầu chuồng</b>).</li>
    <li><b>Thắng</b> (mặc định): 4 ngựa chiếm đủ <b>bậc 3 – 4 – 5 – 6</b>. Tuỳ chọn khác: chỉ cần cả 4 ngựa lên đích (bậc nào cũng được).</li></ul>
  <h3>🎲 Đổ xúc xắc (mặc định 2 xúc xắc – luật nhà)</h3><ul>
    <li><b>Xuất chuồng</b>: chỉ khi đổ được <b>đôi</b> (1-1, 2-2 … 6-6) hoặc <b>1 + 6</b>. Ngựa ra đứng ở ô xuất quân (ô có mũi tên). Xuất chuồng là dùng hết lần đổ đó.</li>
    <li>Đổ <b>đôi hoặc 1+6</b> thì được <b>đổ tiếp</b> sau khi đi.</li>
    <li>Đi bình thường: <b>1 con ngựa đi đúng tổng 2 xúc xắc</b>. Ví dụ đổ 2 + 5 → chọn 1 con đi 7 ô.</li>
    <li>✂️ <b>Đổ đôi được chọn đi cả hoặc nửa</b>: ví dụ 3-3 → đi <b>6 ô</b> hoặc chỉ <b>3 ô</b> (cả trên đường lẫn lúc vào chuồng). Hai lựa chọn hiện thành 2 điểm đến riêng trên bàn và 2 nút riêng.</li>
    <li>Không có nước đi nào thì mất lượt (vẫn được đổ tiếp nếu là đôi / 1+6). Chỉ có <b>1 nước</b> thì game tự đi cho nhanh.</li></ul>
  <div class="ex">Ví dụ: chưa có ngựa nào ngoài sân, đổ 4 + 4 → xuất 1 con, được đổ tiếp; lần sau đổ 2 + 3 → con đó đi 5 ô, hết lượt. Đổ 2-2 với ngựa đang ở ngoài → chọn xuất thêm con mới, đi 4 ô, hoặc đi 2 ô.</div>
  <h3>🦶 Đá ngựa</h3><ul>
    <li>Đi tới <b>đúng ô</b> có ngựa đối thủ → ngựa đó bị <b>đá về chuồng</b>, phải xuất chuồng lại từ đầu. Xuất chuồng mà ô xuất quân có ngựa đối thủ đứng thì cũng đá luôn.</li>
    <li>Không được đứng lên ô có <b>ngựa nhà</b>.</li>
    <li><b>Không được nhảy qua đầu</b> (mặc định bật): trên đường đi không được vượt qua bất kỳ ngựa nào (nhà hay đối thủ). Tắt tuỳ chọn này thì nhảy qua thoải mái, chỉ tính ô dừng.</li>
    <li>Ngựa đã lên đích thì an toàn, không ai đá được.</li></ul>
  <h3>🏁 Vào chuồng đích (bậc 1–6) – luật nhà mặc định</h3><ul>
    <li><b>Đếm thẳng vào chuồng</b>: bước đi tính liền một mạch, qua ô cửa thì mỗi bước tiếp theo là <b>1 bậc</b>. Tức là <b>số ô còn tới ô cửa + số bậc = số đổ</b>. Đổ dư quá bậc 6 thì không đi được.</li>
    <li>Không được vượt hay đứng đè <b>ngựa nhà trong chuồng</b> – muốn chiếm bậc 3-4-5-6 thì nên cho con đầu vào thẳng bậc 6 trước. Phần đường đua trước cửa vẫn tính luật "không nhảy qua đầu".</li>
    <li>🎲🎲 <b>Đã vào chuồng rồi thì chỉ lên được 1 bậc mỗi lần đổ đôi</b> (đôi nào cũng được, dùng cả lần đổ, vẫn được đổ tiếp). Không đôi thì ngựa trong chuồng đứng yên. (Chơi 1 xúc xắc: ra 6 thì lên 1 bậc.)</li>
    <li>Ngựa đã vào chuồng thì an toàn, không ai đá được.</li></ul>
  <div class="ex">Ví dụ (luật anh Minto): ngựa <b>đứng cách chuồng 2 ô</b> (đi 2 bước là tới ô cửa) → đổ <b>3</b> thì vào <b>bậc 1</b>; đổ <b>8</b> thì lên luôn <b>bậc 6 đầu chuồng</b>; đổ 2 thì đứng ở ô cửa; đổ 9 trở lên thì quá, không đi được. Đổ đôi 4-4 thì chọn 8 (bậc 6) hoặc 4 (bậc 2).</div>
  <div class="ex">Ví dụ: ngựa ở bậc 4, đổ 5-5 → lên bậc 5. Đổ 2 + 3 thì đứng yên, phải đi con khác.</div>
  <h3>🏁 Luật vào chuồng khác (chọn trong sảnh)</h3><ul>
    <li><b>Dừng ở cửa, ra n lên bậc n</b> (kiểu cũ): phải dừng <b>đúng ô cửa</b> (được dùng tổng hoặc 1 con xúc xắc lẻ). Từ cửa ra <b>n</b> thì lên thẳng <b>bậc n</b>; ở <b>bậc k</b> muốn lên k+1 phải ra đúng <b>k+1</b> (1 con hoặc tổng). Có thêm tuỳ chọn <b>Đôi lên chuồng</b>: đổ đôi thì lên 1 bậc bất kể số.</li>
    <li><b>Đếm bước cả trong chuồng</b>: đi xuyên cửa vào chuồng, trong chuồng cũng đi đúng số bước, không quá bậc 6.</li></ul>
  <h3>⚙️ Tuỳ chọn trong sảnh</h3><ul>
    <li><b>Số xúc xắc</b>: 2 (mặc định) hoặc 1. Với 1 xúc xắc: đổ <b>6</b> (hoặc <b>1/6</b>) mới xuất chuồng và được đổ tiếp, ngựa đi đúng số đổ.</li>
    <li><b>Cách đi 2 xúc xắc</b>: <b>Dồn tổng</b> (mặc định) hoặc <b>Tách 2 con</b> – mỗi xúc xắc là 1 nước riêng, đi 2 ngựa khác nhau hoặc 1 ngựa đi 2 lần.</li>
    <li><b>Xuất chuồng</b>: đôi hoặc 1+6 (mặc định) / đôi hoặc có 1 con 6.</li>
    <li><b>Đổ đôi</b>: chọn đi cả hoặc nửa (mặc định) / chỉ đi cả tổng (tổng kẹt thì mới được đi nửa).</li>
    <li><b>3 lần thưởng liền mất lượt</b>: đổ đôi/1+6 tới lần thứ 3 liên tiếp thì mất lượt luôn (mặc định tắt – không phải nhóm nào cũng chơi).</li>
    <li><b>Đua tiếp tranh hạng</b>: có người về nhất rồi những người còn lại chơi tiếp tranh hạng 2, 3.</li>
    <li><b>Thời gian suy nghĩ</b> (online): hết giờ máy tự đi giúp. Người rớt mạng thì bot tạm đánh thay, vào lại là chơi tiếp.</li></ul>
  <h3>📱 Điều khiển</h3><ul>
    <li><b>Giữ</b> nút 🎲 giữa màn hình để lấy đà, <b>thả</b> ra là đổ (bấm nhanh cũng được).</li>
    <li>Vừa đổ xong là thấy ngay <b>điểm đến</b> của mọi nước: <b>ngựa mờ + vòng sáng + nhãn số bước</b> (vd. "8 → bậc 6"); nhãn <b>đỏ "ĐÁ!"</b> = sẽ đá ngựa đối thủ. Ngựa đi được có vòng vàng + mũi tên.</li>
    <li>Chạm <b>điểm đến</b> để đi luôn nước đó, hoặc bấm nút ở bảng dưới (rê chuột vào nút thì điểm đến tương ứng sáng lên). Chỉ có 1 nước thì máy tự đi nhưng vẫn hiện điểm đến một chút cho bạn thấy.</li>
    <li>🎯 camera theo ngựa · 🗺️ xem toàn bàn · kéo để xoay, chụm để phóng to. Máy yếu: ⚙️ chọn chất lượng 3D Thấp.</li></ul>
  <p class="note">Bản fan-made phi thương mại cho hội bạn. Luật cá ngựa mỗi nơi một kiểu – chọn trong sảnh cho hợp hội mình nhé.</p></div>`;
}
