/* start-page plugin: Screen — film / TV / people lookup (trigger "**")
   Keyless entity lookup over Wikidata: type a title or name, pick from the matches,
   and get details — cast, director, genres, ratings (Rotten Tomatoes / IMDb /
   Metacritic, straight from CC0 Wikidata), a Wikipedia plot/bio excerpt, and IMDb /
   RT linkouts. "Full cast & crew" opens the complete list with headshots and the
   characters played. Click any person to see their filmography; click a film to open
   it; ← retraces — the same wander-the-graph feel as the dictionary.
   Sources (all keyless + CORS): Wikidata wbsearchentities + WDQS SPARQL + Wikipedia
   REST. Posters are usually absent from Wikidata (copyright) — we linkout for those;
   people's headshots, however, are present. Part of start-page (MIT).
   Data: Wikidata (CC0), Wikipedia (CC BY-SA). */

const CSS = `
.scp { height: 100%; overflow-y: auto; color: var(--fg, #f4f6fb); font-size: 0.92rem; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.16) transparent; }
.scp::-webkit-scrollbar { width: 8px; }
.scp::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.16); border-radius: 4px; }
.scp::-webkit-scrollbar-track { background: transparent; }
.scp-inner { padding: 0.55rem 0.85rem 0.85rem; display: flex; flex-direction: column; }
.sc-ph { padding: 0.7rem 0.3rem; color: rgba(244,246,251,0.45); font-size: 0.85rem; line-height: 1.7; }
.sc-ph code { background: rgba(255,255,255,0.08); border-radius: 5px; padding: 0.05rem 0.35rem; }
.sc-loading { color: rgba(244,246,251,0.4); font-size: 0.85rem; padding: 0.35rem 0.2rem; }
.sc-none { color: rgba(244,246,251,0.45); font-size: 0.85rem; padding: 0.35rem 0.2rem; }
/* picker */
.sc-hit { display: flex; align-items: baseline; gap: 0.5rem; width: 100%; text-align: left; background: none; border: none; border-radius: 8px; color: var(--fg); font: inherit; padding: 0.4rem 0.5rem; cursor: pointer; }
.sc-hit:hover, .sc-hit.sel { background: rgba(255,255,255,0.09); }
.sc-hit-t { font-weight: 600; }
.sc-hit-d { color: var(--muted, rgba(244,246,251,0.6)); font-size: 0.8rem; }
/* detail */
.sc-nav { display: flex; margin-bottom: 0.5rem; }
.sc-back { flex: none; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; border: 1px solid var(--field-border, rgba(255,255,255,0.18)); background: rgba(255,255,255,0.06); color: var(--fg); cursor: pointer; font-size: 1rem; }
.sc-back:hover { background: rgba(255,255,255,0.14); }
.sc-head { display: flex; gap: 0.7rem; align-items: flex-start; }
.sc-poster { flex: none; width: 66px; height: 96px; object-fit: cover; border-radius: 8px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); }
.sc-htext { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.sc-title { font-size: 1.3rem; font-weight: 600; line-height: 1.15; }
.sc-sub { color: var(--muted, rgba(244,246,251,0.6)); font-size: 0.84rem; }
.sc-links { display: flex; gap: 0.4rem; margin-top: 0.2rem; flex-wrap: wrap; }
.sc-link { font-size: 0.76rem; text-decoration: none; color: var(--fg); background: rgba(255,255,255,0.07); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 999px; padding: 0.1rem 0.55rem; }
.sc-link:hover { background: var(--accent, #5b9bff); border-color: var(--accent, #5b9bff); color: #fff; }
.sc-ratings { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.6rem; }
.sc-rate { font-size: 0.8rem; border-radius: 7px; padding: 0.12rem 0.5rem; background: rgba(255,255,255,0.07); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); white-space: nowrap; }
.sc-rate b { font-weight: 600; }
.sc-rate .ic { font-style: normal; margin-right: 0.15rem; }
.sc-sec { display: flex; flex-direction: column; gap: 0.35rem; border-top: 1px solid rgba(255,255,255,0.08); margin-top: 0.7rem; padding-top: 0.65rem; }
.sc-h { font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted, rgba(244,246,251,0.6)); }
.sc-hint { text-transform: none; letter-spacing: 0; opacity: 0.7; }
.sc-row { display: flex; gap: 0.5rem; align-items: baseline; }
.sc-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; flex: 1; }
.sc-chip { background: rgba(255,255,255,0.07); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 999px; color: var(--fg); font: inherit; font-size: 0.82rem; padding: 0.12rem 0.6rem; cursor: pointer; }
.sc-chip:hover { background: var(--accent, #5b9bff); border-color: var(--accent, #5b9bff); color: #fff; }
.sc-all { margin-top: 0.45rem; width: 100%; text-align: left; background: rgba(255,255,255,0.05); border: 1px solid var(--field-border, rgba(255,255,255,0.18)); border-radius: 8px; color: var(--fg); font: inherit; font-size: 0.8rem; padding: 0.4rem 0.6rem; cursor: pointer; }
.sc-all:hover { background: rgba(255,255,255,0.12); }
.sc-film { display: flex; gap: 0.6rem; align-items: baseline; width: 100%; text-align: left; background: none; border: none; border-radius: 7px; color: var(--fg); font: inherit; padding: 0.22rem 0.4rem; cursor: pointer; }
.sc-film:hover { background: rgba(255,255,255,0.09); }
.sc-film-y { flex: none; width: 2.6rem; color: var(--muted, rgba(244,246,251,0.6)); font-variant-numeric: tabular-nums; font-size: 0.82rem; }
/* credits (full cast & crew) */
.sc-credit { display: flex; gap: 0.6rem; align-items: center; width: 100%; text-align: left; background: none; border: none; border-radius: 8px; color: var(--fg); font: inherit; padding: 0.28rem 0.4rem; cursor: pointer; }
.sc-credit:hover { background: rgba(255,255,255,0.09); }
.sc-thumb { flex: none; width: 42px; height: 42px; border-radius: 8px; object-fit: cover; background: rgba(255,255,255,0.08); }
.sc-thumb-ph { flex: none; width: 42px; height: 42px; border-radius: 8px; display: grid; place-items: center; background: rgba(255,255,255,0.1); color: var(--muted, rgba(244,246,251,0.7)); font-size: 0.95rem; font-weight: 600; }
.sc-credit-t { display: flex; flex-direction: column; min-width: 0; }
.sc-credit-n { font-size: 0.9rem; }
.sc-credit-r { font-size: 0.78rem; color: var(--muted, rgba(244,246,251,0.6)); }
.sc-plot { line-height: 1.45; font-size: 0.88rem; margin: 0; }
.sc-wikilink { color: var(--accent, #5b9bff); text-decoration: none; font-size: 0.82rem; }
.sc-wikilink:hover { text-decoration: underline; }
`;

