---
sidebar_label: Database Design
sidebar_position: 3
---

# Database Design

The Layers appview indexes all 26 `pub.layers.*` record types across four storage backends. Each backend serves a distinct purpose: PostgreSQL is the authoritative source of truth, Elasticsearch and Neo4j are derived indexes optimized for specific query patterns, and Redis handles ephemeral state. Every piece of data in Elasticsearch and Neo4j can be reconstructed from PostgreSQL, and every row in PostgreSQL can be reconstructed from the ATProto firehose.

## Database Roles

| Database | Role | Data Lifetime | Rebuildable From |
|----------|------|---------------|------------------|
| **PostgreSQL 16+** | Source of truth. Stores every indexed record as structured columns plus full JSONB. Handles relational queries, cross-reference lookups, and transactional writes. | Persistent | ATProto firehose (cursor 0) |
| **Elasticsearch 8+** | Full-text search, faceted filtering, and aggregation. Powers the search API for expressions, annotations, ontologies, graph nodes, and other searchable record types. | Persistent (derived) | PostgreSQL |
| **Neo4j 5+** | Knowledge graph and cross-reference traversal. Models the dense reference network between expressions, annotations, graph nodes, ontologies, and alignments as a native graph for efficient path queries. | Persistent (derived) | PostgreSQL |
| **Redis 7+** | Cache, session management, rate limiting, and job queue backing store (BullMQ). All data is ephemeral and can be lost without affecting correctness. | Ephemeral | N/A (regenerated on demand) |

**Why four databases?** Layers' record types are densely cross-referenced and support diverse query patterns that no single database handles well:

- **Relational integrity** (foreign keys, transactions, JSONB queries) requires PostgreSQL.
- **Full-text search with faceting** (language-aware stemming, nested annotation search, aggregation buckets) requires Elasticsearch.
- **Graph traversal** (multi-hop cross-reference walks, shortest path between annotations, subgraph extraction) requires Neo4j.
- **Sub-millisecond ephemeral state** (session tokens, rate-limit counters, cached records, job queues) requires Redis.

Running all four adds operational complexity, but the alternative (forcing PostgreSQL to handle graph traversal or Elasticsearch to handle transactional writes) produces worse performance and more brittle code.

## PostgreSQL Schema

PostgreSQL is the authoritative store. Every record ingested from the firehose is written here first. Tables follow consistent conventions:

### Conventions

- **Table names** are derived from record type names, lowercased and pluralized (e.g., `pub.layers.expression.expression` becomes `expressions`).
- **Primary key** is always `uri` (the AT-URI of the record, e.g., `at://did:plc:abc123/pub.layers.expression.expression/rkey`).
- **Standard columns** appear on every table: `uri`, `did` (record owner DID), `rkey` (record key), `indexed_at` (timestamp of indexing), and `record` (full record as JSONB).
- **Extracted columns** pull frequently queried fields out of the JSONB into dedicated typed columns for efficient indexing. The `record` column always contains the complete record for schema-evolution resilience.
- **Cross-references** are extracted into both dedicated columns on the source table (for direct lookups) and into the shared `cross_references` table (for reverse lookups and graph construction).

### Core Pipeline Tables

These tables correspond to the core pipeline lexicons that build incrementally: expression, segmentation, annotation.

#### `expressions`

Stores `pub.layers.expression.expression` records.

```sql
CREATE TABLE expressions (
    uri         TEXT PRIMARY KEY,
    did         TEXT NOT NULL,
    rkey        TEXT NOT NULL,
    text        TEXT,
    kind        TEXT,
    language    TEXT,
    source_url  TEXT,
    source_ref  TEXT,       -- AT-URI of source expression
    eprint_ref  TEXT,       -- AT-URI of linked eprint
    parent_ref  TEXT,       -- AT-URI of parent expression
    indexed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    record      JSONB NOT NULL,

    CONSTRAINT expressions_did_rkey_unique UNIQUE (did, rkey)
);

CREATE INDEX idx_expressions_did ON expressions (did);
CREATE INDEX idx_expressions_kind_language ON expressions (kind, language);
CREATE INDEX idx_expressions_source_url ON expressions (source_url)
    WHERE source_url IS NOT NULL;
CREATE INDEX idx_expressions_parent_ref ON expressions (parent_ref)
    WHERE parent_ref IS NOT NULL;
CREATE INDEX idx_expressions_eprint_ref ON expressions (eprint_ref)
    WHERE eprint_ref IS NOT NULL;
CREATE INDEX idx_expressions_record ON expressions USING GIN (record);
CREATE INDEX idx_expressions_indexed_at ON expressions (indexed_at);
```

