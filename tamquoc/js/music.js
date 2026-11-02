// Nhạc nền cổ phong tự tổng hợp bằng WebAudio – thang ngũ cung (Cung Thương Giốc Chuỷ Vũ), không dùng file nhạc.
// Tổng hợp sẵn vòng nhạc thẳng ra mẫu âm (nhẹ máy) rồi phát lặp; 3 lớp cùng nhịp đổi cường độ theo diễn biến:
//  lớp 0: đàn tranh rải + sáo trúc (luôn có) · lớp 1: trống da + bass (căng) · lớp 2: trống trận + tỳ bà vê (cực căng)
const N = n => 440 * Math.pow(2, (n - 69) / 12);
const PENTA = [0, 2, 4, 7, 9]; // cung thương giốc chuỷ vũ
const P = { bpm: 84, root: 57, seed: 17, bars: 16 }; // Vũ điệu (La) – buồn hào hùng
const prog = [0, 0, 3, 4, 0, 0, 2, 4, 3, 3, 0, 4, 2, 3, 4, 0]; // bậc ngũ cung làm "nền" mỗi ô nhịp

let ac = null, master = null, on = false, vol = .5, layers = [], level = 0, want = 0, cache = null;
try { vol = +(localStorage.getItem('tqs-music-vol') ?? .5); on = localStorage.getItem('tqs-music') === '1'; } catch (e) {}
const LEVEL_GAIN = [[1, 0, 0], [.9, .8, 0], [.8, .9, .85]];

function ctx() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    master = ac.createGain(); master.gain.value = vol * .4; master.connect(comp); comp.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const deg = (d) => P.root + 12 * Math.floor(d / 5) + PENTA[((d % 5) + 5) % 5]; // bậc ngũ cung → MIDI

