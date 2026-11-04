// Âm thanh tự tổng hợp (WebAudio) + hiệu ứng DOM + cài đặt người dùng. Không dùng file nhạc nào.
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
// ---------- cài đặt ----------
const DEF = { music: 0.45, sfx: 0.8, theme: 'day', quality: coarse || (typeof innerWidth !== 'undefined' && innerWidth < 700) ? 'med' : 'high', effects: !reduced, speed: 'normal', musicOn: false };
export const settings = (() => { try { return { ...DEF, ...JSON.parse(ls.get('typhu-settings') || '{}') }; } catch (e) { return { ...DEF }; } })();
export function saveSettings() { ls.set('typhu-settings', JSON.stringify(settings)); }
export const SPEEDS = { slow: { k: 1.5, name: 'Chậm' }, normal: { k: 1, name: 'Vừa' }, fast: { k: 0.6, name: 'Nhanh' } };
export const S = () => (SPEEDS[settings.speed] || SPEEDS.normal).k * (reduced ? 0.7 : 1);
export const effectsOn = () => settings.effects;

// ---------- WebAudio ----------
let ac = null, sfxBus = null, musicBus = null;
export function actx() {
  if (typeof window === 'undefined') return null;
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } sfxBus = ac.createGain(); sfxBus.connect(ac.destination); musicBus = ac.createGain(); musicBus.connect(ac.destination); applyVolumes(); }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
export function applyVolumes() { if (!ac) return; sfxBus.gain.value = settings.sfx * 0.9; musicBus.gain.value = settings.music * 0.35; }
function tone(f, d, type = 'sine', g = 0.12, slide = 0, at = 0) {
  const a = actx(); if (!a || !settings.sfx) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(sfxBus); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, freq, g, at = 0, type = 'bandpass') {
  const a = actx(); if (!a || !settings.sfx) return; const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * d)), a.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const gn = a.createGain(); gn.gain.value = g; s.connect(f); f.connect(gn); gn.connect(sfxBus); s.start(t);
}
const arp = (notes, step = 0.07, type = 'triangle', g = 0.1) => notes.forEach((f, i) => tone(f, 0.2, type, g, 0, i * step));
export const sfx = {
  dice() { for (let i = 0; i < 9; i++) noise(0.045, 1400 + Math.random() * 2600, 0.4, i * 0.09 + Math.random() * 0.04); },
  hop() { tone(480 + Math.random() * 90, 0.07, 'sine', 0.06, 240); },
  cash() { tone(1318, 0.08, 'square', 0.045); tone(1760, 0.22, 'square', 0.045, 0, 0.07); noise(0.15, 6000, 0.1, 0.05); },
  pay() { tone(660, 0.1, 'triangle', 0.08, -200); tone(440, 0.18, 'triangle', 0.08, -150, 0.1); },
  ouch() { tone(300, 0.35, 'sawtooth', 0.08, -180); noise(0.3, 400, 0.4, 0, 'lowpass'); tone(150, 0.4, 'square', 0.05, -60, 0.15); },
  buy() { arp([659, 784, 988, 1319], 0.06, 'triangle', 0.09); noise(0.2, 5000, 0.08, 0.2, 'highpass'); },
  build() { for (let i = 0; i < 3; i++) { noise(0.05, 900, 0.45, i * 0.12); tone(190, 0.06, 'square', 0.045, 0, i * 0.12); } },
  landmark() { arp([523, 659, 784, 1047, 1319, 1568], 0.08, 'triangle', 0.1); noise(0.8, 3500, 0.12, 0.35, 'highpass'); [0.5, 0.75, 1].forEach(t => noise(0.3, 900, 0.25, t, 'lowpass')); },
  card() { noise(0.12, 2600, 0.3); arp([880, 1175, 1568], 0.07, 'sine', 0.07); },
  jail() { for (let i = 0; i < 4; i++) { tone(960, 0.18, 'square', 0.05, 0, i * 0.36); tone(720, 0.18, 'square', 0.05, 0, i * 0.36 + 0.18); } noise(0.2, 300, 0.5, 1.4, 'lowpass'); },
  unlock() { tone(700, 0.08, 'square', 0.05); tone(1050, 0.16, 'sine', 0.07, 200, 0.08); },
  auction() { tone(220, 0.08, 'square', 0.1); noise(0.08, 500, 0.7, 0, 'lowpass'); },
  bid() { tone(880, 0.06, 'sine', 0.06); },
  takeover() { tone(392, 0.15, 'sawtooth', 0.07); tone(523, 0.15, 'sawtooth', 0.07, 0, 0.12); tone(784, 0.35, 'sawtooth', 0.07, 0, 0.24); noise(0.4, 600, 0.4, 0.2, 'lowpass'); },
  trade() { arp([587, 740, 880], 0.08, 'sine', 0.08); },
  notify() { tone(988, 0.1, 'sine', 0.08); tone(1319, 0.16, 'sine', 0.07, 0, 0.1); },
  bankrupt() { tone(420, 1.0, 'sawtooth', 0.09, -340); noise(0.8, 300, 0.3, 0.2, 'lowpass'); },
  turn() { tone(988, 0.1, 'sine', 0.07); tone(1319, 0.14, 'sine', 0.06, 0, 0.08); },
  tick() { tone(1500, 0.03, 'square', 0.03); },
  bad() { tone(200, 0.15, 'sawtooth', 0.05); },
  click() { tone(660, 0.04, 'triangle', 0.05); },
  win() { arp([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.12, 'triangle', 0.1); [0.4, 0.9, 1.4].forEach(t => noise(0.5, 3000, 0.15, t, 'highpass')); },
};

// ---------- nhạc nền: điệu ngũ cung vui, dựng sẵn thành vòng lặp ----------
let mBuf = null, mSrc = null;
const NOTE = n => 261.63 * Math.pow(2, n / 12);
// C – Am – F – G, giai điệu ngũ cung (Đô Rê Mi Son La)
const CHORDS = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]];
const MEL = [12, 14, 16, 19, 16, 14, 12, 9, 9, 12, 14, 16, 14, 12, 9, 7, 5, 9, 12, 14, 12, 9, 7, 9, 7, 11, 14, 16, 19, 16, 14, 12];
function mtone(c, f, d, type, g, t) {
  const o = c.createOscillator(); o.type = type; o.frequency.value = f; const gn = c.createGain();
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.015); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(c.destination); o.start(t); o.stop(t + d + 0.05);
}
async function renderMusic(a) {
  if (mBuf) return mBuf;
  const sr = a.sampleRate, beat = 60 / 116 / 2, bars = 8, L = Math.round(bars * 8 * beat * sr), tail = Math.round(sr);
  const off = new OfflineAudioContext(2, L + tail, sr);
  const nb = off.createBuffer(1, Math.floor(sr * 0.05), sr), nx = nb.getChannelData(0); for (let i = 0; i < nx.length; i++) nx[i] = (Math.random() * 2 - 1) * (1 - i / nx.length);
  for (let b = 0; b < bars; b++) {
    const ch = CHORDS[b % 4], t0 = b * 8 * beat;
    for (let i = 0; i < 8; i++) {
      const t = t0 + i * beat;
      if (i % 4 === 0) mtone(off, NOTE(ch[0] - 24), beat * 1.8, 'triangle', 0.32, t);
      if (i % 4 === 2) mtone(off, NOTE(ch[0] - 17), beat * 1.2, 'triangle', 0.2, t);
      if (i % 2 === 1) for (const n of ch) mtone(off, NOTE(n), beat * 0.6, 'square', 0.018, t);
      const m = MEL[((b % 4) * 8 + i) % 32];
      if ((i % 2 === 0) || (b + i) % 3 === 0) mtone(off, NOTE(m), beat * (i % 2 ? 0.8 : 1.4), 'sine', 0.09, t);
      const s = off.createBufferSource(); s.buffer = nb; const f = off.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = off.createGain(); g.gain.value = i % 2 ? 0.05 : 0.09; s.connect(f); f.connect(g); g.connect(off.destination); s.start(t);
    }
  }
  const r = await off.startRendering(); const out = a.createBuffer(2, L, sr);
  for (let c = 0; c < 2; c++) { const d = r.getChannelData(c), o = out.getChannelData(c); o.set(d.subarray(0, L)); for (let i = 0; i < tail; i++) o[i] += d[L + i]; }
  return (mBuf = out);
}
export async function musicStart() {
  const a = actx(); if (!a || mSrc) return;
  mSrc = true; const buf = await renderMusic(a); if (mSrc !== true || !settings.musicOn) { if (mSrc === true) mSrc = null; return; }
  mSrc = a.createBufferSource(); mSrc.buffer = buf; mSrc.loop = true; mSrc.connect(musicBus); mSrc.start();
}
export function musicStop() { if (mSrc && mSrc !== true) try { mSrc.stop(); } catch (e) {} mSrc = null; }
export function musicToggle(on = !settings.musicOn) { settings.musicOn = on; saveSettings(); on ? musicStart() : musicStop(); return on; }
export function musicResumeIfOn() { if (settings.musicOn) musicStart(); }
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (ac && !document.hidden && ac.state !== 'running') ac.resume(); });

