/**
 * Layers appview indexer entry point.
 *
 * Initializes OpenTelemetry, loads configuration, connects to all four
 * storage backends, assembles the indexer pipeline via
 * {@link bootstrapRecordKinds} (one generic repo+service+handler per record
 * kind, driven entirely by lens specs), and subscribes to Tap for clean
 * JSON record events.
 *
 * @packageDocumentation
 */
import 'reflect-metadata';

import { loadConfig } from './config/index.js';
import { EnrichmentDispatcher } from './services/enrichment/enrichment-dispatcher.js';
import { AnnotationStatisticsHandler } from './services/enrichment/handlers/annotation-statistics-handler.js';
import { KnowledgeGraphLinkingHandler } from './services/enrichment/handlers/knowledge-graph-linking-handler.js';
import { LanguageDetectionHandler } from './services/enrichment/handlers/language-detection-handler.js';
import { MediaMetadataHandler } from './services/enrichment/handlers/media-metadata-handler.js';
import { createLogger } from './observability/logger.js';
import { initTelemetry, shutdownTelemetry } from './observability/telemetry.js';
import { CursorManager } from './services/indexing/cursor-manager.js';
import { DLQHandler } from './services/indexing/dlq-handler.js';
import { ErrorClassifier } from './services/indexing/error-classifier.js';
import { EventFilter, ALL_INDEXED_NSIDS } from './services/indexing/event-filter.js';
import { EventProcessor } from './services/indexing/event-processor.js';
import { EventQueue } from './services/indexing/event-queue.js';
import { TapConsumer } from './services/indexing/tap-consumer.js';
import { bootstrapRecordKinds } from './services/indexing/record-kind-bootstrap.js';
import { MarginRecordHandler } from './services/indexing/handlers/margin-record-handler.js';
import { MarginIndexer, MARGIN_NSIDS } from './services/interop/margin-indexer.js';
import { CrossReferencesRepository } from './storage/postgresql/cross-references-repository.js';
import { EnrichmentWorker } from './workers/enrichment-worker.js';
import { ElasticsearchAdapter } from './storage/elasticsearch/adapter.js';
import { createElasticsearchClient } from './storage/elasticsearch/client.js';
import { Neo4jAdapter } from './storage/neo4j/adapter.js';
import { closeNeo4jDriver, createNeo4jDriver } from './storage/neo4j/client.js';
import { PostgreSQLAdapter } from './storage/postgresql/adapter.js';
import { closePool, createPool } from './storage/postgresql/connection.js';
import { createRedisClient } from './storage/redis/client.js';

const sdk = initTelemetry({ serviceName: 'layers-indexer' });
const config = loadConfig();
const logger = createLogger({ level: config.LOG_LEVEL, service: 'indexer' });

logger.info('Starting Layers indexer');

const pgPool = createPool({
  connectionString: config.DATABASE_URL,
  min: config.PG_POOL_MIN,
  max: config.PG_POOL_MAX,
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
const redis = createRedisClient({ url: config.REDIS_URL });

const cursorManager = new CursorManager(pgPool, {
  flushIntervalMs: 1_000,
});

const errorClassifier = new ErrorClassifier();
const dlqHandler = new DLQHandler(pgPool, logger);
const eventProcessor = new EventProcessor({ dlqHandler, errorClassifier, logger });
const eventQueue = new EventQueue(redis, { maxDepth: 10_000 });
const eventFilter = new EventFilter(ALL_INDEXED_NSIDS);

const pgAdapter = new PostgreSQLAdapter(pgPool);
const esAdapter = new ElasticsearchAdapter(esClient);
const neo4jAdapter = new Neo4jAdapter(neo4jDriver);

// Instantiate repositories + services + event handlers for every record kind
// declared in the generated registry. The lens spec under
// `layers/lenses/*.lens.json` is the single source of truth for each kind's
// storage projection.
const bootstrap = bootstrapRecordKinds({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  redis,
  logger,
  eventProcessor,
});
logger.info(`Record kinds bootstrapped: ${bootstrap.kinds.length}`);

// margin.at interop lives outside the lens-driven path (records are at.margin.*).
const marginIndexer = new MarginIndexer({ pool: pgPool, redis, logger });
const marginRecordHandler = new MarginRecordHandler(marginIndexer);
for (const nsid of MARGIN_NSIDS) {
  eventProcessor.registerHandler(nsid, marginRecordHandler);
}

const crossReferencesRepository = new CrossReferencesRepository(pgPool);

const enrichmentDispatcher = new EnrichmentDispatcher({ logger });
enrichmentDispatcher.register(new LanguageDetectionHandler({ pgPool, esClient, logger }));
enrichmentDispatcher.register(new KnowledgeGraphLinkingHandler({ pgPool, neo4jDriver, logger }));
enrichmentDispatcher.register(new MediaMetadataHandler({ pgPool, logger }));
enrichmentDispatcher.register(new AnnotationStatisticsHandler({ pgPool, logger }));
const enrichmentWorker = new EnrichmentWorker({
  redis: {
    host: new URL(config.REDIS_URL).hostname,
    port: Number(new URL(config.REDIS_URL).port) || 6379,
  },
  dispatcher: enrichmentDispatcher,
  logger,
});

void crossReferencesRepository;

const tapConfig: { url: string; adminPassword?: string } = { url: config.LAYERS_TAP_URL };
if (config.LAYERS_TAP_ADMIN_PASSWORD !== undefined) {
  tapConfig.adminPassword = config.LAYERS_TAP_ADMIN_PASSWORD;
}
const consumer = new TapConsumer(tapConfig, {
  eventFilter,
  eventProcessor,
  eventQueue,
  cursorManager,
  logger,
});

async function start(): Promise<void> {
  await cursorManager.ensureTable();
  await dlqHandler.ensureTable();
  cursorManager.startFlushInterval();
  enrichmentWorker.start();
  await consumer.start();

  logger.info(`Tap indexer started, subscribing to ${config.LAYERS_TAP_URL}`);
}

void start();

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully`);

  await consumer.stop();
  await enrichmentWorker.stop();
  await cursorManager.stop();
  await eventQueue.close();
  await closePool(pgPool);
  await closeNeo4jDriver(neo4jDriver);
  await redis.quit();
  await shutdownTelemetry(sdk);

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
