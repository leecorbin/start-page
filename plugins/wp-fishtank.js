/* start-page wallpaper plugin: Fish tank (animated SVG aquarium)
   A calm planted tank — gradient multicolour fish at varying depths, swaying kelp,
   rising bubbles, drifting sun shafts and a caustic shimmer. All SVG: crisp at any
   size, gradient bodies, filters for light & depth. CSS drives the repetitive motion
   (tails, fins, plants, rays, bubbles); JS only steers the fish. Pauses when hidden,
   honours prefers-reduced-motion. Part of start-page (MIT). */

const FKEY = "startpage:wp-fishtank";
const DEFAULTS = { density: "some", liveliness: "calm", scene: "reef", text: "auto" };
let SET = (() => { try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(FKEY)) || {}); } catch { return { ...DEFAULTS }; } })();
function persist() { try { localStorage.setItem(FKEY, JSON.stringify(SET)); } catch {} }

const VW = 1600, VH = 900;
const SCENES = {
  reef:   { name: "Reef",   water: ["#1f6f86", "#0e4760", "#06243a"], ray: "#bfeaff", plant: ["#2f9e63", "#1c6e46", "#15543a"], accent: "#7fd0b0" },
  lagoon: { name: "Lagoon", water: ["#2a8f8a", "#136a63", "#063b3a"], ray: "#cffaf0", plant: ["#49b06a", "#2c8050", "#1c5a3c"], accent: "#9ff0d4" },
  deep:   { name: "Deep",   water: ["#16415f", "#0b2742", "#03101f"], ray: "#9fc8ff", plant: ["#2a7e6e", "#1a5550", "#123c3a"], accent: "#5fa9d0" },
};
const FISH_GRADS = [
  ["#ff9a4c", "#ff5d7e", "#ffd24c"], ["#2fd6c4", "#2f86d6", "#7a5cff"], ["#ff5db0", "#ff8a4c", "#ffd24c"],
  ["#5cffb0", "#2fb5a0", "#2f86b5"], ["#b06bff", "#ff6bd0", "#6b9bff"], ["#ffd24c", "#ff8a4c", "#ff5d6e"],
  ["#d8ecff", "#9fc4e6", "#6f93b6"], ["#4ce0ff", "#3a8fe0", "#6a4cff"],
];
const DENSITY = { few: 5, some: 9, many: 15 };
const LIVE = { calm: { spd: 16, tail: 1.7 }, lively: { spd: 30, tail: 1.05 }, bold: { spd: 48, tail: 0.62 } };

/* fish silhouettes, drawn facing right, centred on the origin (~80 long) */
const SPECIES = [
  { // round — tang / angelfish
    body: "M34 0 C 26 -21, -6 -25, -24 -12 C -31 -6, -31 6, -24 12 C -6 25, 26 21, 34 0 Z",
    tail: "M-22 -7 L-47 -22 L-39 0 L-47 22 L-22 7 Z",
    dorsal: "M4 -19 C -6 -32, -19 -27, -23 -12 L 6 -15 Z",
    anal: "M2 19 C -6 30, -17 26, -21 13 L 4 15 Z",
    pec: "M8 7 C 2 23, -12 21, -15 11 Z",
    eye: [21, -5],
  },
  { // slim — tetra / torpedo
    body: "M42 0 C 30 -11, -12 -14, -30 -6 C -36 -3, -36 3, -30 6 C -12 14, 30 11, 42 0 Z",
    tail: "M-27 -5 L-50 -16 L-40 0 L-50 16 L-27 5 Z",
    dorsal: "M6 -12 C -2 -22, -16 -19, -22 -9 L 4 -10 Z",
    anal: "M2 12 C -4 20, -16 18, -20 10 L 2 10 Z",
    pec: "M12 5 C 6 18, -6 17, -10 9 Z",
    eye: [28, -3],
  },
];

