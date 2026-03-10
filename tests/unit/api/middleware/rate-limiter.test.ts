/**
 * Unit tests for the rate limiting middleware.
 *
 * Covers all six exported functions, the four tier definitions, fail-open
 * and fail-closed behavior, IETF draft response headers, and the no-op
 * middleware fallback.
 *
 * @module
 */

import { Hono } from 'hono';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  checkRateLimit,
  createRateLimiter,
  getIdentifier,
  getTier,
  RATE_LIMIT_TIERS,
  rateLimiter,
  setRateLimitHeaders,
} from '../../../../src/api/middleware/rate-limiter.js';
import type {
  RateLimiterConfig,
  RateLimitTier,
} from '../../../../src/api/middleware/rate-limiter.js';
import type { ILogger } from '../../../../src/types/interfaces/logger.interface.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockLogger(): ILogger {
  const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => logger),
  };
  return logger;
}

/** Creates a mock Redis pipeline whose exec() resolves with the given results. */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockPipeline(results: [Error | null, unknown][]) {
  return {
    zremrangebyscore: vi.fn().mockReturnThis(),
    zcard: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    pexpire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(results),
  };
}

/** Creates a mock Redis client that returns the given pipeline from pipeline(). */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockRedis(pipelineOverride?: ReturnType<typeof createMockPipeline>) {
  const defaultPipeline = createMockPipeline([
    [null, 0],
    [null, 5],
    [null, 1],
    [null, 1],
  ]);
  const pipeline = pipelineOverride ?? defaultPipeline;
  return {
    pipeline: vi.fn(() => pipeline),
    __pipeline: pipeline,
  } as unknown as import('ioredis').Redis & {
    __pipeline: ReturnType<typeof createMockPipeline>;
  };
}

/** Creates a mock Redis client whose pipeline exec() always rejects. */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createFailingRedis() {
  const pipeline = {
    zremrangebyscore: vi.fn().mockReturnThis(),
    zcard: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    pexpire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockRejectedValue(new Error('Redis connection refused')),
  };
  return {
    pipeline: vi.fn(() => pipeline),
    __pipeline: pipeline,
  } as unknown as import('ioredis').Redis & {
    __pipeline: typeof pipeline;
  };
}

/** Hono env type used when auth context is injected. */
interface TestEnv {
  Variables: {
    auth: { did?: string | null; role?: string; authenticated?: boolean };
  };
}

/**
 * Creates a Hono app with auth middleware, rate limiter, and a GET /test
 * endpoint. The auth middleware sets the context before the rate limiter runs.
 */
function createTestApp(
  redis: import('ioredis').Redis,
  options: {
    failOpen?: boolean;
    logger?: ILogger;
    auth?: { did?: string | null; role?: string; authenticated?: boolean };
  } = {},
): Hono<TestEnv> {
  const app = new Hono<TestEnv>();

  const authCtx = options.auth ?? { did: null, authenticated: false };
  app.use('*', async (c, next) => {
    c.set('auth', authCtx);
    await next();
  });

  const rateLimiterConfig: RateLimiterConfig = {
    redis,
    ...(options.failOpen !== undefined ? { failOpen: options.failOpen } : {}),
    ...(options.logger !== undefined ? { logger: options.logger } : {}),
  };

  app.use('*', createRateLimiter(rateLimiterConfig));
  app.get('/test', (c) => c.json({ ok: true }));

  return app;
}

// ---------------------------------------------------------------------------
// getTier
// ---------------------------------------------------------------------------

