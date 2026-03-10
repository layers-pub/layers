/**
 * Error types for the Layers frontend.
 *
 * @remarks
 * Frontend error hierarchy mirrors the backend LayersError pattern for consistency.
 * All frontend errors extend LayersWebError with machine-readable codes.
 *
 * @packageDocumentation
 */

/**
 * Error severity levels for monitoring and alerting.
 */
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Serialized error format for structured logging.
 */
interface SerializedError {
  name: string;
  code: string;
  message: string;
  severity: ErrorSeverity;
  isRetryable: boolean;
  stack?: string;
  cause?: SerializedError;
  [key: string]: unknown;
}

/**
 * Base error class for all Layers frontend errors.
 *
 * @remarks
 * Follows the same pattern as the backend LayersError (src/types/errors.ts).
 * All frontend errors should extend this class rather than the native Error class.
 * This ensures consistent error code structure, enables error cause chaining
 * for debugging, captures proper stack traces, and allows type discrimination
 * via instanceof.
 *
 * @example
 * ```typescript
 * class CustomError extends LayersWebError {
 *   readonly code = 'CUSTOM_ERROR';
 *
 *   constructor(message: string) {
 *     super(message);
 *   }
 * }
 *
 * throw new CustomError('Something went wrong');
 * ```
 */
abstract class LayersWebError extends Error {
  /** Machine-readable error code. */
  abstract readonly code: string;

  /** Original error that caused this error (if any). */
  readonly cause?: Error;

  /**
   * @param message - Human-readable error message
   * @param cause - Original error (if chained)
   */
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
    Error.captureStackTrace?.(this, this.constructor);
  }

  /** Error severity for monitoring and alerting. Override in subclasses. */
  get severity(): ErrorSeverity {
    return 'medium';
  }

  /** Whether this error is retryable. Override in subclasses. */
  get isRetryable(): boolean {
    return false;
  }

  /** Converts error to a plain object for structured logging. */
  toJSON(): SerializedError {
    const result: SerializedError = {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      isRetryable: this.isRetryable,
      stack: this.stack,
    };

    if (this.cause) {
      result.cause =
        this.cause instanceof LayersWebError
          ? this.cause.toJSON()
          : {
              name: this.cause.name,
              code: 'UNKNOWN',
              message: this.cause.message,
              severity: 'medium',
              isRetryable: false,
              stack: this.cause.stack,
            };
    }

    return result;
  }
}

/**
 * API request error.
 *
 * Thrown when an API request returns a non-ok HTTP response. Captures the
 * HTTP status code and endpoint for debugging.
 *
 * @example
 * ```typescript
 * const response = await fetch('/xrpc/pub.layers.expression.getExpression');
 * if (!response.ok) {
 *   throw new APIError(
 *     `Failed to fetch expression: ${response.statusText}`,
 *     response.status,
 *     '/xrpc/pub.layers.expression.getExpression'
 *   );
 * }
 * ```
 */
class APIError extends LayersWebError {
  readonly code = 'API_ERROR';

  /** HTTP status code from the failed request (if available). */
  readonly statusCode?: number;

  /** API endpoint that was called. */
  readonly endpoint?: string;

  /**
   * @param message - Description of the API failure
   * @param statusCode - HTTP status code (e.g., 404, 500)
   * @param endpoint - API endpoint that failed
   * @param cause - Original error (if chained)
   */
  constructor(message: string, statusCode?: number, endpoint?: string, cause?: Error) {
    super(message, cause);
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }

  get severity(): ErrorSeverity {
    if (this.statusCode && this.statusCode >= 500) return 'high';
    return 'medium';
  }

  get isRetryable(): boolean {
    if (!this.statusCode) return true;
    if (this.statusCode >= 500) return true;
    if (this.statusCode === 408 || this.statusCode === 429) return true;
    return false;
  }

  toJSON(): SerializedError {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      endpoint: this.endpoint,
    };
  }
}

/**
 * Resource not found error.
 *
 * Thrown when a requested resource does not exist in the index. Includes the
 * resource type and identifier for better error messages.
 *
 * @example
 * ```typescript
 * const expression = await getExpression(uri);
 * if (!expression) {
 *   throw new NotFoundError('Expression', uri);
 * }
 * ```
 */
