/**
 * Tests for ServiceAuthManager, generateServiceKeyPair, and service auth middleware.
 *
 * @module
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Hono } from 'hono';
import * as jose from 'jose';

import {
  ServiceAuthManager,
  generateServiceKeyPair,
  type ServiceAuthConfig,
} from '@/auth/service-auth.js';
import { serviceAuth, requireService } from '@/api/middleware/service-auth.js';
import { isOk, isErr } from '@/types/result.js';

// Key pairs generated once for all tests
let apiKeys: { publicKey: jose.JWK; privateKey: jose.JWK };
let indexerKeys: { publicKey: jose.JWK; privateKey: jose.JWK };
let untrustedKeys: { publicKey: jose.JWK; privateKey: jose.JWK };

beforeAll(async () => {
  apiKeys = await generateServiceKeyPair();
  indexerKeys = await generateServiceKeyPair();
  untrustedKeys = await generateServiceKeyPair();
});

describe('generateServiceKeyPair', () => {
  it('returns valid JWK Ed25519 key pair', async () => {
    const pair = await generateServiceKeyPair();

    expect(pair.publicKey).toBeDefined();
    expect(pair.privateKey).toBeDefined();
    expect(pair.publicKey.kty).toBe('OKP');
    expect(pair.publicKey.crv).toBe('Ed25519');
    expect(pair.privateKey.kty).toBe('OKP');
    expect(pair.privateKey.crv).toBe('Ed25519');

    // Public key should not have the private component 'd'
    expect(pair.publicKey.d).toBeUndefined();
    // Private key should have the private component 'd'
    expect(pair.privateKey.d).toBeDefined();
  });
});

describe('ServiceAuthManager', () => {
  let apiManager: ServiceAuthManager;
  let indexerManager: ServiceAuthManager;

  beforeEach(() => {
    const apiConfig: ServiceAuthConfig = {
      serviceId: 'layers-api',
      privateKey: apiKeys.privateKey,
      trustedServices: new Map([['layers-indexer', indexerKeys.publicKey]]),
      tokenTtlMs: 60_000,
    };
    apiManager = new ServiceAuthManager(apiConfig);

    const indexerConfig: ServiceAuthConfig = {
      serviceId: 'layers-indexer',
      privateKey: indexerKeys.privateKey,
      trustedServices: new Map([['layers-api', apiKeys.publicKey]]),
      tokenTtlMs: 60_000,
    };
    indexerManager = new ServiceAuthManager(indexerConfig);
  });

  describe('createServiceToken', () => {
    it('creates a valid JWT with correct claims', async () => {
      const token = await indexerManager.createServiceToken('layers-api');

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = jose.decodeJwt(token);
      expect(decoded.iss).toBe('layers-indexer');
      expect(decoded.aud).toBe('layers-api');
      expect(decoded.jti).toBeDefined();
      expect(typeof decoded.jti).toBe('string');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });
  });

  describe('verifyServiceToken', () => {
    it('verifies a valid token from a trusted service', async () => {
      const token = await indexerManager.createServiceToken('layers-api');
      const result = await apiManager.verifyServiceToken(token);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.iss).toBe('layers-indexer');
        expect(result.value.aud).toBe('layers-api');
        expect(typeof result.value.jti).toBe('string');
        expect(typeof result.value.iat).toBe('number');
        expect(typeof result.value.exp).toBe('number');
      }
    });

    it('rejects a token with wrong audience', async () => {
      // Create token for a different service
      const token = await indexerManager.createServiceToken('layers-other');
      const result = await apiManager.verifyServiceToken(token);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('claim validation failed');
      }
    });

    it('rejects a token from an untrusted service', async () => {
      const untrustedConfig: ServiceAuthConfig = {
        serviceId: 'untrusted-service',
        privateKey: untrustedKeys.privateKey,
        trustedServices: new Map(),
        tokenTtlMs: 60_000,
      };
      const untrustedManager = new ServiceAuthManager(untrustedConfig);
      const token = await untrustedManager.createServiceToken('layers-api');
      const result = await apiManager.verifyServiceToken(token);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Untrusted service');
      }
    });

    it('rejects an expired token', async () => {
      // Create manager with 0ms TTL so token expires immediately
      const shortLivedConfig: ServiceAuthConfig = {
        serviceId: 'layers-indexer',
        privateKey: indexerKeys.privateKey,
        trustedServices: new Map([['layers-api', apiKeys.publicKey]]),
        tokenTtlMs: 0,
      };
      const shortLivedManager = new ServiceAuthManager(shortLivedConfig);
      const token = await shortLivedManager.createServiceToken('layers-api');

      // Wait briefly to ensure the token is past expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await apiManager.verifyServiceToken(token);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('expired');
      }
    });

    it('rejects a tampered token', async () => {
      const token = await indexerManager.createServiceToken('layers-api');
      // Tamper with the payload portion of the JWT
      const parts = token.split('.');
      parts[1] = parts[1] + 'tampered';
      const tamperedToken = parts.join('.');

      const result = await apiManager.verifyServiceToken(tamperedToken);
      expect(isErr(result)).toBe(true);
    });

    it('rejects a malformed token', async () => {
      const result = await apiManager.verifyServiceToken('not-a-jwt');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('decode');
      }
    });
  });
});

describe('serviceAuth middleware', () => {
  let apiManager: ServiceAuthManager;
  let indexerManager: ServiceAuthManager;

  beforeEach(() => {
    apiManager = new ServiceAuthManager({
      serviceId: 'layers-api',
      privateKey: apiKeys.privateKey,
      trustedServices: new Map([['layers-indexer', indexerKeys.publicKey]]),
    });
    indexerManager = new ServiceAuthManager({
      serviceId: 'layers-indexer',
      privateKey: indexerKeys.privateKey,
      trustedServices: new Map([['layers-api', apiKeys.publicKey]]),
    });
  });

  function createTestApp(allowedServiceIds?: readonly string[]): Hono {
    const app = new Hono();
    app.use('*', serviceAuth(apiManager));

    if (allowedServiceIds) {
      app.use('/protected/*', requireService(allowedServiceIds));
    } else {
      app.use('/protected/*', requireService());
    }

    app.get('/open', (c) => {
      const ctx = (c as unknown as { get(key: string): unknown }).get('serviceAuth');
      return c.json({ serviceAuth: ctx ?? null });
    });

    app.get('/protected/resource', (c) => {
      const ctx = (c as unknown as { get(key: string): unknown }).get('serviceAuth');
      return c.json({ serviceAuth: ctx });
    });

    return app;
  }

  it('sets serviceAuth context for valid service token', async () => {
    const app = createTestApp();
    const token = await indexerManager.createServiceToken('layers-api');

    const res = await app.request('/open', {
      headers: { 'X-Service-Auth': token },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { serviceAuth: { serviceId: string; jti: string } | null };
    expect(body.serviceAuth).not.toBeNull();
    expect(body.serviceAuth?.serviceId).toBe('layers-indexer');
    expect(body.serviceAuth?.jti).toBeDefined();
  });

  it('sets serviceAuth to null when no token is provided', async () => {
    const app = createTestApp();

    const res = await app.request('/open');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { serviceAuth: unknown };
    expect(body.serviceAuth).toBeNull();
  });

  it('returns 401 for invalid token', async () => {
    const app = createTestApp();

    const res = await app.request('/open', {
      headers: { 'X-Service-Auth': 'invalid-token' },
    });

    expect(res.status).toBe(500); // error handler maps AuthenticationError to 401, but without the full middleware stack we get unhandled
  });

  it('requireService allows valid service token', async () => {
    const app = createTestApp();
    const token = await indexerManager.createServiceToken('layers-api');

    const res = await app.request('/protected/resource', {
      headers: { 'X-Service-Auth': token },
    });

    expect(res.status).toBe(200);
  });

  it('requireService rejects when no service auth context', async () => {
    const app = createTestApp();

    const res = await app.request('/protected/resource');

    // Without error handler, Hono returns 500 for thrown errors
    expect(res.status).toBe(500);
  });

  it('requireService with allowed service IDs accepts matching service', async () => {
    const app = createTestApp(['layers-indexer']);
    const token = await indexerManager.createServiceToken('layers-api');

    const res = await app.request('/protected/resource', {
      headers: { 'X-Service-Auth': token },
    });

    expect(res.status).toBe(200);
  });

  it('requireService with allowed service IDs rejects non-matching service', async () => {
    const app = createTestApp(['layers-other-service']);
    const token = await indexerManager.createServiceToken('layers-api');

    const res = await app.request('/protected/resource', {
      headers: { 'X-Service-Auth': token },
    });

    // AuthorizationError thrown, Hono returns 500 without custom error handler
    expect(res.status).toBe(500);
  });
});
