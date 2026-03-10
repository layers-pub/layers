/**
 * JWT-based session management with refresh token rotation.
 *
 * Creates, verifies, refreshes, and revokes JWT sessions. Access tokens
 * are short-lived (15 minutes by default) and refresh tokens are longer-lived
 * (7 days by default). Session revocation uses a Redis-backed set.
 *
 * Refresh token rotation assigns a familyId to each session. All tokens
 * in the same session share a familyId. On refresh, a new sessionId is
 * generated but the familyId is preserved. If a revoked refresh token
 * is reused (replay attack), the entire family is revoked.
 *
 * @module
 */

import { randomUUID } from 'node:crypto';

import * as jose from 'jose';
import type { Redis } from 'ioredis';

import { type Result, Err, Ok } from '../types/result.js';
import { SessionRevokedError, TokenExpiredError, TokenValidationError } from './errors.js';

/** Default access token TTL: 15 minutes. */
const DEFAULT_ACCESS_TOKEN_TTL_MS = 15 * 60 * 1_000;

/** Default refresh token TTL: 7 days. */
const DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

/** Redis key prefix for revoked session IDs. */
const REVOKED_SESSIONS_KEY = 'layers:auth:revoked-sessions';

/** Redis key prefix for revoked token families. */
const REVOKED_FAMILIES_KEY = 'layers:auth:revoked-families';

/** Redis key prefix for tracking active refresh token session within a family. */
const FAMILY_ACTIVE_SESSION_KEY = 'layers:auth:family-active-session';

/**
 * Configuration for the session manager.
 */
interface SessionManagerConfig {
  /** Secret key for signing JWTs (minimum 32 characters). */
  readonly jwtSecret: string;
  /** Access token time-to-live in milliseconds. */
  readonly accessTokenTtlMs?: number | undefined;
  /** Refresh token time-to-live in milliseconds. */
  readonly refreshTokenTtlMs?: number | undefined;
}

/**
 * JWT payload for Layers session tokens.
 */
interface SessionPayload {
  /** Subject: the user's DID. */
  readonly sub: string;
  /** The user's ATProto handle. */
  readonly handle: string;
  /** Unique session identifier (changes on each refresh). */
  readonly sessionId: string;
  /** Token family identifier (stable across refreshes). */
  readonly familyId: string;
  /** Granted scopes for this session. */
  readonly scope: readonly string[];
  /** Issued-at timestamp (seconds since epoch). */
  readonly iat: number;
  /** Expiration timestamp (seconds since epoch). */
  readonly exp: number;
}

/**
 * Token pair returned when creating or refreshing a session.
 */
interface TokenPair {
  /** The JWT access token. */
  readonly accessToken: string;
  /** The JWT refresh token. */
  readonly refreshToken: string;
  /** Access token expiration in milliseconds since epoch. */
  readonly accessTokenExpiresAt: number;
  /** Refresh token expiration in milliseconds since epoch. */
  readonly refreshTokenExpiresAt: number;
  /** The session identifier. */
  readonly sessionId: string;
  /** The token family identifier. */
  readonly familyId: string;
}

/**
 * Manages JWT session creation, verification, refresh, and revocation.
 *
 * Uses HS256 for signing. Session IDs are generated via `crypto.randomUUID()`.
 * Revoked sessions are tracked in a Redis set with automatic expiration
 * matching the refresh token TTL.
 *
 * Implements refresh token rotation: each refresh generates a new sessionId
 * while preserving the familyId. Reuse of a revoked refresh token triggers
 * revocation of the entire family.
 */
class SessionManager {
  private readonly secret: Uint8Array;
  private readonly accessTokenTtlMs: number;
  private readonly refreshTokenTtlMs: number;
  private readonly redis: Redis;

  /**
   * @param config - JWT signing configuration
   * @param redis - Redis client for revocation tracking
   */
  constructor(config: SessionManagerConfig, redis: Redis) {
    this.secret = new TextEncoder().encode(config.jwtSecret);
    this.accessTokenTtlMs = config.accessTokenTtlMs ?? DEFAULT_ACCESS_TOKEN_TTL_MS;
    this.refreshTokenTtlMs = config.refreshTokenTtlMs ?? DEFAULT_REFRESH_TOKEN_TTL_MS;
    this.redis = redis;
  }

