/**
 * Tests for the TreeRenderer component.
 *
 * @module
 */

import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { TreeRenderer } from '@/components/annotations/renderers/tree-renderer';
import type { AnnotationItem, AnnotationLayerData, Token } from '@/components/annotations/types';
import { renderWithProviders } from '@/tests/test-utils';

// Mock the lazy-loaded DependencyArcDiagram to avoid dynamic import issues in tests.
vi.mock('@/components/workspace/dependency-arc-diagram', () => ({
  DependencyArcDiagram: () => <div data-testid="arc-diagram">Arc Diagram</div>,
}));

vi.mock('@/components/ui/tooltip', async () => {
  const R = await import('react');
  return {
    Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    TooltipTrigger: ({ children, render }: { children: React.ReactNode; render?: React.ReactElement }) => {
      if (render && R.isValidElement(render)) {
        return R.cloneElement(render, {}, children);
      }
      return <span data-testid="tooltip-trigger">{children}</span>;
    },
    TooltipContent: () => null,
  };
});

const tokens: Token[] = [
  { text: 'The', index: 0, start: 0, end: 3 },
  { text: 'cat', index: 1, start: 4, end: 7 },
  { text: 'sat', index: 2, start: 8, end: 11 },
];
const color = 'oklch(0.65 0.20 25)';

function makeItem(overrides: Partial<AnnotationItem> & { id: string }): AnnotationItem {
  return {
    label: '',
    ...overrides,
  };
}

describe('TreeRenderer', () => {
  describe('constituency trees', () => {
    it('renders constituency tree with bracket notation', () => {
      const rootItem = makeItem({
        id: 'root',
        label: 'S',
        children: [
          makeItem({
            id: 'np',
            label: 'NP',
            children: [
              makeItem({
                id: 'dt',
                label: 'DT',
                anchor: { type: 'tokenRef', tokenIndex: 0 },
              }),
              makeItem({
                id: 'nn',
                label: 'NN',
                anchor: { type: 'tokenRef', tokenIndex: 1 },
              }),
            ],
          }),
          makeItem({
            id: 'vp',
            label: 'VP',
            children: [
              makeItem({
                id: 'vbd',
                label: 'VBD',
                anchor: { type: 'tokenRef', tokenIndex: 2 },
              }),
            ],
          }),
        ],
      });
      const layer: AnnotationLayerData = {
        uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/tree1',
        kind: 'tree',
        subkind: 'constituency',
        items: [rootItem],
      };

      renderWithProviders(<TreeRenderer layer={layer} tokens={tokens} color={color} />);

      const pre = screen.getByText(/\[S/);
      expect(pre).toBeInTheDocument();
      expect(pre.textContent).toContain('[NP');
      expect(pre.textContent).toContain('[DT The]');
      expect(pre.textContent).toContain('[NN cat]');
      expect(pre.textContent).toContain('[VP');
      expect(pre.textContent).toContain('[VBD sat]');
    });

    it('handles empty tree', () => {
      const layer: AnnotationLayerData = {
        uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/tree2',
        kind: 'tree',
        subkind: 'constituency',
        items: [],
      };

      renderWithProviders(<TreeRenderer layer={layer} tokens={tokens} color={color} />);

      expect(screen.getByText('(empty tree)')).toBeInTheDocument();
    });

    it('handles single-node tree', () => {
      const layer: AnnotationLayerData = {
        uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/tree3',
        kind: 'tree',
        subkind: 'constituency',
        items: [
          makeItem({
            id: 'root',
            label: 'S',
            anchor: { type: 'tokenRef', tokenIndex: 0 },
          }),
        ],
      };

      renderWithProviders(<TreeRenderer layer={layer} tokens={tokens} color={color} />);

      expect(screen.getByText('[S The]')).toBeInTheDocument();
    });
  });

  describe('dependency trees', () => {
    it('renders dependency table with head/dependent columns', () => {
      const items: AnnotationItem[] = [
        makeItem({
          id: 'dep0',
          label: 'det',
          anchor: { type: 'tokenRef', tokenIndex: 0 },
          headIndex: 1,
        }),
        makeItem({
          id: 'dep1',
          label: 'nsubj',
          anchor: { type: 'tokenRef', tokenIndex: 1 },
          headIndex: 2,
        }),
        makeItem({
          id: 'dep2',
          label: 'root',
          anchor: { type: 'tokenRef', tokenIndex: 2 },
          headIndex: -1,
        }),
      ];
      const layer: AnnotationLayerData = {
        uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/dep1',
        kind: 'tree',
        subkind: 'dependency',
        items,
      };

      renderWithProviders(<TreeRenderer layer={layer} tokens={tokens} color={color} />);

      // Column headers
      expect(screen.getByText('Token')).toBeInTheDocument();
      expect(screen.getByText('Head')).toBeInTheDocument();
      expect(screen.getByText('Relation')).toBeInTheDocument();

      // Token text
      expect(screen.getByText('The')).toBeInTheDocument();
      expect(screen.getByText('cat')).toBeInTheDocument();
      expect(screen.getByText('sat')).toBeInTheDocument();

      // Relation labels
      expect(screen.getByText('det')).toBeInTheDocument();
      expect(screen.getByText('nsubj')).toBeInTheDocument();
      expect(screen.getByText('root')).toBeInTheDocument();
    });

    it('shows empty state for dependency tree with no valid items', () => {
      const layer: AnnotationLayerData = {
        uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/dep2',
        kind: 'tree',
        subkind: 'dependency',
        items: [],
      };

      renderWithProviders(<TreeRenderer layer={layer} tokens={tokens} color={color} />);

      expect(screen.getByText('No dependency annotations to display.')).toBeInTheDocument();
    });

    it('renders table and arcs toggle buttons for dependency', () => {
      const items: AnnotationItem[] = [
        makeItem({
          id: 'dep0',
          label: 'root',
          anchor: { type: 'tokenRef', tokenIndex: 0 },
          headIndex: -1,
        }),
      ];
      const layer: AnnotationLayerData = {
        uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/dep3',
        kind: 'tree',
        subkind: 'dependency',
        items,
      };

      renderWithProviders(<TreeRenderer layer={layer} tokens={tokens} color={color} />);

      expect(screen.getByText('Table')).toBeInTheDocument();
      expect(screen.getByText('Arcs')).toBeInTheDocument();
    });
  });
});
