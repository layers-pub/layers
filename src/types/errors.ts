/**
 * Structured error hierarchy for the Layers appview.
 *
 * All errors extend {@link LayersError} rather than the native `Error` class.
 * This ensures consistent error codes, optional cause chaining, and
 * deterministic HTTP status mapping in API handlers.
 *
 * @module
 */

/**
 * Base error class for all Layers errors.
 *
 * Subclasses must define a `code` property for programmatic error identification.
 * The optional `cause` parameter enables error chaining for root-cause analysis.
 *
 * @example
 * ```typescript
 * class MyCustomError extends LayersError {
 *   readonly code = 'MY_CUSTOM_ERROR';
 *   constructor(message: string, cause?: Error) {
 *     super(message, cause);
 *   }
 * }
 * ```
 */
export abstract class LayersError extends Error {
  abstract readonly code: string;

  constructor(message: string, cause?: Error) {
    super(message, { cause });
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when an operation violates ATProto compliance rules.
 *
 * Examples: attempting to write to a user PDS, storing blob data
 * instead of BlobRefs, or failing to track PDS source.
 */
export class ComplianceError extends LayersError {
  readonly code = 'COMPLIANCE_VIOLATION';

  /**
   * @param message - description of the compliance violation
   * @param rule - the specific ATProto rule that was violated
   * @param cause - the underlying error, if any
   */
  constructor(
    message: string,
    readonly rule: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

/**
 * Thrown when a requested resource is not found in the index.
 *
 * Maps to HTTP 404. The resource may exist in the user's PDS but
 * has not yet been indexed by the firehose consumer.
 */
export class NotFoundError extends LayersError {
  readonly code = 'NOT_FOUND';

  /**
   * @param resourceType - the type of resource (e.g., "Expression", "AnnotationLayer")
   * @param identifier - the AT-URI or other identifier that was not found
   */
  constructor(
    readonly resourceType: string,
    readonly identifier: string,
  ) {
    super(`${resourceType} not found: ${identifier}`);
  }
}

/**
 * Thrown when input data fails validation.
 *
 * Maps to HTTP 400. Used for malformed AT-URIs, invalid query parameters,
 * and records that do not conform to their lexicon schema.
 */
export class ValidationError extends LayersError {
  readonly code = 'VALIDATION_ERROR';

  /**
   * @param message - description of the validation failure
   * @param field - the field that failed validation (if applicable)
   * @param constraint - the constraint that was violated (if applicable)
   */
  constructor(
    message: string,
    readonly field?: string,
    readonly constraint?: string,
  ) {
    super(message);
  }
}

/**
 * Thrown when authentication fails.
 *
 * Maps to HTTP 401. Covers missing credentials, invalid tokens,
 * and expired sessions.
 */
export class AuthenticationError extends LayersError {
  readonly code = 'AUTHENTICATION_ERROR';
}

/**
 * Thrown when an authenticated user lacks permission for the requested operation.
 *
 * Maps to HTTP 403. The user is authenticated but their role or scopes
 * do not include the required permission.
 */
export class AuthorizationError extends LayersError {
  readonly code = 'AUTHORIZATION_ERROR';

  /**
   * @param message - description of the authorization failure
   * @param requiredScope - the scope or permission that was missing
   * @param cause - the underlying error, if any
   */
  constructor(
    message: string,
    readonly requiredScope?: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

/**
 * Thrown when a client exceeds the rate limit.
 *
 * Maps to HTTP 429. Includes retry-after information for the client.
 */
export class RateLimitError extends LayersError {
  readonly code = 'RATE_LIMIT_EXCEEDED';

  /**
   * @param message - description of the rate limit violation
   * @param retryAfterSeconds - seconds until the client can retry
   */
  constructor(
    message: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message);
  }
}

/**
 * Thrown when a database operation fails.
 *
 * Maps to HTTP 500. Covers connection failures, query errors,
 * and constraint violations across all storage backends
 * (PostgreSQL, Elasticsearch, Neo4j, Redis).
 */
export class DatabaseError extends LayersError {
  readonly code = 'DATABASE_ERROR';

  /**
   * @param message - description of the database failure
   * @param cause - the underlying database driver error
   */
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Operations that a plugin can perform, used for error classification.
 */
export type PluginOperation =
  | 'init'
  | 'start'
  | 'stop'
  | 'dispose'
  | 'import'
  | 'export'
  | 'enrich'
  | 'resolve'
  | 'search'
  | 'validate';

/**
 * Thrown when a plugin operation fails.
 *
 * Maps to HTTP 500. Covers initialization failures, import errors,
 * and resolution failures in format importers and backlink plugins.
 */
export class PluginError extends LayersError {
  readonly code = 'PLUGIN_ERROR';

  /**
   * @param pluginName - the name of the plugin that failed
   * @param operation - the operation that was being performed
   * @param message - description of the failure
   * @param cause - the underlying error from the plugin
   */
  constructor(
    readonly pluginName: string,
    readonly operation: PluginOperation,
    message: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

/**
 * Categories of sandbox violations that a plugin can trigger.
 */
export type SandboxViolationType =
  | 'cpu_limit'
  | 'memory_limit'
  | 'time_limit'
  | 'network_violation'
  | 'filesystem_violation'
  | 'api_violation';

/**
 * Thrown when a sandboxed plugin violates its resource or access constraints.
 *
 * Maps to HTTP 500. The plugin is terminated and the violation is logged
 * for administrative review.
 */
export class SandboxViolationError extends LayersError {
  readonly code = 'SANDBOX_VIOLATION';

  /**
   * @param pluginName - the name of the plugin that violated the sandbox
   * @param violationType - the category of violation
   * @param message - description of the violation
   */
  constructor(
    readonly pluginName: string,
    readonly violationType: SandboxViolationType,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Thrown when a required external service is unavailable.
 *
 * Maps to HTTP 503. Used when a storage backend, the ATProto relay,
 * or another upstream dependency cannot be reached.
 */
export class ServiceUnavailableError extends LayersError {
  readonly code = 'SERVICE_UNAVAILABLE';

  /**
   * @param service - the name of the unavailable service
   * @param message - description of the unavailability
   * @param cause - the underlying connection or timeout error
   */
  constructor(
    readonly service: string,
    message: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}
