'use client';

/**
 * Experiment list for a design project.
 *
 * @module
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExperimentListProps {
  readonly projectUri: string;
}

function ExperimentList({ projectUri }: ExperimentListProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Experiments</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Experiment definitions for this project will be listed here.
        </p>
        <p className="mt-2 min-w-0 truncate font-mono text-xs text-muted-foreground">
          {projectUri}
        </p>
      </CardContent>
    </Card>
  );
}

export { ExperimentList };
