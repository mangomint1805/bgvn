// Bộ tổng hợp nhạc nền BGVN: dựng cả vòng nhạc thẳng ra mẫu âm (Float32Array) bằng JS thuần, rồi phát lặp bằng 1 AudioBufferSource.
// → Lúc phát gần như không tốn CPU (điện thoại mát máy), chuyển tab/khoá máy không lệch nhịp. Không dùng file nhạc, giai điệu tự sinh.
// Chạy được cả trong Node (test) vì không đụng tới WebAudio.
export const SR = 24000;
const TW = 8192, SIN = new Float32Array(TW + 1);
for (let i = 0; i <= TW; i++) SIN[i] = Math.sin(i / TW * Math.PI * 2);
const sn = ph => SIN[((ph - Math.floor(ph)) * TW) | 0]; // ph tính theo vòng (cycle)
export const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
export function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const NOISE = (() => { const r = rng(99), x = new Float32Array(SR); for (let i = 0; i < SR; i++) x[i] = r() * 2 - 1; return x; })();
const nz = i => NOISE[i % SR];

// ---------- lọc ----------
function biquad(x, type, f, Q = 0.707) {
  const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * Q);
  let b0, b1, b2; const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
  else { b0 = al; b1 = 0; b2 = -al; } // bandpass
  b0 /= a0; b1 /= a0; b2 /= a0; const A1 = a1 / a0, A2 = a2 / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - A1 * y1 - A2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y; }
  return x;
}
function lp1(x, f) { const k = 1 - Math.exp(-2 * Math.PI * f / SR); let y = 0; for (let i = 0; i < x.length; i++) { y += k * (x[i] - y); x[i] = y; } return x; }
// đường bao ADSR nhân vào x (dur = lúc nhả phím)
function adsr(x, a, d, s, dur, r) {
  const n = x.length, ia = Math.max(1, a * SR), id = Math.max(1, d * SR), iu = dur * SR, ir = Math.max(1, r * SR);
  let lvAtRel = s;
  for (let i = 0; i < n; i++) {
    let e;
    if (i < ia) e = i / ia; else if (i < ia + id) e = 1 - (1 - s) * ((i - ia) / id); else e = s;
    if (i >= iu) { if (i === Math.floor(iu)) lvAtRel = e; e = lvAtRel * Math.max(0, 1 - (i - iu) / ir); }
    x[i] *= e;
  }
  return x;
}
const fadeEdges = (x, ms = 4) => { const k = Math.min(x.length >> 1, Math.round(ms * SR / 1000)); for (let i = 0; i < k; i++) { x[i] *= i / k; x[x.length - 1 - i] *= i / k; } return x; };

// ---------- nhạc cụ cơ bản ----------
// dây gảy Karplus-Strong (guitar, đàn tranh, đàn nguyệt, oud, bass…)
function ks(f, dur, { t60 = 1.5, bright = 0.5, ring = 0, rel = 0.08, seed = 1 } = {}) {
  const life = ring ? Math.min(ring, t60 * 1.1) : Math.min(dur + rel, t60 * 1.1);
  const n = Math.max(32, Math.ceil(life * SR)), y = new Float32Array(n);
  const P = SR / f, d = P - 0.5, N = Math.max(1, Math.floor(d)), fr = d - N;
  const g = Math.pow(0.001, 1 / (f * t60)), ex = Math.ceil(P);
  let lp = 0, pd = 0, o = (seed * 7919) % SR;
  for (let i = 0; i < n; i++) {
    let x = 0; if (i < ex) { lp += bright * (nz(o + i) - lp); x = lp; }
    const a = i - N >= 0 ? y[i - N] : 0, b = i - N - 1 >= 0 ? y[i - N - 1] : 0, del = a * (1 - fr) + b * fr;
    y[i] = x + g * 0.5 * (del + pd); pd = del;
  }
  if (!ring) { const iu = Math.floor(Math.min(dur, life) * SR), ir = Math.max(1, rel * SR); for (let i = iu; i < n; i++) y[i] *= Math.max(0, 1 - (i - iu) / ir); }
  return fadeEdges(y, 2);
}
// cộng hoạ âm: p = [[tỉ lệ, biên độ, thời gian tắt (0 = giữ)]], có luyến (bend) + rung (vib) + tremolo
function additive(f, dur, { p = [[1, 1, 0]], a = 0.01, d = 0.1, s = 1, r = 0.1, vib = 0, vibRate = 5.5, vibDelay = 0.15, bend = 0, bendT = 0.08, trem = 0, tremRate = 6, breath = 0, bf = 2000 } = {}) {
  const n = Math.ceil((dur + r) * SR), out = new Float32Array(n);
  const mult = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR; let m = 1;
    if (bend) m *= Math.pow(2, (bend * Math.max(0, 1 - t / bendT)) / 12);
    if (vib) m *= Math.pow(2, vib * Math.min(1, Math.max(0, (t - vibDelay) / 0.25)) * SIN[((t * vibRate % 1) * TW) | 0] / 12);
    mult[i] = m;
  }
  for (const [ra, am, dc] of p) {
    if (f * ra * 1.06 > SR * 0.45) continue;
    const inc = f * ra / SR, k = dc ? Math.exp(-1 / (dc * SR)) : 1; let ph = 0, e = am;
    for (let i = 0; i < n; i++) { ph += inc * mult[i]; if (ph >= 1) ph -= 1; out[i] += e * SIN[(ph * TW) | 0]; e *= k; }
  }
  if (breath) { const b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = nz(i * 3 + 777); biquad(b, 'bp', bf, 1.2); for (let i = 0; i < n; i++) out[i] += b[i] * breath; }
  if (trem) for (let i = 0; i < n; i++) out[i] *= 1 - trem * (0.5 + 0.5 * SIN[(((i / SR) * tremRate % 1) * TW) | 0]);
  adsr(out, a, d, s, dur, r);
  return fadeEdges(out);
}
// FM 2 toán tử (piano điện, chuông, kèn đồng)
function fm(f, dur, { ratio = 1, index = 2, index2 = 0.3, idec = 0.3, a = 0.005, d = 0.4, s = 0.3, r = 0.2, cr = 1 } = {}) {
  const n = Math.ceil((dur + r) * SR), out = new Float32Array(n);
  const mi = f * ratio / SR, ci = f * cr / SR, k = Math.exp(-1 / (idec * SR)); let mp = 0, cp = 0, I = index - index2;
  for (let i = 0; i < n; i++) { mp += mi; if (mp >= 1) mp -= 1; cp += ci; if (cp >= 1) cp -= 1; out[i] = sn(cp + (I + index2) / 6.283 * SIN[(mp * TW) | 0]); I *= k; }
  adsr(out, a, d, s, dur, r);
  return fadeEdges(out);
}
const sawP = (k, roll = 1, dec = 0) => Array.from({ length: k }, (_, i) => [i + 1, 1 / Math.pow(i + 1, roll), dec]);
const oddP = (k, roll = 1) => Array.from({ length: k }, (_, i) => [2 * i + 1, 1 / Math.pow(2 * i + 1, roll), 0]);
const mixArr = (...xs) => { const n = Math.max(...xs.map(([x]) => x.length)), o = new Float32Array(n); for (const [x, g] of xs) for (let i = 0; i < x.length; i++) o[i] += x[i] * g; return o; };

