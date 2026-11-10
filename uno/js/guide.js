// Hướng dẫn chơi UNO
// Mô tả ngắn từng loại lá – dùng cho bong bóng "Lá này làm gì?" (bấm giữ lá) và gợi ý lần đầu gặp lá mới
export const CARD_HELP = {
  n: 'Lá số 0–9: đánh lên lá <b>cùng màu</b> hoặc <b>cùng số</b>.',
  skip: '<b>Khoá mõm</b>: người kế tiếp mất lượt. (Luật rừng: bị khoá thì đánh Khoá mõm để chuyền tiếp.)',
  rev: '<b>Đảo chiều</b>: đổi chiều chơi. Còn 2 người thì như Khoá mõm.',
  d2: '<b>+2</b>: người kế rút 2 lá. Có luật cộng dồn thì người đó được chồng lá rút để đẩy tiếp.',
  wild: '<b>Đổi màu</b>: đánh lúc nào cũng được, bạn chọn màu tiếp theo.',
  wd4: '<b>Đổi màu +4</b>: chọn màu, người kế rút 4 lá.',
  d4: '<b>+4 có màu</b>: như +2 nhưng người kế rút 4.',
  skipall: '<b>Khoá mõm cả bàn</b>: tất cả mất lượt, bạn được đi tiếp ngay.',
  discall: '<b>Xả màu</b>: đánh lá này là bỏ luôn mọi lá cùng màu trên tay bạn.',
  wrd4: '<b>Đảo chiều +4</b>: đảo chiều chơi, người kế (theo chiều mới) rút 4.',
  wd6: '<b>Đổi màu +6</b>: chọn màu, người kế rút 6 lá.',
  wd10: '<b>Đổi màu +10</b>: chọn màu, người kế rút 10 lá 😱',
  roulette: '<b>Quay màu</b>: người kế chọn 1 màu rồi lật bài tới khi ra màu đó – lật bao nhiêu giữ bấy nhiêu!',
  wtd4: '<b>Cộng nhắm +4</b>: đổi màu và chọn <b>bất kỳ ai</b> phải rút 4 lá (không cần là người kế).',
  wup: '<b>Up</b>: từ người kế, mỗi người đánh 1 lá số (màu nào cũng được), số sau phải ≥ số trước. Ai không theo được thì rút số lá bằng số lá số đã đánh trong chuỗi (ít nhất 1).',
  tornado: '<b>Bão tố</b>: chỉ đánh lên lá cùng màu. Người kế tự bốc từng lá tới khi ra màu đó, giữ hết và mất lượt.',
  nou: '<b>No U</b>: đang bị dồn +2/+4 thì đánh lá này (màu nào cũng được) để <b>dội cả đống phạt</b> về người vừa đánh. Không có phạt thì như Đảo chiều.',
  shield: '<b>Khiên</b>: như Đổi màu; đang bị dồn +2/+4 thì giơ Khiên để <b>chuyền nguyên phạt</b> sang người kế.',
  dq: '<b>+?</b>: người kế bốc 1 lá – ra số mấy thì bốc thêm bấy nhiêu, ra lá chức năng thì được tha.',
  gift: '<b>Tặng quà</b>: chọn 1 người và nhét cho họ 2 lá trên tay bạn (bạn tự chọn lá).',
  steal: '<b>Móc túi</b>: lấy ngẫu nhiên 1 lá từ tay 1 người (người đó phải còn từ 2 lá).',
  wswap: '<b>Đổi tay</b>: đổi màu rồi đổi nguyên bộ bài với 1 người bạn chọn.',
};
// lá không có trong bộ cổ điển → lần đầu gặp sẽ hiện gợi ý
export const NEW_TYPES = ['skipall', 'discall', 'd4', 'wrd4', 'wd6', 'wd10', 'roulette', 'wtd4', 'wup', 'tornado', 'nou', 'shield', 'dq', 'gift', 'steal', 'wswap'];
import { gp, ill } from '../../shared/ui/guidepics.js?v=1';
import { GI, GV } from './guide-img.js?v=1';
const C = (color, type, num = null) => ({ id: 'g' + color + type + num, color, type, num });
const row = (cardHTML, items) => `<div class="cards-row">${items.map(([c, t]) => `<div>${cardHTML(c)}<span>${t}</span></div>`).join('')}</div>`;

