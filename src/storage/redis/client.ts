/**
 * Redis client factory using ioredis.
 *
 * @module
 */

import { Redis } from 'ioredis';

import { createLogger } from '../../observability/logger.js';

/**
 * Configuration for the Redis client.
 */
interface RedisConfig {
  readonly url: string;
  readonly maxRetriesPerRequest?: number;
  readonly connectTimeout?: number;
  readonly lazyConnect?: boolean;
}

/**
 * Creates a Redis client with connection event logging.
 *
 * @param config - connection URL and retry configuration
 * @returns a configured ioredis client instance
 *
 * @example
 * ```typescript
 * const redis = createRedisClient({
 *   url: "redis://localhost:6379",
 * });
 * ```
 */
function createRedisClient(config: RedisConfig): Redis {
  const logger = createLogger({ service: 'redis' });

  const client = new Redis(config.url, {
    maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
    connectTimeout: config.connectTimeout ?? 5_000,
    lazyConnect: config.lazyConnect ?? false,
  });

  client.on('connect', () => {
    logger.info('Connected to Redis');
  });

  client.on('error', (err: Error) => {
    logger.error('Redis connection error', { error: err.message });
  });

  client.on('reconnecting', () => {
    logger.warn('Reconnecting to Redis');
  });

  return client;
}

export { createRedisClient };
export type { RedisConfig };
