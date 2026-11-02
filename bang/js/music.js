// Nhạc nền Viễn Tây tự sinh bằng WebAudio – không dùng file nhạc nên không dính bản quyền.
// Mỗi chủ đề một "ban nhạc": nhịp, giọng, hợp âm, nhạc cụ khác nhau. Giai điệu sinh từ seed cố định
// nên lặp lại đều như một bài hát.

const N = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz
const PRESETS = {
  desert: { bpm: 92,  root: 57, minor: true,  prog: [[0, 'm'], [8, 'M'], [10, 'M'], [0, 'm'], [0, 'm'], [5, 'm'], [7, 'M'], [0, 'm']], lead: 'whistle', bass: 'pluck', comp: 'strum', seed: 7, density: .55 },
  night:  { bpm: 68,  root: 50, minor: true,  prog: [[0, 'm'], [5, 'm'], [10, 'M'], [3, 'M'], [8, 'M'], [5, 'm'], [7, 'M'], [0, 'm']], lead: 'harmonica', bass: 'soft', comp: 'arp', seed: 3, density: .4 },
  saloon: { bpm: 126, root: 60, minor: false, prog: [[0, 'M'], [0, 'M'], [5, 'M'], [5, 'M'], [0, 'M'], [9, 'm'], [2, 'm'], [7, 'M']], lead: 'piano', bass: 'stride', comp: 'stride', seed: 11, density: .7 },
  sunset: { bpm: 84,  root: 52, minor: true,  prog: [[0, 'm'], [3, 'M'], [10, 'M'], [5, 'm'], [0, 'm'], [8, 'M'], [7, 'M'], [7, 'M']], lead: 'twang', bass: 'pluck', comp: 'tremolo', seed: 21, density: .5 },
  winter: { bpm: 76,  root: 55, minor: false, prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M'], [0, 'M'], [4, 'm'], [5, 'M'], [7, 'M']], lead: 'bell', bass: 'soft', comp: 'arp', seed: 5, density: .45 },
};

let ac = null, master = null, timer = null, preset = null, step = 0, nextT = 0, melody = [];
let vol = 0.5, on = false;
try { vol = +(localStorage.getItem('bangvn-music-vol') ?? .5); on = localStorage.getItem('bangvn-music') === '1'; } catch (e) {}

function ctx() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    master = ac.createGain(); master.gain.value = vol * 0.35;
    master.connect(comp); comp.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function rng(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

function chordNotes(p, bar) { const [deg, q] = p.prog[bar % p.prog.length]; const r = p.root + deg; return [r, r + (q === 'm' ? 3 : 4), r + 7]; }
function scale(p) { return p.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]; }
function buildMelody(p) {
  const R = rng(p.seed); const out = []; const sc = scale(p); const bars = p.prog.length * 2;
  let last = p.root + 12;
  for (let b = 0; b < bars; b++) {
    const ch = chordNotes(p, b).map(n => n + 12);
    for (let e = 0; e < 8; e++) {
      const strong = e % 4 === 0;
      if (!strong && R() > p.density) { out.push(null); continue; }
      let n;
      if (strong || R() < .5) n = ch[Math.floor(R() * 3)] + (R() < .3 ? 12 : 0);
      else { const deg = sc[Math.floor(R() * sc.length)]; n = p.root + 12 + deg + (R() < .4 ? 12 : 0); }
      while (n - last > 7) n -= 12; while (last - n > 7) n += 12;
      // cuối câu: về nốt gốc, ngân dài
      if (b % 4 === 3 && e === 4) { n = ch[0]; out.push({ n, len: 4 }); last = n; e += 3; for (let k = 0; k < 3; k++) out.push(null); continue; }
      out.push({ n, len: R() < .3 ? 2 : 1 }); last = n;
    }
  }
  return out;
}

// ---------- Nhạc cụ ----------
function env(g, t, a, peak, d, sustain = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d); }
function osc(type, f, t, dur, peak, a = .01, d = dur, filt = 0, dest = master, detune = 0) {
  const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
  const g = ac.createGain(); env(g, t, a, peak, d);
  let node = o;
  if (filt) { const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = filt; o.connect(f2); node = f2; }
  node.connect(g); g.connect(dest); o.start(t); o.stop(t + a + d + .05);
  return o;
}
const INST = {
  pluck(f, t, d) { const o = osc('triangle', f, t, d, .35, .005, Math.min(d, .5)); const o2 = osc('sawtooth', f, t, d, .06, .005, .15, 1800); },
  soft(f, t, d) { osc('sine', f, t, d, .3, .03, Math.min(d, .8)); },
  strum(ch, t) { ch.forEach((n, i) => { osc('triangle', N(n), t + i * .018, .4, .09, .005, .35); osc('sawtooth', N(n), t + i * .018, .2, .025, .005, .12, 2500); }); },
  arp(ch, t, beat) { const n = ch[[0, 1, 2, 1][beat % 4]] + 12; osc('sine', N(n), t, .5, .07, .01, .45); },
  stride(ch, t, beat, bass) { if (beat % 2 === 0) { osc('triangle', N(bass - 12), t, .3, .3, .005, .25); osc('square', N(bass - 12), t, .2, .04, .005, .15, 900); } else ch.forEach(n => { osc('triangle', N(n), t, .2, .08, .005, .18); osc('square', N(n), t, .15, .02, .005, .1, 1600, master, 8); }); },
  tremolo(ch, t, beat) { for (let k = 0; k < 2; k++) ch.forEach(n => osc('sawtooth', N(n), t + k * .16, .14, .025, .01, .12, 1400)); },
  whistle(f, t, d) {
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * .97, t); o.frequency.exponentialRampToValueAtTime(f, t + .06);
    const lfo = ac.createOscillator(); lfo.frequency.value = 5.5; const lg = ac.createGain(); lg.gain.value = f * .012; lfo.connect(lg); lg.connect(o.frequency);
    const g = ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.16, t + .05); g.gain.setValueAtTime(.16, t + d * .7); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); lfo.start(t); o.stop(t + d + .05); lfo.stop(t + d + .05);
  },
  harmonica(f, t, d) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const lfo = ac.createOscillator(); lfo.frequency.value = 4.5; const lg = ac.createGain(); lg.gain.value = 6; lfo.connect(lg); lg.connect(o.detune);
    const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f * 2; fl.Q.value = 1.2;
    const g = ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .08); g.gain.setValueAtTime(.1, t + d * .8); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(fl); fl.connect(g); g.connect(master); o.start(t); lfo.start(t); o.stop(t + d + .05); lfo.stop(t + d + .05);
  },
  piano(f, t, d) { osc('triangle', f, t, d, .16, .004, Math.min(1, d + .3)); osc('square', f, t, d, .025, .004, .25, 2400, master, -6); osc('square', f, t, d, .02, .004, .25, 2400, master, 7); },
  twang(f, t, d) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 6; fl.frequency.setValueAtTime(3200, t); fl.frequency.exponentialRampToValueAtTime(500, t + Math.min(.6, d));
    const g = ac.createGain(); env(g, t, .005, .1, Math.min(1.2, d + .2));
    const trem = ac.createOscillator(); trem.frequency.value = 6; const tg = ac.createGain(); tg.gain.value = .03; trem.connect(tg); tg.connect(g.gain);
    o.connect(fl); fl.connect(g); g.connect(master); o.start(t); trem.start(t); o.stop(t + d + .3); trem.stop(t + d + .3);
  },
  bell(f, t, d) { osc('sine', f, t, d, .12, .003, 1.4); osc('sine', f * 2.76, t, d, .03, .003, .6); osc('sine', f * 5.4, t, d, .012, .003, .3); },
};

