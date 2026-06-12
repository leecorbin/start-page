/* start-page wallpaper plugin: Fish tank (animated SVG aquarium)
   Three distinct worlds — a customisable home Fish tank, a bright diverse Lagoon
   (with a crab), and a very dark Deep (drifting jellyfish, an anglerfish with a
   glowing lure, bioluminescence). All SVG: gradient creatures, filters for light &
   depth. CSS drives the repetitive motion (tails, fins, plants, rays, bubbles,
   pulses); JS only steers the swimmers. Pauses when hidden, honours
   prefers-reduced-motion. Part of start-page (MIT). */

const FKEY = "startpage:wp-fishtank";
const DEFAULTS = { scene: "tank", tankTheme: "purple", density: "some", liveliness: "calm", text: "auto" };
let SET = (() => { try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(FKEY)) || {}); } catch { return { ...DEFAULTS }; } })();
function persist() { try { localStorage.setItem(FKEY, JSON.stringify(SET)); } catch {} }

const VW = 1600, VH = 900;

/* one-click colour themes for the (simpler) Fish tank scene */
const TANK_THEMES = {
  purple: { name: "Amethyst", water: ["#3a2c72", "#211a4e", "#0c0926"], ray: "#dccbff", plant: ["#7a5ec0", "#4a3f96", "#332a70"] },
  aqua:   { name: "Aqua",     water: ["#1f7a86", "#0e4f60", "#06283a"], ray: "#bff0ff", plant: ["#2f9e7e", "#1c6e5e", "#15544a"] },
  blue:   { name: "Blue",     water: ["#2360a8", "#143f7a", "#08203f"], ray: "#cfe2ff", plant: ["#3a86c0", "#275f96", "#1c4470"] },
  green:  { name: "Planted",  water: ["#2f7d4a", "#1a5436", "#0c2a1e"], ray: "#e6ffcf", plant: ["#5cc05a", "#358045", "#1f5a2c"] },
  rose:   { name: "Rose",     water: ["#9a3a6e", "#5e1a44", "#2a0a24"], ray: "#ffd9ee", plant: ["#c06b9e", "#963f7a", "#702a5a"] },
  slate:  { name: "Slate",    water: ["#3a4658", "#222a38", "#0e131c"], ray: "#dfe8f0", plant: ["#64708a", "#3e485c", "#28303e"] },
};

/* fish gradients — bright (0-7) for tank/lagoon, dark+glow (8-12) for the deep */
const GRADS = [
  ["#ff9a4c", "#ff5d7e", "#ffd24c"], ["#2fd6c4", "#2f86d6", "#7a5cff"], ["#ff5db0", "#ff8a4c", "#ffd24c"],
  ["#5cffb0", "#2fb5a0", "#2f86b5"], ["#b06bff", "#ff6bd0", "#6b9bff"], ["#ffd24c", "#ff8a4c", "#ff5d6e"],
  ["#d8ecff", "#9fc4e6", "#6f93b6"], ["#4ce0ff", "#3a8fe0", "#6a4cff"],
  ["#0c1e30", "#163e5e", "#3fd0ff"], ["#160e2a", "#341a52", "#b06bff"], ["#0a1e22", "#123c3e", "#3fffd0"],
  ["#200e16", "#52183a", "#ff6bd0"], ["#0e1620", "#1e3a52", "#9fd0ff"],
];

const SPECIES = {
  round: { len: 80, body: "M34 0 C 26 -21, -6 -25, -24 -12 C -31 -6, -31 6, -24 12 C -6 25, 26 21, 34 0 Z", tail: "M-22 -7 L-47 -22 L-39 0 L-47 22 L-22 7 Z", dorsal: "M4 -19 C -6 -32, -19 -27, -23 -12 L 6 -15 Z", anal: "M2 19 C -6 30, -17 26, -21 13 L 4 15 Z", pec: "M8 7 C 2 23, -12 21, -15 11 Z", eye: [21, -5] },
  slim:  { len: 92, body: "M42 0 C 30 -11, -12 -14, -30 -6 C -36 -3, -36 3, -30 6 C -12 14, 30 11, 42 0 Z", tail: "M-27 -5 L-50 -16 L-40 0 L-50 16 L-27 5 Z", dorsal: "M6 -12 C -2 -22, -16 -19, -22 -9 L 4 -10 Z", anal: "M2 12 C -4 20, -16 18, -20 10 L 2 10 Z", pec: "M12 5 C 6 18, -6 17, -10 9 Z", eye: [28, -3] },
  // tall, elegant — long trailing fins + ventral filaments
  angel: { len: 76, body: "M30 0 C 25 -26, 5 -36, -9 -19 C -15 -11, -15 11, -9 19 C 5 36, 25 26, 30 0 Z", tail: "M-9 -7 L-34 -22 L-26 0 L-34 22 L-9 7 Z", dorsal: "M2 -26 C -4 -52, -24 -50, -30 -16 C -20 -26, -6 -27, 2 -24 Z", anal: "M0 26 C -6 52, -24 50, -30 16 C -20 26, -6 27, 0 24 Z", pec: "M10 6 C 6 22, -6 22, -10 10 Z", fil: "M14 16 C 16 40, 12 58, 8 70", eye: [19, -5] },
  // deep-sea anglerfish — bulky head, toothy, with a lit lure
  angler: { len: 86, body: "M30 2 C 28 -20, 2 -28, -22 -16 C -34 -9, -34 12, -20 18 C 4 28, 30 22, 30 2 Z", tail: "M-18 -8 L-44 -20 L-36 0 L-44 20 L-18 8 Z", dorsal: "M0 -20 C -10 -30, -22 -25, -26 -13 L 2 -16 Z", anal: "M-2 18 C -10 28, -22 24, -26 14 L 0 14 Z", pec: "M6 10 C 0 24, -14 22, -16 13 Z", teeth: "M30 4 L26 10 M24 8 L21 13 M19 10 L17 15", lure: "M26 -14 C 40 -34, 52 -34, 54 -50", eye: [16, -7] },
};

