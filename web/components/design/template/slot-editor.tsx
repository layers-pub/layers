'use client';

/**
 * Editor for a single template slot.
 *
 * Renders fields for slot name, description, required flag, default value,
 * collection reference (filler pool), and slot-level constraints.
 *
 * @module
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { SlotSchema } from '@/lib/schemas/design';

interface CollectionOption {
  readonly uri: string;
  readonly name: string;
}

interface SlotEditorProps {
  readonly slot: SlotSchema;
  readonly onChange: (slot: SlotSchema) => void;
  readonly projectCollections?: readonly CollectionOption[];
  readonly allSlots?: readonly SlotSchema[];
}

function SlotEditor({
  slot,
  onChange,
  projectCollections,
  allSlots: _allSlots,
}: SlotEditorProps): React.JSX.Element {
  function updateField<K extends keyof SlotSchema>(key: K, value: SlotSchema[K]): void {
    onChange({ ...slot, [key]: value });
  }

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`slot-name-${slot.name}`}>Name</Label>
          <Input
            id={`slot-name-${slot.name}`}
            value={slot.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="subject"
            className="mt-1 font-mono text-sm"
          />
        </div>

        <div>
          <Label htmlFor={`slot-default-${slot.name}`}>Default Value</Label>
          <Input
            id={`slot-default-${slot.name}`}
            value={slot.defaultValue ?? ''}
            onChange={(e) => updateField('defaultValue', e.target.value || undefined)}
            placeholder="(optional)"
            className="mt-1 text-sm"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor={`slot-desc-${slot.name}`}>Description</Label>
        <Input
          id={`slot-desc-${slot.name}`}
          value={slot.description ?? ''}
          onChange={(e) => updateField('description', e.target.value || undefined)}
          placeholder="Describe what this slot represents"
          className="mt-1 text-sm"
        />
      </div>

      {/* Required toggle + Collection ref */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={slot.required}
            onCheckedChange={(checked: boolean) => updateField('required', checked)}
            id={`slot-required-${slot.name}`}
          />
          <Label htmlFor={`slot-required-${slot.name}`} className="text-sm">
            Required
          </Label>
        </div>

        {projectCollections && projectCollections.length > 0 && (
          <div className="flex-1">
            <Label htmlFor={`slot-collection-${slot.name}`} className="text-xs">
              Filler Collection
            </Label>
            <Select
              value={slot.collectionRef ?? ''}
              onValueChange={(val) => updateField('collectionRef', val || undefined)}
            >
              <SelectTrigger className="mt-1 h-8 text-xs" id={`slot-collection-${slot.name}`}>
                <SelectValue placeholder="No collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {projectCollections.map((c) => (
                  <SelectItem key={c.uri} value={c.uri}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

export type { CollectionOption };
export { SlotEditor };
