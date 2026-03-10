/**
 * ELAN XML format importer.
 *
 * Parses ELAN .eaf files containing tiers and annotations for
 * multimodal linguistic data. Supports both ALIGNABLE_ANNOTATION
 * (time-aligned) and REF_ANNOTATION (symbolic reference) elements,
 * linguistic type constraints, controlled vocabularies, and media
 * descriptors. Uses regex-based XML extraction to avoid adding an
 * XML parser dependency.
 *
 * @module
 */

import { createLogger } from '../../observability/logger.js';
import { PluginError, ValidationError } from '../../types/errors.js';
import type { LayersError } from '../../types/errors.js';
import type { IFormatImporter, ImportResult } from '../../types/interfaces/plugin.interface.js';
import { Err, Ok, type Result } from '../../types/result.js';

/**
 * A parsed ELAN linguistic type with its constraints.
 */
interface ElanLinguisticType {
  readonly id: string;
  readonly timeAlignable: boolean;
  readonly constraint?: string | undefined;
  readonly controlledVocabularyRef?: string | undefined;
}

/**
 * A controlled vocabulary entry from an ELAN file.
 */
interface ElanCVEntry {
  readonly id: string;
  readonly value: string;
  readonly description?: string | undefined;
  readonly langRef?: string | undefined;
}

/**
 * A controlled vocabulary definition from an ELAN file.
 */
interface ElanControlledVocabulary {
  readonly id: string;
  readonly entries: readonly ElanCVEntry[];
}

/**
 * A media descriptor from an ELAN file.
 */
interface ElanMediaDescriptor {
  readonly mediaUrl: string;
  readonly mimeType?: string | undefined;
  readonly relativeMediaUrl?: string | undefined;
}

/**
 * A parsed ELAN tier with its annotations.
 */
interface ElanTier {
  readonly tierId: string;
  readonly linguisticType?: string | undefined;
  readonly participant?: string | undefined;
  readonly parentRef?: string | undefined;
  readonly alignableAnnotations: ElanAlignableAnnotation[];
  readonly refAnnotations: ElanRefAnnotation[];
}

/**
 * A parsed ELAN alignable annotation with time references.
 */
interface ElanAlignableAnnotation {
  readonly id: string;
  readonly timeSlotRef1: string;
  readonly timeSlotRef2: string;
  readonly value: string;
}

/**
 * A parsed ELAN reference annotation that refers to another annotation.
 */
interface ElanRefAnnotation {
  readonly id: string;
  readonly annotationRef: string;
  readonly value: string;
}

/**
 * Parses ELAN .eaf XML files into Layers records.
 *
 * Extracts tier definitions, time slot mappings, alignable annotations,
 * reference annotations, linguistic types with constraints, controlled
 * vocabularies, and media descriptors. Each tier becomes an annotation
 * layer: time-aligned tiers use temporal span anchors, and reference
 * tiers use tokenRef anchors pointing to the parent annotation.
 *
 * Temporal values are normalized from ELAN's native milliseconds to
 * seconds for consistency with other importers.
 */
class ElanImporter implements IFormatImporter {
  readonly format = 'elan' as const;
  readonly name = 'ELAN Importer';
  readonly version = '2.0.0';
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