const PH_HTML = `<div class="sc-ph">Type a <strong>film</strong>, <strong>TV show</strong> or <strong>person</strong> to look it up —
cast, director, genres, ratings and a plot/bio, with IMDb &amp; Rotten Tomatoes links.<br>
Click a name to follow it (cast → filmography → film → …); <code>←</code> retraces.<br>
<span style="opacity:0.7">Keyless — Wikidata &amp; Wikipedia. Try <code>blade runner 2049</code>.</span></div>`;

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const qidOf = (uri) => String(uri || "").split("/").pop();
const https = (u) => String(u || "").replace(/^http:/, "https:");

/* ---- keyless sources (Wikidata + Wikipedia; all CORS) ---- */
async function wdSearch(q) {
  const u = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=en&uselang=en&format=json&limit=10&origin=*`;
  const r = await fetch(u);
  if (!r.ok) return [];
  const j = await r.json();
  const results = (j.search || []).map((x) => ({ id: x.id, label: x.label || x.id, desc: x.description || "" }));
  const isScreen = (d) => /\b(film|movie|tv|television|series|actor|actress|director|animat|miniseries|screenwriter|sitcom|show|documentary|anime|franchise)\b/i.test(d);
  return results.sort((a, b) => (isScreen(b.desc) ? 1 : 0) - (isScreen(a.desc) ? 1 : 0));   // screen entities first (stable sort keeps Wikidata's order otherwise)
}
async function sparql(query, ms = 12000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, { headers: { Accept: "application/sparql-results+json" }, signal: ac.signal });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.results && j.results.bindings) || [];
  } finally { clearTimeout(t); }
}
async function wiki(title) {
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  if (!r.ok) return null;
  const j = await r.json();
  return j && j.extract && j.type !== "disambiguation" ? j : null;
}
async function wikiTitle(id) {   // the entity's exact en.wikipedia article, so the excerpt matches the entity (not a same-named film)
  try {
    const r = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${id}&props=sitelinks&sitefilter=enwiki&format=json&origin=*`);
    if (!r.ok) return null;
    const j = await r.json();
    const e = j.entities && j.entities[id];
    return (e && e.sitelinks && e.sitelinks.enwiki && e.sitelinks.enwiki.title) || null;
  } catch { return null; }
}

