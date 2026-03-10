/**
 * Unit tests for ES and Neo4j reconciliation jobs.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EsReconciliationJob, RECONCILE_PAIRS } from '@/jobs/es-reconciliation-job.js';
import { Neo4jReconciliationJob, NEO4J_RECONCILE_PAIRS } from '@/jobs/neo4j-reconciliation-job.js';
import { createMockLogger } from '@tests/helpers/record-type-test-helpers.js';

/**
 * Creates a mock PG pool whose query method returns a configurable count.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockPgPool(count: number) {
  return {
    query: vi.fn().mockResolvedValue({
      rows: [{ count: String(count) }],
    }),
  };
}

/**
 * Creates a mock ES client whose count method returns a configurable count.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockEsClient(count: number) {
  return {
    count: vi.fn().mockResolvedValue({ count }),
  };
}

/**
 * Creates a mock Neo4j driver whose session returns a configurable count.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockNeo4jDriver(count: number) {
  const session = {
    run: vi.fn().mockResolvedValue({
      records: [
        {
          get: vi.fn().mockReturnValue({ toNumber: () => count }),
        },
      ],
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };

  return {
    session: vi.fn().mockReturnValue(session),
    _session: session,
  };
}

describe('EsReconciliationJob', () => {
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    logger = createMockLogger();
  });

  it('logs no mismatches when PG and ES counts match', async () => {
    const pgPool = createMockPgPool(100);
    const esClient = createMockEsClient(100);

    const job = new EsReconciliationJob({
      name: 'es-reconciliation',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      esClient: esClient as never,
      logger,
    });

    await job.run();

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('ES reconciliation complete', {
      mismatches: 0,
      pairs: RECONCILE_PAIRS.length,
    });
  });

  it('logs mismatches when PG and ES counts differ', async () => {
    const pgPool = createMockPgPool(100);
    const esClient = createMockEsClient(95);

    const job = new EsReconciliationJob({
      name: 'es-reconciliation',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      esClient: esClient as never,
      logger,
    });

    await job.run();

    expect(logger.warn).toHaveBeenCalledWith('ES count mismatch', {
      table: 'expressions',
      esIndex: 'expressions',
      pgCount: 100,
      esCount: 95,
      drift: 5,
    });

    expect(logger.info).toHaveBeenCalledWith('ES reconciliation complete', {
      mismatches: RECONCILE_PAIRS.length,
      pairs: RECONCILE_PAIRS.length,
    });
  });

  it('handles PG query errors gracefully', async () => {
    const pgPool = {
      query: vi.fn().mockRejectedValue(new Error('connection refused')),
    };
    const esClient = createMockEsClient(100);

    const job = new EsReconciliationJob({
      name: 'es-reconciliation',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      esClient: esClient as never,
      logger,
    });

    await job.run();

    expect(logger.error).toHaveBeenCalledWith(
      'Reconciliation check failed',
      expect.objectContaining({
        table: 'expressions',
        error: 'connection refused',
      }),
    );

    // Job completes despite errors
    expect(logger.info).toHaveBeenCalledWith(
      'ES reconciliation complete',
      expect.objectContaining({ mismatches: 0 }),
    );
  });

  it('handles ES count errors gracefully', async () => {
    const pgPool = createMockPgPool(100);
    const esClient = {
      count: vi.fn().mockRejectedValue(new Error('index_not_found_exception')),
    };

    const job = new EsReconciliationJob({
      name: 'es-reconciliation',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      esClient: esClient as never,
      logger,
    });

    await job.run();

    expect(logger.error).toHaveBeenCalledWith(
      'Reconciliation check failed',
      expect.objectContaining({
        error: 'index_not_found_exception',
      }),
    );
  });
});

describe('Neo4jReconciliationJob', () => {
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    logger = createMockLogger();
  });

  it('logs no mismatches when PG and Neo4j counts match', async () => {
    const pgPool = createMockPgPool(50);
    const driver = createMockNeo4jDriver(50);

    const job = new Neo4jReconciliationJob({
      name: 'neo4j-reconciliation',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      neo4jDriver: driver as never,
      logger,
    });

    await job.run();

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Neo4j reconciliation complete', {
      mismatches: 0,
      pairs: NEO4J_RECONCILE_PAIRS.length,
    });
  });

  it('logs mismatches when PG and Neo4j counts differ', async () => {
    const pgPool = createMockPgPool(50);
    const driver = createMockNeo4jDriver(45);

    const job = new Neo4jReconciliationJob({
      name: 'neo4j-reconciliation',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      neo4jDriver: driver as never,
      logger,
    });

    await job.run();

    expect(logger.warn).toHaveBeenCalledWith('Neo4j count mismatch', {
      table: 'expressions',
      label: 'Expression',
      pgCount: 50,
      neo4jCount: 45,
      drift: 5,
    });
  });

  it('closes Neo4j sessions even when queries fail', async () => {
    const pgPool = createMockPgPool(50);
    const session = {
      run: vi.fn().mockRejectedValue(new Error('session expired')),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const driver = {
      session: vi.fn().mockReturnValue(session),
    };

    const job = new Neo4jReconciliationJob({
      name: 'neo4j-reconciliation',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      neo4jDriver: driver as never,
      logger,
    });

    await job.run();

    expect(session.close).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      'Neo4j reconciliation check failed',
      expect.objectContaining({
        error: 'session expired',
      }),
    );
  });

  it('handles PG query errors gracefully', async () => {
    const pgPool = {
      query: vi.fn().mockRejectedValue(new Error('connection refused')),
    };
    const driver = createMockNeo4jDriver(50);

    const job = new Neo4jReconciliationJob({
      name: 'neo4j-reconciliation',
      intervalMs: 60_000,
      pgPool: pgPool as never,
      neo4jDriver: driver as never,
      logger,
    });

    await job.run();

    expect(logger.error).toHaveBeenCalledWith(
      'Neo4j reconciliation check failed',
      expect.objectContaining({
        table: 'expressions',
        error: 'connection refused',
      }),
    );

    expect(logger.info).toHaveBeenCalledWith(
      'Neo4j reconciliation complete',
      expect.objectContaining({ mismatches: 0 }),
    );
  });
});