describe('getTier', () => {
  it('returns "admin" when auth role is admin', async () => {
    const app = new Hono<TestEnv>();
    let result = '';
    app.use('*', async (c, next) => {
      c.set('auth', { role: 'admin', did: 'did:plc:admin1' });
      await next();
    });
    app.get('/test', (c) => {
      result = getTier(c);
      return c.json({ tier: result });
    });

    await app.request('/test');
    expect(result).toBe('admin');
  });

  it('returns "service" when auth role is service', async () => {
    const app = new Hono<TestEnv>();
    let result = '';
    app.use('*', async (c, next) => {
      c.set('auth', { role: 'service', did: 'did:plc:svc1' });
      await next();
    });
    app.get('/test', (c) => {
      result = getTier(c);
      return c.json({ tier: result });
    });

    await app.request('/test');
    expect(result).toBe('service');
  });

  it('returns "authenticated" for a user with DID and non-special role', async () => {
    const app = new Hono<TestEnv>();
    let result = '';
    app.use('*', async (c, next) => {
      c.set('auth', { did: 'did:plc:user1', role: 'annotator' });
      await next();
    });
    app.get('/test', (c) => {
      result = getTier(c);
      return c.json({ tier: result });
    });

    await app.request('/test');
    expect(result).toBe('authenticated');
  });

  it('returns "authenticated" for a user with DID and no role', async () => {
    const app = new Hono<TestEnv>();
    let result = '';
    app.use('*', async (c, next) => {
      c.set('auth', { did: 'did:plc:user2' });
      await next();
    });
    app.get('/test', (c) => {
      result = getTier(c);
      return c.json({ tier: result });
    });

    await app.request('/test');
    expect(result).toBe('authenticated');
  });

  it('returns "anonymous" when no auth context is set', async () => {
    const app = new Hono();
    let result = '';
    app.get('/test', (c) => {
      result = getTier(c);
      return c.json({ tier: result });
    });

    await app.request('/test');
    expect(result).toBe('anonymous');
  });

  it('returns "anonymous" when auth context has null DID', async () => {
    const app = new Hono<TestEnv>();
    let result = '';
    app.use('*', async (c, next) => {
      c.set('auth', { did: null, authenticated: false });
      await next();
    });
    app.get('/test', (c) => {
      result = getTier(c);
      return c.json({ tier: result });
    });

    await app.request('/test');
    expect(result).toBe('anonymous');
  });

  it('returns "anonymous" when auth context is an empty object', async () => {
    const app = new Hono<TestEnv>();
    let result = '';
    app.use('*', async (c, next) => {
      c.set('auth', {} as TestEnv['Variables']['auth']);
      await next();
    });
    app.get('/test', (c) => {
      result = getTier(c);
      return c.json({ tier: result });
    });

    await app.request('/test');
    expect(result).toBe('anonymous');
  });

  it('prefers admin role over DID presence', async () => {
    const app = new Hono<TestEnv>();
    let result = '';
    app.use('*', async (c, next) => {
      c.set('auth', { did: 'did:plc:admin1', role: 'admin' });
      await next();
    });
    app.get('/test', (c) => {
      result = getTier(c);
      return c.json({ tier: result });
    });

    await app.request('/test');
    expect(result).toBe('admin');
  });

  it('prefers service role over DID presence', async () => {
    const app = new Hono<TestEnv>();
    let result = '';
    app.use('*', async (c, next) => {
      c.set('auth', { did: 'did:plc:svc1', role: 'service' });
      await next();
    });
    app.get('/test', (c) => {
      result = getTier(c);
      return c.json({ tier: result });
    });

    await app.request('/test');
    expect(result).toBe('service');
  });
});

// ---------------------------------------------------------------------------
// getIdentifier
// ---------------------------------------------------------------------------

