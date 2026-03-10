/**
 * Enrichment handler that resolves external knowledge base references.
 *
 * Classifies each reference string by its source knowledge base (Wikidata,
 * WordNet, FrameNet) and stores the classification in PostgreSQL. Creates
 * Neo4j edges from the source record node to KB identifier nodes on a
 * best-effort basis.
 *
 * @module
 */

import type { Driver } from 'neo4j-driver';
import type { Pool } from 'pg';

import { createLogger } from '../../../observability/logger.js';
import { DatabaseError } from '../../../types/errors.js';
import type { LayersError } from '../../../types/errors.js';
import type {
  EnrichmentJob,
  EnrichmentResult,
  IEnrichmentHandler,
} from '../../../types/interfaces/enrichment.interface.js';
import type { ILogger } from '../../../types/interfaces/logger.interface.js';
import { Err, Ok, type Result } from '../../../types/result.js';
import { neo4jPolicy, pgPolicy } from '../../../utils/resilience.js';

/** Recognized knowledge base types. */
type KnowledgeBaseType = 'wikidata' | 'wordnet' | 'framenet' | 'unknown';

/** A resolved knowledge reference with its classified KB type. */
interface ResolvedKnowledgeRef {
  readonly ref: string;
  readonly kbType: KnowledgeBaseType;
  readonly resolvedAt: string;
}

/**
 * Configuration for constructing a {@link KnowledgeGraphLinkingHandler}.
 */
interface KnowledgeGraphLinkingHandlerConfig {
  readonly pgPool: Pool;
  readonly neo4jDriver: Driver;
  readonly logger?: ILogger | undefined;
}

/**
 * Mapping from collection NSIDs to their PostgreSQL table names.
 *
 * Only collections that may contain `knowledgeRefs` are included.
 */
const COLLECTION_TO_TABLE: Readonly<Record<string, string>> = {
  'pub.layers.expression.expression': 'expressions_index',
  'pub.layers.annotation.annotationLayer': 'annotation_layers_index',
  'pub.layers.graph.graphNode': 'graph_nodes_index',
};

/**
 * Classifies a knowledge reference string by its source knowledge base.
 *
 * Recognition rules:
 * - Wikidata: starts with `Q` followed by one or more digits (e.g., `Q42`)
 * - FrameNet: starts with `FN:` prefix (e.g., `FN:Motion`)
 * - WordNet: dot-separated parts ending in digits (e.g., `noun.entity.01`)
 * - Unknown: anything else
 *
 * @param ref - the knowledge reference string to classify
 * @returns the classified knowledge base type
 *
 * @example
 * ```typescript
 * classifyKnowledgeRef('Q42');           // 'wikidata'
 * classifyKnowledgeRef('FN:Motion');     // 'framenet'
 * classifyKnowledgeRef('noun.entity.01'); // 'wordnet'
 * classifyKnowledgeRef('unknown-ref');    // 'unknown'
 * ```
 */
function classifyKnowledgeRef(ref: string): KnowledgeBaseType {
  if (/^Q\d+$/.test(ref)) return 'wikidata';
  if (ref.startsWith('FN:')) return 'framenet';
  if (/^\w+\.\w+\.\d+$/.test(ref)) return 'wordnet';
  return 'unknown';
}

/**
 * Extracts the collection NSID from an AT-URI.
 *
 * @param uri - an AT-URI in the format `at://{did}/{collection}/{rkey}`
 * @returns the collection NSID, or an empty string if the URI cannot be parsed
 */
function extractCollection(uri: string): string {
  const parts = uri.replace('at://', '').split('/');
  return parts[1] ?? '';
}

/**
 * Enrichment handler that classifies and stores knowledge base references.
 *
 * Receives an enrichment job with `type: 'knowledgeGraphLinking'` and a
 * `data.knowledgeRefs` array of external KB identifier strings. Each ref
 * is classified by KB type, then the resolved set is persisted to the
 * source record's JSONB column in PostgreSQL. Neo4j edges from the source
 * node to KB identifier nodes are created on a best-effort basis.
 *
 * @example
 * ```typescript
 * const handler = new KnowledgeGraphLinkingHandler({ pgPool, neo4jDriver });
 * const result = await handler.handle({
 *   type: 'knowledgeGraphLinking',
 *   uri: 'at://did:plc:abc/pub.layers.annotation.annotationLayer/123',
 *   collection: 'pub.layers.annotation.annotationLayer',
 *   data: { knowledgeRefs: ['Q42', 'FN:Motion', 'noun.entity.01'] },
 * });
 * ```
 */
