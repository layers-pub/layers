/**
 * Redis-backed state and session stores for ATProto OAuth.
 *
 * ATProto OAuth requires persistent storage for PKCE challenges and CSRF
 * tokens (state) and for OAuth sessions (access/refresh tokens, DPoP keys).
 * These stores use Redis with appropriate TTLs for each data category.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from '@atproto/oauth-client-node';

/** TTL for OAuth state entries: 10 minutes (authorization flow timeout). */
const STATE_TTL_SECONDS = 600;

/** TTL for OAuth session entries: 30 days. */
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Key prefix for OAuth state entries in Redis. */
const STATE_KEY_PREFIX = 'layers:oauth:state:';

/** Key prefix for OAuth session entries in Redis. */
const SESSION_KEY_PREFIX = 'layers:oauth:session:';

/**
 * Redis-backed store for OAuth authorization state (PKCE challenges, CSRF tokens).
 *
 * State entries are short-lived (10 minutes) because they only need to survive
 * the duration of a single OAuth authorization flow.
 */
class RedisStateStore implements NodeSavedStateStore {
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async set(key: string, state: NodeSavedState): Promise<void> {
    const redisKey = `${STATE_KEY_PREFIX}${key}`;
    await this.redis.set(redisKey, JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
  }

  async get(key: string): Promise<NodeSavedState | undefined> {
    const redisKey = `${STATE_KEY_PREFIX}${key}`;
    const raw = await this.redis.get(redisKey);
    if (raw === null) return undefined;
    return JSON.parse(raw) as NodeSavedState;
  }

  async del(key: string): Promise<void> {
    const redisKey = `${STATE_KEY_PREFIX}${key}`;
    await this.redis.del(redisKey);
  }
}

/**
 * Redis-backed store for OAuth sessions (access tokens, refresh tokens, DPoP keys).
 *
 * Session entries have a 30-day TTL. The ATProto OAuth client manages token
 * refresh internally; this store persists the session data between server
 * restarts so that users do not need to re-authenticate.
 */
class RedisSessionStore implements NodeSavedSessionStore {
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async set(sub: string, session: NodeSavedSession): Promise<void> {
    const redisKey = `${SESSION_KEY_PREFIX}${sub}`;
    await this.redis.set(redisKey, JSON.stringify(session), 'EX', SESSION_TTL_SECONDS);
  }

  async get(sub: string): Promise<NodeSavedSession | undefined> {
    const redisKey = `${SESSION_KEY_PREFIX}${sub}`;
    const raw = await this.redis.get(redisKey);
    if (raw === null) return undefined;
    return JSON.parse(raw) as NodeSavedSession;
  }

  async del(sub: string): Promise<void> {
    const redisKey = `${SESSION_KEY_PREFIX}${sub}`;
    await this.redis.del(redisKey);
  }
}

export { RedisSessionStore, RedisStateStore };
export { SESSION_KEY_PREFIX, SESSION_TTL_SECONDS, STATE_KEY_PREFIX, STATE_TTL_SECONDS };
