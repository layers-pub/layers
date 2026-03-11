'use client';

/**
 * Filling simulation panel for a design project.
 *
 * Provides a strategy picker (exhaustive, random, stratified, CSP, MLM,
 * manual), a template selector, a limit input, and a results table for
 * reviewing and saving generated fillings.
 *
 * @module
 */

import { useState, useCallback, useMemo } from 'react';
import { Loader2, Play, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { useAgent, useCurrentUser } from '@/lib/auth';
import {
  useProjectTemplates,
  useTemplate,
  useCollectionEntries,
  useCreateFilling,
} from '@/lib/hooks/use-design';
import { useSidecarCSPFill, useSidecarMLMFill } from '@/lib/hooks/use-sidecar';

import { FillingResultsTable, type FillingPreview } from './simulate/filling-results-table';

// =============================================================================
// TYPES
// =============================================================================

type Strategy = 'exhaustive' | 'random' | 'stratified' | 'csp' | 'mlm' | 'manual';

interface ManualSlotFilling {
  slotName: string;
  literalValue: string;
}

interface SimulatePanelProps {
  readonly projectUri: string;
}

// =============================================================================
// STRATEGY DESCRIPTIONS
// =============================================================================

const STRATEGY_OPTIONS: Array<{ value: Strategy; label: string; description: string }> = [
  {
    value: 'exhaustive',
    label: 'Exhaustive',
    description: 'Cartesian product of all slot fillers',
  },
  {
    value: 'random',
    label: 'Random',
    description: 'Random sampling from slot fillers',
  },
  {
    value: 'stratified',
    label: 'Stratified',
    description: 'Balanced sampling across a selected feature',
  },
  {
    value: 'csp',
    label: 'CSP Solver',
    description: 'Constraint satisfaction solver (sidecar)',
  },
  {
    value: 'mlm',
    label: 'MLM Generation',
    description: 'Masked language model prediction (sidecar)',
  },
  {
    value: 'manual',
    label: 'Manual',
    description: 'Manually specify each slot filling',
  },
];

// =============================================================================
// CLIENT-SIDE GENERATION HELPERS
// =============================================================================

interface SlotEntries {
  slotName: string;
  entries: Array<{ entryRef?: string; literalValue?: string; form: string }>;
}

/**
 * Generates a cartesian product of slot filler combinations.
 */
function exhaustiveGenerate(
  slotEntries: SlotEntries[],
  templateText: string,
  limit: number,
): FillingPreview[] {
  if (slotEntries.length === 0) return [];

  const results: FillingPreview[] = [];
  const indices = new Array(slotEntries.length).fill(0) as number[];
  let done = false;

  while (!done && results.length < limit) {
    const slotFillings = slotEntries.map((slot, i) => ({
      slotName: slot.slotName,
      entryRef: slot.entries[indices[i]!]?.entryRef,
      literalValue: slot.entries[indices[i]!]?.literalValue,
    }));

    let rendered = templateText;
    for (const sf of slotFillings) {
      const value = sf.literalValue ?? sf.entryRef ?? '';
      rendered = rendered.replace(`{${sf.slotName}}`, value);
    }

    results.push({
      slotFillings,
      renderedText: rendered,
      strategy: 'exhaustive',
    });

    // Increment: rightmost slot first
    let carry = true;
    for (let i = slotEntries.length - 1; i >= 0 && carry; i--) {
      indices[i]!++;
      if (indices[i]! >= slotEntries[i]!.entries.length) {
        indices[i] = 0;
      } else {
        carry = false;
      }
    }
    if (carry) done = true;
  }

  return results;
}

/**
 * Generates random slot filler combinations.
 */
function randomGenerate(
  slotEntries: SlotEntries[],
  templateText: string,
  limit: number,
): FillingPreview[] {
  if (slotEntries.length === 0) return [];

  const results: FillingPreview[] = [];

  for (let n = 0; n < limit; n++) {
    const slotFillings = slotEntries.map((slot) => {
      const idx = Math.floor(Math.random() * slot.entries.length);
      const entry = slot.entries[idx];
      return {
        slotName: slot.slotName,
        entryRef: entry?.entryRef,
        literalValue: entry?.literalValue,
      };
    });

    let rendered = templateText;
    for (const sf of slotFillings) {
      const value = sf.literalValue ?? sf.entryRef ?? '';
      rendered = rendered.replace(`{${sf.slotName}}`, value);
    }

    results.push({
      slotFillings,
      renderedText: rendered,
      strategy: 'random',
    });
  }

  return results;
}

/**
 * Generates stratified samples by balancing across a feature of the first
 * slot's entries.
 */
function stratifiedGenerate(
  slotEntries: SlotEntries[],
  templateText: string,
  limit: number,
): FillingPreview[] {
  // Stratified is similar to random but tries to evenly sample from
  // each slot. As a simple approach: round-robin through each slot's entries.
  if (slotEntries.length === 0) return [];

  const results: FillingPreview[] = [];
  const maxSlotLength = Math.max(...slotEntries.map((s) => s.entries.length));

  for (let n = 0; n < limit && n < maxSlotLength; n++) {
    const slotFillings = slotEntries.map((slot) => {
      const idx = n % slot.entries.length;
      const entry = slot.entries[idx];
      return {
        slotName: slot.slotName,
        entryRef: entry?.entryRef,
        literalValue: entry?.literalValue,
      };
    });

    let rendered = templateText;
    for (const sf of slotFillings) {
      const value = sf.literalValue ?? sf.entryRef ?? '';
      rendered = rendered.replace(`{${sf.slotName}}`, value);
    }

    results.push({
      slotFillings,
      renderedText: rendered,
      strategy: 'stratified',
    });
  }

  return results;
}

function renderTemplateText(
  templateText: string,
  fillings: Array<{ slotName: string; literalValue?: string; entryRef?: string }>,
): string {
  let rendered = templateText;
  for (const sf of fillings) {
    const value = sf.literalValue ?? sf.entryRef ?? '';
    rendered = rendered.replace(`{${sf.slotName}}`, value);
  }
  return rendered;
}

// =============================================================================
// COMPONENT
// =============================================================================

function SimulatePanel({ projectUri }: SimulatePanelProps): React.JSX.Element {
  const agent = useAgent();
  const user = useCurrentUser();
  const userDid = user?.did ?? '';

  // Strategy state
  const [strategy, setStrategy] = useState<Strategy>('exhaustive');
  const [selectedTemplateUri, setSelectedTemplateUri] = useState('');
  const [limit, setLimit] = useState(100);

  // Manual filling state
  const [manualFillings, setManualFillings] = useState<ManualSlotFilling[]>([]);

  // Results state
  const [fillings, setFillings] = useState<FillingPreview[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Hooks
  const { data: templatesData, isLoading: templatesLoading } = useProjectTemplates(userDid);
  const { data: templateData } = useTemplate(selectedTemplateUri);
  const createFilling = useCreateFilling();

  // Sidecar mutations
  const cspFill = useSidecarCSPFill();
  const mlmFill = useSidecarMLMFill();

  // Get template slots for the selected template
  const templateSlots = useMemo(() => templateData?.value?.slots ?? [], [templateData]);

  // Get collection refs from slots
  const collectionRefs = useMemo(
    () =>
      templateSlots
        .filter((s) => s.collectionRef)
        .map((s) => ({ slotName: s.name, collectionRef: s.collectionRef! })),
    [templateSlots],
  );

  // Fetch collection entries for the first slot that has a collectionRef
  // (We use a simplified approach: fetch entries for each slot's collection)
  const firstCollectionRef = collectionRefs[0]?.collectionRef ?? '';
  const { data: collectionEntriesData } = useCollectionEntries(firstCollectionRef, { limit: 500 });

  // Build slot entry data from collection memberships
  const slotEntriesForGeneration = useMemo((): SlotEntries[] => {
    if (!collectionEntriesData?.memberships) return [];

    // For now, use the same entries for all slots that reference a collection.
    // A more complete implementation would fetch per-slot collections independently.
    const entries = collectionEntriesData.memberships.map((m) => ({
      entryRef: m.entryRef,
      literalValue: m.entry?.form ?? m.entryRef,
      form: m.entry?.form ?? m.entryRef,
    }));

    return templateSlots.map((slot) => ({
      slotName: slot.name,
      entries: slot.collectionRef ? entries : [],
    }));
  }, [collectionEntriesData, templateSlots]);

  // Initialize manual fillings when template changes
  const handleTemplateChange = useCallback((uri: string) => {
    setSelectedTemplateUri(uri);
    setFillings([]);
  }, []);

  // Generation handler
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplateUri || !templateData?.value) {
      toast.error('Please select a template first.');
      return;
    }

    setIsGenerating(true);
    const templateText = templateData.value.text;

    try {
      switch (strategy) {
        case 'exhaustive': {
          const results = exhaustiveGenerate(slotEntriesForGeneration, templateText, limit);
          setFillings(results);
          toast.success(`Generated ${results.length} filling(s).`);
          break;
        }
        case 'random': {
          const results = randomGenerate(slotEntriesForGeneration, templateText, limit);
          setFillings(results);
          toast.success(`Generated ${results.length} filling(s).`);
          break;
        }
        case 'stratified': {
          const results = stratifiedGenerate(slotEntriesForGeneration, templateText, limit);
          setFillings(results);
          toast.success(`Generated ${results.length} filling(s).`);
          break;
        }
        case 'csp': {
          const result = await cspFill.mutateAsync({
            templateRef: selectedTemplateUri,
            collectionRefs: collectionRefs.map((c) => c.collectionRef),
            constraints: templateData.value.constraints?.map((c) => ({
              expression: c.expression,
              expressionFormat: c.expressionFormat,
            })),
            maxSolutions: limit,
          });
          const previews: FillingPreview[] = result.fillings.map((f) => ({
            slotFillings: f.slotFillings,
            renderedText: f.renderedText,
            strategy: 'csp',
          }));
          setFillings(previews);
          toast.success(
            `CSP solver found ${previews.length} solution(s) in ${result.solveTimeMs}ms.`,
          );
          break;
        }
        case 'mlm': {
          const result = await mlmFill.mutateAsync({
            templateRef: selectedTemplateUri,
            collectionRefs: collectionRefs.map((c) => c.collectionRef),
            numCandidates: limit,
          });
          const previews: FillingPreview[] = result.fillings.map((f) => ({
            slotFillings: f.slotFillings,
            renderedText: f.renderedText,
            strategy: 'mlm',
            score: f.score,
          }));
          setFillings(previews);
          toast.success(`MLM generated ${previews.length} candidate(s) via ${result.modelName}.`);
          break;
        }
        case 'manual': {
          // Build a single filling from manual inputs
          const slotFills = templateSlots.map((slot) => {
            const manual = manualFillings.find((m) => m.slotName === slot.name);
            return {
              slotName: slot.name,
              literalValue: manual?.literalValue ?? '',
            };
          });
          const rendered = renderTemplateText(templateText, slotFills);
          setFillings([
            {
              slotFillings: slotFills,
              renderedText: rendered,
              strategy: 'manual',
            },
          ]);
          toast.success('Manual filling created.');
          break;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }, [
    strategy,
    selectedTemplateUri,
    templateData,
    limit,
    slotEntriesForGeneration,
    collectionRefs,
    cspFill,
    mlmFill,
    manualFillings,
    templateSlots,
  ]);

  // Save selected fillings as PDS records
  const handleSaveFillings = useCallback(
    async (indices: number[]) => {
      if (!agent || !selectedTemplateUri) {
        toast.error('Sign in and select a template to save fillings.');
        return;
      }

      let saved = 0;
      let failed = 0;

      for (const idx of indices) {
        const filling = fillings[idx];
        if (!filling) continue;

        try {
          await createFilling.mutateAsync({
            agent,
            authToken: '',
            templateRef: selectedTemplateUri,
            slotFillings: filling.slotFillings,
            renderedText: filling.renderedText,
            strategy: filling.strategy,
          });
          saved++;
        } catch {
          failed++;
        }
      }

      if (failed > 0) {
        toast.error(`Saved ${saved} filling(s), but ${failed} failed.`);
      } else {
        toast.success(`Saved ${saved} filling(s) successfully.`);
      }
    },
    [agent, selectedTemplateUri, fillings, createFilling],
  );

  // Template list from hook
  const templates = templatesData?.records ?? [];

  return (
    <div className="space-y-4">
      {/* Strategy Picker Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Filling Simulation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template selector */}
          <div className="space-y-1.5">
            <Label>Template</Label>
            {templatesLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No templates found. Create a template first.
              </p>
            ) : (
              <Select value={selectedTemplateUri} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.uri} value={t.uri}>
                      {t.value?.name ?? t.uri.slice(-12)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Template info */}
          {templateData?.value ? (
            <div className="rounded-md border p-3">
              <p className="text-sm">{templateData.value.text}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {templateSlots.map((slot) => (
                  <Badge key={slot.name} variant="outline">
                    {'{'}
                    {slot.name}
                    {'}'}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {/* Strategy and limit */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Strategy</Label>
              <Select value={strategy} onValueChange={(v) => setStrategy(v as Strategy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Limit</Label>
              <Input
                type="number"
                min={1}
                max={10000}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) || 100)}
              />
            </div>

            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={!selectedTemplateUri || isGenerating}
                onClick={handleGenerate}
              >
                {isGenerating ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                )}
                Generate Fillings
              </Button>
            </div>
          </div>

          {/* Strategy description */}
          <p className="text-xs text-muted-foreground">
            {STRATEGY_OPTIONS.find((o) => o.value === strategy)?.description}
          </p>
        </CardContent>
      </Card>

      {/* Manual filling form (only shown for manual strategy) */}
      {strategy === 'manual' && templateSlots.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Manual Slot Values</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {templateSlots.map((slot) => (
              <div key={slot.name} className="space-y-1.5">
                <Label>{slot.name}</Label>
                <Input
                  placeholder={slot.defaultValue ?? `Value for {${slot.name}}`}
                  value={manualFillings.find((m) => m.slotName === slot.name)?.literalValue ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setManualFillings((prev) => {
                      const existing = prev.find((m) => m.slotName === slot.name);
                      if (existing) {
                        return prev.map((m) =>
                          m.slotName === slot.name ? { ...m, literalValue: value } : m,
                        );
                      }
                      return [...prev, { slotName: slot.name, literalValue: value }];
                    });
                  }}
                />
                {slot.description ? (
                  <p className="text-xs text-muted-foreground">{slot.description}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Results */}
      {isGenerating ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Generating fillings...</p>
            </div>
          </CardContent>
        </Card>
      ) : fillings.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Results</CardTitle>
          </CardHeader>
          <CardContent>
            <FillingResultsTable
              fillings={fillings}
              onSave={handleSaveFillings}
              isSaving={createFilling.isPending}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Select a template and strategy, then click &quot;Generate Fillings&quot; to see
              results.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Project URI footer */}
      <div className="min-w-0">
        <p className="truncate font-mono text-xs text-muted-foreground">Project: {projectUri}</p>
      </div>
    </div>
  );
}

export { SimulatePanel };
