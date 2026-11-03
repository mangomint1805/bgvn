// Âm thanh tổng hợp (WebAudio) + hiệu ứng DOM cho Mèo Nổ. Không dùng file âm thanh nào.
export const SPEEDS = { slow: { k: 1.5, name: 'Chậm' }, normal: { k: 1, name: 'Vừa' }, fast: { k: 0.7, name: 'Nhanh' } };
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
let speedKey = SPEEDS[ls.get('meono-speed')] ? ls.get('meono-speed') : 'normal';
export const S = () => SPEEDS[speedKey].k;
export const getSpeed = () => speedKey;
export function setSpeed(k) { if (SPEEDS[k]) { speedKey = k; ls.set('meono-speed', k); } }
export const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

let muted = ls.get('meono-mute') === '1';
export const isMuted = () => muted;
export function toggleMute() { muted = !muted; ls.set('meono-mute', muted ? '1' : '0'); return muted; }

let ac = null, master = null;
export function actx() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination); } catch (e) { return null; } }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}
function tone(f, d, type = 'sine', g = 0.12, slide = 0, at = 0, dest) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(25, f + slide), t + d);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(dest || master); o.start(t); o.stop(t + d + 0.03);
}
function noise(d, freq, g, at = 0, type = 'bandpass', q = 1, sweep = 0) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * d)), a.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 1.5);
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), t + d);
  const gn = a.createGain(); gn.gain.value = g; s.connect(f); f.connect(gn); gn.connect(master); s.start(t);
}
// tiếng "meo" tổng hợp
function meow(at = 0, pitch = 1, g = 0.09, dest) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(520 * pitch, t); o.frequency.linearRampToValueAtTime(820 * pitch, t + 0.12); o.frequency.linearRampToValueAtTime(460 * pitch, t + 0.42);
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1800, t + 0.15); f.frequency.linearRampToValueAtTime(700, t + 0.42);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.05); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  o.connect(f); f.connect(gn); gn.connect(dest || master); o.start(t); o.stop(t + 0.5);
}
// rừ rừ: tiếng ồn trầm, rung biên độ ~24 lần/giây
function purr(d = 0.9, g = 0.5, at = 0) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.floor(a.sampleRate * d), a.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320; f.Q.value = 2;
  const am = a.createGain(); am.gain.value = 0.5; const lfo = a.createOscillator(); lfo.frequency.value = 24; const lg = a.createGain(); lg.gain.value = 0.5;
  lfo.connect(lg); lg.connect(am.gain);
  const env = a.createGain(); env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(g, t + 0.12); env.gain.setValueAtTime(g, t + d - 0.25); env.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f); f.connect(am); am.connect(env); env.connect(master); s.start(t); lfo.start(t); s.stop(t + d); lfo.stop(t + d);
}
// khè (hiss): ồn cao, bật mạnh rồi tắt dần
function hiss(d = 0.55, g = 0.32, at = 0) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.floor(a.sampleRate * d), a.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(5200, t); f.frequency.linearRampToValueAtTime(3600, t + d); f.Q.value = 0.8;
  const env = a.createGain(); env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(g, t + 0.025); env.gain.exponentialRampToValueAtTime(g * 0.5, t + d * 0.5); env.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f); f.connect(env); env.connect(master); s.start(t);
}
// "mrrp" – tiếng gù hỏi han của mèo
function chirp(at = 0, pitch = 1, g = 0.07) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(380 * pitch, t); o.frequency.linearRampToValueAtTime(720 * pitch, t + 0.16);
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 4; f.frequency.value = 1100;
  const am = a.createGain(); am.gain.value = 0.55; const lfo = a.createOscillator(); lfo.frequency.value = 32; const lg = a.createGain(); lg.gain.value = 0.45; lfo.connect(lg); lg.connect(am.gain);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.03); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(f); f.connect(am); am.connect(gn); gn.connect(master); o.start(t); lfo.start(t); o.stop(t + 0.25); lfo.stop(t + 0.25);
}
const arp = (notes, step = 0.07, type = 'triangle', g = 0.1) => notes.forEach((f, i) => tone(f, 0.2, type, g, 0, i * step));
export const sfx = {
  play() { noise(0.08, 2600, 0.35); tone(700, 0.08, 'sine', 0.05, 300); },
  draw() { noise(0.1, 1700, 0.3); tone(300, 0.1, 'sine', 0.05, -60); },
  flip() { noise(0.06, 3200, 0.3); },
  shuffle() { for (let i = 0; i < 9; i++) noise(0.04, 2200 + (i % 3) * 400, 0.25, i * 0.045); },
  attack() { tone(180, 0.25, 'sawtooth', 0.08, 220); noise(0.18, 600, 0.4, 0.05, 'lowpass'); meow(0.1, 0.8, 0.08); },
  skip() { tone(500, 0.08, 'square', 0.05, 400); tone(900, 0.12, 'square', 0.04, 400, 0.08); },
  future() { arp([659, 784, 988, 1319, 1568], 0.06, 'sine', 0.07); },
  alter() { arp([1568, 1319, 988, 1175, 1568], 0.06, 'triangle', 0.06); },
  favor() { meow(0, 1.3, 0.07); arp([784, 988], 0.1, 'sine', 0.05); },
  steal() { noise(0.25, 1200, 0.35, 0, 'bandpass', 2, 1800); tone(400, 0.2, 'triangle', 0.06, 500, 0.05); chirp(0.2, 1.2, 0.05); },
  nope() { hiss(0.5, 0.3); tone(330, 0.16, 'square', 0.07, 0, 0.08); tone(247, 0.3, 'square', 0.07, -40, 0.22); },
  denied() { tone(200, 0.4, 'sawtooth', 0.05, -80); },
  fuse() { hiss(0.4, 0.22, 0.05); noise(1.1, 4200, 0.18, 0, 'highpass', 0.7); for (let i = 0; i < 6; i++) noise(0.03, 5000, 0.3, 0.1 + i * 0.15 + Math.random() * 0.05, 'highpass'); },
  boom() {
    noise(1.8, 900, 1.4, 0, 'lowpass', 0.7, -820); noise(0.5, 3000, 0.6, 0, 'bandpass', 0.5, -2500);
    tone(120, 1.1, 'sine', 0.5, -90); tone(60, 1.4, 'sine', 0.4, -30, 0.05);
    meow(0.5, 1.6, 0.06); meow(0.75, 1.9, 0.05);
  },
  defuse() { noise(0.03, 5000, 0.5, 0, 'highpass'); noise(0.03, 5000, 0.5, 0.12, 'highpass'); arp([523, 659, 784, 1047], 0.08, 'sine', 0.08); purr(1.1, 0.45, 0.35); },
  heartbeat(g = 0.35) { tone(70, 0.13, 'sine', g, -20); tone(64, 0.15, 'sine', g * 0.8, -20, 0.2); },
  drumroll() { for (let i = 0; i < 12; i++) noise(0.05, 300, 0.25 + i * 0.03, i * 0.04, 'lowpass'); },
  tick() { tone(1500, 0.03, 'square', 0.03); },
  turn() { chirp(0, 1, 0.07); tone(1319, 0.12, 'sine', 0.04, 0, 0.12); },
  bad() { tone(200, 0.15, 'sawtooth', 0.05); },
  meow, purr, hiss, chirp,
  pet() { const r = Math.random(); if (r < 0.4) purr(1, 0.5); else if (r < 0.75) meow(0, 1.1 + Math.random() * 0.4, 0.08); else chirp(0, 1.1, 0.08); },
  win() { arp([523, 659, 784, 1047, 784, 1047, 1319], 0.11, 'triangle', 0.1); meow(0.8, 1.2, 0.07); },
  // ĐÉO!: tiếng con dấu đóng "cộp" + mèo rít; ĐÉO! chồng càng nhiều càng rít cao
  stamp(level = 1) {
    const k = Math.min(6, level - 1);
    tone(120, 0.22, 'sine', 0.55, -80); noise(0.12, 420, 1.1, 0, 'lowpass', 0.8); noise(0.05, 2400, 0.35, 0.004, 'bandpass', 0.7);
    tone(62, 0.3, 'sine', 0.35, -20, 0.01);
    hiss(0.5, 0.3, 0.07);
    screech(0.09, 1 + k * 0.12);
  },
  awards() { arp([784, 988, 1175, 1568], 0.09, 'triangle', 0.08); chirp(0.4, 1.3, 0.06); },
};
// mèo rít (yowl): răng cưa cao, rung mạnh, trượt xuống
function screech(at = 0, pitch = 1, g = 0.06) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(900 * pitch, t); o.frequency.linearRampToValueAtTime(1350 * pitch, t + 0.08); o.frequency.exponentialRampToValueAtTime(620 * pitch, t + 0.5);
  const lfo = a.createOscillator(); lfo.frequency.value = 17; const lg = a.createGain(); lg.gain.value = 60 * pitch; lfo.connect(lg); lg.connect(o.frequency);
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.5; f.frequency.setValueAtTime(2200, t); f.frequency.linearRampToValueAtTime(1400, t + 0.5);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.03); gn.gain.setValueAtTime(g, t + 0.25); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(f); f.connect(gn); gn.connect(master); o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6);
}

