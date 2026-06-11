/* start-page plugin: Text (trigger ",,")
   Keyless text transforms — every case (UPPER/lower/Title/camel/snake/kebab/…),
   slug, reverse, trim, and counts. Paste or type; click any result to copy.
   Part of start-page (MIT). */

const CSS = `
.txp { height: 100%; overflow-y: auto; color: var(--fg, #f4f6fb); font-size: 0.92rem; }
.txp-inner { padding: 0.55rem 0.8rem 0.8rem; display: flex; flex-direction: column; gap: 0.6rem; }
.tx-ph { padding: 0.7rem 0.3rem; color: rgba(244,246,251,0.45); font-size: 0.85rem; line-height: 1.7; }
.tx-ph code { background: rgba(255,255,255,0.08); border-radius: 5px; padding: 0.05rem 0.35rem; }
.tx-sec { display: flex; flex-direction: column; gap: 0.32rem; }
.tx-h { font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted, rgba(244,246,251,0.6)); }
.tx-line { display: flex; align-items: baseline; justify-content: space-between; gap: 0.6rem; width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 9px; padding: 0.34rem 0.6rem; color: var(--fg); font: inherit; cursor: pointer; text-align: left; }
.tx-line:hover { background: rgba(255,255,255,0.12); }
.tx-line .k { font-size: 0.6rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted, rgba(244,246,251,0.6)); flex: none; }
.tx-line .v { font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tx-stats { font-size: 0.82rem; color: var(--muted, rgba(244,246,251,0.7)); font-variant-numeric: tabular-nums; }
.tx-toast { position: absolute; left: 50%; bottom: 11px; transform: translateX(-50%) translateY(8px); background: rgba(12,16,24,0.94); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); color: var(--fg, #f4f6fb); font-size: 0.77rem; padding: 0.3rem 0.75rem; border-radius: 999px; opacity: 0; transition: opacity 0.18s ease, transform 0.18s ease; pointer-events: none; white-space: nowrap; }
.tx-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
`;

const PH_HTML = `<div class="tx-ph">Paste or type text (after <code>,,</code>) — get every case
(<code>UPPER</code>, <code>lower</code>, <code>Title</code>, <code>camelCase</code>,
<code>snake_case</code>, <code>kebab-case</code>…), a <code>slug</code>, reverse, trimmed,
and counts. Click any to copy.</div>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const copyLine = (k, v) => `<button type="button" class="tx-line" data-copy="${esc(v)}"><span class="k">${k}</span><span class="v">${esc(v) || "—"}</span></button>`;

/* ---- transforms ---- */
const cap = (w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w);
function words(s) {                                                 // split into words across spaces, punctuation and camelCase
  return s.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}
const CASES = {
  "UPPERCASE": (s) => s.toUpperCase(),
  "lowercase": (s) => s.toLowerCase(),
  "Title Case": (s) => s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, p, c) => p + c.toUpperCase()),
  "Sentence case": (s) => s.toLowerCase().replace(/(^\s*|[.!?]+\s+)(\p{L})/gu, (m, p, c) => p + c.toUpperCase()),
  "camelCase": (s) => words(s).map((x, i) => (i ? cap(x) : x.toLowerCase())).join(""),
  "PascalCase": (s) => words(s).map(cap).join(""),
  "snake_case": (s) => words(s).map((x) => x.toLowerCase()).join("_"),
  "kebab-case": (s) => words(s).map((x) => x.toLowerCase()).join("-"),
  "CONSTANT_CASE": (s) => words(s).map((x) => x.toUpperCase()).join("_"),
};
const slug = (s) => s.trim().toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const reverse = (s) => [...s].reverse().join("");
const trimmed = (s) => s.trim().replace(/\s+/g, " ");
const nospace = (s) => s.replace(/\s+/g, "");

function buildHtml(s) {
  let html = `<div class="tx-sec"><div class="tx-h">Case</div>` + Object.entries(CASES).map(([k, fn]) => copyLine(k, fn(s))).join("") + `</div>`;
  html += `<div class="tx-sec"><div class="tx-h">Transform</div>${copyLine("Slug", slug(s))}${copyLine("Reverse", reverse(s))}${copyLine("Trimmed", trimmed(s))}${copyLine("No spaces", nospace(s))}</div>`;
  const chars = [...s].length, wc = words(s).length, bytes = new TextEncoder().encode(s).length, lines = s.split(/\r\n|\r|\n/).length;
  html += `<div class="tx-sec"><div class="tx-h">Count</div><div class="tx-stats">${chars} chars · ${wc} words${lines > 1 ? " · " + lines + " lines" : ""} · ${bytes} bytes</div></div>`;
  return html;
}

/* ---- plugin ---- */
const HELP = `
<p>Paste or type any text into the box — it's transformed every which way, and each result is
click-to-copy. (Pasting into the box needs no clipboard permission; the <kbd>×</kbd> clears it for the next one.)</p>
<h3>What you get</h3>
<table class="help-keys">
  <tr><td><kbd>case</kbd></td><td>UPPER · lower · Title · Sentence · camelCase · PascalCase · snake_case · kebab-case · CONSTANT_CASE</td></tr>
  <tr><td><kbd>slug</kbd></td><td>URL-friendly — lowercase, hyphens, accents stripped</td></tr>
  <tr><td><kbd>reverse</kbd></td><td>flip the string (handles emoji)</td></tr>
  <tr><td><kbd>trimmed</kbd></td><td>trim + collapse runs of whitespace; or strip all spaces</td></tr>
  <tr><td><kbd>count</kbd></td><td>characters, words, lines and UTF-8 bytes</td></tr>
</table>`;

let api = null, scrollEl = null, innerEl = null, toastEl = null, styleEl = null, toastT = 0;
const MAXH = () => Math.min(470, Math.round((window.innerHeight || 800) * 0.62));
function fit() { if (innerEl) api.setHeight(Math.min(innerEl.offsetHeight, MAXH())); }
function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg; toastEl.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 1100);
}
function render(text) {
  innerEl.innerHTML = text && text.length ? buildHtml(text) : PH_HTML;   // note: not trimmed — leading/trailing space is meaningful here
  if (scrollEl) scrollEl.scrollTop = 0;
  fit();
}
function onClick(e) {
  const el = e.target.closest("[data-copy]"); if (!el) return;
  const v = el.getAttribute("data-copy");
  try { navigator.clipboard.writeText(v); } catch {}
  toast("Copied " + (v.length > 42 ? v.slice(0, 42) + "…" : v));
}

const plugin = {
  hints: [["paste", "or type"], ["click", "copy"]],
  help: HELP,
  mount(root, hostApi) {
    api = hostApi;
    styleEl = document.createElement("style"); styleEl.textContent = CSS; document.head.appendChild(styleEl);
    root.innerHTML = `<div class="txp"><div class="txp-inner"></div></div><div class="tx-toast"></div>`;
    scrollEl = root.querySelector(".txp");
    innerEl = root.querySelector(".txp-inner");
    toastEl = root.querySelector(".tx-toast");
    innerEl.innerHTML = PH_HTML;
    root.addEventListener("click", onClick);
    fit();
  },
  onInput(text) { render(text || ""); },
  onEnter() {},
  unmount() {
    if (styleEl) styleEl.remove();
    clearTimeout(toastT);
    api = scrollEl = innerEl = toastEl = styleEl = null;
  },
};
export default plugin;
