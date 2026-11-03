// Âm thanh tổng hợp WebAudio + hiệu ứng DOM cho Poker (không dùng file âm thanh)
export const SPEEDS = { slow: { k: 1.6, name: 'Chậm' }, normal: { k: 1, name: 'Vừa' }, fast: { k: 0.6, name: 'Nhanh' } };
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
let speedKey = SPEEDS[ls.get('poker-speed')] ? ls.get('poker-speed') : 'normal';
export const S = () => SPEEDS[speedKey].k;
export const getSpeed = () => speedKey;
export function setSpeed(k) { if (SPEEDS[k]) { speedKey = k; ls.set('poker-speed', k); } }
export const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

let muted = ls.get('poker-mute') === '1';
export const isMuted = () => muted;
export function toggleMute() { muted = !muted; ls.set('poker-mute', muted ? '1' : '0'); return muted; }

let ac = null;
export function actx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume().catch(() => {}); return ac; }
function tone(f, d, type = 'sine', g = 0.12, slide = 0, at = 0) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.008); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, freq, g, at = 0, type = 'bandpass', q = 1) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * d)), a.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 2);
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const gn = a.createGain(); gn.gain.value = g; s.connect(f); f.connect(gn); gn.connect(a.destination); s.start(t);
}
// tiếng chip chạm nhau: vài tiếng "tách" cao, lệch nhau chút
function clink(at = 0, g = 0.07) { tone(3200 + Math.random() * 900, 0.05, 'sine', g, -300, at); tone(5200 + Math.random() * 700, 0.035, 'triangle', g * 0.6, 0, at + 0.006); noise(0.03, 6000, 0.12, at, 'highpass'); }
export const sfx = {
  deal() { noise(0.06, 2400, 0.35); },
  flip() { noise(0.05, 3200, 0.3); tone(700, 0.05, 'sine', 0.03, 200); },
  chip(n = 2) { for (let i = 0; i < Math.min(5, n); i++) clink(i * 0.045); },
  check() { tone(180, 0.07, 'sine', 0.16, -40); noise(0.04, 500, 0.4, 0, 'lowpass'); tone(170, 0.07, 'sine', 0.14, -40, 0.13); noise(0.04, 500, 0.35, 0.13, 'lowpass'); },
  fold() { noise(0.18, 1400, 0.3, 0, 'bandpass', 0.6); },
  allin() { for (let i = 0; i < 9; i++) clink(i * 0.03, 0.06); tone(110, 0.5, 'sawtooth', 0.05, 60, 0.05); tone(220, 0.5, 'triangle', 0.05, 110, 0.05); },
  collect() { for (let i = 0; i < 4; i++) clink(0.05 + i * 0.05, 0.05); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, 0, i * 0.09)); setTimeout(() => sfx.chip(5), 300); },
  lose() { tone(330, 0.3, 'triangle', 0.06, -80); tone(262, 0.45, 'triangle', 0.05, -60, 0.2); },
  turn() { tone(880, 0.09, 'sine', 0.08); tone(1320, 0.14, 'sine', 0.07, 0, 0.09); },
  tick() { tone(1500, 0.03, 'square', 0.03); },
  bad() { tone(200, 0.15, 'sawtooth', 0.05); },
  level() { [392, 523, 659].forEach((f, i) => tone(f, 0.16, 'square', 0.05, 0, i * 0.08)); },
  rebuy() { [523, 784, 659, 1047].forEach((f, i) => tone(f, 0.14, 'sine', 0.08, 0, i * 0.07)); },
  bust() { tone(400, 0.7, 'sawtooth', 0.06, -300); },
  pip() { tone(1200, 0.06, 'sine', 0.05, 300); },
};

