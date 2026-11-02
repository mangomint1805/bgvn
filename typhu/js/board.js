// Bàn cờ 32 ô – đường phố TP.HCM. Đơn vị tiền: K (nghìn).
// Ô 0 ở góc dưới phải, đi ngược chiều kim đồng hồ: cạnh dưới → cạnh trái → cạnh trên → cạnh phải.
export const GROUPS = [
  { id: 0, name: 'Nâu', color: '#b0703f' },
  { id: 1, name: 'Xanh trời', color: '#4fc3f7' },
  { id: 2, name: 'Hồng', color: '#f06292' },
  { id: 3, name: 'Cam', color: '#ffa63d' },
  { id: 4, name: 'Đỏ', color: '#ef4444' },
  { id: 5, name: 'Vàng', color: '#f5c518' },
  { id: 6, name: 'Xanh lá', color: '#22b573' },
  { id: 7, name: 'Xanh đậm', color: '#3657d6' },
];
const C = (name, group, price, area) => ({ type: 'city', name, group, price, area });
const R = (name, icon, area) => ({ type: 'resort', name, icon, price: 200, area });
// rẻ → đắt: ngoại thành → nội thành → trung tâm Quận 1
export const SQUARES = [
  { type: 'start', name: 'Khởi hành', icon: '🏁' },
  C('Lê Văn Việt', 0, 60, 'TP. Thủ Đức'), C('Kha Vạn Cân', 0, 70, 'TP. Thủ Đức'), { type: 'chance', name: 'Cơ hội', icon: '❓' },
  C('Âu Cơ', 1, 90, 'Tân Phú'), R('Thảo Cầm Viên', '🦒', 'Quận 1'), C('Quang Trung', 1, 100, 'Gò Vấp'), C('Phan Văn Trị', 1, 110, 'Gò Vấp'),
  { type: 'island', name: 'Côn Đảo', icon: '🏝️' },
  C('Cộng Hòa', 2, 130, 'Tân Bình'), C('Hoàng Văn Thụ', 2, 140, 'Phú Nhuận'), { type: 'chest', name: 'Khí vận', icon: '💰' },
  C('Phan Xích Long', 2, 150, 'Phú Nhuận'), R('Cần Giờ', '🏖️', 'Cần Giờ'), C('Nguyễn Trãi', 3, 170, 'Quận 5'), C('Trần Hưng Đạo', 3, 185, 'Quận 1'),
  { type: 'festival', name: 'Lễ hội', icon: '🎉' },
  C('Cách Mạng Tháng 8', 4, 200, 'Quận 3'), C('Điện Biên Phủ', 4, 210, 'Quận 3'), { type: 'chance', name: 'Cơ hội', icon: '❓' },
  C('Võ Văn Tần', 4, 225, 'Quận 3'), R('Bến Nhà Rồng', '⚓', 'Quận 4'), C('Phạm Ngũ Lão', 5, 250, 'Quận 1'), C('Bùi Viện', 5, 265, 'Phố đi bộ – Quận 1'),
  { type: 'travel', name: 'Tân Sơn Nhất', icon: '✈️' },
  C('Hai Bà Trưng', 6, 290, 'Quận 1'), C('Lê Lợi', 6, 310, 'Quận 1'), R('Chợ Bến Thành', '🏮', 'Quận 1'), { type: 'chest', name: 'Khí vận', icon: '💰' },
  C('Đồng Khởi', 7, 350, 'Quận 1'), { type: 'tax', name: 'Thuế', icon: '💸' }, C('Nguyễn Huệ', 7, 400, 'Phố đi bộ – Quận 1'),
];
export const N = SQUARES.length; // 32
export const SIDES = [[1, 7], [9, 15], [17, 23], [25, 31]];
export const RESORTS = SQUARES.map((q, i) => q.type === 'resort' ? i : -1).filter(i => i >= 0);
export const groupSquares = g => SQUARES.map((q, i) => q.type === 'city' && q.group === g ? i : -1).filter(i => i >= 0);

