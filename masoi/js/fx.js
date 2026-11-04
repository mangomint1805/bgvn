// Âm thanh tự tổng hợp (WebAudio) + hiệu ứng DOM cho Ma Sói. Không dùng file âm thanh nào.
import { createBGM, sfxVolStore } from '../../shared/audio/bgm.js?v=2';
// Nhạc nền: đêm (đàn bầu + trống trầm + mõ), ngày (đàn tranh vui), bỏ phiếu (trống dồn). Môi trường: dế kêu, chim hót.
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
export const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

let muted = ls.get('masoi-mute') === '1';
const sv = sfxVolStore('masoi');
export function sfxVolume(v) { if (v == null) return sv.get(); sv.set(v); if (sfxBus) sfxBus.gain.value = v; return v; }
export const isMuted = () => muted;
export function toggleMute() { muted = !muted; ls.set('masoi-mute', muted ? '1' : '0'); if (muted) ambient(null); else ambient(ambMode); return muted; }

let ac = null, master = null, sfxBus = null, musBus = null, verb = null, verbIn = null;
export function actx() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = sv.get(); sfxBus.connect(master);
      musBus = ac.createGain(); musBus.gain.value = 1; musBus.connect(master);
      // tiếng vang (đêm vắng giữa làng)
      verb = ac.createConvolver(); const len = ac.sampleRate * 2.6, b = ac.createBuffer(2, len, ac.sampleRate);
      for (let c = 0; c < 2; c++) { const x = b.getChannelData(c); for (let i = 0; i < len; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      verb.buffer = b; verbIn = ac.createGain(); verbIn.gain.value = 0.5; verbIn.connect(verb); const vo = ac.createGain(); vo.gain.value = 0.55; verb.connect(vo); vo.connect(master);
    } catch (e) { return null; }
  }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}
