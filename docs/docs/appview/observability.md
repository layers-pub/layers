---
sidebar_label: Observability
sidebar_position: 10
---

# Observability and Monitoring

## Logging

### Pino Configuration

The appview uses [Pino](https://getpino.io/) for structured JSON logging. Every log entry includes a request ID, timestamp, and OpenTelemetry trace/span IDs for correlation.

```typescript
const logger = pino({
  level: config.logLevel, // default: 'info'
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: ['req.headers.authorization', 'req.headers.cookie', 'password'],
  mixin() {
    const span = trace.getActiveSpan();
    if (span) {
      const ctx = span.spanContext();
      return { traceId: ctx.traceId, spanId: ctx.spanId };
    }
    return {};
  },
});
```

### Log Levels

| Level | Usage |
|---|---|
| `error` | Unrecoverable failures (database connection lost, DLQ entry created) |
| `warn` | Recoverable issues (validation failure, retry triggered, cache miss on expected key) |
| `info` | Operational events (server started, firehose connected, job completed) |
| `debug` | Detailed tracing (record processing steps, query plans, cache operations) |
| `trace` | Per-record field-level detail (only in development) |

### Request Context

Every HTTP request gets a unique `requestId` (UUID v4) injected by the request context middleware. This ID appears in all log entries, error responses, and distributed traces for the request's lifetime. Child loggers inherit the request context automatically.

## Distributed Tracing

### OpenTelemetry Setup

The appview instruments all I/O boundaries with [OpenTelemetry](https://opentelemetry.io/):

| Instrumentation | Library | Traces |
|---|---|---|
| HTTP server | `@opentelemetry/instrumentation-http` | Incoming request spans |
| PostgreSQL | `@opentelemetry/instrumentation-pg` | Query spans with SQL text |
| Redis | `@opentelemetry/instrumentation-redis` | Command spans |
| Elasticsearch | Custom instrumentation | Search/index spans |
| Neo4j | Custom instrumentation | Cypher query spans |
| BullMQ | Custom instrumentation | Job processing spans |

Traces are exported via OTLP HTTP to a collector (Jaeger in development, Grafana Tempo in production).

### Span Hierarchy

A typical annotation search request produces the following span tree:

```
HTTP GET /api/v1/annotations?kind=span&subkind=ner
├── redis.get (cache check)
├── elasticsearch.search (faceted query)
│   └── elasticsearch.msearch (nested aggregation)
├── postgresql.query (cross-reference lookup)
└── redis.set (cache result)
```

### Sampling Strategy

| Environment | Sampling Rate | Rationale |
|---|---|---|
| Development | 100% | Full visibility during debugging |
| Staging | 50% | High visibility with moderate overhead |
| Production | 10% | Sufficient for debugging, minimal overhead |

Error traces are always captured regardless of sampling rate (tail-based sampling).

## Metrics

### Prometheus Exposition

The appview exposes Prometheus metrics at `GET /metrics` using `prom-client`.

### Application Metrics

| Metric | Type | Labels | Description |
|---|---|---|---|
| `layers_http_request_duration_seconds` | Histogram | `method`, `route`, `status` | Request latency distribution |
| `layers_http_requests_total` | Counter | `method`, `route`, `status` | Total request count |
| `layers_db_query_duration_seconds` | Histogram | `database`, `operation` | Database query latency |
| `layers_db_connections_active` | Gauge | `database` | Active connection count per pool |
| `layers_cache_hits_total` | Counter | `cache` | Redis cache hits |
| `layers_cache_misses_total` | Counter | `cache` | Redis cache misses |

### Firehose Metrics

| Metric | Type | Labels | Description |
|---|---|---|---|
| `layers_firehose_cursor_lag_seconds` | Gauge | | Time behind the relay |
| `layers_firehose_events_processed_total` | Counter | `collection` | Events indexed per collection |
| `layers_firehose_queue_depth` | Gauge | `queue` | Pending jobs per queue |
| `layers_firehose_dlq_entries` | Gauge | | Current DLQ size |

### Business Metrics

These metrics are specific to Layers' annotation platform and have no equivalent in Chive:

| Metric | Type | Labels | Description |
|---|---|---|---|
| `layers_records_indexed_total` | Counter | `type` | Total records indexed per record type |
| `layers_annotation_layers_per_expression` | Histogram | | Distribution of annotation layers per expression |
| `layers_cross_references_total` | Counter | `ref_type` | Cross-references indexed per type |
| `layers_knowledge_refs_total` | Counter | `source` | Knowledge base references per source (Wikidata, WordNet, etc.) |
| `layers_corpora_total` | Gauge | | Number of indexed corpora |
| `layers_active_personas_total` | Gauge | | Number of distinct annotator personas |

## Dashboards

### Grafana Dashboard Suite

The appview ships with provisioned Grafana dashboards (JSON models stored in the repository).

#### System Overview Dashboard

- Request rate and latency (p50, p95, p99)
- Error rate by endpoint
- Database connection pool utilization (PG, ES, Neo4j, Redis)
- Memory and CPU usage

#### Firehose Ingestion Dashboard

- Cursor lag (real-time gauge)
- Events per second (stacked by collection)
- Queue depth per queue
- DLQ inflow rate
- Validation failure rate by stage

#### Database Performance Dashboard

- PostgreSQL query latency by operation (SELECT, INSERT, UPDATE, DELETE)
- Elasticsearch search latency and indexing throughput
- Neo4j query latency and active transactions
- Redis command latency and memory usage

#### Business Metrics Dashboard

- Records indexed over time (stacked by type)
- Annotation density (layers per expression, histogram)
- Cross-reference density (refs per record, histogram)
- Knowledge grounding coverage (percentage of annotations with knowledgeRefs)
- Corpus growth over time

## Alerting

### Alert Rules

| Alert | Condition | Severity | Action |
|---|---|---|---|
| Firehose lag high | `cursor_lag_seconds > 60` for 5 min | Warning | Check queue depth and worker health |
| Firehose lag critical | `cursor_lag_seconds > 300` for 5 min | Critical | Immediate investigation |
| DLQ growing | `dlq_entries > 100` | Warning | Review DLQ entries for systematic failures |
| Error rate spike | `5xx rate > 1%` for 5 min | Warning | Check logs and traces |
| Database connection exhaustion | `connections_active > 80%` of pool | Warning | Scale pool or investigate slow queries |
| Disk usage high | `disk_usage > 80%` | Warning | Plan storage expansion |

### Escalation

Alerts are routed through Grafana Alerting to the on-call channel (Slack, PagerDuty, or email, configurable per environment).

## Health Checks

### Liveness Probe

`GET /health` returns `200 OK` if the process is running. Does not check downstream dependencies.

### Readiness Probe

`GET /ready` returns `200 OK` only if all four databases are reachable and the firehose consumer is connected. Returns `503 Service Unavailable` otherwise, with a JSON body listing which dependencies are unhealthy.

```json
{
  "status": "unhealthy",
  "dependencies": {
    "postgresql": "ok",
    "elasticsearch": "ok",
    "neo4j": "timeout",
    "redis": "ok",
    "firehose": "ok"
  }
}
```

## See Also

- [Technology Stack](./technology-stack) for Pino, OpenTelemetry, and Prometheus library versions
- [Deployment](./deployment) for Kubernetes probe configuration and Grafana provisioning
- [Firehose Ingestion](./firehose-ingestion) for firehose-specific metrics and alert thresholds
