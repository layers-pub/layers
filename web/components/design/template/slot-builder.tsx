'use client';

/**
 * Slot builder: a vertical list of collapsible slot cards.
 *
 * Each card header shows the slot name, required badge, and constraint count.
 * Expanding a card reveals the full slot editor. Includes an "Add Slot"
 * button at the bottom and move up/down controls for reordering.
 *
 * @module
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import type { SlotSchema } from '@/lib/schemas/design';
import { SlotEditor, type CollectionOption } from './slot-editor';
import { slotColor } from './template-text-editor';

interface SlotBuilderProps {
  readonly slots: SlotSchema[];
  readonly onChange: (slots: SlotSchema[]) => void;
  readonly projectCollections?: readonly CollectionOption[];
}

function SlotBuilder({ slots, onChange, projectCollections }: SlotBuilderProps): React.JSX.Element {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  function addSlot(): void {
    const newSlot: SlotSchema = {
      name: `slot_${slots.length + 1}`,
      required: true,
    };
    onChange([...slots, newSlot]);
    setExpandedIndex(slots.length);
  }

  function removeSlot(index: number): void {
    const next = slots.filter((_, i) => i !== index);
    onChange(next);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  }

  function updateSlot(index: number, updated: SlotSchema): void {
    const next = [...slots];
    next[index] = updated;
    onChange(next);
  }

  function moveSlot(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= slots.length) return;
    const next = [...slots];
    const temp = next[targetIndex]!;
    next[targetIndex] = next[index]!;
    next[index] = temp;
    onChange(next);

    if (expandedIndex === index) {
      setExpandedIndex(targetIndex);
    } else if (expandedIndex === targetIndex) {
      setExpandedIndex(index);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Slots ({slots.length})</p>
      </div>

      {slots.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No slots defined. Add slots or type {'{slotName}'} in the template text.
        </p>
      )}

      {slots.map((slot, index) => {
        const isOpen = expandedIndex === index;

        return (
          <Collapsible
            key={`${slot.name}-${index}`}
            open={isOpen}
            onOpenChange={(open) => setExpandedIndex(open ? index : null)}
          >
            <div className="rounded-md border">
              <div className="flex items-center gap-1 px-2 py-1.5">
                <CollapsibleTrigger
                  render={<Button variant="ghost" size="sm" className="h-6 w-6 p-0" />}
                >
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </CollapsibleTrigger>

                <Badge variant="secondary" className={`font-mono text-xs ${slotColor(index)}`}>
                  {slot.name || '(unnamed)'}
                </Badge>

                {slot.required && (
                  <Badge variant="outline" className="text-[10px]">
                    required
                  </Badge>
                )}

                <span className="flex-1" />

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => moveSlot(index, -1)}
                  disabled={index === 0}
                  aria-label="Move slot up"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => moveSlot(index, 1)}
                  disabled={index === slots.length - 1}
                  aria-label="Move slot down"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => removeSlot(index)}
                  aria-label={`Remove slot ${slot.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              <CollapsibleContent>
                <div className="border-t px-3 py-3">
                  <SlotEditor
                    slot={slot}
                    onChange={(updated) => updateSlot(index, updated)}
                    projectCollections={projectCollections}
                    allSlots={slots}
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      <Button variant="outline" size="sm" onClick={addSlot} className="w-full">
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add Slot
      </Button>
    </div>
  );
}

export { SlotBuilder };
