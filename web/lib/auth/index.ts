/**
 * Auth barrel export.
 *
 * @module
 */

export type { DID, Handle, LayersUser, AuthState, AuthActions } from './types';
export {
  createOAuthClient,
  login,
  handleCallback,
  restoreSession,
  logout,
  getOAuthBaseUrl,
} from './oauth-client';
export { AuthProvider, useAuth, useIsAuthenticated, useCurrentUser, useAgent } from './auth-context';
