'use client';

/**
 * Template editor page for a single template record.
 *
 * @module
 */

import { use } from 'react';

import { DesignErrorBoundary } from '@/components/design/design-error-boundary';
import { TemplateEditor } from '@/components/design/template-editor';

interface TemplateEditorPageProps {
  params: Promise<{ projectUri: string; templateUri: string }>;
}

export default function TemplateEditorPage({ params }: TemplateEditorPageProps) {
  const { projectUri, templateUri } = use(params);

  return (
    <DesignErrorBoundary name="TemplateEditor">
      <TemplateEditor
        projectUri={decodeURIComponent(projectUri)}
        templateUri={decodeURIComponent(templateUri)}
      />
    </DesignErrorBoundary>
  );
}
