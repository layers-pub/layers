/**
 * Authentication and authorization error classes.
 *
 * These extend {@link LayersError} and cover JWT validation, session management,
 * OAuth protocol errors, and DID resolution failures.
 *
 * @module
 */

import { LayersError } from '../types/errors.js';

/**
 * Thrown when JWT token validation fails.
 *
 * Covers malformed tokens, invalid signatures, missing claims,
 * and unsupported algorithms. For expired tokens specifically,
 * see {@link TokenExpiredError}.
 */
export class TokenValidationError<C extends string = 'TOKEN_VALIDATION_ERROR'> extends LayersError {
  readonly code: C;

  /**
   * @param message - description of the validation failure
   * @param code - the error code (defaults to "TOKEN_VALIDATION_ERROR")
   * @param cause - the underlying JWT library error, if any
   */
  constructor(message: string, code?: C, cause?: Error) {
    super(message, cause);
    this.code = (code ?? 'TOKEN_VALIDATION_ERROR') as C;
  }
}

/**
 * Thrown when a JWT token has expired.
 *
 * Extends {@link TokenValidationError} so callers catching the parent
 * class will also catch expiration errors. Clients should refresh
 * their session token and retry.
 */
export class TokenExpiredError extends TokenValidationError<'TOKEN_EXPIRED'> {
  /**
   * @param message - description of the expiration (defaults to "Token has expired")
   */
  constructor(message = 'Token has expired') {
    super(message, 'TOKEN_EXPIRED');
  }
}

/**
 * Thrown when a session has been explicitly revoked.
 *
 * This differs from token expiration: the session was actively invalidated
 * (e.g., user logged out, admin revoked access) rather than reaching its
 * natural TTL. The client must re-authenticate.
 */
export class SessionRevokedError extends LayersError {
  readonly code = 'SESSION_REVOKED';

  /**
   * @param message - description of the revocation (defaults to "Session has been revoked")
   */
  constructor(message = 'Session has been revoked') {
    super(message);
  }
}

/**
 * Thrown when the ATProto OAuth flow encounters a protocol-level error.
 *
 * Covers authorization endpoint failures, token exchange errors,
 * invalid redirect URIs, and DPoP binding mismatches.
 */
export class OAuthError extends LayersError {
  readonly code = 'OAUTH_ERROR';

  /**
   * @param message - description of the OAuth error
   * @param cause - the underlying OAuth library error, if any
   */
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Thrown when a DID cannot be resolved to a DID document.
 *
 * Covers network failures reaching PLC directories, malformed DID strings,
 * and DIDs that do not exist in any known directory.
 */
export class DIDResolutionError extends LayersError {
  readonly code = 'DID_RESOLUTION_ERROR';

  /** The DID that failed to resolve, if available. */
  readonly did?: string | undefined;

  /**
   * @param message - description of the resolution failure
   * @param did - the DID that could not be resolved
   * @param cause - the underlying resolution error, if any
   */
  constructor(message: string, did?: string, cause?: Error) {
    super(message, cause);
    this.did = did;
  }
}
