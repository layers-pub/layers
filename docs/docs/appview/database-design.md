---
sidebar_label: Database Design
sidebar_position: 3
---

# Database Design

The appview persists across four backends: Postgres is the source of
truth, Elasticsearch serves search, Neo4j holds cross-record relations,
and Redis caches OAuth sessions and rate-limit windows. Every backend
is wired through the `RecordSink` trait in `layers-storage` and is
optional via Cargo features (`postgres`, `elasticsearch`, `neo4j`,
`redis`).

## Postgres

One table per `pub.layers.*` record kind, with the same schema:

```sql
CREATE TABLE <table> (
    uri        TEXT PRIMARY KEY,
    did        TEXT NOT NULL,
    rkey       TEXT NOT NULL,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    record     JSONB NOT NULL
);
CREATE INDEX idx_<table>_did ON <table> (did);
CREATE INDEX idx_<table>_record ON <table> USING GIN (record);
```

Filter predicates declared in `orchestrator-spec/queries.json` query
JSONB via `record->>'<key>'`, so adding a new filter never requires a
schema migration. Every record body is canonical JSON of the typed
record emitted by `layers-codegen`; round-trip equality holds.

The cursor table:

```sql
CREATE TABLE firehose_cursors (
    subscription_id TEXT PRIMARY KEY,
    seq             BIGINT NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`PostgresCursorStore` implements `idiolect_indexer::CursorStore` over
this table; the indexer reads on start to resume and commits after
every live event.

Migrations live under `layers/migrations/`. `0001_firehose_cursors.sql`
plus `0002_record_tables.sql` carry the full schema; the binary's
`ensure_table()` calls are equivalent.

## Elasticsearch

`ElasticsearchRecordSink` indexes each record at
`<index>/_doc/<percent-encoded-uri>` where the index is the NSID
rewritten to dashes (`pub.layers.corpus.corpus` →
`pub-layers-corpus-corpus`). Document body carries the full record
JSON under `record` plus a small set of promoted top-level fields
(`name`, `language`, `title`, `displayName`, ...) the search
predicates can match without scripts. Indices auto-create on first
write with permissive default mappings.

## Neo4j

`Neo4jRecordSink` runs a cypher batch per record over the
`db/<name>/tx/commit` endpoint:

1. `MERGE (n:LayersRecord {uri}) SET n.did = $did, n.nsid = $nsid, n.body = $body`
2. For each typed reference the record carries (`MEMBER_OF`,
   `ALIGNS_FROM`, `GRAPH_FROM`, `ANNOTATES`, `SEGMENTS`,
   `ATTACHED_TO_EPRINT`, `CITES_CORPUS`, `IN_COLLECTION`,
   `DEFINED_IN`), a `MERGE (s)-[:<TYPE>]->(t)` against the target's
   `LayersRecord` node.

Deletion uses `MATCH (n:LayersRecord {uri}) DETACH DELETE n`.

## Redis

`layers_storage::redis_cache::connect` returns a `ConnectionManager`
the orchestrator and rate-limit middleware share. Conventional key
prefixes: `layers:resp:` for response cache, `layers:rl:` for sliding
windows, `layers:oauth:` for session persistence.
