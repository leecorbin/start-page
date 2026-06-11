/* start-page wallpaper plugin: Weatherscape (animated, stylised weather scene)
   A calm illustrated sky that matches your live weather — sun, moon + stars,
   drifting clouds, rain, snow and the odd lightning flash — or pin a scene by hand.
   Reads the weather the core already caches (no extra fetch). Canvas, stylised flat
   art (not photoreal); pauses when hidden, honours reduced-motion. Part of start-page (MIT). */

const WKEY = "startpage:wp-weather";
const DEFAULTS = { scene: "live", sky: "auto", text: "auto" };
let SET = (() => { try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(WKEY)) || {}); } catch { return { ...DEFAULTS }; } })();
function persist() { try { localStorage.setItem(WKEY, JSON.stringify(SET)); } catch {} }

/* sky gradients per condition × day/night (top → bottom) */
const SKY = {
  clear:  { day: ["#2f7fd1", "#bfe1fb"], night: ["#0a1130", "#22355f"] },
  partly: { day: ["#4189cf", "#cbe4fa"], night: ["#0c1430", "#27375d"] },
  cloudy: { day: ["#69788c", "#aab8c6"], night: ["#161d2b", "#2c3852"] },
  fog:    { day: ["#8a96a2", "#c5ccd3"], night: ["#1a212b", "#333c48"] },
  rain:   { day: ["#586a7c", "#8a99a8"], night: ["#10161f", "#28323f"] },
  snow:   { day: ["#7e8d9e", "#d2dae2"], night: ["#1a2230", "#39465a"] },
  storm:  { day: ["#3b4654", "#5c6a79"], night: ["#0a0e16", "#1f2733"] },
};
function codeToCond(c) {
  if (c == null) return "clear";
  if (c === 0) return "clear";
  if (c === 1 || c === 2) return "partly";
  if (c === 3) return "cloudy";
  if (c === 45 || c === 48) return "fog";
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return "rain";
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "snow";
  if (c >= 95) return "storm";
  return "cloudy";
}
const CLOUDS_FOR = { clear: 0, partly: 2, cloudy: 4, fog: 3, rain: 4, snow: 4, storm: 5 };
const PRECIP_FOR = { rain: "rain", snow: "snow", storm: "rain" };

const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lumOf = (h) => { const [r, g, b] = hexRgb(h); return 0.299 * r + 0.587 * g + 0.114 * b; };

let api = null, layer = null, canvas = null, ctx = null;
let W = 0, H = 0, dpr = 1, raf = 0, running = false, t = 0;
let scene = { cond: "clear", day: true };
let clouds = [], drops = [], flakes = [], stars = [], flash = 0, nextBolt = 4, bolt = null, poll = 0;

function clockIsDay() { const h = (api ? api.now() : new Date()).getHours(); return h >= 7 && h < 19; }
function resolveScene() {
  const wx = api ? api.weather() : null;
  const cond = SET.scene === "live" ? codeToCond(wx && wx.code) : SET.scene;
  const day = SET.sky === "day" ? true : SET.sky === "night" ? false : (wx && typeof wx.isDay === "boolean" ? wx.isDay : clockIsDay());
  return { cond, day };
}

