'use client';

/**
 * Filling simulation panel.
 *
 * Strategy picker (exhaustive, random, CSP, MLM), template selector,
 * and results table.
 *
 * @module
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SimulatePanelProps {
  readonly projectUri: string;
}

function SimulatePanel({ projectUri }: SimulatePanelProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Filling Simulation</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Strategy picker and simulation results will be implemented in Phase 5.
        </p>
        <p className="mt-2 min-w-0 truncate font-mono text-xs text-muted-foreground">
          {projectUri}
        </p>
      </CardContent>
    </Card>
  );
}

export { SimulatePanel };
