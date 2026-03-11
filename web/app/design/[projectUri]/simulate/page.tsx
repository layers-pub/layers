'use client';

/**
 * Filling simulation page for a design project.
 *
 * @module
 */

import { use } from 'react';

import { SimulatePanel } from '@/components/design/simulate-panel';

interface SimulatePageProps {
  params: Promise<{ projectUri: string }>;
}

export default function SimulatePage({ params }: SimulatePageProps) {
  const { projectUri } = use(params);

  return <SimulatePanel projectUri={decodeURIComponent(projectUri)} />;
}
