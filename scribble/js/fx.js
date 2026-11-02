// Âm thanh tổng hợp WebAudio (không file nhạc), nhạc nền lofi tự sáng tác, hiệu ứng DOM.
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
export const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

let muted = ls.get('scribble-mute') === '1';
export const isMuted = () => muted;
export function toggleMute() { muted = !muted; ls.set('scribble-mute', muted ? '1' : '0'); return muted; }
let ac = null;
export function actx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume(); return ac; }
function tone(f, d, type = 'sine', g = 0.12, slide = 0, at = 0) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(a.destination); o.start(t); o.stop(t + d + 0.03);
}
function noise(d, freq, g, at = 0, type = 'bandpass') {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * d)), a.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const gn = a.createGain(); gn.gain.value = g; s.connect(f); f.connect(gn); gn.connect(a.destination); s.start(t);
}
const arp = (notes, step = 0.07, type = 'triangle', g = 0.1, d = 0.18) => notes.forEach((f, i) => tone(f, d, type, g, 0, i * step));
let tikTok = 0;
export const sfx = {
  correct() { arp([659, 784, 988, 1319], 0.06, 'triangle', 0.11); tone(1568, 0.3, 'sine', 0.05, 0, 0.26); },
  mine() { arp([523, 659, 784, 1047, 1319, 1568], 0.06, 'square', 0.06, 0.16); noise(0.25, 5000, 0.12, 0.3, 'highpass'); },
  close() { tone(440, 0.18, 'sawtooth', 0.05, 500); noise(0.35, 2400, 0.25, 0.05); tone(990, 0.12, 'triangle', 0.07, 0, 0.18); },
  tick() { tikTok ^= 1; tone(tikTok ? 1800 : 1250, 0.045, 'square', 0.05); noise(0.03, 4000, 0.15); },
  timeUp() { tone(520, 0.22, 'sawtooth', 0.07); tone(390, 0.22, 'sawtooth', 0.07, 0, 0.2); tone(260, 0.5, 'sawtooth', 0.07, -80, 0.4); },
  turn() { arp([784, 988, 1175], 0.08, 'sine', 0.09, 0.22); },
  myTurn() { arp([523, 784, 1047, 784, 1047], 0.09, 'triangle', 0.1); },
  choose() { tone(880, 0.08, 'sine', 0.08); tone(1320, 0.12, 'sine', 0.07, 0, 0.07); },
  pop() { tone(700, 0.06, 'sine', 0.05, 300); },
  send() { noise(0.05, 3200, 0.18); },
  bad() { tone(200, 0.15, 'sawtooth', 0.05); },
  submit() { arp([660, 990], 0.07, 'sine', 0.09); },
  reveal() { noise(0.18, 1600, 0.25); arp([523, 784], 0.1, 'triangle', 0.08); },
  react() { tone(1200 + Math.random() * 600, 0.07, 'sine', 0.06, 400); },
  win() { arp([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.12, 'triangle', 0.1, 0.22); },
  boom() { noise(0.6, 300, 0.5, 0, 'lowpass'); noise(0.4, 3500, 0.12, 0.05, 'highpass'); },
};

// ---------- nhạc nền lofi ----------
let musicOn = ls.get('scribble-music') === '1', mGain = null, mBuf = null, mSrc = null;
const CH = [[261.6, 329.6, 392, 493.9], [220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 349.2]];
const PENTA = [523.3, 587.3, 659.3, 784, 880, 1046.5];
async function renderMusic(a) {
  if (mBuf) return mBuf;
  const sr = a.sampleRate, beat = 0.36, L = Math.round(4 * 8 * beat * sr), tail = sr;
  const off = new OfflineAudioContext(2, L + tail, sr), dest = off.destination;
  const t = (f, d, type, g, at) => { const o = off.createOscillator(); o.type = type; o.frequency.value = f; const gn = off.createGain(); gn.gain.setValueAtTime(0.0001, at); gn.gain.exponentialRampToValueAtTime(g, at + 0.03); gn.gain.exponentialRampToValueAtTime(0.0001, at + d); o.connect(gn); gn.connect(dest); o.start(at); o.stop(at + d + 0.05); };
  let seed = 7; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let k = 0; k < 4; k++) {
    const ch = CH[k], base = k * 8 * beat;
    ch.forEach((f, i) => t(f / 2, 8 * beat, 'triangle', 0.035, base + i * 0.02)); // pad
    t(ch[0] / 4, beat * 1.6, 'sine', 0.22, base); t(ch[0] / 4, beat * 1.2, 'sine', 0.16, base + 4.5 * beat); // bass
    for (let i = 0; i < 8; i++) {
      const at = base + i * beat;
      if (i % 2 === 1) { const b = off.createBufferSource(); const nb = off.createBuffer(1, sr * 0.04 | 0, sr); const x = nb.getChannelData(0); for (let j = 0; j < x.length; j++) x[j] = (Math.random() * 2 - 1) * (1 - j / x.length) * 0.08; b.buffer = nb; b.connect(dest); b.start(at); } // hi-hat
      if (r() < 0.55) t(PENTA[Math.floor(r() * PENTA.length)], beat * 0.9, 'sine', 0.05, at + (r() < 0.3 ? beat / 2 : 0)); // giai điệu
    }
  }
  const out0 = await off.startRendering(); const out = a.createBuffer(2, L, sr);
  for (let c = 0; c < 2; c++) { const d = out0.getChannelData(c), o = out.getChannelData(c); o.set(d.subarray(0, L)); for (let i = 0; i < tail; i++) o[i] += d[L + i]; }
  return (mBuf = out);
}
async function musicStart() {
  const a = actx(); if (!a || mSrc) return;
  if (!mGain) { mGain = a.createGain(); mGain.connect(a.destination); } mGain.gain.value = 0.5;
  mSrc = true; const buf = await renderMusic(a); if (mSrc !== true || !musicOn) { if (mSrc === true) mSrc = null; return; }
  mSrc = a.createBufferSource(); mSrc.buffer = buf; mSrc.loop = true; mSrc.connect(mGain); mSrc.start();
}
function musicStop() { if (mSrc && mSrc !== true) try { mSrc.stop(); } catch (e) {} mSrc = null; }
export const musicIsOn = () => musicOn;
export function musicToggle() { musicOn = !musicOn; ls.set('scribble-music', musicOn ? '1' : '0'); musicOn ? musicStart() : musicStop(); return musicOn; }
export function musicResumeIfOn() { if (musicOn) musicStart(); }
document.addEventListener('visibilitychange', () => { if (ac && !document.hidden && ac.state !== 'running') ac.resume(); });

