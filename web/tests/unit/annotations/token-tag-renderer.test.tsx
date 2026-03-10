/**
 * Tests for the TokenTagRenderer component.
 *
 * @module
 */

import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TokenTagRenderer } from '@/components/annotations/renderers/token-tag-renderer';
import type { AnnotationItem, AnnotationLayerData, Token } from '@/components/annotations/types';
import { renderWithProviders } from '@/tests/test-utils';

// Mock the tooltip to simplify DOM queries. Mimics Base UI behavior: the
// render prop is cloned with children injected. TooltipContent is hidden
// to avoid duplicate text in the DOM.
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

function makeTokens(words: string[]): Token[] {
  let offset = 0;
  return words.map((text, index) => {
    const token: Token = { text, index, start: offset, end: offset + text.length };
    offset += text.length + 1;
    return token;
  });
}

function makeLayer(items: AnnotationItem[]): AnnotationLayerData {
  return {
    uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/test',
    kind: 'token-tag',
    subkind: 'pos',
    items,
  };
}

function makeItem(overrides: Partial<AnnotationItem> & { id: string }): AnnotationItem {
  return {
    label: '',
    ...overrides,
  };
}

describe('TokenTagRenderer', () => {
  const tokens = makeTokens(['The', 'cat', 'sat']);
  const color = 'oklch(0.65 0.20 25)';

  it('renders token tags with correct labels', () => {
    const items: AnnotationItem[] = [
      makeItem({ id: '1', label: 'DT', anchor: { type: 'tokenRef', tokenIndex: 0 } }),
      makeItem({ id: '2', label: 'NN', anchor: { type: 'tokenRef', tokenIndex: 1 } }),
      makeItem({ id: '3', label: 'VBD', anchor: { type: 'tokenRef', tokenIndex: 2 } }),
    ];
    const layer = makeLayer(items);

    renderWithProviders(<TokenTagRenderer layer={layer} tokens={tokens} color={color} />);

    expect(screen.getByText('DT')).toBeInTheDocument();
    expect(screen.getByText('NN')).toBeInTheDocument();
    expect(screen.getByText('VBD')).toBeInTheDocument();
  });

  it('renders correct number of tokens', () => {
    const items: AnnotationItem[] = [
      makeItem({ id: '1', label: 'DT', anchor: { type: 'tokenRef', tokenIndex: 0 } }),
    ];
    const layer = makeLayer(items);

    renderWithProviders(<TokenTagRenderer layer={layer} tokens={tokens} color={color} />);

    // All 3 token texts should be rendered
    expect(screen.getByText('The')).toBeInTheDocument();
    expect(screen.getByText('cat')).toBeInTheDocument();
    expect(screen.getByText('sat')).toBeInTheDocument();
  });

  it('applies color styling', () => {
    const items: AnnotationItem[] = [
      makeItem({ id: '1', label: 'NN', anchor: { type: 'tokenRef', tokenIndex: 1 } }),
    ];
    const layer = makeLayer(items);

    renderWithProviders(<TokenTagRenderer layer={layer} tokens={tokens} color={color} />);

    const label = screen.getByText('NN');
    expect(label).toHaveStyle({ color });
  });

  it('handles empty items array', () => {
    const layer = makeLayer([]);

    renderWithProviders(<TokenTagRenderer layer={layer} tokens={tokens} color={color} />);

    // With items empty, tokens still render but with no labels
    expect(screen.getByText('The')).toBeInTheDocument();
  });

  it('handles items without labels', () => {
    const items: AnnotationItem[] = [
      makeItem({ id: '1', label: '', anchor: { type: 'tokenRef', tokenIndex: 0 } }),
    ];
    const layer = makeLayer(items);

    renderWithProviders(<TokenTagRenderer layer={layer} tokens={tokens} color={color} />);

    // Token text still renders
    expect(screen.getByText('The')).toBeInTheDocument();
  });

  it('shows empty state when tokens array is empty', () => {
    const layer = makeLayer([]);

    renderWithProviders(<TokenTagRenderer layer={layer} tokens={[]} color={color} />);

    expect(screen.getByText('No tokens available for token-tag display.')).toBeInTheDocument();
  });

  it('displays value instead of label when value is present', () => {
    const items: AnnotationItem[] = [
      makeItem({
        id: '1',
        label: 'LEMMA',
        value: 'run',
        anchor: { type: 'tokenRef', tokenIndex: 0 },
      }),
    ];
    const layer = makeLayer(items);

    renderWithProviders(<TokenTagRenderer layer={layer} tokens={tokens} color={color} />);

    // The display label prefers value over label; "run" appears both as
    // the token text (index 0 is "The" here, so no conflict) and as the label
    const labels = screen.getAllByText('run');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });

  it('handles tokenRefSequence anchors', () => {
    const items: AnnotationItem[] = [
      makeItem({
        id: '1',
        label: 'MWE',
        anchor: { type: 'tokenRefSequence', tokenIndices: [0, 1] },
      }),
    ];
    const layer = makeLayer(items);

    renderWithProviders(<TokenTagRenderer layer={layer} tokens={tokens} color={color} />);

    // Both tokens 0 and 1 should get this annotation; label shown under each.
    // The display joins values with commas, so "MWE" appears as a single label
    // per annotated token pair rendered in the interlinear layout.
    const labels = screen.getAllByText('MWE');
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });
});
