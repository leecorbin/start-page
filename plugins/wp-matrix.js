/* start-page wallpaper plugin: Matrix rain (falling glyph columns)
   The classic cascading code — bright heads trailing into a fading glow. Canvas,
   the trail done the cheap classic way (a translucent base wash each frame).
   Pauses when hidden, honours prefers-reduced-motion. Part of start-page (MIT). */

const MKEY = "startpage:wp-matrix";
const PALETTES = {
  green:  { name: "Green",  base: [0, 10, 2],  lit: "#3fd35f", head: "#caffd6" },
  amber:  { name: "Amber",  base: [10, 6, 0],  lit: "#e0a43a", head: "#ffe6b0" },
  cyan:   { name: "Cyan",   base: [0, 12, 16], lit: "#36c2e0", head: "#c4f4ff" },
  violet: { name: "Violet", base: [9, 4, 18],  lit: "#a45ce0", head: "#e8ccff" },
};
const INTENSITY = {                       // idle = chance a column skips a frame (higher = slower/sparser); fade = trail length
  ambient: { name: "Ambient", idle: 0.55, fade: 0.045 },
  lively:  { name: "Lively",  idle: 0.30, fade: 0.060 },
  bold:    { name: "Bold",    idle: 0.10, fade: 0.085 },
};
const DEFAULTS = { palette: "green", intensity: "ambient", text: "auto" };
let SET = (() => { try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(MKEY)) || {}); } catch { return { ...DEFAULTS }; } })();
function persist() { try { localStorage.setItem(MKEY, JSON.stringify(SET)); } catch {} }

const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:.=*+<>";
const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

let api = null, layer = null, canvas = null, ctx = null;
let W = 0, H = 0, dpr = 1, F = 16, cols = 0, drops = [], prev = [], raf = 0, running = false;
let PAL = PALETTES.green, INT = INTENSITY.ambient;

