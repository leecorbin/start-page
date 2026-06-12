/* start-page wallpaper plugin: Dioramas (animated canvas scenes)
   Four living worlds — a customisable Fish tank, a bright Lagoon (crabs), a dark
   Deep (jellyfish, anglerfish, bioluminescence) and a Jungle (a monkey family,
   beetles). Rendered to a <canvas> (immediate-mode) so it stays smooth in Safari —
   the same gradient art and behaviours as before, just drawn instead of an SVG tree.
   Pauses when hidden, honours prefers-reduced-motion. Part of start-page (MIT). */

const FKEY = "startpage:wp-fishtank";
const DEFAULTS = { scene: "tank", tankTheme: "purple", density: "some", liveliness: "calm", text: "auto", aware: "on" };
let SET = (() => { try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(FKEY)) || {}); } catch { return { ...DEFAULTS }; } })();
function persist() { try { localStorage.setItem(FKEY, JSON.stringify(SET)); } catch {} }

const VW = 1600, VH = 900, TAU = Math.PI * 2;

const TANK_THEMES = {
  purple: { name: "Amethyst", water: ["#3a2c72", "#211a4e", "#0c0926"], ray: "#dccbff", plant: ["#7a5ec0", "#4a3f96", "#332a70"] },
  aqua:   { name: "Aqua",     water: ["#1f7a86", "#0e4f60", "#06283a"], ray: "#bff0ff", plant: ["#2f9e7e", "#1c6e5e", "#15544a"] },
  blue:   { name: "Blue",     water: ["#2360a8", "#143f7a", "#08203f"], ray: "#cfe2ff", plant: ["#3a86c0", "#275f96", "#1c4470"] },
  green:  { name: "Planted",  water: ["#2f7d4a", "#1a5436", "#0c2a1e"], ray: "#e6ffcf", plant: ["#5cc05a", "#358045", "#1f5a2c"] },
  rose:   { name: "Rose",     water: ["#9a3a6e", "#5e1a44", "#2a0a24"], ray: "#ffd9ee", plant: ["#c06b9e", "#963f7a", "#702a5a"] },
  slate:  { name: "Slate",    water: ["#3a4658", "#222a38", "#0e131c"], ray: "#dfe8f0", plant: ["#64708a", "#3e485c", "#28303e"] },
};
const GRADS = [
  ["#ff9a4c", "#ff5d7e", "#ffd24c"], ["#2fd6c4", "#2f86d6", "#7a5cff"], ["#ff5db0", "#ff8a4c", "#ffd24c"],
  ["#5cffb0", "#2fb5a0", "#2f86b5"], ["#b06bff", "#ff6bd0", "#6b9bff"], ["#ffd24c", "#ff8a4c", "#ff5d6e"],
  ["#d8ecff", "#9fc4e6", "#6f93b6"], ["#4ce0ff", "#3a8fe0", "#6a4cff"],
  ["#0c1e30", "#163e5e", "#3fd0ff"], ["#160e2a", "#341a52", "#b06bff"], ["#0a1e22", "#123c3e", "#3fffd0"],
  ["#200e16", "#52183a", "#ff6bd0"], ["#0e1620", "#1e3a52", "#9fd0ff"],
];
const SPECIES = {
  round: { body: "M34 0 C 26 -21 -6 -25 -24 -12 C -31 -6 -31 6 -24 12 C -6 25 26 21 34 0 Z", tail: "M-22 -7 L-47 -22 L-39 0 L-47 22 L-22 7 Z", dorsal: "M4 -19 C -6 -32 -19 -27 -23 -12 L 6 -15 Z", anal: "M2 19 C -6 30 -17 26 -21 13 L 4 15 Z", pec: "M8 7 C 2 23 -12 21 -15 11 Z", eye: [21, -5] },
  slim:  { body: "M42 0 C 30 -11 -12 -14 -30 -6 C -36 -3 -36 3 -30 6 C -12 14 30 11 42 0 Z", tail: "M-27 -5 L-50 -16 L-40 0 L-50 16 L-27 5 Z", dorsal: "M6 -12 C -2 -22 -16 -19 -22 -9 L 4 -10 Z", anal: "M2 12 C -4 20 -16 18 -20 10 L 2 10 Z", pec: "M12 5 C 6 18 -6 17 -10 9 Z", eye: [28, -3] },
  angel: { body: "M30 0 C 25 -26 5 -36 -9 -19 C -15 -11 -15 11 -9 19 C 5 36 25 26 30 0 Z", tail: "M-9 -7 L-34 -22 L-26 0 L-34 22 L-9 7 Z", dorsal: "M2 -26 C -4 -52 -24 -50 -30 -16 C -20 -26 -6 -27 2 -24 Z", anal: "M0 26 C -6 52 -24 50 -30 16 C -20 26 -6 27 0 24 Z", pec: "M10 6 C 6 22 -6 22 -10 10 Z", fil: "M14 16 C 16 40 12 58 8 70", eye: [19, -5] },
  angler: { body: "M30 2 C 28 -20 2 -28 -22 -16 C -34 -9 -34 12 -20 18 C 4 28 30 22 30 2 Z", tail: "M-18 -8 L-44 -20 L-36 0 L-44 20 L-18 8 Z", dorsal: "M0 -20 C -10 -30 -22 -25 -26 -13 L 2 -16 Z", anal: "M-2 18 C -10 28 -22 24 -26 14 L 0 14 Z", pec: "M6 10 C 0 24 -14 22 -16 13 Z", teeth: "M30 4 L26 10 M24 8 L21 13 M19 10 L17 15", lure: "M26 -14 C 40 -34 52 -34 54 -50", eye: [16, -7] },
};
const SCENES = {
  tank:   { name: "Fish tank", themed: true, species: ["round", "slim", "angel"], grads: [0, 1, 2, 3, 4, 5, 6, 7], creatures: [], plantN: 10, plantStyle: "lush", rayN: 5, rayDim: 1, biolum: 0, bg: 1 },
  lagoon: { name: "Lagoon", water: ["#1ba0d6", "#0e63a0", "#06335e"], ray: "#e2f4ff", plant: ["#3ec06a", "#2c8050", "#b8543a"], species: ["round", "slim", "angel"], grads: [0, 1, 2, 3, 4, 5, 7], creatures: ["crab", "crab"], plantN: 13, plantStyle: "lush", rayN: 6, rayDim: 1.15, biolum: 0, bg: 1.08 },
  deep:   { name: "Deep", water: ["#0a2342", "#05132a", "#01060f"], ray: "#3f5e9a", plant: ["#1f5a52", "#143e3a", "#3a2a5e"], species: ["angler", "slim", "angel"], grads: [8, 9, 10, 11, 12], creatures: ["jelly", "jelly", "jelly"], plantN: 4, plantStyle: "sparse", rayN: 3, rayDim: 0.5, biolum: 18, bg: 0.62 },
  jungle: { name: "Jungle", jungle: true, water: ["#cfe08a", "#6fa048", "#172312"], ray: "#fff2c8", plant: ["#3fa050", "#2c7a3a", "#8a5a2e"], rayN: 5, rayDim: 1, bg: 0.95 },
};
const DENSITY = { few: 5, some: 9, many: 14 }, MONK = { few: 2, some: 3, many: 4 };
const LIVE = { calm: { spd: 16, tail: 1.7 }, lively: { spd: 30, tail: 1.05 }, bold: { spd: 48, tail: 0.62 } };
const FAMILY = [
  { fur: 3, scale: 1.6, acc: "plain", banana: true, canLeap: true, belly: "#cda878", face: "#e6cd9e" },
  { fur: 0, scale: 1.42, acc: "bow", banana: false, canLeap: true, belly: "#d8b88a", face: "#ecd2a6" },
  { fur: 2, scale: 1.18, acc: "glasses", banana: true, canLeap: true, belly: "#e2c690", face: "#f1daab" },
  { fur: 1, scale: 0.92, acc: "flower", banana: false, canLeap: false, belly: "#d3c8b6", face: "#e8dfcd" },
];
const MK_FUR = [["#7a5230", "#4a3119"], ["#8a8276", "#5a5048"], ["#a87a3e", "#6e4e22"], ["#5a3e26", "#33220f"]];
const TREES = [{ x: 300, w: 78 }, { x: 830, w: 96 }, { x: 1330, w: 80 }];
const PERCHES = [{ x: 382, y: 440, t: 0 }, { x: 232, y: 612, t: 0 }, { x: 772, y: 372, t: 1 }, { x: 922, y: 556, t: 1 }, { x: 1262, y: 470, t: 2 }, { x: 1404, y: 636, t: 2 }];

