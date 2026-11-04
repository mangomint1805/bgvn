// Trình phát nhạc nền dùng chung cho mọi game BGVN.
// - Mặc định BẬT: tự phát ở lần chạm/nhấn phím đầu tiên (luật autoplay của trình duyệt). Ai tắt thì nhớ theo từng game.
// - Mỗi "tâm trạng" (lobby/game/tense…) là 1 vòng nhạc dựng sẵn → phát lặp bằng 1 nguồn, chuyển bài bằng crossfade.
// - Bền: ra/vào tab, khoá màn hình, app chạy nền → tự resume AudioContext (hoặc chờ lần chạm kế tiếp), vòng nhạc bị dừng thì phát lại.
// - Không bao giờ có 2 vòng nhạc chồng nhau (chỉ 1 nguồn chính + tối đa 1 nguồn đang tắt dần).
import { renderSong } from './synth.js?v=2';
import { THEMES, stingerSpec } from './themes.js?v=2';

const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const ALL = [];
export const globalMuted = () => ls.get('bgvn-mute-all') === '1';
export function setGlobalMute(m) { ls.set('bgvn-mute-all', m ? '1' : '0'); ALL.forEach(b => (m ? b.stop() : b.resumeIfOn())); }
// âm lượng hiệu ứng (sfx) lưu theo game, dùng chung khoá cho mọi game
export function sfxVolStore(game, def = 0.8) {
  const k = 'bgvn-sfxvol-' + game;
  return { get: () => { const v = ls.get(k); return v == null || isNaN(+v) ? def : Math.max(0, Math.min(1, +v)); }, set: v => ls.set(k, String(v)) };
}

/**
 * opts: { game, ctx: () => AudioContext (tạo/resume), dest?: () => AudioNode, legacy?: giá trị bật/tắt cũ ('0' = người dùng đã TẮT),
 *         volKey?, volDefault=.5, gain=.45 (hệ số tổng), fade=1.8, onChange?(on) }
 */
