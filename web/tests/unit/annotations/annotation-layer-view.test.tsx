/**
 * Tests for the AnnotationLayerView dispatch component.
 *
 * @module
 */

import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { AnnotationLayerView } from '@/components/annotations/annotation-layer-view';
import type { AnnotationLayerData, Token } from '@/components/annotations/types';
import { renderWithProviders } from '@/tests/test-utils';

// Mock all renderers so we can verify dispatch without testing renderer internals.
vi.mock('@/components/annotations/renderers/token-tag-renderer', () => ({
  TokenTagRenderer: () => <div data-testid="token-tag-renderer">TokenTagRenderer</div>,
}));

vi.mock('@/components/annotations/renderers/span-renderer', () => ({
  SpanRenderer: () => <div data-testid="span-renderer">SpanRenderer</div>,
}));

vi.mock('@/components/annotations/renderers/relation-renderer', () => ({
  RelationRenderer: () => <div data-testid="relation-renderer">RelationRenderer</div>,
}));

vi.mock('@/components/annotations/renderers/tree-renderer', () => ({
  TreeRenderer: () => <div data-testid="tree-renderer">TreeRenderer</div>,
}));

vi.mock('@/components/annotations/renderers/document-tag-renderer', () => ({
  DocumentTagRenderer: () => (
    <div data-testid="document-tag-renderer">DocumentTagRenderer</div>
  ),
}));

vi.mock('@/components/annotations/renderers/graph-renderer', () => ({
  GraphRenderer: () => <div data-testid="graph-renderer">GraphRenderer</div>,
}));

vi.mock('@/components/annotations/renderers/tier-renderer', () => ({
  TierRenderer: () => <div data-testid="tier-renderer">TierRenderer</div>,
}));

const tokens: Token[] = [
  { text: 'The', index: 0, start: 0, end: 3 },
  { text: 'cat', index: 1, start: 4, end: 7 },
];
const text = 'The cat';
const color = 'oklch(0.65 0.20 25)';

function makeLayer(kind: string): AnnotationLayerData {
  return {
    uri: `at://did:plc:test/pub.layers.annotation.annotationLayer/${kind}`,
    kind: kind as AnnotationLayerData['kind'],
    items: [],
  };
}

describe('AnnotationLayerView', () => {
  it('dispatches to TokenTagRenderer for token-tag kind', () => {
    renderWithProviders(
      <AnnotationLayerView layer={makeLayer('token-tag')} text={text} tokens={tokens} color={color} />,
    );
    expect(screen.getByTestId('token-tag-renderer')).toBeInTheDocument();
  });

  it('dispatches to SpanRenderer for span kind', () => {
    renderWithProviders(
      <AnnotationLayerView layer={makeLayer('span')} text={text} tokens={tokens} color={color} />,
    );
    expect(screen.getByTestId('span-renderer')).toBeInTheDocument();
  });

  it('dispatches to RelationRenderer for relation kind', () => {
    renderWithProviders(
      <AnnotationLayerView layer={makeLayer('relation')} text={text} tokens={tokens} color={color} />,
    );
    expect(screen.getByTestId('relation-renderer')).toBeInTheDocument();
  });

  it('dispatches to TreeRenderer for tree kind', () => {
    renderWithProviders(
      <AnnotationLayerView layer={makeLayer('tree')} text={text} tokens={tokens} color={color} />,
    );
    expect(screen.getByTestId('tree-renderer')).toBeInTheDocument();
  });

  it('dispatches to DocumentTagRenderer for document-tag kind', () => {
    renderWithProviders(
      <AnnotationLayerView layer={makeLayer('document-tag')} text={text} tokens={tokens} color={color} />,
    );
    expect(screen.getByTestId('document-tag-renderer')).toBeInTheDocument();
  });

  it('dispatches to GraphRenderer for graph kind', () => {
    renderWithProviders(
      <AnnotationLayerView layer={makeLayer('graph')} text={text} tokens={tokens} color={color} />,
    );
    expect(screen.getByTestId('graph-renderer')).toBeInTheDocument();
  });

  it('dispatches to TierRenderer for tier kind', () => {
    renderWithProviders(
      <AnnotationLayerView layer={makeLayer('tier')} text={text} tokens={tokens} color={color} />,
    );
    expect(screen.getByTestId('tier-renderer')).toBeInTheDocument();
  });

  it('shows fallback for unknown kind', () => {
    renderWithProviders(
      <AnnotationLayerView
        layer={makeLayer('unknown-kind')}
        text={text}
        tokens={tokens}
        color={color}
      />,
    );
    expect(screen.getByText(/Unknown annotation kind: unknown-kind/)).toBeInTheDocument();
  });
});
