// Turns the local dev SQLite database into batched SQL files ready for a real
// Cloudflare D1 database — `wrangler d1 execute` handles a modest file fine, but
// chokes on one file with millions of individual INSERTs, so this batches many
// rows into each INSERT (multi-row VALUES) and splits across numbered files.
//
// Usage: node export-d1.js
// Then:  for f in ../worker/d1-import/*.sql; do
//          npx wrangler d1 execute startpage-lexicon --remote --file="$f"
//        done
// (run from lexicon/worker/, after `wrangler d1 execute ... --file=schema.sql`)
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const DB_PATH = path.join(__dirname, "../data/lexicon.dev.sqlite");
const OUT_DIR = path.join(__dirname, "../worker/d1-import");
const ROWS_PER_INSERT = 300;      // multi-row VALUES per statement
const STMTS_PER_FILE = 400;       // keeps each file a manageable size for `d1 execute --file`

function sqlStr(v) {
  if (v == null) return "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
}
function sqlNum(v) { return v == null ? "NULL" : Number(v); }

function* batches(rows, size) {
  for (let i = 0; i < rows.length; i += size) yield rows.slice(i, i + size);
}

function tableExport(table, columns, rowToValues) {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  db.close();
  const stmts = [];
  for (const batch of batches(rows, ROWS_PER_INSERT)) {
    const values = batch.map((r) => `(${rowToValues(r).join(",")})`).join(",\n");
    stmts.push(`INSERT INTO ${table} (${columns.join(",")}) VALUES\n${values};`);
  }
  return { table, rowCount: rows.length, stmts };
}

function buildExports() {
  return [
    tableExport("word", ["id", "word", "norm", "freq"], (r) => [r.id, sqlStr(r.word), sqlStr(r.norm), sqlNum(r.freq)]),
    tableExport("sense", ["id", "word_id", "pos", "gloss", "examples", "source"], (r) =>
      [r.id, r.word_id, sqlStr(r.pos), sqlStr(r.gloss), sqlStr(r.examples), sqlStr(r.source)]),
    tableExport("rel", ["src_id", "dst_id", "kind", "source"], (r) => [r.src_id, r.dst_id, sqlStr(r.kind), sqlStr(r.source)]),
    tableExport("pron", ["word_id", "ipa", "arpabet", "rhyme_key", "source"], (r) =>
      [r.word_id, sqlStr(r.ipa), sqlStr(r.arpabet), sqlStr(r.rhyme_key), sqlStr(r.source)]),
  ];
}

function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const exports = buildExports();
  let fileN = 0, allStmts = [];
  for (const { table, rowCount, stmts } of exports) {
    console.log(`${table}: ${rowCount} rows -> ${stmts.length} INSERT statements`);
    allStmts.push(...stmts);
  }
  for (const chunk of batches(allStmts, STMTS_PER_FILE)) {
    fileN++;
    const name = `${String(fileN).padStart(4, "0")}.sql`;
    fs.writeFileSync(path.join(OUT_DIR, name), chunk.join("\n\n") + "\n");
  }
  console.log(`\n${allStmts.length} statements across ${fileN} files in ${OUT_DIR}`);
}

main();
