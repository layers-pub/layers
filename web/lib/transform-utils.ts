/**
 * Transform expression validation and execution for field mappings.
 *
 * Transforms are applied to source field values during import. They can be
 * chained with the pipe character (|), e.g., "trim|lowercase".
 *
 * @module
 */

/** All recognized single-word transform names. */
const SIMPLE_TRANSFORMS = new Set(['lowercase', 'uppercase', 'trim', 'ms-to-sec', 'sec-to-ms']);

/** Parameterized transform prefixes that accept a colon-separated argument. */
const PARAMETERIZED_PREFIXES = ['prefix:', 'suffix:', 'default:'];

/** The replace transform uses three colon-separated segments: replace:OLD:NEW. */
const REPLACE_PREFIX = 'replace:';

/**
 * Validates a single transform token (not a chain).
 *
 * @returns null if valid, or an error message string if invalid.
 */
function validateSingleTransform(token: string): string | null {
  const trimmed = token.trim();
  if (trimmed === '') return 'Empty transform';

  if (SIMPLE_TRANSFORMS.has(trimmed)) return null;

  if (trimmed.startsWith(REPLACE_PREFIX)) {
    // replace:OLD:NEW requires at least two colons after "replace"
    const afterPrefix = trimmed.slice(REPLACE_PREFIX.length);
    const colonIdx = afterPrefix.indexOf(':');
    if (colonIdx === -1) {
      return 'replace transform requires format "replace:OLD:NEW"';
    }
    return null;
  }

  for (const prefix of PARAMETERIZED_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      const value = trimmed.slice(prefix.length);
      if (value.length === 0) {
        return `${prefix.slice(0, -1)} transform requires a value after the colon`;
      }
      return null;
    }
  }

  return `Unknown transform "${trimmed}". Supported: ${[...SIMPLE_TRANSFORMS].join(', ')}, prefix:VALUE, suffix:VALUE, replace:OLD:NEW, default:VALUE`;
}

/**
 * Parses a pipe-separated transform chain into individual transform tokens.
 */
function parseTransformChain(transform: string): string[] {
  if (transform.trim() === '') return [];
  return transform.split('|').map((t) => t.trim());
}

/**
 * Validates a transform expression string (may contain pipe-separated chains).
 *
 * @returns null if all transforms are valid, or the first error message found.
 */
function validateTransform(transform: string): string | null {
  const trimmed = transform.trim();
  if (trimmed === '') return null;

  const tokens = parseTransformChain(trimmed);
  for (const token of tokens) {
    const error = validateSingleTransform(token);
    if (error !== null) return error;
  }
  return null;
}

/**
 * Applies a single transform token to a value.
 */
function applySingleTransform(value: string, token: string): string {
  const trimmed = token.trim();

  switch (trimmed) {
    case 'lowercase':
      return value.toLowerCase();
    case 'uppercase':
      return value.toUpperCase();
    case 'trim':
      return value.trim();
    case 'ms-to-sec': {
      const num = Number(value);
      if (Number.isNaN(num)) return value;
      return String(num / 1000);
    }
    case 'sec-to-ms': {
      const num = Number(value);
      if (Number.isNaN(num)) return value;
      return String(num * 1000);
    }
    default:
      break;
  }

  if (trimmed.startsWith('prefix:')) {
    return trimmed.slice('prefix:'.length) + value;
  }

  if (trimmed.startsWith('suffix:')) {
    return value + trimmed.slice('suffix:'.length);
  }

  if (trimmed.startsWith('default:')) {
    const defaultValue = trimmed.slice('default:'.length);
    return value === '' ? defaultValue : value;
  }

  if (trimmed.startsWith(REPLACE_PREFIX)) {
    const afterPrefix = trimmed.slice(REPLACE_PREFIX.length);
    const colonIdx = afterPrefix.indexOf(':');
    if (colonIdx === -1) return value;
    const oldStr = afterPrefix.slice(0, colonIdx);
    const newStr = afterPrefix.slice(colonIdx + 1);
    return value.replaceAll(oldStr, newStr);
  }

  return value;
}

/**
 * Applies a transform expression (possibly a pipe-separated chain) to a value.
 *
 * Each transform in the chain is applied sequentially, left to right.
 */
function applyTransform(value: string, transform: string): string {
  const trimmed = transform.trim();
  if (trimmed === '') return value;

  const tokens = parseTransformChain(trimmed);
  let result = value;
  for (const token of tokens) {
    result = applySingleTransform(result, token);
  }
  return result;
}

export { validateTransform, applyTransform, parseTransformChain };
