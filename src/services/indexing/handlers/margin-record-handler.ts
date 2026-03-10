/**
 * Firehose event handler for margin.at annotation records.
 *
 * Bridges the IRecordHandler interface expected by EventProcessor with
 * the MarginIndexer's handleMarginRecord/handleMarginDelete methods.
 *
 * @module
 */

import type { LayersError } from '../../../types/errors.js';
import type { Result } from '../../../types/result.js';
import type { IMarginIndexer } from '../../interop/margin-indexer.js';
import type { MarginAnnotationRecord } from '../../interop/margin-adapter.js';
import type { IRecordHandler } from '../record-handler.js';

/**
 * Adapts the MarginIndexer to the IRecordHandler interface used by the EventProcessor.
 *
 * Create and update both delegate to handleMarginRecord (upsert semantics).
 * Delete delegates to handleMarginDelete.
 */
class MarginRecordHandler implements IRecordHandler {
  private readonly marginIndexer: IMarginIndexer;

  constructor(marginIndexer: IMarginIndexer) {
    this.marginIndexer = marginIndexer;
  }

  async handleCreate(
    did: string,
    rkey: string,
    record: unknown,
  ): Promise<Result<void, LayersError>> {
    return this.marginIndexer.handleMarginRecord(did, rkey, record as MarginAnnotationRecord);
  }

  async handleUpdate(
    did: string,
    rkey: string,
    record: unknown,
  ): Promise<Result<void, LayersError>> {
    return this.marginIndexer.handleMarginRecord(did, rkey, record as MarginAnnotationRecord);
  }

  async handleDelete(did: string, rkey: string): Promise<Result<void, LayersError>> {
    return this.marginIndexer.handleMarginDelete(did, rkey);
  }
}

export { MarginRecordHandler };
