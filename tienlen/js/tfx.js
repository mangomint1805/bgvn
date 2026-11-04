// Âm thanh tổng hợp WebAudio + hiệu ứng DOM cho Tiến Lên (không dùng file âm thanh)
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
export const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
export const S = () => 1;

let muted = ls.get('tl-mute') === '1';
export const isMuted = () => muted;
export function toggleMute() { muted = !muted; ls.set('tl-mute', muted ? '1' : '0'); return muted; }

let ac = null;
export function actx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume().catch(() => {}); return ac; }
function tone(f, d, type = 'sine', g = 0.12, slide = 0, at = 0) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, freq, g, at = 0, type = 'bandpass', sweep = 0) {
  const a = actx(); if (!a || muted) return; const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * d)), a.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq + sweep), t + d);
  const gn = a.createGain(); gn.gain.value = g; s.connect(f); f.connect(gn); gn.connect(a.destination); s.start(t);
}
const arp = (notes, step = 0.07, type = 'triangle', g = 0.1) => notes.forEach((f, i) => tone(f, 0.2, type, g, 0, i * step));
export const sfx = {
  deal() { for (let i = 0; i < 8; i++) noise(0.04, 2800 + i * 60, 0.22, i * 0.05); },
  snap() { noise(0.05, 3200, 0.35); tone(1200, 0.05, 'sine', 0.04, -400); },
  play(n = 1) { for (let i = 0; i < Math.min(n, 6); i++) noise(0.05, 2900 + i * 120, 0.3, i * 0.045); tone(660, 0.08, 'triangle', 0.05, 120, 0.02); },
  heo() { noise(0.06, 3000, 0.35); arp([523, 784, 1047], 0.06, 'square', 0.05); },
  pass() { tone(330, 0.12, 'sine', 0.07, -90); tone(247, 0.16, 'sine', 0.05, -60, 0.08); },
  round() { arp([659, 784, 988], 0.06, 'sine', 0.06); },
  turn() { tone(988, 0.1, 'sine', 0.07); tone(1319, 0.14, 'sine', 0.06, 0, 0.08); },
  bad() { tone(200, 0.15, 'sawtooth', 0.05); },
  // chặt: vút dao + phập + vang kim loại + tiếng "ồ"
  chop() {
    noise(0.28, 5200, 0.55, 0, 'bandpass', -4400);
    tone(90, 0.35, 'sine', 0.3, -40, 0.24); noise(0.12, 500, 0.7, 0.24, 'lowpass');
    tone(1760, 0.6, 'triangle', 0.05, 0, 0.26); tone(2637, 0.45, 'sine', 0.03, 0, 0.26);
    tone(220, 0.5, 'sawtooth', 0.035, 110, 0.5); tone(277, 0.5, 'sawtooth', 0.03, 120, 0.5);
  },
  coins() { for (let i = 0; i < 6; i++) { tone(1900 + (i % 3) * 260, 0.09, 'square', 0.025, 0, 0.05 + i * 0.07); tone(2600 + (i % 2) * 300, 0.06, 'sine', 0.03, 0, 0.08 + i * 0.07); } },
  finish() { arp([784, 988, 1175, 1568], 0.08, 'triangle', 0.09); },
  cong() { tone(440, 0.5, 'sawtooth', 0.06, -220); tone(330, 0.7, 'sawtooth', 0.05, -200, 0.25); },
  win() { arp([523, 659, 784, 1047, 784, 1047, 1319], 0.1, 'triangle', 0.1); },
  lose() { [392, 370, 349, 262].forEach((f, i) => tone(f, i === 3 ? 0.6 : 0.24, 'triangle', 0.08, i === 3 ? -60 : 0, i * 0.24)); },
  toiTrang() { arp([523, 659, 784, 1047, 1319, 1568, 2093], 0.06, 'square', 0.06); noise(0.6, 1200, 0.3, 0.4, 'lowpass'); },
  pip() { tone(1200, 0.06, 'sine', 0.05, 300); },
};