let api = null, layer = null, canvas = null, ctx = null, raf = 0, running = false, last = 0, t = 0;
let fish = [], creatures = [], monkeys = [], insects = [], plants = [], bubbles = [], rays = [], motes = [], caustics = [], scenery = null;
let COVER = { dpr: 1, s: 1, ox: 0, oy: 0 }, G = {}, P = new Map();
let boxes = [], clockBox = null, obsAcc = 0, nibbleNext = rnd0(16, 36), nibbler = null;   // elemental awareness
function rnd0(a, b) { return a + Math.random() * (b - a); }

const scn = () => { const b = SCENES[SET.scene] || SCENES.tank; return b.themed ? { ...b, ...TANK_THEMES[SET.tankTheme] || TANK_THEMES.purple } : b; };
const live = () => LIVE[SET.liveliness] || LIVE.calm;
const rnd = (a, b) => a + Math.random() * (b - a);
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lumOf = (h) => { const [r, g, b] = hexRgb(h); return 0.299 * r + 0.587 * g + 0.114 * b; };
const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };
const dark = (h, f) => { const [r, g, b] = hexRgb(h); return `rgb(${r * f | 0},${g * f | 0},${b * f | 0})`; };
function reportContrast() {
  if (!api) return;
  if (SET.text === "light") return api.setContrast(false);
  if (SET.text === "dark") return api.setContrast(true);
  const w = scn().water; api.setContrast(lumOf(w[0]) * 0.55 + lumOf(w[1]) * 0.45 > 150);
}
function path(d) { let p = P.get(d); if (!p) { p = new Path2D(d); P.set(d, p); } return p; }      // cache parsed paths
function lin(x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) g.addColorStop(o, c); return g; }
function rad(x0, y0, r0, x1, y1, r1, stops) { const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1); for (const [o, c] of stops) g.addColorStop(o, c); return g; }

/* gradients (cached; scene-dependent ones rebuilt on scene change, the rest once) */
function buildGrads() {
  const s = scn();
  G.water = lin(0, 0, 0, VH, [[0, s.water[0]], [0.55, s.water[1]], [1, s.water[2]]]);
  G.ray = lin(0, 0, 0, VH, [[0, rgba(s.ray, 0.5 * s.rayDim)], [1, rgba(s.ray, 0)]]);
  G.glow = rad(VW / 2, -40, 0, VW / 2, -40, 760, [[0, rgba(s.ray, 0.32 * s.rayDim)], [1, rgba(s.ray, 0)]]);
  G.vig = rad(VW * 0.5, VH * 0.42, VW * 0.32, VW * 0.5, VH * 0.42, VW * 0.8, [[0, "rgba(2,6,12,0)"], [1, `rgba(2,6,12,${0.5 + (1 - s.bg) * 0.5})`]]);
  G.plant = (s.plant || ["#3fa050", "#2c7a3a", "#8a5a2e"]).map((c) => lin(0, 0, 8, -420, [[0, dark(c, 0.55)], [1, c]]));
  if (G.fg) return;                                                                                  // the rest only once
  G.fg = GRADS.map((c) => lin(-50, -34, 42, 34, [[0, c[0]], [0.5, c[1]], [1, c[2]]]));
  G.bubble = rad(-0.14, -0.18, 0, 0, 0, 1, [[0, "rgba(255,255,255,0.9)"], [0.5, "rgba(223,243,255,0.25)"], [1, "rgba(191,230,255,0.12)"]]);
  G.biolum = rad(0, 0, 0, 0, 0, 1, [[0, "rgba(207,250,255,0.95)"], [0.4, "rgba(95,224,255,0.5)"], [1, "rgba(95,224,255,0)"]]);
  G.pollen = rad(0, 0, 0, 0, 0, 1, [[0, "rgba(255,246,216,0.95)"], [0.5, "rgba(255,231,154,0.5)"], [1, "rgba(255,231,154,0)"]]);
  G.lure = rad(0, 0, 0, 0, 0, 1, [[0, "rgba(255,251,224,1)"], [0.4, "rgba(255,231,154,0.85)"], [1, "rgba(255,210,76,0)"]]);
  G.jelly = rad(0, -6, 0, 0, -6, 42, [[0, "rgba(255,255,255,0.5)"], [0.45, "rgba(159,198,255,0.34)"], [1, "rgba(122,107,255,0.14)"]]);
  G.jhalo = rad(0, 6, 0, 0, 6, 46, [[0, "rgba(191,230,255,0.4)"], [1, "rgba(191,230,255,0)"]]);
  G.crab = lin(0, -16, 0, 16, [[0, "#e8743f"], [0.6, "#c8432c"], [1, "#8a2820"]]);
  G.trunk = lin(-50, 0, 50, 0, [[0, "#3a2616"], [0.5, "#6b4a2a"], [1, "#2a1a0e"]]);
  G.canopy = rad(-20, -20, 0, 0, 0, 110, [[0, "#5fb84e"], [0.6, "#2f8038"], [1, "#1c4a22"]]);
  G.canopy2 = rad(-20, -20, 0, 0, 0, 110, [[0, "#7ec85a"], [0.6, "#418a3a"], [1, "#235a26"]]);
  G.leaf = lin(0, 0, 30, -120, [[0, "#1f6e2e"], [1, "#4cb058"]]);
  G.banana = lin(0, 0, 18, -16, [[0, "#ffe14c"], [1, "#e0a02a"]]);
  G.mk = MK_FUR.map((c) => lin(0, -60, 0, 10, [[0, c[0]], [1, c[1]]]));
  G.floor = lin(0, VH - 170, 0, VH, [[0, "rgba(28,48,22,0)"], [1, "rgba(14,28,10,0.9)"]]);
}

