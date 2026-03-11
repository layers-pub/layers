'use client';

/**
 * Lexicon list for a design project.
 *
 * Displays resource collections with kind='lexicon' that belong to the
 * current user. Each card links to the lexicon editor for that collection.
 *
 * @module
 */

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, BookOpen, Languages, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAgent, useAuth } from '@/lib/auth';
import {
  createResourceCollectionRecord,
  syncRecordWithAppview,
} from '@/lib/atproto/record-creator';
import { useProjectCollections } from '@/lib/hooks/use-design';

// =============================================================================
// SCHEMAS
// =============================================================================

const lexiconCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(512),
  description: z.string().max(50_000).optional(),
  language: z.string().max(32).optional(),
});

type LexiconFormValues = z.infer<typeof lexiconCreateSchema>;

// =============================================================================
// PROPS
// =============================================================================

interface LexiconListProps {
  readonly projectUri: string;
}

// =============================================================================
// LEXICON CARD
// =============================================================================

interface LexiconCardProps {
  readonly uri: string;
  readonly projectUri: string;
  readonly name: string;
  readonly description?: string;
  readonly language?: string;
  readonly kind?: string;
}

function LexiconCard({
  uri,
  projectUri,
  name,
  description,
  language,
  kind,
}: LexiconCardProps): React.JSX.Element {
  const encodedProjectUri = encodeURIComponent(projectUri);
  const encodedCollectionUri = encodeURIComponent(uri);

  return (
    <Link href={`/design/${encodedProjectUri}/lexicons/${encodedCollectionUri}`} className="block">
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold leading-tight">{name}</CardTitle>
            <div className="flex shrink-0 items-center gap-1.5">
              {language ? (
                <Badge variant="outline">
                  <Languages className="mr-1 size-3" />
                  {language}
                </Badge>
              ) : null}
              {kind ? <Badge variant="secondary">{kind}</Badge> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {description || 'No description'}
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <BookOpen className="size-3" />
            <span>Lexicon</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

function LexiconCardSkeleton(): React.JSX.Element {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-2/3" />
        <Skeleton className="mt-3 h-3 w-1/4" />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// CREATE LEXICON DIALOG
// =============================================================================

interface CreateLexiconDialogProps {
  readonly onCreated: () => void;
}

function CreateLexiconDialog({ onCreated }: CreateLexiconDialogProps): React.JSX.Element {
  const agent = useAgent();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LexiconFormValues>({
    resolver: zodResolver(lexiconCreateSchema),
    defaultValues: { name: '', description: '', language: '' },
  });

  async function onSubmit(values: LexiconFormValues): Promise<void> {
    if (!agent) {
      toast.error('You must be signed in to create a lexicon.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createResourceCollectionRecord(agent, {
        name: values.name,
        description: values.description,
        language: values.language,
        kind: 'lexicon',
      });

      try {
        await syncRecordWithAppview(result.uri, '');
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch {
        // Firehose will handle indexing eventually
      }

      toast.success('Lexicon created.');
      reset();
      setOpen(false);
      onCreated();
    } catch {
      toast.error('Failed to create lexicon. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1.5 size-4" />
        New Lexicon
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Lexicon</DialogTitle>
          <DialogDescription>
            Create a new lexicon collection to store lexical entries.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lexicon-name">Name</Label>
            <Input id="lexicon-name" placeholder="My Lexicon" {...register('name')} />
            {errors.name ? (
              <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lexicon-description">Description</Label>
            <Textarea
              id="lexicon-description"
              placeholder="A brief description"
              rows={2}
              {...register('description')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lexicon-language">Language</Label>
            <Input id="lexicon-language" placeholder="en" {...register('language')} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// LEXICON LIST
// =============================================================================

function LexiconList({ projectUri }: LexiconListProps): React.JSX.Element {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useProjectCollections({
    repo: user?.did ?? '',
  });

  // Filter to lexicon-kind collections (all collections except the project itself)
  const lexicons = (data?.records ?? []).filter(
    (r) => r.uri !== projectUri && r.value.kind === 'lexicon',
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lexicons</h2>
        <CreateLexiconDialog onCreated={() => refetch()} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <LexiconCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load lexicons.'}
            </p>
          </CardContent>
        </Card>
      ) : lexicons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="mb-4 size-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No lexicons yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create a lexicon to start adding entries for your project.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lexicons.map((record) => (
            <LexiconCard
              key={record.uri}
              uri={record.uri}
              projectUri={projectUri}
              name={record.value.name}
              description={record.value.description}
              language={record.value.language}
              kind={record.value.kind}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export { LexiconList };
export type { LexiconListProps };
