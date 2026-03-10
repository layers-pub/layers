/**
 * Generic repository composing PostgreSQL, Elasticsearch, and Neo4j.
 *
 * PostgreSQL is the source of truth. Elasticsearch and Neo4j writes are
 * best-effort with error logging for eventual consistency. Record types
 * extend this class and add type-specific search methods.
 *
 * @module
 */

import { createLogger } from '../observability/logger.js';
import { DatabaseError } from '../types/errors.js';
import type { ILogger } from '../types/interfaces/logger.interface.js';
import { Err, Ok, type Result } from '../types/result.js';
import type { IDocumentMapper } from './elasticsearch/document-mapper.js';

import type { PostgreSQLAdapter } from './postgresql/adapter.js';
import type { ElasticsearchAdapter } from './elasticsearch/adapter.js';
import type { Neo4jAdapter } from './neo4j/adapter.js';

/**
 * Configuration describing a single record type's storage layout.
 *
 * @typeParam TRecord - the validated record shape from the firehose
 * @typeParam TRow - the PostgreSQL row shape
 */
interface RecordTypeConfig<TRecord> {
  /** Collection NSID (e.g. 'pub.layers.expression.expression') */
  readonly collection: string;

  /** PostgreSQL table name */
  readonly table: string;

  /** Elasticsearch index name */
  readonly esIndex: string;

  /** Neo4j node label */
  readonly neo4jLabel: string;

  /** Human-readable name for error messages */
  readonly resourceName: string;

  /** Extract PG row data from a validated record */
  extractRow(did: string, rkey: string, uri: string, record: TRecord): Record<string, unknown>;

  /** Extract Neo4j node properties from a validated record */
  extractNodeProps(uri: string, did: string, record: TRecord): Record<string, unknown>;

  /** Return edges to create: [{from, to, type}] */
  extractEdges(uri: string, record: TRecord): readonly { from: string; to: string; type: string }[];
}

/**
 * Encodes a keyset pagination cursor from an indexed_at timestamp and URI.
 */
function encodeCursor(indexedAt: Date, uri: string): string {
  return Buffer.from(`${indexedAt.toISOString()}::${uri}`).toString('base64url');
}

/**
 * Decodes a keyset pagination cursor into its component parts.
 */
function decodeCursor(cursor: string): { indexedAt: string; uri: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
    const separatorIndex = decoded.indexOf('::');
    if (separatorIndex === -1) return null;
    return {
      indexedAt: decoded.slice(0, separatorIndex),
      uri: decoded.slice(separatorIndex + 2),
    };
  } catch {
    return null;
  }
}

/**
 * Dependencies for constructing a {@link BaseRepository}.
 */
interface BaseRepositoryDeps {
  readonly pgAdapter: PostgreSQLAdapter;
  readonly esAdapter: ElasticsearchAdapter;
  readonly neo4jAdapter: Neo4jAdapter;
  readonly documentMapper: IDocumentMapper;
  readonly logger?: ILogger | undefined;
}

/**
 * Generic repository composing all three storage backends.
 *
 * Write path: PG (must succeed) then ES + Neo4j (best-effort).
 * Read path: PG only (source of truth).
 *
 * Subclasses add record-type-specific search methods.
 *
 * @typeParam TRecord - the validated record shape from the firehose
 * @typeParam TRow - the PostgreSQL row shape
 */
class BaseRepository<TRecord, TRow extends { readonly indexed_at: Date; readonly uri: string }> {
  protected readonly pgAdapter: PostgreSQLAdapter;
  protected readonly esAdapter: ElasticsearchAdapter;
  protected readonly neo4jAdapter: Neo4jAdapter;
  protected readonly documentMapper: IDocumentMapper;
  protected readonly logger: ILogger;
  protected readonly config: RecordTypeConfig<TRecord>;

  constructor(deps: BaseRepositoryDeps, config: RecordTypeConfig<TRecord>) {
    this.pgAdapter = deps.pgAdapter;
    this.esAdapter = deps.esAdapter;
    this.neo4jAdapter = deps.neo4jAdapter;
    this.documentMapper = deps.documentMapper;
    this.logger =
      deps.logger ?? createLogger({ service: `${config.resourceName.toLowerCase()}-repository` });
    this.config = config;
  }

