/**
 * Elasticsearch search adapter implementing {@link ISearchEngine}.
 *
 * @module
 */

import type { Client } from '@elastic/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';

import { createLogger } from '../../observability/logger.js';
import { DatabaseError } from '../../types/errors.js';
import type {
  ISearchEngine,
  SearchRequest,
  SearchResponse,
} from '../../types/interfaces/search.interface.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { esPolicy } from '../../utils/resilience.js';

const logger = createLogger({ service: 'elasticsearch-adapter' });

/**
 * Elasticsearch adapter wrapping the official v8+ Client with cockatiel resilience.
 *
 * All public methods return {@link Result} and route through the shared
 * {@link esPolicy} for retry, circuit breaking, bulkhead, and timeout
 * protection.
 */
export class ElasticsearchAdapter implements ISearchEngine {
  private readonly client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Indexes a document. Uses the v8 `document` parameter (not `body`).
   *
   * @param index - the target Elasticsearch index
   * @param id - the document identifier (typically the AT-URI)
   * @param body - the document fields to index
   */
  async indexDocument(
    index: string,
    id: string,
    body: Record<string, unknown>,
  ): Promise<Result<void, DatabaseError>> {
    try {
      await esPolicy.execute(async () => {
        await this.client.index({
          index,
          id,
          document: body,
          refresh: false,
        });
      });

      logger.debug('Document indexed', { index, id });
      return Ok(undefined);
    } catch (err) {
      const error = new DatabaseError(
        `Failed to index document in ${index}`,
        err instanceof Error ? err : undefined,
      );
      logger.error('indexDocument failed', { index, id, error: error.message });
      return Err(error);
    }
  }

  /**
   * Deletes a document by id. Silences 404 (not_found) responses for
   * idempotent deletion.
   *
   * @param index - the Elasticsearch index containing the document
   * @param id - the document identifier to remove
   */
  async deleteDocument(index: string, id: string): Promise<Result<void, DatabaseError>> {
    try {
      await esPolicy.execute(async () => {
        await this.client.delete({ index, id }).catch((err: unknown) => {
          const esErr = err as { meta?: { statusCode?: number } };
          if (esErr.meta?.statusCode === 404) {
            return;
          }
          throw err;
        });
      });

      logger.debug('Document deleted', { index, id });
      return Ok(undefined);
    } catch (err) {
      const error = new DatabaseError(
        `Failed to delete document from ${index}`,
        err instanceof Error ? err : undefined,
      );
      logger.error('deleteDocument failed', { index, id, error: error.message });
      return Err(error);
    }
  }

  /**
   * Executes a search query. The `request.query` is expected to be a
   * raw Elasticsearch query DSL object.
   *
   * Handles the `hits.total` response shape, which may be an object
   * (`{ value, relation }`) or a plain number depending on
   * `track_total_hits` settings.
   *
   * @param request - search parameters including index, query, pagination, and sorting
   */
  async search(request: SearchRequest): Promise<Result<SearchResponse, DatabaseError>> {
    try {
      const response = await esPolicy.execute(async () => {
        const searchParams: {
          index: string;
          query: Record<string, unknown>;
          from?: number;
          size?: number;
          sort?: estypes.Sort;
        } = {
          index: request.index,
          query: request.query,
        };
        if (request.from !== undefined) searchParams.from = request.from;
        if (request.size !== undefined) searchParams.size = request.size;
        if (request.sort !== undefined) searchParams.sort = request.sort as estypes.Sort;
        return this.client.search(searchParams);
      });

      const rawTotal = response.hits.total;
      const total =
        typeof rawTotal === 'number'
          ? rawTotal
          : ((rawTotal as { value: number } | undefined)?.value ?? 0);

      const hits: Record<string, unknown>[] = response.hits.hits.map(
        (hit) => (hit._source ?? {}) as Record<string, unknown>,
      );

      return Ok({ hits, total });
    } catch (err) {
      const error = new DatabaseError(
        `Search failed on index ${request.index}`,
        err instanceof Error ? err : undefined,
      );
      logger.error('search failed', { index: request.index, error: error.message });
      return Err(error);
    }
  }

  /**
   * Creates an index with the given settings if it does not already exist.
   *
   * Silences `resource_already_exists_exception` so the operation is
   * idempotent.
   *
   * @param index - the index name to create
   * @param settings - the index settings and mappings
   */
  async ensureIndex(
    index: string,
    settings: Record<string, unknown>,
  ): Promise<Result<void, DatabaseError>> {
    try {
      await esPolicy.execute(async () => {
        await this.client.indices.create({ index, ...settings }).catch((err: unknown) => {
          const esErr = err as { meta?: { body?: { error?: { type?: string } } } };
          if (esErr.meta?.body?.error?.type === 'resource_already_exists_exception') {
            return;
          }
          throw err;
        });
      });

      logger.info('Index ensured', { index });
      return Ok(undefined);
    } catch (err) {
      const error = new DatabaseError(
        `Failed to ensure index ${index}`,
        err instanceof Error ? err : undefined,
      );
      logger.error('ensureIndex failed', { index, error: error.message });
      return Err(error);
    }
  }

  /**
   * Verifies connectivity by pinging the Elasticsearch cluster.
   */
  async healthCheck(): Promise<Result<void, DatabaseError>> {
    try {
      await esPolicy.execute(async () => {
        await this.client.ping();
      });

      return Ok(undefined);
    } catch (err) {
      const error = new DatabaseError(
        'Elasticsearch health check failed',
        err instanceof Error ? err : undefined,
      );
      return Err(error);
    }
  }
}
