/**
 * Observability barrel export.
 *
 * Re-exports all observability modules: Faro initialization, structured
 * logging, W3C trace context, PII scrubbing, Web Vitals, custom events,
 * and React context hooks.
 *
 * @module
 */

// Faro
export { initFaro, getFaro, initializeFaro, setFaroUser, clearFaroUser } from './faro';
export type { UserContext } from './faro';

// Logger
export { BrowserLogger, createLogger } from './logger';
export type { LogLevel, LogContext } from './logger';

// Trace context
export {
  generateTraceContext,
  generateSpanId,
  initializeTraceContext,
  getCurrentTraceContext,
  createChildSpan,
  parseTraceparent,
  resetTraceContext,
} from './trace';
export type { TraceContext } from './trace';

// Privacy / PII scrubbing
export {
  scrubString,
  scrubUrl,
  scrubHeaders,
  scrubObject,
  scrubError,
  createPrivacyBeforeSend,
  REDACTED,
} from './privacy';

// Web Vitals
export {
  initWebVitals,
  getRating,
  getPerformanceSummary,
  reportTiming,
  createPerformanceMark,
} from './web-vitals';
export type { Rating, MetricThreshold, PerformanceSummary } from './web-vitals';

// Custom events
export { events, hashDid } from './custom-events';
export type { TimerHandle } from './custom-events';

// React context and hooks
export {
  ObservabilityProvider,
  useObservability,
  useTraceId,
  useTracedOperation,
  usePushEvent,
  usePushError,
} from './context';
export type { ObservabilityContextValue, ObservabilityProviderProps } from './context';
