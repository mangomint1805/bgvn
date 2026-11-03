// 🎞️ Xem lại cuối ván: dòng thời gian Chia vai → Đêm 1 → Ngày 1 → … (lộ hết vai, phiếu từng người).
// Chủ phòng có thể "chiếu" cho cả hội: lướt tới trang nào thì máy mọi người theo trang đó.
import { ROLES, TEAM_NAME } from './engine.js?v=3';
import * as fx from './fx.js?v=3';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clean = n => String(n).replace(' 🤖', '').trim();
const CAUSE = { wolf: 'bị Sói cắn chết 🩸', poison: 'chết vì thuốc độc ☠️', love: 'chết theo người yêu 💔', shot: 'trúng tên Thợ Săn 🏹', hang: 'bị treo cổ 🪢' };
const RES = { wolf: '<b class="r-wolf">LÀ SÓI 🐺</b>', village: '<b class="r-ok">không phải Sói 🙂</b>' };
const TEAM_RES = { wolf: '<b class="r-wolf">phe Sói 🐺</b>', village: '<b class="r-ok">phe Dân 🧑‍🌾</b>', solo: '<b>phe riêng 🥀</b>' };

let C = null, segs = [], cur = 0, follow = true, share = true, lastN = 0, isOpen = false;

// dựng các trang từ biên niên
export function buildSegments(v) {
  const rec = v.rec || [];
  const role = {};
  const nameOf = id => { const p = v.players.find(x => x.id === id); return p ? clean(p.name) : '?'; };
  const pill = id => { const r = ROLES[role[id]] || ROLES.villager; return `<span class="rp" style="--c:${r.color}"><i>${r.emoji}</i>${esc(nameOf(id))}</span>`; };
  const chip = r => ROLES[r] ? `<span class="rc" style="--c:${ROLES[r].color}">${ROLES[r].emoji} ${ROLES[r].name}</span>` : '';
  const out = [];
  const deal = rec.find(r => r.k === 'deal');
  if (deal) Object.assign(role, deal.roles);
  // trang "Chia vai": nhóm theo phe, ai đổi vai (Kẻ Trộm) thì ghi mũi tên
  {
    const finalRole = Object.fromEntries(v.players.map(p => [p.id, p.role]));
    const groups = { wolf: [], village: [], tanner: [] };
    for (const p of v.players) { const r0 = role[p.id] || p.role, r1 = finalRole[p.id] || r0; const team = ROLES[r1].team; (groups[team] || groups.village).push(`<li>${pill(p.id)}${r1 !== r0 ? ` → ${chip(r1)}` : ''}${p.alive ? '' : ' <small>💀</small>'}</li>`); }
    let html = '';
    for (const [t, label] of [['wolf', '🐺 Phe Sói'], ['village', '🧑‍🌾 Phe Dân Làng'], ['tanner', '🥀 Phe riêng']]) if (groups[t].length) html += `<h4>${label}</h4><ul class="rp-roles">${groups[t].join('')}</ul>`;
    if (deal && deal.extra) html += `<p class="rp-note">🃏 2 lá thừa lúc chia: ${deal.extra.map(chip).join(' ')}</p>`;
    out.push({ title: '🃏 Chia vai', short: '🃏 Vai', items: [], html });
  }
  let seg = null;
  for (const r of rec) {
    if (r.k === 'deal') continue;
    const key = r.ph + r.d;
    if (!seg || seg.key !== key) { seg = { key, title: r.ph === 'n' ? `🌙 Đêm ${r.d}` : `☀️ Ngày ${r.d}`, short: r.ph === 'n' ? `Đêm ${r.d}` : `Ngày ${r.d}`, night: r.ph === 'n', items: [] }; out.push(seg); }
    const I = (ic, html, cls = '') => seg.items.push(`<li class="${cls}"><span class="ri">${ic}</span><span class="rt">${html}</span></li>`);
    switch (r.k) {
      case 'thief': I('🃏', `${pill(r.by)} lén xem 2 lá thừa ${r.from.map(chip).join(' ')} → ${r.took ? `tráo lấy ${chip(r.took)}` : 'giữ nguyên lá Kẻ Trộm'}`); if (r.took) role[r.by] = r.took; break;
      case 'cupid': I('💘', `${pill(r.by)} ghép đôi ${pill(r.a)} ❤ ${pill(r.b)}`); break;
      case 'guard': I('🛡️', `${pill(r.by)} bảo vệ ${pill(r.t)}`); break;
      case 'seer': if (r.lun) I('👓', `${pill(r.by)} (tưởng mình là Tiên Tri) “soi” ${pill(r.t)} → ra ${RES[r.res]} <small>– bốc đại! Thật ra ${r.truth === 'wolf' ? 'là Sói' : 'không phải Sói'}</small>`);
        else I('🔮', `${pill(r.by)} soi ${pill(r.t)} → ${RES[r.res]}`); break;
      case 'medium': I('🕯️', `${pill(r.by)} gọi hồn ${pill(r.t)} → ${TEAM_RES[r.res]}`); break;
      case 'bite': {
        const vs = Object.entries(r.votes || {});
        const detail = vs.length > 1 ? ` <small>(${vs.map(([w, t]) => `${esc(nameOf(w))}→${t ? esc(nameOf(t)) : '🙅'}`).join(', ')})</small>` : '';
        I(r.extra ? '🐾' : '🐺', `Bầy Sói${r.extra ? ' <b>cắn thêm</b>' : ''} ${r.t ? `chọn cắn ${pill(r.t)}` : 'không cắn ai'}${detail}`, 'bad'); break;
      }
      case 'witch': I('🧪', `${pill(r.by)} ${[r.save ? `dùng bình cứu cho ${pill(r.save)}` : '', r.poison ? `☠️ đầu độc ${pill(r.poison)}` : ''].filter(Boolean).join(' và ')}`); break;
      case 'skip': I('😴', `${pill(r.by)} bỏ lượt`, 'dim'); break;
      case 'idle': I('💤', `${pill(r.by)} ngủ quên (hết giờ, không làm gì)`, 'dim'); break;
      case 'saved': I('✨', `${pill(r.id)} bị cắn nhưng được ${r.by.map(b => b === 'guard' ? 'Bảo Vệ che' : 'Phù Thủy cứu').join(' + ')} → sống!`, 'good'); break;
      case 'spill': I('🥛', `${pill(r.id)} được Bảo Vệ + Phù Thủy cứu cùng lúc – luật “sữa đổ” → vẫn chết!`, 'bad'); break;
      case 'elder': I('👴', `${pill(r.id)} bị cắn nhưng da dày, sống sót (mất mạng phụ)`, 'good'); break;
      case 'die': I('💀', `${pill(r.id)} ${CAUSE[r.cause] || 'đã chết'}`, 'death'); break;
      case 'claim': I('📢', `${pill(r.by)} khai là Tiên Tri: ${pill(r.t)} ${r.res === 'wolf' ? '<b class="r-wolf">là Sói</b>' : '<b class="r-ok">là người tốt</b>'}`); break;
      case 'vote': {
        const by = {}; let skip = [];
        for (const [voter, t] of Object.entries(r.votes || {})) { if (t === 'skip') skip.push(voter); else (by[t] = by[t] || []).push(voter); }
        const rows = Object.entries(by).sort((a, b) => b[1].length - a[1].length).map(([t, vs]) => `<div class="vrow ${t === r.hanged ? 'hang' : ''}"><span class="vt">${pill(t)}<b class="vn">${vs.length}</b></span><span class="vby">← ${vs.map(pill).join(' ')}</span></div>`);
        if (skip.length) rows.push(`<div class="vrow"><span class="vt"><span class="rp" style="--c:#6b7280"><i>🙅</i>Bỏ qua</span><b class="vn">${skip.length}</b></span><span class="vby">← ${skip.map(pill).join(' ')}</span></div>`);
        const res = r.hanged ? `→ ${pill(r.hanged)} bị bầu treo cổ` : r.tie && r.round === 1 && !r.hanged && rec.some(x => x.k === 'vote' && x.d === r.d && x.round === 2) ? `→ Hoà phiếu giữa ${r.tie.map(pill).join(', ')} – bầu lại` : r.tie ? `→ Hoà phiếu – không ai bị treo` : '→ Không ai bị treo';
        seg.items.push(`<li class="vote"><span class="ri">⚖️</span><span class="rt"><b>Bỏ phiếu${r.round > 1 ? ' lại (vòng 2)' : ''}</b>${rows.length ? `<div class="vgrid">${rows.join('')}</div>` : ' <small>(không ai bầu)</small>'}<div class="vres">${res}</div></span></li>`);
        break;
      }
      case 'idiot': I('🤪', `${pill(r.id)} bị treo… nhưng là <b>Kẻ Ngốc</b> – được tha, mất quyền bầu`); break;
      case 'shot': I('🏹', `${pill(r.by)} (Thợ Săn) ${r.t ? `bắn kéo theo ${pill(r.t)}` : 'hạ nỏ, không bắn ai'}`); break;
      case 'win': I('🏁', `<b>${r.team === 'draw' ? 'HOÀ!' : esc(TEAM_NAME[r.team]) + ' THẮNG!'}</b> ${esc(r.reason)}`, 'win'); break;
    }
  }
  for (const s of out) if (s.night && !s.items.length) s.items.push('<li class="dim"><span class="ri">🌙</span><span class="rt">Đêm yên ắng, không ai làm gì.</span></li>');
  return out;
}

