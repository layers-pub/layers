'use client';

/**
 * Multi-word expression component editor.
 *
 * Collapsible section for editing MWE components (form, lemma,
 * position, isHead) with add/remove buttons.
 *
 * @module
 */

import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// =============================================================================
// TYPES
// =============================================================================

interface MweComponent {
  form: string;
  lemma?: string;
  position?: number;
  isHead?: boolean;
}

// =============================================================================
// PROPS
// =============================================================================

interface MweComponentEditorProps {
  readonly components: MweComponent[];
  readonly onChange: (components: MweComponent[]) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

function MweComponentEditor({ components, onChange }: MweComponentEditorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(components.length > 0);

  function handleAdd(): void {
    onChange([...components, { form: '', lemma: '', position: components.length, isHead: false }]);
    setIsOpen(true);
  }

  function handleRemove(index: number): void {
    const next = components.filter((_, i) => i !== index);
    onChange(next);
  }

  function handleUpdate(index: number, updates: Partial<MweComponent>): void {
    const next = components.map((c, i) => (i === index ? { ...c, ...updates } : c));
    onChange(next);
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger render={<Button variant="ghost" size="xs" className="-ml-2" />}>
          {isOpen ? (
            <ChevronDown className="mr-1 size-3.5" />
          ) : (
            <ChevronRight className="mr-1 size-3.5" />
          )}
          <span className="text-sm font-medium">MWE Components ({components.length})</span>
        </CollapsibleTrigger>
        <Button type="button" variant="outline" size="xs" onClick={handleAdd}>
          <Plus className="mr-1 size-3" />
          Add
        </Button>
      </div>

      <CollapsibleContent>
        <div className="mt-2 space-y-3">
          {components.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No components. This entry is a single word.
            </p>
          ) : null}

          {components.map((component, index) => (
            <div key={index} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Component {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleRemove(index)}
                >
                  <Trash2 className="size-3" />
                  <span className="sr-only">Remove component</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Form</Label>
                  <Input
                    placeholder="Surface form"
                    value={component.form}
                    onChange={(e) => handleUpdate(index, { form: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Lemma</Label>
                  <Input
                    placeholder="Citation form"
                    value={component.lemma ?? ''}
                    onChange={(e) => handleUpdate(index, { lemma: e.target.value || undefined })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Position</Label>
                  <Input
                    type="number"
                    min={0}
                    value={component.position ?? index}
                    onChange={(e) =>
                      handleUpdate(index, {
                        position: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Checkbox
                    checked={component.isHead ?? false}
                    onCheckedChange={(checked) => handleUpdate(index, { isHead: checked === true })}
                    id={`mwe-head-${index}`}
                  />
                  <Label htmlFor={`mwe-head-${index}`} className="text-xs">
                    Is Head
                  </Label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export { MweComponentEditor };
export type { MweComponentEditorProps, MweComponent };
