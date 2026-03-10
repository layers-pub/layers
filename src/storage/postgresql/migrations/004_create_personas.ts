/**
 * Migration to create the personas table for indexing pub.layers.persona.persona records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE personas (
        uri         TEXT PRIMARY KEY,
        did         TEXT NOT NULL,
        rkey        TEXT NOT NULL,
        name        TEXT NOT NULL,
        domain      TEXT,
        kind        TEXT,
        indexed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        record      JSONB NOT NULL,
        CONSTRAINT personas_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_personas_did ON personas (did);
    CREATE INDEX idx_personas_domain ON personas (domain) WHERE domain IS NOT NULL;
    CREATE INDEX idx_personas_kind ON personas (kind) WHERE kind IS NOT NULL;
    CREATE INDEX idx_personas_indexed_at ON personas (indexed_at);
    CREATE INDEX idx_personas_record ON personas USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS personas CASCADE;');
}
