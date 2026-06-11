/* start-page wallpaper plugin: Lava lamp (animated mesh-gradient background)
   A living alternative to a flat solid colour — slow, ambient colour blobs drifting
   on a dark base. Rendered at low resolution and CSS-blurred for a soft, cheap
   "lava"/mesh look; pauses when the tab is hidden and respects prefers-reduced-motion.
   Customise via the sliders icon over the wallpaper. Part of start-page (MIT). */

const LKEY = "startpage:wp-lava";
const PALETTES = {
  aurora: { name: "Aurora", base: "#091020", cols: ["#1a8f78", "#345fc4", "#7a4fd0", "#12a883"] },
  ember:  { name: "Ember",  base: "#180a07", cols: ["#e85f33", "#d23a64", "#e09a33", "#bb1c44"] },
  ocean:  { name: "Ocean",  base: "#04101d", cols: ["#0a6fe0", "#129fb0", "#1b4ec4", "#0eb88e"] },
  dusk:   { name: "Dusk",   base: "#120a1c", cols: ["#6e44c4", "#c2458d", "#4460c4", "#c66a8e"] },
  mono:   { name: "Mono",   base: "#0c0e12", cols: ["#3a4254", "#525c70", "#262b36", "#444c5e"] },
};
const INTENSITY = {
  ambient: { name: "Ambient", blobs: 5, speed: 0.55, alpha: 0.42, amp: 0.22 },
  lively:  { name: "Lively",  blobs: 6, speed: 1.0,  alpha: 0.55, amp: 0.28 },
  bold:    { name: "Bold",    blobs: 7, speed: 1.7,  alpha: 0.72, amp: 0.34 },
};
const DEFAULTS = { palette: "aurora", intensity: "ambient", text: "auto" };
let SET = (() => { try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(LKEY)) || {}); } catch { return { ...DEFAULTS }; } })();
function persist() { try { localStorage.setItem(LKEY, JSON.stringify(SET)); } catch {} }

const SCALE = 0.4, OVER = 120;        // low-res backing store; overscan so the CSS blur never fades the visible edges
let api = null, layer = null, canvas = null, ctx = null;
let blobs = [], PAL = PALETTES.aurora, INT = INTENSITY.ambient, W = 0, H = 0, raf = 0, t = 0, running = false;

const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lumOf = (h) => { const [r, g, b] = hexRgb(h); return 0.299 * r + 0.587 * g + 0.114 * b; };

