// Source: CMUdict (Carnegie Mellon, public domain / BSD-2) — ARPABET pronunciations,
// the basis for rhyme / sounds-like lookups later.
const fs = require("node:fs");
const { cached } = require("./lib/download");

const URL = "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict";

async function run(db, wordId) {
  const file = await cached("cmudict.dict", URL);
  const lines = fs.readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);

  const insertPron = db.prepare("INSERT INTO pron (word_id, arpabet, source) VALUES (?, ?, 'cmudict')");
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
    insertPron.run(id, arpabet);
    rows++;
  }
  db.exec("COMMIT");
  return rows;
}

module.exports = { run, source: "cmudict" };