const Q_INFO = (id) => `SELECT
 (SAMPLE(?year) AS ?year)(SAMPLE(?dur) AS ?dur)(SAMPLE(?imdb) AS ?imdb)
 (SAMPLE(?rt) AS ?rt)(SAMPLE(?img) AS ?img)(SAMPLE(?birthY) AS ?birthY)
 (GROUP_CONCAT(DISTINCT ?typeLabel;separator=" · ") AS ?types)
 (GROUP_CONCAT(DISTINCT ?genreLabel;separator=" · ") AS ?genres)
 (GROUP_CONCAT(DISTINCT ?occLabel;separator=" · ") AS ?occs)
 (GROUP_CONCAT(DISTINCT ?rating;separator="|") AS ?ratings)
WHERE {
 OPTIONAL{ wd:${id} wdt:P31 ?type. ?type rdfs:label ?typeLabel. FILTER(LANG(?typeLabel)="en") }
 OPTIONAL{ wd:${id} wdt:P136 ?genre. ?genre rdfs:label ?genreLabel. FILTER(LANG(?genreLabel)="en") }
 OPTIONAL{ wd:${id} wdt:P106 ?occ. ?occ rdfs:label ?occLabel. FILTER(LANG(?occLabel)="en") }
 OPTIONAL{ wd:${id} p:P444 ?st. ?st ps:P444 ?sc. OPTIONAL{ ?st pq:P447 ?by. ?by rdfs:label ?byL. FILTER(LANG(?byL)="en") } BIND(CONCAT(COALESCE(?byL,"Rating"),"~",?sc) AS ?rating) }
 OPTIONAL{ wd:${id} wdt:P577 ?d. BIND(YEAR(?d) AS ?year) }
 OPTIONAL{ wd:${id} wdt:P2047 ?dur. }
 OPTIONAL{ wd:${id} wdt:P345 ?imdb. }
 OPTIONAL{ wd:${id} wdt:P1258 ?rt. }
 OPTIONAL{ wd:${id} wdt:P18 ?img. }
 OPTIONAL{ wd:${id} wdt:P569 ?b. BIND(YEAR(?b) AS ?birthY) }
}`;
const Q_PEOPLE = (id) => `SELECT ?role ?p ?pLabel WHERE {
 { wd:${id} wdt:P57 ?p. BIND("d" AS ?role) } UNION { wd:${id} wdt:P161 ?p. BIND("c" AS ?role) }
 SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 24`;
/* P161 (cast) / P57 (director) / P58 (writer) are film/TV-only credits, so no P31
   type filter is needed — and leaving it out keeps WDQS from scanning every film.
   Dedup + sort happen in JS (buildFilmography), so no GROUP BY here. */
const Q_FILMOGRAPHY = (id) => `SELECT ?w ?wLabel ?y ?typeLabel WHERE {
 { ?w wdt:P161 wd:${id} } UNION { ?w wdt:P57 wd:${id} } UNION { ?w wdt:P58 wd:${id} }
 OPTIONAL{ ?w wdt:P577 ?d. BIND(YEAR(?d) AS ?y) }
 OPTIONAL{ ?w wdt:P31 ?type. }
 SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} ORDER BY DESC(?y) LIMIT 250`;
