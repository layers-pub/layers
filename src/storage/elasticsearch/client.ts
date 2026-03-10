/**
 * Elasticsearch client factory.
 *
 * @module
 */

import { Client } from '@elastic/elasticsearch';

import { createLogger } from '../../observability/logger.js';

/**
 * Configuration for the Elasticsearch client.
 */
interface ElasticsearchConfig {
  readonly node: string;
  readonly requestTimeout?: number;
  readonly maxRetries?: number;
}

/**
 * Creates a configured Elasticsearch client.
 *
 * @param config - connection and retry configuration
 * @returns a new Elasticsearch Client instance
 *
 * @example
 * ```typescript
 * const client = createElasticsearchClient({
 *   node: "http://localhost:9200",
 * });
 * ```
 */
function createElasticsearchClient(config: ElasticsearchConfig): Client {
  const logger = createLogger({ service: 'elasticsearch' });

  const client = new Client({
    node: config.node,
    requestTimeout: config.requestTimeout ?? 30_000,
    maxRetries: config.maxRetries ?? 3,
  });

  logger.info('Elasticsearch client created', { node: config.node });

  return client;
}

export { createElasticsearchClient };
export type { ElasticsearchConfig };
