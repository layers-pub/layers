/**
 * Refreshes PostgreSQL materialized views on a schedule.
 *
 * Uses REFRESH MATERIALIZED VIEW CONCURRENTLY so that reads are not
 * blocked during the refresh. Views that do not yet exist (migrations
 * not applied) are silently skipped.
 *
 * @module
 */

import type { Pool } from 'pg';

import { BaseJob, type BaseJobConfig } from './base-job.js';

/** Materialized views to refresh. */
const MATERIALIZED_VIEWS = [
  'corpus_statistics',
  'annotation_coverage',
  'label_distribution',
  'knowledge_graph_density',
] as const;

/**
 * Configuration for constructing a {@link MaterializedViewRefreshJob}.
 */
interface MaterializedViewRefreshJobConfig extends BaseJobConfig {
  readonly pgPool: Pool;
}

/**
 * Refreshes all registered materialized views concurrently.
 *
 * If a view does not exist (e.g., before migrations are applied), the
 * error is logged at debug level and the job moves on to the next view.
 * All other errors are logged at error level.
 *
 * @example
 * ```typescript
 * const job = new MaterializedViewRefreshJob({
 *   name: 'materialized-view-refresh',
 *   intervalMs: 900_000,
 *   pgPool,
 * });
 * job.start();
 * ```
 */
class MaterializedViewRefreshJob extends BaseJob {
  private readonly pgPool: Pool;

  constructor(config: MaterializedViewRefreshJobConfig) {
    super(config);
    this.pgPool = config.pgPool;
  }

  async run(): Promise<void> {
    this.logger.info('Starting materialized view refresh');

    for (const view of MATERIALIZED_VIEWS) {
      try {
        await this.pgPool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
        this.logger.debug('View refreshed', { view });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('does not exist')) {
          this.logger.debug('View does not exist, skipping', { view });
        } else {
          this.logger.error('View refresh failed', { view, error: message });
        }
      }
    }

    this.logger.info('Materialized view refresh complete');
  }
}

export { MaterializedViewRefreshJob, MATERIALIZED_VIEWS };
export type { MaterializedViewRefreshJobConfig };
