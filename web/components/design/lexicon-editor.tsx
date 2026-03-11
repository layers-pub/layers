'use client';

/**
 * Lexicon editor for a single resource collection.
 *
 * Two-panel layout: entry table (left) + editor/query panel (right).
 *
 * @module
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LexiconEditorProps {
  readonly projectUri: string;
  readonly collectionUri: string;
}

function LexiconEditor({ projectUri, collectionUri }: LexiconEditorProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Lexicon Editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Entry table and editor will be implemented in Phase 2.
        </p>
        <div className="min-w-0 space-y-1">
          <p className="truncate font-mono text-xs text-muted-foreground">Project: {projectUri}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            Collection: {collectionUri}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export { LexiconEditor };
