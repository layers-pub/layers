'use client';

/**
 * Multi-step import wizard for importing annotation data from external formats.
 *
 * @module
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

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
  isValidated: boolean;
  isImporting: boolean;
}

const INITIAL_STATE: WizardState = {
  currentStep: 'upload',
  file: null,
  format: null,
  mappings: [],
  isValidated: false,
  isImporting: false,
};

/**
 * Full import wizard with step navigation and state management.
 */
function ImportWizardContent(): React.JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  const currentStepIndex = STEPS.indexOf(state.currentStep);

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

  const handleValidated = useCallback(() => {
    setState((prev) => ({ ...prev, isValidated: true }));
  }, []);

  const handleImportComplete = useCallback(() => {
    router.push('/expressions');
  }, [router]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <StepIndicator steps={STEP_LABELS} currentStep={currentStepIndex} />
      <Separator />

      {state.currentStep === 'upload' && <UploadStep onFileSelect={handleFileSelect} />}

      {state.currentStep === 'preview' && state.file && state.format && (
        <PreviewStep file={state.file} format={state.format} />
      )}

      {state.currentStep === 'mapping' && state.format && (
        <MappingStep format={state.format} onMappingsChange={handleMappingsChange} />
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
