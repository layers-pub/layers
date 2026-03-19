/**
 * Layers appview API server entry point.
 *
 * Initializes OpenTelemetry, loads configuration, connects to all four
 * storage backends, builds the Hono application with the 7-layer middleware
 * stack, and starts serving XRPC and REST queries.
 *
 * @packageDocumentation
 */
import 'reflect-metadata';

import { serve } from '@hono/node-server';
import { container } from 'tsyringe';

import { createApp } from './api/app.js';
import { alignmentMethods } from './api/handlers/xrpc/alignment/index.js';
import { crossReferenceMethods } from './api/handlers/xrpc/cross-reference/index.js';
import { annotationLayerMethods } from './api/handlers/xrpc/annotation/layer-methods.js';
import { clusterSetMethods } from './api/handlers/xrpc/annotation/cluster-set-methods.js';
import { changelogMethods } from './api/handlers/xrpc/changelog/index.js';
import { corpusMethods } from './api/handlers/xrpc/corpus/index.js';
import { corpusMembershipMethods } from './api/handlers/xrpc/corpus/membership-methods.js';
import { dataLinkMethods } from './api/handlers/xrpc/eprint/data-link-methods.js';
import { eprintMethods } from './api/handlers/xrpc/eprint/index.js';
import { expressionMethods } from './api/handlers/xrpc/expression/index.js';
import { graphEdgeMethods } from './api/handlers/xrpc/graph/edge-methods.js';
import { graphEdgeSetMethods } from './api/handlers/xrpc/graph/edge-set-methods.js';
import { graphNodeMethods } from './api/handlers/xrpc/graph/node-methods.js';
import { agreementReportMethods } from './api/handlers/xrpc/judgment/agreement-report-methods.js';
import { experimentDefMethods } from './api/handlers/xrpc/judgment/experiment-def-methods.js';
import { judgmentSetMethods } from './api/handlers/xrpc/judgment/judgment-set-methods.js';
import { mediaMethods } from './api/handlers/xrpc/media/index.js';
import { ontologyMethods } from './api/handlers/xrpc/ontology/index.js';
import { typeDefMethods } from './api/handlers/xrpc/ontology/type-def-methods.js';
import { personaMethods } from './api/handlers/xrpc/persona/index.js';
import { collectionMembershipMethods } from './api/handlers/xrpc/resource/collection-membership-methods.js';
import { resourceCollectionMethods } from './api/handlers/xrpc/resource/collection-methods.js';
import { resourceEntryMethods } from './api/handlers/xrpc/resource/entry-methods.js';
import { fillingMethods } from './api/handlers/xrpc/resource/filling-methods.js';
import { templateCompositionMethods } from './api/handlers/xrpc/resource/template-composition-methods.js';
import { templateMethods } from './api/handlers/xrpc/resource/template-methods.js';
import { segmentationMethods } from './api/handlers/xrpc/segmentation/index.js';
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
import { CrossReferencesRepository } from './storage/postgresql/cross-references-repository.js';
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

// Build session manager for JWT auth
const sessionManager = new SessionManager({ jwtSecret: config.JWT_SECRET }, redis);

// Build OAuth client if configured (optional; without it, OAuth routes are not registered)
const oauthClient =
  config.OAUTH_CLIENT_ID && config.OAUTH_REDIRECT_URI
    ? createLayersOAuthClient({
        clientId: config.OAUTH_CLIENT_ID,
        redirectUri: config.OAUTH_REDIRECT_URI,
        redis,
      })
    : undefined;

// Register clients in DI container
container.register('PgPool', { useValue: pgPool });
container.register('EsClient', { useValue: esClient });
container.register('Neo4jDriver', { useValue: neo4jDriver });
container.register('Redis', { useValue: redis });
container.register('SessionManager', { useValue: sessionManager });

