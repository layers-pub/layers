/**
 * ATProto OAuth 2.0 client wrapper.
 *
 * Wraps `@atproto/oauth-client-node` to provide authorization URL generation
 * with PKCE (S256) and OAuth callback processing. After the OAuth flow
 * completes, the user's DID is extracted and a Layers-internal JWT session
 * is created separately by the SessionManager.
 *
 * The ATProto OAuth client manages its own token lifecycle (access tokens,
 * refresh tokens, DPoP proofs). Layers does not extract or store ATProto
 * tokens directly; instead, it uses the OAuthSession as a fetch proxy
 * for any PDS communication needed during the session.
 *
 * @module
 */

import type { NodeOAuthClient } from '@atproto/oauth-client-node';

import { type Result, Err, Ok } from '../types/result.js';
import { OAuthError } from './errors.js';

/**
 * Configuration for creating an ATProto OAuth client.
 */
interface OAuthClientConfig {
  /** The OAuth client ID (URL to client-metadata.json). */
  readonly clientId: string;
  /** The OAuth client secret (if confidential client). */
  readonly clientSecret?: string | undefined;
  /** The redirect URI registered with the authorization server. */
  readonly redirectUri: string;
  /** The ATProto PLC directory URL for DID resolution. */
  readonly issuer?: string | undefined;
}

/**
 * Result of processing an OAuth callback.
 *
 * Contains the authenticated user's DID. The ATProto OAuth session
 * is stored internally by the NodeOAuthClient and can be restored
 * later via `client.restore(did)` for authenticated PDS requests.
 */
interface OAuthCallbackResult {
  /** The authenticated user's DID. */
  readonly did: string;
  /** The state parameter echoed back from the authorization server. */
  readonly state: string | null;
}

/**
 * Creates an authorization URL for the ATProto OAuth flow.
 *
 * Generates a PKCE challenge (S256) and builds the authorization URL
 * that the user should be redirected to for authentication at their PDS.
 *
 * @param client - the configured NodeOAuthClient instance
 * @param handle - the user's ATProto handle (e.g., "alice.bsky.social")
 * @param state - opaque state string for CSRF protection
 * @returns the authorization URL on success, or an OAuthError
 */
async function createAuthorizationUrl(
  client: NodeOAuthClient,
  handle: string,
  state: string,
): Promise<Result<URL, OAuthError>> {
  try {
    const url = await client.authorize(handle, { state });
    return Ok(url);
  } catch (err) {
    return Err(
      new OAuthError(
        `Failed to create authorization URL for handle "${handle}"`,
        err instanceof Error ? err : undefined,
      ),
    );
  }
}

/**
 * Processes an OAuth callback by completing the authorization code exchange.
 *
 * The ATProto OAuth client handles PKCE verification, token exchange,
 * and DPoP proof generation internally. On success, the user's DID
 * is extracted from the resulting session.
 *
 * @param client - the configured NodeOAuthClient instance
 * @param params - the callback URL search parameters (code, state, iss)
 * @returns the callback result with the user's DID, or an OAuthError
 */
async function handleOAuthCallback(
  client: NodeOAuthClient,
  params: URLSearchParams,
): Promise<Result<OAuthCallbackResult, OAuthError>> {
  try {
    const { session, state } = await client.callback(params);
    return Ok({
      did: session.did,
      state,
    });
  } catch (err) {
    return Err(
      new OAuthError('OAuth callback processing failed', err instanceof Error ? err : undefined),
    );
  }
}

/**
 * Resolves a DID to its handle using the OAuth client's identity resolver.
 *
 * Falls back to the DID itself if handle resolution fails, since the DID
 * is the stable identifier in ATProto.
 *
 * @param client - the configured NodeOAuthClient instance
 * @param did - the user's DID to resolve
 * @returns the handle string, or the DID as fallback
 */
async function resolveHandle(client: NodeOAuthClient, did: string): Promise<string> {
  try {
    const identity = await client.identityResolver.resolve(did);
    return identity.handle ?? did;
  } catch {
    return did;
  }
}

export { createAuthorizationUrl, handleOAuthCallback, resolveHandle };
export type { OAuthCallbackResult, OAuthClientConfig };
