/**
 * Unit tests for W3C Web Annotation selector conversion utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import {
  anchorToTextPosition,
  anchorToTextQuote,
  DEFAULT_CONTEXT_CHARS,
  textPositionToAnchor,
  textQuoteToAnchor,
} from '../../../../src/services/interop/w3c-selectors.js';

// ---------------------------------------------------------------------------
// textPositionToAnchor
// ---------------------------------------------------------------------------

describe('textPositionToAnchor', () => {
  it('converts a valid TextPositionSelector to a textSpan anchor', () => {
    const result = textPositionToAnchor({ type: 'TextPositionSelector', start: 4, end: 7 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ type: 'textSpan', start: 4, end: 7 });
    }
  });

  it('accepts zero start offset', () => {
    const result = textPositionToAnchor({ type: 'TextPositionSelector', start: 0, end: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.start).toBe(0);
      expect(result.value.end).toBe(5);
    }
  });

  it('rejects negative start offset', () => {
    const result = textPositionToAnchor({ type: 'TextPositionSelector', start: -1, end: 5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('non-negative');
    }
  });

  it('rejects negative end offset', () => {
    const result = textPositionToAnchor({ type: 'TextPositionSelector', start: 0, end: -3 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('non-negative');
    }
  });

  it('rejects start equal to end', () => {
    const result = textPositionToAnchor({ type: 'TextPositionSelector', start: 5, end: 5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('less than end');
    }
  });

  it('rejects start greater than end', () => {
    const result = textPositionToAnchor({ type: 'TextPositionSelector', start: 10, end: 5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('less than end');
    }
  });
});

// ---------------------------------------------------------------------------
// textQuoteToAnchor
// ---------------------------------------------------------------------------

describe('textQuoteToAnchor', () => {
  const text = 'The cat sat on the mat.';

  it('finds exact text and returns a textSpan anchor', () => {
    const result = textQuoteToAnchor({ type: 'TextQuoteSelector', exact: 'cat' }, text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ type: 'textSpan', start: 4, end: 7 });
    }
  });

  it('uses prefix for disambiguation', () => {
    const ambiguousText = 'the cat and the cat';
    const result = textQuoteToAnchor(
      { type: 'TextQuoteSelector', exact: 'cat', prefix: 'and the ' },
      ambiguousText,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.start).toBe(16);
      expect(result.value.end).toBe(19);
    }
  });

  it('uses suffix for disambiguation', () => {
    const ambiguousText = 'the cat and the cat';
    const result = textQuoteToAnchor(
      { type: 'TextQuoteSelector', exact: 'the', suffix: ' cat and' },
      ambiguousText,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.start).toBe(0);
      expect(result.value.end).toBe(3);
    }
  });

  it('uses both prefix and suffix', () => {
    const result = textQuoteToAnchor(
      { type: 'TextQuoteSelector', exact: 'cat', prefix: 'The ', suffix: ' sat' },
      text,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ type: 'textSpan', start: 4, end: 7 });
    }
  });

  it('returns error for empty exact string', () => {
    const result = textQuoteToAnchor({ type: 'TextQuoteSelector', exact: '' }, text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('empty');
    }
  });

  it('returns error when exact text is not found', () => {
    const result = textQuoteToAnchor({ type: 'TextQuoteSelector', exact: 'dog' }, text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('not found');
    }
  });

  it('falls back to first occurrence when prefix/suffix do not match', () => {
    const ambiguousText = 'cat and cat';
    const result = textQuoteToAnchor(
      { type: 'TextQuoteSelector', exact: 'cat', prefix: 'WRONG' },
      ambiguousText,
    );
    // When prefix does not match any occurrence, it keeps the bestIndex = first occurrence
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.start).toBe(0);
    }
  });

  it('handles text at the very start', () => {
    const result = textQuoteToAnchor({ type: 'TextQuoteSelector', exact: 'The' }, text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ type: 'textSpan', start: 0, end: 3 });
    }
  });

  it('handles text at the very end', () => {
    const result = textQuoteToAnchor({ type: 'TextQuoteSelector', exact: 'mat.' }, text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ type: 'textSpan', start: 19, end: 23 });
    }
  });
});

// ---------------------------------------------------------------------------
// anchorToTextPosition
// ---------------------------------------------------------------------------

describe('anchorToTextPosition', () => {
  it('converts a textSpan anchor to a TextPositionSelector', () => {
    const selector = anchorToTextPosition({ type: 'textSpan', start: 4, end: 7 });
    expect(selector).toEqual({ type: 'TextPositionSelector', start: 4, end: 7 });
  });

  it('preserves zero start offset', () => {
    const selector = anchorToTextPosition({ type: 'textSpan', start: 0, end: 10 });
    expect(selector.start).toBe(0);
    expect(selector.end).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// anchorToTextQuote
// ---------------------------------------------------------------------------

describe('anchorToTextQuote', () => {
  const text = 'The cat sat on the mat.';

  it('extracts exact text and includes prefix and suffix', () => {
    const result = anchorToTextQuote({ type: 'textSpan', start: 4, end: 7 }, text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe('TextQuoteSelector');
      expect(result.value.exact).toBe('cat');
      expect(result.value.prefix).toBe('The ');
      expect(result.value.suffix).toBe(' sat on the mat.');
    }
  });

  it('omits prefix when anchor starts at the beginning', () => {
    const result = anchorToTextQuote({ type: 'textSpan', start: 0, end: 3 }, text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.exact).toBe('The');
      expect(result.value.prefix).toBeUndefined();
      expect(result.value.suffix).toBeDefined();
    }
  });

  it('omits suffix when anchor ends at the text end', () => {
    const result = anchorToTextQuote({ type: 'textSpan', start: 19, end: 23 }, text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.exact).toBe('mat.');
      expect(result.value.prefix).toBeDefined();
      expect(result.value.suffix).toBeUndefined();
    }
  });

  it('respects custom contextChars parameter', () => {
    const result = anchorToTextQuote({ type: 'textSpan', start: 8, end: 11 }, text, 3);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.exact).toBe('sat');
      // prefix should be at most 3 chars: 'at '
      expect(result.value.prefix).toBe('at ');
      // suffix should be at most 3 chars: ' on'
      expect(result.value.suffix).toBe(' on');
    }
  });

  it('returns error for negative start offset', () => {
    const result = anchorToTextQuote({ type: 'textSpan', start: -1, end: 5 }, text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('out of bounds');
    }
  });

  it('returns error when end exceeds text length', () => {
    const result = anchorToTextQuote({ type: 'textSpan', start: 0, end: 100 }, text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('out of bounds');
    }
  });

  it('returns error when start >= end', () => {
    const result = anchorToTextQuote({ type: 'textSpan', start: 5, end: 5 }, text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('out of bounds');
    }
  });

  it('uses DEFAULT_CONTEXT_CHARS by default', () => {
    // Ensure the constant is exported and has a reasonable value
    expect(DEFAULT_CONTEXT_CHARS).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// Round-trip conversions
// ---------------------------------------------------------------------------

describe('round-trip conversions', () => {
  const text = 'The cat sat on the mat.';

  it('Layers -> TextPosition -> Layers produces the same anchor', () => {
    const original = { type: 'textSpan' as const, start: 4, end: 7 };
    const selector = anchorToTextPosition(original);
    const roundTrip = textPositionToAnchor(selector);
    expect(roundTrip.ok).toBe(true);
    if (roundTrip.ok) {
      expect(roundTrip.value).toEqual(original);
    }
  });

  it('Layers -> TextQuote -> Layers produces the same anchor', () => {
    const original = { type: 'textSpan' as const, start: 4, end: 7 };
    const quoteResult = anchorToTextQuote(original, text);
    expect(quoteResult.ok).toBe(true);
    if (!quoteResult.ok) return;

    const roundTrip = textQuoteToAnchor(quoteResult.value, text);
    expect(roundTrip.ok).toBe(true);
    if (roundTrip.ok) {
      expect(roundTrip.value).toEqual(original);
    }
  });

  it('round-trip works for anchor at start of text', () => {
    const original = { type: 'textSpan' as const, start: 0, end: 3 };
    const quoteResult = anchorToTextQuote(original, text);
    expect(quoteResult.ok).toBe(true);
    if (!quoteResult.ok) return;

    const roundTrip = textQuoteToAnchor(quoteResult.value, text);
    expect(roundTrip.ok).toBe(true);
    if (roundTrip.ok) {
      expect(roundTrip.value).toEqual(original);
    }
  });

  it('round-trip works for anchor at end of text', () => {
    const original = { type: 'textSpan' as const, start: 19, end: 23 };
    const quoteResult = anchorToTextQuote(original, text);
    expect(quoteResult.ok).toBe(true);
    if (!quoteResult.ok) return;

    const roundTrip = textQuoteToAnchor(quoteResult.value, text);
    expect(roundTrip.ok).toBe(true);
    if (roundTrip.ok) {
      expect(roundTrip.value).toEqual(original);
    }
  });
});
