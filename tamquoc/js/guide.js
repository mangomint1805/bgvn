// Hướng dẫn luật Tam Quốc Sát (bản BGVN) – soạn lại bằng lời của hội, rút gọn hợp lý cho bản web.
import { CARD_INFO, GENERALS, SKILLS, KINGDOMS, ROLES, buildDeck, rolesFor, DECK_SIZE_BASE, DECK_SIZE_EXP, HORSE_NAMES, artKey } from './cards.js?v=7';
import { cardHTML, portrait } from './art.js?v=7';
import { IMG } from './images.js?v=7';

const deck = buildDeck(true);
const red = t => String(t).replace(/([♥♦])/g, '<span class="red">$1</span>');
const COUNT = {}; for (const c of deck) { const k = artKey(c); COUNT[k] = (COUNT[k] || 0) + 1; }
const sample = type => deck.find(c => artKey(c) === type);
function row(type) {
  const i = CARD_INFO[type];
  return `<div class="g-card">${cardHTML(sample(type), 'sm')}<div><h4>${i.name} <small>${COUNT[type]} lá</small></h4><p>${red(i.desc)}</p></div></div>`;
}
function general(id) {
  const g = GENERALS[id]; const k = KINGDOMS[g.kingdom];
  return `<div class="g-gen" style="--kc:${k.color}"><div class="g-ava">${portrait(id)}</div><div><h4>${g.name} <small>${k.name} · ${g.hp} máu · ${g.gender === 'f' ? 'nữ' : 'nam'}${g.lord ? ' · có thể làm Chúa' : ''}</small></h4>
    ${g.skills.map(sk => `<p><b>${SKILLS[sk].name}${SKILLS[sk].lord ? ' (Chúa)' : ''}:</b> ${red(SKILLS[sk].desc)}</p>`).join('')}</div></div>`;
}
function distSVG() {
  const n = 6, cx = 160, cy = 118, rx = 122, ry = 84; const d = [0, 1, 2, 3, 2, 1];
  let s = `<svg viewBox="0 0 320 236" class="g-svg"><ellipse cx="${cx}" cy="${cy}" rx="${rx - 34}" ry="${ry - 28}" fill="#f6e7c8" stroke="#a8432f" stroke-width="7"/>`;
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + i * 2 * Math.PI / n, x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a), me = i === 0;
    s += `<circle cx="${x}" cy="${y}" r="20" fill="${me ? '#e0a83a' : '#fffaf0'}" stroke="#2b211c" stroke-width="2"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-weight="800" font-size="${me ? 12 : 15}" fill="#2b211c">${me ? 'Bạn' : d[i]}</text>`;
  }
  return s + `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="11" fill="#7a5a3a">số = khoảng cách</text></svg>`;
}
const RN = { lord: 'Chúa', loyal: 'Trung', rebel: 'Phản', spy: 'Nội gián' };
function roleTable() {
  let h = '<table class="g-table"><tr><th>Người</th><th>👑 Chúa</th><th>🛡️ Trung</th><th>🔥 Phản</th><th>🎭 Nội</th></tr>';
  for (let n = 2; n <= 8; n++) { const r = rolesFor(n); const c = k => r.filter(x => x === k).length || '–'; h += `<tr><td>${n}</td><td>${c('lord')}</td><td>${c('loyal')}</td><td>${c('rebel')}</td><td>${c('spy')}</td></tr>`; }
  return h + '</table>';
}

