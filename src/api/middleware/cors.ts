/**
 * CORS middleware with configurable origin allowlist.
 *
 * @module
 */

import type { MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';

/**
 * Returns a CORS middleware configured with the given origin allowlist.
 *
 * When a single wildcard origin (`['*']`) is provided, all origins are
 * accepted. Otherwise only the listed origins are allowed.
 *
 * @param origins - allowed origin strings
 */
function corsMiddleware(origins: string[]): MiddlewareHandler {
  const origin = origins.length === 1 && origins[0] === '*' ? '*' : origins;
  return cors({ origin });
}

export { corsMiddleware };
