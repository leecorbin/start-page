/* start-page lexicon — keyless dictionary / thesaurus / crossword-pattern API.
 *
 * Reads from D1, populated by ../../ingest/run-all.js (see ../../SPEC.md). The
 * client never sees a key — the only credential is this Worker's own D1
 * binding. Every response carries its `attribution` so the UI can credit
 * sources; additive-only contract — add fields, never remove/rename (SPEC §8).
 *
 * D1 binding: DB   (see wrangler.toml)
 * Routes:
 *   GET /dict/define?w=<word>              -> { word, senses[], pron, attribution }
 *   GET /dict/thesaurus?w=<word>           -> { word, groups{}, attribution }
 *   GET /dict/pattern?p=F?SH&max=50        -> { pattern, matches[], attribution }  (usually answered locally; parity/rare-word fallback)
 *   GET /dict/rhyme?w=<word>&max=50        -> { word, rhymeKey, matches[], attribution }
 *   GET /dict/reverse?q=<description>&max=20&sp=<optional pattern>
 *                                           -> { query, candidates[], engine, attribution }
 *   GET /dict/health                       -> { ok, counts }
 *
 * /dict/reverse is Gear 1 only (FTS5 keyword/BM25 over sense.gloss — SPEC.md §9):
 * describe a word, find it, no AI. Good for concrete descriptions that share real
 * vocabulary with a definition ("a place where books are kept" -> library, "fear of
 * spiders" -> arachnophobia, both rank #1 — verified). Weaker for abstract phrasing
 * that doesn't literally overlap with how a word is defined — that gap is exactly
 * what Gear 2 (Vectorize + Workers AI, Phase 2) is for, not a bug here.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",              // read-only public reference data, no secrets
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

const ATTRIBUTION = {
  wiktionary: { source: "Wiktionary (via Wiktextract)", licence: "CC BY-SA 4.0", url: "https://en.wiktionary.org" },
  wordnet: { source: "Open English WordNet", licence: "CC BY 4.0", url: "https://github.com/globalwordnet/english-wordnet" },
  moby: { source: "Moby Thesaurus / Word Lists (Grady Ward)", licence: "Public domain", url: "https://www.gutenberg.org/ebooks/3201" },
  cmudict: { source: "CMUdict", licence: "Public domain (BSD-2)", url: "https://github.com/cmusphinx/cmudict" },
};
function attributionFor(sources) {
  return [...new Set(sources)].map((s) => ATTRIBUTION[s]).filter(Boolean);
}

async function findWord(db, w) {
  const norm = (w || "").trim().toLowerCase();
  if (!norm) return null;
  const row = await db.prepare("SELECT id, word FROM word WHERE norm = ?").bind(norm).first();
  return row || null;
}

async function define(db, w) {
  const word = await findWord(db, w);
  if (!word) return json({ word: w, senses: [], pron: null, attribution: [] });

  const senses = (await db.prepare(
    "SELECT pos, gloss, examples, source FROM sense WHERE word_id = ? ORDER BY (source='wiktionary') DESC, id"
  ).bind(word.id).all()).results.map((s) => ({ ...s, examples: JSON.parse(s.examples || "[]") }));

  const pronRow = await db.prepare("SELECT ipa, arpabet FROM pron WHERE word_id = ? AND ipa IS NOT NULL LIMIT 1")
    .bind(word.id).first();
  const arpaRow = await db.prepare("SELECT arpabet, rhyme_key FROM pron WHERE word_id = ? AND arpabet IS NOT NULL LIMIT 1")
    .bind(word.id).first();

  return json({
    word: word.word,
    senses,
    pron: {
      ipa: (pronRow && pronRow.ipa) || null,
      arpabet: (arpaRow && arpaRow.arpabet) || null,
      rhymeKey: (arpaRow && arpaRow.rhyme_key) || null,
    },
    attribution: attributionFor(senses.map((s) => s.source)),
  });
}

async function rhyme(db, w, max) {
  const word = await findWord(db, w);
  if (!word) return json({ word: w, rhymeKey: null, matches: [], attribution: [] });

  const self = await db.prepare("SELECT rhyme_key FROM pron WHERE word_id = ? AND rhyme_key IS NOT NULL LIMIT 1")
    .bind(word.id).first();
  if (!self) return json({ word: word.word, rhymeKey: null, matches: [], attribution: [] });

  const rows = (await db.prepare(
    `SELECT DISTINCT dst.word AS word, dst.freq AS freq
     FROM pron p JOIN word dst ON dst.id = p.word_id
     WHERE p.rhyme_key = ? AND dst.norm != ?
     ORDER BY dst.freq DESC, dst.word LIMIT ?`
  ).bind(self.rhyme_key, word.word.toLowerCase(), Math.min(Math.max(Number(max) || 50, 1), 200)).all()).results;

  return json({ word: word.word, rhymeKey: self.rhyme_key, matches: rows.map((r) => r.word), attribution: attributionFor(["cmudict"]) });
}

const REL_GROUPS = { synonyms: "syn", antonyms: "ant", broader: "broader", narrower: "narrower", related: "related" };

async function thesaurus(db, w) {
  const word = await findWord(db, w);
  if (!word) return json({ word: w, groups: {}, attribution: [] });

  const groups = {};
  const sources = new Set();
  for (const [label, kind] of Object.entries(REL_GROUPS)) {
    const rows = (await db.prepare(
      `SELECT DISTINCT dst.word AS word, r.source AS source, dst.freq AS freq
       FROM rel r JOIN word dst ON dst.id = r.dst_id
       WHERE r.src_id = ? AND r.kind = ?
       ORDER BY dst.freq DESC LIMIT 60`
    ).bind(word.id, kind).all()).results;
    if (rows.length) { groups[label] = rows.map((r) => r.word); rows.forEach((r) => sources.add(r.source)); }
  }
  return json({ word: word.word, groups, attribution: attributionFor(sources) });
}

function likePattern(p) {
  const escaped = p.replace(/[\\%_]/g, "\\$&");
  return escaped.replace(/\?/g, "_").replace(/\*/g, "%");
}

