'use client';

/**
 * Form for creating or editing a resource entry.
 *
 * Fields: form (required), lemma, language, features (dynamic key-value
 * pairs with add/remove).
 *
 * @module
 */

import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageCombobox } from '@/components/ui/language-combobox';
import { Label } from '@/components/ui/label';
import { entryCreateSchema, type EntryFormValues } from '@/lib/schemas/design';

// =============================================================================
// PROPS
// =============================================================================

interface EntryFormProps {
  readonly defaultValues?: EntryFormValues;
  readonly onSubmit: (values: EntryFormValues) => void;
  readonly onCancel?: () => void;
  readonly isSubmitting?: boolean;
  readonly mode: 'create' | 'edit';
}

// =============================================================================
// COMPONENT
// =============================================================================

function EntryForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode,
}: EntryFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entryCreateSchema),
    defaultValues: defaultValues ?? {
      form: '',
      lemma: '',
      language: '',
      features: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'features',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="entry-form">Form</Label>
        <Input id="entry-form" placeholder="Surface form" {...register('form')} />
        {errors.form ? (
          <p className="mt-1 text-sm text-destructive">{errors.form.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="entry-lemma">Lemma</Label>
        <Input id="entry-lemma" placeholder="Citation form" {...register('lemma')} />
        {errors.lemma ? (
          <p className="mt-1 text-sm text-destructive">{errors.lemma.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label>Language</Label>
        <Controller
          control={control}
          name="language"
          render={({ field }) => (
            <LanguageCombobox
              value={field.value ?? ''}
              onChange={field.onChange}
              className="w-full"
            />
          )}
        />
        {errors.language ? (
          <p className="mt-1 text-sm text-destructive">{errors.language.message}</p>
        ) : null}
      </div>

      {/* Features (dynamic key-value pairs) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Features</Label>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => append({ key: '', value: '' })}
          >
            <Plus className="mr-1 size-3" />
            Add
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No features. Click &quot;Add&quot; to add key-value pairs.
          </p>
        ) : null}

        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2">
            <div className="flex-1 space-y-1">
              <Input placeholder="Key (e.g., pos)" {...register(`features.${index}.key`)} />
              {errors.features?.[index]?.key ? (
                <p className="text-xs text-destructive">{errors.features[index]?.key?.message}</p>
              ) : null}
            </div>
            <div className="flex-1 space-y-1">
              <Input placeholder="Value (e.g., noun)" {...register(`features.${index}.value`)} />
              {errors.features?.[index]?.value ? (
                <p className="text-xs text-destructive">{errors.features[index]?.value?.message}</p>
              ) : null}
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
              <Trash2 className="size-3.5" />
              <span className="sr-only">Remove feature</span>
            </Button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {mode === 'create' ? 'Add Entry' : 'Save Changes'}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export { EntryForm };
export type { EntryFormProps };
