'use client';

/**
 * Client component for the ontology creation page.
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
import { OntologyForm } from '@/components/forms';
import { useAgent } from '@/lib/auth';
import { createOntologyRecord } from '@/lib/atproto';
import type { OntologyFormValues } from '@/lib/schemas';

/**
 * Renders the ontology creation form with breadcrumb navigation.
 *
 * On successful submission, creates the ontology record in the user's
 * PDS via ATProto, shows a success toast, and navigates to the new
 * ontology detail page.
 */
function CreateOntologyContent(): React.JSX.Element {
  const router = useRouter();
  const agent = useAgent();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: OntologyFormValues): Promise<void> {
    if (!agent) {
      toast.error('You must be logged in to create an ontology.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createOntologyRecord(agent, {
        name: values.name,
        description: values.description,
        version: values.version,
      });

      toast.success('Ontology created successfully.');

      const uriPath = result.uri.replace('at://', '');
      router.push(`/ontologies/${uriPath}`);
    } catch {
      toast.error('Failed to create ontology. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/ontologies" />}>Ontologies</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle>Create Ontology</CardTitle>
        </CardHeader>
        <CardContent>
          <OntologyForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </CardContent>
      </Card>
    </div>
  );
}

export { CreateOntologyContent };
