/**
 * CoNLL-U format importer.
 *
 * Parses CoNLL-U tab-separated annotation files into Layers
 * expression, segmentation, and annotation layer records.
 * Handles sentence boundaries, comment lines, and the standard
 * 10-column token format.
 *
 * @module
 */

import { createLogger } from '../../observability/logger.js';
import { ValidationError } from '../../types/errors.js';
import type { LayersError } from '../../types/errors.js';
import type { IFormatImporter, ImportResult } from '../../types/interfaces/plugin.interface.js';
import { Err, Ok, type Result } from '../../types/result.js';

/**
 * Parsed token from a single CoNLL-U data line.
 */
interface ConllToken {
  readonly id: string;
  readonly form: string;
  readonly lemma: string;
  readonly upos: string;
  readonly xpos: string;
  readonly feats: string;
  readonly head: string;
  readonly deprel: string;
  readonly deps: string;
  readonly misc: string;
}

/**
 * Parses CoNLL-U formatted text into Layers records.
 *
 * Supports the standard 10-column CoNLL-U format with `# text = ` and
 * `# sent_id = ` comment lines. Produces one expression per sentence,
 * with corresponding segmentation (tokens), POS annotation layer,
 * and dependency annotation layer.
 */
class ConllImporter implements IFormatImporter {
  readonly format = 'conll' as const;
  readonly name = 'CoNLL-U Importer';
  readonly version = '1.0.0';
  private readonly logger = createLogger({ service: 'conll-importer' });

  validate(input: string): Result<void, LayersError> {
    if (!input || input.trim().length === 0) {
      return Err(new ValidationError('Input is empty'));
    }

    const lines = input.trim().split('\n');
    const dataLines = lines.filter((l) => !l.startsWith('#') && l.trim().length > 0);

    if (dataLines.length === 0) {
      return Err(new ValidationError('No data lines found in CoNLL-U input'));
    }

    const firstLine = dataLines[0];
    if (firstLine) {
      const fields = firstLine.split('\t');
      if (fields.length < 2) {
        return Err(new ValidationError('CoNLL-U lines must have at least 2 tab-separated fields'));
      }
    }

    return Ok(undefined);
  }

  async parse(
    input: string,
    options?: Record<string, unknown>,
  ): Promise<Result<ImportResult, LayersError>> {
    await Promise.resolve();

    const validation = this.validate(input);
    if (!validation.ok) {
      return Err(validation.error);
    }

    const lines = input.trim().split('\n');
    const sentences: string[][] = [];
    let currentSentence: string[] = [];
    const sentenceTexts: string[] = [];
    let currentText = '';

    for (const line of lines) {
      if (line.startsWith('# text = ')) {
        currentText = line.slice(9);
      } else if (line.trim().length === 0) {
        if (currentSentence.length > 0) {
          sentences.push(currentSentence);
          sentenceTexts.push(
            currentText || currentSentence.map((t) => t.split('\t')[1] ?? '').join(' '),
          );
          currentSentence = [];
          currentText = '';
        }
      } else if (!line.startsWith('#')) {
        currentSentence.push(line);
      }
    }

    // Handle final sentence without trailing blank line
    if (currentSentence.length > 0) {
      sentences.push(currentSentence);
      sentenceTexts.push(
        currentText || currentSentence.map((t) => t.split('\t')[1] ?? '').join(' '),
      );
    }

    const expressions: Record<string, unknown>[] = [];
    const segmentations: Record<string, unknown>[] = [];
    const annotationLayers: Record<string, unknown>[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (!sentence) continue;

      const text = sentenceTexts[i] ?? '';

      expressions.push({
        text,
        kind: 'sentence',
        language: typeof options?.language === 'string' ? options.language : undefined,
        sourceFormat: 'conll-u',
      });

      const tokens = parseTokens(sentence);

      segmentations.push({
        strategy: 'token',
        tokens: tokens.map((t) => ({ form: t.form, lemma: t.lemma })),
        tokenCount: tokens.length,
      });

      // POS annotation layer
      const posAnnotations = tokens.map((t, idx) => ({
        label: t.upos === '_' ? undefined : t.upos,
        anchor: { tokenRef: { tokenIndex: idx } },
      }));

      annotationLayers.push({
        kind: 'pos',
        subkind: 'upos',
        formalism: 'Universal Dependencies',
        annotations: posAnnotations,
      });

      // Dependency relation annotation layer
      const depAnnotations = tokens
        .filter((t) => t.deprel !== '_' && t.deprel !== '')
        .map((t, idx) => ({
          label: t.deprel,
          anchor: { tokenRef: { tokenIndex: idx } },
          head: t.head,
        }));

      if (depAnnotations.length > 0) {
        annotationLayers.push({
          kind: 'dependency',
          subkind: 'ud',
          formalism: 'Universal Dependencies',
          annotations: depAnnotations,
        });
      }
    }

    this.logger.debug('CoNLL-U parsed', {
      sentences: sentences.length,
      expressions: expressions.length,
    });

    return Ok({
      format: 'conll',
      expressions,
      segmentations,
      annotationLayers,
      metadata: { sentenceCount: sentences.length },
    });
  }
}

/**
 * Parse an array of raw CoNLL-U lines into structured tokens.
 *
 * @param lines - raw tab-separated CoNLL-U data lines (no comments)
 * @returns array of parsed tokens
 */
function parseTokens(lines: string[]): ConllToken[] {
  return lines.map((line) => {
    const fields = line.split('\t');
    return {
      id: fields[0] ?? '',
      form: fields[1] ?? '',
      lemma: fields[2] ?? '_',
      upos: fields[3] ?? '_',
      xpos: fields[4] ?? '_',
      feats: fields[5] ?? '_',
      head: fields[6] ?? '_',
      deprel: fields[7] ?? '_',
      deps: fields[8] ?? '_',
      misc: fields[9] ?? '_',
    };
  });
}

export { ConllImporter };