/* ---------- scene model ---------- */
function bladePath(ox, w, hh, lean) { return `M${ox} 0 C ${ox - w} ${-hh * 0.4} ${ox + lean + w} ${-hh * 0.75} ${ox + lean} ${-hh} C ${ox + lean - w} ${-hh * 0.75} ${ox + w} ${-hh * 0.4} ${ox} 0 Z`; }
function makePlant(x, baseW, h, style, accentChance, sway) {
  const parts = [], gi = () => Math.random() < accentChance ? 2 : (Math.random() < 0.5 ? 0 : 1);
  if (style === "broad" || (style === "lush" && Math.random() < 0.32)) {
    const ox = rnd(-baseW, baseW), w = baseW * 1.6, hh = h * 0.82, g = Math.random() < accentChance ? 2 : 1;
    parts.push({ stroke: `M${ox} 0 C ${ox - 3} ${-hh * 0.5} ${ox + 3} ${-hh * 0.8} ${ox} ${-hh}`, g, lw: 4, a: 0.92 });
    for (let k = 1; k <= 3; k++) { const ly = -hh * (0.3 + k * 0.2), side = k % 2 ? 1 : -1, lw = w * (1 - k * 0.12); parts.push({ fill: `M${ox} ${ly} C ${ox + side * lw} ${ly - 6} ${ox + side * lw} ${ly - 28} ${ox + side * 4} ${ly - 34} C ${ox - side * 2} ${ly - 22} ${ox} ${ly - 10} ${ox} ${ly} Z`, g, a: 0.92 }); }
  } else if (style === "sparse") {
    const hh = h * rnd(0.8, 1.1); parts.push({ stroke: `M0 0 C -6 ${-hh * 0.5} 6 ${-hh * 0.8} 0 ${-hh}`, g: 0, lw: 3, a: 0.6 });
    parts.push({ fill: bladePath(rnd(-4, 4), baseW * 0.5, hh * 0.5, rnd(-8, 8)), g: 1, a: 1 });
  } else {
    const n = 3 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) parts.push({ fill: bladePath(rnd(-baseW, baseW), baseW * rnd(0.5, 1), h * rnd(0.7, 1.1), rnd(-26, 26)), g: gi(), a: 1 });
  }
  return { x, parts, sway: sway !== false, phase: rnd(0, TAU), freq: rnd(0.7, 1.3) };
}
function makeFish() {
  const s = scn(), n = DENSITY[SET.density] || 9, lv = live(); fish = [];
  for (let i = 0; i < n; i++) {
    const depth = Math.random();
    fish.push({ sp: s.species[Math.random() * s.species.length | 0], g: s.grads[Math.random() * s.grads.length | 0], x: rnd(0, VW), baseY: rnd(120, VH - 150), y: 0, dir: Math.random() < 0.5 ? 1 : -1, scale: 0.5 + depth * 0.85, op: 0.42 + depth * 0.55, speed: lv.spd * rnd(0.7, 1.3) * (0.6 + depth * 0.7), bobAmp: rnd(10, 26), bobFreq: rnd(0.5, 1.1), phase: rnd(0, TAU), tilt: 0, tailFreq: TAU / (lv.tail * rnd(0.85, 1.2)) });
  }
  fish.sort((a, b) => a.scale - b.scale);
}
function makeCreatures() {
  const s = scn(); creatures = [];
  (s.creatures || []).forEach((kind) => {
    if (kind === "crab") creatures.push({ kind, x: rnd(120, VW - 120), y: VH - rnd(95, 130), dir: Math.random() < 0.5 ? 1 : -1, speed: rnd(14, 26), bob: rnd(0, 7) });
    else { const depth = Math.random(); creatures.push({ kind, x: rnd(120, VW - 120), y: rnd(120, VH - 220), dir: Math.random() < 0.5 ? 1 : -1, speed: rnd(6, 13), scale: 0.6 + depth * 0.7, op: 0.5 + depth * 0.4, vy: rnd(-7, 7), phase: rnd(0, TAU), pulse: TAU / rnd(3.2, 5), back: depth < 0.4 }); }
  });
}
function makeJungle() {
  const n = MONK[SET.density] || 3, lv = SET.liveliness, lb = lv === "bold" ? [4, 10] : lv === "lively" ? [8, 16] : [14, 28];
  monkeys = FAMILY.slice(0, n).map((f, i) => ({ ...f, perch: i, x: PERCHES[i].x, y: PERCHES[i].y, leaping: false, next: rnd(lb[0], lb[1]), lb, phase: rnd(0, TAU), eat: rnd(0, TAU) }));
  const nb = lv === "calm" ? 2 : 3; insects = [];
  for (let i = 0; i < nb; i++) { const tr = TREES[Math.random() * TREES.length | 0]; insects.push({ x: tr.x + rnd(-tr.w * 0.3, tr.w * 0.3), y: rnd(VH - 60, VH - 200), speed: rnd(20, 40), phase: rnd(0, TAU) }); }
}
function buildScene() {
  const s = scn(); buildGrads(); nibbler = null;
  rays = []; for (let i = 0; i < (s.rayN || 5); i++) rays.push({ x: rnd(0.06, 0.94) * VW, w: rnd(s.jungle ? 50 : 60, s.jungle ? 130 : 150), sk: rnd(-10, 10), phase: rnd(0, TAU), freq: TAU / rnd(9, 16), top: s.jungle ? 120 : 0 });
  if (s.jungle) {
    motes = []; for (let i = 0; i < 14; i++) motes.push({ x: rnd(0, VW), y: rnd(120, VH - 120), r: rnd(2, 4), phase: rnd(0, TAU), freq: TAU / rnd(3, 7), g: G.pollen });
    scenery = {
      far: Array.from({ length: 9 }, () => ({ x: rnd(0, VW), y: rnd(-10, 220), rx: rnd(110, 200), ry: rnd(80, 130) })),
      vines: Array.from({ length: 7 }, () => { const x = rnd(0.05, 0.95) * VW, h = rnd(120, 340); return { x, d: `M${x} 60 q ${rnd(-14, 14)} ${h * 0.5} ${rnd(-8, 8)} ${h}`, phase: rnd(0, TAU), freq: TAU / rnd(7, 11) }; }),
      canopy: Array.from({ length: 11 }, (_, i) => ({ x: (i / 10) * VW + rnd(-70, 70), y: rnd(-30, 150), rx: rnd(95, 175), ry: rnd(75, 115), g2: Math.random() < 0.5 })),
    };
    plants = []; for (let i = 0; i < 9; i++) plants.push(makePlant(rnd(0, VW), rnd(30, 52), rnd(150, 280), "blade", 0, i % 2 === 0));
    scenery.leaves = [{ x: -30, y: VH - 20, sc: rnd(1.5, 1.9), rot: rnd(-18, 6), flip: false, phase: rnd(0, TAU) }, { x: VW + 30, y: VH - 30, sc: rnd(1.5, 1.9), rot: rnd(-6, 18), flip: true, phase: rnd(0, TAU) }, { x: rnd(0.3, 0.7) * VW, y: VH + 20, sc: rnd(1.1, 1.4), rot: rnd(-10, 10), flip: Math.random() < 0.5, phase: rnd(0, TAU) }];
    makeJungle();
  } else {
    caustics = []; for (let i = 0; i < 3; i++) caustics.push({ x: rnd(0.2, 0.8) * VW, y: rnd(0.2, 0.6) * VH, r: rnd(260, 420), phase: rnd(0, TAU), freq: TAU / rnd(10, 18) });
    motes = []; for (let i = 0; i < (s.biolum || 0); i++) motes.push({ x: rnd(0, VW), y: rnd(60, VH - 40), r: rnd(2, 5), phase: rnd(0, TAU), freq: TAU / rnd(3, 7), g: G.biolum });
    plants = []; const bn = Math.round(s.plantN * 0.45);
    for (let i = 0; i < bn; i++) plants.push(makePlant(rnd(0, VW), rnd(24, 44), rnd(240, 440), s.plantStyle === "sparse" ? "sparse" : "blade", 0, false));
    for (let i = 0; i < s.plantN - bn; i++) plants.push(makePlant(rnd(0, VW), rnd(32, 58), rnd(280, 540), s.plantStyle, 0.22, true));
    bubbles = []; const bubN = Math.round(({ calm: 3, lively: 5, bold: 7 }[SET.liveliness] || 4) * (s.biolum ? 0.5 : 1));
    for (let i = 0; i < bubN; i++) { const x = rnd(0.08, 0.92) * VW; const m = 3 + (Math.random() * 4 | 0); for (let j = 0; j < m; j++) bubbles.push({ x, r: rnd(2.5, 6), dur: rnd(6, 12), off: Math.random(), wob: rnd(3.5, 5), wobP: rnd(0, TAU) }); }
    makeFish(); makeCreatures();
  }
}

