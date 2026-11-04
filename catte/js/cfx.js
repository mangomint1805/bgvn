// Âm thanh tổng hợp (WebAudio) + hiệu ứng DOM cho Cát tê. Không dùng file âm thanh nào.
import { createBGM, sfxVolStore } from '../../shared/audio/bgm.js?v=2';
export const SPEEDS = { slow: { k: 1.4, name: 'Chậm' }, normal: { k: 1, name: 'Vừa' }, fast: { k: 0.65, name: 'Nhanh' } };
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
let speedKey = SPEEDS[ls.get('catte-speed')] ? ls.get('catte-speed') : 'normal';
export const S = () => SPEEDS[speedKey].k;
export const getSpeed = () => speedKey;
export function setSpeed(k) { if (SPEEDS[k]) { speedKey = k; ls.set('catte-speed', k); } }
export const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

let muted = ls.get('catte-mute') === '1';
export const isMuted = () => muted;
export function toggleMute() { muted = !muted; ls.set('catte-mute', muted ? '1' : '0'); return muted; }

let ac = null, master = null;
const sv = sfxVolStore('catte');
export function sfxVolume(v) { if (v == null) return sv.get(); sv.set(v); if (master) master.gain.value = 0.9 * v; return v; }
export function actx() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.9 * sv.get(); master.connect(ac.destination); } catch (e) { return null; } }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}
function tone(f, d, type = 'sine', g = 0.12, slide = 0, at = 0) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(25, f + slide), t + d);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(master); o.start(t); o.stop(t + d + 0.03);
}
function noise(d, freq, g, at = 0, type = 'bandpass', q = 1) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * d)), a.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 1.5);
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const gn = a.createGain(); gn.gain.value = g; s.connect(f); f.connect(gn); gn.connect(master); s.start(t);
}
const arp = (notes, step = 0.07, type = 'triangle', g = 0.1, d = 0.2) => notes.forEach((f, i) => tone(f, d, type, g, 0, i * step));
export const sfx = {
  flip() { noise(0.06, 3200, 0.3); },
  play() { noise(0.05, 2600, 0.45, 0, 'bandpass', 2); tone(620, 0.06, 'triangle', 0.05, 120); },
  beat() { noise(0.05, 3400, 0.55, 0, 'bandpass', 3); tone(520, 0.09, 'square', 0.05, 260); tone(880, 0.12, 'triangle', 0.05, 0, 0.05); },
  fold() { noise(0.18, 900, 0.25, 0, 'lowpass'); tone(300, 0.14, 'sine', 0.04, -120); },
  trick() { arp([784, 988, 1175], 0.06, 'triangle', 0.07, 0.18); },
  myTrick() { arp([659, 880, 1109, 1319], 0.07, 'triangle', 0.09, 0.22); },
  dead() { [392, 370, 349, 262].forEach((f, i) => tone(f, i === 3 ? 0.6 : 0.24, 'sawtooth', 0.06, i === 3 ? -60 : 0, i * 0.24)); },
  drum(dur = 1.2) { const n = Math.round(dur / 0.045); for (let i = 0; i < n; i++) noise(0.04, 180 + (i % 2) * 40, 0.25 + 0.4 * i / n, i * 0.045, 'lowpass'); },
  reveal() { noise(0.25, 160, 0.9, 0, 'lowpass'); tone(110, 0.3, 'sine', 0.2, -50); noise(0.05, 4000, 0.3, 0.01); },
  hit() { noise(0.3, 120, 1, 0, 'lowpass'); tone(90, 0.4, 'sine', 0.25, -40); arp([523, 659, 784], 0.04, 'square', 0.04, 0.12); },
  showdown() { tone(220, 0.5, 'sawtooth', 0.05, 220); tone(330, 0.5, 'sawtooth', 0.04, 330, 0.08); noise(0.4, 600, 0.3, 0.3, 'lowpass'); },
  toi() { arp([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.09, 'triangle', 0.1, 0.24); },
  lose() { tone(330, 0.3, 'triangle', 0.07, -80); tone(247, 0.5, 'triangle', 0.07, -60, 0.26); },
  white() { tone(130, 1.6, 'sine', 0.22, -10); tone(196, 1.6, 'sine', 0.1, 0, 0.02); arp([523, 784, 1047, 1568], 0.12, 'triangle', 0.08, 0.5); },
  chips(n = 6) { for (let i = 0; i < n; i++) { tone(2400 + Math.random() * 900, 0.05, 'square', 0.025, 0, i * 0.06 + Math.random() * 0.02); noise(0.03, 5000, 0.18, i * 0.06); } },
  turn() { tone(988, 0.1, 'sine', 0.07); tone(1319, 0.14, 'sine', 0.06, 0, 0.08); },
  bad() { tone(200, 0.15, 'sawtooth', 0.05); },
  tick() { tone(1500, 0.04, 'square', 0.03); },
  shuffle() { for (let i = 0; i < 9; i++) noise(0.05, 2500 + i * 100, 0.22, i * 0.045); },
  pick() { tone(700, 0.08, 'sine', 0.06, 200); noise(0.08, 1200, 0.2, 0.02, 'lowpass'); },
};

// ---------- hiệu ứng DOM ----------
function layer() { let l = document.getElementById('fx-layer'); if (!l) { l = document.createElement('div'); l.id = 'fx-layer'; document.body.appendChild(l); } return l; }
export const ctr = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
export function fly(html, fromEl, toEl, { delay = 0, duration = 460, rotate = 0, scale = 1, onEnd, cls = '' } = {}) {
  if (!fromEl || !toEl || !fromEl.isConnected || !toEl.isConnected) { onEnd && onEnd(); return; }
  duration *= S(); delay *= S();
  const a = ctr(fromEl), b = ctr(toEl);
  const n = document.createElement('div'); n.className = 'flyer ' + cls; n.innerHTML = html; layer().appendChild(n);
  const w = n.offsetWidth || 50, h = n.offsetHeight || 70;
  n.style.transform = `translate(${a.x - w / 2}px,${a.y - h / 2}px) scale(.8)`; n.style.opacity = '0';
  setTimeout(() => {
    n.style.transition = `transform ${duration}ms cubic-bezier(.2,.9,.3,1.1), opacity 140ms`; n.style.opacity = '1';
    n.style.transform = `translate(${b.x - w / 2}px,${b.y - h / 2}px) scale(${scale}) rotate(${rotate}deg)`;
    setTimeout(() => { n.remove(); onEnd && onEnd(); }, duration + 30);
  }, delay);
}
export function floatText(el, text, cls = '') {
  if (!el || !el.isConnected) return; const c = ctr(el);
  const n = document.createElement('div'); n.className = 'float-text ' + cls; n.textContent = text;
  layer().appendChild(n); const w = n.offsetWidth;
  n.style.left = Math.max(6 + w / 2, Math.min(innerWidth - 6 - w / 2, c.x)) + 'px'; n.style.top = c.y + 'px'; setTimeout(() => n.remove(), 1500 * S());
}
export function pop(el, cls = 'pop') { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 800 * S()); }
export const shake = el => pop(el, 'shake');
const COLS = ['#ffd23f', '#ff5d8f', '#2fbf71', '#3a86ff', '#ff8a00', '#8e5cf7'];
export function burst(el, n = 22, dist = 90) {
  if (!el) return; const c = ctr(el);
  for (let i = 0; i < (reduced() ? 6 : n); i++) {
    const d = document.createElement('i'); d.className = 'spark'; d.style.background = COLS[i % COLS.length];
    const ang = Math.random() * Math.PI * 2, r = dist * (0.5 + Math.random() * 0.7);
    d.style.left = c.x + 'px'; d.style.top = c.y + 'px';
    d.style.setProperty('--dx', Math.cos(ang) * r + 'px'); d.style.setProperty('--dy', Math.sin(ang) * r + 'px');
    d.style.animationDuration = 700 * S() + 'ms'; layer().appendChild(d); setTimeout(() => d.remove(), 800 * S());
  }
}
export function confetti() {
  for (let i = 0; i < (reduced() ? 20 : 110); i++) {
    const d = document.createElement('i'); d.className = 'confetti'; d.style.background = COLS[i % COLS.length];
    d.style.left = Math.random() * 100 + 'vw'; d.style.animationDelay = Math.random() * 600 + 'ms';
    d.style.animationDuration = 1800 + Math.random() * 1600 + 'ms'; d.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    layer().appendChild(d); setTimeout(() => d.remove(), 4200);
  }
}
// chip bay từ ghế này sang ghế kia
export function chipsFly(fromEl, toEl, n = 6, delay = 0) {
  for (let i = 0; i < n; i++) fly('<i class="chip-coin"></i>', fromEl, toEl, { delay: delay + i * 70, duration: 520 + i * 20 });
}
const bq = []; let busy = false;
export const bannerBusy = () => busy;
export function banner(text, cls = '', ms = 1200) { bq.push([text, cls, ms]); if (bq.length > 3) bq.splice(0, bq.length - 3); if (!busy) nextB(); }
function nextB() {
  const it = bq.shift(); if (!it) { busy = false; return; } busy = true;
  const n = document.createElement('div'); n.className = 'banner ' + it[1]; n.innerHTML = it[0]; layer().appendChild(n);
  n.style.animationDuration = it[2] * S() + 'ms';
  setTimeout(() => { n.remove(); nextB(); }, it[2] * S() - 60);
}

// ---------- nhạc nền: shared/audio/bgm.js (sảnh / đang chơi / gay cấn), mặc định BẬT, nhớ lựa chọn tắt ----------
const bgm = createBGM({ game: 'catte', ctx: actx, legacy: ls.get('catte-music'), volKey: 'catte-music-vol' });
export const musicIsOn = () => bgm.isOn();
export function musicToggle(v) { return bgm.toggle(v); }
export function musicVolume(v) { return bgm.volume(v); }
export function musicStart() { bgm.start(); }
export function musicStop() { bgm.stop(); }
export function musicResumeIfOn() { bgm.resumeIfOn(); }
export const musicMood = m => bgm.mood(m);
export const musicStinger = k => bgm.stinger(k);
