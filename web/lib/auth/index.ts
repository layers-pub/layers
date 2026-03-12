/**
 * Auth barrel export.
 *
 * @module
 */

export type { DID, Handle, LayersUser, AuthState, AuthActions } from './types';
export {
  getOAuthClient,
  login,
  initializeOAuth,
  restoreSession,
  logout,
  getOAuthBaseUrl,
} from './oauth-client';
export {
  AuthProvider,
  useAuth,
  useIsAuthenticated,
  useCurrentUser,
  useAgent,
} from './auth-context';