describe('getIdentifier', () => {
  it('returns DID for authenticated users', async () => {
    const app = new Hono<TestEnv>();
    let result = '';
    app.use('*', async (c, next) => {
      c.set('auth', { did: 'did:plc:user1' });
      await next();
    });
    app.get('/test', (c) => {
      result = getIdentifier(c);
      return c.json({ id: result });
    });

    await app.request('/test');
    expect(result).toBe('did:plc:user1');
  });

  it('returns first IP from X-Forwarded-For for anonymous users', async () => {
    const app = new Hono<TestEnv>();
    let result = '';
    app.use('*', async (c, next) => {
      c.set('auth', { did: null });
      await next();
    });
    app.get('/test', (c) => {
      result = getIdentifier(c);
      return c.json({ id: result });
    });

    const req = new Request('http://localhost/test', {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
    });
    await app.request(req);
    expect(result).toBe('192.168.1.1');
  });

  it('trims whitespace from the forwarded IP', async () => {
    const app = new Hono<TestEnv>();
    let result = '';
    app.use('*', async (c, next) => {
      c.set('auth', { did: null });
      await next();
    });
    app.get('/test', (c) => {
      result = getIdentifier(c);
      return c.json({ id: result });
    });

    const req = new Request('http://localhost/test', {
      headers: { 'x-forwarded-for': '  203.0.113.5 , 10.0.0.1' },
    });
    await app.request(req);
    expect(result).toBe('203.0.113.5');
  });

  it('returns "unknown" when no DID and no X-Forwarded-For header', async () => {
    const app = new Hono<TestEnv>();
    let result = '';
    app.use('*', async (c, next) => {
      c.set('auth', { did: null });
      await next();
    });
    app.get('/test', (c) => {
      result = getIdentifier(c);
      return c.json({ id: result });
    });

    await app.request('/test');
    expect(result).toBe('unknown');
  });

  it('prefers DID over X-Forwarded-For when both are present', async () => {
    const app = new Hono<TestEnv>();
    let result = '';
    app.use('*', async (c, next) => {
      c.set('auth', { did: 'did:plc:user1' });
      await next();
    });
    app.get('/test', (c) => {
      result = getIdentifier(c);
      return c.json({ id: result });
    });

    const req = new Request('http://localhost/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });
    await app.request(req);
    expect(result).toBe('did:plc:user1');
  });

  it('returns "unknown" when no auth context exists at all', async () => {
    const app = new Hono();
    let result = '';
    app.get('/test', (c) => {
      result = getIdentifier(c);
      return c.json({ id: result });
    });

    await app.request('/test');
    expect(result).toBe('unknown');
  });

  it('handles a single IP in X-Forwarded-For (no comma)', async () => {
    const app = new Hono<TestEnv>();
    let result = '';
    app.use('*', async (c, next) => {
      c.set('auth', { did: null });
      await next();
    });
    app.get('/test', (c) => {
      result = getIdentifier(c);
      return c.json({ id: result });
    });

    const req = new Request('http://localhost/test', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    await app.request(req);
    expect(result).toBe('10.0.0.1');
  });
});

// ---------------------------------------------------------------------------
// checkRateLimit
// ---------------------------------------------------------------------------

describe('checkRateLimit', () => {
  const tier: RateLimitTier = { requestsPerMinute: 60, windowMs: 60_000 };

  it('allows requests under the limit', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 10],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);

    const result = await checkRateLimit(redis, '192.168.1.1', tier);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(60);
    expect(result.remaining).toBe(49); // 60 - 10 - 1
    expect(result.resetMs).toBe(60_000);
  });

  it('denies requests at the limit', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 60],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);

    const result = await checkRateLimit(redis, '192.168.1.1', tier);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('denies requests over the limit', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 100],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);

    const result = await checkRateLimit(redis, '192.168.1.1', tier);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('allows the first request in an empty window', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 0],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);

    const result = await checkRateLimit(redis, '10.0.0.1', tier);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59); // 60 - 0 - 1
  });

  it('constructs the Redis key from identifier and window duration', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 0],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);

    await checkRateLimit(redis, 'did:plc:test123', tier);

    expect(redis.__pipeline.zremrangebyscore).toHaveBeenCalledWith(
      'ratelimit:did:plc:test123:60000',
      '-inf',
      expect.any(String),
    );
  });

  it('executes all four pipeline operations', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 5],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);

    await checkRateLimit(redis, 'id', tier);

    expect(pipeline.zremrangebyscore).toHaveBeenCalledTimes(1);
    expect(pipeline.zcard).toHaveBeenCalledTimes(1);
    expect(pipeline.zadd).toHaveBeenCalledTimes(1);
    expect(pipeline.pexpire).toHaveBeenCalledWith('ratelimit:id:60000', 60_000);
    expect(pipeline.exec).toHaveBeenCalledTimes(1);
  });

  it('handles null pipeline results by defaulting count to zero', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, null], // zcard returns null
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);

    const result = await checkRateLimit(redis, 'id', tier);

    // null coalesces to 0, so allowed
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
  });

  it('propagates Redis pipeline errors', async () => {
    const redis = createFailingRedis();

    await expect(checkRateLimit(redis, 'id', tier)).rejects.toThrow('Redis connection refused');
  });

  it('clamps remaining to zero (never negative)', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 200], // well above limit of 60
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);

    const result = await checkRateLimit(redis, 'id', tier);

    expect(result.remaining).toBe(0);
  });

  it('works with a custom window duration', async () => {
    const customTier: RateLimitTier = { requestsPerMinute: 100, windowMs: 30_000 };
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 50],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);

    const result = await checkRateLimit(redis, 'id', customTier);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(100);
    expect(result.remaining).toBe(49);
    expect(result.resetMs).toBe(30_000);
    expect(redis.__pipeline.pexpire).toHaveBeenCalledWith('ratelimit:id:30000', 30_000);
  });

  it('reads the current count from the zcard result at index 1', async () => {
    const pipeline = createMockPipeline([
      [null, 'ignored'], // index 0: zremrangebyscore result
      [null, 59], // index 1: zcard result (one below limit)
      [null, 'ignored'], // index 2: zadd result
      [null, 'ignored'], // index 3: pexpire result
    ]);
    const redis = createMockRedis(pipeline);

    const result = await checkRateLimit(redis, 'id', tier);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0); // 60 - 59 - 1
  });
});

