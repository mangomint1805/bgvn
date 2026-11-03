// "Thầy đồ" cho người mới: chủ phòng tính gợi ý cho người chơi (bản sao state, không đụng ván thật) bằng chính bộ não bot,
// rồi giải thích bằng lời: nên đánh lá nào, vào ai, vì sao. Chỉ dùng thông tin công khai + vai của chính người được gợi ý.
import { botAction, relation } from './bot.js?v=7';
import { getPlayer, top, inRange, distance, alivePlayers, applyAction, armorOf, weaponOf, hasSkill, responseOptions } from './engine.js?v=7';
import { CARD_INFO, SKILLS, ROLES, GENERALS, SUIT_SYMBOL, SUIT_NAME, rankLabel, cardName } from './cards.js?v=7';

const clean = n => String(n || '?').replace(/ 🤖$/, '');
const lbl = c => (c ? `${cardName(c)} ${SUIT_SYMBOL[c.suit]}${rankLabel(c.rank)}` : '?');
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

// Bot dùng Math.random cho vài quyết định "hên xui": khi gợi ý thì cố định để lời khuyên ổn định, chọn nước chắc ăn.
function steady(fn) { const R = Math.random; Math.random = () => 0.5; try { return fn(); } finally { Math.random = R; } }

// Lời mô tả phe của q theo góc nhìn người chơi me (chỉ dựa trên hành động công khai trên bàn – s.lean)
export function sideNote(s, me, q) {
  if (q === me) return 'chính bạn';
  const nmq = clean(q.name);
  if (q.role === 'lord') return me.role === 'rebel' ? `${nmq} là Chúa công – mục tiêu số 1` : me.role === 'spy' ? `${nmq} là Chúa công (để dành tới cuối)` : `${nmq} là Chúa công – phải bảo vệ`;
  if (alivePlayers(s).length === 2) return `chỉ còn 2 người – phải hạ ${nmq}`;
  const lean = s.lean[q.id] || 0;
  if (lean <= -2) return `${nmq} có thể là Phản tặc (từng đánh phe Chúa)`;
  if (lean <= -1) return `${nmq} có vẻ chống Chúa công`;
  if (lean >= 2) return `${nmq} có vẻ là phe Chúa (hay giúp Chúa công)`;
  if (lean >= 1) return `${nmq} hơi nghiêng về phe Chúa`;
  return `${nmq} chưa rõ phe`;
}
const relWord = (s, me, q) => { const r = relation(s, me, q); return r > 0 ? 'đồng minh' : r < 0 ? 'địch' : 'chưa rõ'; };
function targetWhy(s, me, q, { range = false } = {}) {
  const bits = [];
  if (range && q !== me) bits.push(`đang trong tầm (cách ${distance(s, me, q)})`);
  bits.push(sideNote(s, me, q));
  if (q.alive && q.hp <= 1) bits.push('chỉ còn 1 máu'); else if (q.alive && q.hp === 2 && relation(s, me, q) < 0) bits.push('còn 2 máu');
  return bits.join(', ');
}
const findCard = (p, id) => [...p.hand, ...Object.values(p.equip).filter(Boolean)].find(c => c.id === id);

