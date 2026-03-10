/**
 * ATProto utilities for Layers.
 *
 * Provides functions for creating and managing ATProto records.
 * All user data is stored in user PDSes, not in Layers infrastructure.
 *
 * @module
 */

export {
  type CreateRecordResult,
  COLLECTIONS,
  getAuthenticatedDid,
  createExpressionRecord,
  createCorpusRecord,
  createOntologyRecord,
  createTypeDefRecord,
  deleteRecord,
  parseAtUri,
  buildAtUri,
} from './record-creator';
