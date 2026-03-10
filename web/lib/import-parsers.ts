/**
 * Client-side parsers for annotation file formats.
 *
 * These parsers provide preview data and estimated record counts for the
 * import wizard. They are intentionally approximate; the server-side plugins
 * do the authoritative parsing during the actual import.
 *
 * @module
 */

/**
 * Parsed preview data from an annotation file.
 */
interface ParsedPreview {
  columns: string[];
  rows: string[][];
  counts: { expressions: number; segmentations: number; layers: number };
}

/**
 * Reads a File as text using the FileReader API.
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Parses a CoNLL-U formatted string into preview data.
 *
 * CoNLL-U files contain sentences separated by double newlines, with
 * tab-separated token fields per line. Comment lines start with "#".
 */
function parseConllU(content: string): ParsedPreview {
  const sentences = content.split(/\n\n+/).filter((block) => block.trim().length > 0);

  const columns = ['ID', 'Form', 'Lemma', 'UPOS', 'Head', 'DepRel'];
  const rows: string[][] = [];
  let posCount = 0;
  let depRelCount = 0;

  for (const sentence of sentences) {
    const lines = sentence.split('\n').filter((line) => !line.startsWith('#') && line.trim());
    for (const line of lines) {
      const fields = line.split('\t');
      // Skip multi-word tokens (e.g., "1-2") and empty nodes (e.g., "1.1")
      const id = fields[0] ?? '';
      if (id.includes('-') || id.includes('.')) continue;

      const form = fields[1] ?? '';
      const lemma = fields[2] ?? '';
      const upos = fields[3] ?? '';
      const head = fields[6] ?? '';
      const depRel = fields[7] ?? '';

      if (upos !== '_' && upos !== '') posCount++;
      if (depRel !== '_' && depRel !== '') depRelCount++;

      if (rows.length < 10) {
        rows.push([id, form, lemma, upos, head, depRel]);
      }
    }
  }

  const expressionCount = sentences.length;
  const layerCount = (posCount > 0 ? 1 : 0) + (depRelCount > 0 ? 1 : 0);
  // Each sentence produces one expression and one segmentation.
  // Annotation layers: one for POS tags, one for dependencies (if present).
  // Multiply by sentence count since each sentence gets its own layers.
  return {
    columns,
    rows,
    counts: {
      expressions: expressionCount,
      segmentations: expressionCount,
      layers: layerCount * expressionCount,
    },
  };
}

/**
 * Parses BRAT standoff annotation format (.ann files).
 *
 * Lines starting with T are entities (text-bound annotations),
 * R are relations, and A are attributes.
 */
function parseBrat(content: string): ParsedPreview {
  const lines = content.split('\n').filter((line) => line.trim());
  const columns = ['Type', 'ID', 'Label', 'Start', 'End', 'Text'];
  const rows: string[][] = [];

  let entityCount = 0;
  let relationCount = 0;
  let attributeCount = 0;

  for (const line of lines) {
    const id = line.split('\t')[0] ?? '';
    if (id.startsWith('T')) {
      entityCount++;
      const parts = line.split('\t');
      const typeInfo = (parts[1] ?? '').split(' ');
      const label = typeInfo[0] ?? '';
      const start = typeInfo[1] ?? '';
      const end = typeInfo[2] ?? '';
      const text = parts[2] ?? '';
      if (rows.length < 10) {
        rows.push(['Entity', id, label, start, end, text]);
      }
    } else if (id.startsWith('R')) {
      relationCount++;
      const parts = line.split('\t');
      const typeInfo = (parts[1] ?? '').split(' ');
      const label = typeInfo[0] ?? '';
      if (rows.length < 10) {
        rows.push(['Relation', id, label, '-', '-', typeInfo.slice(1).join(' ')]);
      }
    } else if (id.startsWith('A')) {
      attributeCount++;
      const parts = line.split('\t');
      const typeInfo = (parts[1] ?? '').split(' ');
      const label = typeInfo[0] ?? '';
      if (rows.length < 10) {
        rows.push(['Attribute', id, label, '-', '-', typeInfo.slice(1).join(' ')]);
      }
    }
  }

  // One expression per file, one segmentation, layers for entities/relations/attributes
  const layerCount =
    (entityCount > 0 ? 1 : 0) + (relationCount > 0 ? 1 : 0) + (attributeCount > 0 ? 1 : 0);

  return {
    columns,
    rows,
    counts: {
      expressions: 1,
      segmentations: 1,
      layers: layerCount,
    },
  };
}

/**
 * Parses ELAN (.eaf) XML format using the browser DOMParser.
 *
 * Extracts tiers and their annotation children.
 */
