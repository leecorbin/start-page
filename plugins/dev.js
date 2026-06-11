/* start-page plugin: Dev tools (trigger ";;")
   Keyless developer utilities — number bases + bitwise + an interactive bit grid,
   base64 / URL encode-decode, Unix timestamps, UUID v4, and SHA hashes. All
   client-side, no network. Part of start-page (MIT). */

const CSS = `
.devp { height: 100%; overflow-y: auto; color: var(--fg, #f4f6fb); font-size: 0.92rem; }
.devp-inner { padding: 0.55rem 0.8rem 0.8rem; display: flex; flex-direction: column; gap: 0.6rem; }
.dv-ph { padding: 0.6rem 0.3rem; color: rgba(244,246,251,0.45); font-size: 0.85rem; line-height: 1.85; }
.dv-ph code { background: rgba(255,255,255,0.08); border-radius: 5px; padding: 0.05rem 0.35rem; }
.dv-sec { display: flex; flex-direction: column; gap: 0.32rem; }
.dv-h { font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted, rgba(244,246,251,0.6)); display: flex; align-items: center; gap: 0.5rem; }
.dv-line { display: flex; align-items: baseline; justify-content: space-between; gap: 0.6rem; width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 9px; padding: 0.34rem 0.6rem; color: var(--fg); font: inherit; cursor: pointer; text-align: left; }
.dv-line:hover { background: rgba(255,255,255,0.12); }
.dv-line .k { font-size: 0.6rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted, rgba(244,246,251,0.6)); flex: none; }
.dv-line .v { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.82rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dv-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.dv-grp { display: flex; flex-direction: column; gap: 3px; align-items: center; }
.dv-byte { display: flex; gap: 2px; }
.dv-bit { width: 20px; height: 25px; display: grid; place-items: center; border-radius: 5px; cursor: pointer; font-family: ui-monospace, monospace; font-size: 0.8rem; background: rgba(255,255,255,0.06); color: rgba(244,246,251,0.45); user-select: none; }
.dv-bit.one { background: var(--accent, #5b9bff); color: #fff; }
.dv-bit:hover { outline: 1px solid rgba(255,255,255,0.45); outline-offset: -1px; }
.dv-gidx { font-size: 0.6rem; color: var(--muted, rgba(244,246,251,0.6)); font-family: ui-monospace, monospace; }
.dv-mono { font-family: ui-monospace, Menlo, monospace; }
.dv-err { color: rgba(244,246,251,0.5); font-size: 0.85rem; padding: 0.35rem 0.3rem; line-height: 1.6; }
.dv-mini { background: rgba(255,255,255,0.1); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 6px; color: var(--fg); font: inherit; font-size: 0.7rem; text-transform: none; letter-spacing: 0; padding: 0.05rem 0.45rem; cursor: pointer; }
.dv-mini:hover { background: rgba(255,255,255,0.18); }
.dv-toast { position: absolute; left: 50%; bottom: 11px; transform: translateX(-50%) translateY(8px); background: rgba(12,16,24,0.94); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); color: var(--fg, #f4f6fb); font-size: 0.77rem; padding: 0.3rem 0.75rem; border-radius: 999px; opacity: 0; transition: opacity 0.18s ease, transform 0.18s ease; pointer-events: none; white-space: nowrap; }
.dv-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
`;