function scheduleStep(t) {
  const p = preset; const e8 = 60 / p.bpm / 2; // độ dài nốt móc đơn
  const bar = Math.floor(step / 8) % (p.prog.length * 2); const e = step % 8; const beat = Math.floor(e / 2);
  const ch = chordNotes(p, bar); const bassN = ch[0] - 12;
  // bass + đệm
  if (e % 2 === 0) {
    if (p.comp === 'stride') INST.stride(ch, t, beat, ch[0]);
    else {
      if (beat === 0) INST[p.bass](N(bassN), t, e8 * 3);
      if (beat === 2) INST[p.bass](N(bassN + 7), t, e8 * 3);
      if (p.comp === 'strum' && (beat === 1 || beat === 3)) INST.strum(ch, t);
      if (p.comp === 'arp') INST.arp(ch, t, beat);
      if (p.comp === 'tremolo' && (beat === 1 || beat === 3)) INST.tremolo(ch, t, beat);
    }
  }
  if (p.comp === 'arp' && e % 2 === 1) INST.arp(ch, t, beat + 2);
  // giai điệu (nghỉ ở vòng đầu cho đỡ dồn dập)
  const m = melody[step % melody.length];
  if (m && step >= 16) INST[p.lead](N(m.n), t, e8 * m.len * .95);
  step++;
}
// Dựng sẵn cả vòng nhạc thành 1 đoạn âm thanh rồi phát lặp: không phụ thuộc bộ hẹn giờ,
// nên chuyển tab/thu nhỏ cửa sổ nhạc vẫn chạy đều (trình duyệt làm chậm hẹn giờ ở tab nền).
const cacheBuf = {}; let src = null, srcGain = null, themeKey = 'desert', want = 0;
// Nhạc thay đổi theo diễn biến: 3 lớp cùng nhịp phát song song
//  - lớp 0: giai điệu chính (luôn có)
//  - lớp 1: trống + bass dồn dập (khi trận căng: có người sắp chết, còn ít người)
//  - lớp 2: tiếng dây rền + trống trận (cực căng: đấu súng, còn 2 người, bạn còn 1 máu)
// cộng thêm "đoạn nhạc ngắn" (stinger) khi có người bị loại / thắng / thua.
function fold(r, L, tail) {
  const out = ac.createBuffer(2, L, r.sampleRate);
  for (let c = 0; c < 2; c++) { const d = r.getChannelData(c), o = out.getChannelData(c); o.set(d.subarray(0, L)); for (let i = 0; i < tail && L + i < d.length; i++) o[i] += d[L + i]; }
  return out;
}
function noiseBuf(c, dur) { const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate); const x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; return b; }
function hit(c, dest, t, kind, g = 1) {
  if (kind === 'kick') { const o = c.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .14); const v = c.createGain(); v.gain.setValueAtTime(.9 * g, t); v.gain.exponentialRampToValueAtTime(.001, t + .3); o.connect(v); v.connect(dest); o.start(t); o.stop(t + .32); return; }
  const n = c.createBufferSource(); n.buffer = noiseBuf(c, kind === 'hat' ? .05 : .2); const f = c.createBiquadFilter();
  f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : kind === 'tom' ? 400 : 1800;
  const v = c.createGain(); const dur = kind === 'hat' ? .05 : kind === 'tom' ? .35 : .18;
  v.gain.setValueAtTime((kind === 'hat' ? .18 : kind === 'tom' ? .7 : .45) * g, t); v.gain.exponentialRampToValueAtTime(.001, t + dur);
  n.connect(f); f.connect(v); v.connect(dest); n.start(t);
  if (kind === 'snare') { const o = c.createOscillator(); o.frequency.value = 190; const w = c.createGain(); w.gain.setValueAtTime(.25 * g, t); w.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(w); w.connect(dest); o.start(t); o.stop(t + .12); }
}
async function renderLoop(key) {
  if (cacheBuf[key]) return cacheBuf[key];
  const p = PRESETS[key]; const mel = buildMelody(p); const e8 = 60 / p.bpm / 2;
  const steps = mel.length, sr = ac.sampleRate, L = Math.round(steps * e8 * sr), tail = Math.round(2.5 * sr);
  // lớp 0
  const off = new OfflineAudioContext(2, L + tail, sr);
  const save = [ac, master, preset, melody, step];
  ac = off; master = off.createGain(); master.connect(off.destination); preset = p; melody = mel; step = steps;
  try { for (let k = 0; k < steps; k++) scheduleStep(k * e8); } finally { [ac, master, preset, melody, step] = save; }
  // lớp 1: trống + bass móc
  const o1 = new OfflineAudioContext(2, L + tail, sr), d1 = o1.destination;
  for (let k = 0; k < steps; k++) {
    const t = k * e8, e = k % 8, bar = Math.floor(k / 8);
    if (e === 0 || e === 4 || (e === 7 && bar % 2)) hit(o1, d1, t, 'kick');
    if (e === 2 || e === 6) hit(o1, d1, t, 'snare', .8);
    hit(o1, d1, t, 'hat', e % 2 ? .6 : 1);
    const ch = chordNotes(p, bar % (p.prog.length * 2)); const bn = N(ch[e % 4 === 2 ? 2 : 0] - 24);
    const o = o1.createOscillator(); o.type = 'sawtooth'; o.frequency.value = bn; const fl = o1.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 500;
    const v = o1.createGain(); v.gain.setValueAtTime(.12, t); v.gain.exponentialRampToValueAtTime(.001, t + e8 * .9); o.connect(fl); fl.connect(v); v.connect(d1); o.start(t); o.stop(t + e8);
  }
  // lớp 2: dây rền tremolo + trống trận
  const o2 = new OfflineAudioContext(2, L + tail, sr), d2 = o2.destination;
  for (let k = 0; k < steps; k++) {
    const t = k * e8, e = k % 8, bar = Math.floor(k / 8);
    if (e % 2 === 0) hit(o2, d2, t, 'tom', e === 0 ? 1 : .55);
    if (e === 0) {
      const ch = chordNotes(p, bar % (p.prog.length * 2));
      for (const n of [ch[0] - 12, ch[2] - 12, ch[0]]) {
        const o = o2.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(n);
        const fl = o2.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1100;
        const v = o2.createGain(); const dur = e8 * 8;
        v.gain.setValueAtTime(.0001, t); v.gain.exponentialRampToValueAtTime(.05, t + .15); v.gain.setValueAtTime(.05, t + dur - .1); v.gain.exponentialRampToValueAtTime(.0001, t + dur);
        const lfo = o2.createOscillator(); lfo.frequency.value = 9; const lg = o2.createGain(); lg.gain.value = .03; lfo.connect(lg); lg.connect(v.gain);
        o.connect(fl); fl.connect(v); v.connect(d2); o.start(t); lfo.start(t); o.stop(t + dur); lfo.stop(t + dur);
      }
    }
  }
  const [r0, r1, r2] = await Promise.all([off.startRendering(), o1.startRendering(), o2.startRendering()]);
  return (cacheBuf[key] = [fold(r0, L, tail), fold(r1, L, tail), fold(r2, L, tail)]);
}
let layers = [], level = 0; const LEVEL_GAIN = [[1, 0, 0], [1, .75, 0], [.85, .9, .8]];
async function play() {
  const my = ++want; const bufs = await renderLoop(themeKey); if (my !== want || !on) return;
  const t = ac.currentTime, old = layers;
  layers = bufs.map((b, i) => {
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(Math.max(.0001, LEVEL_GAIN[Math.max(0, level)][i]), t + .8); g.connect(master);
    const s2 = ac.createBufferSource(); s2.buffer = b; s2.loop = true; s2.connect(g); s2.start(t + .05); return { s: s2, g };
  });
  src = layers[0].s;
  for (const x of old) { x.g.gain.setValueAtTime(x.g.gain.value, t); x.g.gain.linearRampToValueAtTime(0.0001, t + .8); x.s.stop(t + .9); }
}
// 0 = bình thường, 1 = căng, 2 = cực căng
export function musicIntensity(lv) {
  lv = Math.max(0, Math.min(2, lv | 0)); if (lv === level) return; level = lv;
  if (!ac || !layers.length) return; const t = ac.currentTime;
  layers.forEach((x, i) => { x.g.gain.cancelScheduledValues(t); x.g.gain.setValueAtTime(x.g.gain.value, t); x.g.gain.linearRampToValueAtTime(Math.max(.0001, LEVEL_GAIN[lv][i]), t + 2.5); });
}
// đoạn nhạc ngắn khi có biến
export function musicStinger(kind) {
  if (!on || !ac) return; const t = ac.currentTime + .05;
  const duck = (dur) => layers.forEach(x => { const v = x.g.gain.value; x.g.gain.cancelScheduledValues(t); x.g.gain.setValueAtTime(v, t); x.g.gain.linearRampToValueAtTime(v * .25, t + .15); x.g.gain.setValueAtTime(v * .25, t + dur); x.g.gain.linearRampToValueAtTime(Math.max(.0001, LEVEL_GAIN[Math.max(0, level)][layers.indexOf(x)]), t + dur + 1.2); });
  const nt = (f, at, d, type = 'triangle', g = .2) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; const v = ac.createGain(); v.gain.setValueAtTime(.0001, t + at); v.gain.exponentialRampToValueAtTime(g, t + at + .02); v.gain.exponentialRampToValueAtTime(.0001, t + at + d); o.connect(v); v.connect(master); o.start(t + at); o.stop(t + at + d + .05); };
  const r = (PRESETS[themeKey] || PRESETS.desert).root;
  if (kind === 'death') { duck(2.2); [12, 8, 5, 0].forEach((k, i) => nt(N(r + k), i * .32, .6, 'sawtooth', .07)); nt(N(r - 12), 1.3, 1.6, 'triangle', .25); }
  else if (kind === 'duel') { duck(2.4); nt(N(r), 0, 2.2, 'sawtooth', .06); nt(N(r + 6), 0, 2.2, 'sawtooth', .05); [0, .5, 1, 1.25, 1.5].forEach(a => nt(70, a, .3, 'sine', .5)); }
  else if (kind === 'win') { [0, 4, 7, 12, 7, 12, 16].forEach((k, i) => nt(N(r + 12 + k), i * .16, .5, 'square', .06)); nt(N(r + 12), 1.15, 1.8, 'triangle', .2); layers.forEach(x => { x.g.gain.setValueAtTime(x.g.gain.value, t); x.g.gain.linearRampToValueAtTime(.0001, t + 2); }); level = -1; }
  else if (kind === 'lose') { [7, 6, 5, 0].forEach((k, i) => nt(N(r + k), i * .45, .7, 'sawtooth', .06)); layers.forEach(x => { x.g.gain.setValueAtTime(x.g.gain.value, t); x.g.gain.linearRampToValueAtTime(.0001, t + 2); }); level = -1; }
}

export function musicSetTheme(theme) {
  themeKey = PRESETS[theme] ? theme : 'desert';
  if (on && ac && layers.length) play();
}
export function musicStart() {
  ctx(); if (layers.length) { if (layers[0].g.gain.value < .01) play(); return; }
  play();
}
export function musicStop() { want++; for (const x of layers) try { x.s.stop(); } catch (e) {} layers = []; src = null; }
export function musicIsOn() { return on; }
export function musicToggle() { on = !on; try { localStorage.setItem('bangvn-music', on ? '1' : '0'); } catch (e) {} if (on) musicStart(); else musicStop(); return on; }
export function musicVolume(v) { if (v == null) return vol; vol = v; try { localStorage.setItem('bangvn-music-vol', String(v)); } catch (e) {} if (master) master.gain.value = vol * .35; }
// gọi khi người dùng tương tác lần đầu (trình duyệt chặn tự phát âm thanh)
export function musicResumeIfOn() { if (on) musicStart(); }
// quay lại tab: nếu trình duyệt lỡ tạm dừng âm thanh thì bật lại
document.addEventListener('visibilitychange', () => { if (ac && !document.hidden && on && ac.state !== 'running') ac.resume(); });
