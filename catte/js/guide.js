// Hướng dẫn luật Cát tê (tiếng Việt, có ví dụ)
import { cardHTML } from './cards.js?v=3';
import { parseCard } from './engine.js?v=2';
import { gp } from '../../shared/ui/guidepics.js?v=1';
import { GI, GV } from './guide-img.js?v=1';
const row = ids => `<div class="g-row">${ids.split(' ').map(x => x === '_' ? cardHTML(null, 'sm') : cardHTML(parseCard(x), 'sm')).join('')}</div>`;

export function openGuide(openModal) {
  const P = gp(GI, GV);
  const tabs = {
    basic: ['🃏 Cơ bản', () => `
      ${P.quick([
        ['q-home', 'Trang chủ Cát tê: ô tên, nút Chơi với bot, Tạo phòng online', '① Nhập tên → ② <b>Chơi với bot</b>, hoặc ③ <b>Tạo phòng online</b> rồi gửi mã cho hội bạn.'],
        ['q-lobby', 'Phòng chờ: danh sách người chơi, nút Thêm bot và Chia bài', '① Thêm bot (2–6 người, tiền cược chỉnh bên dưới) → ② <b>Chia bài!</b>'],
        ['turn', 'Tới lượt: chọn lá K bích sáng xanh, nút Đè và Úp', '① Nồi chip. Chạm ② lá <b>sáng xanh ⬆</b> (cùng chất, lớn hơn) → ③ <b>Đè</b>. Không muốn tranh thì chọn lá rồi ④ <b>Úp</b>.'],
      ])}
      <h3>Số người & bài</h3><p><b>2–6 người</b>, bộ bài Tây <b>52 lá</b>, mỗi người <b>6 lá</b>. Thiếu người thì thêm bot.</p>
      <p>Lá nhỏ nhất là <b>2</b>, lớn nhất là <b>A (Át)</b>: 2 &lt; 3 &lt; … &lt; 10 &lt; J &lt; Q &lt; K &lt; A. <b>Chất không phân cao thấp</b> – ♠ ♣ ♦ ♥ ngang nhau.</p>
      ${row('2S 7D JC QH KS AH')}
      <h3>Mục tiêu</h3><p>Ăn được <b>vòng thứ 6 (vòng cuối)</b> – gọi là <b>TỚI</b> – để hốt cả nồi chip. Một ván có 6 vòng, mỗi vòng ai cũng ra 1 lá.</p>
      <h3>📚 Thuật ngữ</h3><ul>
        <li><b>Tùng</b>: lá lớn nhất của một vòng – ăn vòng đó là <b>ăn tùng</b> / <b>có tùng</b> ✅, và được cầm cái vòng sau.</li>
        <li><b>Tranh tùng</b>: vòng 1–4, ai cũng cố giành ít nhất 1 tùng để sống.</li>
        <li><b>Đè</b>: ra lá cùng chất lớn hơn lá đang ăn. <b>Úp</b> (thiệp): bỏ 1 lá úp xuống, không tranh vòng đó.</li>
        <li><b>Chết</b>: hết vòng 4 mà không có tùng nào ☠️ (có nơi gọi là <b>vàng tùng</b> khi úp trắng cả 4 vòng).</li>
        <li><b>Chưng</b> (trưng): vòng 5, cả bàn chọn lá úp rồi lật cùng lúc. <b>Xổ</b>: vòng 6 lật lá cuối.</li>
        <li><b>Tới</b>: ăn tùng vòng 6 – thắng ván, hốt nồi 🏆. <b>Tới trắng</b> (ăn trắng): thắng ngay lúc chia bài.</li></ul>
      <h3>Thứ tự đi</h3><p>Người <b>cầm cái</b> (cái) ra lá đầu tiên, sau đó lần lượt từng người theo vòng bàn (ngược chiều kim đồng hồ: người ngồi bên <b>phải</b> bạn đi sau bạn). Ai ăn vòng thì cầm cái vòng sau.</p>
      <p>Ván đầu bốc thăm người cầm cái; từ ván sau, <b>người tới ván trước cầm cái</b>.</p>`],
    play: ['⚔️ Đè / Úp', () => `
      <h3>Vòng 1–4: đè hoặc úp</h3><ul>
        <li><b>Cái</b> đánh <b>lá bất kỳ</b> (ngửa). Chất của lá này là <b>chất vòng</b>.</li>
        <li>Người sau chọn 1 trong 2:<br>⬆️ <b>ĐÈ</b>: đánh ngửa 1 lá <b>cùng chất</b> và <b>lớn hơn lá đang thắng</b> của vòng.<br>🙈 <b>ÚP</b>: bỏ úp 1 lá bất kỳ (không ai thấy lá gì). Lá úp không bao giờ ăn được.</li>
        <li>Ai đè sau cùng (lá cùng chất lớn nhất) <b>ăn vòng</b> ✅ và cầm cái vòng kế.</li></ul>
      <h3>Ví dụ</h3><p>Cái ra <b>9♥</b>. Bạn có <b>10♥</b> → đè được. Người sau có <b>K♠</b> → khác chất, chỉ úp được. Người cuối có <b>A♥</b> → đè 10♥, ăn vòng!</p>
      ${row('9H 10H _ AH')}
      <p>Lưu ý: muốn đè phải lớn hơn <b>lá đang thắng</b>, không phải lá của cái. Có lá đè được vẫn có quyền úp (giấu bài).</p>
      <h3>Trên web</h3>${P.fig('turn', 'Lá K bích đè được 3 bích đang ăn, nút Đè màu xanh', 'Lá đang ăn là 3♠ → K♠ sáng xanh, bấm Đè.')}<p>Lá đè được sẽ <b>sáng viền xanh ⬆</b>. Chạm 1 lá để chọn, rồi bấm <b>Đè</b> hoặc <b>Úp</b>. Chạm 2 lần vào lá = làm luôn (đè nếu đè được, không thì úp).</p>`],
    dead: ['☠️ Chết & Lật bài', () => `
      <h3>Chết (bị loại)</h3><p>Hết <b>vòng 4</b>, ai <b>chưa ăn được vòng nào</b> (không có <b>tùng</b>) là <b>CHẾT</b> ☠️ – nghỉ ván này, mất tiền cược. Trên bàn, người chưa có vòng nào sẽ hiện ☠️ để cả bàn biết ai đang nguy.</p>
      <p>Nếu chỉ còn đúng <b>1 người sống</b> (ăn trọn cả 4 vòng) thì người đó thắng luôn – <b>ăn trắng</b> 🧹.</p>
      <h3>Vòng 5–6: LẬT BÀI 🔥</h3><p>Những người còn sống mỗi người còn 2 lá. Từ đây <b>không úp nữa</b>, lá nào cũng lật ngửa, lá <b>cùng chất vòng lớn nhất</b> ăn.</p><ul>
        <li><b>Vòng 5 – Chưng bài</b> (mặc định): người cầm cái ra 1 lá ngửa, những người khác <b>cùng lúc</b> chọn 1 lá úp ("chưng"), rồi <b>lật cùng lúc</b>. Không ai biết người khác chọn gì!</li>
        <li>Tuỳ chọn <b>"Đánh lần lượt"</b>: vòng 5 đánh lần lượt như bình thường, ai cũng ngửa bài.</li>
        <li><b>Vòng 6</b>: mỗi người còn đúng 1 lá – tự lật lần lượt từ người ăn vòng 5. <b>Ai ăn vòng 6 là TỚI</b> 🏆, hốt cả nồi.</li></ul>
      <h3>Ví dụ</h3><p>Còn An và Bình. An ăn vòng 5, giữ <b>A♠</b> ra vòng 6 → không ai có bích lớn hơn A → <b>An tới</b>. Nếu An ra <b>7♦</b> mà Bình còn <b>9♦</b> → <b>Bình tới</b>.</p>
      ${row('7D 9D')}
      <h3>Mẹo</h3><ul><li>Vòng đầu cố ăn 1 vòng để khỏi chết, xong rồi thì <b>úp lá nhỏ</b>, giữ lá to cho lật bài.</li><li>Đè người đang ☠️ để họ chết bớt, đỡ cạnh tranh vòng cuối 😈.</li></ul>`],
    white: ['🀄 Tới trắng', () => `
      <h3>Tới trắng (thắng ngay khi chia)</h3><p>Vừa chia xong mà ai có 1 trong các bộ sau là <b>thắng luôn</b>, khỏi đánh (chủ phòng bật/tắt từng loại ở sảnh):</p><ul>
        <li><b>Tứ quý</b>: 4 lá cùng số (vd. 4 lá K). ${row('KS KC KD KH 3S 9D')}</li>
        <li><b>6 lá đồng chất</b> (cùng 1 chất): ${row('2H 5H 8H JH QH AH')}</li>
        <li><b>6 lá nhỏ hơn 6</b> (toàn 2, 3, 4, 5): ${row('2S 3C 3D 4H 5S 5C')}</li></ul>
      <p>Nhiều người cùng tới trắng: <b>tứ quý &gt; đồng chất &gt; 6 lá nhỏ</b>. Cùng loại thì so tứ quý to hơn / lá to nhất lớn hơn; vẫn hoà thì người gần cái hơn thắng.</p>`],
    chips: ['🪙 Chip & tuỳ chọn', () => `
      <p class="safe">🎈 <b>Chỉ chơi vui bằng chip ảo.</b> Chip không mua, không bán, không đổi ra tiền hay quà gì hết. <b>Không cá cược tiền thật.</b></p>
      <h3>Nồi & cược</h3><p>Đầu mỗi ván, ai cũng góp <b>tiền cược</b> (mặc định 50 chip) vào nồi. <b>Người tới hốt cả nồi.</b> Người chết hay thua đều mất phần cược đã góp.</p>
      <p>Hết chip thì bấm <b>🧧 Xin mẹ thêm chip</b> (được 1000 chip). Không đủ cược thì mẹ tự dúi thêm – không ai bị đuổi khỏi bàn.</p>
      <h3>Luật thưởng (tuỳ chọn, mặc định tắt)</h3><ul>
        <li><b>Tới trắng ăn gấp đôi</b>: mỗi nhà trả thêm 1 cược.</li>
        <li><b>Ăn trọn 4 vòng</b> (cả bàn chết): mỗi nhà trả thêm ½ cược.</li>
        <li><b>Tới bằng lá nhỏ</b> (từ 3 người): tới bằng lá càng nhỏ càng ăn đậm – mỗi người còn sống tới vòng 5 trả thêm (14 − số lá) × ¼ cược: K = ¼, Q = ½, … 2 = 3 cược. Tới bằng Át thì không thưởng.
          <div class="g-row" style="align-items:center;gap:10px">${cardHTML(parseCard('2H'), 'sm')}<small>tới bằng 2♥ → mỗi người còn sống trả thêm <b>3 cược</b></small></div></li>
        <li><b>Thối Át</b>: người chết mà còn giữ Át trên tay phạt 1 cược mỗi lá Át cho người tới.</li></ul>
      <h3>Khác</h3><ul><li><b>Đồng hồ</b> mỗi lượt (mặc định 25 giây). Hết giờ máy đánh giùm. Ai rớt mạng thì bot tạm đánh thay, vào lại là chơi tiếp.</li>
      <li>Hết ván, 9 giây sau tự chia ván mới (chủ phòng bấm <b>Ván tiếp</b> cho nhanh). Bạn bè vào giữa chừng sẽ ngồi ghế chờ, ván sau được chia bài.</li></ul>
      <p class="muted">Luật Cát tê mỗi nơi chơi mỗi kiểu – bản này theo cách chơi phổ biến nhất (đè/úp 4 vòng, chết nếu không ăn vòng nào, vòng 5 chưng, vòng 6 ai ăn là tới).</p>`],
  };
  let cur = 'basic';
  const html = () => `<div class="guide"><div class="g-head"><h2>📖 Luật Cát tê</h2><button class="chip sm" data-close aria-label="Đóng">✕</button></div>
    <div class="g-tabs">${Object.entries(tabs).map(([k, [n]]) => `<button class="chip sm ${k === cur ? 'on' : ''}" data-g="${k}">${n}</button>`).join('')}</div>
    <div class="g-body">${tabs[cur][1]()}</div></div>`;
  openModal(html(), 'wide guide-box');
  const box = document.querySelector('#modal-box');
  box.onclick = e => {
    const b = e.target.closest('[data-g]'); if (b) { cur = b.dataset.g; box.innerHTML = html(); return; }
    if (e.target.closest('[data-close]')) window.__closeModal();
  };
}
