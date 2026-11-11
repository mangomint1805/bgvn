// 🎯 Thật hay Thách – giao diện. Luật ở engine.js, bộ câu hỏi ở cards.js, phòng/mạng dùng shared/net/simplenet.js.
import { makeNet } from '../../shared/net/simplenet.js?v=1';
import * as E from './engine.js?v=1';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=2';
import { confirmBox, promptBox, toast as tip } from '../../shared/ui/dialog.js?v=1';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=120';

const TOPIC = Object.fromEntries(E.TOPICS.map(t => [t.id, t])); TOPIC.tuviet = { id: 'tuviet', e: '✍️', name: 'Tự viết' };
const KIND = { t: ['💬', 'THẬT'], d: ['🔥', 'THÁCH'] };
let sound = ls.get('tht-sound') !== '0';

const NET = makeNet({
  game: 'thathaythach', min: 2, max: 12, maxSeats: 16, allowLocal: true, minMsg: 'Cần ít nhất 2 người: mời bạn vào phòng hoặc thêm người chơi cùng máy.',
  defaults: E.DEFAULT_OPTS, optOk: E.optOk, create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: E.actors, bot: E.awayAction,
});

// ---------- âm thanh nhỏ ----------
let ac = null;
function beep(kind) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { turn: [[660, 0, .1], [880, .1, .14]], card: [[520, 0, .07], [780, .07, .1], [1040, .15, .16]], done: [[784, 0, .09], [988, .09, .09], [1175, .18, .2]], skip: [[330, 0, .14], [247, .12, .2]], end: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .3]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.13, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}

