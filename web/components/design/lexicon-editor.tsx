'use client';

/**
 * Lexicon editor for a single resource collection.
 *
 * Re-exports the full lexicon editor from the lexicon/ subdirectory.
 * The route page imports from this file path for backward compatibility.
 *
 * @module
 */

import { LexiconEditor as LexiconEditorImpl } from './lexicon/lexicon-editor';

interface LexiconEditorProps {
  readonly projectUri: string;
  readonly collectionUri: string;
}

function LexiconEditor({ collectionUri }: LexiconEditorProps): React.JSX.Element {
  return <LexiconEditorImpl collectionUri={collectionUri} />;
}

export { LexiconEditor };
