/**
 * XRPC method map for agreement report endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 * Agreement reports have no search endpoint; they are accessed via their
 * parent experiment definition.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getAgreementReportParamsSchema,
  listAgreementReportsParamsSchema,
} from '../../../../types/agreement-report.js';
import { createGetHandler, createListHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all agreement report endpoints.
 */
function agreementReportMethods(): XRPCMethodMap {
  return {
    'pub.layers.judgment.getAgreementReport': {
      handler: createGetHandler('AgreementReportService', getAgreementReportParamsSchema),
      auth: 'none',
    },
    'pub.layers.judgment.listAgreementReports': {
      handler: createListHandler('AgreementReportService', listAgreementReportsParamsSchema),
      auth: 'none',
    },
  };
}

export { agreementReportMethods };
