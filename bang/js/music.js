// Nhạc nền Viễn Tây tự sinh – dùng bộ phát chung shared/audio/bgm.js (không file nhạc, không dính bản quyền).
// Sảnh: harmonica + guitar điệu valse bên lửa trại · Trong ván: theo chủ đề bàn (sa mạc huýt sáo / đêm / quán rượu / hoàng hôn / mùa đông)
// · Gay cấn (có người sắp chết, đấu súng, còn 2 người): trống ngựa phi + dây rền. Mặc định BẬT, ai tắt thì nhớ.
import { actx } from './fx.js?v=2';
import { createBGM } from '../../shared/audio/bgm.js?v=2';
const VARS = ['desert', 'night', 'saloon', 'sunset', 'winter'];
let legacy = null; try { legacy = localStorage.getItem('bangvn-music'); } catch (e) {}
const bgm = createBGM({ game: 'bang', ctx: actx, legacy, volKey: 'bangvn-music-vol' });
bgm.variant('desert');
export function musicSetTheme(theme) { bgm.variant(VARS.includes(theme) ? theme : 'desert'); }
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
