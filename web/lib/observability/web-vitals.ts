/**
 * Web Vitals and performance measurement utilities.
 *
 * Wraps the browser Performance API to create named marks and measures
 * that can be correlated with Grafana Faro traces.
 *
 * @module
 */

/**
 * Creates a performance mark with the given name and returns a function
 * that ends the mark and returns the elapsed duration in milliseconds.
 *
 * Falls back gracefully when the Performance API is unavailable (SSR).
 *
 * @param name - mark name (should be unique per measurement)
 * @returns a function to end the mark and get the duration
 */
function createPerformanceMark(name: string): () => number {
  if (typeof performance === 'undefined' || !performance.mark) {
    const start = Date.now();
    return () => Date.now() - start;
  }

  const startMark = `${name}_start`;

  try {
    performance.mark(startMark);
  } catch {
    const start = Date.now();
    return () => Date.now() - start;
  }

  return (): number => {
    const endMark = `${name}_end`;
    try {
      performance.mark(endMark);
      const measure = performance.measure(name, startMark, endMark);
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(name);
      return Math.round(measure.duration);
    } catch {
      return 0;
    }
  };
}

/**
 * Initializes Web Vitals reporting via Faro.
 *
 * Collects CLS, FID, FCP, LCP, and TTFB metrics and pushes them as
 * Faro events. Returns a cleanup function (currently a no-op, but
 * reserved for future observer teardown).
 */
function initWebVitals(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  // Web Vitals are collected automatically by the Faro SDK's
  // getWebInstrumentations() call. This function exists as an
  // explicit initialization point that the ObservabilityProvider
  // can call and track.
  return () => {};
}

// ---------------------------------------------------------------------------
// Rating utilities
// ---------------------------------------------------------------------------

/** Web Vitals rating category. */
type Rating = 'good' | 'needs-improvement' | 'poor';

/** Thresholds for a single metric rating. */
interface MetricThreshold {
  readonly good: number;
  readonly poor: number;
}

/** Default thresholds based on Google Web Vitals recommendations. */
const DEFAULT_THRESHOLDS: Readonly<Record<string, MetricThreshold>> = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Returns a rating for a metric value based on Web Vitals thresholds.
 *
 * @param metricName - the metric name (LCP, FID, CLS, FCP, TTFB)
 * @param value - the metric value
 */
function getRating(metricName: string, value: number): Rating {
  const threshold = DEFAULT_THRESHOLDS[metricName];
  if (!threshold) return 'good';
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/** Summary of current performance metrics. */
interface PerformanceSummary {
  readonly navigationStart: number;
  readonly domContentLoaded: number;
  readonly loadComplete: number;
  readonly resourceCount: number;
}

/**
 * Returns a summary of the current page performance timing.
 */
function getPerformanceSummary(): PerformanceSummary | null {
  if (typeof performance === 'undefined') return null;

  const nav = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (!nav) return null;

  return {
    navigationStart: Math.round(nav.startTime),
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
    loadComplete: Math.round(nav.loadEventEnd),
    resourceCount: performance.getEntriesByType('resource').length,
  };
}

/**
 * Reports a named timing measurement as a performance measure entry.
 *
 * @param name - the measurement name
 * @param durationMs - duration in milliseconds
 */
function reportTiming(name: string, durationMs: number): void {
  if (typeof performance === 'undefined') return;

  try {
    performance.measure(`layers:${name}`, {
      start: performance.now() - durationMs,
      duration: durationMs,
    });
  } catch {
    // Silently ignore measurement errors.
  }
}

export { createPerformanceMark, initWebVitals, getRating, getPerformanceSummary, reportTiming };
export type { Rating, MetricThreshold, PerformanceSummary };