/* full cast with the character played (P453 item, or P4633 string) and a headshot (P18) */
const Q_FULLCAST = (id) => `SELECT ?p ?pLabel ?img ?charLabel ?charStr WHERE {
 wd:${id} p:P161 ?st. ?st ps:P161 ?p.
 OPTIONAL{ ?st pq:P453 ?char. }
 OPTIONAL{ ?st pq:P4633 ?charStr. }
 OPTIONAL{ ?p wdt:P18 ?img. }
 SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 200`;
const Q_CREW = (id) => `SELECT ?role ?p ?pLabel ?img WHERE {
 { wd:${id} wdt:P57 ?p. BIND("Director" AS ?role) }
 UNION { wd:${id} wdt:P58 ?p. BIND("Writer" AS ?role) }
 UNION { wd:${id} wdt:P162 ?p. BIND("Producer" AS ?role) }
 UNION { wd:${id} wdt:P86 ?p. BIND("Composer" AS ?role) }
 UNION { wd:${id} wdt:P344 ?p. BIND("Cinematographer" AS ?role) }
 UNION { wd:${id} wdt:P1040 ?p. BIND("Editor" AS ?role) }
 OPTIONAL{ ?p wdt:P18 ?img. }
 SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 80`;

/* ---- ratings symbols (ala the sources' own marks) ---- */
const RATING_ICONS = [[/rotten|tomato/i, "🍅"], [/imdb/i, "⭐"], [/metacritic/i, "Ⓜ"], [/ebert/i, "👍"]];
function ratingIcon(by, score) {
  for (const [re, ic] of RATING_ICONS) if (re.test(by)) return ic;
  if (/^\d+\s*\/\s*100$/.test(score)) return "Ⓜ";   // a bare NN/100 is a Metacritic metascore even when Wikidata didn't label the source
  return "";
}

/* ---- shape SPARQL rows into a render model ---- */
const V = (b, k) => (b && b[k] && b[k].value) || "";
function buildCore(id, label, infoRows, peopleRows) {
  const info = infoRows[0] || {};
  const types = V(info, "types");
  const directors = [], cast = [];
  for (const b of peopleRows) {
    const it = { id: qidOf(V(b, "p")), label: V(b, "pLabel") };
    if (!it.label) continue;
    (V(b, "role") === "d" ? directors : cast).push(it);
  }
  let ratings = (V(info, "ratings") || "").split("|").filter(Boolean).map((s) => {
    const i = s.lastIndexOf("~"); return { by: s.slice(0, i), score: s.slice(i + 1) };
  });
  const rmap = new Map();                                   // one chip per source; prefer a %-style score (RT tomatometer over its 0–10 average)
  for (const r of ratings) { const c = rmap.get(r.by); if (!c || (/%/.test(r.score) && !/%/.test(c.score))) rmap.set(r.by, r); }
  ratings = [...rmap.values()];
  const img = V(info, "img");
  const isWork = cast.length > 0 || directors.length > 0 || /\b(film|series|television|anime|show|episode)\b/i.test(types);
  const isPerson = !isWork && (/\bhuman\b/i.test(types) || !!V(info, "occs"));
  return {
    id, label,
    kind: isWork ? "work" : isPerson ? "person" : "other",
    types, genres: V(info, "genres"), occs: V(info, "occs"),
    year: V(info, "year"), birthY: V(info, "birthY"), dur: V(info, "dur"),
    imdb: V(info, "imdb"), rt: V(info, "rt"),
    poster: img ? https(img) + "?width=220" : "",           // https → no mixed-content block on the deployed site
    ratings, directors, cast, filmography: { films: [], tv: [] }, wiki: undefined,
  };
}
function buildFilmography(rows) {
  const map = new Map();                                     // one entry per work; collect its P31 type labels
  for (const b of rows) {
    const wid = qidOf(V(b, "w")); if (!wid) continue;
    let e = map.get(wid);
    if (!e) { e = { id: wid, label: V(b, "wLabel"), year: V(b, "y"), types: [] }; map.set(wid, e); }
    if (!e.year && V(b, "y")) e.year = V(b, "y");
    const tl = V(b, "typeLabel"); if (tl) e.types.push(tl);
  }
  const isTV = (e) => e.types.some((t) => /\b(televi|tv |tv$|series|sitcom|miniseries|serial|web series|anime|programme|program)\b/i.test(t));
  const sortDesc = (a, b) => (parseInt(b.year || 0) - parseInt(a.year || 0)) || a.label.localeCompare(b.label);
  const films = [], tv = [];
  for (const e of map.values()) (isTV(e) ? tv : films).push(e);
  films.sort(sortDesc); tv.sort(sortDesc);
  return { films, tv };
}
function buildCredits(castRows, crewRows) {
  const castMap = new Map();
  for (const b of castRows) {
    const pid = qidOf(V(b, "p")); if (!pid) continue;
    const char = V(b, "charLabel") || V(b, "charStr") || "";
    if (!castMap.has(pid)) castMap.set(pid, { id: pid, label: V(b, "pLabel"), img: V(b, "img"), char });
    else { const e = castMap.get(pid); if (!e.char) e.char = char; if (!e.img) e.img = V(b, "img"); }
  }
  const seen = new Set(), crew = [];
  for (const b of crewRows) {
    const pid = qidOf(V(b, "p")), role = V(b, "role"), key = pid + "|" + role;
    if (!pid || seen.has(key)) continue; seen.add(key);
    crew.push({ id: pid, label: V(b, "pLabel"), img: V(b, "img"), role });
  }
  return { cast: [...castMap.values()], crew };
}

