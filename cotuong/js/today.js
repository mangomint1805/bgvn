// 📅 Cờ thế hôm nay: mỗi ngày (giờ Việt Nam) một bài từ kho daily.js, giữ chuỗi ngày giải liên tiếp.
// Dùng chung cho Cờ tướng và ô "Thử thách hôm nay" ở trang chủ.
import { DAILY } from './daily.js?v=1';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const KEY = 'cotuong-daily', START = Date.UTC(2026, 10, 12); /* bài #1 = 12/11/2026 */
export const dayKey = (t = Date.now()) => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
const dayNo = k => Math.round((Date.parse(k + 'T00:00:00Z') - START) / 864e5);
export function today() { const k = dayKey(), n = dayNo(k); const p = DAILY[((n % DAILY.length) + DAILY.length) % DAILY.length]; return { ...p, day: k, no: n + 1 }; }
export function state() { let d = null; try { d = JSON.parse(ls.get(KEY)); } catch (e) {} d = d && typeof d === 'object' ? d : {}; d.done = d.done || {}; d.streak = d.streak || 0; d.best = d.best || 0; if (d.last && d.last !== dayKey() && d.last !== dayKey(Date.now() - 864e5)) d.streak = 0; return d; }
// giải xong bài của ngày `k` (chỉ tính khi đúng là hôm nay)
export function markSolved(k) {
  const d = state(); if (k !== dayKey() || d.done[k]) return { ...d, fresh: false };
  d.done[k] = 1; d.streak = d.last === dayKey(Date.now() - 864e5) ? d.streak + 1 : 1; d.best = Math.max(d.best, d.streak); d.last = k;
  const keys = Object.keys(d.done).sort(); while (keys.length > 120) delete d.done[keys.shift()];
  ls.set(KEY, JSON.stringify(d)); return { ...d, fresh: true };
}
