/**
 * Migration to create the corpora table for indexing pub.layers.corpus.corpus records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE corpora (
        uri         TEXT PRIMARY KEY,
        did         TEXT NOT NULL,
        rkey        TEXT NOT NULL,
        name        TEXT NOT NULL,
        language    TEXT,
        license     TEXT,
        domain      TEXT,
        indexed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        record      JSONB NOT NULL,
        CONSTRAINT corpora_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_corpora_did ON corpora (did);
    CREATE INDEX idx_corpora_language ON corpora (language) WHERE language IS NOT NULL;
    CREATE INDEX idx_corpora_domain ON corpora (domain) WHERE domain IS NOT NULL;
    CREATE INDEX idx_corpora_indexed_at ON corpora (indexed_at);
    CREATE INDEX idx_corpora_record ON corpora USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS corpora CASCADE;');
}
