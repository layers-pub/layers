/**
 * Error classes for ATProto repository operations.
 *
 * These cover PDS connectivity, identity resolution, record fetching,
 * and blob metadata retrieval. All extend {@link LayersError} and carry
 * contextual properties (PDS URL, DID, AT-URI, CID) for structured logging.
 *
 * @module
 */

import { LayersError } from '../../types/errors.js';

/**
 * Thrown when the appview cannot connect to a user's Personal Data Server.
 *
 * Covers DNS resolution failures, TCP connection timeouts, TLS handshake
 * errors, and HTTP-level failures when reaching the PDS.
 */
export class PDSConnectionError extends LayersError {
  readonly code = 'PDS_CONNECTION_ERROR';

  /** The PDS endpoint URL that could not be reached. */
  readonly pdsUrl: string;

  /**
   * @param pdsUrl - the PDS endpoint URL that failed
   * @param message - description of the connection failure
   * @param cause - the underlying network or HTTP error
   */
  constructor(pdsUrl: string, message: string, cause?: Error) {
    super(message, cause);
    this.pdsUrl = pdsUrl;
  }
}

/**
 * Thrown when a DID cannot be resolved to its PDS endpoint.
 *
 * This is distinct from {@link DIDResolutionError} in the auth module:
 * this error specifically covers the repository-access path where
 * the appview needs a PDS URL to fetch records directly.
 */
export class IdentityResolutionError extends LayersError {
  readonly code = 'IDENTITY_RESOLUTION_ERROR';

  /** The DID that could not be resolved. */
  readonly did: string;

  /**
   * @param did - the DID that failed resolution
   * @param message - description of the resolution failure
   * @param cause - the underlying resolution error
   */
  constructor(did: string, message: string, cause?: Error) {
    super(message, cause);
    this.did = did;
  }
}

/**
 * Thrown when a record cannot be fetched from a user's PDS.
 *
 * Covers 404 responses (record does not exist), permission errors,
 * and malformed responses from the PDS. Used by the sync handler
 * when fetching records for immediate indexing.
 */
export class RecordFetchError extends LayersError {
  readonly code = 'RECORD_FETCH_ERROR';

  /** The AT-URI of the record that could not be fetched. */
  readonly uri: string;

  /**
   * @param uri - the AT-URI of the record
   * @param message - description of the fetch failure
   * @param cause - the underlying fetch error
   */
  constructor(uri: string, message: string, cause?: Error) {
    super(message, cause);
    this.uri = uri;
  }
}

/**
 * Thrown when blob metadata cannot be retrieved from a user's PDS.
 *
 * Layers stores BlobRefs (CID pointers) only, never blob data.
 * This error occurs when resolving a BlobRef to verify its existence
 * or retrieve metadata (MIME type, size) from the source PDS.
 */
export class BlobFetchError extends LayersError {
  readonly code = 'BLOB_FETCH_ERROR';

  /** The CID of the blob that could not be fetched. */
  readonly cid: string;

  /**
   * @param cid - the content identifier of the blob
   * @param message - description of the fetch failure
   * @param cause - the underlying fetch error
   */
  constructor(cid: string, message: string, cause?: Error) {
    super(message, cause);
    this.cid = cid;
  }
}