/* ---- state ---- */
let api = null, scrollEl = null, innerEl = null, styleEl = null;
let stack = [], gen = 0, cache = {}, searchCache = {}, debounceT = 0, pendingTop = false;
const MAXH = () => Math.min(470, Math.round((window.innerHeight || 800) * 0.62));
function fit() { if (innerEl) api.setHeight(Math.min(innerEl.offsetHeight + 2, MAXH())); }   // +2 avoids a sub-pixel scrollbar when content fits
const cur = () => stack[stack.length - 1] || null;

function toSearch(q) {
  const g = ++gen;
  stack = [{ kind: "picker", q, hits: searchCache[q], loading: !searchCache[q] }];
  render(true);
  const apply = (hits) => {
    if (g !== gen || !cur() || cur().kind !== "picker") return;
    cur().hits = hits; cur().loading = false;
    if (pendingTop && hits && hits.length) { pendingTop = false; openEntity(hits[0].id, hits[0].label, false); return; }
    pendingTop = false; render(false);
  };
  if (searchCache[q]) apply(searchCache[q]);
  else wdSearch(q).then((hits) => { searchCache[q] = hits; apply(hits); }, () => apply([]));
}
function commit(g, id) {   // push the (partially) loaded entity into the current view + re-render
  const c = cur();
  if (g === gen && c && c.kind === "entity" && c.id === id) { c.data = cache[id]; c.loading = false; render(false); }
}
async function loadWiki(g, id, label) {
  let w = null;
  try { const title = await wikiTitle(id); w = await wiki(title || label); } catch {}
  if (cache[id]) { cache[id].wiki = w; commit(g, id); }
}
async function loadEntity(g, id, label) {
  try {
    const [infoRows, peopleRows] = await Promise.all([sparql(Q_INFO(id)).catch(() => []), sparql(Q_PEOPLE(id)).catch(() => [])]);
    const data = buildCore(id, label, infoRows, peopleRows);
    cache[id] = data; commit(g, id);                              // render the core straight away
    if (data.kind === "person") {                                // filmography only matters for people
      const rows = await sparql(Q_FILMOGRAPHY(id)).catch(() => []);
      data.filmography = buildFilmography(rows); commit(g, id);
    }
    loadWiki(g, id, label);
  } catch {
    cache[id] = cache[id] || { id, label, kind: "other", error: true, ratings: [], directors: [], cast: [], filmography: [], wiki: null };
    cache[id].error = true; commit(g, id);
  }
}
function openEntity(id, label, push) {
  const g = ++gen;
  const view = { kind: "entity", id, label, data: cache[id] || null, loading: !cache[id] };
  if (push) stack.push(view); else stack = [view];
  if (api) api.setInput(label);
  render(true);
  if (cache[id]) { if (cache[id].wiki === undefined) loadWiki(g, id, label); return; }
  loadEntity(g, id, label);
}
async function loadCredits(g, fid, key) {
  try {
    const [castRows, crewRows] = await Promise.all([sparql(Q_FULLCAST(fid)).catch(() => []), sparql(Q_CREW(fid)).catch(() => [])]);
    cache[key] = buildCredits(castRows, crewRows);
  } catch { cache[key] = { cast: [], crew: [] }; }
  const c = cur();
  if (g === gen && c && c.kind === "credits" && c.id === fid) { c.data = cache[key]; c.loading = false; render(false); }
}
function openCredits(fid, flabel) {
  const g = ++gen;
  const key = "credits:" + fid;
  stack.push({ kind: "credits", id: fid, label: flabel, data: cache[key] || null, loading: !cache[key] });
  render(true);
  if (!cache[key]) loadCredits(g, fid, key);
}
function back() {
  if (stack.length <= 1) return;
  gen++; stack.pop();
  const c = cur();
  if (api) api.setInput(c.kind === "picker" ? c.q : c.label || "");
  render(false);
}

