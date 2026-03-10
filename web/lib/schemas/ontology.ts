/**
 * Zod validation schemas for ontology and typeDef CRUD operations.
 *
 * @module
 */

import { z } from 'zod';

const ontologyCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(512),
  description: z.string().max(10000).optional(),
  version: z.string().max(32).optional(),
});

type OntologyFormValues = z.infer<typeof ontologyCreateSchema>;

const typeDefCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(512),
  gloss: z.string().max(10000).optional(),
  parentTypeRef: z.string().optional(),
});

type TypeDefFormValues = z.infer<typeof typeDefCreateSchema>;

export type { OntologyFormValues, TypeDefFormValues };
export { ontologyCreateSchema, typeDefCreateSchema };
