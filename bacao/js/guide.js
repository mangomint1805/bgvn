// Hướng dẫn chơi Ba Cào (tiếng Việt, có ví dụ lá bài vẽ sẵn + ảnh chụp game). Nội dung đổi theo luật bàn hiện tại.
import { row } from './cards.js?v=1';
import { DEFAULT_OPTS } from './engine.js?v=1';
import { gp, ill } from '../../shared/ui/guidepics.js?v=1';
import { GI, GV } from './guide-img.js?v=1';
const H = (...cs) => `<span class="g-hand">${row(...cs)}</span>`;

export function openGuide(openModal, opts = DEFAULT_OPTS) {
  const o = { ...DEFAULT_OPTS, ...(opts || {}) }; const P = gp(GI, GV);
  const pot = o.mode === 'pot';
  const order = o.sap === 'top' && o.batay ? 'Sáp &gt; Ba tây &gt; bài điểm (9 nút … 0 nút)' : o.sap === 'mid' && o.batay ? 'Ba tây &gt; Sáp &gt; bài điểm (9 nút … 0 nút)'
    : o.sap !== 'off' ? 'Sáp &gt; bài điểm (9 nút … 0 nút)' : o.batay ? 'Ba tây &gt; bài điểm (9 nút … 0 nút)' : 'Chỉ so điểm: 9 nút … 0 nút';
  const tieTxt = o.tie === 'suit' ? 'so <b>lá có chất to nhất</b> của mỗi bên: <b>Rô ♦ &gt; Cơ ♥ &gt; Bích ♠ &gt; Chuồn ♣</b> (tép). Cùng chất thì so số: A &gt; K &gt; Q &gt; … &gt; 2.'
    : o.tie === 'rank' ? 'so <b>lá số to nhất</b> của mỗi bên: A &gt; K &gt; Q &gt; J &gt; 10 &gt; … &gt; 2. Cùng số thì so chất ♦ &gt; ♥ &gt; ♠ &gt; ♣.'
      : `<b>hoà</b> – ${pot ? 'những người bằng nhau chia đều gà' : 'nhà cái trả lại tiền cược, không ai mất gì'}.`;
  const tabs = {
    basic: ['🃏 Cơ bản', `
      <p class="g-free">💛 <b>Chỉ chơi vui bằng chip ảo.</b> Chip không nạp, không rút, không đổi ra tiền hay quà gì hết. Hết chip thì bấm <b>🥺 Xin mẹ thêm chip</b> là có lại vốn.</p>
      ${P.quick([
        ['q-home', 'Trang chủ Ba Cào: ô tên, nút Tạo phòng online, Chơi với bot', '① Nhập tên → ② <b>Chơi với bot</b>, hoặc ③ <b>Tạo phòng online</b> rồi gửi mã / link cho hội bạn.'],
        ['q-lobby', 'Phòng chờ: danh sách người chơi, nút Thêm bot, nút Vào bàn', '① Thêm bot (chỉnh luật bàn ngay bên dưới) → ② <b>Vào bàn</b>.'],
        ['bet', 'Đặt cược: hàng đồng chip, ô tổng cược, nút Chốt cược', '① Bấm đồng chip cộng tiền cược → ② xem tổng → ③ <b>Chốt cược</b>. (Chơi gà thì chỉ bấm <b>Góp gà</b>.)'],
        ['peek', 'Nặn bài: 3 lá úp, kéo lá để hé, ô điểm, nút Lật nhanh và Chốt', '① <b>Kéo</b> từng lá úp để hé từ từ (hoặc chạm 1 cái) → ② ô điểm hiện khi đủ 3 lá → ③ <b>Lật nhanh</b> / ④ <b>Chốt bài!</b>'],
      ])}
      <h3>Mục tiêu</h3><p>Mỗi người có <b>3 lá</b>. Ai có bài <b>nhiều nút hơn</b> (gần 9 nhất) thì thắng. Bài đặc biệt${o.batay ? ' <b>Ba tây</b>' : ''}${o.sap !== 'off' ? `${o.batay ? ' và' : ''} <b>Sáp</b>` : ''} thắng mọi bài điểm.</p>
      <h3>Một ván diễn ra thế nào?</h3><ol>
        <li>${pot ? `<b>Góp gà</b>: ai cũng góp <b>${o.ante} chip</b> vào giữa bàn.` : `<b>Đặt cược</b>: mọi người (trừ nhà cái 👑) chọn mức cược ${o.minBet}–${o.maxBet || 'tất tay'} chip rồi bấm <b>Chốt cược</b>.`}</li>
        <li><b>Chia bài</b>: mỗi người 3 lá úp.</li>
        <li>${o.nan ? `<b>Nặn bài 🤏</b>: tự kéo hé từng lá của mình (chỉ mình thấy), có ${o.peekTime} giây. Xong bấm <b>Chốt bài!</b>` : '<b>Lật luôn</b>: bàn này tắt nặn bài, chia xong là lật.'}</li>
        <li><b>Lật bài cùng lúc</b>: lần lượt từng người${pot ? '' : ', nhà cái lật cuối cùng'} – hồi hộp lắm nha 🥁.</li>
        <li><b>Tính chip</b>: ${pot ? 'bài to nhất <b>hốt hết gà</b>.' : 'mỗi người so riêng với nhà cái: hơn thì nhà cái trả, thua thì trả nhà cái.'}</li></ol>`],
    points: ['🔢 Tính điểm', `
      <h3>Giá trị lá bài</h3><ul>
        <li><b>A (xì)</b> = 1 nút.</li>
        <li>Lá <b>2 – 9</b>: đúng số trên lá.</li>
        <li><b>10, J, Q, K</b> = 10 → coi như <b>0 nút</b>.</li></ul>
      <p>Cộng 3 lá lại, <b>chỉ lấy số hàng đơn vị</b> (0–9). Ví dụ tổng 17 → <b>7 nút</b>, tổng 20 → <b>0 nút</b> (gọi là <b>bù</b> 😭). Cao nhất là <b>9 nút</b>.</p>
      ${ill([[H(['A', 'S'], ['2', 'H'], ['3', 'D']), '1 + 2 + 3 = <b>6 nút</b>'], [H(['7', 'C'], ['5', 'H'], ['9', 'D']), '7 + 5 + 9 = 21 → <b>1 nút</b>'], [H(['10', 'S'], ['J', 'H'], ['9', 'D']), '0 + 0 + 9 = <b>9 nút</b> 😎'], [H(['9', 'S'], ['8', 'H'], ['3', 'C']), '9 + 8 + 3 = 20 → <b>bù 0</b> 😭']])}
      <p>Máy tự cộng và hiện số to ngay cạnh bài của bạn khi bạn đã nặn đủ 3 lá.</p>`],
    special: ['👑 Ba tây & Sáp', `
      <h3>Thứ tự mạnh yếu (bàn này)</h3><p class="g-order">${order}</p>
      ${o.batay ? `<div class="g-ex">${H(['J', 'S'], ['Q', 'H'], ['K', 'D'])}<span><b>Ba tây</b> 👑 (còn gọi <i>ba cào</i>): cả 3 lá đều là <b>J, Q, K</b> (lá 10 không tính). Ăn <b>×${o.mBaTay}</b>.</span></div>` : '<p>Bàn này <b>không tính Ba tây</b> – 3 lá J/Q/K chỉ là bài bù 0 nút.</p>'}
      ${o.sap !== 'off' ? `<div class="g-ex">${H(['5', 'S'], ['5', 'H'], ['5', 'D'])}<span><b>Sáp</b> 🔥: 3 lá <b>cùng số</b>. Ăn <b>×${o.mSap}</b>. Hai sáp gặp nhau: <b>sáp A</b> to nhất, rồi K, Q … 2.</span></div>
        ${o.batay ? `<p>Ba lá J (hoặc Q, K) vừa là sáp vừa là ba tây → tính theo loại mạnh hơn (${o.sap === 'top' ? 'sáp' : 'ba tây'}).</p>` : ''}` : '<p>Bàn này <b>không tính Sáp</b> – 3 lá cùng số chỉ cộng điểm như thường.</p>'}
      <h3>Bằng nhau?</h3><p>Cùng ba tây, hoặc cùng số nút: ${tieTxt}</p>`],
    tie: ['⚖️ So chất', `
      <h3>Bằng điểm thì sao?</h3><p>Cùng số nút (hoặc cùng ba tây) thì ${tieTxt}</p>
      ${o.tie !== 'push' ? `${ill([[H(['5', 'D'], ['2', 'C'], ['10', 'C']), `7 nút – lá to nhất <b>${o.tie === 'suit' ? '5♦' : '10♣'}</b>`], ['<b class="g-vs">VS</b>', ''], [H(['5', 'H'], ['2', 'S'], ['10', 'H']), '7 nút – lá to nhất <b>10♥</b>']])}
        <p>${o.tie === 'suit' ? 'Bên trái thắng vì có lá <b>Rô ♦</b> (chất to nhất), dù bên phải có lá 10.' : 'Hai bên cùng có lá 10 to nhất → so chất: <b>10♥</b> thắng 10♣, bên phải thắng.'}</p>
        <div class="g-suits"><span class="r">♦ Rô</span>&gt;<span class="r">♥ Cơ</span>&gt;<span>♠ Bích</span>&gt;<span>♣ Chuồn</span></div>` : ''}
      <p>Lưu ý: so chất chỉ dùng khi <b>bằng nút</b>. 8 nút toàn chuồn vẫn thắng 7 nút có A♦.</p>`],
    pay: [pot ? '🐔 Chơi gà' : '👑 Nhà cái & chip', pot ? `
      <h3>Chơi gà (góp chung)</h3><ul>
        <li>Ai cũng góp <b>${o.ante} chip</b> → gà giữa bàn = ${o.ante} × số người.</li>
        <li>Lật bài, ai <b>to nhất</b> hốt hết gà.${o.tie === 'push' ? ' Bằng nhau thì chia đều.' : ''}</li>
        <li>Thắng bằng ${o.batay ? `ba tây (×${o.mBaTay})` : ''}${o.batay && o.sap !== 'off' ? ' / ' : ''}${o.sap !== 'off' ? `sáp (×${o.mSap})` : ''}: mỗi người thua <b>trả thêm</b> (hệ số − 1) × tiền góp.</li></ul>
      <h3>Ví dụ (5 người, góp ${o.ante})</h3><ul><li>Bạn 9 nút to nhất → hốt ${o.ante * 5} (lãi <b>+${o.ante * 4}</b>).</li>${o.batay ? `<li>Bạn ba tây ×${o.mBaTay} → hốt ${o.ante * 5} + 4 × ${o.ante * (o.mBaTay - 1)} = lãi <b>+${o.ante * 4 + 4 * o.ante * (o.mBaTay - 1)}</b>.</li>` : ''}<li>Thua → mất ${o.ante} chip góp.</li></ul>`
      : `
      <h3>Nhà cái làm gì?</h3><ul>
        <li>Nhà cái không cược, mà <b>ăn/đền với từng người</b>.</li>
        <li>Bài người chơi to hơn cái → nhà cái trả <b>tiền cược × hệ số bài người chơi</b>.</li>
        <li>Bài nhà cái to hơn → người chơi trả <b>tiền cược × hệ số bài nhà cái</b>.</li>
        <li>Hệ số: bài điểm ×1${o.batay ? ` · ba tây ×${o.mBaTay}` : ''}${o.sap !== 'off' ? ` · sáp ×${o.mSap}` : ''}.</li></ul>
      <h3>Ví dụ (cược 50 chip)</h3><ul>
        <li>Bạn 8 nút, cái 6 nút → <b>+50</b>.</li>
        ${o.batay ? `<li>Bạn ba tây, cái 9 nút → <b>+${50 * o.mBaTay}</b>.</li>` : ''}
        ${o.sap !== 'off' ? `<li>Cái sáp, bạn 9 nút → <b>−${50 * o.mSap}</b>.</li>` : ''}
        <li>Cùng 7 nút → ${o.tie === 'push' ? '<b>hoà</b>' : 'ai có lá to hơn (so chất) thắng'}.</li></ul>
      <h3>Ai làm cái?</h3><ul>
        <li><b>🔄 Xoay vòng</b>: mỗi ván chuyển sang người kế tiếp.</li>
        <li><b>📌 Cố định</b>: chủ phòng bấm 👑 cạnh tên để chọn.</li>
        <li><b>🤖 Bot làm cái</b>: 1 bot ngồi cái, ai cũng làm "con".</li>
        <li><b>🃏 Ai ba tây thì làm cái</b>: ai ăn nhà cái bằng ba tây / sáp thì ván sau lên cái.</li></ul>`],
    opts: ['⚙️ Tuỳ chọn & mẹo', `
      <h3>Tuỳ chọn trong sảnh (chủ phòng chỉnh)</h3><ul>
        <li><b>Kiểu chơi</b>: có nhà cái / chơi gà góp chung.</li>
        <li><b>Vốn, cược tối thiểu – tối đa</b> (có "tất tay"), <b>tiền góp gà</b>.</li>
        <li><b>Ba tây</b> có tính không, <b>Sáp</b> xếp trên hay dưới ba tây, hay không tính.</li>
        <li><b>Bằng điểm</b>: so chất / so lá to / hoà.</li>
        <li><b>Hệ số</b> ba tây (×1–×3), sáp (×1–×5).</li>
        <li><b>Nặn bài</b> bật/tắt và thời gian nặn. Hết giờ máy tự lật giùm.</li></ul>
      <h3>Mẹo nhỏ</h3><ul>
        <li>Ba Cào là game <b>hên xui</b> – không có rút thêm hay bỏ bài, nên đừng tất tay liên tục nha 😅</li>
        <li>Nút <b>🎯</b> trên thanh công cụ hiện cửa thắng ước tính của bài bạn (chỉ khi chơi với bot).</li>
        <li>Bấm vào dòng <b>Ván …</b> ở trên cùng để xem bảng chip cả bàn.</li></ul>
      <p class="g-free">Chơi vui bằng chip ảo, không cá cược tiền thật. Bản fan-made phi thương mại.</p>`],
  };
  const keys = Object.keys(tabs);
  const html = `<button class="close-x" onclick="__closeModal()" aria-label="Đóng">✕</button><h2>📖 Hướng dẫn Ba Cào</h2>
    <div class="g-tabs">${keys.map((k, i) => `<button class="chip ${i ? '' : 'on'}" data-gt="${k}">${tabs[k][0]}</button>`).join('')}</div>
    <div class="g-body" id="g-body">${tabs.basic[1]}</div>`;
  openModal(html, 'guide');
  document.querySelectorAll('[data-gt]').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-gt]').forEach(x => x.classList.toggle('on', x === b));
    const body = document.getElementById('g-body'); body.innerHTML = tabs[b.dataset.gt][1]; body.scrollTop = 0;
  });
}