  async indexRecord(
    did: string,
    rkey: string,
    record: TRecord,
  ): Promise<Result<void, DatabaseError>> {
    const uri = `at://${did}/${this.config.collection}/${rkey}`;

    // Build PG row data
    const data = this.config.extractRow(did, rkey, uri, record);

    // PG write (must succeed)
    const pgResult = await this.pgAdapter.storeRecord(this.config.table, data);
    if (!pgResult.ok) {
      return pgResult;
    }

    // ES write (best-effort)
    const esDoc = this.documentMapper.toDocument(data);
    const esResult = await this.esAdapter.indexDocument(this.config.esIndex, uri, esDoc);
    if (!esResult.ok) {
      this.logger.error(`Failed to index ${this.config.resourceName} in Elasticsearch`, {
        uri,
        error: esResult.error.message,
      });
    }

    // Neo4j write (best-effort)
    const nodeProps = this.config.extractNodeProps(uri, did, record);
    const neo4jResult = await this.neo4jAdapter.mergeNode(this.config.neo4jLabel, nodeProps);
    if (!neo4jResult.ok) {
      this.logger.error(`Failed to merge ${this.config.resourceName} node in Neo4j`, {
        uri,
        error: neo4jResult.error.message,
      });
    }

    // Create graph edges for references (best-effort)
    const edges = this.config.extractEdges(uri, record);
    for (const edge of edges) {
      const edgeResult = await this.neo4jAdapter.mergeEdge(edge.from, edge.to, edge.type);
      if (!edgeResult.ok) {
        this.logger.error(`Failed to create ${edge.type} edge`, {
          from: edge.from,
          to: edge.to,
          error: edgeResult.error.message,
        });
      }
    }

    return Ok(undefined);
  }

  async deleteRecord(uri: string): Promise<Result<void, DatabaseError>> {
    // PG delete (must succeed)
    const pgResult = await this.pgAdapter.deleteByUri(this.config.table, uri);
    if (!pgResult.ok) {
      return pgResult;
    }

    // ES delete (best-effort)
    const esResult = await this.esAdapter.deleteDocument(this.config.esIndex, uri);
    if (!esResult.ok) {
      this.logger.error(`Failed to delete ${this.config.resourceName} from Elasticsearch`, {
        uri,
        error: esResult.error.message,
      });
    }

    // Neo4j delete (best-effort)
    const neo4jResult = await this.neo4jAdapter.deleteNode(uri);
    if (!neo4jResult.ok) {
      this.logger.error(`Failed to delete ${this.config.resourceName} node from Neo4j`, {
        uri,
        error: neo4jResult.error.message,
      });
    }

    return Ok(undefined);
  }

  async getByUri(uri: string): Promise<Result<TRow | null, DatabaseError>> {
    const result = await this.pgAdapter.getByUri(this.config.table, uri);
    if (!result.ok) {
      return result;
    }

    if (result.value === null) {
      return Ok(null);
    }

    return Ok(result.value as unknown as TRow);
  }

  async listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: TRow[]; cursor?: string | undefined }, DatabaseError>> {
    let sql: string;
    let params: unknown[];

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (!decoded) {
        return Err(new DatabaseError('Invalid cursor'));
      }
      sql = `SELECT * FROM ${this.config.table} WHERE did = $1 AND (indexed_at, uri) > ($2, $3) ORDER BY indexed_at, uri LIMIT $4`;
      params = [did, decoded.indexedAt, decoded.uri, limit];
    } else {
      sql = `SELECT * FROM ${this.config.table} WHERE did = $1 ORDER BY indexed_at, uri LIMIT $2`;
      params = [did, limit];
    }

    const result = await this.pgAdapter.query(sql, params);
    if (!result.ok) {
      return result as Result<never, DatabaseError>;
    }

    const rows = result.value as unknown as TRow[];
    const lastRow = rows[rows.length - 1];
    const nextCursor =
      lastRow && rows.length === limit ? encodeCursor(lastRow.indexed_at, lastRow.uri) : undefined;

    return Ok({ rows, cursor: nextCursor });
  }
}

export { BaseRepository, decodeCursor, encodeCursor };
export type { BaseRepositoryDeps, RecordTypeConfig };
