// Source: FrequencyWords (Hermit Dave, opendata-derived word-frequency lists).
// Rank-based 0..1 commonness score, so results can surface common words first.
const fs = require("node:fs");
const { cached } = require("./lib/download");

const URL = "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt";

async function run(db, wordId) {
  const file = await cached("frequency-en50k.txt", URL);
  const lines = fs.readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
  const words = lines.map((l) => l.split(" ")[0]).filter((w) => /^[a-zA-Z']+$/.test(w));

  const setFreq = db.prepare("UPDATE word SET freq = ? WHERE id = ?");
  let rows = 0;
  db.exec("BEGIN");
  const n = words.length;
  words.forEach((w, i) => {
    const id = wordId(w);
    if (id == null) return;
    setFreq.run(1 - i / (n - 1), id);
    rows++;
  });
  db.exec("COMMIT");
  return rows;
}

module.exports = { run, source: "frequency" };
