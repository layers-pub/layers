/**
 * Factory for creating a fully configured NodeOAuthClient.
 *
 * Assembles Redis-backed state and session stores, configures client metadata,
 * and returns a NodeOAuthClient ready for ATProto OAuth flows.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import { NodeOAuthClient } from '@atproto/oauth-client-node';

import { RedisSessionStore, RedisStateStore } from './oauth-stores.js';

/**
 * Configuration required to build a Layers OAuth client.
 */
interface OAuthFactoryConfig {
  /** URL to the publicly accessible client-metadata.json document. */
  readonly clientId: string;
  /** OAuth callback URL registered in client metadata. */
  readonly redirectUri: string;
  /** Redis client for state and session persistence. */
  readonly redis: Redis;
}

/**
 * Creates a NodeOAuthClient configured for the Layers appview.
 *
 * The client uses Redis-backed stores for state (PKCE, CSRF) and sessions
 * (OAuth tokens, DPoP keys). Client metadata follows ATProto conventions
 * with DPoP-bound access tokens and the `atproto transition:generic` scope.
 *
 * @param config - factory configuration with client ID, redirect URI, and Redis client
 * @returns a fully configured NodeOAuthClient
 *
 * @example
 * ```typescript
 * const oauthClient = createLayersOAuthClient({
 *   clientId: "https://layers.pub/client-metadata.json",
 *   redirectUri: "https://layers.pub/callback",
 *   redis,
 * });
 *
 * const url = await oauthClient.authorize(handle, { state: "random" });
 * ```
 */
function createLayersOAuthClient(config: OAuthFactoryConfig): NodeOAuthClient {
  const stateStore = new RedisStateStore(config.redis);
  const sessionStore = new RedisSessionStore(config.redis);

  return new NodeOAuthClient({
    clientMetadata: {
      client_id: config.clientId,
      client_name: 'Layers',
      redirect_uris: [config.redirectUri],
      scope: 'atproto transition:generic',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      application_type: 'web',
      dpop_bound_access_tokens: true,
    },
    stateStore,
    sessionStore,
  });
}

export { createLayersOAuthClient };
export type { OAuthFactoryConfig };
