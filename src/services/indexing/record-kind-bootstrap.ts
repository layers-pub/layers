/**
 * Lens-driven bootstrap for every pub.layers.* record kind.
 *
 * Reads the lens registry + generated record registry + generated zod schemas
 * and produces:
 *
 * - one `BaseRepository` per kind (with `extractRow`/`extractNodeProps`/
 *   `extractEdges` derived from the lens DSL)
 * - one `LensRecordService` per kind (schema validation, caching, search)
 * - one `BaseRecordHandler` per kind, pre-registered with the EventProcessor
 *
 * Consumers (indexer.ts for ingestion, index.ts for the API server) replace
 * their per-record instantiation blocks with a single call to this module.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import { recordSchemasByNsid, backendRecordKinds } from '../../generated/record-registry.js';
import { createLogger } from '../../observability/logger.js';
import type { ElasticsearchAdapter } from '../../storage/elasticsearch/adapter.js';
import type { Neo4jAdapter } from '../../storage/neo4j/adapter.js';
import type { PostgreSQLAdapter } from '../../storage/postgresql/adapter.js';
import { BaseRepository } from '../../storage/base-repository.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';

import { BaseRecordHandler } from './handlers/base-record-handler.js';
import { documentMapperFromLens, recordTypeConfigFromLens } from './lens-record-config.js';
import { LensRecordService } from './lens-record-service.js';
import { loadLensRegistry } from './lens-registry.js';
import type { EventProcessor } from './event-processor.js';

export interface BootstrapDeps {
  readonly pgAdapter: PostgreSQLAdapter;
  readonly esAdapter: ElasticsearchAdapter;
  readonly neo4jAdapter: Neo4jAdapter;
  readonly redis: Redis;
  readonly logger?: ILogger;
  /** Optional — pass through to register per-kind handlers for ingestion. */
  readonly eventProcessor?: EventProcessor;
}

export interface BootstrappedKind {
  readonly nsid: string;
  readonly slug: string;
  readonly serviceKey: string;
  readonly service: LensRecordService<never>;
  readonly repository: BaseRepository<unknown, never>;
  readonly handler: BaseRecordHandler;
}

export interface Bootstrap {
  readonly kinds: readonly BootstrappedKind[];
  readonly servicesByKey: ReadonlyMap<string, LensRecordService<never>>;
}

function slugToPascal(slug: string): string {
  return slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

/**
 * Instantiates repositories + services + indexer handlers for every record
 * kind declared in the generated registry. Returns a handle the caller can
 * drop directly into DI / the EventProcessor.
 */
export function bootstrapRecordKinds(deps: BootstrapDeps): Bootstrap {
  const logger = deps.logger ?? createLogger({ service: 'record-kind-bootstrap' });
  const lensRegistry = loadLensRegistry();

  const kinds: BootstrappedKind[] = [];
  const servicesByKey = new Map<string, LensRecordService<never>>();

  for (const kind of backendRecordKinds) {
    const spec = lensRegistry.get(kind.nsid);
    if (!spec || !spec.table || !spec.esIndex || !spec.neo4jLabel || !spec.resourceName) {
      logger.warn('Skipping record kind: missing storage spec', { nsid: kind.nsid });
      continue;
    }

    const recordSchema = recordSchemasByNsid[kind.nsid];
    if (!recordSchema) {
      logger.warn('Skipping record kind: no zod schema', { nsid: kind.nsid });
      continue;
    }

    const config = recordTypeConfigFromLens(spec);
    const documentMapper = documentMapperFromLens(spec);

    const repository = new BaseRepository<unknown, never>(
      {
        pgAdapter: deps.pgAdapter,
        esAdapter: deps.esAdapter,
        neo4jAdapter: deps.neo4jAdapter,
        documentMapper,
        logger,
      },
      config,
    );

    const service = new LensRecordService<never>({
      repository,
      redis: deps.redis,
      esAdapter: deps.esAdapter,
      spec,
      recordSchema,
      toView: (row) => defaultRowToView(row as Record<string, unknown>) as never,
      logger,
    });

    const serviceKey = `${slugToPascal(kind.slug)}Service`;
    servicesByKey.set(serviceKey, service);

    const handler = new BaseRecordHandler(service, kind.nsid);
    if (deps.eventProcessor) {
      deps.eventProcessor.registerHandler(kind.nsid, handler);
    }

    kinds.push({ nsid: kind.nsid, slug: kind.slug, serviceKey, service, repository, handler });
  }

  logger.info('Record-kind bootstrap complete', { count: kinds.length });
  return { kinds, servicesByKey };
}

/**
 * Default row → API view projection: camelCase `indexedAt` as ISO string;
 * every other column passes through unchanged. Matches every hand-written
 * per-record `toXxxView` the old services used.
 */
function defaultRowToView(row: Record<string, unknown>): Record<string, unknown> {
  const view: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'indexed_at') {
      view.indexedAt = v instanceof Date ? v.toISOString() : v;
    } else {
      view[k] = v;
    }
  }
  return view;
}
