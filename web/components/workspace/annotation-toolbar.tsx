/**
 * Annotation creation and editing toolbar for the workspace center panel.
 *
 * Appears at the top of the center panel when the workspace is in editing
 * mode. Contains controls for mode selection, annotation kind/subkind/formalism
 * configuration, label input with ontology autocomplete, and layer persistence.
 *
 * @module
 */

'use client';

import * as React from 'react';
import { Layers, Plus, Save, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAgent } from '@/lib/auth/auth-context';
import { useTypeDefsByOntology } from '@/lib/hooks/use-type-defs';

import type { AnnotationKind } from '../annotations/types';

import { useAnnotationCreation } from './annotation-creation-context';
import type { WorkspaceMode } from './annotation-creation-context';

// =============================================================================
// Constants
// =============================================================================

const ANNOTATION_KINDS: { value: AnnotationKind; label: string }[] = [
  { value: 'token-tag', label: 'Token Tag' },
  { value: 'span', label: 'Span' },
  { value: 'relation', label: 'Relation' },
  { value: 'tree', label: 'Tree' },
  { value: 'document-tag', label: 'Document Tag' },
  { value: 'tier', label: 'Tier' },
  { value: 'graph', label: 'Graph' },
];

const MODE_OPTIONS: { value: WorkspaceMode; label: string; shortcut: string }[] = [
  { value: 'view', label: 'View', shortcut: 'V' },
  { value: 'annotate', label: 'Annotate', shortcut: 'A' },
  { value: 'edit', label: 'Edit', shortcut: 'E' },
];

// =============================================================================
// Component
// =============================================================================

interface AnnotationToolbarProps {
  /** Callback after a new layer is successfully saved. */
  onLayerSaved?: (uri: string) => void;
}

/**
 * Toolbar for annotation creation at the top of the workspace center panel.
 *
 * Provides mode switching (View/Annotate/Edit), annotation configuration
 * (kind, subkind, formalism), label input with ontology-driven autocomplete,
 * and save/cancel actions. Keyboard shortcuts are displayed in tooltips.
 */
