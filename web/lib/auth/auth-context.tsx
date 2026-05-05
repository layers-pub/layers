'use client';

/**
 * React context provider for authentication state.
 *
 * @module
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Agent } from '@atproto/api';

import { events } from '@/lib/observability/custom-events';

import type { AuthActions, AuthState, LayersUser } from './types';
import {
  login as oauthLogin,
  logout as oauthLogout,
  restoreSession,
  initializeOAuth,
} from './oauth-client';

type AuthContextValue = AuthState &
  AuthActions & {
    agent: Agent | null;
  };

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  readonly children: ReactNode;
}

/**
 * Provides authentication state and actions to the component tree.
 *
 * On mount, checks for OAuth callback params, then attempts session restore.
 */
function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<LayersUser | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;

  useEffect(() => {
    let cancelled = false;

    async function init(): Promise<void> {
      try {
        // First, check for OAuth callback (code + state in URL)
        const callbackResult = await initializeOAuth();
        if (cancelled) return;

        if (callbackResult) {
          setUser(callbackResult.user);
          setAgent(callbackResult.agent);
          events.userAction({ action: 'login', result: 'success' });
          setIsLoading(false);
          return;
        }

        // No callback; try restoring existing session
        const restored = await restoreSession();
        if (cancelled) return;

        if (restored) {
          setUser(restored.user);
          setAgent(restored.agent);
          events.userAction({ action: 'login', result: 'success' });
        }
      } catch {
        // Session restore failed; user remains unauthenticated.
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (handle: string): Promise<void> => {
    setIsLoading(true);
    try {
      const authUrl = await oauthLogin(handle);
      // Redirect to the PDS authorization page
      window.location.href = authUrl;
    } catch (err) {
      setIsLoading(false);
      console.error('[oauth] login failed', err);
      const reason = err instanceof Error ? err.message : 'unknown error';
      throw new Error(`Login failed: ${reason}`);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await oauthLogout();
      events.userAction({ action: 'logout' });
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

function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

function useCurrentUser(): LayersUser | null {
  const { user } = useAuth();
  return user;
}

function useAgent(): Agent | null {
  const { agent } = useAuth();
  return agent;
}

export { AuthProvider, useAuth, useIsAuthenticated, useCurrentUser, useAgent };
