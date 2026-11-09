// Hiệu ứng + âm thanh tổng hợp cho Ba Cào (WebAudio, không dùng file âm thanh)
// Nhạc nền: dùng trình phát chung shared/audio/bgm.js. Chủ đề "Hội chợ cha-cha" của Ba Cào được soạn NGAY TRONG FILE NÀY
// (thêm vào bảng THEMES lúc chạy, không sửa file dùng chung): sảnh bolero êm · đang chơi cha-cha hội chợ · lật bài thì gay cấn.
import { createBGM, sfxVolStore } from '../../shared/audio/bgm.js?v=2';
import { THEMES } from '../../shared/audio/themes.js?v=2';

const MAJ = [0, 2, 4, 5, 7, 9, 11], HARM = [0, 2, 3, 5, 7, 8, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
const s7 = d => ({ d, s7: true });
const drums = (pat, o = {}) => ({ type: 'drums', pat, ...o });
const lead = (inst, o = {}) => ({ type: 'lead', inst, ...o });
const bass = (inst, pattern, o = {}) => ({ type: 'bass', inst, pattern, ...o });
const comp = (inst, pattern, o = {}) => ({ type: 'comp', inst, pattern, ...o });
export const BACAO_THEME = {
  key: 60,
  // sảnh: bolero đêm hội chợ – ghi-ta nylon + phong cầm
  lobby: { bpm: 86, bars: 8, key: 57, scale: MIN, prog: [0, 3, 6, 4, 0, 5, 3, 4], seed: 81, rev: 0.5, parts: [
    lead('accordion', { lo: 64, hi: 81, density: 0.38, vel: 0.36, maxLen: 3 }),
    comp('nylon', 'bossa', { oct: 55, vel: 0.22 }),
    bass('upright', 'bossa', { oct: 40, vel: 0.34 }),
    drums({ rim: 'x..x..x...x.....', shaker: 'x.x.x.x.x.x.x.x.' }, { vel: 0.2, gains: { shaker: 0.4 } }),
  ] },
  // đang chơi: cha-cha hội chợ – organ nhún nhảy, mõ chuông, conga
  game: { bpm: 118, bars: 16, key: 60, scale: MAJ, prog: [s7(0), s7(5), s7(1), s7(4), s7(0), s7(3), s7(4), s7(0)], seed: 93, rev: 0.32, parts: [
    lead('accordion', { lo: 67, hi: 86, density: 0.56, vel: 0.34, form: 'AABA', lift: true }),
    lead('vibes', { lo: 76, hi: 91, density: 0.26, vel: 0.18, form: 'ABAC', from: 4, pan: 0.4 }),
    comp('organ', 'offbeat', { oct: 57, vel: 0.14, pan: -0.25 }),
    bass('bass', 'root5', { oct: 40, vel: 0.34 }),
    drums({ kick: 'x.......x.......', cowbell: 'x...x...x.x.x...', 'conga:300': '..x..x.x..x..xx.', shaker: 'x.x.x.x.x.x.x.x.', rim: '....x.......x...' },
      { vel: 0.3, gains: { cowbell: 0.32, shaker: 0.35 }, fill: { 'tom:180': '........x.x.xxxx' } }),
  ] },
  // lật bài: trống dồn + đàn dây rung
  tense: { bpm: 138, bars: 8, key: 57, scale: HARM, prog: [0, 0, 5, 4, 0, 3, 4, 4], seed: 64, rev: 0.28, parts: [
    lead('brass', { lo: 64, hi: 81, density: 0.5, vel: 0.26 }),
    comp('trem', 'trem', { oct: 52, vel: 0.13 }),
    bass('synthbass', '8th', { oct: 38, vel: 0.36 }),
    drums({ 'taiko:70': 'x..x..x.x..x..x.', snare: '....x.......x.xx', hat: 'x.x.x.x.x.x.x.x.', 'tom:150': '............xxxx' }, { vel: 0.34, gains: { hat: 0.3 } }),
  ] },
};
if (!THEMES.bacao) THEMES.bacao = BACAO_THEME;

export const SPEEDS = { slow: { k: 1.5, name: 'Chậm' }, normal: { k: 1, name: 'Vừa' }, fast: { k: 0.6, name: 'Nhanh' } };
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
let speedKey = SPEEDS[ls.get('bc-speed')] ? ls.get('bc-speed') : 'normal';
export const S = () => SPEEDS[speedKey].k;
export const getSpeed = () => speedKey;
export function setSpeed(k) { if (SPEEDS[k]) { speedKey = k; ls.set('bc-speed', k); } }
export const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

let muted = ls.get('bc-mute') === '1';
export const isMuted = () => muted;
export function toggleMute() { muted = !muted; ls.set('bc-mute', muted ? '1' : '0'); return muted; }

let ac = null, sfxBus = null;
const sv = sfxVolStore('bacao');
function out(a) { if (!sfxBus || sfxBus.context !== a) { sfxBus = a.createGain(); sfxBus.gain.value = sv.get(); sfxBus.connect(a.destination); } return sfxBus; }
export function actx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume().catch(() => {}); return ac; }
function tone(f, d, type = 'sine', g = 0.12, slide = 0, at = 0) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(out(a)); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, freq, g, at = 0, type = 'bandpass') {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * d)), a.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const gn = a.createGain(); gn.gain.value = g; s.connect(f); f.connect(gn); gn.connect(out(a)); s.start(t);
}
const arp = (notes, step = 0.07, type = 'triangle', g = 0.1) => notes.forEach((f, i) => tone(f, 0.2, type, g, 0, i * step));
let peelT = 0;
export const sfx = {
  tick() { tone(1500, 0.05, 'square', 0.035); noise(0.03, 4000, 0.12); },
  deal() { noise(0.06, 3200, 0.3); },
  flip() { noise(0.05, 2400, 0.32); tone(1400, 0.05, 'sine', 0.04, -400); },
  peel() { const n = Date.now(); if (n - peelT < 70) return; peelT = n; noise(0.04, 1800 + Math.random() * 900, 0.12); },
  chip() { tone(2300, 0.05, 'triangle', 0.06); tone(3100, 0.07, 'sine', 0.04, 0, 0.03); noise(0.04, 5000, 0.12); },
  chips() { for (let i = 0; i < 5; i++) tone(2000 + Math.random() * 1400, 0.05, 'triangle', 0.045, 0, i * 0.05); noise(0.2, 4500, 0.15); },
  turn() { tone(880, 0.1, 'sine', 0.07); tone(1175, 0.14, 'sine', 0.06, 0, 0.08); },
  roll() { for (let i = 0; i < 14; i++) noise(0.05, 900 + i * 40, 0.1 + i * 0.02, i * 0.055); tone(98, 0.3, 'sine', 0.12, 0, 0.78); noise(0.25, 3000, 0.25, 0.78, 'highpass'); },
  batay() { arp([523, 659, 784, 1047, 1319, 1568], 0.06, 'square', 0.06); noise(0.3, 6000, 0.12, 0.3); tone(1568, 0.5, 'triangle', 0.06, 0, 0.4); },
  sap() { arp([392, 494, 587, 784, 988, 1175, 1568], 0.05, 'sawtooth', 0.045); noise(0.4, 7000, 0.14, 0.35); },
  nine() { arp([784, 988, 1175], 0.07, 'triangle', 0.08); },
  bu() { tone(392, 0.25, 'sawtooth', 0.05, -20); tone(370, 0.25, 'sawtooth', 0.05, -20, 0.27); tone(349, 0.25, 'sawtooth', 0.05, -20, 0.54); tone(330, 0.7, 'sawtooth', 0.05, -60, 0.81); },
  win() { arp([659, 784, 988, 1319], 0.08, 'triangle', 0.1); this.chips(); },
  lose() { tone(392, 0.2, 'triangle', 0.08); tone(311, 0.22, 'triangle', 0.08, 0, 0.18); tone(233, 0.4, 'triangle', 0.08, -40, 0.36); },
  push() { tone(600, 0.12, 'sine', 0.07); tone(600, 0.12, 'sine', 0.07, 0, 0.16); },
  bad() { tone(200, 0.15, 'sawtooth', 0.05); },
  beg() { arp([784, 698, 659, 587], 0.12, 'sine', 0.08); },
  pip() { tone(1200, 0.06, 'sine', 0.05, 300); },
};

