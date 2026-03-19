'use client';

/**
 * Validation step for the import wizard.
 *
 * @module
 */

import { useEffect, useMemo } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { FieldMapping } from './mapping-step';
import type { OpticKind } from './optic-kind-badge';
import { OpticKindBadge } from './optic-kind-badge';

interface ValidationStepProps {
  /** Current field mappings. */
  mappings: FieldMapping[];
  /** Detected format name. */
  format: string;
  /** Callback fired when validation passes. */
  onValidated: () => void;
  /** The optic kind from a previous dry-run or import, if available. */
  opticKind?: OpticKind | null;
}

/**
 * Required target fields per format. At least one of the listed targets
 * must be present in the mappings for the format to be considered valid.
 */
const REQUIRED_TARGETS: Record<string, string[]> = {
  'CoNLL-U': ['text'],
  'CoNLL-2003': ['text'],
  BRAT: ['spanLabel', 'spanStart', 'spanEnd'],
  'BRAT (text)': ['spanLabel', 'spanStart', 'spanEnd'],
  ELAN: ['tierName', 'tierValue'],
  'TEI XML': ['text', 'pos', 'lemma'],
  'Praat TextGrid': ['tierName', 'tierValue'],
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates field mappings synchronously.
 *
 * Checks for: empty mappings, format-specific required targets,
 * empty source fields, and duplicate target mappings.
 */
function validateMappings(mappings: FieldMapping[], format: string): ValidationResult {
  const errors: string[] = [];

  // Check that at least one mapping exists
  if (mappings.length === 0) {
    errors.push('No field mappings defined. Add at least one mapping to continue.');
    return { valid: false, errors };
  }

  // Check for empty source fields
  const emptySourceIndices: number[] = [];
  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i];
    if (!mapping?.sourceField.trim()) {
      emptySourceIndices.push(i + 1);
    }
  }
  if (emptySourceIndices.length > 0) {
    errors.push(
      `Empty source field in mapping row${emptySourceIndices.length > 1 ? 's' : ''}: ${emptySourceIndices.join(', ')}.`,
    );
  }

  // Check for empty target fields
  const emptyTargetIndices: number[] = [];
  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i];
    if (!mapping?.targetField.trim()) {
      emptyTargetIndices.push(i + 1);
    }
  }
  if (emptyTargetIndices.length > 0) {
    errors.push(
      `Empty target field in mapping row${emptyTargetIndices.length > 1 ? 's' : ''}: ${emptyTargetIndices.join(', ')}.`,
    );
  }

  // Check for duplicate target field mappings
  const targetCounts = new Map<string, number>();
  for (const mapping of mappings) {
    if (!mapping.targetField.trim()) continue;
    const count = targetCounts.get(mapping.targetField) ?? 0;
    targetCounts.set(mapping.targetField, count + 1);
  }
  for (const [target, count] of targetCounts) {
    if (count > 1) {
      errors.push(
        `Target field "${target}" is mapped ${count} times. Each target should be mapped once.`,
      );
    }
  }

  // Check format-specific required targets
  const requiredTargets = REQUIRED_TARGETS[format];
  if (requiredTargets && requiredTargets.length > 0) {
    const mappedTargets = new Set(mappings.map((m) => m.targetField));
    const hasRequired = requiredTargets.some((t) => mappedTargets.has(t));
    if (!hasRequired) {
      const quotedTargets = requiredTargets.map((t) => `"${t}"`).join(', ');
      errors.push(
        `${format} format requires at least one of these target fields: ${quotedTargets}.`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates field mappings and displays the result.
 *
 * Runs validation synchronously on mount. Calls onValidated() immediately
 * if all checks pass; otherwise displays the list of errors.
 */
function ValidationStep({
  mappings,
  format,
  onValidated,
  opticKind,
}: ValidationStepProps): React.JSX.Element {
  const result = useMemo(() => validateMappings(mappings, format), [mappings, format]);

  useEffect(() => {
    if (result.valid) {
      onValidated();
    }
  }, [result.valid, onValidated]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Validation</CardTitle>
      </CardHeader>
      <CardContent>
        {result.valid ? (
          <div className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-green-600">Validation passed</p>
                {opticKind && <OpticKindBadge opticKind={opticKind} />}
              </div>
              <p className="text-xs text-muted-foreground">
                All {mappings.length} field mappings are valid. Ready to import.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
              <p className="text-sm font-medium text-destructive">Validation failed</p>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { ValidationStepProps };
export { ValidationStep };
