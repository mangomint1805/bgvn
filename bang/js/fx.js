// Hiệu ứng: bài bay, rung, số sát thương, âm thanh tổng hợp (không cần file âm thanh)
// Tốc độ hiệu ứng: hệ số nhân thời gian (lớn hơn = chậm hơn)
export const SPEEDS = { slow: { k: 2.2, name: 'Chậm' }, normal: { k: 1.6, name: 'Vừa' }, fast: { k: 1, name: 'Nhanh' } };
let speedKey = 'normal';
try { const v = localStorage.getItem('bangvn-speed'); if (SPEEDS[v]) speedKey = v; } catch (e) {}
export function S() { return SPEEDS[speedKey].k; }
export function getSpeed() { return speedKey; }
export function setSpeed(k) { if (!SPEEDS[k]) return; speedKey = k; try { localStorage.setItem('bangvn-speed', k); } catch (e) {} document.documentElement.style.setProperty('--fx', S()); }
document.documentElement.style.setProperty('--fx', S());

let muted = false;
try { muted = localStorage.getItem('bangvn-mute') === '1'; } catch (e) {}
export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; try { localStorage.setItem('bangvn-mute', muted ? '1' : '0'); } catch (e) {} return muted; }

let ac = null;
function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume(); return ac; }
function noise(dur, filterFreq, gain, decay = dur) {
  const a = ctx(); if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
  const g = a.createGain(); g.gain.setValueAtTime(gain, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + decay);
  src.connect(f); f.connect(g); g.connect(a.destination); src.start();
}
function tone(freq, dur, type = 'sine', gain = 0.15, slide = 0) {
  const a = ctx(); if (!a) return;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, a.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), a.currentTime + dur);
  const g = a.createGain(); g.gain.setValueAtTime(gain, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + dur);
}
export const sfx = {
  card() { if (!muted) noise(0.08, 3500, 0.25, 0.07); },
  shot() { if (!muted) { noise(0.35, 1800, 0.9, 0.3); tone(120, 0.2, 'triangle', 0.3, -80); } },
  hit() { if (!muted) { tone(220, 0.25, 'sawtooth', 0.12, -150); } },
  dodge() { if (!muted) { noise(0.25, 6000, 0.15, 0.25); tone(900, 0.2, 'sine', 0.05, 600); } },
  heal() { if (!muted) { tone(523, 0.12, 'sine', 0.12); setTimeout(() => tone(784, 0.18, 'sine', 0.12), 90); } },
  turn() { if (!muted) { tone(660, 0.1, 'triangle', 0.08); } },
  death() { if (!muted) { tone(300, 0.6, 'sawtooth', 0.12, -250); } },
  win() { if (!muted) [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.12), i * 130)); },
  boom() { if (!muted) { noise(0.9, 900, 1, 0.9); } },
};

// Lớp bay
function layer() { let l = document.getElementById('fx-layer'); if (!l) { l = document.createElement('div'); l.id = 'fx-layer'; document.body.appendChild(l); } return l; }
function center(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }

// Bay một phần tử (HTML) từ A đến B
export function fly(html, fromEl, toEl, { delay = 0, duration = 520, scaleTo = 1, rotate = 0, onEnd } = {}) {
  if (!fromEl || !toEl) return;
  duration *= S(); delay *= S();
  const a = center(fromEl), b = center(toEl);
  const n = document.createElement('div'); n.className = 'flyer'; n.innerHTML = html;
  layer().appendChild(n);
  const w = n.offsetWidth || 70, h = n.offsetHeight || 98;
  n.style.transform = `translate(${a.x - w / 2}px, ${a.y - h / 2}px) scale(.85)`;
  n.style.opacity = '0';
  setTimeout(() => {
    n.style.transition = `transform ${duration}ms cubic-bezier(.2,.8,.25,1), opacity 160ms`;
    n.style.opacity = '1';
    n.style.transform = `translate(${b.x - w / 2}px, ${b.y - h / 2}px) scale(${scaleTo}) rotate(${rotate}deg)`;
    sfx.card();
    setTimeout(() => { n.style.transition = 'opacity 180ms'; n.style.opacity = '0'; setTimeout(() => { n.remove(); onEnd && onEnd(); }, 180); }, duration);
  }, delay);
}

