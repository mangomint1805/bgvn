// 🎓 Ván tập: máy giải thích từng bước bằng bong bóng (chỉ ván offline có opts.tutorial).
// Bong bóng mở thì đồng hồ + bot tạm dừng; "Hiểu rồi" là chạy tiếp, "Bỏ qua hướng dẫn" là tắt hẳn.
import { ROLES, isWolfRole } from './engine.js?v=4';
import * as fx from './fx.js?v=4';

let el = null, curKey = null, hlEl = null;
const active = c => c.isHost && c.net && c.net.offline && c.net.tut && c.view && c.view.opts && c.view.opts.tutorial && !c.net.tut.off;

export function coachHide() {
  if (el) el.remove(); el = null; curKey = null;
  if (hlEl) hlEl.classList.remove('coach-hl'); hlEl = null;
}
// gợi ý nên làm gì (ban ngày / bỏ phiếu)
function tip(c, voting) {
  const v = c.view, m = v.me, nm = c.pname;
  const alive = v.players.filter(p => p.alive && p.id !== m.id);
  if (isWolfRole(m.role)) return voting ? '💡 Bạn là Sói: bầu theo số đông (người đang bị nghi nhiều nhất, miễn không phải bạn) để khỏi lộ.' : '💡 Bạn là Sói: đừng im lặng quá – chat vài câu và chỉ điểm 1 người khác cho đỡ bị nghi.';
  const seenWolf = m.role === 'seer' && Object.entries(m.seen || {}).find(([id, r]) => r === 'wolf' && alive.some(p => p.id === id));
  if (seenWolf) return voting ? `💡 Bầu <b>${c.esc(nm(seenWolf[0]))}</b> – bạn đã soi ra là Sói!` : `💡 Bạn đã soi ra <b>${c.esc(nm(seenWolf[0]))}</b> là Sói → bấm <b>📢 Khai soi</b> rồi chỉ điểm hắn.`;
  const cl = (v.claims || []).filter(x => x.res === 'wolf' && x.by !== m.id && alive.some(p => p.id === x.target)).pop();
  if (cl) return `💡 ${c.esc(nm(cl.by))} khai ${c.esc(nm(cl.target))} là Sói. Không ai khai ngược thì ${voting ? 'bầu' : 'nghi'} <b>${c.esc(nm(cl.target))}</b> là hợp lý.`;
  const acc = {}; for (const t of Object.values((v.dayInfo && v.dayInfo.accuse) || {})) if (t !== m.id) acc[t] = (acc[t] || 0) + 1;
  const top = Object.entries(acc).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 2) return `💡 <b>${c.esc(nm(top[0]))}</b> đang bị chỉ điểm nhiều nhất (👉 ${top[1]}). Bạn thấy sao?`;
  if (m.role === 'witch' && v.potions && v.potions.poison) return '💡 Bạn là Phù Thủy: để ý ai bị nghi, đêm nay có thể đầu độc người đó.';
  return voting ? '💡 Chưa chắc ai thì bấm <b>🙅 Bỏ qua</b> cũng được – treo nhầm dân là Sói mừng lắm.' : '💡 Chưa có manh mối: để ý ai nói gì, ai im re… Ngày đầu Bỏ qua cũng không sao.';
}
const ROLE_TXT = {
  seer: 'Bạn là <b>🔮 Tiên Tri</b> – phe Dân. Mỗi đêm soi 1 người xem có phải Sói không. Ban ngày có thể <b>📢 Khai kết quả</b> cho cả làng tin (nhưng Sói cũng biết mà cắn bạn!).',
  guard: 'Bạn là <b>🛡️ Bảo Vệ</b> – phe Dân. Mỗi đêm che 1 người khỏi Sói cắn (che chính mình cũng được), không che cùng 1 người 2 đêm liền.',
  witch: 'Bạn là <b>🧪 Phù Thủy</b> – phe Dân. Mỗi đêm biết ai vừa bị Sói cắn; có <b>1 bình cứu + 1 bình độc</b>, mỗi bình dùng 1 lần cả ván.',
  wolf: 'Bạn là <b>🐺 Ma Sói</b>! Mỗi đêm chọn 1 người để cắn. Ban ngày giả làm dân lành, đừng để bị treo cổ. Sói thắng khi số Sói ≥ số người còn lại.',
};
const STEP_TXT = {
  guard: ['🛡️ Bảo Vệ thức dậy', 'Bảo Vệ che chở 1 người: nếu Sói cắn trúng người đó thì không ai chết.',
    '👉 <b>Lượt của bạn:</b> chạm vào 1 ghế (viền cam) rồi bấm <b>🛡️ Bảo vệ</b>. 💡 Đêm đầu chưa có manh mối – che chính mình cũng được.'],
  seer: ['🔮 Tiên Tri thức dậy', 'Tiên Tri chọn 1 người để soi: biết người đó có phải Sói không.',
    '👉 <b>Lượt của bạn:</b> chạm 1 ghế → bấm <b>🔮 Soi</b>. Kết quả hiện ngay và ghi vào 📒 Sổ tay (khung chat). 💡 Đêm đầu cứ soi đại 1 người.'],
  wolves: ['🐺 Bầy Sói thức dậy', 'Sói chọn 1 người để cắn. Nhiều Sói thì phải thống nhất, có kênh chat 🐺 riêng.',
    '👉 <b>Lượt của bạn:</b> chạm vào ghế con mồi là chốt. 💡 Ưu tiên người có vẻ là Tiên Tri/Bảo Vệ; đêm đầu cắn đại cũng được.'],
  witch: ['🧪 Phù Thủy thức dậy', 'Phù Thủy được biết ai vừa bị Sói cắn, có thể cứu hoặc đầu độc 1 người.',
    '👉 <b>Lượt của bạn:</b> bấm <b>🧪 Cứu …</b> để cứu nạn nhân, hoặc <b>☠️ Đầu độc…</b> rồi chạm 1 người; xong bấm <b>✨ Xong</b>. 💡 Đêm đầu nên cứu; giữ bình độc tới khi chắc ai là Sói.'],
};
const SLEEP = '😴 Không phải lượt bạn – cứ chờ. Chơi thật thì <b>ai cũng cúi xuống điện thoại</b> để không lộ ai đang bấm.';