/* ---------- elemental awareness (fish mind the UI) ---------- */
function toDesign(r) { return { x: (r.x - COVER.ox) / COVER.s, y: (r.y - COVER.oy) / COVER.s, w: r.w / COVER.s, h: r.h / COVER.s }; }   // viewport px → design space
function refreshObstacles() {
  boxes = []; clockBox = null;
  if (SET.aware !== "on" || !api || !api.obstacles || scn().jungle) return;
  for (const o of api.obstacles()) { const d = toDesign(o); if (o.tag === "box") boxes.push(d); else if (o.tag === "clock" && !clockBox) clockBox = d; }
}
function applyAvoid(f, dt) {                                                         // steer a fish over/under the omnibox
  let box = null; for (const b of boxes) if (f.x > b.x - 70 && f.x < b.x + b.w + 70) { box = b; break; }
  if (box) {
    if (f.avoidY == null && f.baseY > box.y - 52 && f.baseY < box.y + box.h + 52) f.avoidY = f.baseY < box.y + box.h / 2 ? box.y - 52 : box.y + box.h + 52;
    if (f.avoidY != null) { f.baseY += Math.sign(f.avoidY - f.baseY) * Math.min(Math.abs(f.avoidY - f.baseY), 150 * dt); return; }
  } else f.avoidY = null;
  f.baseY += Math.sin(t * 0.15 + f.phase) * 6 * dt;
}
function nibbleStep(f, dt) {                                                         // a fish drifts up to the clock and pecks at it
  const cx = clockBox.x + clockBox.w / 2, cy = clockBox.y + clockBox.h, n = f.nib;
  if (n.ph === 0) {
    const ty = cy + 32; f.dir = cx > f.x ? 1 : -1;
    f.x += Math.sign(cx - f.x) * Math.min(Math.abs(cx - f.x), f.speed * 1.5 * dt);
    f.baseY += Math.sign(ty - f.baseY) * Math.min(Math.abs(ty - f.baseY), f.speed * 1.5 * dt);
    f.y = f.baseY; f.tilt = -0.12 * f.dir;
    if (Math.abs(cx - f.x) < 28 && Math.abs(ty - f.baseY) < 28) { n.ph = 1; n.timer = rnd(2.2, 4); }
  } else {
    n.timer -= dt; f.dir = cx > f.x ? 1 : -1;
    f.y = cy + 28 - Math.max(0, Math.sin(t * 7)) * 22; f.tilt = -0.32;              // quick darts up at the clock
    if (n.timer <= 0) { f.nib = null; nibbler = null; f.baseY = f.y; }
  }
}
function scheduleNibble(dt) {
  if (SET.aware !== "on" || scn().jungle || !clockBox || nibbler || !fish.length) return;
  nibbleNext -= dt;
  if (nibbleNext <= 0) { nibbler = fish[Math.random() * fish.length | 0]; if (nibbler) nibbler.nib = { ph: 0, timer: 0 }; nibbleNext = rnd(16, 38); }
}

