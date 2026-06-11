/* start-page plugin: Colour (trigger "#")
   A keyless colour studio — formats (HEX/RGB/HSL/OKLCH), WCAG contrast,
   harmonies, tints/shades, gradients and colour-blindness simulation.
   Pure client-side colour maths, no network. Part of start-page (MIT). */

const CSS = `
.colp { height: 100%; overflow-y: auto; color: var(--fg, #f4f6fb); font-size: 0.92rem; }
.colp-inner { padding: 0.55rem 0.8rem 0.8rem; display: flex; flex-direction: column; gap: 0.65rem; }
.col-pickbox { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.6rem 0.8rem 0.15rem; }
.col-pickbox[hidden] { display: none; }
.col-sv { position: relative; height: 116px; border-radius: 9px; cursor: crosshair; touch-action: none; background-color: var(--hue, #f00); background-image: linear-gradient(to right, #fff, rgba(255,255,255,0)), linear-gradient(to top, #000, rgba(0,0,0,0)); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); }
.col-svh { position: absolute; width: 14px; height: 14px; border: 2px solid #fff; border-radius: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 0 1px rgba(0,0,0,0.45); pointer-events: none; }
.col-hue { position: relative; height: 14px; border-radius: 7px; cursor: ew-resize; touch-action: none; background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); }
.col-hueh { position: absolute; top: 50%; width: 8px; height: 18px; border: 2px solid #fff; border-radius: 4px; transform: translate(-50%, -50%); box-shadow: 0 0 0 1px rgba(0,0,0,0.45); pointer-events: none; }
.col-ph { padding: 0.7rem 0.3rem; color: rgba(244,246,251,0.42); font-size: 0.85rem; line-height: 1.7; }
.col-ph code { background: rgba(255,255,255,0.08); border-radius: 5px; padding: 0.05rem 0.35rem; }
.col-hero { border-radius: 12px; padding: 0.78rem 0.9rem; display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1); }
.col-heroL { display: flex; flex-direction: column; gap: 0.08rem; min-width: 0; }
.col-hex { font-size: 1.42rem; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; font-variant-numeric: tabular-nums; }
.col-name { font-size: 0.78rem; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.col-heroBtns { display: flex; gap: 0.35rem; flex: none; }
.col-hbtn { font: inherit; font-size: 0.74rem; line-height: 1; padding: 0.36rem 0.62rem; border: none; border-radius: 8px; cursor: pointer; }
.col-hbtn:disabled { opacity: 0.35; cursor: default; }
.col-hint { text-transform: none; letter-spacing: 0; opacity: 0.7; }
.col-formats { display: flex; flex-direction: row; flex-wrap: wrap; gap: 0.4rem; }
.col-formats button { flex: 1 1 28%; min-width: 0; display: flex; flex-direction: column; gap: 0.06rem; align-items: flex-start; background: rgba(255,255,255,0.05); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 9px; padding: 0.3rem 0.55rem; color: var(--fg); font: inherit; cursor: pointer; text-align: left; }
.col-formats button:hover { background: rgba(255,255,255,0.12); }
.col-formats .k { font-size: 0.6rem; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted, rgba(244,246,251,0.6)); }
.col-formats .v { font-variant-numeric: tabular-nums; font-size: 0.83rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.col-copyline { display: flex; align-items: baseline; justify-content: space-between; gap: 0.6rem; width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 9px; padding: 0.32rem 0.6rem; color: var(--fg); font: inherit; cursor: pointer; text-align: left; }
.col-copyline:hover { background: rgba(255,255,255,0.12); }
.col-copyline .k { font-size: 0.6rem; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted, rgba(244,246,251,0.6)); flex: none; }
.col-copyline .v { font-variant-numeric: tabular-nums; font-size: 0.82rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-sec { display: flex; flex-direction: column; gap: 0.32rem; }
.col-h { font-size: 0.62rem; letter-spacing: 0.11em; text-transform: uppercase; color: var(--muted, rgba(244,246,251,0.6)); }
.col-row { display: flex; align-items: center; gap: 0.5rem; }
.col-row .lab { font-size: 0.72rem; color: var(--muted, rgba(244,246,251,0.6)); width: 5.7rem; flex: none; white-space: nowrap; padding-right: 0.3rem; box-sizing: border-box; }
.col-sws { display: flex; gap: 0.3rem; flex: 1; }
.sw { flex: 1; height: 30px; border-radius: 7px; border: none; cursor: pointer; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); padding: 0; transition: outline-color 0.12s; outline: 2px solid transparent; outline-offset: -2px; }
.sw:hover { outline-color: rgba(255,255,255,0.65); }
.col-ramp { display: flex; border-radius: 8px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1); }
.col-ramp .sw { border-radius: 0; box-shadow: none; height: 34px; }
.col-contrast { display: flex; gap: 0.4rem; }
.col-ct { flex: 1; border-radius: 9px; padding: 0.45rem 0.6rem; display: flex; align-items: center; justify-content: space-between; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1); }
.col-ct b { font-size: 1.02rem; font-weight: 600; }
.col-ct span { font-size: 0.68rem; font-variant-numeric: tabular-nums; }
.col-best { font-size: 0.74rem; color: var(--muted, rgba(244,246,251,0.6)); }
.col-gbar { height: 38px; border-radius: 9px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1); }
.col-cvd { display: flex; gap: 0.4rem; }
.col-cvd > div { flex: 1; display: flex; flex-direction: column; gap: 0.22rem; align-items: stretch; text-align: center; }
.col-cvd .sw { flex: none; width: 100%; height: 32px; }
.col-cvd .lab { font-size: 0.62rem; color: var(--muted, rgba(244,246,251,0.6)); }
.col-toast { position: absolute; left: 50%; bottom: 11px; transform: translateX(-50%) translateY(8px); background: rgba(12,16,24,0.94); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); color: var(--fg, #f4f6fb); font-size: 0.77rem; padding: 0.3rem 0.75rem; border-radius: 999px; opacity: 0; transition: opacity 0.18s ease, transform 0.18s ease; pointer-events: none; white-space: nowrap; }
.col-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
`;

