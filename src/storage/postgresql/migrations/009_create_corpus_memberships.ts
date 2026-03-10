/**
 * Migration to create the corpus_memberships table for indexing
 * pub.layers.corpus.membership records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE corpus_memberships (
        uri             TEXT PRIMARY KEY,
        did             TEXT NOT NULL,
        rkey            TEXT NOT NULL,
        corpus_ref      TEXT NOT NULL,
        expression_ref  TEXT NOT NULL,
        split           TEXT,
        indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        record          JSONB NOT NULL,
        CONSTRAINT corpus_memberships_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_corpus_memberships_did ON corpus_memberships (did);
    CREATE INDEX idx_corpus_memberships_corpus_ref ON corpus_memberships (corpus_ref);
    CREATE INDEX idx_corpus_memberships_expression_ref ON corpus_memberships (expression_ref);
    CREATE INDEX idx_corpus_memberships_split ON corpus_memberships (split) WHERE split IS NOT NULL;
    CREATE INDEX idx_corpus_memberships_indexed_at ON corpus_memberships (indexed_at);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS corpus_memberships CASCADE;');
}
