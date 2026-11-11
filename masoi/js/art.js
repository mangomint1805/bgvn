// Hình vẽ tay 100% bằng SVG: cảnh làng quê (đình, rặng tre, cây đa, nhà tranh), lá vai, mặt sau lá (hoa văn trống đồng).
import { ROLES } from './engine.js?v=4';

// ngẫu nhiên có hạt giống – để cảnh vẽ ra lần nào cũng giống nhau
function seeded(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }

// ---------------- CẢNH ----------------
const leaf = (x, y, r, s = 1) => `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(0)}) scale(${s.toFixed(2)})" d="M0 0Q16-5 42 0Q16 5 0 0Z"/>`;
export function bambooSVG(seed = 7, flip = false) {
  const R = seeded(seed); let stalks = '', nodes = '', leaves = '';
  for (let i = 0; i < 7; i++) {
    const x0 = 20 + i * 24 + R() * 10, lean = (flip ? -1 : 1) * (18 + R() * 50), top = 30 + R() * 120, w = 6 + R() * 5;
    const d = `M${x0} 620 Q${x0 + lean * 0.2} ${(620 + top) / 2} ${x0 + lean} ${top}`;
    stalks += `<path d="${d}" stroke-width="${w.toFixed(1)}"/>`;
    nodes += `<path d="${d}" stroke-width="${(w + 2.5).toFixed(1)}" stroke-dasharray="2.5 ${(38 + R() * 14).toFixed(0)}"/>`;
    // chùm lá ở ngọn và dọc thân
    for (let k = 0; k < 9; k++) {
      const t = R() * 0.55, bx = x0 + lean * (1 - t) + (R() - 0.5) * 30, by = top + (620 - top) * t * 0.9 + (R() - 0.5) * 20;
      for (let j = 0; j < 4; j++) leaves += leaf(bx, by, (flip ? 180 : 0) + (R() * 140 - 70) + (j % 2 ? 160 : 0), 0.7 + R() * 0.6);
    }
  }
  return `<svg class="bamboo-svg" viewBox="0 0 210 620" preserveAspectRatio="xMinYMax meet" aria-hidden="true"${flip ? ' style="transform:scaleX(-1)"' : ''}>
    <g class="b-stalk" fill="none" stroke-linecap="round">${stalks}</g><g class="b-node" fill="none">${nodes}</g><g class="b-leaf">${leaves}</g>
    <g class="eyes"><g class="eye-pair" style="--d:0s"><ellipse cx="70" cy="520" rx="5" ry="3"/><ellipse cx="88" cy="520" rx="5" ry="3"/></g><g class="eye-pair" style="--d:1.3s"><ellipse cx="140" cy="470" rx="4" ry="2.5"/><ellipse cx="154" cy="470" rx="4" ry="2.5"/></g></g>
  </svg>`;
}
export function dinhSVG() {
  // đình làng: nền đá, hàng cột, 2 tầng mái cong đầu đao, bờ nóc "lưỡng long chầu nguyệt", đèn lồng
  const cols = [70, 125, 180, 220, 275, 330].map(x => `<rect x="${x - 5}" y="132" width="10" height="56" rx="2"/>`).join('');
  const doors = [97, 152, 200, 248, 303].map(x => `<rect class="d-door" x="${x - 16}" y="140" width="32" height="48" rx="3"/>`).join('');
  return `<svg class="dinh-svg" viewBox="0 0 400 230" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <defs><radialGradient id="lampG"><stop offset="0" stop-color="#ffe9a8"/><stop offset=".45" stop-color="#ffb347" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a00" stop-opacity="0"/></radialGradient></defs>
    <ellipse class="d-glow" cx="200" cy="165" rx="190" ry="60" fill="url(#lampG)"/>
    <path class="d-base" d="M30 188h340l14 14H16z"/><rect class="d-base2" x="16" y="202" width="368" height="14" rx="2"/>
    <path class="d-step" d="M170 216h60l8 10h-76z"/>
    <g class="d-wall">${doors}</g>
    <g class="d-col">${cols}</g>
    <path class="d-roof" d="M8 142C40 136 64 112 86 104L314 104C336 112 360 136 392 142C372 141 356 140 340 136L60 136C44 140 28 141 8 142Z"/>
    <path class="d-roof" d="M8 142q-9-4-6-18q3 8 14 13zM392 142q9-4 6-18q-3 8-14 13z"/>
    <rect class="d-band" x="96" y="88" width="208" height="17" rx="2"/>
    <g class="d-win">${[130, 170, 210, 250].map(x => `<rect x="${x}" y="92" width="22" height="9" rx="1"/>`).join('')}</g>
    <path class="d-roof" d="M56 96C88 88 110 64 132 58L268 58C290 64 312 88 344 96C326 96 306 94 294 92L106 92C94 94 74 96 56 96Z"/>
    <path class="d-roof" d="M56 96q-8-5-4-17q3 8 13 12zM344 96q8-5 4-17q-3 8-13 12z"/>
    <path class="d-tile" d="M120 66H280M108 76H292M96 86H304M70 114H330M50 124H350" fill="none"/>
    <rect class="d-ridge" x="126" y="50" width="148" height="9" rx="3"/>
    <path class="d-ridge" d="M126 54q-14-2-16-16q8 8 18 7zM274 54q14-2 16-16q-8 8-18 7z"/>
    <path class="d-dragon" d="M150 50q6-14 18-10q-6 2-4 7q8-8 16-2q-6 0-6 5h-24zM250 50q-6-14-18-10q6 2 4 7q-8-8-16-2q6 0 6 5h24z"/>
    <circle class="d-pearl" cx="200" cy="41" r="8"/>
    <path class="d-pearl-fire" d="M200 29q-4 4-1 7q-5-1-6 4q-3-6 2-10q2-2 5-1z"/>
    <g class="lantern" style="--d:0s"><path d="M72 136v14" class="l-str"/><ellipse cx="72" cy="158" rx="8" ry="10" class="l-body"/><circle cx="72" cy="158" r="22" class="l-glow"/></g>
    <g class="lantern" style="--d:.7s"><path d="M328 136v14" class="l-str"/><ellipse cx="328" cy="158" rx="8" ry="10" class="l-body"/><circle cx="328" cy="158" r="22" class="l-glow"/></g>
  </svg>`;
}
export function hillsSVG() {
  // đồi xa, cây đa đầu làng, nhà tranh, ruộng
  const R = seeded(42); let roots = '';
  for (let i = 0; i < 14; i++) { const x = 150 + R() * 140; roots += `<path d="M${x.toFixed(0)} ${(230 + R() * 20).toFixed(0)}q${(R() * 6 - 3).toFixed(1)} 40 ${(R() * 8 - 4).toFixed(1)} ${(80 + R() * 40).toFixed(0)}"/>`; }
  const hut = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path class="h-roof" d="M-40 0L0-34L40 0Z"/><rect class="h-wall" x="-30" y="0" width="60" height="26"/><rect class="h-door" x="-6" y="8" width="12" height="18"/></g>`;
  return `<svg class="hills-svg" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <path class="hl-far" d="M0 250Q120 190 260 230T520 210T800 225T1060 195T1200 220V400H0Z"/>
    <g class="banyan"><path class="bn-trunk" d="M205 360q10-60 0-110q-4-20 10-30q14 10 10 30q-10 50 6 110z"/>
      <path class="bn-can" d="M90 250q-30-40 20-70q0-50 70-50q30-40 90-10q60-10 70 40q50 10 40 60q20 40-40 50q-30 30-90 10q-40 20-90 0q-60 10-70-30z"/>
      <g class="bn-root" fill="none">${roots}</g></g>
    <path class="hl-mid" d="M0 300Q200 255 420 290T820 280T1200 285V400H0Z"/>
    ${hut(1010, 290, 1.1)}${hut(1100, 300, 0.85)}${hut(420, 292, 0.8)}
    <path class="hl-near" d="M0 340Q300 318 600 334T1200 330V400H0Z"/>
    <path class="hl-field" d="M0 362H1200M0 378H1200M0 392H1200" fill="none"/>
  </svg>`;
}
// sao trên trời (div, phát sáng nhấp nháy)
export function starsHTML(n = 60) {
  const R = seeded(9); let h = '';
  for (let i = 0; i < n; i++) h += `<i style="left:${(R() * 100).toFixed(1)}%;top:${(R() * 60).toFixed(1)}%;--s:${(1 + R() * 2.2).toFixed(1)}px;--d:${(R() * 4).toFixed(1)}s"></i>`;
  return h;
}
export function firefliesHTML(n = 14) {
  const R = seeded(3); let h = '';
  for (let i = 0; i < n; i++) h += `<i style="left:${(R() * 100).toFixed(1)}%;bottom:${(4 + R() * 30).toFixed(1)}%;--d:${(R() * 6).toFixed(1)}s;--x:${(R() * 60 - 30).toFixed(0)}px;--y:${(-20 - R() * 50).toFixed(0)}px"></i>`;
  return h;
}

// ---------------- LÁ VAI ----------------
const skin = '#f2c48d', skinD = '#d99c5e', ink = '#2b2233';
const wolfFace = (fur = '#5b6378', dark = '#3a3f50', eye = '#ffd23f') => `
  <path d="M44 66L36 10L76 40Z" fill="${dark}"/><path d="M116 66L124 10L84 40Z" fill="${dark}"/>
  <path d="M47 58L43 24L66 42Z" fill="#c98f8f"/><path d="M113 58L117 24L94 42Z" fill="#c98f8f"/>
  <path d="M80 34L112 44L128 80L118 112L80 138L42 112L32 80L48 44Z" fill="${fur}"/>
  <path d="M32 80L20 92L38 98ZM128 80L140 92L122 98Z" fill="${fur}"/>
  <path d="M80 70L100 92L94 124L80 132L66 124L60 92Z" fill="#d9d4cf"/>
  <path d="M58 76L74 82L60 86Z" fill="${eye}"/><path d="M102 76L86 82L100 86Z" fill="${eye}"/>
  <circle cx="64" cy="82" r="2.2" fill="#b00"/><circle cx="96" cy="82" r="2.2" fill="#b00"/>
  <path d="M54 70L74 76M106 70L86 76" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="80" cy="120" rx="8" ry="5.5" fill="${ink}"/>
  <path d="M70 130q10 7 20 0" stroke="${ink}" stroke-width="2.5" fill="none"/><path d="M72 131l2 6 3-5M88 131l-2 6-3-5" fill="#fff"/>`;
const ART = {
  wolf: () => `<circle cx="80" cy="62" r="54" fill="#f5e6c8" opacity=".9"/><circle cx="62" cy="48" r="7" fill="#e6d2a8"/><circle cx="104" cy="74" r="10" fill="#e6d2a8"/>${wolfFace()}`,
  alpha: () => `<circle cx="80" cy="62" r="54" fill="#c0392b" opacity=".85"/>${wolfFace('#2f2a36', '#18151d', '#ff5a3c')}
    <path d="M54 30L60 8L70 22L80 4L90 22L100 8L106 30Z" fill="#ffd23f" stroke="#a87b00" stroke-width="2"/><circle cx="80" cy="16" r="3" fill="#e5383b"/>
    <path d="M100 92l10 18" stroke="#e5383b" stroke-width="3" stroke-linecap="round"/>`,
  cub: () => `<circle cx="80" cy="70" r="52" fill="#ffe2b8" opacity=".8"/>
    <path d="M42 66L40 26L70 48Z" fill="#a0603a"/><path d="M118 66L120 26L90 48Z" fill="#a0603a"/>
    <ellipse cx="80" cy="86" rx="46" ry="42" fill="#c97b45"/><ellipse cx="80" cy="104" rx="22" ry="18" fill="#f3dcc2"/>
    <circle cx="62" cy="80" r="11" fill="#fff"/><circle cx="98" cy="80" r="11" fill="#fff"/><circle cx="64" cy="82" r="7" fill="${ink}"/><circle cx="100" cy="82" r="7" fill="${ink}"/><circle cx="66" cy="79" r="2.5" fill="#fff"/><circle cx="102" cy="79" r="2.5" fill="#fff"/>
    <ellipse cx="80" cy="98" rx="6" ry="4" fill="${ink}"/><path d="M72 108q8 6 16 0" stroke="${ink}" stroke-width="2.5" fill="none"/><path d="M78 110q2 9 6 0" fill="#ff7b9c"/>
    <circle cx="50" cy="98" r="6" fill="#ff9aa2" opacity=".6"/><circle cx="110" cy="98" r="6" fill="#ff9aa2" opacity=".6"/>`,
  villager: () => `<circle cx="80" cy="66" r="52" fill="#fff4cf" opacity=".7"/>
    <path d="M36 150q4-38 44-38t44 38z" fill="#7a4a2b"/><path d="M68 112l12 20 12-20" fill="#5c3720"/>
    <circle cx="80" cy="86" r="26" fill="${skin}"/>
    <circle cx="71" cy="86" r="3" fill="${ink}"/><circle cx="89" cy="86" r="3" fill="${ink}"/><path d="M72 97q8 7 16 0" stroke="${ink}" stroke-width="2.5" fill="none"/>
    <circle cx="64" cy="94" r="4" fill="#f59a8b" opacity=".6"/><circle cx="96" cy="94" r="4" fill="#f59a8b" opacity=".6"/>
    <path d="M24 72L80 20L136 72Q80 82 24 72Z" fill="#e9d38f" stroke="#b8963c" stroke-width="2"/>
    <path d="M80 20L52 74M80 20L66 76M80 20L94 76M80 20L108 74" stroke="#c9a94f" stroke-width="1.4"/>
    <path d="M128 150V96" stroke="#7aa53a" stroke-width="3"/><g fill="#e3b341">${[0, 1, 2, 3, 4].map(i => `<ellipse cx="${i % 2 ? 133 : 123}" cy="${100 + i * 8}" rx="4" ry="2.3" transform="rotate(${i % 2 ? 30 : -30} ${i % 2 ? 133 : 123} ${100 + i * 8})"/>`).join('')}</g>`,
  seer: () => `<g fill="#ffe680">${[[22, 30], [138, 24], [130, 110], [26, 108], [80, 6]].map(([x, y]) => `<path d="M${x} ${y - 7}l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>`).join('')}</g>
    <path d="M52 140h56l-8-18H60z" fill="#6b3f1f"/><rect x="46" y="138" width="68" height="8" rx="3" fill="#8a5a2b"/>
    <circle cx="80" cy="80" r="44" fill="url(#gSeer)"/><ellipse cx="66" cy="60" rx="12" ry="7" fill="#fff" opacity=".5" transform="rotate(-30 66 60)"/>
    <path d="M56 84q24-22 48 0q-24 22-48 0z" fill="#fff"/><circle cx="80" cy="84" r="9" fill="#5b2ba0"/><circle cx="80" cy="84" r="4" fill="${ink}"/><circle cx="83" cy="81" r="2" fill="#fff"/>`,
  guard: () => `<path d="M30 140L130 20" stroke="#7a5a3a" stroke-width="6" stroke-linecap="round"/><path d="M130 20l6-18 -16 10z" fill="#c9ccd6"/>
    <path d="M80 26L124 40Q126 104 80 138Q34 104 36 40Z" fill="#2a6fb5" stroke="#ffd23f" stroke-width="5" stroke-linejoin="round"/>
    <path d="M80 40L112 50Q112 98 80 124Q48 98 48 50Z" fill="#3b86d4"/>
    <g transform="translate(80 82)" fill="#ffd23f">${[0, 72, 144, 216, 288].map(r => `<path transform="rotate(${r})" d="M0-22Q8-8 0 0Q-8-8 0-22Z"/>`).join('')}<circle r="5" fill="#fff6c4"/></g>`,
  witch: () => `<path d="M58 36q-6-14 4-22M80 30q6-14-2-24M102 36q8-12 0-22" stroke="#bfe9c9" stroke-width="3" fill="none" opacity=".7"/>
    <ellipse cx="80" cy="60" rx="46" ry="12" fill="#3ddc84"/><circle cx="66" cy="56" r="5" fill="#9cf5c0"/><circle cx="92" cy="52" r="3.5" fill="#9cf5c0"/>
    <path d="M34 60Q30 120 60 130H100Q130 120 126 60Z" fill="#22252e"/><path d="M34 60h92" stroke="#3a3f4f" stroke-width="6"/>
    <path d="M50 130l-6 12M110 130l6 12" stroke="#22252e" stroke-width="6" stroke-linecap="round"/>
    <g transform="translate(12 92)"><rect x="6" y="0" width="10" height="8" fill="#b08a5a"/><path d="M4 8h14l4 10v20H0V18z" fill="#2fbf71"/><path d="M11 22c-3-4-8 0-5 4l5 5 5-5c3-4-2-8-5-4z" fill="#fff"/></g>
    <g transform="translate(126 92)"><rect x="6" y="0" width="10" height="8" fill="#b08a5a"/><path d="M4 8h14l4 10v20H0V18z" fill="#8e5cf7"/><circle cx="11" cy="24" r="6" fill="#fff"/><circle cx="9" cy="23" r="1.6" fill="${ink}"/><circle cx="13" cy="23" r="1.6" fill="${ink}"/><rect x="8" y="28" width="6" height="3" fill="#fff"/></g>`,
  hunter: () => `<circle cx="80" cy="74" r="50" fill="#f3e2c4" opacity=".55"/>
    <path d="M26 112L134 46" stroke="#8a5a2b" stroke-width="12" stroke-linecap="round"/><path d="M30 110L130 48" stroke="#a8743f" stroke-width="5" stroke-linecap="round"/>
    <path d="M62 34Q30 76 98 128" stroke="#5c3720" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M62 34L84 82L98 128" stroke="#e8e0cf" stroke-width="2" fill="none"/>
    <path d="M84 82L150 42" stroke="#3a2a1a" stroke-width="3"/><path d="M150 42l-14 2 6 8z" fill="#c9ccd6"/><path d="M90 78l-10-2 4 8zM96 75l-10-2 4 8z" fill="#e5383b"/>
    <circle cx="44" cy="102" r="4" fill="#ffd23f"/><path d="M14 144h40" stroke="#5c3720" stroke-width="4" stroke-linecap="round"/>`,
  cupid: () => `<g fill="#ff9ec4" opacity=".8"><path d="M30 40c-6-8-18-2-12 8l12 12 12-12c6-10-6-16-12-8z"/><path d="M130 110c-4-6-13-1-9 6l9 9 9-9c4-7-5-12-9-6z"/></g>
    <path d="M60 22Q130 80 60 138" stroke="#c0392b" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M60 22L60 138" stroke="#fde" stroke-width="2"/>
    <path d="M22 80H128" stroke="#7a4a2b" stroke-width="4"/><path d="M140 80c0-12-16-14-16 0 0 8 16 16 16 16s16-8 16-16c0-14-16-12-16 0z" transform="translate(-14 -8) scale(.95)" fill="#e5383b"/>
    <path d="M22 80l-10-8M22 80l-10 8M30 80l-10-8M30 80l-10 8" stroke="#fff" stroke-width="3"/>
    <path d="M96 40q20-20 40-6q-14 2-18 12q12-4 20 4q-16 2-22 10z" fill="#fff" opacity=".9"/>`,
  elder: () => `<circle cx="80" cy="66" r="52" fill="#fff4cf" opacity=".6"/>
    <path d="M130 150V58q0-10 10-10" stroke="#7a4a2b" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M36 150q4-38 44-38t44 38z" fill="#3a3f63"/>
    <circle cx="80" cy="80" r="26" fill="${skin}"/>
    <path d="M56 86q24 70 48 0q-8 10-24 10t-24-10z" fill="#f4f1ea"/>
    <path d="M64 74h10M86 74h10" stroke="#f4f1ea" stroke-width="4" stroke-linecap="round"/><path d="M66 80q4 3 8 0M86 80q4 3 8 0" stroke="${ink}" stroke-width="2" fill="none"/>
    <path d="M52 66q0-20 28-22q28 2 28 22q-28-8-56 0z" fill="#1f2333"/><path d="M54 62q26-6 52 0M56 56q24-6 48 0" stroke="#3a3f63" stroke-width="2" fill="none"/>`,
  idiot: () => `<circle cx="80" cy="74" r="52" fill="#ffe7a8" opacity=".7"/>
    <circle cx="80" cy="82" r="38" fill="${skin}"/>
    <path d="M50 52q6-20 14-6q4-18 14-4q8-16 16 2q10-14 12 8" fill="#5c3720"/>
    <g fill="none" stroke="${ink}" stroke-width="2.4"><path d="M58 78a6 6 0 1 1 6 6a3 3 0 1 1 -3-3"/><path d="M90 78a6 6 0 1 0 6 6a3 3 0 1 0 -3-3"/></g>
    <path d="M58 96q22 26 44 0z" fill="${ink}"/><path d="M76 106q6 12 12 0" fill="#ff7b9c"/><rect x="66" y="96" width="28" height="5" fill="#fff"/>
    <g fill="#ffd23f">${[[30, 40], [128, 46], [136, 96]].map(([x, y]) => `<path d="M${x} ${y - 8}l2.5 5.5 6 1-4.5 4 1 6-5-3-5 3 1-6-4.5-4 6-1z"/>`).join('')}</g>`,
  medium: () => `<circle cx="80" cy="74" r="54" fill="#2a1638" opacity=".55"/>
    <g fill="#e9d8ff" opacity=".55"><path d="M30 40q8-14 18-4q-6 0-6 6q-6-6-12-2z"/><path d="M118 30q10-12 18-2q-6 0-6 6q-6-6-12-4z"/></g>
    <path d="M98 34q-14 10-6 24q6 10-6 20" stroke="#cfc3ff" stroke-width="5" fill="none" opacity=".6" stroke-linecap="round"/>
    <path d="M108 26q16 4 8 18" stroke="#cfc3ff" stroke-width="3" fill="none" opacity=".5"/>
    <circle cx="104" cy="22" r="8" fill="#f4f1ff" opacity=".85"/><circle cx="101" cy="21" r="1.6" fill="${ink}"/><circle cx="107" cy="21" r="1.6" fill="${ink}"/><ellipse cx="104" cy="26" rx="2" ry="1.4" fill="${ink}"/>
    <path d="M30 150q6-44 50-44t50 44z" fill="#5b2a6e"/><path d="M50 150q4-26 30-30q26 4 30 30" fill="#7b3f93"/>
    <circle cx="80" cy="86" r="24" fill="${skin}"/>
    <path d="M52 84q0-34 28-36q28 2 28 36q-4-18-28-20q-24 2-28 20z" fill="#7b3f93"/><path d="M56 70h48" stroke="#ffd23f" stroke-width="3" stroke-dasharray="3 4"/>
    <path d="M70 86q4-3 8 0M82 86q4-3 8 0" stroke="${ink}" stroke-width="2.4" fill="none"/>
    <path d="M73 98q7 4 14 0" stroke="${ink}" stroke-width="2" fill="none"/><circle cx="80" cy="76" r="2.5" fill="#e5383b"/>
    <g transform="translate(36 110)"><rect x="-6" y="0" width="12" height="28" rx="2" fill="#f4ecd8"/><path d="M0-12q6 6 0 12q-6-6 0-12z" fill="#ffb347"/><path d="M0-7q3 3 0 6q-3-3 0-6z" fill="#fff1a8"/><circle r="16" cy="-6" fill="#ffd23f" opacity=".25"/></g>
    <g transform="translate(124 110)"><rect x="-6" y="0" width="12" height="28" rx="2" fill="#f4ecd8"/><path d="M0-12q6 6 0 12q-6-6 0-12z" fill="#ffb347"/><path d="M0-7q3 3 0 6q-3-3 0-6z" fill="#fff1a8"/><circle r="16" cy="-6" fill="#ffd23f" opacity=".25"/></g>`,
  thief: () => `<circle cx="80" cy="70" r="54" fill="#1d2433" opacity=".6"/>
    <g transform="rotate(-14 46 112)"><rect x="24" y="84" width="40" height="56" rx="5" fill="#f5e6c8" stroke="#c9a94f" stroke-width="2"/><text x="44" y="120" text-anchor="middle" font-size="24" font-weight="800" fill="#c0392b">?</text></g>
    <g transform="rotate(12 116 112)"><rect x="96" y="84" width="40" height="56" rx="5" fill="#f5e6c8" stroke="#c9a94f" stroke-width="2"/><text x="116" y="120" text-anchor="middle" font-size="24" font-weight="800" fill="#2a6fb5">?</text></g>
    <path d="M40 150q4-40 40-40t40 40z" fill="#2d3748"/>
    <circle cx="80" cy="76" r="26" fill="${skin}"/>
    <path d="M52 70q28-14 56 0l-2 12q-26-8-52 0z" fill="#1a202c"/>
    <ellipse cx="69" cy="76" rx="6" ry="4" fill="#fff"/><ellipse cx="91" cy="76" rx="6" ry="4" fill="#fff"/><circle cx="71" cy="76" r="2.4" fill="${ink}"/><circle cx="93" cy="76" r="2.4" fill="${ink}"/>
    <path d="M70 92q10 6 20-2" stroke="${ink}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M54 60q26-30 52 0q-26-6-52 0z" fill="#4a5568"/><rect x="52" y="56" width="56" height="7" rx="3" fill="#2d3748"/>
    <path d="M118 52l18-10M122 58l20-2" stroke="#ffd23f" stroke-width="3" stroke-linecap="round" opacity=".8"/>`,
  lunatic: () => `<circle cx="80" cy="72" r="54" fill="#f6e7c8" opacity=".6"/>
    <g fill="#9c7a54" font-weight="800" font-size="20"><text x="22" y="44">?</text><text x="128" y="36">?</text><text x="134" y="96" font-size="15">?</text></g>
    <path d="M38 150q4-38 42-38t42 38z" fill="#8a6b4a"/>
    <circle cx="80" cy="84" r="27" fill="${skin}"/>
    <path d="M54 76q-8-18 4-24M106 76q8-18-4-24" stroke="#eee" stroke-width="7" fill="none" stroke-linecap="round"/>
    <circle cx="69" cy="84" r="9" fill="#fff" stroke="${ink}" stroke-width="2.5"/><circle cx="92" cy="84" r="9" fill="#fff" stroke="${ink}" stroke-width="2.5"/><path d="M78 84h5" stroke="${ink}" stroke-width="2.5"/>
    <circle cx="72" cy="86" r="3" fill="${ink}"/><circle cx="89" cy="81" r="3" fill="${ink}"/>
    <path d="M60 102q20-6 40 4q-20 14-40-4z" fill="#f4f1ea"/><path d="M72 100q8 3 14 0" stroke="${ink}" stroke-width="2" fill="none"/>
    <g transform="translate(122 128) rotate(18)"><path d="M-14 12h28l-4-8h-20z" fill="#6b3f1f"/><circle cy="-6" r="14" fill="url(#gSeer)"/><path d="M-6-10l5 4M2-14l3 6" stroke="#fff" stroke-width="1.6" opacity=".8"/><path d="M-8-2l16-8" stroke="#2b2233" stroke-width="1.4"/></g>`,
  tanner: () => `<path d="M44 34q0-18 20-16q8-14 26-6q20-4 22 14q14 4 8 16H44q-10-2 0-8z" fill="#8b93a7"/>
    <path d="M56 58l-4 10M76 58l-4 10M96 58l-4 10M116 58l-4 10" stroke="#7fb1e8" stroke-width="3" stroke-linecap="round"/>
    <circle cx="80" cy="102" r="30" fill="#d9c7b0"/>
    <path d="M66 96q5-4 10 0M84 96q5-4 10 0" stroke="${ink}" stroke-width="2.5" fill="none"/><path d="M66 100h10M84 100h10" stroke="${ink}" stroke-width="1.5" opacity=".5"/>
    <path d="M70 118q10-8 20 0" stroke="${ink}" stroke-width="2.5" fill="none"/><path d="M95 106q2 6 0 8q-3-3 0-8z" fill="#7fb1e8"/>
    <path d="M130 150q-4-30 6-40" stroke="#5c7a3a" stroke-width="3" fill="none"/><path d="M136 110q-10-4-12 6q-2 8 6 6q-6 6 4 8q8-2 4-10q10 0 6-8q-6-6-8-2z" fill="#8a2f3f"/>`,
};
const TEAM_LABEL = { wolf: 'PHE SÓI', village: 'PHE DÂN LÀNG', tanner: 'PHE RIÊNG' };
// khung lá vai: viền theo phe + màu riêng từng vai, góc hoa văn mây, ruy băng tên
export function roleCardSVG(role, cls = '') {
  const R = ROLES[role]; if (!R) return cardBackSVG(cls);
  const c = R.color, team = R.team, id = 'g' + role + Math.random().toString(36).slice(2, 6);
  const wolfish = team === 'wolf';
  const frame = wolfish ? '#2a0f14' : team === 'tanner' ? '#2b2d33' : '#1b2238';
  const gold = wolfish ? '#ff8a6b' : team === 'tanner' ? '#c3c8d4' : '#f2c84b';
  const corner = (x, y, r) => `<path transform="translate(${x} ${y}) rotate(${r})" d="M0 0q16 0 20 12q-8-6-14-2q6 2 4 8q-6-6-10-4zM0 0q0 16 12 20q-6-8-2-14q2 6 8 4q-6-6-4-10z" fill="${gold}"/>`;
  const claws = wolfish ? `<g stroke="#ff4d4d" stroke-width="3.5" stroke-linecap="round" opacity=".8"><path d="M150 26l22 34M160 22l22 34M170 20l16 26"/></g>` : '';
  const rice = team === 'village' ? `<g fill="${gold}" opacity=".55">${Array.from({ length: 9 }, (_, i) => `<ellipse cx="${30 + i * 17.5}" cy="208" rx="3.4" ry="1.8"/>`).join('')}</g>` : '';
  return `<svg class="rcard ${cls}" viewBox="0 0 200 280" role="img" aria-label="${R.name}">
    <defs><radialGradient id="${id}" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="${c}" stop-opacity=".95"/><stop offset=".65" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${frame}"/></radialGradient>
      <radialGradient id="gSeer" cx=".4" cy=".35"><stop offset="0" stop-color="#e9d8ff"/><stop offset=".6" stop-color="#9b6ee0"/><stop offset="1" stop-color="#4b2590"/></radialGradient></defs>
    <rect x="2" y="2" width="196" height="276" rx="16" fill="${frame}"/>
    <rect x="9" y="9" width="182" height="262" rx="11" fill="url(#${id})" stroke="${gold}" stroke-width="2"/>
    <rect x="14" y="14" width="172" height="252" rx="8" fill="none" stroke="${gold}" stroke-width="1" stroke-dasharray="${wolfish ? '2 5' : '6 3'}" opacity=".7"/>
    ${corner(16, 16, 0)}${corner(184, 16, 90)}${corner(184, 264, 180)}${corner(16, 264, 270)}
    <text x="100" y="32" text-anchor="middle" class="rc-top" fill="${gold}">MA SÓI</text>
    ${claws}
    <g transform="translate(20 40)">${ART[role]()}</g>
    ${rice}
    <path d="M14 218h172l-10 14 10 14H14l10-14z" fill="${frame}" stroke="${gold}" stroke-width="1.5"/>
    <text x="100" y="239" text-anchor="middle" class="rc-name" fill="#fff"${R.name.length > 13 ? ' style="font-size:17px"' : ''}>${R.name}</text>
    <text x="100" y="262" text-anchor="middle" class="rc-team" fill="${gold}">${R.emoji} ${TEAM_LABEL[team]}</text>
  </svg>`;
}
// mặt sau: hoa văn trống đồng Đông Sơn – mặt trời nhiều tia, vòng tròn đồng tâm, chim Lạc bay quanh
export function cardBackSVG(cls = '') {
  const rays = Array.from({ length: 14 }, (_, i) => `<path transform="rotate(${i * 360 / 14})" d="M0-8L4-30L0-26L-4-30Z"/>`).join('');
  const birds = Array.from({ length: 6 }, (_, i) => `<g transform="rotate(${i * 60}) translate(0 -62)"><path d="M-12 0q6-6 14-2l8-6-4 8q4 0 6 4h-10q-8 2-14-4z"/></g>`).join('');
  const dots = Array.from({ length: 36 }, (_, i) => `<circle transform="rotate(${i * 10}) translate(0 -44)" r="1.6"/>`).join('');
  return `<svg class="rcard back ${cls}" viewBox="0 0 200 280" role="img" aria-label="Lá vai úp">
    <rect x="2" y="2" width="196" height="276" rx="16" fill="#141a33"/>
    <rect x="9" y="9" width="182" height="262" rx="11" fill="#1f2a52" stroke="#c9a94f" stroke-width="2"/>
    <g transform="translate(100 128)" fill="#c9a94f" stroke="#c9a94f">
      <circle r="84" fill="none" stroke-width="1.2" opacity=".5"/><circle r="74" fill="none" stroke-width="2"/><circle r="50" fill="none" stroke-width="1.5"/><circle r="38" fill="none" stroke-width="1"/>
      <g stroke="none" opacity=".9">${birds}</g><g stroke="none">${dots}</g>
      <g stroke="none">${rays}<circle r="9"/></g>
    </g>
    <circle cx="100" cy="128" r="18" fill="#f5e6c8" opacity=".95"/>
    <path d="M90 136l3-10 4 4 3-8 3 8 4-4 3 10z" fill="#141a33"/>
    <text x="100" y="250" text-anchor="middle" class="rc-name" fill="#c9a94f">VAI BÍ MẬT</text>
  </svg>`;
}
export const roleChip = r => ROLES[r] ? `<span class="rchip" style="--c:${ROLES[r].color}">${ROLES[r].emoji} ${ROLES[r].name}</span>` : '';
// biểu tượng vai nhỏ (tròn) cho ghế ngồi
export const roleDot = r => ROLES[r] ? `<span class="rdot" style="--c:${ROLES[r].color}" title="${ROLES[r].name}">${ROLES[r].emoji}</span>` : '';

// sói tru dưới trăng – hình minh hoạ trang chủ
export function heroSVG() {
  return `<svg viewBox="0 0 320 200" class="hero-svg" aria-hidden="true">
    <defs><radialGradient id="hm" cx=".45" cy=".4"><stop offset="0" stop-color="#fffbe8"/><stop offset=".7" stop-color="#f7e3a3"/><stop offset="1" stop-color="#e9c66b"/></radialGradient>
      <radialGradient id="hg"><stop offset=".55" stop-color="#ffe9a8" stop-opacity=".45"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient></defs>
    <circle cx="200" cy="78" r="92" fill="url(#hg)"/><circle cx="200" cy="78" r="58" fill="url(#hm)"/>
    <circle cx="182" cy="62" r="9" fill="#e9cf88" opacity=".7"/><circle cx="216" cy="94" r="12" fill="#e9cf88" opacity=".6"/><circle cx="222" cy="58" r="5" fill="#e9cf88" opacity=".7"/>
    <path d="M0 200V170Q60 150 120 160T240 150T320 158V200Z" fill="#141a33"/>
    <path class="hero-wolf" d="M120 168l4-26-8-16 6-2-2-12 10 8 4-10 4 12 10-8 20-32 6 2-6 22 8-4-4 12 6 6-14 6 4 16 8 28z" fill="#0b0f22"/>
    <g fill="#0b0f22">${[14, 30, 46, 270, 286, 302].map((x, i) => `<path d="M${x} 200Q${x + (i < 3 ? 6 : -6)} 120 ${x + (i < 3 ? 14 : -14)} ${50 + (i % 3) * 18}" stroke="#0b0f22" stroke-width="${4 - (i % 3)}" fill="none"/>`).join('')}</g>
    <g fill="#0b0f22">${[[30, 60], [44, 80], [20, 90], [290, 70], [276, 88], [300, 96]].map(([x, y], i) => `<path transform="translate(${x} ${y}) rotate(${i * 40 - 60})" d="M0 0q10-4 26 0q-10 4-26 0z"/>`).join('')}</g>
  </svg>`;
}
