// Hướng dẫn tiếng Việt: luật Xếp bài cổ điển (Klondike) + cách tính điểm + thao tác
import { cardHTML, THEMES } from './cards.js?v=6';
import { RANKS, SUITS } from './core.js?v=1';

const C = t => RANKS.indexOf(t.slice(0, -1)) + 13 * SUITS.indexOf(t.slice(-1));
// ảnh chụp chính game này (có chú thích), tải lười
const img = (f, w, h, alt) => `<figure class="g-fig"><img src="img/${f}?v=1" width="${w}" height="${h}" loading="lazy" decoding="async" alt="${alt}"><figcaption>${alt}</figcaption></figure>`;
const row = (t, cap) => `<div class="g-ex"><div class="g-row">${t.split(' ').map(x => cardHTML(C(x))).join('')}</div><small>${cap}</small></div>`;

export function guideHTML() {
  return `<button class="close-x" data-close aria-label="Đóng">✕</button>
<h2>📖 Luật Xếp bài cổ điển</h2>
<div class="guide">
<p class="g-lead">Đây là kiểu <b>Klondike</b> – trò "Solitaire" có sẵn trên Windows ngày xưa. Chơi một mình, không cần mạng.
<b>Mục tiêu:</b> đưa cả 52 lá lên 4 chồng <b>đích</b> (góc trên phải), mỗi chồng một chất, xếp từ <b>A → K</b>.</p>
<h3>1. Bàn bài</h3>
<ul><li><b>7 cột</b>: cột thứ nhất 1 lá, cột thứ hai 2 lá… cột thứ bảy 7 lá. Chỉ lá trên cùng mỗi cột ngửa.</li>
<li><b>Nọc</b> (góc trên trái): 24 lá còn lại, úp. Bấm vào để lật ra <b>bãi</b> bên cạnh.</li></ul>
${img('ban-bai.jpg', 582, 450, 'Bàn bài lúc mới chia: nọc, bãi, 4 chồng đích và 7 cột')}
<h3>2. Xếp trên cột</h3>
<ul><li>Xếp <b>giảm dần, xen màu đỏ – đen</b>.</li></ul>
<div class="g-exs">${row('10♠ 9♥ 8♣ 7♦', 'Đúng: 10♠ → 9♥ → 8♣ → 7♦')}${row('9♥ 8♦', 'Sai: hai lá cùng màu đỏ')}</div>
<ul><li>Được bê <b>cả dây</b> đã xếp đúng sang cột khác.</li>
<li>Lá úp lộ ra ở đầu cột sẽ <b>tự lật</b>.</li>
<li><b>Cột trống chỉ nhận K</b> (hoặc dây bắt đầu bằng K).</li></ul>
${img('xep-cot.jpg', 582, 435, 'Kéo cả dây 10♠ 9♥ 8♣ 7♦ lên J♥; cột trống chỉ đặt được K')}
<h3>3. Lên đích</h3>
<ul><li>Mỗi chồng đích bắt đầu bằng <b>A</b>, rồi 2, 3… tới K, <b>cùng chất</b>.</li>
<li>Lá trên đích có thể kéo xuống lại cột nếu cần (Tiêu chuẩn bị trừ 15 điểm).</li></ul>
<div class="g-exs">${row('A♥ 2♥ 3♥', 'Chồng đích cơ: A → 2 → 3…')}</div>
<h3>4. Nọc: Rút 1 hay Rút 3</h3>
<ul><li><b>Rút 1</b>: mỗi lần lật 1 lá – dễ hơn.</li>
<li><b>Rút 3</b>: mỗi lần lật 3 lá, chỉ chơi được lá trên cùng – khó hơn, cần tính.</li>
</ul>${img('rut-3.jpg', 582, 255, 'Rút 3: bãi xoè 3 lá, chỉ lá trên cùng (viền vàng) được đi')}<ul>
<li>Hết nọc thì bấm vào chỗ nọc trống để <b>lật lại</b> bãi thành nọc (luật Vegas giới hạn số vòng).</li></ul>
<h3>5. Tính điểm (điểm ảo, chỉ cho vui)</h3>
<table class="g-tb"><tr><th>Tiêu chuẩn</th><th>Điểm</th></tr>
<tr><td>Lá lên đích</td><td>+10</td></tr><tr><td>Lá từ bãi xuống cột</td><td>+5</td></tr><tr><td>Lật được lá úp trên cột</td><td>+5</td></tr>
<tr><td>Kéo lá từ đích xuống cột</td><td>−15</td></tr><tr><td>Lật lại nọc (Rút 1) / từ vòng thứ 4 (Rút 3)</td><td>−100 / −20</td></tr>
<tr><td>Mỗi 10 giây trôi qua</td><td>−2</td></tr><tr><td>Thắng (nếu chơi ≥ 30 giây)</td><td>thưởng 700.000 ÷ số giây</td></tr></table>
<p><b>Vegas</b>: bắt đầu với <b>−$52</b>, mỗi lá lên đích <b>+$5</b> (kéo xuống thì −$5). Rút 1 chỉ được đi nọc <b>1 vòng</b>, Rút 3 được <b>3 vòng</b>. Ra số dương là "lời". Thống kê có cộng dồn tổng Vegas. Tất cả là điểm ảo, không cá cược tiền thật.</p>
<p><b>Không tính điểm</b>: chơi thư giãn, chỉ tính giờ và số nước.</p>
${img('goi-y.jpg', 600, 960, 'Điểm hiện trên thanh trên cùng; bấm 💡 Gợi ý thì lá nên đi sáng vàng')}
<h3>6. Thao tác</h3>
<ul>
<li><b>Kéo-thả</b> lá (chuột hoặc ngón tay), hoặc <b>chạm chọn</b> lá rồi <b>chạm chỗ muốn đặt</b>.</li>
<li><b>Chạm đúp / nhấp đúp</b> vào lá để đưa nhanh lên đích (không lên được thì tìm chỗ hợp lý trên cột).</li>
<li><b>Chuột phải</b> vào bất kỳ đâu trên bàn – y hệt Solitaire Windows – = đưa <b>MỌI lá lên được đích</b> lên một lèo (lặp tới khi hết, kể cả lá chưa "an toàn"). Trên điện thoại: nút <b>⤴️ Lên đích</b> (luôn có ở thanh dưới, mờ đi khi chưa lá nào lên được) hoặc <b>chạm 2 ngón</b> lên bàn; bàn phím: <kbd>A</kbd>. Hoàn tác 1 lần là về như cũ – lỡ đẩy lên lá còn cần dùng thì ↶ là xong.</li>
<li>Tuỳ chọn <b>🪄 Tự đưa lá an toàn lên đích</b> (☰ Thêm, mặc định BẬT) thì chỉ tự đẩy lá <b>an toàn</b> = lá mà không cột nào còn cần để hứng bài nữa (các lá khác màu nhỏ hơn 1 bậc đã lên đích hết), không bao giờ làm hỏng ván.</li>
<li>↶ Hoàn tác / ↷ Làm lại không giới hạn. 💡 Gợi ý chỉ nước đáng đi.</li>
<li><b>✨ Tự xếp nốt</b> hiện ra (thay chỗ nút ⤴️) khi ván đã chắc thắng.</li>
<li>${img('tu-xep.jpg', 600, 825, 'Ván đã chắc thắng: nút ✨ Tự xếp nốt sáng lên')}</li>
<li>🧠 <b>Ván này giải được không?</b> – máy thử giải trong ~10 giây. Xem máy giải thì ván đó không tính thống kê.</li>
<li>Nhãn nhỏ ở <b>góc trái dưới</b> (giống KPatience) tự báo sau mỗi nước: 🧠 Đang tính… · ✅ Giải được · ❌ Hết đường · 🤔 Chưa chắc (máy chưa tìm ra trong 4 giây). Chỉ để xem, <b>không</b> bị tính là có máy giúp. Tắt/bật trong ☰ Thêm.</li>
<li>🎨 <b>Giao diện bài</b> (☰ Thêm): 🃏 Cổ điển · 🐱 Mèo con · 🐧 Cánh cụt · 👑 Tim hồng · 🏺 Ai Cập. Ảnh của theme chỉ tải khi chọn.</li>
<li>🌓 <b>Sáng / tối</b> (☰ Thêm): Tự động (theo máy) · Sáng · Tối. Theme có nền riêng vẫn giữ nền, chỉ khung giao diện đổi màu.</li>
<li>Mỗi ván có số riêng (<b>Ván #…</b>) – gửi số cho bạn bè để thi cùng một ván!</li>
<li>Bàn phím: <kbd>Ctrl</kbd>+<kbd>Z</kbd> hoàn tác, <kbd>Ctrl</kbd>+<kbd>Y</kbd> làm lại, <kbd>H</kbd> gợi ý, <kbd>N</kbd> ván mới, <kbd>Space</kbd> lật nọc, <kbd>F</kbd> tự xếp nốt, <kbd>Esc</kbd> bỏ chọn.</li>
<li>Ván đang chơi tự lưu – tải lại trang vẫn chơi tiếp. Thống kê lưu trên máy này.</li>
</ul>
<p class="g-note">Hình vẽ, lá bài (theme Cổ điển), âm thanh và chữ là bản tự làm của BGVN · Bản fan-made phi thương mại.</p>
${Object.values(THEMES).filter(T => T.credit).map(T => `<p class="g-note">${T.name}: ${T.credit}. Nguồn và toàn văn giấy phép: <a href="${T.readme}" target="_blank" rel="noopener">${T.readme}</a>.</p>`).join('')}
</div>`;
}