const SCENES = {
  tank:   { name: "Fish tank", themed: true, species: ["round", "slim", "angel"], grads: [0, 1, 2, 3, 4, 5, 6, 7], creatures: [], plantN: 10, plantStyle: "lush", rayN: 5, rayDim: 1, biolum: 0, bg: 1 },
  lagoon: { name: "Lagoon", water: ["#1ba0d6", "#0e63a0", "#06335e"], ray: "#e2f4ff", plant: ["#3ec06a", "#2c8050", "#b8543a"], species: ["round", "slim", "angel"], grads: [0, 1, 2, 3, 4, 5, 7], creatures: ["crab", "crab"], plantN: 13, plantStyle: "lush", rayN: 6, rayDim: 1.15, biolum: 0, bg: 1.08 },
  deep:   { name: "Deep", water: ["#0a2342", "#05132a", "#01060f"], ray: "#3f5e9a", plant: ["#1f5a52", "#143e3a", "#3a2a5e"], species: ["angler", "slim", "angel"], grads: [8, 9, 10, 11, 12], creatures: ["jelly", "jelly", "jelly"], plantN: 4, plantStyle: "sparse", rayN: 3, rayDim: 0.5, biolum: 18, bg: 0.62 },
};
const DENSITY = { few: 5, some: 9, many: 14 };
const LIVE = { calm: { spd: 16, tail: 1.7 }, lively: { spd: 30, tail: 1.05 }, bold: { spd: 48, tail: 0.62 } };

let api = null, layer = null, svg = null, raf = 0, running = false, last = 0, t = 0, acc = 0;
let fish = [], creatures = [];
const FPS = { calm: 30, lively: 45, bold: 60 };   // cap JS steering by liveliness — calm scenes do far less work

function scene() {
  const base = SCENES[SET.scene] || SCENES.tank;
  if (base.themed) { const th = TANK_THEMES[SET.tankTheme] || TANK_THEMES.purple; return { ...base, water: th.water, ray: th.ray, plant: th.plant }; }
  return base;
}
function live() { return LIVE[SET.liveliness] || LIVE.calm; }
const rnd = (a, b) => a + Math.random() * (b - a);
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lumOf = (h) => { const [r, g, b] = hexRgb(h); return 0.299 * r + 0.587 * g + 0.114 * b; };
function reportContrast() {
  if (!api) return;
  if (SET.text === "light") return api.setContrast(false);
  if (SET.text === "dark") return api.setContrast(true);
  const w = scene().water;
  api.setContrast(lumOf(w[0]) * 0.55 + lumOf(w[1]) * 0.45 > 150);
}