class KnowledgeGraphLinkingHandler implements IEnrichmentHandler {
  readonly type = 'knowledgeGraphLinking' as const;
  private readonly pgPool: Pool;
  private readonly neo4jDriver: Driver;
  private readonly logger: ILogger;

  constructor(config: KnowledgeGraphLinkingHandlerConfig) {
    this.pgPool = config.pgPool;
    this.neo4jDriver = config.neo4jDriver;
    this.logger = config.logger ?? createLogger({ service: 'kb-linking-handler' });
  }

  /**
   * Classifies knowledge references and persists the results.
   *
   * @param job - the enrichment job containing the source URI and knowledge refs
   * @returns the enrichment result with the count of resolved references
   */
  async handle(job: EnrichmentJob): Promise<Result<EnrichmentResult, LayersError>> {
    const { uri, data } = job;
    const rawRefs: unknown = data.knowledgeRefs;
    const knowledgeRefs: readonly string[] = Array.isArray(rawRefs)
      ? rawRefs.filter((ref): ref is string => typeof ref === 'string')
      : [];

    if (knowledgeRefs.length === 0) {
      return Ok({
        type: 'knowledgeGraphLinking',
        uri,
        success: true,
        metadata: { resolved: 0 },
      });
    }

    const now = new Date().toISOString();
    const resolved: readonly ResolvedKnowledgeRef[] = knowledgeRefs.map((ref) => ({
      ref,
      kbType: classifyKnowledgeRef(ref),
      resolvedAt: now,
    }));

    try {
      const collection = extractCollection(uri);
      const table = COLLECTION_TO_TABLE[collection];

      if (table) {
        await pgPolicy.execute(async () => {
          await this.pgPool.query(
            `UPDATE ${table} SET record = jsonb_set(COALESCE(record, '{}'::jsonb), '{_resolvedKnowledgeRefs}', $1::jsonb) WHERE uri = $2`,
            [JSON.stringify(resolved), uri],
          );
        });
      }

      // Neo4j edge creation is best-effort; failures do not cause the handler to return an error
      await this.createNeo4jEdges(uri, resolved);

      this.logger.debug('Knowledge graph linking complete', {
        uri,
        resolved: resolved.length,
      });

      return Ok({
        type: 'knowledgeGraphLinking',
        uri,
        success: true,
        metadata: { resolved: resolved.length },
      });
    } catch (err: unknown) {
      const dbError = new DatabaseError(
        `Knowledge graph linking failed for ${uri}`,
        err instanceof Error ? err : undefined,
      );
      this.logger.error('KB linking failed', { uri, error: dbError.message });
      return Err(dbError);
    }
  }

  /**
   * Creates Neo4j edges from the source node to KB identifier nodes.
   *
   * Each resolved ref becomes a `KnowledgeBase` node connected to the
   * source node via a `KNOWLEDGE_REF` relationship. Failures are logged
   * but do not propagate.
   */
  private async createNeo4jEdges(
    uri: string,
    resolved: readonly ResolvedKnowledgeRef[],
  ): Promise<void> {
    try {
      await neo4jPolicy.execute(async () => {
        const session = this.neo4jDriver.session();
        try {
          for (const ref of resolved) {
            await session.run(
              `MERGE (kb:KnowledgeBase {identifier: $ref, kbType: $kbType})
               WITH kb
               MATCH (source {uri: $uri})
               MERGE (source)-[:KNOWLEDGE_REF]->(kb)`,
              { ref: ref.ref, kbType: ref.kbType, uri },
            );
          }
        } finally {
          await session.close();
        }
      });
    } catch (err: unknown) {
      this.logger.warn('Neo4j KB linking failed', {
        uri,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export { classifyKnowledgeRef, extractCollection, KnowledgeGraphLinkingHandler };
export type { KnowledgeBaseType, KnowledgeGraphLinkingHandlerConfig, ResolvedKnowledgeRef };
