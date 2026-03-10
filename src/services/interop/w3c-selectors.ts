/**
 * W3C Web Annotation selector types and conversion utilities.
 *
 * Provides bidirectional conversion between W3C selectors (used by margin.at
 * and other Web Annotation-compatible tools) and Layers anchor types. Supports
 * TextQuoteSelector, TextPositionSelector, and FragmentSelector from the
 * W3C Web Annotation Data Model (https://www.w3.org/TR/annotation-model/).
 *
 * @module
 */

import { Err, Ok, type Result } from '../../types/result.js';
import { ValidationError } from '../../types/errors.js';
import { InteropError } from './interop-error.js';

// ---------------------------------------------------------------------------
// W3C Selector type definitions
// ---------------------------------------------------------------------------

/**
 * Selects text by quoting the exact content with optional surrounding context.
 *
 * @see https://www.w3.org/TR/annotation-model/#text-quote-selector
 */
interface TextQuoteSelector {
  readonly type: 'TextQuoteSelector';
  /** The exact text that is selected. */
  readonly exact: string;
  /** Text immediately before the selected text, for disambiguation. */
  readonly prefix?: string | undefined;
  /** Text immediately after the selected text, for disambiguation. */
  readonly suffix?: string | undefined;
}

/**
 * Selects text by character position offsets within the target resource.
 *
 * @see https://www.w3.org/TR/annotation-model/#text-position-selector
 */
interface TextPositionSelector {
  readonly type: 'TextPositionSelector';
  /** Zero-based character offset of the first selected character. */
  readonly start: number;
  /** Zero-based character offset of the first character after the selection. */
  readonly end: number;
}

/**
 * Selects a fragment of the target using the fragment identifier syntax.
 *
 * @see https://www.w3.org/TR/annotation-model/#fragment-selector
 */
interface FragmentSelector {
  readonly type: 'FragmentSelector';
  /** The fragment identifier value (e.g., 'xywh=100,100,300,200'). */
  readonly value: string;
  /** The specification that defines the fragment syntax (e.g., Media Fragments URI). */
  readonly conformsTo?: string | undefined;
}

/**
 * Union of all supported W3C Web Annotation selector types.
 */
type W3CSelector = TextQuoteSelector | TextPositionSelector | FragmentSelector;

// ---------------------------------------------------------------------------
// Layers Anchor type (subset relevant to text annotations)
// ---------------------------------------------------------------------------

/**
 * A text span anchor in the Layers coordinate system.
 */
interface TextSpanAnchor {
  readonly type: 'textSpan';
  readonly start: number;
  readonly end: number;
}

// ---------------------------------------------------------------------------
// W3C Selector -> Layers Anchor conversion
// ---------------------------------------------------------------------------

/**
 * Converts a W3C TextPositionSelector to a Layers textSpan anchor.
 *
 * This is a direct mapping because both use zero-based character offsets.
 *
 * @param selector - the TextPositionSelector to convert
 * @returns a textSpan anchor, or a validation error if offsets are invalid
 *
 * @example
 * ```typescript
 * const anchor = textPositionToAnchor({ type: 'TextPositionSelector', start: 4, end: 7 });
 * // Ok({ type: 'textSpan', start: 4, end: 7 })
 * ```
 */
function textPositionToAnchor(
  selector: TextPositionSelector,
): Result<TextSpanAnchor, ValidationError> {
  if (selector.start < 0 || selector.end < 0) {
    return Err(new ValidationError('Selector offsets must be non-negative', 'start/end', 'min'));
  }
  if (selector.start >= selector.end) {
    return Err(
      new ValidationError('Selector start must be less than end', 'start', 'less_than_end'),
    );
  }

  return Ok({ type: 'textSpan', start: selector.start, end: selector.end });
}

/**
 * Finds a TextQuoteSelector match in expression text and converts to a textSpan anchor.
 *
 * Uses the `prefix` and `suffix` fields for disambiguation when the exact text
 * appears multiple times. Returns the first match if no context is provided or
 * if context does not disambiguate.
 *
 * @param selector - the TextQuoteSelector to resolve
 * @param text - the full expression text to search within
 * @returns a textSpan anchor, or an interop error if the quote is not found
 *
 * @example
 * ```typescript
 * const anchor = textQuoteToAnchor(
 *   { type: 'TextQuoteSelector', exact: 'cat', prefix: 'The ', suffix: ' sat' },
 *   'The cat sat on the mat.',
 * );
 * // Ok({ type: 'textSpan', start: 4, end: 7 })
 * ```
 */
