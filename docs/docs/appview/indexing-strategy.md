---
sidebar_label: Indexing Strategy
sidebar_position: 6
---

# Indexing Strategy

Every `pub.layers.*` commit follows a uniform path: Jetstream frame →
`RawEvent` → `LayersFamily::decode` → `AnyRecord` → `RecordSink` per
backend. The same code path serves every record kind; per-kind
behavior lives entirely in the lexicon and the generated record type.

## Per-record-kind tables

`PostgresRecordSink::table_for` maps each NSID to its Postgres table
name, e.g. `pub.layers.corpus.corpus` → `corpora`,
`pub.layers.corpus.membership` → `corpus_memberships`. The mapping is
1:1 with the migration set under `layers/migrations/`.

Every table has the same shape, `(uri, did, rkey, indexed_at, record JSONB)`,
plus a `did` btree index and a `record` GIN index. Filter columns are
JSONB-resolved on read, not extracted at write time, so adding a new
indexed field only requires updating the orchestrator query (or, for
hot fields, adding a CREATE INDEX on `(record->>'key')`).

## Cross-references

`Neo4jRecordSink` projects typed relationships out of the record body
into the graph. The relationship set is declared in
`crates/layers-storage/src/neo4j.rs::extract_relationships`:

| Relationship          | Source kind            | Target kind          |
| --------------------- | ---------------------- | -------------------- |
| `MEMBER_OF`           | corpus.membership      | corpus.corpus        |
| `FOR_EXPRESSION`      | corpus.membership      | expression           |
| `ALIGNS_FROM/_TO`     | alignment.alignment    | any                  |
| `GRAPH_FROM/_TO`      | graph.graphEdge        | any                  |
| `ANNOTATES`           | annotation.layer       | any                  |
| `SEGMENTS`            | segmentation           | any                  |
| `ATTACHED_TO_EPRINT`  | eprint.dataLink        | eprint.eprint        |
| `CITES_CORPUS`        | eprint.eprint          | corpus.corpus        |
| `CITES_EPRINT`        | any produce with `eprintRefs` | eprint.eprint |
| `IN_COLLECTION`       | resource.collectionMembership | resource.collection |
| `DEFINED_IN`          | ontology.typeDef       | ontology.ontology    |

Every top-level produce carries an always-array `eprintRefs` field;
each entry is projected as a `CITES_EPRINT` edge from the produce to the
eprint it cites, so corpus, expression, annotation layer, cluster set,
segmentation, alignment, ontology, experiment definition, graph edge
set, media, and collection records all contribute these edges.

Adding an edge type is a one-line match arm; the predicate uses the
same JSON body the orchestrator reads.

## Determinism

Every step is idempotent over `(did, collection, rkey)`. `Create` and
`Update` both go through the same `INSERT ... ON CONFLICT (uri) DO UPDATE`
upsert; `Delete` is a `DELETE WHERE uri = $1` that is a no-op when the
row is absent. The cursor commit happens after the sink call, so a
crash mid-write replays the same event and produces the same final
state.

## Backfill

A fresh appview starts with no cursor row, which causes Jetstream to
stream from the beginning of the keep-window. Backfill events arrive
flagged `live: false`; `drive_indexer` advances the handler but does
not commit the cursor on backfill, so a subsequent resync starts from
the same point and produces identical state.
