/**
 * Firehose event handler for `pub.layers.expression.expression` records.
 *
 * @module
 */

import type { LayersError } from '../../../types/errors.js';
import type { Result } from '../../../types/result.js';
import type { IExpressionService } from '../../expression/expression-service.js';
import type { IRecordHandler } from '../record-handler.js';

const COLLECTION = 'pub.layers.expression.expression';

/**
 * Routes firehose create/update/delete events for expressions
 * to the {@link IExpressionService}.
 */
class ExpressionRecordHandler implements IRecordHandler {
  private readonly expressionService: IExpressionService;

  constructor(expressionService: IExpressionService) {
    this.expressionService = expressionService;
  }

  async handleCreate(
    did: string,
    rkey: string,
    record: unknown,
  ): Promise<Result<void, LayersError>> {
    return this.expressionService.indexRecord(did, rkey, record);
  }

  async handleUpdate(
    did: string,
    rkey: string,
    record: unknown,
  ): Promise<Result<void, LayersError>> {
    // Upsert semantics: update is identical to create
    return this.expressionService.indexRecord(did, rkey, record);
  }

  async handleDelete(did: string, rkey: string): Promise<Result<void, LayersError>> {
    const uri = `at://${did}/${COLLECTION}/${rkey}`;
    return this.expressionService.deleteRecord(uri);
  }
}

export { ExpressionRecordHandler };
