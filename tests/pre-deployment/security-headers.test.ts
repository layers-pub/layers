/**
 * Pre-deployment tests that validate security headers on responses.
 *
 * Tests run against the Hono app with the full middleware stack applied
 * using app.request(). Validates that standard security headers (HSTS,
 * X-Frame-Options, X-Content-Type-Options) are present, CORS headers
 * are configured correctly, and rate limit headers appear on XRPC responses.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';

import { secureHeaders } from '@/api/middleware/secure-headers.js';
import { corsMiddleware } from '@/api/middleware/cors.js';
import { setRateLimitHeaders, type RateLimitResult } from '@/api/middleware/rate-limiter.js';

describe('Security headers', () => {
  function createAppWithSecureHeaders(): Hono {
    const app = new Hono();
    app.use('*', secureHeaders());
    app.get('/test', (c) => c.json({ ok: true }));
    return app;
  }

  it('includes X-Content-Type-Options: nosniff', async () => {
    const app = createAppWithSecureHeaders();
    const res = await app.request('/test');

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('includes X-Frame-Options: DENY', async () => {
    const app = createAppWithSecureHeaders();
    const res = await app.request('/test');

    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('includes Strict-Transport-Security header', async () => {
    const app = createAppWithSecureHeaders();
    const res = await app.request('/test');

    const hsts = res.headers.get('Strict-Transport-Security');
    expect(hsts).toBeDefined();
    expect(hsts).toContain('max-age=');
    expect(hsts).toContain('includeSubDomains');
  });

  it('includes Content-Security-Policy header', async () => {
    const app = createAppWithSecureHeaders();
    const res = await app.request('/test');

    const csp = res.headers.get('Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
  });

  it('includes Referrer-Policy header', async () => {
    const app = createAppWithSecureHeaders();
    const res = await app.request('/test');

    const rp = res.headers.get('Referrer-Policy');
    expect(rp).toBeDefined();
    expect(rp).toBe('strict-origin-when-cross-origin');
  });
});

describe('CORS headers', () => {
  it('sets CORS headers for wildcard origin', async () => {
    const app = new Hono();
    app.use('*', corsMiddleware(['*']));
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: { Origin: 'https://example.com' },
    });

    const acao = res.headers.get('Access-Control-Allow-Origin');
    expect(acao).toBe('*');
  });

  it('sets CORS headers for configured specific origin', async () => {
    const app = new Hono();
    app.use('*', corsMiddleware(['https://layers.pub']));
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: { Origin: 'https://layers.pub' },
    });

    const acao = res.headers.get('Access-Control-Allow-Origin');
    expect(acao).toBe('https://layers.pub');
  });

  it('does not set CORS for disallowed origin', async () => {
    const app = new Hono();
    app.use('*', corsMiddleware(['https://layers.pub']));
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: { Origin: 'https://evil.com' },
    });

    const acao = res.headers.get('Access-Control-Allow-Origin');
    // Hono's CORS middleware does not set the header for disallowed origins
    expect(acao === null || acao !== 'https://evil.com').toBe(true);
  });
});

describe('Rate limit headers', () => {
  it('rate limit headers are present on rate-limited responses', async () => {
    const app = new Hono();
    app.get('/test', (c) => {
      const rateLimitResult: RateLimitResult = {
        allowed: true,
        limit: 300,
        remaining: 299,
        resetMs: 60_000,
      };
      setRateLimitHeaders(c, rateLimitResult);
      return c.json({ ok: true });
    });

    const res = await app.request('/test');
    expect(res.headers.get('X-RateLimit-Limit')).toBe('300');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('299');
    expect(res.headers.get('X-RateLimit-Reset')).toBe('60');
    expect(res.headers.get('RateLimit-Policy')).toBe('300;w=60');
  });

  it('rate limit headers include correct policy format', async () => {
    const app = new Hono();
    app.get('/test', (c) => {
      const rateLimitResult: RateLimitResult = {
        allowed: true,
        limit: 60,
        remaining: 42,
        resetMs: 60_000,
      };
      setRateLimitHeaders(c, rateLimitResult);
      return c.json({ ok: true });
    });

    const res = await app.request('/test');
    const policy = res.headers.get('RateLimit-Policy');
    expect(policy).toMatch(/^\d+;w=\d+$/);
  });
});

describe('Combined middleware stack', () => {
  it('security headers are present on all responses through the stack', async () => {
    const app = new Hono();
    app.use('*', secureHeaders());
    app.use('*', corsMiddleware(['*']));
    app.get('/xrpc/pub.layers.expression.getExpression', (c) =>
      c.json({ uri: 'test', text: 'hello' }),
    );

    const res = await app.request('/xrpc/pub.layers.expression.getExpression', {
      headers: { Origin: 'https://layers.pub' },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=');
  });
});
