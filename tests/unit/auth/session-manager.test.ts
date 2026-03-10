/**
 * Unit tests for the SessionManager.
 *
 * @module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SessionManager, type SessionManagerConfig } from '../../../src/auth/session-manager.js';
import {
  SessionRevokedError,
  TokenExpiredError,
  TokenValidationError,
} from '../../../src/auth/errors.js';
import { isOk, isErr } from '../../../src/types/result.js';

/**
 * Creates a mock Redis client with vi.fn() stubs for get, set, and del.
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

describe('SessionManager', () => {
  let manager: SessionManager;
  let redis: import('ioredis').Redis;

  beforeEach(() => {
    redis = createMockRedis();
    manager = new SessionManager(TEST_CONFIG, redis);
  });

  describe('createSession', () => {
    it('returns a token pair with access and refresh tokens', async () => {
      const result = await manager.createSession('did:plc:testuser1', 'testuser.bsky.social', [
        'read:records',
      ]);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(result.familyId).toBeDefined();
      expect(result.accessTokenExpiresAt).toBeGreaterThan(Date.now());
      expect(result.refreshTokenExpiresAt).toBeGreaterThan(result.accessTokenExpiresAt);
    });

    it('generates unique session IDs for each session', async () => {
      const session1 = await manager.createSession('did:plc:user1', 'user1', ['read:records']);
      const session2 = await manager.createSession('did:plc:user2', 'user2', ['read:records']);

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });

    it('generates unique family IDs for each session', async () => {
      const session1 = await manager.createSession('did:plc:user1', 'user1', ['read:records']);
      const session2 = await manager.createSession('did:plc:user2', 'user2', ['read:records']);

      expect(session1.familyId).not.toBe(session2.familyId);
    });

    it('produces distinct access and refresh tokens', async () => {
      const result = await manager.createSession('did:plc:user1', 'user1', ['read:records']);
      expect(result.accessToken).not.toBe(result.refreshToken);
    });

    it('stores the active session for the family in Redis', async () => {
      const result = await manager.createSession('did:plc:user1', 'user1', ['read:records']);

      expect(redis.set).toHaveBeenCalledWith(
        `layers:auth:family-active-session:${result.familyId}`,
        result.sessionId,
        'EX',
        expect.any(Number),
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('verifies a valid access token and returns the payload', async () => {
      const session = await manager.createSession('did:plc:testuser1', 'testuser.bsky.social', [
        'read:records',
        'write:annotation',
      ]);

      const result = await manager.verifyAccessToken(session.accessToken);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.sub).toBe('did:plc:testuser1');
        expect(result.value.handle).toBe('testuser.bsky.social');
        expect(result.value.sessionId).toBe(session.sessionId);
        expect(result.value.familyId).toBe(session.familyId);
        expect(result.value.scope).toEqual(['read:records', 'write:annotation']);
      }
    });

    it('rejects an invalid token', async () => {
      const result = await manager.verifyAccessToken('not-a-valid-jwt');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(TokenValidationError);
      }
    });

    it('rejects a refresh token used as an access token', async () => {
      const session = await manager.createSession('did:plc:user1', 'user1', ['read:records']);
      const result = await manager.verifyAccessToken(session.refreshToken);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(TokenValidationError);
        expect(result.error.message).toContain('Expected access token');
      }
    });

    it('rejects a token signed with a different secret', async () => {
      const otherManager = new SessionManager(
        { ...TEST_CONFIG, jwtSecret: 'other-secret-that-is-at-least-32-characters-long' },
        redis,
      );
      const session = await otherManager.createSession('did:plc:user1', 'user1', ['read:records']);
      const result = await manager.verifyAccessToken(session.accessToken);
      expect(isErr(result)).toBe(true);
    });

    it('rejects a revoked session', async () => {
      const session = await manager.createSession('did:plc:user1', 'user1', ['read:records']);
      vi.mocked(redis.get).mockResolvedValueOnce('1');

      const result = await manager.verifyAccessToken(session.accessToken);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(SessionRevokedError);
      }
    });

    it('rejects a token from a revoked family', async () => {
      const session = await manager.createSession('did:plc:user1', 'user1', ['read:records']);
      // First call (session check) returns null, second call (family check) returns '1'
      vi.mocked(redis.get).mockResolvedValueOnce(null).mockResolvedValueOnce('1');

      const result = await manager.verifyAccessToken(session.accessToken);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(SessionRevokedError);
        expect(result.error.message).toContain('family');
      }
    });
  });

  describe('verifyRefreshToken', () => {
    it('verifies a valid refresh token', async () => {
      const session = await manager.createSession('did:plc:user1', 'user1', ['read:records']);
      const result = await manager.verifyRefreshToken(session.refreshToken);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.sub).toBe('did:plc:user1');
        expect(result.value.familyId).toBe(session.familyId);
      }
    });

    it('rejects an access token used as a refresh token', async () => {
      const session = await manager.createSession('did:plc:user1', 'user1', ['read:records']);
      const result = await manager.verifyRefreshToken(session.accessToken);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(TokenValidationError);
        expect(result.error.message).toContain('Expected refresh token');
      }
    });

    it('revokes the entire family when a revoked refresh token is reused', async () => {
      const session = await manager.createSession('did:plc:user1', 'user1', ['read:records']);
      // Simulate the session being revoked (replay attack scenario)
      vi.mocked(redis.get).mockResolvedValueOnce('1');

      const result = await manager.verifyRefreshToken(session.refreshToken);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(SessionRevokedError);
        expect(result.error.message).toContain('reuse detected');
      }

      // Verify revokeFamily was called
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('layers:auth:revoked-families:'),
        '1',
        'EX',
        expect.any(Number),
      );
    });
  });

  describe('refreshSession', () => {
    it('issues a new token pair with a new session ID', async () => {
      const original = await manager.createSession('did:plc:user1', 'user1', ['read:records']);
      const result = await manager.refreshSession(original.refreshToken);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.accessToken).toBeDefined();
        expect(result.value.refreshToken).toBeDefined();
        // Session ID changes on refresh (token rotation)
        expect(result.value.sessionId).not.toBe(original.sessionId);
        // Family ID is preserved
        expect(result.value.familyId).toBe(original.familyId);
        expect(result.value.accessTokenExpiresAt).toBeGreaterThan(Date.now() - 1_000);
      }
    });

    it('revokes the old session on refresh', async () => {
      const original = await manager.createSession('did:plc:user1', 'user1', ['read:records']);
      await manager.refreshSession(original.refreshToken);

      // Verify the old session was revoked
      expect(redis.set).toHaveBeenCalledWith(
        `layers:auth:revoked-sessions:${original.sessionId}`,
        '1',
        'EX',
        expect.any(Number),
      );
    });

    it('fails to refresh with an invalid token', async () => {
      const result = await manager.refreshSession('invalid-token');
      expect(isErr(result)).toBe(true);
    });

    it('fails to refresh a revoked session', async () => {
      const original = await manager.createSession('did:plc:user1', 'user1', ['read:records']);
      vi.mocked(redis.get).mockResolvedValueOnce('1');

      const result = await manager.refreshSession(original.refreshToken);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(SessionRevokedError);
      }
    });

    it('preserves scopes from the original session', async () => {
      const scopes = ['read:records', 'write:annotation', 'write:expression'];
      const original = await manager.createSession('did:plc:user1', 'user1', scopes);
      const result = await manager.refreshSession(original.refreshToken);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const verified = await manager.verifyAccessToken(result.value.accessToken);
        expect(isOk(verified)).toBe(true);
        if (isOk(verified)) {
          expect(verified.value.scope).toEqual(scopes);
        }
      }
    });

    it('updates the family active session in Redis', async () => {
      const original = await manager.createSession('did:plc:user1', 'user1', ['read:records']);
      const result = await manager.refreshSession(original.refreshToken);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(redis.set).toHaveBeenCalledWith(
          `layers:auth:family-active-session:${original.familyId}`,
          result.value.sessionId,
          'EX',
          expect.any(Number),
        );
      }
    });

    it('detects replay attack when old refresh token is reused after rotation', async () => {
      const original = await manager.createSession('did:plc:user1', 'user1', ['read:records']);
      const refreshResult = await manager.refreshSession(original.refreshToken);
      expect(isOk(refreshResult)).toBe(true);

      // Now the old session is revoked. Attempting to reuse the original
      // refresh token should trigger family revocation.
      vi.mocked(redis.get).mockResolvedValueOnce('1'); // session is revoked

      const replayResult = await manager.refreshSession(original.refreshToken);
      expect(isErr(replayResult)).toBe(true);
      if (isErr(replayResult)) {
        expect(replayResult.error).toBeInstanceOf(SessionRevokedError);
        expect(replayResult.error.message).toContain('reuse detected');
      }
    });
  });

  describe('revokeSession', () => {
    it('stores the session ID in Redis with a TTL', async () => {
      await manager.revokeSession('session-123');

      expect(redis.set).toHaveBeenCalledWith(
        'layers:auth:revoked-sessions:session-123',
        '1',
        'EX',
        expect.any(Number),
      );
    });
  });

  describe('revokeFamily', () => {
    it('stores the family ID in Redis with a TTL', async () => {
      await manager.revokeFamily('family-abc');

      expect(redis.set).toHaveBeenCalledWith(
        'layers:auth:revoked-families:family-abc',
        '1',
        'EX',
        expect.any(Number),
      );
    });
  });

  describe('isRevoked', () => {
    it('returns false for an active session', async () => {
      vi.mocked(redis.get).mockResolvedValueOnce(null);
      const result = await manager.isRevoked('session-123');
      expect(result).toBe(false);
    });

    it('returns true for a revoked session', async () => {
      vi.mocked(redis.get).mockResolvedValueOnce('1');
      const result = await manager.isRevoked('session-123');
      expect(result).toBe(true);
    });
  });

  describe('isFamilyRevoked', () => {
    it('returns false for an active family', async () => {
      vi.mocked(redis.get).mockResolvedValueOnce(null);
      const result = await manager.isFamilyRevoked('family-abc');
      expect(result).toBe(false);
    });

    it('returns true for a revoked family', async () => {
      vi.mocked(redis.get).mockResolvedValueOnce('1');
      const result = await manager.isFamilyRevoked('family-abc');
      expect(result).toBe(true);
    });
  });

  describe('expired tokens', () => {
    it('rejects an expired access token', async () => {
      const shortLivedManager = new SessionManager({ ...TEST_CONFIG, accessTokenTtlMs: 0 }, redis);

      const session = await shortLivedManager.createSession('did:plc:user1', 'user1', [
        'read:records',
      ]);

      // Token was created with 0ms TTL, so it is already expired
      const result = await shortLivedManager.verifyAccessToken(session.accessToken);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(TokenExpiredError);
      }
    });
  });
});
