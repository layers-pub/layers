/**
 * Migration to create the templates table for indexing
 * pub.layers.resource.template records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE templates (
        uri             TEXT PRIMARY KEY,
        did             TEXT NOT NULL,
        rkey            TEXT NOT NULL,
        name            TEXT NOT NULL,
        slot_count      INTEGER,
        experiment_ref  TEXT,
        language        TEXT,
        indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        record          JSONB NOT NULL,
        CONSTRAINT templates_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_templates_did ON templates (did);
    CREATE INDEX idx_templates_name ON templates (name);
    CREATE INDEX idx_templates_indexed_at ON templates (indexed_at);
    CREATE INDEX idx_templates_record ON templates USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS templates CASCADE;');
}
