/**
 * Unit tests for UTF-8 byte offset conversion utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import {
  byteSlice,
  byteSpanToCharSpan,
  byteToCharOffset,
  charSpanToByteSpan,
  charToByteOffset,
} from '@/services/interop/byte-offset.js';

// ---------------------------------------------------------------------------
// charToByteOffset
// ---------------------------------------------------------------------------

describe('charToByteOffset', () => {
  it('returns equal offsets for ASCII text', () => {
    const text = 'hello world';
    for (let i = 0; i <= text.length; i++) {
      expect(charToByteOffset(text, i)).toBe(i);
    }
  });

  it('returns 0 for offset 0', () => {
    expect(charToByteOffset('anything', 0)).toBe(0);
  });

  it('accounts for 2-byte characters (accents)', () => {
    // 'cafe' in ASCII = 4 bytes, then 'e' with accent (U+00E9) = 2 bytes in UTF-8
    const text = 'caf\u00e9';
    expect(charToByteOffset(text, 0)).toBe(0); // before 'c'
    expect(charToByteOffset(text, 3)).toBe(3); // before accent char
    expect(charToByteOffset(text, 4)).toBe(5); // after accent char (2 bytes)
  });

  it('accounts for 3-byte characters (CJK)', () => {
    // Each CJK character is 3 bytes in UTF-8
    const text = '\u4f60\u597d'; // "nihao" in Chinese
    expect(charToByteOffset(text, 0)).toBe(0);
    expect(charToByteOffset(text, 1)).toBe(3);
    expect(charToByteOffset(text, 2)).toBe(6);
  });

  it('accounts for 4-byte characters (emoji)', () => {
    // Emoji like U+1F600 is 4 bytes in UTF-8, but 2 JS chars (surrogate pair)
    const text = 'a\u{1F600}b';
    expect(charToByteOffset(text, 0)).toBe(0); // before 'a'
    expect(charToByteOffset(text, 1)).toBe(1); // before emoji (first surrogate)
    // After the emoji surrogate pair (2 JS chars), byte offset accounts for 4-byte emoji
    expect(charToByteOffset(text, 3)).toBe(5); // before 'b'
    expect(charToByteOffset(text, 4)).toBe(6); // after 'b'
  });

  it('handles empty string', () => {
    expect(charToByteOffset('', 0)).toBe(0);
  });

  it('handles mixed ASCII and multi-byte characters', () => {
    const text = 'hi \u00e9\u4f60\u{1F600}!';
    // 'h' = 1, 'i' = 1, ' ' = 1, '\u00e9' = 2, '\u4f60' = 3, emoji = 4, '!' = 1
    // JS chars: h(0) i(1) ' '(2) \u00e9(3) \u4f60(4) surr-hi(5) surr-lo(6) !(7)
    expect(charToByteOffset(text, 0)).toBe(0);
    expect(charToByteOffset(text, 3)).toBe(3);
    expect(charToByteOffset(text, 4)).toBe(5);
    expect(charToByteOffset(text, 5)).toBe(8);
    expect(charToByteOffset(text, 7)).toBe(12);
    expect(charToByteOffset(text, 8)).toBe(13);
  });
});

// ---------------------------------------------------------------------------
// byteToCharOffset
// ---------------------------------------------------------------------------

describe('byteToCharOffset', () => {
  it('returns equal offsets for ASCII text', () => {
    const text = 'hello world';
    for (let i = 0; i <= text.length; i++) {
      expect(byteToCharOffset(text, i)).toBe(i);
    }
  });

  it('returns 0 for offset 0', () => {
    expect(byteToCharOffset('anything', 0)).toBe(0);
  });

  it('accounts for 2-byte characters', () => {
    const text = 'caf\u00e9';
    expect(byteToCharOffset(text, 3)).toBe(3); // before accent
    expect(byteToCharOffset(text, 5)).toBe(4); // after accent (2 bytes)
  });

  it('accounts for 3-byte characters (CJK)', () => {
    const text = '\u4f60\u597d';
    expect(byteToCharOffset(text, 0)).toBe(0);
    expect(byteToCharOffset(text, 3)).toBe(1);
    expect(byteToCharOffset(text, 6)).toBe(2);
  });

  it('accounts for 4-byte characters (emoji)', () => {
    const text = 'a\u{1F600}b';
    expect(byteToCharOffset(text, 0)).toBe(0);
    expect(byteToCharOffset(text, 1)).toBe(1); // before emoji
    expect(byteToCharOffset(text, 5)).toBe(3); // after emoji (surrogate pair = 2 JS chars)
    expect(byteToCharOffset(text, 6)).toBe(4); // after 'b'
  });
});

// ---------------------------------------------------------------------------
// Round-trip: charToByteOffset <-> byteToCharOffset
// ---------------------------------------------------------------------------

describe('charToByteOffset and byteToCharOffset round-trip', () => {
  const testCases = [
    { label: 'ASCII', text: 'The quick brown fox' },
    { label: 'accented', text: 'caf\u00e9 cr\u00e8me br\u00fbl\u00e9e' },
    { label: 'CJK', text: '\u4f60\u597d\u4e16\u754c' },
    { label: 'emoji', text: '\u{1F600}\u{1F601}\u{1F602}' },
    { label: 'mixed', text: 'Hi \u4f60\u597d \u{1F600}!' },
  ];

  for (const { label, text } of testCases) {
    it(`round-trips for ${label} text`, () => {
      // For each valid character offset, convert to byte and back.
      for (let charIdx = 0; charIdx <= text.length; charIdx++) {
        const byteIdx = charToByteOffset(text, charIdx);
        const recovered = byteToCharOffset(text, byteIdx);
        expect(recovered).toBe(charIdx);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// byteSlice
// ---------------------------------------------------------------------------

describe('byteSlice', () => {
  it('slices ASCII text correctly', () => {
    const text = 'hello world';
    expect(byteSlice(text, 0, 5)).toBe('hello');
    expect(byteSlice(text, 6, 11)).toBe('world');
  });

  it('slices multi-byte characters correctly', () => {
    const text = 'caf\u00e9'; // bytes: 'c'(1) 'a'(1) 'f'(1) '\u00e9'(2)
    expect(byteSlice(text, 0, 3)).toBe('caf');
    expect(byteSlice(text, 3, 5)).toBe('\u00e9');
    expect(byteSlice(text, 0, 5)).toBe('caf\u00e9');
  });

  it('slices CJK characters correctly', () => {
    const text = '\u4f60\u597d\u4e16\u754c'; // 4 CJK chars, 3 bytes each
    expect(byteSlice(text, 0, 3)).toBe('\u4f60');
    expect(byteSlice(text, 3, 6)).toBe('\u597d');
    expect(byteSlice(text, 0, 6)).toBe('\u4f60\u597d');
  });

  it('slices emoji correctly', () => {
    const text = 'a\u{1F600}b'; // 'a'(1) + emoji(4) + 'b'(1) = 6 bytes
    expect(byteSlice(text, 0, 1)).toBe('a');
    expect(byteSlice(text, 1, 5)).toBe('\u{1F600}');
    expect(byteSlice(text, 5, 6)).toBe('b');
  });

  it('returns empty string for zero-length span', () => {
    expect(byteSlice('hello', 3, 3)).toBe('');
  });

  it('returns full string when span covers entire text', () => {
    const text = 'hello';
    expect(byteSlice(text, 0, Buffer.byteLength(text, 'utf8'))).toBe(text);
  });
});

// ---------------------------------------------------------------------------
// charSpanToByteSpan and byteSpanToCharSpan
// ---------------------------------------------------------------------------

describe('charSpanToByteSpan', () => {
  it('returns equal offsets for ASCII text', () => {
    const text = 'hello world';
    const result = charSpanToByteSpan(text, 6, 11);
    expect(result).toEqual({ byteStart: 6, byteEnd: 11, charStart: 6, charEnd: 11 });
  });

  it('converts multi-byte span correctly', () => {
    const text = 'caf\u00e9 world';
    // charStart=3 -> byteStart=3, charEnd=4 -> byteEnd=5 (\u00e9 = 2 bytes)
    const result = charSpanToByteSpan(text, 3, 4);
    expect(result.byteStart).toBe(3);
    expect(result.byteEnd).toBe(5);
    expect(result.charStart).toBe(3);
    expect(result.charEnd).toBe(4);
  });

  it('preserves original character offsets in result', () => {
    const text = '\u4f60\u597d';
    const result = charSpanToByteSpan(text, 0, 2);
    expect(result.charStart).toBe(0);
    expect(result.charEnd).toBe(2);
    expect(result.byteStart).toBe(0);
    expect(result.byteEnd).toBe(6);
  });
});

describe('byteSpanToCharSpan', () => {
  it('returns equal offsets for ASCII text', () => {
    const text = 'hello world';
    const result = byteSpanToCharSpan(text, 6, 11);
    expect(result).toEqual({ charStart: 6, charEnd: 11 });
  });

  it('converts multi-byte span correctly', () => {
    const text = 'caf\u00e9 world';
    const result = byteSpanToCharSpan(text, 3, 5);
    expect(result.charStart).toBe(3);
    expect(result.charEnd).toBe(4);
  });
});

describe('charSpanToByteSpan and byteSpanToCharSpan are inverses', () => {
  const testCases = [
    { label: 'ASCII', text: 'The cat sat', charStart: 4, charEnd: 7 },
    { label: 'accented', text: 'caf\u00e9 cr\u00e8me', charStart: 0, charEnd: 4 },
    { label: 'CJK', text: '\u4f60\u597d\u4e16\u754c', charStart: 1, charEnd: 3 },
    { label: 'mixed', text: 'hi \u4f60 bye', charStart: 3, charEnd: 4 },
  ];

  for (const { label, text, charStart, charEnd } of testCases) {
    it(`round-trips char->byte->char for ${label} text`, () => {
      const byteSpan = charSpanToByteSpan(text, charStart, charEnd);
      const charSpan = byteSpanToCharSpan(text, byteSpan.byteStart, byteSpan.byteEnd);
      expect(charSpan.charStart).toBe(charStart);
      expect(charSpan.charEnd).toBe(charEnd);
    });
  }

  for (const { label, text, charStart, charEnd } of testCases) {
    it(`round-trips byte->char->byte for ${label} text`, () => {
      const byteSpan = charSpanToByteSpan(text, charStart, charEnd);
      const charSpan = byteSpanToCharSpan(text, byteSpan.byteStart, byteSpan.byteEnd);
      const restored = charSpanToByteSpan(text, charSpan.charStart, charSpan.charEnd);
      expect(restored.byteStart).toBe(byteSpan.byteStart);
      expect(restored.byteEnd).toBe(byteSpan.byteEnd);
    });
  }
});
