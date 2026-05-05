/**
 * Form schema for corpus CRUD, picked from the generated lexicon
 * schema so the field names track `pub.layers.corpus.corpus` exactly.
 *
 * @module
 */

import { z } from 'zod';

import { schema as corpusLexiconSchema } from '@/lib/forms/generated/pub.layers.corpus.corpus.schema';

const corpusCreateSchema = corpusLexiconSchema
  .pick({ name: true, description: true, languages: true, license: true })
  .extend({
    name: z.string().min(1, 'Name is required').max(512),
    languages: z
      .array(z.string().min(2).max(32))
      .min(1, 'At least one language is required'),
  });

type CorpusFormValues = z.infer<typeof corpusCreateSchema>;

export type { CorpusFormValues };
export { corpusCreateSchema };
