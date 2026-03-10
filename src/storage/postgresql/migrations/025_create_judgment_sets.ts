/**
 * Migration to create the judgment_sets table for indexing
 * pub.layers.judgment.judgmentSet records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE judgment_sets (
        uri             TEXT PRIMARY KEY,
        did             TEXT NOT NULL,
        rkey            TEXT NOT NULL,
        experiment_ref  TEXT NOT NULL,
        annotator_did   TEXT,
        indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        record          JSONB NOT NULL,
        CONSTRAINT judgment_sets_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_judgment_sets_did ON judgment_sets (did);
    CREATE INDEX idx_judgment_sets_experiment_ref ON judgment_sets (experiment_ref);
    CREATE INDEX idx_judgment_sets_indexed_at ON judgment_sets (indexed_at);
    CREATE INDEX idx_judgment_sets_record ON judgment_sets USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS judgment_sets CASCADE;');
}
