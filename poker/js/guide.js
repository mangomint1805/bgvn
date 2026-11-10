// Hướng dẫn luật Poker Texas Hold'em (tiếng Việt, có ví dụ)
import { gp, ill } from '../../shared/ui/guidepics.js?v=1';
import { GI, GV } from './guide-img.js?v=1';
const ROWS = [
  ['Thùng phá sảnh', 'Straight flush', '5 lá liên tiếp cùng chất. Cao nhất là 10-J-Q-K-A (Hoàng gia).', 'Ts Js Qs Ks As'],
  ['Tứ quý', 'Four of a kind', '4 lá cùng số.', '9h 9d 9c 9s Kd'],
  ['Cù lũ', 'Full house', '1 bộ ba + 1 đôi. So bộ ba trước, rồi tới đôi.', 'Qh Qd Qc 7s 7d'],
  ['Thùng', 'Flush', '5 lá cùng chất (không liên tiếp). So lá cao nhất, rồi lá kế…', 'Ad Jd 8d 5d 2d'],
  ['Sảnh', 'Straight', '5 lá liên tiếp khác chất. A đứng đầu (10-J-Q-K-A) hoặc cuối (A-2-3-4-5, sảnh nhỏ nhất).', '5c 4h 3d 2s Ah'],
  ['Sám cô', 'Three of a kind', '3 lá cùng số.', '8s 8h 8d Kc 3h'],
  ['Hai đôi', 'Two pair', '2 đôi khác nhau. So đôi cao, rồi đôi thấp, rồi lá lẻ.', 'Jh Jc 4s 4d Ac'],
  ['Một đôi', 'One pair', '2 lá cùng số.', 'Kd Kh 9c 6s 2h'],
  ['Mậu thầu', 'High card', 'Không có gì: so lá cao nhất, bằng thì so tiếp lá sau.', 'Ac Qd 9h 6s 3c'],
];
export function openGuide(openModal, cardHTML) {
  const cards = s => `<span class="g-cards">${s.split(' ').map(c => cardHTML(c, 'sm')).join('')}</span>`;
  const P = gp(GI, GV);
  openModal(`<button class="close-x" onclick="__closeModal()" aria-label="Đóng">✕</button>
  <div class="guide">
  <h2>📖 Luật Poker Texas Hold'em</h2>
  <p class="g-warn">🎲 <b>Chơi vui bằng chip ảo, không cá cược tiền thật.</b> Chip không mua, không bán, không quy đổi ra tiền hay quà gì hết. Hết chip thì bấm <b>“Xin mẹ thêm chip”</b> là có lại 😆</p>
  ${P.quick([
    ['q-home', 'Trang chủ Poker: ô tên, nút Chơi với bot, Tạo phòng online', '① Nhập tên → ② <b>Chơi với bot</b>, hoặc ③ <b>Tạo phòng online</b> rồi gửi mã cho hội bạn.'],
    ['q-lobby', 'Phòng chờ: danh sách người chơi, nút Thêm bot, nút Chia bài', '① Thêm bot (chế độ, chip, mù chỉnh bên dưới) → ② <b>Chia bài!</b>'],
    ['turn', 'Tới lượt sau Flop: pot, 3 lá chung, 2 lá tẩy, gợi ý Một đôi 9, nút Bỏ bài, Xem, Cược', '① Pot · ② lá chung · ③ 2 lá tẩy của bạn · ④ 💡 gợi ý tên bài. Chọn ⑤ <b>Bỏ bài</b>, ⑥ <b>Xem/Theo</b> hoặc ⑦ <b>Cược/Tố</b>.'],
    ['raise', 'Bảng chọn mức cược: Min, nửa pot, pot, tất tay, thanh trượt', 'Bấm Cược/Tố → ① chọn nhanh Min · ½ Pot · Pot · Tất tay hoặc kéo thanh, rồi bấm xác nhận.'],
  ])}
  <h3>🎯 Mục tiêu</h3>
  <p>Mỗi người cầm <b>2 lá tẩy</b> (chỉ mình thấy). Giữa bàn lật dần <b>5 lá chung</b>. Ai ghép được <b>5 lá mạnh nhất</b> từ 7 lá (2 tẩy + 5 chung, dùng lá nào cũng được) thì ăn <b>pot</b> (toàn bộ chip mọi người đã cược). Hoặc: cược sao cho mọi người sợ mà <b>bỏ bài</b> hết – khỏi cần lật!</p>
  ${ill([[cards('Qs 9h'), '2 lá tẩy'], '+', [cards('9c Kd 4h 9d 2s'), '5 lá chung'], '=', [cards('9h 9c 9d Kd Qs'), '<b>Sám cô 9</b> (5 lá đẹp nhất)']])}
  <h3>🔄 Một ván diễn ra thế nào</h3>
  <ol>
    <li><b>Nút Dealer (D)</b> chuyền vòng theo chiều kim đồng hồ sau mỗi ván. Người ngay bên trái Dealer đặt <b>mù nhỏ</b>, người kế đặt <b>mù lớn</b> (cược bắt buộc để pot có “mồi”).</li>
    <li><b>Preflop</b>: chia mỗi người 2 lá tẩy. Người bên trái mù lớn nói trước.</li>
    <li>${ill([[cards('8d Tc Kc'), '<b>Flop</b>'], '→', [cards('5s'), '<b>Turn</b>'], '→', [cards('Ah'), '<b>River</b>']])}<b>Flop</b>: lật 3 lá chung → vòng cược. <b>Turn</b>: lật lá thứ 4 → vòng cược. <b>River</b>: lật lá thứ 5 → vòng cược cuối.</li>
    <li>Từ Flop trở đi, người còn trong ván đầu tiên bên trái Dealer nói trước.</li>
    <li><b>Lật bài (showdown)</b>: còn từ 2 người trở lên sau River thì lật bài so. Bài mạnh nhất ăn pot. Bằng nhau thì <b>chia đều</b>.</li>
  </ol>
  <p class="g-ex"><b>Tay đôi (2 người):</b> Dealer đặt mù nhỏ và nói <b>trước</b> ở Preflop, nhưng nói <b>sau</b> ở các vòng sau.</p>
  <h3>🗣️ Tới lượt bạn có thể</h3>
  ${P.fig('turn', 'Thanh hành động: Bỏ bài, Xem, Cược', 'Nút giữa đổi chữ theo tình huống: <b>Xem</b> (chưa ai cược) hoặc <b>Theo 20</b>.')}
  <ul>
    <li><b>Bỏ bài (Fold)</b>: úp bài, thua phần đã cược, nghỉ ván này.</li>
    <li><b>Xem (Check)</b>: không cược thêm – chỉ được khi chưa ai cược ở vòng này.</li>
    <li><b>Theo (Call)</b>: cược bằng mức cao nhất hiện tại.</li>
    <li><b>Cược / Tố (Bet / Raise)</b>: đặt cao hơn. No-limit = tố bao nhiêu cũng được, miễn đủ mức tối thiểu và không quá số chip mình có.</li>
    <li><b>Tất tay (All-in)</b>: đẩy hết chip. Thiếu chip để theo thì cứ tất tay – bạn vẫn được tranh phần pot tương ứng.</li>
  </ul>
  ${P.fig('raise', 'Bảng chọn mức tố', 'Bảng tố: chọn nhanh hoặc kéo thanh trượt.')}
  <p class="g-ex"><b>Mức tố tối thiểu:</b> cược đầu tiên ít nhất bằng mù lớn. Tố lại phải tăng <b>ít nhất bằng mức tăng trước đó</b>. Ví dụ mù 10/20: A tố lên 60 (tăng 40) → B muốn tố lại phải lên ít nhất 100 (tăng ≥ 40).<br>
  Nếu ai đó <b>tất tay mà không đủ mức tố</b>, những người đã nói trước đó chỉ được <b>Theo hoặc Bỏ</b>, không được tố tiếp.</p>
  <p>Vòng cược kết thúc khi mọi người còn trong ván đã cược bằng nhau (hoặc đã tất tay) và ai cũng đã được nói.</p>
  <h3>🏆 Thứ hạng bài (mạnh → yếu)</h3>
  <table class="g-rank">${ROWS.map(([vi, en, d, ex], i) => `<tr><td class="gr-n">${i + 1}</td><td><b>${vi}</b> <small>${en}</small><div>${d}</div>${cards(ex)}</td></tr>`).join('')}</table>
  <p class="g-ex"><b>Lá phụ (kicker):</b> cùng hạng bài thì so tiếp các lá còn lại trong 5 lá. Ví dụ bàn <b>K-9-5-3-2</b>: bạn A-K (đôi K, phụ A) thắng Q-K (đôi K, phụ Q). Nếu 5 lá đẹp nhất của cả hai trùng nhau (vd. cả bàn là sảnh) → chia pot. Chất không phân cao thấp.</p>
  ${ill([[cards('Ah Kd'), 'Bạn A-K: đôi K, <b>phụ A</b> ✅'], [cards('Qs Kh'), 'Q-K: đôi K, phụ Q'], [cards('Kc 9h 5d 3s 2h'), 'Bàn K-9-5-3-2']])}
  <h3>💰 Pot phụ (side pot)</h3>
  <p>Ai tất tay chỉ được ăn tối đa phần mỗi người góp bằng số chip của mình. Phần cược dư của người khác thành <b>pot phụ</b>, chỉ những người góp vào pot phụ mới tranh.</p>
  <p class="g-ex"><b>Ví dụ:</b> Bánh Bao tất tay 100, Bông tất tay 300, Kẹo theo 300.<br>
  → <b>Pot chính</b> 300 (100 × 3): cả 3 tranh. <b>Pot phụ</b> 400 (200 × 2): chỉ Bông và Kẹo tranh.<br>
  Lật bài: Bánh Bao mạnh nhất → ăn pot chính 300. Bông mạnh hơn Kẹo → ăn pot phụ 400.<br>
  Phần cược không ai theo (vd. tố 500 mà người duy nhất còn lại chỉ có 300) được <b>trả lại</b>. Chia đều mà dư 1 chip lẻ thì người ngồi gần bên trái Dealer nhất được.</p>
  ${ill([['<b style="font-size:20px">🥇 300</b>', 'Pot chính: Bánh Bao · Bông · Kẹo'], ['<b style="font-size:20px">🥈 400</b>', 'Pot phụ: Bông · Kẹo']])}
  <h3>⚙️ Tuỳ chọn trong sảnh</h3>
  <ul>
    <li><b>🎉 Chơi vui</b>: hết chip thì bấm <b>“🥺 Xin mẹ thêm chip”</b> để có lại số chip ban đầu (không giới hạn, bảng chip ghi số lần xin). Bot hết chip tự xin.</li>
    <li><b>🏆 Giải đấu</b>: không được xin thêm, hết chip là bị loại. Người cuối cùng còn chip vô địch. Mù tăng dần cho nhanh.</li>
    <li><b>Chip khởi điểm</b>, <b>mù khởi điểm</b>, <b>tăng mù sau mỗi N ván</b> (mù tăng theo bậc ×1.5, ×2, ×3…), <b>thời gian mỗi lượt</b> khi chơi online (hết giờ: tự Xem nếu được, không thì tự Bỏ bài).</li>
  </ul>
  <h3>💡 Mẹo cho người mới</h3>
  <ul>
    <li>Bật <b>💡 Gợi ý</b> để thấy bài hiện tại của bạn tên gì (vd. “Hai đôi K và 7”), và 5 lá đang tạo nên bài được viền sáng.</li>
    <li>Đừng theo mọi ván! Bài tẩy yếu (vd. 7-2 khác chất) thì bỏ sớm cho đỡ tốn chip.</li>
    <li><b>Tỉ lệ pot</b>: phải theo 50 để tranh pot 150 → cần thắng khoảng 1/4 số lần mới đáng theo.</li>
    <li>Bot có tính cách riêng, thỉnh thoảng bịp đó – coi chừng 🤥</li>
  </ul>
  <p class="g-note">Bản fan-made phi thương mại cho hội bạn chơi vui. Chơi vui bằng chip ảo, không cá cược tiền thật.</p>
  </div>`, 'wide');
}
