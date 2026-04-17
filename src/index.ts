/**
 * Layers appview API server entry point.
 *
 * Initializes OpenTelemetry, loads configuration, connects to all four
 * storage backends, bootstraps every record kind from lens specs, registers
 * them with the DI container, wires the generic XRPC router, and starts
 * serving.
 *
 * @packageDocumentation
 */
import 'reflect-metadata';

import { serve } from '@hono/node-server';
import { container } from 'tsyringe';

import { createApp } from './api/app.js';
import { crossReferenceMethods } from './api/handlers/xrpc/cross-reference/index.js';
import { genericRecordMethods } from './api/handlers/xrpc/generic-methods.js';
import { syncMethods } from './api/handlers/xrpc/sync/index.js';
import { EsReconciliationJob } from './jobs/es-reconciliation-job.js';
import { JobScheduler } from './jobs/job-scheduler.js';
import { MaterializedViewRefreshJob } from './jobs/materialized-view-refresh-job.js';
import { Neo4jReconciliationJob } from './jobs/neo4j-reconciliation-job.js';
import { StalenessDetectionJob } from './jobs/staleness-detection-job.js';
import { createLayersOAuthClient } from './auth/oauth-factory.js';
import { SessionManager } from './auth/session-manager.js';
import { loadConfig } from './config/index.js';
import { createLogger } from './observability/logger.js';
import { initTelemetry, shutdownTelemetry } from './observability/telemetry.js';
import { bootstrapRecordKinds } from './services/indexing/record-kind-bootstrap.js';
import { ElasticsearchAdapter } from './storage/elasticsearch/adapter.js';
import { createElasticsearchClient } from './storage/elasticsearch/client.js';
import { Neo4jAdapter } from './storage/neo4j/adapter.js';
import { closeNeo4jDriver, createNeo4jDriver } from './storage/neo4j/client.js';
import { PostgreSQLAdapter } from './storage/postgresql/adapter.js';
import { closePool, createPool } from './storage/postgresql/connection.js';
import { CrossReferencesRepository } from './storage/postgresql/cross-references-repository.js';
import { PluginRegistry } from './plugins/plugin-registry.js';
import { BeadJsonlinesImporter } from './plugins/importers/bead-jsonlines-importer.js';
import { createPanprotoImporters } from './plugins/importers/panproto-importer.js';
import { PanprotoService } from './services/panproto/panproto-service.js';
import { MarginIndexer } from './services/interop/margin-indexer.js';
import { createRedisClient } from './storage/redis/client.js';

const sdk = initTelemetry({ serviceName: 'layers-api' });
const config = loadConfig();
const logger = createLogger({ level: config.LOG_LEVEL, service: 'api' });

logger.info('Starting Layers API server');

const pgPool = createPool({
  connectionString: config.DATABASE_URL,
  min: config.PG_POOL_MIN,
  max: config.PG_POOL_MAX,
  statementTimeout: config.PG_STATEMENT_TIMEOUT,
});

const esClient = createElasticsearchClient({
  node: config.ELASTICSEARCH_URL,
  requestTimeout: config.ES_REQUEST_TIMEOUT,
});

const neo4jDriver = createNeo4jDriver({
  uri: config.NEO4J_URI,
  user: config.NEO4J_USER,
  password: config.NEO4J_PASSWORD,
});

const redis = createRedisClient({
  url: config.REDIS_URL,
  connectTimeout: config.REDIS_CONNECT_TIMEOUT,
});

const sessionManager = new SessionManager({ jwtSecret: config.JWT_SECRET }, redis);

const oauthClient =
  config.OAUTH_CLIENT_ID && config.OAUTH_REDIRECT_URI
    ? createLayersOAuthClient({
        clientId: config.OAUTH_CLIENT_ID,
        redirectUri: config.OAUTH_REDIRECT_URI,
        redis,
      })
    : undefined;

container.register('PgPool', { useValue: pgPool });
container.register('EsClient', { useValue: esClient });
container.register('Neo4jDriver', { useValue: neo4jDriver });
container.register('Redis', { useValue: redis });
container.register('SessionManager', { useValue: sessionManager });

// Bootstrap every record kind from its lens spec: one generic repository,
// one generic service, one generic indexer handler per kind. The DI keys
// (`PersonaService`, `CorpusService`, ...) are generated from each kind's
// slug so the XRPC router can resolve them.
const pgAdapter = new PostgreSQLAdapter(pgPool);
const esAdapter = new ElasticsearchAdapter(esClient);
const neo4jAdapter = new Neo4jAdapter(neo4jDriver);
const bootstrap = bootstrapRecordKinds({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  redis,
  logger,
});
for (const [key, service] of bootstrap.servicesByKey) {
  container.register(key, { useValue: service });
}
logger.info(`Registered ${bootstrap.kinds.length} record-kind services`);

const crossReferencesRepository = new CrossReferencesRepository(pgPool);
container.register('CrossReferencesRepository', { useValue: crossReferencesRepository });

const jobScheduler = new JobScheduler();
jobScheduler.register(
  new EsReconciliationJob({
    name: 'es-reconciliation',
    intervalMs: 6 * 60 * 60 * 1000,
    pgPool,
    esClient,
  }),
);
jobScheduler.register(
  new Neo4jReconciliationJob({
    name: 'neo4j-reconciliation',
    intervalMs: 24 * 60 * 60 * 1000,
    pgPool,
    neo4jDriver,
  }),
);
jobScheduler.register(
  new StalenessDetectionJob({
    name: 'staleness-detection',
    intervalMs: 24 * 60 * 60 * 1000,
    pgPool,
  }),
);
jobScheduler.register(
  new MaterializedViewRefreshJob({
    name: 'materialized-view-refresh',
    intervalMs: 15 * 60 * 1000,
    pgPool,
  }),
);

const panprotoService = new PanprotoService(redis);
container.register('IPanprotoService', { useValue: panprotoService });

const pluginRegistry = new PluginRegistry();
pluginRegistry.register(new BeadJsonlinesImporter());
for (const importer of createPanprotoImporters(panprotoService)) {
  pluginRegistry.register(importer);
}
container.register('PluginRegistry', { useValue: pluginRegistry });

const marginIndexer = new MarginIndexer({ pool: pgPool, redis });

// Generic XRPC router: one list + one get endpoint per record kind, generated
// from the backend registry. Cross-record utilities (sync, cross-reference)
// keep their bespoke method maps.
const xrpcMethods = {
  ...genericRecordMethods(),
  ...crossReferenceMethods(),
  ...syncMethods(),
};

const app = createApp({
  container,
  corsOrigins: config.CORS_ORIGINS.split(','),
  pgPool,
  esClient,
  neo4jDriver,
  redis,
  sessionManager,
  oauthClient,
  xrpcMethods,
  pluginRegistry,
  panprotoService,
  marginIndexer,
});

const server = serve({
  fetch: app.fetch,
  port: config.PORT,
});

logger.info(`API server listening on port ${String(config.PORT)}`);

jobScheduler.startAll();

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully`);

  if (server && 'close' in server) {
    (server as { close: (cb?: () => void) => void }).close();
  }

  await jobScheduler.stopAll();
  await closePool(pgPool);
  await closeNeo4jDriver(neo4jDriver);
  await redis.quit();
  await shutdownTelemetry(sdk);

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
