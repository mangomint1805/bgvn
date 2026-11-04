// Hướng dẫn luật Đua Lạc Đà (tiếng Việt)
import { gp, ill } from '../../shared/ui/guidepics.js?v=1';
import { GI, GV } from './guide-img.js?v=1';
const CC = { do: ['#ff4d4d', 'Đỏ'], vang: ['#ffc928', 'Vàng'], lam: ['#3d8bff', 'Lam'], luc: ['#2fbf71', 'Lục'], tim: ['#a86bff', 'Tím'], den: ['#33313d', 'Đen'], trang: ['#f4f2ee', 'Trắng'] };
// Sơ đồ đoạn đường đua: cells = [[số ô, [lạc đà dưới→trên], 'oasis'|'mirage'|null], ...]
function track(cells, hi = []) {
  const W = 56, H = 120, n = cells.length;
  let g = `<svg viewBox="0 0 ${n * W + 8} ${H}" width="${(n * W + 8) * 1.3}" height="${H * 1.3}" style="max-width:100%;height:auto" role="img">`;
  cells.forEach(([no, st, tile], i) => {
    const x = 4 + i * W;
    g += `<rect x="${x + 2}" y="${H - 30}" width="${W - 4}" height="26" rx="6" fill="${tile === 'oasis' ? '#bff0c9' : tile === 'mirage' ? '#d9d4f5' : '#f1d9a6'}" stroke="#b8925a" stroke-width="1.5"/>
      <text x="${x + W / 2}" y="${H - 12}" text-anchor="middle" font-size="12" font-weight="800" fill="#6b4a1f">${tile === 'oasis' ? '🌴+1' : tile === 'mirage' ? '🌫️−1' : 'ô ' + no}</text>`;
    (st || []).forEach((c, k) => { const y = H - 50 - k * 19, [col, nm] = CC[c];
      g += `<rect x="${x + 6}" y="${y}" width="${W - 12}" height="17" rx="5" fill="${col}" stroke="${hi.includes(c) ? '#ff2d6f' : 'rgba(0,0,0,.35)'}" stroke-width="${hi.includes(c) ? 2.5 : 1}"/>
        <text x="${x + W / 2}" y="${y + 12.5}" text-anchor="middle" font-size="10.5" font-weight="800" fill="${c === 'trang' || c === 'vang' ? '#333' : '#fff'}">${nm}</text>`; });
  });
  return g + '</svg>';
}
export function guideHTML() {
  const P = gp(GI, GV);
  return `<button class="close-x" data-close aria-label="Đóng">✕</button><h2>📖 Luật Đua Lạc Đà</h2><div class="guide">
  ${P.quick([
    ['q-home', 'Trang chủ Đua Lạc Đà: ô tên, nút Chơi với bot, Tạo phòng online', '① Nhập tên → ② <b>Chơi với bot</b>, hoặc ③ <b>Tạo phòng online</b> rồi gửi mã cho hội bạn.'],
    ['q-lobby', 'Phòng chờ: danh sách người chơi, nút Thêm bot, nút Bắt đầu đua', '① Thêm bot (3–8 người cho vui) → ② <b>Bắt đầu đua</b>.'],
    ['turn', 'Bảng lượt của bạn: 5 vé chặng, nút Lắc kim tự tháp, Đặt thảm, Cược chung cuộc', 'Tới lượt chọn <b>1 việc</b>: ① lấy vé chặng · ② lắc kim tự tháp (+1 xu) · ③ đặt thảm · ④ cược chung cuộc.'],
    ['track', 'Đường đua 3D quanh kim tự tháp, dải xếp hạng ở góc trên', '① Chặng hiện tại và số xúc xắc đã lắc (0/5). ② Thứ hạng lạc đà lúc này.'],
  ])}
  <h3>🎯 Mục tiêu</h3><ul>
    <li>3–8 người (2 người cũng được, thêm bot cho vui). Bạn <b>không điều khiển</b> lạc đà nào cả – bạn là khán giả <b>đoán</b> con nào thắng.</li>
    <li>Mỗi người bắt đầu với <b>3 xu</b>. Cuộc đua xong, <b>ai nhiều xu nhất thắng</b> (bằng nhau thì cùng thắng).</li>
    <li>Chỉ chơi vui bằng <b>xu ảo</b>: không nạp, không rút, không quy đổi ra tiền thật. Xu không bao giờ âm (hết thì về 0).</li></ul>
  <h3>🐪 Đường đua</h3><ul>
    <li>16 ô vòng quanh <b>kim tự tháp</b>. 5 lạc đà đua: <b>Đỏ, Vàng, Lam, Lục, Tím</b>, xuất phát ở ô 1–3.</li>
    <li>Kim tự tháp chứa <b>1 xúc xắc mỗi màu</b> (mặt 1, 2, 3). Lắc ra màu nào thì lạc đà màu đó đi bấy nhiêu ô.</li>
    <li><b>Chồng lạc đà</b>: đáp vào ô có con khác thì leo <b>lên trên cùng</b>. Con nằm dưới mà đi thì <b>cõng cả đám bên trên</b> theo. Con trên cùng đi thì đi một mình.</li>
    <li><b>Xếp hạng</b>: con đi xa nhất dẫn đầu; cùng ô thì con nằm <b>trên</b> xếp trước.</li></ul>
  <div class="ex">Ví dụ: ô 4 có (dưới→trên) Đỏ, Lam. Lắc Đỏ ra 2 → Đỏ cõng Lam sang ô 6. Lắc Lam ra 1 → Lam đi 1 mình sang ô 5.</div>
  ${ill([[track([[4, ['do', 'lam']], [5, []], [6, ['vang']]], ['do']), 'Lắc <b>Đỏ ra 2</b>…'], '→', [track([[4, []], [5, []], [6, ['vang', 'do', 'lam']]], ['do', 'lam']), '…Đỏ cõng Lam, leo lên đầu Vàng']])}
  ${ill([[track([[4, ['do', 'lam']], [5, []]], ['lam']), 'Lắc <b>Lam ra 1</b>…'], '→', [track([[4, ['do']], [5, ['lam']]], ['lam']), '…Lam đi một mình']])}
  <h3>🏁 Chặng (leg)</h3>${P.fig('track', 'Thanh trên cùng ghi C1 và 0/5 xúc xắc, dải xếp hạng lạc đà', '① “C1 · 🎲0/5”: chặng 1, chưa lắc viên nào. Đủ 5/5 là chấm chặng.')}<ul>
    <li>Mỗi chặng kết thúc khi <b>5 viên xúc xắc</b> đã ra khỏi kim tự tháp. Khi đó chấm điểm <b>vé chặng</b>, rồi bỏ hết thảm sa mạc, trả xúc xắc + vé về như cũ và bắt đầu chặng mới.</li>
    <li>Con lạc đà đầu tiên <b>vượt qua ô 16</b> là cuộc đua kết thúc ngay (chấm chặng cuối rồi chấm cược chung cuộc).</li></ul>
  <h3>👉 Tới lượt: chọn ĐÚNG 1 việc</h3><ul>
    <li>🎫 <b>Lấy vé chặng</b> của 1 màu (lấy vé trên cùng: <b>5 → 3 → 2 → 2</b>). Hết chặng: màu đó <b>về nhất</b> được số trên vé, <b>về nhì</b> +1 xu, còn lại <b>−1 xu</b>.</li>
    <li>🌴 <b>Đặt thảm sa mạc</b> (mỗi người 1 tấm, đặt lại = dời tấm của mình): mặt <b>Ốc đảo +1</b> (lạc đà đáp vào thì đi thêm 1 ô, nằm trên) hoặc <b>Ảo ảnh −1</b> (lùi 1 ô và <b>chui xuống DƯỚI</b> chồng ở đó). Mỗi lần có lạc đà đáp lên thảm, <b>chủ thảm +1 xu</b>.
      Không đặt ở ô 1, ô đang có lạc đà, hoặc trùng/sát bên thảm người khác.</li>
    <li>🎲 <b>Lắc kim tự tháp</b>: nhận ngay <b>+1 xu</b>, 1 viên ngẫu nhiên bật ra và lạc đà màu đó chạy.</li>
    <li>🏆 <b>Cược chung cuộc</b> (úp bí mật): đoán con <b>về nhất</b> hoặc <b>về bét</b> cả cuộc đua. Mỗi người có 1 lá mỗi màu, dùng rồi là hết. Cuối cuộc đua, lá đúng trả theo thứ tự đặt: <b>8, 5, 3, 2, 1</b> (sau đó 1); lá sai <b>−1</b>.</li></ul>
  ${P.fig('tile', 'Chế độ đặt thảm: các ô sáng trên đường đua, nút Ốc đảo, Ảo ảnh và lưới số ô', 'Đặt thảm: ① chọn mặt Ốc đảo / Ảo ảnh → ② chạm ô sáng trên đường (hoặc số ô).')}
  ${ill([[track([[7, ['lam']], [8, [], 'oasis'], [9, ['tim']]], ['lam']), 'Lam ra 1, đáp vào <b>Ốc đảo</b>…'], '→', [track([[7, []], [8, [], 'oasis'], [9, ['tim', 'lam']]], ['lam']), '…đi thêm 1, nằm trên Tím. Chủ thảm +1 xu']])}
  ${ill([[track([[6, ['lam']], [7, ['vang']], [8, [], 'mirage']], ['lam']), 'Lam ra 2, đáp vào <b>Ảo ảnh</b>…'], '→', [track([[6, []], [7, ['lam', 'vang']], [8, [], 'mirage']], ['lam']), '…lùi về ô 7, chui <b>xuống dưới</b> Vàng']])}
  <div class="ex">Ví dụ: Lục đang dẫn, bạn lấy vé Lục 5. Hết chặng Lục về nhất → +5 xu; về nhì → +1; về thứ 3 trở xuống → −1.</div>
  <h3>🥴 Lạc đà xỉn (tuỳ chọn, mặc định bật)</h3>
  ${ill([[track([[12, []], [13, []], [14, ['den', 'do']]], ['den', 'do']), 'Xúc xắc xám ra <b>Đen 2</b>…'], '→', [track([[12, ['den', 'do']], [13, []], [14, []]], ['den', 'do']), '…Đen <b>lùi</b> 2 ô, cõng Đỏ lùi theo 😵']])}<ul>
    <li>2 con <b>Đen</b> và <b>Trắng</b> chạy <b>ngược chiều</b>, xuất phát ở ô 14–16. Chúng không được xếp hạng, nhưng cõng/đè lạc đà đua thì kéo cả đám lùi theo!</li>
    <li>Kim tự tháp có thêm <b>1 xúc xắc xám</b> (mặt đen 1–3, trắng 1–3). Ra màu nào thì con xỉn màu đó <b>lùi</b> bấy nhiêu ô – trừ 2 trường hợp:
      <br>① chỉ có <b>1 con xỉn đang cõng lạc đà đua</b> → con đó đi (dù xúc xắc ra màu kia);
      <br>② một con xỉn <b>cưỡi ngay trên</b> con xỉn kia → con <b>ở trên</b> đi.</li>
    <li>Có 6 viên trong kim tự tháp nhưng vẫn chỉ 5 viên là hết chặng (1 viên nằm lại).</li>
    <li>Lạc đà xỉn dính thảm: Ốc đảo đẩy lùi thêm 1 ô; Ảo ảnh đẩy ngược lại 1 ô và chui xuống dưới chồng. Lùi tới ô 1 thì dừng ở ô 1.</li></ul>
  <h3>💡 Mẹo</h3><ul>
    <li><b>% gợi ý</b> trên vé (máy tự tính từ các viên còn lại) <b>mặc định ẩn</b>. Chỉ bật được khi <b>chơi với bot</b>: ⚙️ Cài đặt → 📊 % gợi ý trên vé → Hiện. Phòng có bạn bè thật thì khoá cho công bằng.</li>
    <li>Vé 5 xu của con dẫn đầu ngon nhất – lấy sớm kẻo người khác giành!</li>
    <li>Ảo ảnh đặt ngay trước con dẫn đầu để kéo nó xuống đáy chồng 😈.</li></ul>
  <p class="note">Bản fan-made phi thương mại cho hội bạn, lấy cảm hứng từ thể loại board game đua lạc đà cá cược. Tên, hình, luật diễn giải đều tự làm. Chơi vui bằng xu ảo, không cá cược tiền thật.</p></div>
  <div class="mbtns"><button class="btn pri" data-close>Hiểu rồi! 🐪</button></div>`;
}
