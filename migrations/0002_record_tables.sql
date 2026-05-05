-- Per-record-type tables for the 26 pub.layers.* NSIDs.
--
-- Every table has the same shape: a primary-key at-uri, the record's
-- DID/rkey for cheap filters, an indexed_at timestamp, and the full
-- record body as JSONB. Filter predicates declared in
-- `orchestrator-spec/queries.json` read from JSONB via `record->>'key'`,
-- so adding a new filter never requires a schema migration.
--
-- The indexer's PostgresRecordSink writes here via `table_for(nsid)`.

CREATE TABLE IF NOT EXISTS expressions (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_expressions_did ON expressions (did);
CREATE INDEX IF NOT EXISTS idx_expressions_record ON expressions USING GIN (record);

CREATE TABLE IF NOT EXISTS corpora (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_corpora_did ON corpora (did);
CREATE INDEX IF NOT EXISTS idx_corpora_record ON corpora USING GIN (record);

CREATE TABLE IF NOT EXISTS corpus_memberships (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_corpus_memberships_did ON corpus_memberships (did);
CREATE INDEX IF NOT EXISTS idx_corpus_memberships_record ON corpus_memberships USING GIN (record);

CREATE TABLE IF NOT EXISTS personas (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_personas_did ON personas (did);
CREATE INDEX IF NOT EXISTS idx_personas_record ON personas USING GIN (record);

CREATE TABLE IF NOT EXISTS media_records (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_records_did ON media_records (did);
CREATE INDEX IF NOT EXISTS idx_media_records_record ON media_records USING GIN (record);

CREATE TABLE IF NOT EXISTS eprints (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eprints_did ON eprints (did);
CREATE INDEX IF NOT EXISTS idx_eprints_record ON eprints USING GIN (record);

CREATE TABLE IF NOT EXISTS data_links (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_data_links_did ON data_links (did);
CREATE INDEX IF NOT EXISTS idx_data_links_record ON data_links USING GIN (record);

CREATE TABLE IF NOT EXISTS ontologies (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ontologies_did ON ontologies (did);
CREATE INDEX IF NOT EXISTS idx_ontologies_record ON ontologies USING GIN (record);

CREATE TABLE IF NOT EXISTS type_defs (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_type_defs_did ON type_defs (did);
CREATE INDEX IF NOT EXISTS idx_type_defs_record ON type_defs USING GIN (record);

CREATE TABLE IF NOT EXISTS segmentations (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_segmentations_did ON segmentations (did);
CREATE INDEX IF NOT EXISTS idx_segmentations_record ON segmentations USING GIN (record);

CREATE TABLE IF NOT EXISTS alignments (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alignments_did ON alignments (did);
CREATE INDEX IF NOT EXISTS idx_alignments_record ON alignments USING GIN (record);

CREATE TABLE IF NOT EXISTS annotation_layers (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_annotation_layers_did ON annotation_layers (did);
CREATE INDEX IF NOT EXISTS idx_annotation_layers_record ON annotation_layers USING GIN (record);

CREATE TABLE IF NOT EXISTS cluster_sets (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cluster_sets_did ON cluster_sets (did);
CREATE INDEX IF NOT EXISTS idx_cluster_sets_record ON cluster_sets USING GIN (record);

CREATE TABLE IF NOT EXISTS graph_nodes (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_did ON graph_nodes (did);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_record ON graph_nodes USING GIN (record);

CREATE TABLE IF NOT EXISTS graph_edges (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_graph_edges_did ON graph_edges (did);
CREATE INDEX IF NOT EXISTS idx_graph_edges_record ON graph_edges USING GIN (record);

CREATE TABLE IF NOT EXISTS graph_edge_sets (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_graph_edge_sets_did ON graph_edge_sets (did);
CREATE INDEX IF NOT EXISTS idx_graph_edge_sets_record ON graph_edge_sets USING GIN (record);

CREATE TABLE IF NOT EXISTS experiment_defs (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_experiment_defs_did ON experiment_defs (did);
CREATE INDEX IF NOT EXISTS idx_experiment_defs_record ON experiment_defs USING GIN (record);

CREATE TABLE IF NOT EXISTS judgment_sets (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_judgment_sets_did ON judgment_sets (did);
CREATE INDEX IF NOT EXISTS idx_judgment_sets_record ON judgment_sets USING GIN (record);

CREATE TABLE IF NOT EXISTS agreement_reports (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agreement_reports_did ON agreement_reports (did);
CREATE INDEX IF NOT EXISTS idx_agreement_reports_record ON agreement_reports USING GIN (record);

CREATE TABLE IF NOT EXISTS resource_collections (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resource_collections_did ON resource_collections (did);
CREATE INDEX IF NOT EXISTS idx_resource_collections_record ON resource_collections USING GIN (record);

CREATE TABLE IF NOT EXISTS resource_collection_memberships (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resource_collection_memberships_did ON resource_collection_memberships (did);
CREATE INDEX IF NOT EXISTS idx_resource_collection_memberships_record ON resource_collection_memberships USING GIN (record);

CREATE TABLE IF NOT EXISTS resource_entries (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resource_entries_did ON resource_entries (did);
CREATE INDEX IF NOT EXISTS idx_resource_entries_record ON resource_entries USING GIN (record);

CREATE TABLE IF NOT EXISTS resource_fillings (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resource_fillings_did ON resource_fillings (did);
CREATE INDEX IF NOT EXISTS idx_resource_fillings_record ON resource_fillings USING GIN (record);

CREATE TABLE IF NOT EXISTS resource_templates (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resource_templates_did ON resource_templates (did);
CREATE INDEX IF NOT EXISTS idx_resource_templates_record ON resource_templates USING GIN (record);

CREATE TABLE IF NOT EXISTS resource_template_compositions (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resource_template_compositions_did ON resource_template_compositions (did);
CREATE INDEX IF NOT EXISTS idx_resource_template_compositions_record ON resource_template_compositions USING GIN (record);

CREATE TABLE IF NOT EXISTS changelog_entries (
    uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,
    cid TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_changelog_entries_did ON changelog_entries (did);
CREATE INDEX IF NOT EXISTS idx_changelog_entries_record ON changelog_entries USING GIN (record);
