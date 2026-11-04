// Âm thanh tổng hợp WebAudio + hiệu ứng DOM cho Poker (không dùng file âm thanh)
import { createBGM, sfxVolStore } from '../../shared/audio/bgm.js?v=2';
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

let ac = null, sfxBus = null;
const sv = sfxVolStore('poker');
function out(a) { if (!sfxBus || sfxBus.context !== a) { sfxBus = a.createGain(); sfxBus.gain.value = sv.get(); sfxBus.connect(a.destination); } return sfxBus; }
export function sfxVolume(v) { if (v == null) return sv.get(); sv.set(v); if (sfxBus) sfxBus.gain.value = v; return v; }
export function actx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume().catch(() => {}); return ac; }
function tone(f, d, type = 'sine', g = 0.12, slide = 0, at = 0) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.008); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(out(a)); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, freq, g, at = 0, type = 'bandpass', q = 1) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * d)), a.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 2);
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const gn = a.createGain(); gn.gain.value = g; s.connect(f); f.connect(gn); gn.connect(out(a)); s.start(t);
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

// ---------- nhạc nền: shared/audio/bgm.js (sảnh / đang chơi / gay cấn), mặc định BẬT, nhớ lựa chọn tắt ----------
const bgm = createBGM({ game: 'poker', ctx: actx, legacy: ls.get('poker-music'), volKey: 'poker-music-vol' });
export const musicIsOn = () => bgm.isOn();
export function musicToggle(v) { return bgm.toggle(v); }
export function musicVolume(v) { return bgm.volume(v); }
export function musicStart() { bgm.start(); }
export function musicStop() { bgm.stop(); }
export function musicResumeIfOn() { bgm.resumeIfOn(); }
export const musicMood = m => bgm.mood(m);
export const musicStinger = k => bgm.stinger(k);
