// Hiệu ứng: bài bay, chém, khiên, hồi máu, phán định lật bài, sét, rung; âm thanh tổng hợp WebAudio (không file).
export const SPEEDS = { slow: { k: 1.8, name: 'Chậm' }, normal: { k: 1.25, name: 'Vừa' }, fast: { k: .8, name: 'Nhanh' } };
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let speedKey = 'normal';
try { const v = localStorage.getItem('tqs-speed'); if (SPEEDS[v]) speedKey = v; } catch (e) {}
const turbo = typeof location !== 'undefined' && /turbo/.test(location.hash); // chỉ để test tự động
export function S() { return turbo ? .12 : SPEEDS[speedKey].k; }
export function getSpeed() { return speedKey; }
export function setSpeed(k) { if (!SPEEDS[k]) return; speedKey = k; try { localStorage.setItem('tqs-speed', k); } catch (e) {} if (typeof document !== 'undefined') document.documentElement.style.setProperty('--fx', S()); }
if (typeof document !== 'undefined') document.documentElement.style.setProperty('--fx', S());

let muted = false;
try { muted = localStorage.getItem('tqs-mute') === '1'; } catch (e) {}
export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; try { localStorage.setItem('tqs-mute', muted ? '1' : '0'); } catch (e) {} return muted; }

// ================= ÂM THANH =================
let ac = null;
function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume(); return ac; }
function nz(dur, { type = 'lowpass', freq = 2000, q = 1, gain = .5, delay = 0, sweepTo = 0 } = {}) {
  const a = ctx(); if (!a) return; const t = a.currentTime + delay / 1000;
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.6);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q; if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = a.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  src.connect(f); f.connect(g); g.connect(a.destination); src.start(t);
}
function tn(freq, dur, { type = 'sine', gain = .15, slide = 0, delay = 0, attack = .005, vib = 0, vibRate = 6 } = {}) {
  const a = ctx(); if (!a) return; const t = a.currentTime + delay / 1000;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  if (vib) { const l = a.createOscillator(); l.frequency.value = vibRate; const lg = a.createGain(); lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur); }
  const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .02);
}
// tiếng chiêng/cồng: nhiều hoạ âm lệch
function gong(f, dur, gain = .2, delay = 0) { [1, 1.48, 2.1, 2.76, 3.9].forEach((m, i) => tn(f * m, dur * (1 - i * .15), { gain: gain / (1 + i * 1.3), delay, attack: .01, vib: f * m * .004, vibRate: 3 })); }
const PENTA = [0, 2, 4, 7, 9];
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
export const sfx = {
  card() { if (!muted) nz(.07, { freq: 3800, gain: .22 }); },
  slash() { if (!muted) { nz(.28, { type: 'bandpass', freq: 900, q: 1.5, gain: .55, sweepTo: 5000 }); tn(2400, .35, { type: 'triangle', gain: .05, slide: 900, delay: 120 }); } },
  hit() { if (!muted) { nz(.18, { freq: 500, gain: .7 }); tn(150, .25, { type: 'triangle', gain: .3, slide: -80 }); } },
  dodge() { if (!muted) { nz(.3, { type: 'bandpass', freq: 600, q: 2, gain: .3, sweepTo: 3600 }); tn(1800, .2, { gain: .04, slide: -900, delay: 80 }); } },
  shield() { if (!muted) { tn(880, .5, { type: 'triangle', gain: .12 }); tn(1320, .4, { gain: .05, delay: 30 }); nz(.05, { type: 'bandpass', freq: 2500, q: 4, gain: .4 }); } },
  heal() { if (!muted) [0, 2, 4, 7].forEach((d, i) => tn(hz(72 + PENTA[d % 5] + (d >= 5 ? 12 : 0)), .35, { type: 'sine', gain: .1, delay: i * 80 })); },
  turn() { if (!muted) gong(hz(64), 1.1, .07); },
  myturn() { if (!muted) { gong(hz(57), 1.6, .14); tn(hz(69), .5, { type: 'triangle', gain: .05, delay: 120 }); } },
  tick() { if (!muted) tn(1500, .05, { type: 'square', gain: .03 }); },
  death() { if (!muted) { gong(hz(41), 2.6, .3); nz(.6, { freq: 300, gain: .3 }); } },
  win() { if (!muted) [0, 1, 2, 3, 4, 7].forEach((d, i) => tn(hz(67 + PENTA[d % 5] + Math.floor(d / 5) * 12), .5, { type: 'triangle', gain: .12, delay: i * 140 })); },
  thunder() { if (!muted) { nz(.08, { type: 'highpass', freq: 3000, gain: 1 }); nz(1.6, { freq: 400, gain: 1, delay: 60 }); nz(.9, { freq: 1400, gain: .4, delay: 30, sweepTo: 200 }); } },
  judge() { if (!muted) { nz(.05, { freq: 4000, gain: .35 }); tn(hz(81), .5, { gain: .07, delay: 60 }); } },
  good() { if (!muted) { tn(hz(76), .25, { type: 'triangle', gain: .1 }); tn(hz(83), .35, { type: 'triangle', gain: .1, delay: 110 }); } },
  bad() { if (!muted) { tn(hz(62), .3, { type: 'sawtooth', gain: .05 }); tn(hz(58), .45, { type: 'sawtooth', gain: .05, delay: 140 }); } },
  nullify() { if (!muted) { [0, 90].forEach(d => { tn(1100, .08, { type: 'square', gain: .06, delay: d }); nz(.04, { type: 'bandpass', freq: 1800, q: 6, gain: .5, delay: d }); }); } },
  drum() { if (!muted) [0, 180, 300].forEach((d, i) => { tn(i === 2 ? 70 : 90, .3, { gain: .5, slide: -30, delay: d }); nz(.06, { freq: 600, gain: .3, delay: d }); }); },
  elephant() { if (!muted) { tn(380, .9, { type: 'sawtooth', gain: .08, slide: 260, vib: 18, vibRate: 7, attack: .08 }); tn(190, .9, { type: 'sawtooth', gain: .05, slide: 130, attack: .08 }); this.drum(); } },
  arrows() { if (!muted) for (let i = 0; i < 9; i++) nz(.22, { type: 'bandpass', freq: 1800 + Math.random() * 1500, q: 3, gain: .18, delay: i * 70, sweepTo: 600 }); },
  equip() { if (!muted) { nz(.05, { type: 'bandpass', freq: 3200, q: 5, gain: .5 }); tn(hz(88), .4, { type: 'triangle', gain: .05, delay: 50 }); } },
  peach() { if (!muted) { tn(hz(79), .2, { gain: .1 }); tn(hz(84), .3, { gain: .1, delay: 90 }); } },
  draw() { if (!muted) nz(.05, { type: 'highpass', freq: 3000, gain: .15 }); },
  skill() { if (!muted) { tn(hz(74), .18, { type: 'triangle', gain: .07 }); tn(hz(81), .25, { type: 'triangle', gain: .07, delay: 70 }); } },
  dying() { if (!muted) [0, 300].forEach(d => tn(hz(70), .22, { type: 'square', gain: .04, delay: d })); },
};

