/**
 * Migration to create the annotation_layers table for indexing
 * pub.layers.annotation.annotationLayer records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE annotation_layers (
        uri                TEXT PRIMARY KEY,
        did                TEXT NOT NULL,
        rkey               TEXT NOT NULL,
        expression_ref     TEXT NOT NULL,
        segmentation_ref   TEXT,
        kind               TEXT NOT NULL,
        subkind            TEXT,
        formalism          TEXT,
        ontology_ref       TEXT,
        persona_ref        TEXT,
        annotation_count   INTEGER NOT NULL DEFAULT 0,
        indexed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        record             JSONB NOT NULL,
        CONSTRAINT annotation_layers_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_annotation_layers_did ON annotation_layers (did);
    CREATE INDEX idx_annotation_layers_expression_ref ON annotation_layers (expression_ref);
    CREATE INDEX idx_annotation_layers_kind ON annotation_layers (kind);
    CREATE INDEX idx_annotation_layers_indexed_at ON annotation_layers (indexed_at);
    CREATE INDEX idx_annotation_layers_record ON annotation_layers USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS annotation_layers CASCADE;');
}