function pick(c) {
  const v = c.view, m = v.me, seen = c.net.tut.seen, has = k => seen.includes(k);
  if (!m) return null;
  if (!has('welcome')) return { key: 'welcome', title: '🎓 Chào mừng tới Ván tập!', ok: 'Xem vai của tôi ›',
    html: 'Làng có <b>6 người</b>: bạn + 5 bot. Bộ vai: 🐺 1 Sói · 🔮 Tiên Tri · 🛡️ Bảo Vệ · 🧪 Phù Thủy · 🧑‍🌾 2 Dân.<br>Máy làm quản trò. Mỗi lần máy giải thích, <b>đồng hồ tạm dừng</b> – cứ đọc thong thả.<br>🎯 Dân phải tìm và treo cổ Sói; Sói thì ăn thịt dần cả làng.' };
  if (c.modalKey() === 'reveal' || c.revealPending) return { hold: true };
  if (!has('myrole')) return { key: 'myrole', title: '🃏 Vai của bạn', hl: '#mycard',
    html: (ROLE_TXT[m.role] || `Bạn là <b>${ROLES[m.role].emoji} ${ROLES[m.role].name}</b>. ${ROLES[m.role].short}`) + '<br>Quên vai? <b>Bấm giữ</b> ô “Giữ để xem vai” ở góc dưới.' };
  if (c.modalKey()) return null;
  if (!m.alive && v.phase !== 'ended' && !has('ghost')) return { key: 'ghost', title: '👻 Bạn đã thành hồn ma', hl: '#dock',
    html: 'Giờ bạn xem được vai mọi người và chat Sói, nhưng chỉ nói được ở kênh <b>👻 Hồn ma</b>. Ván vẫn chạy tới hết – xem làng xoay xở nhé! (Hết ván có <b>🎞️ Xem lại</b> từng đêm.)' };
  if (v.phase === 'night' && v.day === 1 && STEP_TXT[v.step] && !has('n-' + v.step)) {
    const [t, base, mine] = STEP_TXT[v.step]; const my = v.myTurn && m.alive;
    return { key: 'n-' + v.step, title: t, hl: my ? '#act' : null, html: `${base}<br>${my ? mine : SLEEP}` };
  }
  if (v.phase === 'dawn' && v.day === 1 && !has('dawn')) return { key: 'dawn', title: '🐓 Trời sáng', html: 'Máy công bố ai chết đêm qua (hoặc đêm bình yên nếu Bảo Vệ/Phù Thủy cứu kịp). Ván tập bật sẵn <b>lộ vai khi chết</b> để bạn dễ theo dõi.' };
  if (!m.alive) return null;
  if (v.phase === 'day' && v.day <= 3 && !has('day' + v.day)) {
    if (v.day === 1) return { key: 'day1', title: '☀️ Ban ngày – thảo luận', hl: '#seats-wrap',
      html: `Cả làng bàn xem ai là Sói: chat ở khung dưới, <b>chạm vào ghế để chỉ điểm 👉</b> người bạn nghi. Bấm <b>✋ Sẵn sàng bầu</b> – ai còn sống cũng sẵn sàng là sang bỏ phiếu ngay (chủ phòng có nút <b>⏩ Bầu sớm</b>).<br>${tip(c, false)}` };
    return { key: 'day' + v.day, title: `☀️ Ngày ${v.day}`, html: tip(c, false) };
  }
  if (v.phase === 'vote' && v.day <= 3 && !m.idiotOut && !has('vote' + v.day)) {
    if (v.day === 1) return { key: 'vote1', title: '⚖️ Bỏ phiếu treo cổ', hl: '#seats-wrap',
      html: `Chạm vào người muốn treo (đổi ý được tới khi ai cũng bầu xong), hoặc <b>🙅 Bỏ qua</b>. Người nhiều phiếu nhất bị treo – trừ khi số phiếu Bỏ qua nhiều hơn hoặc bằng.<br>${tip(c, true)}` };
    return { key: 'vote' + v.day, title: '⚖️ Bỏ phiếu', html: tip(c, true) };
  }
  if (v.phase === 'last' && !has('last')) return { key: 'last', title: '🪢 Lời trăng trối', html: 'Người bị treo được nói 1 câu cuối rồi mới chết. Nghe kỹ – đôi khi lộ manh mối đó!' };
  return null;
}

