/**
 * PII scrubbing utilities for frontend observability payloads.
 *
 * Strips personally identifiable information (emails, tokens, DIDs,
 * credit card numbers, etc.) from strings, URLs, headers, and objects
 * before they are sent to external telemetry collectors.
 *
 * @module
 */

/** Sentinel value replacing scrubbed content. */
const REDACTED = '[REDACTED]';

/** Maximum recursion depth for deep object scrubbing. */
const MAX_DEPTH = 10;

// ---- Pattern definitions ----

/** Email addresses. */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** AT Protocol DIDs (did:plc:..., did:web:...). */
const DID_PATTERN = /did:[a-z]+:[a-zA-Z0-9._:%-]+/g;

/** AT Protocol handles (e.g., alice.bsky.social). */
const HANDLE_PATTERN =
  /(?<![a-zA-Z0-9])@[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/g;

/** JWT tokens (three dot-separated base64url segments). */
const JWT_PATTERN = /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;

/** Bearer token header values. */
const BEARER_PATTERN = /Bearer\s+[a-zA-Z0-9._~+/=-]+/gi;

/** API keys (generic long alphanumeric strings preceded by "key" or "apikey"). */
const API_KEY_PATTERN = /(?:api[_-]?key|token)[=:]\s*[a-zA-Z0-9_-]{16,}/gi;

/** Credit card numbers (13-19 digits, optionally separated by spaces or dashes). */
const CREDIT_CARD_PATTERN = /\b(?:\d[ -]*?){13,19}\b/g;

/** US Social Security Numbers. */
const SSN_PATTERN = /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g;

/** Phone numbers (US and international formats). */
const PHONE_PATTERN = /(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g;

/** IPv4 addresses. */
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

/** IPv6 addresses (simplified, catches common formats). */
const IPV6_PATTERN =
  /(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}/g;

/** Ordered list of string-level scrub patterns. */
const STRING_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: JWT_PATTERN, label: 'jwt' },
  { pattern: BEARER_PATTERN, label: 'bearer' },
  { pattern: API_KEY_PATTERN, label: 'api_key' },
  { pattern: EMAIL_PATTERN, label: 'email' },
  { pattern: DID_PATTERN, label: 'did' },
  { pattern: HANDLE_PATTERN, label: 'handle' },
  { pattern: CREDIT_CARD_PATTERN, label: 'credit_card' },
  { pattern: SSN_PATTERN, label: 'ssn' },
  { pattern: PHONE_PATTERN, label: 'phone' },
  { pattern: IPV4_PATTERN, label: 'ipv4' },
  { pattern: IPV6_PATTERN, label: 'ipv6' },
];

/** URL query parameter names whose values are always scrubbed. */
const SENSITIVE_PARAMS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'session',
  'code',
  'state',
  'nonce',
  'id_token',
  'api_key',
  'apikey',
  'key',
  'secret',
  'password',
  'credential',
  'authorization',
  'dpop',
]);

/** HTTP header names (lowercased) whose values are always scrubbed. */
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'dpop',
  'x-api-key',
  'x-service-auth',
  'proxy-authorization',
  'www-authenticate',
]);

// ---- Public scrub functions ----

/**
 * Scrubs PII patterns from a plain string.
 *
 * @param input - the string to scrub
 * @returns the scrubbed string with PII replaced by [REDACTED]
 */
function scrubString(input: string): string {
  let result = input;
  for (const { pattern } of STRING_PATTERNS) {
    // Reset lastIndex for global regex reuse.
    pattern.lastIndex = 0;
    result = result.replace(pattern, REDACTED);
  }
  return result;
}

/**
 * Scrubs sensitive query parameters from a URL string.
 *
 * Parameters in the SENSITIVE_PARAMS set have their values replaced.
 * The rest of the URL is also passed through string-level scrubbing.
 *
 * @param url - the URL string to scrub
 * @returns the scrubbed URL string
 */
function scrubUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of parsed.searchParams.keys()) {
      if (SENSITIVE_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, REDACTED);
      }
    }
    return scrubString(parsed.toString());
  } catch {
    // If the URL is malformed, fall back to string-level scrubbing.
    return scrubString(url);
  }
}

/**
 * Scrubs sensitive HTTP header values.
 *
 * Headers whose names match SENSITIVE_HEADERS have their values
 * replaced entirely. All other header values are string-scrubbed.
 *
 * @param headers - header name-value map
 * @returns a new object with scrubbed values
 */
function scrubHeaders(headers: Readonly<Record<string, string>>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(name.toLowerCase())) {
      result[name] = REDACTED;
    } else {
      result[name] = scrubString(value);
    }
  }
  return result;
}

/**
 * Deep-scrubs PII from an object, traversing nested objects and arrays
 * up to MAX_DEPTH levels.
 *
 * @param obj - the object to scrub
 * @param depth - current recursion depth (internal, do not provide)
 * @returns a new object with PII scrubbed from all string values
 */
function scrubObject<T>(obj: T, depth?: number): T {
  const currentDepth = depth ?? 0;

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return scrubString(obj) as T;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (currentDepth >= MAX_DEPTH) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubObject(item, currentDepth + 1)) as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === 'string') {
      result[key] = scrubString(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = scrubObject(value, currentDepth + 1);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Scrubs PII from an Error object, covering message, stack, and cause.
 *
 * @param error - the error to scrub
 * @returns a new Error with scrubbed message and stack
 */
function scrubError(error: Error): Error {
  const scrubbed = new Error(scrubString(error.message));
  scrubbed.name = error.name;
  if (error.stack) {
    scrubbed.stack = scrubString(error.stack);
  }
  if (error.cause instanceof Error) {
    scrubbed.cause = scrubError(error.cause);
  }
  return scrubbed;
}

/**
 * Creates a Faro beforeSend hook that scrubs PII from all outbound
 * telemetry payloads.
 *
 * Attach the returned function to the Faro SDK's `beforeSend` config
 * option to ensure no PII leaves the browser.
 *
 * @returns a beforeSend function compatible with Faro's TransportItem type
 */
function createPrivacyBeforeSend(): (item: unknown) => unknown {
  // The Faro beforeSend hook receives a TransportItem and returns
  // TransportItem | null. We scrub the payload in place and return it.
  return (item: unknown): unknown => {
    try {
      return scrubObject(item);
    } catch {
      // If scrubbing fails, drop the item rather than leaking PII.
      return null;
    }
  };
}

export {
  scrubString,
  scrubUrl,
  scrubHeaders,
  scrubObject,
  scrubError,
  createPrivacyBeforeSend,
  REDACTED,
};