// ---------- hiệu ứng DOM ----------
function layer() { let l = document.getElementById('fx-layer'); if (!l) { l = document.createElement('div'); l.id = 'fx-layer'; document.body.appendChild(l); } return l; }
export const ctr = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
export function fly(html, fromEl, toEl, { delay = 0, duration = 460, rotate = 0, scale = 1, onEnd, cls = '' } = {}) {
  if (!fromEl || !toEl) { onEnd && onEnd(); return; }
  duration *= S(); delay *= S();
  const a = ctr(fromEl), b = ctr(toEl);
  const n = document.createElement('div'); n.className = 'flyer ' + cls; n.innerHTML = html; layer().appendChild(n);
  const w = n.offsetWidth || 70, h = n.offsetHeight || 100;
  n.style.transform = `translate(${a.x - w / 2}px,${a.y - h / 2}px) scale(.8)`; n.style.opacity = '0';
  setTimeout(() => {
    n.style.transition = `transform ${duration}ms cubic-bezier(.2,.9,.3,1.1), opacity 120ms`; n.style.opacity = '1';
    n.style.transform = `translate(${b.x - w / 2}px,${b.y - h / 2}px) scale(${scale}) rotate(${rotate}deg)`;
    setTimeout(() => { n.remove(); onEnd && onEnd(); }, duration + 30);
  }, delay);
}
export function floatText(el, text, cls = '') {
  if (!el) return; const c = ctr(el);
  const n = document.createElement('div'); n.className = 'float-text ' + cls; n.textContent = text;
  n.style.left = c.x + 'px'; n.style.top = c.y + 'px'; layer().appendChild(n); setTimeout(() => n.remove(), 1500 * S());
}
export function pop(el, cls = 'pop') { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 800 * S()); }
export const shake = el => pop(el, 'shake');
const FIRE = ['#ff3d2e', '#ff8a00', '#ffd23f', '#fff3b0', '#ff5d8f'];
export function burst(el, cols = FIRE, n = 22, dist = 90) {
  if (!el) return; const c = ctr(el);
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i'); d.className = 'spark'; d.style.background = cols[i % cols.length];
    const ang = Math.random() * Math.PI * 2, r = dist * (0.5 + Math.random());
    d.style.left = c.x + 'px'; d.style.top = c.y + 'px';
    d.style.setProperty('--dx', Math.cos(ang) * r + 'px'); d.style.setProperty('--dy', Math.sin(ang) * r + 'px');
    d.style.animationDuration = 700 * S() + 'ms'; layer().appendChild(d); setTimeout(() => d.remove(), 800 * S());
  }
}
// BÙM: rung màn hình, chớp sáng, khói, tia lửa, mèo bay tán loạn
export function explode(el, catsHTML = []) {
  const c = el ? ctr(el) : { x: innerWidth / 2, y: innerHeight / 2 };
  const L = layer();
  const flash = document.createElement('div'); flash.className = 'boom-flash'; L.appendChild(flash); setTimeout(() => flash.remove(), 900);
  // bong bóng truyện tranh: tia nắng + nổ răng cưa chấm bi + chữ BÙM! viền đậm
  const rays = document.createElement('div'); rays.className = 'boom-rays'; rays.style.setProperty('--x', c.x + 'px'); rays.style.setProperty('--y', c.y + 'px'); L.appendChild(rays); setTimeout(() => rays.remove(), 1500);
  const word = document.createElement('div'); word.className = 'boom-word';
  word.innerHTML = comicBurst('#ffd23f', '#e5383b', 16) + '<span>BÙM!</span>'; L.appendChild(word); setTimeout(() => word.remove(), 1700);
  const SFXW = ['ĐOÀNG!', 'MEOOO!', 'XÈO!', 'ẦM!', 'NGAO!'];
  for (let i = 0; i < 3; i++) {
    const w2 = document.createElement('div'); w2.className = 'boom-sub'; w2.textContent = SFXW[(i + Math.floor(Math.random() * 5)) % 5];
    w2.style.left = [18, 78, 30][i] + 'vw'; w2.style.top = [22, 30, 66][i] + 'vh'; w2.style.setProperty('--r', [-14, 12, -6][i] + 'deg'); w2.style.animationDelay = 180 + i * 140 + 'ms';
    L.appendChild(w2); setTimeout(() => w2.remove(), 1700);
  }
  if (reduced()) return;
  document.body.classList.remove('quake'); void document.body.offsetWidth; document.body.classList.add('quake');
  setTimeout(() => document.body.classList.remove('quake'), 900);
  const ring = document.createElement('i'); ring.className = 'shock'; ring.style.left = c.x + 'px'; ring.style.top = c.y + 'px'; L.appendChild(ring); setTimeout(() => ring.remove(), 900);
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('i'); s.className = 'smoke'; const ang = Math.random() * Math.PI * 2, r = 40 + Math.random() * 90;
    s.style.left = c.x + 'px'; s.style.top = c.y + 'px'; s.style.setProperty('--dx', Math.cos(ang) * r + 'px'); s.style.setProperty('--dy', Math.sin(ang) * r - 40 + 'px');
    s.style.animationDelay = i * 30 + 'ms'; L.appendChild(s); setTimeout(() => s.remove(), 1800);
  }
  burst(el, FIRE, 46, 170);
  const faces = catsHTML.length ? catsHTML : ['🙀', '😹', '😿', '🐱', '😼'];
  for (let i = 0; i < 7; i++) {
    const m = document.createElement('div'); m.className = 'flycat'; m.innerHTML = faces[i % faces.length];
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, r = Math.max(innerWidth, innerHeight) * (0.6 + Math.random() * 0.4);
    m.style.left = c.x + 'px'; m.style.top = c.y + 'px';
    m.style.setProperty('--dx', Math.cos(ang) * r + 'px'); m.style.setProperty('--dy', Math.sin(ang) * r + 'px'); m.style.setProperty('--r', (Math.random() * 1080 - 540) + 'deg');
    m.style.animationDelay = 60 + i * 50 + 'ms'; L.appendChild(m); setTimeout(() => m.remove(), 2200);
  }
}
// hình nổ răng cưa kiểu truyện tranh, tô chấm bi (halftone)
let cbId = 0;
export function comicBurst(fill = '#ffd23f', dot = '#e5383b', spikes = 14) {
  const id = 'ht' + (cbId++); const pts = [];
  for (let k = 0; k < spikes * 2; k++) { const r = k % 2 ? 60 + Math.random() * 6 : 92 + Math.random() * 8; const an = (k / (spikes * 2)) * Math.PI * 2; pts.push((100 + Math.cos(an) * r).toFixed(1) + ',' + (100 + Math.sin(an) * r * 0.8).toFixed(1)); }
  return `<svg viewBox="0 0 200 200" class="burst" aria-hidden="true"><defs><pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="9" height="9" fill="${fill}"/><circle cx="4.5" cy="4.5" r="2" fill="${dot}" opacity=".55"/></pattern></defs>
    <polygon points="${pts.join(' ')}" fill="#2d2a32" transform="translate(5 6)"/><polygon points="${pts.join(' ')}" fill="url(#${id})" stroke="#2d2a32" stroke-width="5" stroke-linejoin="round"/></svg>`;
}
export function confetti() {
  if (reduced()) return;
  const cols = ['#ff8a00', '#ff5d8f', '#4cc9f0', '#7bd389', '#ffd23f', '#a06cd5'];
  for (let i = 0; i < 110; i++) {
    const d = document.createElement('i'); d.className = 'confetti'; d.style.background = cols[i % cols.length];
    d.style.left = Math.random() * 100 + 'vw'; d.style.animationDelay = Math.random() * 600 + 'ms';
    d.style.animationDuration = 1800 + Math.random() * 1600 + 'ms'; d.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    layer().appendChild(d); setTimeout(() => d.remove(), 4200);
  }
}
// ---------- con dấu ĐÉO! đóng giữa màn hình: mỗi lần ĐÉO! thêm 1 dấu, lệch góc khác nhau ----------
const ST_ROT = [-11, 9, -4, 15, -17, 6, -8, 13], ST_DX = [0, 16, -14, 9, -18, 20, -6, 12], ST_DY = [0, -12, 12, -4, 8, -14, 16, -8];
export function stamp({ level = 1, who = '', cancel = true, at = null } = {}) {
  const L = layer(); let box = L.querySelector('.nope-stack');
  if (!box) { box = document.createElement('div'); box.className = 'nope-stack'; L.appendChild(box); }
  if (at) { box.style.left = at.x + 'px'; box.style.top = at.y + 'px'; }
  box.classList.remove('bye'); clearTimeout(box._t);
  [...box.children].forEach(c => c.classList.add('old'));
  const i = (level - 1) % ST_ROT.length;
  const n = document.createElement('div');
  n.className = 'stamp ' + (cancel ? 'cancel' : 'save');
  n.style.setProperty('--r', ST_ROT[i] + 'deg'); n.style.setProperty('--dx', ST_DX[i] + 'px'); n.style.setProperty('--dy', ST_DY[i] + 'px');
  n.style.animationDuration = Math.round(520 * S()) + 'ms';
  n.innerHTML = `<b>ĐÉO!</b><small>${level > 1 ? `#${level} · ` : ''}${who ? who + ' · ' : ''}${cancel ? 'HUỶ!' : 'cứu lại!'}</small>`;
  box.appendChild(n);
  while (box.children.length > 6) box.firstChild.remove();
  // tự dọn nếu không ai gọi clearStamps (vd. mất state)
  box._t = setTimeout(() => clearStamps(), 9000);
  if (!reduced()) { document.body.classList.remove('thud'); void document.body.offsetWidth; document.body.classList.add('thud'); setTimeout(() => document.body.classList.remove('thud'), 300); }
}
export function clearStamps() {
  const box = layer().querySelector('.nope-stack'); if (!box || box.classList.contains('bye')) return;
  clearTimeout(box._t); box.classList.add('bye'); setTimeout(() => { if (box.classList.contains('bye')) box.remove(); }, 450);
}
export const stampsOn = () => !!layer().querySelector('.nope-stack:not(.bye)');

