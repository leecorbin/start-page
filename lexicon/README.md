# Lexicon service

A self-hosted **dictionary + thesaurus + reverse-lookup + crossword** engine — our own
data, our own Cloudflare functions, no API key, ever. Full design rationale, licensing,
schema and phased plan: **[SPEC.md](SPEC.md)**.

Why this exists: the `??` plugin's thesaurus currently calls Datamuse, which requires an
API key from 1 Jan 2027. Rather than add a key (breaking the start page's keyless ethos),
we're building the whole thing ourselves from open data — and it already shows **far
richer results** than Datamuse ever did (see "Proven results" below).

## Status

- ✅ **Phase 0 — schema + ingest.** Done and verified. All five sources ingest cleanly
  into a local D1-compatible SQLite dev database; a keyless local crossword/pattern
  bundle is emitted.
- ⏳ **Phase 1 — wire the `??` plugin to a deployed Worker.** Not started — needs a
  Cloudflare D1 database created + the Worker deployed (same one-time setup shape as
  `sync-worker/`).
- ⏳ **Phase 2 — semantic reverse lookup** (Vectorize + Workers AI). Not started.
- ⏳ **Phase 3 — polish.** Not started.

## Data sources (all verified live, see SPEC.md §3–4 for licensing)

| Source | Gives us | Rows ingested (Phase 0 run) |
|---|---|---|
| [Moby Word Lists](https://www.gutenberg.org/ebooks/3201) (PD) | every valid English word — seeds `word`, emits the local pattern bundle | 351,075 |
| [Moby Thesaurus](https://www.gutenberg.org/ebooks/3202) (PD) | extensive synonym lists | 2,520,095 relations |
| [Open English WordNet 2025](https://github.com/globalwordnet/english-wordnet) (CC BY 4.0) | definitions + synonym/antonym/broader/narrower relations | 785k senses+relations |
| [CMUdict](https://github.com/cmusphinx/cmudict) (PD/BSD-2) | ARPABET pronunciations (rhyme/sounds-like later) | 133,973 |
| [FrequencyWords](https://github.com/hermitdave/FrequencyWords) | commonness ranking, so results surface familiar words first | 46,982 |
| [Wiktextract / Kaikki](https://kaikki.org/dictionary/English/) (CC BY-SA — server-side only) | fuller definitions, examples, more relations | sampled — see below |

**Totals from the Phase 0 run:** 522,924 words · 194,133 senses · 3,131,739 relations ·
136,419 pronunciations.

### Wiktextract is sampled, not fully ingested yet

The full Kaikki English dump is **~3.2 GB** — too large to fetch inside a normal build.
`ingest/06-wiktextract.js` streams line-by-line (so it scales to the full file with
constant memory) but defaults to a small real sample
(`data/wiktextract-sample.jsonl`, ~2,855 entries) so Phase 0 could be proven without a
multi-hour download. **Running the full ingest is a follow-up job:**

```bash
curl -o lexicon/data/wiktextract-full.jsonl \
  https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl   # ~3.2 GB
WIKTEXTRACT_FILE=../data/wiktextract-full.jsonl node ingest/06-wiktextract.js
```

Everything else (WordNet, Moby, CMUdict, frequency) is **fully ingested already** —
only Wiktextract's *extra* definition depth grows with a fuller run; the dictionary is
usable and richer-than-Datamuse without it (WordNet alone supplies real definitions).

## Proven results (Phase 0 verification)

Real queries against the ingested data, compared to what the live `??` plugin gets from
Datamuse today:

- **"happy" → 222 synonyms** (Datamuse currently caps at 14).
- **"serendipity"** defined correctly — *"good luck in making unexpected and fortunate
  discoveries."*
- **"free" → antonym "unfree"**, confirmed independently by both WordNet and Wiktionary.
- **"dog" → broader "canine", "domestic animal"; narrower "Belgian griffon"** —
  hypernym/hyponym relations Datamuse doesn't expose at all.
- **Pattern `F?SH` → fish, fash, fosh** — same three real words Datamuse's `sp=` gave,
  now fully offline. **Pattern `J*CK`** surfaces real if obscure words Datamuse missed
  (jackstock, jannock, jedcock, jonnick…).
- The local crossword/pattern **bundle ships at ~1 MB gzip** — comfortably inside the
  spec's 2–3 MB budget.
- The dev-DB → D1 export round-trips exactly: `ingest/export-d1.js` batches the whole
  database into `worker/d1-import/*.sql`, and reloading all 13,287 statements into a
  fresh SQLite file reproduces the *exact* same row counts (522,924 / 194,133 /
  3,131,739 / 136,419) with correct query results — so Phase 1's D1 import is a
  mechanical `for f in d1-import/*.sql; do wrangler d1 execute ... --file="$f"; done`,
  not an open question.

## Running the ingest

No dependencies — pure Node (`node:sqlite`, built in since Node 22) + `curl`/`unzip`
under the hood via `fetch`. From `lexicon/ingest/`:

```bash
node run-all.js
```

Downloads are cached under `../data/` (gitignored — regenerate anytime), so re-runs are
fast. Output: `../data/lexicon.dev.sqlite` (a D1-compatible SQLite file) and
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

## Deploying (when ready for Phase 1)

Same shape as `sync-worker/`:

```bash
node ../ingest/export-d1.js                     # writes worker/d1-import/*.sql from the dev DB
cd worker
npx wrangler login
npx wrangler d1 create startpage-lexicon        # paste the printed database_id into wrangler.toml
npx wrangler d1 execute startpage-lexicon --remote --file=schema.sql
for f in d1-import/*.sql; do
  npx wrangler d1 execute startpage-lexicon --remote --file="$f"
done
npx wrangler deploy
```

(`d1-import/` isn't committed — it's generated output, regenerate it with
`export-d1.js` right before deploying so it reflects the latest ingest run.)

## Licensing

Code here is **MIT**, matching the rest of the repo. The **data** keeps its source
licences — Wiktionary content is CC BY-SA (share-alike) and is served **only** from the
Worker with on-screen attribution, never redistributed in the client bundle; the local
bundle uses only public-domain (Moby) data. See SPEC.md §4 for the full reasoning.
