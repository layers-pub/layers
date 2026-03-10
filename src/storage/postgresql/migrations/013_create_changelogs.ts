/**
 * Migration to create the changelogs table for indexing pub.layers.changelog.entry records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE changelogs (
        uri                  TEXT PRIMARY KEY,
        did                  TEXT NOT NULL,
        rkey                 TEXT NOT NULL,
        subject_uri          TEXT NOT NULL,
        subject_collection   TEXT NOT NULL,
        summary              TEXT NOT NULL,
        indexed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
        record               JSONB NOT NULL,
        CONSTRAINT changelogs_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_changelogs_did ON changelogs (did);
    CREATE INDEX idx_changelogs_subject_uri ON changelogs (subject_uri);
    CREATE INDEX idx_changelogs_subject_collection ON changelogs (subject_collection);
    CREATE INDEX idx_changelogs_indexed_at ON changelogs (indexed_at);
    CREATE INDEX idx_changelogs_record ON changelogs USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS changelogs CASCADE;');
}
