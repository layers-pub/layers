'use client';

/**
 * Experiment editor page for a single experiment definition.
 *
 * @module
 */

import { use } from 'react';

import { DesignErrorBoundary } from '@/components/design/design-error-boundary';
import { ExperimentEditor } from '@/components/design/experiment-editor';

interface ExperimentEditorPageProps {
  params: Promise<{ projectUri: string; experimentUri: string }>;
}

export default function ExperimentEditorPage({ params }: ExperimentEditorPageProps) {
  const { projectUri, experimentUri } = use(params);

  return (
    <DesignErrorBoundary name="ExperimentEditor">
      <ExperimentEditor
        projectUri={decodeURIComponent(projectUri)}
        experimentUri={decodeURIComponent(experimentUri)}
      />
    </DesignErrorBoundary>
  );
}
