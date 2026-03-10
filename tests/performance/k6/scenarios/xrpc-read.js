/**
 * k6 load test for XRPC read endpoints.
 *
 * Tests getExpression, getOntology, getCorpus, and getPersona with
 * randomized AT-URIs. Validates that responses return within 200ms at p95
 * and that non-5xx status codes are treated as acceptable (404 is expected
 * for randomly generated URIs).
 *
 * Run: k6 run tests/performance/k6/scenarios/xrpc-read.js
 *
 * @module
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { COMMON_HEADERS, THRESHOLDS, randomAtUri, randomChoice, xrpcUrl } from '../config.js';

// Per-endpoint custom metrics for granular reporting.
const getExpressionDuration = new Trend('get_expression_duration', true);
const getOntologyDuration = new Trend('get_ontology_duration', true);
const getCorpusDuration = new Trend('get_corpus_duration', true);
const getPersonaDuration = new Trend('get_persona_duration', true);
const readErrorRate = new Rate('read_error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ...THRESHOLDS.read,
    get_expression_duration: ['p(95)<200'],
    get_ontology_duration: ['p(95)<200'],
    get_corpus_duration: ['p(95)<200'],
    get_persona_duration: ['p(95)<200'],
    read_error_rate: ['rate<0.01'],
  },
};

const ENDPOINTS = [
  {
    nsid: 'pub.layers.expression.getExpression',
    collection: 'pub.layers.expression.expression',
    metric: getExpressionDuration,
    tag: 'getExpression',
  },
  {
    nsid: 'pub.layers.ontology.getOntology',
    collection: 'pub.layers.ontology.ontology',
    metric: getOntologyDuration,
    tag: 'getOntology',
  },
  {
    nsid: 'pub.layers.corpus.getCorpus',
    collection: 'pub.layers.corpus.corpus',
    metric: getCorpusDuration,
    tag: 'getCorpus',
  },
  {
    nsid: 'pub.layers.persona.getPersona',
    collection: 'pub.layers.persona.persona',
    metric: getPersonaDuration,
    tag: 'getPersona',
  },
];

export default function () {
  const endpoint = randomChoice(ENDPOINTS);
  const uri = randomAtUri(endpoint.collection);
  const url = `${xrpcUrl(endpoint.nsid)}?uri=${encodeURIComponent(uri)}`;

  const res = http.get(url, {
    headers: COMMON_HEADERS,
    tags: { endpoint: endpoint.tag },
  });

  endpoint.metric.add(res.timings.duration);

  const passed = check(
    res,
    {
      'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'response time < 200ms': (r) => r.timings.duration < 200,
      'response is valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (_e) {
          return false;
        }
      },
    },
    { endpoint: endpoint.tag },
  );

  readErrorRate.add(!passed);

  sleep(Math.random() * 0.5 + 0.1);
}
