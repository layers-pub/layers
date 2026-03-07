---
sidebar_label: Background Jobs
sidebar_position: 9
---

# Background Jobs and Workers

## Job vs Worker Distinction

Following Chive's pattern, background work is split between two code locations:

- **Jobs** (`src/jobs/`): Scheduled interval-based tasks that run within the API server process. Each job class implements `start()`, `stop()`, and `run()` methods with an `setInterval` timer.
- **Workers** (`src/workers/`): BullMQ queue consumers that run within the indexer process. Each worker class processes jobs from a specific BullMQ queue.

| Job | File | Schedule |
|-----|------|----------|
| `MaterializedViewRefreshJob` | `src/jobs/materialized-view-refresh-job.ts` | 15 min / 1 hour |
| `StalenessDetectionJob` | `src/jobs/staleness-detection-job.ts` | Daily |
| `ReconciliationJob` | `src/jobs/reconciliation-job.ts` | 6 hours (ES) / daily (Neo4j) |
| `KnowledgeGraphLinkingJob` | `src/jobs/knowledge-graph-linking-job.ts` | On-demand |
| `OntologySyncJob` | `src/jobs/ontology-sync-job.ts` | Hourly |
| `ImportSchedulerJob` | `src/jobs/import-scheduler-job.ts` | On-demand |

| Worker | File | Queue |
|--------|------|-------|
| `EnrichmentWorker` | `src/workers/enrichment-worker.ts` | `layers:enrichment` |
| `FreshnessWorker` | `src/workers/freshness-worker.ts` | `layers:maintenance` |
| `IndexRetryWorker` | `src/workers/index-retry-worker.ts` | DLQ replay |

```typescript
// src/jobs/staleness-detection-job.ts — interval-based job pattern
class StalenessDetectionJob {
  private timer: NodeJS.Timeout | null = null

  async start(): Promise<void> {
    this.timer = setInterval(() => {
      this.run().catch(err => this.logger.error('Staleness detection failed', err))
    }, this.intervalMs)
  }

  async stop(): Promise<void> {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
  }

  protected async run(): Promise<void> { /* compare indexed_at vs firehose cursor */ }
}
```

## Job Queue Architecture