    try {
      return Ok(this.parseInternal(input));
    } catch (err) {
      return Err(
        new PluginError(
          this.name,
          'import',
          err instanceof Error ? err.message : 'Unknown parse error',
          err instanceof Error ? err : undefined,
        ),
      );
    }
  }

  /**
   * Internal parse logic separated for cleaner error handling.
   */
  private parseInternal(input: string): ImportResult {
    // Extract time slots: <TIME_SLOT TIME_SLOT_ID="ts1" TIME_VALUE="0"/>
    const timeSlots = extractTimeSlots(input);

    // Extract linguistic types
    const linguisticTypes = extractLinguisticTypes(input);

    // Extract controlled vocabularies
    const controlledVocabularies = extractControlledVocabularies(input);

    // Extract media descriptors
    const mediaDescriptors = extractMediaDescriptors(input);

    // Extract tiers
    const tiers = extractTiers(input);
    const annotationLayers: Record<string, unknown>[] = [];
    const expressions: Record<string, unknown>[] = [];

    // Build a CV lookup by linguistic type ref
    const cvByLinguisticType = new Map<string, ElanControlledVocabulary>();
    for (const lt of linguisticTypes) {
      if (lt.controlledVocabularyRef) {
        const cv = controlledVocabularies.find((c) => c.id === lt.controlledVocabularyRef);
        if (cv) {
          cvByLinguisticType.set(lt.id, cv);
        }
      }
    }

    for (const tier of tiers) {
      // Look up the linguistic type for this tier
      const lt = linguisticTypes.find((t) => t.id === tier.linguisticType);
      const cv = tier.linguisticType ? cvByLinguisticType.get(tier.linguisticType) : undefined;

      // Build layer metadata
      const layerMetadata: Record<string, unknown> = {};
      if (lt) {
        layerMetadata.linguisticType = lt.id;
        if (lt.constraint) {
          layerMetadata.constraint = lt.constraint;
        }
      }
      if (cv) {
        layerMetadata.allowedValues = cv.entries.map((entry) => ({
          value: entry.value,
          description: entry.description,
          langRef: entry.langRef,
        }));
      }

      // Process alignable annotations (time-aligned)
      if (tier.alignableAnnotations.length > 0) {
        const annotations = tier.alignableAnnotations.map((ann) => {
          const startMs = timeSlots.get(ann.timeSlotRef1);
          const endMs = timeSlots.get(ann.timeSlotRef2);

          return {
            id: ann.id,
            value: ann.value,
            anchor: {
              temporalSpan: {
                startSeconds: (startMs ?? 0) / 1000,
                endSeconds: (endMs ?? 0) / 1000,
              },
            },
          };
        });

        annotationLayers.push({
          kind: 'tier',
          subkind: tier.linguisticType ?? 'default',
          formalism: 'elan',
          tierId: tier.tierId,
          participant: tier.participant,
          parentRef: tier.parentRef,
          annotations,
          ...(Object.keys(layerMetadata).length > 0 ? { metadata: layerMetadata } : {}),
        });

        // Create expressions from annotation values
        for (const ann of tier.alignableAnnotations) {
          if (ann.value.trim().length > 0) {
            expressions.push({
              text: ann.value,
              kind: 'utterance',
              sourceFormat: 'elan',
            });
          }
        }
      }

      // Process ref annotations (symbolic references to parent annotations)
      if (tier.refAnnotations.length > 0) {
        const annotations = tier.refAnnotations.map((ann) => ({
          id: ann.id,
          value: ann.value,
          annotationRef: ann.annotationRef,
          anchor: {
            tokenRef: {
              annotationId: ann.annotationRef,
            },
          },
        }));

        annotationLayers.push({
          kind: 'token-tag',
          subkind: tier.linguisticType ?? 'default',
          formalism: 'elan',
          tierId: tier.tierId,
          participant: tier.participant,
          parentRef: tier.parentRef,
          annotations,
          ...(Object.keys(layerMetadata).length > 0 ? { metadata: layerMetadata } : {}),
        });

        // Create expressions from ref annotation values
        for (const ann of tier.refAnnotations) {
          if (ann.value.trim().length > 0) {
            expressions.push({
              text: ann.value,
              kind: 'annotation-value',
              sourceFormat: 'elan',
            });
          }
        }
      }
    }

    // Build result metadata
    const metadata: Record<string, unknown> = {
      tierCount: tiers.length,
      timeSlotCount: timeSlots.size,
    };

    if (linguisticTypes.length > 0) {
      metadata.linguisticTypes = linguisticTypes.map((lt) => ({
        id: lt.id,
        timeAlignable: lt.timeAlignable,
        constraint: lt.constraint,
      }));
    }

    if (controlledVocabularies.length > 0) {
      metadata.controlledVocabularies = controlledVocabularies.map((cv) => ({
        id: cv.id,
        entryCount: cv.entries.length,
      }));
    }

    if (mediaDescriptors.length > 0) {
      metadata.mediaDescriptors = mediaDescriptors.map((md) => ({
        mediaUrl: md.mediaUrl,
        mimeType: md.mimeType,
        relativeMediaUrl: md.relativeMediaUrl,
      }));
    }

    this.logger.debug('ELAN parsed', {
      tiers: tiers.length,
      timeSlots: timeSlots.size,
      annotationLayers: annotationLayers.length,
      linguisticTypes: linguisticTypes.length,
      controlledVocabularies: controlledVocabularies.length,
      mediaDescriptors: mediaDescriptors.length,
    });

    return {
      format: 'elan',
      expressions,
      segmentations: [],
      annotationLayers,
      metadata,
    };
  }
}