async function pattern(db, p, max) {
  if (!p) return json({ pattern: p, matches: [], attribution: [] });
  const like = likePattern(p.toLowerCase());
  const rows = (await db.prepare(
    "SELECT word FROM word WHERE norm LIKE ? ESCAPE '\\' ORDER BY freq DESC, norm LIMIT ?"
  ).bind(like, Math.min(Math.max(Number(max) || 50, 1), 200)).all()).results;
  return json({ pattern: p, matches: rows.map((r) => r.word), attribution: attributionFor(["moby"]) });
}

const STOPWORDS = new Set(("a an the of to in on for with is are was were that which it its as or and be being been " +
  "having has have had do does did at by from this these those i you he she they we").split(" "));

// Builds an FTS5 query: significant terms OR'd together, each quoted so stray
// punctuation in free text can't break MATCH syntax.
function reverseQuery(q) {
  const terms = (q || "").toLowerCase().match(/[a-z']+/g) || [];
  const significant = [...new Set(terms.filter((t) => t.length > 1 && !STOPWORDS.has(t)))];
  return significant.map((t) => `"${t.replace(/"/g, '""')}"`).join(" OR ");
}

function patternRegex(p) {
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*").replace(/\\\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

async function reverse(db, q, max, sp) {
  const fts = reverseQuery(q);
  if (!fts) return json({ query: q, candidates: [], engine: "keyword", attribution: [] });

  // over-fetch raw sense hits (bm25 can't be combined with GROUP BY/window functions
  // in SQLite's FTS5), then dedupe-by-word and cap in JS
  const rows = (await db.prepare(
    `SELECT w.word AS word, s.gloss AS gloss, s.pos AS pos, s.source AS source, bm25(sense_fts) AS score
     FROM sense_fts JOIN sense s ON s.id = sense_fts.rowid JOIN word w ON w.id = s.word_id
     WHERE sense_fts MATCH ? ORDER BY bm25(sense_fts) LIMIT 300`
  ).bind(fts).all()).results;

  const re = sp ? patternRegex(sp) : null;
  const seen = new Set(), candidates = [], sources = new Set();
  const wanted = Math.min(Math.max(Number(max) || 20, 1), 60);
  for (const r of rows) {
    if (seen.has(r.word)) continue;
    if (re && !re.test(r.word)) continue;
    seen.add(r.word); sources.add(r.source);
    candidates.push({ word: r.word, gloss: r.gloss, pos: r.pos, score: r.score });
    if (candidates.length >= wanted) break;
  }
  return json({ query: q, candidates, engine: "keyword", attribution: attributionFor(sources) });
}

async function health(db) {
  const count = async (table) => (await db.prepare(`SELECT COUNT(*) n FROM ${table}`).first()).n;
  return json({
    ok: true,
    counts: { words: await count("word"), senses: await count("sense"), rels: await count("rel"), prons: await count("pron") },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");   // dict / define|thesaurus|pattern|health
    if (parts[0] !== "dict") return json({ error: "not_found" }, 404);

    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
    if (parts[1] === "define") return define(env.DB, url.searchParams.get("w"));
    if (parts[1] === "thesaurus") return thesaurus(env.DB, url.searchParams.get("w"));
    if (parts[1] === "pattern") return pattern(env.DB, url.searchParams.get("p"), url.searchParams.get("max"));
    if (parts[1] === "rhyme") return rhyme(env.DB, url.searchParams.get("w"), url.searchParams.get("max"));
    if (parts[1] === "reverse") return reverse(env.DB, url.searchParams.get("q"), url.searchParams.get("max"), url.searchParams.get("sp"));
    if (parts[1] === "health") return health(env.DB);
    return json({ error: "not_found" }, 404);
  },
};
