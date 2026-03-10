/**
 * Grafana Faro initialization for browser-side observability.
 *
 * Faro provides real user monitoring (RUM), error tracking,
 * Web Vitals collection, and distributed tracing propagation
 * from the browser to the backend API.
 *
 * @module
 */

import type { Faro } from '@grafana/faro-web-sdk';

let faroInstance: Faro | null = null;

/**
 * Initializes the Grafana Faro Web SDK.
 *
 * This function is safe to call multiple times; it only initializes
 * once. If the NEXT_PUBLIC_FARO_URL environment variable is not set,
 * initialization is skipped silently.
 *
 * Call this function once on app mount (e.g., in a client component
 * rendered from the root layout).
 */
async function initFaro(): Promise<Faro | null> {
  // Guard against server-side execution.
  if (typeof window === 'undefined') {
    return null;
  }

  // Guard against double initialization.
  if (faroInstance) {
    return faroInstance;
  }

  const collectorUrl = process.env.NEXT_PUBLIC_FARO_URL;
  if (!collectorUrl) {
    return null;
  }

  try {
    const { initializeFaro, getWebInstrumentations } = await import('@grafana/faro-web-sdk');
    const { TracingInstrumentation } = await import('@grafana/faro-web-tracing');

    faroInstance = initializeFaro({
      url: collectorUrl,
      app: {
        name: 'layers-web',
        version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0',
        environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'development',
      },
      instrumentations: [
        ...getWebInstrumentations({
          captureConsole: true,
        }),
        new TracingInstrumentation(),
      ],
      sessionTracking: {
        enabled: true,
      },
      batching: {
        enabled: true,
        sendTimeout: 250,
        itemLimit: 50,
      },
    });

    return faroInstance;
  } catch {
    // Faro SDK failed to load; continue without observability.
    // This can happen if the SDK bundle is blocked by an ad blocker.
    return null;
  }
}

export { initFaro };