#### `segmentations`

Stores `pub.layers.segmentation.segmentation` records.

```sql
CREATE TABLE segmentations (
    uri             TEXT PRIMARY KEY,
    did             TEXT NOT NULL,
    rkey            TEXT NOT NULL,
    expression_ref  TEXT NOT NULL,  -- AT-URI of target expression
    strategy        TEXT,
    token_count     INTEGER,
    indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    record          JSONB NOT NULL,

    CONSTRAINT segmentations_did_rkey_unique UNIQUE (did, rkey)
);

CREATE INDEX idx_segmentations_did ON segmentations (did);
CREATE INDEX idx_segmentations_expression_ref ON segmentations (expression_ref);
CREATE INDEX idx_segmentations_strategy ON segmentations (strategy);
CREATE INDEX idx_segmentations_record ON segmentations USING GIN (record);
```

#### `annotation_layers`

Stores `pub.layers.annotation.annotationLayer` records. The embedded `annotations` array is normalized into a separate `annotations` table.

```sql
CREATE TABLE annotation_layers (
    uri               TEXT PRIMARY KEY,
    did               TEXT NOT NULL,
    rkey              TEXT NOT NULL,
    expression_ref    TEXT NOT NULL,   -- AT-URI of annotated expression
    segmentation_ref  TEXT,            -- AT-URI of segmentation used
    kind              TEXT NOT NULL,
    subkind           TEXT,
    formalism         TEXT,
    ontology_ref      TEXT,            -- AT-URI of governing ontology
    persona_ref       TEXT,            -- AT-URI of annotator persona
    annotation_count  INTEGER NOT NULL DEFAULT 0,
    indexed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    record            JSONB NOT NULL,

    CONSTRAINT annotation_layers_did_rkey_unique UNIQUE (did, rkey)
);

CREATE INDEX idx_annotation_layers_did ON annotation_layers (did);
CREATE INDEX idx_annotation_layers_expression_ref ON annotation_layers (expression_ref);
CREATE INDEX idx_annotation_layers_kind ON annotation_layers (kind);
CREATE INDEX idx_annotation_layers_kind_subkind ON annotation_layers (kind, subkind);
CREATE INDEX idx_annotation_layers_kind_subkind_formalism
    ON annotation_layers (kind, subkind, formalism);
CREATE INDEX idx_annotation_layers_ontology_ref ON annotation_layers (ontology_ref)
    WHERE ontology_ref IS NOT NULL;
CREATE INDEX idx_annotation_layers_record ON annotation_layers USING GIN (record);
```

#### `annotations`

Normalized from the embedded `annotations` array within each `annotationLayer` record. Each row represents one annotation. This table has no `uri` of its own; it is keyed by the parent layer's URI plus the array index.

```sql
CREATE TABLE annotations (
    layer_uri     TEXT NOT NULL REFERENCES annotation_layers(uri) ON DELETE CASCADE,
    index         INTEGER NOT NULL,
    label         TEXT,
    value         TEXT,
    anchor_type   TEXT,          -- textSpan, tokenRef, temporalSpan, etc.
    start_offset  INTEGER,
    end_offset    INTEGER,
    token_index   INTEGER,
    confidence    REAL,
    record        JSONB NOT NULL,

    PRIMARY KEY (layer_uri, index)
);

CREATE INDEX idx_annotations_label ON annotations (label);
CREATE INDEX idx_annotations_anchor_type ON annotations (anchor_type);
CREATE INDEX idx_annotations_layer_uri ON annotations (layer_uri);
CREATE INDEX idx_annotations_record ON annotations USING GIN (record);
```

#### `cluster_sets`

Stores `pub.layers.annotation.clusterSet` records.

