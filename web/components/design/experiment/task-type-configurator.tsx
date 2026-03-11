'use client';

/**
 * Dynamic form section that renders task-specific fields based on the
 * selected taskType.
 *
 * Each task type has distinct configuration requirements (labels for
 * forced-choice, scale bounds for ordinal-scale, etc.). This component
 * renders the appropriate fields and exposes changes via callbacks.
 *
 * @module
 */

import { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// =============================================================================
// TYPES
// =============================================================================

interface TaskTypeConfiguratorProps {
  readonly taskType: string;
  readonly labels: string[];
  readonly onLabelsChange: (labels: string[]) => void;
  readonly scaleMin?: number;
  readonly onScaleMinChange: (value: number | undefined) => void;
  readonly scaleMax?: number;
  readonly onScaleMaxChange: (value: number | undefined) => void;
}

// =============================================================================
// TAG INPUT
// =============================================================================

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  readonly tags: string[];
  readonly onChange: (tags: string[]) => void;
  readonly placeholder?: string;
}): React.JSX.Element {
  const [inputValue, setInputValue] = useState('');

  const addTag = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue('');
    }
  }, [inputValue, tags, onChange]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  }

  function removeTag(index: number): void {
    onChange(tags.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="ml-0.5 rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {tag}</span>
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Type and press Enter'}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTag}
          disabled={!inputValue.trim()}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// TASK CONFIGURATORS
// =============================================================================

function ForcedChoiceConfig({
  labels,
  onLabelsChange,
}: {
  readonly labels: string[];
  readonly onLabelsChange: (labels: string[]) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <Label>Choice Labels</Label>
      <p className="text-xs text-muted-foreground">
        Define the labels participants choose from. At least two are required.
      </p>
      <TagInput tags={labels} onChange={onLabelsChange} placeholder="Add a choice label" />
    </div>
  );
}

function OrdinalScaleConfig({
  scaleMin,
  scaleMax,
  onScaleMinChange,
  onScaleMaxChange,
}: {
  readonly scaleMin?: number;
  readonly scaleMax?: number;
  readonly onScaleMinChange: (v: number | undefined) => void;
  readonly onScaleMaxChange: (v: number | undefined) => void;
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="scale-min">Scale Minimum</Label>
        <Input
          id="scale-min"
          type="number"
          value={scaleMin ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onScaleMinChange(val === '' ? undefined : Number(val));
          }}
          placeholder="1"
          className="h-8"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="scale-max">Scale Maximum</Label>
        <Input
          id="scale-max"
          type="number"
          value={scaleMax ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onScaleMaxChange(val === '' ? undefined : Number(val));
          }}
          placeholder="7"
          className="h-8"
        />
      </div>
    </div>
  );
}

