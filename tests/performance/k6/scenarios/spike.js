/**
 * k6 spike test across all endpoint categories.
 *
 * Simulates a traffic spike by mixing reads, searches, and list operations
 * with weighted random selection. Ramps to 100 VUs, spikes to 200, returns
 * to 100, then ramps down. Validates that error rates stay below 5% during
 * the spike and that no 5xx responses occur.
 *
 * Run: k6 run tests/performance/k6/scenarios/spike.js
 *
 * @module
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import {
  COMMON_HEADERS,
  THRESHOLDS,
  SEARCH_TERMS,
  LANGUAGES,
  randomAtUri,
  randomDid,
  randomChoice,
  xrpcUrl,
  restUrl,
} from '../config.js';

// Aggregate spike metrics.
const spikeDuration = new Trend('spike_request_duration', true);
const spikeErrorRate = new Rate('spike_error_rate');
const serverErrorRate = new Rate('spike_5xx_rate');
const requestsByType = new Counter('spike_requests_by_type');

export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '30s', target: 200 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ...THRESHOLDS.spike,
    spike_request_duration: ['p(95)<1000'],
    spike_error_rate: ['rate<0.05'],
    spike_5xx_rate: ['rate<0.001'],
  },
};

// Weighted endpoint categories. Reads are the most common operation in a
// real-world workload, followed by searches, then list/pagination.
const OPERATION_WEIGHTS = [
  { type: 'read', weight: 50 },
  { type: 'search', weight: 30 },
  { type: 'list', weight: 15 },
  { type: 'health', weight: 5 },
];

// Build a cumulative weight distribution for selection.
const CUMULATIVE_WEIGHTS = [];
let cumulativeSum = 0;
for (const op of OPERATION_WEIGHTS) {
  cumulativeSum += op.weight;
  CUMULATIVE_WEIGHTS.push({ type: op.type, threshold: cumulativeSum });
}

function selectOperation() {
  const roll = Math.random() * cumulativeSum;
  for (const entry of CUMULATIVE_WEIGHTS) {
    if (roll < entry.threshold) {
      return entry.type;
    }
  }
  return 'read';
}

// Read endpoint configurations.
const READ_ENDPOINTS = [
  {
    nsid: 'pub.layers.expression.getExpression',
    collection: 'pub.layers.expression.expression',
  },
  {
    nsid: 'pub.layers.ontology.getOntology',
    collection: 'pub.layers.ontology.ontology',
  },
  {
    nsid: 'pub.layers.corpus.getCorpus',
    collection: 'pub.layers.corpus.corpus',
  },
  {
    nsid: 'pub.layers.persona.getPersona',
    collection: 'pub.layers.persona.persona',
  },
];

// Search endpoint configurations.
const SEARCH_ENDPOINTS = [
  'pub.layers.expression.searchExpressions',
  'pub.layers.ontology.searchOntologies',
  'pub.layers.corpus.searchCorpora',
];

// List endpoint configurations.
const LIST_ENDPOINTS = [
  'pub.layers.expression.listExpressions',
  'pub.layers.ontology.listOntologies',
];

function executeRead() {
  const ep = randomChoice(READ_ENDPOINTS);
  const uri = randomAtUri(ep.collection);
  const url = `${xrpcUrl(ep.nsid)}?uri=${encodeURIComponent(uri)}`;
  return http.get(url, {
    headers: COMMON_HEADERS,
    tags: { operation: 'read', endpoint: ep.nsid },
  });
}

function executeSearch() {
  const nsid = randomChoice(SEARCH_ENDPOINTS);
  const query = randomChoice(SEARCH_TERMS);
  const limit = randomChoice([10, 20]);
  let url = `${xrpcUrl(nsid)}?q=${encodeURIComponent(query)}&limit=${limit}`;
  if (Math.random() > 0.5) {
    url += `&language=${randomChoice(LANGUAGES)}`;
  }
  return http.get(url, {
    headers: COMMON_HEADERS,
    tags: { operation: 'search', endpoint: nsid },
  });
}

function executeList() {
  const nsid = randomChoice(LIST_ENDPOINTS);
  const repo = randomDid();
  const limit = randomChoice([10, 20]);
  const url = `${xrpcUrl(nsid)}?repo=${encodeURIComponent(repo)}&limit=${limit}`;
  return http.get(url, {
    headers: COMMON_HEADERS,
    tags: { operation: 'list', endpoint: nsid },
  });
}

function executeHealth() {
  const path = Math.random() > 0.5 ? '/health' : '/ready';
  return http.get(restUrl(path), {
    headers: COMMON_HEADERS,
    tags: { operation: 'health', endpoint: path },
  });
}

export default function () {
  const operation = selectOperation();
  requestsByType.add(1, { operation });

  let res;
  switch (operation) {
    case 'read':
      res = executeRead();
      break;
    case 'search':
      res = executeSearch();
      break;
    case 'list':
      res = executeList();
      break;
    case 'health':
      res = executeHealth();
      break;
    default:
      res = executeRead();
  }

  spikeDuration.add(res.timings.duration);

  const passed = check(res, {
    'no 5xx errors': (r) => r.status < 500,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'response is valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (_e) {
        return false;
      }
    },
  });

  // Track errors separately: general failures vs server errors.
  spikeErrorRate.add(!passed);
  serverErrorRate.add(res.status >= 500);

  // Additional operation-specific checks.
  if (operation === 'read') {
    check(res, {
      'read: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
  } else if (operation === 'search') {
    check(res, {
      'search: status is 200': (r) => r.status === 200,
    });
  } else if (operation === 'health') {
    check(res, {
      'health: status is 200': (r) => r.status === 200,
      'health: response time < 50ms': (r) => r.timings.duration < 50,
    });
  }

  sleep(Math.random() * 0.3 + 0.05);
}
