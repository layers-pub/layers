'use client';

/**
 * Import/export panel for a design project.
 *
 * Two sections: a bead JSONLines import wizard and an export panel
 * for downloading project data.
 *
 * @module
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { resourceEntryKeys, templateKeys, fillingKeys, experimentDefKeys } from '@/lib/hooks/keys';

import { BeadImportWizard } from './io/bead-import-wizard';
import { BeadExportPanel } from './io/bead-export-panel';

// =============================================================================
// TYPES
// =============================================================================

interface IoPanelProps {
  readonly projectUri: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

function IoPanel({ projectUri }: IoPanelProps): React.JSX.Element {
  const queryClient = useQueryClient();

  const handleImportComplete = useCallback(() => {
    // Invalidate relevant caches so the UI reflects imported records
    queryClient.invalidateQueries({ queryKey: resourceEntryKeys.all });
    queryClient.invalidateQueries({ queryKey: templateKeys.all });
    queryClient.invalidateQueries({ queryKey: fillingKeys.all });
    queryClient.invalidateQueries({ queryKey: experimentDefKeys.all });
  }, [queryClient]);

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Import</CardTitle>
        </CardHeader>
        <CardContent>
          <BeadImportWizard projectUri={projectUri} onComplete={handleImportComplete} />
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Export</CardTitle>
        </CardHeader>
        <CardContent>
          <BeadExportPanel projectUri={projectUri} />
        </CardContent>
      </Card>

      {/* Project URI footer */}
      <div className="min-w-0">
        <p className="truncate font-mono text-xs text-muted-foreground">Project: {projectUri}</p>
      </div>
    </div>
  );
}

export { IoPanel };
