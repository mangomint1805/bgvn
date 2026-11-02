// Dữ liệu bài Bang! bản gốc – tiếng Việt
// Suit: S=♠ H=♥ D=♦ C=♣ ; rank: 2..10, J=11, Q=12, K=13, A=14

export const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const SUIT_NAME = { S: 'Bích', H: 'Cơ', D: 'Rô', C: 'Chuồn' };

export function rankLabel(r) {
  return r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : r === 14 ? 'A' : String(r);
}

// Thông tin từng loại lá
export const CARD_INFO = {
  bang:       { name: 'Bắn!',            en: 'BANG!',          kind: 'brown', icon: '💥',
    desc: 'Bắn 1 người trong tầm súng. Họ phải đánh Hụt! nếu không sẽ mất 1 máu. Mỗi lượt chỉ đánh được 1 lá Bắn! (trừ khi có Volcanic hoặc là Willy the Kid).' },
  missed:     { name: 'Hụt!',            en: 'Missed!',        kind: 'brown', icon: '💨',
    desc: 'Né một phát Bắn! nhắm vào bạn, kể cả ngoài lượt. Không dùng được để chống Thổ dân! hay Đấu súng.' },
  beer:       { name: 'Bia',             en: 'Beer',           kind: 'brown', icon: '🍺',
    desc: 'Hồi 1 máu, không vượt quá máu tối đa. Chỉ dùng cho bản thân. Ngoài lượt chỉ được dùng khi sắp mất máu cuối (game tự dùng). Vô hiệu khi chỉ còn 2 người.' },
  panic:      { name: 'Hoảng loạn!',     en: 'Panic!',         kind: 'brown', icon: '😱',
    desc: 'Lấy 1 lá của người cách bạn đúng khoảng cách 1 (trên tay hoặc trước mặt). Chỉ tính khoảng cách, súng không giúp được; Mustang và Ống ngắm vẫn có tác dụng.' },
  catbalou:   { name: 'Cat Balou',       en: 'Cat Balou',      kind: 'brown', icon: '🐈',
    desc: 'Bắt 1 người bất kỳ (không kể khoảng cách) bỏ 1 lá trên tay hoặc trước mặt.' },
  stagecoach: { name: 'Xe ngựa',         en: 'Stagecoach',     kind: 'brown', icon: '🛺',
    desc: 'Rút 2 lá từ chồng bài.' },
  wellsfargo: { name: 'Wells Fargo',     en: 'Wells Fargo',    kind: 'brown', icon: '💰',
    desc: 'Rút 3 lá từ chồng bài.' },
  store:      { name: 'Tạp hóa',         en: 'General Store',  kind: 'brown', icon: '🏪',
    desc: 'Lật số lá bằng số người còn sống. Bắt đầu từ bạn, theo chiều kim đồng hồ, mỗi người chọn 1 lá.' },
  saloon:     { name: 'Quán rượu',       en: 'Saloon',         kind: 'brown', icon: '🥃',
    desc: 'Mọi người còn sống hồi 1 máu. Chỉ đánh được trong lượt của mình.' },
  indians:    { name: 'Thổ dân!',        en: 'Indians!',       kind: 'brown', icon: '🏹',
    desc: 'Mọi người khác phải bỏ 1 lá Bắn! hoặc mất 1 máu. Hụt! và Thùng rượu không có tác dụng.' },
  duel:       { name: 'Đấu súng',        en: 'Duel',           kind: 'brown', icon: '⚔️',
    desc: 'Thách 1 người bất kỳ (không kể khoảng cách). Lần lượt bỏ lá Bắn!, người bị thách bỏ trước. Ai không bỏ được thì mất 1 máu. Hụt! và Thùng rượu không có tác dụng.' },
  gatling:    { name: 'Súng Gatling',    en: 'Gatling',        kind: 'brown', icon: '🔫',
    desc: 'Bắn tất cả người khác, không kể khoảng cách. Mỗi người phải Hụt! hoặc mất 1 máu. Không tính vào giới hạn 1 lá Bắn! mỗi lượt.' },
  dynamite:   { name: 'Thuốc nổ',        en: 'Dynamite',       kind: 'blue',  icon: '🧨',
    desc: 'Đặt trước mặt mình. Đầu lượt người đang giữ lật bài: ra ♠ từ 2 đến 9 thì nổ, mất 3 máu; không thì chuyền sang người bên trái. Xét trước Nhà tù.' },
  jail:       { name: 'Nhà tù',          en: 'Jail',           kind: 'blue',  icon: '⛓️',
    desc: 'Đặt trước mặt 1 người khác (không phải Cảnh sát trưởng, không kể khoảng cách). Đầu lượt họ lật bài: ra ♥ thì thoát và chơi bình thường, không thì mất lượt. Lá Nhà tù bị bỏ sau khi lật.' },
  barrel:     { name: 'Thùng rượu',      en: 'Barrel',         kind: 'blue',  icon: '🛢️',
    desc: 'Khi bị Bắn!, lật bài: ra ♥ thì coi như đã né. Không có tác dụng với Thổ dân! và Đấu súng.' },
  scope:      { name: 'Ống ngắm',        en: 'Scope',          kind: 'blue',  icon: '🔭',
    desc: 'Bạn nhìn mọi người gần hơn 1 khoảng cách (tối thiểu là 1).' },
  mustang:    { name: 'Ngựa Mustang',    en: 'Mustang',        kind: 'blue',  icon: '🐎',
    desc: 'Mọi người nhìn bạn xa hơn 1 khoảng cách.' },
  volcanic:   { name: 'Volcanic',        en: 'Volcanic',       kind: 'gun',   icon: '🔫', range: 1,
    desc: 'Súng tầm 1. Đánh được bao nhiêu lá Bắn! tuỳ thích trong lượt.' },
  schofield:  { name: 'Schofield',       en: 'Schofield',      kind: 'gun',   icon: '🔫', range: 2,
    desc: 'Súng tầm 2.' },
  remington:  { name: 'Remington',       en: 'Remington',      kind: 'gun',   icon: '🔫', range: 3,
    desc: 'Súng tầm 3.' },
  carabine:   { name: 'Rev. Carabine',   en: 'Rev. Carabine',  kind: 'gun',   icon: '🔫', range: 4,
    desc: 'Súng tầm 4.' },
  winchester: { name: 'Winchester',      en: 'Winchester',     kind: 'gun',   icon: '🔫', range: 5,
    desc: 'Súng tầm 5.' },
};

