/**
 * Agreement report business logic layer.
 *
 * Extends {@link BaseRecordService} with no additional methods.
 * Agreement reports have no search endpoint; they are accessed via their
 * parent experiment definition. All common operations (get, list, index,
 * delete, caching) are inherited from the base class.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type AgreementReportRecord,
  type AgreementReportRow,
  type AgreementReportView,
  agreementReportRecordSchema,
  toAgreementReportView,
} from '../../types/agreement-report.js';
import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { AgreementReportsRepository } from '../../storage/postgresql/agreement-reports-repository.js';

/**
 * Service configuration for agreement reports.
 */
const agreementReportServiceConfig: RecordServiceConfig<
  AgreementReportRecord,
  AgreementReportRow,
  AgreementReportView
> = {
  resourceName: 'AgreementReport',
  recordSchema: agreementReportRecordSchema,
  toView: toAgreementReportView,
};

/**
 * Contract for agreement report service operations.
 */
interface IAgreementReportService {
  getByUri(uri: string): Promise<Result<AgreementReportView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: AgreementReportView[]; cursor?: string | undefined }, LayersError>>;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing an {@link AgreementReportService}.
 */
interface AgreementReportServiceDeps {
  readonly repository: AgreementReportsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Agreement report service extending the generic base.
 *
 * No search method is needed; agreement reports are discovered through their
 * parent experiment definition.
 */
class AgreementReportService
  extends BaseRecordService<AgreementReportRecord, AgreementReportRow, AgreementReportView>
  implements IAgreementReportService
{
  declare protected readonly repository: AgreementReportsRepository;

  constructor(deps: AgreementReportServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      agreementReportServiceConfig,
    );
  }
}

export { AgreementReportService };
export type { IAgreementReportService };
