/**
 * Neo4j driver factory and lifecycle utilities.
 *
 * @module
 */

import neo4j, { type Driver } from 'neo4j-driver';

import { createLogger } from '../../observability/logger.js';

/**
 * Configuration for the Neo4j driver.
 */
interface Neo4jConfig {
  readonly uri: string;
  readonly user: string;
  readonly password: string;
  readonly maxConnectionPoolSize?: number;
  readonly connectionAcquisitionTimeout?: number;
}

/**
 * Creates a Neo4j driver with basic authentication.
 *
 * @param config - connection URI, credentials, and pool configuration
 * @returns a configured Neo4j Driver instance
 *
 * @example
 * ```typescript
 * const driver = createNeo4jDriver({
 *   uri: "bolt://localhost:7687",
 *   user: "neo4j",
 *   password: "password",
 * });
 * ```
 */
function createNeo4jDriver(config: Neo4jConfig): Driver {
  const logger = createLogger({ service: 'neo4j' });

  const driver = neo4j.driver(config.uri, neo4j.auth.basic(config.user, config.password), {
    maxConnectionPoolSize: config.maxConnectionPoolSize ?? 50,
    connectionAcquisitionTimeout: config.connectionAcquisitionTimeout ?? 30_000,
  });

  logger.info('Neo4j driver created', { uri: config.uri });

  return driver;
}

/**
 * Gracefully closes a Neo4j driver and releases all connections.
 *
 * @param driver - the driver to close
 */
async function closeNeo4jDriver(driver: Driver): Promise<void> {
  await driver.close();
}

export { closeNeo4jDriver, createNeo4jDriver };
export type { Neo4jConfig };