export const INST = {
  guitar: (f, d) => ks(f, d, { t60: 2.2, bright: 0.55 }),
  nylon: (f, d) => ks(f, d, { t60: 1.6, bright: 0.32 }),
  twang: (f, d) => { const x = ks(f, d, { t60: 1.8, bright: 0.8 }); return x; },
  banjo: (f, d) => ks(f, d, { t60: 0.7, bright: 0.85 }),
  tranh: (f, d) => mixArr([ks(f, d, { t60: 2.4, bright: 0.7, ring: Math.max(1.2, d + 0.6) }), 0.8], [additive(f, Math.max(0.3, d), { p: [[1, 1, 0.9]], a: 0.004, d: 0.1, s: 1, r: 0.4, vib: 0.18, vibRate: 5.2, vibDelay: 0.25 }), 0.22]),
  pipa: (f, d) => ks(f, d, { t60: 0.9, bright: 0.9 }),
  oud: (f, d) => ks(f, d, { t60: 1.3, bright: 0.6 }),
  harp: (f, d) => ks(f, d, { t60: 2.6, bright: 0.35, ring: 2 }),
  upright: (f, d) => mixArr([ks(f, d, { t60: 1.1, bright: 0.25 }), 1.2], [additive(f, d, { p: [[1, 1, 0.5]], a: 0.01, d: 0.2, s: 0.6, r: 0.08 }), 0.5]),
  bass: (f, d) => additive(f, d, { p: [[1, 1, 0.9], [2, 0.35, 0.3], [3, 0.12, 0.15]], a: 0.006, d: 0.25, s: 0.7, r: 0.06 }),
  synthbass: (f, d) => lp1(additive(f, d, { p: sawP(9, 1), a: 0.004, d: 0.15, s: 0.6, r: 0.05 }), 700),
  tuba: (f, d) => lp1(additive(f, d, { p: sawP(6, 1.4), a: 0.03, d: 0.1, s: 0.8, r: 0.08, vib: 0.08, vibDelay: 0.2 }), 600),
  sub: (f, d) => additive(f, d, { p: [[1, 1, 0], [2, 0.15, 0]], a: 0.02, d: 0.2, s: 0.8, r: 0.2 }),
  whistle: (f, d) => additive(f, d, { p: [[1, 1, 0], [2, 0.04, 0]], a: 0.04, d: 0.1, s: 0.85, r: 0.08, vib: 0.22, vibRate: 5.8, vibDelay: 0.12, bend: -1, bendT: 0.06, breath: 0.03, bf: 3000 }),
  flute: (f, d) => additive(f, d, { p: [[1, 1, 0], [2, 0.18, 0], [3, 0.06, 0]], a: 0.05, d: 0.1, s: 0.85, r: 0.1, vib: 0.15, vibDelay: 0.2, breath: 0.06, bf: f * 2 }),
  sao: (f, d) => additive(f, d, { p: [[1, 1, 0], [2, 0.12, 0], [3, 0.05, 0]], a: 0.04, d: 0.1, s: 0.8, r: 0.12, vib: 0.3, vibRate: 5, vibDelay: 0.18, bend: -2, bendT: 0.09, breath: 0.1, bf: f * 1.5 }),
  xiao: (f, d) => additive(f, d, { p: [[1, 1, 0], [2, 0.08, 0], [3, 0.03, 0]], a: 0.09, d: 0.1, s: 0.85, r: 0.25, vib: 0.18, vibRate: 4.5, vibDelay: 0.3, bend: -1, bendT: 0.12, breath: 0.16, bf: f * 1.2 }),
  ney: (f, d) => additive(f, d, { p: [[1, 1, 0], [2, 0.2, 0], [3, 0.08, 0]], a: 0.08, d: 0.1, s: 0.85, r: 0.2, vib: 0.25, vibRate: 5.2, vibDelay: 0.2, bend: -1.5, bendT: 0.1, breath: 0.22, bf: f * 1.4 }),
  danbau: (f, d) => additive(f, d, { p: [[1, 1, 0], [2, 0.3, 1.2], [3, 0.08, 0.6]], a: 0.02, d: 0.4, s: 0.55, r: 0.2, vib: 0.45, vibRate: 5, vibDelay: 0.25, bend: -3, bendT: 0.16 }),
  erhu: (f, d) => lp1(additive(f, d, { p: sawP(10, 1.15), a: 0.07, d: 0.1, s: 0.9, r: 0.12, vib: 0.32, vibRate: 6, vibDelay: 0.12, bend: -1.5, bendT: 0.1 }), 2600),
  harmonica: (f, d) => biquad(additive(f, d, { p: [[1, 1, 0], [2, 0.7, 0], [3, 0.5, 0], [4, 0.3, 0], [5, 0.2, 0], [6, 0.1, 0]], a: 0.05, d: 0.1, s: 0.85, r: 0.07, vib: 0.18, vibRate: 4.6, trem: 0.15, tremRate: 5, breath: 0.04, bf: 1500 }), 'bp', f * 2.2, 0.8),
  accordion: (f, d) => mixArr([additive(f, d, { p: oddP(6, 1.1), a: 0.04, d: 0.1, s: 0.9, r: 0.06 }), 0.6], [additive(f * 1.004, d, { p: sawP(6, 1.2), a: 0.04, d: 0.1, s: 0.9, r: 0.06 }), 0.5]),
  epiano: (f, d) => fm(f, d, { ratio: 1, index: 1.8, index2: 0.2, idec: 0.5, a: 0.003, d: 0.9, s: 0.35, r: 0.35 }),
  piano: (f, d) => additive(f, d, { p: [[1, 1, 1.4], [2, 0.5, 0.7], [3, 0.25, 0.4], [4, 0.12, 0.3], [5.02, 0.06, 0.2]], a: 0.003, d: 0.2, s: 1, r: 0.25 }),
  honky: (f, d) => mixArr([INST.piano(f, d), 0.6], [INST.piano(f * 1.008, d), 0.5]),
  vibes: (f, d) => additive(f, Math.max(d, 0.6), { p: [[1, 1, 1.8], [4, 0.25, 0.4], [10, 0.05, 0.1]], a: 0.004, d: 0.1, s: 1, r: 0.6, trem: 0.25, tremRate: 5.5 }),
  marimba: (f, d) => additive(f, Math.min(d, 0.5), { p: [[1, 1, 0.35], [4, 0.3, 0.06], [10, 0.08, 0.02]], a: 0.002, d: 0.1, s: 1, r: 0.25 }),
  kalimba: (f, d) => additive(f, Math.min(d, 0.6), { p: [[1, 1, 0.6], [5.4, 0.25, 0.05], [8.9, 0.1, 0.03]], a: 0.002, d: 0.1, s: 1, r: 0.4 }),
  glock: (f, d) => additive(f, 0.4, { p: [[1, 1, 0.8], [2.76, 0.3, 0.3], [5.4, 0.1, 0.1]], a: 0.001, d: 0.1, s: 1, r: 0.6 }),
  musicbox: (f, d) => additive(f, 0.3, { p: [[1, 1, 0.9], [3, 0.2, 0.2], [6.1, 0.08, 0.05]], a: 0.001, d: 0.1, s: 1, r: 0.8 }),
  bell: (f, d) => fm(f, Math.max(d, 0.5), { ratio: 3.5, index: 3, index2: 0.4, idec: 0.4, a: 0.002, d: 1.2, s: 0.15, r: 0.8 }),
  celesta: (f, d) => fm(f, Math.max(d, 0.3), { ratio: 4, index: 1.2, index2: 0.1, idec: 0.15, a: 0.002, d: 0.6, s: 0.1, r: 0.5 }),
  pizz: (f, d) => ks(f, d, { t60: 0.45, bright: 0.45 }),
  chip: (f, d) => lp1(additive(f, d, { p: oddP(7, 1), a: 0.004, d: 0.08, s: 0.6, r: 0.04 }), 3500),
  pluck: (f, d) => lp1(additive(f, d, { p: sawP(10, 1, 0.12), a: 0.003, d: 0.2, s: 0.15, r: 0.1 }), 2800),
  brass: (f, d) => fm(f, d, { ratio: 1, index: 2.2, index2: 1.2, idec: 0.12, a: 0.03, d: 0.2, s: 0.75, r: 0.08 }),
  sax: (f, d) => lp1(additive(f, d, { p: [[1, 1, 0], [2, 0.6, 0], [3, 0.45, 0], [4, 0.25, 0], [5, 0.15, 0], [6, 0.08, 0]], a: 0.04, d: 0.15, s: 0.8, r: 0.08, vib: 0.2, vibRate: 5, vibDelay: 0.25, bend: -0.8, bendT: 0.06, breath: 0.05, bf: 1800 }), 2400),
  organ: (f, d) => additive(f, d, { p: [[0.5, 0.5, 0], [1, 1, 0], [2, 0.5, 0], [3, 0.25, 0], [4, 0.2, 0]], a: 0.01, d: 0.05, s: 1, r: 0.06, trem: 0.12, tremRate: 6.5 }),
  pad: (f, d) => lp1(mixArr([additive(f * 0.997, d, { p: sawP(6, 1.3), a: 0.5, d: 0.3, s: 0.85, r: 0.8 }), 0.5], [additive(f * 1.003, d, { p: sawP(6, 1.3), a: 0.6, d: 0.3, s: 0.85, r: 0.8 }), 0.5]), 1400),
  strings: (f, d) => lp1(mixArr([additive(f * 0.998, d, { p: sawP(8, 1.2), a: 0.25, d: 0.2, s: 0.9, r: 0.4, vib: 0.12, vibRate: 5.3, vibDelay: 0.25 }), 0.55], [additive(f * 1.002, d, { p: sawP(8, 1.2), a: 0.3, d: 0.2, s: 0.9, r: 0.4, vib: 0.1, vibRate: 4.8, vibDelay: 0.3 }), 0.45]), 2200),
  trem: (f, d) => lp1(additive(f, d, { p: sawP(8, 1.2), a: 0.02, d: 0.1, s: 0.9, r: 0.1, trem: 0.85, tremRate: 12 }), 2000),
  choir: (f, d) => { const x = additive(f, d, { p: sawP(12, 0.9), a: 0.35, d: 0.2, s: 0.9, r: 0.6, vib: 0.12, vibRate: 4.6, vibDelay: 0.2 }); const y = Float32Array.from(x); biquad(x, 'bp', 750, 3); biquad(y, 'bp', 1150, 4); return mixArr([x, 1.4], [y, 0.8]); },
  drone: (f, d) => lp1(additive(f, d, { p: sawP(5, 1.5), a: 0.8, d: 0.2, s: 1, r: 1, trem: 0.15, tremRate: 0.3 }), 500),
};