  /**
   * Creates a new session with access and refresh tokens.
   *
   * Generates a new familyId for the session. All subsequent refreshes
   * will share this familyId.
   *
   * @param did - the user's DID
   * @param handle - the user's ATProto handle
   * @param scope - the scopes granted to this session
   * @returns a token pair containing access and refresh tokens
   */
  async createSession(did: string, handle: string, scope: readonly string[]): Promise<TokenPair> {
    const sessionId = randomUUID();
    const familyId = randomUUID();
    const now = Date.now();

    const accessToken = await this.signToken(
      {
        sub: did,
        handle,
        sessionId,
        familyId,
        scope,
        type: 'access',
      },
      this.accessTokenTtlMs,
    );

    const refreshToken = await this.signToken(
      {
        sub: did,
        handle,
        sessionId,
        familyId,
        scope,
        type: 'refresh',
      },
      this.refreshTokenTtlMs,
    );

    // Track the active session for this family
    const ttlSeconds = Math.ceil(this.refreshTokenTtlMs / 1_000);
    await this.redis.set(`${FAMILY_ACTIVE_SESSION_KEY}:${familyId}`, sessionId, 'EX', ttlSeconds);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: now + this.accessTokenTtlMs,
      refreshTokenExpiresAt: now + this.refreshTokenTtlMs,
      sessionId,
      familyId,
    };
  }

  /**
   * Verifies an access token and returns its payload.
   *
   * Checks the token signature, expiration, session revocation,
   * and family revocation.
   *
   * @param token - the JWT access token to verify
   * @returns the session payload on success, or an auth error
   */
  async verifyAccessToken(
    token: string,
  ): Promise<
    Result<SessionPayload, TokenValidationError | TokenExpiredError | SessionRevokedError>
  > {
    const result = await this.verifyToken(token, 'access');
    if (!result.ok) return result;

    const sessionRevoked = await this.isRevoked(result.value.sessionId);
    if (sessionRevoked) {
      return Err(new SessionRevokedError());
    }

    const familyRevoked = await this.isFamilyRevoked(result.value.familyId);
    if (familyRevoked) {
      return Err(new SessionRevokedError('Token family has been revoked'));
    }

    return result;
  }

  /**
   * Verifies a refresh token and returns its payload.
   *
   * Also checks family-level revocation to detect replay attacks.
   *
   * @param token - the JWT refresh token to verify
   * @returns the session payload on success, or an auth error
   */
  async verifyRefreshToken(
    token: string,
  ): Promise<
    Result<SessionPayload, TokenValidationError | TokenExpiredError | SessionRevokedError>
  > {
    const result = await this.verifyToken(token, 'refresh');
    if (!result.ok) return result;

    const sessionRevoked = await this.isRevoked(result.value.sessionId);
    if (sessionRevoked) {
      // Replay attack detected: a revoked refresh token is being reused.
      // Revoke the entire family to protect all sessions.
      await this.revokeFamily(result.value.familyId);
      return Err(new SessionRevokedError('Refresh token reuse detected, family revoked'));
    }

    const familyRevoked = await this.isFamilyRevoked(result.value.familyId);
    if (familyRevoked) {
      return Err(new SessionRevokedError('Token family has been revoked'));
    }

    return result;
  }

  /**
   * Issues a new token pair from a valid refresh token.
   *
   * Implements refresh token rotation:
   * 1. Verifies the refresh token (including replay detection)
   * 2. Revokes the old session's refresh token
   * 3. Generates a new sessionId (familyId is preserved)
   * 4. Returns the new token pair
   *
   * @param refreshToken - the refresh token to use
   * @returns a new token pair on success, or an auth error
   */
  async refreshSession(
    refreshToken: string,
  ): Promise<Result<TokenPair, TokenValidationError | TokenExpiredError | SessionRevokedError>> {
    const result = await this.verifyRefreshToken(refreshToken);
    if (!result.ok) return result;

    const payload = result.value;

    // Revoke the old session so the old refresh token cannot be reused
    await this.revokeSession(payload.sessionId);

    // Generate a new session ID for the rotated token pair
    const newSessionId = randomUUID();
    const now = Date.now();

    const newAccessToken = await this.signToken(
      {
        sub: payload.sub,
        handle: payload.handle,
        sessionId: newSessionId,
        familyId: payload.familyId,
        scope: payload.scope,
        type: 'access',
      },
      this.accessTokenTtlMs,
    );

    const newRefreshToken = await this.signToken(
      {
        sub: payload.sub,
        handle: payload.handle,
        sessionId: newSessionId,
        familyId: payload.familyId,
        scope: payload.scope,
        type: 'refresh',
      },
      this.refreshTokenTtlMs,
    );

    // Update the active session for this family
    const ttlSeconds = Math.ceil(this.refreshTokenTtlMs / 1_000);
    await this.redis.set(
      `${FAMILY_ACTIVE_SESSION_KEY}:${payload.familyId}`,
      newSessionId,
      'EX',
      ttlSeconds,
    );

    return Ok({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresAt: now + this.accessTokenTtlMs,
      refreshTokenExpiresAt: now + this.refreshTokenTtlMs,
      sessionId: newSessionId,
      familyId: payload.familyId,
    });
  }

  /**
   * Revokes a session by adding its ID to the Redis revocation set.
   *
   * The revocation entry expires after the refresh token TTL, since
   * no tokens for the session can be valid beyond that point.
   *
   * @param sessionId - the session ID to revoke
   */
  async revokeSession(sessionId: string): Promise<void> {
    const ttlSeconds = Math.ceil(this.refreshTokenTtlMs / 1_000);
    await this.redis.set(`${REVOKED_SESSIONS_KEY}:${sessionId}`, '1', 'EX', ttlSeconds);
  }

  /**
   * Revokes an entire token family, invalidating all sessions
   * that share the given familyId.
   *
   * Used when a replay attack is detected (a revoked refresh token
   * is presented for reuse).
   *
   * @param familyId - the family ID to revoke
   */
  async revokeFamily(familyId: string): Promise<void> {
    const ttlSeconds = Math.ceil(this.refreshTokenTtlMs / 1_000);
    await this.redis.set(`${REVOKED_FAMILIES_KEY}:${familyId}`, '1', 'EX', ttlSeconds);
  }

  /**
   * Checks whether a session has been revoked.
   *
   * @param sessionId - the session ID to check
   * @returns true if the session is revoked
   */
  async isRevoked(sessionId: string): Promise<boolean> {
    const result = await this.redis.get(`${REVOKED_SESSIONS_KEY}:${sessionId}`);
    return result !== null;
  }

  /**
   * Checks whether a token family has been revoked.
   *
   * @param familyId - the family ID to check
   * @returns true if the family is revoked
   */
  async isFamilyRevoked(familyId: string): Promise<boolean> {
    const result = await this.redis.get(`${REVOKED_FAMILIES_KEY}:${familyId}`);
    return result !== null;
  }

  /**
   * Signs a JWT with the given claims and TTL.
   */
  private async signToken(
    claims: {
      readonly sub: string;
      readonly handle: string;
      readonly sessionId: string;
      readonly familyId: string;
      readonly scope: readonly string[];
      readonly type: string;
    },
    ttlMs: number,
  ): Promise<string> {
    const iat = Math.floor(Date.now() / 1_000);
    const exp = iat + Math.floor(ttlMs / 1_000);

    return new jose.SignJWT({
      handle: claims.handle,
      sessionId: claims.sessionId,
      familyId: claims.familyId,
      scope: claims.scope,
      type: claims.type,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(claims.sub)
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .setIssuer('https://layers.pub')
      .setAudience('https://layers.pub')
      .sign(this.secret);
  }

  /**
   * Verifies a JWT and extracts the session payload.
   */
  private async verifyToken(
    token: string,
    expectedType: string,
  ): Promise<Result<SessionPayload, TokenValidationError | TokenExpiredError>> {
    try {
      const { payload } = await jose.jwtVerify(token, this.secret, {
        issuer: 'https://layers.pub',
        audience: 'https://layers.pub',
      });

      if (payload.type !== expectedType) {
        return Err(
          new TokenValidationError(`Expected ${expectedType} token, got ${String(payload.type)}`),
        );
      }

      const sub = payload.sub;
      if (!sub) {
        return Err(new TokenValidationError('Token missing "sub" claim'));
      }

      const iat = payload.iat;
      const exp = payload.exp;
      if (iat === undefined || exp === undefined) {
        return Err(new TokenValidationError('Token missing "iat" or "exp" claim'));
      }

      return Ok({
        sub,
        handle: payload.handle as string,
        sessionId: payload.sessionId as string,
        familyId: (payload.familyId as string) ?? (payload.sessionId as string),
        scope: payload.scope as readonly string[],
        iat,
        exp,
      });
    } catch (err) {
      if (err instanceof jose.errors.JWTExpired) {
        return Err(new TokenExpiredError());
      }
      return Err(
        new TokenValidationError(err instanceof Error ? err.message : 'Token verification failed'),
      );
    }
  }
}

export { DEFAULT_ACCESS_TOKEN_TTL_MS, DEFAULT_REFRESH_TOKEN_TTL_MS, SessionManager };
export type { SessionManagerConfig, SessionPayload, TokenPair };
