/**
 * Unit tests for the knowledge graph linking enrichment handler.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  classifyKnowledgeRef,
  KnowledgeGraphLinkingHandler,
} from '@/services/enrichment/handlers/knowledge-graph-linking-handler.js';
import type { EnrichmentJob } from '@/types/interfaces/enrichment.interface.js';
import { isErr, isOk } from '@/types/result.js';
import { createMockLogger } from '@tests/helpers/record-type-test-helpers.js';

// -- Mock factories ----------------------------------------------------------

interface MockPool {
  query: ReturnType<typeof vi.fn>;
}

interface MockSession {
  run: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

interface MockDriver {
  session: ReturnType<typeof vi.fn>;
}

function createMockPool(): MockPool {
  return { query: vi.fn().mockResolvedValue({ rowCount: 1 }) };
}

function createMockSession(): MockSession {
  return {
    run: vi.fn().mockResolvedValue({ records: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockNeo4jDriver(session?: MockSession): MockDriver {
  const s = session ?? createMockSession();
  return { session: vi.fn().mockReturnValue(s) };
}

function createTestJob(overrides?: Partial<EnrichmentJob>): EnrichmentJob {
  return {
    type: 'knowledgeGraphLinking',
    uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/abc123',
    collection: 'pub.layers.annotation.annotationLayer',
    data: { knowledgeRefs: ['Q42', 'FN:Motion', 'noun.entity.01'] },
    ...overrides,
  };
}

// -- Mock resilience policies to avoid real retry/circuit breaker logic -------

vi.mock('@/utils/resilience.js', () => ({
  pgPolicy: {
    execute: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  },
  neo4jPolicy: {
    execute: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  },
}));

// -- classifyKnowledgeRef unit tests -----------------------------------------

describe('classifyKnowledgeRef', () => {
  it('classifies Wikidata QIDs', () => {
    expect(classifyKnowledgeRef('Q42')).toBe('wikidata');
    expect(classifyKnowledgeRef('Q12345')).toBe('wikidata');
    expect(classifyKnowledgeRef('Q1')).toBe('wikidata');
  });

  it('rejects Q followed by non-digits', () => {
    expect(classifyKnowledgeRef('Qabc')).toBe('unknown');
    expect(classifyKnowledgeRef('Q')).toBe('unknown');
    expect(classifyKnowledgeRef('Q42abc')).toBe('unknown');
  });

  it('classifies FrameNet frames with FN: prefix', () => {
    expect(classifyKnowledgeRef('FN:Motion')).toBe('framenet');
    expect(classifyKnowledgeRef('FN:Cause_harm')).toBe('framenet');
    expect(classifyKnowledgeRef('FN:')).toBe('framenet');
  });

  it('classifies WordNet synsets with dot-separated pattern', () => {
    expect(classifyKnowledgeRef('noun.entity.01')).toBe('wordnet');
    expect(classifyKnowledgeRef('verb.motion.03')).toBe('wordnet');
    expect(classifyKnowledgeRef('adj.all.00')).toBe('wordnet');
  });

  it('returns "unknown" for unrecognized patterns', () => {
    expect(classifyKnowledgeRef('random-string')).toBe('unknown');
    expect(classifyKnowledgeRef('')).toBe('unknown');
    expect(classifyKnowledgeRef('12345')).toBe('unknown');
    expect(classifyKnowledgeRef('wikidata:Q42')).toBe('unknown');
  });
});

// -- KnowledgeGraphLinkingHandler unit tests ---------------------------------

describe('KnowledgeGraphLinkingHandler', () => {
  let mockPool: MockPool;
  let mockSession: MockSession;
  let mockDriver: MockDriver;
  let handler: KnowledgeGraphLinkingHandler;

  beforeEach(() => {
    mockPool = createMockPool();
    mockSession = createMockSession();
    mockDriver = createMockNeo4jDriver(mockSession);
    handler = new KnowledgeGraphLinkingHandler({
      pgPool: mockPool as unknown as import('pg').Pool,
      neo4jDriver: mockDriver as unknown as import('neo4j-driver').Driver,
      logger: createMockLogger(),
    });
  });

  it('has type "knowledgeGraphLinking"', () => {
    expect(handler.type).toBe('knowledgeGraphLinking');
  });

  it('returns Ok with resolved count 0 for empty knowledgeRefs', async () => {
    const job = createTestJob({ data: { knowledgeRefs: [] } });
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.success).toBe(true);
      expect(result.value.metadata).toEqual({ resolved: 0 });
    }

    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('handles missing knowledgeRefs in job data gracefully', async () => {
    const job = createTestJob({ data: {} });
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.metadata).toEqual({ resolved: 0 });
    }
  });

  it('handles non-array knowledgeRefs gracefully', async () => {
    const job = createTestJob({ data: { knowledgeRefs: 'not-an-array' } });
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.metadata).toEqual({ resolved: 0 });
    }
  });

  it('filters out non-string entries from knowledgeRefs', async () => {
    const job = createTestJob({
      data: { knowledgeRefs: ['Q42', 123, null, 'FN:Motion', undefined] },
    });
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.metadata).toEqual({ resolved: 2 });
    }
  });

  it('updates PG with resolved refs and returns Ok', async () => {
    const job = createTestJob();
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.type).toBe('knowledgeGraphLinking');
      expect(result.value.uri).toBe(job.uri);
      expect(result.value.success).toBe(true);
      expect(result.value.metadata).toEqual({ resolved: 3 });
    }

    expect(mockPool.query).toHaveBeenCalledOnce();
    const [sql, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('UPDATE annotation_layers_index');
    expect(sql).toContain('_resolvedKnowledgeRefs');
    expect(params[1]).toBe(job.uri);

    // Verify the JSONB payload contains classified refs
    const payload = JSON.parse(params[0] as string) as { ref: string; kbType: string }[];
    expect(payload).toHaveLength(3);
    expect(payload[0]).toMatchObject({ ref: 'Q42', kbType: 'wikidata' });
    expect(payload[1]).toMatchObject({ ref: 'FN:Motion', kbType: 'framenet' });
    expect(payload[2]).toMatchObject({ ref: 'noun.entity.01', kbType: 'wordnet' });
  });

  it('creates Neo4j edges for each resolved ref', async () => {
    const job = createTestJob();
    await handler.handle(job);

    expect(mockDriver.session).toHaveBeenCalledOnce();
    expect(mockSession.run).toHaveBeenCalledTimes(3);
    expect(mockSession.close).toHaveBeenCalledOnce();

    // Verify the Cypher query parameters for the first call
    const [, firstParams] = mockSession.run.mock.calls[0] as [string, Record<string, unknown>];
    expect(firstParams).toMatchObject({
      ref: 'Q42',
      kbType: 'wikidata',
      uri: job.uri,
    });
  });

  it('tolerates Neo4j failures (best-effort)', async () => {
    mockSession.run.mockRejectedValue(new Error('Neo4j unavailable'));

    const job = createTestJob();
    const result = await handler.handle(job);

    // PG update should still succeed, handler should return Ok
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.success).toBe(true);
      expect(result.value.metadata).toEqual({ resolved: 3 });
    }
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

  it('skips PG update for unmapped collections', async () => {
    const job = createTestJob({
      uri: 'at://did:plc:test/pub.layers.unknown.type/abc123',
    });
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('maps expressions collection to expressions_index table', async () => {
    const job = createTestJob({
      uri: 'at://did:plc:test/pub.layers.expression.expression/abc123',
      data: { knowledgeRefs: ['Q42'] },
    });
    await handler.handle(job);

    const [sql] = mockPool.query.mock.calls[0] as [string];
    expect(sql).toContain('UPDATE expressions_index');
  });
});