// ---------- trống & bộ gõ ----------
function noiseHit(dur, { type = 'bp', f = 2000, Q = 0.8, a = 0.001, dec = dur, seed = 0 } = {}) {
  const n = Math.ceil(dur * SR), x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = nz(i + seed * 1013);
  biquad(x, type, f, Q); const ia = a * SR;
  for (let i = 0; i < n; i++) x[i] *= (i < ia ? i / ia : 1) * Math.exp(-(i / SR) / (dec / 4.6));
  return x;
}
function pitchHit(f0, f1, dur, { sweep = 0.06, dec = dur, wave = 1 } = {}) {
  const n = Math.ceil(dur * SR), x = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, f = f1 + (f0 - f1) * Math.exp(-t / sweep); ph += f / SR; x[i] = sn(ph) * Math.exp(-t / (dec / 4.6)); if (wave === 2) x[i] = Math.tanh(x[i] * 2.5) * 0.7; }
  return x;
}
export const DRUM = {
  kick: () => mixArr([pitchHit(150, 46, 0.36, { sweep: 0.035 }), 1], [noiseHit(0.012, { type: 'lp', f: 3000 }), 0.3]),
  kick2: () => mixArr([pitchHit(110, 50, 0.3, { sweep: 0.03 }), 0.9]),
  snare: () => mixArr([noiseHit(0.2, { f: 1900, Q: 0.6 }), 0.9], [pitchHit(240, 180, 0.09), 0.45]),
  rim: () => mixArr([pitchHit(1700, 1600, 0.035), 0.5], [noiseHit(0.02, { f: 3000, Q: 2 }), 0.6]),
  clap: () => { const x = noiseHit(0.22, { f: 1300, Q: 1.2, dec: 0.18 }); for (let i = 0; i < x.length; i++) { const t = i / SR; if (t < 0.03) x[i] *= (t % 0.01) < 0.004 ? 1.2 : 0.3; } return x; },
  hat: () => noiseHit(0.05, { type: 'hp', f: 7000, dec: 0.04 }),
  ohat: () => noiseHit(0.3, { type: 'hp', f: 6500, dec: 0.28 }),
  shaker: () => { const x = noiseHit(0.09, { type: 'hp', f: 5000, a: 0.03, dec: 0.08 }); return x; },
  tamb: () => mixArr([noiseHit(0.16, { f: 8000, Q: 2.5, dec: 0.15 }), 1], [noiseHit(0.16, { f: 6000, Q: 3, dec: 0.12, seed: 3 }), 0.6]),
  cowbell: () => biquad(mixArr([additive(560, 0.02, { p: oddP(4, 1.2), a: 0.001, d: 0.05, s: 0.5, r: 0.25 }), 0.5], [additive(845, 0.02, { p: oddP(4, 1.2), a: 0.001, d: 0.05, s: 0.5, r: 0.25 }), 0.5]), 'bp', 900, 1.5),
  wood: (p = 900) => mixArr([pitchHit(p, p * 0.97, 0.07, { dec: 0.06 }), 1], [pitchHit(p * 1.55, p * 1.5, 0.04), 0.35]),
  mo: (p = 720) => mixArr([pitchHit(p, p * 0.98, 0.12, { dec: 0.1 }), 1], [noiseHit(0.01, { f: 2500, Q: 2 }), 0.3]),
  clop: (p = 520) => mixArr([pitchHit(p, p * 0.8, 0.06, { dec: 0.05 }), 0.9], [noiseHit(0.03, { f: 1500, Q: 1.5 }), 0.5]),
  tom: (p = 140) => mixArr([pitchHit(p * 1.4, p, 0.4, { sweep: 0.05 }), 1], [noiseHit(0.05, { type: 'lp', f: 1200 }), 0.2]),
  taiko: (p = 62) => mixArr([pitchHit(p * 1.5, p, 0.9, { sweep: 0.06, dec: 0.8 }), 1.2], [noiseHit(0.12, { type: 'lp', f: 400 }), 0.6]),
  gong: (p = 98) => additive(p, 0.05, { p: [[1, 1, 2.2], [1.48, 0.5, 1.4], [2.09, 0.4, 1], [2.56, 0.25, 0.8], [3.13, 0.15, 0.5]], a: 0.01, d: 0.05, s: 1, r: 2.6, bend: -0.6, bendT: 0.5 }),
  cymbal: () => noiseHit(1.2, { type: 'hp', f: 5000, dec: 1.1 }),
  brush: () => noiseHit(0.16, { f: 3500, Q: 0.7, a: 0.03, dec: 0.14 }),
  conga: (p = 330) => mixArr([pitchHit(p * 1.2, p, 0.2, { sweep: 0.02, dec: 0.18 }), 1], [noiseHit(0.015, { f: 2000 }), 0.2]),
  bongo: (p = 520) => mixArr([pitchHit(p * 1.15, p, 0.12, { sweep: 0.015, dec: 0.1 }), 1]),
  doum: (p = 85) => mixArr([pitchHit(p * 1.6, p, 0.35, { sweep: 0.03, dec: 0.3 }), 1.1], [noiseHit(0.02, { type: 'lp', f: 800 }), 0.4]),
  tek: () => mixArr([noiseHit(0.05, { f: 3500, Q: 1.5, dec: 0.04 }), 0.8], [pitchHit(2200, 2100, 0.03), 0.25]),
  snap: () => noiseHit(0.04, { f: 2600, Q: 2, dec: 0.03 }),
  triangle: () => additive(2700, 0.02, { p: [[1, 1, 0.9], [2.4, 0.3, 0.5], [3.9, 0.2, 0.3]], a: 0.001, d: 0.02, s: 1, r: 0.8 }),
  bellhit: (p = 1400) => additive(p, 0.02, { p: [[1, 1, 0.5], [2.76, 0.4, 0.25], [5.4, 0.2, 0.1]], a: 0.001, d: 0.02, s: 1, r: 0.6 }),
  tick: () => pitchHit(2400, 2400, 0.02, { dec: 0.015 }),
  cracker: () => mixArr([noiseHit(0.05, { type: 'hp', f: 1200, dec: 0.04 }), 1.2], [pitchHit(180, 60, 0.05), 0.4]),
  boom: () => mixArr([pitchHit(90, 30, 0.8, { sweep: 0.12, dec: 0.7 }), 1], [noiseHit(0.5, { type: 'lp', f: 500, dec: 0.4 }), 0.8]),
  swell: () => { const x = noiseHit(1.0, { type: 'hp', f: 3000, dec: 10 }); for (let i = 0; i < x.length; i++) x[i] *= Math.pow(i / x.length, 2.5); return x; },
};

