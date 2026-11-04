// Âm thanh tự tổng hợp (WebAudio) + hiệu ứng DOM + cài đặt người dùng. Không dùng file nhạc nào.
import { createBGM } from '../../shared/audio/bgm.js?v=2';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const DEF = { music: 0.45, sfx: 0.8, quality: coarse || (typeof innerWidth !== 'undefined' && innerWidth < 700) ? 'med' : 'high', effects: !reduced, speed: 'normal', musicOn: false };
export const settings = (() => { try { return { ...DEF, ...JSON.parse(ls.get('cangua-settings') || '{}') }; } catch (e) { return { ...DEF }; } })();
export function saveSettings() { ls.set('cangua-settings', JSON.stringify(settings)); }
export const SPEEDS = { slow: 1.45, normal: 1, fast: 0.6 };
export const S = () => (SPEEDS[settings.speed] || 1) * (reduced ? 0.7 : 1);

// ---------- WebAudio ----------
let ac = null, sfxBus = null, musicBus = null;
export function actx() {
  if (typeof window === 'undefined') return null;
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } sfxBus = ac.createGain(); sfxBus.connect(ac.destination); musicBus = ac.createGain(); musicBus.connect(ac.destination); applyVolumes(); }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
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
// tiếng ngựa hí: dao động tần số nhanh
function neigh(at = 0) {
  const a = actx(); if (!a || !settings.sfx) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = 'sawtooth'; const lfo = a.createOscillator(); lfo.frequency.value = 22; const lg = a.createGain(); lg.gain.value = 60; lfo.connect(lg); lg.connect(o.frequency);
  o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(1300, t + 0.15); o.frequency.exponentialRampToValueAtTime(500, t + 0.65);
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 2;
  const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); lfo.start(t); o.stop(t + 0.75); lfo.stop(t + 0.75);
}
const arp = (notes, step = 0.07, type = 'triangle', g = 0.1) => notes.forEach((f, i) => tone(f, 0.2, type, g, 0, i * step));
export const sfx = {
  lose() { [523, 494, 466, 392].forEach((f, k) => tone(f, k === 3 ? 0.5 : 0.2, 'triangle', 0.08, k === 3 ? -60 : 0, k * 0.22)); },
  dice() { for (let i = 0; i < 10; i++) noise(0.045, 1400 + Math.random() * 2600, 0.4, i * 0.08 + Math.random() * 0.04); },
  hop() { noise(0.05, 700 + Math.random() * 300, 0.35); tone(320 + Math.random() * 60, 0.06, 'triangle', 0.05, 120); }, // lộc cộc
  out() { neigh(); arp([523, 659, 784], 0.08, 'square', 0.04); },
  kick() { tone(180, 0.12, 'square', 0.12, -80); noise(0.12, 300, 0.7, 0, 'lowpass'); tone(500, 0.55, 'sine', 0.09, 900, 0.1); noise(0.5, 2500, 0.15, 0.12, 'highpass'); },
  ouch() { tone(420, 0.5, 'sawtooth', 0.07, -300); neigh(0.1); },
  home() { arp([659, 784, 988, 1319], 0.07, 'triangle', 0.09); },
  six() { arp([784, 988, 1175], 0.06, 'sine', 0.08); },
  nomove() { tone(300, 0.16, 'triangle', 0.08, -60); tone(240, 0.22, 'triangle', 0.08, -60, 0.14); },
  turn() { tone(988, 0.1, 'sine', 0.07); tone(1319, 0.14, 'sine', 0.06, 0, 0.08); },
  tick() { tone(1500, 0.03, 'square', 0.03); },
  bad() { tone(200, 0.15, 'sawtooth', 0.05); },
  click() { tone(660, 0.04, 'triangle', 0.05); },
  notify() { tone(988, 0.1, 'sine', 0.08); tone(1319, 0.16, 'sine', 0.07, 0, 0.1); },
  win() { arp([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.12, 'triangle', 0.1); [0.4, 0.9, 1.4].forEach(t => noise(0.5, 3000, 0.15, t, 'highpass')); neigh(1.1); },
};

// ---------- nhạc nền: shared/audio/bgm.js (sảnh / đang chơi / gay cấn), mặc định BẬT, nhớ lựa chọn tắt ----------
// (settings.musicOn cũ mặc định false nên không coi là "người dùng đã tắt"; khoá mới bgvn-music-cangua)
const bgm = createBGM({ game: 'cangua', ctx: actx, dest: () => musicBus, legacy: () => (settings.musicOn === true ? '1' : null), volDefault: 1, gain: 1.3 });
settings.musicOn = bgm.isOn();
export const musicIsOn = () => bgm.isOn();
export function musicToggle(on = !bgm.isOn()) { settings.musicOn = bgm.toggle(on); return settings.musicOn; }
export function musicStart() { bgm.start(); }
export function musicStop() { bgm.stop(); }
export function musicResumeIfOn() { bgm.resumeIfOn(); }
export const musicMood = m => bgm.mood(m);
export const musicStinger = k => bgm.stinger(k);

// ---------- hiệu ứng DOM ----------
function layer() { let l = document.getElementById('fx-layer'); if (!l) { l = document.createElement('div'); l.id = 'fx-layer'; document.body.appendChild(l); } return l; }
export function confetti(n = 120) {
  if (!settings.effects) return; n = Math.min(n, matchMedia('(max-width: 700px)').matches ? 45 : 70);
  const cols = ['#e53935', '#1e88e5', '#2fb350', '#f4b400', '#ff7ac8', '#ffffff'];
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
  const ms = 1300 * S(); n.style.animationDuration = ms + 'ms';
  setTimeout(() => { n.remove(); nextB(); }, ms - 80);
}
export function shakeEl(el) { if (!el || !settings.effects) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 600); }
