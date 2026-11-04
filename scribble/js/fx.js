// Âm thanh tổng hợp WebAudio (không file nhạc), nhạc nền lofi tự sáng tác, hiệu ứng DOM.
import { createBGM, sfxVolStore } from '../../shared/audio/bgm.js?v=2';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
export const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

let muted = ls.get('scribble-mute') === '1';
export const isMuted = () => muted;
export function toggleMute() { muted = !muted; ls.set('scribble-mute', muted ? '1' : '0'); return muted; }
let ac = null, sfxBus = null;
const sv = sfxVolStore('scribble');
function out(a) { if (!sfxBus || sfxBus.context !== a) { sfxBus = a.createGain(); sfxBus.gain.value = sv.get(); sfxBus.connect(a.destination); } return sfxBus; }
export function sfxVolume(v) { if (v == null) return sv.get(); sv.set(v); if (sfxBus) sfxBus.gain.value = v; return v; }
export function actx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume(); return ac; }
function tone(f, d, type = 'sine', g = 0.12, slide = 0, at = 0) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(out(a)); o.start(t); o.stop(t + d + 0.03);
}
function noise(d, freq, g, at = 0, type = 'bandpass') {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * d)), a.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const gn = a.createGain(); gn.gain.value = g; s.connect(f); f.connect(gn); gn.connect(out(a)); s.start(t);
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
  // đổ màu: "bụp" sơn loang
  fill() { tone(260, 0.22, 'sine', 0.12, 420); noise(0.12, 900, 0.2, 0.02, 'lowpass'); },
  // hoàn tác: tiếng tẩy "xoẹt" ngắn
  undo() { noise(0.14, 1500, 0.22); noise(0.1, 2600, 0.12, 0.1); },
  // xoá hết: vò giấy
  crumple() { for (let i = 0; i < 7; i++) noise(0.05 + Math.random() * 0.05, 1200 + Math.random() * 3500, 0.22, i * 0.045); },
  // lật trang sổ
  page() { noise(0.22, 2200, 0.16); noise(0.12, 700, 0.12, 0.08, 'lowpass'); },
};
// Tiếng bút chì cào giấy khi đang vẽ: 1 nguồn nhiễu lặp, âm lượng theo tốc độ tay
let scr = null;
export function scribble(amount, kind = 'pen', vol = 1) {
  const a = actx(); if (!a || muted || a.state !== 'running') return;
  if (!scr) {
    const len = a.sampleRate * 2, b = a.createBuffer(1, len, a.sampleRate), x = b.getChannelData(0);
    for (let i = 0; i < len; i++) x[i] = (Math.random() * 2 - 1) * (Math.random() < 0.3 ? 1 : 0.22); // hạt giấy lạo xạo
    const src = a.createBufferSource(); src.buffer = b; src.loop = true;
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 800;
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8; bp.frequency.value = 3000;
    const g = a.createGain(); g.gain.value = 0;
    src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(out(a)); src.start();
    scr = { g, bp };
  }
  const t = a.currentTime, lvl = Math.min(0.1, 0.01 + amount * 0.002) * vol;
  scr.bp.frequency.setTargetAtTime(kind === 'eraser' ? 1200 + Math.random() * 300 : 2500 + Math.random() * 1800, t, 0.02);
  scr.g.gain.cancelScheduledValues(t); scr.g.gain.setTargetAtTime(lvl, t, 0.01); scr.g.gain.setTargetAtTime(0, t + 0.07, 0.035);
}

// ---------- nhạc nền: shared/audio/bgm.js (sảnh / đang chơi / gay cấn), mặc định BẬT, nhớ lựa chọn tắt ----------
const bgm = createBGM({ game: 'scribble', ctx: actx, legacy: ls.get('scribble-music'), volKey: 'scribble-music-vol' });
export const musicIsOn = () => bgm.isOn();
export function musicToggle(v) { return bgm.toggle(v); }
export function musicVolume(v) { return bgm.volume(v); }
export function musicStart() { bgm.start(); }
export function musicStop() { bgm.stop(); }
export function musicResumeIfOn() { bgm.resumeIfOn(); }
export const musicMood = m => bgm.mood(m);
export const musicStinger = k => bgm.stinger(k);

// ---------- hiệu ứng ----------
function layer() { let l = document.getElementById('fx-layer'); if (!l) { l = document.createElement('div'); l.id = 'fx-layer'; document.body.appendChild(l); } return l; }
const COLS = ['#ef2b3a', '#ffd21f', '#22b852', '#2a63e8', '#e64ec8', '#ff7a1a', '#18c6e0'];
// mẩu giấy xé: giấy note vàng/hồng/xanh, giấy kẻ dòng, giấy kraft
const PAPERS = ['#ffe873', '#ffb8d2', '#b9f0c6', '#bfe1ff', '#ffd2a8', 'lined', 'grid', '#e9c99a', '#ffffff'];
function scrap(cls) {
  const d = document.createElement('i'); d.className = cls;
  const pp = PAPERS[Math.floor(Math.random() * PAPERS.length)];
  if (pp === 'lined') d.classList.add('lined'); else if (pp === 'grid') d.classList.add('grid'); else d.style.background = pp;
  const r = () => Math.round(Math.random() * 22); // mép xé ngẫu nhiên
  d.style.clipPath = `polygon(${r()}% 0,${50 + r()}% ${r() / 3}%,100% ${r()}%,${100 - r() / 2}% ${50 + r()}%,100% 100%,${50 - r()}% ${100 - r() / 3}%,0 100%,${r() / 2}% ${50 - r()}%)`;
  return d;
}
export function burst(el, n = 24) {
  if (!el || reduced()) return; const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const d = scrap('spark');
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
    ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'round';
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.y += r.vy; ctx.fillStyle = r.col; ctx.fillRect(r.x - 1.5, r.y, 3, 7);
      if (r.y <= r.ty) { rockets.splice(i, 1); sfx.boom(); for (let k = 0; k < 60; k++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4.5; parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col: Math.random() < 0.2 ? '#1f2340' : r.col }); } }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.vx *= 0.985; p.life -= 0.014;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life * 1.4); ctx.strokeStyle = p.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.globalAlpha = 1; // nét bút sáp
    }
    if (el < ms || parts.length) requestAnimationFrame(frame); else c.remove();
  }
  requestAnimationFrame(frame);
}
export function confetti(n = 80) {
  if (reduced()) return;
  for (let i = 0; i < n; i++) {
    const d = scrap('confetti'), w = 10 + Math.random() * 14;
    d.style.width = w + 'px'; d.style.height = w * (0.6 + Math.random() * 0.6) + 'px';
    d.style.left = Math.random() * 100 + 'vw'; d.style.animationDelay = Math.random() * 500 + 'ms';
    d.style.animationDuration = 2400 + Math.random() * 1800 + 'ms';
    d.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg'); d.style.setProperty('--sw', (Math.random() * 80 - 40) + 'px');
    layer().appendChild(d); setTimeout(() => d.remove(), 5000);
  }
}
