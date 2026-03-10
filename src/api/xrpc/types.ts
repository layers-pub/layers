/**
 * XRPC type definitions for method registration and response shaping.
 *
 * @module
 */

import type { Context } from 'hono';

/**
 * A single XRPC method definition, including its handler and auth mode.
 */
interface XRPCMethod {
  readonly handler: (c: Context) => Promise<Response>;
  readonly auth?: 'required' | 'optional' | 'none';
  /** Whether this is a query (GET) or procedure (POST). Defaults to 'query'. */
  readonly type?: 'query' | 'procedure';
}

/**
 * Wrapper for a successful XRPC response body.
 */
interface XRPCResponse<T> {
  readonly encoding: 'application/json';
  readonly body: T;
}

/**
 * Structured XRPC error response returned to callers.
 */
interface XRPCError {
  readonly error: string;
  readonly message: string;
}

/**
 * Map of NSID strings to their corresponding XRPC method definitions.
 */
type XRPCMethodMap = Record<string, XRPCMethod>;

export type { XRPCError, XRPCMethod, XRPCMethodMap, XRPCResponse };
