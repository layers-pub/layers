/**
 * Migration to create the resource_entries table for indexing
 * pub.layers.resource.entry records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE resource_entries (
        uri         TEXT PRIMARY KEY,
        did         TEXT NOT NULL,
        rkey        TEXT NOT NULL,
        form        TEXT NOT NULL,
        lemma       TEXT,
        language    TEXT,
        indexed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        record      JSONB NOT NULL,
        CONSTRAINT resource_entries_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_resource_entries_did ON resource_entries (did);
    CREATE INDEX idx_resource_entries_language ON resource_entries (language) WHERE language IS NOT NULL;
    CREATE INDEX idx_resource_entries_indexed_at ON resource_entries (indexed_at);
    CREATE INDEX idx_resource_entries_record ON resource_entries USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS resource_entries CASCADE;');
}