/**
 * Extract time slot mappings from ELAN XML.
 *
 * @param xml - the raw ELAN XML string
 * @returns map of time slot ID to millisecond value
 */
function extractTimeSlots(xml: string): Map<string, number> {
  const timeSlots = new Map<string, number>();
  const tsRegex = /<TIME_SLOT\s+TIME_SLOT_ID="([^"]+)"\s+TIME_VALUE="(\d+)"\s*\/?\s*>/g;
  let tsMatch: RegExpExecArray | null;
  while ((tsMatch = tsRegex.exec(xml)) !== null) {
    const slotId = tsMatch[1];
    const value = tsMatch[2];
    if (slotId && value) {
      timeSlots.set(slotId, parseInt(value, 10));
    }
  }
  return timeSlots;
}

/**
 * Extract linguistic type definitions from ELAN XML.
 *
 * @param xml - the raw ELAN XML string
 * @returns array of linguistic type definitions
 */
function extractLinguisticTypes(xml: string): ElanLinguisticType[] {
  const types: ElanLinguisticType[] = [];
  const ltRegex = /<LINGUISTIC_TYPE\s+([^>]*?)\/?\s*>/g;
  let ltMatch: RegExpExecArray | null;

  while ((ltMatch = ltRegex.exec(xml)) !== null) {
    const attrs = ltMatch[1] ?? '';
    const id = extractAttr(attrs, 'LINGUISTIC_TYPE_ID');
    if (!id) continue;

    const timeAlignableStr = extractAttr(attrs, 'TIME_ALIGNABLE');
    const constraint = extractAttr(attrs, 'CONSTRAINTS');
    const cvRef = extractAttr(attrs, 'CONTROLLED_VOCABULARY_REF');

    types.push({
      id,
      timeAlignable: timeAlignableStr !== 'false',
      constraint,
      controlledVocabularyRef: cvRef,
    });
  }

  return types;
}

/**
 * Extract controlled vocabulary definitions from ELAN XML.
 *
 * Handles both the modern CV_ENTRY_ML format (with CVE_VALUE sub-elements)
 * and the legacy CV_ENTRY format (with inline text).
 *
 * @param xml - the raw ELAN XML string
 * @returns array of controlled vocabulary definitions
 */
function extractControlledVocabularies(xml: string): ElanControlledVocabulary[] {
  const vocabularies: ElanControlledVocabulary[] = [];
  const cvRegex = /<CONTROLLED_VOCABULARY\s+([^>]*)>([\s\S]*?)<\/CONTROLLED_VOCABULARY>/g;
  let cvMatch: RegExpExecArray | null;

  while ((cvMatch = cvRegex.exec(xml)) !== null) {
    const attrs = cvMatch[1] ?? '';
    const content = cvMatch[2] ?? '';
    const cvId = extractAttr(attrs, 'CV_ID');
    if (!cvId) continue;

    const entries: ElanCVEntry[] = [];

    // Modern format: CV_ENTRY_ML with CVE_VALUE children
    const mlRegex = /<CV_ENTRY_ML\s+CVE_ID="([^"]*)"[^>]*>([\s\S]*?)<\/CV_ENTRY_ML>/g;
    let mlMatch: RegExpExecArray | null;

    while ((mlMatch = mlRegex.exec(content)) !== null) {
      const entryId = mlMatch[1] ?? '';
      const entryContent = mlMatch[2] ?? '';

      // Extract CVE_VALUE elements
      const valueRegex = /<CVE_VALUE\s+([^>]*)>([\s\S]*?)<\/CVE_VALUE>/g;
      let valueMatch: RegExpExecArray | null;

      while ((valueMatch = valueRegex.exec(entryContent)) !== null) {
        const valueAttrs = valueMatch[1] ?? '';
        const value = valueMatch[2] ?? '';
        const langRef = extractAttr(valueAttrs, 'LANG_REF');
        const description = extractAttr(valueAttrs, 'DESCRIPTION');

        entries.push({
          id: entryId,
          value: value.trim(),
          description,
          langRef,
        });
      }
    }

    // Legacy format: CV_ENTRY with inline value
    if (entries.length === 0) {
      const legacyRegex = /<CV_ENTRY\s+([^>]*)>([\s\S]*?)<\/CV_ENTRY>/g;
      let legacyMatch: RegExpExecArray | null;

      while ((legacyMatch = legacyRegex.exec(content)) !== null) {
        const entryAttrs = legacyMatch[1] ?? '';
        const value = legacyMatch[2] ?? '';
        const entryId = extractAttr(entryAttrs, 'CVE_ID') ?? '';
        const description = extractAttr(entryAttrs, 'DESCRIPTION');

        entries.push({
          id: entryId,
          value: value.trim(),
          description,
        });
      }
    }

    vocabularies.push({ id: cvId, entries });
  }

  return vocabularies;
}

