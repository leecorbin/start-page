// Source: Moby Thesaurus II (Grady Ward, public domain) — Project Gutenberg #3202.
// One line per headword: "word,syn1,syn2,...". This is what makes the thesaurus
// extensive — far more results than the old Datamuse-backed "??" ever showed.
const fs = require("node:fs");
const { cached } = require("./lib/download");

const URL = "https://www.gutenberg.org/files/3202/files/mthesaur.txt";

async function run(db, wordId) {
  const file = await cached("moby-thesaurus.txt", URL);
  const lines = fs.readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);

  const insertRel = db.prepare("INSERT INTO rel (src_id, dst_id, kind, source) VALUES (?, ?, 'syn', 'moby')");
  let rows = 0;
  db.exec("BEGIN");
  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const headId = wordId(parts[0]);
    if (headId == null) continue;
    for (let i = 1; i < parts.length; i++) {
      const synId = wordId(parts[i]);
      if (synId == null || synId === headId) continue;
      insertRel.run(headId, synId);
      rows++;
    }
  }
  db.exec("COMMIT");
  return rows;
}

module.exports = { run, source: "moby-thesaurus" };