const PH_HTML = `<div class="dv-ph">Developer tools — try:<br>
<code>0xF0 &amp; 0x0F</code> · <code>1 &lt;&lt; 8</code> — bits &amp; bases<br>
<code>uuid</code> · <code>uuid 5</code> — generate IDs<br>
<code>ts 1718000000</code> · <code>now</code> — timestamps<br>
<code>b64 hello</code> · <code>url a b&amp;c</code> — encode / decode<br>
<code>sha256 hello</code> — hashes</div>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const line = (k, v) => `<button type="button" class="dv-line" data-copy="${esc(v)}"><span class="k">${k}</span><span class="v">${esc(v)}</span></button>`;

/* ============================ bitwise evaluator (BigInt) ============================ */
function tokB(src) {
  const s = src.toLowerCase().replace(/_/g, ""); const toks = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t") { i++; continue; }
    if (c === "0" && "xbo".includes(s[i + 1])) {
      const k = s[i + 1], re = k === "x" ? /[0-9a-f]/ : k === "b" ? /[01]/ : /[0-7]/;
      let j = i + 2; while (j < s.length && re.test(s[j])) j++;
      if (j === i + 2) throw 0; toks.push({ t: "n", v: BigInt(s.slice(i, j)) }); i = j; continue;
    }
    if (/[0-9]/.test(c)) { let j = i; while (j < s.length && /[0-9]/.test(s[j])) j++; toks.push({ t: "n", v: BigInt(s.slice(i, j)) }); i = j; continue; }
    if (s.startsWith("<<", i) || s.startsWith(">>", i)) { toks.push({ t: s.slice(i, i + 2) }); i += 2; continue; }
    if ("()~*/+-&^|".includes(c)) { toks.push({ t: c }); i++; continue; }
    throw 0;
  }
  return toks;
}
const PREC = { "|": 1, "^": 2, "&": 3, "<<": 4, ">>": 4, "+": 5, "-": 5, "*": 6, "/": 6 };
function evalBits(src) {
  const toks = tokB(src); let p = 0;
  const peek = () => toks[p];
  function atom() {
    const t = peek(); if (!t) throw 0;
    if (t.t === "~") { p++; return ~atom(); }
    if (t.t === "-") { p++; return -atom(); }
    if (t.t === "(") { p++; const v = expr(1); if (!peek() || peek().t !== ")") throw 0; p++; return v; }
    if (t.t === "n") { p++; return t.v; }
    throw 0;
  }
  function expr(min) {
    let l = atom();
    for (;;) {
      const t = peek(); if (!t || !(t.t in PREC) || PREC[t.t] < min) break;
      const op = t.t; p++; const r = expr(PREC[op] + 1);
      l = op === "|" ? l | r : op === "^" ? l ^ r : op === "&" ? l & r : op === "<<" ? l << r : op === ">>" ? l >> r
        : op === "+" ? l + r : op === "-" ? l - r : op === "*" ? l * r : (r === 0n ? (() => { throw 0; })() : l / r);
    }
    return l;
  }
  const v = expr(1);
  if (p !== toks.length) throw 0;
  return v;
}

/* ============================ tools ============================ */
function bitGrid(v, nbits) {
  let groups = "";
  for (let hi = nbits - 1; hi >= 0; hi -= 4) {
    let cells = "";
    for (let b = hi; b > hi - 4; b--) { const on = (v >> BigInt(b)) & 1n; cells += `<div class="dv-bit${on ? " one" : ""}" data-bit="${b}">${on ? 1 : 0}</div>`; }
    const dig = ((v >> BigInt(hi - 3)) & 0xfn).toString(16).toUpperCase();
    groups += `<div class="dv-grp"><div class="dv-byte">${cells}</div><div class="dv-gidx">${dig}</div></div>`;
  }
  return `<div class="dv-grid">${groups}</div>`;
}
function numberTool(v) {
  const neg = v < 0n, av = neg ? -v : v, sg = neg ? "-" : "";
  let html = `<div class="dv-sec"><div class="dv-h">Bases</div>`
    + line("DEC", v.toString())
    + line("HEX", sg + "0x" + av.toString(16).toUpperCase())
    + line("BIN", sg + "0b" + av.toString(2).replace(/\B(?=(.{4})+$)/g, "_"))
    + line("OCT", sg + "0o" + av.toString(8)) + `</div>`;
  if (!neg) {
    const bl = av === 0n ? 1 : av.toString(2).length;
    const nbits = bl <= 8 ? 8 : bl <= 16 ? 16 : bl <= 32 ? 32 : bl <= 64 ? 64 : 0;
    html += nbits
      ? `<div class="dv-sec"><div class="dv-h">Bits — click to toggle</div>${bitGrid(v, nbits)}</div>`
      : `<div class="dv-sec"><div class="dv-h">Bits</div><div class="dv-err">value is wider than 64 bits</div></div>`;
  }
  return html;
}
function uuidv4() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
function uuidTool(t) {
  const m = t.match(/(\d+)/), n = m ? Math.min(20, Math.max(1, +m[1])) : 1;
  let rows = ""; for (let i = 0; i < n; i++) rows += line("UUID", uuidv4());
  return `<div class="dv-sec"><div class="dv-h">UUID v4 <button type="button" class="dv-mini" data-act="regen">↻ new</button></div>${rows}</div>`;
}
function b64encode(str) { const b = new TextEncoder().encode(str); let s = ""; b.forEach((c) => (s += String.fromCharCode(c))); return btoa(s); }
function b64decode(b64) { const s = atob(b64); return new TextDecoder().decode(Uint8Array.from(s, (c) => c.charCodeAt(0))); }
function b64Tool(text) {
  if (!text) return `<div class="dv-err">Type text after <span class="dv-mono">b64</span> to encode — or paste base64 to decode.</div>`;
  let html = `<div class="dv-sec"><div class="dv-h">Base64</div>` + line("ENCODE", b64encode(text));
  const clean = text.replace(/\s/g, "");
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(clean) && clean.length % 4 === 0) { try { html += line("DECODE", b64decode(clean)); } catch {} }
  return html + `</div>`;
}
function urlTool(text) {
  if (!text) return `<div class="dv-err">Type text after <span class="dv-mono">url</span> to encode / decode.</div>`;
  let html = `<div class="dv-sec"><div class="dv-h">URL</div>` + line("ENCODE", encodeURIComponent(text));
  if (/%[0-9a-f]{2}/i.test(text)) { try { html += line("DECODE", decodeURIComponent(text)); } catch {} }
  return html + `</div>`;
}
async function sha(algo, text) {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hashTool(algo, text) {
  if (!text) return `<div class="dv-err">Type text after <span class="dv-mono">${algo.toLowerCase().replace("-", "")}</span> to hash it.</div>`;
  const id = "dv-hash-" + (++hashId), g = gen;
  setTimeout(async () => {
    try { const h = await sha(algo, text); if (g === gen) { const el = document.getElementById(id); if (el) { el.textContent = h; el.closest(".dv-line").setAttribute("data-copy", h); } } } catch {}
  }, 0);
  return `<div class="dv-sec"><div class="dv-h">${algo}</div><button type="button" class="dv-line" data-copy=""><span class="k">${algo.replace("SHA-", "SHA")}</span><span class="v" id="${id}">computing…</span></button></div>`;
}
function tsTool(t) {
  let ms;
  if (/^now\b/i.test(t)) ms = Date.now();
  else {
    const m = t.match(/^ts\s+(.+)$/i);
    if (!m) return `<div class="dv-err">Try <span class="dv-mono">ts 1718000000</span> or <span class="dv-mono">now</span>.</div>`;
    const a = m[1].trim();
    if (/^\d+$/.test(a)) ms = a.length > 11 ? +a : +a * 1000;            // long → already ms, else seconds
    else { const p = Date.parse(a); if (isNaN(p)) return `<div class="dv-err">Couldn't parse that date.</div>`; ms = p; }
  }
  const d = new Date(ms);
  return `<div class="dv-sec"><div class="dv-h">Timestamp</div>`
    + line("UNIX s", String(Math.floor(ms / 1000))) + line("UNIX ms", String(ms))
    + line("ISO", d.toISOString()) + line("LOCAL", d.toLocaleString()) + `</div>`;
}

