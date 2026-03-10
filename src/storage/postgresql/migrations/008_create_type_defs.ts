/**
 * Migration to create the type_defs table for indexing pub.layers.ontology.typeDef records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE type_defs (
        uri            TEXT PRIMARY KEY,
        did            TEXT NOT NULL,
        rkey           TEXT NOT NULL,
        ontology_ref   TEXT NOT NULL,
        name           TEXT NOT NULL,
        type_kind      TEXT NOT NULL,
        indexed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        record         JSONB NOT NULL,
        CONSTRAINT type_defs_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_type_defs_did ON type_defs (did);
    CREATE INDEX idx_type_defs_ontology_ref ON type_defs (ontology_ref);
    CREATE INDEX idx_type_defs_type_kind ON type_defs (type_kind);
    CREATE INDEX idx_type_defs_indexed_at ON type_defs (indexed_at);
    CREATE INDEX idx_type_defs_record ON type_defs USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS type_defs CASCADE;');
}