/* ---------- steering (positions only) ---------- */
function step(dt) {
  if (scn().jungle) {
    for (const m of monkeys) {
      if (m.leaping) { m.lt += dt; const p = Math.min(1, m.lt / m.ldur); m.x = m.fx + (m.tx - m.fx) * p; m.y = m.fy + (m.ty - m.fy) * p - Math.sin(p * Math.PI) * (70 + Math.abs(m.tx - m.fx) * 0.12); if (p >= 1) { m.leaping = false; m.x = m.tx; m.y = m.ty; m.perch = m.tp; m.next = rnd(m.lb[0], m.lb[1]); } }
      else if (dt && m.canLeap) { m.next -= dt; if (m.next <= 0) { const opts = PERCHES.map((_, i) => i).filter((i) => i !== m.perch && !monkeys.some((o) => o !== m && o.perch === i)); if (opts.length) { const tp = opts[Math.random() * opts.length | 0]; Object.assign(m, { leaping: true, lt: 0, ldur: rnd(0.7, 1), fx: m.x, fy: m.y, tx: PERCHES[tp].x, ty: PERCHES[tp].y, tp }); } else m.next = rnd(3, 6); } }
    }
    for (const b of insects) { if (dt) { b.y -= b.speed * dt; if (b.y < 130) b.y = VH - 30; } }
    return;
  }
  for (const f of fish) {
    if (f.nib && clockBox) { nibbleStep(f, dt); continue; }                          // off nibbling the clock
    f.nib = null;
    if (dt) {
      f.x += f.dir * f.speed * dt; if (f.x > VW + 80 && f.dir > 0) f.dir = -1; else if (f.x < -80 && f.dir < 0) f.dir = 1;
      if (SET.aware === "on" && boxes.length) applyAvoid(f, dt); else { f.avoidY = null; f.baseY += Math.sin(t * 0.15 + f.phase) * 6 * dt; }
      f.baseY = Math.max(90, Math.min(VH - 120, f.baseY));
    }
    f.y = f.baseY + Math.cos(t * f.bobFreq + f.phase) * f.bobAmp; f.tilt = -Math.sin(t * f.bobFreq + f.phase) * 0.1 * f.dir;
  }
  for (const c of creatures) {
    if (c.kind === "crab") { if (dt) { c.x += c.dir * c.speed * dt; if (c.x > VW - 90 && c.dir > 0) c.dir = -1; else if (c.x < 90 && c.dir < 0) c.dir = 1; } }
    else if (dt) { c.x += c.dir * c.speed * dt; if (c.x > VW + 60 && c.dir > 0) c.dir = -1; else if (c.x < -60 && c.dir < 0) c.dir = 1; c.y += c.vy * dt; if (c.y < 110) c.vy = Math.abs(c.vy); else if (c.y > VH - 200) c.vy = -Math.abs(c.vy); }
  }
}

/* ---------- drawing ---------- */
function fillP(d, style, a) { ctx.globalAlpha = a; ctx.fillStyle = style; ctx.fill(path(d)); }
function strokeP(d, style, lw, a, cap) { ctx.globalAlpha = a; ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.lineCap = cap || "round"; ctx.stroke(path(d)); }
function ell(x, y, rx, ry, style, a) { ctx.globalAlpha = a; ctx.fillStyle = style; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }
function unitRad(x, y, r, g, a) { ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(r, r); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore(); }

