'use client';

/**
 * Renders the appropriate response control based on the experiment's task type.
 *
 * @module
 */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

/**
 * A judgment response value.
 */
interface JudgmentResponse {
  label?: string;
  scalarValue?: number;
  freeText?: string;
}

interface JudgmentResponseProps {
  /** The experiment's task type, determining which control to render. */
  taskType: string;
  /** Labels for forced-choice tasks. */
  labels?: string[];
  /** Minimum value for ordinal-scale tasks. */
  scaleMin?: number;
  /** Maximum value for ordinal-scale tasks. */
  scaleMax?: number;
  /** Callback fired when the user selects or enters a response. */
  onResponse: (response: JudgmentResponse) => void;
}

/**
 * Renders a forced-choice radio group from a list of labels.
 */
function ForcedChoiceResponse({
  labels,
  onResponse,
}: {
  labels: string[];
  onResponse: (response: JudgmentResponse) => void;
}): React.JSX.Element {
  return (
    <RadioGroup onValueChange={(value) => onResponse({ label: value })} className="space-y-2">
      {labels.map((label) => (
        <div key={label} className="flex items-center space-x-2">
          <RadioGroupItem value={label} id={`choice-${label}`} />
          <Label htmlFor={`choice-${label}`}>{label}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}

/**
 * Renders an ordinal scale as numbered radio buttons.
 */
function OrdinalScaleResponse({
  scaleMin,
  scaleMax,
  onResponse,
}: {
  scaleMin: number;
  scaleMax: number;
  onResponse: (response: JudgmentResponse) => void;
}): React.JSX.Element {
  const values = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);

  return (
    <RadioGroup
      onValueChange={(value) => onResponse({ scalarValue: parseInt(value, 10) })}
      className="flex flex-wrap gap-2"
    >
      {values.map((value) => (
        <div key={value} className="flex flex-col items-center gap-1">
          <RadioGroupItem value={String(value)} id={`scale-${value}`} />
          <Label htmlFor={`scale-${value}`} className="text-xs">
            {value}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

/**
 * Renders a magnitude estimation slider (0-100).
 */
function MagnitudeResponse({
  onResponse,
}: {
  onResponse: (response: JudgmentResponse) => void;
}): React.JSX.Element {
  const [value, setValue] = useState(50);

  return (
    <div className="space-y-3">
      <Slider
        min={0}
        max={100}
        step={1}
        defaultValue={50}
        onValueChange={(v) => {
          const numValue = typeof v === 'number' ? v : Array.isArray(v) ? (v[0] ?? 50) : 50;
          setValue(numValue);
          onResponse({ scalarValue: numValue });
        }}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span className="font-medium text-foreground">{value}</span>
        <span>100</span>
      </div>
    </div>
  );
}

/**
 * Renders a binary Yes/No choice.
 */
function BinaryResponse({
  onResponse,
}: {
  onResponse: (response: JudgmentResponse) => void;
}): React.JSX.Element {
  return (
    <div className="flex gap-3">
      <Button variant="outline" className="flex-1" onClick={() => onResponse({ label: 'yes' })}>
        Yes
      </Button>
      <Button variant="outline" className="flex-1" onClick={() => onResponse({ label: 'no' })}>
        No
      </Button>
    </div>
  );
}

/**
 * Renders a free-text response area.
 */
function FreeTextResponse({
  onResponse,
}: {
  onResponse: (response: JudgmentResponse) => void;
}): React.JSX.Element {
  return (
    <Textarea
      placeholder="Enter your response..."
      onChange={(e) => onResponse({ freeText: e.target.value })}
      rows={3}
    />
  );
}

/**
 * Renders a cloze (fill-in-the-blank) input.
 */
function ClozeResponse({
  onResponse,
}: {
  onResponse: (response: JudgmentResponse) => void;
}): React.JSX.Element {
  return (
    <Input
      placeholder="Fill in the blank"
      onChange={(e) => onResponse({ freeText: e.target.value })}
    />
  );
}

/**
 * Dispatches to the appropriate response control based on taskType.
 */
function JudgmentResponseControl({
  taskType,
  labels = [],
  scaleMin = 1,
  scaleMax = 7,
  onResponse,
}: JudgmentResponseProps): React.JSX.Element {
  switch (taskType) {
    case 'forced-choice':
      return <ForcedChoiceResponse labels={labels} onResponse={onResponse} />;
    case 'ordinal-scale':
      return (
        <OrdinalScaleResponse scaleMin={scaleMin} scaleMax={scaleMax} onResponse={onResponse} />
      );
    case 'magnitude':
      return <MagnitudeResponse onResponse={onResponse} />;
    case 'binary':
      return <BinaryResponse onResponse={onResponse} />;
    case 'free-text':
      return <FreeTextResponse onResponse={onResponse} />;
    case 'cloze':
      return <ClozeResponse onResponse={onResponse} />;
    default:
      return <p className="text-sm text-muted-foreground">Unknown task type: {taskType}</p>;
  }
}

export type { JudgmentResponse, JudgmentResponseProps };
export { JudgmentResponseControl };