// ---------------------------------------------------------------------------
// setRateLimitHeaders
// ---------------------------------------------------------------------------

describe('setRateLimitHeaders', () => {
  it('sets all four IETF rate limit headers', async () => {
    const app = new Hono();
    app.get('/test', (c) => {
      setRateLimitHeaders(c, {
        allowed: true,
        limit: 300,
        remaining: 295,
        resetMs: 60_000,
      });
      return c.json({ ok: true });
    });

    const res = await app.request('/test');
    expect(res.headers.get('X-RateLimit-Limit')).toBe('300');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('295');
    expect(res.headers.get('X-RateLimit-Reset')).toBe('60');
    expect(res.headers.get('RateLimit-Policy')).toBe('300;w=60');
  });

  it('rounds reset seconds up for non-round window durations', async () => {
    const app = new Hono();
    app.get('/test', (c) => {
      setRateLimitHeaders(c, {
        allowed: true,
        limit: 100,
        remaining: 50,
        resetMs: 45_500, // 45.5 seconds -> ceil to 46
      });
      return c.json({ ok: true });
    });

    const res = await app.request('/test');
    expect(res.headers.get('X-RateLimit-Reset')).toBe('46');
    expect(res.headers.get('RateLimit-Policy')).toBe('100;w=46');
  });

  it('sets headers correctly when remaining is zero', async () => {
    const app = new Hono();
    app.get('/test', (c) => {
      setRateLimitHeaders(c, {
        allowed: false,
        limit: 60,
        remaining: 0,
        resetMs: 60_000,
      });
      return c.json({ ok: true });
    });

    const res = await app.request('/test');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res.headers.get('X-RateLimit-Limit')).toBe('60');
  });

  it('formats the RateLimit-Policy header as limit;w=seconds', async () => {
    const app = new Hono();
    app.get('/test', (c) => {
      setRateLimitHeaders(c, {
        allowed: true,
        limit: 1000,
        remaining: 999,
        resetMs: 120_000,
      });
      return c.json({ ok: true });
    });

    const res = await app.request('/test');
    expect(res.headers.get('RateLimit-Policy')).toBe('1000;w=120');
  });

  it('converts milliseconds to whole seconds for X-RateLimit-Reset', async () => {
    const app = new Hono();
    app.get('/test', (c) => {
      setRateLimitHeaders(c, {
        allowed: true,
        limit: 60,
        remaining: 59,
        resetMs: 1000,
      });
      return c.json({ ok: true });
    });

    const res = await app.request('/test');
    expect(res.headers.get('X-RateLimit-Reset')).toBe('1');
  });
});

// ---------------------------------------------------------------------------
// RATE_LIMIT_TIERS
// ---------------------------------------------------------------------------

describe('RATE_LIMIT_TIERS', () => {
  it('defines all four tiers', () => {
    expect(RATE_LIMIT_TIERS).toHaveProperty('anonymous');
    expect(RATE_LIMIT_TIERS).toHaveProperty('authenticated');
    expect(RATE_LIMIT_TIERS).toHaveProperty('service');
    expect(RATE_LIMIT_TIERS).toHaveProperty('admin');
  });

  it('sets anonymous to 60 requests per minute', () => {
    const tier = RATE_LIMIT_TIERS.anonymous;
    expect(tier?.requestsPerMinute).toBe(60);
    expect(tier?.windowMs).toBe(60_000);
  });

  it('sets authenticated to 300 requests per minute', () => {
    const tier = RATE_LIMIT_TIERS.authenticated;
    expect(tier?.requestsPerMinute).toBe(300);
    expect(tier?.windowMs).toBe(60_000);
  });

  it('sets service to 1000 requests per minute', () => {
    const tier = RATE_LIMIT_TIERS.service;
    expect(tier?.requestsPerMinute).toBe(1000);
    expect(tier?.windowMs).toBe(60_000);
  });

  it('sets admin to 5000 requests per minute', () => {
    const tier = RATE_LIMIT_TIERS.admin;
    expect(tier?.requestsPerMinute).toBe(5000);
    expect(tier?.windowMs).toBe(60_000);
  });

  it('has ascending request limits: anonymous < authenticated < service < admin', () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const anon = RATE_LIMIT_TIERS.anonymous!.requestsPerMinute;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const auth = RATE_LIMIT_TIERS.authenticated!.requestsPerMinute;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const svc = RATE_LIMIT_TIERS.service!.requestsPerMinute;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const admin = RATE_LIMIT_TIERS.admin!.requestsPerMinute;

    expect(anon).toBeLessThan(auth);
    expect(auth).toBeLessThan(svc);
    expect(svc).toBeLessThan(admin);
  });

  it('uses a 60-second window for all tiers', () => {
    for (const tier of Object.values(RATE_LIMIT_TIERS)) {
      expect(tier.windowMs).toBe(60_000);
    }
  });
});