// Bộ bài 80 lá: [type, suit, rank]
const DECK_SPEC = [
  // Bắn! x25
  ['bang','S',14], ...[2,3,4,5,6,7,8,9,10,11,12,13,14].map(r => ['bang','D',r]),
  ...[2,3,4,5,6,7,8,9].map(r => ['bang','C',r]), ['bang','H',12], ['bang','H',13], ['bang','H',14],
  // Hụt! x12
  ...[2,3,4,5,6,7,8].map(r => ['missed','S',r]), ...[10,11,12,13,14].map(r => ['missed','C',r]),
  // Bia x6
  ...[6,7,8,9,10,11].map(r => ['beer','H',r]),
  // Hoảng loạn x4
  ['panic','H',11], ['panic','H',12], ['panic','H',14], ['panic','D',8],
  // Cat Balou x4
  ['catbalou','H',13], ['catbalou','D',9], ['catbalou','D',10], ['catbalou','D',11],
  // Xe ngựa x2
  ['stagecoach','S',9], ['stagecoach','S',9],
  // Wells Fargo x1
  ['wellsfargo','H',3],
  // Tạp hóa x2
  ['store','C',9], ['store','S',12],
  // Quán rượu x1
  ['saloon','H',5],
  // Thổ dân x2
  ['indians','D',13], ['indians','D',14],
  // Đấu súng x3
  ['duel','D',12], ['duel','S',11], ['duel','C',8],
  // Gatling x1
  ['gatling','H',10],
  // Thuốc nổ x1
  ['dynamite','H',2],
  // Nhà tù x3
  ['jail','S',10], ['jail','S',11], ['jail','H',4],
  // Thùng rượu x2
  ['barrel','S',12], ['barrel','S',13],
  // Ống ngắm x1
  ['scope','S',14],
  // Mustang x2
  ['mustang','H',8], ['mustang','H',9],
  // Súng
  ['volcanic','S',10], ['volcanic','C',10],
  ['schofield','C',13], ['schofield','C',12], ['schofield','S',13],
  ['remington','C',13],
  ['carabine','C',14],
  ['winchester','S',8],
];

export function buildDeck() {
  return DECK_SPEC.map(([type, suit, rank], i) => ({ id: 'c' + i, type, suit, rank }));
}

export const ROLES = {
  sheriff:  { name: 'Cảnh sát trưởng', en: 'Sheriff',  icon: '⭐', desc: 'Công khai. Tiêu diệt hết Tội phạm và Kẻ hai mặt. Được +1 máu.' },
  deputy:   { name: 'Phó cảnh sát',    en: 'Deputy',   icon: '🎖️', desc: 'Bảo vệ Cảnh sát trưởng, cùng thắng với Cảnh sát trưởng.' },
  outlaw:   { name: 'Tội phạm',        en: 'Outlaw',   icon: '🤠', desc: 'Giết Cảnh sát trưởng. Ai giết Tội phạm được rút 3 lá.' },
  renegade: { name: 'Kẻ hai mặt',      en: 'Renegade', icon: '🎭', desc: 'Phải là người sống sót cuối cùng.' },
};

export function rolesFor(n) {
  const r = { 4: ['sheriff','renegade','outlaw','outlaw'],
    5: ['sheriff','renegade','outlaw','outlaw','deputy'],
    6: ['sheriff','renegade','outlaw','outlaw','outlaw','deputy'],
    7: ['sheriff','renegade','outlaw','outlaw','outlaw','deputy','deputy'] };
  return r[n] ? [...r[n]] : null;
}

