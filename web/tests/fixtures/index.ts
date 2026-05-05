/**
 * Test fixture factories for Layers frontend tests.
 *
 * Each factory returns realistic mock data matching the OpenAPI-generated
 * schema types. All factories accept a Partial override object merged
 * with defaults via spread.
 *
 * @module
 */

import type { components } from '@/lib/api/schema.generated';

// =============================================================================
// Type aliases
// =============================================================================

type ExpressionRecord = components['schemas']['ExpressionExpressionRecord'];
type ExpressionOutput = components['schemas']['ExpressionGetExpressionOutput'];
type ExpressionRecordView = components['schemas']['ExpressionListExpressionsRecordView'];

type CorpusRecord = components['schemas']['CorpusCorpusRecord'];
type CorpusOutput = components['schemas']['CorpusGetCorpusOutput'];
type CorpusRecordView = components['schemas']['CorpusListCorporaRecordView'];

type OntologyMain = components['schemas']['OntologyOntologyMain'];
type OntologyOutput = components['schemas']['OntologyGetOntologyOutput'];
type OntologyRecordView = components['schemas']['OntologyListOntologiesRecordView'];

type AnnotationLayerRecord = components['schemas']['AnnotationAnnotationLayerRecord'];
type AnnotationLayerOutput = components['schemas']['AnnotationGetAnnotationLayerOutput'];
type AnnotationLayerRecordView = components['schemas']['AnnotationListAnnotationLayersRecordView'];
type Annotation = components['schemas']['AnnotationDefsAnnotation'];

type SegmentationMain = components['schemas']['SegmentationSegmentationMain'];
type SegmentationOutput = components['schemas']['SegmentationGetSegmentationOutput'];
type SegmentationRecordView = components['schemas']['SegmentationListSegmentationsRecordView'];
type Tokenization = components['schemas']['SegmentationDefsTokenization'];
type TokenDef = components['schemas']['SegmentationDefsToken'];

/**
 * Frontend-local search-result shape. The orchestrator does not ship
 * a search XRPC method today; once one lands, this type moves into the
 * lexicon set and becomes a generated component.
 */
interface SearchResult {
  uri: string;
  collection: string;
  did: string;
  score: number;
  highlights?: Record<string, string[]>;
  record?: Record<string, unknown>;
}

// =============================================================================
// UI types (not in the OpenAPI schema; used by frontend components)
// =============================================================================

/** A UI-level token used by annotation renderers. */
interface Token {
  text: string;
  index: number;
  start: number;
  end: number;
}

/** A UI-level annotation item used by annotation renderers. */
interface AnnotationItem {
  id: string;
  label: string;
  value?: string;
  tokenIndex?: number;
  headIndex?: number;
  confidence?: number;
  anchor?: components['schemas']['DefsAnchor'];
}

// =============================================================================
// Counter for unique IDs
// =============================================================================

let counter = 0;

function nextId(): number {
  counter += 1;
  return counter;
}

function nextRkey(): string {
  return `3jzfcijpj2z${nextId().toString(36).padStart(2, '0')}`;
}

/** Resets the internal counter. Call in beforeEach to get deterministic IDs. */
function resetFixtureCounter(): void {
  counter = 0;
}

// =============================================================================
// Test constants
// =============================================================================

const TEST_DID = 'did:plc:testuser1';
const TEST_PDS = 'https://pds.example.com';
const TEST_TIMESTAMP = '2026-03-10T12:00:00.000Z';

// =============================================================================
// Expression fixtures
// =============================================================================

function createExpressionRecord(overrides?: Partial<ExpressionRecord>): ExpressionRecord {
  const id = nextId();
  return {
    id: `expr-${id}`,
    kind: 'sentence',
    text: 'The cat sat on the mat.',
    languages: ['en'],
    createdAt: TEST_TIMESTAMP,
    ...overrides,
  };
}

function createExpressionFixture(
  overrides?: Partial<ExpressionOutput> & { value?: Partial<ExpressionRecord> },
): ExpressionOutput {
  const id = nextId();
  const rkey = nextRkey();
  const { value: valueOverrides, ...restOverrides } = overrides ?? {};
  return {
    uri: `at://${TEST_DID}/pub.layers.expression.expression/${rkey}`,
    cid: `bafyreid${id.toString(36).padStart(40, 'a')}`,
    value: createExpressionRecord(valueOverrides),
    ...restOverrides,
  };
}

function createExpressionRecordView(
  overrides?: Partial<ExpressionRecordView> & { value?: Partial<ExpressionRecord> },
): ExpressionRecordView {
  const fixture = createExpressionFixture(overrides);
  return { uri: fixture.uri, cid: fixture.cid, value: fixture.value };
}

// =============================================================================
// Corpus fixtures
// =============================================================================

function createCorpusRecord(overrides?: Partial<CorpusRecord>): CorpusRecord {
  const id = nextId();
  return {
    name: `Test Corpus ${id}`,
    description: 'A test corpus for unit testing.',
    languages: ['en'],
    license: 'CC-BY-4.0',
    domain: 'scientific',
    createdAt: TEST_TIMESTAMP,
    ...overrides,
  };
}