const T = () => ac.currentTime;
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function out(node, wet = 0, bus) { node.connect(bus || sfxBus); if (wet) { const w = ac.createGain(); w.gain.value = wet; node.connect(w); w.connect(verbIn); } }
function tone(f, d, type = 'sine', g = 0.1, slide = 0, at = 0, wet = 0, bus) {
  const a = actx(); if (!a || (muted && !bus)) return; const t = T() + at;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(25, f + slide), t + d);
  const gn = a.createGain(); env(gn, t, 0.01, g, d); o.connect(gn); out(gn, wet, bus); o.start(t); o.stop(t + d + 0.05);
}
function noise(d, freq, g, at = 0, type = 'bandpass', q = 1, sweep = 0, wet = 0) {
  const a = actx(); if (!a || muted) return; const t = T() + at;
  const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * d)), a.sampleRate); const x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 1.4);
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), t + d);
  const gn = a.createGain(); gn.gain.value = g; s.connect(f); f.connect(gn); out(gn, wet); s.start(t);
}
// sói tru: răng cưa qua bộ lọc formant, rung giọng, vang xa
function howl(at = 0, pitch = 1, g = 0.11, len = 2.6) {
  const a = actx(); if (!a || muted) return; const t = T() + at;
  const o = a.createOscillator(); o.type = 'sawtooth';
  const f0 = 300 * pitch;
  o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 1.75, t + len * 0.28); o.frequency.linearRampToValueAtTime(f0 * 1.62, t + len * 0.7); o.frequency.linearRampToValueAtTime(f0 * 1.15, t + len);
  const lfo = a.createOscillator(); lfo.frequency.value = 5.2; const lg = a.createGain(); lg.gain.value = 9 * pitch; lfo.connect(lg); lg.connect(o.frequency);
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.6;
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;
  const sine = a.createOscillator(); sine.type = 'sine'; sine.frequency.setValueAtTime(f0, t); sine.frequency.linearRampToValueAtTime(f0 * 1.75, t + len * 0.28); sine.frequency.linearRampToValueAtTime(f0 * 1.62, t + len * 0.7); sine.frequency.linearRampToValueAtTime(f0 * 1.15, t + len);
  lg.connect(sine.frequency);
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.35); gn.gain.setValueAtTime(g, t + len * 0.75); gn.gain.exponentialRampToValueAtTime(0.0001, t + len);
  const sg = a.createGain(); sg.gain.value = 0.5;
  o.connect(f); f.connect(lp); lp.connect(gn); sine.connect(sg); sg.connect(gn); out(gn, 1.2);
  o.start(t); sine.start(t); lfo.start(t); o.stop(t + len + 0.1); sine.stop(t + len + 0.1); lfo.stop(t + len + 0.1);
}
// gà gáy "ò ó o o"
function rooster(at = 0, g = 0.09) {
  const a = actx(); if (!a || muted) return; const t = T() + at;
  const o = a.createOscillator(); o.type = 'sawtooth';
  const pts = [[0, 520], [0.12, 760], [0.3, 700], [0.42, 980], [0.62, 900], [0.9, 940], [1.3, 600]];
  pts.forEach(([dt, f], i) => i ? o.frequency.linearRampToValueAtTime(f, t + dt) : o.frequency.setValueAtTime(f, t));
  const lfo = a.createOscillator(); lfo.frequency.value = 18; const lg = a.createGain(); lg.gain.value = 14; lfo.connect(lg); lg.connect(o.frequency);
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2.2;
  const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t);
  [[0.03, g], [0.27, g * 0.5], [0.31, g], [0.58, g * 0.6], [0.62, g], [1.1, g * 0.8], [1.3, 0.0001]].forEach(([dt, v]) => gn.gain.exponentialRampToValueAtTime(v, t + dt));
  o.connect(f); f.connect(gn); out(gn, 0.6); o.start(t); lfo.start(t); o.stop(t + 1.35); lfo.stop(t + 1.35);
}
// chiêng/cồng: các hoạ âm lệch, ngân dài
function gong(at = 0, base = 110, g = 0.12, len = 3.2) {
  const a = actx(); if (!a || muted) return; const t = T() + at;
  [[1, 1], [1.48, 0.55], [2.09, 0.35], [2.76, 0.22], [3.9, 0.12]].forEach(([m, w]) => {
    const o = a.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(base * m * 1.01, t); o.frequency.exponentialRampToValueAtTime(base * m, t + 0.4);
    const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g * w, t + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + len * (1.2 - m * 0.15));
    o.connect(gn); out(gn, 0.8); o.start(t); o.stop(t + len + 0.1);
  });
  noise(0.08, 2400, 0.12, at);
}
const drum = (at = 0, g = 0.25, f = 95) => { tone(f, 0.35, 'sine', g, -45, at); noise(0.12, 300, g * 0.6, at, 'lowpass'); };
const mo = (at = 0, g = 0.07, bus) => { tone(880, 0.07, 'sine', g, -80, at, 0.15, bus); tone(1320, 0.05, 'triangle', g * 0.5, 0, at, 0, bus); };
// dế kêu: 3–4 nhịp rỉ rả tần số cao
function cricket(at = 0, g = 0.02, pan = 0) {
  const a = actx(); if (!a || muted) return; const t = T() + at;
  const f = 4300 + Math.random() * 600, pulses = 3 + Math.floor(Math.random() * 2);
  const p = a.createStereoPanner ? a.createStereoPanner() : null; if (p) { p.pan.value = pan; p.connect(sfxBus); }
  for (let i = 0; i < pulses; i++) {
    const o = a.createOscillator(); o.frequency.value = f; const gn = a.createGain(); const tt = t + i * 0.05;
    gn.gain.setValueAtTime(0.0001, tt); gn.gain.exponentialRampToValueAtTime(g, tt + 0.008); gn.gain.exponentialRampToValueAtTime(0.0001, tt + 0.035);
    o.connect(gn); gn.connect(p || sfxBus); o.start(tt); o.stop(tt + 0.05);
  }
}
function bird(at = 0, g = 0.03) { const f = 2400 + Math.random() * 1400; for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) tone(f + i * 120, 0.08, 'sine', g, 700, at + i * 0.11); }
function owl(at = 0) { tone(390, 0.35, 'sine', 0.05, -30, at, 0.9); tone(360, 0.55, 'sine', 0.05, -40, at + 0.5, 0.9); }
const arp = (notes, step = 0.08, type = 'triangle', g = 0.08, wet = 0.3) => notes.forEach((f, i) => tone(f, 0.35, type, g, 0, i * step, wet));

