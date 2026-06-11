/* start-page plugin: Map (trigger "@@")
   Keyless place search on an OpenStreetMap map (vendored Leaflet, no CDN, no key).
   Geocodes with Open-Meteo (the same keyless service the weather uses), drops a pin,
   and lists alternative matches; expand to a full-screen map. OSM's own tiles, dark-
   themed with a CSS filter so it matches the page. Part of start-page (MIT). */

const CSS = `
.mapx { height: 100%; display: flex; flex-direction: column; color: var(--fg, #f4f6fb); }
.mapx-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.mapx-ph { padding: 0.8rem 0.9rem; color: rgba(244,246,251,0.5); font-size: 0.85rem; line-height: 1.6; }
.mapx-ph code { background: rgba(255,255,255,0.08); border-radius: 5px; padding: 0.05rem 0.35rem; }
.mapx-head { display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.6rem 0.4rem; }
.mapx-name { font-size: 0.92rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mapx-sub { color: var(--muted, rgba(244,246,251,0.6)); font-weight: 400; font-size: 0.82rem; }
.mapx-spacer { flex: 1; }
.mapx-seg { display: inline-flex; flex: none; background: rgba(255,255,255,0.06); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 8px; padding: 2px; gap: 2px; }
.mapx-seg button { border: none; background: none; color: var(--muted, rgba(244,246,251,0.6)); font: inherit; font-size: 0.72rem; padding: 0.12rem 0.45rem; border-radius: 6px; cursor: pointer; }
.mapx-seg button.on { background: rgba(255,255,255,0.18); color: var(--fg, #f4f6fb); }
.mapx-btn { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--field-border, rgba(255,255,255,0.18)); background: rgba(255,255,255,0.06); color: var(--fg); cursor: pointer; text-decoration: none; }
.mapx-btn:hover { background: rgba(255,255,255,0.14); }
.mapx-btn svg { width: 15px; height: 15px; }
.mapx-chips { display: flex; gap: 0.35rem; flex-wrap: nowrap; overflow-x: auto; padding: 0 0.6rem 0.45rem; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.25) transparent; }
.mapx-chips::-webkit-scrollbar { height: 5px; }
.mapx-chips::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.22); border-radius: 3px; }
.mapx-chips:empty { display: none; }
.mapx-chip { flex: none; white-space: nowrap; background: rgba(255,255,255,0.07); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 999px; color: var(--fg); font: inherit; font-size: 0.78rem; padding: 0.1rem 0.55rem; cursor: pointer; }
.mapx-chip:hover { background: var(--accent, #5b9bff); border-color: var(--accent, #5b9bff); color: #fff; }
.mapx-slot { flex: 1; min-height: 0; padding: 0 0.6rem 0.6rem; }
.mapx-map { width: 100%; height: 100%; border-radius: 11px; overflow: hidden; background: #11151d; }
.mapx-map.leaflet-container { background: #11151d; font: inherit; }   /* Leaflet adds .leaflet-container to this same element */
.mapx-map .leaflet-control-attribution { background: rgba(12,16,24,0.74); color: rgba(244,246,251,0.55); font-size: 9px; line-height: 1.7; padding: 0 5px; }
.mapx-map .leaflet-control-attribution a { color: #9cc0ff; }
.mapx-map .leaflet-bar a { background: rgba(22,27,36,0.92); color: #f4f6fb; border-bottom-color: rgba(255,255,255,0.14); }
.mapx-map .leaflet-bar a:hover { background: rgba(40,46,58,0.95); }
.mapx-pin svg { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }
.mapx-loading { padding: 1rem 0.9rem; color: rgba(244,246,251,0.5); font-size: 0.85rem; }

.mapx-lb { position: fixed; inset: 0; z-index: 9999; display: flex; flex-direction: column; }
.mapx-lb-bar { display: flex; align-items: center; gap: 0.6rem; padding: 0.7rem 1rem; background: rgba(10,13,20,0.92); color: #f4f6fb; }
.mapx-lb-bar .mapx-name { font-size: 1rem; }
.mapx-lb .mapx-map { border-radius: 0; flex: 1; }
.mapx-lb-close { flex: none; width: 34px; height: 34px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); color: #fff; font-size: 1.2rem; cursor: pointer; }
`;

