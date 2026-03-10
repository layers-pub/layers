/**
 * Pino-based structured logger with PII redaction and OTel trace context.
 *
 * In non-production environments, logs are formatted with pino-pretty
 * for readability. In production, logs are emitted as JSON with
 * automatic traceId and spanId injection from the active OpenTelemetry
 * span.
 *
 * @module
 */

import { trace } from '@opentelemetry/api';
import pino from 'pino';

import type { ILogger, LogContext } from '../types/interfaces/logger.interface.js';

/**
 * Wraps a Pino logger instance behind the {@link ILogger} interface.
 */
class PinoLogger implements ILogger {
  private readonly logger: pino.Logger;

  constructor(logger: pino.Logger) {
    this.logger = logger;
  }

  info(msg: string, context?: LogContext): void {
    this.logger.info(context ?? {}, msg);
  }

  warn(msg: string, context?: LogContext): void {
    this.logger.warn(context ?? {}, msg);
  }

  error(msg: string, context?: LogContext): void {
    this.logger.error(context ?? {}, msg);
  }

  debug(msg: string, context?: LogContext): void {
    this.logger.debug(context ?? {}, msg);
  }

  trace(msg: string, context?: LogContext): void {
    this.logger.trace(context ?? {}, msg);
  }

  fatal(msg: string, context?: LogContext): void {
    this.logger.fatal(context ?? {}, msg);
  }

  child(bindings: LogContext): ILogger {
    return new PinoLogger(this.logger.child(bindings));
  }
}

/**
 * Creates a configured {@link ILogger} instance.
 *
 * @param options - optional overrides for log level and service name
 * @param options.level - log level (defaults to LOG_LEVEL env var or "info")
 * @param options.service - service name included in every log entry
 * @returns a new logger instance
 *
 * @example
 * ```typescript
 * const logger = createLogger({ level: "debug", service: "indexer" });
 * logger.info("Firehose connected", { relay: "wss://bsky.network" });
 * ```
 */
function createLogger(options?: { level?: string; service?: string }): ILogger {
  const isProduction = process.env.NODE_ENV === 'production';

  const pinoLogger = pino({
    level: options?.level ?? process.env.LOG_LEVEL ?? 'info',
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.apikey',
      '*.secret',
      '*.credential',
      '*.accessToken',
      '*.refreshToken',
      '*.privateKey',
    ],
    mixin: () => {
      const span = trace.getActiveSpan();
      if (span) {
        const ctx = span.spanContext();
        return { traceId: ctx.traceId, spanId: ctx.spanId };
      }
      return {};
    },
    ...(options?.service ? { name: options.service } : {}),
    ...(!isProduction
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true },
          },
        }
      : {}),
  });

  return new PinoLogger(pinoLogger);
}

export { PinoLogger, createLogger };
