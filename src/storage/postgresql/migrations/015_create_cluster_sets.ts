/**
 * Migration to create the cluster_sets table for indexing
 * pub.layers.annotation.clusterSet records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE cluster_sets (
        uri              TEXT PRIMARY KEY,
        did              TEXT NOT NULL,
        rkey             TEXT NOT NULL,
        expression_ref   TEXT,
        layer_ref        TEXT NOT NULL,
        kind             TEXT,
        indexed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        record           JSONB NOT NULL,
        CONSTRAINT cluster_sets_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_cluster_sets_did ON cluster_sets (did);
    CREATE INDEX idx_cluster_sets_layer_ref ON cluster_sets (layer_ref);
    CREATE INDEX idx_cluster_sets_indexed_at ON cluster_sets (indexed_at);
    CREATE INDEX idx_cluster_sets_record ON cluster_sets USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS cluster_sets CASCADE;');
}