// Build storage adapters and services
const pgAdapter = new PostgreSQLAdapter(pgPool);
const esAdapter = new ElasticsearchAdapter(esClient);
const neo4jAdapter = new Neo4jAdapter(neo4jDriver);
const documentMapper = new ExpressionDocumentMapper();

const expressionsRepository = new ExpressionsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper,
});

const expressionService = new ExpressionService({
  repository: expressionsRepository,
  redis,
});

container.register('ExpressionService', { useValue: expressionService });

const personaDocumentMapper = new PersonaDocumentMapper();

const personasRepository = new PersonasRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: personaDocumentMapper,
});

const personaService = new PersonaService({
  repository: personasRepository,
  redis,
});

container.register('PersonaService', { useValue: personaService });

// Build ontology storage and service
const ontologyDocumentMapper = new OntologyDocumentMapper();
const ontologiesRepository = new OntologiesRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: ontologyDocumentMapper,
});
const ontologyService = new OntologyService({ repository: ontologiesRepository, redis });
container.register('OntologyService', { useValue: ontologyService });

// Build corpus storage and service
const corpusDocumentMapper = new CorpusDocumentMapper();
const corporaRepository = new CorporaRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: corpusDocumentMapper,
});
const corpusService = new CorpusService({ repository: corporaRepository, redis });
container.register('CorpusService', { useValue: corpusService });

// Build media storage and service
const mediaDocumentMapper = new MediaDocumentMapper();
const mediaRepository = new MediaRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: mediaDocumentMapper,
});
const mediaService = new MediaService({ repository: mediaRepository, redis });
container.register('MediaService', { useValue: mediaService });

// Build eprint storage and service
const eprintDocumentMapper = new EprintDocumentMapper();
const eprintsRepository = new EprintsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: eprintDocumentMapper,
});
const eprintService = new EprintService({ repository: eprintsRepository, redis });
container.register('EprintService', { useValue: eprintService });

// Build segmentation storage and service
const segmentationDocumentMapper = new SegmentationDocumentMapper();
const segmentationsRepository = new SegmentationsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: segmentationDocumentMapper,
});
const segmentationService = new SegmentationService({ repository: segmentationsRepository, redis });
container.register('SegmentationService', { useValue: segmentationService });

// Build typeDef storage and service
const typeDefDocumentMapper = new TypeDefDocumentMapper();
const typeDefsRepository = new TypeDefsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: typeDefDocumentMapper,
});
const typeDefService = new TypeDefService({ repository: typeDefsRepository, redis });
container.register('TypeDefService', { useValue: typeDefService });

// Build corpus membership storage and service
const corpusMembershipDocumentMapper = new CorpusMembershipDocumentMapper();
const corpusMembershipsRepository = new CorpusMembershipsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: corpusMembershipDocumentMapper,
});
const corpusMembershipService = new CorpusMembershipService({
  repository: corpusMembershipsRepository,
  redis,
});
container.register('CorpusMembershipService', { useValue: corpusMembershipService });

// Build resource collection storage and service
const resourceCollectionDocumentMapper = new ResourceCollectionDocumentMapper();
const resourceCollectionsRepository = new ResourceCollectionsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: resourceCollectionDocumentMapper,
});
const resourceCollectionService = new ResourceCollectionService({
  repository: resourceCollectionsRepository,
  redis,
});
container.register('ResourceCollectionService', { useValue: resourceCollectionService });

// Build resource entry storage and service
const resourceEntryDocumentMapper = new ResourceEntryDocumentMapper();
const resourceEntriesRepository = new ResourceEntriesRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: resourceEntryDocumentMapper,
});
const resourceEntryService = new ResourceEntryService({
  repository: resourceEntriesRepository,
  redis,
});
container.register('ResourceEntryService', { useValue: resourceEntryService });

// Build graph node storage and service
const graphNodeDocumentMapper = new GraphNodeDocumentMapper();
const graphNodesRepository = new GraphNodesRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: graphNodeDocumentMapper,
});
const graphNodeService = new GraphNodeService({ repository: graphNodesRepository, redis });
container.register('GraphNodeService', { useValue: graphNodeService });

