/**
 * Migration to create the alignments table for indexing
 * pub.layers.alignment.alignment records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE alignments (
        uri             TEXT PRIMARY KEY,
        did             TEXT NOT NULL,
        rkey            TEXT NOT NULL,
        expression_ref  TEXT,
        source_ref      TEXT NOT NULL,
        target_ref      TEXT NOT NULL,
        kind            TEXT NOT NULL,
        subkind         TEXT,
        indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        record          JSONB NOT NULL,
        CONSTRAINT alignments_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_alignments_did ON alignments (did);
    CREATE INDEX idx_alignments_expression_ref ON alignments (expression_ref);
    CREATE INDEX idx_alignments_kind ON alignments (kind);
    CREATE INDEX idx_alignments_indexed_at ON alignments (indexed_at);
    CREATE INDEX idx_alignments_record ON alignments USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS alignments CASCADE;');
}
