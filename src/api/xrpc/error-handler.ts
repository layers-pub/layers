/**
 * Global error handler for the Hono application.
 *
 * Maps {@link LayersError} subclasses to appropriate HTTP status codes
 * and structured XRPC error responses.
 *
 * @module
 */

import type { Context } from 'hono';
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status';

import {
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  type LayersError,
  NotFoundError,
  RateLimitError,
  ServiceUnavailableError,
  ValidationError,
} from '../../types/errors.js';

/**
 * Error-to-HTTP status mapping for LayersError subclasses.
 */
const ERROR_MAP: readonly {
  readonly type: new (...args: never[]) => LayersError;
  readonly status: StatusCode;
  readonly xrpcCode: string;
}[] = [
  { type: NotFoundError, status: 404, xrpcCode: 'RecordNotFound' },
  { type: ValidationError, status: 400, xrpcCode: 'InvalidRequest' },
  { type: AuthenticationError, status: 401, xrpcCode: 'AuthRequired' },
  { type: AuthorizationError, status: 403, xrpcCode: 'Forbidden' },
  { type: RateLimitError, status: 429, xrpcCode: 'RateLimitExceeded' },
  { type: DatabaseError, status: 500, xrpcCode: 'InternalServerError' },
  {
    type: ServiceUnavailableError,
    status: 503,
    xrpcCode: 'ServiceUnavailable',
  },
];

/**
 * Maps errors to structured XRPC responses with appropriate HTTP status.
 *
 * Known {@link LayersError} subclasses are mapped to their specific status
 * codes. Unknown errors produce a generic 500 response. Rate limit errors
 * include a `Retry-After` header.
 *
 * @param err - the thrown error
 * @param c - the Hono request context
 * @returns a JSON response with the error details
 */
function errorHandler(err: Error, c: Context): Response {
  const requestId = (c.get('requestId') as string | undefined) ?? 'unknown';

  for (const mapping of ERROR_MAP) {
    if (err instanceof mapping.type) {
      if (err instanceof RateLimitError) {
        c.header('Retry-After', String(err.retryAfterSeconds));
      }
      return c.json(
        { error: mapping.xrpcCode, message: err.message, requestId },
        mapping.status as ContentfulStatusCode,
      );
    }
  }

  return c.json(
    {
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
      requestId,
    },
    500,
  );
}

export { errorHandler };
