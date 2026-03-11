'use client';

/**
 * Template composition editor (secondary panel).
 *
 * Allows building compositions of templates as sequences, trees, parallel
 * structures, or alternations. Each member references a template and
 * has a label and ordinal.
 *
 * @module
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TemplateOption {
  readonly uri: string;
  readonly name: string;
}

/** A member in the composition being edited. */
interface CompositionMember {
  templateRef: string;
  label: string;
  ordinal: number;
}

type CompositionType = 'sequence' | 'tree' | 'parallel' | 'alternation';

interface TemplateCompositionEditorProps {
  readonly projectTemplates: readonly TemplateOption[];
  readonly compositionType?: CompositionType;
  readonly members?: readonly CompositionMember[];
  readonly onCompositionTypeChange?: (type: CompositionType) => void;
  readonly onMembersChange?: (members: CompositionMember[]) => void;
}

function TemplateCompositionEditor({
  projectTemplates,
  compositionType = 'sequence',
  members = [],
  onCompositionTypeChange,
  onMembersChange,
}: TemplateCompositionEditorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  const editableMembers = [...members];

  function updateMembers(next: CompositionMember[]): void {
    // Reassign ordinals
    const withOrdinals = next.map((m, i) => ({ ...m, ordinal: i }));
    onMembersChange?.(withOrdinals);
  }

  function addMember(): void {
    const newMember: CompositionMember = {
      templateRef: '',
      label: '',
      ordinal: editableMembers.length,
    };
    updateMembers([...editableMembers, newMember]);
  }

  function removeMember(index: number): void {
    updateMembers(editableMembers.filter((_, i) => i !== index));
  }

  function updateMember(index: number, updates: Partial<CompositionMember>): void {
    const next = editableMembers.map((m, i) => (i === index ? { ...m, ...updates } : m));
    updateMembers(next);
  }

  function moveMember(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= editableMembers.length) return;
    const next = [...editableMembers];
    const temp = next[targetIndex]!;
    next[targetIndex] = next[index]!;
    next[index] = temp;
    updateMembers(next);
  }

  function getTemplateName(uri: string): string {
    return projectTemplates.find((t) => t.uri === uri)?.name ?? '(select template)';
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-md border">
        <CollapsibleTrigger
          render={
            <Button variant="ghost" className="w-full justify-start gap-2 px-3 py-2 text-sm" />
          }
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Template Composition
          {editableMembers.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {editableMembers.length} members
            </Badge>
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-3 py-3 space-y-4">
            {/* Composition type */}
            <div>
              <Label className="text-xs">Composition Type</Label>
              <Select
                value={compositionType}
                onValueChange={(val) =>
                  onCompositionTypeChange?.((val ?? 'sequence') as CompositionType)
                }
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequence">Sequence</SelectItem>
                  <SelectItem value="tree">Tree</SelectItem>
                  <SelectItem value="parallel">Parallel</SelectItem>
                  <SelectItem value="alternation">Alternation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Member list */}
            {editableMembers.length === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No members. Add templates to this composition.
              </p>
            )}

            {editableMembers.map((member, index) => (
              <div key={index} className="rounded-md border p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    #{member.ordinal}
                  </Badge>
                  <span className="flex-1 truncate text-xs font-medium">
                    {getTemplateName(member.templateRef)}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => moveMember(index, -1)}
                    disabled={index === 0}
                    aria-label="Move member up"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => moveMember(index, 1)}
                    disabled={index === editableMembers.length - 1}
                    aria-label="Move member down"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => removeMember(index)}
                    aria-label={`Remove member ${index}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Template</Label>
                    <Select
                      value={member.templateRef}
                      onValueChange={(val) => updateMember(index, { templateRef: val ?? '' })}
                    >
                      <SelectTrigger className="mt-0.5 h-7 text-xs">
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectTemplates.map((t) => (
                          <SelectItem key={t.uri} value={t.uri}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[10px]">Label</Label>
                    <Input
                      value={member.label}
                      onChange={(e) => updateMember(index, { label: e.target.value })}
                      placeholder="e.g., context"
                      className="mt-0.5 h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addMember} className="w-full text-xs">
              <Plus className="mr-1 h-3 w-3" />
              Add Member
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export type { TemplateOption, CompositionMember, CompositionType };
export { TemplateCompositionEditor };
