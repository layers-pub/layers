/**
 * Shared k6 configuration for Layers appview performance tests.
 *
 * Provides base URL, common headers, threshold definitions, and helper
 * functions used across all scenario files.
 *
 * @module
 */

// Base URL defaults to localhost:3000 if K6_BASE_URL is not set.
export const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';

// Standard headers sent with every request.
export const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

/**
 * Threshold definitions grouped by endpoint category.
 *
 * - Reads: p95 < 200ms, error rate < 1%
 * - Searches: p95 < 500ms, error rate < 1%
 * - Lists: p95 < 300ms, error rate < 1%
 * - Health: p95 < 50ms, error rate < 0.1%
 * - Spike: p95 < 1000ms, error rate < 5%
 */
export const THRESHOLDS = {
  read: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
  search: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
  list: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
  health: {
    http_req_duration: ['p(95)<50'],
    http_req_failed: ['rate<0.001'],
  },
  spike: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

// DID prefix used for synthetic test data.
const DID_PREFIX = 'did:plc:test';

/**
 * Generates a random DID string for use in test requests.
 *
 * @returns {string} a DID like "did:plc:testxxxxxxxxxx"
 */
export function randomDid() {
  const chars = 'abcdefghijklmnopqrstuvwxyz234567';
  let suffix = '';
  for (let i = 0; i < 12; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${DID_PREFIX}${suffix}`;
}

/**
 * Generates a random TID-like record key.
 *
 * @returns {string} a 13-character base32 string
 */
export function randomRkey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz234567';
  let rkey = '';
  for (let i = 0; i < 13; i++) {
    rkey += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rkey;
}

/**
 * Builds an AT-URI from components.
 *
 * @param {string} did - the DID of the record owner
 * @param {string} collection - the NSID collection (e.g., "pub.layers.expression.expression")
 * @param {string} rkey - the record key
 * @returns {string} a well-formed AT-URI
 */
export function atUri(did, collection, rkey) {
  return `at://${did}/${collection}/${rkey}`;
}

/**
 * Builds a random AT-URI for a given collection.
 *
 * @param {string} collection - the NSID collection
 * @returns {string} a random AT-URI
 */
export function randomAtUri(collection) {
  return atUri(randomDid(), collection, randomRkey());
}

/**
 * Picks a random element from an array.
 *
 * @param {Array} arr - the source array
 * @returns {*} a randomly selected element
 */
export function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Predefined search query terms for linguistic annotation testing.
 */
export const SEARCH_TERMS = [
  'syntax',
  'morphology',
  'semantics',
  'phonology',
  'dependency',
  'constituency',
  'coreference',
  'named entity',
  'part of speech',
  'sentiment',
  'universal dependencies',
  'treebank',
  'lemma',
  'tokenization',
  'annotation',
  'corpus',
  'ontology',
  'alignment',
  'expression',
  'segmentation',
];

/**
 * Predefined language codes used in search filters.
 */
export const LANGUAGES = ['en', 'fr', 'de', 'es', 'zh', 'ja', 'ar', 'hi', 'ko', 'ru'];

/**
 * XRPC endpoint path builder.
 *
 * @param {string} nsid - the NSID (e.g., "pub.layers.expression.getExpression")
 * @returns {string} the full XRPC URL path
 */
export function xrpcUrl(nsid) {
  return `${BASE_URL}/xrpc/${nsid}`;
}

/**
 * REST endpoint path builder.
 *
 * @param {string} path - the REST path (e.g., "/api/v1/search")
 * @returns {string} the full REST URL
 */
export function restUrl(path) {
  return `${BASE_URL}${path}`;
}
