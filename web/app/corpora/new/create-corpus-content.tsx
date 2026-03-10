'use client';

/**
 * Client component for the corpus creation page.
 *
 * @module
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CorpusForm } from '@/components/forms';
import { useAgent } from '@/lib/auth';
import { createCorpusRecord } from '@/lib/atproto';
import type { CorpusFormValues } from '@/lib/schemas';

/**
 * Renders the corpus creation form with breadcrumb navigation.
 *
 * On successful submission, creates the corpus record in the user's
 * PDS via ATProto, shows a success toast, and navigates to the new
 * corpus detail page.
 */
function CreateCorpusContent(): React.JSX.Element {
  const router = useRouter();
  const agent = useAgent();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: CorpusFormValues): Promise<void> {
    if (!agent) {
      toast.error('You must be logged in to create a corpus.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createCorpusRecord(agent, {
        name: values.name,
        description: values.description,
        language: values.language,
        license: values.license,
      });

      toast.success('Corpus created successfully.');

      const uriPath = result.uri.replace('at://', '');
      router.push(`/corpora/${uriPath}`);
    } catch {
      toast.error('Failed to create corpus. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/corpora" />}>Corpora</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle>Create Corpus</CardTitle>
        </CardHeader>
        <CardContent>
          <CorpusForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </CardContent>
      </Card>
    </div>
  );
}

export { CreateCorpusContent };
