/**
 * Detects records whose indexed_at timestamp indicates staleness.
 *
 * Scans each table for records that have not been re-indexed within
 * a configurable threshold and logs warnings so operators can trigger
 * targeted re-indexing from the firehose.
 *
 * @module
 */

import type { Pool } from 'pg';

import { BaseJob, type BaseJobConfig } from './base-job.js';

/** Tables to check for staleness. All must have an indexed_at column. */
const STALENESS_TABLES = [
  'expressions',
  'ontologies',
  'corpora',
  'personas',
  'media_records',
  'eprints',
  'segmentations',
  'type_defs',
  'corpus_memberships',
  'resource_collections',
  'resource_entries',
  'graph_nodes',
  'changelogs',
  'annotation_layers',
  'cluster_sets',
  'collection_memberships',
  'templates',
  'graph_edges',
  'graph_edge_sets',
  'data_links',
  'alignments',
  'experiment_defs',
  'fillings',
  'template_compositions',
  'judgment_sets',
  'agreement_reports',
] as const;

/**
 * Configuration for constructing a {@link StalenessDetectionJob}.
 */
interface StalenessDetectionJobConfig extends BaseJobConfig {
  readonly pgPool: Pool;
  /** Max age in hours before a record is considered stale. Default: 24. */
  readonly staleThresholdHours?: number | undefined;
}

/**
 * Scans PG tables for records whose indexed_at timestamp exceeds the
 * configured threshold.
 *
 * When stale records are found, a warning is logged per table with the
 * count of stale records. This job does not modify data; it only reports.
 *
 * @example
 * ```typescript
 * const job = new StalenessDetectionJob({
 *   name: 'staleness-detection',
 *   intervalMs: 600_000,
 *   pgPool,
 *   staleThresholdHours: 48,
 * });
 * job.start();
 * ```
 */
class StalenessDetectionJob extends BaseJob {
  private readonly pgPool: Pool;
  private readonly staleThresholdHours: number;

  constructor(config: StalenessDetectionJobConfig) {
    super(config);
    this.pgPool = config.pgPool;
    this.staleThresholdHours = config.staleThresholdHours ?? 24;
  }

  async run(): Promise<void> {
    this.logger.info('Starting staleness detection', {
      thresholdHours: this.staleThresholdHours,
    });
    let totalStale = 0;

    for (const table of STALENESS_TABLES) {
      try {
        const result = await this.pgPool.query<{ stale_count: string }>(
          `SELECT COUNT(*)::text AS stale_count FROM ${table} WHERE indexed_at < NOW() - $1 * INTERVAL '1 hour'`,
          [this.staleThresholdHours],
        );
        const staleCount = Number(result.rows[0]?.stale_count ?? 0);

        if (staleCount > 0) {
          totalStale += staleCount;
          this.logger.warn('Stale records detected', { table, staleCount });
        }
      } catch (err: unknown) {
        this.logger.error('Staleness check failed', {
          table,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.logger.info('Staleness detection complete', { totalStale });
  }
}

export { StalenessDetectionJob, STALENESS_TABLES };
export type { StalenessDetectionJobConfig };
