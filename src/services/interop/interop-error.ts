/**
 * Error class for interoperability failures with external annotation systems.
 *
 * Used when converting, matching, or indexing records from external sources
 * such as margin.at. Maps to HTTP 502 because the failure originates in
 * the external system or in the translation layer between systems.
 *
 * @module
 */

import { LayersError } from '../../types/errors.js';

/**
 * Thrown when an interoperability operation with an external annotation system fails.
 *
 * @example
 * ```typescript
 * throw new InteropError(
 *   'Failed to convert margin annotation to Layers view',
 *   'margin.at',
 *   'at.margin.annotation',
 *   originalError,
 * );
 * ```
 */
class InteropError extends LayersError {
  readonly code = 'INTEROP_ERROR';

  /**
   * @param message - description of the interop failure
   * @param source - the external system name (e.g., 'margin.at')
   * @param recordType - the external record type that caused the failure
   * @param cause - the underlying error, if any
   */
  constructor(
    message: string,
    readonly source: string,
    readonly recordType: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

export { InteropError };
