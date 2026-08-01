# Lexicon service

A self-hosted **dictionary + thesaurus + reverse-lookup + crossword** engine — our own
data, our own Cloudflare functions, no API key, ever. Full design rationale, licensing,
schema and phased plan: **[SPEC.md](SPEC.md)**.

Why this exists: the `??` plugin's thesaurus used to call Datamuse, which requires an
API key from 1 Jan 2027. Rather than add a key (breaking the start page's keyless ethos),
we built the whole thing ourselves from open data — **it's now live and wired up**, and
shows **far richer results** than Datamuse ever did (see "Proven results" below).

## Status

- ✅ **Phase 0 — schema + ingest.** Done and verified. All six sources, including the
  **complete** Wiktextract dump (not a sample), ingest cleanly; a keyless local
  crossword/pattern bundle is emitted; a rhyme/sounds-like key is derived at ingest.
- ✅ **Phase 1 — deployed + wired up.** Live at
  `https://startpage-lexicon.leecorbin.workers.dev` (temporary `.workers.dev` URL — no
  brand/domain chosen yet; `api.<brand>.uk/dict/*` routing is a one-line swap once there
  is one). D1 loaded with the full dataset (row counts verified to match the dev
  database exactly). `plugins/dict.js` now calls `/define` and `/thesaurus` directly —
  Datamuse **and** dictionaryapi.dev are both retired. `GET /dict/reverse` is deployed
  but its FTS5 search index isn't built yet — see the size-limit note below; every other
  route (`/define` `/thesaurus` `/pattern` `/rhyme` `/health`) is fully live.
- ✅ **Phase 2, Gear 1 — keyword reverse lookup.** Built and verified **locally**
  (`GET /dict/reverse` finds a word from a description via FTS5/BM25 over every gloss,
  no AI — the actual "tip of your tongue" feature this project started from). **Not yet
  live**: building the index on remote D1 hit the free-tier 500 MB database-size limit
  (base data alone is ~532 MB). Parked by choice — see below — not a bug.
- ⏳ **Phase 2, Gear 2 — semantic reverse lookup** (Vectorize + Workers AI). Not
  started — closes the gaps Gear 1's verification exposed.
- ⏳ **Phase 3 — polish.** Not started (rhyme/sounds-like moved up — done in Phase 0).

### The `/dict/reverse` index is parked on a real constraint, not forgotten

Cloudflare D1's free tier caps a database at **500 MB**; Workers Paid ($5/month) raises
that to 10 GB. Our base data (word/sense/rel/pron) alone is already **532 MB** — the
FTS5 search index needs meaningfully more room on top. Decided to leave `/dict/reverse`
unindexed for now (it returns `{"candidates":[]}` gracefully, no error) rather than
either pay before it's needed or trim real content to fit. Revisit alongside the Gear 2
decision, since Vectorize + Workers AI likely wants Workers Paid anyway.

## Data sources (all verified live, see SPEC.md §3–4 for licensing)

| Source | Gives us | Rows ingested |
|---|---|---|
| [Moby Word Lists](https://www.gutenberg.org/ebooks/3201) (PD) | every valid English word — seeds `word`, emits the local pattern bundle | 351,075 |
| [Moby Thesaurus](https://www.gutenberg.org/ebooks/3202) (PD) | extensive synonym lists | 2,520,095 relations |
| [Open English WordNet 2025](https://github.com/globalwordnet/english-wordnet) (CC BY 4.0) | definitions + synonym/antonym/broader/narrower relations | 785k senses+relations |
| [CMUdict](https://github.com/cmusphinx/cmudict) (PD/BSD-2) | ARPABET pronunciations + a derived rhyme key | 133,973 |
| [FrequencyWords](https://github.com/hermitdave/FrequencyWords) | commonness ranking, so results surface familiar words first | 46,982 |
| [Wiktextract / Kaikki](https://kaikki.org/dictionary/English/) (CC BY-SA — server-side only) | fuller definitions, examples, more relations, more pronunciations | **full 3.19 GB / 1,481,704-line dump** — 2.11M rows |

**Totals: 1,517,324 words · 1,956,923 senses · 3,320,327 relations · 272,161
pronunciations.** (`ingest/06-wiktextract.js` streams the file line-by-line — constant
memory regardless of size — and skips the handful of genuinely truncated lines that
exist upstream in a dump this large: 2 out of 1,481,704.)

## Proven results (Phase 0 verification, full dataset)

Real queries against the ingested data, compared to what the live `??` plugin gets from
Datamuse today:

- **"happy" → 258 synonyms** (Datamuse currently caps at 14).
- **"dictionary" → 11 real senses** across noun/verb/proper-name, combining Wiktionary
  (10) and WordNet (1) — e.g. *"An associative array, or a data structure where each
  value is referenced by..."* alongside the familiar "reference work" sense.
- **"free" → antonym "unfree"**, confirmed independently by both WordNet and Wiktionary.
- **"dog" → broader "canine", "domestic animal"; narrower "Belgian griffon"** —
  hypernym/hyponym relations Datamuse doesn't expose at all.
- **Pattern `F?SH` → fish, fash, fosh** — same three real words Datamuse's `sp=` gave,
  now fully offline. **Pattern `J*CK`** surfaces real if obscure words Datamuse missed
  (jackstock, jannock, jedcock, jonnick…).
- **Rhymes for "night" → right, night, might, tonight, quite, fight, light, alright,
  white, write, flight, tight, sight, bite, bright** — ranked by commonness, derived
  from CMUdict's ARPABET at ingest (`pron.rhyme_key`), exposed via `GET /dict/rhyme`.
  Something Datamuse-via-`??` never had at all.
- The local crossword/pattern **bundle ships at ~1 MB gzip** — comfortably inside the
  spec's 2–3 MB budget.
- The dev-DB → D1 export round-trips exactly, on the full dataset: `ingest/export-d1.js`
  batches the whole database into `worker/d1-import/*.sql` (23,558 statements across 59
  files), and reloading every file into a fresh SQLite database reproduces the *exact*
  same row counts (1,517,324 / 1,956,923 / 3,320,327 / 272,161) with correct query
  results — so Phase 1's D1 import is a mechanical
  `for f in d1-import/*.sql; do wrangler d1 execute ... --file="$f"; done`, not an open
  question.

### Reverse lookup ("tip of your tongue") — the actual original ask, now working

`GET /dict/reverse?q=<description>` — describe a word, get candidates back, no AI.
Real queries against the full dataset:

- **"a place where books are kept" → library** ranks #1.
- **"fear of spiders" → arachnophobia** ranks #1 — confirmed independently by both a
  WordNet and a Wiktionary sense.
- **"intense longing for the past" → nostalgia** ranks #1 — the exact style of query
  the original Reader's Digest *Reverse Dictionary* was built around.

Two honest, root-caused limitations (not bugs — this is what plain keyword search
*can't* do, and precisely the gap Gear 2/semantic embeddings will close):
- **Short-definition bias:** "ringing in the ears" surfaces "singing" ("A ringing
  sound in the ears") ahead of the correct **tinnitus**, because BM25's length
  normalisation rewards terser documents regardless of correctness. Frequency-blended
  ranking was tried and rejected here — both words happen to share `freq = 0`, so it
  doesn't discriminate between them, and it actively over-promotes loosely-related
  common words on other queries. Shipped unblended rather than fake a fix.
- **Phrasing mismatch:** "a person who studies stars" doesn't strongly surface
  **astronomer**, because its Wiktionary gloss reads *"One who studies..."* — it
  never contains the literal word "person" at all.

## Running the ingest

No dependencies — pure Node (`node:sqlite`, built in since Node 22) + `curl`/`unzip`
under the hood via `fetch`. From `lexicon/ingest/`:

```bash
node run-all.js
```

By default this uses a small real Wiktextract sample (fast, no multi-GB download) —
enough to prove the pipeline. **The numbers quoted throughout this doc are from the
full run**, which fetches and streams the complete ~3.19 GB / 1,481,704-line dump
instead:

```bash
curl -o ../data/wiktextract-full.jsonl \
  https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl   # ~3.19 GB
WIKTEXTRACT_FILE=../data/wiktextract-full.jsonl node run-all.js
```

Everything else (WordNet, Moby, CMUdict, frequency) is small and always fully ingested
either way. Downloads are cached under `../data/` (gitignored — regenerate anytime), so
re-runs are fast. Output: `../data/lexicon.dev.sqlite` (a D1-compatible SQLite file) and
`../bundle/wordlist.txt` + `NOTICE` (the shipped client asset).

## Repo layout

```
lexicon/
  SPEC.md              # full design + schema + API contract + phased plan
  README.md            # this file
  ingest/              # one module per source + orchestrator (run-all.js) + export-d1.js
  worker/              # the Cloudflare Worker (schema.sql, wrangler.toml, src/worker.js)
                        # + d1-import/ (gitignored — generated by export-d1.js before deploy)
  data/                # (gitignored) downloaded dumps + the dev SQLite database
  bundle/              # generated local client asset (wordlist.txt) + NOTICE
```

## Deploying

Done once already (live at `startpage-lexicon.leecorbin.workers.dev`); these are the
steps to redeploy after a data or code change, same shape as `sync-worker/`:

```bash
node ../ingest/export-d1.js                     # writes worker/d1-import/*.sql from the dev DB
cd worker
npx wrangler login                              # already authenticated, same account as sync-worker
npx wrangler d1 create startpage-lexicon        # only for a fresh database — paste the printed
                                                 # database_id into wrangler.toml (done: 5fd08903-...)
npx wrangler d1 execute startpage-lexicon --remote --file=schema.sql
for f in d1-import/*.sql; do
  npx wrangler d1 execute startpage-lexicon --remote --file="$f"
done
npx wrangler d1 execute startpage-lexicon --remote --command="INSERT INTO sense_fts(sense_fts) VALUES('rebuild')"
npx wrangler deploy
```

(`d1-import/` isn't committed — it's generated output, regenerate it with
`export-d1.js` right before deploying so it reflects the latest ingest run.)

**Confirmed working against real D1:** schema load (including the `CREATE VIRTUAL
TABLE ... USING fts5(...)` statement — D1 does support FTS5), all 59 data files (row
counts verified to match the dev database exactly: 1,517,324 / 1,956,923 / 3,320,327 /
272,161), and every route except the FTS5 rebuild — that one hit the free-tier 500 MB
size limit (base data is already ~532 MB) and is parked, not broken. See the Status
section above.

## Licensing

Code here is **MIT**, matching the rest of the repo. The **data** keeps its source
licences — Wiktionary content is CC BY-SA (share-alike) and is served **only** from the
Worker with on-screen attribution, never redistributed in the client bundle; the local
bundle uses only public-domain (Moby) data. See SPEC.md §4 for the full reasoning.
