/**
 * Zod validation schemas for corpus CRUD operations.
 *
 * @module
 */

import { z } from 'zod';

const corpusCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(512),
  description: z.string().max(50000).optional(),
  language: z.string().min(2, 'Language is required').max(32),
  license: z.string().max(256).optional(),
});

type CorpusFormValues = z.infer<typeof corpusCreateSchema>;

export type { CorpusFormValues };
export { corpusCreateSchema };
