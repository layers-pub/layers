'use client';

/**
 * Template list page for a design project.
 *
 * @module
 */

import { use } from 'react';

import { TemplateList } from '@/components/design/template-list';

interface TemplatesPageProps {
  params: Promise<{ projectUri: string }>;
}

export default function TemplatesPage({ params }: TemplatesPageProps) {
  const { projectUri } = use(params);

  return <TemplateList projectUri={decodeURIComponent(projectUri)} />;
}
