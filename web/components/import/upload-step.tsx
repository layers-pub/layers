'use client';

/**
 * File upload step for the import wizard.
 *
 * @module
 */

import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/** Map of file extensions to format display names. */
const FORMAT_MAP: Record<string, string> = {
  '.conllu': 'CoNLL-U',
  '.conll': 'CoNLL-2003',
  '.ann': 'BRAT',
  '.txt': 'BRAT (text)',
  '.eaf': 'ELAN',
  '.xml': 'TEI XML',
  '.textgrid': 'Praat TextGrid',
  '.TextGrid': 'Praat TextGrid',
};

const ACCEPTED_EXTENSIONS = Object.keys(FORMAT_MAP);

interface UploadStepProps {
  /** Callback fired when a file is selected and its format detected. */
  onFileSelect: (file: File, format: string) => void;
}

/**
 * Detects the annotation format from a file's extension.
 */
function detectFormat(fileName: string): string | null {
  const lowerName = fileName.toLowerCase();
  for (const [ext, format] of Object.entries(FORMAT_MAP)) {
    if (lowerName.endsWith(ext.toLowerCase())) {
      return format;
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
 * Drag-and-drop file upload area with format detection.
 */
function UploadStep({ onFileSelect }: UploadStepProps): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const format = detectFormat(file.name);
      if (!format) {
        setFormatError(
          `Unsupported file type. Accepted formats: ${ACCEPTED_EXTENSIONS.join(', ')}`,
        );
        setSelectedFile(null);
        setDetectedFormat(null);
        return;
      }

      setFormatError(null);
      setSelectedFile(file);
      setDetectedFormat(format);
      onFileSelect(file, format);
    },
    [onFileSelect],
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
    setDetectedFormat(null);
    setFormatError(null);
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
            Supported: CoNLL-U, BRAT (.ann + .txt), ELAN (.eaf), TEI XML, Praat TextGrid
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".conllu,.conll,.ann,.txt,.eaf,.xml,.textgrid,.TextGrid"
        onChange={handleInputChange}
        className="hidden"
      />

      {formatError && <p className="text-sm text-destructive">{formatError}</p>}

      {selectedFile && detectedFormat && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
          </div>
          <Badge variant="secondary">{detectedFormat}</Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={clearFile}>
            <X className="h-4 w-4" />
            <span className="sr-only">Remove file</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export type { UploadStepProps };
export { UploadStep };