const bq = []; let busy = false;
export const bannerBusy = () => busy;
export function banner(text, cls = '') { bq.push([text, cls]); if (bq.length > 3) bq.splice(0, bq.length - 3); if (!busy) nextB(); }
function nextB() {
  const it = bq.shift(); if (!it) { busy = false; return; } busy = true;
  const n = document.createElement('div'); n.className = 'banner ' + it[1] + ([...it[0]].length > 15 ? ' long' : ''); n.textContent = it[0]; layer().appendChild(n);
  n.style.animationDuration = 1150 * S() + 'ms';
  setTimeout(() => { n.remove(); nextB(); }, 1050 * S());
}

// ---------- nhạc nền "mèo quậy" – tung tăng, căng dần theo độ nguy hiểm ----------
let musicOn = ls.get('meono-music') === '1', vol = +(ls.get('meono-music-vol') || 0.5);
let mGain = null, tension = 0, schedT = null, nextT = 0, step = 0, pad = null;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
// vòng hợp âm C – Am – F – G (vui) / Cm – Ab – Bb – G (khi sắp toang)
const CH_HAPPY = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
const CH_TENSE = [[48, 51, 55], [44, 48, 51], [46, 50, 53], [43, 47, 50]];
const SC_HAPPY = [0, 2, 4, 7, 9, 12, 14, 16, 19];   // ngũ cung trưởng
const SC_TENSE = [0, 3, 5, 6, 7, 10, 12, 15, 17];   // blues "rình mò"
// motif 2 ô nhịp (16 móc đơn), -1 = nghỉ
const MOTIF = [[0, 2, 4, -1, 5, 4, 2, -1, 3, -1, 4, 5, 7, -1, 6, -1], [4, -1, 5, 7, 8, 7, 5, -1, 4, 2, -1, 3, 2, -1, 0, -1]];
export function setTension(t) { tension = Math.max(0, Math.min(1, t)); if (pad && ac) pad.g.gain.setTargetAtTime(0.0001 + Math.max(0, tension - 0.4) * 0.07, ac.currentTime, 0.6); }
export const getTension = () => tension;
function mnote(f, t, d, type, g) {
  const o = ac.createOscillator(); o.type = type; o.frequency.value = f; const gn = ac.createGain();
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(mGain); o.start(t); o.stop(t + d + 0.05);
}
// tiếng gảy dây (pizzicato) – có chút "boing" đầu nốt
function pluck(f, t, d, g) {
  const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f * 1.02, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
  const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2; const g2 = ac.createGain(); g2.gain.value = 0.3; o2.connect(g2);
  const gn = ac.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.006); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); g2.connect(gn); gn.connect(mGain); o.start(t); o2.start(t); o.stop(t + d + 0.05); o2.stop(t + d + 0.05);
}
function mnoise(t, d, f, g) {
  const b = ac.createBuffer(1, Math.floor(ac.sampleRate * d), ac.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
  const s = ac.createBufferSource(); s.buffer = b; const fl = ac.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = f;
  const gn = ac.createGain(); gn.gain.value = g; s.connect(fl); fl.connect(gn); gn.connect(mGain); s.start(t);
}
function kick(t, g) { const o = ac.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); const gn = ac.createGain(); gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(gn); gn.connect(mGain); o.start(t); o.stop(t + 0.22); }
function schedule() {
  const lookahead = 1.2;
  while (nextT < ac.currentTime + lookahead) {
    const T = tension, bpm = 118 + T * 46, st = 60 / bpm / 2;   // móc đơn
    const i = step % 8, bar = Math.floor(step / 8), tense = T > 0.55;
    const ch = (tense ? CH_TENSE : CH_HAPPY)[bar % 4], sc = T > 0.35 ? SC_TENSE : SC_HAPPY;
    const t = nextT + (i % 2 ? st * 0.2 : 0);                   // nhịp "swing" nhún nhảy
    // bass "bùm-chát": gốc ở phách 1, quãng 5 ở phách 3; hợp âm gảy ở phách sau
    if (i === 0) pluck(mtof(ch[0] - 12), t, st * 1.8, 0.24);
    if (i === 4) pluck(mtof(ch[2] - 12), t, st * 1.6, 0.2);
    if (i === 2 || i === 6) ch.forEach((m, k) => pluck(mtof(m + 12), t + k * 0.008, st * 0.6, 0.045));
    // giai điệu
    const mel = MOTIF[(bar >> 1) % 2][(bar % 2) * 8 + i];
    if (mel >= 0 && !(T > 0.75 && i % 2)) pluck(mtof(72 + sc[Math.min(sc.length - 1, mel)]), t, st * 1.1, 0.075);
    // leng keng chuông nhỏ đầu mỗi 2 ô nhịp khi còn yên bình
    if (T < 0.4 && i === 0 && bar % 2 === 0) mnote(mtof(96 + sc[(bar >> 1) % 5]), t, 0.5, 'sine', 0.025);
    // "meo~" cuối câu nhạc (mỗi 4 ô nhịp)
    if (T < 0.6 && bar % 4 === 3 && i === 6) meow(Math.max(0, t - ac.currentTime), 1.15, 0.035, mGain);
    // trống: lắc lư nhẹ → hi-hat dày + tim đập khi căng
    if (i % 2 === 1) mnoise(t, 0.025, 8000, 0.03 + T * 0.07);
    if (T > 0.3 && i % 2 === 0) mnoise(t, 0.02, 9000, 0.02 + T * 0.04);
    if (i === 0 || (i === 4 && T > 0.2)) kick(t, 0.12 + T * 0.18);
    if (T > 0.7 && i === 1) kick(t, 0.18);
    nextT += st; step++;
  }
}
export function musicStart() {
  const a = actx(); if (!a || schedT || !musicOn) return;
  if (!mGain) { mGain = a.createGain(); mGain.connect(master); }
  mGain.gain.value = vol * 0.35;
  if (!pad) { // nền rung căng thẳng
    const g = a.createGain(); g.gain.value = 0.0001; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const o1 = a.createOscillator(), o2 = a.createOscillator(); o1.type = o2.type = 'sawtooth'; o1.frequency.value = 55; o2.frequency.value = 55.9;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(mGain); o1.start(); o2.start(); pad = { g, o1, o2 };
  }
  setTension(tension);
  nextT = a.currentTime + 0.1; schedT = setInterval(schedule, 200); schedule();
}
export function musicStop() {
  clearInterval(schedT); schedT = null;
  if (pad) { try { pad.o1.stop(); pad.o2.stop(); } catch (e) {} pad = null; }
  if (mGain) { try { mGain.disconnect(); } catch (e) {} mGain = null; }
}
export const musicIsOn = () => musicOn;
export function musicToggle() { musicOn = !musicOn; ls.set('meono-music', musicOn ? '1' : '0'); musicOn ? musicStart() : musicStop(); return musicOn; }
export function musicVolume(v) { if (v == null) return vol; vol = v; ls.set('meono-music-vol', String(v)); if (mGain) mGain.gain.value = vol * 0.35; }
export function musicResumeIfOn() { if (musicOn) musicStart(); }
document.addEventListener('visibilitychange', () => { if (ac && !document.hidden && ac.state !== 'running') ac.resume().catch(() => {}); if (!document.hidden && schedT && ac) nextT = Math.max(nextT, ac.currentTime + 0.05); });
