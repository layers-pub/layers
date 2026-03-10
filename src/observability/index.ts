/**
 * Public API for the observability module.
 *
 * Re-exports logging, telemetry, tracing, and metrics from their
 * respective submodules.
 *
 * @module
 */

export { PinoLogger, createLogger } from './logger.js';
export { initTelemetry, shutdownTelemetry } from './telemetry.js';
export type { TelemetryOptions } from './telemetry.js';
export { getActiveSpan, injectTraceContext, withSpan } from './tracer.js';
export {
  createCounter,
  createGauge,
  createHistogram,
  prometheusRegistry,
} from './prometheus-registry.js';
export { LayersMetrics } from './metrics-exporter.js';