// chuẩn hoá độ to từng nhạc cụ (đo 1 lần) để "vel" giữa các nhạc cụ so sánh được
const NORM = {};
function instGain(name) {
  if (NORM[name] != null) return NORM[name];
  let g = 1;
  if (INST[name]) { const x = INST[name](440, 0.5); let ss = 0; const m = Math.min(x.length, SR * 0.5); for (let i = 0; i < m; i++) ss += x[i] * x[i]; g = 0.2 / (Math.sqrt(ss / m) || 1); }
  else if (DRUM[name]) { const x = DRUM[name](); let pk = 0; for (let i = 0; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i])); g = 0.8 / (pk || 1); }
  return (NORM[name] = Math.min(g, 40));
}

// ---------- trộn + tiếng vang (lặp vòng liền mạch) ----------
class Mix {
  constructor(sec) { this.n = Math.ceil(sec * SR); this.L = new Float32Array(this.n); this.R = new Float32Array(this.n); this.S = new Float32Array(this.n); }
  add(buf, t, gain = 1, pan = 0, send = 0) {
    const n = this.n, L = this.L, R = this.R, S = this.S; let i0 = Math.round(t * SR) % n; if (i0 < 0) i0 += n;
    const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4), gs = gain * send;
    for (let j = 0, k = i0; j < buf.length; j++, k++) { if (k >= n) k -= n; const v = buf[j]; L[k] += v * gl; R[k] += v * gr; if (gs) S[k] += v * gs; }
  }
}
async function reverb(S, n, size = 1, damp = 0.3, fbk = 0.8, loop = true) {
  const CL = [1116, 1188, 1277, 1356], CR = [1139, 1211, 1300, 1379], AP = [556, 441];
  const sc = SR / 44100 * size, mk = arr => arr.map(d => ({ b: new Float32Array(Math.max(8, Math.round(d * sc))), i: 0, f: 0 }));
  const run = async (combs) => {
    const aps = AP.map(d => ({ b: new Float32Array(Math.max(4, Math.round(d * SR / 44100))), i: 0 }));
    const out = new Float32Array(n);
    for (let pass = loop ? 0 : 1; pass < 2; pass++) for (let i = 0; i < n; i++) {
      if ((i & 4095) === 0) await maybeYield();
      const x = S[i] * 0.25; let y = 0;
      for (const c of combs) { const o = c.b[c.i]; c.f = o * (1 - damp) + c.f * damp; c.b[c.i] = x + c.f * fbk; if (++c.i >= c.b.length) c.i = 0; y += o; }
      for (const a of aps) { const bo = a.b[a.i], v = -y + bo; a.b[a.i] = y + bo * 0.5; if (++a.i >= a.b.length) a.i = 0; y = v; }
      if (pass) out[i] = y;
    }
    return out;
  };
  return [await run(mk(CL)), await run(mk(CR))];
}

