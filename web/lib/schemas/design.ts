/**
 * Zod validation schemas for /design section forms.
 *
 * @remarks
 * Covers project (collection) creation, entry creation, template authoring,
 * filling specification, and experiment definition. Schemas are used with
 * React Hook Form via zodResolver for client-side validation.
 *
 * @module
 */

import { z } from 'zod';

// =============================================================================
// PROJECT (COLLECTION)
// =============================================================================

const projectCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(512),
  description: z.string().max(50_000).optional(),
  language: z.string().max(32).optional(),
});

type ProjectFormValues = z.infer<typeof projectCreateSchema>;

// =============================================================================
// ENTRY
// =============================================================================

const entryFeatureSchema = z.object({
  key: z.string().min(1, 'Feature key is required'),
  value: z.string().min(1, 'Feature value is required'),
});

const entryCreateSchema = z.object({
  form: z.string().min(1, 'Form is required').max(2048),
  lemma: z.string().max(2048).optional(),
  language: z.string().max(32).optional(),
  features: z.array(entryFeatureSchema).optional(),
});

type EntryFormValues = z.infer<typeof entryCreateSchema>;

// =============================================================================
// TEMPLATE
// =============================================================================

/** Validates slot names as valid identifiers (letters, digits, underscores). */
const SLOT_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const slotSchema = z.object({
  name: z
    .string()
    .min(1, 'Slot name is required')
    .max(128)
    .regex(
      SLOT_NAME_PATTERN,
      'Slot name must be a valid identifier (letters, digits, underscores)',
    ),
  description: z.string().max(4096).optional(),
  required: z.boolean().default(true),
  defaultValue: z.string().max(2048).optional(),
  collectionRef: z.string().max(2048).optional(),
});

type SlotSchema = z.infer<typeof slotSchema>;

const constraintSchema = z.object({
  expression: z.string().min(1, 'Constraint expression is required').max(4096),
  expressionFormat: z.string().max(256).optional(),
  scope: z.string().max(256).optional(),
  description: z.string().max(4096).optional(),
});

type ConstraintSchema = z.infer<typeof constraintSchema>;

const templateCreateSchema = z.object({
  text: z.string().min(1, 'Template text is required').max(50_000),
  name: z.string().max(512).optional(),
  language: z.string().max(32).optional(),
  slots: z.array(slotSchema).default([]),
  constraints: z.array(constraintSchema).default([]),
});

type TemplateFormValues = z.infer<typeof templateCreateSchema>;

// =============================================================================
// FILLING
// =============================================================================

const slotFillingSchema = z.object({
  slotName: z.string().min(1, 'Slot name is required'),
  entryRef: z.string().max(2048).optional(),
  literalValue: z.string().max(2048).optional(),
});

const fillingCreateSchema = z.object({
  templateRef: z.string().min(1, 'Template reference is required'),
  slotFillings: z.array(slotFillingSchema).min(1, 'At least one slot filling is required'),
  renderedText: z.string().max(50_000).optional(),
  strategy: z.string().max(128).optional(),
});

type FillingFormValues = z.infer<typeof fillingCreateSchema>;

// =============================================================================
// EXPERIMENT DEFINITION
// =============================================================================

/** Known measure type values from the experimentDef lexicon. */
const MEASURE_TYPES = [
  'acceptability',
  'inference',
  'similarity',
  'plausibility',
  'comprehension',
  'preference',
  'extraction',
  'reading-time',
  'production',
  'custom',
] as const;

/** Known task type values from the experimentDef lexicon. */
const TASK_TYPES = [
  'forced-choice',
  'multi-select',
  'ordinal-scale',
  'magnitude',
  'binary',
  'categorical',
  'free-text',
  'cloze',
  'span-labeling',
  'custom',
] as const;

/** Known presentation method values. */
const PRESENTATION_METHODS = [
  'rsvp',
  'self-paced',
  'whole-sentence',
  'auditory',
  'visual-world',
  'masked-priming',
  'cross-modal',
  'naturalistic',
  'gating',
  'maze',
  'boundary',
  'moving-window',
  'custom',
] as const;

/** Known chunking unit values. */
const CHUNKING_UNITS = [
  'word',
  'character',
  'morpheme',
  'phrase',
  'sentence',
  'region',
  'custom',
] as const;

/** Known distribution strategy values. */
const DISTRIBUTION_STRATEGIES = [
  'latin-square',
  'random',
  'blocked',
  'stratified',
  'custom',
] as const;

/** Known item order values. */
const ITEM_ORDERS = ['random-order', 'fixed-order', 'blocked', 'adaptive', 'custom'] as const;

/** Known list constraint kinds. */
const LIST_CONSTRAINT_KINDS = [
  'latin-square',
  'no-adjacent-same-condition',
  'balanced-frequency',
  'minimum-distance',
  'custom',
] as const;

/** Known recording method values. */
const RECORDING_METHODS = [
  'button-box',
  'keyboard',
  'mouse-click',
  'touchscreen',
  'voice',
  'eeg',
  'meg',
  'fmri',
  'fnirs',
  'eye-tracking',
  'pupillometry',
  'mouse-tracking',
  'emg',
  'skin-conductance',
  'ecog',
  'custom',
] as const;

// -- Task-specific configuration schemas --

const forcedChoiceConfigSchema = z.object({
  labels: z.array(z.string().min(1)).min(2, 'At least two labels are required'),
});

const ordinalScaleConfigSchema = z.object({
  scaleMin: z.coerce.number().int(),
  scaleMax: z.coerce.number().int(),
});

const magnitudeConfigSchema = z.object({
  bounded: z.boolean().default(false),
  boundValue: z.coerce.number().optional(),
});

