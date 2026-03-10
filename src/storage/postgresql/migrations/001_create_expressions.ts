/**
 * Migration to create the expressions table for indexing pub.layers.expression.expression records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE expressions (
        uri         TEXT PRIMARY KEY,
        did         TEXT NOT NULL,
        rkey        TEXT NOT NULL,
        text        TEXT,
        kind        TEXT,
        language    TEXT,
        source_url  TEXT,
        source_ref  TEXT,
        eprint_ref  TEXT,
        parent_ref  TEXT,
        indexed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        record      JSONB NOT NULL,
        CONSTRAINT expressions_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_expressions_did ON expressions (did);
    CREATE INDEX idx_expressions_kind_language ON expressions (kind, language);
    CREATE INDEX idx_expressions_source_url ON expressions (source_url) WHERE source_url IS NOT NULL;
    CREATE INDEX idx_expressions_parent_ref ON expressions (parent_ref) WHERE parent_ref IS NOT NULL;
    CREATE INDEX idx_expressions_eprint_ref ON expressions (eprint_ref) WHERE eprint_ref IS NOT NULL;
    CREATE INDEX idx_expressions_record ON expressions USING GIN (record);
    CREATE INDEX idx_expressions_indexed_at ON expressions (indexed_at);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS expressions CASCADE;');
}