```sql
CREATE TABLE cluster_sets (
    uri             TEXT PRIMARY KEY,
    did             TEXT NOT NULL,
    rkey            TEXT NOT NULL,
    expression_ref  TEXT,
    kind            TEXT,
    indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    record          JSONB NOT NULL,

    CONSTRAINT cluster_sets_did_rkey_unique UNIQUE (did, rkey)
);

CREATE INDEX idx_cluster_sets_did ON cluster_sets (did);
CREATE INDEX idx_cluster_sets_expression_ref ON cluster_sets (expression_ref)
    WHERE expression_ref IS NOT NULL;
CREATE INDEX idx_cluster_sets_kind ON cluster_sets (kind);
CREATE INDEX idx_cluster_sets_record ON cluster_sets USING GIN (record);
```

### Parallel Track Tables

These tables store records from the parallel support lexicons. They follow the same column conventions (uri, did, rkey, indexed_at, record) with type-specific extracted columns.

| Table | Record Type | Key Extracted Columns |
|-------|------------|----------------------|
| `ontologies` | `ontology.ontology` | `name`, `domain`, `version` |
| `type_defs` | `ontology.typeDef` | `ontology_ref`, `label`, `relation_type` |
| `corpora` | `corpus.corpus` | `name`, `language`, `license` |
| `corpus_memberships` | `corpus.membership` | `corpus_ref`, `expression_ref` |
| `resource_entries` | `resource.entry` | `lemma`, `form`, `language`, `collection_ref` |
| `resource_collections` | `resource.collection` | `name`, `collection_type` |
| `collection_memberships` | `resource.collectionMembership` | `collection_ref`, `entry_ref` |
| `templates` | `resource.template` | `name`, `slot_count` |
| `fillings` | `resource.filling` | `template_ref`, `expression_ref` |
| `template_compositions` | `resource.templateComposition` | `name`, `template_refs` (JSONB) |
| `experiment_defs` | `judgment.experimentDef` | `measure`, `task_type`, `design_type` |
| `judgment_sets` | `judgment.judgmentSet` | `experiment_ref`, `annotator_did` |
| `agreement_reports` | `judgment.agreementReport` | `experiment_ref`, `metric`, `score` |
| `alignments` | `alignment.alignment` | `source_ref`, `target_ref`, `alignment_type` |

### Integration Tables

| Table | Record Type | Key Extracted Columns |
|-------|------------|----------------------|
| `graph_nodes` | `graph.graphNode` | `kind`, `name`, `description`, `ontology_ref` |
| `graph_edges` | `graph.graphEdge` | `source_ref`, `target_ref`, `edge_type`, `edge_set_ref` |
| `graph_edge_sets` | `graph.graphEdgeSet` | `name`, `edge_type`, `edge_count` |
| `personas` | `persona.persona` | `name`, `domain`, `kind` |
| `media_records` | `media.media` | `modality`, `mime_type`, `duration`, `expression_ref` |
| `eprints` | `eprint.eprint` | `identifier`, `title`, `platform`, `doi` |
| `data_links` | `eprint.dataLink` | `eprint_ref`, `corpus_ref`, `link_type` |
| `changelogs` | `changelog.entry` | `subject_uri`, `subject_collection`, `version`, `summary`, `sections` (JSONB) |

### Cross-Reference Table

A single denormalized table captures every cross-reference between records. This table is the source for building Neo4j edges and for reverse-lookup queries ("which records reference this expression?").

```sql
CREATE TABLE cross_references (
    source_uri  TEXT NOT NULL,
    target_uri  TEXT NOT NULL,
    ref_type    TEXT NOT NULL,  -- sourceRef, sourceUrl, eprintRef, parentRef,
                                -- expressionRef, segmentationRef, ontologyRef,
                                -- personaRef, corpusRef, templateRef, etc.
    indexed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (source_uri, target_uri, ref_type)
);

CREATE INDEX idx_cross_references_target ON cross_references (target_uri);
CREATE INDEX idx_cross_references_ref_type ON cross_references (ref_type);
CREATE INDEX idx_cross_references_source ON cross_references (source_uri);
```

Every time a record is ingested, the indexer extracts all AT-URI references from the record and inserts rows into `cross_references`. This enables queries like:

