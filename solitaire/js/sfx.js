// Âm thanh tổng hợp WebAudio + nhạc nền chill (không dùng file âm thanh). Nhạc sống sót khi đổi tab (revive).
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
let muted = ls.get('sol-mute') === '1';
export const isMuted = () => muted;
export function toggleMute() { muted = !muted; ls.set('sol-mute', muted ? '1' : '0'); return muted; }

let ac = null;
export function actx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume().catch(() => {}); return ac; }
function tone(f, d, type = 'sine', g = 0.1, slide = 0, at = 0) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, freq, g, at = 0, type = 'bandpass') {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * d)), a.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const gn = a.createGain(); gn.gain.value = g; s.connect(f); f.connect(gn); gn.connect(a.destination); s.start(t);
}
const arp = (notes, step = 0.07, type = 'triangle', g = 0.08) => notes.forEach((f, i) => tone(f, 0.2, type, g, 0, i * step));
export const sfx = {
  place() { noise(0.05, 2800, 0.28); tone(520, 0.05, 'sine', 0.03, 120); },
  flip() { noise(0.07, 3600, 0.2); tone(900, 0.05, 'sine', 0.025, 300, 0.02); },
  deal() { for (let i = 0; i < 4; i++) noise(0.04, 2400 + i * 200, 0.2, i * 0.045); },
  found() { tone(784, 0.09, 'triangle', 0.06); tone(1175, 0.12, 'triangle', 0.05, 0, 0.06); },
  run() { arp([523, 659, 784, 1047, 1319], 0.06, 'sine', 0.07); },
  bad() { tone(190, 0.14, 'sawtooth', 0.04, -40); },
  undo() { tone(700, 0.1, 'sine', 0.04, -300); },
  hint() { tone(1319, 0.08, 'sine', 0.05); tone(1568, 0.1, 'sine', 0.04, 0, 0.08); },
  select() { tone(1040, 0.04, 'sine', 0.03); },
  win() { arp([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.1, 'triangle', 0.09); },
  bounce() { tone(300 + Math.random() * 300, 0.05, 'sine', 0.02); },
};

// ---------- nhạc nền: vòng hợp âm chill (dựng sẵn thành buffer lặp) ----------
let musicOn = ls.get('sol-music') !== '0', mGain = null, mBuf = null, mSrc = null;
const PROG = [[174.6, 220, 261.6, 329.6], [164.8, 196, 246.9, 293.7], [146.8, 174.6, 220, 261.6], [130.8, 164.8, 196, 246.9]]; // Fmaj7 Em7 Dm7 Cmaj7
const MEL = [7, -1, 9, 7, 4, -1, 2, 4, 5, -1, 4, 2, 0, -1, 2, -1];
const SCALE = [523.3, 587.3, 659.3, 698.5, 784, 880, 987.8, 1046.5, 1174.7, 1318.5];
function mtone(c, dest, f, d, type, g, t) {
  const o = c.createOscillator(); o.type = type; o.frequency.value = f; const gn = c.createGain();
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.04); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(dest); o.start(t); o.stop(t + d + 0.05);
}
async function renderMusic(a) {
  if (mBuf) return mBuf;
  const sr = a.sampleRate, bt = 0.34, L = Math.round(4 * 8 * bt * sr), tail = Math.round(sr * 1.5);
  const off = new OfflineAudioContext(2, L + tail, sr), dest = off.destination;
  for (let k = 0; k < 4; k++) {
    const ch = PROG[k], base = k * 8 * bt;
    mtone(off, dest, ch[0] / 2, 8 * bt, 'sine', 0.22, base);
    ch.forEach((f, j) => mtone(off, dest, f, 2.4, 'triangle', 0.035, base + j * 0.05));
    ch.forEach((f, j) => mtone(off, dest, f, 1.6, 'triangle', 0.025, base + 4 * bt + j * 0.05));
    for (let i = 0; i < 8; i++) { const m = MEL[(k * 8 + i) % 16]; if (m >= 0 && (k + i) % 3 !== 2) mtone(off, dest, SCALE[m], 0.5, 'sine', 0.05, base + i * bt); }
  }
  const r = await off.startRendering(), out = a.createBuffer(2, L, sr);
  for (let c = 0; c < 2; c++) { const d = r.getChannelData(c), o = out.getChannelData(c); o.set(d.subarray(0, L)); for (let i = 0; i < tail; i++) o[i] += d[L + i]; }
  return (mBuf = out);
}
export async function musicStart() {
  const a = actx(); if (!a || mSrc) return;
  if (!mGain) { mGain = a.createGain(); mGain.connect(a.destination); } mGain.gain.value = 0.22;
  mSrc = true; const buf = await renderMusic(a); if (mSrc !== true || !musicOn) { if (mSrc === true) mSrc = null; return; }
  mSrc = a.createBufferSource(); mSrc.buffer = buf; mSrc.loop = true; mSrc.connect(mGain); mSrc.start();
  const me = mSrc; me.onended = () => { if (mSrc === me) mSrc = null; };
}
export function musicStop() { if (mSrc && mSrc !== true) try { mSrc.stop(); } catch (e) {} mSrc = null; }
// đổi tab / khoá màn hình rồi quay lại: bật lại âm thanh (chờ lần chạm kế tiếp nếu trình duyệt đòi)
function revive() {
  if (document.hidden || !ac) return;
  const go = () => { if (ac.state !== 'running') ac.resume().catch(() => {}); if (musicOn && !mSrc) musicStart(); };
  go();
  if (ac.state !== 'running') { const once = () => { go(); removeEventListener('pointerdown', once, true); removeEventListener('keydown', once, true); }; addEventListener('pointerdown', once, true); addEventListener('keydown', once, true); }
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', revive); addEventListener('focus', revive); addEventListener('pageshow', revive);
  setInterval(() => { if (ac && !document.hidden && ac.state === 'running' && musicOn && !mSrc) musicStart(); }, 4000);
}
export const musicIsOn = () => musicOn;
export function musicToggle() { musicOn = !musicOn; ls.set('sol-music', musicOn ? '1' : '0'); musicOn ? musicStart() : musicStop(); return musicOn; }
export function musicResumeIfOn() { if (musicOn) musicStart(); }
