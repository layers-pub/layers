/**
 * Adapter for converting margin.at annotation records into Layers view models.
 *
 * margin.at uses the W3C Web Annotation Data Model with ATProto storage.
 * This adapter translates between the two systems, enabling margin.at
 * annotations to appear alongside native Layers annotations in the workspace.
 *
 * @module
 */

import { Err, Ok, type Result } from '../../types/result.js';
import { InteropError } from './interop-error.js';
import type { W3CSelector, TextSpanAnchor } from './w3c-selectors.js';
import { textPositionToAnchor, textQuoteToAnchor } from './w3c-selectors.js';

// ---------------------------------------------------------------------------
// margin.at record types
// ---------------------------------------------------------------------------

/**
 * W3C motivation values used by margin.at annotations.
 *
 * @see https://www.w3.org/TR/annotation-model/#motivation-and-purpose
 */
type MarginMotivation =
  | 'commenting'
  | 'highlighting'
  | 'tagging'
  | 'bookmarking'
  | 'describing'
  | 'classifying'
  | 'linking'
  | 'questioning'
  | 'replying'
  | 'editing'
  | 'assessing';

/**
 * The target specification in a margin.at annotation record.
 *
 * Contains the source URL of the annotated resource and an optional
 * W3C selector for sub-resource targeting.
 */
interface MarginTarget {
  /** URL of the annotated resource. */
  readonly source: string;
  /** Optional W3C selector for sub-resource targeting. */
  readonly selector?: W3CSelector | undefined;
}

/**
 * The body of a margin.at annotation record.
 *
 * Contains the annotation content, which may be plain text, HTML, or a tag.
 */
interface MarginBody {
  /** Content type (e.g., 'TextualBody', 'SpecificResource'). */
  readonly type: string;
  /** The annotation text or tag value. */
  readonly value: string;
  /** MIME format of the value (e.g., 'text/plain', 'text/html'). */
  readonly format?: string | undefined;
}

/**
 * A margin.at annotation record from the ATProto firehose.
 *
 * Follows the W3C Web Annotation Data Model stored in the `at.margin.*`
 * namespace on ATProto.
 */
interface MarginAnnotationRecord {
  /** Record type NSID (e.g., 'at.margin.annotation'). */
  readonly $type: string;
  /** The target resource and selector. */
  readonly target: MarginTarget;
  /** The annotation body content. */
  readonly body: MarginBody;
  /** W3C motivation for the annotation. */
  readonly motivation: MarginMotivation;
  /** DID of the annotation creator. */
  readonly creator: string;
  /** ISO 8601 timestamp of when the annotation was created. */
  readonly created: string;
}

// ---------------------------------------------------------------------------
// External annotation view model
// ---------------------------------------------------------------------------

/**
 * Source system identifier for display and filtering.
 */
type ExternalAnnotationSource = 'margin.at';

/**
 * View model for displaying external annotations alongside native Layers annotations.
 *
 * Unifies the representation so that the workspace can render margin.at
 * annotations using the same component infrastructure as native annotations.
 */
interface ExternalAnnotationView {
  /** Synthetic identifier: `{source}:{did}:{rkey}`. */
  readonly id: string;
  /** The external system that produced this annotation. */
  readonly source: ExternalAnnotationSource;
  /** AT-URI of the original external record. */
  readonly uri: string;
  /** DID of the annotation creator. */
  readonly creatorDid: string;
  /** URL of the annotated resource. */
  readonly targetUrl: string;
  /** The annotation text content. */
  readonly text: string;
  /** Display-friendly motivation label (e.g., 'Comment', 'Highlight', 'Tag'). */
  readonly kind: string;
  /** W3C motivation value from the original record. */
  readonly motivation: MarginMotivation;
  /** Resolved text span anchor, if the selector could be converted. */
  readonly anchor?: TextSpanAnchor | undefined;
  /** ISO 8601 creation timestamp. */
  readonly createdAt: string;
  /** MIME format of the body content. */
  readonly format?: string | undefined;
}

// ---------------------------------------------------------------------------
// IMarginAdapter interface
// ---------------------------------------------------------------------------

/**
 * Contract for the margin.at record adapter.
 */
interface IMarginAdapter {
  /**
   * Converts a margin.at annotation record into a Layers external annotation view model.
   *
   * @param marginRecord - the raw margin.at record from the firehose
   * @param did - the DID of the record owner
   * @param rkey - the record key
   * @returns the converted view, or an interop error if conversion fails
   */
  toAnnotationView(
    marginRecord: MarginAnnotationRecord,
    did: string,
    rkey: string,
  ): Result<ExternalAnnotationView, InteropError>;

  /**
   * Checks whether a margin.at record targets the same URL as a Layers expression.
   *
   * @param marginRecord - the margin.at record to check
   * @param expressionSourceUrl - the sourceUrl of the Layers expression
   * @returns true if the margin record targets the same resource
   */
  matchesExpression(marginRecord: MarginAnnotationRecord, expressionSourceUrl: string): boolean;

