'use client';

/**
 * Expression creation form with character count.
 *
 * @module
 */

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { expressionCreateSchema, type ExpressionFormValues } from '@/lib/schemas';

interface ExpressionFormProps {
  readonly onSubmit: (values: ExpressionFormValues) => void;
  readonly isSubmitting?: boolean;
}

/**
 * Form for creating a new expression record.
 *
 * Includes a live character count beneath the text area.
 */
function ExpressionForm({
  onSubmit,
  isSubmitting = false,
}: ExpressionFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ExpressionFormValues>({
    resolver: zodResolver(expressionCreateSchema),
    defaultValues: {
      text: '',
      language: undefined,
      source: undefined,
    },
  });

  const textValue = useWatch({ control, name: 'text' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="text">Text</Label>
        <Textarea
          id="text"
          placeholder="Enter the linguistic expression text"
          className="min-h-40"
          {...register('text')}
        />
        <div className="flex items-center justify-between">
          {errors.text ? (
            <p className="text-sm text-destructive">{errors.text.message}</p>
          ) : (
            <span />
          )}
          <p className="text-xs text-muted-foreground">
            {(textValue ?? '').length.toLocaleString()} / 100,000
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="language">
          Language <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input id="language" placeholder="en" {...register('language')} />
        {errors.language && (
          <p className="text-sm text-destructive mt-1">{errors.language.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="source">
          Source <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input id="source" placeholder="URL or citation" {...register('source')} />
        {errors.source && <p className="text-sm text-destructive mt-1">{errors.source.message}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        Create Expression
      </Button>
    </form>
  );
}

export type { ExpressionFormProps };
export { ExpressionForm };
