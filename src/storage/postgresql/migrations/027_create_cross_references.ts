/**
 * Migration to create the cross_references table for tracking AT-URI relationships.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS cross_references (
        id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        source_uri        TEXT NOT NULL,
        target_uri        TEXT NOT NULL,
        ref_type          TEXT NOT NULL,
        source_collection TEXT NOT NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (source_uri, target_uri, ref_type)
    );

    CREATE INDEX idx_cross_references_source_uri ON cross_references (source_uri);
    CREATE INDEX idx_cross_references_target_uri ON cross_references (target_uri);
    CREATE INDEX idx_cross_references_ref_type ON cross_references (ref_type);
    CREATE INDEX idx_cross_references_source_collection ON cross_references (source_collection);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS cross_references CASCADE;');
}