// ---------- giải thích 1 hành động ----------
function explain(s, me, t, ask, a) {
  const P = id => getPlayer(s, id); const out = { a, cards: [], targets: [], text: '', why: '' };
  const tg = (a.targets || []).map(P).filter(Boolean); out.targets = tg.map(q => q.id);
  if (a.ids) out.cards = [...a.ids]; if (a.id) out.cards = [a.id]; if (a.cardId) out.cards = [a.cardId];
  const others = alivePlayers(s).filter(q => q !== me);
  switch (a.type) {
    case 'use': {
      const c = findCard(me, a.ids[0]); const as = a.as; const info = CARD_INFO[as]; const conv = c && c.type !== as && !(as === 'sat' && c.el);
      const via = conv ? ` (dùng ${lbl(c)} như ${info.name})` : '';
      const T = tg[0];
      if (['weapon', 'armor', 'plus', 'minus'].includes(info.kind)) {
        const old = me.equip[info.kind];
        out.text = `Trang bị ${cardName(c)}`; out.why = info.short + (old ? ` (tốt hơn ${cardName(old)})` : ' – ô còn trống');
        if (info.kind === 'weapon') out.why += `, tầm đánh thành ${info.range}`;
      } else if (as === 'dao') { out.text = 'Ăn Đào'; out.why = `hồi 1 máu (đang ${me.hp}/${me.maxHp})`; }
      else if (as === 'jiu') { out.text = 'Uống Rượu'; out.why = 'Sát kế tiếp gây thêm 1 sát thương'; }
      else if (as === 'wuzhong') { out.text = 'Dùng Vô trung sinh hữu'; out.why = 'rút thêm 2 lá – dùng sớm để có thêm lựa chọn'; }
      else if (as === 'sat' || as === 'hoasat') {
        out.text = `${as === 'hoasat' ? 'Hỏa Sát' : 'Sát'} ${tg.map(q => clean(q.name)).join(', ')}${via}`;
        out.why = T ? targetWhy(s, me, T, { range: true }) : '';
        if (as === 'hoasat' && T && armorOf(T) === 'tengjia') out.why += ' · Đằng giáp sợ lửa: +1 sát thương';
        else if (as === 'hoasat' && T && T.flags.chained) out.why += ' · đang bị xích: lửa lan sang người bị xích khác';
        if (me.flags.drunk) out.why += ' · đang say Rượu: +1 sát thương';
      }
      else if (as === 'lebu') { out.text = `Đặt Lạc bất lên ${clean(T.name)}${via}`; out.why = `${targetWhy(s, me, T)} – 3/4 khả năng họ mất pha Ra bài`; }
      else if (as === 'bingliang') { out.text = `Đặt Binh lương lên ${clean(T.name)}`; out.why = `${targetWhy(s, me, T)} – họ dễ mất pha Rút bài`; }
      else if (as === 'guohe') { const fr = relation(s, me, T) > 0; out.text = `Quá hà sách kiều ${clean(T.name)}${via}`; out.why = fr ? `gỡ lá trì hoãn đang treo trên đầu ${clean(T.name)} (đồng minh)` : `phá 1 lá của ${clean(T.name)}: ${targetWhy(s, me, T)}`; }
      else if (as === 'shunshou') { const fr = relation(s, me, T) > 0; out.text = `Thuận thủ ${clean(T.name)}`; out.why = fr ? `lấy lá trì hoãn khỏi ${clean(T.name)} (đồng minh)` : `cướp 1 lá của người ngồi sát bạn: ${targetWhy(s, me, T)}`; }
      else if (as === 'juedou') { const n = responseOptions(s, me, 'sat').length; out.text = `Quyết đấu ${clean(T.name)}`; out.why = `${targetWhy(s, me, T)} · bạn có ${n} Sát để đấu`; }
      else if (as === 'nanman' || as === 'wanjian') { const e = others.filter(q => relation(s, me, q) < 0).length, f = others.filter(q => relation(s, me, q) > 0).length; out.text = `Dùng ${info.name}`; out.why = `đòn cả bàn: ${e} địch, ${f} đồng minh – lợi nhiều hơn hại`; }
      else if (as === 'taoyuan') { out.text = 'Dùng Đào viên kết nghĩa'; out.why = 'phe bạn mất máu nhiều hơn – cả bàn hồi nhưng bạn lời'; }
      else if (as === 'wugu') { out.text = 'Dùng Ngũ cốc phong đăng'; out.why = 'bạn được chọn lá trước tiên, đồng minh cũng có bài'; }
      else if (as === 'huogong') { out.text = `Hỏa công ${clean(T.name)}${via}`; out.why = `${targetWhy(s, me, T)} · tay bạn đủ chất để khớp`; }
      else if (as === 'tiesuo') {
        if (!tg.length) { out.text = 'Trùng chú Thiết tác liên hoàn'; out.why = 'bỏ lá này để rút 1 lá mới (không cần xích ai)'; }
        else { const un = tg.every(q => q.flags.chained); out.text = `${un ? 'Gỡ xích' : 'Xích'} ${tg.map(q => clean(q.name)).join(', ')}${via}`; out.why = un ? 'gỡ xích cho phe mình khỏi bị lửa/sét lan' : 'xích địch: Hỏa/Lôi Sát trúng 1 là cả xích dính'; }
      }
      else if (as === 'jiedao') { out.text = `Tá đao: bắt ${clean(tg[0].name)} Sát ${clean(tg[1].name)}`; out.why = `${sideNote(s, me, tg[1])}; không chém thì ${clean(tg[0].name)} mất vũ khí`; }
      else if (as === 'shandian') { out.text = 'Đặt Thiểm điện'; out.why = 'bom sét chuyền quanh bàn: ra ♠2–9 là mất 3 máu'; }
      else { out.text = `Dùng ${info.name}`; out.why = info.short; }
      return out;
    }
    case 'skill': {
      const sk = SKILLS[a.skill]; const nmS = a.skill === 'xamau' ? 'Xà mâu (2 lá = Sát)' : `[${sk.name}]`;
      out.text = `Dùng ${nmS}${tg.length ? ' → ' + tg.map(q => clean(q.name)).join(', ') : ''}`;
      const W = {
        khonhuc: `mất 1 máu đổi 2 lá – bạn còn ${me.hp} máu, đủ dư`, thanhnang: 'bỏ 1 lá rác để hồi máu cho người đang thương', chehanh: 'đổi lá vô dụng lấy lá mới',
        nhanduc: 'tặng bài thừa cho đồng minh (tặng đủ 2 lá còn hồi 1 máu)', phangian: 'bắt địch đoán chất – đoán sai là mất máu', ligian: 'bắt hai người nam quyết đấu nhau – bạn không tốn máu',
        cuongtap: 'gây thẳng 1 sát thương, không Né được', khuho: 'đọ bài – thắng thì mượn tay họ đánh địch', thiennghia: 'đọ bài – thắng thì được chém thêm và không cần tầm',
        ketnhan: 'bạn và đồng minh nam cùng hồi máu', loankich: 'ghép 2 lá cùng chất thành Vạn tiễn tề phát', xamau: 'ghép 2 lá rác thành 1 Sát',
      };
      out.why = W[a.skill] || (sk ? sk.desc : '');
      if (tg[0] && tg[0] !== me && ['phangian', 'cuongtap', 'xamau', 'khuho', 'thiennghia'].includes(a.skill)) out.why += ` · ${sideNote(s, me, tg[0])}`;
      return out;
    }
    case 'end': {
      const over = me.hand.length - Math.max(0, me.hp);
      out.text = 'Kết thúc lượt';
      const sats = me.hand.filter(c => c.type === 'sat').length;
      out.why = (sats && !(s.tf.slashes) ? 'chưa có địch rõ ràng trong tầm – giữ Sát để đỡ đòn' : 'hết nước đi có lợi') + (over > 0 ? ` · sẽ phải bỏ ${over} lá` : '');
      return out;
    }
    case 'respond': {
      const cs = a.ids.map(id => findCard(me, id)); const o = (ask.options || []).find(x => x.ids && x.ids[0] === a.ids[0]);
      const as = o ? o.as : ask.want; const asName = CARD_INFO[as] ? CARD_INFO[as].name : 'lá';
      out.text = a.ids.length === 2 ? `Ghép ${cs.map(lbl).join(' + ')} thành Sát (Xà mâu)` : `Đánh ${lbl(cs[0])}${cs[0] && cs[0].type !== as ? ` như ${asName}` : ''}`;
      out.why = respondWhy(s, me, ask, true);
      return out;
    }
    case 'pass': {
      out.text = ({ sat: 'Chịu đòn', wanjian: 'Chịu đòn', nanman: 'Chịu đòn', duel: 'Chịu thua', jiedao: 'Giao vũ khí', dying: 'Không cứu', quytai: 'Không đổi phán định' })[ask.purpose] || 'Bỏ qua';
      out.why = ask.type === 'nullify' ? nullWhy(s, me, ask, false) : ask.type === 'card' ? respondWhy(s, me, ask, false) : passWhy(s, me, ask);
      return out;
    }
    case 'delegate': out.text = ask.want === 'ne' ? 'Nhờ Hộ giá' : 'Nhờ Kích tướng'; out.why = 'bạn không có lá phù hợp – nhờ tướng cùng nước đánh hộ'; return out;
    case 'discard': {
      const cs = a.ids.map(id => findCard(me, id)).filter(Boolean);
      out.text = `Bỏ ${cs.map(lbl).join(', ')}`;
      out.why = ask.purpose === 'phase' ? 'giữ lá quý (Đào, Né, Vô giải…), bỏ lá ít dùng nhất'
        : ask.purpose === 'huogong' ? `khớp chất ${SUIT_NAME[ask.suit]} → đốt ${clean(P(ask.tgt).name)} 1 máu` : ask.purpose === 'guanshi' ? 'bỏ 2 lá để Sát vẫn trúng dù họ đã Né'
        : ask.purpose === 'cuonglie' ? 'bỏ 2 lá còn hơn mất máu' : 'lá này ít giá trị, bỏ còn hơn cho họ rút';
      return out;
    }
    case 'targets': {
      const W = { duttap: 'lấy bài của người không phải đồng minh – vừa có bài, vừa làm họ yếu đi', thantoc: 'Sát thẳng địch yếu máu ở xa, không cần tầm', loikich: 'cho địch phán định: ra ♠ là 2 sát thương sét', tietmenh: 'cho người phe mình rút đầy bài', khuho: 'chọn địch để họ ăn đòn' };
      if (!tg.length) { out.text = ask.purpose === 'duttap' ? 'Rút bài bình thường' : 'Bỏ qua'; out.why = 'không có lựa chọn nào đáng'; }
      else { out.text = `Chọn ${tg.map(q => clean(q.name)).join(', ')}`; out.why = (W[ask.purpose] || '') + (tg[0] && tg[0] !== me ? ` · ${sideNote(s, me, tg[0])}` : ''); }
      return out;
    }
    case 'yes': case 'no': {
      const Y = { loay: ['Cởi giáp', 'có Sát/Quyết đấu và địch trong tầm – đánh đau hơn'], cuthu: ['Cố thủ', 'ít bài/yếu máu – rút 3 lá để thủ'], nietban: ['Niết bàn', 'sống lại 3 máu, không dùng thì chết'], hanbing: ['Phá 2 lá', 'đỡ phải đánh mất máu đồng minh / lột đồ địch'] }[ask.purpose] || ['Có', ''];
      const N = { loay: 'không có mục tiêu để Sát – rút đủ bài thì hơn', cuthu: 'bài còn ổn, không cần mất lượt sau', hanbing: 'gây sát thương có lợi hơn' }[ask.purpose] || '';
      out.text = a.type === 'yes' ? Y[0] : 'Không'; out.why = a.type === 'yes' ? Y[1] : N; return out;
    }
    case 'liuli': { const T = P(a.target); out.targets = [a.target]; out.text = `${ask.purpose === 'thienhuong' ? 'Chuyển sát thương' : 'Chuyển Sát'} sang ${clean(T.name)} (bỏ ${lbl(findCard(me, a.cardId))})`; out.why = sideNote(s, me, T); return out; }
    case 'pick': {
      if (ask.type === 'wugu') { const c = (t.hold || []).find(x => x.id === a.id); out.cards = []; out.text = `Chọn ${lbl(c)}`; out.why = 'lá có ích nhất cho bạn lúc này'; return out; }
      const from = P(ask.from); const rel = relation(s, me, from);
      if (a.zone === 'h') { out.text = `Bốc mù 1 lá trên tay ${clean(from.name)}`; out.why = 'bài trên tay thường quý hơn'; }
      else { const c = Object.values(from.equip).find(x => x && x.id === a.id) || (from.judge.find(j => j.card.id === a.id) || {}).card; const j = from.judge.find(x => x.card.id === a.id); out.cards = []; out.text = `${ask.mode === 'take' ? 'Lấy' : 'Phá'} ${j ? CARD_INFO[j.as].name : lbl(c)}`; out.why = j ? `gỡ lá trì hoãn giúp ${clean(from.name)}` : rel <= 0 ? 'lột trang bị của địch – giáp/ngựa là quý nhất' : ''; }
      return out;
    }
    case 'general': { const g = GENERALS[a.id]; out.cards = []; out.text = `Chọn ${g.name}`; out.why = `${g.hp} máu · ${g.skills.map(k => SKILLS[k].name).join(', ')}: ${SKILLS[g.skills[0]].desc}`; return out; }
    case 'guanxing': out.text = 'Lá tốt để trên, lá xấu xuống đáy'; out.why = me.judge.some(j => j.as === 'lebu') ? 'đang bị Lạc bất: đưa lá ♥ lên đầu để phán định thoát' : 'lượt này bạn sẽ rút các lá trên cùng'; return out;
    case 'suit': out.text = `Đoán ${SUIT_SYMBOL[a.suit]} ${SUIT_NAME[a.suit]}`; out.why = 'không nhìn được bài nên đoán đại – mỗi chất ~1/4 khả năng'; return out;
    case 'show': { const c = findCard(me, a.id); out.text = `${ask.purpose === 'pindian' ? 'Đọ bằng' : 'Lật'} ${lbl(c)}`; out.why = ask.purpose === 'pindian' ? 'lá số lớn nhất của bạn (K lớn nhất, A nhỏ nhất)' : 'lật lá chất hiếm, đối phương khó có lá cùng chất để đốt'; return out; }
  }
  out.text = 'Làm theo gợi ý'; return out;
}
function respondWhy(s, me, ask, yes) {
  const src = ask.src ? getPlayer(s, ask.src) : null; const fw = ask.forWho ? getPlayer(s, ask.forWho) : null;
  switch (ask.purpose) {
    case 'sat': return yes ? 'Né đòn để không mất máu' : (ask.options || []).some(o => o.ids) ? 'còn khoẻ, giữ Né cho đòn nguy hiểm hơn' : 'bạn không có lá Né';
    case 'wanjian': return yes ? 'Né mưa tên để không mất máu' : 'bạn không có lá Né';
    case 'nanman': return yes ? 'đánh Sát đuổi voi để không mất máu' : 'bạn không có lá Sát';
    case 'duel': return yes ? `ra Sát để không thua ${src ? clean(src.name) : ''} trong Quyết đấu` : src && relation(s, me, src) > 0 ? `đồng minh với ${clean(src.name)} – chịu thua cho nhanh, khỏi phí Sát` : 'hết lá Sát – đành chịu thua';
    case 'dying': return fw === me ? (yes ? 'tự cứu mình – không thì tử trận!' : 'không còn Đào/Rượu') : yes ? `cứu ${clean(fw.name)}: ${sideNote(s, me, fw)}` : `không cứu: ${sideNote(s, me, fw)}`;
    case 'delegate': return yes ? `đánh hộ ${clean(fw.name)}: ${sideNote(s, me, fw)}` : `không đánh hộ: ${sideNote(s, me, fw)}`;
    case 'qinglong': return yes ? 'Thanh long đao: họ vừa Né, chém tiếp phát nữa' : 'không còn Sát để chém tiếp';
    case 'jiedao': { const b = getPlayer(s, ask.target); return yes ? `Sát ${clean(b.name)}: ${sideNote(s, me, b)}` : `không chém ${clean(b.name)} (${relWord(s, me, b)}) – giao vũ khí còn hơn`; }
    case 'quytai': return yes ? 'đổi lá phán định cho kết quả có lợi cho phe bạn' : 'kết quả phán định hiện tại đã ổn';
  }
  return '';
}
function nullWhy(s, me, ask, yes) {
  const tgt = ask.tgt ? getPlayer(s, ask.tgt) : null; const trick = CARD_INFO[ask.trick] ? CARD_INFO[ask.trick].name : 'cẩm nang';
  if (!tgt) return '';
  const effective = ask.count % 2 === 0; const harm = !['wuzhong', 'taoyuan', 'wugu'].includes(ask.trick);
  const who = tgt === me ? 'bạn' : clean(tgt.name);
  if (yes) return `${trick} ${effective ? (harm ? 'đang hại' : 'đang giúp') : 'vừa bị huỷ, giờ huỷ lại cho'} ${who} – ${sideNote(s, me, tgt)}`;
  if (relation(s, me, tgt) === 0 && tgt !== me) return `${who} chưa rõ phe – giữ Vô giải cho lúc cần`;
  return `${trick} lên ${who} không đáng tốn Vô giải`;
}
function passWhy(s, me, ask) {
  if (ask.type === 'discard') return ({ huogong: 'không có lá cùng chất (hoặc không đáng đốt người này)', guanshi: 'không đáng bỏ 2 lá', songco: 'bài trên tay đều quý – để họ rút 1 lá', cuonglie: 'mất 1 máu còn hơn bỏ 2 lá quý' })[ask.purpose] || '';
  if (ask.type === 'liuli') return 'không có lá/không có địch phù hợp để chuyển';
  return '';
}

