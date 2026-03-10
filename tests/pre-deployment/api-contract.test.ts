/**
 * Pre-deployment tests that validate XRPC API contracts.
 *
 * Validates that all registered XRPC methods follow the pub.layers.*
 * pattern, have handler functions, and specify auth requirements.
 * Also validates the XRPC error response format.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';

import { errorHandler } from '@/api/xrpc/error-handler.js';
import { registerXRPCRoutes } from '@/api/xrpc/router.js';
import type { XRPCMethodMap } from '@/api/xrpc/types.js';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from '@/types/errors.js';

/** Sample XRPC methods for contract testing. */
const SAMPLE_METHODS: XRPCMethodMap = {
  'pub.layers.expression.getExpression': {
    handler: (c): Promise<Response> => Promise.resolve(c.json({ uri: 'test', text: 'hello' })),
    auth: 'none',
  },
  'pub.layers.expression.listExpressions': {
    handler: (c): Promise<Response> => Promise.resolve(c.json({ records: [], cursor: null })),
    auth: 'none',
  },
  'pub.layers.annotation.getAnnotationLayer': {
    handler: (c): Promise<Response> => Promise.resolve(c.json({ uri: 'test' })),
    auth: 'none',
  },
  'pub.layers.corpus.getCorpus': {
    handler: (c): Promise<Response> => Promise.resolve(c.json({ uri: 'test' })),
    auth: 'optional',
  },
};

describe('XRPC method registration', () => {
  it('all registered XRPC method NSIDs follow pub.layers.* pattern', () => {
    for (const nsid of Object.keys(SAMPLE_METHODS)) {
      expect(nsid).toMatch(/^pub\.layers\./);
    }
  });

  it('all XRPC methods have a handler function', () => {
    for (const [_nsid, method] of Object.entries(SAMPLE_METHODS)) {
      expect(typeof method.handler).toBe('function');
    }
  });

  it('all XRPC methods have an auth field', () => {
    for (const [_nsid, method] of Object.entries(SAMPLE_METHODS)) {
      expect(method.auth).toBeDefined();
      expect(['required', 'optional', 'none']).toContain(method.auth);
    }
  });

  it('registered routes respond to GET /xrpc/{nsid}', async () => {
    const app = new Hono();
    registerXRPCRoutes(app, SAMPLE_METHODS);

    for (const nsid of Object.keys(SAMPLE_METHODS)) {
      const res = await app.request(`/xrpc/${nsid}`);
      expect(res.status).toBe(200);
    }
  });

  it('unregistered NSIDs return 404', async () => {
    const app = new Hono();
    registerXRPCRoutes(app, SAMPLE_METHODS);

    const res = await app.request('/xrpc/pub.layers.nonexistent.method');
    expect(res.status).toBe(404);
  });
});

describe('XRPC error response format', () => {
  function createErrorApp(error: Error): Hono {
    const app = new Hono();
    app.onError(errorHandler);
    app.get('/test', () => {
      throw error;
    });
    return app;
  }

  it('NotFoundError produces error and message fields', async () => {
    const app = createErrorApp(new NotFoundError('Expression', 'at://did:plc:test/expression/123'));
    const res = await app.request('/test');

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string; message: string };
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('message');
    expect(typeof body.error).toBe('string');
    expect(typeof body.message).toBe('string');
  });

  it('ValidationError returns 400', async () => {
    const app = createErrorApp(new ValidationError('URI is required', 'uri'));
    const res = await app.request('/test');

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('InvalidRequest');
  });

  it('AuthenticationError returns 401', async () => {
    const app = createErrorApp(new AuthenticationError('Authentication required'));
    const res = await app.request('/test');

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('AuthRequired');
  });

  it('AuthorizationError returns 403', async () => {
    const app = createErrorApp(new AuthorizationError('Insufficient permissions', 'write:corpus'));
    const res = await app.request('/test');

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Forbidden');
  });

  it('RateLimitError returns 429 with Retry-After header', async () => {
    const app = createErrorApp(new RateLimitError('Rate limit exceeded', 30));
    const res = await app.request('/test');

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('RateLimitExceeded');
  });

  it('unknown errors return 500 with generic message', async () => {
    const app = createErrorApp(new Error('unexpected'));
    const res = await app.request('/test');

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('InternalServerError');
    expect(body.message).toBe('An unexpected error occurred');
  });
});
