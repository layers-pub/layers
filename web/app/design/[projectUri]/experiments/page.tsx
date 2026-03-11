'use client';

/**
 * Experiment list page for a design project.
 *
 * @module
 */

import { use } from 'react';

import { ExperimentList } from '@/components/design/experiment-list';

interface ExperimentsPageProps {
  params: Promise<{ projectUri: string }>;
}

export default function ExperimentsPage({ params }: ExperimentsPageProps) {
  const { projectUri } = use(params);

  return <ExperimentList projectUri={decodeURIComponent(projectUri)} />;
}