// ---------- hiệu ứng DOM ----------
function layer() { let l = document.getElementById('fx-layer'); if (!l) { l = document.createElement('div'); l.id = 'fx-layer'; document.body.appendChild(l); } return l; }
const ctr = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
export function fly(html, fromEl, toEl, { delay = 0, duration = 380, scale = 1, onEnd } = {}) {
  if (!fromEl || !toEl || reduced()) { onEnd && setTimeout(onEnd, reduced() ? 0 : delay); return; }
  const a = ctr(fromEl), b = ctr(toEl);
  const n = document.createElement('div'); n.className = 'flyer'; n.innerHTML = html; layer().appendChild(n);
  const w = n.offsetWidth || 50, h = n.offsetHeight || 70;
  n.style.transform = `translate(${a.x - w / 2}px,${a.y - h / 2}px) scale(.6)`; n.style.opacity = '0';
  setTimeout(() => {
    n.style.transition = `transform ${duration}ms cubic-bezier(.2,.9,.3,1.1), opacity 120ms`; n.style.opacity = '1';
    n.style.transform = `translate(${b.x - w / 2}px,${b.y - h / 2}px) scale(${scale})`;
    setTimeout(() => { n.remove(); onEnd && onEnd(); }, duration + 30);
  }, delay);
}
// bay TỪNG lá (FLIP): từ vị trí thật (lá trên tay / quạt bài của ghế) tới đúng chỗ lá nằm giữa bàn, xoè sẵn
// items: [{ html, from: {x,y,w,r?,o?}, to: () => {x,y,w,h,rot} | null }]
export function flyCards(items, { delay = 0, duration = 420, stagger = 40, onEnd } = {}) {
  if (!items.length || reduced()) { onEnd && setTimeout(onEnd, reduced() ? 0 : delay); return; }
  setTimeout(() => {
    const nodes = []; let left = items.length;
    const done = () => { if (--left) return; nodes.forEach(n => n.remove()); onEnd && onEnd(); };
    items.forEach((it, i) => {
      const t = it.to(), f = it.from;
      if (!t || !f) { done(); return; }
      const n = document.createElement('div'); n.className = 'flyer fc';
      n.style.cssText = `--cw:${t.w}px;--ch:${t.h}px;width:${t.w}px;height:${t.h}px`;
      n.innerHTML = it.html; layer().appendChild(n); nodes.push(n);
      const s0 = Math.max(.3, Math.min(1.3, (f.w || t.w) / t.w));
      const tr = (x, y, r, sc) => `translate(${x - t.w / 2}px,${y - t.h / 2}px) rotate(${r}deg) scale(${sc})`;
      const mx = (f.x + t.x) / 2, my = Math.min(f.y, t.y) + (Math.abs(f.y - t.y) * .35);
      const a = n.animate([
        { transform: tr(f.x, f.y, f.r || 0, s0), opacity: f.o ?? 1, offset: 0 },
        { transform: tr(mx, my, (t.rot + (f.r || 0)) / 2 + (i % 2 ? 6 : -6), (s0 + 1) / 2 * 1.06), opacity: 1, offset: .55 },
        { transform: tr(t.x, t.y, t.rot, 1), opacity: 1, offset: 1 },
      ], { duration, delay: i * stagger, easing: 'cubic-bezier(.22,.8,.3,1)', fill: 'both' });
      a.onfinish = done; a.oncancel = done;
    });
  }, delay);
}
export function floatText(el, text, cls = '') {
  if (!el) return; const c = ctr(el);
  const n = document.createElement('div'); n.className = 'float-text ' + cls; n.textContent = text;
  n.style.left = c.x + 'px'; n.style.top = c.y + 'px'; layer().appendChild(n); setTimeout(() => n.remove(), 1600);
}
export function pop(el, cls = 'pop') { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 800); }
export const shake = el => pop(el, 'shake');
const CONF = ['#ff4d5e', '#ffc23d', '#2fc76f', '#3d8bff', '#b45cff', '#ff8a3d'];
export function burst(el, n = 20, cols = CONF) {
  if (!el || reduced()) return; const c = ctr(el);
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i'); d.className = 'spark'; d.style.background = cols[i % cols.length];
    const ang = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 90;
    d.style.left = c.x + 'px'; d.style.top = c.y + 'px';
    d.style.setProperty('--dx', Math.cos(ang) * dist + 'px'); d.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
    layer().appendChild(d); setTimeout(() => d.remove(), 800);
  }
}
export function confetti() {
  if (reduced()) return;
  for (let i = 0; i < 110; i++) {
    const d = document.createElement('i'); d.className = 'confetti'; d.style.background = CONF[i % CONF.length];
    d.style.left = Math.random() * 100 + 'vw'; d.style.animationDelay = Math.random() * 600 + 'ms';
    d.style.animationDuration = 1800 + Math.random() * 1600 + 'ms'; d.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    layer().appendChild(d); setTimeout(() => d.remove(), 4200);
  }
}
// banner to giữa màn hình (xếp hàng, tối đa 3)
const bq = []; let busy = false;
export function banner(text, cls = '', sub = '') { bq.push([text, cls, sub]); if (bq.length > 3) bq.splice(0, bq.length - 3); if (!busy) nextB(); }
function nextB() {
  const it = bq.shift(); if (!it) { busy = false; return; } busy = true;
  const n = document.createElement('div'); n.className = 'banner ' + it[1];
  n.innerHTML = `<b></b>${it[2] ? '<small></small>' : ''}`; n.firstChild.textContent = it[0]; if (it[2]) n.lastChild.textContent = it[2];
  layer().appendChild(n);
  const ms = it[1].includes('chop') ? 1700 : 1150;
  setTimeout(() => { n.remove(); nextB(); }, ms);
}
// "CHẶT!": chớp đỏ + vệt dao chém ngang chồng bài
export function chopFx(target) {
  const f = document.createElement('div'); f.className = 'chop-flash'; layer().appendChild(f); setTimeout(() => f.remove(), 700);
  if (!target) return;
  const r = target.getBoundingClientRect();
  const s = document.createElement('div'); s.className = 'slash';
  s.style.left = (r.left - 20) + 'px'; s.style.top = (r.top + r.height / 2) + 'px'; s.style.width = (r.width + 40) + 'px';
  s.innerHTML = '<i></i><span>🔪</span>';
  layer().appendChild(s); setTimeout(() => s.remove(), 1000);
}
// đường cong "ai trả chip cho ai"
export function arc(a, b, { text = '', color = '#ff4d5e' } = {}) {
  if (!a || !b) return;
  const NS = innerWidth, id = 'am' + Math.random().toString(36).slice(2, 7);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - Math.min(120, Math.hypot(b.x - a.x, b.y - a.y) * 0.3);
  const g = document.createElement('div'); g.className = 'arc-wrap';
  g.innerHTML = `<svg class="arc" viewBox="0 0 ${NS} ${innerHeight}" width="${NS}" height="${innerHeight}"><defs><marker id="${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${color}"/></marker></defs><path class="arc-ln" d="M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}" stroke="${color}" marker-end="url(#${id})"/></svg>`;
  layer().appendChild(g);
  if (text) { const bub = document.createElement('div'); bub.className = 'arc-bub'; bub.textContent = text; bub.style.borderColor = color; g.appendChild(bub); const w = bub.offsetWidth; bub.style.left = Math.max(8 + w / 2, Math.min(innerWidth - 8 - w / 2, (a.x + 2 * mx + b.x) / 4)) + 'px'; bub.style.top = Math.max(24, (a.y + 2 * my + b.y) / 4) + 'px'; }
  setTimeout(() => g.classList.add('fade'), 2200);
  setTimeout(() => g.remove(), 2700);
}
// chip bay từ người trả sang người nhận
export function coinRain(fromEl, toEl, n = 6) {
  for (let i = 0; i < n; i++) fly('<span class="coin">🪙</span>', fromEl, toEl, { delay: 220 + i * 70, duration: 520 });
}

