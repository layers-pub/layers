'use client';

/**
 * Experiment preview panel.
 *
 * Triggers useSidecarExperimentPreview to generate a jsPsych preview, then
 * renders the result in a sandboxed iframe. Shows loading and error states
 * gracefully when the sidecar service is unavailable.
 *
 * @module
 */

import { useState } from 'react';
import { Play, Loader2, AlertCircle, FlaskConical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useSidecarExperimentPreview, type ExperimentPreviewResult } from '@/lib/hooks/use-sidecar';

// =============================================================================
// TYPES
// =============================================================================

interface ExperimentPreviewPanelProps {
  readonly experimentRef: string;
  readonly fillingRefs: string[];
  readonly maxTrials?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

function ExperimentPreviewPanel({
  experimentRef,
  fillingRefs,
  maxTrials = 5,
}: ExperimentPreviewPanelProps): React.JSX.Element {
  const previewMutation = useSidecarExperimentPreview();
  const [previewResult, setPreviewResult] = useState<ExperimentPreviewResult | null>(null);

  async function handleGeneratePreview(): Promise<void> {
    try {
      const result = await previewMutation.mutateAsync({
        experimentRef,
        fillingRefs,
        maxTrials,
      });
      setPreviewResult(result);
    } catch {
      // Error state handled by mutation
    }
  }

  const canPreview = Boolean(experimentRef);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            <FlaskConical className="mr-1.5 inline-block h-3.5 w-3.5" />
            Preview
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePreview}
            disabled={!canPreview || previewMutation.isPending}
          >
            {previewMutation.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Play className="mr-1 h-3 w-3" />
            )}
            Generate Preview
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Initial state */}
        {!previewResult && !previewMutation.isPending && !previewMutation.isError && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FlaskConical className="mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Click &quot;Generate Preview&quot; to see a sample experiment trial.
            </p>
            {!canPreview && (
              <p className="mt-1 text-xs text-muted-foreground">
                Save the experiment first to enable preview.
              </p>
            )}
          </div>
        )}

        {/* Loading state */}
        {previewMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Generating preview...</p>
          </div>
        )}

        {/* Error state */}
        {previewMutation.isError && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Preview requires sidecar service</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              The preview sidecar is not available. Ensure the sidecar service is running and try
              again.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleGeneratePreview}>
              Retry
            </Button>
          </div>
        )}

        {/* Preview result */}
        {previewResult && !previewMutation.isPending && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{previewResult.trialCount} sample trials</span>
              <span>
                Estimated duration: {Math.round(previewResult.estimatedDurationMs / 1000)}s
              </span>
            </div>
            <div className="overflow-hidden rounded-md border">
              <iframe
                srcDoc={buildPreviewHtml(previewResult)}
                sandbox="allow-scripts"
                title="Experiment preview"
                className="h-96 w-full"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Builds a minimal HTML document from the preview timeline data.
 *
 * The sidecar returns a jsPsych timeline array; this wraps it in a basic
 * HTML scaffold for rendering in the sandboxed iframe.
 */
function buildPreviewHtml(result: ExperimentPreviewResult): string {
  const timelineJson = JSON.stringify(result.timeline, null, 2);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 16px;
      color: #1a1a2e;
      background: #fafafa;
    }
    .trial { margin-bottom: 12px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; background: white; }
    .trial-index { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
    .trial-content { font-size: 14px; }
    .trial-type { font-size: 11px; color: #3b82f6; margin-top: 4px; }
    pre { font-size: 11px; background: #f3f4f6; padding: 8px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h3 style="margin-top:0;font-size:14px;">Preview Timeline (${result.trialCount} trials)</h3>
  <pre>${escapeHtml(timelineJson)}</pre>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { ExperimentPreviewPanel };