// ---------------------------------------------------------------------------
// createRateLimiter (middleware integration)
// ---------------------------------------------------------------------------

describe('createRateLimiter', () => {
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('allows requests under the rate limit and returns 200', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 5],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);
    const app = createTestApp(redis, { logger: mockLogger });

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('54');
  });

  it('returns 429 with RateLimitExceeded error when limit is exceeded', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 60],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);
    const app = createTestApp(redis, { logger: mockLogger });

    const res = await app.request('/test');

    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('RateLimitExceeded');
    expect(body.message).toContain('60 seconds');
  });

  it('logs a warning when rate limit is exceeded', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 60],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);
    const app = createTestApp(redis, { logger: mockLogger });

    await app.request('/test');

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Rate limit exceeded',
      expect.objectContaining({ tier: 'anonymous', limit: 60 }),
    );
  });

  it('includes the identifier in the rate-exceeded log entry', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 300],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);
    const app = createTestApp(redis, {
      logger: mockLogger,
      auth: { did: 'did:plc:user1' },
    });

    await app.request('/test');

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Rate limit exceeded',
      expect.objectContaining({ identifier: 'did:plc:user1' }),
    );
  });

  it('uses authenticated tier (300/min) for users with DID', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 200],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);
    const app = createTestApp(redis, {
      logger: mockLogger,
      auth: { did: 'did:plc:user1', authenticated: true },
    });

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('300');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('99'); // 300 - 200 - 1
  });

  it('uses service tier (1000/min) for service role', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 500],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);
    const app = createTestApp(redis, {
      logger: mockLogger,
      auth: { did: 'did:plc:svc1', role: 'service' },
    });

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('1000');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('499'); // 1000 - 500 - 1
  });

  it('applies rate limiting to admin tier with 5000/min limit', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 100],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);
    const app = createTestApp(redis, {
      logger: mockLogger,
      auth: { did: 'did:plc:admin1', role: 'admin' },
    });

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    // Admin tier goes through rate limiting with 5000/min
    expect(redis.pipeline).toHaveBeenCalled();
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5000');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('4899'); // 5000 - 100 - 1
  });

  it('denies admin requests when the 5000/min limit is exceeded', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 5000],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);
    const app = createTestApp(redis, {
      logger: mockLogger,
      auth: { did: 'did:plc:admin1', role: 'admin' },
    });

    const res = await app.request('/test');

    expect(res.status).toBe(429);
  });

  it('sets rate limit headers for admin requests', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 10],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);
    const app = createTestApp(redis, {
      logger: mockLogger,
      auth: { did: 'did:plc:admin1', role: 'admin' },
    });

    const res = await app.request('/test');

    expect(res.headers.get('X-RateLimit-Limit')).toBe('5000');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('4989');
  });

  it('sets all four IETF headers on allowed requests', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 10],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);
    const app = createTestApp(redis, { logger: mockLogger });

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('49');
    expect(res.headers.get('X-RateLimit-Reset')).toBe('60');
    expect(res.headers.get('RateLimit-Policy')).toBe('60;w=60');
  });

  it('uses the DID-based Redis key for authenticated requests', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 10],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);
    const app = createTestApp(redis, {
      logger: mockLogger,
      auth: { did: 'did:plc:user1' },
    });

    await app.request('/test');

    expect(redis.__pipeline.zremrangebyscore).toHaveBeenCalledWith(
      expect.stringContaining('did:plc:user1'),
      '-inf',
      expect.any(String),
    );
  });

  it('does not call the downstream handler when rate limit is exceeded', async () => {
    const pipeline = createMockPipeline([
      [null, 0],
      [null, 60],
      [null, 1],
      [null, 1],
    ]);
    const redis = createMockRedis(pipeline);
    let handlerCalled = false;

    const app = new Hono<TestEnv>();
    app.use('*', async (c, next) => {
      c.set('auth', { did: null, authenticated: false });
      await next();
    });
    app.use('*', createRateLimiter({ redis, logger: mockLogger }));
    app.get('/test', (c) => {
      handlerCalled = true;
      return c.json({ ok: true });
    });

    await app.request('/test');

    expect(handlerCalled).toBe(false);
  });

  describe('fail-open mode (default)', () => {
    it('allows requests when Redis throws an error', async () => {
      const redis = createFailingRedis();
      const app = createTestApp(redis, { failOpen: true, logger: mockLogger });

      const res = await app.request('/test');

      expect(res.status).toBe(200);
    });

    it('logs the error with failOpen: true', async () => {
      const redis = createFailingRedis();
      const app = createTestApp(redis, { failOpen: true, logger: mockLogger });

      await app.request('/test');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Rate limit check failed',
        expect.objectContaining({ failOpen: true }),
      );
    });

    it('includes the error message in the log entry', async () => {
      const redis = createFailingRedis();
      const app = createTestApp(redis, { failOpen: true, logger: mockLogger });

      await app.request('/test');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Rate limit check failed',
        expect.objectContaining({ error: 'Redis connection refused' }),
      );
    });

    it('is the default when failOpen is not specified', async () => {
      const redis = createFailingRedis();
      const app = createTestApp(redis, { logger: mockLogger });

      const res = await app.request('/test');

      expect(res.status).toBe(200);
    });
  });

  describe('fail-closed mode', () => {
    it('returns 503 when Redis throws an error', async () => {
      const redis = createFailingRedis();
      const app = createTestApp(redis, { failOpen: false, logger: mockLogger });

      const res = await app.request('/test');

      expect(res.status).toBe(503);
      const body = (await res.json()) as { error: string; message: string };
      expect(body.error).toBe('ServiceUnavailable');
      expect(body.message).toBe('Rate limiting service unavailable');
    });

    it('logs the error with failOpen: false', async () => {
      const redis = createFailingRedis();
      const app = createTestApp(redis, { failOpen: false, logger: mockLogger });

      await app.request('/test');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Rate limit check failed',
        expect.objectContaining({ failOpen: false }),
      );
    });

    it('does not call the downstream handler', async () => {
      const redis = createFailingRedis();
      let handlerCalled = false;

      const app = new Hono<TestEnv>();
      app.use('*', async (c, next) => {
        c.set('auth', { did: null, authenticated: false });
        await next();
      });
      app.use('*', createRateLimiter({ redis, failOpen: false, logger: mockLogger }));
      app.get('/test', (c) => {
        handlerCalled = true;
        return c.json({ ok: true });
      });

      await app.request('/test');

      expect(handlerCalled).toBe(false);
    });
  });

  it('handles non-Error exceptions in the catch block', async () => {
    const pipeline = {
      zremrangebyscore: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      zadd: vi.fn().mockReturnThis(),
      pexpire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockRejectedValue('string-error'),
    };
    const redis = {
      pipeline: vi.fn(() => pipeline),
    } as unknown as import('ioredis').Redis;

    const app = createTestApp(redis, { failOpen: true, logger: mockLogger });
    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Rate limit check failed',
      expect.objectContaining({ error: 'string-error' }),
    );
  });
});

// ---------------------------------------------------------------------------
// rateLimiter (no-op middleware)
// ---------------------------------------------------------------------------

describe('rateLimiter', () => {
  it('returns a middleware that always calls the next handler', async () => {
    const app = new Hono();
    app.use('*', rateLimiter());
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('does not set any rate limit headers', async () => {
    const app = new Hono();
    app.use('*', rateLimiter());
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test');

    expect(res.headers.get('X-RateLimit-Limit')).toBeNull();
    expect(res.headers.get('X-RateLimit-Remaining')).toBeNull();
    expect(res.headers.get('X-RateLimit-Reset')).toBeNull();
    expect(res.headers.get('RateLimit-Policy')).toBeNull();
  });

  it('does not require a Redis connection', () => {
    expect(() => rateLimiter()).not.toThrow();
  });

  it('works with POST and other HTTP methods', async () => {
    const app = new Hono();
    app.use('*', rateLimiter());
    app.post('/test', (c) => c.json({ created: true }, 201));

    const req = new Request('http://localhost/test', { method: 'POST' });
    const res = await app.request(req);

    expect(res.status).toBe(201);
  });
});
