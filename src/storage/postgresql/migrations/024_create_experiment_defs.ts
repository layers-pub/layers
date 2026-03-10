/**
 * Migration to create the experiment_defs table for indexing
 * pub.layers.judgment.experimentDef records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE experiment_defs (
        uri             TEXT PRIMARY KEY,
        did             TEXT NOT NULL,
        rkey            TEXT NOT NULL,
        name            TEXT NOT NULL,
        measure         TEXT,
        task_type       TEXT,
        design_type     TEXT,
        ontology_ref    TEXT,
        persona_ref     TEXT,
        corpus_ref      TEXT,
        indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        record          JSONB NOT NULL,
        CONSTRAINT experiment_defs_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_experiment_defs_did ON experiment_defs (did);
    CREATE INDEX idx_experiment_defs_name ON experiment_defs (name);
    CREATE INDEX idx_experiment_defs_indexed_at ON experiment_defs (indexed_at);
    CREATE INDEX idx_experiment_defs_record ON experiment_defs USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS experiment_defs CASCADE;');
}