function createCorpusFixture(
  overrides?: Partial<CorpusOutput> & { value?: Partial<CorpusRecord> },
): CorpusOutput {
  const id = nextId();
  const rkey = nextRkey();
  const { value: valueOverrides, ...restOverrides } = overrides ?? {};
  return {
    uri: `at://${TEST_DID}/pub.layers.corpus.corpus/${rkey}`,
    cid: `bafyreid${id.toString(36).padStart(40, 'b')}`,
    value: createCorpusRecord(valueOverrides),
    ...restOverrides,
  };
}

function createCorpusRecordView(
  overrides?: Partial<CorpusRecordView> & { value?: Partial<CorpusRecord> },
): CorpusRecordView {
  const fixture = createCorpusFixture(overrides);
  return { uri: fixture.uri, cid: fixture.cid, value: fixture.value };
}

// =============================================================================
// Ontology fixtures
// =============================================================================

function createOntologyMain(overrides?: Partial<OntologyMain>): OntologyMain {
  const id = nextId();
  return {
    name: `Test Ontology ${id}`,
    description: 'An ontology for testing purposes.',
    version: '1.0.0',
    domain: 'general',
    createdAt: TEST_TIMESTAMP,
    ...overrides,
  };
}

function createOntologyFixture(
  overrides?: Partial<OntologyOutput> & { value?: Partial<OntologyMain> },
): OntologyOutput {
  const id = nextId();
  const rkey = nextRkey();
  const { value: valueOverrides, ...restOverrides } = overrides ?? {};
  return {
    uri: `at://${TEST_DID}/pub.layers.ontology.ontology/${rkey}`,
    cid: `bafyreid${id.toString(36).padStart(40, 'c')}`,
    value: createOntologyMain(valueOverrides),
    ...restOverrides,
  };
}

function createOntologyRecordView(
  overrides?: Partial<OntologyRecordView> & { value?: Partial<OntologyMain> },
): OntologyRecordView {
  const fixture = createOntologyFixture(overrides);
  return { uri: fixture.uri, cid: fixture.cid, value: fixture.value };
}

// =============================================================================
// Annotation fixtures
// =============================================================================

function createAnnotation(overrides?: Partial<Annotation>): Annotation {
  const id = nextId();
  return {
    uuid: { value: `ann-uuid-${id}` },
    label: 'NOUN',
    tokenIndex: 0,
    ...overrides,
  };
}

function createAnnotationLayerRecord(
  overrides?: Partial<AnnotationLayerRecord>,
): AnnotationLayerRecord {
  const expressionRkey = nextRkey();
  return {
    expression: `at://${TEST_DID}/pub.layers.expression.expression/${expressionRkey}`,
    kind: 'token-tag',
    subkind: 'pos',
    formalism: 'universal-dependencies',
    labelSet: 'universal-pos',
    annotations: [
      createAnnotation({ label: 'DET', tokenIndex: 0 }),
      createAnnotation({ label: 'NOUN', tokenIndex: 1 }),
      createAnnotation({ label: 'VERB', tokenIndex: 2 }),
      createAnnotation({ label: 'ADP', tokenIndex: 3 }),
      createAnnotation({ label: 'DET', tokenIndex: 4 }),
      createAnnotation({ label: 'NOUN', tokenIndex: 5 }),
    ],
    createdAt: TEST_TIMESTAMP,
    ...overrides,
  };
}

function createAnnotationLayerFixture(
  overrides?: Partial<AnnotationLayerOutput> & { value?: Partial<AnnotationLayerRecord> },
): AnnotationLayerOutput {
  const id = nextId();
  const rkey = nextRkey();
  const { value: valueOverrides, ...restOverrides } = overrides ?? {};
  return {
    uri: `at://${TEST_DID}/pub.layers.annotation.annotationLayer/${rkey}`,
    cid: `bafyreid${id.toString(36).padStart(40, 'd')}`,
    value: createAnnotationLayerRecord(valueOverrides),
    ...restOverrides,
  };
}

function createAnnotationLayerRecordView(
  overrides?: Partial<AnnotationLayerRecordView> & { value?: Partial<AnnotationLayerRecord> },
): AnnotationLayerRecordView {
  const fixture = createAnnotationLayerFixture(overrides);
  return { uri: fixture.uri, cid: fixture.cid, value: fixture.value };
}

// =============================================================================
// Segmentation fixtures
// =============================================================================

function createTokenDef(overrides?: Partial<TokenDef>): TokenDef {
  return {
    tokenIndex: 0,
    text: 'The',
    textSpan: { byteStart: 0, byteEnd: 3 },
    ...overrides,
  };
}

