/**
 * Migration to create the graph_edge_sets table for indexing pub.layers.graph.graphEdgeSet records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE graph_edge_sets (
        uri              TEXT PRIMARY KEY,
        did              TEXT NOT NULL,
        rkey             TEXT NOT NULL,
        name             TEXT,
        edge_type        TEXT NOT NULL,
        edge_count       INTEGER,
        expression_ref   TEXT,
        indexed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        record           JSONB NOT NULL,
        CONSTRAINT graph_edge_sets_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_graph_edge_sets_did ON graph_edge_sets (did);
    CREATE INDEX idx_graph_edge_sets_expression_ref ON graph_edge_sets (expression_ref);
    CREATE INDEX idx_graph_edge_sets_indexed_at ON graph_edge_sets (indexed_at);
    CREATE INDEX idx_graph_edge_sets_record ON graph_edge_sets USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS graph_edge_sets CASCADE;');
}
