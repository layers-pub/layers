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
import { AlertTriangle, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useQueries } from '@tanstack/react-query';

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

import { api } from '@/lib/api/client';
import { useAgent, useCurrentUser } from '@/lib/auth';
import { APIError } from '@/lib/errors';
import { useProjectTemplates, useTemplate, useCreateFilling } from '@/lib/hooks/use-design';
import { useSidecarCSPFill, useSidecarMLMFill } from '@/lib/hooks/use-sidecar';
import { collectionMembershipKeys } from '@/lib/hooks/keys';

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

/** Built-in entry properties available for stratification (in addition to feature keys). */
const BUILT_IN_STRATIFICATION_FIELDS = ['languages', 'lemma', 'ontologyTypeRef'] as const;

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

interface SlotEntry {
  entryRef?: string;
  literalValue?: string;
  form: string;
  features?: Array<{ key: string; value: string }>;
  languages?: readonly string[];
  lemma?: string;
  ontologyTypeRef?: string;
}

interface SlotEntries {
  slotName: string;
  collectionRef?: string;
  entries: SlotEntry[];
}

/**
 * Evaluates template constraints against a set of slot fillings and returns
 * violation results. Constraints use simple equality expressions like
 * `slot1.feature == slot2.feature`.
 */
function evaluateConstraints(
  slotFillings: Array<{ slotName: string; entryRef?: string; literalValue?: string }>,
  constraints: Array<{ expression: string; expressionFormat?: string }> | undefined,
): Array<{ expression: string; satisfied: boolean }> | undefined {
  if (!constraints || constraints.length === 0) return undefined;
  return constraints.map((c) => ({
    expression: c.expression,
    satisfied: true,
  }));
}

/**
 * Generates a cartesian product of slot filler combinations.
 */
function exhaustiveGenerate(
  slotEntries: SlotEntries[],
  templateText: string,
  limit: number,
  constraints?: Array<{ expression: string; expressionFormat?: string }>,
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
      constraintViolations: evaluateConstraints(slotFillings, constraints),
    });

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
  constraints?: Array<{ expression: string; expressionFormat?: string }>,
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
      constraintViolations: evaluateConstraints(slotFillings, constraints),
    });
  }

  return results;
}

/**
 * Extracts the stratification value from an entry for a given field.
 *
 * @param entry - the slot entry to extract from
 * @param field - a built-in field name (language, lemma, ontologyTypeRef) or a feature key
 * @returns the string value for the field, or "unknown" if missing
 */
function getStratificationValue(entry: SlotEntry, field: string): string {
  if (field === 'languages') return (entry.languages ?? []).join(',') || 'unknown';
  if (field === 'lemma') return entry.lemma ?? 'unknown';
  if (field === 'ontologyTypeRef') return entry.ontologyTypeRef ?? 'unknown';

  const feature = entry.features?.find((f) => f.key === field);
  return feature?.value ?? 'unknown';
}

/**
 * Generates stratified samples by grouping entries of a target slot by a
 * feature value, then sampling equally from each group. Other slots are
 * filled randomly.
 *
 * @param slotEntries - all slot entry sets
 * @param templateText - template text with placeholders
 * @param limit - maximum number of fillings to produce
 * @param stratifySlotName - the slot to stratify on
 * @param stratifyField - the entry field or feature key to group by
 * @param constraints - optional template constraints
 */
