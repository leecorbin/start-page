const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "../../data");

// Downloads a URL once and caches it under lexicon/data/<name> — re-running the
// pipeline never re-fetches a file that's already there.
async function cached(name, url) {
  const dest = path.join(DATA_DIR, name);
  if (fs.existsSync(dest)) return dest;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

module.exports = { DATA_DIR, cached };