// ---------- nhạc nền: ngũ cung kiểu Tết, vui vui ----------
let musicOn = ls.get('tl-music') === '1', mGain = null, vol = +(ls.get('tl-music-vol') || 0.45);
// thang ngũ cung (C D F G A) – nghe "Việt Nam" hơn
const PENTA = [523.3, 587.3, 698.5, 784, 880, 1046.5, 1174.7, 1396.9];
const BASS = [[130.8, 196], [174.6, 261.6], [146.8, 220], [196, 293.7]];
const MEL = [4, 3, 2, 3, 4, 6, 5, 4, 2, 1, 2, 3, 2, 1, 0, -1, 3, 4, 5, 4, 3, 2, 3, 4, 6, 5, 4, 2, 3, 2, 1, -1];
function mtone(c, dest, f, d, type, g, t) {
  const o = c.createOscillator(); o.type = type; o.frequency.value = f; const gn = c.createGain();
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.015); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(dest); o.start(t); o.stop(t + d + 0.05);
}
function mnoise(c, dest, d, g, t, freq) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * d), c.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
  const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq;
  const gn = c.createGain(); gn.gain.value = g; s.connect(f); f.connect(gn); gn.connect(dest); s.start(t);
}
let mBuf = null, mSrc = null;
async function renderMusic(a) {
  if (mBuf) return mBuf;
  const sr = a.sampleRate, bt = 0.19, steps = 32, L = Math.round(steps * bt * sr), tail = Math.round(sr);
  const off = new OfflineAudioContext(2, L + tail, sr); const dest = off.destination;
  for (let i = 0; i < steps; i++) {
    const at = i * bt, bar = Math.floor(i / 8), ch = BASS[bar % 4];
    if (i % 4 === 0) mtone(off, dest, ch[0], 0.34, 'triangle', 0.24, at);
    if (i % 4 === 2) mtone(off, dest, ch[1], 0.2, 'triangle', 0.16, at);
    if (i % 2 === 1) mnoise(off, dest, 0.04, 0.05, at, 6000);
    if (i % 8 === 4) mnoise(off, dest, 0.1, 0.07, at, 1500);
    const m = MEL[i]; if (m >= 0) { mtone(off, dest, PENTA[m], 0.22, 'sine', 0.075, at); mtone(off, dest, PENTA[m] * 2, 0.08, 'triangle', 0.012, at); }
  }
  const r = await off.startRendering(); const out = a.createBuffer(2, L, sr);
  for (let c = 0; c < 2; c++) { const d = r.getChannelData(c), o = out.getChannelData(c); o.set(d.subarray(0, L)); for (let i = 0; i < tail; i++) o[i] += d[L + i]; }
  return (mBuf = out);
}
export async function musicStart() {
  const a = actx(); if (!a || mSrc) return;
  if (!mGain) { mGain = a.createGain(); mGain.connect(a.destination); } mGain.gain.value = vol * 0.3;
  mSrc = true; const buf = await renderMusic(a); if (mSrc !== true || !musicOn) { if (mSrc === true) mSrc = null; return; }
  mSrc = a.createBufferSource(); mSrc.buffer = buf; mSrc.loop = true; mSrc.connect(mGain); mSrc.start(); const me = mSrc; me.onended = () => { if (mSrc === me) mSrc = null; };
}
export function musicStop() { if (mSrc && mSrc !== true) try { mSrc.stop(); } catch (e) {} mSrc = null; }
// đổi tab / khoá màn hình rồi quay lại: bật lại âm thanh (máy đòi chạm thì chờ lần chạm kế tiếp)
function revive() {
  if (document.hidden || !ac) return;
  const go = () => { if (ac.state !== 'running') ac.resume().catch(() => {}); if (musicOn && !mSrc) musicStart(); };
  go();
  if (ac.state !== 'running') { const once = () => { go(); removeEventListener('pointerdown', once, true); removeEventListener('keydown', once, true); }; addEventListener('pointerdown', once, true); addEventListener('keydown', once, true); }
}
if (typeof document !== 'undefined') { document.addEventListener('visibilitychange', revive); addEventListener('focus', revive); addEventListener('pageshow', revive); setInterval(() => { if (ac && !document.hidden && ac.state === 'running' && musicOn && !mSrc) musicStart(); }, 4000); }
export const musicIsOn = () => musicOn;
export function musicToggle() { musicOn = !musicOn; ls.set('tl-music', musicOn ? '1' : '0'); musicOn ? musicStart() : musicStop(); return musicOn; }
export function musicVolume(v) { if (v == null) return vol; vol = v; ls.set('tl-music-vol', String(v)); if (mGain) mGain.gain.value = vol * 0.3; }
export function musicResumeIfOn() { if (musicOn) musicStart(); }
