/**
 * Layers appview firehose indexer entry point.
 *
 * Initializes OpenTelemetry, loads configuration, connects to all four
 * storage backends, assembles the indexer pipeline (FirehoseConsumer,
 * EventFilter, CommitHandler, EventProcessor, CursorManager, EventQueue,
 * DLQHandler, ErrorClassifier), and starts consuming the AT Protocol
 * firehose.
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
import { AlignmentService } from './services/alignment/alignment-service.js';
import { AnnotationLayerService } from './services/annotation/annotation-layer-service.js';
import { ClusterSetService } from './services/annotation/cluster-set-service.js';
import { ChangelogService } from './services/changelog/changelog-service.js';
import { CorpusMembershipService } from './services/corpus/corpus-membership-service.js';
import { CorpusService } from './services/corpus/corpus-service.js';
import { DataLinkService } from './services/eprint/data-link-service.js';
import { EprintService } from './services/eprint/eprint-service.js';
import { ExpressionService } from './services/expression/expression-service.js';
import { GraphEdgeService } from './services/graph/graph-edge-service.js';
import { GraphEdgeSetService } from './services/graph/graph-edge-set-service.js';
import { GraphNodeService } from './services/graph/graph-node-service.js';
import { AgreementReportService } from './services/judgment/agreement-report-service.js';
import { ExperimentDefService } from './services/judgment/experiment-def-service.js';
import { JudgmentSetService } from './services/judgment/judgment-set-service.js';
import { MediaService } from './services/media/media-service.js';
import { OntologyService } from './services/ontology/ontology-service.js';
import { TypeDefService } from './services/ontology/type-def-service.js';
import { PersonaService } from './services/persona/persona-service.js';
import { CollectionMembershipService } from './services/resource/collection-membership-service.js';
import { FillingService } from './services/resource/filling-service.js';
import { ResourceCollectionService } from './services/resource/resource-collection-service.js';
import { ResourceEntryService } from './services/resource/resource-entry-service.js';
import { TemplateCompositionService } from './services/resource/template-composition-service.js';
import { TemplateService } from './services/resource/template-service.js';
import { SegmentationService } from './services/segmentation/segmentation-service.js';
import { CommitHandler } from './services/indexing/commit-handler.js';
import { CursorManager } from './services/indexing/cursor-manager.js';
import { DLQHandler } from './services/indexing/dlq-handler.js';
import { ErrorClassifier } from './services/indexing/error-classifier.js';
import { EventFilter, ALL_INDEXED_NSIDS } from './services/indexing/event-filter.js';
import { EventProcessor } from './services/indexing/event-processor.js';
import { EventQueue } from './services/indexing/event-queue.js';
import { FirehoseConsumer } from './services/indexing/firehose-consumer.js';
import { BaseRecordHandler } from './services/indexing/handlers/base-record-handler.js';
import { MarginRecordHandler } from './services/indexing/handlers/margin-record-handler.js';
import { MarginIndexer, MARGIN_NSIDS } from './services/interop/margin-indexer.js';
import { CrossReferencesRepository } from './storage/postgresql/cross-references-repository.js';
import { EnrichmentWorker } from './workers/enrichment-worker.js';
import { ElasticsearchAdapter } from './storage/elasticsearch/adapter.js';
import { createElasticsearchClient } from './storage/elasticsearch/client.js';
import { ExpressionDocumentMapper } from './storage/elasticsearch/document-mapper.js';
import { AgreementReportDocumentMapper } from './storage/elasticsearch/document-mappers/agreement-report-mapper.js';
import { AlignmentDocumentMapper } from './storage/elasticsearch/document-mappers/alignment-mapper.js';
import { AnnotationLayerDocumentMapper } from './storage/elasticsearch/document-mappers/annotation-layer-mapper.js';
import { ChangelogDocumentMapper } from './storage/elasticsearch/document-mappers/changelog-mapper.js';
import { ClusterSetDocumentMapper } from './storage/elasticsearch/document-mappers/cluster-set-mapper.js';
import { CollectionMembershipDocumentMapper } from './storage/elasticsearch/document-mappers/collection-membership-mapper.js';
import { CorpusMembershipDocumentMapper } from './storage/elasticsearch/document-mappers/corpus-membership-mapper.js';
import { CorpusDocumentMapper } from './storage/elasticsearch/document-mappers/corpus-mapper.js';
import { DataLinkDocumentMapper } from './storage/elasticsearch/document-mappers/data-link-mapper.js';
import { EprintDocumentMapper } from './storage/elasticsearch/document-mappers/eprint-mapper.js';
import { ExperimentDefDocumentMapper } from './storage/elasticsearch/document-mappers/experiment-def-mapper.js';
import { FillingDocumentMapper } from './storage/elasticsearch/document-mappers/filling-mapper.js';
import { GraphEdgeDocumentMapper } from './storage/elasticsearch/document-mappers/graph-edge-mapper.js';
import { GraphEdgeSetDocumentMapper } from './storage/elasticsearch/document-mappers/graph-edge-set-mapper.js';
import { GraphNodeDocumentMapper } from './storage/elasticsearch/document-mappers/graph-node-mapper.js';
import { JudgmentSetDocumentMapper } from './storage/elasticsearch/document-mappers/judgment-set-mapper.js';
import { MediaDocumentMapper } from './storage/elasticsearch/document-mappers/media-mapper.js';
import { OntologyDocumentMapper } from './storage/elasticsearch/document-mappers/ontology-mapper.js';
import { PersonaDocumentMapper } from './storage/elasticsearch/document-mappers/persona-mapper.js';
import { ResourceCollectionDocumentMapper } from './storage/elasticsearch/document-mappers/resource-collection-mapper.js';
import { ResourceEntryDocumentMapper } from './storage/elasticsearch/document-mappers/resource-entry-mapper.js';
import { SegmentationDocumentMapper } from './storage/elasticsearch/document-mappers/segmentation-mapper.js';
import { TemplateDocumentMapper } from './storage/elasticsearch/document-mappers/template-mapper.js';
import { TemplateCompositionDocumentMapper } from './storage/elasticsearch/document-mappers/template-composition-mapper.js';
import { TypeDefDocumentMapper } from './storage/elasticsearch/document-mappers/type-def-mapper.js';
import { Neo4jAdapter } from './storage/neo4j/adapter.js';
import { closeNeo4jDriver, createNeo4jDriver } from './storage/neo4j/client.js';
import { PostgreSQLAdapter } from './storage/postgresql/adapter.js';
import { closePool, createPool } from './storage/postgresql/connection.js';
import { AgreementReportsRepository } from './storage/postgresql/agreement-reports-repository.js';
import { AlignmentsRepository } from './storage/postgresql/alignments-repository.js';
import { AnnotationLayersRepository } from './storage/postgresql/annotation-layers-repository.js';
import { ChangelogsRepository } from './storage/postgresql/changelogs-repository.js';
import { ClusterSetsRepository } from './storage/postgresql/cluster-sets-repository.js';
import { CollectionMembershipsRepository } from './storage/postgresql/collection-memberships-repository.js';
import { CorporaRepository } from './storage/postgresql/corpora-repository.js';
import { CorpusMembershipsRepository } from './storage/postgresql/corpus-memberships-repository.js';
import { DataLinksRepository } from './storage/postgresql/data-links-repository.js';
import { EprintsRepository } from './storage/postgresql/eprints-repository.js';
import { ExperimentDefsRepository } from './storage/postgresql/experiment-defs-repository.js';
import { ExpressionsRepository } from './storage/postgresql/expressions-repository.js';
import { FillingsRepository } from './storage/postgresql/fillings-repository.js';
import { GraphEdgeSetsRepository } from './storage/postgresql/graph-edge-sets-repository.js';
import { GraphEdgesRepository } from './storage/postgresql/graph-edges-repository.js';
import { GraphNodesRepository } from './storage/postgresql/graph-nodes-repository.js';
import { JudgmentSetsRepository } from './storage/postgresql/judgment-sets-repository.js';
import { MediaRepository } from './storage/postgresql/media-repository.js';
import { OntologiesRepository } from './storage/postgresql/ontologies-repository.js';
import { PersonasRepository } from './storage/postgresql/personas-repository.js';
import { ResourceCollectionsRepository } from './storage/postgresql/resource-collections-repository.js';
import { ResourceEntriesRepository } from './storage/postgresql/resource-entries-repository.js';
import { SegmentationsRepository } from './storage/postgresql/segmentations-repository.js';
import { TemplateCompositionsRepository } from './storage/postgresql/template-compositions-repository.js';
import { TemplatesRepository } from './storage/postgresql/templates-repository.js';
import { TypeDefsRepository } from './storage/postgresql/type-defs-repository.js';
import { createRedisClient } from './storage/redis/client.js';

const sdk = initTelemetry({ serviceName: 'layers-indexer' });
const config = loadConfig();
const logger = createLogger({ level: config.LOG_LEVEL, service: 'indexer' });

logger.info('Starting Layers firehose indexer');

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

// Assemble the indexer pipeline
const cursorManager = new CursorManager(pgPool, {
  batchSize: 1_000,
  flushIntervalMs: 5_000,
});

const errorClassifier = new ErrorClassifier();
const dlqHandler = new DLQHandler(pgPool, logger);
const eventProcessor = new EventProcessor({ dlqHandler, errorClassifier, logger });
const eventQueue = new EventQueue(redis, { maxDepth: 10_000 });
const eventFilter = new EventFilter(ALL_INDEXED_NSIDS);
const commitHandler = new CommitHandler();

// Build storage adapters and expression service
const pgAdapter = new PostgreSQLAdapter(pgPool);
const esAdapter = new ElasticsearchAdapter(esClient);
const neo4jAdapter = new Neo4jAdapter(neo4jDriver);
const documentMapper = new ExpressionDocumentMapper();

const expressionsRepository = new ExpressionsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper,
  logger,
});

const expressionService = new ExpressionService({
  repository: expressionsRepository,
  redis,
  logger,
});

// Build persona storage and service
const personaDocumentMapper = new PersonaDocumentMapper();

const personasRepository = new PersonasRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: personaDocumentMapper,
  logger,
});

const personaService = new PersonaService({
  repository: personasRepository,
  redis,
  logger,
});

// Register record-type handlers
const expressionHandler = new BaseRecordHandler(
  expressionService,
  'pub.layers.expression.expression',
);
eventProcessor.registerHandler('pub.layers.expression.expression', expressionHandler);

const personaHandler = new BaseRecordHandler(personaService, 'pub.layers.persona.persona');
eventProcessor.registerHandler('pub.layers.persona.persona', personaHandler);

// Build ontology storage and service
const ontologyDocumentMapper = new OntologyDocumentMapper();
const ontologiesRepository = new OntologiesRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: ontologyDocumentMapper,
  logger,
});
const ontologyService = new OntologyService({ repository: ontologiesRepository, redis, logger });
const ontologyHandler = new BaseRecordHandler(ontologyService, 'pub.layers.ontology.ontology');
eventProcessor.registerHandler('pub.layers.ontology.ontology', ontologyHandler);

// Build corpus storage and service
const corpusDocumentMapper = new CorpusDocumentMapper();
const corporaRepository = new CorporaRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: corpusDocumentMapper,
  logger,
});
const corpusService = new CorpusService({ repository: corporaRepository, redis, logger });
const corpusHandler = new BaseRecordHandler(corpusService, 'pub.layers.corpus.corpus');
eventProcessor.registerHandler('pub.layers.corpus.corpus', corpusHandler);

// Build media storage and service
const mediaDocumentMapper = new MediaDocumentMapper();
const mediaRepository = new MediaRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: mediaDocumentMapper,
  logger,
});
const mediaService = new MediaService({ repository: mediaRepository, redis, logger });
const mediaHandler = new BaseRecordHandler(mediaService, 'pub.layers.media.media');
eventProcessor.registerHandler('pub.layers.media.media', mediaHandler);

// Build eprint storage and service
const eprintDocumentMapper = new EprintDocumentMapper();
const eprintsRepository = new EprintsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: eprintDocumentMapper,
  logger,
});
const eprintService = new EprintService({ repository: eprintsRepository, redis, logger });
const eprintHandler = new BaseRecordHandler(eprintService, 'pub.layers.eprint.eprint');
eventProcessor.registerHandler('pub.layers.eprint.eprint', eprintHandler);

// Build segmentation storage and service
const segmentationDocumentMapper = new SegmentationDocumentMapper();
const segmentationsRepository = new SegmentationsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: segmentationDocumentMapper,
  logger,
});
const segmentationService = new SegmentationService({
  repository: segmentationsRepository,
  redis,
  logger,
});
const segmentationHandler = new BaseRecordHandler(
  segmentationService,
  'pub.layers.segmentation.segmentation',
);
eventProcessor.registerHandler('pub.layers.segmentation.segmentation', segmentationHandler);

// Build typeDef storage and service
const typeDefDocumentMapper = new TypeDefDocumentMapper();
const typeDefsRepository = new TypeDefsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: typeDefDocumentMapper,
  logger,
});
const typeDefService = new TypeDefService({ repository: typeDefsRepository, redis, logger });
const typeDefHandler = new BaseRecordHandler(typeDefService, 'pub.layers.ontology.typeDef');
eventProcessor.registerHandler('pub.layers.ontology.typeDef', typeDefHandler);

// Build corpus membership storage and service
const corpusMembershipDocumentMapper = new CorpusMembershipDocumentMapper();
const corpusMembershipsRepository = new CorpusMembershipsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: corpusMembershipDocumentMapper,
  logger,
});
const corpusMembershipService = new CorpusMembershipService({
  repository: corpusMembershipsRepository,
  redis,
  logger,
});
const corpusMembershipHandler = new BaseRecordHandler(
  corpusMembershipService,
  'pub.layers.corpus.membership',
);
eventProcessor.registerHandler('pub.layers.corpus.membership', corpusMembershipHandler);

// Build resource collection storage and service
const resourceCollectionDocumentMapper = new ResourceCollectionDocumentMapper();
const resourceCollectionsRepository = new ResourceCollectionsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: resourceCollectionDocumentMapper,
  logger,
});
const resourceCollectionService = new ResourceCollectionService({
  repository: resourceCollectionsRepository,
  redis,
  logger,
});
const resourceCollectionHandler = new BaseRecordHandler(
  resourceCollectionService,
  'pub.layers.resource.collection',
);
eventProcessor.registerHandler('pub.layers.resource.collection', resourceCollectionHandler);

// Build resource entry storage and service
const resourceEntryDocumentMapper = new ResourceEntryDocumentMapper();
const resourceEntriesRepository = new ResourceEntriesRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: resourceEntryDocumentMapper,
  logger,
});
const resourceEntryService = new ResourceEntryService({
  repository: resourceEntriesRepository,
  redis,
  logger,
});
const resourceEntryHandler = new BaseRecordHandler(
  resourceEntryService,
  'pub.layers.resource.entry',
);
eventProcessor.registerHandler('pub.layers.resource.entry', resourceEntryHandler);

// Build graph node storage and service
const graphNodeDocumentMapper = new GraphNodeDocumentMapper();
const graphNodesRepository = new GraphNodesRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: graphNodeDocumentMapper,
  logger,
});
const graphNodeService = new GraphNodeService({ repository: graphNodesRepository, redis, logger });
const graphNodeHandler = new BaseRecordHandler(graphNodeService, 'pub.layers.graph.graphNode');
eventProcessor.registerHandler('pub.layers.graph.graphNode', graphNodeHandler);

// Build changelog storage and service
const changelogDocumentMapper = new ChangelogDocumentMapper();
const changelogsRepository = new ChangelogsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: changelogDocumentMapper,
  logger,
});
const changelogService = new ChangelogService({ repository: changelogsRepository, redis, logger });
const changelogHandler = new BaseRecordHandler(changelogService, 'pub.layers.changelog.entry');
eventProcessor.registerHandler('pub.layers.changelog.entry', changelogHandler);

// Build annotation layer storage and service
const annotationLayerDocumentMapper = new AnnotationLayerDocumentMapper();
const annotationLayersRepository = new AnnotationLayersRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: annotationLayerDocumentMapper,
  logger,
});
const annotationLayerService = new AnnotationLayerService({
  repository: annotationLayersRepository,
  redis,
  logger,
});
const annotationLayerHandler = new BaseRecordHandler(
  annotationLayerService,
  'pub.layers.annotation.annotationLayer',
);
eventProcessor.registerHandler('pub.layers.annotation.annotationLayer', annotationLayerHandler);

// Build cluster set storage and service
const clusterSetDocumentMapper = new ClusterSetDocumentMapper();
const clusterSetsRepository = new ClusterSetsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: clusterSetDocumentMapper,
  logger,
});
const clusterSetService = new ClusterSetService({
  repository: clusterSetsRepository,
  redis,
  logger,
});
const clusterSetHandler = new BaseRecordHandler(
  clusterSetService,
  'pub.layers.annotation.clusterSet',
);
eventProcessor.registerHandler('pub.layers.annotation.clusterSet', clusterSetHandler);

// Build collection membership storage and service
const collectionMembershipDocumentMapper = new CollectionMembershipDocumentMapper();
const collectionMembershipsRepository = new CollectionMembershipsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: collectionMembershipDocumentMapper,
  logger,
});
const collectionMembershipService = new CollectionMembershipService({
  repository: collectionMembershipsRepository,
  redis,
  logger,
});
const collectionMembershipHandler = new BaseRecordHandler(
  collectionMembershipService,
  'pub.layers.resource.collectionMembership',
);
eventProcessor.registerHandler(
  'pub.layers.resource.collectionMembership',
  collectionMembershipHandler,
);

// Build template storage and service
const templateDocumentMapper = new TemplateDocumentMapper();
const templatesRepository = new TemplatesRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: templateDocumentMapper,
  logger,
});
const templateService = new TemplateService({ repository: templatesRepository, redis, logger });
const templateHandler = new BaseRecordHandler(templateService, 'pub.layers.resource.template');
eventProcessor.registerHandler('pub.layers.resource.template', templateHandler);

// Build graph edge storage and service
const graphEdgeDocumentMapper = new GraphEdgeDocumentMapper();
const graphEdgesRepository = new GraphEdgesRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: graphEdgeDocumentMapper,
  logger,
});
const graphEdgeService = new GraphEdgeService({
  repository: graphEdgesRepository,
  redis,
  logger,
});
const graphEdgeHandler = new BaseRecordHandler(graphEdgeService, 'pub.layers.graph.graphEdge');
eventProcessor.registerHandler('pub.layers.graph.graphEdge', graphEdgeHandler);

// Build graph edge set storage and service
const graphEdgeSetDocumentMapper = new GraphEdgeSetDocumentMapper();
const graphEdgeSetsRepository = new GraphEdgeSetsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: graphEdgeSetDocumentMapper,
  logger,
});
const graphEdgeSetService = new GraphEdgeSetService({
  repository: graphEdgeSetsRepository,
  redis,
  logger,
});
const graphEdgeSetHandler = new BaseRecordHandler(
  graphEdgeSetService,
  'pub.layers.graph.graphEdgeSet',
);
eventProcessor.registerHandler('pub.layers.graph.graphEdgeSet', graphEdgeSetHandler);

// Build data link storage and service
const dataLinkDocumentMapper = new DataLinkDocumentMapper();
const dataLinksRepository = new DataLinksRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: dataLinkDocumentMapper,
  logger,
});
const dataLinkService = new DataLinkService({ repository: dataLinksRepository, redis, logger });
const dataLinkHandler = new BaseRecordHandler(dataLinkService, 'pub.layers.eprint.dataLink');
eventProcessor.registerHandler('pub.layers.eprint.dataLink', dataLinkHandler);

// Build alignment storage and service
const alignmentDocumentMapper = new AlignmentDocumentMapper();
const alignmentsRepository = new AlignmentsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: alignmentDocumentMapper,
  logger,
});
const alignmentService = new AlignmentService({ repository: alignmentsRepository, redis, logger });
const alignmentHandler = new BaseRecordHandler(alignmentService, 'pub.layers.alignment.alignment');
eventProcessor.registerHandler('pub.layers.alignment.alignment', alignmentHandler);

// Build experiment def storage and service
const experimentDefDocumentMapper = new ExperimentDefDocumentMapper();
const experimentDefsRepository = new ExperimentDefsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: experimentDefDocumentMapper,
  logger,
});
const experimentDefService = new ExperimentDefService({
  repository: experimentDefsRepository,
  redis,
  logger,
});
const experimentDefHandler = new BaseRecordHandler(
  experimentDefService,
  'pub.layers.judgment.experimentDef',
);
eventProcessor.registerHandler('pub.layers.judgment.experimentDef', experimentDefHandler);

// Build filling storage and service
const fillingDocumentMapper = new FillingDocumentMapper();
const fillingsRepository = new FillingsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: fillingDocumentMapper,
  logger,
});
const fillingService = new FillingService({ repository: fillingsRepository, redis, logger });
const fillingHandler = new BaseRecordHandler(fillingService, 'pub.layers.resource.filling');
eventProcessor.registerHandler('pub.layers.resource.filling', fillingHandler);

// Build template composition storage and service
const templateCompositionDocumentMapper = new TemplateCompositionDocumentMapper();
const templateCompositionsRepository = new TemplateCompositionsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: templateCompositionDocumentMapper,
  logger,
});
const templateCompositionService = new TemplateCompositionService({
  repository: templateCompositionsRepository,
  redis,
  logger,
});
const templateCompositionHandler = new BaseRecordHandler(
  templateCompositionService,
  'pub.layers.resource.templateComposition',
);
eventProcessor.registerHandler(
  'pub.layers.resource.templateComposition',
  templateCompositionHandler,
);

// Build judgment set storage and service
const judgmentSetDocumentMapper = new JudgmentSetDocumentMapper();
const judgmentSetsRepository = new JudgmentSetsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: judgmentSetDocumentMapper,
  logger,
});
const judgmentSetService = new JudgmentSetService({
  repository: judgmentSetsRepository,
  redis,
  logger,
});
const judgmentSetHandler = new BaseRecordHandler(
  judgmentSetService,
  'pub.layers.judgment.judgmentSet',
);
eventProcessor.registerHandler('pub.layers.judgment.judgmentSet', judgmentSetHandler);

// Build agreement report storage and service
const agreementReportDocumentMapper = new AgreementReportDocumentMapper();
const agreementReportsRepository = new AgreementReportsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: agreementReportDocumentMapper,
  logger,
});
const agreementReportService = new AgreementReportService({
  repository: agreementReportsRepository,
  redis,
  logger,
});
const agreementReportHandler = new BaseRecordHandler(
  agreementReportService,
  'pub.layers.judgment.agreementReport',
);
eventProcessor.registerHandler('pub.layers.judgment.agreementReport', agreementReportHandler);

// Build margin.at interop indexer and register handlers for at.margin.* collections
const marginIndexer = new MarginIndexer({ pool: pgPool, redis, logger });
const marginRecordHandler = new MarginRecordHandler(marginIndexer);
for (const nsid of MARGIN_NSIDS) {
  eventProcessor.registerHandler(nsid, marginRecordHandler);
}

// Build cross-references repository (used by cross-reference extraction in future step)
const crossReferencesRepository = new CrossReferencesRepository(pgPool);

// Build enrichment pipeline
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

// Keep references alive to prevent garbage collection
void crossReferencesRepository;

const consumer = new FirehoseConsumer(config.LAYERS_RELAY_URL, cursorManager, {
  eventFilter,
  commitHandler,
  eventProcessor,
  eventQueue,
  logger,
});

async function start(): Promise<void> {
  await cursorManager.ensureTable();
  await dlqHandler.ensureTable();
  cursorManager.startFlushInterval();
  enrichmentWorker.start();
  await consumer.start();

  logger.info(`Firehose indexer started, subscribing to ${config.LAYERS_RELAY_URL}`);
}

void start();

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully`);

  consumer.stop();
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
