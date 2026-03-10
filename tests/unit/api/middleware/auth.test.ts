/**
 * Unit tests for the authentication middleware.
 *
 * @module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';

import {
  authenticate,
  requireAuth,
  requireRole,
  extractBearerToken,
} from '../../../../src/api/middleware/authenticate.js';
import { SessionManager, type SessionManagerConfig } from '../../../../src/auth/session-manager.js';
import type { AuthContext } from '../../../../src/api/middleware/authenticate.js';

// Use vi.hoisted() so mock fns are available inside vi.mock factory (which is hoisted)
const { mockInfo, mockWarn, mockDebug } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
  mockWarn: vi.fn(),
  mockDebug: vi.fn(),
}));

vi.mock('../../../../src/observability/logger.js', () => ({
  createLogger: () => ({
    info: mockInfo,
    warn: mockWarn,
    debug: mockDebug,
    error: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  }),
}));

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getActiveSpan: () => null,
  },
}));

/**
 * Creates a mock Redis client.
 */
function createMockRedis(): import('ioredis').Redis {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  } as unknown as import('ioredis').Redis;
}

const TEST_CONFIG: SessionManagerConfig = {
  jwtSecret: 'test-secret-that-is-at-least-32-characters-long-for-hs256',
  accessTokenTtlMs: 15 * 60 * 1_000,
  refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1_000,
};

/** Hono environment for custom context variables. */
interface TestEnv {
  Variables: {
    auth: AuthContext;
    sessionManager: SessionManager;
  };
}

