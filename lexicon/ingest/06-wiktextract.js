// Source: Wiktextract / Kaikki.org English dictionary extract (CC BY-SA — the
// only share-alike source, hence kept server-side, never in the client bundle).
//
// PHASE 0 NOTE: the full dump is ~3.2 GB (kaikki.org/dictionary/English/
// kaikki.org-dictionary-English.jsonl) — too large to fetch inside an
// interactive build. This module streams a *sample* by default (see
// lexicon/README.md "Running the full Wiktextract ingest" for how to point it
// at the complete file for a production run — same code path, just a bigger
// input). Streamed line-by-line either way, so memory use doesn't grow with
// file size.
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { DATA_DIR } = require("./lib/download");

const SAMPLE_PATH = path.join(DATA_DIR, "wiktextract-sample.jsonl");
const FILE = process.env.WIKTEXTRACT_FILE || SAMPLE_PATH;
const REL_KIND = { synonyms: "syn", antonyms: "ant", hypernyms: "broader", hyponyms: "narrower", related: "related" };

async function run(db, wordId) {
  if (!fs.existsSync(FILE)) throw new Error(`Wiktextract input not found: ${FILE}`);

  const insertSense = db.prepare("INSERT INTO sense (word_id, pos, gloss, examples, source) VALUES (?, ?, ?, ?, 'wiktionary')");
  const insertRel = db.prepare("INSERT INTO rel (src_id, dst_id, kind, source) VALUES (?, ?, ?, 'wiktionary')");
  const insertPron = db.prepare("INSERT INTO pron (word_id, ipa, source) VALUES (?, ?, 'wiktionary')");

  let rows = 0, skipped = 0;
  db.exec("BEGIN");
  const rl = readline.createInterface({ input: fs.createReadStream(FILE), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let d;
    try { d = JSON.parse(line); }
    catch { skipped++; continue; }   // the ~3.2GB dump has a handful of genuinely truncated lines upstream
    if (d.lang_code && d.lang_code !== "en") continue;
    const id = wordId(d.word);
    if (id == null) continue;

    for (const sense of d.senses || []) {
      const gloss = (sense.glosses || []).join("; ").slice(0, 500);
      if (!gloss) continue;
      const examples = (sense.examples || [])
        .map((e) => e.text).filter(Boolean).slice(0, 2).map((t) => t.slice(0, 240));
      insertSense.run(id, d.pos || null, gloss, JSON.stringify(examples));
      rows++;
    }

    for (const [field, kind] of Object.entries(REL_KIND)) {
      for (const item of d[field] || []) {
        if (!item.word) continue;
        const rid = wordId(item.word);
        if (rid == null || rid === id) continue;
        insertRel.run(id, rid, kind);
        rows++;
      }
    }

    const withIpa = (d.sounds || []).find((s) => s.ipa);
    if (withIpa) { insertPron.run(id, withIpa.ipa); rows++; }
  }
  db.exec("COMMIT");
  if (skipped) console.log(`  (skipped ${skipped} malformed line(s) in the source dump)`);
  return rows;
}

module.exports = { run, source: "wiktionary" };