// ---------- tình huống (đọc to câu hỏi bằng lời dễ hiểu) ----------
function situation(s, me, t, ask) {
  const P = id => (id ? getPlayer(s, id) : null); const src = P(ask.src);
  const nmP = q => (q ? (q === me ? 'bạn' : clean(q.name)) : '?');
  switch (ask.type) {
    case 'play': return 'Pha Ra bài: dùng bao nhiêu lá cũng được, nhưng mỗi lượt chỉ 1 Sát (trừ khi có Liên nỏ/kỹ năng).';
    case 'discard': if (ask.purpose === 'phase') return `Pha Bỏ bài: cuối lượt chỉ giữ số lá bằng số máu (${me.hp}) – phải bỏ ${ask.n} lá.`; return '';
    case 'card': {
      const want = CARD_INFO[ask.want] ? CARD_INFO[ask.want].name : 'lá';
      const S = { sat: `${cap(nmP(src))} Sát bạn: đánh ${want}${ask.need > 1 ? ` (cần ${ask.need} lá)` : ''} để không mất máu.`, wanjian: `${cap(nmP(src))} bắn Vạn tiễn: ai không có Né mất 1 máu.`, nanman: `${cap(nmP(src))} thả voi Nam man: ai không ra Sát mất 1 máu.`,
        duel: `Quyết đấu với ${nmP(src)}: hai bên thay phiên ra Sát, ai hết trước mất 1 máu.`, dying: ask.forWho === me.id ? 'Bạn đang hấp hối (0 máu): ăn Đào/uống Rượu để sống!' : `${cap(nmP(P(ask.forWho)))} hấp hối – ai có Đào có thể cứu.`,
        delegate: `${cap(nmP(P(ask.forWho)))} là Chúa công, nhờ bạn đánh ${want} hộ.`, qinglong: 'Họ vừa Né – Thanh long đao cho bạn chém thêm 1 Sát.', jiedao: `${cap(nmP(src))} dùng Tá đao: bạn phải Sát ${nmP(P(ask.target))}, không thì mất vũ khí.`, quytai: 'Quỷ tài: bạn có thể thay lá phán định bằng 1 lá trên tay.' };
      return S[ask.purpose] || '';
    }
    case 'nullify': { const tg = P(ask.tgt); return `${cap(nmP(src))} dùng ${CARD_INFO[ask.trick].name}${tg ? ' lên ' + nmP(tg) : ''}. Vô giải khả kích huỷ được lá này${ask.count ? ' (đã có người Vô giải – đánh thêm là huỷ ngược lại)' : ''}.`; }
    case 'general': return 'Chọn võ tướng: mỗi tướng có máu và kỹ năng riêng – bấm tên kỹ năng để xem chi tiết.';
    case 'pick': return 'Bài trên tay thì bốc mù, trang bị và lá trì hoãn thì nhìn thấy rõ.';
  }
  return '';
}