const PH_HTML = `<div class="col-ph">Type a colour — <code>#5b9bff</code>, <code>rgb(91 155 255)</code>, <code>cornflowerblue</code>, <code>oklch(.68 .16 256)</code>. The <code>#</code> is optional.<br>Two colours — <code>#5b9bff #ff5b9b</code> — draw a gradient.</div>`;

/* ============================ named colours (CSS) ============================ */
const NAMES = {
  aliceblue:"f0f8ff", antiquewhite:"faebd7", aqua:"00ffff", aquamarine:"7fffd4", azure:"f0ffff",
  beige:"f5f5dc", bisque:"ffe4c4", black:"000000", blanchedalmond:"ffebcd", blue:"0000ff",
  blueviolet:"8a2be2", brown:"a52a2a", burlywood:"deb887", cadetblue:"5f9ea0", chartreuse:"7fff00",
  chocolate:"d2691e", coral:"ff7f50", cornflowerblue:"6495ed", cornsilk:"fff8dc", crimson:"dc143c",
  cyan:"00ffff", darkblue:"00008b", darkcyan:"008b8b", darkgoldenrod:"b8860b", darkgray:"a9a9a9",
  darkgreen:"006400", darkkhaki:"bdb76b", darkmagenta:"8b008b", darkolivegreen:"556b2f", darkorange:"ff8c00",
  darkorchid:"9932cc", darkred:"8b0000", darksalmon:"e9967a", darkseagreen:"8fbc8f", darkslateblue:"483d8b",
  darkslategray:"2f4f4f", darkturquoise:"00ced1", darkviolet:"9400d3", deeppink:"ff1493", deepskyblue:"00bfff",
  dimgray:"696969", dodgerblue:"1e90ff", firebrick:"b22222", floralwhite:"fffaf0", forestgreen:"228b22",
  fuchsia:"ff00ff", gainsboro:"dcdcdc", ghostwhite:"f8f8ff", gold:"ffd700", goldenrod:"daa520",
  gray:"808080", green:"008000", greenyellow:"adff2f", grey:"808080", honeydew:"f0fff0",
  hotpink:"ff69b4", indianred:"cd5c5c", indigo:"4b0082", ivory:"fffff0", khaki:"f0e68c",
  lavender:"e6e6fa", lavenderblush:"fff0f5", lawngreen:"7cfc00", lemonchiffon:"fffacd", lightblue:"add8e6",
  lightcoral:"f08080", lightcyan:"e0ffff", lightgoldenrodyellow:"fafad2", lightgray:"d3d3d3", lightgreen:"90ee90",
  lightpink:"ffb6c1", lightsalmon:"ffa07a", lightseagreen:"20b2aa", lightskyblue:"87cefa", lightslategray:"778899",
  lightsteelblue:"b0c4de", lightyellow:"ffffe0", lime:"00ff00", limegreen:"32cd32", linen:"faf0e6",
  magenta:"ff00ff", maroon:"800000", mediumaquamarine:"66cdaa", mediumblue:"0000cd", mediumorchid:"ba55d3",
  mediumpurple:"9370db", mediumseagreen:"3cb371", mediumslateblue:"7b68ee", mediumspringgreen:"00fa9a", mediumturquoise:"48d1cc",
  mediumvioletred:"c71585", midnightblue:"191970", mintcream:"f5fffa", mistyrose:"ffe4e1", moccasin:"ffe4b5",
  navajowhite:"ffdead", navy:"000080", oldlace:"fdf5e6", olive:"808000", olivedrab:"6b8e23",
  orange:"ffa500", orangered:"ff4500", orchid:"da70d6", palegoldenrod:"eee8aa", palegreen:"98fb98",
  paleturquoise:"afeeee", palevioletred:"db7093", papayawhip:"ffefd5", peachpuff:"ffdab9", peru:"cd853f",
  pink:"ffc0cb", plum:"dda0dd", powderblue:"b0e0e6", purple:"800080", rebeccapurple:"663399",
  red:"ff0000", rosybrown:"bc8f8f", royalblue:"4169e1", saddlebrown:"8b4513", salmon:"fa8072",
  sandybrown:"f4a460", seagreen:"2e8b57", seashell:"fff5ee", sienna:"a0522d", silver:"c0c0c0",
  skyblue:"87ceeb", slateblue:"6a5acd", slategray:"708090", snow:"fffafa", springgreen:"00ff7f",
  steelblue:"4682b4", tan:"d2b48c", teal:"008080", thistle:"d8bfd8", tomato:"ff6347",
  turquoise:"40e0d0", violet:"ee82ee", wheat:"f5deb3", white:"ffffff", whitesmoke:"f5f5f5",
  yellow:"ffff00", yellowgreen:"9acd32",
};

