/**
 * Zod validation schemas for expression CRUD operations.
 *
 * @module
 */

import { z } from 'zod';

import { schema as expressionLexiconSchema } from '@/lib/forms/generated/pub.layers.expression.expression.schema';

/**
 * Picks the user-editable subset of the expression record lexicon.
 * Field names + base constraints come from the generated lexicon
 * Zod; the form layer tightens `text` to required.
 */
const expressionCreateSchema = expressionLexiconSchema
  .pick({ text: true, languages: true, sourceUrl: true })
  .extend({
    text: z.string().min(1, 'Text is required').max(100_000),
    languages: z.array(z.string().min(2).max(32)),
  });

type ExpressionFormValues = z.infer<typeof expressionCreateSchema>;

export type { ExpressionFormValues };
export { expressionCreateSchema };
