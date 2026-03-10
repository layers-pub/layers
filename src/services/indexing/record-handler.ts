/**
 * Interface for record-type-specific firehose event handlers.
 *
 * Each of the 26 `pub.layers.*` record types implements this interface
 * to handle create, update, and delete operations from the firehose.
 *
 * @module
 */

import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';

/**
 * Handles firehose events for a single record type.
 *
 * Implementations are registered with the {@link EventProcessor} by
 * collection NSID.
 */
interface IRecordHandler {
  /**
   * Handles a record creation event.
   *
   * @param did - the DID of the record owner
   * @param rkey - the record key
   * @param record - the raw record data from the firehose
   */
  handleCreate(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  /**
   * Handles a record update event.
   *
   * @param did - the DID of the record owner
   * @param rkey - the record key
   * @param record - the updated record data from the firehose
   */
  handleUpdate(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  /**
   * Handles a record deletion event.
   *
   * @param did - the DID of the record owner
   * @param rkey - the record key
   */
  handleDelete(did: string, rkey: string): Promise<Result<void, LayersError>>;
}

export type { IRecordHandler };
