/**
 * Factory that generates the standard ATProto compliance test suite
 * for any record type.
 *
 * @module
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { Ok } from '@/types/result.js';
import { BaseRecordHandler } from '@/services/indexing/handlers/base-record-handler.js';
import type { MockRedis, MockRepository } from './record-type-test-helpers.js';

/**
 * Service interface required by compliance tests.
 */
interface ComplianceService {
  indexRecord(did: string, rkey: string, record: unknown): Promise<{ ok: boolean }>;
  deleteRecord(uri: string): Promise<{ ok: boolean }>;
  getByUri(uri: string): Promise<{ ok: boolean; value?: unknown }>;
}

/**
 * Configuration for generating a compliance test suite.
 */
interface ComplianceTestConfig {
  /** Human-readable record type name (e.g. 'Expression') */
  readonly name: string;

  /** Collection NSID */
  readonly collection: string;

  /** Returns a wired service and mock repository for testing */
  createServiceAndRepository(): {
    service: ComplianceService;
    repository: MockRepository;
    redis: MockRedis;
  };

  /** A valid record fixture for this type */
  readonly validRecord: unknown;

  /** A valid row fixture for this type (for getByUri mock response) */
  readonly validRow: unknown;

  /** A valid record with a BlobRef field (for blob compliance test) */
  readonly recordWithBlobRef?: unknown;

  /** The BlobRef value to check in the stored record */
  readonly expectedBlobRef?: unknown;
}

/**
 * Generates the standard 5 ATProto compliance tests for a record type.
 */
function describeComplianceTests(config: ComplianceTestConfig): void {
  describe(`${config.name} ATProto Compliance`, () => {
    let service: ComplianceService;
    let repository: MockRepository;
    let redis: MockRedis;

    beforeEach(() => {
      const deps = config.createServiceAndRepository();
      service = deps.service;
      repository = deps.repository;
      redis = deps.redis;
    });

    it('does not write to any PDS during indexing', async () => {
      repository.indexRecord.mockResolvedValueOnce(Ok(undefined));

      const result = await service.indexRecord('did:plc:testuser1', 'abc123', config.validRecord);
      expect(result.ok).toBe(true);

      // Verify only the repository was called
      expect(repository.indexRecord).toHaveBeenCalledTimes(1);

      // Structural assertion: no PDS write methods
      const serviceProto = Object.getOwnPropertyNames(Object.getPrototypeOf(service));
      const pdsWriteMethods = serviceProto.filter(
        (m) => /pds/i.test(m) || /createRecord/i.test(m) || /putRecord/i.test(m),
      );
      expect(pdsWriteMethods).toEqual([]);
    });

    it('tracks DID of the record owner in every indexed row', async () => {
      const did = 'did:plc:testuser1';
      const rkey = 'abc123';

      repository.indexRecord.mockResolvedValueOnce(Ok(undefined));

      await service.indexRecord(did, rkey, config.validRecord);

      const [calledDid] = repository.indexRecord.mock.calls[0] as [string, string, unknown];
      expect(calledDid).toBe(did);
      expect(calledDid).toMatch(/^did:/);
    });

    it('can rebuild index: create, verify, delete, re-create produces identical result', async () => {
      const did = 'did:plc:testuser1';
      const rkey = 'abc123';
      const uri = `at://${did}/${config.collection}/${rkey}`;

      // Step 1: Initial index
      repository.indexRecord.mockResolvedValueOnce(Ok(undefined));
      const createResult = await service.indexRecord(did, rkey, config.validRecord);
      expect(createResult.ok).toBe(true);

      // Step 2: Verify it was indexed
      repository.getByUri.mockResolvedValueOnce(Ok(config.validRow));
      const fetchResult = await service.getByUri(uri);
      expect(fetchResult.ok).toBe(true);

      // Step 3: Delete
      repository.deleteRecord.mockResolvedValueOnce(Ok(undefined));
      redis.del.mockResolvedValueOnce(1);
      const deleteResult = await service.deleteRecord(uri);
      expect(deleteResult.ok).toBe(true);

      // Step 4: Re-create from same firehose event data
      repository.indexRecord.mockResolvedValueOnce(Ok(undefined));
      const recreateResult = await service.indexRecord(did, rkey, config.validRecord);
      expect(recreateResult.ok).toBe(true);

      // Verify both create calls received identical arguments
      const firstCall = repository.indexRecord.mock.calls[0];
      const secondCall = repository.indexRecord.mock.calls[1];
      expect(firstCall).toEqual(secondCall);
    });

    it('stores BlobRef fields as references, not raw blob data', async () => {
      const recordWithBlob = config.recordWithBlobRef ?? config.validRecord;

      repository.indexRecord.mockResolvedValueOnce(Ok(undefined));

      const result = await service.indexRecord('did:plc:testuser1', 'abc123', recordWithBlob);
      expect(result.ok).toBe(true);

      // Only the repository was called; no blob storage method exists
      expect(repository.indexRecord).toHaveBeenCalledTimes(1);

      if (config.expectedBlobRef) {
        const [, , storedRecord] = repository.indexRecord.mock.calls[0] as [
          string,
          string,
          Record<string, unknown>,
        ];
        expect(storedRecord.mediaBlob).toEqual(config.expectedBlobRef);
      }
    });

    it('delete events remove the record via the handler', async () => {
      const handler = new BaseRecordHandler(service as never, config.collection);

      const did = 'did:plc:testuser1';
      const rkey = 'abc123';
      const expectedUri = `at://${did}/${config.collection}/${rkey}`;

      repository.deleteRecord.mockResolvedValueOnce(Ok(undefined));
      redis.del.mockResolvedValueOnce(1);

      const result = await handler.handleDelete(did, rkey);

      expect(result.ok).toBe(true);
      expect(repository.deleteRecord).toHaveBeenCalledWith(expectedUri);
      expect(redis.del).toHaveBeenCalled();
    });
  });
}

export { describeComplianceTests };
export type { ComplianceTestConfig };