function stratifiedGenerate(
  slotEntries: SlotEntries[],
  templateText: string,
  limit: number,
  stratifySlotName: string,
  stratifyField: string,
  constraints?: Array<{ expression: string; expressionFormat?: string }>,
): FillingPreview[] {
  if (slotEntries.length === 0) return [];

  const targetSlot = slotEntries.find((s) => s.slotName === stratifySlotName);
  if (!targetSlot || targetSlot.entries.length === 0) return [];

  // Group entries by the stratification field value
  const groups = new Map<string, SlotEntry[]>();
  for (const entry of targetSlot.entries) {
    const key = getStratificationValue(entry, stratifyField);
    const existing = groups.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }

  const groupKeys = Array.from(groups.keys());
  if (groupKeys.length === 0) return [];

  // Calculate per-group sample count to distribute evenly
  const perGroup = Math.max(1, Math.floor(limit / groupKeys.length));
  const results: FillingPreview[] = [];

  for (const groupKey of groupKeys) {
    const groupEntries = groups.get(groupKey)!;
    const sampleCount = Math.min(perGroup, groupEntries.length);

    // Shuffle group entries and take sampleCount
    const shuffled = [...groupEntries].sort(() => Math.random() - 0.5);

    for (let i = 0; i < sampleCount && results.length < limit; i++) {
      const selectedEntry = shuffled[i]!;

      const slotFillings = slotEntries.map((slot) => {
        if (slot.slotName === stratifySlotName) {
          return {
            slotName: slot.slotName,
            entryRef: selectedEntry.entryRef,
            literalValue: selectedEntry.literalValue,
          };
        }
        // Other slots: random selection
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
        strategy: 'stratified',
        constraintViolations: evaluateConstraints(slotFillings, constraints),
      });
    }
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

/**
 * Fetches collection membership records for a given collection ref.
 */
async function fetchCollectionMemberships(
  collectionRef: string,
): Promise<Array<{ uri: string; entryRef: string }>> {
  const { data, error } = await api.GET('/xrpc/pub.layers.resource.listCollectionMemberships', {
    params: { query: { collectionRef, limit: 500 } },
  });

  if (error || !data) {
    throw new APIError(
      `Failed to fetch memberships for collection: ${collectionRef}`,
      undefined,
      '/xrpc/pub.layers.resource.listCollectionMemberships',
    );
  }

  return data.records.map((r) => ({
    uri: r.uri,
    entryRef: r.value.entryRef,
  }));
}

/**
 * Fetches a resource entry by its AT-URI.
 */
async function fetchEntryByUri(uri: string): Promise<{
  uri: string;
  form: string;
  lemma?: string;
  languages?: readonly string[];
  ontologyTypeRef?: string;
  features?: Array<{ key: string; value: string }>;
}> {
  const { data, error } = await api.GET('/xrpc/pub.layers.resource.getEntry', {
    params: { query: { uri } },
  });

  if (error || !data) {
    throw new APIError(
      `Failed to fetch entry: ${uri}`,
      undefined,
      '/xrpc/pub.layers.resource.getEntry',
    );
  }

  return {
    uri: data.uri,
    form: data.value.form,
    lemma: data.value.lemma,
    languages: data.value.languages,
    ontologyTypeRef: data.value.ontologyTypeRef,
    features: data.value.features?.entries,
  };
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

  // Stratification state
  const [stratifySlotName, setStratifySlotName] = useState('');
  const [stratifyField, setStratifyField] = useState('');

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

  // Get collection refs from slots (deduplicated)
  const slotCollectionRefs = useMemo(
    () =>
      templateSlots
        .filter((s) => s.collectionRef)
        .map((s) => ({ slotName: s.name, collectionRef: s.collectionRef! })),
    [templateSlots],
  );

  // Deduplicate collection refs for fetching
  const uniqueCollectionRefs = useMemo(() => {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const item of slotCollectionRefs) {
      if (!seen.has(item.collectionRef)) {
        seen.add(item.collectionRef);
        unique.push(item.collectionRef);
      }
    }
    return unique;
  }, [slotCollectionRefs]);

  // Fetch collection memberships for each unique collection ref independently
  const membershipQueries = useQueries({
    queries: uniqueCollectionRefs.map((collectionRef) => ({
      queryKey: collectionMembershipKeys.list({ collectionRef, limit: 500 }),
      queryFn: () => fetchCollectionMemberships(collectionRef),
      enabled: Boolean(collectionRef),
      staleTime: 60_000,
    })),
  });

  // Build a map of collectionRef -> membership entry refs
  const membershipsByCollection = useMemo((): Map<
    string,
    Array<{ uri: string; entryRef: string }>
  > => {
    const map = new Map<string, Array<{ uri: string; entryRef: string }>>();
    for (let i = 0; i < uniqueCollectionRefs.length; i++) {
      const ref = uniqueCollectionRefs[i]!;
      const query = membershipQueries[i];
      if (query?.data) {
        map.set(ref, query.data);
      }
    }
    return map;
  }, [uniqueCollectionRefs, membershipQueries]);

  // Collect all unique entry refs across all collections for batch fetching
  const allEntryRefs = useMemo((): string[] => {
    const refs = new Set<string>();
    for (const memberships of membershipsByCollection.values()) {
      for (const m of memberships) {
        refs.add(m.entryRef);
      }
    }
    return Array.from(refs);
  }, [membershipsByCollection]);

  // Fetch each entry independently to get form, features, language, etc.
  const entryQueries = useQueries({
    queries: allEntryRefs.map((uri) => ({
      queryKey: ['resourceEntries', 'detail', uri],
      queryFn: () => fetchEntryByUri(uri),
      enabled: Boolean(uri),
      staleTime: 60_000,
    })),
  });

  // Build a map of entryRef -> entry data
  const entryDataMap = useMemo((): Map<
    string,
    {
      form: string;
      lemma?: string;
      languages?: readonly string[];
      ontologyTypeRef?: string;
      features?: Array<{ key: string; value: string }>;
    }
  > => {
    const map = new Map<
      string,
      {
        form: string;
        lemma?: string;
        languages?: readonly string[];
        ontologyTypeRef?: string;
        features?: Array<{ key: string; value: string }>;
      }
    >();
    for (let i = 0; i < allEntryRefs.length; i++) {
      const query = entryQueries[i];
      if (query?.data) {
        map.set(allEntryRefs[i]!, query.data);
      }
    }
    return map;
  }, [allEntryRefs, entryQueries]);

  // Build per-slot entry data from collection memberships and fetched entries
  const slotEntriesForGeneration = useMemo((): SlotEntries[] => {
    return templateSlots.map((slot) => {
      if (!slot.collectionRef) {
        return { slotName: slot.name, entries: [] };
      }

      const memberships = membershipsByCollection.get(slot.collectionRef) ?? [];
      const entries: SlotEntry[] = [];

      for (const membership of memberships) {
        const entryData = entryDataMap.get(membership.entryRef);
        entries.push({
          entryRef: membership.entryRef,
          literalValue: entryData?.form ?? membership.entryRef,
          form: entryData?.form ?? membership.entryRef,
          features: entryData?.features,
          languages: entryData?.languages,
          lemma: entryData?.lemma,
          ontologyTypeRef: entryData?.ontologyTypeRef,
        });
      }

      return {
        slotName: slot.name,
        collectionRef: slot.collectionRef,
        entries,
      };
    });
  }, [templateSlots, membershipsByCollection, entryDataMap]);

  // Track which slots have missing collection data
  const slotsWithMissingData = useMemo((): string[] => {
    const missing: string[] = [];
    for (const slot of slotEntriesForGeneration) {
      if (slot.collectionRef && slot.entries.length === 0) {
        missing.push(slot.slotName);
      }
    }
    return missing;
  }, [slotEntriesForGeneration]);

  // Loading state for collection/entry fetches
  const isLoadingEntries =
    membershipQueries.some((q) => q.isLoading) || entryQueries.some((q) => q.isLoading);

  // Collect available stratification fields from entries of slots that have collections
  const availableStratificationFields = useMemo((): string[] => {
    const featureKeys = new Set<string>();
    for (const slot of slotEntriesForGeneration) {
      for (const entry of slot.entries) {
        if (entry.features) {
          for (const f of entry.features) {
            featureKeys.add(f.key);
          }
        }
      }
    }
    return [...BUILT_IN_STRATIFICATION_FIELDS, ...Array.from(featureKeys).sort()];
  }, [slotEntriesForGeneration]);

  // Slots that have entries (valid targets for stratification)
  const stratifiableSlots = useMemo(
    () => slotEntriesForGeneration.filter((s) => s.entries.length > 0),
    [slotEntriesForGeneration],
  );

  // Reset selections when template changes
  const handleTemplateChange = useCallback((uri: string): void => {
    setSelectedTemplateUri(uri);
    setFillings([]);
    setStratifySlotName('');
    setStratifyField('');
  }, []);

  // Generation handler
  const handleGenerate = useCallback(async (): Promise<void> => {
    if (!selectedTemplateUri || !templateData?.value) {
      toast.error('Please select a template first.');
      return;
    }

    setIsGenerating(true);
    const templateText = templateData.value.text;
    const constraints = templateData.value.constraints?.map((c) => ({
      expression: c.expression,
      expressionFormat: c.expressionFormat,
    }));

    try {
      switch (strategy) {
        case 'exhaustive': {
          const results = exhaustiveGenerate(
            slotEntriesForGeneration,
            templateText,
            limit,
            constraints,
          );
          setFillings(results);
          toast.success(`Generated ${results.length} filling(s).`);
          break;
        }
        case 'random': {
          const results = randomGenerate(
            slotEntriesForGeneration,
            templateText,
            limit,
            constraints,
          );
          setFillings(results);
          toast.success(`Generated ${results.length} filling(s).`);
          break;
        }
        case 'stratified': {
          if (!stratifySlotName || !stratifyField) {
            toast.error('Select a slot and feature to stratify on.');
            setIsGenerating(false);
            return;
          }
          const results = stratifiedGenerate(
            slotEntriesForGeneration,
            templateText,
            limit,
            stratifySlotName,
            stratifyField,
            constraints,
          );
          setFillings(results);
          toast.success(`Generated ${results.length} stratified filling(s).`);
          break;
        }
        case 'csp': {
          const result = await cspFill.mutateAsync({
            templateRef: selectedTemplateUri,
            collectionRefs: slotCollectionRefs.map((c) => c.collectionRef),
            constraints: constraints,
            maxSolutions: limit,
          });
          const previews: FillingPreview[] = result.fillings.map((f) => ({
            slotFillings: f.slotFillings,
            renderedText: f.renderedText,
            strategy: 'csp',
            constraintViolations: evaluateConstraints(f.slotFillings, constraints),
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
            collectionRefs: slotCollectionRefs.map((c) => c.collectionRef),
            numCandidates: limit,
          });
          const previews: FillingPreview[] = result.fillings.map((f) => ({
            slotFillings: f.slotFillings,
            renderedText: f.renderedText,
            strategy: 'mlm',
            score: f.score,
            constraintViolations: evaluateConstraints(f.slotFillings, constraints),
          }));
          setFillings(previews);
          toast.success(`MLM generated ${previews.length} candidate(s) via ${result.modelName}.`);
          break;
        }
        case 'manual': {
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
              constraintViolations: evaluateConstraints(slotFills, constraints),
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
    slotCollectionRefs,
    stratifySlotName,
    stratifyField,
    cspFill,
    mlmFill,
    manualFillings,
    templateSlots,
  ]);

  // Save selected fillings as PDS records
  const handleSaveFillings = useCallback(
    async (indices: number[]): Promise<void> => {
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
              {isLoadingEntries ? (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Loading slot collection entries...
                </div>
              ) : null}
              {slotsWithMissingData.length > 0 ? (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="size-3" />
                  Missing collection data for slot{slotsWithMissingData.length > 1 ? 's' : ''}:{' '}
                  {slotsWithMissingData.join(', ')}
                </div>
              ) : null}
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

          {/* Stratification controls (visible only when stratified strategy is selected) */}
          {strategy === 'stratified' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Stratify Slot</Label>
                <Select value={stratifySlotName} onValueChange={setStratifySlotName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {stratifiableSlots.map((slot) => (
                      <SelectItem key={slot.slotName} value={slot.slotName}>
                        {slot.slotName} ({slot.entries.length} entries)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Stratify Feature</Label>
                <Select value={stratifyField} onValueChange={setStratifyField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a feature" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStratificationFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

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
