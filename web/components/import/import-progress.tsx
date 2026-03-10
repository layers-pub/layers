'use client';

/**
 * Import progress display for the import wizard.
 *
 * @module
 */

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getBaseUrl } from '@/lib/api/client';

import type { FieldMapping } from './mapping-step';

interface ImportProgressProps {
  /** The file to import. */
  file: File;
  /** The detected format name. */
  format: string;
  /** Field mappings configured by the user. */
  mappings: FieldMapping[];
  /** Callback fired when the import completes and the user acknowledges. */
  onComplete: () => void;
}

type ImportStatus = 'uploading' | 'processing' | 'complete' | 'error';

interface ImportSummary {
  expressions: number;
  segmentations: number;
  layers: number;
}

/**
 * Submits the file, format, and mappings to the import API endpoint.
 *
 * Returns the parsed JSON response body on success, or throws on failure.
 */
async function submitImport(
  file: File,
  format: string,
  mappings: FieldMapping[],
): Promise<Record<string, unknown>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('format', format);
  formData.append('mappings', JSON.stringify(mappings));

  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/v1/import`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const status = response.status;
    if (status === 404) {
      throw new Error(
        'Import endpoint not available. The server may not support this operation yet.',
      );
    }
    throw new Error(text || `Import failed with status ${status}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

/**
 * Extracts record counts from the API response body, falling back to zeros.
 */
function extractSummary(body: Record<string, unknown>): ImportSummary {
  const toNumber = (val: unknown): number => (typeof val === 'number' ? val : 0);

  // Try nested "counts" object first, then top-level keys
  const counts =
    typeof body['counts'] === 'object' && body['counts'] !== null
      ? (body['counts'] as Record<string, unknown>)
      : body;

  return {
    expressions: toNumber(counts['expressions']),
    segmentations: toNumber(counts['segmentations']),
    layers: toNumber(counts['layers'] ?? counts['annotationLayers']),
  };
}

/**
 * Submits an import request and displays progress through upload, processing,
 * and completion states.
 */
function ImportProgress({
  file,
  format,
  mappings,
  onComplete,
}: ImportProgressProps): React.JSX.Element {
  const [status, setStatus] = useState<ImportStatus>('uploading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runImport(): Promise<void> {
      try {
        setStatus('uploading');

        // Short delay so the user sees the "uploading" state
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (cancelled) return;

        setStatus('processing');

        const responseBody = await submitImport(file, format, mappings);
        if (cancelled) return;

        const importSummary = extractSummary(responseBody);
        setSummary(importSummary);
        setStatus('complete');
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
        setStatus('error');
      }
    }

    void runImport();

    return () => {
      cancelled = true;
    };
  }, [file, format, mappings]);

  const progressValue =
    status === 'uploading' ? 25 : status === 'processing' ? 60 : status === 'complete' ? 100 : 0;

  const statusLabel =
    status === 'uploading'
      ? 'Uploading file...'
      : status === 'processing'
        ? 'Processing import...'
        : status === 'complete'
          ? 'Import Complete'
          : 'Import Failed';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {status === 'complete' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : status === 'error' ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            {statusLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status !== 'error' && <Progress value={progressValue} className="h-2" />}

          {status === 'uploading' && (
            <p className="text-sm text-muted-foreground">Sending {file.name} to the server...</p>
          )}

          {status === 'processing' && (
            <p className="text-sm text-muted-foreground">
              The server is parsing and importing your {format} data.
            </p>
          )}

          {status === 'error' && <p className="text-sm text-destructive">{errorMessage}</p>}
        </CardContent>
      </Card>

      {status === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {summary &&
            (summary.expressions > 0 || summary.segmentations > 0 || summary.layers > 0) ? (
              <dl className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Expressions</dt>
                  <dd className="text-xl font-bold">{summary.expressions}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Segmentations</dt>
                  <dd className="text-xl font-bold">{summary.segmentations}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Annotation Layers</dt>
                  <dd className="text-xl font-bold">{summary.layers}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Import complete. Records have been submitted for indexing.
              </p>
            )}
            <Button className="mt-6" onClick={onComplete}>
              Done
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export type { ImportProgressProps };
export { ImportProgress };
