/**
 * OpenTelemetry SDK initialization for traces and metrics.
 *
 * Configures the NodeSDK with OTLP exporters for both traces and
 * metrics, auto-instruments common Node.js libraries (pg, ioredis,
 * Hono, etc.), and attaches service resource attributes.
 *
 * @module
 */

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

/**
 * Options for configuring the OpenTelemetry SDK.
 */
interface TelemetryOptions {
  readonly serviceName?: string;
  readonly environment?: string;
}

/**
 * Initializes and starts the OpenTelemetry SDK.
 *
 * Call this as early as possible in the process lifecycle (before
 * importing instrumented libraries) so auto-instrumentation hooks
 * are installed.
 *
 * @param options - optional service name and environment overrides
 * @returns the started SDK instance, needed for {@link shutdownTelemetry}
 *
 * @example
 * ```typescript
 * const sdk = initTelemetry({ serviceName: "layers-indexer" });
 * // ... application runs ...
 * await shutdownTelemetry(sdk);
 * ```
 */
function initTelemetry(options?: TelemetryOptions): NodeSDK {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: options?.serviceName ?? 'layers-appview',
      [SEMRESATTRS_SERVICE_VERSION]: '0.1.0',
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]:
        options?.environment ?? process.env.NODE_ENV ?? 'development',
    }),
    traceExporter: new OTLPTraceExporter(),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  return sdk;
}

/**
 * Gracefully shuts down the OpenTelemetry SDK, flushing any
 * pending telemetry data to the configured exporters.
 *
 * @param sdk - the SDK instance returned by {@link initTelemetry}
 */
async function shutdownTelemetry(sdk: NodeSDK): Promise<void> {
  await sdk.shutdown();
}

export { initTelemetry, shutdownTelemetry };
export type { TelemetryOptions };
