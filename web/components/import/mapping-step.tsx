'use client';

/**
 * Field mapping step for the import wizard.
 *
 * @module
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, HelpCircle, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { validateTransform, applyTransform } from '@/lib/transform-utils';

/**
 * A mapping from a source field to a target Layers record field.
 */
interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
}

interface MappingStepProps {
  /** Detected format name. */
  format: string;
  /** Callback fired when mappings change. */
  onMappingsChange: (mappings: FieldMapping[]) => void;
  /** Optional first few rows of parsed data for transform preview. */
  previewData?: string[][];
}

/** Available Layers target fields for mapping. */
const TARGET_FIELDS = [
  'tokenIndex',
  'text',
  'lemma',
  'pos',
  'depHead',
  'depRel',
  'nerLabel',
  'spanStart',
  'spanEnd',
  'spanLabel',
  'relationLabel',
  'relationSource',
  'relationTarget',
  'tierName',
  'tierStart',
  'tierEnd',
  'tierValue',
  'tierLinguisticType',
  'tierParent',
  'tierType',
  'attributeKey',
  'attributeValue',
] as const;

/** Default mappings per format. */
const DEFAULT_MAPPINGS: Record<string, FieldMapping[]> = {
  'CoNLL-U': [
    { sourceField: 'Column 1 (ID)', targetField: 'tokenIndex' },
    { sourceField: 'Column 2 (FORM)', targetField: 'text' },
    { sourceField: 'Column 3 (LEMMA)', targetField: 'lemma' },
    { sourceField: 'Column 4 (UPOS)', targetField: 'pos' },
    { sourceField: 'Column 7 (HEAD)', targetField: 'depHead' },
    { sourceField: 'Column 8 (DEPREL)', targetField: 'depRel' },
  ],
  'CoNLL-2003': [
    { sourceField: 'Column 1 (Token)', targetField: 'text' },
    { sourceField: 'Column 2 (POS)', targetField: 'pos' },
    { sourceField: 'Column 4 (NER)', targetField: 'nerLabel' },
  ],
  BRAT: [
    { sourceField: 'T-lines (entities)', targetField: 'spanLabel' },
    { sourceField: 'T-line span start', targetField: 'spanStart' },
    { sourceField: 'T-line span end', targetField: 'spanEnd' },
    { sourceField: 'R-lines (relations)', targetField: 'relationLabel' },
    { sourceField: 'A-lines (attributes)', targetField: 'attributeKey' },
  ],
  'BRAT (text)': [
    { sourceField: 'T-lines (entities)', targetField: 'spanLabel' },
    { sourceField: 'T-line span start', targetField: 'spanStart' },
    { sourceField: 'T-line span end', targetField: 'spanEnd' },
    { sourceField: 'R-lines (relations)', targetField: 'relationLabel' },
  ],
  ELAN: [
    { sourceField: 'Tier ID', targetField: 'tierName' },
    { sourceField: 'Annotation start (ms)', targetField: 'tierStart' },
    { sourceField: 'Annotation end (ms)', targetField: 'tierEnd' },
    { sourceField: 'Annotation value', targetField: 'tierValue' },
    { sourceField: 'Linguistic type', targetField: 'tierLinguisticType' },
    { sourceField: 'Parent tier', targetField: 'tierParent' },
  ],
  'TEI XML': [
    { sourceField: '<w> content', targetField: 'text' },
    { sourceField: '@pos attribute', targetField: 'pos' },
    { sourceField: '@lemma attribute', targetField: 'lemma' },
  ],
  'Praat TextGrid': [
    { sourceField: 'Tier name', targetField: 'tierName' },
    { sourceField: 'Tier type', targetField: 'tierType' },
    { sourceField: 'Interval xmin', targetField: 'tierStart' },
    { sourceField: 'Interval xmax', targetField: 'tierEnd' },
    { sourceField: 'Interval text', targetField: 'tierValue' },
  ],
};

/** Help text for the transforms tooltip. */
const TRANSFORM_HELP_LINES = [
  'lowercase - convert to lowercase',
  'uppercase - convert to uppercase',
  'trim - trim whitespace',
  'ms-to-sec - milliseconds to seconds',
  'sec-to-ms - seconds to milliseconds',
  'prefix:VALUE - prepend a string',
  'suffix:VALUE - append a string',
  'replace:OLD:NEW - string replacement',
  'default:VALUE - fallback for empty fields',
  '',
  'Chain with | (pipe): trim|lowercase',
];

/**
 * Computes a transform preview string for a given mapping row.
 *
 * Uses the first preview data row to show a before/after example.
 * Returns null if no preview is available or the transform is invalid.
 */