function brandPalette() {                                  // "Brand" = the colours you saved in the colour plugin
  try {
    const saved = JSON.parse(localStorage.getItem("startpage:colors")) || [];
    const cols = saved.map((s) => s && s.hex).filter((h) => /^#[0-9a-f]{6}$/i.test(h || ""));
    if (cols.length >= 2) return { name: "Brand", base: "#0b0d12", cols: cols.slice(0, 5) };
  } catch {}
  return null;
}
function resolvePal() {
  if (SET.palette === "brand") { const b = brandPalette(); if (b) return b; return PALETTES.aurora; }
  return PALETTES[SET.palette] || PALETTES.aurora;
}
function resolve() { PAL = resolvePal(); INT = INTENSITY[SET.intensity] || INTENSITY.ambient; }

function reportContrast() {
  if (!api) return;
  if (SET.text === "light") return api.setContrast(false);
  if (SET.text === "dark") return api.setContrast(true);
  const avg = lumOf(PAL.base) * 0.6 + (PAL.cols.reduce((s, c) => s + lumOf(c), 0) / PAL.cols.length) * 0.4 * INT.alpha;
  api.setContrast(avg > 150);                              // "auto" — predict from the palette
}
function sizeCanvas() {
  W = Math.max(2, Math.round((window.innerWidth + OVER * 2) * SCALE));
  H = Math.max(2, Math.round((window.innerHeight + OVER * 2) * SCALE));
  if (canvas) { canvas.width = W; canvas.height = H; }
}
function makeBlobs() {
  blobs = [];
  for (let i = 0; i < INT.blobs; i++) {                    // deterministic spread — no randomness needed, reads tidy
    blobs.push({
      col: PAL.cols[i % PAL.cols.length],
      ax: 0.12 + 0.76 * ((i + 0.5) / INT.blobs) + (i % 2 ? 0.05 : -0.05),
      ay: 0.28 + 0.44 * ((i * 0.37) % 1),
      r: 0.34 + 0.18 * ((i * 0.53) % 1),
      px: i * 1.7, py: i * 2.3,
      sx: 0.7 + 0.5 * ((i * 0.29) % 1), sy: 0.6 + 0.5 * ((i * 0.41) % 1),
    });
  }
}
function draw() {
  if (!ctx) return;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = PAL.base; ctx.fillRect(0, 0, W, H);      // opaque base → blurred edges stay the base colour, no fringe
  ctx.globalCompositeOperation = "lighter";               // additive blobs → glowing lava blend
  for (const b of blobs) {
    const cx = (b.ax + Math.sin(t * b.sx + b.px) * INT.amp) * W;
    const cy = (b.ay + Math.cos(t * b.sy + b.py) * INT.amp) * H;
    const rad = b.r * Math.min(W, H) * 1.4, [r, g, bl] = hexRgb(b.col);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grad.addColorStop(0, `rgba(${r},${g},${bl},${INT.alpha})`);
    grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.fill();
  }
}
function loop() { if (!running) return; t += 0.0016 * INT.speed; draw(); raf = requestAnimationFrame(loop); }
function start() {
  if (running) return;
  if (api && api.reducedMotion()) { draw(); return; }      // reduced-motion → one static frame, no loop
  running = true; raf = requestAnimationFrame(loop);
}
function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
function onResize() { sizeCanvas(); draw(); }
function onVis() { if (document.hidden) stop(); else start(); }
function rebuild() { resolve(); sizeCanvas(); makeBlobs(); reportContrast(); draw(); }

/* ---- settings UI (rendered into the core's wallpaper popover) ---- */
const SCSS = `
.wpl-lab { font-size: 0.6rem; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted, rgba(244,246,251,0.6)); margin: 0.55rem 0 0.35rem; }
.wpl-lab:first-child { margin-top: 0; }
.wpl-sws { display: flex; flex-wrap: wrap; gap: 0.38rem; }
.wpl-sw { width: 30px; height: 30px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; padding: 0; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); }
.wpl-sw.on { border-color: #fff; }
.wpl-seg { display: flex; background: rgba(255,255,255,0.06); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 8px; padding: 2px; gap: 2px; }
.wpl-seg button { flex: 1; border: none; background: none; color: var(--muted, rgba(244,246,251,0.6)); font: inherit; font-size: 0.76rem; padding: 0.22rem 0; border-radius: 6px; cursor: pointer; }
.wpl-seg button.on { background: rgba(255,255,255,0.18); color: var(--fg, #f4f6fb); }
.wpl-note { margin-top: 0.5rem; font-size: 0.74rem; color: var(--muted, rgba(244,246,251,0.55)); line-height: 1.4; }
`;
function paletteList() {
  const list = Object.entries(PALETTES).map(([id, p]) => [id, p]);
  const b = brandPalette(); if (b) list.push(["brand", b]);
  return list;
}
function settings(root, hostApi) {
  api = hostApi || api;
  if (!document.getElementById("wp-lava-scss")) { const s = document.createElement("style"); s.id = "wp-lava-scss"; s.textContent = SCSS; document.head.appendChild(s); }
  const sws = paletteList().map(([id, p]) => `<button type="button" class="wpl-sw${SET.palette === id ? " on" : ""}" data-pal="${id}" title="${p.name}" style="background:linear-gradient(135deg, ${p.cols[0]}, ${p.cols[Math.min(2, p.cols.length - 1)]})"></button>`).join("");
  const seg = (key, map) => Object.entries(map).map(([id, v]) => `<button type="button" data-${key}="${id}" class="${SET[key] === id ? "on" : ""}">${v.name || v}</button>`).join("");
  root.innerHTML = `<div class="wpl-lab">Palette</div><div class="wpl-sws">${sws}</div>
    <div class="wpl-lab">Motion</div><div class="wpl-seg">${seg("intensity", INTENSITY)}</div>
    <div class="wpl-lab">Text</div><div class="wpl-seg">${seg("text", { auto: "Auto", light: "Light", dark: "Dark" })}</div>` +
    (api && api.reducedMotion() ? `<div class="wpl-note">Your system has “reduce motion” on, so this stays still.</div>` : ``);
  root.onclick = (e) => {
    const p = e.target.closest("[data-pal]"); if (p) { SET.palette = p.getAttribute("data-pal"); persist(); rebuild(); return settings(root, api); }
    const i = e.target.closest("[data-intensity]"); if (i) { SET.intensity = i.getAttribute("data-intensity"); persist(); resolve(); makeBlobs(); reportContrast(); start(); return settings(root, api); }
    const x = e.target.closest("[data-text]"); if (x) { SET.text = x.getAttribute("data-text"); persist(); reportContrast(); return settings(root, api); }
  };
}

export default {
  mount(layerEl, hostApi) {
    api = hostApi; layer = layerEl;
    canvas = document.createElement("canvas");
    canvas.style.cssText = `position:absolute; top:-${OVER}px; left:-${OVER}px; width:calc(100% + ${OVER * 2}px); height:calc(100% + ${OVER * 2}px); filter: blur(58px) saturate(1.2);`;
    layer.appendChild(canvas);
    ctx = canvas.getContext("2d");
    rebuild(); start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
  },
  settings,
  unmount() {
    stop();
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVis);
    if (canvas) canvas.remove();
    const s = document.getElementById("wp-lava-scss"); if (s) s.remove();
    api = canvas = ctx = layer = null; blobs = []; t = 0;
  },
};
