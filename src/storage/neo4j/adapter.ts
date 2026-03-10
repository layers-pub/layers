/**
 * Neo4j graph adapter implementing {@link IGraphBackend}.
 *
 * @module
 */

import type { Driver } from 'neo4j-driver';

import { createLogger } from '../../observability/logger.js';
import { DatabaseError } from '../../types/errors.js';
import type { IGraphBackend } from '../../types/interfaces/graph.interface.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { neo4jPolicy } from '../../utils/resilience.js';

const logger = createLogger({ service: 'neo4j-adapter' });

/**
 * Node labels that may be used in Cypher queries.
 *
 * Validated before any query because labels cannot be parameterized in
 * Cypher and must be interpolated into the query string.
 */
const ALLOWED_LABELS = new Set([
  'Expression',
  'Segmentation',
  'AnnotationLayer',
  'ClusterSet',
  'Ontology',
  'TypeDef',
  'Corpus',
  'CorpusMembership',
  'Persona',
  'Media',
  'Eprint',
  'Resource',
  'Graph',
  'GraphEdge',
  'GraphEdgeSet',
  'Alignment',
  'Judgment',
  'Changelog',
  'DataLink',
  'Template',
  'ExperimentDef',
]);

/**
 * Relationship types that may be used in Cypher queries.
 *
 * Validated before any edge query because relationship types cannot be
 * parameterized in Cypher.
 */
const ALLOWED_EDGE_TYPES = new Set([
  'PARENT_OF',
  'REFERENCES',
  'ANNOTATES',
  'MEMBER_OF',
  'SEGMENTED_BY',
  'CONTAINS',
  'LINKS_TO',
  'DERIVED_FROM',
  'USES_ONTOLOGY',
  'BY_PERSONA',
  'ALIGNS',
  'GRAPH_EDGE',
]);

/**
 * Validates that a node label is in the allowlist.
 *
 * @param label - the label to validate
 * @throws {DatabaseError} if the label is not allowed
 */
function assertAllowedLabel(label: string): void {
  if (!ALLOWED_LABELS.has(label)) {
    throw new DatabaseError(`Label "${label}" is not in the allowlist`);
  }
}

/**
 * Validates that a relationship type is in the allowlist.
 *
 * @param type - the relationship type to validate
 * @throws {DatabaseError} if the type is not allowed
 */
function assertAllowedEdgeType(type: string): void {
  if (!ALLOWED_EDGE_TYPES.has(type)) {
    throw new DatabaseError(`Edge type "${type}" is not in the allowlist`);
  }
}

/**
 * Neo4j adapter wrapping the official Driver with cockatiel resilience.
 *
 * All public methods return {@link Result} and route through the shared
 * {@link neo4jPolicy} for retry, circuit breaking, bulkhead, and timeout
 * protection. Sessions are opened per-operation and closed in finally blocks.
 */
export class Neo4jAdapter implements IGraphBackend {
  private readonly driver: Driver;

  constructor(driver: Driver) {
    this.driver = driver;
  }

  /**
   * Creates or updates a node using MERGE on the `uri` property.
   *
   * The `uri` field is used as the merge key. All other properties are
   * set via `SET n += $props`.
   *
   * @param label - the Neo4j node label (must be in {@link ALLOWED_LABELS})
   * @param properties - must include a `uri` field
   */
  async mergeNode(
    label: string,
    properties: Record<string, unknown>,
  ): Promise<Result<void, DatabaseError>> {
    try {
      assertAllowedLabel(label);

      const uri = properties.uri;
      if (uri === undefined || uri === null) {
        return Err(new DatabaseError('Properties must include a "uri" field for mergeNode'));
      }

      const { uri: _uri, ...rest } = properties;

      const cypher = `MERGE (n:${label} {uri: $uri}) SET n += $props`;

      await neo4jPolicy.execute(async () => {
        const session = this.driver.session();
        try {
          await session.run(cypher, { uri, props: rest });
        } finally {
          await session.close();
        }
      });

      logger.debug('Node merged', { label, uri });
      return Ok(undefined);
    } catch (err) {
      const error = new DatabaseError(
        `Failed to merge node with label ${label}`,
        err instanceof Error ? err : undefined,
      );
      logger.error('mergeNode failed', { label, error: error.message });
      return Err(error);
    }
  }