function computeTransformPreview(
  transform: string,
  mappingIndex: number,
  previewData: string[][] | undefined,
): string | null {
  if (!transform.trim()) return null;
  if (validateTransform(transform) !== null) return null;
  if (!previewData || previewData.length === 0) return null;

  const firstRow = previewData[0];
  if (!firstRow) return null;

  // Use the column matching the mapping index, or fall back to the first column
  const sampleValue = firstRow[mappingIndex] ?? firstRow[0] ?? '';
  if (sampleValue === '') return null;

  const result = applyTransform(sampleValue, transform);
  if (result === sampleValue) return null;

  // Truncate long values for display
  const maxLen = 20;
  const displayBefore =
    sampleValue.length > maxLen ? sampleValue.slice(0, maxLen) + '...' : sampleValue;
  const displayAfter = result.length > maxLen ? result.slice(0, maxLen) + '...' : result;

  return `e.g., '${displayBefore}' -> '${displayAfter}'`;
}

/**
 * Configures field mappings between source format fields and Layers record fields.
 */
function MappingStep({
  format,
  onMappingsChange,
  previewData,
}: MappingStepProps): React.JSX.Element {
  const [mappings, setMappings] = useState<FieldMapping[]>(() => {
    return DEFAULT_MAPPINGS[format] ?? [];
  });
  const [transformErrors, setTransformErrors] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    onMappingsChange(mappings);
  }, [mappings, onMappingsChange]);

  const updateMapping = useCallback((index: number, field: keyof FieldMapping, value: string) => {
    setMappings((prev) => {
      const next = [...prev];
      const item = next[index];
      if (!item) return prev;
      next[index] = { ...item, [field]: value };
      return next;
    });
  }, []);

  const handleTransformBlur = useCallback((index: number, value: string) => {
    setTransformErrors((prev) => {
      const next = new Map(prev);
      const error = validateTransform(value);
      if (error !== null) {
        next.set(index, error);
      } else {
        next.delete(index);
      }
      return next;
    });
  }, []);

  const addMapping = useCallback(() => {
    setMappings((prev) => [...prev, { sourceField: '', targetField: '' }]);
  }, []);

  const removeMapping = useCallback((index: number) => {
    setMappings((prev) => prev.filter((_, i) => i !== index));
    setTransformErrors((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
  }, []);

  // Memoize transform previews
  const transformPreviews = useMemo(() => {
    return mappings.map((mapping, index) =>
      computeTransformPreview(mapping.transform ?? '', index, previewData),
    );
  }, [mappings, previewData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Field Mappings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Map source fields from the {format} file to Layers record fields. Defaults are pre-filled
          based on the format.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Column headers */}
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="flex-1">Source Field</span>
          <span className="w-4" />
          <span className="flex-1">Target Field</span>
          <span className="flex w-36 items-center gap-1">
            Transform
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<HelpCircle className="h-3.5 w-3.5 cursor-help" />} />
                <TooltipContent side="top" className="max-w-xs whitespace-pre-line text-left">
                  {TRANSFORM_HELP_LINES.join('\n')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
          <span className="w-8" />
        </div>

        {mappings.map((mapping, index) => {
          const transformError = transformErrors.get(index);
          const preview = transformPreviews[index];

          return (
            <div key={index} className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Input
                  value={mapping.sourceField}
                  onChange={(e) => updateMapping(index, 'sourceField', e.target.value)}
                  placeholder="Source field"
                  className="flex-1 text-sm"
                  readOnly={Boolean(DEFAULT_MAPPINGS[format]?.[index])}
                />
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Select
                  value={mapping.targetField}
                  onValueChange={(value) => updateMapping(index, 'targetField', value ?? '')}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Target field" />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_FIELDS.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="w-36">
                  {transformError ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Input
                              value={mapping.transform ?? ''}
                              onChange={(e) => {
                                updateMapping(index, 'transform', e.target.value);
                                // Clear error on change so user can re-type
                                setTransformErrors((prev) => {
                                  const next = new Map(prev);
                                  next.delete(index);
                                  return next;
                                });
                              }}
                              onBlur={(e) => handleTransformBlur(index, e.target.value)}
                              placeholder="Transform (optional)"
                              className="w-full border-destructive text-sm focus-visible:ring-destructive"
                            />
                          }
                        />
                        <TooltipContent side="top" className="max-w-xs text-left text-destructive">
                          {transformError}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Input
                      value={mapping.transform ?? ''}
                      onChange={(e) => updateMapping(index, 'transform', e.target.value)}
                      onBlur={(e) => handleTransformBlur(index, e.target.value)}
                      placeholder="Transform (optional)"
                      className="w-full text-sm"
                    />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeMapping(index)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remove mapping</span>
                </Button>
              </div>
              {preview && <div className="pl-0 text-xs text-muted-foreground">{preview}</div>}
            </div>
          );
        })}

        <Button variant="outline" size="sm" onClick={addMapping} className="mt-2">
          <Plus className="mr-1 h-4 w-4" />
          Add mapping
        </Button>
      </CardContent>
    </Card>
  );
}

export type { FieldMapping, MappingStepProps };
export { MappingStep };
