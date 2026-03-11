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

const experimentDefCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(512),
  description: z.string().max(50_000).optional(),
  measureType: z.string().max(128).optional(),
  taskType: z.string().max(128).optional(),
  guidelines: z.string().max(100_000).optional(),
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
};
