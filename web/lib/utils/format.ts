/**
 * Formatting utilities for display values, AT-URIs, and text truncation.
 *
 * @packageDocumentation
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Formats a date as a human-readable relative time string.
 *
 * @param date - ISO 8601 date string or Date object
 * @returns relative time string (e.g., "2 hours ago", "3 days ago", "just now")
 *
 * @example
 * ```typescript
 * formatRelativeTime('2026-03-09T10:00:00Z'); // "2 hours ago"
 * formatRelativeTime(new Date(Date.now() - 5000)); // "just now"
 * ```
 */
function formatRelativeTime(date: string | Date): string {
  const then = date instanceof Date ? date : new Date(date);
  const now = Date.now();
  const diff = now - then.getTime();

  if (diff < 0) return 'just now';
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (diff < WEEK) {
    const days = Math.floor(diff / DAY);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  if (diff < MONTH) {
    const weeks = Math.floor(diff / WEEK);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (diff < YEAR) {
    const months = Math.floor(diff / MONTH);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  const years = Math.floor(diff / YEAR);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Truncates text to a maximum length, appending an ellipsis if truncated.
 *
 * @param text - the text to truncate
 * @param maxLength - maximum character length (default: 200)
 * @returns the original text if shorter than maxLength, or truncated text with ellipsis
 *
 * @example
 * ```typescript
 * truncateText('Hello world', 5); // "Hello..."
 * truncateText('Short', 200); // "Short"
 * ```
 */
function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

/**
 * Encodes an AT-URI for use in URL path segments.
 *
 * AT-URIs contain slashes (`at://did:plc:abc/collection/rkey`) that must be
 * encoded for safe embedding in URL paths.
 *
 * @param uri - AT-URI string
 * @returns encoded URI suitable for URL path segments
 *
 * @example
 * ```typescript
 * encodeAtUri('at://did:plc:abc/pub.layers.expression.expression/123');
 * // "at%3A%2F%2Fdid%3Aplc%3Aabc%2Fpub.layers.expression.expression%2F123"
 * ```
 */
function encodeAtUri(uri: string): string {
  return encodeURIComponent(uri);
}

/**
 * Reconstructs an AT-URI from catch-all route segments.
 *
 * Next.js `[...uri]` catch-all routes split the path into an array of segments.
 * This function rejoins them and decodes the result.
 *
 * @param segments - array of path segments from Next.js catch-all route params
 * @returns the reconstructed AT-URI
 *
 * @example
 * ```typescript
 * // For URL /expressions/at%3A%2F%2Fdid%3Aplc%3Aabc%2Fcol%2Frkey
 * decodeAtUri(['at%3A%2F%2Fdid%3Aplc%3Aabc%2Fcol%2Frkey']);
 * // "at://did:plc:abc/col/rkey"
 *
 * // For URL /expressions/at:/did:plc:abc/col/rkey
 * decodeAtUri(['at:', '', 'did:plc:abc', 'col', 'rkey']);
 * // "at://did:plc:abc/col/rkey"
 * ```
 */
function decodeAtUri(segments: string[]): string {
  const joined = segments.map((s) => decodeURIComponent(s)).join('/');

  // Handle case where the URI was split on slashes by the router
  if (joined.startsWith('at://')) {
    return joined;
  }

  // Handle case where "at:" and "" are separate segments (at:// split on /)
  if (joined.startsWith('at:/')) {
    return joined.replace('at:/', 'at://');
  }

  return joined;
}

export { formatRelativeTime, truncateText, encodeAtUri, decodeAtUri };