/* ---- render ---- */
const chip = (it) => `<button type="button" class="sc-chip" data-qid="${esc(it.id)}" data-label="${esc(it.label)}">${esc(it.label)}</button>`;
const navRow = () => stack.length > 1 ? `<div class="sc-nav"><button type="button" class="sc-back" data-act="back" title="Back" aria-label="Back">←</button></div>` : "";
const thumb = (img, name) => img
  ? `<img class="sc-thumb" src="${esc(https(img) + "?width=96")}" alt="" loading="lazy" />`
  : `<div class="sc-thumb-ph">${esc((name || "?").trim().charAt(0).toUpperCase() || "?")}</div>`;
const filmRow = (f) => `<button type="button" class="sc-film" data-qid="${esc(f.id)}" data-label="${esc(f.label)}"><span class="sc-film-y">${esc(f.year || "—")}</span><span>${esc(f.label)}</span></button>`;
function imdbUrl(idv) { return idv.startsWith("nm") ? `https://www.imdb.com/name/${idv}/` : `https://www.imdb.com/title/${idv}/`; }

function pickerView(view) {
  if (view.loading) return `<div class="sc-loading">Searching…</div>`;
  const hits = view.hits || [];
  if (!hits.length) return `<div class="sc-none">No matches for “${esc(view.q)}”.</div>`;
  return hits.map((h) => `<button type="button" class="sc-hit" data-qid="${esc(h.id)}" data-label="${esc(h.label)}"><span class="sc-hit-t">${esc(h.label)}</span>${h.desc ? `<span class="sc-hit-d">${esc(h.desc)}</span>` : ""}</button>`).join("");
}
function entityView(view) {
  if (view.loading || !view.data) {
    return `${navRow()}<div class="sc-head"><div class="sc-htext"><span class="sc-title">${esc(view.label)}</span><span class="sc-sub">Loading…</span></div></div>`;
  }
  const d = view.data;
  const links = [];
  if (d.imdb) links.push(`<a class="sc-link" href="${esc(imdbUrl(d.imdb))}" target="_blank" rel="noopener">IMDb ↗</a>`);
  if (d.rt) links.push(`<a class="sc-link" href="https://www.rottentomatoes.com/${esc(d.rt)}" target="_blank" rel="noopener">Rotten Tomatoes ↗</a>`);

  let sub = d.kind === "person"
    ? [d.occs, d.birthY ? "b. " + d.birthY : ""].filter(Boolean).join(" · ")
    : [d.types, d.year, d.dur ? Math.round(parseFloat(d.dur)) + " min" : "", d.genres].filter(Boolean).join(" · ");

  let html = navRow();
  html += `<div class="sc-head">${d.poster ? `<img class="sc-poster" src="${esc(d.poster)}" alt="" loading="lazy" onerror="this.style.display='none'" />` : ""}<div class="sc-htext"><span class="sc-title">${esc(d.label)}</span>${sub ? `<span class="sc-sub">${esc(sub)}</span>` : ""}${links.length ? `<span class="sc-links">${links.join("")}</span>` : ""}</div></div>`;

  if (d.ratings && d.ratings.length) html += `<div class="sc-ratings">${d.ratings.map((r) => {
    const ic = ratingIcon(r.by, r.score);
    return `<span class="sc-rate" title="${esc(r.by)}">${ic ? `<span class="ic">${ic}</span>` : `<b>${esc(r.by)}</b> `}${esc(r.score)}</span>`;
  }).join("")}</div>`;

  if (d.kind !== "person") {
    if (d.directors && d.directors.length) html += `<div class="sc-sec"><div class="sc-h">Director</div><div class="sc-row"><span class="sc-chips">${d.directors.map(chip).join("")}</span></div></div>`;
    if (d.cast && d.cast.length) html += `<div class="sc-sec"><div class="sc-h">Cast <span class="sc-hint">· click to follow</span></div><div class="sc-chips">${d.cast.slice(0, 18).map(chip).join("")}</div></div>`;
    if ((d.cast && d.cast.length) || (d.directors && d.directors.length)) html += `<button type="button" class="sc-all" data-act="all" data-fid="${esc(d.id)}" data-flabel="${esc(d.label)}">Full cast &amp; crew — with photos &amp; characters →</button>`;
  }
  if (d.kind === "person" && d.filmography) {
    const fg = d.filmography.films ? d.filmography : { films: [], tv: [] };
    const listSec = (title, items) => items && items.length
      ? `<div class="sc-sec"><div class="sc-h">${title} <span class="sc-hint">· newest first · click to open</span></div>${items.slice(0, 30).map(filmRow).join("")}</div>`
      : "";
    html += listSec("Films", fg.films) + listSec("Television", fg.tv);
  }

  if (d.wiki === undefined) html += `<div class="sc-sec"><div class="sc-h">${d.kind === "person" ? "Biography" : "Plot"}</div><div class="sc-loading">…</div></div>`;
  else if (d.wiki && d.wiki.extract) {
    const link = d.wiki.content_urls && d.wiki.content_urls.desktop && d.wiki.content_urls.desktop.page;
    html += `<div class="sc-sec"><div class="sc-h">${d.kind === "person" ? "Biography" : "Plot"}</div><p class="sc-plot">${esc(d.wiki.extract)}</p>${link ? `<a class="sc-wikilink" href="${esc(link)}" target="_blank" rel="noopener">Read on Wikipedia →</a>` : ""}</div>`;
  }
  if (d.error) html += `<div class="sc-none">Couldn't reach Wikidata — try again in a moment.</div>`;
  return html;
}
function creditRow(c, role) {
  return `<button type="button" class="sc-credit" data-qid="${esc(c.id)}" data-label="${esc(c.label)}">${thumb(c.img, c.label)}<span class="sc-credit-t"><span class="sc-credit-n">${esc(c.label)}</span>${role ? `<span class="sc-credit-r">${esc(role)}</span>` : ""}</span></button>`;
}
function creditsView(view) {
  let html = `${navRow()}<div class="sc-head"><div class="sc-htext"><span class="sc-title" style="font-size:1.1rem;">${esc(view.label)}</span><span class="sc-sub">Full cast &amp; crew</span></div></div>`;
  if (view.loading || !view.data) return html + `<div class="sc-loading">Loading cast &amp; crew…</div>`;
  const { cast, crew } = view.data;
  if (cast.length) html += `<div class="sc-sec"><div class="sc-h">Cast <span class="sc-hint">· ${cast.length}</span></div>${cast.map((c) => creditRow(c, c.char)).join("")}</div>`;
  if (crew.length) html += `<div class="sc-sec"><div class="sc-h">Crew</div>${crew.map((c) => creditRow(c, c.role)).join("")}</div>`;
  if (!cast.length && !crew.length) html += `<div class="sc-none">No cast &amp; crew listed on Wikidata.</div>`;
  return html;
}
function render(resetScroll) {
  if (!innerEl) return;
  const sv = scrollEl ? scrollEl.scrollTop : 0;
  const c = cur();
  innerEl.innerHTML = !c ? PH_HTML : c.kind === "picker" ? pickerView(c) : c.kind === "credits" ? creditsView(c) : entityView(c);
  if (scrollEl) scrollEl.scrollTop = resetScroll ? 0 : sv;
  fit();
}