// ---------- soạn nhạc ----------
// nhả luồng bằng MessageChannel (tab nền không bị bóp như setTimeout)
const MC = typeof window !== 'undefined' && typeof MessageChannel !== 'undefined' ? new MessageChannel() : null, waiting = [];
if (MC) MC.port1.onmessage = () => { const r = waiting.shift(); r && r(); };
// chỉ nhả luồng khi đã chạy liền > 24ms (đỡ tốn khung hình khi máy đang bận vẽ 3D)
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
let lastYield = 0;
async function maybeYield() { const t = now(); if (t - lastYield > 24) { await tick(); lastYield = now(); } }
function tick() { return new Promise(r => { if (MC) { waiting.push(r); MC.port2.postMessage(0); } else if (typeof setTimeout !== 'undefined') setTimeout(r, 0); else r(); }); }
const pat = (s, i) => { if (!s) return 0; const c = s[i % s.length]; return c === 'x' ? 1 : c === 'X' ? 1.25 : c === 'o' ? 0.65 : c === '-' ? 0.35 : 0; };

// spec: { bpm, beats, bars, swing, key, scale, prog, seed, rev, revSize, parts: [...] }
export function compose(spec) {
  const beats = spec.beats || 4, bpm = spec.bpm, spb = 60 / bpm, bars = spec.bars || 8, barLen = beats * spb;
  const R = rng(spec.seed || 7), scale = spec.scale || [0, 2, 4, 5, 7, 9, 11], L = scale.length, key = spec.key ?? 60;
  const prog = spec.prog || [0];
  const dm = d => key + 12 * Math.floor(d / L) + scale[((d % L) + L) % L]; // bậc → MIDI
  const md = m => { let best = 0, bd = 99; for (let d = -3 * L; d < 5 * L; d++) { const x = Math.abs(dm(d) - m); if (x < bd) { bd = x; best = d; } } return best; };
  const chordAt = b => { const c = prog[((b % prog.length) + prog.length) % prog.length]; return typeof c === 'object' ? c : { d: c }; };
  const tones = b => { const c = chordAt(b); return c.t ? c.t.map(x => c.d + x) : [c.d, c.d + 2, c.d + 4].concat(c.s7 ? [c.d + 6] : []); };
  const sw = spec.swing || 0;
  const T = (bar, beat) => { const b = Math.floor(beat * 2 + 1e-6), frac = beat * 2 - b; const off = (b % 2 === 1 && frac < 1e-6) ? sw * spb * 0.5 : 0; return bar * barLen + beat * spb + off; };
  const ev = [];
  const hum = (t) => t + (R() - 0.5) * 0.008;
  const N = (inst, midi, bar, beat, durBeats, vel, p) => ev.push({ inst, f: mtof(midi), t: hum(T(bar, beat)), d: durBeats * spb, v: vel * (0.9 + R() * 0.2), pan: p.pan || 0, send: p.rev ?? 0.25, oct: 0 });
  const D = (drum, bar, beat, vel, p, pitch) => ev.push({ drum, pitch, t: hum(T(bar, beat)), v: vel * (0.88 + R() * 0.24), pan: p.pan || 0, send: p.rev ?? 0.12 });
  const on = (p, b) => (!p.from || b >= p.from) && (!p.to || b < p.to) && (!p.mask || p.mask[b % p.mask.length] !== '0') && (!p.when || p.when(b));
  const ctx = { R, dm, md, tones, chordAt, beats, bars, spb, T, N, D, key, scale };

  for (const p of spec.parts) {
    const vel = p.vel ?? 0.5;
    if (p.type === 'drums') {
      const steps = beats * 4;
      for (const [nm, s] of Object.entries(p.pat)) {
        const [drum, pitch] = nm.split(':');
        for (let b = 0; b < bars; b++) {
          if (!on(p, b)) continue;
          const fill = p.fill && (b % 8 === 7 || b === bars - 1) && p.fill[nm];
          const src = fill || s;
          for (let i = 0; i < steps; i++) { const a = pat(src, (fill ? 0 : b * steps) + i); if (a) D(drum, b, i / 4, vel * a * ((p.gains && p.gains[nm]) || 1), { pan: (p.pans && p.pans[nm]) || 0, rev: p.rev }, pitch ? +pitch : undefined); }
        }
      }
    } else if (p.type === 'bass') {
      for (let b = 0; b < bars; b++) {
        if (!on(p, b)) continue;
        const c = chordAt(b), r = c.d, root = (d) => { let m = dm(d); while (m > (p.oct ?? 40) + 7) m -= 12; while (m < (p.oct ?? 40) - 5) m += 12; return m; };
        const nx = chordAt(b + 1).d, P = p.pattern || 'root5';
        const n = (m, beat, dur, v = 1) => N(p.inst || 'bass', m, b, beat, dur, vel * v, p);
        if (P === 'root') n(root(r), 0, beats * 0.95);
        else if (P === 'root5') { n(root(r), 0, beats / 2 * 0.9); n(root(r + (L === 5 ? 3 : 4)), beats / 2, beats / 2 * 0.9, 0.85); }
        else if (P === 'oom') { for (let k = 0; k < beats; k += 2) n(root(k % 4 === 0 ? r : r + (L === 5 ? 3 : 4)), k, 0.9); }
        else if (P === 'waltz') n(root(b % 2 ? r + (L === 5 ? 3 : 4) : r), 0, 0.95);
        else if (P === '8th') for (let k = 0; k < beats * 2; k++) n(root(r) + (k % 8 === 6 ? 12 : 0), k / 2, 0.45, k % 2 ? 0.75 : 1);
        else if (P === 'walk') { const t = [r, r + 1, r + 2, null]; for (let k = 0; k < beats; k++) { let m = k === beats - 1 ? root(nx) + (R() < 0.5 ? 1 : -1) : root(t[k] ?? r + 4); n(m, k, 0.9, k ? 0.8 : 1); } }
        else if (P === 'bossa') { n(root(r), 0, 1.4); n(root(r + (L === 5 ? 3 : 4)), 1.5, 0.45, 0.8); n(root(r + (L === 5 ? 3 : 4)), 2, 1.4, 0.9); n(root(r), 3.5, 0.45, 0.8); }
        else if (P === 'gallop') for (let k = 0; k < beats; k++) { n(root(r), k, 0.22); n(root(r), k + 0.5, 0.2, 0.7); n(root(k % 2 ? r + (L === 5 ? 3 : 4) : r), k + 0.75, 0.2, 0.8); }
        else if (P === 'push') { n(root(r), 0, 1.4); n(root(r), 1.5, 0.9, 0.85); n(root(r + (L === 5 ? 3 : 4)), 3, 0.45, 0.8); n(root(r) + 12, 3.5, 0.45, 0.7); }
        else if (P === 'drone') n(root(r), 0, beats + 0.2, 1);
        else if (P === 'pulse') for (let k = 0; k < beats; k++) n(root(r), k, 0.6, k ? 0.8 : 1);
      }
    } else if (p.type === 'comp') {
      const inst = p.inst || 'pluck', P = p.pattern || 'strum', lo = p.oct ?? 55;
      for (let b = 0; b < bars; b++) {
        if (!on(p, b)) continue;
        let ch = tones(b).map(d => dm(d)); ch = ch.map(m => { while (m < lo) m += 12; while (m >= lo + 12) m -= 12; return m; }).sort((a, z) => a - z);
        if (p.voices === 2) ch = [ch[0], ch[ch.length - 1]];
        const chord = (beat, dur, v = 1, spread = 0.012) => ch.forEach((m, i) => N(inst, m, b, beat + i * spread / spb, dur, vel * v * (1 - i * 0.06), p));
        if (P === 'strum') { for (let k = 1; k < beats; k += 2) chord(k, 0.9); }
        else if (P === 'strum8') { for (let k = 0; k < beats * 2; k++) chord(k / 2, 0.45, k % 2 ? 0.6 : 0.9, 0.01); }
        else if (P === 'boomchick') { for (let k = 0; k < beats; k++) if (k % 2) chord(k, 0.6, 0.9); }
        else if (P === 'waltz') { chord(1, 0.8, 0.8); chord(2, 0.8, 0.7); }
        else if (P === 'block') chord(0, beats * 0.95, 1, 0.006);
        else if (P === 'pad') chord(0, beats + 0.05, 1, 0);
        else if (P === 'offbeat') { for (let k = 0; k < beats; k++) chord(k + 0.5, 0.4, k % 2 ? 0.8 : 1, 0.004); }
        else if (P === 'stab') { chord(0, 0.5, 1, 0.004); chord(1.5, 0.4, 0.8, 0.004); if (b % 2) chord(3, 0.4, 0.7, 0.004); }
        else if (P === 'bossa') { (b % 2 ? [1, 2.5] : [0, 1.5, 3]).forEach((x, i) => chord(x, 0.55, i ? 0.75 : 0.95, 0.004)); }
        else if (P === 'charleston') { chord(0, 0.6, 1, 0.004); chord(1.5, 0.5, 0.8, 0.004); }
        else if (P === 'arp' || P === 'arpup') { const seq = P === 'arp' ? [0, 1, 2, 1, 0, 2, 1, 2] : [0, 1, 2, 3, 0, 1, 2, 3]; const ext = ch.concat([ch[0] + 12]); for (let k = 0; k < beats * 2; k++) N(inst, ext[seq[k % 8] % ext.length], b, k / 2, p.len ?? 0.9, vel * (k % 2 ? 0.75 : 1), p); }
        else if (P === 'arp16') { const ext = ch.concat([ch[0] + 12, ch[1] + 12]); for (let k = 0; k < beats * 4; k++) N(inst, ext[[0, 1, 2, 3, 4, 3, 2, 1][k % 8]], b, k / 4, 0.5, vel * (k % 4 ? 0.65 : 1), p); }
        else if (P === 'trem') { for (let k = 0; k < beats * 4; k++) N(inst, ch[k % 2 ? ch.length - 1 : 0], b, k / 4, 0.24, vel * (k % 4 ? 0.6 : 1), p); }
        else if (P === 'roll') { // đàn tranh/guzheng: chuỗi rải nhanh ngũ cung lên tới hợp âm
          const top = tones(b)[0] + L; for (let k = 0; k < 5; k++) N(inst, dm(top - 4 + k) - 12 * ((p.down ?? 0)), b, k * 0.125, 0.7, vel * (0.55 + k * 0.1), p);
          N(inst, dm(top + 2), b, 2, 1.2, vel * 0.8, p); N(inst, dm(top), b, 3, 0.9, vel * 0.6, p);
        }
      }
    } else if (p.type === 'lead') genLead(p, ctx, vel);
    else if (p.type === 'fn') p.fn(ctx, (inst, m, b, beat, dur, v = 0.5, o = {}) => N(inst, m, b, beat, dur, v, o), (drum, b, beat, v = 0.5, o = {}, pitch) => D(drum, b, beat, v, o, pitch));
  }
  return { ev, len: bars * barLen };
}

