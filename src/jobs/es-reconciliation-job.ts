/**
 * Reconciles record counts between PostgreSQL and Elasticsearch.
 *
 * Compares PG row counts against ES document counts for each
 * table/index pair and logs mismatches so operators can investigate
 * drift between the two backends.
 *
 * @module
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { Pool } from 'pg';

import { BaseJob, type BaseJobConfig } from './base-job.js';

/**
 * A table/index pair to reconcile between PG and ES.
 */
interface ReconcilePair {
  readonly table: string;
  readonly esIndex: string;
}

/** Table/index pairs to reconcile. */
const RECONCILE_PAIRS: readonly ReconcilePair[] = [
  { table: 'expressions', esIndex: 'expressions' },
  { table: 'ontologies', esIndex: 'ontologies' },
  { table: 'corpora', esIndex: 'corpora' },
  { table: 'personas', esIndex: 'personas' },
  { table: 'media_records', esIndex: 'media_records' },
  { table: 'eprints', esIndex: 'eprints' },
  { table: 'segmentations', esIndex: 'segmentations' },
  { table: 'type_defs', esIndex: 'type_defs' },
  { table: 'corpus_memberships', esIndex: 'corpus_memberships' },
  { table: 'resource_collections', esIndex: 'resource_collections' },
  { table: 'resource_entries', esIndex: 'resource_entries' },
  { table: 'graph_nodes', esIndex: 'graph_nodes' },
  { table: 'changelogs', esIndex: 'changelogs' },
  { table: 'annotation_layers', esIndex: 'annotation_layers' },
  { table: 'cluster_sets', esIndex: 'cluster_sets' },
  { table: 'collection_memberships', esIndex: 'collection_memberships' },
  { table: 'templates', esIndex: 'templates' },
  { table: 'graph_edges', esIndex: 'graph_edges' },
  { table: 'graph_edge_sets', esIndex: 'graph_edge_sets' },
  { table: 'data_links', esIndex: 'data_links' },
  { table: 'alignments', esIndex: 'alignments' },
  { table: 'experiment_defs', esIndex: 'experiment_defs' },
  { table: 'fillings', esIndex: 'fillings' },
  { table: 'template_compositions', esIndex: 'template_compositions' },
  { table: 'judgment_sets', esIndex: 'judgment_sets' },
  { table: 'agreement_reports', esIndex: 'agreement_reports' },
];

/**
 * Configuration for constructing an {@link EsReconciliationJob}.
 */
interface EsReconciliationJobConfig extends BaseJobConfig {
  readonly pgPool: Pool;
  readonly esClient: EsClient;
}

/**
 * Compares PG record counts against ES document counts for each table/index pair.
 *
 * Runs on a scheduled interval. When counts diverge, it logs a warning with
 * the table name, index name, and drift magnitude so operators can trigger
 * a targeted re-index.
 *
 * @example
 * ```typescript
 * const job = new EsReconciliationJob({
 *   name: 'es-reconciliation',
 *   intervalMs: 300_000,
 *   pgPool,
 *   esClient,
 * });
 * job.start();
 * ```
 */
class EsReconciliationJob extends BaseJob {
  private readonly pgPool: Pool;
  private readonly esClient: EsClient;

  constructor(config: EsReconciliationJobConfig) {
    super(config);
    this.pgPool = config.pgPool;
    this.esClient = config.esClient;
  }

  async run(): Promise<void> {
    this.logger.info('Starting ES reconciliation');
    let mismatches = 0;

    for (const { table, esIndex } of RECONCILE_PAIRS) {
      try {
        const pgResult = await this.pgPool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM ${table}`,
        );
        const pgCount = Number(pgResult.rows[0]?.count ?? 0);

        const esResult = await this.esClient.count({ index: esIndex });
        const esCount = esResult.count;

        if (pgCount !== esCount) {
          mismatches++;
          this.logger.warn('ES count mismatch', {
            table,
            esIndex,
            pgCount,
            esCount,
            drift: pgCount - esCount,
          });
        }
      } catch (err: unknown) {
        this.logger.error('Reconciliation check failed', {
          table,
          esIndex,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.logger.info('ES reconciliation complete', {
      mismatches,
      pairs: RECONCILE_PAIRS.length,
    });
  }
}

export { EsReconciliationJob, RECONCILE_PAIRS };
export type { EsReconciliationJobConfig, ReconcilePair };