export const SALARY = 300, ISLAND_FEE = 100, START_MONEY = 2000;
export const houseCost = q => Math.round(q.price * 0.5);
export const landmarkCost = q => q.price;
// level: 0 = đất trống, 1–3 = nhà, 4 = landmark
export const MULT = [0.25, 0.55, 0.8, 1.05, 1.6];
export function value(q, level) {
  if (q.type === 'resort') return q.price;
  return q.price + Math.min(level, 3) * houseCost(q) + (level === 4 ? landmarkCost(q) : 0);
}
export const money = k => {
  const a = Math.abs(k), sign = k < 0 ? '-' : '';
  if (a >= 1000) return sign + (a / 1000).toFixed(a % 1000 === 0 ? 0 : a >= 10000 ? 1 : 2).replace(/\.?0+$/, '') + 'M';
  return sign + Math.round(a) + 'K';
};

export const CHANCES = [
  { id: 'lotto', text: '🎰 Trúng vé số! Nhận 300K.' },
  { id: 'fine', text: '📸 Dính phạt nguội. Trả 150K.' },
  { id: 'bday', text: '🎂 Sinh nhật bạn! Mỗi người tặng 50K.' },
  { id: 'treat', text: '🧋 Bao cả bàn trà sữa: trả mỗi người 50K.' },
  { id: 'start', text: '🏁 Về ô Khởi hành, nhận lương.' },
  { id: 'island', text: '🏝️ Bị đưa ra Côn Đảo!' },
  { id: 'festival', text: '🎉 Đi tới Lễ hội.' },
  { id: 'airport', text: '✈️ Ra sân bay Tân Sơn Nhất.' },
  { id: 'back3', text: '↩️ Kẹt xe, lùi 3 ô.' },
  { id: 'free', text: '🎟️ Thẻ miễn phí: lần tới khỏi trả tiền thuê.' },
  { id: 'escape', text: '🚤 Thẻ thoát đảo: dùng khi ra Côn Đảo.' },
  { id: 'storm', text: '🌪️ Mưa bão! Một căn nhà của người giàu nhất bị sập.' },
  { id: 'repair', text: '🔧 Sửa nhà: trả 20K cho mỗi tầng nhà bạn có.' },
  { id: 'bonus', text: '💼 Thưởng dự án: nhận 150K.' },
];

// Nhân vật & màu quân cờ
export const AVATARS = ['🧑‍💼', '👩‍💼', '👷', '👩‍🍳', '🧑‍🎤', '🕵️', '🧙', '🥷', '🐱', '🐶', '🐼', '🦊', '🐯', '🐸', '🐵', '🤖'];
export const COLORS = ['#ff5a5f', '#3d8bff', '#2fc76f', '#ffb020', '#a259ff', '#ff7ac8', '#14c4c4', '#8d6e63'];

// Khí vận – thẻ vàng
export const CHESTS = [
  { id: 'inherit', text: '📜 Được thừa kế tài sản: nhận 200K.' },
  { id: 'hospital', text: '🏥 Đi viện: trả viện phí 100K.' },
  { id: 'refund', text: '🧾 Được hoàn thuế: nhận 100K.' },
  { id: 'school', text: '🎓 Đóng học phí: trả 150K.' },
  { id: 'contest', text: '👑 Đạt giải nhì cuộc thi sắc đẹp: nhận 50K.' },
  { id: 'stock', text: '📈 Bán cổ phiếu có lời: nhận 120K.' },
  { id: 'wedding', text: '💍 Đám cưới bạn thân: mừng mỗi người 30K.' },
  { id: 'tet', text: '🧧 Tết đến: mỗi người lì xì bạn 30K.' },
  { id: 'start', text: '🏁 Về ô Khởi hành, nhận lương.' },
  { id: 'free', text: '🎟️ Thẻ miễn phí: lần tới khỏi trả tiền thuê.' },
  { id: 'escape', text: '🚤 Thẻ thoát đảo: dùng khi ra Côn Đảo.' },
  { id: 'island', text: '🏝️ Trốn thuế bị phát hiện: ra Côn Đảo!' },
];
