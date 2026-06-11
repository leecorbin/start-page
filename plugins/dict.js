/* start-page plugin: Dictionary / lookup (trigger "??")
   Keyless word lookup — definitions + pronunciation (dictionaryapi.dev), a
   thesaurus (Datamuse), a Wikipedia excerpt, and optional slang (Urban
   Dictionary, off by default). Click any word to look it up; ← to retrace.
   The only plugin that hits the network — debounced + cached. Part of start-page (MIT). */

const CSS = `
.dxp { height: 100%; overflow-y: auto; color: var(--fg, #f4f6fb); font-size: 0.92rem; }
.dxp-inner { padding: 0.55rem 0.85rem 0.85rem; display: flex; flex-direction: column; gap: 0.7rem; }
.dx-ph { padding: 0.7rem 0.3rem; color: rgba(244,246,251,0.45); font-size: 0.85rem; line-height: 1.7; }
.dx-ph code { background: rgba(255,255,255,0.08); border-radius: 5px; padding: 0.05rem 0.35rem; }
.dx-head { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.dx-back { flex: none; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; border: 1px solid var(--field-border, rgba(255,255,255,0.18)); background: rgba(255,255,255,0.06); color: var(--fg); cursor: pointer; font-size: 1rem; }
.dx-back:hover { background: rgba(255,255,255,0.14); }
.dx-word { font-size: 1.4rem; font-weight: 600; }
.dx-ipa { font-size: 0.95rem; color: var(--muted, rgba(244,246,251,0.6)); font-family: ui-monospace, Menlo, monospace; }
.dx-audio { flex: none; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; border: none; background: var(--accent, #5b9bff); color: #fff; cursor: pointer; font-size: 0.7rem; }
.dx-audio:hover { filter: brightness(1.1); }
.dx-sec { display: flex; flex-direction: column; gap: 0.35rem; }
.dx-h { font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted, rgba(244,246,251,0.6)); }
.dx-hint { text-transform: none; letter-spacing: 0; opacity: 0.7; }
.dx-loading { color: rgba(244,246,251,0.4); font-size: 0.85rem; padding: 0.1rem 0.2rem; }
.dx-none { color: rgba(244,246,251,0.45); font-size: 0.85rem; padding: 0.1rem 0.2rem; }
.dx-pos { display: flex; flex-direction: column; gap: 0.2rem; margin-bottom: 0.25rem; }
.dx-postag { font-style: italic; font-size: 0.82rem; color: var(--muted, rgba(244,246,251,0.6)); }
.dx-defs { margin: 0; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.25rem; }
.dx-defs li { line-height: 1.4; }
.dx-ex { color: var(--muted, rgba(244,246,251,0.6)); font-style: italic; font-size: 0.86rem; margin-top: 0.1rem; }
.dx-row { display: flex; gap: 0.5rem; align-items: baseline; }
.dx-lab { flex: none; width: 5rem; font-size: 0.72rem; color: var(--muted, rgba(244,246,251,0.6)); }
.dx-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; flex: 1; }
.dx-chip { background: rgba(255,255,255,0.07); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 999px; color: var(--fg); font: inherit; font-size: 0.82rem; padding: 0.12rem 0.6rem; cursor: pointer; }
.dx-chip:hover { background: var(--accent, #5b9bff); border-color: var(--accent, #5b9bff); color: #fff; }
.dx-wiki { display: flex; gap: 0.7rem; align-items: flex-start; }
.dx-thumb { flex: none; width: 72px; height: 72px; object-fit: cover; border-radius: 9px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); }
.dx-wikitext { flex: 1; min-width: 0; }
.dx-wikitext p { margin: 0 0 0.3rem; line-height: 1.45; font-size: 0.88rem; }
.dx-wikilink { color: var(--accent, #5b9bff); text-decoration: none; font-size: 0.82rem; }
.dx-wikilink:hover { text-decoration: underline; }
.dx-urban { line-height: 1.45; font-size: 0.86rem; color: rgba(244,246,251,0.85); }
.dx-switch { display: flex; align-items: center; gap: 0.6rem; width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 9px; padding: 0.5rem 0.6rem; color: var(--fg); font: inherit; cursor: pointer; text-align: left; }
.dx-switch .dx-knob { flex: none; width: 34px; height: 20px; border-radius: 999px; background: rgba(255,255,255,0.18); position: relative; transition: background 0.15s; }
.dx-switch .dx-knob::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform 0.15s; }
.dx-switch.on .dx-knob { background: var(--accent, #5b9bff); }
.dx-switch.on .dx-knob::after { transform: translateX(14px); }
.dx-swlabel em { color: var(--muted, rgba(244,246,251,0.6)); font-style: normal; font-size: 0.82rem; }
.dx-note { font-size: 0.78rem; color: var(--muted, rgba(244,246,251,0.6)); line-height: 1.5; }
.dx-toast { position: absolute; left: 50%; bottom: 11px; transform: translateX(-50%) translateY(8px); background: rgba(12,16,24,0.94); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); color: var(--fg, #f4f6fb); font-size: 0.77rem; padding: 0.3rem 0.75rem; border-radius: 999px; opacity: 0; transition: opacity 0.18s ease, transform 0.18s ease; pointer-events: none; }
.dx-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
`;