function MagnitudeConfig({
  labels,
  onLabelsChange,
}: {
  readonly labels: string[];
  readonly onLabelsChange: (labels: string[]) => void;
}): React.JSX.Element {
  const [bounded, setBounded] = useState(false);
  const [boundValue, setBoundValue] = useState('');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="magnitude-bounded"
          checked={bounded}
          onCheckedChange={(checked) => setBounded(checked === true)}
        />
        <Label htmlFor="magnitude-bounded">Bounded scale</Label>
      </div>
      {bounded && (
        <div className="space-y-1.5">
          <Label htmlFor="bound-value">Upper bound</Label>
          <Input
            id="bound-value"
            type="number"
            value={boundValue}
            onChange={(e) => setBoundValue(e.target.value)}
            placeholder="100"
            className="h-8"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label>Reference labels (optional)</Label>
        <TagInput tags={labels} onChange={onLabelsChange} placeholder="Add a reference label" />
      </div>
    </div>
  );
}

function BinaryConfig({
  labels,
  onLabelsChange,
}: {
  readonly labels: string[];
  readonly onLabelsChange: (labels: string[]) => void;
}): React.JSX.Element {
  const labelTrue = labels[0] ?? '';
  const labelFalse = labels[1] ?? '';

  function updateLabel(index: number, value: string): void {
    const updated = [...labels];
    updated[index] = value;
    // Ensure exactly two entries
    while (updated.length < 2) {
      updated.push('');
    }
    onLabelsChange(updated.slice(0, 2));
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="label-true">Positive label</Label>
        <Input
          id="label-true"
          value={labelTrue}
          onChange={(e) => updateLabel(0, e.target.value)}
          placeholder="Yes"
          className="h-8"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="label-false">Negative label</Label>
        <Input
          id="label-false"
          value={labelFalse}
          onChange={(e) => updateLabel(1, e.target.value)}
          placeholder="No"
          className="h-8"
        />
      </div>
    </div>
  );
}

function CategoricalConfig({
  labels,
  onLabelsChange,
}: {
  readonly labels: string[];
  readonly onLabelsChange: (labels: string[]) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <Label>Category Labels</Label>
      <p className="text-xs text-muted-foreground">
        Define the category labels. At least two are required.
      </p>
      <TagInput tags={labels} onChange={onLabelsChange} placeholder="Add a category label" />
    </div>
  );
}

function MultiSelectConfig({
  labels,
  onLabelsChange,
}: {
  readonly labels: string[];
  readonly onLabelsChange: (labels: string[]) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Option Labels</Label>
        <p className="text-xs text-muted-foreground">
          Participants can select multiple options. At least two are required.
        </p>
        <TagInput tags={labels} onChange={onLabelsChange} placeholder="Add an option label" />
      </div>
    </div>
  );
}

function FreeTextConfig(): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">
        Participants provide free-text responses. No additional configuration is needed.
      </p>
    </div>
  );
}

function ClozeConfig(): React.JSX.Element {
  return (
    <div className="space-y-2">
      <Label>Cloze Template</Label>
      <p className="text-xs text-muted-foreground">
        The cloze template is derived from the associated resource templates. Blank positions are
        determined by the template slot placeholders.
      </p>
      <Textarea placeholder="The ___ sat on the ___." className="h-20 font-mono text-sm" disabled />
    </div>
  );
}

function SpanLabelingConfig({
  labels,
  onLabelsChange,
}: {
  readonly labels: string[];
  readonly onLabelsChange: (labels: string[]) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <Label>Span Label Set</Label>
      <p className="text-xs text-muted-foreground">
        Labels that participants assign to selected text spans.
      </p>
      <TagInput tags={labels} onChange={onLabelsChange} placeholder="Add a span label" />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function TaskTypeConfigurator({
  taskType,
  labels,
  onLabelsChange,
  scaleMin,
  onScaleMinChange,
  scaleMax,
  onScaleMaxChange,
}: TaskTypeConfiguratorProps): React.JSX.Element | null {
  if (!taskType) {
    return null;
  }

  switch (taskType) {
    case 'forced-choice':
      return <ForcedChoiceConfig labels={labels} onLabelsChange={onLabelsChange} />;
    case 'ordinal-scale':
      return (
        <OrdinalScaleConfig
          scaleMin={scaleMin}
          scaleMax={scaleMax}
          onScaleMinChange={onScaleMinChange}
          onScaleMaxChange={onScaleMaxChange}
        />
      );
    case 'magnitude':
      return <MagnitudeConfig labels={labels} onLabelsChange={onLabelsChange} />;
    case 'binary':
      return <BinaryConfig labels={labels} onLabelsChange={onLabelsChange} />;
    case 'categorical':
      return <CategoricalConfig labels={labels} onLabelsChange={onLabelsChange} />;
    case 'multi-select':
      return <MultiSelectConfig labels={labels} onLabelsChange={onLabelsChange} />;
    case 'free-text':
      return <FreeTextConfig />;
    case 'cloze':
      return <ClozeConfig />;
    case 'span-labeling':
      return <SpanLabelingConfig labels={labels} onLabelsChange={onLabelsChange} />;
    default:
      return (
        <p className="text-xs text-muted-foreground">
          No additional configuration for task type &quot;{taskType}&quot;.
        </p>
      );
  }
}

export { TaskTypeConfigurator, TagInput };
