// Builds the full-text index over sense.gloss — the reverse-dictionary "keyword
// gear" (SPEC.md §9): type a description, find the word, no AI needed. Must run
// after every source that writes to `sense` (it's an external-content FTS5 table,
// so this just tells SQLite to (re)read the content table it indexes).
async function run(db, _wordId) {
  db.exec("INSERT INTO sense_fts(sense_fts) VALUES('rebuild')");
  return db.prepare("SELECT COUNT(*) n FROM sense_fts").get().n;
}

module.exports = { run, source: "reverse-index" };