/* ============================ conversions ============================ */
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const clampByte = (x) => Math.max(0, Math.min(255, Math.round(x)));
const hx = (n) => clampByte(n).toString(16).padStart(2, "0");
const toHex = ({ r, g, b }) => "#" + hx(r) + hx(g) + hx(b);
function hexToRgb(h) { h = h.replace(/^#/, ""); return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }; }

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (d) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}
function hslToRgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const hue = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return { r: Math.round(hue(h + 1 / 3) * 255), g: Math.round(hue(h) * 255), b: Math.round(hue(h - 1 / 3) * 255) };
}

function rgbToHsv({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0; const s = mx === 0 ? 0 : d / mx, v = mx;
  if (d) { h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return { h, s, v };
}
function hsvToRgb(h, s, v) {
  h = (((h % 360) + 360) % 360) / 60;
  const c = v * s, x = c * (1 - Math.abs(h % 2 - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 1) { r = c; g = x; } else if (h < 2) { r = x; g = c; } else if (h < 3) { g = c; b = x; }
  else if (h < 4) { g = x; b = c; } else if (h < 5) { r = x; b = c; } else { r = c; b = x; }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}
const srgbToLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const linToByte = (c) => clampByte((c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
function rgbToOklab({ r, g, b }) {
  const lr = srgbToLin(r), lg = srgbToLin(g), lb = srgbToLin(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
}
function oklabToRgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return {
    r: linToByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linToByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linToByte(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  };
}
function rgbToOklch(rgb) {
  const { L, a, b } = rgbToOklab(rgb);
  let h = Math.atan2(b, a) * 180 / Math.PI; if (h < 0) h += 360;
  return { L, C: Math.sqrt(a * a + b * b), h };
}
const oklchToRgb = (L, C, h) => oklabToRgb(L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180));

function relLum({ r, g, b }) { return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b); }
function contrast(a, b) { const la = relLum(a), lb = relLum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }

// sRGB colour-blindness simulation matrices (severity ~1.0)
const CVD = {
  Protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
  Deuteranopia: [0.625, 0.375, 0, 0.70, 0.30, 0, 0, 0.30, 0.70],
  Tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
};
const simCvd = ({ r, g, b }, m) => ({ r: clampByte(m[0] * r + m[1] * g + m[2] * b), g: clampByte(m[3] * r + m[4] * g + m[5] * b), b: clampByte(m[6] * r + m[7] * g + m[8] * b) });

/* ============================ parsing ============================ */
function parsePartsRgb(s) {
  const p = s.replace(/^rgba?\(|\)$/g, "").split(/[\s,/]+/).filter(Boolean);
  if (p.length < 3) return null;
  const v = p.slice(0, 3).map((x) => (x.endsWith("%") ? parseFloat(x) * 2.55 : parseFloat(x)));
  if (v.some(isNaN)) return null;
  return { r: clampByte(v[0]), g: clampByte(v[1]), b: clampByte(v[2]) };
}
function parsePartsHsl(s) {
  const p = s.replace(/^hsla?\(|\)$/g, "").split(/[\s,/]+/).filter(Boolean);
  if (p.length < 3) return null;
  const h = parseFloat(p[0]), sa = parseFloat(p[1]) / 100, l = parseFloat(p[2]) / 100;
  if ([h, sa, l].some(isNaN)) return null;
  return hslToRgb(h, clamp01(sa), clamp01(l));
}
function parsePartsOklch(s) {
  const p = s.replace(/^oklch\(|\)$/g, "").split(/[\s,/]+/).filter(Boolean);
  if (p.length < 3) return null;
  const L = p[0].endsWith("%") ? parseFloat(p[0]) / 100 : parseFloat(p[0]);
  const C = parseFloat(p[1]), h = parseFloat(p[2]);
  if ([L, C, h].some(isNaN)) return null;
  return oklchToRgb(L, C, h);
}
function parseColor(str) {
  const s = str.trim().toLowerCase();
  if (!s) return null;
  if (NAMES[s]) return hexToRgb(NAMES[s]);
  if (/^rgba?\(/.test(s)) return parsePartsRgb(s);
  if (/^hsla?\(/.test(s)) return parsePartsHsl(s);
  if (/^oklch\(/.test(s)) return parsePartsOklch(s);
  const h = s.replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(h)) return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16) };
  if (/^[0-9a-f]{4}$/.test(h)) return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16) };
  if (/^[0-9a-f]{6}$/.test(h)) return hexToRgb(h);
  if (/^[0-9a-f]{8}$/.test(h)) return hexToRgb(h);
  if (/^\d+%?(?:[\s,]+\d+%?){2}$/.test(s)) return parsePartsRgb(s);
  return null;
}
const SCAN = /rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|#?[0-9a-f]{8}\b|#?[0-9a-f]{6}\b|#?[0-9a-f]{4}\b|#?[0-9a-f]{3}\b|[a-z]{3,}/gi;
function findColors(text) {
  const out = [], m = text.match(SCAN);
  if (m) for (const tok of m) { const c = parseColor(tok); if (c) { out.push(c); if (out.length >= 2) break; } }
  return out;
}

/* ============================ derived sets ============================ */
let NAMED_LAB = null;
function nearestName(rgb) {
  if (!NAMED_LAB) NAMED_LAB = Object.keys(NAMES).map((n) => ({ n, lab: rgbToOklab(hexToRgb(NAMES[n])) }));
  const t = rgbToOklab(rgb);
  let best = "", bd = Infinity;
  for (const e of NAMED_LAB) { const d = (e.lab.L - t.L) ** 2 + (e.lab.a - t.a) ** 2 + (e.lab.b - t.b) ** 2; if (d < bd) { bd = d; best = e.n; } }
  return { name: best, exact: bd < 1e-6 };
}
const rotate = (rgb, deg) => { const { h, s, l } = rgbToHsl(rgb); return hslToRgb(h + deg, s, l); };
function harmonies(rgb) {
  return {
    Complementary: [rgb, rotate(rgb, 180)],
    Analogous: [rotate(rgb, -30), rgb, rotate(rgb, 30)],
    Triadic: [rgb, rotate(rgb, 120), rotate(rgb, 240)],
    Tetradic: [rgb, rotate(rgb, 90), rotate(rgb, 180), rotate(rgb, 270)],
  };
}
const mix = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
function ramp(rgb) {
  const W = { r: 255, g: 255, b: 255 }, K = { r: 0, g: 0, b: 0 }, out = [];
  for (const t of [0.8, 0.6, 0.4, 0.2]) out.push(mix(rgb, W, t));
  out.push(rgb);
  for (const t of [0.2, 0.4, 0.6, 0.8]) out.push(mix(rgb, K, t));
  return out;
}

/* ============================ formats / render ============================ */
const fmtRgb = (c) => `rgb(${c.r}, ${c.g}, ${c.b})`;
function fmtHsl(c) { const { h, s, l } = rgbToHsl(c); return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`; }
function fmtOklch(c) { const { L, C, h } = rgbToOklch(c); return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h.toFixed(1)})`; }
const rgbVals = (c) => `${c.r}, ${c.g}, ${c.b}`;
function hslVals(c) { const { h, s, l } = rgbToHsl(c); return `${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`; }
function oklchVals(c) { const { L, C, h } = rgbToOklch(c); return `${L.toFixed(2)} ${C.toFixed(3)} ${h.toFixed(0)}`; }
const badge = (r) => (r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "AA large" : "fail");
// data-copy → copies; data-set → becomes the main colour (explore)
const fmtChip = (k, disp, copy, title) => `<button type="button" data-copy="${copy}" title="${title || ("Copy " + copy)}"><span class="k">${k}</span><span class="v">${disp}</span></button>`;
const copyLine = (k, v) => `<button type="button" class="col-copyline" data-copy="${v}" title="Copy ${v}"><span class="k">${k}</span><span class="v">${v}</span></button>`;
const swatch = (rgb) => { const hex = toHex(rgb); return `<button type="button" class="sw" data-set="${hex}" title="${hex} — click to explore" style="background:${hex}"></button>`; };

function buildInner(c, second) {
  const hex = toHex(c);
  const textC = contrast(c, { r: 0, g: 0, b: 0 }) >= contrast(c, { r: 255, g: 255, b: 255 }) ? "#000" : "#fff";
  const btnBg = textC === "#000" ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)";
  const nm = nearestName(c), nameLabel = nm.exact ? nm.name : "≈ " + nm.name;
  const cw = contrast(c, { r: 255, g: 255, b: 255 }), ck = contrast(c, { r: 0, g: 0, b: 0 });
  const best = ck >= cw ? { t: "black", r: ck } : { t: "white", r: cw };
  let html = "";
  html += `<div class="col-hero" style="background:${hex};color:${textC}"><div class="col-heroL"><div class="col-hex">${hex}</div><div class="col-name">${nameLabel}</div></div><div class="col-heroBtns"><button type="button" class="col-hbtn" data-act="back" ${history.length ? "" : "disabled"} style="background:${btnBg};color:${textC}" title="Back" aria-label="Back">←</button><button type="button" class="col-hbtn" data-copy="${hex}" style="background:${btnBg};color:${textC}" title="Copy ${hex}">Copy</button></div></div>`;
  html += `<div class="col-formats">${fmtChip("RGB", rgbVals(c), fmtRgb(c))}${fmtChip("HSL", hslVals(c), fmtHsl(c))}${fmtChip("OKLCH", oklchVals(c), fmtOklch(c), "OKLCH — a modern, perceptually even colour space: lightness · chroma · hue (CSS Color 4). Click copies the CSS value.")}</div>`;
  html += `<div class="col-sec"><div class="col-h">Contrast</div><div class="col-contrast"><div class="col-ct" style="background:${hex};color:#fff"><b>Aa</b><span>${cw.toFixed(2)} · ${badge(cw)}</span></div><div class="col-ct" style="background:${hex};color:#000"><b>Aa</b><span>${ck.toFixed(2)} · ${badge(ck)}</span></div></div><div class="col-best">Best text: ${best.t} — ${best.r.toFixed(2)}:1 (${badge(best.r)})</div></div>`;
  html += `<div class="col-sec"><div class="col-h">Harmonies <span class="col-hint">· click to explore</span></div>` +
    Object.entries(harmonies(c)).map(([k, arr]) => `<div class="col-row"><span class="lab">${k}</span><span class="col-sws">${arr.map(swatch).join("")}</span></div>`).join("") + `</div>`;
  html += `<div class="col-sec"><div class="col-h">Tints &amp; shades</div><div class="col-ramp">${ramp(c).map(swatch).join("")}</div></div>`;
  if (second) {
    const g = `linear-gradient(90deg, ${hex}, ${toHex(second)})`;
    html += `<div class="col-sec"><div class="col-h">Gradient</div><div class="col-gbar" style="background:${g}"></div>${copyLine("CSS", g)}</div>`;
  }
  html += `<div class="col-sec"><div class="col-h">Colour vision</div><div class="col-cvd">` +
    Object.entries(CVD).map(([k, m]) => `<div>${swatch(simCvd(c, m))}<span class="lab">${k}</span></div>`).join("") + `</div></div>`;
  return html;
}

/* ============================ plugin ============================ */
const HELP = `
<p>Type any colour into the box — <em>#5b9bff</em>, <em>rgb(91 155 255)</em>, <em>hsl(217 100% 68%)</em>,
<em>oklch(.68 .16 256)</em>, or a CSS name like <em>cornflowerblue</em>. The <kbd>#</kbd> is optional.</p>
<p><strong>Click any swatch</strong> (harmony or tint) to make it the main colour — everything
recalculates around it, so you can travel complementary → analogous → … to the perfect
shade, then <strong>Copy</strong>. <kbd>←</kbd> steps back through where you've been.</p>
<p>The two buttons at the top-right of the box are a <strong>visual picker</strong> (a
saturation/value square + hue strip — drag to redefine the colour by eye) and, when you have a
photo wallpaper, a <strong>wallpaper eyedropper</strong>.</p>
<h3>What you get</h3>
<table class="help-keys">
  <tr><td><kbd>formats</kbd></td><td>RGB · HSL · OKLCH — click a value to copy its CSS</td></tr>
  <tr><td><kbd>contrast</kbd></td><td>WCAG ratios on white &amp; black, with AA/AAA and the best text colour</td></tr>
  <tr><td><kbd>harmonies</kbd></td><td>complementary, analogous, triadic, tetradic</td></tr>
  <tr><td><kbd>tints</kbd></td><td>a light-to-dark ramp</td></tr>
  <tr><td><kbd>gradient</kbd></td><td>type two colours — <em>#5b9bff #ff5b9b</em></td></tr>
  <tr><td><kbd>vision</kbd></td><td>how it reads under colour-blindness (prot/deuter/trit)</td></tr>
</table>
<p><em>OKLCH</em> is a modern, perceptually even colour space (lightness · chroma · hue) — equal
steps look equally different, which is why it's great for palettes and gradients.</p>
<h3>Keys</h3>
<table class="help-keys">
  <tr><td><kbd>click</kbd></td><td>a swatch → make it the main colour</td></tr>
  <tr><td><kbd>Copy / ↵</kbd></td><td>copy the main colour's hex</td></tr>
  <tr><td><kbd>←</kbd></td><td>step back to the previous colour</td></tr>
  <tr><td><kbd>esc</kbd></td><td>back to the omnibox</td></tr>
</table>`;

let api = null, scrollEl = null, bodyEl = null, innerEl = null, toastEl = null, styleEl = null, toastT = 0;
let base = null, second = null, history = [];
let pickEl = null, svEl = null, svhEl = null, hueEl = null, huehEl = null;          // visual picker
let pickerHsv = { h: 0, s: 0, v: 0 }, dragging = false, rafId = 0, rafRgb = null;

const MAXH = () => Math.min(470, Math.round((window.innerHeight || 800) * 0.62));
function fit() { if (bodyEl) api.setHeight(Math.min(bodyEl.offsetHeight, MAXH())); }
function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg; toastEl.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 1100);
}
function render() {
  innerEl.innerHTML = base ? buildInner(base, second) : PH_HTML;
  if (scrollEl) scrollEl.scrollTop = 0;
  if (pickEl && !pickEl.hidden && !dragging) syncPicker();   // keep the picker in step when the colour changes elsewhere
  fit();
}
function applyBase(rgb) {                     // set the main colour without touching history
  base = rgb; second = null;
  if (api) api.setInput(toHex(rgb).slice(1));   // keep the omnibox in sync (the ## chip owns the hash)
  render();
}
function setBase(rgb, pushHist) {
  if (!rgb) return;
  if (pushHist && base) history.push(base);
  applyBase(rgb);
}
function onClick(e) {
  const setEl = e.target.closest("[data-set]");
  if (setEl) { setBase(parseColor(setEl.getAttribute("data-set")), true); return; }   // explore: becomes the main colour
  if (e.target.closest('[data-act="back"]')) { if (history.length) applyBase(history.pop()); return; }
  const copyEl = e.target.closest("[data-copy]");
  if (copyEl) { const v = copyEl.getAttribute("data-copy"); try { navigator.clipboard.writeText(v); } catch {} toast("Copied " + v); }
}

