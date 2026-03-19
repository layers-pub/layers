'use client';

/**
 * File upload step for the import wizard.
 *
 * Fetches all 21 supported formats from the backend API and presents them
 * in a searchable, scrollable grid. The format can be auto-detected from
 * the file extension or manually selected by the user.
 *
 * @module
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, FileText, X, Search, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getBaseUrl } from '@/lib/api/client';

/**
 * Shape of a single format entry returned by GET /api/v1/import/formats.
 */
interface FormatInfo {
  readonly id: string;
  readonly name: string;
  readonly extensions: readonly string[];
  readonly description: string;
}

/** Fallback format map used when the API is unavailable. */
const FALLBACK_FORMATS: readonly FormatInfo[] = [
  {
    id: 'conllu',
    name: 'CoNLL-U',
    extensions: ['conllu', 'conll'],
    description: 'CoNLL-U annotation format',
  },
  {
    id: 'brat',
    name: 'brat standoff',
    extensions: ['ann', 'txt'],
    description: 'brat standoff annotation format',
  },
  { id: 'elan', name: 'ELAN', extensions: ['eaf'], description: 'ELAN annotation format' },
  {
    id: 'tei',
    name: 'TEI XML',
    extensions: ['xml', 'tei'],
    description: 'TEI XML annotation format',
  },
  {
    id: 'praat',
    name: 'Praat TextGrid',
    extensions: ['TextGrid'],
    description: 'Praat TextGrid annotation format',
  },
];

interface UploadStepProps {
  /** Callback fired when a file is selected and its format detected or chosen. */
  onFileSelect: (file: File, format: string) => void;
}

/**
 * Fetches the available import formats from the backend.
 */
async function fetchFormats(): Promise<readonly FormatInfo[]> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/import/formats`);
    if (!response.ok) return FALLBACK_FORMATS;

    const body = (await response.json()) as { formats?: FormatInfo[] };
    if (Array.isArray(body.formats) && body.formats.length > 0) {
      return body.formats;
    }
    return FALLBACK_FORMATS;
  } catch {
    return FALLBACK_FORMATS;
  }
}

/**
 * Detects the format from a file extension by matching against the available formats.
 */
function detectFormat(fileName: string, formats: readonly FormatInfo[]): FormatInfo | null {
  const lowerName = fileName.toLowerCase();
  for (const fmt of formats) {
    for (const ext of fmt.extensions) {
      if (lowerName.endsWith(`.${ext.toLowerCase()}`)) {
        return fmt;
      }
    }
  }
  return null;
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
 * Drag-and-drop file upload area with format selection from a dynamic list.
 *
 * On mount, fetches all 21 formats from the API. When a file is dropped or
 * selected, the format is auto-detected. The user can also manually choose
 * a format from the scrollable grid if auto-detection fails or they want
 * to override it.
 */
function UploadStep({ onFileSelect }: UploadStepProps): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FormatInfo | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [formats, setFormats] = useState<readonly FormatInfo[]>([]);
  const [isLoadingFormats, setIsLoadingFormats] = useState(true);
  const [formatSearch, setFormatSearch] = useState('');
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch formats on mount
  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const result = await fetchFormats();
      if (!cancelled) {
        setFormats(result);
        setIsLoadingFormats(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build the accepted extensions string for the file input
  const acceptedExtensions = useMemo(() => {
    if (formats.length === 0) return '';
    const exts = new Set<string>();
    for (const fmt of formats) {
      for (const ext of fmt.extensions) {
        exts.add(`.${ext}`);
      }
    }
    return Array.from(exts).join(',');
  }, [formats]);

  // Filter formats by search term
  const filteredFormats = useMemo(() => {
    if (!formatSearch.trim()) return formats;
    const term = formatSearch.toLowerCase();
    return formats.filter(
      (fmt) =>
        fmt.name.toLowerCase().includes(term) ||
        fmt.id.toLowerCase().includes(term) ||
        fmt.extensions.some((ext) => ext.toLowerCase().includes(term)),
    );
  }, [formats, formatSearch]);

  const handleFile = useCallback(
    (file: File) => {
      const detected = detectFormat(file.name, formats);
      if (detected) {
        setFormatError(null);
        setSelectedFile(file);
        setSelectedFormat(detected);
        setShowFormatPicker(false);
        onFileSelect(file, detected.name);
      } else {
        // Could not auto-detect; show the format picker
        setSelectedFile(file);
        setSelectedFormat(null);
        setShowFormatPicker(true);
        setFormatError(
          'Could not detect format from file extension. Please select a format below.',
        );
      }
    },
    [formats, onFileSelect],
  );

  const handleFormatSelect = useCallback(
    (fmt: FormatInfo) => {
      setSelectedFormat(fmt);
      setFormatError(null);
      setShowFormatPicker(false);
      if (selectedFile) {
        onFileSelect(selectedFile, fmt.name);
      }
    },
    [selectedFile, onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setSelectedFormat(null);
    setFormatError(null);
    setShowFormatPicker(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 transition-colors',
          isDragOver && 'border-primary bg-primary/5',
          !isDragOver && 'border-muted-foreground/25 hover:border-muted-foreground/50',
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">Drop your file here, or click to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isLoadingFormats
              ? 'Loading supported formats...'
              : `${formats.length} formats supported`}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptedExtensions}
        onChange={handleInputChange}
        className="hidden"
      />

      {formatError && <p className="text-sm text-destructive">{formatError}</p>}

      {selectedFile && selectedFormat && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
          </div>
          <Badge variant="secondary">{selectedFormat.name}</Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setShowFormatPicker(true);
              setSelectedFormat(null);
            }}
          >
            Change
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={clearFile}>
            <X className="h-4 w-4" />
            <span className="sr-only">Remove file</span>
          </Button>
        </div>
      )}

      {/* Format picker: shown when auto-detect fails or user clicks "Change" */}
      {(showFormatPicker || (selectedFile && !selectedFormat)) && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Select Format</p>
            {isLoadingFormats && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>

          {formats.length > 8 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search formats..."
                value={formatSearch}
                onChange={(e) => setFormatSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          )}

          <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
            {filteredFormats.map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => handleFormatSelect(fmt)}
                className={cn(
                  'flex flex-col items-start rounded-md border px-3 py-2 text-left text-xs transition-colors hover:bg-accent',
                  selectedFormat?.id === fmt.id && 'border-primary bg-primary/5',
                )}
              >
                <span className="font-medium">{fmt.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  .{fmt.extensions.slice(0, 3).join(', .')}
                </span>
              </button>
            ))}
            {filteredFormats.length === 0 && (
              <p className="col-span-full py-4 text-center text-xs text-muted-foreground">
                No formats match your search.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export type { UploadStepProps, FormatInfo };
export { UploadStep };
