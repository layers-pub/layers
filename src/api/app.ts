/**
 * Hono application factory.
 *
 * Creates a fully configured Hono app with the 7-layer middleware stack,
 * health/readiness/metrics endpoints, and XRPC route registration.
 *
 * @module
 */

import type { Client } from '@elastic/elasticsearch';
import { Hono } from 'hono';
import type { Redis } from 'ioredis';
import type { Driver } from 'neo4j-driver';
import type { Pool } from 'pg';
import type { DependencyContainer } from 'tsyringe';

import type { NodeOAuthClient } from '@atproto/oauth-client-node';

import { dlqAdminRoutes } from './handlers/rest/v1/admin/dlq.js';
import { oauthRoutes } from './handlers/rest/v1/auth/oauth.js';
import { healthRoutes } from './handlers/rest/v1/health.js';
import {
  authenticate,
  corsMiddleware,
  createRateLimiter,
  requireRole,
  requestContext,
  secureHeaders,
  serviceInjection,
} from './middleware/index.js';
import type { SessionManager } from '../auth/session-manager.js';
import { errorHandler } from './xrpc/error-handler.js';
import { registerXRPCRoutes } from './xrpc/router.js';
import type { XRPCMethodMap } from './xrpc/types.js';

/**
 * Dependencies required to create the Hono application.
 */
interface AppDependencies {
  readonly container: DependencyContainer;
  readonly corsOrigins: string[];
  readonly pgPool: Pool;
  readonly esClient: Client;
  readonly neo4jDriver: Driver;
  readonly redis: Redis;
  readonly sessionManager: SessionManager;
  readonly oauthClient?: NodeOAuthClient | undefined;
  readonly xrpcMethods?: XRPCMethodMap;
}

/**
 * Creates and configures the Hono application.
 *
 * Applies middleware in a fixed order (security headers, CORS, DI injection,
 * request context, authentication, rate limiting), registers the global
 * error handler, wires up health endpoints, and registers any provided
 * XRPC methods.
 *
 * @param deps - external clients and configuration
 * @returns a fully configured Hono instance
 */
function createApp(deps: AppDependencies): Hono {
  const app = new Hono();

  // 7-layer middleware stack (order matters)
  app.use('*', secureHeaders());
  app.use('*', corsMiddleware(deps.corsOrigins));
  app.use('*', serviceInjection(deps.container));
  app.use('*', requestContext());
  app.use('*', authenticate());
  app.use('*', createRateLimiter({ redis: deps.redis }));

  // Global error handler
  app.onError(errorHandler);

  // Health, readiness, and metrics endpoints
  healthRoutes(app, {
    pgPool: deps.pgPool,
    esClient: deps.esClient,
    neo4jDriver: deps.neo4jDriver,
    redis: deps.redis,
  });

  // OAuth authentication endpoints
  if (deps.oauthClient) {
    oauthRoutes(app, {
      oauthClient: deps.oauthClient,
      sessionManager: deps.sessionManager,
    });
  }

  // DLQ admin endpoints (require admin role)
  app.use('/admin/*', requireRole('admin'));
  dlqAdminRoutes(app, deps.pgPool);

  // XRPC routes
  registerXRPCRoutes(app, deps.xrpcMethods ?? {});

  return app;
}

export { createApp };
export type { AppDependencies };