function drawPlant(pl) {
  ctx.save(); ctx.translate(pl.x, VH); if (pl.sway) ctx.rotate(Math.sin(t * pl.freq + pl.phase) * 0.06);
  for (const part of pl.parts) { if (part.fill) fillP(part.fill, G.plant[part.g], part.a); else strokeP(part.stroke, G.plant[part.g], part.lw, part.a); }
  ctx.restore();
}
function drawFish(f) {
  const sp = SPECIES[f.sp], g = G.fg[f.g];
  ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.dir * f.scale, f.scale); ctx.rotate(f.tilt);
  ctx.save(); ctx.translate(-24, 0); ctx.rotate(Math.sin(t * f.tailFreq + f.phase) * 0.23); ctx.translate(24, 0); fillP(sp.tail, g, f.op * 0.85); ctx.restore();
  fillP(sp.dorsal, g, f.op * 0.72); fillP(sp.anal, g, f.op * 0.72);
  if (sp.fil) strokeP(sp.fil, g, 2.4, f.op * 0.6);
  fillP(sp.body, g, f.op);
  ell(0, -6, 18, 5.5, "#fff", f.op * 0.13);
  ctx.save(); ctx.translate(sp.pec.length ? 0 : 0, 0); ctx.rotate(Math.sin(t * f.tailFreq * 1.2 + f.phase) * 0.18); fillP(sp.pec, g, f.op * 0.55); ctx.restore();
  if (sp.teeth) strokeP(sp.teeth, "#eef3ff", 1.5, f.op * 0.85);
  ctx.globalAlpha = f.op; ctx.fillStyle = "#0c1622"; ctx.beginPath(); ctx.arc(sp.eye[0], sp.eye[1], 3.1, 0, TAU); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sp.eye[0] + 0.9, sp.eye[1] - 0.9, 1, 0, TAU); ctx.fill();
  if (sp.lure) { strokeP(sp.lure, "#caa84c", 2, f.op * 0.7); const pu = 0.82 + 0.18 * Math.sin(t * 2.4 + f.phase); ctx.save(); ctx.translate(54, -50); unitRad(0, 0, 13, G.lure, f.op * pu); ctx.fillStyle = "#fffbe0"; ctx.globalAlpha = f.op * pu; ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, TAU); ctx.fill(); ctx.restore(); }
  ctx.restore();
}
function drawCrab(c) {
  ctx.save(); ctx.translate(c.x, c.y + Math.abs(Math.sin(t * 3)) * c.bob); ctx.scale(c.dir, 1);
  ctx.translate(0, Math.sin(t * 6) * -1);                                                            // scuttle bob
  for (let side = -1; side <= 1; side += 2) for (let k = 0; k < 3; k++) { const lx = side * (14 + k * 9), ly = -6 + k * 3, sw = Math.sin(t * 9 + k * 1.2 + (side < 0 ? 1.5 : 0)) * 0.12; ctx.save(); ctx.translate(lx, ly); ctx.rotate(sw); strokeP(`M0 0 q ${side * 14} 4 ${side * 20} 16`, "#a8331f", 3.4, 1); ctx.restore(); }
  for (let side = -1; side <= 1; side += 2) { const cw = Math.sin(t * 4 + (side < 0 ? 0 : 1.2)) * 0.09; ctx.save(); ctx.translate(side * 22, 2); ctx.rotate(cw); ctx.translate(-side * 22, -2); strokeP(`M${side * 20} 2 q ${side * 16} -2 ${side * 22} -12`, G.crab, 5, 1); fillP(`M${side * 40} -12 q ${side * 8} -6 ${side * 2} -12 q ${side * -6} 4 ${side * -2} 12 Z`, G.crab, 1); strokeP(`M${side * 40} -12 q ${side * 9} 1 ${side * 13} -7`, G.crab, 4, 1); ctx.restore(); }
  ell(0, 0, 26, 16, G.crab, 1); strokeP("M-26 -2 Q0 -18 26 -2", "#fff", 2, 0.18);
  strokeP("M-8 -13 L-10 -22", "#a8331f", 2.4, 1); strokeP("M8 -13 L10 -22", "#a8331f", 2.4, 1);
  ctx.fillStyle = "#2a0e0a"; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(-10, -23, 3, 0, TAU); ctx.arc(10, -23, 3, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawJelly(c) {
  const yb = c.y + Math.sin(t * 0.8 + c.phase) * 10, pulse = Math.sin(t * c.pulse + c.phase);
  ctx.save(); ctx.translate(c.x, yb); ctx.scale(c.scale, c.scale); ctx.globalAlpha = c.op;
  unitRad(0, 6, 46, G.jhalo, c.op);
  ctx.save(); ctx.scale(1, 1.06 - pulse * 0.08); for (let k = -3; k <= 3; k++) strokeP(`M${k * 7} 18 q ${k * 2} 26 ${k * 1.5} 54`, rgba("#9fc6ff", 0.6), k % 2 ? 2.4 : 3.4, c.op * 0.7); for (let k = -1; k <= 1; k++) strokeP(`M${k * 9} 16 q ${k * 6} 20 ${k * 2} 40 q ${k * -6} 8 ${k * 1} 18`, rgba("#9fc6ff", 0.5), 5, c.op * 0.45); ctx.restore();
  ctx.save(); ctx.translate(0, -8); ctx.scale(1 + pulse * 0.08, 1 - pulse * 0.08); ctx.translate(0, 8); fillP("M-30 12 C -34 -28 34 -28 30 12 C 18 22 -18 22 -30 12 Z", G.jelly, c.op); strokeP("M-30 12 C -22 18 22 18 30 12", "#dffbff", 2, c.op * 0.5); ell(-8, -8, 9, 13, "#fff", c.op * 0.25); ctx.restore();
  ctx.restore();
}
function drawMonkey(m) {
  const fur = G.mk[m.fur]; ctx.save(); ctx.translate(m.x, m.y); ctx.scale(m.scale, m.scale);
  ctx.translate(0, Math.sin(t * 1.85 + m.phase) * -2); ctx.rotate(Math.sin(t * 1.85 + m.phase) * 0.021);   // idle
  ctx.globalAlpha = 1;
  fillP("M9 -12 C 34 -8 33 -36 21 -42 C 29 -34 25 -18 7 -18 Z", fur, 1);                                 // tail
  ell(-11, -7, 7, 9, fur, 1); ell(11, -7, 7, 9, fur, 1);                                                 // thighs
  fillP("M-15 -11 C -19 -42 19 -42 15 -11 C 8 -3 -8 -3 -15 -11 Z", fur, 1);                              // body
  ell(0, -19, 8.5, 12, m.belly, 1);                                                                       // belly
  strokeP("M-13 -33 C -24 -29 -25 -15 -16 -11", fur, 7, 1); strokeP("M13 -33 C 22 -31 25 -23 19 -16", fur, 7, 1);
  ctx.fillStyle = fur; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(0, -47, 15, 0, TAU); ctx.fill();    // head
  ell(-15, -48, 6, 6, fur, 1); ell(15, -48, 6, 6, fur, 1); ell(-15, -48, 3, 3, m.belly, 1); ell(15, -48, 3, 3, m.belly, 1);
  fillP("M0 -56 C -12 -56 -12 -38 0 -37 C 12 -38 12 -56 0 -56 Z", m.face, 1); ell(0, -43, 7, 5.2, m.face, 1);
  ctx.fillStyle = "#190f08"; ctx.beginPath(); ctx.arc(-5, -48, 2.3, 0, TAU); ctx.arc(5, -48, 2.3, 0, TAU); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-4.2, -48.8, 0.7, 0, TAU); ctx.arc(5.8, -48.8, 0.7, 0, TAU); ctx.fill();
  ell(0, -44, 1.6, 1, "#3a2414", 1); strokeP("M-3.5 -41 Q0 -38.5 3.5 -41", "#5a3a1e", 1.2, 1);
  if (m.banana) { const bite = Math.max(0, Math.sin(t * 2.2 + m.eat)); ctx.save(); ctx.translate(12, -38); ctx.translate(-11 * bite, -3 * bite); ctx.rotate(-0.52 * bite); fillP("M0 0 Q 14 -3 17 -16 Q 13 0 -1 5 Z", G.banana, 1); strokeP("M0 0 Q 14 -3 17 -16", "#b07f1e", 0.7, 1); ctx.restore(); }
  if (m.acc === "bow") { ctx.save(); ctx.translate(-13, -58); fillP("M0 0 C -4 -7 -15 -7 -15 0 C -15 7 -4 7 0 0 Z", "#ff6f9e", 1); fillP("M0 0 C 4 -7 15 -7 15 0 C 15 7 4 7 0 0 Z", "#ff6f9e", 1); ctx.fillStyle = "#e0457e"; ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, TAU); ctx.fill(); ctx.restore(); }
  else if (m.acc === "glasses") { ctx.save(); ctx.translate(0, -47); ctx.fillStyle = "rgba(170,215,255,0.22)"; ctx.beginPath(); ctx.arc(-5, 0, 6, 0, TAU); ctx.arc(5, 0, 6, 0, TAU); ctx.fill(); ctx.strokeStyle = "#241a12"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(-5, 0, 6, 0, TAU); ctx.moveTo(11, 0); ctx.arc(5, 0, 6, 0, TAU); ctx.moveTo(-0.6, 0); ctx.lineTo(0.6, 0); ctx.stroke(); ctx.restore(); }
  else if (m.acc === "flower") { ctx.save(); ctx.translate(-13, -57); ctx.fillStyle = "#ffcf4c"; for (const [dx, dy] of [[-3.5, 0], [3.5, 0], [0, -3.5], [0, 3.5]]) { ctx.beginPath(); ctx.arc(dx, dy, 2.6, 0, TAU); ctx.fill(); } ctx.fillStyle = "#e0682a"; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, TAU); ctx.fill(); ctx.restore(); }
  ctx.restore();
}
function drawBug(b) {
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.save(); ctx.translate(0, Math.sin(t * 24 + b.phase) * 0.6); strokeP("M-4 -3 l-6 -3 M-4 0 l-7 0 M-4 3 l-6 3 M4 -3 l6 -3 M4 0 l7 0 M4 3 l6 3", "#1a1208", 1.4, 1); ctx.restore();
  ell(0, 0, 5, 8, "#241810", 1); ell(0, -3, 3.5, 4, "#3a2a16", 1); strokeP("M-2 -8 l-2 -4 M2 -8 l2 -4", "#1a1208", 1, 1);
  ctx.restore();
}
function drawLeaf(l) {
  ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(Math.sin(t * 0.5 + l.phase) * 0.05); ctx.scale(l.flip ? -l.sc : l.sc, l.sc); ctx.rotate(l.rot * Math.PI / 180);
  fillP("M0 0 C -40 -20 -60 -90 -10 -150 C 40 -90 40 -20 0 0 Z", G.leaf, 1);
  strokeP("M-8 -8 C -18 -50 -14 -100 -10 -140", "#1c5a26", 2.5, 0.5);
  strokeP("M-10 -50 l-16 -10 M-11 -80 l-14 -14 M-9 -40 l14 -6 M-10 -70 l13 -10", "#1c5a26", 1.6, 0.4);
  ctx.restore();
}
function drawRays() {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = G.ray;
  for (const r of rays) { const o = Math.sin(t * r.freq + r.phase), dx = o * 26; ctx.globalAlpha = 0.34 + 0.26 * (o * 0.5 + 0.5); ctx.beginPath(); ctx.moveTo(r.x + dx, r.top); ctx.lineTo(r.x + r.w + dx, r.top); ctx.lineTo(r.x + r.w + r.sk + (r.top ? 90 : 120) + dx, VH); ctx.lineTo(r.x + r.sk - (r.top ? 30 : 40) + dx, VH); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function drawMotes() { ctx.save(); ctx.globalCompositeOperation = "lighter"; for (const m of motes) unitRad(m.x, m.y, m.r, m.g, 0.25 + 0.7 * (Math.sin(t * m.freq + m.phase) * 0.5 + 0.5)); ctx.restore(); }
function drawBubbles() { for (const b of bubbles) { const prog = (t / b.dur + b.off) % 1, y = VH - prog * (VH + 40), x = b.x + Math.sin(t * (TAU / b.wob) + b.wobP) * 5, a = prog < 0.1 ? prog * 8.5 : prog > 0.88 ? (1 - prog) * 5 : 0.7; unitRad(x, y, b.r, G.bubble, a); } }

function drawFrame() {
  ctx.setTransform(COVER.dpr * COVER.s, 0, 0, COVER.dpr * COVER.s, COVER.ox * COVER.dpr, COVER.oy * COVER.dpr);
  const s = scn();
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  ctx.fillStyle = G.water; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = G.glow; ctx.fillRect(0, 0, VW, VH * 0.5);
  drawRays();
  if (s.jungle) {
    ctx.globalAlpha = 0.55; for (const e of scenery.far) ell(e.x, e.y, e.rx, e.ry, G.canopy, 0.55);
    for (const tr of TREES) {                                                                            // trunks + branches
      const x = tr.x, w = tr.w; ctx.save(); ctx.translate(x, 0);
      fillP(`M${-w / 2} ${VH} C ${-w * 0.42} 560 ${-w * 0.3} 320 ${-w * 0.18} 150 L ${w * 0.18} 150 C ${w * 0.3} 320 ${w * 0.42} 560 ${w / 2} ${VH} Z`, G.trunk, 1);
      strokeP(`M-4 ${VH} C -2 600 -8 360 -5 190`, "#2a1a0e", 3, 0.5); ctx.restore();
      PERCHES.filter((p) => p.t === TREES.indexOf(tr)).forEach((p) => { const dir = p.x > x ? 1 : -1; strokeP(`M${x} ${p.y + 14} Q ${(x + p.x) / 2} ${p.y - 16} ${p.x + dir * 14} ${p.y + 2}`, G.trunk, 16, 1); ctx.save(); ctx.translate(p.x + dir * 30, p.y - 8); ctx.fillStyle = G.canopy2; ctx.globalAlpha = 0.96; ctx.beginPath(); ctx.ellipse(0, 0, 46, 30, 0, 0, TAU); ctx.fill(); ctx.restore(); });
    }
    for (const v of scenery.vines) { ctx.save(); ctx.translate(v.x, 60); ctx.rotate(Math.sin(t * v.freq + v.phase) * 0.028); ctx.translate(-v.x, -60); strokeP(v.d, "#2c6e34", 2.5, 0.55); ctx.restore(); }
    drawMotes();
    for (const m of monkeys) drawMonkey(m);
    for (const b of insects) drawBug(b);
    for (const c of scenery.canopy) { ctx.save(); ctx.translate(c.x, c.y); ctx.fillStyle = c.g2 ? G.canopy2 : G.canopy; ctx.globalAlpha = 1; ctx.beginPath(); ctx.ellipse(0, 0, c.rx, c.ry, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = G.floor; ctx.globalAlpha = 1; ctx.fillRect(0, VH - 170, VW, 170);
    for (const pl of plants) drawPlant(pl);
    for (const l of scenery.leaves) drawLeaf(l);
  } else {
    ctx.save(); ctx.globalCompositeOperation = "lighter"; for (const c of caustics) unitRad(c.x + Math.sin(t * c.freq + c.phase) * 40, c.y, c.r, G.bubble, 0.06 + 0.05 * (Math.sin(t * c.freq * 1.3 + c.phase) * 0.5 + 0.5)); ctx.restore();
    if (motes.length) drawMotes();
    for (const pl of plants) if (!pl.sway) drawPlant(pl);                                                 // background plants
    for (const c of creatures) if (c.back) drawJelly(c);
    for (const f of fish) drawFish(f);
    for (const c of creatures) if (!c.back) { c.kind === "crab" ? drawCrab(c) : drawJelly(c); }
    for (const pl of plants) if (pl.sway) drawPlant(pl);                                                  // foreground plants
    drawBubbles();
  }
  ctx.fillStyle = G.vig; ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.fillRect(0, 0, VW, VH);
}

/* ---------- loop ---------- */
function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), w = layer.clientWidth || innerWidth, h = layer.clientHeight || innerHeight;
  canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
  COVER = { dpr, s: Math.max(w / VW, h / VH), ox: (w - VW * Math.max(w / VW, h / VH)) / 2, oy: (h - VH * Math.max(w / VW, h / VH)) / 2 };
}
function frame(ts) {
  if (!running) return;
  const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; t += dt;
  if (SET.aware === "on" && !scn().jungle) { obsAcc += dt; if (obsAcc > 0.4) { obsAcc = 0; refreshObstacles(); } scheduleNibble(dt); }   // the box can move (plugins, typing)
  step(dt); drawFrame(); raf = requestAnimationFrame(frame);
}
function start() { if (running) return; step(0); drawFrame(); if (api && api.reducedMotion()) return; running = true; last = 0; raf = requestAnimationFrame(frame); }   // paint one frame synchronously so there's content before rAF ticks
function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
function onVis() { if (document.hidden) stop(); else start(); }
function onResize() { fit(); refreshObstacles(); drawFrame(); }
function rebuild() { reportContrast(); buildScene(); fit(); refreshObstacles(); drawFrame(); }

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
  const themeRow = SET.scene === "tank" ? `<div class="ftp-lab">Colour</div><div class="ftp-sws">${Object.entries(TANK_THEMES).map(([id, th]) => `<button type="button" class="ftp-sw${SET.tankTheme === id ? " on" : ""}" data-theme="${id}" title="${th.name}" style="background:linear-gradient(135deg, ${th.water[0]}, ${th.water[2]})"></button>`).join("")}</div>` : "";
  const awareRow = SET.scene !== "jungle" ? `<div class="ftp-lab">Aware <span style="text-transform:none;letter-spacing:0;opacity:0.7">· fish mind the box &amp; nibble the clock</span></div><div class="ftp-seg">${seg("aware", { off: "Off", on: "On" })}</div>` : "";
  root.innerHTML = `<div class="ftp-lab">Scene</div><div class="ftp-seg">${seg("scene", SCENES)}</div>${themeRow}
    <div class="ftp-lab">${SET.scene === "jungle" ? "Monkeys" : "Fish"}</div><div class="ftp-seg">${seg("density", { few: "Few", some: "Some", many: "Many" })}</div>
    <div class="ftp-lab">Liveliness</div><div class="ftp-seg">${seg("liveliness", { calm: "Calm", lively: "Lively", bold: "Bold" })}</div>${awareRow}
    <div class="ftp-lab">Text</div><div class="ftp-seg">${seg("text", { auto: "Auto", light: "Light", dark: "Dark" })}</div>`
    + (api && api.reducedMotion() ? `<div class="ftp-note">Your system has “reduce motion” on, so the scene stays still.</div>` : ``);
  root.onclick = (e) => {
    const a = e.target.closest("[data-scene],[data-theme],[data-density],[data-liveliness],[data-text],[data-aware]"); if (!a) return;
    if (a.dataset.aware != null) { SET.aware = a.dataset.aware; persist(); if (SET.aware === "on") refreshObstacles(); else { fish.forEach((f) => { f.avoidY = null; f.nib = null; }); nibbler = null; boxes = []; clockBox = null; } return settings(root, api); }   // no rebuild — keep the fish where they are
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
    api = hostApi; layer = layerEl; G = {}; P = new Map();
    canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute; inset:0; width:100%; height:100%; display:block;";
    layer.appendChild(canvas); ctx = canvas.getContext("2d");
    fit(); reportContrast(); buildScene(); refreshObstacles(); start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
  },
  settings,
  unmount() {
    stop();
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVis);
    const p = document.getElementById("ftp-scss"); if (p) p.remove();
    if (canvas) canvas.remove();
    api = layer = canvas = ctx = null; fish = creatures = monkeys = insects = plants = bubbles = rays = motes = caustics = boxes = []; scenery = clockBox = nibbler = null; t = 0;
  },
};