export function createBGM({ game, ctx, dest, legacy, volKey, volDefault = 0.5, gain = 0.45, fade = 1.8, onChange } = {}) {
  const KEY = 'bgvn-music-' + game, theme = THEMES[game] || THEMES.uno;
  let on = (() => { const v = ls.get(KEY); if (v === '1' || v === '0') return v === '1'; const lg = typeof legacy === 'function' ? legacy() : legacy; return !(lg === '0' || lg === 0); })();
  let vol = (() => { const v = volKey ? ls.get(volKey) : null; return v == null || isNaN(+v) ? volDefault : Math.max(0, Math.min(1, +v)); })();
  let mood = 'lobby', variant = null, ac = null, bus = null, cur = null, fading = null, gen = 0, duckT = 0;
  const cache = new Map(), pending = new Map();
  const isOk = () => on && !globalMuted();

  function A() {
    let a = null; try { a = ctx(); } catch (e) { a = null; }
    if (!a) return null;
    if (a !== ac) { ac = a; bus = a.createGain(); bus.gain.value = vol * gain; let d = null; try { d = dest && dest(); } catch (e) {} bus.connect(d || a.destination); cur = null; fading = null; }
    return ac;
  }
  const setOf = () => (variant && theme.variants && theme.variants[variant]) || {};
  const specFor = m => setOf()[m] || theme[m] || setOf().game || theme.game || theme.lobby;
  const keyOf = m => { const s = specFor(m); for (const [v, o] of Object.entries(theme.variants || {})) for (const [mm, ss] of Object.entries(o)) if (ss === s) return v + ':' + mm; for (const [mm, ss] of Object.entries(theme)) if (ss === s) return mm; return m; };
  function buffer(m) {
    const k = keyOf(m);
    if (cache.has(k)) return Promise.resolve(cache.get(k));
    if (pending.has(k)) return pending.get(k);
    const p = renderSong(specFor(m)).then(r => {
      const b = ac.createBuffer(2, r.n, r.sr); b.getChannelData(0).set(r.L); b.getChannelData(1).set(r.R);
      cache.set(k, b); pending.delete(k); return b;
    }).catch(e => { pending.delete(k); throw e; });
    pending.set(k, p); return p;
  }
  function kill(x) { if (!x) return; try { x.g.gain.cancelScheduledValues(0); x.g.gain.value = 0; } catch (e) {} try { x.src.stop(); } catch (e) {} try { x.src.disconnect(); x.g.disconnect(); } catch (e) {} x.alive = false; }
  function fadeOut(x, t, dur) { try { x.g.gain.cancelScheduledValues(t); x.g.gain.setValueAtTime(Math.max(0.0001, x.g.gain.value), t); x.g.gain.linearRampToValueAtTime(0.0001, t + dur); x.src.stop(t + dur + 0.05); } catch (e) { kill(x); } }
  let preloaded = false;
  function preloadRest() {
    if (preloaded) return; preloaded = true;
    const names = Object.keys(theme).filter(k => theme[k] && theme[k].bpm);
    (async () => { for (const m of names) { await new Promise(r => setTimeout(r, 1200)); if (!ac) return; try { await buffer(m); } catch (e) {} } })();
  }
  async function play() {
    if (!isOk()) return;
    const a = A(); if (!a) return;
    if (a.state !== 'running') { try { a.resume(); } catch (e) {} }
    const want = keyOf(mood);
    if (cur && cur.alive && cur.key === want) return;
    const my = ++gen;
    let buf; try { buf = await buffer(mood); } catch (e) { return; }
    if (my !== gen || !isOk() || a !== ac || keyOf(mood) !== want) return;
    if (cur && cur.alive && cur.key === want) return;
    const t = a.currentTime + 0.04, first = !cur || !cur.alive;
    if (fading) { kill(fading); fading = null; }
    const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + (first ? 0.9 : fade)); g.connect(bus);
    const src = a.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(g);
    const me = { src, g, key: want, alive: true, t0: t };
    src.onended = () => { me.alive = false; if (cur === me) cur = null; if (fading === me) fading = null; };
    src.start(t);
    if (cur && cur.alive) { fadeOut(cur, t, fade); fading = cur; }
    cur = me;
    preloadRest();
  }
  function stop(quick) {
    gen++;
    const a = ac; if (!a) { cur = null; return; }
    const t = a.currentTime;
    if (fading) { kill(fading); fading = null; }
    if (cur) { if (quick) kill(cur); else fadeOut(cur, t, 0.35); fading = quick ? null : cur; cur = null; }
  }
  // ---- hồi sinh khi quay lại tab / mở khoá máy / chạm lần kế ----
  function revive() {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!ac) return;
    if (ac.state !== 'running') { try { const p = ac.resume(); p && p.catch && p.catch(() => {}); } catch (e) {} }
    if (isOk() && (!cur || !cur.alive)) play();
  }
  function gesture() {
    if (!ac) { if (!isOk()) return; }
    const a = A(); if (!a) return;
    if (a.state !== 'running') { try { const p = a.resume(); p && p.catch && p.catch(() => {}); } catch (e) {} }
    if (isOk() && (!cur || !cur.alive)) play();
  }
  if (typeof window !== 'undefined') {
    for (const ev of ['pointerdown', 'keydown', 'touchend', 'mousedown']) window.addEventListener(ev, gesture, { capture: true, passive: true });
    document.addEventListener('visibilitychange', revive); window.addEventListener('focus', revive); window.addEventListener('pageshow', revive);
    setInterval(() => { if (ac && !document.hidden && isOk()) { if (ac.state !== 'running') revive(); else if (!cur || !cur.alive) play(); } }, 3000);
  }

  const api = {
    game,
    isOn: () => on,
    set(v) { v = !!v; on = v; ls.set(KEY, v ? '1' : '0'); if (v) { A(); play(); } else stop(); onChange && onChange(v); return v; },
    toggle(v) { return api.set(v == null ? !on : v); },
    start: () => play(),
    stop: () => stop(),
    resumeIfOn() { if (isOk()) { A(); play(); } },
    mood(m) { if (!m || m === mood) return mood; mood = m; if (isOk() && ac) play(); return mood; },
    getMood: () => mood,
    variant(v) { if (v === variant) return; variant = v; if (isOk() && ac && cur) play(); },
    volume(v) { if (v == null) return vol; vol = Math.max(0, Math.min(1, +v)); if (volKey) ls.set(volKey, String(vol)); if (bus && ac) { bus.gain.cancelScheduledValues(ac.currentTime); bus.gain.setTargetAtTime(vol * gain, ac.currentTime, 0.05); } return vol; },
    // hạ nhỏ nhạc một lúc (khi có đoạn nhạc ngắn/âm báo quan trọng)
    duck(sec = 2, lvl = 0.3) { if (!ac || !cur) return; const t = ac.currentTime, g = cur.g.gain; try { g.cancelScheduledValues(t); g.setValueAtTime(Math.max(0.0001, g.value), t); g.linearRampToValueAtTime(lvl, t + 0.15); g.setValueAtTime(lvl, t + sec); g.linearRampToValueAtTime(1, t + sec + 1.2); } catch (e) {} },
    async stinger(kind) {
      if (!isOk() || !ac || ac.state !== 'running') return;
      const now = Date.now(); if (now - duckT < 1500) return; duckT = now;
      const k = 'sting:' + kind; let b = cache.get(k);
      if (!b) { try { const r = await renderSong(stingerSpec(kind, theme.key || 60)); b = ac.createBuffer(2, r.n, r.sr); b.getChannelData(0).set(r.L); b.getChannelData(1).set(r.R); cache.set(k, b); } catch (e) { return; } }
      api.duck(kind === 'win' || kind === 'lose' ? 3.2 : 2.4, 0.25);
      const s = ac.createBufferSource(), g = ac.createGain(); g.gain.value = 0.8; s.buffer = b; s.connect(g); g.connect(bus); s.start();
    },
    _ac: () => ac, _kill() { if (cur) kill(cur); cur = null; },
    state() { return { game, on, mood, variant, ctx: ac ? ac.state : 'none', playing: !!(cur && cur.alive), key: cur && cur.key, sources: (cur && cur.alive ? 1 : 0) + (fading && fading.alive ? 1 : 0), cached: [...cache.keys()] }; },
  };
  ALL.push(api);
  if (typeof window !== 'undefined') window.__bgvnAudio = { list: ALL, state: () => ALL.map(b => b.state()), revive };
  return api;
}
