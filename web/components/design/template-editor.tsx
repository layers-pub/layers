'use client';

/**
 * Template editor for a single template record.
 *
 * Three-panel layout: text+slots (left), constraints (center), preview (right).
 * For new templates (no templateUri), shows a creation form. For existing
 * templates, loads via the `useTemplate` hook.
 *
 * @module
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Trash2, Plus, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LanguageCombobox } from '@/components/ui/language-combobox';
import { Skeleton } from '@/components/ui/skeleton';

import type { SlotSchema, ConstraintSchema } from '@/lib/schemas/design';
import { useTemplate, useCreateTemplate } from '@/lib/hooks/use-design';
import { useAgent, useAuth } from '@/lib/auth';
import { updateRecord, syncRecordWithAppview } from '@/lib/atproto/record-creator';
import { templateKeys } from '@/lib/hooks/keys';

import { useDesignShortcuts } from '@/lib/hooks/use-design-shortcuts';

import { TemplateTextEditor, extractSlotNames } from './template/template-text-editor';
import { SlotBuilder } from './template/slot-builder';
import { ConstraintEditor } from './template/constraint-editor';
import { TemplatePreview } from './template/template-preview';
import { TemplateCompositionEditor } from './template/template-composition-editor';

interface TemplateEditorProps {
  readonly projectUri: string;
  readonly templateUri?: string;
}

function TemplateEditor({ projectUri, templateUri }: TemplateEditorProps): React.JSX.Element {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const agent = useAgent();
  const queryClient = useQueryClient();
  const isNew = !templateUri || templateUri === 'new';

  // Load existing template data
  const { data: templateData, isLoading, isError } = useTemplate(isNew ? '' : (templateUri ?? ''));

  const createTemplate = useCreateTemplate();
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('');
  const [slots, setSlots] = useState<SlotSchema[]>([]);
  const [constraints, setConstraints] = useState<ConstraintSchema[]>([]);
  const [_isDirty, setIsDirty] = useState(false);

  // Populate from existing template on load
  useEffect(() => {
    if (templateData?.value) {
      const v = templateData.value;
      setName(v.name ?? '');
      setText(v.text);
      setLanguage(v.language ?? '');
      setSlots(
        (v.slots ?? []).map((s) => ({
          name: s.name,
          description: s.description,
          required: s.required ?? true,
          defaultValue: s.defaultValue,
          collectionRef: s.collectionRef,
        })),
      );
      setConstraints(
        (v.constraints ?? []).map((c) => ({
          expression: c.expression,
          expressionFormat: c.expressionFormat,
          scope: c.scope,
          description: c.description,
        })),
      );
    }
  }, [templateData]);

  // Auto-sync detected slot names to slot definitions
  const definedSlotNames = useMemo(() => new Set(slots.map((s) => s.name)), [slots]);

  const handleTextChange = useCallback(
    (newText: string) => {
      setText(newText);
      setIsDirty(true);

      // Auto-add slots for newly detected names that are not yet defined
      const detected = extractSlotNames(newText);
      const currentNames = new Set(slots.map((s) => s.name));
      const newSlots = detected
        .filter((n) => !currentNames.has(n))
        .map((n) => ({ name: n, required: true }) satisfies SlotSchema);

      if (newSlots.length > 0) {
        setSlots((prev) => [...prev, ...newSlots]);
      }
    },
    [slots],
  );

  const handleSlotsChange = useCallback((newSlots: SlotSchema[]) => {
    setSlots(newSlots);
    setIsDirty(true);
  }, []);

  const handleConstraintsChange = useCallback((index: number, updated: ConstraintSchema) => {
    setConstraints((prev) => prev.map((c, i) => (i === index ? updated : c)));
    setIsDirty(true);
  }, []);

  const addConstraint = useCallback(() => {
    setConstraints((prev) => [...prev, { expression: '', scope: 'template' }]);
    setIsDirty(true);
  }, []);

  const removeConstraint = useCallback((index: number) => {
    setConstraints((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!agent || !isAuthenticated) {
      toast.error('You must be signed in.');
      return;
    }
    if (!text.trim()) {
      toast.error('Template text is required.');
      return;
    }

    setIsSaving(true);
    try {
      const templateRecord = {
        $type: 'pub.layers.resource.template' as const,
        text,
        name: name || undefined,
        language: language || undefined,
        slots: slots.map((s) => ({
          name: s.name,
          description: s.description,
          required: s.required ?? true,
          defaultValue: s.defaultValue,
          collectionRef: s.collectionRef,
        })),
        constraints:
          constraints.length > 0
            ? constraints.map((c) => ({
                expression: c.expression,
                expressionFormat: c.expressionFormat,
                scope: c.scope,
                description: c.description,
              }))
            : undefined,
      };

      if (isNew) {
        const result = await createTemplate.mutateAsync({
          agent,
          authToken: '',
          text,
          name: name || undefined,
          language: language || undefined,
          slots: slots.map((s) => ({
            name: s.name,
            description: s.description,
            required: s.required,
            defaultValue: s.defaultValue,
            collectionRef: s.collectionRef,
          })),
          constraints: constraints.map((c) => ({
            expression: c.expression,
            expressionFormat: c.expressionFormat,
            scope: c.scope,
            description: c.description,
          })),
        });
        toast.success('Template created.');
        const encodedUri = encodeURIComponent(result.uri);
        router.push(`/design/${encodeURIComponent(projectUri)}/templates/${encodedUri}`);
      } else {
        await updateRecord(agent, templateUri!, templateRecord);
        await syncRecordWithAppview(templateUri!, '');
        await queryClient.invalidateQueries({ queryKey: templateKeys.all });
        toast.success('Template updated.');
      }
      setIsDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save template.');
    } finally {
      setIsSaving(false);
    }
  }, [
    agent,
    isAuthenticated,
    text,
    name,
    language,
    slots,
    constraints,
    isNew,
    templateUri,
    projectUri,
    createTemplate,
    queryClient,
    router,
  ]);

  // Keyboard shortcuts
  useDesignShortcuts({
    onSave: handleSave,
  });

  // Loading state
  if (!isNew && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Error state
  if (!isNew && isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">Failed to load template.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => router.back()}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Template name"
            className="h-9 text-lg font-semibold"
          />
        </div>

        <div className="w-44">
          <LanguageCombobox
            value={language}
            onChange={(v) => {
              setLanguage(v);
              setIsDirty(true);
            }}
            className="h-9 text-sm"
          />
        </div>

        <Button size="sm" disabled={!text || isSaving} onClick={handleSave}>
          {isSaving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-3.5 w-3.5" />
          )}
          {isNew ? 'Create' : 'Save'}
        </Button>

        {!isNew && (
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </div>

      {/* Three-panel layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[35%_30%_35%]">
        {/* Left panel: Template text + slots */}
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Template Text</CardTitle>
            </CardHeader>
            <CardContent>
              <TemplateTextEditor
                value={text}
                definedSlotNames={definedSlotNames}
                onChange={handleTextChange}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Slots</CardTitle>
            </CardHeader>
            <CardContent>
              <SlotBuilder slots={slots} onChange={handleSlotsChange} />
            </CardContent>
          </Card>
        </div>

        {/* Center panel: Constraints */}
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Constraints ({constraints.length})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addConstraint} className="text-xs">
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {constraints.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No constraints defined. Constraints restrict which fillers are valid for each
                  slot.
                </p>
              ) : (
                <div className="space-y-3">
                  {constraints.map((constraint, index) => (
                    <ConstraintEditor
                      key={index}
                      constraint={constraint}
                      onChange={(updated) => handleConstraintsChange(index, updated)}
                      onRemove={() => removeConstraint(index)}
                      slots={slots}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Composition editor (secondary panel) */}
          <TemplateCompositionEditor projectTemplates={[]} />
        </div>

        {/* Right panel: Preview */}
        <div className="min-w-0">
          <TemplatePreview templateText={text} slots={slots} />
        </div>
      </div>

      {/* Project URI footer */}
      <div className="min-w-0">
        <p className="truncate font-mono text-xs text-muted-foreground">Project: {projectUri}</p>
        {!isNew && templateUri && (
          <p className="truncate font-mono text-xs text-muted-foreground">
            Template: {templateUri}
          </p>
        )}
      </div>
    </div>
  );
}

export { TemplateEditor };