export function guideHTML() {
  const basic = ['sat', 'ne', 'dao'];
  const tricks = ['wuzhong', 'guohe', 'shunshou', 'juedou', 'nanman', 'wanjian', 'taoyuan', 'wugu', 'jiedao', 'wuxie'];
  const delay = ['lebu', 'shandian'];
  const weapons = ['zhuge', 'cixiong', 'qinggang', 'hanbing', 'qinglong', 'zhangba', 'guanshi', 'fangtian', 'qilin'];
  const armor = ['bagua', 'renwang', 'plus', 'minus'];
  const byK = (k, exp) => Object.keys(GENERALS).filter(id => GENERALS[id].kingdom === k && !!GENERALS[id].exp === exp);
  const expCards = ['jiu', 'hoasat', 'loisat', 'huogong', 'tiesuo', 'bingliang', 'zhuque', 'guding', 'tengjia', 'baiyin'];
  return `
<div class="g-head"><h2>📖 Luật Tam Quốc Sát</h2><button class="btn sm" id="g-close">Đóng ✕</button></div>
<nav class="g-toc">
  <a href="#g-goal">Vai trò</a><a href="#g-setup">Chuẩn bị</a><a href="#g-turn">Một lượt</a><a href="#g-dist">Khoảng cách</a><a href="#g-basic">Lá cơ bản</a>
  <a href="#g-trick">Cẩm nang</a><a href="#g-delay">Trì hoãn</a><a href="#g-equip">Trang bị</a><a href="#g-judge">Phán định</a><a href="#g-dying">Hấp hối</a><a href="#g-gens">Võ tướng</a><a href="#g-exp">Mở rộng</a><a href="#g-learn">🎓 Tập chơi</a><a href="#g-web">Chơi trên web</a><a href="#g-tips">Mẹo</a><a href="#g-art">Nguồn tranh</a>
</nav>
<div class="g-body">
<p class="g-lead">Thời loạn Tam Quốc, 2–8 người ngồi quanh bàn. Mỗi người bí mật giữ một <b>thân phận</b> và điều khiển một <b>võ tướng</b> có kỹ năng riêng. Dùng bài Sát, Né, Đào, cẩm nang và trang bị để bảo vệ phe mình – nhưng ngoài Chúa công ra, chẳng ai biết ai là bạn, ai là thù!</p>

<section id="g-goal"><h3>1. Thân phận và cách thắng</h3>
<div class="g-roles">${Object.entries(ROLES).map(([k, r]) => `<div class="g-role r-${k}"><b>${r.icon} ${r.name}</b><p>${r.desc}</p></div>`).join('')}</div>
${roleTable()}
<ul>
<li><b>Chúa công</b> lộ mặt ngay từ đầu, được <b>+1 máu tối đa</b> (từ 3 người trở lên) và đi lượt đầu tiên.</li>
<li><b>Phe Chúa</b> (Chúa công + Trung thần) thắng khi mọi Phản tặc và Nội gián đều đã chết.</li>
<li><b>Phản tặc</b> thắng khi Chúa công chết (trừ trường hợp dưới) – kể cả những Phản tặc đã nằm xuống cũng thắng theo.</li>
<li><b>Nội gián</b> chỉ thắng khi là <b>người duy nhất còn sống</b>. Nếu Chúa công chết khi bàn còn người khác, Phản tặc thắng ngay.</li>
<li>Thân phận người khác chỉ lật lên khi họ tử trận (hết ván thì lật tất cả).</li>
</ul></section>

<section id="g-setup"><h3>2. Chuẩn bị</h3><ul>
<li>Bộ bài cơ bản ${DECK_SIZE_BASE} lá (bật bản mở rộng Quân Tranh: thêm ${DECK_SIZE_EXP} lá), mỗi lá có <b>chất</b> (♠ Bích, ♥ Cơ, ♣ Chuồn, ♦ Rô) và <b>số</b> (A–K) – dùng khi phán định.</li>
<li><b>Chọn tướng:</b> Chúa công chọn trước trong 3 tướng Chúa (Tào Tháo, Lưu Bị, Tôn Quyền) + 2 tướng ngẫu nhiên. Sau đó mọi người cùng lúc chọn 1 trong 3 tướng được chia.</li>
<li>Máu tối đa = số máu ghi trên tướng (Chúa công +1). Mỗi người nhận 4 lá, Chúa công đi trước rồi theo chiều kim đồng hồ.</li>
</ul></section>

<section id="g-turn"><h3>3. Một lượt gồm 6 pha</h3>
<ol class="g-steps">
<li><b>Chuẩn bị</b> – một số kỹ năng kích hoạt (Quan tinh, Lạc thần…).</li>
<li><b>Phán định</b> – lần lượt lật bài cho các lá trì hoãn trước mặt (Lạc bất tư thục, Thiểm điện), lá đặt sau phán trước.</li>
<li><b>Rút bài</b> – rút 2 lá (kỹ năng có thể thay đổi).</li>
<li><b>Ra bài</b> – dùng bao nhiêu lá cũng được, nhưng <b>mỗi lượt chỉ 1 Sát</b> (trừ Gia Cát liên nỏ, Bào hao). Bấm <i>Kết thúc</i> khi xong.</li>
<li><b>Bỏ bài</b> – số lá trên tay không được vượt quá <b>số máu hiện tại</b>; thừa thì tự chọn lá bỏ.</li>
<li><b>Kết thúc</b> – một số kỹ năng (Bế nguyệt) kích hoạt, rồi tới người kế tiếp.</li>
</ol></section>

<section id="g-dist"><h3>4. Khoảng cách và tầm đánh</h3>
<div class="g-flex">${distSVG()}<ul>
<li><b>Khoảng cách</b> = số ghế ngắn nhất giữa hai người (đi vòng bên nào cũng được), chỉ tính người còn sống.</li>
<li><b>Ngựa +1</b> (${HORSE_NAMES.plus.join(', ')}): người khác thấy bạn xa thêm 1. <b>Ngựa −1</b> (${HORSE_NAMES.minus.join(', ')}): bạn thấy người khác gần đi 1. Khoảng cách nhỏ nhất là 1.</li>
<li><b>Tầm đánh</b> mặc định 1, đeo vũ khí thì bằng tầm của vũ khí. <b>Sát</b> chỉ chọn được người có khoảng cách ≤ tầm đánh.</li>
<li><b>Thuận thủ khiên dương</b> chỉ với tới người cách bạn 1 (không tính tầm vũ khí). Các cẩm nang khác không giới hạn khoảng cách.</li>
<li>Trên bàn, mỗi ghế có huy hiệu số = khoảng cách từ bạn tới người đó; ghế viền đỏ là đang trong tầm đánh.</li>
</ul></div></section>

<section id="g-basic"><h3>5. Lá cơ bản</h3><div class="g-grid">${basic.map(row).join('')}</div>
<p class="g-note">Bị <b>Sát</b> thì cần đánh ra 1 <b>Né</b>, không có thì mất 1 máu. Nếu không còn lá đỡ được, máy tự cho bạn chịu đòn ngay khỏi phải chờ.</p></section>

<section id="g-trick"><h3>6. Cẩm nang (dùng ngay)</h3><div class="g-grid">${tricks.map(row).join('')}</div>
<p class="g-note"><b>Vô giải khả kích:</b> mỗi khi một cẩm nang sắp có tác dụng lên <i>một người</i> (Nam man / Vạn tiễn / Đào viên / Ngũ cốc tính riêng từng người), ai có Vô giải sẽ được hỏi trong khoảng 3 giây. Vô giải cũng bị Vô giải khác huỷ được – chồng bao nhiêu lớp cũng được, số lớp lẻ là cẩm nang bị huỷ.</p></section>

<section id="g-delay"><h3>7. Cẩm nang trì hoãn</h3><div class="g-grid">${delay.map(row).join('')}</div>
<p class="g-note">Lá trì hoãn nằm trong <b>vùng phán định</b> (hiện ngay dưới tên người chơi) và chỉ có tác dụng ở pha Phán định của người đó. Mỗi người chỉ có tối đa 1 lá cùng tên. Vô giải cũng huỷ được lá trì hoãn (khi phán định); Thiểm điện bị huỷ thì vẫn chuyền sang người kế tiếp.</p></section>

<section id="g-equip"><h3>8. Trang bị</h3>
<p>Đánh lá trang bị ra là đặt trước mặt (mỗi loại 1 ô: vũ khí, giáp, ngựa +1, ngựa −1). Đeo lá mới cùng ô thì lá cũ bị bỏ.</p>
<div class="g-grid">${weapons.map(row).join('')}</div><div class="g-grid">${armor.map(row).join('')}</div>
<p class="g-note">Hình binh khí do BGVN vẽ lại theo mô tả hình dáng trên Wikipedia: <b>Thanh long đao</b> (yển nguyệt đao) là lưỡi bản to gắn thẳng trên đầu cán, sống có khấc, cổ đao đầu rồng, cuối cán có mũi nhọn; <b>Xà mâu</b> có mũi giáo lượn sóng; <b>Phương thiên hoạ kích</b> có mũi giáo giữa và hai lưỡi trăng khuyết hai bên.</p></section>

<section id="g-judge"><h3>9. Phán định</h3><ul>
<li>Phán định = lật lá trên cùng của chồng bài, xem chất/số rồi bỏ đi.</li>
<li>Lạc bất tư thục: ra ♥ thì thoát, khác thì <b>bỏ qua pha Ra bài</b>. Thiểm điện: ra ♠2–♠9 thì mất 3 máu (không phải do ai gây), khác thì chuyền sang người kế tiếp.</li>
<li>Bát quái trận: ra đỏ (♥♦) là coi như đã Né. Kỹ năng Quỷ tài của Tư Mã Ý có thể đánh 1 lá trên tay thay cho lá phán định!</li>
</ul></section>

<section id="g-dying"><h3>10. Hấp hối, tử trận, thưởng phạt</h3><ul>
<li>Về 0 máu là <b>hấp hối</b>: bắt đầu từ người đang có lượt, lần lượt mọi người được hỏi có muốn đánh <b>Đào</b> cứu không (chính người hấp hối cũng tự ăn được). Đủ lên 1 máu thì sống tiếp.</li>
<li>Bản mở rộng: người hấp hối có thể tự uống <b>Rượu 🍶</b> thay Đào để hồi 1 máu (Rượu chỉ cứu được chính mình).</li>
<li>Không ai cứu: tử trận, lật thân phận, bỏ hết bài.</li>
<li>Giết một <b>Phản tặc</b>: người giết được thưởng rút 3 lá (kể cả Phản tặc giết đồng bọn).</li>
<li><b>Chúa công giết nhầm Trung thần</b>: Chúa phải bỏ hết bài trên tay và trang bị.</li>
</ul></section>

<section id="g-gens"><h3>11. Võ tướng cơ bản (${Object.keys(GENERALS).filter(k => !GENERALS[k].exp).length} tướng)</h3>
<p class="g-note">Kỹ năng ghi <b>(Chúa)</b> chỉ có tác dụng khi tướng đó là Chúa công. Kỹ năng chủ động hiện thành nút trong pha Ra bài; kỹ năng bị động tự kích hoạt.</p>
${Object.keys(KINGDOMS).map(k => `<h4 class="g-kd" style="--kc:${KINGDOMS[k].color}">${KINGDOMS[k].han} ${KINGDOMS[k].name}</h4><div class="g-gens">${byK(k, false).map(general).join('')}</div>`).join('')}
</section>

<section id="g-exp"><h3>12. Bản mở rộng Quân Tranh</h3>
<p>Chủ phòng bật/tắt ở phòng chờ: <b>Bản mở rộng Quân Tranh</b> (thêm ${DECK_SIZE_EXP} lá bài) và <b>Tướng mở rộng</b> (thêm ${Object.keys(GENERALS).filter(k => GENERALS[k].exp).length} võ tướng).</p>
<ul>
<li><b>Sát thương thuộc tính:</b> Hỏa Sát, Hỏa công, Chu tước vũ phiến gây sát thương <b>lửa 🔥</b>; Lôi Sát, Thiểm điện, Lôi kích gây sát thương <b>sét 🌩️</b>.</li>
<li><b>Xích sắt ⛓️:</b> người bị xích (Thiết tác liên hoàn) chịu sát thương lửa/sét thì được gỡ xích, và <b>mọi người khác đang bị xích</b> cũng lần lượt chịu cùng lượng sát thương cùng thuộc tính (rồi cũng được gỡ xích). Sát thương lan không lan tiếp.</li>
<li><b>Rượu 🍶:</b> mỗi lượt uống 1 lần trong pha ra bài – lá Sát kế tiếp lượt đó +1 sát thương (dù bị Né thì men rượu cũng hết). Hết lượt thì tỉnh. Khi chính mình hấp hối có thể uống Rượu thay Đào (chỉ cứu được mình).</li>
<li><b>Đọ bài 🀄</b> (Khu hổ, Thiên nghĩa): hai bên úp 1 lá trên tay rồi lật, số lớn hơn thắng (A = 1, K = 13; bằng nhau người khởi xướng thua).</li>
</ul>
<div class="g-grid">${expCards.map(row).join('')}</div>
<h4>Tướng mở rộng</h4>
${Object.keys(KINGDOMS).map(k => byK(k, true).length ? `<h4 class="g-kd" style="--kc:${KINGDOMS[k].color}">${KINGDOMS[k].han} ${KINGDOMS[k].name}</h4><div class="g-gens">${byK(k, true).map(general).join('')}</div>` : '').join('')}
<p class="g-note">Một số kỹ năng được BGVN rút gọn cho bản web (VD Bất khuất: lật 1 lá làm vết sẹo, khác số mọi vết cũ thì hồi về 1 máu; Cứ thủ: lượt sau bị bỏ qua).</p>
</section>

<section id="g-learn"><h3>🎓 Tập chơi &amp; gợi ý cho người mới</h3><ul>
<li><b>Trang chủ → "🎓 Tập chơi":</b> ván 4 người với 3 bot, bộ bài cơ bản (dễ nhớ), <b>không bấm giờ</b>, bot đánh chậm hơn cho dễ theo dõi. Chủ phòng online cũng có thể bật ô <b>"🎓 Tập chơi"</b> trong sảnh: cả phòng có gợi ý và gấp đôi thời gian suy nghĩ.</li>
<li><b>Gợi ý 💡:</b> khi tới lượt bạn, "thầy" cho biết nên làm gì và <b>vì sao</b> (VD: <i>Sát Tiến – đang trong tầm, Tiến có thể là Phản tặc</i>). Lá được gợi ý sáng viền vàng có số thứ tự, ghế mục tiêu có cờ 💡. Bấm <b>"👉 Làm theo"</b> (trên điện thoại: bấm vào khung gợi ý giữa bàn) để làm đúng nước đó, hoặc cứ tự đánh.</li>
<li>Khi bị hỏi đáp trả (bị Sát, Nam man, Vô giải, cứu người hấp hối…) thầy giải thích tình huống và nên đỡ hay chịu. Bấm <b>?</b> để xem giải thích đầy đủ + 6 pha của một lượt; bấm vào thanh pha (Đầu · Phán · Rút · Ra bài · Bỏ · Cuối) cũng xem được.</li>
<li>Gợi ý chỉ dùng <b>thông tin công khai</b> (ai từng đánh/cứu ai) và vai của chính bạn – không nhìn trộm bài hay vai người khác. Bật/tắt bất cứ lúc nào bằng nút <b>💡</b> trong ⚙️ (cả ván thường).</li>
<li><b>Kỹ năng:</b> bấm tên kỹ năng (chữ đỏ gạch chân, hoặc nút kỹ năng ở khu của bạn; nút kỹ năng trong pha Ra bài thì bấm giữ) để xem bảng chi tiết: tự động hay chủ động, khi nào dùng, cách bấm, 1 ví dụ.</li>
<li><b>Cờ nước</b> trên ghế ghi cả chữ Hán lẫn chữ Việt: 魏 Ngụy · 蜀 Thục · 吳 Ngô · 群 Quần.</li>
<li>Đầu ván có màn <b>bốc thẻ tre thân phận</b>: thẻ của bạn lật ra kèm ấn son, thẻ Chúa công lật cho cả bàn xem. Bấm "Bỏ qua" nếu vội.</li>
</ul></section>

<section id="g-web"><h3>13. Chơi trên web BGVN</h3><ul>
<li><b>Tạo phòng</b> rồi gửi mã 5 ký tự (hoặc link) cho bạn bè. 2–8 người, thiếu thì thêm bot. Chủ phòng giữ tab mở suốt ván.</li>
<li><b>Bấm lá sáng màu</b> để dùng; nếu lá có nhiều cách dùng (VD Quan Vũ dùng lá đỏ như Sát) sẽ hiện nút chọn. Sau đó bấm vào <b>ghế sáng viền đỏ</b> để chọn mục tiêu.</li>
<li>Nhấn giữ (điện thoại) hoặc rê chuột (máy tính) vào lá để xem mô tả đầy đủ. Bấm vào ghế để xem tướng, kỹ năng, trang bị của người đó.</li>
<li><b>Đồng hồ:</b> 60 giây cho pha Ra bài, 20 giây cho mỗi lần đáp trả, 3 giây cho cửa sổ Vô giải. Hết giờ máy tự quyết thay; treo máy 2 lần liền thì bot đánh hộ tới khi bạn bấm lại.</li>
<li>Rớt mạng hay lỡ tải lại trang? Mở lại trang là tự vào lại đúng chỗ ngồi; trong lúc vắng mặt bot sẽ đánh thay. Chủ phòng tải lại cũng giữ nguyên ván.</li>
<li>Không có lá đỡ thì máy tự cho chịu đòn luôn – không ai biết bạn hết Né đâu… trừ khi bạn hét lên 😅.</li>
</ul></section>

<section id="g-tips"><h3>14. Mẹo nhỏ</h3><ul>
<li><b>Trung thần</b>: đừng lộ quá sớm, hãy đỡ đòn cho Chúa và dùng Vô giải chặn Lạc bất lên Chúa.</li>
<li><b>Phản tặc</b>: dồn sức vào Chúa, nhưng tiêu diệt Trung thần lộ mặt trước nếu họ quá trâu.</li>
<li><b>Nội gián</b>: giữ thế cân bằng – phe nào mạnh quá thì kéo lại, và đừng để Chúa chết khi bàn còn đông.</li>
<li>Bot đoán phe qua hành động công khai: ai chém Chúa, ai cứu ai… Bạn cũng thế nhé!</li>
</ul></section>

<section id="g-art"><h3>15. Nguồn tranh minh hoạ</h3>
<p>Chân dung võ tướng là <b>tranh khắc gỗ minh hoạ Tam Quốc diễn nghĩa đời Thanh</b>; tranh trên lá bài là ukiyo-e (Utagawa Kuniyoshi, Katsushika Hokusai…) và tranh cổ Trung Hoa. Tất cả thuộc <b>phạm vi công cộng</b> (tác giả mất hơn 100 năm), lấy từ Wikimedia Commons, The Met và Cleveland Museum of Art (Open Access), BGVN chỉ cắt khung và thu nhỏ. Tướng chưa có tranh cổ đúng người thì dùng chân dung SVG tự vẽ. Binh khí và trang bị là hình SVG BGVN tự vẽ.</p>
<div class="g-credits">${Object.entries(IMG).filter(([, v]) => v.t).map(([k, v]) => `<p><b>${v.for || k}</b> – <a href="${v.u}" target="_blank" rel="noopener">${v.t}</a>${v.a ? ' · ' + v.a : ''}${v.d ? ' · ' + v.d : ''} · <i>${v.l}</i></p>`).join('')}</div>
</section>
<p class="g-foot">Bản fan-made phi thương mại của hội BGVN, luật rút gọn từ trò chơi bài Tam Quốc Sát; không liên kết với Yoka Games. Tranh minh hoạ là tranh khắc gỗ, tranh lụa cổ Trung Hoa (Minh, Thanh) và tranh ukiyo-e của Utagawa Kuniyoshi… thuộc phạm vi công cộng, lấy từ Wikimedia Commons, The Met và Cleveland Museum of Art (danh sách trong img/CREDITS.md). Khung bài, câu chữ và âm nhạc do BGVN tự làm.</p>
</div>`;
}
export function openGuide(openModal, closeModal) {
  openModal(guideHTML(), 'guide');
  const box = document.getElementById('modal-box');
  box.querySelector('#g-close').onclick = closeModal;
  box.querySelectorAll('.g-toc a').forEach(a => a.onclick = e => { e.preventDefault(); const t = box.querySelector(a.getAttribute('href')); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}
