// Lọc ngôn từ cơ bản (tiếng Việt + tiếng Anh) cho chat/tên. Thay từ bậy bằng ***.
// Hai loại: (1) từ CÓ DẤU – chỉ bắt đúng chữ có dấu (vì bỏ dấu dễ trùng từ thường: lồn/lon, đéo/deo);
//           (2) từ viết tắt / không dấu chắc chắn bậy – bắt cả khi viết hoa, chèn dấu chấm, kéo dài chữ.
const WITH_MARKS = ['lồn', 'cặc', 'buồi', 'địt', 'đụ', 'đĩ', 'đéo', 'đếch', 'lìn', 'cứt', 'nứng', 'dái', 'chó đẻ', 'đồ chó', 'óc chó', 'mặt lồn', 'con đĩ', 'đầu buồi', 'thằng chó', 'mẹ mày', 'má mày', 'bố mày', 'cha mày', 'đù má', 'đù mé', 'vãi lồn', 'vãi cả lồn', 'vãi cứt'];
const PLAIN = ['dm', 'dmm', 'dmmm', 'đm', 'đmm', 'dcm', 'đcm', 'vcl', 'vkl', 'vcc', 'vl', 'clm', 'cmm', 'cmn', 'cl', 'cc', 'loz', 'lol', 'lz', 'dit', 'djt', 'deo', 'dek', 'dkm', 'đkm', 'dmcs', 'ditme', 'dume', 'duma', 'dmvl', 'occho', 'oc cho',
  'fuck', 'fucking', 'fck', 'fuk', 'shit', 'bitch', 'bastard', 'cunt', 'dick', 'pussy', 'asshole', 'motherfucker', 'nigger', 'nigga', 'faggot', 'retard', 'whore', 'slut'];
// "lol" (cười) và "deo" (đeo) quá phổ biến – chỉ chặn ở dạng chắc bậy
const SOFT = new Set(['lol', 'deo', 'cl', 'cc', 'vl']);
const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// cho phép chèn ký tự lạ giữa các chữ: d.m, đ-m, v c l, fuuuck
const loose = w => [...w].map(c => c === ' ' ? '[\\s._\\-*]*' : esc(c) + '+').join('[\\s._\\-*]{0,2}');
const RX_MARKS = new RegExp(`(^|[^\\p{L}])(${WITH_MARKS.map(w => loose(w.normalize('NFC'))).join('|')})(?=$|[^\\p{L}])`, 'giu');
const HARD = PLAIN.filter(w => !SOFT.has(w));
const RX_PLAIN = new RegExp(`(^|[^\\p{L}\\d])(${HARD.map(w => loose(strip(w).toLowerCase())).join('|')})(?=$|[^\\p{L}\\d])`, 'giu');
// chữ mềm: chỉ chặn khi đi cùng chữ bậy khác hoặc viết dài kiểu "vlllll", "cccc"
const RX_SOFT = /(^|[^\p{L}\d])(v+l{2,}|c{3,}|l+o+z+)(?=$|[^\p{L}\d])/giu;

const CTRL = new RegExp('[\\u0000-\\u001f\\u200b-\\u200f\\u2028-\\u202e\\ufeff]', 'g');
export function clean(text) {
  let s = String(text || '').normalize('NFC').replace(CTRL, ' ').replace(/\s{3,}/g, '  ').trim();
  let hit = false;
  const star = (m, pre, w) => { hit = true; return pre + '*'.repeat(Math.min(6, Math.max(3, [...w].length))); };
  s = s.replace(RX_MARKS, star);
  // dạng không dấu: so trên bản bỏ dấu nhưng thay vào bản gốc (giữ đúng vị trí ký tự vì bỏ dấu không đổi số ký tự sau NFC→NFD→bỏ dấu? – không chắc, nên làm theo từng từ)
  s = s.split(/(\s+)/).map(tok => {
    if (/^\s+$/.test(tok)) return tok;
    const plain = strip(tok).toLowerCase();
    const t2 = plain.replace(RX_PLAIN, (m, pre, w) => pre + '\u0000'.repeat(w.length)).replace(RX_SOFT, (m, pre, w) => pre + '\u0000'.repeat(w.length));
    if (!t2.includes('\u0000')) return tok;
    hit = true;
    const chars = [...tok]; let out = '';
    const pc = [...t2];
    for (let i = 0; i < chars.length; i++) out += pc[i] === '\u0000' ? '*' : chars[i];
    return out;
  }).join('');
  // cụm 2 từ không dấu (oc cho, cai lon…)
  const plainAll = strip(s).toLowerCase();
  if (/(^|[^a-z])(oc\s*cho|dit\s*me|du\s*ma)([^a-z]|$)/.test(plainAll)) {
    hit = true;
    s = s.replace(/(ó|o)c\s*ch(ó|o)|[đd](ị|i)t\s*m(ẹ|e)|[đd](ụ|u)\s*m(á|a)/giu, m => '*'.repeat(m.length));
  }
  return { text: s, hit };
}

export const cleanName = n => clean(String(n || '').replace(/[<>]/g, '').slice(0, 20)).text.trim();