export function shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 600 * S()); }
export function flash(el, cls = 'flash-red') { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 700 * S()); }
export function floatText(el, text, color = '#c0392b') {
  if (!el) return; const c = center(el);
  const n = document.createElement('div'); n.className = 'float-text'; n.textContent = text; n.style.color = color;
  n.style.left = c.x + 'px'; n.style.top = (c.y - 10) + 'px';
  layer().appendChild(n); setTimeout(() => n.remove(), 1200 * S());
}
// Biểu ngữ xếp hàng lần lượt, không chồng lên nhau
const bannerQ = []; let bannerBusy = false;
export function banner(text, sub = '') { bannerQ.push([text, sub]); if (bannerQ.length > 3) bannerQ.splice(0, bannerQ.length - 3); if (!bannerBusy) nextBanner(); }
function nextBanner() {
  const item = bannerQ.shift(); if (!item) { bannerBusy = false; return; } bannerBusy = true;
  const n = document.createElement('div'); n.className = 'banner'; n.innerHTML = `<div>${item[0]}</div>${item[1] ? `<small>${item[1]}</small>` : ''}`;
  layer().appendChild(n);
  const show = 1300 * S();
  setTimeout(() => n.classList.add('out'), show); setTimeout(() => { n.remove(); nextBanner(); }, show + 450);
}

