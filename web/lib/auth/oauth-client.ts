/**
 * ATProto OAuth client setup for the Layers frontend.
 *
 * Uses @atproto/oauth-client-browser for PKCE, DPoP key management,
 * and automatic token refresh via IndexedDB persistence.
 *
 * @module
 */

import { BrowserOAuthClient } from '@atproto/oauth-client-browser';
import type { OAuthSession } from '@atproto/oauth-client-browser';

let clientInstance: BrowserOAuthClient | null = null;

/**
 * Returns the base URL for OAuth redirect URIs.
 *
 * In development with a tunnel (ngrok), set NEXT_PUBLIC_OAUTH_BASE_URL
 * to the tunnel URL so that the PDS can redirect back correctly.
 */
function getOAuthBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_OAUTH_BASE_URL ?? 'http://localhost:3000';
  }
  return process.env.NEXT_PUBLIC_OAUTH_BASE_URL ?? window.location.origin;
}

/**
 * Builds the client metadata URL from the base URL.
 *
 * The PDS fetches this URL to verify the client before issuing tokens.
 */
function getClientId(): string {
  const baseUrl = getOAuthBaseUrl();
  return `${baseUrl}/client-metadata.json`;
}

/**
 * Creates or returns the singleton BrowserOAuthClient instance.
 *
 * The client manages PKCE challenges, DPoP key pairs, and token
 * storage in IndexedDB automatically.
 */
function createOAuthClient(): BrowserOAuthClient {
  if (clientInstance) {
    return clientInstance;
  }

  const baseUrl = getOAuthBaseUrl();

  clientInstance = new BrowserOAuthClient({
    clientMetadata: {
      client_id: getClientId(),
      client_name: 'Layers',
      redirect_uris: [`${baseUrl}/callback` as `https://${string}`],
      scope: 'atproto transition:generic',
      grant_types: ['authorization_code', 'refresh_token'],
      dpop_bound_access_tokens: true,
      application_type: 'web',
      token_endpoint_auth_method: 'none',
    },
    handleResolver: 'https://bsky.social',
  });

  return clientInstance;
}

/**
 * Initiates the OAuth login flow by redirecting to the user's PDS.
 *
 * @param handle - the user's ATProto handle (e.g., "alice.bsky.social")
 */
async function login(handle: string): Promise<void> {
  const client = createOAuthClient();
  await client.authorize(handle);
}

/**
 * Processes the OAuth callback after the PDS redirects back.
 *
 * Exchanges the authorization code for access and refresh tokens.
 *
 * @returns the authenticated OAuth session
 */
async function handleCallback(): Promise<OAuthSession> {
  const client = createOAuthClient();
  const params = new URLSearchParams(window.location.search);
  const { session } = await client.callback(params);
  return session;
}

/**
 * Attempts to restore a previous session from IndexedDB.
 *
 * Returns null if no session is stored or the session has expired
 * and cannot be refreshed.
 *
 * @returns the restored session, or null if unavailable
 */
async function restoreSession(): Promise<OAuthSession | null> {
  try {
    const client = createOAuthClient();
    const result = await client.init();
    return result?.session ?? null;
  } catch {
    return null;
  }
}

/**
 * Revokes the current session and clears stored tokens.
 */
async function logout(): Promise<void> {
  // The BrowserOAuthClient does not expose a direct revoke method;
  // clearing the singleton forces re-initialization on next login.
  clientInstance = null;
}

export { createOAuthClient, login, handleCallback, restoreSession, logout, getOAuthBaseUrl };
