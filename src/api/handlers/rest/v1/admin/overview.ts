/**
 * Admin overview and content management endpoints.
 *
 * Provides aggregate record counts for the dashboard overview and
 * paginated content listing by collection type.
 *
 * @module
 */

import type { Client } from '@elastic/elasticsearch';
import type { Context, Hono } from 'hono';
import type { Redis } from 'ioredis';
import type { Driver } from 'neo4j-driver';
import type { Pool } from 'pg';

/**
 * Dependencies required by the overview and content endpoints.
 */
interface OverviewAdminDeps {
  readonly pgPool: Pool;
  readonly esClient: Client;
  readonly neo4jDriver: Driver;
  readonly redis: Redis;
}

/**
 * Row shape for PostgreSQL count queries.
 */
interface CountRow {
  count: number;
}

/**
 * PostgreSQL tables mapped to collection NSIDs.
 */
const TABLE_MAP: ReadonlyArray<{ table: string; collection: string }> = [
  { table: 'expressions', collection: 'pub.layers.expression.expression' },
  { table: 'segmentations', collection: 'pub.layers.segmentation.segmentation' },
  { table: 'annotation_layers', collection: 'pub.layers.annotation.annotationLayer' },
  { table: 'cluster_sets', collection: 'pub.layers.annotation.clusterSet' },
  { table: 'ontologies', collection: 'pub.layers.ontology.ontology' },
  { table: 'type_defs', collection: 'pub.layers.ontology.typeDef' },
  { table: 'corpora', collection: 'pub.layers.corpus.corpus' },
  { table: 'corpus_memberships', collection: 'pub.layers.corpus.membership' },
  { table: 'resource_entries', collection: 'pub.layers.resource.entry' },
  { table: 'resource_collections', collection: 'pub.layers.resource.collection' },
  { table: 'collection_memberships', collection: 'pub.layers.resource.collectionMembership' },
  { table: 'templates', collection: 'pub.layers.resource.template' },
  { table: 'fillings', collection: 'pub.layers.resource.filling' },
  { table: 'template_compositions', collection: 'pub.layers.resource.templateComposition' },
  { table: 'experiment_defs', collection: 'pub.layers.judgment.experimentDef' },
  { table: 'judgment_sets', collection: 'pub.layers.judgment.judgmentSet' },
  { table: 'agreement_reports', collection: 'pub.layers.judgment.agreementReport' },
  { table: 'alignments', collection: 'pub.layers.alignment.alignment' },
  { table: 'graph_nodes', collection: 'pub.layers.graph.graphNode' },
  { table: 'graph_edges', collection: 'pub.layers.graph.graphEdge' },
  { table: 'graph_edge_sets', collection: 'pub.layers.graph.graphEdgeSet' },
  { table: 'personas', collection: 'pub.layers.persona.persona' },
  { table: 'media_records', collection: 'pub.layers.media.media' },
  { table: 'eprints', collection: 'pub.layers.eprint.eprint' },
  { table: 'data_links', collection: 'pub.layers.eprint.dataLink' },
  { table: 'changelogs', collection: 'pub.layers.changelog.entry' },
];

/**
 * Safely counts rows in a PostgreSQL table.
 * Returns 0 if the table does not exist.
 */
async function safeCount(pool: Pool, tableName: string): Promise<number> {
  try {
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
    return (result.rows[0] as CountRow).count;
  } catch {
    return 0;
  }
}

/**
 * Registers overview and content admin routes.
 *
 * @param app - the Hono application instance
 * @param deps - database clients and Redis connection
 */
