// Hướng dẫn luật Ma Sói (tiếng Việt)
import { ROLES, ROLE_ORDER } from './engine.js?v=2';
import { roleCardSVG } from './art.js?v=2';

const LONG = {
  wolf: 'Mỗi đêm cả bầy thức dậy, bàn nhau trong <b>kênh chat Sói</b> rồi cùng chọn 1 nạn nhân. Thống nhất thì chốt ngay; hết giờ mà còn lệch thì lấy <b>đa số</b> (hoà thì bốc thăm). Sói biết mặt nhau. Ban ngày giả làm dân lành.',
  alpha: 'Là Sói như mọi con Sói khác, nhưng <b>Tiên Tri soi ra “không phải Sói”</b>. Trùm cuối thứ thiệt 😈.',
  cub: 'Sói nhỏ của bầy. Nếu Sói Con <b>chết</b> (bị treo, bị bắn, bị độc…), <b>đêm kế tiếp bầy Sói được cắn 2 người</b> để trả thù.',
  villager: 'Không có phép gì. Nhiệm vụ: nghe – nghĩ – nghi – và bỏ phiếu đúng người.',
  seer: 'Mỗi đêm chọn 1 người để soi: biết người đó <b>có phải Sói hay không</b> (Sói Trùm soi ra là dân). Ban ngày có thể bấm <b>📢 Khai kết quả soi</b> – nhưng khai rồi là Sói biết mặt đó!',
  guard: 'Mỗi đêm chọn 1 người (được chọn chính mình) để <b>che chở khỏi Sói cắn</b>. <b>Không được bảo vệ cùng 1 người 2 đêm liền.</b> Không chặn được thuốc độc.',
  witch: 'Có <b>1 bình cứu</b> và <b>1 bình độc</b>, mỗi bình dùng <b>1 lần cả ván</b>. Lúc thức dậy biết ai vừa bị Sói cắn → có thể cứu. Bình độc giết 1 người bất kỳ (không tự độc mình). Có thể dùng cả 2 bình trong cùng 1 đêm.',
  hunter: 'Khi chết (bị cắn, bị treo, chết theo người yêu…) được <b>bắn kéo theo 1 người</b>. <b>Ngoại lệ: bị Phù Thủy đầu độc thì không bắn được</b> (thuốc ngấm, tay run).',
  cupid: 'Đêm đầu tiên chọn <b>2 người</b> (có thể gồm chính mình) làm cặp đôi. Hai người biết nhau (và vai của nhau), có kênh chat riêng 💘. <b>Một người chết thì người kia chết theo.</b>',
  elder: 'Da dày: <b>lần đầu bị Sói cắn vẫn sống</b> (máy báo riêng cho bạn). Lần cắn thứ 2 thì chết. Bị treo / bị độc / bị bắn thì chết bình thường.',
  idiot: 'Nếu bị dân làng <b>treo cổ</b>: lộ vai Kẻ Ngốc, được tha, <b>sống tiếp nhưng mất quyền bỏ phiếu</b> (vẫn chat được). Bị treo lần 2 thì chết thật. Chết vì cách khác thì chết bình thường.',
  tanner: 'Chán đời, muốn chết. Nếu bị <b>dân làng treo cổ</b> thì <b>thắng một mình</b>, ván kết thúc ngay – mọi người khác thua. Bị Sói cắn chết thì thua.',
};
export function openGuide(openModal) {
  const roleRow = r => `<div class="g-role"><div class="g-card">${roleCardSVG(r)}</div><div><h4>${ROLES[r].emoji} ${ROLES[r].name}${ROLES[r].fun ? ' <small class="fun">vai vui</small>' : ''}</h4><p>${LONG[r]}</p></div></div>`;
  const tabs = {
    basic: ['🌕 Cơ bản', () => `
      <h3>Hai phe</h3><p><b>Phe Sói</b> 🐺 trà trộn vào làng, đêm nào cũng ăn thịt 1 người. <b>Phe Dân Làng</b> 🧑‍🌾 phải tìm ra và treo cổ hết Sói. Không ai biết vai của ai (trừ Sói biết đồng bọn).</p>
      <h3>Thắng thua</h3><ul>
        <li><b>Dân thắng</b> khi không còn con Sói nào sống.</li>
        <li><b>Sói thắng</b> khi số Sói ≥ số người còn lại.</li>
        <li><b>Cặp Đôi khác phe</b> (Sói yêu Dân 💘): thành phe thứ ba, thắng khi <b>chỉ còn đúng 2 người họ</b> sống sót.</li>
        <li><b>Thằng Chán Đời</b> thắng một mình nếu bị treo cổ.</li></ul>
      <p>Máy kiểm tra thắng thua sau mỗi pha. Sau 30 ngày mà chưa xong thì hoà.</p>
      <h3>Một vòng chơi</h3><ol>
        <li><b>🌙 Đêm</b>: các vai lần lượt thức dậy theo thứ tự: Thần Tình Yêu (chỉ đêm 1) → Bảo Vệ → Tiên Tri → Bầy Sói → (Sói cắn thêm nếu Sói Con vừa chết) → Phù Thủy. Vai đã chết vẫn được “gọi” vài giây cho khỏi lộ.</li>
        <li><b>🐓 Sáng</b>: gà gáy, máy công bố ai chết đêm qua (mặc định <b>không lộ vai</b>, chủ phòng có thể bật “lộ vai khi chết”).</li>
        <li><b>☀️ Thảo luận</b>: có đồng hồ. Chat chung, <b>chạm vào người để chỉ điểm 🫵</b>. Ai cũng bấm “Sẵn sàng bỏ phiếu” thì vào bầu luôn.</li>
        <li><b>⚖️ Bỏ phiếu treo cổ</b>: chạm vào người muốn treo, hoặc “Bỏ qua”. Ai nhiều phiếu nhất bị treo (nếu số phiếu bỏ qua ≥ thì không treo ai). Hoà phiếu: <b>bầu lại 1 lần</b> giữa những người hoà (hoặc không treo ai – tuỳ chủ phòng).</li>
        <li><b>🪢 Lời trăng trối</b>: người bị treo được nói 1 câu (15 giây) rồi chết.</li>
        <li>Lại đến đêm…</li></ol>
      <h3>Người chết</h3><p>Thành hồn ma 👻: xem được <b>mọi thứ</b> (vai mọi người, chat Sói) nhưng chỉ nói chuyện trong <b>kênh Hồn ma</b>. Đừng mách bài nha!</p>`],
    roles: ['🃏 Các vai', () => `<div class="g-roles">${ROLE_ORDER.map(roleRow).join('')}</div>`],
    rules: ['📜 Luật khó', () => `
      <h3>Bảo Vệ + Phù Thủy cùng cứu 1 người</h3><p>Mặc định: người đó <b>sống</b>. Chủ phòng có thể bật luật <b>“sữa đổ”</b>: được cứu 2 lần cùng lúc thì… <b>chết</b> (kiểu Ma Sói hội Trung Quốc).</p>
      <h3>Thợ Săn</h3><ul><li>Chết vì Sói, bị treo, chết theo người yêu, bị bắn → <b>được bắn</b>.</li><li>Bị Phù Thủy đầu độc (kể cả cùng đêm bị Sói cắn) → <b>không bắn được</b>.</li><li>Không bắn trong 25 giây → coi như hạ nỏ.</li></ul>
      <h3>Cặp đôi</h3><ul><li>Chết dây chuyền: người yêu chết vì bất kỳ lý do gì thì người kia chết theo ngay.</li><li>Cùng phe: vẫn thắng theo phe mình (Thần Tình Yêu luôn ở phe Dân).</li><li>Khác phe: hai người thành phe riêng, chỉ thắng khi còn lại đúng 2 người họ.</li></ul>
      <h3>Già Làng</h3><p>Lần đầu bị cắn mà <b>không</b> được ai cứu: sống, mất “mạng phụ”. Nếu được Bảo Vệ/Phù Thủy cứu thì vẫn giữ mạng phụ.</p>
      <h3>Kẻ Ngốc</h3><p>Bị treo lần đầu: không cần trăng trối, lộ vai, sống, mất quyền bầu. Lần 2: chết.</p>
      <h3>Sói Con</h3><p>Chết vào ngày/đêm nào thì <b>đêm kế tiếp</b> bầy Sói có 2 lượt cắn (2 nạn nhân khác nhau). Phù Thủy thấy cả 2 nhưng chỉ cứu được 1.</p>
      <h3>Bỏ phiếu</h3><ul><li><b>Công khai</b>: thấy ai bầu ai ngay lúc bầu. <b>Ẩn</b>: chỉ thấy ai đã bầu, cuối cùng mới công bố số phiếu.</li><li>Hồn ma và Kẻ Ngốc đã lộ không được bầu. Không tự bầu mình.</li></ul>
      <h3>Hết giờ / rớt mạng</h3><p>Máy làm quản trò: hết giờ pha thì tự chốt (vai không chọn thì coi như bỏ lượt). Ai rớt mạng thì sau 8 giây máy làm giùm, vào lại (tải lại trang) là tiếp tục chơi.</p>`],
    room: ['📱 Chơi chung phòng', () => `
      <h3>Ngồi chung 1 phòng thật</h3><ol>
        <li>Một người <b>tạo phòng</b>, mọi người mở web trên <b>điện thoại riêng</b> và nhập mã (hoặc quét link được chia sẻ).</li>
        <li>Thiếu người thì chủ phòng thêm bot 🤖 cho đủ.</li>
        <li>Lúc nhận vai: <b>bấm giữ</b> lá bài để lật, thả tay là úp lại. Trong ván, nút <b>“Giữ để xem vai”</b> cũng vậy – người bên cạnh liếc qua chỉ thấy lá úp.</li>
        <li>Ban đêm: <b>ai cũng cúi xuống điện thoại</b> (cả người không có việc) để không lộ ai đang bấm. Máy tự gọi từng vai.</li>
        <li>Bật <b>🗣️ Quản trò đọc</b> trên <b>1 máy</b> (máy chủ phòng, để giữa bàn) để có giọng dẫn truyện – nếu trình duyệt có giọng tiếng Việt.</li>
        <li>Ban ngày thì cãi nhau ngoài đời 😆, chỉ điểm và bỏ phiếu trên máy.</li></ol>
      <h3>Mẹo</h3><ul><li>Bảng 📒 trong khung chat là <b>sổ tay riêng</b>: kết quả soi, ai là người yêu, ai bị cắn…</li><li>Chỉnh nhạc/âm thanh ở thanh trên cùng. Tắt nhạc vẫn còn tiếng dế, gà gáy, sói tru.</li></ul>
      <p class="note">Bản fan-made phi thương mại. “Ma Sói” là trò chơi dân gian, luật tự do. Toàn bộ hình vẽ, chữ, âm thanh tự làm.</p>`],
  };
  const keys = Object.keys(tabs);
  const render = k => `<h2>📖 Hướng dẫn Ma Sói</h2><div class="g-tabs">${keys.map(x => `<button class="chip ${x === k ? 'on' : ''}" data-gt="${x}">${tabs[x][0]}</button>`).join('')}</div><div class="g-body">${tabs[k][1]()}</div><div class="btns"><button class="btn pri" onclick="__closeModal()">Đã hiểu 👍</button></div>`;
  const show = k => { openModal(render(k), 'guide'); document.querySelectorAll('[data-gt]').forEach(b => b.onclick = () => show(b.dataset.gt)); };
  show('basic');
}