export const sfx = {
  click() { tone(660, 0.05, 'triangle', 0.05); },
  pick() { tone(520, 0.07, 'triangle', 0.06, 160); },
  chat() { tone(990, 0.05, 'sine', 0.035, 120); },
  ok() { arp([523, 659, 784], 0.06, 'triangle', 0.06); },
  bad() { tone(220, 0.18, 'square', 0.04, -60); },
  tick() { mo(0, 0.06); },
  howl() { howl(0, 1, 0.1); howl(0.9, 1.22, 0.05, 2.1); },
  howlOne() { howl(0, 0.95 + Math.random() * 0.2, 0.085, 2.2); },
  rooster() { rooster(0); },
  owl() { owl(0); },
  gong() { gong(0, 98, 0.13); },
  drum() { drum(0); },
  drumroll() { for (let i = 0; i < 14; i++) drum(i * 0.07, 0.07 + i * 0.012, 120); drum(1.05, 0.35, 70); },
  death() { gong(0, 82, 0.14, 3.6); tone(196, 1.2, 'triangle', 0.05, -90, 0.2, 0.8); },
  claw() { for (let i = 0; i < 3; i++) noise(0.16, 2800, 0.32, i * 0.09, 'highpass', 0.7, -1600); tone(140, 0.35, 'sawtooth', 0.05, -60, 0.05); },
  shot() { tone(320, 0.18, 'triangle', 0.1, -200); noise(0.05, 3000, 0.4); noise(0.25, 900, 0.25, 0.02, 'bandpass', 2, -600); },
  potion() { for (let i = 0; i < 7; i++) tone(300 + Math.random() * 600, 0.07, 'sine', 0.05, 300, i * 0.07); },
  poison() { tone(300, 0.5, 'sawtooth', 0.05, -200, 0, 0.5); for (let i = 0; i < 5; i++) tone(180 + Math.random() * 120, 0.09, 'sine', 0.05, -60, 0.1 + i * 0.08); },
  magic() { arp([1047, 1319, 1568, 2093, 2637], 0.07, 'sine', 0.045, 0.9); },
  shield() { tone(1200, 0.5, 'triangle', 0.05, 0, 0, 0.7); tone(1800, 0.4, 'sine', 0.03, 0, 0.02, 0.7); },
  heart() { tone(392, 0.12, 'sine', 0.08); tone(523, 0.18, 'sine', 0.08, 0, 0.14); arp([1568, 2093], 0.08, 'sine', 0.03, 0.8); },
  vote() { mo(0, 0.08); tone(300, 0.08, 'triangle', 0.05, -80); },
  reveal() { noise(0.3, 1500, 0.15, 0, 'bandpass', 1, 2500); tone(392, 0.4, 'triangle', 0.07, 0, 0.12, 0.5); },
  idiot() { arp([392, 330, 392, 523, 330, 784], 0.09, 'square', 0.04, 0.1); },
  win() { arp([523, 587, 659, 784, 880, 1047], 0.09, 'triangle', 0.08, 0.5); gong(0.6, 131, 0.08); },
  lose() { arp([440, 392, 349, 294], 0.16, 'triangle', 0.07, 0.6); },
  wolfwin() { howl(0, 1, 0.1); howl(0.4, 1.3, 0.07); howl(0.8, 0.85, 0.07); },
  heartbeat(g = 0.2) { tone(60, 0.13, 'sine', g, -10); tone(55, 0.13, 'sine', g * 0.7, -10, 0.19); },
};

// ---------- môi trường: dế (đêm), chim (ngày) ----------
let ambMode = null, ambT = null;
export function ambient(mode) {
  ambMode = mode; clearTimeout(ambT);
  if (!mode || muted) return;
  const loop = () => {
    if (ambMode !== mode || muted || !ac || ac.state !== 'running') { ambT = setTimeout(loop, 1500); return; }
    if (mode === 'night') { cricket(0, 0.016 + Math.random() * 0.012, Math.random() * 1.6 - 0.8); if (Math.random() < 0.5) cricket(0.18, 0.012, Math.random() * 1.6 - 0.8); if (Math.random() < 0.02) owl(0.3); if (Math.random() < 0.012) howl(0.2, 0.9 + Math.random() * 0.3, 0.03, 2); }
    else if (mode === 'day') { if (Math.random() < 0.4) bird(0, 0.018); }
    ambT = setTimeout(loop, mode === 'night' ? 380 + Math.random() * 700 : 1400 + Math.random() * 2600);
  };
  loop();
}