const after = (t) => t.replace(/^\S+\s?/, "");
function route(input) {
  const t = (input || "").trim();
  if (!t) return PH_HTML;
  const low = t.toLowerCase();
  if (/^uuid\b/.test(low)) return uuidTool(t);
  if (/^now\b/.test(low) || /^ts\b/.test(low)) return tsTool(t);
  if (/^(b64|base64)\b/.test(low)) return b64Tool(after(t));
  if (/^url\b/.test(low)) return urlTool(after(t));
  if (/^sha-?256\b/.test(low)) return hashTool("SHA-256", after(t));
  if (/^sha-?1\b/.test(low)) return hashTool("SHA-1", after(t));
  try { return numberTool(evalBits(t)); } catch {}
  return `<div class="dv-err">Not recognised. Try a number/expression (<span class="dv-mono">0xFF &amp; 0x0F</span>), or <span class="dv-mono">uuid · ts · now · b64 · url · sha256</span>.</div>`;
}

/* ============================ plugin ============================ */
const HELP = `
<p>Type a developer task straight into the box — it routes to the right tool. All keyless and offline.</p>
<h3>Tools</h3>
<table class="help-keys">
  <tr><td><kbd>0x 0b 0o</kbd></td><td>numbers in any base + bitwise <kbd>&amp; | ^ ~ &lt;&lt; &gt;&gt;</kbd> — shows all bases and a bit grid you can click to toggle</td></tr>
  <tr><td><kbd>uuid</kbd></td><td>generate UUID v4 (<kbd>uuid 5</kbd> for five; ↻ for fresh ones)</td></tr>
  <tr><td><kbd>ts · now</kbd></td><td>Unix timestamp ↔ date — <kbd>ts 1718000000</kbd>, <kbd>ts 2026-06-11</kbd>, <kbd>now</kbd></td></tr>
  <tr><td><kbd>b64 · url</kbd></td><td>Base64 and URL encode/decode — <kbd>b64 hello</kbd>, <kbd>url a b&amp;c</kbd></td></tr>
  <tr><td><kbd>sha256 · sha1</kbd></td><td>hashes via the browser's crypto — <kbd>sha256 hello</kbd></td></tr>
</table>
<table class="help-keys">
  <tr><td><kbd>click</kbd></td><td>copy any value</td></tr>
  <tr><td><kbd>esc</kbd></td><td>back to the omnibox</td></tr>
</table>`;

