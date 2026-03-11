'use client';

/**
 * Import/export panel for a design project.
 *
 * Handles bead JSONLines import/export and corpus PDS connection.
 *
 * @module
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface IoPanelProps {
  readonly projectUri: string;
}

function IoPanel({ projectUri }: IoPanelProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Import / Export</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Bead JSONLines import/export and corpus PDS connector will be implemented in Phase 7.
        </p>
        <p className="mt-2 min-w-0 truncate font-mono text-xs text-muted-foreground">
          {projectUri}
        </p>
      </CardContent>
    </Card>
  );
}

export { IoPanel };