/**
 * Extract media descriptor elements from ELAN XML.
 *
 * @param xml - the raw ELAN XML string
 * @returns array of media descriptors
 */
function extractMediaDescriptors(xml: string): ElanMediaDescriptor[] {
  const descriptors: ElanMediaDescriptor[] = [];
  const mdRegex = /<MEDIA_DESCRIPTOR\s+([^>]*?)\/?\s*>/g;
  let mdMatch: RegExpExecArray | null;

  while ((mdMatch = mdRegex.exec(xml)) !== null) {
    const attrs = mdMatch[1] ?? '';
    const mediaUrl = extractAttr(attrs, 'MEDIA_URL');
    if (!mediaUrl) continue;

    descriptors.push({
      mediaUrl,
      mimeType: extractAttr(attrs, 'MIME_TYPE'),
      relativeMediaUrl: extractAttr(attrs, 'RELATIVE_MEDIA_URL'),
    });
  }

  return descriptors;
}

/**
 * Extract tier definitions and their annotations from ELAN XML.
 *
 * Parses both ALIGNABLE_ANNOTATION (time-aligned) and REF_ANNOTATION
 * (symbolic reference) elements within each tier.
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
    const parentRef = extractAttr(attrs, 'PARENT_REF');

    // Extract ALIGNABLE_ANNOTATION elements
    const alignableAnnotations: ElanAlignableAnnotation[] = [];
    const alignRegex =
      /<ALIGNABLE_ANNOTATION\s+ANNOTATION_ID="([^"]+)"\s+TIME_SLOT_REF1="([^"]+)"\s+TIME_SLOT_REF2="([^"]+)"\s*>\s*<ANNOTATION_VALUE>([\s\S]*?)<\/ANNOTATION_VALUE>\s*<\/ALIGNABLE_ANNOTATION>/g;
    let alignMatch: RegExpExecArray | null;

    while ((alignMatch = alignRegex.exec(content)) !== null) {
      alignableAnnotations.push({
        id: alignMatch[1] ?? '',
        timeSlotRef1: alignMatch[2] ?? '',
        timeSlotRef2: alignMatch[3] ?? '',
        value: alignMatch[4] ?? '',
      });
    }

    // Extract REF_ANNOTATION elements
    const refAnnotations: ElanRefAnnotation[] = [];
    const refRegex =
      /<REF_ANNOTATION\s+ANNOTATION_ID="([^"]+)"\s+ANNOTATION_REF="([^"]+)"\s*>\s*<ANNOTATION_VALUE>([\s\S]*?)<\/ANNOTATION_VALUE>\s*<\/REF_ANNOTATION>/g;
    let refMatch: RegExpExecArray | null;

    while ((refMatch = refRegex.exec(content)) !== null) {
      refAnnotations.push({
        id: refMatch[1] ?? '',
        annotationRef: refMatch[2] ?? '',
        value: refMatch[3] ?? '',
      });
    }

    tiers.push({
      tierId,
      linguisticType,
      participant,
      parentRef,
      alignableAnnotations,
      refAnnotations,
    });
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
