// Hiệu ứng + âm thanh tổng hợp cho UNO (không cần file âm thanh)
export const SPEEDS = { slow: { k: 1.8, name: 'Chậm' }, normal: { k: 1.3, name: 'Vừa' }, fast: { k: 0.85, name: 'Nhanh' } };
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
let speedKey = SPEEDS[ls.get('typhu-speed')] ? ls.get('typhu-speed') : 'normal';
export const S = () => SPEEDS[speedKey].k;
export const getSpeed = () => speedKey;
export function setSpeed(k) { if (SPEEDS[k]) { speedKey = k; ls.set('typhu-speed', k); } }

let muted = ls.get('typhu-mute') === '1';
export const isMuted = () => muted;
export function toggleMute() { muted = !muted; ls.set('typhu-mute', muted ? '1' : '0'); return muted; }

let ac = null;
export function actx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume(); return ac; }
function tone(f, d, type = 'sine', g = 0.12, slide = 0, at = 0) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, freq, g, at = 0, type = 'bandpass') {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.floor(a.sampleRate * d), a.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const gn = a.createGain(); gn.gain.value = g; s.connect(f); f.connect(gn); gn.connect(a.destination); s.start(t);
}
const arp = (notes, step = 0.07, type = 'triangle', g = 0.1) => notes.forEach((f, i) => tone(f, 0.18, type, g, 0, i * step));
export const sfx = {
  dice() { for (let i = 0; i < 7; i++) noise(0.05, 1500 + Math.random() * 2500, 0.35, i * 0.07 + Math.random() * 0.03); },
  hop() { tone(520 + Math.random() * 80, 0.07, 'sine', 0.07, 260); },
  cash() { tone(1318, 0.08, 'square', 0.05); tone(1760, 0.2, 'square', 0.05, 0, 0.07); noise(0.15, 6000, 0.12, 0.05); },
  payout() { tone(660, 0.1, 'triangle', 0.08, -200); tone(440, 0.18, 'triangle', 0.08, -150, 0.1); },
  build() { for (let i = 0; i < 3; i++) { noise(0.05, 900, 0.5, i * 0.13); tone(180, 0.06, 'square', 0.05, 0, i * 0.13); } },
  landmark() { arp([523, 659, 784, 1047, 1319], 0.08, 'triangle', 0.1); noise(0.6, 4000, 0.15, 0.3, 'highpass'); },
  chance() { arp([880, 1175, 1568], 0.06, 'sine', 0.08); },
  island() { tone(300, 0.5, 'sine', 0.1, -150); noise(0.8, 500, 0.25, 0.1, 'lowpass'); },
  plane() { const a = actx(); if (!a || muted) return; noise(1.2, 700, 0.35, 0, 'bandpass'); tone(200, 1.1, 'sawtooth', 0.03, 600); },
  festival() { arp([784, 988, 1175, 1568, 1175, 1568], 0.07, 'square', 0.06); },
  takeover() { tone(392, 0.15, 'sawtooth', 0.07); tone(523, 0.15, 'sawtooth', 0.07, 0, 0.12); tone(784, 0.3, 'sawtooth', 0.07, 0, 0.24); },
  bankrupt() { tone(400, 0.9, 'sawtooth', 0.09, -330); },
  flip() { noise(0.07, 2600, 0.35); },
  play() { noise(0.06, 3000, 0.3); tone(880, 0.08, 'sine', 0.06, 200); },
  draw() { noise(0.09, 1800, 0.25); tone(330, 0.1, 'sine', 0.05, -80); },
  skip() { tone(620, 0.09, 'square', 0.06); tone(310, 0.18, 'square', 0.06, 0, 0.09); },
  skipall() { [700, 520, 380, 260].forEach((f, i) => tone(f, 0.1, 'square', 0.05, 0, i * 0.07)); },
  rev() { tone(400, 0.25, 'triangle', 0.1, 400); tone(800, 0.25, 'triangle', 0.08, -400, 0.2); },
  plus(n = 2) { const k = Math.min(6, 1 + Math.round(n / 2)); for (let i = 0; i < k; i++) tone(300 + i * 90, 0.12, 'sawtooth', 0.05, 60, i * 0.06); noise(0.25, 900, 0.4, k * 0.06, 'lowpass'); },
  wild() { arp([523, 659, 784, 988, 1175], 0.05, 'sine', 0.09); },
  roulette() { for (let i = 0; i < 10; i++) tone(500 + (i % 4) * 120, 0.06, 'square', 0.04, 0, i * 0.06 + i * i * 0.004); },
  discall() { noise(0.4, 600, 0.6, 0, 'lowpass'); arp([784, 659, 523], 0.06, 'triangle', 0.08); },
  swap() { tone(300, 0.3, 'sine', 0.1, 500); tone(800, 0.3, 'sine', 0.08, -500, 0.05); },
  uno() { arp([784, 1047, 1319], 0.08, 'square', 0.07); },
  caught() { tone(880, 0.12, 'square', 0.07); tone(660, 0.12, 'square', 0.07, 0, 0.14); tone(440, 0.3, 'square', 0.07, -200, 0.28); },
  turn() { tone(988, 0.1, 'sine', 0.07); tone(1319, 0.14, 'sine', 0.06, 0, 0.08); },
  bad() { tone(200, 0.15, 'sawtooth', 0.05); },
  out() { tone(400, 0.7, 'sawtooth', 0.08, -300); },
  win() { arp([523, 659, 784, 1047, 784, 1047, 1319], 0.11, 'triangle', 0.1); },
};

