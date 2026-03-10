/**
 * Tests for Redis-backed OAuth state and session stores.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RedisSessionStore,
  RedisStateStore,
  SESSION_KEY_PREFIX,
  SESSION_TTL_SECONDS,
  STATE_KEY_PREFIX,
  STATE_TTL_SECONDS,
} from '../../../src/auth/oauth-stores.js';

/**
 * Creates a mock Redis client with `get`, `set`, and `del` as vi.fn() stubs.
 */
function createMockRedis() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };
}

describe('RedisStateStore', () => {
  let redis: ReturnType<typeof createMockRedis>;
  let store: RedisStateStore;

  const testKey = 'test-state-key';
  const testState = {
    dpopJwk: { kty: 'EC' as const, crv: 'P-256', x: 'abc', y: 'def' },
    iss: 'https://pds.example.com',
    verifier: 'pkce-verifier-123',
    appState: 'csrf-token-456',
  };

  beforeEach(() => {
    redis = createMockRedis();
    // RedisStateStore only uses get/set/del, which the mock provides
    store = new RedisStateStore(redis as never);
  });

  describe('set', () => {
    it('stores state with the correct key prefix and TTL', async () => {
      redis.set.mockResolvedValueOnce('OK');

      await store.set(testKey, testState as never);

      expect(redis.set).toHaveBeenCalledWith(
        `${STATE_KEY_PREFIX}${testKey}`,
        JSON.stringify(testState),
        'EX',
        STATE_TTL_SECONDS,
      );
    });

    it('uses a 10-minute TTL', () => {
      expect(STATE_TTL_SECONDS).toBe(600);
    });
  });

  describe('get', () => {
    it('returns the stored state for a valid key', async () => {
      redis.get.mockResolvedValueOnce(JSON.stringify(testState));

      const result = await store.get(testKey);

      expect(redis.get).toHaveBeenCalledWith(`${STATE_KEY_PREFIX}${testKey}`);
      expect(result).toEqual(testState);
    });

    it('returns undefined for a missing key', async () => {
      redis.get.mockResolvedValueOnce(null);

      const result = await store.get('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('del', () => {
    it('deletes the key with the correct prefix', async () => {
      redis.del.mockResolvedValueOnce(1);

      await store.del(testKey);

      expect(redis.del).toHaveBeenCalledWith(`${STATE_KEY_PREFIX}${testKey}`);
    });
  });
});

describe('RedisSessionStore', () => {
  let redis: ReturnType<typeof createMockRedis>;
  let store: RedisSessionStore;

  const testSub = 'did:plc:testuser123';
  const testSession = {
    dpopJwk: { kty: 'EC' as const, crv: 'P-256', x: 'ghi', y: 'jkl' },
    tokenSet: {
      access_token: 'at-token',
      refresh_token: 'rt-token',
      token_type: 'DPoP',
      expires_at: '2026-12-31T23:59:59Z',
    },
  };

  beforeEach(() => {
    redis = createMockRedis();
    store = new RedisSessionStore(redis as never);
  });

  describe('set', () => {
    it('stores session with the correct key prefix and TTL', async () => {
      redis.set.mockResolvedValueOnce('OK');

      await store.set(testSub, testSession as never);

      expect(redis.set).toHaveBeenCalledWith(
        `${SESSION_KEY_PREFIX}${testSub}`,
        JSON.stringify(testSession),
        'EX',
        SESSION_TTL_SECONDS,
      );
    });

    it('uses a 30-day TTL', () => {
      expect(SESSION_TTL_SECONDS).toBe(30 * 24 * 60 * 60);
    });
  });

  describe('get', () => {
    it('returns the stored session for a valid sub', async () => {
      redis.get.mockResolvedValueOnce(JSON.stringify(testSession));

      const result = await store.get(testSub);

      expect(redis.get).toHaveBeenCalledWith(`${SESSION_KEY_PREFIX}${testSub}`);
      expect(result).toEqual(testSession);
    });

    it('returns undefined for a missing sub', async () => {
      redis.get.mockResolvedValueOnce(null);

      const result = await store.get('did:plc:nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('del', () => {
    it('deletes the session with the correct prefix', async () => {
      redis.del.mockResolvedValueOnce(1);

      await store.del(testSub);

      expect(redis.del).toHaveBeenCalledWith(`${SESSION_KEY_PREFIX}${testSub}`);
    });
  });
});
