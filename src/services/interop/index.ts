/**
 * Interoperability layer for external annotation systems.
 *
 * Provides adapters, indexers, and selector utilities for consuming
 * annotations from systems outside the pub.layers.* namespace.
 * Currently supports margin.at (at.margin.*) annotations.
 *
 * @module
 */

export { InteropError } from './interop-error.js';
export {
  MarginAdapter,
  MOTIVATION_LABELS,
  type ExternalAnnotationSource,
  type ExternalAnnotationView,
  type IMarginAdapter,
  type MarginAnnotationRecord,
  type MarginBody,
  type MarginMotivation,
  type MarginTarget,
} from './margin-adapter.js';
export {
  MarginIndexer,
  MARGIN_NSIDS,
  MARGIN_CACHE_TTL_SECONDS,
  type IMarginIndexer,
  type MarginIndexerDeps,
} from './margin-indexer.js';
export {
  textPositionToAnchor,
  textQuoteToAnchor,
  anchorToTextPosition,
  anchorToTextQuote,
  DEFAULT_CONTEXT_CHARS,
  type FragmentSelector,
  type TextPositionSelector,
  type TextQuoteSelector,
  type TextSpanAnchor,
  type W3CSelector,
} from './w3c-selectors.js';
