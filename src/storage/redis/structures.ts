/**
 * Type-safe Redis key builders and TTL constants for the Layers appview.
 *
 * All Redis keys used by the application are defined here to prevent
 * key collisions and ensure consistent naming across modules.
 *
 * @module
 */

/**
 * Type-safe Redis key builder functions.
 *
 * Each function returns a namespaced key string for a specific data category.
 *
 * @example
 * ```typescript
 * const key = RedisKeys.SESSION("did:plc:abc123", "token-xyz");
 * // => "session:did:plc:abc123:token-xyz"
 * ```
 */
const RedisKeys = {
  /** Session key scoped to a DID and token pair. */
  SESSION: (did: string, token: string): string => `session:${did}:${token}`,

  /** Cached record by AT-URI. */
  RECORD_CACHE: (uri: string): string => `record:${uri}`,

  /** Rate limit counter scoped to a DID and endpoint. */
  RATE_LIMIT: (did: string, endpoint: string): string => `ratelimit:${did}:${endpoint}`,

  /** Cached DID resolution result. */
  DID_RESOLVE: (did: string): string => `resolve:${did}`,

  /** Firehose cursor position (singleton key). */
  FIREHOSE_CURSOR: (): string => 'cursor:firehose',
} as const;

/**
 * TTL values in seconds for Redis keys.
 *
 * These values control how long each category of cached data persists
 * before automatic expiration.
 */
const RedisTTL = {
  /** Session TTL: 24 hours. */
  SESSION: 86_400,

  /** Record cache TTL: 5 minutes. */
  RECORD_CACHE: 300,

  /** Rate limit window TTL: 1 minute. */
  RATE_LIMIT: 60,

  /** DID resolution cache TTL: 1 hour. */
  DID_RESOLVE: 3_600,
} as const;

export { RedisKeys, RedisTTL };
