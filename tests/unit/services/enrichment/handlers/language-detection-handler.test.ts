/**
 * Unit tests for the language detection enrichment handler.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  detectLanguage,
  LanguageDetectionHandler,
} from '@/services/enrichment/handlers/language-detection-handler.js';
import type { EnrichmentJob } from '@/types/interfaces/enrichment.interface.js';
import { isErr, isOk } from '@/types/result.js';
import { createMockLogger } from '@tests/helpers/record-type-test-helpers.js';

// -- Mock factories ----------------------------------------------------------

interface MockPool {
  query: ReturnType<typeof vi.fn>;
}

interface MockEsClient {
  update: ReturnType<typeof vi.fn>;
}

function createMockPool(): MockPool {
  return { query: vi.fn().mockResolvedValue({ rowCount: 1 }) };
}

function createMockEsClient(): MockEsClient {
  return { update: vi.fn().mockResolvedValue({}) };
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

// -- Mock resilience policy to avoid real retry/circuit breaker logic ---------

vi.mock('@/utils/resilience.js', () => ({
  pgPolicy: {
    execute: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  },
}));

// -- detectLanguage unit tests -----------------------------------------------

describe('detectLanguage', () => {
  it('returns "und" for an empty string', () => {
    expect(detectLanguage('')).toBe('und');
  });

  it('returns "und" for a whitespace-only string', () => {
    expect(detectLanguage('   \t\n  ')).toBe('und');
  });

  it('returns "und" for a string with only punctuation and digits', () => {
    expect(detectLanguage('!@#$%^&*()123456')).toBe('und');
  });

  it('detects Latin script text as English', () => {
    expect(detectLanguage('The quick brown fox jumps over the lazy dog')).toBe('en');
  });

  it('detects extended Latin characters as Latin (English default)', () => {
    expect(detectLanguage('cafe resume naivete')).toBe('en');
  });

  it('detects Cyrillic script as Russian', () => {
    expect(detectLanguage('\u041F\u0440\u0438\u0432\u0435\u0442 \u043C\u0438\u0440')).toBe('ru');
  });

  it('detects Arabic script as Arabic', () => {
    expect(
      detectLanguage('\u0645\u0631\u062D\u0628\u0627 \u0628\u0627\u0644\u0639\u0627\u0644\u0645'),
    ).toBe('ar');
  });

  it('detects CJK ideographs as Chinese', () => {
    expect(detectLanguage('\u4F60\u597D\u4E16\u754C')).toBe('zh');
  });

  it('detects Hangul as Korean', () => {
    expect(detectLanguage('\uC548\uB155\uD558\uC138\uC694')).toBe('ko');
  });

  it('detects Hiragana as Japanese', () => {
    expect(detectLanguage('\u3053\u3093\u306B\u3061\u306F')).toBe('ja');
  });

  it('detects Katakana as Japanese', () => {
    expect(detectLanguage('\u30AB\u30BF\u30AB\u30CA')).toBe('ja');
  });

  it('detects Devanagari as Hindi', () => {
    expect(detectLanguage('\u0928\u092E\u0938\u094D\u0924\u0947')).toBe('hi');
  });

  it('detects Greek script as Greek', () => {
    expect(detectLanguage('\u0393\u03B5\u03B9\u03B1 \u03C3\u03BF\u03C5')).toBe('el');
  });

  it('detects Hebrew script as Hebrew', () => {
    expect(detectLanguage('\u05E9\u05DC\u05D5\u05DD')).toBe('he');
  });

  it('detects Thai script as Thai', () => {
    expect(detectLanguage('\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35')).toBe('th');
  });

  it('detects Georgian script as Georgian', () => {
    expect(detectLanguage('\u10D2\u10D0\u10DB\u10D0\u10E0\u10EF\u10DD\u10D1\u10D0')).toBe('ka');
  });

  it('detects Armenian script as Armenian', () => {
    expect(detectLanguage('\u0532\u0561\u0580\u0565\u0582')).toBe('hy');
  });

  it('detects Ethiopic script as Amharic', () => {
    expect(detectLanguage('\u1230\u120B\u121D')).toBe('am');
  });

  it('returns the dominant script when multiple scripts are present', () => {
    // Six CJK characters vs three Latin letters
    const mixed = '\u4F60\u597D\u4E16\u754C\u5927\u5BB6 hi';
    expect(detectLanguage(mixed)).toBe('zh');
  });
});

// -- LanguageDetectionHandler unit tests -------------------------------------

describe('LanguageDetectionHandler', () => {
  let mockPool: MockPool;
  let mockEsClient: MockEsClient;
  let handler: LanguageDetectionHandler;

  beforeEach(() => {
    mockPool = createMockPool();
    mockEsClient = createMockEsClient();
    handler = new LanguageDetectionHandler({
      pgPool: mockPool as unknown as import('pg').Pool,
      esClient: mockEsClient as unknown as import('@elastic/elasticsearch').Client,
      logger: createMockLogger(),
    });
  });

  it('has type "languageDetection"', () => {
    expect(handler.type).toBe('languageDetection');
  });

  it('updates PG and ES on success and returns Ok', async () => {
    const job = createTestJob();
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.type).toBe('languageDetection');
      expect(result.value.uri).toBe(job.uri);
      expect(result.value.success).toBe(true);
      expect(result.value.metadata).toEqual({ detectedLanguage: 'en' });
    }

    expect(mockPool.query).toHaveBeenCalledWith(
      'UPDATE expressions_index SET detected_language = $1 WHERE uri = $2',
      ['en', job.uri],
    );

    expect(mockEsClient.update).toHaveBeenCalledWith({
      index: 'expressions',
      id: job.uri,
      doc: { detectedLanguage: 'en' },
    });
  });

  it('returns Err when PG update fails', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('connection refused'));

    const job = createTestJob();
    const result = await handler.handle(job);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('DATABASE_ERROR');
      expect(result.error.message).toContain(job.uri);
    }
  });

  it('tolerates ES update failure (best-effort)', async () => {
    mockEsClient.update.mockRejectedValueOnce(new Error('ES cluster red'));

    const job = createTestJob();
    const result = await handler.handle(job);

    // Should still succeed because ES is best-effort
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.success).toBe(true);
    }
  });

  it('handles missing text in job data gracefully', async () => {
    const job = createTestJob({ data: {} });
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.metadata).toEqual({ detectedLanguage: 'und' });
    }
  });

  it('handles non-string text in job data gracefully', async () => {
    const job = createTestJob({ data: { text: 42 } });
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.metadata).toEqual({ detectedLanguage: 'und' });
    }
  });
});
