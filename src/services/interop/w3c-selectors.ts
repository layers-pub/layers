/**
 * W3C Web Annotation selector types and conversion utilities.
 *
 * Provides bidirectional conversion between W3C selectors (used by margin.at
 * and other Web Annotation-compatible tools) and Layers anchor types. Supports
 * TextQuoteSelector, TextPositionSelector, and FragmentSelector from the
 * W3C Web Annotation Data Model (https://www.w3.org/TR/annotation-model/).
 *
 * Layers uses UTF-8 byte offsets internally (aligned with ATProto). W3C
 * selectors use character offsets. Conversion between the two is handled
 * transparently by these utilities.
 *
 * @module
 */

import { UnicodeString } from '@atproto/api';

import { Err, Ok, type Result } from '../../types/result.js';
import { ValidationError } from '../../types/errors.js';
import { InteropError } from './interop-error.js';
import { charToByteOffset, byteToCharOffset } from './byte-offset.js';

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
 * W3C spec uses character offsets. Layers converts to/from byte offsets.
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
 * A text span anchor in the Layers coordinate system (byte offsets).
 */
interface TextSpanAnchor {
  readonly type: 'textSpan';
  readonly byteStart: number;
  readonly byteEnd: number;
}

// ---------------------------------------------------------------------------
// W3C Selector -> Layers Anchor conversion
// ---------------------------------------------------------------------------

/**
 * Converts a W3C TextPositionSelector (character offsets) to a Layers
 * textSpan anchor (byte offsets).
 *
 * @param selector - the TextPositionSelector to convert
 * @param text - the full expression text, needed for char-to-byte conversion
 * @returns a textSpan anchor with byte offsets, or a validation error
 *
 * @example
 * ```typescript
 * const anchor = textPositionToAnchor(
 *   { type: 'TextPositionSelector', start: 4, end: 7 },
 *   'The cat sat',
 * );
 * // Ok({ type: 'textSpan', byteStart: 4, byteEnd: 7 })
 * ```
 */
function textPositionToAnchor(
  selector: TextPositionSelector,
  text: string,
): Result<TextSpanAnchor, ValidationError> {
  if (selector.start < 0 || selector.end < 0) {
    return Err(new ValidationError('Selector offsets must be non-negative', 'start/end', 'min'));
  }
  if (selector.start >= selector.end) {
    return Err(
      new ValidationError('Selector start must be less than end', 'start', 'less_than_end'),
    );
  }

  const byteStart = charToByteOffset(text, selector.start);
  const byteEnd = charToByteOffset(text, selector.end);

  return Ok({ type: 'textSpan', byteStart, byteEnd });
}

/**
 * Finds a TextQuoteSelector match in expression text and converts to a
 * textSpan anchor with byte offsets.
 *
 * Uses the `prefix` and `suffix` fields for disambiguation when the exact text
 * appears multiple times. Returns the first match if no context is provided or
 * if context does not disambiguate.
 *
 * @param selector - the TextQuoteSelector to resolve
 * @param text - the full expression text to search within
 * @returns a textSpan anchor with byte offsets, or an interop error
 *
 * @example
 * ```typescript
 * const anchor = textQuoteToAnchor(
 *   { type: 'TextQuoteSelector', exact: 'cat', prefix: 'The ', suffix: ' sat' },
 *   'The cat sat on the mat.',
 * );
 * // Ok({ type: 'textSpan', byteStart: 4, byteEnd: 7 })
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
  let bestCharIndex = occurrences[0] ?? 0;

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
        bestCharIndex = idx;
        break;
      }
    }
  }

  const charEnd = bestCharIndex + selector.exact.length;
  const byteStart = charToByteOffset(text, bestCharIndex);
  const byteEnd = charToByteOffset(text, charEnd);

  return Ok({ type: 'textSpan', byteStart, byteEnd });
}

// ---------------------------------------------------------------------------
// Layers Anchor -> W3C Selector conversion
// ---------------------------------------------------------------------------

/**
 * Default number of context characters for prefix/suffix in TextQuoteSelectors.
 */
const DEFAULT_CONTEXT_CHARS = 32;

/**
 * Converts a Layers textSpan anchor (byte offsets) to a W3C
 * TextPositionSelector (character offsets).
 *
 * @param anchor - the textSpan anchor with byte offsets
 * @param text - the full expression text, needed for byte-to-char conversion
 * @returns a TextPositionSelector with character offsets
 *
 * @example
 * ```typescript
 * const selector = anchorToTextPosition(
 *   { type: 'textSpan', byteStart: 4, byteEnd: 7 },
 *   'The cat sat',
 * );
 * // { type: 'TextPositionSelector', start: 4, end: 7 }
 * ```
 */
function anchorToTextPosition(anchor: TextSpanAnchor, text: string): TextPositionSelector {
  const charStart = byteToCharOffset(text, anchor.byteStart);
  const charEnd = byteToCharOffset(text, anchor.byteEnd);
  return { type: 'TextPositionSelector', start: charStart, end: charEnd };
}

/**
 * Converts a Layers textSpan anchor (byte offsets) to a W3C
 * TextQuoteSelector with context.
 *
 * Extracts the exact text from the expression and includes surrounding
 * characters as prefix/suffix for disambiguation.
 *
 * @param anchor - the textSpan anchor with byte offsets
 * @param text - the full expression text
 * @param contextChars - number of context characters to include (default 32)
 * @returns a TextQuoteSelector, or a validation error if offsets are out of bounds
 *
 * @example
 * ```typescript
 * const selector = anchorToTextQuote(
 *   { type: 'textSpan', byteStart: 4, byteEnd: 7 },
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
  const us = new UnicodeString(text);

  if (anchor.byteStart < 0 || anchor.byteEnd > us.length || anchor.byteStart >= anchor.byteEnd) {
    return Err(
      new ValidationError(
        `Anchor byte offsets [${anchor.byteStart}, ${anchor.byteEnd}) are out of bounds for text of ${us.length} bytes`,
        'anchor',
        'bounds',
      ),
    );
  }

  const charStart = byteToCharOffset(text, anchor.byteStart);
  const charEnd = byteToCharOffset(text, anchor.byteEnd);

  const exact = text.slice(charStart, charEnd);
  const prefixStart = Math.max(0, charStart - contextChars);
  const suffixEnd = Math.min(text.length, charEnd + contextChars);

  const prefix = charStart > 0 ? text.slice(prefixStart, charStart) : undefined;
  const suffix = charEnd < text.length ? text.slice(charEnd, suffixEnd) : undefined;

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
