-- Lexicon service — D1 schema (SQLite-compatible; also used for local dev via the
-- plain `sqlite3` CLI during ingest). See ../SPEC.md §6. Additive only: extend with
-- new columns/tables, never rename/remove — the API contract depends on this.

-- one row per headword (lemma)
CREATE TABLE IF NOT EXISTS word (
  id        INTEGER PRIMARY KEY,
  word      TEXT NOT NULL,            -- display form
  norm      TEXT NOT NULL,            -- lowercased/normalised for lookup
  freq      REAL DEFAULT 0            -- 0..1 commonness, for ranking
);
CREATE INDEX IF NOT EXISTS word_norm ON word(norm);

-- one row per sense/definition
CREATE TABLE IF NOT EXISTS sense (
  id        INTEGER PRIMARY KEY,
  word_id   INTEGER NOT NULL REFERENCES word(id),
  pos       TEXT,                     -- noun|verb|adj|adv|...
  gloss     TEXT NOT NULL,            -- the definition text (also the future embed source)
  examples  TEXT,                     -- JSON array of example sentences
  source    TEXT NOT NULL             -- 'wiktionary'|'wordnet'|... (drives attribution)
);
CREATE INDEX IF NOT EXISTS sense_word ON sense(word_id);

-- relations between words (thesaurus)
CREATE TABLE IF NOT EXISTS rel (
  src_id    INTEGER NOT NULL REFERENCES word(id),
  dst_id    INTEGER NOT NULL REFERENCES word(id),
  kind      TEXT NOT NULL,            -- syn|ant|broader|narrower|related|part_of
  source    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS rel_src ON rel(src_id, kind);

-- pronunciations
CREATE TABLE IF NOT EXISTS pron (
  word_id    INTEGER NOT NULL REFERENCES word(id),
  ipa        TEXT,
  arpabet    TEXT,                    -- from CMUdict, enables rhyme/sounds-like
  rhyme_key  TEXT,                    -- from the last primary-stressed vowel to the end, stress-stripped
  source     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS pron_word ON pron(word_id);
CREATE INDEX IF NOT EXISTS pron_rhyme ON pron(rhyme_key);

-- full-text index over sense.gloss — the "keyword gear" of the reverse-dictionary
-- lookup (SPEC.md §9): describe a word, find it, no AI required. External-content
-- table (indexes `sense` in place, no duplicated storage); rebuild after loading/
-- changing sense data with:  INSERT INTO sense_fts(sense_fts) VALUES('rebuild');
CREATE VIRTUAL TABLE IF NOT EXISTS sense_fts USING fts5(gloss, content='sense', content_rowid='id');

-- one row per ingest run, so we can tell what's loaded and re-run safely
CREATE TABLE IF NOT EXISTS ingest_log (
  source    TEXT PRIMARY KEY,
  rows      INTEGER NOT NULL,
  note      TEXT,
  run_at    TEXT NOT NULL             -- ISO date string, passed in by the runner (no Date.now() inside D1)
);