All queue-based background work runs through [BullMQ](https://docs.bullmq.io/) queues backed by Redis. Each queue has its own worker pool with configurable concurrency.

### Queue Topology

| Queue | Purpose | Default Concurrency |
|---|---|---|
| `layers:expression` | Index expression records | 10 |
| `layers:segmentation` | Index segmentation records | 10 |
| `layers:annotation` | Index annotation layers and cluster sets | 10 |
| `layers:ontology` | Index ontologies and type definitions | 5 |
| `layers:corpus` | Index corpora and memberships | 5 |
| `layers:resource` | Index resource entries, collections, templates, fillings | 5 |
| `layers:judgment` | Index experiments, judgment sets, agreement reports | 5 |
| `layers:alignment` | Index alignments | 5 |
| `layers:graph` | Index graph nodes, edges, edge sets | 10 |
| `layers:integration` | Index personas, media, eprints, data links, changelogs | 5 |
| `layers:enrichment` | Post-indexing enrichment tasks | 3 |
| `layers:import` | Format import jobs (CoNLL, BRAT, ELAN, TEI) | 2 |
| `layers:maintenance` | Scheduled maintenance and reconciliation | 1 |

### Worker Pool Management

Each queue spawns a BullMQ `Worker` instance with the configured concurrency. Workers are started as separate processes (via the indexer entry point) to isolate them from the API server. This allows independent scaling: API pods and worker pods can have different replica counts.

```typescript
const expressionWorker = new Worker(
  'layers:expression',
  expressionProcessor,
  {
    connection: redisConnection,
    concurrency: config.workers.expression.concurrency,
    limiter: { max: 100, duration: 1000 }, // 100 jobs/sec rate limit
  }
);
```

## Firehose Ingestion Jobs

These are the primary jobs created by the [firehose ingestion pipeline](./firehose-ingestion). Each filtered and validated record is dispatched as a job to its namespace queue. The job payload includes the DID, rkey, record data, and firehose cursor position.

## Enrichment Jobs

Enrichment jobs run after initial indexing to compute derived data that requires additional processing.

### Language Detection

For expressions where `language` is not set by the record author, a language detection job runs ICU-based language identification on the `text` field and writes the result back to the PG row and ES document.

### Knowledge Graph Linking

When an annotation layer contains `knowledgeRefs` pointing to external knowledge bases (Wikidata, WordNet, FrameNet), an enrichment job resolves the external identifiers and creates or updates Neo4j nodes for the KB entities. This ensures the knowledge graph stays connected even when external references arrive before their target KB nodes are indexed.

### Media Metadata Extraction

For `media` records referencing audio, video, or image blobs, an enrichment job extracts technical metadata (duration, sample rate, resolution, codec) from the blob if not already present in the record. This uses the media file's ATProto blob reference to fetch content from the user's PDS.

### Annotation Statistics

After a batch of annotation layers is indexed, a statistics job computes per-expression annotation coverage (how many layers, which kinds/subkinds) and per-corpus aggregate statistics. These are written to the `corpus_statistics` and `annotation_coverage` materialized views.

## Format Import Jobs

The format import pipeline converts standard annotation formats into Layers records. Each import job is triggered by an API request (e.g., "import this CoNLL-U file into corpus X") and runs inside the [plugin sandbox](./plugin-system).

### Import Pipeline

```mermaid
flowchart LR
    UP["Upload File"] --> PARSE["Parse Format"]
    PARSE --> MAP["Map to Layers Records"]
    MAP --> VALIDATE["Validate Records"]
    VALIDATE --> WRITE["Write to User PDS"]
    WRITE --> INDEX["Firehose → Indexing"]
```

1. **Parse**: The importer plugin reads the source file and extracts its native data structures.
2. **Map**: The plugin converts native structures to Layers record types following the mappings documented in [Data Models Integration](../integration/data-models/).
3. **Validate**: Generated records are validated against Layers lexicon schemas.
4. **Write**: Records are written to the user's PDS via the ATProto `com.atproto.repo.createRecord` XRPC call. This requires the user's OAuth session.
5. **Index**: The firehose picks up the new PDS records and indexes them through the normal pipeline.

### Supported Formats

| Format | Importer | Records Produced |
|---|---|---|
| CoNLL-U | `conll-importer` | expression + segmentation + annotationLayer (POS, lemma, deps) |
| CoNLL-2003 | `conll-importer` | expression + segmentation + annotationLayer (NER) |
| BRAT (.ann) | `brat-importer` | expression + segmentation + annotationLayer (entities, relations, events) |
| ELAN (.eaf) | `elan-importer` | expression + media + segmentation + annotationLayer (per tier) |
| Praat (.TextGrid) | `praat-importer` | expression + media + segmentation + annotationLayer (intervals, points) |
| TEI XML | `tei-importer` | expression + corpus + annotationLayer (inline annotations) |

Each importer is documented in the corresponding [data model integration page](../integration/data-models/).

## Maintenance Jobs

### Materialized View Refresh

Refreshes PostgreSQL materialized views (`corpus_statistics`, `annotation_coverage`, `label_distribution`, `knowledge_graph_density`) on a configurable schedule.

| View | Default Schedule |
|---|---|
| `corpus_statistics` | Every 15 minutes |
| `annotation_coverage` | Every 15 minutes |
| `label_distribution` | Every hour |
| `knowledge_graph_density` | Every hour |

### Elasticsearch Reconciliation

A sampling-based reconciliation job compares a random subset of PG records against their ES counterparts. Any mismatches (missing documents, stale data) trigger re-indexing for the affected records.

Default schedule: every 6 hours, sampling 1% of records per type.

### Neo4j Reconciliation

Similar to ES reconciliation, but checks Neo4j node counts and edge integrity against PG. Missing nodes or edges are re-created from PG data.

Default schedule: daily.

### Stale Record Detection

Compares `indexed_at` timestamps against the firehose cursor position to detect records that may have been updated upstream but not re-indexed. Stale records are re-fetched from the user's PDS and re-indexed.

Default schedule: daily.

## Dead Letter Queue Management

Records that fail processing after exhausting retries (see [Firehose Ingestion](./firehose-ingestion)) land in the DLQ. The DLQ is a PostgreSQL table (`firehose_dlq`) with structured error metadata.

### DLQ Admin API

| Endpoint | Action |
|---|---|
| `GET /admin/dlq` | List DLQ entries with filtering by collection, error stage, time range |
| `POST /admin/dlq/:id/replay` | Re-queue a specific DLQ entry for reprocessing |
| `POST /admin/dlq/replay-all` | Re-queue all DLQ entries matching a filter |
| `DELETE /admin/dlq/:id` | Discard a DLQ entry |

### Monitoring

The `layers_dlq_entries_total` Prometheus gauge tracks the current DLQ size. An alert fires when the DLQ exceeds 100 entries (configurable), prompting investigation.

## See Also

- [Firehose Ingestion](./firehose-ingestion) for how records enter the job queues
- [Plugin System](./plugin-system) for format importer sandboxing
- [Indexing Strategy](./indexing-strategy) for per-record-type processing details
- [Observability](./observability) for queue metrics and dashboard panels