function genLead(p, c, vel) {
  const { R, dm, md, tones, beats, bars } = c, L = c.scale.length;
  const grid = p.grid || 2, U = 2 * beats * grid, dens = p.density ?? 0.55;
  const form = p.form || 'AABA', lo = md(p.lo ?? 64), hi = md(p.hi ?? 84), mid = Math.round((lo + hi) / 2);
  const motifs = {};
  const mkMotif = () => {
    const rh = [];
    for (let s = 0; s < U - grid; s++) {
      const beatPos = s % grid === 0, barStart = s % (beats * grid) === 0;
      const pr = barStart ? 0.95 : beatPos ? dens : dens * (p.busy ?? 0.55);
      if (R() < pr) rh.push(s);
    }
    if (!rh.length) rh.push(0);
    const cont = []; let x = [0, 2, 4][Math.floor(R() * 3)] - 2;
    for (let i = 0; i < rh.length; i++) { cont.push(x); const st = R(); x += st < 0.38 ? 1 : st < 0.7 ? -1 : st < 0.82 ? 2 : st < 0.92 ? -2 : 0; x = Math.max(-5, Math.min(6, x)); }
    return { rh, cont };
  };
  let last = mid;
  for (let u = 0; u < bars / 2; u++) {
    const b0 = u * 2, letter = form[u % form.length];
    if (p.from && b0 < p.from) continue; if (p.to && b0 >= p.to) continue;
    if (p.mask && p.mask[u % p.mask.length] === '0') continue;
    if (!motifs[letter]) motifs[letter] = mkMotif();
    const m = motifs[letter], cad = (u % 4 === 3) || u === bars / 2 - 1, lift = p.lift && u >= 4 && u < 8 && (u % 4 === 1) ? L : 0;
    const base = mid + (tones(b0)[0] % L) - (mid % L) + lift;
    const notes = m.rh.map((s, i) => ({ s, d: base + m.cont[i] }));
    if (cad) { const lastS = Math.min(U - grid * 2, Math.max(...m.rh.filter(s => s < U - grid * 2), 0)); const keep = notes.filter(n => n.s < lastS); keep.push({ s: lastS, d: md(c.dm(tones(b0 + 1)[0])) , cad: true }); notes.length = 0; notes.push(...keep); }
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i], bar = b0 + Math.floor(n.s / (beats * grid)), beat = (n.s % (beats * grid)) / grid;
      let d = n.d;
      if (n.s % grid === 0 && (beat === 0 || R() < 0.6)) { const ts = tones(bar); let best = d, bd = 99; for (const t of ts) for (let o = -2; o <= 2; o++) { const cand = t + o * L; if (Math.abs(cand - d) < bd) { bd = Math.abs(cand - d); best = cand; } } d = best; }
      if (n.cad) { const ts = tones(bar); d = ts[0]; while (d < lo) d += L; while (d > hi) d -= L; }
      while (d < lo) d += L; while (d > hi) d -= L;
      while (Math.abs(dm(d) - dm(last)) > 9 && Math.abs(dm(d) - dm(last)) > 0) { d += dm(d) > dm(last) ? -L : L; if (d < lo || d > hi) break; }
      last = d;
      const nextS = i + 1 < notes.length ? notes[i + 1].s : U;
      let dur = Math.min((nextS - n.s) / grid, p.maxLen ?? 2) * (p.legato ?? 0.92);
      if (n.cad) dur = Math.max(dur, Math.min(beats * 1.5, (U - n.s) / grid * 0.9));
      const v = vel * (n.s % (beats * grid) === 0 ? 1 : n.s % grid === 0 ? 0.88 : 0.75);
      c.N(p.inst, dm(d) + (p.shift || 0), bar, beat, dur, v, p);
      if (p.harm) c.N(p.harmInst || p.inst, dm(d + p.harm) + (p.shift || 0), bar, beat, dur, v * 0.55, { ...p, pan: -(p.pan || 0) });
      if (p.echo) c.N(p.inst, dm(d) + (p.shift || 0), bar, beat + p.echo, dur, v * 0.35, { ...p, pan: -(p.pan || 0.3) });
    }
  }
}

