/**
 * Request context middleware.
 *
 * Generates a unique request ID, creates a child logger with context
 * bindings, and records request duration and count metrics.
 *
 * @module
 */

import { randomBytes } from 'node:crypto';

import type { MiddlewareHandler } from 'hono';

import { createLogger } from '../../observability/logger.js';
import { LayersMetrics } from '../../observability/metrics-exporter.js';

/**
 * Returns a middleware that attaches a request ID, a child logger, and
 * records HTTP duration and count metrics for every request.
 */
function requestContext(): MiddlewareHandler {
  const logger = createLogger({ service: 'http' });

  return async (c, next) => {
    const requestId = `req_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const startTime = performance.now();

    c.set('requestId', requestId);
    c.set('logger', logger.child({ requestId }));
    c.header('X-Request-Id', requestId);

    await next();

    const duration = (performance.now() - startTime) / 1_000;
    const route = c.req.routePath ?? c.req.path;
    const method = c.req.method;
    const status = String(c.res.status);

    LayersMetrics.httpRequestDuration.labels(method, route, status).observe(duration);
    LayersMetrics.httpRequestsTotal.labels(method, route, status).inc();
  };
}

export { requestContext };
