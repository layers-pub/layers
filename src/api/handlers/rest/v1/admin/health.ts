/**
 * System health admin endpoint with detailed database latency and pool stats.
 *
 * Returns process uptime, memory usage, indexer lag, and per-backend
 * health checks with latency measurements.
 *
 * @module
 */

import type { Client } from '@elastic/elasticsearch';
import type { Hono } from 'hono';
import type { Redis } from 'ioredis';
import type { Driver } from 'neo4j-driver';
import type { Pool } from 'pg';

/**
 * Dependencies required by the admin health endpoint.
 */
interface AdminHealthDependencies {
  readonly pgPool: Pool;
  readonly esClient: Client;
  readonly neo4jDriver: Driver;
  readonly redis: Redis;
}

/**
 * Health status for a single database backend.
 */
interface DatabaseHealth {
  readonly status: 'ok' | 'degraded' | 'down';
  readonly latencyMs: number;
}

/**
 * Response shape for GET /admin/v1/health.
 */
interface AdminHealthResponse {
  readonly apiUptime: number;
  readonly indexerLag: number;
  readonly pgPoolActive: number;
  readonly pgPoolIdle: number;
  readonly memoryUsageMb: number;
  readonly databases: {
    readonly postgresql: DatabaseHealth;
    readonly elasticsearch: DatabaseHealth;
    readonly neo4j: DatabaseHealth;
    readonly redis: DatabaseHealth;
  };
}

/**
 * Pings a database backend and returns health status with latency.
 *
 * A latency above 1000ms is classified as "degraded". Any error
 * results in "down" status with latency set to -1.
 *
 * @param pingFn - async function that performs the health check
 * @returns health status and latency in milliseconds
 */
async function checkBackend(pingFn: () => Promise<void>): Promise<DatabaseHealth> {
  const start = performance.now();
  try {
    await pingFn();
    const latencyMs = Math.round(performance.now() - start);
    const status = latencyMs > 1000 ? 'degraded' : 'ok';
    return { status, latencyMs };
  } catch {
    return { status: 'down', latencyMs: -1 };
  }
}

/**
 * Registers the admin health route on the given Hono app.
 *
 * @param app - the Hono application instance
 * @param deps - database clients for health checks
 */
function healthAdminRoutes(app: Hono, deps: AdminHealthDependencies): void {
  app.get('/admin/v1/health', async (c) => {
    const [postgresql, elasticsearch, neo4j, redis] = await Promise.all([
      checkBackend(async () => {
        await deps.pgPool.query('SELECT 1');
      }),
      checkBackend(async () => {
        await deps.esClient.ping();
      }),
      checkBackend(async () => {
        await deps.neo4jDriver.verifyConnectivity();
      }),
      checkBackend(async () => {
        await deps.redis.ping();
      }),
    ]);

    // Read the firehose cursor lag from Redis (stored by the indexer process)
    let indexerLag = -1;
    try {
      const lagValue = await deps.redis.get('layers:firehose:lag_seconds');
      if (lagValue !== null) {
        indexerLag = parseFloat(lagValue);
      }
    } catch {
      // Redis may be down; indexerLag stays at -1
    }

    const pool = deps.pgPool;
    const memUsage = process.memoryUsage();

    const response: AdminHealthResponse = {
      apiUptime: process.uptime(),
      indexerLag,
      pgPoolActive: pool.totalCount - pool.idleCount,
      pgPoolIdle: pool.idleCount,
      memoryUsageMb: Math.round(memUsage.rss / 1024 / 1024),
      databases: { postgresql, elasticsearch, neo4j, redis },
    };

    return c.json(response);
  });
}

export { healthAdminRoutes };
export type { AdminHealthDependencies, AdminHealthResponse, DatabaseHealth };
