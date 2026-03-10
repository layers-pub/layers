/**
 * Pre-deployment tests that validate health endpoint contracts.
 *
 * Tests run against the built app using Hono's test helper (app.request())
 * with mocked database dependencies. Validates response shapes for /health,
 * /ready, and /metrics endpoints.
 *
 * @module
 */

import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';

import { healthRoutes, type HealthDependencies } from '@/api/handlers/rest/v1/health.js';

/**
 * Creates mock dependencies for health route testing.
 */
function createMockDeps(overrides?: {
  pgHealthy?: boolean;
  esHealthy?: boolean;
  neo4jHealthy?: boolean;
  redisHealthy?: boolean;
}): HealthDependencies {
  const pgHealthy = overrides?.pgHealthy ?? true;
  const esHealthy = overrides?.esHealthy ?? true;
  const neo4jHealthy = overrides?.neo4jHealthy ?? true;
  const redisHealthy = overrides?.redisHealthy ?? true;

  return {
    pgPool: {
      query: pgHealthy
        ? vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] })
        : vi.fn().mockRejectedValue(new Error('Connection refused')),
    } as unknown as HealthDependencies['pgPool'],

    esClient: {
      ping: esHealthy
        ? vi.fn().mockResolvedValue(true)
        : vi.fn().mockRejectedValue(new Error('ES unavailable')),
    } as unknown as HealthDependencies['esClient'],

    neo4jDriver: {
      verifyConnectivity: neo4jHealthy
        ? vi.fn().mockResolvedValue(undefined)
        : vi.fn().mockRejectedValue(new Error('Neo4j unreachable')),
    } as unknown as HealthDependencies['neo4jDriver'],

    redis: {
      ping: redisHealthy
        ? vi.fn().mockResolvedValue('PONG')
        : vi.fn().mockRejectedValue(new Error('Redis timeout')),
    } as unknown as HealthDependencies['redis'],
  };
}

describe('GET /health', () => {
  it('returns 200 with expected JSON shape', async () => {
    const app = new Hono();
    healthRoutes(app, createMockDeps());

    const res = await app.request('/health');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('ok');
  });

  it('returns 200 regardless of backend health', async () => {
    const app = new Hono();
    healthRoutes(app, createMockDeps({ pgHealthy: false }));

    const res = await app.request('/health');

    expect(res.status).toBe(200);
  });
});

describe('GET /ready', () => {
  it('returns 200 with expected JSON shape when all backends are healthy', async () => {
    const app = new Hono();
    healthRoutes(app, createMockDeps());

    const res = await app.request('/ready');

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      dependencies: Record<string, { status: string }>;
    };
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('healthy');
    expect(body).toHaveProperty('dependencies');
    expect(body.dependencies).toHaveProperty('postgresql');
    expect(body.dependencies).toHaveProperty('elasticsearch');
    expect(body.dependencies).toHaveProperty('neo4j');
    expect(body.dependencies).toHaveProperty('redis');
  });

  it('returns component status fields for each backend', async () => {
    const app = new Hono();
    healthRoutes(app, createMockDeps());

    const res = await app.request('/ready');
    const body = (await res.json()) as {
      dependencies: Record<string, { status: string }>;
    };

    for (const dep of ['postgresql', 'elasticsearch', 'neo4j', 'redis']) {
      expect(body.dependencies[dep]).toHaveProperty('status');
      expect(body.dependencies[dep]!.status).toBe('healthy');
    }
  });

  it('returns 503 when a backend is unhealthy', async () => {
    const app = new Hono();
    healthRoutes(app, createMockDeps({ pgHealthy: false }));

    const res = await app.request('/ready');

    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      status: string;
      dependencies: Record<string, { status: string; error?: string }>;
    };
    expect(body.status).toBe('unhealthy');
    expect(body.dependencies.postgresql!.status).toBe('unhealthy');
    expect(body.dependencies.postgresql!.error).toBeDefined();
  });

  it('returns 503 when multiple backends are unhealthy', async () => {
    const app = new Hono();
    healthRoutes(app, createMockDeps({ pgHealthy: false, redisHealthy: false }));

    const res = await app.request('/ready');

    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      dependencies: Record<string, { status: string }>;
    };
    expect(body.dependencies.postgresql!.status).toBe('unhealthy');
    expect(body.dependencies.redis!.status).toBe('unhealthy');
    expect(body.dependencies.elasticsearch!.status).toBe('healthy');
    expect(body.dependencies.neo4j!.status).toBe('healthy');
  });
});

describe('GET /metrics', () => {
  it('returns 200 with Prometheus text format', async () => {
    const app = new Hono();
    healthRoutes(app, createMockDeps());

    const res = await app.request('/metrics');

    expect(res.status).toBe(200);
    const contentType = res.headers.get('Content-Type');
    expect(contentType).toContain('text/');
    const body = await res.text();
    // Prometheus metrics contain HELP and TYPE lines
    expect(body.length).toBeGreaterThan(0);
  });
});