  /**
   * Extracts all W3C selectors from a margin.at record.
   *
   * @param marginRecord - the margin.at record to extract selectors from
   * @returns an array of W3C selectors (empty if none are present)
   */
  extractSelectors(marginRecord: MarginAnnotationRecord): W3CSelector[];

  /**
   * Resolves a margin.at record's selector to a Layers textSpan anchor.
   *
   * Requires the full expression text for TextQuoteSelector resolution.
   * Returns undefined if the record has no selector or the selector type
   * is not convertible to a text span.
   *
   * @param marginRecord - the margin.at record
   * @param expressionText - the full text of the target expression
   * @returns the resolved anchor, or undefined
   */
  resolveAnchor(
    marginRecord: MarginAnnotationRecord,
    expressionText: string,
  ): TextSpanAnchor | undefined;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Maps W3C motivation values to display-friendly kind labels.
 */
const MOTIVATION_LABELS: Readonly<Record<MarginMotivation, string>> = {
  commenting: 'Comment',
  highlighting: 'Highlight',
  tagging: 'Tag',
  bookmarking: 'Bookmark',
  describing: 'Description',
  classifying: 'Classification',
  linking: 'Link',
  questioning: 'Question',
  replying: 'Reply',
  editing: 'Edit',
  assessing: 'Assessment',
};

/**
 * Adapter that converts margin.at W3C annotation records into Layers view models.
 *
 * @example
 * ```typescript
 * const adapter = new MarginAdapter();
 * const result = adapter.toAnnotationView(record, 'did:plc:abc', '3jzfcijpj2z2a');
 * if (isOk(result)) {
 *   console.log(result.value.kind); // 'Comment'
 * }
 * ```
 */
class MarginAdapter implements IMarginAdapter {
  toAnnotationView(
    marginRecord: MarginAnnotationRecord,
    did: string,
    rkey: string,
  ): Result<ExternalAnnotationView, InteropError> {
    if (!marginRecord.target?.source) {
      return Err(
        new InteropError(
          'margin.at record is missing target.source',
          'margin.at',
          marginRecord.$type,
        ),
      );
    }

    if (!marginRecord.body?.value && marginRecord.body?.value !== '') {
      return Err(
        new InteropError('margin.at record is missing body.value', 'margin.at', marginRecord.$type),
      );
    }

    const uri = `at://${did}/${marginRecord.$type}/${rkey}`;
    const kind = MOTIVATION_LABELS[marginRecord.motivation] ?? marginRecord.motivation;

    const view: ExternalAnnotationView = {
      id: `margin.at:${did}:${rkey}`,
      source: 'margin.at',
      uri,
      creatorDid: marginRecord.creator || did,
      targetUrl: marginRecord.target.source,
      text: marginRecord.body.value,
      kind,
      motivation: marginRecord.motivation,
      createdAt: marginRecord.created,
      format: marginRecord.body.format,
    };

    return Ok(view);
  }

  matchesExpression(marginRecord: MarginAnnotationRecord, expressionSourceUrl: string): boolean {
    if (!marginRecord.target?.source || !expressionSourceUrl) {
      return false;
    }

    // Normalize URLs for comparison: strip trailing slashes and fragments
    const normalize = (url: string): string => {
      try {
        const parsed = new URL(url);
        parsed.hash = '';
        return parsed.href.replace(/\/+$/, '');
      } catch {
        // If URL parsing fails, compare raw strings after basic normalization
        return url.replace(/\/+$/, '').replace(/#.*$/, '');
      }
    };

    return normalize(marginRecord.target.source) === normalize(expressionSourceUrl);
  }

  extractSelectors(marginRecord: MarginAnnotationRecord): W3CSelector[] {
    if (!marginRecord.target?.selector) {
      return [];
    }
    return [marginRecord.target.selector];
  }

  resolveAnchor(
    marginRecord: MarginAnnotationRecord,
    expressionText: string,
  ): TextSpanAnchor | undefined {
    const selector = marginRecord.target?.selector;
    if (!selector) {
      return undefined;
    }

    switch (selector.type) {
      case 'TextPositionSelector': {
        const result = textPositionToAnchor(selector, expressionText);
        return result.ok ? result.value : undefined;
      }
      case 'TextQuoteSelector': {
        const result = textQuoteToAnchor(selector, expressionText);
        return result.ok ? result.value : undefined;
      }
      default:
        // FragmentSelector and unsupported types cannot be converted to text spans
        return undefined;
    }
  }
}

export type {
  MarginAnnotationRecord,
  MarginTarget,
  MarginBody,
  MarginMotivation,
  ExternalAnnotationView,
  ExternalAnnotationSource,
  IMarginAdapter,
};
export { MarginAdapter, MOTIVATION_LABELS };