function textQuoteToAnchor(
  selector: TextQuoteSelector,
  text: string,
): Result<TextSpanAnchor, InteropError> {
  if (!selector.exact) {
    return Err(new InteropError('TextQuoteSelector.exact is empty', 'w3c', 'TextQuoteSelector'));
  }

  // Collect all occurrences of the exact text
  const occurrences: number[] = [];
  let searchFrom = 0;
  while (searchFrom <= text.length - selector.exact.length) {
    const idx = text.indexOf(selector.exact, searchFrom);
    if (idx === -1) break;
    occurrences.push(idx);
    searchFrom = idx + 1;
  }

  if (occurrences.length === 0) {
    return Err(
      new InteropError(
        `Text quote "${selector.exact}" not found in expression`,
        'w3c',
        'TextQuoteSelector',
      ),
    );
  }

  // Disambiguate with prefix/suffix if available
  // Safe: we checked occurrences.length > 0 above
  let bestIndex = occurrences[0] ?? 0;

  if (selector.prefix || selector.suffix) {
    for (const idx of occurrences) {
      let prefixMatch = true;
      let suffixMatch = true;

      if (selector.prefix) {
        const preceding = text.slice(Math.max(0, idx - selector.prefix.length), idx);
        prefixMatch = preceding === selector.prefix;
      }

      if (selector.suffix) {
        const end = idx + selector.exact.length;
        const following = text.slice(end, end + selector.suffix.length);
        suffixMatch = following === selector.suffix;
      }

      if (prefixMatch && suffixMatch) {
        bestIndex = idx;
        break;
      }
    }
  }

  return Ok({
    type: 'textSpan',
    start: bestIndex,
    end: bestIndex + selector.exact.length,
  });
}

// ---------------------------------------------------------------------------
// Layers Anchor -> W3C Selector conversion
// ---------------------------------------------------------------------------

/**
 * Default number of context characters for prefix/suffix in TextQuoteSelectors.
 */
const DEFAULT_CONTEXT_CHARS = 32;

/**
 * Converts a Layers textSpan anchor to a W3C TextPositionSelector.
 *
 * @param anchor - the textSpan anchor with start and end offsets
 * @returns a TextPositionSelector with the same offsets
 *
 * @example
 * ```typescript
 * const selector = anchorToTextPosition({ type: 'textSpan', start: 4, end: 7 });
 * // { type: 'TextPositionSelector', start: 4, end: 7 }
 * ```
 */
function anchorToTextPosition(anchor: TextSpanAnchor): TextPositionSelector {
  return { type: 'TextPositionSelector', start: anchor.start, end: anchor.end };
}

/**
 * Converts a Layers textSpan anchor to a W3C TextQuoteSelector with context.
 *
 * Extracts the exact text from the expression and includes surrounding
 * characters as prefix/suffix for disambiguation.
 *
 * @param anchor - the textSpan anchor with start and end offsets
 * @param text - the full expression text
 * @param contextChars - number of context characters to include (default 32)
 * @returns a TextQuoteSelector, or a validation error if offsets are out of bounds
 *
 * @example
 * ```typescript
 * const selector = anchorToTextQuote(
 *   { type: 'textSpan', start: 4, end: 7 },
 *   'The cat sat on the mat.',
 * );
 * // Ok({ type: 'TextQuoteSelector', exact: 'cat', prefix: 'The ', suffix: ' sat on the mat.' })
 * ```
 */
function anchorToTextQuote(
  anchor: TextSpanAnchor,
  text: string,
  contextChars: number = DEFAULT_CONTEXT_CHARS,
): Result<TextQuoteSelector, ValidationError> {
  if (anchor.start < 0 || anchor.end > text.length || anchor.start >= anchor.end) {
    return Err(
      new ValidationError(
        `Anchor offsets [${anchor.start}, ${anchor.end}) are out of bounds for text of length ${text.length}`,
        'anchor',
        'bounds',
      ),
    );
  }

  const exact = text.slice(anchor.start, anchor.end);
  const prefixStart = Math.max(0, anchor.start - contextChars);
  const suffixEnd = Math.min(text.length, anchor.end + contextChars);

  const prefix = anchor.start > 0 ? text.slice(prefixStart, anchor.start) : undefined;
  const suffix = anchor.end < text.length ? text.slice(anchor.end, suffixEnd) : undefined;

  return Ok({ type: 'TextQuoteSelector', exact, prefix, suffix });
}

export type {
  TextQuoteSelector,
  TextPositionSelector,
  FragmentSelector,
  W3CSelector,
  TextSpanAnchor,
};
export {
  textPositionToAnchor,
  textQuoteToAnchor,
  anchorToTextPosition,
  anchorToTextQuote,
  DEFAULT_CONTEXT_CHARS,
};
