/**
 * Unit tests for the EnrichmentDispatcher.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';

import { EnrichmentDispatcher } from '@/services/enrichment/enrichment-dispatcher.js';
import { Ok } from '@/types/result.js';
import type {
  EnrichmentJob,
  EnrichmentResult,
  IEnrichmentHandler,
} from '@/types/interfaces/enrichment.interface.js';
import { createMockLogger } from '@tests/helpers/record-type-test-helpers.js';

function createMockHandler(type: IEnrichmentHandler['type']): IEnrichmentHandler {
  return {
    type,
    handle: vi.fn<IEnrichmentHandler['handle']>(),
  };
}

function createTestJob(overrides?: Partial<EnrichmentJob>): EnrichmentJob {
  return {
    type: 'languageDetection',
    uri: 'at://did:plc:test/pub.layers.expression.expression/abc123',
    collection: 'pub.layers.expression.expression',
    data: { text: 'The cat sat on the mat.' },
    ...overrides,
  };
}

describe('EnrichmentDispatcher', () => {
  describe('register', () => {
    it('adds a handler for the given enrichment type', () => {
      const logger = createMockLogger();
      const dispatcher = new EnrichmentDispatcher({ logger });
      const handler = createMockHandler('languageDetection');

      dispatcher.register(handler);

      expect(logger.debug).toHaveBeenCalledWith(
        'Registered enrichment handler for languageDetection',
      );
    });
  });

  describe('dispatch', () => {
    it('routes a job to the correct handler', async () => {
      const logger = createMockLogger();
      const dispatcher = new EnrichmentDispatcher({ logger });
      const handler = createMockHandler('languageDetection');

      const expectedResult: EnrichmentResult = {
        type: 'languageDetection',
        uri: 'at://did:plc:test/pub.layers.expression.expression/abc123',
        success: true,
        metadata: { language: 'en', confidence: 0.99 },
      };
      vi.mocked(handler.handle).mockResolvedValueOnce(Ok(expectedResult));

      dispatcher.register(handler);

      const job = createTestJob();
      const result = await dispatcher.dispatch(job);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(expectedResult);
      }
      expect(handler.handle).toHaveBeenCalledWith(job);
    });

    it('returns an error for an unregistered enrichment type', async () => {
      const dispatcher = new EnrichmentDispatcher({ logger: createMockLogger() });

      const job = createTestJob({ type: 'knowledgeGraphLinking' });
      const result = await dispatcher.dispatch(job);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('No handler registered');
        expect(result.error.message).toContain('knowledgeGraphLinking');
      }
    });

    it('does not dispatch to a handler of a different type', async () => {
      const dispatcher = new EnrichmentDispatcher({ logger: createMockLogger() });
      const handler = createMockHandler('mediaMetadata');
      dispatcher.register(handler);

      const job = createTestJob({ type: 'languageDetection' });
      const result = await dispatcher.dispatch(job);

      expect(result.ok).toBe(false);
      expect(handler.handle).not.toHaveBeenCalled();
    });
  });
});