/* ---------- defs ---------- */
function defs() {
  const s = scene();
  let g = "";
  g += `<linearGradient id="ft-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.water[0]}"/><stop offset="0.55" stop-color="${s.water[1]}"/><stop offset="1" stop-color="${s.water[2]}"/></linearGradient>`;
  g += `<linearGradient id="ft-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.ray}" stop-opacity="${0.5 * s.rayDim}"/><stop offset="1" stop-color="${s.ray}" stop-opacity="0"/></linearGradient>`;
  g += `<radialGradient id="ft-glow" cx="0.5" cy="0" r="0.9"><stop offset="0" stop-color="${s.ray}" stop-opacity="${0.32 * s.rayDim}"/><stop offset="1" stop-color="${s.ray}" stop-opacity="0"/></radialGradient>`;
  g += `<radialGradient id="ft-bubble" cx="0.36" cy="0.32" r="0.7"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.5" stop-color="#dff3ff" stop-opacity="0.25"/><stop offset="1" stop-color="#bfe6ff" stop-opacity="0.12"/></radialGradient>`;
  g += `<radialGradient id="ft-vignette" cx="0.5" cy="0.42" r="0.78"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#02060c" stop-opacity="${0.5 + (1 - s.bg) * 0.5}"/></radialGradient>`;
  g += `<radialGradient id="ft-biolum" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#cffaff" stop-opacity="0.95"/><stop offset="0.4" stop-color="#5fe0ff" stop-opacity="0.5"/><stop offset="1" stop-color="#5fe0ff" stop-opacity="0"/></radialGradient>`;
  g += `<radialGradient id="ft-jelly" cx="0.5" cy="0.36" r="0.62"><stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="0.45" stop-color="#9fc6ff" stop-opacity="0.34"/><stop offset="1" stop-color="#7a6bff" stop-opacity="0.14"/></radialGradient>`;
  g += `<radialGradient id="ft-jhalo" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#bfe6ff" stop-opacity="0.4"/><stop offset="1" stop-color="#bfe6ff" stop-opacity="0"/></radialGradient>`;
  g += `<linearGradient id="ft-crab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8743f"/><stop offset="0.6" stop-color="#c8432c"/><stop offset="1" stop-color="#8a2820"/></linearGradient>`;
  g += `<radialGradient id="ft-lure" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fffbe0" stop-opacity="1"/><stop offset="0.4" stop-color="#ffe79a" stop-opacity="0.85"/><stop offset="1" stop-color="#ffd24c" stop-opacity="0"/></radialGradient>`;
  s.plant.forEach((c, i) => { const d = hexRgb(c); g += `<linearGradient id="ft-plant${i}" x1="0" y1="1" x2="0.2" y2="0"><stop offset="0" stop-color="rgb(${d[0] * 0.55 | 0},${d[1] * 0.55 | 0},${d[2] * 0.55 | 0})"/><stop offset="1" stop-color="${c}"/></linearGradient>`; });
  GRADS.forEach((cols, i) => { g += `<linearGradient id="ft-fg${i}" x1="0" y1="0.1" x2="1" y2="0.9"><stop offset="0" stop-color="${cols[0]}"/><stop offset="0.5" stop-color="${cols[1]}"/><stop offset="1" stop-color="${cols[2]}"/></linearGradient>`; });
  g += `<filter id="ft-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2"/></filter>`;
  g += `<filter id="ft-caustic"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.022" numOctaves="1" seed="7" stitchTiles="stitch" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.1 -0.62"/></filter>`;
  return `<defs>${g}</defs>`;
}

/* ---------- plants ---------- */
function blade(ox, w, hh, lean, grad) {
  return `<path d="M${ox} 0 C ${ox - w} ${-hh * 0.4}, ${ox + lean + w} ${-hh * 0.75}, ${ox + lean} ${-hh} C ${ox + lean - w} ${-hh * 0.75}, ${ox + w} ${-hh * 0.4}, ${ox} 0 Z" fill="url(#${grad})"/>`;
}
function broadleaf(ox, w, hh, grad, op) {
  // a stalk with a few rounded leaves
  let s = `<path d="M${ox} 0 C ${ox - 3} ${-hh * 0.5}, ${ox + 3} ${-hh * 0.8}, ${ox} ${-hh}" stroke="url(#${grad})" stroke-width="4" fill="none" opacity="${op}"/>`;
  for (let k = 1; k <= 3; k++) { const ly = -hh * (0.3 + k * 0.2), side = k % 2 ? 1 : -1, lw = w * (1 - k * 0.12); s += `<path d="M${ox} ${ly} C ${ox + side * lw} ${ly - 6}, ${ox + side * lw} ${ly - 28}, ${ox + side * 4} ${ly - 34} C ${ox - side * 2} ${ly - 22}, ${ox} ${ly - 10}, ${ox} ${ly} Z" fill="url(#${grad})" opacity="${op}"/>`; }
  return s;
}
function plantCluster(x, baseW, h, style, accentChance, sway) {
  let inner = "";
  if (style === "broad" || (style === "lush" && Math.random() < 0.32)) {
    inner = broadleaf(rnd(-baseW, baseW), baseW * 1.6, h * 0.82, "ft-plant" + (Math.random() < accentChance ? 2 : 1), 0.92);
  } else if (style === "sparse") {
    // a single tall sea-pen-ish frond, translucent
    const hh = h * rnd(0.8, 1.1); inner = `<path d="M0 0 C -6 ${-hh * 0.5}, 6 ${-hh * 0.8}, 0 ${-hh}" stroke="url(#ft-plant0)" stroke-width="3" fill="none" opacity="0.6"/>` + blade(rnd(-4, 4), baseW * 0.5, hh * 0.5, rnd(-8, 8), "ft-plant1");
  } else {
    const n = 3 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) inner += blade(rnd(-baseW, baseW), baseW * rnd(0.5, 1), h * rnd(0.7, 1.1), rnd(-26, 26), "ft-plant" + (Math.random() < accentChance ? 2 : (Math.random() < 0.5 ? 0 : 1)));
  }
  const a = sway === false ? "" : ` class="ft-plant" style="animation-duration:${rnd(5, 9).toFixed(1)}s; animation-delay:${rnd(-4, 0).toFixed(1)}s"`;
  return `<g style="transform:translate(${x}px,${VH}px)"><g${a}>${inner}</g></g>`;   // background plants don't sway → their blur rasterizes once
}

