# Lexicon service — spec & build plan

A self-hosted **dictionary + thesaurus + reverse-lookup + crossword** engine for the
start page, replacing the (soon key-gated) Datamuse dependency. Own full copy of open
lexical data, normalised into our own store on Cloudflare, keyless to the client.

This lives **in-repo** (not a separate project) — the start page is becoming a
comprehensive page with its own data and functions behind it, so the lexicon belongs
alongside `sync-worker/`. The spec is still written so a **subagent (or future
session) within this project** can build the ingest pipeline and functions from it. It
is deliberately additive — start minimal, grow to comprehensive, never break the
client contract.

Status: **Phase 0 done**, **Phase 2's keyword-reverse gear done** (schema + full
ingest + FTS5 reverse lookup, all verified — see [README.md](README.md) for proven
results and exact numbers). Phase 1 (deploy) and Phase 2's vector gear not started.
Sibling of `sync-worker/` (same Cloudflare account, same "client only ever knows
`api.<brand>.uk`" pattern).

> **Related but separate:** film/TV/people lookup is its **own plugin** (`plugins/`,
> keyless Wikidata/WDQS — see the screen-lookup design), not part of this lexicon
> service. Same "our own / keyless / comprehensive" spirit, different data shape.

---

## 1. Goals & non-negotiables

- **Own the data.** Build-time ingest of open dumps → our own store. No runtime call to
  any upstream (Wiktionary, Datamuse, etc.). Re-run the pipeline to refresh.
- **Keyless to the page.** The client calls `api.<brand>.uk/dict/*` with **no key**, exactly
  like the sync worker. The only credentials are server-side Cloudflare bindings.
- **Local-first, cloud-when-justified.** Mechanical/cheap lookups (crossword, pattern,
  anagram — and optionally a common-word mini-dictionary) run **client-side** over a
  shipped bundle. Comprehensive definitions, the long-tail thesaurus, and the semantic
  reverse lookup are served by the Worker.
- **Additive JSON contract.** The client renders whatever fields are present, so results
  get richer as the backend matures without a breaking change. **This is the single most
  important rule.** Never remove or rename a field; only add.
- **Better than today.** Fuller definitions and *far* more thesaurus results than the thin
  Datamuse lists the `??` plugin shows now.
- **Cost inside free tiers** for personal + modest use; only the semantic reverse touches
  Workers AI, and it is cached.

## 2. Decisions already made (do not relitigate)

- Approach = **own full copy** (option 1), not runtime API, not fetch-and-cache.
- Hosting = **Cloudflare** (already used for sync; domain registered there).
- Code licence = **MIT**. Data licences = **kept from source** (see §4).
- Static/backend line = crossword/pattern local; definitions + long-tail thesaurus +
  semantic reverse in the cloud.
- Embedding model to start = **`@cf/baai/bge-small-en-v1.5`** (384-dim), upgradeable.
- Access = **locked to our origins for now**; public API is a later phase.

## 3. Data sources

| Source | Gives us | Format | Licence | Scale (approx) |
|---|---|---|---|---|
| **Wiktextract / Kaikki** (`kaikki.org/dictionary/English`) | definitions, senses, POS, IPA, examples, etymology, synonyms | JSONL | **CC BY-SA** | ~1.38M forms, ~960k noun senses |
| **Open English WordNet 2024** (`github.com/globalwordnet/english-wordnet`) | structured relations: syn, ant, hypernym (broader), hyponym (narrower), meronym | GWN-LMF (XML) → parse | **CC BY 4.0** | ~120k synsets |
| **Moby Thesaurus II** (Grady Ward, Project Gutenberg) | extensive flat synonym lists | line-based text | **Public domain** | ~30k roots, ~2.5M links |
| **Moby Word Lists** | crossword / anagram / pattern wordlist | text | **Public domain** | ~350k words |
| **CMUdict** | pronunciation → rhymes, sounds-like | text | **Public domain (BSD-2)** | ~134k |
| **wordfreq** or **SUBTLEX-US** | frequency ranking (surface common words first) | text/CSV | permissive / CC | — |

Verify each URL, licence, and current dump filename at build time — these move.

## 4. Licensing model (design around, don't fight)

- **Our code** (ingest, Worker, plugin): **MIT**.
- **Derived data** inherits source licences. Wiktionary's **CC BY-SA is share-alike
  (viral)**: a distributed DB derived from it must remain CC BY-SA + attribute. We cannot
  MIT it.
- **Therefore split by licence, which happens to match the static/backend split:**
  - **Local shipped bundle → PD + CC-BY only** (Moby wordlist, CMUdict, WordNet). No
    share-alike on the client; ship a `NOTICE` with attributions.
  - **CC BY-SA data (Wiktionary definitions) → backend only**, served with visible
    on-screen attribution in the `??` UI (e.g. "Definitions: Wiktionary (CC BY-SA) ·
    WordNet · Moby"). Serving results with attribution is fine; the constraint is on
    *distributing the database*, which we don't do for these.
- If we ever publish DB dumps or open the API broadly/commercially, do a proper licence
  pass first. Attribution strings should be data-driven (per-source) so the UI can list
  exactly what a given response drew on.

## 5. Architecture

```
                     build time (offline, re-runnable)
  open dumps ──► ingest pipeline ──► D1 (structured)  ──► attribution baked in
                      │                └► Vectorize (one vector per sense, from gloss)
                      └► local bundle (PD/CC-BY subset) ──► shipped with the plugin

                     request time
  ?? plugin ──local──► crossword / pattern / anagram        (no network)
           └─cloud──► Worker  api.<brand>.uk/dict/*
                        ├─ /define      → D1
                        ├─ /thesaurus   → D1
                        ├─ /reverse     → Workers AI (embed query) → Vectorize → D1
                        └─ KV cache in front of /reverse
```

**Cloudflare bindings** (in `lexicon/worker/wrangler.toml`):
- **D1** — normalised dictionary (definitions, senses, relations, pronunciations, freq).
- **Vectorize** — index of sense-gloss embeddings for the reverse lookup (384-dim, cosine).
- **Workers AI** — `@cf/baai/bge-small-en-v1.5` to embed the query at request time.
- **KV** — response cache (query → results, short TTL) to keep AI usage tiny.
- **R2** (optional) — hold raw dumps / build artifacts for reproducible ingest.

## 6. D1 schema (starting point — extend freely)

```sql
-- one row per headword (lemma)
CREATE TABLE word (
  id        INTEGER PRIMARY KEY,
  word      TEXT NOT NULL,            -- display form
  norm      TEXT NOT NULL,            -- lowercased/normalised for lookup
  freq      REAL DEFAULT 0            -- 0..1 commonness, for ranking
);
CREATE INDEX word_norm ON word(norm);

-- one row per sense/definition
CREATE TABLE sense (
  id        INTEGER PRIMARY KEY,
  word_id   INTEGER NOT NULL REFERENCES word(id),
  pos       TEXT,                     -- noun|verb|adj|adv|...
  gloss     TEXT NOT NULL,            -- the definition text (also the embed source)
  examples  TEXT,                     -- JSON array of example sentences
  source    TEXT NOT NULL             -- 'wiktionary'|'wordnet'|... (drives attribution)
);
CREATE INDEX sense_word ON sense(word_id);

-- relations between words (thesaurus)
CREATE TABLE rel (
  src_id    INTEGER NOT NULL REFERENCES word(id),
  dst_id    INTEGER NOT NULL REFERENCES word(id),
  kind      TEXT NOT NULL,            -- syn|ant|broader|narrower|related|part_of
  source    TEXT NOT NULL
);
CREATE INDEX rel_src ON rel(src_id, kind);

-- pronunciations
CREATE TABLE pron (
  word_id    INTEGER NOT NULL REFERENCES word(id),
  ipa        TEXT,
  arpabet    TEXT,                    -- from CMUdict, enables rhyme/sounds-like
  rhyme_key  TEXT,                    -- derived at ingest: last primary-stressed vowel to the end, stress-stripped
  source     TEXT NOT NULL
);
CREATE INDEX pron_word ON pron(word_id);
CREATE INDEX pron_rhyme ON pron(rhyme_key);

-- full-text index over sense.gloss — Gear 1 of the reverse lookup (§9). External-
-- content table (indexes `sense` in place); rebuild after loading/changing sense
-- data with:  INSERT INTO sense_fts(sense_fts) VALUES('rebuild');
CREATE VIRTUAL TABLE sense_fts USING fts5(gloss, content='sense', content_rowid='id');
```

Vectorize (Gear 2, not yet built): one vector per `sense.id` (metadata: `word_id`,
`word`, short gloss, `freq`) so a reverse hit maps straight back to a headword + gloss
for display and re-ranking.

## 7. Ingest pipeline (`lexicon/ingest/`)

Idempotent, re-runnable, one module per source. Suggested order:

1. **Wiktextract** — stream the JSONL; for each entry upsert `word`, insert `sense`
   rows (gloss, pos, examples, `source='wiktionary'`), and synonym `rel` rows. Filter to
   English, drop obsolete/rare-tag noise per a tunable allow-list.
2. **Open English WordNet** — parse GWN-LMF; add `rel` rows for syn/ant/**broader**
   (hypernym)/**narrower** (hyponym)/part-of; add senses where Wiktionary lacks them.
3. **Moby Thesaurus** — bulk synonym `rel` rows (`source='moby'`); this is what makes the
   thesaurus *extensive*.
4. **CMUdict** — `pron.arpabet` (+ derive rhyme keys = trailing phonemes from last stressed
   vowel) and IPA where available.
5. **Frequency** — populate `word.freq` (normalise a frequency list to 0..1).
6. **Embeddings** — for each `sense.gloss`, embed with bge-small and upsert to Vectorize.
   Batch it; this is the long step. Store the model name/version so we can re-embed on
   upgrade.
7. **Local bundle** — emit the PD/CC-BY client asset(s): a packed wordlist (for
   crossword/pattern/anagram) and, optionally, a compact common-word thesaurus + short
   glosses. Target **≤ ~2–3 MB gzip**, lazy-loaded on first `??` use and cached. Ship a
   `NOTICE` with attributions.

Keep the whole thing reproducible: pin dump versions, log counts per stage, make re-runs
upsert-safe.

## 8. API contract (`api.<brand>.uk/dict/*`)

All responses JSON, `Content-Type: application/json`, CORS locked to our origins (§10),
and every response carries a top-level `attribution` array of `{source, licence, url}`
for whatever it drew on. **Additive: add fields, never remove.**

```
GET /dict/define?w=<word>
→ { word, senses:[ {pos, gloss, examples:[…], source} ],
    pron:{ ipa, arpabet, rhymeKey }, attribution:[…] }

GET /dict/thesaurus?w=<word>
→ { word,
    groups:{ synonyms:[…], antonyms:[…], broader:[…], narrower:[…], related:[…] },
    attribution:[…] }         # ranked by freq; far more than Datamuse

GET /dict/pattern?p=F?SH&max=50          # crossword — usually answered LOCALLY,
→ { pattern, matches:[…] }               # endpoint exists for parity/rare words

GET /dict/rhyme?w=<word>&max=50          # from pron.rhyme_key (CMUdict-derived)
→ { word, rhymeKey, matches:[…], attribution:[…] }

GET /dict/reverse?q=<free-text description>&max=25&sp=<optional pattern>
→ { query,
    candidates:[ {word, gloss, pos, score} ],   # semantic; sp filters by pattern
    engine:"vector|keyword",                     # which path served it (see §9)
    attribution:[…] }

GET /dict/health   → { ok:true, version, counts:{words,senses,vectors} }
```

Notes:
- `/reverse` accepts an optional `sp=` (e.g. `an*`, `????`) so "I half-remember it starts
  with 'an'" narrows the candidates — the book's cross-reference trick.
- Consider `md`-style opt-in flags later (e.g. include examples only when asked) to keep
  payloads small.

## 9. Semantic reverse — start keyword, grow to vector

Ship it in two gears so it's useful from day one:

- **Gear 1 (keyword / gloss match). ✅ BUILT & VERIFIED.** FTS5 full-text index over
  `sense.gloss` (external-content table, rebuilt at ingest — `07-reverse-index.js`),
  queried via BM25 in `GET /dict/reverse`. No AI, instant. `engine:"keyword"`.

  **Verified wins** (real queries against the full dataset, each ranking **#1**):
  "a place where books are kept" → **library**; "fear of spiders" → **arachnophobia**
  (confirmed independently by WordNet *and* Wiktionary); "intense longing for the past"
  → **nostalgia** — the exact kind of query the original Reader's Digest Reverse
  Dictionary was built for.

  **Verified, honest limitations** — both root-caused, not mysterious:
  - *Short-definition bias:* "ringing in the ears" → BM25 favours **"singing"** ("A
    ringing sound in the ears") over the correct **tinnitus** ("a ringing or booming
    sensation in one or both ears...") purely because BM25's length-normalisation
    rewards terser documents. Frequency-blending was tried and **rejected** — it
    doesn't discriminate here (both candidate words happen to share `freq = 0`) and it
    actively hurts other queries by over-promoting loosely-related common words. Left
    unblended (plain BM25) rather than ship an unvalidated heuristic.
  - *Phrasing mismatch:* "a person who studies stars" doesn't rank **astronomer**
    highly, because its Wiktionary gloss says *"One who studies..."*, not literally
    "person" — it misses that keyword entirely and loses to terser definitions using
    "A person who studies X" verbatim.

  Both failure modes are exactly what keyword matching *can't* do — understand that
  "one who" ≈ "a person who", or that a fuller clinical definition and a terser slang
  one describe the same underlying concept. That gap is precisely Gear 2's job, not a
  bug in Gear 1.
- **Gear 2 (vector).** Not started. Embed the query with Workers AI → Vectorize ANN
  search → map hits to headwords. **Blend** the vector score with `word.freq` so common
  words outrank obscure ones (this blending makes more sense here than it did for Gear
  1 — vector similarity doesn't have BM25's short-document bias, so a plain frequency
  bonus isn't fighting an opposing effect). `engine:"vector"`. Cache `q → results` in KV
  (normalise `q`) so repeats cost nothing.

Upgrade path: bge-small → bge-base (768-dim) if quality needs it; re-embed corpus, swap the
Vectorize index. Client never changes — `/dict/reverse` already returns `engine` per
response, so the client can show "keyword match" vs "smart match" without caring which
gear actually served it.

## 10. Access control / guards

- **Now:** CORS `Access-Control-Allow-Origin` allow-list = our start-page origin(s) +
  the launcher origin. Reject others. This stops casual browser abuse.
- **Later (public API):** Cloudflare **rate-limiting** rules, a **signed nonce/short-lived
  token** minted for our own page, **Turnstile** for anonymous access. Note CORS is not a
  hard boundary (server-side callers ignore it) — real limits come from the rate-limiter.
- Log minimally; no storing of user queries beyond the KV cache (privacy — the page is
  no-referrer and no-tracking by ethos).

## 11. Client plugin (`??`) integration

Route by input shape (extends today's plugin philosophy):

| Input | Route | Where |
|---|---|---|
| contains `?` / `*` (pattern) | crossword / pattern | **local** wordlist |
| single plain word | define + thesaurus | cloud (`/define`,`/thesaurus`) |
| multi-word phrase / description | reverse lookup | cloud (`/reverse`) |
| phrase **+** remembered letters | reverse, filtered | cloud (`/reverse?...&sp=`) |
| anagram request / known letters | anagram | **local** wordlist |

- Endpoint base configurable like sync: `localStorage["startpage:dictApi"]` overriding a
  default `https://api.<brand>.uk/dict`.
- Render progressively — show what's returned; missing fields just don't render. Keep
  click-to-look-up + back-arrow (already in `??`). Show the `attribution` line.
- Retire the Datamuse calls once `/thesaurus` is live.

## 12. Phased milestones

- **Phase 0 — schema + ingest (no AI). ✅ DONE.** D1-compatible schema loaded from the
  **complete** Wiktextract dump (3.19 GB / 1,481,704 lines — not a sample) + OEWN + Moby
  + CMUdict + frequency: 1,517,324 words, 1,956,923 senses, 3,320,327 relations, 272,161
  pronunciations. Local wordlist bundle emitted (~1 MB gzip). A rhyme/sounds-like key is
  derived at ingest from CMUdict (`pron.rhyme_key`). *Acceptance met:* verified against
  real queries — "happy" → 258 synonyms (vs Datamuse's 14), structured
  broader/narrower/antonym relations Datamuse never exposed, `F?SH`/`J*CK` pattern
  matching and rhyme lookups (night → right/might/tonight/quite/fight…) work fully
  offline. A Worker (`worker/src/worker.js`) implementing `/define` `/thesaurus`
  `/pattern` `/rhyme` `/reverse` (Gear 1 — see §9) `/health` is written and its SQL
  verified against the dev database; `ingest/export-d1.js` batches the full dataset
  into D1-ready SQL and the round-trip (export → reload → identical row counts +
  correct queries) is verified. **Not yet deployed** — that's Phase 1 (needs a real D1
  database + Cloudflare Worker deploy + the domain; the import step itself is already
  scripted, so Phase 1 is purely the Cloudflare/DNS setup + plugin wiring, not more
  data engineering).
- **Phase 1 — wire the plugin.** Point `??` at the API, input-shape routing, ship
  crossword locally, drop Datamuse. *Acceptance:* the plugin is fully keyless and better
  than today.
- **Phase 2 — semantic reverse.** Gear 1 (FTS5 keyword) **✅ DONE** — see §9 for verified
  wins (library, arachnophobia, nostalgia all rank #1) and honest, root-caused
  limitations (short-definition BM25 bias; phrasing mismatches like "one who" vs "a
  person who"). Gear 2 (Vectorize + Workers AI, KV cache, freq-blended ranking) not
  started — closes exactly the gap Gear 1's limitations expose.
- **Phase 3 — polish.** Bigger embedding model if needed, examples, tuning, aggressive
  caching, optional public-API guards. (Rhyme/sounds-like moved up — done in Phase 0.)

## 13. Cost model

- Definitions / thesaurus / crossword = plain lookups → **£0 AI**. D1 + Worker requests sit
  in the free tier for our scale.
- Semantic reverse = one bge-small embedding per *uncached* query, a sliver of the free
  10k neurons/day; Vectorize stores ~1–2M small vectors (watch stored-dimension pricing —
  bge-small's 384 dims keeps this modest) and queries are cheap; KV cache collapses repeats.
- Verify current free-tier limits for Workers AI, Vectorize, D1 and KV at build time.

## 14. Repo layout

```
lexicon/
  SPEC.md              # this file
  README.md            # short: what it is, how to build/deploy
  ingest/              # one module per source + orchestrator; emits D1 + Vectorize + bundle
  worker/              # the Cloudflare Worker (routes in §8) + wrangler.toml
  data/                # (gitignored) downloaded dumps + build artifacts
  bundle/              # generated local client asset(s) + NOTICE (attributions)
```

## 15. Open questions for the builder

- FTS5 vs a small in-Worker BM25 for the keyword gear — measure on real glosses.
- How aggressively to prune Wiktionary senses (obsolete/dialectal/rare) for signal.
- Whether to ship the optional common-word mini-dictionary locally (offline basics) or keep
  all definitions server-side (smaller bundle). Start server-side; revisit.
- ~~Rhyme/sounds-like: derive keys at ingest (store in `pron`) vs compute on demand.~~
  **Resolved:** derived at ingest. `pron.rhyme_key` = the phonemes from the last
  primary-stressed vowel to the end (stress digits stripped) — e.g. night/light/sight/bite
  all key to "AY T". `GET /dict/rhyme?w=` finds other words sharing a word's key.
- Vectorize granularity: one vector per sense (precise) vs per word (smaller index).
