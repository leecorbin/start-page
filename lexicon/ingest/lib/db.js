const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

function openDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(fs.readFileSync(path.join(__dirname, "../../worker/schema.sql"), "utf8"));
  return db;
}

// One `word` row per norm form, created on first sight and reused after.
function wordStore(db) {
  const find = db.prepare("SELECT id FROM word WHERE norm = ?");
  const insert = db.prepare("INSERT INTO word (word, norm, freq) VALUES (?, ?, 0)");
  const cache = new Map();
  return function getOrCreate(word) {
    const norm = word.trim().toLowerCase();
    if (!norm) return null;
    if (cache.has(norm)) return cache.get(norm);
    const row = find.get(norm);
    const id = row ? row.id : Number(insert.run(word.trim(), norm).lastInsertRowid);
    cache.set(norm, id);
    return id;
  };
}

function logIngest(db, source, rows, note) {
  db.prepare("INSERT OR REPLACE INTO ingest_log (source, rows, note, run_at) VALUES (?, ?, ?, ?)")
    .run(source, rows, note || null, new Date().toISOString());
}

module.exports = { openDb, wordStore, logIngest };
