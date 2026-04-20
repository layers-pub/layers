/**
 * Barrel export for all middleware modules.
 *
 * @module
 */

export { authenticate, requireAuth, requireRole } from './authenticate.js';
export type { AuthContext } from './authenticate.js';
export { corsMiddleware } from './cors.js';
export { createRateLimiter, rateLimiter } from './rate-limiter.js';
export type { RateLimiterConfig, RateLimitResult, RateLimitTier } from './rate-limiter.js';
export { requestContext } from './request-context.js';
export { secureHeaders } from './secure-headers.js';
export { serviceInjection } from './service-injection.js';
export {
  denyResponse,
  requireAccount,
  requireBlob,
  requireIdentity,
  requireRepo,
  requireRpc,
  scopeEnforcer,
} from './require-scope.js';
