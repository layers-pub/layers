/**
 * Enrichment handler that detects the dominant language of expression text.
 *
 * Uses Unicode script analysis to identify the most likely language family
 * from the text's code point distribution. Updates the expression record
 * with the detected language in both PostgreSQL and Elasticsearch.
 *
 * @module
 */

import type { Client } from '@elastic/elasticsearch';
import type { Pool } from 'pg';

import { createLogger } from '../../../observability/logger.js';
import { DatabaseError } from '../../../types/errors.js';
import type { LayersError } from '../../../types/errors.js';
import type {
  EnrichmentJob,
  EnrichmentResult,
  IEnrichmentHandler,
} from '../../../types/interfaces/enrichment.interface.js';
import type { ILogger } from '../../../types/interfaces/logger.interface.js';
import { Err, Ok, type Result } from '../../../types/result.js';
import { pgPolicy } from '../../../utils/resilience.js';

/**
 * Configuration for constructing a {@link LanguageDetectionHandler}.
 */
interface LanguageDetectionHandlerConfig {
  readonly pgPool: Pool;
  readonly esClient: Client;
  readonly logger?: ILogger | undefined;
}

/**
 * Mapping from Unicode script names to default ISO 639-1 language codes.
 *
 * Each script maps to the most widely spoken language using that script.
 * Latin defaults to English; future iterations may refine this using
 * n-gram frequency analysis.
 */
const SCRIPT_TO_LANGUAGE: Readonly<Record<string, string>> = {
  Latin: 'en',
  Greek: 'el',
  Cyrillic: 'ru',
  Arabic: 'ar',
  Devanagari: 'hi',
  CJK: 'zh',
  Hiragana: 'ja',
  Katakana: 'ja',
  Hangul: 'ko',
  Hebrew: 'he',
  Thai: 'th',
  Georgian: 'ka',
  Armenian: 'hy',
  Ethiopic: 'am',
};

/**
 * Classifies a single Unicode code point into its script family.
 *
 * Returns `undefined` for whitespace, punctuation, digits, and code points
 * outside the recognized ranges.
 *
 * @param cp - the Unicode code point to classify
 * @returns the script name, or `undefined` if the code point is not a letter
 */
function classifyCodePoint(cp: number): string | undefined {
  // Basic Latin letters
  if ((cp >= 0x0041 && cp <= 0x005a) || (cp >= 0x0061 && cp <= 0x007a)) {
    return 'Latin';
  }
  // Extended Latin (Latin Extended-A and B)
  if (cp >= 0x00c0 && cp <= 0x024f) return 'Latin';
  // Greek and Coptic
  if (cp >= 0x0370 && cp <= 0x03ff) return 'Greek';
  // Cyrillic
  if (cp >= 0x0400 && cp <= 0x04ff) return 'Cyrillic';
  // Armenian
  if (cp >= 0x0530 && cp <= 0x058f) return 'Armenian';
  // Hebrew
  if (cp >= 0x0590 && cp <= 0x05ff) return 'Hebrew';
  // Arabic
  if (cp >= 0x0600 && cp <= 0x06ff) return 'Arabic';
  // Devanagari
  if (cp >= 0x0900 && cp <= 0x097f) return 'Devanagari';
  // Thai
  if (cp >= 0x0e00 && cp <= 0x0e7f) return 'Thai';
  // Georgian
  if (cp >= 0x10a0 && cp <= 0x10ff) return 'Georgian';
  // Ethiopic
  if (cp >= 0x1200 && cp <= 0x137f) return 'Ethiopic';
  // Hiragana
  if (cp >= 0x3040 && cp <= 0x309f) return 'Hiragana';
  // Katakana
  if (cp >= 0x30a0 && cp <= 0x30ff) return 'Katakana';
  // CJK Unified Ideographs
  if (cp >= 0x4e00 && cp <= 0x9fff) return 'CJK';
  // Hangul Syllables
  if (cp >= 0xac00 && cp <= 0xd7af) return 'Hangul';

  return undefined;
}