export function coachCheck(c) {
  if (!active(c)) { if (el) coachHide(); if (c.net && c.net.paused && c.view && c.view.opts && c.view.opts.tutorial) c.net.pause(false); return; }
  const v = c.view;
  if (v.phase === 'ended') { coachHide(); return; }
  const k = pick(c);
  if (!k) { coachHide(); if (c.net.paused) c.net.pause(false); return; }
  if (k.hold) { coachHide(); c.net.pause(true); return; }
  if (k.key === curKey) return;
  show(c, k);
}
function show(c, k) {
  coachHide();
  curKey = k.key;
  el = document.createElement('div');
  el.className = 'coach'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Hướng dẫn ván tập');
  el.innerHTML = `<div class="co-h"><b>${k.title}</b><span class="co-p"><i class="pz"></i> dừng giờ</span></div><div class="co-t">${k.html}</div>
    <div class="co-b"><button class="btn sm" id="co-skip">Bỏ qua hướng dẫn</button><button class="btn pri sm" id="co-ok">${k.ok || 'Hiểu rồi ›'}</button></div>`;
  document.body.appendChild(el);
  if (k.hl) { hlEl = document.querySelector(k.hl); if (hlEl) hlEl.classList.add('coach-hl'); }
  c.net.pause(true);
  fx.sfx.click();
  el.querySelector('#co-ok').onclick = () => {
    c.net.tutSeen(k.key); coachHide(); fx.sfx.ok();
    if (k.key === 'welcome') setTimeout(c.revealModal, 150);
    setTimeout(() => coachCheck(c), 250);
  };
  el.querySelector('#co-skip').onclick = () => { c.net.tutOff(); coachHide(); c.net.pause(false); fx.sfx.click(); };
}
// dòng nhắn cuối ván tập (trong bảng kết quả)
export function coachTipEnd(c) {
  const v = c.view;
  if (!(v && v.opts && v.opts.tutorial && c.isHost)) return '';
  return '<p class="ctr tut-end">🎓 Xong ván tập rồi! Bấm <b>🎞️ Xem lại cả ván</b> để xem từng đêm ai làm gì. Sẵn sàng thì ra trang chủ: <b>🤖 Chơi với bot</b> hoặc <b>🏮 Tạo phòng</b> cùng hội bạn.</p>';
}
