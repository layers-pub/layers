/**
 * Pre-instantiated Prometheus metrics for the Layers appview.
 *
 * Covers HTTP request tracking, database operations, cache performance,
 * firehose ingestion, record indexing, and domain-specific counters
 * for annotations, cross-references, corpora, and personas.
 *
 * @module
 */

import { createCounter, createGauge, createHistogram } from './prometheus-registry.js';

const LayersMetrics = {
  httpRequestDuration: createHistogram({
    name: 'layers_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
  }),

  httpRequestsTotal: createCounter({
    name: 'layers_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
  }),

  dbQueryDuration: createHistogram({
    name: 'layers_db_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['database', 'operation'],
  }),

  dbConnectionsActive: createGauge({
    name: 'layers_db_connections_active',
    help: 'Active database connections',
    labelNames: ['database'],
  }),

  cacheHitsTotal: createCounter({
    name: 'layers_cache_hits_total',
    help: 'Total cache hits',
    labelNames: ['cache'],
  }),

  cacheMissesTotal: createCounter({
    name: 'layers_cache_misses_total',
    help: 'Total cache misses',
    labelNames: ['cache'],
  }),

  firehoseCursorLag: createGauge({
    name: 'layers_firehose_cursor_lag_seconds',
    help: 'Firehose cursor lag in seconds',
  }),

  firehoseEventsProcessed: createCounter({
    name: 'layers_firehose_events_processed_total',
    help: 'Total firehose events processed',
    labelNames: ['collection'],
  }),

  firehoseQueueDepth: createGauge({
    name: 'layers_firehose_queue_depth',
    help: 'Current firehose queue depth',
    labelNames: ['queue'],
  }),

  firehoseDlqEntries: createGauge({
    name: 'layers_firehose_dlq_entries',
    help: 'Current dead letter queue entries',
  }),

  recordsIndexedTotal: createCounter({
    name: 'layers_records_indexed_total',
    help: 'Total records indexed',
    labelNames: ['type'],
  }),

  annotationLayersPerExpression: createHistogram({
    name: 'layers_annotation_layers_per_expression',
    help: 'Number of annotation layers per expression',
  }),

  crossReferencesTotal: createCounter({
    name: 'layers_cross_references_total',
    help: 'Total cross-references extracted',
    labelNames: ['ref_type'],
  }),

  knowledgeRefsTotal: createCounter({
    name: 'layers_knowledge_refs_total',
    help: 'Total knowledge graph references',
    labelNames: ['source'],
  }),

  corporaTotal: createGauge({
    name: 'layers_corpora_total',
    help: 'Total corpora indexed',
  }),

  activePersonasTotal: createGauge({
    name: 'layers_active_personas_total',
    help: 'Total active personas',
  }),
} as const;

export { LayersMetrics };
