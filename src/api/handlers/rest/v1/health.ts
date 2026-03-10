/**
 * Health, readiness, and metrics endpoints.
 *
 * - `GET /health` returns 200 unconditionally (liveness probe).
 * - `GET /ready` checks all four storage backends and returns 200 when
 *   all are healthy, or 503 with per-backend details otherwise.
 * - `GET /metrics` returns Prometheus-format metrics from the shared registry.
 *
 * @module
 */

import type { Client } from '@elastic/elasticsearch';
import type { Hono } from 'hono';
import type { Redis } from 'ioredis';
import type { Driver } from 'neo4j-driver';
import type { Pool } from 'pg';

import { prometheusRegistry } from '../../../../observability/prometheus-registry.js';

/**
 * External dependencies required by the health and readiness probes.
 */
interface HealthDependencies {
  readonly pgPool: Pool;
  readonly esClient: Client;
  readonly neo4jDriver: Driver;
  readonly redis: Redis;
}

/**
 * Registers health, readiness, and metrics routes on the Hono app.
 *
 * @param app - the Hono application instance
 * @param deps - database clients checked by the readiness probe
 */
function healthRoutes(app: Hono, deps: HealthDependencies): void {
  app.get('/health', (c) => {
    return c.json({ status: 'ok' });
  });

  app.get('/ready', async (c) => {
    const checks: Record<string, { status: string; error?: string }> = {};

    try {
      await deps.pgPool.query('SELECT 1');
      checks.postgresql = { status: 'healthy' };
    } catch (err) {
      checks.postgresql = {
        status: 'unhealthy',
        error: (err as Error).message,
      };
    }

    try {
      await deps.esClient.ping();
      checks.elasticsearch = { status: 'healthy' };
    } catch (err) {
      checks.elasticsearch = {
        status: 'unhealthy',
        error: (err as Error).message,
      };
    }

    try {
      await deps.neo4jDriver.verifyConnectivity();
      checks.neo4j = { status: 'healthy' };
    } catch (err) {
      checks.neo4j = {
        status: 'unhealthy',
        error: (err as Error).message,
      };
    }

    try {
      await deps.redis.ping();
      checks.redis = { status: 'healthy' };
    } catch (err) {
      checks.redis = {
        status: 'unhealthy',
        error: (err as Error).message,
      };
    }

    const allHealthy = Object.values(checks).every((check) => check.status === 'healthy');

    if (allHealthy) {
      return c.json({ status: 'healthy', dependencies: checks });
    }

    return c.json({ status: 'unhealthy', dependencies: checks }, 503);
  });

  app.get('/metrics', async (c) => {
    const metrics = await prometheusRegistry.metrics();
    return c.text(metrics, 200, {
      'Content-Type': prometheusRegistry.contentType,
    });
  });
}

export { healthRoutes };
export type { HealthDependencies };