export const CHARACTERS = {
  bartcassidy:    { name: 'Bart Cassidy',     hp: 4, icon: '🩸', desc: 'Mỗi lần mất máu, rút 1 lá.' },
  blackjack:      { name: 'Black Jack',       hp: 4, icon: '🃏', desc: 'Khi rút bài đầu lượt, lật lá thứ 2 cho mọi người xem: nếu là ♥ hoặc ♦ thì rút thêm 1 lá.' },
  calamityjanet:  { name: 'Calamity Janet',   hp: 4, icon: '🔄', desc: 'Dùng Bắn! như Hụt! và Hụt! như Bắn!. Hụt! dùng thay Bắn! vẫn tính vào giới hạn 1 lần bắn mỗi lượt.' },
  elgringo:       { name: 'El Gringo',        hp: 3, icon: '🤏', desc: 'Mỗi khi mất 1 máu vì lá bài của người khác, rút ngẫu nhiên 1 lá từ tay người đó.' },
  jessejones:     { name: 'Jesse Jones',      hp: 4, icon: '🕵️', desc: 'Khi rút bài đầu lượt, lá đầu tiên có thể rút ngẫu nhiên từ tay 1 người khác.' },
  jourdonnais:    { name: 'Jourdonnais',      hp: 4, icon: '🛢️', desc: 'Luôn có sẵn hiệu ứng Thùng rượu. Nếu có thêm lá Thùng rượu thì được lật 2 lần.' },
  kitcarlson:     { name: 'Kit Carlson',      hp: 4, icon: '👀', desc: 'Khi rút bài đầu lượt, xem 3 lá trên cùng, giữ 2 lá, trả 1 lá về đầu chồng bài.' },
  luckyduke:      { name: 'Lucky Duke',       hp: 4, icon: '🍀', desc: 'Mỗi lần phải "lật bài", lật 2 lá và chọn lá có lợi.' },
  paulregret:     { name: 'Paul Regret',      hp: 3, icon: '🐎', desc: 'Luôn có sẵn 1 Ngựa Mustang.' },
  pedroramirez:   { name: 'Pedro Ramirez',    hp: 4, icon: '🗑️', desc: 'Khi rút bài đầu lượt, lá đầu tiên có thể lấy từ chồng bài bỏ.' },
  rosedoolan:     { name: 'Rose Doolan',      hp: 4, icon: '🔭', desc: 'Luôn có sẵn 1 Ống ngắm.' },
  sidketchum:     { name: 'Sid Ketchum',      hp: 4, icon: '💊', desc: 'Bỏ 2 lá trên tay để hồi 1 máu, dùng bao nhiêu lần cũng được.' },
  slabthekiller:  { name: 'Slab the Killer',  hp: 4, icon: '☠️', desc: 'Người bị bạn Bắn! cần 2 lá Hụt! mới né được. Thùng rượu chỉ tính là 1 lần né.' },
  suzylafayette:  { name: 'Suzy Lafayette',   hp: 4, icon: '✨', desc: 'Hết bài trên tay thì rút ngay 1 lá.' },
  vulturesam:     { name: 'Vulture Sam',      hp: 4, icon: '🦅', desc: 'Khi có người bị loại, lấy toàn bộ bài trên tay và trước mặt của người đó.' },
  willythekid:    { name: 'Willy the Kid',    hp: 4, icon: '🔥', desc: 'Đánh được bao nhiêu lá Bắn! tuỳ thích trong lượt.' },
};

export function cardName(c) { return CARD_INFO[c.type].name; }
export function cardLabel(c) { return `${CARD_INFO[c.type].name} ${SUIT_SYMBOL[c.suit]}${rankLabel(c.rank)}`; }

// Tô màu chất bài trong chữ: ♥♦ đỏ, ♠♣ đen
export function suitify(html) {
  return html.replace(/[♥♦]/g, m => `<span class="suit red">${m}</span>`).replace(/[♠♣]/g, m => `<span class="suit black">${m}</span>`);
}

// Mô tả ngắn in trên mặt lá
const SHORT = {
  bang: 'Bắn 1 người trong tầm', missed: 'Né 1 phát Bắn!', beer: 'Hồi 1 máu', panic: 'Lấy 1 lá của người cách 1',
  catbalou: 'Bắt 1 người bỏ 1 lá', stagecoach: 'Rút 2 lá', wellsfargo: 'Rút 3 lá', store: 'Mỗi người chọn 1 lá',
  saloon: 'Mọi người hồi 1 máu', indians: 'Ai không bỏ Bắn! mất 1 máu', duel: 'Thi bỏ Bắn!, ai thua mất 1 máu', gatling: 'Bắn tất cả người khác',
  dynamite: 'Lật ra ♠2–9 thì nổ, mất 3 máu', jail: 'Nhốt 1 người, lật ♥ mới thoát', barrel: 'Bị bắn: lật ra ♥ là né', scope: 'Thấy người khác gần hơn 1',
  mustang: 'Người khác thấy bạn xa hơn 1', volcanic: 'Tầm 1 · bắn không giới hạn', schofield: 'Súng · bắn xa 2', remington: 'Súng · bắn xa 3',
  carabine: 'Súng · bắn xa 4', winchester: 'Súng · bắn xa 5',
};
for (const k in SHORT) CARD_INFO[k].short = SHORT[k];