// ---------- hiệu ứng DOM ----------
function layer() { let l = document.getElementById('fx-layer'); if (!l) { l = document.createElement('div'); l.id = 'fx-layer'; document.body.appendChild(l); } return l; }
export const ctr = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
// bay 1 phần tử html từ A tới B (A, B là element hoặc {x,y})
export function fly(html, from, to, { delay = 0, duration = 450, cls = '', scale = 1, onEnd } = {}) {
  if (!from || !to) { onEnd && onEnd(); return; }
  const a = from.getBoundingClientRect ? ctr(from) : from, b = to.getBoundingClientRect ? ctr(to) : to;
  if (reduced()) { setTimeout(() => onEnd && onEnd(), delay * S()); return; }
  duration *= S(); delay *= S();
  const n = document.createElement('div'); n.className = 'flyer ' + cls; n.innerHTML = html; layer().appendChild(n);
  const w = n.offsetWidth, h = n.offsetHeight;
  n.style.transform = `translate(${a.x - w / 2}px,${a.y - h / 2}px)`; n.style.opacity = '0';
  setTimeout(() => {
    n.style.transition = `transform ${duration}ms cubic-bezier(.25,.8,.3,1), opacity 120ms`; n.style.opacity = '1';
    n.style.transform = `translate(${b.x - w / 2}px,${b.y - h / 2}px) scale(${scale})`;
    setTimeout(() => { n.remove(); onEnd && onEnd(); }, duration + 30);
  }, delay);
}
export function floatText(el, text, cls = '') {
  if (!el) return; const c = ctr(el);
  const n = document.createElement('div'); n.className = 'float-text ' + cls; n.textContent = text;
  n.style.left = c.x + 'px'; n.style.top = c.y + 'px'; layer().appendChild(n); setTimeout(() => n.remove(), 1600 * S());
}
export function pop(el, cls = 'pop') { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 800 * S()); }
const bq = []; let busy = false;
export function banner(text, cls = '') { bq.push([text, cls]); if (bq.length > 2) bq.splice(0, bq.length - 2); if (!busy) nextB(); }
function nextB() {
  const it = bq.shift(); if (!it) { busy = false; return; } busy = true;
  const n = document.createElement('div'); n.className = 'banner ' + it[1]; n.textContent = it[0]; layer().appendChild(n);
  n.style.animationDuration = 1300 * S() + 'ms';
  setTimeout(() => { n.remove(); nextB(); }, 1200 * S());
}
const CONF = ['#ffcf3f', '#ff5a7a', '#35c38f', '#4d8dff', '#a66bff'];
export function confetti(k = 90) {
  if (reduced()) return;
  for (let i = 0; i < k; i++) {
    const d = document.createElement('i'); d.className = 'confetti'; d.style.background = CONF[i % CONF.length];
    d.style.left = Math.random() * 100 + 'vw'; d.style.animationDelay = Math.random() * 500 + 'ms';
    d.style.animationDuration = 1800 + Math.random() * 1500 + 'ms'; d.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    layer().appendChild(d); setTimeout(() => d.remove(), 4000);
  }
}