// Build changelog storage and service
const changelogDocumentMapper = new ChangelogDocumentMapper();
const changelogsRepository = new ChangelogsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: changelogDocumentMapper,
});
const changelogService = new ChangelogService({ repository: changelogsRepository, redis });
container.register('ChangelogService', { useValue: changelogService });

// Build annotation layer storage and service
const annotationLayerDocumentMapper = new AnnotationLayerDocumentMapper();
const annotationLayersRepository = new AnnotationLayersRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: annotationLayerDocumentMapper,
});
const annotationLayerService = new AnnotationLayerService({
  repository: annotationLayersRepository,
  redis,
});
container.register('AnnotationLayerService', { useValue: annotationLayerService });

// Build cluster set storage and service
const clusterSetDocumentMapper = new ClusterSetDocumentMapper();
const clusterSetsRepository = new ClusterSetsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: clusterSetDocumentMapper,
});
const clusterSetService = new ClusterSetService({ repository: clusterSetsRepository, redis });
container.register('ClusterSetService', { useValue: clusterSetService });

// Build collection membership storage and service
const collectionMembershipDocumentMapper = new CollectionMembershipDocumentMapper();
const collectionMembershipsRepository = new CollectionMembershipsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: collectionMembershipDocumentMapper,
});
const collectionMembershipService = new CollectionMembershipService({
  repository: collectionMembershipsRepository,
  redis,
});
container.register('CollectionMembershipService', { useValue: collectionMembershipService });

// Build template storage and service
const templateDocumentMapper = new TemplateDocumentMapper();
const templatesRepository = new TemplatesRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: templateDocumentMapper,
});
const templateService = new TemplateService({ repository: templatesRepository, redis });
container.register('TemplateService', { useValue: templateService });

// Build graph edge storage and service
const graphEdgeDocumentMapper = new GraphEdgeDocumentMapper();
const graphEdgesRepository = new GraphEdgesRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: graphEdgeDocumentMapper,
});
const graphEdgeService = new GraphEdgeService({ repository: graphEdgesRepository, redis });
container.register('GraphEdgeService', { useValue: graphEdgeService });

// Build graph edge set storage and service
const graphEdgeSetDocumentMapper = new GraphEdgeSetDocumentMapper();
const graphEdgeSetsRepository = new GraphEdgeSetsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: graphEdgeSetDocumentMapper,
});
const graphEdgeSetService = new GraphEdgeSetService({
  repository: graphEdgeSetsRepository,
  redis,
});
container.register('GraphEdgeSetService', { useValue: graphEdgeSetService });

// Build data link storage and service
const dataLinkDocumentMapper = new DataLinkDocumentMapper();
const dataLinksRepository = new DataLinksRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: dataLinkDocumentMapper,
});
const dataLinkService = new DataLinkService({ repository: dataLinksRepository, redis });
container.register('DataLinkService', { useValue: dataLinkService });

// Build alignment storage and service
const alignmentDocumentMapper = new AlignmentDocumentMapper();
const alignmentsRepository = new AlignmentsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: alignmentDocumentMapper,
});
const alignmentService = new AlignmentService({ repository: alignmentsRepository, redis });
container.register('AlignmentService', { useValue: alignmentService });

// Build experiment def storage and service
const experimentDefDocumentMapper = new ExperimentDefDocumentMapper();
const experimentDefsRepository = new ExperimentDefsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: experimentDefDocumentMapper,
});
const experimentDefService = new ExperimentDefService({
  repository: experimentDefsRepository,
  redis,
});
container.register('ExperimentDefService', { useValue: experimentDefService });

// Build filling storage and service
const fillingDocumentMapper = new FillingDocumentMapper();
const fillingsRepository = new FillingsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: fillingDocumentMapper,
});
const fillingService = new FillingService({ repository: fillingsRepository, redis });
container.register('FillingService', { useValue: fillingService });

