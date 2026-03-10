/**
 * Abstract search engine interface for Elasticsearch operations.
 *
 * @module
 */

import type { DatabaseError } from '../errors.js';
import type { Result } from '../result.js';

/**
 * Parameters for an Elasticsearch search query.
 */
export interface SearchRequest {
  readonly index: string;
  readonly query: Record<string, unknown>;
  readonly from?: number;
  readonly size?: number;
  readonly sort?: Record<string, unknown>[];
}

/**
 * Structured response from an Elasticsearch search query.
 */
export interface SearchResponse {
  readonly hits: Record<string, unknown>[];
  readonly total: number;
  readonly aggregations?: Record<string, unknown>;
}

/**
 * Defines the contract for search engine operations.
 *
 * Implementations handle document indexing, deletion, and full-text search
 * across all Elasticsearch indices. All methods return {@link Result}
 * to force explicit error handling at call sites.
 */
export interface ISearchEngine {
  /**
   * Indexes a document in the specified index.
   *
   * @param index - the target Elasticsearch index
   * @param id - the document identifier (typically the AT-URI)
   * @param body - the document fields to index
   * @returns void on success, or a {@link DatabaseError}
   */
  indexDocument(
    index: string,
    id: string,
    body: Record<string, unknown>,
  ): Promise<Result<void, DatabaseError>>;

  /**
   * Deletes a document from the specified index.
   *
   * @param index - the Elasticsearch index containing the document
   * @param id - the document identifier to remove
   * @returns void on success, or a {@link DatabaseError}
   */
  deleteDocument(index: string, id: string): Promise<Result<void, DatabaseError>>;

  /**
   * Executes a search query against an Elasticsearch index.
   *
   * @param request - the search parameters including index, query, pagination, and sorting
   * @returns matching documents with total count and optional aggregations, or a {@link DatabaseError}
   */
  search(request: SearchRequest): Promise<Result<SearchResponse, DatabaseError>>;

  /**
   * Creates an index with the given settings if it does not already exist.
   *
   * @param index - the index name to create
   * @param settings - the index settings and mappings
   * @returns void on success, or a {@link DatabaseError}
   */
  ensureIndex(
    index: string,
    settings: Record<string, unknown>,
  ): Promise<Result<void, DatabaseError>>;

  /**
   * Checks whether the search engine is reachable and operational.
   *
   * @returns void on success, or a {@link DatabaseError}
   */
  healthCheck(): Promise<Result<void, DatabaseError>>;
}
