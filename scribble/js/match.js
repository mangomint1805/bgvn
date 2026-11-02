// So khớp đáp án: bỏ dấu tiếng Việt, không phân biệt hoa/thường, bỏ khoảng trắng & dấu câu.
// "Bánh mì" == "banh mi" == "BANHMI". Chấp nhận bỏ/thêm từ chỉ loại ở đầu: "mèo" == "con mèo".
export function fold(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
}
const tokens = s => fold(s).split(/[^a-z0-9]+/).filter(Boolean);
export const norm = s => tokens(s).join('');
const CLS = ['con', 'cai', 'chiec', 'cay', 'qua', 'trai', 'doi', 'bo', 'tam', 'cuon', 'quyen', 'chu', 'ong'];
export function core(s) { const t = tokens(s); if (t.length > 1 && CLS.includes(t[0])) t.shift(); return t.join(''); }

// Tên gọi tắt quen miệng (chủ yếu tướng LMHT): đáp án (đã chuẩn hoá) -> các cách gõ cũng tính đúng
export const ALIAS = {
  nunuwillump: ['nunu', 'nunuvawillump', 'nunuandwillump'], jarvaniv: ['jarvan', 'jarvan4'], drmundo: ['mundo'],
  wukong: ['ngokhong', 'monkeyking'], renataglasc: ['renata'], tahmkench: ['tahm'], aurelionsol: ['asol'],
  twistedfate: ['tf'], missfortune: ['mf'], masteryi: ['master'], xinzhao: ['xin'], heimerdinger: ['heimer'],
};
export function isMatch(guess, answer) {
  const g = norm(guess); if (!g) return false;
  const a = norm(answer);
  return g === a || core(guess) === core(answer) || (ALIAS[a] || []).includes(g);
}
// Khoảng cách sửa (Damerau: đổi chỗ 2 ký tự kề nhau cũng tính 1) – chỉ cần biết có ≤ 1 không
export function within1(a, b) {
  if (a === b) return true;
  const la = a.length, lb = b.length; if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let i = 0; while (i < la && a[i] === b[i]) i++;
    if (a.slice(i + 1) === b.slice(i + 1)) return true;                       // thay 1 ký tự
    return i + 1 < la && a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); // đổi chỗ
  }
  const [s, l] = la < lb ? [a, b] : [b, a];
  let i = 0; while (i < s.length && s[i] === l[i]) i++;
  return s.slice(i) === l.slice(i + 1);                                      // thừa/thiếu 1 ký tự
}
// Gần đúng: sai đúng 1 ký tự (đáp án từ 4 chữ cái trở lên, không tính dấu)
export function isNear(guess, answer) {
  if (isMatch(guess, answer)) return false;
  const g = norm(guess), a = norm(answer), cg = core(guess), ca = core(answer);
  if (!g) return false;
  return (a.length >= 4 && within1(g, a)) || (ca.length >= 4 && within1(cg, ca));
}
// Tin nhắn có lộ đáp án không (dùng chặn hoạ sĩ / người đã đoán ra nói ra đáp án)
export function leaks(text, answer) {
  const t = norm(text), a = norm(answer), ca = core(answer);
  if (!t || !a) return false;
  if (a.length < 3) return tokens(text).includes(a) || t === a; // đáp án quá ngắn (vd. "Vi"): chỉ chặn khi gõ đúng nguyên từ
  return t.includes(a) || (ca.length >= 3 && t.includes(ca)) || (ALIAS[a] || []).some(x => x.length >= 3 && t.includes(x));
}
// Mặt nạ gợi ý: giữ khoảng trắng & dấu câu, chữ chưa mở là "_"
export const isLetter = ch => /[\p{L}\p{N}]/u.test(ch);
export function letterIdx(word) { const r = []; [...word].forEach((ch, i) => { if (isLetter(ch)) r.push(i); }); return r; }
export function maskWord(word, revealed = []) {
  const set = new Set(revealed);
  return [...word].map((ch, i) => ch === ' ' ? ' ' : !isLetter(ch) || set.has(i) ? ch : '_');
}
// Số chữ cái từng từ – "bánh mì" -> [4, 2]
export const wordLens = word => String(word).split(/\s+/).filter(Boolean).map(w => [...w].filter(isLetter).length);
