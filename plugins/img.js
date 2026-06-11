/* start-page plugin: Image search (trigger "::")
   Keyless, freely-licensed image search — Openverse (CC-licensed, aggregated) or
   Wikimedia Commons. A thumbnail grid in the box; click one to view it large in a
   lightbox with attribution, and ←/→ to browse. Uses the network. Part of start-page (MIT). */

const CSS = `
.imgxp { height: 100%; overflow-y: auto; color: var(--fg, #f4f6fb); }
.imgxp-inner { padding: 0.55rem 0.7rem 0.8rem; display: flex; flex-direction: column; gap: 0.55rem; }
.imgx-ph { padding: 0.7rem 0.3rem; color: rgba(244,246,251,0.45); font-size: 0.85rem; line-height: 1.7; }
.imgx-ph code { background: rgba(255,255,255,0.08); border-radius: 5px; padding: 0.05rem 0.35rem; }
.imgx-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.imgx-seg { display: inline-flex; background: rgba(255,255,255,0.06); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 8px; padding: 2px; gap: 2px; }
.imgx-seg button { border: none; background: none; color: var(--muted, rgba(244,246,251,0.6)); font: inherit; font-size: 0.78rem; padding: 0.16rem 0.55rem; border-radius: 6px; cursor: pointer; }
.imgx-seg button.on { background: rgba(91,155,255,0.26); color: var(--fg, #f4f6fb); }
.imgx-count { font-size: 0.74rem; color: var(--muted, rgba(244,246,251,0.55)); white-space: nowrap; }
.imgx-state { padding: 0.9rem 0.3rem; color: rgba(244,246,251,0.5); font-size: 0.85rem; }
.imgx-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; }
.imgx-cell { padding: 0; border: 1px solid var(--field-border, rgba(255,255,255,0.16)); background: rgba(255,255,255,0.04); border-radius: 9px; overflow: hidden; cursor: zoom-in; aspect-ratio: 1 / 1; }
.imgx-cell img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.25s ease; }
.imgx-cell:hover { border-color: rgba(91,155,255,0.6); }
.imgx-cell:hover img { transform: scale(1.05); }

.imgx-lb { position: fixed; inset: 0; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4vh 4vw; }
.imgx-lb-backdrop { position: absolute; inset: 0; background: rgba(8,11,18,0.88); -webkit-backdrop-filter: blur(7px); backdrop-filter: blur(7px); }
.imgx-lb-fig { position: relative; z-index: 1; margin: 0; display: flex; flex-direction: column; align-items: center; gap: 0.7rem; max-width: 100%; max-height: 100%; }
.imgx-lb-fig img { max-width: 88vw; max-height: 76vh; border-radius: 12px; box-shadow: 0 14px 60px rgba(0,0,0,0.6); object-fit: contain; background: rgba(255,255,255,0.04); }
.imgx-lb-cap { max-width: min(88vw, 760px); text-align: center; color: rgba(244,246,251,0.92); font-size: 0.9rem; line-height: 1.5; }
.imgx-lb-cap .t { font-weight: 600; }
.imgx-lb-cap .m { color: rgba(244,246,251,0.62); font-size: 0.82rem; margin-top: 0.15rem; }
.imgx-lb-cap a { color: #9cc0ff; text-decoration: none; }
.imgx-lb-cap a:hover { text-decoration: underline; }
.imgx-lb-close, .imgx-lb-dl { position: fixed; top: 16px; z-index: 2; width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.22); background: rgba(20,24,32,0.7); color: #fff; cursor: pointer; display: grid; place-items: center; }
.imgx-lb-close { right: 20px; font-size: 1.4rem; line-height: 1; }
.imgx-lb-dl { right: 70px; }
.imgx-lb-dl svg { width: 18px; height: 18px; }
.imgx-lb-close:hover, .imgx-lb-dl:hover { background: rgba(40,46,58,0.9); }
.imgx-lb-nav { position: fixed; top: 50%; transform: translateY(-50%); z-index: 2; width: 46px; height: 64px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.16); background: rgba(20,24,32,0.55); color: #fff; font-size: 1.8rem; line-height: 1; cursor: pointer; display: grid; place-items: center; }
.imgx-lb-nav:hover { background: rgba(40,46,58,0.85); }
.imgx-lb-nav.prev { left: 14px; } .imgx-lb-nav.next { right: 14px; }
.imgx-lb-nav[hidden] { display: none; }
`;

