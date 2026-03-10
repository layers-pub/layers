/**
 * W3C Trace Context implementation for browser-side distributed tracing.
 *
 * Generates and manages trace context (traceparent headers) for
 * correlating frontend requests with backend spans.
 *
 * @module
 */

/**
 * W3C Trace Context fields extracted from or formatted into a traceparent header.
 */
export interface TraceContext {
  /** Full traceparent header value (version-traceId-spanId-traceFlags). */
  readonly traceparent: string;
  /** 32-character lowercase hex trace identifier. */
  readonly traceId: string;
  /** 16-character lowercase hex span identifier. */
  readonly spanId: string;
  /** 2-character hex trace flags (e.g., "01" for sampled). */
  readonly traceFlags: string;
}

const TRACE_VERSION = '00';
const TRACE_ID_LENGTH = 32;
const SPAN_ID_LENGTH = 16;
const DEFAULT_TRACE_FLAGS = '01';

const TRACEPARENT_REGEX = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

let currentTraceContext: TraceContext | null = null;

/**
 * Generates a random hex string of the specified byte length using
 * crypto.getRandomValues.
 *
 * @param byteLength - number of random bytes (output hex length is 2x this)
 * @returns lowercase hex string
 */
function randomHex(byteLength: number): string {
  if (typeof globalThis.crypto === 'undefined') {
    // Fallback for environments without Web Crypto (e.g., SSR without polyfill).
    let hex = '';
    for (let i = 0; i < byteLength * 2; i++) {
      hex += Math.floor(Math.random() * 16).toString(16);
    }
    return hex;
  }
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Generates a new 32-character hex trace ID.
 */
function generateTraceId(): string {
  return randomHex(TRACE_ID_LENGTH / 2);
}

/**
 * Generates a new 16-character hex span ID.
 */
function generateSpanId(): string {
  return randomHex(SPAN_ID_LENGTH / 2);
}

/**
 * Builds a TraceContext from the given trace ID, span ID, and flags.
 */
function buildTraceContext(traceId: string, spanId: string, traceFlags: string): TraceContext {
  return {
    traceparent: `${TRACE_VERSION}-${traceId}-${spanId}-${traceFlags}`,
    traceId,
    spanId,
    traceFlags,
  };
}

/**
 * Generates a fresh TraceContext with new trace ID and span ID.
 */
function generateTraceContext(): TraceContext {
  return buildTraceContext(generateTraceId(), generateSpanId(), DEFAULT_TRACE_FLAGS);
}

/**
 * Initializes (or resets) the module-level trace context.
 *
 * Call this once at application startup (e.g., on page load) to
 * establish a root trace context for the session. Subsequent calls
 * to getCurrentTraceContext return this context.
 *
 * @returns the newly created root trace context
 */
function initializeTraceContext(): TraceContext {
  currentTraceContext = generateTraceContext();
  return currentTraceContext;
}

/**
 * Returns the current module-level trace context.
 *
 * If no context has been initialized, creates one automatically.
 */
function getCurrentTraceContext(): TraceContext {
  if (!currentTraceContext) {
    currentTraceContext = generateTraceContext();
  }
  return currentTraceContext;
}

/**
 * Creates a child span context that shares the current trace ID
 * but has a new span ID.
 *
 * If no trace context exists yet, one is initialized first.
 */
function createChildSpan(): TraceContext {
  const parent = getCurrentTraceContext();
  const childContext = buildTraceContext(parent.traceId, generateSpanId(), parent.traceFlags);
  currentTraceContext = childContext;
  return childContext;
}

/**
 * Parses a W3C traceparent header string into a TraceContext.
 *
 * Returns null if the header is malformed or uses an unsupported version.
 *
 * @param header - traceparent header value
 */
function parseTraceparent(header: string): TraceContext | null {
  const match = TRACEPARENT_REGEX.exec(header.trim().toLowerCase());
  if (!match) {
    return null;
  }

  const [, version, traceId, spanId, traceFlags] = match;
  if (!version || !traceId || !spanId || !traceFlags) {
    return null;
  }

  // Reject all-zero trace or span IDs.
  if (/^0+$/.test(traceId) || /^0+$/.test(spanId)) {
    return null;
  }

  return buildTraceContext(traceId, spanId, traceFlags);
}

/**
 * Resets the module-level trace context to null.
 *
 * The next call to getCurrentTraceContext or initializeTraceContext
 * will generate a new root context.
 */
function resetTraceContext(): void {
  currentTraceContext = null;
}

export {
  generateTraceContext,
  generateSpanId,
  initializeTraceContext,
  getCurrentTraceContext,
  createChildSpan,
  parseTraceparent,
  resetTraceContext,
};
