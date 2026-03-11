'use client';

/**
 * Lexicon editor page for a single resource collection.
 *
 * @module
 */

import { use } from 'react';

import { LexiconEditor } from '@/components/design/lexicon-editor';

interface LexiconEditorPageProps {
  params: Promise<{ projectUri: string; collectionUri: string }>;
}

export default function LexiconEditorPage({ params }: LexiconEditorPageProps) {
  const { projectUri, collectionUri } = use(params);

  return (
    <LexiconEditor
      projectUri={decodeURIComponent(projectUri)}
      collectionUri={decodeURIComponent(collectionUri)}
    />
  );
}
