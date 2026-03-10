/**
 * Prometheus metric registry and factory functions.
 *
 * Provides a shared registry with default Node.js process metrics
 * (prefixed with `layers_`) and typed factory functions for creating
 * counters, gauges, and histograms that auto-register.
 *
 * @module
 */

import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

const prometheusRegistry = new Registry();

collectDefaultMetrics({
  register: prometheusRegistry,
  prefix: 'layers_',
});

/**
 * Creates a Prometheus counter registered to the shared registry.
 *
 * @param options - counter name, help text, and optional label names
 * @returns a new Counter instance
 */
function createCounter(options: { name: string; help: string; labelNames?: string[] }): Counter {
  return new Counter({
    ...options,
    registers: [prometheusRegistry],
  });
}

/**
 * Creates a Prometheus gauge registered to the shared registry.
 *
 * @param options - gauge name, help text, and optional label names
 * @returns a new Gauge instance
 */
function createGauge(options: { name: string; help: string; labelNames?: string[] }): Gauge {
  return new Gauge({
    ...options,
    registers: [prometheusRegistry],
  });
}

/**
 * Creates a Prometheus histogram registered to the shared registry.
 *
 * @param options - histogram name, help text, optional label names and buckets
 * @returns a new Histogram instance
 */
function createHistogram(options: {
  name: string;
  help: string;
  labelNames?: string[];
  buckets?: number[];
}): Histogram {
  return new Histogram({
    ...options,
    registers: [prometheusRegistry],
  });
}

export { createCounter, createGauge, createHistogram, prometheusRegistry };