// Build template composition storage and service
const templateCompositionDocumentMapper = new TemplateCompositionDocumentMapper();
const templateCompositionsRepository = new TemplateCompositionsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: templateCompositionDocumentMapper,
});
const templateCompositionService = new TemplateCompositionService({
  repository: templateCompositionsRepository,
  redis,
});
container.register('TemplateCompositionService', { useValue: templateCompositionService });

// Build judgment set storage and service
const judgmentSetDocumentMapper = new JudgmentSetDocumentMapper();
const judgmentSetsRepository = new JudgmentSetsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: judgmentSetDocumentMapper,
});
const judgmentSetService = new JudgmentSetService({ repository: judgmentSetsRepository, redis });
container.register('JudgmentSetService', { useValue: judgmentSetService });

// Build agreement report storage and service
const agreementReportDocumentMapper = new AgreementReportDocumentMapper();
const agreementReportsRepository = new AgreementReportsRepository({
  pgAdapter,
  esAdapter,
  neo4jAdapter,
  documentMapper: agreementReportDocumentMapper,
});
const agreementReportService = new AgreementReportService({
  repository: agreementReportsRepository,
  redis,
});
container.register('AgreementReportService', { useValue: agreementReportService });

// Build cross-references repository
const crossReferencesRepository = new CrossReferencesRepository(pgPool);
container.register('CrossReferencesRepository', { useValue: crossReferencesRepository });

// Build job scheduler and register background jobs
const jobScheduler = new JobScheduler();

jobScheduler.register(
  new EsReconciliationJob({
    name: 'es-reconciliation',
    intervalMs: 6 * 60 * 60 * 1000, // 6 hours
    pgPool,
    esClient,
  }),
);

jobScheduler.register(
  new Neo4jReconciliationJob({
    name: 'neo4j-reconciliation',
    intervalMs: 24 * 60 * 60 * 1000, // Daily
    pgPool,
    neo4jDriver,
  }),
);

jobScheduler.register(
  new StalenessDetectionJob({
    name: 'staleness-detection',
    intervalMs: 24 * 60 * 60 * 1000, // Daily
    pgPool,
  }),
);

jobScheduler.register(
  new MaterializedViewRefreshJob({
    name: 'materialized-view-refresh',
    intervalMs: 15 * 60 * 1000, // 15 minutes
    pgPool,
  }),
);

// Build panproto service for format conversion
const panprotoService = new PanprotoService(redis);
container.register('IPanprotoService', { useValue: panprotoService });

// Build plugin registry and register format importers/exporters
const pluginRegistry = new PluginRegistry();
pluginRegistry.register(new BeadJsonlinesImporter());
for (const importer of createPanprotoImporters(panprotoService)) {
  pluginRegistry.register(importer);
}
container.register('PluginRegistry', { useValue: pluginRegistry });

// Build margin.at interop indexer for external annotations
const marginIndexer = new MarginIndexer({ pool: pgPool, redis });

// Build XRPC method map
const xrpcMethods = {
  ...expressionMethods(),
  ...personaMethods(),
  ...ontologyMethods(),
  ...typeDefMethods(),
  ...corpusMethods(),
  ...corpusMembershipMethods(),
  ...mediaMethods(),
  ...eprintMethods(),
  ...dataLinkMethods(),
  ...segmentationMethods(),
  ...resourceCollectionMethods(),
  ...resourceEntryMethods(),
  ...collectionMembershipMethods(),
  ...templateMethods(),
  ...fillingMethods(),
  ...templateCompositionMethods(),
  ...graphNodeMethods(),
  ...graphEdgeMethods(),
  ...graphEdgeSetMethods(),
  ...changelogMethods(),
  ...annotationLayerMethods(),
  ...clusterSetMethods(),
  ...alignmentMethods(),
  ...experimentDefMethods(),
  ...judgmentSetMethods(),
  ...agreementReportMethods(),
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

// Start scheduled jobs
jobScheduler.startAll();

// Graceful shutdown
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