const binaryConfigSchema = z.object({
  labelTrue: z.string().min(1, 'Label is required').max(256),
  labelFalse: z.string().min(1, 'Label is required').max(256),
});

const categoricalConfigSchema = z.object({
  labels: z.array(z.string().min(1)).min(2, 'At least two labels are required'),
});

const multiSelectConfigSchema = z.object({
  labels: z.array(z.string().min(1)).min(2, 'At least two labels are required'),
  maxSelections: z.coerce.number().int().positive().optional(),
});

const freeTextConfigSchema = z.object({
  maxLength: z.coerce.number().int().positive().optional(),
});

const clozeConfigSchema = z.object({
  templateText: z.string().min(1, 'Template text with blanks is required').max(50_000),
});

const spanLabelingConfigSchema = z.object({
  labels: z.array(z.string().min(1)).min(1, 'At least one label is required'),
});

type ForcedChoiceConfig = z.infer<typeof forcedChoiceConfigSchema>;
type OrdinalScaleConfig = z.infer<typeof ordinalScaleConfigSchema>;
type MagnitudeConfig = z.infer<typeof magnitudeConfigSchema>;
type BinaryConfig = z.infer<typeof binaryConfigSchema>;
type CategoricalConfig = z.infer<typeof categoricalConfigSchema>;
type MultiSelectConfig = z.infer<typeof multiSelectConfigSchema>;
type FreeTextConfig = z.infer<typeof freeTextConfigSchema>;
type ClozeConfig = z.infer<typeof clozeConfigSchema>;
type SpanLabelingConfig = z.infer<typeof spanLabelingConfigSchema>;

// -- Presentation schema --

const presentationSchema = z.object({
  method: z.string().max(128).optional(),
  chunkingUnit: z.string().max(128).optional(),
  timingMs: z.coerce.number().int().nonnegative().optional(),
  isiMs: z.coerce.number().int().nonnegative().optional(),
  cumulative: z.boolean().optional(),
  maskChar: z.string().max(8).optional(),
});

type PresentationFormValues = z.infer<typeof presentationSchema>;

// -- List constraint schema --

const listConstraintFormSchema = z.object({
  kind: z.string().min(1, 'Constraint kind is required'),
  targetProperty: z.string().max(256).optional(),
  parameters: z.array(entryFeatureSchema).optional(),
  constraintExpression: z.string().max(4096).optional(),
});

type ListConstraintFormValues = z.infer<typeof listConstraintFormSchema>;

// -- Design schema --

const experimentDesignSchema = z.object({
  distributionStrategy: z.string().max(128).optional(),
  itemOrder: z.string().max(128).optional(),
  listConstraints: z.array(listConstraintFormSchema).optional(),
});

type ExperimentDesignFormValues = z.infer<typeof experimentDesignSchema>;

// -- Recording method form schema --

const recordingMethodFormSchema = z.object({
  method: z.string().min(1),
});

type RecordingMethodFormValues = z.infer<typeof recordingMethodFormSchema>;

// -- Full experiment definition schema --

const experimentDefCreateSchema = z.object({
  // Basic info
  name: z.string().min(1, 'Name is required').max(512),
  description: z.string().max(50_000).optional(),
  measureType: z.string().max(128).optional(),
  taskType: z.string().max(128).optional(),
  guidelines: z.string().max(100_000).optional(),

  // Task-specific configuration (stored as labels/scaleMin/scaleMax on the record)
  labels: z.array(z.string()).optional(),
  scaleMin: z.coerce.number().int().optional(),
  scaleMax: z.coerce.number().int().optional(),

  // Stimuli references
  templateRefs: z.array(z.string()).optional(),
  collectionRefs: z.array(z.string()).optional(),

  // Presentation
  presentation: presentationSchema.optional(),

  // Design
  design: experimentDesignSchema.optional(),

  // Recording methods
  recordingMethods: z.array(recordingMethodFormSchema).optional(),
});

type ExperimentDefFormValues = z.infer<typeof experimentDefCreateSchema>;

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  ProjectFormValues,
  EntryFormValues,
  SlotSchema,
  ConstraintSchema,
  TemplateFormValues,
  FillingFormValues,
  ExperimentDefFormValues,
  ForcedChoiceConfig,
  OrdinalScaleConfig,
  MagnitudeConfig,
  BinaryConfig,
  CategoricalConfig,
  MultiSelectConfig,
  FreeTextConfig,
  ClozeConfig,
  SpanLabelingConfig,
  PresentationFormValues,
  ListConstraintFormValues,
  ExperimentDesignFormValues,
  RecordingMethodFormValues,
};
export {
  projectCreateSchema,
  entryCreateSchema,
  entryFeatureSchema,
  slotSchema,
  constraintSchema,
  templateCreateSchema,
  slotFillingSchema,
  fillingCreateSchema,
  experimentDefCreateSchema,
  forcedChoiceConfigSchema,
  ordinalScaleConfigSchema,
  magnitudeConfigSchema,
  binaryConfigSchema,
  categoricalConfigSchema,
  multiSelectConfigSchema,
  freeTextConfigSchema,
  clozeConfigSchema,
  spanLabelingConfigSchema,
  presentationSchema,
  listConstraintFormSchema,
  experimentDesignSchema,
  recordingMethodFormSchema,
  MEASURE_TYPES,
  TASK_TYPES,
  PRESENTATION_METHODS,
  CHUNKING_UNITS,
  DISTRIBUTION_STRATEGIES,
  ITEM_ORDERS,
  LIST_CONSTRAINT_KINDS,
  RECORDING_METHODS,
};
