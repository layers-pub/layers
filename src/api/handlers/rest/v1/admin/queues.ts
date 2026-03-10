/**
 * BullMQ queue status admin endpoint.
 *
 * Returns job counts (waiting, active, completed, failed) for each
 * registered BullMQ queue, allowing admins to monitor queue health
 * and detect backlogs.
 *
 * @module
 */

import type { Hono } from 'hono';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

/**
 * Dependencies required by queue admin endpoints.
 */
interface QueueAdminDependencies {
  readonly redis: Redis;
}

/**
 * Status summary for a single BullMQ queue.
 */
interface QueueStatus {
  readonly name: string;
  readonly waiting: number;
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
}

/**
 * Queue names monitored by the admin endpoint.
 */
const QUEUE_NAMES = [
  'firehose-events',
  'enrichment',
  'format-import',
  'maintenance',
  'notifications',
] as const;

/**
 * Fetches job counts for a single BullMQ queue.
 *
 * Creates a temporary Queue instance using the same host/port as the
 * provided Redis connection, queries counts, and closes. Returns
 * zero counts if the query fails.
 *
 * @param name - the queue name
 * @param redis - Redis connection for extracting host and port
 * @returns queue status with job counts
 */
async function getQueueStatus(name: string, redis: Redis): Promise<QueueStatus> {
  const queue = new Queue(name, {
    connection: {
      host: redis.options.host ?? '127.0.0.1',
      port: redis.options.port ?? 6379,
      password: redis.options.password,
      db: redis.options.db ?? 0,
    },
  });
  try {
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed');
    return {
      name,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
    };
  } catch {
    return { name, waiting: 0, active: 0, completed: 0, failed: 0 };
  } finally {
    await queue.close();
  }
}

/**
 * Registers queue admin routes on the given Hono app.
 *
 * @param app - the Hono application instance
 * @param deps - Redis connection for BullMQ queue introspection
 */
function queuesAdminRoutes(app: Hono, deps: QueueAdminDependencies): void {
  app.get('/admin/v1/queues', async (c) => {
    const statuses = await Promise.all(QUEUE_NAMES.map((name) => getQueueStatus(name, deps.redis)));
    return c.json(statuses);
  });
}

export { queuesAdminRoutes };
export type { QueueAdminDependencies, QueueStatus };
