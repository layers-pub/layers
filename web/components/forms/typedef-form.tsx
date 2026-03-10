'use client';

/**
 * TypeDef creation form for use within the ontology typeDef tree.
 *
 * @module
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { typeDefCreateSchema, type TypeDefFormValues } from '@/lib/schemas';

interface TypeDefFormProps {
  readonly ontologyUri: string;
  readonly parentUri?: string;
  readonly onSubmit: (values: TypeDefFormValues) => void;
  readonly isSubmitting?: boolean;
}

/**
 * Inline form for creating a typeDef within an ontology.
 *
 * When a parentUri is provided, the parent field is pre-filled and read-only,
 * indicating the new typeDef will be a child of the given parent.
 */
function TypeDefForm({
  ontologyUri: _ontologyUri,
  parentUri,
  onSubmit,
  isSubmitting = false,
}: TypeDefFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TypeDefFormValues>({
    resolver: zodResolver(typeDefCreateSchema),
    defaultValues: {
      name: '',
      gloss: '',
      parentTypeRef: parentUri ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="typedef-name">Name</Label>
        <Input id="typedef-name" placeholder="NOUN" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="typedef-gloss">
          Gloss <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea id="typedef-gloss" placeholder="Definition of this type" {...register('gloss')} />
        {errors.gloss && <p className="text-sm text-destructive mt-1">{errors.gloss.message}</p>}
      </div>

      {parentUri && (
        <div className="space-y-1.5">
          <Label htmlFor="typedef-parent">Parent</Label>
          <Input
            id="typedef-parent"
            value={parentUri}
            readOnly
            className="bg-muted text-muted-foreground"
          />
        </div>
      )}

      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        Add Type
      </Button>
    </form>
  );
}

export type { TypeDefFormProps };
export { TypeDefForm };