const PH_HTML = `<div class="mapx-ph">Type a place after <code>@@</code> — a city, landmark or address — to see it on the map.
Try <code>Kyoto</code> or <code>Eiffel Tower</code>.<br><span style="opacity:0.7">OpenStreetMap, keyless. Click ⤢ for a full-screen map.</span></div>`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const PIN = `<svg viewBox="0 0 24 24" width="28" height="28" fill="#5b9bff" stroke="#fff" stroke-width="1.4"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.4" fill="#fff" stroke="none"/></svg>`;
const I_EXPAND = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
const I_OSM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>`;

let leafletPromise = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) { const l = document.createElement("link"); l.id = "leaflet-css"; l.rel = "stylesheet"; l.href = "./plugins/vendor/leaflet.css"; document.head.appendChild(l); }
    const s = document.createElement("script"); s.src = "./plugins/vendor/leaflet.js"; s.onload = () => resolve(window.L); s.onerror = () => reject(new Error("leaflet")); document.head.appendChild(s);
  });
  return leafletPromise;
}
async function geocode(q) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
  if (!r.ok) return [];
  const j = await r.json();
  return j.results || [];
}
const placeName = (r) => [r.name, r.admin1, r.country].filter(Boolean).join(", ");

/* tile styles. CARTO basemaps (OSM data, keyless) — they serve crisp @2x retina tiles ({r})
   and proper light/dark designs, so no blurry upscaling and no CSS-invert hack. "OSM" is the
   purest option (OpenStreetMap's own tiles, but not retina-sharp). */
const CARTO = (s) => `https://{s}.basemaps.cartocdn.com/${s === "voyager" ? "rastertiles/voyager" : s}/{z}/{x}/{y}{r}.png`;
const CARTO_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const STYLES = {
  dark:    { name: "Dark",  url: CARTO("dark_all"),  attr: CARTO_ATTR, sub: "abcd", max: 20 },
  light:   { name: "Light", url: CARTO("light_all"), attr: CARTO_ATTR, sub: "abcd", max: 20 },
  voyager: { name: "Voyager", url: CARTO("voyager"), attr: CARTO_ATTR, sub: "abcd", max: 20 },
  osm:     { name: "OSM",   url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', sub: "abc", max: 19 },
};
const MKEY = "startpage:map";
let SET = (() => { try { return Object.assign({ style: "dark" }, JSON.parse(localStorage.getItem(MKEY)) || {}); } catch { return { style: "dark" }; } })();
function persist() { try { localStorage.setItem(MKEY, JSON.stringify(SET)); } catch {} }

let api = null, styleEl = null, root = null, L = null, map = null, marker = null, tiles = null;
let bodyEl = null, slotEl = null, mapEl = null, lbEl = null, keyHandler = null;
let pending = null, debounceT = 0, gen = 0, current = null, results = [];

function fit() { if (api) api.setHeight(map ? 320 : 120); }

function ensureMap() {
  if (map || !L || !mapEl) return;
  map = L.map(mapEl, { zoomControl: true, attributionControl: true, worldCopyJump: true }).setView([25, 10], 2);
  map.attributionControl.setPrefix(false);     // drop the "Leaflet" prefix + flag — keep it to the tile/data credit
  applyStyle();
}
function applyStyle() {
  if (!map) return;
  const s = STYLES[SET.style] || STYLES.dark;
  if (tiles) map.removeLayer(tiles);
  tiles = L.tileLayer(s.url, { maxZoom: s.max, subdomains: s.sub, attribution: s.attr }).addTo(map);   // {r} → @2x on retina = crisp
}
function setLocation(r, fly) {
  current = r;
  const ll = [r.latitude, r.longitude];
  if (!marker) marker = L.marker(ll, { icon: L.divIcon({ className: "mapx-pin", html: PIN, iconSize: [28, 28], iconAnchor: [14, 28] }) }).addTo(map);
  else marker.setLatLng(ll);
  map.setView(ll, 10, { animate: false });   // instant + reliable (flyTo silently stalls on long jumps / after invalidateSize)
  paintHead();
}
function paintHead() {
  if (!current) return;
  const nameEl = root.querySelector(".mapx-name"); if (nameEl) nameEl.innerHTML = `${esc(current.name)}<span class="mapx-sub"> · ${esc([current.admin1, current.country].filter(Boolean).join(", "))}</span>`;
  const osm = root.querySelector(".mapx-osm"); if (osm) osm.href = `https://www.openstreetmap.org/?mlat=${current.latitude}&mlon=${current.longitude}#map=11/${current.latitude}/${current.longitude}`;
  const chips = root.querySelector(".mapx-chips");
  if (chips) chips.innerHTML = results.slice(0, 6).filter((r) => r !== current).map((r, i) => `<button type="button" class="mapx-chip" data-i="${results.indexOf(r)}">${esc(placeName(r))}</button>`).join("");
}
function buildScaffold() {
  const styleSeg = Object.entries(STYLES).map(([id, s]) => `<button type="button" data-style="${id}" class="${SET.style === id ? "on" : ""}">${s.name}</button>`).join("");
  bodyEl.innerHTML = `<div class="mapx-head"><span class="mapx-name">${current ? "" : "Map"}</span><span class="mapx-spacer"></span>
    <span class="mapx-seg">${styleSeg}</span>
    <a class="mapx-btn mapx-osm" target="_blank" rel="noopener" title="Open in OpenStreetMap" aria-label="Open in OpenStreetMap">${I_OSM}</a>
    <button type="button" class="mapx-btn mapx-expand" title="Full screen" aria-label="Full screen">${I_EXPAND}</button></div>
    <div class="mapx-chips"></div><div class="mapx-slot"><div class="mapx-map"></div></div>`;
  slotEl = bodyEl.querySelector(".mapx-slot");
  mapEl = bodyEl.querySelector(".mapx-map");
}

function runQuery(q) {
  const g = ++gen;
  geocode(q).then((res) => {
    if (g !== gen || !L) return;
    results = res;
    if (!res.length) { const n = root.querySelector(".mapx-name"); if (n) n.textContent = "No match for “" + q + "”"; return; }
    ensureMap();
    setLocation(res[0], true);
  }, () => {});
}
function handleInput(text) {
  const q = (text || "").trim();
  clearTimeout(debounceT);
  if (!q) return;
  if (!L || !mapEl) { pending = q; return; }     // queue until Leaflet is ready
  debounceT = setTimeout(() => runQuery(q), 450);
}

/* ---- full-screen (moves the one map element into an overlay, then back) ---- */
function openLb() {
  if (lbEl || !map) return;
  lbEl = document.createElement("div"); lbEl.className = "mapx-lb";
  lbEl.innerHTML = `<div class="mapx-lb-bar"><span class="mapx-name">${current ? esc(placeName(current)) : "Map"}</span><span class="mapx-spacer"></span><button type="button" class="mapx-lb-close" aria-label="Close">×</button></div>`;
  document.body.appendChild(lbEl);
  lbEl.appendChild(mapEl);                       // move the live map element in
  map.invalidateSize();
  if (current) map.setView([current.latitude, current.longitude], map.getZoom(), { animate: false });
  lbEl.querySelector(".mapx-lb-close").onclick = closeLb;
  keyHandler = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeLb(); } };
  document.addEventListener("keydown", keyHandler, true);
}
function closeLb() {
  if (keyHandler) { document.removeEventListener("keydown", keyHandler, true); keyHandler = null; }
  if (slotEl && mapEl) slotEl.appendChild(mapEl);
  if (lbEl) { lbEl.remove(); lbEl = null; }
  if (map) setTimeout(() => { map.invalidateSize(); if (current) map.setView([current.latitude, current.longitude], map.getZoom(), { animate: false }); }, 40);
}