// dựng ra mẫu âm, có nhả luồng (không đơ giao diện)
export async function renderSong(spec, { yieldEvery = 60 } = {}) {
  const { ev, len } = compose(spec);
  const mix = new Mix(len + (spec.oneshot ? spec.tail ?? 2.5 : 0)), cache = new Map();
  let k = 0;
  for (const e of ev) {
    let key, buf;
    if (e.drum) { key = 'd|' + e.drum + '|' + (e.pitch || ''); buf = cache.get(key); if (!buf) { buf = DRUM[e.drum] ? DRUM[e.drum](e.pitch) : DRUM.wood(); cache.set(key, buf); } }
    else { key = e.inst + '|' + e.f.toFixed(1) + '|' + Math.round(e.d * 50); buf = cache.get(key); if (!buf) { buf = (INST[e.inst] || INST.pluck)(e.f, e.d); cache.set(key, buf); k += 3; } }
    mix.add(buf, e.t, e.v * instGain(e.inst || e.drum) * (spec.gains && spec.gains[e.inst || e.drum] || 1), e.pan, e.send);
    if (++k % 8 === 0) await maybeYield();
  }
  await tick();
  const n = mix.n;
  if (spec.rev !== 0) { const [rl, rr] = await reverb(mix.S, n, spec.revSize || 1, 0.35, spec.revFb || 0.78, !spec.oneshot); const w = spec.rev ?? 0.5; for (let i = 0; i < n; i++) { mix.L[i] += rl[i] * w; mix.R[i] += rr[i] * w; } }
  // chuẩn hoá độ to giữa các bài cho chuyển bài êm, rồi nén mềm đỉnh
  let ss = 0; for (let i = 0; i < n; i++) ss += mix.L[i] * mix.L[i] + mix.R[i] * mix.R[i];
  const rms = Math.sqrt(ss / (2 * n)) || 1, g = (spec.loud ?? 0.11) / rms;
  for (let i = 0; i < n; i++) { let a = mix.L[i] * g, b = mix.R[i] * g; mix.L[i] = a > 0.7 ? 0.7 + Math.tanh((a - 0.7) * 3) * 0.28 : a < -0.7 ? -0.7 + Math.tanh((a + 0.7) * 3) * 0.28 : a; mix.R[i] = b > 0.7 ? 0.7 + Math.tanh((b - 0.7) * 3) * 0.28 : b < -0.7 ? -0.7 + Math.tanh((b + 0.7) * 3) * 0.28 : b; }
  return { L: mix.L, R: mix.R, n, sr: SR, len, events: ev.length };
}
