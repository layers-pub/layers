/**
 * CAR file parser for firehose commit messages.
 *
 * @module
 */

import { CarReader } from '@ipld/car';
import * as dagCbor from '@ipld/dag-cbor';
import { CID } from 'multiformats/cid';

import { createLogger } from '../../observability/logger.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';

/**
 * A parsed operation from a firehose commit.
 */
interface ParsedCommitOp {
  readonly action: 'create' | 'update' | 'delete';
  readonly collection: string;
  readonly rkey: string;
  readonly record?: unknown;
  readonly cid?: string;
}

/**
 * Parses CAR files from firehose commit messages and extracts
 * DAG-CBOR record data.
 */
class CommitHandler {
  private readonly logger: ILogger;

  constructor() {
    this.logger = createLogger({ service: 'commit-handler' });
  }

  /**
   * Parses a commit's operations from its CAR blocks.
   *
   * @param ops - the operations array from the commit message
   * @param blocks - the raw CAR file bytes
   * @returns array of parsed commit operations
   */
  async parseCommit(
    ops: readonly { action: string; path: string; cid?: unknown }[],
    blocks: Uint8Array,
  ): Promise<ParsedCommitOp[]> {
    const results: ParsedCommitOp[] = [];

    let reader: CarReader;
    try {
      reader = await CarReader.fromBytes(blocks);
    } catch (err) {
      this.logger.error('Failed to parse CAR file', {
        error: (err as Error).message,
      });
      return results;
    }

    for (const op of ops) {
      const [collection, rkey] = this.parsePath(op.path);
      if (!collection || !rkey) {
        continue;
      }

      const action = op.action as ParsedCommitOp['action'];

      if (action === 'delete') {
        results.push({ action, collection, rkey });
        continue;
      }

      if (op.cid) {
        try {
          const cidStr = typeof op.cid === 'string' ? op.cid : JSON.stringify(op.cid);
          const cid = CID.asCID(op.cid) ?? CID.parse(cidStr);
          const block = await reader.get(cid);
          if (block) {
            const record = dagCbor.decode(block.bytes);
            results.push({
              action,
              collection,
              rkey,
              record,
              cid: cid.toString(),
            });
          }
        } catch (err) {
          this.logger.warn('Failed to decode record block', {
            collection,
            rkey,
            error: (err as Error).message,
          });
        }
      }
    }

    return results;
  }

  /**
   * Splits an ATProto commit path into collection and rkey.
   *
   * The path format is `collection/rkey`, for example
   * `pub.layers.expression.expression/3abc123`.
   */
  private parsePath(path: string): [string | null, string | null] {
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) {
      return [null, null];
    }
    return [path.slice(0, lastSlash), path.slice(lastSlash + 1)];
  }
}

export { CommitHandler };
export type { ParsedCommitOp };
