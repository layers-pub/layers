'use client';

/**
 * Lexicon list page for a design project.
 *
 * @module
 */

import { use } from 'react';

import { LexiconList } from '@/components/design/lexicon-list';

interface LexiconsPageProps {
  params: Promise<{ projectUri: string }>;
}

export default function LexiconsPage({ params }: LexiconsPageProps) {
  const { projectUri } = use(params);
  const decodedUri = decodeURIComponent(projectUri);

  return <LexiconList projectUri={decodedUri} />;
}
