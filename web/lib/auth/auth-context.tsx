'use client';

/**
 * React context provider for authentication state.
 *
 * Wraps the OAuth client functions in a React context so that any
 * component in the tree can read auth state or trigger login/logout.
 *
 * @module
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Agent } from '@atproto/api';

import type { AuthActions, AuthState, LayersUser } from './types';
import { login as oauthLogin, logout as oauthLogout, restoreSession } from './oauth-client';

type AuthContextValue = AuthState &
  AuthActions & {
    /** ATProto Agent wrapping the current OAuth session. Null when not authenticated. */
    agent: Agent | null;
  };

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  readonly children: ReactNode;
}

/**
 * Provides authentication state and actions to the component tree.
 *
 * On mount, attempts to restore a previous session from IndexedDB.
 * Exposes login and logout actions that delegate to the OAuth client.
 */
function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<LayersUser | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;

  useEffect(() => {
    let cancelled = false;

    async function attemptRestore(): Promise<void> {
      try {
        const session = await restoreSession();
        if (cancelled) return;

        if (session) {
          setUser({
            did: session.did as `did:${string}`,
            handle: session.did,
            pdsUrl: '',
            isAdmin: false,
          });
          setAgent(new Agent(session));
        }
      } catch {
        // Session restore failed; user remains unauthenticated.
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void attemptRestore();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (handle: string): Promise<void> => {
    setIsLoading(true);
    try {
      await oauthLogin(handle);
      // The browser will redirect to the PDS; state updates happen
      // after the callback page processes the response.
    } catch {
      setIsLoading(false);
      throw new Error('Login failed. Check that your handle is correct.');
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await oauthLogout();
    } finally {
      setUser(null);
      setAgent(null);
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAuthenticated, login, logout, agent }),
    [user, isLoading, isAuthenticated, login, logout, agent],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Returns the full authentication state and actions.
 *
 * Must be called within an AuthProvider.
 */
function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Returns whether the current user is authenticated.
 */
function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

/**
 * Returns the current user, or null if not authenticated.
 */
function useCurrentUser(): LayersUser | null {
  const { user } = useAuth();
  return user;
}

/**
 * Returns the authenticated ATProto Agent, or null if not logged in.
 */
function useAgent(): Agent | null {
  const { agent } = useAuth();
  return agent;
}

export { AuthProvider, useAuth, useIsAuthenticated, useCurrentUser, useAgent };
