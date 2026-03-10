/**
 * ATProto compliance tests for expression record indexing.
 *
 * Uses the compliance test factory to validate the standard 5 rules.
 *
 * @module
 */

import { vi } from 'vitest';

import { ExpressionService } from '@/services/expression/expression-service.js';
import type { ExpressionRecord, ExpressionRow } from '@/types/expression.js';
import type { ExpressionsRepository } from '@/storage/postgresql/expressions-repository.js';
import { describeComplianceTests } from '../helpers/compliance-test-factory.js';
import {
  createMockLogger,
  createMockRedis,
  createMockRepository,
} from '../helpers/record-type-test-helpers.js';

function buildExpressionRecord(overrides?: Partial<ExpressionRecord>): ExpressionRecord {
  return {
    id: 'expr-compliance-001',
    text: 'Compliance test expression.',
    kind: 'sentence',
    language: 'en',
    createdAt: '2026-01-15T12:00:00Z',
    ...overrides,
  };
}

function buildExpressionRow(overrides?: Partial<ExpressionRow>): ExpressionRow {
  return {
    uri: 'at://did:plc:testuser1/pub.layers.expression.expression/abc123',
    did: 'did:plc:testuser1',
    rkey: 'abc123',
    text: 'Compliance test expression.',
    kind: 'sentence',
    language: 'en',
    source_url: null,
    source_ref: null,
    eprint_ref: null,
    parent_ref: null,
    indexed_at: new Date('2026-01-15T12:00:00Z'),
    record: buildExpressionRecord(),
    ...overrides,
  };
}

const blobRef = {
  $type: 'blob',
  ref: { $link: 'bafyreiabc123xyz456' },
  mimeType: 'image/png',
  size: 2048,
};

describeComplianceTests({
  name: 'Expression',
  collection: 'pub.layers.expression.expression',

  createServiceAndRepository() {
    const repository = createMockRepository({
      searchExpressions: vi.fn(),
    });
    const redis = createMockRedis({
      get: vi.fn().mockResolvedValue(null),
      setex: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
    });
    const logger = createMockLogger();

    const service = new ExpressionService({
      repository: repository as unknown as ExpressionsRepository,
      redis: redis as never,
      logger,
    });

    return { service, repository, redis };
  },

  validRecord: buildExpressionRecord(),
  validRow: buildExpressionRow(),
  recordWithBlobRef: buildExpressionRecord({ mediaBlob: blobRef }),
  expectedBlobRef: blobRef,
});
