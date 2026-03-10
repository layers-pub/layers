'use client';

/**
 * Reusable ontology creation and editing form.
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
import { ontologyCreateSchema, type OntologyFormValues } from '@/lib/schemas';

interface OntologyFormProps {
  readonly defaultValues?: OntologyFormValues;
  readonly onSubmit: (values: OntologyFormValues) => void;
  readonly isSubmitting?: boolean;
  readonly submitLabel?: string;
}

/**
 * Form for creating or editing an ontology record.
 *
 * Uses react-hook-form with Zod validation. Accepts optional defaultValues
 * for editing and a custom submit label.
 */
function OntologyForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Create Ontology',
}: OntologyFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OntologyFormValues>({
    resolver: zodResolver(ontologyCreateSchema),
    defaultValues: defaultValues ?? {
      name: '',
      description: '',
      version: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Universal Dependencies" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="A brief description of this ontology"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="version">
          Version <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input id="version" placeholder="1.0.0" {...register('version')} />
        {errors.version && (
          <p className="text-sm text-destructive mt-1">{errors.version.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}

export type { OntologyFormProps };
export { OntologyForm };