// ---------- hiệu ứng ----------
function layer() { let l = document.getElementById('fx-layer'); if (!l) { l = document.createElement('div'); l.id = 'fx-layer'; document.body.appendChild(l); } return l; }
const COLS = ['#ef2b3a', '#ffd21f', '#22b852', '#2a63e8', '#e64ec8', '#ff7a1a', '#18c6e0'];
export function burst(el, n = 24) {
  if (!el || reduced()) return; const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i'); d.className = 'spark'; d.style.background = COLS[i % COLS.length];
    const ang = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 80;
    d.style.left = x + 'px'; d.style.top = y + 'px';
    d.style.setProperty('--dx', Math.cos(ang) * dist + 'px'); d.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
    layer().appendChild(d); setTimeout(() => d.remove(), 900);
  }
}
const bq = []; let busy = false;
export function banner(text, cls = '') { bq.push([text, cls]); if (bq.length > 3) bq.splice(0, bq.length - 3); if (!busy) nextB(); }
function nextB() {
  const it = bq.shift(); if (!it) { busy = false; return; } busy = true;
  const n = document.createElement('div'); n.className = 'banner ' + it[1]; n.textContent = it[0]; layer().appendChild(n);
  setTimeout(() => { n.remove(); nextB(); }, 1300);
}
export function floatUp(text, el, cls = '') {
  if (!el) return; const r = el.getBoundingClientRect();
  const n = document.createElement('div'); n.className = 'float-up ' + cls; n.textContent = text;
  n.style.left = (r.left + r.width / 2 + (Math.random() * 30 - 15)) + 'px'; n.style.top = (r.top + r.height / 2) + 'px';
  layer().appendChild(n); setTimeout(() => n.remove(), 1500);
}
export function pop(el, cls = 'pop') { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 700); }
// Pháo hoa trên canvas phủ toàn màn hình
export function fireworks(ms = 4200) {
  if (reduced()) return;
  const c = document.createElement('canvas'); c.className = 'fireworks'; layer().appendChild(c);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; }; size();
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  const parts = [], rockets = []; let last = 0; const t0 = performance.now();
  const launch = () => rockets.push({ x: innerWidth * (0.15 + Math.random() * 0.7), y: innerHeight, vy: -(innerHeight / 75 + Math.random() * 3), ty: innerHeight * (0.15 + Math.random() * 0.3), col: COLS[Math.floor(Math.random() * COLS.length)] });
  function frame(now) {
    const el = now - t0;
    if (el < ms - 1200 && now - last > 330) { launch(); last = now; }
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.y += r.vy; ctx.fillStyle = r.col; ctx.fillRect(r.x - 1.5, r.y, 3, 7);
      if (r.y <= r.ty) { rockets.splice(i, 1); sfx.boom(); for (let k = 0; k < 60; k++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4.5; parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col: Math.random() < 0.2 ? '#fff' : r.col }); } }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.vx *= 0.985; p.life -= 0.014;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = p.life; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
    }
    if (el < ms || parts.length) requestAnimationFrame(frame); else c.remove();
  }
  requestAnimationFrame(frame);
}
export function confetti(n = 90) {
  if (reduced()) return;
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i'); d.className = 'confetti'; d.style.background = COLS[i % COLS.length];
    d.style.left = Math.random() * 100 + 'vw'; d.style.animationDelay = Math.random() * 500 + 'ms';
    d.style.animationDuration = 1800 + Math.random() * 1500 + 'ms'; d.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    layer().appendChild(d); setTimeout(() => d.remove(), 4000);
  }
}
