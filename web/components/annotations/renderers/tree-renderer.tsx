/**
 * Renderer for tree annotations (constituency and dependency).
 *
 * Constituency trees are shown as indented bracket notation.
 * Dependency trees are shown as a tabular display (token, head, relation)
 * with an optional SVG arc diagram view.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { AnnotationItem, AnnotationLayerData, Token } from '../types';

const LazyDependencyArcDiagram = React.lazy(() =>
  import('@/components/workspace/dependency-arc-diagram').then((mod) => ({
    default: mod.DependencyArcDiagram,
  })),
);

interface TreeRendererProps {
  /** Annotation layer data with kind "tree". */
  layer: AnnotationLayerData;
  /** Tokens from the segmentation record. */
  tokens: Token[];
  /** oklch color string for this layer. */
  color: string;
}

// ---------------------------------------------------------------------------
// Constituency tree: bracket notation
// ---------------------------------------------------------------------------

/**
 * Recursively builds a bracket notation string for a constituency tree node.
 */
function buildBracketString(item: AnnotationItem, tokens: Token[], depth: number): string {
  const indent = '  '.repeat(depth);

  if (!item.children || item.children.length === 0) {
    // Leaf node: resolve token text
    const tokenText =
      item.anchor?.tokenIndex != null
        ? (tokens[item.anchor.tokenIndex]?.text ?? item.value ?? '')
        : (item.value ?? '');
    return `${indent}[${item.label} ${tokenText}]`;
  }

  const childLines = item.children.map((child) => buildBracketString(child, tokens, depth + 1));
  return `${indent}[${item.label}\n${childLines.join('\n')}]`;
}

/**
 * Renders a constituency tree as indented bracket notation.
 */
const ConstituencyDisplay = React.memo(function ConstituencyDisplay({
  items,
  tokens,
  color,
}: {
  items: AnnotationItem[];
  tokens: Token[];
  color: string;
}): React.JSX.Element {
  const bracketString = React.useMemo(() => {
    // Find root nodes (those without a parentId)
    const roots = items.filter((item) => !item.parentId);
    if (roots.length === 0 && items.length > 0) {
      // Fallback: use all items as roots
      return items.map((item) => buildBracketString(item, tokens, 0)).join('\n');
    }
    return roots.map((item) => buildBracketString(item, tokens, 0)).join('\n');
  }, [items, tokens]);

  return (
    <pre
      className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs font-mono leading-relaxed"
      style={{ color }}
    >
      {bracketString || '(empty tree)'}
    </pre>
  );
});

// ---------------------------------------------------------------------------
// Dependency tree: tabular display
// ---------------------------------------------------------------------------

/**
 * A single row in the dependency table.
 */
interface DepRow {
  index: number;
  tokenText: string;
  headIndex: number | null;
  relation: string;
}

/**
 * Builds dependency table rows from annotation items and tokens.
 */
function buildDepRows(items: AnnotationItem[], tokens: Token[]): DepRow[] {
  return items
    .map((item) => {
      const tokenIndex = item.anchor?.tokenIndex ?? item.targetIndex;
      if (tokenIndex == null) return null;
      const token = tokens[tokenIndex];
      if (!token) return null;
      return {
        index: tokenIndex,
        tokenText: token.text,
        headIndex: item.headIndex ?? null,
        relation: item.label,
      };
    })
    .filter((r): r is DepRow => r != null)
    .sort((a, b) => a.index - b.index);
}

/**
 * Renders a dependency tree as a table of token, head, and relation columns.
 */
const DependencyDisplay = React.memo(function DependencyDisplay({
  items,
  tokens,
  color,
}: {
  items: AnnotationItem[];
  tokens: Token[];
  color: string;
}): React.JSX.Element {
  const rows = React.useMemo(() => buildDepRows(items, tokens), [items, tokens]);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No dependency annotations to display.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-2 py-1 font-medium">Index</th>
            <th className="px-2 py-1 font-medium">Token</th>
            <th className="px-2 py-1 font-medium">Head</th>
            <th className="px-2 py-1 font-medium">Relation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.index} className="border-b border-border/50">
              <td className="px-2 py-1 text-muted-foreground">{row.index}</td>
              <td className="px-2 py-1 font-medium">{row.tokenText}</td>
              <td className="px-2 py-1 text-muted-foreground">
                {row.headIndex != null ? row.headIndex : '-'}
              </td>
              <td className="px-2 py-1" style={{ color }}>
                {row.relation}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Tree renderer dispatch
// ---------------------------------------------------------------------------

/**
 * Builds DependencyArc objects from annotation items for the arc diagram.
 */
function buildArcsFromItems(
  items: AnnotationItem[],
  tokens: Token[],
): Array<{ headIndex: number; targetIndex: number; label: string }> {
  return items
    .map((item) => {
      const tokenIndex = item.anchor?.tokenIndex ?? item.targetIndex;
      if (tokenIndex == null) return null;
      if (!tokens[tokenIndex]) return null;
      return {
        headIndex: item.headIndex ?? -1,
        targetIndex: tokenIndex,
        label: item.label,
      };
    })
    .filter((a): a is { headIndex: number; targetIndex: number; label: string } => a != null);
}

/**
 * Tree annotation renderer.
 *
 * Dispatches to constituency (bracket notation) or dependency (table/arcs) display
 * based on `layer.subkind`. Defaults to constituency bracket notation.
 * For dependency trees, a toggle switches between table and arc diagram views.
 */
const TreeRenderer = React.memo(function TreeRenderer({
  layer,
  tokens,
  color,
}: TreeRendererProps): React.JSX.Element {
  const isDependency = layer.subkind === 'dependency' || layer.subkind === 'enhanced-dependency';
  const [viewMode, setViewMode] = React.useState<'table' | 'arcs'>('table');

  const arcs = React.useMemo(() => {
    if (!isDependency) return [];
    return buildArcsFromItems(layer.items, tokens);
  }, [isDependency, layer.items, tokens]);

  return (
    <div className={cn('py-1')}>
      {isDependency ? (
        <div className="space-y-2">
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
            <Button
              variant={viewMode === 'arcs' ? 'default' : 'outline'}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setViewMode('arcs')}
            >
              Arcs
            </Button>
          </div>
          {viewMode === 'table' ? (
            <DependencyDisplay items={layer.items} tokens={tokens} color={color} />
          ) : (
            <React.Suspense
              fallback={
                <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
                  Loading arc diagram...
                </div>
              }
            >
              <LazyDependencyArcDiagram tokens={tokens} arcs={arcs} color={color} />
            </React.Suspense>
          )}
        </div>
      ) : (
        <ConstituencyDisplay items={layer.items} tokens={tokens} color={color} />
      )}
    </div>
  );
});

export type { TreeRendererProps };
export { TreeRenderer };
