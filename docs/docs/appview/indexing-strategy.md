---
sidebar_label: Indexing Strategy
sidebar_position: 6
---

# Indexing Strategy

## Record Type Classification

Not all 26 record types have the same indexing requirements. They fall into four volume tiers:

| Tier | Record Types | Expected Volume | Indexing Priority |
|---|---|---|---|
| High-volume | `annotationLayer`, `graphEdge`, `graphEdgeSet` | Millions per corpus | Batch-optimized writes, ES bulk API |
| Moderate | `expression`, `segmentation`, `alignment`, `corpus.membership` | Thousands to hundreds of thousands | Standard indexing |
| Low-volume | `corpus`, `ontology`, `typeDef`, `experimentDef`, `persona`, `media`, `eprint` | Hundreds to thousands total | Immediate indexing |
| Structural | `resource.*`, `judgment.*`, `clusterSet`, `dataLink`, `collectionMembership`, `templateComposition`, `changelog.entry` | Hundreds | Immediate indexing |

## Indexing by Namespace

### Expression Indexing

Each `expression` record is written to PostgreSQL, Elasticsearch, and Neo4j.

**PostgreSQL:** Extract `text`, `kind`, `language`, `sourceUrl`, `sourceRef`, `eprintRef`, `parentRef` into dedicated columns. Store the full record as JSONB.

**Elasticsearch:** Index `text` with language-specific analyzers (stemming, Unicode normalization). Index `kind`, `language`, `sourceUrl` as keyword fields for filtering. Enable completion suggester on expression text for autocomplete.

**Neo4j:** Create an `Expression` node. If `parentRef` is set, create a `PARENT_OF` edge from parent to child. If `sourceRef` or `eprintRef` is set, create `REFERENCES` edges.

**Cross-references extracted:** `sourceUrl`, `sourceRef`, `eprintRef`, `parentRef`, `mediaRef`

### Segmentation Indexing

**PostgreSQL only.** Extract `expression` (the referenced expression AT-URI), `strategy`, and computed `tokenCount`. Segmentation data (token arrays) is stored in the JSONB `record` column and queried through the expression it belongs to.

Segmentations are not indexed in ES or Neo4j because they are always accessed through their parent expression, never searched independently.

### Annotation Indexing

Annotation indexing is the most complex operation because an `annotationLayer` record embeds an `annotations` array that can contain hundreds of individual annotation objects.

**PostgreSQL (normalized):** Write the `annotationLayer` record to the `annotation_layers` table. Then expand the embedded `annotations` array into individual rows in the `annotations` table, each linked to the layer by `layer_uri`. This enables SQL joins and per-annotation queries.

```sql
-- annotation_layers row
INSERT INTO annotation_layers (uri, did, rkey, expression_ref, segmentation_ref,
  kind, subkind, formalism, ontology_ref, persona_ref, annotation_count, record)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);

-- annotations rows (one per embedded annotation)
INSERT INTO annotations (layer_uri, index, label, value, anchor_type,
  start_offset, end_offset, token_index, confidence)
SELECT $1, ordinality - 1, elem->>'label', elem->>'value',
  CASE WHEN elem->'anchor'->>'textSpan' IS NOT NULL THEN 'textSpan'
       WHEN elem->'anchor'->>'tokenRef' IS NOT NULL THEN 'tokenRef'
       WHEN elem->'anchor'->>'temporalSpan' IS NOT NULL THEN 'temporalSpan'
       ELSE 'other' END,
  (elem->'anchor'->'textSpan'->>'start')::int,
  (elem->'anchor'->'textSpan'->>'end')::int,
  (elem->'anchor'->'tokenRef'->>'tokenIndex')::int,
  (elem->>'confidence')::int
FROM jsonb_array_elements($12->'annotations') WITH ORDINALITY AS t(elem, ordinality);
```

**Elasticsearch (nested):** Index the `annotationLayer` as a single ES document with `annotations` as a nested array. This allows faceted queries across `kind`, `subkind`, `formalism`, and per-annotation `label` values in a single query.

**Neo4j:** Create an `AnnotationLayer` node with `ANNOTATES` edge to the expression, `USES_ONTOLOGY` edge to the ontology (if set), and `BY_PERSONA` edge to the persona (if set). For annotation layers with `knowledgeRefs` in individual annotations, create `KNOWLEDGE_REF` edges to external KB nodes.

### Ontology and TypeDef Indexing

**PostgreSQL + Elasticsearch:** Ontologies are searchable by `name`, `domain`, and `description`. TypeDefs are searchable by `name`, `kind`, and parent ontology.

**Neo4j (TypeDef only):** TypeDefs form a type hierarchy via `parentTypeRef`. Each `typeDef` becomes a node with `SUBTYPE_OF` edges forming the hierarchy tree.

### Corpus Indexing

**PostgreSQL + Elasticsearch:** Corpora are searchable by `name`, `language`, `license`, and annotation design metadata.

