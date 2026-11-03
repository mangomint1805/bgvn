// Kiểm tra logic mới: nhật ký có cấu trúc (s.acts) + bot suy vai / Phó bảo vệ sếp.
// Chạy: node bang/test/logic.mjs
import { createGame, applyAction, topPrompt, viewFor, setRandom } from '../js/engine.js';
import { botAction, suspicion } from '../js/bot.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('❌', m); } else console.log('✅', m); };
let seed = 7; setRandom(() => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; });

// Dựng ván 5 người với vai cố định
function game() {
  const s = createGame(['A', 'B', 'C', 'D', 'E'].map(id => ({ id, name: id, isBot: true })));
  const roles = { A: 'sheriff', B: 'deputy', C: 'outlaw', D: 'outlaw', E: 'renegade' };
  for (const p of s.players) { p.role = roles[p.id]; p.revealed = p.role === 'sheriff'; p.character = 'bartcassidy'; p.hp = p.maxHp = 4 + (p.role === 'sheriff' ? 1 : 0); p.table = []; }
  s.pending = []; s.step = 'play'; s.turn = 2; // lượt của C
  return s;
}
const card = (s, type, suit = 'S') => { const c = { id: 'x' + Math.random().toString(36).slice(2, 7), type, suit, rank: 5 }; return c; };

// 1) BANG! được ghi vào acts, kết quả cập nhật khi né / trúng
{
  const s = game(); const C = s.players[2], A = s.players[0];
  const b = card(s, 'bang'); C.hand = [b]; A.hand = [card(s, 'missed')];
  const r = applyAction(s, 'C', { type: 'play_card', cardId: b.id, target: 'B' });
  // B ngồi cạnh C (khoảng cách 1)
  ok(r.ok, 'C bắn được B');
  const a = s.acts[s.acts.length - 1];
  ok(a.card === 'bang' && a.by === 'C' && a.to === 'B', 'acts ghi "C bắn B"');
  applyAction(s, 'B', { type: 'take_hit' });
  ok(a.res === 'hit', 'B chịu đòn → res = hit');
  ok(Array.isArray(viewFor(s, 'D').acts) && viewFor(s, 'D').acts.some(x => x.id === a.id), 'view của người khác có acts (công khai)');
}
// 2) Ai bắn sếp bị nghi là Tội phạm; Phó ưu tiên bắn kẻ đó, không bao giờ bắn sếp
{
  const s = game();
  s.acts.push({ id: 900, n: s.turnCount, by: 'C', to: 'A', card: 'bang', res: 'hit' });
  const B = s.players[1];
  const sc = suspicion(s, B);
  ok(sc.C < 0, 'Phó nghi C (vừa bắn sếp): điểm ' + sc.C.toFixed(1));
  ok(sc.D === 0, 'D chưa làm gì: điểm 0');
  // lượt của Phó B, có BANG!, C và A đều trong tầm 1
  s.turn = 1; B.hand = [card(s, 'bang')]; B.bangs = 0;
  let shotSheriff = 0, shotC = 0;
  for (let i = 0; i < 50; i++) { const a = botAction(s, 'B'); if (a.type === 'play_card' && a.target === 'A') shotSheriff++; if (a.target === 'C') shotC++; }
  ok(shotSheriff === 0, 'Phó không bắn sếp (0/50)');
  ok(shotC === 50, 'Phó bắn C – kẻ vừa bắn sếp (' + shotC + '/50)');
}
// 3) Cảnh sát trưởng nghi kẻ vừa tấn công mình
{
  const s = game();
  s.acts.push({ id: 901, n: s.turnCount, by: 'E', to: 'A', card: 'duel', lost: 'A' });
  const sc = suspicion(s, s.players[0]);
  ok(sc.E < 0 && sc.B === 0, 'Sếp nghi E (vừa Duel sếp)');
  s.turn = 0; const A = s.players[0]; A.hand = [card(s, 'bang')]; A.bangs = 0;
  const a = botAction(s, 'A');
  ok(a.type === 'play_card' && a.target === 'E', 'Sếp bắn E (E ngồi cạnh)');
}
// 4) Kẻ hai mặt không bắn sếp khi còn Tội phạm
{
  const s = game(); s.turn = 4; const E = s.players[4]; E.hand = [card(s, 'bang')];
  let shot = 0; for (let i = 0; i < 30; i++) { const a = botAction(s, 'E'); if (a.target === 'A') shot++; }
  ok(shot === 0, 'Kẻ hai mặt chừa sếp khi còn Tội phạm');
}
// 5) Snapshot cũ (không có acts) vẫn chạy
{
  const s = game(); delete s.acts; delete s.actSeq;
  const C = s.players[2]; const b = card(s, 'beer', 'H'); C.hand = [b]; C.hp = 2;
  const r = applyAction(s, 'C', { type: 'play_card', cardId: b.id });
  ok(r.ok && s.acts.length === 1 && s.acts[0].card === 'beer', 'state cũ thiếu acts: tự tạo, không lỗi');
  ok(!!botAction(s, 'C'), 'bot chạy được trên state cũ');
}
void topPrompt;
console.log(fails ? `\n❌ ${fails} kiểm tra hỏng` : '\n✅ Logic mới OK');
process.exit(fails ? 1 : 0);