function resolve() { PAL = PALETTES[SET.palette] || PALETTES.green; INT = INTENSITY[SET.intensity] || INTENSITY.ambient; }
function reportContrast() {
  if (!api) return;
  if (SET.text === "light") return api.setContrast(false);
  if (SET.text === "dark") return api.setContrast(true);
  api.setContrast(false);                 // matrix is always a dark scene → light text
}
function sizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  W = window.innerWidth; H = window.innerHeight;
  F = W < 700 ? 14 : 17;
  if (canvas) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  cols = Math.ceil(W / F);
  drops = []; prev = [];
  for (let i = 0; i < cols; i++) { drops.push((Math.random() * H / F) | 0); prev.push(glyph()); }
}
function clear() { ctx.fillStyle = `rgb(${PAL.base[0]},${PAL.base[1]},${PAL.base[2]})`; ctx.fillRect(0, 0, W, H); }
function frameStep() {
  ctx.fillStyle = `rgba(${PAL.base[0]},${PAL.base[1]},${PAL.base[2]},${INT.fade})`;   // wash the previous frame toward base → trails fade
  ctx.fillRect(0, 0, W, H);
  ctx.font = `${F}px ui-monospace, "SF Mono", Menlo, monospace`; ctx.textBaseline = "top";
  for (let i = 0; i < cols; i++) {
    if (Math.random() < INT.idle) continue;                  // varied per-column speed
    const x = i * F, y = drops[i] * F;
    ctx.fillStyle = PAL.lit; ctx.fillText(prev[i], x, y - F);  // demote the old head to the trail colour
    const ch = glyph(); prev[i] = ch;
    ctx.fillStyle = PAL.head; ctx.fillText(ch, x, y);          // bright leading glyph
    drops[i]++;
    if (y > H && Math.random() > 0.975) drops[i] = 0;
  }
}
function staticFrame() {                                       // reduced-motion → a still scatter of glyphs, no loop
  clear(); ctx.font = `${F}px ui-monospace, Menlo, monospace`; ctx.textBaseline = "top";
  for (let i = 0; i < cols; i++) { const n = (Math.random() * (H / F)) | 0; for (let j = 0; j < n; j++) { ctx.fillStyle = j === n - 1 ? PAL.head : `rgba(${hexA(PAL.lit, 0.15 + 0.6 * (j / n))})`; ctx.fillText(glyph(), i * F, j * F); } }
}
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(2)}`; }
function loop() { if (!running) return; frameStep(); raf = requestAnimationFrame(loop); }
function start() { if (running) return; if (api && api.reducedMotion()) return; running = true; raf = requestAnimationFrame(loop); }
function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
function onResize() { sizeCanvas(); staticFrame(); }
function onVis() { if (document.hidden) stop(); else start(); }
function rebuild() { resolve(); sizeCanvas(); clear(); reportContrast(); staticFrame(); }   // paint a populated frame synchronously so there's content before rAF ticks

/* ---- settings UI ---- */
const SCSS = `
.mx-lab { font-size: 0.6rem; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted, rgba(244,246,251,0.6)); margin: 0.55rem 0 0.35rem; }
.mx-lab:first-child { margin-top: 0; }
.mx-sws { display: flex; gap: 0.4rem; }
.mx-sw { width: 30px; height: 30px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; padding: 0; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); }
.mx-sw.on { border-color: #fff; }
.mx-seg { display: flex; background: rgba(255,255,255,0.06); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 8px; padding: 2px; gap: 2px; }
.mx-seg button { flex: 1; border: none; background: none; color: var(--muted, rgba(244,246,251,0.6)); font: inherit; font-size: 0.74rem; padding: 0.22rem 0; border-radius: 6px; cursor: pointer; }
.mx-seg button.on { background: rgba(255,255,255,0.18); color: var(--fg, #f4f6fb); }
.mx-note { margin-top: 0.5rem; font-size: 0.74rem; color: var(--muted, rgba(244,246,251,0.55)); line-height: 1.4; }
`;
function settings(root, hostApi) {
  api = hostApi || api;
  if (!document.getElementById("wp-matrix-scss")) { const s = document.createElement("style"); s.id = "wp-matrix-scss"; s.textContent = SCSS; document.head.appendChild(s); }
  const sws = Object.entries(PALETTES).map(([id, p]) => `<button type="button" class="mx-sw${SET.palette === id ? " on" : ""}" data-pal="${id}" title="${p.name}" style="background:linear-gradient(135deg, ${p.head}, ${p.lit})"></button>`).join("");
  const seg = (key, map) => Object.entries(map).map(([id, v]) => `<button type="button" data-${key}="${id}" class="${SET[key] === id ? "on" : ""}">${v.name || v}</button>`).join("");
  root.innerHTML = `<div class="mx-lab">Colour</div><div class="mx-sws">${sws}</div>
    <div class="mx-lab">Speed</div><div class="mx-seg">${seg("intensity", INTENSITY)}</div>
    <div class="mx-lab">Text</div><div class="mx-seg">${seg("text", { auto: "Auto", light: "Light", dark: "Dark" })}</div>` +
    (api && api.reducedMotion() ? `<div class="mx-note">Your system has “reduce motion” on, so this stays still.</div>` : ``);
  root.onclick = (e) => {
    const p = e.target.closest("[data-pal]"); if (p) { SET.palette = p.getAttribute("data-pal"); persist(); rebuild(); start(); return settings(root, api); }
    const i = e.target.closest("[data-intensity]"); if (i) { SET.intensity = i.getAttribute("data-intensity"); persist(); resolve(); start(); return settings(root, api); }
    const x = e.target.closest("[data-text]"); if (x) { SET.text = x.getAttribute("data-text"); persist(); reportContrast(); return settings(root, api); }
  };
}

export default {
  mount(layerEl, hostApi) {
    api = hostApi; layer = layerEl;
    canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute; inset:0; width:100%; height:100%;";
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
    const s = document.getElementById("wp-matrix-scss"); if (s) s.remove();
    if (canvas) canvas.remove();
    api = canvas = ctx = layer = null; drops = []; prev = [];
  },
};
