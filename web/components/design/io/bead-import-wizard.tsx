'use client';

/**
 * Step wizard for importing bead JSONLines files into a design project.
 *
 * Three steps: (1) Upload a .jsonl file, (2) Preview parsed items,
 * (3) Import records into the user's PDS with a progress indicator.
 *
 * @module
 */

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useAgent } from '@/lib/auth';
import {
  createResourceEntryRecord,
  createTemplateRecord,
  createFillingRecord,
  createExperimentDefRecord,
  syncRecordWithAppview,
} from '@/lib/atproto/record-creator';
import { readFileAsText, parseBeadJsonlines, type ParsedPreview } from '@/lib/import-parsers';

// =============================================================================
// TYPES
// =============================================================================

interface BeadImportWizardProps {
  readonly projectUri: string;
  readonly onComplete: () => void;
}

type WizardStep = 'upload' | 'preview' | 'import';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

interface ParsedRecord {
  type: string;
  data: Record<string, unknown>;
}

// =============================================================================
// HELPERS
// =============================================================================

function parseRecords(content: string): ParsedRecord[] {
  const lines = content.split('\n').filter((line) => line.trim().length > 0);
  const records: ParsedRecord[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      records.push({ type: String(parsed['type'] ?? 'unknown'), data: parsed });
    } catch {
      // Skip invalid lines
    }
  }

  return records;
}

// =============================================================================
// COMPONENT
// =============================================================================

