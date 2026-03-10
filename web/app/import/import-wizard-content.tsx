'use client';

/**
 * Multi-step import wizard for importing annotation data from external formats.
 *
 * @module
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  StepIndicator,
  UploadStep,
  PreviewStep,
  MappingStep,
  ValidationStep,
  ImportProgress,
} from '@/components/import';
import type { FieldMapping } from '@/components/import';
import { useWizardPersistence } from '@/lib/hooks/use-wizard-persistence';
import type { WizardPersistedState } from '@/lib/hooks/use-wizard-persistence';
import { events } from '@/lib/observability/custom-events';

type WizardStep = 'upload' | 'preview' | 'mapping' | 'validation' | 'importing';

const STEPS: WizardStep[] = ['upload', 'preview', 'mapping', 'validation', 'importing'];
const STEP_LABELS = ['Upload', 'Preview', 'Mapping', 'Validation', 'Import'];

/**
 * State machine for the import wizard.
 */
interface WizardState {
  currentStep: WizardStep;
  file: File | null;
  format: string | null;
  mappings: FieldMapping[];
  previewRows: string[][] | null;
  isValidated: boolean;
  isImporting: boolean;
}

const INITIAL_STATE: WizardState = {
  currentStep: 'upload',
  file: null,
  format: null,
  mappings: [],
  previewRows: null,
  isValidated: false,
  isImporting: false,
};

/**
 * Converts a step index to a WizardStep, clamped to the valid range.
 */
function indexToStep(index: number): WizardStep {
  const clamped = Math.max(0, Math.min(index, STEPS.length - 1));
  return STEPS[clamped]!;
}

/**
 * Full import wizard with step navigation, state management, and localStorage persistence.
 */
function ImportWizardContent(): React.JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const { savedState, showResumeBanner, acceptResume, startFresh, saveState, clearSavedState } =
    useWizardPersistence();

  const currentStepIndex = STEPS.indexOf(state.currentStep);
  const importStartTimeRef = useRef<number>(0);

  // Track import start when entering the importing step
  useEffect(() => {
    if (state.currentStep === 'importing' && state.file && state.format) {
      importStartTimeRef.current = performance.now();
      events.importStart({ format: state.format, fileSize: state.file.size });
    }
  }, [state.currentStep, state.file, state.format]);

  // Persist state whenever step or mappings change
  useEffect(() => {
    // Do not persist the initial state or while the resume banner is showing
    if (showResumeBanner) return;
    if (state.currentStep === 'upload' && state.file === null) return;

    const persisted: WizardPersistedState = {
      step: currentStepIndex,
      format: state.format,
      fileName: state.file?.name ?? null,
      fileSize: state.file?.size ?? null,
      mappings: state.mappings,
      previewRows: state.previewRows,
      savedAt: Date.now(),
    };
    saveState(persisted);
  }, [
    state.currentStep,
    state.format,
    state.file,
    state.mappings,
    state.previewRows,
    currentStepIndex,
    saveState,
    showResumeBanner,
  ]);

  // Restore state when user accepts the resume prompt
  const handleResume = useCallback(() => {
    if (!savedState) return;

    const restoredStep = indexToStep(savedState.step);
    // If the restored step requires a file (any step beyond upload) but we
    // cannot restore File objects, reset to the upload step so the user
    // can re-upload the same file.
    const needsFile = savedState.step > 0;

    setState({
      currentStep: needsFile ? 'upload' : restoredStep,
      file: null, // File objects are not serializable
      format: savedState.format,
      mappings: savedState.mappings,
      previewRows: savedState.previewRows,
      isValidated: false,
      isImporting: false,
    });
    acceptResume();
  }, [savedState, acceptResume]);

  const canGoNext = (): boolean => {
    switch (state.currentStep) {
      case 'upload':
        return state.file !== null && state.format !== null;
      case 'preview':
        return true;
      case 'mapping':
        return state.mappings.length > 0;
      case 'validation':
        return state.isValidated;
      case 'importing':
        return false;
      default:
        return false;
    }
  };

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= STEPS.length) return;
    const nextStep = STEPS[nextIndex]!;

    setState((prev) => ({
      ...prev,
      currentStep: nextStep,
      isImporting: nextStep === 'importing',
    }));
  }, [currentStepIndex]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex < 0) return;
    setState((prev) => ({
      ...prev,
      currentStep: STEPS[prevIndex]!,
      isImporting: false,
    }));
  }, [currentStepIndex]);

  const handleFileSelect = useCallback((file: File, format: string) => {
    setState((prev) => ({ ...prev, file, format }));
  }, []);

  const handleMappingsChange = useCallback((mappings: FieldMapping[]) => {
    setState((prev) => ({ ...prev, mappings }));
  }, []);

  const handlePreviewReady = useCallback((rows: string[][]) => {
    setState((prev) => ({ ...prev, previewRows: rows }));
  }, []);

  const handleValidated = useCallback(() => {
    setState((prev) => ({ ...prev, isValidated: true }));
  }, []);

  const handleImportComplete = useCallback(() => {
    const durationMs =
      importStartTimeRef.current > 0
        ? Math.round(performance.now() - importStartTimeRef.current)
        : 0;
    events.importComplete({
      format: state.format ?? 'unknown',
      expressions: 0,
      segmentations: 0,
      layers: 0,
      durationMs,
    });
    clearSavedState();
    router.push('/expressions');
  }, [router, clearSavedState, state.format]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {showResumeBanner && savedState && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <AlertCircle className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-medium">Resume previous import session?</p>
            <p className="text-xs text-muted-foreground">
              {savedState.fileName
                ? `File: ${savedState.fileName} (${savedState.format})`
                : `Format: ${savedState.format}`}
              {' - '}
              Step {savedState.step + 1} of {STEPS.length}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={startFresh}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Start Fresh
            </Button>
            <Button size="sm" onClick={handleResume}>
              Resume
            </Button>
          </div>
        </div>
      )}

      <StepIndicator steps={STEP_LABELS} currentStep={currentStepIndex} />
      <Separator />

      {state.currentStep === 'upload' && <UploadStep onFileSelect={handleFileSelect} />}

      {state.currentStep === 'preview' && state.file && state.format && (
        <PreviewStep file={state.file} format={state.format} onPreviewReady={handlePreviewReady} />
      )}

      {state.currentStep === 'mapping' && state.format && (
        <MappingStep
          format={state.format}
          onMappingsChange={handleMappingsChange}
          previewData={state.previewRows ?? undefined}
        />
      )}

      {state.currentStep === 'validation' && state.format && (
        <ValidationStep
          mappings={state.mappings}
          format={state.format}
          onValidated={handleValidated}
        />
      )}

      {state.currentStep === 'importing' && state.file && state.format && (
        <ImportProgress
          file={state.file}
          format={state.format}
          mappings={state.mappings}
          onComplete={handleImportComplete}
        />
      )}

      {state.currentStep !== 'importing' && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={goBack} disabled={currentStepIndex === 0}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button onClick={goNext} disabled={!canGoNext()}>
              {state.currentStep === 'validation' ? 'Start Import' : 'Next'}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export { ImportWizardContent };