function overviewAdminRoutes(app: Hono, deps: OverviewAdminDeps): void {
  /**
   * GET /api/v1/admin/overview
   *
   * Aggregate counts, firehose status, queue depths, and database health.
   */
  app.get('/api/v1/admin/overview', async (c: Context) => {
    const [expressionCount, corporaCount, ontologyCount, annotationLayerCount] = await Promise.all([
      safeCount(deps.pgPool, 'expressions'),
      safeCount(deps.pgPool, 'corpora'),
      safeCount(deps.pgPool, 'ontologies'),
      safeCount(deps.pgPool, 'annotation_layers'),
    ]);

    // Active users in last 24h
    let activeUsers24h = 0;
    try {
      const result = await deps.pgPool.query(
        `SELECT COUNT(DISTINCT did)::int AS count FROM expressions WHERE indexed_at > NOW() - INTERVAL '24 hours'`,
      );
      activeUsers24h = (result.rows[0] as CountRow).count;
    } catch {
      // Table may not exist yet
    }

    // Import count
    let importCount = 0;
    try {
      const result = await deps.pgPool.query('SELECT COUNT(*)::int AS count FROM import_jobs');
      importCount = (result.rows[0] as CountRow).count;
    } catch {
      // Table may not exist yet
    }

    // Firehose status from Redis
    const [cursorRaw, epsRaw, statusRaw] = await Promise.all([
      deps.redis.get('cursor:firehose').catch(() => null),
      deps.redis.get('layers:firehose:events_per_second').catch(() => null),
      deps.redis.get('layers:firehose:status').catch(() => null),
    ]);

    const dlqResult = await deps.pgPool
      .query('SELECT COUNT(*)::int AS count FROM dlq_entries')
      .catch(() => ({ rows: [{ count: 0 }] }));

    let firehoseStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
    if (statusRaw === 'active') firehoseStatus = 'connected';
    else if (statusRaw === 'paused') firehoseStatus = 'reconnecting';

    // Queue depths
    let totalWaiting = 0;
    let totalActive = 0;
    let totalFailed = 0;
    try {
      const queueNames = ['firehose-events', 'enrichment', 'format-import', 'maintenance'];
      for (const name of queueNames) {
        totalWaiting += await deps.redis.llen(`bull:${name}:wait`).catch(() => 0);
        totalActive += await deps.redis.llen(`bull:${name}:active`).catch(() => 0);
        totalFailed += await deps.redis.zcard(`bull:${name}:failed`).catch(() => 0);
      }
    } catch {
      // Redis may be unavailable
    }

    // Database health
    const pgHealth = await checkLatency(() => deps.pgPool.query('SELECT 1'));
    const esHealth = await checkLatency(() => deps.esClient.ping());
    const neo4jHealth = await checkLatency(() => deps.neo4jDriver.verifyConnectivity());
    const redisHealth = await checkLatency(() => deps.redis.ping());

    return c.json({
      expressionCount,
      corporaCount,
      ontologyCount,
      annotationLayerCount,
      activeUsers24h,
      importCount,
      firehose: {
        cursor: cursorRaw ?? '0',
        eventsPerSecond: epsRaw !== null ? parseFloat(epsRaw) : 0,
        dlqCount: (dlqResult.rows[0] as CountRow).count,
        status: firehoseStatus,
      },
      queues: { totalWaiting, totalActive, totalFailed },
      databases: {
        postgresql: {
          ...pgHealth,
          connections: {
            active: deps.pgPool.totalCount - deps.pgPool.idleCount,
            idle: deps.pgPool.idleCount,
            total: deps.pgPool.totalCount,
          },
        },
        elasticsearch: esHealth,
        neo4j: neo4jHealth,
        redis: redisHealth,
      },
    });
  });

  /**
   * GET /api/v1/admin/content/:type
   *
   * Paginated records of a specific collection type.
   */
  app.get('/api/v1/admin/content/:type', async (c: Context) => {
    const collectionType = c.req.param('type');
    const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10) || 50, 200);
    const cursor = c.req.query('cursor');

    const mapping = TABLE_MAP.find((m) => m.collection === collectionType);
    if (!mapping) {
      return c.json({ error: 'Unknown collection type', collection: collectionType }, 400);
    }

    try {
      const countResult = await deps.pgPool.query(
        `SELECT COUNT(*)::int AS count FROM ${mapping.table}`,
      );
      const total = (countResult.rows[0] as CountRow).count;

      const params: unknown[] = [limit];
      let whereClause = '';
      if (cursor) {
        whereClause = 'WHERE indexed_at < $2';
        params.push(cursor);
      }

      const result = await deps.pgPool.query(
        `SELECT uri, did, indexed_at AS "createdAt" FROM ${mapping.table} ${whereClause} ORDER BY indexed_at DESC LIMIT $1`,
        params,
      );

      interface ContentRow {
        uri: string;
        did: string;
        createdAt: string;
      }

      const items = (result.rows as ContentRow[]).map((row) => ({
        uri: row.uri,
        did: row.did,
        createdAt: row.createdAt,
        collection: collectionType,
      }));

      const lastItem = items[items.length - 1];
      const nextCursor = items.length === limit && lastItem ? lastItem.createdAt : undefined;

      return c.json({ items, total, cursor: nextCursor });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Query failed';
      return c.json({ error: 'DATABASE_ERROR', message }, 500);
    }
  });
}

/**
 * Measures the latency of an async operation and returns health status.
 */
async function checkLatency(
  fn: () => Promise<unknown>,
): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number }> {
  const start = performance.now();
  try {
    await fn();
    const latencyMs = Math.round(performance.now() - start);
    return { status: latencyMs > 1000 ? 'degraded' : 'healthy', latencyMs };
  } catch {
    return { status: 'down', latencyMs: -1 };
  }
}

export { overviewAdminRoutes };
export type { OverviewAdminDeps };