function AnnotationToolbar({ onLayerSaved }: AnnotationToolbarProps): React.JSX.Element {
  const { state, dispatch, startAnnotation, saveLayer, cancelAnnotation } = useAnnotationCreation();
  const agent = useAgent();

  const [labelInput, setLabelInput] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  // Fetch type defs for label autocomplete when an ontology is set
  const { data: typeDefData } = useTypeDefsByOntology(state.ontologyRef);
  const typeDefLabels: string[] = React.useMemo(() => {
    if (!typeDefData?.records) return [];
    return typeDefData.records
      .map((td) => {
        const record = td as Record<string, unknown>;
        const value = record.value as Record<string, unknown> | undefined;
        return (value?.name as string | undefined) ?? '';
      })
      .filter(Boolean);
  }, [typeDefData?.records]);

  // Filter suggestions based on current input
  const filteredSuggestions = React.useMemo(() => {
    if (!labelInput.trim()) return typeDefLabels.slice(0, 10);
    const lower = labelInput.toLowerCase();
    return typeDefLabels.filter((label) => label.toLowerCase().includes(lower)).slice(0, 10);
  }, [labelInput, typeDefLabels]);

  // Close suggestions when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts for mode switching
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      // Only trigger when not focused on an input element
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.key === 'v' && !e.metaKey && !e.ctrlKey) {
        dispatch({ type: 'SET_MODE', mode: 'view' });
      } else if (e.key === 'a' && !e.metaKey && !e.ctrlKey) {
        dispatch({ type: 'SET_MODE', mode: 'annotate' });
      } else if (e.key === 'e' && !e.metaKey && !e.ctrlKey) {
        dispatch({ type: 'SET_MODE', mode: 'edit' });
      } else if (e.key === 'Escape') {
        cancelAnnotation();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, cancelAnnotation]);

  const handleSave = React.useCallback(async () => {
    if (!agent) return;
    try {
      const result = await saveLayer(agent);
      onLayerSaved?.(result.uri);
    } catch (error) {
      // Error handling delegated to parent via error boundary or toast
      console.error('Failed to save annotation layer:', error);
    }
  }, [agent, saveLayer, onLayerSaved]);

  const handleSuggestionSelect = React.useCallback((label: string) => {
    setLabelInput(label);
    setShowSuggestions(false);
  }, []);

  const isAnnotating = state.mode === 'annotate' || state.mode === 'edit';
  const hasPendingItems = state.pendingItems.length > 0;
  const canSave = hasPendingItems && agent !== null && !state.isSaving;

  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-1.5">
      {/* Mode selector */}
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
        {MODE_OPTIONS.map((option) => (
          <Tooltip key={option.value}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
                    state.mode === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  onClick={() => dispatch({ type: 'SET_MODE', mode: option.value })}
                />
              }
            >
              {option.label}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {option.label} mode ({option.shortcut})
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Annotation kind selector */}
      <Select
        value={state.kind}
        onValueChange={(value) => dispatch({ type: 'SET_KIND', kind: value as AnnotationKind })}
        disabled={!isAnnotating}
      >
        <SelectTrigger className="w-32 h-7 text-xs">
          <SelectValue placeholder="Kind" />
        </SelectTrigger>
        <SelectContent>
          {ANNOTATION_KINDS.map((kind) => (
            <SelectItem key={kind.value} value={kind.value} className="text-xs">
              {kind.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Subkind input */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Input
              type="text"
              placeholder="Subkind"
              value={state.subkind}
              onChange={(e) => dispatch({ type: 'SET_SUBKIND', subkind: e.target.value })}
              disabled={!isAnnotating}
              className="w-24 h-7 text-xs"
            />
          }
        />
        <TooltipContent side="bottom" className="text-xs">
          Annotation subkind (e.g., pos, ner, dependency)
        </TooltipContent>
      </Tooltip>

      {/* Formalism input */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Input
              type="text"
              placeholder="Formalism"
              value={state.formalism}
              onChange={(e) => dispatch({ type: 'SET_FORMALISM', formalism: e.target.value })}
              disabled={!isAnnotating}
              className="w-32 h-7 text-xs"
            />
          }
        />
        <TooltipContent side="bottom" className="text-xs">
          Annotation formalism (e.g., universal-dependencies)
        </TooltipContent>
      </Tooltip>

      {/* Label input with autocomplete */}
      <div className="relative" ref={suggestionsRef}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Input
                type="text"
                placeholder="Label"
                value={labelInput}
                onChange={(e) => {
                  setLabelInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                disabled={!isAnnotating}
                className="w-28 h-7 text-xs"
              />
            }
          />
          <TooltipContent side="bottom" className="text-xs">
            Annotation label (autocomplete from ontology)
          </TooltipContent>
        </Tooltip>

        {/* Autocomplete dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && isAnnotating ? (
          <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-md border border-border bg-popover shadow-md">
            {filteredSuggestions.map((label) => (
              <button
                key={label}
                type="button"
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
                onClick={() => handleSuggestionSelect(label)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Ontology reference input */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Input
              type="text"
              placeholder="Ontology AT-URI"
              value={state.ontologyRef}
              onChange={(e) => dispatch({ type: 'SET_ONTOLOGY_REF', ontologyRef: e.target.value })}
              disabled={!isAnnotating}
              className="w-40 h-7 text-xs"
            />
          }
        />
        <TooltipContent side="bottom" className="text-xs">
          AT-URI of the ontology for label suggestions
        </TooltipContent>
      </Tooltip>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Pending items count */}
      {hasPendingItems ? (
        <span className="text-xs text-muted-foreground tabular-nums">
          {state.pendingItems.length} item{state.pendingItems.length !== 1 ? 's' : ''}
        </span>
      ) : null}

      {/* Action buttons */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={startAnnotation}
              disabled={state.mode === 'annotate'}
            />
          }
        >
          <Plus className="size-3.5" />
          New Layer
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Start a new annotation layer
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleSave}
              disabled={!canSave}
            />
          }
        >
          {state.isSaving ? (
            <Layers className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Save
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Save annotation layer to PDS (Ctrl+S)
        </TooltipContent>
      </Tooltip>

      {isAnnotating ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7"
                onClick={cancelAnnotation}
              />
            }
          >
            <X className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Cancel (Esc)
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

export type { AnnotationToolbarProps };
export { AnnotationToolbar };
