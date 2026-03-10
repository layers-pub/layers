/**
 * OAuth REST endpoints for ATProto authentication.
 *
 * Provides login initiation, callback processing, token refresh,
 * and logout (session revocation) endpoints.
 *
 * @module
 */

import type { Context, Hono } from 'hono';
import type { NodeOAuthClient } from '@atproto/oauth-client-node';

import {
  createAuthorizationUrl,
  handleOAuthCallback,
  resolveHandle,
} from '../../../../../auth/oauth-client.js';
import type { SessionManager } from '../../../../../auth/session-manager.js';

/**
 * Dependencies required by the OAuth endpoints.
 */
interface OAuthRouteDependencies {
  /** The configured ATProto OAuth client. */
  readonly oauthClient: NodeOAuthClient;
  /** The session manager for JWT operations. */
  readonly sessionManager: SessionManager;
  /** Default scopes to grant on login. */
  readonly defaultScopes?: readonly string[] | undefined;
}

/**
 * Registers OAuth authentication routes on the Hono app.
 *
 * Endpoints:
 * - `GET /auth/v1/login` - redirects to ATProto OAuth authorization URL
 * - `GET /auth/v1/callback` - handles OAuth callback, creates session
 * - `POST /auth/v1/refresh` - refreshes access token using refresh token
 * - `POST /auth/v1/logout` - revokes the current session
 *
 * @param app - the Hono application instance
 * @param deps - OAuth client and session manager dependencies
 */
function oauthRoutes(app: Hono, deps: OAuthRouteDependencies): void {
  const { oauthClient, sessionManager, defaultScopes } = deps;
  const scopes = defaultScopes ?? ['read:records'];

  /**
   * GET /auth/v1/login
   *
   * Initiates the ATProto OAuth flow. Requires a `handle` query parameter
   * identifying the user's ATProto handle. Generates a random state parameter
   * for CSRF protection and redirects the user to their PDS authorization
   * endpoint.
   */
  app.get('/auth/v1/login', async (c: Context) => {
    const handle = c.req.query('handle');
    if (!handle) {
      return c.json({ error: 'Missing "handle" query parameter' }, 400);
    }

    const state = crypto.randomUUID();
    const result = await createAuthorizationUrl(oauthClient, handle, state);

    if (!result.ok) {
      return c.json({ error: result.error.message }, 500);
    }

    return c.redirect(result.value.toString(), 302);
  });

  /**
   * GET /auth/v1/callback
   *
   * Processes the OAuth callback from the user's PDS. The ATProto OAuth
   * client handles PKCE verification and token exchange internally.
   * On success, the user's DID is extracted, their handle is resolved,
   * and a Layers JWT session is created.
   */
  app.get('/auth/v1/callback', async (c: Context) => {
    const url = new URL(c.req.url);
    const params = url.searchParams;

    const callbackResult = await handleOAuthCallback(oauthClient, params);
    if (!callbackResult.ok) {
      return c.json({ error: callbackResult.error.message }, 400);
    }

    const { did } = callbackResult.value;
    const handle = await resolveHandle(oauthClient, did);
    const tokenPair = await sessionManager.createSession(did, handle, scopes);

    return c.json({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresAt: tokenPair.accessTokenExpiresAt,
      did,
      handle,
    });
  });

  /**
   * POST /auth/v1/refresh
   *
   * Refreshes an access token using a valid refresh token. The request
   * body must contain a `refreshToken` field. Returns a new token pair
   * if the refresh token is valid and the session has not been revoked.
   */
  app.post('/auth/v1/refresh', async (c: Context) => {
    let body: { refreshToken?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid request body' }, 400);
    }

    const refreshToken = body.refreshToken;
    if (!refreshToken) {
      return c.json({ error: 'Missing "refreshToken" in request body' }, 400);
    }

    const result = await sessionManager.refreshSession(refreshToken);
    if (!result.ok) {
      return c.json({ error: result.error.message }, 401);
    }

    return c.json({
      accessToken: result.value.accessToken,
      refreshToken: result.value.refreshToken,
      expiresAt: result.value.accessTokenExpiresAt,
    });
  });

  /**
   * POST /auth/v1/logout
   *
   * Revokes the current session. Requires a valid Bearer token in the
   * Authorization header. After revocation, both the access and refresh
   * tokens for this session become invalid.
   */
  app.post('/auth/v1/logout', async (c: Context) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing Authorization header' }, 401);
    }

    const token = header.slice(7).trim();
    const result = await sessionManager.verifyAccessToken(token);

    if (!result.ok) {
      return c.json({ error: result.error.message }, 401);
    }

    await sessionManager.revokeSession(result.value.sessionId);
    return c.json({ success: true });
  });
}

export { oauthRoutes };
export type { OAuthRouteDependencies };
