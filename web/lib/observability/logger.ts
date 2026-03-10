/**
 * Browser structured logger for the Layers frontend.
 *
 * Outputs JSON in production for ingestion by log collectors,
 * and formatted console output in development for readability.
 *
 * @module
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  readonly [key: string]: unknown;
}

/** Fields whose values are replaced with "[REDACTED]" before logging. */
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'cookie',
  'credential',
  'privateKey',
  'private_key',
]);

const IS_PRODUCTION = typeof window !== 'undefined' && process.env.NODE_ENV === 'production';

/**
 * Redacts sensitive values from a context object.
 *
 * Performs a shallow scan of top-level keys. Nested objects are
 * not traversed to keep the cost low in hot paths.
 */
function redact(context: LogContext): LogContext {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    result[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : value;
  }
  return result;
}

/**
 * Structured browser logger with automatic context injection.
 *
 * Each logger instance is scoped to a component name, which is
 * included in every log entry for filtering.
 */
class BrowserLogger {
  private readonly component: string;
  private readonly parentContext: LogContext;

  constructor(component: string, parentContext: LogContext = {}) {
    this.component = component;
    this.parentContext = parentContext;
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Creates a child logger that inherits this logger's context.
   *
   * @param childComponent - component name appended to the parent
   * @param extraContext - additional context merged into every log entry
   */
  child(childComponent: string, extraContext?: LogContext): BrowserLogger {
    return new BrowserLogger(`${this.component}.${childComponent}`, {
      ...this.parentContext,
      ...extraContext,
    });
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const merged: LogContext = {
      ...this.parentContext,
      ...(context ?? {}),
    };
    const safe = redact(merged);

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      ...safe,
    };

    if (IS_PRODUCTION) {
      // JSON output for log collectors.

      console[level](JSON.stringify(entry));
    } else {
      // Formatted output for developer readability.
      const prefix = `[${level.toUpperCase()}] ${this.component}`;
      if (Object.keys(safe).length > 0) {
        console[level](prefix, message, safe);
      } else {
        console[level](prefix, message);
      }
    }
  }
}

/**
 * Creates a new logger scoped to the given component name.
 *
 * @param component - name used to identify log entries (e.g., "AuthProvider")
 */
function createLogger(component: string): BrowserLogger {
  return new BrowserLogger(component);
}

export { BrowserLogger, createLogger };
export type { LogLevel, LogContext };