// ================= LỚP HIỆU ỨNG =================
function layer() { let l = document.getElementById('fx-layer'); if (!l) { l = document.createElement('div'); l.id = 'fx-layer'; document.body.appendChild(l); } return l; }
function center(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }
export function fly(html, fromEl, toEl, { delay = 0, duration = 480, scaleTo = 1, rotate = 0, onEnd, sound = true } = {}) {
  if (!fromEl || !toEl || reduced) { onEnd && onEnd(); return; }
  duration *= S(); delay *= S();
  const a = center(fromEl), b = center(toEl);
  const n = document.createElement('div'); n.className = 'flyer'; n.innerHTML = html;
  layer().appendChild(n);
  const w = n.offsetWidth || 60, h = n.offsetHeight || 84;
  n.style.transform = `translate(${a.x - w / 2}px, ${a.y - h / 2}px) scale(.8)`; n.style.opacity = '0';
  setTimeout(() => {
    n.style.transition = `transform ${duration}ms cubic-bezier(.2,.8,.25,1), opacity 160ms`;
    n.style.opacity = '1'; n.style.transform = `translate(${b.x - w / 2}px, ${b.y - h / 2}px) scale(${scaleTo}) rotate(${rotate}deg)`;
    if (sound) sfx.card();
    setTimeout(() => { n.style.transition = 'opacity 180ms'; n.style.opacity = '0'; setTimeout(() => { n.remove(); onEnd && onEnd(); }, 180); }, duration);
  }, delay);
}
export function shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 600 * S()); }
export function flash(el, cls = 'flash-red') { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 750 * S()); }
export function floatText(el, text, color = '#d23c3c') {
  if (!el) return; const c = center(el);
  const n = document.createElement('div'); n.className = 'float-text'; n.textContent = text; n.style.color = color;
  n.style.left = c.x + 'px'; n.style.top = (c.y - 10) + 'px'; layer().appendChild(n); setTimeout(() => n.remove(), 1300 * S());
}
const bannerQ = []; let bannerBusy = false;
export function banner(text, sub = '', cls = '') { bannerQ.push([text, sub, cls]); if (bannerQ.length > 3) bannerQ.splice(0, bannerQ.length - 3); if (!bannerBusy) nextBanner(); }
function nextBanner() {
  const item = bannerQ.shift(); if (!item) { bannerBusy = false; return; } bannerBusy = true;
  const n = document.createElement('div'); n.className = 'banner ' + item[2]; n.innerHTML = `<div>${item[0]}</div>${item[1] ? `<small>${item[1]}</small>` : ''}`;
  layer().appendChild(n); const show = 1150 * S();
  setTimeout(() => n.classList.add('out'), show); setTimeout(() => { n.remove(); nextBanner(); }, show + 400);
}
export function stamp(el, text, cls = '') {
  if (!el) return; const a = center(el);
  const n = document.createElement('div'); n.className = 'stamp ' + cls; n.textContent = text; n.style.left = a.x + 'px'; n.style.top = a.y + 'px';
  layer().appendChild(n); const sw = n.offsetWidth; n.style.left = Math.min(innerWidth - sw / 2 - 4, Math.max(sw / 2 + 4, a.x)) + 'px'; setTimeout(() => n.remove(), 1100 * S());
}
export function bubble(el, html, cls = '') {
  if (!el) return; const r = el.getBoundingClientRect();
  const b = document.createElement('div'); b.className = 'bubble ' + cls; b.innerHTML = html;
  b.style.left = (r.left + r.width / 2) + 'px'; b.style.top = Math.max(40, r.top - 4) + 'px';
  layer().appendChild(b);
  const bw = b.offsetWidth; const x = Math.min(innerWidth - bw / 2 - 6, Math.max(bw / 2 + 6, r.left + r.width / 2)); b.style.left = x + 'px'; setTimeout(() => b.remove(), 1700 * S());
}
// khiên Né bật lên
export function shieldFx(el, glyph = '🛡️') {
  if (!el || reduced) return; const a = center(el);
  const n = document.createElement('div'); n.className = 'shield-fx'; n.innerHTML = `<span>${glyph}</span>`;
  n.style.left = a.x + 'px'; n.style.top = a.y + 'px'; layer().appendChild(n); setTimeout(() => n.remove(), 900 * S());
}
// lật lá phán định ở giữa bàn
export function judgeFlip(html, anchor, label, onDone) {
  const host = anchor || document.body; const a = center(host);
  const n = document.createElement('div'); n.className = 'judge-fx';
  n.innerHTML = `<div class="jf-label">${label}</div><div class="jf-card"><div class="jf-inner"><div class="jf-back"><div class="qcard back"><div class="back-in"><span>殺</span></div></div></div><div class="jf-front">${html}</div></div></div>`;
  n.style.left = a.x + 'px'; n.style.top = a.y + 'px'; layer().appendChild(n);
  requestAnimationFrame(() => setTimeout(() => n.classList.add('flip'), 60));
  setTimeout(() => { n.classList.add('out'); setTimeout(() => n.remove(), 300); onDone && onDone(); }, 1500 * S());
  return n;
}

