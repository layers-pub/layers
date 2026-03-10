/**
 * Shared test utilities for any record type.
 *
 * Provides mock factories and fixture builders that eliminate
 * duplicated setup code across record type test suites.
 *
 * @module
 */

import { vi } from 'vitest';

import type { ILogger } from '@/types/interfaces/logger.interface.js';

/**
 * Mock with all BaseRepository methods plus optional extras.
 */
interface MockRepository {
  indexRecord: ReturnType<typeof vi.fn>;
  deleteRecord: ReturnType<typeof vi.fn>;
  getByUri: ReturnType<typeof vi.fn>;
  listByDid: ReturnType<typeof vi.fn>;
  [key: string]: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock repository with all BaseRepository methods stubbed.
 */
function createMockRepository(
  overrides?: Record<string, ReturnType<typeof vi.fn>>,
): MockRepository {
  return {
    indexRecord: vi.fn(),
    deleteRecord: vi.fn(),
    getByUri: vi.fn(),
    listByDid: vi.fn(),
    ...overrides,
  };
}

/**
 * Mock Redis client shape.
 */
interface MockRedis {
  get: ReturnType<typeof vi.fn>;
  setex: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock Redis client with the methods used by BaseRecordService.
 */
function createMockRedis(overrides?: Partial<MockRedis>): MockRedis {
  return {
    get: overrides?.get ?? vi.fn(),
    setex: overrides?.setex ?? vi.fn(),
    del: overrides?.del ?? vi.fn(),
  };
}

/**
 * Creates a mock logger implementing ILogger with all methods stubbed.
 */
function createMockLogger(): ILogger {
  const mock: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => mock),
  };
  return mock;
}

export { createMockLogger, createMockRedis, createMockRepository };
export type { MockRedis, MockRepository };