/* ---------- bubbles & biolum ---------- */
function bubbleCol(x) {
  let b = ""; const n = 3 + (Math.random() * 4 | 0);
  for (let i = 0; i < n; i++) b += `<g class="ft-brise" style="animation-duration:${rnd(6, 12).toFixed(1)}s; animation-delay:${rnd(-12, 0).toFixed(1)}s"><g class="ft-bwob" style="animation-duration:${rnd(3.5, 5).toFixed(1)}s"><circle r="${rnd(2.5, 6).toFixed(1)}" fill="url(#ft-bubble)"/></g></g>`;
  return `<g style="transform:translate(${x}px,${VH}px)">${b}</g>`;
}
function biolumField(n) {
  let d = "";
  for (let i = 0; i < n; i++) { const r = rnd(2, 5); d += `<g class="ft-mote" style="transform:translate(${rnd(0, VW) | 0}px,${rnd(60, VH - 40) | 0}px); animation-duration:${rnd(3, 7).toFixed(1)}s; animation-delay:${rnd(-7, 0).toFixed(1)}s"><circle r="${r.toFixed(1)}" fill="url(#ft-biolum)"/></g>`; }
  return `<g class="ft-biolum">${d}</g>`;
}

/* ---------- swimmers ---------- */
function fishMarkup(f) {
  const sp = SPECIES[f.sp], gid = `ft-fg${f.g}`;
  const eye = `<circle cx="${sp.eye[0]}" cy="${sp.eye[1]}" r="3.1" fill="#0c1622"/><circle cx="${sp.eye[0] + 0.9}" cy="${sp.eye[1] - 0.9}" r="1" fill="#fff"/>`;
  let extra = "";
  if (sp.fil) extra += `<path d="${sp.fil}" stroke="url(#${gid})" stroke-width="2.4" fill="none" opacity="0.6"/>`;
  if (sp.teeth) extra += `<path d="${sp.teeth}" stroke="#eef3ff" stroke-width="1.5" fill="none" opacity="0.85"/>`;
  let lure = "";
  if (sp.lure) lure = `<path d="${sp.lure}" stroke="#caa84c" stroke-width="2" fill="none" opacity="0.7"/><g class="ft-lurebulb" style="transform:translate(54px,-50px)"><circle r="13" fill="url(#ft-lure)"/><circle r="3.4" fill="#fffbe0"/></g>`;
  return `<g class="ft-fish" data-i="${f.i}" style="opacity:${f.op}">
    <g class="ft-tail" style="animation-duration:${f.tailDur}s"><path d="${sp.tail}" fill="url(#${gid})" opacity="0.85"/></g>
    <path d="${sp.dorsal}" fill="url(#${gid})" opacity="0.72"/><path d="${sp.anal}" fill="url(#${gid})" opacity="0.72"/>
    ${extra}
    <path d="${sp.body}" fill="url(#${gid})"/>
    <ellipse cx="0" cy="-6" rx="18" ry="5.5" fill="#fff" opacity="0.13"/>
    <g class="ft-pec" style="animation-duration:${(f.tailDur * 0.8).toFixed(2)}s"><path d="${sp.pec}" fill="url(#${gid})" opacity="0.55"/></g>
    ${eye}${lure}
  </g>`;
}
function makeFish() {
  const s = scene(), n = DENSITY[SET.density] || DENSITY.some, lv = live();
  fish = [];
  for (let i = 0; i < n; i++) {
    const depth = Math.random(), scale = 0.5 + depth * 0.85;
    fish.push({
      i, sp: s.species[(Math.random() * s.species.length) | 0], g: s.grads[(Math.random() * s.grads.length) | 0],
      x: rnd(0, VW), baseY: rnd(120, VH - 150), y: 0, dir: Math.random() < 0.5 ? 1 : -1,
      scale, op: 0.42 + depth * 0.55, speed: lv.spd * rnd(0.7, 1.3) * (0.6 + depth * 0.7),   // depth now via scale + opacity only (no blur)
      bobAmp: rnd(10, 26), bobFreq: rnd(0.5, 1.1), phase: rnd(0, 7), tilt: 0, tailDur: (lv.tail * rnd(0.85, 1.2)).toFixed(2),
    });
  }
  fish.sort((a, b) => a.scale - b.scale);
}