let api = null, layer = null, svg = null, styleEl = null, raf = 0, running = false, last = 0, t = 0;
let fish = [];

function scene() { return SCENES[SET.scene] || SCENES.reef; }
function live() { return LIVE[SET.liveliness] || LIVE.calm; }
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];

const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lumOf = (h) => { const [r, g, b] = hexRgb(h); return 0.299 * r + 0.587 * g + 0.114 * b; };
function reportContrast() {
  if (!api) return;
  if (SET.text === "light") return api.setContrast(false);
  if (SET.text === "dark") return api.setContrast(true);
  const w = scene().water;
  api.setContrast(lumOf(w[0]) * 0.55 + lumOf(w[1]) * 0.45 > 150);   // content sits over the upper water
}

/* ---------- scene SVG ---------- */
function defs() {
  const s = scene();
  let g = "";
  g += `<linearGradient id="ft-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.water[0]}"/><stop offset="0.55" stop-color="${s.water[1]}"/><stop offset="1" stop-color="${s.water[2]}"/></linearGradient>`;
  g += `<linearGradient id="ft-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.ray}" stop-opacity="0.5"/><stop offset="1" stop-color="${s.ray}" stop-opacity="0"/></linearGradient>`;
  g += `<radialGradient id="ft-glow" cx="0.5" cy="0" r="0.9"><stop offset="0" stop-color="${s.ray}" stop-opacity="0.35"/><stop offset="1" stop-color="${s.ray}" stop-opacity="0"/></radialGradient>`;
  g += `<radialGradient id="ft-bubble" cx="0.36" cy="0.32" r="0.7"><stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="0.5" stop-color="#dff3ff" stop-opacity="0.25"/><stop offset="1" stop-color="#bfe6ff" stop-opacity="0.12"/></radialGradient>`;
  g += `<radialGradient id="ft-vignette" cx="0.5" cy="0.42" r="0.78"><stop offset="0.55" stop-color="#02141f" stop-opacity="0"/><stop offset="1" stop-color="#02101a" stop-opacity="0.5"/></radialGradient>`;
  s.plant.forEach((c, i) => { const d = hexRgb(c); g += `<linearGradient id="ft-plant${i}" x1="0" y1="1" x2="0.2" y2="0"><stop offset="0" stop-color="rgb(${d[0] * 0.6 | 0},${d[1] * 0.6 | 0},${d[2] * 0.6 | 0})"/><stop offset="1" stop-color="${c}"/></linearGradient>`; });
  FISH_GRADS.forEach((cols, i) => { g += `<linearGradient id="ft-fg${i}" x1="0" y1="0.1" x2="1" y2="0.9"><stop offset="0" stop-color="${cols[0]}"/><stop offset="0.5" stop-color="${cols[1]}"/><stop offset="1" stop-color="${cols[2]}"/></linearGradient>`; });
  g += `<filter id="ft-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2"/></filter>`;
  g += `<filter id="ft-caustic"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.022" numOctaves="2" seed="7" stitchTiles="stitch" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.1 -0.62"/></filter>`;
  return `<defs>${g}</defs>`;
}
function kelp(x, baseW, h, grad, cls) {
  // a cluster of a few tapering blades rooted at (x, VH)
  let blades = "";
  const n = 3 + (Math.random() * 2 | 0);
  for (let i = 0; i < n; i++) {
    const w = baseW * rnd(0.5, 1), hh = h * rnd(0.7, 1.1), lean = rnd(-26, 26), ox = rnd(-baseW, baseW);
    blades += `<path d="M${ox} 0 C ${ox - w} ${-hh * 0.4}, ${ox + lean + w} ${-hh * 0.75}, ${ox + lean} ${-hh} C ${ox + lean - w} ${-hh * 0.75}, ${ox + w} ${-hh * 0.4}, ${ox} 0 Z" fill="url(#${grad})"/>`;
  }
  // outer group positions at the base; inner group does the sway (so the rotation keyframe doesn't clobber the position)
  return `<g style="transform:translate(${x}px,${VH}px)"><g class="${cls}" style="animation-duration:${rnd(5, 9).toFixed(1)}s; animation-delay:${rnd(-4, 0).toFixed(1)}s">${blades}</g></g>`;
}
function bubbleCol(x) {
  let b = "";
  const n = 3 + (Math.random() * 4 | 0);
  for (let i = 0; i < n; i++) {
    const r = rnd(2.5, 6), dur = rnd(6, 12), delay = rnd(-12, 0), wob = rnd(3.5, 5).toFixed(1);
    b += `<g class="ft-brise" style="animation-duration:${dur.toFixed(1)}s; animation-delay:${delay.toFixed(1)}s"><g class="ft-bwob" style="animation-duration:${wob}s"><circle r="${r.toFixed(1)}" fill="url(#ft-bubble)"/></g></g>`;
  }
  return `<g class="ft-bcol" style="transform:translate(${x}px,${VH}px)">${b}</g>`;
}
function fishMarkup(f) {
  const sp = SPECIES[f.sp];
  const eye = `<circle cx="${sp.eye[0]}" cy="${sp.eye[1]}" r="3.1" fill="#0c1622"/><circle cx="${sp.eye[0] + 0.9}" cy="${sp.eye[1] - 0.9}" r="1" fill="#fff"/>`;
  return `<g class="ft-fish" data-i="${f.i}" style="filter:${f.blur ? "url(#ft-soft)" : "none"};opacity:${f.op}">
    <g class="ft-tail" style="animation-duration:${f.tailDur}s"><path d="${sp.tail}" fill="url(#ft-fg${f.g})" opacity="0.85"/></g>
    <path d="${sp.dorsal}" fill="url(#ft-fg${f.g})" opacity="0.7"/><path d="${sp.anal}" fill="url(#ft-fg${f.g})" opacity="0.7"/>
    <path d="${sp.body}" fill="url(#ft-fg${f.g})"/>
    <ellipse cx="2" cy="-6" rx="20" ry="6" fill="#ffffff" opacity="0.14"/>
    <g class="ft-pec" style="animation-duration:${(f.tailDur * 0.8).toFixed(2)}s"><path d="${sp.pec}" fill="url(#ft-fg${f.g})" opacity="0.55"/></g>
    ${eye}
  </g>`;
}
function makeFish() {
  const n = DENSITY[SET.density] || DENSITY.some, lv = live();
  fish = [];
  for (let i = 0; i < n; i++) {
    const depth = Math.random();                       // 0 far → 1 near
    const scale = 0.5 + depth * 0.85, op = 0.55 + depth * 0.45;
    fish.push({
      i, sp: (Math.random() * SPECIES.length) | 0, g: (Math.random() * FISH_GRADS.length) | 0,
      x: rnd(0, VW), baseY: rnd(120, VH - 140), y: 0, dir: Math.random() < 0.5 ? 1 : -1,
      scale, op, blur: depth < 0.34, speed: lv.spd * rnd(0.7, 1.3) * (0.6 + depth * 0.7),
      bobAmp: rnd(10, 26), bobFreq: rnd(0.5, 1.1), phase: rnd(0, 7), tilt: 0,
      tailDur: (lv.tail * rnd(0.85, 1.2)).toFixed(2),
    });
  }
  fish.sort((a, b) => a.scale - b.scale);              // far fish drawn first
}
function buildScene() {
  const s = scene();
  let html = defs();
  html += `<rect width="${VW}" height="${VH}" fill="url(#ft-water)"/>`;
  html += `<rect width="${VW}" height="${VH * 0.5}" fill="url(#ft-glow)"/>`;
  // sun shafts
  let rays = "";
  for (let i = 0; i < 5; i++) { const x = rnd(0.05, 0.95) * VW, w = rnd(60, 150), sk = rnd(-10, 10); rays += `<g class="ft-ray" style="animation-duration:${rnd(9, 16).toFixed(1)}s; animation-delay:${rnd(-8, 0).toFixed(1)}s"><polygon points="${x},0 ${x + w},0 ${x + w + sk + 120},${VH} ${x + sk - 40},${VH}" fill="url(#ft-ray)"/></g>`; }
  html += `<g class="ft-rays" style="mix-blend-mode:screen">${rays}</g>`;
  html += `<rect class="ft-caustic" width="${VW}" height="${VH}" filter="url(#ft-caustic)" style="mix-blend-mode:screen" opacity="0.5"/>`;
  // background kelp (blurred, darker)
  let backPlants = ""; for (let i = 0; i < 5; i++) backPlants += kelp(rnd(0, VW), rnd(26, 46), rnd(260, 460), "ft-plant2", "ft-plant");
  html += `<g style="filter:url(#ft-soft);opacity:0.7">${backPlants}</g>`;
  html += `<g class="ft-fishlayer"></g>`;               // fish injected here
  // foreground kelp
  let frontPlants = ""; for (let i = 0; i < 5; i++) frontPlants += kelp(rnd(0, VW), rnd(34, 60), rnd(300, 560), "ft-plant" + (Math.random() < 0.85 ? 0 : 1), "ft-plant");
  html += `<g>${frontPlants}</g>`;
  // bubbles rising from a few spots
  let bub = ""; for (let i = 0; i < 6; i++) bub += bubbleCol(rnd(0.08, 0.92) * VW);
  html += `<g class="ft-bubbles">${bub}</g>`;
  html += `<rect width="${VW}" height="${VH}" fill="url(#ft-vignette)" pointer-events="none"/>`;
  svg.innerHTML = html;
  // inject fish
  makeFish();
  svg.querySelector(".ft-fishlayer").innerHTML = fish.map(fishMarkup).join("");
  fish.forEach((f) => { f.el = svg.querySelector(`.ft-fish[data-i="${f.i}"]`); });
  placeFish(0);
}

