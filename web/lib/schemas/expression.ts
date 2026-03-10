/**
 * Zod validation schemas for expression CRUD operations.
 *
 * @module
 */

import { z } from 'zod';

const expressionCreateSchema = z.object({
  text: z.string().min(1, 'Text is required').max(100_000),
  language: z
    .string()
    .max(10)
    .optional()
    .refine((v) => !v || v.length >= 2, 'Language code must be at least 2 characters'),
  source: z.string().max(1024).optional(),
});

type ExpressionFormValues = z.infer<typeof expressionCreateSchema>;

export type { ExpressionFormValues };
export { expressionCreateSchema };
