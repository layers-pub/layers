'use client';

/**
 * Experiment editor for a single experiment definition.
 *
 * Multi-section form with collapsible sections for basic info, task
 * configuration, stimuli references, presentation, design, and recording.
 * Supports both creation (experimentUri === 'new') and viewing of existing
 * experiments.
 *
 * @module
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Settings2,
  Link2,
  Monitor,
  LayoutGrid,
  Mic,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

import { useAuth } from '@/lib/auth';
import { useProjectTemplates } from '@/lib/hooks/use-design';
import { createExperimentDefRecord, syncRecordWithAppview } from '@/lib/atproto/record-creator';
import {
  MEASURE_TYPES,
  TASK_TYPES,
  PRESENTATION_METHODS,
  CHUNKING_UNITS,
  DISTRIBUTION_STRATEGIES,
  ITEM_ORDERS,
  RECORDING_METHODS,
  type ListConstraintFormValues,
} from '@/lib/schemas/design';

import { TaskTypeConfigurator } from './experiment/task-type-configurator';
import { ListConstraintEditor } from './experiment/list-constraint-editor';
import { ExperimentPreviewPanel } from './experiment/experiment-preview-panel';

// =============================================================================
// TYPES
// =============================================================================

interface ExperimentEditorProps {
  readonly projectUri: string;
  readonly experimentUri: string;
}

// =============================================================================
// COLLAPSIBLE SECTION
// =============================================================================

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  readonly title: string;
  readonly icon: React.ElementType;
  readonly defaultOpen?: boolean;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer pb-2 select-none"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="pt-0">
          <Separator className="mb-4" />
          {children}
        </CardContent>
      )}
    </Card>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

/** Extracts a DID from a project AT-URI. */
function didFromUri(uri: string): string {
  const withoutScheme = uri.replace('at://', '');
  const slash = withoutScheme.indexOf('/');
  return slash >= 0 ? withoutScheme.slice(0, slash) : withoutScheme;
}

// =============================================================================
// COMPONENT
// =============================================================================

