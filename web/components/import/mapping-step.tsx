'use client';

/**
 * Field mapping step for the import wizard.
 *
 * @module
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';

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

/**
 * Configures field mappings between source format fields and Layers record fields.
 */
function MappingStep({ format, onMappingsChange }: MappingStepProps): React.JSX.Element {
  const [mappings, setMappings] = useState<FieldMapping[]>(() => {
    return DEFAULT_MAPPINGS[format] ?? [];
  });

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

  const addMapping = useCallback(() => {
    setMappings((prev) => [...prev, { sourceField: '', targetField: '' }]);
  }, []);

  const removeMapping = useCallback((index: number) => {
    setMappings((prev) => prev.filter((_, i) => i !== index));
  }, []);

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
        {mappings.map((mapping, index) => (
          <div key={index} className="flex items-center gap-2">
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
            <Input
              value={mapping.transform ?? ''}
              onChange={(e) => updateMapping(index, 'transform', e.target.value)}
              placeholder="Transform (optional)"
              className="w-36 text-sm"
            />
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
        ))}

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
