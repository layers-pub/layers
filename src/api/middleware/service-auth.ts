/**
 * Service-to-service authentication middleware.
 *
 * Validates service tokens from the X-Service-Auth header using the
 * ServiceAuthManager. Sets the verified service identity on the Hono
 * context for downstream handlers.
 *
 * @module
 */

import type { Context, MiddlewareHandler } from 'hono';

import { AuthenticationError, AuthorizationError } from '../../types/errors.js';
import type { ServiceAuthManager } from '../../auth/service-auth.js';

/**
 * Service auth context attached to the request when a valid service token
 * is present.
 */
export interface ServiceAuthContext {
  /** The authenticated service's identifier. */
  readonly serviceId: string;
  /** The unique token identifier (for audit logging). */
  readonly jti: string;
}

/**
 * Returns a middleware that validates service-to-service tokens.
 *
 * Extracts the token from the `X-Service-Auth` header, verifies it
 * using the provided ServiceAuthManager, and sets the service auth
 * context on `c.set('serviceAuth', ...)`. If the token is missing
 * or invalid, the middleware sets serviceAuth to null and continues
 * (allowing downstream middleware to decide whether service auth
 * is required).
 *
 * @param manager - the ServiceAuthManager used for token verification
 */
export function serviceAuth(manager: ServiceAuthManager): MiddlewareHandler {
  return async (c: Context, next) => {
    const token = c.req.header('X-Service-Auth');

    if (!token) {
      c.set('serviceAuth', null);
      await next();
      return;
    }

    const result = await manager.verifyServiceToken(token);

    if (!result.ok) {
      throw new AuthenticationError(`Invalid service token: ${result.error.message}`);
    }

    const payload = result.value;
    c.set('serviceAuth', {
      serviceId: payload.iss,
      jti: payload.jti,
    } satisfies ServiceAuthContext);

    await next();
  };
}

/**
 * Returns a middleware that requires a valid service token.
 *
 * Must be placed after the `serviceAuth()` middleware. If no valid
 * service auth context is present, returns 401. Optionally restricts
 * access to specific service IDs.
 *
 * @param serviceIds - optional list of allowed service IDs; if empty, any authenticated service is accepted
 */
export function requireService(serviceIds?: readonly string[]): MiddlewareHandler {
  return async (c: Context, next) => {
    const ctx = c.get('serviceAuth') as ServiceAuthContext | null | undefined;

    if (!ctx) {
      throw new AuthenticationError('Service authentication required');
    }

    if (serviceIds && serviceIds.length > 0 && !serviceIds.includes(ctx.serviceId)) {
      throw new AuthorizationError(
        `Service "${ctx.serviceId}" is not authorized for this operation`,
        'service-auth',
      );
    }

    await next();
  };
}
