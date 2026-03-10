/**
 * Rate limiting middleware using a Redis sorted-set sliding window algorithm.
 *
 * Enforces 4 tiers of rate limiting based on authentication status:
 * anonymous (60/min), authenticated (300/min), service (1000/min),
 * and admin (5000/min). Supports configurable fail-open or fail-closed
 * behavior when Redis is unavailable.
 *
 * @module
 */

import type { Context, MiddlewareHandler } from 'hono';
import type { Redis } from 'ioredis';

import { createLogger } from '../../observability/logger.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';

/** Rate limit tier configuration. */
interface RateLimitTier {
  readonly requestsPerMinute: number;
  readonly windowMs: number;
}

/** Rate limit tiers by authentication level. */
const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  anonymous: { requestsPerMinute: 60, windowMs: 60_000 },
  authenticated: { requestsPerMinute: 300, windowMs: 60_000 },
  service: { requestsPerMinute: 1000, windowMs: 60_000 },
  admin: { requestsPerMinute: 5000, windowMs: 60_000 },
};

/** Rate limiter configuration. */
interface RateLimiterConfig {
  readonly redis: Redis;
  readonly failOpen?: boolean;
  readonly logger?: ILogger;
}

/** Result of a rate limit check. */
interface RateLimitResult {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetMs: number;
}

/**
 * Determines the rate limit tier for a request based on the auth context
 * set by the authentication middleware.
 *
 * @param c - the Hono request context
 * @returns the tier name (anonymous, authenticated, service, or admin)
 */
function getTier(c: Context): string {
  const authContext = c.get('auth') as { role?: string; did?: string } | undefined;
  if (authContext?.role === 'admin') return 'admin';
  if (authContext?.role === 'service') return 'service';
  if (authContext?.did) return 'authenticated';
  return 'anonymous';
}

/**
 * Extracts the rate limit identifier from a request.
 *
 * Uses DID for authenticated users and IP address for anonymous requests.
 *
 * @param c - the Hono request context
 * @returns a string identifier for rate limiting
 */
function getIdentifier(c: Context): string {
  const authContext = c.get('auth') as { did?: string } | undefined;
  if (authContext?.did) return authContext.did;
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  return 'unknown';
}

/**
 * Performs a sliding window rate limit check using Redis sorted sets.
 *
 * Executes an atomic pipeline of ZREMRANGEBYSCORE (clear expired),
 * ZCARD (count current), ZADD (register request), and PEXPIRE (set TTL).
 *
 * @param redis - the Redis client
 * @param identifier - the rate limit identifier (DID or IP)
 * @param tier - the tier configuration to enforce
 * @returns the rate limit check result
 */
async function checkRateLimit(
  redis: Redis,
  identifier: string,
  tier: RateLimitTier,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - tier.windowMs;
  const key = `ratelimit:${identifier}:${String(tier.windowMs)}`;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, '-inf', String(windowStart));
  pipeline.zcard(key);
  pipeline.zadd(key, String(now), `${String(now)}:${String(Math.random())}`);
  pipeline.pexpire(key, tier.windowMs);

  const results = await pipeline.exec();
  const currentCount = (results?.[1]?.[1] as number) ?? 0;

  const remaining = Math.max(0, tier.requestsPerMinute - currentCount - 1);
  const resetMs = tier.windowMs;

  return {
    allowed: currentCount < tier.requestsPerMinute,
    limit: tier.requestsPerMinute,
    remaining,
    resetMs,
  };
}

/**
 * Sets standard rate limit response headers.
 *
 * Headers follow the IETF draft format for rate limit fields.
 *
 * @param c - the Hono request context
 * @param result - the rate limit check result
 */
function setRateLimitHeaders(c: Context, result: RateLimitResult): void {
  const resetSeconds = Math.ceil(result.resetMs / 1000);
  c.header('X-RateLimit-Limit', String(result.limit));
  c.header('X-RateLimit-Remaining', String(result.remaining));
  c.header('X-RateLimit-Reset', String(resetSeconds));
  c.header('RateLimit-Policy', `${String(result.limit)};w=${String(resetSeconds)}`);
}

/**
 * Creates a Hono middleware that enforces sliding window rate limits.
 *
 * Requires a Redis connection for sorted-set storage. When Redis is
 * unavailable, behavior is controlled by the `failOpen` option:
 * - `true` (default): allows the request through
 * - `false`: returns 503 Service Unavailable
 *
 * @param config - Redis client and behavior options
 * @returns a Hono middleware handler
 *
 * @example
 * ```typescript
 * app.use('*', createRateLimiter({ redis, failOpen: true }));
 * ```
 */
function createRateLimiter(config: RateLimiterConfig): MiddlewareHandler {
  const logger = config.logger ?? createLogger({ service: 'rate-limiter' });
  const failOpen = config.failOpen ?? true;

  return async (c, next) => {
    const tier = getTier(c);
    const tierConfig = RATE_LIMIT_TIERS[tier];

    if (!tierConfig) {
      await next();
      return;
    }

    const identifier = getIdentifier(c);

    try {
      const result = await checkRateLimit(config.redis, identifier, tierConfig);
      setRateLimitHeaders(c, result);

      if (!result.allowed) {
        const resetSeconds = Math.ceil(result.resetMs / 1000);
        logger.warn('Rate limit exceeded', { identifier, tier, limit: result.limit });
        return c.json(
          {
            error: 'RateLimitExceeded',
            message: `Rate limit exceeded. Try again in ${String(resetSeconds)} seconds.`,
          },
          429,
        );
      }
    } catch (err) {
      logger.error('Rate limit check failed', {
        error: err instanceof Error ? err.message : String(err),
        failOpen,
      });

      if (!failOpen) {
        return c.json(
          { error: 'ServiceUnavailable', message: 'Rate limiting service unavailable' },
          503,
        );
      }
    }

    await next();
  };
}

/**
 * Creates a no-op rate limiter that passes all requests through.
 *
 * Used in test environments or when no Redis connection is available.
 *
 * @returns a Hono middleware handler that always calls next()
 */
function rateLimiter(): MiddlewareHandler {
  return async (_c, next) => {
    await next();
  };
}

export {
  createRateLimiter,
  checkRateLimit,
  getIdentifier,
  getTier,
  rateLimiter,
  RATE_LIMIT_TIERS,
  setRateLimitHeaders,
};
export type { RateLimiterConfig, RateLimitResult, RateLimitTier };