const PH_HTML = `<div class="imgx-ph">Search freely-licensed images — type after <code>::</code>.
Results come from <strong>Openverse</strong> (Creative-Commons) or <strong>Wikimedia Commons</strong>.
Click a thumbnail to view it large with full attribution; <code>←</code>/<code>→</code> browse, <code>esc</code> closes.<br>
<span style="opacity:0.7">Uses the network (keyless). Please respect each image's licence &amp; credit the creator.</span></div>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const stripTags = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

/* ---- plugin-owned settings (own localStorage key; no core involvement) ---- */
const IKEY = "startpage:img";
let SET = (() => { try { return Object.assign({ source: "openverse" }, JSON.parse(localStorage.getItem(IKEY)) || {}); } catch { return { source: "openverse" }; } })();
function persist() { try { localStorage.setItem(IKEY, JSON.stringify(SET)); } catch {} }

/* ---- sources (keyless + CORS), normalised to one shape ---- */
async function searchOpenverse(q) {
  const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=20&mature=false`);   // 20 is the anonymous (keyless) ceiling
  if (!r.ok) throw new Error("openverse " + r.status);
  const j = await r.json();
  return (j.results || []).filter((x) => x.thumbnail && x.url).map((x) => ({
    thumb: x.thumbnail, full: x.url, title: x.title || "Untitled",
    creator: x.creator || "", creatorUrl: x.creator_url || "",
    license: ((x.license || "") + " " + (x.license_version || "")).trim().toUpperCase(),
    licenseUrl: x.license_url || "", source: x.source || "", landing: x.foreign_landing_url || x.url,
  }));
}
async function searchCommons(q) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=400&format=json&origin=*`;
  const r = await fetch(u);
  if (!r.ok) throw new Error("commons " + r.status);
  const j = await r.json();
  const pages = (j.query && j.query.pages ? Object.values(j.query.pages) : []).sort((a, b) => (a.index || 0) - (b.index || 0));
  return pages.filter((p) => p.imageinfo && p.imageinfo[0] && p.imageinfo[0].thumburl).map((p) => {
    const ii = p.imageinfo[0], md = ii.extmetadata || {};
    return {
      thumb: ii.thumburl, full: ii.url, title: (p.title || "").replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, ""),
      creator: stripTags(md.Artist && md.Artist.value), creatorUrl: "",
      license: stripTags(md.LicenseShortName && md.LicenseShortName.value),
      licenseUrl: (md.LicenseUrl && md.LicenseUrl.value) || "", source: "Wikimedia Commons",
      landing: "https://commons.wikimedia.org/wiki/" + encodeURIComponent(p.title),
    };
  });
}
const SOURCES = [{ id: "openverse", label: "Openverse", fn: searchOpenverse }, { id: "wikimedia", label: "Wikimedia", fn: searchCommons }];

/* ---- state ---- */
let api = null, styleEl = null, scrollEl = null, innerEl = null;
let q = "", results = [], gen = 0, loading = false, errMsg = "", debounceT = 0;
let lbEl = null, lbIndex = -1, keyHandler = null;
const MAXH = () => Math.min(500, Math.round((window.innerHeight || 800) * 0.64));
function fit() { if (innerEl) api.setHeight(Math.min(innerEl.offsetHeight, MAXH())); }

function doSearch(query) {
  query = (query || "").trim(); q = query;
  if (!query) { results = []; loading = false; errMsg = ""; gen++; render(); return; }
  const g = ++gen; loading = true; errMsg = ""; results = []; render();
  const src = SOURCES.find((s) => s.id === SET.source) || SOURCES[0];
  src.fn(query).then(
    (list) => { if (g !== gen) return; results = list; loading = false; render(); },
    () => { if (g !== gen) return; loading = false; errMsg = "Couldn't search — offline, or the source is busy."; render(); }
  );
}

/* ---- render (grid) ---- */
function topBar() {
  const segs = SOURCES.map((s) => `<button type="button" data-src="${s.id}" class="${SET.source === s.id ? "on" : ""}">${s.label}</button>`).join("");
  const count = q && !loading && !errMsg ? `<span class="imgx-count">${results.length} result${results.length === 1 ? "" : "s"}</span>` : "";
  return `<div class="imgx-top"><div class="imgx-seg">${segs}</div>${count}</div>`;
}
function render() {
  if (!innerEl) return;
  let html = topBar();
  if (!q) html += PH_HTML;
  else if (loading) html += `<div class="imgx-state">Searching ${esc((SOURCES.find((s) => s.id === SET.source) || SOURCES[0]).label)}…</div>`;
  else if (errMsg) html += `<div class="imgx-state">${esc(errMsg)}</div>`;
  else if (!results.length) html += `<div class="imgx-state">No images for “${esc(q)}”.</div>`;
  else html += `<div class="imgx-grid">${results.map((r, i) => `<button type="button" class="imgx-cell" data-i="${i}" title="${esc(r.title)}"><img src="${esc(r.thumb)}" alt="${esc(r.title)}" loading="lazy" /></button>`).join("")}</div>`;
  innerEl.innerHTML = html;
  if (scrollEl) scrollEl.scrollTop = 0;
  fit();
}

/* ---- lightbox (breaks out of the box, full viewport) ---- */
function capHtml(r) {
  let by = r.creator ? (r.creatorUrl ? `by <a href="${esc(r.creatorUrl)}" target="_blank" rel="noopener">${esc(r.creator)}</a>` : "by " + esc(r.creator)) : "";
  const lic = r.license ? (r.licenseUrl ? `<a href="${esc(r.licenseUrl)}" target="_blank" rel="noopener">${esc(r.license)}</a>` : esc(r.license)) : "";
  const meta = [by, lic, r.source ? esc(r.source) : "", `<a href="${esc(r.landing)}" target="_blank" rel="noopener">source ↗</a>`].filter(Boolean).join(" · ");
  return `<div class="t">${esc(r.title)}</div><div class="m">${meta}</div>`;
}
function paintLb() {
  const r = results[lbIndex]; if (!r || !lbEl) return;
  const multi = results.length > 1;
  const DL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
  lbEl.innerHTML = `<div class="imgx-lb-backdrop" data-act="close"></div>
    <button type="button" class="imgx-lb-nav prev" data-act="prev" aria-label="Previous"${multi ? "" : " hidden"}>‹</button>
    <button type="button" class="imgx-lb-nav next" data-act="next" aria-label="Next"${multi ? "" : " hidden"}>›</button>
    <button type="button" class="imgx-lb-dl" data-act="download" title="Download" aria-label="Download">${DL}</button>
    <button type="button" class="imgx-lb-close" data-act="close" aria-label="Close">×</button>
    <figure class="imgx-lb-fig"><img src="${esc(r.full)}" alt="${esc(r.title)}" /><figcaption class="imgx-lb-cap">${capHtml(r)}</figcaption></figure>`;
}
function openLb(i) {
  lbIndex = i;
  if (!lbEl) {
    lbEl = document.createElement("div"); lbEl.className = "imgx-lb";
    lbEl.addEventListener("click", (e) => {
      const a = e.target.closest("[data-act]"); if (!a) return;
      const act = a.getAttribute("data-act");
      if (act === "close") closeLb(); else if (act === "next") navLb(1); else if (act === "prev") navLb(-1);
      else if (act === "download") downloadImg(results[lbIndex]);
    });
    document.body.appendChild(lbEl);
    keyHandler = (e) => {                                  // capture phase so esc/arrows act on the lightbox, not the omnibox/core
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeLb(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); e.stopImmediatePropagation(); navLb(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopImmediatePropagation(); navLb(-1); }
    };
    document.addEventListener("keydown", keyHandler, true);
  }
  paintLb();
}
function navLb(d) { if (!results.length) return; lbIndex = (lbIndex + d + results.length) % results.length; paintLb(); }
async function downloadImg(r) {                                  // same fetch→blob→<a download> the core uses, with a new-tab fallback
  if (!r || !r.full) return;
  const ext = (r.full.match(/\.(jpe?g|png|webp|gif|avif)(?:[?#]|$)/i) || [, "jpg"])[1].toLowerCase();
  const name = ((r.title || "image").replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "image") + "." + (ext === "jpeg" ? "jpg" : ext);
  try {
    const resp = await fetch(r.full, { mode: "cors" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await resp.blob()); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch { window.open(r.full, "_blank"); }
}
function closeLb() {
  if (keyHandler) { document.removeEventListener("keydown", keyHandler, true); keyHandler = null; }
  if (lbEl) { lbEl.remove(); lbEl = null; }
  lbIndex = -1;
}

function onClick(e) {
  const src = e.target.closest("[data-src]");
  if (src) { const id = src.getAttribute("data-src"); if (id !== SET.source) { SET.source = id; persist(); if (q) doSearch(q); else render(); } return; }
  const cell = e.target.closest(".imgx-cell");
  if (cell) { openLb(+cell.getAttribute("data-i")); return; }
}

const HELP = `
<p>Search <strong>freely-licensed</strong> images without an API key. Type a query after <kbd>::</kbd> and pick a
thumbnail to view it large — with the creator and licence shown, and a link back to the source.</p>
<h3>Sources</h3>
<table class="help-keys">
  <tr><td><kbd>Openverse</kbd></td><td>Creative-Commons &amp; public-domain images aggregated from Flickr, museums, and more</td></tr>
  <tr><td><kbd>Wikimedia</kbd></td><td>Wikimedia Commons — encyclopedic, freely-reusable media</td></tr>
