'use client';

/**
 * Constraint editor with visual builder and raw DSL modes.
 *
 * Provides a toggle between a dropdown-based visual builder and a raw
 * monospace textarea for direct DSL expression editing. Description and
 * scope fields are always visible.
 *
 * @module
 */

import { useState } from 'react';
import { Code, Layers, Trash2 } from 'lucide-react';

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

import type { ConstraintSchema, SlotSchema } from '@/lib/schemas/design';
import { ConstraintBuilderVisual } from './constraint-builder-visual';

type ConstraintMode = 'visual' | 'raw';

interface ConstraintEditorProps {
  readonly constraint: ConstraintSchema;
  readonly onChange: (constraint: ConstraintSchema) => void;
  readonly onRemove: () => void;
  readonly slots: readonly SlotSchema[];
  readonly index: number;
}

function ConstraintEditor({
  constraint,
  onChange,
  onRemove,
  slots,
  index,
}: ConstraintEditorProps): React.JSX.Element {
  const [mode, setMode] = useState<ConstraintMode>('visual');

  function updateField<K extends keyof ConstraintSchema>(key: K, value: ConstraintSchema[K]): void {
    onChange({ ...constraint, [key]: value });
  }

  return (
    <div className="rounded-md border p-3 space-y-3">
      {/* Header: label + mode toggle + remove */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Constraint {index + 1}</p>
        <div className="flex items-center gap-1">
          <Button
            variant={mode === 'visual' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setMode('visual')}
            aria-label="Visual mode"
          >
            <Layers className="mr-1 h-3 w-3" />
            Visual
          </Button>
          <Button
            variant={mode === 'raw' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setMode('raw')}
            aria-label="Raw mode"
          >
            <Code className="mr-1 h-3 w-3" />
            Advanced
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            onClick={onRemove}
            aria-label={`Remove constraint ${index + 1}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Expression editor (visual or raw) */}
      {mode === 'visual' ? (
        <ConstraintBuilderVisual
          slots={slots}
          value={constraint.expression}
          onChange={(expr) => updateField('expression', expr)}
        />
      ) : (
        <div>
          <Label htmlFor={`constraint-expr-${index}`} className="text-xs">
            Expression (python-expr)
          </Label>
          <Textarea
            id={`constraint-expr-${index}`}
            value={constraint.expression}
            onChange={(e) => updateField('expression', e.target.value)}
            placeholder='self.pos == "VERB" and self.features.number == "sg"'
            className="mt-1 min-h-[60px] font-mono text-xs"
            rows={3}
          />
        </div>
      )}

      {/* Description + scope (always visible) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`constraint-desc-${index}`} className="text-xs">
            Description
          </Label>
          <Input
            id={`constraint-desc-${index}`}
            value={constraint.description ?? ''}
            onChange={(e) => updateField('description', e.target.value || undefined)}
            placeholder="Describe this constraint"
            className="mt-1 h-8 text-xs"
          />
        </div>

        <div>
          <Label htmlFor={`constraint-scope-${index}`} className="text-xs">
            Scope
          </Label>
          <Select
            value={constraint.scope ?? ''}
            onValueChange={(val) => updateField('scope', val || undefined)}
          >
            <SelectTrigger className="mt-1 h-8 text-xs" id={`constraint-scope-${index}`}>
              <SelectValue placeholder="Select scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slot">Slot</SelectItem>
              <SelectItem value="template">Template</SelectItem>
              <SelectItem value="cross-template">Cross-template</SelectItem>
              <SelectItem value="global">Global</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Expression preview (always shown in visual mode) */}
      {mode === 'visual' && constraint.expression && (
        <div className="rounded bg-muted px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground">Generated expression:</p>
          <p className="font-mono text-xs">{constraint.expression}</p>
        </div>
      )}
    </div>
  );
}

export { ConstraintEditor };
