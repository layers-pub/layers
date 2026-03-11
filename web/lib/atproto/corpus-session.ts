/**
 * Corpus PDS session management utilities.
 *
 * Handles the OAuth client setup and session restoration for corpus
 * PDS connections. Separated from the UI components to avoid circular
 * dependencies between the project context and the connector dialog.
 *
 * @module
 */

import { BrowserOAuthClient } from '@atproto/oauth-client-browser';
import type { OAuthSession } from '@atproto/oauth-client-browser';

import { getOAuthBaseUrl } from '@/lib/auth';

// =============================================================================
// SessionStorage keys for the corpus OAuth redirect flow
// =============================================================================

const CORPUS_AUTH_PENDING_KEY = 'layers:corpus-auth-pending';
const CORPUS_AUTH_HANDLE_KEY = 'layers:corpus-auth-handle';
const CORPUS_AUTH_PROJECT_KEY = 'layers:corpus-auth-project';

// =============================================================================
// Corpus OAuth client singleton
// =============================================================================

let corpusClientInstance: BrowserOAuthClient | null = null;

/**
 * Returns a BrowserOAuthClient configured for corpus PDS authentication.
 *
 * Uses the same client metadata endpoint as the main client. The
 * BrowserOAuthClient stores sessions in IndexedDB keyed by DID, so
 * multiple sessions (user + corpus) can coexist.
 */
function getCorpusOAuthClient(): BrowserOAuthClient {
  if (corpusClientInstance) return corpusClientInstance;

  const baseUrl = getOAuthBaseUrl();

  corpusClientInstance = new BrowserOAuthClient({
    clientMetadata: {
      client_id: `${baseUrl}/client-metadata.json`,
      client_name: 'Layers (Corpus)',
      redirect_uris: [`${baseUrl}/callback` as `https://${string}`],
      scope: 'atproto transition:generic',
      grant_types: ['authorization_code', 'refresh_token'],
      dpop_bound_access_tokens: true,
      application_type: 'web',
      token_endpoint_auth_method: 'none',
    },
    handleResolver: 'https://bsky.social',
  });

  return corpusClientInstance;
}

/**
 * Stores the corpus OAuth redirect state in sessionStorage.
 *
 * Call this before initiating the OAuth redirect so the callback page
 * and project page can detect and restore the corpus session.
 */
function setCorpusAuthPending(handle: string, projectUri: string): void {
  sessionStorage.setItem(CORPUS_AUTH_PENDING_KEY, 'true');
  sessionStorage.setItem(CORPUS_AUTH_HANDLE_KEY, handle);
  sessionStorage.setItem(CORPUS_AUTH_PROJECT_KEY, projectUri);
}

/**
 * Clears the corpus OAuth redirect state from sessionStorage.
 *
 * Call on auth failure to prevent stale redirect state from
 * interfering with future connection attempts.
 */
function clearCorpusAuthPending(): void {
  sessionStorage.removeItem(CORPUS_AUTH_PENDING_KEY);
  sessionStorage.removeItem(CORPUS_AUTH_HANDLE_KEY);
  sessionStorage.removeItem(CORPUS_AUTH_PROJECT_KEY);
}

/**
 * Attempts to restore a corpus session from IndexedDB.
 *
 * Checks whether a corpus OAuth redirect was recently completed (by
 * examining sessionStorage flags). If so, initializes the corpus OAuth
 * client to restore the session from IndexedDB.
 *
 * @returns the OAuth session and corpus handle, or null if unavailable
 */
async function restoreCorpusSession(): Promise<{
  session: OAuthSession;
  handle: string;
} | null> {
  try {
    const pending = sessionStorage.getItem(CORPUS_AUTH_PENDING_KEY);
    if (pending !== 'true') return null;

    const handle = sessionStorage.getItem(CORPUS_AUTH_HANDLE_KEY) ?? '';

    // Clear the pending flags regardless of outcome
    clearCorpusAuthPending();

    const client = getCorpusOAuthClient();
    const result = await client.init();
    if (!result?.session) return null;

    return { session: result.session, handle };
  } catch {
    return null;
  }
}

export {
  CORPUS_AUTH_PENDING_KEY,
  CORPUS_AUTH_HANDLE_KEY,
  CORPUS_AUTH_PROJECT_KEY,
  getCorpusOAuthClient,
  setCorpusAuthPending,
  clearCorpusAuthPending,
  restoreCorpusSession,
};
