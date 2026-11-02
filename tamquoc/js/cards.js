// Dữ liệu Tam Quốc Sát (bản fan-made BGVN): bài, tướng, kỹ năng, vai trò. Chữ do BGVN tự viết.
export const SUIT_SYMBOL = { S: '♠', H: '♥', C: '♣', D: '♦' };
export const SUIT_NAME = { S: 'Bích', H: 'Cơ', C: 'Chuồn', D: 'Rô' };
export const isRed = c => !!c && (c.suit === 'H' || c.suit === 'D');
export const isBlack = c => !!c && (c.suit === 'S' || c.suit === 'C');
export function rankLabel(r) { return ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' })[r] || String(r); }

export const KINGDOMS = {
  wei: { name: 'Ngụy', han: '魏', color: '#3a6fd8', dark: '#1f3f86' },
  shu: { name: 'Thục', han: '蜀', color: '#d8423a', dark: '#8a1f1a' },
  wu: { name: 'Ngô', han: '吳', color: '#2f9e5b', dark: '#175c33' },
  qun: { name: 'Quần', han: '群', color: '#7d808c', dark: '#43454f' },
};

export const ROLES = {
  lord: { name: 'Chúa công', icon: '👑', color: '#d9a21b', desc: 'Lộ mặt từ đầu, +1 máu tối đa. Thắng khi diệt sạch Phản tặc và Nội gián.' },
  loyal: { name: 'Trung thần', icon: '🛡️', color: '#e0a23a', desc: 'Bảo vệ Chúa công tới hơi thở cuối. Thắng cùng Chúa công.' },
  rebel: { name: 'Phản tặc', icon: '🔥', color: '#c4382f', desc: 'Lật đổ Chúa công. Chúa công chết là cả hội Phản tặc thắng (kể cả người đã nằm).' },
  spy: { name: 'Nội gián', icon: '🎭', color: '#4a8a6a', desc: 'Cáo già: phải là người SỐNG SÓT CUỐI CÙNG. Giúp Chúa diệt Phản trước, xong rồi tính sổ cả bàn.' },
};
// số vai theo số người
const ROLE_TABLE = {
  2: ['lord', 'rebel'],
  3: ['lord', 'rebel', 'spy'],
  4: ['lord', 'loyal', 'rebel', 'spy'],
  5: ['lord', 'loyal', 'rebel', 'rebel', 'spy'],
  6: ['lord', 'loyal', 'rebel', 'rebel', 'rebel', 'spy'],
  7: ['lord', 'loyal', 'loyal', 'rebel', 'rebel', 'rebel', 'spy'],
  8: ['lord', 'loyal', 'loyal', 'rebel', 'rebel', 'rebel', 'rebel', 'spy'],
};
export function rolesFor(n) { return ROLE_TABLE[n] ? [...ROLE_TABLE[n]] : null; }

// kind: basic | trick (cẩm nang dùng ngay) | delay (cẩm nang trì hoãn) | weapon | armor | plus (ngựa +1) | minus (ngựa −1)
export const CARD_INFO = {
  sat: { name: 'Sát', kind: 'basic', han: '殺', emo: '🗡️', short: 'Chém 1 người trong tầm', desc: 'Chọn 1 người trong tầm đánh. Họ phải đánh ra 1 Né, không thì mất 1 máu. Mỗi lượt chỉ dùng 1 Sát (trừ khi có Gia Cát liên nỏ/kỹ năng).' },
  ne: { name: 'Né', kind: 'basic', han: '閃', emo: '💨', short: 'Né 1 Sát / Vạn tiễn', desc: 'Thiểm – chỉ đánh ra khi bị Sát hoặc Vạn tiễn tề phát để huỷ đòn đó.' },
  dao: { name: 'Đào', kind: 'basic', han: '桃', emo: '🍑', short: 'Hồi 1 máu / cứu người', desc: 'Trong lượt mình: hồi 1 máu. Khi có ai hấp hối (0 máu): dùng để cứu họ 1 máu.' },
  wuzhong: { name: 'Vô trung sinh hữu', kind: 'trick', han: '無', emo: '✨', short: 'Rút 2 lá', desc: 'Từ cái không sinh ra cái có: rút 2 lá.' },
  guohe: { name: 'Quá hà sách kiều', kind: 'trick', han: '拆', emo: '🌉', short: 'Bỏ 1 lá của người khác', desc: 'Chọn 1 người khác, bỏ 1 lá của họ (trên tay – ngẫu nhiên, trang bị hoặc vùng phán định).' },
  shunshou: { name: 'Thuận thủ khiên dương', kind: 'trick', han: '順', emo: '🐑', short: 'Lấy 1 lá người cách 1', desc: 'Tiện tay dắt dê: lấy 1 lá (tay/trang bị/phán định) của người cách bạn 1.' },
  juedou: { name: 'Quyết đấu', kind: 'trick', han: '鬥', emo: '🤺', short: 'Thay phiên ra Sát', desc: 'Thách 1 người. Bắt đầu từ họ, hai bên lần lượt đánh Sát; ai không ra được thì mất 1 máu (do người kia gây).' },
  nanman: { name: 'Nam man xâm nhập', kind: 'trick', han: '蠻', emo: '🐘', short: 'Ai không ra Sát −1 máu', desc: 'Voi rừng phương Nam tràn vào: mọi người khác lần lượt phải đánh 1 Sát, không thì mất 1 máu.' },
  wanjian: { name: 'Vạn tiễn tề phát', kind: 'trick', han: '箭', emo: '🏹', short: 'Ai không ra Né −1 máu', desc: 'Mưa tên: mọi người khác lần lượt phải đánh 1 Né, không thì mất 1 máu.' },
  taoyuan: { name: 'Đào viên kết nghĩa', kind: 'trick', han: '園', emo: '🌸', short: 'Mọi người +1 máu', desc: 'Kết nghĩa vườn đào: tất cả mọi người (kể cả bạn) hồi 1 máu.' },
  wugu: { name: 'Ngũ cốc phong đăng', kind: 'trick', han: '穀', emo: '🌾', short: 'Lật bài, mỗi người chọn 1', desc: 'Được mùa: lật số lá bằng số người còn sống, bắt đầu từ bạn mỗi người chọn 1 lá.' },
  jiedao: { name: 'Tá đao sát nhân', kind: 'trick', han: '借', emo: '🔪', short: 'Mượn dao giết người', desc: 'Chọn người A có vũ khí và người B trong tầm của A. A phải Sát B, không thì đưa vũ khí cho bạn.' },
  wuxie: { name: 'Vô giải khả kích', kind: 'trick', han: '懈', emo: '🚫', short: 'Huỷ 1 cẩm nang', desc: 'Đánh ra khi một cẩm nang sắp có tác dụng lên một người: huỷ tác dụng đó. Có thể bị Vô giải khác huỷ lại (chồng được).' },
  lebu: { name: 'Lạc bất tư thục', kind: 'delay', han: '樂', emo: '🍶', short: 'Phán định ≠ ♥ → mất pha ra bài', desc: 'Đặt vào vùng phán định của 1 người khác. Đầu lượt họ phán định: không ra ♥ Cơ thì bỏ qua pha ra bài.' },
  shandian: { name: 'Thiểm điện', kind: 'delay', han: '電', emo: '⚡', short: 'Phán định ♠2–9 → −3 máu', desc: 'Đặt vào vùng phán định của bạn. Đầu lượt phán định: ra ♠ Bích 2–9 thì sét đánh mất 3 máu; không thì chuyền sang người kế tiếp.' },
  zhuge: { name: 'Gia Cát liên nỏ', kind: 'weapon', range: 1, han: '弩', emo: '🎯', short: 'Sát không giới hạn', desc: 'Tầm 1. Trong lượt, dùng Sát bao nhiêu lần cũng được.' },
  cixiong: { name: 'Thư hùng song kiếm', kind: 'weapon', range: 2, han: '雙', emo: '⚔️', short: 'Sát người khác giới', desc: 'Tầm 2. Khi Sát người khác giới tính: họ chọn bỏ 1 lá trên tay hoặc để bạn rút 1 lá.' },
  qinggang: { name: 'Thanh cương kiếm', kind: 'weapon', range: 2, han: '青', emo: '🗡️', short: 'Sát xuyên giáp', desc: 'Tầm 2. Sát của bạn bỏ qua giáp của mục tiêu.' },
  hanbing: { name: 'Băng phách kiếm', kind: 'weapon', range: 2, han: '冰', emo: '❄️', short: 'Đổi sát thương lấy 2 lá', desc: 'Tầm 2. Khi Sát trúng: có thể không gây sát thương mà bỏ 2 lá của mục tiêu.' },
  qinglong: { name: 'Thanh long đao', kind: 'weapon', range: 3, han: '龍', emo: '🐉', short: 'Bị né thì Sát tiếp', desc: 'Tầm 3. Sát bị Né thì có thể đánh thêm 1 Sát vào chính người đó.' },
  zhangba: { name: 'Trượng bát xà mâu', kind: 'weapon', range: 3, han: '矛', emo: '🔱', short: '2 lá bất kỳ = 1 Sát', desc: 'Tầm 3. Có thể dùng/đánh 2 lá trên tay như 1 Sát.' },
  guanshi: { name: 'Quán thạch phủ', kind: 'weapon', range: 3, han: '斧', emo: '🪓', short: 'Bỏ 2 lá: Sát vẫn trúng', desc: 'Tầm 3. Sát bị Né thì có thể bỏ 2 lá để Sát vẫn gây sát thương.' },
  fangtian: { name: 'Phương thiên hoạ kích', kind: 'weapon', range: 4, han: '戟', emo: '🔱', short: 'Sát cuối: tới 3 người', desc: 'Tầm 4. Nếu Sát là lá cuối cùng trên tay, có thể chọn tới 3 mục tiêu.' },
  qilin: { name: 'Kỳ lân cung', kind: 'weapon', range: 5, han: '弓', emo: '🏹', short: 'Bắn rụng ngựa', desc: 'Tầm 5. Sát gây sát thương thì bỏ luôn 1 ngựa của mục tiêu.' },
  bagua: { name: 'Bát quái trận', kind: 'armor', han: '卦', emo: '☯️', short: 'Phán định đỏ = Né', desc: 'Khi cần đánh Né: có thể phán định, ra đỏ (♥/♦) thì coi như đã đánh Né.' },
  renwang: { name: 'Nhân vương thuẫn', kind: 'armor', han: '盾', emo: '🛡️', short: 'Sát đen vô hiệu', desc: 'Sát màu đen (♠/♣) không có tác dụng với bạn.' },
  plus: { name: 'Ngựa +1', kind: 'plus', han: '駒', emo: '🐎', short: 'Người khác thấy bạn xa +1', desc: 'Ngựa phòng thủ: khoảng cách từ người khác tới bạn +1.' },
  minus: { name: 'Ngựa −1', kind: 'minus', han: '騎', emo: '🏇', short: 'Bạn thấy người khác gần −1', desc: 'Ngựa tấn công: khoảng cách từ bạn tới người khác −1.' },
};
export const HORSE_NAMES = { plus: ['Tuyệt ảnh', 'Đích lô', 'Trảo hoàng'], minus: ['Xích thố', 'Đại uyển', 'Tử tinh'] };
export function cardName(c) { if (!c) return '?'; return c.v || CARD_INFO[c.type].name; }
export function cardLabel(c) { return c ? `${cardName(c)} ${SUIT_SYMBOL[c.suit]}${rankLabel(c.rank)}` : '?'; }
export const EQUIP_SLOT = { weapon: 'weapon', armor: 'armor', plus: 'plus', minus: 'minus' };

// Bộ bài 108 lá (phân bố chất/số do BGVN tự xếp)
const DECK_BY_SUIT = {
  S: ['sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'juedou', 'guohe', 'guohe', 'guohe', 'shunshou', 'shunshou', 'shunshou', 'wuxie', 'nanman', 'nanman', 'lebu', 'shandian',
    'cixiong', 'qinggang', 'hanbing', 'qinglong', 'zhangba', 'bagua', 'plus:Tuyệt ảnh', 'minus:Tử tinh'],
  C: ['sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'juedou', 'guohe', 'guohe', 'wuxie', 'wuxie', 'nanman', 'jiedao', 'jiedao', 'lebu', 'zhuge',
    'bagua', 'renwang', 'plus:Đích lô'],
  H: ['sat', 'sat', 'sat', 'ne', 'ne', 'ne', 'ne', 'ne', 'dao', 'dao', 'dao', 'dao', 'dao', 'dao', 'dao', 'guohe', 'wuzhong', 'wuzhong', 'wuzhong', 'wuzhong', 'wuxie', 'wanjian', 'taoyuan',
    'wugu', 'wugu', 'lebu', 'shandian', 'qilin', 'plus:Trảo hoàng', 'minus:Xích thố'],
  D: ['sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'ne', 'ne', 'ne', 'ne', 'ne', 'ne', 'ne', 'ne', 'ne', 'ne', 'dao', 'juedou', 'shunshou', 'shunshou', 'zhuge', 'guanshi', 'fangtian', 'minus:Đại uyển'],
};
export const DECK_SIZE = Object.values(DECK_BY_SUIT).reduce((a, l) => a + l.length, 0);
export function buildDeck() {
  const out = []; let id = 0;
  for (const [suit, list] of Object.entries(DECK_BY_SUIT)) {
    // rải số 1–13 xen kẽ (bước 5 nguyên tố cùng 13 → đủ mọi số, lặp đều)
    list.forEach((t, i) => {
      const [type, v] = t.split(':');
      const rank = ((i * 5 + (suit.charCodeAt(0) % 7)) % 13) + 1;
      const c = { id: 'c' + (id++), type, suit, rank }; if (v) c.v = v;
      out.push(c);
    });
  }
  return out;
}

// ---------- Kỹ năng ----------
// auto: tự động; active: nút trong pha ra bài; conv: biến lá; lord: kỹ năng chúa (chỉ khi là Chúa công)
export const SKILLS = {
  gianhung: { name: 'Gian hùng', desc: 'Khi bị gây sát thương: lấy lá bài đã gây sát thương đó về tay.' },
  hogia: { name: 'Hộ giá', lord: true, desc: 'Chúa công: khi cần đánh Né, có thể nhờ các tướng Ngụy lần lượt đánh Né hộ.' },
  phandap: { name: 'Phản đáp', desc: 'Khi bị gây sát thương: lấy 1 lá (tay/trang bị) của người gây sát thương.' },
  quytai: { name: 'Quỷ tài', desc: 'Trước khi một phán định có hiệu lực: có thể đánh 1 lá trên tay thay cho lá phán định.' },
  cuonglie: { name: 'Cương liệt', desc: 'Khi bị gây sát thương: phán định, không ra ♥ thì kẻ gây sát thương chọn bỏ 2 lá trên tay hoặc mất 1 máu.' },
  duttap: { name: 'Đột tập', desc: 'Pha rút bài: có thể không rút mà lấy 1 lá trên tay của tối đa 2 người khác.' },
  loay: { name: 'Lỏa y', desc: 'Pha rút bài: có thể rút ít đi 1 lá; lượt này Sát và Quyết đấu bạn dùng gây thêm 1 sát thương.' },
  thiendo: { name: 'Thiên đố', desc: 'Lá phán định của bạn sau khi có hiệu lực thì về tay bạn.' },
  dike: { name: 'Di kế', desc: 'Mỗi khi mất 1 máu do sát thương: rút 2 lá.' },
  khuynhquoc: { name: 'Khuynh quốc', desc: 'Có thể dùng lá đen (♠/♣) trên tay như Né.' },
  lacthan: { name: 'Lạc thần', desc: 'Đầu lượt: phán định liên tục, mỗi lá đen về tay, gặp lá đỏ thì dừng.' },
  nhanduc: { name: 'Nhân đức', desc: 'Pha ra bài: tặng lá trên tay cho người khác bao nhiêu cũng được. Tặng đủ 2 lá trong lượt thì hồi 1 máu (1 lần/lượt).' },
  kichtuong: { name: 'Kích tướng', lord: true, desc: 'Chúa công: khi cần đánh ra Sát để đáp trả, có thể nhờ các tướng Thục lần lượt đánh hộ.' },
  vothanh: { name: 'Võ thánh', desc: 'Có thể dùng lá đỏ (♥/♦) trên tay như Sát.' },
  baohao: { name: 'Bào hao', desc: 'Dùng Sát không giới hạn số lần trong lượt.' },
  khongthanh: { name: 'Không thành', desc: 'Khi không còn lá trên tay: không thể bị chọn làm mục tiêu của Sát hoặc Quyết đấu.' },
  quantinh: { name: 'Quan tinh', desc: 'Đầu lượt: xem X lá trên cùng chồng bài (X = số người còn sống, tối đa 5), sắp xếp lại trên/dưới tuỳ ý.' },
  longdam: { name: 'Long đảm', desc: 'Có thể dùng Sát như Né và Né như Sát.' },
  mathuat: { name: 'Mã thuật', desc: 'Luôn coi như có ngựa −1: khoảng cách từ bạn tới người khác −1.' },
  thietky: { name: 'Thiết kỵ', desc: 'Khi Sát chỉ định mục tiêu: phán định, ra đỏ thì mục tiêu không thể Né.' },
  taptri: { name: 'Tập trí', desc: 'Mỗi khi dùng một cẩm nang (không phải trì hoãn): rút 1 lá.' },
  kytai: { name: 'Kỳ tài', desc: 'Cẩm nang của bạn không bị giới hạn khoảng cách.' },
  chehanh: { name: 'Chế hành', desc: 'Pha ra bài (1 lần): bỏ bao nhiêu lá cũng được (tay/trang bị), rút lại bấy nhiêu lá.' },
  cuuvien: { name: 'Cứu viện', lord: true, desc: 'Chúa công: khi hấp hối, Đào của tướng Ngô khác hồi thêm 1 máu.' },
  kytap: { name: 'Kỳ tập', desc: 'Có thể dùng lá đen (♠/♣) trên tay như Quá hà sách kiều.' },
  khacky: { name: 'Khắc kỷ', desc: 'Nếu lượt này không dùng/đánh Sát: bỏ qua pha bỏ bài.' },
  khonhuc: { name: 'Khổ nhục', desc: 'Pha ra bài: tự mất 1 máu để rút 2 lá (bao nhiêu lần cũng được).' },
  anhtu: { name: 'Anh tư', desc: 'Pha rút bài: rút thêm 1 lá.' },
  phangian: { name: 'Phản gián', desc: 'Pha ra bài (1 lần): 1 người khác đoán 1 chất rồi rút ngẫu nhiên 1 lá trên tay bạn. Đoán sai chất thì mất 1 máu.' },
  quocsac: { name: 'Quốc sắc', desc: 'Có thể dùng lá ♦ Rô trên tay như Lạc bất tư thục.' },
  luuly: { name: 'Lưu ly', desc: 'Khi bị Sát: có thể bỏ 1 lá để chuyển Sát sang 1 người khác trong tầm đánh của bạn (không phải người Sát).' },
  khiemton: { name: 'Khiêm tốn', desc: 'Không thể bị chọn làm mục tiêu của Thuận thủ khiên dương và Lạc bất tư thục.' },
  liendoanh: { name: 'Liên doanh', desc: 'Mỗi khi mất lá cuối cùng trên tay: rút 1 lá.' },
  kieuco: { name: 'Kiêu cơ', desc: 'Mỗi khi mất 1 lá trang bị: rút 2 lá.' },
  ketnhan: { name: 'Kết nhân', desc: 'Pha ra bài (1 lần): bỏ 2 lá trên tay, chọn 1 nam đang mất máu: cả hai cùng hồi 1 máu.' },
  capcuu: { name: 'Cấp cứu', desc: 'Ngoài lượt của mình: có thể dùng lá đỏ như Đào.' },
  thanhnang: { name: 'Thanh nang', desc: 'Pha ra bài (1 lần): bỏ 1 lá trên tay để 1 người hồi 1 máu.' },
  vosong: { name: 'Vô song', desc: 'Sát của bạn cần 2 Né mới né được; trong Quyết đấu đối thủ mỗi lần phải ra 2 Sát.' },
  ligian: { name: 'Ly gián', desc: 'Pha ra bài (1 lần): bỏ 1 lá, chọn 2 tướng nam: người thứ nhất Quyết đấu người thứ hai (không thể bị Vô giải).' },
  benguyet: { name: 'Bế nguyệt', desc: 'Cuối lượt: rút 1 lá.' },
};

// ---------- Võ tướng ----------
// han: chữ Hán trên chân dung; emo: vật biểu tượng; tag: lời giới thiệu vui
export const GENERALS = {
  caocao: { name: 'Tào Tháo', kingdom: 'wei', hp: 4, gender: 'm', lord: true, han: '操', emo: '🏯', skills: ['gianhung', 'hogia'], tag: 'Thà ta phụ người…' },
  simayi: { name: 'Tư Mã Ý', kingdom: 'wei', hp: 3, gender: 'm', han: '懿', emo: '🦊', skills: ['phandap', 'quytai'], tag: 'Kiên nhẫn là vũ khí' },
  xiahoudun: { name: 'Hạ Hầu Đôn', kingdom: 'wei', hp: 4, gender: 'm', han: '惇', emo: '👁️', skills: ['cuonglie'], tag: 'Đụng là cắn lại' },
  zhangliao: { name: 'Trương Liêu', kingdom: 'wei', hp: 4, gender: 'm', han: '遼', emo: '🐺', skills: ['duttap'], tag: 'Tám trăm kỵ phá vạn quân' },
  xuchu: { name: 'Hứa Chử', kingdom: 'wei', hp: 4, gender: 'm', han: '褚', emo: '💪', skills: ['loay'], tag: 'Cởi giáp đánh cho sướng' },
  guojia: { name: 'Quách Gia', kingdom: 'wei', hp: 3, gender: 'm', han: '嘉', emo: '🍷', skills: ['thiendo', 'dike'], tag: 'Quỷ tài yểu mệnh' },
  zhenji: { name: 'Chân Cơ', kingdom: 'wei', hp: 3, gender: 'f', han: '甄', emo: '🌊', skills: ['khuynhquoc', 'lacthan'], tag: 'Lạc thần trên sóng' },
  liubei: { name: 'Lưu Bị', kingdom: 'shu', hp: 4, gender: 'm', lord: true, han: '備', emo: '🤝', skills: ['nhanduc', 'kichtuong'], tag: 'Lấy nhân nghĩa thu lòng người' },
  guanyu: { name: 'Quan Vũ', kingdom: 'shu', hp: 4, gender: 'm', han: '羽', emo: '🐉', skills: ['vothanh'], tag: 'Mặt đỏ, râu dài, đao lớn' },
  zhangfei: { name: 'Trương Phi', kingdom: 'shu', hp: 4, gender: 'm', han: '飛', emo: '🐯', skills: ['baohao'], tag: 'Hét một tiếng cầu gãy' },
  zhugeliang: { name: 'Gia Cát Lượng', kingdom: 'shu', hp: 3, gender: 'm', han: '亮', emo: '🪶', skills: ['quantinh', 'khongthanh'], tag: 'Quạt lông, khăn là' },
  zhaoyun: { name: 'Triệu Vân', kingdom: 'shu', hp: 4, gender: 'm', han: '雲', emo: '🐲', skills: ['longdam'], tag: 'Toàn thân là gan' },
  machao: { name: 'Mã Siêu', kingdom: 'shu', hp: 4, gender: 'm', han: '超', emo: '🐎', skills: ['mathuat', 'thietky'], tag: 'Cẩm Mã Siêu' },
  huangyueying: { name: 'Hoàng Nguyệt Anh', kingdom: 'shu', hp: 3, gender: 'f', han: '英', emo: '⚙️', skills: ['taptri', 'kytai'], tag: 'Kỹ sư đời Hán' },
  sunquan: { name: 'Tôn Quyền', kingdom: 'wu', hp: 4, gender: 'm', lord: true, han: '權', emo: '⚖️', skills: ['chehanh', 'cuuvien'], tag: 'Sinh con phải như Tôn Trọng Mưu' },
  ganning: { name: 'Cam Ninh', kingdom: 'wu', hp: 4, gender: 'm', han: '寧', emo: '🔔', skills: ['kytap'], tag: 'Trăm kỵ cướp trại' },
  lvmeng: { name: 'Lữ Mông', kingdom: 'wu', hp: 4, gender: 'm', han: '蒙', emo: '📚', skills: ['khacky'], tag: 'Ba ngày không gặp…' },
  huanggai: { name: 'Hoàng Cái', kingdom: 'wu', hp: 4, gender: 'm', han: '蓋', emo: '🔥', skills: ['khonhuc'], tag: 'Một người đánh, một người chịu' },
  zhouyu: { name: 'Chu Du', kingdom: 'wu', hp: 3, gender: 'm', han: '瑜', emo: '🎼', skills: ['anhtu', 'phangian'], tag: 'Đàn sai một nốt cũng ngoái nhìn' },
  daqiao: { name: 'Đại Kiều', kingdom: 'wu', hp: 3, gender: 'f', han: '喬', emo: '🌺', skills: ['quocsac', 'luuly'], tag: 'Nhan sắc khuynh thành' },
  luxun: { name: 'Lục Tốn', kingdom: 'wu', hp: 3, gender: 'm', han: '遜', emo: '📜', skills: ['khiemton', 'liendoanh'], tag: 'Thư sinh đốt liên doanh' },
  sunshangxiang: { name: 'Tôn Thượng Hương', kingdom: 'wu', hp: 3, gender: 'f', han: '香', emo: '🏹', skills: ['kieuco', 'ketnhan'], tag: 'Cung kiếm chẳng kém nam nhi' },
  huatuo: { name: 'Hoa Đà', kingdom: 'qun', hp: 3, gender: 'm', han: '佗', emo: '🌿', skills: ['capcuu', 'thanhnang'], tag: 'Thần y cạo xương' },
  lvbu: { name: 'Lữ Bố', kingdom: 'qun', hp: 4, gender: 'm', han: '布', emo: '🔱', skills: ['vosong'], tag: 'Người có Lữ Bố, ngựa có Xích Thố' },
  diaochan: { name: 'Điêu Thuyền', kingdom: 'qun', hp: 3, gender: 'f', han: '蟬', emo: '🌙', skills: ['ligian', 'benguyet'], tag: 'Trăng cũng phải nấp' },
};
export const LORD_IDS = Object.keys(GENERALS).filter(k => GENERALS[k].lord);
// tất cả chữ Hán dùng cho font thư pháp (để tải font tối giản)
export const HAN_TEXT = [...new Set([...Object.values(GENERALS).map(g => g.han), ...Object.values(CARD_INFO).map(c => c.han), ...Object.values(KINGDOMS).map(k => k.han), '三國殺'].join(''))].join('');
