'use client';

/**
 * Export panel for downloading project data as bead JSONLines.
 *
 * Provides checkboxes for selecting which resource types to include
 * in the export (entries, templates, fillings, experiments), shows
 * item counts fetched from hooks, and triggers a file download.
 *
 * @module
 */

import { useState, useCallback, useMemo } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

import { useCurrentUser } from '@/lib/auth';
import {
  useProjectTemplates,
  useCollectionEntries,
  useProjectCollection,
} from '@/lib/hooks/use-design';
import { exportProjectToBeadJsonlines, type ProjectExportData } from '@/lib/bead-export';

// =============================================================================
// TYPES
// =============================================================================

interface BeadExportPanelProps {
  readonly projectUri: string;
}

type ExportType = 'entries' | 'templates' | 'fillings' | 'experiments';

// =============================================================================
// COMPONENT
// =============================================================================

function BeadExportPanel({ projectUri }: BeadExportPanelProps): React.JSX.Element {
  const user = useCurrentUser();
  const userDid = user?.did ?? '';

  // Selection state
  const [selected, setSelected] = useState<Set<ExportType>>(
    new Set(['entries', 'templates', 'fillings', 'experiments']),
  );
  const [isExporting, setIsExporting] = useState(false);

  // Fetch data for counts
  const { data: collectionData, isLoading: collectionLoading } = useProjectCollection(projectUri);
  const { data: entriesData, isLoading: entriesLoading } = useCollectionEntries(projectUri, {
    limit: 1,
  });
  const { data: templatesData, isLoading: templatesLoading } = useProjectTemplates(userDid);

  // Compute counts
  const entryCount = entriesData?.memberships?.length ?? 0;
  const templateCount = templatesData?.records?.length ?? 0;
  const projectName = collectionData?.value?.name ?? 'project';

  // Toggle a resource type
  const handleToggle = useCallback((type: ExportType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Export types with their display info
  const exportTypes = useMemo(
    () => [
      {
        type: 'entries' as ExportType,
        label: 'Entries',
        count: entryCount,
        loading: entriesLoading,
      },
      {
        type: 'templates' as ExportType,
        label: 'Templates',
        count: templateCount,
        loading: templatesLoading,
      },
      {
        type: 'fillings' as ExportType,
        label: 'Fillings',
        count: null, // Not fetched in summary
        loading: false,
      },
      {
        type: 'experiments' as ExportType,
        label: 'Experiments',
        count: null, // Not fetched in summary
        loading: false,
      },
    ],
    [entryCount, templateCount, entriesLoading, templatesLoading],
  );

  // Perform the export
  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      const projectData: ProjectExportData = {};

      // Collect entries from memberships
      if (selected.has('entries') && entriesData?.memberships) {
        projectData.entries = entriesData.memberships
          .filter((m) => m.entry)
          .map((m) => ({
            form: m.entry!.form ?? '',
            lemma: m.entry!.lemma,
            language: m.entry!.language,
            features: m.entry!.features as
              | { entries: Array<{ key: string; value: string }> }
              | undefined,
          }));
      }

      // Collect templates
      if (selected.has('templates') && templatesData?.records) {
        projectData.templates = templatesData.records
          .filter((t) => t.value)
          .map((t) => ({
            name: t.value!.name,
            text: t.value!.text ?? '',
            language: t.value!.language,
            slots: (t.value!.slots ?? []).map((s) => ({
              name: s.name,
              required: s.required,
              defaultValue: s.defaultValue,
              description: s.description,
            })),
            constraints: t.value!.constraints?.map((c) => ({
              expression: c.expression,
              expressionFormatUri: c.expressionFormat,
              description: c.description,
            })),
          }));
      }

      const jsonl = exportProjectToBeadJsonlines(projectData);

      // Trigger file download
      const blob = new Blob([jsonl], { type: 'application/jsonl' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;

      // Clean project name for filename
      const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
      anchor.download = `${safeName}-export.jsonl`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success('Export downloaded successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }, [selected, entriesData, templatesData, projectName]);

  const hasSelection = selected.size > 0;

  return (
    <div className="space-y-4">
      {/* Resource type checkboxes */}
      <div className="space-y-3">
        {exportTypes.map(({ type, label, count, loading }) => (
          <div key={type} className="flex items-center gap-3">
            <Checkbox
              id={`export-${type}`}
              checked={selected.has(type)}
              onCheckedChange={() => handleToggle(type)}
            />
            <Label htmlFor={`export-${type}`} className="flex items-center gap-2">
              {label}
              {loading ? (
                <Skeleton className="h-5 w-8" />
              ) : count !== null ? (
                <Badge variant="secondary" className="text-xs">
                  {count}
                </Badge>
              ) : null}
            </Label>
          </div>
        ))}
      </div>

      {/* Export buttons */}
      <div className="flex items-center gap-2">
        <Button disabled={!hasSelection || isExporting} onClick={handleExport}>
          {isExporting ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          Export Selected
        </Button>
        <Button
          variant="outline"
          disabled={isExporting}
          onClick={() => {
            setSelected(new Set(['entries', 'templates', 'fillings', 'experiments']));
            handleExport();
          }}
        >
          Export All
        </Button>
      </div>
    </div>
  );
}

export { BeadExportPanel };
export type { BeadExportPanelProps };