// ---------- phòng chờ ----------
let customLoaded = false;
const myCustom = () => { try { const a = JSON.parse(ls.get('tht-custom') || '[]'); return E.optOk('custom', a) ? a : []; } catch (e) { return []; } };
function renderLobby(info, ui) {
  const host = ui.isHost ? ui.net.raw : null, o = info.opts, dis = ui.isHost ? '' : 'disabled', n = E.countCards(o);
  if (host && !customLoaded) { customLoaded = true; const c = myCustom(), saved = (() => { try { return JSON.parse(ls.get('tht-opts') || 'null'); } catch (e) { return null; } })(); /* nhớ luật bàn + câu tự viết của lần trước */
    if (saved) for (const k of ['topics', 'level', 'order', 'rounds', 'skips']) if (k in saved && E.optOk(k, saved[k])) host.opts[k] = saved[k];
    if (c.length) host.opts.custom = c; if (saved || c.length) { host.pushLobby(); return; } }
  $('#pcount').textContent = `${info.players.length} người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && info.players.length < NET.MAX ? `<div class="row-btns"><button class="btn" id="btn-addlocal">+ Thêm người chơi cùng máy</button></div>` : '';
  $('#ccount').textContent = `${n.t} Thật · ${n.d} Thách`;
  $('#topics').innerHTML = E.TOPICS.map(t => `<button type="button" data-topic="${t.id}" aria-pressed="${o.topics.includes(t.id)}" ${dis}><i>${t.e}</i><span>${t.name}<small>${t.desc}</small></span></button>`).join('');
  const seg = (key, items) => `<div class="seg">${items.map(([v, nm]) => `<button type="button" data-opt="${key}" data-v="${v}" aria-pressed="${o[key] === v}" ${dis}>${nm}</button>`).join('')}</div>`;
  $('#opts').innerHTML = `${ui.isHost ? '<div class="row-btns"><button class="chip" id="btn-all">Chọn hết</button><button class="chip" id="btn-none">Bỏ chọn</button></div>' : ''}
    <div class="opt"><b>🌶️ Độ lầy</b><div class="lv">${Object.entries(E.LEVELS).map(([k, [e, nm, d]]) => `<button type="button" data-opt="level" data-v="${k}" aria-pressed="${o.level === +k}" ${dis}><i>${e}</i>${nm}<small>${d}</small></button>`).join('')}</div></div>
    <div class="opt"><b>🔁 Thứ tự lượt</b>${seg('order', [['turn', 'Lần lượt'], ['random', 'Ngẫu nhiên']])}</div>
    <div class="opt"><b>🏁 Số vòng</b>${seg('rounds', [[3, '3 vòng'], [5, '5 vòng'], [8, '8 vòng'], [0, 'Chơi tới khi dừng']])}</div>
    <div class="opt"><b>🙈 Lượt bỏ qua mỗi người</b>${seg('skips', [[0, 'Không cho'], [1, '1'], [2, '2'], [3, '3'], [-1, 'Thoải mái']])}</div>
    <div class="opt"><b>✍️ Câu tự viết <small style="display:inline">(${o.custom.length}/${E.MAX_CUSTOM})</small></b>
      ${ui.isHost ? '<div class="row-btns"><button class="btn sm" data-new="t">+ Câu Thật</button><button class="btn sm" data-new="d">+ Câu Thách</button></div>' : ''}
      ${o.custom.length ? `<ul class="cus">${o.custom.map((c, i) => `<li><b class="${c.k}">${KIND[c.k][1]}</b><span>${esc(c.text)}</span>${ui.isHost ? `<button data-del="${i}" aria-label="Xoá câu này">✕</button>` : ''}</li>`).join('')}</ul>` : '<small>Nhóm bạn có câu "đặc sản" riêng? Chủ phòng thêm vào đây, game sẽ trộn chung với bộ có sẵn.</small>'}</div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = info.players.length < 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
const saveOpts = h => { const { custom, ...o } = h.opts; ls.set('tht-opts', JSON.stringify(o)); ls.set('tht-custom', JSON.stringify(custom || [])); };
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw, o = h.opts;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.dataset.topic) { const id = b.dataset.topic, cur = o.topics, nx = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]; if (!nx.length) { tip('Giữ lại ít nhất một chủ đề nha.'); return; } h.setOpt('topics', nx); }
  else if (b.id === 'btn-all') h.setOpt('topics', E.TOPICS.map(t => t.id));
  else if (b.id === 'btn-none') h.setOpt('topics', [o.topics[0] || 'banbe']);
  else if (b.dataset.opt) h.setOpt(b.dataset.opt, +b.dataset.v || (b.dataset.v === '0' ? 0 : b.dataset.v));
  else if (b.dataset.new) {
    if (o.custom.length >= E.MAX_CUSTOM) { tip(`Tối đa ${E.MAX_CUSTOM} câu tự viết thôi nha.`); return; }
    const k = b.dataset.new, text = await promptBox(k === 't' ? 'Một câu hỏi mà người rút phải trả lời thật lòng.' : 'Một thử thách vui, an toàn, ai cũng làm được.', { title: k === 't' ? '💬 Thêm câu Thật' : '🔥 Thêm câu Thách', placeholder: k === 't' ? 'VD: Món tủ của bạn là gì?' : 'VD: Hát một câu bất kỳ', maxlength: E.MAX_TEXT, ok: 'Thêm', required: true });
    if (text && text.trim().length >= 3) h.setOpt('custom', [...h.opts.custom, { k, text: text.trim() }]); else if (text) tip('Câu ngắn quá, viết dài hơn chút nha.');
  }
  else if (b.dataset.del) h.setOpt('custom', o.custom.filter((_, i) => i !== +b.dataset.del));
  else if (b.id === 'btn-addlocal') { const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó cầm.', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true }); if (n) h.addLocal(n); }
  saveOpts(h);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();

// ---------- ván chơi ----------
let shown = '', endShown = null;
const curP = v => v.players.find(p => p.id === v.cur);
function render(v, prev) {
  const cp = curP(v), mine = !!cp && !v.spec && ui.controls(cp.id), passing = mine && cp.local; /* chuyền tay: lượt của người chơi cùng máy */
  const away = v.away || [];
  $('#round').innerHTML = v.phase === 'ended' ? '🏁 Hết buổi' : `🎯 Vòng ${v.round}${v.opts.rounds ? '/' + v.opts.rounds : ''} · lượt ${v.turnNo}`;
  $('#seats').innerHTML = v.players.map(p => `<div class="seat${p.id === v.cur ? ' on' : ''}${p.id === v.next && v.opts.order === 'turn' ? ' next' : ''}${away.includes(p.id) ? ' away' : ''}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}</b><small>💬${p.t} 🔥${p.d}</small></div>`).join('');
  const on = $('#seats .on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  const stage = $('#stage'), acts = $('#acts'), key = `${v.gid}|${v.turnNo}|${v.phase}|${v.card ? v.card.id : ''}|${mine}`;
  if (v.phase === 'ended') { stage.innerHTML = `<div class="who">🎉 Chơi xong rồi!<small>Xem ai dũng cảm nhất nào…</small></div>`; acts.innerHTML = ui.isHost ? '<button class="btn big pri" data-a="again">🔁 Chơi tiếp buổi nữa</button><button class="btn" data-a="lobby">Về phòng chờ</button><button class="btn" data-a="sum">🏅 Xem tổng kết</button>' : '<button class="btn" data-a="sum">🏅 Xem tổng kết</button>'; $('#hostbar').innerHTML = ''; if (endShown !== v.gid) { endShown = v.gid; beep('end'); showSummary(v); } shown = key; return; }
  endShown = null;
  const nm = esc(cleanName(cp.name)), last = v.last && v.last.k ? `<div class="lastline">Lượt trước: <b>${esc(cleanName(v.last.name))}</b> ${v.last.res === 'done' ? 'đã hoàn thành ✅' : v.last.res === 'skip' ? 'đã bỏ qua 🙈' : 'được cho qua ⏭'} một câu ${KIND[v.last.k][1].toLowerCase()}.</div>` : '';
  if (v.phase === 'choose') {
    if (key !== shown) {
      stage.innerHTML = `<div class="who">${avatar(cp.name, 64)}${mine && !passing ? 'Tới lượt bạn!' : `Tới lượt ${nm}`}<small>${mine ? (passing ? `Đưa máy cho ${nm} rồi chọn nhé` : 'Chọn đi nào, đừng run 😏') : away.includes(cp.id) ? 'Đang mất kết nối – chờ xíu…' : 'Đang chọn Thật hay Thách…'}</small></div>
        ${mine ? `<div class="pick"><button class="t" data-pick="t"><i>💬</i>THẬT<small>Trả lời thật lòng</small></button><button class="d" data-pick="d"><i>🔥</i>THÁCH<small>Dám làm không?</small></button><button class="r" data-pick="r"><i>🎲</i>Ngẫu nhiên</button></div>` : ''}${last}`;
      if (mine && prev && (prev.turnNo !== v.turnNo || prev.gid !== v.gid)) beep('turn');
    }
    acts.innerHTML = '';
  } else {
    const c = v.card, tp = TOPIC[c.tp] || TOPIC.tuviet;
    if (key !== shown) { stage.innerHTML = `<div class="qcard ${c.k}"><div class="kind">${KIND[c.k][0]} ${KIND[c.k][1]}<span>${tp.e} ${esc(tp.name)}</span></div><p>${esc(c.text)}</p><div class="for">${mine && !passing ? 'Câu của bạn đó!' : `Dành cho ${nm}`}</div></div>${mine ? '' : `<div class="waitmsg">Chờ ${nm} ${c.k === 't' ? 'trả lời' : 'thực hiện'}… cả phòng làm trọng tài nha 👀</div>`}`; beep('card'); }
    acts.innerHTML = mine ? `<button class="btn big pri" data-a="done">✅ Xong rồi!</button><button class="btn" data-a="swap" ${v.swapped ? 'disabled' : ''}>🔄 Đổi câu${v.swapped ? ' (hết)' : ''}</button><button class="btn" data-a="skip" ${cp.left === 0 ? 'disabled' : ''}>🙈 Bỏ qua${cp.left > 0 ? ` (còn ${cp.left})` : cp.left === 0 ? ' (hết)' : ''}</button>` : '';
  }
  $('#hostbar').innerHTML = ui.isHost ? `${!mine ? '<button class="chip" data-h="pass">⏭ Cho qua lượt này</button>' : ''}<button class="chip" data-h="end">🏁 Kết thúc buổi chơi</button>` : '';
  if (prev && v.last && (!prev.last || prev.last.n !== v.last.n) && v.last.k) beep(v.last.res === 'done' ? 'done' : 'skip');
  shown = key;
}
$('#stage').addEventListener('click', e => { const b = e.target.closest('[data-pick]'), v = ui.view; if (b && v && v.cur) ui.actAs(v.cur, { type: 'pick', kind: b.dataset.pick }); });
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'), v = ui.view; if (!b || !v) return; const a = b.dataset.a;
  if (a === 'again') ui.net.raw.start(); else if (a === 'lobby') ui.net.raw.restart(); else if (a === 'sum') showSummary(v);
  else if (v.cur) ui.actAs(v.cur, { type: a });
});
$('#hostbar').addEventListener('click', async e => {
  const b = e.target.closest('[data-h]'); if (!b || !ui.isHost) return;
  if (b.dataset.h === 'pass') ui.act({ type: 'pass' });
  else if (await confirmBox('Kết thúc và xem tổng kết luôn nhé?', { title: '🏁 Kết thúc buổi chơi?', ok: 'Kết thúc', cancel: 'Chơi tiếp' })) ui.act({ type: 'end' });
});
function showSummary(v) {
  const aw = v.awards || E.awards(v), tag = id => [aw.brave.includes(id) && '🦁 Dũng cảm nhất', aw.honest.includes(id) && '😇 Thật thà nhất', aw.dodge.includes(id) && '🥷 Chúa né', aw.allin.includes(id) && '💯 Không né câu nào'].filter(Boolean).join(' · ');
  const rows = v.players.slice().sort((a, b) => b.t + b.d - (a.t + a.d) || a.skip - b.skip);
  ui.openModal(`<h2>🏅 Tổng kết buổi chơi</h2><p style="text-align:center;color:var(--muted);font-weight:800">Game vui là chính – không ai thua cả 😄</p><ul class="sum">${rows.map(p => `<li>${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}<small>${tag(p.id)}</small></span><span class="n">💬${p.t} 🔥${p.d} 🙈${p.skip}</span></li>`).join('')}</ul><div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-log').onclick = () => {
  const v = ui.view, log = v ? v.log.slice().reverse() : [];
  ui.openModal(`<h2>📜 Các câu đã qua</h2>${log.length ? `<ul class="logl">${log.map(l => `<li><b class="${l.k}">${KIND[l.k][0]} ${esc(cleanName(l.name))}</b> ${l.res === 'done' ? '✅' : l.res === 'skip' ? '🙈' : '⏭'}<small>${esc(l.text)}</small></li>`).join('')}</ul>` : '<p style="text-align:center;color:var(--muted)">Chưa có câu nào.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
};
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Thật hay Thách</h2>
    <p>Tới lượt ai, người đó chọn <b>💬 Thật</b> (trả lời thật lòng một câu hỏi) hoặc <b>🔥 Thách</b> (làm một thử thách nhỏ). Làm xong bấm <b>Xong rồi</b>, cả phòng làm trọng tài.</p>
    <h3>Trong mỗi lượt</h3><ul><li><b>🔄 Đổi câu:</b> được đổi 1 lần nếu câu không hợp.</li><li><b>🙈 Bỏ qua:</b> mỗi người có vài lượt bỏ qua (chủ phòng chỉnh).</li><li><b>🎲 Ngẫu nhiên:</b> để game chọn giúp Thật hay Thách.</li></ul>
    <h3>Chủ phòng chỉnh được</h3><ul><li><b>Chủ đề</b> (14 chủ đề, trộn tuỳ thích) và <b>độ lầy</b> 🌱 → 🔥.</li><li><b>Câu tự viết</b> – thêm câu "đặc sản" của nhóm.</li><li>Số vòng, thứ tự lượt, số lượt bỏ qua.</li></ul>
    <h3>Chơi sao cho vui</h3><ul><li>Chơi online thì nên mở gọi thoại / video để thấy nhau.</li><li>Không ai bị ép: câu nào không thoải mái cứ bỏ qua hoặc đổi câu.</li><li>Chuyện kể trong phòng thì để lại trong phòng nha 🤫</li></ul>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('tht-sound', sound ? '1' : '0'); drawSound(); beep('turn'); };
$('#btn-news-home').onclick = () => openNews('thathaythach'); newsBadge($('#btn-news-home'), 'thathaythach');

const ui = gameKit({
  game: 'thathaythach', net: NET,
  onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); },
  onState: (v, prev) => { if (v) render(v, prev); else { shown = ''; endShown = null; if (!ui.net) customLoaded = false; } },
});
