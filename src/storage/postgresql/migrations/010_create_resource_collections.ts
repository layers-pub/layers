/**
 * Migration to create the resource_collections table for indexing
 * pub.layers.resource.collection records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE resource_collections (
        uri         TEXT PRIMARY KEY,
        did         TEXT NOT NULL,
        rkey        TEXT NOT NULL,
        name        TEXT NOT NULL,
        kind        TEXT,
        language    TEXT,
        indexed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        record      JSONB NOT NULL,
        CONSTRAINT resource_collections_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_resource_collections_did ON resource_collections (did);
    CREATE INDEX idx_resource_collections_kind ON resource_collections (kind) WHERE kind IS NOT NULL;
    CREATE INDEX idx_resource_collections_language ON resource_collections (language) WHERE language IS NOT NULL;
    CREATE INDEX idx_resource_collections_indexed_at ON resource_collections (indexed_at);
    CREATE INDEX idx_resource_collections_record ON resource_collections USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS resource_collections CASCADE;');
}