/**
 * Detects the dominant language of a text string using Unicode script analysis.
 *
 * Examines the distribution of Unicode code points across recognized script
 * ranges and returns the ISO 639-1 code for the most frequent script's
 * default language. Returns `'und'` (undetermined) when the text is empty,
 * contains only whitespace or punctuation, or has no recognized script
 * characters.
 *
 * @param text - the text to analyze
 * @returns an ISO 639-1 language code, or `'und'` for undetermined
 *
 * @example
 * ```typescript
 * detectLanguage('The cat sat on the mat.'); // 'en'
 * detectLanguage(''); // 'und'
 * ```
 */
function detectLanguage(text: string): string {
  if (!text || text.trim().length === 0) return 'und';

  const scriptCounts = new Map<string, number>();

  for (const char of text) {
    const cp = char.codePointAt(0);
    if (cp === undefined) continue;

    const script = classifyCodePoint(cp);
    if (script !== undefined) {
      scriptCounts.set(script, (scriptCounts.get(script) ?? 0) + 1);
    }
  }

  if (scriptCounts.size === 0) return 'und';

  let dominantScript = '';
  let maxCount = 0;
  for (const [script, count] of scriptCounts) {
    if (count > maxCount) {
      dominantScript = script;
      maxCount = count;
    }
  }

  return SCRIPT_TO_LANGUAGE[dominantScript] ?? 'und';
}

/**
 * Enrichment handler that detects the language of expression text.
 *
 * Receives an enrichment job with `type: 'languageDetection'` and the
 * expression's text in `data.text`. Runs Unicode script analysis, then
 * updates both the PostgreSQL `detected_language` column and the
 * Elasticsearch `detectedLanguage` field. Elasticsearch updates are
 * best-effort; failures are logged but do not cause the handler to
 * return an error.
 *
 * @example
 * ```typescript
 * const handler = new LanguageDetectionHandler({ pgPool, esClient });
 * const result = await handler.handle({
 *   type: 'languageDetection',
 *   uri: 'at://did:plc:abc/pub.layers.expression.expression/123',
 *   collection: 'pub.layers.expression.expression',
 *   data: { text: 'The cat sat on the mat.' },
 * });
 * ```
 */
class LanguageDetectionHandler implements IEnrichmentHandler {
  readonly type = 'languageDetection' as const;
  private readonly pgPool: Pool;
  private readonly esClient: Client;
  private readonly logger: ILogger;

  constructor(config: LanguageDetectionHandlerConfig) {
    this.pgPool = config.pgPool;
    this.esClient = config.esClient;
    this.logger = config.logger ?? createLogger({ service: 'language-detection-handler' });
  }

  /**
   * Detects the language of the expression text and persists the result.
   *
   * @param job - the enrichment job containing the expression URI and text
   * @returns the enrichment result with the detected language code
   */
  async handle(job: EnrichmentJob): Promise<Result<EnrichmentResult, LayersError>> {
    const { uri, data } = job;
    const textValue: unknown = data.text;
    const text = typeof textValue === 'string' ? textValue : '';

    const detected = detectLanguage(text);
    this.logger.debug('Language detected', { uri, detected });

    try {
      await pgPolicy.execute(async () => {
        await this.pgPool.query(
          'UPDATE expressions_index SET detected_language = $1 WHERE uri = $2',
          [detected, uri],
        );
      });

      // Elasticsearch update is best-effort; do not fail the handler on ES errors
      try {
        await this.esClient.update({
          index: 'expressions',
          id: uri,
          doc: { detectedLanguage: detected },
        });
      } catch (esErr: unknown) {
        this.logger.warn('ES update failed for language detection', {
          uri,
          error: esErr instanceof Error ? esErr.message : String(esErr),
        });
      }

      return Ok({
        type: 'languageDetection',
        uri,
        success: true,
        metadata: { detectedLanguage: detected },
      });
    } catch (err: unknown) {
      const dbError = new DatabaseError(
        `Language detection update failed for ${uri}`,
        err instanceof Error ? err : undefined,
      );
      this.logger.error('Language detection failed', { uri, error: dbError.message });
      return Err(dbError);
    }
  }
}

export { detectLanguage, LanguageDetectionHandler };
export type { LanguageDetectionHandlerConfig };
