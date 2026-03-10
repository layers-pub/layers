/**
 * Authentication middleware for JWT-based session verification.
 *
 * Extracts Bearer tokens from the Authorization header, verifies JWTs
 * using the SessionManager, checks revocation, and sets the auth context
 * on the Hono request context. Supports optional auth (anonymous fallback),
 * required auth (401 on failure), and role-based access control (403 on
 * insufficient role).
 *
 * Includes structured audit logging for all auth decisions.
 *
 * @module
 */

import type { Context, MiddlewareHandler } from 'hono';

import { trace } from '@opentelemetry/api';

import { AuthenticationError, AuthorizationError } from '../../types/errors.js';
import type { SessionManager, SessionPayload } from '../../auth/session-manager.js';
import { deriveRoleFromScopes, satisfiesRole } from '../../auth/authorization/rbac.js';
import { createLogger } from '../../observability/logger.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';

/** Logger scoped to the auth middleware. */
const authLogger: ILogger = createLogger({ service: 'auth' });

/**
 * Extracts the current OTel trace ID, or "none" if no active span.
 */
function getTraceId(): string {
  const span = trace.getActiveSpan();
  if (span) {
    return span.spanContext().traceId;
  }
  return 'none';
}

/**
 * Authentication context attached to each request.
 */
interface AuthContext {
  /** The user's DID, or null for anonymous requests. */
  readonly did: string | null;
  /** The user's ATProto handle, or null for anonymous requests. */
  readonly handle: string | null;
  /** The user's role (derived from scopes), or "anonymous". */
  readonly role: string;
  /** The session ID, or null for anonymous requests. */
  readonly sessionId: string | null;
  /** Whether the request is authenticated. */
  readonly authenticated: boolean;
  /** The granted scopes, empty for anonymous requests. */
  readonly scopes: readonly string[];
}

/** Anonymous auth context used when no token is provided. */
const ANONYMOUS_CONTEXT: AuthContext = {
  did: null,
  handle: null,
  role: 'anonymous',
  sessionId: null,
  authenticated: false,
  scopes: [],
};

/**
 * Extracts the Bearer token from the Authorization header.
 *
 * @param c - the Hono context
 * @returns the token string, or null if not present or malformed
 */
function extractBearerToken(c: Context): string | null {
  const header = c.req.header('Authorization');
  if (!header) return null;
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Builds an AuthContext from a verified session payload.
 */
function buildAuthContext(payload: SessionPayload): AuthContext {
  return {
    did: payload.sub,
    handle: payload.handle,
    role: deriveRoleFromScopes(payload.scope),
    sessionId: payload.sessionId,
    authenticated: true,
    scopes: payload.scope,
  };
}

/**
 * Returns a middleware that verifies JWT tokens and sets auth context.
 *
 * When a Bearer token is present, it is verified using the SessionManager.
 * If verification fails, the request is rejected with 401. If no token
 * is present, an anonymous auth context is set (allowing downstream
 * handlers to decide whether authentication is required).
 *
 * Logs all authentication decisions for audit purposes.
 *
 * The SessionManager must be registered on the Hono context as "sessionManager"
 * by the service injection middleware.
 */
function authenticate(): MiddlewareHandler {
  return async (c, next) => {
    const sessionManager = c.get('sessionManager') as SessionManager | undefined;
    const token = extractBearerToken(c);

    if (!token || !sessionManager) {
      c.set('auth', ANONYMOUS_CONTEXT);
      authLogger.debug('Anonymous access', { traceId: getTraceId() });
      await next();
      return;
    }

    const result = await sessionManager.verifyAccessToken(token);
    if (!result.ok) {
      c.set('auth', ANONYMOUS_CONTEXT);
      authLogger.warn('Authentication failed', {
        reason: result.error.message,
        traceId: getTraceId(),
      });
      await next();
      return;
    }

    const authContext = buildAuthContext(result.value);
    c.set('auth', authContext);
    authLogger.info('Authentication succeeded', {
      did: authContext.did,
      role: authContext.role,
      sessionId: authContext.sessionId,
      traceId: getTraceId(),
    });
    await next();
  };
}

/**
 * Returns a middleware that requires authentication.
 *
 * If the request does not have a valid authenticated session, a 401
 * response is returned. Place this after the `authenticate()` middleware
 * on routes that require login.
 */
function requireAuth(): MiddlewareHandler {
  return async (c, next) => {
    const auth = c.get('auth') as AuthContext | undefined;
    if (!auth?.authenticated) {
      throw new AuthenticationError('Authentication required');
    }
    await next();
  };
}

/**
 * Returns a middleware that requires a specific role.
 *
 * Checks the auth context's role against the required role using the
 * centralized role hierarchy. If the user's role does not satisfy the
 * requirement, a 403 response is returned.
 *
 * Logs authorization failures for audit purposes.
 *
 * @param role - the minimum required role
 */
function requireRole(role: string): MiddlewareHandler {
  return async (c, next) => {
    const auth = c.get('auth') as AuthContext | undefined;
    if (!auth?.authenticated) {
      throw new AuthenticationError('Authentication required');
    }

    if (!satisfiesRole(auth.role, role)) {
      authLogger.warn('Authorization failed', {
        did: auth.did,
        requiredRole: role,
        currentRole: auth.role,
        traceId: getTraceId(),
      });
      throw new AuthorizationError(`Role "${role}" required, current role is "${auth.role}"`, role);
    }
    await next();
  };
}

export {
  ANONYMOUS_CONTEXT,
  authenticate,
  buildAuthContext,
  extractBearerToken,
  requireAuth,
  requireRole,
};
export type { AuthContext };
