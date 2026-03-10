/**
 * Migration to create the segmentations table for indexing
 * pub.layers.segmentation.segmentation records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE segmentations (
        uri             TEXT PRIMARY KEY,
        did             TEXT NOT NULL,
        rkey            TEXT NOT NULL,
        expression_ref  TEXT NOT NULL,
        indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        record          JSONB NOT NULL,
        CONSTRAINT segmentations_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_segmentations_did ON segmentations (did);
    CREATE INDEX idx_segmentations_expression_ref ON segmentations (expression_ref);
    CREATE INDEX idx_segmentations_indexed_at ON segmentations (indexed_at);
    CREATE INDEX idx_segmentations_record ON segmentations USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS segmentations CASCADE;');
}