function onClick(e) {
  if (e.target.closest('[data-act="back"]')) { back(); return; }
  const all = e.target.closest('[data-act="all"]');
  if (all) { openCredits(all.getAttribute("data-fid"), all.getAttribute("data-flabel") || ""); return; }
  const hit = e.target.closest("[data-qid]");
  if (hit) { openEntity(hit.getAttribute("data-qid"), hit.getAttribute("data-label") || "", true); return; }
}

const HELP = `
<p>Type a <strong>film</strong>, <strong>TV show</strong> or <strong>person</strong>; pick from the matches and you get
the details. <strong>Click any cast member, director or film</strong> to open <em>it</em> — cast → filmography → film → … —
and <kbd>←</kbd> retraces your trail, just like the dictionary.</p>
<h3>What you get</h3>
<table class="help-keys">
  <tr><td><kbd>films / TV</kbd></td><td>director, cast, genres, year, runtime, a plot excerpt</td></tr>
  <tr><td><kbd>full cast &amp; crew</kbd></td><td>the complete list with headshots and the characters played</td></tr>
  <tr><td><kbd>people</kbd></td><td>roles, a filmography (newest first) and a short bio</td></tr>
  <tr><td><kbd>ratings</kbd></td><td>🍅 Rotten Tomatoes, ⭐ IMDb &amp; Ⓜ Metacritic where available</td></tr>
  <tr><td><kbd>links</kbd></td><td>straight out to IMDb and Rotten Tomatoes</td></tr>
</table>
<p>Keyless — Wikidata (CC0) for the facts, Wikipedia for the write-up. Posters are usually
missing from Wikidata (copyright), so open IMDb for artwork; headshots are present. Needs a connection; results are cached.</p>`;