// ---------- nhạc nền: lounge jazz nhẹ (dựng sẵn thành vòng lặp) ----------
let musicOn = ls.get('poker-music') === '1', mGain = null, vol = +(ls.get('poker-music-vol') || 0.5);
// ii–V–I–vi ở Đô trưởng, hợp âm 7
const CH = [[146.8, 174.6, 220, 261.6], [196, 246.9, 293.7, 349.2], [130.8, 164.8, 196, 246.9], [110, 130.8, 164.8, 196]];
const BASS = [[73.4, 87.3, 110, 103.8], [98, 123.5, 146.8, 138.6], [65.4, 82.4, 98, 110], [55, 65.4, 82.4, 77.8]];
const MEL = [[587.3, 0, 523.3, 440, 0, 523.3, 587.3, 0], [698.5, 659.3, 0, 587.3, 493.9, 0, 392, 0], [659.3, 0, 587.3, 523.3, 0, 493.9, 523.3, 0], [440, 0, 523.3, 0, 659.3, 587.3, 0, 0]];
function mt(c, dest, f, d, type, g, t, att = 0.02) {
  const o = c.createOscillator(); o.type = type; o.frequency.value = f; const gn = c.createGain();
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + att); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(dest); o.start(t); o.stop(t + d + 0.05);
}
let mBuf = null, mSrc = null;
async function renderMusic(a) {
  if (mBuf) return mBuf;
  const sr = a.sampleRate, beat = 0.42, bars = 4, L = Math.round(bars * 4 * beat * sr), tail = Math.round(sr * 1.2);
  const off = new OfflineAudioContext(2, L + tail, sr); const dest = off.destination;
  for (let b = 0; b < bars; b++) {
    const t0 = b * 4 * beat;
    // pad hợp âm (rhodes giả): nhấn ở phách 1 và 2.5 (swing)
    for (const at of [0, 1.6]) for (const f of CH[b]) mt(off, dest, f, beat * 1.8, 'sine', 0.035, t0 + at * beat, 0.01);
    for (const f of CH[b]) mt(off, dest, f * 2, beat * 0.9, 'triangle', 0.008, t0 + 0.02, 0.005);
    // bass đi bộ
    for (let i = 0; i < 4; i++) mt(off, dest, BASS[b][i], beat * 0.9, 'triangle', 0.12, t0 + i * beat, 0.01);
    // hi-hat swing (tổng hợp nhiễu)
    for (let i = 0; i < 4; i++) for (const sw of [0, 0.66]) {
      const t = t0 + (i + sw) * beat; const n = off.createBufferSource(); const len = Math.floor(sr * 0.04);
      const buf = off.createBuffer(1, len, sr); const x = buf.getChannelData(0); for (let k = 0; k < len; k++) x[k] = (Math.random() * 2 - 1) * (1 - k / len) ** 3;
      n.buffer = buf; const f = off.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = off.createGain(); g.gain.value = sw ? 0.025 : 0.04;
      n.connect(f); f.connect(g); g.connect(dest); n.start(t);
    }
    // giai điệu vibraphone
    MEL[b].forEach((f, i) => { if (f) mt(off, dest, f, beat * 0.9, 'sine', 0.05, t0 + i * beat * 0.5 + (i % 2 ? beat * 0.16 : 0), 0.005); });
  }
  const r = await off.startRendering(); const out = a.createBuffer(2, L, sr);
  for (let c = 0; c < 2; c++) { const d = r.getChannelData(c), o = out.getChannelData(c); o.set(d.subarray(0, L)); for (let i = 0; i < tail; i++) o[i] += d[L + i]; }
  return (mBuf = out);
}
export async function musicStart() {
  const a = actx(); if (!a || mSrc) return;
  if (!mGain) { mGain = a.createGain(); mGain.connect(a.destination); } mGain.gain.value = vol * 0.5;
  mSrc = true; const buf = await renderMusic(a); if (mSrc !== true || !musicOn) { if (mSrc === true) mSrc = null; return; }
  mSrc = a.createBufferSource(); mSrc.buffer = buf; mSrc.loop = true; mSrc.connect(mGain); mSrc.start(); const me = mSrc; me.onended = () => { if (mSrc === me) mSrc = null; };
}
export function musicStop() { if (mSrc && mSrc !== true) try { mSrc.stop(); } catch (e) {} mSrc = null; }
// đổi tab / khoá màn hình rồi quay lại: bật lại nhạc (máy đòi chạm thì chờ lần chạm kế)
function revive() {
  if (document.hidden || !ac) return;
  const go = () => { if (ac.state !== 'running') ac.resume().catch(() => {}); if (musicOn && !mSrc) musicStart(); };
  go();
  if (ac.state !== 'running') { const once = () => { go(); removeEventListener('pointerdown', once, true); removeEventListener('keydown', once, true); }; addEventListener('pointerdown', once, true); addEventListener('keydown', once, true); }
}
if (typeof document !== 'undefined') { document.addEventListener('visibilitychange', revive); addEventListener('focus', revive); addEventListener('pageshow', revive); setInterval(() => { if (ac && !document.hidden && ac.state === 'running' && musicOn && !mSrc) musicStart(); }, 4000); }
export const musicIsOn = () => musicOn;
export function musicToggle() { musicOn = !musicOn; ls.set('poker-music', musicOn ? '1' : '0'); musicOn ? musicStart() : musicStop(); return musicOn; }
export function musicVolume(v) { if (v == null) return vol; vol = v; ls.set('poker-music-vol', String(v)); if (mGain) mGain.gain.value = vol * 0.5; }
export function musicResumeIfOn() { if (musicOn) musicStart(); }
