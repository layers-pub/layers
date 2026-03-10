/**
 * Migration to create the data_links table for indexing
 * pub.layers.eprint.dataLink records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE data_links (
        uri             TEXT PRIMARY KEY,
        did             TEXT NOT NULL,
        rkey            TEXT NOT NULL,
        eprint_ref      TEXT NOT NULL,
        corpus_ref      TEXT,
        link_type       TEXT,
        indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        record          JSONB NOT NULL,
        CONSTRAINT data_links_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_data_links_did ON data_links (did);
    CREATE INDEX idx_data_links_eprint_ref ON data_links (eprint_ref);
    CREATE INDEX idx_data_links_indexed_at ON data_links (indexed_at);
    CREATE INDEX idx_data_links_record ON data_links USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS data_links CASCADE;');
}
