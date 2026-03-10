'use client';

/**
 * Reusable corpus creation and editing form.
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
import { corpusCreateSchema, type CorpusFormValues } from '@/lib/schemas';

interface CorpusFormProps {
  readonly defaultValues?: CorpusFormValues;
  readonly onSubmit: (values: CorpusFormValues) => void;
  readonly isSubmitting?: boolean;
  readonly submitLabel?: string;
}

/**
 * Form for creating or editing a corpus record.
 *
 * Uses react-hook-form with Zod validation. Accepts optional defaultValues
 * for editing and a custom submit label.
 */
function CorpusForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Create Corpus',
}: CorpusFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CorpusFormValues>({
    resolver: zodResolver(corpusCreateSchema),
    defaultValues: defaultValues ?? {
      name: '',
      description: '',
      language: '',
      license: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="My Corpus" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="A brief description of this corpus"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="language">Language</Label>
        <Input id="language" placeholder="en" {...register('language')} />
        {errors.language && (
          <p className="text-sm text-destructive mt-1">{errors.language.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="license">License</Label>
        <Input id="license" placeholder="CC-BY-4.0" {...register('license')} />
        {errors.license && (
          <p className="text-sm text-destructive mt-1">{errors.license.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}

export type { CorpusFormProps };
export { CorpusForm };
