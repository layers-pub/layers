/**
 * Horizontal step indicator for multi-step wizards.
 *
 * @module
 */

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  /** Ordered list of step labels. */
  steps: string[];
  /** Zero-based index of the current step. */
  currentStep: number;
}

/**
 * Renders a horizontal step indicator with dots, labels, and connecting lines.
 * Completed steps show a checkmark, the current step is highlighted, and
 * future steps are dimmed.
 */
function StepIndicator({ steps, currentStep }: StepIndicatorProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((label, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                  isCompleted && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary bg-background text-primary',
                  !isCompleted &&
                    !isCurrent &&
                    'border-muted-foreground/30 text-muted-foreground/50',
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  isCurrent && 'text-foreground',
                  isCompleted && 'text-muted-foreground',
                  !isCompleted && !isCurrent && 'text-muted-foreground/50',
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'mx-2 mt-[-1.25rem] h-0.5 w-12 sm:w-16',
                  index < currentStep ? 'bg-primary' : 'bg-muted-foreground/20',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export type { StepIndicatorProps };
export { StepIndicator };
