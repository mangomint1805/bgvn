// Hướng dẫn chơi – soạn theo sách luật chính thức BANG! (Emiliano Sciarra, dV Giochi)
import { CARD_INFO, CHARACTERS, ROLES, suitify } from './cards.js';
import { imgTag, avatarTag } from './images.js';
import { gp, ill } from '../../shared/ui/guidepics.js?v=1';
import { GI, GV } from './guide-img.js?v=1';

const KIND = { brown: 'Dùng ngay', blue: 'Trang bị', gun: 'Súng' };
const COUNT = { bang: 25, missed: 12, beer: 6, panic: 4, catbalou: 4, stagecoach: 2, wellsfargo: 1, store: 2, saloon: 1, indians: 2, duel: 3, gatling: 1,
  dynamite: 1, jail: 3, barrel: 2, scope: 1, mustang: 2, volcanic: 2, schofield: 3, remington: 1, carabine: 1, winchester: 1 };

function mini(type) {
  const i = CARD_INFO[type];
  return `<div class="pcard ${i.kind}" style="--w:92px"><div class="ctop"><span class="ktag">${i.kind === 'gun' ? 'Tầm ' + i.range : KIND[i.kind]}</span></div><div class="art">${imgTag(type)}</div><div class="cname">${i.name}</div></div>`;
}
function cardRow(type) {
  const i = CARD_INFO[type];
  return `<div class="g-card">${mini(type)}<div><h4>${i.name} <small>${i.en} · ${COUNT[type]} lá</small></h4><p>${suitify(i.desc)}</p></div></div>`;
}
function roleRow(r) {
  const R = ROLES[r];
  return `<div class="g-role"><div class="pcard role" style="--w:92px"><div class="ctop"><span class="ktag">Vai trò</span></div><div class="art">${imgTag(r)}</div><div class="cname">${R.name}</div></div><div><h4>${R.icon} ${R.name}</h4><p>${R.desc}</p></div></div>`;
}
function charRow(id) {
  const c = CHARACTERS[id];
  return `<div class="g-char"><div class="g-ava">${avatarTag(id)}</div><div><h4>${c.name} <small>${'●'.repeat(c.hp)} ${c.hp} máu</small></h4><p>${suitify(c.desc)}</p></div></div>`;
}

// Sơ đồ khoảng cách: 6 người quanh bàn
function distanceSVG() {
  const n = 6, cx = 160, cy = 120, rx = 125, ry = 85; const d = [0, 1, 2, 3, 2, 1];
  let s = `<svg viewBox="0 0 320 240" class="g-svg"><ellipse cx="${cx}" cy="${cy}" rx="${rx - 30}" ry="${ry - 25}" fill="var(--felt2)" stroke="var(--wood)" stroke-width="8"/>`;
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + i * 2 * Math.PI / n; const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
    const me = i === 0;
    s += `<circle cx="${x}" cy="${y}" r="20" fill="${me ? '#d4a63a' : '#3a2818'}" stroke="#f6ead2" stroke-width="2"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle" font-family="Oswald" font-size="${me ? 12 : 15}" fill="${me ? '#2a1a0a' : '#f6ead2'}">${me ? 'Bạn' : d[i]}</text>`;
  }
  return s + `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-family="Oswald" font-size="11" fill="var(--on2)">số = khoảng cách</text></svg>`;
}

