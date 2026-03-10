/**
 * Tests for the SpanRenderer component.
 *
 * @module
 */

import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { SpanRenderer } from '@/components/annotations/renderers/span-renderer';
import type { AnnotationItem, AnnotationLayerData, Token } from '@/components/annotations/types';
import { renderWithProviders } from '@/tests/test-utils';

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

const text = 'The cat sat on the mat';
const tokens: Token[] = [
  { text: 'The', index: 0, start: 0, end: 3 },
  { text: 'cat', index: 1, start: 4, end: 7 },
  { text: 'sat', index: 2, start: 8, end: 11 },
  { text: 'on', index: 3, start: 12, end: 14 },
  { text: 'the', index: 4, start: 15, end: 18 },
  { text: 'mat', index: 5, start: 19, end: 22 },
];
const color = 'oklch(0.65 0.20 25)';

function makeLayer(items: AnnotationItem[]): AnnotationLayerData {
  return {
    uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/span1',
    kind: 'span',
    subkind: 'ner',
    items,
  };
}

function makeItem(overrides: Partial<AnnotationItem> & { id: string }): AnnotationItem {
  return {
    label: '',
    ...overrides,
  };
}

describe('SpanRenderer', () => {
  it('renders text with highlighted spans', () => {
    const items: AnnotationItem[] = [
      makeItem({
        id: '1',
        label: 'ANIMAL',
        anchor: { type: 'textSpan', start: 4, end: 7 },
      }),
    ];
    const layer = makeLayer(items);

    const { container } = renderWithProviders(
      <SpanRenderer layer={layer} text={text} tokens={tokens} color={color} />,
    );

    // "cat" should be in the document (within the highlighted span)
    expect(screen.getByText('cat')).toBeInTheDocument();
    // The full text should be present across segments
    expect(container.textContent).toContain('The');
    expect(container.textContent).toContain('sat on the mat');
  });

  it('handles overlapping spans', () => {
    const items: AnnotationItem[] = [
      makeItem({
        id: '1',
        label: 'NP',
        anchor: { type: 'textSpan', start: 0, end: 7 },
      }),
      makeItem({
        id: '2',
        label: 'ANIMAL',
        anchor: { type: 'textSpan', start: 4, end: 7 },
      }),
    ];
    const layer = makeLayer(items);

    const { container } = renderWithProviders(
      <SpanRenderer layer={layer} text={text} tokens={tokens} color={color} />,
    );

    // Both span regions should be rendered in the text
    expect(container.textContent).toContain('The');
    expect(container.textContent).toContain('cat');
  });

  it('handles span at beginning of text', () => {
    const items: AnnotationItem[] = [
      makeItem({
        id: '1',
        label: 'DET',
        anchor: { type: 'textSpan', start: 0, end: 3 },
      }),
    ];
    const layer = makeLayer(items);

    const { container } = renderWithProviders(
      <SpanRenderer layer={layer} text={text} tokens={tokens} color={color} />,
    );

    expect(screen.getByText('The')).toBeInTheDocument();
    // Label appears in tooltip (hidden in test), but the annotation-span exists
    expect(container.querySelector('.annotation-span')).not.toBeNull();
  });

  it('handles span at end of text', () => {
    const items: AnnotationItem[] = [
      makeItem({
        id: '1',
        label: 'NOUN',
        anchor: { type: 'textSpan', start: 19, end: 22 },
      }),
    ];
    const layer = makeLayer(items);

    const { container } = renderWithProviders(
      <SpanRenderer layer={layer} text={text} tokens={tokens} color={color} />,
    );

    expect(screen.getByText('mat')).toBeInTheDocument();
    expect(container.querySelector('.annotation-span')).not.toBeNull();
  });

  it('handles empty items', () => {
    const layer = makeLayer([]);

    renderWithProviders(
      <SpanRenderer layer={layer} text={text} tokens={tokens} color={color} />,
    );

    // Full text rendered as a single unannotated segment
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('applies color to span highlights', () => {
    const items: AnnotationItem[] = [
      makeItem({
        id: '1',
        label: 'LOC',
        anchor: { type: 'textSpan', start: 4, end: 7 },
      }),
    ];
    const layer = makeLayer(items);

    const { container } = renderWithProviders(
      <SpanRenderer layer={layer} text={text} tokens={tokens} color={color} />,
    );

    // The highlighted span should have a border-bottom color set
    const annotationSpan = container.querySelector('.annotation-span');
    expect(annotationSpan).not.toBeNull();
    expect(annotationSpan).toHaveStyle({ borderBottomColor: color });
  });

  it('shows empty state when text is empty', () => {
    const layer = makeLayer([]);

    renderWithProviders(
      <SpanRenderer layer={layer} text="" tokens={[]} color={color} />,
    );

    expect(screen.getByText('No text available for span display.')).toBeInTheDocument();
  });

  it('resolves token-based anchors to character offsets', () => {
    const items: AnnotationItem[] = [
      makeItem({
        id: '1',
        label: 'VERB',
        anchor: { type: 'tokenRef', tokenIndex: 2 },
      }),
    ];
    const layer = makeLayer(items);

    const { container } = renderWithProviders(
      <SpanRenderer layer={layer} text={text} tokens={tokens} color={color} />,
    );

    // "sat" is at token index 2; should be rendered within an annotation span
    expect(screen.getByText('sat')).toBeInTheDocument();
    expect(container.querySelector('.annotation-span')).not.toBeNull();
  });
});
