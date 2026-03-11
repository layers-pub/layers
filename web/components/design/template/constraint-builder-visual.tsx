'use client';

/**
 * Visual constraint builder using dropdowns for operand/operator selection.
 *
 * Generates `python-expr` format constraint strings from user selections.
 * Supports simple single-condition constraints and AND-chained
 * multi-condition constraints.
 *
 * @module
 */

import { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { SlotSchema } from '@/lib/schemas/design';

/** Linguistic feature options for operand dropdowns. */
const FEATURE_OPTIONS = [
  { value: 'pos', label: 'POS' },
  { value: 'lemma', label: 'Lemma' },
  { value: 'form', label: 'Form' },
  { value: 'features.number', label: 'Number' },
  { value: 'features.tense', label: 'Tense' },
  { value: 'features.person', label: 'Person' },
  { value: 'features.gender', label: 'Gender' },
  { value: 'features.case', label: 'Case' },
  { value: 'features.mood', label: 'Mood' },
  { value: 'features.voice', label: 'Voice' },
  { value: 'features.aspect', label: 'Aspect' },
  { value: 'features.animacy', label: 'Animacy' },
  { value: 'features.definiteness', label: 'Definiteness' },
] as const;

/** Comparison operators. */
const OPERATORS = [
  { value: '==', label: '==' },
  { value: '!=', label: '!=' },
  { value: 'in', label: 'in' },
  { value: 'not in', label: 'not in' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts_with' },
] as const;

/** A single condition in a constraint expression. */
interface Condition {
  leftSlot: string;
  leftFeature: string;
  operator: string;
  rightKind: 'literal' | 'reference';
  rightValue: string;
  rightSlot: string;
  rightFeature: string;
}

function createEmptyCondition(): Condition {
  return {
    leftSlot: 'self',
    leftFeature: 'pos',
    operator: '==',
    rightKind: 'literal',
    rightValue: '',
    rightSlot: '',
    rightFeature: 'pos',
  };
}

/**
 * Converts a condition to a python-expr string.
 */
function conditionToExpression(condition: Condition): string {
  const left = `${condition.leftSlot}.${condition.leftFeature}`;

  if (condition.rightKind === 'reference') {
    const right = `${condition.rightSlot}.${condition.rightFeature}`;
    return `${left} ${condition.operator} ${right}`;
  }

  const val = condition.rightValue;
  if (condition.operator === 'in' || condition.operator === 'not in') {
    return `${left} ${condition.operator} [${val}]`;
  }
  return `${left} ${condition.operator} "${val}"`;
}

/**
 * Builds the full expression string from an array of conditions (AND-chained).
 */
function conditionsToExpression(conditions: Condition[]): string {
  if (conditions.length === 0) return '';
  if (conditions.length === 1) return conditionToExpression(conditions[0]!);
  return conditions.map(conditionToExpression).join(' and ');
}

interface ConstraintBuilderVisualProps {
  readonly slots: readonly SlotSchema[];
  readonly value: string;
  readonly onChange: (expression: string) => void;
}

function ConstraintBuilderVisual({
  slots,
  value,
  onChange,
}: ConstraintBuilderVisualProps): React.JSX.Element {
  const [conditions, setConditions] = useState<Condition[]>(() => {
    if (!value) return [createEmptyCondition()];
    // If there's an existing expression we can't parse, start with one empty condition
    return [createEmptyCondition()];
  });

  const slotOptions = [
    { value: 'self', label: 'self' },
    ...slots.map((s) => ({ value: s.name, label: s.name })),
  ];

  const updateCondition = useCallback(
    (index: number, updates: Partial<Condition>) => {
      const next = conditions.map((c, i) => (i === index ? { ...c, ...updates } : c));
      setConditions(next);
      onChange(conditionsToExpression(next));
    },
    [conditions, onChange],
  );

  function addCondition(): void {
    const next = [...conditions, createEmptyCondition()];
    setConditions(next);
    onChange(conditionsToExpression(next));
  }

  function removeCondition(index: number): void {
    if (conditions.length <= 1) return;
    const next = conditions.filter((_, i) => i !== index);
    setConditions(next);
    onChange(conditionsToExpression(next));
  }

  return (
    <div className="space-y-3">
      {conditions.map((condition, index) => (
        <div key={index} className="space-y-2">
          {index > 0 && (
            <p className="text-center text-xs font-medium text-muted-foreground">AND</p>
          )}

          <div className="flex flex-wrap items-end gap-2">
            {/* Left operand: slot.feature */}
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[10px] text-muted-foreground">Slot</p>
              <Select
                value={condition.leftSlot}
                onValueChange={(val) => updateCondition(index, { leftSlot: val ?? '' })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {slotOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[10px] text-muted-foreground">Feature</p>
              <Select
                value={condition.leftFeature}
                onValueChange={(val) => updateCondition(index, { leftFeature: val ?? 'pos' })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEATURE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Operator */}
            <div className="min-w-0">
              <p className="mb-1 text-[10px] text-muted-foreground">Op</p>
              <Select
                value={condition.operator}
                onValueChange={(val) => updateCondition(index, { operator: val ?? '==' })}
              >
                <SelectTrigger className="h-8 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Right operand kind toggle */}
            <div className="min-w-0">
              <p className="mb-1 text-[10px] text-muted-foreground">Value type</p>
              <Select
                value={condition.rightKind}
                onValueChange={(val) =>
                  updateCondition(index, {
                    rightKind: (val ?? 'literal') as 'literal' | 'reference',
                  })
                }
              >
                <SelectTrigger className="h-8 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="literal">Literal</SelectItem>
                  <SelectItem value="reference">Slot ref</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Right operand */}
            {condition.rightKind === 'literal' ? (
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[10px] text-muted-foreground">Value</p>
                <Input
                  value={condition.rightValue}
                  onChange={(e) => updateCondition(index, { rightValue: e.target.value })}
                  placeholder="VERB"
                  className="h-8 text-xs"
                />
              </div>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] text-muted-foreground">Ref slot</p>
                  <Select
                    value={condition.rightSlot}
                    onValueChange={(val) => updateCondition(index, { rightSlot: val ?? '' })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {slotOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] text-muted-foreground">Ref feature</p>
                  <Select
                    value={condition.rightFeature}
                    onValueChange={(val) => updateCondition(index, { rightFeature: val ?? 'pos' })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEATURE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Remove condition */}
            {conditions.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => removeCondition(index)}
                aria-label="Remove condition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addCondition} className="text-xs">
        <Plus className="mr-1 h-3 w-3" />
        Add condition
      </Button>
    </div>
  );
}

export { ConstraintBuilderVisual, conditionsToExpression, conditionToExpression };