// ---------- hiệu ứng DOM ----------
function layer() { let l = document.getElementById('fx-layer'); if (!l) { l = document.createElement('div'); l.id = 'fx-layer'; document.body.appendChild(l); } return l; }
export function confetti(n = 120) {
  if (!settings.effects) return; n = Math.min(n, matchMedia('(max-width: 700px)').matches ? 45 : 70); // ít mảnh hơn cho máy yếu đỡ giật
  const cols = ['#ff5a5f', '#ffd54a', '#2fc76f', '#3d8bff', '#ff7ac8', '#a259ff'];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i'); d.className = 'confetti'; d.style.background = cols[i % cols.length];
    d.style.left = Math.random() * 100 + 'vw'; d.style.animationDelay = Math.random() * 700 + 'ms';
    d.style.animationDuration = 1800 + Math.random() * 1700 + 'ms'; d.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    layer().appendChild(d); setTimeout(() => d.remove(), 4400);
  }
}
const bq = []; let busy = false;
export function banner(text, cls = '') { bq.push([text, cls]); if (bq.length > 3) bq.splice(0, bq.length - 3); if (!busy) nextB(); }
function nextB() {
  const it = bq.shift(); if (!it) { busy = false; return; } busy = true;
  const n = document.createElement('div'); n.className = 'banner ' + it[1]; n.textContent = it[0]; layer().appendChild(n);
  const ms = 1250 * S(); n.style.animationDuration = ms + 'ms';
  setTimeout(() => { n.remove(); nextB(); }, ms - 80);
}
export function shakeEl(el) { if (!el || !settings.effects) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 600); }