// ================= Hạt hiệu ứng trên canvas =================
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
    if (p.type === 'tracer') {
      const head = Math.min(1, p.t / p.speed), tail = Math.max(0, (p.t - 5) / p.speed);
      const hx = p.x + (p.tx - p.x) * head, hy = p.y + (p.ty - p.y) * head, tx = p.x + (p.tx - p.x) * tail, ty = p.y + (p.ty - p.y) * tail;
      const g = fcx.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, 'rgba(255,200,80,0)'); g.addColorStop(1, 'rgba(255,240,180,1)');
      fcx.strokeStyle = g; fcx.lineWidth = 3; fcx.lineCap = 'round'; fcx.beginPath(); fcx.moveTo(tx, ty); fcx.lineTo(hx, hy); fcx.stroke();
      if (head >= 1 && !p.hit) { p.hit = true; p.onHit && p.onHit(); }
      continue;
    }
    if (p.type === 'arrow') {
      const h = Math.min(1, p.t / p.speed); const x = p.x + (p.tx - p.x) * h, y = p.y + (p.ty - p.y) * h - Math.sin(h * Math.PI) * p.arc;
      const ang = Math.atan2((p.ty - p.y) - Math.cos(h * Math.PI) * p.arc * Math.PI, p.tx - p.x);
      fcx.save(); fcx.translate(x, y); fcx.rotate(ang); fcx.strokeStyle = '#5a3a22'; fcx.lineWidth = 2.5; fcx.beginPath(); fcx.moveTo(-22, 0); fcx.lineTo(6, 0); fcx.stroke();
      fcx.fillStyle = '#444'; fcx.beginPath(); fcx.moveTo(10, 0); fcx.lineTo(2, -4); fcx.lineTo(2, 4); fcx.fill();
      fcx.fillStyle = '#c0392b'; fcx.beginPath(); fcx.moveTo(-22, 0); fcx.lineTo(-28, -5); fcx.lineTo(-16, 0); fcx.lineTo(-28, 5); fcx.fill(); fcx.restore();
      if (h >= 1) { p.t = p.life; p.onHit && p.onHit(); }
      continue;
    }
    p.x += p.vx; p.y += p.vy; p.vy += p.g || 0; p.vx *= p.drag || 1; p.vy *= p.drag || 1;
    const a = p.fade === false ? 1 : 1 - k;
    if (p.type === 'spark') { fcx.fillStyle = `rgba(${p.c},${a})`; fcx.beginPath(); fcx.arc(p.x, p.y, p.r * (1 - k * .5), 0, 6.28); fcx.fill(); }
    else if (p.type === 'smoke') { fcx.fillStyle = `rgba(${p.c},${a * .35})`; fcx.beginPath(); fcx.arc(p.x, p.y, p.r * (1 + k * 2), 0, 6.28); fcx.fill(); }
    else if (p.type === 'flash') { const r = p.r * (1 + k); const g = fcx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); g.addColorStop(0, `rgba(255,250,210,${a})`); g.addColorStop(.4, `rgba(255,170,40,${a * .8})`); g.addColorStop(1, 'rgba(255,120,0,0)'); fcx.fillStyle = g; fcx.beginPath(); fcx.arc(p.x, p.y, r, 0, 6.28); fcx.fill(); }
    else if (p.type === 'confetti') { p.rot += p.vr; fcx.save(); fcx.translate(p.x, p.y); fcx.rotate(p.rot); fcx.globalAlpha = Math.min(1, (1 - k) * 3); fcx.fillStyle = p.c; if (p.star) { fcx.font = `${p.r * 3}px serif`; fcx.fillText('★', -p.r, p.r); } else fcx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); fcx.restore(); }
    else if (p.type === 'bubble') { fcx.strokeStyle = `rgba(${p.c},${a})`; fcx.lineWidth = 1.5; fcx.beginPath(); fcx.arc(p.x + Math.sin(p.t / 6) * 3, p.y, p.r, 0, 6.28); fcx.stroke(); }
    else if (p.type === 'plus') { fcx.fillStyle = `rgba(${p.c},${a})`; fcx.font = `bold ${p.r}px sans-serif`; fcx.fillText('+', p.x, p.y); }
  }
  fraf = fparts.length ? requestAnimationFrame(ftick) : 0;
  if (!fraf) fcx.clearRect(0, 0, FW, FH);
}
const R = (a, b) => a + Math.random() * (b - a);
function pt(el) { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
function burst(x, y, n, opt) { for (let i = 0; i < n; i++) { const a = R(0, 6.28), s = R(opt.smin || 1, opt.smax || 4); fparts.push({ type: opt.type || 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: opt.g || 0, drag: opt.drag || .96, r: R(opt.rmin || 1.5, opt.rmax || 3), c: opt.c || '255,200,80', life: R(opt.lmin || 20, opt.lmax || 40), t: 0 }); } }

// Phát bắn: chớp nòng + vệt đạn + tia lửa khi trúng
export function shoot(fromEl, toEl, { delay = 0, onHit } = {}) {
  const a = pt(fromEl), b = pt(toEl); if (!a || !b) return; delay *= S();
  setTimeout(() => {
    fcanvas();
    fparts.push({ type: 'flash', x: a.x, y: a.y, vx: 0, vy: 0, r: 26, life: 10, t: 0 });
    burst(a.x, a.y, 8, { type: 'smoke', c: '200,190,170', smin: .3, smax: 1.2, rmin: 6, rmax: 12, lmin: 30, lmax: 50 });
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    fparts.push({ type: 'tracer', x: a.x, y: a.y, tx: b.x + R(-8, 8), ty: b.y + R(-8, 8), speed: Math.max(8, dist / 55) * S(), life: Math.max(8, dist / 55) * S() + 10, t: 0,
      onHit: () => { burst(b.x, b.y, 14, { c: '255,210,90', smin: 1.5, smax: 5 }); onHit && onHit(); } });
  }, delay);
}
export function arrows(fromEl, toEl, { delay = 0, onHit } = {}) {
  const a = pt(fromEl), b = pt(toEl); if (!a || !b) return; delay *= S();
  setTimeout(() => { fcanvas(); fparts.push({ type: 'arrow', x: a.x, y: a.y, tx: b.x, ty: b.y, arc: 60, speed: 32 * S(), life: 40 * S(), t: 0, onHit: () => { burst(b.x, b.y, 6, { c: '120,80,40', smin: 1, smax: 3 }); onHit && onHit(); } }); }, delay);
}
export function explode(el) {
  const a = pt(el); if (!a) return; fcanvas();
  fparts.push({ type: 'flash', x: a.x, y: a.y, vx: 0, vy: 0, r: 90, life: 18, t: 0 });
  burst(a.x, a.y, 50, { c: '255,170,40', smin: 2, smax: 9, g: .12, rmin: 2, rmax: 4.5, lmin: 30, lmax: 60 });
  burst(a.x, a.y, 20, { type: 'smoke', c: '90,80,70', smin: .5, smax: 2.5, rmin: 10, rmax: 22, lmin: 50, lmax: 90 });
  const w = document.createElement('div'); w.className = 'white-flash'; document.body.appendChild(w); setTimeout(() => w.remove(), 600);
  screenShake();
}
export function sparkle(el, c = '90,200,120') {
  const a = pt(el); if (!a) return; fcanvas();
  for (let i = 0; i < 12; i++) fparts.push({ type: i % 2 ? 'plus' : 'bubble', x: a.x + R(-30, 30), y: a.y + R(-10, 20), vx: R(-.3, .3), vy: R(-1.6, -.6), r: i % 2 ? R(12, 20) : R(3, 6), c, life: R(40, 70), t: 0 });
}
export function confetti() {
  fcanvas(); const cols = ['#d4a63a', '#b8322a', '#2f6fa8', '#3f8f4f', '#f3e6c8', '#e08a2a'];
  for (let i = 0; i < 160; i++) fparts.push({ type: 'confetti', x: R(0, FW), y: R(-FH * .5, -10), vx: R(-1, 1), vy: R(1.5, 4), g: .03, drag: .995, r: R(3, 7), rot: R(0, 6), vr: R(-.15, .15), c: cols[i % cols.length], star: Math.random() < .25, life: R(160, 260), t: 0, fade: false });
}
export function stamp(el, text) {
  const a = pt(el); if (!a) return;
  const n = document.createElement('div'); n.className = 'stamp'; n.textContent = text; n.style.left = a.x + 'px'; n.style.top = a.y + 'px';
  layer().appendChild(n); setTimeout(() => n.remove(), 950 * S());
}
export function screenShake() { const s = document.querySelector('#screen-game'); if (!s) return; s.classList.remove('screen-shake'); void s.offsetWidth; s.classList.add('screen-shake'); setTimeout(() => s.classList.remove('screen-shake'), 650); }

// ================= Âm thanh riêng cho từng lá (tổng hợp, không dùng file) =================
function at(ms, fn) { setTimeout(fn, ms); }
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
const SND = {
  // --- tiếng súng theo loại ---
  colt() { nz(.32, { freq: 2400, gain: .9 }); tn(140, .2, { type: 'triangle', gain: .3, slide: -90 }); nz(.7, { freq: 500, gain: .2, delay: 60 }); },
  schofield() { SND.colt(); },
  remington() { nz(.34, { freq: 2000, gain: 1 }); tn(110, .25, { type: 'triangle', gain: .35, slide: -70 }); nz(.8, { freq: 450, gain: .22, delay: 70 }); },
  volcanic() { [0, 95, 190].forEach(d => { nz(.13, { freq: 3200, gain: .65, delay: d }); tn(220, .08, { type: 'triangle', gain: .2, slide: -120, delay: d }); }); },
  carabine() { nz(.22, { freq: 5500, gain: 1 }); tn(90, .3, { type: 'triangle', gain: .3, slide: -50 }); nz(1, { freq: 600, gain: .25, delay: 90 }); },
  winchester() { SND.carabine(); [380, 470].forEach(d => nz(.03, { type: 'bandpass', freq: 3000, q: 4, gain: .5, delay: d })); },
  // --- trang bị súng: xoay ổ đạn + lên cò ---
  gunEquip() { for (let i = 0; i < 6; i++) nz(.025, { type: 'bandpass', freq: 4200, q: 5, gain: .35, delay: i * 45 }); nz(.05, { type: 'bandpass', freq: 2200, q: 3, gain: .7, delay: 340 }); },
  missed() { nz(.35, { type: 'bandpass', freq: 700, q: 2, gain: .35, sweepTo: 3500 }); tn(3200, .35, { gain: .06, slide: -2200, delay: 120 }); },
  barrel() { [0, 140].forEach(d => { tn(170, .16, { gain: .5, slide: -40, delay: d }); nz(.06, { freq: 900, gain: .35, delay: d }); }); },
  beer() { tn(2600, .5, { gain: .14 }); tn(3950, .35, { gain: .07 }); [260, 470].forEach(d => tn(190, .12, { type: 'triangle', gain: .25, slide: -70, delay: d })); for (let i = 0; i < 6; i++) tn(600 + Math.random() * 700, .05, { gain: .05, delay: 650 + i * 55 }); },
  saloon() { [261, 330, 392, 523].forEach((f, i) => { tn(f, 1, { type: 'triangle', gain: .1, delay: i * 25 }); tn(f * 1.006, 1, { type: 'square', gain: .02, delay: i * 25 }); }); [500, 650].forEach(d => tn(2700, .4, { gain: .1, delay: d })); },
  stagecoach() { nz(.05, { type: 'highpass', freq: 5000, gain: .9 }); for (let i = 0; i < 9; i++) { const d = 120 + Math.floor(i / 3) * 300 + (i % 3) * 80; nz(.07, { freq: 450, gain: .55, delay: d }); } },
  wellsfargo() { for (let i = 0; i < 12; i++) tn(3000 + Math.random() * 3000, .12, { gain: .07, delay: i * 45 + Math.random() * 30 }); },
  store() { [0, 260].forEach(d => { tn(1760, 1, { gain: .12, delay: d }); tn(2640, .7, { gain: .06, delay: d }); }); },
  panic() { nz(.25, { type: 'bandpass', freq: 600, q: 2, gain: .4, sweepTo: 2500 }); tn(700, .18, { type: 'square', gain: .05, slide: 400, delay: 80 }); nz(.08, { freq: 500, gain: .5, delay: 260 }); },
  catbalou() { nz(.04, { type: 'highpass', freq: 6000, gain: 1 }); nz(.12, { freq: 400, gain: .5, delay: 220 }); tn(120, .2, { gain: .2, slide: -40, delay: 220 }); },
  indians() { [0, 260, 520, 690].forEach((d, i) => tn(i === 3 ? 75 : 95, .35, { gain: i === 3 ? .55 : .4, slide: -30, delay: d })); [850, 1000, 1150].forEach(d => nz(.3, { type: 'bandpass', freq: 1200, q: 3, gain: .2, sweepTo: 3000, delay: d })); },
  duel() { tn(392, 2.2, { gain: .18 }); tn(940, 1.6, { gain: .07 }); tn(1570, 1, { gain: .04 }); },
  gatling() { tn(800, .05, { type: 'square', gain: .05 }); for (let i = 0; i < 14; i++) { nz(.09, { freq: 2600, gain: .5, delay: 60 + i * 62 }); tn(200, .05, { type: 'triangle', gain: .12, slide: -100, delay: 60 + i * 62 }); } },
  dynamite() { nz(1.4, { type: 'highpass', freq: 4500, gain: .12 }); for (let i = 0; i < 10; i++) nz(.02, { type: 'bandpass', freq: 3000 + Math.random() * 3000, q: 6, gain: .25, delay: Math.random() * 1300 }); },
  jail() { [310, 763, 1247, 1890].forEach((f, i) => tn(f, 1.2 - i * .2, { type: i % 2 ? 'sine' : 'triangle', gain: .14 })); nz(.08, { freq: 1500, gain: .5 }); for (let i = 0; i < 4; i++) tn(4000 + Math.random() * 2000, .08, { gain: .04, delay: 600 + i * 60 }); },
  scope() { nz(.03, { type: 'bandpass', freq: 3500, q: 5, gain: .5 }); tn(300, .45, { type: 'sawtooth', gain: .03, slide: 700, delay: 60 }); nz(.03, { type: 'bandpass', freq: 3500, q: 5, gain: .5, delay: 520 }); },
  mustang() {
    for (let i = 0; i < 4; i++) nz(.05, { type: 'bandpass', freq: 1100, q: 2, gain: .6, delay: i * 150 + (i % 2) * 40 });
    tn(950, .9, { type: 'sawtooth', gain: .06, slide: -450, delay: 650, vib: 70, vibRate: 11, attack: .05 });
    tn(1900, .9, { type: 'sine', gain: .03, slide: -900, delay: 650, vib: 140, vibRate: 11, attack: .05 });
  },
  jailEscape() { tn(1200, .2, { gain: .08 }); tn(1600, .3, { gain: .08, delay: 120 }); },
};
const GUNS = ['volcanic', 'schofield', 'remington', 'carabine', 'winchester'];
// Âm thanh khi một lá được đánh / trang bị
export function cardSfx(type) {
  if (muted) return;
  if (GUNS.includes(type)) return SND.gunEquip();
  if (type === 'bang') return; // tiếng súng phát theo súng của người bắn
  SND[type] && SND[type]();
}
// Tiếng súng theo khẩu súng người bắn đang cầm
export function gunSfx(gun) { if (muted) return; (SND[gun] || SND.colt)(); }