// ---------- hiệu ứng DOM ----------
function layer() { let l = document.getElementById('fx-layer'); if (!l) { l = document.createElement('div'); l.id = 'fx-layer'; document.body.appendChild(l); } return l; }
const ctr = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
export function fly(html, fromEl, toEl, { delay = 0, duration = 460, rotate = 0, scale = 1, onEnd } = {}) {
  if (!fromEl || !toEl) { onEnd && onEnd(); return; }
  duration *= S(); delay *= S();
  const a = ctr(fromEl), b = ctr(toEl);
  const n = document.createElement('div'); n.className = 'flyer'; n.innerHTML = html; layer().appendChild(n);
  const w = n.offsetWidth || 70, h = n.offsetHeight || 104;
  n.style.transform = `translate(${a.x - w / 2}px,${a.y - h / 2}px) scale(.7)`; n.style.opacity = '0';
  setTimeout(() => {
    n.style.transition = `transform ${duration}ms cubic-bezier(.2,.9,.3,1.15), opacity 120ms`; n.style.opacity = '1';
    n.style.transform = `translate(${b.x - w / 2}px,${b.y - h / 2}px) scale(${scale}) rotate(${rotate}deg)`;
    setTimeout(() => { n.remove(); onEnd && onEnd(); }, duration + 30);
  }, delay);
}
export function floatText(el, text, cls = '') {
  if (!el) return; const c = ctr(el);
  const n = document.createElement('div'); n.className = 'float-text ' + cls; n.textContent = text;
  n.style.left = c.x + 'px'; n.style.top = c.y + 'px'; layer().appendChild(n); setTimeout(() => n.remove(), 1400 * S());
}
export function pop(el, cls = 'pop') { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 800 * S()); }
const HEX = { R: '#ff4d5e', Y: '#ffc23d', G: '#2fc76f', B: '#3d8bff', W: '#7a5cff' };
export function burst(el, color = 'W', n = 22) {
  if (!el) return; const c = ctr(el); const cols = color === 'W' ? Object.values(HEX) : color[0] === '#' ? [color, '#fff', '#ffd54a'] : [HEX[color], '#fff', HEX[color]];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i'); d.className = 'spark'; d.style.background = cols[i % cols.length];
    const ang = Math.random() * Math.PI * 2, dist = 50 + Math.random() * 90;
    d.style.left = c.x + 'px'; d.style.top = c.y + 'px';
    d.style.setProperty('--dx', Math.cos(ang) * dist + 'px'); d.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
    d.style.animationDuration = 700 * S() + 'ms'; layer().appendChild(d); setTimeout(() => d.remove(), 800 * S());
  }
}
export function ring(el, color) {
  if (!el) return; const c = ctr(el); const d = document.createElement('i'); d.className = 'ring';
  d.style.left = c.x + 'px'; d.style.top = c.y + 'px'; d.style.borderColor = HEX[color] || '#fff';
  d.style.animationDuration = 800 * S() + 'ms'; layer().appendChild(d); setTimeout(() => d.remove(), 900 * S());
}
export function confetti() {
  const cols = Object.values(HEX);
  for (let i = 0; i < 120; i++) {
    const d = document.createElement('i'); d.className = 'confetti'; d.style.background = cols[i % 5];
    d.style.left = Math.random() * 100 + 'vw'; d.style.animationDelay = Math.random() * 600 + 'ms';
    d.style.animationDuration = 1800 + Math.random() * 1600 + 'ms'; d.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    layer().appendChild(d); setTimeout(() => d.remove(), 4200);
  }
}
const bq = []; let busy = false;
export function banner(text, cls = '') { bq.push([text, cls]); if (bq.length > 3) bq.splice(0, bq.length - 3); if (!busy) nextB(); }
function nextB() {
  const it = bq.shift(); if (!it) { busy = false; return; } busy = true;
  const n = document.createElement('div'); n.className = 'banner ' + it[1]; n.textContent = it[0]; layer().appendChild(n);
  n.style.animationDuration = 1100 * S() + 'ms';
  setTimeout(() => { n.remove(); nextB(); }, 1000 * S());
}
export function shake(el) { pop(el, 'shake'); }