```sql
-- Find all annotation layers that reference a given expression
SELECT al.*
FROM annotation_layers al
JOIN cross_references cr ON cr.source_uri = al.uri
WHERE cr.target_uri = 'at://did:plc:abc123/pub.layers.expression.expression/doc1'
  AND cr.ref_type = 'expressionRef';

-- Find all records of any type that reference a given ontology
SELECT cr.source_uri, cr.ref_type
FROM cross_references cr
WHERE cr.target_uri = 'at://did:plc:abc123/pub.layers.ontology.ontology/ud-pos'
ORDER BY cr.indexed_at DESC;
```

## Elasticsearch Mappings

Elasticsearch indexes are derived from PostgreSQL. Only record types that benefit from full-text search or faceted aggregation are indexed. See the [Record Type Coverage Matrix](./index.md#record-type-coverage-matrix) for the full list.

### Custom Analyzers

Layers configures custom analyzers for linguistic data:

```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        "layers_text": {
          "type": "custom",
          "tokenizer": "icu_tokenizer",
          "filter": ["icu_normalizer", "icu_folding", "lowercase"]
        },
        "layers_linguistic": {
          "type": "custom",
          "tokenizer": "icu_tokenizer",
          "filter": [
            "icu_normalizer",
            "icu_folding",
            "lowercase",
            "english_stemmer"
          ]
        }
      },
      "filter": {
        "english_stemmer": {
          "type": "stemmer",
          "language": "english"
        }
      }
    }
  }
}
```

The `layers_text` analyzer provides Unicode-normalized, case-folded tokenization suitable for multilingual linguistic data. The `layers_linguistic` analyzer adds English stemming for metadata search. Language-specific stemmers are configured per index when the corpus language is known.

### Index: `expressions`

```json
{
  "mappings": {
    "properties": {
      "uri":         { "type": "keyword" },
      "did":         { "type": "keyword" },
      "text":        { "type": "text", "analyzer": "layers_text",
                       "fields": { "raw": { "type": "keyword", "ignore_above": 32766 } } },
      "kind":        { "type": "keyword" },
      "language":    { "type": "keyword" },
      "source_url":  { "type": "keyword" },
      "source_ref":  { "type": "keyword" },
      "eprint_ref":  { "type": "keyword" },
      "parent_ref":  { "type": "keyword" },
      "indexed_at":  { "type": "date" }
    }
  }
}
```

Supports queries like: full-text search over expression text, faceted filtering by kind and language, and lookup by source URL or eprint reference.

### Index: `annotation_layers`

```json
{
  "mappings": {
    "properties": {
      "uri":              { "type": "keyword" },
      "did":              { "type": "keyword" },
      "expression_ref":   { "type": "keyword" },
      "kind":             { "type": "keyword" },
      "subkind":          { "type": "keyword" },
      "formalism":        { "type": "keyword" },
      "ontology_ref":     { "type": "keyword" },
      "persona_ref":      { "type": "keyword" },
      "annotation_count": { "type": "integer" },
      "annotations": {
        "type": "nested",
        "properties": {
          "label":        { "type": "keyword" },
          "value":        { "type": "text", "analyzer": "layers_text" },
          "anchor_type":  { "type": "keyword" },
          "confidence":   { "type": "float" }
        }
      },
      "indexed_at":       { "type": "date" }
    }
  }
}
```

The `annotations` field uses Elasticsearch's `nested` type so that queries can filter on label-value pairs without cross-matching (e.g., find layers where at least one annotation has label "NNP" and confidence > 0.9, without accidentally matching label "NNP" from one annotation against confidence 0.9 from another).

### Index: `ontologies`

```json
{
  "mappings": {
    "properties": {
      "uri":       { "type": "keyword" },
      "did":       { "type": "keyword" },
      "name":      { "type": "text", "analyzer": "layers_linguistic",
                     "fields": { "keyword": { "type": "keyword" } } },
      "domain":    { "type": "keyword" },
      "version":   { "type": "keyword" },
      "indexed_at": { "type": "date" }
    }
  }
}
```

### Index: `graph_nodes`

```json
{
  "mappings": {
    "properties": {
      "uri":          { "type": "keyword" },
      "did":          { "type": "keyword" },
      "kind":         { "type": "keyword" },
      "name":         { "type": "text", "analyzer": "layers_linguistic",
                        "fields": { "keyword": { "type": "keyword" } } },
      "description":  { "type": "text", "analyzer": "layers_linguistic" },
      "ontology_ref": { "type": "keyword" },
      "indexed_at":   { "type": "date" }
    }
  }
}
```

### Additional Indexes

The following indexes use simpler mappings with the same conventions (keyword for identifiers and enum fields, text with `layers_text` or `layers_linguistic` for human-readable fields):

| Index | Key Text Fields | Key Keyword Fields |
|-------|----------------|-------------------|
| `type_defs` | `label`, `description` | `ontology_ref`, `relation_type` |
| `corpora` | `name`, `description` | `language`, `license` |
| `resource_entries` | `lemma`, `form` | `language`, `collection_ref` |
| `resource_collections` | `name` | `collection_type` |
| `experiment_defs` | `name`, `description` | `measure`, `task_type`, `design_type` |
| `personas` | `name`, `description` | `domain`, `kind` |
| `media_records` | `description` | `modality`, `mime_type` |
| `eprints` | `title`, `abstract` | `identifier`, `platform`, `doi` |

## Neo4j Graph Model

Neo4j stores the cross-reference graph derived from PostgreSQL. Every record that participates in cross-references becomes a node; every reference becomes a relationship. This enables multi-hop traversal queries that would require expensive recursive CTEs in PostgreSQL.

### Node Labels

Each indexed record type maps to a Neo4j node label. All nodes carry at minimum the `uri` and `did` properties.

| Node Label | Source Table | Key Properties |
|------------|-------------|----------------|
| `Expression` | `expressions` | `uri`, `did`, `kind`, `language`, `text` (truncated) |
| `AnnotationLayer` | `annotation_layers` | `uri`, `did`, `kind`, `subkind`, `formalism` |
| `Annotation` | `annotations` | `layer_uri`, `index`, `label`, `value`, `confidence` |
| `ClusterSet` | `cluster_sets` | `uri`, `did`, `kind` |
| `Ontology` | `ontologies` | `uri`, `did`, `name`, `domain` |
| `TypeDef` | `type_defs` | `uri`, `did`, `label`, `relation_type` |
| `Corpus` | `corpora` | `uri`, `did`, `name`, `language` |
| `GraphNode` | `graph_nodes` | `uri`, `did`, `kind`, `name` |
| `GraphEdge` | `graph_edges` | `uri`, `did`, `edge_type` |
| `Persona` | `personas` | `uri`, `did`, `name`, `kind` |
| `Media` | `media_records` | `uri`, `did`, `modality` |
| `Eprint` | `eprints` | `uri`, `did`, `identifier`, `title` |
| `Alignment` | `alignments` | `uri`, `did`, `alignment_type` |

### Relationship Types

| Relationship | Source Node | Target Node | Derived From |
|-------------|------------|-------------|-------------|
| `PARENT_OF` | `Expression` | `Expression` | `expressions.parent_ref` |
| `SEGMENTED_BY` | `Expression` | `Segmentation` | `segmentations.expression_ref` |
| `ANNOTATES` | `AnnotationLayer` | `Expression` | `annotation_layers.expression_ref` |
| `USES_ONTOLOGY` | `AnnotationLayer` | `Ontology` | `annotation_layers.ontology_ref` |
| `MEMBER_OF` | `Expression` | `Corpus` | `corpus_memberships` |
| `REFERENCES` | any node | any node | `cross_references` table (generic) |
| `GRAPH_EDGE` | `GraphNode` | `GraphNode` | `graph_edges` (typed via `edge_type` property) |
| `KNOWLEDGE_REF` | `Annotation` | `GraphNode` | `knowledgeRefs` in annotation JSONB |
| `ALIGNS` | `Alignment` | `Expression` / `AnnotationLayer` | `alignments.source_ref`, `alignments.target_ref` |
| `LINKS_EPRINT` | `DataLink` | `Eprint` / `Corpus` | `data_links.eprint_ref`, `data_links.corpus_ref` |

### Cypher Examples

Creating an expression node and its relationships:

```cypher
// Create an expression node
MERGE (e:Expression {uri: $uri})
SET e.did       = $did,
    e.kind      = $kind,
    e.language  = $language,
    e.text      = left($text, 500),
    e.indexedAt = datetime()

// Link to parent expression
WITH e
MATCH (parent:Expression {uri: $parentRef})
MERGE (parent)-[:PARENT_OF]->(e)

// Link to corpus membership
WITH e
MATCH (c:Corpus {uri: $corpusRef})
MERGE (e)-[:MEMBER_OF]->(c)
```

Multi-hop traversal to find all annotations on an expression and its children:

```cypher
// Find all annotation layers on an expression tree (up to 5 levels deep)
MATCH (root:Expression {uri: $rootUri})
MATCH (root)-[:PARENT_OF*0..5]->(child:Expression)
MATCH (layer:AnnotationLayer)-[:ANNOTATES]->(child)
RETURN child.uri AS expressionUri,
       layer.uri AS layerUri,
       layer.kind AS kind,
       layer.subkind AS subkind
ORDER BY child.uri, layer.kind
```

Shortest path between two graph nodes:

```cypher
MATCH path = shortestPath(
    (a:GraphNode {uri: $sourceUri})-[:GRAPH_EDGE*..10]-(b:GraphNode {uri: $targetUri})
)
RETURN [n IN nodes(path) | n.uri] AS nodeUris,
       [r IN relationships(path) | r.edge_type] AS edgeTypes
```

### Indexes and Constraints

```cypher
-- Uniqueness constraint on uri for all node labels
CREATE CONSTRAINT expression_uri IF NOT EXISTS
    FOR (n:Expression) REQUIRE n.uri IS UNIQUE;
CREATE CONSTRAINT annotation_layer_uri IF NOT EXISTS
    FOR (n:AnnotationLayer) REQUIRE n.uri IS UNIQUE;
CREATE CONSTRAINT graph_node_uri IF NOT EXISTS
    FOR (n:GraphNode) REQUIRE n.uri IS UNIQUE;
-- (repeated for all node labels)

-- Full-text index for graph node search
CREATE FULLTEXT INDEX graph_node_search IF NOT EXISTS
    FOR (n:GraphNode) ON EACH [n.name, n.description];
```

## Redis Data Model

Redis stores ephemeral data only. Nothing in Redis is required for correctness; if Redis is flushed, the system recovers gracefully through cache misses and session re-authentication.

### Key Patterns

| Pattern | Type | TTL | Purpose |
|---------|------|-----|---------|
| `session:{did}:{token}` | Hash | 24h | User session data (DID, scope, issued-at) |
| `record:{uri}` | String (JSON) | 5m | Cached record fetched from PG |
| `ratelimit:{did}:{endpoint}` | Sorted set | 60s | Sliding-window rate limiter (timestamps as scores) |
| `resolve:{did}` | String | 1h | Cached DID-to-PDS resolution |
| `cursor:firehose` | String | none | Last processed firehose cursor for resumption |

### BullMQ Queue Keys

Job queues are managed by [BullMQ](https://docs.bullmq.io/) and use Redis as the backing store. BullMQ manages its own key namespace:

| Pattern | Purpose |
|---------|---------|
| `bull:{queueName}:wait` | Jobs waiting to be processed |
| `bull:{queueName}:active` | Jobs currently being processed |
| `bull:{queueName}:completed` | Completed jobs (with configurable retention) |
| `bull:{queueName}:failed` | Failed jobs awaiting retry or manual intervention |
| `bull:{queueName}:delayed` | Jobs scheduled for future processing |
| `bull:{queueName}:stalled` | Jobs detected as stalled by the stall checker |

Queue names include `firehose-ingest`, `es-sync`, `neo4j-sync`, `enrichment`, and `format-import`.

### Rate Limiting Example

```
-- Sliding window: allow 100 requests per 60 seconds per DID per endpoint
ZADD ratelimit:{did}:{endpoint} {timestamp} {requestId}
ZREMRANGEBYSCORE ratelimit:{did}:{endpoint} 0 {timestamp - 60}
ZCARD ratelimit:{did}:{endpoint}
-- If count > 100, reject with 429
EXPIRE ratelimit:{did}:{endpoint} 60
```

## Data Consistency

### Write Ordering

All writes follow a strict ordering to maintain consistency:

1. **PostgreSQL first.** The firehose consumer writes the record to PostgreSQL within a transaction. If the PG write fails, the record is not indexed anywhere.
2. **Elasticsearch and Neo4j second.** After the PG transaction commits, separate BullMQ jobs are enqueued to sync the record to ES and Neo4j. These jobs are idempotent and retryable.
3. **Redis as needed.** Cache entries are invalidated (or lazily expire via TTL) when records are updated or deleted.

### Eventual Consistency

Elasticsearch and Neo4j may lag behind PostgreSQL by seconds under normal load, or longer during backpressure or recovery. The API layer handles this by:

- Serving authoritative reads from PostgreSQL when consistency is required (e.g., immediately after a write).
- Serving search and graph queries from ES/Neo4j with the understanding that very recent changes may not yet be reflected.
- Including an `indexed_at` timestamp on all API responses so clients can assess freshness.

### Reconciliation

Background maintenance jobs periodically verify that ES and Neo4j are consistent with PostgreSQL:

| Job | Frequency | Behavior |
|-----|-----------|----------|
| `es-reconcile` | Hourly | Samples records from PG, checks presence and freshness in ES, re-syncs any stale or missing records |
| `neo4j-reconcile` | Hourly | Samples nodes and edges from PG, checks presence in Neo4j, re-syncs any stale or missing data |
| `full-reindex` | On-demand | Walks the entire PG database and rebuilds ES or Neo4j from scratch |

### Cursor-Based Rebuild

The entire database can be rebuilt from the ATProto firehose by resetting the cursor to 0:

1. Truncate all PG tables.
2. Reset `cursor:firehose` in Redis to `0`.
3. Restart the firehose consumer. It will replay every event and re-index all records.
4. ES and Neo4j are rebuilt as a side effect of the PG writes triggering sync jobs.

This process is also used for disaster recovery and for spinning up new appview instances.

## Migrations

Database migrations are managed with [node-pg-migrate](https://github.com/salsita/node-pg-migrate) (version 8+). Migrations apply only to PostgreSQL; Elasticsearch and Neo4j indexes are managed programmatically by the application.

### Conventions

- **Timestamp-based versioning**: migration files are named `{timestamp}_{description}.ts` (e.g., `1709234567890_create-expressions-table.ts`).
- **Reversible migrations**: every `up` function has a corresponding `down` function.
- **No data migrations in schema files**: data transformations are handled by separate scripts.

### Commands

| Command | Description |
|---------|-------------|
| `pnpm db:migrate:up` | Run all pending migrations |
| `pnpm db:migrate:down` | Revert the most recent migration |
| `pnpm db:migrate:create <name>` | Create a new migration file with timestamp prefix |

### Example Migration

```typescript
import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("expressions", {
    uri:        { type: "text", primaryKey: true },
    did:        { type: "text", notNull: true },
    rkey:       { type: "text", notNull: true },
    text:       { type: "text" },
    kind:       { type: "text" },
    language:   { type: "text" },
    source_url: { type: "text" },
    source_ref: { type: "text" },
    eprint_ref: { type: "text" },
    parent_ref: { type: "text" },
    indexed_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    record:     { type: "jsonb", notNull: true },
  });

  pgm.addConstraint("expressions", "expressions_did_rkey_unique", {
    unique: ["did", "rkey"],
  });

  pgm.createIndex("expressions", "did");
  pgm.createIndex("expressions", ["kind", "language"]);
  pgm.createIndex("expressions", "source_url", { where: "source_url IS NOT NULL" });
  pgm.createIndex("expressions", "parent_ref", { where: "parent_ref IS NOT NULL" });
  pgm.createIndex("expressions", "record", { method: "gin" });
  pgm.createIndex("expressions", "indexed_at");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("expressions");
}
```

## See Also

- [Lexicon Overview](../foundations/lexicon-overview) for the complete record type inventory and dependency graph
- [AppView Overview](./index.md) for the architecture diagram and record type coverage matrix
- [Technology Stack](./technology-stack) for database version pins and deployment configuration
- [Indexing Strategy](./indexing-strategy) for per-record-type indexing logic and annotation normalization
- [Firehose Ingestion](./firehose-ingestion) for how records flow from the firehose into the storage layer