**Neo4j (membership only):** `corpus.membership` records create `MEMBER_OF` edges between expressions and corpora, enabling "find all expressions in corpus X" and "find all corpora containing expression Y" graph queries.

### Resource Indexing

**PostgreSQL + Elasticsearch (entry and collection only):** Resource entries are searchable by `lemma`, `form`, and `language`. Collections are searchable by `name`.

Other resource types (`template`, `filling`, `templateComposition`, `collectionMembership`) are stored in PostgreSQL only and accessed through their parent collection or experiment.

### Judgment Indexing

**PostgreSQL + Elasticsearch (experimentDef only):** Experiment definitions are searchable by `measureType`, `taskType`, and `name`.

`judgmentSet` and `agreementReport` records are stored in PostgreSQL only, linked to their experiment by `experimentRef`.

### Alignment Indexing

**PostgreSQL + Neo4j:** Each alignment creates `ALIGNS` edges between source and target records in Neo4j, enabling cross-layer and cross-lingual traversal.

### Graph Indexing

The `graph.*` namespace is the primary driver for Neo4j.

**graphNode:** Each node becomes a Neo4j node labeled by its `kind` (entity, concept, situation, state, time, location, claim). `knowledgeRefs` create edges to external KB identifier nodes.

**graphEdge:** Each edge becomes a Neo4j relationship between its `source` and `target` objects, typed by the edge's `edgeType`. Confidence scores and metadata are stored as relationship properties.

**graphEdgeSet:** Expanded into individual Neo4j edges. The set record itself is stored in PostgreSQL for provenance tracking.

### Persona, Media, Eprint Indexing

All three are low-volume types indexed into PostgreSQL and Elasticsearch for search. `eprint.dataLink` records additionally create edges in Neo4j connecting eprints to corpora, expressions, or annotation layers.

### Changelog Indexing

Changelog entries are indexed into PostgreSQL and Elasticsearch. The `subject` AT-URI and `subjectCollection` NSID are stored as indexed columns in PostgreSQL for efficient filtering. The `sections` array is stored as JSONB in PostgreSQL and as nested objects in Elasticsearch, enabling faceted search by category and change type. The `targets` array within each change item is indexed into the `cross_references` table so that reverse lookups work ("find all changelogs that reference this annotation").

## Cross-Reference Index

Every AT-URI reference field in every record is extracted and written to the `cross_references` table:

| ref_type | Source Record | Field |
|---|---|---|
| `sourceUrl` | expression | `sourceUrl` |
| `sourceRef` | expression | `sourceRef` |
| `eprintRef` | expression | `eprintRef` |
| `parentRef` | expression | `parentRef` |
| `mediaRef` | expression | `mediaRef` |
| `expressionRef` | segmentation, annotationLayer | `expression` |
| `segmentationRef` | annotationLayer | `segmentation` |
| `ontologyRef` | annotationLayer | `ontologyRef` |
| `personaRef` | annotationLayer | `personaRef` |
| `corpusRef` | membership | `corpus` |
| `experimentRef` | judgmentSet, agreementReport | `experimentRef` |
| `templateRef` | filling, templateComposition | `templateRef` |
| `graphTarget` | graphEdge | `target` |
| `eprintLink` | dataLink | `eprintRef`, `dataRef` |
| `subjectRef` | changelog.entry | `subject` |
| `changeTarget` | changelog.entry | `sections[].items[].targets[]` |

This index enables reverse lookups: "find everything that references this expression" resolves to a single query on `cross_references WHERE target_uri = $1`.

## Materialized Views

For expensive aggregation queries, the appview maintains materialized views refreshed by background jobs:

| View | Content | Refresh Interval |
|---|---|---|
| `corpus_statistics` | Per-corpus expression count, annotation layer count, language distribution | 15 minutes |
| `annotation_coverage` | Per-expression count of annotation layers by kind/subkind | 15 minutes |
| `label_distribution` | Per-annotation-layer label frequency histogram | 1 hour |
| `knowledge_graph_density` | Per-graph-node edge count and type distribution | 1 hour |

## Re-Indexing

### Full Re-Index

Reset the firehose cursor to 0 and replay all events. ES and Neo4j are rebuilt from PG. Estimated time depends on record volume; for a corpus of 100k expressions with 500k annotation layers, expect several hours.

### Incremental Re-Index

A background job compares PG records against ES documents and Neo4j nodes, re-indexing any mismatches. Runs on a configurable schedule (default: daily).

### Schema Migration

When the Layers lexicon schema changes (new fields, changed types), run a migration that:
1. Applies PG schema migration via node-pg-migrate
2. Updates ES mappings (adding new fields is non-breaking; type changes require re-index)
3. Updates Neo4j constraints and indexes
4. Triggers incremental re-index for affected record types

## See Also

- [Database Design](./database-design) for schema details and DDL
- [Firehose Ingestion](./firehose-ingestion) for how records arrive
- [Query and Discovery](./query-discovery) for how indexed data is queried
