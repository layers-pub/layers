/**
 * UTF-8 byte offset conversion utilities.
 *
 * Wraps `UnicodeString` from `@atproto/api` for converting between
 * JavaScript string indices (UTF-16 code units) and UTF-8 byte offsets.
 * This is the same mechanism ATProto uses for richtext facets.
 *
 * Used by the import pipeline when ingesting datasets that use character
 * offsets (CoNLL-U, BRAT, most NLP formats).
 *
 * @module
 */

import { UnicodeString } from '@atproto/api';

/**
 * Convert a character offset (UTF-16 code unit index) to a UTF-8 byte offset.
 *
 * @param text - the source text
 * @param charOffset - zero-based UTF-16 code unit offset
 * @returns the corresponding UTF-8 byte offset
 */
function charToByteOffset(text: string, charOffset: number): number {
  const us = new UnicodeString(text);
  return us.utf16IndexToUtf8Index(charOffset);
}

/**
 * Convert a UTF-8 byte offset to a character offset (UTF-16 code unit index).
 *
 * Walks the UTF-8 byte array to find the character boundary at or before
 * the given byte offset.
 *
 * @param text - the source text
 * @param byteOffset - zero-based UTF-8 byte offset
 * @returns the corresponding UTF-16 code unit offset
 */
function byteToCharOffset(text: string, byteOffset: number): number {
  const us = new UnicodeString(text);
  const prefix = us.slice(0, byteOffset);
  return prefix.length;
}

/**
 * Extract a substring from text using UTF-8 byte offsets.
 *
 * @param text - the source text
 * @param byteStart - inclusive start byte offset
 * @param byteEnd - exclusive end byte offset
 * @returns the substring between the byte offsets
 */
function byteSlice(text: string, byteStart: number, byteEnd: number): string {
  const us = new UnicodeString(text);
  return us.slice(byteStart, byteEnd);
}

/**
 * Convert a character-offset span to a byte-offset span.
 *
 * @param text - the source text
 * @param charStart - inclusive start character offset
 * @param charEnd - exclusive end character offset
 * @returns the corresponding byte-offset span with character offsets preserved
 */
function charSpanToByteSpan(
  text: string,
  charStart: number,
  charEnd: number,
): { byteStart: number; byteEnd: number; charStart: number; charEnd: number } {
  const us = new UnicodeString(text);
  return {
    byteStart: us.utf16IndexToUtf8Index(charStart),
    byteEnd: us.utf16IndexToUtf8Index(charEnd),
    charStart,
    charEnd,
  };
}

/**
 * Convert a byte-offset span to a character-offset span.
 *
 * @param text - the source text
 * @param byteStart - inclusive start byte offset
 * @param byteEnd - exclusive end byte offset
 * @returns the corresponding character offsets
 */
function byteSpanToCharSpan(
  text: string,
  byteStart: number,
  byteEnd: number,
): { charStart: number; charEnd: number } {
  const us = new UnicodeString(text);
  return {
    charStart: us.slice(0, byteStart).length,
    charEnd: us.slice(0, byteEnd).length,
  };
}

export { charToByteOffset, byteToCharOffset, byteSlice, charSpanToByteSpan, byteSpanToCharSpan };
