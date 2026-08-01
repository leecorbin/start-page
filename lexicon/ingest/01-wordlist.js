// Source: Moby Word Lists (Grady Ward, public domain) — Project Gutenberg #3201.
// Seeds `word` with every valid English word (so pattern/crossword lookups are
// comprehensive even for words with no definition yet), and emits the local
// client bundle used for offline crossword/pattern/anagram matching.
const fs = require("node:fs");
const path = require("node:path");
const { cached } = require("./lib/download");

const URL = "https://www.gutenberg.org/files/3201/files/single.txt";
const BUNDLE_DIR = path.join(__dirname, "../bundle");

async function run(db, wordId) {
  const file = await cached("moby-single-words.txt", URL);
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const words = [];
  for (const raw of lines) {
    const w = raw.trim();
    if (/^[a-zA-Z]+$/.test(w)) words.push(w);
  }

  db.exec("BEGIN");
  for (const w of words) wordId(w);
  db.exec("COMMIT");

  fs.mkdirSync(BUNDLE_DIR, { recursive: true });
  const sorted = [...new Set(words.map((w) => w.toLowerCase()))].sort();
  fs.writeFileSync(path.join(BUNDLE_DIR, "wordlist.txt"), sorted.join("\n") + "\n");
  fs.writeFileSync(path.join(BUNDLE_DIR, "NOTICE"), NOTICE);

  return words.length;
}

const NOTICE = `This bundle is shipped to the browser for offline crossword / pattern / anagram
lookups in the "??" plugin's crossword mode.

wordlist.txt
  Source: Moby Word Lists, by Grady Ward.
  Licence: Public domain (author grant, January 2001).
  https://www.gutenberg.org/ebooks/3201
`;

module.exports = { run, source: "moby-wordlist" };
