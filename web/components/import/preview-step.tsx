'use client';

/**
 * Data preview step for the import wizard.
 *
 * @module
 */

import { useEffect, useState } from 'react';
import { AlertCircle, FileText, CheckCircle2, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ParsedPreview } from '@/lib/import-parsers';
import { readFileAsText, parseFileContent } from '@/lib/import-parsers';

import { FormatDetailsCard } from './format-details-card';

interface PreviewStepProps {
  /** The uploaded file. */
  file: File;
  /** The detected format name. */
  format: string;
}

/**
 * Formats a byte count as a human-readable string.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Shows a preview of parsed data with summary statistics and a sample table.
 *
 * Reads the uploaded file, parses it client-side based on the detected format,
 * and displays the first 10 rows along with estimated record counts.
 */
function PreviewStep({ file, format }: PreviewStepProps): React.JSX.Element {
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function parseFile(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const content = await readFileAsText(file);
        if (cancelled) return;

        const parsed = parseFileContent(content, format);
        if (cancelled) return;

        setPreview(parsed);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to parse file');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void parseFile();

    return () => {
      cancelled = true;
    };
  }, [file, format]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Parsing {file.name}...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">Failed to parse file</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground">No preview data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            File Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">File</dt>
              <dd className="truncate font-medium">{file.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Size</dt>
              <dd className="font-medium">{formatFileSize(file.size)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Format</dt>
              <dd>
                <Badge variant="secondary">{format}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Parsed
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estimated Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-2xl font-bold">{preview.counts.expressions}</span>
              <span className="ml-1 text-muted-foreground">expressions</span>
            </div>
            <div>
              <span className="text-2xl font-bold">{preview.counts.segmentations}</span>
              <span className="ml-1 text-muted-foreground">segmentations</span>
            </div>
            <div>
              <span className="text-2xl font-bold">{preview.counts.layers}</span>
              <span className="ml-1 text-muted-foreground">annotation layers</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Data Preview (first {Math.min(preview.rows.length, 10)} entries)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {preview.rows.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No data rows found in the file.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.columns.map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row, rowIdx) => (
                    <TableRow key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <TableCell key={cellIdx} className="font-mono text-xs">
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {preview.metadata != null && Object.keys(preview.metadata).length > 0 && (
        <FormatDetailsCard metadata={preview.metadata} format={format} />
      )}
    </div>
  );
}

export type { PreviewStepProps };
export { PreviewStep };
