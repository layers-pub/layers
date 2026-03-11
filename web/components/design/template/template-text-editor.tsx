'use client';

/**
 * Template text editor with slot placeholder detection.
 *
 * Renders a textarea for editing template text containing `{slotName}`
 * placeholders. Below the textarea, detected slot names are shown as
 * colored badges, distinguishing defined from undefined slots.
 *
 * @module
 */

import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/** Regex to detect `{slotName}` placeholders in template text. */
const SLOT_PLACEHOLDER_REGEX = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

/** Fixed palette of slot colors (cycled by index). */
const SLOT_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
] as const;

interface TemplateTextEditorProps {
  readonly value: string;
  readonly definedSlotNames: ReadonlySet<string>;
  readonly onChange: (text: string) => void;
}

/**
 * Extracts unique slot names from template text by matching `{name}` patterns.
 */
function extractSlotNames(text: string): string[] {
  const names = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(SLOT_PLACEHOLDER_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    const name = match[1];
    if (name) {
      names.add(name);
    }
  }
  return Array.from(names);
}

/**
 * Returns the color class for a slot by its index in the detected list.
 */
function slotColor(index: number): string {
  return SLOT_COLORS[index % SLOT_COLORS.length] ?? SLOT_COLORS[0] ?? '';
}

function TemplateTextEditor({
  value,
  definedSlotNames,
  onChange,
}: TemplateTextEditorProps): React.JSX.Element {
  const detectedNames = useMemo(() => extractSlotNames(value), [value]);

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="template-text">Template Text</Label>
        <Textarea
          id="template-text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="{subject} {verb} the {object}."
          className="mt-1.5 min-h-[120px] font-mono text-sm"
          rows={6}
        />
      </div>

      {detectedNames.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Detected Slots</p>
          <div className="flex flex-wrap gap-1.5">
            {detectedNames.map((name, i) => {
              const isDefined = definedSlotNames.has(name);
              return (
                <Badge
                  key={name}
                  variant={isDefined ? 'default' : 'outline'}
                  className={
                    isDefined
                      ? slotColor(i)
                      : 'border-dashed border-muted-foreground/50 text-muted-foreground'
                  }
                >
                  {name}
                  {!isDefined && <span className="ml-1 text-[10px] opacity-70">(undefined)</span>}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export { TemplateTextEditor, extractSlotNames, slotColor, SLOT_COLORS };
