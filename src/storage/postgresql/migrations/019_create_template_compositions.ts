/**
 * Migration to create the template_compositions table for indexing
 * pub.layers.resource.templateComposition records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE template_compositions (
        uri             TEXT PRIMARY KEY,
        did             TEXT NOT NULL,
        rkey            TEXT NOT NULL,
        name            TEXT NOT NULL,
        indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        record          JSONB NOT NULL,
        CONSTRAINT template_compositions_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_template_compositions_did ON template_compositions (did);
    CREATE INDEX idx_template_compositions_indexed_at ON template_compositions (indexed_at);
    CREATE INDEX idx_template_compositions_record ON template_compositions USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS template_compositions CASCADE;');
}
