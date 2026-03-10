/**
 * k6 load test for XRPC search endpoints.
 *
 * Tests searchExpressions, searchOntologies, and searchCorpora with
 * randomly selected query terms and language filters. Validates that
 * search responses return within 500ms at p95 and contain a results array.
 *
 * Run: k6 run tests/performance/k6/scenarios/xrpc-search.js
 *
 * @module
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import {
  COMMON_HEADERS,
  THRESHOLDS,
  SEARCH_TERMS,
  LANGUAGES,
  randomChoice,
  xrpcUrl,
} from '../config.js';

// Per-endpoint custom metrics.
const searchExpressionsDuration = new Trend('search_expressions_duration', true);
const searchOntologiesDuration = new Trend('search_ontologies_duration', true);
const searchCorporaDuration = new Trend('search_corpora_duration', true);
const searchErrorRate = new Rate('search_error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 30 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ...THRESHOLDS.search,
    search_expressions_duration: ['p(95)<500'],
    search_ontologies_duration: ['p(95)<500'],
    search_corpora_duration: ['p(95)<500'],
    search_error_rate: ['rate<0.01'],
  },
};

const ENDPOINTS = [
  {
    nsid: 'pub.layers.expression.searchExpressions',
    metric: searchExpressionsDuration,
    tag: 'searchExpressions',
  },
  {
    nsid: 'pub.layers.ontology.searchOntologies',
    metric: searchOntologiesDuration,
    tag: 'searchOntologies',
  },
  {
    nsid: 'pub.layers.corpus.searchCorpora',
    metric: searchCorporaDuration,
    tag: 'searchCorpora',
  },
];

export default function () {
  const endpoint = randomChoice(ENDPOINTS);
  const query = randomChoice(SEARCH_TERMS);
  const language = Math.random() > 0.5 ? randomChoice(LANGUAGES) : undefined;
  const limit = randomChoice([10, 20, 50]);

  let url = `${xrpcUrl(endpoint.nsid)}?q=${encodeURIComponent(query)}&limit=${limit}`;
  if (language) {
    url += `&language=${language}`;
  }

  const res = http.get(url, {
    headers: COMMON_HEADERS,
    tags: { endpoint: endpoint.tag },
  });

  endpoint.metric.add(res.timings.duration);

  const passed = check(
    res,
    {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'response contains results array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.records) || Array.isArray(body.results);
        } catch (_e) {
          return false;
        }
      },
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

  searchErrorRate.add(!passed);

  sleep(Math.random() * 0.8 + 0.2);
}
