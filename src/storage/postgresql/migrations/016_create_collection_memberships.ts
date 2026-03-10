/**
 * Migration to create the collection_memberships table for indexing
 * pub.layers.resource.collectionMembership records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE collection_memberships (
        uri             TEXT PRIMARY KEY,
        did             TEXT NOT NULL,
        rkey            TEXT NOT NULL,
        collection_ref  TEXT NOT NULL,
        entry_ref       TEXT NOT NULL,
        ordinal         INTEGER,
        indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        record          JSONB NOT NULL,
        CONSTRAINT collection_memberships_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_collection_memberships_did ON collection_memberships (did);
    CREATE INDEX idx_collection_memberships_collection_ref ON collection_memberships (collection_ref);
    CREATE INDEX idx_collection_memberships_entry_ref ON collection_memberships (entry_ref);
    CREATE INDEX idx_collection_memberships_indexed_at ON collection_memberships (indexed_at);
    CREATE INDEX idx_collection_memberships_record ON collection_memberships USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS collection_memberships CASCADE;');
}
