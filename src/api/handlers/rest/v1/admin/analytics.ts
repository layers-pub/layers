/**
 * Admin analytics and runtime metrics endpoints.
 *
 * Provides search analytics, Neo4j graph statistics, and Node.js
 * runtime metrics for the admin dashboard.
 *
 * @module
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { Context, Hono } from 'hono';
import type { Driver } from 'neo4j-driver';

/**
 * Dependencies required by the analytics endpoints.
 */
interface AnalyticsAdminDeps {
  readonly esClient: EsClient;
  readonly neo4jDriver: Driver;
}

/**
 * Registers analytics and runtime admin routes.
 *
 * @param app - the Hono application instance
 * @param deps - Elasticsearch client and Neo4j driver
 */
function analyticsAdminRoutes(app: Hono, deps: AnalyticsAdminDeps): void {
  /**
   * GET /api/v1/admin/search-analytics
   *
   * Returns search index statistics and query metrics.
   */
  app.get('/api/v1/admin/search-analytics', async (c: Context) => {
    try {
      const stats = await deps.esClient.indices.stats({ index: '_all', metric: ['docs', 'store'] });
      const indices = stats.indices ?? {};

      let totalSearches = 0;
      let totalDocs = 0;

      for (const [, indexStats] of Object.entries(indices)) {
        const primaries = indexStats.primaries;
        totalDocs += primaries?.docs?.count ?? 0;
        totalSearches += primaries?.search?.query_total ?? 0;
      }

      // Query latency from index-level stats (search section)
      let totalQueryTimeMs = 0;
      for (const [, indexStats] of Object.entries(indices)) {
        const searchStats = indexStats.primaries?.search as Record<string, unknown> | undefined;
        totalQueryTimeMs += (searchStats?.query_time_in_millis as number) ?? 0;
      }
      const avgLatencyMs = totalSearches > 0 ? Math.round(totalQueryTimeMs / totalSearches) : 0;

      return c.json({
        topQueries: [] as Array<{ query: string; count: number; avgLatencyMs: number }>,
        zeroResultQueries: [] as Array<{ query: string; count: number }>,
        totalSearches,
        avgLatencyMs,
        totalIndexedDocuments: totalDocs,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch search analytics';
      return c.json({ error: 'ELASTICSEARCH_ERROR', message }, 500);
    }
  });

  /**
   * GET /api/v1/admin/graph-stats
   *
   * Returns Neo4j node and relationship counts by label and type.
   */
  app.get('/api/v1/admin/graph-stats', async (c: Context) => {
    const session = deps.neo4jDriver.session({ defaultAccessMode: 'READ' });
    try {
      // Node counts by label
      const nodeResult = await session.run(
        'MATCH (n) UNWIND labels(n) AS label RETURN label, count(*) AS count ORDER BY count DESC',
      );
      const nodesByLabel: Record<string, number> = {};
      let totalNodes = 0;
      for (const record of nodeResult.records) {
        const label = record.get('label') as string;
        const count =
          typeof record.get('count') === 'object'
            ? (record.get('count') as { toNumber(): number }).toNumber()
            : (record.get('count') as number);
        nodesByLabel[label] = count;
        totalNodes += count;
      }

      // Relationship counts by type
      const edgeResult = await session.run(
        'MATCH ()-[r]->() RETURN type(r) AS relType, count(*) AS count ORDER BY count DESC',
      );
      const edgesByType: Record<string, number> = {};
      let totalEdges = 0;
      for (const record of edgeResult.records) {
        const relType = record.get('relType') as string;
        const count =
          typeof record.get('count') === 'object'
            ? (record.get('count') as { toNumber(): number }).toNumber()
            : (record.get('count') as number);
        edgesByType[relType] = count;
        totalEdges += count;
      }

      return c.json({ totalNodes, totalEdges, nodesByLabel, edgesByType });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch graph stats';
      return c.json({ error: 'NEO4J_ERROR', message }, 500);
    } finally {
      await session.close();
    }
  });

  /**
   * GET /api/v1/admin/runtime
   *
   * Returns Node.js process metrics: memory, CPU, uptime, version.
   */
  app.get('/api/v1/admin/runtime', (c: Context) => {
    const mem = process.memoryUsage();
    return c.json({
      nodeVersion: process.version,
      uptime: process.uptime(),
      pid: process.pid,
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers,
      },
      platform: process.platform,
      arch: process.arch,
    });
  });
}

export { analyticsAdminRoutes };
export type { AnalyticsAdminDeps };
