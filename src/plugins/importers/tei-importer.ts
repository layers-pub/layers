/**
 * TEI XML format importer.
 *
 * Parses basic TEI XML files, extracting text content from body
 * elements and annotations from seg and interp elements. Uses
 * regex-based extraction to avoid an XML parser dependency.
 *
 * @module
 */

import { createLogger } from '../../observability/logger.js';
import { ValidationError } from '../../types/errors.js';
import type { LayersError } from '../../types/errors.js';
import type { IFormatImporter, ImportResult } from '../../types/interfaces/plugin.interface.js';
import { Err, Ok, type Result } from '../../types/result.js';

/**
 * Parses TEI XML files into Layers records.
 *
 * Extracts text from `<body>` elements, segments from `<seg>` elements,
 * and annotations from `<interp>` elements. This is a basic parser
 * covering common TEI patterns; it does not handle the full TEI
 * specification.
 */
class TeiImporter implements IFormatImporter {
  readonly format = 'tei' as const;
  readonly name = 'TEI XML Importer';
  readonly version = '1.0.0';
  private readonly logger = createLogger({ service: 'tei-importer' });

  validate(input: string): Result<void, LayersError> {
    if (!input || input.trim().length === 0) {
      return Err(new ValidationError('Input is empty'));
    }

    // TEI documents should contain TEI or teiCorpus root element
    if (!input.includes('<TEI') && !input.includes('<teiCorpus')) {
      return Err(new ValidationError('Input does not contain a TEI or teiCorpus root element'));
    }

    return Ok(undefined);
  }

  async parse(
    input: string,
    _options?: Record<string, unknown>,
  ): Promise<Result<ImportResult, LayersError>> {
    await Promise.resolve();

    const validation = this.validate(input);
    if (!validation.ok) {
      return Err(validation.error);
    }

    const expressions: Record<string, unknown>[] = [];
    const segmentations: Record<string, unknown>[] = [];
    const annotationLayers: Record<string, unknown>[] = [];

    // Extract text from <body> ... </body>
    const bodyRegex = /<body[^>]*>([\s\S]*?)<\/body>/g;
    let bodyMatch: RegExpExecArray | null;

    while ((bodyMatch = bodyRegex.exec(input)) !== null) {
      const bodyContent = bodyMatch[1] ?? '';

      // Extract <p> or <s> elements as expressions
      const sentenceRegex = /<(?:p|s|ab)\b[^>]*>([\s\S]*?)<\/(?:p|s|ab)>/g;
      let sentMatch: RegExpExecArray | null;

      while ((sentMatch = sentenceRegex.exec(bodyContent)) !== null) {
        const rawText = sentMatch[1] ?? '';
        const cleanText = stripTags(rawText).trim();

        if (cleanText.length > 0) {
          expressions.push({
            text: cleanText,
            kind: 'sentence',
            sourceFormat: 'tei',
          });
        }

        // Extract <seg> elements as segments
        const segRegex = /<seg\b[^>]*>([\s\S]*?)<\/seg>/g;
        let segMatch: RegExpExecArray | null;
        const segments: Record<string, unknown>[] = [];

        while ((segMatch = segRegex.exec(rawText)) !== null) {
          const segText = stripTags(segMatch[1] ?? '').trim();
          if (segText.length > 0) {
            segments.push({ text: segText });
          }
        }

        if (segments.length > 0) {
          segmentations.push({
            strategy: 'segment',
            segments,
            segmentCount: segments.length,
          });
        }
      }
    }

    // Extract <interp> elements as annotations
    const interpAnnotations: Record<string, unknown>[] = [];
    const interpRegex = /<interp\b([^>]*)(?:\/>|>([\s\S]*?)<\/interp>)/g;
    let interpMatch: RegExpExecArray | null;

    while ((interpMatch = interpRegex.exec(input)) !== null) {
      const attrs = interpMatch[1] ?? '';
      const content = interpMatch[2] ?? '';

      const type = extractAttr(attrs, 'type');
      const value = extractAttr(attrs, 'value') ?? content.trim();
      const xmlId = extractAttr(attrs, 'xml:id');

      if (type || value) {
        interpAnnotations.push({
          id: xmlId,
          label: value,
          type,
        });
      }
    }

    if (interpAnnotations.length > 0) {
      annotationLayers.push({
        kind: 'interpretation',
        subkind: 'interp',
        formalism: 'tei',
        annotations: interpAnnotations,
      });
    }

    this.logger.debug('TEI parsed', {
      expressions: expressions.length,
      segmentations: segmentations.length,
      annotationLayers: annotationLayers.length,
    });

    return Ok({
      format: 'tei',
      expressions,
      segmentations,
      annotationLayers,
      metadata: {
        expressionCount: expressions.length,
        segmentCount: segmentations.length,
      },
    });
  }
}

/**
 * Strip XML tags from a string, leaving only text content.
 *
 * @param text - XML string to strip
 * @returns the text content with tags removed
 */
function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

/**
 * Extract an attribute value from an XML attribute string.
 *
 * @param attrs - the raw attribute string
 * @param name - the attribute name to extract
 * @returns the attribute value, or undefined if not found
 */
function extractAttr(attrs: string, name: string): string | undefined {
  const match = new RegExp(`${name}="([^"]*)"`).exec(attrs);
  return match?.[1];
}

export { TeiImporter };
