/**
 * Migration to create the fillings table for indexing
 * pub.layers.resource.filling records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE fillings (
        uri             TEXT PRIMARY KEY,
        did             TEXT NOT NULL,
        rkey            TEXT NOT NULL,
        template_ref    TEXT NOT NULL,
        expression_ref  TEXT,
        strategy        TEXT,
        indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        record          JSONB NOT NULL,
        CONSTRAINT fillings_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_fillings_did ON fillings (did);
    CREATE INDEX idx_fillings_template_ref ON fillings (template_ref);
    CREATE INDEX idx_fillings_indexed_at ON fillings (indexed_at);
    CREATE INDEX idx_fillings_record ON fillings USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS fillings CASCADE;');
}