// ---------- hiệu ứng DOM ----------
function layer() { let l = document.getElementById('fx-layer'); if (!l) { l = document.createElement('div'); l.id = 'fx-layer'; document.body.appendChild(l); } return l; }
const ctr = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
export function fly(html, fromEl, toEl, { delay = 0, duration = 420, rotate = 0, onEnd } = {}) {
  if (!fromEl || !toEl || reduced()) { setTimeout(() => onEnd && onEnd(), delay * S()); return; }
  duration *= S(); delay *= S();
  const a = ctr(fromEl), b = ctr(toEl);
  const n = document.createElement('div'); n.className = 'flyer'; n.innerHTML = html; layer().appendChild(n);
  const w = n.offsetWidth || 40, h = n.offsetHeight || 56;
  n.style.transform = `translate(${a.x - w / 2}px,${a.y - h / 2}px) scale(.6)`; n.style.opacity = '0';
  setTimeout(() => {
    n.style.transition = `transform ${duration}ms cubic-bezier(.2,.9,.3,1.1), opacity 120ms`; n.style.opacity = '1';
    n.style.transform = `translate(${b.x - w / 2}px,${b.y - h / 2}px) scale(1) rotate(${rotate}deg)`;
    setTimeout(() => { n.remove(); onEnd && onEnd(); }, duration + 30);
  }, delay);
}
export function floatText(el, text, cls = '') {
  if (!el) return; const c = ctr(el);
  const n = document.createElement('div'); n.className = 'float-text ' + cls; n.textContent = text;
  n.style.left = c.x + 'px'; n.style.top = c.y + 'px'; layer().appendChild(n); setTimeout(() => n.remove(), 1600 * S());
}
export function pop(el, cls = 'pop') { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 800 * S()); }
export function shake(el) { pop(el, 'shake'); }
const COLS = ['#ff4d6d', '#ffb703', '#2ec4b6', '#7b5cff', '#ff8fab', '#06d6a0'];
export function burst(el, n = 22, cols = COLS) {
  if (!el || reduced()) return; const c = ctr(el);
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i'); d.className = 'spark'; d.style.background = cols[i % cols.length];
    const ang = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 80;
    d.style.left = c.x + 'px'; d.style.top = c.y + 'px';
    d.style.setProperty('--dx', Math.cos(ang) * dist + 'px'); d.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
    d.style.animationDuration = 700 * S() + 'ms'; layer().appendChild(d); setTimeout(() => d.remove(), 800 * S());
  }
}
export function confetti(k = 90) {
  if (reduced()) return;
  for (let i = 0; i < k; i++) {
    const d = document.createElement('i'); d.className = 'confetti'; d.style.background = COLS[i % COLS.length];
    d.style.left = Math.random() * 100 + 'vw'; d.style.animationDelay = Math.random() * 500 + 'ms';
    d.style.animationDuration = 1700 + Math.random() * 1500 + 'ms'; d.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    layer().appendChild(d); setTimeout(() => d.remove(), 4000);
  }
}
const bq = []; let busy = false;
export function banner(text, cls = '') { bq.push([text, cls]); if (bq.length > 3) bq.splice(0, bq.length - 3); if (!busy) nextB(); }
function nextB() {
  const it = bq.shift(); if (!it) { busy = false; return; } busy = true;
  const n = document.createElement('div'); n.className = 'banner ' + it[1]; n.textContent = it[0]; layer().appendChild(n);
  n.style.animationDuration = 1500 * S() + 'ms';
  setTimeout(() => { n.remove(); nextB(); }, 1400 * S());
}

// ---------- nhạc nền: mặc định BẬT, nhớ lựa chọn tắt, tự hồi sinh khi đổi tab (bgm.js lo) ----------
const bgm = createBGM({ game: 'bacao', ctx: actx, volKey: 'bc-music-vol' });
export const musicIsOn = () => bgm.isOn();
export function musicToggle(v) { return bgm.toggle(v); }
export function musicResumeIfOn() { bgm.resumeIfOn(); }
export const musicMood = m => bgm.mood(m);
export const musicStinger = k => bgm.stinger(k);
