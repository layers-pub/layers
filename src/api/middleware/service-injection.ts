/**
 * Dependency injection middleware.
 *
 * Injects the tsyringe DI container into the Hono context so downstream
 * handlers can resolve services.
 *
 * @module
 */

import type { MiddlewareHandler } from 'hono';
import type { DependencyContainer } from 'tsyringe';

/**
 * Returns a middleware that stores the DI container on the Hono context.
 *
 * @param container - the tsyringe container to inject
 */
function serviceInjection(container: DependencyContainer): MiddlewareHandler {
  return async (c, next) => {
    c.set('container', container);

    // Expose SessionManager for the authenticate middleware
    if (container.isRegistered('SessionManager')) {
      c.set('sessionManager', container.resolve('SessionManager'));
    }

    await next();
  };
}

export { serviceInjection };
