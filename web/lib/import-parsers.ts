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
 * Information about a single tier in a time-aligned annotation file.
 */
interface TierInfo {
  name: string;
  type: 'interval' | 'point' | 'alignable' | 'ref';
  linguisticType?: string;
  parentTier?: string;
  controlledVocabulary?: string;
  annotationCount: number;
}

/**
 * Format-specific metadata extracted during parsing.
 */
interface PreviewMetadata {
  /** Total duration in seconds. */
  duration?: number;
  /** Number of tiers in the file. */
  tierCount?: number;
  /** Referenced media file URL (ELAN). */
  mediaUrl?: string;
  /** MIME type of referenced media (ELAN). */
  mediaMimeType?: string;
  /** Tier structure with parent refs and annotation counts. */
  tierHierarchy?: TierInfo[];
}

/**
 * Parsed preview data from an annotation file.
 */
interface ParsedPreview {
  columns: string[];
  rows: string[][];
  counts: { expressions: number; segmentations: number; layers: number };
  metadata?: PreviewMetadata;
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
 * Extracts tiers with their annotation children, tier hierarchy via
 * PARENT_REF attributes, linguistic types with constraint info, controlled
 * vocabularies, separate alignable/ref annotation counts, and media
 * descriptors.
 */
function parseElan(content: string): ParsedPreview {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid ELAN XML: ' + (parseError.textContent ?? 'parse error'));
  }

  const columns = ['Tier', 'Ann. Type', 'Start (ms)', 'End (ms)', 'Value'];
  const rows: string[][] = [];
  const tiers = doc.querySelectorAll('TIER');

  // Build a map of time slot IDs to time values
  const timeSlots = new Map<string, string>();
  const timeSlotElements = doc.querySelectorAll('TIME_SLOT');
  let maxTimeValue = 0;
  for (const slot of timeSlotElements) {
    const id = slot.getAttribute('TIME_SLOT_ID') ?? '';
    const value = slot.getAttribute('TIME_VALUE') ?? '';
    timeSlots.set(id, value);
    const numValue = Number(value);
    if (!Number.isNaN(numValue) && numValue > maxTimeValue) {
      maxTimeValue = numValue;
    }
  }

  // Build linguistic type lookup: type ID -> { constraint, cvRef }
  const linguisticTypes = new Map<string, { constraint?: string; cvRef?: string }>();
  const ltElements = doc.querySelectorAll('LINGUISTIC_TYPE');
  for (const lt of ltElements) {
    const ltId = lt.getAttribute('LINGUISTIC_TYPE_ID') ?? '';
    const constraint = lt.getAttribute('CONSTRAINTS') ?? undefined;
    const cvRef = lt.getAttribute('CONTROLLED_VOCABULARY_REF') ?? undefined;
    linguisticTypes.set(ltId, { constraint, cvRef });
  }

  // Collect known controlled vocabulary IDs
  const controlledVocabs = new Set<string>();
  const cvElements = doc.querySelectorAll('CONTROLLED_VOCABULARY');
  for (const cv of cvElements) {
    const cvId = cv.getAttribute('CV_ID') ?? '';
    if (cvId) controlledVocabs.add(cvId);
  }

  // Extract the first media descriptor for URL and MIME type
  let mediaUrl: string | undefined;
  let mediaMimeType: string | undefined;
  const mediaDescriptors = doc.querySelectorAll('MEDIA_DESCRIPTOR');
  if (mediaDescriptors.length > 0) {
    const firstMedia = mediaDescriptors[0];
    if (firstMedia) {
      mediaUrl =
        firstMedia.getAttribute('MEDIA_URL') ??
        firstMedia.getAttribute('RELATIVE_MEDIA_URL') ??
        undefined;
      mediaMimeType = firstMedia.getAttribute('MIME_TYPE') ?? undefined;
    }
  }

  // Parse tiers and build hierarchy info
  const tierInfoList: TierInfo[] = [];

