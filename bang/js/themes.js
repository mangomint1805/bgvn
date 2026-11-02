// Chủ đề giao diện + hạt nền động (canvas)
export const THEMES = {
  desert:  { name: 'Sa mạc',    icon: '🌵', ambient: 'dust' },
  night:   { name: 'Đêm trăng', icon: '🌙', ambient: 'stars' },
  saloon:  { name: 'Quán rượu', icon: '🥃', ambient: 'smoke' },
  sunset:  { name: 'Hoàng hôn', icon: '🌅', ambient: 'tumbleweed' },
  winter:  { name: 'Mùa đông',  icon: '❄️', ambient: 'snow' },
};

let current = 'desert';
try { const t = localStorage.getItem('bangvn-theme'); if (THEMES[t]) current = t; } catch (e) {}
const listeners = [];
export function getTheme() { return current; }
export function onThemeChange(fn) { listeners.push(fn); }
export function setTheme(t) {
  if (!THEMES[t]) return;
  current = t; document.documentElement.dataset.theme = t;
  try { localStorage.setItem('bangvn-theme', t); } catch (e) {}
  startAmbient(THEMES[t].ambient);
  listeners.forEach(f => f(t));
}

// ---------- Hạt nền ----------
let cv, cx, parts = [], kind = '', raf = 0, W = 0, H = 0;
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize() { if (!cv) return; const d = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function spawn(k, init) {
  switch (k) {
    case 'dust': return { x: rnd(0, W), y: init ? rnd(0, H) : H + 10, r: rnd(1, 3), vx: rnd(.1, .6), vy: rnd(-.5, -.15), a: rnd(.15, .45), c: '160,110,60' };
    case 'stars': return { x: rnd(0, W), y: rnd(0, H * .7), r: rnd(.6, 1.8), tw: rnd(0, 6.28), sp: rnd(.01, .04), a: rnd(.4, 1), c: '255,248,220', fly: Math.random() < .25 };
    case 'smoke': return { x: rnd(0, W), y: init ? rnd(0, H) : H + 40, r: rnd(30, 80), vx: rnd(-.15, .15), vy: rnd(-.35, -.1), a: rnd(.03, .08), c: '230,220,200', g: rnd(.05, .2) };
    case 'snow': return { x: rnd(0, W), y: init ? rnd(0, H) : -10, r: rnd(1, 3.5), vx: rnd(-.3, .3), vy: rnd(.4, 1.3), a: rnd(.5, .95), c: '255,255,255', ph: rnd(0, 6.28) };
    case 'tumbleweed': return { x: -60, y: H - rnd(30, 120), r: rnd(16, 28), vx: rnd(1.5, 3), vy: 0, rot: 0, bounce: rnd(0, 6.28), a: .55 };
  }
}
function count(k) { return { dust: 50, stars: 90, smoke: 14, snow: 110, tumbleweed: 0 }[k] || 0; }
function startAmbient(k) {
  if (reduce) return;
  if (!cv) { cv = document.createElement('canvas'); cv.id = 'ambient'; document.body.prepend(cv); cx = cv.getContext('2d'); addEventListener('resize', resize); resize(); }
  kind = k; parts = []; for (let i = 0; i < count(k); i++) parts.push(spawn(k, true));
  if (k === 'sunset') parts = [];
  cancelAnimationFrame(raf); tick();
}
let lastWeed = 0;
function drawWeed(p) {
  cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.globalAlpha = p.a; cx.strokeStyle = '#7a5a32'; cx.lineWidth = 1.4;
  for (let i = 0; i < 9; i++) { cx.beginPath(); const a = i * .7; cx.ellipse(0, 0, p.r, p.r * .6, a, 0, Math.PI * 2); cx.stroke(); }
  cx.restore();
}
function tick(t = 0) {
  cx.clearRect(0, 0, W, H);
  if (kind === 'tumbleweed' && t - lastWeed > 9000 && parts.length < 2) { parts.push(spawn('tumbleweed')); lastWeed = t; }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (kind === 'stars') {
      p.tw += p.sp; const a = p.a * (.55 + .45 * Math.sin(p.tw));
      if (p.fly) { p.x += Math.sin(p.tw * .7) * .3; p.y += Math.cos(p.tw * .5) * .3; cx.fillStyle = `rgba(250,220,110,${a})`; cx.shadowColor = 'rgba(250,220,110,.8)'; cx.shadowBlur = 8; }
      else { cx.fillStyle = `rgba(${p.c},${a})`; cx.shadowBlur = 0; }
      cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill(); cx.shadowBlur = 0; continue;
    }
    if (kind === 'tumbleweed') {
      p.x += p.vx; p.bounce += .08; p.y += Math.sin(p.bounce) * 1.2; p.rot += p.vx / p.r;
      drawWeed(p); if (p.x > W + 80) parts.splice(i, 1); continue;
    }
    p.x += p.vx; p.y += p.vy;
    if (kind === 'snow') { p.ph += .02; p.x += Math.sin(p.ph) * .4; }
    if (kind === 'smoke') p.r += p.g;
    if (p.y < -100 || p.y > H + 50 || p.x > W + 100 || p.x < -100) { parts[i] = spawn(kind); continue; }
    if (kind === 'smoke') { const g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, `rgba(${p.c},${p.a})`); g.addColorStop(1, `rgba(${p.c},0)`); cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill(); }
    else { cx.fillStyle = `rgba(${p.c},${p.a})`; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill(); }
  }
  raf = requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else if (kind) { cancelAnimationFrame(raf); tick(); } });