const PH_HTML = `<div class="dx-ph">Type a word to look it up — definitions &amp; pronunciation,
a thesaurus (click any word to follow it), and a Wikipedia excerpt. Try <code>serendipity</code>.<br>
<span style="opacity:0.7">Uses the network (keyless) — results are cached as you go. ⚙ enables slang.</span></div>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const stripBrackets = (s) => String(s).replace(/[[\]]/g, "");
function uniq(arr, not) {
  const seen = new Set(not ? [not.toLowerCase()] : []), out = [];
  for (const w of arr) { const k = (w || "").toLowerCase(); if (k && !seen.has(k)) { seen.add(k); out.push(w); } }
  return out;
}

/* ---- plugin-owned settings (own localStorage key; no core involvement) ---- */
const DKEY = "startpage:dict";
let SET = (() => { try { return Object.assign({ urban: false }, JSON.parse(localStorage.getItem(DKEY)) || {}); } catch { return { urban: false }; } })();
function persistSettings() { try { localStorage.setItem(DKEY, JSON.stringify(SET)); } catch {} }

/* ---- sources (all keyless + CORS) ---- */
async function fetchDict(w) {
  const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
  return r.ok ? r.json() : null;
}
async function fetchDatamuse(w) {
  const get = (rel) => fetch(`https://api.datamuse.com/words?${rel}=${encodeURIComponent(w)}&max=14`).then((r) => (r.ok ? r.json() : [])).catch(() => []);
  const [syn, ant, trg] = await Promise.all([get("rel_syn"), get("rel_ant"), get("rel_trg")]);
  return { syn: syn.map((x) => x.word), ant: ant.map((x) => x.word), trg: trg.map((x) => x.word) };
}
async function fetchWiki(w) {
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(w)}`);
  if (!r.ok) return null;
  const j = await r.json();
  return j && j.extract && j.type !== "disambiguation" ? j : null;
}
async function fetchUrban(w) {
  const r = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(w)}`);
  if (!r.ok) return null;
  const j = await r.json();
  return (j.list || []).sort((a, b) => (b.thumbs_up || 0) - (a.thumbs_up || 0)).slice(0, 2);
}

/* ---- state ---- */
let api = null, scrollEl = null, innerEl = null, toastEl = null, styleEl = null, settingsBtn = null;
let term = "", history = [], gen = 0, cache = {}, debounceT = 0, toastT = 0, settingsOpen = false;
const MAXH = () => Math.min(470, Math.round((window.innerHeight || 800) * 0.62));
function fit() { if (innerEl) api.setHeight(Math.min(innerEl.offsetHeight, MAXH())); }
function toast(msg) { if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 1100); }

function lookup(word, push) {
  word = (word || "").trim();
  if (!word) { term = ""; gen++; render(true); return; }
  if (push && term && term.toLowerCase() !== word.toLowerCase()) history.push(term);
  term = word;
  const g = ++gen;
  if (!cache[word]) {
    cache[word] = { dict: undefined, dm: undefined, wiki: undefined, urban: SET.urban ? undefined : null };
    fetchDict(word).then((d) => done(g, word, "dict", d), () => done(g, word, "dict", null));
    fetchDatamuse(word).then((d) => done(g, word, "dm", d), () => done(g, word, "dm", null));
    fetchWiki(word).then((d) => done(g, word, "wiki", d), () => done(g, word, "wiki", null));
    if (SET.urban) fetchUrban(word).then((d) => done(g, word, "urban", d), () => done(g, word, "urban", null));
  }
  render(true);
}
function done(g, word, key, val) {
  if (cache[word]) cache[word][key] = val;
  if (g === gen && term === word && !settingsOpen) render(false);
}