export function guideHTML() {
  const brown = ['bang', 'missed', 'beer', 'saloon', 'stagecoach', 'wellsfargo', 'store', 'panic', 'catbalou', 'gatling', 'indians', 'duel'];
  const blue = ['barrel', 'mustang', 'scope', 'jail', 'dynamite'];
  const guns = ['volcanic', 'schofield', 'remington', 'carabine', 'winchester'];
  const P = gp(GI, GV, '.gp-ill .pcard{flex:none}');
  return `
<div class="g-head"><h2>📖 Hướng dẫn chơi BANG!</h2><button class="btn small" id="g-close">Đóng ✕</button></div>
<nav class="g-toc">
  <a href="#g-goal">Mục tiêu</a><a href="#g-setup">Chuẩn bị</a><a href="#g-turn">Một lượt</a><a href="#g-dist">Khoảng cách</a><a href="#g-draw">Lật bài</a>
  <a href="#g-brown">Lá nâu</a><a href="#g-blue">Lá xanh</a><a href="#g-guns">Súng</a><a href="#g-death">Bị loại</a><a href="#g-end">Kết thúc</a><a href="#g-chars">Nhân vật</a><a href="#g-tips">Mẹo</a><a href="#g-web">Chơi trên web</a>
</nav>
<div class="g-body">
<p class="g-lead">Miền Viễn Tây, 4–7 tay súng. Mỗi người giữ bí mật một <b>vai trò</b>, trừ Cảnh sát trưởng. Bạn phải đoán ai là đồng đội, ai là kẻ thù và bắn đúng người.</p>
${P.quick([
  ['q-home', 'Trang chủ BANG!: ô tên, nút Chơi một mình với bot, Tạo phòng', '① Nhập tên → ② <b>Chơi một mình với bot</b>, hoặc ③ <b>Tạo phòng</b> rồi gửi mã cho hội bạn.'],
  ['q-lobby', 'Phòng chờ: danh sách tay súng, nút Thêm bot, nút Bắt đầu', '① Thêm bot cho đủ 4–7 người → ② <b>Bắt đầu</b>.'],
  ['intro', 'Màn hình đầu ván: lá vai trò bí mật và nhân vật của bạn', 'Đầu ván xem <b>vai trò bí mật</b> + nhân vật của bạn (luôn hiện lại ở góc dưới bên trái).'],
  ['turn', 'Tới lượt: số khoảng cách trên mỗi người, lá BANG! sáng trên tay, nút Kết thúc lượt', '① Số vàng = khoảng cách tới người đó. ② Chạm lá <b>sáng viền</b> để đánh. Xong thì ③ <b>Kết thúc lượt</b>.'],
])}

<section id="g-goal"><h3>1. Vai trò và mục tiêu</h3>
<div class="g-grid2">${['sheriff', 'deputy', 'outlaw', 'renegade'].map(roleRow).join('')}</div>
<table class="g-table"><tr><th>Số người</th><th>Cảnh sát trưởng</th><th>Phó cảnh sát</th><th>Tội phạm</th><th>Kẻ hai mặt</th></tr>
<tr><td>4</td><td>1</td><td>–</td><td>2</td><td>1</td></tr><tr><td>5</td><td>1</td><td>1</td><td>2</td><td>1</td></tr>
<tr><td>6</td><td>1</td><td>1</td><td>3</td><td>1</td></tr><tr><td>7</td><td>1</td><td>2</td><td>3</td><td>1</td></tr></table>
<p class="g-note"><b>Khi nào vai trò bị lộ?</b> Cảnh sát trưởng lộ ngay từ đầu. Vai trò của những người khác chỉ lật lên khi họ <b>bị loại</b>, và hết ván thì lộ tất cả. Trên bàn, người chưa lộ có nhãn "❓ Chưa lộ".</p>
<p class="g-note">Kẻ hai mặt muốn thắng phải là <b>người cuối cùng còn sống</b>. Nếu Cảnh sát trưởng chết khi vẫn còn người khác, Tội phạm thắng (kể cả khi Tội phạm đã chết hết).</p></section>

<section id="g-setup"><h3>2. Chuẩn bị</h3><ul>
<li>Mỗi người nhận 1 vai trò bí mật và 1 nhân vật. Cảnh sát trưởng lật vai trò lên cho mọi người thấy.</li>
<li>Máu được thể hiện bằng <b>viên đạn</b> 🔸: số đạn = số máu của nhân vật (3 hoặc 4). <b>Cảnh sát trưởng được +1 viên.</b> Viên đạn xám là máu đã mất.</li>
<li>Mỗi người được chia số lá bằng số máu của mình.</li>
<li><b>Cảnh sát trưởng đi trước</b>, sau đó lần lượt theo chiều kim đồng hồ.</li></ul>
${P.fig('intro', 'Lá vai trò Kẻ hai mặt và lá nhân vật Rose Doolan', 'Mỗi người 1 vai trò bí mật + 1 nhân vật (ở đây: Kẻ hai mặt · Rose Doolan, 4 viên đạn).')}</section>

<section id="g-turn"><h3>3. Một lượt chơi gồm 3 bước</h3>
<ol class="g-steps"><li><b>Rút 2 lá</b> từ chồng bài. Hết chồng bài thì xào chồng bài bỏ làm chồng mới.</li>
<li><b>Đánh bài</b> tuỳ thích, nhưng:<ul><li>Mỗi lượt chỉ được đánh <b>1 lá BANG!</b></li><li>Không được có 2 lá cùng tên trước mặt.</li><li>Chỉ được có 1 khẩu súng (đánh súng mới thì súng cũ bị bỏ).</li></ul></li>
<li><b>Bỏ bớt bài</b>: cuối lượt, số lá trên tay không được nhiều hơn số máu hiện tại.</li></ol>
${P.fig('turn', 'Bàn chơi tới lượt bạn', 'Lá đánh được <b>sáng viền</b>; xong bấm <b>Kết thúc lượt</b> (thừa bài thì bỏ bớt).')}
<p class="g-note">Lá <b>nâu</b> dùng ngay rồi bỏ. Lá <b>xanh</b> đặt trước mặt và có tác dụng lâu dài cho đến khi bị lấy hoặc bỏ đi.</p></section>

<section id="g-dist"><h3>4. Khoảng cách và tầm bắn</h3>
<div class="g-flex">${distanceSVG()}<div><ul>
<li><b>Khoảng cách</b> giữa 2 người = số ghế ít nhất phải đi qua quanh bàn (người ngồi cạnh là 1). Người đã bị loại không tính.</li>
<li>Bạn chỉ <b>BANG!</b> được người có khoảng cách ≤ <b>tầm súng</b>. Không có súng thì dùng Colt .45 tầm 1.</li>
<li><b>Mustang</b>: người khác thấy bạn xa thêm 1. <b>Scope</b>: bạn thấy người khác gần đi 1.</li>
<li>Súng <b>không</b> làm thay đổi khoảng cách, nên <b>Panic!</b> vẫn chỉ dùng được với người cách 1.</li>
<li>Trên bàn, số trong vòng tròn vàng cạnh mỗi người là khoảng cách từ bạn tới họ.</li></ul></div></div>
${P.fig('target', 'Chọn lá BANG!: người trong tầm sáng viền đỏ, người ngoài tầm bị mờ', 'Chọn BANG! → ① người trong tầm <b>sáng viền đỏ</b>, ② người ngoài tầm bị mờ.')}</section>

<section id="g-draw"><h3>5. "Lật bài" là gì?</h3>
<p>Một số lá (Barrel, Jail, Dynamite) bắt bạn <b>lật lá trên cùng của chồng bài</b> rồi xem <b>chất</b> của nó: ra <span class="suit red">♥</span> Cơ thì thoát Jail / né được đạn; ra <span class="suit black">♠</span> Bích từ 2 đến 9 thì Dynamite phát nổ. Lá lật xong bị bỏ đi. Mỗi lá bài đều có số và chất ở góc trên bên trái.</p>
${ill([[mini('barrel'), 'Lật ra <span class="suit red">♥</span> → né được'], [mini('jail'), 'Lật ra <span class="suit red">♥</span> → ra tù'], [mini('dynamite'), 'Lật ra <span class="suit black">♠</span> 2–9 → <b>nổ</b>, mất 3 máu']])}</section>

<section id="g-brown"><h3>6. Lá nâu – dùng ngay</h3><div class="g-cards">${brown.map(cardRow).join('')}</div></section>
<section id="g-blue"><h3>7. Lá xanh – đặt trước mặt</h3><div class="g-cards">${blue.map(cardRow).join('')}</div>
<p class="g-note">Thứ tự đầu lượt: xét <b>Dynamite</b> trước, rồi mới tới <b>Jail</b>. Người bị nhốt vẫn có thể bị bắn và vẫn né được bình thường.</p></section>
<section id="g-guns"><h3>8. Súng</h3><div class="g-cards">${guns.map(cardRow).join('')}</div></section>

<section id="g-death"><h3>9. Hết máu và bị loại</h3>${ill([[mini('beer'), 'Còn Beer khi mất máu cuối → tự uống, sống tiếp'], [mini('bang'), 'Hạ Tội phạm → thưởng rút 3 lá']])}<ul>
<li>Mất máu cuối cùng thì bị loại, trừ khi dùng ngay 1 lá <b>Beer</b> (game tự dùng giúp bạn).</li>
<li>Người bị loại lật vai trò lên, bỏ hết bài trên tay và trước mặt.</li>
<li><b>Thưởng:</b> ai hạ một Tội phạm thì được rút 3 lá (kể cả người hạ là Tội phạm khác).</li>
<li><b>Phạt:</b> Cảnh sát trưởng lỡ hạ Phó cảnh sát thì phải bỏ hết bài trên tay và trước mặt.</li></ul></section>

<section id="g-end"><h3>10. Kết thúc ván</h3>${ill(['sheriff', 'outlaw', 'renegade'].map(r => [`<div class="pcard role" style="--w:80px"><div class="art">${imgTag(r)}</div><div class="cname">${ROLES[r].name}</div></div>`, r === 'sheriff' ? 'Phe Cảnh sát' : r === 'outlaw' ? 'Tội phạm' : 'Kẻ hai mặt']))}<ul>
<li><b>Phe Cảnh sát thắng</b> khi tất cả Tội phạm và Kẻ hai mặt bị loại.</li>
<li><b>Tội phạm thắng</b> khi Cảnh sát trưởng bị loại.</li>
<li><b>Kẻ hai mặt thắng</b> khi chỉ còn mình hắn sống sót.</li></ul></section>

<section id="g-chars"><h3>11. 16 nhân vật</h3><div class="g-chars">${Object.keys(CHARACTERS).map(charRow).join('')}</div></section>

<section id="g-tips"><h3>12. Mẹo cho người mới</h3><ul>
<li><b>Cảnh sát trưởng:</b> đừng bắn bừa, bắn nhầm Phó là mất trắng bài. Ưu tiên Barrel và Mustang để sống lâu.</li>
<li><b>Phó cảnh sát:</b> giấu vai trò, bảo vệ sếp bằng cách bắn người tấn công sếp.</li>
<li><b>Tội phạm:</b> dồn hoả lực vào Cảnh sát trưởng, phối hợp với nhau nhưng đừng lộ quá sớm.</li>
<li><b>Kẻ hai mặt:</b> khó nhất game. Giả làm Phó, giúp sếp diệt Tội phạm, cuối ván mới lật mặt.</li>
<li>Luôn giữ 1 lá Missed! hoặc Beer trên tay. Để ý ai bắn ai để đoán vai trò – bấm <b>⏪ Lượt vừa rồi</b> để xem lại.</li>
<li><b>🐣 Chế độ Người mới</b> (bật ở phòng chờ hoặc nút ⚙️ → 🐣): hiện mẹo theo vai trò và theo tình huống ngay trên bàn, ví dụ "Phó: đừng bắn sếp ⭐", "Máu thấp – uống Beer". Lần đầu chơi chế độ này tự bật; tắt đi thì máy nhớ luôn. Đang bật mà Phó/Kẻ hai mặt định bắn sếp thì game hỏi lại cho chắc.</li></ul></section>

<section id="g-web"><h3>13. Chơi trên web này</h3><ul>
<li><b>Tạo phòng</b> rồi gửi mã 5 ký tự hoặc link cho bạn bè. Thiếu người thì bấm <b>+ Thêm bot</b>.</li>
<li>Chủ phòng giữ tab mở suốt ván. Ai rớt mạng thì tải lại trang và vào cùng mã; sau 20 giây chưa về thì bot đánh thay.</li>
<li>Bấm lá sáng trên tay để đánh. Lá cần mục tiêu thì bấm tiếp vào người sáng viền đỏ; người ngoài tầm sẽ mờ đi.</li>
<li>Rê chuột lên lá bài (điện thoại: <b>nhấn giữ</b> lá bài) để xem mô tả; bấm vào người chơi để xem nhân vật và trang bị.</li>
<li><b>Đồng hồ:</b> mỗi lượt có 60 giây, mỗi lần phải đáp trả (né, bỏ bài…) có 20 giây. Hết giờ thì máy tự đánh thay để ván không bị treo.</li>
<li>Vai trò, mục tiêu và kỹ năng của bạn luôn hiện ở góc dưới bên trái. Ô vàng lớn là <b>tầm bắn</b> của bạn.</li>
<li>Thấy hiệu ứng nhanh quá? Chỉnh <b>Tốc độ hiệu ứng</b> (Chậm / Vừa / Nhanh) ở trang chủ hoặc thanh trên.</li>
<li><b>Né một chạm:</b> bị BANG!, Gatling, Indians hay Duel thì thanh nút dưới tay bài hiện sẵn nút xanh như "🛡️ Dùng Missed! ♠7" / "💥 Dùng BANG! ♥Q" – bấm một phát là xong. Vẫn có thể bấm lá viền xanh dưới tay, hoặc <b>Chịu đòn</b>.</li>
<li><b>Màu người chơi:</b> mỗi người có 1 màu riêng (chấm màu cạnh tên). Nhật ký và dòng tin giữa bàn tô tên theo màu đó cho dễ theo dõi.</li>
<li><b>⏪ Lượt vừa rồi</b> (thanh trên hoặc trong Nhật ký): tóm tắt mấy lượt gần nhất – ai bắn ai, né hay trúng, ai Panic! ai, ai nhốt ai… – kèm bảng <b>"Ai tấn công ai"</b> cả ván để đoán vai trò.</li>
<li><b>😂 Thả emoji / chọc nhau:</b> bấm nút 😂 (điện thoại: trong khung tên của bạn; máy tính: mép dưới bàn) để thả emoji hoặc câu chọc kiểu Viễn Tây như "Né đi cưng!", "Bang bang 🔫", "Uống Beer đi". Cả bàn đều thấy; bot thỉnh thoảng chọc lại.</li>
<li><b>📝 Có gì mới:</b> xem các bản cập nhật của game (ở trang chủ game hoặc nút ⚙️).</li>
<li><b>Bot</b> chơi theo vai: Phó không bao giờ bắn sếp và ưu tiên bắn kẻ vừa bắn sếp; Cảnh sát trưởng nghi kẻ vừa tấn công mình; Tội phạm dồn sức vào sếp; Kẻ hai mặt giữ sếp sống tới khi hết Tội phạm. Bot chỉ dùng thông tin công khai (ai đã đánh ai), không nhìn trộm vai trò.</li></ul>
<p class="g-note">Luật theo sách luật chính thức BANG! của Emiliano Sciarra (dV Giochi). Tranh minh hoạ: Remington, Russell, Harnett, Peto và các họa sĩ khác (public domain).</p></section>
</div>`;
}

export function openGuide(at) {
  let g = document.getElementById('guide');
  if (!g) { g = document.createElement('div'); g.id = 'guide'; g.className = 'guide'; document.body.appendChild(g); }
  g.innerHTML = `<div class="guide-box">${guideHTML()}</div>`;
  g.classList.remove('hidden');
  g.querySelector('#g-close').onclick = () => g.classList.add('hidden');
  g.onclick = e => { if (e.target === g) g.classList.add('hidden'); };
  g.querySelectorAll('.g-toc a').forEach(a => a.onclick = e => { e.preventDefault(); g.querySelector(a.getAttribute('href')).scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  if (at) setTimeout(() => g.querySelector(at)?.scrollIntoView(), 30);
}
