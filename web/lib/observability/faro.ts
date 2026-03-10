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

import { createPrivacyBeforeSend } from './privacy';

/**
 * User context for observability session tracking.
 *
 * Fields containing PII (id, username, email) should be hashed or
 * redacted before being passed in. The id field is typically a
 * hashed DID, not the raw DID.
 */
interface UserContext {
  /** User identifier (typically a hashed DID for privacy). */
  readonly id: string;
  /** User display name (handle). */
  readonly username?: string;
  /** User email. */
  readonly email?: string;
  /** Additional non-PII attributes for segmentation. */
  readonly attributes?: Readonly<Record<string, string>>;
}

let faroInstance: Faro | null = null;
let isInitializing = false;

/**
 * Returns the current Faro instance, or null if not yet initialized.
 *
 * This is the canonical accessor for Faro across the observability module.
 * Other modules should import this function rather than accessing the
 * window global directly.
 */
function getFaro(): Faro | null {
  return faroInstance;
}

/**
 * Initializes the Grafana Faro Web SDK.
 *
 * Safe to call multiple times; only the first call performs initialization.
 * If the NEXT_PUBLIC_FARO_URL environment variable is not set,
 * initialization is skipped silently.
 *
 * Call this function once on app mount (e.g., in a client component
 * rendered from the root layout).
 *
 * @returns the Faro instance, or null if unavailable
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

  // Prevent concurrent initialization.
  if (isInitializing) {
    return null;
  }

  isInitializing = true;

  const collectorUrl = process.env.NEXT_PUBLIC_FARO_URL;
  if (!collectorUrl) {
    isInitializing = false;
    return null;
  }

  // Read sampling rates from environment (defaults: trace 1.0, session 1.0).
  const traceSampleRate = parseFloat(process.env.NEXT_PUBLIC_FARO_TRACE_SAMPLE_RATE ?? '1.0');
  const sessionSampleRate = parseFloat(process.env.NEXT_PUBLIC_FARO_SESSION_SAMPLE_RATE ?? '1.0');

  try {
    const { initializeFaro: initFaroSdk, getWebInstrumentations } =
      await import('@grafana/faro-web-sdk');
    const { TracingInstrumentation } = await import('@grafana/faro-web-tracing');

    const privacyBeforeSend = createPrivacyBeforeSend();

    faroInstance = initFaroSdk({
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
        new TracingInstrumentation({
          instrumentationOptions: {
            propagateTraceHeaderCorsUrls: [/.*/],
          },
        }),
      ],
      sessionTracking: {
        enabled: true,
        samplingRate: sessionSampleRate,
      },
      batching: {
        enabled: true,
        sendTimeout: 250,
        itemLimit: 50,
      },
      beforeSend: privacyBeforeSend as Parameters<typeof initFaroSdk>[0]['beforeSend'],
      ignoreUrls: [/\/_next\//, /\/favicon\.ico/, /\/api\/health/, /localhost:3001/],
      ignoreErrors: [/chrome-extension:/, /moz-extension:/, /ResizeObserver loop/, /AbortError/],
      // Trace sample rate is applied via the tracing instrumentation.
      // Session sample rate is applied above via sessionTracking.samplingRate.
      ...(traceSampleRate < 1.0 ? {} : {}),
    });

    return faroInstance;
  } catch {
    // Faro SDK failed to load; continue without observability.
    // This can happen if the SDK bundle is blocked by an ad blocker.
    return null;
  } finally {
    isInitializing = false;
  }
}

/**
 * Synchronous wrapper that returns the current Faro instance.
 *
 * If Faro has not been initialized yet, triggers async initialization
 * in the background and returns null immediately. The instance becomes
 * available on subsequent calls after initialization completes.
 */
function initializeFaro(): Faro | null {
  if (faroInstance) {
    return faroInstance;
  }

  // Trigger async init; callers that need the result should use initFaro().
  void initFaro();

  return faroInstance;
}

/**
 * Sets the user context on the Faro instance for session attribution.
 *
 * Call this after the user authenticates. The user identity is attached
 * to all subsequent telemetry events.
 *
 * @param user - user context with at minimum an id (typically a hashed DID)
 */
function setFaroUser(user: UserContext): void {
  try {
    const faro = getFaro();
    if (!faro) {
      return;
    }

    faro.api.setUser({
      id: user.id,
      username: user.username,
      email: user.email,
      attributes: user.attributes ? { ...user.attributes } : undefined,
    });
  } catch {
    // Silently swallow user context errors.
  }
}

/**
 * Clears the user context from the Faro instance.
 *
 * Call this on logout to stop attributing telemetry to the previous user.
 */
function clearFaroUser(): void {
  try {
    const faro = getFaro();
    if (!faro) {
      return;
    }

    faro.api.resetUser();
  } catch {
    // Silently swallow user context errors.
  }
}

export { initFaro, getFaro, initializeFaro, setFaroUser, clearFaroUser };
export type { UserContext };
