'use client';

/**
 * Editor for experiment list constraints.
 *
 * Each row defines a constraint on item list construction (Latin square
 * balancing, no-adjacent-same-condition, etc.). Rows can be added and
 * removed, each with a kind selector, target property, key-value parameters,
 * and an optional constraint expression.
 *
 * @module
 */

import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { LIST_CONSTRAINT_KINDS, type ListConstraintFormValues } from '@/lib/schemas/design';

// =============================================================================
// TYPES
// =============================================================================

interface ListConstraintEditorProps {
  readonly constraints: ListConstraintFormValues[];
  readonly onChange: (constraints: ListConstraintFormValues[]) => void;
}

// =============================================================================
// SINGLE CONSTRAINT ROW
// =============================================================================

function ConstraintRow({
  constraint,
  index,
  onChange,
  onRemove,
}: {
  readonly constraint: ListConstraintFormValues;
  readonly index: number;
  readonly onChange: (index: number, updated: ListConstraintFormValues) => void;
  readonly onRemove: (index: number) => void;
}): React.JSX.Element {
  function updateField<K extends keyof ListConstraintFormValues>(
    field: K,
    value: ListConstraintFormValues[K],
  ): void {
    onChange(index, { ...constraint, [field]: value });
  }

  function addParameter(): void {
    const params = constraint.parameters ?? [];
    updateField('parameters', [...params, { key: '', value: '' }]);
  }

  function updateParameter(paramIndex: number, field: 'key' | 'value', val: string): void {
    const params = [...(constraint.parameters ?? [])];
    const updated = { ...params[paramIndex]!, [field]: val };
    params[paramIndex] = updated;
    updateField('parameters', params);
  }

  function removeParameter(paramIndex: number): void {
    const params = (constraint.parameters ?? []).filter((_, i) => i !== paramIndex);
    updateField('parameters', params);
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          <Label>Constraint Kind</Label>
          <Select value={constraint.kind} onValueChange={(val) => updateField('kind', val)}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select kind" />
            </SelectTrigger>
            <SelectContent>
              {LIST_CONSTRAINT_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {kind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="mt-6"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">Remove constraint</span>
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label>Target Property</Label>
        <Input
          value={constraint.targetProperty ?? ''}
          onChange={(e) => updateField('targetProperty', e.target.value)}
          placeholder="e.g., condition, templateRef"
          className="h-8 text-sm"
        />
      </div>

      {/* Parameters (key-value pairs) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Parameters</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addParameter}
            className="h-6 text-[10px]"
          >
            <Plus className="mr-0.5 h-2.5 w-2.5" />
            Add
          </Button>
        </div>
        {(constraint.parameters ?? []).map((param, pi) => (
          <div key={pi} className="flex items-center gap-2">
            <Input
              value={param.key}
              onChange={(e) => updateParameter(pi, 'key', e.target.value)}
              placeholder="Key"
              className="h-7 flex-1 text-xs"
            />
            <Input
              value={param.value}
              onChange={(e) => updateParameter(pi, 'value', e.target.value)}
              placeholder="Value"
              className="h-7 flex-1 text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeParameter(pi)}
              className="h-7 px-1"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Optional constraint expression */}
      <div className="space-y-1.5">
        <Label className="text-xs">Constraint Expression (optional)</Label>
        <Textarea
          value={constraint.constraintExpression ?? ''}
          onChange={(e) => updateField('constraintExpression', e.target.value)}
          placeholder="e.g., self.condition != prev.condition"
          className="h-16 font-mono text-xs"
        />
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function ListConstraintEditor({
  constraints,
  onChange,
}: ListConstraintEditorProps): React.JSX.Element {
  function addConstraint(): void {
    onChange([...constraints, { kind: '', targetProperty: '', parameters: [] }]);
  }

  function updateConstraint(index: number, updated: ListConstraintFormValues): void {
    const next = constraints.map((c, i) => (i === index ? updated : c));
    onChange(next);
  }

  function removeConstraint(index: number): void {
    onChange(constraints.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {constraints.length === 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No list constraints. Constraints control how items are distributed to participants.
        </p>
      )}

      {constraints.map((constraint, i) => (
        <ConstraintRow
          key={i}
          constraint={constraint}
          index={i}
          onChange={updateConstraint}
          onRemove={removeConstraint}
        />
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addConstraint}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add Constraint
      </Button>
    </div>
  );
}

export { ListConstraintEditor };
