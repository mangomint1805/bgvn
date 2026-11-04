// Nhạc nền tự sáng tác (sinh theo thuật toán, có seed cố định) cho từng game BGVN. Không chép giai điệu có bản quyền nào.
// Mỗi game 2–4 "tâm trạng": lobby (sảnh, êm), game (đang chơi), tense (gay cấn) – riêng Ma Sói có ngày/đêm/bỏ phiếu.
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], DOR = [0, 2, 3, 5, 7, 9, 10], HARM = [0, 2, 3, 5, 7, 8, 11];
const PENT = [0, 2, 4, 7, 9], MPENT = [0, 3, 5, 7, 10], BAC = [0, 2, 5, 7, 9], HIJAZ = [0, 1, 4, 5, 7, 8, 10];
const s7 = d => ({ d, s7: true });
const drums = (pat, o = {}) => ({ type: 'drums', pat, ...o });
const lead = (inst, o = {}) => ({ type: 'lead', inst, ...o });
const bass = (inst, pattern, o = {}) => ({ type: 'bass', inst, pattern, ...o });
const comp = (inst, pattern, o = {}) => ({ type: 'comp', inst, pattern, ...o });
// rắc pháo/lục lạc/chuông ở các nhịp cuối đoạn (dùng cho Tết, đoàn lạc đà…)
const sprinkle = (drum, every, beats, vel, pitch) => ({ type: 'fn', fn: (c, N, D) => { for (let b = every - 1; b < c.bars; b += every) beats.forEach((bt, i) => D(drum, b, bt, vel * (1 - i * 0.05), { pan: (i % 3 - 1) * 0.5, rev: 0.2 }, pitch)); } });

