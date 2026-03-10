/**
 * Testcontainers setup for integration tests.
 *
 * Starts PostgreSQL 16, Elasticsearch 8, Neo4j 5, and Redis 7 containers,
 * exposing connection details for test suites. Containers are shared across
 * all tests in a single Vitest run and torn down on completion.
 *
 * @module
 */

import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import type { Client } from '@elastic/elasticsearch';
import type { Driver } from 'neo4j-driver';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';

/**
 * Holds live client connections and a teardown function for all four
 * storage backends used in integration tests.
 */
interface TestInfrastructure {
  readonly pgPool: Pool;
  readonly esClient: Client;
  readonly neo4jDriver: Driver;
  readonly redis: Redis;
  readonly teardown: () => Promise<void>;
}

/**
 * Tracks all running Testcontainers instances so they can be stopped
 * during teardown.
 */
interface StartedContainers {
  readonly pg: StartedTestContainer;
  readonly es: StartedTestContainer;
  readonly neo4j: StartedTestContainer;
  readonly redis: StartedTestContainer;
}

let containers: StartedContainers | undefined;
let infrastructure: TestInfrastructure | undefined;

/**
 * Starts all four database containers in parallel.
 *
 * Each container uses a lightweight wait strategy to confirm readiness
 * before returning.
 */
async function startContainers(): Promise<StartedContainers> {
  const [pg, es, neo4j, redis] = await Promise.all([
    new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'layers_test',
        POSTGRES_USER: 'layers',
        POSTGRES_PASSWORD: 'test',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .start(),

    new GenericContainer('elasticsearch:8.17.0')
      .withEnvironment({
        'discovery.type': 'single-node',
        'xpack.security.enabled': 'false',
        ES_JAVA_OPTS: '-Xms256m -Xmx256m',
      })
      .withExposedPorts(9200)
      .withWaitStrategy(Wait.forHttp('/_cluster/health', 9200).forStatusCode(200))
      .start(),

    new GenericContainer('neo4j:5-community')
      .withEnvironment({
        NEO4J_AUTH: 'neo4j/testpassword',
      })
      .withExposedPorts(7687)
      .withWaitStrategy(Wait.forLogMessage('Started.'))
      .start(),

    new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start(),
  ]);

  return { pg, es, neo4j, redis };
}

/**
 * Creates (or returns a cached) test infrastructure with live database
 * connections backed by Testcontainers.
 *
 * Production client factories are loaded via dynamic import to avoid
 * pulling their side effects (logger initialization, OTel SDK) at
 * module evaluation time.
 *
 * Call `teardown()` on the returned object to stop all containers and
 * close all connections.
 *
 * @returns live client connections and a teardown function
 *
 * @example
 * ```typescript
 * const infra = await createTestInfrastructure();
 * const result = await infra.pgPool.query("SELECT 1");
 * await infra.teardown();
 * ```
 */
async function createTestInfrastructure(): Promise<TestInfrastructure> {
  if (infrastructure) return infrastructure;

  containers = await startContainers();

  const { createPool } = await import('../../src/storage/postgresql/connection.js');
  const { closePool } = await import('../../src/storage/postgresql/connection.js');
  const { createElasticsearchClient } = await import('../../src/storage/elasticsearch/client.js');
  const { createNeo4jDriver } = await import('../../src/storage/neo4j/client.js');
  const { closeNeo4jDriver } = await import('../../src/storage/neo4j/client.js');
  const { createRedisClient } = await import('../../src/storage/redis/client.js');

  const pgHost = containers.pg.getHost();
  const pgPort = containers.pg.getMappedPort(5432);

  const pgPool = createPool({
    connectionString: `postgresql://layers:test@${pgHost}:${String(pgPort)}/layers_test`,
    min: 1,
    max: 5,
  });

  const esHost = containers.es.getHost();
  const esPort = containers.es.getMappedPort(9200);

  const esClient = createElasticsearchClient({
    node: `http://${esHost}:${String(esPort)}`,
  });

  const neo4jHost = containers.neo4j.getHost();
  const neo4jPort = containers.neo4j.getMappedPort(7687);

  const neo4jDriver = createNeo4jDriver({
    uri: `bolt://${neo4jHost}:${String(neo4jPort)}`,
    user: 'neo4j',
    password: 'testpassword',
  });

  const redisHost = containers.redis.getHost();
  const redisPort = containers.redis.getMappedPort(6379);

  const redis = createRedisClient({
    url: `redis://${redisHost}:${String(redisPort)}`,
    lazyConnect: true,
  });

  await redis.connect();

  // Capture a local reference so the teardown closure does not need
  // non-null assertions on the module-level variable.
  const startedContainers = containers;

  infrastructure = {
    pgPool,
    esClient,
    neo4jDriver,
    redis,
    teardown: async () => {
      await closePool(pgPool);
      await esClient.close();
      await closeNeo4jDriver(neo4jDriver);
      await redis.quit();

      await Promise.all([
        startedContainers.pg.stop(),
        startedContainers.es.stop(),
        startedContainers.neo4j.stop(),
        startedContainers.redis.stop(),
      ]);

      containers = undefined;
      infrastructure = undefined;
    },
  };

  return infrastructure;
}

export { createTestInfrastructure };
export type { TestInfrastructure };
