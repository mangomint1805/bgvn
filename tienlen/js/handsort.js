// Tự xếp bài: kéo lá (hoặc cả nhóm lá đang chọn) sang trái/phải trong tay bài.
// Thuần giao diện – không đụng engine/mạng. Pointer events (chuột + cảm ứng), có ngưỡng nhỏ để chạm vẫn là chọn lá.
const THRESH = 8; // px – dưới mức này coi là chạm/bấm

export function initHandDrag(hEl, opt) {
  // opt: { selected():Set, onDrop(newOrderIds), enabled():bool, onStart?() }
  let st = null; // { pid, x0, y0, id, ids, dragging, ... }
  let blockClick = false;

  const cardsNow = () => [...hEl.querySelectorAll('.pc[data-c]')];

  hEl.addEventListener('pointerdown', e => {
    if (st || (e.pointerType === 'mouse' && e.button !== 0) || !opt.enabled()) return;
    const el = e.target.closest('.pc[data-c]'); if (!el) return;
    st = { pid: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, id: +el.dataset.c, dragging: false };
  });
  hEl.addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.pid) return;
    st.x = e.clientX; st.y = e.clientY;
    if (!st.dragging) {
      if (Math.hypot(st.x - st.x0, st.y - st.y0) < THRESH) return;
      begin();
      if (!st) return;
    }
    e.preventDefault();
    update();
  });
  const up = e => {
    if (!st || e.pointerId !== st.pid) return;
    const was = st.dragging;
    finish(e.type === 'pointerup' && was);
    if (was) { blockClick = true; setTimeout(() => { blockClick = false; }, 0); }
  };
  hEl.addEventListener('pointerup', up);
  hEl.addEventListener('pointercancel', up);
  // (chạm: lá tự giữ capture ngầm, chuyển sang hEl sẽ làm lá mất capture → chỉ tính khi chính hEl mất)
  hEl.addEventListener('lostpointercapture', e => { if (e.target === hEl && st && st.dragging && e.pointerId === st.pid) finish(false); });
  // chặn click sinh ra sau khi thả (để không bị chọn/bỏ chọn lá)
  hEl.addEventListener('click', e => { if (blockClick) { e.stopImmediatePropagation(); e.preventDefault(); blockClick = false; } }, true);

  function begin() {
    const els = cardsNow();
    const order = els.map(x => +x.dataset.c);
    if (!order.includes(st.id) || order.length < 2) { st = null; return; }
    const sel = opt.selected();
    // nắm lá đang chọn → kéo cả nhóm đã chọn (giữ thứ tự hiện tại)
    const ids = sel.has(st.id) && sel.size > 1 ? order.filter(c => sel.has(c)) : [st.id];
    if (ids.length >= order.length) { st = null; return; }
    try { hEl.setPointerCapture(st.pid); } catch (err) {}
    const hr = hEl.getBoundingClientRect();
    const sl0 = hEl.scrollLeft;
    // vị trí theo toạ độ nội dung (không đổi khi cuộn)
    const info = els.map(x => { const r = x.getBoundingClientRect(); return { c: +x.dataset.c, el: x, l: r.left - hr.left + sl0, w: r.width }; });
    const rest = info.filter(o => !ids.includes(o.c));
    const cw = info[0].w;
    const gEl = els.find(x => +x.dataset.c === st.id);
    const gr = gEl.getBoundingClientRect();
    Object.assign(st, { dragging: true, order, ids, info, rest, cw, gap: Math.max(20, cw * 0.5), ins: -1, offX: st.x0 - gr.left, offY: st.y0 - gr.top, gw: gr.width, gh: gr.height });
    hEl.classList.add('dragging');
    for (const o of info) if (ids.includes(o.c)) o.el.classList.add('dragsrc');
    // bóng lá đi theo tay
    const ghost = document.createElement('div');
    ghost.className = 'hand-ghost';
    ghost.innerHTML = ids.map(c => info.find(o => o.c === c).el.outerHTML).join('');
    ghost.querySelectorAll('.pc').forEach(p => { p.classList.remove('dragsrc', 'dim', 'hl'); p.style.removeProperty('translate'); });
    ghost.style.setProperty('--cw', gr.width + 'px'); ghost.style.setProperty('--ch', gr.height + 'px');
    document.body.appendChild(ghost);
    const mk = document.createElement('div'); mk.className = 'hand-mark'; mk.innerHTML = '<i></i>';
    document.body.appendChild(mk);
    st.ghost = ghost; st.mark = mk;
    if (opt.onStart) opt.onStart();
    st.raf = requestAnimationFrame(autoScroll);
  }

  function update() {
    const hr = hEl.getBoundingClientRect();
    // vị trí "tâm" của nhóm đang kéo = điểm nắm quy về giữa lá
    const cx = st.x - st.offX + st.gw / 2 - hr.left + hEl.scrollLeft;
    let ins = 0; for (const o of st.rest) if (o.l + o.w / 2 < cx) ins++;
    // bóng lá nhấc cao hơn tay bài để không che vạch chèn
    st.ghost.style.transform = `translate(${st.x - st.offX}px,${st.y - st.offY - st.gh * 0.42}px) rotate(${Math.max(-6, Math.min(6, (st.x - st.x0) / 30))}deg)`;
    const n = st.rest.length, g = st.gap / 2;
    // dạt sang hai bên tạo khe ở chỗ chèn; lá đầu/cuối đứng yên để không bị khuất mép
    const sh = i => { if (i < ins) return ins > 1 ? -g * i / (ins - 1) : 0; const na = n - ins, k = i - ins; return na > 1 ? g * (na - 1 - k) / (na - 1) : 0; };
    if (ins !== st.ins) { st.ins = ins; st.rest.forEach((o, i) => o.el.style.setProperty('translate', `${sh(i)}px 0`)); }
    // vạch chèn: ngay trước lá đứng sau chỗ chèn (hoặc sau lá cuối)
    let x = ins < n ? st.rest[ins].l + sh(ins) - 5 : st.rest[n - 1].l + st.rest[n - 1].w + sh(n - 1) + 5;
    x = x - hEl.scrollLeft + hr.left;
    x = Math.max(hr.left + 3, Math.min(hr.right - 3, x));
    st.mark.style.left = x + 'px';
    st.mark.style.top = (hr.bottom - st.gh - 8) + 'px';
    st.mark.style.height = (st.gh + 12) + 'px';
  }

  function autoScroll() {
    if (!st || !st.dragging) return;
    if (hEl.scrollWidth > hEl.clientWidth + 2) {
      const hr = hEl.getBoundingClientRect(); const edge = 44;
      let v = 0;
      if (st.x < hr.left + edge) v = -Math.ceil((hr.left + edge - st.x) / 4);
      else if (st.x > hr.right - edge) v = Math.ceil((st.x - hr.right + edge) / 4);
      if (v) { hEl.scrollLeft += Math.max(-14, Math.min(14, v)); update(); }
    }
    st.raf = requestAnimationFrame(autoScroll);
  }

  function finish(commit) {
    const s = st; st = null;
    if (!s || !s.dragging) return;
    cancelAnimationFrame(s.raf);
    s.ghost.remove(); s.mark.remove();
    hEl.classList.remove('dragging');
    for (const o of s.info) { o.el.classList.remove('dragsrc'); o.el.style.removeProperty('translate'); }
    try { hEl.releasePointerCapture(s.pid); } catch (err) {}
    let next = null;
    if (commit && s.ins >= 0) {
      const rest = s.rest.map(o => o.c);
      next = [...rest.slice(0, s.ins), ...s.ids, ...rest.slice(s.ins)];
      if (next.join() === s.order.join()) next = null;
    }
    opt.onDrop(next);
  }

  return {
    get active() { return !!(st && st.dragging); },
    cancel() { if (st) finish(false); },
  };
}