/* ---- visual picker: saturation/value square + hue strip, redefines the main colour live ---- */
const PICKER_HTML = `<div class="col-sv"><div class="col-svh"></div></div><div class="col-hue"><div class="col-hueh"></div></div>`;
function positionHandles() {
  svEl.style.setProperty("--hue", `hsl(${pickerHsv.h}, 100%, 50%)`);
  svhEl.style.left = (pickerHsv.s * 100) + "%";
  svhEl.style.top = ((1 - pickerHsv.v) * 100) + "%";
  huehEl.style.left = (pickerHsv.h / 360 * 100) + "%";
}
function syncPicker() { if (base) { pickerHsv = rgbToHsv(base); positionHandles(); } }
function applyBaseRaf(rgb) {                  // throttle live updates to one per frame for smooth dragging
  rafRgb = rgb;
  if (rafId) return;
  rafId = requestAnimationFrame(() => { rafId = 0; applyBase(rafRgb); });
}
function svFromPointer(e) {
  const r = svEl.getBoundingClientRect();
  pickerHsv.s = clamp01((e.clientX - r.left) / r.width);
  pickerHsv.v = clamp01(1 - (e.clientY - r.top) / r.height);
  positionHandles();
  applyBaseRaf(hsvToRgb(pickerHsv.h, pickerHsv.s, pickerHsv.v));
}
function hueFromPointer(e) {
  const r = hueEl.getBoundingClientRect();
  pickerHsv.h = clamp01((e.clientX - r.left) / r.width) * 360;
  positionHandles();
  applyBaseRaf(hsvToRgb(pickerHsv.h, pickerHsv.s, pickerHsv.v));
}
function dragStart(el, move, e) {
  e.preventDefault();
  if (base) history.push(base);              // one history entry per drag session
  dragging = true; try { el.setPointerCapture(e.pointerId); } catch {}
  move(e);
}
function togglePicker() {
  if (!pickEl) return;
  if (pickEl.hidden) {
    if (!base) applyBase({ r: 91, g: 155, b: 255 });   // a pleasant seed from blank
    pickEl.hidden = false; syncPicker();
  } else pickEl.hidden = true;
  fit();
}

