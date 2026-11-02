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
const C = (name, group, price) => ({ type: 'city', name, group, price });
const R = (name, icon) => ({ type: 'resort', name, icon, price: 200 });
export const SQUARES = [
  { type: 'start', name: 'Khởi hành', icon: '🏁' },
  C('Bùi Viện', 0, 60), C('Phạm Ngũ Lão', 0, 70), { type: 'chance', name: 'Cơ hội', icon: '❓' },
  C('Võ Văn Tần', 1, 90), R('Chợ Bến Thành', '🏮'), C('Pasteur', 1, 100), C('Nam Kỳ Khởi Nghĩa', 1, 110),
  { type: 'island', name: 'Côn Đảo', icon: '🏝️' },
  C('Cách Mạng Tháng 8', 2, 130), C('Điện Biên Phủ', 2, 140), { type: 'chance', name: 'Cơ hội', icon: '❓' },
  C('Hai Bà Trưng', 2, 150), R('Thảo Cầm Viên', '🦒'), C('Trần Hưng Đạo', 3, 170), C('Nguyễn Trãi', 3, 185),
  { type: 'festival', name: 'Lễ hội', icon: '🎉' },
  C('Nguyễn Du', 4, 200), C('Lý Tự Trọng', 4, 210), { type: 'chance', name: 'Cơ hội', icon: '❓' },
  C('Lê Thánh Tôn', 4, 225), R('Bến Nhà Rồng', '⚓'), C('Lê Duẩn', 5, 250), C('Tôn Đức Thắng', 5, 265),
  { type: 'travel', name: 'Tân Sơn Nhất', icon: '✈️' },
  C('Hàm Nghi', 6, 290), C('Lê Lợi', 6, 310), R('Cần Giờ', '🏖️'), { type: 'chance', name: 'Cơ hội', icon: '❓' },
  C('Đồng Khởi', 7, 350), { type: 'tax', name: 'Thuế', icon: '💸' }, C('Nguyễn Huệ', 7, 400),
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
