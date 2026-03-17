'use client';

/**
 * Client component for the expression creation page.
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
import { ExpressionForm } from '@/components/forms';
import { useAgent } from '@/lib/auth';
import { createExpressionRecord } from '@/lib/atproto';
import type { ExpressionFormValues } from '@/lib/schemas';

/**
 * Renders the expression creation form with breadcrumb navigation.
 *
 * On successful submission, creates the expression record in the user's
 * PDS via ATProto, shows a success toast, and navigates to the new
 * expression detail page.
 */
function CreateExpressionContent(): React.JSX.Element {
  const router = useRouter();
  const agent = useAgent();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: ExpressionFormValues): Promise<void> {
    if (!agent) {
      toast.error('You must be logged in to create an expression.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createExpressionRecord(agent, {
        text: values.text,
        language: values.language,
      });

      toast.success('Expression created successfully.');

      const uriPath = result.uri.replace('at://', '');
      router.push(`/expressions/${uriPath}`);
    } catch {
      toast.error('Failed to create expression. Please try again.');
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
          <CardTitle>Create Expression</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpressionForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </CardContent>
      </Card>
    </div>
  );
}

export { CreateExpressionContent };