const plugin = {
  hints: [["click", "explore"], ["↵", "copy main"], ["#a #b", "gradient"]],
  help: HELP,
  mount(root, hostApi) {
    api = hostApi;
    styleEl = document.createElement("style"); styleEl.textContent = CSS; document.head.appendChild(styleEl);
    root.innerHTML = `<div class="colp"><div class="colp-body"><div class="col-pickbox" hidden>${PICKER_HTML}</div><div class="colp-inner"></div></div></div><div class="col-toast"></div>`;
    scrollEl = root.querySelector(".colp");
    bodyEl = root.querySelector(".colp-body");
    innerEl = root.querySelector(".colp-inner");
    toastEl = root.querySelector(".col-toast");
    pickEl = root.querySelector(".col-pickbox");
    svEl = root.querySelector(".col-sv"); svhEl = root.querySelector(".col-svh");
    hueEl = root.querySelector(".col-hue"); huehEl = root.querySelector(".col-hueh");
    base = null; second = null; history = []; dragging = false;
    innerEl.innerHTML = PH_HTML;
    root.addEventListener("click", onClick);
    svEl.addEventListener("pointerdown", (e) => dragStart(svEl, svFromPointer, e));
    svEl.addEventListener("pointermove", (e) => { if (dragging) svFromPointer(e); });
    hueEl.addEventListener("pointerdown", (e) => dragStart(hueEl, hueFromPointer, e));
    hueEl.addEventListener("pointermove", (e) => { if (dragging) hueFromPointer(e); });
    const endDrag = () => { dragging = false; };
    [svEl, hueEl].forEach((el) => { el.addEventListener("pointerup", endDrag); el.addEventListener("pointercancel", endDrag); });
    // the plugin hangs its OWN tools off the omnibox: a visual picker, and (with a photo) a wallpaper eyedropper
    const PALETTE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.83-.44-1.12-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C22 6 17.5 2 12 2Z"></path><circle cx="6.5" cy="11.5" r="1" fill="currentColor" stroke="none"></circle><circle cx="9.5" cy="7.5" r="1" fill="currentColor" stroke="none"></circle><circle cx="14.5" cy="7.5" r="1" fill="currentColor" stroke="none"></circle><circle cx="17.5" cy="11.5" r="1" fill="currentColor" stroke="none"></circle></svg>`;
    const PIPETTE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"></path><path d="M3 21v-3l9-9"></path><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"></path></svg>`;
    const btns = [{ title: "Visual colour picker", svg: PALETTE_SVG, onClick: togglePicker }];
    if (api.hasWallpaper && api.hasWallpaper()) btns.push({ title: "Pick a colour from the wallpaper", svg: PIPETTE_SVG, onClick: () => api.pickFromWallpaper && api.pickFromWallpaper((hex) => setBase(parseColor(hex), true)) });
    if (api.setButtons) api.setButtons(btns);
    fit();
  },
  onInput(text) {
    const t = (text || "").trim();
    if (!t) { base = null; second = null; history = []; render(); return; }
    const colors = findColors(t);
    if (!colors.length) { if (!base) render(); return; }   // keep last good while mid-type
    base = colors[0]; second = colors[1] || null; history = [];   // typing is a fresh starting point
    render();
  },
  onEnter() {
    if (base) { const hex = toHex(base); try { navigator.clipboard.writeText(hex); } catch {} toast("Copied " + hex); }
  },
  unmount() {
    if (styleEl) styleEl.remove();
    clearTimeout(toastT); if (rafId) cancelAnimationFrame(rafId); rafId = 0;
    api = scrollEl = bodyEl = innerEl = toastEl = styleEl = pickEl = svEl = svhEl = hueEl = huehEl = null;
    base = null; second = null; history = []; dragging = false;
  },
};
export default plugin;
