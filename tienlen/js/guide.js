// Hướng dẫn luật Tiến Lên miền Nam (tiếng Việt, có ví dụ lá bài)
import { cardHTML } from './cards.js?v=6';
import { PAY, TOI_TRANG, DEFAULT_OPTS, VE_HEO } from './engine.js?v=5';
import { gp } from '../../shared/ui/guidepics.js?v=1';
import { GI, GV } from './guide-img.js?v=1';

const R = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'], SU = '♠♣♦♥';
const ids = t => t.split(' ').map(x => R.indexOf(x.slice(0, -1)) * 4 + SU.indexOf(x.slice(-1)));
const ex = (t, cap = '') => `<div class="g-ex"><div class="crow mini">${ids(t).map(c => cardHTML(c)).join('')}</div>${cap ? `<small>${cap}</small>` : ''}</div>`;

export function guideHTML(opts = DEFAULT_OPTS) {
  const P = gp(GI, GV, '.g-pair{display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:center;align-items:flex-end}.g-pair .g-ex{margin:4px 0}');
  const pair = (...xs) => `<div class="g-pair">${xs.join('')}</div>`;
  const b = opts.bet || 10, u = n => `<b>${n} phần</b> (${n * b} chip)`;
  return `<button class="close-x" onclick="__closeModal()" aria-label="Đóng">✕</button>
<h2>📖 Luật Tiến Lên miền Nam</h2>
<div class="guide">
<p class="g-lead">2–4 người, mỗi người <b>13 lá</b>. Ai đánh hết bài trước là <b>về nhất</b>. Ván chơi tiếp tới khi xếp xong nhất – nhì – ba – bét.</p>
${P.quick([
  ['q-home', 'Trang chủ Tiến Lên: ô tên, nút Chơi với bot, Tạo phòng online', '① Nhập tên → ② <b>Chơi với bot</b>, hoặc ③ <b>Tạo phòng online</b> rồi gửi mã cho hội bạn.'],
  ['q-lobby', 'Phòng chờ: danh sách người chơi, nút Thêm bot, nút Chia bài', '① Thêm bot cho đủ 2–4 người (luật bàn chỉnh ngay bên dưới) → ② <b>Chia bài</b>.'],
  ['turn', 'Đang chặn Đôi 6: chọn lá Q, hàng gợi ý hiện Đôi Q, nút Đánh và Bỏ lượt', '① Bài đang trên bàn (Đôi 6). Chạm ② một lá → ③ gợi ý bộ ghép được (Đôi Q), chạm để chọn cả bộ → ④ <b>Đánh</b>. Không chặn được thì ⑤ <b>Bỏ lượt</b>.'],
])}

<h3>1. Lá nào lớn hơn?</h3>
<p>Số: <b>3 &lt; 4 &lt; 5 … 10 &lt; J &lt; Q &lt; K &lt; A &lt; 2</b>. Lá 2 gọi là <b>heo</b> 🐷 – lớn nhất.</p>
<p>Cùng số thì so chất: <b>♠ bích &lt; ♣ chuồn (tép) &lt; ♦ rô &lt; ♥ cơ</b>.</p>
${ex('3♠ 3♣ 3♦ 3♥', '3♠ nhỏ nhất bộ bài, 2♥ (heo cơ) lớn nhất')}

<h3>2. Các bộ được đánh</h3>
<div class="g-grid">
${ex('9♥', '<b>Lẻ</b> – 1 lá')}
${ex('7♠ 7♦', '<b>Đôi</b> – 2 lá cùng số')}
${ex('Q♠ Q♣ Q♥', '<b>Sám</b> (bộ ba)')}
${ex('5♠ 5♣ 5♦ 5♥', '<b>Tứ quý</b> – 4 lá cùng số')}
${ex('4♦ 5♠ 6♣ 7♥', '<b>Sảnh</b> – ≥ 3 lá liên tiếp')}
${ex('8♠ 8♥ 9♣ 9♦ 10♠ 10♥', '<b>3 đôi thông</b> – ≥ 3 đôi liên tiếp')}
</div>
<p>Vài sảnh 4 lá có <b>tên vui</b> hiện trên bàn khi đánh ra (luật y như sảnh thường):</p>
${pair(ex('3♠ 4♦ 5♣ 6♥', '3→6: <b>“3 năm 6 tháng có là chi 💔”</b>'), ex('6♣ 7♦ 8♠ 9♥', '6→9: <b>“Sống bằng tình cảm 🥹”</b>'))}
<p>⚠️ Sảnh và đôi thông <b>không được có heo</b> (Q-K-A được, K-A-2 thì không). Sảnh dài nhất là 3 → A.</p>
${pair(ex('Q♠ K♦ A♥', '✅ Q-K-A là sảnh'), ex('K♠ A♦ 2♥', '❌ K-A-2 không phải sảnh'))}

<h3>3. Chặn bài</h3>
<p>Người sau phải đánh <b>cùng loại, cùng số lá</b> nhưng <b>lớn hơn</b>. So bằng lá to nhất của bộ.</p>
${ex('6♠ 7♠ 8♦', '')}<p class="g-arrow">bị chặn bởi</p>${ex('6♣ 7♦ 8♥', 'Sảnh 6→8 có 8♥ lớn hơn 8♦')}
<p>Không đánh được hoặc không muốn đánh thì bấm <b>Bỏ lượt</b>. ⛔ Đã bỏ thì <b>bị khoá tới hết vòng</b> – người khác đánh tiếp cũng không được vào lại.</p>
<p>Khi mọi người khác đều bỏ, người đánh cuối <b>cầm cái</b>: mở vòng mới, đánh bộ gì cũng được. Nếu người đó vừa về (hết bài), người kế tiếp được <b>hưởng sái</b> cầm cái.</p>

<h3>4. Chặt heo 🔪🐷</h3>
<table class="g-tb"><tr><th>Hàng</th><th>Chặt được</th></tr>
<tr><td><b>3 đôi thông</b></td><td>1 heo lẻ</td></tr>
<tr><td><b>Tứ quý</b></td><td>1 heo, đôi heo, 3 đôi thông (và tứ quý nhỏ hơn)</td></tr>
<tr><td><b>4 đôi thông</b></td><td>heo, đôi heo, tứ quý, 3 đôi thông (và 4 đôi thông nhỏ hơn)</td></tr></table>
${ex('2♥', 'Heo cơ…')}<p class="g-arrow">bị chặt bởi</p>${ex('4♠ 4♥ 5♣ 5♦ 6♠ 6♥', '3 đôi thông → Bị chặt heo kìa 🐷🔪')}
<p>Chặt là <b>ăn chip ngay</b> của người bị chặt: heo đen (♠♣) ${u(PAY.heoDen)}, heo đỏ (♦♥) ${u(PAY.heoDo)}, 3 đôi thông ${u(PAY.dt3)}, tứ quý ${u(PAY.tuQuy)}, 4 đôi thông ${u(PAY.dt4)}.</p>
<p><b>Chặt chồng</b> (tuỳ chọn, mặc định bật): A đánh heo, B chặt bằng tứ quý, C chặt tiếp bằng 4 đôi thông → B phải đền C <b>cả heo lẫn tứ quý</b> (người bị chặt sau cùng chịu hết).</p>
<p>Lưu ý: hàng chỉ đánh được <b>khi tới lượt</b> và chưa bỏ lượt trong vòng đó.</p>

<h3>5. Ai đi trước?</h3>
<p><b>Ván đầu</b>: người có <b>3♠</b> đi trước và nước đầu <b>phải có 3♠</b> (lẻ, đôi, sám hay sảnh có 3♠ đều được). Chơi 2–3 người mà không ai có 3♠ thì người giữ lá nhỏ nhất đi trước, kèm lá đó.</p>
${pair(ex('3♠', '✅ đánh lẻ 3♠'), ex('3♠ 3♥', '✅ đôi có 3♠'), ex('3♠ 4♦ 5♣', '✅ sảnh có 3♠'), ex('4♣ 4♥', '❌ thiếu 3♠'))}
<p><b>Ván sau</b>: người về nhất ván trước đi trước, đánh tự do. (Tuỳ chọn "Ván nào cũng 3♠ đi trước".)</p>

<h3>6. Tới trắng ⚡ <small>(tuỳ chọn, mặc định bật)</small></h3>
<p>Vừa chia bài mà có 1 trong các bộ sau là <b>thắng ngay</b>, mỗi người khác trả ${u(PAY.toiTrang)}:</p>
<ul>${Object.values(TOI_TRANG).map(t => `<li>${t}</li>`).join('')}</ul>
${pair(ex('3♠ 4♦ 5♣ 6♥ 7♠ 8♦ 9♣ 10♥ J♠ Q♦ K♣ A♥', '<b>Sảnh rồng</b> 3→A (12 lá liên tiếp)'), ex('2♠ 2♣ 2♦ 2♥', '<b>Tứ quý heo</b>'))}
<p>Nhiều người cùng tới trắng thì xét theo thứ tự trên (sảnh rồng lớn nhất).</p>

<h3>7. Hết ván: hạng, thối, cóng</h3>
<ul>
<li><b>Tiền hạng</b> – 4 người: bét trả nhất ${u(2)}, ba trả nhì ${u(1)}. 3 người: ba trả nhất ${u(2)}, nhì trả nhất ${u(1)}. 2 người: thua trả thắng ${u(2)}.</li>
<li><b>Thối heo</b> 🐷💨: người còn bài lúc hết ván (bét) mà còn heo phải trả người nhất: heo đen ${u(PAY.heoDen)}, heo đỏ ${u(PAY.heoDo)} mỗi lá.</li>
<li><b>Thối hàng</b> 💣 <small>(tuỳ chọn, mặc định bật)</small>: còn tứ quý / đôi thông trên tay cũng bị phạt theo giá trị hàng như trên.</li>
<li><b>Cóng</b> 🥶: đã có người về nhất mà bạn <b>chưa đánh được lá nào</b> → thua ngay, xếp bét, phạt thêm ${u(PAY.cong)} cho người nhất (và vẫn bị thối heo/hàng).</li>
</ul>
<h3 id="g-veheo">🐷 Cấm về heo <small>(luật nhà, đang chọn: ${VE_HEO[opts.veHeo || DEFAULT_OPTS.veHeo]})</small></h3>
<p>Nhiều hội chơi luật <b>"không được về heo"</b>: nước đánh <b>cuối cùng</b> (nước làm bạn hết bài) không được có lá 2. Bản "+ hàng" cấm luôn về bằng <b>tứ quý</b> hay <b>đôi thông</b> (kể cả 3 đôi thông).</p>
<ul>
<li>Giữa ván vẫn đánh heo / hàng bình thường – chỉ cấm khi nó là nước <b>về</b>. Vì vậy nhớ <b>giữ lại một lá thường</b> để về.</li>
<li>Đang chặn mà chỉ còn heo → không đánh được, tự bỏ lượt.</li>
<li>Tới lượt cầm cái mà trên tay chỉ còn bài bị cấm (vd. còn đúng 1 lá heo) → <b>kẹt heo</b> 😵: ngồi chờ, xếp <b>bét</b> và bị <b>thối heo / hàng</b> như thường. Còn nhiều lá (vd. đôi heo + lá khác) thì vẫn đánh được phần không làm bạn hết bài.</li>
<li>${pair(ex('2♥', '❌ còn đúng heo: không về được'), ex('7♦ 7♥ 7♣ 7♠', '❌ về bằng tứ quý (bản + hàng)'), ex('9♦', '✅ chừa 1 lá thường để về'))}</li>
<li>Chọn trong sảnh: <b>Cấm về heo + hàng</b> (mặc định) · <b>Cấm về heo</b> · <b>Cho phép</b>.</li>
</ul>
${pair(ex('2♥ 9♠', 'Chi bét, trên tay còn 2♥ → bị <b>thối heo</b>'))}
<p>Ví dụ 4 người, cược ${b}: An về nhất, Chi bét còn 2♥ → Chi trả An ${2 * b} (hạng) + ${PAY.heoDo * b} (thối heo cơ) = <b>${(2 + PAY.heoDo) * b} chip</b>.</p>

<h3>8. Chip ảo 🪙</h3>
<p>Mỗi người bắt đầu với 1000 chip. Mức cược (1 phần) chọn trong sảnh: 10 / 20 / 50. Hết chip thì bấm <b>"🥺 Xin mẹ thêm chip"</b> – mẹ cho 1000, không ai bị loại.</p>
<p class="g-warn">🎈 Chơi vui bằng chip ảo, không cá cược tiền thật. Không có nạp / rút / quy đổi gì hết.</p>

<h3>9. Tuỳ chọn trong sảnh (mặc định)</h3>
<ul>
<li>Cược 1 phần: <b>${DEFAULT_OPTS.bet} chip</b></li>
<li>Tới trắng: <b>bật</b> · Thối hàng: <b>bật</b> · Chặt chồng: <b>bật</b></li>
<li>🐷 Cấm về: <b>heo + hàng</b> (tứ quý, đôi thông)</li>
<li>Ván nào cũng 3♠ đi trước: <b>tắt</b> (ván sau người thắng đi trước)</li>
<li>Giờ mỗi lượt: <b>${DEFAULT_OPTS.turnTime} giây</b> – hết giờ máy đánh giúp (rớt mạng thì máy đánh thay sau vài giây)</li>
</ul>

<h3>10. Mẹo bấm</h3>
${P.fig('turn', 'Chọn lá Q, hàng gợi ý hiện Đôi Q, nút Đánh sáng lên', 'Chạm 1 lá → gợi ý bộ ghép được hiện ngay phía trên hàng nút.')}
<ul>
<li>Chạm lá để chọn / bỏ chọn. Chạm 1 lá → các lá ghép được với nó sáng lên, hàng gợi ý hiện ra phía trên, chạm gợi ý là chọn cả bộ.</li>
<li><b>💡 Gợi ý</b>: máy chọn giúp nước hợp lý, bấm tiếp để đổi gợi ý khác.</li>
<li>Lá mờ = không dùng được để chặn bài đang trên bàn.</li>
<li>🔃 đổi cách xếp bài: theo số hoặc gom theo bộ.</li>
</ul>
<p class="note">Bản fan-made phi thương mại · Chơi vui bằng chip ảo, không cá cược tiền thật.</p>
</div>`;
}
