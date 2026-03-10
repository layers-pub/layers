/**
 * Cockatiel resilience policy factory for external service calls.
 *
 * Wraps every outbound call in a composed policy of timeout, retry,
 * circuit breaker, and bulkhead. Pre-built policies are exported for
 * each storage backend.
 *
 * @module
 */

import {
  type CircuitState,
  ConsecutiveBreaker,
  ExponentialBackoff,
  type IPolicy,
  TimeoutStrategy,
  bulkhead,
  circuitBreaker,
  handleAll,
  retry,
  timeout,
  wrap,
} from 'cockatiel';

import { createLogger } from '../observability/logger.js';

/**
 * Configuration options for building a resilience policy.
 */
interface ResiliencePolicyOptions {
  readonly retryAttempts?: number;
  readonly retryBaseDelay?: number;
  readonly retryMaxDelay?: number;
  readonly circuitBreakerThreshold?: number;
  readonly circuitBreakerHalfOpenAfter?: number;
  readonly bulkheadConcurrency?: number;
  readonly timeoutMs?: number;
}

/**
 * Creates a composed resilience policy (timeout + retry + circuit breaker + bulkhead).
 *
 * The policy applies in this order:
 * 1. Timeout: cancels the call if it exceeds the deadline
 * 2. Retry: retries transient failures with exponential backoff
 * 3. Circuit breaker: opens after consecutive failures, half-opens after a delay
 * 4. Bulkhead: limits concurrent executions
 *
 * @param name - a human-readable label for log messages
 * @param options - optional overrides for retry, circuit breaker, bulkhead, and timeout settings
 * @returns a composed cockatiel policy
 *
 * @example
 * ```typescript
 * const policy = createResiliencePolicy("custom-service", {
 *   retryAttempts: 5,
 *   timeoutMs: 10_000,
 * });
 * const result = await policy.execute(() => fetchData());
 * ```
 */
function createResiliencePolicy(name: string, options?: ResiliencePolicyOptions): IPolicy {
  const logger = createLogger({ service: `resilience:${name}` });

  const retryAttempts = options?.retryAttempts ?? 3;
  const retryBaseDelay = options?.retryBaseDelay ?? 1_000;
  const retryMaxDelay = options?.retryMaxDelay ?? 10_000;
  const cbThreshold = options?.circuitBreakerThreshold ?? 5;
  const cbHalfOpenAfter = options?.circuitBreakerHalfOpenAfter ?? 30_000;
  const bulkheadConcurrency = options?.bulkheadConcurrency ?? 20;
  const timeoutMs = options?.timeoutMs ?? 5_000;

  const retryPolicy = retry(handleAll, {
    maxAttempts: retryAttempts,
    backoff: new ExponentialBackoff({
      initialDelay: retryBaseDelay,
      maxDelay: retryMaxDelay,
    }),
  });

  retryPolicy.onRetry(({ attempt }: { attempt: number }) => {
    logger.warn(`Retry attempt ${String(attempt)} for ${name}`);
  });

  const circuitBreakerPolicy = circuitBreaker(handleAll, {
    halfOpenAfter: cbHalfOpenAfter,
    breaker: new ConsecutiveBreaker(cbThreshold),
  });

  circuitBreakerPolicy.onStateChange((state: CircuitState) => {
    logger.info(`Circuit breaker ${name} state changed to ${state}`);
  });

  const timeoutPolicy = timeout(timeoutMs, TimeoutStrategy.Cooperative);

  const bulkheadPolicy = bulkhead(bulkheadConcurrency);

  return wrap(timeoutPolicy, retryPolicy, circuitBreakerPolicy, bulkheadPolicy);
}

/** Resilience policy for PostgreSQL operations. */
const pgPolicy = createResiliencePolicy('postgresql');

/** Resilience policy for Elasticsearch operations. */
const esPolicy = createResiliencePolicy('elasticsearch');

/** Resilience policy for Neo4j operations. */
const neo4jPolicy = createResiliencePolicy('neo4j');

/** Resilience policy for Redis operations (shorter timeout). */
const redisPolicy = createResiliencePolicy('redis', { timeoutMs: 2_000 });

export { createResiliencePolicy, esPolicy, neo4jPolicy, pgPolicy, redisPolicy };
export type { ResiliencePolicyOptions };
