/**
 * Factory for creating a fully configured NodeOAuthClient.
 *
 * Assembles Redis-backed state and session stores, assembles the granular
 * OAuth scope string (no `transition:generic`), and returns a NodeOAuthClient
 * ready for ATProto OAuth flows. The maximum scope declared in client
 * metadata is the union of every granular scope the Layers app may ever
 * request; individual authorize() calls select a subset per the
 * progressive-scope pattern.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import { NodeOAuthClient } from '@atproto/oauth-client-node';

import {
  LAYERS_MAXIMUM_SCOPE,
  buildLayersScopeString,
  type LayersScopeProfile,
} from './permissions/layers-scopes.js';
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
  /**
   * Optional override for the maximum scope declared in the client metadata
   * document. Defaults to {@link LAYERS_MAXIMUM_SCOPE} which includes every
   * permission set the app may ever request.
   */
  readonly maximumScope?: string;
}

/**
 * Creates a NodeOAuthClient configured for the Layers appview.
 *
 * The client uses Redis-backed stores for state (PKCE, CSRF) and sessions
 * (OAuth tokens, DPoP keys). Client metadata declares the maximum set of
 * scopes Layers may ever request; per-authorize() flows request a subset.
 */
function createLayersOAuthClient(config: OAuthFactoryConfig): NodeOAuthClient {
  const stateStore = new RedisStateStore(config.redis);
  const sessionStore = new RedisSessionStore(config.redis);

  return new NodeOAuthClient({
    clientMetadata: {
      client_id: config.clientId,
      client_name: 'Layers',
      redirect_uris: [config.redirectUri],
      scope: config.maximumScope ?? LAYERS_MAXIMUM_SCOPE,
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

export { createLayersOAuthClient, buildLayersScopeString, LAYERS_MAXIMUM_SCOPE };
export type { OAuthFactoryConfig, LayersScopeProfile };