function onClick(e) {
  const st = e.target.closest("[data-style]");
  if (st) { SET.style = st.getAttribute("data-style"); persist(); applyStyle(); bodyEl.querySelectorAll("[data-style]").forEach((b) => b.classList.toggle("on", b === st)); return; }
  if (e.target.closest(".mapx-expand")) { openLb(); return; }
  const chip = e.target.closest(".mapx-chip");
  if (chip) { const r = results[+chip.getAttribute("data-i")]; if (r) setLocation(r, true); return; }
}

const HELP = `
<p>Search any place on an <strong>OpenStreetMap</strong> map — no Google, no API key. Type after <kbd>@@</kbd>
and the top match is pinned, with other matches as chips you can click. <kbd>⤢</kbd> (or <kbd>↵</kbd>) opens a
full-screen map; <kbd>esc</kbd> closes it.</p>
<p>Geocoding uses the same keyless Open-Meteo service as the weather. Pick a tile style — <strong>Dark</strong>,
<strong>Light</strong> or <strong>Voyager</strong> (crisp retina tiles from CARTO, built on OpenStreetMap data), or
<strong>OSM</strong> for OpenStreetMap's own tiles. All keyless, no Google.</p>`;

const plugin = {
  hints: [["type", "a place"], ["⤢", "full screen"], ["↵", "expand"]],
  help: HELP,
  mount(rootEl, hostApi) {
    api = hostApi; root = rootEl;
    styleEl = document.createElement("style"); styleEl.textContent = CSS; document.head.appendChild(styleEl);
    root.innerHTML = `<div class="mapx"><div class="mapx-body"><div class="mapx-loading">Loading map…</div></div></div>`;
    bodyEl = root.querySelector(".mapx-body");
    root.addEventListener("click", onClick);
    fit();
    loadLeaflet().then((lib) => {
      L = lib;
      buildScaffold();
      ensureMap();
      fit();
      if (map) { map.invalidateSize(); setTimeout(() => { if (map) map.invalidateSize(); }, 380); }   // re-measure after the panel finishes growing
      if (pending) { const q = pending; pending = null; runQuery(q); }
    }, () => { bodyEl.innerHTML = `<div class="mapx-loading">Couldn't load the map library — is <code>plugins/vendor/</code> deployed?</div>`; });
  },
  onInput(text) { handleInput(text); },
  onEnter() { if (map) openLb(); },
  unmount() {
    closeLb();
    clearTimeout(debounceT);
    if (map) { map.remove(); map = null; }
    if (styleEl) styleEl.remove();
    api = root = bodyEl = slotEl = mapEl = marker = current = tiles = null; results = []; pending = null; gen++;
  },
};
export default plugin;