function createTokenization(overrides?: Partial<Tokenization>): Tokenization {
  const id = nextId();
  return {
    uuid: { value: `tok-uuid-${id}` },
    kind: 'whitespace',
    tokens: [
      createTokenDef({ tokenIndex: 0, text: 'The', textSpan: { byteStart: 0, byteEnd: 3 } }),
      createTokenDef({ tokenIndex: 1, text: 'cat', textSpan: { byteStart: 4, byteEnd: 7 } }),
      createTokenDef({ tokenIndex: 2, text: 'sat', textSpan: { byteStart: 8, byteEnd: 11 } }),
      createTokenDef({ tokenIndex: 3, text: 'on', textSpan: { byteStart: 12, byteEnd: 14 } }),
      createTokenDef({ tokenIndex: 4, text: 'the', textSpan: { byteStart: 15, byteEnd: 18 } }),
      createTokenDef({ tokenIndex: 5, text: 'mat', textSpan: { byteStart: 19, byteEnd: 22 } }),
    ],
    ...overrides,
  };
}

function createSegmentationMain(overrides?: Partial<SegmentationMain>): SegmentationMain {
  const expressionRkey = nextRkey();
  return {
    expression: `at://${TEST_DID}/pub.layers.expression.expression/${expressionRkey}`,
    tokenizations: [createTokenization()],
    createdAt: TEST_TIMESTAMP,
    ...overrides,
  };
}

function createSegmentationFixture(
  overrides?: Partial<SegmentationOutput> & { value?: Partial<SegmentationMain> },
): SegmentationOutput {
  const id = nextId();
  const rkey = nextRkey();
  const { value: valueOverrides, ...restOverrides } = overrides ?? {};
  return {
    uri: `at://${TEST_DID}/pub.layers.segmentation.segmentation/${rkey}`,
    cid: `bafyreid${id.toString(36).padStart(40, 'e')}`,
    value: createSegmentationMain(valueOverrides),
    ...restOverrides,
  };
}

function createSegmentationRecordView(
  overrides?: Partial<SegmentationRecordView> & { value?: Partial<SegmentationMain> },
): SegmentationRecordView {
  const fixture = createSegmentationFixture(overrides);
  return { uri: fixture.uri, cid: fixture.cid, value: fixture.value };
}

// =============================================================================
// UI-level Token fixture
// =============================================================================

function createTokenFixture(overrides?: Partial<Token>): Token {
  const idx = overrides?.index ?? 0;
  return {
    text: 'The',
    index: idx,
    start: 0,
    end: 3,
    ...overrides,
  };
}

/**
 * Creates an array of UI tokens from a sentence string.
 * Splits on whitespace and computes character offsets.
 */
function createTokensFromText(text: string): Token[] {
  const words = text.split(/\s+/);
  const tokens: Token[] = [];
  let offset = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    tokens.push({
      text: word,
      index: i,
      start: offset,
      end: offset + word.length,
    });
    offset += word.length + 1;
  }

  return tokens;
}

// =============================================================================
// UI-level AnnotationItem fixture
// =============================================================================

function createAnnotationItemFixture(overrides?: Partial<AnnotationItem>): AnnotationItem {
  const id = nextId();
  return {
    id: `ann-item-${id}`,
    label: 'NOUN',
    value: undefined,
    tokenIndex: 0,
    confidence: 950,
    ...overrides,
  };
}

// =============================================================================
// Search result fixture
// =============================================================================

function createSearchResultFixture(overrides?: Partial<SearchResult>): SearchResult {
  const id = nextId();
  const rkey = nextRkey();
  return {
    uri: `at://${TEST_DID}/pub.layers.expression.expression/${rkey}`,
    collection: 'pub.layers.expression.expression',
    did: TEST_DID,
    score: 12.5,
    highlights: {
      text: ['The <em>cat</em> sat on the mat.'],
    },
    record: {},
    ...overrides,
  };
}

// =============================================================================
// Exports
// =============================================================================

export type {
  Token,
  AnnotationItem,
  ExpressionRecord,
  ExpressionOutput,
  ExpressionRecordView,
  CorpusRecord,
  CorpusOutput,
  CorpusRecordView,
  OntologyMain,
  OntologyOutput,
  OntologyRecordView,
  AnnotationLayerRecord,
  AnnotationLayerOutput,
  AnnotationLayerRecordView,
  Annotation,
  SegmentationMain,
  SegmentationOutput,
  SegmentationRecordView,
  Tokenization,
  TokenDef,
  SearchResult,
};

export {
  // Constants
  TEST_DID,
  TEST_PDS,
  TEST_TIMESTAMP,
  // Counter management
  resetFixtureCounter,
  // Expression
  createExpressionRecord,
  createExpressionFixture,
  createExpressionRecordView,
  // Corpus
  createCorpusRecord,
  createCorpusFixture,
  createCorpusRecordView,
  // Ontology
  createOntologyMain,
  createOntologyFixture,
  createOntologyRecordView,
  // Annotation
  createAnnotation,
  createAnnotationLayerRecord,
  createAnnotationLayerFixture,
  createAnnotationLayerRecordView,
  // Segmentation
  createTokenDef,
  createTokenization,
  createSegmentationMain,
  createSegmentationFixture,
  createSegmentationRecordView,
  // UI-level
  createTokenFixture,
  createTokensFromText,
  createAnnotationItemFixture,
  // Search
  createSearchResultFixture,
};
