// Orchestrator: runs every source into one dev SQLite DB (D1-compatible schema).
// Idempotent-ish: downloads are cached under lexicon/data/, and each source's own
// upsert logic (get-or-create by norm) makes re-runs safe. Usage: node run-all.js
const path = require("node:path");
const { openDb, wordStore, logIngest } = require("./lib/db");

const DB_PATH = path.join(__dirname, "../data/lexicon.dev.sqlite");
const SOURCES = ["01-wordlist", "02-thesaurus", "03-wordnet", "04-cmudict", "05-frequency", "06-wiktextract"];

async function main() {
  const db = openDb(DB_PATH);
  const wordId = wordStore(db);

  for (const name of SOURCES) {
    const mod = require(`./${name}`);
    const t0 = Date.now();
    process.stdout.write(`-> ${mod.source} ... `);
    const rows = await mod.run(db, wordId);
    logIngest(db, mod.source, rows, `${Date.now() - t0}ms`);
    console.log(`${rows} rows (${Date.now() - t0}ms)`);
  }

  const counts = {
    words: db.prepare("SELECT COUNT(*) n FROM word").get().n,
    senses: db.prepare("SELECT COUNT(*) n FROM sense").get().n,
    rels: db.prepare("SELECT COUNT(*) n FROM rel").get().n,
    prons: db.prepare("SELECT COUNT(*) n FROM pron").get().n,
  };
  console.log("\nTotals:", counts);
  db.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
