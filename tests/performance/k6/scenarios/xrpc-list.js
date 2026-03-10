/**
 * k6 load test for XRPC list/pagination endpoints.
 *
 * Tests listExpressions and listOntologies with cursor-based pagination,
 * following cursor chains for up to 5 pages per iteration. Validates that
 * cursors are returned consistently and page sizes match the requested limit.
 *
 * Run: k6 run tests/performance/k6/scenarios/xrpc-list.js
 *
 * @module
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { COMMON_HEADERS, THRESHOLDS, randomDid, randomChoice, xrpcUrl } from '../config.js';

// Custom metrics.
const listExpressionsDuration = new Trend('list_expressions_duration', true);
const listOntologiesDuration = new Trend('list_ontologies_duration', true);
const listErrorRate = new Rate('list_error_rate');
const pagesFollowed = new Counter('pages_followed');

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ...THRESHOLDS.list,
    list_expressions_duration: ['p(95)<300'],
    list_ontologies_duration: ['p(95)<300'],
    list_error_rate: ['rate<0.01'],
  },
};

const MAX_PAGES = 5;

const ENDPOINTS = [
  {
    nsid: 'pub.layers.expression.listExpressions',
    metric: listExpressionsDuration,
    tag: 'listExpressions',
  },
  {
    nsid: 'pub.layers.ontology.listOntologies',
    metric: listOntologiesDuration,
    tag: 'listOntologies',
  },
];

export default function () {
  const endpoint = randomChoice(ENDPOINTS);
  const repo = randomDid();
  const limit = randomChoice([10, 20, 25]);
  let cursor = undefined;
  let pageCount = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    let url = `${xrpcUrl(endpoint.nsid)}?repo=${encodeURIComponent(repo)}&limit=${limit}`;
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }

    const res = http.get(url, {
      headers: COMMON_HEADERS,
      tags: { endpoint: endpoint.tag, page: String(page) },
    });

    endpoint.metric.add(res.timings.duration);
    pageCount++;
    pagesFollowed.add(1);

    let body;
    try {
      body = JSON.parse(res.body);
    } catch (_e) {
      body = null;
    }

    const passed = check(
      res,
      {
        'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'response time < 300ms': (r) => r.timings.duration < 300,
        'response is valid JSON': () => body !== null,
      },
      { endpoint: endpoint.tag },
    );

    listErrorRate.add(!passed);

    // Check pagination-specific properties when we get a valid response.
    if (body && res.status === 200) {
      check(body, {
        'records array present': (b) => Array.isArray(b.records),
        'page size within limit': (b) => !Array.isArray(b.records) || b.records.length <= limit,
        'cursor is string or null': (b) =>
          b.cursor === undefined || b.cursor === null || typeof b.cursor === 'string',
      });

      // Follow the cursor to the next page if one exists.
      if (body.cursor && typeof body.cursor === 'string') {
        cursor = body.cursor;
      } else {
        // No more pages; stop following.
        break;
      }
    } else {
      // Empty repo or error; stop pagination.
      break;
    }

    sleep(Math.random() * 0.3 + 0.1);
  }

  sleep(Math.random() * 0.5 + 0.2);
}