/* ---- build the particle systems for the current scene ---- */
function area() { return (W * H) / (1280 * 800); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function buildClouds() {
  const n = CLOUDS_FOR[scene.cond] || 0;
  clouds = [];
  for (let i = 0; i < n; i++) clouds.push({ x: rnd(0, W), y: rnd(H * 0.08, H * 0.5), s: rnd(0.7, 1.5), v: rnd(4, 11) * (i % 2 ? 1 : -1) / 60, dark: scene.cond === "storm" ? 0.5 : scene.cond === "rain" || scene.cond === "cloudy" ? 0.28 : 0.12 });
}
function buildPrecip() {
  drops = []; flakes = [];
  const p = PRECIP_FOR[scene.cond];
  if (p === "rain") { const n = Math.round((scene.cond === "storm" ? 230 : 150) * area()); for (let i = 0; i < n; i++) drops.push({ x: rnd(0, W), y: rnd(0, H), l: rnd(9, 18), v: rnd(420, 620) / 60, vx: scene.cond === "storm" ? 3.2 : 1.6 }); }
  else if (p === "snow") { const n = Math.round(130 * area()); for (let i = 0; i < n; i++) flakes.push({ x: rnd(0, W), y: rnd(0, H), r: rnd(1.2, 3.2), v: rnd(40, 90) / 60, sway: rnd(0.3, 1.1), ph: rnd(0, 7) }); }
}
function buildStars() {
  stars = [];
  if (!scene.day && (scene.cond === "clear" || scene.cond === "partly")) { const n = Math.round(70 * area()); for (let i = 0; i < n; i++) stars.push({ x: rnd(0, W), y: rnd(0, H * 0.7), r: rnd(0.5, 1.6), ph: rnd(0, 7) }); }
}
function rebuildScene() { scene = resolveScene(); buildClouds(); buildPrecip(); buildStars(); nextBolt = rnd(3, 8); reportContrast(); }

function reportContrast() {
  if (!api) return;
  if (SET.text === "light") return api.setContrast(false);
  if (SET.text === "dark") return api.setContrast(true);
  const [top, bot] = SKY[scene.cond][scene.day ? "day" : "night"];
  api.setContrast(lumOf(top) * 0.35 + lumOf(bot) * 0.65 > 150);     // content sits low-centre → weight the lower sky
}

/* ---- drawing ---- */
function drawSky() {
  const [top, bot] = SKY[scene.cond][scene.day ? "day" : "night"];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function drawStars() {
  for (const s of stars) { const a = 0.5 + 0.5 * Math.sin(t * 2 + s.ph); ctx.globalAlpha = 0.35 + a * 0.5; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
}
function drawSun(x, y, r) {
  const pulse = 1 + 0.05 * Math.sin(t * 1.5);
  let g = ctx.createRadialGradient(x, y, 0, x, y, r * 4 * pulse);
  g.addColorStop(0, "rgba(255,236,170,0.55)"); g.addColorStop(0.4, "rgba(255,221,130,0.18)"); g.addColorStop(1, "rgba(255,221,130,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4 * pulse, 0, 7); ctx.fill();
  g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "#fff6d8"); g.addColorStop(0.6, "#ffe08a"); g.addColorStop(1, "#ffcf63");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}
function drawMoon(x, y, r) {
  let g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
  g.addColorStop(0, "rgba(210,224,255,0.4)"); g.addColorStop(1, "rgba(210,224,255,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 7); ctx.fill();
  g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
  g.addColorStop(0, "#fdfdf5"); g.addColorStop(1, "#cdd6e6");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(150,165,195,0.35)";                          // a couple of soft craters
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.1, r * 0.16, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x - r * 0.25, y + r * 0.3, r * 0.12, 0, 7); ctx.fill();
}
function blob(x, y, rx, ry, col) { const g = ctx.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, col); g.addColorStop(0.7, col); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill(); ctx.restore(); }
function drawCloud(c) {
  const base = scene.day ? 255 : 150, k = 1 - c.dark, col = `rgba(${(base * k) | 0},${(base * k + 6) | 0},${(base * k + 14) | 0},0.92)`;
  const s = c.s, x = c.x, y = c.y;
  blob(x, y, 70 * s, 46 * s, col); blob(x - 58 * s, y + 10 * s, 46 * s, 32 * s, col);
  blob(x + 60 * s, y + 12 * s, 50 * s, 34 * s, col); blob(x + 6 * s, y - 22 * s, 44 * s, 32 * s, col);
}
function drawRain() {
  ctx.strokeStyle = scene.cond === "storm" ? "rgba(180,200,230,0.5)" : "rgba(200,220,245,0.45)"; ctx.lineWidth = 1.1; ctx.beginPath();
  for (const d of drops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.vx * 2.4, d.y + d.l); }
  ctx.stroke();
}
function drawSnow() { ctx.fillStyle = "rgba(255,255,255,0.9)"; for (const f of flakes) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); } }
function drawBolt() {
  if (!bolt) return;
  ctx.strokeStyle = "rgba(220,232,255,0.95)"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(bolt[0].x, bolt[0].y);
  for (let i = 1; i < bolt.length; i++) ctx.lineTo(bolt[i].x, bolt[i].y);
  ctx.stroke();
}

/* ---- update + frame ---- */
function update(dt) {
  for (const c of clouds) { c.x += c.v * dt * 60; if (c.v > 0 && c.x - 130 * c.s > W) c.x = -130 * c.s; if (c.v < 0 && c.x + 130 * c.s < 0) c.x = W + 130 * c.s; }
  for (const d of drops) { d.y += d.v * dt * 60; d.x += d.vx * dt * 60; if (d.y > H) { d.y = -d.l; d.x = rnd(0, W); } }
  for (const f of flakes) { f.ph += dt; f.y += f.v * dt * 60; f.x += Math.sin(f.ph) * f.sway; if (f.y > H) { f.y = -4; f.x = rnd(0, W); } }
  if (scene.cond === "storm") {
    nextBolt -= dt;
    if (nextBolt <= 0) { nextBolt = rnd(3.5, 9); flash = 1; const x = rnd(W * 0.2, W * 0.8); bolt = [{ x, y: 0 }]; let y = 0; while (y < H * 0.55) { y += rnd(20, 50); bolt.push({ x: bolt[bolt.length - 1].x + rnd(-26, 26), y }); } setTimeout(() => { bolt = null; }, 150); }
    if (flash > 0) flash = Math.max(0, flash - dt * 4);
  }
}
function frame(ts) {
  if (!running) return;
  const dt = Math.min(0.05, (ts - (frame.last || ts)) / 1000); frame.last = ts; t += dt;
  render(dt);
  raf = requestAnimationFrame(frame);
}
function render(dt) {
  if (!ctx) return;
  if (dt) update(dt);
  drawSky();
  if (!scene.day) drawStars();
  const cx = W * 0.76, cy = H * 0.24, r = Math.min(W, H) * 0.07;
  if (scene.cond === "clear" || scene.cond === "partly") { scene.day ? drawSun(cx, cy, r) : drawMoon(cx, cy, r); }
  for (const c of clouds) drawCloud(c);
  if (drops.length) drawRain();
  if (flakes.length) drawSnow();
  if (scene.cond === "storm") { drawBolt(); if (flash > 0) { ctx.fillStyle = `rgba(225,235,255,${flash * 0.35})`; ctx.fillRect(0, 0, W, H); } }
}
function start() { if (running) return; if (api && api.reducedMotion()) { render(0); return; } running = true; frame.last = 0; raf = requestAnimationFrame(frame); }
function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

function sizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  W = window.innerWidth; H = window.innerHeight;
  if (canvas) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
}
function onResize() { sizeCanvas(); buildClouds(); buildPrecip(); buildStars(); render(0); }
function onVis() { if (document.hidden) stop(); else start(); }
function tick() {                                                    // re-check live weather periodically; rebuild only if the scene changed
  if (SET.scene !== "live" && SET.sky !== "auto") return;
  const next = resolveScene();
  if (next.cond !== scene.cond || next.day !== scene.day) { rebuildScene(); render(0); }
}

/* ---- settings UI ---- */
const SCSS = `
.wx-lab { font-size: 0.6rem; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted, rgba(244,246,251,0.6)); margin: 0.55rem 0 0.35rem; }
.wx-lab:first-child { margin-top: 0; }
.wx-seg { display: flex; flex-wrap: wrap; background: rgba(255,255,255,0.06); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 8px; padding: 2px; gap: 2px; }
.wx-seg button { flex: 1 0 auto; border: none; background: none; color: var(--muted, rgba(244,246,251,0.6)); font: inherit; font-size: 0.74rem; padding: 0.22rem 0.45rem; border-radius: 6px; cursor: pointer; }
.wx-seg button.on { background: rgba(255,255,255,0.18); color: var(--fg, #f4f6fb); }
.wx-note { margin-top: 0.5rem; font-size: 0.74rem; color: var(--muted, rgba(244,246,251,0.55)); line-height: 1.4; }
`;
const SCENES = { live: "Live", clear: "Clear", partly: "Partly", cloudy: "Cloud", fog: "Fog", rain: "Rain", snow: "Snow", storm: "Storm" };
function settings(root, hostApi) {
  api = hostApi || api;
  if (!document.getElementById("wp-weather-scss")) { const s = document.createElement("style"); s.id = "wp-weather-scss"; s.textContent = SCSS; document.head.appendChild(s); }
  const seg = (key, map) => Object.entries(map).map(([id, label]) => `<button type="button" data-${key}="${id}" class="${SET[key] === id ? "on" : ""}">${label}</button>`).join("");
  const wx = api ? api.weather() : null;
  root.innerHTML = `<div class="wx-lab">Scene</div><div class="wx-seg">${seg("scene", SCENES)}</div>
    <div class="wx-lab">Sky</div><div class="wx-seg">${seg("sky", { auto: "Auto", day: "Day", night: "Night" })}</div>
    <div class="wx-lab">Text</div><div class="wx-seg">${seg("text", { auto: "Auto", light: "Light", dark: "Dark" })}</div>
    <div class="wx-note">${SET.scene === "live" ? (wx ? "Matching your live weather." : "Live needs your weather set in Settings — showing a clear sky for now.") : "Pinned to a fixed scene."}${api && api.reducedMotion() ? " Motion is reduced by your system." : ""}</div>`;
  root.onclick = (e) => {
    const a = e.target.closest("[data-scene],[data-sky],[data-text]"); if (!a) return;
    if (a.dataset.scene != null) SET.scene = a.dataset.scene;
    else if (a.dataset.sky != null) SET.sky = a.dataset.sky;
    else SET.text = a.dataset.text;
    persist(); rebuildScene(); start(); render(0); settings(root, api);
  };
}

export default {
  mount(layerEl, hostApi) {
    api = hostApi; layer = layerEl;
    canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute; inset:0; width:100%; height:100%;";
    layer.appendChild(canvas);
    ctx = canvas.getContext("2d");
    sizeCanvas(); rebuildScene(); render(0); start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    poll = setInterval(tick, 15000);                                 // pick up weather/day-night changes
  },
  settings,
  unmount() {
    stop(); clearInterval(poll);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVis);
    const s = document.getElementById("wp-weather-scss"); if (s) s.remove();
    if (canvas) canvas.remove();
    api = canvas = ctx = layer = null; clouds = drops = flakes = stars = []; bolt = null; t = 0;
  },
};