// ---------- điểm vào: gợi ý cho pid tại câu hỏi hiện tại ----------
export function coachHint(state, pid, dbg = false) {
  if (!state || state.phase !== 'playing') return null;
  const t0 = top(state); if (!t0 || !t0.ask || !t0.ask.players.includes(pid)) return null;
  const s = JSON.parse(JSON.stringify(state));
  try {
    return steady(() => {
      const me = getPlayer(s, pid); if (!me || !me.alive) return null;
      const t = top(s); const ask = t.ask;
      const hint = { type: ask.type, sit: situation(s, me, t, ask), steps: [] };
      const orig = new Set(me.hand.map(c => c.id));
      for (let i = 0; i < (ask.type === 'play' ? 3 : 1); i++) {
        const tt = top(s); if (!tt || !tt.ask || !tt.ask.players.includes(pid) || (i && tt.ask.type !== 'play')) break;
        const a = botAction(s, pid); if (!a) break;
        // bot hay đeo vũ khí tầm ngắn rồi lại thay bằng cây tầm xa hơn: gợi ý thẳng cây tốt nhất
        if (a.type === 'use' && a.ids && CARD_INFO[a.as] && CARD_INFO[a.as].kind === 'weapon') {
          const sats = me.hand.filter(c => c.type === 'sat').length;
          const ws = me.hand.filter(c => CARD_INFO[c.type].kind === 'weapon').sort((x, y) => (y.type === 'zhuge' && sats >= 2 ? 9 : CARD_INFO[y.type].range) - (x.type === 'zhuge' && sats >= 2 ? 9 : CARD_INFO[x.type].range));
          if (ws[0] && ws[0].id !== a.ids[0]) { a.ids = [ws[0].id]; a.as = ws[0].type; }
        }
        const step = explain(s, me, tt, tt.ask, a);
        const r = applyAction(s, pid, JSON.parse(JSON.stringify(a)));
        if (!r.ok) { if (!i) return { ...hint, steps: [] }; break; }
        hint.steps.push(step);
        if (a.type === 'end' || ask.type !== 'play') break;
        if (me.hand.some(c => !orig.has(c.id))) break; // có bài mới (chưa biết trước) – dừng kế hoạch ở đây
      }
      return hint;
    });
  } catch (e) { if (dbg) throw e; return null; }
}

