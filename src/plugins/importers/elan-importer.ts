/**
 * ELAN XML format importer.
 *
 * Parses ELAN .eaf files containing tiers and annotations for
 * multimodal linguistic data. Uses regex-based XML extraction
 * to avoid adding an XML parser dependency.
 *
 * @module
 */

import { createLogger } from '../../observability/logger.js';
import { ValidationError } from '../../types/errors.js';
import type { LayersError } from '../../types/errors.js';
import type { IFormatImporter, ImportResult } from '../../types/interfaces/plugin.interface.js';
import { Err, Ok, type Result } from '../../types/result.js';

/**
 * A parsed ELAN tier with its annotations.
 */
interface ElanTier {
  readonly tierId: string;
  readonly linguisticType?: string | undefined;
  readonly participant?: string | undefined;
  readonly annotations: ElanAnnotation[];
}

/**
 * A parsed ELAN alignable annotation with time references.
 */
interface ElanAnnotation {
  readonly id: string;
  readonly timeSlotRef1: string;
  readonly timeSlotRef2: string;
  readonly value: string;
}

/**
 * Parses ELAN .eaf XML files into Layers records.
 *
 * Extracts tier definitions, time slot mappings, and alignable
 * annotations. Each tier becomes an annotation layer with temporal
 * span anchors derived from the time slot values.
 */
class ElanImporter implements IFormatImporter {
  readonly format = 'elan' as const;
  readonly name = 'ELAN Importer';
  readonly version = '1.0.0';
  private readonly logger = createLogger({ service: 'elan-importer' });

  validate(input: string): Result<void, LayersError> {
    if (!input || input.trim().length === 0) {
      return Err(new ValidationError('Input is empty'));
    }

    if (!input.includes('ANNOTATION_DOCUMENT')) {
      return Err(new ValidationError('Input does not contain an ANNOTATION_DOCUMENT root element'));
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

    // Extract time slots: <TIME_SLOT TIME_SLOT_ID="ts1" TIME_VALUE="0"/>
    const timeSlots = new Map<string, number>();
    const tsRegex = /<TIME_SLOT\s+TIME_SLOT_ID="([^"]+)"\s+TIME_VALUE="(\d+)"\s*\/?\s*>/g;
    let tsMatch: RegExpExecArray | null;
    while ((tsMatch = tsRegex.exec(input)) !== null) {
      const slotId = tsMatch[1];
      const value = tsMatch[2];
      if (slotId && value) {
        timeSlots.set(slotId, parseInt(value, 10));
      }
    }

    // Extract tiers
    const tiers = extractTiers(input);
    const annotationLayers: Record<string, unknown>[] = [];
    const expressions: Record<string, unknown>[] = [];

    for (const tier of tiers) {
      const annotations = tier.annotations.map((ann) => {
        const startMs = timeSlots.get(ann.timeSlotRef1);
        const endMs = timeSlots.get(ann.timeSlotRef2);

        return {
          id: ann.id,
          value: ann.value,
          anchor: {
            temporalSpan: {
              startMs: startMs ?? 0,
              endMs: endMs ?? 0,
            },
          },
        };
      });

      if (annotations.length > 0) {
        annotationLayers.push({
          kind: 'tier',
          subkind: tier.linguisticType ?? 'default',
          formalism: 'elan',
          tierId: tier.tierId,
          participant: tier.participant,
          annotations,
        });

        // Create expressions from annotation values
        for (const ann of tier.annotations) {
          if (ann.value.trim().length > 0) {
            expressions.push({
              text: ann.value,
              kind: 'utterance',
              sourceFormat: 'elan',
            });
          }
        }
      }
    }

    this.logger.debug('ELAN parsed', {
      tiers: tiers.length,
      timeSlots: timeSlots.size,
      annotationLayers: annotationLayers.length,
    });

    return Ok({
      format: 'elan',
      expressions,
      segmentations: [],
      annotationLayers,
      metadata: {
        tierCount: tiers.length,
        timeSlotCount: timeSlots.size,
      },
    });
  }
}

/**
 * Extract tier definitions and their annotations from ELAN XML.
 *
 * @param xml - the raw ELAN XML string
 * @returns array of parsed tiers
 */
function extractTiers(xml: string): ElanTier[] {
  const tiers: ElanTier[] = [];

  // Match TIER blocks: <TIER ... > ... </TIER>
  const tierRegex = /<TIER\s+([^>]*)>([\s\S]*?)<\/TIER>/g;
  let tierMatch: RegExpExecArray | null;

  while ((tierMatch = tierRegex.exec(xml)) !== null) {
    const attrs = tierMatch[1] ?? '';
    const content = tierMatch[2] ?? '';

    const tierId = extractAttr(attrs, 'TIER_ID') ?? '';
    const linguisticType = extractAttr(attrs, 'LINGUISTIC_TYPE_REF');
    const participant = extractAttr(attrs, 'PARTICIPANT');

    // Extract ALIGNABLE_ANNOTATION elements within the tier
    const annotations: ElanAnnotation[] = [];
    const annRegex =
      /<ALIGNABLE_ANNOTATION\s+ANNOTATION_ID="([^"]+)"\s+TIME_SLOT_REF1="([^"]+)"\s+TIME_SLOT_REF2="([^"]+)"\s*>\s*<ANNOTATION_VALUE>([\s\S]*?)<\/ANNOTATION_VALUE>\s*<\/ALIGNABLE_ANNOTATION>/g;
    let annMatch: RegExpExecArray | null;

    while ((annMatch = annRegex.exec(content)) !== null) {
      annotations.push({
        id: annMatch[1] ?? '',
        timeSlotRef1: annMatch[2] ?? '',
        timeSlotRef2: annMatch[3] ?? '',
        value: annMatch[4] ?? '',
      });
    }

    tiers.push({ tierId, linguisticType, participant, annotations });
  }

  return tiers;
}

/**
 * Extract an attribute value from an XML attribute string.
 *
 * @param attrs - the raw attribute string (e.g., `TIER_ID="default" PARTICIPANT="S1"`)
 * @param name - the attribute name to extract
 * @returns the attribute value, or undefined if not found
 */
function extractAttr(attrs: string, name: string): string | undefined {
  const match = new RegExp(`${name}="([^"]*)"`).exec(attrs);
  return match?.[1];
}

export { ElanImporter };
