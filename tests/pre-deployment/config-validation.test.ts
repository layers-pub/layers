/**
 * Pre-deployment tests that validate configuration schema correctness.
 *
 * Ensures the Zod config schema accepts valid configurations, rejects
 * missing required fields, and validates format constraints for database
 * URLs, port numbers, and log levels.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';

import { configSchema } from '@/config/index.js';

/** A complete, valid environment configuration for testing. */
const VALID_ENV = {
  NODE_ENV: 'production',
  PORT: '3000',
  LOG_LEVEL: 'info',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/layers',
  PG_POOL_MIN: '2',
  PG_POOL_MAX: '20',
  PG_STATEMENT_TIMEOUT: '30000',
  ELASTICSEARCH_URL: 'http://localhost:9200',
  ES_REQUEST_TIMEOUT: '30000',
  NEO4J_URI: 'bolt://localhost:7687',
  NEO4J_USER: 'neo4j',
  NEO4J_PASSWORD: 'testpassword',
  NEO4J_QUERY_TIMEOUT: '30000',
  REDIS_URL: 'redis://localhost:6379',
  REDIS_CONNECT_TIMEOUT: '5000',
  LAYERS_RELAY_URL: 'wss://bsky.network',
  JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-characters-long',
  OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318',
  OTEL_SERVICE_NAME: 'layers-appview',
  CORS_ORIGINS: 'https://layers.pub',
};

describe('Config schema validation', () => {
  describe('required fields', () => {
    it('accepts a valid complete configuration', () => {
      const result = configSchema.safeParse(VALID_ENV);
      expect(result.success).toBe(true);
    });

    it('rejects missing DATABASE_URL', () => {
      const { DATABASE_URL: _, ...env } = VALID_ENV;
      const result = configSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('rejects missing NEO4J_PASSWORD', () => {
      const { NEO4J_PASSWORD: _, ...env } = VALID_ENV;
      const result = configSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('rejects missing JWT_SECRET', () => {
      const { JWT_SECRET: _, ...env } = VALID_ENV;
      const result = configSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('rejects JWT_SECRET shorter than 32 characters', () => {
      const env = { ...VALID_ENV, JWT_SECRET: 'too-short' };
      const result = configSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('all required environment variables are defined in the config schema', () => {
      // These are the minimum required fields (no defaults)
      const requiredFields = ['DATABASE_URL', 'NEO4J_PASSWORD', 'JWT_SECRET'];
      const schemaShape = configSchema.shape;

      for (const field of requiredFields) {
        expect(schemaShape).toHaveProperty(field);
      }
    });
  });

  describe('defaults', () => {
    it('applies default values for optional fields', () => {
      const minimalEnv = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/layers',
        NEO4J_PASSWORD: 'testpassword',
        JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-characters-long',
      };
      const result = configSchema.safeParse(minimalEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(3000);
        expect(result.data.LOG_LEVEL).toBe('info');
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.ELASTICSEARCH_URL).toBe('http://localhost:9200');
        expect(result.data.NEO4J_URI).toBe('bolt://localhost:7687');
        expect(result.data.REDIS_URL).toBe('redis://localhost:6379');
        expect(result.data.OTEL_SERVICE_NAME).toBe('layers-appview');
      }
    });
  });

  describe('database URL formats', () => {
    it('accepts valid PostgreSQL URL', () => {
      const env = {
        ...VALID_ENV,
        DATABASE_URL: 'postgresql://user:pass@db.example.com:5432/layers',
      };
      const result = configSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    it('rejects invalid DATABASE_URL format', () => {
      const env = { ...VALID_ENV, DATABASE_URL: 'not-a-url' };
      const result = configSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('accepts valid Elasticsearch URL', () => {
      const env = { ...VALID_ENV, ELASTICSEARCH_URL: 'https://es.example.com:9200' };
      const result = configSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    it('accepts valid Redis URL', () => {
      const env = { ...VALID_ENV, REDIS_URL: 'redis://redis.example.com:6380' };
      const result = configSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    it('accepts valid relay WebSocket URL', () => {
      const env = { ...VALID_ENV, LAYERS_RELAY_URL: 'wss://relay.example.com' };
      const result = configSchema.safeParse(env);
      expect(result.success).toBe(true);
    });
  });

  describe('port validation', () => {
    it('accepts valid port number', () => {
      const env = { ...VALID_ENV, PORT: '8080' };
      const result = configSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(8080);
      }
    });

    it('coerces string port to number', () => {
      const env = { ...VALID_ENV, PORT: '3001' };
      const result = configSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.PORT).toBe('number');
      }
    });
  });

  describe('log level validation', () => {
    it('accepts valid log levels', () => {
      const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
      for (const level of validLevels) {
        const env = { ...VALID_ENV, LOG_LEVEL: level };
        const result = configSchema.safeParse(env);
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid log level', () => {
      const env = { ...VALID_ENV, LOG_LEVEL: 'verbose' };
      const result = configSchema.safeParse(env);
      expect(result.success).toBe(false);
    });
  });

  describe('NODE_ENV validation', () => {
    it('accepts development, production, and test', () => {
      for (const nodeEnv of ['development', 'production', 'test']) {
        const env = { ...VALID_ENV, NODE_ENV: nodeEnv };
        const result = configSchema.safeParse(env);
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid NODE_ENV', () => {
      const env = { ...VALID_ENV, NODE_ENV: 'staging' };
      const result = configSchema.safeParse(env);
      expect(result.success).toBe(false);
    });
  });
});
