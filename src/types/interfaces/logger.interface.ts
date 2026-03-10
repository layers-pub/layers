/**
 * Abstract logger interface for dependency injection.
 *
 * All logging implementations (Pino, test doubles) conform to this
 * interface, allowing services to remain decoupled from the concrete
 * logger.
 *
 * @module
 */

/**
 * Contextual key-value pairs attached to a log entry.
 */
export type LogContext = Record<string, unknown>;

/**
 * Structured logger with leveled output and child logger support.
 */
export interface ILogger {
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext): void;
  error(msg: string, context?: LogContext): void;
  debug(msg: string, context?: LogContext): void;
  trace(msg: string, context?: LogContext): void;
  fatal(msg: string, context?: LogContext): void;

  /**
   * Creates a child logger that inherits the parent's configuration
   * and merges the provided bindings into every log entry.
   *
   * @param bindings - key-value pairs to include in all child log entries
   * @returns a new logger instance with the merged bindings
   */
  child(bindings: LogContext): ILogger;
}
