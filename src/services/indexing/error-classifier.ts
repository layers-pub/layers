/**
 * Error classification for firehose event processing failures.
 *
 * @module
 */

import { NotFoundError, ValidationError } from '../../types/errors.js';

/**
 * Error categories for firehose event processing.
 */
type ErrorCategory = 'retryable' | 'permanent' | 'dependency';

/**
 * Classifies errors as retryable, permanent, or dependency-related.
 *
 * This determines whether a failed event should be retried, sent to the
 * dead letter queue, or re-queued with a dependency delay.
 */
class ErrorClassifier {
  /**
   * Classifies an error into a category.
   *
   * - `retryable`: network timeouts, connection refused, ES bulk rejection
   * - `permanent`: validation failure, malformed record, unknown NSID
   * - `dependency`: missing referenced record (e.g., expression not yet indexed)
   */
  classify(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    // Dependency errors: missing referenced records
    if (error instanceof NotFoundError) {
      return 'dependency';
    }

    // Permanent errors: validation failures
    if (error instanceof ValidationError) {
      return 'permanent';
    }

    // Permanent errors: malformed data
    if (message.includes('malformed') || message.includes('invalid record')) {
      return 'permanent';
    }

    // Retryable errors: network and connection issues
    if (
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('socket hang up') ||
      message.includes('bulk rejection') ||
      message.includes('connection') ||
      message.includes('unavailable')
    ) {
      return 'retryable';
    }

    // Default to retryable for unknown errors
    return 'retryable';
  }
}

export { ErrorClassifier };
export type { ErrorCategory };