const plugin = {
  hints: [["click", "follow"], ["↵", "open top match"], ["←", "back"]],
  help: HELP,
  mount(root, hostApi) {
    api = hostApi;
    styleEl = document.createElement("style"); styleEl.textContent = CSS; document.head.appendChild(styleEl);
    root.innerHTML = `<div class="scp"><div class="scp-inner"></div></div>`;
    scrollEl = root.querySelector(".scp");
    innerEl = root.querySelector(".scp-inner");
    stack = []; cache = {}; searchCache = {};
    innerEl.innerHTML = PH_HTML;
    root.addEventListener("click", onClick);
    fit();
  },
  onInput(text) {
    clearTimeout(debounceT);
    pendingTop = false;                                           // browsing, not entering
    const t = (text || "").trim();
    if (!t) { gen++; stack = []; render(true); return; }
    if (searchCache[t]) { toSearch(t); return; }
    debounceT = setTimeout(() => toSearch(t), 350);
  },
  onEnter() {
    clearTimeout(debounceT);
    const c = cur();
    if (c && c.kind === "picker" && c.hits && c.hits.length) { openEntity(c.hits[0].id, c.hits[0].label, false); return; }
    const t = api ? api.getInput().trim() : "";
    if (t) { pendingTop = true; toSearch(t); }                    // search not ready yet → open the top match when it lands
  },
  unmount() {
    if (styleEl) styleEl.remove();
    clearTimeout(debounceT);
    api = scrollEl = innerEl = styleEl = null;
    stack = []; cache = {}; searchCache = {}; pendingTop = false;
  },
};
export default plugin;
