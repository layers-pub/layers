/**
 * Migration to create the margin_annotations table for indexing at.margin.* records.
 *
 * Stores margin.at Web Annotation records alongside native Layers annotations,
 * indexed by target URL for fast correlation queries.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS margin_annotations (
        uri           TEXT PRIMARY KEY,
        did           TEXT NOT NULL,
        rkey          TEXT NOT NULL,
        target_url    TEXT NOT NULL,
        motivation    TEXT NOT NULL,
        body_text     TEXT NOT NULL,
        body_format   TEXT,
        creator_did   TEXT NOT NULL,
        selector      JSONB,
        record        JSONB NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL,
        indexed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (did, rkey)
    );

    CREATE INDEX idx_margin_annotations_target_url ON margin_annotations (target_url);
    CREATE INDEX idx_margin_annotations_did ON margin_annotations (did);
    CREATE INDEX idx_margin_annotations_motivation ON margin_annotations (motivation);
    CREATE INDEX idx_margin_annotations_created_at ON margin_annotations (created_at);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS margin_annotations CASCADE;');
}
