'use client';

/**
 * Experiment editor for a single experiment definition.
 *
 * Multi-section form with task configuration and preview.
 *
 * @module
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExperimentEditorProps {
  readonly projectUri: string;
  readonly experimentUri: string;
}

function ExperimentEditor({ projectUri, experimentUri }: ExperimentEditorProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Experiment Editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Experiment form and task configurator will be implemented in Phase 6.
        </p>
        <div className="min-w-0 space-y-1">
          <p className="truncate font-mono text-xs text-muted-foreground">Project: {projectUri}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            Experiment: {experimentUri}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export { ExperimentEditor };
