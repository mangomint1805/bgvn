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
function loop() {
  while (nextT < ac.currentTime + .25) { scheduleStep(nextT); nextT += 60 / preset.bpm / 2; }
}

export function musicSetTheme(theme) {
  preset = PRESETS[theme] || PRESETS.desert; melody = buildMelody(preset);
  if (on && ac) { step = 0; nextT = ac.currentTime + .1; }
}
export function musicStart() {
  if (!preset) musicSetTheme('desert');
  ctx(); if (timer) return;
  step = 0; nextT = ac.currentTime + .1;
  timer = setInterval(loop, 60);
}
export function musicStop() { clearInterval(timer); timer = null; }
export function musicIsOn() { return on; }
export function musicToggle() { on = !on; try { localStorage.setItem('bangvn-music', on ? '1' : '0'); } catch (e) {} if (on) musicStart(); else musicStop(); return on; }
export function musicVolume(v) { if (v == null) return vol; vol = v; try { localStorage.setItem('bangvn-music-vol', String(v)); } catch (e) {} if (master) master.gain.value = vol * .35; }
// gọi khi người dùng tương tác lần đầu (trình duyệt chặn tự phát âm thanh)
export function musicResumeIfOn() { if (on) musicStart(); }
document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (on) ac.resume(); });
