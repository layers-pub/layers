'use client';

/**
 * Experiment editor page for a single experiment definition.
 *
 * @module
 */

import { use } from 'react';

import { ExperimentEditor } from '@/components/design/experiment-editor';

interface ExperimentEditorPageProps {
  params: Promise<{ projectUri: string; experimentUri: string }>;
}

export default function ExperimentEditorPage({ params }: ExperimentEditorPageProps) {
  const { projectUri, experimentUri } = use(params);

  return (
    <ExperimentEditor
      projectUri={decodeURIComponent(projectUri)}
      experimentUri={decodeURIComponent(experimentUri)}
    />
  );
}
