// Hướng dẫn chơi Xì dách (tiếng Việt, có ví dụ). Nội dung lấy theo tuỳ chọn bàn hiện tại nếu có.
import { row } from './cards.js?v=2';
import { DEFAULT_OPTS } from './engine.js?v=2';
import { gp } from '../../shared/ui/guidepics.js?v=1';
import { GI, GV } from './guide-img.js?v=1';
const H = (...cs) => `<span class="g-hand">${row(...cs)}</span>`;

export function openGuide(openModal, opts = DEFAULT_OPTS) {
  const o = { ...DEFAULT_OPTS, ...(opts || {}) }; const P = gp(GI, GV);
  const tabs = {
    basic: ['🃏 Cơ bản', `
      <p class="g-free">💛 <b>Chỉ chơi vui bằng chip ảo.</b> Chip không nạp, không rút, không đổi ra tiền hay quà gì hết. Hết chip thì bấm <b>🥺 Xin mẹ thêm chip</b> là có lại vốn.</p>
      ${P.quick([
        ['q-home', 'Trang chủ Xì dách: ô tên, nút Chơi với bot, Tạo phòng online', '① Nhập tên → ② <b>Chơi với bot</b>, hoặc ③ <b>Tạo phòng online</b> rồi gửi mã cho hội bạn.'],
        ['q-lobby', 'Phòng chờ: danh sách người chơi, nút Thêm bot, nút Vào bàn', '① Thêm bot (chọn ai làm cái, vốn, cược… ngay bên dưới) → ② <b>Vào bàn</b>.'],
        ['bet', 'Đặt cược: hàng đồng chip, ô tổng cược, nút Chốt cược', '① Bấm đồng chip để cộng tiền cược → ② xem tổng → ③ <b>Chốt cược</b>.'],
        ['turn', 'Tới lượt: bài nhà cái úp, 2 lá của bạn được 20 điểm, nút Rút và Dằn', '① Nhà cái (bài úp). ② Bài của bạn, ③ điểm tự tính. ④ <b>Rút</b> thêm lá hoặc ⑤ <b>Dằn</b> để dừng.'],
      ])}
      <h3>Mục tiêu</h3><p>Mỗi người chơi đấu riêng với <b>nhà cái 👑</b>: ai có bài <b>gần 21 điểm hơn</b> (mà không quá 21) thì thắng. Người chơi không đấu với nhau.</p>
      <h3>Một ván diễn ra thế nào?</h3><ol>
        <li>${P.fig('bet', 'Hàng đồng chip 10, 50, 100, 200 và nút Chốt cược', '')}<b>Đặt cược</b>: mọi người (trừ nhà cái) bấm các đồng chip để chọn mức cược (${o.minBet}–${o.maxBet ? o.maxBet : 'tất tay'} chip) rồi bấm <b>Chốt cược</b>.</li>
        <li><b>Chia bài</b>: mỗi người 2 lá úp. Ai có <b>Xì bàn</b> hoặc <b>Xì dách</b> thì lật ngay (xem tab Bài đặc biệt).</li>
        <li><b>Rút / Dằn</b>: lần lượt từng người (bắt đầu từ bên trái nhà cái). Bấm <b>Rút</b> để lấy thêm lá, <b>Dằn</b> để dừng. Tối đa <b>5 lá</b>.</li>
        <li><b>Nhà cái rút & xét bài</b>: nhà cái rút tới khi đủ <b>${o.caiMin} điểm</b>, rồi lật (xét) từng người hoặc xét hết cả bàn.</li>
        <li><b>Tính chip</b>: thắng thì nhà cái trả, thua thì trả cho nhà cái. Xong ván, nhà cái ${o.caiMode === 'rotate' ? 'xoay sang người kế tiếp' : o.caiMode === 'xidach' ? 'đổi sang người có xì dách (nếu có)' : 'giữ nguyên'}.</li></ol>
      ${P.fig('turn', 'Lượt rút: điểm hiện to cạnh bài, nút Rút và Dằn', 'Số to cạnh bài là điểm hiện tại, kèm chữ “đủ tuổi” hay “non”.')}
      <h3>Đủ tuổi & Non</h3><p>Người chơi phải có ít nhất <b>${o.minPts} điểm</b> mới được Dằn ("đủ tuổi"). Dưới ${o.minPts} gọi là <b>non</b> 🍼 – ${o.allowNon ? 'bàn này cho phép dằn non, nhưng lật ra là <b>thua chắc</b> (kể cả khi nhà cái quắc).' : 'nút Dằn bị khoá, phải rút tiếp.'}</p>
      <div class="g-ex">${H(['9', 'S'], ['5', 'H'])}<span>14 điểm: <b>non 🍼</b> – chưa đủ ${o.minPts}, phải rút tiếp</span></div>
      <h3>Quắc 💥</h3><div class="g-ex">${H(['K', 'C'], ['8', 'H'], ['6', 'D'])}<span>10 + 8 + 6 = <b>24 → quắc 💥</b></span></div><p>Quá 21 điểm là <b>quắc</b> (cháy). Bị quắc thì tự hết lượt, bài vẫn úp – không ai biết cho tới lúc nhà cái xét. Cầu cho nhà cái quắc theo 🙏 (cùng quắc thì ${o.bothBust === 'hoa' ? '<b>hoà</b>' : '<b>nhà cái vẫn ăn</b>'}).</p>`],
    points: ['🔢 Tính điểm', `
      <h3>Giá trị lá bài</h3><ul>
        <li>Lá <b>2 – 10</b>: đúng số trên lá.</li>
        <li><b>J, Q, K</b>: mỗi lá <b>10 điểm</b>.</li>
        <li><b>A (xì)</b>: ${o.aceRule === 'vn' ? 'tuỳ số lá trên tay (luật Việt):<ul><li>2 lá: A = <b>11 hoặc 10</b></li><li>3 lá: A = <b>10 hoặc 1</b></li><li>4–5 lá: A = <b>1</b></li></ul>' : '<b>1 hoặc 11</b> lúc nào cũng được (kiểu blackjack).'}</li></ul>
      <p>Máy tự chọn cách tính <b>có lợi nhất</b> (cao nhất mà không quá 21) và hiện số to ngay cạnh bài của bạn.</p>
      <h3>Ví dụ</h3>
      <div class="g-ex">${H(['A', 'S'], ['5', 'H'])}<span>2 lá: A = 11 → <b>16</b> (đủ tuổi)</span></div>
      <div class="g-ex">${H(['A', 'S'], ['5', 'H'], ['5', 'D'])}<span>${o.aceRule === 'vn' ? '3 lá: A = 10 → <b>20</b>' : 'A = 11 → <b>21</b>'}</span></div>
      <div class="g-ex">${H(['A', 'S'], ['5', 'H'], ['9', 'D'])}<span>${o.aceRule === 'vn' ? '3 lá: A = 10 thì quắc nên A = 1 → <b>15</b> (non, rút tiếp)' : 'A = 1 → <b>15</b> (non, rút tiếp)'}</span></div>
      <div class="g-ex">${H(['K', 'C'], ['Q', 'H'], ['5', 'D'])}<span>10 + 10 + 5 = <b>25 → quắc 💥</b></span></div>
      <div class="g-ex">${H(['9', 'S'], ['6', 'H'])}<span>15 điểm: ${o.minPts > 15 ? 'non 🍼 – phải rút tiếp' : 'đủ tuổi (bàn này tối thiểu 15)'}</span></div>`],
    special: ['⭐ Bài đặc biệt', `
      <p>Xếp từ mạnh tới yếu:</p>
      <div class="g-ex">${H(['A', 'H'], ['A', 'S'])}<span><b>Xì bàn</b> – 2 lá A. Mạnh nhất. Ăn <b>×${o.mXiBan}</b> tiền cược.</span></div>
      <div class="g-ex">${H(['A', 'D'], ['K', 'S'])}<span><b>Xì dách</b> – A + một lá 10/J/Q/K (chỉ khi có đúng 2 lá). Ăn <b>×${o.mXiDach}</b>.</span></div>
      <div class="g-ex">${H(['2', 'S'], ['3', 'H'], ['4', 'D'], ['A', 'C'], ['5', 'S'])}<span><b>Ngũ linh</b> 🖐️ – đủ 5 lá mà không quá 21 (dù chỉ 15 điểm). Ăn <b>×${o.mNguLinh}</b>. Thua xì bàn & xì dách, thắng mọi bài thường.</span></div>
      <div class="g-ex"><span class="g-hand"><b class="g-big">16–21</b></span><span><b>Bài thường</b> (đủ tuổi): điểm cao hơn thắng, bằng điểm thì hoà. Ăn ×1.</span></div>
      <h3>Lật ngay khi vừa chia</h3><ul>
        <li><b>Nhà cái</b> có xì bàn / xì dách: lật ngay, so với cả bàn liền. Ai không có bài đặc biệt bằng hoặc hơn thì thua (đền theo hệ số bài của nhà cái), không ai được rút nữa.</li>
        <li><b>Người chơi</b> có xì bàn / xì dách (nhà cái không có): lật ngay và được nhà cái trả tiền luôn.</li>
        <li>Cùng xì dách (hoặc cùng xì bàn) với nhà cái thì <b>hoà</b>. Xì bàn của người chơi thắng xì dách của nhà cái.</li></ul>
      <h3>Cùng ngũ linh?</h3><p>Ai <b>ít điểm hơn</b> thì thắng, bằng điểm thì hoà.</p>`],
    cai: ['👑 Nhà cái & xét bài', `
      <h3>Nhà cái làm gì?</h3><ul>
        <li>Nhà cái không đặt cược, mà <b>ăn/đền với từng người</b>.</li>
        <li>Sau khi mọi người rút xong, nhà cái rút tới khi đủ <b>${o.caiMin} điểm</b> mới được xét bài (chưa đủ thì nút Xét bị khoá).</li>
        <li>Quá 21 là nhà cái <b>quắc</b>: lật hết, đền cho mọi người chưa quắc ${o.bothBust === 'hoa' ? '(người cũng quắc thì hoà)' : '(người cũng quắc thì vẫn thua nhà cái)'}.</li>
        <li>Nhà cái rút đủ 5 lá chưa quắc là <b>ngũ linh</b>, tự lật hết.</li></ul>
      <h3>Mẹo hay: xét sớm 👀</h3><p>Đủ ${o.caiMin} điểm rồi, nhà cái có thể bấm <b>Xét</b> trên ghế <b>từng người</b> – lật riêng người đó và tính tiền theo bài hiện tại của nhà cái – rồi <b>rút tiếp</b> để đấu với những người còn lại. Bấm <b>Xét hết</b> để lật cả bàn.</p>
      <div class="g-ex"><span class="g-hand">${row(['9', 'C'], ['6', 'D'])}</span><span>Ví dụ: nhà cái 15 điểm. Xôi đã rút tới 4 lá (dễ quắc) → xét Xôi trước${o.bothBust === 'hoa' ? ' (nếu Xôi quắc thì ăn chắc, đỡ bị hoà khi lỡ mình quắc sau)' : ''}. Gấu Bông dằn ngay với 2 lá (chắc ≥ 16) → nhà cái 15 thì thua chắc, nên <b>rút thêm</b> rồi mới xét Gấu Bông.</span></div>
      <p>Đã xét ai thì kết quả người đó <b>giữ nguyên</b>, nhà cái rút thêm hay quắc sau cũng không đổi.</p>
      <h3>Ai làm cái?</h3>${P.fig('cai', 'Lựa chọn Ai làm cái trong phòng chờ, đang chọn Bot làm cái', 'Chủ phòng chọn trong phòng chờ (ở đây: 🤖 Bot làm cái).')}<ul>
        <li><b>🔄 Xoay vòng</b>: mỗi ván chuyển sang người kế tiếp.</li>
        <li><b>📌 Cố định</b>: chủ phòng chọn 1 người làm cái suốt.</li>
        <li><b>🤖 Bot làm cái</b>: 1 bot ngồi cái, ai cũng được làm "con".</li>
        <li><b>🃏 Ai xì dách thì làm cái</b>: ván nào có người xì bàn/xì dách (mà nhà cái không có) thì ván sau người đó lên cái.</li></ul>`],
    pay: ['🪙 Ăn thua & ví dụ', `
      <div class="g-ex">${H(['A', 'D'], ['K', 'S'])}<span>vs</span>${H(['10', 'C'], ['9', 'H'])}<span>Bạn <b>xì dách</b>, nhà cái 19 → bạn ăn <b>×${o.mXiDach}</b> tiền cược</span></div>
      <h3>Tính chip</h3><p>Thắng: nhận <b>tiền cược × hệ số</b> từ nhà cái. Thua: trả nhà cái <b>tiền cược × hệ số</b>. Hoà: giữ nguyên. Hệ số lấy theo bài của <b>bên thắng</b>:</p>
      <table class="g-tbl"><tr><th>Bài thắng</th><th>Hệ số bàn này</th></tr><tr><td>Xì bàn</td><td>×${o.mXiBan}</td></tr><tr><td>Xì dách</td><td>×${o.mXiDach}</td></tr><tr><td>Ngũ linh</td><td>×${o.mNguLinh}</td></tr><tr><td>Bài thường / nhà cái quắc</td><td>×1</td></tr></table>
      <h3>Ví dụ (cược 50 chip)</h3><ul>
        <li>Bạn 19, nhà cái 18 → <b>+50</b>.</li>
        <li>Bạn xì dách → <b>+${50 * o.mXiDach}</b> ngay lúc chia.</li>
        <li>Nhà cái xì bàn, bạn 20 → <b>−${50 * o.mXiBan}</b>.</li>
        <li>Bạn ngũ linh 18, nhà cái 20 → <b>+${50 * o.mNguLinh}</b>.</li>
        <li>Bạn quắc 24, nhà cái quắc 23 → ${o.bothBust === 'hoa' ? '<b>hoà</b>' : '<b>−50</b> (cùng quắc nhà cái ăn)'}.</li>
        <li>Bạn 17, nhà cái quắc → <b>+50</b>.</li>
        <li>Bạn 18, nhà cái 18 → <b>hoà</b>.</li></ul>
      <h3>Hết chip?</h3><p>Chip có thể bị âm nếu thua đậm (thua xì bàn ×${o.mXiBan}). Còn dưới mức cược tối thiểu thì bấm <b>🥺 Xin mẹ thêm chip</b> để về lại ${o.startChips} chip – không ai bị loại cả. Về sảnh rồi chơi tiếp vẫn giữ chip.</p>`],
    opts: ['⚙️ Tuỳ chọn & mẹo', `
      <h3>Tuỳ chọn trong sảnh (chủ phòng chỉnh)</h3><ul>
        <li><b>Ai làm cái</b>: xoay vòng / cố định / bot / ai xì dách thì làm cái.</li>
        <li><b>Vốn, cược tối thiểu, cược tối đa</b> (có "tất tay").</li>
        <li><b>Điểm tối thiểu</b> để dằn (15/16) và để nhà cái được xét (15/16).</li>
        <li><b>Hệ số</b> xì bàn / xì dách / ngũ linh (×1–×3).</li>
        <li><b>Cùng quắc</b>: nhà cái ăn hoặc hoà.</li>
        <li><b>Lá A</b>: kiểu Việt (đổi theo số lá) hoặc linh hoạt 1/11.</li>
        <li><b>Dằn non</b>: cho phép (lật ra thua) hoặc khoá.</li>
        <li><b>Thời gian lượt</b>: treo máy quá giờ thì máy làm giùm (cược mức thấp nhất, rút/dằn như bot).</li></ul>
      <h3>Mẹo nhỏ</h3><ul>
        <li>16–17 điểm với 2 lá: rút thì dễ quắc (lá ≥ 6 là cháy), dằn thì dễ thua nhà cái. Tuỳ gan 😅</li>
        <li>4 lá mà mới 12–14 điểm: rút thêm rất đáng – trúng là <b>ngũ linh ×${o.mNguLinh}</b>!</li>
        <li>Làm cái: xét sớm người rút nhiều lá, để dành người dằn 2 lá cho sau khi rút thêm.</li></ul>
      <p class="g-free">Chơi vui bằng chip ảo, không cá cược tiền thật. Bản fan-made phi thương mại.</p>`],
  };
  const keys = Object.keys(tabs);
  const html = `<button class="close-x" onclick="__closeModal()" aria-label="Đóng">✕</button><h2>📖 Hướng dẫn Xì dách</h2>
    <div class="g-tabs">${keys.map((k, i) => `<button class="chip ${i ? '' : 'on'}" data-gt="${k}">${tabs[k][0]}</button>`).join('')}</div>
    <div class="g-body" id="g-body">${tabs.basic[1]}</div>`;
  openModal(html, 'guide');
  document.querySelectorAll('[data-gt]').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-gt]').forEach(x => x.classList.toggle('on', x === b));
    const body = document.getElementById('g-body'); body.innerHTML = tabs[b.dataset.gt][1]; body.scrollTop = 0;
  });
}
