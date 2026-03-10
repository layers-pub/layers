/**
 * PostgreSQL connection pool factory and lifecycle utilities.
 *
 * @module
 */

import type { Pool, PoolConfig } from 'pg';
import pg from 'pg';

import { createLogger } from '../../observability/logger.js';

/**
 * Configuration for a PostgreSQL connection pool.
 */
interface DatabaseConfig {
  readonly connectionString: string;
  readonly min: number;
  readonly max: number;
  readonly idleTimeoutMillis?: number;
  readonly connectionTimeoutMillis?: number;
  readonly statementTimeout?: number;
}

/**
 * Snapshot of current pool utilization.
 */
interface PoolStats {
  readonly totalCount: number;
  readonly idleCount: number;
  readonly waitingCount: number;
}

/**
 * Creates a PostgreSQL connection pool with event logging.
 *
 * @param config - pool sizing and timeout configuration
 * @returns a configured pg.Pool instance
 *
 * @example
 * ```typescript
 * const pool = createPool({
 *   connectionString: "postgresql://localhost:5432/layers",
 *   min: 2,
 *   max: 20,
 * });
 * ```
 */
function createPool(config: DatabaseConfig): Pool {
  const logger = createLogger({ service: 'postgresql' });

  const poolConfig: PoolConfig = {
    connectionString: config.connectionString,
    min: config.min,
    max: config.max,
    idleTimeoutMillis: config.idleTimeoutMillis ?? 30_000,
    connectionTimeoutMillis: config.connectionTimeoutMillis ?? 5_000,
    statement_timeout: config.statementTimeout ?? 30_000,
  };

  const pool = new pg.Pool(poolConfig);

  pool.on('connect', () => {
    logger.debug('New client connected to PostgreSQL');
  });

  pool.on('error', (err: Error) => {
    logger.error('Unexpected PostgreSQL pool error', { error: err.message });
  });

  pool.on('remove', () => {
    logger.debug('Client removed from PostgreSQL pool');
  });

  return pool;
}

/**
 * Gracefully shuts down a PostgreSQL connection pool.
 *
 * @param pool - the pool to close
 */
async function closePool(pool: Pool): Promise<void> {
  await pool.end();
}

/**
 * Returns current connection counts for the pool.
 *
 * @param pool - the pool to inspect
 * @returns a snapshot of total, idle, and waiting connection counts
 */
function getPoolStats(pool: Pool): PoolStats {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

export { closePool, createPool, getPoolStats };
export type { DatabaseConfig, PoolStats };
