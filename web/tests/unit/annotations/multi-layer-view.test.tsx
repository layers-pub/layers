/**
 * Tests for the MultiLayerView composition component.
 *
 * @module
 */

import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Token } from '@/components/annotations/types';
import { renderWithProviders } from '@/tests/test-utils';

// Mock the hook before importing the component.
const mockUseAnnotationLayersByExpression = vi.fn();

vi.mock('@/lib/hooks/use-annotation-layers', () => ({
  useAnnotationLayersByExpression: (...args: unknown[]) =>
    mockUseAnnotationLayersByExpression(...args),
}));

// Mock the annotation layer view to simplify testing dispatch logic.
vi.mock('@/components/annotations/annotation-layer-view', () => ({
  AnnotationLayerView: ({ layer }: { layer: { kind: string; uri: string } }) => (
    <div data-testid={`layer-view-${layer.kind}`}>{layer.uri}</div>
  ),
}));

// Mock the layer toggle sidebar.
vi.mock('@/components/annotations/composition/layer-toggle-sidebar', () => ({
  LayerToggleSidebar: ({
    layers,
    onToggle,
  }: {
    layers: Array<{ uri: string; kind: string }>;
    onToggle: (uri: string) => void;
  }) => (
    <div data-testid="layer-toggle-sidebar">
      {layers.map((l) => (
        <button key={l.uri} data-testid={`toggle-${l.uri}`} onClick={() => onToggle(l.uri)}>
          {l.kind}
        </button>
      ))}
    </div>
  ),
}));

// Must import after mocks are set up.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MultiLayerView } = await import(
  '@/components/annotations/composition/multi-layer-view'
);

const tokens: Token[] = [
  { text: 'The', index: 0, start: 0, end: 3 },
  { text: 'cat', index: 1, start: 4, end: 7 },
];
const text = 'The cat';
const expressionUri = 'at://did:plc:test/pub.layers.expression.expression/test1';

function makeAnnotationLayerRecord(kind: string, uri: string) {
  return {
    uri,
    value: {
      kind,
      subkind: undefined,
      formalism: undefined,
      annotations: [],
    },
  };
}

describe('MultiLayerView', () => {
  beforeEach(() => {
    mockUseAnnotationLayersByExpression.mockReset();
  });

  it('renders loading skeleton when loading', () => {
    mockUseAnnotationLayersByExpression.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { container } = renderWithProviders(
      <MultiLayerView expressionUri={expressionUri} text={text} tokens={tokens} />,
    );

    // Skeleton uses data-slot="skeleton" attribute
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders error message on error', () => {
    mockUseAnnotationLayersByExpression.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network failure'),
    });

    renderWithProviders(
      <MultiLayerView expressionUri={expressionUri} text={text} tokens={tokens} />,
    );

    expect(screen.getByText(/Failed to load annotation layers/)).toBeInTheDocument();
    expect(screen.getByText(/Network failure/)).toBeInTheDocument();
  });

  it('renders empty state when no layers', () => {
    mockUseAnnotationLayersByExpression.mockReturnValue({
      data: { records: [] },
      isLoading: false,
      error: null,
    });

    renderWithProviders(
      <MultiLayerView expressionUri={expressionUri} text={text} tokens={tokens} />,
    );

    expect(
      screen.getByText('No annotation layers for this expression.'),
    ).toBeInTheDocument();
  });

  it('renders layer toggle sidebar and annotation views', () => {
    const records = [
      makeAnnotationLayerRecord(
        'token-tag',
        'at://did:plc:test/pub.layers.annotation.annotationLayer/layer1',
      ),
      makeAnnotationLayerRecord(
        'span',
        'at://did:plc:test/pub.layers.annotation.annotationLayer/layer2',
      ),
    ];
    mockUseAnnotationLayersByExpression.mockReturnValue({
      data: { records },
      isLoading: false,
      error: null,
    });

    renderWithProviders(
      <MultiLayerView expressionUri={expressionUri} text={text} tokens={tokens} />,
    );

    // Sidebar should be rendered
    expect(screen.getByTestId('layer-toggle-sidebar')).toBeInTheDocument();

    // Both layer views should be rendered (all visible by default)
    expect(screen.getByTestId('layer-view-token-tag')).toBeInTheDocument();
    expect(screen.getByTestId('layer-view-span')).toBeInTheDocument();
  });
});
