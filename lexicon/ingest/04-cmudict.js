// Source: CMUdict (Carnegie Mellon, public domain / BSD-2) — ARPABET pronunciations,
// the basis for rhyme / sounds-like lookups. Also derives a rhyme key here (per
// SPEC.md §15's open question: "derive at ingest" rather than compute on demand).
const fs = require("node:fs");
const { cached } = require("./lib/download");

const URL = "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict";
const VOWELS = new Set(["AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"]);

// The "rhyme part" convention: from the last PRIMARY-stressed vowel (stress digit
// '1') to the end, stress digits stripped so e.g. "night" and "light" both key to
// "AY T" and are found as rhyming. Falls back to any vowel if no primary stress
// (rare — some function words are unstressed), or the whole thing if no vowel at all.
function rhymeKey(arpabet) {
  const phones = arpabet.split(/\s+/).filter(Boolean);
  let cut = phones.findLastIndex((p) => VOWELS.has(p.replace(/\d$/, "")) && p.endsWith("1"));
  if (cut < 0) cut = phones.findLastIndex((p) => VOWELS.has(p.replace(/\d$/, "")));
  if (cut < 0) cut = 0;
  return phones.slice(cut).map((p) => p.replace(/\d$/, "")).join(" ");
}

async function run(db, wordId) {
  const file = await cached("cmudict.dict", URL);
  const lines = fs.readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);

  const insertPron = db.prepare("INSERT INTO pron (word_id, arpabet, rhyme_key, source) VALUES (?, ?, ?, 'cmudict')");
  let rows = 0;
  db.exec("BEGIN");
  for (const line of lines) {
    if (line.startsWith(";;;")) continue;
    const sp = line.indexOf(" ");
    if (sp < 0) continue;
    const rawWord = line.slice(0, sp).replace(/\(\d+\)$/, "");   // strip "(2)" alt-pronunciation suffix
    const arpabet = line.slice(sp + 1).trim();
    if (!/^[a-zA-Z']+$/.test(rawWord)) continue;                // skip punctuation-only entries
    const id = wordId(rawWord);
    if (id == null) continue;
    insertPron.run(id, arpabet, rhymeKey(arpabet));
    rows++;
  }
  db.exec("COMMIT");
  return rows;
}

module.exports = { run, source: "cmudict" };
