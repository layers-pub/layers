/**
 * k6 soak test for health and readiness endpoints.
 *
 * Hits /health and /ready at a steady rate for 5 minutes to verify
 * baseline availability and sub-50ms response times. Useful as a
 * long-running soak test and as a pre-deployment smoke check.
 *
 * Run: k6 run tests/performance/k6/scenarios/health.js
 *
 * @module
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { COMMON_HEADERS, THRESHOLDS, restUrl } from '../config.js';

// Per-endpoint custom metrics.
const healthDuration = new Trend('health_endpoint_duration', true);
const readyDuration = new Trend('ready_endpoint_duration', true);
const healthErrorRate = new Rate('health_error_rate');

export const options = {
  stages: [{ duration: '5m', target: 10 }],
  thresholds: {
    ...THRESHOLDS.health,
    health_endpoint_duration: ['p(95)<50'],
    ready_endpoint_duration: ['p(95)<50'],
    health_error_rate: ['rate<0.001'],
  },
};

const ENDPOINTS = [
  {
    path: '/health',
    metric: healthDuration,
    tag: 'health',
  },
  {
    path: '/ready',
    metric: readyDuration,
    tag: 'ready',
  },
];

export default function () {
  for (const endpoint of ENDPOINTS) {
    const url = restUrl(endpoint.path);

    const res = http.get(url, {
      headers: COMMON_HEADERS,
      tags: { endpoint: endpoint.tag },
    });

    endpoint.metric.add(res.timings.duration);

    const passed = check(
      res,
      {
        'status is 200': (r) => r.status === 200,
        'response time < 50ms': (r) => r.timings.duration < 50,
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

    healthErrorRate.add(!passed);
  }

  sleep(1);
}
