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
 *   GET /dict/health                       -> { ok, counts }
 *
 * Semantic /dict/reverse (Vectorize + Workers AI) is Phase 2 — not implemented yet.
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
  const arpaRow = await db.prepare("SELECT arpabet FROM pron WHERE word_id = ? AND arpabet IS NOT NULL LIMIT 1")
    .bind(word.id).first();

  return json({
    word: word.word,
    senses,
    pron: { ipa: (pronRow && pronRow.ipa) || null, arpabet: (arpaRow && arpaRow.arpabet) || null },
    attribution: attributionFor(senses.map((s) => s.source)),
  });
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
    if (parts[1] === "health") return health(env.DB);
    return json({ error: "not_found" }, 404);
  },
};