</table>
<h3>In the viewer</h3>
<table class="help-keys">
  <tr><td><kbd>← →</kbd></td><td>browse through the results</td></tr>
  <tr><td><kbd>esc</kbd></td><td>close the viewer (again to leave the plugin)</td></tr>
</table>
<p>Mature content is filtered out. Please honour each image's licence and credit the creator when you reuse it.</p>`;

const plugin = {
  hints: [["type", "to search"], ["click", "view large"], ["← →", "browse"]],
  help: HELP,
  mount(root, hostApi) {
    api = hostApi;
    styleEl = document.createElement("style"); styleEl.textContent = CSS; document.head.appendChild(styleEl);
    root.innerHTML = `<div class="imgxp"><div class="imgxp-inner"></div></div>`;
    scrollEl = root.querySelector(".imgxp");
    innerEl = root.querySelector(".imgxp-inner");
    q = ""; results = []; loading = false; errMsg = "";
    render();
    root.addEventListener("click", onClick);
  },
  onInput(text) {
    clearTimeout(debounceT);
    const t = (text || "").trim();
    if (!t) { doSearch(""); return; }
    debounceT = setTimeout(() => doSearch(t), 450);
  },
  onEnter() { clearTimeout(debounceT); const t = api ? api.getInput().trim() : ""; if (t) doSearch(t); },
  unmount() {
    closeLb();
    if (styleEl) styleEl.remove();
    clearTimeout(debounceT);
    api = scrollEl = innerEl = styleEl = null;
    q = ""; results = []; loading = false; errMsg = "";
  },
};
export default plugin;
