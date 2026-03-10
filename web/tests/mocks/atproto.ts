/**
 * Mock ATProto Agent and OAuth session for Layers frontend tests.
 *
 * Provides factory functions that return mock objects matching the
 * shapes used by @atproto/api Agent and @atproto/oauth-client-browser
 * OAuthSession.
 *
 * @module
 */

import { vi } from 'vitest';

import { TEST_DID, TEST_PDS } from '../fixtures';

// =============================================================================
// Types
// =============================================================================

/**
 * Minimal shape of an @atproto/api Agent for test mocking.
 *
 * We define this locally rather than importing the full Agent type
 * to avoid pulling the entire @atproto/api dependency into test setup.
 */
interface MockAgent {
  readonly did: string;
  readonly assertDid: string;
  com: {
    atproto: {
      repo: {
        createRecord: ReturnType<typeof vi.fn>;
        deleteRecord: ReturnType<typeof vi.fn>;
        getRecord: ReturnType<typeof vi.fn>;
        putRecord: ReturnType<typeof vi.fn>;
      };
      identity: {
        resolveHandle: ReturnType<typeof vi.fn>;
      };
    };
  };
}

/**
 * Minimal shape of an OAuthSession for test mocking.
 */
interface MockOAuthSession {
  readonly did: string;
  readonly handle: string;
  readonly accessJwt: string;
  readonly refreshJwt: string;
  fetchHandler: ReturnType<typeof vi.fn>;
}

// =============================================================================
// Mock Agent factory
// =============================================================================

/**
 * Creates a mock ATProto Agent with all commonly used methods stubbed.
 *
 * @param did - the DID to assign to the mock agent (defaults to TEST_DID)
 *
 * @example
 * ```typescript
 * const agent = createMockAgent();
 * agent.com.atproto.repo.createRecord.mockResolvedValueOnce({
 *   data: { uri: 'at://did:plc:testuser1/pub.layers.expression.expression/abc', cid: 'bafytest' },
 * });
 * ```
 */
function createMockAgent(did: string = TEST_DID): MockAgent {
  return {
    did,
    assertDid: did,
    com: {
      atproto: {
        repo: {
          createRecord: vi.fn().mockResolvedValue({
            data: {
              uri: `at://${did}/pub.layers.expression.expression/mock-rkey`,
              cid: 'bafyreimockcidhash',
            },
          }),
          deleteRecord: vi.fn().mockResolvedValue({ data: {} }),
          getRecord: vi.fn().mockResolvedValue({
            data: {
              uri: `at://${did}/pub.layers.expression.expression/mock-rkey`,
              cid: 'bafyreimockcidhash',
              value: {},
            },
          }),
          putRecord: vi.fn().mockResolvedValue({
            data: {
              uri: `at://${did}/pub.layers.expression.expression/mock-rkey`,
              cid: 'bafyreimockcidhash',
            },
          }),
        },
        identity: {
          resolveHandle: vi.fn().mockResolvedValue({
            data: { did },
          }),
        },
      },
    },
  };
}

// =============================================================================
// Mock OAuthSession factory
// =============================================================================

/**
 * Creates a mock OAuthSession for testing auth flows.
 *
 * @param overrides - partial overrides for session properties
 *
 * @example
 * ```typescript
 * const session = createMockSession({ handle: 'alice.bsky.social' });
 * expect(session.did).toBe('did:plc:testuser1');
 * ```
 */
function createMockSession(
  overrides?: Partial<Pick<MockOAuthSession, 'did' | 'handle' | 'accessJwt' | 'refreshJwt'>>,
): MockOAuthSession {
  return {
    did: overrides?.did ?? TEST_DID,
    handle: overrides?.handle ?? 'testuser.bsky.social',
    accessJwt: overrides?.accessJwt ?? 'mock-access-jwt-token',
    refreshJwt: overrides?.refreshJwt ?? 'mock-refresh-jwt-token',
    fetchHandler: vi.fn(),
  };
}

// =============================================================================
// Exports
// =============================================================================

export type { MockAgent, MockOAuthSession };
export { createMockAgent, createMockSession };
