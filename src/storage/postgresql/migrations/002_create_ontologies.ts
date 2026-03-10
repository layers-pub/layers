/**
 * Migration to create the ontologies table for indexing pub.layers.ontology.ontology records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE ontologies (
        uri         TEXT PRIMARY KEY,
        did         TEXT NOT NULL,
        rkey        TEXT NOT NULL,
        name        TEXT NOT NULL,
        domain      TEXT,
        version     TEXT,
        indexed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        record      JSONB NOT NULL,
        CONSTRAINT ontologies_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_ontologies_did ON ontologies (did);
    CREATE INDEX idx_ontologies_domain ON ontologies (domain) WHERE domain IS NOT NULL;
    CREATE INDEX idx_ontologies_indexed_at ON ontologies (indexed_at);
    CREATE INDEX idx_ontologies_record ON ontologies USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS ontologies CASCADE;');
}
