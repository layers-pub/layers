/**
 * Shared TypeScript types for the annotation rendering system.
 *
 * @module
 */

import type { Main as AnnotationLayerRecord } from '@/lib/api/generated/types/pub/layers/annotation/annotationLayer';

/**
 * Anchor locating an annotation within an expression or media.
 *
 * Each anchor type uses a subset of the optional fields. For example,
 * a `textSpan` anchor uses `byteStart` and `byteEnd`; a `tokenRef` uses `tokenIndex`.
 */
interface Anchor {
  type:
    | 'textSpan'
    | 'tokenRef'
    | 'tokenRefSequence'
    | 'temporalSpan'
    | 'boundingBox'
    | 'spatioTemporalAnchor'
    | 'pageAnchor';
  /** UTF-8 byte start offset (textSpan). */
  byteStart?: number;
  /** UTF-8 byte end offset (textSpan). */
  byteEnd?: number;
  /** Single token index (tokenRef). */
  tokenIndex?: number;
  /** Ordered sequence of token indices (tokenRefSequence). */
  tokenIndices?: number[];
  /** Start time in seconds (temporalSpan). */
  startTime?: number;
  /** End time in seconds (temporalSpan). */
  endTime?: number;
  /** Bounding box x coordinate (boundingBox). */
  x?: number;
  /** Bounding box y coordinate (boundingBox). */
  y?: number;
  /** Bounding box width (boundingBox). */
  width?: number;
  /** Bounding box height (boundingBox). */
  height?: number;
  /** Page number (pageAnchor). */
  page?: number;
}

/**
 * A single argument in a relation annotation.
 */
interface AnnotationArgument {
  /** Role label (e.g., "Agent", "Patient", "Theme"). */
  role: string;
  /** ID of the target annotation item. */
  targetId: string;
  /** Display label of the target, if resolved. */
  targetLabel?: string;
}

/**
 * A single annotation item within a layer.
 *
 * Items represent individual annotations such as POS tags, spans, relation
 * instances, tree nodes, graph nodes, tier segments, or document-level tags.
 */
interface AnnotationItem {
  /** Unique identifier within this layer. */
  id: string;
  /** Display label (e.g., "NNP", "PERSON", "nsubj"). */
  label: string;
  /** Optional value (e.g., lemma text, gloss text). */
  value?: string;
  /** Positional anchor within the expression. */
  anchor?: Anchor;
  /** Confidence score on a 0-1000 scale. */
  confidence?: number;
  /** Rank for k-best annotations (lower is better). */
  rank?: number;
  /** Arguments for relation annotations. */
  arguments?: AnnotationArgument[];
  /** Children for constituency tree annotations. */
  children?: AnnotationItem[];
  /** Token index for token-level annotations. */
  tokenIndex?: number;
  /** Head token index for dependency tree annotations. */
  headIndex?: number;
  /** Target token index for dependency tree annotations. */
  targetIndex?: number;
  /** Parent node ID for constituency tree annotations. */
  parentId?: string;
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * The annotation layer kinds supported by Layers.
 *
 * Derived from the generated annotation layer record type.
 */
type AnnotationKind = AnnotationLayerRecord['kind'];

/**
 * Complete data for a single annotation layer.
 *
 * This is the primary data structure passed through the rendering system.
 * The `kind` field determines which renderer is used by `AnnotationLayerView`.
 */
interface AnnotationLayerData {
  /** AT-URI of this annotation layer record. */
  uri: string;
  /** Annotation kind, used for renderer dispatch. */
  kind: AnnotationKind;
  /** Subkind within the kind (e.g., "pos", "ner", "dependency"). */
  subkind?: string;
  /** Formalism name (e.g., "universal-dependencies", "penn-treebank"). */
  formalism?: string;
  /** Human-readable label for the layer. */
  label?: string;
  /** Individual annotation items. */
  items: AnnotationItem[];
  /** Color assigned by the composition layer (oklch string). */
  color?: string;
}

/**
 * A single token from a segmentation record.
 */
interface Token {
  /** Surface text of the token. */
  text: string;
  /** Zero-based token index within the segmentation. */
  index: number;
  /** UTF-8 byte start offset in the expression text. */
  byteStart: number;
  /** UTF-8 byte end offset in the expression text. */
  byteEnd: number;
}

export type {
  Anchor,
  AnnotationArgument,
  AnnotationItem,
  AnnotationKind,
  AnnotationLayerData,
  Token,
};