export function openGuide(openModal, cardHTML) {
  const P = gp(GI, GV, '.gp-ill .ucard{--cw:46px;--ch:69px}'), K = c => `<span class="g-mini">${cardHTML(c)}</span>`;
  const tabs = {
    basic: ['🎴 Cơ bản', () => `
      ${P.quick([
        ['q-home', 'Trang chủ UNO: ô nhập tên, nút Chơi với bot và Tạo phòng online', '① Nhập tên → ② <b>Chơi với bot</b>, hoặc ③ <b>Tạo phòng online</b> rồi gửi mã cho hội bạn.'],
        ['q-lobby', 'Phòng chờ: danh sách người chơi, nút Thêm bot và Bắt đầu', '① Thêm bot cho đủ người (chọn chế độ ngay bên dưới) → ② <b>Bắt đầu</b>.'],
        ['turn', 'Bàn chơi: lá trên cùng chồng bỏ, chồng rút bài và các lá đánh được nổi lên', 'Tới lượt: chạm lá <b>nổi lên</b> để đánh (hợp với ① lá trên cùng). Không có lá hợp → ② chạm chồng bài để <b>Rút</b>.'],
        ['uno', 'Nút UNO! hiện khi còn 2 lá', 'Còn 2 lá: bấm <b>UNO!</b> rồi mới đánh lá áp chót.'],
      ])}
      <h3>Mục tiêu</h3><p>Đánh hết bài trên tay trước mọi người. Mỗi người được chia <b>7 lá</b>, lật 1 lá ra giữa làm lá mở đầu.</p>
      <h3>Đến lượt bạn</h3><ol>
        <li>Đánh <b>1 lá cùng màu</b> hoặc <b>cùng số / cùng ký hiệu</b> với lá trên cùng của chồng bỏ. Lá <b>Đổi màu</b> đánh lúc nào cũng được.</li>
        <li>Không có lá hợp (hoặc không muốn đánh) → bấm <b>Rút bài</b>. Lá vừa rút mà hợp thì có thể đánh ngay, không thì qua lượt.</li></ol>
      ${ill([[K(C('R', 'n', 7)), 'Lá trên cùng: <b>Đỏ 7</b>'], '→', [K(C('R', 'n', 2)), '✅ cùng màu'], [K(C('G', 'n', 7)), '✅ cùng số'], [K(C('W', 'wild')), '✅ Đổi màu'], [K(C('B', 'n', 3)), '❌ khác cả màu lẫn số']])}
      <p>Lá đánh được sẽ <b>nổi lên và phát sáng</b>; lá mờ là không đánh được. Chấm tròn màu cạnh chồng bỏ cho biết <b>màu hiện tại</b>, vòng mũi tên cho biết <b>chiều chơi</b>.</p>
      <h3>Hô UNO!</h3><p>Khi còn <b>2 lá</b> và sắp đánh lá áp chót, bấm nút <b>UNO!</b>. Quên hô mà bị người khác bấm <b>🚨 Bắt lỗi</b> trước khi người kế tiếp đi thì phải <b>rút 2 lá</b> phạt. Bot cũng biết bắt lỗi đấy nhé 😏</p>
      ${P.fig('uno', 'Nút UNO! màu cam cạnh nút Rút bài khi trên tay còn 2 lá', 'Còn 2 lá là nút <b>UNO!</b> hiện ra – bấm trước khi đánh.')}`],
    cards: ['🃏 Các lá bài', () => `
      <h3>Bộ cổ điển (108 lá)</h3>${row(cardHTML, [
        [C('R', 'n', 7), 'Lá số 0–9: đánh theo màu hoặc theo số.'],
        [C('Y', 'skip'), '<b>Khoá mõm</b>: người kế tiếp mất lượt.'],
        [C('G', 'rev'), '<b>Đảo chiều</b>: đổi chiều chơi. Còn 2 người thì như Khoá mõm.'],
        [C('B', 'd2'), '<b>+2</b>: người kế rút 2 lá và mất lượt.'],
        [C('W', 'wild'), '<b>Đổi màu</b>: bạn chọn màu tiếp theo.'],
        [C('W', 'wd4'), '<b>Đổi màu +4</b>: chọn màu, người kế rút 4 lá và mất lượt.'],
      ])}
      <h3>Lá riêng của No Mercy (168 lá)</h3>${row(cardHTML, [
        [C('R', 'd4'), '<b>+4 có màu</b>: như +2 nhưng rút 4.'],
        [C('Y', 'skipall'), '<b>Khoá mõm cả bàn</b>: tất cả mất lượt, bạn đi tiếp ngay.'],
        [C('G', 'discall'), '<b>Xả màu</b>: bỏ luôn mọi lá cùng màu trên tay.'],
        [C('W', 'wrd4'), '<b>Đảo chiều +4</b>: đảo chiều, người kế (theo chiều mới) rút 4.'],
        [C('W', 'wd6'), '<b>Đổi màu +6</b>: người kế rút 6.'],
        [C('W', 'wd10'), '<b>Đổi màu +10</b>: người kế rút 10 😱'],
        [C('W', 'roulette'), '<b>Quay màu</b>: người kế chọn 1 màu rồi lật bài tới khi ra màu đó – lật bao nhiêu giữ bấy nhiêu!'],
      ])}
      <h3>Lá mở rộng (Luật rừng bật sẵn; chế độ khác thì chủ phòng bật trong sảnh)</h3>${row(cardHTML, [
        [C('W', 'wtd4'), '<b>Cộng nhắm +4</b>: đổi màu và chọn <b>bất kỳ ai</b> phải rút 4 lá. Có luật cộng dồn thì người bị nhắm được chồng lá rút để đẩy tiếp.'],
        [C('R', 'nou'), '<b>No U</b>: đang bị dồn +2/+4 thì đánh lá này (màu nào cũng được) để <b>dội toàn bộ phạt ngược về</b> người vừa đánh. Không có phạt thì như Đảo chiều.'],
        [C('W', 'dq'), '<b>+?</b>: màu nào cũng đánh được. Người kế bốc 1 lá, <b>màu của lá đó thành màu mới</b>. Ra số mấy thì <b>bốc thêm bấy nhiêu</b> (ra 0 là thoát), ra lá chức năng thì được tha. Bốc xong mất lượt.'],
        [C('W', 'shield'), '<b>Khiên</b>: như lá Đổi màu, nhưng đang bị dồn +2/+4 thì giơ Khiên để <b>chuyền nguyên phạt sang người kế</b>. Không dùng để né Up.'],
        [C('Y', 'gift'), '<b>Tặng quà</b>: chọn 1 người, nhét cho họ 2 lá trên tay bạn (bạn tự chọn lá).'],
        [C('G', 'steal'), '<b>Móc túi</b>: rút ngẫu nhiên 1 lá từ tay 1 người (người đó phải còn từ 2 lá).'],
        [C('W', 'wswap'), '<b>Đổi tay</b>: đổi màu, rồi đổi nguyên bộ bài với 1 người.'],
        [C('B', 'tornado'), '<b>Bão tố</b>: chỉ đánh lên lá <b>cùng màu</b>. Người kế phải <b>tự bốc từng lá</b> (mỗi lá cách nhau 1 giây 😈) tới khi ra lá cùng màu Bão tố (hoặc lá Đổi màu), giữ hết và mất lượt.'],
        [C('Y', 'discall'), '<b>Xả màu</b>: xả luôn mọi lá cùng màu trên tay.'],
        [C('W', 'wup'), '<b>Up</b>: đổi màu, rồi từ người kế mỗi người đánh 1 lá số (màu nào cũng được), số sau phải <b>bằng hoặc lớn hơn</b> số trước. Ai không theo được rút số lá bằng <b>số lá số đã được đánh</b> từ lúc lá Up ra (ít nhất 1) – chuỗi càng dài càng đau.'],
      ])}`],
    modes: ['⚙️ Chế độ', () => `
      ${P.fig('modes', 'Bảng chọn chế độ trong phòng chờ: Cổ điển, Luật rừng, No Mercy', 'Chủ phòng chọn chế độ trong phòng chờ, trước khi bấm Bắt đầu.')}
      <h3>🎴 Cổ điển</h3><p>Luật chuẩn. Bị +2/+4 thì rút luôn, không được chồng.</p>
      <h3>🔥 Luật rừng</h3><ul>
        <li><b>Cộng dồn</b>: bị +2 thì đánh +2 hoặc +4 đẩy sang người kế, tổng phạt cộng dồn. <b>+2 và +4 chồng lẫn nhau thoải mái</b> (+2 lên +4 cũng được).
          ${ill([[K(C('B', 'd2')), 'Xôi đánh +2'], '→', [K(C('G', 'd2')), 'Gấu Bông chồng +2'], '→', [K(C('W', 'wd4')), 'Đậu chồng +4'], '→', ['<b style="font-size:26px">+8</b>', 'người kế không chồng được thì <b>rút 8</b>']])}</li>
        <li><b>Khoá mõm chồng Khoá mõm</b>: bị khoá mõm mà có lá Khoá mõm thì đánh để chuyền cho người kế.</li>
        <li><b>Bốc thử khi bị dồn</b>: bị dồn +2/+4 mà không có lá chồng thì được bốc thử 1 lá – trúng lá cộng, Khiên hoặc No U thì đánh chồng tiếp ngay (+? không tính), không trúng thì chịu phạt.</li>
        <li><b>Tự bốc phạt</b>: bị cộng bao nhiêu lá thì tự bấm bốc từng lá, mỗi lá cách nhau 1 giây. Cho thấm 😈</li>
        <li><b>Không về bằng lá chức năng</b>: lá cuối cùng phải là lá số. Còn mỗi lá Khoá mõm/Đảo/+2/Đổi màu… thì phải rút bài.</li>
        <li>Không có lá thì rút 1 lá, hợp thì đánh luôn. <b>Không có chặn ngang</b>.</li></ul>
      <h3>💀 No Mercy</h3><ul>
        <li>Bộ 168 lá với +6, +10, Quay màu, Xả màu, Khoá mõm cả bàn.</li>
        <li>Cộng dồn lá rút (bằng hoặc lớn hơn).</li>
        <li>Không có lá hợp thì <b>rút tới khi ra lá đánh được</b> và phải đánh nó.</li>
        <li><b>Luật 7–0</b>: đánh 7 thì đổi bài với 1 người; đánh 0 thì cả bàn chuyền bài theo chiều chơi.</li>
        <li>Ai giữ <b>từ 25 lá trở lên bị loại</b>. Người cuối còn trụ lại cũng thắng.</li></ul>
      <p>Chủ phòng có thể bật/tắt từng luật trong sảnh để chơi kiểu riêng của hội mình.</p>
      <h3>🏆 Tính điểm tới 500 (chơi nhiều ván)</h3><ul>
        <li>Chủ phòng bật trong sảnh, mục tiêu <b>200 / 300 / 500</b> điểm (mặc định tắt – mỗi ván tính riêng như cũ).</li>
        <li>Hết mỗi ván, <b>người về nhất cộng điểm</b> theo bài còn trên tay những người khác: lá số = <b>mặt số</b>, lá chức năng màu (Khoá mõm, Đảo chiều, +2, Khoá cả bàn, Xả màu) = <b>20</b>, lá Đổi màu / +4 / lá mở rộng = <b>50</b>.</li>
        <li>Sau mỗi ván hiện <b>bảng điểm</b>, chủ phòng bấm <b>▶ Ván tiếp</b>. Ai chạm mục tiêu trước là <b>vô địch chung cuộc</b> 🎆.</li>
        <li>Trong ván: ⭐ cạnh mỗi người là điểm hiện có; bấm nhãn <b>Ván N</b> trên cùng để xem bảng điểm. Tải lại trang không mất điểm.</li></ul>`],
    tips: ['💡 Mẹo', () => `<ul>
      <li>Giữ lá <b>Đổi màu</b> cho lúc bí, đừng xài sớm.</li>
      <li>Người kế còn ít bài? Tung <b>+2, Khoá mõm</b> vào mặt họ 😈</li>
      <li>Đổi sang màu bạn đang có nhiều nhất (bảng chọn màu có đếm số lá giúp bạn).</li>
      <li>Nhớ bấm <b>UNO!</b> trước khi đánh lá áp chót. Thấy ai còn 1 lá mà chưa hô thì bấm <b>🚨 Bắt lỗi</b> ngay!</li>
      <li>Bấm 📜 để xem nhật ký, ⚡ để chỉnh tốc độ hiệu ứng.</li>
      <li><b>Bấm giữ</b> lá bất kỳ trên tay (máy tính: chuột phải) hoặc bấm vào lá trên chồng bỏ để xem <b>“Lá này làm gì?”</b>. Lần đầu gặp lá mở rộng sẽ tự hiện gợi ý (có nút Tắt gợi ý).</li>
      <li>Ai móc túi, tặng quà, nhắm +4, dội No U… sẽ có <b>mũi tên cong</b> bay từ người làm tới người bị kèm dòng chữ ngắn – nhìn là biết ai chơi ai 😈</li>
      <li>Nút <b>😂</b> góc dưới bên trái bàn: thả emoji hoặc câu chọc (“Ăn +4 đi cưng”, “Cứu tui”…) – cả bàn đều thấy bay lên từ ghế bạn. Mỗi lần cách nhau 1,5 giây. Bot cũng biết chọc lại đấy!</li>
      <li>Mỗi lượt có <b>40 giây</b> (bốc phạt: 20 giây). Còn 15 giây sẽ hiện đồng hồ ⏳ trên cùng; hết giờ máy tự đánh thay để ván không bị treo.</li></ul>`],
  };
  const draw = k => {
    openModal(`<button class="close-x" onclick="__closeModal()">✕</button><h2>📖 Cách chơi UNO</h2><div class="guide"><div class="tabs">${Object.entries(tabs).map(([id, [t]]) => `<button class="chip ${id === k ? 'on' : ''}" data-tab="${id}">${t}</button>`).join('')}<button class="chip news-chip" onclick="window.__news && window.__news()">📝 Có gì mới</button></div>${tabs[k][1]()}</div>`, 'wide');
    document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => draw(b.dataset.tab));
  };
  draw('basic');
}