// ================= Hạt (canvas) =================
let fcv, fcx, fparts = [], fraf = 0, FW = 0, FH = 0;
function fcanvas() {
  if (!fcv) { fcv = document.createElement('canvas'); fcv.id = 'fx-canvas'; document.body.appendChild(fcv); fcx = fcv.getContext('2d'); const rs = () => { const d = Math.min(2, devicePixelRatio || 1); FW = innerWidth; FH = innerHeight; fcv.width = FW * d; fcv.height = FH * d; fcx.setTransform(d, 0, 0, d, 0, 0); }; addEventListener('resize', rs); rs(); }
  if (!fraf) fraf = requestAnimationFrame(ftick);
}
function ftick() {
  fcx.clearRect(0, 0, FW, FH);
  for (let i = fparts.length - 1; i >= 0; i--) {
    const p = fparts[i]; p.t++;
    if (p.t > p.life) { fparts.splice(i, 1); continue; }
    const k = p.t / p.life;
    if (p.type === 'slash') { // vệt chém cong
      const h = Math.min(1, p.t / (p.life * .45));
      fcx.save(); fcx.translate(p.x, p.y); fcx.rotate(p.ang);
      const grad = fcx.createLinearGradient(-p.r, 0, p.r, 0); grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(.6, `rgba(255,245,220,${1 - k})`); grad.addColorStop(1, `rgba(255,90,60,${1 - k})`);
      fcx.strokeStyle = grad; fcx.lineCap = 'round';
      fcx.lineWidth = 9 * (1 - k) + 1; fcx.beginPath(); fcx.arc(0, p.r * .9, p.r, Math.PI * 1.15, Math.PI * (1.15 + .7 * h)); fcx.stroke();
      fcx.lineWidth = 2.5; fcx.strokeStyle = `rgba(255,255,255,${1 - k})`; fcx.beginPath(); fcx.arc(0, p.r * .9, p.r, Math.PI * 1.15, Math.PI * (1.15 + .7 * h)); fcx.stroke();
      fcx.restore(); continue;
    }
    if (p.type === 'bolt') {
      fcx.strokeStyle = `rgba(255,250,200,${1 - k})`; fcx.lineWidth = 4 * (1 - k) + 1; fcx.shadowColor = '#ffe680'; fcx.shadowBlur = 18;
      fcx.beginPath(); p.pts.forEach((q, j) => j ? fcx.lineTo(q[0], q[1]) : fcx.moveTo(q[0], q[1])); fcx.stroke(); fcx.shadowBlur = 0; continue;
    }
    if (p.type === 'arrow') {
      const h = Math.min(1, p.t / p.speed); const x = p.x + (p.tx - p.x) * h, y = p.y + (p.ty - p.y) * h - Math.sin(h * Math.PI) * p.arc;
      const ang = Math.atan2((p.ty - p.y) - Math.cos(h * Math.PI) * p.arc * Math.PI, p.tx - p.x);
      fcx.save(); fcx.translate(x, y); fcx.rotate(ang); fcx.strokeStyle = '#6b4a2a'; fcx.lineWidth = 2; fcx.beginPath(); fcx.moveTo(-20, 0); fcx.lineTo(6, 0); fcx.stroke();
      fcx.fillStyle = '#555'; fcx.beginPath(); fcx.moveTo(10, 0); fcx.lineTo(2, -4); fcx.lineTo(2, 4); fcx.fill(); fcx.restore();
      if (h >= 1) p.t = p.life; continue;
    }
    p.x += p.vx; p.y += p.vy; p.vy += p.g || 0; p.vx *= p.drag || 1; p.vy *= p.drag || 1;
    const a = p.fade === false ? 1 : 1 - k;
    if (p.type === 'spark') { fcx.fillStyle = `rgba(${p.c},${a})`; fcx.beginPath(); fcx.arc(p.x, p.y, p.r * (1 - k * .5), 0, 6.28); fcx.fill(); }
    else if (p.type === 'petal') { p.rot += p.vr; fcx.save(); fcx.translate(p.x, p.y); fcx.rotate(p.rot); fcx.globalAlpha = a; fcx.fillStyle = p.c; fcx.beginPath(); fcx.ellipse(0, 0, p.r, p.r * .55, 0, 0, 6.28); fcx.fill(); fcx.restore(); }
    else if (p.type === 'plus') { fcx.fillStyle = `rgba(${p.c},${a})`; fcx.font = `bold ${p.r}px sans-serif`; fcx.fillText('+', p.x, p.y); }
    else if (p.type === 'confetti') { p.rot += p.vr; fcx.save(); fcx.translate(p.x, p.y); fcx.rotate(p.rot); fcx.globalAlpha = Math.min(1, (1 - k) * 3); fcx.fillStyle = p.c; fcx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); fcx.restore(); }
  }
  fraf = fparts.length ? requestAnimationFrame(ftick) : 0;
  if (!fraf) fcx.clearRect(0, 0, FW, FH);
}
const Rn = (a, b) => a + Math.random() * (b - a);
function pt(el) { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
function burst(x, y, n, opt) { for (let i = 0; i < n; i++) { const a = Rn(0, 6.28), s = Rn(opt.smin || 1, opt.smax || 4); fparts.push({ type: opt.type || 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: opt.g || 0, drag: opt.drag || .95, r: Rn(opt.rmin || 1.5, opt.rmax || 3), c: opt.c || '255,200,80', life: Rn(opt.lmin || 20, opt.lmax || 40), t: 0, rot: 0, vr: Rn(-.1, .1) }); } }
// chém: vệt kiếm cong + tia lửa
export function slashFx(el, delay = 0) {
  const b = pt(el); if (!b || reduced) return;
  setTimeout(() => { fcanvas(); fparts.push({ type: 'slash', x: b.x, y: b.y, r: 44, ang: Rn(-.5, .3), life: 26, t: 0 }); setTimeout(() => burst(b.x, b.y, 14, { c: '255,210,120', smin: 1.5, smax: 5 }), 110); }, delay * S());
}
export function arrowsFx(fromEl, toEl, delay = 0) {
  const a = pt(fromEl), b = pt(toEl); if (!a || !b || reduced) return;
  setTimeout(() => { fcanvas(); for (let i = 0; i < 3; i++) fparts.push({ type: 'arrow', x: a.x + Rn(-20, 20), y: a.y, tx: b.x + Rn(-12, 12), ty: b.y + Rn(-8, 8), arc: 60, speed: 30 * S() + i * 3, life: 40 * S(), t: 0 }); }, delay * S());
}
export function boltFx(el) {
  const b = pt(el); if (!b) return; if (reduced) return;
  fcanvas(); const pts = []; let x = b.x + Rn(-40, 40), y = 0; pts.push([x, y]);
  while (y < b.y) { y += Rn(20, 45); x += Rn(-28, 28); pts.push([x, Math.min(y, b.y)]); }
  pts.push([b.x, b.y]);
  fparts.push({ type: 'bolt', pts, life: 24, t: 0 });
  burst(b.x, b.y, 30, { c: '255,240,150', smin: 2, smax: 7, lmin: 20, lmax: 45 });
  const w = document.createElement('div'); w.className = 'white-flash'; document.body.appendChild(w); setTimeout(() => w.remove(), 500);
  screenShake();
}
export function healFx(el) {
  const a = pt(el); if (!a || reduced) return; fcanvas();
  for (let i = 0; i < 14; i++) fparts.push({ type: i % 2 ? 'plus' : 'petal', x: a.x + Rn(-30, 30), y: a.y + Rn(-10, 20), vx: Rn(-.4, .4), vy: Rn(-1.6, -.5), r: i % 2 ? Rn(12, 18) : Rn(4, 7), c: i % 2 ? '60,170,110' : '#f7a8c0', life: Rn(40, 70), t: 0, rot: 0, vr: Rn(-.1, .1) });
}
export function sparks(el, c = '255,200,80') { const a = pt(el); if (!a || reduced) return; fcanvas(); burst(a.x, a.y, 16, { c, smin: 1.5, smax: 5 }); }
export function confetti() {
  if (reduced) return; fcanvas(); const cols = ['#e0a83a', '#d6452f', '#3a6fd8', '#2f9e5b', '#f7a8c0', '#fff4d6'];
  for (let i = 0; i < 150; i++) fparts.push({ type: i % 3 ? 'confetti' : 'petal', x: Rn(0, FW), y: Rn(-FH * .5, -10), vx: Rn(-1, 1), vy: Rn(1.5, 3.5), g: .02, drag: .995, r: Rn(3, 7), rot: Rn(0, 6), vr: Rn(-.12, .12), c: cols[i % cols.length], life: Rn(160, 260), t: 0, fade: false });
}
export function screenShake() { if (reduced) return; const s = document.querySelector('#screen-game'); if (!s) return; s.classList.remove('screen-shake'); void s.offsetWidth; s.classList.add('screen-shake'); setTimeout(() => s.classList.remove('screen-shake'), 600); }