  /**
   * Creates or updates an edge between two nodes identified by AT-URI.
   *
   * Both source and target nodes must already exist. If either is missing,
   * the MATCH clause finds nothing and the MERGE silently has no effect.
   *
   * @param fromUri - the AT-URI of the source node
   * @param toUri - the AT-URI of the target node
   * @param type - the relationship type (must be in {@link ALLOWED_EDGE_TYPES})
   * @param properties - optional properties to set on the relationship
   */
  async mergeEdge(
    fromUri: string,
    toUri: string,
    type: string,
    properties?: Record<string, unknown>,
  ): Promise<Result<void, DatabaseError>> {
    try {
      assertAllowedEdgeType(type);

      const cypher = `MATCH (a {uri: $fromUri}) MATCH (b {uri: $toUri}) MERGE (a)-[r:${type}]->(b) SET r += $props`;

      await neo4jPolicy.execute(async () => {
        const session = this.driver.session();
        try {
          await session.run(cypher, {
            fromUri,
            toUri,
            props: properties ?? {},
          });
        } finally {
          await session.close();
        }
      });

      logger.debug('Edge merged', { fromUri, toUri, type });
      return Ok(undefined);
    } catch (err) {
      const error = new DatabaseError(
        `Failed to merge edge of type ${type}`,
        err instanceof Error ? err : undefined,
      );
      logger.error('mergeEdge failed', { type, error: error.message });
      return Err(error);
    }
  }

  /**
   * Deletes a node and all its relationships by AT-URI.
   *
   * Uses DETACH DELETE to remove all edges before deleting the node.
   *
   * @param uri - the AT-URI of the node to remove
   */
  async deleteNode(uri: string): Promise<Result<void, DatabaseError>> {
    try {
      await neo4jPolicy.execute(async () => {
        const session = this.driver.session();
        try {
          await session.run('MATCH (n {uri: $uri}) DETACH DELETE n', { uri });
        } finally {
          await session.close();
        }
      });

      logger.debug('Node deleted', { uri });
      return Ok(undefined);
    } catch (err) {
      const error = new DatabaseError(
        'Failed to delete node',
        err instanceof Error ? err : undefined,
      );
      logger.error('deleteNode failed', { uri, error: error.message });
      return Err(error);
    }
  }

  /**
   * Runs schema constraint and index statements.
   *
   * Each statement runs in its own session. Errors for constraints that
   * already exist are silently ignored.
   *
   * @param statements - array of Cypher constraint/index statements
   */
  async ensureConstraints(statements: string[]): Promise<Result<void, DatabaseError>> {
    try {
      for (const statement of statements) {
        await neo4jPolicy.execute(async () => {
          const session = this.driver.session();
          try {
            await session.run(statement);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (
              message.includes('already exists') ||
              message.includes('An equivalent constraint already exists')
            ) {
              logger.debug('Constraint already exists, skipping', { statement });
              return;
            }
            throw err;
          } finally {
            await session.close();
          }
        });
      }

      logger.info('Constraints ensured', { count: statements.length });
      return Ok(undefined);
    } catch (err) {
      const error = new DatabaseError(
        'Failed to ensure constraints',
        err instanceof Error ? err : undefined,
      );
      logger.error('ensureConstraints failed', { error: error.message });
      return Err(error);
    }
  }

  /**
   * Verifies connectivity by executing `RETURN 1` in a session.
   */
  async healthCheck(): Promise<Result<void, DatabaseError>> {
    try {
      await neo4jPolicy.execute(async () => {
        const session = this.driver.session();
        try {
          await session.run('RETURN 1');
        } finally {
          await session.close();
        }
      });

      return Ok(undefined);
    } catch (err) {
      const error = new DatabaseError(
        'Neo4j health check failed',
        err instanceof Error ? err : undefined,
      );
      return Err(error);
    }
  }
}
