/**
 * Migration to create the eprints table for indexing pub.layers.eprint.eprint records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE eprints (
        uri                     TEXT PRIMARY KEY,
        did                     TEXT NOT NULL,
        rkey                    TEXT NOT NULL,
        eprint_identifier       TEXT NOT NULL,
        eprint_identifier_type  TEXT,
        link_type               TEXT NOT NULL,
        corpus_ref              TEXT,
        indexed_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        record                  JSONB NOT NULL,
        CONSTRAINT eprints_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_eprints_did ON eprints (did);
    CREATE INDEX idx_eprints_eprint_identifier ON eprints (eprint_identifier);
    CREATE INDEX idx_eprints_eprint_identifier_type ON eprints (eprint_identifier_type)
        WHERE eprint_identifier_type IS NOT NULL;
    CREATE INDEX idx_eprints_link_type ON eprints (link_type);
    CREATE INDEX idx_eprints_corpus_ref ON eprints (corpus_ref)
        WHERE corpus_ref IS NOT NULL;
    CREATE INDEX idx_eprints_indexed_at ON eprints (indexed_at);
    CREATE INDEX idx_eprints_record ON eprints USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS eprints CASCADE;');
}