export const THEMES = {
  // ---------------- UNO: pop nhún nhảy ----------------
  uno: {
    key: 65,
    lobby: { bpm: 98, bars: 16, key: 65, scale: MAJ, prog: [0, 4, 5, 3], seed: 11, rev: 0.45, parts: [
      lead('kalimba', { lo: 72, hi: 91, density: 0.42, vel: 0.5, rev: 0.35 }),
      comp('epiano', 'offbeat', { oct: 58, vel: 0.17 }),
      bass('bass', 'root5', { oct: 41, vel: 0.36 }),
      drums({ kick: 'x.......x.x.....', rim: '....x.......x...', shaker: '..x...x...x...x.' }, { vel: 0.3, from: 2 }),
    ] },
    game: { bpm: 124, bars: 16, key: 64, scale: MAJ, prog: [0, 5, 3, 4], seed: 21, rev: 0.3, parts: [
      lead('chip', { lo: 71, hi: 88, density: 0.62, vel: 0.36, form: 'AABA', lift: true }),
      lead('glock', { lo: 79, hi: 96, density: 0.3, vel: 0.2, form: 'ABAC', from: 4, pan: 0.4 }),
      comp('pluck', 'offbeat', { oct: 60, vel: 0.2, pan: -0.25 }),
      bass('synthbass', '8th', { oct: 40, vel: 0.36 }),
      drums({ kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.', shaker: 'x.x.x.x.x.x.x.x.' }, { vel: 0.38, gains: { shaker: 0.4, hat: 0.6 }, fill: { clap: '....x.......x.xx', 'tom:180': '..........x.x.x.' } }),
    ] },
    tense: { bpm: 140, bars: 8, key: 62, scale: MIN, prog: [0, 5, 3, 4], seed: 5, rev: 0.25, parts: [
      lead('chip', { lo: 69, hi: 86, density: 0.75, busy: 0.8, vel: 0.36 }),
      comp('trem', 'trem', { oct: 57, vel: 0.15 }),
      bass('synthbass', '8th', { oct: 38, vel: 0.4 }),
      drums({ kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', 'tom:150': '..............xx' }, { vel: 0.38, gains: { hat: 0.35 } }),
    ] },
  },

  // ---------------- BANG!: Viễn Tây ----------------
  bang: {
    key: 57,
    lobby: { bpm: 84, beats: 3, bars: 16, key: 55, scale: MAJ, prog: [0, 0, 3, 4, 0, 3, 4, 0], seed: 4, rev: 0.4, parts: [
      lead('harmonica', { lo: 67, hi: 84, density: 0.4, vel: 0.42, form: 'ABAC' }),
      comp('nylon', 'waltz', { oct: 55, vel: 0.22 }),
      bass('upright', 'waltz', { oct: 40, vel: 0.36 }),
      drums({ shaker: 'x...x.x.x...' }, { vel: 0.18, from: 4 }),
    ] },
    variants: {
      desert: { game: { bpm: 100, bars: 16, key: 57, scale: MIN, prog: [0, 5, 6, 0, 0, 3, 4, 0], seed: 7, rev: 0.5, revSize: 1.2, parts: [
        lead('whistle', { lo: 69, hi: 88, density: 0.5, vel: 0.42, form: 'AABA', rev: 0.5 }),
        bass('twang', 'gallop', { oct: 45, vel: 0.3 }),
        comp('guitar', 'strum', { oct: 57, vel: 0.2 }),
        drums({ kick: 'x.......x.......', snare: '....x.......x...', 'clop:640': 'x.xxx.xxx.xxx.xx' }, { vel: 0.3, gains: { 'clop:640': 0.45 } }),
        sprinkle('bellhit', 8, [0], 0.25, 1100),
      ] } },
      night: { game: { bpm: 74, bars: 16, key: 50, scale: MIN, prog: [0, 3, 6, 2, 5, 3, 4, 0], seed: 3, rev: 0.6, parts: [
        lead('harmonica', { lo: 62, hi: 81, density: 0.42, vel: 0.42 }),
        comp('nylon', 'arp', { oct: 55, vel: 0.2 }),
        bass('upright', 'root5', { oct: 38, vel: 0.34 }),
        drums({ brush: '....x.......x...', 'clop:420': 'x.......x.......' }, { vel: 0.22 }),
      ] } },
      saloon: { game: { bpm: 128, bars: 16, key: 60, scale: MAJ, prog: [0, 0, 3, 3, 0, 5, 1, 4], seed: 11, rev: 0.3, parts: [
        lead('honky', { lo: 72, hi: 91, density: 0.62, vel: 0.36, busy: 0.7 }),
        comp('honky', 'boomchick', { oct: 57, vel: 0.2 }),
        bass('tuba', 'oom', { oct: 40, vel: 0.36 }),
        drums({ brush: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }, { vel: 0.26, gains: { hat: 0.5 } }),
      ] } },
      sunset: { game: { bpm: 86, bars: 16, key: 52, scale: MIN, prog: [0, 2, 6, 3, 0, 5, 4, 4], seed: 21, rev: 0.55, parts: [
        lead('twang', { lo: 64, hi: 83, density: 0.45, vel: 0.42, echo: 0.75 }),
        comp('guitar', 'trem', { oct: 52, vel: 0.12 }),
        bass('upright', 'root5', { oct: 40, vel: 0.36 }),
        drums({ kick: 'x.......x.......', 'clop:500': '..x...x...x...x.' }, { vel: 0.26 }),
      ] } },
      winter: { game: { bpm: 78, bars: 16, key: 55, scale: MAJ, prog: [0, 4, 5, 3, 0, 2, 3, 4], seed: 5, rev: 0.65, parts: [
        lead('bell', { lo: 72, hi: 91, density: 0.4, vel: 0.36 }),
        comp('harp', 'arp', { oct: 55, vel: 0.2 }),
        comp('pad', 'pad', { oct: 55, vel: 0.12 }),
        bass('bass', 'root', { oct: 40, vel: 0.3 }),
        drums({ triangle: 'x...............', shaker: '....x.......x...' }, { vel: 0.16 }),
      ] } },
    },
    tense: { bpm: 116, bars: 8, key: 57, scale: HARM, prog: [0, 0, 5, 4, 0, 3, 4, 4], seed: 13, rev: 0.4, parts: [
      lead('whistle', { lo: 72, hi: 91, density: 0.6, vel: 0.4, rev: 0.45 }),
      comp('strings', 'trem', { oct: 52, vel: 0.14 }),
      bass('twang', 'gallop', { oct: 45, vel: 0.34 }),
      drums({ 'tom:110': 'x..x..x.x..x..x.', snare: '....x.......x.xx', kick: 'x.......x.......' }, { vel: 0.36, fill: { snare: 'x.x.x.x.xxxxxxxx' } }),
      sprinkle('cymbal', 8, [0], 0.25),
    ] },
  },

  // ---------------- Tỷ Phú: phố thị, lofi/city pop ----------------
  typhu: {
    key: 62,
    lobby: { bpm: 80, bars: 8, key: 62, scale: MAJ, prog: [s7(1), s7(4), s7(0), s7(5)], swing: 0.3, seed: 8, rev: 0.5, parts: [
      comp('epiano', 'block', { oct: 57, vel: 0.24 }),
      lead('vibes', { lo: 74, hi: 91, density: 0.35, vel: 0.36, form: 'ABAC' }),
      bass('bass', 'push', { oct: 40, vel: 0.34 }),
      drums({ kick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xo', shaker: '..x...x...x...x.' }, { vel: 0.3, gains: { hat: 0.45, snare: 0.7 } }),
    ] },
    game: { bpm: 114, bars: 16, key: 65, scale: MAJ, prog: [s7(3), s7(4), s7(2), s7(5), s7(1), s7(4), s7(0), s7(0)], seed: 18, rev: 0.32, parts: [
      lead('pluck', { lo: 72, hi: 89, density: 0.58, vel: 0.36, echo: 0.5, form: 'AABA', lift: true }),
      comp('epiano', 'stab', { oct: 58, vel: 0.2 }),
      bass('synthbass', 'push', { oct: 41, vel: 0.38 }),
      drums({ kick: 'x...x...x...x...', clap: '....x.......x...', hat: '-x-x-x-x-x-x-x-x', ohat: '..x...x...x...x.' }, { vel: 0.34, gains: { hat: 0.5, ohat: 0.35 } }),
    ] },
    tense: { bpm: 122, bars: 8, key: 57, scale: MIN, prog: [0, 5, 3, 4, 0, 5, 6, 4], seed: 33, rev: 0.3, parts: [
      comp('brass', 'stab', { oct: 57, vel: 0.24 }),
      comp('strings', 'trem', { oct: 64, vel: 0.12 }),
      lead('sax', { lo: 67, hi: 84, density: 0.5, vel: 0.36 }),
      bass('synthbass', '8th', { oct: 38, vel: 0.38 }),
      drums({ kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }, { vel: 0.36, gains: { hat: 0.5 } }),
    ] },
  },

  // ---------------- Scribble: tinh nghịch ----------------
  scribble: {
    key: 67,
    lobby: { bpm: 100, bars: 16, key: 67, scale: MAJ, prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 9, rev: 0.35, parts: [
      lead('kalimba', { lo: 74, hi: 93, density: 0.5, vel: 0.44 }),
      comp('pizz', 'arp', { oct: 60, vel: 0.2 }),
      bass('tuba', 'oom', { oct: 40, vel: 0.3 }),
      drums({ 'wood:1100': 'x.......x.......', snap: '....x.......x...' }, { vel: 0.24, from: 2 }),
    ] },
    game: { bpm: 118, bars: 16, key: 65, scale: MAJ, prog: [0, 5, 1, 4, 0, 3, 4, 0], seed: 29, rev: 0.3, parts: [
      lead('musicbox', { lo: 77, hi: 96, density: 0.55, vel: 0.36, form: 'ABAC' }),
      lead('marimba', { lo: 65, hi: 79, density: 0.4, vel: 0.24, form: 'AABA', from: 4, pan: -0.3 }),
      comp('pizz', 'offbeat', { oct: 58, vel: 0.22 }),
      bass('bass', 'root5', { oct: 41, vel: 0.34 }),
      drums({ kick: 'x.......x.......', snap: '....x.......x...', shaker: 'x.x.x.x.x.x.x.x.', 'wood:900': '......x.......x.' }, { vel: 0.3, gains: { shaker: 0.45 } }),
    ] },
    tense: { bpm: 138, bars: 8, key: 62, scale: DOR, prog: [0, 0, 3, 4], seed: 41, rev: 0.25, parts: [
      lead('chip', { lo: 69, hi: 86, density: 0.62, vel: 0.32 }),
      comp('pizz', 'arp16', { oct: 57, vel: 0.18 }),
      bass('bass', 'pulse', { oct: 38, vel: 0.36 }),
      drums({ kick: 'x...x...x...x...', tick: 'x.x.x.x.x.x.x.x.', snap: '....x.......x...' }, { vel: 0.32, gains: { tick: 0.5 } }),
    ] },
  },

  // ---------------- Mèo Nổ: bossa + mèo quậy ----------------
  meono: {
    key: 62,
    lobby: { bpm: 92, bars: 8, key: 62, scale: MAJ, prog: [s7(0), s7(3), s7(1), s7(4)], seed: 6, rev: 0.45, parts: [
      comp('nylon', 'bossa', { oct: 57, vel: 0.24 }),
      lead('flute', { lo: 72, hi: 88, density: 0.42, vel: 0.4, echo: 0.5 }),
      bass('upright', 'bossa', { oct: 40, vel: 0.36 }),
      drums({ rim: 'x..x..x...x..x..', shaker: 'xoxoxoxoxoxoxoxo', kick: 'x..x....x..x....' }, { vel: 0.26, gains: { shaker: 0.45 } }),
    ] },
    game: { bpm: 120, bars: 16, key: 60, scale: MAJ, prog: [0, 5, 1, 4, 0, 3, s7(4), 0], seed: 17, rev: 0.3, parts: [
      lead('accordion', { lo: 67, hi: 84, density: 0.6, vel: 0.3, busy: 0.7, harm: -2 }),
      comp('pizz', 'offbeat', { oct: 57, vel: 0.22 }),
      bass('tuba', 'oom', { oct: 40, vel: 0.36 }),
      drums({ kick: 'x.......x.......', snare: '....x.......x...', 'wood:1300': '..x.......x...x.' }, { vel: 0.28 }),
    ] },
    tense: { bpm: 112, bars: 8, key: 57, scale: HARM, prog: [0, 3, 4, 0], seed: 23, rev: 0.3, parts: [
      lead('pizz', { lo: 69, hi: 84, density: 0.7, vel: 0.36, legato: 0.5 }),
      comp('strings', 'pad', { oct: 52, vel: 0.12 }),
      bass('upright', 'walk', { oct: 38, vel: 0.36 }),
      drums({ kick: 'x..x............', tick: '..x...x...x...x.', 'tom:120': '..............x.' }, { vel: 0.34, gains: { tick: 0.5 } }),
    ] },
  },

  // ---------------- Tam Quốc: ngũ cung cổ phong ----------------
  tamquoc: {
    key: 57,
    lobby: { bpm: 70, bars: 8, key: 57, scale: MPENT, prog: [0, 0, 3, 4, 0, 2, 3, 0], seed: 17, rev: 0.7, revSize: 1.3, parts: [
      comp('tranh', 'roll', { oct: 57, vel: 0.26 }),
      lead('xiao', { lo: 64, hi: 81, density: 0.32, vel: 0.42, maxLen: 3, from: 2 }),
      comp('pad', 'pad', { oct: 45, vel: 0.12, voices: 2 }),
      sprinkle('gong', 8, [0], 0.3, 98),
    ] },
    game: { bpm: 92, bars: 16, key: 57, scale: MPENT, prog: [0, 0, 3, 4, 0, 0, 2, 4, 3, 3, 0, 4, 2, 3, 4, 0], seed: 27, rev: 0.5, parts: [
      lead('erhu', { lo: 64, hi: 84, density: 0.5, vel: 0.36, form: 'AABA' }),
      comp('tranh', 'arp', { oct: 57, vel: 0.2 }),
      bass('bass', 'root5', { oct: 40, vel: 0.3 }),
      drums({ 'taiko:62': 'x.......x..x....', 'tom:160': '............x...', 'wood:1000': '..x...x...x...x.' }, { vel: 0.36, gains: { 'wood:1000': 0.4 } }),
    ] },
    tense: { bpm: 116, bars: 8, key: 57, scale: MPENT, prog: [0, 0, 4, 3, 0, 0, 4, 4], seed: 37, rev: 0.4, parts: [
      lead('erhu', { lo: 69, hi: 88, density: 0.68, vel: 0.36 }),
      comp('pipa', 'trem', { oct: 57, vel: 0.2 }),
      bass('bass', '8th', { oct: 38, vel: 0.3 }),
      drums({ 'taiko:58': 'x.x.x..xx.x.x..x', 'tom:140': '....x.......x...', cymbal: 'x...............' }, { vel: 0.4, gains: { cymbal: 0.25 }, fill: { 'tom:140': 'x.x.x.x.xxxxxxxx' } }),
      sprinkle('gong', 8, [0], 0.3, 87),
    ] },
  },

  // ---------------- Ma Sói: làng quê ma mị ----------------
  masoi: {
    key: 50,
    lobby: { bpm: 66, bars: 8, key: 50, scale: MPENT, prog: [0, 0, 3, 2, 0, 0, 4, 0], seed: 3, rev: 0.75, revSize: 1.4, parts: [
      comp('choir', 'pad', { oct: 50, vel: 0.14 }),
      comp('harp', 'arp', { oct: 62, vel: 0.18 }),
      lead('danbau', { lo: 62, hi: 79, density: 0.3, vel: 0.4, maxLen: 3, from: 2 }),
      drums({ 'mo:700': '........x.......' }, { vel: 0.18 }),
    ] },
    day: { bpm: 100, bars: 16, key: 60, scale: BAC, prog: [0, 0, 3, 2, 0, 1, 3, 0], seed: 14, rev: 0.4, parts: [
      lead('tranh', { lo: 72, hi: 91, density: 0.55, vel: 0.4, form: 'AABA' }),
      lead('sao', { lo: 72, hi: 88, density: 0.35, vel: 0.28, form: 'ABAC', from: 8 }),
      bass('bass', 'root5', { oct: 41, vel: 0.3 }),
      drums({ 'mo:800': '..x...x...x...x.', 'conga:300': 'x.....x.x.......' }, { vel: 0.28 }),
    ] },
    night: { bpm: 62, bars: 8, key: 50, scale: MPENT, prog: [0, 3, 0, 4, 0, 2, 3, 0], seed: 2, rev: 0.8, revSize: 1.5, parts: [
      comp('drone', 'pad', { oct: 38, vel: 0.2, voices: 2 }),
      comp('choir', 'pad', { oct: 55, vel: 0.1, mask: '01' }),
      lead('danbau', { lo: 62, hi: 77, density: 0.32, vel: 0.42, maxLen: 3 }),
      drums({ 'taiko:55': 'x...........x...', 'mo:650': '........x.......' }, { vel: 0.22 }),
    ] },
    vote: { bpm: 108, bars: 8, key: 50, scale: HARM, prog: [0, 0, 5, 4], seed: 19, rev: 0.45, parts: [
      comp('strings', 'trem', { oct: 50, vel: 0.14 }),
      lead('danbau', { lo: 62, hi: 79, density: 0.45, vel: 0.36 }),
      bass('sub', 'pulse', { oct: 38, vel: 0.3 }),
      drums({ 'taiko:62': 'x...x...x...x...', 'tom:120': '......x.......xx', 'mo:900': '..x...x...x...x.' }, { vel: 0.36, gains: { 'mo:900': 0.4 } }),
    ] },
  },

  // ---------------- Tiến Lên: Tết, điệu Bắc ngũ cung, đàn tranh + sáo ----------------
  tienlen: {
    key: 62,
    lobby: { bpm: 84, bars: 8, key: 62, scale: BAC, prog: [0, 0, 3, 2, 0, 1, 3, 0], seed: 10, rev: 0.55, parts: [
      comp('tranh', 'roll', { oct: 62, vel: 0.24 }),
      lead('sao', { lo: 74, hi: 91, density: 0.38, vel: 0.4, maxLen: 3, from: 2 }),
      bass('bass', 'root', { oct: 38, vel: 0.26 }),
      drums({ 'mo:850': '........x.......' }, { vel: 0.2 }),
    ] },
    game: { bpm: 112, bars: 16, key: 62, scale: BAC, prog: [0, 3, 2, 0, 0, 3, 1, 0], seed: 26, rev: 0.4, parts: [
      lead('sao', { lo: 74, hi: 93, density: 0.58, vel: 0.36, form: 'AABA', lift: true }),
      comp('tranh', 'arp', { oct: 62, vel: 0.2, pan: -0.3 }),
      bass('bass', 'root5', { oct: 40, vel: 0.32 }),
      drums({ 'conga:280': 'x..x..x.x.......', 'bongo:520': '....x.......x.x.', 'mo:900': '..x...x...x...x.', tamb: '....x.......x...' }, { vel: 0.32, gains: { 'mo:900': 0.45, tamb: 0.5 } }),
      sprinkle('cracker', 8, [3, 3.25, 3.375, 3.5, 3.75], 0.22),
    ] },
    tense: { bpm: 132, bars: 8, key: 62, scale: BAC, prog: [0, 0, 3, 4, 0, 0, 2, 4], seed: 44, rev: 0.3, parts: [
      lead('sao', { lo: 76, hi: 93, density: 0.72, vel: 0.36 }),
      comp('tranh', 'trem', { oct: 62, vel: 0.16 }),
      bass('bass', '8th', { oct: 38, vel: 0.32 }),
      drums({ kick: 'x...x...x...x...', 'conga:300': 'x.xx.xx.x.xx.xx.', 'tom:150': '..............xx', tamb: '..x...x...x...x.' }, { vel: 0.36, gains: { tamb: 0.5 } }),
      sprinkle('cracker', 4, [3, 3.125, 3.25, 3.5, 3.625, 3.75, 3.875], 0.22),
    ] },
  },

  // ---------------- Cát Tê: dân ca Nam bộ, đàn kìm/đàn bầu ----------------
  catte: {
    key: 57,
    lobby: { bpm: 76, bars: 8, key: 57, scale: MPENT, prog: [0, 3, 0, 4, 0, 2, 3, 0], seed: 15, rev: 0.6, parts: [
      lead('danbau', { lo: 64, hi: 81, density: 0.34, vel: 0.42, maxLen: 3 }),
      comp('harp', 'arp', { oct: 57, vel: 0.2 }),
      bass('bass', 'root', { oct: 40, vel: 0.26 }),
      drums({ 'mo:760': '....x.......x...' }, { vel: 0.2 }),
    ] },
    game: { bpm: 104, bars: 16, key: 57, scale: MPENT, prog: [0, 0, 3, 4, 0, 2, 3, 0], seed: 31, rev: 0.4, parts: [
      lead('pipa', { lo: 69, hi: 88, density: 0.62, vel: 0.36, busy: 0.7 }),
      lead('sao', { lo: 69, hi: 86, density: 0.35, vel: 0.24, form: 'ABAC', from: 8, pan: 0.35 }),
      comp('nylon', 'strum', { oct: 57, vel: 0.18 }),
      bass('bass', 'root5', { oct: 40, vel: 0.32 }),
      drums({ 'conga:260': 'x.....x.x.......', 'mo:820': '..x...x...x...x.', 'bongo:480': '....x.......x..x' }, { vel: 0.32, gains: { 'mo:820': 0.45 } }),
    ] },
    tense: { bpm: 126, bars: 8, key: 57, scale: MPENT, prog: [0, 0, 4, 3], seed: 47, rev: 0.32, parts: [
      lead('pipa', { lo: 69, hi: 88, density: 0.75, vel: 0.36 }),
      comp('strings', 'trem', { oct: 52, vel: 0.12 }),
      bass('bass', '8th', { oct: 38, vel: 0.3 }),
      drums({ 'taiko:65': 'x..x..x.x..x..x.', 'tom:140': '....x.......x.xx', 'mo:900': 'x.x.x.x.x.x.x.x.' }, { vel: 0.36, gains: { 'mo:900': 0.35 } }),
    ] },
  },

  // ---------------- Xì Dách: lounge jazz sòng bài ----------------
  xidach: {
    key: 65,
    lobby: { bpm: 88, bars: 8, key: 65, scale: MAJ, prog: [s7(1), s7(4), s7(0), s7(5)], swing: 0.55, seed: 12, rev: 0.45, parts: [
      comp('epiano', 'charleston', { oct: 57, vel: 0.24 }),
      lead('vibes', { lo: 74, hi: 89, density: 0.42, vel: 0.36 }),
      bass('upright', 'walk', { oct: 40, vel: 0.36 }),
      drums({ ohat: 'x...x.xox...x.xo', brush: '....x.......x...' }, { vel: 0.24, gains: { ohat: 0.4 } }),
    ] },
    game: { bpm: 120, bars: 16, key: 63, scale: MAJ, prog: [s7(1), s7(4), s7(0), s7(5), s7(3), s7(2), s7(1), s7(4)], swing: 0.6, seed: 22, rev: 0.35, parts: [
      lead('sax', { lo: 63, hi: 82, density: 0.55, vel: 0.36, busy: 0.7, form: 'AABA' }),
      comp('epiano', 'charleston', { oct: 57, vel: 0.22 }),
      bass('upright', 'walk', { oct: 39, vel: 0.38 }),
      drums({ ohat: 'x...x.xox...x.xo', brush: '....x.......x...', kick: 'x.........x.....' }, { vel: 0.28, gains: { ohat: 0.4, kick: 0.6 } }),
    ] },
    tense: { bpm: 132, bars: 8, key: 62, scale: HARM, prog: [s7(0), s7(5), s7(1), s7(4)], swing: 0.5, seed: 52, rev: 0.3, parts: [
      comp('brass', 'stab', { oct: 57, vel: 0.24 }),
      lead('vibes', { lo: 74, hi: 89, density: 0.6, vel: 0.32 }),
      bass('upright', 'walk', { oct: 38, vel: 0.38 }),
      drums({ ohat: 'x.x.x.x.x.x.x.x.', snare: '....x.......x..x', kick: 'x.....x...x.....' }, { vel: 0.32, gains: { ohat: 0.35 } }),
    ] },
  },

  // ---------------- Poker: casino lounge ----------------
  poker: {
    key: 63,
    lobby: { bpm: 82, bars: 8, key: 63, scale: MAJ, prog: [s7(0), s7(5), s7(1), s7(4)], seed: 30, rev: 0.5, parts: [
      comp('nylon', 'bossa', { oct: 57, vel: 0.22 }),
      lead('epiano', { lo: 70, hi: 87, density: 0.4, vel: 0.36 }),
      bass('upright', 'bossa', { oct: 39, vel: 0.36 }),
      drums({ rim: 'x..x..x...x..x..', shaker: 'xoxoxoxoxoxoxoxo' }, { vel: 0.22, gains: { shaker: 0.45 } }),
    ] },
    game: { bpm: 104, bars: 16, key: 58, scale: MAJ, prog: [s7(0), s7(5), s7(1), s7(4), s7(2), s7(5), s7(1), s7(4)], swing: 0.55, seed: 40, rev: 0.38, parts: [
      lead('vibes', { lo: 70, hi: 89, density: 0.5, vel: 0.34, form: 'ABAC' }),
      comp('epiano', 'block', { oct: 57, vel: 0.18 }),
      bass('upright', 'walk', { oct: 38, vel: 0.38 }),
      drums({ ohat: 'x...x.xox...x.xo', brush: '....x.......x...' }, { vel: 0.26, gains: { ohat: 0.4 } }),
    ] },
    tense: { bpm: 116, bars: 8, key: 55, scale: MIN, prog: [0, 5, 3, 4], seed: 61, rev: 0.32, parts: [
      lead('sax', { lo: 62, hi: 79, density: 0.5, vel: 0.36 }),
      comp('strings', 'trem', { oct: 55, vel: 0.12 }),
      bass('upright', 'pulse', { oct: 38, vel: 0.38 }),
      drums({ kick: 'x.......x.......', ohat: 'x.x.x.x.x.x.x.x.', 'tom:100': '............x.x.' }, { vel: 0.32, gains: { ohat: 0.3 } }),
    ] },
  },

  // ---------------- Cá Ngựa: phi nước đại vui tươi ----------------
  cangua: {
    key: 67,
    lobby: { bpm: 100, bars: 8, key: 67, scale: MAJ, prog: [0, 3, 4, 0, 5, 3, 4, 0], seed: 16, rev: 0.4, parts: [
      lead('flute', { lo: 74, hi: 91, density: 0.45, vel: 0.4 }),
      comp('nylon', 'strum', { oct: 57, vel: 0.2 }),
      bass('bass', 'root5', { oct: 40, vel: 0.3 }),
      drums({ 'clop:560': 'x.....x.x.....x.' }, { vel: 0.22 }),
    ] },
    game: { bpm: 132, bars: 16, key: 65, scale: MAJ, prog: [0, 0, 3, 4, 0, 5, 1, 4], seed: 36, rev: 0.3, parts: [
      lead('brass', { lo: 69, hi: 86, density: 0.55, vel: 0.32, form: 'AABA', lift: true }),
      lead('glock', { lo: 81, hi: 96, density: 0.3, vel: 0.18, form: 'ABAC', from: 8, pan: 0.35 }),
      comp('guitar', 'strum8', { oct: 57, vel: 0.12 }),
      bass('bass', 'gallop', { oct: 41, vel: 0.32 }),
      drums({ 'clop:600': 'x.xxx.xxx.xxx.xx', kick: 'x.......x.......', snare: '....x.......x...' }, { vel: 0.3, gains: { 'clop:600': 0.5 }, fill: { snare: '....x...x.x.xxxx' } }),
    ] },
    tense: { bpm: 148, bars: 8, key: 62, scale: MIN, prog: [0, 5, 6, 0, 0, 3, 4, 4], seed: 46, rev: 0.28, parts: [
      lead('brass', { lo: 69, hi: 88, density: 0.65, vel: 0.32 }),
      comp('strings', 'trem', { oct: 57, vel: 0.12 }),
      bass('bass', 'gallop', { oct: 38, vel: 0.34 }),
      drums({ 'clop:620': 'x.xxx.xxx.xxx.xx', kick: 'x...x...x...x...', snare: '....x.......x.xx' }, { vel: 0.34, gains: { 'clop:620': 0.5 } }),
      sprinkle('cymbal', 4, [0], 0.2),
    ] },
  },

  // ---------------- Lạc Đà: đoàn lữ hành sa mạc, thang Hijaz ----------------
  camel: {
    key: 62,
    lobby: { bpm: 76, bars: 8, key: 62, scale: HIJAZ, prog: [0, 0, 3, 0, 6, 6, 0, 0], seed: 19, rev: 0.6, revSize: 1.3, parts: [
      comp('drone', 'pad', { oct: 38, vel: 0.18, voices: 2 }),
      lead('ney', { lo: 62, hi: 81, density: 0.36, vel: 0.4, maxLen: 3 }),
      comp('oud', 'arp', { oct: 57, vel: 0.16, mask: '0111' }),
      drums({ 'doum:85': 'x.....x.x.......', tek: '..x.........x...' }, { vel: 0.24 }),
    ] },
    game: { bpm: 100, bars: 16, key: 62, scale: HIJAZ, prog: [0, 0, 3, 0, 6, 6, 3, 0], seed: 39, rev: 0.45, parts: [
      lead('oud', { lo: 62, hi: 81, density: 0.6, vel: 0.4, busy: 0.7, form: 'AABA' }),
      lead('ney', { lo: 69, hi: 84, density: 0.3, vel: 0.24, form: 'ABAC', from: 8, pan: -0.3 }),
      comp('drone', 'pad', { oct: 38, vel: 0.14, voices: 2 }),
      drums({ 'doum:85': 'x.....x.x.......', tek: '..x.........x...', tamb: '....x.......x...' }, { vel: 0.32, gains: { tamb: 0.4 } }),
      sprinkle('bellhit', 4, [0, 2], 0.18, 1250),
    ] },
    tense: { bpm: 124, bars: 8, key: 62, scale: HIJAZ, prog: [0, 0, 6, 0, 3, 3, 1, 0], seed: 59, rev: 0.35, parts: [
      lead('ney', { lo: 67, hi: 86, density: 0.62, vel: 0.36 }),
      comp('oud', 'trem', { oct: 57, vel: 0.18 }),
      bass('sub', 'pulse', { oct: 38, vel: 0.3 }),
      drums({ 'doum:80': 'x.....x.x...x...', tek: '..x.x..x..x.x.xx', tamb: 'x.x.x.x.x.x.x.x.', cymbal: 'x...............' }, { vel: 0.36, gains: { tamb: 0.3, cymbal: 0.2 } }),
    ] },
  },
};

// đoạn nhạc ngắn khi có biến (thắng/thua/có người bị loại/đấu tay đôi)
export function stingerSpec(kind, key = 60) {
  const P = [0, 4, 7, 12, 16, 19, 24];
  const fn = {
    win: (c, N, D) => { [0, 4, 7, 12].forEach((k, i) => N('brass', key + 12 + k, 0, i * 0.33, 0.4, 0.5)); N('brass', key + 24, 0, 1.4, 2.2, 0.55); N('glock', key + 31, 0, 1.4, 1, 0.3); D('cymbal', 0, 1.4, 0.4); D('kick', 0, 1.4, 0.6); },
    lose: (c, N, D) => { [7, 6, 5, 0].forEach((k, i) => N('trem', key + k, 0, i * 0.6, i === 3 ? 2 : 0.55, 0.35)); D('tom', 0, 2.4, 0.5, {}, 90); },
    death: (c, N, D) => { [12, 8, 5, 0].forEach((k, i) => N('strings', key + k, 0, i * 0.45, 0.6, 0.35)); D('gong', 0, 1.8, 0.6, {}, 80); D('taiko', 0, 0, 0.6); },
    duel: (c, N, D) => { N('strings', key, 0, 0, 3, 0.3); N('strings', key + 6, 0, 0, 3, 0.25); [0, 0.75, 1.5, 1.875, 2.25].forEach(b => D('taiko', 0, b, 0.6)); },
  }[kind] || (() => {});
  return { bpm: 100, bars: 1, beats: 4, key, scale: MAJ, prog: [0], oneshot: true, tail: 3, rev: 0.4, loud: 0.12, parts: [{ type: 'fn', fn }] };
}
