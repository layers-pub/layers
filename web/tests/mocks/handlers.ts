/**
 * MSW 2.x request handlers for Layers XRPC endpoints.
 *
 * Provides realistic mock responses using the fixture factories.
 * Handlers read query parameters to support filtering and pagination.
 *
 * @module
 */

import { http, HttpResponse } from 'msw';

import {
  createExpressionFixture,
  createExpressionRecordView,
  createAnnotationLayerFixture,
  createAnnotationLayerRecordView,
  createSegmentationRecordView,
  createCorpusFixture,
  createCorpusRecordView,
  createOntologyFixture,
  createOntologyRecordView,
  createSearchResultFixture,
  resetFixtureCounter,
} from '../fixtures';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parses the `limit` query parameter with a default and maximum.
 */
function parseLimit(url: URL, defaultLimit = 25, maxLimit = 100): number {
  const raw = url.searchParams.get('limit');
  if (!raw) return defaultLimit;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1) return defaultLimit;
  return Math.min(parsed, maxLimit);
}

// =============================================================================
// Expression handlers
// =============================================================================

const getExpression = http.get('*/xrpc/pub.layers.expression.getExpression', ({ request }) => {
  const url = new URL(request.url);
  const uri = url.searchParams.get('uri');

  if (!uri) {
    return HttpResponse.json(
      { error: 'InvalidRequest', message: 'uri is required' },
      { status: 400 },
    );
  }

  resetFixtureCounter();
  const fixture = createExpressionFixture({ uri });

  return HttpResponse.json(fixture);
});

const listExpressions = http.get(
  '*/xrpc/pub.layers.expression.listExpressions',
  ({ request }) => {
    const url = new URL(request.url);
    const limit = parseLimit(url);

    resetFixtureCounter();
    const records = Array.from({ length: limit }, () => createExpressionRecordView());

    return HttpResponse.json({
      records,
      cursor: 'next-cursor-expressions',
    });
  },
);

// =============================================================================
// Annotation handlers
// =============================================================================

const getAnnotationLayer = http.get(
  '*/xrpc/pub.layers.annotation.getAnnotationLayer',
  ({ request }) => {
    const url = new URL(request.url);
    const uri = url.searchParams.get('uri');

    if (!uri) {
      return HttpResponse.json(
        { error: 'InvalidRequest', message: 'uri is required' },
        { status: 400 },
      );
    }

    resetFixtureCounter();
    const fixture = createAnnotationLayerFixture({ uri });

    return HttpResponse.json(fixture);
  },
);

const listAnnotationLayers = http.get(
  '*/xrpc/pub.layers.annotation.listAnnotationLayers',
  ({ request }) => {
    const url = new URL(request.url);
    const limit = parseLimit(url);

    resetFixtureCounter();
    const records = Array.from({ length: Math.min(limit, 3) }, () =>
      createAnnotationLayerRecordView(),
    );

    return HttpResponse.json({
      records,
      cursor: 'next-cursor-annotations',
    });
  },
);

// =============================================================================
// Segmentation handlers
// =============================================================================

const listSegmentations = http.get(
  '*/xrpc/pub.layers.segmentation.listSegmentations',
  ({ request }) => {
    const url = new URL(request.url);
    const limit = parseLimit(url);

    resetFixtureCounter();
    const records = Array.from({ length: Math.min(limit, 2) }, () =>
      createSegmentationRecordView(),
    );

    return HttpResponse.json({
      records,
      cursor: undefined,
    });
  },
);

// =============================================================================
// Corpus handlers
// =============================================================================

const getCorpus = http.get('*/xrpc/pub.layers.corpus.getCorpus', ({ request }) => {
  const url = new URL(request.url);
  const uri = url.searchParams.get('uri');

  if (!uri) {
    return HttpResponse.json(
      { error: 'InvalidRequest', message: 'uri is required' },
      { status: 400 },
    );
  }

  resetFixtureCounter();
  const fixture = createCorpusFixture({ uri });

  return HttpResponse.json(fixture);
});

const listCorpora = http.get('*/xrpc/pub.layers.corpus.listCorpora', ({ request }) => {
  const url = new URL(request.url);
  const limit = parseLimit(url);

  resetFixtureCounter();
  const records = Array.from({ length: Math.min(limit, 5) }, () => createCorpusRecordView());

  return HttpResponse.json({
    records,
    cursor: 'next-cursor-corpora',
  });
});

// =============================================================================
// Ontology handlers
// =============================================================================

const getOntology = http.get('*/xrpc/pub.layers.ontology.getOntology', ({ request }) => {
  const url = new URL(request.url);
  const uri = url.searchParams.get('uri');

  if (!uri) {
    return HttpResponse.json(
      { error: 'InvalidRequest', message: 'uri is required' },
      { status: 400 },
    );
  }

  resetFixtureCounter();
  const fixture = createOntologyFixture({ uri });

  return HttpResponse.json(fixture);
});

const listOntologies = http.get(
  '*/xrpc/pub.layers.ontology.listOntologies',
  ({ request }) => {
    const url = new URL(request.url);
    const limit = parseLimit(url);

    resetFixtureCounter();
    const records = Array.from({ length: Math.min(limit, 5) }, () =>
      createOntologyRecordView(),
    );

    return HttpResponse.json({
      records,
      cursor: 'next-cursor-ontologies',
    });
  },
);

// =============================================================================
// Search handler
// =============================================================================

const search = http.get('*/api/v1/search', ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  const limit = parseLimit(url, 10);

  if (!q) {
    return HttpResponse.json(
      { error: 'InvalidRequest', message: 'q is required' },
      { status: 400 },
    );
  }

  resetFixtureCounter();
  const results = Array.from({ length: Math.min(limit, 5) }, () => createSearchResultFixture());

  return HttpResponse.json({
    results,
    total: results.length,
    cursor: undefined,
  });
});

// =============================================================================
// All handlers
// =============================================================================

const handlers = [
  getExpression,
  listExpressions,
  getAnnotationLayer,
  listAnnotationLayers,
  listSegmentations,
  getCorpus,
  listCorpora,
  getOntology,
  listOntologies,
  search,
];

export {
  handlers,
  // Individual handlers for selective override in tests
  getExpression,
  listExpressions,
  getAnnotationLayer,
  listAnnotationLayers,
  listSegmentations,
  getCorpus,
  listCorpora,
  getOntology,
  listOntologies,
  search,
};
