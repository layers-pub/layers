/**
 * Renderer for relation annotations (SRL, coreference, event structures).
 *
 * Displays relations as card-based argument layouts with role labels.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { ConfidenceIndicator } from '../primitives/confidence-indicator';
import type { AnnotationItem, AnnotationLayerData, Token } from '../types';

interface RelationRendererProps {
  /** Annotation layer data with kind "relation". */
  layer: AnnotationLayerData;
  /** Tokens from the segmentation record (used for argument label resolution). */
  tokens: Token[];
  /** oklch color string for this layer. */
  color: string;
}

/**
 * Resolves an argument's target label.
 *
 * If the argument has an explicit `targetLabel`, uses that. Otherwise, tries
 * to find the target annotation item and uses its label or value.
 */
function resolveArgumentLabel(
  targetId: string,
  targetLabel: string | undefined,
  itemMap: Map<string, AnnotationItem>,
): string {
  if (targetLabel) return targetLabel;
  const target = itemMap.get(targetId);
  if (target) return target.value ?? target.label;
  return targetId;
}

/**
 * Renders a single relation instance as a card.
 */
const RelationCard = React.memo(function RelationCard({
  item,
  itemMap,
  color,
}: {
  item: AnnotationItem;
  itemMap: Map<string, AnnotationItem>;
  color: string;
}): React.JSX.Element {
  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span>{item.label}</span>
          {item.confidence != null ? <ConfidenceIndicator confidence={item.confidence} /> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {item.arguments && item.arguments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {item.arguments.map((arg) => (
              <Badge key={`${arg.role}-${arg.targetId}`} variant="secondary" className="gap-1.5">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {arg.role}
                </span>
                <span className="text-xs">
                  {resolveArgumentLabel(arg.targetId, arg.targetLabel, itemMap)}
                </span>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No arguments</p>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * Card-based relation annotation renderer.
 *
 * Each relation is displayed as a card with the predicate/relation label
 * as the title and argument slots shown as colored badge pills.
 */
const RelationRenderer = React.memo(function RelationRenderer({
  layer,
  color,
}: RelationRendererProps): React.JSX.Element {
  const itemMap = React.useMemo(() => {
    const map = new Map<string, AnnotationItem>();
    for (const item of layer.items) {
      map.set(item.id, item);
    }
    return map;
  }, [layer.items]);

  const relations = React.useMemo(
    () => layer.items.filter((item) => item.arguments && item.arguments.length > 0),
    [layer.items],
  );

  if (relations.length === 0) {
    return <p className="text-sm text-muted-foreground">No relation annotations in this layer.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {relations.map((item) => (
        <RelationCard key={item.id} item={item} itemMap={itemMap} color={color} />
      ))}
    </div>
  );
});

export type { RelationRendererProps };
export { RelationRenderer };