  for (const tier of tiers) {
    const tierId = tier.getAttribute('TIER_ID') ?? '(unnamed)';
    const parentRef = tier.getAttribute('PARENT_REF') ?? undefined;
    const ltRef = tier.getAttribute('LINGUISTIC_TYPE_REF') ?? '';
    const ltInfo = linguisticTypes.get(ltRef);

    const alignableAnnotations = tier.querySelectorAll('ALIGNABLE_ANNOTATION');
    const refAnnotations = tier.querySelectorAll('REF_ANNOTATION');
    const alignableCount = alignableAnnotations.length;
    const refCount = refAnnotations.length;

    // Determine tier type from annotations present, or from linguistic type constraint
    let tierType: TierInfo['type'];
    if (alignableCount > 0 && refCount === 0) {
      tierType = 'alignable';
    } else if (refCount > 0 && alignableCount === 0) {
      tierType = 'ref';
    } else if (alignableCount > 0) {
      tierType = 'alignable';
    } else {
      const constraint = ltInfo?.constraint;
      tierType =
        constraint === 'SYMBOLIC_SUBDIVISION' || constraint === 'SYMBOLIC_ASSOCIATION'
          ? 'ref'
          : 'alignable';
    }

    // Resolve controlled vocabulary: use the CV from the linguistic type
    // only if it actually exists in the file's CV definitions
    const cvRef = ltInfo?.cvRef;
    const resolvedCv = cvRef && controlledVocabs.has(cvRef) ? cvRef : undefined;

    tierInfoList.push({
      name: tierId,
      type: tierType,
      linguisticType: ltRef || undefined,
      parentTier: parentRef,
      controlledVocabulary: resolvedCv,
      annotationCount: alignableCount + refCount,
    });

    // Build preview rows from alignable annotations
    for (const ann of alignableAnnotations) {
      const ts1 = ann.getAttribute('TIME_SLOT_REF1') ?? '';
      const ts2 = ann.getAttribute('TIME_SLOT_REF2') ?? '';
      const start = timeSlots.get(ts1) ?? ts1;
      const end = timeSlots.get(ts2) ?? ts2;
      const value = ann.querySelector('ANNOTATION_VALUE')?.textContent ?? '';

      if (rows.length < 10) {
        rows.push([tierId, 'alignable', start, end, value]);
      }
    }

    // Build preview rows from reference annotations
    for (const ann of refAnnotations) {
      const value = ann.querySelector('ANNOTATION_VALUE')?.textContent ?? '';
      if (rows.length < 10) {
        rows.push([tierId, 'ref', '-', '-', value]);
      }
    }
  }

  const duration = maxTimeValue > 0 ? maxTimeValue / 1000 : undefined;