// ---------- nhạc nền: shared/audio/bgm.js – sảnh ma mị / ngày (đàn tranh) / đêm (đàn bầu + trống trầm) / bỏ phiếu (trống dồn) ----------
const bgm = createBGM({ game: 'masoi', ctx: actx, dest: () => musBus, legacy: ls.get('masoi-music'), volKey: 'masoi-vol', volDefault: 0.55 });
let tension = 0;
export const musicIsOn = () => bgm.isOn();
export function musicVolume(v) { return bgm.volume(v); }
export function musicToggle(v) { return bgm.toggle(v); }
export function musicResumeIfOn() { bgm.resumeIfOn(); }
export function setTension(v) { tension = v; }
export const getTension = () => tension;
export const musicStinger = k => bgm.stinger(k);
// mode: 'lobby' | 'day' | 'night' | 'vote'
export function music(mode) { bgm.mood(mode || 'lobby'); }

// ---------- người dẫn truyện (giọng đọc tiếng Việt của máy, nếu có) ----------
let voiceOn = ls.get('masoi-voice') === '1';
export const voiceIsOn = () => voiceOn;
export function voiceToggle() { voiceOn = !voiceOn; ls.set('masoi-voice', voiceOn ? '1' : '0'); if (!voiceOn) try { speechSynthesis.cancel(); } catch (e) {} return voiceOn; }
export function say(text) {
  if (!voiceOn || muted) return;
  try {
    const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, ''));
    u.lang = 'vi-VN'; u.rate = 0.95; u.pitch = 0.85;
    const v = speechSynthesis.getVoices().find(v => /^vi/i.test(v.lang)); if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) {}
}

// ---------- hiệu ứng DOM ----------
const layer = () => document.getElementById('fx-layer');
// banner xếp hàng: cái sau chờ cái trước tắt (tránh 2 dòng chữ to đè lên nhau, vd. "Thợ Săn" + "Bạn đã chết")
let bannerUntil = 0;
export function banner(html, cls = '', ms = 2200) {
  const now = Date.now(), wait = Math.max(0, bannerUntil - now);
  if (wait > 6000) return; // dồn quá nhiều thì bỏ bớt, đừng chiếu chữ cũ
  const dur = wait ? Math.min(ms, 1900) : ms;
  bannerUntil = now + wait + dur;
  setTimeout(() => {
    const n = document.createElement('div'); n.className = 'banner ' + cls; n.innerHTML = html; n.style.setProperty('--bd', Math.min(dur, 2200) + 'ms');
    layer().appendChild(n); setTimeout(() => n.remove(), dur);
  }, wait);
}
export function floatText(el, txt, cls = '') {
  if (!el) return; const r = el.getBoundingClientRect();
  const n = document.createElement('div'); n.className = 'float ' + cls; n.textContent = txt;
  n.style.left = (r.left + r.width / 2) + 'px'; n.style.top = (r.top + r.height * 0.3) + 'px';
  layer().appendChild(n); setTimeout(() => n.remove(), 1500);
}
export function pop(el, cls = 'pop') { if (!el || reduced()) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 900); }
export function flash(color = '#fff', ms = 600) {
  const n = document.createElement('div'); n.className = 'flash'; n.style.background = color; n.style.animationDuration = ms + 'ms';
  layer().appendChild(n); setTimeout(() => n.remove(), ms);
}
export function claw(el) {
  const n = document.createElement('div'); n.className = 'claw';
  n.innerHTML = '<svg viewBox="0 0 200 200"><path d="M40 20 Q90 90 70 185" /><path d="M85 10 Q135 85 118 190"/><path d="M130 18 Q175 90 160 180"/></svg>';
  if (el) { const r = el.getBoundingClientRect(); n.style.left = r.left + r.width / 2 - 60 + 'px'; n.style.top = r.top + r.height / 2 - 60 + 'px'; n.classList.add('small'); }
  layer().appendChild(n); setTimeout(() => n.remove(), 1400);
}
export function confetti(colors = ['#ffd23f', '#ff6b35', '#2fbf71', '#3a86ff', '#ff5d8f', '#fff']) {
  if (reduced()) return;
  const n = document.createElement('div'); n.className = 'confetti';
  for (let i = 0; i < 70; i++) { const c = document.createElement('i'); c.style.left = Math.random() * 100 + '%'; c.style.background = colors[i % colors.length]; c.style.animationDelay = Math.random() * 0.6 + 's'; c.style.animationDuration = 1.8 + Math.random() * 1.6 + 's'; c.style.setProperty('--x', (Math.random() * 200 - 100) + 'px'); c.style.setProperty('--r', (Math.random() * 720) + 'deg'); n.appendChild(c); }
  layer().appendChild(n); setTimeout(() => n.remove(), 4200);
}
export function shake(el) { pop(el, 'shake'); }
