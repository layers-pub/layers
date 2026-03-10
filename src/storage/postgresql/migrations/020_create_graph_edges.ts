/**
 * Migration to create the graph_edges table for indexing pub.layers.graph.graphEdge records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE graph_edges (
        uri           TEXT PRIMARY KEY,
        did           TEXT NOT NULL,
        rkey          TEXT NOT NULL,
        source_ref    TEXT NOT NULL,
        target_ref    TEXT NOT NULL,
        edge_type     TEXT NOT NULL,
        edge_set_ref  TEXT,
        confidence    INTEGER,
        indexed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        record        JSONB NOT NULL,
        CONSTRAINT graph_edges_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_graph_edges_did ON graph_edges (did);
    CREATE INDEX idx_graph_edges_source_ref ON graph_edges (source_ref);
    CREATE INDEX idx_graph_edges_target_ref ON graph_edges (target_ref);
    CREATE INDEX idx_graph_edges_edge_type ON graph_edges (edge_type);
    CREATE INDEX idx_graph_edges_indexed_at ON graph_edges (indexed_at);
    CREATE INDEX idx_graph_edges_record ON graph_edges USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS graph_edges CASCADE;');
}