/* ---------- creatures (crab walks the floor, jellyfish drift) ---------- */
function crabMarkup(c) {
  let legs = "";
  for (let side = -1; side <= 1; side += 2) for (let k = 0; k < 3; k++) {
    const lx = side * (14 + k * 9), ly = -6 + k * 3;
    legs += `<g class="ft-leg" style="transform-origin:${lx}px ${ly}px; animation-delay:${(k * 0.12 + (side < 0 ? 0.18 : 0)).toFixed(2)}s"><path d="M${lx} ${ly} q ${side * 14} 4 ${side * 20} 16" stroke="#a8331f" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>`;
  }
  const claw = (side) => `<g class="ft-claw" style="transform-origin:${side * 22}px 2px; animation-delay:${side < 0 ? 0 : 0.4}s"><path d="M${side * 20} 2 q ${side * 16} -2 ${side * 22} -12" stroke="#b8392222" stroke-width="6" fill="none"/><path d="M${side * 20} 2 q ${side * 16} -2 ${side * 22} -12" stroke="url(#ft-crab)" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M${side * 40} -12 q ${side * 8} -6 ${side * 2} -12 q ${side * -6} 4 ${side * -2} 12 Z" fill="url(#ft-crab)"/><path d="M${side * 40} -12 q ${side * 9} 1 ${side * 13} -7" stroke="url(#ft-crab)" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;
  return `<g class="ft-crab" data-i="${c.i}"><g class="ft-crabb">${legs}${claw(-1)}${claw(1)}<ellipse cx="0" cy="0" rx="26" ry="16" fill="url(#ft-crab)"/><path d="M-26 -2 Q0 -18 26 -2" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.18"/><line x1="-8" y1="-13" x2="-10" y2="-22" stroke="#a8331f" stroke-width="2.4"/><line x1="8" y1="-13" x2="10" y2="-22" stroke="#a8331f" stroke-width="2.4"/><circle cx="-10" cy="-23" r="3" fill="#2a0e0a"/><circle cx="10" cy="-23" r="3" fill="#2a0e0a"/></g></g>`;
}
function jellyMarkup(c) {
  let tents = "";
  for (let k = -3; k <= 3; k++) { const x = k * 7; tents += `<path class="ft-tent" style="animation-delay:${(Math.abs(k) * 0.1).toFixed(2)}s" d="M${x} 18 q ${k * 2} 26 ${k * 1.5} 54" stroke="url(#ft-jelly)" stroke-width="${k % 2 ? 2.4 : 3.4}" fill="none" stroke-linecap="round" opacity="0.7"/>`; }
  let arms = ""; for (let k = -1; k <= 1; k++) arms += `<path class="ft-tent" style="animation-delay:${(0.2 + k * 0.05).toFixed(2)}s" d="M${k * 9} 16 q ${k * 6} 20 ${k * 2} 40 q ${k * -6} 8 ${k * 1} 18" stroke="url(#ft-jelly)" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.45"/>`;
  return `<g class="ft-jelly2" data-i="${c.i}" style="opacity:${c.op}">
    <ellipse cx="0" cy="6" rx="46" ry="40" fill="url(#ft-jhalo)"/>
    <g class="ft-tents" style="animation-duration:${c.pulse * 1.4}s">${tents}${arms}</g>
    <g class="ft-bell" style="animation-duration:${c.pulse}s"><path d="M-30 12 C -34 -28, 34 -28, 30 12 C 18 22, -18 22, -30 12 Z" fill="url(#ft-jelly)"/><path d="M-30 12 C -22 18, 22 18, 30 12" stroke="#dffbff" stroke-width="2" fill="none" opacity="0.5"/><ellipse cx="-8" cy="-8" rx="9" ry="13" fill="#fff" opacity="0.25"/></g>
  </g>`;
}
function makeCreatures() {
  const s = scene(); creatures = [];
  (s.creatures || []).forEach((kind, i) => {
    if (kind === "crab") creatures.push({ i, kind, x: rnd(120, VW - 120), y: VH - rnd(95, 130), dir: Math.random() < 0.5 ? 1 : -1, speed: rnd(14, 26), bob: rnd(0, 7) });   // kept clear of the bottom so 'slice' cropping never halves it
    else if (kind === "jelly") { const depth = Math.random(); creatures.push({ i, kind, x: rnd(120, VW - 120), y: rnd(120, VH - 220), dir: Math.random() < 0.5 ? 1 : -1, speed: rnd(6, 13), scale: 0.6 + depth * 0.7, op: 0.5 + depth * 0.4, vy: rnd(-7, 7), phase: rnd(0, 7), pulse: rnd(3.2, 5).toFixed(1) }); }
  });
}

