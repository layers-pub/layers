/**
 * Migration to create the media_records table for indexing pub.layers.media.media records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE media_records (
        uri             TEXT PRIMARY KEY,
        did             TEXT NOT NULL,
        rkey            TEXT NOT NULL,
        kind            TEXT NOT NULL,
        mime_type       TEXT,
        duration_ms     INTEGER,
        language        TEXT,
        indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        record          JSONB NOT NULL,
        CONSTRAINT media_records_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_media_records_did ON media_records (did);
    CREATE INDEX idx_media_records_kind ON media_records (kind);
    CREATE INDEX idx_media_records_mime_type ON media_records (mime_type) WHERE mime_type IS NOT NULL;
    CREATE INDEX idx_media_records_language ON media_records (language) WHERE language IS NOT NULL;
    CREATE INDEX idx_media_records_indexed_at ON media_records (indexed_at);
    CREATE INDEX idx_media_records_record ON media_records USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS media_records CASCADE;');
}
