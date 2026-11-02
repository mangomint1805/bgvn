// Phông nền: đường chân trời Sài Gòn vẽ tay bằng SVG (Nhà thờ Đức Bà, Chợ Bến Thành, Bitexco, Landmark 81, cầu Ba Son, sông Sài Gòn)
const win = (x, y, w, h, cols, rows, gx, gy, c = '#fff8') => { let s = ''; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) s += `<rect x="${x + i * gx}" y="${y + j * gy}" width="${w}" height="${h}" rx="1" fill="${c}"/>`; return s; };
export function skylineSVG() {
  // nhà nền phía xa
  let far = ''; const H = [70, 110, 90, 140, 80, 120, 100, 150, 85, 130, 95, 115, 75, 160, 90, 105, 125, 80];
  H.forEach((h, i) => { const x = i * 92 - 20, w = 70 + (i % 3) * 12; far += `<rect x="${x}" y="${330 - h}" width="${w}" height="${h + 20}" rx="4" fill="#b9d8ee"/>` + win(x + 8, 340 - h, 6, 8, Math.floor(w / 16), Math.floor(h / 22), 14, 20, '#d9ecf8'); });
  return `<svg class="skyline" viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
  <g opacity=".9">${far}</g>
  <!-- Dinh Độc Lập -->
  <g transform="translate(40,250)"><rect x="0" y="40" width="190" height="60" fill="#f4f1e6"/><rect x="-10" y="30" width="210" height="12" rx="3" fill="#e2dccb"/><rect x="40" y="10" width="110" height="22" fill="#efe9d8"/>${win(8, 52, 10, 30, 12, 1, 15, 0, '#c9bfa6')}<rect x="85" y="-10" width="20" height="22" fill="#e2dccb"/><rect x="93" y="-30" width="3" height="22" fill="#888"/><path d="M96 -30 h22 v8 h-22z" fill="#e53935"/><path d="M96 -22 h22 v8 h-22z" fill="#1e88e5"/><circle cx="107" cy="-22" r="3" fill="#ffd54a"/></g>
  <!-- Nhà thờ Đức Bà -->
  <g transform="translate(300,170)"><rect x="0" y="80" width="150" height="100" fill="#d9775a"/><rect x="0" y="80" width="150" height="10" fill="#c45f44"/>
    <rect x="10" y="20" width="38" height="70" fill="#d9775a"/><rect x="102" y="20" width="38" height="70" fill="#d9775a"/>
    <path d="M10 22 L29 -40 L48 22Z" fill="#6d8fa8"/><path d="M102 22 L121 -40 L140 22Z" fill="#6d8fa8"/>
    <rect x="28" y="-58" width="3" height="20" fill="#555"/><rect x="23" y="-52" width="13" height="3" fill="#555"/><rect x="120" y="-58" width="3" height="20" fill="#555"/><rect x="115" y="-52" width="13" height="3" fill="#555"/>
    <circle cx="75" cy="110" r="16" fill="#f6d9c8"/><circle cx="75" cy="110" r="9" fill="#c45f44"/><path d="M60 180 v-30 a15 15 0 0 1 30 0 v30z" fill="#7a3b2c"/>${win(18, 34, 8, 16, 2, 2, 14, 24, '#7a3b2c')}${win(110, 34, 8, 16, 2, 2, 14, 24, '#7a3b2c')}</g>
  <!-- Chợ Bến Thành -->
  <g transform="translate(520,262)"><rect x="0" y="30" width="200" height="70" fill="#f3e3b6"/><path d="M-8 32 h216 l-14 -14 h-188z" fill="#c98b4a"/>
    <rect x="80" y="-30" width="40" height="62" fill="#f3e3b6"/><path d="M76 -30 h48 l-24 -22z" fill="#c98b4a"/><circle cx="100" cy="-8" r="12" fill="#fff"/><circle cx="100" cy="-8" r="12" fill="none" stroke="#5d4037" stroke-width="2"/>
    <path d="M100 -8 v-8 M100 -8 h6" stroke="#5d4037" stroke-width="2"/>${win(10, 46, 14, 30, 4, 1, 18, 0, '#a6703c')}${win(126, 46, 14, 30, 4, 1, 18, 0, '#a6703c')}<path d="M86 100 v-34 h28 v34z" fill="#a6703c"/></g>
  <!-- Bitexco -->
  <g transform="translate(860,40)"><path d="M20 320 C 14 200, 18 110, 40 20 C 62 110, 66 200, 60 320 Z" fill="#7fa6c9"/><path d="M40 20 C 48 110, 54 200, 60 320 L 44 320 C 46 200, 44 110, 40 20Z" fill="#5f88ad"/>
    <ellipse cx="72" cy="150" rx="26" ry="6" fill="#4d7396"/><rect x="38" y="0" width="4" height="22" fill="#666"/>${win(28, 40, 3, 260, 1, 1, 0, 0, '#cfe3f3')}</g>
  <!-- tháp kính -->
  <g transform="translate(980,150)"><rect width="60" height="210" rx="3" fill="#9cc4e4"/>${win(6, 8, 10, 12, 4, 12, 13, 17, '#d6e9f7')}</g>
  <g transform="translate(1060,190)"><rect width="80" height="170" rx="3" fill="#a9cbe2"/>${win(8, 10, 12, 10, 4, 10, 17, 16, '#e3f0f9')}</g>
  <!-- Landmark 81 -->
  <g transform="translate(1180,-10)">
    <rect x="10" y="230" width="90" height="140" fill="#6f95bd"/><rect x="18" y="140" width="74" height="100" fill="#7ca1c6"/><rect x="26" y="70" width="58" height="80" fill="#88accf"/><rect x="34" y="20" width="42" height="60" fill="#94b7d8"/>
    <path d="M40 22 L55 -30 L70 22Z" fill="#a3c3e0"/><rect x="54" y="-50" width="3" height="24" fill="#777"/>
    ${win(16, 240, 3, 120, 6, 1, 15, 0, '#cfe3f3')}${win(24, 150, 3, 85, 5, 1, 14, 0, '#d6e8f6')}${win(32, 78, 3, 66, 4, 1, 13, 0, '#ddeefa')}<circle cx="55" cy="40" r="3" fill="#ffd54a"/></g>
  <!-- cầu Ba Son -->
  <g transform="translate(1340,200)"><path d="M0 130 Q130 110 260 130" stroke="#8aa0b4" stroke-width="8" fill="none"/><path d="M95 130 L120 0 L145 130" fill="none" stroke="#e8edf2" stroke-width="10" stroke-linejoin="round"/>
    ${[0, 20, 40, 60, 80].map(d => `<path d="M120 ${6 + d / 4} L${20 + d} 124 M120 ${6 + d / 4} L${220 - d} 124" stroke="#cdd7e1" stroke-width="2"/>`).join('')}</g>
  <!-- cây -->
  ${[250, 470, 760, 820, 1160, 1320].map((x, i) => `<g transform="translate(${x},${318 + (i % 2) * 6})"><rect x="-3" y="10" width="6" height="26" fill="#7a5a3a"/><circle r="${18 + (i % 3) * 4}" fill="#5cbf6a"/><circle cx="-8" cy="6" r="12" fill="#4caf5e"/></g>`).join('')}
  <!-- sông Sài Gòn -->
  <rect x="0" y="352" width="1600" height="70" fill="#7cc6ec"/><path d="M0 362 Q 50 356 100 362 T 200 362 T 300 362 T 400 362 T 500 362 T 600 362 T 700 362 T 800 362 T 900 362 T 1000 362 T 1100 362 T 1200 362 T 1300 362 T 1400 362 T 1500 362 T 1600 362" stroke="#bfe6f8" stroke-width="3" fill="none"/>
  <g transform="translate(640,370)"><path d="M0 0 h70 l-10 14 h-52z" fill="#ffffff"/><rect x="20" y="-12" width="26" height="12" fill="#ffb020"/><rect x="30" y="-24" width="3" height="12" fill="#666"/></g>
  </svg>`;
}