/* ---------- scene assembly ---------- */
function buildScene() {
  const s = scene();
  let html = defs();
  html += `<rect width="${VW}" height="${VH}" fill="url(#ft-water)"/>`;
  html += `<rect width="${VW}" height="${VH * 0.5}" fill="url(#ft-glow)"/>`;
  let rays = "";
  for (let i = 0; i < s.rayN; i++) { const x = rnd(0.05, 0.95) * VW, w = rnd(60, 150), sk = rnd(-10, 10); rays += `<g class="ft-ray" style="animation-duration:${rnd(9, 16).toFixed(1)}s; animation-delay:${rnd(-8, 0).toFixed(1)}s"><polygon points="${x},0 ${x + w},0 ${x + w + sk + 120},${VH} ${x + sk - 40},${VH}" fill="url(#ft-ray)"/></g>`; }
  html += `<g style="mix-blend-mode:screen">${rays}</g>`;
  html += `<rect class="ft-caustic" width="${VW}" height="${VH}" filter="url(#ft-caustic)" style="mix-blend-mode:screen" opacity="${(0.5 * s.rayDim).toFixed(2)}"/>`;
  if (s.biolum) html += biolumField(s.biolum);
  // background plants (blurred)
  let back = ""; const bn = Math.round(s.plantN * 0.45);
  for (let i = 0; i < bn; i++) back += plantCluster(rnd(0, VW), rnd(24, 44), rnd(240, 440), s.plantStyle === "sparse" ? "sparse" : "blade", 0, false);
  html += `<g style="filter:url(#ft-soft);opacity:0.7">${back}</g>`;
  html += `<g class="ft-creatures-back"></g>`;
  html += `<g class="ft-fishlayer"></g>`;
  html += `<g class="ft-creatures-front"></g>`;
  // foreground plants
  let front = ""; const fn = s.plantN - bn;
  for (let i = 0; i < fn; i++) front += plantCluster(rnd(0, VW), rnd(32, 58), rnd(280, 540), s.plantStyle, 0.22);
  html += `<g>${front}</g>`;
  let bub = ""; const bubN = Math.round(({ calm: 3, lively: 5, bold: 7 }[SET.liveliness] || 4) * (s.biolum ? 0.5 : 1)); for (let i = 0; i < bubN; i++) bub += bubbleCol(rnd(0.08, 0.92) * VW);   // calmer scenes = fewer continuously-animating bubbles
  html += `<g>${bub}</g>`;
  html += `<rect width="${VW}" height="${VH}" fill="url(#ft-vignette)" pointer-events="none"/>`;
  svg.innerHTML = html;

  makeFish();
  svg.querySelector(".ft-fishlayer").innerHTML = fish.map(fishMarkup).join("");
  fish.forEach((f) => { f.el = svg.querySelector(`.ft-fish[data-i="${f.i}"]`); });
  makeCreatures();
  const backC = creatures.filter((c) => c.kind === "jelly" && c.scale < 1);
  const frontC = creatures.filter((c) => !(c.kind === "jelly" && c.scale < 1));
  const mk = (c) => c.kind === "crab" ? crabMarkup(c) : jellyMarkup(c);
  svg.querySelector(".ft-creatures-back").innerHTML = backC.map(mk).join("");
  svg.querySelector(".ft-creatures-front").innerHTML = frontC.map(mk).join("");
  creatures.forEach((c) => { c.el = svg.querySelector(`[data-i="${c.i}"].ft-${c.kind === "crab" ? "crab" : "jelly2"}`); });
  placeAll(0);
}

/* ---------- steering ---------- */
function placeAll(dt) {
  for (const f of fish) {
    if (dt) {
      f.x += f.dir * f.speed * dt;
      if (f.x > VW + 80 && f.dir > 0) f.dir = -1; else if (f.x < -80 && f.dir < 0) f.dir = 1;
      f.baseY += Math.sin(t * 0.15 + f.phase) * 6 * dt; f.baseY = Math.max(90, Math.min(VH - 120, f.baseY));
    }
    f.y = f.baseY + Math.cos(t * f.bobFreq + f.phase) * f.bobAmp;
    f.tilt = -Math.sin(t * f.bobFreq + f.phase) * 6 * f.dir;
    if (f.el) f.el.setAttribute("transform", `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) scale(${(f.dir * f.scale).toFixed(3)} ${f.scale.toFixed(3)}) rotate(${f.tilt.toFixed(1)})`);
  }
  for (const c of creatures) {
    if (c.kind === "crab") {
      if (dt) { c.x += c.dir * c.speed * dt; if (c.x > VW - 90 && c.dir > 0) c.dir = -1; else if (c.x < 90 && c.dir < 0) c.dir = 1; }
      const yb = c.y + Math.abs(Math.sin(t * 3)) * c.bob;
      if (c.el) c.el.setAttribute("transform", `translate(${c.x.toFixed(1)} ${yb.toFixed(1)}) scale(${(c.dir).toFixed(0)} 1)`);
    } else if (c.kind === "jelly") {
      if (dt) {
        c.x += c.dir * c.speed * dt; if (c.x > VW + 60 && c.dir > 0) c.dir = -1; else if (c.x < -60 && c.dir < 0) c.dir = 1;
        c.y += c.vy * dt; if (c.y < 110) c.vy = Math.abs(c.vy); else if (c.y > VH - 200) c.vy = -Math.abs(c.vy);
      }
      const yb = c.y + Math.sin(t * 0.8 + c.phase) * 10;
      if (c.el) c.el.setAttribute("transform", `translate(${c.x.toFixed(1)} ${yb.toFixed(1)}) scale(${c.scale.toFixed(3)})`);
    }
  }
}
function frame(ts) {
  if (!running) return;
  const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; acc += dt;
  const step = 1 / (FPS[SET.liveliness] || 30);
  if (acc >= step) { t += acc; placeAll(acc); acc = 0; }   // only move the swimmers at the capped rate (time-based, so speed is unchanged)
  raf = requestAnimationFrame(frame);
}
function start() { if (running) return; if (api && api.reducedMotion()) { placeAll(0); return; } running = true; last = 0; acc = 0; raf = requestAnimationFrame(frame); }
function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
function onVis() { if (document.hidden) { stop(); if (svg) svg.classList.add("ft-paused"); } else { if (svg) svg.classList.remove("ft-paused"); start(); } }
function rebuild() { if (!svg) return; reportContrast(); buildScene(); applyMotionFlag(); }
function applyMotionFlag() { if (svg) svg.classList.toggle("ft-still", !!(api && api.reducedMotion())); }

