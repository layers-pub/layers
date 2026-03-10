/**
 * Renderer for graph annotations (AMR, semantic graphs).
 *
 * Displays graph annotations as a card-based node and edge layout.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { ConfidenceIndicator } from '../primitives/confidence-indicator';
import type { AnnotationItem, AnnotationLayerData } from '../types';

interface GraphRendererProps {
  /** Annotation layer data with kind "graph". */
  layer: AnnotationLayerData;
  /** oklch color string for this layer. */
  color: string;
}

/**
 * Separates annotation items into node-like and edge-like items.
 *
 * Items with arguments are treated as edges (or relation predicates).
 * Items without arguments are treated as nodes.
 */
function partitionItems(items: AnnotationItem[]): {
  nodes: AnnotationItem[];
  edges: AnnotationItem[];
} {
  const nodes: AnnotationItem[] = [];
  const edges: AnnotationItem[] = [];

  for (const item of items) {
    if (item.arguments && item.arguments.length > 0) {
      edges.push(item);
    } else {
      nodes.push(item);
    }
  }

  return { nodes, edges };
}

/**
 * Builds a label lookup map from node items.
 */
function buildLabelMap(nodes: AnnotationItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const node of nodes) {
    map.set(node.id, node.value ?? node.label);
  }
  return map;
}

/**
 * Renders a graph edge as a text line in monospace.
 */
function formatEdge(edge: AnnotationItem, labelMap: Map<string, string>): string {
  if (!edge.arguments || edge.arguments.length === 0) {
    return edge.label;
  }

  if (edge.arguments.length === 1) {
    const arg = edge.arguments[0]!;
    const targetLabel = arg.targetLabel ?? labelMap.get(arg.targetId) ?? arg.targetId;
    return `${edge.label} --[${arg.role}]--> ${targetLabel}`;
  }

  // Multiple arguments: show source --[label]--> target for each
  return edge.arguments
    .map((arg) => {
      const targetLabel = arg.targetLabel ?? labelMap.get(arg.targetId) ?? arg.targetId;
      return `  ${arg.role}: ${targetLabel}`;
    })
    .join('\n');
}

/**
 * Card-based graph annotation renderer.
 *
 * Nodes are displayed as labeled cards. Edges are shown as monospace text
 * lines using the "source --[label]--> target" notation.
 */
const GraphRenderer = React.memo(function GraphRenderer({
  layer,
  color,
}: GraphRendererProps): React.JSX.Element {
  const { nodes, edges } = React.useMemo(() => partitionItems(layer.items), [layer.items]);

  const labelMap = React.useMemo(() => buildLabelMap(nodes), [nodes]);

  if (layer.items.length === 0) {
    return <p className="text-sm text-muted-foreground">No graph annotations in this layer.</p>;
  }

  return (
    <div className={cn('flex flex-col gap-3')}>
      {/* Node cards */}
      {nodes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {nodes.map((node) => (
            <Card key={node.id} size="sm" className="w-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span>{node.label}</span>
                  {node.value ? (
                    <span className="text-muted-foreground font-normal">({node.value})</span>
                  ) : null}
                  {node.confidence != null ? (
                    <ConfidenceIndicator confidence={node.confidence} />
                  ) : null}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Edge text lines */}
      {edges.length > 0 ? (
        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle className="text-sm text-muted-foreground">Edges</CardTitle>
          </CardHeader>
          <CardContent>
            <pre
              className="text-xs font-mono leading-relaxed whitespace-pre-wrap"
              style={{ color }}
            >
              {edges.map((edge) => formatEdge(edge, labelMap)).join('\n')}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
});

export type { GraphRendererProps };
export { GraphRenderer };
