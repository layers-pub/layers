'use client';

/**
 * Lexicon list for a design project.
 *
 * Displays resource collections linked to the project that serve as lexicons.
 *
 * @module
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LexiconListProps {
  readonly projectUri: string;
}

function LexiconList({ projectUri }: LexiconListProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Lexicons</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Lexicon collections for project will be listed here.
        </p>
        <p className="mt-2 min-w-0 truncate font-mono text-xs text-muted-foreground">
          {projectUri}
        </p>
      </CardContent>
    </Card>
  );
}

export { LexiconList };