const $ = s => document.querySelector(s);
function canShare() { return C && C.isHost && C.net && !C.net.offline; }
function bodyHTML() {
  const sg = segs[cur];
  return `<h3>${sg.title}</h3>${sg.html || ''}${sg.items.length ? `<ol class="rp-list">${sg.items.join('')}</ol>` : ''}`;
}
function paint(scrollNav = true) {
  if (!isOpen || C.modalKey() !== 'replay') return;
  $('#rp-body').innerHTML = bodyHTML(); $('#rp-body').scrollTop = 0;
  document.querySelectorAll('#rp-nav [data-rp]').forEach(b => b.classList.toggle('on', +b.dataset.rp === cur));
  $('#rp-cnt').textContent = `${cur + 1}/${segs.length}`;
  $('#rp-prev').disabled = cur <= 0; $('#rp-next').disabled = cur >= segs.length - 1;
  const on = document.querySelector('#rp-nav .on'); if (on && scrollNav) try { on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); } catch (e) {}
  const st = $('#rp-follow');
  if (st) st.innerHTML = !C.isHost && C.view.replayAt ? (follow ? '📡 Đang xem theo chủ phòng · <button class="chip sm" id="rp-own">Tự lướt</button>' : `<button class="chip sm" id="rp-join">📡 Xem theo chủ phòng</button>`) : '';
  const own = $('#rp-own'); if (own) own.onclick = () => { follow = false; paint(false); };
  const jn = $('#rp-join'); if (jn) jn.onclick = () => { follow = true; go(C.view.replayAt.i, true); };
}
function go(i, fromHost = false) {
  cur = Math.max(0, Math.min(segs.length - 1, i | 0));
  if (!fromHost && !C.isHost && C.view.replayAt) follow = false;
  if (!fromHost && canShare() && share) C.net.setReplay(cur);
  paint(); fx.sfx.click();
}
export function openReplay(ctx, i = 0, fromHost = false) {
  C = ctx; const v = ctx.view; if (!v || !v.rec) return;
  segs = buildSegments(v);
  if (!ctx.isHost && !fromHost) { follow = true; if (v.replayAt) i = v.replayAt.i; }
  cur = Math.max(0, Math.min(segs.length - 1, i));
  ctx.openModal(`<div class="rp-head"><h2>🎞️ Xem lại cả ván</h2><button class="chip ico" id="rp-close" aria-label="Đóng">✕</button></div>
    <div class="rp-nav" id="rp-nav">${segs.map((s, k) => `<button class="chip sm" data-rp="${k}">${s.short}</button>`).join('')}</div>
    ${canShare() ? `<label class="rp-share"><input type="checkbox" id="rp-share" ${share ? 'checked' : ''}> 📡 Chiếu cho cả hội cùng xem (máy mọi người lướt theo bạn)</label>` : '<div class="rp-follow" id="rp-follow"></div>'}
    <div class="rp-body" id="rp-body"></div>
    <div class="rp-foot"><button class="btn" id="rp-prev">◀ Trước</button><b id="rp-cnt"></b><button class="btn pri" id="rp-next">Sau ▶</button></div>`, 'wide replay', 'replay');
  isOpen = true;
  document.querySelectorAll('#rp-nav [data-rp]').forEach(b => b.onclick = () => go(+b.dataset.rp));
  $('#rp-prev').onclick = () => go(cur - 1); $('#rp-next').onclick = () => go(cur + 1);
  $('#rp-close').onclick = () => { isOpen = false; follow = false; ctx.closeModal(); };
  const sh = $('#rp-share'); if (sh) sh.onchange = () => { share = sh.checked; if (share) C.net.setReplay(cur); };
  // lướt ngang trên điện thoại
  const body = $('#rp-body'); let sx = 0, sy = 0;
  body.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  body.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(cur + (dx < 0 ? 1 : -1)); }, { passive: true });
  document.addEventListener('keydown', keyNav);
  paint();
  if (canShare() && share && !fromHost) C.net.setReplay(cur);
}
function keyNav(e) {
  if (!isOpen || !C || C.modalKey() !== 'replay') { document.removeEventListener('keydown', keyNav); return; }
  if (e.key === 'ArrowRight') go(cur + 1); else if (e.key === 'ArrowLeft') go(cur - 1);
}
// mỗi lần nhận state: người vào phòng đi theo trang chủ phòng đang chiếu
export function replayFollowUpdate(ctx) {
  C = ctx; const v = ctx.view;
  if (isOpen && ctx.modalKey() !== 'replay') { isOpen = false; follow = false; } // tự đóng → thôi kéo theo
  if (!v || v.phase !== 'ended') { lastN = 0; isOpen = false; return; }
  if (ctx.isHost || !v.replayAt || v.replayAt.n === lastN) return;
  lastN = v.replayAt.n;
  if (!follow) { if (isOpen) paint(false); return; }
  if (isOpen) { cur = Math.max(0, Math.min(segs.length - 1, v.replayAt.i)); paint(); }
  else if (!ctx.modalKey() || ctx.modalKey() === 'end') openReplay(ctx, v.replayAt.i, true);
}
