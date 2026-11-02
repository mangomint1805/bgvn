// Hướng dẫn chơi UNO
const C = (color, type, num = null) => ({ id: 'g' + color + type + num, color, type, num });
const row = (cardHTML, items) => `<div class="cards-row">${items.map(([c, t]) => `<div>${cardHTML(c)}<span>${t}</span></div>`).join('')}</div>`;

export function openGuide(openModal, cardHTML) {
  const tabs = {
    basic: ['🎴 Cơ bản', () => `
      <h3>Mục tiêu</h3><p>Đánh hết bài trên tay trước mọi người. Mỗi người được chia <b>7 lá</b>, lật 1 lá ra giữa làm lá mở đầu.</p>
      <h3>Đến lượt bạn</h3><ol>
        <li>Đánh <b>1 lá cùng màu</b> hoặc <b>cùng số / cùng ký hiệu</b> với lá trên cùng của chồng bỏ. Lá <b>Đổi màu</b> đánh lúc nào cũng được.</li>
        <li>Không có lá hợp (hoặc không muốn đánh) → bấm <b>Rút bài</b>. Lá vừa rút mà hợp thì có thể đánh ngay, không thì qua lượt.</li></ol>
      <p>Lá đánh được sẽ <b>nổi lên và phát sáng</b>; lá mờ là không đánh được. Chấm tròn màu cạnh chồng bỏ cho biết <b>màu hiện tại</b>, vòng mũi tên cho biết <b>chiều chơi</b>.</p>
      <h3>Hô UNO!</h3><p>Khi còn <b>2 lá</b> và sắp đánh lá áp chót, bấm nút <b>UNO!</b>. Quên hô mà bị người khác bấm <b>🚨 Bắt lỗi</b> trước khi người kế tiếp đi thì phải <b>rút 2 lá</b> phạt. Bot cũng biết bắt lỗi đấy nhé 😏</p>`],
    cards: ['🃏 Các lá bài', () => `
      <h3>Bộ cổ điển (108 lá)</h3>${row(cardHTML, [
        [C('R', 'n', 7), 'Lá số 0–9: đánh theo màu hoặc theo số.'],
        [C('Y', 'skip'), '<b>Cấm lượt</b>: người kế tiếp mất lượt.'],
        [C('G', 'rev'), '<b>Đảo chiều</b>: đổi chiều chơi. Còn 2 người thì như Cấm lượt.'],
        [C('B', 'd2'), '<b>+2</b>: người kế rút 2 lá và mất lượt.'],
        [C('W', 'wild'), '<b>Đổi màu</b>: bạn chọn màu tiếp theo.'],
        [C('W', 'wd4'), '<b>Đổi màu +4</b>: chọn màu, người kế rút 4 lá và mất lượt.'],
      ])}
      <h3>Lá riêng của No Mercy (168 lá)</h3>${row(cardHTML, [
        [C('R', 'd4'), '<b>+4 có màu</b>: như +2 nhưng rút 4.'],
        [C('Y', 'skipall'), '<b>Cấm hết</b>: tất cả mất lượt, bạn đi tiếp ngay.'],
        [C('G', 'discall'), '<b>Bỏ cả màu</b>: bỏ luôn mọi lá cùng màu trên tay.'],
        [C('W', 'wrd4'), '<b>Đảo chiều +4</b>: đảo chiều, người kế (theo chiều mới) rút 4.'],
        [C('W', 'wd6'), '<b>Đổi màu +6</b>: người kế rút 6.'],
        [C('W', 'wd10'), '<b>Đổi màu +10</b>: người kế rút 10 😱'],
        [C('W', 'roulette'), '<b>Quay màu</b>: người kế chọn 1 màu rồi lật bài tới khi ra màu đó – lật bao nhiêu giữ bấy nhiêu!'],
      ])}`],
    modes: ['⚙️ Chế độ', () => `
      <h3>🎴 Cổ điển</h3><p>Luật chuẩn. Bị +2/+4 thì rút luôn, không được chồng.</p>
      <h3>🔥 Luật rừng</h3><ul>
        <li><b>Cộng dồn</b>: bị +2 thì đánh +2 hoặc +4 đẩy sang người kế, tổng phạt cộng dồn. Lá chồng phải <b>bằng hoặc lớn hơn</b> lá trước (+4 không chồng được +2).</li>
        <li><b>Cấm chồng Cấm</b>: bị Cấm lượt mà có lá Cấm thì đánh để chuyền cho người kế.</li>
        <li>Không có lá thì rút 1 lá, hợp thì đánh luôn. <b>Không có chặn ngang</b>.</li></ul>
      <h3>💀 No Mercy</h3><ul>
        <li>Bộ 168 lá với +6, +10, Quay màu, Bỏ cả màu, Cấm hết.</li>
        <li>Cộng dồn lá rút (bằng hoặc lớn hơn).</li>
        <li>Không có lá hợp thì <b>rút tới khi ra lá đánh được</b> và phải đánh nó.</li>
        <li><b>Luật 7–0</b>: đánh 7 thì đổi bài với 1 người; đánh 0 thì cả bàn chuyền bài theo chiều chơi.</li>
        <li>Ai giữ <b>từ 25 lá trở lên bị loại</b>. Người cuối còn trụ lại cũng thắng.</li></ul>
      <p>Chủ phòng có thể bật/tắt từng luật trong sảnh để chơi kiểu riêng của hội mình.</p>`],
    tips: ['💡 Mẹo', () => `<ul>
      <li>Giữ lá <b>Đổi màu</b> cho lúc bí, đừng xài sớm.</li>
      <li>Người kế còn ít bài? Tung <b>+2, Cấm</b> vào mặt họ 😈</li>
      <li>Đổi sang màu bạn đang có nhiều nhất (bảng chọn màu có đếm số lá giúp bạn).</li>
      <li>Nhớ bấm <b>UNO!</b> trước khi đánh lá áp chót. Thấy ai còn 1 lá mà chưa hô thì bấm <b>🚨 Bắt lỗi</b> ngay!</li>
      <li>Bấm 📜 để xem nhật ký, ⚡ để chỉnh tốc độ hiệu ứng.</li></ul>`],
  };
  const draw = k => {
    openModal(`<button class="close-x" onclick="__closeModal()">✕</button><h2>📖 Cách chơi UNO</h2><div class="guide"><div class="tabs">${Object.entries(tabs).map(([id, [t]]) => `<button class="chip ${id === k ? 'on' : ''}" data-tab="${id}">${t}</button>`).join('')}</div>${tabs[k][1]()}</div>`, 'wide');
    document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => draw(b.dataset.tab));
  };
  draw('basic');
}
