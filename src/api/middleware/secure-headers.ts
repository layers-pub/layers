/**
 * Security headers middleware.
 *
 * Sets standard security headers on all responses: X-Frame-Options,
 * X-Content-Type-Options, Strict-Transport-Security, Content-Security-Policy,
 * and Referrer-Policy.
 *
 * @module
 */

import type { MiddlewareHandler } from 'hono';

/**
 * Returns a middleware that appends security headers to every response.
 */
function secureHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next();
    c.header('X-Frame-Options', 'DENY');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    c.header('Content-Security-Policy', "default-src 'self'");
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  };
}

export { secureHeaders };