function ExperimentEditor({ projectUri, experimentUri }: ExperimentEditorProps): React.JSX.Element {
  const router = useRouter();
  const { agent } = useAuth();
  const isNew = !experimentUri || experimentUri === 'new';

  // Form state: Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [measureType, setMeasureType] = useState('');
  const [taskType, setTaskType] = useState('');
  const [guidelines, setGuidelines] = useState('');

  // Task config state
  const [labels, setLabels] = useState<string[]>([]);
  const [scaleMin, setScaleMin] = useState<number | undefined>(undefined);
  const [scaleMax, setScaleMax] = useState<number | undefined>(undefined);

  // Stimuli refs
  const [templateRefs, setTemplateRefs] = useState<string[]>([]);
  const [collectionRefs, setCollectionRefs] = useState<string[]>([]);

  // Presentation
  const [presentationMethod, setPresentationMethod] = useState('');
  const [chunkingUnit, setChunkingUnit] = useState('');
  const [timingMs, setTimingMs] = useState<number | undefined>(300);
  const [isiMs, setIsiMs] = useState<number | undefined>(200);
  const [cumulative, setCumulative] = useState(false);
  const [maskChar, setMaskChar] = useState('***');

  // Design
  const [distributionStrategy, setDistributionStrategy] = useState('');
  const [itemOrder, setItemOrder] = useState('');
  const [listConstraints, setListConstraints] = useState<ListConstraintFormValues[]>([]);

  // Recording methods
  const [recordingMethods, setRecordingMethods] = useState<string[]>([]);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Fetch available templates for the project
  const repo = didFromUri(projectUri);
  const { data: templatesData } = useProjectTemplates(repo);
  const availableTemplates = templatesData?.records ?? [];

  // Toggle recording method
  const toggleRecordingMethod = useCallback((method: string) => {
    setRecordingMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method],
    );
  }, []);

  // Toggle template ref
  const toggleTemplateRef = useCallback((uri: string) => {
    setTemplateRefs((prev) =>
      prev.includes(uri) ? prev.filter((u) => u !== uri) : [...prev, uri],
    );
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!agent) {
      toast.error('You must be signed in to save an experiment.');
      return;
    }

    if (!name.trim()) {
      toast.error('Experiment name is required.');
      return;
    }

    setIsSaving(true);

    try {
      const presentationSpec =
        presentationMethod || chunkingUnit || timingMs || isiMs
          ? {
              method: presentationMethod || undefined,
              chunkingUnit: chunkingUnit || undefined,
              timingMs,
              isiMs,
              cumulative: cumulative || undefined,
              maskChar: maskChar || undefined,
            }
          : undefined;

      const design =
        distributionStrategy || itemOrder || listConstraints.length > 0
          ? {
              distributionStrategy: distributionStrategy || undefined,
              itemOrder: itemOrder || undefined,
              listConstraints:
                listConstraints.length > 0
                  ? listConstraints.map((lc) => ({
                      kind: lc.kind as
                        | 'latin-square'
                        | 'no-adjacent-same-condition'
                        | 'balanced-frequency'
                        | 'minimum-distance'
                        | 'custom',
                      targetProperty: lc.targetProperty || undefined,
                      parameters: lc.parameters?.length ? { entries: lc.parameters } : undefined,
                      constraint: lc.constraintExpression
                        ? { expression: lc.constraintExpression }
                        : undefined,
                    }))
                  : undefined,
            }
          : undefined;

      const recordingMethodSpecs =
        recordingMethods.length > 0
          ? recordingMethods.map((method) => ({
              method: method as 'keyboard' | 'mouse-click' | 'voice' | 'eye-tracking' | 'custom',
            }))
          : undefined;

      const result = await createExperimentDefRecord(agent, {
        name: name.trim(),
        description: description.trim() || undefined,
        measureType: (measureType || undefined) as (typeof MEASURE_TYPES)[number] | undefined,
        taskType: (taskType || undefined) as (typeof TASK_TYPES)[number] | undefined,
        guidelines: guidelines.trim() || undefined,
        labels: labels.length > 0 ? labels : undefined,
        scaleMin,
        scaleMax,
        templateRefs: templateRefs.length > 0 ? templateRefs : undefined,
        collectionRefs: collectionRefs.length > 0 ? collectionRefs : undefined,
        presentation: presentationSpec,
        design,
        recordingMethods: recordingMethodSpecs,
      });

      // Immediate indexing (best-effort)
      try {
        await syncRecordWithAppview(result.uri, '');
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch {
        // Firehose will handle it
      }

      toast.success('Experiment saved.');
      router.push(
        `/design/${encodeURIComponent(projectUri)}/experiments/${encodeURIComponent(result.uri)}`,
      );
    } catch {
      toast.error('Failed to save experiment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [
    agent,
    name,
    description,
    measureType,
    taskType,
    guidelines,
    labels,
    scaleMin,
    scaleMax,
    templateRefs,
    collectionRefs,
    presentationMethod,
    chunkingUnit,
    timingMs,
    isiMs,
    cumulative,
    maskChar,
    distributionStrategy,
    itemOrder,
    listConstraints,
    recordingMethods,
    projectUri,
    router,
  ]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">
              {isNew ? 'New Experiment' : 'Experiment Editor'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure experiment design, task, presentation, and recording parameters.
            </p>
          </div>
        </div>
        <Button size="sm" disabled={isSaving || !name.trim()} onClick={handleSave}>
          {isSaving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-3.5 w-3.5" />
          )}
          Save
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[60%_40%]">
        {/* Left column: form sections */}
        <div className="min-w-0 space-y-4">
          {/* Section 1: Basic Info */}
          <CollapsibleSection title="Basic Information" icon={FlaskConical} defaultOpen>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="exp-name">Name</Label>
                <Input
                  id="exp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Experiment name"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-description">Description</Label>
                <Textarea
                  id="exp-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the experiment"
                  className="h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Measure Type</Label>
                  <Select value={measureType} onValueChange={setMeasureType}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select measure" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEASURE_TYPES.map((mt) => (
                        <SelectItem key={mt} value={mt}>
                          {mt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Task Type</Label>
                  <Select value={taskType} onValueChange={setTaskType}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select task" />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map((tt) => (
                        <SelectItem key={tt} value={tt}>
                          {tt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-guidelines">Guidelines</Label>
                <Textarea
                  id="exp-guidelines"
                  value={guidelines}
                  onChange={(e) => setGuidelines(e.target.value)}
                  placeholder="Instructions shown to participants before the experiment begins"
                  className="h-32"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Section 2: Task Configuration */}
          <CollapsibleSection
            title="Task Configuration"
            icon={Settings2}
            defaultOpen={Boolean(taskType)}
          >
            <div className="space-y-4">
              {!taskType && (
                <p className="text-sm text-muted-foreground">
                  Select a task type in the Basic Information section to configure task-specific
                  settings.
                </p>
              )}

              {taskType && (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{taskType}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Task-specific configuration
                    </span>
                  </div>
                  <TaskTypeConfigurator
                    taskType={taskType}
                    labels={labels}
                    onLabelsChange={setLabels}
                    scaleMin={scaleMin}
                    onScaleMinChange={setScaleMin}
                    scaleMax={scaleMax}
                    onScaleMaxChange={setScaleMax}
                  />
                </>
              )}
            </div>
          </CollapsibleSection>

          {/* Section 3: Stimuli References */}
          <CollapsibleSection title="Stimuli References" icon={Link2}>
            <div className="space-y-4">
              {/* Template refs */}
              <div className="space-y-2">
                <Label>Templates</Label>
                <p className="text-xs text-muted-foreground">
                  Select templates from this project to generate stimuli.
                </p>
                {availableTemplates.length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    No templates available in this project.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                    {availableTemplates.map((t) => (
                      <label
                        key={t.uri}
                        className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={templateRefs.includes(t.uri)}
                          onCheckedChange={() => toggleTemplateRef(t.uri)}
                        />
                        <span className="truncate">
                          {t.value.name || t.value.text.slice(0, 60)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Collection refs (text input for now) */}
              <div className="space-y-2">
                <Label>Collection References</Label>
                <p className="text-xs text-muted-foreground">
                  Enter AT-URIs of resource collections providing filler pools (one per line).
                </p>
                <Textarea
                  value={collectionRefs.join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n').filter((l) => l.trim());
                    setCollectionRefs(lines);
                  }}
                  placeholder="at://did:plc:.../pub.layers.resource.collection/..."
                  className="h-20 font-mono text-xs"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Section 4: Presentation */}
          <CollapsibleSection title="Presentation" icon={Monitor}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Method</Label>
                  <Select value={presentationMethod} onValueChange={setPresentationMethod}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESENTATION_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Chunking Unit</Label>
                  <Select value={chunkingUnit} onValueChange={setChunkingUnit}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHUNKING_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="timing-ms">Display Duration (ms)</Label>
                  <Input
                    id="timing-ms"
                    type="number"
                    value={timingMs ?? ''}
                    onChange={(e) =>
                      setTimingMs(e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="300"
                    className="h-8"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="isi-ms">Inter-Stimulus Interval (ms)</Label>
                  <Input
                    id="isi-ms"
                    type="number"
                    value={isiMs ?? ''}
                    onChange={(e) => setIsiMs(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="200"
                    className="h-8"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cumulative"
                    checked={cumulative}
                    onCheckedChange={(checked) => setCumulative(checked === true)}
                  />
                  <Label htmlFor="cumulative" className="text-sm">
                    Cumulative display
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="mask-char" className="text-sm">
                    Mask character
                  </Label>
                  <Input
                    id="mask-char"
                    value={maskChar}
                    onChange={(e) => setMaskChar(e.target.value)}
                    placeholder="***"
                    className="h-8 w-20 text-center font-mono"
                  />
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Section 5: Design */}
          <CollapsibleSection title="Experimental Design" icon={LayoutGrid}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Distribution Strategy</Label>
                  <Select value={distributionStrategy} onValueChange={setDistributionStrategy}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTRIBUTION_STRATEGIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Item Order</Label>
                  <Select value={itemOrder} onValueChange={setItemOrder}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select order" />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_ORDERS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>List Constraints</Label>
                <ListConstraintEditor constraints={listConstraints} onChange={setListConstraints} />
              </div>
            </div>
          </CollapsibleSection>

          {/* Section 6: Recording */}
          <CollapsibleSection title="Recording Methods" icon={Mic}>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Select the data capture instruments used in this experiment.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {RECORDING_METHODS.map((method) => (
                  <label
                    key={method}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={recordingMethods.includes(method)}
                      onCheckedChange={() => toggleRecordingMethod(method)}
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Right column: Preview panel */}
        <div className="min-w-0 space-y-4">
          <ExperimentPreviewPanel experimentRef={isNew ? '' : experimentUri} fillingRefs={[]} />

          {/* Summary badges */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {measureType && <Badge variant="secondary">{measureType}</Badge>}
                {taskType && <Badge variant="secondary">{taskType}</Badge>}
                {presentationMethod && <Badge variant="outline">{presentationMethod}</Badge>}
                {distributionStrategy && <Badge variant="outline">{distributionStrategy}</Badge>}
                {templateRefs.length > 0 && (
                  <Badge variant="secondary">
                    {templateRefs.length} {templateRefs.length === 1 ? 'template' : 'templates'}
                  </Badge>
                )}
                {labels.length > 0 && (
                  <Badge variant="secondary">
                    {labels.length} {labels.length === 1 ? 'label' : 'labels'}
                  </Badge>
                )}
                {recordingMethods.length > 0 && (
                  <Badge variant="secondary">
                    {recordingMethods.length} recording{' '}
                    {recordingMethods.length === 1 ? 'method' : 'methods'}
                  </Badge>
                )}
                {listConstraints.length > 0 && (
                  <Badge variant="secondary">
                    {listConstraints.length}{' '}
                    {listConstraints.length === 1 ? 'constraint' : 'constraints'}
                  </Badge>
                )}
              </div>
              {!measureType && !taskType && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Configure the experiment to see a summary here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Project URI footer */}
      <div className="min-w-0 space-y-1">
        <p className="truncate font-mono text-xs text-muted-foreground">Project: {projectUri}</p>
        {!isNew && (
          <p className="truncate font-mono text-xs text-muted-foreground">
            Experiment: {experimentUri}
          </p>
        )}
      </div>
    </div>
  );
}

export { ExperimentEditor };