class NotFoundError extends LayersWebError {
  readonly code = 'NOT_FOUND';

  /** Type of resource that was not found (e.g., 'Expression', 'AnnotationLayer'). */
  readonly resourceType: string;

  /** Identifier of the resource that was not found (e.g., AT-URI). */
  readonly resourceId: string;

  /**
   * @param resourceType - Type of resource (e.g., 'Expression', 'Corpus')
   * @param resourceId - Resource identifier (e.g., AT-URI, DID)
   */
  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} not found: ${resourceId}`);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Validation error for invalid input data.
 *
 * Thrown when input data fails validation rules (required fields, format
 * constraints, business rules).
 *
 * @example
 * ```typescript
 * if (!text.trim()) {
 *   throw new ValidationError('Expression text is required', 'text', 'required');
 * }
 * ```
 */
class ValidationError extends LayersWebError {
  readonly code = 'VALIDATION_ERROR';

  /** Field that failed validation (if applicable). */
  readonly field?: string;

  /** Constraint that was violated (e.g., 'required', 'min_length', 'pattern'). */
  readonly constraint?: string;

  /**
   * @param message - Description of validation failure
   * @param field - Field that failed validation
   * @param constraint - Constraint that was violated
   * @param cause - Original error (if chained)
   */
  constructor(message: string, field?: string, constraint?: string, cause?: Error) {
    super(message, cause);
    this.field = field;
    this.constraint = constraint;
  }
}

/**
 * Authentication error for failed authentication attempts.
 *
 * Thrown when credentials are invalid, DID verification fails, the session
 * token is missing or invalid, or the OAuth flow fails.
 */
class AuthenticationError extends LayersWebError {
  readonly code = 'AUTHENTICATION_ERROR';
}

/**
 * Authorization error for insufficient permissions.
 *
 * Thrown when an authenticated user attempts an action they do not have
 * permission to perform.
 *
 * @example
 * ```typescript
 * if (!user.canManageCorpus(corpusUri)) {
 *   throw new AuthorizationError(
 *     'You do not have permission to manage this corpus',
 *     'write:corpus'
 *   );
 * }
 * ```
 */
class AuthorizationError extends LayersWebError {
  readonly code = 'AUTHORIZATION_ERROR';

  /** Required scope that the user lacks (if applicable). */
  readonly requiredScope?: string;

  /**
   * @param message - Description of authorization failure
   * @param requiredScope - Required scope (e.g., 'write:annotation')
   */
  constructor(message: string, requiredScope?: string) {
    super(message);
    this.requiredScope = requiredScope;
  }
}

/**
 * Rate limit exceeded error.
 *
 * Thrown when a client exceeds the allowed request rate. Includes the
 * retry-after value for implementing backoff.
 *
 * @example
 * ```typescript
 * if (response.status === 429) {
 *   const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60', 10);
 *   throw new RateLimitError(retryAfter);
 * }
 * ```
 */
class RateLimitError extends LayersWebError {
  readonly code = 'RATE_LIMIT_EXCEEDED';

  /** Seconds to wait before retrying. */
  readonly retryAfter: number;

  /**
   * @param retryAfter - Seconds to wait before retrying
   */
  constructor(retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
    this.retryAfter = retryAfter;
  }

  get severity(): ErrorSeverity {
    return 'low';
  }

  get isRetryable(): boolean {
    return true;
  }

  toJSON(): SerializedError {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Network error for connection failures.
 *
 * Thrown when the network request fails entirely (no internet, DNS failure,
 * connection timeout). Distinct from APIError, which indicates the server
 * responded with an error status.
 *
 * @example
 * ```typescript
 * try {
 *   await fetch('/xrpc/pub.layers.expression.getExpression');
 * } catch (err) {
 *   if (err instanceof TypeError) {
 *     throw new NetworkError('Network request failed', err);
 *   }
 *   throw err;
 * }
 * ```
 */
class NetworkError extends LayersWebError {
  readonly code = 'NETWORK_ERROR';

  /**
   * @param message - Description of the network failure
   * @param cause - Original fetch error
   */
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }

  get severity(): ErrorSeverity {
    return 'high';
  }

  get isRetryable(): boolean {
    return true;
  }
}

export type { ErrorSeverity, SerializedError };
export {
  LayersWebError,
  APIError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  NetworkError,
};
