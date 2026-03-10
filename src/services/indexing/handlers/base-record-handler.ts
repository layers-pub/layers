/**
 * Generic firehose event handler for any record type.
 *
 * Delegates create/update to indexRecord and delete to deleteRecord
 * on the provided service. Replaces per-type handler classes.
 *
 * @module
 */

import type { LayersError } from '../../../types/errors.js';
import type { Result } from '../../../types/result.js';
import type { IRecordHandler } from '../record-handler.js';

/**
 * Minimal service interface required by the handler.
 */
interface IIndexableService {
  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;
  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Generic firehose event handler that works for any record type.
 *
 * Create and update both use upsert semantics via indexRecord.
 * Delete constructs the AT-URI and calls deleteRecord.
 */
class BaseRecordHandler implements IRecordHandler {
  private readonly service: IIndexableService;
  private readonly collection: string;

  constructor(service: IIndexableService, collection: string) {
    this.service = service;
    this.collection = collection;
  }

  async handleCreate(
    did: string,
    rkey: string,
    record: unknown,
  ): Promise<Result<void, LayersError>> {
    return this.service.indexRecord(did, rkey, record);
  }

  async handleUpdate(
    did: string,
    rkey: string,
    record: unknown,
  ): Promise<Result<void, LayersError>> {
    return this.service.indexRecord(did, rkey, record);
  }

  async handleDelete(did: string, rkey: string): Promise<Result<void, LayersError>> {
    const uri = `at://${did}/${this.collection}/${rkey}`;
    return this.service.deleteRecord(uri);
  }
}

export { BaseRecordHandler };
export type { IIndexableService };
