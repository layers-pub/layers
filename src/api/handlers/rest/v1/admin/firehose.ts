/**
 * Firehose status admin endpoint.
 *
 * Reads cursor position, event rate, and connection status from Redis
 * keys populated by the firehose indexer process. Also includes the
 * current DLQ count from PostgreSQL.
 *
 * @module
 */

import type { Hono } from 'hono';
import type { Redis } from 'ioredis';
import type { Pool } from 'pg';

/**
 * Dependencies required by the firehose status endpoint.
 */
interface FirehoseAdminDependencies {
  readonly redis: Redis;
  readonly pgPool: Pool;
}

/**
 * Response shape for GET /admin/v1/firehose.
 */
interface FirehoseStatusResponse {
  readonly cursor: number;
  readonly lastEventAt: string | null;
  readonly eventsPerSecond: number;
  readonly dlqCount: number;
  readonly status: 'active' | 'paused' | 'disconnected';
}

/**
 * Row shape for the DLQ count query.
 */
interface CountRow {
  count: number;
}

/**
 * Registers firehose status admin routes on the given Hono app.
 *
 * The indexer process stores its state under the following Redis keys:
 * - `cursor:firehose` (string): current cursor position
 * - `layers:firehose:last_event_at` (string): ISO timestamp of last event
 * - `layers:firehose:events_per_second` (string): rolling event rate
 * - `layers:firehose:status` (string): "active", "paused", or "disconnected"
 *
 * @param app - the Hono application instance
 * @param deps - Redis and PostgreSQL connections
 */
function firehoseAdminRoutes(app: Hono, deps: FirehoseAdminDependencies): void {
  app.get('/admin/v1/firehose', async (c) => {
    const [cursorRaw, lastEventAt, epsRaw, statusRaw, dlqResult] = await Promise.all([
      deps.redis.get('cursor:firehose').catch(() => null),
      deps.redis.get('layers:firehose:last_event_at').catch(() => null),
      deps.redis.get('layers:firehose:events_per_second').catch(() => null),
      deps.redis.get('layers:firehose:status').catch(() => null),
      deps.pgPool
        .query('SELECT COUNT(*)::int AS count FROM dlq_entries')
        .catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const cursor = cursorRaw !== null ? parseInt(cursorRaw, 10) : 0;
    const eventsPerSecond = epsRaw !== null ? parseFloat(epsRaw) : 0;
    const dlqCount = (dlqResult.rows[0] as CountRow).count;

    // Determine status: prefer the Redis-stored status, fall back to
    // inferring "disconnected" if no cursor or last event exists.
    let status: 'active' | 'paused' | 'disconnected' = 'disconnected';
    if (statusRaw === 'active' || statusRaw === 'paused') {
      status = statusRaw;
    } else if (cursorRaw !== null) {
      status = 'active';
    }

    const response: FirehoseStatusResponse = {
      cursor: isNaN(cursor) ? 0 : cursor,
      lastEventAt: lastEventAt ?? null,
      eventsPerSecond: isNaN(eventsPerSecond) ? 0 : eventsPerSecond,
      dlqCount,
      status,
    };

    return c.json(response);
  });
}

export { firehoseAdminRoutes };
export type { FirehoseAdminDependencies, FirehoseStatusResponse };