// ---------- giải thích các pha (dùng ở giao diện) ----------
export const PHASE_HELP = {
  start: ['Chuẩn bị', 'Đầu lượt: một số kỹ năng kích hoạt ở đây (Quan tinh, Lạc thần, Thần tốc…).'],
  judge: ['Phán định', 'Lá trì hoãn trước mặt (Lạc bất, Binh lương, Thiểm điện) lần lượt được "xét": lật lá trên cùng chồng bài, chất của nó quyết định bạn có dính hiệu ứng không.'],
  draw: ['Rút bài', 'Rút 2 lá từ chồng bài (một số tướng rút nhiều/ít hơn).'],
  play: ['Ra bài', 'Dùng lá và kỹ năng tuỳ thích: trang bị, Đào, cẩm nang… Mỗi lượt chỉ được 1 Sát (trừ Liên nỏ/kỹ năng). Xong thì bấm Kết thúc lượt.'],
  discard: ['Bỏ bài', 'Cuối lượt chỉ được giữ số lá bằng số máu hiện tại – thừa thì phải bỏ bớt. Vì vậy máu càng nhiều càng giữ được nhiều bài.'],
  end: ['Kết thúc', 'Một số kỹ năng cuối lượt (Bế nguyệt, Cứ thủ) kích hoạt, rồi tới lượt người kế tiếp theo chiều kim đồng hồ.'],
};
export { ROLES };
