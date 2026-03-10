/**
 * Unit tests for the StalenessDetectionJob.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StalenessDetectionJob, STALENESS_TABLES } from '@/jobs/staleness-detection-job.js';
import { createMockLogger } from '@tests/helpers/record-type-test-helpers.js';

/**
 * Creates a mock PG pool whose query method returns a configurable stale count.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockPgPool(staleCount: number) {
  return {
    query: vi.fn().mockResolvedValue({
      rows: [{ stale_count: String(staleCount) }],
    }),
  };
}

describe('StalenessDetectionJob', () => {
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    logger = createMockLogger();
  });

  it('logs warnings when stale records are found', async () => {
    const pgPool = createMockPgPool(10);

    const job = new StalenessDetectionJob({
      name: 'staleness-detection',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      logger,
    });

    await job.run();

    expect(logger.warn).toHaveBeenCalledWith('Stale records detected', {
      table: 'expressions',
      staleCount: 10,
    });

    expect(logger.info).toHaveBeenCalledWith('Staleness detection complete', {
      totalStale: 10 * STALENESS_TABLES.length,
    });
  });

  it('logs no warnings when all records are fresh', async () => {
    const pgPool = createMockPgPool(0);

    const job = new StalenessDetectionJob({
      name: 'staleness-detection',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      logger,
    });

    await job.run();

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Staleness detection complete', {
      totalStale: 0,
    });
  });

  it('handles query errors gracefully', async () => {
    const pgPool = {
      query: vi.fn().mockRejectedValue(new Error('relation does not exist')),
    };

    const job = new StalenessDetectionJob({
      name: 'staleness-detection',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      logger,
    });

    await job.run();

    expect(logger.error).toHaveBeenCalledWith(
      'Staleness check failed',
      expect.objectContaining({
        table: 'expressions',
        error: 'relation does not exist',
      }),
    );

    // Job still completes
    expect(logger.info).toHaveBeenCalledWith('Staleness detection complete', {
      totalStale: 0,
    });
  });

  it('uses custom threshold when provided', async () => {
    const pgPool = createMockPgPool(0);

    const job = new StalenessDetectionJob({
      name: 'staleness-detection',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      staleThresholdHours: 48,
      logger,
    });

    await job.run();

    expect(logger.info).toHaveBeenCalledWith('Starting staleness detection', {
      thresholdHours: 48,
    });

    // Verify the parameterized query passes the threshold value
    expect(pgPool.query).toHaveBeenCalledWith(expect.stringContaining('indexed_at'), [48]);
  });

  it('uses default 24-hour threshold when none provided', async () => {
    const pgPool = createMockPgPool(0);

    const job = new StalenessDetectionJob({
      name: 'staleness-detection',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      logger,
    });

    await job.run();

    expect(logger.info).toHaveBeenCalledWith('Starting staleness detection', {
      thresholdHours: 24,
    });

    expect(pgPool.query).toHaveBeenCalledWith(expect.stringContaining('indexed_at'), [24]);
  });
});