/* ---------- animation (fish steering only) ---------- */
function placeFish(dt) {
  for (const f of fish) {
    if (dt) {
      f.x += f.dir * f.speed * dt;
      if (f.x > VW + 70 && f.dir > 0) f.dir = -1;
      else if (f.x < -70 && f.dir < 0) f.dir = 1;
      f.baseY += Math.sin(t * 0.15 + f.phase) * 6 * dt;
      f.baseY = Math.max(90, Math.min(VH - 110, f.baseY));
    }
    const dy = Math.cos(t * f.bobFreq + f.phase) * f.bobAmp;
    f.y = f.baseY + dy;
    f.tilt = -Math.sin(t * f.bobFreq + f.phase) * 6 * f.dir;
    if (f.el) f.el.setAttribute("transform", `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) scale(${(f.dir * f.scale).toFixed(3)} ${f.scale.toFixed(3)}) rotate(${f.tilt.toFixed(1)})`);
  }
}
function frame(ts) {
  if (!running) return;
  const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; t += dt;
  placeFish(dt);
  raf = requestAnimationFrame(frame);
}
function start() { if (running) return; if (api && api.reducedMotion()) { placeFish(0); return; } running = true; last = 0; raf = requestAnimationFrame(frame); }
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
.ft-plant { transform-box: fill-box; transform-origin: 50% 100%; animation: ft-sway 7s ease-in-out infinite; }
@keyframes ft-sway { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3.5deg); } }
.ft-ray { animation: ft-raymove 12s ease-in-out infinite; transform-box: view-box; }
@keyframes ft-raymove { 0%,100% { transform: translateX(-26px); opacity: 0.55; } 50% { transform: translateX(26px); opacity: 0.95; } }
.ft-caustic { animation: ft-caus 18s ease-in-out infinite; transform-box: view-box; transform-origin: 50% 50%; }
@keyframes ft-caus { 0%,100% { transform: translate(0,0) scale(1.05); opacity: 0.4; } 50% { transform: translate(40px,18px) scale(1.12); opacity: 0.6; } }
.ft-brise { animation: ft-rise linear infinite; }
@keyframes ft-rise { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 0.85; } 88% { opacity: 0.6; } 100% { transform: translateY(-${VH + 40}px); opacity: 0; } }
.ft-bwob { animation: ft-wob ease-in-out infinite alternate; }
@keyframes ft-wob { from { transform: translateX(-5px); } to { transform: translateX(5px); } }
.ft-still .ft-tail, .ft-still .ft-pec, .ft-still .ft-plant, .ft-still .ft-ray, .ft-still .ft-caustic, .ft-still .ft-brise, .ft-still .ft-bwob { animation: none; }
.ft-paused * { animation-play-state: paused !important; }
`;
function ensureCss() {
  if (document.getElementById("ft-css")) { const e = document.getElementById("ft-css"); e.textContent = SCSS; return; }
  const e = document.createElement("style"); e.id = "ft-css"; e.textContent = SCSS; document.head.appendChild(e);
}

/* ---------- settings ---------- */
const PSCSS = `
.ftp-lab { font-size: 0.6rem; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted, rgba(244,246,251,0.6)); margin: 0.55rem 0 0.35rem; }
.ftp-lab:first-child { margin-top: 0; }
.ftp-seg { display: flex; flex-wrap: wrap; background: rgba(255,255,255,0.06); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 8px; padding: 2px; gap: 2px; }
.ftp-seg button { flex: 1 0 auto; border: none; background: none; color: var(--muted, rgba(244,246,251,0.6)); font: inherit; font-size: 0.74rem; padding: 0.22rem 0.4rem; border-radius: 6px; cursor: pointer; }
.ftp-seg button.on { background: rgba(255,255,255,0.18); color: var(--fg, #f4f6fb); }
.ftp-note { margin-top: 0.5rem; font-size: 0.74rem; color: var(--muted, rgba(244,246,251,0.55)); line-height: 1.4; }
`;
function settings(root, hostApi) {
  api = hostApi || api;
  if (!document.getElementById("ftp-scss")) { const s = document.createElement("style"); s.id = "ftp-scss"; s.textContent = PSCSS; document.head.appendChild(s); }
  const seg = (key, map) => Object.entries(map).map(([id, v]) => `<button type="button" data-${key}="${id}" class="${SET[key] === id ? "on" : ""}">${v.name || v}</button>`).join("");
  root.innerHTML = `<div class="ftp-lab">Scene</div><div class="ftp-seg">${seg("scene", SCENES)}</div>
    <div class="ftp-lab">Fish</div><div class="ftp-seg">${seg("density", { few: "Few", some: "Some", many: "Many" })}</div>
    <div class="ftp-lab">Liveliness</div><div class="ftp-seg">${seg("liveliness", { calm: "Calm", lively: "Lively", bold: "Bold" })}</div>
    <div class="ftp-lab">Text</div><div class="ftp-seg">${seg("text", { auto: "Auto", light: "Light", dark: "Dark" })}</div>`
    + (api && api.reducedMotion() ? `<div class="ftp-note">Your system has “reduce motion” on, so the tank stays still.</div>` : ``);
  root.onclick = (e) => {
    const a = e.target.closest("[data-scene],[data-density],[data-liveliness],[data-text]"); if (!a) return;
    if (a.dataset.scene != null) SET.scene = a.dataset.scene;
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
    const c = document.getElementById("ft-css"); if (c) c.remove();
    const p = document.getElementById("ftp-scss"); if (p) p.remove();
    if (svg) svg.remove();
    api = layer = svg = null; fish = []; t = 0;
  },
};
