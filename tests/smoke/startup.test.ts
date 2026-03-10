import { describe, expect, it } from 'vitest';

import { configSchema } from '@/config/index.js';
import { EventFilter, LAYERS_NSIDS } from '@/services/indexing/event-filter.js';
import { ErrorClassifier } from '@/services/indexing/error-classifier.js';
import { NSID_TO_QUEUE, QUEUE_NAMES } from '@/services/indexing/event-queue.js';
import { RedisKeys, RedisTTL } from '@/storage/redis/structures.js';
import { NotFoundError, ValidationError } from '@/types/errors.js';

describe('EventFilter', () => {
  const filter = new EventFilter(LAYERS_NSIDS);

  it('identifies all 26 pub.layers.* NSIDs as relevant', () => {
    for (const nsid of LAYERS_NSIDS) {
      expect(filter.isRelevant(nsid)).toBe(true);
    }
  });

  it('has exactly 26 NSIDs', () => {
    expect(LAYERS_NSIDS.size).toBe(26);
  });

  it('rejects non-Layers NSIDs', () => {
    expect(filter.isRelevant('app.bsky.feed.post')).toBe(false);
    expect(filter.isRelevant('pub.chive.eprint.eprint')).toBe(false);
    expect(filter.isRelevant('')).toBe(false);
  });
});

describe('ErrorClassifier', () => {
  const classifier = new ErrorClassifier();

  it('classifies NotFoundError as dependency', () => {
    const err = new NotFoundError(
      'Expression',
      'at://did:plc:abc/pub.layers.expression.expression/xyz',
    );
    expect(classifier.classify(err)).toBe('dependency');
  });

  it('classifies ValidationError as permanent', () => {
    const err = new ValidationError('Invalid field', 'text', 'required');
    expect(classifier.classify(err)).toBe('permanent');
  });

  it('classifies timeout errors as retryable', () => {
    expect(classifier.classify(new Error('Connection timeout'))).toBe('retryable');
    expect(classifier.classify(new Error('ECONNREFUSED'))).toBe('retryable');
    expect(classifier.classify(new Error('socket hang up'))).toBe('retryable');
  });

  it('classifies malformed errors as permanent', () => {
    expect(classifier.classify(new Error('malformed record data'))).toBe('permanent');
  });

  it('defaults unknown errors to retryable', () => {
    expect(classifier.classify(new Error('something unexpected'))).toBe('retryable');
  });
});

describe('NSID_TO_QUEUE', () => {
  it('maps all 26 NSIDs to a queue', () => {
    for (const nsid of LAYERS_NSIDS) {
      expect(NSID_TO_QUEUE.has(nsid)).toBe(true);
    }
  });

  it('maps to valid queue names', () => {
    const validQueues = new Set<string>(Object.values(QUEUE_NAMES));
    for (const queueName of NSID_TO_QUEUE.values()) {
      expect(validQueues.has(queueName)).toBe(true);
    }
  });
});

describe('RedisKeys', () => {
  it('generates correct session key pattern', () => {
    expect(RedisKeys.SESSION('did:plc:abc', 'tok123')).toBe('session:did:plc:abc:tok123');
  });

  it('generates correct record cache key pattern', () => {
    expect(RedisKeys.RECORD_CACHE('at://did:plc:abc/pub.layers.expression.expression/xyz')).toBe(
      'record:at://did:plc:abc/pub.layers.expression.expression/xyz',
    );
  });

  it('generates correct rate limit key pattern', () => {
    expect(RedisKeys.RATE_LIMIT('did:plc:abc', 'getExpression')).toBe(
      'ratelimit:did:plc:abc:getExpression',
    );
  });

  it('generates correct DID resolve key pattern', () => {
    expect(RedisKeys.DID_RESOLVE('did:plc:abc')).toBe('resolve:did:plc:abc');
  });

  it('generates correct firehose cursor key', () => {
    expect(RedisKeys.FIREHOSE_CURSOR()).toBe('cursor:firehose');
  });
});

describe('RedisTTL', () => {
  it('has correct TTL values', () => {
    expect(RedisTTL.SESSION).toBe(86_400);
    expect(RedisTTL.RECORD_CACHE).toBe(300);
    expect(RedisTTL.RATE_LIMIT).toBe(60);
    expect(RedisTTL.DID_RESOLVE).toBe(3_600);
  });
});

describe('Config schema', () => {
  it('rejects missing DATABASE_URL', () => {
    const result = configSchema.safeParse({
      NEO4J_PASSWORD: 'test',
      JWT_SECRET: 'a'.repeat(32),
    });
    expect(result.success).toBe(false);
  });

  it('rejects short JWT_SECRET', () => {
    const result = configSchema.safeParse({
      DATABASE_URL: 'postgresql://localhost/test',
      NEO4J_PASSWORD: 'test',
      JWT_SECRET: 'tooshort',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid config with defaults', () => {
    const result = configSchema.safeParse({
      DATABASE_URL: 'postgresql://localhost/test',
      NEO4J_PASSWORD: 'test',
      JWT_SECRET: 'a'.repeat(32),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(3000);
      expect(result.data.NODE_ENV).toBe('development');
      expect(result.data.LOG_LEVEL).toBe('info');
    }
  });
});