function parseElan(content: string): ParsedPreview {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid ELAN XML: ' + (parseError.textContent ?? 'parse error'));
  }

  const columns = ['Tier', 'Start (ms)', 'End (ms)', 'Value'];
  const rows: string[][] = [];
  const tiers = doc.querySelectorAll('TIER');

  // Build a map of time slot IDs to time values
  const timeSlots = new Map<string, string>();
  const timeSlotElements = doc.querySelectorAll('TIME_SLOT');
  for (const slot of timeSlotElements) {
    const id = slot.getAttribute('TIME_SLOT_ID') ?? '';
    const value = slot.getAttribute('TIME_VALUE') ?? '';
    timeSlots.set(id, value);
  }

  for (const tier of tiers) {
    const tierId = tier.getAttribute('TIER_ID') ?? '(unnamed)';
    const annotations = tier.querySelectorAll('ALIGNABLE_ANNOTATION');

    for (const ann of annotations) {
      const ts1 = ann.getAttribute('TIME_SLOT_REF1') ?? '';
      const ts2 = ann.getAttribute('TIME_SLOT_REF2') ?? '';
      const start = timeSlots.get(ts1) ?? ts1;
      const end = timeSlots.get(ts2) ?? ts2;
      const value = ann.querySelector('ANNOTATION_VALUE')?.textContent ?? '';

      if (rows.length < 10) {
        rows.push([tierId, start, end, value]);
      }
    }

    // Also check for REF_ANNOTATION (reference annotations without time alignment)
    const refAnnotations = tier.querySelectorAll('REF_ANNOTATION');
    for (const ann of refAnnotations) {
      const value = ann.querySelector('ANNOTATION_VALUE')?.textContent ?? '';
      if (rows.length < 10) {
        rows.push([tierId, '-', '-', value]);
      }
    }
  }

  return {
    columns,
    rows,
    counts: {
      expressions: 1,
      segmentations: tiers.length,
      layers: tiers.length,
    },
  };
}

/**
 * Parses TEI XML format using the browser DOMParser.
 *
 * Extracts sentences (<s>) and words (<w>) from the TEI body.
 */
function parseTei(content: string): ParsedPreview {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid TEI XML: ' + (parseError.textContent ?? 'parse error'));
  }

  const columns = ['Element', 'Attribute', 'Content'];
  const rows: string[][] = [];

  const sentences = doc.querySelectorAll('s');
  const words = doc.querySelectorAll('w');

  // Count attributes present on <w> elements for annotation layers
  const attributeNames = new Set<string>();
  for (const w of words) {
    for (const attr of w.attributes) {
      if (attr.name !== 'xml:id') {
        attributeNames.add(attr.name);
      }
    }
  }

  // Build preview rows
  for (const s of sentences) {
    if (rows.length < 10) {
      const id = s.getAttribute('xml:id') ?? s.getAttribute('n') ?? '';
      rows.push(['<s>', id ? `xml:id="${id}"` : '', '(sentence container)']);
    }
  }
  for (const w of words) {
    if (rows.length < 10) {
      const attrs = Array.from(w.attributes)
        .filter((a) => a.name !== 'xml:id')
        .map((a) => `${a.name}="${a.value}"`)
        .join(' ');
      rows.push(['<w>', attrs, w.textContent ?? '']);
    }
  }

  const sentenceCount = sentences.length || 1;

  return {
    columns,
    rows,
    counts: {
      expressions: sentenceCount,
      segmentations: sentenceCount,
      layers: attributeNames.size * sentenceCount,
    },
  };
}

/**
 * Parses Praat TextGrid format.
 *
 * Looks for "intervals" and "points" sections and counts items per tier.
 */
function parsePraat(content: string): ParsedPreview {
  const lines = content.split('\n');
  const columns = ['Tier', 'Type', 'Start', 'End', 'Text'];
  const rows: string[][] = [];

  let currentTierName = '';
  let currentTierType = '';
  let tierCount = 0;

  // Temporary state for interval/point parsing
  let xmin = '';
  let xmax = '';

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? '').trim();

    // Detect tier name
    const nameMatch = line.match(/name\s*=\s*"(.+)"/);
    if (nameMatch) {
      currentTierName = nameMatch[1] ?? '';
      tierCount++;
    }

    // Detect tier type (IntervalTier or TextTier)
    const classMatch = line.match(/class\s*=\s*"(.+)"/);
    if (classMatch) {
      currentTierType = (classMatch[1] ?? '').includes('Text') ? 'point' : 'interval';
    }

    // Parse interval or point xmin/xmax/text
    const xminMatch = line.match(/xmin\s*=\s*(.+)/);
    if (xminMatch) {
      xmin = (xminMatch[1] ?? '').trim();
    }

    const xmaxMatch = line.match(/xmax\s*=\s*(.+)/);
    if (xmaxMatch) {
      xmax = (xmaxMatch[1] ?? '').trim();
    }

    // "number" for point tiers
    const numberMatch = line.match(/number\s*=\s*(.+)/);
    if (numberMatch) {
      xmin = (numberMatch[1] ?? '').trim();
      xmax = '-';
    }

    // Extract text/mark values
    const textMatch = line.match(/(?:text|mark|value)\s*=\s*"(.*)"/);
    if (textMatch) {
      const text = textMatch[1] ?? '';
      // Only count non-empty items as actual data
      if (text.trim()) {
        if (rows.length < 10) {
          rows.push([currentTierName, currentTierType, xmin, xmax, text]);
        }
      }
    }
  }

  return {
    columns,
    rows,
    counts: {
      expressions: 1,
      segmentations: tierCount,
      layers: tierCount,
    },
  };
}

/**
 * Parses an annotation file based on the detected format.
 *
 * @param content - the file content as a string
 * @param format - the detected format name
 * @returns parsed preview data with columns, rows, and record count estimates
 */
function parseFileContent(content: string, format: string): ParsedPreview {
  switch (format) {
    case 'CoNLL-U':
    case 'CoNLL-2003':
      return parseConllU(content);
    case 'BRAT':
    case 'BRAT (text)':
      return parseBrat(content);
    case 'ELAN':
      return parseElan(content);
    case 'TEI XML':
      return parseTei(content);
    case 'Praat TextGrid':
      return parsePraat(content);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

export type { ParsedPreview };
export { readFileAsText, parseFileContent };
