/**
 * Unit tests for the MaterializedViewRefreshJob.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MaterializedViewRefreshJob,
  MATERIALIZED_VIEWS,
} from '@/jobs/materialized-view-refresh-job.js';
import { createMockLogger } from '@tests/helpers/record-type-test-helpers.js';

describe('MaterializedViewRefreshJob', () => {
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    logger = createMockLogger();
  });

  it('refreshes all views successfully', async () => {
    const pgPool = {
      query: vi.fn().mockResolvedValue(undefined),
    };

    const job = new MaterializedViewRefreshJob({
      name: 'materialized-view-refresh',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      logger,
    });

    await job.run();

    expect(pgPool.query).toHaveBeenCalledTimes(MATERIALIZED_VIEWS.length);
    for (const view of MATERIALIZED_VIEWS) {
      expect(pgPool.query).toHaveBeenCalledWith(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
    }

    expect(logger.debug).toHaveBeenCalledWith('View refreshed', {
      view: 'corpus_statistics',
    });
    expect(logger.info).toHaveBeenCalledWith('Materialized view refresh complete');
  });

  it('handles "does not exist" errors with debug logging', async () => {
    const pgPool = {
      query: vi.fn().mockRejectedValue(new Error('relation "corpus_statistics" does not exist')),
    };

    const job = new MaterializedViewRefreshJob({
      name: 'materialized-view-refresh',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      logger,
    });

    await job.run();

    expect(logger.debug).toHaveBeenCalledWith('View does not exist, skipping', {
      view: 'corpus_statistics',
    });
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Materialized view refresh complete');
  });

  it('handles other errors with error logging', async () => {
    const pgPool = {
      query: vi.fn().mockRejectedValue(new Error('permission denied')),
    };

    const job = new MaterializedViewRefreshJob({
      name: 'materialized-view-refresh',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      logger,
    });

    await job.run();

    expect(logger.error).toHaveBeenCalledWith('View refresh failed', {
      view: 'corpus_statistics',
      error: 'permission denied',
    });
  });

  it('continues refreshing remaining views after an error', async () => {
    const pgPool = {
      query: vi
        .fn()
        .mockRejectedValueOnce(new Error('permission denied'))
        .mockResolvedValue(undefined),
    };

    const job = new MaterializedViewRefreshJob({
      name: 'materialized-view-refresh',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      logger,
    });

    await job.run();

    // First view fails, remaining views succeed
    expect(pgPool.query).toHaveBeenCalledTimes(MATERIALIZED_VIEWS.length);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith('View refreshed', {
      view: 'annotation_coverage',
    });
  });
});
