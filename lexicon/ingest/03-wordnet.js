// Source: Open English WordNet 2025 edition (CC BY 4.0) — structured synonym /
// antonym / hypernym / hyponym relations, plus a definition per sense.
// Format: entries-*.json map "word" -> {pos: {sense: [{id, synset, antonym?}]}};
// the POS/category files (noun.*.json etc) map synset id -> {definition, example,
// hypernym, members, ...}. See https://github.com/globalwordnet/english-wordnet.
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");
const { cached, DATA_DIR } = require("./lib/download");

const URL = "https://github.com/globalwordnet/english-wordnet/releases/download/2025-edition/english-wordnet-2025-json.zip";
const POS_NAME = { n: "noun", v: "verb", a: "adj", r: "adv", s: "adj" };

function unzipOnce(zipPath) {
  const dir = path.join(DATA_DIR, "wordnet-json");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    execSync(`unzip -q -o "${zipPath}" -d "${dir}"`);
  }
  return dir;
}

function loadJson(dir, name) { return JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")); }

function antonymWord(senseId) {
  return senseId.split("%")[0].replace(/_/g, " ");
}

async function run(db, wordId) {
  const zip = await cached("wordnet-2025.zip", URL);
  const dir = unzipOnce(zip);
  const files = fs.readdirSync(dir);

  const synsets = {};
  for (const f of files.filter((f) => !f.startsWith("entries-"))) {
    Object.assign(synsets, loadJson(dir, f));
  }

  const insertSense = db.prepare("INSERT INTO sense (word_id, pos, gloss, examples, source) VALUES (?, ?, ?, ?, 'wordnet')");
  const insertRel = db.prepare("INSERT INTO rel (src_id, dst_id, kind, source) VALUES (?, ?, ?, 'wordnet')");

  let senseRows = 0, relRows = 0;
  db.exec("BEGIN");
  for (const f of files.filter((f) => f.startsWith("entries-"))) {
    const entries = loadJson(dir, f);
    for (const [word, byPos] of Object.entries(entries)) {
      const id = wordId(word);
      if (id == null) continue;
      for (const [posCode, posData] of Object.entries(byPos)) {
        for (const s of posData.sense || []) {
          const syn = synsets[s.synset];
          if (!syn) continue;
          const gloss = (syn.definition || []).join("; ");
          if (gloss) {
            insertSense.run(id, POS_NAME[posCode] || posCode, gloss, JSON.stringify(syn.example || []));
            senseRows++;
          }
          for (const member of syn.members || []) {
            if (member.toLowerCase() === word.toLowerCase()) continue;
            const mid = wordId(member);
            if (mid == null) continue;
            insertRel.run(id, mid, "syn"); relRows++;
          }
          for (const hyp of syn.hypernym || []) {
            const hSyn = synsets[hyp];
            const rep = hSyn && hSyn.members && hSyn.members[0];
            if (!rep) continue;
            const rid = wordId(rep);
            if (rid == null || rid === id) continue;
            insertRel.run(id, rid, "broader"); relRows++;
          }
          for (const ant of s.antonym || []) {
            const aid = wordId(antonymWord(ant));
            if (aid == null || aid === id) continue;
            insertRel.run(id, aid, "ant"); relRows++;
          }
        }
      }
    }
  }
  db.exec("COMMIT");

  // narrower = the exact inverse of every broader rel just inserted
  db.exec("BEGIN");
  const inverse = db.prepare("INSERT INTO rel (src_id, dst_id, kind, source) SELECT dst_id, src_id, 'narrower', 'wordnet' FROM rel WHERE kind = 'broader' AND source = 'wordnet'").run();
  db.exec("COMMIT");
  relRows += inverse.changes;

  return senseRows + relRows;
}

module.exports = { run, source: "wordnet" };