/* ---- render ---- */
const chip = (w) => `<button type="button" class="dx-chip" data-word="${esc(w)}">${esc(w)}</button>`;
const loading = () => `<div class="dx-loading">…</div>`;
function buildView(word, d) {
  const dict = d.dict;
  let phon = "", audio = "";
  if (dict && dict.length) for (const e of dict) for (const p of (e.phonetics || [])) { if (!phon && p.text) phon = p.text; if (!audio && p.audio) audio = p.audio; }
  const back = history.length ? `<button type="button" class="dx-back" data-act="back" title="Back" aria-label="Back">←</button>` : "";
  let html = `<div class="dx-head">${back}<span class="dx-word">${esc(word)}</span>${phon ? `<span class="dx-ipa">${esc(phon)}</span>` : ""}${audio ? `<button type="button" class="dx-audio" data-audio="${esc(audio)}" title="Play pronunciation" aria-label="Play pronunciation">▶</button>` : ""}</div>`;

  html += `<div class="dx-sec"><div class="dx-h">Definitions</div>`;
  if (dict === undefined) html += loading();
  else if (!dict || !dict.length) html += `<div class="dx-none">No dictionary entry found.</div>`;
  else html += dict.flatMap((e) => e.meanings || []).map((m) =>
    `<div class="dx-pos"><span class="dx-postag">${esc(m.partOfSpeech || "")}</span><ol class="dx-defs">${(m.definitions || []).slice(0, 4).map((df) =>
      `<li>${esc(df.definition)}${df.example ? `<div class="dx-ex">“${esc(df.example)}”</div>` : ""}</li>`).join("")}</ol></div>`).join("");
  html += `</div>`;

  const dm = d.dm;
  const fromDict = (kind) => dict && dict.length ? dict.flatMap((e) => (e.meanings || []).flatMap((m) => [...(m[kind] || []), ...(m.definitions || []).flatMap((df) => df[kind] || [])])) : [];
  const syn = uniq([...(dm && dm.syn || []), ...fromDict("synonyms")], word).slice(0, 16);
  const ant = uniq([...(dm && dm.ant || []), ...fromDict("antonyms")], word).slice(0, 12);
  if (dm === undefined && dict === undefined) html += `<div class="dx-sec"><div class="dx-h">Thesaurus</div>${loading()}</div>`;
  else if (syn.length || ant.length) {
    html += `<div class="dx-sec"><div class="dx-h">Thesaurus <span class="dx-hint">· click a word to look it up</span></div>`;
    if (syn.length) html += `<div class="dx-row"><span class="dx-lab">Synonyms</span><span class="dx-chips">${syn.map(chip).join("")}</span></div>`;
    if (ant.length) html += `<div class="dx-row"><span class="dx-lab">Antonyms</span><span class="dx-chips">${ant.map(chip).join("")}</span></div>`;
    html += `</div>`;
  }

  const trg = uniq(dm && dm.trg || [], word).slice(0, 16);
  if (trg.length) html += `<div class="dx-sec"><div class="dx-h">Related</div><div class="dx-chips">${trg.map(chip).join("")}</div></div>`;

  const wiki = d.wiki;
  if (wiki === undefined) html += `<div class="dx-sec"><div class="dx-h">Wikipedia</div>${loading()}</div>`;
  else if (wiki && wiki.extract) {
    const link = wiki.content_urls && wiki.content_urls.desktop && wiki.content_urls.desktop.page;
    const thumb = wiki.thumbnail && wiki.thumbnail.source;
    html += `<div class="dx-sec"><div class="dx-h">Wikipedia</div><div class="dx-wiki">${thumb ? `<img class="dx-thumb" src="${esc(thumb)}" alt="" loading="lazy" />` : ""}<div class="dx-wikitext"><p>${esc(wiki.extract)}</p>${link ? `<a class="dx-wikilink" href="${esc(link)}" target="_blank" rel="noopener">Read on Wikipedia →</a>` : ""}</div></div></div>`;
  }

  if (SET.urban) {
    const urban = d.urban;
    html += `<div class="dx-sec"><div class="dx-h">Urban Dictionary <span class="dx-hint">· slang</span></div>`;
    if (urban === undefined) html += loading();
    else if (urban && urban.length) html += urban.map((u) => `<div class="dx-urban">${esc(stripBrackets(u.definition)).slice(0, 500)}</div>`).join("");
    else html += `<div class="dx-none">No slang entry.</div>`;
    html += `</div>`;
  }
  return html;
}
function settingsView() {
  return `<div class="dx-sec"><div class="dx-h">Sources</div>
    <button type="button" class="dx-switch${SET.urban ? " on" : ""}" data-act="toggle-urban"><span class="dx-knob"></span><span class="dx-swlabel">Urban Dictionary <em>— slang, user-submitted &amp; can be explicit</em></span></button>
    <div class="dx-note">Dictionary, thesaurus and Wikipedia are always on. Toggle applies on your next lookup.</div></div>`;
}
function render(resetScroll) {
  if (!innerEl) return;
  const sv = scrollEl ? scrollEl.scrollTop : 0;
  innerEl.innerHTML = settingsOpen ? settingsView() : (term ? buildView(term, cache[term] || {}) : PH_HTML);
  if (scrollEl) scrollEl.scrollTop = resetScroll ? 0 : sv;
  fit();
}