function BeadImportWizard({ projectUri, onComplete }: BeadImportWizardProps): React.JSX.Element {
  const agent = useAgent();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [step, setStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Step 1: Handle file upload
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    try {
      const content = await readFileAsText(selectedFile);
      const previewData = parseBeadJsonlines(content);
      const records = parseRecords(content);

      setFile(selectedFile);
      setFileContent(content);
      setPreview(previewData);
      setParsedRecords(records);
      setStep('preview');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read file';
      toast.error(message);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // Step 3: Import records
  const handleImport = useCallback(async () => {
    if (!agent || parsedRecords.length === 0) {
      toast.error('Sign in to import records.');
      return;
    }

    setStep('import');
    setIsImporting(true);
    setImportProgress(0);

    const result: ImportResult = { total: parsedRecords.length, success: 0, failed: 0, errors: [] };

    for (let i = 0; i < parsedRecords.length; i++) {
      const record = parsedRecords[i]!;
      const progress = Math.round(((i + 1) / parsedRecords.length) * 100);
      setImportProgress(progress);

      try {
        let createdUri: string | undefined;

        switch (record.type) {
          case 'entry': {
            const data = record.data;
            const entryResult = await createResourceEntryRecord(agent, {
              form: String(data['form'] ?? ''),
              lemma: data['lemma'] ? String(data['lemma']) : undefined,
              languages: data['language'] ? [String(data['language'])] : [],
              features: data['features']
                ? {
                    entries: Object.entries(data['features'] as Record<string, string>).map(
                      ([key, value]) => ({ key, value }),
                    ),
                  }
                : undefined,
            });
            createdUri = entryResult.uri;
            break;
          }
          case 'template': {
            const data = record.data;
            const slots = Array.isArray(data['slots'])
              ? (data['slots'] as Array<Record<string, unknown>>).map((s) => ({
                  name: String(s['name'] ?? ''),
                  required: s['required'] !== false,
                  defaultValue: s['defaultValue'] ? String(s['defaultValue']) : undefined,
                  description: s['description'] ? String(s['description']) : undefined,
                }))
              : [];
            const templateResult = await createTemplateRecord(agent, {
              text: String(data['text'] ?? ''),
              name: data['name'] ? String(data['name']) : undefined,
              languages: data['language'] ? [String(data['language'])] : [],
              slots,
            });
            createdUri = templateResult.uri;
            break;
          }
          case 'filling': {
            const data = record.data;
            const slotFillingsRaw = data['slotFillings'] as Record<string, string> | undefined;
            const slotFillings = slotFillingsRaw
              ? Object.entries(slotFillingsRaw).map(([slotName, value]) => ({
                  slotName,
                  literalValue: value,
                }))
              : [];
            const fillingResult = await createFillingRecord(agent, {
              templateRef: String(data['templateRef'] ?? ''),
              slotFillings,
              renderedText: data['renderedText'] ? String(data['renderedText']) : undefined,
              strategy: data['strategy']
                ? (String(data['strategy']) as
                    | 'exhaustive'
                    | 'random'
                    | 'stratified'
                    | 'mlm'
                    | 'csp'
                    | 'mixed'
                    | 'manual'
                    | 'custom')
                : undefined,
            });
            createdUri = fillingResult.uri;
            break;
          }
          case 'experiment': {
            const data = record.data;
            const experimentResult = await createExperimentDefRecord(agent, {
              name: String(data['name'] ?? ''),
              description: data['description'] ? String(data['description']) : undefined,
              measureType: data['measureType']
                ? (String(data['measureType']) as
                    | 'acceptability'
                    | 'inference'
                    | 'similarity'
                    | 'plausibility'
                    | 'comprehension'
                    | 'preference'
                    | 'extraction'
                    | 'reading-time'
                    | 'production'
                    | 'custom')
                : undefined,
              taskType: data['taskType']
                ? (String(data['taskType']) as
                    | 'forced-choice'
                    | 'ordinal-scale'
                    | 'magnitude'
                    | 'binary'
                    | 'free-text'
                    | 'cloze'
                    | 'custom')
                : undefined,
            });
            createdUri = experimentResult.uri;
            break;
          }
          default: {
            result.failed++;
            result.errors.push(`Unknown record type: ${record.type}`);
            continue;
          }
        }

        // Best-effort immediate indexing
        if (createdUri) {
          try {
            await syncRecordWithAppview(createdUri, '');
          } catch {
            // Firehose will handle it
          }
        }

        result.success++;
      } catch (err) {
        result.failed++;
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`${record.type}: ${message}`);
      }
    }

    setImportResult(result);
    setIsImporting(false);

    if (result.failed === 0) {
      toast.success(`Successfully imported ${result.success} record(s).`);
    } else {
      toast.error(`Imported ${result.success}, failed ${result.failed}.`);
    }
  }, [agent, parsedRecords]);

  // Reset wizard
  const handleReset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setFileContent('');
    setPreview(null);
    setParsedRecords([]);
    setImportProgress(0);
    setImportResult(null);
  }, []);

  // Count record types
  const typeCounts = parsedRecords.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={step === 'upload' ? 'default' : 'secondary'}>1. Upload</Badge>
        <span className="text-muted-foreground">&gt;</span>
        <Badge variant={step === 'preview' ? 'default' : 'secondary'}>2. Preview</Badge>
        <span className="text-muted-foreground">&gt;</span>
        <Badge variant={step === 'import' ? 'default' : 'secondary'}>3. Import</Badge>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' ? (
        <div
          className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-muted-foreground/50"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          role="button"
          aria-label="Upload JSONLines file"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <Upload className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Drop a .jsonl file here or click to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Accepts bead JSONLines format (.jsonl)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jsonl,.jsonlines"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />
        </div>
      ) : null}

      {/* Step 2: Preview */}
      {step === 'preview' && preview ? (
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 rounded-md border p-3">
            <FileText className="size-5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file?.name}</p>
              <p className="text-xs text-muted-foreground">{parsedRecords.length} records found</p>
            </div>
          </div>

          {/* Type counts */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(typeCounts).map(([type, count]) => (
              <Badge key={type} variant="outline">
                {type}: {count}
              </Badge>
            ))}
          </div>

          {/* Preview table */}
          {preview.rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {preview.columns.map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((row, i) => (
                  <TableRow key={i}>
                    {row.map((cell, j) => (
                      <TableCell key={j} className="max-w-xs truncate text-sm">
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}

          {preview.rows.length < parsedRecords.length ? (
            <p className="text-xs text-muted-foreground">
              Showing first {preview.rows.length} of {parsedRecords.length} records
            </p>
          ) : null}

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset}>
              Back
            </Button>
            <Button onClick={handleImport}>Import {parsedRecords.length} Records</Button>
          </div>
        </div>
      ) : null}

      {/* Step 3: Import */}
      {step === 'import' ? (
        <div className="space-y-4">
          {isImporting ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                <p className="text-sm">Importing records...</p>
              </div>
              <Progress value={importProgress} />
              <p className="text-xs text-muted-foreground">{importProgress}% complete</p>
            </div>
          ) : importResult ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {importResult.failed === 0 ? (
                  <CheckCircle2 className="size-5 text-green-600" />
                ) : (
                  <XCircle className="size-5 text-destructive" />
                )}
                <p className="text-sm font-medium">
                  Import complete: {importResult.success} succeeded, {importResult.failed} failed
                </p>
              </div>

              {importResult.errors.length > 0 ? (
                <div className="max-h-40 overflow-y-auto rounded-md border p-3">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive">
                      {err}
                    </p>
                  ))}
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Import Another
                </Button>
                <Button onClick={onComplete}>Done</Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { BeadImportWizard };
export type { BeadImportWizardProps };
