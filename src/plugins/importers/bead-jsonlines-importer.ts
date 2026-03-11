/**
 * Bead JSONLines format importer.
 *
 * Parses JSONLines files containing bead entries, templates, fillings,
 * and experiment definitions into Layers resource and judgment records.
 * Each line is a JSON object with a `type` discriminator field.
 *
 * @module
 */

import { createLogger } from '../../observability/logger.js';
import { ValidationError } from '../../types/errors.js';
import type { LayersError } from '../../types/errors.js';
import type { IFormatImporter, ImportResult } from '../../types/interfaces/plugin.interface.js';
import { Err, Ok, type Result } from '../../types/result.js';

/**
 * Valid bead record type discriminators.
 */
const BEAD_TYPES = new Set(['entry', 'template', 'filling', 'experiment']);

/**
 * Parsed bead entry from a JSONLines row with type "entry".
 */
interface BeadEntry {
  readonly type: 'entry';
  readonly form: string;
  readonly lemma?: string | undefined;
  readonly language?: string | undefined;
  readonly features?: Record<string, string> | undefined;
  readonly knowledgeRefs?: readonly BeadKnowledgeRef[] | undefined;
}

/**
 * Parsed bead template from a JSONLines row with type "template".
 */
interface BeadTemplate {
  readonly type: 'template';
  readonly name?: string | undefined;
  readonly text: string;
  readonly language?: string | undefined;
  readonly slots: readonly BeadSlot[];
  readonly constraints?: readonly string[] | undefined;
}

/**
 * Parsed bead filling from a JSONLines row with type "filling".
 */
interface BeadFilling {
  readonly type: 'filling';
  readonly templateRef: string;
  readonly slotFillings: Record<string, string>;
  readonly renderedText?: string | undefined;
  readonly strategy?: string | undefined;
}

/**
 * Parsed bead experiment definition from a JSONLines row with type "experiment".
 */
interface BeadExperiment {
  readonly type: 'experiment';
  readonly name: string;
  readonly description?: string | undefined;
  readonly measureType?: string | undefined;
  readonly taskType?: string | undefined;
  readonly scaleMin?: number | undefined;
  readonly scaleMax?: number | undefined;
  readonly labels?: readonly string[] | undefined;
}

/**
 * A slot definition in a bead template.
 */
interface BeadSlot {
  readonly name: string;
  readonly required?: boolean | undefined;
  readonly defaultValue?: string | undefined;
  readonly description?: string | undefined;
  readonly constraints?: readonly string[] | undefined;
}

/**
 * A knowledge reference in a bead entry.
 */
interface BeadKnowledgeRef {
  readonly source: string;
  readonly id: string;
  readonly label?: string | undefined;
}

/**
 * Union of all bead record shapes.
 */
type BeadRecord = BeadEntry | BeadTemplate | BeadFilling | BeadExperiment;

/**
 * Line-level validation error.
 */
interface LineError {
  readonly line: number;
  readonly message: string;
}

/**
 * Extracts the `type` field from a parsed JSON object safely.
 */
function extractType(obj: Record<string, unknown>): unknown {
  return obj.type;
}

/**
 * Parses bead JSONLines files into Layers resource and judgment records.
 *
 * Each line must be a valid JSON object with a `type` field set to
 * one of: "entry", "template", "filling", "experiment". Lines are
 * mapped to the corresponding Layers record types:
 * - entry -> pub.layers.resource.entry
 * - template -> pub.layers.resource.template
 * - filling -> pub.layers.resource.filling
 * - experiment -> pub.layers.judgment.experimentDef
 */
class BeadJsonlinesImporter implements IFormatImporter {
  readonly format = 'bead-jsonlines' as const;
  readonly name = 'Bead JSONLines Importer';
  readonly version = '1.0.0';
  private readonly logger = createLogger({ service: 'bead-jsonlines-importer' });

  validate(input: string): Result<void, LayersError> {
    if (!input || input.trim().length === 0) {
      return Err(new ValidationError('Input is empty'));
    }

    const lines = input.trim().split('\n');
    const errors: LineError[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.trim().length === 0) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        errors.push({ line: i + 1, message: 'Invalid JSON' });
        continue;
      }

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        errors.push({ line: i + 1, message: 'Line must be a JSON object' });
        continue;
      }

      const recordType = extractType(parsed as Record<string, unknown>);

      if (typeof recordType !== 'string') {
        errors.push({ line: i + 1, message: 'Missing or non-string "type" field' });
        continue;
      }

      if (!BEAD_TYPES.has(recordType)) {
        errors.push({
          line: i + 1,
          message: `Unknown type "${recordType}"; expected one of: entry, template, filling, experiment`,
        });
      }
    }

    if (errors.length > 0) {
      const summary = errors
        .slice(0, 10)
        .map((e) => `Line ${String(e.line)}: ${e.message}`)
        .join('; ');
      const suffix = errors.length > 10 ? ` (and ${String(errors.length - 10)} more)` : '';
      return Err(new ValidationError(`Bead JSONLines validation failed: ${summary}${suffix}`));
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

    const lines = input.trim().split('\n');
    const entries: Record<string, unknown>[] = [];
    const templates: Record<string, unknown>[] = [];
    const fillings: Record<string, unknown>[] = [];
    const experiments: Record<string, unknown>[] = [];

    for (const line of lines) {
      if (!line || line.trim().length === 0) continue;

      const raw = JSON.parse(line) as Record<string, unknown>;
      const recordType = extractType(raw) as string;

      switch (recordType) {
        case 'entry':
          entries.push(mapEntry(raw as unknown as BeadEntry));
          break;
        case 'template':
          templates.push(mapTemplate(raw as unknown as BeadTemplate));
          break;
        case 'filling':
          fillings.push(mapFilling(raw as unknown as BeadFilling));
          break;
        case 'experiment':
          experiments.push(mapExperiment(raw as unknown as BeadExperiment));
          break;
        default:
          break;
      }
    }

    this.logger.debug('Bead JSONLines parsed', {
      entries: entries.length,
      templates: templates.length,
      fillings: fillings.length,
      experiments: experiments.length,
    });

    // ImportResult uses expressions/segmentations/annotationLayers arrays.
    // We pack entries, templates, fillings, and experiments into metadata
    // and use expressions for entry records (closest fit).
    return Ok({
      format: 'bead-jsonlines',
      expressions: entries,
      segmentations: [],
      annotationLayers: [],
      metadata: {
        entryCount: entries.length,
        templateCount: templates.length,
        fillingCount: fillings.length,
        experimentCount: experiments.length,
        templates,
        fillings,
        experiments,
      },
    });
  }
}