/* ---------- CSS ---------- */
const SCSS = `
.ft-svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.ft-tail { transform-box: fill-box; transform-origin: 100% 50%; animation: ft-tail 1.4s ease-in-out infinite; }
@keyframes ft-tail { 0%,100% { transform: rotate(-13deg); } 50% { transform: rotate(13deg); } }
.ft-pec { transform-box: fill-box; transform-origin: 90% 10%; animation: ft-pec 1s ease-in-out infinite; }
@keyframes ft-pec { 0%,100% { transform: rotate(-9deg); } 50% { transform: rotate(12deg); } }
.ft-lurebulb { animation: ft-glow 2.6s ease-in-out infinite; }
@keyframes ft-glow { 0%,100% { opacity: 0.65; } 50% { opacity: 1; } }
.ft-plant { transform-box: fill-box; transform-origin: 50% 100%; animation: ft-sway 7s ease-in-out infinite; }
@keyframes ft-sway { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3.5deg); } }
.ft-ray { animation: ft-raymove 12s ease-in-out infinite; transform-box: view-box; }
@keyframes ft-raymove { 0%,100% { transform: translateX(-26px); opacity: 0.55; } 50% { transform: translateX(26px); opacity: 0.95; } }
.ft-caustic { animation: ft-caus 16s ease-in-out infinite; }   /* opacity-only → the turbulence rasterizes ONCE, never re-rastered per frame */
@keyframes ft-caus { 0%,100% { opacity: 0.32; } 50% { opacity: 0.6; } }
.ft-brise { animation: ft-rise linear infinite; }
@keyframes ft-rise { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 0.85; } 88% { opacity: 0.6; } 100% { transform: translateY(-${VH + 40}px); opacity: 0; } }
.ft-bwob { animation: ft-wob ease-in-out infinite alternate; }
@keyframes ft-wob { from { transform: translateX(-5px); } to { transform: translateX(5px); } }
.ft-mote { animation: ft-mote ease-in-out infinite alternate; }
@keyframes ft-mote { from { opacity: 0.25; } to { opacity: 1; } }
.ft-bell { transform-box: fill-box; transform-origin: 50% 30%; animation: ft-bell 3.6s ease-in-out infinite; }
@keyframes ft-bell { 0%,100% { transform: scaleY(1) scaleX(1); } 50% { transform: scaleY(0.84) scaleX(1.08); } }
.ft-tents { transform-box: fill-box; transform-origin: 50% 0%; animation: ft-tents 3.6s ease-in-out infinite; }
@keyframes ft-tents { 0%,100% { transform: scaleY(1.06); } 50% { transform: scaleY(0.9); } }
.ft-leg { transform-box: fill-box; animation: ft-leg 0.5s ease-in-out infinite alternate; }
@keyframes ft-leg { from { transform: rotate(-7deg); } to { transform: rotate(7deg); } }
.ft-claw { transform-box: fill-box; animation: ft-claw 1.4s ease-in-out infinite alternate; }
@keyframes ft-claw { from { transform: rotate(-4deg); } to { transform: rotate(6deg); } }
.ft-crabb { transform-box: fill-box; transform-origin: 50% 100%; animation: ft-crabbob 0.5s ease-in-out infinite alternate; }
@keyframes ft-crabbob { from { transform: translateY(0); } to { transform: translateY(-2px); } }
.ft-still .ft-tail, .ft-still .ft-pec, .ft-still .ft-plant, .ft-still .ft-ray, .ft-still .ft-caustic, .ft-still .ft-brise, .ft-still .ft-bwob, .ft-still .ft-mote, .ft-still .ft-bell, .ft-still .ft-tents, .ft-still .ft-leg, .ft-still .ft-claw, .ft-still .ft-crabb, .ft-still .ft-lurebulb { animation: none; }
.ft-paused * { animation-play-state: paused !important; }
`;
function ensureCss() { let e = document.getElementById("ft-css"); if (!e) { e = document.createElement("style"); e.id = "ft-css"; document.head.appendChild(e); } e.textContent = SCSS; }

