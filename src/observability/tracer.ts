/**
 * Tracer utilities for creating and managing OpenTelemetry spans.
 *
 * Provides a pre-configured tracer instance and helper functions
 * for common span operations: wrapping async work in a span,
 * retrieving the active span, and injecting trace context into
 * carrier objects for cross-service propagation.
 *
 * @module
 */

import { type Span, context, propagation, trace } from '@opentelemetry/api';

const tracer = trace.getTracer('layers-appview');

/**
 * Returns the currently active span, or `undefined` if no span
 * is active in the current context.
 */
function getActiveSpan(): Span | undefined {
  return trace.getActiveSpan();
}

/**
 * Executes an async function within a new span.
 *
 * The span is automatically ended after the function completes
 * (whether it resolves or rejects). If the function throws, the
 * error is recorded on the span before re-throwing.
 *
 * @param name - the span name (typically the operation being performed)
 * @param fn - the async function to execute within the span
 * @returns the result of the wrapped function
 *
 * @example
 * ```typescript
 * const result = await withSpan("indexExpression", async (span) => {
 *   span.setAttribute("layers.uri", uri);
 *   return await expressionService.index(record);
 * });
 * ```
 */
async function withSpan<T>(name: string, fn: (span: Span) => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await fn(span);
      return result;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Injects the current trace context (traceId, spanId, traceFlags)
 * into a carrier object for propagation across service boundaries.
 *
 * @param carrier - a mutable record that receives the propagation headers
 *
 * @example
 * ```typescript
 * const headers: Record<string, string> = {};
 * injectTraceContext(headers);
 * await fetch(url, { headers });
 * ```
 */
function injectTraceContext(carrier: Record<string, string>): void {
  propagation.inject(context.active(), carrier);
}

export { getActiveSpan, injectTraceContext, withSpan };
