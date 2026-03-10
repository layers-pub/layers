/**
 * Zod-validated environment configuration for the Layers appview.
 *
 * Parses environment variables into a typed configuration object,
 * applying defaults where appropriate and validating constraints.
 *
 * @module
 */

import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().url(),
  PG_POOL_MIN: z.coerce.number().int().default(2),
  PG_POOL_MAX: z.coerce.number().int().default(20),
  PG_STATEMENT_TIMEOUT: z.coerce.number().int().default(30_000),
  ELASTICSEARCH_URL: z.string().url().default('http://localhost:9200'),
  ES_REQUEST_TIMEOUT: z.coerce.number().int().default(30_000),
  NEO4J_URI: z.string().default('bolt://localhost:7687'),
  NEO4J_USER: z.string().default('neo4j'),
  NEO4J_PASSWORD: z.string(),
  NEO4J_QUERY_TIMEOUT: z.coerce.number().int().default(30_000),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_CONNECT_TIMEOUT: z.coerce.number().int().default(5_000),
  LAYERS_RELAY_URL: z.string().url().default('wss://bsky.network'),
  JWT_SECRET: z.string().min(32),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().default('layers-appview'),
  CORS_ORIGINS: z.string().default('*'),
  OAUTH_CLIENT_ID: z.string().url().optional(),
  OAUTH_REDIRECT_URI: z.string().url().optional(),
});

type LayersConfig = z.infer<typeof configSchema>;

/**
 * Parses and validates environment variables into a {@link LayersConfig}.
 *
 * Throws a Zod validation error if any required variable is missing
 * or fails its constraint.
 *
 * @returns the validated configuration object
 */
function loadConfig(): LayersConfig {
  return configSchema.parse(process.env);
}

export { configSchema, loadConfig };
export type { LayersConfig };