describe('Auth Middleware', () => {
  let sessionManager: SessionManager;
  let redis: import('ioredis').Redis;

  beforeEach(() => {
    redis = createMockRedis();
    sessionManager = new SessionManager(TEST_CONFIG, redis);
    vi.clearAllMocks();
  });

  describe('extractBearerToken', () => {
    it('returns null when no Authorization header is present', () => {
      const mockContext = {
        req: { header: () => undefined },
      } as unknown as import('hono').Context;
      expect(extractBearerToken(mockContext)).toBeNull();
    });

    it('returns null for non-Bearer authorization', () => {
      const mockContext = {
        req: { header: () => 'Basic dXNlcjpwYXNz' },
      } as unknown as import('hono').Context;
      expect(extractBearerToken(mockContext)).toBeNull();
    });

    it('extracts the token from a valid Bearer header', () => {
      const mockContext = {
        req: { header: () => 'Bearer my-token-123' },
      } as unknown as import('hono').Context;
      expect(extractBearerToken(mockContext)).toBe('my-token-123');
    });

    it('returns null for empty Bearer value', () => {
      const mockContext = {
        req: { header: () => 'Bearer ' },
      } as unknown as import('hono').Context;
      expect(extractBearerToken(mockContext)).toBeNull();
    });
  });

  describe('authenticate() middleware', () => {
    function createTestApp(): Hono<TestEnv> {
      const app = new Hono<TestEnv>();
      app.use('*', async (c, next) => {
        c.set('sessionManager', sessionManager);
        await next();
      });
      app.use('*', authenticate());
      app.get('/test', (c) => {
        const auth = c.get('auth');
        return c.json(auth);
      });
      return app;
    }

    it('sets anonymous context when no token is provided', async () => {
      const app = createTestApp();
      const res = await app.request('/test');
      expect(res.status).toBe(200);
      const body = (await res.json()) as AuthContext;
      expect(body.authenticated).toBe(false);
      expect(body.did).toBeNull();
      expect(body.role).toBe('anonymous');
    });

    it('logs anonymous access at debug level', async () => {
      const app = createTestApp();
      await app.request('/test');
      expect(mockDebug).toHaveBeenCalledWith(
        'Anonymous access',
        expect.objectContaining({ traceId: expect.any(String) }),
      );
    });

    it('sets authenticated context for a valid token', async () => {
      const session = await sessionManager.createSession(
        'did:plc:testuser1',
        'testuser.bsky.social',
        ['read:records', 'write:annotation'],
      );

      const app = createTestApp();
      const res = await app.request('/test', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as AuthContext;
      expect(body.authenticated).toBe(true);
      expect(body.did).toBe('did:plc:testuser1');
      expect(body.handle).toBe('testuser.bsky.social');
    });

    it('logs successful authentication at info level', async () => {
      const session = await sessionManager.createSession(
        'did:plc:testuser1',
        'testuser.bsky.social',
        ['read:records'],
      );

      const app = createTestApp();
      await app.request('/test', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      expect(mockInfo).toHaveBeenCalledWith(
        'Authentication succeeded',
        expect.objectContaining({
          did: 'did:plc:testuser1',
          role: expect.any(String),
          sessionId: session.sessionId,
          traceId: expect.any(String),
        }),
      );
    });

    it('sets anonymous context for an invalid token', async () => {
      const app = createTestApp();
      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer invalid-jwt-token' },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as AuthContext;
      expect(body.authenticated).toBe(false);
    });

    it('logs failed authentication at warn level', async () => {
      const app = createTestApp();
      await app.request('/test', {
        headers: { Authorization: 'Bearer invalid-jwt-token' },
      });

      expect(mockWarn).toHaveBeenCalledWith(
        'Authentication failed',
        expect.objectContaining({
          reason: expect.any(String),
          traceId: expect.any(String),
        }),
      );
    });

    it('sets anonymous context for a revoked session token', async () => {
      const session = await sessionManager.createSession(
        'did:plc:testuser1',
        'testuser.bsky.social',
        ['read:records'],
      );
      vi.mocked(redis.get).mockResolvedValueOnce('1');

      const app = createTestApp();
      const res = await app.request('/test', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as AuthContext;
      expect(body.authenticated).toBe(false);
    });

    it('handles missing sessionManager gracefully', async () => {
      const app = new Hono<TestEnv>();
      app.use('*', authenticate());
      app.get('/test', (c) => {
        const auth = c.get('auth');
        return c.json(auth);
      });

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer some-token' },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as AuthContext;
      expect(body.authenticated).toBe(false);
    });
  });

  describe('requireAuth() middleware', () => {
    function createTestAppWithRequireAuth(): Hono<TestEnv> {
      const app = new Hono<TestEnv>();
      app.use('*', async (c, next) => {
        c.set('sessionManager', sessionManager);
        await next();
      });
      app.use('*', authenticate());

      app.get('/protected', requireAuth(), (c) => {
        return c.json({ ok: true });
      });

      app.onError((err, c) => {
        if (err.message === 'Authentication required') {
          return c.json({ error: err.message }, 401);
        }
        return c.json({ error: 'Internal error' }, 500);
      });

      return app;
    }

    it('allows authenticated requests', async () => {
      const session = await sessionManager.createSession(
        'did:plc:testuser1',
        'testuser.bsky.social',
        ['read:records'],
      );

      const app = createTestAppWithRequireAuth();
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(res.status).toBe(200);
    });

    it('rejects unauthenticated requests with 401', async () => {
      const app = createTestAppWithRequireAuth();
      const res = await app.request('/protected');
      expect(res.status).toBe(401);
    });
  });

  describe('requireRole() middleware', () => {
    function createTestAppWithRequireRole(role: string): Hono<TestEnv> {
      const app = new Hono<TestEnv>();
      app.use('*', async (c, next) => {
        c.set('sessionManager', sessionManager);
        await next();
      });
      app.use('*', authenticate());

      app.get('/admin', requireRole(role), (c) => {
        return c.json({ ok: true });
      });

      app.onError((err, c) => {
        if (err.message === 'Authentication required') {
          return c.json({ error: err.message }, 401);
        }
        if (err.message.includes('Role')) {
          return c.json({ error: err.message }, 403);
        }
        return c.json({ error: 'Internal error' }, 500);
      });

      return app;
    }

    it('allows requests with sufficient role', async () => {
      const session = await sessionManager.createSession(
        'did:plc:testuser1',
        'testuser.bsky.social',
        ['admin:dlq'],
      );

      const app = createTestAppWithRequireRole('admin');
      const res = await app.request('/admin', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(res.status).toBe(200);
    });

    it('rejects requests with insufficient role', async () => {
      const session = await sessionManager.createSession(
        'did:plc:testuser1',
        'testuser.bsky.social',
        ['read:records'],
      );

      const app = createTestAppWithRequireRole('admin');
      const res = await app.request('/admin', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('logs authorization failure at warn level', async () => {
      const session = await sessionManager.createSession(
        'did:plc:testuser1',
        'testuser.bsky.social',
        ['read:records'],
      );

      const app = createTestAppWithRequireRole('admin');
      await app.request('/admin', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      expect(mockWarn).toHaveBeenCalledWith(
        'Authorization failed',
        expect.objectContaining({
          did: 'did:plc:testuser1',
          requiredRole: 'admin',
          currentRole: expect.any(String),
          traceId: expect.any(String),
        }),
      );
    });

    it('rejects unauthenticated requests with 401', async () => {
      const app = createTestAppWithRequireRole('viewer');
      const res = await app.request('/admin');
      expect(res.status).toBe(401);
    });
  });
});