/* ---------- settings ---------- */
const PSCSS = `
.ftp-lab { font-size: 0.6rem; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted, rgba(244,246,251,0.6)); margin: 0.55rem 0 0.35rem; }
.ftp-lab:first-child { margin-top: 0; }
.ftp-seg { display: flex; flex-wrap: wrap; background: rgba(255,255,255,0.06); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 8px; padding: 2px; gap: 2px; }
.ftp-seg button { flex: 1 0 auto; border: none; background: none; color: var(--muted, rgba(244,246,251,0.6)); font: inherit; font-size: 0.74rem; padding: 0.22rem 0.4rem; border-radius: 6px; cursor: pointer; }
.ftp-seg button.on { background: rgba(255,255,255,0.18); color: var(--fg, #f4f6fb); }
.ftp-sws { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.ftp-sw { width: 28px; height: 28px; border-radius: 7px; border: 2px solid transparent; cursor: pointer; padding: 0; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); }
.ftp-sw.on { border-color: #fff; }
.ftp-note { margin-top: 0.5rem; font-size: 0.74rem; color: var(--muted, rgba(244,246,251,0.55)); line-height: 1.4; }
`;
function settings(root, hostApi) {
  api = hostApi || api;
  if (!document.getElementById("ftp-scss")) { const s = document.createElement("style"); s.id = "ftp-scss"; s.textContent = PSCSS; document.head.appendChild(s); }
  const seg = (key, map) => Object.entries(map).map(([id, v]) => `<button type="button" data-${key}="${id}" class="${SET[key] === id ? "on" : ""}">${v.name || v}</button>`).join("");
  const themeRow = SET.scene === "tank"
    ? `<div class="ftp-lab">Colour</div><div class="ftp-sws">${Object.entries(TANK_THEMES).map(([id, th]) => `<button type="button" class="ftp-sw${SET.tankTheme === id ? " on" : ""}" data-theme="${id}" title="${th.name}" style="background:linear-gradient(135deg, ${th.water[0]}, ${th.water[2]})"></button>`).join("")}</div>` : "";
  root.innerHTML = `<div class="ftp-lab">Scene</div><div class="ftp-seg">${seg("scene", SCENES)}</div>${themeRow}
    <div class="ftp-lab">Fish</div><div class="ftp-seg">${seg("density", { few: "Few", some: "Some", many: "Many" })}</div>
    <div class="ftp-lab">Liveliness</div><div class="ftp-seg">${seg("liveliness", { calm: "Calm", lively: "Lively", bold: "Bold" })}</div>
    <div class="ftp-lab">Text</div><div class="ftp-seg">${seg("text", { auto: "Auto", light: "Light", dark: "Dark" })}</div>`
    + (api && api.reducedMotion() ? `<div class="ftp-note">Your system has “reduce motion” on, so the tank stays still.</div>` : ``);
  root.onclick = (e) => {
    const a = e.target.closest("[data-scene],[data-theme],[data-density],[data-liveliness],[data-text]"); if (!a) return;
    if (a.dataset.scene != null) SET.scene = a.dataset.scene;
    else if (a.dataset.theme != null) SET.tankTheme = a.dataset.theme;
    else if (a.dataset.density != null) SET.density = a.dataset.density;
    else if (a.dataset.liveliness != null) SET.liveliness = a.dataset.liveliness;
    else SET.text = a.dataset.text;
    persist();
    if (a.dataset.text != null) reportContrast(); else rebuild();
    start(); settings(root, api);
  };
}

export default {
  mount(layerEl, hostApi) {
    api = hostApi; layer = layerEl;
    ensureCss();
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ft-svg"); svg.setAttribute("viewBox", `0 0 ${VW} ${VH}`); svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    layer.appendChild(svg);
    reportContrast(); buildScene(); applyMotionFlag(); start();
    document.addEventListener("visibilitychange", onVis);
  },
  settings,
  unmount() {
    stop();
    document.removeEventListener("visibilitychange", onVis);
    ["ft-css", "ftp-scss"].forEach((id) => { const e = document.getElementById(id); if (e) e.remove(); });
    if (svg) svg.remove();
    api = layer = svg = null; fish = []; creatures = []; t = 0;
  },
};