// ---------- nhạc nền pop vui ----------
let musicOn = ls.get('typhu-music') === '1', mGain = null, vol = +(ls.get('typhu-music-vol') || 0.5);
const PROG = [[293.7, 370, 440], [246.9, 293.7, 370], [196, 246.9, 293.7], [220, 277.2, 329.6]];
const MEL = [4, -1, 2, 4, 5, 4, 2, -1, 0, 2, 4, 2, 0, -1, 2, -1];
const SCALE = [587.3, 659.3, 740, 880, 987.8, 1174.7, 1318.5, 1480];
function mtone(c, dest, f, d, type, g, t) {
  const o = c.createOscillator(); o.type = type; o.frequency.value = f; const gn = c.createGain();
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(dest); o.start(t); o.stop(t + d + 0.05);
}
// Dựng sẵn vòng nhạc thành đoạn âm thanh lặp: chuyển tab vẫn không mất nhạc
let mBuf = null, mSrc = null;
async function renderMusic(a) {
  if (mBuf) return mBuf;
  const sr = a.sampleRate, bt = 0.2, L = Math.round(4 * 8 * bt * sr), tail = Math.round(sr);
  const off = new OfflineAudioContext(2, L + tail, sr); const dest = off.destination;
  for (let k = 0; k < 4; k++) {
    const st = k * 8, ch = PROG[k], base = k * 8 * bt;
    for (let i = 0; i < 8; i++) {
      const at = base + i * bt;
      if (i % 2 === 0) mtone(off, dest, ch[0] / 2, 0.3, 'triangle', 0.25, at);
      if (i % 4 === 2) mtone(off, dest, ch[(i / 2) % 3], 0.15, 'square', 0.04, at);
      const m = MEL[(st + i) % 16]; if (m >= 0 && (i % 2 === 0 || (st * 7 + i * 3) % 10 < 3)) mtone(off, dest, SCALE[m], 0.18, 'sine', 0.08, at);
    }
  }
  const r = await off.startRendering(); const out = a.createBuffer(2, L, sr);
  for (let c = 0; c < 2; c++) { const d = r.getChannelData(c), o = out.getChannelData(c); o.set(d.subarray(0, L)); for (let i = 0; i < tail; i++) o[i] += d[L + i]; }
  return (mBuf = out);
}
export async function musicStart() {
  const a = actx(); if (!a || mSrc) return;
  if (!mGain) { mGain = a.createGain(); mGain.connect(a.destination); } mGain.gain.value = vol * 0.3;
  mSrc = true; const buf = await renderMusic(a); if (mSrc !== true || !musicOn) { if (mSrc === true) mSrc = null; return; }
  mSrc = a.createBufferSource(); mSrc.buffer = buf; mSrc.loop = true; mSrc.connect(mGain); mSrc.start();
}
export function musicStop() { if (mSrc && mSrc !== true) try { mSrc.stop(); } catch (e) {} mSrc = null; }
document.addEventListener('visibilitychange', () => { if (ac && !document.hidden && ac.state !== 'running') ac.resume(); });
export const musicIsOn = () => musicOn;
export function musicToggle() { musicOn = !musicOn; ls.set('typhu-music', musicOn ? '1' : '0'); musicOn ? musicStart() : musicStop(); return musicOn; }
export function musicVolume(v) { if (v == null) return vol; vol = v; ls.set('typhu-music-vol', String(v)); if (mGain) mGain.gain.value = vol * 0.3; }
export function musicResumeIfOn() { if (musicOn) musicStart(); }
