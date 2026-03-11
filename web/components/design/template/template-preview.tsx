'use client';

/**
 * Live template preview with slot visualization.
 *
 * Renders the template text with unfilled slots shown as colored badges
 * inline and filled slots shown with filler values in the slot's color.
 * Includes a "Generate Sample" button (placeholder until sidecar is wired).
 *
 * @module
 */

import { useMemo, useState, useCallback } from 'react';
import { Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { SlotSchema } from '@/lib/schemas/design';
import { slotColor } from './template-text-editor';

interface TemplatePreviewProps {
  readonly templateText: string;
  readonly slots: readonly SlotSchema[];
  readonly fillings?: Readonly<Record<string, string>>;
}

/** Sample words used for the "Generate Sample" placeholder. */
const SAMPLE_FILLERS: Record<string, string[]> = {
  subject: ['the cat', 'a dog', 'the student', 'an artist'],
  verb: ['chased', 'saw', 'liked', 'admired'],
  object: ['the ball', 'a book', 'the painting', 'a song'],
};

/**
 * Segment types produced by splitting the template text at slot boundaries.
 */
interface TextSegment {
  kind: 'text';
  value: string;
}

interface SlotSegment {
  kind: 'slot';
  name: string;
  index: number;
}

type PreviewSegment = TextSegment | SlotSegment;

/**
 * Splits template text into alternating text and slot segments.
 */
function parseTemplateSegments(text: string, _slotNames: ReadonlySet<string>): PreviewSegment[] {
  const segments: PreviewSegment[] = [];
  const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  let lastIndex = 0;
  let slotIndex = 0;
  const seen = new Map<string, number>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    // Text before the slot
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, match.index) });
    }

    const name = match[1]!;
    if (!seen.has(name)) {
      seen.set(name, slotIndex);
      slotIndex++;
    }
    segments.push({ kind: 'slot', name, index: seen.get(name)! });
    lastIndex = regex.lastIndex;
  }

  // Trailing text
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

function TemplatePreview({
  templateText,
  slots,
  fillings,
}: TemplatePreviewProps): React.JSX.Element {
  const [sampleFillings, setSampleFillings] = useState<Record<string, string>>({});
  const activeFillings = fillings ?? sampleFillings;

  const slotNameSet = useMemo(() => new Set(slots.map((s) => s.name)), [slots]);

  const segments = useMemo(
    () => parseTemplateSegments(templateText, slotNameSet),
    [templateText, slotNameSet],
  );

  const generateSample = useCallback(() => {
    const fills: Record<string, string> = {};
    for (const slot of slots) {
      const pool = SAMPLE_FILLERS[slot.name];
      if (pool && pool.length > 0) {
        fills[slot.name] = pool[Math.floor(Math.random() * pool.length)]!;
      } else if (slot.defaultValue) {
        fills[slot.name] = slot.defaultValue;
      } else {
        fills[slot.name] = `[${slot.name}]`;
      }
    }
    setSampleFillings(fills);
  }, [slots]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Preview</CardTitle>
            <Button variant="outline" size="sm" onClick={generateSample} className="text-xs">
              <Sparkles className="mr-1.5 h-3 w-3" />
              Generate Sample
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templateText ? (
            <div className="rounded-md bg-muted/50 p-4 leading-relaxed">
              {segments.map((segment, i) => {
                if (segment.kind === 'text') {
                  return <span key={i}>{segment.value}</span>;
                }

                const filling = activeFillings[segment.name];
                const colorClass = slotColor(segment.index);

                if (filling) {
                  return (
                    <span
                      key={i}
                      className={`rounded px-1 py-0.5 text-sm font-medium ${colorClass}`}
                      title={`{${segment.name}}: ${filling}`}
                    >
                      {filling}
                    </span>
                  );
                }

                return (
                  <Badge key={i} variant="outline" className={`mx-0.5 ${colorClass}`}>
                    {segment.name}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Enter template text to see a preview.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Slot summary */}
      {slots.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Slot Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {slots.map((slot, i) => {
                const filling = activeFillings[slot.name];
                return (
                  <div key={slot.name} className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary" className={`font-mono ${slotColor(i)}`}>
                      {slot.name}
                    </Badge>
                    {slot.required && (
                      <span className="text-[10px] text-muted-foreground">required</span>
                    )}
                    {slot.collectionRef && (
                      <span className="text-[10px] text-muted-foreground">(linked)</span>
                    )}
                    <span className="flex-1" />
                    {filling ? (
                      <span className="font-medium">{filling}</span>
                    ) : slot.defaultValue ? (
                      <span className="text-muted-foreground">default: {slot.defaultValue}</span>
                    ) : (
                      <span className="text-muted-foreground/50">unfilled</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { TemplatePreview };