function buildMelody() {
  const R = rng(P.seed); const out = []; let cur = 7;
  for (let b = 0; b < P.bars; b++) {
    const base = prog[b] + 5;
    for (let e = 0; e < 8; e++) {
      const strong = e === 0 || e === 4;
      if (b % 4 === 3 && e >= 4) { if (e === 4) out.push({ d: base + (b === P.bars - 1 ? 0 : 2), len: 4 }); else out.push(null); continue; }
      if (!strong && R() < .38) { out.push(null); continue; }
      let step = strong ? (R() < .5 ? 0 : (R() < .5 ? 1 : -1)) : Math.round((R() - .5) * 3);
      cur = Math.max(4, Math.min(12, (strong ? base + (R() < .5 ? 0 : 2) : cur) + step));
      out.push({ d: cur, len: R() < .25 ? 2 : 1 });
    }
  }
  return out;
}
// ---- nhạc cụ: tổng hợp thẳng ra mẫu âm (Float32Array) – nhanh hơn rất nhiều so với dựng đồ thị node ----
const SR = 22050;
function mkBuf(n) { return [new Float32Array(n), new Float32Array(n)]; }
function put(B, i, v, pan) { if (i >= 0 && i < B[0].length) { B[0][i] += v * (1 - pan); B[1][i] += v * (1 + pan); } }
const expK = (dur, g) => Math.exp(Math.log(.001 / Math.max(.002, g)) / (dur * SR)); // hệ số giảm mỗi mẫu để từ g về .001 sau dur giây
let nseed = 12345; const noise = () => { nseed = (nseed * 1103515245 + 12345) & 0x7fffffff; return nseed / 0x3fffffff - 1; };
// đàn tranh: dây gảy Karplus–Strong + luyến nhẹ
function pluck(B, f, t, dur, g = .25, pan = 0) {
  const P0 = Math.max(2, Math.round(SR / f)); const ring = new Float32Array(P0);
  let lp = 0; for (let i = 0; i < P0; i++) { lp = lp * .5 + noise() * .5; ring[i] = lp; }
  const len = Math.round(Math.min(2.4, dur + 1.2) * SR), i0 = Math.round(t * SR), damp = .996 - Math.min(.012, f / 90000);
  let k = 0, fade = 1; const fstart = len - Math.round(.12 * SR);
  for (let n = 0; n < len; n++) {
    const a = ring[k], b2 = ring[(k + 1) % P0]; const y = (a + b2) * .5 * damp; ring[k] = y; k = (k + 1) % P0;
    if (n > fstart) fade = (len - n) / (len - fstart);
    put(B, i0 + n, y * g * 2.2 * fade, pan);
  }
}
// sáo trúc: sin + hoạ âm 2 + rung dần + hơi thổi
function flute(B, f, t, dur, g = .11) {
  const i0 = Math.round(t * SR), len = Math.round((dur + .1) * SR), att = .07 * SR, rel = .09 * SR;
  let ph = 0, ph2 = 0, lpn = 0;
  for (let n = 0; n < len; n++) {
    const tt = n / SR; const vib = 1 + Math.min(1, tt / (dur * .6 + .01)) * .012 * Math.sin(2 * Math.PI * 5.2 * tt);
    const bend = tt < .08 ? .985 + .015 * tt / .08 : 1;
    ph += 2 * Math.PI * f * vib * bend / SR; ph2 += 4 * Math.PI * f * vib * bend / SR;
    let env = n < att ? n / att : n > len - rel ? Math.max(0, (len - n) / rel) : 1 - .1 * (n / len);
    lpn = lpn * .9 + noise() * .1;
    const breath = tt < .15 ? lpn * (1 - tt / .15) * .6 : lpn * .08;
    put(B, i0 + n, (Math.sin(ph) + .12 * Math.sin(ph2) + breath) * g * env, .15);
  }
}
// trống: thân (sin quét tần) + mặt (tiếng ồn)
function drum(B, t, kind, g = 1) {
  const i0 = Math.round(t * SR);
  if (kind === 'big' || kind === 'mid') {
    const [f1, f2, sw, dur, amp] = kind === 'big' ? [110, 48, .25, .55, .9] : [190, 120, .12, .2, .35];
    const k = expK(dur, amp * g); let e = amp * g, ph = 0; const len = Math.round(dur * SR);
    for (let n = 0; n < len; n++) { const tt = n / SR; const fr = tt < sw ? f1 * Math.pow(f2 / f1, tt / sw) : f2; ph += 2 * Math.PI * fr / SR; put(B, i0 + n, Math.sin(ph) * e, 0); e *= k; }
  }
  const nd = kind === 'rim' ? .05 : .2, amp = (kind === 'rim' ? .14 : kind === 'big' ? .32 : .28) * g; let e = amp, lp = 0, prev = 0; const k = expK(nd, amp);
  for (let n = 0, len = Math.round(nd * SR); n < len; n++) { const x = noise(); let y; if (kind === 'rim') { y = x - prev; prev = x; } else { lp = lp * (kind === 'big' ? .85 : .7) + x * (kind === 'big' ? .15 : .3); y = lp * 2; } put(B, i0 + n, y * e, kind === 'rim' ? .3 : 0); e *= k; }
}
const tri = ph => { const x = (ph / (2 * Math.PI)) % 1; return 1 - 4 * Math.abs(x - .5); };
function tone(B, f, t, dur, g, pan = 0) { // bass / tỳ bà: tam giác tắt dần
  const i0 = Math.round(t * SR), len = Math.round(dur * SR), k = expK(dur, g); let e = g, ph = 0;
  for (let n = 0; n < len; n++) { ph += 2 * Math.PI * f / SR; put(B, i0 + n, tri(ph) * e * Math.min(1, n / 40), pan); e *= k; }
}
function gongHit(B, f, t, g) { [1, 1.47, 2.09].forEach((m, i) => { const i0 = Math.round(t * SR), len = Math.round(2.4 * SR), k = expK(2.4, g / (i + 1)); let e = g / (i + 1), ph = 0; for (let n = 0; n < len; n++) { ph += 2 * Math.PI * f * m / SR; put(B, i0 + n, Math.sin(ph) * e, 0); e *= k; } }); }
function toBuffer(B, L, tail) {
  const out = ac.createBuffer(2, L, SR);
  for (let ch = 0; ch < 2; ch++) { const d = B[ch], o = new Float32Array(L); o.set(d.subarray(0, L)); for (let i = 0; i < tail && L + i < d.length; i++) o[i] += d[L + i]; out.copyToChannel(o, ch); }
  return out;
}
const yieldUI = () => new Promise(r => setTimeout(r, 0));
async function render() {
  if (cache) return cache;
  const t0 = performance.now();
  const mel = buildMelody(); const e8 = 60 / P.bpm / 2; const steps = mel.length;
  const L = Math.round(steps * e8 * SR), tail = Math.round(2.5 * SR);
  // lớp 0: đàn tranh rải hợp âm ngũ cung + sáo
  const B0 = mkBuf(L + tail);
  for (let k = 0; k < steps; k++) {
    const t = k * e8, bar = Math.floor(k / 8), e = k % 8, base = prog[bar];
    const arp = [base, base + 2, base + 4, base + 5, base + 4, base + 2, base + 3, base + 5][e];
    pluck(B0, N(deg(arp) - 12), t, e8 * 2, e === 0 ? .2 : .12, e % 2 ? .25 : -.25);
    if (e === 0) pluck(B0, N(deg(base) - 24), t, e8 * 6, .2, 0);
    const m = mel[k]; if (m && k >= 16) flute(B0, N(deg(m.d)), t, e8 * m.len * .95);
  }
  await yieldUI();
  // lớp 1: trống da + bass
  const B1 = mkBuf(L + tail);
  for (let k = 0; k < steps; k++) {
    const t = k * e8, e = k % 8, bar = Math.floor(k / 8);
    if (e === 0 || e === 3 || e === 6) drum(B1, t, 'big', e === 0 ? 1 : .6);
    if (e === 4) drum(B1, t, 'mid');
    drum(B1, t, 'rim', e % 2 ? .5 : .9);
    if (e % 2 === 0) tone(B1, N(deg(prog[bar]) - 24), t, e8 * 1.8, .22);
  }
  await yieldUI();
  // lớp 2: trống trận dồn + tỳ bà vê + chiêng
  const B2 = mkBuf(L + tail);
  for (let k = 0; k < steps; k++) {
    const t = k * e8, e = k % 8, bar = Math.floor(k / 8);
    drum(B2, t, 'big', e % 2 ? .4 : .75); drum(B2, t + e8 / 2, 'mid', .35);
    const f = N(deg(prog[bar] + 5));
    for (let r = 0; r < 2; r++) tone(B2, f, t + r * e8 / 2, .2, .08, r ? .3 : -.3);
    if (e === 0 && bar % 2 === 0) gongHit(B2, N(P.root - 24), t, .1);
  }
  cache = [toBuffer(B0, L, tail), toBuffer(B1, L, tail), toBuffer(B2, L, tail)];
  if (typeof window !== 'undefined') window.__musicMs = Math.round(performance.now() - t0);
  return cache;
}
async function play() {
  const my = ++want; ctx(); const bufs = await render(); if (my !== want || !on) return;
  const t = ac.currentTime, old = layers;
  layers = bufs.map((b, i) => {
    const g = ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(Math.max(.0001, LEVEL_GAIN[Math.max(0, level)][i]), t + 1); g.connect(master);
    const s = ac.createBufferSource(); s.buffer = b; s.loop = true; s.connect(g); s.start(t + .05); return { s, g };
  });
  for (const x of old) { x.g.gain.setValueAtTime(x.g.gain.value, t); x.g.gain.linearRampToValueAtTime(.0001, t + .8); x.s.stop(t + .9); }
}
// 0 = bình thường, 1 = căng, 2 = cực căng
export function musicIntensity(lv) {
  lv = Math.max(0, Math.min(2, lv | 0)); if (lv === level) return; level = lv;
  if (!ac || !layers.length) return; const t = ac.currentTime;
  layers.forEach((x, i) => { x.g.gain.cancelScheduledValues(t); x.g.gain.setValueAtTime(x.g.gain.value, t); x.g.gain.linearRampToValueAtTime(Math.max(.0001, LEVEL_GAIN[lv][i]), t + 2.5); });
}
export function musicStinger(kind) {
  if (!on || !ac) return; const t = ac.currentTime + .05;
  const nt = (f, at, d, type = 'triangle', g = .2) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; const v = ac.createGain(); v.gain.setValueAtTime(.0001, t + at); v.gain.exponentialRampToValueAtTime(g, t + at + .02); v.gain.exponentialRampToValueAtTime(.0001, t + at + d); o.connect(v); v.connect(master); o.start(t + at); o.stop(t + at + d + .05); };
  const duck = dur => layers.forEach((x, i) => { const v = x.g.gain.value; x.g.gain.cancelScheduledValues(t); x.g.gain.setValueAtTime(v, t); x.g.gain.linearRampToValueAtTime(v * .25, t + .15); x.g.gain.setValueAtTime(v * .25, t + dur); x.g.gain.linearRampToValueAtTime(Math.max(.0001, LEVEL_GAIN[Math.max(0, level)][i]), t + dur + 1.2); });
  if (kind === 'death') { duck(2.4); [9, 7, 4, 0].forEach((k, i) => nt(N(P.root + k), i * .35, .7, 'sawtooth', .05)); nt(N(P.root - 24), 1.4, 2, 'sine', .3); }
  else if (kind === 'duel') { duck(2); [0, .25, .5, .62, .75].forEach(a => nt(70, a, .3, 'sine', .5)); nt(N(P.root), 0, 1.8, 'sawtooth', .04); }
  else if (kind === 'win') { [0, 2, 4, 7, 9, 12, 16].forEach((k, i) => nt(N(P.root + 12 + k), i * .15, .55, 'triangle', .12)); nt(N(P.root + 12), 1.1, 2, 'triangle', .2); layers.forEach(x => { x.g.gain.setValueAtTime(x.g.gain.value, t); x.g.gain.linearRampToValueAtTime(.0001, t + 2); }); level = -1; }
  else if (kind === 'lose') { [9, 7, 4, 2, 0].forEach((k, i) => nt(N(P.root + k), i * .4, .7, 'sawtooth', .05)); layers.forEach(x => { x.g.gain.setValueAtTime(x.g.gain.value, t); x.g.gain.linearRampToValueAtTime(.0001, t + 2); }); level = -1; }
}
export function musicStart() { ctx(); if (layers.length) { if (layers[0].g.gain.value < .01) { level = 0; play(); } return; } level = Math.max(0, level); play(); }
export function musicStop() { want++; for (const x of layers) try { x.s.stop(); } catch (e) {} layers = []; }
export function musicIsOn() { return on; }
export function musicToggle() { on = !on; try { localStorage.setItem('tqs-music', on ? '1' : '0'); } catch (e) {} if (on) musicStart(); else musicStop(); return on; }
export function musicVolume(v) { if (v == null) return vol; vol = v; try { localStorage.setItem('tqs-music-vol', String(v)); } catch (e) {} if (master) master.gain.value = vol * .4; }
export function musicResumeIfOn() { if (on) musicStart(); }
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (ac && !document.hidden && on && ac.state !== 'running') ac.resume(); });
