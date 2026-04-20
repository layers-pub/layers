/**
 * ATProto OAuth client for Layers authentication.
 *
 * Uses @atproto/oauth-client-browser which handles PKCE, DPoP, PAR,
 * and session management (IndexedDB) automatically.
 *
 * @module
 */

import {
  BrowserOAuthClient,
  AtprotoDohHandleResolver,
  type OAuthSession,
} from '@atproto/oauth-client-browser';

import type { DID, LayersUser } from './types';
import { Agent } from '@atproto/api';
import {
  DEFAULT_APPVIEW_AUDIENCE,
  buildLayersScopeString,
  type AppviewAudience,
  type LayersScopeProfile,
} from './scope-profiles';

/**
 * Handle resolver using ATProto's DNS-over-HTTPS resolver.
 *
 * Uses Google's DoH JSON API endpoint for ATProto-standard handle resolution:
 * 1. HTTP: GET https://<handle>/.well-known/atproto-did
 * 2. DNS: _atproto.<handle> TXT record (via DoH)
 */
const handleResolver = new AtprotoDohHandleResolver({
  dohEndpoint: 'https://dns.google/resolve',
});

let oauthClient: BrowserOAuthClient | null = null;
let clientInitPromise: Promise<BrowserOAuthClient> | null = null;

/**
 * Returns the base URL for OAuth redirect URIs.
 *
 * In tunnel mode, set NEXT_PUBLIC_OAUTH_BASE_URL to the ngrok URL.
 * In local mode, uses http://127.0.0.1:3000.
 */
function getOAuthBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OAUTH_BASE_URL) {
    return process.env.NEXT_PUBLIC_OAUTH_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://127.0.0.1:3000';
}

/**
 * Returns the OAuth client_id.
 *
 * ATProto requires exactly "http://localhost" (no port, no path) for
 * loopback clients. For production URLs, the client_id points to the
 * client metadata document.
 */
function getClientId(): string {
  const baseUrl = getOAuthBaseUrl();
  const url = new URL(baseUrl);

  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]') {
    return 'http://localhost';
  }

  return `${baseUrl}/client-metadata.json`;
}

/**
 * Gets or initializes the singleton OAuth client.
 *
 * Uses BrowserOAuthClient.load() which handles handle resolution,
 * PKCE, DPoP, and IndexedDB session storage.
 */
async function getOAuthClient(): Promise<BrowserOAuthClient> {
  if (oauthClient) return oauthClient;
  if (clientInitPromise) return clientInitPromise;

  const clientId = getClientId();

  clientInitPromise = BrowserOAuthClient.load({ clientId, handleResolver }).then((client) => {
    oauthClient = client;
    return client;
  });

  return clientInitPromise;
}

/**
 * Initiates the OAuth login flow by redirecting to the user's PDS.
 *
 * The scope is built from a named Layers profile and the appview audience
 * every `include:` binds to. Call sites pick the profile based on what the
 * user just opted into (e.g. 'annotator' if they clicked "Start annotating",
 * 'login-only' for a bare sign-in).
 */
async function login(
  handle: string,
  profile: LayersScopeProfile = 'login-only',
  audience: AppviewAudience = DEFAULT_APPVIEW_AUDIENCE,
): Promise<string> {
  const client = await getOAuthClient();
  const scope = buildLayersScopeString(profile, audience);
  const url = await client.authorize(handle, { scope });
  return url.toString();
}

/**
 * Starts an OAuth flow that replaces the current session with one carrying an
 * expanded scope set. Used for progressive scope upgrades, per
 * https://atproto.com/guides/oauth-patterns#progressive-scope-requests.
 */
async function upgradeScope(
  handle: string,
  profile: LayersScopeProfile,
  audience: AppviewAudience = DEFAULT_APPVIEW_AUDIENCE,
): Promise<string> {
  return login(handle, profile, audience);
}

/**
 * Initializes OAuth and handles any pending callback from PDS redirect.
 *
 * Call on app startup to:
 * 1. Handle OAuth callbacks (code + state in URL)
 * 2. Restore existing sessions from IndexedDB
 */
async function initializeOAuth(): Promise<{
  user: LayersUser;
  session: OAuthSession;
  agent: Agent;
} | null> {
  const client = await getOAuthClient();
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');

  if (code && state) {
    const result = await client.callback(params);

    if (result?.session) {
      const user = await fetchUserProfile(result.session);

      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      url.searchParams.delete('iss');
      window.history.replaceState({}, '', url.toString());

      return { user, session: result.session, agent: new Agent(result.session) };
    }
  }

  return null;
}

/**
 * Attempts to restore a previous session from IndexedDB.
 *
 * @returns the restored session info, or null if unavailable
 */
async function restoreSession(): Promise<{
  user: LayersUser;
  session: OAuthSession;
  agent: Agent;
} | null> {
  const client = await getOAuthClient();

  try {
    const result = await client.init();
    if (result?.session) {
      const user = await fetchUserProfile(result.session);
      return { user, session: result.session, agent: new Agent(result.session) };
    }
  } catch {
    // No stored session or session expired
  }

  return null;
}

/**
 * Fetches user profile from PDS to populate LayersUser.
 */
async function fetchUserProfile(session: OAuthSession): Promise<LayersUser> {
  const agent = new Agent(session);
  const did = session.did as DID;

  // Resolve PDS endpoint from DID document
  let pdsUrl = '';
  try {
    pdsUrl = await resolvePdsUrl(did);
  } catch {
    // Non-fatal; pdsUrl remains empty
  }

  try {
    const profile = await agent.getProfile({ actor: did });
    return {
      did,
      handle: profile.data.handle,
      displayName: profile.data.displayName ?? '',
      avatar: profile.data.avatar ?? '',
      pdsUrl,
      isAdmin: false,
    };
  } catch {
    return { did, handle: did, displayName: '', avatar: '', pdsUrl, isAdmin: false };
  }
}

/**
 * Resolves PDS endpoint from a DID document.
 */
async function resolvePdsUrl(did: DID): Promise<string> {
  let docUrl: string;
  if (did.startsWith('did:plc:')) {
    docUrl = `https://plc.directory/${did}`;
  } else if (did.startsWith('did:web:')) {
    const webId = decodeURIComponent(did.slice(8));
    docUrl = webId.includes(':')
      ? `https://${webId.split(':')[0]}/${webId.split(':').slice(1).join('/')}/did.json`
      : `https://${webId}/.well-known/did.json`;
  } else {
    return '';
  }

  const response = await fetch(docUrl);
  if (!response.ok) return '';

  const doc = (await response.json()) as {
    service?: Array<{ id: string; type?: string; serviceEndpoint: string }>;
  };

  const pds = doc.service?.find(
    (s) => s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer',
  );

  return pds?.serviceEndpoint ?? '';
}

/**
 * Revokes the current session and clears stored state.
 */
async function logout(): Promise<void> {
  oauthClient = null;
  clientInitPromise = null;
}

export {
  getOAuthClient,
  login,
  upgradeScope,
  initializeOAuth,
  restoreSession,
  logout,
  getOAuthBaseUrl,
};
