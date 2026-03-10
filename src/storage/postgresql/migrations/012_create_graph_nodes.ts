/**
 * Migration to create the graph_nodes table for indexing pub.layers.graph.graphNode records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE graph_nodes (
        uri         TEXT PRIMARY KEY,
        did         TEXT NOT NULL,
        rkey        TEXT NOT NULL,
        node_type   TEXT NOT NULL,
        label       TEXT,
        indexed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        record      JSONB NOT NULL,
        CONSTRAINT graph_nodes_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_graph_nodes_did ON graph_nodes (did);
    CREATE INDEX idx_graph_nodes_node_type ON graph_nodes (node_type);
    CREATE INDEX idx_graph_nodes_indexed_at ON graph_nodes (indexed_at);
    CREATE INDEX idx_graph_nodes_record ON graph_nodes USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS graph_nodes CASCADE;');
}
