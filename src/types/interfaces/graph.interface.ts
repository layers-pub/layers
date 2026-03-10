/**
 * Abstract graph backend interface for Neo4j operations.
 *
 * @module
 */

import type { DatabaseError } from '../errors.js';
import type { Result } from '../result.js';

/**
 * Defines the contract for graph database operations.
 *
 * Implementations handle node and edge management in Neo4j for
 * cross-reference networks, knowledge graphs, and annotation
 * cluster relationships. All methods return {@link Result}
 * to force explicit error handling at call sites.
 */
export interface IGraphBackend {
  /**
   * Creates or updates a node with the given label and properties.
   *
   * Uses MERGE semantics: creates the node if it does not exist,
   * or updates its properties if it does.
   *
   * @param label - the Neo4j node label (e.g., "Expression", "AnnotationLayer")
   * @param properties - the node properties to set
   * @returns void on success, or a {@link DatabaseError}
   */
  mergeNode(
    label: string,
    properties: Record<string, unknown>,
  ): Promise<Result<void, DatabaseError>>;

  /**
   * Creates or updates an edge between two nodes identified by AT-URI.
   *
   * Uses MERGE semantics on the relationship. Both source and target
   * nodes must already exist.
   *
   * @param fromUri - the AT-URI of the source node
   * @param toUri - the AT-URI of the target node
   * @param type - the relationship type (e.g., "ANNOTATES", "MEMBER_OF")
   * @param properties - optional properties to set on the relationship
   * @returns void on success, or a {@link DatabaseError}
   */
  mergeEdge(
    fromUri: string,
    toUri: string,
    type: string,
    properties?: Record<string, unknown>,
  ): Promise<Result<void, DatabaseError>>;

  /**
   * Deletes a node and all its relationships by AT-URI.
   *
   * @param uri - the AT-URI of the node to remove
   * @returns void on success, or a {@link DatabaseError}
   */
  deleteNode(uri: string): Promise<Result<void, DatabaseError>>;

  /**
   * Runs schema constraint statements (e.g., uniqueness constraints, indexes).
   *
   * Existing constraints are silently ignored. Each statement runs in its
   * own session.
   *
   * @param statements - array of Cypher constraint/index statements
   * @returns void on success, or a {@link DatabaseError}
   */
  ensureConstraints(statements: string[]): Promise<Result<void, DatabaseError>>;

  /**
   * Checks whether the graph backend is reachable and operational.
   *
   * @returns void on success, or a {@link DatabaseError}
   */
  healthCheck(): Promise<Result<void, DatabaseError>>;
}