  return {
    columns,
    rows,
    counts: {
      expressions: 1,
      segmentations: tiers.length,
      layers: tiers.length,
    },
    metadata: {
      duration,
      tierCount: tiers.length,
      mediaUrl,
      mediaMimeType,
      tierHierarchy: tierInfoList.length > 0 ? tierInfoList : undefined,
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

// ---------------------------------------------------------------------------
// Praat TextGrid parsing
// ---------------------------------------------------------------------------

/**
 * Detects whether a TextGrid string uses the "short" positional format.
 *
 * The short format has no "key = value" assignments after the header lines.
 * Detection works by checking whether non-header lines contain "=" signs.
 */
function isShortTextGrid(content: string): boolean {
  const lines = content.split('\n');
  let nonHeaderAssignments = 0;
  let nonHeaderPlain = 0;
  // Skip header lines (File type, Object class, possible blank)
  for (let i = 3; i < Math.min(lines.length, 20); i++) {
    const line = (lines[i] ?? '').trim();
    if (line === '') continue;
    if (line.includes('=')) {
      nonHeaderAssignments++;
    } else {
      nonHeaderPlain++;
    }
  }
  return nonHeaderAssignments === 0 && nonHeaderPlain > 0;
}

/**
 * Extracts a quoted string from a TextGrid value, handling multi-line text.
 *
 * Praat text values are delimited by double quotes and may span multiple
 * lines. The closing quote is always the last `"` on the final line of
 * the value.
 *
 * @param lines - all lines of the file
 * @param startIdx - the index of the line containing the opening quote
 * @returns a tuple of [extracted text, index of the last line consumed]
 */
function extractQuotedText(lines: string[], startIdx: number): [string, number] {
  const firstLine = lines[startIdx] ?? '';
  const quoteStart = firstLine.indexOf('"');
  if (quoteStart === -1) {
    return ['', startIdx];
  }

  const afterOpen = firstLine.substring(quoteStart + 1);
  // Check if the closing quote is on the same line
  const closeIdx = afterOpen.lastIndexOf('"');
  if (closeIdx !== -1) {
    return [afterOpen.substring(0, closeIdx), startIdx];
  }

  // Multi-line: accumulate until we find a line containing a closing quote
  const parts: string[] = [afterOpen];
  let idx = startIdx + 1;
  while (idx < lines.length) {
    const line = lines[idx] ?? '';
    const lineCloseIdx = line.lastIndexOf('"');
    if (lineCloseIdx !== -1) {
      parts.push(line.substring(0, lineCloseIdx));
      return [parts.join('\n'), idx];
    }
    parts.push(line);
    idx++;
  }
  // Unterminated string; return what we collected
  return [parts.join('\n'), idx - 1];
}

/**
 * Parses a Praat TextGrid in the "short" positional format.
 *
 * The short format encodes values one per line without key names:
 *   File type = "ooTextFile"
 *   Object class = "TextGrid"
 *   (blank)
 *   xmin
 *   xmax
 *   <exists>
 *   tierCount
 *   Then for each tier:
 *     "IntervalTier" or "TextTier"
 *     "tierName"
 *     tierXmin
 *     tierXmax
 *     itemCount
 *     Then per item: interval has xmin, xmax, "text"; point has number, "text"
 */
function parsePraatShort(content: string): ParsedPreview {
  const lines = content.split('\n');
  const columns = ['Tier', 'Type', 'Start', 'End', 'Text'];
  const rows: string[][] = [];
  const tierInfoList: TierInfo[] = [];

  // Skip header lines that contain "="
  let idx = 0;
  while (idx < lines.length && (lines[idx] ?? '').includes('=')) {
    idx++;
  }
  // Skip blank lines after header
  while (idx < lines.length && (lines[idx] ?? '').trim() === '') {
    idx++;
  }

  // Root xmin and xmax
  const rootXmin = parseFloat((lines[idx] ?? '').trim());
  idx++;
  const rootXmax = parseFloat((lines[idx] ?? '').trim());
  idx++;
  const duration = !isNaN(rootXmax) && !isNaN(rootXmin) ? rootXmax - rootXmin : undefined;

  // <exists> flag
  idx++;

  // Tier count
  const tierCount = parseInt((lines[idx] ?? '').trim(), 10);
  idx++;

  for (let t = 0; t < tierCount && idx < lines.length; t++) {
    // Tier type (quoted): "IntervalTier" or "TextTier"
    const tierTypeLine = (lines[idx] ?? '').trim().replace(/"/g, '');
    const isInterval = tierTypeLine === 'IntervalTier';
    idx++;

    // Tier name (quoted)
    const tierName = (lines[idx] ?? '').trim().replace(/"/g, '');
    idx++;

    // Tier xmin, xmax (skip)
    idx++;
    idx++;

    // Item count
    const itemCount = parseInt((lines[idx] ?? '').trim(), 10);
    idx++;

    let nonEmptyCount = 0;

    for (let n = 0; n < itemCount && idx < lines.length; n++) {
      if (isInterval) {
        const iXmin = (lines[idx] ?? '').trim();
        idx++;
        const iXmax = (lines[idx] ?? '').trim();
        idx++;
        const [text, lastIdx] = extractQuotedText(lines, idx);
        idx = lastIdx + 1;

        if (text.trim()) {
          nonEmptyCount++;
          if (rows.length < 10) {
            rows.push([tierName, 'interval', iXmin, iXmax, text]);
          }
        }
      } else {
        // TextTier: number, "text"
        const pointTime = (lines[idx] ?? '').trim();
        idx++;
        const [text, lastIdx] = extractQuotedText(lines, idx);
        idx = lastIdx + 1;

        if (text.trim()) {
          nonEmptyCount++;
          if (rows.length < 10) {
            rows.push([tierName, 'point', pointTime, '-', text]);
          }
        }
      }
    }

    tierInfoList.push({
      name: tierName,
      type: isInterval ? 'interval' : 'point',
      annotationCount: nonEmptyCount,
    });
  }

  return {
    columns,
    rows,
    counts: {
      expressions: 1,
      segmentations: tierCount,
      layers: tierCount,
    },
    metadata: {
      duration,
      tierCount,
      tierHierarchy: tierInfoList.length > 0 ? tierInfoList : undefined,
    },
  };
}

/**
 * Parses Praat TextGrid in the "normal" (verbose) key=value format.
 *
 * Handles multi-line text values and extracts tier metadata including
 * tier count, total duration, tier types, and non-empty annotation counts
 * per tier.
 */
function parsePraatNormal(content: string): ParsedPreview {
  const lines = content.split('\n');
  const columns = ['Tier', 'Type', 'Start', 'End', 'Text'];
  const rows: string[][] = [];
  const tierInfoList: TierInfo[] = [];

  let currentTierName = '';
  let currentTierType: 'interval' | 'point' = 'interval';
  let currentTierNonEmpty = 0;

  // Track root-level duration (xmin/xmax before any tier)
  let rootXmin: number | undefined;
  let rootXmax: number | undefined;
  let seenTier = false;
  let inItem = false;

  // Temporary state for the current interval/point
  let xmin = '';
  let xmax = '';

  let i = 0;
  while (i < lines.length) {
    const line = (lines[i] ?? '').trim();

    // Capture root-level xmin/xmax (before any tier class is encountered)
    if (!seenTier) {
      const rootXminMatch = line.match(/^xmin\s*=\s*(.+)/);
      if (rootXminMatch) {
        rootXmin = parseFloat((rootXminMatch[1] ?? '').trim());
      }
      const rootXmaxMatch = line.match(/^xmax\s*=\s*(.+)/);
      if (rootXmaxMatch) {
        rootXmax = parseFloat((rootXmaxMatch[1] ?? '').trim());
      }
    }

    // Detect tier class (IntervalTier or TextTier). This line appears
    // before the tier name, so we save the previous tier here.
    const classMatch = line.match(/class\s*=\s*"(.+)"/);
    if (classMatch) {
      if (seenTier) {
        tierInfoList.push({
          name: currentTierName,
          type: currentTierType,
          annotationCount: currentTierNonEmpty,
        });
      }
      seenTier = true;
      const classValue = classMatch[1] ?? '';
      currentTierType = classValue.includes('Text') ? 'point' : 'interval';
      currentTierNonEmpty = 0;
      currentTierName = '';
      inItem = false;
    }

    // Detect tier name
    const nameMatch = line.match(/name\s*=\s*"(.+)"/);
    if (nameMatch) {
      currentTierName = nameMatch[1] ?? '';
    }

    // Parse interval/point boundaries (only within tier items)
    if (seenTier) {
      const xminMatch = line.match(/xmin\s*=\s*(.+)/);
      if (xminMatch) {
        xmin = (xminMatch[1] ?? '').trim();
        inItem = true;
      }

      const xmaxMatch = line.match(/xmax\s*=\s*(.+)/);
      if (xmaxMatch) {
        xmax = (xmaxMatch[1] ?? '').trim();
      }
    }

    // "number" for point tiers
    const numberMatch = line.match(/number\s*=\s*(.+)/);
    if (numberMatch) {
      xmin = (numberMatch[1] ?? '').trim();
      xmax = '-';
      inItem = true;
    }

    // Extract text/mark values with multi-line support
    const textKeyMatch = line.match(/(?:text|mark|value)\s*=\s*/);
    if (textKeyMatch && inItem) {
      const [text, lastIdx] = extractQuotedText(lines, i);
      i = lastIdx;

      if (text.trim()) {
        currentTierNonEmpty++;
        if (rows.length < 10) {
          rows.push([currentTierName, currentTierType, xmin, xmax, text]);
        }
      }
      inItem = false;
    }

    i++;
  }

  // Save the last tier
  if (seenTier) {
    tierInfoList.push({
      name: currentTierName,
      type: currentTierType,
      annotationCount: currentTierNonEmpty,
    });
  }

  const tierCount = tierInfoList.length;
  const duration =
    rootXmax !== undefined && rootXmin !== undefined ? rootXmax - rootXmin : undefined;

  return {
    columns,
    rows,
    counts: {
      expressions: 1,
      segmentations: tierCount,
      layers: tierCount,
    },
    metadata: {
      duration,
      tierCount,
      tierHierarchy: tierInfoList.length > 0 ? tierInfoList : undefined,
    },
  };
}

/**
 * Parses Praat TextGrid format (both normal and short variants).
 *
 * Detects the format variant automatically and delegates to the
 * appropriate parser. Extracts tier metadata including tier count,
 * total duration, tier types (IntervalTier vs TextTier), and counts
 * of non-empty intervals per tier.
 */
function parsePraat(content: string): ParsedPreview {
  if (isShortTextGrid(content)) {
    return parsePraatShort(content);
  }
  return parsePraatNormal(content);
}

/**
 * Parses bead JSONLines format (.jsonl files with typed records).
 *
 * Each line is a JSON object with a `type` field: "entry", "template",
 * "filling", or "experiment". Preview rows show the type and key fields
 * from the first 10 records.
 */
function parseBeadJsonlines(content: string): ParsedPreview {
  const lines = content.split('\n').filter((line) => line.trim().length > 0);
  const columns = ['Type', 'Name/Form', 'Detail'];
  const rows: string[][] = [];

  let entryCount = 0;
  let templateCount = 0;
  let fillingCount = 0;
  let experimentCount = 0;

  for (const line of lines) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }

    const recordType = String(parsed['type'] ?? 'unknown');

    switch (recordType) {
      case 'entry': {
        entryCount++;
        const form = String(parsed['form'] ?? '');
        const lemma = parsed['lemma'] ? `lemma: ${String(parsed['lemma'])}` : '';
        if (rows.length < 10) {
          rows.push(['entry', form, lemma]);
        }
        break;
      }
      case 'template': {
        templateCount++;
        const name = String(parsed['name'] ?? '');
        const text = String(parsed['text'] ?? '').slice(0, 60);
        if (rows.length < 10) {
          rows.push(['template', name, text]);
        }
        break;
      }
      case 'filling': {
        fillingCount++;
        const templateRef = String(parsed['templateRef'] ?? '');
        const strategy = parsed['strategy'] ? `strategy: ${String(parsed['strategy'])}` : '';
        if (rows.length < 10) {
          rows.push(['filling', templateRef.slice(0, 40), strategy]);
        }
        break;
      }
      case 'experiment': {
        experimentCount++;
        const expName = String(parsed['name'] ?? '');
        const measureType = parsed['measureType'] ? String(parsed['measureType']) : '';
        if (rows.length < 10) {
          rows.push(['experiment', expName, measureType]);
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    columns,
    rows,
    counts: {
      expressions: entryCount,
      segmentations: 0,
      layers: templateCount + fillingCount + experimentCount,
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
    case 'Bead JSONLines':
      return parseBeadJsonlines(content);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

export type { ParsedPreview, PreviewMetadata, TierInfo };
export { readFileAsText, parseFileContent, parseBeadJsonlines };