function onClick(e) {
  const w = e.target.closest("[data-word]");
  if (w) { const word = w.getAttribute("data-word"); if (api) api.setInput(word); lookup(word, true); return; }
  if (e.target.closest('[data-act="back"]')) { if (history.length) { const p = history.pop(); if (api) api.setInput(p); lookup(p, false); } return; }
  const au = e.target.closest("[data-audio]");
  if (au) { try { new Audio(au.getAttribute("data-audio")).play(); } catch {} return; }
  if (e.target.closest('[data-act="toggle-urban"]')) { SET.urban = !SET.urban; persistSettings(); cache = {}; render(false); return; }
}
function toggleSettings() {
  settingsOpen = !settingsOpen;
  if (settingsBtn) settingsBtn.classList.toggle("active", settingsOpen);
  if (!settingsOpen && term) lookup(term, false); else render(false);
}

const HELP = `
<p>Type a word — it's looked up across a dictionary, a thesaurus and Wikipedia (all keyless).
<strong>Click any synonym, antonym or related word</strong> to look <em>it</em> up; <kbd>←</kbd> retraces your trail
(the same wander-the-thesaurus feel as the colour lab).</p>
<h3>What you get</h3>
<table class="help-keys">
  <tr><td><kbd>definitions</kbd></td><td>by part of speech, with examples — and <kbd>▶</kbd> plays the pronunciation where available</td></tr>
  <tr><td><kbd>thesaurus</kbd></td><td>synonyms, antonyms &amp; related words (Datamuse + the dictionary)</td></tr>
  <tr><td><kbd>wikipedia</kbd></td><td>a summary excerpt with a link, when an article exists</td></tr>
  <tr><td><kbd>⚙</kbd></td><td>turn on <strong>Urban Dictionary</strong> for slang (off by default; user-submitted, can be explicit)</td></tr>
</table>
<p>This is the one plugin that uses the network, so it needs a connection — lookups are debounced and cached as you go.</p>`;

const plugin = {
  hints: [["click", "follow a word"], ["←", "back"], ["⚙", "slang"]],
  help: HELP,
  mount(root, hostApi) {
    api = hostApi;
    styleEl = document.createElement("style"); styleEl.textContent = CSS; document.head.appendChild(styleEl);
    root.innerHTML = `<div class="dxp"><div class="dxp-inner"></div></div><div class="dx-toast"></div>`;
    scrollEl = root.querySelector(".dxp");
    innerEl = root.querySelector(".dxp-inner");
    toastEl = root.querySelector(".dx-toast");
    term = ""; history = []; cache = {}; settingsOpen = false;
    innerEl.innerHTML = PH_HTML;
    root.addEventListener("click", onClick);
    const GEAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
    const made = api.setButtons ? api.setButtons([{ title: "Sources & options", svg: GEAR, onClick: toggleSettings }]) : [];
    settingsBtn = made[0] || null;
    fit();
  },
  onInput(text) {
    clearTimeout(debounceT);
    const t = (text || "").trim();
    if (!t) { settingsOpen = false; lookup(""); return; }
    if (cache[t]) { lookup(t, true); return; }                    // instant from cache
    debounceT = setTimeout(() => lookup(t, true), 400);           // debounce the network call
  },
  onEnter() { clearTimeout(debounceT); const t = api ? api.getInput().trim() : ""; if (t) lookup(t, true); },
  unmount() {
    if (styleEl) styleEl.remove();
    clearTimeout(debounceT); clearTimeout(toastT);
    api = scrollEl = innerEl = toastEl = styleEl = settingsBtn = null;
    term = ""; history = []; cache = {}; settingsOpen = false;
  },
};
export default plugin;
