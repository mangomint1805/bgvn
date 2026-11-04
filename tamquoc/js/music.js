// Nhạc nền cổ phong tự tổng hợp – thang ngũ cung (Vũ điệu), dùng bộ phát chung shared/audio/bgm.js, không file nhạc.
// Sảnh: đàn tranh rải + tiêu trầm · Trong trận: nhị hồ + đàn tranh + trống da · Gay cấn (hấp hối, quyết đấu, chúa công nguy):
// trống trận dồn + tỳ bà vê + chiêng. Mặc định BẬT, ai tắt thì nhớ.
import { actx } from './fx.js?v=8';
import { createBGM } from '../../shared/audio/bgm.js?v=2';
let legacy = null; try { legacy = localStorage.getItem('tqs-music'); } catch (e) {}
const bgm = createBGM({ game: 'tamquoc', ctx: actx, legacy, volKey: 'tqs-music-vol' });
// -1 = sảnh, 0 = bình thường, 1–2 = căng
export function musicIntensity(lv) { bgm.mood(lv < 0 ? 'lobby' : lv >= 1 ? 'tense' : 'game'); }
export const musicMood = m => bgm.mood(m);
export function musicStinger(kind) { bgm.stinger(kind); }
export function musicStart() { bgm.start(); }
export function musicStop() { bgm.stop(); }
export function musicIsOn() { return bgm.isOn(); }
export function musicToggle(v) { return bgm.toggle(v); }
export function musicVolume(v) { return bgm.volume(v); }
export function musicResumeIfOn() { bgm.resumeIfOn(); }