/**
 * Map a bead entry to a pub.layers.resource.entry record shape.
 *
 * @param bead - the raw bead entry object
 * @returns a record-shaped object for the import pipeline
 */
function mapEntry(bead: BeadEntry): Record<string, unknown> {
  const base: Record<string, unknown> = {
    form: bead.form,
    sourceFormat: 'bead-jsonlines',
  };

  if (bead.lemma) {
    base.lemma = bead.lemma;
  }

  if (bead.language) {
    base.language = bead.language;
  }

  if (bead.features && Object.keys(bead.features).length > 0) {
    base.features = {
      entries: Object.entries(bead.features).map(([key, value]) => ({ key, value })),
    };
  }

  if (bead.knowledgeRefs && bead.knowledgeRefs.length > 0) {
    base.knowledgeRefs = bead.knowledgeRefs.map((ref) => ({
      source: ref.source,
      identifier: ref.id,
      label: ref.label,
    }));
  }

  return base;
}

/**
 * Map a bead template to a pub.layers.resource.template record shape.
 *
 * @param bead - the raw bead template object
 * @returns a record-shaped object for the import pipeline
 */
function mapTemplate(bead: BeadTemplate): Record<string, unknown> {
  const base: Record<string, unknown> = {
    text: bead.text,
    slots: bead.slots.map((slot) => {
      const mapped: Record<string, unknown> = { name: slot.name };
      if (slot.required !== undefined) mapped.required = slot.required;
      if (slot.defaultValue) mapped.defaultValue = slot.defaultValue;
      if (slot.description) mapped.description = slot.description;
      if (slot.constraints && slot.constraints.length > 0) {
        mapped.constraints = slot.constraints.map((expr) => ({ expression: expr }));
      }
      return mapped;
    }),
    sourceFormat: 'bead-jsonlines',
  };

  if (bead.name) {
    base.name = bead.name;
  }

  if (bead.language) {
    base.language = bead.language;
  }

  if (bead.constraints && bead.constraints.length > 0) {
    base.constraints = bead.constraints.map((expr) => ({ expression: expr }));
  }

  return base;
}

/**
 * Map a bead filling to a pub.layers.resource.filling record shape.
 *
 * @param bead - the raw bead filling object
 * @returns a record-shaped object for the import pipeline
 */
function mapFilling(bead: BeadFilling): Record<string, unknown> {
  const base: Record<string, unknown> = {
    templateRef: bead.templateRef,
    slotFillings: Object.entries(bead.slotFillings).map(([slotName, literalValue]) => ({
      slotName,
      literalValue,
    })),
    sourceFormat: 'bead-jsonlines',
  };

  if (bead.renderedText) {
    base.renderedText = bead.renderedText;
  }

  if (bead.strategy) {
    base.strategy = bead.strategy;
  }

  return base;
}

/**
 * Map a bead experiment definition to a pub.layers.judgment.experimentDef record shape.
 *
 * @param bead - the raw bead experiment object
 * @returns a record-shaped object for the import pipeline
 */
function mapExperiment(bead: BeadExperiment): Record<string, unknown> {
  const base: Record<string, unknown> = {
    name: bead.name,
    sourceFormat: 'bead-jsonlines',
  };

  if (bead.description) {
    base.description = bead.description;
  }

  if (bead.measureType) {
    base.measureType = bead.measureType;
  }

  if (bead.taskType) {
    base.taskType = bead.taskType;
  }

  if (bead.scaleMin !== undefined) {
    base.scaleMin = bead.scaleMin;
  }

  if (bead.scaleMax !== undefined) {
    base.scaleMax = bead.scaleMax;
  }

  if (bead.labels && bead.labels.length > 0) {
    base.labels = [...bead.labels];
  }

  return base;
}

export { BeadJsonlinesImporter };
export type { BeadEntry, BeadTemplate, BeadFilling, BeadExperiment, BeadRecord, LineError };
