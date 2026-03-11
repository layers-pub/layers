'use client';

/**
 * Filling simulation page for a design project.
 *
 * @module
 */

import { use } from 'react';

import { DesignErrorBoundary } from '@/components/design/design-error-boundary';
import { SimulatePanel } from '@/components/design/simulate-panel';

interface SimulatePageProps {
  params: Promise<{ projectUri: string }>;
}

export default function SimulatePage({ params }: SimulatePageProps) {
  const { projectUri } = use(params);

  return (
    <DesignErrorBoundary name="SimulatePanel">
      <SimulatePanel projectUri={decodeURIComponent(projectUri)} />
    </DesignErrorBoundary>
  );
}
