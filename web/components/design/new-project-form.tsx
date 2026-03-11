'use client';

/**
 * Form for creating a new design project.
 *
 * Creates a `pub.layers.resource.collection` record with kind='stimulus-pool'
 * in the user's PDS, then navigates to the project workspace.
 *
 * @module
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAgent } from '@/lib/auth';
import {
  createResourceCollectionRecord,
  syncRecordWithAppview,
} from '@/lib/atproto/record-creator';
import { projectCreateSchema, type ProjectFormValues } from '@/lib/schemas/design';

function NewProjectForm(): React.JSX.Element {
  const router = useRouter();
  const agent = useAgent();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: '',
      description: '',
      language: '',
    },
  });

  async function onSubmit(values: ProjectFormValues): Promise<void> {
    if (!agent) {
      toast.error('You must be signed in to create a project.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createResourceCollectionRecord(agent, {
        name: values.name,
        description: values.description,
        language: values.language,
        kind: 'stimulus-pool',
      });

      // Best-effort immediate indexing
      try {
        await syncRecordWithAppview(result.uri, '');
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch {
        // Firehose will handle indexing eventually
      }

      toast.success('Project created.');

      const encodedUri = encodeURIComponent(result.uri);
      router.push(`/design/${encodedUri}`);
    } catch {
      toast.error('Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Project" description="Create a new design project" />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="My Experiment" {...register('name')} />
              {errors.name ? (
                <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="A brief description of this project"
                rows={3}
                {...register('description')}
              />
              {errors.description ? (
                <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="language">Language</Label>
              <Input id="language" placeholder="en" {...register('language')} />
              {errors.language ? (
                <p className="mt-1 text-sm text-destructive">{errors.language.message}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Create Project
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/design')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export { NewProjectForm };
