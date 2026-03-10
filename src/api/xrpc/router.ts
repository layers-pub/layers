/**
 * XRPC route registration utility.
 *
 * Maps NSID-keyed method definitions to `GET /xrpc/:nsid` routes on the
 * Hono application.
 *
 * @module
 */

import type { Hono } from 'hono';

import type { XRPCMethodMap } from './types.js';

/**
 * Registers XRPC method handlers on the Hono app.
 *
 * Queries are registered as `GET /xrpc/{nsid}` and procedures as
 * `POST /xrpc/{nsid}`.
 *
 * @param app - the Hono application instance
 * @param methods - a map of NSID strings to XRPC method definitions
 */
function registerXRPCRoutes(app: Hono, methods: XRPCMethodMap): void {
  for (const [nsid, method] of Object.entries(methods)) {
    if (method.type === 'procedure') {
      app.post(`/xrpc/${nsid}`, method.handler);
    } else {
      app.get(`/xrpc/${nsid}`, method.handler);
    }
  }
}

export { registerXRPCRoutes };