let api = null, scrollEl = null, innerEl = null, toastEl = null, styleEl = null, toastT = 0, gen = 0, hashId = 0;
const MAXH = () => Math.min(470, Math.round((window.innerHeight || 800) * 0.62));
function fit() { if (innerEl) api.setHeight(Math.min(innerEl.offsetHeight, MAXH())); }
function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg; toastEl.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 1100);
}
function render(input) {
  gen++;
  innerEl.innerHTML = input && input.trim() ? route(input) : PH_HTML;
  if (scrollEl) scrollEl.scrollTop = 0;
  fit();
}
function onClick(e) {
  const bit = e.target.closest("[data-bit]");
  if (bit) {                                                          // flip a bit → new value back into the box
    try { const i = +bit.dataset.bit, cur = evalBits(api.getInput()); const nv = cur ^ (1n << BigInt(i)); api.setInput("0x" + (nv < 0n ? 0n : nv).toString(16)); render(api.getInput()); } catch {}
    return;
  }
  if (e.target.closest('[data-act="regen"]')) { render(api.getInput()); return; }
  const cp = e.target.closest("[data-copy]");
  if (cp) { const v = cp.getAttribute("data-copy"); if (v) { try { navigator.clipboard.writeText(v); } catch {} toast("Copied " + (v.length > 42 ? v.slice(0, 42) + "…" : v)); } }
}

const plugin = {
  hints: [["uuid", "ids"], ["ts", "time"], ["b64·url·sha", "text"], ["& | ^ <<", "bits"]],
  help: HELP,
  mount(root, hostApi) {
    api = hostApi;
    styleEl = document.createElement("style"); styleEl.textContent = CSS; document.head.appendChild(styleEl);
    root.innerHTML = `<div class="devp"><div class="devp-inner"></div></div><div class="dv-toast"></div>`;
    scrollEl = root.querySelector(".devp");
    innerEl = root.querySelector(".devp-inner");
    toastEl = root.querySelector(".dv-toast");
    innerEl.innerHTML = PH_HTML;
    root.addEventListener("click", onClick);
    fit();
  },
  onInput(text) { render(text); },
  onEnter() {},
  unmount() {
    if (styleEl) styleEl.remove();
    clearTimeout(toastT);
    api = scrollEl = innerEl = toastEl = styleEl = null;
  },
};
export default plugin;
