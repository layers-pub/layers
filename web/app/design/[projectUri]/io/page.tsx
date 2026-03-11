'use client';

/**
 * Import/export page for a design project.
 *
 * @module
 */

import { use } from 'react';

import { IoPanel } from '@/components/design/io-panel';

interface IoPageProps {
  params: Promise<{ projectUri: string }>;
}

export default function IoPage({ params }: IoPageProps) {
  const { projectUri } = use(params);

  return <IoPanel projectUri={decodeURIComponent(projectUri)} />;
}
